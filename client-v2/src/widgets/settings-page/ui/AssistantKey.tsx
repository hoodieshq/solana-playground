import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { dropKeptKey } from "../../../views/sidebar/assistant/model/remembered-backend";
import {
  KEY_NOT_FORGOTTEN,
  PgAssistant,
} from "../../../views/sidebar/assistant/store";
import { settingsTelemetry } from "../model/telemetry";
import BaseAssistantKey from "./BaseAssistantKey";

const subscribe = (onChange: () => void) =>
  PgAssistant.onDidChange(onChange).dispose;

/** The store's `keyHold`, which the head's More reads too */
const stateOf = () => PgAssistant.keyHold;

interface AssistantKeyProps {
  phone: boolean;
  /** The model the key runs, as the assistant names it, while one is connected */
  ownKey?: string;
  /** Whether this deployment serves its hosted model to this user */
  hostedAvailable?: boolean;
}

/**
 * `BaseAssistantKey` on the live connection. Delete my key is the head's
 * More item too: both are `PgAssistant.disconnect` (HOO-2423).
 */
const AssistantKey = ({
  phone,
  ownKey,
  hostedAvailable = false,
}: AssistantKeyProps) => {
  const state = useSyncExternalStore(subscribe, stateOf);
  // Settings can open with the panel folded, or on a phone with the chat
  // closed, where the panel's own cleanup on mount has not run: what an older
  // build kept must not outlive a row that says there is no key
  const [stuck, setStuck] = useState(false);
  useEffect(() => setStuck(!dropKeptKey()), []);

  // "Deleted" stays until a key is connected again (HOO-2695). The delete
  // disables the button that had focus, so focus moves to the word
  const [deleted, setDeleted] = useState(false);
  const done = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (state === "ready") setDeleted(false);
  }, [state]);
  useEffect(() => {
    if (deleted) done.current?.focus();
  }, [deleted]);

  return (
    <BaseAssistantKey
      state={state}
      ownKey={ownKey}
      hostedAvailable={hostedAvailable}
      stuck={stuck ? KEY_NOT_FORGOTTEN : undefined}
      deleted={deleted}
      doneRef={done}
      phone={phone}
      onDelete={() => {
        const forgotten = PgAssistant.disconnect();
        setStuck(!forgotten);
        // A key an older build kept and could not drop is not deleted: the
        // row says that instead
        setDeleted(forgotten);
        settingsTelemetry.track("settings_key_deleted", {});
      }}
    />
  );
};

export default AssistantKey;
