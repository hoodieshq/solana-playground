import { createLogger } from "@/shared/lib/logger";

const log = createLogger("tutorial-workspace:open-docs");

/**
 * The open doc tabs of each tutorial, by name, as their Markdown files. Kept
 * on the device beside the docked trees: `.workspace/metadata.json` holds
 * file tabs only, and the explorer reopens every entry there as a file
 */
const DOCS_KEY = "tutorial-workspace.docs";

/** What a stored value is, for the log: `typeof` calls `null` an object */
const shapeOf = (value: unknown) => {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
};

/** Every tutorial's open doc tabs; an unreadable store reads as none open */
export const readOpenDocs = (): Record<string, string[]> => {
  let parsed: unknown;
  try {
    const raw = localStorage.getItem(DOCS_KEY);
    parsed = raw ? JSON.parse(raw) : {};
  } catch (error) {
    // A broken or blocked store reads as no doc open; the tree still has them
    log.warn("could not read the open docs", { context: { error } });
    return {};
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    // Not this key's shape: read as none, and the next write replaces it
    log.warn("the open docs are not a map by tutorial", {
      context: { kind: shapeOf(parsed) },
    });
    return {};
  }
  return Object.fromEntries(
    Object.entries(parsed).map(([name, files]) => [
      name,
      Array.isArray(files)
        ? files.filter((f): f is string => typeof f === "string")
        : [],
    ])
  );
};

/**
 * Saves one tutorial's open doc tabs, leaving the others'. None open removes
 * its entry. A store that could not be read is replaced, losing what it held
 */
export const writeOpenDocs = (name: string, files: string[]) => {
  const all = readOpenDocs();
  if (files.length) all[name] = files;
  else delete all[name];
  try {
    localStorage.setItem(DOCS_KEY, JSON.stringify(all));
  } catch (error) {
    // The tabs still hold for the visit; only the next one forgets them
    log.warn("could not save the open docs", { context: { error } });
  }
};

if (import.meta.vitest) {
  const { describe, it, expect, beforeEach } = import.meta.vitest;

  describe("widgets/tutorial-workspace/model/open-docs", () => {
    beforeEach(() => localStorage.clear());

    it("reads each tutorial's files, dropping what is not a file name", () => {
      localStorage.setItem(
        DOCS_KEY,
        JSON.stringify({ a: ["x.md", 3], b: "y.md" })
      );
      expect(readOpenDocs()).toEqual({ a: ["x.md"], b: [] });
    });

    it("reads a store of another shape, or broken, as none open", () => {
      localStorage.setItem(DOCS_KEY, "[1]");
      expect(readOpenDocs()).toEqual({});
      localStorage.setItem(DOCS_KEY, "{bad");
      expect(readOpenDocs()).toEqual({});
    });

    it("saves one tutorial's tabs and removes its entry once none is open", () => {
      writeOpenDocs("a", ["idl.md"]);
      writeOpenDocs("b", ["programs.md"]);
      writeOpenDocs("a", []);
      expect(readOpenDocs()).toEqual({ b: ["programs.md"] });
    });
  });
}
