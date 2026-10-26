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
      {/* Eight rays of one length, reaching nearly to the grid's edge */}
      <path d="M12 2V12M12 12V22M12 12L19.0711 4.92893M12 12L4.92893 19.0711M12 12L22 12M12 12L2 12M12 12L19.0711 19.0711M12 12L4.92893 4.92893" />
    </svg>
  )
}
