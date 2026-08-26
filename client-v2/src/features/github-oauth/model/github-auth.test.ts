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
    new MessageEvent("message", {
      data: message,
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
  data: unknown,
  /** Defaults to the popup itself; pass another window to test the source check */
  source?: unknown
) => {
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
      data,
      origin,
      source: (source ?? popup) as unknown as Window,
    })
  );
  await new Promise((r) => setTimeout(r, 0));

  expect(global.fetch).not.toHaveBeenCalled();
  expect(settled).toBe(false);
  expect(PgGithubAuth.token).toBeNull();

  // Complete it legitimately so the listener is cleaned up
  window.dispatchEvent(
    new MessageEvent("message", {
      data: { type: "pg-github-auth", token: "gho_ok" },
      origin: window.location.origin,
      source: popup as unknown as Window,
    })
  );
  await promise;
  openSpy.mockRestore();
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

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should be signed out initially and reject the airdrop pre-check", () => {
    expect(PgGithubAuth.user).toBeNull();
    expect(PgGithubAuth.token).toBeNull();
    expect(() => checkGithubSignIn()).toThrow(/sign in with github/i);
  });

  it("should store identity on a well-formed message from own origin", async () => {
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

  it("should ignore a message from a foreign origin", async () => {
    await expectIgnored("https://evil.test", {
      type: "pg-github-auth",
      token: "gho_evil",
    });
  });

  it("should ignore a message with a wrong type", async () => {
    await expectIgnored(window.location.origin, {
      type: "other",
      token: "gho_evil",
    });
  });

  it("should ignore a non-object payload", async () => {
    await expectIgnored(window.location.origin, "gho_evil");
  });

  /** The same-origin project iframe can post; only the popup we opened counts */
  it("should ignore a valid message from another same-origin window", async () => {
    await expectIgnored(
      window.location.origin,
      { type: "pg-github-auth", token: "gho_evil" },
      { closed: false, close: jest.fn() }
    );
  });

  it("should relay a server error payload and stay signed out", async () => {
    const result = await completeSignIn({
      type: "pg-github-auth",
      error: "state mismatch",
    });
    expect(result).toBe("state mismatch");
    expect(PgGithubAuth.token).toBeNull();
  });

  it("should clear an existing identity when a re-auth profile fetch fails", async () => {
    // Sign in for real first, so the assertion cannot pass by never having run
    await completeSignIn({ type: "pg-github-auth", token: "gho_x" });
    expect(PgGithubAuth.token).toBe("gho_x");

    const cb = jest.fn();
    const { dispose } = PgGithubAuth.onDidChange(cb);
    cb.mockClear(); // onDidChange fires once on subscribe

    (global.fetch as jest.Mock).mockResolvedValue({ ok: false });
    const result = await completeSignIn({
      type: "pg-github-auth",
      token: "gho_y",
    });

    expect(result).toMatch(/profile/i);
    expect(PgGithubAuth.token).toBeNull();
    expect(PgGithubAuth.user).toBeNull();
    expect(cb).toHaveBeenCalled();
    dispose();
  });

  it("should keep the session when an onDidChange subscriber throws", async () => {
    const { dispose } = PgGithubAuth.onDidChange(() => {
      throw new Error("subscriber blew up");
    });
    const result = await completeSignIn({
      type: "pg-github-auth",
      token: "gho_x",
    });
    expect(result).toBe("resolved");
    expect(PgGithubAuth.token).toBe("gho_x");
    dispose();
  });

  it("should reject when the popup is blocked", async () => {
    const openSpy = jest.spyOn(window, "open").mockReturnValue(null);
    await expect(PgGithubAuth.signIn()).rejects.toThrow(/popup/i);
    openSpy.mockRestore();
  });

  it("should clear state and notify on signOut", async () => {
    await completeSignIn({ type: "pg-github-auth", token: "gho_x" });
    const cb = jest.fn();
    const { dispose } = PgGithubAuth.onDidChange(cb);
    cb.mockClear(); // onDidChange fires once on subscribe
    PgGithubAuth.signOut();
    expect(cb).toHaveBeenCalledTimes(1);
    expect(PgGithubAuth.user).toBeNull();
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
      const promise = PgGithubAuth.signIn();
      const instance = FakeBroadcastChannel._instances.at(-1);
      expect(instance?.name).toBe("pg-github-auth");
      instance?.onmessage?.({
        data: { type: "pg-github-auth", token: "gho_channel" },
      });
      await promise;
      expect(PgGithubAuth.token).toBe("gho_channel");
      expect(PgGithubAuth.user).toEqual({
        login: "octocat",
        name: "The Octocat",
        avatarUrl: "https://example.test/a.png",
      });
    } finally {
      openSpy.mockRestore();
      (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel =
        original;
    }
  });

  it("should reject when the popup is closed without a message", async () => {
    jest.useFakeTimers();
    const popup = { closed: false, close: jest.fn() };
    const openSpy = jest
      .spyOn(window, "open")
      .mockReturnValue(popup as unknown as Window);
    const promise = PgGithubAuth.signIn();
    // Simulate popup being closed
    popup.closed = true;
    // Advance timers past one poll tick
    jest.advanceTimersByTime(500);
    const result = await promise.then(
      () => "resolved",
      (e: Error) => e.message
    );
    expect(result).toMatch(/cancelled/i);
    expect(PgGithubAuth.token).toBeNull();
    expect(PgGithubAuth.user).toBeNull();
    openSpy.mockRestore();
  });
});
