import { CHIP } from "./Prose"

/** The chat's reading scale, after Practicum's lesson scale at 400px: a card's head 20/24, the lesson's
 * name 24/28. The text is 16/24, not Practicum's 18/26: 18 read too large in the chat column, and 16 on
 * a 26 line set two short lines apart as two sentences (Practicum's own 16 is 16/22). Letter spacing
 * is left at normal. Contrast comes from size and weight: headings at 500, text at 320, the text a step under the headings' white, so a long read doesn't glare. Grey is
 * kept for side notes. text-body alone would leave the text at 400 (to raise in DES-129) */
export const HEADING = "font-heading text-[1.25rem] leading-[1.5rem] font-medium tracking-normal text-foreground"
export const TITLE = "font-heading text-[1.5rem] leading-[1.75rem] font-medium tracking-normal text-foreground"
// At 80% the text is 7.45:1 on the page (AAA), the headings 11.1:1: far enough apart that a heading reads
// as one at a glance, close enough that a long read isn't grey; the side notes' 6.4:1 stays a step under
export const READ = "text-[1rem] leading-[1.5rem] font-read tracking-normal text-foreground/80"
/** Code written out in a card, as Practicum's listing sets it on a desktop: 14/24. Its phone 15 leaves
 * console.log("Hello, World!") a few pixels to spare in a quiz option on a 375px phone, 14 keeps a margin */
export const LISTING = "font-mono text-[0.875rem] leading-[1.5rem]"
/** Code in ticks takes the text's colour, so a word doesn't outshine the headings, on the same dark
 * ringed chip as everywhere: a 9% white fill was the text's own grey again and the code didn't stand out */
export const READ_CODE = { chip: CHIP, ink: "text-current" }

/** A card's actions, whatever their variant: one height and the heading face, so a filled button and
 * an outlined one beside it line up. 40px with a mouse, 44px under a finger. The filled one brightens
 * on hover instead of fading toward the card */
export const ACTION = "h-10 gap-2 px-4 font-heading text-[0.9375rem] font-medium pointer-coarse:h-11"
export const ACTION_FILL = "hover:bg-(--accent-fill-hover)"
/** The action beside it, as Claude Code's second button: a grey fill, no border, the text a step under */
export const ACTION_SOFT = "border-0 bg-foreground/[0.1] text-foreground/90 shadow-none hover:bg-foreground/[0.15] hover:text-foreground"

/** A card's action on a phone: the full width, 48px under the thumb. The coarse pointer height is
 * named again because ACTION's 44px for a finger would otherwise win over it */
export const PHONE_CTA = "h-12 w-full pointer-coarse:h-12"

/** The one focus ring, as the nav draws it */
export const FOCUS = "outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-purple"

/** Seconds as the records say them: "1.6 s" */
export const secs = (ms: number) => `${(Math.round(ms / 100) / 10).toFixed(1)} s`

/** A step's time as its clock pill shows it: 0:41 */
export const clock = (ms: number) => {
  const t = Math.max(0, Math.round(ms / 1000))
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`
}

/** A step's time beside its divider: 41 s, or 2 min 5 s */
export const took = (ms: number) => {
  const t = Math.max(1, Math.round(ms / 1000))
  return t < 60 ? `${t} s` : `${Math.floor(t / 60)} min${t % 60 ? ` ${t % 60} s` : ""}`
}

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)")
export const reducedMotion = () => reduce.matches

/** When the page loaded: turns from before it render whole, newer ones type and rise in */
export const LOADED_AT = Date.now()
