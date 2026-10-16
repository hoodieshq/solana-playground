import { PgExplorer } from "../explorer";
import { PgTutorial } from "./tutorial";

describe("PgTutorial.getStorage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates the parent folders and flushes the directory tree after a write", async () => {
    const calls: string[] = [];
    vi.spyOn(PgExplorer.fs, "readToJSONOrDefault").mockImplementation(
      async (_path, defaultValue) => defaultValue
    );
    const write = vi
      .spyOn(PgExplorer.fs, "writeFile")
      .mockImplementation(async () => {
        calls.push("write");
      });
    vi.spyOn(PgExplorer.fs, "flush").mockImplementation(async () => {
      calls.push("flush");
    });

    await PgTutorial.getStorage<{ lesson: string }>({ lesson: "" }).setItem(
      "lesson",
      "x"
    );

    expect(write).toHaveBeenCalledTimes(1);
    expect(write.mock.calls[0][2]).toEqual({ createParents: true });
    // The tree is saved after the content, not before it
    expect(calls).toEqual(["write", "flush"]);
  });
});
