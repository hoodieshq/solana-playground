import { ArrowUpRight, ChevronRight, Search } from "lucide-react"
import { useEffect, useState } from "react"

import {
  ActionCard,
  ActionCardAction,
  ActionCardContent,
  ActionCardDescription,
  ActionCardEyebrow,
  ActionCardLink,
  ActionCardMedia,
  ActionCardTitle,
} from "@/components/ui/action-card"
import { AsyncButton } from "@/components/ui/async-button"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Modal, ModalBody, ModalContent, ModalHeader, ModalTitle } from "@/components/ui/modal"
import { Segmented, SegmentedCount, SegmentedItem } from "@/components/ui/segmented"

import { CatalogSearch } from "../../desktop/Catalog"
import { useOpenTutorial } from "../../host"
import { CATALOG, filterCatalog, upstreamName, type Entry } from "../../ui/catalog"
import { filterPrograms, programIcon, programTags, PROGRAMS, type Program } from "../../ui/programs"
import { TutorialCover } from "../../ui/TutorialCover"
import { onProjectCreated, type NewProjectState } from "../design"
import { importProgram } from "./projects"
import { NAME_RULE, StartFromScratch, type Start } from "./StartFromScratch"

type Tab = "tutorials" | "programs"

const TABS: { value: Tab; label: string }[] = [
  { value: "tutorials", label: "Tutorials" },
  { value: "programs", label: "Programs" },
]

/** A card's Open: running, with what it is doing, or failed, with why */
type CardOpen = { state: "running"; text?: string } | { state: "failed"; message: string }
type Opening = { id: string; open: CardOpen }

/** The programs' list, read when the dialog opens. The tutorials ship with the app and never load */
type Listing = "loading" | "ready" | "failed"

/** Where a forced state starts the flow */
type Seed = { scratch?: { name: string; start: Start }; starting?: boolean; tab?: Tab; query?: string; listing?: Listing; opening?: Opening }

const RATE_LIMIT = "GitHub's hourly request limit for this browser has been reached. Please try again later."

const SEEDS: Record<NewProjectState, Seed> = {
  live: {},
  invalid: { scratch: { name: "my project!", start: { state: "invalid", error: NAME_RULE } } },
  // The product's own bug, kept: a second Start with the name left empty takes the same default name
  taken: { scratch: { name: "", start: { state: "failed", error: "Already exists" } } },
  creating: { scratch: { name: "", start: { state: "creating" } }, starting: true },
  failed: { scratch: { name: "", start: { state: "failed", error: "Could not create the project" } } },
  "lists-loading": { tab: "programs", listing: "loading" },
  "lists-failed": { tab: "programs", listing: "failed" },
  "no-match": { query: "quantum" },
  downloading: { tab: "programs", opening: { id: PROGRAMS[0].name, open: { state: "running", text: "Downloading 12/24 files…" } } },
  "open-failed": { tab: "programs", opening: { id: PROGRAMS[0].name, open: { state: "failed", message: RATE_LIMIT } } },
}

/** "What do you want to build?", as client-v2's NewWorkspaceModal and widgets/catalog NewProject
 * (scope/interface-2): Start from scratch, then Tutorials and Programs as one choice with a count
 * each beside the search, then the chosen list, and a fade at its foot while it runs on. One Open or
 * Start at a time. Below 768 px the dialog is a page of its own. Mounted again for every opening,
 * and kept while closed, so an Open still running ends as it would */
