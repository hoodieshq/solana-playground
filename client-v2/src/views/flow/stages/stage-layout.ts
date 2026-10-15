/**
 * Where a Build or Deploy stage's action sits. The action row is the last
 * element of the stage; below `md` the stage is at least as tall as its
 * frame and the row is pushed to the foot (`mt-auto`), where
 * `StageEmptyActions`' own `sticky bottom-0` keeps it when the content is
 * taller than the screen. On a desk the row follows the content.
 */

/** The stage's scroll container: the stage router gives it the full height */
export const STAGE_FRAME = "flex h-full flex-col overflow-y-auto";

/** The stage itself, on `StageEmpty` */
export const STAGE_BODY = "max-w-[42rem] max-md:min-h-full max-md:flex-1";

/** The action row, on `StageEmptyActions` */
export const STAGE_FOOT = "max-md:mt-auto";
