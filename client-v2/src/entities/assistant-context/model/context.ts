/** What the user chose on top of their open tabs, for one workspace */
export interface ContextChoice {
  /** Files added from the composer's + menu, in the order they were added */
  readonly added: readonly string[];
  /** Files taken out with a chip's remove button, open tabs included */
  readonly removed: readonly string[];
}

const EMPTY: ContextChoice = { added: [], removed: [] };

/**
 * The files that go to the model: the open tabs in tab order, then the added
 * files, minus what the user removed and what no longer exists.
 *
 * A removed tab stays out while it is open: removal outlasts tab switches
 * until the user adds the file back.
 *
 * @param tabs the open tabs' relative paths, in tab order
 * @param choice what the user added and removed
 * @param exists whether a path is still a file of the project
 * @returns relative paths, each once
 */
export const contextPaths = (
  tabs: readonly string[],
  choice: ContextChoice,
  exists: (path: string) => boolean
): string[] => {
  const removed = new Set(choice.removed);
  const paths = [...new Set([...tabs, ...choice.added])];
  return paths.filter((path) => !removed.has(path) && exists(path));
};

/**
 * The user's context choice for the workspace they made it in.
 *
 * One slot, keyed by workspace name: a choice applies to the project it was
 * made in, and another project starts from its open tabs alone. Kept in
 * memory only, so a reload starts from the open tabs as well.
 */
class AssistantContextStore {
  private workspace: string | null = null;
  private current: ContextChoice = EMPTY;
  private readonly listeners = new Set<() => void>();

  /** The choice for `workspace`; empty unless it was made there */
  choice(workspace: string | null): ContextChoice {
    return workspace === this.workspace ? this.current : EMPTY;
  }

  /** Puts `path` into the context, undoing an earlier removal */
  add(workspace: string | null, path: string) {
    const { added, removed } = this.choice(workspace);
    this.write(workspace, {
      added: added.includes(path) ? added : [...added, path],
      removed: removed.filter((p) => p !== path),
    });
  }

  /** Keeps `path` out of the context until it is added back */
  remove(workspace: string | null, path: string) {
    const { added, removed } = this.choice(workspace);
    this.write(workspace, {
      added: added.filter((p) => p !== path),
      removed: removed.includes(path) ? removed : [...removed, path],
    });
  }

  onDidChange(cb: () => void) {
    this.listeners.add(cb);
    return { dispose: () => void this.listeners.delete(cb) };
  }

  private write(workspace: string | null, next: ContextChoice) {
    this.workspace = workspace;
    this.current = next;
    this.listeners.forEach((cb) => cb());
  }
}

export const PgAssistantContext = new AssistantContextStore();

if (import.meta.vitest) {
  const { describe, it, expect, vi } = import.meta.vitest;

  describe("entities/assistant-context/model/context", () => {
    const all = () => true;
    const choiceOf = (
      added: readonly string[],
      removed: readonly string[]
    ): ContextChoice => ({ added, removed });

    it("lists the tabs in order, then the added files", () => {
      expect(
        contextPaths(
          ["src/lib.rs", "client/client.ts"],
          choiceOf(["tests/a.ts"], []),
          all
        )
      ).toEqual(["src/lib.rs", "client/client.ts", "tests/a.ts"]);
    });

    it("lists a tab that was also added once", () => {
      expect(
        contextPaths(["src/lib.rs"], choiceOf(["src/lib.rs"], []), all)
      ).toEqual(["src/lib.rs"]);
    });

    it("keeps a removed tab out while it stays open", () => {
      expect(
        contextPaths(["src/lib.rs", "b.ts"], choiceOf([], ["src/lib.rs"]), all)
      ).toEqual(["b.ts"]);
    });

    it("drops a file that no longer exists", () => {
      expect(
        contextPaths(
          ["src/lib.rs"],
          choiceOf(["gone.ts"], []),
          (p) => p !== "gone.ts"
        )
      ).toEqual(["src/lib.rs"]);
    });

    it("puts a re-added tab back at its tab position", () => {
      const store = new AssistantContextStore();
      store.remove("w", "a.ts");
      store.add("w", "a.ts");
      expect(contextPaths(["a.ts", "b.ts"], store.choice("w"), all)).toEqual([
        "a.ts",
        "b.ts",
      ]);
    });

    it("keeps one workspace's choice out of another", () => {
      const store = new AssistantContextStore();
      store.add("w1", "x.ts");
      expect(store.choice("w2")).toEqual(choiceOf([], []));
      store.remove("w2", "y.ts");
      expect(store.choice("w1")).toEqual(choiceOf([], []));
      expect(store.choice("w2")).toEqual(choiceOf([], ["y.ts"]));
    });

    it("tells listeners about an add and a remove", () => {
      const store = new AssistantContextStore();
      const cb = vi.fn();
      const sub = store.onDidChange(cb);
      store.add("w", "a.ts");
      store.remove("w", "a.ts");
      expect(cb).toHaveBeenCalledTimes(2);
      sub.dispose();
      store.add("w", "a.ts");
      expect(cb).toHaveBeenCalledTimes(2);
    });
  });
}
