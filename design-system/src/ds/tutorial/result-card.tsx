import type { ReactNode } from "react"
import { Check, CircleX, TreePine, Zap } from "lucide-react"

import { Button } from "@/components/ui/button"
import { shortKey } from "@/components/ui/key-row"
import { Meter, MeterLabel, MeterTrack, MeterValue } from "@/components/ui/meter"
import {
  ResultCard,
  ResultCardBody,
  ResultCardDetails,
  ResultCardFold,
  ResultCardHeader,
  ResultCardMeta,
  ResultCardText,
  ResultCardTitle,
} from "@/components/ui/result-card"
import { ResultDetails } from "@/components/ui/result-details"

import { Block, More } from "../parts"

const PROGRAM_ID = "9hJqVkR3mWb7sTnYp2aXcL5dF8gH1jE4uK6oQzWxCvB"
const SIGNATURE = "5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW"
const PLAYER = "4kPz8mRtYw2nVb6cXq9jHs3fLd7gAe5uNo1iKpT2rZxM"
const EXPLORER = "https://explorer.solana.com/?cluster=devnet"

const DEPLOY_LOG = [
  "$ anchor deploy --provider.cluster devnet",
  "Deploying cluster: https://api.devnet.solana.com",
  "Upgrade authority: ~/.config/solana/id.json",
  "Deploying program \"lumberjack\"...",
  `Program Id: ${PROGRAM_ID}`,
  `Signature: ${SIGNATURE}`,
  "Deploy success",
]

const CALL_LOG = [
  `Program ${PROGRAM_ID} invoke [1]`,
  "Program log: Instruction: InitPlayer",
  "Program 11111111111111111111111111111111 invoke [2]",
  "Program 11111111111111111111111111111111 success",
  `Program ${PROGRAM_ID} consumed 7342 of 200000 compute units`,
  `Program ${PROGRAM_ID} success`,
]

const HELLO_LOG = [
  `Program ${PROGRAM_ID} invoke [1]`,
  "Program log: Instruction: Hello",
  "Program log: Hello, Ada!",
  `Program ${PROGRAM_ID} consumed 1204 of 200000 compute units`,
  `Program ${PROGRAM_ID} success`,
]

const ok = <Check className="text-success" />

/* The build's details are its log alone: the status row already says it built and how long it took */
function BuildSuccessful() {
  return (
    <ResultCard className="max-w-lg">
      <ResultCardHeader toggle>
        {ok}
        <ResultCardText>
          <ResultCardTitle>Build successful</ResultCardTitle>
          <ResultCardMeta>2 instructions · 1.6 s</ResultCardMeta>
        </ResultCardText>
      </ResultCardHeader>
      <ResultCardFold>
        <ResultCardDetails>
          <pre className="font-mono text-[0.75rem] leading-5 whitespace-pre-wrap text-muted-foreground">
            {"Compiling lumberjack v0.1.0\n"}
            <span className="text-success">Finished release in 1.6 s</span>
          </pre>
        </ResultCardDetails>
      </ResultCardFold>
    </ResultCard>
  )
}

function Deployed({ open = false }: { open?: boolean }) {
  return (
    <ResultCard defaultOpen={open} className="max-w-lg">
      <ResultCardHeader toggle>
        {ok}
        <ResultCardText>
          <ResultCardTitle>Deployed to devnet</ResultCardTitle>
        </ResultCardText>
      </ResultCardHeader>
      <ResultCardFold>
        <ResultCardDetails>
          <ResultDetails
            text={`Your program now lives on devnet at \`${shortKey(PROGRAM_ID)}\`. The deploy took 5.7 s and 1.27 test SOL from your wallet.`}
            copy={{ label: "Copy id", value: PROGRAM_ID }}
            explorer={EXPLORER}
            log={DEPLOY_LOG}
            onOpenTerminal={() => {}}
            defaultLogOpen={open}
          />
        </ResultCardDetails>
      </ResultCardFold>
    </ResultCard>
  )
}

/* The account the client read back, drawn as the game sees it. On the card's ground, with no box of
   its own: never a block inside a block */
function PlayerAccount() {
  return (
    <div>
      <div className="flex items-center gap-2 text-caption text-muted-foreground">
        <span className="text-foreground">Player account</span>
        <span className="min-w-0 truncate font-mono text-[0.75rem]" title={PLAYER}>
          {shortKey(PLAYER)}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2">
        <Meter value={5} max={5}>
          <MeterLabel>
            <Zap aria-hidden="true" />
            <span className="sr-only">Energy</span>
          </MeterLabel>
          <MeterTrack />
          <MeterValue>5/5</MeterValue>
        </Meter>
        <span className="flex items-center gap-1.5">
          <TreePine aria-hidden="true" className="size-3.5 text-muted-foreground" />
          <span className="font-mono text-[0.8125rem] text-foreground tabular-nums">0</span>
          <span className="text-caption text-muted-foreground">wood</span>
        </span>
      </div>
    </div>
  )
}

