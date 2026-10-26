/** The phone's sheets, drawn one way: the panel's grey with rounder top corners, a handle you can see
 * (the kit's 100x4 in muted all but vanished), and a head whose title starts on the same 16px edge as
 * the rows under it. No rule round it: on the rounded top the kit's hairline read as an outline, so a
 * soft shadow lifts the sheet off the page instead. The Call sheet already read this way; the others follow it */
export const SHEET = "max-h-[82dvh] rounded-t-2xl bg-surface-panel data-[vaul-drawer-direction=bottom]:border-t-0 shadow-[0_-12px_40px_rgb(0_0_0/0.45)] [&>div:first-child]:mt-3 [&>div:first-child]:w-9 [&>div:first-child]:bg-foreground/20"
export const SHEET_HEAD = "gap-1 px-4 pt-3 pb-2 text-left!"
export const SHEET_TITLE = "font-heading text-[1rem]! leading-[1.35] font-medium!"
