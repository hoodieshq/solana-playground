import { useEffect, useState } from "react";
import { css, keyframes } from "styled-components";
import type { DefaultTheme } from "styled-components";

import { HEADLINE_FONT } from "../../themes/solana-v3/theme";

/**
 * Phones, and small tablets held upright: the product shows one pane at a
 * time and the sidebar becomes a drawer. One breakpoint for the whole flow,
 * as a media query for styles and as a hook for layout that styles alone
 * cannot change.
 */
export const PHONE_QUERY = "(max-width: 720px)";
export const PHONE = `@media ${PHONE_QUERY}`;

/**
 * A phone's type: five sizes and three weights, in pixels, so every screen
 * reads as set by one hand rather than as the desktop's many sizes scaled up.
 *
 * Lighter than the desktop's. Light text on a dark ground blooms, and at a
 * phone's density the desktop's 400 and 500 read heavy: 320 for what you
 * read, 440 for what names or acts, and 380 for the small labels only, which
 * would go spindly any lighter.
 */
export const PHONE_TYPE = {
  /** The one headline a screen has: "Where should we begin?" */
  display: css`
    font-family: ${HEADLINE_FONT};
    font-size: 28px;
    font-weight: 400;
    line-height: 1.15;
    letter-spacing: -0.02em;
  `,
  /** What a page or a sheet is called */
  title: css`
    font-size: 17px;
    font-weight: 440;
    line-height: 1.3;
    letter-spacing: -0.005em;
  `,
  /** What you read: rows, messages, fields */
  body: css`
    font-size: 16px;
    font-weight: 320;
    line-height: 1.5;
  `,
  /** What you press: a switch, a tab, a button's label */
  control: css`
    font-size: 15px;
    font-weight: 440;
    line-height: 1.3;
  `,
  /** What supports the body: a description, a row's value */
  secondary: css`
    font-size: 15px;
    font-weight: 320;
    line-height: 1.45;
  `,
  /** A section's name, a count, a footnote */
  label: css`
    font-size: 13px;
    font-weight: 380;
    line-height: 1.35;
  `,
};

/**
 * A phone's heights: the bar across the top of every page, a pane's own head
 * under it, a row in any list, and the least anything you press can be.
 */
export const PHONE_SIZE = {
  bar: "60px",
  head: "52px",
  row: "52px",
  target: "48px",
} as const;

/**
 * The theme's size steps on a phone, for everything that reads them rather
 * than setting sizes of its own: the stages, the dialogs, the forms. The same
 * five sizes as `PHONE_TYPE`, and the code face a step under them, since a
 * monospace reads larger than a sans at the same size.
 *
 * The shared components had their sizes worked out from those steps when the
 * theme was built, so they are given the phone's here as well: a button in
 * the control type, a toast and a text block in the secondary, fields at the
 * 16px a phone will type into without zooming.
 */
export const phoneTheme = (theme: DefaultTheme): DefaultTheme => {
  const { button, text, input, select, tooltip, toast, markdown } =
    theme.components;
  // Spread over the built theme's own values, which the theme's types only
  // describe as a whole: each part keeps everything but its size
  const components = {
    ...theme.components,
    button: {
      ...button,
      default: { ...button.default, fontSize: "15px", fontWeight: 440 },
    },
    text: { ...text, default: { ...text.default, fontSize: "15px" } },
    input: { ...input, fontSize: "16px" },
    select: { ...select, default: { ...select.default, fontSize: "16px" } },
    tooltip: { ...tooltip, fontSize: "13px" },
    toast: { ...toast, default: { ...toast.default, fontSize: "15px" } },
    markdown: { ...markdown, fontSize: "16px" },
  } as unknown as DefaultTheme["components"];

  return {
    ...theme,
    components,
    font: {
      ...theme.font,
      code: {
        ...theme.font.code,
        size: {
          xsmall: "13px",
          small: "13px",
          medium: "14px",
          large: "15px",
          xlarge: "16px",
        },
      },
      other: {
        ...theme.font.other,
        size: {
          xsmall: "13px",
          small: "15px",
          medium: "16px",
          large: "17px",
          xlarge: "28px",
        },
      },
    },
  };
};

const rise = keyframes`
  from { transform: translate3d(0, 100%, 0); }
  to   { transform: none; }
`;

const arrive = keyframes`
  from { opacity: 0; transform: translate3d(0, 12px, 0); }
  to   { opacity: 1; transform: none; }
`;

const dim = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;

/** Behind a sheet: the page, dimmed, and a tap on it closes the sheet */
export const phoneScrim = css`
  position: fixed;
  inset: 0;
  z-index: 60;
  background: rgba(0, 0, 0, 0.55);
  animation: ${dim} 200ms ease-out;
  -webkit-tap-highlight-color: transparent;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

/**
 * A menu on a phone: a sheet up from the foot of the screen, under the thumb,
 * as wide as the screen. It stops short of the top so the page it belongs to
 * still shows above it.
 */
export const phoneSheet = css`
  ${({ theme }) => css`
    position: fixed;
    top: auto;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 61;
    width: auto;
    min-width: 0;
    max-width: none;
    max-height: calc(100dvh - 4.5rem);
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 0.5rem 0.5rem calc(0.75rem + env(safe-area-inset-bottom, 0px));
    border: none;
    border-top: 1px solid ${theme.colors.default.border};
    border-radius: 20px 20px 0 0;
    background: ${theme.colors.default.bgSecondary};
    box-shadow: 0 -12px 40px rgba(0, 0, 0, 0.45);
    animation: ${rise} 260ms cubic-bezier(0.2, 0, 0, 1);

    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }
  `}
`;

/** A menu that is a place of its own on a phone: the whole screen */
export const phonePage = css`
  ${({ theme }) => css`
    position: fixed;
    inset: 0;
    z-index: 61;
    display: flex;
    flex-direction: column;
    width: auto;
    min-width: 0;
    max-width: none;
    max-height: none;
    overflow: hidden;
    padding: 0;
    border: none;
    border-radius: 0;
    background: ${theme.colors.default.bgPrimary};
    box-shadow: none;
    animation: ${arrive} 220ms cubic-bezier(0.2, 0, 0, 1);

    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }
  `}
`;

export const usePhone = () => {
  const [phone, setPhone] = useState(
    () =>
      typeof window !== "undefined" && window.matchMedia(PHONE_QUERY).matches
  );
  useEffect(() => {
    const query = window.matchMedia(PHONE_QUERY);
    const update = () => setPhone(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return phone;
};
