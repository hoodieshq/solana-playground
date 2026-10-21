import { cn } from "@/lib/utils"

/** The assistant's mark until Sole has its own (DES-134): a speech bubble with a face, dot eyes and
 * a half moon smile. A bubble, because the assistant answers in words; a face, so it reads as
 * someone answering rather than a chat log. Lucide's 24 grid and round line */
export function AssistantMark({ className, strokeWidth = 1.75 }: { className?: string; strokeWidth?: number }) {
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
      {/* The bubble, its tail down on the left */}
      <path d="M11 18h6a4 4 0 0 0 4-4V8a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v6a4 4 0 0 0 4 4v3.25L11 18Z" />
      {/* The face, large enough to read at 16px: eyes and smile fill most of the bubble */}
      <g fill="currentColor" stroke="none">
        <circle cx="8.6" cy="9.6" r="1.6" />
        <circle cx="15.4" cy="9.6" r="1.6" />
        <path d="M9.7 12.4h4.6a2.3 2.3 0 0 1-4.6 0Z" />
      </g>
    </svg>
  )
}
