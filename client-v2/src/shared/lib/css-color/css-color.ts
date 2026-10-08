import { createLogger } from "../logger";

const log = createLogger("css-color:resolve");

/** Fully transparent black, the hex Monaco and xterm accept for "nothing" */
export const TRANSPARENT = "#00000000";

const byte = (n: number) =>
  Math.round(Math.min(255, Math.max(0, n)))
    .toString(16)
    .padStart(2, "0");

/** An alpha written as `0.5` or `50%`, as a 0..1 number */
const alphaOf = (a: string | undefined) => {
  if (a === undefined) return 1;
  return a.endsWith("%") ? parseFloat(a) / 100 : parseFloat(a);
};

const hex = (r: number, g: number, b: number, a: number) =>
  `#${byte(r)}${byte(g)}${byte(b)}${a < 1 ? byte(a * 255) : ""}`;

const RGB =
  /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/;
const SRGB =
  /^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)$/;

/**
 * Hex for a colour as `getComputedStyle` reports it: `rgb()`/`rgba()`, or
 * `color(srgb …)`, which Chrome reports for `color-mix(in srgb, …)`.
 * `#rrggbb` when opaque, `#rrggbbaa` otherwise; `null` for anything else.
 */
export const toHex = (computed: string): string | null => {
  const value = computed.trim();

  const rgb = value.match(RGB);
  if (rgb) return hex(+rgb[1], +rgb[2], +rgb[3], alphaOf(rgb[4]));

  const srgb = value.match(SRGB);
  if (srgb) {
    return hex(
      +srgb[1] * 255,
      +srgb[2] * 255,
      +srgb[3] * 255,
      alphaOf(srgb[4])
    );
  }

  return null;
};

/** Whether a computed colour is the browser's transparent black */
export const isTransparent = (computed: string) =>
  toHex(computed) === TRANSPARENT;

/**
 * Resolve any CSS colour (`var(--token)`, `color-mix(…)`, a keyword) to hex
 * against the current `<html>`, for engines that cannot read CSS variables:
 * Monaco's `defineTheme` and xterm's `theme`. Call it after the theme's
 * class is on `<html>`.
 */
export const resolveColor = (value: string): string => {
  const probe = document.createElement("span");
  probe.style.display = "none";
  probe.style.color = value;
  document.documentElement.appendChild(probe);
  const computed = getComputedStyle(probe).color;
  probe.remove();

  const resolved = toHex(computed);
  if (resolved) return resolved;

  // An unknown token must not take the editor down; it shows as a missing
  // colour, and the log says which value it was
  log.warn("colour could not be resolved, using transparent", {
    context: { value, computed },
  });
  return TRANSPARENT;
};

/** `resolveColor` over every value of a flat colour map */
export const resolveColors = <T extends Record<string, string>>(colors: T) =>
  Object.fromEntries(
    Object.entries(colors).map(([key, value]) => [key, resolveColor(value)])
  ) as T;
