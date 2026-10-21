import { cn } from "@/lib/utils"

/** A button's keyboard shortcut, said quietly after its label: smaller, in the label's own colour
 * at part strength, with no cap of its own, so it doesn't read as a second button inside the first.
 * The button centres it, which leaves smaller type riding high, so it drops a pixel onto the
 * label's baseline. The button's own gap, 8px, keeps the two one phrase */
export function Shortcut({ keys, className }: { keys: string; className?: string }) {
  return (
    <kbd className={cn("translate-y-px font-sans text-[0.75rem] font-[440] opacity-60", className)} aria-label={`Shortcut ${keys}`}>
      {keys}
    </kbd>
  )
}
