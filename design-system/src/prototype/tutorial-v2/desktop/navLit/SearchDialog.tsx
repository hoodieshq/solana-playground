import { Command } from "cmdk"
import { CornerDownLeft, X } from "lucide-react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { useState, type ReactNode } from "react"

import { Kbd } from "@/components/ui/kbd"
import { cn } from "@/lib/utils"

import type { ProjectRow } from "../../navStates"
import { openSettings, openShortcuts, sectionFor, SETTINGS_KEYWORDS } from "../../settings/open"
import { HELP_LINKS } from "../../settings/links"
import { CATALOG, shownName } from "../../ui/catalog"
import { PROGRAMS } from "../../ui/programs"
import { view } from "../../view"
import { soon } from "../Catalog"
import { SETTINGS_KEYS } from "../keys"
import { LitIcon, type LitIconName } from "./icons"
import type { LessonItem } from "./Mine"


type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  lessons: LessonItem[]
  projects: ProjectRow[]
  onTutorial: (name: string) => void
  onPlace: (place: "home" | "gallery" | "programs") => void
  onNewProject: () => void
}

/** One result: its kind's icon, the name, a quiet fact on the right. The highlighted one swaps the fact
 * for ↵. `words` are more it answers to, as Open settings does to "mainnet" */
function Row({ value, icon, label, meta, warn, words = [], onSelect }: { value: string; icon: LitIconName; label: string; meta?: ReactNode; warn?: boolean; words?: string[]; onSelect: () => void }) {
  return (
    <Command.Item
      value={value}
      keywords={[label, value.split(" ")[0], ...words]}
      onSelect={onSelect}
      className="group/row flex h-9 cursor-default items-center gap-3 rounded-lg px-3 text-[0.875rem] text-foreground/85 data-[selected=true]:bg-surface-raised data-[selected=true]:text-foreground"
    >
      <LitIcon name={icon} className="size-4 shrink-0 text-muted-foreground group-data-[selected=true]/row:text-foreground" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {meta && (
        <span className={cn("shrink-0 text-[0.75rem] font-label group-data-[selected=true]/row:hidden", warn ? "text-warning-ink" : "text-(color:--text-quiet)")}>{meta}</span>
      )}
      <CornerDownLeft aria-hidden="true" className="hidden size-3.5 shrink-0 text-muted-foreground group-data-[selected=true]/row:block" />
    </Command.Item>
  )
}

const HEADING =
  "[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:text-[0.75rem] [&_[cmdk-group-heading]]:leading-4 [&_[cmdk-group-heading]]:font-act [&_[cmdk-group-heading]]:text-(color:--text-quiet)"

/** Search, from the nav's Search row or ⌘K anywhere: one field over everything a learner has and can
 * open (lessons, projects, the tutorials, the programs) and the few actions the nav offers. Empty, it
 * shows what you had open lately. The way Claude's desktop app searches,
 * set in Playground's own ground, type and icons */
