# Port upstream's demo-path changes into `client-v2`

**Date:** 2026-09-08 · **Status:** design, implementing on
`feat/upstream-demo-path` off `master-2.0` · **Decision:** D37 (the
default of the unstable switch) · **Estimate on the roadmap:** ~0.5 d ·
**Roadmap slot:** week 1, "Three upstream demo-path commits"

## The problem

`client-v2` is a copy of upstream's `client/` taken at `849670c7`
(2026-08-05). `master-2.0` carries `client/` at `57479351`
(2026-08-27): 24 upstream commits ahead, none of them in `client-v2`.
The roadmap's *Upstream drift* section names three that land on the
demo path, and this port takes exactly those three, with the small
commits they depend on:

1. **`packages` became `bundle`.** `server/src/routes/` in this tree has
   no `packages.rs` and no `types.rs`; `client-v2/src/utils/server.ts`
   still calls `/unstable/packages/:name` and `/unstable/types/:name`.
   A server built from this tree cannot answer the client in this tree.
2. **SIMD-0431 during upgrades.** Upstream added
   `MINIMUM_EXTEND_PROGRAM_BYTES` and folds it into the length
   arithmetic of a redeploy. Redeploying after a patch is the demo's
   own scenario, and once the feature gate activates a too-small
   `extendProgram` is rejected on-chain.
3. **Sandboxed non-production routes.** Upstream sends `/build`,
   `/deploy` and `/bundle` through `/unstable/...` outside production,
   which is where the server's sandboxing lives. `client-v2` lost the
   option in the copy.

Two facts checked on 2026-09-08 change how the third item is taken:

- **Neither hosted build server enables the `unstable` feature.** The
  Foundation's App Engine server and `api.solpg.io` both answer 404 to
  `/unstable/packages/*`, `/unstable/types/*`, `/unstable/build` and
  `/unstable/bundle`. So today, outside production, `client-v2`'s test
  runtime cannot import an importable package and Monaco cannot fetch
  package types against any server this team uses: both take the
  `/unstable/...` branch and get a 404. They work only in production
  builds, where the static path under `public/packages/` is taken.
- **The default manifest the bundle needs already exists.** The assets
  submodule at `1098ecfa`, which `master-2.0` pins for `client/public`,
  carries `frameworks/package.json` and `frameworks/yarn.lock`;
  `make update-static` mirrors them into `client-v2/public`. No repo
  change, but the primary checkout's submodule is stale at `df14c26e`
  (`git status` shows `M client/public`) and needs
  `git submodule update`.

## Scope

**Ported**, oldest first, by upstream hash (all in `master-2.0`'s
`client/` unless marked):

