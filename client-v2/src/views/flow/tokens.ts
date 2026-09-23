/** Shared layout/color constants for the Flow canvas (panels, header). */

/** Gutter between the black page ground and each floating panel. */
export const GAP = "8px";

/**
 * Every column's first row: the sidebar's brand, the assistant's title, the
 * workspace's project name. One height and one hairline, so the rule reads as
 * a single line across the window instead of three at three heights.
 */
export const HEAD_HEIGHT = "2.75rem";

/**
 * The second row, where a panel has one — the assistant's Chat/Sources, the
 * workspace's stages. Same job in both: the panel's own switch, under its name.
 */
export const SUBHEAD_HEIGHT = "2.375rem";

/**
 * Left inset for a panel's head, matched across the columns so the three
 * titles start on their own edge by the same amount.
 */
export const HEAD_INSET = "0.875rem";

/**
 * Height of the bar pinned to a panel's bottom edge -- the console handle and
 * the left panel's new-file action. Shared so their top borders read as one
 * line across the canvas.
 */
export const BOTTOM_BAR_HEIGHT = "1.75rem";

/*
 * The brand gradient used to live here as a literal, copied from
 * GradientButton. Its three users -- that button, the stepper's active dot and
 * the header logomark -- now read `theme.colors.default.primary`, so a theme
 * decides what "the accent" means and the canvas stops hardcoding one
 * product's purple. A theme that wants a gradient can set one there.
 */
