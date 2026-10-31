import { ResultDetails } from "@/components/ui/result-details"

import { Block } from "../parts"

const SIGNATURE = "5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW"
const PROGRAM_ID = "9hJqVkR3mWb7sTnYp2aXcL5dF8gH1jE4uK6oQzWxCvB"

function ResultDetailsBlock() {
  return (
    <Block
      id="result-details"
      title="Result details"
      source="playground"
      registry="result-details"
      note="What opens under a result, said the way the assistant would: one sentence in the reading text with the key in a code chip, then one row of quiet 14/18 controls that never wraps: Copy (Copied for 1.6 s), Explorer, and Log pushed right. The log opens 12 below in a dark well, mono 12 on a 20 line, lines kept whole and scrolling with a fade at the edge; Open terminal sits at its top right on a desktop. Under a finger the controls are 44 tall. Without copy the row holds only Log."
      className="flex-col flex-nowrap items-stretch gap-6"
    >
      <ResultDetails
        className="max-w-md"
        text="client.ts ran in 1.6 s and called `init_player`. It used 7,342 compute units, and the fee was 0.000005 test SOL from your wallet."
        copy={{ label: "Copy signature", value: SIGNATURE }}
        explorer="https://explorer.solana.com/?cluster=devnet"
        onOpenTerminal={() => {}}
        defaultLogOpen
        log={[
          `Program ${PROGRAM_ID} invoke [1]`,
          "Program log: Instruction: InitPlayer",
          `Program ${PROGRAM_ID} consumed 7342 of 200000 compute units`,
          `Program ${PROGRAM_ID} success`,
        ]}
      />
    </Block>
  )
}

export { ResultDetailsBlock }
