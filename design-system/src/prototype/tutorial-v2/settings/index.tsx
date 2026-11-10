import { Dialog as DialogPrimitive } from "radix-ui"
import { useCallback, useEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"

import { view } from "../view"
import { SCENES, type Scene } from "./bar"
import { onSettingsPick, readSettingsState, setSettingsState, type SettingsState } from "./design"
import { onOpen, openSettings, openShortcuts, takeOpener, takeRequest, type Request } from "./open"
import { SettingsPage } from "./SettingsPage"
import { ShortcutsDialog } from "./Shortcuts"
import { EscapeCtx } from "./UrlField"
import "./settings.css"

const PHONE = view === "phone" || view === "portrait"
/** The upright tablet opens Settings as a sheet over the dimmed page, as an iPad's form sheet (Almaz, 11/09) */
const SHEET = view === "portrait"

/** The desktop tab draws the prototype bar in the same page: the layer starts under it, so the bar's
 * states stay in reach while Settings is open */
const underBar = () => !!document.querySelector('header[aria-label="Prototype controls"]')

/** Settings and the shortcuts overlay, mounted once beside the screens on every view. On Desktop and
 * Tablet 1152 Settings covers the screen's pane only and the nav stays live beside it: with no section
 * list there's no reason for a page of its own, and any place in the nav is the way out. On the phone
 * views it's a full window page. Either way the app stays mounted under it, so a lesson, its draft and a
 * running build keep their state. ⌘, opens and closes it anywhere, ? opens the shortcuts where there's a
 * keyboard. While it's open the app under it hears no keys: ⌘K and ⌘B do nothing */
export function SettingsLayer() {
  const [open, setOpen] = useState(false)
  const [shortcuts, setShortcuts] = useState(false)
  const [session, setSession] = useState(0)
  const [scene, setScene] = useState<Scene>({})
  const [request, setRequest] = useState<Request>({})
  const openNow = useRef(false)
  openNow.current = open
  // Closed by a click in the nav: the focus stays where that click put it
  const leftByNav = useRef(false)

  // Escape goes to the innermost thing first: an open URL field (a check cancels), then the page
  const escapes = useRef<(() => boolean)[]>([])
  const register = useCallback((fn: () => boolean) => {
    escapes.current.push(fn)
    return () => {
      escapes.current = escapes.current.filter((f) => f !== fn)
    }
  }, [])

  const show = (s: Scene, r: Request) => {
    setScene(s)
    setRequest(r)
    setSession((n) => n + 1)
    setShortcuts(false)
    setOpen(true)
  }

  // Closing a state the bar forced goes back to Closed, so a reload doesn't open it again
  const close = () => {
    setOpen(false)
    if (readSettingsState() !== "closed") setSettingsState("closed")
  }
  const closeShortcuts = (v: boolean) => {
    setShortcuts(v)
    if (!v && readSettingsState() === "shortcuts") setSettingsState("closed")
  }

  const apply = (id: SettingsState) => {
    if (id === "closed") {
      setOpen(false)
      setShortcuts(false)
    } else if (id === "shortcuts" && !PHONE) {
      setOpen(false)
      setShortcuts(true)
    } else {
      const s = SCENES[id] ?? {}
      show(s, { section: s.section, rpcForm: s.rpcForm })
    }
  }

  useEffect(() => {
    // A state the bar or the address put Oak in opens as the page loads
    const id = readSettingsState()
    if (id !== "closed") apply(id)
    const offPick = onSettingsPick(() => apply(readSettingsState()))
    const offSettings = onOpen("settings", () => show({}, takeRequest()))
    const offShortcuts = onOpen("shortcuts", () => setShortcuts(true))

    // On the document, so the page's own controls have had the key first and the app's window listeners
    // (⌘K, ⌘B, the lesson's keys) never hear it while Settings is open
    const onKey = (e: KeyboardEvent) => {
      const mod = (e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey
      if (mod && e.key === ",") {
        e.preventDefault()
        e.stopPropagation()
        if (openNow.current) close()
        else openSettings()
        return
      }
      if (openNow.current) return e.stopPropagation()
      const field = e.target instanceof HTMLElement && !!e.target.closest("textarea, input, [contenteditable]")
      if (e.key === "?" && !PHONE && !field && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        openShortcuts()
      }
    }
    document.addEventListener("keydown", onKey)
    return () => {
      offPick()
      offSettings()
      offShortcuts()
      document.removeEventListener("keydown", onKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const giveBack = (e: Event) => {
    e.preventDefault()
    if (leftByNav.current) {
      leftByNav.current = false
      takeOpener()
      return
    }
    takeOpener()?.focus()
  }

  // The screen's pane, which Settings covers on the wide views (desktop/DesktopApp.tsx)
  const pane = PHONE ? null : document.getElementById("oak-screen")

  // While Settings fills the pane, no place in the nav reads as the one you're on (settings.css)
  useEffect(() => {
    if (PHONE) return
    document.documentElement.classList.toggle("oak-settings-open", open)
  }, [open])

  return (
    <>
      <DialogPrimitive.Root open={open} onOpenChange={(v) => !v && close()} modal={!pane}>
        <DialogPrimitive.Portal container={pane}>
          {SHEET && <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-open:animate-in data-open:fade-in-0 data-open:duration-200 data-closed:animate-out data-closed:fade-out-0 data-closed:duration-150" />}
          <DialogPrimitive.Content
            aria-describedby={undefined}
            // The layer takes the focus, with no ring, as Connect a model does; opened for a custom RPC, the field
            onOpenAutoFocus={(e) => {
              e.preventDefault()
              const el = e.currentTarget as HTMLElement
              ;(el.querySelector<HTMLElement>("input[aria-label='RPC URL']") ?? el).focus()
            }}
            onEscapeKeyDown={(e) => {
              const inner = escapes.current.at(-1)
              if (inner?.()) e.preventDefault()
            }}
            // Beside the nav, a click in the nav leaves Settings for where it goes; anything else (the
            // prototype bar, a toast, a Select's list) leaves it open. Focus alone never closes it: the
            // account menu hands its focus back to the account row as Settings opens from it
            onFocusOutside={(e) => e.preventDefault()}
            onPointerDownOutside={(e) => {
              const inNav = e.target instanceof Element && !!e.target.closest('nav[aria-label="Main"]')
              if (SHEET) return
              if (!pane || !inNav) return e.preventDefault()
              leftByNav.current = true
            }}
            onCloseAutoFocus={giveBack}
            className={SHEET ? "fixed inset-0 z-50 m-auto h-[min(38rem,calc(100%-6rem))] w-[40rem] overflow-hidden rounded-[20px] border border-border bg-surface-base text-foreground shadow-modal outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-[0.97] data-open:duration-200 data-open:ease-out data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-[0.97] data-closed:duration-150 motion-reduce:zoom-in-100 motion-reduce:zoom-out-100" : cn(
              "inset-0 z-50 bg-surface-base text-foreground outline-none ease-standard",
              pane ? "absolute" : "fixed",
              !pane && underBar() && "top-10",
              PHONE
                ? "pt-[env(safe-area-inset-top)] duration-(--duration-sheet) data-open:animate-in data-open:slide-in-from-right data-closed:animate-out data-closed:slide-out-to-right motion-reduce:[--tw-enter-translate-x:0] motion-reduce:[--tw-exit-translate-x:0] motion-reduce:data-open:fade-in-0 motion-reduce:data-closed:fade-out-0"
                : "data-open:animate-in data-open:fade-in-0 data-open:duration-160 data-closed:animate-out data-closed:fade-out-0 data-closed:duration-120"
            )}
          >
            <DialogPrimitive.Title className="sr-only">Settings</DialogPrimitive.Title>
            {/* The phone app's own column, as the menu sheet has it */}
            <div className={cn("h-full", view === "phone" && "mx-auto max-w-[30rem]")}>
              <EscapeCtx.Provider value={register}>
                <SettingsPage key={session} scene={scene} section={request.section} rpcForm={!!request.rpcForm} onClose={close} />
              </EscapeCtx.Provider>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
      <ShortcutsDialog open={shortcuts} onOpenChange={closeShortcuts} onCloseAutoFocus={giveBack} />
    </>
  )
}
