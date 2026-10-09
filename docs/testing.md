# Testing plan

Manual checks that the playground builds, runs, and serves its assets. Each case lists preconditions, the command or
steps, and the expected result, so it can be run by hand and later scripted.

| Section | Covers |
| --- | --- |
| [Prerequisites](#0-prerequisites) | macOS and Docker set-up, toolchains, branches |
| [Builds](#1-builds) | wasm, client, client-v2, server, compose images |
| [Client dev servers](#2-client-dev-servers-without-a-server) | client and client-v2 start with no build server running |
| [Full suite with compose](#3-full-suite-with-docker-compose) | client, server, and database together; client-server requests |
| [Static assets](#4-static-assets-default-rs-files-and-templates) | rust-analyzer `.rs` files in local, Vercel, and Docker builds; templates, tutorials |
| [Release gate](#5-release-gate-unstable-stays-out-of-production) | unstable stays out of production |
| [Optional: unstable server](#6-optional-unstable-server) | the server's unstable functionality, tested on purpose |

Case IDs are stable: refer to a case by ID, not by position.

## 0. Prerequisites

### P-1. Docker runs amd64 images

Every Docker image in this repository must run as `linux/amd64`: Anza does not publish ARM64 Solana releases, so an
ARM64 build of the server or program images fails.

- [ ] Docker has enough memory for parallel Rust builds (the client build alone sets `--max-old-space-size=6144`).
- [ ] `compose.yaml` pins `platform: linux/amd64` on its services, so `docker compose` needs nothing extra.

Darwin only (`uname -s` prints `Darwin`):

- [ ] Docker Desktop, Settings, General: "Use Rosetta for x86_64/amd64 emulation on Apple Silicon" is on. Without it
      Docker falls back to QEMU, which is several times slower for the Rust and Solana builds.
- [ ] Any `docker build` or `docker run` outside compose gets the platform from the environment:

  ```sh
  [ "$(uname -s)" = Darwin ] && export DOCKER_DEFAULT_PLATFORM=linux/amd64
  ```

Run:

```sh
docker run --rm --platform linux/amd64 alpine uname -m
```

Expect: `x86_64`.

### P-2. Toolchains

- [ ] Node and yarn versions match `client/.nvmrc` and the `packageManager` field of `client/package.json`.
- [ ] `rustup` is installed. The wasm toolchain comes from `wasm/rust-toolchain.toml`.
- [ ] `git submodule update --init` has populated `client/public` (the assets submodule).

### P-3. Branches

- [ ] All cases run from a `master-2.0` checkout. Its `client/`, `server/`, and `wasm/` match upstream; `client-v2/`
      exists only on `master-2.0` and branches made from it.

### P-4. One compose file, selected by profile

Every Docker case runs against the root [compose.yaml](../compose.yaml) and picks its services with `--profile`. A new
scenario adds a service or a profile to that file; it never adds a second compose file, an override file, or `-f`.

- [ ] `git ls-files | grep -iE '(^|/)(docker-)?compose[^/]*\.ya?ml$'` prints only `compose.yaml`.
- [ ] `docker compose config --profiles` lists every profile a case in this plan uses.

| Case | Profile |
| --- | --- |
| B-6, D-1, D-4, D-5 | `dev` |
| D-2, D-3 | `prod` |
| D-6 | `v2` |
| D-8, S-7 | `client-v2-standalone` |

The profiles for the upstream client (`client/`) stay in `compose.yaml` beside the client-v2 ones. A change for
client-v2 adds profiles; it does not rename or remove these:

| Profile | Runs |
| --- | --- |
| `dev` | client, server, database |
| `prod` | production build of the client, server, database |
| `client-standalone` | client without a server |
| `server-standalone` | server without a database |

- [ ] `docker compose config --profiles` lists all four.
- [ ] `docker compose --profile client-standalone config --services` includes `client-standalone` and no client-v2
      service.

### P-5. Docker builds run from a real checkout

The client Dockerfiles run `git submodule update --init client/public`, and `update-static.mjs` calls `git`. In a git
worktree, `.git` is a file that points to a path on the host (`gitdir: …/.git/worktrees/<name>`), which does not exist
in the image, so the build fails with `fatal: not a git repository`.

- [ ] Build images from the primary checkout or from a clone (`git clone --branch <branch> <worktree> <dir>`), never
      from a worktree under `.worktrees/`.

## 1. Builds

### B-1. wasm packages

The client depends on `wasm/*/pkg` as file dependencies, so this runs before any client install.

```sh
yarn --cwd client build-wasm
```

Expect: exit code 0; a `pkg/` directory in each wasm package.

### B-2. client: CI parity

Mirrors the `build` job in [reusable-checks.yml](../.github/workflows/reusable-checks.yml).

```sh
yarn --cwd client setup
git status --porcelain
yarn --cwd client test-types
yarn --cwd client test-unit
yarn --cwd client build
```

Expect: every command exits 0; `git status --porcelain` prints nothing (generated files are committed or ignored).

### B-3. client-v2: CI parity

Mirrors the `checks` job in [client-v2.yml](../.github/workflows/client-v2.yml).

Precondition: B-1, or `wasm/stub-packages.sh` as CI runs it. The stubs skip the Rust build but disable Rust
intellisense and the `solana`, `anchor`, `spl-token`, and `sugar` terminal commands, so S-3 needs B-1.

A checkout that started from the stubs keeps them after B-1: yarn 1 decides whether to copy a `file:` dependency from
the lockfile, not from the folder's content. Install with `--check-files` after B-1, and check that
`client-v2/node_modules/@solana-playground/rust-analyzer` holds `rust_analyzer_wasm_bg.wasm`, not only `index.js`.

```sh
yarn --cwd client-v2 install --frozen-lockfile
yarn --cwd client-v2 run check
yarn --cwd client-v2 build-fast
```

Expect: exit code 0. Tests that need a database require `DATABASE_URL` and `yarn --cwd client-v2 db-migrate`.

### B-4. server: format, lint, release build

```sh
cargo +nightly fmt --manifest-path server/Cargo.toml --check
cargo clippy --manifest-path server/Cargo.toml --all-targets -- -D warnings
cargo build --manifest-path server/Cargo.toml --release
```

Expect: exit code 0 for each.

### B-6. compose images

```sh
docker compose --profile dev build
```

Expect: the `client`, `server`, and `wasm` images build for `linux/amd64`. Verify with
`docker image inspect <image> --format '{{.Architecture}}'`, which prints `amd64`.

## 2. Client dev servers without a server

Goal: the client starts and stays usable when no build server is reachable. Only the actions that call the server fail.

Requests that need the server: `POST /build`, `GET /deploy/{uuid}`, `GET /share/{id}`, and `POST /new`. Nothing calls
the server on page load at `/`.

### C-1. client starts

Precondition: B-1 done; nothing listens on port 8080.

```sh
yarn --cwd client start
curl -sI http://localhost:3000
```

Expect:

- [ ] the page loads at `http://localhost:3000` with no console errors on load.
- [ ] response headers include `Cross-Origin-Embedder-Policy: require-corp` and `Cross-Origin-Opener-Policy: same-origin`.
      The wasm packages need both.
- [ ] the editor opens a project; rust-analyzer completions work (see S-3).

### C-2. client: actions that need the server fail cleanly

Steps: in the C-1 session, click Build, then Deploy, then Share.

Expect:

- [ ] each action shows an error in the terminal panel; the network tab shows a refused connection to
      `http://localhost:8080`. In a development build Build and Deploy target `/unstable/build` and `/unstable/deploy`;
      the connection fails before the path matters.
- [ ] the editor and terminal stay responsive after each error.

### C-3. client: share link route without a server

Steps: open `http://localhost:3000/<any-share-id>`.

Expect: an error page or message, not a blank screen.

### C-4. client-v2 starts

Precondition: `master-2.0`; nothing listens on port 8080.

client-v2 defaults its server endpoint to the remote Foundation server, not to `localhost`. To test the "no server"
case, point it at the local port:

```sh
REACT_APP_SERVER_URL=http://localhost:8080 yarn --cwd client-v2 dev
curl -s http://localhost:3000/api/health
```

Expect:

- [ ] the page loads at `http://localhost:3000`.
- [ ] `/api/health` answers (it is served by the client-v2 dev server, not the build server).
- [ ] the COEP and COOP headers from C-1 are present.

### C-5. client-v2: actions that need the server fail cleanly

Same steps and expectations as C-2, run against the C-4 session.

## 3. Full suite with Docker Compose

Precondition: P-1 done; port 3000 and 8080 free.

This section tests the stable server routes only; the unstable ones are [optional](#6-optional-unstable-server). The upstream client sends Build and
Deploy to `/unstable/*` in any build that is not a production build (`PgServer` in `client/src/utils/server.ts`), and
the compose server has no such routes, so its build and deploy cases run on the `prod` profile. client-v2 keeps the
`experimental.unstable` setting off by default, so the `v2` profile tests the stable routes.

### D-1. stack starts

```sh
docker compose --profile dev up --build
```

Expect:

- [ ] `wasm` exits 0; `db`, `server`, and `client` stay running.
- [ ] the server log shows it listening on 8080 with no MongoDB connection error.
- [ ] the client answers on `http://localhost:3000` (`PG_CLIENT_PORT` overrides the port).

### D-2. build a program

```sh
docker compose --profile prod up --build
```

Steps: open `http://localhost:3000`; in Settings, set "Build server URL" to Local (a production build defaults to
`https://api.solpg.io`); create an Anchor project and click Build.

Expect: `POST http://localhost:8080/build` returns 200 in the network tab, with no `/unstable/` in the path; the terminal
reports a successful build.

### D-3. deploy

Precondition: D-2 session; a wallet connected and funded on the selected cluster.

Steps: click Deploy.

Expect: `GET http://localhost:8080/deploy/{uuid}` returns 200; the terminal prints the program ID.

### D-4. share round trip

Precondition: D-1 session (`dev` profile). A production build always sends share requests to `https://api.solpg.io`,
so only a development build exercises the local server here.

Steps: click Share, copy the link, open it in a new tab.

Expect: `POST /new` to `http://localhost:8080` returns an ID; `GET /share/{id}` returns the same files that were shared.

### D-5. CORS

```sh
curl -sI -X OPTIONS http://localhost:8080/build -H 'Origin: http://localhost:3000' -H 'Access-Control-Request-Method: POST'
curl -sI -X OPTIONS http://localhost:8080/build -H 'Origin: https://not-allowed.example' -H 'Access-Control-Request-Method: POST'
```

Expect: the first response carries `Access-Control-Allow-Origin`; the second does not. Allowed origins come from
`PG_CLIENT_URLS` and are prefix-matched.

### D-6. client-v2 stack

Precondition: `master-2.0`.

```sh
docker compose --profile v2 up --build
```

Steps: in Settings, check that `experimental.unstable` is off and set the server to Local (client-v2 defaults to the
remote Foundation server).

Expect: `client-v2` and `postgres` run; the D-2 to D-4 steps pass against the client-v2 UI, and no request path
contains `/unstable/`.

### D-8. client-v2 standalone container

Precondition: a branch with the `client-v2-standalone` profile in `compose.yaml` (from `feat/vercel-wasm-cache`).

```sh
docker compose --profile client-v2-standalone up --build
docker compose exec client-v2-standalone sh -c 'command -v rustc cargo rustup'
```

Expect:

- [ ] the client answers on `http://localhost:3000` (`PG_CLIENT_V2_PORT` overrides the port) with no server running.
- [ ] the `exec` prints nothing: the image ships the generated crate files, not the Rust toolchain.
- [ ] S-1 and S-2 pass against this container.

## 4. Static assets: default `.rs` files and templates

None of these come from the build server. The rust-analyzer files and tutorials are static files of the client
(`client/public`, mirrored into `client-v2/public`); framework templates are bundled into the client JavaScript.

A status of `200` alone proves nothing for a crate file: the single-page-app fallback answers a missing file with
`index.html` and `200`, and Rust Analyzer then panics with `Unexpected('<')`. Every crate check below also asserts the
body is not HTML.

The client-v2 requirements for these files are the OpenSpec change `rust-analyzer-crates`, capability
`client-v2-editor-crates`, on `feat/vercel-wasm-cache`. S-1 to S-3 and S-6 to S-9 walk its manual scenarios; when the
change is archived, its spec in `openspec/specs/` is the authority and these cases follow it.

Where client-v2's crate files come from. Every path writes them to `client-v2/public/crates`, and each generator skips
when its key file there matches its inputs:

| Path | Default crates (`core`, `alloc`, `std`) | Supported crates (`anchor_lang`, …) |
| --- | --- | --- |
| `yarn --cwd client-v2 generate` (`setup`, `build`, `start`) | `generate-default-crates.mjs` | `generate-crates.mjs` (`cargo fetch` first) |
| Vercel build (S-6) | `vercel-install.sh`: Build Cache, then Remote Cache, else generated | `yarn generate` in every build, no cache |
| Docker image build (S-7) | the crates step in `client-v2/Dockerfile` | the same step |
| `yarn dev`, `build-fast` (`generate-fast`) | not generated | not generated |

Run S-1 to S-3 against a dev server only after `yarn --cwd client-v2 generate`: `yarn dev` serves whatever an earlier
run left in `public/crates`.

### S-1. rust-analyzer default crates

```sh
curl -s http://localhost:3000/crates/core.rs | head -c 200
curl -s http://localhost:3000/crates/alloc.rs | head -c 200
curl -s http://localhost:3000/crates/std.rs | head -c 200
```

Expect: Rust source for each, not `<!doctype html>`.

Known gap: on `master` and `master-2.0` nothing generates these three, so each request returns `index.html` or a
`404`, depending on the server. The
generator, `client-v2/scripts/generate-default-crates.mjs`, is on `feat/vercel-wasm-cache` until that change merges.

### S-2. rust-analyzer supported crates

```sh
curl -s http://localhost:3000/crates/anchor_lang.rs | head -c 200
curl -s http://localhost:3000/crates/anchor_lang.toml | head -c 200
```

Expect: Rust source and TOML, not HTML. The same holds for every crate in [supported-crates.json](../supported-crates.json)
and its proc-macro dependencies, named in snake case, except `mpl-token-metadata`.

### S-3. rust-analyzer in the editor

Precondition: real wasm packages (B-1), not the stubs.

Steps: create an Anchor project and open `src/lib.rs`, then:

1. open the browser console;
2. type `let v = Vec::` and ask for completion;
3. write `std::array::from_fn`;
4. type `Pubkey::find_` and ask for completion;
5. hover over `Context`, `Account`, and `Signer`.

Expect:

- [ ] no Rust Analyzer panic in the console, such as `Parse(Error { … Unexpected('<') … })` from `world_state.rs`.
- [ ] `Vec::` offers `capacity` and `clear`.
- [ ] `std::array::from_fn` resolves (stabilised in Rust 1.63, so it proves the default crates are not older).
- [ ] `Pubkey::find_` offers `find_program_address` with its signature and documentation.
- [ ] each hover shows the definition.

While S-1 fails, steps 2 and 3 are expected to fail.

To prove the completions come from the generated files: move `client-v2/public/crates/{core,alloc,std}.rs` aside,
reload, and repeat steps 2 and 3. Expect only plain word suggestions from the open file, no `capacity` and no
`from_fn`. Move the files back.

### S-4. framework templates

Steps: create a new project for each framework: Anchor, Native, and Seahorse.

Expect: each project opens with the files from `client/src/frameworks/<framework>/files`; D-2 builds each one when the
server is running.

### S-5. tutorials

Steps: open `/tutorials`, pick a tutorial, open its first page.

Expect: the content renders; `/tutorials/<name>/content.json` returns `200` (generated by `yarn generate`).

### S-6. crate files in a Vercel build

Precondition: a preview deployment of a branch with `generate-default-crates.mjs`; the Vercel CLI version pinned as
`VERCEL_CLI` in `client-v2/Makefile.vercel`; a Protection Bypass for Automation secret from the project settings in
`VERCEL_BYPASS` (never in this file).

```sh
npx vercel@<version> inspect <deployment URL> --logs --scope hoodies \
  | grep -E 'default crates:|Default crates are current|Crates are current|generate-crates|not found'
curl -s -H "x-vercel-protection-bypass: $VERCEL_BYPASS" <deployment URL>/crates/std.rs | head -c 200
curl -s -H "x-vercel-protection-bypass: $VERCEL_BYPASS" <deployment URL>/crates/anchor_lang.toml | head -c 200
```

Expect:

- [ ] the install log shows `default crates: HIT in Build Cache`, `HIT in Remote Cache`, or `MISS … generating`
      followed by `core`, `alloc`, and `std`.
- [ ] the `yarn generate` log shows every supported crate generated and `Default crates are current … Skipping...`.
- [ ] no line contains `not found`: `generate-crates.mjs` fails the build on a missing supported crate.
- [ ] both `curl`s print Rust source and TOML, not `<!doctype html>`.
- [ ] S-3 passes on the preview (open it once with `?x-vercel-protection-bypass=<secret>&x-vercel-set-bypass-cookie=true`).

A miss on the default crates adds about 2 minutes to the build; a hit adds none. The supported crates add about
20–30 seconds to every build.

### S-7. crate files in a Docker image build

Precondition: P-5.

```sh
docker compose --profile client-v2-standalone build --progress=plain 2>&1 \
  | grep -E "name: '(core|alloc|std|anchor-lang)'|Could not find Rust|not found"
docker compose --profile client-v2-standalone up -d
docker compose logs client-v2-standalone | grep -E 'Default crates are current|Crates are current'
docker compose exec client-v2-standalone sh -c 'ls public/crates/core.rs public/crates/.default-crates-key public/crates/.crates-key'
```

Expect:

- [ ] the image build generates `core`, `alloc`, `std`, and the supported crates, and prints neither
      `Could not find Rust` nor `not found`.
- [ ] at start, both generators report their crates current and skip.
- [ ] the three files exist in the container; D-8's `exec` prints nothing.

### S-8. crate files are the same everywhere

Precondition: S-6 and S-7 run on the same commit; `yarn --cwd client-v2 generate` run locally on it.

```sh
for f in core.rs alloc.rs std.rs core.rs.br anchor_lang.rs anchor_lang.toml versions.json; do
  echo "$f local=$(shasum -a 256 client-v2/public/crates/$f | cut -c1-16)" \
    "vercel=$(curl -s -H "x-vercel-protection-bypass: $VERCEL_BYPASS" <deployment URL>/crates/$f | shasum -a 256 | cut -c1-16)" \
    "docker=$(curl -s http://localhost:3000/crates/$f | shasum -a 256 | cut -c1-16)"
done
```

Expect: the three hashes agree on every line. The generators pin their inputs (the toolchain in
`wasm/rust-analyzer/rust-toolchain.toml`, the `syn-file-expand-cli` versions, `server/programs/Cargo.lock`, and the
brotli version bundled with Node), so macOS, Vercel's builder, and the Docker image produce the same bytes.

### S-9. crate generators locally

Precondition: Node from `client-v2/.nvmrc` (`generate-default-crates.mjs` refuses another major); `rustup` installed.
An empty `CARGO_HOME` reproduces a fresh machine and Vercel's builder; use a folder of your own, not `/tmp`.

```sh
export CARGO_HOME=<empty folder>
rm -f client-v2/public/crates/.crates-key client-v2/public/crates/.default-crates-key
yarn --cwd client-v2 generate-default-crates
yarn --cwd client-v2 generate-crates
ls client-v2/public/crates/{core,alloc,std}.rs* client-v2/public/crates/.default-crates-key
yarn --cwd client-v2 generate-default-crates
yarn --cwd client-v2 generate-crates
```

Expect:

- [ ] the first `generate-default-crates` prints `core`, `alloc`, and `std` with their toolchain, Node, and brotli
      versions; the first `generate-crates` runs `cargo fetch`, then prints every supported crate and never `not found`.
- [ ] the `ls` lists all seven default-crate files (`core.rs`, `alloc.rs`, `std.rs`, their `.rs.br` copies, and
      `.default-crates-key`): `generate-crates` empties `public/crates` but keeps them.
- [ ] the second runs print `Default crates are current … Skipping...` and `Crates are current … Skipping...`.

A changed input regenerates. Run `yarn --cwd client-v2 generate-default-crates --key`, change `channel` in
`wasm/rust-analyzer/rust-toolchain.toml`, and run it again: the key differs, and the generator runs instead of
skipping. Restore the file.

## 5. Release gate: unstable stays out of production

The server's unstable functionality must not reach production until it is tested on its own. Run these before every
production deploy of the server or the clients. A failure blocks the deploy.

### R-1. production server image builds without unstable

App Engine deploys the server from [server/Dockerfile](../server/Dockerfile) (`deploy_server` in
[cicd.yml](../.github/workflows/cicd.yml)).

```sh
grep -n 'unstable' server/Dockerfile server/app.yaml .github/workflows/cicd.yml
grep -n -A3 '^\[features\]' server/Cargo.toml
```

Expect: the first command prints nothing; `[features]` has no `default` entry that includes `unstable`.

### R-2. deployed server has no unstable routes

```sh
curl -s -o /dev/null -w '%{http_code}\n' -X POST <production server URL>/unstable/build
curl -s -o /dev/null -w '%{http_code}\n' -X POST <production server URL>/build
```

The production server URL is `FOUNDATION_ENDPOINT` in `client-v2/src/settings/server/default-endpoint.ts`.

Expect: `404` for `/unstable/build`; anything but `404` for `/build`, which proves the URL is right.

### R-3. production clients use the stable routes

- [ ] client-v2: `experimental.unstable` defaults to `false`. `src/settings/experimental/experimental.test.ts` guards
      this, so B-3 covers it.
- [ ] upstream client: a production build sends Build and Deploy to the stable routes (`PgServer` in
      `client/src/utils/server.ts`); D-2 covers it.

## 6. Optional: unstable server

Run these only when testing the unstable functionality on purpose. They never gate a release; section 5 does.

The compose `server` image is built without `--features unstable` and has no `docker` binary, so no profile runs the
unstable server. It runs as a native binary instead. This is the one exception to P-4.

### U-1. unstable build

```sh
cargo build --manifest-path server/Cargo.toml --release --features unstable
```

Expect: exit code 0; binaries `solpg-server`, `build-program`, and `bundle` in `server/target/release/`.

### U-2. unstable routes

Precondition: U-1 done; the P-1 Darwin export in the same shell; MongoDB reachable at `PG_DB_URI` (the compose `db`
service publishes no port).

```sh
PG_PORT=8081 server/target/release/solpg-server
```

Run it from `server/` so it finds `templates/` and `images/`. `PG_PORT` avoids a clash with the compose server.

Steps: point a client at `http://localhost:8081`; in client-v2, turn `experimental.unstable` on. Build a program, then
bundle a package.

Expect:

- [ ] start-up builds one `program-<template>` image per directory in `server/templates/` and a bundle image. A cold
      build takes several minutes.
- [ ] `POST /unstable/build` and `POST /unstable/bundle` return 200.

Known issue: `sandbox.rs` clears the environment before `docker exec`, which drops `PATH`; on macOS the bundle route
then fails with "No such file or directory". Linux is unaffected.

### U-3. sandbox templates

Precondition: U-2 server running.

```sh
docker images --format '{{.Repository}}' --filter 'reference=program-*'
```

Expect: one image per directory in `server/templates/`.
