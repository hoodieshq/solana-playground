import { useCallback, useEffect, useRef, useState } from "react";
import styled, { css, keyframes } from "styled-components";

import ConsoleDrawer from "./console/ConsoleDrawer";
import NewWorkspaceModal from "./gallery/NewWorkspaceModal";
import StatusChips from "./header/StatusChips";
import Stepper from "./header/Stepper";
import NavSidebar from "./nav/NavSidebar";
import ZeroState from "./zero/ZeroState";
import type { ZeroSection } from "./zero/ZeroState";
import LeftPanel from "./left/LeftPanel";
import {
  DEFAULT_LEFT_WIDTH,
  fitLeftWidth,
  MAX_LEFT_WIDTH,
  MIN_EDITOR_WIDTH,
  MIN_LEFT_WIDTH,
} from "./left/width";
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
import Pattern from "../deck/Pattern";
import Assistant from "../sidebar/assistant/Component";
import { PgAssistant } from "../sidebar/assistant/store";
import ModalBackdrop from "../../components/ModalBackdrop";
import Resizable from "../../components/Resizable";
import Toast from "../../components/Toast";
import Wallet from "../../components/Wallet";
import { useKeybind } from "../../hooks";
import { PgExplorer, PgRouter, PgTutorial, PgView } from "../../utils";

/**
 * The Flow layout.
 *
 * Two views, one product. Home is the start screen — the composer, the ways
 * in, the gallery. Project is the work — the assistant, the files and the code
 * side by side. Both are always reachable: Home from the sidebar or the mark,
 * the project from its row. Home used to be "the state with no project", which
 * meant the only way back to it was to delete your work. It is a view now, not
 * a condition.
 *
 * The chrome is the same in both: the sidebar of destinations down the left —
 * a rail when it is collapsed, never nothing — and a head on every column
 * instead of a bar across the window. The assistant and the files can each be
 * hidden and resized; the code can do neither, and it is the one that keeps
 * its room when the window runs short.
 */

type View = "home" | "project";

