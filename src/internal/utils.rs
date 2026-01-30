use k8s_openapi::api::core::v1::Namespace;
use kube::{api::{ApiResource, DynamicObject, GroupVersionKind, ListParams}, discovery::ApiCapabilities, Api, Client, ResourceExt};
use log::error;
use rock_types::v1alpha1::ServiceSpec;
use serde_json::Value;
use uuid::Uuid;

use crate::{cmd::run::Services, internal::error::Error};
use crate::internal::error::Result;

pub(crate) async fn resolve_namespace(client: &Client, project: Uuid) -> Result<String> {
    let lp = ListParams::default()
        .match_any()
        .timeout(60)
        .labels(&format!("mist-lestr.io/project={}", project));

    // TODO: We should use a cache for that
    let namespace = match Api::<Namespace>::all(client.clone()).list(&lp).await {
        Ok(namespaces) => {
            if namespaces.items.len() == 0 {
                return Err(Error::ProjectNotFound(project));
            } else if namespaces.items.len() > 1 {
                error!("More than one namespace contain the project label '{}'", format!("mist-lestr.io/project={}", project));
                return Err(Error::TooManyProjectsFound(project))
            }
            namespaces.items[0].clone()
        },
        Err(e) => {
            error!("Error getting the project '{}' namespace: {}", project, e);
            return Err(Error::KubernetesError(e))
        },
    };

    Ok(namespace.name_any())
}

pub(crate) async fn discover_api(client: &Client, gvk: &GroupVersionKind) -> Result<(ApiResource, ApiCapabilities)> {    

    match kube::discovery::pinned_kind(client, &gvk).await {
        Ok((ar, caps)) => Ok((ar, caps)),
        Err(e) => {
            error!("Error discovering group/version/kind {}/{}/{} : {e}", gvk.group, gvk.version, gvk.kind);
            return Err(Error::KubernetesError(e));
        }
    }

}

pub(crate) async fn resolve_service(services: Services, service: &str) -> Result<ServiceSpec> {
    let service = {
        let services = match services.lock() {
            Ok(services) => services,
            Err(e) => {
                error!("Error locking services list : {e}");
                return Err(Error::PoisonError)
            },
        };

        match services.get(service) {
            Some(service) => service.clone(),
            None => {
                return Err(Error::ServiceNotFound(service.to_string()))
            },
        }
    };

    Ok(service)
}

pub(crate) fn from_kube(resource: DynamicObject) -> Result<Value> {

    let name = resource.name_any();

    let mut resource = resource;

    let spec = resource.data.as_object_mut().unwrap().get_mut("spec").unwrap();
    spec.as_object_mut().unwrap().insert(String::from("name"), serde_json::Value::String(name));
    Ok(spec.clone())
}

pub(crate) fn to_kube(gvk: &GroupVersionKind, payload: Value) -> Result<(String, Value)> {
    let mut payload = payload;
    let name = match payload.as_object_mut() {
        Some(payload) => {
            let name = {
                match payload.get("name") {
                    Some(name) => {
                        match name.as_str() {
                            Some(name) => {
                                name.to_owned()
                            },
                            None => {
                                return Err(Error::NameMustBeAString)
                            },
                        }
                    },
                    None => {
                        return Err(Error::NameNotFound)
                    },
                }
            };
            payload.remove("name");
            name
        },
        None => {
            return Err(Error::SpecMustBeAnObject)
        },
    };
    
   Ok((name.clone(), serde_json::json!({
        "apiVersion": gvk.api_version(),
        "kind": gvk.kind,
        "metadata": {
            "name": name,
        },
        "spec": payload
    })))
}