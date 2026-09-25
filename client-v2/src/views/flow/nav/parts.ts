import { createContext } from "react";
import styled, { css, keyframes } from "styled-components";

import { PgCommon } from "../../../utils";

/** The column open, and folded to its rail */
export const SIDEBAR_WIDTH = "14.5rem";
export const RAIL_WIDTH = "3.25rem";

/**
 * What the sidebar tells the session footer it hosts. Flow builds that footer
 * (`header/StatusChips`) and hands it over whole, so this is the only way it
 * learns whether to draw itself for the rail — and whether the column has
 * changed shape since it mounted, which is when what appears should fade in
 * rather than simply be there on first paint.
 */
export const NavContext = createContext({ collapsed: false, animate: false });

/** "⌘B" on a Mac and "Ctrl+B" elsewhere: `PgKeybind` takes either for Ctrl */
export const shortcut = (key: string) =>
  PgCommon.getOS() === "MacOS" ? `⌘${key}` : `Ctrl+${key}`;

const appear = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;

/** For whatever replaces something else when the column changes shape */
export const fadeIn = css`
  animation: ${appear} 160ms ease-out both;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

/* The icon column. Every row in the sidebar puts its glyph in this 16px box,
   so every label starts on the same line whatever drew the glyph. */
export const Glyph = styled.span`
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

/* A project name can be long; it truncates rather than wrapping, because a
   two-line row breaks the rhythm of every row above it. */
export const Label = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

/* Sentence case and grey: a section says what it holds, it does not shout */
export const Heading = styled.h2`
  ${({ theme }) => css`
    margin: 0 0 0.25rem;
    padding: 0 0.5rem;
    font-size: 0.75rem;
    font-weight: 400;
    color: ${theme.colors.state.disabled.color};
  `}
`;

/* One row shape for every destination, whether it is a button or a link —
   the eye should not be able to tell which is which. Layout and tone only;
   `Row` adds the fill, and a project row puts it on its wrapper instead. */
export const rowBase = css<{ $current?: boolean }>`
  ${({ theme, $current }) => css`
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    height: 1.75rem;
    padding: 0 0.5rem;
    border: none;
    border-radius: 6px;
    color: ${$current
      ? theme.colors.default.textPrimary
      : theme.colors.default.textSecondary};
    font-family: inherit;
    font-size: 0.8125rem;
    font-weight: ${$current ? 500 : 400};
    text-align: left;
    white-space: nowrap;
    text-decoration: none;
    cursor: pointer;
    transition: background 0.1s, color 0.1s;

    /* Where you are carries the accent — the one colour the theme keeps for
       what is current — on its glyph, over the flat tint Linear, Claude and
       Vercel all use. The whole row in the gradient stroke read as an alert
       on a list of projects; a purple glyph says the same thing quietly. */
    ${$current &&
    css`
      & > ${Glyph} {
        color: ${theme.colors.default.primary};
      }
    `}

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  `}
`;

export const Row = styled.button<{ $current?: boolean }>`
  ${rowBase}
  ${({ theme, $current }) => css`
    background: ${$current ? theme.colors.state.hover.bg : "transparent"};

    &:hover {
      background: ${theme.colors.state.hover.bg};
      color: ${theme.colors.default.textPrimary};
    }

    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
      outline-offset: -2px;
    }
  `}
`;

/* The rail's version of a row: the glyph alone, in a square, marked the same
   way when it is where you are. */
export const RailButton = styled.button<{ $current?: boolean }>`
  ${({ theme, $current }) => css`
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.25rem;
    height: 2.25rem;
    padding: 0;
    border: none;
    border-radius: 8px;
    background: ${$current ? theme.colors.state.hover.bg : "transparent"};
    color: ${$current
      ? theme.colors.default.primary
      : theme.colors.default.textSecondary};
    cursor: pointer;
    transition: background 0.1s, color 0.1s;

    & > svg {
      width: 1.125rem;
      height: 1.125rem;
    }

    &:hover {
      background: ${theme.colors.state.hover.bg};
      color: ${$current
        ? theme.colors.default.primary
        : theme.colors.default.textPrimary};
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
