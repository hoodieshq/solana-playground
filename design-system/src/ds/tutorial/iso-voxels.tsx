import { IsoVoxels } from "@/components/ui/iso-voxels"

import { Block } from "../parts"

function IsoVoxelsBlock() {
  return (
    <Block
      id="iso-voxels"
      title="Iso voxels"
      source="playground"
      registry="iso-voxels"
      note="The mark as a voxel sculpture lying on the card, in pixel isometric, shaded from the brand tokens. The tiles rise in on mount, a slow ripple leaves the play triangle and runs out through the ring, and the pointer presses a soft bump up through them. It fills its parent and fades out over the left, where a banner's words are; corner hangs it from the top right corner for a banner the words fill across. It only runs while on screen, and with reduced motion it paints its rest once. A canvas is empty in a snapshot, so a flat still of the resting tiles is drawn as SVG under it."
      className="grid gap-3 md:grid-cols-[2fr_1fr]"
    >
      <div className="relative isolate h-60 overflow-hidden rounded-card border border-border bg-surface-panel">
        <IsoVoxels />
      </div>
      <div className="relative isolate h-60 overflow-hidden rounded-card border border-border bg-surface-panel">
        <IsoVoxels corner />
      </div>
    </Block>
  )
}

export { IsoVoxelsBlock }
