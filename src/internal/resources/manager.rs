use std::collections::BTreeMap;

use k8s_openapi::{api::{apps::v1::{Deployment, DeploymentSpec}, core::v1::{Capabilities, Container, ContainerPort, HTTPGetAction, Namespace, PodSecurityContext, PodSpec, PodTemplateSpec, Probe, ResourceRequirements, SeccompProfile, SecurityContext}, rbac::v1::ClusterRole}, apimachinery::pkg::{api::resource::Quantity, apis::meta::v1::LabelSelector, util::intstr::IntOrString}};
use kube::{api::{ObjectMeta, Patch, PatchParams}, Api, Client};

use crate::{CONTROLLER_NAME, OPERATOR_NAME};

pub(crate) fn manifests(namespace: &String) -> anyhow::Result<()> {

    print!("---\n{}", serde_yaml::to_string(&manager_namespace(namespace))?);
    print!("---\n{}", serde_yaml::to_string(&manager_deployment(namespace))?);

    Ok(())
}

pub(crate) async fn install(client: &Client, namespace: &String) -> anyhow::Result<()> {

    let pp = PatchParams::apply("rock-installer").force(); 

    let api: Api<Namespace> = Api::all(client.clone());
    let _ = api
        .patch(
            namespace,
            &pp,
            &Patch::Apply(&manager_namespace(namespace)),
        )
        .await?;
    
    let api: Api<ClusterRole> = Api::all(client.clone());
    let _ = api
        .patch(
            &format!("{CONTROLLER_NAME}-manager"),
            &pp,
            &Patch::Apply(&manager_deployment(namespace)),
        )
        .await?;
    
    Ok(())

}

fn manager_namespace(namespace: &String) -> Namespace {
    Namespace {
        metadata: ObjectMeta {
                    name: Some(namespace.clone()),
                    labels: Some(BTreeMap::from([(String::from("app.kubernetes.io/name"), String::from(OPERATOR_NAME))])),
                    ..ObjectMeta::default()
                },
        ..Namespace::default()
    }
}

fn manager_deployment(namespace: &String) -> Deployment {
    Deployment {
        metadata: ObjectMeta {
                    name: Some(format!("{CONTROLLER_NAME}-manager")),
                    namespace: Some(namespace.clone()),
                    labels: Some(BTreeMap::from([(String::from("app.kubernetes.io/name"), String::from(OPERATOR_NAME))])),
                    ..ObjectMeta::default()
                },
        spec: Some(DeploymentSpec {
            replicas: Some(1),
            selector: LabelSelector {
                match_labels: Some(BTreeMap::from([(String::from("app.kubernetes.io/name"), String::from(OPERATOR_NAME))])),
                ..LabelSelector::default()
            },
            template: PodTemplateSpec {
                metadata: Some(ObjectMeta {
                    labels: Some(BTreeMap::from([(String::from("app.kubernetes.io/name"), String::from(OPERATOR_NAME))])),
                    ..ObjectMeta::default()
                }),
                spec: Some(PodSpec {
                    containers: vec![
                        Container {
                            name: String::from("manager"),
                            command: Some(vec![String::from("/rock")]),
                            args: Some(vec![String::from("run")]),
                            image: Some(String::from("rock:latest")),
                            liveness_probe: Some(Probe {
                                http_get: Some(HTTPGetAction {
                                    path: Some(String::from("/-/healthz")),
                                    port: IntOrString::Int(3000),
                                    ..Default::default()
                                }),
                                ..Default::default()
                            }),
                            readiness_probe: Some(Probe {
                                http_get: Some(HTTPGetAction {
                                    path: Some(String::from("/-/readyz")),
                                    port: IntOrString::Int(3000),
                                    ..Default::default()
                                }),
                                ..Default::default()
                            }),
                            ports: Some(vec![ContainerPort { container_port: 3000, protocol: Some(String::from("TCP")), ..Default::default()}]),
                            resources: Some(ResourceRequirements {
                                limits: Some(BTreeMap::from([(String::from("cpu"), Quantity(String::from("500m"))), (String::from("memory"), Quantity(String::from("128Mi")))])),
                                requests: Some(BTreeMap::from([(String::from("cpu"), Quantity(String::from("10m"))), (String::from("memory"), Quantity(String::from("64Mi")))])),
                                ..Default::default()
                            }),
                            security_context: Some(SecurityContext {
                                allow_privilege_escalation: Some(false),
                                capabilities: Some(Capabilities {
                                    drop: Some(vec![String::from("ALL")]),
                                    ..Default::default()
                                }),
                                ..Default::default()
                            }),
                            ..Default::default()}
                    ],
                    security_context: Some(PodSecurityContext {
                        run_as_non_root: Some(true),
                        seccomp_profile: Some(SeccompProfile {
                            type_: String::from("RuntimeDefault"),
                            ..Default::default()
                        }),
                        ..Default::default()
                    }),
                    service_account_name: Some(format!("{CONTROLLER_NAME}-manager")),
                    termination_grace_period_seconds: Some(10),
                    ..Default::default()
                }),
            },
            ..DeploymentSpec::default()
        }),
        ..Deployment::default()
    }
}
