import { Anchor, Rocket } from "lucide-react"

import { Achievement, AchievementLabel, AchievementMedia } from "@/components/ui/achievement"

import { Block } from "../parts"

function AchievementUpdateBlock() {
  return (
    <Block
      id="achievement-update"
      title="Achievement: appear"
      source="playground"
      registry="achievement"
      note="appear is the moment a badge is earned, at a lesson's finish: the disc pops in once, with a glow round it. Nothing moves with reduced motion. Alone, without a label, give it role=img and an aria-label with the badge's name, and w-auto."
    >
      <Achievement>
        <AchievementMedia>
          <Rocket />
        </AchievementMedia>
        <AchievementLabel>First deploy</AchievementLabel>
      </Achievement>
      <Achievement appear>
        <AchievementMedia>
          <Anchor />
        </AchievementMedia>
        <AchievementLabel>Hello, Anchor</AchievementLabel>
      </Achievement>
      <Achievement appear role="img" aria-label="Badge earned: Hello, Anchor" className="w-auto">
        <AchievementMedia>
          <Anchor />
        </AchievementMedia>
      </Achievement>
    </Block>
  )
}

export { AchievementUpdateBlock }
