import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import Settings from "./Settings";

// The utils barrel needs build-time globals the unit runner does not define.
vi.mock("../../utils", () => ({
  PgCommand: { connect: { execute: vi.fn() } },
  PgView: {
    ids: { WALLET_RENAME_INPUT: "wallet-rename-input" },
    setModal: vi.fn(),
  },
  PgWallet: {
    current: {
      isPg: true,
      publicKey: { toBase58: () => "address" },
    },
    standardWallets: [],
    import: vi.fn(),
    export: vi.fn(),
  },
}));

vi.mock("../../hooks", () => ({ useCopy: () => [false, vi.fn()] }));
vi.mock("./hooks", () => ({
  useAirdrop: () => ({ airdrop: vi.fn(), airdropCondition: false }),
  useDarken: () => ({ darken: vi.fn(), lighten: vi.fn() }),
}));

// The icons and the button are styled-components that read the app theme;
// they are not what is under test.
vi.mock("../Icons", () => {
  const Icon = () => <svg aria-hidden />;
  return {
    Airdrop: Icon,
    Copy: Icon,
    Edit: Icon,
    ExportFile: Icon,
    ImportFile: Icon,
    Plus: Icon,
    ThreeDots: Icon,
    Trash: Icon,
  };
});
vi.mock("../Button", async () => {
  const { forwardRef } = await import("react");
  return {
    // Radix's `asChild` hands its props and ref to this element
    default: forwardRef<HTMLButtonElement>((props, ref) => (
      <button type="button" ref={ref} {...props} />
    )),
  };
});
vi.mock("../Img", () => ({ default: () => null }));

afterEach(() => vi.restoreAllMocks());

/** What `Wallet.tsx` does: the rename input appears once `showRename` ran */
const Host = () => {
  const [rename, setRename] = useState(false);
  return (
    <>
      <Settings showRename={() => setRename(true)} />
      {rename && <input id="wallet-rename-input" aria-label="Rename" />}
    </>
  );
};

const openMenu = async () => {
  const trigger = screen.getByTitle("More");
  trigger.focus();
  fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false });
  return await screen.findByRole("menu");
};

describe("wallet Settings menu", () => {
  it("focuses the rename input after Rename, not the trigger", async () => {
    render(<Host />);
    await openMenu();

    fireEvent.click(screen.getByRole("menuitem", { name: /Rename/ }));

    const input = await screen.findByLabelText("Rename");
    await waitFor(() => expect(document.activeElement).toBe(input));
  });

  it("leaves focus to Radix's return to the trigger after Copy address", async () => {
    render(<Host />);
    const trigger = screen.getByTitle("More");
    await openMenu();

    fireEvent.click(screen.getByRole("menuitem", { name: /Copy address/ }));

    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });
});
