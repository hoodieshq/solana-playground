import { useEffect, useRef, useState, type ReactNode } from "react"
import { ChevronDown, FileCode, Folder, Hammer, Play, Rocket, Send, Terminal } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ConsoleDrawer, ConsoleDrawerBar, ConsoleDrawerContent, ConsoleDrawerStatus } from "@/components/ui/console-drawer"
import { CopyButton } from "@/components/ui/copy-button"
import { EditorTab, EditorTabLabel, EditorTabs, EditorTabTrigger } from "@/components/ui/editor-tabs"
import { Kbd } from "@/components/ui/kbd"
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { StatusDot } from "@/components/ui/status-dot"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

import { Editor } from "../../../desktop/Editor"
import { FILES_KEYS, TERMINAL_KEYS } from "../../../desktop/keys"
import { BuildLog } from "../../../ui/BuildLog"
import { ROW } from "../../../ui/FileTreeList"
import { view } from "../../../view"
import { behind, build, busy, deploy, edit, metaOf, onChain, openFile, runClient, setPane, setTerminal, stale, usePrograms, type Project, type Turn } from "../../store"
import { WalletChip } from "../../../desktop/WalletChip"
import { CallPanel } from "./CallPanel"
import { FullNotice } from "./Quota"
import { DevnetChip, LIT_CSS, ReadNotice, ReadOnlyChip, onReadOnlyKey, useLit } from "./Read"
import { baseName, changedFiles, onReveal, shortKey, statusOf } from "./util"

const mac = /Mac|iPhone|iPad/.test(navigator.userAgent)
const BUILD_KEYS = mac ? "⌘⇧B" : "Ctrl Shift B"

/** The workspace docks the tree beside the editor from this width (ui-design.md, --tree-dock-min) */
const TREE_DOCK_MIN = 900

/** The tabs' order: every file as the project lists it, README.md last */
const tabsOf = (p: Project) => {
  const files = Object.keys(p.files)
  return [...files.filter((f) => f !== "README.md"), ...files.filter((f) => f === "README.md")]
}

/** A tool at the head's right end: its glyph alone, the name and key in the tip */
function Tool({ label, keys, icon, pressed, onClick }: { label: string; keys: string; icon: ReactNode; pressed: boolean; onClick: () => void }) {
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
        <Kbd className="ml-1.5">{keys}</Kbd>
      </TooltipContent>
    </Tooltip>
  )
}

/** A quiet action in the head, icon and word: Build, Deploy, Call. The running one shows a spinner */
const HEAD_ACTION = "relative rounded-lg text-[0.8125rem] text-muted-foreground hover:text-foreground [&_svg]:size-4! [&_svg]:stroke-[1.5]"

function HeadAction({ tip, icon, label, running, disabled, pressed, dot, onClick, ...rest }: { tip: string; icon: ReactNode; label: string; running?: boolean; disabled?: boolean; pressed?: boolean; dot?: boolean; onClick: () => void; "data-oak"?: string }) {
  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        {/* A span keeps the tip on a disabled button */}
        <span className="inline-flex">
          <Button variant="ghost" disabled={disabled} aria-pressed={pressed} aria-busy={running || undefined} onClick={onClick} className={cn(HEAD_ACTION, pressed && "bg-surface-hover text-foreground", running && "disabled:opacity-100")} {...rest}>
            {running ? <Spinner className="size-4" /> : icon}
            {label}
            {dot && <StatusDot variant="warning" className="absolute top-1.5 right-1.5" />}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom">{tip}</TooltipContent>
    </Tooltip>
  )
}

