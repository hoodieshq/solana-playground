import { css } from "styled-components";

/**
 * The brand gradient, and the one thing it is for here: the stroke around
 * whatever is currently selected.
 *
 * Taken from SDP, where it is `linear-gradient(90deg, #9945FF, #14F195)` with
 * 120deg used wherever the shape is taller than a line. It is Solana's own
 * purple-to-green, so it belongs to this product rather than being borrowed.
 *
 * Used on strokes only. As a fill it drags the eye to whatever it is behind
 * and the middle of the ramp goes muddy at small sizes; as a 1px stroke around
 * the current tab, row or pill it marks the selection precisely and reads as
 * brand at the same time. Everything else in the interface stays neutral,
 * which is what gives the one gradient its job.
 */
export const GRADIENT = "linear-gradient(120deg, #9945FF, #14F195)";
export const GRADIENT_FLAT = "linear-gradient(90deg, #9945FF, #14F195)";

/**
 * A gradient stroke, painted with the two-background trick: the element's own
 * surface clipped to the padding box, the gradient clipped to the border box,
 * with a transparent border between them. `bg` has to be the opaque colour
 * sitting behind the element, since the padding-box layer is what hides the
 * gradient everywhere except the border.
 *
 * `border-image` cannot do this — it does not follow `border-radius`, so the
 * corners square off. This does.
 */
export const gradientStroke = (
  /* Optional because several theme surfaces are typed that way; a missing one
     falls back to transparent, which shows the gradient as a full pill rather
     than a stroke — wrong, but visibly wrong rather than silently absent. */
  bg: string | undefined,
  width = "1px"
) => css`
  border: ${width} solid transparent;
  background: linear-gradient(${bg ?? "transparent"}, ${bg ?? "transparent"})
      padding-box,
    ${GRADIENT} border-box;
`;
