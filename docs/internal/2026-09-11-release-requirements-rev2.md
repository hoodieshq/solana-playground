# Playground September Release - Rev 2, 2026-09-11

The release requirements document as it stands. Authored on our side
(Sergey edited the original proposal straight after the 11 Sep call with
Cat) and shared with the customer as a PDF; this is that PDF rendered to
markdown so it can be grepped, diffed and cited. It supersedes the 10 Sep
revision.

**The PDF itself is not in the repository.** It lives in Slava's
`Downloads` as `Playground September Release Rev 2.pdf` and in the Slack
thread of 11 Sep. Copying it in was refused by the sandbox as a
sensitive-source file; this rendering carries every item, priority and
open question it contains, so nothing depends on the binary.

Read this together with `2026-09-11-call-notes-cat.md`, which records
what the call itself changed - including three answers that arrived
*after* this document was written and therefore contradict it.

---

## What the document says at the top

> Anchor 1.2 on a new Cloud Run backend, AI across the app with history
> that follows the user, Kora deploys to devnet and testnet, sharing
> through GitHub, and Foundation-owned infrastructure.

Dates and targets on the cover: **Phase 1 ships Mon 21 Sep** (20 Sep is a
Sunday) - `anchor 1.2.0` (upstream is on 1.1.2, our fork on 0.29) -
`kora-deploy 0.2.0`, devnet paymaster live - Cloud Run replaces App
Engine flex.

### TLDR, marked "decided on the call"

- **Two phases.** Phase 1 ships Mon 21 Sep. The client generator, the
  seeds generator on 1.x IDLs, TypeScript intelligence, mainnet deploys
  and the full upstream sync go to Phase 2.
- **Anchor 1.2 is added, not swapped in.** `legacy` (0.29) and
  `anchor-1.1.2` stay selectable. The mechanism and 1.1.2 already exist
  on `feat/rust-analyzer-lsp`, alongside the Rust LSP - landing that
  branch comes first.
- **The backend moves to Cloud Run.** It is App Engine flex today
  (`server/app.yaml`, `env: flex`). Needs Cloud Run access.
- **Kora deploys devnet and testnet.** The local cluster deploy is a
  separate feature and never touches the paymaster.
- **Mainnet is postponed** - Kora's mainnet paymaster needs a Jupiter API
  key we do not have.
- **AI chat history goes server-side in Phase 1**, so one conversation
  follows a user from desktop to phone. The only new infrastructure in
  the release, and the reason Decision 2 is urgent.
- **Sharing moves to GitHub.** The server has no database, so DB-backed
  share links are gone and are not being restored.
- **The design is good enough.** Everything in section F drops to P1
  except the phone layout, which cross-device history requires.

### Access needed before most of Phase 1 can start

