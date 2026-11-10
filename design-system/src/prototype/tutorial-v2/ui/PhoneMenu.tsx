import { useState, type ReactNode } from "react"
import { Menu, X } from "lucide-react"
import { Dialog } from "radix-ui"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { useOpenTutorial, useStartedLessons } from "../host"
import { toCatalog } from "../programs"
import { useStore } from "../store"
import { LitIcon, type LitIconName } from "../desktop/navLit/icons"
import { openNewProject } from "../desktop/NewProject"
import { TopBar } from "./TopBar"
import { LitNav } from "../desktop/navLit/LitNav"
import { useNavDesign } from "../navStates"
import { view } from "../view"

const soon = () => toast("Only the tutorial flow is in this prototype")

// Each group drops in 8px behind the one above it. Reduced motion keeps only the layer's fade
const ENTER = "animate-in fade-in-0 slide-in-from-top-2 duration-200 ease-out fill-mode-both motion-reduce:animate-none"

function Row({ glyph, label, current = false, big = false, onClick }: { glyph: ReactNode; label: string; current?: boolean; big?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={current ? "page" : undefined}
      className={cn(
        // The desktop sidebar's row at a thumb's size: glyph and label, the current one on a filled pill.
        // The 8px inset puts every glyph on the page's 16px edge
        "flex w-full items-center gap-3 rounded-lg px-2 text-left transition-colors outline-none active:bg-foreground/[0.05] focus-visible:outline-2 focus-visible:outline-solid focus-visible:-outline-offset-2 focus-visible:outline-brand-purple [&>span:first-child]:size-5",
        big ? "h-12 text-[1.0625rem]" : "h-11 text-[0.9375rem]",
        current ? "bg-surface-hover font-medium text-foreground active:bg-surface-hover" : "text-muted-foreground"
      )}
    >
      <span aria-hidden="true" className="flex shrink-0 items-center justify-center [&>svg]:size-full">
        {glyph}
      </span>
      {label}
    </button>
  )
}

/** The product's navigation on a phone: the menu button opens the desktop sidebar's rows over the whole
 * screen, and its X takes the menu button's own spot, so the same tap closes it. Nothing of the page
 * shows behind, so the layer runs under the status bar too and needs no scrim */
