import * as React from "react"
import { Lightbulb, PenLine } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Prose } from "@/components/ui/prose"
import {
  Quiz,
  QuizActions,
  QuizOption,
  QuizOptionReason,
  QuizOptions,
  QuizRecord,
  QuizRecordContent,
  QuizRecordOption,
  QuizRecordQuestion,
  QuizRecordTrigger,
  QuizTitle,
} from "@/components/ui/quiz"

import { Block, More } from "../parts"

const QUESTION = "Which account pays for `initialize`?"
const OPTIONS = ["The program", "The signer, `user`", "The system program"]
const WHY = ["A program holds no SOL to pay with; it only runs.", "", "It creates the account, but someone has to fund it."]
const ANSWER = 1

function Actions({ onHint, onSkip }: { onHint?: () => void; onSkip?: () => void }) {
  return (
    <QuizActions>
      <Button variant="ghost" size="sm" className="text-muted-foreground">
        <PenLine />
        Type it myself
      </Button>
      <Button variant="ghost" size="sm" className="ml-auto text-subtle hover:text-muted-foreground" onClick={onHint}>
        <Lightbulb />
        Hint
      </Button>
      <Button variant="ghost" size="sm" className="text-subtle hover:text-muted-foreground" onClick={onSkip}>
        Skip
      </Button>
    </QuizActions>
  )
}

/* A stand in for the chat panel: the text column inset 20 from its edges (16
   on a phone), the line the card answers, and the card 40 under it */
function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-[440px] rounded-panel border border-border bg-background px-5 py-6 max-sm:px-4">
      <p className="text-[1rem] leading-6 text-foreground/80">
        <Prose text="The account pays rent to exist, and someone signs for it. Check what you read:" />
      </p>
      <div className="mt-10">{children}</div>
    </div>
  )
}

const LONG = "await pg.program.methods.initialize().accounts({ user: pg.wallet.publicKey }).rpc()"

/* Try it: pick a wrong one, then the right one, and it folds to its record */
function QuizDemo() {
  const [picks, setPicks] = React.useState<number[]>([])
  const [right, setRight] = React.useState(false)
  const [done, setDone] = React.useState<"right" | "skipped" | null>(null)
  const timer = React.useRef<number | undefined>(undefined)
  React.useEffect(() => () => window.clearTimeout(timer.current), [])

  const pick = (value: string) => {
    const i = Number(value)
    if (i === ANSWER) {
      setRight(true)
      timer.current = window.setTimeout(() => setDone("right"), 500)
    } else setPicks((p) => [...p, i])
  }
  const reset = () => {
    setPicks([])
    setRight(false)
    setDone(null)
  }

  if (done)
    return (
      <div className="flex flex-col gap-2">
        <QuizRecord status={done}>
          <QuizRecordTrigger label="Q1" meta={done === "skipped" ? "skipped" : picks.length ? "2nd try" : "first try"}>
            {OPTIONS[ANSWER]}
          </QuizRecordTrigger>
        </QuizRecord>
        <Button variant="quiet" size="sm" className="self-start" onClick={reset}>
          Ask again
        </Button>
      </div>
    )

  const left = OPTIONS.map((_, i) => i).filter((i) => !picks.includes(i))
  return (
    <Quiz bleed onPick={pick} onSkip={() => setDone("skipped")}>
      <QuizTitle>
        <Prose text={QUESTION} size="large" />
      </QuizTitle>
      <QuizOptions>
        {OPTIONS.map((option, i) => {
          const wrong = picks.includes(i)
          return (
            <QuizOption
              key={option}
              value={String(i)}
              status={right && i === ANSWER ? "right" : wrong ? "wrong" : picks.length === 2 && left[0] === i ? "suggested" : "idle"}
            >
              <Prose text={option} />
              {wrong && WHY[i] && (
                <QuizOptionReason>
                  <strong>Not quite.</strong> <Prose text={WHY[i]} size="small" />
                </QuizOptionReason>
              )}
            </QuizOption>
          )
        })}
      </QuizOptions>
      <Actions onSkip={() => setDone("skipped")} />
    </Quiz>
  )
}

