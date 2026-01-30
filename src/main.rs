
use clap::{Parser, Subcommand};

pub mod api;
mod cmd;
mod controller;
mod internal;

const CONTROLLER_NAME: &str = "rock-controller";
const OPERATOR_NAME: &str = "rock-operator";

#[derive(Parser)]
#[command(name = "rock")]
#[command(about = "TODO", long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    Install {
        #[arg(long, conflicts_with = "crd", default_value = "true", default_value_if("crd", "true", "false"))]
        all: bool,
        #[arg(long, conflicts_with = "all", default_value = "false")]
        crd: bool,
    },
    Manifests {
        #[arg(long, conflicts_with = "crd", default_value = "true", default_value_if("crd", "true", "false"))]
        all: bool,
        #[arg(long, conflicts_with = "all", default_value = "false")]
        crd: bool,
    },
    Run {
        #[arg(short, long, default_value = "0.0.0.0")]
        addr: String,
        #[arg(short, long, default_value = "3000")]
        port: i32,
    },
}


#[tokio::main]
async fn main() -> anyhow::Result<()> {
    std::env::var("RUST_LOG").map_err(|_| unsafe {
        std::env::set_var("RUST_LOG", "error,rock=debug");
    }).unwrap_or_default();
    env_logger::init();

    let cli = Cli::parse();

    match cli.command {
        Commands::Install { all, crd } => {
            cmd::install::install(all, crd).await?;
        }
        Commands::Manifests { all, crd } => {

            if all || crd {
                rock_types::manifests()?;
            }

            if all {
                internal::resources::manager::manifests(&String::from("mist-lestr-system"))?;
                internal::resources::rbac::manifests(&String::from("mist-lestr-system"))?;
            }
        }
        Commands::Run { addr, port } => {
            cmd::run::run(addr, port).await?;
        }
    }

    Ok(())
}
