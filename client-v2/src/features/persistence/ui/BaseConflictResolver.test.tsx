// Monaco cannot run under jsdom, so the controller is replaced with one that
// draws nothing but the overlay nodes the hunk controls are portalled into.
// Everything the component decides -- which controls show, what a take does
// to the file, when Apply is enabled -- is the real code.
vi.mock("./merge-editor/controller", () => ({
  createMergeEditor: (file: import("./merge-editor/merge-file").MergeFile) => {
    const overlay = () =>
      document.body.appendChild(document.createElement("div"));
    const overlays = { left: overlay(), result: overlay(), right: overlay() };
    return {
      layout: {
        overlays,
        gutters: { left: 0, result: 0, right: 0 },
        hunks: file.hunks.map(({ index }) => ({
          index,
          top: { left: 0, result: 0, right: 0 },
        })),
        bands: { left: [], right: [] },
        folds: [],
        canFold: false,
      },
      onDidChangeLayout: () => ({ dispose: () => undefined }),
      onDidEditResult: () => ({ dispose: () => undefined }),
      apply: () => undefined,
      update: () => undefined,
      unfold: () => undefined,
      reveal: () => undefined,
      dispose: () => Object.values(overlays).forEach((node) => node.remove()),
    };
  },
}));

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

import { BaseConflictResolver } from "./BaseConflictResolver";
import { merge3 } from "../model/merge";
import type { FileConflict } from "../model/merge";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/** A file whose one conflict is its middle line */
const conflictIn = (path: string): FileConflict => {
  const merged = merge3("a\nb\nc", "a\nmine\nc", "a\ntheirs\nc");
  if (merged.kind !== "conflict") throw new Error("expected a conflict");
  return {
    kind: "lines",
    path,
    chunks: merged.chunks,
    localHash: `${path}:local`,
    serverHash: `${path}:server`,
  };
};

const FILES = [conflictIn("src/lib.rs"), conflictIn("tests/index.test.ts")];

const button = (name: string) => {
  const found = Array.from(document.querySelectorAll("button")).filter(
    (b) => (b.getAttribute("aria-label") ?? b.textContent?.trim()) === name
  );
  expect(found).toHaveLength(1);
  return found[0];
};

const press = (name: string) => act(() => button(name).click());

describe("BaseConflictResolver", () => {
  let container: HTMLDivElement;
  let root: Root;
  const onApply = vi.fn();

  beforeEach(async () => {
    // jsdom has none; the pane tabs' thumb measures itself with one
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    );
    container = document.body.appendChild(document.createElement("div"));
    root = createRoot(container);
    await act(async () =>
      root.render(
        <BaseConflictResolver
          files={FILES}
          onApply={onApply}
          onKeepLocal={vi.fn()}
          onTakeServer={vi.fn()}
          onCancel={vi.fn()}
        />
      )
    );
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it("keeps Apply disabled until every hunk of every file is resolved", async () => {
    expect(document.body.textContent).toContain("src/lib.rs");
    expect(document.body.textContent).toContain("2 conflicts left");
    expect(button("Apply").disabled).toBe(true);

    // One side decided is not the hunk decided
    await press("Take this device's lines");
    expect(button("Apply").disabled).toBe(true);
    await press("Take the other device's lines");
    expect(document.body.textContent).toContain("1 conflict left");
    // The first file is done, the second is not
    expect(button("Apply").disabled).toBe(true);

    await press("Next file");
    expect(document.body.textContent).toContain("tests/index.test.ts");
    await press("Dismiss this device's lines");
    expect(button("Apply").disabled).toBe(true);
    await press("Take the other device's lines");
    expect(document.body.textContent).toContain("No conflicts left");
    expect(button("Apply").disabled).toBe(false);

    await press("Apply");
    expect(onApply).toHaveBeenCalledWith({
      "src/lib.rs": {
        content: "a\nmine\ntheirs\nc",
        localHash: "src/lib.rs:local",
        serverHash: "src/lib.rs:server",
      },
      "tests/index.test.ts": {
        content: "a\ntheirs\nc",
        localHash: "tests/index.test.ts:local",
        serverHash: "tests/index.test.ts:server",
      },
    });
  });
});
