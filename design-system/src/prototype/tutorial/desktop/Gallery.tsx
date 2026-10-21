import { useState } from "react"
import { Boxes, Check, Play, Search, X } from "lucide-react"
import { toast } from "sonner"

import { brandButtonVariants } from "@/components/ui/brand-button"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { ObjectiveMeter } from "@/components/ui/objective-band"
import { Segmented, SegmentedItem } from "@/components/ui/segmented"
import { cn } from "@/lib/utils"

import { STEPS, TUTORIALS, thumb } from "../data"
import { useStore } from "../store"
import { Thumb } from "../ui/Thumb"

const CARD =
  "flex w-full items-center gap-3 rounded-card border border-border bg-surface-panel p-3 text-left transition-[background-color,transform] duration-150 ease-standard hover:bg-surface active:scale-[0.99] motion-reduce:transition-none"

type Tab = "tutorials" | "programs"

export function Gallery() {
  const { s, dispatch } = useStore()
  const [query, setQuery] = useState("")
  const [tab, setTab] = useState<Tab>("tutorials")
  const started = s.startedAt !== null && s.finishedAt === null
  const finished = s.finishedAt !== null
  const done = s.passed.filter(Boolean).length
  const first = s.passed.findIndex((p) => !p)
  const next = first === -1 ? STEPS.length - 1 : first

  const q = query.trim().toLowerCase()
  const list = TUTORIALS.filter((t) => [t.name, t.level, t.framework].some((field) => field.toLowerCase().includes(q)))
  const open = (slug: string) =>
    slug === "hello-anchor" ? dispatch({ type: "open", screen: "overview" }) : toast("Only Hello Anchor is in this prototype")

  return (
    <div className="min-w-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-[68rem] px-10 pt-10 pb-16">
        <h1 className="font-heading text-display">What do you want to build?</h1>

        {started && (
          <section aria-labelledby="resume-title" className="mt-8">
            <h2 id="resume-title" className="mb-2 text-caption text-muted-foreground">
              Pick up where you left off
            </h2>
            {/* The whole card resumes the tutorial. The ring is the screen's one accent. Kept narrow, so it reads as a card, not a banner */}
            <button
              type="button"
              onClick={() => dispatch({ type: "start" })}
              aria-label={`Continue Hello Anchor: ${STEPS[next].objective}`}
              className={cn(CARD, "max-w-[38rem]")}
            >
              <Thumb src={thumb("hello-anchor", "jpg")} className="size-14" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-title">Hello Anchor</span>
                <span className="mt-0.5 block truncate text-caption text-muted-foreground">Next: {STEPS[next].objective}</span>
                <span className="mt-2 flex items-center gap-2">
                  <ObjectiveMeter value={done / STEPS.length} className="h-1 w-48" />
                  <span className="text-caption text-muted-foreground tabular-nums">
                    {done} of {STEPS.length}
                  </span>
                </span>
              </span>
              <span aria-hidden="true" className={cn(brandButtonVariants({ variant: "ring", size: "icon" }), "size-11")}>
                <Play className="size-4 fill-current" />
              </span>
            </button>
          </section>
        )}

        {/* There's room for the field, so search is always open here, with no unfolding */}
        <div className="mt-8 flex items-center gap-4">
          <Segmented value={tab} onValueChange={(v) => setTab(v as Tab)} aria-label="Show" className="pill h-10! rounded-full! border-0! p-0!">
            <SegmentedItem value="tutorials" className="rounded-full! px-4! text-control!">
              Tutorials
            </SegmentedItem>
            <SegmentedItem value="programs" className="rounded-full! px-4! text-control!">
              Programs
            </SegmentedItem>
          </Segmented>
          {tab === "tutorials" && (
            <label className="relative ml-auto h-10 w-72 rounded-full border border-border bg-surface-panel transition-colors focus-within:border-border-strong">
              {/* The empty field's hint sits a step under the interface's own grey text, at 80%: 4.9:1, still above
                  AA. 70% would drop to 4.1 */}
              <Search strokeWidth={1.75} className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground/80" />
              {/* The composer's size and weight, in line with the tabs, the same as the phone's search */}
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && setQuery("")}
                placeholder={`Search ${TUTORIALS.length} tutorials`}
                aria-label="Search tutorials"
                className="size-full rounded-full bg-transparent pr-9 pl-10 text-[0.9375rem] font-[350] outline-none placeholder:text-muted-foreground/80"
              />
              {query && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setQuery("")}
                  className="absolute top-0 right-0 flex size-10 items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              )}
            </label>
          )}
        </div>

        {tab === "programs" ? (
          <Empty className="mt-16 gap-5 border-0 p-0">
            <EmptyHeader className="gap-3">
              <EmptyMedia variant="icon" className="mb-1 size-12! rounded-panel! bg-surface-raised! text-muted-foreground! [&_svg]:size-6!">
                <Boxes strokeWidth={1.75} />
              </EmptyMedia>
              <EmptyTitle className="font-heading text-title! font-[440]! tracking-normal!">Programs aren't in this prototype</EmptyTitle>
              <EmptyDescription className="max-w-[36ch] text-caption! leading-relaxed">
                This take covers the tutorial flow. The 34 programs come in a later pass.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button variant="outline" className="h-10 px-5" onClick={() => setTab("tutorials")}>
                Back to tutorials
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <>
            {q && (
              <p role="status" className="mt-4 text-caption text-muted-foreground">
                {list.length === 0 ? `No tutorials match “${query.trim()}”` : `${list.length} ${list.length === 1 ? "result" : "results"}`}
              </p>
            )}
            <ul className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-3">
              {list.map((t) => (
                <li key={t.slug}>
                  <button type="button" onClick={() => open(t.slug)} className={CARD}>
                    <Thumb src={thumb(t.slug, t.ext)} className="size-14" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-title">{t.name}</span>
                      <span className="mt-0.5 block text-caption text-muted-foreground">
                        {t.level} · {t.framework}
                        {started && t.slug === "hello-anchor" && " · In progress"}
                        {finished && t.slug === "hello-anchor" && (
                          <>
                            {" · "}
                            <Check strokeWidth={2.5} className="mb-px inline size-3.5 text-success" /> Completed
                          </>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
