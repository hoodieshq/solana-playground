import { ChangeEvent, FC } from "react";
import styled from "styled-components";

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

  const handleUpload = async (ev: ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    try {
      PgProgramInfo.update({ idl: JSON.parse(await file.text()) });
    } catch (e) {
      console.error("Invalid IDL file", e);
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
        <Button.Import accept=".json" onImport={handleUpload} showImportText>
          Upload IDL
        </Button.Import>
      )}
    </Row>
  );
};

export default IdlActions;

const Row = styled.div`
  display: flex;
  gap: 0.5rem;
`;
