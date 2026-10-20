import { useState } from "react"
import { ChevronRight, Search, X } from "lucide-react"
import { toast } from "sonner"

import { BrandButton } from "@/components/ui/brand-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

import { STEPS, TUTORIALS, thumb } from "../data"
import { useStore } from "../store"
import { Thumb } from "../ui/Thumb"
import { TopBar } from "../ui/TopBar"

export function Gallery() {
  const { s, dispatch } = useStore()
  const [query, setQuery] = useState("")
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

        <div className="mt-4 grid grid-cols-2 gap-1 rounded-control bg-surface-panel p-1 text-control">
          <span className="flex h-11 items-center justify-center gap-2 rounded-md bg-surface-raised">
            <span className="flex items-baseline gap-2">
              Tutorials <span className="text-caption text-muted-foreground">16</span>
            </span>
          </span>
          <button
            type="button"
            className="flex h-11 items-center justify-center gap-2 rounded-md text-muted-foreground"
            onClick={() => toast("Programs are not in this prototype")}
          >
            <span className="flex items-baseline gap-2">
              Programs <span className="text-caption text-muted-foreground">34</span>
            </span>
          </button>
        </div>

        <label className="relative mt-3 block">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tutorials" className="h-11 pl-9" />
        </label>

        <ul className="mt-3 flex flex-col gap-2">
          {list.map((t) => (
            <li key={t.slug}>
              <button
                type="button"
                onClick={() => open(t.slug)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-card border border-border bg-surface-panel p-3 text-left",
                  t.slug !== "hello-anchor" && "opacity-80"
                )}
              >
                <Thumb src={thumb(t.slug, t.ext)} className="size-14" />
                <span className="min-w-0 flex-1">
                  <span className="block text-caption text-muted-foreground">
                    {t.level} · {t.framework}
                    {t.slug === "hello-anchor" && ` · ${STEPS.length} steps`}
                  </span>
                  <span className="block text-title">{t.name}</span>
                  {t.slug === "hello-anchor" && (
                    <span className="block text-caption text-muted-foreground">Hello world program with the Anchor framework.</span>
                  )}
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
