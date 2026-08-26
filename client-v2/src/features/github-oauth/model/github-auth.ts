import type { Disposable } from "../../../utils/types";

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
 * The token lives in module memory only, so a reload signs the user out -
 * the same reasoning that keeps the model keys out of `localStorage`
 * (decision D3).
 *
 * This is not a barrier against project code. That code runs in a
 * same-origin iframe whose blacklist (`js-runtime.ts` BLACKLISTED_GLOBALS)
 * covers `window`/`top` but not `parent`, and is a substring check on
 * source text besides - so project code can reach into this module. What
 * bounds the damage is the empty OAuth scope, not the storage choice.
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
   * Opens `/api/github-oauth?action=start`; the callback page delivers
   * the result over a same-origin `BroadcastChannel` - the primary path,
   * since `window.opener` is not reliable across the GitHub navigation
   * (COOP severing and similar) - and falls back to posting to
   * `window.opener` for runtimes without `BroadcastChannel`. Messages
   * from `window` are additionally accepted from our own origin only,
   * and only in the expected shape.
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

      let pollInterval: number;
      let messageReceived = false;

      const channel: BroadcastChannel | null =
        typeof BroadcastChannel === "undefined"
          ? null
          : new BroadcastChannel("pg-github-auth");

      const done = (err?: Error) => {
        window.removeEventListener("message", onMessage);
        channel?.close();
        window.clearInterval(pollInterval);
        if (err) reject(err);
        else resolve();
      };

      const handlePayload = async (data: AuthMessage) => {
        // Set synchronously, before any await: the same payload can
        // arrive on both the channel and the window listener, and only
        // the first should trigger the profile fetch.
        if (messageReceived) return;
        messageReceived = true;

        if (data.error || !data.token) {
          done(new Error(data.error ?? "Sign-in was cancelled."));
          return;
        }

        // Only the fetch is guarded: a throwing subscriber inside `_notify`
        // must not be mistaken for a failed profile fetch and wipe the session
        const token = data.token;
        let failure: Error | undefined;
        try {
          const user = await PgGithubAuth._fetchUser(token);
          PgGithubAuth._state = { token, user };
        } catch (e) {
          // Never keep a token without an identity to show
          PgGithubAuth._state = null;
          failure = e as Error;
        }
        PgGithubAuth._notify();
        done(failure);
      };

      const onMessage = (ev: MessageEvent) => {
        if (ev.origin !== window.location.origin) return;
        // Origin alone is not enough: project code runs in a same-origin iframe,
        // so require the message to come from the popup we opened
        if (ev.source !== popup) return;
        if (!isAuthMessage(ev.data)) return;
        handlePayload(ev.data);
      };

      window.addEventListener("message", onMessage);

      if (channel) {
        channel.onmessage = (ev: MessageEvent) => {
          if (!isAuthMessage(ev.data)) return;
          handlePayload(ev.data);
        };
      }

      pollInterval = window.setInterval(() => {
        if (popup.closed && !messageReceived) {
          done(new Error("Sign-in was cancelled."));
        }
      }, 500);
    });
  }

  static signOut() {
    PgGithubAuth._state = null;
    PgGithubAuth._notify();
  }

  static onDidChange(cb: () => void): Disposable {
    PgGithubAuth._listeners.add(cb);
    PgGithubAuth._notifyOne(cb);
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
      console.error(`github-auth: /user failed with ${resp.status}`);
      if (resp.status === 401) {
        throw new Error("GitHub rejected the sign-in token. Sign in again.");
      }
      if (resp.status === 403 || resp.status === 429) {
        throw new Error("GitHub rate limit reached. Wait a minute and retry.");
      }
      throw new Error(
        `Could not load your GitHub profile (HTTP ${resp.status}). Try again.`
      );
    }

    // An unvalidated body yields `{login: undefined}` - truthy, so the airdrop
    // gate would open on a proxy page or a changed API
    const raw = await resp.json().catch(() => undefined);
    if (typeof raw?.login !== "string" || !raw.login) {
      console.error("github-auth: /user returned an unexpected shape", raw);
      throw new Error("GitHub returned an unexpected profile. Try again.");
    }
    return {
      login: raw.login,
      name: typeof raw.name === "string" ? raw.name : null,
      avatarUrl: typeof raw.avatar_url === "string" ? raw.avatar_url : "",
    };
  }

  private static _notify() {
    for (const cb of PgGithubAuth._listeners) PgGithubAuth._notifyOne(cb);
  }

  /** One faulty subscriber must not stop the others or abort the caller */
  private static _notifyOne(cb: () => void) {
    try {
      cb();
    } catch (e) {
      console.error("github-auth: onDidChange subscriber threw", e);
    }
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
