import { helloAnchorPath } from "./hello-anchor";
import { validatePath } from "../registry";

describe("the Hello Anchor path", () => {
  it("is valid against the tutorial it names", () => {
    expect(() => validatePath(helloAnchorPath, ["Hello Anchor"])).not.toThrow();
  });

  it("has four steps", () => {
    expect(helloAnchorPath.steps).toHaveLength(4);
  });

  it("ends by checking that hello gained a name argument", () => {
    const last = helloAnchorPath.steps[3];
    expect(last.verify).toEqual({
      kind: "idl",
      instruction: "hello",
      arg: "name",
    });
  });

  it("gives every step three hints and a target stage", () => {
    for (const step of helloAnchorPath.steps) {
      expect(step.hints).toHaveLength(3);
      expect(["write", "build", "deploy", "interact"]).toContain(step.target);
    }
  });

  it("never promises a check it cannot make", () => {
    // The cut verifies the build, the deploy and the IDL. A step whose
    // `verifiedBy` mentions a transaction would be overclaiming -- see
    // the spec's honesty map.
    for (const step of helloAnchorPath.steps) {
      expect(step.verifiedBy.toLowerCase()).not.toContain("transaction");
    }
  });

  it("loads its prose from the tutorial", async () => {
    const page = await helloAnchorPath.steps[0].readPage?.();
    expect(typeof page).toBe("string");
    expect(page).toContain("Anchor");
  });
});
