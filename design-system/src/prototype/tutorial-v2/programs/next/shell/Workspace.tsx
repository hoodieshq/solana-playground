import { useEffect, useRef, useState, type ReactNode } from "react"
import { ChevronLeft, ChevronRight, Folder, Terminal } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ConsoleDrawer, ConsoleDrawerBar, ConsoleDrawerContent, ConsoleDrawerStatus } from "@/components/ui/console-drawer"
import { CopyButton } from "@/components/ui/copy-button"
import { EditorTab, EditorTabClose, EditorTabLabel, EditorTabs, EditorTabTrigger } from "@/components/ui/editor-tabs"
import { Kbd } from "@/components/ui/kbd"
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover"
import { StatusDot } from "@/components/ui/status-dot"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

import { Editor } from "../../../desktop/Editor"
import { ASSISTANT_KEYS, FILES_KEYS, TERMINAL_KEYS } from "../../../desktop/keys"
import { BuildLog } from "../../../ui/BuildLog"
import { ROW } from "../../../ui/FileTreeList"
import { AssistantMark } from "../../../ui/AssistantMark"
import { ask, balanceOf, busy, edit, go, metaOf, onChain, openFile, setTerminal, usePrograms, type Project, type Turn } from "../../store"
import { WalletChip } from "../../../desktop/WalletChip"
import { AskPanel, AskThread } from "./AskPanel"
import { CallPanel } from "./CallPanel"
import { MoreMenu, ProjectName, ShortcutsDialog } from "./GuideColumn"
import { OpeningCard } from "./Opening"
import { PanelHide } from "./parts"
import { FullNotice } from "./Quota"
import { DevnetChip, LIT_CSS, ReadNotice, onReadOnlyKey, useLit } from "./Read"
import { InteractTab, StageAction, StageTrack, stagesOf } from "./Stages"
import { baseName, changedFiles, failLive, onReveal, shortKey, statusOf } from "./util"

/** The workspace docks the tree beside the editor from this width (ui-design.md, --tree-dock-min) */
const TREE_DOCK_MIN = 900
/** Under this the assistant lies over the code's left edge. From here it docks and the code keeps 640 or
 * more: on the left an overlay would hide the line numbers and the start of every line, so it docks on
 * the 1152 tablet too (20 Nov) */
const ASK_DOCK_MIN = 1000
/** The assistant's docked width, taken from the room the files and the code share */
const ASK_W = 360

/** Whether the assistant's panel is out: yours once you toggle it, open at first where there's room */
const ASK_KEY = "oak.programs.ask"
function askStored() {
  try {
    const raw = localStorage.getItem(ASK_KEY)
    return raw === null ? window.innerWidth >= 1280 : raw === "1"
  } catch {
    return false
  }
}

/** The tabs' order: every file as the project lists it, README.md last */
const tabsOf = (p: Project) => {
  const files = Object.keys(p.files)
  return [...files.filter((f) => f !== "README.md"), ...files.filter((f) => f === "README.md")]
}

/** A tool at the head's right end: its glyph alone, the name and key in the tip */
function Tool({ label, keys, icon, pressed, onClick }: { label: string; keys?: string; icon: ReactNode; pressed: boolean; onClick: () => void }) {
  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={label}
          aria-pressed={pressed}
          onClick={onClick}
          data-files-toggle={label === "Files" ? "" : undefined}
          className={cn("rounded-lg text-muted-foreground hover:text-foreground [&_svg]:size-[18px]! [&_svg]:stroke-[1.5]", pressed && "bg-surface-hover text-foreground")}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {label}
        {keys && <Kbd className="ml-1.5">{keys}</Kbd>}
      </TooltipContent>
    </Tooltip>
  )
}

