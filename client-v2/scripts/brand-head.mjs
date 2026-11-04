/**
 * Point the head of the mirrored `index.html` at the brand's icons and theme
 * colour, so a browser, a crawler or a home screen reads them from the markup
 * without running the bundle.
 *
 * The page itself stays upstream's: owning a copy of it would silently drop
 * any later upstream change to the head. Only the icon links and
 * `theme-color` are replaced; the files they name are the fork's, copied over
 * the mirror from `client-v2/static` (`static-overlay.mjs`).
 */

/** The tags that replace upstream's, in order; `#101011` is the DS `--background` */
export const BRAND_HEAD = [
  '<link rel="icon" href="%PUBLIC_URL%/favicon.ico" sizes="32x32" />',
  '<link rel="icon" href="%PUBLIC_URL%/favicon.svg" type="image/svg+xml" />',
  '<link rel="icon" href="%PUBLIC_URL%/favicon-96x96.png" type="image/png" sizes="96x96" />',
  '<link rel="apple-touch-icon" href="%PUBLIC_URL%/apple-touch-icon.png" />',
  '<meta name="theme-color" content="#101011" />',
];

/** A whole line holding an icon link or a theme colour, whatever its attributes */
const REPLACED =
  /^[ \t]*<(?:link\b[^>]*\brel="(?:icon|shortcut icon|apple-touch-icon)"|meta\b[^>]*\bname="theme-color")[^>]*>[ \t]*\r?\n/gm;

const CHARSET = /^([ \t]*)<meta charset="[^"]*"\s*\/?>[ \t]*\r?\n/m;

/**
 * @param {string} html the mirrored page
 * @returns {string} the page with the brand's icon block after its charset
 * @throws when the page has no `<meta charset>` line or no `</head>`, so a
 *   restructured upstream page fails the build instead of shipping unbranded
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
  return stripped.replace(line, line + block);
};
