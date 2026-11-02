// The utils barrel reads build-time globals jsdom lacks, and the inputs need
// a connected program; the form under test needs none of it.
vi.mock("../../../../../utils", () => ({
  PgCommon: { debounce: (fn: () => void) => fn },
}));
vi.mock("../../../../../utils/program-interaction", () => ({
  PgProgramInteraction: {
    getOrCreateInstruction: (ix: { name: string }) => ({
      name: ix.name,
      values: { args: [{ name: "amount" }], accounts: [{ name: "owner" }] },
    }),
    saveInstruction: vi.fn(),
  },
}));
vi.mock("../../../../../hooks", () => ({ useWallet: () => ({}) }));
vi.mock("./InstructionInput", () => ({ default: () => null }));
vi.mock("../IdlProvider", () => ({ useIdl: () => ({ idl: {} }) }));

import { act, fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import Instruction from "./Instruction";

type Props = Parameters<typeof Instruction>[0];

const IX = {
  name: "increment",
  args: [],
  accounts: [],
} as unknown as Props["idlInstruction"];

it("heads the desk form with plain Arguments and Accounts labels", () => {
  render(<Instruction idlInstruction={IX} onCall={vi.fn()} />);

  expect(screen.getByRole("heading", { name: "Arguments" })).toBeTruthy();
  expect(screen.getByRole("heading", { name: "Accounts" })).toBeTruthy();
  // Nothing folds any more
  expect(screen.queryByRole("button", { name: "Arguments" })).toBeNull();
  expect(
    screen.getByRole("button", { name: "Fill sample values" })
  ).toBeTruthy();
});

it("on the desk says why Call is off beside it, with Reset in the same row", () => {
  render(<Instruction idlInstruction={IX} onCall={vi.fn()} callBlocked />);

  const call = screen.getByRole("button", { name: "Call increment" });
  expect((call as HTMLButtonElement).disabled).toBe(true);
  const reason = screen.getByText("Not enough SOL for the fee");
  expect(call.getAttribute("aria-describedby")).toBe(reason.id);
  expect(call.parentElement).toBe(reason.parentElement);
  expect(screen.getByRole("button", { name: "Reset" }).parentElement).toBe(
    call.parentElement
  );
});

it("calls the instruction through onCall from a button named after it", () => {
  const onCall = vi.fn(() => Promise.resolve());
  render(<Instruction idlInstruction={IX} onCall={onCall} />);

  fireEvent.click(screen.getByRole("button", { name: "Call increment" }));
  expect(onCall).toHaveBeenCalledWith(
    expect.objectContaining({ name: "increment" })
  );
});

it("keeps Call off while the caller blocks it", () => {
  render(<Instruction idlInstruction={IX} onCall={vi.fn()} callBlocked />);

  expect(
    (
      screen.getByRole("button", {
        name: "Call increment",
      }) as HTMLButtonElement
    ).disabled
  ).toBe(true);
});

it("draws the fee payer slot above the actions", () => {
  render(
    <Instruction
      idlInstruction={IX}
      onCall={vi.fn()}
      feePayer={<p>Fee paid by Playground wallet · 1 SOL</p>}
    />
  );
  expect(
    screen.getByText("Fee paid by Playground wallet · 1 SOL")
  ).toBeTruthy();
});

it("reads Calling… and locks the form until the call settles", async () => {
  let settle: () => void = () => {};
  const onCall = vi.fn(
    () => new Promise<void>((resolve) => (settle = resolve))
  );
  const { container } = render(
    <Instruction idlInstruction={IX} onCall={onCall} />
  );

  fireEvent.click(screen.getByRole("button", { name: "Call increment" }));
  const busy = await screen.findByRole("button", { name: /Calling…/ });
  expect((busy as HTMLButtonElement).disabled).toBe(true);
  expect(container.querySelector("fieldset")?.disabled).toBe(true);
  expect(
    (
      screen.getByRole("button", {
        name: "Fill sample values",
      }) as HTMLButtonElement
    ).disabled
  ).toBe(true);

  await act(async () => settle());
  expect(
    (
      screen.getByRole("button", {
        name: "Call increment",
      }) as HTMLButtonElement
    ).disabled
  ).toBe(false);
  expect(container.querySelector("fieldset")?.disabled).toBe(false);
});

it("on the phone page keeps only Call in the foot, off with its reason", () => {
  render(
    <Instruction
      idlInstruction={IX}
      onCall={vi.fn()}
      layout="page"
      callBlocked
      actionsClassName="foot"
    />
  );

  const call = screen.getByRole("button", { name: "Call increment" });
  expect((call as HTMLButtonElement).disabled).toBe(true);
  expect(call.getAttribute("aria-describedby")).toBeTruthy();
  expect(screen.getByText("Not enough SOL for the fee")).toBeTruthy();
  const foot = call.closest(".foot")!;
  expect(foot.querySelectorAll("button")).toHaveLength(1);
  expect(screen.getByRole("heading", { name: "Arguments" })).toBeTruthy();
  expect(
    screen.getByRole("button", { name: "Fill sample values" })
  ).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Reset" })).toBeNull();
});
