import { cn } from "@/lib/utils"

/** A button's keyboard shortcut, said quietly after its label: smaller, in the label's own colour
 * at part strength, with no cap of its own, so it doesn't read as a second button inside the first.
 * The button centres it, which leaves smaller type riding high, so it drops a pixel onto the
 * label's baseline. The button's own gap, 8px, keeps the two one phrase. `flash` counts presses of
 * the keys: each lights the hint for a moment (prototype.css). `leaving` is a hint kept on a button
 * that just went busy, only for its flash, so it lights and fades out with the press */
export function Shortcut({ keys, flash = 0, leaving = false, className }: { keys: string; flash?: number; leaving?: boolean; className?: string }) {
  return (
    <kbd
      key={flash}
      className={cn("translate-y-px font-sans text-[0.75rem] font-[440] opacity-60", flash > 0 && (leaving ? "pg-key-leave" : "pg-key-flash"), className)}
      aria-label={`Shortcut ${keys}`}
      // Kept on a busy button only to fade out: the button no longer takes the keys, so it isn't read
      aria-hidden={leaving || undefined}
    >
      {keys}
    </kbd>
  )
}
