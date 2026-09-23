import { useCallback, useEffect, useState } from "react";
import styled, { css } from "styled-components";

import ConsoleDrawer from "./console/ConsoleDrawer";
import { gradientStroke } from "./components/gradient";

import NewWorkspaceModal from "./gallery/NewWorkspaceModal";
import StatusChips from "./header/StatusChips";
import Stepper from "./header/Stepper";
import NavSidebar from "./nav/NavSidebar";
import ZeroState from "./zero/ZeroState";
import type { ZeroSection } from "./zero/ZeroState";
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
import { HEAD_HEIGHT, HEAD_INSET, SUBHEAD_HEIGHT } from "./tokens";
import { PgDeployHistory } from "./state/deploy-history";
import { INITIAL_FLOW_STATE, PgFlow } from "./state/stage";
import type { FlowState } from "./state/stage";
import Assistant from "../sidebar/assistant/Component";
import { PgAssistant } from "../sidebar/assistant/store";
import ModalBackdrop from "../../components/ModalBackdrop";
import Resizable from "../../components/Resizable";
import Toast from "../../components/Toast";
import Wallet from "../../components/Wallet";
import { useKeybind } from "../../hooks";
import { PgExplorer, PgView } from "../../utils";

/**
 * The Flow layout.
 *
 * Two views, one product. Home is the start screen — the composer, the ways
 * in, the gallery. Project is the work — the assistant beside the editor. Both
 * are always reachable: Home from the sidebar or the mark, the project from
 * its row. Home used to be "the state with no project", which meant the only
 * way back to it was to delete your work. It is a view now, not a condition.
 *
 * The chrome is the same in both: a sidebar of destinations on the left, and
 * a bar across the top with the mark, a group of pill switches, and search.
 * On Home the switches are Start · Tutorials · Programs; in a project they are
 * Write · Build · Deploy · Interact. Same control, different words.
 */

type View = "home" | "project";

/* Persisted layout preferences, per browser */
const KEYS = {
  sidebar: "flow-sidebar-open",
  assistant: "flow-assistant-open",
  assistantWidth: "flow-assistant-width",
};
const read = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {}
};

const ASSISTANT_MIN = 288;
const ASSISTANT_MAX = 640;
const ASSISTANT_DEFAULT = 368;

