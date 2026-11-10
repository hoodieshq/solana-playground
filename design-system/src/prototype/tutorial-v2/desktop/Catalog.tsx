import { ChevronRight, Search } from "lucide-react"
import { useState, type ReactNode } from "react"
import { toast } from "sonner"

import {
  ActionCard,
  ActionCardAction,
  ActionCardContent,
  ActionCardDescription,
  ActionCardEyebrow,
  ActionCardIndicator,
  ActionCardLink,
  ActionCardMedia,
  ActionCardTitle,
} from "@/components/ui/action-card"
import { BrandButton } from "@/components/ui/brand-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Segmented, SegmentedItem } from "@/components/ui/segmented"
import { cn } from "@/lib/utils"

import { useOpenTutorial } from "../host"
import { upstreamName, type Entry } from "../ui/catalog"
import { programIcon, programTags, type Program } from "../ui/programs"
import { TutorialCover } from "../ui/TutorialCover"
import { LitGround } from "./Gallery"

/** What a control the prototype doesn't carry says, as the nav's own rows do */
export const soon = () => toast("Only the tutorial flow is in this prototype")

/** A page beside the nav, as the product draws Home and Programs: the lit ground and the page
 * scrolling over it. No head bar: the nav's current row and the page's own title already name it */
export function Page({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate flex min-w-0 flex-1 flex-col overflow-hidden">
      <LitGround />
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">{children}</div>
    </div>
  )
}

/** The catalog's search field: "Search programs", "Search tutorials" */
export function CatalogSearch({ label, query, onQuery, icon = true, className }: { label: string; query: string; onQuery: (q: string) => void; icon?: boolean; className?: string }) {
  return (
    <InputGroup className={cn("max-w-80", className)}>
      {icon && (
        <InputGroupAddon>
          <Search aria-hidden="true" />
        </InputGroupAddon>
      )}
      <InputGroupInput type="search" placeholder={`Search ${label}`} aria-label={`Search ${label}`} value={query} onChange={(e) => onQuery(e.target.value)} />
    </InputGroup>
  )
}

/** Nothing matched: the query said back, and the way out */
export function NoMatch({ label, query, onClear }: { label: string; query: string; onClear: () => void }) {
  return (
    <div className="flex flex-col items-start gap-2 py-6">
      <p className="text-control text-foreground">{`No ${label} match “${query.trim()}”`}</p>
      <Button variant="outline" size="sm" onClick={onClear}>
        Clear search
      </Button>
    </div>
  )
}

/** The programs as the product's catalog draws them: two columns from 720 px, the avatar's tile, the
 * eyebrow, the name, two lines of description and Open. Opening a program isn't in this prototype */
