import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  initTelemetry,
  memoryProvider,
  resetTelemetry,
} from "@/shared/lib/telemetry";
import type { NetworkInput } from "../model/indicators";

// The `@/utils` barrel reaches globals only a booted app has; the notice uses
// the connection's re-check alone
const connection = vi.hoisted(() => ({
  recheck: vi.fn(() => Promise.resolve()),
}));
vi.mock("@/utils", () => ({ PgConnection: connection }));

const net = vi.hoisted(() => ({
  input: { name: "devnet", isConnected: true, slotStalled: false } as
    | NetworkInput
    | undefined,
}));
vi.mock("../model/use-status", () => ({ useNetworkInput: () => net.input }));

import BaseStageNotice from "./BaseStageNotice";
import { StageNotice } from "./StageNotice";

const UP: NetworkInput = {
  name: "devnet",
  isConnected: true,
  slotStalled: false,
};
const DOWN: NetworkInput = {
  name: "devnet",
  isConnected: false,
  slotStalled: null,
};
const OFFLINE =
  "You're offline. Editing still works. Build, Deploy and the assistant need a connection.";
const CLUSTER =
  "Devnet isn't answering. Playground keeps trying. You can switch network.";

let online = true;
const goOnline = (next: boolean) => {
  online = next;
  act(() => {
    window.dispatchEvent(new Event(next ? "online" : "offline"));
  });
};

let sent: ReturnType<typeof memoryProvider>;
beforeEach(() => {
  online = true;
  net.input = UP;
  vi.spyOn(navigator, "onLine", "get").mockImplementation(() => online);
  sent = memoryProvider();
  initTelemetry({ providers: [sent] });
});
afterEach(() => {
  resetTelemetry();
  vi.restoreAllMocks();
  connection.recheck.mockClear();
});

const eventsNamed = (name: string) =>
  sent.events.filter((event) => event.name === name).map((e) => e.params);

describe("BaseStageNotice", () => {
  it("draws nothing without a notice", () => {
    const { container } = render(
      <BaseStageNotice
        notice={null}
        onRetry={vi.fn()}
        onChangeNetwork={vi.fn()}
      />
    );
    expect(container.innerHTML).toBe("");
  });

  it("says offline as an alert, with nothing to press", () => {
    render(
      <BaseStageNotice
        notice={{ kind: "offline", text: OFFLINE }}
        onRetry={vi.fn()}
        onChangeNetwork={vi.fn()}
      />
    );
    expect(screen.getByRole("alert").textContent).toBe(OFFLINE);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("offers Try again and Change network for a cluster that does not answer", async () => {
    const onRetry = vi.fn(() => Promise.resolve());
    const onChangeNetwork = vi.fn();
    render(
      <BaseStageNotice
        notice={{ kind: "cluster-down", text: CLUSTER }}
        onRetry={onRetry}
        onChangeNetwork={onChangeNetwork}
      />
    );
    expect(screen.getByRole("alert").textContent).toContain(CLUSTER);
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    await userEvent.click(
      screen.getByRole("button", { name: "Change network" })
    );
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onChangeNetwork).toHaveBeenCalledTimes(1);
  });
});

describe("StageNotice", () => {
  it("shows the offline line and clears it back online, measured once", () => {
    const { rerender } = render(
      <StageNotice stage="build" onOpenNetwork={vi.fn()} />
    );
    expect(screen.queryByRole("alert")).toBeNull();

    goOnline(false);
    expect(screen.getByRole("alert").textContent).toBe(OFFLINE);
    // A stage switch keeps the same onset
    rerender(<StageNotice stage="deploy" onOpenNetwork={vi.fn()} />);
    rerender(<StageNotice stage="build" onOpenNetwork={vi.fn()} />);
    expect(eventsNamed("status_notice_shown")).toEqual([{ notice: "offline" }]);

    goOnline(true);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows the cluster line on Deploy only, measured when it first shows", () => {
    net.input = DOWN;
    const { rerender } = render(
      <StageNotice stage="build" onOpenNetwork={vi.fn()} />
    );
    expect(screen.queryByRole("alert")).toBeNull();
    expect(eventsNamed("status_notice_shown")).toEqual([]);

    rerender(<StageNotice stage="deploy" onOpenNetwork={vi.fn()} />);
    expect(screen.getByRole("alert").textContent).toContain(CLUSTER);
    rerender(<StageNotice stage="interact" onOpenNetwork={vi.fn()} />);
    expect(eventsNamed("status_notice_shown")).toEqual([
      { notice: "cluster-down" },
    ]);
  });

  it("asks the cluster again and opens the network settings, measured", async () => {
    net.input = DOWN;
    const onOpenNetwork = vi.fn();
    render(<StageNotice stage="deploy" onOpenNetwork={onOpenNetwork} />);

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    await userEvent.click(
      screen.getByRole("button", { name: "Change network" })
    );
    expect(connection.recheck).toHaveBeenCalledTimes(1);
    expect(onOpenNetwork).toHaveBeenCalledTimes(1);
    expect(eventsNamed("status_notice_action")).toEqual([
      { notice: "cluster-down", action: "retry" },
      { notice: "cluster-down", action: "change-network" },
    ]);
  });
});
