# GitHub OAuth + Gated Airdrop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Real GitHub OAuth sign-in (popup web flow) with the existing
devnet airdrop gated behind it, surfaced as a chip in the Flow header.

**Architecture:** A serverless handler (`api/github-oauth.mjs`) does the
authorize redirect and the code-for-token exchange with the secret in
env; an in-memory store (`PgGithubAuth`) holds the token and GitHub
profile for the tab's lifetime; two one-line hooks gate the airdrop
command and the wallet-menu item; a Flow header chip shows sign-in /
identity. Nothing else changes — the faucet stays the public devnet RPC.

**Tech Stack:** React 17 + styled-components (CRA 5/craco), plain-ESM
Node serverless handlers served by the craco dev middleware and Vercel,
Jest (`craco test`) for unit tests.

**Spec:** `docs/superpowers/specs/2026-08-25-github-oauth-design.md`
(this worktree, and on `context-archive`).

## Global Constraints

- 80 columns, 2-space indent, prettier-clean; no `any`, no `@ts-ignore`;
  `import type` for types; no non-ASCII in source (CONTRIBUTING.md).
- Default export for React components, named exports for everything
  else.
- The GitHub token must NEVER touch `localStorage`/`sessionStorage`
  (spec: project code runs in a same-origin iframe; D3 reasoning).
- Secrets only in `client-v2/.env.local` / Vercel env — never in the
  repo, never `REACT_APP_*`.
- `api/*.mjs` files are plain ESM on raw Node req/res (see
  `client-v2/api/health.mjs` header comment for why); they are outside
  the TS build.
- Do not commit `CLAUDE.md`, `AGENTS.md`, or anything under `docs/` —
  working docs live on `context-archive`. The plan's commits list
  exact files; stage only those.
- Commit messages: present tense, no prefix for client changes, no
  co-author trailers.
- Run all yarn commands from `client-v2/` with Node 22 on PATH:
  `export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH"`.

---

### Task 1: `PgGithubAuth` store (TDD)

**Files:**
- Create: `client-v2/src/utils/github-auth.ts`
- Modify: `client-v2/src/utils/index.ts` (one export line)
- Test: `client-v2/src/utils/github-auth.test.ts`

**Interfaces:**
- Consumes: `Disposable` from `client-v2/src/utils/types.ts`.
- Produces (later tasks rely on these exact names):
  - `interface GithubUser { login: string; name: string | null; avatarUrl: string }`
  - `class PgGithubAuth` with static members:
    `user: GithubUser | null` (getter), `token: string | null` (getter),
    `signIn(): Promise<void>`, `signOut(): void`,
    `onDidChange(cb: () => void): Disposable`,
    and a test-only `_reset(): void`.
  - `const checkGithubSignIn: () => void` (throws when signed out).
  - Message type on the wire:
    `{ type: "pg-github-auth", token?: string, error?: string }`.

- [ ] **Step 1: Write the failing test**

Create `client-v2/src/utils/github-auth.test.ts`:

