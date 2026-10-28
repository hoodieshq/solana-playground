import type { KeyboardEvent } from "react"
import { FileCode } from "lucide-react"

import { cn } from "@/lib/utils"

import { CLIENT, INITIAL_FILES, STEPS } from "../data"
import { useStore } from "../store"
import { NAV_ICONS } from "./navIcons"

/** One row shape for the tree, the nav's: 28px, 13px, the glyph in a 16px box */
export const ROW =
  "flex h-7 w-full items-center gap-2 rounded-[6px] px-2 text-left text-[0.8125rem] whitespace-nowrap outline-none transition-colors duration-100 hover:bg-surface-hover hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-purple motion-reduce:transition-none"

/** A file's icon, tinted by its language, as the editor's tabs tint them */
/** File glyphs stay grey: the name says which file, colour is kept for what needs you */
export const fileTint = (_file: string) => "text-muted-foreground"

type Entry = { kind: "folder"; name: string; depth: number } | { kind: "file"; path: string; depth: number }

/** The step that first writes client.ts, counted from 1: step 3 in Hello Anchor, step 2 in Lumberjack */
const clientStep = () =>
  STEPS.findIndex((s) => s.file === CLIENT || s.beats.some((b) => (b.kind === "write" || b.kind === "ask") && !!b.writes && ("create" in b.writes ? b.writes.create === CLIENT : b.writes.file === CLIENT))) + 1

/** The folders group the files on their own, no section labels over them: each folder in the order
 * its first file comes (src, then client), then the files at the project's root */
function treeOf(files: string[]): Entry[] {
  const folders = [...new Set(files.filter((f) => f.includes("/")).map((f) => f.split("/")[0]))]
  return [
    ...folders.flatMap((name) => [
      { kind: "folder", name, depth: 0 } as Entry,
      ...files.filter((f) => f.startsWith(`${name}/`)).map((path) => ({ kind: "file", path, depth: 1 }) as Entry),
    ]),
    ...files.filter((f) => !f.includes("/")).map((path) => ({ kind: "file", path, depth: 0 }) as Entry),
  ]
}

/** The project's files by folder. A child starts right under its parent's name (caret 12 + gap 8 per
 * level). The open file is marked, the live step's file carries a dot and client.ts says when it
 * arrives. Only the lesson's files are listed: a file it never uses would be a dead end. Arrows move between files. `tall` is the phone's 44px rows */
/** A level's indent: the folder's caret (12) and the gap after it (8), so a child lines up with its parent's name */
const STEP = 20

export function FileTreeList({ onPick, tall = false }: { onPick: (file: string) => void; tall?: boolean }) {
  const { s } = useStore()
  const live = s.started ? STEPS[s.step].file : null
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return
    const rows = [...e.currentTarget.querySelectorAll<HTMLButtonElement>("button[data-file]:not(:disabled)")]
    const at = rows.findIndex((r) => r === document.activeElement)
    const to = e.key === "ArrowDown" ? Math.min(rows.length - 1, at + 1) : Math.max(0, at - 1)
    e.preventDefault()
    rows[at === -1 ? 0 : to]?.focus()
  }
  return (
    <div role="tree" aria-label="Files" onKeyDown={onKeyDown} className="flex flex-col gap-px">
      {treeOf(Object.keys(INITIAL_FILES)).map((e, i) => {
        const indent = { paddingLeft: `${8 + e.depth * STEP}px` }
        if (e.kind === "folder")
          return (
            // On the phone a folder is only a label, never tapped: 36, not a file's 44, so the list doesn't
            // drift apart, and the names at the reading size so 44px rows don't hold little words
            <div key={i} style={indent} className={cn(ROW, "cursor-default text-muted-foreground hover:bg-transparent", tall && "h-9 text-[0.9375rem]")}>
              <span aria-hidden="true" className="flex size-3 text-muted-foreground [&>svg]:size-full">
                {NAV_ICONS.caret}
              </span>
              {e.name}
            </div>
          )
        const name = e.path.split("/").pop()
        const open = s.open === e.path
        const waiting = e.path === CLIENT && !s.tabs.includes(CLIENT)
        return (
          <button
            key={i}
            type="button"
            role="treeitem"
            aria-selected={open}
            data-file={e.path}
            disabled={waiting}
            onClick={() => onPick(e.path)}
            style={indent}
            className={cn(
              ROW,
              "relative disabled:cursor-default disabled:hover:bg-transparent",
              tall && "h-11 text-[0.9375rem]",
              // The sheet is the hover grey itself, so on the phone the open file takes a fill of its own and
              // hover leaves it be: the hover grey wiped the fill, and a tap's hover sticks on a phone. A press
              // answers instead
              open ? cn("text-foreground", tall ? "bg-foreground/[0.07]" : "bg-surface-hover") : "text-muted-foreground",
              tall && (open ? "hover:bg-foreground/[0.07]" : "hover:bg-transparent active:bg-foreground/[0.05]")
            )}
          >
            <FileCode className={cn("shrink-0 text-subtle", tall ? "size-4" : "size-[15px]")} aria-hidden="true" />
            <span className="truncate">{name}</span>
            {/* Not there yet, so said once in words: no fade, no lock */}
            {waiting && <span className="ml-auto pl-3 text-caption text-muted-foreground">Created in step {clientStep()}</span>}
            {!waiting && live === e.path && <span aria-label="This step's file" className="ml-auto size-1.5 shrink-0 rounded-full bg-brand-purple" />}
          </button>
        )
      })}
    </div>
  )
}
