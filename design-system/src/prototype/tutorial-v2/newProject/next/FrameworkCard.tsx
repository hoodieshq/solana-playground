import { ArrowRight } from "lucide-react"
import { RadioGroup } from "radix-ui"

import { cn } from "@/lib/utils"

import { ProjectCover } from "../../programs/next/ProjectCover"
import type { FrameworkInfo } from "./data"
import { CheckBadge, LitPick } from "./LitPick"

/** One framework (CONSENSUS.md, 3.5): its tile cover, as every card in the product wears (Almaz, 11 Nov:
 * no framework logos anywhere; where a mark would be too small to read there is none), name, language, who it is for. A radio of the Framework
 * group; the picked one is lit. `dim` while another one is being created. `compact` is the phone's
 * row (6.2): the language and who it is for on one line */
export function FrameworkCard({ f, picked, dim, compact }: { f: FrameworkInfo; picked: boolean; dim?: boolean; compact?: boolean }) {
  if (compact)
    return (
      <RadioGroup.Item
        value={f.id}
        aria-label={`${f.name}, ${f.language}`}
        aria-describedby={`np-who-${f.id}`}
        data-picked={picked || undefined}
        className={cn("np-pickable flex min-h-[76px] w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left transition-opacity", dim && "opacity-50")}
      >
        <LitPick />
        <ProjectCover framework={f.id} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-16 leading-[1.375rem] font-act text-foreground">{f.name}</span>
          <span id={`np-who-${f.id}`} className="line-clamp-2 text-13 leading-[1.125rem] font-read text-muted-foreground">
            {`${f.language} · ${f.who}`}
          </span>
        </span>
        {picked && <CheckBadge />}
      </RadioGroup.Item>
    )
  return (
    <RadioGroup.Item
      value={f.id}
      aria-label={`${f.name}, ${f.language}`}
      aria-describedby={`np-who-${f.id}`}
      data-picked={picked || undefined}
      className={cn("np-pickable np-card flex flex-col items-start rounded-xl p-4 text-left transition-opacity", dim && "opacity-50")}
    >
      <LitPick />
      {/* Two blocks that take the card's whole height (Almaz, 10 Nov): the mark and the pick on one line at
          its top, the words at its foot, 16 from every edge. Set as one group in the card's middle, they
          left a band of nothing over and under them */}
      <span className="flex w-full items-start justify-between">
        <ProjectCover framework={f.id} className="size-12 rounded-[10px]" />
        {picked && <CheckBadge />}
      </span>
      <span className="mt-auto flex w-full min-w-0 items-center gap-2 pt-3">
        <span className="truncate text-16 leading-6 font-act text-foreground">{f.name}</span>
        {/* A tag, as the project head's Example: quiet text beside the name read as the start of the line
            under it (Almaz, 10 Nov). "TypeScript client" already says its language */}
        {!f.name.includes(f.language) && <span className="shrink-0 rounded-md bg-foreground/[0.08] px-1.5 py-0.5 text-13 leading-4 text-muted-foreground">{f.language}</span>}
      </span>
      <span id={`np-who-${f.id}`} className="mt-1 line-clamp-2 text-13 leading-[1.1875rem] font-read text-muted-foreground">
        {f.who}
      </span>
    </RadioGroup.Item>
  )
}

/** The fourth card of the grid: not a framework but the other way to begin, for someone who can't pick
 * one yet. It leaves the dialog for Tutorials, which the arrow after its name says; three cards left a corner of the
 * grid empty (Almaz, 11 Nov) */
export function TutorialCard({ disabled, onOpen }: { disabled?: boolean; onOpen: () => void }) {
  return (
    <button type="button" disabled={disabled} onClick={onOpen} className={cn("np-pickable np-card group/tut flex flex-col items-start rounded-xl p-4 text-left transition-opacity", disabled && "opacity-50")}>
      <ProjectCover framework="tutorial" className="size-12 rounded-[10px]" />
      {/* The arrow after the name, not in the corner: there it read as one more state of the pick, where
          the picked card has its check (Almaz, 11 Nov) */}
      <span className="mt-auto flex w-full items-center gap-1.5 pt-3 text-16 leading-6 font-act text-foreground">
        <span className="truncate">Follow a tutorial</span>
        <ArrowRight aria-hidden="true" strokeWidth={1.75} className="size-4 shrink-0 text-muted-foreground transition-transform duration-100 group-hover/tut:translate-x-0.5 motion-reduce:transition-none" />
      </span>
      <span className="mt-1 line-clamp-2 text-13 leading-[1.1875rem] font-read text-muted-foreground">New to Solana? Build your first program step by step.</span>
    </button>
  )
}
