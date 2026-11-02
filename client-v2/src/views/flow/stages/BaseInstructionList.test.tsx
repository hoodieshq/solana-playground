// Interact's list on a phone: one row per instruction with its last call.
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import BaseInstructionList from "./BaseInstructionList";
import type { CallRecord } from "../state/call-history";

const NOW = 1_000_000_000_000;

const call = (
  instruction: string,
  ok: boolean,
  minutes: number
): CallRecord => ({
  id: instruction,
  programId: "P",
  cluster: "devnet",
  instruction,
  ok,
  signature: "sig",
  failingLine: null,
  at: NOW - minutes * 60_000,
});

const ROWS = [
  { name: "initialize", args: 0, accounts: 3 },
  { name: "increment", args: 1, accounts: 2 },
  { name: "close", args: 0, accounts: 0 },
];

describe("BaseInstructionList", () => {
  it("before any call shows only what each instruction takes", () => {
    const { container } = render(
      <BaseInstructionList
        instructions={ROWS}
        history={[]}
        onOpen={vi.fn()}
        now={NOW}
      />
    );

    expect(screen.queryByText(/called/)).toBeNull();
    expect(container.querySelectorAll("svg.lucide-circle")).toHaveLength(0);
    expect(screen.getByText("No inputs")).toBeTruthy();
  });

  it("leads with the status word and time once anything was called", () => {
    render(
      <BaseInstructionList
        instructions={ROWS}
        history={[call("increment", false, 2), call("initialize", true, 5)]}
        onOpen={vi.fn()}
        now={NOW}
      />
    );

    expect(
      screen.getByText("3 instructions · 2 called, 1 failed")
    ).toBeTruthy();
    const increment = screen.getByRole("button", { name: "increment" });
    expect(increment.getAttribute("aria-label")).toBeNull();
    const line = document.getElementById(
      increment.getAttribute("aria-describedby")!
    )!;
    expect(line.textContent).toBe("Failed 2 min ago·1 arg · 2 accounts");
    expect(
      screen.getByRole("button", { name: "initialize" }).textContent
    ).toContain("Called 5 min ago");
    expect(screen.getByRole("button", { name: "close" }).textContent).toContain(
      "Not called yet"
    );
  });

  it("opens a row's instruction", () => {
    const onOpen = vi.fn();
    render(
      <BaseInstructionList
        instructions={ROWS}
        history={[]}
        onOpen={onOpen}
        now={NOW}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "increment" }));
    expect(onOpen).toHaveBeenCalledWith("increment");
  });
});
