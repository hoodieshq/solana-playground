import { Play } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

import { LESSON, NAME_MAX, PROGRAM_ID, bytesOf, shortKey } from "../data"
import { useStore, type Turn } from "../store"
import { CallResponse } from "./TestForm"
import { ACTION, ACTION_FILL } from "./type"

type ResultTurn = Extract<Turn, { kind: "result" }>

// Side notes as one string: cn would drop text-caption next to a text colour
const NOTE = "text-caption text-muted-foreground"

/** The Call panel of a program with no IDL (Hello Solana): nothing tells Playground what the program
 * takes, so there is one raw form instead of one per instruction. The program's address is fixed,
 * there are no accounts, and the data is text, shown under the field as the bytes that travel. Send
 * passes the client's step, and with a name the step that reads it, as the chat's cards do */
export function RawCall({ phone = false }: { phone?: boolean }) {
  const { s, dispatch } = useStore()
  const sending = s.phase === "testing"
  const busy = s.phase !== "idle"
  const data = s.testName
  const send = () => {
    if (!busy) dispatch({ type: "test", ix: LESSON.raw?.ix })
  }
  // The latest send only, and only one the program on devnet now answered
  const deployedAt = [...s.thread].reverse().find((t) => t.kind === "result" && t.ok && (t.act === "deploy" || t.act === "buildDeploy"))?.at ?? 0
  const result = [...s.thread].reverse().find((t): t is ResultTurn => t.kind === "result" && t.from === "test")
  const fresh = result && result.at > deployedAt ? result : undefined
  const stale = !!fresh && fresh.sent?.data !== data
  const line = `new web3.TransactionInstruction({ programId: pg.PROGRAM_ID, keys: [], data: Buffer.from(${JSON.stringify(data)}) })`
  const button = (
    <Button disabled={busy} onClick={send} className={cn(ACTION, ACTION_FILL, phone && "h-12 w-full pointer-coarse:h-12")}>
      {sending ? <Spinner /> : <Play className="size-3 fill-current" />}
      {sending ? "Sending" : "Send"}
    </Button>
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className={cn("flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain", phone ? "gap-6 px-4 pt-4 pb-4" : "gap-8 px-6 pt-4 pb-8")}>
        <section aria-label="Request" className="flex w-full max-w-[720px] flex-col gap-4">
          <div className={cn("flex flex-col", phone ? "gap-2 rounded-[12px] bg-foreground/[0.04] p-3" : "mb-2 gap-1")}>
            <h3 className={cn("font-mono font-medium break-words", phone ? "text-[0.875rem] leading-5" : "text-[0.9375rem] leading-[1.35]")}>
              <span className="text-foreground">{LESSON.program}</span>
              <span className="font-normal text-muted-foreground"> · {shortKey(PROGRAM_ID)}</span>
            </h3>
            <p className={NOTE}>No IDL, so no form: one instruction to the program's address, with no accounts and the data you type.</p>
            <p className={NOTE}>
              In code <code className="ml-1 font-mono text-code break-words text-foreground/80">{line}</code>
            </p>
          </div>
          <label className={cn("flex flex-col gap-2", sending && "pointer-events-none opacity-60")}>
            <span className="font-mono text-code text-foreground">data</span>
            <Input
              value={data}
              onChange={(e) => dispatch({ type: "testName", text: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  send()
                }
              }}
              readOnly={sending}
              maxLength={NAME_MAX}
              placeholder="Text, sent as UTF-8"
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              data-bwignore
              data-form-type="other"
              aria-label="data, text sent as UTF-8 bytes"
              className={cn("min-w-0 font-mono", phone ? "h-12 w-full text-base" : "h-10 w-full max-w-[360px] text-[0.8125rem] md:text-[0.8125rem]")}
            />
            <span aria-live="polite" className="font-mono text-[0.75rem] leading-5 text-muted-foreground">
              {bytesOf(data)}
            </span>
          </label>
          {!phone && <div className="mt-2 flex">{button}</div>}
        </section>
        <section aria-label="Response" aria-live="polite" className="flex w-full max-w-[560px] flex-col gap-2">
          {stale && !sending && <p className={NOTE}>Last send, with data {JSON.stringify(fresh?.sent?.data ?? "")}</p>}
          <div className={cn(stale && !sending && "opacity-60")}>
            <CallResponse result={fresh} sending={sending} phone={phone} />
          </div>
        </section>
      </div>
      {phone && <div className="flex shrink-0 flex-col gap-2 border-t border-border px-4 pt-3 pb-[max(var(--safe-bottom),16px)]">{button}</div>}
    </div>
  )
}
