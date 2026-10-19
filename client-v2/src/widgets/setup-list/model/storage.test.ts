import { afterEach, describe, expect, it, vi } from "vitest";

import { initLogger, memoryProvider, resetLogger } from "@/shared/lib/logger";
import { createSetupMarks, readMarks, SETUP_LIST_KEY } from "./storage";

const NOTHING_DONE = {
  dismissed: false,
  completed: false,
  networkChosen: false,
};

/** A `Storage` whose every call throws, as where site data is blocked */
const refusingStorage = (): Storage => {
  const refuse = () => {
    throw new DOMException(
      "The quota has been exceeded.",
      "QuotaExceededError"
    );
  };
  return {
    length: 0,
    clear: refuse,
    getItem: refuse,
    key: refuse,
    removeItem: refuse,
    setItem: refuse,
  };
};

afterEach(() => {
  localStorage.clear();
  resetLogger();
});

describe("readMarks", () => {
  it("reads nothing stored as nothing done, silently", () => {
    const memory = memoryProvider();
    initLogger({ providers: [memory] });
    expect(readMarks()).toEqual(NOTHING_DONE);
    expect(memory.entries).toEqual([]);
  });

  it("reads back what is stored", () => {
    localStorage.setItem(
      SETUP_LIST_KEY,
      '{"dismissed":true,"completed":false,"networkChosen":true}'
    );
    expect(readMarks()).toEqual({
      dismissed: true,
      completed: false,
      networkChosen: true,
    });
  });

  it.each(["{", "[]", '{"dismissed":"yes"}'])(
    "reads %s as nothing done and warns once",
    (raw) => {
      const memory = memoryProvider();
      initLogger({ providers: [memory] });
      localStorage.setItem(SETUP_LIST_KEY, raw);
      expect(readMarks()).toEqual(NOTHING_DONE);
      expect(memory.entries).toEqual([
        expect.objectContaining({ ns: "setup-list:storage", level: "warn" }),
      ]);
    }
  );

  it("reads nothing done, logged, where storage cannot be read", () => {
    const memory = memoryProvider();
    initLogger({ providers: [memory] });
    expect(readMarks(refusingStorage())).toEqual(NOTHING_DONE);
    expect(memory.entries).toEqual([
      expect.objectContaining({ ns: "setup-list:storage" }),
    ]);
  });
});

describe("setupMarks", () => {
  it("writes a mark and reads it back on the next load", () => {
    createSetupMarks().mark({ networkChosen: true });
    expect(createSetupMarks().get()).toEqual({
      dismissed: false,
      completed: false,
      networkChosen: true,
    });
  });

  it("keeps a mark for this page when storage refuses the write, and reports it", () => {
    const memory = memoryProvider();
    initLogger({ providers: [memory] });
    const storage = refusingStorage();
    const marks = createSetupMarks(storage);
    const listener = vi.fn();
    marks.subscribe(listener);
    // The read's own warning is not what this test is about
    marks.get();
    memory.entries.length = 0;

    marks.mark({ dismissed: true });

    expect(marks.get().dismissed).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(memory.entries).toEqual([
      expect.objectContaining({
        ns: "setup-list:storage",
        level: "error",
        report: true,
      }),
    ]);
  });

  it("stops notifying a listener once it unsubscribes", () => {
    const marks = createSetupMarks();
    const listener = vi.fn();
    marks.subscribe(listener)();
    marks.mark({ completed: true });
    expect(listener).not.toHaveBeenCalled();
  });
});
