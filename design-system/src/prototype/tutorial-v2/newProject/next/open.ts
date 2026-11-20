import { emit } from "../../ui/events"
import { openProject, type OpenProject } from "../../programs/project"
import { armHint } from "./BuildHint"
import type { FrameworkId } from "./data"
import { freeName, remember, wait, type Env, type Source } from "./model"

/* How First Light opens, and the one way it lands (CONSENSUS.md, 5.1 and 3.14). The bus takes no
   payload, so the preset waits here until the dialog reads it */

export type Entry = "nav-row" | "home-tile" | "empty-list" | "phone-menu" | "express-failed"
export type Preset = { entry: Entry; source?: Source; framework?: FrameworkId; url?: string; into?: string; text?: string }

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

const FILLER = new Set(["a", "an", "the", "that", "which", "with", "for", "of", "to", "and", "my", "me", "i", "want", "build", "make", "write", "create", "program", "please"])

/** A project's name from a description, as Spec 15 asks: its first three words that say something, lower
 * case, joined by hyphens. "A tip jar that splits tips" becomes tip-jar-splits */
export function nameFrom(text: string) {
  const words = text.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/\s+/).filter((w) => w && !FILLER.has(w))
  return words.slice(0, 3).join("-") || "anchor-project"
}

/** Home's field: a new Anchor project, made with no dialog, opened with the words sent to its assistant.
 * The words are the request, as a first message to Claude or ChatGPT is */
export async function describeCreate(text: string, env: Env) {
  const name = freeName(nameFrom(text), env)
  await wait(700)
  land({ name, framework: "anchor", source: "describe", prompt: text })
}

/** Home's "Run the Anchor starter": the default Anchor project, made with no dialog, then Build */
export async function expressCreate() {
  const name = envNow ? freeName("anchor-project", envNow) : "anchor-project-2"
  await wait(700)
  land({ name, framework: "anchor", source: "starter", openFile: "src/lib.rs", firstRun: true, build: true })
}
