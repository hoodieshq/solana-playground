import { renderHook } from "@testing-library/react";
import type { MouseEvent } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  initLogger,
  memoryProvider as logMemory,
  resetLogger,
} from "@/shared/lib/logger";
import { useExplorerContextMenu } from "./useExplorerContextMenu";

// The utils barrel needs build-time globals the unit runner does not define.
const explorer = vi.hoisted(() => ({
  getItemTypeFromEl: vi.fn(),
  getItemPathFromEl: vi.fn(),
  getItemNameFromPath: vi.fn(),
  setCtxSelectedEl: vi.fn(),
}));
vi.mock("../../../../utils", () => ({
  PgCommand: {},
  PgCommon: { keys: Object.keys },
  PgExplorer: { ...explorer, PATHS: {} },
  PgGlobal: {
    onDidChangeBuildLoading: vi.fn(),
    onDidChangeDeployState: vi.fn(),
  },
  PgLanguage: { getIsPathJsLike: () => false },
  PgView: { ids: { ROOT_DIR: "root-dir" } },
}));
vi.mock("../../../../hooks", () => ({ useRenderOnChange: () => undefined }));
vi.mock("./Modals", () => ({ DeleteItem: () => null, RenameItem: () => null }));

let logs: ReturnType<typeof logMemory>;
beforeEach(() => {
  logs = logMemory();
  initLogger({ providers: [logs] });
});
afterEach(() => {
  vi.clearAllMocks();
  resetLogger();
});

const eventOn = (target: Node) =>
  ({ target } as unknown as MouseEvent<HTMLElement>);

describe("useExplorerContextMenu handleMenu", () => {
  it("returns false for a target with no DIV above it, instead of throwing", () => {
    const { result } = renderHook(() => useExplorerContextMenu());

    // Detached: the climb reaches `null` before any DIV
    const orphan = document.createElement("span");

    expect(result.current.handleMenu(eventOn(orphan))).toBe(false);
  });

  it("returns false and stays silent for the root folder", () => {
    const { result } = renderHook(() => useExplorerContextMenu());
    const root = document.createElement("div");
    root.id = "root-dir";

    expect(result.current.handleMenu(eventOn(root))).toBe(false);
    expect(logs.entries).toEqual([]);
  });

  it("returns false and warns for an element that is not an explorer item", () => {
    explorer.getItemTypeFromEl.mockReturnValue(null);
    const { result } = renderHook(() => useExplorerContextMenu());

    expect(
      result.current.handleMenu(eventOn(document.createElement("div")))
    ).toBe(false);
    expect(
      logs.entries.map((entry) => ({ ns: entry.ns, level: entry.level }))
    ).toEqual([{ ns: "explorer:context-menu", level: "warn" }]);
  });
});
