import { useCallback, useSyncExternalStore } from "react";

import { toast } from "sonner";

import { useSetStatic } from "@/hooks/useSetStatic";
import { useIsMobile } from "@/shared/lib/hooks/use-mobile";
import { RAIL_WIDTH } from "@/shared/lib/hooks/use-viewport";
import { uuid } from "@/shared/lib/ids";
import { createLogger } from "@/shared/lib/logger";
import { Toaster } from "@/shared/ui/sonner";
import type { Elementable } from "@/utils/types";
import { PgView } from "@/utils/view";
import { DEFAULT_TOAST_DURATION } from "@/utils/view";
import type { ToastId, ToastOptions } from "@/utils/view";
import { overlayTelemetry } from "../model/telemetry";

const log = createLogger("overlays:toast-host");

type ToastEvent = {
  elementable: Elementable;
  props?: {
    componentProps?: Record<string, unknown>;
    // Typed required by `PgView.setToast`; a raw event may still omit it
    options?: ToastOptions;
  };
};

const durationOf = (duration: ToastOptions["duration"]) => {
  if (duration === "persistent") return Infinity;
  return duration ?? DEFAULT_TOAST_DURATION;
};

/**
 * The app's theme mode, read from the `dark` class that `applyThemeMode` puts
 * on `<html>`, so the toaster follows a theme change without being told.
 */
const subscribeToMode = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
};
const modeNow = () =>
  document.documentElement.classList.contains("dark") ? "dark" : "light";

/**
 * Renders the toasts sent with `PgView.setToast` in Sonner, at the bottom
 * left and clear of the rail.
 *
 * The toaster sits above the dialogs and the left panel's Sheet (`z-[60]`,
 * over their `z-50`), as the legacy toast layer did: a toast must stay
 * visible and usable whatever is open, a persistent one included. A modal
 * layer sets `pointer-events: none` on the body, so the toaster turns it back
 * on. A click on a toast over a dialog would count as outside it, so
 * `BaseModalFrame` ignores one (`isInsideToast`). The stock Sheet is rendered
 * by `LayoutShell` and has no such guard: a click on a toast over the open
 * left-panel Sheet closes it.
 */
export const ToastHost = () => {
  // Below this width the left panel is a Sheet and there is no rail to clear
  const noRail = useIsMobile();
  const mode = useSyncExternalStore(subscribeToMode, modeNow);
  const show = useCallback(({ elementable, props }: ToastEvent) => {
    const options = props?.options;
    if (!options?.name) {
      log.warn("toast without a name", {
        context: { elementable: String(elementable) },
      });
    }
    const name = options?.name ?? "unnamed";
    // A random small int could repeat and silently replace a live toast
    const id = options?.id ?? uuid();

    try {
      // The component gets the toast's id, so it can close itself (NonLocal
      // does)
      toast(
        PgView.normalizeElement(elementable, { ...props?.componentProps, id }),
        {
          id,
          duration: durationOf(options?.duration),
        }
      );
    } catch (e) {
      // The event's sender cannot handle this; the team hears of it
      log.error(e, { report: true, context: { name } });
      return;
    }
    overlayTelemetry.track("overlay_toast_shown", { name });
  }, []);

  useSetStatic(PgView.events.TOAST_SET, show);
  useSetStatic(PgView.events.TOAST_CLOSE, (id?: ToastId) => {
    toast.dismiss(id);
  });

  return (
    <Toaster
      className="toaster group z-[60]! pointer-events-auto"
      theme={mode}
      position="bottom-left"
      closeButton
      // The rail is a desktop part; on a phone the Sheet replaces it
      offset={{
        left: noRail ? "1rem" : `calc(${RAIL_WIDTH} + 1rem)`,
        bottom: "1rem",
      }}
      mobileOffset={{ left: "1rem", bottom: "1rem" }}
    />
  );
};
