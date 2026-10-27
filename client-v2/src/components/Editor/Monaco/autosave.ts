/** The edit waiting for its save: which file, and how to read its buffer */
interface PendingSave {
  path: string;
  read: () => string;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * Debounces the editor's writes, keeping each edit with the file it was made
 * in.
 *
 * The path and the buffer are taken when the edit is made, not when the save
 * runs: by then the editor may show another file, and reading the editor's
 * current file and value wrote that file's text to itself and dropped the
 * edit. The buffer is read only when the save runs, so the save carries every
 * keystroke of the window, which is why the caller flushes before the buffer
 * goes away (the model disposed, the editor unmounted) rather than cancelling.
 *
 * @param opts -
 * - `delay`: how long an edit waits for the next one, in ms
 * - `save`: writes a file's content
 */
export const createAutosave = ({
  delay,
  save,
}: {
  delay: number;
  save: (path: string, content: string) => void;
}) => {
  let pending: PendingSave | null = null;

  const flush = () => {
    if (!pending) return;
    const { path, read, timer } = pending;
    pending = null;
    clearTimeout(timer);
    save(path, read());
  };

  return {
    /** Saves `path` after the delay, reading its buffer with `read` then */
    schedule(path: string, read: () => string) {
      // An edit in another file does not wait out this one's delay: its
      // window would otherwise swallow this one
      if (pending?.path !== path) flush();
      if (pending) clearTimeout(pending.timer);
      pending = { path, read, timer: setTimeout(flush, delay) };
    },
    /** Saves the pending edit now; does nothing when none is pending */
    flush,
  };
};

if (import.meta.vitest) {
  const { describe, it, expect, vi, beforeEach, afterEach } = import.meta
    .vitest;

  describe("components/Editor/Monaco/autosave", () => {
    const DELAY = 500;

    /** An autosave whose saves are recorded, with a buffer per file */
    const setup = () => {
      const saves: Array<[string, string]> = [];
      const buffers: Record<string, string> = {};
      const autosave = createAutosave({
        delay: DELAY,
        save: (path, content) => saves.push([path, content]),
      });
      const edit = (path: string, content: string) => {
        buffers[path] = content;
        autosave.schedule(path, () => buffers[path]);
      };
      return { autosave, saves, edit };
    };

    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("saves the last edit once the delay passes", () => {
      const { saves, edit } = setup();
      edit("/src/lib.rs", "a");
      edit("/src/lib.rs", "ab");
      vi.advanceTimersByTime(DELAY - 1);
      expect(saves).toEqual([]);
      vi.advanceTimersByTime(1);
      expect(saves).toEqual([["/src/lib.rs", "ab"]]);
    });

    it("saves the pending edit on flush, and not again after the delay", () => {
      const { autosave, saves, edit } = setup();
      edit("/src/lib.rs", "a");
      autosave.flush();
      expect(saves).toEqual([["/src/lib.rs", "a"]]);
      vi.advanceTimersByTime(DELAY);
      expect(saves).toEqual([["/src/lib.rs", "a"]]);
    });

    it("does nothing on flush with no edit pending", () => {
      const { autosave, saves, edit } = setup();
      autosave.flush();
      edit("/src/lib.rs", "a");
      vi.advanceTimersByTime(DELAY);
      autosave.flush();
      expect(saves).toEqual([["/src/lib.rs", "a"]]);
    });

    it("saves an edit to its own file when the next one is in another", () => {
      const { saves, edit } = setup();
      edit("/src/lib.rs", "rust");
      edit("/client/client.ts", "ts");
      expect(saves).toEqual([["/src/lib.rs", "rust"]]);
      vi.advanceTimersByTime(DELAY);
      expect(saves).toEqual([
        ["/src/lib.rs", "rust"],
        ["/client/client.ts", "ts"],
      ]);
    });
  });
}
