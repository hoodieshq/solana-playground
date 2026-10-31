import { TutorialCover } from "@/components/ui/tutorial-cover"

import { Block, More } from "../parts"

function TutorialCoverBlock() {
  return (
    <Block
      id="tutorial-cover"
      title="Tutorial cover"
      source="playground"
      registry="tutorial-cover"
      note="A generated cover for a tutorial that has no picture of its own: one of four brand grounds with soft colour fields, and the mark in white. The ground says the framework (Anchor deep, Native explore, Seahorse violet, anything else haze), or is given outright. Where the mark sits, the play triangle alone or the whole mark, comes from a hash of the name, so the same name always gives the same cover and a wall of them still varies. It is decorative: the card's own title names the tutorial. Hand drawn pixel covers stay pictures, passed to the card as an image."
      more={
        <More label="The four grounds">
          {(["haze", "deep", "explore", "violet"] as const).map((ground) => (
            <div key={ground} className="flex flex-col gap-1.5">
              <TutorialCover name="Hello Solana" ground={ground} className="w-32 rounded-lg" />
              <span className="text-caption text-muted-foreground">{ground}</span>
            </div>
          ))}
        </More>
      }
    >
      <TutorialCover name="Hello Anchor" framework="Anchor" className="w-40 rounded-lg" />
      <TutorialCover name="Counter PDA" framework="Anchor" className="w-40 rounded-lg" />
      <TutorialCover name="Hello Solana" framework="Native" className="w-40 rounded-lg" />
      <TutorialCover name="Faucet" framework="Seahorse" className="w-40 rounded-lg" />
      <TutorialCover name="Tiny Adventure" className="w-40 rounded-lg" />
    </Block>
  )
}

export { TutorialCoverBlock }
