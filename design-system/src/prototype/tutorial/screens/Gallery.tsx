import { useState } from "react"
import { Play, Search, X } from "lucide-react"
import { toast } from "sonner"

import { brandButtonVariants } from "@/components/ui/brand-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ObjectiveMeter } from "@/components/ui/objective-band"
import { Segmented, SegmentedItem } from "@/components/ui/segmented"
import { cn } from "@/lib/utils"

import { STEPS, TUTORIALS, thumb } from "../data"
import { useStore } from "../store"
import { Thumb } from "../ui/Thumb"
import { TopBar } from "../ui/TopBar"

export function Gallery() {
  const { s, dispatch } = useStore()
  const [query, setQuery] = useState("")
  const [searching, setSearching] = useState(false)
  const closeSearch = () => {
    setQuery("")
    setSearching(false)
  }
  const done = s.passed.filter(Boolean).length
  const first = s.passed.findIndex((p) => !p)
  const next = first === -1 ? STEPS.length - 1 : first
  const started = s.startedAt !== null && s.finishedAt === null
  const list = TUTORIALS.filter((t) => t.name.toLowerCase().includes(query.trim().toLowerCase()))

  const open = (slug: string) =>
    slug === "hello-anchor" ? dispatch({ type: "open", screen: "overview" }) : toast("Only Hello Anchor is in this prototype")

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TopBar
        title="What do you want to build?"
        right={
          <Button variant="ghost" size="icon" className="size-11" aria-label="Close" onClick={() => toast("Only the tutorial flow is in this prototype")}>
            <X />
          </Button>
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8">
        {started && (
          // The whole card resumes the tutorial. The ring is the screen's one accent and shows where to tap
          <section aria-labelledby="resume-title" className="mt-4">
          <h2 id="resume-title" className="mb-2 text-caption text-muted-foreground">
            Pick up where you left off
          </h2>
          <button
            type="button"
            onClick={() => dispatch({ type: "start" })}
            aria-label={`Continue Hello Anchor: ${STEPS[next].objective}`}
            className="flex w-full items-center gap-3 rounded-card border border-border bg-surface-panel p-3 text-left transition-[background-color,transform] duration-150 ease-standard hover:bg-surface active:scale-[0.985] active:bg-surface motion-reduce:transition-none"
          >
            <Thumb src={thumb("hello-anchor", "jpg")} className="size-14" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-title">Hello Anchor</span>
              <span className="mt-0.5 line-clamp-2 text-caption text-muted-foreground">Next: {STEPS[next].objective}</span>
              <span className="mt-2 flex items-center gap-2">
                <ObjectiveMeter value={done / STEPS.length} className="h-1 flex-1" />
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

        {/* One row: the tabs, and search folded into a button. Search opens in their place */}
        <div className="mt-4 flex h-11 items-center gap-2">
          {searching ? (
            <>
              <label className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Search ${TUTORIALS.length} tutorials`}
                  aria-label="Search tutorials"
                  className="h-11 rounded-full pl-10"
                />
              </label>
              <Button variant="ghost" className="h-11 px-2 text-muted-foreground" onClick={closeSearch}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Segmented
                value="tutorials"
                onValueChange={(v) => v === "programs" && toast("Programs are not in this prototype")}
                aria-label="Show"
                className="pill h-11! rounded-full! border-0! p-0!"
              >
                <SegmentedItem value="tutorials" className="rounded-full! px-4! text-control!">
                  Tutorials
                </SegmentedItem>
                <SegmentedItem value="programs" className="rounded-full! px-4! text-control!">
                  Programs
                </SegmentedItem>
              </Segmented>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Search tutorials"
                className="ml-auto size-11 rounded-full border border-border bg-surface-panel"
                onClick={() => setSearching(true)}
              >
                <Search />
              </Button>
            </>
          )}
        </div>

        {list.length === 0 && (
          <p className="mt-6 text-center text-body text-muted-foreground">No tutorials match “{query.trim()}”</p>
        )}

        <ul className="mt-3 flex flex-col gap-2">
          {list.map((t) => (
            <li key={t.slug}>
              <button
                type="button"
                onClick={() => open(t.slug)}
                className="flex w-full items-center gap-3 rounded-card border border-border bg-surface-panel p-3 text-left transition-[background-color,transform] duration-150 ease-standard hover:bg-surface active:scale-[0.985] active:bg-surface motion-reduce:transition-none"
              >
                <Thumb src={thumb(t.slug, t.ext)} className="size-14" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-title">{t.name}</span>
                  <span className="mt-0.5 block text-caption text-muted-foreground">
                    {t.level} · {t.framework}
                    {started && t.slug === "hello-anchor" && " · In progress"}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