```ts
import { PgGithubAuth, checkGithubSignIn } from "./github-auth";

const USER = {
  login: "octocat",
  name: "The Octocat",
  avatar_url: "https://example.test/a.png",
};

/** Resolve a `signIn()` round trip by faking the popup and the message */
const completeSignIn = async (
  message: unknown,
  origin: string = window.location.origin
) => {
  const popup = { closed: false, close: jest.fn() };
  const openSpy = jest
    .spyOn(window, "open")
    .mockReturnValue(popup as unknown as Window);
  const promise = PgGithubAuth.signIn();
  window.dispatchEvent(
    new MessageEvent("message", { data: message, origin })
  );
  const result = await promise.then(
    () => "resolved",
    (e: Error) => e.message
  );
  openSpy.mockRestore();
  return result;
};

describe("PgGithubAuth", () => {
  beforeEach(() => {
    PgGithubAuth._reset();
    (global.fetch as jest.Mock | undefined)?.mockRestore?.();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(USER),
    }) as jest.Mock;
  });

  it("is signed out initially and checkGithubSignIn throws", () => {
    expect(PgGithubAuth.user).toBeNull();
    expect(PgGithubAuth.token).toBeNull();
    expect(() => checkGithubSignIn()).toThrow(/sign in with github/i);
  });

  it("stores identity on a well-formed message from own origin", async () => {
    const result = await completeSignIn({
      type: "pg-github-auth",
      token: "gho_x",
    });
    expect(result).toBe("resolved");
    expect(PgGithubAuth.token).toBe("gho_x");
    expect(PgGithubAuth.user).toEqual({
      login: "octocat",
      name: "The Octocat",
      avatarUrl: "https://example.test/a.png",
    });
    expect(() => checkGithubSignIn()).not.toThrow();
  });

  it("ignores messages from a foreign origin", async () => {
    const popup = { closed: false, close: jest.fn() };
    const openSpy = jest
      .spyOn(window, "open")
      .mockReturnValue(popup as unknown as Window);
    let settled = false;
    const promise = PgGithubAuth.signIn().finally(() => {
      settled = true;
    });
    window.dispatchEvent(
      new MessageEvent("message", {
        data: { type: "pg-github-auth", token: "gho_evil" },
        origin: "https://evil.test",
      })
    );
    await Promise.resolve();
    expect(settled).toBe(false);
    expect(PgGithubAuth.token).toBeNull();
    // complete it legitimately so the listener is cleaned up
    window.dispatchEvent(
      new MessageEvent("message", {
        data: { type: "pg-github-auth", token: "gho_ok" },
        origin: window.location.origin,
      })
    );
    await promise;
    openSpy.mockRestore();
  });

  it("rejects on an error payload and stays signed out", async () => {
    const result = await completeSignIn({
      type: "pg-github-auth",
      error: "state mismatch",
    });
    expect(result).toBe("state mismatch");
    expect(PgGithubAuth.token).toBeNull();
  });

  it("clears state when the profile fetch fails", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false });
    const result = await completeSignIn({
      type: "pg-github-auth",
      token: "gho_x",
    });
    expect(result).toMatch(/profile/i);
    expect(PgGithubAuth.token).toBeNull();
    expect(PgGithubAuth.user).toBeNull();
  });

  it("rejects when the popup is blocked", async () => {
    const openSpy = jest.spyOn(window, "open").mockReturnValue(null);
    await expect(PgGithubAuth.signIn()).rejects.toThrow(/popup/i);
    openSpy.mockRestore();
  });

  it("signOut clears state and notifies", async () => {
    await completeSignIn({ type: "pg-github-auth", token: "gho_x" });
    const cb = jest.fn();
    const { dispose } = PgGithubAuth.onDidChange(cb);
    cb.mockClear(); // onDidChange fires once on subscribe
    PgGithubAuth.signOut();
    expect(cb).toHaveBeenCalledTimes(1);
    expect(PgGithubAuth.user).toBeNull();
    dispose();
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

```bash
cd client-v2 && CI=true yarn test-unit --testPathPattern github-auth
```
Expected: FAIL — cannot find module `./github-auth`.

- [ ] **Step 3: Implement the store**

Create `client-v2/src/utils/github-auth.ts`:

```ts
import type { Disposable } from "./types";

export interface GithubUser {
  login: string;
  name: string | null;
  avatarUrl: string;
}

interface AuthMessage {
  type: "pg-github-auth";
  token?: string;
  error?: string;
}

const isAuthMessage = (data: unknown): data is AuthMessage =>
  !!data &&
  typeof data === "object" &&
  (data as Record<string, unknown>).type === "pg-github-auth";

/**
 * GitHub identity for this tab.
 *
 * The token lives in module memory only. Project code - including code
 * from shared projects - executes in a same-origin iframe guarded by a
 * string blacklist, which is why the model keys never touch
 * `localStorage` (decision D3); the same reasoning applies here. A
 * reload signs the user out.
 */
export class PgGithubAuth {
  static get user(): GithubUser | null {
    return PgGithubAuth._state?.user ?? null;
  }

  static get token(): string | null {
    return PgGithubAuth._state?.token ?? null;
  }

  /**
   * Run the OAuth popup flow.
   *
   * Opens `/api/github-oauth?action=start`; the callback page posts the
   * token back and closes itself. Messages are accepted from our own
   * origin only, and only in the expected shape.
   */
  static signIn(): Promise<void> {
    return new Promise((resolve, reject) => {
      const popup = window.open(
        "/api/github-oauth?action=start",
        "pg-github-auth",
        "width=980,height=720"
      );
      if (!popup) {
        reject(new Error("Allow popups for this site to sign in."));
        return;
      }

      const done = (err?: Error) => {
        window.removeEventListener("message", onMessage);
        if (err) reject(err);
        else resolve();
      };

      const onMessage = async (ev: MessageEvent) => {
        if (ev.origin !== window.location.origin) return;
        if (!isAuthMessage(ev.data)) return;

        if (ev.data.error || !ev.data.token) {
          done(new Error(ev.data.error ?? "Sign-in was cancelled."));
          return;
        }

        try {
          const user = await PgGithubAuth._fetchUser(ev.data.token);
          PgGithubAuth._state = { token: ev.data.token, user };
          PgGithubAuth._notify();
          done();
        } catch (e) {
          // Never keep a token without an identity to show
          PgGithubAuth._state = null;
          PgGithubAuth._notify();
          done(e as Error);
        }
      };

      window.addEventListener("message", onMessage);
    });
  }

