import { Ellipsis, FolderClosed, Plus } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

import { LESSON } from "../../data"
import { soon } from "../../desktop/Catalog"
import { setPinned, usePins } from "../../desktop/navLit/pins"
import { TutorialThumb } from "../../desktop/TutorialList"
import { useOpenTutorial } from "../../host"
import { LESSONS } from "../../lessons"
import { useNavState } from "../../navStates"
import { progressOf, savedProgress, useStore } from "../../store"
import { CATALOG as CATALOG_TUTORIALS, shownName } from "../../ui/catalog"
import { FrameworkLogo } from "../../newProject/next/FrameworkCard"
import { frameworkOf } from "../../newProject/next/data"
import { openFirstLight } from "../../newProject/next/open"
import { ResumeList, type ResumeItem } from "../../ui/ResumeList"
import { CATALOG } from "../data"
import { deleteProject, go, steps, usePrograms, type Project } from "../store"
import { ProgramIcon } from "./catalog-parts"
import { deletable, deleteQuestion, startRename } from "./shell/GuideColumn"

/** Where a project of yours stands, in its step strip's words: the step it's on, or how it ended */
function whereNow(p: Project): { where: string; done: boolean } {
  const list = steps(p)
  const at = list.findIndex((s) => s.state !== "done" && s.state !== "stale")
  // Done first, as the strip says it, then where it lives
  if (at === -1) return { where: p.framework === "ts-client" ? "Done · Ran on devnet" : "Done · Runs on devnet", done: true }
  const step = list[at]
  if (step.state === "failed") return { where: `${step.label} failed`, done: false }
  return { where: list.length > 1 ? `Step ${at + 1} of ${list.length} · ${step.label}` : step.label, done: false }
}

/** The last thing you did in it: made, built, deployed or called. Opening it or typing leaves no time in
 * the prototype; the product would keep a last opened one */
const touched = (p: Project) => Math.max(p.createdAt, p.build.s === "ok" ? p.build.at : 0, p.deploy.s === "ok" ? p.deploy.at : 0, p.lastCallOkAt)

/** A row's ⋯: the project's own Pin, Rename and Delete, so the list can be tidied without opening each
 * one; the limit of ten makes that a chore of the list (Almaz, 10 Nov). Rename opens the project with its
 * name as a field, as the head's ⋯ does */
function RowMenu({ p, onDelete }: { p: Project; onDelete: () => void }) {
  const pinned = !!usePins()[p.name]
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`More for ${p.name}`} className="text-muted-foreground pointer-coarse:size-11">
          <Ellipsis />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuItem
          onSelect={() => {
            setPinned(p.name, !pinned)
            toast(pinned ? "Unpinned from the sidebar" : "Pinned to the sidebar")
          }}
        >
          {pinned ? "Unpin from sidebar" : "Pin to sidebar"}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            go({ at: "project", id: p.id })
            // The head listens once the project is on screen
            requestAnimationFrame(() => requestAnimationFrame(() => startRename(p.id)))
          }}
        >
          Rename
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={onDelete}>
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Your programs, over Solana's examples: every project you made or kept, last worked on first. A catalog program you only read isn't a project and stays on its
 * card (CONSENSUS-delta 2.7) */
