import { Segmented, SegmentedItem } from "@/components/ui/segmented"
import { cn } from "@/lib/utils"

import { STEPS, thumb } from "../data"
import { useStore } from "../store"
import { FRAMEWORKS, HERO, metaFor, openTutorial, type Entry, type FrameworkFilter } from "./catalog"
import { Thumb } from "./Thumb"
import { TutorialStatus } from "./TutorialStatus"

export const CARD =
  "flex w-full items-start gap-3 rounded-card border border-border bg-surface-panel p-3 text-left transition-[background-color,transform] duration-150 ease-standard hover:bg-surface active:scale-[0.985] active:bg-surface motion-reduce:transition-none"

/** Framework as a filter, one always chosen. The design system's chips, as round as the tabs above
 * them. On a phone each is 36px to look at and 44 to hit, and the row scrolls sideways when a big
 * font or a small screen leaves no room */
export function FrameworkChips({ value, onChange, phone = false, className }: { value: FrameworkFilter; onChange: (v: FrameworkFilter) => void; phone?: boolean; className?: string }) {
  return (
    <Segmented
      variant="chips"
      value={value}
      onValueChange={(v) => onChange(v as FrameworkFilter)}
      aria-label="Framework"
      className={cn("flex-nowrap! gap-2!", className)}
    >
      {FRAMEWORKS.map((f) => (
        <SegmentedItem
          key={f.value}
          value={f.value}
          className={cn(
            "rounded-full! px-3.5! text-caption!",
            phone ? "h-9! before:absolute before:-inset-y-1 before:inset-x-0 before:content-['']" : "h-8!"
          )}
        >
          {f.label}
        </SegmentedItem>
      ))}
    </Segmented>
  )
}

/** A level's header: its name and how many tutorials it holds under the current filter */
export function LevelHeader({ id, level, count, className }: { id: string; level: string; count: number; className?: string }) {
  return (
    <h2 id={id} className={cn("flex items-baseline gap-2 font-heading text-[0.9375rem] text-foreground", className)}>
      {level}
      <span className="font-sans text-caption text-muted-foreground tabular-nums">{count}</span>
    </h2>
  )
}

/** One tutorial: cover, name (two lines at most), its own description and how many parts it has.
 * Where you are with it sits at the right end, as before */
export function TutorialTile({ t, className }: { t: Entry; className?: string }) {
  const { s, dispatch } = useStore()
  const started = s.startedAt !== null && s.finishedAt === null
  const finished = s.finishedAt !== null
  return (
    <button type="button" onClick={() => openTutorial(t.slug, () => dispatch({ type: "open", screen: "overview" }))} className={cn(CARD, className)}>
      {/* In px, not rem: a larger font needs the room for words, not for the picture */}
      <Thumb src={thumb(t.slug, t.ext)} className="size-[56px]" />
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 text-title">{t.name}</span>
        <span className="mt-0.5 line-clamp-2 text-caption text-muted-foreground">{t.description}</span>
        {/* Muted, not subtle: the tertiary grey is 3.6:1 on the card, under AA for this size */}
        <span className="mt-1.5 block text-caption text-muted-foreground tabular-nums">{metaFor(t)}</span>
      </span>
      {t.slug === HERO.slug && (started || finished) && (
        <span className="self-center">
          <TutorialStatus done={s.passed.filter(Boolean).length} total={STEPS.length} finished={finished} />
        </span>
      )}
    </button>
  )
}
