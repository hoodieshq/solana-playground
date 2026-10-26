import { useEffect, useRef, useState, type PointerEvent } from "react"

import { ConsoleDrawer, ConsoleDrawerBar, ConsoleDrawerContent, ConsoleDrawerStatus } from "@/components/ui/console-drawer"

import { CLIENT, LIB, LIB_NAMED } from "../data"
import { landingFor } from "../landing"
import { useStore } from "../store"
import { Editor } from "./Editor"
import { DockedTree } from "./FileTree"
import { flashKeys } from "./flash"
import { TERMINAL_KEYS } from "./keys"
import { TerminalBody, TerminalStatus } from "./Terminal"
import { TestPane } from "./TestPane"
import { WorkspaceTabs } from "./WorkspaceTabs"

/** The terminal's height: dragged by its top edge between 120 and 60% of the workspace */
function useDrawerHeight(box: React.RefObject<HTMLElement | null>) {
  const [h, setH] = useState(240)
  const drag = useRef<{ y: number; h: number } | null>(null)
  const max = () => Math.max(160, (box.current?.clientHeight ?? 600) * 0.6)
  return {
    h,
    handle: {
      onPointerDown: (e: PointerEvent<HTMLDivElement>) => {
        e.preventDefault()
        e.currentTarget.setPointerCapture(e.pointerId)
        drag.current = { y: e.clientY, h }
      },
      onPointerMove: (e: PointerEvent<HTMLDivElement>) => {
        if (!drag.current) return
        setH(Math.round(Math.min(max(), Math.max(120, drag.current.h + drag.current.y - e.clientY))))
      },
      onPointerUp: (e: PointerEvent<HTMLDivElement>) => {
        drag.current = null
        e.currentTarget.releasePointerCapture(e.pointerId)
      },
    },
  }
}

/** The project side: the tabs, the editor or the Call panel, and the terminal bar that is always on
 * screen. Before Start it shows the finished program, read only (D3): the head says so */
export function Workspace({ treeOpen, onTree }: { treeOpen: boolean; onTree: (open: boolean) => void }) {
  const { s, dispatch } = useStore()
  const box = useRef<HTMLElement>(null)
  const drawer = useDrawerHeight(box)
  // Wide enough to dock the tree beside the editor
  const [wide, setWide] = useState(true)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWide(e.contentRect.width >= 1100 && !(window.self !== window.top)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // The drawer takes ⌘J itself; the hint on its strip lights up as it does
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") flashKeys(TERMINAL_KEYS)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  // The compiler's line and the editor's line light each other while either is hovered
  const [linked, setLinked] = useState<{ from: "log" | "editor"; line: number } | null>(null)
  const link = (from: "log" | "editor") => (line: number | null) => setLinked(line === null ? null : { from, line })

  const wrote = s.wrote

  const preview = !s.started
  const file = preview ? LIB : s.open
  const test = file === "test"
  const code = preview ? LIB_NAMED : (s.files[file] ?? "")

  // What lights: the lines just written, or the ones Show in asked for, arriving again
  const reveal = s.reveal?.file === file && !s.reveal.caret && !s.reveal.top ? s.reveal : null
  const lit = reveal && reveal.at > (wrote?.at ?? 0) ? { lines: reveal.lines, at: reveal.at } : wrote?.file === file ? { lines: wrote.lines, at: wrote.at } : null
  const jumpFrom = [s.reveal?.file === file ? { line: s.reveal.lines[0] ?? 1, at: s.reveal.at, caret: s.reveal.caret, top: s.reveal.top } : null, wrote?.file === file && wrote.lines[0] ? { line: wrote.lines[0], at: wrote.at } : null]
    .filter((j): j is NonNullable<typeof j> => j !== null)
    .sort((a, b) => b.at - a.at)[0]

  const error = s.error?.file === file ? s.error : null
  const busy = s.phase !== "idle"

  return (
    <section ref={box} aria-label="Project" className="flex min-w-0 flex-1 flex-col bg-surface-base">
      <WorkspaceTabs treeOpen={treeOpen} onTree={onTree} wide={wide} />
      <div className="flex min-h-0 flex-1">
        {wide && <DockedTree />}
        {test ? (
          <TestPane />
        ) : (
          <Editor
            key={file}
            code={code}
            onChange={(next) => dispatch({ type: "edit", file, code: next })}
            readOnly={preview}
            busy={busy}
            error={error ? { line: error.line, column: error.column, span: error.span } : null}
            lit={!!error && linked?.from === "log" && linked.line === error.line}
            onPoint={link("editor")}
            written={preview ? [] : (lit?.lines ?? [])}
            arrive={lit?.at ?? 0}
            landing={preview ? null : landingFor(s, file)}
            placeholder={file === CLIENT && !code ? "The assistant writes the call here, or type it yourself" : undefined}
            label={`${file}, ${preview ? "read only" : "editable"}`}
            jump={preview ? null : (jumpFrom ?? null)}
          />
        )}
      </div>
      <ConsoleDrawer open={s.terminal} onOpenChange={(open) => dispatch({ type: "terminal", open })}>
        <ConsoleDrawerBar>
          <ConsoleDrawerStatus>
            <TerminalStatus />
          </ConsoleDrawerStatus>
        </ConsoleDrawerBar>
        <ConsoleDrawerContent style={{ height: s.terminal ? drawer.h : 0 }} className="relative overscroll-contain">
          {/* The top edge drags: 9px to grab, the hairline lights while held */}
          <div
            aria-hidden="true"
            {...drawer.handle}
            className="sticky top-0 z-10 -mb-[9px] h-[9px] cursor-row-resize touch-none after:absolute after:inset-x-0 after:top-0 after:h-px after:transition-colors hover:after:bg-border-strong active:after:bg-ring"
          />
          <TerminalBody onPoint={link("log")} lit={error && linked?.from === "editor" ? linked.line : null} />
        </ConsoleDrawerContent>
      </ConsoleDrawer>
    </section>
  )
}
