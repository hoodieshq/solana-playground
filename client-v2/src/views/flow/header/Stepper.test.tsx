import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../utils", () => ({}));

import Stepper, { STEPPER_FULL_WIDTH_PX } from "./Stepper";
import { INITIAL_FLOW_STATE } from "../state/stage";
import type { FlowState } from "../state/stage";

const failedBuild: FlowState = {
  stage: "build",
  build: "failed",
  buildSettled: "upcoming",
  deploy: "upcoming",
  interact: "upcoming",
  buildErrorCount: 3,
  buildMs: null,
  buildStartedAt: 1000,
};

/** the observers the stepper registered, so a test can say what width it was given */
const observers: Array<(width: number) => void> = [];

class StubResizeObserver {
  private readonly callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  observe(target: Element) {
    observers.push((width) =>
      this.callback(
        [{ target, contentRect: { width } } as ResizeObserverEntry],
        this as unknown as ResizeObserver
      )
    );
  }
  unobserve() {}
  disconnect() {}
}

const resizeTo = (width: number) => {
  act(() => observers.forEach((fire) => fire(width)));
};

describe("Stepper", () => {
  beforeEach(() => {
    observers.length = 0;
    // the thumb and the fold both measure with one; jsdom has none
    vi.stubGlobal("ResizeObserver", StubResizeObserver);
  });

  it("is one tab list with a tab per stage, ids kept", () => {
    render(<Stepper state={INITIAL_FLOW_STATE} onSelect={() => {}} />);
    expect(
      screen.getByRole("tablist", { name: "Development loop" })
    ).toBeTruthy();
    const build = document.getElementById("flow-stage-tab-build")!;
    expect(build.getAttribute("role")).toBe("tab");
    expect(build.getAttribute("aria-controls")).toBe("flow-stage-panel-build");
    expect(build.getAttribute("data-slot")).toBe("stepper-item");
  });

  it("says a failed build's count and the lesson target", () => {
    render(<Stepper state={failedBuild} onSelect={() => {}} target="build" />);
    const name = "Build: failed, 3 errors, current lesson target";
    expect(screen.getByRole("tab", { name })).toBeTruthy();
    expect(
      screen.getByRole("tab", { name }).getAttribute("aria-selected")
    ).toBe("true");
  });

  it("selects a stage on click", async () => {
    const onSelect = vi.fn();
    render(<Stepper state={INITIAL_FLOW_STATE} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole("tab", { name: /^Deploy:/ }));
    expect(onSelect).toHaveBeenCalledWith("deploy");
  });

  it("moves focus with the arrow keys without selecting", async () => {
    const onSelect = vi.fn();
    render(<Stepper state={INITIAL_FLOW_STATE} onSelect={onSelect} />);
    screen.getByRole("tab", { name: /^Write:/ }).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(document.activeElement?.id).toBe("flow-stage-tab-build");
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("shows the full labels when the stage bar has room, at any window width", () => {
    render(<Stepper state={INITIAL_FLOW_STATE} onSelect={() => {}} />);
    resizeTo(900);
    expect(screen.getByRole("tablist").getAttribute("data-compact")).toBe(
      "false"
    );
  });

  it("folds to initials when the stage bar is narrower than the full list", () => {
    render(<Stepper state={INITIAL_FLOW_STATE} onSelect={() => {}} />);
    resizeTo(STEPPER_FULL_WIDTH_PX - 1);
    expect(screen.getByRole("tablist").getAttribute("data-compact")).toBe(
      "true"
    );
    resizeTo(STEPPER_FULL_WIDTH_PX);
    expect(screen.getByRole("tablist").getAttribute("data-compact")).toBe(
      "false"
    );
  });
});
