import type * as React from "react"
import { Droplets, Hammer, Rocket, Send } from "lucide-react"

import { Input } from "@/components/ui/input"
import {
  RunCard,
  RunCardAction,
  RunCardContent,
  RunCardCount,
  RunCardDescription,
  RunCardHeader,
  RunCardIcon,
  RunCardProgress,
  RunCardRecord,
  RunCardTitle,
} from "@/components/ui/run-card"

import { Block, More } from "../parts"

/* A stand in for the chat panel: the text column inset 20 from its edges (16
   on a phone), a line of the reply, and the card 40 under it */
function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-[440px] rounded-panel border border-border bg-background px-5 py-6 max-sm:px-4">
      <p className="text-[1rem] leading-6 text-foreground/80">Your program compiles. Build it, and it is ready to deploy.</p>
      <div className="mt-10">{children}</div>
    </div>
  )
}

function RunCardBlock() {
  return (
    <Block
      id="run-card"
      title="Run card"
      source="playground"
      registry="run-card"
      note="Something to run from the conversation: Build, Deploy, Run, Call. Padding 16, the title in the heading face 16/24 at 500 over a 14/18 grey line, the button at the cards' action size: 40 with a mouse, 44 under a finger, the heading face at 15. Like the quiz it waits on you: bleed steps it out of a 20px column to 8px from the panel's edge; stand it 40 under the text over it. Running, the context line gives way to the stage and its count, read out as a status; the button keeps its width with a spinner over its label, so nothing beside it is squeezed; and a bar along the foot fills each stage over its expected time, stopping short until the next stage comes. Interrupted turns the line to the warning ink. Once run it folds to RunCardRecord, one line, never a button again. horizontal wraps the button under the text once the text would drop under 15rem; vertical stacks, for a card with a field of its own. On a phone the button is 48px, full width."
      className="flex-col flex-nowrap items-stretch gap-4"
      more={
        <More label="vertical, with a field of its own" className="flex-col flex-nowrap items-stretch">
          <RunCard orientation="vertical" className="max-w-lg">
            <RunCardHeader>
              <RunCardIcon>
                <Send />
              </RunCardIcon>
              <RunCardContent>
                <RunCardTitle>Call hello</RunCardTitle>
                <RunCardDescription>Type any name</RunCardDescription>
              </RunCardContent>
            </RunCardHeader>
            <div className="flex items-center gap-2 max-sm:flex-col max-sm:items-stretch">
              <Input aria-label="Name" defaultValue="Ada" className="h-9 flex-1 max-sm:h-12" />
              <RunCardAction>Call</RunCardAction>
            </div>
          </RunCard>
        </More>
      }
    >
      <Panel>
        <RunCard bleed>
          <RunCardHeader>
            <RunCardIcon>
              <Hammer />
            </RunCardIcon>
            <RunCardContent>
              <RunCardTitle>Build</RunCardTitle>
              <RunCardDescription>Compiles lib.rs into a program you can deploy</RunCardDescription>
            </RunCardContent>
          </RunCardHeader>
          <RunCardAction>Build</RunCardAction>
        </RunCard>
      </Panel>
      <Panel>
        <RunCard bleed state="running">
          <RunCardHeader>
            <RunCardIcon>
              <Rocket />
            </RunCardIcon>
            <RunCardContent>
              <RunCardTitle>Deploy</RunCardTitle>
              <RunCardDescription>
                Deploying <RunCardCount>· 2 of 3</RunCardCount>
              </RunCardDescription>
            </RunCardContent>
          </RunCardHeader>
          <RunCardAction>Deploy</RunCardAction>
          <RunCardProgress stage={1} stages={3} duration={2400} />
        </RunCard>
      </Panel>
      <RunCard className="max-w-lg">
        <RunCardHeader>
          <RunCardIcon>
            <Rocket />
          </RunCardIcon>
          <RunCardContent>
            <RunCardTitle>Deploy</RunCardTitle>
            <RunCardDescription>Puts your program on devnet, paid from your wallet</RunCardDescription>
          </RunCardContent>
        </RunCardHeader>
        <RunCardAction>Deploy</RunCardAction>
      </RunCard>
      <RunCard state="interrupted" className="max-w-lg">
        <RunCardHeader>
          <RunCardIcon>
            <Hammer />
          </RunCardIcon>
          <RunCardContent>
            <RunCardTitle>Build</RunCardTitle>
            <RunCardDescription>Interrupted by a reload. Run it again.</RunCardDescription>
          </RunCardContent>
        </RunCardHeader>
        <RunCardAction>Build</RunCardAction>
      </RunCard>
      <RunCardRecord className="max-w-lg">Deployed in 4.2 s</RunCardRecord>
      <RunCardRecord icon={<Droplets />} className="max-w-lg">
        The faucet was out of SOL
      </RunCardRecord>
    </Block>
  )
}

export { RunCardBlock }
