import type { ReactNode } from "react"

import { ConsoleDrawer, ConsoleDrawerActions, ConsoleDrawerBar, ConsoleDrawerContent, ConsoleDrawerStatus } from "@/components/ui/console-drawer"
import { EditorTab, EditorTabLabel, EditorTabs, EditorTabTrigger } from "@/components/ui/editor-tabs"
import { Kbd } from "@/components/ui/kbd"

export type TerminalSlot = { open: boolean; onOpenChange: (open: boolean) => void; status: ReactNode; body: ReactNode }

/** The project side: its name, the open file, the code, the step's actions and the terminal. The
 * product's Write, Build, Deploy, Interact stepper isn't here: in a tutorial the steps lead, the
 * stepper can't be switched, and the column already shows progress and the terminal the build */
export function Workspace({
  file,
  tools,
  actions,
  terminal,
  children,
}: {
  file: string
  tools?: ReactNode
  actions?: ReactNode
  terminal?: TerminalSlot
  children: ReactNode
}) {
  return (
    <section aria-label="Project" className="flex min-w-0 flex-1 flex-col">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-4">
        <h2 className="font-heading text-control">Hello Anchor</h2>
      </header>
      <div className="flex shrink-0 items-stretch border-b border-border bg-surface-base">
        <EditorTabs className="flex-1 border-b-0!">
          <EditorTab active>
            <EditorTabTrigger>
              <EditorTabLabel>{file.split("/").pop()}</EditorTabLabel>
            </EditorTabTrigger>
          </EditorTab>
        </EditorTabs>
        {tools && <div className="flex items-center gap-1 pr-2">{tools}</div>}
      </div>
      <div className="flex min-h-0 flex-1 flex-col bg-surface">{children}</div>
      {actions}
      {terminal && (
        <ConsoleDrawer open={terminal.open} onOpenChange={terminal.onOpenChange}>
          <ConsoleDrawerBar>
            <ConsoleDrawerStatus>{terminal.status}</ConsoleDrawerStatus>
            <ConsoleDrawerActions>
              <Kbd>⌘J</Kbd>
            </ConsoleDrawerActions>
          </ConsoleDrawerBar>
          <ConsoleDrawerContent className="h-56">{terminal.body}</ConsoleDrawerContent>
        </ConsoleDrawer>
      )}
    </section>
  )
}
