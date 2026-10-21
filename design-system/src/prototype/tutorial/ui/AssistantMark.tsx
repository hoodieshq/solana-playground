import { cn } from "@/lib/utils"

/** The assistant's mark until Sole has its own (DES-134): one line that makes a round head, opens at
 * the lower left and runs out of the bottom into a speech bubble's tail, with a smile inside. Flat
 * line ends, as drawn. Lucide's 24 grid */
export function AssistantMark({ className, strokeWidth = 1.75 }: { className?: string; strokeWidth?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="butt"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("size-4 shrink-0", className)}
    >
      {/* The head, from the gap at the lower left over the top and round to the bottom, then the tail */}
      <path d="M6.66 16.56A7.8 7.8 0 1 1 11.16 18.3C9.4 18.25 7.4 19.4 6 21.9" />
      {/* The smile, a flattened half circle under the middle */}
      <path d="M8.05 11.9A3.8 2.6 0 0 0 15.65 11.9" />
    </svg>
  )
}
