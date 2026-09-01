import { isV1, isV2, migrateV1 } from "./migrate";
import { foldRecord } from "./ledger";
import { EMPTY_STORED } from "./events";
import type { LessonPath } from "./types";

const hints: [string, string, string] = ["a", "b", "c"];

const PATH: LessonPath = {
  tutorial: "Hello Anchor",
  steps: [
    {
      id: "write",
      objective: "Define hello",
      verifiedBy: "the interface shows hello",
      verify: { kind: "idl", instruction: "hello" },
      target: "build",
      hints,
    },
    {
      id: "deploy",
      objective: "Deploy it",
      verifiedBy: "it is on devnet",
      verify: { kind: "deployed" },
      target: "deploy",
      hints,
    },
    {
      id: "client",
      objective: "Call it from the client",
      verifiedBy: "you have read the page",
      verify: { kind: "read" },
      target: "interact",
      hints,
    },
  ],
};

describe("migrateV1", () => {
  it("replays a v1 record into the ledger it always claimed", () => {
    const r = migrateV1(PATH, {
      completedStepIds: ["write", "deploy"],
      currentStepId: "client",
    });
    const v = foldRecord(PATH, r);
    expect(v.marks.get("write")).toBe("proved");
    expect(v.marks.get("deploy")).toBe("proved");
    expect(v.marks.get("client")).toBe("open");
    expect(v.cursor).toBe(2);
  });

  it("migrates a completed read step to attested, never proved", () => {
    const r = migrateV1(PATH, {
      completedStepIds: ["write", "deploy", "client"],
      currentStepId: null,
    });
    const v = foldRecord(PATH, r);
    expect(v.marks.get("client")).toBe("attested");
    expect(v.cursor).toBe("end");
  });

  it("migrates skips to passed", () => {
    const r = migrateV1(PATH, {
      completedStepIds: [],
      skippedStepIds: ["write"],
      currentStepId: "deploy",
    });
    const v = foldRecord(PATH, r);
    expect(v.marks.get("write")).toBe("passed");
    expect(v.cursor).toBe(1);
  });

  it("collapses D-b's duplicate completions on the way in", () => {
    const r = migrateV1(PATH, {
      completedStepIds: ["write", "deploy", "deploy", "deploy", "deploy"],
      currentStepId: "client",
    });
    expect(
      r.events.filter((e) => e.type === "graded" || e.type === "attest")
    ).toHaveLength(2);
    const v = foldRecord(PATH, r);
    expect(v.marks.get("deploy")).toBe("proved");
  });

  it("never synthesizes a timestamp or claims an actor", () => {
    const r = migrateV1(PATH, {
      completedStepIds: ["write"],
      skippedStepIds: ["deploy"],
      currentStepId: "client",
    });
    expect(r.events.length).toBeGreaterThan(0);
    for (const e of r.events) {
      expect(e.at).toBeNull();
      expect(e.actor).toBe("unknown");
    }
  });

  it("restores the position the learner stood on", () => {
    const r = migrateV1(PATH, {
      completedStepIds: ["write", "deploy"],
      currentStepId: "write",
    });
    expect(foldRecord(PATH, r).cursor).toBe(0);
  });

  it("leaves the cursor at the frontier when v1 had no pointer", () => {
    const r = migrateV1(PATH, {
      completedStepIds: ["write"],
      currentStepId: null,
    });
    expect(foldRecord(PATH, r).cursor).toBe(1);
  });

  it("ignores ids that name no step", () => {
    const r = migrateV1(PATH, {
      completedStepIds: ["gone", "write"],
      currentStepId: "also-gone",
    });
    const v = foldRecord(PATH, r);
    expect(v.marks.get("write")).toBe("proved");
    expect(v.cursor).toBe(1);
  });
});

describe("shape guards", () => {
  it("recognize v1", () => {
    expect(isV1({ completedStepIds: [], currentStepId: null })).toBe(true);
    expect(
      isV1({ completedStepIds: ["a"], skippedStepIds: [], currentStepId: "b" })
    ).toBe(true);
    expect(isV1(EMPTY_STORED)).toBe(false);
    expect(isV1(null)).toBe(false);
    expect(isV1({ anything: 1 })).toBe(false);
  });

  it("recognize v2", () => {
    expect(isV2(EMPTY_STORED)).toBe(true);
    expect(isV2({ v: 2, events: [] })).toBe(true);
    expect(isV2({ completedStepIds: [], currentStepId: null })).toBe(false);
    expect(isV2({ v: 1, events: [] })).toBe(false);
    expect(isV2("junk")).toBe(false);
  });
});
