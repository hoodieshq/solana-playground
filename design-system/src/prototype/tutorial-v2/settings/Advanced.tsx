import { ChevronRight } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

import { maskUrl } from "../desktop/navLit/choices"
import { useNavState } from "../navStates"
import { view } from "../view"
import { GROUP_TITLE, Row, usePhone } from "./Row"
import { setSetting, useSettings } from "./store"
import { UrlField } from "./UrlField"

/** A select for an Advanced row: 176 wide beside its label, the whole column under it on the phone */
function Choice({ id, value, options, onChange }: { id: string; value: string; options: string[]; onChange: (v: string) => void }) {
  const phone = usePhone()
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className={cn(phone ? "h-12! w-full text-[1rem]" : "w-44 [html.touch_&]:h-11!")}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" align="end">
        {options.map((o) => (
          <SelectItem key={o} value={o} className="[html.touch_&]:min-h-11 [html.phone_&]:min-h-11">
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** A switch row, writing straight to its setting */
function Toggle({ id, label, help, setting }: { id: string; label: string; help?: string; setting: "preflight" | "txLink" | "txDetails" | "shorterErrors" | "vim" }) {
  const s = useSettings()
  return (
    <Row label={label} htmlFor={id} help={help}>
      <Switch id={id} checked={s[setting]} onCheckedChange={(v) => setSetting(setting, v)} />
    </Row>
  )
}

/** Advanced (CONSENSUS 3.4): closed until asked, the developer's rows under one plain trigger. Product
 * labels for the three a developer searches the docs by, each with the only help lines on the page */
export function Advanced({ open: initial }: { open: boolean }) {
  const phone = usePhone()
  const s = useSettings()
  const [navId] = useNavState()
  const [open, setOpen] = useState(initial)
  const [serverField, setServerField] = useState(false)
  const keyboard = view === "desktop" || view === "tablet"

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className={cn(
            GROUP_TITLE,
            "group/adv -mx-1 flex items-center gap-1 rounded-md px-1 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50",
            phone ? "h-11" : "h-8 [html.touch_&]:h-11"
          )}
        >
          Advanced
          <ChevronRight aria-hidden="true" className="size-3.5 transition-transform duration-140 ease-standard group-data-[state=open]/adv:rotate-90 motion-reduce:transition-none" />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col pt-1">
        <Row label="Commitment" htmlFor="oak-commitment" help="How settled a transaction must be before it counts as done" stack>
          <Choice id="oak-commitment" value={s.commitment} options={["Processed", "Confirmed", "Finalized"]} onChange={(v) => setSetting("commitment", v)} />
        </Row>
        <Row label="Priority fee" htmlFor="oak-fee" help="Paid on top so a transaction lands sooner when the network is busy" stack>
          <Choice id="oak-fee" value={s.priorityFee} options={["Median", "Average", "Min", "Max", "Custom…"]} onChange={(v) => setSetting("priorityFee", v)} />
        </Row>
        {s.priorityFee === "Custom…" && (
          <div className={cn("flex pb-2", !phone && "justify-end")}>
            <InputGroup className={cn(phone ? "h-12 w-full" : "h-9 w-44 [html.touch_&]:h-11")}>
              <InputGroupInput
                aria-label="Priority fee in micro-lamports"
                inputMode="numeric"
                autoFocus
                placeholder="0"
                value={s.priorityFeeCustom}
                onChange={(e) => setSetting("priorityFeeCustom", e.target.value.replace(/\D/g, ""))}
                className={cn("font-mono tabular-nums", phone ? "text-[1rem]" : "text-[0.8125rem]")}
              />
              <InputGroupAddon align="inline-end" className="text-[0.75rem] font-normal">
                micro-lamports
              </InputGroupAddon>
            </InputGroup>
          </div>
        )}
        <Toggle id="oak-preflight" label="Preflight checks" help="Simulate each transaction before it is sent" setting="preflight" />
        <Row label="Block explorer" htmlFor="oak-explorer" stack>
          <Choice id="oak-explorer" value={s.explorer} options={["Solana Explorer", "Solscan", "SolanaFM"]} onChange={(v) => setSetting("explorer", v)} />
        </Row>
        <Toggle id="oak-txlink" label="Explorer link after each transaction" setting="txLink" />
        <Toggle id="oak-txdetails" label="Transaction details in the terminal" setting="txDetails" />
        <Toggle id="oak-errors" label="Shorter build errors" setting="shorterErrors" />
        <Row label="Build server" htmlFor="oak-server" stack>
          <Choice
            id="oak-server"
            value={s.buildServer}
            options={["Foundation server", "api.solpg.io", "Local", "Custom…"]}
            onChange={(v) => {
              setSetting("buildServer", v)
              setServerField(v === "Custom…" && !s.buildServerUrl)
            }}
          />
        </Row>
        {s.buildServer === "Custom…" && (
          <div className="pb-2">
            {serverField || !s.buildServerUrl ? (
              <UrlField
                label="Build server URL"
                initial={s.buildServerUrl ? { value: s.buildServerUrl, status: "idle" } : undefined}
                offline={navId === "offline"}
                known={(url) => url === s.buildServerUrl}
                onUse={(url) => {
                  setSetting("buildServerUrl", url)
                  setServerField(false)
                }}
                onClose={() => {
                  setServerField(false)
                  // Closed with nothing in it: there's no custom server, so the default stands again
                  if (!s.buildServerUrl) setSetting("buildServer", "Foundation server")
                }}
              />
            ) : (
              <div className={cn("flex min-h-5 items-center gap-2", !phone && "justify-end")}>
                <span className="min-w-0 truncate font-mono text-[0.75rem] leading-5 text-muted-foreground">{maskUrl(s.buildServerUrl)}</span>
                <Button variant="quiet" size="xs" onClick={() => setServerField(true)} className="shrink-0">
                  Change
                </Button>
              </div>
            )}
          </div>
        )}
        {keyboard && <Toggle id="oak-vim" label="Vim key bindings" setting="vim" />}
      </CollapsibleContent>
    </Collapsible>
  )
}