/* What the call brought back stays in view under the head; the head's chevron opens how it went */
function Confirmed({ instruction, body, text, log }: { instruction: string; body: ReactNode; text: string; log: string[] }) {
  return (
    <ResultCard className="max-w-lg">
      <ResultCardHeader toggle>
        {ok}
        <ResultCardText>
          <ResultCardTitle>Confirmed</ResultCardTitle>
          <ResultCardMeta>
            <code>{instruction}</code>
          </ResultCardMeta>
        </ResultCardText>
      </ResultCardHeader>
      <ResultCardBody>{body}</ResultCardBody>
      <ResultCardFold>
        <ResultCardDetails>
          <ResultDetails text={text} copy={{ label: "Copy signature", value: SIGNATURE }} explorer={EXPLORER} log={log} onOpenTerminal={() => {}} />
        </ResultCardDetails>
      </ResultCardFold>
    </ResultCard>
  )
}

function ResultCardBlock() {
  return (
    <Block
      id="result-card"
      title="Result card"
      source="playground"
      registry="result-card"
      note="One shape for every finished run: a status row, the result under it when there is one, and details that open in the same box, never a box of their own. The status row is the same on every result: the title in the heading face at 16, the meta at 14 in grey on its baseline, the icon centred on the title's line; 36 tall, 44 under a finger, 48 for a failure still waiting on you. Build and deploy are one row whose head opens the details. Confirmed keeps what came back in view under its head, and the head's chevron opens how it went. The details are ResultDetails: one sentence with the key in a code chip, then Copy, Explorer and the log."
      className="flex-col flex-nowrap items-stretch gap-4"
      more={
        <>
          <More label="Build failed: live and waiting on you, then folded" className="flex-col flex-nowrap items-stretch">
            <ResultCard variant="error" size="lg" className="max-w-lg">
              <ResultCardHeader>
                <CircleX className="text-error" />
                <ResultCardText>
                  <ResultCardTitle>Build failed</ResultCardTitle>
                  <ResultCardMeta>E0412 · line 9</ResultCardMeta>
                </ResultCardText>
              </ResultCardHeader>
              <ResultCardBody className="gap-6">
                <p className="border-l-2 border-error/40 pl-3 font-mono text-[0.8125rem] leading-[1.6] break-words text-foreground/90">
                  error[E0412]: cannot find type `Initialize` in this scope
                </p>
                <p className="text-[1rem] leading-[1.5rem] font-read text-foreground/80">
                  The Context names a struct that does not exist yet. Add it under the module.
                </p>
                <div className="flex flex-wrap items-center gap-2 max-sm:flex-col max-sm:items-stretch">
                  <Button size="action">Explain the error</Button>
                  <Button size="action" variant="soft">
                    I'll fix it myself
                  </Button>
                </div>
              </ResultCardBody>
            </ResultCard>
            <ResultCard variant="error" className="max-w-lg">
              <ResultCardHeader toggle>
                <CircleX className="text-error" />
                <ResultCardText>
                  <ResultCardTitle>Build failed</ResultCardTitle>
                  <ResultCardMeta>E0412 on line 9</ResultCardMeta>
                </ResultCardText>
              </ResultCardHeader>
              <ResultCardFold>
                <ResultCardBody>
                  <p className="text-[1rem] leading-[1.5rem] font-read text-foreground/80">The Context names a struct that does not exist yet.</p>
                </ResultCardBody>
              </ResultCardFold>
            </ResultCard>
          </More>
          <More label="Deployed, open, with its log open" className="flex-col flex-nowrap items-stretch">
            <Deployed open />
          </More>
        </>
      }
    >
      <BuildSuccessful />
      <Deployed />
      <Confirmed
        instruction="init_player"
        body={<PlayerAccount />}
        text="client.ts ran in 1.6 s and called `init_player`. It used 7,342 compute units, and the fee was 0.000005 test SOL from your wallet."
        log={CALL_LOG}
      />
      <Confirmed
        instruction="hello"
        body={
          <p className="border-l-2 border-success pl-3 font-mono text-code break-words">
            <span className="text-muted-foreground">Program log: </span>
            <span className="text-foreground">Hello, Ada!</span>
          </p>
        }
        text="The Call panel ran in 0.4 s and called `hello`. It used 1,204 compute units, and the fee was 0.000005 test SOL from your wallet."
        log={HELLO_LOG}
      />
    </Block>
  )
}

export { ResultCardBlock }
