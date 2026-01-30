use kube::{api::GroupVersionKind, CustomResource};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

#[derive(CustomResource, Debug, Serialize, Deserialize, Default, Clone, JsonSchema)]
#[kube(group = "mist-lestr.io", version = "v1alpha1", kind = "Service")]
#[serde(rename_all = "camelCase")]
pub struct ServiceSpec {
    pub group: String,
    pub version: String,
    pub kind: String,

    pub domain: String,
    pub service: String,

    pub plugin_ref: Option<PluginRef>
}

#[derive(Debug, Serialize, Deserialize, Default, Clone, JsonSchema)]
pub struct PluginRef {
    name: String
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

#[derive(CustomResource, Debug, Serialize, Deserialize, Clone, JsonSchema)]
#[kube(group = "mist-lestr.io", version = "v1alpha1", kind = "Plugin")]
pub struct PluginSpec {
    pub source: Source
}

#[derive(Debug, Serialize, Deserialize, Clone, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub enum Source {
    Component { tag_name: String },
    Inline { code: String }
}

#[derive(Deserialize, Serialize, Clone, Debug, Default, JsonSchema)]
pub struct PluginStatus {
    pub ready: bool,
}
