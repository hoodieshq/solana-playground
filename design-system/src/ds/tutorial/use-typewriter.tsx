import * as React from "react"

import { Button } from "@/components/ui/button"
import { useTypewriter } from "@/hooks/use-typewriter"

import { Block } from "../parts"

const REPLY =
  "Your program wrote that line with msg!, and the transaction brought it back in its logs. Change the words in lib.rs, build and deploy again, then call it once more to see the new line."

function Typed({ text }: { text: string }) {
  const typed = useTypewriter(text)
  return (
    <p className="max-w-xl text-body font-read text-foreground" aria-busy={!typed.done}>
      {typed.text}
    </p>
  )
}

function UseTypewriterBlock() {
  const [run, setRun] = React.useState(0)
  return (
    <Block
      id="use-typewriter"
      title="Typewriter"
      source="playground"
      registry="use-typewriter"
      note="useTypewriter(text, { ms, delay, onDone }) types a text out in about half a second however long it is, so a reply reads alive without slowing anyone down. It returns the visible text and done. A text that goes on from what is shown, as a streamed reply does, keeps typing from there; another starts over. With reduced motion it is all there at once."
      className="block"
    >
      <div className="flex flex-col gap-4">
        <Typed key={run} text={REPLY} />
        <Button variant="outline" size="sm" className="w-fit" onClick={() => setRun(run + 1)}>
          Type again
        </Button>
      </div>
    </Block>
  )
}

export { UseTypewriterBlock }
