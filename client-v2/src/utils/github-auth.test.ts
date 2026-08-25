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

  afterEach(() => {
    jest.useRealTimers();
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

  it("rejects when the popup is closed without a message", async () => {
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
