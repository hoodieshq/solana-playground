import { Button } from "@/shared/ui/button";
import BaseSettingRow from "./BaseSettingRow";

/**
 * The user's own key, as the row reads it: `none` while no backend holding
 * the user's key is connected, `busy` while a turn is using it
 */
export type AssistantKeyState = "none" | "ready" | "busy";

interface BaseAssistantKeyProps {
  state: AssistantKeyState;
  onDelete: () => void;
  phone: boolean;
}

const DESCRIPTIONS: Record<AssistantKeyState, string> = {
  none: "No key entered. The default model needs none.",
  ready: "Held in this tab's memory only. A reload asks for it again.",
  busy: "In use by the reply being written. Delete it once that ends.",
};

/** The row that deletes the user's own model key */
const BaseAssistantKey = ({
  state,
  onDelete,
  phone,
}: BaseAssistantKeyProps) => (
  <BaseSettingRow
    name="Your model key"
    description={DESCRIPTIONS[state]}
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
