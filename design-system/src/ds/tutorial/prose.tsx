import { InlineCode, Prose } from "@/components/ui/prose"

import { Block, More } from "../parts"

// The tutorial's reading scale: 16/24 at weight 320, a step under the headings' white
const READ = "max-w-md text-[16px] leading-6 font-read text-foreground/80"
// A side note: 13 on a 20 line, where the small chip fits without pushing the lines apart
const NOTE = "max-w-md text-[13px] leading-5 text-muted-foreground"

function ProseBlock() {
  return (
    <Block
      id="prose"
      title="Prose"
      source="playground"
      registry="prose"
      note="A line of a lesson's text as a person types it: words in backticks become InlineCode chips, [words](address) and bare addresses become links. It is safe while the text types out, so a link half written shows only its words. One line of inline text for cards, options and reasons, not Markdown: the assistant panel's long answers keep their own renderer. The chip has no colour of its own, a darker ground with a faint ring and the text's ink, so it reads on any surface and never outshines a heading. Its sizes are fixed pixels: mono 14 for 16px text, size small (mono 12) for 13px notes on a 20 line. Before a stop or a comma it keeps 2px clear."
      className="flex-col flex-nowrap items-start gap-4"
      more={
        <More label="While it types, a link half written shows only its words" className="flex-col flex-nowrap items-start">
          <p className={READ}>
            <Prose text="More in the [Anchor bo" />
          </p>
          <p className={READ}>
            <Prose text="More in the [Anchor book](https://www.anch" />
          </p>
        </More>
      }
    >
      <p className={READ}>
        <Prose text="Your program keeps its state in an account. `#[account]` marks the struct, and `space` says how many bytes it takes. More in the [Anchor book](https://www.anchor-lang.com/docs)." />
      </p>
      <p className={NOTE}>
        <Prose
          size="small"
          text="A signer pays the fee: `payer = user` names it, and `#[account(init)]` makes the account. See https://solana.com/docs/core/fees."
        />
      </p>
      <p className={READ}>
        Call <InlineCode>hello</InlineCode> with your name, then <InlineCode>greet(&quot;Ada&quot;)</InlineCode> to say hi.
      </p>
    </Block>
  )
}

export { ProseBlock }
