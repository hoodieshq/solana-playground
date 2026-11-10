import { useState } from "react"
import { ArrowUpRight, CircleAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Segmented, SegmentedItem } from "@/components/ui/segmented"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

import { ACTION, ACTION_FILL, ACTION_SOFT } from "../../../ui/type"
import { programBySlug } from "../../data"
import { cancelOpening, pickProgram, retryOpening, type OpenFail, type Project } from "../../store"
import { QUIET } from "./parts"

/* The import from GitHub, where the preview page used to show it (Almaz, 6 Nov): in the Guide, under
   the program's intro, as the feed's card. Reading, then downloading n of total with a bar; a failure
   says what happened and that nothing was made; a folder with several programs asks which first */

const CARD = "flex flex-col overflow-hidden rounded-panel border border-border bg-(--card-ground)"

const BAR_CSS = `
@keyframes opening-read { from { transform: translateX(-100%); } to { transform: translateX(340%); } }
.opening-read { animation: opening-read 1.1s cubic-bezier(0.45, 0, 0.2, 1) infinite; }
@media (prefers-reduced-motion: reduce) { .opening-read { animation: none; transform: none; } }`

const FAIL_LINE: Record<OpenFail, (path: string) => string> = {
  notFound: (path) => `${path} wasn't found on GitHub. It may be private, or the link is out of date.`,
  rateLimited: () => "GitHub's hourly limit for this browser was reached. Try again in a few minutes.",
  network: () => "Couldn't reach GitHub. Check your connection and try again.",
}

const githubUrl = (repo: string, path: string) => `https://github.com/${repo}/tree/master/${path}`

export function OpeningCard({ p }: { p: Project }) {
  const meta = p.slug ? programBySlug(p.slug) : undefined
  const o = p.opening
  if (!o || !meta) return null

  if (o.s === "pick") return <Pick p={p} options={o.options} />

  if (o.s === "failed")
    return (
      <section aria-label="Couldn't open" className={CARD}>
        <div className="flex flex-col gap-1.5 px-4 py-3">
          <div className="flex items-center gap-2">
            <CircleAlert aria-hidden="true" className="size-4 shrink-0 text-error" />
            <h3 className="font-heading text-[1rem] leading-6 font-medium text-foreground">{`Couldn't open ${p.name}`}</h3>
          </div>
          <p className="text-[0.9375rem] leading-[1.375rem] text-foreground/80">
            {FAIL_LINE[o.kind](meta.path)} <span className="text-muted-foreground">Nothing was created.</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-2.5">
          <Button onClick={() => retryOpening(p.id)} className={cn(ACTION, ACTION_FILL)}>
            Try again
          </Button>
          {o.kind === "notFound" && (
            <Button variant="ghost" asChild className={cn(ACTION, ACTION_SOFT)}>
              <a href={githubUrl(meta.repo, meta.path)} target="_blank" rel="noreferrer">
                View on GitHub
                <ArrowUpRight aria-hidden="true" />
              </a>
            </Button>
          )}
          <button type="button" onClick={() => cancelOpening(p.id)} className={cn(QUIET, "ml-auto")}>
            Back to Programs
          </button>
        </div>
      </section>
    )

  const reading = o.s === "reading"
  const share = o.s === "downloading" ? o.n / o.total : 0
  return (
    <section aria-label="Opening from GitHub" className={CARD}>
      <style>{BAR_CSS}</style>
      <div className="flex flex-col gap-3 px-4 py-3">
        {/* Cancel in the head: a foot bar held only it and the repo path, which the intro's source link names */}
        <div className="flex items-center gap-2">
          <Spinner className="size-4 text-muted-foreground" />
          <h3 className="font-heading text-[1rem] leading-6 font-medium text-foreground">Opening from GitHub</h3>
          <button type="button" onClick={() => cancelOpening(p.id)} className={cn(QUIET, "ml-auto")}>
            Cancel
          </button>
        </div>
        <p role="status" className="text-[0.875rem] leading-5 text-muted-foreground tabular-nums">
          {reading ? `Reading ${meta.repo.split("/")[1]}` : `Downloading files · ${o.s === "downloading" ? o.n : 0} of ${o.s === "downloading" ? o.total : 0}`}
        </p>
        <span aria-hidden="true" className="relative h-1 overflow-hidden rounded-[4px] bg-foreground/12">
          {reading ? (
            <span className="opening-read absolute inset-y-0 left-0 w-[30%] rounded-[4px] bg-gradient-product-flat" />
          ) : (
            <span className="absolute inset-y-0 left-0 rounded-[4px] bg-gradient-product-flat transition-[width] duration-150 ease-standard motion-reduce:transition-none" style={{ width: `${share * 100}%` }} />
          )}
        </span>
      </div>
    </section>
  )
}

/** A folder with several programs: which one to open, before anything downloads */
function Pick({ p, options }: { p: Project; options: string[] }) {
  const [picked, setPicked] = useState(options[0])
  return (
    <section aria-label="Pick a program" className={CARD}>
      <div className="flex flex-col gap-3 px-4 py-3">
        <div className="flex flex-col gap-1">
          <h3 className="font-heading text-[1rem] leading-6 font-medium text-foreground">{`This folder has ${options.length} programs`}</h3>
          <p className="text-[0.9375rem] leading-[1.375rem] text-foreground/80">Pick the one to open. You can open the other one from Programs later.</p>
        </div>
        <Segmented variant="gradient" aria-label="Program to open" value={picked} onValueChange={(v) => v && setPicked(v)}>
          {options.map((name) => (
            <SegmentedItem key={name} value={name} className="cursor-pointer font-mono text-[0.8125rem] pointer-coarse:h-11">
              {name}
            </SegmentedItem>
          ))}
        </Segmented>
      </div>
      <div className="flex items-center gap-2 border-t border-border px-4 py-2.5">
        <Button onClick={() => pickProgram(p.id, picked)} className={cn(ACTION, ACTION_FILL)}>
          {`Open ${picked}`}
        </Button>
        <button type="button" onClick={() => cancelOpening(p.id)} className={cn(QUIET, "ml-auto pointer-coarse:-my-3.5 pointer-coarse:py-3.5")}>
          Back to Programs
        </button>
      </div>
    </section>
  )
}
