import type { FC, KeyboardEvent } from "react";
import { ChevronDown, FileCode } from "lucide-react";

import { cn } from "@/shared/lib/utils";
import { moveFocus } from "../model/tree";
import type { TreeRow } from "../model/tree";

/** One row's shape, the navigation's: 28 px, 13 px, the glyph in a 16 px box */
const ROW =
  "flex h-7 w-full items-center gap-2 rounded-[6px] px-2 text-left text-[0.8125rem] whitespace-nowrap outline-none transition-colors duration-100 hover:bg-surface-hover hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-purple motion-reduce:transition-none";

/** A level's indent: a folder's caret (12) and the gap after it (8) */
const STEP_PX = 20;

export interface BaseFileTreeListProps {
  rows: TreeRow[];
  onPick: (path: string) => void;
}

/**
 * The tutorial's files by folder (prototype `FileTreeList`). The open file
 * is marked, the live step's file carries a dot, and a file a later step
 * creates says so and cannot be picked. ↑ and ↓ move between the files;
 * Enter is the row's own button.
 */
const BaseFileTreeList: FC<BaseFileTreeListProps> = ({ rows, onPick }) => {
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const buttons = [
      ...e.currentTarget.querySelectorAll<HTMLElement>("[data-tree-row]"),
    ];
    const at = buttons.findIndex((b) => b === document.activeElement);
    const to = moveFocus(rows, at, e.key);
    if (to === null) return;
    e.preventDefault();
    buttons[to]?.focus();
  };

  return (
    <div
      role="tree"
      aria-label="Files"
      onKeyDown={onKeyDown}
      className="flex flex-col gap-px"
    >
      {rows.map((row) => {
        const indent = { paddingLeft: `${8 + row.depth * STEP_PX}px` };
        if (row.kind === "folder") {
          return (
            <div
              key={`folder:${row.name}`}
              data-tree-row
              style={indent}
              className={cn(
                ROW,
                "cursor-default text-muted-foreground hover:bg-transparent hover:text-muted-foreground"
              )}
            >
              <ChevronDown aria-hidden="true" className="size-3 shrink-0" />
              {row.name}
            </div>
          );
        }
        const waiting = row.waiting !== null;
        return (
          <button
            key={row.path}
            type="button"
            role="treeitem"
            data-tree-row
            data-file={row.path}
            aria-selected={row.open}
            disabled={waiting}
            onClick={() => onPick(row.path)}
            style={indent}
            className={cn(
              ROW,
              "relative disabled:cursor-default disabled:hover:bg-transparent disabled:hover:text-muted-foreground",
              row.open
                ? "bg-surface-hover text-foreground"
                : "text-muted-foreground"
            )}
          >
            <FileCode
              aria-hidden="true"
              className="size-[15px] shrink-0 text-subtle"
            />
            <span className="truncate">{row.name}</span>
            {/* Not there yet, said once in words: no fade, no lock */}
            {waiting && (
              <span className="ml-auto pl-3 text-caption text-muted-foreground">
                Created in step {row.waiting}
              </span>
            )}
            {row.live && (
              <span
                role="img"
                aria-label="This step's file"
                className="ml-auto size-1.5 shrink-0 rounded-full bg-brand-purple"
              />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default BaseFileTreeList;
