import type { FC } from "react";
import { useEffect, useState } from "react";
import styled, { css } from "styled-components";

import ProjectSwitcher from "./ProjectSwitcher";
import StatusChips from "./StatusChips";
import Stepper from "./Stepper";
import { INITIAL_FLOW_STATE, PgFlow } from "../state/stage";
import type { FlowState } from "../state/stage";

interface HeaderProps {
  onOpenGallery: () => void;
  onOpenSettings: () => void;
}

/**
 * The Flow layout's top bar: project switcher on the left, the dev-loop
 * stepper centered, cluster/wallet/settings on the right.
 */
const Header: FC<HeaderProps> = ({ onOpenGallery, onOpenSettings }) => {
  const [state, setState] = useState<FlowState>(INITIAL_FLOW_STATE);
  useEffect(() => PgFlow.onDidChange(setState).dispose, []);

  return (
    <Bar>
      <Zone>
        <Mark viewBox="0 0 16 16" width="16" height="16" aria-hidden>
          <circle cx="8" cy="8" r="6.5" fill="none" strokeWidth="1.5" />
          <circle cx="8" cy="8" r="2.25" />
        </Mark>
        <ProjectSwitcher onOpenGallery={onOpenGallery} />
      </Zone>
      <Zone $center>
        <Stepper state={state} onSelect={PgFlow.setStage} />
      </Zone>
      <Zone $end>
        <StatusChips onOpenSettings={onOpenSettings} />
      </Zone>
    </Bar>
  );
};

export default Header;

const Bar = styled.header`
  ${({ theme }) => css`
    height: 3.5rem;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    padding: 0 0.75rem;
    background: ${theme.colors.default.bgPrimary};
    border-bottom: 1px solid ${theme.colors.default.border};
    font-family: ${theme.font.other.family};
  `}
`;

const Zone = styled.div<{ $center?: boolean; $end?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  justify-content: ${({ $center, $end }) =>
    $center ? "center" : $end ? "flex-end" : "flex-start"};
`;

const Mark = styled.svg`
  ${({ theme }) => css`
    flex-shrink: 0;
    stroke: ${theme.colors.default.primary};
    fill: ${theme.colors.default.primary};
  `}
`;
