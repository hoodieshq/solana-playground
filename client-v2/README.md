## Client

This is the main application of Solana Playground.

## Setup

`wasm/*/pkg` and `public/` are both gitignored, so a fresh clone or a new
worktree has never built them. `yarn install` cannot resolve the local `file:`
dependencies until `wasm/*/pkg` exists, which leaves two paths.

**UI work (seconds).** Write placeholder WASM packages, no Rust toolchain needed:

```sh
bash ../wasm/stub-packages.sh
yarn install
yarn start
```

You lose Rust intellisense and the `solana`, `anchor`, `spl-token` and `sugar`
terminal commands plus Seahorse builds. The UI, Monaco, rustfmt, Playnet, the
wallet, and Rust program builds via the build server all keep working.

**Full setup (~1h).** Compile the WASM packages from Rust, then install and
generate:

```sh
yarn setup
yarn start
```

`yarn setup` rebuilds `wasm/*/pkg` unconditionally, so running it after
`stub-packages.sh` replaces the stubs with the real packages.

**Planning tools (once per machine).** Specs and change proposals are
managed with [OpenSpec](https://openspec.dev). The CLI is global, not a
project dependency:

```sh
npm i -g @fission-ai/openspec@latest   # or: brew install openspec
openspec --version                     # 1.14.0 or newer
```

Without it the `/opsx:*` commands in Claude Code stop at "CLI not found";
the `spec:validate` script still works, because `client-v2` pins the same
package as a devDependency for CI. The rules for contributors and agents are in
[`CLAUDE.md`](CLAUDE.md); the specs are in [`../openspec/`](../openspec/README.md).

### Checks

`yarn check` runs what CI runs, in CI's order, minus the production build:
`test-types`, `check-format`, `lint`, `spec:validate`, `spec:archived`,
`test-unit`, `test-api`. Run it before a push, or make git do it:

```sh
git config core.hooksPath .githooks   # once per clone; runs `check` on pre-push
```

`spec:validate` runs the OpenSpec CLI pinned in `devDependencies`, so its
verdict is the one CI sees whatever version is installed globally.

### Static assets and worktrees

`public/` is mirrored from the `client/public` submodule, and `yarn start` /
`yarn build` refresh it automatically. Run `make update-static` by hand only
after bumping that submodule to change asset content.

Worktrees are supported: the mirror is always copied from the _primary_
checkout, so a worktree never initialises a submodule of its own. (A submodule's
git dir is shared via `.git/modules`, so initialising one in a second worktree
detaches it in the first — which is why `public/` is not a submodule here.)

## Docker

Run client-v2 together with the build server via [Docker Compose](https://github.com/docker/compose):

```sh
docker compose -f ../compose.yaml --profile v2 up --build
```

The client is served on `http://localhost:3000` (override with
`PG_CLIENT_V2_PORT`) and the build server on `http://localhost:8080`.

For a production build served statically, use the `v2-prod` profile instead.

The `dev`, `prod` and `client-standalone` profiles build the upstream `client/`,
not this one. See the [root README](../README.md#run-with-docker).

## Deployment

For Vercel deployment instructions, see [Deploy client to Vercel](docs/deploy-client-vercel.md).
