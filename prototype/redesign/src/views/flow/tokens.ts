/** Shared layout/color constants for the Flow canvas (panels, header). */

/** Gutter between the black page ground and each floating panel. */
export const GAP = "8px";

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