const Flow = () => {
  const [state, setState] = useState<FlowState>(INITIAL_FLOW_STATE);
  const [view, setView] = useState<View>(() =>
    PgExplorer.currentWorkspaceName ? "project" : "home"
  );
  const [surface, setSurface] = useState<"code" | "files">("code");
  const [lesson, setLesson] = useState<LessonState>(INITIAL_LESSON_STATE);
  const [reading, setReading] = useState(false);

  const [sidebarOpen, setSidebarOpen] = useState(
    () => read(KEYS.sidebar) !== "0"
  );
  const [assistantOpen, setAssistantOpen] = useState(
    () => read(KEYS.assistant) !== "0"
  );
  const [assistantWidth, setAssistantWidth] = useState(() => {
    const n = Number(read(KEYS.assistantWidth));
    return n >= ASSISTANT_MIN && n <= ASSISTANT_MAX ? n : ASSISTANT_DEFAULT;
  });

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsFocus, setSettingsFocus] = useState<SettingsFocus>("panel");
  /* Which list the start screen is showing. It lives here because the sidebar
     drives it and the start screen draws it, and they are siblings. */
  const [section, setSection] = useState<ZeroSection>("home");
  // Lives here, not in `LeftPanel`: toggling the surface would otherwise
  // remount the panel and lose whatever it held.
  const [pendingCreate, setPendingCreate] = useState(false);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((o) => {
      write(KEYS.sidebar, o ? "0" : "1");
      return !o;
    });
  }, []);
  const toggleAssistant = useCallback(() => {
    setAssistantOpen((o) => {
      write(KEYS.assistant, o ? "0" : "1");
      return !o;
    });
  }, []);
  const showAssistant = useCallback(() => {
    write(KEYS.assistant, "1");
    setAssistantOpen(true);
  }, []);

  // Cursor's conventions: ⌘B for the sidebar, ⌘R for the assistant
  useKeybind("Ctrl+B", toggleSidebar);
  useKeybind("Ctrl+R", toggleAssistant);
  useKeybind("Ctrl+E", () =>
    setSurface((s) => (s === "files" ? "code" : "files"))
  );

  useEffect(() => {
    // The route initialises the explorer inside the main view's mount, and Home
    // does not mount that view — so on a browser with no project, nothing had
    // initialised it and creating the first one threw. Idempotent.
    PgExplorer.init().catch(() => {});

    // Opening or creating a project is the moment to show the project view
    const toProject = () => {
      if (PgExplorer.currentWorkspaceName) setView("project");
    };
    const subs = [
      PgFlow.init(),
      PgLesson.init(),
      PgDeployHistory.init(),
      PgFlow.onDidChange(setState),
      PgLesson.onDidChange(setLesson),
      // So a "Fix with assistant" click while collapsed reopens the pane and
      // the user sees where the click went.
      PgAssistant.onDidRequestPrompt(showAssistant),
      PgExplorer.onDidSwitchWorkspace(toProject),
      PgExplorer.onDidCreateWorkspace(toProject),
    ];
    return () => subs.forEach((s) => s.dispose());
  }, [showAssistant]);

  const openGallery = () => PgView.setModal(NewWorkspaceModal);
  const toggleSettings = (focus: SettingsFocus = "panel") => {
    setSettingsFocus(focus);
    setSettingsOpen((open) => !open);
  };
  const goHome = () => {
    setView("home");
    setSection("home");
  };
  const goSection = (next: ZeroSection) => {
    setView("home");
    setSection(next);
  };
  const openProject = (name: string) => {
    if (name === PgExplorer.currentWorkspaceName) setView("project");
    else PgExplorer.switchWorkspace(name);
  };

  const readingStep = lesson.path
    ? currentStep(lesson.path, lesson.progress)
    : null;
  const target = readingStep?.target ?? null;

  // A learner who fixes the code while the page is open should come back
  // to the editor, not to the next step's prose.
  useEffect(() => {
    setReading(false);
  }, [readingStep?.id]);

  const inProject = view === "project" && !!PgExplorer.currentWorkspaceName;

  /* Cluster, wallet and account. It lives at the foot of the sidebar, which
     is the one column that is the same in both views — and the Figma puts
     identity in this column too. It was in a bar that only existed inside a
     project, so signing in from the start screen meant a second bar drawn by
     the start screen itself. */
  const status = (
    <StatusChips
      onToggleSettings={toggleSettings}
      settingsOpen={settingsOpen}
    />
  );

  return (
    <Wrapper>
      <Layout $sidebar={sidebarOpen}>
        <NavSlot $open={sidebarOpen}>
          <NavSidebar
            onHome={goHome}
            homeActive={!inProject}
            onOpenGallery={openGallery}
            onOpenSettings={() => toggleSettings()}
            onOpenProject={openProject}
            onToggleSidebar={toggleSidebar}
            status={status}
            section={inProject ? null : section}
            onSection={goSection}
          />
        </NavSlot>

        {inProject ? (
          <Panes>
            {assistantOpen && (
              <Resizable
                enable="right"
                size={{ width: assistantWidth, height: "100%" }}
                minWidth={ASSISTANT_MIN}
                maxWidth={ASSISTANT_MAX}
                onResizeStop={(_ev, _dir, ref) => {
                  const w = Math.round(ref.getBoundingClientRect().width);
                  setAssistantWidth(w);
                  write(KEYS.assistantWidth, String(w));
                }}
              >
                <Conversation>
                  <Assistant onCollapse={toggleAssistant} />
                </Conversation>
              </Resizable>
            )}

            <Work>
              <WorkHead>
                {!sidebarOpen && (
                  <BarButton
                    type="button"
                    onClick={toggleSidebar}
                    aria-label="Show the sidebar"
                  >
                    {ICONS.sidebar}
                  </BarButton>
                )}
                <WorkTitle title={PgExplorer.currentWorkspaceName}>
                  {PgExplorer.currentWorkspaceName}
                </WorkTitle>
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
                <WorkEnd>
                  {/* Always here, pressed when the pane is open. A control that
                      only appears once you have already lost the pane is one
                      you have to discover at the worst moment. */}
                  <BarButton
                    type="button"
                    onClick={toggleAssistant}
                    aria-label={
                      assistantOpen
                        ? "Hide the assistant"
                        : "Show the assistant"
                    }
                    aria-pressed={assistantOpen}
                    $on={assistantOpen}
                  >
                    {ICONS.chat}
                  </BarButton>
                  <BarButton
                    as="a"
                    href="https://solana.com/docs"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Documentation"
                  >
                    {ICONS.help}
                  </BarButton>
                </WorkEnd>
              </WorkHead>

              {/* The loop belongs to the workspace, not to the window — in the
                  Figma it runs across the top of this column. It sits under the
                  head rather than above it so that the first row of every
                  column is the same row: name on top, the panel's own switch
                  beneath, the same two rules straight across. */}
              <StageRail>
                <Stepper
                  state={state}
                  onSelect={PgFlow.setStage}
                  target={target}
                />
              </StageRail>

              <WorkBody
                id="work-panel"
                role="tabpanel"
                aria-labelledby={`work-tab-${surface}`}
              >
                {/* Both stay mounted: the editor holds Monaco and the tree
                    holds scroll and selection. Hidden, not unmounted. */}
                <Surface $shown={surface === "files"}>
                  <LeftPanel
                    collapsed={false}
                    onToggle={() => setSurface("code")}
                    pendingCreate={pendingCreate}
                    onPendingCreateChange={setPendingCreate}
                  />
                </Surface>
                <Surface $shown={surface === "code"}>
                  <ObjectiveBand
                    state={lesson}
                    onRead={() => setReading(true)}
                  />
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
          </Panes>
        ) : (
          <ZeroState
            onAskAssistant={showAssistant}
            sidebarOpen={sidebarOpen}
            onShowSidebar={toggleSidebar}
            section={section}
            onSection={setSection}
          />
        )}
      </Layout>

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

/* ── icons ─────────────────────────────────────────────────────────────── */

const svg = (d: JSX.Element) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {d}
  </svg>
);

