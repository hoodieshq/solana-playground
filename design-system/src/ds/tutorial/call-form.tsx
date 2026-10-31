import * as React from "react"
import { Zap } from "lucide-react"

import { CallForm, type CallFormIdlShape, type CallFormResult } from "@/components/ui/call-form"
import { Meter, MeterLabel, MeterTrack, MeterValue } from "@/components/ui/meter"

import { Block, More } from "../parts"

const ADDRESS = "Hc3fP1yX9Qm8w4bTqVnZ2kLr7sJdA6eGuR5oCiN1MhEt"

const HELLO: CallFormIdlShape = {
  address: ADDRESS,
  metadata: { name: "hello_anchor", version: "0.1.0", spec: "0.1.0" },
  instructions: [{ name: "hello", args: [{ name: "name", type: "string" }], accounts: [] }],
}

const GAME: CallFormIdlShape = {
  address: ADDRESS,
  metadata: { name: "lumberjack", version: "0.1.0", spec: "0.1.0" },
  instructions: [
    {
      name: "init_player",
      args: [],
      accounts: [
        { name: "player", writable: true, pda: { seeds: [] } },
        { name: "signer", writable: true, signer: true },
        { name: "system_program", address: "11111111111111111111111111111111" },
      ],
    },
    {
      name: "chop_tree",
      args: [
        { name: "trees", type: "u8" },
        { name: "note", type: { option: "string" } },
      ],
      accounts: [
        { name: "player", writable: true },
        { name: "signer", signer: true },
      ],
    },
  ],
}

const CONFIRMED: CallFormResult = {
  status: "confirmed",
  log: "Program log: Hello, Ada",
  meta: "Fee 0.000005 SOL from your wallet",
  explorerHref: "https://explorer.solana.com/?cluster=devnet",
  source: "lib.rs:9",
}

function CallFormMore() {
  return (
    <>
      <More label="Several instructions, accounts, a refused call" className="block">
        <div className="max-w-2xl overflow-hidden rounded-xl border border-border bg-surface-base">
          <CallForm
            idl={GAME}
            defaultInstruction="chop_tree"
            defaultValues={{ chop_tree: { args: { trees: "1" }, accounts: { player: "8kTnq2vW3ZbX7yL4mP9cRfD5hJ6sA1eG2uK3oN4iM5tQ" } } }}
            fresh={["chop_tree"]}
            result={{
              status: "failed",
              log: "Error 6000: NotEnoughEnergy. Not enough energy.",
              explorerHref: "https://explorer.solana.com/?cluster=devnet",
              children: (
                <Meter value={0} max={5} alertEmpty className="mt-1">
                  <MeterLabel>
                    <Zap aria-hidden="true" />
                    Energy
                  </MeterLabel>
                  <MeterTrack />
                  <MeterValue />
                </Meter>
              ),
            }}
          />
        </div>
      </More>
      <More label="Sending, a note over a blocked Call, and before any deploy" className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="h-80 overflow-hidden rounded-xl border border-border bg-surface-base">
          <CallForm idl={HELLO} defaultValues={{ hello: { args: { name: "Ada" } } }} result={{ status: "sending" }} />
        </div>
        <div className="h-80 overflow-hidden rounded-xl border border-border bg-surface-base">
          <CallForm idl={GAME} defaultInstruction="init_player" note="Your player already exists. init makes an account once, so a second call would fail." />
        </div>
        <div className="h-80 overflow-hidden rounded-xl border border-border bg-surface-base">
          <CallForm idl={null} />
        </div>
      </More>
    </>
  )
}

function CallFormBlock() {
  const [result, setResult] = React.useState<CallFormResult | undefined>(CONFIRMED)
  const [sent, setSent] = React.useState("Ada")
  const [name, setName] = React.useState("Ada")
  return (
    <Block
      id="call-form"
      title="Call form"
      source="playground"
      registry="call-form"
      className="grid grid-cols-1 gap-3 lg:grid-cols-2"
      more={<CallFormMore />}
      note="A program's instructions as a form drawn from its IDL. Form | IDL swaps the form for the JSON it is drawn from, with Copy. One instruction at a time, picked from chips; the signature heads the request in syntax colours, with the client line that makes the same call under it. A field per argument and per account the caller gives (a signer is your wallet, a fixed or derived address is only said), a note over Call when it can't go, and under it what came back: Sending, then Confirmed or Failed with the program's words. Pass the IDL and onCall; result, note and stale come from you. Under 30rem of its own width the client line takes two lines and Call the full width."
    >
      <div className="h-[26rem] overflow-hidden rounded-xl border border-border bg-surface-base">
        <CallForm
          idl={HELLO}
          values={{ args: { name }, accounts: {} }}
          onValuesChange={(_, v) => setName(v.args.name ?? "")}
          onCall={(_, v) => {
            setResult({ status: "sending" })
            setTimeout(() => {
              setSent(v.args.name ?? "")
              setResult({ ...CONFIRMED, log: `Program log: Hello, ${v.args.name}` })
            }, 900)
          }}
          result={result}
          stale={name !== sent ? `Last call, with name ${JSON.stringify(sent)}` : undefined}
        />
      </div>
      <div className="h-[26rem] overflow-hidden rounded-xl border border-border bg-surface-base">
        <CallForm idl={HELLO} defaultView="idl" />
      </div>
    </Block>
  )
}

export { CallFormBlock }
