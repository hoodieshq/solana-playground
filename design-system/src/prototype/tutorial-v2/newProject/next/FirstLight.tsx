import { RadioGroup, Tabs } from "radix-ui"
import { useEffect, useRef } from "react"

import { BrandButton } from "@/components/ui/brand-button"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import { Button } from "@/components/ui/button"
import { Modal, ModalContent, ModalDescription, ModalHeader, ModalTitle } from "@/components/ui/modal"
import { Spinner } from "@/components/ui/spinner"
import { StatusDot } from "@/components/ui/status-dot"
import { useScrollEdges } from "@/hooks/use-scroll-edges"
import { cn } from "@/lib/utils"

import "../../desktop/navLit/navLit.css"
import { useStore } from "../../store"
import type { NextStateId } from "../design"
import { FRAMEWORKS, type FrameworkId } from "./data"
import { FrameworkCard } from "./FrameworkCard"
import "./firstLight.css"
import type { Env, Source } from "./model"
import type { Preset } from "./open"
import { ProblemCallout } from "./ProblemCallout"
import { SourcePanel } from "./SourcePanel"
import { SourceRail } from "./SourceRail"
import type { Focus } from "./states"
import { useFirstLight } from "./useFirstLight"

/** A signed-in account online needs no storage line */
export const hasStorageLine = (env: Env) => !env.online || env.account !== "in"

/** The storage line under the title, as the account stands */
export function StorageLine({ env }: { env: Env }) {
  if (!env.online)
    return (
      <>
        <StatusDot variant="warning" className="mr-2 align-middle" />
        You're offline. Your project saves in this browser and syncs when you're back.
      </>
    )
  if (env.account === "ended") return <>Free. Your project saves in this browser until you sign in again.</>
  return <>Free, no account needed. Your project saves in this browser.</>
}

/** First Light (research/new-project-redesign/CONSENSUS.md, section 3): one dialog for every way to
 * make a project, opened with Anchor picked, a free name and a button that says what it makes. The
 * four sources on the left, the choice on the right, the name and the one button at the foot. The
 * body never changes size. Mounted afresh for each opening; `forced` seeds a bar state */
