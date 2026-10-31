import * as React from "react"
import { FolderTree, Send, Terminal } from "lucide-react"

import { ToolButton } from "@/components/ui/tool-button"

import { Block } from "../parts"

function ToolButtonBlock() {
  const [terminal, setTerminal] = React.useState(true)
  const [call, setCall] = React.useState(false)
  return (
    <Block
      id="tool-button"
      title="Tool button"
      source="playground"
      registry="tool-button"
      note="A tool at a bar's end, as Claude Code draws its tools: the glyph alone at 18px with a 1.5 stroke in a ghost square, lit while its panel is open, the name and the key in a raised tip. pressed sets aria-pressed; leave it out for a tool that only acts. The glyph goes in as children."
    >
      <div className="flex items-center gap-0.5 rounded-lg border border-border bg-surface-base p-1">
        <ToolButton label="Files" shortcut="⌘P">
          <FolderTree />
        </ToolButton>
        <ToolButton label="Call" shortcut="⌘I" pressed={call} onClick={() => setCall(!call)}>
          <Send />
        </ToolButton>
        <ToolButton label="Terminal" shortcut="⌘J" pressed={terminal} onClick={() => setTerminal(!terminal)}>
          <Terminal />
        </ToolButton>
      </div>
    </Block>
  )
}

export { ToolButtonBlock }
