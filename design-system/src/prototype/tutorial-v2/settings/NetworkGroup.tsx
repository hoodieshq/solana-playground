import { Plus } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Segmented, SegmentedItem } from "@/components/ui/segmented"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

import { isMainnet, maskUrl, networksFor, rpcLabel, setChoices, useChoices } from "../desktop/navLit/choices"
import { useNavState } from "../navStates"
import { view } from "../view"
import type { Scene } from "./bar"
import { Row, usePhone } from "./Row"
import { setSetting, useSettings } from "./store"
import { SlotLine, UrlField } from "./UrlField"

/** Network (CONSENSUS 3.3): the networks as chips with the saved RPCs after them, "+ Custom" at the end,
 * one line slot under them, then free test SOL. It writes the store the Status popover and Get set up
 * read, so a pick here shows there */
export function NetworkGroup({ scene, rpcForm }: { scene: Scene; rpcForm: boolean }) {
  const phone = usePhone()
  const c = useChoices()
  const [navId] = useNavState()
  const settings = useSettings()
  const [field, setField] = useState(rpcForm || !!scene.field)
  const [removed, setRemoved] = useState(scene.removed ? { ...scene.removed, at: 0, hold: true } : null)
  const [fresh, setFresh] = useState<string | null>(null)
  const timer = useRef(0)

  // "Removed" stays 5 s, then the slot empties; a forced state holds it so it can be looked at
  useEffect(() => {
    if (!removed || removed.hold) return
    timer.current = window.setTimeout(() => setRemoved(null), 5000)
    return () => clearTimeout(timer.current)
  }, [removed])

  const list = networksFor(view, c)
  const mainnet = isMainnet(c)
  const rpc = c.rpcs.find((r) => rpcLabel(r.url, c.rpcs) === c.network)
  const chip = phone ? "h-9 px-3" : "[html.touch_&]:h-9 [html.touch_&]:px-3"

  const pick = (name: string) => {
    setChoices({ network: name, picked: true })
    setRemoved(null)
  }

  const use = (url: string) => {
    const saved = c.rpcs.find((r) => r.url === url)
    const rpcs = saved ? c.rpcs : [...c.rpcs, { url }]
    setChoices({ rpcs, network: rpcLabel(url, rpcs), picked: true })
    if (!saved) setFresh(url)
    setRemoved(null)
    setField(false)
  }

  const remove = (url: string) => {
    const at = c.rpcs.findIndex((r) => r.url === url)
    setChoices({ rpcs: c.rpcs.filter((r) => r.url !== url), network: "Devnet" })
    setRemoved({ url, label: rpcLabel(url, c.rpcs), at, hold: false })
  }

  const undo = () => {
    if (!removed) return
    const rpcs = [...c.rpcs]
    rpcs.splice(removed.at, 0, { url: removed.url })
    setChoices({ rpcs, network: rpcLabel(removed.url, rpcs), picked: true })
    setRemoved(null)
  }

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-2 py-2">
        {/* The chips and "+ Custom" wrap as one row: the group draws no box of its own */}
        <div className="flex flex-wrap items-center gap-2">
          <Segmented variant="chips" aria-label="Network" value={c.network} onValueChange={pick} className="contents">
            {list.map((n) => (
              <SegmentedItem key={n.name} value={n.name} title={n.url ? maskUrl(n.url) : undefined} className={cn(chip, n.url && "max-w-40", n.url === fresh && "animate-print")}>
                <span className="truncate">{n.name}</span>
              </SegmentedItem>
            ))}
          </Segmented>
          {!field && (
            <Button variant="ghost" size="sm" onClick={() => setField(true)} className={cn("text-muted-foreground", phone && "h-9")}>
              <Plus data-icon="inline-start" />
              Custom
            </Button>
          )}
        </div>
        {field ? (
          <UrlField label="RPC URL" initial={scene.field} offline={navId === "offline"} known={(url) => c.rpcs.some((r) => r.url === url)} onUse={use} onClose={() => setField(false)} />
        ) : (
          (mainnet || rpc || removed) && (
            <div className="flex flex-col gap-1">
              {mainnet && <SlotLine key="mainnet">Deploys with real SOL</SlotLine>}
              {rpc && (
                <div key={rpc.url} className="flex min-h-5 items-center gap-2 duration-120 animate-in fade-in-0 motion-reduce:animate-none">
                  <span className="min-w-0 truncate font-mono text-[0.75rem] leading-5 text-muted-foreground">{maskUrl(rpc.url)}</span>
                  <Button variant="quiet" size="xs" onClick={() => remove(rpc.url)} className="shrink-0">
                    Remove
                  </Button>
                </div>
              )}
              {removed && (
                <div key="removed" className="flex min-h-5 items-center gap-2 text-[0.8125rem] leading-5 font-read text-muted-foreground duration-120 animate-in fade-in-0 motion-reduce:animate-none">
                  <span className="min-w-0 truncate">{`Removed ${removed.label}`}</span>
                  <Button variant="quiet" size="xs" onClick={undo} className="shrink-0">
                    Undo
                  </Button>
                </div>
              )}
            </div>
          )
        )}
      </div>
      {/* Nothing to airdrop where SOL is real */}
      {!mainnet && (
        <Row label="Free test SOL when you run low" htmlFor="oak-airdrop">
          <Switch id="oak-airdrop" checked={settings.airdrop} onCheckedChange={(v) => setSetting("airdrop", v)} />
        </Row>
      )}
    </div>
  )
}
