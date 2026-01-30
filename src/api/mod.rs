use axum::{Json, Router, extract::{FromRequestParts, Path, State}, http::{Method, StatusCode, header::{ACCEPT, ACCESS_CONTROL_REQUEST_HEADERS, ACCESS_CONTROL_REQUEST_METHOD, AUTHORIZATION, CONTENT_TYPE}, request::Parts}, response::IntoResponse, routing::get};
use axum_extra::{headers::{authorization::Bearer, Authorization}, TypedHeader};
use kube::{Api, Config, Resource, ResourceExt, api::{DeleteParams, DynamicObject, GroupVersionKind, ListParams, ObjectList, Patch}, config::AuthInfo};
use kube::Client;
use log::{debug, error, info};
use rock_types::v1alpha1::{PluginRef, Source};
use secrecy::SecretString;
use tower_http::cors::{Any, CorsLayer};
use uuid::Uuid;

use crate::{cmd::run::{Services, Plugins}, internal::utils};

pub(crate) async fn serve(addr: String, port: i32, client: Client,
        services: Services,
        plugins: Plugins) -> anyhow::Result<()> {

    let cors = CorsLayer::new()
        .allow_origin(["http://127.0.0.1:5173".parse().unwrap()]) // Be careful in production!
        .allow_methods([Method::GET, Method::POST])
        .allow_headers([AUTHORIZATION, ACCEPT, CONTENT_TYPE, ACCESS_CONTROL_REQUEST_HEADERS, ACCESS_CONTROL_REQUEST_METHOD])
        .allow_credentials(true);

    let app = Router::new()
        .route("/-/version", get(version))
        .route("/-/healthz", get(healthz))
        .route("/-/readyz", get(readyz))
        .route("/api/services", get(list_services))
        .route("/api/services/{name}", get(get_service))
        .route("/api/plugins", get(list_plugins))
        .route("/api/plugins/{name}", get(get_plugin))
        .route("/{project}/{domain}/{version}/{service}", get(list_resources).post(create_resource))
        .route("/{project}/{domain}/{version}/{service}/{name}", get(get_resource).delete(delete_resource))
        .route("/api/{version}/namespaces/{namespace}/{kind}", get(list_k8s_core_namespaced_resources))
        .route("/api/{version}/{kind}", get(list_k8s_core_resources))
        .route("/apis/{group}/{version}/namespaces/{namespace}/{kind}", get(list_k8s_namespaced_resources))
        .route("/apis/{group}/{version}/{kind}", get(list_k8s_resources))
        .with_state((client, services, plugins))
        .layer(cors);

    let listener = tokio::net::TcpListener::bind(format!("{}:{}", addr, port)).await.unwrap();
    axum::serve(listener, app).await?;

    Ok(())
}

async fn version() -> &'static str {
    "0.0.1"
}

async fn healthz() -> StatusCode {
    StatusCode::OK
}

