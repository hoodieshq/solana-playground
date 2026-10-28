import { useState } from "react"
import { ChevronLeft, Ellipsis } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Kbd } from "@/components/ui/kbd"

import { LESSON } from "../data"
import { useStore } from "../store"
import { ChatComposer } from "../ui/ChatComposer"
import { Conversation, type Jump } from "../ui/Conversation"
import { StartOverDialog } from "../ui/StartOverDialog"
import { StepBar } from "../ui/StepBar"
import { Column } from "./Column"
import { SHORTCUTS } from "./keys"

/** Every shortcut in one list, from the ⋯ menu */
function ShortcutsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm!">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
        </DialogHeader>
        <dl className="flex flex-col">
          {SHORTCUTS.map((k) => (
            <div key={k.what} className="flex h-9 items-center justify-between gap-4 border-t border-border text-caption first:border-t-0">
              <dt className="text-muted-foreground">{k.what}</dt>
              <dd className="flex gap-1">
                {k.keys.split(" ").map((key) => (
                  <Kbd key={key}>{key}</Kbd>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  )
}

/** The chat column, top to bottom (spec 4.3): the head with the way back to Tutorials, the title and
 * ⋯; the step bar, whose segments are anchors into the conversation; the conversation; the chips
 * and the one composer */
export function ChatColumn({ jump, onPick, viewing, onViewing }: { jump: Jump; onPick: (step: number) => void; viewing: number | null; onViewing: (step: number | null) => void }) {
  const { dispatch } = useStore()
  const [startOver, setStartOver] = useState(false)
  const [keys, setKeys] = useState(false)
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
            <DropdownMenuItem onSelect={() => setStartOver(true)}>Start over…</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setKeys(true)}>Keyboard shortcuts</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <StepBar viewing={viewing} onPick={onPick} />
      <Conversation jump={jump} onViewing={onViewing} />
      <ChatComposer />
      <StartOverDialog open={startOver} onOpenChange={setStartOver} />
      <ShortcutsDialog open={keys} onOpenChange={setKeys} />
    </Column>
  )
}
