import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PlaygroundBridge } from "./bridge/playground-bridge";
import { PgPatchUndo } from "./patch-undo";
import { PgAssistant } from "./store";
import type { ChatItem } from "./store";

// The real bridge reaches the explorer and the settings, which need the
// build's globals; every test here hands the module a bridge of its own
vi.mock("./bridge/playground-bridge", () => ({ realBridge: {} }));

type ApprovalItem = Extract<ChatItem, { kind: "approval" }>;

describe("PgPatchUndo", () => {
  /** A bridge over one file, recording what it is asked to write */
  const fakeBridge = (content: string | null) => {
    const file = { content };
    const bridge = {
      readFile: () => file.content,
      applyPatch: vi.fn(async ({ content }: { content: string }) => {
        file.content = content;
      }),
      deleteFile: vi.fn(async () => {
        file.content = null;
      }),
    } as unknown as PlaygroundBridge;
    return { bridge, file };
  };

  /** An applied patch card, as the store holds it after Apply */
  const applied = async (before: string | null, after: string) => {
    const asked = PgAssistant.requestApproval({
      type: "patch",
      path: "src/lib.rs",
      before,
      after,
    });
    const card = PgAssistant.items[PgAssistant.items.length - 1];
    PgAssistant.resolveApproval(card.id, true);
    await asked;
    return PgAssistant.items.find((i): i is ApprovalItem => i.id === card.id)!;
  };

  beforeEach(() => {
    PgAssistant.clear();
  });

  it("can undo a patch this tab wrote while the file holds it", async () => {
    const card = await applied("old", "new");
    const { bridge } = fakeBridge("new");
    expect(PgPatchUndo.can(card, bridge)).toBe(false);
    PgPatchUndo.wrote(card.id);
    expect(PgPatchUndo.can(card, bridge)).toBe(true);
  });

  it("cannot undo a card restored from history", async () => {
    const card = await applied("old", "new");
    const { bridge } = fakeBridge("new");
    expect(PgPatchUndo.can(card, bridge)).toBe(false);
    expect(await PgPatchUndo.undo(card, bridge)).toBe("not-undoable");
    expect(bridge.applyPatch).not.toHaveBeenCalled();
  });

  it("puts an edited file back and marks the card undone", async () => {
    const card = await applied("old", "new");
    PgPatchUndo.wrote(card.id);
    const { bridge, file } = fakeBridge("new");

    expect(await PgPatchUndo.undo(card, bridge)).toBe("undone");

    expect(file.content).toBe("old");
    expect(card.undone).toBe(true);
    expect(card.outcome).toBe("undone, src/lib.rs is back as it was");
    expect(card.updatedAt).toBeDefined();
    expect(PgPatchUndo.can(card, bridge)).toBe(false);
  });

  it("deletes a file the patch created", async () => {
    const card = await applied(null, "new");
    PgPatchUndo.wrote(card.id);
    const { bridge, file } = fakeBridge("new");

    expect(await PgPatchUndo.undo(card, bridge)).toBe("undone");

    expect(bridge.deleteFile).toHaveBeenCalledWith("src/lib.rs");
    expect(file.content).toBeNull();
  });

  it("keeps the id a build wrote into declare_id!", async () => {
    const card = await applied(
      'declare_id!("11111111111111111111111111111111");\nold',
      'declare_id!("11111111111111111111111111111111");\nnew'
    );
    PgPatchUndo.wrote(card.id);
    const { bridge, file } = fakeBridge('declare_id!("Built1111");\nnew');

    expect(PgPatchUndo.can(card, bridge)).toBe(true);
    await PgPatchUndo.undo(card, bridge);

    expect(file.content).toBe('declare_id!("Built1111");\nold');
  });

  it("writes nothing over an edit made after Apply, and says so", async () => {
    const card = await applied("old", "new");
    PgPatchUndo.wrote(card.id);
    const { bridge, file } = fakeBridge("new, edited");

    expect(PgPatchUndo.can(card, bridge)).toBe(false);
    expect(await PgPatchUndo.undo(card, bridge)).toBe("moved-on");

    expect(file.content).toBe("new, edited");
    expect(card.undone).toBeUndefined();
    expect(PgAssistant.items[PgAssistant.items.length - 1]).toMatchObject({
      kind: "notice",
      text: "You edited src/lib.rs after applying. Use undo in the editor.",
    });
  });

  it("takes a patch back once when pressed twice", async () => {
    const card = await applied("old", "new");
    PgPatchUndo.wrote(card.id);
    const { bridge } = fakeBridge("new");

    const results = await Promise.all([
      PgPatchUndo.undo(card, bridge),
      PgPatchUndo.undo(card, bridge),
    ]);

    expect(results).toEqual(["undone", "not-undoable"]);
    expect(bridge.applyPatch).toHaveBeenCalledTimes(1);
  });

  it("says so, reported, when the card is gone by the time the file is back", async () => {
    const card = await applied("old", "new");
    PgPatchUndo.wrote(card.id);
    const { bridge, file } = fakeBridge("new");
    const { initLogger, memoryProvider, resetLogger } = await import(
      "@/shared/lib/logger"
    );
    const logs = memoryProvider();
    initLogger({ providers: [logs] });
    vi.mocked(bridge.applyPatch).mockImplementationOnce(async ({ content }) => {
      file.content = content;
      // A workspace switch lands while the write runs
      PgAssistant.clear();
    });

    try {
      expect(await PgPatchUndo.undo(card, bridge)).toBe("undone");
      expect(file.content).toBe("old");
      expect(logs.entries.map((e) => [e.ns, e.level, e.report])).toContainEqual(
        ["assistant:patch-undo", "warn", true]
      );
    } finally {
      resetLogger();
    }
  });

  it("writes nothing for a file deleted after Apply", async () => {
    const card = await applied("old", "new");
    PgPatchUndo.wrote(card.id);
    const { bridge } = fakeBridge(null);

    expect(PgPatchUndo.can(card, bridge)).toBe(false);
    expect(await PgPatchUndo.undo(card, bridge)).toBe("moved-on");
    expect(bridge.applyPatch).not.toHaveBeenCalled();
  });

  it("marks the card undone when the write landed and what followed failed", async () => {
    const card = await applied("old", "new");
    PgPatchUndo.wrote(card.id);
    const { bridge, file } = fakeBridge("new");
    vi.mocked(bridge.applyPatch).mockImplementationOnce(async ({ content }) => {
      file.content = content;
      throw new Error("the editor's model could not load");
    });

    await expect(PgPatchUndo.undo(card, bridge)).rejects.toThrow("model");

    expect(file.content).toBe("old");
    expect(card.undone).toBe(true);
    expect(PgPatchUndo.can(card, bridge)).toBe(false);
  });

  it("marks a created file's card undone when the delete landed and what followed failed", async () => {
    const card = await applied(null, "new");
    PgPatchUndo.wrote(card.id);
    const { bridge, file } = fakeBridge("new");
    vi.mocked(bridge.deleteFile).mockImplementationOnce(async () => {
      file.content = null;
      throw new Error("the explorer could not refresh");
    });

    await expect(PgPatchUndo.undo(card, bridge)).rejects.toThrow("refresh");

    expect(card.undone).toBe(true);
  });

  it("leaves the card alone when the file holds neither the patch nor the original after a failed write", async () => {
    const card = await applied("old", "new");
    PgPatchUndo.wrote(card.id);
    const { bridge, file } = fakeBridge("new");
    vi.mocked(bridge.applyPatch).mockImplementationOnce(async () => {
      // Another tab writes while this one fails
      file.content = "someone else's edit";
      throw new Error("disk");
    });

    await expect(PgPatchUndo.undo(card, bridge)).rejects.toThrow("disk");

    expect(card.undone).toBeUndefined();
    expect(PgPatchUndo.can(card, bridge)).toBe(false);
  });

  it("can undo again when the write failed", async () => {
    const card = await applied("old", "new");
    PgPatchUndo.wrote(card.id);
    const { bridge } = fakeBridge("new");
    vi.mocked(bridge.applyPatch).mockRejectedValueOnce(new Error("disk"));

    await expect(PgPatchUndo.undo(card, bridge)).rejects.toThrow("disk");

    expect(card.undone).toBeUndefined();
    expect(PgPatchUndo.can(card, bridge)).toBe(true);
  });
});
