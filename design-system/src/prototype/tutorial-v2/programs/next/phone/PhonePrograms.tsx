import { useEffect, useRef, useState, type TouchEvent } from "react"
import { ChevronDown, ChevronLeft, ChevronUp, Code, MessageSquare, Play, Send } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { StatusDot } from "@/components/ui/status-dot"
import { cn } from "@/lib/utils"

import { Editor } from "../../../desktop/Editor"
import { SWIPE_PX, scrollsSideways } from "../../../screens/StepScreen"
import { SHEET, SHEET_HEAD, SHEET_TITLE } from "../../../sheets/sheet"
import { BuildLog } from "../../../ui/BuildLog"
import { PhoneMenu } from "../../../ui/PhoneMenu"
import { TopBar } from "../../../ui/TopBar"
import { ACTION_SOFT } from "../../../ui/type"
import { busy, edit, go, onChain, openFile, runClient, setPane, setTerminal, usePrograms, useProject, type Project, type Turn } from "../../store"
import { Catalog } from "../Catalog"
import { CallPanel } from "../shell/CallPanel"
import { Feed } from "../shell/Feed"
import { Ask, MoreMenu, ProjectName } from "../shell/GuideColumn"
import { ManageProjects, FullNotice } from "../shell/Quota"
import { LIT_CSS, ReadNotice, ReadOnlyMark, onReadOnlyKey, useLit } from "../shell/Read"
import { StepStrip } from "../shell/StepStrip"
import { baseName, changedFiles, onReveal, reveal, statusOf } from "../shell/util"
import { TreeList, errorIn } from "../shell/Workspace"

/* Programs on a phone and an upright tablet (ui-design.md 7, ux-architecture.md 7, Almaz, 6 Nov): the
   catalog in the phone's frame, and a project as the tutorial's phone screen has it. Two spaces side by
   side: the Guide, where the project happens, and Code, the desktop's workspace folded to a phone. The
   Call panel and the files are sheets */

export function PhonePrograms() {
  const route = usePrograms((s) => s.route)
  if (route.at === "project") return <PhoneProject key={route.id} id={route.id} />
  return <PhoneCatalog />
}

/** The catalog as the Tutorials page sits on a phone: the menu in the bar, the page's own heading under it */
function PhoneCatalog() {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <TopBar left={<PhoneMenu />} />
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 pt-1 pb-[calc(var(--safe-bottom)+24px)] [html.portrait_&]:px-8">
        <Catalog phone />
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[calc(var(--safe-bottom)+24px)] bg-linear-to-t from-surface-base to-transparent"
      />
    </div>
  )
}

type Space = "guide" | "code"

