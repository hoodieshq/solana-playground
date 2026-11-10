import { ChevronLeft, X } from "lucide-react"
import { useEffect, useRef, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { PhoneBar, PhoneBarEnd, PhoneBarStart, PhoneBarTitle } from "@/components/ui/phone-bar"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

import { useScrollEdges } from "../desktop/navLit/useScrollEdges"
import { view } from "../view"
import { useNavState } from "../navStates"
import { AccountGroup } from "./AccountGroup"
import { Advanced } from "./Advanced"
import { AssistantGroup } from "./AssistantGroup"
import type { Scene } from "./bar"
import { NetworkGroup } from "./NetworkGroup"
import type { Section } from "./open"
import { GROUP_TITLE, PhoneCtx, Row } from "./Row"
import { setSetting, useSettings } from "./store"

/** A titled group: space above it parts it from the last one, never a rule or a box */
function Group({ id, title, children }: { id: Section; title?: ReactNode; children: ReactNode }) {
  return (
    <section data-section={id} aria-label={typeof title === "string" ? title : undefined} className="mt-10 scroll-mt-4 [html.phone_&]:mt-6">
      {typeof title === "string" ? <h2 className={cn(GROUP_TITLE, "mb-2 [html.phone_&]:mb-1")}>{title}</h2> : title}
      {children}
    </section>
  )
}

/** Settings as Clear Desk lays it (CONSENSUS 3 and 5): one centred column, the same on every view.
 * Word wrap untitled at the top, then Assistant, Network and the folded Advanced. Every value
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
      <div data-oak-settings className="flex h-full flex-col">
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
            className={cn("mx-auto w-full max-w-[35rem]", view === "phone" ? "px-4 pt-2 pb-[calc(var(--safe-bottom)+24px)]" : phone ? "px-6 pt-2 pb-[calc(var(--safe-bottom)+24px)]" : "px-6 pb-24")}
          >
            {/* Beside the nav there's no Back to app: the nav, Escape and ⌘, close it */}
            {!phone && <h1 className="mt-16 mb-8 font-heading text-display font-normal text-foreground">Settings</h1>}

            <section data-section="top" aria-label="Appearance">
              {/* The name alone didn't say what it does (Almaz, 10 Nov) */}
              <Row label="Word wrap" htmlFor="oak-wrap" help="Break long lines of code to fit the editor instead of scrolling sideways">
                <Switch id="oak-wrap" checked={settings.wordWrap} onCheckedChange={(v) => setSetting("wordWrap", v)} />
              </Row>
            </section>

            <Group id="assistant" title="Assistant">
              <AssistantGroup scene={scene} />
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
