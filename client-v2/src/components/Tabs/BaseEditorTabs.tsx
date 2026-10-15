import { KeyboardEvent, ReactNode } from "react";

import { EditorTabs } from "@/shared/ui/editor-tabs";

interface BaseEditorTabsProps {
  id?: string;
  children: ReactNode;
  /** Sits after the tabs, outside the tab list and its scroll (the wallet
   * button) */
  end?: ReactNode;
}

/** Where an arrow key moves focus, from trigger `from` of `count` */
const MOVES: Record<string, (from: number, count: number) => number> = {
  ArrowLeft: (from, count) => (from - 1 + count) % count,
  ArrowRight: (from, count) => (from + 1) % count,
  Home: () => 0,
  End: (_from, count) => count - 1,
};

/** The triggers in the row, without the copy a drag carries over it */
const TRIGGERS =
  '[data-slot="editor-tab"]:not([data-drag="overlay"]) [role="tab"]';

/** Moves focus between the triggers only: a tab opens its file on Enter or
 * Space (manual activation), so walking the row opens nothing. */
const moveFocus = (ev: KeyboardEvent<HTMLDivElement>) => {
  const move = MOVES[ev.key];
  if (!move) return;
  const triggers = [
    ...ev.currentTarget.querySelectorAll<HTMLElement>(TRIGGERS),
  ];
  // Focus may be on a tab's close button rather than its trigger
  const tab = (ev.target as Element).closest('[data-slot="editor-tab"]');
  const from = triggers.findIndex((trigger) => tab?.contains(trigger));
  if (from === -1) return;
  ev.preventDefault();
  triggers[move(from, triggers.length)].focus();
};

export const BaseEditorTabs = ({ id, children, end }: BaseEditorTabsProps) => (
  <div
    id={id}
    className="flex h-10 items-stretch overflow-hidden border-b border-border bg-surface-base"
  >
    <EditorTabs
      onKeyDown={moveFocus}
      className="h-auto min-w-0 flex-1 overflow-y-hidden border-b-0"
    >
      {children}
    </EditorTabs>
    {end}
  </div>
);
