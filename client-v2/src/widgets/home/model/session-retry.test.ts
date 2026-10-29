// Renders a hook and mocks the session, so it keeps a file of its own
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const session = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("@/features/auth", () => ({ PgSession: session }));

import { useSessionRetry } from "./session-retry";

const wake = async (event: "focus" | "online") => {
  await act(async () => {
    window.dispatchEvent(new Event(event));
  });
};

describe("widgets/home/model/session-retry", () => {
  let online: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    session.refresh.mockReset().mockResolvedValue(undefined);
    online = vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
  });
  afterEach(() => online.mockRestore());

  it("does nothing while inactive", async () => {
    const { result } = renderHook(() => useSessionRetry(false));
    await wake("focus");
    expect(result.current).toEqual({ kind: "none" });
    expect(session.refresh).not.toHaveBeenCalled();
  });

  it("re-reads on focus and when back online, five times, then offers a retry", async () => {
    const { result } = renderHook(() => useSessionRetry(true));
    expect(result.current.kind).toBe("waiting");

    for (const event of [
      "focus",
      "online",
      "focus",
      "online",
      "focus",
    ] as const) {
      await wake(event);
    }
    expect(session.refresh).toHaveBeenCalledTimes(5);
    expect(result.current.kind).toBe("exhausted");

    // Spent: a sixth wake reads nothing more
    await wake("focus");
    expect(session.refresh).toHaveBeenCalledTimes(5);
  });

  it("pauses while offline", async () => {
    online.mockReturnValue(false);
    const { result } = renderHook(() => useSessionRetry(true));
    await wake("focus");
    expect(session.refresh).not.toHaveBeenCalled();
    expect(result.current.kind).toBe("waiting");
  });

  it("re-reads on the user's retry and starts a fresh round", async () => {
    const { result } = renderHook(() => useSessionRetry(true));
    for (let i = 0; i < 5; i++) await wake("focus");
    const exhausted = result.current;
    if (exhausted.kind !== "exhausted") throw new Error("not exhausted");

    await act(() => exhausted.retry());

    expect(session.refresh).toHaveBeenCalledTimes(6);
    expect(result.current.kind).toBe("waiting");
  });
});
