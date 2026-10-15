import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { OutletContent, useOutletNode } from "@/shared/lib/outlet";

import BasePhonePager, { SWIPE_SETTLE_MS } from "./BasePhonePager";
import type { BasePhonePagerProps } from "./BasePhonePager";

class NoopResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

let pageWidth = 390;
const widthDescriptor = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  "clientWidth"
);

beforeEach(() => {
  pageWidth = 390;
  vi.stubGlobal("ResizeObserver", NoopResizeObserver);
  // jsdom has no layout: the pager is as wide as the test says
  Object.defineProperty(HTMLElement.prototype, "clientWidth", {
    configurable: true,
    get: () => pageWidth,
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  if (widthDescriptor) {
    Object.defineProperty(
      HTMLElement.prototype,
      "clientWidth",
      widthDescriptor
    );
  } else {
    delete (HTMLElement.prototype as { clientWidth?: number }).clientWidth;
  }
});

/** The fields a test sets itself; the rest are the defaults below */
type Choice = Partial<BasePhonePagerProps>;

const Harness = (choice: Choice) => {
  const stageNode = useOutletNode("flex min-h-0 flex-1 flex-col");
  const consoleNode = useOutletNode("flex min-h-0 flex-1 flex-col");
  const pager: BasePhonePagerProps = {
    page: choice.page ?? "work",
    onSwipe: choice.onSwipe ?? vi.fn(),
    onGo: choice.onGo ?? vi.fn(),
    view: choice.view ?? "code",
    onView: choice.onView ?? vi.fn(),
    title: choice.title ?? "my-program",
    file: choice.file === undefined ? null : choice.file,
    filesOpen: choice.filesOpen ?? false,
    onFilesOpenChange: choice.onFilesOpenChange ?? vi.fn(),
    stageOn: choice.stageOn ?? "work",
    menu: <nav>menu slot</nav>,
    assistant: <div>assistant slot</div>,
    files: <aside>files slot</aside>,
    stageBar: <header>stage bar</header>,
    stageNode,
    consoleNode,
    consoleOpen: choice.consoleOpen ?? false,
  };
  return (
    <>
      <OutletContent node={stageNode}>
        <div data-testid="stage-probe" />
      </OutletContent>
      <OutletContent node={consoleNode}>
        <div data-testid="console-probe" />
      </OutletContent>
      <BasePhonePager {...pager} />
    </>
  );
};

const pagerElement = (choice: Choice = {}) => <Harness {...choice} />;
const renderPager = (choice: Choice = {}) => render(pagerElement(choice));

it("has three pages, the work page in view, with a 60 px bar each", () => {
  renderPager({ page: "work" });
  for (const name of ["Navigation", "Work", "Preview"]) {
    expect(screen.getByRole("region", { name })).toBeTruthy();
  }
  expect(screen.getAllByTestId("phone-bar")).toHaveLength(3);
  expect(screen.getByTestId("phone-pager").scrollLeft).toBe(390);
});

it("asks for the preview, then back to the code", async () => {
  const onGo = vi.fn();
  renderPager({ page: "work", onGo });
  await userEvent.click(
    screen.getByRole("button", { name: "Preview the build" })
  );
  expect(onGo).toHaveBeenLastCalledWith("preview");
  await userEvent.click(
    screen.getByRole("button", { name: "Back to the code" })
  );
  expect(onGo).toHaveBeenLastCalledWith("work");
  await userEvent.click(screen.getByRole("button", { name: "Menu" }));
  expect(onGo).toHaveBeenLastCalledWith("menu");
});

it("switches Chat and Code", async () => {
  const onView = vi.fn();
  renderPager({ view: "code", onView });
  await userEvent.click(
    within(screen.getByRole("group", { name: "Show" })).getByRole("radio", {
      name: "Chat",
    })
  );
  expect(onView).toHaveBeenCalledWith("chat");
});

it("names the open file on the picker and opens Files", async () => {
  const onFilesOpenChange = vi.fn();
  renderPager({ file: { dir: "src/", name: "lib.rs" }, onFilesOpenChange });
  await userEvent.click(
    screen.getByRole("button", { name: "Files, lib.rs open" })
  );
  expect(onFilesOpenChange).toHaveBeenCalledWith(true);
});

it("reports a swipe once it settles on another page", () => {
  vi.useFakeTimers();
  const onSwipe = vi.fn();
  renderPager({ page: "work", onSwipe });
  const pager = screen.getByTestId("phone-pager");
  pager.scrollLeft = 780;
  fireEvent.scroll(pager);
  vi.advanceTimersByTime(SWIPE_SETTLE_MS);
  expect(onSwipe).toHaveBeenCalledWith("preview");
});

it("does not report its own scroll to the page it was given", () => {
  vi.useFakeTimers();
  const onSwipe = vi.fn();
  const { rerender } = renderPager({ page: "work", onSwipe });
  rerender(pagerElement({ page: "preview", onSwipe }));
  fireEvent.scroll(screen.getByTestId("phone-pager"));
  vi.advanceTimersByTime(SWIPE_SETTLE_MS);
  expect(onSwipe).not.toHaveBeenCalled();
});

it("re-aligns to its page when the window resizes", () => {
  renderPager({ page: "preview" });
  pageWidth = 600;
  fireEvent(window, new Event("resize"));
  expect(screen.getByTestId("phone-pager").scrollLeft).toBe(1200);
});

it("shows the stage on the page it is on", () => {
  const { rerender } = renderPager({ stageOn: "work" });
  expect(
    within(screen.getByRole("region", { name: "Work" })).getByTestId(
      "stage-probe"
    )
  ).toBeTruthy();
  rerender(pagerElement({ stageOn: "preview" }));
  expect(
    within(screen.getByRole("region", { name: "Preview" })).getByTestId(
      "stage-probe"
    )
  ).toBeTruthy();
});

it("closes the menu back to the work page", async () => {
  const onGo = vi.fn();
  renderPager({ page: "menu", onGo });
  await userEvent.click(screen.getByRole("button", { name: "Close the menu" }));
  expect(onGo).toHaveBeenLastCalledWith("work");
});
