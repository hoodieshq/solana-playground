import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { LAYOUT_BREAKPOINTS, useViewport, viewportOf } from "./use-viewport";

/** A `matchMedia` that answers `max-width` queries against `width` and fires `change` when it moves */
const fakeScreen = (initial: number) => {
  let width = initial;
  const listeners = new Set<() => void>();
  const matchMedia = (query: string) => {
    const max = Number(/max-width:\s*(\d+)px/.exec(query)?.[1]);
    return {
      get matches() {
        return width <= max;
      },
      media: query,
      onchange: null,
      addEventListener: (_: string, fn: () => void) => listeners.add(fn),
      removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    };
  };
  const resize = (next: number) => {
    width = next;
    listeners.forEach((fn) => fn());
  };
  return { matchMedia, resize };
};

let screen: ReturnType<typeof fakeScreen>;
beforeEach(() => {
  screen = fakeScreen(1440);
  vi.stubGlobal("matchMedia", screen.matchMedia);
});
afterEach(() => vi.unstubAllGlobals());

it("should draw the lines at 1024 and 600", () => {
  expect(LAYOUT_BREAKPOINTS).toEqual({ compact: 1024, phone: 600 });
});

it.each([
  [1440, "wide"],
  [1024, "wide"],
  [1023, "compact"],
  [768, "compact"],
  [600, "compact"],
  [599, "phone"],
  [375, "phone"],
])("should call %i px %s", (width, expected) => {
  screen.resize(width);
  expect(viewportOf()).toBe(expected);
});

it("should re-render when the window crosses a line", () => {
  const { result } = renderHook(() => useViewport());
  expect(result.current).toBe("wide");

  act(() => screen.resize(800));
  expect(result.current).toBe("compact");

  act(() => screen.resize(375));
  expect(result.current).toBe("phone");
});
