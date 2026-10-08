import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import type { CSSProperties, ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "styled-components";

import { Button } from "@/shared/ui/button";
import {
  Merge,
  MergeCount,
  MergeFold,
  MergeFooter,
  MergeFooterActions,
  MergeFooterShortcuts,
  MergeHunkAction,
  MergeHunkActions,
  MergeNav,
  MergePane,
  MergePaneBody,
  MergePaneHeader,
  MergePanes,
  MergePaneTabs,
  MergeRibbon,
  MergeShowAll,
  MergeTitle,
  MergeToolbar,
} from "@/shared/ui/merge";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
} from "@/shared/ui/modal";
import { createMergeEditor } from "./merge-editor/controller";
import { MergeFile, resolvedFiles } from "./merge-editor/merge-file";
import type { MergeEditor, MergeLayout } from "./merge-editor/controller";
import type { HunkSide, MergePane as Pane } from "./merge-editor/merge-file";
import type { FileConflict, ResolvedFiles } from "../model/merge";

export interface BaseConflictResolverProps {
  /** The conflicted files, as the divergent conflict holds them */
  files: FileConflict[];
  /** Files that changed on the other device since the view first showed them */
  changed?: string[];
  /** An answer is on its way: nothing more can be pressed */
  busy?: boolean;
  /** The result of every file, pinned to the copies it was made against */
  onApply: (files: ResolvedFiles) => void;
  /** "Keep this version", as the banner's */
  onKeepLocal: () => void;
  /** "Take the other version", as the banner's */
  onTakeServer: () => void;
  /** Closed without an answer: Cancel, the close button or Escape */
  onCancel: () => void;
}

/** Below this the element shows one pane at a time (`@3xl/merge`) */
const SINGLE_BELOW_PX = 768;

/**
 * Whether the view is narrow enough to show one pane at a time. The element
 * decides that with a container query; the editors need to know as well, to
 * drop their spacers and put every hunk control in Result.
 */
