import { HardDrive, MemoryStick } from "lucide-react"

import { cn } from "@/lib/utils"

import { LESSON, shortKey } from "../data"
import { useStore } from "../store"

const KB = 1024
const kb = (bytes: number) => `${(bytes / KB).toLocaleString("en-US", { maximumFractionDigits: 1 })} KB`

const HEAP = 32 * KB

/** A row of the card: icon and label, the bar, the value. The rows share one grid, so labels, bars and
 * values line up whatever their words */
// Plain strings, not cn: cn would read text-caption next to a colour as one and drop it
const LABEL = "flex items-center gap-2 text-caption text-muted-foreground [&>svg]:size-3.5"
// Mono at 12 sits level with the 13px sans labels: mono's wider, taller letters at 13 read as 16 and
// outweighed the bars. The values lead by colour, the labels are muted
const VALUE = "text-right font-mono text-[0.75rem] whitespace-nowrap tabular-nums"

/** An account's bytes as 10 KB blocks, the size realloc adds at a time, filled up to its size. Green,
 * as Lumberjack's energy: the v2 theme keeps purple neutral */
function Blocks({ size, of }: { size: number; of: number }) {
  const n = Math.ceil(of / (10 * KB))
  return (
    <span aria-hidden="true" className="flex gap-0.5">
      {Array.from({ length: n }, (_, i) => (
        <span
          key={i}
          className={cn(
            "h-1 flex-1 rounded-full transition-colors duration-300 motion-reduce:transition-none",
            (i + 1) * 10 * KB <= size ? "bg-brand-green" : "bg-foreground/15"
          )}
        />
      ))}
    </span>
  )
}

/** What reading the account takes from the heap, on the account's own scale, full width like the
 * account's bar, in one tone. A tick marks where the 32 KB heap ends, so a copy too big for it runs
 * past the tick, red. Two tones for in and past the heap read as a bar of two pieces */
function HeapBar({ used, of }: { used: number; of: number }) {
  const over = used > HEAP
  const pct = (n: number) => `${Math.min(100, (n / of) * 100)}%`
  return (
    <span className="relative flex h-2.5 items-center" title="The heap ends at 32 KB">
      <span aria-hidden="true" className="absolute inset-x-0 h-1 rounded-full bg-foreground/15" />
      <span
        aria-hidden="true"
        className={cn("absolute left-0 h-1 rounded-full transition-[width] duration-300 motion-reduce:transition-none", over ? "bg-error" : "bg-foreground/45")}
        style={{ width: pct(used) }}
      />
      <span aria-hidden="true" className="absolute inset-y-0 w-px -translate-x-1/2 rounded-full bg-foreground/60" style={{ left: pct(HEAP) }} />
    </span>
  )
}

/** A memory lesson's account as the runtime sees it: its size in 10 KB blocks, and what reading it
 * takes from the 32 KB heap, both on one scale so the copy and the heap compare by length. `heap` is
 * the most a read took, or null when nothing was read yet; `zero` draws the zero copy map, read in
 * place. `flat` drops its box, for a card that already has one */
export function MemoryCard({
  size,
  of = 40 * KB,
  heap = null,
  zero = false,
  painted,
  text = "gm",
  className,
  phone = false,
  flat = false,
}: {
  size: number
  of?: number
  heap?: number | null
  zero?: boolean
  painted?: number
  /** What was painted at `painted` */
  text?: string
  className?: string
  phone?: boolean
  flat?: boolean
}) {
  const pda = zero ? LESSON.memory?.bigPda : LESSON.memory?.pda
  const over = heap !== null && heap > HEAP
  return (
    <div className={cn("flex flex-col gap-2", !flat && "rounded-control border border-border bg-surface-well px-3 py-2.5", className)}>
      <div className="flex items-center gap-2 text-caption text-muted-foreground">
        <span className="font-act text-foreground">{zero ? "Big map · zero copy" : "Map account"}</span>
        <span className="min-w-0 truncate font-mono text-[0.75rem]" title={pda}>
          {shortKey(pda ?? "", phone ? 4 : 6)}
        </span>
      </div>
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2">
        <span className={LABEL}>
          <HardDrive aria-hidden="true" />
          Account
        </span>
        <Blocks size={size} of={of} />
        <span className={cn(VALUE, "text-foreground")} aria-label={`Account: ${kb(size)} of ${kb(of)}`}>
          {kb(size)} / {kb(of)}
        </span>
        {heap !== null && (
          <>
            <span className={`${LABEL} ${over ? "[&>svg]:text-error" : ""}`}>
              <MemoryStick aria-hidden="true" />
              Heap
            </span>
            <HeapBar used={heap} of={of} />
            <span className={cn(VALUE, over ? "text-error" : "text-foreground")} aria-label={zero ? "Heap: nothing copied" : `Heap: ${kb(heap)} of 32 KB`}>
              {zero ? "0 KB, in place" : `${kb(heap)} / 32 KB`}
            </span>
          </>
        )}
      </div>
      {painted !== undefined && (
        <p className="text-caption text-muted-foreground">
          <span className="font-mono text-[0.75rem] text-foreground">{JSON.stringify(text)}</span> at byte <span className="font-mono text-[0.75rem] text-foreground">{painted.toLocaleString("en-US")}</span>
          {painted > HEAP && <span className="text-subtle"> · past the 32 KB a copy could hold</span>}
        </p>
      )}
    </div>
  )
}

/** The map as it is now, for the grow card. `big` draws the zero copy map, which reads nothing into
 * the heap however big it gets */
export function LiveMemory({ big = false, className, phone, flat }: { big?: boolean; className?: string; phone?: boolean; flat?: boolean }) {
  const { s } = useStore()
  const m = s.memory
  if (!m) return null
  if (big) return m.big === null ? null : <MemoryCard size={m.big} heap={0} zero className={className} phone={phone} flat={flat} />
  const last = s.thread.flatMap((t) => (t.kind === "act" ? (t.grows ?? []) : [])).filter((g) => g.heap > 0).pop()
  return <MemoryCard size={m.map} heap={last ? last.heap : m.map} className={className} phone={phone} flat={flat} />
}

/** The big map once it's there, for the finish */
export function LiveBigMemory({ className, phone }: { className?: string; phone?: boolean }) {
  const { s } = useStore()
  const m = s.memory
  if (!m || m.big === null) return null
  return <MemoryCard size={m.big} heap={0} zero painted={m.painted} text={m.text} className={className} phone={phone} />
}
