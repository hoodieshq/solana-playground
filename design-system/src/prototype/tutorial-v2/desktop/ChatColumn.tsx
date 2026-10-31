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

/** Every shortcut, from the ⋯ menu, in three groups: what you do in the lesson, the panels, and moving
 * between steps. Without rules nine alike rows ran together; the groups give the eye a place to rest,
 * 16 apart, each under a small grey name. Rows are 32, the words in the text's colour and size so they
 * lead the key caps, and the dialog is 320 wide so a short name isn't far from its keys */
const GROUPS = ["In the lesson", "Panels", "Steps"] as const
function ShortcutsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-80!">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {GROUPS.map((group) => (
            <section key={group} aria-label={group}>
              <h3 className="mb-1 text-[0.75rem] leading-4 text-subtle">{group}</h3>
              <dl className="flex flex-col">
                {SHORTCUTS.filter((k) => k.group === group).map((k) => (
                  <div key={k.what} className="flex h-8 items-center justify-between gap-4">
                    <dt className="text-[0.875rem] leading-[1.125rem] text-foreground/80">{k.what}</dt>
                    <dd className="flex gap-1">
                      {k.keys.split(" ").map((key) => (
                        <Kbd key={key}>{key}</Kbd>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
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
