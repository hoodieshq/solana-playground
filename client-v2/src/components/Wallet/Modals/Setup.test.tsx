import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DefaultTheme, ThemeProvider } from "styled-components";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  initLogger,
  memoryProvider as logMemory,
  resetLogger,
} from "@/shared/lib/logger";
import { PgWallet } from "../../../utils";
import { KeypairFileError } from "../../../utils/wallet/keypair-file";
import { Setup } from "./Setup";

// The utils barrel needs build-time globals the unit runner does not define.
vi.mock("../../../utils", () => ({
  PgWallet: {
    accounts: [{ name: "Wallet 1", kp: [] }],
    add: vi.fn(),
    export: vi.fn(),
    import: vi.fn(),
    remove: vi.fn(),
    getNextAvailableAccountName: () => "Wallet 1",
  },
  PgWeb3: { Keypair: { generate: () => ({}) } },
}));

// The frame is the overlay system's; what is under test is the body.
vi.mock("@/widgets/overlays", () => ({
  ModalFrame: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

const theme = {
  colors: { default: { textSecondary: "gray" } },
  font: { code: { size: { small: "12px" } } },
} as unknown as DefaultTheme;

const renderSetup = () =>
  render(
    <ThemeProvider theme={theme}>
      <Setup />
    </ThemeProvider>
  );

let logs: ReturnType<typeof logMemory>;
beforeEach(() => {
  logs = logMemory();
  initLogger({ providers: [logs] });
});
afterEach(() => {
  vi.clearAllMocks();
  resetLogger();
});

describe("wallet Setup", () => {
  it("keeps the current wallet when a keypair is imported", async () => {
    vi.mocked(PgWallet.import).mockResolvedValueOnce({
      publicKey: { toBase58: () => "NewAddress" },
    } as never);
    renderSetup();

    fireEvent.click(screen.getByRole("button", { name: "Import keypair" }));

    expect(
      await screen.findByText("Imported address: NewAddress")
    ).toBeTruthy();
    expect(PgWallet.remove).not.toHaveBeenCalled();
  });

  it("keeps the current wallet when the file picker is closed", async () => {
    vi.mocked(PgWallet.import).mockResolvedValueOnce(undefined);
    renderSetup();

    fireEvent.click(screen.getByRole("button", { name: "Import keypair" }));

    await waitFor(() => expect(PgWallet.import).toHaveBeenCalled());
    expect(PgWallet.remove).not.toHaveBeenCalled();
  });

  it("says so when the file is not a keypair, without reporting it", async () => {
    const failure = new KeypairFileError();
    vi.mocked(PgWallet.import).mockRejectedValueOnce(failure);
    renderSetup();

    fireEvent.click(screen.getByRole("button", { name: "Import keypair" }));

    expect(await screen.findByText(failure.message)).toBeTruthy();
    expect(PgWallet.remove).not.toHaveBeenCalled();
    expect(logs.entries).toEqual([]);
  });
});
