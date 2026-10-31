import * as React from "react"
import { ChevronDown, Plus, Square } from "lucide-react"

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useCoarsePointer } from "@/hooks/use-coarse-pointer"
import { useScrollEdges } from "@/hooks/use-scroll-edges"
import { cn } from "@/lib/utils"

/* Where you ask the assistant for something: a note above it, the files it
   will read, the words, then the tools. Enter sends; Shift and Enter make a
   new line; a half-typed character in an input method never sends. While it
   answers, Send becomes Stop. collapsible keeps it to one line, the words and
   Send side by side, until it is focused or holds text (the tutorial's chat). */

type ComposerContextValue = {
  busy: boolean
  empty: boolean
  collapsed: boolean
  setEmpty: (empty: boolean) => void
  onStop?: () => void
}
const ComposerContext = React.createContext<ComposerContextValue>({
  busy: false,
  empty: true,
  collapsed: false,
  setEmpty: () => {},
})

function Composer({
  className,
  busy = false,
  collapsible = false,
  onStop,
  onSubmit,
  onFocus,
  onBlur,
  ...props
}: React.ComponentProps<"form"> & { busy?: boolean; collapsible?: boolean; onStop?: () => void }) {
  const [empty, setEmpty] = React.useState(true)
  const [focused, setFocused] = React.useState(false)
  const collapsed = collapsible && !focused && empty
  /* Folding back to one line moves everything above it, so a press
     elsewhere folds it only once the press ends: the button under the
     pointer stays where it was pressed, and its click lands */
  const pressing = React.useRef(false)
  React.useEffect(() => {
    if (!collapsible) return
    const down = () => (pressing.current = true)
    const up = () => (pressing.current = false)
    window.addEventListener("pointerdown", down, true)
    window.addEventListener("pointerup", up, true)
    window.addEventListener("pointercancel", up, true)
    return () => {
      window.removeEventListener("pointerdown", down, true)
      window.removeEventListener("pointerup", up, true)
      window.removeEventListener("pointercancel", up, true)
    }
  }, [collapsible])
  return (
    <ComposerContext.Provider value={{ busy, empty, collapsed, setEmpty, onStop }}>
      <form
        data-slot="composer"
        data-busy={busy || undefined}
        data-collapsed={collapsed || undefined}
        onFocus={(e) => {
          onFocus?.(e)
          if (collapsible) setFocused(true)
        }}
        onBlur={(e) => {
          onBlur?.(e)
          if (!collapsible || e.currentTarget.contains(e.relatedTarget)) return
          const form = e.currentTarget
          const fold = () => {
            if (!form.contains(document.activeElement)) setFocused(false)
          }
          if (pressing.current) window.addEventListener("pointerup", () => requestAnimationFrame(fold), { once: true })
          else window.setTimeout(fold, 0)
        }}
        onSubmit={(e) => {
          e.preventDefault()
          if (!busy && !empty) onSubmit?.(e)
        }}
        className={cn(
          "group/composer @container/composer flex w-full min-w-0 flex-col rounded-2xl border border-border bg-surface-panel shadow-composer transition-[border-color,box-shadow] duration-150 hover:border-muted-foreground/20 focus-within:border-primary/45 focus-within:ring-3 focus-within:ring-primary/12 data-collapsed:flex-row data-collapsed:items-center",
          className
        )}
        {...props}
      />
    </ComposerContext.Provider>
  )
}

/* A line over the box: what the assistant is set to, or why it cannot answer */
function ComposerBanner({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="composer-banner"
      className={cn("flex items-center gap-2 rounded-t-[15px] border-b border-border bg-white/[0.03] px-3.5 py-2 text-xs text-muted-foreground", className)}
      {...props}
    />
  )
}

