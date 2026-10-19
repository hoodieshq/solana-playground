/** The column's tabs, shown in a lesson */
export type Tab = "steps" | "files";

/**
 * What the files column held when it last unmounted, in which project.
 * Hidden by ⌘E or the stage bar, the column leaves the layout and unmounts
 * (design.md, "Frame chrome (5.25)"), so its scroll and its lesson tab are
 * put back from here when it comes back; the tree keeps its folders on its
 * own (`kept-tree.ts`).
 */
export type KeptColumn = { workspace: string; tab: Tab; scrollTop: number };

let kept: KeptColumn | null = null;

export const keepColumn = (column: KeptColumn) => {
  kept = column;
};

/** The column kept for `workspace`; none when the memory is another project's */
export const keptColumn = (
  workspace: string
): Omit<KeptColumn, "workspace"> | null =>
  kept?.workspace === workspace
    ? { tab: kept.tab, scrollTop: kept.scrollTop }
    : null;

/** Drops the memory; for tests */
export const forgetColumn = () => {
  kept = null;
};
