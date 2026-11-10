import { useEffect, useRef, useState } from "react"

import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

import { LESSON, STEPS } from "../../data"
import { cardOf, useOpenTutorial } from "../../host"
import { LESSONS } from "../../lessons"
import { useNavState } from "../../navStates"
import { savedProgress, useStore } from "../../store"
import { ProductLogo, ProductMark } from "../../ui/brandGlyphs"
import { on } from "../../ui/events"
import { LitIcon, type LitIconName } from "./icons"
import { soon } from "../Catalog"
import { flashKeys, useFlash } from "../flash"
import { MENU_KEYS } from "../keys"
import { openNewProject } from "../NewProject"
import { useCoarse } from "../pointer"
import { AccountMenu } from "./AccountMenu"
import { AccountRow, AvatarDisc, lineOf } from "./AccountRow"
import { Mine, type LessonItem, type ProjectEntry } from "./Mine"
import { NavRow } from "./NavRow"
import { SearchDialog } from "./SearchDialog"
import { healthWith, useChoices } from "./choices"
import { setPinned as setPin, usePins } from "./pins"
import { FOCUS, HOVER, IN_TABLET_FRAME, RoomyCtx, TabletCtx, Tip } from "./parts"
import { HealthDot, RailButton } from "./Rail"
import { setSetupHidden, setupOf, useSetupHidden } from "./setup"
import { SetupRow } from "./SetupRow"
import { StatusChip } from "./StatusChip"
import "./navLit.css"
import { toCatalog, useInProject } from "../../programs"
import { openSettings } from "../../settings/open"
import { go as goProgram, usePrograms } from "../../programs/store"
import { deletable } from "../../programs/next/shell/GuideColumn"

// The open or folded choice is the same one the current nav keeps, so switching designs keeps it
const KEY = "pg-proto-nav-open-v2"
const TABLET_KEY = "pg-proto-nav-open-tablet-v2"
const read = (key: string): boolean | null => {
  try {
    const v = localStorage.getItem(key)
    return v === null ? null : v === "1"
  } catch {
    return null
  }
}
const save = (key: string, open: boolean) => {
  try {
    localStorage.setItem(key, open ? "1" : "0")
  } catch {
    // Storage off: the choice lasts until the page reloads
  }
}

/* The column's shapes, as the current nav has them: both are in the page and the classes pick one, so
   with no choice made the width decides (open from 1280) without a render. Each part is laid out at
   its final width less the border's pixel and clipped while the column moves, so nothing rewraps */
type Shape = "auto" | "open" | "rail"
const OPEN_ONLY: Record<Shape, string> = { auto: "hidden xl:flex", open: "flex", rail: "hidden" }
const RAIL_ONLY: Record<Shape, string> = { auto: "flex xl:hidden", open: "hidden", rail: "flex" }

/** A 30px square in the head (44 on the tablet) */
const HEAD_BUTTON = "flex shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-(--nav-hover) hover:text-foreground [&>svg]:size-4"

/** Lit Path (research/nav-redesign/CONSENSUS.md): four places to go, your work (Learning, then
 * Projects), and you. The only colour at rest is your progress. It keeps the current nav's behaviour:
 * open from 1280 beside Home, Tutorials and Programs; folded to a 52px rail while a tutorial is open;
 * on a desktop the mark or ⌘B opens it as a column again, pushing the chat and the code, until it's
 * folded or you leave the tutorial (Almaz, 10 Nov: opened over the chat it read as a sheet dropped on
 * the work); on a tablet it floats over the tutorial with a scrim, closing on a pick, the scrim, Esc
 * or ⌘B. No pin: docking is what the desktop does anyway. On the tablet it's 264 wide with 44px rows. As a
 * `sheet` it's the phone's and the upright tablet's menu: the open column at full width with 44px rows,
 * under the menu's own X, and any pick closes the menu */
