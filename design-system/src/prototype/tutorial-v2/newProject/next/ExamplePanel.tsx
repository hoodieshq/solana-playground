import { RadioGroup } from "radix-ui"
import type { KeyboardEvent, ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { CatalogSearch } from "../../desktop/Catalog"
import { filterPrograms, programIcon } from "../../ui/programs"
import { BASICS, frameworkOf, type Basic } from "./data"
import { ImportSteps, type Step } from "./ImportSteps"
import { FrameworkLogo } from "./FrameworkCard"
import { CheckBadge, LitPick } from "./LitPick"
import type { FirstLightState } from "./model"
import { ProblemCallout } from "./ProblemCallout"

const GROUP_LABEL = "flex h-7 items-end gap-2 pb-1 text-xs leading-4 font-[380] text-(color:--text-quiet)"

const matches = (b: Basic, q: string) => [b.slug, b.line, frameworkOf(b.framework).name].some((f) => f.toLowerCase().includes(q))

/** One example: the tile, the name it will take, its line. The framework is in the tile and the
 * radio's label. The radio is stretched under the row */
function ExampleRow({
  slug,
  line,
  tag,
  tile,
  picked,
  dim,
  onCreate,
}: {
  slug: string
  line: string
  tag: string
  tile: ReactNode
  picked: boolean
  dim: boolean
  onCreate: () => void
}) {
  return (
    <div
      data-picked={picked || undefined}
      onDoubleClick={onCreate}
      // Pulled out by its own padding: the tile keeps to the search field's and the group label's edge, and
      // only the hover and the pick reach past it (Almaz, 10 Nov)
      className={cn("np-pickable np-row group/ex -mx-3 flex h-[60px] shrink-0 items-center gap-3.5 rounded-xl px-3 [html.phone_&]:h-16 [html.touch_&]:h-16", dim && "opacity-50")}
    >
      <RadioGroup.Item value={slug} aria-label={`${slug}, ${tag}`} className="absolute inset-0 z-[1] rounded-xl outline-none" />
      <LitPick />
      {tile}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-center gap-2">
          {/* Two steps over its line, in the catalog's face: in mono at the line's 13 the name read lighter
              than what it does (Almaz, 10 Nov) */}
          <span className="min-w-0 flex-1 truncate text-[0.9375rem] leading-5 font-act text-foreground">{slug}</span>
          {picked && <CheckBadge size={16} />}
        </span>
        <span className="flex items-center gap-2">
          {/* A tone under the name as well as a size: in the same grey the two lines read as one (Almaz, 10 Nov).
              The quiet grey still holds 4.5:1 on the dialog */}
          <span className="min-w-0 flex-1 truncate text-[0.8125rem] leading-[1.125rem] font-read text-(color:--text-quiet)">{line}</span>
        </span>
      </span>
    </div>
  )
}

/** Five skeleton rows at the rows' pitch while the programs load */
function Skeletons() {
  return (
    <div className="flex flex-col" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="lit-skeleton flex h-[60px] items-center gap-3.5 [html.phone_&]:h-16">
          <span className="size-10 rounded-[9px] bg-surface-raised" />
          <span className="flex flex-1 flex-col gap-2">
            <span className="h-2 w-[40%] rounded bg-surface-raised" />
            <span className="h-2 w-[70%] rounded bg-surface-raised" />
          </span>
        </div>
      ))}
    </div>
  )
}

/** Example program (CONSENSUS.md, 3.6): search, then Basics (bundled) and Programs (the catalog) in one
 * radio group. Nothing is picked until the person picks. Creating from a catalog program shows its
 * download as the import checklist */
