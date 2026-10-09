import { createTracker } from "../../../shared/lib/telemetry";
import type { NoParams } from "../../../shared/lib/telemetry";
import type { Viewport } from "../../../shared/lib/hooks/use-viewport";
import type { RestoreFailure } from "./layout-state";

export type LayoutPanel = "left" | "assistant" | "console";

/** What opened or closed a panel: a click, a key, or the product itself (a deploy, "Fix with assistant") */
export type ToggleSource = "button" | "key" | "auto";

type LayoutEvents = {
  /** A panel opened or closed; `via` says whether a button, a key or the product did it. */
  layout_panel_toggled: {
    panel: LayoutPanel;
    open: boolean;
    via: ToggleSource;
  };
  /** The window's width class, once per page load. */
  layout_viewport: { width: Viewport };
  /** The user tried to type in the read-only editor; once per page load. */
  layout_readonly_edit_blocked: NoParams;
  /** The saved layout could not be read and the defaults were used; `reason` says why. */
  layout_restore_failed: { reason: RestoreFailure };
};

export const layoutTelemetry = createTracker<LayoutEvents>();
