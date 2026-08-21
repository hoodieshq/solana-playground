import { useEffect, useState } from "react";
import styled, { css } from "styled-components";

import IdlActions from "./IdlActions";
import Test from "../../sidebar/test/Component/Test";
import { PgExplorer, PgProgramInfo, PgWeb3 } from "../../../utils";
import { PgDeployHistory } from "../state/deploy-history";
import type { DeployRecord } from "../state/deploy-history";

/** Point `PgProgramInfo`'s target at the given deployment. Selecting the
 * record that matches the project's own keypair clears the override so the
 * project's own key stays in charge; any other record wins by import.
 *
 * Deploy history is user-editable `localStorage`, so `programId` isn't
 * guaranteed to be a valid base58 public key — skip silently (and leave
 * `customPk` untouched) rather than throwing out of a `useEffect`. */
const target = (record: DeployRecord) => {
  const ownPk = PgProgramInfo.kp?.publicKey.toBase58();
  if (record.programId === ownPk) {
    PgProgramInfo.update({ customPk: null });
    return;
  }

  try {
    const customPk = new PgWeb3.PublicKey(record.programId);
    PgProgramInfo.update({ customPk });
  } catch (e) {
    console.error("Invalid deploy record program id", record.programId, e);
  }
};

const Interact = () => {
  const [history, setHistory] = useState<DeployRecord[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => {
      const list = PgDeployHistory.list(PgExplorer.currentWorkspaceName ?? "");
      setHistory(list);
      setSelected((s) => {
        const kept = s && list.some((r) => r.id === s) ? s : null;
        const next = kept ?? list[0]?.id ?? null;
        if (next && next !== s) {
          const record = list.find((r) => r.id === next);
          if (record) target(record);
        }
        return next;
      });
    };
    const a = PgDeployHistory.onDidChange(refresh);
    const b = PgExplorer.onDidSwitchWorkspace(refresh);
    return () => {
      a.dispose();
      b.dispose();
    };
  }, []);

  const pick = (id: string) => {
    setSelected(id);
    const record = history.find((r) => r.id === id);
    if (record) target(record);
  };

  return (
    <Surface>
      <Toolbar>
        <Label>
          Deployment
          <Select
            value={selected ?? ""}
            onChange={(ev) => pick(ev.target.value)}
            disabled={history.length === 0}
          >
            {history.length === 0 && <option value="">none yet</option>}
            {history.map((r, i) => (
              <option key={r.id} value={r.id}>
                {i === 0 ? "latest · " : ""}
                {r.cluster} · {r.programId.slice(0, 6)}&hellip; ·{" "}
                {new Date(r.at).toLocaleTimeString()}
              </option>
            ))}
          </Select>
        </Label>
        <IdlActions showUpload />
      </Toolbar>
      <Panel>
        <Test />
      </Panel>
    </Surface>
  );
};

export default Interact;

const Surface = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
`;

const Toolbar = styled.div`
  ${({ theme }) => css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 1rem;
    padding: 0.75rem 1.5rem;
    border-bottom: 1px solid ${theme.colors.default.border};
    font-family: ${theme.font.other.family};
  `}
`;

const Label = styled.label`
  ${({ theme }) => css`
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: ${theme.font.other.size.small};
    color: ${theme.colors.default.textSecondary};
  `}
`;

const Select = styled.select`
  ${({ theme }) => css`
    padding: 0.375rem 0.5rem;
    border: 1px solid ${theme.colors.default.border};
    border-radius: ${theme.default.borderRadius};
    background: ${theme.colors.default.bgSecondary};
    color: ${theme.colors.default.textPrimary};
    font-family: ${theme.font.code.family};
    font-size: ${theme.font.code.size.small};
    font-variant-numeric: tabular-nums;

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `}
`;

const Panel = styled.div`
  flex: 1;
  overflow-y: auto;
`;
