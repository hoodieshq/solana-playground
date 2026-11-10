import { cn } from "@/lib/utils"

import { useNavDesign, useNavState } from "../../navStates"
import { soon } from "../Catalog"

/** The assistant's limit said where you type, for Lit Path's ai-limit state: the chip says it in the
 * nav, this says what still works. 3:00 PM is example data; the product supplies the reset time */
export function LimitNotice({ className }: { className?: string }) {
  const design = useNavDesign()
  const [id] = useNavState()
  if (design !== "lit" || id !== "ai-limit") return null
  return (
    <p role="status" className={cn("flex items-start gap-2 text-caption text-muted-foreground", className)}>
      <span aria-hidden="true" className="mt-[0.4375rem] size-1.5 shrink-0 rounded-full bg-warning" />
      <span className="min-w-0">
        {"You've reached today's assistant limit. It's back at 3:00\u00a0PM. Lesson steps still work. "}
        <button type="button" onClick={soon} className="rounded-sm font-act text-foreground underline-offset-2 outline-none hover:underline focus-visible:outline-2 focus-visible:outline-brand-purple">
          Add an API key
        </button>
      </span>
    </p>
  )
}
