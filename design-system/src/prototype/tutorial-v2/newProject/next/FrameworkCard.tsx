import { RadioGroup } from "radix-ui"

import { cn } from "@/lib/utils"

import type { FrameworkInfo } from "./data"
import { CheckBadge, LitPick } from "./LitPick"

/** A framework's logo: Seahorse round, the rest on an 8 px corner */
export function FrameworkLogo({ f, size }: { f: FrameworkInfo; size: number }) {
  // Contained: Native's mark is 111 by 96, and a square box stretched its S
  return <img src={f.logo} alt="" style={{ width: size, height: size }} className={cn("shrink-0 object-contain", f.round ? "rounded-full" : "rounded-lg")} />
}

/** One framework (CONSENSUS.md, 3.5): logo, name, language, who it is for. A radio of the Framework
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
        <FrameworkLogo f={f} size={32} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-base leading-[1.375rem] font-act text-foreground">{f.name}</span>
          <span id={`np-who-${f.id}`} className="line-clamp-2 text-[0.8125rem] leading-[1.125rem] font-read text-muted-foreground">
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
      {/* Two blocks, as a choice card sits (Almaz, 10 Nov): the mark and the pick on one line at the top,
          the words at the foot. Four tiers stacked read as a column of captions; this way the card's room
          opens between the blocks. Here the logo is the card's picture, so it stands bare and large, not on
          the small tile the lists use (Almaz, 10 Nov) */}
      <span className="flex w-full items-center justify-between">
        <FrameworkLogo f={f} size={40} />
        {picked && <CheckBadge />}
      </span>
      <span className="mt-auto flex items-center gap-2 pt-4">
        <span className="text-[1.0625rem] leading-6 font-act text-foreground">{f.name}</span>
        {/* A tag, as the project head's Example: quiet text beside the name read as the start of the line
            under it (Almaz, 10 Nov). "TypeScript client" already says its language */}
        {!f.name.includes(f.language) && <span className="rounded-md bg-foreground/[0.08] px-1.5 py-0.5 text-[0.75rem] leading-4 text-muted-foreground">{f.language}</span>}
      </span>
      <span
        id={`np-who-${f.id}`}
        className="mt-1 line-clamp-2 text-[0.8125rem] leading-[1.1875rem] font-read text-muted-foreground [html.portrait_&]:text-[0.875rem] [html.portrait_&]:leading-5 [html.touch_&]:text-[0.875rem] [html.touch_&]:leading-5"
      >
        {f.who}
      </span>
    </RadioGroup.Item>
  )
}
