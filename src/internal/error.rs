use axum::http::StatusCode;
use uuid::Uuid;

pub(crate) type Result<T, E = Error> = std::result::Result<T, E>;

#[derive(Debug, thiserror::Error)]
pub(crate) enum Error {
    #[error("ProjectNotFound: {0}")]
    ProjectNotFound(Uuid),
    #[error("TooManyProjectsFound: {0}")]
    TooManyProjectsFound(Uuid),
    #[error("KubernetesError: {0}")]
    KubernetesError(#[source] kube::Error),
    #[error("ServiceNotFound: {0}")]
    ServiceNotFound(String),
    #[error("PoisonError")]
    PoisonError,
    #[error("SpecMustBeAnObject")]
    SpecMustBeAnObject,
    #[error("NameNotFound")]
    NameNotFound,
    #[error("NameMustBeAString")]
    NameMustBeAString,
}

impl From<Error> for StatusCode {
    fn from(err: Error) -> Self {
        match err {
            Error::ProjectNotFound(_) => StatusCode::BAD_REQUEST,
            Error::TooManyProjectsFound(_) => StatusCode::INTERNAL_SERVER_ERROR,
            Error::KubernetesError(_) => StatusCode::INTERNAL_SERVER_ERROR,
            Error::ServiceNotFound(_) => StatusCode::BAD_REQUEST,
            Error::SpecMustBeAnObject => StatusCode::BAD_REQUEST,
            Error::NameNotFound => StatusCode::BAD_REQUEST,
            Error::NameMustBeAString => StatusCode::BAD_REQUEST,
            _ => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }
}
