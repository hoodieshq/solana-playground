import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import {
  initLogger,
  memoryProvider as memoryLogs,
  resetLogger,
} from "@/shared/lib/logger";
import {
  initTelemetry,
  memoryProvider,
  resetTelemetry,
} from "@/shared/lib/telemetry";

const utils = vi.hoisted(() => {
  class ImportCancelledError extends Error {}
  return {
    ImportCancelledError,
    PgCommon: { fetchJSON: vi.fn() },
    PgGithub: { import: vi.fn() },
    PgTutorial: {
      all: [
        {
          name: "Hello Anchor",
          description: "Hello world with Anchor",
          thumbnail: "/hello.png",
          level: "Beginner",
          framework: "Anchor",
        },
      ],
      open: vi.fn(),
    },
    PgView: { setModal: vi.fn() },
  };
});
vi.mock("@/utils", () => utils);
vi.mock("@/features/new-project", () => ({
  StartFromScratch: () => <div data-testid="scratch" />,
}));

import { catalogPage } from "../model/catalog-page";
import NewProject from "./NewProject";

const PROGRAM = {
  name: "drift",
  description: "Perps",
  repo: "https://github.com/x/drift",
  icon: "/drift.png",
  framework: "Anchor",
  categories: ["DeFi"],
};

class NoopResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

let sent: ReturnType<typeof memoryProvider>;
let logged: ReturnType<typeof memoryLogs>;
beforeEach(() => {
  vi.stubGlobal("ResizeObserver", NoopResizeObserver);
  utils.PgCommon.fetchJSON.mockReset().mockResolvedValue([PROGRAM]);
  utils.PgGithub.import.mockReset().mockResolvedValue(undefined);
  utils.PgTutorial.open.mockReset().mockResolvedValue(undefined);
  utils.PgView.setModal.mockReset();
  sent = memoryProvider();
  initTelemetry({ providers: [sent] });
  logged = memoryLogs();
  initLogger({ providers: [logged] });
});
afterEach(() => {
  vi.unstubAllGlobals();
  resetTelemetry();
  resetLogger();
});

const named = (name: string) => sent.events.filter((e) => e.name === name);
const choice = (name: RegExp) => screen.getByRole("radio", { name });

it("holds Start from scratch, the two lists with their counts, and the tutorials", async () => {
  render(<NewProject />);

  expect(screen.getByTestId("scratch")).toBeTruthy();
  expect(choice(/Tutorials/).textContent).toBe("Tutorials1");
  expect(choice(/Programs/).textContent).toBe("Programs…");
  await waitFor(() => expect(choice(/Programs/).textContent).toBe("Programs1"));
  expect(choice(/Tutorials/).getAttribute("aria-checked")).toBe("true");
  expect(
    screen.getByRole("button", { name: "Open Hello Anchor" })
  ).toBeTruthy();
  expect(
    screen.getByRole("searchbox", { name: "Search tutorials" })
  ).toBeTruthy();
});

it("switches to the programs and measures the switch", async () => {
  render(<NewProject />);

  fireEvent.click(choice(/Programs/));

  expect(
    await screen.findByRole("button", { name: "Open drift" })
  ).toBeTruthy();
  expect(
    screen.getByRole("searchbox", { name: "Search programs" })
  ).toBeTruthy();
  expect(named("catalog_tab_switched").map((e) => e.params)).toEqual([
    { tab: "programs" },
  ]);
});

it("opens on the tab it is given", async () => {
  render(<NewProject initialTab="programs" />);

  expect(
    await screen.findByRole("button", { name: "Open drift" })
  ).toBeTruthy();
  expect(named("catalog_tab_switched")).toEqual([]);
});

it("counts programs it could not read as ? and offers Retry", async () => {
  utils.PgCommon.fetchJSON
    .mockReset()
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce([PROGRAM]);
  render(<NewProject initialTab="programs" />);

  const alert = await screen.findByRole("alert");
  expect(choice(/Programs/).textContent).toBe("Programs?");
  fireEvent.click(within(alert).getByRole("button", { name: "Retry" }));
  expect(
    await screen.findByRole("button", { name: "Open drift" })
  ).toBeTruthy();
});

it("closes the dialog once a card opens, and only then", async () => {
  render(<NewProject />);
  const open = screen.getByRole("button", { name: "Open Hello Anchor" });

  utils.PgTutorial.open.mockRejectedValueOnce(new Error("gone"));
  await act(async () => fireEvent.click(open));
  expect(utils.PgView.setModal).not.toHaveBeenCalled();
  expect(screen.getByText("gone")).toBeTruthy();

  await act(async () => fireEvent.click(open));
  expect(utils.PgView.setModal).toHaveBeenCalledWith(null);
});

it("leaves the catalog's pages alone: it closes its dialog, not a page", async () => {
  const close = vi.spyOn(catalogPage, "close");
  render(<NewProject />);

  await act(async () =>
    fireEvent.click(screen.getByRole("button", { name: "Open Hello Anchor" }))
  );

  expect(utils.PgView.setModal).toHaveBeenCalledWith(null);
  expect(close).not.toHaveBeenCalled();
  close.mockRestore();
});

it("keeps a failed program list off the Tutorials list", async () => {
  utils.PgCommon.fetchJSON.mockReset().mockRejectedValue(new Error("offline"));
  render(<NewProject />);

  await waitFor(() => expect(choice(/Programs/).textContent).toBe("Programs?"));
  expect(screen.queryByRole("alert")).toBeNull();
  expect(
    screen.getByRole("button", { name: "Open Hello Anchor" })
  ).toBeTruthy();
});

it("closes no other dialog when an Open ends after this one closed", async () => {
  let release!: () => void;
  utils.PgTutorial.open.mockReturnValueOnce(
    new Promise<void>((resolve) => (release = resolve))
  );
  const { unmount } = render(<NewProject />);

  fireEvent.click(screen.getByRole("button", { name: "Open Hello Anchor" }));
  unmount();
  await act(async () => release());

  expect(utils.PgView.setModal).not.toHaveBeenCalled();
});
