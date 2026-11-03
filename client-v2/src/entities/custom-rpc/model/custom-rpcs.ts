import { createLogger } from "@/shared/lib/logger";

const log = createLogger("custom-rpc:store");

/** A custom RPC the user saved, under a name of their own */
export interface CustomRpc {
  name: string;
  url: string;
}

export type UrlCheck =
  | { ok: true; url: string }
  | { ok: false; reason: "format" };

/** Plain HTTP only where the browser lets an HTTPS page call it */
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

/** The longest name a saved RPC keeps */
const NAME_MAX = 32;

/** `localStorage` key of the saved list */
const KEY = "customRpcs";

/**
 * Whether a typed value may be saved as an RPC (Spec 07): `https://`, or
 * `http://` on `localhost` or `127.0.0.1`, and nothing else. A saved URL is
 * normalised, so two spellings of one address compare equal.
 */
export const checkRpcUrl = (value: string): UrlCheck => {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return { ok: false, reason: "format" };
  }
  const secure = url.protocol === "https:";
  const local = url.protocol === "http:" && LOCAL_HOSTS.has(url.hostname);
  if (!url.hostname || (!secure && !local)) {
    return { ok: false, reason: "format" };
  }
  return { ok: true, url: url.href };
};

/**
 * What the page shows of a saved RPC's URL: its host, never the path or
 * query, which often carry a provider's API key
 */
export const hostOf = (url: string): string => new URL(url).host;

export type SaveResult =
  | { ok: true; rpc: CustomRpc }
  | { ok: false; reason: "format" }
  | { ok: false; reason: "duplicate"; name: string };

/** The stored list, keeping only entries that are still valid RPCs */
const read = (): CustomRpc[] => {
  const raw = localStorage.getItem(KEY);
  if (raw === null) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    log.warn("the saved custom RPCs are not JSON; reading none", {
      report: true,
    });
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.flatMap((entry): CustomRpc[] => {
    const { name, url } = (entry ?? {}) as { name?: unknown; url?: unknown };
    if (typeof url !== "string" || typeof name !== "string") return [];
    const check = checkRpcUrl(url);
    return check.ok ? [{ name, url: check.url }] : [];
  });
};

const listeners = new Set<() => void>();

const write = (list: CustomRpc[]) => {
  localStorage.setItem(KEY, JSON.stringify(list));
  listeners.forEach((cb) => cb());
};

/** Save `input`, over the entry saved under `replacing` when there is one */
const put = (input: CustomRpc, replacing: string | undefined): SaveResult => {
  const check = checkRpcUrl(input.url);
  if (!check.ok) return check;

  const list = read();
  const taken = list.find((r) => r.url === check.url && r.url !== replacing);
  if (taken) return { ok: false, reason: "duplicate", name: taken.name };

  const name = input.name.trim().slice(0, NAME_MAX) || hostOf(check.url);
  const rpc = { name, url: check.url };
  const at = list.findIndex((r) => r.url === replacing);
  if (at === -1) list.push(rpc);
  else list[at] = rpc;
  write(list);
  return { ok: true, rpc };
};

