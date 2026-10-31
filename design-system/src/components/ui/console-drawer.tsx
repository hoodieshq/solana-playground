import * as React from "react"
import { ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"

/* The console under the stage: a thin frosted strip that says how the last
   run went, and a well that opens above it. It folds by height, so the
   terminal inside stays mounted and keeps its scroll. The whole strip
   toggles; so does ⌘J or Ctrl J. Given a height or defaultHeight, its top
   edge drags (ConsoleDrawerHandle) between minHeight and maxHeight, a
   number of pixels or a share of the drawer's parent, such as "60%". */

type Ctx = {
  open: boolean
  setOpen: (open: boolean) => void
  id: string
  height?: number
  setHeight: (height: number) => void
  bounds: () => { min: number; max: number }
  resizing: boolean
  setResizing: (resizing: boolean) => void
}
const ConsoleDrawerContext = React.createContext<Ctx>({
  open: false,
  setOpen: () => {},
  id: "",
  setHeight: () => {},
  bounds: () => ({ min: 0, max: Infinity }),
  resizing: false,
  setResizing: () => {},
})

function ConsoleDrawer({
  className,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  hotkey = "j",
  height: heightProp,
  defaultHeight,
  onHeightChange,
  minHeight = 120,
  maxHeight = "60%",
  ref,
  ...props
}: React.ComponentProps<"div"> & {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /** the key that, with ⌘ or Ctrl, opens and closes it; null for none */
  hotkey?: string | null
  /** the well's height in pixels, once it can be dragged */
  height?: number
  defaultHeight?: number
  onHeightChange?: (height: number) => void
  minHeight?: number
  maxHeight?: number | `${number}%`
}) {
  const [inner, setInner] = React.useState(defaultOpen)
  const open = openProp ?? inner
  const id = React.useId()
  const root = React.useRef<HTMLDivElement | null>(null)
  const [innerHeight, setInnerHeight] = React.useState(defaultHeight)
  const [resizing, setResizing] = React.useState(false)
  const height = heightProp ?? innerHeight
  const bounds = React.useCallback(() => {
    const parent = root.current?.parentElement?.clientHeight ?? 600
    const max = typeof maxHeight === "number" ? maxHeight : (parent * parseFloat(maxHeight)) / 100
    return { min: minHeight, max: Math.max(minHeight, max) }
  }, [minHeight, maxHeight])
  const setHeight = React.useCallback(
    (next: number) => {
      const { min, max } = bounds()
      const h = Math.round(Math.min(max, Math.max(min, next)))
      setInnerHeight(h)
      onHeightChange?.(h)
    },
    [bounds, onHeightChange]
  )
  const setOpen = React.useCallback(
    (next: boolean) => {
      setInner(next)
      onOpenChange?.(next)
    },
    [onOpenChange]
  )
  React.useEffect(() => {
    if (!hotkey) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === hotkey) {
        e.preventDefault()
        setOpen(!open)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [hotkey, open, setOpen])
  return (
    <ConsoleDrawerContext.Provider value={{ open, setOpen, id, height, setHeight, bounds, resizing, setResizing }}>
      <div
        ref={(el) => {
          root.current = el
          if (typeof ref === "function") ref(el)
          else if (ref) ref.current = el
        }}
        data-slot="console-drawer"
        data-state={open ? "open" : "closed"}
        className={cn("group/console-drawer flex w-full flex-col-reverse overflow-hidden", className)}
        {...props}
      />
    </ConsoleDrawerContext.Provider>
  )
}

/* The strip. A click anywhere on it toggles; the chevron is the real button */
function ConsoleDrawerBar({ className, onClick, children, ...props }: React.ComponentProps<"div">) {
  const { open, setOpen, id } = React.useContext(ConsoleDrawerContext)
  return (
    <div
      data-slot="console-drawer-bar"
      onClick={(e) => {
        onClick?.(e)
        if (!e.defaultPrevented && !(e.target as HTMLElement).closest("button,a,input")) setOpen(!open)
      }}
      className={cn("frosted flex h-bar cursor-pointer items-center gap-2 border-t border-border px-2.5 text-xs text-muted-foreground select-none", className)}
      {...props}
    >
      {children}
      <button
        type="button"
        data-slot="console-drawer-trigger"
        aria-expanded={open}
        aria-controls={id}
        aria-label={open ? "Close the console" : "Open the console"}
        onClick={() => setOpen(!open)}
        className="grid size-6 place-items-center rounded-md text-muted-foreground outline-none hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChevronUp className="size-3.5 transition-transform duration-200 group-data-[state=open]/console-drawer:rotate-180" />
      </button>
    </div>
  )
}

/* How the last run went, in words beside the dot */
function ConsoleDrawerStatus({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="console-drawer-status" className={cn("flex min-w-0 items-center gap-1.5 truncate", className)} {...props} />
}

/* The right-hand end: the shortcut, Clear. Clear hides while it is closed */
function ConsoleDrawerActions({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="console-drawer-actions" className={cn("ml-auto flex items-center gap-1", className)} {...props} />
}

function ConsoleDrawerContent({ className, style, ...props }: React.ComponentProps<"div">) {
  const { open, id, height, resizing } = React.useContext(ConsoleDrawerContext)
  return (
    <div
      id={id}
      role="region"
      aria-label="Console"
      data-slot="console-drawer-content"
      data-state={open ? "open" : "closed"}
      inert={!open}
      data-resizing={resizing || undefined}
      style={height !== undefined && open ? { height, ...style } : style}
      className={cn(
        "h-64 overflow-auto bg-surface-well transition-[height] duration-(--duration-base) ease-standard data-[state=closed]:h-0 motion-reduce:transition-none max-md:data-[state=open]:h-[45dvh] data-resizing:transition-none",
        className
      )}
      {...props}
    />
  )
}

/* The well's top edge, to drag it taller or shorter: 9px to take hold of,
   a hairline that lights under the pointer and while held. Put it first
   inside ConsoleDrawerContent. The arrow keys move it too, Shift for more */
function ConsoleDrawerHandle({ className, ...props }: React.ComponentProps<"div">) {
  const { open, height, setHeight, bounds, setResizing } = React.useContext(ConsoleDrawerContext)
  const drag = React.useRef<{ y: number; h: number } | null>(null)
  if (height === undefined) return null
  const { min, max } = bounds()
  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      aria-label="Resize the console"
      aria-valuenow={height}
      aria-valuemin={min}
      aria-valuemax={Math.round(max)}
      tabIndex={open ? 0 : -1}
      data-slot="console-drawer-handle"
      onPointerDown={(e) => {
        e.preventDefault()
        e.currentTarget.setPointerCapture(e.pointerId)
        drag.current = { y: e.clientY, h: height }
        setResizing(true)
      }}
      onPointerMove={(e) => {
        if (drag.current) setHeight(drag.current.h + drag.current.y - e.clientY)
      }}
      onPointerUp={(e) => {
        drag.current = null
        setResizing(false)
        e.currentTarget.releasePointerCapture(e.pointerId)
      }}
      onPointerCancel={() => {
        drag.current = null
        setResizing(false)
      }}
      onKeyDown={(e) => {
        const step = e.shiftKey ? 64 : 16
        const next = { ArrowUp: height + step, ArrowDown: height - step, Home: min, End: max }[e.key]
        if (next === undefined) return
        e.preventDefault()
        setHeight(next)
      }}
      className={cn(
        "sticky top-0 z-10 -mb-[9px] h-[9px] cursor-row-resize touch-none outline-none after:absolute after:inset-x-0 after:top-0 after:h-px after:transition-colors hover:after:bg-border-strong focus-visible:after:bg-ring active:after:bg-ring",
        className
      )}
      {...props}
    />
  )
}

export { ConsoleDrawer, ConsoleDrawerActions, ConsoleDrawerBar, ConsoleDrawerContent, ConsoleDrawerHandle, ConsoleDrawerStatus }
