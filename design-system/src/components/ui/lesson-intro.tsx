import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/* A lesson's start, as the assistant's first message: a thumb, the title
   and its facts (level, steps, minutes), the promise, the proof as the log
   will print it, how a lesson goes, a note on cost, and Start. card frames
   it in the conversation; plain is the feed's own text, as on a phone,
   where a frame costs the column its width and the screen's header names
   the lesson, so hide the header there. The chat's scale: the title at
   24/28, How it goes at 20/24, the reading text at 16/24 and 320 at 80%,
   side notes at 13. */

const LessonIntroContext = React.createContext<{ titleId?: string }>({})

const lessonIntroVariants = cva("", {
  variants: {
    variant: {
      card: "rounded-panel border border-border bg-card-ground p-5",
      plain: "pt-2",
    },
  },
  defaultVariants: {
    variant: "card",
  },
})

function LessonIntro({
  className,
  variant = "card",
  ...props
}: React.ComponentProps<"section"> & VariantProps<typeof lessonIntroVariants>) {
  const titleId = React.useId()
  return (
    <LessonIntroContext.Provider value={{ titleId }}>
      <section
        data-slot="lesson-intro"
        data-variant={variant}
        aria-labelledby={titleId}
        className={cn(lessonIntroVariants({ variant }), className)}
        {...props}
      />
    </LessonIntroContext.Provider>
  )
}

/* The thumb and the words beside it */
function LessonIntroHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="lesson-intro-header" className={cn("flex items-center gap-3", className)} {...props} />
}

/* The lesson's picture: a cover, a thumb, an icon. The slot is a 40px square */
function LessonIntroMedia({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="lesson-intro-media"
      className={cn(
        "relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-surface-raised text-muted-foreground after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:ring-1 after:ring-foreground/10 after:ring-inset *:[img]:size-full *:[img]:object-cover [&_svg:not([class*='size-'])]:size-5",
        className
      )}
      {...props}
    />
  )
}

function LessonIntroTitle({ className, id, ...props }: React.ComponentProps<"h2">) {
  const { titleId } = React.useContext(LessonIntroContext)
  return (
    <h2
      data-slot="lesson-intro-title"
      id={id ?? titleId}
      className={cn("truncate font-heading text-[1.5rem] leading-[1.75rem] font-medium tracking-normal text-foreground", className)}
      {...props}
    />
  )
}

/* Level, steps, minutes: a list read as one line, a dot between */
function LessonIntroFacts({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="lesson-intro-facts"
      className={cn(
        "flex min-w-0 items-center overflow-hidden text-caption whitespace-nowrap text-muted-foreground [&>li+li]:before:px-[0.35em] [&>li+li]:before:content-['·']",
        className
      )}
      {...props}
    />
  )
}

function LessonIntroFact({ className, ...props }: React.ComponentProps<"li">) {
  return <li data-slot="lesson-intro-fact" className={cn("shrink-0 tabular-nums last:truncate last:shrink", className)} {...props} />
}

/* What you end with. 24 under the head, not the 15 between paragraphs, so
   the name and its meta read as the head and not as the first line */
function LessonIntroDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="lesson-intro-description"
      className={cn("mt-6 text-[1rem] leading-[1.5rem] font-read tracking-normal text-foreground/80 first:mt-0", className)}
      {...props}
    />
  )
}

/* The end as the log will print it, so the promise is a thing you will see.
   9 under the text it proves. Give it an aria-label that says so */
function LessonIntroProof({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="lesson-intro-proof"
      className={cn("mt-[9px] rounded-lg bg-foreground/[0.05] px-3 py-2.5 font-mono text-[0.8125rem] leading-[1.5] break-words text-foreground/90", className)}
      {...props}
    />
  )
}

/* A heading inside the card, "How it goes", 20/24: 30 above and 9 under,
   so it belongs to the list it heads */
function LessonIntroHeading({ className, ...props }: React.ComponentProps<"h3">) {
  return <h3 data-slot="lesson-intro-heading" className={cn("mt-[30px] font-heading text-[1.25rem] leading-[1.5rem] font-medium tracking-normal text-foreground", className)} {...props} />
}

/* How a lesson goes, one beat a line 6 apart, numbered by the list itself */
function LessonIntroSteps({ className, ...props }: React.ComponentProps<"ol">) {
  return <ol data-slot="lesson-intro-steps" className={cn("mt-[9px] flex flex-col gap-1.5 [counter-reset:beat]", className)} {...props} />
}

function LessonIntroStep({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="lesson-intro-step"
      className={cn(
        "flex items-baseline gap-2.5 text-[1rem] leading-[1.5rem] font-read tracking-normal text-foreground/80 [counter-increment:beat] before:w-3 before:shrink-0 before:text-caption before:text-muted-foreground before:tabular-nums before:content-[counter(beat)]",
        className
      )}
      {...props}
    />
  )
}

/* What is said on the side: what Start does, what it costs. 24 over it, so
   it stands off the list rather than continuing it */
function LessonIntroNote({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="lesson-intro-note" className={cn("mt-6 text-caption text-muted-foreground", className)} {...props} />
}

/* Start, the same 24 under the note, so the last three blocks share one
   beat. Full width under the thumb on a phone */
function LessonIntroAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="lesson-intro-action"
      className={cn("mt-6 flex flex-wrap items-center gap-2 max-sm:flex-col max-sm:items-stretch", className)}
      {...props}
    />
  )
}

export {
  LessonIntro,
  LessonIntroAction,
  LessonIntroDescription,
  LessonIntroFact,
  LessonIntroFacts,
  LessonIntroHeader,
  LessonIntroHeading,
  LessonIntroMedia,
  LessonIntroNote,
  LessonIntroProof,
  LessonIntroStep,
  LessonIntroSteps,
  LessonIntroTitle,
  lessonIntroVariants,
}
