import * as React from "react"

import { StepTrack, StepTrackBar, StepTrackIndicator, type StepTrackStep } from "@/components/ui/step-track"

import { Block, More } from "../parts"

const NAMES = [
  { label: "Write", title: "Write the program" },
  { label: "Build", title: "Build it" },
  { label: "Deploy", title: "Deploy to devnet" },
  { label: "Call", title: "Call it from the client" },
]

/* Statuses for a lesson at `at`, with `passed` steps done */
const at = (step: number, passed = step): StepTrackStep[] =>
  NAMES.map((n, i) => ({ ...n, status: i < passed ? "done" : i === step ? "current" : "upcoming" }))

/* A chat head with its rule, the track under it as the tutorial sets it */
function Head({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-md overflow-hidden rounded-lg bg-surface-panel">
      <div className="flex h-12 items-center border-b border-border px-5 font-heading text-[0.9375rem] font-medium text-foreground">Hello, Anchor</div>
      <div className="px-5 pb-3">{children}</div>
    </div>
  )
}

/* A phone header, 76 tall, the bare track as its bottom edge */
function PhoneHeader({ lit, where }: { lit: number; where: string }) {
  return (
    <div className="relative flex h-[4.75rem] w-[23.4375rem] max-w-full shrink-0 flex-col justify-center rounded-t-lg bg-surface-panel pb-4 pl-4">
      <span className="font-heading text-[0.9375rem] leading-5 font-medium text-foreground">Hello, Anchor</span>
      <span className="text-caption leading-[1.125rem] text-muted-foreground">{where}</span>
      <StepTrackBar count={4} lit={lit} />
    </div>
  )
}

/* The rest, for people reading the page */
function StepTrackMore() {
  return (
    <>
      <More label="Before the first step, and once every step is done">
        <Head>
          <StepTrack aria-label="Tutorial steps" steps={at(-1, 0)} />
        </Head>
        <Head>
          <StepTrack aria-label="Tutorial steps" steps={at(-1, 4)} />
        </Head>
      </More>
      <More label="Phone header before Start: the hairline">
        <PhoneHeader lit={0} where="4 steps · 10 min" />
      </More>
      <More label="StepTrackIndicator in the menu: upcoming, current, done, read back">
        <StepTrackIndicator index={3} />
        <StepTrackIndicator index={1} status="current" />
        <StepTrackIndicator index={0} status="done" />
        <StepTrackIndicator index={0} status="done" viewing />
      </More>
    </>
  )
}

function StepTrackBlock() {
  const [viewing, setViewing] = React.useState<number | null>(null)
  return (
    <Block
      id="step-track"
      title="Step track"
      source="playground"
      registry="step-track"
      className="flex-col flex-nowrap items-start gap-6"
      more={<StepTrackMore />}
      note="A lesson's steps across the top of the chat. One line at 14/18 says where you are and opens the steps in a menu; under it a 4px segment a step, 4px apart on a 12% white track, one purple to green fill laid across them all. Each segment is a 12px tall target, and a reached one takes you back to its step. The line sits 12 under the head's rule and the bar 12 under the line. Newly lit segments sweep in one after another. StepTrackBar is the same segments as a phone header's bottom edge, inset 16 and 8 off the bottom of a 76 header, a hairline before anything is under way."
    >
      <Head>
        <StepTrack aria-label="Tutorial steps" steps={at(2)} viewing={viewing} onStepSelect={(i) => setViewing(i === 2 ? null : i)} />
      </Head>
      <PhoneHeader lit={3} where="Step 3 of 4 · Deploy" />
    </Block>
  )
}

export { StepTrackBlock }