/** Devnet and the program id in one chip: not deployed, deploying, the id with Copy, or deploy failed */
function ProgramChip({ p }: { p: Project }) {
  const chain = onChain(p)
  const deploying = p.deploy.s === "running" || (p.build.s === "running" && !!p.chain)
  const dot = deploying ? "running" : chain ? "success" : p.deployFailed ? "error" : "idle"
  return (
    <div className="flex h-7 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-surface-panel pr-1 pl-2.5 text-13 leading-4">
      <StatusDot variant={dot} />
      <span className="text-muted-foreground">Devnet</span>
      <span aria-hidden="true" className="text-subtle">
        ·
      </span>
      {chain ? (
        <>
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <code tabIndex={0} className="rounded-sm font-mono text-13 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {shortKey(chain.programId)}
              </code>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="font-mono">
              {chain.programId}
            </TooltipContent>
          </Tooltip>
          <CopyButton value={chain.programId} label="Copy program id" className="size-6" />
        </>
      ) : (
        <span className={cn("pr-1.5", p.deployFailed ? "text-foreground" : "text-muted-foreground")}>{deploying ? "deploying…" : p.deployFailed ? "deploy failed" : "not deployed"}</span>
      )}
    </div>
  )
}

type Entry = { kind: "folder"; name: string; depth: number } | { kind: "file"; path: string; depth: number }

function treeOf(files: string[]): Entry[] {
  const folders = [...new Set(files.filter((f) => f.includes("/")).map((f) => f.split("/").slice(0, -1).join("/")))]
  return [
    ...folders.flatMap((name) => [
      { kind: "folder", name, depth: 0 } as Entry,
      ...files.filter((f) => f.startsWith(`${name}/`)).map((path) => ({ kind: "file", path, depth: 1 }) as Entry),
    ]),
    ...files.filter((f) => !f.includes("/")).map((path) => ({ kind: "file", path, depth: 0 }) as Entry),
  ]
}

/** The project's files by folder, the open one marked, a changed one with the warning dot (Almaz, 25 Nov,
 * after Cursor, Linear and Vercel): a folder folds on its chevron, its files sit a step in with a hairline
 * down from the chevron, and every name, a folder's or a file's, starts on one line. A file is its name alone,
 * no glyph (Almaz, 18 Nov). Rows 28, a faint ground under the pointer, the open file on the hover's grey. A
 * folded folder with a changed file wears the file's dot */