export function ProgramGrid({ programs }: { programs: Program[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 min-[720px]:grid-cols-2">
      {programs.map((p) => (
        <ActionCard key={p.name}>
          <ActionCardMedia variant="image" className="size-14">
            <img src={programIcon(p)} alt="" />
          </ActionCardMedia>
          <ActionCardContent>
            <ActionCardEyebrow>{programTags(p)}</ActionCardEyebrow>
            <ActionCardTitle>
              <ActionCardLink asChild>
                <button type="button" onClick={soon}>
                  {p.name}
                </button>
              </ActionCardLink>
            </ActionCardTitle>
            <ActionCardDescription>{p.description}</ActionCardDescription>
          </ActionCardContent>
          <ActionCardAction>
            <Button variant="outline" aria-label={`Open ${p.name}`} onClick={soon}>
              Open
            </Button>
          </ActionCardAction>
          <ChevronRight aria-hidden="true" className="size-4 shrink-0 self-center text-muted-foreground md:hidden" />
        </ActionCard>
      ))}
    </div>
  )
}

/** A tutorial as Home lists it: its cover, level · framework, the name and the description. The whole
 * card opens it, as the Tutorials list's cards do, so no Open button repeats that. The three the
 * prototype plays open their lesson; the rest say they're not here */
export function TutorialRow({ t, onOpened }: { t: Entry; onOpened?: () => void }) {
  const openTutorial = useOpenTutorial()
  const open = () => {
    onOpened?.()
    openTutorial(t.slug)
  }
  return (
    <ActionCard>
      <ActionCardMedia variant="image" className="size-14 bg-transparent">
        <TutorialCover name={upstreamName(t)} framework={t.framework} className="size-14 rounded-lg" />
      </ActionCardMedia>
      <ActionCardContent>
        <ActionCardEyebrow>{`${t.level} · ${t.framework}`}</ActionCardEyebrow>
        <ActionCardTitle>
          <ActionCardLink asChild>
            <button type="button" onClick={open}>
              {upstreamName(t)}
            </button>
          </ActionCardLink>
        </ActionCardTitle>
        <ActionCardDescription>{t.description}</ActionCardDescription>
      </ActionCardContent>
    </ActionCard>
  )
}

/** A tutorial as New project's Tutorials tab draws it: the cover, the name, the description, level ·
 * framework under them, and the arrow in the corner */
export function TutorialTile({ t, onOpened }: { t: Entry; onOpened: () => void }) {
  const openTutorial = useOpenTutorial()
  return (
    <ActionCard>
      <ActionCardMedia variant="image" className="size-14 bg-transparent">
        <TutorialCover name={upstreamName(t)} framework={t.framework} className="size-14 rounded-lg" />
      </ActionCardMedia>
      <ActionCardContent>
        <ActionCardTitle>{upstreamName(t)}</ActionCardTitle>
        <ActionCardDescription>{t.description}</ActionCardDescription>
        <ActionCardEyebrow className="mt-1.5">{`${t.level} · ${t.framework}`}</ActionCardEyebrow>
      </ActionCardContent>
      <ActionCardIndicator
        aria-label={`Open ${upstreamName(t)}`}
        onClick={() => {
          onOpened()
          openTutorial(t.slug)
        }}
      />
    </ActionCard>
  )
}

const FRAMEWORKS = [
  { name: "Anchor", icon: "anchor.png" },
  { name: "Native", icon: "native.png" },
  { name: "Seahorse", icon: "seahorse.png", circle: true },
] as const

/** Start from scratch, as the product's: a framework, a name, Start. Making a project isn't in this
 * prototype, so Start says so; the choice and the name still answer */
export function StartFromScratch() {
  const [framework, setFramework] = useState<string>("Anchor")
  const [name, setName] = useState("")
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface-panel p-5">
      <div className="min-w-0">
        <div className="text-control font-act text-foreground">Start from scratch</div>
        <div className="text-caption font-read text-muted-foreground">A working starter you shape with the assistant.</div>
      </div>
      <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-start gap-x-4 gap-y-3">
        <span aria-hidden="true" className="text-caption leading-8 text-muted-foreground">
          Framework
        </span>
        <Segmented variant="gradient" aria-label="Framework" className="justify-self-start" value={framework} onValueChange={(f) => f && setFramework(f)}>
          {FRAMEWORKS.map((f) => (
            <SegmentedItem key={f.name} value={f.name}>
              <img src={`${import.meta.env.BASE_URL}prototype/frameworks/${f.icon}`} alt="" className={"circle" in f ? "size-4 rounded-full" : "size-4 rounded-[4px]"} />
              {f.name}
            </SegmentedItem>
          ))}
        </Segmented>
        <label htmlFor="scratch-name" className="text-caption leading-8 text-muted-foreground">
          Name
        </label>
        <div className="flex gap-2">
          <Input
            id="scratch-name"
            aria-label="Project name"
            className="max-w-80 min-w-0 flex-1"
            value={name}
            placeholder={`${framework.toLowerCase()}-project`}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && soon()}
          />
          <BrandButton type="button" variant="accent" className="h-8" onClick={soon}>
            Start &rarr;
          </BrandButton>
        </div>
      </div>
    </div>
  )
}
