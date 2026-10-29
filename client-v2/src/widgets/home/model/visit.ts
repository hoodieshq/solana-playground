/**
 * What leads Home, by visit (spec `client-v2-first-run`): `first` for a
 * browser known to hold no project with no one signed in, `return` once it
 * holds one, and `unknown` while the list has not loaded, the session has
 * not been read, or a signed-in account's projects are on their way by sync
 */
export type Visit = "first" | "return" | "unknown";

/** The session as far as the visit goes: not read yet, nobody, or someone */
export type SessionSeen = "unread" | "out" | "in";

export const visitOf = (
  names: readonly string[] | undefined,
  session: SessionSeen
): Visit => {
  if (!names) return "unknown";
  if (names.length) return "return";
  return session === "out" ? "first" : "unknown";
};

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  describe("widgets/home/model/visit", () => {
    it("is a first visit with no project and no session", () => {
      expect(visitOf([], "out")).toBe("first");
    });

    it("is a return visit once the browser holds a project", () => {
      expect(visitOf(["a"], "out")).toBe("return");
      expect(visitOf(["a"], "in")).toBe("return");
    });

    it("is unknown before the list loads, or while an account's projects arrive", () => {
      expect(visitOf(undefined, "out")).toBe("unknown");
      expect(visitOf([], "in")).toBe("unknown");
    });

    it("is unknown until the session has been read", () => {
      expect(visitOf([], "unread")).toBe("unknown");
    });
  });
}
