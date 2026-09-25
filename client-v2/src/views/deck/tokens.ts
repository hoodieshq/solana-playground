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

/** The near-black the last tagline slide sits on */
export const INK = "#151515";
export const PAPER = "#FFFFFF";

/* The gradients themselves live with the ground that moves between them, in
   `Atmosphere` — each slide has its own arrangement, sampled from its render,
   and a single ramp per slide could not travel from one to the next. */

/**
 * The background pattern, read off the supplied asset.
 *
 * The light is in the gaps. The asset is one compound path: a frame the size
 * of the artboard, and a thousand rounded tiles inside it wound the opposite
 * way, which makes every tile a hole. What gets filled is the mortar — a 2px
 * line between tiles — and where four smoothed corners meet, the mortar opens
 * into a four-point star. Every render in the deck shows it that way, and an
 * earlier pass here that lit the tiles instead was simply inverted.
 *
 * Numbers from the asset: tiles of 58 on a pitch of 60, white at 0.2.
 *
 * The corner is not an arc. It is Figma's smoothed corner — two beziers easing
 * into the straight run over 20 units rather than a quarter circle over the
 * radius — and that curve is the whole shape of the star, so the tile's path
 * is carried verbatim rather than approximated with a radius.
 *
 * It lives here because three screens draw it. It was three *different*
 * patterns before, which is the drift this file exists to stop.
 */

/* One cell: the square, minus the tile lifted from the asset at (44, 1802)
   and moved to the origin. Filled even-odd, so what paints is the gap on two
   sides of the tile plus the four corners it does not reach — repeated, the
   corners of four neighbouring cells meet and make the star. Identical to the
   1946 × 1862 original at ~1/1000th of its size. */
const TILE =
  "M0 38C0 47.4281 0 52.1421 2.9289 55.0711C5.8579 58 10.5719 58 20 58H38" +
  "C47.4281 58 52.1421 58 55.0711 55.0711C58 52.1421 58 47.4281 58 38V20" +
  "C58 10.5719 58 5.8579 55.0711 2.9289C52.1421 0 47.4281 0 38 0H20" +
  "C10.5719 0 5.8579 0 2.9289 2.9289C0 5.8579 0 10.5719 0 20V38Z";
const CELL = `M0 0H60V60H0Z${TILE}`;

export const PATTERN_PITCH = "60px";

/**
 * The pattern, as a background image, at a given strength.
 *
 * The alpha is baked into the fill rather than set as an element `opacity`, so
 * it can be layered — the cursor light is the same image at a higher alpha,
 * revealed through a mask, and the two have to agree to the pixel.
 */
export const patternImage = (alpha = 0.2) =>
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' ` +
  `width='60' height='60'%3E%3Cpath fill-rule='evenodd' d='${CELL}' ` +
  `fill='%23fff' fill-opacity='${alpha}'/%3E%3C/svg%3E")`;

/**
 * The asset's own gradient — full at the right edge, gone at the left.
 *
 * Separate from the image because a mask applies to everything its element
 * paints, so it only goes on a layer that paints nothing else.
 */
export const PATTERN_FADE = `
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