function PhoneProject({ id }: { id: string }) {
  const p = useProject(id)
  const [space, setSpace] = useState<Space>("guide")
  const [files, setFiles] = useState(false)
  const [jump, setJump] = useState<{ line: number; at: number; caret: boolean } | null>(null)
  const scroller = useRef<HTMLDivElement>(null)

  // A line link in a card, or a file the Guide opens, brings Code in with the line in view
  useEffect(
    () =>
      onReveal(({ line, to }) => {
        setSpace("code")
        setJump({ line: to ?? line, at: Date.now(), caret: false })
      }),
    []
  )
  const open = p?.open
  const was = useRef(open)
  useEffect(() => {
    if (open === was.current) return
    was.current = open
    setSpace("code")
  }, [open])

  // Sideways strokes change space, as in the tutorial: left brings Code in, right takes it back
  const area = useRef<HTMLDivElement>(null)
  const touch = useRef<{ x: number; y: number } | null>(null)
  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0]
    touch.current = e.touches.length === 1 && t.clientX > 20 && area.current && !scrollsSideways(e.target, area.current) ? { x: t.clientX, y: t.clientY } : null
  }
  const onTouchEnd = (e: TouchEvent) => {
    const from = touch.current
    touch.current = null
    const t = e.changedTouches[0]
    if (!from || !t) return
    const dx = t.clientX - from.x
    if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(t.clientY - from.y) * 2) return
    setSpace(dx < 0 ? "code" : "guide")
  }

  if (!p) return null
  const onCode = space === "code"

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* The tutorial's head: back, the name, then the project's ⋯ and the way across */}
      <header className="flex h-phone-head shrink-0 items-center gap-1 border-b border-border pr-3 pl-1.5 [html.portrait_&]:pr-8 [html.portrait_&]:pl-[22px]">
        <Button variant="ghost" size="icon" className="size-11 shrink-0" aria-label="Back to Programs" onClick={() => go({ at: "catalog" })}>
          <ChevronLeft className="size-6" />
        </Button>
        <ProjectName p={p} className="min-w-0 truncate pl-0.5 font-heading text-[0.9375rem] leading-5 font-medium text-foreground" />
        {p.example && !p.read && !p.opening && <span className="ml-1 shrink-0 rounded-md bg-foreground/[0.08] px-1.5 py-0.5 text-[0.75rem] leading-4 text-muted-foreground">Example</span>}
        <span className="flex-1" />
        <MoreMenu p={p} />
        <Button
          variant="ghost"
          onClick={() => setSpace(onCode ? "guide" : "code")}
          data-keep-notice
          aria-label={onCode ? "Back to the Guide" : "Show the code"}
          className={cn("relative ml-1 h-9 shrink-0 gap-1.5 rounded-[10px] px-3 text-[0.875rem] font-act pointer-coarse:h-9 after:absolute after:-inset-1 after:content-['']", ACTION_SOFT)}
        >
          {onCode ? <MessageSquare className="size-4" aria-hidden="true" /> : <Code className="size-4" aria-hidden="true" />}
          {onCode ? "Guide" : "Code"}
        </Button>
      </header>

      <div ref={area} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} className="relative flex min-h-0 flex-1 overflow-clip">
        {/* Both spaces stay mounted, so the Guide keeps its place while you read the code. The one out of
            view is inert */}
        <div style={{ transform: onCode ? "translateX(-50%)" : undefined }} className="flex w-[200%] shrink-0 transition-transform duration-300 ease-standard motion-reduce:transition-none">
          {/* The phone's 16 at the sides; an upright tablet keeps the chat to a 40rem measure, as the tutorial does */}
          <section
            aria-label="Guide"
            inert={onCode}
            className="flex w-1/2 min-w-0 flex-col [&_[data-feed-scroller]]:px-0 [&>*]:px-4 [&>nav]:px-4 [html.portrait_&>*]:px-[max(2rem,calc((100%-40rem)/2))]"
          >
            <StepStrip p={p} scroller={scroller} />
            <Feed p={p} scroller={scroller} />
            <Ask p={p} phone />
          </section>
          <CodeSpace p={p} active={onCode} jump={jump} onFiles={() => setFiles(true)} onGuide={() => setSpace("guide")} />
        </div>
      </div>

      <Drawer open={files} onOpenChange={setFiles}>
        <DrawerContent className={SHEET}>
          <DrawerHeader className={SHEET_HEAD}>
            <DrawerTitle className={SHEET_TITLE}>Files</DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto px-2 pb-[max(var(--safe-bottom),16px)]">
            <TreeList
              p={p}
              tall
              onPick={(f) => {
                openFile(id, f)
                setFiles(false)
              }}
            />
          </div>
        </DrawerContent>
      </Drawer>

      {/* The Call panel as the tutorial's Call sheet: from Code's Call or the Guide's "Call panel". One
          height for Form and IDL, so switching doesn't make the sheet jump */}
      <Drawer open={p.pane === "call"} onOpenChange={(o) => !o && setPane(id, "code")}>
        <DrawerContent className={cn(SHEET, "h-[88dvh] max-h-[88dvh] overflow-hidden")}>
          <DrawerTitle className="sr-only">Call</DrawerTitle>
          <DrawerDescription className="sr-only">Call the program's instructions from a form, or read its IDL</DrawerDescription>
          <div className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden pb-[var(--safe-bottom)]">
            <CallPanel p={p} />
          </div>
        </DrawerContent>
      </Drawer>
      <ManageProjects />
    </div>
  )
}

/** Code: the open file under its name, which opens the files; Call or Run at the right once there's
 * something to call; the terminal's status at the foot, which opens to the log */
