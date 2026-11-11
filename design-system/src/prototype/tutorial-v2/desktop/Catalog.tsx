import { Search } from "lucide-react"
import { type ReactNode } from "react"
import { toast } from "sonner"

import {
  ActionCard,
  ActionCardContent,
  ActionCardDescription,
  ActionCardEyebrow,
  ActionCardLink,
  ActionCardMedia,
  ActionCardTitle,
} from "@/components/ui/action-card"
import { Button } from "@/components/ui/button"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { cn } from "@/lib/utils"

import { useOpenTutorial } from "../host"
import { upstreamName, type Entry } from "../ui/catalog"
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
