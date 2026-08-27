import { GithubAuth, checkGithubSignIn } from "./github-auth";

/** Shaped like the `/user` response: snake_case, as GitHub sends it */
const PROFILE = {
  login: "stub-user",
  name: "Stub User",
  avatar_url: "https://example.test/avatar.png",
};

/** `PROFILE` after the mapping under test - spelled out so a rename can't hide it */
const EXPECTED_USER = {
  login: PROFILE.login,
  name: PROFILE.name,
  avatarUrl: PROFILE.avatar_url,
};

/** The per-flow nonce the client actually put on the `start` URL */
const flowNonceFrom = (openSpy: jest.SpyInstance) =>
  new URL(
    String(openSpy.mock.calls.at(-1)?.[0]),
    window.location.origin
  ).searchParams.get("nonce");

/** Resolve a `signIn()` round trip by faking the popup and the message */
const completeSignIn = async (
  message: unknown,
  origin: string = window.location.origin
) => {
  const popup = { closed: false, close: jest.fn() };
  const openSpy = jest
    .spyOn(window, "open")
    .mockReturnValue(popup as unknown as Window);
  const promise = GithubAuth.signIn();
  const data =
    message && typeof message === "object"
      ? { ...message, nonce: flowNonceFrom(openSpy) }
      : message;
  window.dispatchEvent(
    new MessageEvent("message", {
      data,
      origin,
      source: popup as unknown as Window,
    })
  );
  const result = await promise.then(
    () => "resolved",
    (e: Error) => e.message
  );
  openSpy.mockRestore();
  return result;
};

/**
 * Assert a message never reaches the accept path. `fetch` not being called is
 * the signal unique to rejection - a null token is also what you get when
 * nothing ran at all.
 */
const expectIgnored = async (
  origin: string,
  /** Receives the real nonce, so each case can vary exactly one thing */
  makeData: (nonce: string | null) => unknown,
  /** Defaults to the popup itself; pass another window to test the source check */
  source?: unknown
) => {
  const popup = { closed: false, close: jest.fn() };
  const openSpy = jest
    .spyOn(window, "open")
    .mockReturnValue(popup as unknown as Window);
  let settled = false;
  const promise = GithubAuth.signIn().finally(() => {
    settled = true;
  });
  const nonce = flowNonceFrom(openSpy);

  window.dispatchEvent(
    new MessageEvent("message", {
      data: makeData(nonce),
      origin,
      source: (source ?? popup) as unknown as Window,
    })
  );
  await new Promise((r) => setTimeout(r, 0));

  expect(global.fetch).not.toHaveBeenCalled();
  expect(settled).toBe(false);
  expect(GithubAuth.token).toBeNull();

  // Complete it legitimately so the listener is cleaned up
  window.dispatchEvent(
    new MessageEvent("message", {
      data: { type: "pg-github-auth", nonce, token: "gho_ok" },
      origin: window.location.origin,
      source: popup as unknown as Window,
    })
  );
  await promise;
  openSpy.mockRestore();
};

type BroadcastListener = ((ev: { data: unknown }) => void) | null;

/** Stands in for the callback page's end of the same-origin broadcast bus */
class FakeBroadcastChannel {
  onmessage: BroadcastListener = null;
  constructor(public name: string) {
    FakeBroadcastChannel._instances.push(this);
  }
  postMessage() {
    // Nothing sends on this end - tests play the callback page by driving
    // `onmessage` directly.
  }
  close() {}
  static _instances: FakeBroadcastChannel[] = [];
}

