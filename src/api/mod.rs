use axum::{extract::{FromRequestParts, Path, State}, http::{request::Parts, StatusCode}, response::IntoResponse, routing::get, Json, Router};
use axum_extra::{headers::{authorization::Bearer, Authorization}, TypedHeader};
use kube::{api::{DeleteParams, DynamicObject, ListParams, Patch}, config::AuthInfo, Api, Config, Resource, ResourceExt};
use kube::Client;
use log::{debug, error};
use secrecy::SecretString;
use uuid::Uuid;

use crate::{cmd::run::Services, internal::utils};

pub(crate) async fn serve(addr: String, port: i32, client: Client, services: Services) -> anyhow::Result<()> {
    let app = Router::new()
        .route("/-/version", get(version))
        .route("/-/healthz", get(healthz))
        .route("/-/readyz", get(readyz))
        .route("/{project}/{domain}/{version}/{service}", get(list_resources).post(create_resource))
        .route("/{project}/{domain}/{version}/{service}/{name}", get(get_resource).delete(delete_resource))
        .with_state((client, services));

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


async fn list_resources(
    context: Context,
    State((client, services)): State<(Client, Services)>,
    Path((project, domain, version, service)): Path<(Uuid, String, String, String)>
) -> Result<Json<Vec<serde_json::Map<String, serde_json::Value>>>, StatusCode> {
    debug!("{} {} {} {}", project, domain, version, service);

    let namespace = utils::resolve_namespace(&client, project).await?;

    let service = utils::resolve_service(services.clone(), &service).await?;

    let (ar, _caps) = utils::discover_api(&context.client, &service).await?;

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
    State((client, services)): State<(Client, Services)>,
    Path((project, domain, version, service)): Path<(Uuid, String, String, String)>,
    Json(payload): Json<serde_json::Value>,
) -> Result<impl IntoResponse, StatusCode> {
    debug!("{} {} {} {}", project, domain, version, service);

    let service = utils::resolve_service(services.clone(), &service).await?;

    let namespace = utils::resolve_namespace(&client, project).await?;

    let (ar, _caps) = utils::discover_api(&context.client, &service).await?;

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
    State((client, services)): State<(Client, Services)>,
    Path((project, domain, version, service, name)): Path<(Uuid, String, String, String, String)>
) -> Result<Json<serde_json::Value>, StatusCode> {
    debug!("{} {} {} {}", project, domain, version, service);

    let namespace = utils::resolve_namespace(&client, project).await?;

    let service = utils::resolve_service(services.clone(), &service).await?;

    let (ar, _caps) = utils::discover_api(&context.client, &service).await?;

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
    State((client, services)): State<(Client, Services)>,
    Path((project, domain, version, service, name)): Path<(Uuid, String, String, String, String)>
) -> Result<(), StatusCode> {
    debug!("{} {} {} {}", project, domain, version, service);

    let namespace = utils::resolve_namespace(&client, project).await?;

    let service = utils::resolve_service(services.clone(), &service).await?;

    let (ar, _caps) = utils::discover_api(&context.client, &service).await?;

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

