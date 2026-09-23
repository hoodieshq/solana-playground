import type { FC } from "react";
import styled, { css } from "styled-components";

import { PgFlow, STAGES } from "../state/stage";

import ProjectSwitcher from "./ProjectSwitcher";
import StatusChips from "./StatusChips";
import type { SettingsFocus } from "../settings/GearSidebar";
import { useKeybind } from "../../../hooks";

interface HeaderProps {
  onOpenGallery: () => void;
  onToggleSettings: (focus?: SettingsFocus) => void;
  settingsOpen: boolean;
}

/**
 * The Flow layout's top bar: project switcher on the left, the dev-loop
 * stepper centered, cluster/wallet/settings on the right.
 */
const Header: FC<HeaderProps> = ({
  onOpenGallery,
  onToggleSettings,
  settingsOpen,
}) => {
  // Cmd/Ctrl+1..4 jump to a stage. `PgKeybind` folds `metaKey` into CTRL, so
  // one binding covers both platforms.
  useKeybind(
    STAGES.map((stage, i) => ({
      keybind: `Ctrl+${i + 1}`,
      handle: () => {
        PgFlow.setStage(stage);
        // Focus follows the shortcut, so the keyboard user lands on the tab
        // they just selected rather than being left wherever they were
        document.getElementById(`flow-stage-tab-${stage}`)?.focus();
      },
    })),
    []
  );

  return (
    <Bar>
      <Zone>
        <ProjectSwitcher onOpenGallery={onOpenGallery} />
      </Zone>
      <Zone $end>
        <StatusChips
          onToggleSettings={onToggleSettings}
          settingsOpen={settingsOpen}
        />
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
    /* Two zones now the stepper has moved to the rail at the bottom:
       where you are on the left, what the session is on the right. */
    grid-template-columns: 1fr auto;
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

