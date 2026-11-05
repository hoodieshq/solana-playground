// A stage's code fails to load (offline, or a release replaced the chunk): the
// stage says so in its own panel and the rest of the app stays up.
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentType, ReactNode } from "react";
import { Component, Suspense } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { initLogger, resetLogger } from "@/shared/lib/logger";
import { memoryProvider } from "@/shared/lib/logger/providers/memory";

import { lazyStage, StageLoadFailed } from "./lazy-stage";

type Module = { default: ComponentType };

const Loaded = () => <p>stage content</p>;
const failed = () => Promise.reject(new Error("Loading chunk 7 failed"));
const loaded = () => Promise.resolve<Module>({ default: Loaded });

/** Stands in for the app's own boundary, the screen this must not reach */
class AppBoundary extends Component<
  { children: ReactNode },
  { error?: Error }
> {
  state: { error?: Error } = {};
  static getDerivedStateFromError = (error: Error) => ({ error });
  render() {
    return this.state.error ? (
      <p>app crashed: {this.state.error.message}</p>
    ) : (
      this.props.children
    );
  }
}

const show = async (Stage: ComponentType) => {
  const view = render(
    <AppBoundary>
      <Suspense fallback={<p>loading</p>}>
        <Stage />
      </Suspense>
    </AppBoundary>
  );
  await act(async () => {
    await Promise.resolve();
  });
  return view;
};

const goOnline = () => {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
  act(() => {
    window.dispatchEvent(new Event("online"));
  });
};

describe("lazyStage", () => {
  beforeEach(() => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it("renders the stage when its code loads", async () => {
    await show(lazyStage(loaded, "deploy"));
    expect(await screen.findByText("stage content")).toBeTruthy();
  });

  it("says offline that the stage needs a connection, without crashing the app", async () => {
    await show(lazyStage(failed, "deploy"));
    expect(await screen.findByText("Deploy needs a connection")).toBeTruthy();
    expect(screen.queryByText(/app crashed/)).toBeNull();
  });

  it("does not load again by itself while it stays failed", async () => {
    const load = vi.fn(failed);
    await show(lazyStage(load, "deploy"));
    await screen.findByText("Deploy needs a connection");
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("says it did not load when the browser reports a network", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    await show(lazyStage(failed, "deploy"));
    expect(await screen.findByText("Deploy couldn't load")).toBeTruthy();
  });

  it("reports a failed load only when the browser reports a network", async () => {
    const logged = memoryProvider();
    initLogger({ providers: [logged] });
    await show(lazyStage(failed, "deploy"));
    await screen.findByText("Deploy needs a connection");
    expect(logged.entries).toEqual([]);

    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    await show(lazyStage(failed, "interact"));
    await screen.findByText("Interact couldn't load");
    expect(logged.entries).toHaveLength(1);
    expect(logged.entries[0].report).toBe(true);
    resetLogger();
  });

  it("loads the stage on Try again", async () => {
    const load = vi.fn<() => Promise<Module>>(failed);
    await show(lazyStage(load, "deploy"));
    load.mockImplementation(loaded);
    fireEvent.click(await screen.findByRole("button", { name: "Try again" }));
    expect(await screen.findByText("stage content")).toBeTruthy();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("loads the stage by itself when the network comes back", async () => {
    const load = vi.fn<() => Promise<Module>>(failed);
    await show(lazyStage(load, "deploy"));
    await screen.findByText("Deploy needs a connection");
    load.mockImplementation(loaded);
    goOnline();
    expect(await screen.findByText("stage content")).toBeTruthy();
  });

  it("tries again when the stage is opened again after a failure", async () => {
    const load = vi.fn<() => Promise<Module>>(failed);
    const Stage = lazyStage(load, "deploy");
    const first = await show(Stage);
    await screen.findByText("Deploy needs a connection");
    first.unmount();

    load.mockImplementation(loaded);
    await show(Stage);
    expect(await screen.findByText("stage content")).toBeTruthy();
  });

  it("leaves an error thrown while the stage renders to the app's boundary", async () => {
    const Broken = (): never => {
      throw new Error("render broke");
    };
    await show(lazyStage(() => Promise.resolve({ default: Broken }), "deploy"));
    expect(await screen.findByText(/app crashed: render broke/)).toBeTruthy();
  });

  it("points to a reload once a retry failed with a network, as a new release removes the old chunk", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    await show(lazyStage(failed, "deploy"));
    expect(
      await screen.findByText(
        "Check your connection and try again. Your code is unchanged."
      )
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(
      await screen.findByText(
        "Reload the page to get the latest version. Your code is unchanged."
      )
    ).toBeTruthy();
  });
});

describe("StageLoadFailed", () => {
  afterEach(() => vi.restoreAllMocks());

  const failure = {
    stage: "deploy" as const,
    retried: false,
    onRetry: () => undefined,
  };

  it("offers Reload page with a network and reloads", () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    const reload = vi.fn();
    render(<StageLoadFailed {...failure} reload={reload} />);
    fireEvent.click(screen.getByRole("button", { name: "Reload page" }));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("keeps Try again offline and offers no reload, which would lose the app", () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    render(<StageLoadFailed {...failure} />);
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Reload page" })).toBeNull();
    expect(
      screen.getByText("It hasn't loaded yet. Your code is unchanged.")
    ).toBeTruthy();
  });
});