function CodeSpace({ p, active, jump, onFiles, onGuide }: { p: Project; active: boolean; jump: { line: number; at: number; caret: boolean } | null; onFiles: () => void; onGuide: () => void }) {
  const id = p.id
  const file = p.open
  const lit = useLit(file)
  const ts = p.framework === "ts-client"
  const built = p.build.s === "ok" || !!onChain(p)
  const changed = changedFiles(p).includes(file)
  const status = statusOf(p)

  return (
    <section aria-label="Code" inert={!active} className="flex w-1/2 min-w-0 flex-col bg-(--code-ground)">
      <div className="flex h-12 shrink-0 items-center gap-1 border-b border-border bg-surface-base pr-4 pl-2 [html.portrait_&]:pr-8 [html.portrait_&]:pl-6">
        {p.opening ? (
          <Skeleton className="ml-2 h-3.5 w-28 motion-reduce:animate-none" />
        ) : (
          <button
            type="button"
            onClick={onFiles}
            aria-label={`${file}. Show the files`}
            className="flex h-11 min-w-0 items-center gap-1.5 rounded-lg px-2 outline-none active:bg-surface-hover focus-visible:outline-2 focus-visible:outline-brand-purple"
          >
            <span className="truncate font-mono text-code text-foreground">{baseName(file)}</span>
            {changed && <StatusDot variant="warning" aria-label="Changed" />}
            <span aria-hidden="true" className="grid size-[1.375rem] shrink-0 place-items-center rounded-md bg-surface-hover text-muted-foreground">
              <span className="flex size-3.5 [&>svg]:size-full"><ChevronDown aria-hidden="true" strokeWidth={1.5} className="size-full" /></span>
            </span>
          </button>
        )}
        {/* Read mode: the Read only mark where Call sits; a tap asks why and slides to the Guide */}
        {p.read ? (
          <ReadOnlyMark p={p} onAsk={onGuide} />
        ) : ts ? (
          <Button variant="ghost" disabled={busy(p)} onClick={() => runClient(id)} className={CODE_ACTION}>
            {p.calling ? <Spinner className="size-4" /> : <Play className="size-4" aria-hidden="true" />}
            Run
          </Button>
        ) : (
          built && (
            <Button variant="ghost" onClick={() => setPane(id, "call")} className={CODE_ACTION}>
              <Send className="size-4" aria-hidden="true" />
              Call
            </Button>
          )
        )}
      </div>
      {/* The notices pinned under the Code row, full width, so no line of code moves under the finger */}
      <ReadNotice p={p} phone onAsk={onGuide} />
      <FullNotice p={p} phone />
      {p.opening ? (
        <div aria-hidden="true" className="flex min-h-0 flex-1 flex-col gap-2.5 px-4 py-4">
          {[38, 0, 22, 54, 48, 30, 0, 26, 62, 44].map((w, i) => (w ? <Skeleton key={i} className="h-3.5 motion-reduce:animate-none" style={{ width: `${w}%` }} /> : <span key={i} className="h-3.5" />))}
        </div>
      ) : (
        <div data-shell-editor onKeyDown={(e) => onReadOnlyKey(p, e)} className="prog-lit flex min-h-0 min-w-0 flex-1 flex-col">
          <style>{LIT_CSS}</style>
          <Editor
            key={file}
            code={p.files[file] ?? ""}
            onChange={(code) => edit(id, file, code)}
            readOnly={p.read}
            busy={busy(p)}
            error={errorIn(p, file)}
            label={p.read ? `${file}, read only` : `${file}, editable`}
            jump={jump}
            written={lit.written}
            arrive={lit.arrive}
          />
        </div>
      )}
      {/* The terminal, as in the tutorial: its status always at the foot, the log under it on a tap */}
      <div className="shrink-0 border-t border-border bg-surface-base pb-[var(--safe-bottom)]">
        <button
          type="button"
          aria-expanded={p.terminal}
          aria-controls={`terminal-${id}`}
          onClick={() => setTerminal(id, !p.terminal)}
          className="flex h-11 w-full items-center gap-2 px-4 text-left text-caption text-muted-foreground outline-none active:bg-surface-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-purple [html.portrait_&]:px-8"
        >
          <StatusDot variant={status.dot} />
          <span className="min-w-0 flex-1 truncate">{status.text}</span>
          <span className="sr-only">{p.terminal ? "Hide the log" : "Show the log"}</span>
          <ChevronUp aria-hidden="true" className={cn("size-4 shrink-0 transition-transform duration-200 motion-reduce:transition-none", p.terminal && "rotate-180")} />
        </button>
        {p.terminal && (
          <div id={`terminal-${id}`} className="flex max-h-[42dvh] flex-col overflow-y-auto overscroll-contain border-t border-border">
            <BuildLog
              log={p.log}
              onJump={(line) => {
                const fail = [...p.feed].reverse().find((x): x is Extract<Turn, { k: "build-fail" }> => x.k === "build-fail")
                const to = fail?.file ?? file
                openFile(id, to)
                reveal(to, line)
              }}
              empty="Nothing run yet. Builds, deploys and calls print here."
            />
          </div>
        )}
      </div>
    </section>
  )
}

/** Call or Run where the tutorial's phone puts Call: ghosted at the row's end, a finger's 44 round it */
const CODE_ACTION =
  "relative -mr-3 ml-auto h-9 shrink-0 gap-1.5 rounded-[10px] px-3 text-[0.875rem] font-act text-foreground/90 pointer-coarse:h-9 after:absolute after:-inset-1 after:content-[''] hover:bg-foreground/[0.06] active:bg-foreground/[0.08]"
