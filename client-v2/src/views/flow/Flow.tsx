import { useEffect, useState } from "react";
import styled, { css } from "styled-components";

import ConsoleDrawer from "./console/ConsoleDrawer";
import NewWorkspaceModal from "./gallery/NewWorkspaceModal";
import Header from "./header/Header";
import LeftPanel from "./left/LeftPanel";
import StageRouter from "./stages/StageRouter";
import { PgDeployHistory } from "./state/deploy-history";
import { INITIAL_FLOW_STATE, PgFlow } from "./state/stage";
import type { FlowState } from "./state/stage";
import Assistant from "../sidebar/assistant/Component";
import { PgAssistant } from "../sidebar/assistant/store";
import ModalBackdrop from "../../components/ModalBackdrop";
import Toast from "../../components/Toast";
import Wallet from "../../components/Wallet";
import { PgExplorer, PgView } from "../../utils";

/**
 * The Flow layout: header, left project/file tabs, the stage router in the
 * center with a collapsible console beneath it, and the assistant on the
 * right. Replaces the classic `Panels` layout unless `?classic` is present.
 */
const Flow = () => {
  const [state, setState] = useState<FlowState>(INITIAL_FLOW_STATE);
  const [assistantOpen, setAssistantOpen] = useState(true);

  useEffect(() => {
    const subs = [
      PgFlow.init(),
      PgDeployHistory.init(),
      PgFlow.onDidChange(setState),
      // So a "Fix with assistant" click while collapsed reopens the panel
      // and the user sees where the click went.
      PgAssistant.onDidRequestPrompt(() => setAssistantOpen(true)),
    ];
    return () => subs.forEach((s) => s.dispose());
  }, []);

  const openGallery = () => PgView.setModal(NewWorkspaceModal);

  // Settings is wired in Task 8; until then it no-ops.
  const openSettings = () => undefined;

  useEffect(() => {
    // `PgExplorer` initializes asynchronously (`routes/common.tsx`), so
    // `allWorkspaceNames` may still be `undefined` on the first render --
    // only decide once it has actually settled, otherwise every cold start
    // would flash the gallery before we know whether there are projects.
    const openIfEmpty = () => {
      if (PgExplorer.allWorkspaceNames?.length === 0) openGallery();
    };
    if (PgExplorer.allWorkspaceNames) openIfEmpty();
    return PgExplorer.onDidInit(openIfEmpty).dispose;
  }, []);

  return (
    <Wrapper>
      <Header onOpenGallery={openGallery} onOpenSettings={openSettings} />
      <Columns $assistant={assistantOpen}>
        <LeftPanel onNewProject={openGallery} />
        <Center>
          <Stage>
            <StageRouter stage={state.stage} />
          </Stage>
          <ConsoleDrawer />
        </Center>
        <Right $open={assistantOpen}>
          <Collapse
            type="button"
            aria-label={
              assistantOpen ? "Collapse assistant" : "Expand assistant"
            }
            onClick={() => setAssistantOpen((o) => !o)}
          >
            {assistantOpen ? "›" : "‹"}
          </Collapse>
          {assistantOpen && <Assistant />}
        </Right>
      </Columns>

      <Wallet />
      <PortalAbove id={PgView.ids.PORTAL_ABOVE} />
      <StyledModalBackdrop />
      <PortalBelow id={PgView.ids.PORTAL_BELOW}>
        <Toast />
      </PortalBelow>
    </Wrapper>
  );
};

export default Flow;

const Wrapper = styled.div`
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
`;

const Columns = styled.div<{ $assistant: boolean }>`
  flex: 1;
  display: grid;
  grid-template-columns:
    auto 1fr
    ${({ $assistant }) => ($assistant ? "21.75rem" : "1.5rem")};
  overflow: hidden;
`;

const Center = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
`;

// display: flex here matters: Primary's own wrapper sizes itself with
// flex: 1; min-height: 0 (from theme.views.main.primary.default), which
// only takes effect inside a flex container. Without this, the editor's
// height collapses to its content size and Monaco never gets a real box
// to paint into.
const Stage = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const Right = styled.aside<{ $open: boolean }>`
  ${({ theme }) => css`
    position: relative;
    width: 100%;
    border-left: 1px solid ${theme.colors.default.border};
    background: ${theme.colors.default.bgPrimary};
    display: flex;
    flex-direction: column;
    overflow: hidden;
  `}
`;

const Collapse = styled.button`
  ${({ theme }) => css`
    position: absolute;
    top: 0.5rem;
    left: 0;
    width: 1.5rem;
    height: 1.5rem;
    border: none;
    background: transparent;
    color: ${theme.colors.default.textSecondary};
    cursor: pointer;
    z-index: 1;
  `}
`;

const PortalAbove = styled.div`
  z-index: 4;
`;
const StyledModalBackdrop = styled(ModalBackdrop)`
  z-index: 3;
`;
const PortalBelow = styled.div`
  z-index: 2;
`;
