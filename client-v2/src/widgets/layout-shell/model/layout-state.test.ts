import { expect, it } from "vitest";

import {
  DEFAULT_LAYOUT,
  LAYOUT_STORAGE_KEY,
  readLayout,
  writeLayout,
} from "./layout-state";
import type { LayoutState } from "./layout-state";

/** An in-memory `localStorage` with only the two calls the module makes */
const memoryStorage = (initial: Record<string, string> = {}) => {
  const items = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    items,
  };
};

const SAVED: LayoutState = {
  v: 1,
  leftOpen: false,
  assistantOpen: true,
  consoleOpen: true,
  h: { center: 70, assistant: 30 },
  vert: { stage: 60, console: 40 },
};

it("should start from today's Flow when nothing is saved", () => {
  const restored = readLayout(() => memoryStorage());
  expect(restored).toEqual({ kind: "none", state: DEFAULT_LAYOUT });
  expect(DEFAULT_LAYOUT).toEqual({
    v: 1,
    leftOpen: true,
    assistantOpen: true,
    consoleOpen: false,
  });
});

it("should read back what it wrote, under one key", () => {
  const storage = memoryStorage();
  expect(writeLayout(() => storage, SAVED)).toEqual({ ok: true });
  expect([...storage.items.keys()]).toEqual([LAYOUT_STORAGE_KEY]);
  expect(storage.items.get(LAYOUT_STORAGE_KEY)!.length).toBeLessThan(200);
  expect(readLayout(() => storage)).toEqual({ kind: "saved", state: SAVED });
});

it.each([
  ["not JSON", "{"],
  ["not an object", "[]"],
  [
    "a flag of the wrong type",
    JSON.stringify({
      v: 1,
      leftOpen: "yes",
      assistantOpen: true,
      consoleOpen: false,
    }),
  ],
  [
    "a size that is not a number",
    JSON.stringify({
      v: 1,
      leftOpen: true,
      assistantOpen: true,
      consoleOpen: false,
      h: { center: "70", assistant: 30 },
    }),
  ],
  [
    "a layout with unknown panel ids",
    JSON.stringify({
      v: 1,
      leftOpen: true,
      assistantOpen: true,
      consoleOpen: false,
      h: { main: 70, side: 30 },
    }),
  ],
])("should fall back on %s, as corrupt", (_, raw) => {
  const restored = readLayout(() =>
    memoryStorage({ [LAYOUT_STORAGE_KEY]: raw })
  );
  expect(restored.kind).toBe("failed");
  expect(restored.state).toEqual(DEFAULT_LAYOUT);
  expect(restored.kind === "failed" && restored.reason).toBe("corrupt");
});

it("should fall back on another version", () => {
  const raw = JSON.stringify({
    v: 2,
    leftOpen: true,
    assistantOpen: true,
    consoleOpen: false,
  });
  const restored = readLayout(() =>
    memoryStorage({ [LAYOUT_STORAGE_KEY]: raw })
  );
  expect(restored.kind === "failed" && restored.reason).toBe("version");
  expect(restored.state).toEqual(DEFAULT_LAYOUT);
});

it("should fall back when storage throws on access", () => {
  const blocked = new DOMException("blocked", "SecurityError");
  const restored = readLayout(() => {
    throw blocked;
  });
  expect(restored).toEqual({
    kind: "failed",
    state: DEFAULT_LAYOUT,
    reason: "storage-unavailable",
    error: blocked,
  });
});

it("should report a write that throws, not throw", () => {
  const full = new DOMException("full", "QuotaExceededError");
  const result = writeLayout(
    () => ({
      setItem: () => {
        throw full;
      },
    }),
    SAVED
  );
  expect(result).toEqual({ ok: false, error: full });
});
