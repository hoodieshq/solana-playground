import type { ReactNode } from "react"

/* The sidebar's stroke icons, as client-v2 draws them (views/flow/nav/icons.tsx): one weight on a
   24px grid, so the column and its menus read as one set. Only the ones the prototype's nav uses */
const svg = (d: ReactNode) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d}
  </svg>
)

export const NAV_ICONS = {
  folder: svg(<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />),
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
  chevrons: svg(
    <>
      <path d="m8 9.5 4-4 4 4" />
      <path d="m8 14.5 4 4 4-4" />
    </>
  ),
  caret: svg(<path d="m7 10 5 5 5-5" />),
  forward: svg(<path d="m10 7 5 5-5 5" />),
  // Heavier than the set: it is drawn at 10px inside a filled circle
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5.5 12.5 4 4 9-9" />
    </svg>
  ),
}
