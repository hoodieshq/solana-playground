import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The registered tutorials, the explorer's workspaces, each started
// tutorial's saved progress, and the explorer's init listeners
const state = vi.hoisted(() => ({
  all: [
    { name: "Hello Anchor", pageCount: 6 },
    { name: "Hello Solana", pageCount: 4 },
  ],
  workspaces: undefined as string[] | undefined,
  metadata: new Map<string, { pageNumber: number; completed: boolean }>(),
  init: new Set<() => void>(),
}));
const warn = vi.hoisted(() => vi.fn());

vi.mock("@/shared/lib/logger", () => ({
  createLogger: () => ({ warn, error: vi.fn(), info: vi.fn() }),
}));
vi.mock("../../../utils/tutorial/tutorial", () => ({
  PgTutorial: {
    get all() {
      return state.all;
    },
    isStarted: (name: string) => {
      if (!state.workspaces) throw new Error("Explorer not initialized");
      return state.workspaces.includes(name);
    },
    getMetadata: async (name: string) => {
      const meta = state.metadata.get(name);
      if (!meta) throw new Error("no metadata");
      return meta;
    },
  },
}));
vi.mock("../../../utils/explorer/explorer", () => ({
  PgExplorer: {
    get allWorkspaceNames() {
      return state.workspaces;
    },
    onDidInit: (cb: () => void) => {
      state.init.add(cb);
      return { dispose: () => state.init.delete(cb) };
    },
  },
}));

import { useTutorialProgress } from "./use-tutorial-progress";

describe("useTutorialProgress", () => {
  beforeEach(() => {
    state.workspaces = undefined;
    state.metadata.clear();
    state.init.clear();
    warn.mockClear();
  });

  it("reads every tutorial as new before the explorer knows its workspaces, then reads again once it does", async () => {
    const { result } = renderHook(() => useTutorialProgress());
    expect(result.current("Hello Anchor")).toEqual({ state: "new" });

    state.workspaces = ["Hello Anchor"];
    state.metadata.set("Hello Anchor", { pageNumber: 2, completed: false });
    act(() => state.init.forEach((cb) => cb()));

    await waitFor(() =>
      expect(result.current("Hello Anchor")).toEqual({
        state: "started",
        page: 2,
        pages: 6,
      })
    );
    expect(result.current("Hello Solana")).toEqual({ state: "new" });
  });

  it("reads a tutorial it does not know as new", () => {
    state.workspaces = [];
    const { result } = renderHook(() => useTutorialProgress());
    expect(result.current("Nowhere")).toEqual({ state: "new" });
  });

  it("shows a started tutorial on page 1 when its progress cannot be read, and logs it", async () => {
    state.workspaces = ["Hello Anchor"];
    const { result } = renderHook(() => useTutorialProgress());

    await waitFor(() =>
      expect(result.current("Hello Anchor")).toEqual({
        state: "started",
        page: 1,
        pages: 6,
      })
    );
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