  static signOut() {
    PgGithubAuth._state = null;
    PgGithubAuth._notify();
  }

  static onDidChange(cb: () => void): Disposable {
    PgGithubAuth._listeners.add(cb);
    cb();
    return { dispose: () => PgGithubAuth._listeners.delete(cb) };
  }

  /** Test-only: back to the signed-out state without notifying */
  static _reset() {
    PgGithubAuth._state = null;
    PgGithubAuth._listeners.clear();
  }

  private static async _fetchUser(token: string): Promise<GithubUser> {
    const resp = await fetch("https://api.github.com/user", {
      headers: { authorization: `Bearer ${token}` },
    });
    if (!resp.ok) {
      throw new Error("Could not load your GitHub profile. Try again.");
    }
    const raw = await resp.json();
    return {
      login: raw.login,
      name: raw.name ?? null,
      avatarUrl: raw.avatar_url,
    };
  }

  private static _notify() {
    for (const cb of PgGithubAuth._listeners) cb();
  }

  private static _state: { token: string; user: GithubUser } | null = null;
  private static _listeners: Set<() => void> = new Set();
}

/** Command pre-check: the airdrop demo requires a GitHub identity */
export const checkGithubSignIn = () => {
  if (!PgGithubAuth.user) {
    throw new Error("Sign in with GitHub to request devnet SOL.");
  }
};
```

Add to `client-v2/src/utils/index.ts`, keeping the list alphabetical
(after `export * from "./framework";`):

```ts
export * from "./github-auth";
```

- [ ] **Step 4: Run tests and types**

```bash
cd client-v2 && CI=true yarn test-unit --testPathPattern github-auth \
  && yarn test-types
```
Expected: 7 tests pass, tsc clean.

- [ ] **Step 5: Commit**

```bash
git add client-v2/src/utils/github-auth.ts \
  client-v2/src/utils/github-auth.test.ts client-v2/src/utils/index.ts
git commit -m "Hold the GitHub identity in memory for the tab"
```

---

### Task 2: OAuth exchange handler

**Files:**
- Create: `client-v2/api/github-oauth.mjs`

**Interfaces:**
- Consumes: env `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`.
- Produces: `GET /api/github-oauth?action=start` (302 to GitHub),
  `GET /api/github-oauth?action=callback&code=..&state=..` (HTML page
  that posts `{ type: "pg-github-auth", token | error }` to
  `window.opener` and closes). Task 1's `signIn()` already targets
  these URLs.

- [ ] **Step 1: Write the handler**

Create `client-v2/api/github-oauth.mjs`:

```js
/**
 * GitHub OAuth web-flow exchange.
 *
 * `?action=start` redirects to GitHub's authorize page with a random
 * `state` pinned in a short-lived HttpOnly cookie. `?action=callback`
 * verifies the state, exchanges the code for an access token using the
 * client secret - which therefore never reaches the browser - and
 * answers a page that posts the token to `window.opener` (same origin
 * only) and closes itself. The SPA keeps the token in memory; nothing
 * is persisted anywhere.
 *
 * Plain ESM on raw Node request/response APIs - see `api/health.mjs`
 * for why.
 *
 * @param {import("node:http").IncomingMessage} req
 * @param {import("node:http").ServerResponse} res
 */
import { randomBytes } from "node:crypto";

const COOKIE = "pg_gh_oauth_state";

