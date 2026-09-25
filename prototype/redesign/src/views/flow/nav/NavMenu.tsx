import {
  FC,
  Fragment,
  KeyboardEvent,
  MouseEvent,
  ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import styled, { css, keyframes } from "styled-components";

/**
 * The sidebar's one menu, for a project's row and for the account.
 *
 * Claude's session menu is the reference: a compact list, an icon and a label
 * on each row, the key that chooses it right-aligned, hairlines between the
 * groups and the destructive one last, in red. While it is open, pressing an
 * item's key chooses it; Escape, a press outside, a scroll of the list it
 * hangs off, or a resize puts it away. It is the WAI-ARIA menu pattern, so
 * arrow keys, Home and End move through it and focus goes back where it came
 * from.
 *
 * It renders into `document.body`. The sidebar clips — it has to, to fold to
 * a rail — so a menu drawn inside it would be cut off at its edge; portalled,
 * it opens over the content beside the column. The cost is that nothing is
 * inherited there, so the face, size and colour are set here.
 */

export interface NavMenuItem {
  id: string;
  label: ReactNode;
  /** A second, quieter line: the account's handle */
  description?: ReactNode;
  icon?: ReactNode;
  /** Right-aligned: the key that chooses it, a value, or an external mark */
  hint?: ReactNode;
  /** Keys that choose this item while the menu is open, matched loosely */
  keys?: string[];
  onSelect?: () => void;
  /** A link rather than an action */
  href?: string;
  /** Opens in a new tab */
  external?: boolean;
  danger?: boolean;
  /** Stay open after choosing: the item swaps what the menu shows */
  keepOpen?: boolean;
}

export interface NavMenuGroup {
  id: string;
  /** Sentence case, grey — for a group that is not the product */
  label?: string;
  items: NavMenuItem[];
}

export type NavMenuPlacement = "below" | "above" | "right";

export type NavMenuAnchor =
  | { kind: "point"; x: number; y: number }
  | { kind: "rect"; rect: DOMRect; placement: NavMenuPlacement };

/** Hang a menu off an element, measured now */
export const anchorTo = (
  el: Element,
  placement: NavMenuPlacement
): NavMenuAnchor => ({
  kind: "rect",
  rect: el.getBoundingClientRect(),
  placement,
});

interface NavMenuProps {
  /** What the menu acts on, for assistive tech */
  label: string;
  anchor: NavMenuAnchor;
  groups: NavMenuGroup[];
  onClose: () => void;
  /** A line above the items: a confirmation's question */
  note?: ReactNode;
  /** Where focus goes back to when the menu closes */
  returnFocus?: HTMLElement | null;
  /** The control that opened it, which closes it again — so pressing it is
      not a press outside */
  toggle?: HTMLElement | null;
  /** Take the anchor's width: a menu that opens off a full-width row */
  matchWidth?: boolean;
  minWidth?: string;
  /** The item that takes focus; changing it refocuses, for swapped contents */
  initialFocus?: string;
}

/** Nearest the menu comes to the window's edge */
const EDGE = 8;
/** Between the menu and what it opens from */
const OFFSET = 4;

const NavMenu: FC<NavMenuProps> = ({
  label,
  anchor,
  groups,
  onClose,
  note,
  returnFocus,
  toggle,
  matchWidth,
  minWidth = "12.5rem",
  initialFocus,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  // Drawn once where it lands, then moved before the browser paints
  const [position, setPosition] = useState({ top: 0, left: 0, rise: false });

  // The listeners are registered once, so they read the latest props here
  const latest = useRef({ onClose, returnFocus, toggle });
  latest.current = { onClose, returnFocus, toggle };

  // Measured again whenever the contents change, not just the anchor: the
  // sign-out question is shorter than the menu it replaces, and a menu opening
  // upward has to move with its own height. It settles, because the state only
  // changes when the numbers do.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const next = place(anchor, width, height);
    setPosition((prev) =>
      prev.top === next.top &&
      prev.left === next.left &&
      prev.rise === next.rise
        ? prev
        : next
    );
  }, [anchor, groups, note]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const target =
      (initialFocus &&
        el.querySelector<HTMLElement>(`[data-item="${initialFocus}"]`)) ||
      el.querySelector<HTMLElement>('[role="menuitem"]');
    (target ?? el).focus({ preventScroll: true });
  }, [initialFocus]);

  // Focus goes back to the trigger, unless the choice moved it on — a rename
  // field, a dialog — or a press outside put it somewhere else.
  useLayoutEffect(() => {
    const el = ref.current;
    return () => {
      const active = document.activeElement;
      if (!active || active === document.body || el?.contains(active)) {
        latest.current.returnFocus?.focus({ preventScroll: true });
      }
    };
  }, []);

  useEffect(() => {
    const close = () => latest.current.onClose();
    const onPress = (ev: Event) => {
      const target = ev.target;
      if (!(target instanceof Node)) return;
      if (ref.current?.contains(target)) return;
      if (latest.current.toggle?.contains(target)) return;
      close();
    };
    // Only a scroll that moves what it hangs off: the console streaming output
    // somewhere else in the window is not a reason to shut it
    const onScroll = (ev: Event) => {
      const from = latest.current.returnFocus;
      if (ev.target instanceof Node && from && ev.target.contains(from)) {
        close();
      }
    };

    document.addEventListener("mousedown", onPress, true);
    document.addEventListener("touchstart", onPress, true);
    document.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", close);
    window.addEventListener("blur", close);
    return () => {
      document.removeEventListener("mousedown", onPress, true);
      document.removeEventListener("touchstart", onPress, true);
      document.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("blur", close);
    };
  }, []);

  const choose = (item: NavMenuItem) => {
    item.onSelect?.();
    if (item.keepOpen) return;
    // A link closes a tick later, so it is still in the page when the
    // browser follows it
    if (item.href) window.setTimeout(() => latest.current.onClose());
    else onClose();
  };

  const move = (to: (index: number, count: number) => number) => {
    const items = Array.from(
      ref.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []
    );
    if (!items.length) return;
    const index = items.indexOf(document.activeElement as HTMLElement);
    items[to(index, items.length)]?.focus({ preventScroll: true });
  };

  const onKeyDown = (ev: KeyboardEvent<HTMLDivElement>) => {
    switch (ev.key) {
      case "ArrowDown":
        ev.preventDefault();
        move((i, n) => (i + 1) % n);
        return;
      case "ArrowUp":
        ev.preventDefault();
        move((i, n) => (i <= 0 ? n - 1 : i - 1));
        return;
      case "Home":
        ev.preventDefault();
        move(() => 0);
        return;
      case "End":
        ev.preventDefault();
        move((_, n) => n - 1);
        return;
      case "Escape":
        ev.preventDefault();
        ev.stopPropagation();
        onClose();
        return;
      // Closes, and lets the key carry on from the trigger
      case "Tab":
        onClose();
        return;
      default:
        break;
    }

    if (ev.metaKey || ev.ctrlKey || ev.altKey) return;

    const key = ev.key.toLowerCase();
    const item = groups
      .flatMap((group) => group.items)
      .find((candidate) =>
        candidate.keys?.some((k) => k.toLowerCase() === key)
      );
    if (item) {
      ev.preventDefault();
      ev.stopPropagation();
      // A click rather than a call, so a link opens the way a link does
      ref.current
        ?.querySelector<HTMLElement>(`[data-item="${item.id}"]`)
        ?.click();
      return;
    }

    // Space chooses a link as well as a button
    if (ev.key === " " && document.activeElement instanceof HTMLAnchorElement) {
      ev.preventDefault();
      document.activeElement.click();
    }
  };

  const renderItem = (item: NavMenuItem) => {
    const common = {
      role: "menuitem" as const,
      tabIndex: -1,
      "data-item": item.id,
      "aria-keyshortcuts": item.keys?.join(" "),
      $danger: item.danger,
      $tall: !!item.description,
      onClick: () => choose(item),
      // The pointer and the keyboard move one highlight, not two
      onMouseMove: (ev: MouseEvent<HTMLElement>) => {
        if (document.activeElement !== ev.currentTarget) {
          ev.currentTarget.focus({ preventScroll: true });
        }
      },
    };
    const content = (
      <>
        <ItemIcon aria-hidden="true">{item.icon}</ItemIcon>
        <ItemText>
          <ItemLabel>{item.label}</ItemLabel>
          {item.description && (
            <ItemDescription>{item.description}</ItemDescription>
          )}
        </ItemText>
        {item.hint && <ItemHint>{item.hint}</ItemHint>}
      </>
    );

    return item.href ? (
      <ItemLink
        key={item.id}
        href={item.href}
        target={item.external ? "_blank" : undefined}
        rel={item.external ? "noreferrer" : undefined}
        {...common}
      >
        {content}
      </ItemLink>
    ) : (
      <ItemButton key={item.id} type="button" {...common}>
        {content}
      </ItemButton>
    );
  };

  return createPortal(
    <Surface
      ref={ref}
      role="menu"
      aria-label={label}
      tabIndex={-1}
      $rise={position.rise}
      style={{
        top: position.top,
        left: position.left,
        minWidth,
        width:
          matchWidth && anchor.kind === "rect" ? anchor.rect.width : undefined,
      }}
      onKeyDown={onKeyDown}
      onContextMenu={(ev) => ev.preventDefault()}
    >
      {note && <Note>{note}</Note>}
      {groups.map((group, index) => (
        <Fragment key={group.id}>
          {(index > 0 || !!note) && <Separator role="separator" />}
          <div role="group" aria-label={group.label}>
            {group.label && (
              <GroupLabel aria-hidden="true">{group.label}</GroupLabel>
            )}
            {group.items.map(renderItem)}
          </div>
        </Fragment>
      ))}
    </Surface>,
    document.body
  );
};

