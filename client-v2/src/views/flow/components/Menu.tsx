import {
  FC,
  ReactNode,
  RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import styled, { css, keyframes } from "styled-components";

/**
 * A small menu that opens from a control, the way Claude's do: a raised card of
 * rows, a check beside what is picked, a key hint at the right edge — and the
 * key works while the menu is open.
 *
 * Deliberately small. It opens above or below its anchor, right- or
 * left-aligned; a row can fold open a group of more rows in place rather than
 * flying out a submenu, which at the width of a resizable side pane would open
 * off the edge.
 *
 * It is drawn on the page's body and placed from the anchor's box, not nested
 * in the control's own column: the panes clip their overflow, and a menu that
 * opens leftward from a control near a pane's edge was being cut in half.
 * Placed that way it is also kept inside the window.
 */

export interface MenuRow {
  id: string;
  label: ReactNode;
  /** A key that picks this row while the menu is open, shown at the right */
  hint?: string;
  checked?: boolean;
  danger?: boolean;
  disabled?: boolean;
  /** A second, quieter line — why a row is disabled, say */
  note?: string;
  onSelect?: () => void;
  /** Rows folded under this one, opened in place */
  more?: MenuRow[];
  /** A hairline above this row */
  divider?: boolean;
}

interface MenuProps {
  rows: MenuRow[];
  onClose: () => void;
  /** The control it opened from; a click on it is not a click outside */
  anchorRef: RefObject<HTMLElement>;
  /** Where it opens relative to the anchor */
  placement?: "top-end" | "top-start" | "bottom-end" | "bottom-start";
  /** A heading row at the top */
  title?: string;
  minWidth?: string;
}

const Menu: FC<MenuProps> = ({
  rows,
  onClose,
  anchorRef,
  placement = "top-end",
  title,
  minWidth = "13.5rem",
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [place, setPlace] = useState<{ top: number; left: number } | null>(
    null
  );

  const visible = rows.flatMap((row) =>
    row.more && openGroup === row.id ? [row, ...row.more] : [row]
  );

  const pick = (row: MenuRow) => {
    if (row.disabled) return;
    if (row.more) {
      setOpenGroup((g) => (g === row.id ? null : row.id));
      return;
    }
    row.onSelect?.();
    onClose();
  };

  // Keep the latest rows for the key handler without re-binding it
  const latest = useRef({ visible, pick });
  latest.current = { visible, pick };

  useEffect(() => {
    const onDown = (ev: MouseEvent) => {
      const target = ev.target as Node;
      if (ref.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    };
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        ev.preventDefault();
        onClose();
        anchorRef.current?.focus();
        return;
      }
      const items = [
        ...(ref.current?.querySelectorAll<HTMLButtonElement>(
          "[role^='menuitem']:not(:disabled)"
        ) ?? []),
      ];
      const at = items.indexOf(document.activeElement as HTMLButtonElement);
      if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
        ev.preventDefault();
        const step = ev.key === "ArrowDown" ? 1 : -1;
        items[(at + step + items.length) % items.length]?.focus();
        return;
      }
      if (ev.metaKey || ev.ctrlKey || ev.altKey || ev.key.length !== 1) return;
      const row = latest.current.visible.find(
        (r) => r.hint?.toLowerCase() === ev.key.toLowerCase()
      );
      if (row) {
        ev.preventDefault();
        latest.current.pick(row);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [anchorRef, onClose]);

  /* Placed against the anchor, then nudged back inside the window: measured
     after it has drawn, since its width depends on its rows */
  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    const card = ref.current;
    if (!anchor || !card) return;
    const position = () => {
      const a = anchor.getBoundingClientRect();
      const { width, height } = card.getBoundingClientRect();
      const [side, align] = placement.split("-");
      const edge = 8;
      let left = align === "end" ? a.right - width : a.left;
      left = Math.max(edge, Math.min(left, window.innerWidth - width - edge));
      let top = side === "top" ? a.top - height - 6 : a.bottom + 6;
      // No room on the asked side: take the other one
      if (top < edge) top = a.bottom + 6;
      if (top + height > window.innerHeight - edge) top = a.top - height - 6;
      setPlace({ top: Math.max(edge, top), left });
    };
    position();
    window.addEventListener("resize", position);
    return () => window.removeEventListener("resize", position);
  }, [anchorRef, placement, openGroup]);

  // Focus the checked row, or the first, so the arrows start somewhere. Once,
  // on opening — not on every render of whatever hosts it.
  useEffect(() => {
    const first =
      ref.current?.querySelector<HTMLButtonElement>("[aria-checked='true']") ??
      ref.current?.querySelector<HTMLButtonElement>("[role^='menuitem']");
    first?.focus({ preventScroll: true });
  }, []);

  return createPortal(
    <Card
      ref={ref}
      role="menu"
      $placement={placement}
      style={{
        minWidth,
        top: place?.top ?? 0,
        left: place?.left ?? 0,
        visibility: place ? "visible" : "hidden",
      }}
      aria-label={title}
    >
      {title && <Title>{title}</Title>}
      {visible.map((row) => {
        const nested = rows.every((r) => r.id !== row.id);
        const radio = row.checked !== undefined;
        return (
          <div key={row.id}>
            {row.divider && <Divider />}
            <Row
              type="button"
              role={radio ? "menuitemradio" : "menuitem"}
              aria-checked={radio ? row.checked : undefined}
              aria-expanded={row.more ? openGroup === row.id : undefined}
              disabled={row.disabled}
              $danger={row.danger}
              $nested={nested}
              onClick={() => pick(row)}
            >
              <RowText>
                <span>{row.label}</span>
                {row.note && <Note>{row.note}</Note>}
              </RowText>
              <RowEnd>
                {row.checked && <Check aria-hidden="true">{ICONS.check}</Check>}
                {row.more ? (
                  <Fold $open={openGroup === row.id} aria-hidden="true">
                    {ICONS.chevron}
                  </Fold>
                ) : (
                  row.hint && <Hint aria-hidden="true">{row.hint}</Hint>
                )}
              </RowEnd>
            </Row>
          </div>
        );
      })}
    </Card>,
    document.body
  );
};

export default Menu;

/** Open/close state and the anchor ref for a control that opens a menu */
export const useMenu = <T extends HTMLElement = HTMLButtonElement>() => {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<T>(null);
  // Stable, so the menu's listeners are bound once per opening
  const toggle = useCallback(() => setOpen((o) => !o), []);
  const close = useCallback(() => setOpen(false), []);
  return { open, anchorRef, toggle, close };
};

const svg = (d: JSX.Element) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {d}
  </svg>
);