/** The saved custom RPCs, kept in this browser under their own key */
export const PgCustomRpcs = {
  list: read,

  /** Save a new RPC; an empty name saves as the URL's host */
  save(input: CustomRpc): SaveResult {
    return put(input, undefined);
  },

  /** Replace the RPC saved under `url` in place, under the same rules */
  replace(url: string, input: CustomRpc): SaveResult {
    return put(input, url);
  },

  /** Drop the RPC saved under `url`; what and where, for an undo */
  remove(url: string): { rpc: CustomRpc; index: number } | undefined {
    const list = read();
    const index = list.findIndex((r) => r.url === url);
    if (index === -1) return undefined;
    const [rpc] = list.splice(index, 1);
    write(list);
    return { rpc, index };
  },

  /** Put a removed RPC back where it was */
  restore(rpc: CustomRpc, index: number): void {
    const list = read().filter((r) => r.url !== rpc.url);
    list.splice(Math.min(index, list.length), 0, rpc);
    write(list);
  },

  /**
   * List an endpoint the connection already uses, named by its host, when it
   * is a custom one: not offered, not listed, and an RPC we would save. So a
   * profile on a custom URL from before, or one set elsewhere, sees it.
   */
  adopt(endpoint: string, offered: readonly string[]): void {
    if (offered.includes(endpoint)) return;
    const check = checkRpcUrl(endpoint);
    if (!check.ok) return;
    const list = read();
    if (list.some((r) => r.url === check.url)) return;
    write([...list, { name: hostOf(check.url), url: check.url }]);
  },

  /** Fires on every change, this tab's or another's */
  onDidChange(cb: () => void): { dispose(): void } {
    const onStorage = (ev: StorageEvent) => {
      if (ev.key === KEY) cb();
    };
    listeners.add(cb);
    window.addEventListener("storage", onStorage);
    return {
      dispose: () => {
        listeners.delete(cb);
        window.removeEventListener("storage", onStorage);
      },
    };
  },
};

