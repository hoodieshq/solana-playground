/**
 * The presentation's own brand, taken off the Figma deck (node 46:2881).
 *
 * These are not the product's tokens. The product runs on a neutral dark
 * palette that took a long argument to settle; the deck is Solana's own
 * colours at full strength, which is right for a pitch and wrong for a surface
 * you look at all day. Keeping them in separate files is the point — nothing
 * here should leak into `themes/solana-v3`.
 */

/** Solana's two, straight off the slides */
export const GREEN = "#14F195";
export const PURPLE = "#9945FF";

/** The blends the deck's mesh actually passes through, sampled from the render */
export const TEAL = "#35C6B0";
export const STEEL = "#5584C4";
export const VIOLET = "#7655DA";
export const DEEP = "#713AD1";

/** The near-black the last tagline slide sits on */
export const INK = "#151515";
export const PAPER = "#FFFFFF";

/**
 * The mesh. Four stops across a diagonal, which is what the slides do — green
 * at one corner, purple at the other, and the blend carrying the middle.
 */
export const MESH = `linear-gradient(115deg, ${GREEN} 0%, ${TEAL} 22%, ${STEEL} 45%, ${VIOLET} 68%, ${PURPLE} 100%)`;

/** The purple-weighted variant, for the slide that is mostly violet */
export const MESH_DEEP = `linear-gradient(120deg, ${GREEN} -10%, ${STEEL} 28%, ${VIOLET} 58%, ${DEEP} 82%, ${PURPLE} 100%)`;

/**
 * The background pattern, from the supplied asset rather than from my reading
 * of it — and the two disagreed on the only thing that matters. I had drawn
 * the light in the *gaps*, as a crosshatch with a star at each intersection.
 * In the asset the light is the tiles and the gaps are the ground showing
 * through, so none of the old numbers survive.
 *
 * Every number below is read off the asset: tiles of 58 on a pitch of 60, so
 * the gap is 2, and white at 0.2.
 *
 * The corner is not an arc. It is Figma's smoothed corner — two beziers easing
 * into the straight run over 20 units, rather than one quarter circle over the
 * radius — which is why `border-radius` cannot draw this tile and the path is
 * carried verbatim.
 *
 * It lives here because three screens draw it. It was three *different*
 * patterns before, which is the drift this file exists to stop.
 */

/* One cell, lifted from the asset's tile at (44, 1802) and moved to the
   origin. Repeating it is identical to the 1946×1862 path and ~1/1000th of
   it — the supplied file is ~180 KB of the same shape a thousand times. */
const CELL =
  "M0 38C0 47.4281 0 52.1421 2.9289 55.0711C5.8579 58 10.5719 58 20 58H38" +
  "C47.4281 58 52.1421 58 55.0711 55.0711C58 52.1421 58 47.4281 58 38V20" +
  "C58 10.5719 58 5.8579 55.0711 2.9289C52.1421 0 47.4281 0 38 0H20" +
  "C10.5719 0 5.8579 0 2.9289 2.9289C0 5.8579 0 10.5719 0 20V38Z";

export const LATTICE_PITCH = "60px";

/**
 * The tiles, as a background image.
 *
 * The alpha is baked into the fill rather than set as an element `opacity`, so
 * this can be a plain background on an element that also has content — which
 * is what the evaluation needs, since fading that element would fade the page.
 */
export const latticeTiles = (alpha = 0.2) =>
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' ` +
  `width='60' height='60'%3E%3Cpath d='${CELL}' fill='%23fff' ` +
  `fill-opacity='${alpha}'/%3E%3C/svg%3E")`;

/**
 * The asset's own gradient — full at the right edge, gone at the left.
 *
 * Separate from the tiles because a mask applies to everything its element
 * paints, so it is only safe on a layer that paints nothing else.
 */
export const LATTICE_FADE = `
  -webkit-mask-image: linear-gradient(to left, #000, transparent);
  mask-image: linear-gradient(to left, #000, transparent);
`;

/**
 * The headline face. A Google family, variable on weight between 400 and 700
 * — the deck sets its headlines at Regular and relies on size, not weight,
 * which is why the range stops where it does.
 */
export const HEADLINE = `"Stack Sans Headline", "Manrope", -apple-system, BlinkMacSystemFont, sans-serif`;

/** Everything that is not a headline stays on the product's own face */
export const BODY = `"Manrope", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;

/**
 * The deck's headline metric. The Figma sets 216px on a 1920 frame with
 * -1% tracking and 66% leading, which is the whole look: very large, very
 * tight, and set solid. Expressed against the viewport so it holds at any size.
 */
export const HEADLINE_SIZE = "clamp(2.75rem, 11.3vw, 13.5rem)";
/* The Figma says 66.5%, which is measured on a 1920 frame where the type is
   216px. At any smaller size that has "Design" and "Proposal" touching — the
   g of the first line lands on the P of the second. 0.8 keeps the set-solid
   look without the collision. */
export const HEADLINE_LEADING = 0.8;
export const HEADLINE_TRACKING = "-0.01em";
