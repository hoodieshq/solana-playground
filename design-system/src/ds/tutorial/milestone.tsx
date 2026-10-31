import { Button } from "@/components/ui/button"
import {
  Milestone,
  MilestoneActions,
  MilestoneDescription,
  MilestoneMark,
  MilestoneRecord,
  MilestoneTitle,
} from "@/components/ui/milestone"

import { Block } from "../parts"

function MilestoneBlock() {
  return (
    <Block
      id="milestone"
      title="Milestone"
      source="playground"
      registry="milestone"
      note="A step passed, the moment in the flow: the check's ring draws closed and then its tick, the headline at display size with no full stop, one line of what it means in the reading text, and one way on. Mark to headline 16, headline to line 9, the actions 24 under it on every screen. No frame, it stands in the conversation as the assistant's text does. Once the way on is taken it folds to MilestoneRecord, one line with the time. With reduced motion the mark is simply whole and nothing pops. On a phone the action takes the full width."
      className="flex-col flex-nowrap items-stretch gap-4"
    >
      <Milestone aria-label="Step 2 done" className="max-w-lg">
        <MilestoneMark />
        <MilestoneTitle>Your program is live</MilestoneTitle>
        <MilestoneDescription>Anyone on devnet can call it now, at the address it was deployed to.</MilestoneDescription>
        <MilestoneActions>
          <Button size="action">Next: Call it from a client</Button>
        </MilestoneActions>
      </Milestone>
      <MilestoneRecord meta="41 s" className="max-w-lg">
        <strong>Step 2 done</strong> · Your program is live
      </MilestoneRecord>
    </Block>
  )
}

export { MilestoneBlock }
