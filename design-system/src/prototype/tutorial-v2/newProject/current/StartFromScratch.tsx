import { useId, useState } from "react"

import { BrandButton } from "@/components/ui/brand-button"
import { FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Segmented, SegmentedItem } from "@/components/ui/segmented"

import { onProjectCreated } from "../design"
import { createProject, isNameValid } from "./projects"

/** Where Start stands. `creating` and `invalid` hold Start; `failed` keeps it usable, so a press
 * after a failure is a retry */
export type Start = { state: "idle" } | { state: "creating" } | { state: "invalid"; error: string } | { state: "failed"; error: string }

const canStart = (start: Start) => start.state === "idle" || start.state === "failed"

/** What the field says when the name breaks the rule */
export const NAME_RULE = "Use letters, numbers, spaces, - or _."

const FRAMEWORKS = [
  { name: "Anchor", icon: "anchor.png" },
  { name: "Native", icon: "native.png" },
  { name: "Seahorse", icon: "seahorse.png", circle: true },
] as const

const defaultName = (framework: string) => `${framework.toLowerCase()}-project`

/** Start from scratch, as client-v2's features/new-project: a framework, a name and Start, what is
 * wrong with the name under the field. From `md` the labels share a column; below it each label sits
 * over its control and every control is 48 px. Start makes the project in this window. `seed` is
 * where a forced state starts it */
export function StartFromScratch({
  onStarted,
  held = false,
  onRunning,
  seed,
}: {
  onStarted?: () => void
  held?: boolean
  onRunning?: (running: boolean) => void
  seed?: { name: string; start: Start }
}) {
  const [framework, setFramework] = useState<string>("Anchor")
  const [name, setName] = useState(seed?.name ?? "")
  const [start, setStart] = useState<Start>(seed?.start ?? { state: "idle" })
  const errorId = useId()
  const nameId = useId()

  const creating = start.state === "creating"
  const usable = canStart(start) && !held
  const error = start.state === "invalid" || start.state === "failed" ? start.error : undefined

  const create = async () => {
    if (!usable) return
    const projectName = name.trim() || defaultName(framework)
    if (!isNameValid(projectName)) {
      setStart({ state: "invalid", error: NAME_RULE })
      return
    }
    setStart({ state: "creating" })
    onRunning?.(true)
    try {
      const project = await createProject(projectName, framework)
      onRunning?.(false)
      setStart({ state: "idle" })
      onStarted?.()
      onProjectCreated(project)
    } catch (e) {
      onRunning?.(false)
      setStart({ state: "failed", error: e instanceof Error ? e.message : "Could not create the project" })
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface-panel p-4 md:p-5">
      <div className="min-w-0">
        <div className="text-control font-act text-foreground max-md:text-body">Start from scratch</div>
        <div className="text-caption font-read text-muted-foreground max-md:text-control">A working starter you shape with the assistant.</div>
      </div>

      <div className="grid gap-x-4 gap-y-3 md:grid-cols-[5.5rem_minmax(0,1fr)] md:items-start">
        <span aria-hidden="true" className="text-caption text-muted-foreground max-md:-mb-1.5 max-md:text-control md:leading-8">
          Framework
        </span>
        <Segmented
          variant="gradient"
          aria-label="Framework"
          className="max-md:w-full max-md:gap-1 md:justify-self-start"
          value={framework}
          onValueChange={(f) => f && setFramework(f)}
        >
          {FRAMEWORKS.map((f) => (
            <SegmentedItem key={f.name} value={f.name} className="max-md:h-12 max-md:flex-1 max-md:px-2 max-md:text-control">
              <img src={`${import.meta.env.BASE_URL}prototype/frameworks/${f.icon}`} alt="" className={"circle" in f ? "size-4 rounded-full" : "size-4 rounded-[4px]"} />
              {f.name}
            </SegmentedItem>
          ))}
        </Segmented>

        <label htmlFor={nameId} className="text-caption text-muted-foreground max-md:-mb-1.5 max-md:text-control md:leading-8">
          Name
        </label>
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex gap-2">
            <Input
              id={nameId}
              aria-label="Project name"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              className="min-w-0 flex-1 max-md:h-12 max-md:px-3.5 max-md:text-body md:max-w-80"
              value={name}
              placeholder={defaultName(framework)}
              onChange={(e) => {
                setName(e.target.value)
                if (!creating) setStart({ state: "idle" })
              }}
              onKeyDown={(e) => e.key === "Enter" && create()}
            />
            <BrandButton
              type="button"
              variant="accent"
              className="h-8 max-md:h-12 max-md:px-4.5 max-md:text-control"
              disabled={!usable}
              aria-busy={creating || undefined}
              onClick={create}
            >
              Start &rarr;
            </BrandButton>
          </div>
          <FieldError id={errorId}>{error}</FieldError>
        </div>
      </div>
    </div>
  )
}
