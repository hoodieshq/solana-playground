# GitHub OAuth sign-in with a gated airdrop — design

Date: 2026-08-25 · Stream: D21 Focus 2 (GitHub identity)
Branch: `feat/flow-ui-follow-ups` · Status: approved in chat, spec for
review

## Why

Team-lead feedback (see the 2026-08-25 priorities handoff in
`docs/internal/` on `context-archive`): sign in with GitHub ID enables
airdrop and the features the Solana Foundation would build around
models and agents. Cat's point that sign-in only pays off with per-user
program storage is acknowledged and deliberately deferred: storage is a
stream with its own backend, and by our constraints it cannot live in
`server/`. This iteration follows the "concept on paper, simplified in
code" principle: real OAuth identity, a client-side gate, and a written
concept for everything server-side.

## Scope of this cut

- Real GitHub OAuth web flow; real identity (login, avatar) in the app.
- The existing `airdrop` command and wallet-menu item require sign-in.
- A sign-in chip in the Flow header; sign-out from its menu.
- Nothing else changes: the faucet stays the public devnet RPC, the
  wallet stays the local keypair, projects stay in local storage.

Non-goals (concept only, below): a verifying faucet endpoint, per-user
program storage, quotas, persistent sessions.

## Architecture

Four units. Data flows left to right; the token never leaves memory.

```
[api/github-oauth.mjs]  --token via postMessage-->  [PgGithubAuth]
       (serverless)                                (in-memory store)
                                                        |
                              +-------------------------+----------+
                              |                                    |
                    [checkGithubSignIn]                  [Flow header chip]
                 gates command + wallet menu           sign-in / avatar menu
```

### 1. `client-v2/src/utils/github-auth.ts` — identity store

Static `PgGithubAuth`, following the store conventions used by the
assistant's `PgAssistant`:

- State: `{ token: string; user: GithubUser } | null`, where
  `GithubUser = { login: string; name: string | null; avatarUrl:
  string }`. Held in module memory only. A reload signs the user out —
  the same reasoning D3 applied to the Anthropic key: project code
  (including shared projects) runs in a same-origin iframe guarded by a
  string blacklist, so no token goes to `localStorage` or
  `sessionStorage`.
- `signIn(): Promise<void>` — opens a popup on
  `/api/github-oauth?action=start`, subscribes to `message` events, and
  resolves when a message arrives. The handler REJECTS any event whose
  `origin !== window.location.origin` or whose payload is not the
  expected `{ type: "pg-github-auth", token }` shape. On token receipt
  it fetches `https://api.github.com/user` with the token (CORS is
  open), stores `{ token, user }`, and emits change. Popup blocked,
  closed by the user, or an `{ error }` payload reject with a readable
  message; a rejected sign-in leaves the state signed out.
- `signOut(): void` — clears state, emits change.
- `onDidChange(cb)` — subscription, same event util the other stores
  use.
- `checkGithubSignIn(): void` — throws
  `"Sign in with GitHub to request devnet SOL."` when signed out.
  Exported for the two gate call sites. The message deliberately names
  no UI location: the Flow header has the button, `?classic` does not,
  and the wallet-menu path opens sign-in directly either way.

### 2. `client-v2/api/github-oauth.mjs` — OAuth exchange

Plain ESM on raw Node request/response, same contract as
`api/health.mjs` (runs unchanged under the craco dev middleware,
`vercel dev`, and a deployment). One handler, dispatch on
`?action=`:

- `start`: generate a random `state` (16 bytes, hex), set it in a
  cookie (`HttpOnly; SameSite=Lax; Max-Age=600; Path=/api`), 302 to
  `https://github.com/login/oauth/authorize` with `client_id`,
  `redirect_uri=<origin>/api/github-oauth?action=callback`, `state`,
  and an empty scope (public profile is all we read).
- `callback`: compare `state` from the query against the cookie —
  mismatch or absence answers 400 with the error page. Exchange the
  `code` at `https://github.com/login/oauth/access_token`
  (`Accept: application/json`) using `GITHUB_CLIENT_ID` +
  `GITHUB_CLIENT_SECRET` from the environment. Answer a minimal HTML
  page that posts `{ type: "pg-github-auth", token }` — or
  `{ type: "pg-github-auth", error }` — to `window.opener` with the
  page's own origin as `targetOrigin`, then closes itself. The page
  contains no other script and never renders the token visibly.
- Any other action: 400 JSON, matching the middleware's 404 style.
- Missing env vars: 503 JSON `"GitHub OAuth is not configured in this
  deployment"` — the client surfaces it as-is.

Secrets live in `client-v2/.env.local` (dev) and Vercel project env
(prod). Never in the repo, never in `REACT_APP_*`.

### 3. Gate — two delegating edits in cold upstream files

- `client-v2/src/commands/airdrop/airdrop.ts` (1 commit/12mo — the
  client-v2 move): `preChecks: [checkWallet, checkGithubSignIn]`. One
  line plus one import; the check itself lives in our module.
- `client-v2/src/components/Wallet/hooks/useAirdrop.tsx`: wrap the
  returned `airdrop` so a signed-out click calls
  `PgGithubAuth.signIn()` first and proceeds on success. Two lines
  delegating to our module; the menu item stays visible either way.

