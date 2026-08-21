import { useEffect, useRef, useState } from "react";
import styled, { css } from "styled-components";

import ConsoleDrawer from "./console/ConsoleDrawer";
import NewWorkspaceModal from "./gallery/NewWorkspaceModal";
import Header from "./header/Header";
import LeftPanel from "./left/LeftPanel";
import GearSidebar from "./settings/GearSidebar";
import StageRouter from "./stages/StageRouter";
import { PgDeployHistory } from "./state/deploy-history";
import { INITIAL_FLOW_STATE, PgFlow } from "./state/stage";
import type { FlowState } from "./state/stage";
import { GAP, PANEL_RADIUS } from "./tokens";
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
  const [settingsOpen, setSettingsOpen] = useState(false);

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
  const openSettings = () => setSettingsOpen(true);

  // Whether the empty-workspace gallery has already been opened once for
  // this mount of `Flow`.
  const openedGalleryOnInit = useRef(false);

  useEffect(() => {
    // `PgExplorer` initializes asynchronously (`routes/common.tsx`), so
    // `allWorkspaceNames` may still be `undefined` on the first render --
    // only decide once it has actually settled, otherwise every cold start
    // would flash the gallery before we know whether there are projects.
    //
    // `PgExplorer.init()` reruns on every route navigation, so `onDidInit`
    // fires more than once for the lifetime of `Flow`. Open the gallery at
    // most once: dispose the subscription right after it fires so later
    // navigations (e.g. into and out of a tutorial) never stack a second
    // modal on top of one the user already interacted with.
    const openIfEmpty = () => {
      if (openedGalleryOnInit.current) return;
      if (PgExplorer.allWorkspaceNames?.length === 0) {
        openedGalleryOnInit.current = true;
        sub.dispose();
        openGallery();
      }
    };
    const sub = PgExplorer.onDidInit(openIfEmpty);
    if (PgExplorer.allWorkspaceNames) openIfEmpty();
    return sub.dispose;
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
            <ChevronGlyph
              viewBox="0 0 8 10"
              width="6"
              height="8"
              $open={assistantOpen}
              aria-hidden
            >
              <path
                d="M2 1L6 5L2 9"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </ChevronGlyph>
          </Collapse>
          {assistantOpen && <Assistant />}
        </Right>
      </Columns>

      <GearSidebar open={settingsOpen} onClose={() => setSettingsOpen(false)} />

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
  ${({ theme }) => css`
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
    background: ${theme.colors.default.bgPrimary};
  `}
`;

const Columns = styled.div<{ $assistant: boolean }>`
  flex: 1;
  display: grid;
  grid-template-columns:
    auto 1fr
    ${({ $assistant }) => ($assistant ? "21.75rem" : "1.5rem")};
  gap: ${GAP};
  padding: 0 ${GAP} ${GAP};
  overflow: hidden;
`;

// The floating center panel: a single bordered/rounded surface holding both
// the stage and the console drawer, so the drawer's status line reads as
// the bottom edge of one panel rather than a separate box (see the board).
const Center = styled.div`
  ${({ theme }) => css`
    display: flex;
    flex-direction: column;
    min-width: 0;
    background: ${theme.colors.default.bgSecondary};
    border: 1px solid ${theme.colors.default.border};
    border-radius: ${PANEL_RADIUS};
    overflow: hidden;
  `}
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
    border: 1px solid ${theme.colors.default.border};
    border-radius: ${PANEL_RADIUS};
    background: ${theme.colors.default.bgSecondary};
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
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    color: ${theme.colors.default.textSecondary};
    cursor: pointer;
    z-index: 1;

    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
      outline-offset: 2px;
    }
  `}
`;

const ChevronGlyph = styled.svg<{ $open: boolean }>`
  flex-shrink: 0;
  transform: rotate(${({ $open }) => ($open ? "0deg" : "180deg")});
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
