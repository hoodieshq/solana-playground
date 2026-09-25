import {
  FC,
  Fragment,
  KeyboardEvent,
  MouseEvent,
  useRef,
  useState,
} from "react";
import styled, { css } from "styled-components";

import NavMenu, { anchorTo } from "./NavMenu";
import type { NavMenuAnchor, NavMenuGroup } from "./NavMenu";
import { ICONS } from "./icons";
import { Glyph, Label, rowBase } from "./parts";
import { snapshotOf } from "../../../features/persistence/model/snapshot";
import { PgCommon, PgExplorer, PgTutorial, PgView } from "../../../utils";
import { DeleteWorkspace } from "../../sidebar/explorer/Component/Modals";

interface ProjectListProps {
  projects: string[];
  /** The open workspace */
  current?: string;
  /** Home is showing, so no project row is where you are */
  homeActive: boolean;
  onOpen: (name: string) => void;
}

interface MenuState {
  name: string;
  anchor: NavMenuAnchor;
  /** Where focus goes back to */
  from: HTMLElement | null;
  /** The ⋮ button, when that is what opened it */
  toggle: HTMLElement | null;
}

interface EditState {
  name: string;
  value: string;
  error: string | null;
  pending: boolean;
}

/**
 * The projects this browser has, each with the menu Claude gives a session:
 * a ⋮ at the row's end on hover, or a right-click anywhere on it.
 *
 * Only what the explorer can really do is offered. Open, Pin, Rename,
 * Duplicate, Export and Delete all work on any row, open or not; there is no
 * "Share" or "Sync" here because sync already runs on every project once you
 * sign in, and share only knows the open project's files.
 */
