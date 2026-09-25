/* Stroke icons at one weight on a 24px grid, so the column and its menus read
   as one set rather than a collection of borrowed glyphs. The four
   destinations keep `BrandIcon`, which is cut from the mark; these are
   everything around them. Shared with the session footer
   (`header/StatusChips.tsx`) so its rows and menu are drawn in the same line. */
const svg = (d: JSX.Element) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {d}
  </svg>
);

/* A dot as a zero-length stroke, so it takes the icon's weight and caps */
const dot = (x: number, y: number) => <path d={`M${x} ${y}h.01`} />;

export const ICONS = {
  folder: svg(
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  ),
  help: svg(
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.6 9.5a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2-2.4 3.6" />
      <path d="M12 17.2h.01" />
    </>
  ),
  gear: svg(
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" />
    </>
  ),
  review: svg(
    <>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5z" />
      <path d="M8 9.5h8M8 14h5" />
    </>
  ),
  deck: svg(
    <>
      <rect x="3" y="5" width="18" height="12" rx="2" />
      <path d="M9 20h6" />
    </>
  ),
  sidebar: svg(
    <>
      <rect x="3" y="4.5" width="18" height="15" rx="2" />
      <path d="M9.5 4.5v15" />
    </>
  ),
  close: svg(
    <>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </>
  ),
  /* Vertical, like the reference's row menu, and filled so three dots hold
     up at 16px */
  more: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="5.5" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="12" cy="18.5" r="1.6" />
    </svg>
  ),
  pin: svg(
    <>
      <path d="M9 3.5h6" />
      <path d="M10.25 3.5v5L7.5 11.5v1h9v-1l-2.75-3v-5" />
      <path d="M12 12.5v8" />
    </>
  ),
  unpin: svg(
    <>
      <path d="M9 3.5h6" />
      <path d="M10.25 3.5v5L7.5 11.5v1h9v-1l-2.75-3v-5" />
      <path d="M12 12.5v8" />
      <path d="m4 4 16 16" />
    </>
  ),
  open: svg(
    <>
      <path d="M20 5v6a4 4 0 0 1-4 4H5" />
      <path d="m9 11-4 4 4 4" />
    </>
  ),
  rename: svg(
    <>
      <path d="M4.5 19.5h4l10-10a2.83 2.83 0 0 0-4-4l-10 10z" />
      <path d="m13.5 6.5 4 4" />
    </>
  ),
  duplicate: svg(
    <>
      <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
      <path d="M15.5 8.5v-2a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2" />
    </>
  ),
  download: svg(
    <>
      <path d="M12 4.5v10" />
      <path d="m7.5 10.5 4.5 4.5 4.5-4.5" />
      <path d="M5 19.5h14" />
    </>
  ),
  trash: svg(
    <>
      <path d="M4.5 7h15" />
      <path d="M9.5 7V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2" />
      <path d="m6.5 7 .8 11.2a2 2 0 0 0 2 1.8h5.4a2 2 0 0 0 2-1.8L17.5 7" />
      <path d="M10 11v5.5M14 11v5.5" />
    </>
  ),
  bug: svg(
    <>
      <rect x="7.5" y="8.5" width="9" height="11" rx="4.5" />
      <path d="M9.5 8.5a2.5 2.5 0 0 1 5 0" />
      <path d="M4.5 13.5h3M16.5 13.5h3M6 8.5l2 1.5M18 8.5 16 10M6 19l2-1.5M18 19l-2-1.5" />
    </>
  ),
  wallet: svg(
    <>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" />
      <path d="M20.5 10h-4a2 2 0 0 0 0 4h4" />
      {dot(16.5, 12)}
    </>
  ),
  unlink: svg(
    <>
      <path d="m10 14.5-2.5 2.5a3.2 3.2 0 0 1-4.5-4.5L5.5 10" />
      <path d="m14 9.5 2.5-2.5a3.2 3.2 0 0 1 4.5 4.5L18.5 14" />
      <path d="M8 3.5V6M3.5 8H6M16 20.5V18M20.5 16H18" />
    </>
  ),
  signOut: svg(
    <>
      <path d="M9.5 19.5h-3a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2h3" />
      <path d="m15 16.5 4.5-4.5L15 7.5" />
      <path d="M19.5 12h-10" />
    </>
  ),
  external: svg(
    <>
      <path d="M8 16 16 8" />
      <path d="M9.5 8H16v6.5" />
    </>
  ),
  chevrons: svg(
    <>
      <path d="m8 9.5 4-4 4 4" />
      <path d="m8 14.5 4 4 4-4" />
    </>
  ),
  caret: svg(<path d="m7 10 5 5 5-5" />),
  forward: svg(<path d="m10 7 5 5-5 5" />),
  /* Heavier than the set: it is drawn at 10px inside a filled circle */
  check: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m5.5 12.5 4 4 9-9" />
    </svg>
  ),
};
