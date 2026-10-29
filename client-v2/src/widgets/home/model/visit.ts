/**
 * What leads Home, by visit (spec `client-v2-first-run`): `return` once the
 * browser holds a project, `first` when it is known to hold none and the
 * session has answered (signed in or not), and `unknown` while the list or
 * the session has not, a failed read included: it says nothing of who is
 * signed in or what sync will bring
 */
export type Visit = "first" | "return" | "unknown";

/** How the session read went: `PgSession.readState`, by type only */
export type SessionSeen = import("@/features/auth").ReadState;

/** A project in the browser wins over the session; then the session decides */
export const visitOf = (
  names: readonly string[] | undefined,
  session: SessionSeen
): Visit => {
  if (!names) return "unknown";
  if (names.length) return "return";
  return session === "answered" ? "first" : "unknown";
};

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  describe("widgets/home/model/visit", () => {
    it("is a first visit with no project once the session has answered", () => {
      expect(visitOf([], "answered")).toBe("first");
    });

    it("is a return visit once the browser holds a project", () => {
      expect(visitOf(["a"], "answered")).toBe("return");
      expect(visitOf(["a"], "failed")).toBe("return");
    });

    it("is unknown before the list loads", () => {
      expect(visitOf(undefined, "answered")).toBe("unknown");
    });

    it("is unknown until the session answers, and after a failed read", () => {
      expect(visitOf([], "unread")).toBe("unknown");
      expect(visitOf([], "failed")).toBe("unknown");
    });
  });
}
