import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  initTelemetry,
  memoryProvider,
  resetTelemetry,
} from "@/shared/lib/telemetry";

// The route decides the open tutorial; the test stands in for it
const route = vi.hoisted(() => ({
  current: null as { name: string; definition?: object } | null,
  listeners: new Set<() => void>(),
}));
vi.mock("../../../utils/tutorial", () => ({
  PgTutorial: {
    get current() {
      return route.current;
    },
    onDidChangeCurrent: (cb: () => void) => {
      route.listeners.add(cb);
      return { dispose: () => route.listeners.delete(cb) };
    },
  },
}));
vi.mock("../../../hooks", async () => {
  const { useEffect, useReducer } = await import("react");
  return {
    useRenderOnChange: (
      on: (cb: () => void) => { dispose: () => void }
    ) => {
      const [, render] = useReducer((n: number) => n + 1, 0);
      useEffect(() => on(render).dispose, [on]);
    },
  };
});

import { useTutorialFrame } from "./use-tutorial-frame";

const go = (tutorial: typeof route.current) =>
  act(() => {
    route.current = tutorial;
    route.listeners.forEach((cb) => cb());
  });

let sent: ReturnType<typeof memoryProvider>;
beforeEach(() => {
  route.current = null;
  sent = memoryProvider();
  initTelemetry({ providers: [sent] });
});
afterEach(() => {
  resetTelemetry();
});

const draw = () =>
  renderHook(() => useTutorialFrame({ onBack: vi.fn(), body: null }));

const events = (name: string) =>
  sent.events.filter((e) => e.name === name).map((e) => e.params);

describe("useTutorialFrame", () => {
  it("gives no frame outside a tutorial with a definition", () => {
    const { result } = draw();
    expect(result.current.frame).toBeUndefined();
    go({ name: "Counter PDA Tutorial" });
    expect(result.current.frame).toBeUndefined();
  });

  it("folds the navigation on entry and opens it over the chat", () => {
    const { result } = draw();
    go({ name: "Hello Anchor", definition: {} });
    expect(result.current.frame?.nav).toMatchObject({
      open: false,
      overlay: false,
    });
    expect(result.current.pin).toBeUndefined();

    act(() => result.current.frame?.nav.onOpenChange(true));
    expect(result.current.frame?.nav).toMatchObject({
      open: true,
      overlay: true,
    });
    expect(result.current.pin).toBeDefined();
    expect(events("tutorial_frame_menu_opened")).toHaveLength(1);

    act(() => result.current.frame?.nav.onClose());
    expect(result.current.frame?.nav.open).toBe(false);
  });

  it("drops the frame on leaving, and folds again on the next entry", () => {
    const { result } = draw();
    go({ name: "Hello Anchor", definition: {} });
    act(() => result.current.frame?.nav.onOpenChange(true));
    go(null);
    expect(result.current.frame).toBeUndefined();
    go({ name: "Hello Anchor", definition: {} });
    expect(result.current.frame?.nav.open).toBe(false);
  });
});
