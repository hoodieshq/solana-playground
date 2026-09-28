import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import styled, { createGlobalStyle, css, keyframes } from "styled-components";

import ConsoleDrawer from "./console/ConsoleDrawer";
import { frosted } from "./components/frosted";
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
import StagePreview from "./stages/StagePreview";
import type { PreviewStage } from "./stages/StagePreview";
import { PHONE, usePhone } from "./phone";
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
import {
  PgCommon,
  PgExplorer,
  PgRouter,
  PgTutorial,
  PgView,
} from "../../utils";

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
 *
 * On a phone the same product is three pages side by side, swiped between
 * as the phone's own apps are: the menu on the left, the work in the middle,
 * and on the right the preview — what the code has become: Build, Deploy and
 * Interact, with the terminal under them. Each page is the whole screen. The
 * work page's bar holds the menu, the name of where you are, a switch between
 * the chat and the code, and the way to the preview; every swipe has a button
 * too. The files open as a sheet over the code. Both panes stay mounted, so
 * the editor and the conversation keep their place while the other shows.
 */

/* A phone's pages, left to right */
type PhonePage = "menu" | "work" | "preview";

/* Where the start screen is, for the phone's bar */
const SECTION_TITLES = {
  home: "Home",
  tutorials: "Tutorials",
  programs: "Programs",
} as const;

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

  /* On a phone: which page is in view, which pane the work page shows, the
     files' sheet, and the preview stage last looked at */
  const phone = usePhone();
  const [page, setPage] = useState<PhonePage>("work");
  const [pane, setPane] = useState<"chat" | "code">("code");
  const [filesSheet, setFilesSheet] = useState(false);
  const pagerRef = useRef<HTMLDivElement>(null);
  const lastPreview = useRef<PreviewStage>("build");

  /* To a page, as a swipe would take you: the buttons' way there */
  const goTo = useCallback((next: PhonePage, smooth = true) => {
    const pager = pagerRef.current;
    if (!pager) return;
    const pages = Array.from(pager.children) as HTMLElement[];
    const index = pages.findIndex((el) => el.dataset.page === next);
    if (index < 0) return;
    pages[index].removeAttribute("inert");
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    pager.scrollTo({
      left: index * pager.clientWidth,
      behavior: smooth && !still ? "smooth" : "auto",
    });
  }, []);

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
  const [railWidth, setRailWidth] = useState(Infinity);
  useEffect(() => {
    const rail = railRef.current;
    if (!rail || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) =>
      setRailWidth(Math.round(entry.contentRect.width))
    );
    observer.observe(rail);
    return () => observer.disconnect();
  }, [inProject, phone]);
  // Four stages, and "Interact" with its dot wants about 85px; a phone's
  // bigger type still fits whole words down to a narrow one
  const railTight = railWidth < (phone ? 300 : 380);
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
    /* On a phone, the chat is the pane that shows */
    setPane("chat");
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

  /* Everything the menu does also takes you on to the work, on a phone */
  const leaveMenu = () => {
    if (phone) goTo("work");
  };
  const openGallery = () => {
    leaveMenu();
    PgView.setModal(NewWorkspaceModal);
  };
  const toggleSettings = (focus: SettingsFocus = "panel") => {
    setSettingsFocus(focus);
    setSettingsOpen((open) => !open);
  };
  const goHome = () => {
    leaveMenu();
    setView("home");
    setSection("home");
  };
  const goSection = (next: ZeroSection) => {
    leaveMenu();
    setView("home");
    setSection(next);
  };
  const openProject = (name: string) => {
    leaveMenu();
    if (name === PgExplorer.currentWorkspaceName) setView("project");
    else PgExplorer.switchWorkspace(name);
  };

  /* The pages: which one is in view once a swipe settles, the others out of
     reach until they are, and the work page in view to begin with and after
     the window changes size */
  useLayoutEffect(() => {
    const pager = pagerRef.current;
    if (!phone || !pager) return;
    const pages = () => Array.from(pager.children) as HTMLElement[];
    const settle = () => {
      const index = Math.round(
        pager.scrollLeft / Math.max(1, pager.clientWidth)
      );
      const current = pages()[index];
      pages().forEach((el) => el.toggleAttribute("inert", el !== current));
      setPage((current?.dataset.page as PhonePage) || "work");
    };
    const work = pages().findIndex((el) => el.dataset.page === "work");
    pager.scrollLeft = Math.max(0, work) * pager.clientWidth;
    settle();
    let timer = 0;
    const onScroll = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(settle, 90);
    };
    const onResize = () => {
      const index = pages().findIndex((el) => !el.hasAttribute("inert"));
      pager.scrollLeft = Math.max(0, index) * pager.clientWidth;
    };
    pager.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      pager.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.clearTimeout(timer);
    };
  }, [phone, inProject]);

  /* The stage and the pages keep step: Write is the work page's, the other
     three the preview's. Going to the preview shows the stage last looked at
     there; a stage started from anywhere else — a build asked for in the chat
     — brings its page into view. */
  const stageSeen = useRef(state.stage);
  useEffect(() => {
    const was = stageSeen.current;
    stageSeen.current = state.stage;
    if (!phone || was === state.stage) return;
    if (state.stage === "write") {
      setPane("code");
      goTo("work");
    } else {
      lastPreview.current = state.stage;
      goTo("preview");
    }
  }, [phone, state.stage, goTo]);
  useEffect(() => {
    if (phone && page === "preview" && state.stage === "write") {
      PgFlow.setStage(lastPreview.current);
    }
  }, [phone, page, state.stage]);
  const previewStage: PreviewStage =
    state.stage === "write" ? lastPreview.current : state.stage;

  /* The files' sheet closes once a file is open: the code is what you asked
     for. A dialog opened from the menu — connecting the assistant, a wallet —
     brings the work back behind it. Off a phone, the sheet is simply shut. */
  useEffect(() => {
    if (!phone) {
      setFilesSheet(false);
      return;
    }
    const sub = PgExplorer.onDidOpenFile(() => setFilesSheet(false));
    const modalSet = PgCommon.getSendAndReceiveEventNames(
      PgView.events.MODAL_SET
    ).send;
    const onModal = (ev: Event) => {
      if ((ev as CustomEvent<{ elementable?: unknown }>).detail?.elementable) {
        goTo("work", false);
      }
    };
    document.addEventListener(modalSet, onModal);
    return () => {
      sub.dispose();
      document.removeEventListener(modalSet, onModal);
    };
  }, [phone, goTo]);

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

  const nav = (collapsed: boolean) => (
    <NavSidebar
      collapsed={collapsed}
      onHome={goHome}
      homeActive={!inProject}
      onOpenGallery={openGallery}
      onOpenSettings={() => toggleSettings()}
      onOpenProject={openProject}
      onToggleSidebar={phone ? () => goTo("work") : toggleSidebar}
      status={status}
      section={inProject ? null : section}
      onSection={goSection}
    />
  );

  const stageRail = (
    <StageRail ref={railRef}>
      <Stepper
        state={state}
        onSelect={PgFlow.setStage}
        target={target}
        compact={railTight}
      />
    </StageRail>
  );

  const code = (
    <Code>
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
    </Code>
  );

  /* The code on a phone: Write only — the other stages have their page */
  const phoneCode = (
    <Code>
      <ObjectiveBand state={lesson} onRead={() => setReading(true)} />
      <Stage>
        <StageRouter stage="write" />
        {reading && readingStep && (
          <Reader
            key={readingStep.id}
            step={readingStep}
            onClose={() => setReading(false)}
          />
        )}
      </Stage>
    </Code>
  );

  return (
    <Wrapper>
      <PhoneTouch />
      {/* One ground for the whole window, so the grid is continuous wherever
          a pane lets it through, instead of each pane drawing its own and two
          grids meeting out of step at a border. It rises from the bottom edge
          and the light follows the pointer across every pane — both kept
          faint, a quarter of the landing's strength, because here it sits
          under text people read all day. */}
      <Ground fade={1} rest={0.025} lit={0.07} />
      <Layout $phone={phone}>
        {phone ? (
          <Pager ref={pagerRef}>
            <PagerPage data-page="menu" aria-label="Navigation">
              {nav(false)}
            </PagerPage>

            <PagerPage data-page="work">
              <PhoneBar>
                <BarButton
                  type="button"
                  aria-label="Menu"
                  aria-expanded={page === "menu"}
                  onClick={() => goTo("menu")}
                >
                  {ICONS.menu}
                </BarButton>
                <BarTitle>
                  {inProject ? workTitle : SECTION_TITLES[section]}
                </BarTitle>
                {inProject && (
                  <>
                    <PaneSwitch role="group" aria-label="Show">
                      <PaneOption
                        type="button"
                        aria-pressed={pane === "chat"}
                        onClick={() => setPane("chat")}
                      >
                        Chat
                      </PaneOption>
                      <PaneOption
                        type="button"
                        aria-pressed={pane === "code"}
                        onClick={() => setPane("code")}
                      >
                        Code
                      </PaneOption>
                    </PaneSwitch>
                    <BarButton
                      type="button"
                      aria-label="Preview the build"
                      onClick={() => goTo("preview")}
                    >
                      {ICONS.preview}
                    </BarButton>
                  </>
                )}
              </PhoneBar>

              {inProject ? (
                <PhonePanes>
                  <PhonePane $shown={pane === "chat"}>
                    <Conversation $phone>
                      <Assistant title={workTitle} />
                    </Conversation>
                  </PhonePane>
                  <PhonePane $shown={pane === "code"}>
                    <Work>
                      <WorkHead>
                        <HeadButton
                          type="button"
                          onClick={() => setFilesSheet(true)}
                          aria-expanded={filesSheet}
                          aria-controls="flow-files"
                          $label
                        >
                          {ICONS.files}
                          Files
                        </HeadButton>
                        <WorkTitle />
                        <HeadButton
                          as="a"
                          href="https://solana.com/docs"
                          target="_blank"
                          rel="noreferrer"
                          aria-label="Documentation"
                        >
                          {ICONS.help}
                        </HeadButton>
                      </WorkHead>
                      <WorkBody>
                        {phoneCode}
                        <SheetScrim
                          $open={filesSheet}
                          onClick={() => setFilesSheet(false)}
                          aria-hidden="true"
                        />
                        <FilesSheet
                          id="flow-files"
                          $open={filesSheet}
                          onClickCapture={(ev) => {
                            /* A file tapped is a file opened, even the one
                               that already was: the sheet has done its job */
                            const row = (ev.target as Element).closest(
                              `.${PgView.classNames.FILE}`
                            );
                            if (row) {
                              window.setTimeout(
                                () => setFilesSheet(false),
                                120
                              );
                            }
                          }}
                        >
                          <LeftPanel onClose={() => setFilesSheet(false)} />
                        </FilesSheet>
                      </WorkBody>
                    </Work>
                  </PhonePane>
                </PhonePanes>
              ) : (
                <PageBody>
                  <ZeroState
                    onAskAssistant={showAssistant}
                    section={section}
                    onSection={setSection}
                  />
                </PageBody>
              )}
            </PagerPage>

            {inProject && (
              <PagerPage data-page="preview" aria-label="Preview">
                <PhoneBar>
                  <BarButton
                    type="button"
                    aria-label="Back to the code"
                    onClick={() => goTo("work")}
                  >
                    {ICONS.back}
                  </BarButton>
                  <PreviewRail>
                    <Stepper
                      state={state}
                      onSelect={PgFlow.setStage}
                      target={target}
                      compact={false}
                    />
                  </PreviewRail>
                </PhoneBar>
                <PreviewBody>
                  <StagePreview stage={previewStage} />
                </PreviewBody>
                <ConsoleDrawer />
              </PagerPage>
            )}
          </Pager>
        ) : (
          <NavSlot>{nav(!sidebarOpen)}</NavSlot>
        )}

        {phone ? null : inProject ? (
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
              {stageRail}

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
                {code}
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
  menu: svg(
    <>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </>
  ),
  preview: svg(
    <path
      data-fill
      d="M8 5.5v13a.5.5 0 0 0 .76.43l10.4-6.5a.5.5 0 0 0 0-.86L8.76 5.07A.5.5 0 0 0 8 5.5z"
    />
  ),
  back: svg(<path d="m15 5-7 7 7 7" />),
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
    /* On a phone, the height the browser's own bars leave */
    height: 100dvh;
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
const Layout = styled.div<{ $phone?: boolean }>`
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

  /* A phone: the pages, filling it */
  ${({ $phone }) =>
    $phone &&
    css`
      grid-template-areas: "body";
      grid-template-rows: minmax(0, 1fr);
      grid-template-columns: minmax(0, 1fr);
    `}
`;

/* ── the phone's chrome ────────────────────────────────────────────────── */

/* On a phone, for the whole product: fields at 16px, under which the page
   zooms in to type and stays zoomed; and everything you can press at a
   fingertip's reach, 44px at the least, whatever size it is drawn at on a
   desktop. The editor and the terminal keep their own. */
const PhoneTouch = createGlobalStyle`
  ${PHONE} {
    /* The product's type, and every length set in it, a step up: a phone is
       read at arm's length, not at a desk */
    html {
      font-size: 112.5%;
    }

    input:not([type="checkbox"]):not([type="radio"]):not([type="range"]),
    textarea,
    select {
      font-size: max(1rem, 16px) !important;
    }

    :is(button, [role="button"], [role="tab"], [role="menuitem"], select, a[href]):not(.monaco-editor *):not(.xterm *) {
      min-height: 48px;
    }

    :is(button, [role="button"], [role="menuitem"]):not(.monaco-editor *):not(.xterm *) {
      min-width: 48px;
    }

    input:is([type="text"], [type="search"], [type="password"], [type="url"], [type="number"], :not([type])):not(.monaco-editor *):not(.xterm *) {
      min-height: 48px;
    }
  }
`;

/* The bar across the top of a phone: the menu, where you are, and in a
   project the switch between the chat and the code */
const PhoneBar = styled.header`
  ${({ theme }) => css`
    position: relative;
    z-index: 2;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    min-height: 64px;
    padding: env(safe-area-inset-top, 0px) 0.5rem 0 0.375rem;
    border-bottom: 1px solid ${theme.colors.default.border};
    ${frosted}
  `}
`;

/* A square the size of a fingertip */
const touch = css`
  ${({ theme }) => css`
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    min-width: 48px;
    height: 48px;
    border: none;
    border-radius: 12px;
    background: transparent;
    color: ${theme.colors.default.textSecondary};
    font-family: inherit;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;

    & > svg {
      flex-shrink: 0;
      width: 24px;
      height: 24px;
    }

    &:active {
      background: ${theme.colors.state.hover.bg};
    }

    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
      outline-offset: -2px;
    }
  `}
`;

const BarButton = styled.button`
  ${touch}
`;

const BarTitle = styled.div`
  ${({ theme }) => css`
    flex: 1;
    min-width: 0;
    padding-left: 0.125rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 1rem;
    font-weight: 500;
    color: ${theme.colors.default.textPrimary};
  `}
`;

/* Chat or code: two options, one filled — a switch between two views of
   the same session, not two tabs of different things */
const PaneSwitch = styled.div`
  ${({ theme }) => css`
    display: flex;
    flex-shrink: 0;
    gap: 2px;
    padding: 2px;
    border-radius: 12px;
    background: ${theme.colors.default.bgSecondary};
  `}
`;

const PaneOption = styled.button`
  ${touch}
  ${({ theme }) => css`
    gap: 0.375rem;
    height: 48px;
    min-width: 0;
    padding: 0 0.75rem;
    font-size: 0.9375rem;
    font-weight: 500;

    & > svg {
      width: 20px;
      height: 20px;
    }

    &[aria-pressed="true"] {
      background: ${theme.colors.state.hover.bg};
      color: ${theme.colors.default.textPrimary};
    }

    &[aria-pressed="true"] [data-fill] {
      fill: currentColor;
      fill-opacity: 0.22;
    }
  `}
`;

const EASE = "cubic-bezier(0.2, 0, 0, 1)";

/* The pages, side by side: swiped with the phone's own scrolling, each one
   snapping to the whole screen */
const Pager = styled.div`
  grid-area: body;
  display: flex;
  min-width: 0;
  min-height: 0;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-snap-type: x mandatory;
  overscroll-behavior-x: contain;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
`;

const PagerPage = styled.section`
  ${({ theme }) => css`
    position: relative;
    flex: 0 0 100%;
    width: 100%;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    scroll-snap-align: start;
    scroll-snap-stop: always;
    background: ${theme.colors.default.bgPrimary};

    /* The menu is the sidebar, as wide as the screen */
    & > aside {
      flex: 1;
      width: 100%;
    }
  `}
`;

/* The preview's stages, the three of them: Write is the code's page */
const PreviewRail = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;

  & > div {
    flex: 1;
    gap: 0.25rem;
  }

  & > div > div {
    flex: 1;
    min-width: 0;
  }

  & > div > div:has(> #flow-stage-tab-write),
  & > div > span {
    display: none;
  }

  & [role="tab"] {
    width: 100%;
    height: 48px;
    justify-content: center;
    font-size: 0.9375rem;
  }
`;

const PreviewBody = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

/* The chat and the code in the same place, one showing */
const PhonePanes = styled.div`
  position: relative;
  flex: 1;
  display: flex;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
`;

/* The start screen, under the bar, taking the rest of the page */
const PageBody = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
`;

const PhonePane = styled.div<{ $shown: boolean }>`
  ${({ $shown }) => css`
    flex: 1;
    display: ${$shown ? "flex" : "none"};
    flex-direction: column;
    min-width: 0;
    min-height: 0;
  `}
`;

/* The files, as a sheet over the code from the left */
const FilesSheet = styled.div<{ $open: boolean }>`
  ${({ theme, $open }) => css`
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    z-index: 3;
    display: flex;
    flex-direction: column;
    width: min(88%, 22rem);
    border-right: 1px solid ${theme.colors.default.border};
    background: ${theme.colors.default.bgPrimary};
    box-shadow: ${$open ? "0 0 2.5rem rgba(0, 0, 0, 0.45)" : "none"};
    transform: translate3d(${$open ? "0" : "-104%"}, 0, 0);
    visibility: ${$open ? "visible" : "hidden"};
    transition: transform 0.26s ${EASE},
      visibility 0s linear ${$open ? "0s" : "0.26s"};

    & > * {
      flex: 1;
      min-height: 0;
    }

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  `}
`;

const SheetScrim = styled.div<{ $open: boolean }>`
  ${({ $open }) => css`
    position: absolute;
    inset: 0;
    z-index: 2;
    background: rgba(0, 0, 0, 0.45);
    opacity: ${$open ? 1 : 0};
    pointer-events: ${$open ? "auto" : "none"};
    transition: opacity 0.26s ${EASE};

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  `}
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

const Conversation = styled.aside<{ $phone?: boolean }>`
  ${({ theme, $phone }) => css`
    height: 100%;
    display: flex;
    flex-direction: column;
    flex: ${$phone ? 1 : "initial"};
    min-width: 0;
    border-right: ${$phone
      ? "none"
      : `1px solid ${theme.colors.default.border}`};
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
    ${PHONE} {
      height: 3.25rem;
    }
    flex-shrink: 0;
    padding: 0 0.375rem 0 0.5rem;
    border-bottom: 1px solid ${theme.colors.default.border};
    ${frosted}
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

    ${PHONE} {
      min-width: 2.75rem;
      height: 2.75rem;
      font-size: 0.9375rem;

      & > svg {
        width: 1.125rem;
        height: 1.125rem;
      }
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
    ${frosted}

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

    /* A fingertip's height on a phone */
    ${PHONE} {
      height: 3.5rem;

      & [role="tab"] {
        height: 2.75rem;
        font-size: 0.9375rem;
      }
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