const ProjectList: FC<ProjectListProps> = ({
  projects,
  current,
  homeActive,
  onOpen,
}) => {
  const [pins, setPins] = useState(readPins);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [edit, setEdit] = useState<EditState | null>(null);
  // The row a keyboard rename returns focus to, once it has re-rendered
  const refocus = useRef<string | null>(null);

  const pinned = new Set(pins);
  const ordered = [
    ...projects.filter((name) => pinned.has(idOf(name))),
    ...projects.filter((name) => !pinned.has(idOf(name))),
  ];

  const togglePin = (name: string) => {
    const id = idOf(name);
    const live = new Set(projects.map(idOf));
    const next = (pinned.has(id) ? pins.filter((p) => p !== id) : [...pins, id])
      // Forget pins on projects that have gone since
      .filter((p) => live.has(p));
    setPins(next);
    writePins(next);
  };

  const commit = async (state: EditState, fromKeyboard: boolean) => {
    const next = state.value.trim();
    if (!next || next === state.name) {
      if (fromKeyboard) refocus.current = state.name;
      setEdit(null);
      return;
    }

    const problem = nameProblem(next);
    if (problem) {
      // Enter means "use this", so say why not; leaving the field means
      // "never mind", so put the name back
      if (fromKeyboard) setEdit({ ...state, error: problem });
      else setEdit(null);
      return;
    }

    setEdit({ ...state, pending: true, error: null });
    try {
      await rename(state.name, next);
      if (fromKeyboard) refocus.current = next;
      setEdit(null);
    } catch (e) {
      setEdit({
        ...state,
        pending: false,
        error: e instanceof Error ? e.message : "Could not rename",
      });
    }
  };

  const onFieldKey = (
    ev: KeyboardEvent<HTMLInputElement>,
    state: EditState
  ) => {
    if (ev.key === "Enter") {
      ev.preventDefault();
      if (!state.pending) void commit(state, true);
    } else if (ev.key === "Escape") {
      ev.preventDefault();
      ev.stopPropagation();
      refocus.current = state.name;
      setEdit(null);
    }
  };

  const toggleMenu = (button: HTMLButtonElement, name: string) => {
    if (menu?.name === name) {
      setMenu(null);
      return;
    }
    setMenu({
      name,
      anchor: anchorTo(button, "below"),
      from: button,
      toggle: button,
    });
  };

  const openAtPointer = (ev: MouseEvent<HTMLDivElement>, name: string) => {
    ev.preventDefault();
    const row = ev.currentTarget;
    const r = row.getBoundingClientRect();
    const onRow =
      ev.clientX >= r.left &&
      ev.clientX <= r.right &&
      ev.clientY >= r.top &&
      ev.clientY <= r.bottom;
    setMenu({
      name,
      // The context-menu key reports no useful point, so it opens off the row
      anchor: onRow
        ? { kind: "point", x: ev.clientX, y: ev.clientY }
        : anchorTo(row, "below"),
      from: row.querySelector("button"),
      toggle: null,
    });
  };

  const actionsFor = (name: string): NavMenuGroup[] => {
    const isLesson = PgTutorial.isWorkspaceTutorial(name);
    const isHere = !homeActive && name === current;
    const isPinned = pinned.has(idOf(name));

    return [
      {
        id: "go",
        items: [
          // Already where you are, it would do nothing
          ...(isHere
            ? []
            : [
                {
                  id: "open",
                  label: "Open",
                  icon: ICONS.open,
                  hint: "O",
                  keys: ["o"],
                  onSelect: () => onOpen(name),
                },
              ]),
          {
            id: "pin",
            label: isPinned ? "Unpin" : "Pin",
            icon: isPinned ? ICONS.unpin : ICONS.pin,
            hint: "P",
            keys: ["p"],
            onSelect: () => togglePin(name),
          },
        ],
      },
      {
        id: "edit",
        items: [
          // A lesson's name is how its tutorial finds it: renamed, it would
          // read as a tutorial nobody has started
          ...(isLesson
            ? []
            : [
                {
                  id: "rename",
                  label: "Rename",
                  icon: ICONS.rename,
                  hint: "R",
                  keys: ["r"],
                  onSelect: () =>
                    setEdit({ name, value: name, error: null, pending: false }),
                },
              ]),
          {
            id: "duplicate",
            label: "Duplicate",
            icon: ICONS.duplicate,
            hint: "D",
            keys: ["d"],
            onSelect: () => void duplicate(name),
          },
          {
            id: "export",
            label: "Export as zip",
            icon: ICONS.download,
            hint: "E",
            keys: ["e"],
            onSelect: () => void exportZip(name),
          },
        ],
      },
      {
        id: "danger",
        items: [
          {
            id: "delete",
            label: "Delete",
            icon: ICONS.trash,
            // D is Duplicate's; Delete takes the key that means it anyway
            hint: "⌫",
            keys: ["Backspace", "Delete"],
            danger: true,
            // The dialog is the confirmation, and it already knows lessons
            onSelect: () =>
              void PgView.setModal(
                <DeleteWorkspace name={name} isLesson={isLesson} />
              ),
          },
        ],
      },
    ];
  };

  return (
    <>
      {ordered.map((name) => {
        if (edit?.name === name) {
          return (
            <Fragment key={name}>
              <Editing $invalid={!!edit.error}>
                <Glyph aria-hidden="true">{ICONS.folder}</Glyph>
                <NameField
                  autoFocus
                  value={edit.value}
                  readOnly={edit.pending}
                  spellCheck={false}
                  aria-label={`Rename ${name}`}
                  aria-invalid={!!edit.error}
                  aria-describedby={edit.error ? "nav-rename-error" : undefined}
                  onFocus={(ev) => ev.currentTarget.select()}
                  onChange={(ev) => {
                    const value = ev.target.value;
                    setEdit(
                      (state) => state && { ...state, value, error: null }
                    );
                  }}
                  onKeyDown={(ev) => onFieldKey(ev, edit)}
                  onBlur={() => {
                    if (!edit.pending) void commit(edit, false);
                  }}
                />
              </Editing>
              {edit.error && (
                <FieldError id="nav-rename-error" role="alert">
                  {edit.error}
                </FieldError>
              )}
            </Fragment>
          );
        }

        const isHere = !homeActive && name === current;
        const isPinned = pinned.has(idOf(name));
        const menuOpen = menu?.name === name;

        return (
          <Item
            key={name}
            $current={isHere}
            $open={menuOpen}
            $pinned={isPinned}
            onContextMenu={(ev) => openAtPointer(ev, name)}
          >
            <ItemButton
              ref={(el) => {
                if (el && refocus.current === name) {
                  refocus.current = null;
                  el.focus();
                }
              }}
              type="button"
              $current={isHere}
              aria-current={isHere ? "page" : undefined}
              onClick={() => onOpen(name)}
            >
              <Glyph aria-hidden="true">{ICONS.folder}</Glyph>
              <Label>{name}</Label>
            </ItemButton>
            {isPinned && (
              <PinMark aria-hidden="true" title="Pinned">
                {ICONS.pin}
              </PinMark>
            )}
            <More
              type="button"
              aria-label={`Actions for ${name}`}
              title="Actions"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={(ev) => toggleMenu(ev.currentTarget, name)}
            >
              {ICONS.more}
            </More>
          </Item>
        );
      })}

      {menu && (
        <NavMenu
          label={`Actions for ${menu.name}`}
          anchor={menu.anchor}
          groups={actionsFor(menu.name)}
          returnFocus={menu.from}
          toggle={menu.toggle}
          onClose={() => setMenu(null)}
        />
      )}
    </>
  );
};