const ICONS = {
  sidebar: svg(
    <>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d="M9 4v16" />
    </>
  ),
  chat: svg(
    <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 3.5V17H6.5A2.5 2.5 0 0 1 4 14.5z" />
  ),
  help: svg(
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.6 9.5a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2-2.4 3.6" />
      <path d="M12 17.2h.01" />
    </>
  ),
};

/* ── layout ────────────────────────────────────────────────────────────── */

/* Edge to edge. The rounded frame in the reference screenshot is the
   mockup's presentation, not the product's chrome. */
const Wrapper = styled.div`
  ${({ theme }) => css`
    width: 100vw;
    height: 100vh;
    position: relative;
    overflow: hidden;
    /* The ground. Everything raised — cards, the composer, a menu — sits one
       step above this on bgSecondary, so depth is one decision rather than a
       different answer per component. */
    background: ${theme.colors.default.bgPrimary};
  `}
`;

/* Two columns and no rows: the sidebar down the left, the view in the rest.
   Nothing spans the window any more — every panel draws its own head, so
   there is no bar to appear in one view and vanish in another. The sidebar's
   track collapses to nothing when it is hidden. */
const Layout = styled.div<{ $sidebar: boolean }>`
  ${({ $sidebar }) => css`
    height: 100%;
    display: grid;
    grid-template-areas: "nav body";
    grid-template-rows: 1fr;
    grid-template-columns: ${$sidebar ? "auto" : "0"} 1fr;
    min-height: 0;
    overflow: hidden;

    & > * {
      min-height: 0;
    }
  `}
`;

