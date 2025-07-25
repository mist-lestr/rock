use std::{collections::BTreeMap, sync::{Arc, Mutex}};

use kube::Client;
use rock_types::v1alpha1::ServiceSpec;

use crate::{api, controller};

pub(crate) type Services = Arc<Mutex<BTreeMap<String, ServiceSpec>>>;

pub(crate) async fn run(addr: String, port: i32) -> anyhow::Result<()> {

    let client = Client::try_default().await?;
    let services = Services::new(Mutex::new(BTreeMap::new()));

    {
        let client = client.clone();
        let services = services.clone();

        tokio::spawn(async move {
            controller::service_controller::start(client, services).await;
        });
    }

    api::serve(addr, port, client, services).await?;

    Ok(())
}
