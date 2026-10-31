import { LitGround } from "@/components/ui/lit-ground"

import { Block } from "../parts"

function LitGroundBlock() {
  return (
    <Block
      id="lit-ground"
      title="Lit ground"
      source="playground"
      registry="lit-ground"
      note="The ground the product lays under a page: the brand grid, rising from the foot and gone by the top, and the same grid a little brighter through a soft circle that trails the pointer. It fades when the pointer leaves the window, and a finger never lights it. The light runs on a frame loop that stops once it has caught up. The grid is drawn in the foreground colour, so it reads on paper and in the dark, and the resting grid is plain CSS, so a snapshot keeps it. It fills its parent from behind: give the parent position and isolate. strength scales the grid; lit turns the light off. Move the pointer over the box."
    >
      <div className="relative isolate h-64 w-full overflow-hidden rounded-card border border-border bg-surface-base">
        <LitGround />
      </div>
      <div className="relative isolate h-40 w-full overflow-hidden rounded-card border border-border bg-surface-base">
        <LitGround strength={2} lit={false} />
      </div>
    </Block>
  )
}

export { LitGroundBlock }
