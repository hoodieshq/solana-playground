import type { KeyHold } from "../../../views/sidebar/assistant/model/types";
import { Button } from "@/shared/ui/button";
import BaseSettingRow from "./BaseSettingRow";

/** The user's own key, as the row reads it (`KeyHold`) */
export type AssistantKeyState = KeyHold;

interface BaseAssistantKeyProps {
  state: AssistantKeyState;
  /**
   * The last delete left a key an older build kept in this tab's storage:
   * the row says so, since the panel's notice sits under Settings
   */
  stuck: boolean;
  onDelete: () => void;
  phone: boolean;
}

const DESCRIPTIONS: Record<AssistantKeyState, string> = {
  none: "No key entered. The default model needs none.",
  ready:
    "Held in this tab's memory only. A reload asks for it again. Deleting it also clears the conversation on screen.",
  busy: "In use by the reply being written. Delete it once that ends.",
};

/** Shown in place of the description when the last delete left a key behind */
export const KEY_LEFT_IN_STORAGE =
  "Your key could not be removed from this tab's storage. Close this tab to remove it.";

/** The row that deletes the user's own model key */
const BaseAssistantKey = ({
  state,
  stuck,
  onDelete,
  phone,
}: BaseAssistantKeyProps) => (
  <BaseSettingRow
    name="Your model key"
    description={stuck ? KEY_LEFT_IN_STORAGE : DESCRIPTIONS[state]}
    phone={phone}
    control={
      <Button
        variant="destructive"
        className={phone ? "h-12 w-full rounded-xl" : "w-full"}
        disabled={state !== "ready"}
        onClick={onDelete}
      >
        Delete my key
      </Button>
    }
  />
);

export default BaseAssistantKey;