export function PhoneMenu() {
  const { s, dispatch } = useStore()
  const [open, setOpen] = useState(false)
  const design = useNavDesign()
  // The upright tablet slides the nav in from the left over the dimmed page, as an iPad's sidebar
  // does: a full screen menu left wide empty sides there and hid where you were (Almaz, 11/09)
  const drawer = view === "portrait" && design === "lit"
  const [searching, setSearching] = useState(false)
  const inProject = s.screen === "step" || s.screen === "finish"
  const go = (then: () => void) => () => {
    setOpen(false)
    then()
  }
  const destinations: { label: string; icon: LitIconName; current: boolean; onClick: () => void }[] = [
    { label: "Home", icon: "home", current: false, onClick: go(soon) },
    { label: "New project", icon: "new", current: false, onClick: go(openNewProject) },
    { label: "Tutorials", icon: "tutorials", current: !inProject && s.screen !== "programs", onClick: go(() => dispatch({ type: "open", screen: "gallery" })) },
    {
      label: "Programs",
      icon: "programs",
      current: s.screen === "programs",
      onClick: go(() => {
        toCatalog()
        dispatch({ type: "open", screen: "programs" })
      }),
    },
  ]
  const started = useStartedLessons()
  const openTutorial = useOpenTutorial()
  const lessons = new Map(started.map((l) => [l.name, l]))
  const projects = ["Counter", "Token Faucet", "Voting", "Tip Jar", ...started.map((l) => l.name)]

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="ghost" size="icon" className="size-11" aria-label="Menu">
          <Menu strokeWidth={1.75} className="size-6" />
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        {drawer && (
          <Dialog.Overlay className={cn("fixed inset-0 z-50 bg-black/50 data-open:animate-in data-open:fade-in-0 data-open:duration-200 data-closed:animate-out data-closed:fade-out-0 data-closed:duration-150 motion-reduce:duration-100!", searching && "invisible")} />
        )}
        {/* No first row taken on open: a tap had Home ringed as if it were the page. The layer itself
            holds the focus, so Tab still starts at the top */}
        <Dialog.Content
          aria-describedby={undefined}
          onOpenAutoFocus={(e) => {
            e.preventDefault()
            ;(e.currentTarget as HTMLElement).focus()
          }}
          className={cn(
            "fixed z-50 pt-[env(safe-area-inset-top)] text-foreground outline-none data-open:animate-in data-open:duration-200 data-open:ease-out data-closed:animate-out data-closed:duration-150 data-closed:ease-in motion-reduce:duration-100!",
            drawer && searching && "invisible",
            drawer
              ? "inset-y-0 left-0 w-80 border-r border-border bg-(--nav-ground) shadow-modal data-open:slide-in-from-left data-closed:slide-out-to-left motion-reduce:data-open:slide-in-from-left-0 motion-reduce:data-closed:slide-out-to-left-0"
              : "inset-0 bg-surface-base data-open:fade-in-0 data-closed:fade-out-0"
          )}
        >
          <Dialog.Title className="sr-only">Menu</Dialog.Title>
          {/* The page's own column, so the X sits exactly on the menu button (the drawer starts at the
              screen's edge, so its X lands there too) */}
          <div className={cn("flex h-full w-full flex-col", !drawer && "mx-auto max-w-[30rem]")}>
            <TopBar
              left={
                <Dialog.Close asChild>
                  <Button variant="ghost" size="icon" className="size-11" aria-label="Close menu">
                    <X strokeWidth={1.75} className="size-6 animate-in spin-in-[-90deg] fade-in-0 duration-[160ms] ease-out motion-reduce:animate-none" />
                  </Button>
                </Dialog.Close>
              }
            />
            {/* Lit Path draws the same nav the desktop has, its open column at a thumb's size */}
            {design === "lit" && (
              <div className={cn(ENTER, "min-h-0 flex-1 pb-[var(--safe-bottom)]")}>
                <LitNav sheet={{ onClose: () => setOpen(false), onSearch: drawer ? setSearching : undefined }} />
              </div>
            )}
            {design !== "lit" && (
              <>
                <nav aria-label="Main" className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-2 pt-1 pb-4">
                  <div className={ENTER}>
                    {destinations.map((d) => (
                      <Row key={d.label} big glyph={<LitIcon name={d.icon} />} label={d.label} current={d.current} onClick={d.onClick} />
                    ))}
                  </div>
                  <div className={cn(ENTER, "delay-40")}>
                    <p className="mt-6 mb-1 px-2 text-caption text-muted-foreground">Projects</p>
                    {projects.map((name) => (
                      <Row
                        key={name}
                        glyph={<LitIcon name="project" />}
                        label={name}
                        current={!!lessons.get(name)?.open && inProject}
                        onClick={go(lessons.has(name) ? () => openTutorial(lessons.get(name)!.slug) : soon)}
                      />
                    ))}
                  </div>
                </nav>
                {/* The network and the account share one row under a rule, clear of the home indicator */}
                <div className={cn(ENTER, "delay-80 flex h-[calc(56px+var(--safe-bottom))] shrink-0 items-start justify-between border-t border-border px-2 pt-1.5")}>
                  <button
                    type="button"
                    onClick={go(soon)}
                    className="flex h-11 items-center gap-2.5 rounded-lg px-2 text-[0.9375rem] text-muted-foreground outline-none active:bg-foreground/[0.05] focus-visible:outline-2 focus-visible:outline-solid focus-visible:-outline-offset-2 focus-visible:outline-brand-purple"
                  >
                    <span aria-hidden="true" className="size-2 rounded-full bg-success" />
                    Devnet
                  </button>
                  <button
                    type="button"
                    onClick={go(soon)}
                    className="flex h-11 items-center gap-2.5 rounded-lg px-2 text-[0.9375rem] text-muted-foreground outline-none active:bg-foreground/[0.05] focus-visible:outline-2 focus-visible:outline-solid focus-visible:-outline-offset-2 focus-visible:outline-brand-purple [&>svg]:size-5"
                  >
                    <LitIcon name="profile" />
                    Sign in
                  </button>
                </div>
              </>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
