# Solana Playground

[SolPg](https://beta.solpg.io) allows you to quickly develop, deploy and test [Solana](https://docs.solana.com/introduction) programs(smart contracts) from browsers.

## Supported crates

| Crate                                                                              | Version |
| ---------------------------------------------------------------------------------- | ------- |
| [anchor-lang](https://docs.rs/anchor-lang/0.29.0)                                  | 0.29.0  |
| [anchor-spl](https://docs.rs/anchor-spl/0.29.0)                                    | 0.29.0  |
| [arrayref](https://docs.rs/arrayref/0.3.7)                                         | 0.3.7   |
| [borsh](https://docs.rs/borsh/0.10.3)                                              | 0.10.3  |
| [borsh-derive](https://docs.rs/borsh-derive/0.10.3)                                | 0.10.3  |
| [bytemuck](https://docs.rs/bytemuck/1.14.0)                                        | 1.14.0  |
| [bytemuck_derive](https://docs.rs/bytemuck_derive/1.5.0)                           | 1.5.0   |
| [mpl-bubblegum](https://docs.rs/mpl-bubblegum/1.0.0)                               | 1.0.0   |
| [mpl-token-auth-rules](https://docs.rs/mpl-token-auth-rules/1.4.3)                 | 1.4.3   |
| [mpl-token-metadata](https://docs.rs/mpl-token-metadata/3.2.3)                     | 3.2.3   |
| [num-derive](https://docs.rs/num-derive/0.4.0)                                     | 0.4.0   |
| [num-traits](https://docs.rs/num-traits/0.2.16)                                    | 0.2.16  |
| [pyth-sdk](https://docs.rs/pyth-sdk/0.8.0)                                         | 0.8.0   |
| [pyth-sdk-solana](https://docs.rs/pyth-sdk-solana/0.8.0)                           | 0.8.0   |
| [serde](https://docs.rs/serde/1.0.193)                                             | 1.0.193 |
| [solana-program](https://docs.rs/solana-program/1.16.24)                           | 1.16.24 |
| [spl-account-compression](https://docs.rs/spl-account-compression/0.2.0)           | 0.2.0   |
| [spl-associated-token-account](https://docs.rs/spl-associated-token-account/2.2.0) | 2.2.0   |
| [spl-pod](https://docs.rs/spl-pod/0.1.0)                                           | 0.1.0   |
| [spl-tlv-account-resolution](https://docs.rs/spl-tlv-account-resolution/0.4.0)     | 0.4.0   |
| [spl-token](https://docs.rs/spl-token/4.0.0)                                       | 4.0.0   |
| [spl-token-2022](https://docs.rs/spl-token-2022/0.9.0)                             | 0.9.0   |
| [spl-token-metadata-interface](https://docs.rs/spl-token-metadata-interface/0.2.0) | 0.2.0   |
| [spl-transfer-hook-interface](https://docs.rs/spl-transfer-hook-interface/0.3.0)   | 0.3.0   |
| [spl-type-length-value](https://docs.rs/spl-type-length-value/0.3.0)               | 0.3.0   |
| [switchboard-solana](https://docs.rs/switchboard-solana/0.29.79)                   | 0.29.79 |
| [switchboard-v2](https://docs.rs/switchboard-v2/0.4.0)                             | 0.4.0   |
| [thiserror](https://docs.rs/thiserror/1.0.48)                                      | 1.0.48  |

You can open an issue to request more crates.

> **Note:** Playground is still in **beta** and everything is subject to change.

## Run locally

- [Client setup](https://github.com/solana-playground/solana-playground/tree/master/client#setup)
- [Server setup](https://github.com/solana-playground/solana-playground/tree/master/server#setup)

##### Recommended versions

```sh
rustc --version
# rustc 1.75.0 (82e1608df 2023-12-21)

node --version
# v22.20.0

yarn --version
# 1.22.22
```

### Run with Docker

The project can be built and run entirely via Docker Compose.

All services run as `linux/amd64` containers (Solana CLI v1.17.34 does not ship Linux ARM64 binaries). This works on any platform with Docker: Linux natively, macOS via [OrbStack](https://orbstack.dev/) or Docker Desktop, and Windows via WSL2 or Docker Desktop.

```sh
# Full stack — development (hot reload)
docker compose --profile dev up --build

# Full stack — production (static build)
docker compose --profile prod up --build

# Client only — standalone without server
docker compose --profile standalone up --build

# Server only (+ database)
docker compose --profile dev up server --build

# Client:  http://localhost:3000
# Server:  http://localhost:8080
```

To stop and clean up:

```sh
# Stop services
docker compose down

# Stop and remove database volume
docker compose down -v
```

### Deploy to GCP

Deploy the build server and database to a GCE instance using Terraform.

#### Prerequisites

- [Terraform](https://developer.hashicorp.com/terraform/install) >= 1.5
- [gcloud CLI](https://cloud.google.com/sdk/docs/install) authenticated (`gcloud auth application-default login`)
- A GCP project with Compute Engine API enabled
- A domain with DNS you control

#### Setup

```sh
cd terraform
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars`:

```hcl
project_id   = "your-gcp-project-id"
api_domain   = "api.solpg.io"
client_url   = "https://beta.solpg.io"
machine_type = "e2-standard-4"       # 4 vCPU, 16 GB — for Rust/Solana compilation
```

#### Deploy

```sh
terraform init
terraform plan
terraform apply
```

After apply, Terraform outputs the static IP. Create a DNS A record:

```
api.solpg.io  ->  <output server_ip>
```

The VM startup script clones this repo, pulls the pre-built server image from ghcr.io, and starts server + MongoDB via `docker compose --profile prod`.

TLS is handled by a GCP-managed HTTPS Load Balancer. The managed SSL certificate takes 15-60 minutes to provision after DNS is configured.

#### Verify

```sh
# SSH into the instance via IAP
gcloud compute ssh solpg-server --zone=us-central1-a --tunnel-through-iap

# Check services are running
docker compose --profile prod ps

# Check logs
docker compose --profile prod logs -f server
```

#### GitHub Actions secrets

The CI workflows require the following secrets in **Settings > Secrets and variables > Actions**:

| Secret | Description |
|---|---|
| `GITHUB_TOKEN` | Automatic, no setup needed |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | `projects/<number>/locations/global/workloadIdentityPools/<pool>/providers/<provider>` |
| `GCP_SERVICE_ACCOUNT` | `<name>@<project-id>.iam.gserviceaccount.com` |

Deploy-specific variables (`REGISTRY`, `GCP_ZONE`, `GCE_INSTANCE`) are in [`infra/.env.deploy`](infra/.env.deploy).

#### Deploy and rollback

Pushing a tag triggers the deploy workflow:

```sh
git tag v1.0.0
git push --tags
```

To roll back, use the **Rollback Server** workflow in GitHub Actions. Enter the version to roll back to (e.g. `v1.0.0`) and optionally a tag to delete after rollback.

#### Custom server URL for the client

To build the client pointing at your own server instead of `api.solpg.io`:

```sh
REACT_APP_SERVER_URL=https://api.solpg.io docker compose --profile prod up --build
```

Or for standalone client deployment (e.g. on Vercel):

```sh
REACT_APP_SERVER_URL=https://api.solpg.io docker compose --profile standalone up --build
```

## Contributing

Anyone is welcome to contribute to **Solana Playground,** no matter how big or small the contribution.

## License

Public libraries (e.g. [solana-client-wasm](https://github.com/solana-playground/solana-playground/tree/master/wasm/solana-client), [solana-extra-wasm](https://github.com/solana-playground/solana-playground/tree/master/wasm/utils/solana-extra)) are licensed under [Apache-2.0](https://github.com/solana-playground/solana-playground/blob/master/LICENSE-APACHE), and the rest are licensed under [GPL-3.0](https://github.com/solana-playground/solana-playground/blob/master/LICENSE-GPL).
