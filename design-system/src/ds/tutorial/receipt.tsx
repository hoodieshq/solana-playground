import * as React from "react"

import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { CopyButton } from "@/components/ui/copy-button"
import {
  Receipt,
  ReceiptAnswer,
  ReceiptBody,
  ReceiptCall,
  ReceiptFooter,
  ReceiptGroup,
  ReceiptKey,
  ReceiptLine,
  ReceiptLink,
  ReceiptMeta,
  ReceiptNote,
  ReceiptRow,
  ReceiptTitle,
  ReceiptToggle,
} from "@/components/ui/receipt"
import { shortKey } from "@/components/ui/key-row"

import { Block, More } from "../parts"

const PROGRAM_ID = "7Hq5vRw1yJmZ9bX3cDfE8sLkT2nA4uPqWe6oGhK1Xk2P"
const WALLET = "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin"
const SIGNATURE = "5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW"
const EXPLORER = "https://explorer.solana.com/?cluster=devnet"

/* The receipt as plain text, for Copy: full keys, since nobody can look up a cut one */
const TEXT = [
  "hello_anchor · transaction receipt",
  `Program     hello_anchor (${PROGRAM_ID})`,
  "Instruction initialize",
  `Fee payer   ${WALLET}`,
  "Fee         0.000005 SOL",
  "Log         Hello, Playground",
  `Signature   ${SIGNATURE}`,
].join("\n")

/* The slip. under drops what the answer card above it already says */
function Printed({ print = false, under = false, className }: { print?: boolean; under?: boolean; className?: string }) {
  return (
    <Receipt variant="printed" print={print} aria-label="Transaction receipt" className={cn("w-full max-w-sm", className)}>
      <ReceiptTitle>hello_anchor · devnet</ReceiptTitle>
      <ReceiptMeta>Oct 31, 2026, 12:04 PM</ReceiptMeta>
      <ReceiptGroup>
        <ReceiptRow label="Program">
          hello_anchor <span className="whitespace-nowrap text-muted-foreground">· {shortKey(PROGRAM_ID)}</span>
        </ReceiptRow>
        <ReceiptRow label="Instruction">initialize</ReceiptRow>
      </ReceiptGroup>
      <ReceiptGroup>
        <ReceiptRow label="Fee payer">
          {shortKey(WALLET)} <span className="text-muted-foreground">· your wallet</span>
        </ReceiptRow>
        <ReceiptRow label="Fee">0.000005 SOL</ReceiptRow>
        <ReceiptRow label="Compute">2,145 CU</ReceiptRow>
        <ReceiptRow label="Confirmed">~0.4 s</ReceiptRow>
      </ReceiptGroup>
      {!under && (
        <ReceiptGroup>
          <ReceiptRow label="Log">Hello, Playground</ReceiptRow>
        </ReceiptGroup>
      )}
      <ReceiptGroup>
        <ReceiptRow label="Signature">
          <ReceiptKey value={SIGNATURE} />
        </ReceiptRow>
      </ReceiptGroup>
      <ReceiptNote>Example values on devnet</ReceiptNote>
      {!under && (
        <ReceiptFooter>
          <CopyButton value={TEXT} label="Copy the receipt as text" />
          <ReceiptLink href={EXPLORER}>Explorer</ReceiptLink>
        </ReceiptFooter>
      )}
    </Receipt>
  )
}

function Compact({ print = false }: { print?: boolean }) {
  return (
    <Receipt variant="compact" print={print} aria-label="Transaction" className="w-full max-w-md">
      <ReceiptLine>
        <ReceiptKey value={SIGNATURE} />
        <CopyButton value={SIGNATURE} label="Copy the signature" />
        <ReceiptLink href={EXPLORER} />
      </ReceiptLine>
      <ReceiptLine>fee 0.000005 SOL from your wallet</ReceiptLine>
    </Receipt>
  )
}

function Answer({ open, onOpenChange }: { open?: boolean; onOpenChange?: (open: boolean) => void }) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange} className="flex w-full max-w-sm flex-col gap-3">
      <Receipt variant="answer" aria-label="Your last transaction">
        <ReceiptBody>
          <ReceiptCall>hello("Ada") returned</ReceiptCall>
          <ReceiptAnswer>Hello, Ada!</ReceiptAnswer>
          <ReceiptGroup>
            <ReceiptRow label="You paid">
              <span className="block font-medium">0.000005 SOL</span>
              <span className="block text-subtle">Devnet SOL, free test money</span>
            </ReceiptRow>
          </ReceiptGroup>
        </ReceiptBody>
        <ReceiptFooter>
          <CollapsibleTrigger asChild>
            <ReceiptToggle>
              Transaction <span className="font-mono">{shortKey(SIGNATURE)}</span>
            </ReceiptToggle>
          </CollapsibleTrigger>
          <CopyButton value={TEXT} label="Copy the receipt" />
          <ReceiptLink href={EXPLORER} />
        </ReceiptFooter>
      </Receipt>
      <CollapsibleContent>
        <Printed under print />
      </CollapsibleContent>
    </Collapsible>
  )
}

function ReceiptBlock() {
  const [run, setRun] = React.useState(0)
  const [open, setOpen] = React.useState(true)
  return (
    <Block
      id="receipt"
      title="Receipt"
      source="playground"
      registry="receipt"
      note="What a transaction leaves behind, in the order a newcomer asks: what the program said, who paid, then the rest. printed is a slip in mono with dashed rules and a torn foot; compact is the signature with Copy and Explorer, then the fee, in quiet 14/18 lines that go under each other whole rather than cut; answer is the proof at size, with a foot that opens the slip under it. The result card no longer carries compact lines or prints them in: its details say the same in one sentence (ResultDetails)."
      className="grid items-start gap-6 md:grid-cols-2"
      more={
        <>
          <More label="print: the lines come out one by one" className="block">
            <div className="flex flex-col gap-4">
              <Button variant="outline" size="sm" className="w-fit" onClick={() => setRun(run + 1)}>
                Print again
              </Button>
              <div key={run} className="grid items-start gap-6 md:grid-cols-[1fr_1fr]">
                <Printed print />
                <Compact print />
              </div>
            </div>
          </More>
          <More label="answer, opened: the slip under it drops the rows the card already says" className="block">
            <Answer open={open} onOpenChange={setOpen} />
          </More>
          <p className="mt-4 max-w-2xl text-caption text-muted-foreground">
            print is read once, as the receipt mounts, so a render above it never stops it halfway; key the receipt by its transaction so it prints once. Each line is 200ms, 60ms after the one before. With reduced motion the lines are simply there. Copy is a CopyButton: give it the receipt as plain text with full keys, not the cut ones. ReceiptLink is the Explorer link, with words on the slip and an icon elsewhere. Under a finger Copy and Explorer are 44px squares.
          </p>
        </>
      }
    >
      <Printed className="md:row-span-2" />
      <Answer />
      <Compact />
    </Block>
  )
}

export { ReceiptBlock }
