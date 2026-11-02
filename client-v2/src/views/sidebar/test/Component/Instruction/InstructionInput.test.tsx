// `updateRefs` fills a dependent input through
// `document.getElementById(instruction.name + prefix + name)`, so the input
// must keep that id however it is styled.
import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import { TooltipProvider } from "@/shared/ui/tooltip";
import InstructionInput from "./InstructionInput";
import InstructionProvider from "./InstructionProvider";
import type { GeneratableInstruction } from "../../../../../utils/program-interaction";

// `vi.mock` is hoisted above the imports
vi.mock("../../../../../utils", () => ({
  PgCommon: { isEqual: () => true },
  PgWallet: { current: null },
  PgWeb3: { Keypair: { generate: () => ({ secretKey: [] }) } },
}));
vi.mock("../../../../../utils/program-interaction", () => ({
  PgProgramInteraction: {
    getIdlType: (type: string) => ({
      name: type,
      parse: (v: string) => v,
      generateRandom: () => "1",
    }),
    generateValue: (g: { value?: string; name?: string }) =>
      g.value ??
      (g.name === "System" ? "11111111111111111111111111111111" : ""),
    getPrograms: () => [{ name: "System", alias: ["systemProgram"] }],
  },
}));
vi.mock("../../../../../components/SearchBar", () => ({
  default: (props: { id: string; end?: React.ReactNode }) => (
    <>
      <input id={props.id} />
      {props.end}
    </>
  ),
}));
vi.mock("./FromSeed", () => ({ default: () => null }));
vi.mock("../IdlProvider", () => ({ useIdl: () => ({ idl: {} }) }));

it("the input keeps the id dependent fields are filled through", () => {
  const instruction = {
    name: "initialize",
    values: { args: [], accounts: [] },
  } as unknown as GeneratableInstruction;
  render(
    <TooltipProvider>
      <InstructionProvider instruction={instruction} setInstruction={vi.fn()}>
        <InstructionInput
          prefix="args"
          name="amount"
          type="u64"
          generator={{ type: "Custom", value: "" }}
          updateInstruction={vi.fn()}
        />
      </InstructionProvider>
    </TooltipProvider>
  );
  expect(document.getElementById("initializeargsamount")).not.toBeNull();
});

const field = (props: Record<string, unknown>) => {
  const instruction = {
    name: "increment",
    values: { args: [], accounts: [] },
  } as unknown as GeneratableInstruction;
  return render(
    <TooltipProvider>
      <InstructionProvider instruction={instruction} setInstruction={vi.fn()}>
        <InstructionInput
          {...({
            prefix: "accounts",
            type: "publicKey",
            variant: "desk",
            updateInstruction: vi.fn(),
            ...props,
          } as unknown as Parameters<typeof InstructionInput>[0])}
        />
      </InstructionProvider>
    </TooltipProvider>
  );
};

it("offers Paste inside an empty account field, in place of the type", () => {
  field({ name: "counter", generator: { type: "Custom", value: "" } });
  expect(screen.getByRole("button", { name: "Paste counter" })).toBeTruthy();
  expect(screen.queryByText("pubkey")).toBeNull();
  expect(screen.queryByRole("button", { name: "Copy counter" })).toBeNull();
});

it("ends a filled field with copy alone", () => {
  field({
    name: "counter",
    generator: {
      type: "Custom",
      value: "9hJqVkT3wXo7mZpR2bNcY4sUeQ1aLdG8fHtKzWxCvB",
    },
  });
  expect(screen.getByRole("button", { name: "Copy counter" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Paste counter" })).toBeNull();
});

it("shows a program the form filled by name as a fixed value", () => {
  field({
    name: "systemProgram",
    generator: { type: "All programs", name: "System" },
  });
  expect(screen.getByText("System Program")).toBeTruthy();
  expect(screen.getByText("1111\u20261111")).toBeTruthy();
  expect(screen.queryByRole("button", { name: /Paste/ })).toBeNull();
  // The id dependent fields fill through is still there
  expect(
    document.getElementById("incrementaccountssystemProgram")
  ).not.toBeNull();
});