/* The files and selections it will read */
function ComposerContextList({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="composer-context" className={cn("flex flex-wrap gap-1.5 px-3 pt-3", className)} {...props} />
}

function ComposerChip({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="composer-chip"
      className={cn("inline-flex h-6 items-center gap-1.5 rounded-md border border-border bg-surface-raised px-2 font-mono text-xs text-muted-foreground [&_svg]:size-3.5", className)}
      {...props}
    />
  )
}

function ComposerInput({ className, onKeyDown, onInput, ref, ...props }: React.ComponentProps<"textarea">) {
  const { setEmpty, collapsed } = React.useContext(ComposerContext)
  const inner = React.useRef<HTMLTextAreaElement | null>(null)
  const grow = (el: HTMLTextAreaElement) => {
    el.style.height = "auto"
    el.style.height = el.value ? `${Math.min(el.scrollHeight, 200)}px` : ""
    setEmpty(!el.value.trim())
  }
  /* A value can arrive without an input event: a defaultValue, or a
     controlled value cleared after sending. The box sizes itself and Send
     follows it then too */
  React.useLayoutEffect(() => {
    if (inner.current) grow(inner.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.value])
  /* Folded back to one line, the height it grew to would hold it open */
  React.useLayoutEffect(() => {
    if (collapsed && inner.current) inner.current.style.height = ""
  }, [collapsed])
  return (
    <textarea
      ref={(el) => {
        inner.current = el
        if (typeof ref === "function") ref(el)
        else if (ref) ref.current = el
      }}
      data-slot="composer-input"
      rows={1}
      aria-label="Message"
      onInput={(e) => {
        grow(e.currentTarget)
        onInput?.(e)
      }}
      onKeyDown={(e) => {
        onKeyDown?.(e)
        if (e.defaultPrevented) return
        if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
          e.preventDefault()
          e.currentTarget.form?.requestSubmit()
        }
      }}
      className={cn(
        "max-h-[200px] min-h-12 w-full resize-none bg-transparent px-4 pt-3.5 pb-1 text-[0.9375rem] font-[350] text-foreground outline-none placeholder:text-muted-foreground group-data-collapsed/composer:min-h-10 group-data-collapsed/composer:pt-2.5 group-data-collapsed/composer:pb-2.5",
        className
      )}
      {...props}
    />
  )
}

function ComposerToolbar({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="composer-toolbar"
      className={cn("flex items-center gap-1.5 p-2 group-data-collapsed/composer:py-1 group-data-collapsed/composer:pr-1", className)}
      {...props}
    />
  )
}

/* Add a file, a selection, a program */
function ComposerAdd({ className, ...props }: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      data-slot="composer-add"
      aria-label="Add context"
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors outline-none hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
      {...props}
    >
      <Plus className="size-4" />
    </button>
  )
}

/* The model you are talking to, named in the box and never hidden in settings */
function ComposerModel({ className, ...props }: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      data-slot="composer-model"
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-act text-muted-foreground transition-colors outline-none hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-3.5",
        className
      )}
      {...props}
    />
  )
}

/* How hard it thinks: a ring filled to the level. The word hides when the
   box is narrow, the ring never does. */
function ComposerEffort({
  className,
  value,
  max = 3,
  label = "Effort",
  ...props
}: React.ComponentProps<"button"> & { value: number; max?: number; label?: string }) {
  const r = 6
  const c = 2 * Math.PI * r
  return (
    <button
      type="button"
      data-slot="composer-effort"
      aria-label={`${label}: ${value} of ${max}`}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-act text-muted-foreground transition-colors outline-none hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
      {...props}
    >
      <svg viewBox="0 0 16 16" className="size-4 -rotate-90" aria-hidden="true">
        <circle cx="8" cy="8" r={r} fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
        <circle
          cx="8"
          cy="8"
          r={r}
          fill="none"
          stroke="var(--brand-purple)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={`${(c * value) / max} ${c}`}
        />
      </svg>
      <span className="hidden @[300px]/composer:inline">{label}</span>
    </button>
  )
}

/* disabledLook="solid" greys Send out on the hover grey at full strength,
   instead of fading the purple: quieter while there is nothing to send */