async fn readyz() -> StatusCode {
    StatusCode::OK
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct ResourceDefinition {
    name: String,
    group: String,
    version: String,
    kind: String,
    domain: String,
    service: String,
    plugin_ref: Option<PluginRef>,
}

async fn list_services(
    State((_client, services, _)): State<(Client, Services, Plugins)>,
) -> Result<Json<Vec<ResourceDefinition>>, StatusCode> {
    let services_list = {
        let services_guard = match services.lock() {
            Ok(s) => s,
            Err(_) => return Err(StatusCode::INTERNAL_SERVER_ERROR),
        };
        services_guard.clone()
    };

    // Utiliser directement le cache alimenté par l'opérateur
    let definitions: Vec<ResourceDefinition> = services_list
        .iter()
        .map(|(name, spec)| ResourceDefinition {
            name: name.clone(),
            group: spec.group.clone(),
            version: spec.version.clone(),
            kind: spec.kind.clone(),
            domain: spec.domain.clone(),
            service: spec.service.clone(),
            plugin_ref: spec.plugin_ref.clone(),
        })
        .collect();

    Ok(Json(definitions))
}

async fn get_service(
    State((_client, services, _)): State<(Client, Services, Plugins)>,
    Path(name): Path<String>,
) -> Result<Json<ResourceDefinition>, StatusCode> {
    let services_list = {
        let services_guard = match services.lock() {
            Ok(s) => s,
            Err(_) => return Err(StatusCode::INTERNAL_SERVER_ERROR),
        };
        services_guard.clone()
    };

    // Utiliser directement le cache alimenté par l'opérateur
    let spec = match services_list.get(&name) {
        Some(spec) => spec,
        None => return Err(StatusCode::NOT_FOUND),
    };

    Ok(Json(ResourceDefinition {
        name,
        group: spec.group.clone(),
        version: spec.version.clone(),
        kind: spec.kind.clone(),
        domain: spec.domain.clone(),
        service: spec.service.clone(),
        plugin_ref: spec.plugin_ref.clone(),
    }))
}

#[derive(serde::Serialize)]
struct Plugin {
    name: String,
    source: Source,
}

async fn list_plugins(
    State((_client, _, plugins)): State<(Client, Services, Plugins)>,
) -> Result<Json<Vec<Plugin>>, StatusCode> {
    let plugins_list = {
        let plugins_guard = match plugins.lock() {
            Ok(s) => s,
            Err(_) => return Err(StatusCode::INTERNAL_SERVER_ERROR),
        };
        plugins_guard.clone()
    };

    // Utiliser directement le cache alimenté par l'opérateur
    let definitions: Vec<Plugin> = plugins_list
        .iter()
        .map(|(name, spec)| Plugin {
            name: name.clone(),
            source: spec.source.clone(),
        })
        .collect();

    Ok(Json(definitions))
}

async fn get_plugin(
    State((_client, _, plugins)): State<(Client, Services, Plugins)>,
    Path(name): Path<String>,
) -> Result<Json<Plugin>, StatusCode> {
    let plugins_list = {
        let plugins_guard = match plugins.lock() {
            Ok(s) => s,
            Err(_) => return Err(StatusCode::INTERNAL_SERVER_ERROR),
        };
        plugins_guard.clone()
    };

    // Utiliser directement le cache alimenté par l'opérateur
    let spec = match plugins_list.get(&name) {
        Some(spec) => spec,
        None => return Err(StatusCode::NOT_FOUND),
    };

    Ok(Json(Plugin {
        name,
        source: spec.source.clone(),
    }))
}

#[derive(Clone)]
pub struct Context {
    client: Client,
}

impl<S> FromRequestParts<S> for Context
where
    S: Send + Sync,
{
    type Rejection = (StatusCode, String);

    async fn from_request_parts(parts: &mut Parts, _: &S) -> Result<Self, Self::Rejection> {
        // Try to extract the `Authorization` header
        let TypedHeader(Authorization(bearer)) =
            TypedHeader::<Authorization<Bearer>>::from_request_parts(parts, &())
                .await
                .map_err(|_| {
                    (
                        StatusCode::UNAUTHORIZED,
                        "Missing or malformed `Authorization: Bearer <token>` header"
                            .to_string(),
                    )
                })?;

        let mut auth_info = AuthInfo::default();
        auth_info.token = Some(SecretString::from(bearer.token()));

        let mut config = match Config::infer().await {
            Ok(config) => config,
            Err(e) => {
                error!("Error while inferring kubeconfig context: {e}");
                return Err((StatusCode::INTERNAL_SERVER_ERROR, "Error while inferring kubeconfig context".to_string()))
            },
        };
        config.auth_info = auth_info;
        let client = match Client::try_from(config) {
            Ok(client) => client,
            Err(e) => {
                error!("Error while creating kubernetes client: {e}");
                return Err((StatusCode::INTERNAL_SERVER_ERROR, "Error while creating kubernetes client".to_string()))
            },
        };

        Ok(Context{ client })
    }
}

async fn list_k8s_core_namespaced_resources(
    context: Context,
    State((_, services, _)): State<(Client, Services, Plugins)>,
    Path((version, namespace, kind)): Path<(String, String, String)>
) -> Result<Json<ObjectList<DynamicObject>>, StatusCode> {
    debug!("{} {} {}", version, namespace, kind);

    let gvk = GroupVersionKind::gvk("", &version, &kind);

    let (ar, _caps) = utils::discover_api(&context.client, &gvk).await?;

    let api: Api<DynamicObject> = Api::namespaced_with(context.client.clone(), &namespace, &ar);

    let resources = match api.list(&ListParams::default().match_any()).await {
        Ok(resources) => resources,
        Err(e) => {
            error!("Error listing group/version/kind {}/{}/{} : {e}", &gvk.group, &gvk.version, &gvk.kind);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        },
    };

    Ok(Json(resources))

    // let resources: Json<Vec<serde_json::Map<String, serde_json::Value>>> = Json(resources.iter().map(|s| {
    //     let mut obj = s.data.as_object().unwrap().get("spec").unwrap().as_object().unwrap().clone();
    //     obj.insert(String::from("name"), serde_json::Value::String(s.name_any()));
    //     obj
    // }).collect::<Vec<_>>());

    // Ok(resources)
}


async fn list_k8s_namespaced_resources(
    // context: Context,
    State((client, services, _)): State<(Client, Services, Plugins)>,
    Path((group, version, namespace, kind)): Path<(String, String, String, String)>
) -> Result<Json<ObjectList<DynamicObject>>, StatusCode> {
    debug!("{} {} {}", version, namespace, kind);

    let gvk = GroupVersionKind::gvk(&group, &version, &kind);

    let (ar, _caps) = utils::discover_api(&client, &gvk).await?;

    let api: Api<DynamicObject> = Api::namespaced_with(client.clone(), &namespace, &ar);

    let resources = match api.list(&ListParams::default().match_any()).await {
        Ok(resources) => resources,
        Err(e) => {
            error!("Error listing group/version/kind {}/{}/{} : {e}", &gvk.group, &gvk.version, &gvk.kind);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        },
    };

    Ok(Json(resources))

    // let resources: Json<Vec<serde_json::Map<String, serde_json::Value>>> = Json(resources.iter().map(|s| {
    //     let mut obj = s.data.as_object().unwrap().get("spec").unwrap().as_object().unwrap().clone();
    //     obj.insert(String::from("name"), serde_json::Value::String(s.name_any()));
    //     obj
    // }).collect::<Vec<_>>());

    // Ok(resources)
}

async fn list_k8s_core_resources(
    // context: Context,
    State((client, services, _)): State<(Client, Services, Plugins)>,
    Path((version, kind)): Path<(String, String)>
) -> Result<Json<ObjectList<DynamicObject>>, StatusCode> {
    debug!("{} {}", version, kind);

    let gvk = GroupVersionKind::gvk("", &version, &kind);

    let (ar, _caps) = utils::discover_api(&client, &gvk).await?;

    let api: Api<DynamicObject> = Api::all_with(client.clone(), &ar);

    let resources = match api.list(&ListParams::default().match_any()).await {
        Ok(resources) => resources,
        Err(e) => {
            error!("Error listing group/version/kind {}/{}/{} : {e}", &gvk.group, &gvk.version, &gvk.kind);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        },
    };

    Ok(Json(resources))

    // let resources: Json<Vec<serde_json::Map<String, serde_json::Value>>> = Json(resources.iter().map(|s| {
    //     let mut obj = s.data.as_object().unwrap().get("spec").unwrap().as_object().unwrap().clone();
    //     obj.insert(String::from("name"), serde_json::Value::String(s.name_any()));
    //     obj
    // }).collect::<Vec<_>>());

    // Ok(resources)
}

async fn list_k8s_resources(
    // context: Context,
    State((client, services, _)): State<(Client, Services, Plugins)>,
    Path((group, version, kind)): Path<(String, String, String)>
) -> Result<Json<ObjectList<DynamicObject>>, StatusCode> {
    debug!("{} {}", version, kind);

    let gvk = GroupVersionKind::gvk(&group, &version, &kind);

    let (ar, _caps) = utils::discover_api(&client, &gvk).await?;

    let api: Api<DynamicObject> = Api::all_with(client.clone(), &ar);

    let resources = match api.list(&ListParams::default().match_any()).await {
        Ok(resources) => resources,
        Err(e) => {
            error!("Error listing group/version/kind {}/{}/{} : {e}", &gvk.group, &gvk.version, &gvk.kind);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        },
    };

    Ok(Json(resources))

    // let resources: Json<Vec<serde_json::Map<String, serde_json::Value>>> = Json(resources.iter().map(|s| {
    //     let mut obj = s.data.as_object().unwrap().get("spec").unwrap().as_object().unwrap().clone();
    //     obj.insert(String::from("name"), serde_json::Value::String(s.name_any()));
    //     obj
    // }).collect::<Vec<_>>());

    // Ok(resources)
}

async fn list_resources(
    context: Context,
    State((client, services, _)): State<(Client, Services, Plugins)>,
    Path((project, domain, version, service)): Path<(Uuid, String, String, String)>
) -> Result<Json<Vec<serde_json::Map<String, serde_json::Value>>>, StatusCode> {
    debug!("{} {} {} {}", project, domain, version, service);

    let namespace = utils::resolve_namespace(&client, project).await?;

    let service = utils::resolve_service(services.clone(), &service).await?;

    let (ar, _caps) = utils::discover_api(&context.client, &service.gvk()).await?;

    let api: Api<DynamicObject> = Api::namespaced_with(context.client.clone(), &namespace, &ar);

    let resources = match api.list(&ListParams::default().match_any()).await {
        Ok(resources) => resources,
        Err(e) => {
            error!("Error listing group/version/kind {}/{}/{} : {e}", &service.group, &service.version, &service.kind);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        },
    };

    let resources: Json<Vec<serde_json::Map<String, serde_json::Value>>> = Json(resources.iter().map(|s| {
        let mut obj = s.data.as_object().unwrap().get("spec").unwrap().as_object().unwrap().clone();
        obj.insert(String::from("name"), serde_json::Value::String(s.name_any()));
        obj
    }).collect::<Vec<_>>());

    Ok(resources)
}

async fn create_resource(
    context: Context,
    State((client, services, _)): State<(Client, Services, Plugins)>,
    Path((project, domain, version, service)): Path<(Uuid, String, String, String)>,
    Json(payload): Json<serde_json::Value>,
) -> Result<impl IntoResponse, StatusCode> {
    debug!("{} {} {} {}", project, domain, version, service);

    let service = utils::resolve_service(services.clone(), &service).await?;

    let namespace = utils::resolve_namespace(&client, project).await?;

    let (ar, _caps) = utils::discover_api(&context.client, &service.gvk()).await?;

    let api: Api<DynamicObject> = Api::namespaced_with(context.client.clone(), &namespace, &ar);

    let (name, resource) = utils::to_kube(&service.gvk(), payload)?;

    let params = kube::api::PatchParams::apply("rock-manager").force();
    let resource = Patch::Apply(&resource);
    match api.patch(&name, &params, &resource).await {
        Ok(result) => {
            println!("Applied object: {:?}", result.meta().name);
            Ok((StatusCode::CREATED, ()))
        }
        Err(e) => {
            error!("Error creating resource {:?}: {e}", resource);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
    
}

async fn get_resource(
    context: Context,
    State((client, services, _)): State<(Client, Services, Plugins)>,
    Path((project, domain, version, service, name)): Path<(Uuid, String, String, String, String)>
) -> Result<Json<serde_json::Value>, StatusCode> {
    debug!("{} {} {} {}", project, domain, version, service);

    let namespace = utils::resolve_namespace(&client, project).await?;

    let service = utils::resolve_service(services.clone(), &service).await?;

    let (ar, _caps) = utils::discover_api(&context.client, &service.gvk()).await?;

    let api: Api<DynamicObject> = Api::namespaced_with(context.client.clone(), &namespace, &ar);

    let resource = match api.get_opt(&name).await {
        Ok(Some(res)) => res,
        Ok(None) => {
            return Err(StatusCode::NOT_FOUND);
        },
        Err(e) => {
            error!("Error listing group/version/kind {}/{}/{} : {e}", &service.group, &service.version, &service.kind);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        },
    };

    let resource = utils::from_kube(resource)?;

    Ok(Json(resource))
}


async fn delete_resource(
    context: Context,
    State((client, services, _)): State<(Client, Services, Plugins)>,
    Path((project, domain, version, service, name)): Path<(Uuid, String, String, String, String)>
) -> Result<(), StatusCode> {
    debug!("{} {} {} {}", project, domain, version, service);

    let namespace = utils::resolve_namespace(&client, project).await?;

    let service = utils::resolve_service(services.clone(), &service).await?;

    let (ar, _caps) = utils::discover_api(&context.client, &service.gvk()).await?;

    let api: Api<DynamicObject> = Api::namespaced_with(context.client.clone(), &namespace, &ar);

    let _ = match api.get_opt(&name).await {
        Ok(Some(res)) => res,
        Ok(None) => {
            return Ok(());
        },
        Err(e) => {
            error!("Error listing group/version/kind {}/{}/{} : {e}", &service.group, &service.version, &service.kind);
            return Err(StatusCode::INTERNAL_SERVER_ERROR);
        },
    };

    let _ = match api.delete(&name, &DeleteParams::default()).await {
        Ok(res) => res,
        Err(e) => {
            error!("Error listing group/version/kind {}/{}/{} : {e}", &service.group, &service.version, &service.kind);
            return Err(StatusCode::INTERNAL_SERVER_ERROR)
        },
    };

    Ok(())
}