const BarButton = styled.button<{ $on?: boolean }>`
  ${({ theme, $on }) => css`
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 1.875rem;
    height: 1.875rem;
    padding: 0;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: ${$on
      ? theme.colors.default.textPrimary
      : theme.colors.default.textSecondary};
    cursor: pointer;

    & > svg {
      width: 1rem;
      height: 1rem;
    }

    &:hover {
      background: ${theme.colors.state.hover.bg};
      color: ${theme.colors.default.textPrimary};
    }

    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
      outline-offset: 2px;
    }
  `}
`;

/* Hidden, the sidebar's track is 0 and this clips it, so nothing peeks. */
const NavSlot = styled.div<{ $open: boolean }>`
  grid-area: nav;
  display: flex;
  min-height: 0;
  overflow: hidden;
  ${({ $open }) => !$open && "width: 0;"}
`;

/* The two panes of a project, side by side with one hairline between them.
   No cards, no gaps, no rounded corners: one window divided by lines. */
const Panes = styled.div`
  grid-area: body;
  display: flex;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
`;

const Conversation = styled.aside`
  ${({ theme }) => css`
    height: 100%;
    display: flex;
    flex-direction: column;
    min-width: 0;
    border-right: 1px solid ${theme.colors.default.border};
    overflow: hidden;
  `}
`;

const Work = styled.section`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
`;

/* The same 2.75rem row the assistant's header uses, so the two panes share a
   baseline. */
/* The stages, full width above the workspace. The Figma gives each one an
   equal share of the row rather than sizing it to its label, so the row reads
   as a progress bar you can click rather than as four buttons that happen to
   be in order. */
const StageRail = styled.div`
  ${({ theme }) => css`
    display: flex;
    align-items: center;
    flex-shrink: 0;
    height: ${SUBHEAD_HEIGHT};
    padding: 0 0.5rem;
    border-bottom: 1px solid ${theme.colors.default.border};

    & > div {
      flex: 1;
      gap: 0.375rem;
    }

    & > div > div {
      flex: 1;
      min-width: 0;
    }

    /* The connectors were what carried the sequence when the stages were
       sized to their labels. Equal shares carry it now. */
    & > div > span {
      display: none;
    }

    & [role="tab"] {
      width: 100%;
      height: 1.625rem;
      justify-content: center;
    }
  `}
`;

const WorkHead = styled.div`
  ${({ theme }) => css`
    display: flex;
    align-items: center;
    gap: 0.5rem;
    height: ${HEAD_HEIGHT};
    flex-shrink: 0;
    padding: 0 0.5rem;
    border-bottom: 1px solid ${theme.colors.default.border};
  `}
`;

/* Which project you are in, said once, at the head of the thing it names. */
const WorkTitle = styled.div`
  ${({ theme }) => css`
    flex: 1;
    min-width: 0;
    padding-left: calc(${HEAD_INSET} - 0.5rem);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.875rem;
    font-weight: 500;
    color: ${theme.colors.default.textSecondary};
  `}
`;

const WorkEnd = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex: 1;
  gap: 0.25rem;
`;

const WorkTabs = styled.div`
  display: flex;
  align-items: center;
  gap: 0.125rem;
`;

const WorkTab = styled.button<{ $current?: boolean }>`
  ${({ theme, $current }) => css`
    height: 1.875rem;
    padding: 0 0.75rem;
    border: 1px solid transparent;
    border-radius: 999px;
    background: transparent;
    ${$current && gradientStroke(theme.colors.state.hover.bg)}
    color: ${$current
      ? theme.colors.default.textPrimary
      : theme.colors.default.textSecondary};
    font-family: inherit;
    font-size: 0.875rem;
    font-weight: 500;
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

const PortalAbove = styled.div`
  z-index: 4;
`;
const StyledModalBackdrop = styled(ModalBackdrop)`
  z-index: 3;
`;
const PortalBelow = styled.div`
  z-index: 2;
`;
