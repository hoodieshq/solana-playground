import type { FC } from "react";
import { useState } from "react";
import styled, { css } from "styled-components";

import Eyebrow from "./Eyebrow";
import ProjectsTab from "./ProjectsTab";
import Explorer from "../../sidebar/explorer/Component";
import { useCreateItem } from "../../sidebar/explorer/Component/useCreateItem";
import { PANEL_RADIUS } from "../tokens";

type Tab = "projects" | "files";

interface LeftPanelProps {
  onNewProject: () => void;
}

const LeftPanel: FC<LeftPanelProps> = ({ onNewProject }) => {
  const [tab, setTab] = useState<Tab>("files");
  // The same upstream hook `ExplorerButtons.tsx` calls for its own hidden
  // "New file" icon button (`NewItemButton` -> `useCreateItem`) -- no
  // upstream edit, no programmatic `.click()` of a hidden button.
  const { createItem } = useCreateItem();

  return (
    <Wrapper>
      <Tabs role="tablist">
        {(["projects", "files"] as const).map((t) => (
          <TabButton
            key={t}
            id={`flow-left-tab-${t}`}
            role="tab"
            aria-selected={tab === t}
            aria-controls="flow-left-tabpanel"
            $active={tab === t}
            onClick={() => setTab(t)}
          >
            {t === "projects" ? "Projects" : "Files"}
          </TabButton>
        ))}
      </Tabs>
      <Body
        id="flow-left-tabpanel"
        role="tabpanel"
        aria-labelledby={`flow-left-tab-${tab}`}
      >
        {tab === "projects" ? (
          <ProjectsTab onNew={onNewProject} />
        ) : (
          <>
            <Eyebrow>Files</Eyebrow>
            <ExplorerContainer>
              <Explorer />
            </ExplorerContainer>
          </>
        )}
      </Body>
      {tab === "files" && (
        <Footer type="button" onClick={createItem}>
          + New file
        </Footer>
      )}
    </Wrapper>
  );
};

export default LeftPanel;

// A floating panel like Center and Right (see `views/flow/tokens.ts`):
// full 1px border, rounded corners, the raised surface background instead
// of the black page ground.
const Wrapper = styled.aside`
  ${({ theme }) => css`
    width: 14.5rem;
    display: flex;
    flex-direction: column;
    border: 1px solid ${theme.colors.default.border};
    border-radius: ${PANEL_RADIUS};
    background: ${theme.colors.default.bgSecondary};
    overflow: hidden;
  `}
`;

const Tabs = styled.div`
  ${({ theme }) => css`
    display: flex;
    border-bottom: 1px solid ${theme.colors.default.border};
  `}
`;

const TabButton = styled.button<{ $active: boolean }>`
  ${({ theme, $active }) => css`
    flex: 1;
    padding: 0.625rem;
    border: none;
    border-bottom: 2px solid
      ${$active ? theme.colors.default.primary : "transparent"};
    background: transparent;
    color: ${$active
      ? theme.colors.default.textPrimary
      : theme.colors.default.textSecondary};
    font: inherit;
    font-size: ${theme.font.other.size.small};
    letter-spacing: 0.04em;
    text-transform: uppercase;
    cursor: pointer;
    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
      outline-offset: -2px;
    }
  `}
`;

const Body = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
`;

// Quiet, full-width footer button pinned below the scrollable tree (a
// sibling of `Body`, not inside it, so it never scrolls away). Reuses
// `createItem` from `useCreateItem` -- the exact upstream create-item flow,
// not a re-implementation.
const Footer = styled.button`
  ${({ theme }) => css`
    flex-shrink: 0;
    width: 100%;
    padding: 0.625rem 0.75rem;
    border: none;
    border-top: 1px solid ${theme.colors.default.border};
    background: transparent;
    color: ${theme.colors.default.textSecondary};
    font: inherit;
    text-align: left;
    cursor: pointer;
    &:hover {
      color: ${theme.colors.default.textPrimary};
      background: ${theme.colors.default.bgPrimary};
    }
    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
      outline-offset: -2px;
    }
  `}
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
