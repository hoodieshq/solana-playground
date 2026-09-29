import { PgSyncMark } from "./sync-mark";
import { PgSession } from "../../auth";
import { PgFs } from "../../../utils/explorer/fs";

const storedFiles = () =>
  (PgFs as unknown as { __files: Map<string, string> }).__files;

describe("PgSyncMark", () => {
  beforeEach(async () => {
    PgSession.reset();
    storedFiles().clear();
    await PgSession.refreshWith({
      id: "u1",
      name: null,
      image: null,
      login: null,
    });
  });

  it("round-trips per-file hashes", async () => {
    const mark = {
      files: { a: "h1" },
      name: "one",
      updatedAt: "t1",
      dirty: false,
    };
    await PgSyncMark.write("p1", mark);
    expect(await PgSyncMark.read("p1")).toEqual(mark);
  });

  it("reads a mark from before per-file hashes as never agreed", async () => {
    // Written by the previous version of the app. Trusting it would compare
    // against hashes it does not have; reading it as absent sends the project
    // down the path for a copy this device has never agreed on, which settles
    // identical copies silently and asks, per file, about the rest.
    storedFiles().set(
      "/.config/sync/u1/p1.json",
      JSON.stringify({
        hash: "x",
        contentHash: "y",
        name: "one",
        updatedAt: "t1",
        dirty: false,
      })
    );
    expect(await PgSyncMark.read("p1")).toBeNull();
  });

  it("refuses a file map that is not strings", async () => {
    storedFiles().set(
      "/.config/sync/u1/p1.json",
      JSON.stringify({
        files: { a: 1 },
        name: "one",
        updatedAt: "t1",
        dirty: false,
      })
    );
    expect(await PgSyncMark.read("p1")).toBeNull();
  });
});