export default ProjectList;

/* ── what the menu does ────────────────────────────────────────────────── */

/* Pins are this browser's, like the order of anything in a sidebar, so they
   live beside it rather than in the workspace. Keyed by the workspace's id,
   which survives a rename. */
const PINS_KEY = "flow-pinned-projects";

const readPins = (): string[] => {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(PINS_KEY) ?? "[]");
    return Array.isArray(value)
      ? value.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
};

const writePins = (ids: string[]) => {
  try {
    localStorage.setItem(PINS_KEY, JSON.stringify(ids));
  } catch {}
};

/** The stable id, or the name while the explorer has not loaded yet */
const idOf = (name: string) => PgExplorer.workspaceIdOf(name) ?? name;

/** Why a new name will not do, or `null` */
const nameProblem = (next: string) => {
  if (!PgExplorer.isWorkspaceNameValid(next)) {
    return "Letters, numbers, spaces and dashes only";
  }
  if (PgExplorer.allWorkspaceNames?.includes(next)) {
    return "A project already has that name";
  }
  return null;
};

/**
 * `renameWorkspace` renames the open workspace, so a project that is not open
 * is opened first — which is where a rename leaves you in any case, because
 * the rename itself reopens the project under its new name.
 */
const rename = async (name: string, next: string) => {
  if (PgExplorer.currentWorkspaceName !== name) {
    await PgExplorer.switchWorkspace(name);
  }
  await PgExplorer.renameWorkspace(next);
};

/**
 * The project's own files, whether it is open or not — the same serialiser
 * sync uses, which reads the open project from memory so an edit not yet
 * written still comes along. Dotfiles are the playground's rather than the
 * project's: the program keypair, open tabs, lesson progress. A copy that kept
 * the keypair would deploy over the original's program.
 */
const projectFiles = async (name: string) =>
  Object.entries((await snapshotOf(name)).files).filter(
    ([path]) => !path.split("/").some((part) => part.startsWith("."))
  );

/** "counter copy", then "counter copy 2", and so on */
const copyName = (name: string) => {
  const taken = new Set(PgExplorer.allWorkspaceNames ?? []);
  const base = `${name} copy`;
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) {
    if (!taken.has(`${base} ${n}`)) return `${base} ${n}`;
  }
};

/** Opens the copy, the way creating any project does */
const duplicate = async (name: string) => {
  try {
    await PgExplorer.createWorkspace(copyName(name), {
      files: await projectFiles(name),
    });
  } catch (e) {
    fail(`Could not duplicate ${name}`, e);
  }
};

/** The settings page's "Export project (zip)", for any project, open or not */
const exportZip = async (name: string) => {
  try {
    const files = await projectFiles(name);
    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();
    for (const [path, content] of files) zip.file(path, content);
    PgCommon.export(`${name}.zip`, await zip.generateAsync({ type: "blob" }));
  } catch (e) {
    fail(`Could not export ${name}`, e);
  }
};

const fail = (what: string, error: unknown) =>
  PgView.setToast(
    <span>
      {what}
      {error instanceof Error && error.message ? `: ${error.message}` : ""}
    </span>
  );

/* ── the rows ──────────────────────────────────────────────────────────── */

