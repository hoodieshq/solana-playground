import { clearFailures, getFailures } from "./diagnostics";
import {
  keepLocalKeypair,
  merge3,
  planMerge,
  PROGRAM_INFO_PATH,
  settleConflicts,
  baseAfterMerge,
} from "./merge";
import type { MergeInput } from "./merge";

const lines = (...xs: string[]) => xs.join("\n");

describe("merge3", () => {
  const base = lines("a", "b", "c", "d", "e", "");

  it("takes the one side that changed", () => {
    const edited = lines("a", "B", "c", "d", "e", "");
    expect(merge3(base, edited, base)).toBe(edited);
    expect(merge3(base, base, edited)).toBe(edited);
  });

  it("merges edits to lines far apart", () => {
    expect(
      merge3(
        base,
        lines("A", "b", "c", "d", "e", ""),
        lines("a", "b", "c", "d", "E", "")
      )
    ).toBe(lines("A", "b", "c", "d", "E", ""));
  });

  it("merges an insertion with a deletion elsewhere", () => {
    expect(
      merge3(
        base,
        lines("x", "a", "b", "c", "d", "e", ""),
        lines("a", "b", "c", "e", "")
      )
    ).toBe(lines("x", "a", "b", "c", "e", ""));
  });

  it("accepts the same edit made on both sides", () => {
    const same = lines("a", "B", "c", "d", "e", "");
    expect(merge3(base, same, same)).toBe(same);
    expect(
      merge3(
        base,
        lines("A", "B", "c", "d", "e", ""),
        lines("a", "B", "c", "d", "e", "")
      )
    ).toBeNull();
  });

  it("refuses edits to the same line", () => {
    expect(
      merge3(
        base,
        lines("a", "mine", "c", "d", "e", ""),
        lines("a", "theirs", "c", "d", "e", "")
      )
    ).toBeNull();
  });

  it("refuses edits to adjacent lines, the way git does", () => {
    expect(
      merge3(
        base,
        lines("a", "B", "c", "d", "e", ""),
        lines("a", "b", "C", "d", "e", "")
      )
    ).toBeNull();
  });

  it("tells a deleted line from one replaced by a blank line", () => {
    const five = "a\nb\nc\nd\ne";
    const deleted = "a\nc\nd\nE";
    const blanked = "a\n\nc\nd\ne";
    expect(merge3(five, deleted, blanked)).toBeNull();
    expect(merge3(five, blanked, deleted)).toBeNull();
  });

  it("tells a deleted final line from an emptied one", () => {
    expect(merge3("a\nb", "a\n", "a")).toBeNull();
    expect(merge3("a\nb", "a", "a\n")).toBeNull();
  });

  it("keeps a missing trailing newline and CRLF endings byte for byte", () => {
    const crlf = "a\r\nb\r\nc\r\nd\r\ne";
    expect(merge3(crlf, "A\r\nb\r\nc\r\nd\r\ne", "a\r\nb\r\nc\r\nd\r\nE")).toBe(
      "A\r\nb\r\nc\r\nd\r\nE"
    );
  });
});

