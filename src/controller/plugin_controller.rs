use std::{sync::Arc, time::Duration};

use futures::StreamExt;
use kube::{runtime::{controller::Action, finalizer::{finalizer, Event}, watcher, Controller}, Api, Client, ResourceExt};
use log::{info, warn};
use rock_types::v1alpha1::Plugin;

use crate::cmd::run::Plugins;
use crate::internal::error::Result;

struct Context {
    plugins: Plugins,
}

const FINALIZER: &str = "finalizers.mist-lestr.io";

pub(crate) async fn start(client: Client, plugins: Plugins) {
    
    Controller::new(Api::<Plugin>::all(client.clone()), watcher::Config::default())
        .run(|plugin, ctx| {
            let client = client.clone();
            async move  {
                let plugin_api = Api::<Plugin>::all(client);

                let ctx = ctx.clone();

                finalizer(&plugin_api, FINALIZER, plugin, |event| async {
                        match event {
                            Event::Apply(plugin) => apply(plugin, ctx).await,
                            Event::Cleanup(plugin) => cleanup(plugin, ctx).await,
                        }
                    },
                ).await
            }
        },
        |_obj, _err, _| Action::requeue(Duration::from_secs(2)),
        Arc::new(Context { plugins }))
        .for_each(|res| async move {
            match res {
                Ok(o) => info!("reconciled {:?}", o),
                Err(e) => warn!("reconcile failed: {}", e),
            }
        })
        .await;
}

async fn apply(plugin: Arc<Plugin>, ctx: Arc<Context>) -> Result<Action> {
    info!("Reconciling {:?}", plugin);

    let name = plugin.name_any();
    let mut plugins_list = ctx.plugins.lock().unwrap();
    plugins_list.insert(name, plugin.spec.clone());

    Ok(Action::await_change())
}

async fn cleanup(plugin: Arc<Plugin>, ctx: Arc<Context>) -> Result<Action> {
    info!("Cleaning up {:?}", plugin);

    let name = plugin.name_any();
    let mut plugins_list = ctx.plugins.lock().unwrap();
    plugins_list.remove(&name);

    Ok(Action::await_change())
}
