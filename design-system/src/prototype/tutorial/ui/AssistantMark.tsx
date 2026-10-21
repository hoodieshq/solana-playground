import { cn } from "@/lib/utils"

/** The assistant's mark until Sole has its own (DES-134): an eight ray spark from the centre.
 * Lucide's 24 grid and round line, at the weight it was drawn with */
export function AssistantMark({ className, strokeWidth = 2 }: { className?: string; strokeWidth?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("size-4 shrink-0", className)}
    >
      <path d="M12 4V12M12 12V20M12 12L18 6M12 12L6 18M12 12H20M12 12H4M12 12L18 18M12 12L6 6" />
    </svg>
  )
}
