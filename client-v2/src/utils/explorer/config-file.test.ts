import { writeConfigFile } from "./config-file";
import { PgFs } from "./fs";

const mock = PgFs as unknown as {
  __files: Map<string, string>;
  __reloadBeforeTreeSave: () => void;
};

describe("writeConfigFile", () => {
  beforeEach(() => mock.__files.clear());

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("flushes the folder tree when the write creates the file", async () => {
    const flush = vi.spyOn(PgFs, "flush");

    await writeConfigFile("/.config/a.json", "1");
    mock.__reloadBeforeTreeSave();

    expect(flush).toHaveBeenCalledTimes(1);
    expect(mock.__files.get("/.config/a.json")).toBe("1");
  });

  it("does not flush when the file already exists", async () => {
    await writeConfigFile("/.config/b.json", "1");
    const flush = vi.spyOn(PgFs, "flush");

    await writeConfigFile("/.config/b.json", "2");

    expect(flush).not.toHaveBeenCalled();
    expect(mock.__files.get("/.config/b.json")).toBe("2");
  });

  it("flushes again for a file created again after its removal", async () => {
    await writeConfigFile("/.config/c.json", "1");
    await PgFs.removeFile("/.config/c.json");
    const flush = vi.spyOn(PgFs, "flush");

    await writeConfigFile("/.config/c.json", "2");

    expect(flush).toHaveBeenCalledTimes(1);
  });

  it("keeps the write when the flush fails", async () => {
    vi.spyOn(PgFs, "flush").mockRejectedValueOnce(new Error("quota"));

    await expect(
      writeConfigFile("/.config/d.json", "1")
    ).resolves.toBeUndefined();
    expect(mock.__files.get("/.config/d.json")).toBe("1");
  });
});
