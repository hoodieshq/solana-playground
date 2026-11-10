import { useEffect, useReducer, useRef, useState, type KeyboardEvent } from "react"

import type { OpenProject } from "../../programs/project"
import type { NextStateId } from "../design"
import { BASICS, frameworkOf, type RepoProgram } from "./data"
import { checkName, fakeRepo, finalName, INITIAL, isGithubLink, primary, reducer, useEnv, wait, type FirstLightState } from "./model"
import { keepEnv, land, type Preset } from "./open"
import { SEEDS } from "./states"

/* The flow both shapes run, the dialog (FirstLight) and the phone page (FirstLightPage): the state,
   the fake create, download and import, and the primary. Each shape draws it and owns its focus */

/** The state an opening starts from: the forced state's seed, then what the entry asked for */
function start(forced: NextStateId | undefined, preset: Preset | undefined): FirstLightState {
  const seed = forced && forced in SEEDS ? SEEDS[forced as keyof typeof SEEDS] : undefined
  const s: FirstLightState = { ...INITIAL, ...seed?.patch }
  if (preset?.source) s.source = preset.source
  if (preset?.framework) s.framework = preset.framework
  if (preset?.url) s.import = { state: "typed", url: preset.url }
  if (preset?.into) s.into = preset.into
  return s
}