function QuizBlock() {
  return (
    <Block
      id="quiz"
      title="Quiz"
      source="playground"
      registry="quiz"
      note="The card a lesson waits on: a question 18/26 and a few options, ringed in Solana's gradient while it waits. A right pick lights green; hold it half a second, then fold the card to its QuizRecord. A wrong one turns red with one line of why on a 20px line, read out once, shakes and stays; the focus moves to the next open option, and after two misses suggested lights the one left. The component does not know the answer: onPick says what was picked and the statuses come back as props. With hotkeys (one card at a time) keys 1 to 9 pick, S skips, H asks for the hint; the arrows always move between options. Words are 16/24; code sets an option in mono 14/24 in one colour (no syntax colours, they read as hints), breaking before a dot. bleed steps the card out of a 20px column to 8px from the panel's edge; stand it 40 under the text over it. The record's line clips its answer by whole words and chips, never mid token; pass the answer as a string, with code for a line of code. The first card here can be tried."
      className="flex-col flex-nowrap items-stretch gap-6"
      more={
        <More label="The record opened, and a record on its own" className="flex-col flex-nowrap items-stretch">
          <QuizRecord status="right" defaultOpen className="max-w-[400px]">
            <QuizRecordTrigger label="Q2" meta="2nd try" code>
              {"#[account(init, payer = user, space = 8 + 32)]"}
            </QuizRecordTrigger>
            <QuizRecordContent>
              <QuizRecordQuestion>Which line pays for the new account?</QuizRecordQuestion>
              <QuizRecordOption index={1} status="wrong" code>
                {"#[account(mut)]\npub user: Signer<'info>,"}
                <QuizOptionReason>
                  <Prose text="`mut` lets it pay, but nothing here says it does." size="small" />
                </QuizOptionReason>
              </QuizRecordOption>
              <QuizRecordOption index={2} status="right" code>
                {"#[account(init, payer = user, space = 8 + 32)]"}
              </QuizRecordOption>
              <QuizRecordOption index={3} code>
                {"pub system_program: Program<'info, System>,"}
              </QuizRecordOption>
            </QuizRecordContent>
          </QuizRecord>
          <QuizRecord status="skipped" className="max-w-[400px]">
            <QuizRecordTrigger label="Q3" meta="skipped">
              {"It is rent exempt once it holds two years of rent"}
            </QuizRecordTrigger>
          </QuizRecord>
        </More>
      }
    >
      <Panel>
        <QuizDemo />
      </Panel>
      <Panel>
        <Quiz bleed>
          <QuizTitle>
            <Prose text="Which line sends the transaction?" size="large" />
          </QuizTitle>
          <QuizOptions>
            <QuizOption value="0" code status="wrong">
              {"pg.program.methods.initialize()"}
              <QuizOptionReason>
                <strong>Not quite.</strong> <Prose text="That builds the call; nothing goes out until `rpc()`." size="small" />
              </QuizOptionReason>
            </QuizOption>
            <QuizOption value="1" code>
              {LONG}
            </QuizOption>
            <QuizOption value="2" code>
              {"console.log(pg.wallet.publicKey.toString())"}
            </QuizOption>
          </QuizOptions>
          <Actions />
        </Quiz>
      </Panel>
      <div className="flex w-full max-w-[400px] flex-col gap-2">
        <QuizRecord status="right">
          <QuizRecordTrigger label="Q4" meta="2nd try" code>
            {LONG}
          </QuizRecordTrigger>
        </QuizRecord>
        <QuizRecord status="right">
          <QuizRecordTrigger label="Q1" meta="first try">
            {"The signer, `user`, who funds it from the wallet"}
          </QuizRecordTrigger>
        </QuizRecord>
      </div>
    </Block>
  )
}

export { QuizBlock }
