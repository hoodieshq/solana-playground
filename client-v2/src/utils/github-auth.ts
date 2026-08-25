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
