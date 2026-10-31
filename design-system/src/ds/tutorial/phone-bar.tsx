import { ChevronLeft, Ellipsis, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { PhoneBar, PhoneBarEnd, PhoneBarStart, PhoneBarTitle } from "@/components/ui/phone-bar"
import { PhoneNav, PhoneNavTrigger } from "@/components/ui/phone-nav"

import { Block } from "../parts"

/* A phone's width, so the bar is seen at the size it is drawn for */
const FRAME = "w-[22rem] max-w-full overflow-hidden rounded-xl border border-border bg-surface-base"

function PhoneBarBlock() {
  return (
    <Block
      id="phone-bar"
      title="Phone bar"
      source="playground"
      registry="phone-bar"
      note="A phone screen's head, at the phone head height: a 44px slot either side and the title between. After a back button the title follows it; with no start slot the title starts on the content's 16px edge, in line with the cards below. A screen with its own large title leaves the title out and keeps only its buttons. The end slot keeps its place when empty. No rule under it: the large title right below already starts the page."
      className="items-start"
    >
      <div className={FRAME}>
        <PhoneBar>
          <PhoneBarStart>
            <Button variant="ghost" size="icon" className="size-11" aria-label="Back">
              <ChevronLeft strokeWidth={1.75} className="size-6" />
            </Button>
          </PhoneBarStart>
          <PhoneBarTitle>Hello Anchor</PhoneBarTitle>
          <PhoneBarEnd>
            <Button variant="ghost" size="icon" className="size-11" aria-label="More">
              <Ellipsis strokeWidth={1.75} className="size-6" />
            </Button>
          </PhoneBarEnd>
        </PhoneBar>
      </div>
      <div className={FRAME}>
        <PhoneBar>
          <PhoneBarTitle>Tutorials</PhoneBarTitle>
          <PhoneBarEnd>
            <Button variant="ghost" size="icon" className="size-11" aria-label="Search">
              <Search strokeWidth={1.75} className="size-5" />
            </Button>
          </PhoneBarEnd>
        </PhoneBar>
      </div>
      <div className={FRAME}>
        <PhoneBar>
          <PhoneBarStart>
            <PhoneNav>
              <PhoneNavTrigger />
            </PhoneNav>
          </PhoneBarStart>
          <PhoneBarEnd />
        </PhoneBar>
      </div>
    </Block>
  )
}

export { PhoneBarBlock }