export function FirstLight({ open, onClose, forced, preset }: { open: boolean; onClose: () => void; forced?: NextStateId; preset?: Preset }) {
  const flow = useFirstLight(forced, preset, onClose)
  const { s, dispatch, env, seed, closing, held, primaryRef, creating, fetching, busy, main, failed, create, cancel, retry, enterCreates } = flow
  const { dispatch: go } = useStore()

  const urlRef = useRef<HTMLInputElement>(null)
  const boxRef = useRef<HTMLTextAreaElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [scrollRef] = useScrollEdges<HTMLDivElement>([s.source, s.import.state, s.run.state])

  const focusField = (source: Source) =>
    requestAnimationFrame(() => {
      const el = source === "import" ? urlRef.current : source === "describe" ? boxRef.current : source === "example" ? contentRef.current?.querySelector<HTMLInputElement>("input[type=search]") : null
      el?.focus()
    })

  const focusOnOpen = (focus: Focus = "card") => {
    const root = contentRef.current
    if (!root) return
    const pick = root.querySelector<HTMLElement>('[role=tabpanel] [role=radio][data-state=checked]') ?? root.querySelector<HTMLElement>("[role=tabpanel] [role=radio]")
    const target: HTMLElement | null | undefined = {
      card: pick,
      search: root.querySelector<HTMLInputElement>("input[type=search]"),
      url: urlRef.current,
      box: boxRef.current,
      retry: root.querySelector<HTMLElement>("[role=alert] button:not(:disabled)"),
    }[focus]
    ;(target ?? pick ?? root).focus()
    // A held card can't take focus: the dialog keeps it
    if (!root.contains(document.activeElement)) root.focus()
  }


  // The picked card stays in view above a create failure
  useEffect(() => {
    if (failed) contentRef.current?.querySelector("[role=tabpanel] [data-picked]")?.scrollIntoView({ block: "nearest" })
  }, [failed])

  return (
    <Modal
      open={open && !closing}
      onOpenChange={(next) => {
        if (next || creating) return
        cancel()
        onClose()
      }}
    >
      <ModalContent
        ref={contentRef}
        style={{ boxShadow: "var(--np-shadow)" }}
        className="np-dialog overflow-hidden md:w-[min(var(--np-width),calc(100vw-2rem))] md:data-closed:duration-150"
        onOpenAutoFocus={(e) => {
          e.preventDefault()
          requestAnimationFrame(() => focusOnOpen(seed?.focus))
        }}
        onEscapeKeyDown={(e) => {
          if (creating) e.preventDefault()
          else if (fetching) {
            e.preventDefault()
            cancel()
          }
        }}
        onInteractOutside={(e) => creating && e.preventDefault()}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            create()
          }
        }}
      >
        <ModalHeader className="pb-4">
          <ModalTitle className="leading-[1.625rem] font-normal">New project</ModalTitle>
          {hasStorageLine(env) && (
            <ModalDescription className="truncate text-[0.8125rem] leading-[1.125rem]">
              <StorageLine env={env} />
            </ModalDescription>
          )}
        </ModalHeader>

        <Tabs.Root
          value={s.source}
          onValueChange={(v) => dispatch({ type: "source", source: v as Source })}
          orientation="vertical"
          activationMode="automatic"
          className="grid h-[calc(var(--np-body)+1px)] shrink-0 grid-cols-[var(--np-rail)_1fr] border-t border-border"
        >
          <SourceRail
            value={s.source}
            env={env}
            into={!!s.into}
            busy={busy}
            onPointerPick={focusField}
            onTutorial={() => {
              onClose()
              go({ type: "open", screen: "gallery" })
            }}
          />
          <div className="flex min-h-0 min-w-0 flex-col p-6">
            {/* 12 to the sides, so a list row's hover can reach past the column's edge without being clipped */}
            <div ref={scrollRef} className="fade-edges -mx-3 -my-1 min-h-0 flex-1 overflow-y-auto px-3 py-1 [--fade-size:24px] [scrollbar-width:none]">
              <Tabs.Content value={s.source} className={cn("animate-menu-in outline-none", (s.source === "starter" || s.source === "describe") && "h-full")}>
                {/* The four cards share the body's height, so the taller body leaves no band under them */}
                {s.source === "starter" && (
                  <RadioGroup.Root
                    aria-label="Framework"
                    value={s.framework}
                    onValueChange={(v) => dispatch({ type: "framework", framework: v as FrameworkId })}
                    onKeyDown={enterCreates}
                    disabled={busy}
                    className="grid h-full grid-cols-2 grid-rows-2 gap-3"
                  >
                    {FRAMEWORKS.map((x) => (
                      <FrameworkCard key={x.id} f={x} picked={x.id === s.framework} dim={creating && x.id !== s.framework} />
                    ))}
                  </RadioGroup.Root>
                )}
                <SourcePanel flow={flow} urlRef={urlRef} boxRef={boxRef} />
              </Tabs.Content>
            </div>
            {failed && (
              <ProblemCallout
                tone="error"
                inline
                title="Could not create the project."
                primary={{ label: "Try again", onClick: retry }}
                details={failed.error}
                open={failed.details}
                onToggle={() => dispatch({ type: "details" })}
                className="mt-3 shrink-0"
              />
            )}
          </div>
        </Tabs.Root>

        <footer className="flex shrink-0 items-start justify-between gap-4 border-t border-border px-6 py-4">
          {s.into ? (
            <p className="flex h-10 items-center gap-3 text-[0.8125rem] text-muted-foreground">
              {`Adds files to ${s.into}.`}
              <button type="button" onClick={() => dispatch({ type: "into" })} className="font-act text-foreground hover:underline">
                Make a new project instead
              </button>
            </p>
          ) : null}
          <div className="ml-auto flex items-center gap-2">
            {/* In Describe Enter is a new line, so the way to send is said where it's needed. Not under a finger */}
            {s.source === "describe" && main.enabled && (
              <KbdGroup aria-hidden="true" className="mr-2 [html.touch_&]:hidden">
                <Kbd>⌘</Kbd>
                <Kbd>↵</Kbd>
              </KbdGroup>
            )}
            {fetching && (
              <Button variant="ghost" onClick={cancel} className="h-9 [html.touch_&]:h-11">
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
              style={busy && held ? { width: held } : undefined}
              className={cn("min-w-[200px] [html.touch_&]:h-11", busy && "np-busy opacity-100!")}
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
        </footer>
      </ModalContent>
    </Modal>
  )
}