export default NavMenu;

/**
 * Where the menu goes: off its anchor, flipped when there is no room on the
 * preferred side, then held inside the window. `rise` says it opened upward,
 * so it can enter from below.
 */
const place = (anchor: NavMenuAnchor, width: number, height: number) => {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let top: number;
  let left: number;

  if (anchor.kind === "point") {
    left = anchor.x + width > vw - EDGE ? anchor.x - width : anchor.x;
    top = anchor.y + height > vh - EDGE ? anchor.y - height : anchor.y;
  } else if (anchor.placement === "right") {
    // Level with the bottom of what opened it: the rail's account button
    left = anchor.rect.right + OFFSET * 2;
    top = anchor.rect.bottom - height;
  } else if (anchor.placement === "above") {
    left = anchor.rect.left;
    top = anchor.rect.top - OFFSET - height;
    if (top < EDGE) top = anchor.rect.bottom + OFFSET;
  } else {
    left = anchor.rect.left;
    top = anchor.rect.bottom + OFFSET;
    if (top + height > vh - EDGE) top = anchor.rect.top - OFFSET - height;
  }

  const from = anchor.kind === "point" ? anchor.y : anchor.rect.bottom;
  return {
    top: Math.round(Math.max(EDGE, Math.min(top, vh - height - EDGE))),
    left: Math.round(Math.max(EDGE, Math.min(left, vw - width - EDGE))),
    rise: top < from,
  };
};

