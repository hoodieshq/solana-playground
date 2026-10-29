// Renders a hook and mocks the explorer and the session, so it keeps a file
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const explorer = vi.hoisted(() => ({
  allWorkspaceNames: [] as string[] | undefined,
  onDidSwitchWorkspace: vi.fn(),
  onDidInit: vi.fn(),
  onDidChangeWorkspaceList: vi.fn(),
  onDidDeleteWorkspace: vi.fn(),
}));
const session = vi.hoisted(() => {
  const listeners = new Set<() => void>();
  return {
    readState: "unread" as "unread" | "failed" | "answered",
    whenRead: vi.fn(),
    onDidChange: (cb: () => void) => {
      listeners.add(cb);
      return { dispose: () => listeners.delete(cb) };
    },
    /** A read settling, as `PgSession` tells its listeners */
    settle(state: "failed" | "answered") {
      this.readState = state;
      listeners.forEach((cb) => cb());
    },
  };
});
vi.mock("@/utils", () => ({ PgExplorer: explorer }));
vi.mock("@/features/auth", () => ({ PgSession: session }));
// The real subscription, so a session change re-renders as on the page
vi.mock("@/hooks", async () => {
  const { useEffect, useReducer } = await import("react");
  return {
    useRenderOnChange: (
      on: (cb: () => void) => { dispose: () => void } | unknown
    ) => {
      const [, render] = useReducer((n: number) => n + 1, 0);
      useEffect(() => {
        const sub = on(render) as { dispose?: () => void } | undefined;
        return () => sub?.dispose?.();
      }, [on]);
    },
  };
});

import { useVisit } from "./use-visit";

describe("widgets/home/model/use-visit", () => {
  beforeEach(() => {
    explorer.allWorkspaceNames = [];
    session.readState = "unread";
    session.whenRead.mockReset().mockReturnValue(new Promise(() => {}));
  });

  it("turns a first visit once the session's first read answers", () => {
    const { result } = renderHook(() => useVisit());
    expect(result.current).toBe("unknown");

    act(() => session.settle("answered"));

    expect(result.current).toBe("first");
  });

  it("stays unknown while the read has failed, and turns first once one answers", () => {
    const { result } = renderHook(() => useVisit());

    act(() => session.settle("failed"));
    expect(result.current).toBe("unknown");

    act(() => session.settle("answered"));
    expect(result.current).toBe("first");
  });

  it("is a return visit whatever the session, once a project exists", () => {
    explorer.allWorkspaceNames = ["a"];
    const { result } = renderHook(() => useVisit());
    expect(result.current).toBe("return");
  });
});
