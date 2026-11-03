import { deflateRaw, inflateRaw } from "pako";

/** One file a docs page hands to Playground */
export interface DocsLink {
  /** File name, opened as `client/<name>` */
  name: string;
  /** The file's text */
  code: string;
  /** The project's title */
  title: string;
  /** The `https:` page the link came from */
  from: string | null;
  /** Devnet SOL the script needs before it can run */
  sol: number | null;
}

/** Why a link did not open */
export type DocsLinkFailure =
  | "missing"
  | "version"
  | "decode"
  | "size"
  | "name";

export type DecodedDocsLink =
  | { ok: true; link: DocsLink }
  | { ok: false; reason: DocsLinkFailure; from: string | null };

/** The one format version this client reads */
const VERSION = "1";

/** Largest file a link may carry, inflated */
export const MAX_DOCS_LINK_BYTES = 100 * 1024;

/** A file name a link may give: no folders, a script's extension */
const NAME_REGEX = /^[A-Za-z0-9._-]+\.(ts|js)$/;

/** Where "Back to the docs" goes when nothing better is known */
export const DOCS_HOME = "https://solana.com/docs";

/**
 * Read a URL only when it is `https:`, so a link can never point a button at
 * `javascript:` or a plain-HTTP page.
 *
 * @param value the URL as the link gives it
 * @returns the URL, or `null`
 */
const httpsUrlOf = (value: string | null): string | null => {
  if (!value) return null;
  try {
    return new URL(value).protocol === "https:" ? value : null;
  } catch {
    // Not a URL at all: the link has no usable source
    return null;
  }
};

