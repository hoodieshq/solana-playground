import { FC, MouseEvent, useEffect, useRef, useState } from "react";
import styled, { css } from "styled-components";

import { HEADLINE, INK } from "../deck/tokens";
import { u } from "./chrome";

/**
 * The landing's links on a phone, where the pill that holds them has no room.
 * A white pill beside the lockup opens them, the same shape as the lockup; a
 * sheet comes down from the top with each link a full row.
 *
 * Closed, the sheet is out of reach as well as out of sight; open, it takes
 * focus, gives it back to the pill when it closes, and closes on Escape, on
 * the dim page behind it, or once a link has been chosen.
 */

/** The landing's own breakpoint for its links: under it they need a menu */
export const LINKS_FOLD = "@media (max-width: 40rem)";

export interface MenuLink {
  label: string;
  href: string;
  onClick?: (ev: MouseEvent) => void;
  /** Leaves the landing, in a tab of its own */
  external?: boolean;
}

interface PhoneMenuProps {
  links: MenuLink[];
}

const PhoneMenu: FC<PhoneMenuProps> = ({ links }) => {
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  const sheet = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sheet.current;
    if (!el) return;
    if (!open) {
      el.setAttribute("inert", "");
      if (el.contains(document.activeElement)) opener.current?.focus();
      return;
    }
    el.removeAttribute("inert");
    el.querySelector<HTMLElement>("a[href], button")?.focus();
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <Opener
        ref={opener}
        type="button"
        aria-expanded={open}
        aria-controls="landing-menu"
        onClick={() => setOpen(true)}
      >
        Menu
      </Opener>
      <Scrim $open={open} onClick={() => setOpen(false)} aria-hidden="true" />
      <Sheet
        id="landing-menu"
        ref={sheet}
        $open={open}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
      >
        <Close
          type="button"
          aria-label="Close the menu"
          onClick={() => setOpen(false)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </Close>
        <Links aria-label="Main">
          {links.map((link) => (
            <Row
              key={link.label}
              href={link.href}
              target={link.external ? "_blank" : undefined}
              rel={link.external ? "noreferrer" : undefined}
              onClick={(ev) => {
                setOpen(false);
                link.onClick?.(ev);
              }}
            >
              {link.label}
            </Row>
          ))}
        </Links>
      </Sheet>
    </>
  );
};

export default PhoneMenu;

const EASE = "cubic-bezier(0.2, 0, 0, 1)";

/* The lockup's pill, holding a word: shown only where the links fold away */
const Opener = styled.button`
  display: none;
  align-items: center;
  height: 3rem;
  padding: 0 1.25rem;
  border: none;
  border-radius: max(${u(20)}, 0.875rem);
  background: #ffffff;
  color: ${INK};
  font-family: ${HEADLINE};
  font-size: 1.0625rem;
  font-weight: 500;
  letter-spacing: -0.01em;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;

  &:focus-visible {
    outline: 2px solid #ffffff;
    outline-offset: 3px;
  }

  ${LINKS_FOLD} {
    display: flex;
  }
`;

const Scrim = styled.div<{ $open: boolean }>`
  ${({ $open }) => css`
    position: fixed;
    inset: 0;
    z-index: 50;
    background: rgba(8, 8, 12, 0.6);
    opacity: ${$open ? 1 : 0};
    pointer-events: ${$open ? "auto" : "none"};
    transition: opacity 0.26s ${EASE};

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  `}
`;

/* Down from the top, on the page's own ground */
const Sheet = styled.div<{ $open: boolean }>`
  ${({ $open }) => css`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 51;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: calc(env(safe-area-inset-top, 0px) + 0.75rem) 1rem 1.25rem;
    border-radius: 0 0 1.5rem 1.5rem;
    background: #141416;
    box-shadow: 0 1.5rem 4rem rgba(0, 0, 0, 0.55),
      inset 0 -1px 0 rgba(255, 255, 255, 0.08);
    transform: translate3d(0, ${$open ? "0" : "-105%"}, 0);
    visibility: ${$open ? "visible" : "hidden"};
    transition: transform 0.3s ${EASE},
      visibility 0s linear ${$open ? "0s" : "0.3s"};

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  `}
`;

const Close = styled.button`
  align-self: flex-end;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  border: none;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
  cursor: pointer;

  & > svg {
    width: 1.5rem;
    height: 1.5rem;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linecap: round;
  }

  &:focus-visible {
    outline: 2px solid #ffffff;
    outline-offset: 2px;
  }
`;

const Links = styled.nav`
  display: flex;
  flex-direction: column;
`;

/* A link a full row tall, in the headline face, as the pill's links are */
const Row = styled.a`
  display: flex;
  align-items: center;
  min-height: 3.75rem;
  padding: 0 0.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  color: #ffffff;
  font-family: ${HEADLINE};
  font-size: 1.5rem;
  font-weight: 500;
  letter-spacing: -0.015em;
  text-decoration: none;

  &:last-child {
    border-bottom: none;
  }

  &:focus-visible {
    outline: 2px solid #ffffff;
    outline-offset: -2px;
    border-radius: 8px;
  }
`;
