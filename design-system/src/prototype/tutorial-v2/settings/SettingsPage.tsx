import { ChevronLeft, X } from "lucide-react"
import { useEffect, useRef, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { PhoneBar, PhoneBarEnd, PhoneBarStart, PhoneBarTitle } from "@/components/ui/phone-bar"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

import { LitGround } from "../desktop/Gallery"
import { useScrollEdges } from "../desktop/navLit/useScrollEdges"
import { view } from "../view"
import { useNavState } from "../navStates"
import { AccountGroup } from "./AccountGroup"
import { Advanced } from "./Advanced"
import { AssistantGroup } from "./AssistantGroup"
import type { Scene } from "./bar"
import { NetworkGroup } from "./NetworkGroup"
import type { Section } from "./open"
import { GROUP_PANEL, GROUP_TITLE, PhoneCtx, Row } from "./Row"
import { setSetting, setSole, useSettings } from "./store"

/** A titled group: its head, then its rows on one panel. Advanced brings its own head, which folds it,
 * and its own panel under it */
function Group({ id, title, children }: { id: Section; title?: string; children: ReactNode }) {
  return (
    <section data-section={id} aria-label={title} className="mt-8 scroll-mt-4 first:mt-0 [html.phone_&]:mt-6">
      {title ? (
        <>
          <h2 className={cn(GROUP_TITLE, "mb-2.5 flex min-h-9 items-center")}>{title}</h2>
          <div className={GROUP_PANEL}>{children}</div>
        </>
      ) : (
        children
      )}
    </section>
  )
}

/** Settings as Clear Desk lays it (CONSENSUS 3 and 5): one column, the same on every view, in the
 * frame Home, Tutorials and Programs share (Almaz, 10 Nov): the lit ground, their column and heading,
 * each group a head and one panel of rows. Editor, Assistant, Network and the folded Advanced. Every value
 * applies on change, so there's no save and nothing says it saved */
export function SettingsPage({ scene, section, rpcForm, onClose }: { scene: Scene; section?: Section; rpcForm: boolean; onClose: () => void }) {
  const phone = view === "phone" || view === "portrait"
  const settings = useSettings()
  const [, nav] = useNavState()
  const box = useRef<HTMLDivElement>(null)
  const edges = useScrollEdges(box)

  // Opened at a group (⌘K's "mainnet", Add custom RPC), that group comes into view, lit once on the desktop
  useEffect(() => {
    const at = section ?? scene.section
    if (!at || at === "top") return
    requestAnimationFrame(() => {
      const el = box.current?.querySelector<HTMLElement>(`[data-section="${at}"]`)
      if (!el) return
      el.scrollIntoView({ block: "start" })
      if (!phone) el.classList.add("animate-anchor-flash")
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <PhoneCtx.Provider value={phone}>
      <div data-oak-settings className="relative isolate flex h-full flex-col overflow-hidden">
        {!phone && <LitGround />}
        {/* A sheet on the upright tablet: the title first and ✕ at the end, as New project's sheet has it */}
        {view === "portrait" ? (
          <PhoneBar>
            <PhoneBarTitle>Settings</PhoneBarTitle>
            <PhoneBarEnd>
              <Button variant="ghost" size="icon" aria-label="Close settings" onClick={onClose} className="size-11">
                <X strokeWidth={1.75} className="size-5" />
              </Button>
            </PhoneBarEnd>
          </PhoneBar>
        ) : phone ? (
          <PhoneBar>
            <PhoneBarStart>
              <Button variant="ghost" size="icon" aria-label="Back to app" onClick={onClose} className="size-11">
                <ChevronLeft strokeWidth={1.75} className="size-6" />
              </Button>
            </PhoneBarStart>
            <PhoneBarTitle>Settings</PhoneBarTitle>
          </PhoneBar>
        ) : null}
        {/* A fade under the bar instead of a rule, only while the page is scrolled */}
        <div ref={box} data-more-top={edges.top || undefined} data-more-bottom={edges.bottom || undefined} className="fade-edges min-h-0 flex-1 overflow-y-auto overscroll-contain [--fade-size:24px]">
          <div
            className={cn("mx-auto w-full", view === "phone" ? "max-w-[35rem] px-4 pt-2 pb-[calc(var(--safe-bottom)+24px)]" : phone ? "px-4 pt-2 pb-[calc(var(--safe-bottom)+24px)]" : "max-w-[50rem] px-8 pt-8 pb-24")}
          >
            {/* Beside the nav there's no Back to app: the nav, Escape and ⌘, close it */}
            {!phone && <h1 className="mt-6 mb-8 flex min-h-8 items-center font-heading text-28 font-normal tracking-tight text-foreground">Settings</h1>}

            <Group id="top" title="Editor">
              {/* The name alone didn't say what it does (Almaz, 10 Nov) */}
              <Row label="Word wrap" htmlFor="oak-wrap" help="Break long lines of code to fit the editor instead of scrolling sideways">
                <Switch id="oak-wrap" checked={settings.wordWrap} onCheckedChange={(v) => setSetting("wordWrap", v)} />
              </Row>
            </Group>

            <Group id="assistant" title="Assistant">
              <AssistantGroup scene={scene} />
              {/* The cat that sits on the assistant's field while a chat is empty. The assistant turns it off too, when asked */}
              <Row label="Sole the cat" htmlFor="oak-sole">
                <Switch id="oak-sole" checked={settings.sole} onCheckedChange={setSole} />
              </Row>
            </Group>

            <Group id="network" title="Network">
              <NetworkGroup scene={scene} rpcForm={rpcForm} />
            </Group>

            <Group id="advanced">
              <Advanced open={!!scene.advanced || section === "advanced"} />
            </Group>

            {nav.account?.session === "in" && (
              <Group id="account" title="Account">
                <AccountGroup account={nav.account} confirm={!!scene.confirmAccountDelete} />
              </Group>
            )}
          </div>
        </div>
      </div>
    </PhoneCtx.Provider>
  )
}
