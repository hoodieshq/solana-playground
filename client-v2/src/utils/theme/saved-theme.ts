/** The themes the product offers: the design system's dark and light */
export const THEME_NAMES = ["Dark", "Light"] as const;

export type ThemeName = typeof THEME_NAMES[number];

export const isThemeName = (name: string): name is ThemeName =>
  (THEME_NAMES as readonly string[]).includes(name);

/**
 * Themes a user could pick before the token bridge, and so is told about.
 * "Solana V2" is missing on purpose: it was the default, written to storage
 * on every first load, so nobody chose it and Dark replaces it silently.
 */
const REMOVED_THEMES = ["Playground", "Dracula", "Solana"];

export interface SavedTheme {
  name: ThemeName;
  /** The removed theme to tell the user about, or `null` */
  removed: string | null;
}

/**
 * Decide the theme from the name saved in storage. Anything that is not one
 * of the two themes lands on Dark; only a theme the user picked from our
 * list is reported, so a hand-edited value or another app's key on localhost
 * passes silently.
 */
export const resolveSavedTheme = (saved: string | null): SavedTheme => {
  if (saved !== null && isThemeName(saved)) {
    return { name: saved, removed: null };
  }
  if (saved !== null && REMOVED_THEMES.includes(saved)) {
    return { name: "Dark", removed: saved };
  }
  return { name: "Dark", removed: null };
};

export const removedThemeMessage = (name: string) =>
  `The ${name} theme was removed. Playground now uses Dark; Light is in Settings.`;

let held: string | null = null;

/**
 * The removed theme, kept in memory until the UI can show it. A toast sent
 * before `Toast` mounts is lost, and storage already says Dark, so this is
 * the only place the name survives until then.
 */
export const removedThemeNotice = {
  hold(name: string) {
    held = name;
  },
  take(): string | null {
    const name = held;
    held = null;
    return name;
  },
};