export function NewProject({ open, onClose, state }: { open: boolean; onClose: () => void; state: NewProjectState }) {
  const seed = SEEDS[state]
  const [tab, setTab] = useState<Tab>(seed.tab ?? "tutorials")
  const [query, setQuery] = useState(seed.query ?? "")
  const [starting, setStarting] = useState(seed.starting ?? false)
  const [opening, setOpening] = useState<Opening | null>(seed.opening ?? null)
  const [listing, setListing] = useState<Listing>(seed.listing ?? "loading")
  const [attempt, setAttempt] = useState(0)

  // The product reads the programs on every opening. A forced state holds its list where it is
  useEffect(() => {
    if (attempt === 0 && seed.listing) return
    setListing("loading")
    const t = setTimeout(() => setListing("ready"), 600)
    return () => clearTimeout(t)
  }, [attempt, seed.listing])

  const busy = opening?.open.state === "running"
  const held = busy || starting
  const openTutorial = useOpenTutorial()
  const tutorials = filterCatalog(query, "all")
  const programs = filterPrograms(query)

  const openProgram = async (p: Program) => {
    if (held) return
    setOpening({ id: p.name, open: { state: "running" } })
    await importProgram((text) => setOpening({ id: p.name, open: { state: "running", text } }))
    setOpening(null)
    onClose()
    onProjectCreated({ name: p.name, framework: p.framework })
  }

  const counts: Record<Tab, string> = {
    tutorials: String(CATALOG.length),
    programs: listing === "ready" ? String(PROGRAMS.length) : listing === "loading" ? "…" : "?",
  }

  return (
    <Modal open={open} onOpenChange={(next) => !next && onClose()}>
      {/* Opens with nothing ringed: the name is one choice among the catalogue's */}
      <ModalContent
        size="wide"
        aria-describedby={undefined}
        onOpenAutoFocus={(e) => {
          e.preventDefault()
          ;(e.currentTarget as HTMLElement).focus()
        }}
      >
        <ModalHeader className="md:pb-4">
          <ModalTitle>What do you want to build?</ModalTitle>
        </ModalHeader>
        <ModalBody className="md:pt-5">
          <div className="flex flex-col gap-4">
            <p className="text-control font-read text-muted-foreground">
              Start clean, open a real program, or learn through a tutorial. Everything stays in this browser until you deploy.
            </p>

            <StartFromScratch held={busy} onRunning={setStarting} onStarted={onClose} seed={seed.scratch} />

            <div className="flex flex-wrap items-center gap-3">
              <Segmented variant="boxed" aria-label="Gallery source" value={tab} onValueChange={(next) => next && setTab(next as Tab)} className="max-md:w-full">
                {TABS.map((t) => (
                  <SegmentedItem key={t.value} value={t.value} className="max-md:flex-1">
                    {t.label}
                    <SegmentedCount>{counts[t.value]}</SegmentedCount>
                  </SegmentedItem>
                ))}
              </Segmented>
              <CatalogSearch label={tab} query={query} onQuery={setQuery} icon={false} className="max-w-none min-w-40 flex-1" />
            </div>

            {tab === "tutorials" &&
              (tutorials.length ? (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(min(20rem,100%),1fr))] gap-3">
                  {tutorials.map((t) => (
                    <TutorialCard
                      key={t.slug}
                      t={t}
                      busy={held}
                      onOpen={() => {
                        onClose()
                        openTutorial(t.slug)
                      }}
                    />
                  ))}
                </div>
              ) : (
                <NoMatch label="tutorials" query={query} onClear={() => setQuery("")} />
              ))}

            {tab === "programs" && listing === "failed" && (
              <div role="alert" className="flex items-center gap-3 text-control">
                <span className="text-error">Could not load the programs.</span>
                <Button variant="outline" onClick={() => setAttempt((n) => n + 1)}>
                  Try again
                </Button>
              </div>
            )}
            {tab === "programs" && listing === "loading" && <p className="text-control text-muted-foreground">Loading programs…</p>}
            {tab === "programs" &&
              listing === "ready" &&
              (programs.length ? (
                <div className="grid grid-cols-1 gap-3 min-[720px]:grid-cols-2">
                  {programs.map((p) => (
                    <ProgramCard key={p.name} p={p} open={opening?.id === p.name ? opening.open : undefined} busy={held} onOpen={() => openProgram(p)} />
                  ))}
                </div>
              ) : (
                <NoMatch label="programs" query={query} onClear={() => setQuery("")} />
              ))}

            {/* Sticks to the foot of the scroll area while the list runs past it, so a cut off card
                reads as more below. Scrolled to the end it lies over the last row's padding only */}
            <div aria-hidden="true" className="pointer-events-none sticky bottom-0 -mt-6 h-6 shrink-0 bg-linear-to-t from-surface-panel to-transparent" />
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  )
}

