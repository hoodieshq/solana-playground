import { Folder } from "lucide-react"

import { BrandIcon } from "@/components/ui/brand-icon"
import { PhoneBar, PhoneBarStart } from "@/components/ui/phone-bar"
import {
  PhoneNav,
  PhoneNavBody,
  PhoneNavClose,
  PhoneNavContent,
  PhoneNavFooter,
  PhoneNavGroup,
  PhoneNavItem,
  PhoneNavTrigger,
} from "@/components/ui/phone-nav"

import { Block } from "../parts"

const PROJECTS = ["Counter", "Token Faucet", "Hello Anchor"]

/* The open layer's insides, shared by the live nav and the still frame */
function Rows() {
  return (
    <>
      <PhoneNavBody>
        <PhoneNavGroup>
          <PhoneNavItem size="lg" icon={<BrandIcon name="home" />}>Home</PhoneNavItem>
          <PhoneNavItem size="lg" icon={<BrandIcon name="new" />}>New project</PhoneNavItem>
          <PhoneNavItem size="lg" icon={<BrandIcon name="tutorial" />} current>
            Tutorials
          </PhoneNavItem>
          <PhoneNavItem size="lg" icon={<BrandIcon name="programs" />}>Programs</PhoneNavItem>
        </PhoneNavGroup>
        <PhoneNavGroup label="Projects">
          {PROJECTS.map((name) => (
            <PhoneNavItem key={name} icon={<Folder strokeWidth={1.5} />}>
              {name}
            </PhoneNavItem>
          ))}
        </PhoneNavGroup>
      </PhoneNavBody>
      <PhoneNavFooter>
        <PhoneNavItem icon={<span className="size-2 rounded-full bg-success" />}>Devnet</PhoneNavItem>
        <PhoneNavItem icon={<BrandIcon name="profile" />}>Sign in</PhoneNavItem>
      </PhoneNavFooter>
    </>
  )
}

function PhoneNavBlock() {
  return (
    <Block
      id="phone-nav"
      title="Phone nav"
      source="playground"
      registry="phone-nav"
      note="The product's navigation on a phone. The menu button opens the sidebar's rows over the whole screen, and the X lands on the menu button's own spot, so the same tap closes it. Destinations at lg, then a labelled group such as projects, then the network and the account on one row over the home indicator. The groups drop in 40ms apart; with reduced motion only the fade is left. Choosing a row closes the layer, and the current page is marked with aria-current. Open it from the menu button; the frame beside it is the layer held open."
      className="items-start"
    >
      <PhoneNav>
        <PhoneNavTrigger />
        <PhoneNavContent>
          <Rows />
        </PhoneNavContent>
      </PhoneNav>
      {/* The layer as it looks open, held still in a phone's frame */}
      <PhoneNav>
        <div className="flex h-[34rem] w-[22rem] max-w-full flex-col overflow-hidden rounded-xl border border-border bg-surface-base text-foreground">
          <PhoneBar>
            <PhoneBarStart>
              <PhoneNavClose />
            </PhoneBarStart>
          </PhoneBar>
          <Rows />
        </div>
      </PhoneNav>
    </Block>
  )
}

export { PhoneNavBlock }