export default async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const action = url.searchParams.get("action");

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return sendJson(res, 503, {
      error: "GitHub OAuth is not configured in this deployment",
    });
  }

  if (action === "start") {
    const state = randomBytes(16).toString("hex");
    const proto = req.headers["x-forwarded-proto"] ?? "http";
    const redirectUri =
      `${proto}://${req.headers.host}/api/github-oauth?action=callback`;
    const authorize = new URL("https://github.com/login/oauth/authorize");
    authorize.searchParams.set("client_id", clientId);
    authorize.searchParams.set("redirect_uri", redirectUri);
    authorize.searchParams.set("state", state);
    res.statusCode = 302;
    res.setHeader(
      "set-cookie",
      `${COOKIE}=${state}; HttpOnly; SameSite=Lax; Max-Age=600; Path=/api`
    );
    res.setHeader("location", authorize.toString());
    return res.end();
  }

  if (action === "callback") {
    const state = url.searchParams.get("state");
    const cookieState = readCookie(req.headers.cookie, COOKIE);
    if (!state || state !== cookieState) {
      return sendResult(res, { error: "State mismatch. Try again." });
    }

    const code = url.searchParams.get("code");
    if (!code) {
      return sendResult(res, { error: "GitHub sent no code. Try again." });
    }

    const resp = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
        }),
      }
    );
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || !data.access_token) {
      return sendResult(res, {
        error: data.error_description || "Token exchange failed.",
      });
    }
    return sendResult(res, { token: data.access_token });
  }

  return sendJson(res, 400, { error: `Unknown action: ${action}` });
}

/** The page that hands the result to the app and closes the popup */
function sendResult(res, { token, error }) {
  const payload = JSON.stringify({
    type: "pg-github-auth",
    ...(token ? { token } : { error }),
  });
  res.statusCode = 200;
  res.setHeader("content-type", "text/html; charset=utf-8");
  // Own origin only: the opener is our SPA on the same host
  res.end(
    `<!doctype html><meta charset="utf-8"><title>Signing in...</title>` +
      `<script>` +
      `if (window.opener) {` +
      `window.opener.postMessage(${payload}, window.location.origin);` +
      `}` +
      `window.close();` +
      `</script>` +
      `<p>You can close this window.</p>`
  );
}

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(body));
}

