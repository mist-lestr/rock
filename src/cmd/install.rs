use k8s_openapi::apiextensions_apiserver::pkg::apis::apiextensions::v1::CustomResourceDefinition;
use kube::{api::{Patch, PatchParams}, Api, Client, CustomResourceExt, ResourceExt};

pub(crate) async fn install(all: bool, crd: bool) -> anyhow::Result<()> {
    println!("Install");

    let client = Client::try_default().await?;

    if all || crd {

        let service_crd = rock_types::v1alpha1::Service::crd();

        let crds: Api<CustomResourceDefinition> = Api::all(client.clone());

        let pp = PatchParams::apply("rock-installer").force(); 

        let patched = crds
            .patch(
                &service_crd.metadata.name.clone().expect("CRD must have a name"),
                &pp,
                &Patch::Apply(&service_crd),
            )
            .await?;
        
        println!(
            "CRD {} applied with current version = {:?}",
            patched.name_any(),
            patched.resource_version()
        );
    }

    if all {
        crate::internal::resources::manager::install(&client, &String::from("mist-lestr-system")).await?;
        crate::internal::resources::rbac::install(&client, &String::from("mist-lestr-system")).await?;
    }

    Ok(())
}

