import { useCallback, useEffect, useRef, useState } from "react";

import { createLogger } from "@/shared/lib/logger";
import {
  horizontalOf,
  readLayout,
  verticalOf,
  writeLayout,
} from "./layout-state";
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

/** The layout, restored once per mount, saved on a toggle or a drag */
export const useLayoutState = () => {
  const [restored] = useState(() => readLayout(storage));
  const [state, setState] = useState<LayoutState>(restored.state);
  // Mirrors `state` synchronously, so two toggles in one tick each see the
  // other, and the event is sent outside any `setState` updater
  const latest = useRef(state);
  // A layout from a newer version is kept as it is: this one cannot read it,
  // and writing would replace it with a layout its own version cannot use
  const keepSaved = restored.kind === "failed" && restored.reason === "version";
  const reportedKept = useRef(false);
  const reportedSaveFailure = useRef(false);

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

  // Saved on a toggle or a drag, never on mount: a visit that changes nothing
  // leaves what is stored alone. The panel groups report a layout on mount
  // too, and the shell filters those out before they reach `setHorizontal` /
  // `setVertical`. A layout from a newer version is never written over.
  const update = useCallback(
    (next: LayoutState) => {
      latest.current = next;
      setState(next);
      if (keepSaved) {
        if (!reportedKept.current) {
          reportedKept.current = true;
          log.warn(
            "The saved layout is from a newer version; not overwriting it"
          );
        }
        return;
      }
      const written = writeLayout(storage, next);
      // Once per mount: a drag reports on every tick
      if (!written.ok && !reportedSaveFailure.current) {
        reportedSaveFailure.current = true;
        log.warn("The layout could not be saved", {
          context: { error: String(written.error) },
        });
      }
    },
    [keepSaved]
  );

  const setOpen = useCallback(
    (panel: LayoutPanel, open: boolean, via: ToggleSource) => {
      const field = OPEN_FIELD[panel];
      if (latest.current[field] === open) return;
      layoutTelemetry.track("layout_panel_toggled", { panel, open, via });
      const next: LayoutState = { ...latest.current, [field]: open };
      // The sizes a drag left are of the panel as it was: after a toggle a
      // reload sizes the panel from its flag instead, so a folded panel is
      // never reopened by sizes saved while it was open
      if (panel === "assistant") delete next.h;
      if (panel === "console") delete next.vert;
      update(next);
    },
    [update]
  );

  const setHorizontal = useCallback(
    (layout: PanelLayout) => {
      const h = horizontalOf(layout);
      if (h) update({ ...latest.current, h });
    },
    [update]
  );
  const setVertical = useCallback(
    (layout: PanelLayout) => {
      const vert = verticalOf(layout);
      if (vert) update({ ...latest.current, vert });
    },
    [update]
  );

  return { state, setOpen, setHorizontal, setVertical };
};
