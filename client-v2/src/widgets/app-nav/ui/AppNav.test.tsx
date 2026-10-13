import { fireEvent, render, screen } from "@testing-library/react";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  expect,
  it,
  vi,
} from "vitest";

import {
  initTelemetry,
  memoryProvider,
  resetTelemetry,
} from "@/shared/lib/telemetry";
import { SidebarProvider } from "@/shared/ui/sidebar";
import { TooltipProvider } from "@/shared/ui/tooltip";

// The `@/utils` barrel needs a booted app; the nav uses only `PgView`
const view = vi.hoisted(() => ({ setModal: vi.fn() }));
vi.mock("@/utils", () => ({ PgView: view }));
// The gallery pulls in the legacy modal and the whole `@/utils` barrel; the
// nav only hands it to `PgView.setModal`
vi.mock("@/views/flow/gallery/NewWorkspaceModal", () => ({
  default: () => null,
}));

import NewWorkspaceModal from "@/views/flow/gallery/NewWorkspaceModal";
import AppNav from "./AppNav";

// The stock Sidebar reads the viewport through `matchMedia`, which jsdom lacks
beforeAll(() => {
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
  view.setModal.mockClear();
  sent = memoryProvider();
  initTelemetry({ providers: [sent] });
});
afterEach(() => {
  resetTelemetry();
});

const draw = () =>
  render(
    <TooltipProvider>
      <SidebarProvider>
        <AppNav
          collapsed={false}
          onToggle={() => {}}
          logo={null}
          switcher={null}
          footer={null}
        />
      </SidebarProvider>
    </TooltipProvider>
  );

const opened = () =>
  sent.events
    .filter((event) => event.name === "nav_item_opened")
    .map((event) => event.params);

it("sends nav_item_opened and opens the tutorials tab for Tutorials", () => {
  draw();
  fireEvent.click(screen.getByRole("button", { name: "Tutorials" }));
  expect(opened()).toEqual([{ item: "tutorials" }]);
  expect(view.setModal).toHaveBeenCalledWith(NewWorkspaceModal, {
    initialTab: "tutorials",
  });
});

it("opens the gallery on its programs tab for Programs", () => {
  draw();
  fireEvent.click(screen.getByRole("button", { name: "Programs" }));
  expect(opened()).toEqual([{ item: "programs" }]);
  expect(view.setModal).toHaveBeenCalledWith(NewWorkspaceModal, {
    initialTab: "programs",
  });
});

it("opens the default tab for Home and New project", () => {
  draw();
  fireEvent.click(screen.getByRole("button", { name: "Home" }));
  fireEvent.click(screen.getByRole("button", { name: "New project" }));
  expect(opened()).toEqual([{ item: "home" }, { item: "new-project" }]);
  expect(view.setModal).toHaveBeenNthCalledWith(1, NewWorkspaceModal, {
    initialTab: "tutorials",
  });
  expect(view.setModal).toHaveBeenNthCalledWith(2, NewWorkspaceModal, {
    initialTab: "tutorials",
  });
});
