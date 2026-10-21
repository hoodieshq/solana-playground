import type { Ref } from "react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

import { NAME_MAX } from "../data"
import { useStore } from "../store"

/** The name hello is called with. Any text works, nothing checks it's a name, and it stays on this
 * device. The text lives in the store, so switching views keeps it. Enter calls, as Run does */
export function NameField({ id, className, inputRef }: { id?: string; className?: string; inputRef?: Ref<HTMLInputElement> }) {
  const { s, dispatch } = useStore()
  const calling = s.phase === "calling"
  return (
    <Input
      ref={inputRef}
      id={id}
      value={s.draft}
      onChange={(e) => dispatch({ type: "draft", text: e.target.value })}
      maxLength={NAME_MAX}
      placeholder="Your name"
      aria-label="Name to call hello with"
      // While the call runs the name it carries stays on show, unchanged
      readOnly={calling}
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
      enterKeyHint="go"
      className={cn("text-control! read-only:text-muted-foreground", className)}
    />
  )
}
