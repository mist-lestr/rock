use std::collections::BTreeMap;

use k8s_openapi::api::{core::v1::ServiceAccount, rbac::v1::{ClusterRole, ClusterRoleBinding, PolicyRule, RoleRef, Subject}};
use kube::{api::{ObjectMeta, Patch, PatchParams}, Api, Client};

use crate::{CONTROLLER_NAME, OPERATOR_NAME};

pub(crate) fn manifests(namespace: &String) -> anyhow::Result<()> {

    print!("---\n{}", serde_yaml::to_string(&manager_role_binding(namespace))?);
    print!("---\n{}", serde_yaml::to_string(&manager_role())?);
    print!("---\n{}", serde_yaml::to_string(&manager_service_account(namespace))?);

    Ok(())
}

pub(crate) async fn install(client: &Client, namespace: &String) -> anyhow::Result<()> {

    let pp = PatchParams::apply("rock-installer").force(); 

    let api: Api<ClusterRoleBinding> = Api::all(client.clone());
    let _ = api
        .patch(
            &format!("{CONTROLLER_NAME}-manager"),
            &pp,
            &Patch::Apply(&manager_role_binding(namespace)),
        )
        .await?;
    
    let api: Api<ClusterRole> = Api::all(client.clone());
    let _ = api
        .patch(
            &format!("{CONTROLLER_NAME}-manager"),
            &pp,
            &Patch::Apply(&manager_role()),
        )
        .await?;
    
    let api: Api<ServiceAccount> = Api::all(client.clone());
    let _ = api
        .patch(
            &format!("{CONTROLLER_NAME}-manager"),
            &pp,
            &Patch::Apply(&manager_service_account(namespace)),
        )
        .await?;
    
    Ok(())

}

fn manager_role_binding(namespace: &String) -> ClusterRoleBinding {
    ClusterRoleBinding {
        metadata: ObjectMeta {
                    name: Some(format!("{CONTROLLER_NAME}-manager")),
                    labels: Some(BTreeMap::from([(String::from("app.kubernetes.io/name"), String::from(OPERATOR_NAME))])),
                    ..ObjectMeta::default()
                },
        role_ref: RoleRef {
            api_group: String::from("rbac.authorization.k8s.io"),
            kind: String::from("ClusterRole"),
            name: String::from(format!("{CONTROLLER_NAME}-manager")),
        },
        subjects: Some(vec![
            Subject {
                kind: String::from("ServiceAccount"), 
                name: format!("{CONTROLLER_NAME}-manager"),
                namespace: Some(namespace.clone()),
                ..Default::default()
            }
        ]),
    }
}

fn manager_role() -> ClusterRole {
    ClusterRole {
        metadata: ObjectMeta {
                    name: Some(format!("{CONTROLLER_NAME}-manager")),
                    labels: Some(BTreeMap::from([(String::from("app.kubernetes.io/name"), String::from(OPERATOR_NAME))])),
                    ..ObjectMeta::default()
                },
        rules: Some(vec!(
            PolicyRule {
                api_groups:Some(vec![String::from("mist-lestr.io")]),
                resources: Some(vec![String::from("services"), String::from("services/status"), String::from("services/finalizers")]),
                verbs: vec![String::from("get"), String::from("list"), String::from("watch"), String::from("patch"), String::from("update")],
                ..PolicyRule::default()
            },
            PolicyRule {
                api_groups:Some(vec![String::from("events.k8s.io")]),
                resources: Some(vec![String::from("events")]),
                verbs: vec![String::from("create")],
                ..PolicyRule::default()
            },
        )),
        ..ClusterRole::default()
    }
}

fn manager_service_account(namespace: &String) -> ServiceAccount {
    ServiceAccount {
        metadata: ObjectMeta {
                    name: Some(format!("{CONTROLLER_NAME}-manager")),
                    namespace: Some(namespace.clone()),
                    labels: Some(BTreeMap::from([(String::from("app.kubernetes.io/name"), String::from(OPERATOR_NAME))])),
                    ..ObjectMeta::default()
                },
        ..ServiceAccount::default()
    }
}