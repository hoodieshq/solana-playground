// `@types/mocha` also declares a global `it`, without `each`
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";

import {
  initLogger,
  memoryProvider,
  resetLogger,
} from "../../../shared/lib/logger";
import { PgSession } from "./session";

const signedIn = (user: {
  id: string;
  name: string | null;
  image?: string | null;
  login?: string | null;
}) =>
  vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ user }),
  }) as unknown as typeof fetch;

describe("PgSession", () => {
  afterEach(() => {
    (global.fetch as Mock | undefined)?.mockReset?.();
    vi.restoreAllMocks();
    PgSession.reset();
    resetLogger();
  });

  it("is signed out before any refresh", () => {
    expect(PgSession.get()).toBeNull();
  });

  it("reads the user from the session endpoint", async () => {
    global.fetch = signedIn({ id: "u1", name: "Ada", image: null });

    await PgSession.refresh();

    expect(PgSession.get()).toEqual({
      id: "u1",
      name: "Ada",
      image: null,
      login: null,
    });
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/auth/get-session",
      expect.objectContaining({ credentials: "include" })
    );
  });

  it("treats an empty session body as signed out", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => null,
    }) as unknown as typeof fetch;

    await PgSession.refresh();

    expect(PgSession.get()).toBeNull();
  });

  it.each([
    ["a request that throws", new Error("offline"), "error", true],
    ["a 5xx", 503, "error", true],
    ["a 4xx", 404, "warn", false],
  ] as const)(
    "treats %s as signed out, and logs it",
    async (_label, answer, level, report) => {
      const request = vi.spyOn(globalThis, "fetch");
      if (answer instanceof Error) request.mockRejectedValue(answer);
      else request.mockResolvedValue({ ok: false, status: answer } as Response);
      const logged = memoryProvider();
      initLogger({ providers: [logged] });

      await PgSession.refresh();

      expect(PgSession.get()).toBeNull();
      expect(logged.entries).toEqual([
        expect.objectContaining({ ns: "auth:session", level, report }),
      ]);
    }
  );

  it("notifies subscribers when the user changes", async () => {
    global.fetch = signedIn({ id: "u1", name: null, image: null });
    const seen: unknown[] = [];
    const sub = PgSession.onDidChange(() => seen.push(PgSession.get()));

    await PgSession.refresh();
    sub.dispose();

    expect(seen).toEqual([{ id: "u1", name: null, image: null, login: null }]);
  });

  it("does not notify when the user is unchanged", async () => {
    global.fetch = signedIn({ id: "u1", name: "Ada", image: null });
    await PgSession.refresh();

    let calls = 0;
    const sub = PgSession.onDidChange(() => calls++);
    await PgSession.refresh();
    sub.dispose();

    expect(calls).toBe(0);
  });

  it("signs in through a popup, not a navigation, and re-reads the session", async () => {
    // `sign-in/social` is POST-only and answers with the authorize URL rather
    // than redirecting, which is what lets us open a popup instead of
    // navigating away and losing everything the page holds in memory
    global.fetch = vi.fn().mockImplementation((url: string) =>
      url === "/api/auth/sign-in/social"
        ? Promise.resolve({
            ok: true,
            json: async () => ({ url: "https://github.com/login/oauth/x" }),
          })
        : Promise.resolve({
            ok: true,
            json: async () => ({
              user: { id: "u1", name: "Ada", image: null, login: "ada" },
            }),
          })
    ) as unknown as typeof fetch;

    let opened: { url: string; broadcastName?: string } | undefined;
    PgSession.setOpenChannel((opts) => {
      opened = opts;
      return {
        receive: async () => ({ delivered: true as const, data: {} }),
        cancel: () => {},
      };
    });

    await PgSession.signIn();

    expect(opened!.url).toBe("https://github.com/login/oauth/x");
    // The fallback path for when COOP severs window.opener
    expect(opened!.broadcastName).toBe("pg-auth-complete");
    // Cookie is set on our origin by the callback, so the session is readable
    expect(PgSession.get()).toEqual({
      id: "u1",
      name: "Ada",
      image: null,
      login: "ada",
    });
  });

  it("sends the popup to the completion route carrying a nonce", async () => {
    let body: string | undefined;
    global.fetch = vi
      .fn()
      .mockImplementation((url: string, init: RequestInit) => {
        if (url === "/api/auth/sign-in/social") {
          body = init.body as string;
          return Promise.resolve({
            ok: true,
            json: async () => ({ url: "https://x/" }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ user: { id: "u1" } }),
        });
      }) as unknown as typeof fetch;
    PgSession.setOpenChannel(() => ({
      receive: async () => ({ delivered: true as const, data: {} }),
      cancel: () => {},
    }));

    await PgSession.signIn();

    const sent = JSON.parse(body!);
    expect(sent.provider).toBe("github");
    expect(sent.callbackURL).toMatch(
      /^\/api\/auth-complete\?nonce=[0-9a-f]{32}$/
    );
  });

  it("only accepts a reply carrying this flow's nonce", async () => {
    global.fetch = vi
      .fn()
      .mockImplementation((url: string, init: RequestInit) =>
        url === "/api/auth/sign-in/social"
          ? Promise.resolve({
              ok: true,
              json: async () => ({ url: "https://x/" }),
            })
          : Promise.resolve({
              ok: true,
              json: async () => ({ user: { id: "u1" } }),
            })
      ) as unknown as typeof fetch;

    let accept!: (data: unknown) => boolean;
    let nonce!: string;
    PgSession.setOpenChannel((opts) => {
      accept = opts.accept;
      return {
        receive: async () => ({ delivered: true as const, data: {} }),
        cancel: () => {},
      };
    });
    const originalFetch = global.fetch as Mock;
    await PgSession.signIn();
    nonce = JSON.parse(originalFetch.mock.calls[0][1].body).callbackURL.split(
      "nonce="
    )[1];

    expect(accept({ type: "pg-auth-complete", nonce })).toBe(true);
    expect(accept({ type: "pg-auth-complete", nonce: "forged" })).toBe(false);
    expect(accept({ type: "something-else", nonce })).toBe(false);
  });

  it("says the session could not be read when the popup finished but no user is signed in", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      async (input) =>
        ({
          ok: true,
          json: async () =>
            input === "/api/auth/get-session" ? null : { url: "https://x/" },
        } as Response)
    );
    PgSession.setOpenChannel(() => ({
      receive: async () => ({ delivered: true as const, data: {} }),
      cancel: () => {},
    }));

    await expect(PgSession.signIn()).rejects.toThrow(
      "Signed in with GitHub, but the session could not be read. Try again."
    );
  });

  it("reports a blocked popup distinctly from a failed sign-in", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ url: "https://x/" }),
    }) as unknown as typeof fetch;
    PgSession.setOpenChannel(() => undefined);

    await expect(PgSession.signIn()).rejects.toThrow(/allow popups/i);
  });

  it("surfaces a cancelled popup as a cancellation", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ url: "https://x/" }),
    }) as unknown as typeof fetch;
    PgSession.setOpenChannel(() => ({
      receive: async () => ({
        delivered: false as const,
        reason: "cancelled" as const,
      }),
      cancel: () => {},
    }));

    await expect(PgSession.signIn()).rejects.toThrow(/cancelled/i);
    expect(PgSession.get()).toBeNull();
  });

  it("throws rather than opening a popup when sign-in cannot start", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ error: "Authentication is not configured" }),
    }) as unknown as typeof fetch;
    const open = vi.fn();
    PgSession.setOpenChannel(open as never);

    await expect(PgSession.signIn()).rejects.toThrow(/sign-in/i);
    expect(open).not.toHaveBeenCalled();
  });

  it("signs out and clears the user", async () => {
    global.fetch = signedIn({ id: "u1", name: "Ada", image: null });
    await PgSession.refresh();
    expect(PgSession.get()).not.toBeNull();

    await PgSession.signOut();

    expect(PgSession.get()).toBeNull();
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/auth/sign-out",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("stays signed in when sign-out fails on the network", async () => {
    global.fetch = signedIn({ id: "u1", name: "Ada", image: null });
    await PgSession.refresh();

    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));

    await expect(PgSession.signOut()).rejects.toThrow(/could not sign out/i);
    expect(PgSession.get()?.id).toBe("u1");
  });

  it("stays signed in, and says so, when the server refuses the sign-out", async () => {
    // The cookie is HttpOnly and survives a refused sign-out, so a reload
    // signed the user straight back in after the header had said otherwise
    global.fetch = signedIn({ id: "u1", name: "Ada", image: null });
    await PgSession.refresh();
    const logged = memoryProvider();
    initLogger({ providers: [logged] });

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 500,
    } as Response);

    await expect(PgSession.signOut()).rejects.toThrow(/could not sign out/i);
    expect(PgSession.get()?.id).toBe("u1");
    expect(logged.entries).toEqual([
      expect.objectContaining({
        ns: "auth:session",
        level: "error",
        report: true,
        context: { step: "request", status: 500 },
      }),
    ]);
  });

  it("runs the teardown only once the server has ended the session", async () => {
    global.fetch = signedIn({ id: "u1", name: "Ada", image: null });
    await PgSession.refresh();
    const order: string[] = [];
    PgSession.setOnSignOut(async () => {
      order.push("hand over");
      return async () => {
        // Still readable: what the teardown removes is keyed by the user id
        order.push(`teardown as ${PgSession.get()?.id}`);
      };
    });
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      order.push("request");
      return { ok: true } as Response;
    });

    await PgSession.signOut();

    expect(order).toEqual(["hand over", "request", "teardown as u1"]);
    expect(PgSession.get()).toBeNull();
  });

  it("skips the teardown when the server refuses the sign-out", async () => {
    // The user is still signed in, so their conversation and projects stay
    global.fetch = signedIn({ id: "u1", name: "Ada", image: null });
    await PgSession.refresh();
    const teardown = vi.fn().mockResolvedValue(undefined);
    PgSession.setOnSignOut(async () => teardown);
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 500,
    } as Response);

    await expect(PgSession.signOut()).rejects.toThrow();

    expect(teardown).not.toHaveBeenCalled();
  });

  it("still signs out when the teardown fails, and reports it", async () => {
    global.fetch = signedIn({ id: "u1", name: "Ada", image: null });
    await PgSession.refresh();
    const logged = memoryProvider();
    initLogger({ providers: [logged] });
    const failure = new Error("quota");
    PgSession.setOnSignOut(async () => async () => {
      throw failure;
    });
    vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true } as Response);

    await PgSession.signOut();

    expect(PgSession.get()).toBeNull();
    expect(logged.entries).toEqual([
      expect.objectContaining({
        ns: "auth:session",
        level: "error",
        error: failure,
        report: true,
        context: { step: "teardown" },
      }),
    ]);
  });
});