export function ExamplePanel({
  s,
  online,
  busy,
  onQuery,
  onPick,
  onCreate,
  onRetry,
  onEnterKey,
}: {
  s: FirstLightState
  online: boolean
  busy: boolean
  onQuery: (q: string) => void
  onPick: (slug: string) => void
  onCreate: () => void
  onRetry: () => void
  onEnterKey: (e: KeyboardEvent) => void
}) {
  const { query, picked, programs } = s.examples
  const run = s.run

  if (run.state === "creating" && run.copy) {
    const { step, loaded } = run.copy
    const at = (i: number): Step["status"] => (i < step ? "done" : i === step ? "running" : "waiting")
    const steps: Step[] = [
      { label: "Read the repo", detail: "solana-labs/solana-program-library · master", status: at(0) },
      { label: "Copy files", detail: step >= 1 ? `${loaded} of 24` : undefined, status: at(1) },
      { label: "Open lib.rs", status: at(2) },
    ]
    return (
      <div className="flex flex-col gap-4">
        <p className="font-mono text-[0.8125rem] leading-[1.125rem] text-foreground">{picked}</p>
        <ImportSteps steps={steps} />
      </div>
    )
  }

  const q = query.trim().toLowerCase()
  const basics = BASICS.filter((b) => matches(b, q))
  const listed = online && programs === "ready" ? filterPrograms(query) : []
  const none = q && !basics.length && (programs !== "ready" || !listed.length)
  // The catalog's heading only parts it from the rows above: a search that leaves one group shows its rows
  // bare (Almaz, 10 Nov)
  const programsShown = !online || programs !== "ready" || listed.length > 0
  const labelled = basics.length > 0 && programsShown

  return (
    <div className="flex flex-col gap-3">
      {/* On the phone the search stays under the bar while the list scrolls */}
      <div className="shrink-0 [html.phone_&]:sticky [html.phone_&]:top-0 [html.phone_&]:z-[4] [html.phone_&]:-mt-4 [html.phone_&]:bg-surface-base [html.phone_&]:pt-4 [html.phone_&]:pb-1">
        <CatalogSearch label="examples" icon query={query} onQuery={onQuery} className="h-9 max-w-none [html.phone_&]:h-12 [html.touch_&]:h-11" />
      </div>
      {none ? (
        <div className="flex flex-col items-start gap-3 pt-6">
          <p className="text-control leading-5 font-act text-foreground">{`No examples match “${query.trim()}”`}</p>
          <Button variant="outline" size="sm" onClick={() => onQuery("")} className="[html.phone_&]:h-12">
            Clear search
          </Button>
        </div>
      ) : (
        <RadioGroup.Root
          aria-label="Example"
          value={picked ?? ""}
          onValueChange={onPick}
          onKeyDown={onEnterKey}
          disabled={busy}
          // Rows touch: at 60 apiece the fifth shows half its height through the fade, so the list reads as
          // one that scrolls (Almaz, 10 Nov)
          className="flex flex-col"
        >
          {/* The small bundled ones lead with no heading: "Basics" over the first rows named nothing the rows
              didn't show (Almaz, 10 Nov). Programs keeps its own, as the line where the catalog begins */}
          {basics.map((b) => (
            <ExampleRow
              key={b.slug}
              slug={b.slug}
              line={b.line}
              tag={`${frameworkOf(b.framework).name} · Rust`}
              tile={
                <span className="grid size-10 shrink-0 place-items-center rounded-[9px] bg-foreground/[0.06]">
                  <FrameworkLogo f={frameworkOf(b.framework)} size={22} />
                </span>
              }
              picked={picked === b.slug}
              dim={busy && picked !== b.slug}
              onCreate={onCreate}
            />
          ))}
          {labelled && (
            <div className={cn(GROUP_LABEL, "mt-3")}>
              Programs
              {online && programs === "loading" && <span>Loading…</span>}
            </div>
          )}
          {!online && <ProblemCallout tone="warning" title="Programs need a connection" cause="Basics work offline." focus={false} />}
          {online && programs === "loading" && (
            <>
              <span className="sr-only">Loading programs…</span>
              <Skeletons />
            </>
          )}
          {online && programs === "failed" && (
            <ProblemCallout
              tone="error"
              title="Could not load the programs."
              cause="The list comes from the Playground server. Basics still work."
              primary={{ label: "Try again", onClick: onRetry }}
              focus={false}
            />
          )}
          {listed.map((p) => (
            <ExampleRow
              key={p.name}
              slug={p.name}
              line={p.description}
              tag="Native · Rust"
              tile={<img src={programIcon(p)} alt="" className="size-10 shrink-0 rounded-[9px]" />}
              picked={picked === p.name}
              dim={busy && picked !== p.name}
              onCreate={onCreate}
            />
          ))}
        </RadioGroup.Root>
      )}
    </div>
  )
}
