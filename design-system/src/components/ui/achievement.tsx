import * as React from "react"
import { cn } from "@/lib/utils"

/* An achievement as a profile shows it (profiles, v0.2, proposed): a disc
   in a ring of the brand's gradient once earned, grey until then. appear is
   the moment it is earned (a lesson's finish): the disc pops in once with a
   glow round it. */

function Achievement({
  className,
  earned = true,
  appear = false,
  ...props
}: React.ComponentProps<"div"> & { earned?: boolean; appear?: boolean }) {
  return (
    <div
      data-slot="achievement"
      data-state={earned ? "earned" : "locked"}
      data-appear={appear || undefined}
      className={cn("group/achievement flex w-24 flex-col items-center gap-2 text-center", className)}
      {...props}
    />
  )
}

function AchievementMedia({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="achievement-media"
      className={cn(
        "grid size-16 place-items-center rounded-full bg-border-strong p-[2px] group-data-[state=earned]/achievement:bg-brand-fill",
        "group-data-appear/achievement:shadow-glow group-data-appear/achievement:animate-in group-data-appear/achievement:fade-in group-data-appear/achievement:zoom-in-50 group-data-appear/achievement:duration-[440ms] group-data-appear/achievement:ease-pop motion-reduce:group-data-appear/achievement:animate-none",
        className
      )}
      {...props}
    >
      <div className="grid size-full place-items-center rounded-full bg-surface-panel text-subtle group-data-[state=earned]/achievement:text-foreground [&_svg:not([class*='size-'])]:size-6">
        {children}
      </div>
    </div>
  )
}

function AchievementLabel({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="achievement-label"
      className={cn("text-caption font-label text-subtle group-data-[state=earned]/achievement:text-foreground", className)}
      {...props}
    />
  )
}

export { Achievement, AchievementLabel, AchievementMedia }
