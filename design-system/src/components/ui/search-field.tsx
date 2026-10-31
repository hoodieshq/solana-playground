import * as React from "react"
import { Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

/* A search in a soft well: a fill a few steps over the ground and a
   hairline only just over the fill, so it reads as a well, not a drawn box.
   Esc takes back what was typed, then the open row.
   collapsible: under 35rem of its row the field folds to a square, outlined
   like a button, beside whatever else the row holds; pressed, it opens across
   the row, SearchFieldAside steps out of the way and SearchFieldCancel gives
   the row back. The row's own width decides, so a larger font folds it sooner.
   SearchField is the row; put the heading or filter in SearchFieldAside. */

type SearchFieldContextValue = {
  value: string
  setValue: (value: string) => void
  open: boolean
  setOpen: (open: boolean) => void
  collapsible: boolean
  cancel: () => void
  input: React.RefObject<HTMLInputElement | null>
}

const SearchFieldContext = React.createContext<SearchFieldContextValue | null>(null)

function useSearchField(part: string) {
  const ctx = React.useContext(SearchFieldContext)
  if (!ctx) throw new Error(`${part} must be inside SearchField`)
  return ctx
}

function SearchField({
  className,
  value: valueProp,
  defaultValue = "",
  onValueChange,
  collapsible = false,
  open: openProp,
  onOpenChange,
  onCancel,
  children,
  ...props
}: Omit<React.ComponentProps<"div">, "defaultValue"> & {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  /** fold to a square under 35rem of the row */
  collapsible?: boolean
  /** open across a narrow row */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Cancel was pressed, or Esc on an empty open field */
  onCancel?: () => void
}) {
  const [innerValue, setInnerValue] = React.useState(defaultValue)
  const [innerOpen, setInnerOpen] = React.useState(false)
  const value = valueProp ?? innerValue
  const open = collapsible && (openProp ?? innerOpen)
  const input = React.useRef<HTMLInputElement>(null)
  const setValue = (v: string) => {
    setInnerValue(v)
    onValueChange?.(v)
  }
  const setOpen = (o: boolean) => {
    setInnerOpen(o)
    onOpenChange?.(o)
  }
  const cancel = () => {
    setValue("")
    setOpen(false)
    onCancel?.()
  }
  return (
    <SearchFieldContext.Provider value={{ value, setValue, open, setOpen, collapsible, cancel, input }}>
      <div data-slot="search-field" data-open={open || undefined} className={cn("@container/search-field", className)} {...props}>
        <div className="flex flex-wrap items-center gap-2">{children}</div>
      </div>
    </SearchFieldContext.Provider>
  )
}

/* The well: the glass, the field, Clear once something is typed, and, while
   folded, a square over it all that opens the search. The field is there all
   along, only hidden, so the focus can go to it inside the press and a phone
   raises its keyboard */
function SearchFieldInput({
  className,
  onKeyDown,
  onChange,
  "aria-label": label = "Search",
  clearLabel,
  ...props
}: Omit<React.ComponentProps<"input">, "value" | "defaultValue" | "type"> & {
  /** the Clear button's name */
  clearLabel?: string
}) {
  const { value, setValue, open, setOpen, collapsible, cancel, input } = useSearchField("SearchFieldInput")
  const folds = collapsible && !open
  return (
    <label
      data-slot="search-field-control"
      className={cn(
        "relative flex h-8 w-80 max-w-full shrink-0 items-center gap-2 rounded-lg border border-foreground/[0.05] bg-surface-panel pr-2 pl-3 text-[0.875rem] text-foreground/80 transition-colors duration-150 focus-within:border-foreground/20 pointer-coarse:h-11",
        folds &&
          "@max-[35rem]/search-field:w-8 @max-[35rem]/search-field:justify-center @max-[35rem]/search-field:border-foreground/10 @max-[35rem]/search-field:bg-transparent @max-[35rem]/search-field:p-0 @max-[35rem]/search-field:text-foreground pointer-coarse:@max-[35rem]/search-field:w-11",
        open && "min-w-0 flex-1 duration-200 animate-in fade-in motion-reduce:animate-none",
        className
      )}
    >
      <Search strokeWidth={1.75} aria-hidden="true" className="size-4 shrink-0" />
      <input
        ref={input}
        type="search"
        data-slot="search-field-input"
        value={value}
        onChange={(e) => {
          onChange?.(e)
          setValue(e.target.value)
        }}
        onKeyDown={(e) => {
          onKeyDown?.(e)
          if (e.defaultPrevented || e.key !== "Escape") return
          if (value) setValue("")
          else if (open) cancel()
        }}
        aria-label={label}
        className={cn(
          "min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground/80 pointer-coarse:text-base [&::-webkit-search-cancel-button]:hidden",
          folds && "@max-[35rem]/search-field:absolute @max-[35rem]/search-field:w-px @max-[35rem]/search-field:opacity-0"
        )}
        {...props}
      />
      {value && <SearchFieldClear label={clearLabel} />}
      {folds && (
        <button
          type="button"
          aria-label={label}
          onClick={() => {
            setOpen(true)
            input.current?.focus()
          }}
          className="absolute inset-0 hidden rounded-[inherit] outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring @max-[35rem]/search-field:block"
        />
      )}
    </label>
  )
}

function SearchFieldClear({ className, label = "Clear search", ...props }: Omit<React.ComponentProps<"button">, "children"> & { label?: string }) {
  const { setValue, input } = useSearchField("SearchFieldClear")
  return (
    <button
      type="button"
      data-slot="search-field-clear"
      aria-label={label}
      onClick={() => {
        setValue("")
        input.current?.focus()
      }}
      className={cn(
        "-mr-1 flex size-5 shrink-0 items-center justify-center rounded-[4px] text-muted-foreground outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring pointer-coarse:size-9",
        className
      )}
      {...props}
    >
      <X className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
    </button>
  )
}

/* Gives the row back: shown only while the search is open across it */
function SearchFieldCancel({ className, children = "Cancel", ...props }: React.ComponentProps<"button">) {
  const { open, cancel } = useSearchField("SearchFieldCancel")
  if (!open) return null
  return (
    <button
      type="button"
      data-slot="search-field-cancel"
      onClick={cancel}
      className={cn(
        "h-8 shrink-0 rounded-md pr-1 pl-2 text-[0.875rem] text-muted-foreground outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring pointer-coarse:h-11",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

/* What shares the row with the field, a heading or a filter: out of the way while the search is open */
function SearchFieldAside({ className, ...props }: React.ComponentProps<"div">) {
  const { open } = useSearchField("SearchFieldAside")
  if (open) return null
  return <div data-slot="search-field-aside" className={cn("flex items-center gap-2", className)} {...props} />
}

export { SearchField, SearchFieldAside, SearchFieldCancel, SearchFieldClear, SearchFieldInput }
