import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../utils/explorer/explorer", () => ({
  PgExplorer: {
    currentWorkspaceName: null as string | null,
    convertToFullPath: (path: string) => `/root/ws/${path}`,
    getFileContent: vi.fn(),
  },
}));
vi.mock("../../../utils/explorer/apply-file", () => ({
  applyFile: vi.fn(async () => {}),
}));

import { WorkspaceMovedError, realWorkspace } from "./real-workspace";
import { applyFile } from "../../../utils/explorer/apply-file";
import { PgExplorer } from "../../../utils/explorer/explorer";

const setWorkspace = (name: string | null) => {
  (PgExplorer as { currentWorkspaceName: string | null }).currentWorkspaceName =
    name;
};

beforeEach(() => {
  vi.mocked(applyFile).mockClear();
  vi.mocked(PgExplorer.getFileContent).mockReturnValue("content" as never);
});

describe("realWorkspace", () => {
  it("reads and writes the open workspace", async () => {
    setWorkspace("Hello Anchor");
    await expect(
      realWorkspace.read("src/lib.rs", "Hello Anchor")
    ).resolves.toBe("content");
    await realWorkspace.write("src/lib.rs", "new", "Hello Anchor");
    expect(applyFile).toHaveBeenCalledWith("src/lib.rs", "new");
  });

  it("reads null for a file that is not there", async () => {
    setWorkspace("Hello Anchor");
    vi.mocked(PgExplorer.getFileContent).mockReturnValue(undefined as never);
    await expect(
      realWorkspace.read("client/client.ts", "Hello Anchor")
    ).resolves.toBeNull();
  });

  it("refuses to touch any workspace but the one the effect was queued for", async () => {
    setWorkspace("Other");
    await expect(
      realWorkspace.write("src/lib.rs", "new", "Hello Anchor")
    ).rejects.toBeInstanceOf(WorkspaceMovedError);
    await expect(
      realWorkspace.read("src/lib.rs", "Hello Anchor")
    ).rejects.toThrow("The workspace is Other, not Hello Anchor");
    expect(applyFile).not.toHaveBeenCalled();
  });
});