Google Cloud Run - Maintain on the repo - a database for chat history
(Supabase or the Foundation's managed Postgres, still to pick) - RPC
provider keys for devnet, testnet and mainnet - GCP Secret Manager - a
Google Analytics property - a Jupiter API key (Phase 2, but a purchase,
so lead time starts now).

---

## Phase 1, ships Mon 21 Sep

### A - Backend: Anchor 1.2 on Cloud Run

The server runs on App Engine flex today: `server/app.yaml` is
`runtime: custom`, `env: flex`, 4 vCPU and 16 GB, pinned to one instance.
Cloud Run replaces it, carrying the Anchor templates from section B and
the LSP endpoint. Nothing here can be configured before we hold Cloud Run
access.

- **P0 Cloud Run service that carries more than one toolchain.** The
  build image is one Dockerfile pinned to Solana 1.17.34
  (`server/images/Dockerfile.program`). The 1.2 target needs Solana
  3.1.10 and Rust 1.89.0, so the service must resolve a toolchain per
  project rather than bake one in. The learning shell builds here.
- **P0 WebSocket LSP endpoint for server-side rust-analyzer.** The server
  bridges a WebSocket to rust-analyzer inside the template image. A
  setting picks the backend: this one, or the in-browser WASM analyzer.
  Which one a 1.2 project defaults to decides whether the crate-source
  work below is needed at all. Cloud Run supports WebSockets but caps
  request duration, so a session is a long-lived request with a hard
  ceiling - needs reconnect handling and an idle-timeout decision. Rust
  only; the TypeScript gap is Phase 2.
- **P0 App Engine keeps serving the current interface until the
  cutover.** The 0.29 service stays up while the new one is proven, then
  retires. No longer kept for old share links - those are going away
  regardless.
- **P1 Retire App Engine once Cloud Run is stable.** One runtime, one set
  of secrets. Carry the `PG_CLIENT_URLS` prefix list and the
  build-concurrency sizing across; `cargo-build-sbf` peaks near 3.7 GB
  and one core per build.

### B - Anchor and libraries: 1.2 as an added toolchain

The toolchain and the Rust intelligence are one piece of work.
`feat/rust-analyzer-lsp` bridges a WebSocket to rust-analyzer running
inside the template image, so the language server and the Anchor version
it reasons about ship together. That branch already carries the template
mechanism in `server/src/templates/`: `legacy` is 0.29; `anchor-1.1.2`
pins Solana 3.1.10 and Rust 1.89.0, installs Anchor through `avm` from
the otter-sec fork, and takes the IDL from `anchor idl build` rather than
the 0.29 `anchor-syn` parser. It is 14 commits ahead of `master-2.0` and
27 behind.

Anchor 1.2.0 was released 4 Sep. Its TypeScript client is
`@anchor-lang/core` and still uses web3.js v1. Anchor 2.0 is a release
candidate with no real changes over 1.2; not a target.

- **P0 Land `feat/rust-analyzer-lsp` on `master-2.0`.** Everything else
  in this section, and the Rust intelligence in section A, sits behind
  it. The unknown is the rebase; the feature work is done.
- **P0 Add Anchor 1.2.0 as a further template, not a replacement.**
  Mirrors the 1.1.2 template: `avm install`, then `anchor build --no-idl`
  followed by `anchor idl build`. rust-analyzer picks up 1.2 from the
  same image. Open: whether 1.2 still needs the otter-sec `avm` fork, and
  which Solana and Rust versions it pins.
- **P0 Client reads 1.x IDLs.** Both clients are on `@coral-xyz/anchor`
  `^0.29.0` today, the LSP branch included. Upgrade to
  `@anchor-lang/core` 1.2.0, `@solana/web3.js` 1.99.0,
  `@solana/spl-token` 0.4.15, and keep reading 0.29 IDLs for legacy
  projects. The test UI and Program Pal's instruction list depend on it.
  So does the seeds generator, which is deferred.
- **P0 All examples and tutorials compile and run on 1.2.** Check for
  duplicate mutable accounts (now require `dup`) and `AccountInfo` in
  account structs.
- **P1 Decide whether the in-browser analyzer still needs 1.2 crate
  sources.** `client-v2/public/crates/` ships 2.8 MB of flattened Rust
  sources pinned to anchor-lang 0.29.0, which on a 1.2 project would
  underline valid syntax as errors. The server-side LSP has no such
  problem. If 1.2 projects default to the LSP backend this work
  disappears; if not, regenerate the bundle for 1.2 or mute diagnostics
  on 1.2 projects.
- **P1 Pre-cache requested crates in the 1.2 image.**
  `switchboard-on-demand`, `pyth-solana-receiver-sdk`, `mpl-core`,
  `solana-security-txt`. Only those that compile against 1.2 and Solana
  3.x - the jump from 1.17.34 is the bigger filter.

### C - Deploys: Kora, and the local cluster

Two independent paths sharing no code beyond the deploy UI. Kora covers
devnet and testnet only. The paymaster at `deployer.devnet.solana.com`
(live, CORS open as of 10 Sep) pays rent and holds upgrade authority, so
a user deploys with 0 SOL. `kora-deploy` is a Rust crate and Playground
deploys from the browser, so its flow is ported to TypeScript:
`getPayerSigner`, create buffer, write 900-byte chunks, deploy, register
the wallet. Surfpool stays the default network.

Through Kora, devnet and testnet:

- **P0 Settle who builds the Kora integration, this week.** Acheron may
  already have it in progress. See Decision 1.
- **P0 Deploy to devnet through Kora.** Action in the program strip and
  `deploy --devnet` in the terminal. Works with 0 SOL. Prints program id
  and Explorer link. The play wallet is registered as owner so redeploys
  upgrade in place.
- **P0 Deploy to testnet.** Same flow against the testnet paymaster.
- **P0 Persist the devnet program id and handle reaping.** The paymaster
  closes programs idle for 7 days. If the program-data account is gone,
  deploy fresh and tell the user.
- **P0 Stable user id and correct controls.** Rate limits bucket by
  `user_id`; derive it from the session token rather than a random id per
  run. Hide set-authority and close for paymaster-managed programs. State
  the 7-day limit in the post-deploy message.
- **P0 Confirm deployer rate limits and captcha enforcement with the Kora
  team.** The endpoint advertises an `x-recaptcha-token` header and runs
  a beta build.
- **P1 Error mapping and tutor awareness.** Plain messages for paymaster
  rejections and rate limits; the tutor's `deploy_program` tool reports
  the network result and the reaping date.

Local cluster, no paymaster involved:

- **P0 Keep the local cluster deploy.** The user's own wallet, no
  paymaster, no rate limits, no reaping. Ships whatever happens to the
  Kora decision.
- **P1 Check whether the Kora deploy flow can be reused here.** The
  ported flow is network-agnostic under the paymaster layer. Either
  answer keeps the local deploy; only the amount of shared code changes.

### D - AI everywhere

The tutor exists only in the learning shell today and calls the OpenAI
Responses API with a server-held key. Default becomes a hidden key for an
open-weight model - the key is in hand, so this is configuration, not
procurement. Bring your own key is OpenAI only. History moves to the
server this phase; it needs a database and a durable identity, neither of
which the backend has today.

Tutor:

- **P0 Hosted default key for the open-weight model.** Server config:
  `PG_AI_BASE_URL`, `PG_AI_MODEL`, `PG_AI_API_KEY`. Any OpenAI-compatible
  endpoint. Existing per-session and global daily caps stay.
- **P0 Tutor runs on Chat Completions with caller-held history.**
  Open-weight servers generally do not implement the Responses API or
  `previous_response_id`, so the full transcript goes up with every
  request. One code path serves the hosted model and OpenAI.
- **P0 AI enabled automatically when a key is available.**
  `GET /ai/status` reports availability. If available, all AI surfaces
  mount with no setup; if not, settings show a prompt to add an OpenAI
  key.
- **P0 Bring your own OpenAI key.** Settings `ai.openaiKey` and
  `ai.model`, stored in the browser only, sent as a request header,
  forwarded per request, never logged or stored server-side. Bypasses the
  hosted quota. Never in the bundle or a `REACT_APP_*` variable.
- **P0 AI in the IDE view, not only the learning shell.** Program Pal as
  a sidebar view and an Explain button on build errors. Move `useTutor`
  and the patch flow out of `views/flow` so both routes share them.
- **P1 Editor entry points.** Explain selection and Fix with AI in the
  context menu, producing a reviewable patch. These carry the selection
  as context, which the chat panel has no way to get.
- **P1 `ai <prompt>` in the terminal.** Whether it is needed at all, and
  in which phase, is Decision 5.
- **P1 Test UI helpers.** Fill sample arguments from the IDL. Explain a
  failed transaction from its logs.

History and sessions - new backend work:

- **P0 Database provisioned and Foundation-owned.** Agreed. Which
  provider is Decision 2, the most urgent answer in the release.
  Reachable from Cloud Run, credentials in Secret Manager. Nothing else
  in this group starts until it exists.
- **P0 Durable user identity.** History belongs to a person, not a
  browser. Reuse the GitHub sign-in section E already needs. Not the
  session token that buckets Kora rate limits - that one is per-session
  by design, this one survives across devices.
- **P0 Conversations stored and served per user and project.** Read the
  transcript on load, append each turn. Signed-out users keep
  browser-held history so the tutor still works without an account.
- **P0 Continue a desktop conversation on a phone.** The acceptance test
  for this group, and why the phone layout in section F is P0.
- **P1 Import, retention and caps.** Pull browser-held conversations in
  on first sign-in. Per-user size caps and a retention window.

### E - Sharing through GitHub

The server has no database, so DB-backed share links do not work and are
not being restored. A project is a repository or gist, and the link is
its URL. The `/{shareId}` route in `client-v2/src/routes/share/` becomes
dead and should go with it.

- **P0 Share a project to GitHub and open one from a URL.** Export to a
  gist or repo, import back from the URL. Uses the existing GitHub
  sign-in. No server state.
- **P1 Tell users what happened to old share links.** A short message on
  a dead share URL rather than a blank project.

### F - Design pass

The current design is acceptable, so most of this is a tidy-up. Only the
phone layout blocks the 21st. Where to look: `client-v2/src/themes/`
(`create.ts` builds a theme; five exist - `solana-v2` 358 lines,
`solana` 234, `playground` 205, `light` 188, `dracula` 129),
`client-v2/src/views/flow/` (its own `tokens.ts`, 19 lines),
`client-v2/src/views/sidebar/`, and
`components/Markdown/Markdown.tsx`, which holds over half of the roughly
60 literal hex values outside the theme layer.

Rev 1 pointed at a `LearningShell.styles.ts` of 1,889 lines. No such file
exists on any branch, and the colour sprawl is far smaller than that
implied.

- **P0 Phone layout.** Tutor usable on a phone, editor read-only below
  600px. P0 because section D ships cross-device chat history.
- **P1 Tokens and a new default theme.** Spacing, radius, type scale and
  elevation in `themes/create.ts`; pull the remaining literal colours in.
- **P1 Shell and IDE chrome.** Header, New menu, tutor panel, action
  strip, wallet; then sidebar, tabs, bottom bar and terminal. Mockup
  reviewed before styling.
- **P1 First run and status indicators.** New visitor lands in a running
  example in one click. Indicators for AI, network and rust-analyzer
  readiness.

### G - Foundation-owned infrastructure

All accounts must be Foundation-owned. The Vercel project is ours and in
use. GCP is the gap: we do not hold access to the project the backend
runs in, and that blocks section A entirely.

- **P0 Ownership audit and migration.** GCP project
  `solana-learning-playground`, domain, model and OpenAI accounts, GitHub
  repo. Each confirmed Foundation-owned or transferred, with at least two
  Foundation admins.
- **P0 Maintain permission on the repo.** For at least two of us, on the
  fork and whatever upstream access the cherry-picks need.
- **P0 Secrets in Secret Manager.** Model key, learning session secret,
  RPC keys, database credentials. Read at boot by Cloud Run.
- **P0 Keyed RPC endpoints for devnet, testnet and mainnet reads.** The
  client falls back to the public `api.*.solana.com` endpoints
  (`constants/connection.ts`). The plumbing exists:
  `buildPlatformEndpoints` reads `REACT_APP_DEVNET_RPC_URL`,
  `REACT_APP_TESTNET_RPC_URL`, `REACT_APP_MAINNET_RPC_URL`. **One trap:**
  `REACT_APP_*` is baked into the bundle, so a key inside one of those
  URLs is public - buy domain-restricted keys, as Explorer uses, or proxy
  through the backend. Settle that before buying.
- **P1 Google Analytics tracker.** A separate GA4 property for the
  playground, and access to it. See Decision 3.
- **P1 CI gate.** Format, clippy and type-check on every PR, blocking the
  Cloud Run and Vercel deploys. No CI runs are recorded on the fork
  today.

### H - Open PRs

Four relevant to this release, all open on the fork, none merged as of
11 Sep: **#23** server-side rust-analyzer over WebSocket (Ready),
**#26** the deploy step explains what it still needs (Review), **#24**
entering a lesson is legible (Review), **#20** lesson state as a ledger
(Review). #23 carries the template mechanism section B depends on, so it
lands first. No full upstream sync this release - 66 commits across 321
differing files.

---

## Phase 2, after 21 Sep

Agreed, deliberately out of the cut, ordered by what unblocks users
soonest.

1. **Client generator in the new client.** The previous client generates
   a TypeScript client from the program IDL; the new one does not. Port
   it. Cheapest item here and the most visibly missing.
2. **Seeds generator on 1.x IDLs.** It exists in both clients
   (`utils/program-interaction/generator.ts`) and works against 0.29
   IDLs. Decide what a 1.2 project sees meanwhile: hide it, or let it
   fail.
3. **TypeScript code intelligence.** The Anchor 1.2 LSP endpoint serves
   Rust only. Either keep the Monaco TypeScript worker alongside the LSP,
   or add a TypeScript language server.
4. **Mainnet deploys through Kora.** Postponed on a hard blocker: the
   mainnet paymaster requires a Jupiter API key we do not hold. Still
   open underneath it: who funds real rent, and what happens to a program
   a user cannot afford to close.
5. **Full upstream sync.** 66 commits, 321 differing files. Phase 1 takes
   named cherry-picks only.

---

## Decisions needed, as the document states them

1. **What is Acheron building, and against what deadline?** The Kora
   integration is the real question. If it lands by Mon 15 Sep we
   integrate and test; past that we build it ourselves, which consumes
   the rest of the week and puts section C at risk. *Asks Cat, Acheron,
   the Anchor team; blocks section C.*
2. **Supabase or the Foundation's managed Postgres?** That we need a
   database is agreed - only the provider is open. Supabase pairs with
   the Vercel deployment and needs the least setup; the Foundation's
   managed Postgres is one vendor fewer. Decides who owns user
   conversations. *Asks Foundation infrastructure; blocks section D.*
3. **Google Analytics - do we track, and who creates the property?**
   *Asks Foundation.*
4. **What did `/ide` mean, and is a route split intended?** There is no
   `/ide` route; Rev 1 used it throughout as though there were. The IDE
   is `/`, and the learning shell is a view inside the same route. So:
   loose shorthand, or a plan to move the IDE onto its own path and put
   the learning shell at `/`? *Asks us, then Cat; touches sections A, D
   and F.*
5. **Is `ai <prompt>` in the terminal needed, and in which phase?**
   *Asks us; section D.*

## Access required, as the document tables it

| Access | Needed for | Status |
| --- | --- | --- |
| Google Cloud Run, `solana-learning-playground` | The Anchor 1.2 backend and the LSP endpoint | Not held |
| Managed Postgres or Supabase org | Cross-device AI chat history | Agreed we need one; provider open (Decision 2) |
| GitHub fork - Maintain | Syncing upstream and merging without asking other people | Not held |
| RPC provider keys, devnet/testnet/mainnet | Reads for deploys, the test UI and the explorer | Not held; domain-restricted or proxied, undecided |
| GCP Secret Manager | Model key, session secret, RPC keys, database credentials | Not held |
| Google Analytics - playground property | Page views, deploy attempts, AI usage | Property does not exist yet |
| Vercel team and project | Frontend deploys and environment variables | Held - confirm it sits under a Foundation team |
| Jupiter API key | Kora's mainnet paymaster - Phase 2 | Not held; tier and cost unknown |

---

## What has already overtaken this document

Recorded here so nobody plans off a stale page. Detail in
`2026-09-11-call-notes-cat.md` and the decisions it points at.

- **Kora is not in the September cut, and mainnet through Kora is not
  required at all** (Cat, same thread). Section C's Kora P0s are Phase 2
  work; "mainnet postponed on the Jupiter key" understates it. -> D41.
- **The wallet connector is ConnectorKit, and mainnet deploys stay**
  rather than being disabled (Cat, same thread). Not in this document at
  all. -> D40.
- **`/ide` was loose shorthand.** Decision 4 is answered: no route split.
  -> D42.
- **The database is decided and partly built.** Managed Postgres behind a
  provider-neutral `DATABASE_URL`, with Better Auth for identity, shipped
  in PRs #29 and #30 (D39). Decision 2's provider question survives only
  as who hosts it. Cat also wants **programs** in that database, which
  runs against D31 - open, see the call notes.
- **Phase 1 did not ship on 21 Sep.** As of 2026-09-22 the LSP branch is
  unmerged and Anchor 1.2 is unstarted. The roadmap, not this document,
  carries the current state.
