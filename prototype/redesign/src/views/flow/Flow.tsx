import { useEffect, useRef, useState } from "react";
import styled, { css } from "styled-components";

import Chevron from "./Chevron";
import ConsoleDrawer from "./console/ConsoleDrawer";
import NewWorkspaceModal from "./gallery/NewWorkspaceModal";
import StatusChips from "./header/StatusChips";
import Stepper from "./header/Stepper";
import NavSidebar from "./nav/NavSidebar";
import ZeroState from "./zero/ZeroState";
import LeftPanel from "./left/LeftPanel";
import ObjectiveBand from "./lessons/ObjectiveBand";
import Reader from "./lessons/Reader";
import { currentStep } from "./lessons/progress";
// The barrel registers every lesson path as a side effect, so importing
// it here is also what populates the registry for the whole app.
import { INITIAL_LESSON_STATE, PgLesson } from "./lessons";
import type { LessonState } from "./lessons";
import GearSidebar from "./settings/GearSidebar";
import type { SettingsFocus } from "./settings/GearSidebar";
import StageRouter from "./stages/StageRouter";
import { PgDeployHistory } from "./state/deploy-history";
import { INITIAL_FLOW_STATE, PgFlow } from "./state/stage";
import type { FlowState } from "./state/stage";
import { GAP } from "./tokens";
import Assistant from "../sidebar/assistant/Component";
import { PgAssistant } from "../sidebar/assistant/store";
import ModalBackdrop from "../../components/ModalBackdrop";
import Toast from "../../components/Toast";
import Wallet from "../../components/Wallet";
import { useKeybind } from "../../hooks";
import { PgExplorer, PgView } from "../../utils";
import type { Disposable } from "../../utils/types";

/**
 * The Flow layout: header, left project/file tabs, the stage router in the
 * center with a collapsible console beneath it, and the assistant on the
 * right. Replaces the classic `Panels` layout unless `?classic` is present.
 */
