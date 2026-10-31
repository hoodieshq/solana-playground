import { StepHeading, StepHeadingTitle } from "@/components/ui/step-heading"

import { Block } from "../parts"

/* The assistant's reading text, as the feed sets it */
const READ = "text-[1rem] leading-[1.5rem] font-read tracking-normal text-foreground/80"

function StepHeadingBlock() {
  return (
    <Block
      id="step-heading"
      title="Step heading"
      source="playground"
      registry="step-heading"
      note="Where a step starts in a conversation: its goal as a heading at 24/28, since the step track already names the step. A passed step shows nothing more, the track's segment says it is done. In a feed whose turns stand 24 apart it takes mt-1.5 and -mb-[15px]: 30 above, 9 under, so it belongs to the text it heads. flash lights it once when a step track jumps here (give it a new key to play it again); nothing moves with reduced motion. A jump stops it 22 under the feed's top."
      className="flex-col flex-nowrap items-stretch"
    >
      <div className="flex max-w-lg flex-col gap-6">
        <StepHeading className="-mb-[15px]">
          <StepHeadingTitle>Say hello from your program</StepHeadingTitle>
        </StepHeading>
        <p className={READ}>An Anchor program is a module of instructions. Yours has one, and it prints a greeting to the log.</p>
        <p className={READ}>Build it, and the log shows what the compiler made of it.</p>
        <StepHeading flash className="mt-1.5 -mb-[15px]">
          <StepHeadingTitle>Deploy it to devnet</StepHeadingTitle>
        </StepHeading>
        <p className={READ}>A deploy puts the program on devnet at an address of its own, paid for from your test wallet.</p>
      </div>
    </Block>
  )
}

export { StepHeadingBlock }