const ICONS = {
  check: svg(<path d="m5 12.5 4.5 4.5L19 7.5" />),
  chevron: svg(<path d="m9 6 6 6-6 6" />),
};

const appear = keyframes`
  from { opacity: 0; transform: translate3d(0, 4px, 0) scale(0.98); }
  to   { opacity: 1; transform: none; }
`;

/* Raised one step above whatever it opens over, with the one soft shadow the
   theme allows */
const Card = styled.div<{ $placement: NonNullable<MenuProps["placement"]> }>`
  ${({ theme, $placement }) => {
    const [side, align] = $placement.split("-");
    return css`
      position: fixed;
      z-index: 60;
      /* On the body, outside the app's root: the face has to be said here */
      font-family: ${theme.font.other.family};
      color: ${theme.colors.default.textPrimary};
      max-width: min(20rem, calc(100vw - 2rem));
      padding: 0.25rem;
      border: 1px solid ${theme.colors.default.border};
      border-radius: 12px;
      background: #1c1c1e;
      box-shadow: ${theme.default.boxShadow};
      animation: ${appear} 140ms cubic-bezier(0.22, 1, 0.36, 1);
      transform-origin: ${side === "top" ? "bottom" : "top"}
        ${align === "end" ? "right" : "left"};

      @media (prefers-reduced-motion: reduce) {
        animation: none;
      }
    `;
  }}
`;

const Title = styled.div`
  ${({ theme }) => css`
    padding: 0.375rem 0.625rem 0.25rem;
    color: ${theme.colors.default.textSecondary};
    font-size: 0.75rem;
  `}
`;

const Divider = styled.div`
  ${({ theme }) => css`
    height: 1px;
    margin: 0.25rem 0.375rem;
    background: ${theme.colors.default.border};
  `}
`;

const Row = styled.button<{ $danger?: boolean; $nested?: boolean }>`
  ${({ theme, $danger, $nested }) => css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    width: 100%;
    min-height: 2rem;
    padding: 0.3125rem 0.625rem 0.3125rem ${$nested ? "1.375rem" : "0.625rem"};
    border: none;
    border-radius: 8px;
    background: transparent;
    color: ${$danger
      ? theme.colors.state.error.color
      : theme.colors.default.textPrimary};
    font-family: inherit;
    font-size: 0.8125rem;
    text-align: left;
    cursor: pointer;

    &:hover:not(:disabled),
    &:focus-visible {
      background: ${theme.colors.state.hover.bg};
      outline: none;
    }

    &:disabled {
      color: ${theme.colors.state.disabled.color};
      cursor: default;
    }
  `}
`;

const RowText = styled.span`
  display: flex;
  flex-direction: column;
  min-width: 0;

  & > span:first-child {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const Note = styled.span`
  ${({ theme }) => css`
    color: ${theme.colors.default.textSecondary};
    font-size: 0.75rem;
  `}
`;

const RowEnd = styled.span`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
`;

const Check = styled.span`
  display: flex;
  width: 0.875rem;
  height: 0.875rem;

  & > svg {
    width: 100%;
    height: 100%;
  }
`;

const Hint = styled.span`
  ${({ theme }) => css`
    min-width: 0.75rem;
    color: ${theme.colors.default.textSecondary};
    font-size: 0.75rem;
    text-align: right;
  `}
`;

const Fold = styled.span<{ $open: boolean }>`
  ${({ theme, $open }) => css`
    display: flex;
    width: 0.875rem;
    height: 0.875rem;
    color: ${theme.colors.default.textSecondary};
    transform: rotate(${$open ? 90 : 0}deg);
    transition: transform 140ms ease;

    & > svg {
      width: 100%;
      height: 100%;
    }

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  `}
`;