/* Persisted layout preferences, per browser */
const KEYS = {
  sidebar: "flow-sidebar-open",
  assistant: "flow-assistant-open",
  assistantWidth: "flow-assistant-width",
  files: "flow-files-open",
  filesWidth: "flow-files-width",
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

/* Hidden with focus inside it — its own hide control, or ⌘E from the tree —
   the files column would drop focus on the page, so it goes to the toggle
   that brings the column back. */
const keepFocusOnHide = (toggle: HTMLElement | null) => {
  const column = document.getElementById("flow-files");
  if (column?.contains(document.activeElement)) toggle?.focus();
};

const ASSISTANT_MIN = 288;
const ASSISTANT_MAX = 640;
const ASSISTANT_DEFAULT = 368;
/* Widened, the pane takes up to this share of the window: under half, so the
   editor keeps the larger part even then. */
const ASSISTANT_WIDE_SHARE = 0.45;

const Flow = () => {
  const [state, setState] = useState<FlowState>(INITIAL_FLOW_STATE);
  const [view, setView] = useState<View>(() =>
    PgExplorer.currentWorkspaceName ? "project" : "home"
  );
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
  /* Widened from the pane's own head. Not persisted: the width set by hand is
     the one worth keeping, and it is what narrowing goes back to. */
  const [assistantWide, setAssistantWide] = useState(false);
  /* The files beside the code, shown until someone hides them. Open or not,
     and how wide, are kept per browser the way the assistant's are. */
  const [filesOpen, setFilesOpen] = useState(() => read(KEYS.files) !== "0");
  const [filesWidth, setFilesWidth] = useState(() => {
    const n = Number(read(KEYS.filesWidth));
    return n >= MIN_LEFT_WIDTH && n <= MAX_LEFT_WIDTH ? n : DEFAULT_LEFT_WIDTH;
  });

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsFocus, setSettingsFocus] = useState<SettingsFocus>("panel");
  /* Which list the start screen is showing. It lives here because the sidebar
     drives it and the start screen draws it, and they are siblings. */
  const [section, setSection] = useState<ZeroSection>("home");
  /* A tutorial's own pages are drawn by upstream's `Primary`, which only this
     layout's Write stage mounts. Opening one from the start screen navigated
     the router and then nothing happened at all: `PgView.setMainPrimary`
     retries every 100ms until something answers, and on the start screen
     nothing ever does. So the route has to bring the view with it. */
  const [path, setPath] = useState(() => PgRouter.location.pathname);
  const onTutorialRoute = path.startsWith("/tutorials/");
  /* A tutorial you have not started yet has no workspace, and its about page
     still has to render somewhere. */
  const inProject =
    view === "project" &&
    (!!PgExplorer.currentWorkspaceName || onTutorialRoute);
  /* On a tutorial route the workspace name is whatever was open last, which is
     not what you are looking at. */
  const workTitle =
    (onTutorialRoute ? PgTutorial.current?.name : undefined) ??
    PgExplorer.currentWorkspaceName ??
    "Project";

  /* The stage rail abbreviates its labels when it is genuinely short of room.
     Measured, because styled-components 5 cannot compile a container query. */
  const railRef = useRef<HTMLDivElement>(null);
  const [railTight, setRailTight] = useState(false);
  useEffect(() => {
    const rail = railRef.current;
    if (!rail || typeof ResizeObserver === "undefined") return;
    // Four stages, and "Interact" with its dot wants about 85px
    const observer = new ResizeObserver(([entry]) =>
      setRailTight(entry.contentRect.width < 380)
    );
    observer.observe(rail);
    return () => observer.disconnect();
  }, [inProject]);
  /* The row the project's panes share, measured for the same reason: which of
     them gives way depends on how much room there is. */
  const panesRef = useRef<HTMLDivElement>(null);
  const [panesWidth, setPanesWidth] = useState(Infinity);
  useEffect(() => {
    const panes = panesRef.current;
    if (!panes || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) =>
      setPanesWidth(Math.round(entry.contentRect.width))
    );
    observer.observe(panes);
    return () => observer.disconnect();
  }, [inProject]);
  const filesToggleRef = useRef<HTMLButtonElement>(null);

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
  const toggleAssistantWide = useCallback(
    () => setAssistantWide((wide) => !wide),
    []
  );
  const toggleFiles = useCallback(() => {
    keepFocusOnHide(filesToggleRef.current);
    setFilesOpen((o) => {
      write(KEYS.files, o ? "0" : "1");
      return !o;
    });
  }, []);
  const hideFiles = useCallback(() => {
    keepFocusOnHide(filesToggleRef.current);
    write(KEYS.files, "0");
    setFilesOpen(false);
  }, []);

  // Cursor's conventions: ⌘B for the sidebar, ⌘R for the assistant
  useKeybind("Ctrl+B", toggleSidebar);
  useKeybind("Ctrl+R", toggleAssistant);
  useKeybind("Ctrl+E", toggleFiles);

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
      PgRouter.onDidChangePath((next) => {
        setPath(next);
        if (next.startsWith("/tutorials/")) setView("project");
      }),
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

  /* How the project's row is shared when it runs short. The editor keeps its
     floor for as long as anything else can give: the files column first, down
     to its own floor, then the assistant, down to its own. Only on a window
     too narrow for all three floors does the editor go under its own, and
     then it narrows rather than being pushed past the edge. None of this
     touches the widths people set; it is how much of them fits today. */
  const viewport = window.innerWidth;
  const workFloor = MIN_EDITOR_WIDTH + (filesOpen ? MIN_LEFT_WIDTH : 0);
  const assistantMax = Math.max(
    ASSISTANT_MIN,
    Math.min(ASSISTANT_MAX, panesWidth - workFloor)
  );
  const assistantShown = Math.min(
    // Widening never narrows a pane someone already dragged wide
    assistantWide
      ? Math.max(assistantWidth, Math.round(viewport * ASSISTANT_WIDE_SHARE))
      : assistantWidth,
    assistantMax
  );
  const workWidth = panesWidth - (assistantOpen ? assistantShown : 0);
  const filesMax = fitLeftWidth(Infinity, viewport, workWidth);
  const filesShown = fitLeftWidth(filesWidth, viewport, workWidth);

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
      {/* One ground for the whole window, so the grid is continuous wherever
          a pane lets it through, instead of each pane drawing its own and two
          grids meeting out of step at a border. It rises from the bottom edge
          and the light follows the pointer across every pane — both kept
          faint, a quarter of the landing's strength, because here it sits
          under text people read all day. */}
      <Ground fade={1} rest={0.025} lit={0.07} />
      <Layout>
        <NavSlot>
          <NavSidebar
            collapsed={!sidebarOpen}
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
          <Panes ref={panesRef}>
            {assistantOpen && (
              <AssistantPane
                enable="right"
                size={{ width: assistantShown, height: "100%" }}
                minWidth={ASSISTANT_MIN}
                maxWidth={assistantMax}
                handleComponent={{ right: <Sash /> }}
                onResizeStop={(_ev, _dir, ref, delta) => {
                  // A click on the edge is not a new width
                  if (!delta.width) return;
                  const w = Math.round(ref.getBoundingClientRect().width);
                  setAssistantWidth(w);
                  write(KEYS.assistantWidth, String(w));
                  // Set by hand, this is the width that counts now; narrowing
                  // later must not throw it away for the old one
                  setAssistantWide(false);
                }}
              >
                <Conversation>
                  <Assistant
                    title={workTitle}
                    onCollapse={toggleAssistant}
                    onExpand={toggleAssistantWide}
                    expanded={assistantWide}
                  />
                </Conversation>
              </AssistantPane>
            )}

            <Work>
              <WorkHead>
                {/* The session is named once: by the assistant's head while it
                    is open, here while it is hidden */}
                <WorkTitle title={workTitle}>
                  {assistantOpen ? null : workTitle}
                </WorkTitle>
                {/* Always here, pressed while their pane is showing. A control
                    that only appears once you have already lost the pane is
                    one you have to discover at the worst moment. */}
                <WorkEnd>
                  <HeadButton
                    ref={filesToggleRef}
                    type="button"
                    onClick={toggleFiles}
                    aria-pressed={filesOpen}
                    aria-controls="flow-files"
                    title={filesOpen ? "Hide files (⌘E)" : "Show files (⌘E)"}
                    $label
                  >
                    {ICONS.files}
                    Files
                  </HeadButton>
                  <HeadButton
                    type="button"
                    onClick={toggleAssistant}
                    aria-label="Assistant"
                    aria-pressed={assistantOpen}
                    title={
                      assistantOpen
                        ? "Hide the assistant (⌘R)"
                        : "Show the assistant (⌘R)"
                    }
                  >
                    {ICONS.chat}
                  </HeadButton>
                  <Divider aria-hidden="true" />
                  <HeadButton
                    as="a"
                    href="https://solana.com/docs"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Documentation"
                    title="Solana documentation"
                  >
                    {ICONS.help}
                  </HeadButton>
                </WorkEnd>
              </WorkHead>

              {/* The loop belongs to the workspace, not to the window — in the
                  Figma it runs across the top of this column. It sits under the
                  head rather than above it so that the first row of every
                  column is the same row: name on top, the panel's own switch
                  beneath, the same two rules straight across. */}
              <StageRail ref={railRef}>
                <Stepper
                  state={state}
                  onSelect={PgFlow.setStage}
                  target={target}
                  compact={railTight}
                />
              </StageRail>

              {/* Files and code side by side, and both always mounted: the
                  editor holds Monaco and the tree holds scroll and selection.
                  The files column is hidden, never unmounted, and the code
                  takes its room. */}
              <WorkBody>
                <FilesPane
                  $shown={filesOpen}
                  enable="right"
                  size={{ width: filesShown, height: "100%" }}
                  minWidth={MIN_LEFT_WIDTH}
                  maxWidth={filesMax}
                  handleComponent={{ right: <Sash /> }}
                  onResizeStop={(_ev, _dir, ref, delta) => {
                    if (!delta.width) return;
                    const w = Math.round(ref.getBoundingClientRect().width);
                    setFilesWidth(w);
                    write(KEYS.filesWidth, String(w));
                  }}
                >
                  <LeftPanel onClose={hideFiles} />
                </FilesPane>
                <Code>
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
                </Code>
              </WorkBody>
            </Work>
          </Panes>
        ) : (
          <ZeroState
            onAskAssistant={showAssistant}
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

/* `data-fill` marks the shape a toggle fills in while it is pressed */
const ICONS = {
  files: svg(
    <path
      data-fill
      d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
    />
  ),
  chat: svg(
    <path
      data-fill
      d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 3.5V17H6.5A2.5 2.5 0 0 1 4 14.5z"
    />
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

/* The brand pattern at the product's strength, under everything. Transparent
   panes show it — the conversation, a stage with nothing in it yet — and
   opaque ones cover it: the sidebar, the files, the editor, every card. Its
   own layer, because the light repaints it on every frame it moves and
   nothing above it should have to repaint with it. */
const Ground = styled(Pattern)`
  z-index: 0;
  will-change: transform;
`;

/* Two columns and no rows: the sidebar down the left, the view in the rest.
   Nothing spans the window any more — every panel draws its own head, so
   there is no bar to appear in one view and vanish in another. The sidebar's
   track is always as wide as the sidebar: collapsed, it draws a rail, and the
   rail carries its own way back.

   Positioned so it paints after the ground that comes before it, but with no
   z-index of its own: one would make it a stacking context, and every menu,
   tooltip and sheet inside it would be capped at the layout's level, under
   the wallet and anything else that follows it with a z-index. */
const Layout = styled.div`
  position: relative;
  height: 100%;
  display: grid;
  grid-template-areas: "nav body";
  grid-template-rows: 1fr;
  grid-template-columns: auto 1fr;
  min-height: 0;
  overflow: hidden;

  & > * {
    min-height: 0;
  }
`;

const NavSlot = styled.div`
  grid-area: nav;
  display: flex;
  min-height: 0;
`;

/* The panes of a project, side by side with one hairline between each pair.
   No cards, no gaps, no rounded corners: one window divided by lines. */
const Panes = styled.div`
  grid-area: body;
  display: flex;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
`;

/* The repo's Resizable eases its width linearly. A pane whose width changes on
   a click — widened, or giving way to its neighbour — should settle rather
   than travel at one speed, and hold still for anyone who asked for less
   motion. */
const paneMotion = css`
  transition-timing-function: cubic-bezier(0.2, 0, 0, 1);

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const AssistantPane = styled(Resizable)`
  ${paneMotion}
`;

/* Shown, the column arrives rather than blinks in: opacity only, so the editor
   beside it moves once and nothing slides. */
const reveal = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;

/* Hidden with display rather than unmounted, so the tree keeps its scroll, its
   open folders and its selection. The reveal replays each time it is shown,
   because an animation restarts whenever its element starts rendering. */
const FilesPane = styled(Resizable)<{ $shown: boolean }>`
  ${paneMotion}
  ${({ $shown }) => !$shown && "display: none;"}
  animation: ${reveal} 0.16s ease-out;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

/* The drag edge, drawn on the hairline it sits on. Hover a moment, or hold it,
   and the line takes the accent: the one thing there you can act on. It lies
   over the line and the pixel inside it rather than across the edge, so a
   neighbour painted later can never cover half of it. */
const Sash = styled.div`
  ${({ theme }) => css`
    position: relative;
    width: 100%;
    height: 100%;

    &::after {
      content: "";
      position: absolute;
      top: 0;
      bottom: 0;
      /* The handle is 10px centred on the edge; this is the 2px inside it */
      left: 3px;
      width: 2px;
      background: ${theme.colors.default.primary};
      opacity: 0;
      transition: opacity 0.12s ease;
    }

    &:hover::after {
      opacity: 1;
      transition-delay: 0.15s;
    }

    &:active::after {
      opacity: 1;
      transition-delay: 0s;
    }

    @media (prefers-reduced-motion: reduce) {
      &::after {
        transition: none;
      }
    }
  `}
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

/* The work column's head: the project's name, and the switches for the panes
   beside the code. The same 2.75rem row the assistant's head uses, so the two
   panes share a baseline. */
const WorkHead = styled.div`
  ${({ theme }) => css`
    display: flex;
    align-items: center;
    gap: 0.5rem;
    height: ${HEAD_HEIGHT};
    flex-shrink: 0;
    padding: 0 0.375rem 0 0.5rem;
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
  flex-shrink: 0;
  gap: 0.125rem;
`;

/* The head's controls in Claude's shape: one square, one radius, one glyph
   size, so a row of them reads as a set, and the same button the assistant's
   head uses beside it. A toggle fills in while its pane is showing, the tint
   and the glyph both, so on and off stay distinguishable even under the
   pointer, where hover lends every button the same tint. Toggles are states
   rather than a choice among options, so the gradient stays with the stages. */
const HeadButton = styled.button<{ $label?: boolean }>`
  ${({ theme, $label }) => css`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.375rem;
    flex-shrink: 0;
    min-width: 1.875rem;
    height: 1.875rem;
    padding: ${$label ? "0 0.625rem 0 0.5rem" : "0"};
    border: none;
    border-radius: 8px;
    background: transparent;
    color: ${theme.colors.default.textSecondary};
    font-family: inherit;
    font-size: 0.8125rem;
    font-weight: 500;
    white-space: nowrap;
    cursor: pointer;
    transition: background 0.1s, color 0.1s;

    & > svg {
      flex-shrink: 0;
      width: 1rem;
      height: 1rem;
    }

    &:hover,
    &[aria-pressed="true"] {
      background: ${theme.colors.state.hover.bg};
      color: ${theme.colors.default.textPrimary};
    }

    &[aria-pressed="true"] [data-fill] {
      fill: currentColor;
      fill-opacity: 0.22;
    }

    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
      outline-offset: 2px;
    }

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  `}
`;

/* Between the panes you can open and the one link that leaves the product */
const Divider = styled.span`
  ${({ theme }) => css`
    flex-shrink: 0;
    width: 1px;
    height: 1rem;
    margin: 0 0.25rem;
    background: ${theme.colors.default.border};
  `}
`;

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

const WorkBody = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  overflow: hidden;
`;

/* Whatever the row has left after the files column. Its floor is kept by the
   widths worked out above rather than by a min-width here, so that when there
   is truly nothing left to give it narrows instead of pushing the row past the
   window's edge. */
const Code = styled.div`
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
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