export function LitNav({ sheet }: { sheet?: { onClose: () => void; onSearch?: (open: boolean) => void } } = {}) {
  const openTutorial = useOpenTutorial()
  const { s, dispatch } = useStore()
  const [stateId, state] = useNavState()
  const coarse = useCoarse()
  const tablet = !!sheet || coarse || IN_TABLET_FRAME
  const [open, setOpen] = useState<boolean | null>(() => read(KEY))
  const [tabletOpen, setTabletOpen] = useState<boolean | null>(() => read(TABLET_KEY))
  const inProject = useInProject()
  // The Programs redesign's project shell folds it to the rail too, as a lesson does
  const learning = s.screen === "step" || inProject
  // A lesson's own: a Programs project folds the nav as a lesson does but has no lesson open, so no tile
  const inLesson = s.screen === "step" || s.screen === "finish"
  const [over, setOver] = useState(false)
  const [pinned, setPinned] = useState(false)
  const opener = useRef<HTMLElement | null>(null)
  const navRef = useRef<HTMLElement>(null)
  const setupHidden = useSetupHidden(stateId)
  const [setupOpen, setSetupOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  // The upright tablet's drawer steps aside while search is open, so search isn't a second layer over it
  const onSearch = sheet?.onSearch
  useEffect(() => onSearch?.(searchOpen), [onSearch, searchOpen])
  const choices = useChoices()
  const pins = usePins()
  const programProjects = usePrograms((ps) => ps.projects)
  const setupNext = useRef(false)
  // Settings takes the focus as it opens from the menu: the menu mustn't hand it back to the account row
  const settingsNext = useRef(false)

  // Leaving the tutorial puts the nav back to how the window has it; coming back folds it again
  useEffect(() => {
    if (!learning) {
      setOver(false)
      setPinned(false)
    }
  }, [learning])

  const floats = learning && !pinned
  const floating = floats && over
  // Closing the float, the column lands in the row at the rail's width at once: with the width easing
  // it stood in the row at full width for a moment and shrank, jerking the chat and the code (Almaz, 10 Nov)
  const wasFloating = useRef(false)
  const landing = wasFloating.current && !floating
  useEffect(() => {
    wasFloating.current = floating
  })
  const mine = learning ? pinned || over : tablet ? (tabletOpen ?? true) : open
  const shape: Shape = sheet ? "open" : learning ? (mine ? "open" : "rail") : mine === null ? "auto" : mine ? "open" : "rail"

  const shownNow = mine ?? window.matchMedia("(min-width: 1280px)").matches
  const close = () => {
    setOver(false)
    // The focus goes back where the overlay was opened from
    requestAnimationFrame(() => opener.current?.focus())
  }
  const float = () => {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setOver(true)
  }
  const toggle = () => {
    if (learning) {
      if (pinned) return setPinned(false)
      if (over) return close()
      return tablet ? float() : setPinned(true)
    }
    if (tablet) setTabletOpen(!shownNow)
    else setOpen(!shownNow)
    save(tablet ? TABLET_KEY : KEY, !shownNow)
  }

  // An answer's Show me opens the overlay too
  useEffect(() =>
    on("nav:open", () => {
      if (learning && !pinned) {
        if (tablet) float()
        else setPinned(true)
      }
    })
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setSearchOpen((v) => !v)
      } else if ((e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "b") {
        e.preventDefault()
        toggle()
        flashKeys(MENU_KEYS)
      } else if (e.key === "Escape" && floating) {
        close()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  // Floating, the focus lands on the current lesson's row and Tab stays inside the nav
  useEffect(() => {
    if (!floating) return
    const el = navRef.current
    requestAnimationFrame(() => (el?.querySelector<HTMLElement>("[data-lit-open] [data-here]") ?? el?.querySelector<HTMLElement>("[data-lit-open] button"))?.focus())
    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !el) return
      const all = [...el.querySelectorAll<HTMLElement>("[data-lit-open] button, [data-lit-open] input")].filter((b) => b.getClientRects().length > 0)
      const first = all[0]
      const last = all[all.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last?.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first?.focus()
      }
    }
    el?.addEventListener("keydown", trap)
    return () => el?.removeEventListener("keydown", trap)
  }, [floating])

  const pressed = useFlash(MENU_KEYS)
  const flash = pressed.on ? (pressed.n % 2 ? "a" : "b") : undefined

  // A pick from the floating nav closes it, as a menu does
  const go = (then: () => void) => () => {
    if (floating) setOver(false)
    sheet?.onClose()
    then()
  }

  // The lesson open in the prototype, as far as it got
  const finishedNow = s.passed.every(Boolean)
  const openLesson = { name: LESSON.card.name, at: !s.started ? 0 : finishedNow ? STEPS.length : s.step + 1, of: STEPS.length, done: s.started && finishedNow }
  // The end of a tutorial is a project: finishing a pinned one takes it out of Pinned (Almaz, 6 Nov).
  // Only at the moment it's finished, so the project can be pinned again afterwards. A program the same,
  // when its first call lands
  const wasDone = useRef(openLesson.done)
  useEffect(() => {
    if (openLesson.done && !wasDone.current && pins[openLesson.name]) setPin(openLesson.name, false)
    wasDone.current = openLesson.done
  }, [openLesson.done, openLesson.name, pins])
  const doneRef = useRef(new Set(Object.values(programProjects).filter((p) => p.doneAt).map((p) => p.id)))
  useEffect(() => {
    for (const p of Object.values(programProjects)) {
      if (!p.doneAt || doneRef.current.has(p.id)) continue
      doneRef.current.add(p.id)
      if (pins[p.name]) setPin(p.name, false)
    }
  }, [programProjects, pins])
  const slugOf = (name: string) => Object.values(LESSONS).find((l) => l.card.name === name)?.card.slug
  const openByName = (name: string) => () => {
    const slug = slugOf(name)
    if (slug) openTutorial(slug)
    else soon()
  }

  // Pins made from a row's menu win over the state's own
  const given = state.projects ?? []
  const rows = given === "loading" ? "loading" : given.map((p) => (p.name in pins ? { ...p, pinned: pins[p.name] } : p))
  const lessons: LessonItem[] = (rows === "loading" ? [] : rows)
    .filter((p) => p.lesson)
    .map((p) => ({
      name: p.name,
      at: p.steps?.at ?? 0,
      of: p.steps?.of ?? 4,
      next: p.steps?.next,
      done: p.progress === "done",
      pinned: !!p.pinned,
      current: inLesson && p.name === openLesson.name,
      onOpen: go(openByName(p.name)),
    }))
  // In a lesson the state doesn't list, it joins Learning: the overlay's focus needs it
  if (inLesson && rows !== "loading" && !lessons.some((l) => l.current)) {
    lessons.unshift({ ...openLesson, pinned: !!pins[openLesson.name], current: true, onOpen: go(openByName(openLesson.name)) })
  }

  // A lesson the state doesn't list stays in the nav once you've started it, and the one you finished
  // as a project (Almaz, 6 Nov). Kept only while pinned, a started lesson pinned from its own ⋯ left the
  // nav for good on Unpin (Almaz, 10 Nov)
  if (rows !== "loading")
    for (const l of Object.values(LESSONS)) {
      const name = l.card.name
      const open = name === openLesson.name
      const saved = open ? null : savedProgress(l.card.slug, l.steps.length)
      const started = open ? s.started : saved!.started
      if ((!pins[name] && !started) || lessons.some((x) => x.name === name)) continue
      const first = saved ? saved.passed.findIndex((p) => !p) : -1
      const progress = open ? openLesson : { name, at: saved!.finished ? l.steps.length : first === -1 ? l.steps.length : first + 1, of: l.steps.length, done: saved!.finished }
      lessons.push({ ...progress, pinned: !!pins[name], current: false, onOpen: go(openByName(name)) })
    }
  // A program's project, beside the state's own: in Pinned while it's pinned from the shell's ⋯, and in
  // Projects from the start. A lesson under way isn't yours yet, but a program from New project is your
  // code at once; waiting for its first call left it in Programs' Your projects and nowhere here
  // (Almaz, 10 Nov, in place of 6 Nov's "once it runs on devnet")
  const programRows: ProjectEntry[] = Object.values(programProjects)
    .filter((p) => (pins[p.name] || deletable(p)) && !(rows !== "loading" && rows.some((r) => r.name === p.name)))
    .map((p) => ({
      name: p.name,
      pinned: !!pins[p.name],
      onOpen: go(() => {
        goProgram({ at: "project", id: p.id })
        dispatch({ type: "open", screen: "programs" })
      }),
    }))

  // Learning is what you're in the middle of. A finished lesson leaves it and its code is a project like
  // any other (the open one stays while you're in it); the gallery is where it shows as done. As a
  // project it's pinned only when pinned after finishing: a state's own pin on a finished lesson drops
  const learningNow = lessons.filter((l) => !l.done || l.current)
  const finishedAsProjects: ProjectEntry[] = lessons.filter((l) => l.done && !l.current).map((l) => ({ name: l.name, pinned: pins[l.name] === true, onOpen: l.onOpen }))
  const projects: ProjectEntry[] | "loading" = rows === "loading" ? "loading" : [...finishedAsProjects, ...programRows, ...rows.filter((p) => !p.lesson)]

  // With nothing in progress, Learning names the next tutorial on the ladder: the one after the last you
  // finished that you haven't started, or Hello Anchor
  const startedNames = new Set(lessons.map((l) => l.name))
  const nextSlug =
    lessons
      .filter((l) => l.done)
      .map((l) => LESSONS[slugOf(l.name) ?? ""]?.next)
      .find((slug) => slug && !startedNames.has(cardOf(slug)?.name ?? "")) ?? (startedNames.has("Hello Anchor") ? undefined : "hello-anchor")
  const upNext =
    rows !== "loading" && learningNow.length === 0 && (lessons.length > 0 || rows.length > 0) && nextSlug
      ? // "Counter PDA Tutorial" says Tutorial twice in a list of tutorials: the nav drops the word
        { name: cardOf(nextSlug).name.replace(/ Tutorial$/, ""), of: LESSONS[nextSlug]?.steps.length ?? 4, onOpen: go(openByName(cardOf(nextSlug).name)) }
      : undefined

  const setup = setupOf(state, choices)
  const notSynced = rows === "loading" ? 0 : rows.filter((p) => p.marker === "Not synced").length
  const wallet = state.account?.session === "in" && (!state.setup || state.setup.steps[3]?.state === "done")

  const showSetup = () => {
    setSetupHidden(stateId, false)
    // From the rail the row isn't there: the overlay opens with it
    if (shape === "rail") float()
    else setupNext.current = true
  }

  const destinations: { id: string; label: string; icon: LitIconName; current: boolean; section?: boolean; onClick: () => void }[] = [
    { id: "home", label: "Home", icon: "home", current: s.screen === "home", onClick: go(() => dispatch({ type: "open", screen: "home" })) },
    { id: "new", label: "New project", icon: "new", current: false, onClick: go(openNewProject) },
    { id: "tutorials", label: "Tutorials", icon: "tutorials", current: s.screen === "gallery", section: inLesson, onClick: go(() => dispatch({ type: "open", screen: "gallery" })) },
    {
      id: "programs",
      label: "Programs",
      icon: "programs",
      current: s.screen === "programs",
      onClick: go(() => {
        toCatalog()
        dispatch({ type: "open", screen: "programs" })
      }),
    },
  ]

  const account = state.account
  const health = state.health
  const accountMenu = (side: "top" | "right") =>
    account && (
      <AccountMenu
        account={account}
        setup={setup}
        notSynced={notSynced}
        wallet={wallet}
        side={side}
        onSetup={showSetup}
        // On the phone the menu sheet goes first, so Back returns to the screen, not to the menu
        onSettings={() => {
          sheet?.onClose()
          settingsNext.current = true
          openSettings()
        }}
        onCloseAutoFocus={(e) => {
          if (settingsNext.current) {
            settingsNext.current = false
            return e.preventDefault()
          }
          // Get set up opens the setup popover once the menu has gone, so its focus doesn't close it
          if (!setupNext.current) return
          e.preventDefault()
          setupNext.current = false
          setSetupOpen(true)
        }}
      />
    )

  const roomy = !!sheet
  const openW = roomy ? "w-[16.5rem]" : "w-60"
  const width = sheet ? "h-full w-full" : shape === "rail" ? "w-[3.25rem]" : shape === "open" ? openW : "w-[3.25rem] xl:w-60"
  const headH = roomy ? "h-13" : "h-11"
  const headBtn = cn(HEAD_BUTTON, FOCUS, HOVER, roomy ? "size-11" : "size-[1.875rem]")

  return (
    <TabletCtx.Provider value={tablet}>
    <RoomyCtx.Provider value={roomy}>
      {/* Floating, the rail's room stays in the layout so nothing under it moves */}
      {floating && <div aria-hidden="true" className="w-[3.25rem] shrink-0" />}
      {floating && <div aria-hidden="true" onClick={close} className="absolute inset-0 z-30 bg-black/50 duration-150 animate-in fade-in motion-reduce:animate-none" />}
      <nav
        ref={navRef}
        aria-label="Main"
        data-floating={floating || undefined}
        className={cn(
          "lit-nav relative flex shrink-0 overflow-hidden text-foreground transition-[width,background-color,box-shadow] duration-200 ease-standard motion-reduce:transition-none",
          width,
          sheet ? "" : floating ? "absolute inset-y-0 left-0 z-40 bg-popover shadow-modal" : "border-r border-border bg-(--nav-ground)",
          landing && "transition-none"
        )}
      >

        {/* Open: head, places, your work, you */}
        <div data-lit-open className={cn(OPEN_ONLY[shape], sheet ? "w-full" : roomy ? "w-[calc(16.5rem-1px)]" : "w-[calc(15rem-1px)]", "lit-labels-in h-full shrink-0 flex-col")}>
          {/* The lockup left; the pin (in a lesson) and the fold right; a rule under them at the height
              every column's head shares. A sheet has the menu's own bar instead */}
          <div className={cn(headH, "flex shrink-0 items-center gap-0.5 border-b border-border pr-2 pl-3", sheet && "hidden")}>
            <button type="button" onClick={go(() => dispatch({ type: "open", screen: "home" }))} aria-label="Solana Playground, home" className={cn("group/brand mr-auto flex h-9 shrink-0 items-center rounded-lg px-1 text-foreground", FOCUS)}>
              <ProductLogo className="block h-7 w-auto shrink-0 transition-opacity duration-100 group-hover/brand:opacity-82 motion-reduce:transition-none" />
            </button>
            <Tip label="Collapse sidebar" keys={MENU_KEYS} side="bottom">
              <button type="button" onClick={toggle} aria-expanded={true} aria-label="Collapse the sidebar" data-flash={flash} className={headBtn}>
                <LitIcon name="sidebar" />
              </button>
            </Tip>
          </div>

          {/* Search, then the places: no label, never scroll. Search leads them as a row, the way Claude's
              and ChatGPT's sidebars put it, so the head keeps only the fold */}
          <div role="group" aria-label="Destinations" className={cn("flex shrink-0 flex-col px-2", roomy ? "gap-0.5 pt-2" : "pt-3")}>
            <NavRow
              kind="destination"
              glyph={<LitIcon name="search" />}
              label="Search"
              meta={sheet ? undefined : <span className="text-[0.75rem] font-act tracking-[0.01em] text-(color:--text-quiet)">⌘K</span>}
              tip={stateId === "many-projects" ? "Search projects, lessons and actions" : undefined}
              // In a sheet the menu stays under the search, so closing search goes back to it
              onClick={sheet ? () => setSearchOpen(true) : go(() => setSearchOpen(true))}
            />
            {destinations.map((d) => (
              <NavRow key={d.id} kind="destination" glyph={<LitIcon name={d.icon} />} label={d.label} current={d.current} section={d.section} onClick={d.onClick} />
            ))}
          </div>

          <Mine lessons={learningNow} projects={projects} upNext={upNext} onStartFirst={go(openByName("Hello Anchor"))} onPick={go} />

          {/* The foot never scrolls and never changes height between states, setup aside. A rule over it
              answers the one under the head, so you sits apart from your work */}
          {/* 8 above and below on the desktop: with the 44 row, 14 from the rule to the avatar (Almaz, 9 Nov) */}
          <div className={cn("flex shrink-0 flex-col gap-2 border-t border-border px-2", roomy ? "py-3" : "py-2")}>
            {setup && !setupHidden && (
              <SetupRow
                setup={setup}
                open={setupOpen}
                onOpenChange={setSetupOpen}
                onHide={() => setSetupHidden(stateId, true)}
              />
            )}
            {account && (
              <AccountRow
                account={account}
                chipWord={health && healthWith(health, choices).word}
                chip={health && state.statusRows && <StatusChip health={health} rows={state.statusRows} note={state.statusNote} />}
                menu={accountMenu("top")}
              />
            )}
          </div>
        </div>

        {/* Folded: the mark, the four places, the open lesson's tile, then health and you */}
        <div className={cn(RAIL_ONLY[shape], "w-[calc(3.25rem-1px)] h-full shrink-0 flex-col items-center")}>
          <div className={cn(headH, "relative flex w-full shrink-0 items-center justify-center border-b border-border")}>
            <Tip label="Open menu" keys={MENU_KEYS}>
              <button
                type="button"
                onClick={toggle}
                aria-expanded={false}
                aria-label="Open the menu"
                data-flash={flash}
                className={cn(
                  "group/rail relative flex size-9 items-center justify-center rounded-lg text-foreground transition-colors duration-100 hover:bg-(--nav-hover) focus-visible:bg-(--nav-hover) motion-reduce:transition-none",
                  FOCUS
                )}
              >
                <ProductMark className="block h-auto w-7 transition-opacity duration-100 group-hover/rail:opacity-0 group-focus-visible/rail:opacity-0 motion-reduce:transition-none" />
                <span
                  aria-hidden="true"
                  className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-100 group-hover/rail:opacity-100 group-focus-visible/rail:opacity-100 motion-reduce:transition-none [&>svg]:size-[1.125rem]"
                >
                  <LitIcon name="sidebar" />
                </span>
              </button>
            </Tip>
          </div>
          <div role="group" aria-label="Destinations" className={cn("flex flex-col items-center gap-0.5", roomy ? "pt-2" : "pt-3")}>
            <Tip label="Search" keys="⌘K">
              <RailButton label="Search" current={false} onClick={() => setSearchOpen(true)}>
                <LitIcon name="search" />
              </RailButton>
            </Tip>
            {destinations.map((d) => (
              <Tip key={d.id} label={d.label}>
                {/* In a lesson the rail marks Tutorials, the grey square on the place you're in: the lesson's
                    own tile with its progress drew the eye off the lesson (Almaz, 6 Nov) */}
                <RailButton label={d.label} current={d.current || !!d.section} section={d.section} onClick={d.onClick}>
                  <LitIcon name={d.icon} />
                </RailButton>
              </Tip>
            ))}
          </div>
          <div className="flex-1" />
          <div className="flex w-full flex-col items-center gap-0.5 border-t border-border pt-2 pb-2">
            {health && state.statusRows && <HealthDot health={health} rows={state.statusRows} note={state.statusNote} />}
            {account && (
              <DropdownMenu>
                {/* Signed out, the rail says Sign in alone, as the open row does */}
                <Tip label={account.session === "out" ? account.primary : `${account.primary} · ${lineOf(account)}`}>
                  <DropdownMenuTrigger asChild>
                    <RailButton label={account.session === "out" ? `${account.primary}. Account menu` : `${account.primary}, ${lineOf(account)}. Account menu`} aria-haspopup="menu">
                      <AvatarDisc a={account} size={28} notch />
                    </RailButton>
                  </DropdownMenuTrigger>
                </Tip>
                {accountMenu("right")}
              </DropdownMenu>
            )}
          </div>
        </div>
      </nav>
      <SearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        lessons={learningNow}
        projects={projects === "loading" ? [] : projects}
        onTutorial={(name) => go(openByName(name))()}
        onPlace={(screen) => go(() => dispatch({ type: "open", screen }))()}
        onNewProject={go(openNewProject)}
      />
    </RoomyCtx.Provider>
    </TabletCtx.Provider>
  )
}
