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
      {/* The face */}
      <g fill="currentColor" stroke="none">
        <circle cx="9" cy="10" r="1.15" />
        <circle cx="15" cy="10" r="1.15" />
        <path d="M10.3 12.6h3.4a1.7 1.7 0 0 1-3.4 0Z" />
      </g>
    </svg>
  )
}
