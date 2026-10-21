import { cn } from "@/lib/utils"

/** A button's keyboard shortcut, said quietly after its label: smaller, in the label's own colour
 * at part strength, with no cap of its own, so it doesn't read as a second button inside the first */
export function Shortcut({ keys, className }: { keys: string; className?: string }) {
  return (
    <kbd className={cn("ml-0.5 font-sans text-[0.75rem] font-[440] tracking-[0.08em] opacity-60", className)} aria-label={`Shortcut ${keys}`}>
      {keys}
    </kbd>
  )
}
