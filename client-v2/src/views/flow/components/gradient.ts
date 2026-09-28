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

/**
 * The one action a view leads with — Build, Deploy, Start, send — drawn as
 * the gradient stroke too: a dark fill ringed in the brand, the same ring
 * the current tab wears. Pointed at or pressed, the gradient fills it, faded
 * in from under the label. A full fill at rest pulled the eye off everything
 * else on the screen, and a phone, with nothing to point, keeps the ring.
 *
 * The fill is a layer of its own under the label (`isolation` keeps it above
 * the element's own background), since a gradient cannot be faded as a
 * background.
 */
export const brandAction = (
  /* As with `gradientStroke`: the surface inside the ring, optional because
     the theme types its surfaces that way */
  bg: string | undefined
) => {
  const fill = bg ?? "transparent";
  const ring = css`
    border: 1px solid transparent;
    background: linear-gradient(${fill}, ${fill}) padding-box,
      ${GRADIENT} border-box;
    color: #ffffff;
  `;
  return css`
    position: relative;
    isolation: isolate;
    ${ring}

    &:hover,
    &:disabled,
    &:disabled:hover {
      ${ring}
    }

    &::before {
      content: "";
      position: absolute;
      inset: -1px;
      z-index: -1;
      border-radius: inherit;
      background: ${GRADIENT};
      opacity: 0;
      transition: opacity 0.2s ease;
    }

    &:hover:not(:disabled)::before,
    &:active:not(:disabled)::before {
      opacity: 1;
    }

    @media (prefers-reduced-motion: reduce) {
      &::before {
        transition: none;
      }
    }
  `;
};
