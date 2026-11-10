import { useState } from "react"
import { toast } from "sonner"
import { ChevronLeft, Ellipsis } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

import { LESSON } from "../data"
import { openShortcuts } from "../settings/open"
import { useStore } from "../store"
import { ChatComposer } from "../ui/ChatComposer"
import { Conversation, type Jump } from "../ui/Conversation"
import { StartOverDialog } from "../ui/StartOverDialog"
import { StepBar } from "../ui/StepBar"
import { Column } from "./Column"
import { setPinned, usePins } from "./navLit/pins"

/** The chat column, top to bottom (spec 4.3): the head with the way back to Tutorials, the title and
 * ⋯; the step bar, whose segments are anchors into the conversation; the conversation; the chips
 * and the one composer */
export function ChatColumn({ jump, onPick, viewing, onViewing }: { jump: Jump; onPick: (step: number) => void; viewing: number | null; onViewing: (step: number | null) => void }) {
  const { dispatch } = useStore()
  const [startOver, setStartOver] = useState(false)
  const pinned = !!usePins()[LESSON.card.name]
  return (
    <Column label="Assistant">
      <div className="flex h-11 shrink-0 items-center gap-1 border-b border-border pr-1.5 pl-1.5">
        <Button variant="ghost" size="sm" className="gap-0.5 pl-1.5 text-muted-foreground" onClick={() => dispatch({ type: "open", screen: "gallery" })}>
          <ChevronLeft className="size-4" />
          Tutorials
        </Button>
        <h1 className="ml-2 min-w-0 flex-1 truncate text-[0.875rem] text-foreground">{LESSON.card.name}</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="More" className="text-muted-foreground">
              <Ellipsis />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-48">
            {/* As the program's ⋯: the nav keeps only what you pin */}
            <DropdownMenuItem
              onSelect={() => {
                setPinned(LESSON.card.name, !pinned)
                toast(pinned ? "Unpinned from the sidebar" : "Pinned to the sidebar")
              }}
            >
              {pinned ? "Unpin from sidebar" : "Pin to sidebar"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setStartOver(true)}>Start over…</DropdownMenuItem>
            <DropdownMenuItem onSelect={openShortcuts}>Keyboard shortcuts</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <StepBar viewing={viewing} onPick={onPick} />
      <Conversation jump={jump} onViewing={onViewing} />
      <ChatComposer />
      <StartOverDialog open={startOver} onOpenChange={setStartOver} />
    </Column>
  )
}
