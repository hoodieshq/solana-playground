## Client

This is the main application of Solana Playground.

## Setup

For the initial setup, run:

```sh
yarn setup
```

Start the dev server:

```sh
yarn start
```

### Fresh clone or new worktree

`wasm/*/pkg` and `public/` are both gitignored, so a checkout that has never been
built needs the WASM stand-ins before `yarn install` will resolve its local file
dependencies:

```sh
bash ../wasm/stub-packages.sh   # placeholders; the real WASM build takes ~1h
yarn install
yarn start
```

`public/` is mirrored from the `client/public` submodule, and `yarn start` /
`yarn build` refresh it automatically. Run `make update-static` by hand only
after bumping that submodule to change asset content.

Worktrees are supported: the mirror is always copied from the *primary*
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
