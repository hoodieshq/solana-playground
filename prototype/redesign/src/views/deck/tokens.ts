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
 * The grid. A hairline lattice over the gradient and over the black, at low
 * enough contrast that it reads as texture rather than as a table.
 */
export const GRID_PITCH = "44px";
export const grid = (alpha = 0.12) => `
  linear-gradient(
    to right,
    rgba(255, 255, 255, ${alpha}) 0 1px,
    transparent 1px ${GRID_PITCH}
  ),
  linear-gradient(
    to bottom,
    rgba(255, 255, 255, ${alpha}) 0 1px,
    transparent 1px ${GRID_PITCH}
  )
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