| Hash | Upstream subject | Why it is in |
| --- | --- | --- |
| `3e72bea6` | Replace `packages` route with `bundle` | item 1 |
| `fdbf8040` | Fix package import template | item 1 |
| `346adeae` | Use a constant for the internal workspace directory | `PgJsPackage` reads `PgExplorer.PATHS.WORKSPACE_DIRNAME` |
| `21f8645b` | Add type declaration files to the `bundle` route response | item 1, the `types` half |
| `1dbb78a2` | Create a lazy-loadable entrypoint for each package in `/bundle` | item 1 |
| `4c4224a2`, `8f4d7567` | Show package installation duration; fix fractions | `pm install` output; one line in `PgCommon.formatSeconds` |
| `af1130cf` | Always install fresh in `PgJsPackage.install` | item 1 |
| `837732bc` | Fix recursively removing directories when the input path doesn't end with `/` | `install` removes the previous bundle recursively; without this the removal walks the wrong paths |
| `4e7a933b` | Account for SIMD-0431 during program upgrades | item 2 |
| `dd1bafd6` | Fix unnecessarily resizing during program upgrades | item 2, same function |
| `ef8ba918` | Fix standard wallet deployment transfer confirmation balance check | item 2, same file; the check compared SOL to lamports |
| `57479351` | Send non-DB server requests to unstable routes on non-prod environments | item 3 |
| `876fa552` (**not yet in `master-2.0`'s `client/`**, 2026-09-07) | Add `experimental.unstable` setting | item 3, the shape we take: a setting, not `NODE_ENV` -- see *The switch* |

**Not ported**, on purpose, and left for the week-4 upstream sync:

- `c21be53c` renames `PgPackage` to `PgWasmPackage` across nine files
  including `commands/build/build.ts`, the hot file D4 edits. A rename
  with no behaviour behind it is not worth a conflict there.
- `6948a6f4` `PgCompression` refactors `framework.ts`; nothing in the
  port depends on it.
- `82766e9b` "Suggest solutions for common build errors" is upstream
  starting on what the assistant sells -- input for the Foundation
  conversation, not a merge task (roadmap, *Upstream drift*).
- The `/error` route, the `Approve` wallet modal removal, the
  `withoutPreSlash` cleanup, and the rest of the 24.

## Design

### `PgServer` (`utils/server.ts`)

Upstream's file, taken whole: `packages()` and `types()` go,
`bundle(req)` arrives (`POST /bundle` with `{ manifest, lock }`,
answering `{ bundle, types, manifest, lock }` as tuple files), `_send`
gains an `unstable` option that prefixes the path with `unstable/`, and
`build` and `deploy` pass it. The one edit on top of upstream: the
`unstable` flag reads `PgSettings.experimental.unstable` (876fa552's
shape) instead of `process.env.NODE_ENV`.

### `PgJsPackage` (`utils/js-package.ts`, new)

Upstream's file verbatim. `install()` posts the project's
`package.json` and `yarn.lock` (or the framework defaults from
`/frameworks/`) to `bundle`, wipes `.workspace/js-packages`, writes the
resolved manifest and lock back to the project root, and writes one
`bundle.js` per package, its chunk files, `types.json` and
`dependencies.json` under `.workspace/js-packages`. `import(name)` loads a package's bundle
through a Blob URL and picks the module by its normalised name;
`importChunk` is exposed on `window.__pgImportChunk` because the
server-generated bundles lazy-load their chunks through it.
`getTypes(name)` reads the two JSON files. `PgExplorer.PATHS` gains
`WORKSPACE_DIRNAME`, and `program-info.ts` and `tutorial/tutorial.ts`
use it, as upstream does.

### `pm install` (`commands/package-manager/`, new)

Upstream's command verbatim. `generate-exports` discovers the directory,
so no registry edit.

### Callers

- `scripts/package-import-template.ts.raw` (the source of the generated
  `js-runtime/package.ts`): `PgJsPackage.import(name)` instead of
  `PgServer.packages(name)`, and the branch is chosen by the setting.
- Monaco `declarations/helper.ts`: `PgJsPackage.getTypes` instead of
  `PgServer.types`, same branch rule.

### Deploy (`commands/deploy/deploy.ts`, `utils/web3/bpf-loader-upgradeable.ts`)

Upstream's three commits, with one fork edit. Upstream's
`getAdditionalLen(programLen)` reads `PgProgramInfo.onChain` and does
the arithmetic in one function inside `deploy.ts`, which cannot be
unit-tested without the whole deploy module. The arithmetic moves to
`commands/deploy/additional-len.ts` as a pure
`additionalProgramLen({ programLen, deployed, onChainLen })`, and
`deploy.ts` keeps a two-line `getAdditionalLen` that reads the on-chain
info and delegates -- the shape the merge-safety rule asks for in a hot
file. `MINIMUM_EXTEND_PROGRAM_BYTES = 10_240` lands on
`PgWeb3.BpfLoaderUpgradeableProgram` as upstream has it, since the
pure function reads it from there.

The `ef8ba918` fix: the transfer-confirmation callback compared
`PgWallet.balance` (SOL) with a lamports difference; it now converts.

### The switch: `experimental.unstable` (D37)

A boolean setting in a new `settings/experimental/` group, discovered by
`generate-exports`. Read by `PgServer.build/deploy/bundle`, by the
package template and by the declarations helper -- everywhere upstream
reads it after 876fa552.

**Default: `false`, in every environment.** Upstream defaults it to
`NODE_ENV !== "production"`. This fork's documented development flow
builds against a hosted server (CLAUDE.md, "No backend needed"), and
no hosted server has the `unstable` routes; with upstream's default
every `yarn dev` build would answer 404 until the developer found the
setting. With `false`, nothing a developer does today changes, and the
package import and the type declarations *start* working in
development, because the static production path is taken. Running a
local server built with `--features unstable` and turning the setting
on is the deliberate pair that reaches the sandboxed routes and the
bundle. Recorded as D37.

### `PgFs.removeDir` (`utils/explorer/fs.ts`)

`837732bc` verbatim: child paths are joined with `PgCommon.joinPaths`
instead of string concatenation, so the recursive removal does not
depend on the caller's trailing slash.

## Interactions with open pull requests

- **#22 (`/api/build` proxy).** Its allowlist names
  `GET /unstable/(packages|types)/:name`, which no client asks for after
  this port. It does not need `/bundle`: with the switch off the client
  never sends it, and with the switch on the path is
  `/unstable/bundle`, which no hosted server has. Whichever of the two
  lands second drops the dead entries. No file overlap.
- **#20, #24, #26, #25, #21.** No file overlap (checked by name on
  2026-09-08).

## Testing

New unit tests, beside the code they cover:

- `utils/server.test.ts` -- `_send` joins `unstable/` in front of the
  path when asked and not otherwise; `bundle` posts the request body to
  `/bundle`; `build`, `deploy` and `bundle` follow the setting.
- `utils/js-package.test.ts` -- `install` clears the previous bundle
  and writes manifest, lock, every bundle chunk and every types file
  under `.workspace/js-packages`; `install` falls back to the framework
  defaults when the project has no manifest; `getTypes` reads both
  files; the module-name normalisation matches the server's rule.
  `PgExplorer.fs` is replaced by an in-memory fake.
- `commands/deploy/additional-len.test.ts` -- not deployed is 0; exact
  fit is 0; surplus is negative and never rounded up; a shortfall
  smaller than the minimum becomes the minimum; a shortfall above it is
  itself; a missing on-chain length throws.
- `settings/experimental/experimental.test.ts` -- the default is
  `false` under both `NODE_ENV` values.
- `utils/explorer/fs` is exercised through the `js-package` fake only;
  the real `lightning-fs` needs IndexedDB, which jsdom lacks.

By hand, against `yarn dev`: a build with the switch off goes to
`/build` on the chosen server and succeeds against the Foundation
server; with the switch on it goes to `/unstable/build` and the 404 is
reported as a build failure, not swallowed. `pm install` with the
switch off says the server has no `/bundle`. The sandboxed routes and
the bundle themselves cannot be exercised here: they need a server
built from this tree with `--features unstable`, which on this machine
is an hour of amd64 emulation.

## Not here

- Wiring `pm install` into Flow or the assistant. The command exists in
  the terminal as upstream ships it.
- The `PgPackage` rename and the rest of the 24 commits (week 4).
- Updating PR #22's allowlist -- that branch belongs to its own
  session; the note above is the hand-off.
