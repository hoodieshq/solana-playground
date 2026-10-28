// Renders a hook, so it keeps a test file of its own
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useElapsed } from "./use-elapsed";

const START = 1_000_000;

/** A build that runs, started at `START`, or one at rest */
const flow = (running: boolean) => ({
  build: running ? ("running" as const) : ("done" as const),
  buildStartedAt: START,
});

describe("views/flow/stages/use-elapsed", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(START);
  });
  afterEach(() => vi.useRealTimers());

  it("counts a running build once a second", () => {
    const { result } = renderHook(() => useElapsed(flow(true)));
    expect(result.current).toBe(0);
    act(() => vi.advanceTimersByTime(12_000));
    expect(result.current).toBe(12_000);
  });

  it("is null and keeps no timer while no build runs", () => {
    const { result } = renderHook(() => useElapsed(flow(false)));
    expect(result.current).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("stops when the build ends", () => {
    const { result, rerender } = renderHook(
      ({ running }) => useElapsed(flow(running)),
      { initialProps: { running: true } }
    );
    act(() => vi.advanceTimersByTime(3_000));
    rerender({ running: false });
    expect(result.current).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });
});
