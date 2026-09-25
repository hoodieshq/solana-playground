import type { FC } from "react";
import { useEffect, useState } from "react";
import styled, { css } from "styled-components";

import StepRail from "../lessons/StepRail";
import { currentStep, INITIAL_LESSON_STATE, PgLesson } from "../lessons";
import Explorer from "../../sidebar/explorer/Component";
import { useCreateItem } from "../../sidebar/explorer/Component/useCreateItem";
import { BOTTOM_BAR_HEIGHT, HEAD_INSET } from "../tokens";

type Tab = "steps" | "files";

interface LeftPanelProps {
  /** Hides the column. The work head's Files toggle brings it back. */
  onClose: () => void;
}

/**
 * The Files column: where you are inside the current project, beside the
 * code. Which project you are in is the sidebar's job, and the column's head
 * only names itself.
 *
 * It is always mounted. `Flow` hides the column rather than unmounting it, so
 * the tree keeps its scroll, its open folders and its selection, and nothing
 * here has to wait for the tree to exist before acting on it.
 */
const LeftPanel: FC<LeftPanelProps> = ({ onClose }) => {
  const [lesson, setLesson] = useState(INITIAL_LESSON_STATE);
  useEffect(() => PgLesson.onDidChange(setLesson).dispose, []);

  const [tab, setTab] = useState<Tab>("steps");
  // The same upstream hook `ExplorerButtons.tsx` calls for its own hidden
  // "New file" icon button (`NewItemButton` -> `useCreateItem`) -- no
  // upstream edit, no programmatic `.click()` of a hidden button.
  const { createItem } = useCreateItem();

  const inLesson = !!lesson.path;
  const showSteps = inLesson && tab === "steps";
  const activeStep = lesson.path
    ? currentStep(lesson.path, lesson.progress)
    : null;

  return (
    <Wrapper id="flow-files" aria-label="Files">
      <Head>
        {inLesson ? (
          <Switch role="tablist" aria-label="Project panel">
            <Thumb aria-hidden="true" $index={tab === "steps" ? 0 : 1} />
            {(["steps", "files"] as const).map((t) => (
              <Segment
                key={t}
                type="button"
                id={`flow-left-tab-${t}`}
                role="tab"
                aria-selected={tab === t}
                aria-controls="flow-left-tabpanel"
                $active={tab === t}
                onClick={() => setTab(t)}
              >
                {t === "steps" ? "Steps" : "Files"}
              </Segment>
            ))}
          </Switch>
        ) : (
          <Title>Files</Title>
        )}
        <Close
          type="button"
          onClick={onClose}
          aria-label="Hide files"
          title="Hide files (⌘E)"
        >
          {PANEL_ICON}
        </Close>
      </Head>
      <Body
        id="flow-left-tabpanel"
        role={inLesson ? "tabpanel" : undefined}
        aria-labelledby={inLesson ? `flow-left-tab-${tab}` : undefined}
      >
        {showSteps ? (
          <StepRail state={lesson} />
        ) : (
          <ExplorerContainer>
            <Explorer />
          </ExplorerContainer>
        )}
      </Body>
      {/* Pinned below the rail for the same reason as the files footer:
          a way out that scrolls away is not a way out. */}
      {showSteps && activeStep && (
        <SkipFooter
          type="button"
          title={`Nothing has proved this step yet — ${activeStep.verifiedBy}. Moving on now is recorded as a skip, and clears itself if you come back and prove it.`}
          onClick={() => PgLesson.skipStep()}
        >
          Skip this step
        </SkipFooter>
      )}
      {!showSteps && (
        <Footer type="button" onClick={createItem}>
          + New file
        </Footer>
      )}
    </Wrapper>
  );
};

export default LeftPanel;

/* The glyph every column's own hide control uses -- the assistant's head
   draws the same one -- so "put this pane away" reads the same everywhere. */
const PANEL_ICON = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="3" y="4" width="18" height="16" rx="2.5" />
    <path d="M9 4v16" />
  </svg>
);

// A column, not a card: the ground's colour and one hairline on the editor's
// side, the way every other column is divided. Opaque, as the sidebar is: the
// pattern under the window is for open ground, a list reads cleaner off it,
// and the light following the pointer should not light every row it passes.
// Its width is the resizable column's in `Flow.tsx`, so the two cannot
// disagree.
const Wrapper = styled.aside`
  ${({ theme }) => css`
    width: 100%;
    // Explicit rather than inherited: the resize wrapper this sits inside is
    // a plain block, so without it the column would end at its content
    height: 100%;
    display: flex;
    flex-direction: column;
    border-right: 1px solid ${theme.colors.default.border};
    background: ${theme.colors.default.bgPrimary};
    overflow: hidden;
  `}
`;