const toBase64Url = (bytes: Uint8Array) => {
  let binary = "";
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

/** Read base64url, and plain base64 too: a hand-made link may use either */
const fromBase64 = (text: string): Uint8Array => {
  const standard = text.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(standard + "=".repeat((4 - (standard.length % 4)) % 4));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

/**
 * Inflate a link's `code`.
 *
 * @param code base64url of raw DEFLATE
 * @returns the text, or the failure
 */
const inflateCode = (
  code: string
): { ok: true; text: string } | { ok: false; reason: "decode" | "size" } => {
  let bytes: Uint8Array | undefined;
  try {
    bytes = inflateRaw(fromBase64(code));
  } catch {
    // Not base64, or not a DEFLATE stream: the link was damaged in transit
    return { ok: false, reason: "decode" };
  }
  // pako answers a stream cut short with nothing rather than a throw
  if (!bytes) return { ok: false, reason: "decode" };
  if (!bytes.length || bytes.length > MAX_DOCS_LINK_BYTES) {
    return { ok: false, reason: "size" };
  }
  try {
    return {
      ok: true,
      text: new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    };
  } catch {
    // Bytes that are not UTF-8 are not a script
    return { ok: false, reason: "decode" };
  }
};

/**
 * Read a docs link from the URL's fragment.
 *
 * @param fragment the fragment, with or without its `#`
 * @returns the link, or why it is broken and the source page if readable
 */
export const decodeDocsLink = (fragment: string): DecodedDocsLink => {
  const params = new URLSearchParams(fragment.replace(/^#/, ""));
  const from = httpsUrlOf(params.get("from"));
  const fail = (reason: DocsLinkFailure): DecodedDocsLink => ({
    ok: false,
    reason,
    from,
  });

  const version = params.get("v");
  const code = params.get("code");
  const name = params.get("name");
  if (!version || !code || !name) return fail("missing");
  if (version !== VERSION) return fail("version");
  if (!NAME_REGEX.test(name)) return fail("name");

  const solParam = params.get("sol");
  const sol = solParam === null ? null : Number(solParam);
  if (sol !== null && !(Number.isFinite(sol) && sol > 0)) {
    return fail("missing");
  }

  const inflated = inflateCode(code);
  if (!inflated.ok) return fail(inflated.reason);

  return {
    ok: true,
    link: {
      name,
      code: inflated.text,
      title: params.get("title") || name.replace(/\.(ts|js)$/, ""),
      from,
      sol,
    },
  };
};

/**
 * Write a docs link's fragment, as the docs site builds it.
 *
 * @param link the file and what travels with it
 * @returns the fragment, without its `#`
 */
export const encodeDocsLink = (
  link: Omit<DocsLink, "title"> & { title?: string }
): string => {
  const params = new URLSearchParams({ v: VERSION, name: link.name });
  if (link.title) params.set("title", link.title);
  if (link.from) params.set("from", link.from);
  if (link.sol !== null) params.set("sol", String(link.sol));
  params.set(
    "code",
    toBase64Url(deflateRaw(new TextEncoder().encode(link.code)))
  );
  return params.toString();
};

/**
 * Where "Back to the docs" goes: the link's own page, else the page the user
 * came from when it is Solana's, else the docs' home.
 *
 * @param from the link's `from`, already checked to be `https:`
 * @param referrer `document.referrer`
 * @returns the URL to go to
 */
export const backToDocsHref = (from: string | null, referrer: string) => {
  if (from) return from;
  const fromReferrer = httpsUrlOf(referrer);
  if (fromReferrer) {
    const { hostname } = new URL(fromReferrer);
    if (hostname === "solana.com" || hostname.endsWith(".solana.com")) {
      return fromReferrer;
    }
  }
  return DOCS_HOME;
};

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  describe("features/docs-link/lib/link", () => {
    const SCRIPT = [
      'import { createClient } from "@solana/kit";',
      'console.log("Step 1: Check a balance");',
      "const amount = 1_000_000n; // ünïcödé survives",
    ].join("\n");
    const QUICKSTART = {
      name: "quickstart.ts",
      code: SCRIPT,
      title: "Quickstart",
      from: "https://solana.com/docs/quickstart",
      sol: 0.02,
    };

    it("reads back every field it wrote", () => {
      expect(decodeDocsLink(encodeDocsLink(QUICKSTART))).toEqual({
        ok: true,
        link: QUICKSTART,
      });
    });

    it("takes the title from the name when the link has none", () => {
      const fragment = encodeDocsLink({
        name: "hello.ts",
        code: "console.log(1)",
        from: null,
        sol: null,
      });
      const decoded = decodeDocsLink(`#${fragment}`);
      expect(decoded.ok && decoded.link.title).toBe("hello");
    });

    it("names why a link is broken", () => {
      const good = new URLSearchParams(encodeDocsLink(QUICKSTART));
      const withParam = (key: string, value: string | null) => {
        const params = new URLSearchParams(good);
        if (value === null) params.delete(key);
        else params.set(key, value);
        return decodeDocsLink(params.toString());
      };
      const code = good.get("code")!;
      const reasonOf = (decoded: DecodedDocsLink) =>
        decoded.ok ? "ok" : decoded.reason;

      expect(reasonOf(withParam("code", null))).toBe("missing");
      expect(reasonOf(withParam("v", "2"))).toBe("version");
      expect(reasonOf(withParam("code", code.slice(0, -40)))).toBe("decode");
      expect(reasonOf(withParam("code", "%%%"))).toBe("decode");
      expect(reasonOf(withParam("name", "a.rs"))).toBe("name");
      expect(reasonOf(withParam("name", "../a.ts"))).toBe("name");
      expect(reasonOf(withParam("sol", "-1"))).toBe("missing");
      expect(reasonOf(withParam("sol", "lots"))).toBe("missing");

      const tooBig = encodeDocsLink({
        name: "a.ts",
        code: "x".repeat(MAX_DOCS_LINK_BYTES + 1),
        from: null,
        sol: null,
      });
      expect(reasonOf(decodeDocsLink(tooBig))).toBe("size");
    });

    it("keeps the source page of a broken link", () => {
      const decoded = decodeDocsLink(
        "v=1&name=a.ts&from=https%3A%2F%2Fsolana.com%2Fdocs%2Fquickstart"
      );
      expect(decoded).toEqual({
        ok: false,
        reason: "missing",
        from: "https://solana.com/docs/quickstart",
      });
    });

    it("reads plain base64 as well as base64url", () => {
      const params = new URLSearchParams(encodeDocsLink(QUICKSTART));
      const plain = params.get("code")!.replace(/-/g, "+").replace(/_/g, "/");
      params.set("code", plain);
      expect(decodeDocsLink(params.toString()).ok).toBe(true);
    });

    it("never uses a source that is not https", () => {
      const decoded = decodeDocsLink("v=1&from=javascript%3Aalert(1)");
      expect(decoded.ok || decoded.from).toBeNull();
    });

    it("sends Back to the docs to the best page it knows", () => {
      const from = "https://solana.com/docs/quickstart";
      expect(backToDocsHref(from, "")).toBe(from);
      expect(backToDocsHref(null, "https://solana.com/docs/payments")).toBe(
        "https://solana.com/docs/payments"
      );
      expect(backToDocsHref(null, "https://evil.example/solana.com")).toBe(
        DOCS_HOME
      );
      expect(backToDocsHref(null, "http://solana.com/docs")).toBe(DOCS_HOME);
      expect(backToDocsHref(null, "")).toBe(DOCS_HOME);
    });
  });
}
