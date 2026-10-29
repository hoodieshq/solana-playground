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
const session = vi.hoisted(() => ({
  hasRead: false,
  readFailed: false,
  whenRead: vi.fn(),
  onDidChange: vi.fn(),
}));
vi.mock("@/utils", () => ({ PgExplorer: explorer }));
vi.mock("@/features/auth", () => ({ PgSession: session }));
vi.mock("@/hooks", () => ({ useRenderOnChange: () => {} }));

import { useVisit } from "./use-visit";

/** A read the test settles when it likes */
const pendingRead = () => {
  let settle!: () => void;
  session.whenRead.mockReturnValue(
    new Promise<void>((resolve) => (settle = resolve))
  );
  return (failed: boolean) =>
    act(async () => {
      session.hasRead = true;
      session.readFailed = failed;
      settle();
    });
};

describe("widgets/home/model/use-visit", () => {
  beforeEach(() => {
    explorer.allWorkspaceNames = [];
    session.hasRead = false;
    session.readFailed = false;
    session.whenRead.mockReset();
  });

  it("turns a first visit once the session's first read answers", async () => {
    const answer = pendingRead();
    const { result } = renderHook(() => useVisit());
    expect(result.current).toBe("unknown");

    await answer(false);

    expect(result.current).toBe("first");
  });

  it("stays unknown when that read fails", async () => {
    const answer = pendingRead();
    const { result } = renderHook(() => useVisit());

    await answer(true);

    expect(result.current).toBe("unknown");
  });

  it("is a return visit whatever the session, once a project exists", () => {
    explorer.allWorkspaceNames = ["a"];
    session.whenRead.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useVisit());
    expect(result.current).toBe("return");
  });
});
