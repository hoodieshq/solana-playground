import { useEffect, useState, useSyncExternalStore } from "react";

import { dropKeptKey } from "../../../views/sidebar/assistant/model/remembered-backend";
import { PROVIDERS } from "../../../views/sidebar/assistant/model/types";
import type { KeyHold } from "../../../views/sidebar/assistant/model/types";
import { PgAssistant } from "../../../views/sidebar/assistant/store";
import { settingsTelemetry } from "../model/telemetry";
import BaseAssistantKey from "./BaseAssistantKey";

const subscribe = (onChange: () => void) =>
  PgAssistant.onDidChange(onChange).dispose;

/**
 * Whether a backend holding the user's key is connected, and whether a turn
 * is using it: the store's own view, since the panel's turn hook may not be
 * mounted while Settings covers the window
 */
const stateOf = (): KeyHold => {
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
  // Settings can open with the panel folded, or on a phone with the chat
  // closed, where the panel's own cleanup on mount has not run: what an older
  // build kept must not outlive a row that says there is no key
  const [stuck, setStuck] = useState(false);
  useEffect(() => setStuck(!dropKeptKey()), []);
  return (
    <BaseAssistantKey
      state={state}
      stuck={stuck}
      phone={phone}
      onDelete={() => {
        setStuck(!PgAssistant.disconnect());
        settingsTelemetry.track("settings_key_deleted", {});
      }}
    />
  );
};

export default AssistantKey;
