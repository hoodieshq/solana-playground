import { Files, Terminal } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import { Block } from "../parts"

function TooltipUpdateBlock() {
  return (
    <Block
      id="tooltip-update"
      title="Tooltip: raised"
      source="playground"
      registry="tooltip"
      note="variant=raised is the dark tip, as Claude Code draws it: the raised grey with a hairline and a soft shadow, and a key on the hover grey. It has no arrow unless arrow is set. The default stays shadcn's inverted tip. Point at each to compare."
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline">Default</Button>
        </TooltipTrigger>
        <TooltipContent>Copy the program id</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Files">
            <Files />
          </Button>
        </TooltipTrigger>
        <TooltipContent variant="raised" side="bottom">
          Files
          <Kbd>⌘P</Kbd>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Terminal">
            <Terminal />
          </Button>
        </TooltipTrigger>
        <TooltipContent variant="raised" arrow side="bottom">
          Terminal
          <Kbd>⌘J</Kbd>
        </TooltipContent>
      </Tooltip>
    </Block>
  )
}

export { TooltipUpdateBlock }