/** What a card says under its description while its Open runs, or once it failed */
function OpenLine({ open }: { open?: CardOpen }) {
  if (open?.state === "running" && open.text) return <p className="text-caption text-muted-foreground">{open.text}</p>
  if (open?.state === "failed")
    return (
      <p role="alert" className="text-caption text-error">
        {open.message}
      </p>
    )
  return null
}

/** A tutorial as client-v2's BaseTutorialCard draws it: the cover, the name, the description, level
 * and framework under it, and a corner square that opens it. Below 768 px a chevron takes the square's
 * place. One button, stretched over the card */
function TutorialCard({ t, busy, onOpen }: { t: Entry; busy: boolean; onOpen: () => void }) {
  const title = upstreamName(t)
  return (
    <ActionCard className="gap-3.5">
      <ActionCardMedia variant="image" className="h-14">
        <TutorialCover name={title} framework={t.framework} />
      </ActionCardMedia>
      <ActionCardContent>
        <ActionCardTitle className="min-w-0">{title}</ActionCardTitle>
        <ActionCardDescription>{t.description}</ActionCardDescription>
        <p className="mt-1.5 text-caption text-subtle tabular-nums">{`${t.level} · ${t.framework}`}</p>
      </ActionCardContent>
      <ActionCardLink asChild>
        <button type="button" aria-label={`Open ${title}`} disabled={busy} onClick={onOpen} className="static shrink-0 self-start max-md:self-center">
          <span className="grid size-8 place-items-center rounded-lg bg-surface-raised text-foreground max-md:hidden">
            <ArrowUpRight aria-hidden="true" className="size-4" />
          </span>
          <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground md:hidden" />
        </button>
      </ActionCardLink>
    </ActionCard>
  )
}

/** A program as client-v2's BaseCatalogGrid draws it: the icon, framework and category, the name, two
 * lines of description, the Open's progress or failure, and Open. Below 768 px Open hides and the
 * whole card opens through its title */
function ProgramCard({ p, open, busy, onOpen }: { p: Program; open?: CardOpen; busy: boolean; onOpen: () => Promise<void> }) {
  return (
    <ActionCard>
      <ActionCardMedia variant="image">
        <img src={programIcon(p)} alt="" />
      </ActionCardMedia>
      <ActionCardContent>
        <ActionCardEyebrow>{programTags(p)}</ActionCardEyebrow>
        <ActionCardTitle>
          <ActionCardLink asChild>
            <button type="button" disabled={busy} onClick={onOpen}>
              {p.name}
            </button>
          </ActionCardLink>
        </ActionCardTitle>
        <ActionCardDescription>{p.description}</ActionCardDescription>
        <OpenLine open={open} />
      </ActionCardContent>
      <ActionCardAction>
        <AsyncButton type="button" variant="outline" aria-label={`Open ${p.name}`} disabled={busy} onClick={onOpen}>
          Open
        </AsyncButton>
      </ActionCardAction>
      <ChevronRight aria-hidden="true" className="size-4 shrink-0 self-center text-muted-foreground md:hidden" />
    </ActionCard>
  )
}

/** A search that matched nothing: the query said back on a soft fill, and one way back */
function NoMatch({ label, query, onClear }: { label: string; query: string; onClear: () => void }) {
  return (
    <Empty className="flex-none gap-6 bg-surface-panel px-6 py-10">
      <EmptyHeader className="gap-1">
        <EmptyMedia className="mb-2 text-muted-foreground">
          <Search className="size-6" aria-hidden />
        </EmptyMedia>
        <EmptyTitle role="heading" aria-level={2} className="text-lg leading-tight text-foreground">
          {`No ${label} match “${query}”`}
        </EmptyTitle>
        <EmptyDescription className="font-read">Try a shorter word.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" className="pointer-coarse:h-11 pointer-coarse:px-5" onClick={onClear}>
          Clear search
        </Button>
      </EmptyContent>
    </Empty>
  )
}
