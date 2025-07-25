use std::{sync::Arc, time::Duration};

use futures::StreamExt;
use kube::{runtime::{controller::Action, finalizer::{finalizer, Event}, watcher, Controller}, Api, Client, ResourceExt};
use log::{info, warn};
use rock_types::v1alpha1::Service;

use crate::cmd::run::Services;
use crate::internal::error::Result;

struct Context {
    services: Services,
}

const FINALIZER: &str = "finalizers.mist-lestr.io";

pub(crate) async fn start(client: Client, services: Services) {
    
    Controller::new(Api::<Service>::all(client.clone()), watcher::Config::default())
        .run(|service, ctx| {
            let client = client.clone();
            async move  {
                let service_api = Api::<Service>::all(client);

                let ctx = ctx.clone();

                finalizer(&service_api, FINALIZER, service, |event| async {
                        match event {
                            Event::Apply(service) => apply(service, ctx).await,
                            Event::Cleanup(service) => cleanup(service, ctx).await,
                        }
                    },
                ).await
            }
        },
        |_obj, _err, _| Action::requeue(Duration::from_secs(2)),
        Arc::new(Context { services }))
        .for_each(|res| async move {
            match res {
                Ok(o) => info!("reconciled {:?}", o),
                Err(e) => warn!("reconcile failed: {}", e),
            }
        })
        .await;
}

async fn apply(service: Arc<Service>, ctx: Arc<Context>) -> Result<Action> {
    info!("Reconciling {:?}", service);

    let name = service.name_any();
    let mut services_list = ctx.services.lock().unwrap();
    services_list.insert(name, service.spec.clone());

    Ok(Action::await_change())
}

async fn cleanup(service: Arc<Service>, ctx: Arc<Context>) -> Result<Action> {
    info!("Cleaning up {:?}", service);

    let name = service.name_any();
    let mut services_list = ctx.services.lock().unwrap();
    services_list.remove(&name);

    Ok(Action::await_change())
}
