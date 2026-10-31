import { BrandButton, BrandButtonIcon } from "@/components/ui/brand-button"

import { Block } from "../parts"

function BrandButtonUpdateBlock() {
  return (
    <Block
      id="brand-button-update"
      title="Brand button: beam"
      source="playground"
      registry="brand-button"
      note="hover=beam is the gallery's Start. Under the pointer the ring does not fill: a beam of light runs once round it, in Solana's two colours. A press still fills. With reduced motion there is no beam and the ring fills as before. Next to it, the default for comparison."
    >
      <BrandButton>
        Start building
        <BrandButtonIcon />
      </BrandButton>
      <BrandButton hover="beam">
        Start building
        <BrandButtonIcon />
      </BrandButton>
      <BrandButton hover="beam" className="px-5 pointer-coarse:h-11">
        Start
      </BrandButton>
    </Block>
  )
}

export { BrandButtonUpdateBlock }
