import { createContext, useContext, useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Spinner } from "@/components/ui/spinner"
import { StatusDot } from "@/components/ui/status-dot"
import { cn } from "@/lib/utils"

import { usePhone } from "./Row"

export type FieldStatus = "idle" | "invalid" | "checking" | "down" | "offline"

/** Escape goes to the innermost open thing first: a field registers here, and the page asks it before
 * it closes itself. A handler returns true when it took the key */
export const EscapeCtx = createContext<(fn: () => boolean) => () => void>(() => () => {})

/** https anywhere, or http on this machine */
export function validUrl(v: string) {
  try {
    const u = new URL(v.trim())
    return u.protocol === "https:" || (u.protocol === "http:" && (u.hostname === "localhost" || u.hostname === "127.0.0.1"))
  } catch {
    return false
  }
}

/** A line under a control in the one slot it has: an amber dot and muted words, an action after them */
export function SlotLine({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex min-h-5 items-center gap-2 text-[0.8125rem] leading-5 font-read text-muted-foreground duration-120 animate-in fade-in-0 motion-reduce:animate-none">
      <StatusDot variant="warning" />
      <span className="min-w-0">{children}</span>
      {action}
    </div>
  )
}

const LINES: Partial<Record<FieldStatus, string>> = {
  invalid: "Enter a full URL, like https://rpc.example.com",
  down: "No answer from this URL.",
  offline: "No answer. You're offline.",
}

/** A URL field with one inline check (CONSENSUS 3.3.2): Use or Enter checks the shape, then whether the
 * URL answers. In Oak the check is faked: 800 ms, and a host with "down" in it never answers. Used by
 * Network's Custom and Build server's Custom */
export function UrlField({
  label,
  initial,
  offline,
  known,
  onUse,
  onClose,
}: {
  label: string
  initial?: { value: string; status: FieldStatus; hold?: boolean }
  offline: boolean
  /** A URL already saved: it's used as it is, with no check */
  known?: (url: string) => boolean
  onUse: (url: string) => void
  onClose: () => void
}) {
  const phone = usePhone()
  const [value, setValue] = useState(initial?.value ?? "")
  const [status, setStatus] = useState<FieldStatus>(initial?.status ?? "idle")
  const timer = useRef(0)
  const input = useRef<HTMLInputElement>(null)
  const escape = useContext(EscapeCtx)

  useEffect(() => () => clearTimeout(timer.current), [])

  // A forced checking state holds its spinner; any other check runs its course
  useEffect(() => {
    if (initial?.status === "checking" && !initial.hold) check(initial.value)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Escape cancels a check, else closes the field
  useEffect(
    () =>
      escape(() => {
        if (status === "checking") {
          clearTimeout(timer.current)
          setStatus("idle")
        } else onClose()
        return true
      }),
    [escape, status, onClose]
  )

  const check = (url: string) => {
    setStatus("checking")
    const down = (() => {
      try {
        return new URL(url).hostname.includes("down")
      } catch {
        return false
      }
    })()
    timer.current = window.setTimeout(
      () => {
        if (offline) setStatus("offline")
        else if (down) setStatus("down")
        else onUse(url.trim())
      },
      down ? 1500 : 800
    )
  }

  const use = () => {
    const url = value.trim()
    if (!url || status === "checking") return
    if (!validUrl(url)) return setStatus("invalid")
    if (known?.(url)) return onUse(url)
    check(url)
  }

  const line = LINES[status]
  return (
    <div className="flex flex-col gap-2">
      <InputGroup
        className={cn(
          phone ? "h-12" : "h-9 [html.touch_&]:h-11",
          // A person can fix this: amber, not the red of something broken, and no halo
          "has-[[aria-invalid=true]]:border-[color-mix(in_srgb,var(--warning)_60%,transparent)]! has-[[aria-invalid=true]]:ring-0!"
        )}
      >
        <InputGroupInput
          ref={input}
          autoFocus
          aria-label={label}
          aria-invalid={status === "invalid" || undefined}
          inputMode="url"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder="https://"
          value={value}
          readOnly={status === "checking"}
          onChange={(e) => {
            setValue(e.target.value)
            // No checks while typing
            if (status !== "idle") setStatus("idle")
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              use()
            }
          }}
          onBlur={(e) => {
            // Blur while empty closes it, unless the focus only went to its own Use
            if (!value.trim() && !e.currentTarget.closest('[data-slot="input-group"]')?.contains(e.relatedTarget as Node)) onClose()
          }}
          className={cn("font-mono", phone ? "text-[1rem]" : "text-[0.8125rem]")}
        />
        <InputGroupAddon align="inline-end">
          <Button variant="soft" size="xs" disabled={!value.trim()} onClick={use} aria-label={status === "checking" ? "Checking" : undefined} className="min-w-10">
            {status === "checking" ? <Spinner className="size-3.5" /> : "Use"}
          </Button>
        </InputGroupAddon>
      </InputGroup>
      {line && (
        <SlotLine
          key={status}
          action={
            status !== "invalid" && (
              <Button variant="quiet" size="xs" onClick={() => onUse(value.trim())} className="shrink-0">
                Use anyway
              </Button>
            )
          }
        >
          {line}
        </SlotLine>
      )}
    </div>
  )
}
