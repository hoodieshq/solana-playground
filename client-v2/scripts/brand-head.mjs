/**
 * Point the head of the mirrored `index.html` at the brand's icons and theme
 * colour, so a browser, a crawler or a home screen reads them from the markup
 * without running the bundle.
 *
 * The same block carries the share card (Open Graph and Twitter tags), so a
 * link preview reads the brand's image, title and description from markup.
 *
 * The page itself stays upstream's: owning a copy of it would silently drop
 * any later upstream change to the head. Only the icon links, `theme-color`
 * and the card tags are replaced; the files they name are the fork's, copied
 * over the mirror from `client-v2/static` (`static-overlay.mjs`).
 */

/**
 * Where the card's absolute URLs point: crawlers do not resolve relative
 * ones, so `%PUBLIC_URL%` cannot serve here. The current production host; the
 * production domain is not attached yet, and replaces it here when it is.
 */
export const SITE_URL = "https://solana-playground-teal.vercel.app";

const DESCRIPTION = "Write, build and deploy Solana programs in your browser.";
const IMAGE_ALT = `Solana Playground logo on a dark background with the line: ${DESCRIPTION}`;

/** Design's share card (Almaz, 4 Nov); the title is the manifest name */
const CARD = [
  ["property", "og:type", "website"],
  ["property", "og:site_name", "Solana Playground"],
  ["property", "og:title", "Solana Playground"],
  ["property", "og:description", DESCRIPTION],
  ["property", "og:url", `${SITE_URL}/`],
  ["property", "og:image", `${SITE_URL}/og.png`],
  ["property", "og:image:type", "image/png"],
  ["property", "og:image:width", "1200"],
  ["property", "og:image:height", "630"],
  ["property", "og:image:alt", IMAGE_ALT],
  ["name", "twitter:card", "summary_large_image"],
  ["name", "twitter:title", "Solana Playground"],
  ["name", "twitter:description", DESCRIPTION],
  ["name", "twitter:image", `${SITE_URL}/og.png`],
  ["name", "twitter:image:alt", IMAGE_ALT],
].map(
  ([attr, key, content]) => `<meta ${attr}="${key}" content="${content}" />`
);

/** The tags that replace upstream's, in order; `#101011` is the DS `--background` */
export const BRAND_HEAD = [
  '<link rel="icon" href="%PUBLIC_URL%/favicon.ico" sizes="32x32" />',
  '<link rel="icon" href="%PUBLIC_URL%/favicon.svg" type="image/svg+xml" />',
  '<link rel="icon" href="%PUBLIC_URL%/favicon-96x96.png" type="image/png" sizes="96x96" />',
  '<link rel="apple-touch-icon" href="%PUBLIC_URL%/apple-touch-icon.png" />',
  '<meta name="theme-color" content="#101011" />',
  ...CARD,
];

/**
 * A whole line holding one icon link, theme colour or card tag, whatever its
 * attributes
 */
const REPLACED =
  /^[ \t]*<(?:link\b[^>]*\brel=["'][^"']*\bicon\b[^"']*["']|meta\b[^>]*\b(?:name=["']theme-color["']|property=["']og:|name=["']twitter:))[^>]*>[ \t]*\r?\n/gim;

/** Any icon link or theme colour, wherever it sits, to check none survived */
const ICON_TAG = /<link\b[^>]*\brel=["']?[^"'>]*\bicon\b/gi;
const THEME_TAG = /<meta\b[^>]*\bname=["']?theme-color\b/gi;
const CARD_TAG = /<meta\b[^>]*\b(?:property=["']?og:|name=["']?twitter:)/gi;

const CHARSET = /^([ \t]*)<meta charset="[^"]*"\s*\/?>[ \t]*\r?\n/m;

const count = (html, re) => html.match(re)?.length ?? 0;

/**
 * Idempotent: a second run strips the brand block and puts it back.
 *
 * @param {string} html the mirrored page
 * @returns {string} the page with the brand's icon and card block after its charset
 * @throws when the page has no `<meta charset>` line or no `</head>`, or when
 *   an icon link, theme colour or card tag the line-wise strip missed (a tag split over
 *   lines, or sharing a line) survives beside the brand's, so a restructured
 *   upstream page fails the build instead of shipping a mixed head
 */
export const brandHead = (html) => {
  if (!html.includes("</head>")) {
    throw new Error("index.html has no </head>; cannot place the brand icons");
  }
  const stripped = html.replace(REPLACED, "");
  const charset = stripped.match(CHARSET);
  if (!charset) {
    throw new Error(
      "index.html has no <meta charset> line; cannot place the brand icons"
    );
  }
  const [line, indent] = charset;
  const block = BRAND_HEAD.map((tag) => `${indent}${tag}\n`).join("");
  const branded = stripped.replace(line, () => line + block);
  if (
    count(branded, ICON_TAG) !== count(block, ICON_TAG) ||
    count(branded, THEME_TAG) !== count(block, THEME_TAG) ||
    count(branded, CARD_TAG) !== count(block, CARD_TAG)
  ) {
    throw new Error(
      "index.html keeps an icon link, theme-color or card tag the rewrite did not remove; " +
        "update REPLACED in scripts/brand-head.mjs for upstream's new markup"
    );
  }
  return branded;
};
