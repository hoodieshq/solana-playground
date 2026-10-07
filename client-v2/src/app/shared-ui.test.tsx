// The design-system components installed into shared/ui mount in client-v2
// as installed, before the layout shell (HOO-1854) builds on them.
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Button } from "@/shared/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/shared/ui/resizable";
import {
  Sidebar,
  SidebarContent,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/shared/ui/sidebar";

// jsdom has neither, every browser has both: the sidebar asks `matchMedia`
// whether it is on a phone, and the panel group measures itself with a
// `ResizeObserver`.
class NoopResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function desktopMatchMedia(query: string) {
  return {
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  };
}

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", NoopResizeObserver);
  vi.stubGlobal("matchMedia", desktopMatchMedia);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("shared/ui", () => {
  it("renders a sidebar and its trigger inside the provider", () => {
    render(
      <SidebarProvider>
        <Sidebar>
          <SidebarContent>Explorer</SidebarContent>
        </Sidebar>
        <SidebarInset>
          <SidebarTrigger />
        </SidebarInset>
      </SidebarProvider>
    );

    expect(screen.getByText("Explorer").textContent).toBe("Explorer");
    expect(
      screen
        .getByRole("button", { name: "Toggle Sidebar" })
        .getAttribute("data-slot")
    ).toBe("sidebar-trigger");
  });

  it("renders two resizable panels with a handle between them", () => {
    const { container } = render(
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel>Editor</ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel>Terminal</ResizablePanel>
      </ResizablePanelGroup>
    );

    expect(screen.getByText("Editor").textContent).toBe("Editor");
    expect(screen.getByText("Terminal").textContent).toBe("Terminal");
    expect(
      container.querySelectorAll('[data-slot="resizable-handle"]')
    ).toHaveLength(1);
  });

  it("renders a button that carries its data-slot", () => {
    render(<Button>Build</Button>);

    expect(
      screen.getByRole("button", { name: "Build" }).getAttribute("data-slot")
    ).toBe("button");
  });
});
