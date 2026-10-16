import { PgExplorer } from "./explorer";
import { initLogger, memoryProvider, resetLogger } from "../shared/lib/logger";
import { PgProgramInfo } from "./program-info";

// `settings.ts`, reached through the connection module, reads a global that
// only exists once the app has booted
vi.hoisted(() => {
  vi.stubGlobal("GLOBAL_SETTINGS", { default: {} });
});

// The wasm packages are built separately and absent from a plain checkout
vi.mock("./package", () => ({ PgPackage: {} }));

// Only their change events are read, to refetch the on-chain data
vi.mock("./command", () => ({
  PgCommand: { deploy: { onDidFinish: () => ({ dispose: () => {} }) } },
}));
vi.mock("./connection", () => ({
  PgConnection: { onDidChange: () => ({ dispose: () => {} }) },
}));

describe("PgProgramInfo storage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates the parent folders and flushes the directory tree after a write", async () => {
    const calls: string[] = [];
    vi.spyOn(PgExplorer, "isInitialized", "get").mockReturnValue(true);
    vi.spyOn(PgExplorer, "currentWorkspaceName", "get").mockReturnValue("w");
    vi.spyOn(PgExplorer.fs, "readToJSON").mockRejectedValue(new Error("none"));
    const write = vi
      .spyOn(PgExplorer.fs, "writeFile")
      .mockImplementation(async () => {
        calls.push("write");
      });
    vi.spyOn(PgExplorer.fs, "flush").mockImplementation(async () => {
      calls.push("flush");
    });

    const init = await PgProgramInfo.init();
    try {
      await PgProgramInfo.refresh();
      write.mockClear();
      calls.length = 0;

      PgProgramInfo.uuid = "build-1";
      await vi.waitFor(() => expect(calls).toEqual(["write", "flush"]));
    } finally {
      init.dispose();
    }

    expect(write).toHaveBeenCalledTimes(1);
    expect(write.mock.calls[0][2]).toEqual({ createParents: true });
  });

  it("reports a write that fails rather than leaving it unhandled", async () => {
    const logged = memoryProvider();
    initLogger({ providers: [logged] });
    vi.spyOn(PgExplorer, "isInitialized", "get").mockReturnValue(true);
    vi.spyOn(PgExplorer, "currentWorkspaceName", "get").mockReturnValue("w");
    vi.spyOn(PgExplorer.fs, "readToJSON").mockRejectedValue(new Error("none"));
    vi.spyOn(PgExplorer.fs, "writeFile").mockResolvedValue(undefined);
    const flush = vi
      .spyOn(PgExplorer.fs, "flush")
      .mockRejectedValue(new Error("disk full"));

    const init = await PgProgramInfo.init();
    try {
      await PgProgramInfo.refresh();
      flush.mockClear();

      // `updatable` calls `storage.write` without awaiting it, so a failure
      // must be caught and logged inside it, or it is an unhandled rejection
      PgProgramInfo.uuid = "build-1";
      await vi.waitFor(() => expect(flush).toHaveBeenCalled());
      await vi.waitFor(() => expect(logged.entries).toHaveLength(1));
      expect(logged.entries[0].ns).toBe("program-info:storage");
      expect(logged.entries[0].error?.message).toBe("disk full");
      expect(logged.entries[0].report).toBe(true);
    } finally {
      init.dispose();
      resetLogger();
    }
  });
});
