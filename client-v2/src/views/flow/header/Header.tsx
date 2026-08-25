import type { FC } from "react";
import { useEffect, useState } from "react";
import styled, { css } from "styled-components";

import ProjectSwitcher from "./ProjectSwitcher";
import StatusChips from "./StatusChips";
import Stepper from "./Stepper";
import { INITIAL_FLOW_STATE, PgFlow } from "../state/stage";
import type { FlowState } from "../state/stage";
import { GRADIENT } from "../tokens";

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
        <Logomark aria-hidden="true" />
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

// Transparent on the black page ground -- the floating panels below carry
// their own edges, so the header needs none of its own.
const Bar = styled.header`
  ${({ theme }) => css`
    height: 3.5rem;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    padding: 0 0.75rem;
    background: transparent;
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

const Logomark = styled.div`
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border-radius: 6px;
  background: ${GRADIENT};
`;
