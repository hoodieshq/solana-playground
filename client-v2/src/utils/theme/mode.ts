/**
 * Put the theme's mode on `<html>`. The `dark` class switches every token in
 * `app/styles/playground-tokens.css`; `colorScheme` matches the native UI
 * (scrollbars, form controls) to it.
 *
 * Runs before the theme-change event, so whatever reacts to the event
 * (Monaco, xterm) reads the new values.
 */
export const applyThemeMode = (
  isDark: boolean,
  root: HTMLElement = document.documentElement
) => {
  root.classList.toggle("dark", isDark);
  root.style.colorScheme = isDark ? "dark" : "light";
};
