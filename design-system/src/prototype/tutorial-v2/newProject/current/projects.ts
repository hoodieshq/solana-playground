import type { Project } from "../design"

/* The projects Start has made, in this window only: a stand in for client-v2's PgExplorer, with
   its name rule and its "Already exists" */

const made = new Set<string>()

/** What `PgExplorer.isWorkspaceNameValid` lets through */
export const isNameValid = (name: string) => /^(?!\s)[\w\s-]+$/.test(name)

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Makes the project after the time the product's default files and workspace take */
export async function createProject(name: string, framework: string): Promise<Project> {
  await wait(900)
  if (made.has(name)) throw new Error("Already exists")
  made.add(name)
  return { name, framework }
}

/** A program's Open as `PgGithub.import` reports it: the repository first, then file by file */
export async function importProgram(report: (text: string) => void) {
  report("Reading the repository…")
  await wait(500)
  const total = 24
  for (let loaded = 0; loaded <= total; loaded++) {
    report(`Downloading ${loaded}/${total} files…`)
    await wait(40)
  }
}