function readCookie(header, name) {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return null;
}
```

- [ ] **Step 2: Verify the handler over HTTP**

The craco dev server serves `api/*.mjs`. With the dev server NOT
necessarily running, do a fast smoke test with node itself:

```bash
cd client-v2 && node --input-type=module -e '
import handler from "./api/github-oauth.mjs";
const res = {
  headers: {}, statusCode: 0,
  setHeader(k, v) { this.headers[k] = v; },
  end(b) { console.log(this.statusCode, this.headers, (b ?? "").slice(0, 120)); },
};
await handler({ url: "/api/github-oauth?action=start", headers: { host: "localhost:3000" } }, res);
await handler({ url: "/api/github-oauth?action=nope", headers: { host: "localhost:3000" } }, res);
'
```
Expected: first call prints `503` (no env configured locally yet) —
or `302` with a `location` pointing at github.com when
`GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET` are exported; second prints
`503` too (config check runs first). With env vars set, the unknown
action prints `400`.

- [ ] **Step 3: Commit**

```bash
git add client-v2/api/github-oauth.mjs
git commit -m "Exchange the GitHub OAuth code server-side"
```

---

### Task 3: Gate the airdrop (command + wallet menu)

**Files:**
- Modify: `client-v2/src/commands/airdrop/airdrop.ts` (import + one
  line)
- Modify: `client-v2/src/components/Wallet/hooks/useAirdrop.tsx`
- Test: type-check only (both files are thin delegations; the logic
  they delegate to is covered by Task 1's suite)

**Interfaces:**
- Consumes: `checkGithubSignIn`, `PgGithubAuth` from
  `client-v2/src/utils` (Task 1).

- [ ] **Step 1: Gate the terminal command**

In `client-v2/src/commands/airdrop/airdrop.ts`, change the import of
`checkWallet` and the `preChecks` line:

```ts
import { checkWallet } from "../checks";
```
stays, and add `checkGithubSignIn` to the existing `../../utils` import
group (the file already imports `PgCommon, PgConnection, ...` from
`"../../utils"` — extend that list):

```ts
import {
  checkGithubSignIn,
  PgCommon,
  PgConnection,
  PgTerminal,
  PgTx,
  PgWallet,
  PgWeb3,
} from "../../utils";
```

Then:

```ts
  preChecks: [checkWallet, checkGithubSignIn],
```

(`preChecks` accepts `Arrayable<() => SyncOrAsync<void>>` — see
`client-v2/src/utils/command.ts:18`.)

- [ ] **Step 2: Gate the wallet-menu item**

In `client-v2/src/components/Wallet/hooks/useAirdrop.tsx`, wrap the
returned executor so a signed-out click signs in first:

```tsx
import { useEffect, useState } from "react";

import { PgCommand, PgConnection, PgGithubAuth } from "../../../utils";

export const useAirdrop = () => {
  const [airdropCondition, setAirdropCondition] = useState(false);

  useEffect(() => {
    const { dispose } = PgConnection.onDidChangeCluster(() => {
      setAirdropCondition(!!PgConnection.getAirdropAmount());
    });
    return dispose;
  }, []);

  const airdrop = async () => {
    // The demo gates the faucet behind a GitHub identity; sign in on
    // the way if needed, then run the unchanged upstream command.
    if (!PgGithubAuth.user) await PgGithubAuth.signIn();
    await PgCommand.airdrop.execute();
  };

  return { airdrop, airdropCondition };
};
```

- [ ] **Step 3: Type-check and run the full unit suite**

```bash
cd client-v2 && yarn test-types && CI=true yarn test-unit
```
Expected: tsc clean; all suites pass (Task 1's 7 tests included).

- [ ] **Step 4: Commit**

```bash
git add client-v2/src/commands/airdrop/airdrop.ts \
  client-v2/src/components/Wallet/hooks/useAirdrop.tsx
git commit -m "Gate the airdrop behind GitHub sign-in"
```

---

### Task 4: GitHub chip in the Flow header

**Files:**
- Modify: `client-v2/src/views/flow/header/StatusChips.tsx`

**Interfaces:**
- Consumes: `PgGithubAuth` from `../../../utils` (Task 1),
  `useRenderOnChange` from `../../../hooks` (exists).

Design constraints (from the spec's skills note): extend the existing
chip language in this file — same `Chip`/`WalletChip` anatomy, tokens,
radii and focus styles; no literal colors that exist only here. Check
the neighboring styled-components in this file and reuse them.

- [ ] **Step 1: Add state + render**

In `StatusChips.tsx`:

1. Extend the utils import:
   `import { PgCommand, PgConnection, PgGithubAuth } from "../../../utils";`
2. Add inside the component (after the `isClusterDown` line):

```tsx
  useRenderOnChange(PgGithubAuth.onDidChange);
  const [authError, setAuthError] = useState<string | null>(null);
  const github = PgGithubAuth.user;

  const signIn = async () => {
    setAuthError(null);
    try {
      await PgGithubAuth.signIn();
    } catch (e) {
      setAuthError((e as Error).message);
    }
  };
```

   (`useRenderOnChange` accepts an `onDidChange`-style subscriber and
   re-renders on each emit; check its signature in
   `client-v2/src/hooks/useRenderOnChange.tsx` and adapt — if it
   expects an event-returning function it can be used as
   `useRenderOnChange(PgGithubAuth.onDidChange)`; if not, fall back to
   a local `useEffect` subscription mirroring `useAirdrop`'s pattern.)

3. Render before the settings `IconButton`:

```tsx
      {github ? (
        <GithubChip
          type="button"
          onClick={() => PgGithubAuth.signOut()}
          title={`Signed in as ${github.login} - click to sign out`}
          aria-label={`GitHub: ${github.login}. Sign out`}
        >
          <Avatar src={github.avatarUrl} alt="" aria-hidden />
          <span>{github.login}</span>
        </GithubChip>
      ) : (
        <GithubChip type="button" onClick={signIn} aria-label="Sign in with GitHub">
          <GithubMark />
          <span>Sign in</span>
        </GithubChip>
      )}
      {authError && <AuthError role="alert">{authError}</AuthError>}
```

4. Styled components, alongside the existing ones and reusing the same
   theme tokens the file already uses (copy `WalletChip`'s base styles;
   the exact declarations depend on what is in the file — mirror them):

```tsx
const GithubChip = styled(WalletChip)`
  gap: 0.375rem;
`;

const Avatar = styled.img`
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
`;

const AuthError = styled.span`
  ${({ theme }) => css`
    color: ${theme.colors.state.error.color};
    font-size: ${theme.font.code.size.xsmall};
  `}
`;

const GithubMark: FC = () => (
  <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden>
    <path
      fill="currentColor"
      d="M8 .2a8 8 0 0 0-2.5 15.6c.4 0 .5-.2.5-.4v-1.4c-2 .4-2.5-.9-2.5-.9-.4-.9-.9-1.2-.9-1.2-.7-.5.1-.5.1-.5.8.1 1.2.9 1.2.9.7 1.2 1.9.9 2.4.7 0-.5.3-.9.5-1.1-1.8-.2-3.7-.9-3.7-4a3 3 0 0 1 .8-2.1 2.9 2.9 0 0 1 .1-2.1s.7-.2 2.2.8a7.6 7.6 0 0 1 4 0c1.5-1 2.2-.8 2.2-.8.3.7.3 1.5.1 2.1a3 3 0 0 1 .8 2.1c0 3.1-1.9 3.8-3.7 4 .3.3.6.8.6 1.5v2.1c0 .2.1.4.5.4A8 8 0 0 0 8 .2Z"
    />
  </svg>
);
```

   Note: if `WalletChip` is not a styled button that can be extended,
   duplicate its css into a new `GithubChip` styled.button — do not
   restyle `WalletChip` itself.

- [ ] **Step 2: Verify types, tests, and prettier**

```bash
cd client-v2 && yarn test-types && CI=true yarn test-unit \
  && npx prettier --check src/views/flow/header/StatusChips.tsx \
     src/utils/github-auth.ts src/utils/github-auth.test.ts \
     src/components/Wallet/hooks/useAirdrop.tsx \
     src/commands/airdrop/airdrop.ts
```
Expected: all clean.

- [ ] **Step 3: Commit**

```bash
git add client-v2/src/views/flow/header/StatusChips.tsx
git commit -m "Show the GitHub identity in the Flow header"
```

---

### Task 5: Verify end to end and open the PR

**Files:** none new.

- [ ] **Step 1: Full local verification**

```bash
cd client-v2 && yarn test-types && CI=true yarn test-unit
```
Expected: clean; note suite/test counts for the PR body.

- [ ] **Step 2: Manual round trip (needs the OAuth app env)**

If `GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET` are present in
`client-v2/.env.local`:

```bash
cd client-v2 && yarn dev
```
Then in the browser at `localhost:3000`: header "Sign in" chip ->
GitHub popup -> avatar + login appear; `airdrop` in the terminal
while signed out shows the gate message; the wallet-menu Airdrop item
opens sign-in when signed out. If the env is not available, run the
demo path with the popup mocked closed (click -> error message
renders) and record in the PR body that the live round trip is
pending the OAuth app registration.

- [ ] **Step 3: Accessibility audit on the new UI**

Run the `web-design-guidelines` skill against
`client-v2/src/views/flow/header/StatusChips.tsx` (focus-visible state
on the chip, ARIA labels, hit target, reduced-motion on any
transition). Fix Important findings; log Minors in the PR body.

- [ ] **Step 4: Push and open the PR**

```bash
git push -u origin feat/flow-ui-follow-ups
gh pr create --base feat/flow-ui-visual \
  --title "Gate the devnet airdrop behind GitHub sign-in" \
  --body-file <(cat <<'EOF'
## Why

Team priority: GitHub identity first. This is the first cut - real
OAuth sign-in surfaced in the Flow header, with the existing devnet
airdrop gated behind it in both the terminal command and the wallet
menu.

## What is real and what is not

Real: the OAuth web flow (popup, state cookie, server-side exchange -
the secret never reaches the browser), the identity in the header, the
gate's behavior. Imitation, on purpose: the gate is client-side
policy - the faucet underneath is the unchanged public devnet RPC.
The upgrade path (verifying faucet, per-user storage, sessions) is
written down in the working docs.

## Footprint

New: `api/github-oauth.mjs`, `utils/github-auth.ts` (+7 unit tests).
Edited: `StatusChips.tsx` (ours), `airdrop.ts` (+1 pre-check line),
`useAirdrop.tsx` (delegating wrapper). The token lives in memory only
and never touches localStorage.

## Verification

- `tsc --noEmit` clean; unit suites pass (counts in the checks).
- Manual: full popup round trip, gate in terminal and wallet menu.
- Needs env to run: `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` in
  `client-v2/.env.local` (dev) or Vercel env (prod); without them the
  chip reports the deployment as unconfigured and the rest of the app
  is unaffected.
EOF
)
```

(Adjust the base branch if the team prefers PRs against
`feat/flow-ui-visual`'s successor; the worktree branched from it.)

- [ ] **Step 5: Update the roadmap**

Move the OAuth stream's line in `docs/roadmap.md` (on
`context-archive`) from "implementation next" to "PR open", and note
the PR number. Commit to `context-archive` via a temp worktree, as
before.
