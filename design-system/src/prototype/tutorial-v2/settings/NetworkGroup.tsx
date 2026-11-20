import { Ellipsis, Plus } from "lucide-react"
import { useContext, useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Segmented, SegmentedItem } from "@/components/ui/segmented"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

import { isMainnet, maskUrl, networksFor, rpcLabel, setChoices, useChoices } from "../desktop/navLit/choices"
import { useNavState } from "../navStates"
import { view } from "../view"
import type { Scene } from "./bar"
import { Row, usePhone } from "./Row"
import { setSetting, useSettings } from "./store"
import { EscapeCtx, SlotLine, UrlField } from "./UrlField"

/** Network (CONSENSUS 3.3): Solana's networks as chips, then your own RPCs as a list under them, each
 * with its name and its whole address, one line slot, then free test SOL. A saved RPC was a chip among
 * the networks, worded by its domain: it read as one more network, and two on one domain were twins
 * (Sergey, 11 Nov). It writes the store the Status popover and Get set up read, so a pick here shows there */
export function NetworkGroup({ scene, rpcForm }: { scene: Scene; rpcForm: boolean }) {
  const phone = usePhone()
  const c = useChoices()
  const [navId] = useNavState()
  const settings = useSettings()
  const [field, setField] = useState(rpcForm || !!scene.field)
  // The name typed in the form, for the RPC being added
  const [name, setName] = useState("")
  const [removed, setRemoved] = useState<{ url: string; name?: string; label: string; at: number; hold: boolean } | null>(
    scene.removed ? { ...scene.removed, at: 0, hold: true } : null
  )
  const [fresh, setFresh] = useState<string | null>(null)
  // The saved RPC whose name is a field, and what's typed in it
  const [naming, setNaming] = useState<{ url: string; value: string } | null>(null)
  const timer = useRef(0)
  const nameField = useRef<HTMLInputElement>(null)
  const escape = useContext(EscapeCtx)
  const renaming = naming !== null

  // Escape leaves the name as it was
  useEffect(() => {
    if (!renaming) return
    return escape(() => (setNaming(null), true))
  }, [escape, renaming])

  // "Removed" stays 5 s, then the slot empties; a forced state holds it so it can be looked at
  useEffect(() => {
    if (!removed || removed.hold) return
    timer.current = window.setTimeout(() => setRemoved(null), 5000)
    return () => clearTimeout(timer.current)
  }, [removed])

  const own = networksFor(view, c).filter((n) => !n.url)
  const mainnet = isMainnet(c)
  const chip = phone ? "h-9 px-3" : "[html.touch_&]:h-9 [html.touch_&]:px-3"

  const pick = (id: string) => {
    setChoices({ network: id, picked: true })
    setRemoved(null)
  }

  const open = () => {
    setName("")
    setField(true)
  }

  const use = (url: string) => {
    const saved = c.rpcs.some((r) => r.url === url)
    setChoices({ rpcs: saved ? c.rpcs : [...c.rpcs, { url, name: name.trim() || undefined }], network: url, picked: true })
    if (!saved) setFresh(url)
    setRemoved(null)
    setField(false)
  }

  // An empty name gives the row its host back
  const rename = () => {
    if (!naming) return
    setChoices({ rpcs: c.rpcs.map((r) => (r.url === naming.url ? { url: r.url, name: naming.value.trim() || undefined } : r)) })
    setNaming(null)
  }

  const remove = (url: string) => {
    const at = c.rpcs.findIndex((r) => r.url === url)
    setChoices({ rpcs: c.rpcs.filter((r) => r.url !== url), ...(c.network === url && { network: "Devnet" }) })
    setRemoved({ url, name: c.rpcs[at]?.name, label: rpcLabel(url, c.rpcs), at, hold: false })
  }

  const undo = () => {
    if (!removed) return
    const rpcs = [...c.rpcs]
    rpcs.splice(removed.at, 0, { url: removed.url, name: removed.name })
    setChoices({ rpcs, network: removed.url, picked: true })
    setRemoved(null)
  }

  const add = (word: string) => (
    <Button variant="ghost" size="sm" onClick={open} className={cn("text-caption font-act text-muted-foreground", phone && "h-9")}>
      <Plus data-icon="inline-start" />
      {word}
    </Button>
  )
  const input = phone ? "h-12 text-16" : "h-9 text-13 [html.touch_&]:h-11"

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-2 py-2">
        {/* With no RPC saved, "+ Custom RPC…" ends the networks' row; the group draws no box of its own.
            "Custom" alone didn't say what it adds (Nikita, 20 Nov) */}
        <div className="flex flex-wrap items-center gap-2">
          <Segmented variant="chips" aria-label="Network" value={c.network} onValueChange={pick} className="contents">
            {own.map((n) => (
              <SegmentedItem key={n.name} value={n.name} className={chip}>
                {n.name}
              </SegmentedItem>
            ))}
          </Segmented>
          {!field && !c.rpcs.length && add("Custom RPC…")}
        </div>
        {mainnet && c.network === "Mainnet" && <SlotLine key="mainnet">Deploys with real SOL</SlotLine>}
        {(c.rpcs.length > 0 || field || removed) && (
          <div className="mt-1 flex flex-col gap-2 border-t border-border pt-2">
            {c.rpcs.length > 0 && (
              <div className="flex min-h-8 items-center justify-between gap-2">
                <h4 className="text-13 leading-5 font-act text-muted-foreground">Custom RPCs</h4>
                {!field && add("Add")}
              </div>
            )}
            {c.rpcs.length > 0 && (
              <ul role="radiogroup" aria-label="Custom RPCs" className="flex flex-col gap-1.5">
                {c.rpcs.map((r) => {
                  const on = c.network === r.url
                  const label = rpcLabel(r.url, c.rpcs)
                  return (
                    <li
                      key={r.url}
                      className={cn(
                        "relative flex min-h-13 items-center gap-2 rounded-md border px-3 py-1.5",
                        on ? "border-primary bg-primary/10" : "border-border hover:border-border-strong",
                        r.url === fresh && "animate-print"
                      )}
                    >
                      <button
                        type="button"
                        role="radio"
                        aria-checked={on}
                        aria-label={label}
                        onClick={() => pick(r.url)}
                        className="absolute inset-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                      />
                      <span className="flex min-w-0 flex-1 flex-col">
                        {naming?.url === r.url ? (
                          <Input
                            ref={nameField}
                            aria-label="Name for this RPC"
                            placeholder="Name, like Helius devnet"
                            maxLength={32}
                            autoComplete="off"
                            spellCheck={false}
                            value={naming.value}
                            onChange={(e) => setNaming({ url: r.url, value: e.target.value })}
                            onBlur={rename}
                            onKeyDown={(e) => e.key === "Enter" && rename()}
                            className={cn("relative mb-1 max-w-64", phone ? "h-11 text-16" : "h-7 text-13 [html.touch_&]:h-11")}
                          />
                        ) : (
                          <span className={cn("truncate text-13 leading-5 font-act", on ? "text-foreground" : "text-muted-foreground")}>{label}</span>
                        )}
                        {/* The whole address, subdomain and all, with the key hidden */}
                        <span className="truncate font-mono text-13 leading-4 text-muted-foreground">{maskUrl(r.url)}</span>
                      </span>
                      {/mainnet/i.test(r.url) && on && <span className="shrink-0 text-13 leading-4 text-warning-ink">Real SOL</span>}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm" aria-label={`More for ${label}`} className="relative shrink-0 text-muted-foreground pointer-coarse:size-11">
                            <Ellipsis />
                          </Button>
                        </DropdownMenuTrigger>
                        {/* The focus goes to the name's field, not back to the ⋯ */}
                        <DropdownMenuContent align="end" className="min-w-36" onCloseAutoFocus={(e) => {
                            e.preventDefault()
                            nameField.current?.focus()
                          }}
                        >
                          <DropdownMenuItem onSelect={() => setNaming({ url: r.url, value: r.name ?? "" })}>{r.name ? "Rename" : "Add a name"}</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onSelect={() => remove(r.url)}>
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </li>
                  )
                })}
              </ul>
            )}
            {field && (
              // The name first, as the row reads; without one the row is worded by its host
              <div data-url-form className="flex flex-col gap-2">
                <Input
                  aria-label="Name"
                  placeholder="Name, optional"
                  maxLength={32}
                  autoComplete="off"
                  spellCheck={false}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={input}
                />
                <UrlField label="RPC URL" initial={scene.field} offline={navId === "offline"} known={(url) => c.rpcs.some((r) => r.url === url)} onUse={use} onClose={() => setField(false)} />
              </div>
            )}
            {removed && !field && (
              <div key="removed" className="flex min-h-5 items-center gap-2 text-13 leading-5 font-read text-muted-foreground duration-120 animate-in fade-in-0 motion-reduce:animate-none">
                <span className="min-w-0 truncate">{`Removed ${removed.label}`}</span>
                <Button variant="quiet" size="xs" onClick={undo} className="shrink-0">
                  Undo
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
      {/* Nothing to airdrop where SOL is real */}
      {!mainnet && (
        <Row label="Top up devnet SOL automatically" htmlFor="oak-airdrop">
          <Switch id="oak-airdrop" checked={settings.airdrop} onCheckedChange={(v) => setSetting("airdrop", v)} />
        </Row>
      )}
    </div>
  )
}
