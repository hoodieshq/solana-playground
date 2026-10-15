import { ComposerModel } from "@/shared/ui/composer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import type { ModelOption, ModelShown } from "../model/choice";

/** Whether an option is the one the composer shows: the default by its provider, a keyed one by provider and label */
const isShown = (model: ModelShown, option: ModelOption) => {
  if (model.kind === "default") return option.provider === "default";
  if (model.kind === "keyed") {
    return option.provider === model.provider && option.label === model.label;
  }
  return false;
};

/** The composer's model button: opens the model menu, or Connect a model when there is nothing to send to */
export function BaseModelMenu({
  model,
  options,
  onPick,
  onConnect,
  disabled,
}: {
  model: ModelShown;
  options: ModelOption[];
  onPick(o: ModelOption): void;
  onConnect(): void;
  disabled: boolean;
}) {
  if (model.kind === "none") {
    return (
      <ComposerModel onClick={onConnect} disabled={disabled}>
        Connect a model
      </ComposerModel>
    );
  }
  const current = options.findIndex((option) => isShown(model, option));
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <ComposerModel disabled={disabled}>{model.label}</ComposerModel>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>Model</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={current < 0 ? "" : String(current)}
          onValueChange={(index) => {
            const picked = options[Number(index)];
            if (picked) onPick(picked);
          }}
        >
          {options.map((option, index) => (
            <DropdownMenuRadioItem
              key={`${option.provider}:${option.model ?? ""}`}
              value={String(index)}
            >
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onConnect}>
          Connect with a key…
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
