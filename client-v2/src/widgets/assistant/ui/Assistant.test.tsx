import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TooltipProvider } from "@/shared/ui/tooltip";
import { PgAssistant } from "../../../views/sidebar/assistant/store";

// The thread, Sources and the composer stand in by name: what is under test
// is which of them the panel shows, not what they draw
vi.mock("../../../views/sidebar/assistant/Component/Chat", () => ({
  default: () => <div>thread</div>,
}));
vi.mock("../../../views/sidebar/assistant/Component/Grounding", () => ({
  default: () => <div>sources</div>,
}));
vi.mock("./AssistantComposer", () => ({
  AssistantComposer: () => <div>composer</div>,
}));
const turn = vi.hoisted(() => ({ openConnect: vi.fn() }));
vi.mock("../model/use-turn", () => ({ useTurn: () => turn }));

// The explorer's workspace, with the two events the heading follows
const explorer = vi.hoisted(() => ({
  name: "hello-anchor" as string | undefined,
  listeners: new Set<() => void>(),
}));
vi.mock("../../../utils/explorer/explorer", () => {
  const on = (cb: () => void) => {
    explorer.listeners.add(cb);
    return { dispose: () => explorer.listeners.delete(cb) };
  };
  return {
    PgExplorer: {
      get currentWorkspaceName() {
        return explorer.name;
      },
      onDidInit: on,
      onDidSwitchWorkspace: on,
      onDidRenameWorkspace: on,
    },
  };
});

import { Assistant } from "./Assistant";

class NoopResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  explorer.name = "hello-anchor";
  explorer.listeners.clear();
  turn.openConnect.mockClear();
  vi.spyOn(PgAssistant, "initMcp").mockResolvedValue(undefined);
  vi.stubGlobal("ResizeObserver", NoopResizeObserver);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const setup = () => {
  const setWide = vi.fn();
  const onHide = vi.fn();
  // The app's one `TooltipProvider` sits in `App`
  render(
    <TooltipProvider>
      <Assistant wide={false} setWide={setWide} canWiden onHide={onHide} />
    </TooltipProvider>
  );
  return { setWide, onHide, user: userEvent.setup() };
};

const openSources = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("button", { name: "More" }));
  await user.click(screen.getByRole("menuitem", { name: /Sources and tools/ }));
};

describe("Assistant", () => {
  it("shows the thread over the composer, under the project's name", () => {
    setup();
    expect(screen.getByRole("heading", { name: "hello-anchor" })).toBeTruthy();
    expect(screen.getByText("thread")).toBeTruthy();
    expect(screen.getByText("composer")).toBeTruthy();
  });

  it("asks the gateway for its tools once, on mount", () => {
    setup();
    expect(PgAssistant.initMcp).toHaveBeenCalledTimes(1);
  });

  it("follows a switch or a rename of the project", () => {
    setup();
    explorer.name = "renamed";
    act(() => explorer.listeners.forEach((cb) => cb()));
    expect(screen.getByRole("heading", { name: "renamed" })).toBeTruthy();
  });

  it("puts Sources and tools in place of the thread and composer, and comes back", async () => {
    const { user } = setup();
    await openSources(user);
    expect(screen.getByText("sources")).toBeTruthy();
    expect(screen.queryByText("thread")).toBeNull();
    expect(screen.queryByText("composer")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByText("thread")).toBeTruthy();
    expect(screen.queryByText("sources")).toBeNull();
  });

  it("goes back to the chat when a prompt is requested from Sources", async () => {
    const { user } = setup();
    await openSources(user);
    act(() => PgAssistant.requestPrompt("fix this"));
    expect(screen.getByText("composer")).toBeTruthy();
    expect(screen.queryByText("sources")).toBeNull();
  });

  it("opens Connect a model from More as the menu's", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "More" }));
    await user.click(screen.getByRole("menuitem", { name: /Connect a model/ }));
    expect(turn.openConnect).toHaveBeenCalledWith("menu");
  });

  it("widens through the shell, and hides through it", async () => {
    const { user, setWide, onHide } = setup();
    await user.click(
      screen.getByRole("button", { name: "Widen the assistant" })
    );
    expect(setWide).toHaveBeenCalledWith(true);
    await user.click(
      screen.getByRole("button", { name: "Collapse assistant" })
    );
    expect(onHide).toHaveBeenCalledTimes(1);
  });
});
