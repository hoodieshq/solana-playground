import { createTracker } from "@/shared/lib/telemetry";
import type {
  SettingsEntry,
  SettingsExit,
} from "@/shared/lib/settings-request";

type SettingsEvents = {
  /** The settings page opened; `from` is the control or key that opened it. */
  settings_opened: { from: SettingsEntry };
  /** The settings page closed, by "Back to app", Escape or ⌘, (`key`). */
  settings_closed: { via: SettingsExit };
  /** A user picked a section in the page's section list. */
  settings_section_picked: { section: string };
  /** A custom RPC was saved in Settings, Network: a new one (`add`) or an edited one (`edit`). */
  settings_custom_rpc_saved: { mode: "add" | "edit" };
  /** A saved custom RPC was removed; `picked` says whether it was the network in use. */
  settings_custom_rpc_removed: { picked: boolean };
  /** Saving a custom RPC was refused: not an https URL (`format`), or already saved (`duplicate`). */
  settings_custom_rpc_refused: { reason: "format" | "duplicate" };
};

export const settingsTelemetry = createTracker<SettingsEvents>();
