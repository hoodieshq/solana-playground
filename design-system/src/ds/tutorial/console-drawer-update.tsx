import {
  ConsoleDrawer,
  ConsoleDrawerBar,
  ConsoleDrawerContent,
  ConsoleDrawerHandle,
  ConsoleDrawerStatus,
} from "@/components/ui/console-drawer"
import { StatusDot } from "@/components/ui/status-dot"
import { Terminal, TerminalLine } from "@/components/ui/terminal"

import { Block } from "../parts"

function ConsoleDrawerUpdateBlock() {
  return (
    <Block
      id="console-drawer-update"
      title="Console drawer: drag to resize"
      source="playground"
      registry="console-drawer"
      note="Given a height or a defaultHeight, the well's top edge drags between minHeight (120 px) and maxHeight (60% of the drawer's parent): put ConsoleDrawerHandle first inside the content. 9 px to take hold of, a hairline that lights under the pointer and while held. The arrow keys move it by 16, Shift for 64, Home and End to the bounds."
      className="block"
    >
      <div className="flex h-96 max-w-2xl flex-col justify-end overflow-hidden rounded-xl border border-border">
        <ConsoleDrawer defaultOpen hotkey={null} defaultHeight={180}>
          <ConsoleDrawerBar>
            <ConsoleDrawerStatus className="flex-1">
              <StatusDot variant="success" />
              Deployed in 4.2 s
            </ConsoleDrawerStatus>
          </ConsoleDrawerBar>
          <ConsoleDrawerContent className="relative overscroll-contain">
            <ConsoleDrawerHandle />
            <Terminal className="rounded-none border-0">
              <TerminalLine variant="prompt">deploy</TerminalLine>
              <TerminalLine>Program Id: 7Hq5vRw1yJmZ9bX3cDfE8sLkT2nA4uPqWe6oGhK1Xk2P</TerminalLine>
              <TerminalLine variant="success">Deploy success</TerminalLine>
            </Terminal>
          </ConsoleDrawerContent>
        </ConsoleDrawer>
      </div>
    </Block>
  )
}

export { ConsoleDrawerUpdateBlock }
