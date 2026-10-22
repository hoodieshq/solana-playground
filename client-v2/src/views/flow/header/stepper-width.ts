/**
 * The width the four full labels need, in px. When the stage bar gives the
 * stepper less than this, the labels fold to their initials; the full name
 * stays in each tab's `aria-label`.
 *
 * Measured in Chromium at a 1280 px window, in Stack Sans: the list with no
 * stage marked is 302 px wide, and each check or dot beside a label adds
 * about 18 px, so a list with all four stages marked needs about 374 px. The
 * constant covers that widest case so a stage finishing never pushes the
 * list past its bar; it is a measurement, not derived, so re-measure when the
 * labels, padding or font size change.
 */
export const STEPPER_FULL_WIDTH_PX = 376;