export function YourPrograms({ empty = false }: { empty?: boolean }) {
  const projects = usePrograms((s) => s.projects)
  const [asking, setAsking] = useState<string | null>(null)
  const items: ResumeItem[] = Object.values(projects)
    .filter(deletable)
    .sort((a, b) => touched(b) - touched(a) || b.createdAt - a.createdAt)
    .map((p) => {
      const meta = p.slug ? CATALOG.find((m) => m.slug === p.slug) : undefined
      return {
        key: p.id,
        // Every logo on one 44 tile, as the catalog's and the lessons' covers: on their own, circles, a square
        // and Native's bare stripes made a ragged column (Almaz, 10 Nov)
        // TypeScript's mark is a square of its own, so it is the tile: inside the grey one it sat as a box in
        // a box (Almaz, 10 Nov)
        cover: meta ? (
          <ProgramIcon p={meta} className="shrink-0" />
        ) : p.framework === "ts-client" ? (
          <span aria-hidden="true" className="size-11 shrink-0 overflow-hidden rounded-[9px]">
            <FrameworkLogo f={frameworkOf(p.framework)} size={44} />
          </span>
        ) : (
          <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-[9px] bg-foreground/[0.06]">
            <FrameworkLogo f={frameworkOf(p.framework)} size={26} />
          </span>
        ),
        name: p.name,
        ...whereNow(p),
        onOpen: () => go({ at: "project", id: p.id }),
        menu: <RowMenu p={p} onDelete={() => setAsking(p.id)} />,
        confirm:
          asking === p.id ? (
            <>
              <span className="min-w-0 flex-1 text-[0.875rem] leading-5 text-foreground">{deleteQuestion(p)}</span>
              <Button variant="ghost" size="sm" onClick={() => setAsking(null)} className="pointer-coarse:h-11">
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                autoFocus
                onClick={() => {
                  setAsking(null)
                  deleteProject(p.name)
                  toast(`Deleted ${p.name}`)
                }}
                className="pointer-coarse:h-11"
              >
                Delete
              </Button>
            </>
          ) : undefined,
      }
    })
  // The rest of what the nav's Projects holds, so the two lists are one (Almaz, 10 Nov): a tutorial you
  // finished, whose code is now yours, and the account's own projects. Neither has steps to show here
  const [, nav] = useNavState()
  const { s } = useStore()
  const openTutorial = useOpenTutorial()
  const rows = Array.isArray(nav.projects) ? nav.projects : []
  const finished = Object.values(LESSONS)
    .filter((l) => (l.card.slug === LESSON.card.slug ? progressOf(s) : savedProgress(l.card.slug, l.steps.length)).finished)
    .map((l) => l.card.name)
  const lessonNames = new Set([...finished, ...rows.filter((r) => r.lesson && r.progress === "done").map((r) => r.name)])
  const mine = new Set(items.map((i) => i.name))
  for (const name of lessonNames) {
    const t = CATALOG_TUTORIALS.find((c) => shownName(c) === name || c.name === name)
    if (mine.has(name) || !t) continue
    items.push({ key: `lesson-${t.slug}`, cover: <TutorialThumb t={t} />, name, where: "Done · From a tutorial", done: true, onOpen: () => openTutorial(t.slug) })
  }
  for (const r of rows.filter((r) => !r.lesson && !mine.has(r.name))) {
    items.push({
      key: `account-${r.name}`,
      cover: (
        <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-[9px] bg-foreground/[0.06] text-muted-foreground">
          <FolderClosed className="size-5" strokeWidth={1.75} />
        </span>
      ),
      name: r.name,
      // Where its work lives, as the nav marks it; the prototype knows nothing else about these
      where: r.marker ?? "Saved to your account",
      onOpen: soon,
    })
  }
  // A review switch: `?yours=25` pads the list to that many with account projects, to see a long one
  const pad = Number(new URLSearchParams(location.search).get("yours")) || 0
  const PAD_NAMES = ["escrow", "nft-mint", "dao-votes", "airdrop-claim", "amm-pool", "lottery", "multisig", "staking", "crowdfund", "oracle-feed"]
  for (let i = 0; items.length < pad; i++) {
    const name = `${PAD_NAMES[i % PAD_NAMES.length]}${i >= PAD_NAMES.length ? `-${Math.floor(i / PAD_NAMES.length) + 1}` : ""}`
    items.push({
      key: `pad-${name}`,
      cover: (
        <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-[9px] bg-foreground/[0.06] text-muted-foreground">
          <FolderClosed className="size-5" strokeWidth={1.75} />
        </span>
      ),
      name,
      where: "Saved to your account",
      onOpen: soon,
    })
  }
  // No "9 of 10 used" beside the heading: next to the list's own number it confused (Almaz, 11 Nov); the
  // Deploy card says the limit where it bites. Projects, the nav's word for the same list
  return (
    <ResumeList
      id="programs-yours"
      title="Your projects"
      items={items}
      empty={
        empty ? (
          <>
            <p className="min-w-0 flex-1 basis-64 text-[0.875rem] leading-5 text-muted-foreground">Nothing here yet. Open a program below and it's kept here, or start one of your own.</p>
            <Button variant="outline" size="sm" onClick={() => openFirstLight({ entry: "empty-list" })} className="pointer-coarse:h-11">
              <Plus />
              New project
            </Button>
          </>
        ) : undefined
      }
    />
  )
}
