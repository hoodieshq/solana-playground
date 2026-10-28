// The "Switch to localnet?" toast: each answer does something.
import { fireEvent, render, screen } from "@testing-library/react";
import { DefaultTheme, ThemeProvider } from "styled-components";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  closeToast: vi.fn(),
  settings: { connection: { endpoint: "https://api.devnet.solana.com" } },
  noop: () => ({ dispose: () => undefined }),
}));

vi.mock("../../../utils", () => ({
  PgConnection: {
    cluster: "devnet",
    onDidChangeCluster: mocks.noop,
    onDidChangeIsClusterDown: mocks.noop,
  },
  PgSettings: mocks.settings,
  PgView: { closeToast: mocks.closeToast },
}));

import { Endpoint } from "../../../constants";
import { NonLocal } from "./NonLocal";

const THEME = {
  colors: { default: { textSecondary: "gray" } },
  font: { code: { size: { small: "12px" } } },
} as unknown as DefaultTheme;

const renderToast = () =>
  render(
    <ThemeProvider theme={THEME}>
      <NonLocal id={7} />
    </ThemeProvider>
  );

afterEach(() => vi.clearAllMocks());

describe("NonLocal", () => {
  it("No closes the toast and keeps the endpoint", () => {
    renderToast();

    fireEvent.click(screen.getByRole("button", { name: "No" }));

    expect(mocks.closeToast).toHaveBeenCalledWith(7);
    expect(mocks.settings.connection.endpoint).toBe(
      "https://api.devnet.solana.com"
    );
  });

  it("Yes switches to localnet", () => {
    renderToast();

    fireEvent.click(screen.getByRole("button", { name: "Yes" }));

    expect(mocks.settings.connection.endpoint).toBe(Endpoint.LOCALNET);
  });
});
