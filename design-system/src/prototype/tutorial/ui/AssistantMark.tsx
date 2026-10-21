import { cn } from "@/lib/utils"

/** The assistant's mark until Sole has its own (DES-134): a robot's head, a rounded square with a
 * visor and two ring eyes, nothing else. Lucide's 24 grid and round line */
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
      <rect x="3" y="3" width="18" height="18" rx="7" />
      <rect x="5.5" y="7.5" width="13" height="9" rx="4.5" />
      {/* A thinner line for the eyes, so they stay rings with air around them at 16px */}
      <g strokeWidth={strokeWidth * 0.85}>
        <circle cx="9.3" cy="12" r="1.4" />
        <circle cx="14.7" cy="12" r="1.4" />
      </g>
    </svg>
  )
}
