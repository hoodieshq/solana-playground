# Infrastructure

Two App Engine Flex services: `default` (Hono BFF + CRA bundle) and
`playground-server` (Rust). Deploys from GitHub Actions via Workload Identity
Federation — no JSON keys.

The `default` image is built by composing two intermediate images
(`wasm` → `client-build`) via Docker `build-contexts`; only `default` and
`playground-server` are deployed, the intermediates live in Artifact Registry
purely as build-graph nodes. Locally the same wiring is driven by compose
`additional_contexts` (see *Local compose* below).

## Secrets

Rotate `mongodb-uri` / `api-key`:

```sh
printf '%s' '<db_secret>'              | gcloud secrets versions add mongodb-uri --data-file=-
printf '%s' "$(openssl rand -hex 32)" | gcloud secrets versions add api-key    --data-file=-
```

## First-time deploy of `default`

The `default` (web BFF) service has not been deployed yet. The first
deployment must happen manually so App Engine creates the service:

```sh
VERSION=v0.1.0
AE_VERSION=${VERSION//./-}
REGION=us-central1
PROJECT=<project-id>
REPO=solpg

gcloud app deploy web/app.yaml --project=$PROJECT \
  --image-url=$REGION-docker.pkg.dev/$PROJECT/$REPO/web:$VERSION \
  --version=$AE_VERSION \
  --update-env-vars="PG_SERVER_URL=https://playground-server-dot-$PROJECT.$REGION.r.appspot.com,PG_API_KEY=$(gcloud secrets versions access latest --secret=api-key --project=$PROJECT)" \
  --quiet
```

After that, the workflow handles `default` on every tag push.

## Deploy

Push a semver tag from the default branch:

```sh
git tag v0.1.0 && git push origin v0.1.0
```

The `Deploy` workflow builds `wasm` → `client-build` → `web` and `server`
images, pushes them to Artifact Registry, then deploys `playground-server`
followed by `default` via `gcloud app deploy --image-url=… --update-env-vars=…`.

To re-deploy the same tag without rebuilding: Actions → `Deploy` →
`Run workflow` → input the tag.

## Rollback

Shift 100% of traffic to a previously-deployed AE version (no rebuild):

```sh
gcloud app services set-traffic playground-server --splits=v0-0-9=1 --quiet
gcloud app services set-traffic default            --splits=v0-0-9=1 --quiet
```

List candidate versions (those receiving 0% today, newest first):

```sh
gcloud app versions list --service=playground-server \
  --filter="traffic_split=0" --sort-by="~last_deployed_time"
gcloud app versions list --service=default \
  --filter="traffic_split=0" --sort-by="~last_deployed_time"
```

To roll forward to an older tag with a fresh build instead, run the workflow
from the Actions UI with that tag.

## Local compose

Four profiles, each self-contained:

| Profile | Services | Purpose |
|---|---|---|
| `dev` | `wasm`, `client` (yarn start), `server`, `db` | Hot-reload client dev loop. |
| `standalone` | `wasm`, `client-standalone` | Client-only, no server/db. |
| `prod` | `wasm`, `client-prod` (yarn build + serve), `server`, `db` | Backward-compatible production build served by `npx serve`. Kept for parity with the pre-`web` flow. |
| `prod_next` | `wasm`, `client-build`, `web`, `server`, `db` | Mirrors the App Engine deploy topology locally. |

`prod_next` profile boot sequence:

```sh
PG_API_KEY=testkey docker compose --profile prod_next up --build
```

The `client-build` service runs `yarn build` during image build, then exits;
its filesystem is fed into `web`'s image via `additional_contexts:
solana-playground-client-build: service:client-build`. `web` serves the
static bundle on `:3000` and gateways `/build`, `/deploy/:uuid`, `/share/:id`,
`/new` to the Rust service with `X-API-Key` injected.

`client/Dockerfile` is not changed by this setup — `dev` and `standalone`
continue to use it unchanged.

### Running only the server

There is no dedicated profile for "server only" — explicit service naming
bypasses the profile gate:

```sh
docker compose up server db
```

This boots just the Rust service and MongoDB without client, Hono, or WASM.

## Rotate a secret

```sh
printf '%s' '<new_value>' | gcloud secrets versions add <mongodb-uri|api-key> --data-file=-
```

Push a new tag to apply.
