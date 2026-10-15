import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TooltipProvider } from "@/shared/ui/tooltip";
import { BaseAssistantHead } from "./BaseAssistantHead";

interface HeadChoice {
  wide?: boolean;
  canWiden?: boolean;
}

const setup = (choice: HeadChoice = {}) => {
  const onSources = vi.fn();
  const onConnect = vi.fn();
  const onWiden = vi.fn();
  const onHide = vi.fn();
  render(
    <TooltipProvider>
      <BaseAssistantHead
        title="hello-anchor"
        onSources={onSources}
        onConnect={onConnect}
        wide={choice.wide ?? false}
        onWiden={onWiden}
        onHide={onHide}
        canWiden={choice.canWiden ?? true}
      />
    </TooltipProvider>
  );
  return { onSources, onConnect, onWiden, onHide, user: userEvent.setup() };
};

class NoopResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const more = () => screen.getByRole("button", { name: "More" });

describe("BaseAssistantHead", () => {
  it("names the project", () => {
    setup();
    expect(screen.getByText("hello-anchor")).toBeTruthy();
  });

  it("lists the three items under More, Clear conversation disabled", async () => {
    const { user } = setup();
    await user.click(more());
    const items = screen.getAllByRole("menuitem");
    expect(items.map((item) => item.textContent)).toEqual([
      "Sources and toolsS",
      "Connect a model…K",
      "Clear conversation",
    ]);
    expect(
      screen
        .getByRole("menuitem", { name: "Clear conversation" })
        .getAttribute("aria-disabled")
    ).toBe("true");
  });

  it("says why Clear conversation is disabled", async () => {
    // The tooltip's positioning watches its trigger's size
    vi.stubGlobal("ResizeObserver", NoopResizeObserver);
    try {
      const { user } = setup();
      await user.click(more());
      const item = screen.getByRole("menuitem", { name: "Clear conversation" });
      // The item takes no pointer events while disabled; its wrapper does
      await user.hover(item.parentElement!);
      expect((await screen.findByRole("tooltip")).textContent).toBe(
        "Coming soon"
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("opens Sources and tools and Connect a model from their items", async () => {
    const { user, onSources, onConnect } = setup();
    await user.click(more());
    await user.click(
      screen.getByRole("menuitem", { name: /Sources and tools/ })
    );
    expect(onSources).toHaveBeenCalledTimes(1);
    await user.click(more());
    await user.click(screen.getByRole("menuitem", { name: /Connect a model/ }));
    expect(onConnect).toHaveBeenCalledTimes(1);
  });

  it("does not hand focus back to More once an item is picked", async () => {
    // The picked item replaces the view; in the browser More's focus came back
    // after the menu's exit animation and shut a select opened meanwhile
    const { user } = setup();
    await user.click(more());
    await user.click(screen.getByRole("menuitem", { name: /Connect a model/ }));
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).not.toBe(more());
  });

  it("gives focus back to More when the menu is dismissed", async () => {
    const { user } = setup();
    await user.click(more());
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(more());
  });

  it("picks Sources and tools with S while the menu is open, and closes it", async () => {
    const { user, onSources, onConnect } = setup();
    await user.click(more());
    await user.keyboard("s");
    expect(onSources).toHaveBeenCalledTimes(1);
    expect(onConnect).not.toHaveBeenCalled();
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("picks Connect a model with K while the menu is open, and closes it", async () => {
    const { user, onSources, onConnect } = setup();
    await user.click(more());
    await user.keyboard("K");
    expect(onConnect).toHaveBeenCalledTimes(1);
    expect(onSources).not.toHaveBeenCalled();
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("leaves S and K alone with the menu closed", async () => {
    const { user, onSources, onConnect } = setup();
    more().focus();
    await user.keyboard("sk");
    expect(onSources).not.toHaveBeenCalled();
    expect(onConnect).not.toHaveBeenCalled();
  });

  it("leaves S with a modifier to the browser", async () => {
    const { user, onSources } = setup();
    await user.click(more());
    await user.keyboard("{Meta>}s{/Meta}");
    expect(onSources).not.toHaveBeenCalled();
  });

  it("widens, and its label follows wide", async () => {
    const { user, onWiden } = setup();
    await user.click(
      screen.getByRole("button", { name: "Widen the assistant" })
    );
    expect(onWiden).toHaveBeenCalledTimes(1);
  });

  it("offers to narrow once wide", () => {
    setup({ wide: true });
    expect(
      screen.getByRole("button", { name: "Narrow the assistant" })
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Widen the assistant" })
    ).toBeNull();
  });

  it("offers no Widen where it cannot widen", () => {
    setup({ canWiden: false });
    expect(screen.queryByRole("button", { name: /Widen|Narrow/ })).toBeNull();
  });

  it("hides as Collapse assistant", async () => {
    const { user, onHide } = setup();
    await user.click(
      screen.getByRole("button", { name: "Collapse assistant" })
    );
    expect(onHide).toHaveBeenCalledTimes(1);
  });
});
