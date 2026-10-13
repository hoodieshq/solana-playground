import { useCallback } from "react";

import { toast } from "sonner";

import { useSetStatic } from "@/hooks/useSetStatic";
import { RAIL_WIDTH } from "@/shared/lib/hooks/use-viewport";
import { createLogger } from "@/shared/lib/logger";
import { Toaster } from "@/shared/ui/sonner";
import { PgCommon } from "@/utils/common";
import type { Elementable } from "@/utils/types";
import { PgView } from "@/utils/view";
import type { ToastOptions } from "@/utils/view";
import { overlayTelemetry } from "../model/telemetry";

const log = createLogger("overlays:toast-host");

const DEFAULT_DURATION = 5000;

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
  return duration ?? DEFAULT_DURATION;
};

/**
 * Renders the toasts sent with `PgView.setToast` in Sonner, at the bottom
 * left and clear of the rail.
 *
 * Sonner's layer is forced below the dialogs (`z-40`, under the dialog's
 * `z-50`) rather than left at its default, which is above everything: a
 * dialog's backdrop must catch every click, and a click on a toast would
 * otherwise count as outside the dialog and close it. It still clears the
 * left panel's container (`z-10`), so a toast opens over the panel.
 */
export const ToastHost = () => {
  const show = useCallback(({ elementable, props }: ToastEvent) => {
    const options = props?.options;
    if (!options?.name) {
      log.warn("toast without a name", {
        context: { elementable: String(elementable) },
      });
    }
    const name = options?.name ?? "unnamed";
    const id = options?.id ?? PgCommon.generateRandomInt(0, 2 ** 12);

    // The component gets the toast's id, so it can close itself (NonLocal does)
    toast(
      PgView.normalizeElement(elementable, { ...props?.componentProps, id }),
      {
        id,
        duration: durationOf(options?.duration),
      }
    );
    overlayTelemetry.track("overlay_toast_shown", { name });
  }, []);

  useSetStatic(PgView.events.TOAST_SET, show);
  useSetStatic(PgView.events.TOAST_CLOSE, (id?: string | number) => {
    toast.dismiss(id);
  });

  return (
    <Toaster
      className="toaster group z-40!"
      position="bottom-left"
      closeButton
      // The rail is a desktop part; on a phone the Sheet replaces it
      offset={{ left: `calc(${RAIL_WIDTH} + 1rem)`, bottom: "1rem" }}
      mobileOffset={{ left: "1rem", bottom: "1rem" }}
    />
  );
};
