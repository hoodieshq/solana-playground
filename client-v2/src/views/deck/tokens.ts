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
 * The background pattern, read off the supplied asset and the slides that use
 * it (Figma 44:343).
 *
 * The light is in the gaps. The asset is one compound path: a frame the size
 * of the artboard, and a thousand rounded tiles inside it wound the opposite
 * way, which makes every tile a hole. What gets filled is the mortar — a 2px
 * line between tiles — and where four smoothed corners meet, the mortar opens
 * into a four-point star. Every render in the deck shows it that way, and an
 * earlier pass here that lit the tiles instead was simply inverted.
 *
 * Numbers from the slides: tiles of 58 on a pitch of 60, white at 0.1. The
 * pitch belongs to the 1920 frame, not to the screen — on a smaller screen the
 * slide is smaller and so are its lines, which is what keeps them hairlines.
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

/**
 * The pitch: 60 on the 1920 frame and scaled with it, in whole pixels so the
 * lines stay even from tile to tile, and never finer than 24 — below that a
 * phone would show a blur rather than a grid. A custom property, so the two
 * layers that draw the pattern cannot disagree about it.
 */
export const PATTERN_PITCH = `
  --pp: max(24px, calc(min(100vw, 1920px) / 32));

  @supports (width: round(1.5px, 1px)) {
    --pp: max(24px, round(calc(min(100vw, 1920px) / 32), 1px));
  }
`;

/**
 * The pattern, as a background image, at a given strength.
 *
 * The alpha is baked into the fill rather than set as an element `opacity`, so
 * it can be layered — the cursor light is the same image at a higher alpha,
 * revealed through a mask, and the two have to agree to the pixel.
 */
export const patternImage = (alpha = 0.1) =>
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' ` +
  `width='60' height='60'%3E%3Cpath fill-rule='evenodd' d='${CELL}' ` +
  `fill='%23fff' fill-opacity='${alpha}'/%3E%3C/svg%3E")`;

/**
 * How the pattern falls away on the black slide: brightest just below the
 * bottom edge, a little left of centre, and gone by the top. The Figma's
 * radial on 44:343 is centred at (931, 1470) on the 1920 × 1080 frame and
 * reaches about 1610 — near enough a circle that an ellipse in the frame's own
 * proportions draws it, and holds on a screen of any shape.
 *
 * Separate from the image because a mask applies to everything its element
 * paints, so it only goes on a layer that paints nothing else.
 */
export const PATTERN_RISE = `
  -webkit-mask-image: radial-gradient(ellipse 84.7% 148% at 48.5% 136%, #000, transparent);
  mask-image: radial-gradient(ellipse 84.7% 148% at 48.5% 136%, #000, transparent);
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
