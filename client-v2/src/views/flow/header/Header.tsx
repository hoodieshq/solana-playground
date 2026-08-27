import type { FC } from "react";
import { useEffect, useState } from "react";
import styled, { css } from "styled-components";

import ProjectSwitcher from "./ProjectSwitcher";
import StatusChips from "./StatusChips";
import Stepper from "./Stepper";
import { INITIAL_LESSON_STATE, PgLesson } from "../lessons";
import type { LessonState } from "../lessons";
import { currentStep } from "../lessons/progress";
import type { SettingsFocus } from "../settings/GearSidebar";
import { INITIAL_FLOW_STATE, PgFlow, STAGES } from "../state/stage";
import type { FlowState } from "../state/stage";
import { GRADIENT } from "../tokens";
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
  const [state, setState] = useState<FlowState>(INITIAL_FLOW_STATE);
  useEffect(() => PgFlow.onDidChange(setState).dispose, []);

  const [lesson, setLesson] = useState<LessonState>(INITIAL_LESSON_STATE);
  useEffect(() => PgLesson.onDidChange(setLesson).dispose, []);

  const target = lesson.path
    ? currentStep(lesson.path, lesson.progress)?.target ?? null
    : null;

  // Cmd/Ctrl+1..4 jump to a stage. `PgKeybind` folds `metaKey` into CTRL, so
  // one binding covers both platforms.
  useKeybind(
    STAGES.map((stage, i) => ({
      keybind: `Ctrl+${i + 1}`,
      handle: () => PgFlow.setStage(stage),
    })),
    []
  );

  return (
    <Bar>
      <Zone>
        <Logomark aria-hidden="true" />
        <ProjectSwitcher onOpenGallery={onOpenGallery} />
      </Zone>
      <Zone $center>
        <Stepper state={state} onSelect={PgFlow.setStage} target={target} />
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