/* Revealed at the row's end on hover, on focus, and while its menu is open */
const More = styled.button`
  ${({ theme }) => css`
    position: absolute;
    top: 50%;
    right: 0.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.375rem;
    height: 1.375rem;
    padding: 0;
    border: none;
    border-radius: 5px;
    background: transparent;
    color: ${theme.colors.default.textSecondary};
    cursor: pointer;
    transform: translateY(-50%);
    transition: opacity 0.1s, color 0.1s;

    & > svg {
      width: 1rem;
      height: 1rem;
    }

    &:hover {
      color: ${theme.colors.default.textPrimary};
    }

    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
      outline-offset: -2px;
    }

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  `}
`;

/* A pinned row says so where the ⋮ will appear, and gives way to it */
const PinMark = styled.span`
  ${({ theme }) => css`
    position: absolute;
    top: 50%;
    right: 0.5625rem;
    display: flex;
    width: 0.75rem;
    height: 0.75rem;
    color: ${theme.colors.state.disabled.color};
    pointer-events: none;
    transform: translateY(-50%);
    transition: opacity 0.1s;

    & > svg {
      width: 100%;
      height: 100%;
    }

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  `}
`;

const ItemButton = styled.button<{ $current?: boolean }>`
  ${rowBase}
  ${({ theme }) => css`
    flex: 1;
    min-width: 0;
    background: transparent;

    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
      outline-offset: -2px;
    }
  `}
`;

/* The row and its ⋮ are siblings — a button cannot hold a button — so the
   fill is on this wrapper, and pointing at the ⋮ does not drop it */
const Item = styled.div<{
  $current: boolean;
  $open: boolean;
  $pinned: boolean;
}>`
  ${({ theme, $current, $open, $pinned }) => css`
    position: relative;
    display: flex;
    align-items: center;
    border-radius: 6px;
    background: ${$current || $open
      ? theme.colors.state.hover.bg
      : "transparent"};
    transition: background 0.1s;

    /* Room at the end for the pin, and for the ⋮ once it shows */
    & > ${ItemButton} {
      padding-right: ${$pinned || $open ? "1.875rem" : "0.5rem"};
    }
    & > ${More} {
      opacity: ${$open ? 1 : 0};
      color: ${$open
        ? theme.colors.default.textPrimary
        : theme.colors.default.textSecondary};
    }
    & > ${PinMark} {
      opacity: ${$open ? 0 : 1};
    }

    &:hover {
      background: ${theme.colors.state.hover.bg};
    }
    &:hover > ${ItemButton} {
      color: ${theme.colors.default.textPrimary};
    }
    &:hover > ${ItemButton}, &:focus-within > ${ItemButton} {
      padding-right: 1.875rem;
    }
    &:hover > ${More}, &:focus-within > ${More} {
      opacity: 1;
    }
    &:hover > ${PinMark}, &:focus-within > ${PinMark} {
      opacity: 0;
    }

    /* No hover to reveal it on a touch screen */
    @media (hover: none) {
      & > ${ItemButton} {
        padding-right: 1.875rem;
      }
      & > ${More} {
        opacity: 1;
      }
      & > ${PinMark} {
        display: none;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  `}
`;

/* The row, made editable in place: same height, same glyph, the name where
   the name was, and a ring in the accent — red while the name will not do */
const Editing = styled.div<{ $invalid: boolean }>`
  ${({ theme, $invalid }) => css`
    display: flex;
    align-items: center;
    gap: 0.5rem;
    height: 1.75rem;
    padding: 0 0.5rem;
    border-radius: 6px;
    background: ${theme.colors.state.hover.bg};
    box-shadow: inset 0 0 0 1px
      ${$invalid
        ? theme.colors.state.error.color
        : theme.colors.default.primary};
    color: ${theme.colors.default.textSecondary};
  `}
`;

const NameField = styled.input`
  ${({ theme }) => css`
    flex: 1;
    min-width: 0;
    padding: 0;
    border: none;
    background: transparent;
    color: ${theme.colors.default.textPrimary};
    font-family: inherit;
    font-size: 0.8125rem;
    outline: none;
  `}
`;

/* Under the field, starting where the name starts */
const FieldError = styled.p`
  ${({ theme }) => css`
    padding: 0.25rem 0.5rem 0.25rem 2rem;
    font-size: 0.75rem;
    line-height: 1.35;
    color: ${theme.colors.state.error.color};
  `}
`;
