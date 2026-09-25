/**
 * How wide the Files column is allowed to get, and how it shares its row with
 * the editor beside it.
 *
 * The floor is where the column's head and its footer button stop fitting.
 * The ceiling is 420px, or a share of the viewport where that is less, so a
 * small window keeps a usable editor and a wide one still allows a wide
 * column. File names are never shortened, so the column is the only lever a
 * learner has on a deeply nested path.
 */
export const MIN_LEFT_WIDTH = 192;
export const DEFAULT_LEFT_WIDTH = 240;
/** Past this a file tree is mostly empty space, whatever the screen */
export const MAX_LEFT_WIDTH = 420;
const MAX_SHARE_OF_VIEWPORT = 0.3;

/**
 * The editor's floor. Under this the gutter and the minimap leave too little
 * of the line to read, so when the row runs short the Files column gives way
 * first.
 */
export const MIN_EDITOR_WIDTH = 360;

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

/**
 * @param width the width the column would like
 * @param viewport the window's inner width
 * @param room the width of the row the column shares with the editor
 * @returns the width to draw it at
 *
 * The column gives up whatever the editor needs to keep its floor, down to the
 * column's own floor, which still wins in the end for the reason above. What
 * comes back is how much of a preference fits today, never a new preference:
 * give the row its room back and the column returns to the width it was set
 * to.
 */
export const fitLeftWidth = (width: number, viewport: number, room: number) =>
  Math.max(
    MIN_LEFT_WIDTH,
    Math.min(
      clampLeftWidth(width, viewport),
      MAX_LEFT_WIDTH,
      room - MIN_EDITOR_WIDTH
    )
  );