/** Swap the global in, and hand back the way to put it back */
const installFakeBroadcastChannel = () => {
  const original = (globalThis as { BroadcastChannel?: unknown })
    .BroadcastChannel;
  FakeBroadcastChannel._instances = [];
  (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel =
    FakeBroadcastChannel;
  return {
    instances: FakeBroadcastChannel._instances,
    restore: () => {
      (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel =
        original;
    },
  };
};

describe("GithubAuth", () => {
  beforeEach(() => {
    GithubAuth._reset();
    (global.fetch as jest.Mock | undefined)?.mockRestore?.();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(PROFILE),
    }) as jest.Mock;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should be signed out initially and reject the airdrop pre-check", () => {
    expect(GithubAuth.user).toBeNull();
    expect(GithubAuth.token).toBeNull();
    expect(() => checkGithubSignIn()).toThrow(/sign in with github/i);
  });

  it("should store identity on a well-formed message from own origin", async () => {
    const result = await completeSignIn({
      type: "pg-github-auth",
      token: "gho_x",
    });
    expect(result).toBe("resolved");
    expect(GithubAuth.token).toBe("gho_x");
    expect(GithubAuth.user).toEqual(EXPECTED_USER);
    expect(() => checkGithubSignIn()).not.toThrow();
  });

  it("should ignore a message from a foreign origin", async () => {
    await expectIgnored("https://evil.test", (nonce) => ({
      type: "pg-github-auth",
      nonce,
      token: "gho_evil",
    }));
  });

  it("should ignore a message with a wrong type", async () => {
    await expectIgnored(window.location.origin, (nonce) => ({
      type: "other",
      nonce,
      token: "gho_evil",
    }));
  });

  it("should ignore a non-object payload", async () => {
    await expectIgnored(window.location.origin, () => "gho_evil");
  });

  /** The same-origin project iframe can post; only the popup we opened counts */
  it("should ignore a valid message from another same-origin window", async () => {
    await expectIgnored(
      window.location.origin,
      (nonce) => ({ type: "pg-github-auth", nonce, token: "gho_evil" }),
      { closed: false, close: jest.fn() }
    );
  });

  it("should ignore a message carrying the wrong nonce", async () => {
    await expectIgnored(window.location.origin, () => ({
      type: "pg-github-auth",
      nonce: "0".repeat(32),
      token: "gho_evil",
    }));
  });

  it("should report a rejected reply as unverified, not as cancelled", async () => {
    jest.useFakeTimers();
    const popup = { closed: false, close: jest.fn() };
    const openSpy = jest
      .spyOn(window, "open")
      .mockReturnValue(popup as unknown as Window);
    const promise = GithubAuth.signIn();

    // Right shape, right window, wrong nonce - a forgery, not a cancellation
    window.dispatchEvent(
      new MessageEvent("message", {
        data: { type: "pg-github-auth", nonce: "0".repeat(32), token: "evil" },
        origin: window.location.origin,
        source: popup as unknown as Window,
      })
    );

    jest.advanceTimersByTime(600_000);

    const result = await promise.then(
      () => "resolved",
      (e: Error) => e.message
    );
    expect(result).toMatch(/could not be verified/i);
    expect(GithubAuth.token).toBeNull();
    openSpy.mockRestore();
  });

  it("should relay a server error payload and stay signed out", async () => {
    const result = await completeSignIn({
      type: "pg-github-auth",
      error: "state mismatch",
    });
    expect(result).toBe("state mismatch");
    expect(GithubAuth.token).toBeNull();
  });

  it("should clear an existing identity when a re-auth profile fetch fails", async () => {
    // Sign in for real first, so the assertion cannot pass by never having run
    await completeSignIn({ type: "pg-github-auth", token: "gho_x" });
    expect(GithubAuth.token).toBe("gho_x");

    const cb = jest.fn();
    const { dispose } = GithubAuth.onDidChange(cb);
    cb.mockClear(); // onDidChange fires once on subscribe

    (global.fetch as jest.Mock).mockResolvedValue({ ok: false });
    const result = await completeSignIn({
      type: "pg-github-auth",
      token: "gho_y",
    });

    expect(result).toMatch(/profile/i);
    expect(GithubAuth.token).toBeNull();
    expect(GithubAuth.user).toBeNull();
    expect(cb).toHaveBeenCalled();
    dispose();
  });

  it("should keep the session when an onDidChange subscriber throws", async () => {
    const { dispose } = GithubAuth.onDidChange(() => {
      throw new Error("subscriber blew up");
    });
    const result = await completeSignIn({
      type: "pg-github-auth",
      token: "gho_x",
    });
    expect(result).toBe("resolved");
    expect(GithubAuth.token).toBe("gho_x");
    dispose();
  });

  it("should reject when the popup is blocked", async () => {
    const openSpy = jest.spyOn(window, "open").mockReturnValue(null);
    await expect(GithubAuth.signIn()).rejects.toThrow(/popup/i);
    openSpy.mockRestore();
  });

  it("should clear state and notify on signOut", async () => {
    await completeSignIn({ type: "pg-github-auth", token: "gho_x" });
    const cb = jest.fn();
    const { dispose } = GithubAuth.onDidChange(cb);
    cb.mockClear(); // onDidChange fires once on subscribe
    GithubAuth.signOut();
    expect(cb).toHaveBeenCalledTimes(1);
    expect(GithubAuth.user).toBeNull();
    dispose();
  });

  it("should store identity on a token delivered via BroadcastChannel", async () => {
    type Listener = ((ev: { data: unknown }) => void) | null;
    class FakeBroadcastChannel {
      onmessage: Listener = null;
      constructor(public name: string) {
        FakeBroadcastChannel._instances.push(this);
      }
      postMessage() {
        // Nothing sends on this end in the test - the fake plays the
        // callback page's role by driving `onmessage` directly.
      }
      close() {}
      static _instances: FakeBroadcastChannel[] = [];
    }

    const original = (globalThis as { BroadcastChannel?: unknown })
      .BroadcastChannel;
    (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel =
      FakeBroadcastChannel;

    const popup = { closed: false, close: jest.fn() };
    const openSpy = jest
      .spyOn(window, "open")
      .mockReturnValue(popup as unknown as Window);

    try {
      const promise = GithubAuth.signIn();
      const instance = FakeBroadcastChannel._instances.at(-1);
      expect(instance?.name).toBe("pg-github-auth");
      instance?.onmessage?.({
        data: {
          type: "pg-github-auth",
          nonce: flowNonceFrom(openSpy),
          token: "gho_channel",
        },
      });
      await promise;
      expect(GithubAuth.token).toBe("gho_channel");
      expect(GithubAuth.user).toEqual(EXPECTED_USER);
    } finally {
      openSpy.mockRestore();
      (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel =
        original;
    }
  });

  it("should report an explicit cancel as a cancellation", async () => {
    const popup = { closed: false, close: jest.fn() };
    const openSpy = jest
      .spyOn(window, "open")
      .mockReturnValue(popup as unknown as Window);
    const promise = GithubAuth.signIn();

    GithubAuth.cancelSignIn();

    const result = await promise.then(
      () => "resolved",
      (e: Error) => e.message
    );
    expect(result).toMatch(/cancelled/i);
    // Spares the user a click while the handle is still ours to close
    expect(popup.close).toHaveBeenCalled();
    expect(GithubAuth.token).toBeNull();
    expect(GithubAuth.user).toBeNull();
    openSpy.mockRestore();
  });

  it("should report an unanswered wait as unfinished, not cancelled", async () => {
    jest.useFakeTimers();
    const popup = { closed: false, close: jest.fn() };
    const openSpy = jest
      .spyOn(window, "open")
      .mockReturnValue(popup as unknown as Window);
    const promise = GithubAuth.signIn();

    // The handler's cookies expire at ten minutes; the wait ends with them
    jest.advanceTimersByTime(600_000);

    const result = await promise.then(
      () => "resolved",
      (e: Error) => e.message
    );
    expect(result).toMatch(/did not finish/i);
    expect(GithubAuth.token).toBeNull();
    openSpy.mockRestore();
  });

  /**
   * `window.open` reuses the window by name, so a second flow re-navigates the
   * first one and replaces the handler's nonce. The first wait would then turn
   * the reply away as a forgery - which is what "could not be verified" on a
   * double click used to be.
   */
  it("should join a sign-in already in flight rather than open another", async () => {
    const popup = { closed: false, close: jest.fn() };
    const openSpy = jest
      .spyOn(window, "open")
      .mockReturnValue(popup as unknown as Window);

    const first = GithubAuth.signIn();
    const second = GithubAuth.signIn();
    expect(second).toBe(first);
    expect(openSpy).toHaveBeenCalledTimes(1);

    window.dispatchEvent(
      new MessageEvent("message", {
        data: {
          type: "pg-github-auth",
          nonce: flowNonceFrom(openSpy),
          token: "gho_once",
        },
        origin: window.location.origin,
        source: popup as unknown as Window,
      })
    );

    await first;
    expect(GithubAuth.token).toBe("gho_once");
    openSpy.mockRestore();
  });
});
