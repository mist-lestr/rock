use kube::CustomResourceExt;

use crate::v1alpha1::Service;

pub mod v1alpha1;

pub fn manifests() -> anyhow::Result<()> {
    print!("---\n{}", serde_yaml::to_string(&Service::crd())?);

    Ok(())
}