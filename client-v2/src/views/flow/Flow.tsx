import { useEffect, useRef, useState } from "react";
import styled, { css } from "styled-components";

import Chevron from "./Chevron";
import ConsoleDrawer from "./console/ConsoleDrawer";
import NewWorkspaceModal from "./gallery/NewWorkspaceModal";
import Header from "./header/Header";
import Stepper from "./header/Stepper";
import NavSidebar from "./nav/NavSidebar";
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
    const subs = [
      PgFlow.init(),
      PgLesson.init(),
      PgDeployHistory.init(),
      PgFlow.onDidChange(setState),
      PgLesson.onDidChange(setLesson),
      // So a "Fix with assistant" click while collapsed reopens the panel
      // and the user sees where the click went.
      PgAssistant.onDidRequestPrompt(() => setAssistantOpen(true)),
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

  // Whether the empty-workspace gallery has already been opened once for
  // this mount of `Flow`.
  const openedGalleryOnInit = useRef(false);
  /** Watches for the account's projects to land under an auto-opened gallery */
  const imported = useRef<Disposable | null>(null);

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
        // "You have no projects" is a guess until the account has answered.
        // A browser signed in to an account with work on it is empty only for
        // as long as the sync takes, and the gallery was landing on top of
        // projects that arrived a moment later. Waiting for the sync instead
        // would delay the gallery for everyone who genuinely is new, so it
        // opens on time and stands down if it turns out to be wrong.
        imported.current = PgExplorer.onDidCreateWorkspace(() => {
          if (PgExplorer.allWorkspaceNames?.length) {
            imported.current?.dispose();
            PgView.closeModal();
          }
        });
      }
    };
    const sub = PgExplorer.onDidInit(openIfEmpty);
    if (PgExplorer.allWorkspaceNames) openIfEmpty();
    return () => {
      sub.dispose();
      imported.current?.dispose();
    };
  }, []);

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
      <Header
        onOpenGallery={openGallery}
        onToggleSettings={toggleSettings}
        settingsOpen={settingsOpen}
      />
      <Columns $assistant={assistantOpen}>
        <NavSidebar
          onOpenGallery={openGallery}
          onOpenSettings={() => toggleSettings()}
          onToggleAssistant={() => setAssistantOpen((o) => !o)}
          assistantOpen={assistantOpen}
        />
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
      </Columns>

      {/* The stages read as the floor of the work surface rather than a
          control in the title bar: they are where you are in the job, not a
          place to navigate from, and at the bottom they sit under the thing
          they describe. */}
      <StageRail>
        <Stepper state={state} onSelect={PgFlow.setStage} target={target} />
      </StageRail>

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
    background: ${theme.colors.default.bgPrimary};
  `}
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
const Columns = styled.div<{ $assistant: boolean }>`
  flex: 1;
  display: grid;
  grid-template-columns:
    auto
    ${({ $assistant }) => ($assistant ? "23rem" : "1.5rem")}
    1fr;
  gap: ${GAP};
  padding: 0 ${GAP} 0;
  overflow: hidden;
  /* Without this the grid refuses to shrink below its content and pushes the
     stage rail off the bottom of the window. */
  min-height: 0;
`;

const Work = styled.section`
  ${({ theme }) => css`
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
