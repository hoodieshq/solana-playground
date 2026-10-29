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

/** The first automatic re-read, two seconds after the failure */
const firstRetry = () =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(2_000);
  });

describe("widgets/home/model/session-retry", () => {
  let online: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    vi.useFakeTimers();
    session.refresh.mockReset().mockResolvedValue(undefined);
    online = vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
  });
  afterEach(() => {
    online.mockRestore();
    vi.useRealTimers();
  });

  it("does nothing while inactive", async () => {
    const { result } = renderHook(() => useSessionRetry(false));
    await firstRetry();
    await wake("focus");
    expect(result.current).toEqual({ kind: "none" });
    expect(session.refresh).not.toHaveBeenCalled();
  });

  it("re-reads once on its own, then on focus and online, five in all, then offers a retry", async () => {
    const { result } = renderHook(() => useSessionRetry(true));
    expect(result.current.kind).toBe("waiting");

    await firstRetry();
    expect(session.refresh).toHaveBeenCalledTimes(1);
    for (const event of ["focus", "online", "focus", "online"] as const) {
      await wake(event);
    }
    expect(session.refresh).toHaveBeenCalledTimes(5);
    expect(result.current.kind).toBe("exhausted");

    // Spent: a further wake reads nothing more
    await wake("focus");
    expect(session.refresh).toHaveBeenCalledTimes(5);
  });

  it("counts only the reads it starts", async () => {
    let settle!: () => void;
    session.refresh.mockReturnValueOnce(
      new Promise<void>((resolve) => (settle = resolve))
    );
    const { result } = renderHook(() => useSessionRetry(true));
    await firstRetry();
    // A focus and an online together while that read is in flight
    await wake("focus");
    await wake("online");
    expect(session.refresh).toHaveBeenCalledTimes(1);
    await act(async () => settle());
    expect(result.current.kind).toBe("waiting");
  });

  it("pauses while offline", async () => {
    online.mockReturnValue(false);
    const { result } = renderHook(() => useSessionRetry(true));
    await firstRetry();
    await wake("focus");
    expect(session.refresh).not.toHaveBeenCalled();
    expect(result.current.kind).toBe("waiting");
  });

  it("keeps offering the retry when a pressed one fails again", async () => {
    const { result } = renderHook(() => useSessionRetry(true));
    await firstRetry();
    for (let i = 0; i < 4; i++) await wake("focus");
    const exhausted = result.current;
    if (exhausted.kind !== "exhausted") throw new Error("not exhausted");

    await act(() => exhausted.retry());

    expect(session.refresh).toHaveBeenCalledTimes(6);
    expect(result.current.kind).toBe("exhausted");
  });

  it("starts a fresh round once the check has answered", async () => {
    const { result, rerender } = renderHook(
      ({ active }) => useSessionRetry(active),
      { initialProps: { active: true } }
    );
    await firstRetry();
    for (let i = 0; i < 4; i++) await wake("focus");
    expect(result.current.kind).toBe("exhausted");

    rerender({ active: false });
    rerender({ active: true });

    expect(result.current.kind).toBe("waiting");
  });
});
