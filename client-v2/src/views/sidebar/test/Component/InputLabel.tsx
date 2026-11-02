import { FC } from "react";

import { Tag } from "@/shared/ui/tag";

interface InputLabelProps {
  name: string;
  type: string;
  isMut?: boolean;
  isSigner?: boolean;
  /**
   * `form` (a seed in From seed): the type, `mut` and `signer` as tags.
   * `page` (the instruction forms, phone and desk): the type moves inside
   * the field, and the account's roles read "Signs" and "Writable" in
   * neutral.
   */
  variant?: "form" | "page";
}

const PLAIN_TAG = "tracking-normal normal-case";

/** An input's name in mono, then its type and modifiers as tags */
const InputLabel: FC<React.PropsWithChildren<InputLabelProps>> = ({
  name,
  type,
  isMut,
  isSigner,
  variant = "form",
}) => {
  if (variant === "page") {
    return (
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <span className="font-mono text-caption text-foreground">{name}</span>
        {isSigner && <Tag className={PLAIN_TAG}>Signs</Tag>}
        {isMut && <Tag className={PLAIN_TAG}>Writable</Tag>}
      </div>
    );
  }
  return (
    <div className="mb-1 flex flex-wrap items-center gap-2">
      <span className="font-mono text-xs text-muted-foreground">{name}</span>
      {type && (
        <Tag className="font-mono tracking-normal normal-case">{type}</Tag>
      )}
      {isMut && <Tag variant="warning">mut</Tag>}
      {isSigner && <Tag variant="success">signer</Tag>}
    </div>
  );
};

export default InputLabel;
