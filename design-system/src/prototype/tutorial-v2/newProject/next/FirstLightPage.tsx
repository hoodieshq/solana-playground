import { ChevronLeft, GraduationCap, X } from "lucide-react"
import { Dialog, RadioGroup } from "radix-ui"
import { useEffect, useRef, useState, type ReactNode } from "react"

import { BrandButton } from "@/components/ui/brand-button"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { StatusDot } from "@/components/ui/status-dot"
import { cn } from "@/lib/utils"

import "../../desktop/navLit/navLit.css"
import { useStore } from "../../store"
import type { NextStateId } from "../design"
import { FRAMEWORKS, type FrameworkId } from "./data"
import { hasStorageLine, StorageLine } from "./FirstLight"
import { FrameworkCard } from "./FrameworkCard"
import "./firstLight.css"
import type { Source } from "./model"
import type { Preset } from "./open"
import { ProblemCallout } from "./ProblemCallout"
import { SourcePanel } from "./SourcePanel"
import { SourceRows } from "./SourceRail"
import { useFirstLight } from "./useFirstLight"
import { view } from "../../view"

type Sub = Exclude<Source, "starter">

const TITLES: Record<Sub, string> = { example: "Example program", import: "Import from GitHub", describe: "Describe it" }

// The phone's column, and the upright tablet's 640 (CONSENSUS.md, 6.3), with its 16 px sides
const COLUMN = "mx-auto w-full max-w-[30rem] [html.portrait_&]:max-w-[42rem]"
const LABEL = "mt-6 first:mt-0 mb-2 text-[0.8125rem] leading-[1.125rem] font-[380] text-(color:--text-quiet)"
const ROW = "flex w-full items-center gap-3 rounded-xl px-2 text-left outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--ring) active:bg-(--np-current)"
const SLIDE = "absolute inset-0 flex flex-col bg-surface-base transition-transform duration-(--duration-sheet) ease-standard motion-reduce:transition-none"

/** The upright tablet opens it as a sheet over the dimmed page, as an iPad's form sheet: a full page
 * there left a narrow column in wide empty sides (Almaz, 11/09) */
const SHEET = view === "portrait"

/** The visual viewport's height, so the pinned footer rides above the keyboard */
function useViewportHeight() {
  const [h, setH] = useState<number>()
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const sync = () => setH(vv.height)
    vv.addEventListener("resize", sync)
    return () => vv.removeEventListener("resize", sync)
  }, [])
  return h
}

function Bar({ children }: { children: ReactNode }) {
  return (
    <header className="h-(--phone-bar) shrink-0 border-b border-border">
      <div className={cn(COLUMN, "flex h-full items-center gap-1 px-4")}>{children}</div>
    </header>
  )
}

/** First Light on the phone and the upright tablet (CONSENSUS.md, 6.2 and 6.3): the dialog's flow as
 * a full page. Level 1 holds the frameworks, the other sources as rows, the name and the tutorial
 * link; Example, Import and Describe push their own page. The primary is pinned at the foot */
