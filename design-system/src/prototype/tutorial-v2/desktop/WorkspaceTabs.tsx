import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react"
import { Check, ChevronDown, Ellipsis, Folder, Lock, Send, Terminal } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { EditorTab, EditorTabClose, EditorTabLabel, EditorTabs, EditorTabTrigger } from "@/components/ui/editor-tabs"
import { Kbd } from "@/components/ui/kbd"
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

import { canCloseTabs, shownTabs, useStore } from "../store"
import { FileTreeList } from "../ui/FileTreeList"
import { FILES_KEYS, TERMINAL_KEYS } from "./keys"

/** The open tab on the code's own ground, so tab and code read as one sheet, without the coloured bar */
const TAB = "before:hidden data-active:bg-(--code-ground)"

/** What opens the Files popover is marked, so a press on it while the popover is up isn't also a
 * press outside it, which would close it and open it again on the same click */
const FILES_TOGGLE = "data-files-toggle"

/** A tool at the head's right end: its glyph alone, the name and key in the tip */
function Tool({ label, keys, icon, pressed, onClick, files = false }: { label: string; keys: string; icon: ReactNode; pressed: boolean; onClick: () => void; files?: boolean }) {
  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={label}
          aria-pressed={pressed}
          onClick={onClick}
          {...(files ? { [FILES_TOGGLE]: "" } : {})}
          // As Claude Code's tools: the glyph alone at 18 in a square, the name and key in the tip
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

/** Whether the tab strip hides tabs past its left or right edge, kept up as it scrolls and resizes */
function useEdges(strip: React.RefObject<HTMLDivElement | null>, count: number) {
  const [edges, setEdges] = useState({ left: false, right: false })
  useEffect(() => {
    const el = strip.current
    if (!el) return
    const measure = () => {
      const left = el.scrollLeft > 1
      const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 1
      setEdges((e) => (e.left === left && e.right === right ? e : { left, right }))
    }
    measure()
    el.addEventListener("scroll", measure, { passive: true })
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => {
      el.removeEventListener("scroll", measure)
      ro.disconnect()
    }
  }, [strip, count])
  return edges
}

/** Chrome's tab drag: a press and 4px of travel pick a tab up, it follows the pointer along the strip,
 * and each neighbour its middle passes slides over into the slot it left; let go, it settles into its
 * own (Almaz, 10 Nov). Picked up, it's the open tab, as in Chrome. Under a finger a swipe scrolls the
 * strip, so a tab is picked up by holding it still for a moment, as iPad's Safari picks up its tabs;
 * from then on the strip doesn't scroll until it's let go (Almaz, 10 Nov) */
/** How long a finger holds a tab still to pick it up */
const HOLD_MS = 350

function useTabDrag(order: string[], open: (file: string) => void, move: (file: string, to: number) => void) {
  const els = useRef(new Map<string, HTMLElement>())
  const [drag, setDrag] = useState<{ file: string; dx: number } | null>(null)
  // A drag ends in a click on the tab it let go of, which mustn't count as one
  const dragged = useRef(false)
  // Where each tab stood before a move, so the ones it moved slide there from their old place
  const before = useRef<Map<string, number> | null>(null)
  const list = useRef(order)
  list.current = order
  const key = order.join("\n")

  useLayoutEffect(() => {
    const was = before.current
    before.current = null
    if (!was || matchMedia("(prefers-reduced-motion: reduce)").matches) return
    for (const [file, el] of els.current) {
      const by = (was.get(file) ?? 0) - el.getBoundingClientRect().left
      if (file !== drag?.file && was.has(file) && by) el.animate([{ transform: `translateX(${by}px)` }, { transform: "none" }], { duration: 160, easing: "cubic-bezier(0.2, 0, 0, 1)" })
    }
  }, [key])

  const start = (file: string) => (e: ReactPointerEvent) => {
    if (e.button !== 0 || (e.target as Element).closest('[data-slot="editor-tab-close"], [data-files-toggle]')) return
    let from = e.clientX
    let dx = 0
    // The offset last drawn, and the slot a move is waiting to be drawn in: one move at a time
    let drawn = 0
    let waiting = -1
    let on = false
    const touch = e.pointerType === "touch"
    const y0 = e.clientY
    // Held, the finger's moves drag the tab, not the strip
    const noScroll = (ev: TouchEvent) => ev.preventDefault()
    const hold = touch
      ? window.setTimeout(() => {
          on = true
          dragged.current = true
          open(file)
          setDrag({ file, dx: 0 })
          addEventListener("touchmove", noScroll, { passive: false })
        }, HOLD_MS)
      : 0
    const onMove = (ev: PointerEvent) => {
      dx = ev.clientX - from
      if (touch && !on) {
        // Moved before the hold: it's a scroll, and the strip has it
        if (Math.abs(dx) > 8 || Math.abs(ev.clientY - y0) > 8) onUp()
        return
      }
      if (!on) {
        if (Math.abs(dx) < 4) return
        on = true
        dragged.current = true
        open(file)
      }
      const me = els.current.get(file)
      const at = list.current.indexOf(file)
      if (waiting === at) waiting = -1
      if (me && waiting === -1) {
        const r = me.getBoundingClientRect()
        const mid = r.left - drawn + dx + r.width / 2
        const step = dx > 0 ? 1 : -1
        const other = els.current.get(list.current[at + step])
        const o = other?.getBoundingClientRect()
        if (o && (step > 0 ? mid > o.left + o.width / 2 : mid < o.left + o.width / 2)) {
          before.current = new Map([...els.current].map(([f, el]) => [f, el.getBoundingClientRect().left]))
          move(file, at + step)
          waiting = at + step
          // Its slot moved by the neighbour's width, so the pointer's offset is from there now
          from += step * o.width
          dx = ev.clientX - from
        }
      }
      drawn = dx
      setDrag({ file, dx })
    }
    function onUp() {
      window.clearTimeout(hold)
      removeEventListener("touchmove", noScroll)
      removeEventListener("pointermove", onMove)
      removeEventListener("pointerup", onUp)
      removeEventListener("pointercancel", onUp)
      if (!on) return
      // It settles into its slot from where it was let go
      const me = els.current.get(file)
      if (me && dx && !matchMedia("(prefers-reduced-motion: reduce)").matches) me.animate([{ transform: `translateX(${dx}px)` }, { transform: "none" }], { duration: 160, easing: "cubic-bezier(0.2, 0, 0, 1)" })
      setDrag(null)
      setTimeout(() => (dragged.current = false))
    }
    addEventListener("pointermove", onMove)
    addEventListener("pointerup", onUp)
    addEventListener("pointercancel", onUp)
  }

  return {
    drag,
    props: (file: string) => ({
      ref: (el: HTMLElement | null) => void (el ? els.current.set(file, el) : els.current.delete(file)),
      onPointerDown: start(file),
      onClickCapture: (e: React.MouseEvent) => {
        if (dragged.current) {
          e.stopPropagation()
          e.preventDefault()
        }
      },
      // No callout or selection on a held tab: the hold is the pick up
      style: (drag?.file === file ? { transform: `translateX(${drag.dx}px)`, zIndex: 10, cursor: "grabbing", WebkitTouchCallout: "none" } : { WebkitTouchCallout: "none" }) as CSSProperties,
    }),
  }
}

/** A fade over the last 32px at each edge that hides tabs, so the strip says there are more */
const fade = ({ left, right }: { left: boolean; right: boolean }): CSSProperties | undefined => {
  if (!left && !right) return undefined
  const mask = `linear-gradient(to right, ${left ? "transparent, #000 2rem" : "#000"}, ${right ? "#000 calc(100% - 2rem), transparent" : "#000"})`
  return { maskImage: mask, WebkitMaskImage: mask }
}

/** The workspace head (spec 8.1): the file tabs, which close while there are two or more, then at the right end the Call
 * panel, Files and Terminal. Call sits with the tools, apart from the files, since it isn't a file.
 * Files is the tree's one way in: it docks the tree beside the editor, or opens it as a popover off
 * the tabs where the workspace is too narrow to dock. Before Start the head says the code is the finished program, read only, instead of a pill
 * over the code. No Build, Deploy or Run here: those live in the chat (D20) */
export function WorkspaceTabs({ treeOpen, onTree, wide }: { treeOpen: boolean; onTree: (open: boolean) => void; wide: boolean }) {
  const { s, dispatch } = useStore()
  const [arrived] = useState(() => new Set(s.tabs))
  // In the order they opened, or as dragged
  const tabs = shownTabs(s.tabs)
  const tabDrag = useTabDrag(
    tabs,
    (file) => dispatch({ type: "openFile", file }),
    (file, to) => dispatch({ type: "moveTab", file, to })
  )
  // Two tabs or more, each closes and the arrow goes: Files at the right is the tree's way in then. The
  // last tab doesn't close and keeps the arrow, the one way to the other files from beside its name
  const closing = canCloseTabs(s.tabs)
  const strip = useRef<HTMLDivElement>(null)
  const edges = useEdges(strip, tabs.length)
  const callable = s.started && s.tabs.includes("test")
  const calling = callable && s.open === "test"
  const active = calling ? null : tabs.includes(s.open) ? s.open : tabs[0]
  const docked = s.tree === "docked"
  // Files, its key and the arrow in the open tab all do the same: the tree as a block beside the code,
  // as the Programs workspace has it (Almaz, 6 Nov); a popover only where there's no room to dock
  const toggleFiles = () => (wide ? dispatch({ type: "tree", state: docked ? "closed" : "docked" }) : onTree(!treeOpen))
  const filesShown = treeOpen || docked

  // The open tab is always in view: opened from the list, the tree or a link in the chat, the strip
  // brings it in rather than leaving it past the edge
  // and so does a strip that narrows, when the chat column is dragged wider
  useEffect(() => {
    const el = strip.current
    if (!el) return
    const bring = () => el.querySelector<HTMLElement>("[data-active]")?.scrollIntoView({ block: "nearest", inline: "nearest" })
    bring()
    const ro = new ResizeObserver(bring)
    ro.observe(el)
    return () => ro.disconnect()
  }, [active, tabs.length])

  const tree = (
    // A sheet out of the workspace's corner rather than a floating card: flush under the tab bar's line
    // and against the chat's, square there, rounded only at its free corner
    <PopoverContent
      side="bottom"
      align="start"
      sideOffset={1}
      className="w-64 gap-0 relative rounded-none rounded-br-lg border-r border-b border-border bg-surface-base p-1.5 ring-0 data-open:zoom-in-100 data-closed:zoom-out-100 data-[side=bottom]:slide-in-from-top-1"
      onOpenAutoFocus={(e) => {
        // Focus lands on the open file, not on the pin, so nothing in the head lights up on open
        e.preventDefault()
        ;(e.currentTarget as HTMLElement).querySelector<HTMLElement>('[aria-selected="true"]')?.focus({ preventScroll: true })
      }}
      onCloseAutoFocus={(e) => e.preventDefault()}
      onInteractOutside={(e) => {
        if (e.target instanceof Element && e.target.closest(`[${FILES_TOGGLE}]`)) e.preventDefault()
      }}
    >
      <FileTreeList
        onPick={(file) => {
          dispatch({ type: "openFile", file })
          onTree(false)
        }}
      />
    </PopoverContent>
  )

  return (
    <div className="@container flex h-11 shrink-0 items-stretch border-b border-border bg-surface-base">
      <Popover open={!wide && treeOpen} onOpenChange={onTree}>
        <PopoverAnchor asChild>
          {/* min-w-0 so the strip gives way to the tools. Each tab is as wide as its name, never wider,
              never cut: past the strip's width it scrolls, faded at the edge that hides more */}
          <EditorTabs ref={strip} style={fade(edges)} className="h-full min-w-0 flex-1 border-b-0!">
            {tabs.map((tab) => {
              const canClose = closing
              const close = () => dispatch({ type: "closeFile", file: tab })
              return (
              <EditorTab
                key={tab}
                {...tabDrag.props(tab)}
                active={tab === active}
                // A middle click closes, as in a browser or VS Code. No ⌘W: the browser takes it and closes Oak
                onMouseDown={(e) => canClose && e.button === 1 && e.preventDefault()}
                onAuxClick={(e) => canClose && e.button === 1 && close()}
                // The × or the arrow reads as the name's: 6 from it and 9 from the edge, against the 12 before
                // the name. Three even 12s left it floating apart (Almaz, 10 Nov); its box stays 24
                className={cn(TAB, "shrink-0 gap-0 px-0!", !arrived.has(tab) && "animate-rise")}
              >
                <EditorTabTrigger className={cn("gap-1.5 px-3", (canClose || tab === active) && "pr-0")} onClick={() => dispatch({ type: "openFile", file: tab })}>
                  <EditorTabLabel>{tab.split("/").pop()}</EditorTabLabel>
                </EditorTabTrigger>
                {/* The open tab's arrow, as Cat asked: the tree from beside the file's name, to step back
                    from client.ts to lib.rs. Quiet until pointed at, no frame of its own; it turns over
                    while the tree is out */}
                {tab === active && !canClose && (
                  <Tooltip delayDuration={300}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label="Files"
                        aria-haspopup="dialog"
                        aria-expanded={filesShown}
                        onClick={toggleFiles}
                        {...{ [FILES_TOGGLE]: "" }}
                        className="mr-0.5 grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <ChevronDown
                          aria-hidden="true"
                          className={cn("size-3.5 transition-transform duration-150 ease-standard motion-reduce:transition-none", filesShown && "rotate-180")}
                        />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      Files
                      <Kbd className="ml-1.5">{FILES_KEYS}</Kbd>
                    </TooltipContent>
                  </Tooltip>
                )}
                {/* On every tab, as Chrome has it, the rest's dimmer: hidden till the pointer came, it left
                    an empty end on every tab but the open one (Almaz, 10 Nov) */}
                {canClose && (
                  <EditorTabClose aria-label={`Close ${tab.split("/").pop()}`} onClick={close} className={cn("mr-0.5 size-6 opacity-100", tab !== active && "text-muted-foreground/60")} />
                )}
              </EditorTab>
              )
            })}
          </EditorTabs>
        </PopoverAnchor>
        {tree}
      </Popover>
      {/* Every open tab, when the strip can't show them all: the one way to a tab past the edge without
          scrolling for it */}
      {(edges.left || edges.right) && (
        <DropdownMenu>
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`All tabs, ${tabs.length}`}
                  className="my-auto ml-0.5 shrink-0 rounded-lg text-muted-foreground hover:text-foreground data-[state=open]:bg-surface-hover data-[state=open]:text-foreground [&_svg]:size-[18px]! [&_svg]:stroke-[1.5]"
                >
                  <Ellipsis />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom">All tabs</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" className="max-h-80 min-w-56">
            {/* The caption size spelled as a length: the menu's cn takes text-caption for a colour and drops it */}
            <DropdownMenuLabel className="text-(length:--text-caption) leading-(--text-caption--line-height) text-muted-foreground">Open tabs</DropdownMenuLabel>
            {tabs.map((tab) => {
              const at = tab.lastIndexOf("/")
              return (
                <DropdownMenuItem key={tab} onSelect={() => dispatch({ type: "openFile", file: tab })} className="gap-2">
                  <Check aria-hidden="true" className={cn("size-3.5 shrink-0", tab === active ? "opacity-100" : "opacity-0")} />
                  <span className="truncate font-mono text-[0.8125rem]">{tab.slice(at + 1)}</span>
                  {at > 0 && <span className="ml-auto pl-3 text-caption text-muted-foreground">{tab.slice(0, at)}</span>}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      <div className="ml-auto flex shrink-0 items-center gap-1.5 pr-2">
        {/* Plain words in the head's free space, so nothing covers the code's lines */}
        {!s.started && (
          <span className="mr-2 flex items-center gap-1.5 text-caption text-muted-foreground">
            <Lock className="size-3" aria-hidden="true" />
            Finished program · read only
          </span>
        )}
        {callable && (
          <>
            <Button
              variant="ghost"
              aria-pressed={calling}
              onClick={() => dispatch({ type: "openTest" })}
              className={cn(
                "rounded-lg text-[0.8125rem] text-muted-foreground hover:text-foreground [&_svg]:size-4! [&_svg]:stroke-[1.5]",
                calling && "bg-surface-hover text-foreground",
                !arrived.has("test") && "animate-rise"
              )}
            >
              <Send />
              Call
              {s.testDot && <span aria-hidden="true" className="size-1.5 shrink-0 animate-pulse-dot rounded-full bg-brand-purple [animation-iteration-count:2]" />}
            </Button>
            <span aria-hidden="true" className="mx-1 h-5 w-px bg-border" />
          </>
        )}
        <Tool
          label="Files"
          keys={FILES_KEYS}
          icon={<span className="flex size-[18px] [&>svg]:size-full"><Folder aria-hidden="true" strokeWidth={1.5} className="size-full" /></span>}
          pressed={filesShown}
          onClick={toggleFiles}
          files
        />
        <Tool label="Terminal" keys={TERMINAL_KEYS} icon={<Terminal />} pressed={s.terminal} onClick={() => dispatch({ type: "terminal", open: !s.terminal })} />
      </div>
    </div>
  )
}
