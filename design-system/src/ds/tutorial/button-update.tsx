import { ArrowRight, Rocket } from "lucide-react"

import { Button } from "@/components/ui/button"

import { Block, More } from "../parts"

/* Button, as the tutorial's cards use it. Added to the stock file, so the
   button registry item carries them; the default look is untouched. */
function ButtonUpdateBlock() {
  return (
    <Block
      id="button-update"
      title="Button: card actions"
      source="playground"
      registry="button"
      note="What the tutorial's cards add to Button. soft is the second action beside the filled one: a grey fill, no border. quiet is words and an arrow with no box, its padding pulled back so the words line up with the text above. action is a card's size: 40 px in the heading face, 44 under a finger. cta is a phone's: the full width, 48 px."
      more={
        <More label="cta, on a phone's card" className="max-w-sm">
          <Button size="cta">Start</Button>
          <Button size="cta" variant="soft">
            Not now
          </Button>
        </More>
      }
    >
      <Button>Default</Button>
      <Button size="action">
        <Rocket data-icon="inline-start" />
        Deploy
      </Button>
      <Button size="action" variant="soft">
        Explain
      </Button>
      <Button variant="soft">Soft</Button>
      <Button variant="quiet">
        Open again
        <ArrowRight data-icon="inline-end" />
      </Button>
    </Block>
  )
}

export { ButtonUpdateBlock }