// The editor's tab strip runs along the top of the column beside this one,
// so the head takes the strip's height -- the tab's own, plus the rule under
// it -- and the two rules meet in one line across.
const Head = styled.div`
  ${({ theme }) => css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    flex-shrink: 0;
    height: calc(${theme.components.tabs.tab.default.height} + 1px);
    padding: 0 0.375rem 0 ${HEAD_INSET};
    border-bottom: 1px solid ${theme.colors.default.border};
  `}
`;

// Sentence case at the sidebar rows' size: a column's name, not a label
// shouting over its contents
const Title = styled.span`
  ${({ theme }) => css`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.8125rem;
    font-weight: 500;
    color: ${theme.colors.default.textSecondary};
  `}
`;

// In a lesson the head switches between the steps and the files: one track
// and one thumb that slides to whichever is showing, so the switch is seen to
// move rather than two pills taking turns to light up. The stage rail's
// track, a size down: the same surface, stroke, inset and slide. Its thumb
// stays neutral -- the gradient marks the loop's stage, and one current thing
// carrying the brand is what lets it mean "current".
const Switch = styled.div`
  ${({ theme }) => css`
    position: relative;
    display: grid;
    grid-template-columns: 1fr 1fr;
    height: 1.75rem;
    padding: 2px;
    border: 1px solid ${theme.colors.default.border};
    border-radius: 999px;
    background: ${theme.colors.default.bgSecondary};
  `}
`;

// Exactly one column wide -- half the padding box, less the padding it starts
// after -- so a translate of its own width lands it on the other column
const Thumb = styled.span<{ $index: number }>`
  ${({ theme, $index }) => css`
    position: absolute;
    top: 2px;
    bottom: 2px;
    left: 2px;
    width: calc(50% - 2px);
    border-radius: 999px;
    background: ${theme.colors.state.hover.bg};
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    transform: translateX(${$index * 100}%);
    transition: transform 0.22s cubic-bezier(0.2, 0, 0, 1);

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  `}
`;

// Positioned, so it paints above the thumb that comes before it
const Segment = styled.button<{ $active: boolean }>`
  ${({ theme, $active }) => css`
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 0.625rem;
    border: none;
    border-radius: 999px;
    background: transparent;
    color: ${$active
      ? theme.colors.default.textPrimary
      : theme.colors.default.textSecondary};
    font: inherit;
    font-size: 0.8125rem;
    font-weight: 500;
    white-space: nowrap;
    cursor: pointer;
    transition: color 0.15s;

    &:hover {
      color: ${theme.colors.default.textPrimary};
    }

    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
      outline-offset: 0;
    }

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  `}
`;

// The assistant head's hide control, a size down: this head is a row below
// the window's first, where the full-size controls live
const Close = styled.button`
  ${({ theme }) => css`
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 1.75rem;
    height: 1.75rem;
    padding: 0;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: ${theme.colors.default.textSecondary};
    cursor: pointer;

    & > svg {
      width: 0.875rem;
      height: 0.875rem;
    }

    &:hover {
      background: ${theme.colors.state.hover.bg};
      color: ${theme.colors.default.textPrimary};
    }

    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
      outline-offset: 1px;
    }
  `}
`;

const Body = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  // File names are never shortened, so a name wider than the column scrolls
  // here rather than being clipped
  overflow-x: auto;
`;

// Quiet, full-width footer button pinned below the scrollable tree (a
// sibling of `Body`, not inside it, so it never scrolls away). Reuses
// `createItem` from `useCreateItem` -- the exact upstream create-item flow,
// not a re-implementation. With the console closed, its top rule meets the
// console handle's beside it.
const Footer = styled.button`
  ${({ theme }) => css`
    flex-shrink: 0;
    width: 100%;
    height: ${BOTTOM_BAR_HEIGHT};
    padding: 0 ${HEAD_INSET};
    display: flex;
    align-items: center;
    border: none;
    border-top: 1px solid ${theme.colors.default.border};
    background: transparent;
    color: ${theme.colors.default.textSecondary};
    font: inherit;
    font-size: 0.8125rem;
    text-align: left;
    cursor: pointer;
    &:hover {
      color: ${theme.colors.default.textPrimary};
      background: ${theme.colors.state.hover.bg};
    }
    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
      outline-offset: -2px;
    }
  `}
`;