describe("planMerge", () => {
  const h = (content: string) => `h(${content})`;
  const input = (
    base: Record<string, string>,
    local: Record<string, string>,
    server: Record<string, string>,
    baseContents: Record<string, string> = {}
  ): MergeInput => {
    const hashes = (files: Record<string, string>) =>
      Object.fromEntries(Object.entries(files).map(([p, c]) => [p, h(c)]));
    return {
      base: hashes(base),
      baseContents: Object.fromEntries(
        Object.entries(baseContents).map(([p, c]) => [
          p,
          { hash: h(c), content: c },
        ])
      ),
      local,
      localHashes: hashes(local),
      server,
      serverHashes: hashes(server),
    };
  };

  it("takes each side's changes to different files", () => {
    const plan = planMerge(
      input({ a: "1", b: "1" }, { a: "2", b: "1" }, { a: "1", b: "3" })
    );
    expect(plan).toEqual({ files: { a: "2", b: "3" }, conflicts: [] });
  });

  it("carries a delete from either side", () => {
    const plan = planMerge(input({ a: "1", b: "1" }, { b: "1" }, { a: "1" }));
    expect(plan).toEqual({ files: {}, conflicts: [] });
  });

  it("keeps a file added on one side only", () => {
    expect(planMerge(input({}, { a: "1" }, {})).files).toEqual({ a: "1" });
  });

  it("merges lines within a file when the base content is known", () => {
    const base = "a\nb\nc\nd\ne";
    const plan = planMerge(
      input(
        { f: base },
        { f: "A\nb\nc\nd\ne" },
        { f: "a\nb\nc\nd\nE" },
        { f: base }
      )
    );
    expect(plan).toEqual({ files: { f: "A\nb\nc\nd\nE" }, conflicts: [] });
  });

  it("asks about a file whose base content was never captured", () => {
    const plan = planMerge(input({ f: "a" }, { f: "b" }, { f: "c" }));
    expect(plan.conflicts).toEqual(["f"]);
    expect(plan.files).toEqual({});
  });

  it("does not trust base content that belongs to another agreement", () => {
    const i = input({ f: "a\nb\nc" }, { f: "A\nb\nc" }, { f: "a\nb\nC" });
    i.baseContents = { f: { hash: "h(something else)", content: "a\nb\nc" } };
    expect(planMerge(i).conflicts).toEqual(["f"]);
  });

  it("asks about a file deleted on one side and edited on the other", () => {
    expect(planMerge(input({ f: "a" }, {}, { f: "b" })).conflicts).toEqual([
      "f",
    ]);
  });

  it("asks about a file both sides added differently", () => {
    expect(planMerge(input({}, { f: "a" }, { f: "b" })).conflicts).toEqual([
      "f",
    ]);
  });

  it("lets the server win a generated workspace file without asking", () => {
    const keypair = ".workspace/program-info.json";
    const plan = planMerge(
      input({ [keypair]: "0" }, { [keypair]: "local" }, { [keypair]: "server" })
    );
    expect(plan).toEqual({ files: { [keypair]: "server" }, conflicts: [] });
  });

  it("keeps this device's keypair when the server's changed copy has none", () => {
    const plan = planMerge(
      input(
        { [PROGRAM_INFO_PATH]: info({ kp: null }) },
        { [PROGRAM_INFO_PATH]: info({ kp: DEVICE_KP }) },
        { [PROGRAM_INFO_PATH]: info({ kp: null, idl: "theirs" }) }
      )
    );
    expect(plan.conflicts).toEqual([]);
    expect(JSON.parse(plan.files[PROGRAM_INFO_PATH])).toEqual({
      ...JSON.parse(info({ kp: null, idl: "theirs" })),
      kp: DEVICE_KP,
    });
  });

  it("still lets the server's keypair win over a different one here", () => {
    const theirs = info({ kp: ACCOUNT_KP, idl: "theirs" });
    const plan = planMerge(
      input(
        { [PROGRAM_INFO_PATH]: info({ kp: null }) },
        { [PROGRAM_INFO_PATH]: info({ kp: DEVICE_KP }) },
        { [PROGRAM_INFO_PATH]: theirs }
      )
    );
    expect(plan).toEqual({
      files: { [PROGRAM_INFO_PATH]: theirs },
      conflicts: [],
    });
  });
});

/** Two different 64-byte secret keys, in the array form `PgProgramInfo` stores */
const DEVICE_KP = Array.from({ length: 64 }, (_, i) => i);
const ACCOUNT_KP = Array.from({ length: 64 }, (_, i) => 255 - i);

/** A `program-info.json` as `PgProgramInfo` serialises it */
const info = (fields: { kp: number[] | null; idl?: string }) =>
  JSON.stringify({
    uuid: "build-uuid",
    idl: fields.idl ?? null,
    kp: fields.kp,
    customPk: null,
    lastBuildFailed: false,
  });

