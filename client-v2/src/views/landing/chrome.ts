import styled, { css } from "styled-components";

import { HEADLINE, INK } from "../deck/tokens";

/**
 * What the landing and the UX page share at the top: the Figma's 1920 frame
 * as a unit, and the two white pills — the lockup on the left, links on the
 * right. One definition, so the pages cannot drift apart.
 */

/** A length on the Figma's 1920 frame, in the window's pixels */
export const u = (n: number) => `calc(${n} * var(--u))`;

/** Put on a page's root: one Figma pixel, scaled with the window up to 1920 */
export const frameUnit = css`
  --u: calc(min(100vw, 1920px) / 1920);
`;

export const TopBar = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 ${u(58)} 0 ${u(80)};
`;

const pill = css`
  display: flex;
  align-items: center;
  height: max(${u(57)}, 2.5rem);
  border-radius: max(${u(20)}, 0.875rem);
  background: #ffffff;
`;

export const LogoPill = styled.a`
  ${pill}
  padding: 0 max(${u(24)}, 0.875rem);
  color: ${INK};

  & > svg {
    width: max(${u(189)}, 7.5rem);
    height: auto;
    display: block;
  }

  &:focus-visible {
    outline: 2px solid #ffffff;
    outline-offset: 3px;
  }
`;

export const NavPill = styled.nav`
  ${pill}
  gap: max(${u(31)}, 1rem);
  padding: 0 max(${u(25)}, 1rem);

  @media (max-width: 40rem) {
    display: none;
  }
`;

/** A link in the pill — an anchor, or a button where it acts rather than goes */
const link = css`
  padding: 0;
  border: none;
  background: none;
  color: rgba(11, 11, 22, 0.66);
  font-family: ${HEADLINE};
  font-size: max(${u(22.7)}, 0.9375rem);
  font-weight: 500;
  letter-spacing: -0.01em;
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
  transition: color 0.15s ease;

  &:hover {
    color: #0b0b16;
  }

  &:focus-visible {
    outline: 2px solid ${INK};
    outline-offset: 4px;
    border-radius: 4px;
  }
`;

export const NavLink = styled.a`
  ${link}
`;

export const NavButton = styled.button`
  ${link}
`;
