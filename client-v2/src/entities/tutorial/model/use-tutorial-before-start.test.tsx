import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The current tutorial, the workspace list and the events that change them
const state = vi.hoisted(() => ({
  current: null as { name: string } | null,
  workspaces: undefined as string[] | undefined,
  listeners: new Set<() => void>(),
}));
const on = vi.hoisted(() => (cb: () => void) => {
  state.listeners.add(cb);
  return { dispose: () => state.listeners.delete(cb) };
});
vi.mock("../../../utils/tutorial/tutorial", () => ({
  PgTutorial: {
    get current() {
      return state.current;
    },
    onDidChangeCurrent: on,
  },
}));
vi.mock("../../../utils/explorer/explorer", () => {
  return {
    PgExplorer: {
      get allWorkspaceNames() {
        return state.workspaces;
      },
      onDidInit: on,
      onDidSwitchWorkspace: on,
      onDidChangeWorkspaceList: on,
    },
  };
});

import { useTutorialBeforeStart } from "./use-tutorial-before-start";

const fire = () => act(() => state.listeners.forEach((cb) => cb()));

describe("useTutorialBeforeStart", () => {
  beforeEach(() => {
    state.current = { name: "Hello Anchor" };
    state.workspaces = [];
    state.listeners.clear();
  });

  it("names a tutorial on screen that is not started", () => {
    const { result } = renderHook(() => useTutorialBeforeStart());
    expect(result.current).toBe("Hello Anchor");
  });

  it("names it while other projects exist", () => {
    state.workspaces = ["Counter"];
    const { result } = renderHook(() => useTutorialBeforeStart());
    expect(result.current).toBe("Hello Anchor");
  });

  it("is null once the tutorial's workspace exists", () => {
    state.workspaces = ["Hello Anchor"];
    const { result } = renderHook(() => useTutorialBeforeStart());
    expect(result.current).toBeNull();
  });

  it("is null off a tutorial's route", () => {
    state.current = null;
    const { result } = renderHook(() => useTutorialBeforeStart());
    expect(result.current).toBeNull();
  });

  it("is null before the explorer knows its workspaces", () => {
    state.workspaces = undefined;
    const { result } = renderHook(() => useTutorialBeforeStart());
    expect(result.current).toBeNull();
  });

  it("follows Start creating the workspace, and leaving the route", () => {
    const { result } = renderHook(() => useTutorialBeforeStart());
    state.workspaces = ["Hello Anchor"];
    fire();
    expect(result.current).toBeNull();

    state.workspaces = [];
    state.current = { name: "Counter PDA Tutorial" };
    fire();
    expect(result.current).toBe("Counter PDA Tutorial");

    state.current = null;
    fire();
    expect(result.current).toBeNull();
  });

  it("stops listening once unmounted", () => {
    const { unmount } = renderHook(() => useTutorialBeforeStart());
    unmount();
    expect(state.listeners.size).toBe(0);
  });
});
