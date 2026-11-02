import { useSyncExternalStore } from "react";

import { PROVIDERS } from "../../../views/sidebar/assistant/model/types";
import { PgAssistant } from "../../../views/sidebar/assistant/store";
import { settingsTelemetry } from "../model/telemetry";
import BaseAssistantKey from "./BaseAssistantKey";
import type { AssistantKeyState } from "./BaseAssistantKey";

const subscribe = (onChange: () => void) =>
  PgAssistant.onDidChange(onChange).dispose;

/**
 * Whether a backend holding the user's key is connected, and whether a turn
 * is using it: the store's own view, since the panel's turn hook may not be
 * mounted while Settings covers the window
 */
const stateOf = (): AssistantKeyState => {
  const id = PgAssistant.connection?.id;
  if (!PROVIDERS.find((p) => p.id === id)?.needsKey) return "none";
  if (PgAssistant.status !== "idle" || PgAssistant.turnRunning) return "busy";
  return "ready";
};

/**
 * `BaseAssistantKey` on the live connection. Delete my key is the head's
 * More item too: both are `PgAssistant.disconnect` (HOO-2423).
 */
const AssistantKey = ({ phone }: { phone: boolean }) => {
  const state = useSyncExternalStore(subscribe, stateOf);
  return (
    <BaseAssistantKey
      state={state}
      phone={phone}
      onDelete={() => {
        settingsTelemetry.track("settings_key_deleted", {});
        PgAssistant.disconnect();
      }}
    />
  );
};

export default AssistantKey;
