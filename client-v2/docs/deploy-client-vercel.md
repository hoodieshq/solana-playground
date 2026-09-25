# Deploy the client to Vercel

Vercel's native Git integration auto-deploys: `master` → production; any other branch → preview. Those builds use the dashboard's Root Directory, which is still `client`, so **pushes currently deploy the upstream client, not `client-v2`**. Makefile targets exist as a local escape hatch and pin `client-v2` themselves — see [Which client gets deployed](#which-client-gets-deployed).

`installCommand` = `bash scripts/vercel-install.sh` (rustup + `wasm/build.sh` + `yarn install`); `buildCommand` = `yarn build`. Wasm must precede `yarn install` because `client-v2/package.json` has `file://../wasm/*/pkg` deps that don't exist until `wasm-pack` runs.

## Verified Vercel project settings

| Setting | Value |
| --- | --- |
| Plan / Build Machine | Enterprise + **Enhanced** |
| Framework Preset | Other |
| Root Directory | `client` — intended `client-v2`, not yet changed |
| Production Branch | `master` |
| Ignored Build Step | Automatic |

## How long a function may run

`vercel.json` sets `functions."api/agent.mjs".maxDuration = 300`. That
route streams a model's answer, so it is the only one that can outlive a
default; every other `api/*.mjs` handler answers in one round trip and
keeps the platform default.

**Why 300 and not less.** A value in `vercel.json` overrides the
platform default in *both* directions, and which default applies depends
on a project setting nobody has checked here:

| Compute mode | Default | Max (Enterprise) |
| --- | --- | --- |
| Fluid (on by default for projects created since ~2025-04) | 300 s | 800 s |
| Legacy serverless | 15 s | 900 s |

On legacy, 15 s cuts a long streamed answer off mid-sentence, which is
what this setting exists to prevent. On Fluid, a smaller number would
*lower* a limit that is already fine — a `maxDuration` of 60 would have
introduced the very truncation it was meant to fix. 300 is the one value
that is right under either reading: it raises the legacy default and
matches the Fluid one.

**Open, and needs the dashboard:** confirm whether this project runs
Fluid compute (Settings → Functions). Once known, this number can be
chosen on evidence rather than on the safe overlap.

A cut-off stream is not silent on the client side either: `api/agent.mjs`
aborts the upstream request when the browser goes away, and reports a
failed stream as an SSE `error` event rather than ending quietly.

## Which client gets deployed

The dashboard and the Makefile currently disagree, on purpose:

| Path | Root Directory used | Deploys |
| --- | --- | --- |
| `git push` (Git integration) | dashboard: `client` | upstream client |
| `make -f client-v2/Makefile.vercel deploy-client-to-vercel-preview` | pinned to `client-v2` | the fork's client |

`vercel build` takes the built directory from `settings.rootDirectory` in `.vercel/project.json`, which `vercel pull` caches from the dashboard. `vercel.json` has no `rootDirectory` key, so the dashboard is the only source for the Git path. `vercel-link-preview` rewrites the cached value to `client-v2` after every pull — that is what makes the local target build the fork while pushes do not.

Setting the dashboard Root Directory to `client-v2` makes both paths agree; the rewrite then becomes a no-op and can be dropped.

## One-time setup

1. Create the project. Framework: Other. Root Directory: `client-v2`.
2. Build Machine: Enhanced on Enterprise; default on Pro.
3. Production Branch: `master`. Ignored Build Step: Automatic.
4. A Vercel token, only if you need one — see [Tokens](#tokens). Local deploys do not: the Makefile targets fall back to your `vercel login` session.
5. Link the local checkout (from repo root):

   ```sh
   VERCEL_PROJECT_ID=prj_xxx make -f client-v2/Makefile.vercel vercel-bootstrap
   ```

   `-f` matters: the root `Makefile` still includes `client/Makefile.vercel`, so a bare `make <target>` runs the pre-move targets and deploys the upstream client.
6. Neon console → the org named `Vercel: Hoodies` → Settings → API keys → Create new → Project-scoped, for project `spring-cake-75618686`. Put it in `client-v2/.env` as `NEON_API_KEY=...`, alongside `DATABASE_URL` — `Makefile.vercel` lifts it out of there, because make does not read `.env` the way dbmate does. A Vercel-managed Neon account has no CLI login — `neon login` cannot work — so this key is the only way the Makefile reaches the Neon API, and only org Admins can mint one. The token is shown once.
7. Cut the empty parent that every preview database branches from, **before** anything migrates the shared database:

   ```sh
   make -f client-v2/Makefile.vercel neon-preview-base
   ```

   Order matters: `preview-base` is useful only because it is empty. Cut it after `migrate-parent-db` and every preview inherits tables that dbmate then tries to create again.

Add the Vercel deployment origin to the server's [`PG_CLIENT_URLS`](https://github.com/solana-playground/solana-playground/blob/cd5555155c61572c8c49fb351890519af9e493ef/.env.example#L3) environment variable or CORS will reject every request.

## Deploy

- **Automatic:** push the branch — but this builds `client`, not `client-v2`, until the dashboard Root Directory is changed.
- **Local preview:** `make -f client-v2/Makefile.vercel deploy-client-to-vercel-preview`. Promote later with `vercel promote <url> --prod`.
- **Local production:** `make -f client-v2/Makefile.vercel deploy-client-to-vercel-production`. The target prints the branch and commit, asks for a typed `yes`, and then runs `vercel build --prod` and `vercel deploy --prebuilt --prod`. Run `migrate-parent-db` first when migrations are pending.

`vercel-link-preview` or `vercel-link-production` runs automatically as a prerequisite.

A Git-integration build with no cache does not finish inside Vercel's [build time limit](https://vercel.com/docs/builds#limits-and-resources). A local build has no such limit, and it reuses the Rust state that earlier local builds left in `client-v2/.cache/rust`.

## Build cache

`scripts/vercel-install.sh` stores the built `wasm/*/pkg` directories as one tar named by a hash of every file under `wasm/` except build output. Any change under `wasm/` produces a new hash and rebuilds every wasm package. The tar is looked up in two places, in this order:

| Place | Lives across | Needs |
| --- | --- | --- |
| `node_modules/.cache/wasm-pkg/<hash>.tar` | local runs; on Vercel, successful builds only, through the [build cache](https://vercel.com/docs/builds#limits-and-resources) | nothing |
| `wasm-pkg/<hash>.tar` in the public Blob store `solana-playground-wasm` | every build, every machine | `BLOB_STORE_ID` in the environment |

On a miss the script builds, writes both places, and only then runs `yarn install` and the client build. A build that later exceeds Vercel's time limit still leaves the tar in the store, so the next build with the same `wasm/` files skips rustup, `wasm-pack`, and `cargo`. A laptop that already holds the local tar uploads it when the store does not have it, which is how the store gets seeded.

The store is public so that downloads need no credential. Its content is the compiled output of the crates under `wasm/`, the same files the deployed client serves to every visitor. Uploads authenticate with the read-write token or OIDC token that Vercel adds to the project when the store is connected; the script passes neither to the log. A `robots.txt` in the store keeps its URLs out of search indexes. An upload failure prints a warning and the build continues; the next build rebuilds.

Rust state (toolchains, cargo registry, and target dir) lives in `client-v2/.cache/rust`, outside `node_modules`. Vercel's build cache keeps `node_modules`, and the Rust state alone is larger than the cache size limit. On Vercel the Rust state is empty at the start of every build. Locally it persists.

Create the store once, from the repo root:

```sh
make -f client-v2/Makefile.vercel vercel-wasm-cache-store
```

The target creates the store, connects it to the project for every environment, pulls the resulting variables, and uploads the `robots.txt`.

The deploy resolves this git branch's Neon branch first, before building, and passes it as `-e DATABASE_URL=<pooled url>` so the deployment overrides the project-level variable. Resolving first is deliberate: a Neon failure should not cost a full wasm build.

`--archive=tgz` is not optional. The prebuilt output is about 16k files and the upload API rejects more than 15000 (`files should NOT have more than 15000 items`), so the tree goes up as a single tarball.

## Tokens

`Makefile.vercel` passes `--token` only when `VERCEL_TOKEN` is set. Unset, the
CLI uses the session from `vercel login`, so local deploys need no token at all.
`vercel-bootstrap` is the exception — it calls the REST API with `curl`, and a
raw HTTP request has no stored login to fall back on.

**A project-scoped token cannot drive the CLI.** Choosing a single project in
Account Settings → Tokens creates one, and it denies every user-level request.
The CLI calls `/v2/user` and `/v3/user/tokens/current` on startup and enumerates
`/v9/projects?limit=100`, so it fails with a message that blames the wrong thing:

```
Error: Could not retrieve Project Settings. To link your Project, remove the `.vercel` directory and deploy again.
```

The `.vercel` directory is fine. The tell is that the same token works for
`vercel-bootstrap`, because `/v9/projects/<id>` is project-level — when `curl`
succeeds and the CLI does not, suspect the scope, not the link.

Selecting **All Projects** creates a team-scoped token, which does work, at the
cost of org-wide CLI access. Vercel has had project-scoped CLI support open since
July 2025; the documented `--project` flag still answers `projectId is not
supported (400)`.

CI needs no Vercel token today, because no workflow deploys. Vercel's Git
integration builds on Vercel's own infrastructure, authenticated through the
GitHub app connection.

## Assistant default backend

`api/agent.mjs` is the assistant's **Default** backend: the panel posts a
chat-completions turn to it and the route forwards that upstream with a key the
browser never sees. Set all three or the option reports itself unconfigured and
the panel falls back to bring-your-own-key:

| Variable | Meaning |
|---|---|
| `AGENT_BASE_URL` | OpenAI-compatible base URL, e.g. `https://api.openai.com/v1` — the same shape the panel's own provider field takes. A pasted `/chat/completions` suffix is tolerated |
| `AGENT_MODEL` | Model id the upstream should run — the client never picks one |
| `AGENT_API_KEY` | Bearer token for the upstream; omit only for an endpoint that checks none |
| `AGENT_ENABLED` | Optional kill switch. `false`, `0`, `off` or `no` disables the backend even when the three above are set; unset means on |

There is no cost gate in front of this route. Anything that can reach the
deployment can spend that key, so put a challenge and a per-session limit
in front of it before pointing it at a paid account.

## Conversation and project sync

Off unless configured, and off again the moment `SYNC_ENABLED` is not exactly
`true`. The client asks `/api/sync` first and stays purely local when the
answer is no, so a deployment without a database behaves exactly as it did
before this existed.

| Variable | Meaning |
|---|---|
| `DATABASE_URL` | Postgres connection string. **Must be a pooled endpoint.** A serverless function opens a connection per invocation and will exhaust `max_connections` against a direct one. TLS is required and the certificate verified unless the URL sets `sslmode` — so a provider needing a looser mode has to say so in the URL, where it is visible in review |
| `SYNC_ENABLED` | Kill switch. Only the exact string `true` enables sync; unset or anything else keeps the app local-only |
| `AUTH_SECRET` | Better Auth signing secret. Generate one per environment; rotating it signs everyone out |
| `AUTH_BASE_URL` | The deployment's own origin, e.g. `https://example.vercel.app`. Better Auth builds the OAuth callback from it, so a wrong value breaks sign-in with no error at the browser |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | The OAuth app. Its callback URL must match `AUTH_BASE_URL` |

**Migrations are applied by hand, never by a function.** Every preview gets its
own Neon branch, so its schema is its own problem:

```sh
make -f client-v2/Makefile.vercel migrate-preview-db
```

That creates `preview/<git-branch>` from `preview-base` on first use and applies
the whole migration history to it. Because the branch belongs to one git branch
and nothing else reads it, there is no confirmation prompt and a bad migration
costs a `neon branches delete`, not an incident. Two people testing two
migrations can no longer corrupt each other, which was the case before preview
and production shared a single database.

Previews branch from `preview-base` rather than from the default branch for two
reasons. A plain copy-on-write branch would carry production's rows into every
preview. A `--schema-only` branch would carry the tables but leave
`schema_migrations` empty, so dbmate would try to create tables that already
exist. An empty parent avoids both.

The shared database behind the project-level `DATABASE_URL` still needs its own
schema, and that one serves production:

```sh
make -f client-v2/Makefile.vercel migrate-parent-db
```

It prints the pending migrations and the target host, then requires a typed
`yes`. It skips the prompt entirely when nothing is pending, so the warning
never becomes something to click through.

**Nothing applies migrations automatically, in any environment.** CI runs
`yarn db-migrate` only against its own throwaway service container
(`client-v2.yml:101`), which proves the history replays from scratch but touches
nothing real. The Git integration deploys `master` to production with no hook
before or after it. Production is therefore migrated by a person running
`migrate-parent-db` from a laptop, and the ordering is theirs to get right:
migrate first, then merge. A deployment that ships ahead of its migration runs
against a schema missing the columns it expects.

A preview deployment pointed at a database that has not been migrated will
answer `db: "unreachable"` from `/api/sync` and stay local, which is the
intended failure rather than a broken app. Note the limit of that: it covers a
database that cannot be reached, not one whose schema is merely out of date.

### Known gaps

- **No signed-in end-to-end coverage.** The e2e suite runs signed out, so the
  sync paths it exercises are the ones that decline to do anything. Two-browser
  behaviour has only been checked by hand.
- **`/api/agent` is still ungated** — see the section above. Sync does not
  change that.
- The deployed-preview reachability of `DATABASE_URL` has not been verified;
  everything so far has run against a local container.
- **No deployment has ever succeeded.** Of the last 100, all were Git-triggered:
  98 cancelled by the Ignored Build Step (`exit 0` for anything that is not
  production, so preview builds are switched off at the project level) and 2
  errored on `master`. The Makefile has never produced one.
- **The Neon calls are untested against real Neon.** `neon-preview-base`,
  `preview-db-branch` and `migrate-preview-db` were exercised with a stubbed
  `neonctl` against a local Postgres, which proves the arguments and the shell
  but not that the Neon API accepts them. `neon-preview-base` is the smallest
  real call and fails fastest.

## Endpoint routing

- All non-share routes → the hardcoded Solana Foundation server URL in `client-v2/src/settings/server/server.ts` (also user-overridable via the `server.endpoint` setting), so forks can point at their own backend.
- Share routes (`/share/*`, `/new`) → hardcoded `https://api.solpg.io` so shared snippets stay discoverable across hosts.
