import { Anchor, ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
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
} from "@/components/ui/lesson-intro"

import { Block } from "../parts"

function LessonIntroBlock() {
  return (
    <Block
      id="lesson-intro"
      title="Lesson intro"
      source="playground"
      registry="lesson-intro"
      note="A lesson's start, as the assistant's first message, in the order guided lessons use: what you end with, made concrete by the line the log will print; how a lesson run as a chat goes, since that is new to most people; then what it costs. The media slot takes a cover, a thumb or an icon. plain drops the frame, for a phone, where it is the feed's own text and Start sits at the screen's foot. The chat's scale: the title at 24/28, How it goes at 20/24, reading text at 16/24, side notes at 13. Head to text 24, text to the log line 9, the heading 30 over its list and 9 above it, the note and Start 24 apart."
      className="flex-col flex-nowrap items-start"
    >
      <LessonIntro className="w-full max-w-lg">
        <LessonIntroHeader>
          <LessonIntroMedia>
            <Anchor />
          </LessonIntroMedia>
          <div className="min-w-0">
            <LessonIntroTitle>Hello, Anchor</LessonIntroTitle>
            <LessonIntroFacts>
              <LessonIntroFact>Beginner</LessonIntroFact>
              <LessonIntroFact>4 steps</LessonIntroFact>
              <LessonIntroFact>10 min</LessonIntroFact>
            </LessonIntroFacts>
          </div>
        </LessonIntroHeader>
        <LessonIntroDescription>
          Write a Solana program that says hello, deploy it to devnet and call it from a client.
        </LessonIntroDescription>
        <LessonIntroProof aria-label="What your program prints at the end">Program log: Hello, Ada!</LessonIntroProof>
        <LessonIntroHeading>How it goes</LessonIntroHeading>
        <LessonIntroSteps>
          <LessonIntroStep>I explain a piece</LessonIntroStep>
          <LessonIntroStep>You pick an answer</LessonIntroStep>
          <LessonIntroStep>I write the code</LessonIntroStep>
          <LessonIntroStep>You build and run it</LessonIntroStep>
        </LessonIntroSteps>
        <LessonIntroNote>
          After Start the editor clears and we write the program together. A devnet wallet is set up for you with free test SOL.
        </LessonIntroNote>
        <LessonIntroAction>
          <Button size="action" className="px-5">
            Start step 1
            <ArrowRight data-icon="inline-end" />
          </Button>
        </LessonIntroAction>
      </LessonIntro>
    </Block>
  )
}

export { LessonIntroBlock }
