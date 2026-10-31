import * as React from "react"
import { cn } from "@/lib/utils"

/* A line of a lesson's text, written the way a person types it: `ticks`
   around code, links as [words](address) or a bare address. It is safe while
   the text is still typing out: a link half written shows its words so far,
   never its brackets or address. Not Markdown: one line of inline text, for
   a card's sentences, an option, a reason. */

// [words](address), or a bare address without the stop that ends the sentence
// after it. The last form catches a link still being typed
const LINK = /\[([^\]]+)\]\(([^)\s]+)\)|(https?:\/\/[^\s`]*[^\s`.,;:!?)])|(?<!#)\[([^\]]*)\]?\(?[^)\s]*$/

/* Code inside a sentence. No colour of its own: a ground darker than
   whatever it sits on, ringed by a faint line drawn as an inset shadow so it
   adds no size, and the text's own ink, so a word of code does not outshine
   the heading over it. On paper the same idea turns over: a faint dark fill
   and a dark ring.
   The sizes are fixed pixels, not a share of the text, so the chip is the
   same in a 16px line and in a quiz's 18. default is mono 14 on a 16 line:
   an inline block 22 tall, 2 clear of a chip on the next line of a 24 line
   (inline, the mono's taller content box made two chips on two lines all but
   touch). small is 12 on 16, 19 tall, for the 13px notes on a 20 line. The
   padding is 3 over and 3 under, a balance of two centres: even over the
   text's capitals and under its baseline, code with no capitals (system_program)
   sat low in its chip and a j's tail all but touched the ring; 3 and 3 give
   the tail 3.6 and leave the chip 4.3 over the capitals, 6.5 under the baseline and reads centred on the
   words, not sunk under them; large (5 over, 2 under, 23 tall) does the same
   for a quiz's 18px question, whose capitals stand higher, and keeps room
   under a y's tail. The code keeps the
   text's baseline;
   4 at the sides (3 on small), so a short word doesn't read as a button.
   Weight 350 matches the text's 320 in colour */
const inlineCodeVariants = {
  default: "px-1 pt-[3px] pb-[3px] text-[14px] leading-4",
  large: "px-1 pt-[5px] pb-[2px] text-[14px] leading-4",
  small: "px-[3px] pt-px pb-[2px] text-[12px] leading-4",
}

type InlineCodeSize = keyof typeof inlineCodeVariants

function InlineCode({
  className,
  size = "default",
  ...props
}: React.ComponentProps<"code"> & {
  /** small for a 13px note on a 20 line */
  size?: InlineCodeSize
}) {
  return (
    <code
      data-slot="inline-code"
      data-size={size}
      className={cn(
        "inline-block rounded-[4px] bg-foreground/[0.06] font-mono font-[350] whitespace-nowrap text-current shadow-[inset_0_0_0_1px_rgb(0_0_0/0.12)] dark:bg-black/35 dark:shadow-[inset_0_0_0_1px_rgb(255_255_255/0.18)]",
        inlineCodeVariants[size],
        className
      )}
      {...props}
    />
  )
}

function ProseLink({ className, ...props }: React.ComponentProps<"a">) {
  return (
    <a
      data-slot="prose-link"
      target="_blank"
      rel="noreferrer"
      className={cn(
        "rounded-[2px] text-foreground underline decoration-foreground/40 underline-offset-[3px] transition-colors outline-none hover:decoration-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring motion-reduce:transition-none",
        className
      )}
      {...props}
    />
  )
}

// A word joiner keeps #[ together, so an attribute in plain text never reads as a link
const joined = (text: string) => text.replaceAll("#[", "#⁠[")

function words(text: string, key: string, linkClassName?: string): React.ReactNode[] {
  const out: React.ReactNode[] = []
  let rest = text
  let n = 0
  for (let m = rest.match(LINK); m; m = rest.match(LINK)) {
    const at = m.index ?? 0
    out.push(joined(rest.slice(0, at)))
    const [, label, href, bare, typing] = m
    if (label && href)
      out.push(
        <ProseLink key={`${key}-${n++}`} href={href} className={linkClassName}>
          {label}
        </ProseLink>
      )
    else if (bare)
      out.push(
        <ProseLink key={`${key}-${n++}`} href={bare} className={linkClassName}>
          {bare.replace(/^https?:\/\/(www\.)?/, "").replace(/#.*$/, "")}
        </ProseLink>
      )
    // Still typing: the words so far, the address not yet
    else out.push(typing ?? "")
    rest = rest.slice(at + m[0].length)
  }
  out.push(joined(rest))
  return out
}

function Prose({
  text,
  className,
  codeClassName,
  linkClassName,
  size = "default",
  ...props
}: Omit<React.ComponentProps<"span">, "children"> & {
  text: string
  /** the code chips' size: small for a 13px note on a 20 line */
  size?: InlineCodeSize
  /** classes for every code chip, as a lighter fill on a raised surface */
  codeClassName?: string
  linkClassName?: string
}) {
  // A stop right after a chip is glued to it in one unbreakable run: an inline block lets the line
  // break after it, and ". It used" started the next line with its period
  const all = text.split("`")
  const parts: React.ReactNode[] = []
  for (let i = 0; i < all.length; i++) {
    if (i % 2 === 0) {
      parts.push(...words(all[i], String(i), linkClassName))
      continue
    }
    const stop = (all[i + 1] ?? "").match(/^[.,;:!?)\]]+/)?.[0] ?? ""
    const code = (
      // Before a stop, a comma or a closing bracket the chip keeps 2px clear: flush, the stop stuck to the ring
      <InlineCode key={i} size={size} className={cn(stop && "mr-[2px]", codeClassName)}>
        {all[i]}
      </InlineCode>
    )
    if (!stop) {
      parts.push(code)
      continue
    }
    parts.push(
      <span key={`${i}-stop`} className="whitespace-nowrap">
        {code}
        {stop}
      </span>
    )
    all[i + 1] = all[i + 1].slice(stop.length)
  }
  return (
    <span data-slot="prose" className={className} {...props}>
      {parts}
    </span>
  )
}

export { InlineCode, Prose, ProseLink }