if (import.meta.vitest) {
  const { describe, it, expect, beforeEach, vi } = import.meta.vitest;

  describe("entities/custom-rpc/model/custom-rpcs", () => {
    beforeEach(() => {
      localStorage.clear();
    });

    const add = (name: string, url: string) => PgCustomRpcs.save({ name, url });

    /** Remove, then restore, as the toast's Undo does */
    const removeAndRestore = (url: string) => {
      const removed = PgCustomRpcs.remove(url);
      if (!removed) throw new Error(`not listed: ${url}`);
      PgCustomRpcs.restore(removed.rpc, removed.index);
    };

    describe("checkRpcUrl", () => {
      it.each([
        "devnet",
        "http://api.devnet.solana.com",
        "ftp://rpc.test",
        "",
        "https://",
      ])("refuses %j", (value) => {
        expect(checkRpcUrl(value)).toEqual({ ok: false, reason: "format" });
      });

      it.each([
        ["https://rpc.example.com", "https://rpc.example.com/"],
        ["http://localhost:8899", "http://localhost:8899/"],
        ["http://127.0.0.1:8899", "http://127.0.0.1:8899/"],
        [
          "  https://rpc.example.com/v1?k=1  ",
          "https://rpc.example.com/v1?k=1",
        ],
      ])("accepts %j as %j", (value, url) => {
        expect(checkRpcUrl(value)).toEqual({ ok: true, url });
      });
    });

    it("hostOf is the host alone, port included, never the path or query", () => {
      expect(hostOf("https://rpc.example.com/v1/key?api-key=s")).toBe(
        "rpc.example.com"
      );
      expect(hostOf("http://localhost:8899/")).toBe("localhost:8899");
    });

    it("saves an unnamed RPC under its host", () => {
      const saved = add("", "https://rpc.example.com/v1/k");
      expect(saved).toEqual({
        ok: true,
        rpc: { name: "rpc.example.com", url: "https://rpc.example.com/v1/k" },
      });
      expect(PgCustomRpcs.list()).toEqual([
        { name: "rpc.example.com", url: "https://rpc.example.com/v1/k" },
      ]);
    });

    it("trims a name and keeps at most 32 characters of it", () => {
      add(`  ${"x".repeat(40)}  `, "https://a.test");
      expect(PgCustomRpcs.list()[0].name).toBe("x".repeat(32));
    });

    it("refuses a URL that fails the rule, and saves nothing", () => {
      expect(add("", "http://api.devnet.solana.com")).toEqual({
        ok: false,
        reason: "format",
      });
      expect(PgCustomRpcs.list()).toEqual([]);
    });

    it("refuses a URL already saved, compared as a URL, naming the saved one", () => {
      add("Helius", "https://rpc.example.com/");
      expect(add("", "https://RPC.example.com")).toEqual({
        ok: false,
        reason: "duplicate",
        name: "Helius",
      });
    });

    it("keeps the order of saving, and persists across a fresh read", () => {
      add("A", "https://a.test");
      add("B", "https://b.test");
      const raw = JSON.parse(localStorage.getItem("customRpcs") ?? "null");
      expect(raw).toEqual([
        { name: "A", url: "https://a.test/" },
        { name: "B", url: "https://b.test/" },
      ]);
      expect(PgCustomRpcs.list().map((r) => r.name)).toEqual(["A", "B"]);
    });

    it("replaces an edited entry in place", () => {
      add("A", "https://a.test");
      add("B", "https://b.test");
      const edited = PgCustomRpcs.replace("https://a.test/", {
        name: "A2",
        url: "https://a2.test",
      });
      expect(edited.ok).toBe(true);
      expect(PgCustomRpcs.list()).toEqual([
        { name: "A2", url: "https://a2.test/" },
        { name: "B", url: "https://b.test/" },
      ]);
    });

    it("lets an edit keep its own URL, but not take another's", () => {
      add("A", "https://a.test");
      add("B", "https://b.test");
      expect(
        PgCustomRpcs.replace("https://a.test/", {
          name: "A!",
          url: "https://a.test",
        }).ok
      ).toBe(true);
      expect(
        PgCustomRpcs.replace("https://a.test/", {
          name: "A",
          url: "https://b.test",
        })
      ).toEqual({ ok: false, reason: "duplicate", name: "B" });
    });

    it("restores a removed entry where it was", () => {
      add("A", "https://a.test");
      add("B", "https://b.test");
      add("C", "https://c.test");
      const before = PgCustomRpcs.list();
      expect(PgCustomRpcs.remove("https://b.test/")).toEqual({
        rpc: { name: "B", url: "https://b.test/" },
        index: 1,
      });
      expect(PgCustomRpcs.list().map((r) => r.name)).toEqual(["A", "C"]);
      PgCustomRpcs.restore({ name: "B", url: "https://b.test/" }, 1);
      expect(PgCustomRpcs.list()).toEqual(before);
    });

    it("removing a URL not listed is undefined", () => {
      expect(PgCustomRpcs.remove("https://none.test/")).toBeUndefined();
    });

    it.each([
      ["not json", []],
      ["{}", []],
      [
        '[{"url":1},{"name":"a","url":"https://a.test"},{"name":"b","url":"devnet"}]',
        [{ name: "a", url: "https://a.test/" }],
      ],
    ])("reads a stored %j as the valid entries only", (raw, list) => {
      localStorage.setItem("customRpcs", raw);
      expect(PgCustomRpcs.list()).toEqual(list);
    });

    describe("adopt", () => {
      const OFFERED = ["https://devnet.platform.test/"];

      it("lists a custom endpoint under its host, once", () => {
        PgCustomRpcs.adopt("https://own.test/?k=1", OFFERED);
        PgCustomRpcs.adopt("https://own.test/?k=1", OFFERED);
        expect(PgCustomRpcs.list()).toEqual([
          { name: "own.test", url: "https://own.test/?k=1" },
        ]);
      });

      it.each(["https://devnet.platform.test/", "http://playnet", "devnet"])(
        "leaves %j out",
        (endpoint) => {
          PgCustomRpcs.adopt(endpoint, OFFERED);
          expect(PgCustomRpcs.list()).toEqual([]);
        }
      );
    });

    it("tells listeners about every change, and stops when disposed", () => {
      const cb = vi.fn();
      const sub = PgCustomRpcs.onDidChange(cb);
      add("A", "https://a.test");
      removeAndRestore("https://a.test/");
      expect(cb).toHaveBeenCalledTimes(3);
      sub.dispose();
      add("B", "https://b.test");
      expect(cb).toHaveBeenCalledTimes(3);
    });

    it("tells listeners when another tab writes the list", () => {
      const cb = vi.fn();
      const sub = PgCustomRpcs.onDidChange(cb);
      window.dispatchEvent(new StorageEvent("storage", { key: "customRpcs" }));
      window.dispatchEvent(new StorageEvent("storage", { key: "settings" }));
      expect(cb).toHaveBeenCalledTimes(1);
      sub.dispose();
    });
  });
}
