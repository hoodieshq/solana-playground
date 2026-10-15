// The footer link reaches the utils barrel, whose generated globals exist only
// once the app has booted; what it draws is not under test
vi.mock("../../../../components/Link", () => ({
  default: (props: { children: React.ReactNode }) => (
    <span>{props.children}</span>
  ),
}));

import { render, screen } from "@testing-library/react";
import { ThemeProvider, type DefaultTheme } from "styled-components";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import Connect from "./Connect";
import type { ConnectProps } from "./Connect";
import { PgAssistant, type Connection } from "../store";

/**
 * A theme that answers every key: the form reads deep theme keys for its
 * styles, none of which matters here, and the real theme needs the utils
 * barrel.
 */
const anyTheme: DefaultTheme = new Proxy(
  {},
  {
    get: (_, key) =>
      key === Symbol.toPrimitive || key === "toString"
        ? () => "inherit"
        : anyTheme,
  }
) as unknown as DefaultTheme;

const OWN: Connection = {
  id: "openai",
  apiKey: "sk-test-connect-0123456789",
  endpoint: { baseUrl: "https://api.example.test/v1", model: "gpt-x" },
};

const renderConnect = (props: ConnectProps) =>
  render(
    <ThemeProvider theme={anyTheme}>
      <Connect defaultBackend={props.defaultBackend} preset={props.preset} />
    </ThemeProvider>
  );

const checked = () =>
  screen
    .getAllByRole("radio")
    .find((radio) => radio.getAttribute("aria-checked") === "true");

describe("Connect", () => {
  beforeEach(() => {
    PgAssistant.disconnect();
  });
  afterEach(() => {
    PgAssistant.disconnect();
    vi.restoreAllMocks();
  });

  it("offers no default the deployment does not serve, and falls back to a key", () => {
    renderConnect({ defaultBackend: false });

    expect(screen.getByText(/Not configured on this deployment/)).toBeTruthy();
    expect(checked()?.getAttribute("value")).toBe("anthropic");
  });

  it("neither offers nor rules out the default while the probe is out", () => {
    renderConnect({ defaultBackend: undefined });

    expect(
      screen.getByText("Checking this deployment for a default backend…")
    ).toBeTruthy();
    expect(checked()).toBeUndefined();
  });

  it("opens on the connected backend with its own key and endpoint", () => {
    PgAssistant.connect(OWN);

    renderConnect({ defaultBackend: true });

    expect(checked()?.getAttribute("value")).toBe("openai");
    expect(
      document.querySelector<HTMLInputElement>("#assistant-api-key")?.value
    ).toBe(OWN.apiKey);
    expect(
      document.querySelector<HTMLInputElement>("#assistant-model")?.value
    ).toBe("gpt-x");
  });

  it("opens on a preset backend without the connected one's key", () => {
    PgAssistant.connect(OWN);

    renderConnect({
      defaultBackend: true,
      preset: { provider: "anthropic" },
    });

    expect(checked()?.getAttribute("value")).toBe("anthropic");
    expect(
      document.querySelector<HTMLInputElement>("#assistant-api-key")?.value
    ).toBe("");
  });

  it("brings no title or way back of its own: the dialog has them", () => {
    renderConnect({ defaultBackend: true });

    expect(screen.queryByRole("heading")).toBeNull();
    expect(screen.queryByText("Back to chat")).toBeNull();
  });
});
