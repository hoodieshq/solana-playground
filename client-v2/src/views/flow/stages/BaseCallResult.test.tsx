// The result of one Interact call, and the history of calls under it, drawn
// from props.
import { fireEvent, render as rtlRender, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { TooltipProvider } from "@/shared/ui/tooltip";
import BaseCallHistory from "./BaseCallHistory";
import BaseCallResult from "./BaseCallResult";
import type { CallOutcome } from "./call-outcome";
import type { CallRecord } from "../state/call-history";

const render = (ui: ReactElement) =>
  rtlRender(<TooltipProvider>{ui}</TooltipProvider>);

const txUrl = (sig: string) => `https://explorer/tx/${sig}`;

const ERROR_LINE =
  "Program log: AnchorError caused by account: counter. Error Code: AccountNotInitialized.";

describe("BaseCallResult", () => {
  it("on the phone page names the call in Spec 03's words, with its time", () => {
    const outcome: CallOutcome = {
      instruction: "increment",
      ok: false,
      signature: "5VERv8NMvzbJMEkV8xnrLkEaWRtSz9Co",
      logs: ["Program X invoke [1]", ERROR_LINE],
      failingLine: ERROR_LINE,
    };
    render(
      <BaseCallResult
        layout="page"
        outcome={outcome}
        at={1_000_000 - 120_000}
        now={1_000_000}
        cluster="devnet"
        txUrl={txUrl}
      />
    );

    expect(
      screen.getByRole("heading", { name: "Call to increment failed" })
    ).toBeTruthy();
    expect(screen.getByText("2 min ago")).toBeTruthy();
    expect(screen.getByText(ERROR_LINE)).toBeTruthy();
    expect(screen.getByText("5VER…z9Co")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "View on Explorer (devnet)" })
    ).toBeTruthy();
    expect(screen.queryByText(/Program X invoke/)).toBeNull();
  });

  it("on the phone page reads Called for a success", () => {
    const outcome: CallOutcome = {
      instruction: "increment",
      ok: true,
      signature: "5sig",
      logs: [],
      failingLine: null,
    };
    render(
      <BaseCallResult
        layout="page"
        outcome={outcome}
        cluster="devnet"
        txUrl={txUrl}
      />
    );

    expect(
      screen.getByRole("heading", { name: "Called increment" })
    ).toBeTruthy();
  });

  it("shows a success with its signature and an Explorer link naming the network", () => {
    const outcome: CallOutcome = {
      instruction: "increment",
      ok: true,
      signature: "5sig",
      logs: [
        "Program log: Instruction: Increment",
        "Program log: Counter is 1",
      ],
      failingLine: null,
    };
    render(<BaseCallResult outcome={outcome} cluster="devnet" txUrl={txUrl} />);

    // The program's own line, under the title
    expect(screen.getByText("Program log: Counter is 1")).toBeTruthy();

    const region = screen.getByRole("region", { name: "Call result" });
    // The desk reads the same words as the phone, no status dot
    expect(
      screen.getByRole("heading", { name: "Called increment" })
    ).toBeTruthy();
    expect(region.textContent).not.toContain("Succeeded");
    expect(screen.getByRole("button", { name: "Copy signature" })).toBeTruthy();
    const link = screen.getByRole("link", {
      name: "View on Explorer (devnet)",
    });
    expect(link.getAttribute("href")).toBe("https://explorer/tx/5sig");
    // The network lives in the name, not in the short label
    expect(link.textContent).toBe("Explorer");
  });

  it("shows a failure's line, and every log only behind Show all logs", () => {
    const outcome: CallOutcome = {
      instruction: "increment",
      ok: false,
      signature: "5sig",
      logs: ["Program X invoke [1]", ERROR_LINE],
      failingLine: ERROR_LINE,
    };
    render(<BaseCallResult outcome={outcome} cluster="devnet" txUrl={txUrl} />);

    const region = screen.getByRole("region", { name: "Call result" });
    expect(region.textContent).toContain("Call to increment failed");
    expect(screen.getByText(ERROR_LINE)).toBeTruthy();
    expect(screen.queryByText(/Program X invoke/)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Show all logs" }));
    expect(screen.getByText(/Program X invoke/)).toBeTruthy();
  });

  it("offers no Explorer link for a call that never reached the network", () => {
    const outcome: CallOutcome = {
      instruction: "increment",
      ok: false,
      signature: null,
      logs: [],
      failingLine: "Wallet not connected",
    };
    render(<BaseCallResult outcome={outcome} cluster="devnet" txUrl={txUrl} />);

    expect(
      screen.getByRole("heading", { name: "increment was not sent" })
    ).toBeTruthy();
    expect(screen.getByText("Wallet not connected")).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByRole("button", { name: "Show all logs" })).toBeNull();
  });
});

describe("BaseCallHistory", () => {
  const record = (
    id: string,
    instruction: string,
    ok: boolean,
    at: number
  ): CallRecord => ({
    id,
    programId: "P",
    cluster: "devnet",
    instruction,
    ok,
    signature: ok ? `sig-${id}` : null,
    failingLine: ok ? null : "Error Code: X",
    at,
  });

  it("lists calls in the order given and opens a row's instruction", () => {
    const onOpen = vi.fn();
    render(
      <BaseCallHistory
        records={[
          record("b", "increment", false, 2),
          record("a", "initialize", true, 1),
        ]}
        cluster="devnet"
        txUrl={txUrl}
        onOpen={onOpen}
      />
    );

    const list = screen.getByRole("region", { name: "Call history" });
    const rows = list.querySelectorAll("li");
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain("increment");
    expect(rows[0].textContent).toContain("Failed");
    expect(rows[1].textContent).toContain("Succeeded");
    expect(
      screen
        .getByRole("link", { name: "View sig-a on Explorer (devnet)" })
        .getAttribute("href")
    ).toBe("https://explorer/tx/sig-a");

    fireEvent.click(screen.getByRole("button", { name: "Open increment" }));
    expect(onOpen).toHaveBeenCalledWith("increment");
  });

  it("draws nothing without calls", () => {
    const { container } = render(
      <BaseCallHistory
        records={[]}
        cluster="devnet"
        txUrl={txUrl}
        onOpen={() => {}}
      />
    );
    expect(container.textContent).toBe("");
  });
});