function ComposerSend({
  className,
  children,
  disabledLook = "faded",
  ...props
}: React.ComponentProps<"button"> & { disabledLook?: "faded" | "solid" }) {
  const { busy, empty, onStop } = React.useContext(ComposerContext)
  if (busy) {
    return (
      <button
        type="button"
        data-slot="composer-stop"
        aria-label="Stop"
        onClick={onStop}
        className={cn("ml-auto grid size-8 shrink-0 place-items-center rounded-full bg-foreground text-background transition-transform outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95", className)}
      >
        <Square className="size-3 fill-current" />
      </button>
    )
  }
  return (
    <button
      type="submit"
      data-slot="composer-send"
      aria-label="Send"
      disabled={empty}
      data-disabled-look={disabledLook === "solid" ? disabledLook : undefined}
      className={cn(
        "ml-auto grid size-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-[filter,opacity,transform] outline-none hover:bg-(--accent-fill-hover) focus-visible:ring-2 focus-visible:ring-ring active:scale-95 disabled:opacity-35 [&_svg]:size-4",
        disabledLook === "solid" && "disabled:bg-surface-hover disabled:text-subtle disabled:opacity-100",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

/* Suggestions over the box: small chips, each a question to ask. With a
   mouse the ones that do not fit fold into More; under a finger the row
   scrolls sideways under a fade instead. Hide it while the keyboard is up
   on a phone: the field needs the room. */

const MORE_WIDTH = 68

type SuggestionsContextValue = { out: Set<string>; select: (value: string, from?: HTMLElement) => void }
const SuggestionsContext = React.createContext<SuggestionsContextValue>({ out: new Set(), select: () => {} })

const suggestionChip =
  "inline-flex h-6 shrink-0 items-center gap-1 rounded-full border border-border-strong px-2.5 text-xs whitespace-nowrap text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:h-11 pointer-coarse:px-4"

function ComposerSuggestions({
  className,
  onSelect,
  moreLabel = "More",
  children,
  ...props
}: Omit<React.ComponentProps<"div">, "onSelect"> & {
  /** a suggestion was picked; from is its chip, when it was one */
  onSelect?: (value: string, from?: HTMLElement) => void
  moreLabel?: string
}) {
  const coarse = useCoarsePointer()
  const items = React.Children.toArray(children).filter(
    (c): c is React.ReactElement<React.ComponentProps<typeof ComposerSuggestion>> => React.isValidElement(c)
  )
  const key = items.map((c) => c.props.value).join("|")
  const [fits, setFits] = React.useState(items.length)
  const [moreAt, setMoreAt] = React.useState(0)
  const [ref] = useScrollEdges<HTMLDivElement>([key, coarse])

  React.useLayoutEffect(() => {
    const el = ref.current
    if (!el || coarse) return
    const measure = () => {
      const chips = [...el.querySelectorAll<HTMLElement>('[data-slot="composer-suggestion"]')]
      const room = el.clientWidth
      const end = (c: HTMLElement) => c.offsetLeft + c.offsetWidth
      if (chips.every((c) => end(c) <= room + 0.5)) return setFits(chips.length)
      const i = chips.findIndex((c) => end(c) > room - MORE_WIDTH)
      const n = i === -1 ? chips.length : i
      setFits(n)
      setMoreAt(n > 0 ? end(chips[n - 1]) + 6 : 0)
    }
    measure()
    /* the chips too: a font that loads late widens them, not the row */
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    for (const chip of el.querySelectorAll('[data-slot="composer-suggestion"]')) ro.observe(chip)
    return () => ro.disconnect()
  }, [key, coarse, ref])

  const hidden = coarse ? [] : items.slice(fits)
  const out = new Set(hidden.map((c) => c.props.value))
  const select = (value: string, from?: HTMLElement) => onSelect?.(value, from)
  return (
    <SuggestionsContext.Provider value={{ out, select }}>
      <div
        ref={ref}
        data-slot="composer-suggestions"
        className={cn(
          "relative flex gap-1.5",
          coarse ? "overflow-x-auto [--fade-size:2.5rem] [scrollbar-width:none] fade-edges" : "overflow-hidden",
          className
        )}
        {...props}
      >
        {children}
        {hidden.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger
              data-slot="composer-suggestions-more"
              style={{ left: moreAt }}
              className={cn(suggestionChip, "absolute top-0 bg-surface-base")}
            >
              {moreLabel}
              <ChevronDown className="size-3" aria-hidden="true" />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="min-w-52">
              {hidden.map((c) => (
                <DropdownMenuItem key={c.props.value} onSelect={() => select(c.props.value)} className="text-[0.8125rem]">
                  {c.props.children ?? c.props.value}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </SuggestionsContext.Provider>
  )
}

/* One suggestion. Folded into More, it stays in the row unseen, so the row
   can measure it again when it widens */
function ComposerSuggestion({
  className,
  value,
  children,
  onClick,
  ...props
}: React.ComponentProps<"button"> & { value: string }) {
  const { out, select } = React.useContext(SuggestionsContext)
  const hidden = out.has(value)
  return (
    <button
      type="button"
      data-slot="composer-suggestion"
      tabIndex={hidden ? -1 : undefined}
      aria-hidden={hidden || undefined}
      onClick={(e) => {
        onClick?.(e)
        if (!e.defaultPrevented) select(value, e.currentTarget)
      }}
      className={cn(suggestionChip, hidden && "invisible", className)}
      {...props}
    >
      {children ?? value}
    </button>
  )
}

export {
  Composer,
  ComposerAdd,
  ComposerBanner,
  ComposerChip,
  ComposerContextList,
  ComposerEffort,
  ComposerInput,
  ComposerModel,
  ComposerSend,
  ComposerSuggestion,
  ComposerSuggestions,
  ComposerToolbar,
}
