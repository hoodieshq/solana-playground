/**
 * How wide the project panel is allowed to get.
 *
 * The floor is where the tab row and the footer button stop fitting; the
 * ceiling is a share of the viewport rather than a fixed number, so the editor
 * keeps a usable column on a small screen and a wide one still allows a wide
 * panel. File names are never shortened, so the panel is the only lever a
 * learner has on a deeply nested path.
 */
export const MIN_LEFT_WIDTH = 192;
export const DEFAULT_LEFT_WIDTH = 232;
const MAX_SHARE_OF_VIEWPORT = 0.3;

/**
 * @param width the width being asked for
 * @param viewport the window's inner width
 * @returns the width to actually apply
 *
 * The ceiling can fall below the floor on a very narrow window; the floor wins
 * there, because a panel too narrow to use is worse than a cramped editor.
 */
export const clampLeftWidth = (width: number, viewport: number) => {
  const max = Math.max(MIN_LEFT_WIDTH, viewport * MAX_SHARE_OF_VIEWPORT);
  return Math.min(Math.max(width, MIN_LEFT_WIDTH), max);
};
