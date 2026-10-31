import { CopyButton } from "@/components/ui/copy-button"
import { KeyRow, KeyRowActions, KeyRowLabel, KeyRowLink, KeyRowValue } from "@/components/ui/key-row"

import { Block, More } from "../parts"

const PROGRAM_ID = "7Hq5vRw1yJmZ9bX3cDfE8sLkT2nA4uPqWe6oGhK1Xk2P"
const SIGNATURE = "5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW"

function KeyRowBlock() {
  return (
    <Block
      id="key-row"
      title="Key row"
      source="playground"
      registry="key-row"
      note="A key a run leaves behind, a program id or a signature, in one line: its label, the key cut to six and six, Copy and the Explorer link. The whole key is the value's title, and what Copy copies."
      className="block"
      more={
        <>
          <More label="On a narrow card: the label over the key, the link an icon" className="block">
            <KeyRow className="w-72">
              <KeyRowLabel>Transaction</KeyRowLabel>
              <KeyRowValue value={SIGNATURE} />
              <KeyRowActions>
                <CopyButton value={SIGNATURE} label="Copy the signature" />
                <KeyRowLink href="https://explorer.solana.com/?cluster=devnet" />
              </KeyRowActions>
            </KeyRow>
          </More>
          <More label="flat, inside a card that has its own box" className="block">
            <div className="max-w-md rounded-panel border border-border bg-surface-panel py-1">
              <KeyRow flat className="px-3">
                <KeyRowLabel>Program id</KeyRowLabel>
                <KeyRowValue value={PROGRAM_ID} />
                <KeyRowActions>
                  <CopyButton value={PROGRAM_ID} label="Copy the program id" />
                  <KeyRowLink href="https://explorer.solana.com/?cluster=devnet" />
                </KeyRowActions>
              </KeyRow>
            </div>
          </More>
          <p className="mt-4 max-w-2xl text-caption text-muted-foreground">
            The row is its own container: under 20rem the label goes over the key and the link keeps only its icon, its word kept for a screen reader. Under a finger Copy and the link are 44px squares, pulled into the row so it keeps its height. shortKey(key, head, tail) is exported for the same cut anywhere else.
          </p>
        </>
      }
    >
      <div className="grid max-w-md gap-3">
        <KeyRow>
          <KeyRowLabel>Program id</KeyRowLabel>
          <KeyRowValue value={PROGRAM_ID} />
          <KeyRowActions>
            <CopyButton value={PROGRAM_ID} label="Copy the program id" />
            <KeyRowLink href="https://explorer.solana.com/?cluster=devnet" />
          </KeyRowActions>
        </KeyRow>
        <KeyRow>
          <KeyRowLabel>Transaction</KeyRowLabel>
          <KeyRowValue value={SIGNATURE} />
          <KeyRowActions>
            <CopyButton value={SIGNATURE} label="Copy the signature" />
            <KeyRowLink href="https://explorer.solana.com/?cluster=devnet" />
          </KeyRowActions>
        </KeyRow>
      </div>
    </Block>
  )
}

export { KeyRowBlock }