export function SearchDialog({ open, onOpenChange, lessons, projects, onTutorial, onPlace, onNewProject }: Props) {
  const [query, setQuery] = useState("")
  const empty = query.trim() === ""

  const close = () => onOpenChange(false)
  const pick = (then: () => void) => () => {
    close()
    then()
  }
  const reset = (v: boolean) => {
    onOpenChange(v)
    if (!v) setQuery("")
  }

  const lessonMeta = (l: LessonItem) => (l.done ? "Finished" : l.at === 0 ? `${l.of} steps` : `Step ${l.at} of ${l.of}`)
  const lessonRows = (list: LessonItem[]) =>
    list.map((l) => <Row key={`l:${l.name}`} value={`lesson ${l.name}`} icon="tutorials" label={l.name} meta={lessonMeta(l)} onSelect={pick(l.onOpen)} />)
  const projectRows = (list: ProjectRow[]) =>
    list.map((p) => (
      <Row
        key={`p:${p.name}`}
        value={`project ${p.name}`}
        icon="project"
        label={p.name}
        meta={p.marker === "Not synced" ? "Not synced" : undefined}
        warn={p.marker === "Not synced"}
        onSelect={pick(soon)}
      />
    ))
  // A tutorial you've started is found under Learning, with its progress, not twice
  const started = new Set(lessons.map((l) => l.name))
  const tutorialRows = CATALOG.filter((t) => !started.has(t.name)).map((t) => (
    <Row key={`t:${t.slug}`} value={`tutorial ${shownName(t)}`} icon="tutorials" label={shownName(t)} meta={`${t.level} · ${t.framework}`} onSelect={pick(() => onTutorial(t.name))} />
  ))
  const programRows = PROGRAMS.map((p) => <Row key={`g:${p.name}`} value={`program ${p.name}`} icon="programs" label={p.name} meta={p.framework} onSelect={pick(() => onPlace("programs"))} />)
  const actionRows = [
    <Row key="a:new" value="action New project" icon="new" label="New project" onSelect={pick(onNewProject)} />,
    <Row key="a:home" value="action Go to Home" icon="home" label="Go to Home" onSelect={pick(() => onPlace("home"))} />,
    <Row key="a:tutorials" value="action Browse tutorials" icon="tutorials" label="Browse tutorials" onSelect={pick(() => onPlace("gallery"))} />,
    <Row key="a:assistant" value="action Connect the assistant" icon="profile" label="Connect the assistant" onSelect={pick(soon)} />,
    // Opens at the group a setting's word names: "mainnet" at Network, "vim" with Advanced unfolded
    <Row
      key="a:settings"
      value="action Open settings"
      icon="settings"
      label="Open settings"
      meta={SETTINGS_KEYS}
      words={SETTINGS_KEYWORDS}
      onSelect={pick(() => openSettings({ section: sectionFor(query) }))}
    />,
  ]
  // Typed only: the empty list stays short, and each of these is one word away. Shortcuts need a keyboard
  const helpRows = [
    ...(view === "desktop" || view === "tablet" ? [<Row key="h:keys" value="action Keyboard shortcuts" icon="keyboard" label="Keyboard shortcuts" meta="?" onSelect={pick(openShortcuts)} />] : []),
    ...HELP_LINKS.map((l) => (
      <Row key={`h:${l.label}`} value={`action ${l.label}`} icon={l.icon} label={l.label} meta="↗" onSelect={pick(() => window.open(l.url, "_blank", "noopener,noreferrer"))} />
    )),
  ]

  // Empty: what you had open lately, then the actions. Typed: every kind, which cmdk narrows
  const recent = [...lessons.filter((l) => !l.done), ...lessons.filter((l) => l.done)]
  const groups: { heading: string; rows: ReactNode[] }[] = empty
    ? [
          { heading: "Recent", rows: [...lessonRows(recent), ...projectRows(projects)].slice(0, 6) },
          { heading: "Actions", rows: actionRows },
        ]
    : [
        { heading: "Learning", rows: lessonRows(lessons) },
        { heading: "Projects", rows: projectRows(projects) },
        { heading: "Tutorials", rows: tutorialRows },
        { heading: "Programs", rows: programRows },
        { heading: "Actions", rows: [...actionRows, ...helpRows] },
      ]

  return (
    <DialogPrimitive.Root open={open} onOpenChange={reset}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed top-[16vh] left-1/2 z-50 w-[min(40rem,calc(100%-2rem))] -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-surface-panel shadow-modal outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.98]"
        >
          <DialogPrimitive.Title className="sr-only">Search</DialogPrimitive.Title>
          <Command
            loop
            // Plain substring, not cmdk's loose match: "anch" finds Hello Anchor, not "Connect the assistant"
            filter={(_, search, keywords) => ((keywords ?? []).some((k) => k.toLowerCase().includes(search.trim().toLowerCase())) ? 1 : 0)}
          >
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <LitIcon name="search" className="size-4 shrink-0 text-muted-foreground" />
              <Command.Input
                value={query}
                onValueChange={setQuery}
                placeholder="Search lessons, projects, tutorials and programs"
                className="h-7 min-w-0 flex-1 bg-transparent text-[0.9375rem] text-foreground outline-none placeholder:text-(color:--text-quiet)"
              />
              <DialogPrimitive.Close
                aria-label="Close search"
                className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-raised hover:text-foreground"
              >
                <X className="size-4" strokeWidth={2} />
              </DialogPrimitive.Close>
            </div>

            <Command.List className={cn("max-h-[min(26rem,52vh)] scroll-py-2 overflow-y-auto px-1.5 pb-2", HEADING)}>
              <Command.Empty className="px-3 py-10 text-center text-[0.8125rem] text-muted-foreground">
                Nothing matches “{query.trim()}”
              </Command.Empty>
              {groups.map((g) => g.rows.length > 0 && <Command.Group key={g.heading} heading={g.heading}>{g.rows}</Command.Group>)}
            </Command.List>

            <div className="flex items-center gap-4 border-t border-border px-4 py-2.5 text-[0.75rem] font-label text-muted-foreground">
              <span className="flex items-center gap-1.5">
                Open <Kbd>↵</Kbd>
              </span>
              <span className="flex items-center gap-1.5">
                Move <Kbd>↑</Kbd>
                <Kbd>↓</Kbd>
              </span>
              <span className="ml-auto flex items-center gap-1.5">
                Close <Kbd>Esc</Kbd>
              </span>
            </div>
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
