import { useEffect, useRef } from "react";

import { PgView } from "@/utils/view";
import Connect from "../../../views/sidebar/assistant/Component/Connect";
import type { ConnectPreset } from "../../../views/sidebar/assistant/Component/Connect";
import { PgAssistant } from "../../../views/sidebar/assistant/store";
import type { Connection } from "../../../views/sidebar/assistant/store";
import { ModalFrame } from "../../overlays";
import { useDefaultBackend } from "../model/default-backend";
import { assistantTelemetry } from "../model/telemetry";

export type { ConnectPreset };

/** Where Connect a model was opened from */
export type ConnectVia = "menu" | "model" | "send";

interface ConnectDialogProps {
  /** The backend, and maybe the model, the form opens on */
  preset?: ConnectPreset;
}

/**
 * Connect a model: today's `Connect` form in a dialog of `PgView`'s stack.
 * Closes itself with the connection on the first one made while it is open.
 */
const ConnectDialog = ({ preset }: ConnectDialogProps) => {
  const defaultBackend = useDefaultBackend();
  // Above `ModalFrame`, so a dialog stacked on this one does not reset it
  const opened = useRef(PgAssistant.connection);
  const closed = useRef(false);

  useEffect(
    () =>
      PgAssistant.onDidChange(() => {
        const connection = PgAssistant.connection;
        // `connect` always stores a new object, so re-picking the backend
        // already connected counts as a connection too
        if (!connection || connection === opened.current) return;
        // The store emits again before this unmounts; a second close would
        // take whatever dialog is under this one with it
        if (closed.current) return;
        closed.current = true;
        PgView.closeModal(connection);
      }).dispose,
    []
  );

  return (
    <ModalFrame name="connect-model" title="Connect a model">
      <Connect defaultBackend={defaultBackend} preset={preset} />
    </ModalFrame>
  );
};

/**
 * Open Connect a model, unless it is open already.
 *
 * `PgAssistant.isPickingBackend` is what says it is open: the reconnects on
 * load and a send with nothing connected both stand down while it is set, so
 * nothing connects behind the user's back while they are choosing.
 */
export const openConnectDialog = async (
  via: ConnectVia,
  preset?: ConnectPreset
) => {
  if (PgAssistant.isPickingBackend) return;
  assistantTelemetry.track("assistant_connect_opened", { via });
  PgAssistant.pickBackend();

  const connection = await PgView.setModal<Connection, ConnectDialogProps>(
    ConnectDialog,
    { preset }
  );
  // `closeModal` answers every pending `setModal` (HOO-2091), so an answer
  // counts only when it is the connection this dialog made
  if (connection && connection === PgAssistant.connection) {
    assistantTelemetry.track("assistant_model_picked", {
      provider: connection.id,
      via: "dialog",
    });
    return;
  }
  // Closed with no answer (Escape, Close, a press outside)
  if (PgAssistant.isPickingBackend) PgAssistant.keepBackend();
};
