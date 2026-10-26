import type { Ref } from "react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

import { NAME_MAX } from "../data"
import { useStore } from "../store"

/** The name hello is called with. Any text works, nothing checks it's a name, and it stays on this
 * device. The text lives in the store, so switching views keeps it. Enter calls, as the button does.
 * `phone` sets it at 16px: under that iOS zooms the page in on focus wherever the scale cap is missing */
export function NameField({
  id,
  className,
  inputRef,
  onEnter,
  phone = false,
}: {
  id?: string
  className?: string
  inputRef?: Ref<HTMLInputElement>
  onEnter?: () => void
  phone?: boolean
}) {
  const { s, dispatch } = useStore()
  const calling = s.phase === "calling"
  return (
    <Input
      ref={inputRef}
      id={id}
      value={s.draft}
      onChange={(e) => dispatch({ type: "draft", text: e.target.value })}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.metaKey && !e.ctrlKey) {
          e.preventDefault()
          onEnter?.()
        }
      }}
      maxLength={NAME_MAX}
      placeholder="Your name"
      aria-label="Name to call hello with"
      // While the call runs the name it carries stays on show, unchanged
      readOnly={calling}
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
      enterKeyHint="go"
      // Focus as Claude Code's fields: the edge lightens a step, no thick halo round it
      className={cn(phone ? "text-[1rem]!" : "text-control!", "read-only:text-muted-foreground focus-visible:border-foreground/35 focus-visible:ring-0", className)}
    />
  )
}