const Flow = () => {
  const [state, setState] = useState<FlowState>(INITIAL_FLOW_STATE);
  const [surface, setSurface] = useState<"code" | "files">("code");
  // With no project open there is nothing for the editor, the file tree or the
  // stage rail to be about, so the window carries the zero state instead of
  // three empty panels and a disabled rail.
  const [hasProject, setHasProject] = useState(
    () => !!PgExplorer.currentWorkspaceName
  );
  const [lesson, setLesson] = useState<LessonState>(INITIAL_LESSON_STATE);
  const [reading, setReading] = useState(false);
  // Session-only, like `leftOpen` and `assistantOpen` above.
  // TODO: persist to `localStorage` so a width dragged to read a long path
  // survives a reload.
  const [assistantOpen, setAssistantOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Lives here, not in `LeftPanel`: the open and collapsed panels are separate
  // branches of the tree below, so toggling unmounts one and mounts the other
  // and anything `LeftPanel` held goes with it.
  const [pendingCreate, setPendingCreate] = useState(false);
  const [settingsFocus, setSettingsFocus] = useState<SettingsFocus>("panel");

  useKeybind("Ctrl+B", () =>
    setSurface((s) => (s === "files" ? "code" : "files"))
  );

  useEffect(() => {
    // The route initialises the explorer inside the main view's mount, and the
    // zero state does not mount that view — so on a browser with no project,
    // nothing had initialised it and creating the first one threw "Workspace
    // not found". Calling it here covers both layouts; it returns early when
    // the work has already been done.
    PgExplorer.init().catch(() => {});

    const subs = [
      PgFlow.init(),
      PgLesson.init(),
      PgDeployHistory.init(),
      PgFlow.onDidChange(setState),
      PgLesson.onDidChange(setLesson),
      // So a "Fix with assistant" click while collapsed reopens the panel
      // and the user sees where the click went.
      PgAssistant.onDidRequestPrompt(() => setAssistantOpen(true)),
      PgExplorer.onDidInit(() =>
        setHasProject(!!PgExplorer.currentWorkspaceName)
      ),
      PgExplorer.onDidSwitchWorkspace(() =>
        setHasProject(!!PgExplorer.currentWorkspaceName)
      ),
      // Creating the first project is the moment the zero state has to stand
      // down, and creating is not switching — without this the layout stayed
      // on the zero state with a project sitting behind it.
      PgExplorer.onDidCreateWorkspace(() =>
        setHasProject(!!PgExplorer.currentWorkspaceName)
      ),
    ];
    return () => subs.forEach((s) => s.dispose());
  }, []);

  // Takes over the browser's reload shortcut, same as Ctrl+J does for the
  // console drawer
  useKeybind("Ctrl+R", () => setAssistantOpen((o) => !o));

  const openGallery = () => PgView.setModal(NewWorkspaceModal);
  // Toggles rather than opens: the header controls are the only way in, so a
  // second click on one has to be the way out.
  const toggleSettings = (focus: SettingsFocus = "panel") => {
    setSettingsFocus(focus);
    setSettingsOpen((open) => !open);
  };

  /* The gallery used to open itself as a modal whenever the browser had no
     projects. It is the zero state's own page now — the scratch row, the
     tutorials and the programs all sit under the prompt — so a window opening
     over it would be the same content twice, one of them covering the other. */

  const readingStep = lesson.path
    ? currentStep(lesson.path, lesson.progress)
    : null;
  // What the current lesson step is pointing at, if any — the stepper marks it
  const target = readingStep?.target ?? null;

  // A learner who fixes the code while the page is open should come back
  // to the editor, not to the next step's prose.
  useEffect(() => {
    setReading(false);
  }, [readingStep?.id]);

  return (
    <Wrapper>
      <Window>
      <Columns $assistant={assistantOpen} $work={hasProject}>
        <NavSlot>
          <NavSidebar
            onOpenGallery={openGallery}
            onOpenSettings={() => toggleSettings()}
            onToggleAssistant={() => setAssistantOpen((o) => !o)}
            assistantOpen={assistantOpen}
            showBrand={hasProject}
            status={
              <StatusChips
                onToggleSettings={toggleSettings}
                settingsOpen={settingsOpen}
              />
            }
          />
        </NavSlot>
        {hasProject ? (
          <>
          <Conversation $open={assistantOpen}>
            <Collapse
              type="button"
              aria-label={
                assistantOpen ? "Collapse assistant" : "Expand assistant"
              }
              onClick={() => setAssistantOpen((o) => !o)}
            >
              <Chevron $flip={!assistantOpen} />
            </Collapse>
            {assistantOpen && <Assistant />}
          </Conversation>
          <Work>
            <WorkTabs role="tablist" aria-label="Work surface">
              <WorkTab
                type="button"
                role="tab"
                id="work-tab-code"
                aria-selected={surface === "code"}
                aria-controls="work-panel"
                $current={surface === "code"}
                onClick={() => setSurface("code")}
              >
                Code
              </WorkTab>
              <WorkTab
                type="button"
                role="tab"
                id="work-tab-files"
                aria-selected={surface === "files"}
                aria-controls="work-panel"
                $current={surface === "files"}
                onClick={() => setSurface("files")}
              >
                Files
              </WorkTab>
            </WorkTabs>

            <WorkBody
              id="work-panel"
              role="tabpanel"
              aria-labelledby={`work-tab-${surface}`}
            >
              {/* Both stay mounted: the editor holds Monaco and the file tree
                  holds scroll and selection, and tearing either down on a tab
                  click loses work the user can see. Hidden, not unmounted. */}
              <Surface $shown={surface === "files"}>
                <LeftPanel
                  collapsed={false}
                  onToggle={() => setSurface("code")}
                  pendingCreate={pendingCreate}
                  onPendingCreateChange={setPendingCreate}
                />
              </Surface>
              <Surface $shown={surface === "code"}>
                <ObjectiveBand state={lesson} onRead={() => setReading(true)} />
                <Stage>
                  <StageRouter stage={state.stage} />
                  {reading && readingStep && (
                    <Reader
                      key={readingStep.id}
                      step={readingStep}
                      onClose={() => setReading(false)}
                    />
                  )}
                </Stage>
                <ConsoleDrawer />
              </Surface>
            </WorkBody>
          </Work>
          </>
        ) : (
          <ZeroState onAskAssistant={() => setAssistantOpen(true)} />
        )}
      </Columns>

      {/* The stages read as the floor of the work surface rather than a
          control in the title bar: they are where you are in the job, not a
          place to navigate from, and at the bottom they sit under the thing
          they describe. */}
      {hasProject && (
        <StageRail>
          <Stepper state={state} onSelect={PgFlow.setStage} target={target} />
        </StageRail>
      )}
      </Window>

      <GearSidebar
        open={settingsOpen}
        focus={settingsFocus}
        onClose={() => setSettingsOpen(false)}
      />

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
    padding: 0.75rem;
    background: ${theme.colors.default.bgPrimary};
  `}
`;

/* The product sits in a rounded window inset from the page, the way the
   reference does: a darker ground around it, one hairline, 16px corners. It is
   the single strongest signature of that screen and it costs a margin. */
const Window = styled.div`
  ${({ theme }) => css`
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    border: 1px solid ${theme.colors.default.border};
    border-radius: 16px;
    background: ${theme.colors.default.bgSecondary};
    overflow: hidden;
  `}
`;

const NavSlot = styled.div`
  grid-area: nav;
  display: flex;
  min-height: 0;
`;

// Open, the left track is `auto` so the `Resizable` around `LeftPanel` sets
// its own width; collapsed, the track is fixed and there is no `Resizable`
// Four tracks, left to right: where you can go, what you are saying, what is
// in the project, and the thing you are working on. The conversation sits
// beside the work rather than across the room from it — which is what v0,
// Base44 and Claude all do, and what the layout frame in the Figma asks for.
// Three tracks, left to right: where you can go, what you are saying, and the
// thing you are working on. The file tree used to hold a column of its own
// beside the editor; it is a tab on the work surface now, because two narrow
// columns for one job left the editor — the reason the product exists — as the
// thinnest thing on screen.
const Columns = styled.div<{ $assistant: boolean; $work: boolean }>`
  flex: 1;
  display: grid;
  ${({ $work, $assistant }) =>
    $work
      ? css`
          grid-template-areas: "nav conversation work";
          grid-template-columns: auto ${$assistant ? "23rem" : "1.5rem"} 1fr;
          gap: ${GAP};
          padding: ${GAP} ${GAP} 0;
        `
      : css`
          grid-template-areas:
            "top top"
            "nav body";
          grid-template-rows: auto 1fr;
          grid-template-columns: auto 1fr;
        `}
  overflow: hidden;
  /* Without these the grid refuses to shrink below its content and pushes the
     stage rail off the bottom of the window. The row needs it, and so does
     every track in it: a grid item's default min-height is its content, so the
     sidebar's own list was setting the floor for the whole layout. */
  min-height: 0;

  & > * {
    min-height: 0;
  }
`;

const Work = styled.section`
  ${({ theme }) => css`
    grid-area: work;
    display: flex;
    flex-direction: column;
    min-width: 0;
    background: ${theme.colors.default.bgSecondary};
    border: 1px solid ${theme.colors.default.border};
    border-radius: ${theme.default.borderRadius};
    overflow: hidden;
  `}
`;

const WorkTabs = styled.div`
  ${({ theme }) => css`
    display: flex;
    align-items: center;
    gap: 0.125rem;
    padding: 0.5rem 0.5rem 0.375rem;
    border-bottom: 1px solid ${theme.colors.default.border};
  `}
`;

const WorkTab = styled.button<{ $current?: boolean }>`
  ${({ theme, $current }) => css`
    padding: 0.375rem 0.75rem;
    border: none;
    border-radius: 8px;
    background: ${$current ? theme.colors.state.hover.bg : "transparent"};
    color: ${$current
      ? theme.colors.default.textPrimary
      : theme.colors.default.textSecondary};
    font-family: inherit;
    font-size: ${theme.font.other.size.small};
    font-weight: ${$current ? 500 : 400};
    cursor: pointer;

    &:hover {
      color: ${theme.colors.default.textPrimary};
    }

    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
      outline-offset: -2px;
    }
  `}
`;

const WorkBody = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const Surface = styled.div<{ $shown: boolean }>`
  ${({ $shown }) => css`
    display: ${$shown ? "flex" : "none"};
    flex: 1;
    min-height: 0;
    flex-direction: column;
    overflow: hidden;
  `}
`;

// display: flex matters here: Primary sizes itself with flex: 1; min-height: 0
// from the theme, which only takes effect inside a flex container. Without it
// the editor collapses to its content and Monaco never gets a box to paint in.
const Stage = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  /* The lesson reader covers the stage, not the whole layout */
  position: relative;
`;

const Conversation = styled.aside<{ $open: boolean }>`
  ${({ theme, $open }) => css`
    grid-area: conversation;
    position: relative;
    --flow-handle-inset: ${$open ? "1rem" : "0px"};
    width: 100%;
    border: 1px solid ${theme.colors.default.border};
    border-radius: ${theme.default.borderRadius};
    background: ${theme.colors.default.bgSecondary};
    display: flex;
    flex-direction: column;
    overflow: hidden;
  `}
`;

const Collapse = styled.button`
  ${({ theme }) => css`
    /* The handle owns the panel's left gutter; the assistant header reads
       --flow-handle-inset (set on Right) and starts after it. */
    position: absolute;
    /* Centre on the assistant header row (its eyebrow and chips sit
       ~20px below the panel top): 4px offset + 32px tall = 20px centre. */
    top: 0.25rem;
    left: 0;
    width: 1.5rem;
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

// Full width under the columns, so it reads as the floor of the window rather
// than a strip belonging to one panel.
const StageRail = styled.div`
  flex-shrink: 0;
  padding: ${GAP};
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
