/**
 * Marks the controls that open and close the settings. Tests find the
 * triggers by it.
 */
export const SETTINGS_TRIGGER_ATTR = "data-settings-trigger";

/** Which control the settings page puts focus on when it opens */
export type SettingsFocus = "page" | "network";

/**
 * What opened the settings: the cluster row, the rail's dot, the account
 * menu, ⌘, or the Get set up checklist's "Choose a network"
 */
export type SettingsEntry = "cluster" | "rail" | "menu" | "key" | "setup";

/** A request to open (or, while open, close) the settings */
export type SettingsRequest = { from: SettingsEntry; focus: SettingsFocus };
