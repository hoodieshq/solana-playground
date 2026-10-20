import { useState } from "react"
import { Search, X } from "lucide-react"
import { toast } from "sonner"

import { BrandButton } from "@/components/ui/brand-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Segmented, SegmentedItem } from "@/components/ui/segmented"

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
          <section aria-label="Continue" className="mt-4 rounded-card border border-brand-violet/60 bg-surface-panel p-4">
            <p className="text-caption text-muted-foreground">Continue</p>
            <div className="mt-2 flex items-center gap-3">
              <Thumb src={thumb("hello-anchor", "jpg")} className="size-12" />
              <div className="min-w-0 flex-1">
                <p className="text-title">Hello Anchor</p>
                <p className="text-caption text-muted-foreground">
                  Step {s.step + 1} of {STEPS.length} · {STEPS[s.step].title}
                </p>
                <Progress value={(done / STEPS.length) * 100} className="mt-2" />
              </div>
            </div>
            <BrandButton variant="accent" className="mt-3 h-11 w-full" onClick={() => dispatch({ type: "start" })}>
              Continue
            </BrandButton>
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