export function FirstLightPage({ open, onClose, forced, preset }: { open: boolean; onClose: () => void; forced?: NextStateId; preset?: Preset }) {
  const flow = useFirstLight(forced, preset, onClose)
  const { s, dispatch, env, seed, closing, primaryRef, creating, fetching, busy, main, failed, create, cancel, retry, enterCreates } = flow
  const { dispatch: go } = useStore()
  const urlRef = useRef<HTMLInputElement>(null)
  const boxRef = useRef<HTMLTextAreaElement>(null)
  const height = useViewportHeight()
  const tablet = document.documentElement.classList.contains("portrait")

  const level2 = s.source !== "starter"
  // The last sub page stays drawn while it slides back out
  const [sub, setSub] = useState<Sub>(level2 ? (s.source as Sub) : "example")

  const push = (source: Sub) => {
    setSub(source)
    dispatch({ type: "source", source })
    // Import and Describe want the keyboard at once; Example keeps its list in view
    requestAnimationFrame(() => (source === "import" ? urlRef : source === "describe" ? boxRef : null)?.current?.focus({ preventScroll: true }))
  }

  const back = () => {
    if (creating) return
    cancel()
    dispatch({ type: "source", source: "starter" })
  }


  return (
    <Dialog.Root
      open={open && !closing}
      onOpenChange={(next) => {
        if (next || creating) return
        cancel()
        onClose()
      }}
    >
      <Dialog.Portal>
        {SHEET && <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-open:animate-in data-open:fade-in-0 data-open:duration-200 data-closed:animate-out data-closed:fade-out-0 data-closed:duration-150" />}
        <Dialog.Content
          aria-describedby={hasStorageLine(env) ? "np-page-storage" : undefined}
          style={height && !SHEET ? { height } : undefined}
          className={
            SHEET
              ? "fixed inset-0 z-50 m-auto h-[min(50rem,calc(100%-6rem))] w-[40rem] overflow-hidden rounded-[20px] border border-border bg-surface-base text-foreground shadow-modal outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-[0.97] data-open:duration-200 data-open:ease-out data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-[0.97] data-closed:duration-150 motion-reduce:zoom-in-100 motion-reduce:zoom-out-100"
              : "fixed inset-x-0 top-0 z-50 h-dvh overflow-hidden bg-surface-base pt-[env(safe-area-inset-top)] text-foreground outline-none data-open:animate-in data-open:fade-in-0 data-open:duration-200 data-closed:animate-out data-closed:fade-out-0 data-closed:duration-150"
          }
          onOpenAutoFocus={(e) => {
            e.preventDefault()
            const root = e.currentTarget as HTMLElement
            const f = seed?.focus
            const target =
              f === "url" ? urlRef.current : f === "box" ? boxRef.current : f === "retry" ? root.querySelector<HTMLElement>("[role=alert] button:not(:disabled)") : null
            // Level 1 focuses nothing else, so no keyboard comes up: open, then Create is one tap
            ;(target ?? root).focus({ preventScroll: true })
          }}
          // A full page has no outside: the phone menu's focus going back to its button must not close it.
          // The upright tablet's sheet closes on a tap on the dimmed page, as an iPad's form sheet does
          onFocusOutside={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => !SHEET && e.preventDefault()}
          onEscapeKeyDown={(e) => {
            if (creating) e.preventDefault()
            else if (fetching || level2) {
              e.preventDefault()
              if (fetching) cancel()
              else back()
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              create()
            }
          }}
        >
          <div className="flex h-full flex-col">
            <div className="relative min-h-0 flex-1 overflow-hidden">
              <section inert={level2} className={cn(SLIDE, level2 && "-translate-x-[30%]")}>
                <Bar>
                  <Dialog.Title className="flex-1 text-title font-act">New project</Dialog.Title>
                  <Dialog.Close asChild>
                    <Button variant="ghost" size="icon" className="-mr-2.5 size-11" aria-label="Close">
                      <X className="size-5" />
                    </Button>
                  </Dialog.Close>
                </Bar>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                  <div className={cn(COLUMN, "px-4 pt-4 pb-6")}>
                    {hasStorageLine(env) && (
                      <p id="np-page-storage" className="text-[0.8125rem] leading-[1.125rem] font-read text-muted-foreground">
                        <StorageLine env={env} />
                      </p>
                    )}
                    <h2 className={LABEL}>Framework</h2>
                    <RadioGroup.Root
                      aria-label="Framework"
                      value={s.framework}
                      onValueChange={(v) => dispatch({ type: "framework", framework: v as FrameworkId })}
                      onKeyDown={enterCreates}
                      disabled={busy}
                      className={tablet ? "grid grid-cols-2 gap-3" : "flex flex-col gap-2"}
                    >
                      {FRAMEWORKS.map((x) => (
                        <FrameworkCard key={x.id} f={x} picked={x.id === s.framework} dim={creating && x.id !== s.framework} compact={!tablet} />
                      ))}
                    </RadioGroup.Root>
                    <h2 className={LABEL}>Or start from</h2>
                    <SourceRows env={env} into={!!s.into} busy={busy} onOpen={(v) => push(v as Sub)} />
                    <div className="mt-6">
                      {/* No name here: New project names it for you, and the project's head renames it */}
                      {s.into && (
                        <p className="flex min-h-(--phone-row) flex-wrap items-center gap-x-3 px-2 text-[0.9375rem] text-muted-foreground">
                          {`Adds files to ${s.into}.`}
                          <button type="button" onClick={() => dispatch({ type: "into" })} className="min-h-12 font-act text-foreground">
                            Make a new project instead
                          </button>
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          onClose()
                          go({ type: "open", screen: "gallery" })
                        }}
                        className={cn(ROW, "h-(--phone-row)")}
                      >
                        <span aria-hidden="true" className="grid size-5 shrink-0 place-items-center text-(color:--text-quiet)">
                          <GraduationCap className="size-5" />
                        </span>
                        <span className="flex-1 text-[0.9375rem] text-muted-foreground">Follow a tutorial</span>
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              <section inert={!level2} aria-hidden={!level2 || undefined} className={cn(SLIDE, !level2 && "translate-x-full")}>
                <Bar>
                  <Button variant="ghost" size="icon" className="-ml-2.5 size-11" aria-label="Back" disabled={creating} onClick={back}>
                    <ChevronLeft className="size-6" />
                  </Button>
                  <h2 className="flex-1 truncate text-title font-act">{TITLES[sub]}</h2>
                </Bar>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                  <div className={cn(COLUMN, "px-4 pt-4 pb-6")}>
                    <SourcePanel flow={flow} source={sub} urlRef={urlRef} boxRef={boxRef} />
                  </div>
                </div>
              </section>
            </div>

            <footer className="shrink-0 border-t border-border bg-surface-panel px-4 pt-3 pb-[calc(12px+var(--safe-bottom))]">
              <div className="mx-auto flex w-full max-w-[28rem] flex-col gap-3 [html.portrait_&]:max-w-[40rem]">
                {failed && (
                  <ProblemCallout
                    tone="error"
                    title="Could not create the project."
                    primary={{ label: "Try again", onClick: retry }}
                    details={failed.error}
                    open={failed.details}
                    onToggle={() => dispatch({ type: "details" })}
                  />
                )}
                <div className="flex gap-2">
                  {fetching && (
                    <Button variant="ghost" onClick={cancel} className="h-12">
                      Cancel
                    </Button>
                  )}
                  <BrandButton
                    ref={primaryRef}
                    type="button"
                    variant="accent"
                    disabled={!main.enabled}
                    aria-busy={busy || undefined}
                    onClick={create}
                    className={cn("h-12 flex-1 text-[0.9375rem]", busy && "np-busy opacity-100!")}
                  >
                    {busy && (
                      <>
                        <Spinner aria-hidden="true" role="presentation" className="motion-reduce:hidden" />
                        <StatusDot variant="running" className="motion-safe:hidden" />
                      </>
                    )}
                    {main.label}
                  </BrandButton>
                </div>
              </div>
            </footer>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
