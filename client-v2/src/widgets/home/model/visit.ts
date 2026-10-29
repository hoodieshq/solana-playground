/**
 * What leads Home, by visit (spec `client-v2-first-run`): `first` for a
 * browser known to hold no project with no one signed in, `return` once it
 * holds one, and `unknown` while the list has not loaded or a signed-in
 * account's projects are still on their way by sync
 */
export type Visit = "first" | "return" | "unknown";

export const visitOf = (
  names: readonly string[] | undefined,
  signedIn: boolean
): Visit => {
  if (!names) return "unknown";
  if (names.length) return "return";
  return signedIn ? "unknown" : "first";
};

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  describe("widgets/home/model/visit", () => {
    it("is a first visit with no project and no session", () => {
      expect(visitOf([], false)).toBe("first");
    });

    it("is a return visit once the browser holds a project", () => {
      expect(visitOf(["a"], false)).toBe("return");
      expect(visitOf(["a"], true)).toBe("return");
    });

    it("is unknown before the list loads, or while an account's projects arrive", () => {
      expect(visitOf(undefined, false)).toBe("unknown");
      expect(visitOf([], true)).toBe("unknown");
    });
  });
}
