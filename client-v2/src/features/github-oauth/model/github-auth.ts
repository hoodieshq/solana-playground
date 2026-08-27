import {
  CHANNEL_NAME,
  FLOW_MAX_AGE_SECONDS,
  GITHUB_USER_URL,
  MESSAGE_TYPE,
  OAUTH_ROUTE,
} from "../config.mjs";
import { openPopupChannel } from "../lib/popup-channel";
import type { PopupChannel, PopupChannelFailure } from "../lib/popup-channel";
import type { Disposable } from "../../../utils/types";

export interface GithubUser {
  login: string;
  name: string | null;
  avatarUrl: string;
}

interface AuthMessage {
  /** Checked against `MESSAGE_TYPE` by the guard below, never read after */
  type: string;
  /** Echo of the per-flow nonce; see `signIn` */
  nonce?: string;
  token?: string;
  error?: string;
}

const isAuthMessage = (data: unknown): data is AuthMessage =>
  !!data &&
  typeof data === "object" &&
  (data as Record<string, unknown>).type === MESSAGE_TYPE;

/**
 * What an unanswered wait means to the person who clicked.
 *
 * The three stay apart all the way to the wording: telling someone they
 * cancelled a sign-in they completed sends them to retry the wrong thing.
 */
const FAILURE_MESSAGE: Record<PopupChannelFailure, string> = {
  cancelled: "Sign-in was cancelled.",
  rejected: "Sign-in could not be verified. Try again.",
  expired: "Sign-in did not finish. Try again.",
};

/** 128 bits of hex - matches the `isFlowNonce` shape the handler validates */
const randomNonce = () =>
  [...crypto.getRandomValues(new Uint8Array(16))]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

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
 *
 * TODO: sign-in currently buys identity and nothing else - programs still
 * live in this browser's `PgExplorer` storage, so a signed-in user loses
 * their work on another machine. Persist workspaces against the GitHub
 * identity instead of locally. Needs a scope wider than the empty one above,
 * which is the decision to make first.
 */
export class GithubAuth {
  static get user(): GithubUser | null {
    return GithubAuth._state?.user ?? null;
  }

  static get token(): string | null {
    return GithubAuth._state?.token ?? null;
  }

  /** Whether a sign-in is waiting on the popup right now */
  static get isSigningIn(): boolean {
    return GithubAuth._inFlight !== null;
  }

  /**
   * Run the OAuth popup flow, or join the one already running.
   *
   * A second click must not open a second flow: `window.open` reuses the
   * window by name, so the first wait would be left listening for a nonce the
   * handler has already replaced, and would read the reply as a forgery.
   */
  static signIn(): Promise<void> {
    if (GithubAuth._inFlight) return GithubAuth._inFlight;
    const flow = GithubAuth._signIn().finally(() => {
      GithubAuth._inFlight = null;
      GithubAuth._channel = null;
    });
    GithubAuth._inFlight = flow;
    return flow;
  }

  /**
   * Give up on the running flow.
   *
   * The popup handle is disowned the moment GitHub commits a page of its own,
   * so an explicit request is the only cancellation the app can observe - see
   * the note at the top of `popup-channel.ts`.
   */
  static cancelSignIn() {
    GithubAuth._channel?.cancel();
  }

  /**
   * Opens `/api/github-oauth?action=start`; the callback page posts the
   * result to `window.opener`, which is addressed and pinned by
   * targetOrigin, and falls back to a same-origin `BroadcastChannel` when
   * COOP has severed the opener. Window messages must additionally come
   * from our own origin and from the popup itself; the nonce below is what
   * guards the broadcast path, which no window binding can reach.
   */
  private static async _signIn(): Promise<void> {
    // A BroadcastChannel reaches every same-origin context, so shape alone
    // cannot tell our popup's reply from anything else on the page. The
    // handler pins this in an HttpOnly cookie and echoes it back; script here
    // can read neither the cookie nor this closure, so it cannot forge a match.
    const flowNonce = randomNonce();
    const channel = openPopupChannel({
      url: `${OAUTH_ROUTE}?action=start&nonce=${flowNonce}`,
      name: CHANNEL_NAME,
      features: "width=980,height=720",
      broadcastName: CHANNEL_NAME,
      accept: (data) => isAuthMessage(data) && data.nonce === flowNonce,
      // Only our own message shape may count as a forgery; the page posts
      // plenty else, the project iframe included
      claims: isAuthMessage,
      // Waiting past the handler's cookies would leave the user on a flow the
      // server has already forgotten
      timeoutMs: FLOW_MAX_AGE_SECONDS * 1000,
    });
    if (!channel) throw new Error("Allow popups for this site to sign in.");
    GithubAuth._channel = channel;

    const receipt = await channel.receive();
    if (!receipt.delivered) throw new Error(FAILURE_MESSAGE[receipt.reason]);

    const message = receipt.data;
    if (!isAuthMessage(message)) throw new Error("Sign-in was cancelled.");
    if (message.error || !message.token) {
      throw new Error(message.error ?? "Sign-in was cancelled.");
    }

    // Only the fetch is guarded: a throwing subscriber inside `_notify` must
    // not be mistaken for a failed profile fetch and wipe the session
    const token = message.token;
    let failure: Error | undefined;
    try {
      const user = await GithubAuth._fetchUser(token);
      GithubAuth._state = { token, user };
    } catch (e) {
      // Never keep a token without an identity to show
      GithubAuth._state = null;
      failure = e as Error;
    }
    GithubAuth._notify();
    if (failure) throw failure;
  }

  static signOut() {
    GithubAuth._state = null;
    GithubAuth._notify();
  }

  static onDidChange(cb: () => void): Disposable {
    GithubAuth._listeners.add(cb);
    GithubAuth._notifyOne(cb);
    return { dispose: () => GithubAuth._listeners.delete(cb) };
  }

  /** Test-only: back to the signed-out state without notifying */
  static _reset() {
    GithubAuth._state = null;
    GithubAuth._channel = null;
    GithubAuth._inFlight = null;
    GithubAuth._listeners.clear();
  }

  private static async _fetchUser(token: string): Promise<GithubUser> {
    const resp = await fetch(GITHUB_USER_URL, {
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
    for (const cb of GithubAuth._listeners) GithubAuth._notifyOne(cb);
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
  private static _channel: PopupChannel | null = null;
  private static _inFlight: Promise<void> | null = null;
  private static _listeners: Set<() => void> = new Set();
}

/** Command pre-check: the airdrop demo requires a GitHub identity */
export const checkGithubSignIn = () => {
  if (!GithubAuth.user) {
    throw new Error("Sign in with GitHub to request devnet SOL.");
  }
};