export function TreeList({ p, onPick, tall = false }: { p: Project; onPick: (file: string) => void; tall?: boolean }) {
  const changed = changedFiles(p)
  const [folded, setFolded] = useState<string[]>([])
  const toggle = (name: string) => setFolded((f) => (f.includes(name) ? f.filter((n) => n !== name) : [...f, name]))
  const row = (depth: number) => ({ paddingLeft: `${8 + depth * 12}px` })
  const fileRow = (path: string, depth: number) => {
    const open = p.pane === "code" && p.open === path
    return (
      <button
        key={path}
        type="button"
        role="treeitem"
        aria-selected={open}
        onClick={() => onPick(path)}
        style={row(depth)}
        className={cn(ROW, "gap-1.5 hover:bg-foreground/[0.04]", tall && "h-11 text-16", open ? "bg-surface-hover! text-foreground" : "text-muted-foreground")}
      >
        <span aria-hidden="true" className="size-3.5 shrink-0" />
        <span className="min-w-0 flex-1 truncate">{baseName(path)}</span>
        {changed.includes(path) && <StatusDot variant="warning" aria-label="Changed" />}
      </button>
    )
  }
  const entries = treeOf(tabsOf(p))
  return (
    <div role="tree" aria-label="Files" className="flex flex-col gap-px">
      {entries.map((e, i) => {
        if (e.kind === "file" && e.depth === 0) return fileRow(e.path, 0)
        if (e.kind === "file") return null
        const open = !folded.includes(e.name)
        const inside = entries.slice(i + 1).filter((x): x is Extract<Entry, { kind: "file" }> => x.kind === "file" && x.depth === 1 && x.path.startsWith(`${e.name}/`))
        return (
          <div key={e.name} className="flex flex-col gap-px">
            <button
              type="button"
              role="treeitem"
              aria-expanded={open}
              onClick={() => toggle(e.name)}
              style={row(0)}
              className={cn(ROW, "gap-1.5 text-muted-foreground hover:bg-foreground/[0.04]", tall && "h-11 text-16")}
            >
              <ChevronRight aria-hidden="true" strokeWidth={1.75} className={cn("size-3.5 shrink-0 transition-transform duration-150 motion-reduce:transition-none", open && "rotate-90")} />
              <span className="min-w-0 flex-1 truncate">{e.name}</span>
              {!open && inside.some((f) => changed.includes(f.path)) && <StatusDot variant="warning" aria-label="Has changes" />}
            </button>
            {open && (
              <div role="group" className="relative flex flex-col gap-px">
                {/* The hairline down from the chevron's middle, as Cursor's indent guide */}
                <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-[15px] w-px bg-border" />
                {inside.map((f) => fileRow(f.path, 1))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/** The compiler's error in the open file, from the last failed build while it still stands */
export function errorIn(p: Project, file: string) {
  if (p.build.s !== "failed" || p.build.kind !== "compile") return null
  const t = [...p.feed].reverse().find((x): x is Extract<Turn, { k: "build-fail" }> => x.k === "build-fail")
  if (!t || t.file !== file || !t.line) return null
  return { line: t.line, column: t.col, span: t.code === "E0425" ? (t.message?.match(/`(\w+)`/)?.[1].length ?? 4) : undefined }
}

/** The project page: one bar (back, the name, the stages, the program chip, the panels' toggles), then
 * the assistant at the left, closed or open, then every file in a tree beside the editor and the console
 * under it. The assistant sits where the lesson's does, so it keeps its side when a tutorial hands over to
 * its program (Nikita's option B, 20 Nov: files stay next to the code, as every IDE has them) */
export function Workspace({ p }: { p: Project }) {
  const id = p.id
  const box = useRef<HTMLElement>(null)
  const [width, setWidth] = useState(1280)
  // Out at first: all the files show as the project opens
  const [docked, setDocked] = useState(true)
  const [pop, setPop] = useState(false)
  const [asking, setAsking] = useState(askStored)
  const [keys, setKeys] = useState(false)
  const [jump, setJump] = useState<{ line: number; at: number; caret: boolean } | null>(null)
  // Tabs are the files opened in this visit, as an IDE keeps them: the main file first, the rest as the
  // tree or an error link opens them. Every file in a tab overflowed the head once deployed
  const [opened, setOpened] = useState<string[]>(() => [p.open])
  useEffect(() => setOpened((o) => (o.includes(p.open) ? o : [...o, p.open])), [p.open])

  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const setAsk = (open: boolean) => {
    setAsking(open)
    try {
      localStorage.setItem(ASK_KEY, open ? "1" : "0")
    } catch {
      // Storage blocked: the panel keeps its place until the page reloads
    }
  }
  // A question from anywhere (the console's Explain, the Read only chip) brings the panel with its answer,
  // for now: only your own toggle is remembered
  const asked = p.feed.reduce((n, t) => n + (t.k === "user" ? 1 : 0), 0)
  const seen = useRef(asked)
  useEffect(() => {
    if (asked > seen.current) setAsking(true)
    seen.current = asked
  }, [asked])

  // The tree docks only while the code keeps its room beside it: on a 1280 screen with the assistant out it
  // comes over the code from the Files button instead. Lying over the code the assistant counts too: docked
  // under it the tree was out of sight, so it comes as the list at the assistant's edge
  const askDocked = asking && width >= ASK_DOCK_MIN
  const wide = width - (asking ? ASK_W : 0) >= TREE_DOCK_MIN
  const toggleFiles = () => (wide ? setDocked((d) => !d) : setPop((o) => !o))
  const filesShown = wide ? docked : pop

  // ⌘⇧E: the tree, docked or as the popover. ⌘L: the assistant. ⌘J is the terminal's own
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return
      const k = e.key.toLowerCase()
      if (k === "e" && e.shiftKey) {
        e.preventDefault()
        toggleFiles()
      } else if (k === "l" && !e.shiftKey) {
        e.preventDefault()
        setAsk(!asking)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  // A --> link in an answer, or a line in the log: the editor goes there with the caret on it
  // A lit range is brought in by its last line, so the editor's "already in view" check covers all of it
  useEffect(() => onReveal(({ line, to }) => setJump({ line: to ?? line, at: Date.now(), caret: true })), [])

  // A failed build brings its line into view in the open file, without taking the caret
  const failAt = errorIn(p, p.open)?.line ?? null
  useEffect(() => {
    if (failAt === null) return
    // After the console has opened and the editor took its new height
    const t = setTimeout(() => setJump({ line: failAt, at: Date.now(), caret: false }), 260)
    return () => clearTimeout(t)
  }, [failAt])

  const ts = p.framework === "ts-client"
  const running = busy(p)
  const changed = changedFiles(p)
  // While it comes in from GitHub there are no files to show yet: no tabs, no tree, the import's card
  const tabs = p.opening ? [] : opened.filter((f) => f in p.files)
  const active = p.pane === "code" ? p.open : null
  const file = p.open
  const status = statusOf(p)
  const sol = usePrograms(balanceOf)
  const err = errorIn(p, file)
  const lit = useLit(file)
  const meta = metaOf(p)
  const buildFail = [...p.feed].reverse().find((t) => t.k === "build-fail")
  // A tab closes as in the lesson's workspace: the last one stays, and closing the open one shows its neighbour
  const close = (tab: string) => {
    const at = tabs.indexOf(tab)
    setOpened((o) => o.filter((f) => f !== tab))
    if (tab === p.open) openFile(id, tabs[at + 1] ?? tabs[at - 1])
  }
  const pick = (f: string) => {
    openFile(id, f)
    setPop(false)
  }

  const tree = (
    <PopoverContent
      side="bottom"
      align="start"
      alignOffset={asking && !askDocked ? ASK_W : 0}
      sideOffset={1}
      className="w-64 gap-0 rounded-none rounded-br-lg border-r border-b border-border bg-surface-base p-1.5 ring-0 data-open:zoom-in-100 data-closed:zoom-out-100"
      onCloseAutoFocus={(e) => e.preventDefault()}
      onInteractOutside={(e) => {
        if (e.target instanceof Element && e.target.closest("[data-files-toggle]")) e.preventDefault()
      }}
    >
      <TreeList p={p} onPick={pick} />
    </PopoverContent>
  )

  // No code yet (Home's Build your own): the talk alone, at a reading measure in the middle. No files, stages,
  // terminal or tools until the assistant has written something
  if (p.draft)
    return (
      <section ref={box} aria-label="New program" className="flex min-w-0 flex-1 flex-col bg-surface-base">
        <div className="flex h-11 shrink-0 items-center gap-1 border-b border-border px-1.5">
          <Button variant="ghost" size="sm" aria-label="Programs" className="shrink-0 gap-0.5 pl-1.5 text-muted-foreground" onClick={() => go({ at: "catalog" })}>
            <ChevronLeft className="size-4" />
            Programs
          </Button>
          <span className="ml-1 min-w-0 truncate text-13 text-foreground">{p.name}</span>
        </div>
        <div className="mx-auto flex min-h-0 w-full max-w-[40rem] flex-1 flex-col">
          <AskThread p={p} />
        </div>
      </section>
    )

  return (
    <section ref={box} aria-label="Project" className="flex min-w-0 flex-1 flex-col bg-surface-base">
      <div className="@container/bar flex h-11 shrink-0 items-center gap-1 border-b border-border pr-1.5 pl-2">
        {/* Every project goes back to Programs, as a lesson to Tutorials: yours are listed there too (Almaz, 10 Nov) */}
        <Button variant="ghost" size="sm" aria-label="Programs" className="shrink-0 gap-0.5 pl-1.5 text-muted-foreground @max-[1100px]/bar:px-1" onClick={() => go({ at: "catalog" })}>
          <ChevronLeft className="size-4" />
          <span className="@max-[1100px]/bar:hidden">Programs</span>
        </Button>
        {/* With the word gone the chevron alone is the button, so the name stands right by it (Almaz, 25 Nov) */}
        <ProjectName p={p} className="ml-1 min-w-0 shrink truncate text-13 text-foreground @max-[1100px]/bar:ml-0" />
        {!p.opening && stagesOf(p).length > 1 && (
          <>
            {/* The bar's rules are one rule: 20 high, with 14 to the words on each side */}
            <span aria-hidden="true" className="ml-2.5 h-5 w-px shrink-0 bg-border" />
            <StageTrack p={p} className="ml-3.5 w-52 shrink" />
          </>
        )}
        <span className="min-w-2 flex-1" />
        {/* A Native program from the catalog: Solana's devnet id and why it's for reading, where the
            program chip is for one of your own */}
        {p.read && meta && (
          <span className="flex shrink-0 items-center gap-1 @max-[900px]/bar:hidden">
            <DevnetChip meta={meta} />
          </span>
        )}
        {!ts && !p.read && !p.opening && (
          <span className="flex shrink-0 @max-[900px]/bar:hidden">
            <ProgramChip p={p} />
          </span>
        )}
        {!p.opening && <StageAction p={p} className="ml-1.5" />}
        {/* A gap, not a rule: the chip's own outline already ends the group before the tools (Almaz, 18 Nov) */}
        <span aria-hidden="true" className="w-1 shrink-0" />
        <Tool label="Files" keys={FILES_KEYS} icon={<span className="flex size-[18px] [&>svg]:size-full"><Folder aria-hidden="true" strokeWidth={1.5} className="size-full" /></span>} pressed={filesShown} onClick={toggleFiles} />
        <Tool label="Terminal" keys={TERMINAL_KEYS} icon={<Terminal />} pressed={p.terminal} onClick={() => setTerminal(id, !p.terminal)} />
        <Tool label="Assistant" keys={ASSISTANT_KEYS} icon={<AssistantMark strokeWidth={1.5} />} pressed={asking} onClick={() => setAsk(!asking)} />
        {/* 32 here, as the three tools beside it: the menu's own 28 is the phone head's */}
        <span className="flex shrink-0 [&>button]:size-8 [&>button]:rounded-lg [&>button_svg]:size-[18px]!">
          <MoreMenu p={p} onKeys={() => setKeys(true)} />
        </span>
      </div>
      <div className="relative flex min-h-0 flex-1">
        {asking && <AskPanel p={p} onClose={() => setAsk(false)} className={cn("flex w-[360px] shrink-0 flex-col border-r border-border bg-surface-base", !askDocked && "absolute inset-y-0 left-0 z-10 max-w-full shadow-panel")} />}
        {wide && docked && !p.opening && (
          <nav aria-label="Files" className="flex w-[220px] shrink-0 flex-col border-r border-border bg-surface-base">
            {/* A head level with the editor's tabs: the name and Hide. No rule under it: the tree is the panel's
                only content, and the line cut it off from its own title (Almaz, 25 Nov) */}
            <div className="flex h-10 shrink-0 items-center pr-1.5 pl-3.5">
              <h2 className="flex-1 text-13 font-act text-foreground">Files</h2>
              <PanelHide what="files" keys={FILES_KEYS} onClick={toggleFiles} />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
              <TreeList p={p} onPick={pick} />
            </div>
          </nav>
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* No rule under the tabs (Almaz, 25 Nov): the open tab wears the code's ground, so the code runs on
              from it, and the bar's own ground marks the edge elsewhere */}
          {!p.opening && (
            <div className="flex h-10 shrink-0 items-stretch bg-surface-base">
              <Popover open={!wide && pop} onOpenChange={setPop}>
                <PopoverAnchor asChild>
                  <EditorTabs variant="quiet" className="h-full min-w-0 flex-1 border-b-0!">
                    {tabs.map((tab) => (
                      <EditorTab key={tab} active={tab === active} className="shrink-0 gap-0 px-0! before:hidden data-active:bg-(--code-ground)">
                        <EditorTabTrigger className={cn("gap-1.5 px-2.5", tabs.length > 1 && "pr-0.5")} onClick={() => openFile(id, tab)}>
                          <EditorTabLabel>{baseName(tab)}</EditorTabLabel>
                          {changed.includes(tab) && (
                            <>
                              <StatusDot variant="warning" />
                              <span className="sr-only">, changed</span>
                            </>
                          )}
                        </EditorTabTrigger>
                        {tabs.length > 1 && <EditorTabClose aria-label={`Close ${baseName(tab)}`} onClick={() => close(tab)} className={cn("mr-1 self-center opacity-100", tab !== active && "text-muted-foreground/60")} />}
                      </EditorTab>
                    ))}
                  </EditorTabs>
                </PopoverAnchor>
                {tree}
              </Popover>
              <InteractTab p={p} className="border-l border-border" />
            </div>
          )}
          <div className="flex min-h-0 flex-1">
            {p.opening ? (
              <div className="flex min-w-0 flex-1 justify-center overflow-y-auto p-6">
                <div className="w-full max-w-[26rem]">
                  <OpeningCard p={p} />
                </div>
              </div>
            ) : p.pane === "call" && !ts ? (
              <CallPanel p={p} />
            ) : (
              <div
                data-shell-editor
                onKeyDown={(e) => onReadOnlyKey(p, e)}
                onPaste={() => onReadOnlyKey(p, { key: "v", metaKey: false, ctrlKey: false, altKey: false })}
                className="prog-lit flex min-h-0 min-w-0 flex-1 flex-col"
              >
                <style>{LIT_CSS}</style>
                <Editor
                  key={file}
                  code={p.files[file] ?? ""}
                  onChange={(code) => edit(id, file, code)}
                  readOnly={p.read}
                  busy={running}
                  error={err}
                  label={p.read ? `${file}, read only` : `${file}, editable`}
                  jump={jump}
                  written={lit.written}
                  arrive={lit.arrive}
                  chip={p.notice === "read" ? <ReadNotice p={p} /> : p.notice === "full" ? <FullNotice p={p} /> : undefined}
                />
              </div>
            )}
          </div>
          <ConsoleDrawer open={p.terminal} onOpenChange={(open) => setTerminal(id, open)}>
            {/* The strip keeps its status and still opens on a click; its chevron gives way to the same Hide the
                other panels have, there while it's open */}
            <ConsoleDrawerBar className="[&>[data-slot=console-drawer-trigger]]:hidden">
              <ConsoleDrawerStatus className="flex-1">
                <StatusDot variant={status.dot} />
                <span className="truncate">{status.text}</span>
                {/* The compiler's words are in the log; what they mean is a question for the assistant */}
                {buildFail && failLive(p, buildFail) && (
                  <Button variant="ghost" size="xs" className="shrink-0 text-muted-foreground hover:text-foreground" onClick={() => ask(id, "Explain the error")}>
                    Explain
                  </Button>
                )}
              </ConsoleDrawerStatus>
              <WalletChip sol={sol} />
              {p.terminal && <PanelHide what="the terminal" keys={TERMINAL_KEYS} onClick={() => setTerminal(id, false)} className="-mr-1 size-6" />}
            </ConsoleDrawerBar>
            <ConsoleDrawerContent style={{ height: p.terminal ? 240 : 0 }} className="relative overscroll-contain">
              <div className="flex min-h-full flex-col">
                <BuildLog
                  log={p.log}
                  onJump={(line) => {
                    const fail = [...p.feed].reverse().find((x): x is Extract<Turn, { k: "build-fail" }> => x.k === "build-fail")
                    const to = fail?.file ?? file
                    openFile(id, to)
                    setJump({ line, at: Date.now(), caret: true })
                  }}
                  empty="Nothing run yet. Builds, deploys and calls print here."
                />
              </div>
            </ConsoleDrawerContent>
          </ConsoleDrawer>
        </div>
      </div>
      <ShortcutsDialog open={keys} onOpenChange={setKeys} read={p.read} />
    </section>
  )
}
