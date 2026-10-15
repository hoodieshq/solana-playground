import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider, type DefaultTheme } from "styled-components";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  initTelemetry,
  memoryProvider as memoryTelemetry,
  resetTelemetry,
} from "../../../shared/lib/telemetry";
import { PgView } from "@/utils/view";
import { PgAssistant } from "../../../views/sidebar/assistant/store";
import { ModalHost } from "../../overlays";
import type { DefaultBackend } from "../model/default-backend";
import { openConnectDialog } from "./ConnectDialog";

// The form's footer link reaches the utils barrel, which needs the build's
// globals; what it draws is not under test
vi.mock("../../../components/Link", () => ({
  default: (props: { children: React.ReactNode }) => (
    <span>{props.children}</span>
  ),
}));

// The probe is the deployment's; a test says what it answered
let backend: DefaultBackend;
vi.mock("../model/default-backend", () => ({
  useDefaultBackend: () => backend,
}));

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

class NoopResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

let events: ReturnType<typeof memoryTelemetry>;
/** The assistant's own events; the overlay reports the dialog on its own */
const eventNames = () =>
  events.events
    .filter((e) => e.name.startsWith("assistant_"))
    .map((e) => [e.name, e.params]);

beforeEach(() => {
  events = memoryTelemetry();
  initTelemetry({ providers: [events] });
  backend = { state: "absent" };
  PgAssistant.disconnect();
  localStorage.clear();
  sessionStorage.clear();
  vi.stubGlobal("ResizeObserver", NoopResizeObserver);
});
afterEach(async () => {
  // `closeModal` answers every pending `setModal` (HOO-2091): one left open
  // here would be answered by the next test's connection
  await act(async () => PgView.closeModal(null));
  PgAssistant.disconnect();
  resetTelemetry();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const renderHost = () =>
  render(
    <ThemeProvider theme={anyTheme}>
      <ModalHost />
    </ThemeProvider>
  );

const dialog = () => screen.queryByRole("dialog", { name: "Connect a model" });

describe("ConnectDialog", () => {
  it("opens as a dialog titled Connect a model, and says where from", () => {
    renderHost();

    act(() => void openConnectDialog("menu"));

    expect(dialog()).toBeTruthy();
    expect(PgAssistant.isPickingBackend).toBe(true);
    expect(eventNames()).toEqual([
      ["assistant_connect_opened", { via: "menu" }],
    ]);
  });

  it("does not open a second one over the first", () => {
    renderHost();

    act(() => void openConnectDialog("menu"));
    act(() => void openConnectDialog("send"));

    expect(screen.getAllByRole("dialog").length).toBe(1);
    expect(eventNames()).toEqual([
      ["assistant_connect_opened", { via: "menu" }],
    ]);
  });

  it("closes once a backend is connected, and reports the pick", async () => {
    renderHost();
    const user = userEvent.setup();
    act(() => void openConnectDialog("model"));

    // With no default on this deployment the form falls back to Anthropic
    await user.type(
      document.querySelector<HTMLInputElement>("#assistant-api-key")!,
      "sk-ant-fake"
    );
    await user.click(screen.getByRole("button", { name: "Connect" }));

    await waitFor(() => expect(dialog()).toBeNull());
    expect(PgAssistant.connection?.id).toBe("anthropic");
    expect(PgAssistant.isPickingBackend).toBe(false);
    expect(eventNames()).toEqual([
      ["assistant_connect_opened", { via: "model" }],
      ["assistant_model_picked", { provider: "anthropic", via: "dialog" }],
    ]);
  });

  it("closes on Escape without connecting", async () => {
    renderHost();
    act(() => void openConnectDialog("menu"));

    act(() => {
      fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    });

    await waitFor(() => expect(dialog()).toBeNull());
    expect(PgAssistant.connection).toBeNull();
    expect(PgAssistant.isPickingBackend).toBe(false);
    expect(eventNames()).toEqual([
      ["assistant_connect_opened", { via: "menu" }],
    ]);
  });

  it("opens on the backend and model it was asked for", () => {
    backend = { state: "present", model: "z-ai/glm-5.3-flash:US" };
    renderHost();

    act(
      () =>
        void openConnectDialog("model", {
          provider: "anthropic",
          model: "claude-opus-5-5",
        })
    );

    expect(
      screen
        .getByRole("radio", { name: /Anthropic/ })
        .getAttribute("aria-checked")
    ).toBe("true");
    expect(screen.getByRole("combobox", { name: "Model" }).textContent).toBe(
      "claude-opus-5-5"
    );
    // A dialog has a title of its own; the form brings none
    expect(screen.queryByText("Back to chat")).toBeNull();
    expect(
      screen.queryByText("An assistant that can see your project")
    ).toBeNull();
  });
});
