import { ChangeEvent, FC, useState } from "react";
import styled, { css } from "styled-components";

import Button from "../../../components/Button";
import { useRenderOnChange } from "../../../hooks";
import { PgProgramInfo } from "../../../utils";

interface IdlActionsProps {
  showGenerate?: boolean;
  showUpload?: boolean;
}

/**
 * "Generate IDL" is honest about what it does: the build already produced
 * the IDL, this only surfaces and downloads it.
 */
const IdlActions: FC<IdlActionsProps> = ({ showGenerate, showUpload }) => {
  const idl = useRenderOnChange(PgProgramInfo.onDidChangeIdl);
  const [note, setNote] = useState<{ text: string; error?: boolean } | null>(
    null
  );

  const handleUpload = async (ev: ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      // The one field every consumer walks; a JSON file without it would
      // land in Interact as "corrupted IDL" -- refuse it at the door instead
      if (!Array.isArray(parsed.instructions)) {
        throw new Error("missing `instructions`");
      }
      PgProgramInfo.update({ idl: parsed });
      setNote({ text: `Using ${parsed.name ?? file.name}` });
    } catch (e) {
      console.error("Invalid IDL file", e);
      setNote({ text: "Not an Anchor IDL JSON file", error: true });
    }
  };

  return (
    <Row>
      {showGenerate && idl && (
        <Button.Export href={idl} fileName="idl.json">
          Generate IDL
        </Button.Export>
      )}
      {showGenerate && !idl && (
        <Button disabled title="Build successfully first">
          Generate IDL
        </Button>
      )}
      {showUpload && (
        <>
          <Button.Import accept=".json" onImport={handleUpload}>
            Upload IDL
          </Button.Import>
          {note && <Note $error={note.error}>{note.text}</Note>}
        </>
      )}
    </Row>
  );
};

export default IdlActions;

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Note = styled.span<{ $error?: boolean }>`
  ${({ theme, $error }) => css`
    font-size: ${theme.font.code.size.small};
    color: ${$error
      ? theme.colors.state.error.color
      : theme.colors.default.textSecondary};
  `}
`;