const enter = keyframes`
  from { opacity: 0; transform: translateY(var(--menu-shift)); }
  to   { opacity: 1; transform: none; }
`;

const Surface = styled.div<{ $rise: boolean }>`
  ${({ theme, $rise }) => css`
    position: fixed;
    z-index: 20;
    max-height: calc(100vh - ${EDGE * 2}px);
    overflow-y: auto;
    padding: 0.25rem;
    border: 1px solid ${theme.colors.default.border};
    border-radius: ${theme.default.borderRadius};
    background: ${theme.colors.default.bgSecondary};
    box-shadow: ${theme.default.boxShadow};
    color: ${theme.colors.default.textPrimary};
    font-family: ${theme.font.other.family};
    font-size: 0.8125rem;
    line-height: 1.3;
    outline: none;
    /* In from the side it opened toward, a few pixels — enough to read as
       coming from the row, not so much that it reads as motion */
    --menu-shift: ${$rise ? "3px" : "-3px"};
    animation: ${enter} 120ms cubic-bezier(0.2, 0, 0, 1);

    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }
  `}
`;

const Note = styled.p`
  padding: 0.5rem 0.5rem 0.375rem;
  font-weight: 500;
`;

/* Full-bleed, like every other rule in the product */
const Separator = styled.div`
  height: 1px;
  margin: 0.25rem -0.25rem;
  background: ${({ theme }) => theme.colors.default.border};
`;

const GroupLabel = styled.div`
  ${({ theme }) => css`
    padding: 0.375rem 0.5rem 0.25rem;
    font-size: 0.75rem;
    color: ${theme.colors.state.disabled.color};
  `}
`;

/* The icon column: the same 16px box as the sidebar's rows, empty when an item
   has no icon, so every label in the menu starts on one line */
const ItemIcon = styled.span`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1rem;
  height: 1rem;

  & > svg {
    width: 100%;
    height: 100%;
  }
`;

const ItemText = styled.span`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
`;

const ItemLabel = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ItemDescription = styled.span`
  ${({ theme }) => css`
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 0.75rem;
    color: ${theme.colors.state.disabled.color};
  `}
`;

const ItemHint = styled.span`
  ${({ theme }) => css`
    flex-shrink: 0;
    display: flex;
    align-items: center;
    padding-left: 0.75rem;
    font-size: 0.75rem;
    font-variant-numeric: tabular-nums;
    color: ${theme.colors.state.disabled.color};

    & > svg {
      width: 0.875rem;
      height: 0.875rem;
    }
  `}
`;

const itemCss = css<{ $danger?: boolean; $tall?: boolean }>`
  ${({ theme, $danger, $tall }) => css`
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    min-height: 1.875rem;
    padding: ${$tall ? "0.3125rem 0.5rem" : "0 0.5rem"};
    border: none;
    border-radius: 8px;
    background: transparent;
    color: ${$danger
      ? theme.colors.state.error.color
      : theme.colors.default.textPrimary};
    font: inherit;
    text-align: left;
    text-decoration: none;
    white-space: nowrap;
    cursor: pointer;
    outline: none;

    & > ${ItemIcon} {
      color: ${$danger
        ? theme.colors.state.error.color
        : theme.colors.default.textSecondary};
    }

    &:hover,
    &:focus-visible {
      background: ${theme.colors.state.hover.bg};

      & > ${ItemIcon} {
        color: ${$danger
          ? theme.colors.state.error.color
          : theme.colors.default.textPrimary};
      }
    }

    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
      outline-offset: -2px;
    }
  `}
`;

const ItemButton = styled.button<{ $danger?: boolean; $tall?: boolean }>`
  ${itemCss}
`;

const ItemLink = styled.a<{ $danger?: boolean; $tall?: boolean }>`
  ${itemCss}
`;
