import { useEffect, useState } from "react"
import { Trash2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Meter, MeterTrack, MeterValue } from "@/components/ui/meter"
import { StatusDot } from "@/components/ui/status-dot"
import { cn } from "@/lib/utils"

import { SHEET, SHEET_HEAD, SHEET_TITLE } from "../../../sheets/sheet"
import { ACTION_SOFT } from "../../../ui/type"
import { view } from "../../../view"
import { LIMIT, blocked, deleteProject, setNotice, usePrograms, type Project } from "../../store"
import { ago, onManage, openManage } from "./util"

/* The account's 10 projects, in build mode only (CONSENSUS-delta 2.7): a line on the Deploy card at 8 or
   9, a card in its place at 10, a notice when a first edit would save an 11th, and Manage projects */

const touch = view === "phone" || view === "portrait"

/** A first edit with the projects full: the keystroke didn't land. Stays until ✕, or until a slot frees */
export function FullNotice({ p, phone = false }: { p: Project; phone?: boolean }) {
  const full = usePrograms((s) => blocked(p, s))
  if (p.notice !== "full" || !full) return null
  return (
    <div
      role="status"
      className={cn(
        "flex items-start gap-2 text-[0.8125rem] leading-[1.125rem] text-foreground/80 animate-in fade-in-0 duration-[120ms]",
        phone ? "min-h-11 border-b border-border bg-surface-raised py-2.5 pr-2 pl-4 [html.portrait_&]:pl-8" : "max-w-[360px] rounded-[10px] border border-border-strong bg-surface-raised py-2 pr-1.5 pl-3 shadow-md"
      )}
    >
      <StatusDot variant="warning" className="mt-1.5 shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
        <p>
          Your projects are full ({LIMIT} of {LIMIT}). Changing {p.name} saves it as a project. Delete one first.
        </p>
        <Button variant="ghost" onClick={openManage} className={cn("h-8 px-3 text-[0.8125rem] font-act pointer-coarse:h-11", ACTION_SOFT)}>
          Manage projects
        </Button>
      </div>
      <Button variant="ghost" size="icon-xs" aria-label="Dismiss" onClick={() => setNotice(p.id, null)} className="shrink-0 text-muted-foreground pointer-coarse:size-11">
        <X />
      </Button>
    </div>
  )
}

/** Your projects: the meter and a row each, delete confirmed on the row. A dialog on desktop, a sheet on a
 * phone and an upright tablet */
export function ManageProjects() {
  const [open, setOpen] = useState(false)
  const [asking, setAsking] = useState<string | null>(null)
  useEffect(() => onManage(() => setOpen(true)), [])
  const account = usePrograms((s) => s.account)
  const projects = usePrograms((s) => s.projects)
  const rows = [
    ...Object.values(projects)
      .filter((p) => !p.read && !p.example && !p.opening)
      .map((p) => ({ name: p.name, at: p.createdAt })),
    ...account,
  ]
  const row = touch ? "min-h-14" : "min-h-11"
  const body = (
    <div className="flex min-h-0 flex-col gap-3">
      <Meter variant="cells" tone="neutral" value={rows.length} max={LIMIT} aria-label="Projects used">
        <MeterTrack className="flex-1" />
        <MeterValue className="text-[0.8125rem] text-muted-foreground tabular-nums">
          {rows.length} of {LIMIT}
        </MeterValue>
      </Meter>
      <ul className="-mx-1 flex min-h-0 flex-col overflow-y-auto">
        {rows.map((r) =>
          asking === r.name ? (
            <li key={r.name} className={cn("flex flex-wrap items-center gap-2 rounded-lg bg-surface-hover px-2 py-1.5", row)}>
              <span className="min-w-0 flex-1 text-[0.875rem] text-foreground">Delete {r.name}? Its files go too.</span>
              <Button
                variant="destructive"
                size="sm"
                className="pointer-coarse:h-11"
                onClick={() => {
                  deleteProject(r.name)
                  setAsking(null)
                }}
              >
                Delete
              </Button>
              <Button variant="ghost" size="sm" className="pointer-coarse:h-11" onClick={() => setAsking(null)}>
                Keep
              </Button>
            </li>
          ) : (
            <li key={r.name} className={cn("flex items-center gap-3 px-2", row)}>
              <span className="min-w-0 flex-1 truncate font-act text-[0.875rem] text-foreground">{r.name}</span>
              <span className="shrink-0 text-[0.8125rem] text-muted-foreground">{ago(r.at)}</span>
              <Button variant="ghost" size="icon-sm" aria-label={`Delete ${r.name}`} onClick={() => setAsking(r.name)} className="text-muted-foreground pointer-coarse:size-11">
                <Trash2 />
              </Button>
            </li>
          )
        )}
      </ul>
    </div>
  )
  const close = (o: boolean) => {
    setOpen(o)
    if (!o) setAsking(null)
  }
  if (touch)
    return (
      <Drawer open={open} onOpenChange={close}>
        <DrawerContent className={cn(SHEET, "h-[88dvh] max-h-[88dvh]")}>
          <DrawerHeader className={SHEET_HEAD}>
            <DrawerTitle className={SHEET_TITLE}>Your projects</DrawerTitle>
            <DrawerDescription className="sr-only">Delete a project to free a slot</DrawerDescription>
          </DrawerHeader>
          <div className="flex min-h-0 flex-1 flex-col px-4 pb-[max(var(--safe-bottom),16px)] [html.portrait_&]:px-8">{body}</div>
        </DrawerContent>
      </Drawer>
    )
  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-[400px]! sm:max-w-[400px]!">
        <DialogHeader>
          <DialogTitle>Your projects</DialogTitle>
          <DialogDescription className="sr-only">Delete a project to free a slot</DialogDescription>
        </DialogHeader>
        {body}
      </DialogContent>
    </Dialog>
  )
}
