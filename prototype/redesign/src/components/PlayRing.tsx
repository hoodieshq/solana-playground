import { FC } from "react";

import { MARK_PATH } from "./PlaygroundMarkNext";

/**
 * The play button's icon: the mark's own triangle in a ring.
 *
 * Not drawn — the triangle is the mark's path, the part left of where its
 * edges meet the O, cut out by a nested viewport that clips to exactly that
 * box. So the icon is the brand's own play shape and cannot drift from it.
 *
 * Proportions are the Figma's, read off the landing: a 210 ring on a 23
 * stroke, the triangle 115 tall inside it and 13 right of centre — the nudge
 * a play glyph needs to look centred, since its weight sits on the left.
 */
const PlayRing: FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 210 210"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <circle cx="105" cy="105" r="93.5" stroke="currentColor" strokeWidth="23" />
    {/* 414.5 is where the mark's upper edge meets the O; 559.4 its height */}
    <svg x="75.4" y="47.5" width="85.2" height="115" viewBox="0 0 414.5 559.4">
      <path d={MARK_PATH} fill="currentColor" />
    </svg>
  </svg>
);

export default PlayRing;