/** Devnet and the program id in one chip: not deployed, deploying, the id with Copy, or deploy failed */
function ProgramChip({ p }: { p: Project }) {
  const chain = onChain(p)
  const deploying = p.deploy.s === "running" || (p.build.s === "running" && !!p.chain)
  const dot = deploying ? "running" : chain ? "success" : p.deployFailed ? "error" : "idle"
  return (
    <div className="flex h-7 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-surface-panel pr-1 pl-2.5 text-[0.75rem] leading-4">
      <StatusDot variant={dot} />
      <span className="text-muted-foreground">Devnet</span>
      <span aria-hidden="true" className="text-subtle">
        ·
      </span>
      {chain ? (
        <>
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <code tabIndex={0} className="rounded-sm font-mono text-[0.75rem] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
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

/** The project's files by folder, the open one marked, a changed one with the warning dot */
export function TreeList({ p, onPick, tall = false }: { p: Project; onPick: (file: string) => void; tall?: boolean }) {
  const changed = changedFiles(p)
  return (
    <div role="tree" aria-label="Files" className="flex flex-col gap-px">
      {treeOf(tabsOf(p)).map((e) =>
        e.kind === "folder" ? (
          <div key={e.name} className={cn("flex h-7 items-center gap-2 px-2 text-[0.8125rem] text-muted-foreground", tall && "h-11 text-[0.9375rem]")}>
            <span className="flex size-4 [&>svg]:size-full"><Folder aria-hidden="true" strokeWidth={1.5} className="size-full" /></span>
            {e.name}
          </div>
        ) : (
          <button
            key={e.path}
            type="button"
            role="treeitem"
            aria-selected={p.pane === "code" && p.open === e.path}
            onClick={() => onPick(e.path)}
            style={{ paddingLeft: `${8 + e.depth * 20}px` }}
            className={cn(ROW, tall && "h-11 text-[0.9375rem]", p.pane === "code" && p.open === e.path ? "bg-surface-hover text-foreground" : "text-muted-foreground")}
          >
            <FileCode aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">{baseName(e.path)}</span>
            {changed.includes(e.path) && <StatusDot variant="warning" aria-label="Changed" />}
          </button>
        )
      )}
    </div>
  )
}

/** The compiler's error in the open file, from the last failed build while it still stands */
export function errorIn(p: Project, file: string) {
  if (p.build.s !== "failed" || p.build.kind !== "compile") return null
  const t = [...p.feed].reverse().find((x): x is Extract<Turn, { k: "build-fail" }> => x.k === "build-fail")
  if (!t || t.file !== file || !t.line) return null
  return { line: t.line, column: t.col, span: t.code === "E0425" ? 4 : undefined }
}

/** The project side: one head row (files, the program chip, Call, Build, Deploy, Files, Terminal),
 * the editor or the Call panel with the tree docked beside it on a wide workspace, and the console */
export function Workspace({ p }: { p: Project }) {
  const id = p.id
  const box = useRef<HTMLElement>(null)
  const [wide, setWide] = useState(true)
  // Closed at first, the code takes the width; the open tab's arrow brings the tree, as in a tutorial (Almaz, 6 Nov)
  const [docked, setDocked] = useState(false)
  const [pop, setPop] = useState(false)
  const [jump, setJump] = useState<{ line: number; at: number; caret: boolean } | null>(null)
  // Tabs are the files opened in this visit, as an IDE keeps them: the main file first, the rest as the
  // tree, the Guide or an error link opens them. Every file in a tab overflowed the head once deployed
  const [opened, setOpened] = useState<string[]>(() => [p.open])
  useEffect(() => setOpened((o) => (o.includes(p.open) ? o : [...o, p.open])), [p.open])

  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWide(e.contentRect.width >= TREE_DOCK_MIN))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const toggleFiles = () => (wide ? setDocked((d) => !d) : setPop((o) => !o))
  const filesShown = wide ? docked : pop

  // ⌘E: the tree, docked or as the popover
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === "e") {
        e.preventDefault()
        toggleFiles()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  // A --> link in a card, or a line in the log: the editor goes there with the caret on it
  // (the card opens the file first; the editor that mounts for it takes the jump)
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
  const chain = onChain(p)
  const changed = changedFiles(p)
  const building = p.build.s === "running" && !p.chain
  const deploying = p.deploy.s === "running" || (p.build.s === "running" && !!p.chain)
  const needsBuild = !(p.build.s === "ok" && !stale(p))
  const moved = stale(p) || behind(p)
  // While it comes in from GitHub there are no files to show yet: no tabs, no tree, lines of grey
  const tabs = p.opening ? [] : opened.filter((f) => f in p.files)
  const active = p.pane === "code" ? p.open : null
  const file = p.open
  const status = statusOf(p)
  const funded = usePrograms((x) => x.funded)
  const err = errorIn(p, file)
  const lit = useLit(file)
  const meta = metaOf(p)
  const pick = (f: string) => {
    openFile(id, f)
    setPop(false)
  }

  const tree = (
    <PopoverContent
      side="bottom"
      align="start"
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

  return (
    <section ref={box} aria-label="Project" className="flex min-w-0 flex-1 flex-col bg-surface-base">
      <div className="flex h-11 shrink-0 items-stretch border-b border-border bg-surface-base">
        <Popover open={!wide && pop} onOpenChange={setPop}>
          <PopoverAnchor asChild>
            <EditorTabs variant="quiet" className="h-full min-w-0 flex-1 border-b-0!">
              {tabs.map((tab) => (
                <EditorTab key={tab} active={tab === active} className="shrink-0 px-0! before:hidden data-active:bg-(--code-ground)">
                  <EditorTabTrigger className={cn("gap-1.5 px-2.5", tab === active && "pr-0.5")} onClick={() => openFile(id, tab)}>
                    <EditorTabLabel>{baseName(tab)}</EditorTabLabel>
                    {changed.includes(tab) && (
                      <>
                        <StatusDot variant="warning" />
                        <span className="sr-only">, changed</span>
                      </>
                    )}
                  </EditorTabTrigger>
                  {/* The tutorial's arrow beside the open file's name: the tree, docked or as the popover.
                      It turns over while the tree is out */}
                  {tab === active && (
                    <Tooltip delayDuration={300}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          aria-label="Files"
                          aria-expanded={filesShown}
                          onClick={toggleFiles}
                          data-files-toggle=""
                          className="mr-1.5 grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <ChevronDown aria-hidden="true" className={cn("size-3.5 transition-transform duration-150 ease-standard motion-reduce:transition-none", filesShown && "rotate-180")} />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        Files
                        <Kbd className="ml-1.5">{FILES_KEYS}</Kbd>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </EditorTab>
              ))}
            </EditorTabs>
          </PopoverAnchor>
          {tree}
        </Popover>
        <div className="ml-auto flex shrink-0 items-center gap-1 pr-2 pl-2">
          {/* Read mode: Build, Deploy and Call are left out, not disabled; Solana's devnet id and the Read
              only chip take their place. Its reason shows when the code zone has room and no devnet chip
              sits beside it; a 1152 tablet keeps the label alone */}
          {p.read && meta && (
            <>
              <DevnetChip meta={meta} />
              <ReadOnlyChip p={p} reason={wide && !meta.devnetId && view !== "tablet"} />
            </>
          )}
          {!ts && !p.read && <ProgramChip p={p} />}
          {/* From the first build: the panel reads the interface before the deploy, with Deploy in its foot */}
          {!ts && !p.read && (chain || p.build.s === "ok") && (
            <HeadAction tip="Call an instruction" icon={<Send />} label="Call" pressed={p.pane === "call"} onClick={() => setPane(id, p.pane === "call" ? "code" : "call")} />
          )}
          {!p.read && <span aria-hidden="true" className="mx-1 h-5 w-px bg-border" />}
          {p.read ? null : ts ? (
            <HeadAction data-oak="run" tip={`Run client.ts ${BUILD_KEYS}`} icon={<Play />} label="Run" running={!!p.calling} disabled={running} onClick={() => runClient(id)} />
          ) : (
            <>
              <HeadAction data-oak="build" tip={`Build ${BUILD_KEYS}`} icon={<Hammer />} label="Build" running={building} disabled={running} dot={moved} onClick={() => build(id)} />
              <HeadAction
                tip={`${chain ? "Upgrade on devnet" : "Deploy to devnet"}${needsBuild ? " · builds first" : ""}`}
                icon={<Rocket />}
                label={moved ? "Build and deploy" : "Deploy"}
                running={deploying}
                disabled={running}
                onClick={() => deploy(id)}
              />
            </>
          )}
          <span aria-hidden="true" className="mx-1 h-5 w-px bg-border" />
          <Tool label="Files" keys={FILES_KEYS} icon={<span className="flex size-[18px] [&>svg]:size-full"><Folder aria-hidden="true" strokeWidth={1.5} className="size-full" /></span>} pressed={filesShown} onClick={toggleFiles} />
          <Tool label="Terminal" keys={TERMINAL_KEYS} icon={<Terminal />} pressed={p.terminal} onClick={() => setTerminal(id, !p.terminal)} />
        </div>
      </div>
      <div className="flex min-h-0 flex-1">
        {wide && docked && !p.opening && (
          <nav aria-label="Files" className="w-[200px] shrink-0 overflow-y-auto border-r border-border bg-surface-base p-1.5">
            <TreeList p={p} onPick={pick} />
          </nav>
        )}
        {p.opening ? (
          <div aria-hidden="true" className="flex min-w-0 flex-1 flex-col gap-2.5 px-6 py-4">
            {[38, 0, 22, 54, 48, 30, 0, 26, 62, 44, 58, 20].map((w, i) => (w ? <Skeleton key={i} className="h-3.5 motion-reduce:animate-none" style={{ width: `${w}%` }} /> : <span key={i} className="h-3.5" />))}
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
        <ConsoleDrawerBar>
          <ConsoleDrawerStatus className="flex-1">
            <StatusDot variant={status.dot} />
            <span className="truncate">{status.text}</span>
          </ConsoleDrawerStatus>
          <WalletChip sol={funded ? 3.73 : 0} />
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
    </section>
  )
}
