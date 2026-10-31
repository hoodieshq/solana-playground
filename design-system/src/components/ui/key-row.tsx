import * as React from "react"
import { ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"

/* A key cut to its ends, six and six by default: 7Hq5Ab…Xk2PqR. One format
   everywhere, so a key read in the chat, the terminal and a receipt is
   checked by the same ends. A key short enough to read whole stays whole */
function shortKey(key: string, head = 6, tail = 6) {
  return key.length <= head + tail + 1 ? key : `${key.slice(0, head)}…${key.slice(-tail)}`
}

/* A key a run leaves behind, a program id or a signature, in one line: its
   label, the key cut to its ends, then Copy and the Explorer link. On a
   narrow card (under 20rem) the label goes over the key, so the key keeps
   the room the actions leave, and the link keeps only its icon. flat drops
   the box, inside a card that already has one. The row sits in a wrapper
   that is its container, since a box cannot query its own width */
function KeyRow({ className, flat = false, children, ...props }: React.ComponentProps<"div"> & { flat?: boolean }) {
  return (
    <div data-slot="key-row" data-flat={flat || undefined} className={cn("@container/key-row", className)} {...props}>
      <div
        className={cn(
          "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 text-caption @max-xs/key-row:grid-cols-[minmax(0,1fr)_auto]",
          !flat && "rounded-control border border-border bg-surface-panel px-3 py-2"
        )}
      >
        {children}
      </div>
    </div>
  )
}

function KeyRowLabel({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="key-row-label"
      className={cn("shrink-0 text-muted-foreground @max-xs/key-row:col-start-1 @max-xs/key-row:row-start-1", className)}
      {...props}
    />
  )
}

/* The key itself, cut to head and tail; the whole key is its title */
function KeyRowValue({
  className,
  value,
  head = 6,
  tail = 6,
  ...props
}: Omit<React.ComponentProps<"code">, "children"> & { value: string; head?: number; tail?: number }) {
  return (
    <code
      data-slot="key-row-value"
      title={value}
      className={cn(
        "min-w-0 truncate font-mono text-code text-foreground @max-xs/key-row:col-start-1 @max-xs/key-row:row-start-2",
        className
      )}
      {...props}
    >
      {shortKey(value, head, tail)}
    </code>
  )
}

/* Copy and the link. Put a CopyButton and a KeyRowLink inside. Under a
   finger each is a 44px square, pulled into the row so it keeps its height */
function KeyRowActions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="key-row-actions"
      className={cn(
        "-my-1 flex shrink-0 items-center gap-1 @max-xs/key-row:col-start-2 @max-xs/key-row:row-span-2 @max-xs/key-row:row-start-1 @max-xs/key-row:-mr-1.5",
        "pointer-coarse:-my-3 pointer-coarse:*:data-[slot=copy-button]:size-11",
        className
      )}
      {...props}
    />
  )
}

/* The way to the key on an explorer. Its words go on a narrow card, where
   it keeps only its icon; the words stay for a screen reader */
function KeyRowLink({ className, children = "Explorer", ...props }: React.ComponentProps<"a">) {
  return (
    <a
      data-slot="key-row-link"
      target="_blank"
      rel="noreferrer"
      className={cn(
        "flex h-6 shrink-0 items-center gap-1 rounded-md px-1 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring pointer-coarse:h-11 @max-xs/key-row:w-6 @max-xs/key-row:justify-center @max-xs/key-row:px-0 pointer-coarse:@max-xs/key-row:w-11",
        className
      )}
      {...props}
    >
      <span className="@max-xs/key-row:sr-only">{children}</span>
      <ExternalLink strokeWidth={1.75} aria-hidden="true" className="size-3.5" />
    </a>
  )
}

export { KeyRow, KeyRowActions, KeyRowLabel, KeyRowLink, KeyRowValue, shortKey }