export function useFirstLight(forced: NextStateId | undefined, preset: Preset | undefined, onClose: () => void) {
  const [s, dispatch] = useReducer(reducer, undefined, () => start(forced, preset))
  const env = useEnv()
  const [closing, setClosing] = useState(false)
  const [held, setHeld] = useState<number>()
  const [attempt, setAttempt] = useState(0)
  const seed = forced && forced in SEEDS ? SEEDS[forced as keyof typeof SEEDS] : undefined
  const express = seed?.express || preset?.entry === "express-failed"
  const primaryRef = useRef<HTMLButtonElement>(null)

  // The async runs read the latest state, and stop when a newer run or Cancel replaces them
  const now = useRef(s)
  now.current = s
  const gen = useRef(0)
  useEffect(() => keepEnv(env), [env])

  // The programs list loads on every opening, 600 ms. A forced state holds it where it is
  useEffect(() => {
    if (attempt === 0 && (seed?.patch?.examples || !env.online)) return
    if (now.current.examples.programs !== "loading") return
    const t = setTimeout(() => dispatch({ type: "examples", patch: { programs: "ready" } }), 600)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt])

  const creating = s.run.state === "creating"
  const fetching = s.import.state === "fetching"
  const busy = creating || fetching
  const main = primary(s, env)
  const check = checkName(s, env)

  /** Done: the shape fades out, then the shell opens the project */
  const finish = (o: OpenProject) => {
    setClosing(true)
    onClose()
    setTimeout(() => land(o), 150)
  }

  const localCreate = async () => {
    const g = ++gen.current
    dispatch({ type: "run", run: { state: "creating" } })
    await wait(700)
    if (g !== gen.current) return
    const st = now.current
    const name = st.into ?? finalName(st, env)
    if (st.source === "example") return finish({ name, framework: BASICS.find((b) => b.slug === st.examples.picked)!.framework, source: "example", slug: st.examples.picked, openFile: "src/lib.rs" })
    if (st.source === "describe" && !st.into) return finish({ name, framework: st.framework, source: "describe", prompt: st.describe.text.trim() })
    finish({ name, framework: st.framework, source: "starter", openFile: frameworkOf(st.framework).main, ...(express && { firstRun: true, build: true }) })
  }

  /** A catalog program: read, copy its files, open lib.rs */
  const download = async (slug: string) => {
    const g = ++gen.current
    const step = (copy: { step: 0 | 1 | 2; loaded: number }) => dispatch({ type: "run", run: { state: "creating", copy } })
    step({ step: 0, loaded: 0 })
    await wait(500)
    for (let loaded = 0; loaded <= 24; loaded++) {
      if (g !== gen.current) return
      step({ step: 1, loaded })
      await wait(40)
    }
    step({ step: 2, loaded: 24 })
    await wait(200)
    if (g !== gen.current) return
    finish({ name: finalName(now.current, env), framework: "native", source: "example", slug, openFile: "src/lib.rs" })
  }

  /** The import's copy and open, once the program is known */
  const copy = async (url: string, program: RepoProgram, found: number, g: number) => {
    for (let loaded = 0; loaded <= 24; loaded++) {
      if (g !== gen.current) return
      dispatch({ type: "import", import: { state: "fetching", url, step: 2, loaded, total: 24, found, program } })
      await wait(40)
    }
    dispatch({ type: "import", import: { state: "fetching", url, step: 3, loaded: 24, total: 24, found, program } })
    await wait(200)
    if (g !== gen.current) return
    finish({ name: finalName(now.current, env), framework: program.framework, source: "import", openFile: program.readme ? "README.md" : frameworkOf(program.framework).main })
  }

  /** Read the repo, find its programs: one goes on to copy, several wait for a pick */
  const fetchRepo = async (url: string) => {
    if (!isGithubLink(url) || !env.online) return
    const g = ++gen.current
    dispatch({ type: "import", import: { state: "fetching", url, step: 0 } })
    await wait(500)
    if (g !== gen.current) return
    const repo = fakeRepo(url, env)
    if ("problem" in repo && repo.at === 0) return dispatch({ type: "import", import: { state: "failed", url, kind: repo.problem, at: 0, details: false } })
    dispatch({ type: "import", import: { state: "fetching", url, step: 1 } })
    await wait(400)
    if (g !== gen.current) return
    if ("problem" in repo) return dispatch({ type: "import", import: { state: "failed", url, kind: repo.problem, at: repo.at, details: false } })
    if (repo.programs.length > 1) return dispatch({ type: "import", import: { state: "choose", url, programs: repo.programs } })
    copy(url, repo.programs[0], 1, g)
  }

  const cancel = () => {
    gen.current++
    const i = now.current.import
    if (i.state === "fetching") dispatch({ type: "import", import: { state: "typed", url: i.url } })
  }

  /** The primary, and everything that presses it: Enter on a card, a row, the name or the link, and
   * Cmd+Enter anywhere */
  const create = () => {
    if (!main.enabled || busy) return
    setHeld(primaryRef.current?.offsetWidth)
    const i = s.import
    if (s.source === "import" && !s.into) {
      if (i.state === "choose") {
        const program = i.programs.find((p) => p.name === i.picked)
        if (program) copy(i.url, program, i.programs.length, ++gen.current)
      } else if (i.state === "typed" || i.state === "failed") fetchRepo(i.url)
      return
    }
    const picked = s.examples.picked
    if (s.source === "example" && !s.into && picked && !BASICS.some((b) => b.slug === picked)) return download(picked)
    localCreate()
  }

  const retry = () => {
    if (s.run.state === "failed") {
      dispatch({ type: "run", run: { state: "idle" } })
      localCreate()
    } else if (s.import.state === "failed") fetchRepo(s.import.url)
  }

  const retryExamples = () => {
    dispatch({ type: "examples", patch: { programs: "loading" } })
    setAttempt((n) => n + 1)
  }

  const enterCreates = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.metaKey && !e.ctrlKey && (e.target as HTMLElement).getAttribute("role") === "radio") create()
  }

  return {
    s,
    dispatch,
    env,
    seed,
    closing,
    held,
    primaryRef,
    creating,
    fetching,
    busy,
    main,
    check,
    failed: s.run.state === "failed" ? s.run : null,
    create,
    cancel,
    retry,
    fetchRepo,
    retryExamples,
    enterCreates,
  }
}

export type FirstLightFlow = ReturnType<typeof useFirstLight>
