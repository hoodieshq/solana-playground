import { emit } from "../../ui/events"
import { openProject, type OpenProject } from "../../programs/project"
import { armHint } from "./BuildHint"
import type { FrameworkId } from "./data"
import { freeName, remember, wait, type Env, type Source } from "./model"

/* How First Light opens, and the one way it lands (CONSENSUS.md, 5.1 and 3.14). The bus takes no
   payload, so the preset waits here until the dialog reads it */

export type Entry = "nav-row" | "home-tile" | "empty-list" | "phone-menu" | "express-failed"
export type Preset = { entry: Entry; source?: Source; framework?: FrameworkId; url?: string; into?: string }

let pending: Preset | null = null

export function openFirstLight(preset: Preset) {
  pending = preset
  emit("new-project:open")
}

/** The preset the last opening asked for; an entry that called openNewProject gave none */
export function takePreset(): Preset {
  const p = pending ?? { entry: "nav-row" }
  pending = null
  return p
}

/** The environment the dialog last read, for the express path, which has no dialog of its own */
let envNow: Env | null = null
export const keepEnv = (env: Env) => {
  envNow = env
}

/** Lands in the shell. Every source but Describe arms the one time hint first, so the shell's
 * "project:open" finds it waiting */
export function land(o: OpenProject, ignoreDone = false) {
  remember(o.name)
  if (o.source !== "describe") armHint(o.firstRun ? "express" : o.framework === "ts-client" ? "run" : "build", ignoreDone)
  openProject(o)
}

/** Home's "Run the Anchor starter": the default Anchor project, made with no dialog, then Build */
export async function expressCreate() {
  const name = envNow ? freeName("anchor-project", envNow) : "anchor-project-2"
  await wait(700)
  land({ name, framework: "anchor", source: "starter", openFile: "src/lib.rs", firstRun: true, build: true })
}