describe("keepLocalKeypair", () => {
  beforeEach(clearFailures);
  afterEach(clearFailures);

  it("carries this device's keypair into an account copy that has none", () => {
    const account = info({ kp: null, idl: "theirs" });
    const kept = keepLocalKeypair(info({ kp: DEVICE_KP }), account);
    // Every other field is the account's
    expect(JSON.parse(kept!)).toEqual({
      ...JSON.parse(account),
      kp: DEVICE_KP,
    });
  });

  it("carries it into an account copy with no kp field at all", () => {
    const account = JSON.stringify({ uuid: "theirs" });
    expect(
      JSON.parse(keepLocalKeypair(info({ kp: DEVICE_KP }), account)!)
    ).toEqual({ uuid: "theirs", kp: DEVICE_KP });
  });

  it("carries only the keypair when the account has no copy at all", () => {
    expect(
      JSON.parse(keepLocalKeypair(info({ kp: DEVICE_KP }), undefined)!)
    ).toEqual({ kp: DEVICE_KP });
  });

  it("keeps the account's copy when both hold different keypairs", () => {
    const account = info({ kp: ACCOUNT_KP });
    expect(keepLocalKeypair(info({ kp: DEVICE_KP }), account)).toBe(account);
  });

  it("keeps the account's copy when this device has no keypair", () => {
    const account = info({ kp: null, idl: "theirs" });
    expect(keepLocalKeypair(info({ kp: null }), account)).toBe(account);
    expect(keepLocalKeypair(undefined, account)).toBe(account);
    expect(keepLocalKeypair(undefined, undefined)).toBeUndefined();
    expect(keepLocalKeypair(info({ kp: null }), undefined)).toBeUndefined();
    // Nothing is wrong with a project that was never built
    expect(getFailures()).toEqual([]);
  });

  it("keeps the account's copy, and says so, when either side is not JSON", () => {
    const account = info({ kp: null });
    expect(keepLocalKeypair("{not json", account)).toBe(account);
    expect(keepLocalKeypair(info({ kp: DEVICE_KP }), "{not json")).toBe(
      "{not json"
    );
    expect(getFailures()).toHaveLength(2);
  });

  it("keeps the account's copy when either side is not the stored shape", () => {
    const account = info({ kp: null });
    expect(keepLocalKeypair(JSON.stringify([1, 2]), account)).toBe(account);
    expect(keepLocalKeypair(JSON.stringify({ kp: "abc" }), account)).toBe(
      account
    );
    expect(keepLocalKeypair(JSON.stringify({ kp: [1, 2, 3] }), account)).toBe(
      account
    );
    expect(keepLocalKeypair(info({ kp: DEVICE_KP }), "null")).toBe("null");
    expect(keepLocalKeypair(info({ kp: DEVICE_KP }), "[]")).toBe("[]");
  });
});

describe("settling", () => {
  const plan = { files: { a: "merged" }, conflicts: ["b", "c"] };
  const local = { a: "l", b: "local b" };
  const server = { a: "s", b: "server b", c: "server c" };

  it("fills conflicted files from the side the user picked", () => {
    expect(settleConflicts(plan, "local", local, server)).toEqual({
      a: "merged",
      b: "local b",
    });
    expect(settleConflicts(plan, "server", local, server)).toEqual({
      a: "merged",
      b: "server b",
      c: "server c",
    });
  });

  it("keeps as base the server's version of every file this device still differs on", () => {
    expect(
      baseAfterMerge(
        { a: "same", b: "mine", d: "new here" },
        { a: "same", b: "theirs", c: "gone here" },
        { a: "ha", b: "hb", c: "hc" }
      )
    ).toEqual({
      b: { hash: "hb", content: "theirs" },
      c: { hash: "hc", content: "gone here" },
    });
  });
});
