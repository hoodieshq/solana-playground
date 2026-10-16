import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  expect,
  it,
  vi,
} from "vitest";

import { PgSession } from "@/features/auth";
import { SidebarProvider } from "@/shared/ui/sidebar";
import { TooltipProvider } from "@/shared/ui/tooltip";
import {
  initLogger,
  memoryProvider as logMemory,
  resetLogger,
} from "../../../shared/lib/logger";
import {
  initTelemetry,
  memoryProvider,
  resetTelemetry,
} from "../../../shared/lib/telemetry";
import RailFooter from "./RailFooter";
import SessionFooter from "./SessionFooter";

const status = vi.hoisted(() => ({ name: "devnet", down: false }));
const wallet = vi.hoisted(() => ({
  current: null as null | { publicKey: { toBase58: () => string } },
}));
const connect = vi.hoisted(() => ({ execute: vi.fn() }));
const walletWindow = vi.hoisted(() => ({ show: false }));

vi.mock("../model/use-cluster-status", () => ({
  useClusterStatus: () => status,
}));
// The hooks and utils barrels read generated globals that exist only in the built app
vi.mock("@/hooks", () => ({
  useRenderOnChange: () => undefined,
  useWallet: () => wallet.current,
  useBalance: () => 2.4,
}));
vi.mock("@/utils", () => ({
  PgCommand: { connect },
  PgCommon: { getOS: () => "MacOS" },
  PgWallet: walletWindow,
}));
vi.mock("@/views/flow/settings/GearSidebar", () => ({
  SETTINGS_TRIGGER_ATTR: "data-settings-trigger",
}));
vi.mock("@/features/feedback", () => ({
  FeedbackMenuItems: () => null,
  useFeedbackSend: () => ({ sending: false, triggerRef: { current: null } }),
}));

// The rail's tooltips measure themselves with a `ResizeObserver` on hover
class NoopResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// The stock Sidebar reads the viewport through `matchMedia`, which jsdom lacks
beforeAll(() => {
  vi.stubGlobal("ResizeObserver", NoopResizeObserver);
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }));
});
afterAll(() => {
  vi.unstubAllGlobals();
});

let sent: ReturnType<typeof memoryProvider>;
beforeEach(() => {
  sent = memoryProvider();
  initTelemetry({ providers: [sent] });
  connect.execute.mockResolvedValue(undefined);
});
afterEach(() => {
  resetTelemetry();
  resetLogger();
  vi.restoreAllMocks();
  connect.execute.mockReset();
  status.down = false;
  wallet.current = null;
  walletWindow.show = false;
  PgSession.reset();
});

const ADDRESS = "7Hq5aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaXk2P";

const draw = (which: "footer" | "rail", onToggleSettings = vi.fn()) => {
  const Footer = which === "footer" ? SessionFooter : RailFooter;
  render(
    <TooltipProvider>
      <SidebarProvider defaultOpen={which === "footer"}>
        <Footer settingsOpen={false} onToggleSettings={onToggleSettings} />
      </SidebarProvider>
    </TooltipProvider>
  );
  return onToggleSettings;
};

const openMenu = () =>
  userEvent.click(screen.getByRole("button", { name: /^Account/ }));

const pick = async (name: string | RegExp) => {
  await openMenu();
  await userEvent.click(await screen.findByRole("menuitem", { name }));
};

const eventsNamed = (name: string) =>
  sent.events.filter((event) => event.name === name).map((e) => e.params);

it("opens the settings on the cluster from both the row and the rail's dot", async () => {
  const fromRow = draw("footer");
  await userEvent.click(
    screen.getByRole("button", { name: "Change cluster, currently devnet" })
  );
  expect(fromRow).toHaveBeenCalledExactlyOnceWith("network");
});

it("opens the settings on the cluster from the rail's dot", async () => {
  const fromDot = draw("rail");
  await userEvent.click(
    screen.getByRole("button", { name: "Cluster: devnet" })
  );
  expect(fromDot).toHaveBeenCalledExactlyOnceWith("network");
});

it.each(["footer", "rail"] as const)(
  "reports that the %s opened the menu",
  async (which) => {
    draw(which);
    await openMenu();
    expect(eventsNamed("session_account_menu_opened")).toEqual([
      { from: which },
    ]);
  }
);

it("starts a sign-in from the menu", async () => {
  const signIn = vi.spyOn(PgSession, "signIn").mockResolvedValue();
  draw("footer");
  await pick("Sign in with GitHub");
  expect(signIn).toHaveBeenCalledOnce();
  expect(eventsNamed("session_account_item_picked")).toEqual([
    { item: "sign-in" },
  ]);
});

it("asks before signing out, and signs out only on the confirmation", async () => {
  await PgSession.refreshWith({
    id: "u1",
    name: "Tester",
    image: null,
    login: "t",
  });
  const signOut = vi.spyOn(PgSession, "signOut").mockResolvedValue();
  draw("footer");

  await pick("Sign out");
  const dialog = await screen.findByRole("dialog", {
    name: "Sign out of GitHub?",
  });
  await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
  await waitFor(() => expect(dialog.isConnected).toBe(false));
  expect(signOut).not.toHaveBeenCalled();

  await pick("Sign out");
  await screen.findByRole("dialog", { name: "Sign out of GitHub?" });
  await userEvent.click(screen.getByRole("button", { name: "Sign out" }));
  expect(signOut).toHaveBeenCalledOnce();
});

it("opens the settings from the menu's Settings, showing ⌘, on a Mac", async () => {
  const onToggleSettings = draw("footer");
  await openMenu();
  const settings = await screen.findByRole("menuitem", { name: /^Settings/ });
  expect(settings.textContent).toContain("⌘,");
  await userEvent.click(settings);
  expect(onToggleSettings).toHaveBeenCalledExactlyOnceWith();
});

it("connects a wallet through the connect command", async () => {
  draw("footer");
  await pick("Connect wallet");
  expect(connect.execute).toHaveBeenCalledOnce();
});

it("logs, and reports, a wallet connect that fails, and the menu still opens", async () => {
  const logged = logMemory();
  initLogger({ providers: [logged] });
  const failure = new Error("User rejected");
  connect.execute.mockRejectedValueOnce(failure);
  draw("footer");

  await pick("Connect wallet");

  await waitFor(() =>
    expect(logged.entries).toEqual([
      expect.objectContaining({
        ns: "session-footer:account",
        level: "error",
        error: failure,
        report: true,
      }),
    ])
  );
  await openMenu();
  expect(
    await screen.findByRole("menuitem", { name: "Connect wallet" })
  ).toBeTruthy();
});

it("shows a connected wallet on the row and opens its window from the menu", async () => {
  wallet.current = { publicKey: { toBase58: () => ADDRESS } };
  draw("footer");
  expect(
    screen.getByRole("button", { name: /^Account/ }).textContent
  ).toContain("7Hq5…Xk2P · 2.40 SOL");
  await pick(/7Hq5…Xk2P/);
  expect(walletWindow.show).toBe(true);
});

it("disconnects a wallet through the same command", async () => {
  wallet.current = { publicKey: { toBase58: () => ADDRESS } };
  draw("footer");
  await pick("Disconnect wallet");
  expect(connect.execute).toHaveBeenCalledOnce();
});
