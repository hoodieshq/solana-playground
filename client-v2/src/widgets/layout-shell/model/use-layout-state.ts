import { useCallback, useEffect, useRef, useState } from "react";

import { createLogger } from "@/shared/lib/logger";
import { readLayout, writeLayout } from "./layout-state";
import type { LayoutState, PanelLayout } from "./layout-state";
import { layoutTelemetry } from "./telemetry";
import type { LayoutPanel, ToggleSource } from "./telemetry";

const log = createLogger("layout-shell:state");

const OPEN_FIELD: Record<
  LayoutPanel,
  "leftOpen" | "assistantOpen" | "consoleOpen"
> = {
  left: "leftOpen",
  assistant: "assistantOpen",
  console: "consoleOpen",
};

const storage = () => window.localStorage;

/** The layout, restored once per mount, saved on every change */
export const useLayoutState = () => {
  const [restored] = useState(() => readLayout(storage));
  const [state, setState] = useState<LayoutState>(restored.state);
  // Mirrors `state` synchronously, so two toggles in one tick each see the
  // other, and the event is sent outside any `setState` updater
  const latest = useRef(state);

  useEffect(() => {
    if (restored.kind !== "failed") return;
    log.warn("The saved layout could not be read; using the defaults", {
      context: {
        reason: restored.reason,
        error: String(restored.error ?? ""),
      },
    });
    layoutTelemetry.track("layout_restore_failed", { reason: restored.reason });
  }, [restored]);

  // Saved on a change, never on mount: a visit that changes nothing leaves
  // what is stored alone, a value from a newer version included
  const update = useCallback((next: LayoutState) => {
    latest.current = next;
    setState(next);
    const written = writeLayout(storage, next);
    if (!written.ok) {
      log.warn("The layout could not be saved", {
        context: { error: String(written.error) },
      });
    }
  }, []);

  const setOpen = useCallback(
    (panel: LayoutPanel, open: boolean, via: ToggleSource) => {
      const field = OPEN_FIELD[panel];
      if (latest.current[field] === open) return;
      layoutTelemetry.track("layout_panel_toggled", { panel, open, via });
      update({ ...latest.current, [field]: open });
    },
    [update]
  );

  const setHorizontal = useCallback(
    (h: PanelLayout) => update({ ...latest.current, h }),
    [update]
  );
  const setVertical = useCallback(
    (vert: PanelLayout) => update({ ...latest.current, vert }),
    [update]
  );

  return { state, setOpen, setHorizontal, setVertical };
};