const useSingle = (root: HTMLElement | null) => {
  const [single, setSingle] = useState(false);
  useEffect(() => {
    if (!root || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) =>
      setSingle(entry.contentRect.width < SINGLE_BELOW_PX)
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, [root]);
  return single;
};

/** The sides whose controls a pane carries */
const sidesIn = (pane: Pane, single: boolean): HunkSide[] => {
  if (single) return pane === "result" ? ["left", "right"] : [];
  if (pane === "left") return ["left"];
  if (pane === "right") return ["right"];
  return [];
};

/**
 * Two devices' changes to the same lines, settled line by line: this device
 * on the left, the result in the middle, the other device on the right.
 *
 * Takes everything through props; the editors are the Monaco controller's
 * (`merge-editor/`), one file's at a time. Nothing is written anywhere until
 * `onApply` or a whole-file shortcut is called, and Apply stays disabled
 * while any hunk of any file is undecided.
 */
export const BaseConflictResolver = ({
  files,
  changed = [],
  busy = false,
  onApply,
  onKeepLocal,
  onTakeServer,
  onCancel,
}: BaseConflictResolverProps) => {
  // A new set of files is a new question: every choice starts over
  const merges = useMemo(() => files.map((f) => MergeFile.from(f)), [files]);
  const [path, setPath] = useState(files[0]?.path);
  const index = Math.max(
    0,
    merges.findIndex((m) => m.path === path)
  );
  const file = merges[index];
  const [, rerender] = useReducer((n: number) => n + 1, 0);

  const [root, setRoot] = useState<HTMLElement | null>(null);
  const single = useSingle(root);
  const [showAll, setShowAll] = useState(false);
  const theme = useTheme() as
    | { components?: { editor?: { default?: { fontFamily?: string } } } }
    | undefined;
  const fontFamily = theme?.components?.editor?.default?.fontFamily;

  const hosts = {
    left: useRef<HTMLDivElement>(null),
    result: useRef<HTMLDivElement>(null),
    right: useRef<HTMLDivElement>(null),
  };
  const [editor, setEditor] = useState<MergeEditor | null>(null);
  const [layout, setLayout] = useState<MergeLayout | null>(null);

  // The Modal mounts its content in a portal after this renders, so the
  // editors are created once the hosts are there
  const [mounted, setMounted] = useState(false);
  const contentRef = useCallback(
    (node: HTMLDivElement | null) => setMounted(!!node),
    []
  );
  useEffect(() => {
    if (!mounted || !file || !hosts.result.current) return;
    const created = createMergeEditor(
      file,
      {
        left: file.deleted.left ? null : hosts.left.current,
        result: hosts.result.current,
        right: file.deleted.right ? null : hosts.right.current,
      },
      { single, showAll, fontFamily }
    );
    setEditor(created);
    setLayout(created.layout);
    const subscriptions = [
      created.onDidChangeLayout(() => setLayout(created.layout)),
      created.onDidEditResult(rerender),
    ];
    return () => {
      for (const s of subscriptions) s.dispose();
      created.dispose();
      setEditor(null);
      setLayout(null);
    };
    // The options below are passed to the live editor by the next effect;
    // only a new file, or the hosts arriving, makes new editors
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, file]);

  useEffect(() => {
    editor?.update({ single, showAll, fontFamily });
  }, [editor, single, showAll, fontFamily]);

  const unresolved = merges.reduce((n, m) => n + m.unresolved, 0);

  const act = (hunk: number, side: HunkSide, action: "take" | "dismiss") => {
    if (!file) return;
    editor?.apply(file[action](hunk, side));
    rerender();
  };

  /** Scroll to the next or previous hunk still to decide, wrapping */
  const goTo = (step: 1 | -1) => {
    if (!file || !editor) return;
    const open = file.hunks.filter(({ hunk }) => !MergeFile.isResolved(hunk));
    if (!open.length) return;
    // Without a notion of "current", forward starts at the first
    const target = step > 0 ? open[0] : open[open.length - 1];
    editor.reveal(target.index);
  };

  /** A pane's hunk controls, over its editor or, with none, at its top */
  const controls = (pane: Pane): ReactNode => {
    if (!file) return null;
    const sides = sidesIn(pane, single);
    if (!sides.length) return null;
    const overlay = layout?.overlays[pane] ?? null;
    const items = file.hunks.map(({ hunk, index: i }) => {
      const open = sides.filter((s) => !hunk.edited && hunk[s] === "pending");
      if (!open.length) return null;
      const top = layout?.hunks[i]?.top[pane] ?? 0;
      const style: CSSProperties = {
        position: "absolute",
        top: overlay ? top : 4,
        pointerEvents: "auto",
        // The other device's in its gutter, as the element draws them;
        // everything else at the line's end, clear of the scrollbar
        ...(pane === "right" && !single
          ? { left: layout?.gutters.right ?? 0 }
          : { right: 16 }),
      };
      return (
        <MergeHunkActions
          key={i}
          data-hunk={i}
          className="rounded bg-surface-panel"
          style={style}
        >
          {open.map((side) => (
            <span key={side} className="contents">
              <MergeHunkAction
                action="take"
                from={side}
                disabled={busy}
                onClick={() => act(i, side, "take")}
              />
              <MergeHunkAction
                action="dismiss"
                from={side}
                disabled={busy}
                onClick={() => act(i, side, "dismiss")}
              />
            </span>
          ))}
        </MergeHunkActions>
      );
    });
    return overlay ? createPortal(items, overlay) : items;
  };

  /** A pane's fold controls, over the room its editor keeps for them */
  const folds = (pane: Pane): ReactNode => {
    const overlay = layout?.overlays[pane];
    if (!overlay) return null;
    return createPortal(
      (layout?.folds ?? []).map((fold) => (
        <MergeFold
          key={fold.segment}
          count={fold.count}
          className="absolute inset-x-0"
          style={{ top: fold.top[pane] ?? 0, pointerEvents: "auto" }}
          onClick={() => editor?.unfold(fold.segment)}
        />
      )),
      overlay
    );
  };

  const pane = (side: Pane) => (
    <MergePane side={side} deleted={side !== "result" && file?.deleted[side]}>
      <MergePaneHeader />
      <MergePaneBody>
        <div ref={hosts[side]} className="absolute inset-0" />
        {folds(side)}
        {controls(side)}
      </MergePaneBody>
    </MergePane>
  );

  return (
    <Modal open onOpenChange={(open) => !open && onCancel()}>
      <ModalContent
        size="wide"
        className="dark md:h-[min(48rem,calc(100dvh-4rem))]"
        ref={contentRef}
      >
        <ModalHeader>
          <ModalTitle>Resolve conflicts</ModalTitle>
          <ModalDescription className="sr-only">
            Both devices changed the same lines. Take each side's lines into the
            result, or edit it, then apply.
          </ModalDescription>
          {changed.map((p) => (
            <p key={p} role="status" className="text-caption text-warning">
              <code className="font-mono">{p}</code> changed on the other
              device.
            </p>
          ))}
        </ModalHeader>
        <Merge ref={setRoot}>
          <MergeToolbar>
            {merges.length > 1 && (
              <>
                <MergeNav
                  to="previous-file"
                  disabled={index === 0}
                  onClick={() => setPath(merges[index - 1].path)}
                />
                <MergeNav
                  to="next-file"
                  disabled={index === merges.length - 1}
                  onClick={() => setPath(merges[index + 1].path)}
                />
              </>
            )}
            {file && (
              <MergeTitle
                path={file.path}
                index={index + 1}
                total={merges.length}
              />
            )}
            <MergeCount count={unresolved} />
            <MergeNav
              to="previous-conflict"
              disabled={!file?.unresolved}
              onClick={() => goTo(-1)}
            />
            <MergeNav
              to="next-conflict"
              disabled={!file?.unresolved}
              onClick={() => goTo(1)}
            />
            {layout?.canFold && (
              <MergeShowAll pressed={showAll} onPressedChange={setShowAll} />
            )}
          </MergeToolbar>
          <MergePaneTabs />
          <MergePanes>
            {pane("left")}
            <MergeRibbon bands={layout?.bands.left ?? []} />
            {pane("result")}
            <MergeRibbon bands={layout?.bands.right ?? []} />
            {pane("right")}
          </MergePanes>
          <MergeFooter>
            <MergeFooterShortcuts>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={onKeepLocal}
              >
                Keep this version
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={onTakeServer}
              >
                Take the other version
              </Button>
            </MergeFooterShortcuts>
            <MergeFooterActions>
              <Button size="sm" variant="ghost" onClick={onCancel}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={busy || unresolved > 0}
                onClick={() => onApply(resolvedFiles(merges))}
              >
                Apply
              </Button>
            </MergeFooterActions>
          </MergeFooter>
        </Merge>
      </ModalContent>
    </Modal>
  );
};