The terminal command and the menu item therefore behave identically:
signed out, both lead to sign-in instead of the faucet.

### 4. Flow header chip — `views/flow/header/StatusChips.tsx`

Ours, not upstream. Signed out: a chip-styled button
`Sign in with GitHub` with the GitHub mark, matching the existing
cluster/wallet chips (same tokens from `views/flow/tokens.ts`, same
shape-coded status language the visual-parity iteration established).
Signed in: avatar image (32px circle, `alt` = login), login text,
and a menu with one item, `Sign out`. The chip re-renders on
`PgGithubAuth.onDidChange`. The `?classic` layout gets no chip and no
new code; its wallet menu goes through the same gated `useAirdrop`
hook, so a signed-out click there opens the sign-in popup directly.
The gate is therefore consistent in both layouts even though only
Flow surfaces the identity.

## Error handling

- Popup blocked: `signIn()` rejects with "Allow popups for this site to
  sign in"; the chip shows the message inline (no toast system in
  Flow).
- User closes the popup: reject quietly ("Sign-in was cancelled"), no
  state change.
- GitHub exchange failure / state mismatch: the error page posts
  `{ error }`; the chip surfaces the text.
- `api.github.com/user` failure after a good token: treat as failed
  sign-in, clear state — never keep a token without an identity to
  show.
- Unconfigured deployment (no env): the chip stays functional and
  surfaces the 503 message, so the demo fails loudly and honestly, not
  silently.

## Real vs imitation (honesty map)

Real: the OAuth flow, the GitHub identity, the token, the gate's
behavior. Imitation: the gate is client-side policy — the faucet
underneath is the public devnet RPC, unchanged, and nothing
server-side verifies the sign-in. The Foundation's verifying faucet
does not exist yet; this demo shows the experience it would gate.
State this in the PR body and demo script; do not state it in the UI.

## Concept: where this grows (not in this cut)

1. **Verifying faucet endpoint** — an `api/` route (or the
   Foundation's own service) that checks the GitHub token server-side
   and performs the airdrop from a funded keypair with per-identity
   quotas. Our `api/` layer can prototype it; production belongs to a
   real service with abuse controls.
2. **Per-user program storage** — Cat's condition for sign-in to pay
   off. A separate service (not `server/`), addressed per GitHub
   identity; candidate decision D22 once designed. Until then projects
   stay local.
3. **Session persistence** — an HttpOnly cookie session issued by our
   API layer, removing the reload-signs-out limitation without ever
   exposing the token to page JS (and so to the project iframe).
4. **One identity, many features** — the same `PgGithubAuth` gate is
   the hook for the tutorials stream (per-user progress) and the
   playground-tokens mode (quota per identity), both parked in D21.

## Skills to use during implementation

Design work is still an active stream in this repo, so the visual part
is not freestyle:

- `superpowers:writing-plans` — the implementation plan, next step
  after this spec is approved.
- `superpowers:subagent-driven-development` (or `executing-plans`
  inline) — plan execution.
- `superpowers:test-driven-development` — the store and the gate are
  test-first; the serverless handler stays thin and manually verified.
- `frontend-design` / `frontend-design:frontend-design` — the header
  chip and sign-in states must extend Flow's existing visual language
  (tokens.ts, the concept boards on `context-archive` under
  `docs/design/`), not introduce a new one. Match chip anatomy,
  radii, spacing, and the shape-coded status language exactly.
- `web-design-guidelines` — the accessibility audit pass that closed
  the two previous iterations (focus-visible, ARIA, hit targets,
  reduced motion) runs on the new chip, menu, and error states before
  the PR.
- `superpowers:verification-before-completion` — evidence before
  claims: tsc, unit suites, and one full manual OAuth round trip.

## Testing

Unit (`yarn test-unit`):
- `github-auth.test.ts`: sign-in resolves and stores identity on a
  well-formed message from own origin; rejects messages from a foreign
  origin or with a malformed payload; error payload rejects and leaves
  state signed out; profile-fetch failure clears state; `signOut`
  clears and notifies; `checkGithubSignIn` throws signed out and
  passes signed in.
- Gate call sites compile against the exported names (type-level).

Manual (documented in the plan):
- Full popup round trip on `yarn dev` with the dev OAuth app.
- `airdrop` in the terminal while signed out → gate message; signed
  in → SOL arrives (funded faucet permitting).
- Wallet menu Airdrop item both ways.
- Unconfigured env → loud 503 message.
- `?classic` unaffected except the gated menu item.

## Prerequisites (Slava)

Two GitHub OAuth Apps (Settings → Developer settings → OAuth Apps):
- Dev: homepage `http://localhost:3000`, callback
  `http://localhost:3000/api/github-oauth`.
- Prod: same paths on the Vercel domain.
Put `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` into
`client-v2/.env.local` and the Vercel project env. No quotes, no
`REACT_APP_` prefix.

## Decision to record

A decisions.md entry (on `context-archive`): airdrop demo gates the
existing faucet behind sign-in — options (b) identity-only and (c) own
verifying faucet were rejected for this cut; (c) is the concept's step
1 and the revisit trigger is the Foundation's faucet becoming real.
