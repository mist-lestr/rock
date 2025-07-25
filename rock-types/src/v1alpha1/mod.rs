use kube::{api::GroupVersionKind, CustomResource};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

#[derive(CustomResource, Debug, Serialize, Deserialize, Default, Clone, JsonSchema)]
#[kube(group = "mist-lestr.io", version = "v1alpha1", kind = "Service")]
pub struct ServiceSpec {
    pub group: String,
    pub version: String,
    pub kind: String,

    pub domain: String,
    pub service: String,
    pub gateway_ref: GatewayRef,
}

#[derive(Debug, Serialize, Deserialize, Default, Clone, JsonSchema)]
pub struct GatewayRef {
    pub name: String,
}

#[derive(Deserialize, Serialize, Clone, Debug, Default, JsonSchema)]
pub struct ServiceStatus {
    pub ready: bool,
}

impl ServiceSpec {
    pub fn gvk(&self) -> GroupVersionKind {
        GroupVersionKind::gvk(&self.group, &self.version, &self.kind)
    }
}