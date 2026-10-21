import type { ReactNode } from "react"

import { ConsoleDrawer, ConsoleDrawerActions, ConsoleDrawerBar, ConsoleDrawerContent, ConsoleDrawerStatus } from "@/components/ui/console-drawer"
import { EditorTab, EditorTabLabel, EditorTabs, EditorTabTrigger } from "@/components/ui/editor-tabs"
import { Kbd } from "@/components/ui/kbd"
import { Stepper, StepperItem, StepperList, type StepperStatus } from "@/components/ui/stepper"

import { STEPS } from "../data"
import { useStore } from "../store"

type Stage = "write" | "build" | "deploy" | "interact"

const STAGES: { value: Stage; label: string }[] = [
  { value: "write", label: "Write" },
  { value: "build", label: "Build" },
  { value: "deploy", label: "Deploy" },
  { value: "interact", label: "Interact" },
]

/** The product stage a step happens in. During a tutorial the stepper follows the step and isn't switched by hand */
const stageOf = (id: string): Stage => (id === "deploy" ? "deploy" : id === "call-client" ? "interact" : "write")

function useStageStatus(): Record<Stage, StepperStatus> {
  const { s } = useStore()
  const step = STEPS[s.step]
  const here = s.screen === "step"
  const st: Record<Stage, StepperStatus> = { write: "idle", build: "idle", deploy: "idle", interact: "idle" }
  if (s.passed[0]) st.build = "done"
  if (s.passed[1]) st.deploy = "done"
  if (s.passed[2]) st.interact = "done"
  if (here && s.phase === "building") st[step.id === "call-client" ? "interact" : "build"] = "running"
  if (here && s.phase === "deploying") st.deploy = "running"
  if (here && s.phase === "failed") st[step.id === "call-client" ? "interact" : "build"] = "failed"
  return st
}

export type TerminalSlot = { open: boolean; onOpenChange: (open: boolean) => void; status: ReactNode; body: ReactNode }

/** The project side: its name and stage, the open file, the code, the step's actions and the terminal */
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
  const { s } = useStore()
  const stage = s.screen === "step" ? stageOf(STEPS[s.step].id) : "write"
  const status = useStageStatus()

  return (
    <section aria-label="Project" className="flex min-w-0 flex-1 flex-col">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-4">
        <h2 className="font-heading text-control">Hello Anchor</h2>
        <Stepper value={stage} className="ml-auto">
          <StepperList>
            {STAGES.map((x) => (
              <StepperItem key={x.value} value={x.value} status={status[x.value]} errors={status[x.value] === "failed" ? 1 : undefined}>
                {x.label}
              </StepperItem>
            ))}
          </StepperList>
        </Stepper>
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