// The files footer's shape, dimmed further: skipping is the way out of a
// step, never the way through it
const SkipFooter = styled(Footer)`
  justify-content: center;
  text-decoration: underline;
`;

/**
 * Quiets the upstream explorer down to the bare tree the board shows
 * (`src`, `client`, `tests` -- no workspace picker, no icon toolbar, no
 * per-section action buttons or labels): the Flow header's stepper already
 * owns Build/Deploy/Run/Test, and the footer `Footer` button above already
 * owns "new file".
 *
 * Every rule here is structural (`nth-child`), anchored either on
 * `#root-dir` (`PgView.ids.ROOT_DIR`, a stable id upstream itself relies
 * on) or on this wrapper's own DOM position, because none of the elements
 * being hidden carry a stable `id`/`class` of their own -- their generated
 * styled-components class names are build-dependent, and
 * `SectionHeader`/`SectionButton` carry no `title`/`aria-label` that would
 * differ between "Build" and "Deploy" etc. Verified against the live DOM
 * (not just the source) via the running dev server.
 */
const ExplorerContainer = styled.div`
  /* Workspaces row (project select + "Projects" label) and the icon
   * toolbar (new file/folder, collapse, share, ...) are the 1st and 2nd
   * children of Explorer's own root <div> -- true whether Explorer renders
   * its normal tree or the "temporary project" warning in Workspaces's
   * place (both are a single root <div>, so the position holds either
   * way). Anchor: positional, scoped under this wrapper's single child
   * (Explorer's own root). Failure mode: if the current project has *no*
   * workspaces at all, Explorer renders a single-branch "create a
   * project" empty state instead (a different component, not Workspaces +
   * Folders) -- its own first two children (an intro line and a "Create a
   * new project" button) would be hidden by the same rule. Flow only
   * mounts once a project is open, so this state should not occur in
   * practice, but it is a real gap if it ever does.
   */
  & > div > div:nth-child(1),
  & > div > div:nth-child(2) {
    display: none;
  }

  /* Program section (#root-dir's own first child): hides the "Program"
   * label and the Build/Deploy buttons, keeps a lone "+" (add-program,
   * shown only when the project has no \`src\` yet -- \`addProgram\`
   * scaffolds a real \`lib.rs\`, which the footer's plain \`createItem\`
   * does not, so it stays reachable). \`nth-child(2):nth-last-child(2)\`
   * only matches the first of *two* button siblings (Build);
   * \`nth-child(3)\` only exists when there is a second (Deploy); the lone
   * "+" is \`nth-child(2)\` with no \`nth-child(3)\`, so neither matches it.
   * Anchor: \`#root-dir\` (stable). Safe guard: \`:has(> button)\` ensures
   * the selector only matches a section header row (which contains direct
   * \`<button>\` children), never a folder/file row (no direct \`<button>\`
   * children). Failure mode: none -- always safe.
   */
  #root-dir > div:has(> button):first-child > div:first-child,
  #root-dir
    > div:has(> button):first-child
    > button:nth-child(2):nth-last-child(2),
  #root-dir > div:has(> button):first-child > button:nth-child(3) {
    display: none;
  }

  /* Client section ("Client" label + Run/Test, or their "Add client"/"Add
   * tests" fallbacks): always exactly 2 buttons, so no lone-button case to
   * preserve. Safe guard: \`:has(> button)\` ensures the selector only
   * matches a section header row (which contains direct \`<button>\`
   * children), never a folder/file row (no direct \`<button>\` children).
   * Position: normally \`#root-dir > div:nth-child(3)\` when the Program
   * row's own FolderGroup (the \`src\` tree) renders; shifts to
   * \`nth-child(2)\` when no \`src\` exists. When \`src\` is absent, the
   * Run/Test buttons (the "Add client"/"Add tests" fallbacks) simply stay
   * VISIBLE, which is acceptable degradation -- the empty-state fallbacks
   * are worth reaching. Folder rows are never matched because they contain
   * no direct \`<button>\` children.
   */
  #root-dir > div:has(> button):nth-child(3) > div:first-child,
  #root-dir > div:has(> button):nth-child(3) > button:nth-child(2),
  #root-dir > div:has(> button):nth-child(3) > button:nth-child(3) {
    display: none;
  }
`;
