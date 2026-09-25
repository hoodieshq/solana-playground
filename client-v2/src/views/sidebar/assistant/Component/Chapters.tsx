import { FC, useState } from "react";
import styled, { css, keyframes } from "styled-components";

/**
 * A conversation's chapters, the way Claude's desktop app shows a session's:
 * a short rail of dashes at the edge — one per chapter, the one you are in
 * brighter — that opens into a list of their names, and a click takes you
 * there.
 *
 * In a lesson a chapter is a step: everything asked while on step 2 sits under
 * "Step 2", so a long tutorial thread can be read back step by step instead of
 * scrolled through.
 */

export interface Chapter {
  /** The first item in it, which is where a jump lands */
  id: string;
  title: string;
}

interface ChaptersProps {
  chapters: Chapter[];
  current: string | null;
  onJump: (id: string) => void;
}

const Chapters: FC<ChaptersProps> = ({ chapters, current, onJump }) => {
  const [open, setOpen] = useState(false);

  return (
    <Wrap
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={(ev) => {
        if (!ev.currentTarget.contains(ev.relatedTarget as Node))
          setOpen(false);
      }}
    >
      <Rail aria-hidden="true">
        {chapters.map((c) => (
          <Dash key={c.id} $on={c.id === current} />
        ))}
      </Rail>

      {open && (
        <Card role="navigation" aria-label="Chapters">
          {chapters.map((c) => (
            <Item
              key={c.id}
              type="button"
              $on={c.id === current}
              aria-current={c.id === current ? "true" : undefined}
              onClick={() => {
                onJump(c.id);
                setOpen(false);
              }}
            >
              <ItemDash $on={c.id === current} aria-hidden="true" />
              <ItemTitle>{c.title}</ItemTitle>
            </Item>
          ))}
        </Card>
      )}
    </Wrap>
  );
};

export default Chapters;

const Wrap = styled.div`
  position: absolute;
  top: 0.75rem;
  right: 0.5rem;
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
`;

const Rail = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.3125rem;
  padding: 0.375rem 0.25rem;
  cursor: pointer;
`;

const Dash = styled.span<{ $on: boolean }>`
  ${({ theme, $on }) => css`
    display: block;
    width: ${$on ? "0.875rem" : "0.5rem"};
    height: 2px;
    border-radius: 1px;
    background: ${$on
      ? theme.colors.default.textPrimary
      : theme.colors.default.textSecondary + "66"};
    transition: width 160ms ease, background 160ms ease;

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  `}
`;

const appear = keyframes`
  from { opacity: 0; transform: translate3d(4px, 0, 0); }
  to   { opacity: 1; transform: none; }
`;

const Card = styled.div`
  ${({ theme }) => css`
    position: absolute;
    top: 0;
    right: 0;
    width: max-content;
    max-width: 16rem;
    padding: 0.25rem;
    border: 1px solid ${theme.colors.default.border};
    border-radius: 12px;
    background: #1c1c1e;
    box-shadow: ${theme.default.boxShadow};
    animation: ${appear} 140ms cubic-bezier(0.22, 1, 0.36, 1);

    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }
  `}
`;

const Item = styled.button<{ $on: boolean }>`
  ${({ theme, $on }) => css`
    display: flex;
    align-items: center;
    gap: 0.625rem;
    width: 100%;
    min-height: 1.875rem;
    padding: 0.25rem 0.625rem;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: ${$on
      ? theme.colors.default.textPrimary
      : theme.colors.default.textSecondary};
    font-family: inherit;
    font-size: 0.8125rem;
    text-align: left;
    cursor: pointer;

    &:hover,
    &:focus-visible {
      background: ${theme.colors.state.hover.bg};
      color: ${theme.colors.default.textPrimary};
      outline: none;
    }
  `}
`;

const ItemDash = styled.span<{ $on: boolean }>`
  ${({ theme, $on }) => css`
    flex-shrink: 0;
    width: 0.625rem;
    height: 2px;
    border-radius: 1px;
    background: ${$on
      ? theme.colors.default.textPrimary
      : theme.colors.default.textSecondary + "80"};
  `}
`;

const ItemTitle = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;
