import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { ArrowUp, ChevronLeft, Ellipsis } from "lucide-react"

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Composer, ComposerInput, ComposerSend, ComposerToolbar } from "@/components/ui/composer"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Kbd } from "@/components/ui/kbd"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

import { Column } from "../../../desktop/Column"
import { FILES_KEYS, MENU_KEYS, PRIMARY_KEYS, TERMINAL_KEYS } from "../../../desktop/keys"
import { openExplorer } from "../../../ui/explorer"
import { setPinned, usePins } from "../../../desktop/navLit/pins"
import { ask, build, busy, deleteProject, deploy, go, ixsOf, metaOf, onChain, renameProject, type Project } from "../../store"
import { Feed } from "./Feed"
import { StepStrip } from "./StepStrip"
import { copyText, onFocusComposer } from "./util"

const mac = /Mac|iPhone|iPad/.test(navigator.userAgent)
const BUILD_KEYS = mac ? "⌘⇧B" : "Ctrl Shift B"

const SHORTCUTS = [
  { group: "In the project", what: "Run the next step", keys: PRIMARY_KEYS },
  { group: "In the project", what: "Build", keys: BUILD_KEYS },
  { group: "Panels", what: "Terminal", keys: TERMINAL_KEYS },
  { group: "Panels", what: "Files", keys: FILES_KEYS },
  { group: "Panels", what: "Nav", keys: MENU_KEYS },
]

/** Read mode has nothing to build, so Build leaves the list there */
function ShortcutsDialog({ open, onOpenChange, read = false }: { open: boolean; onOpenChange: (open: boolean) => void; read?: boolean }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-80!">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {["In the project", "Panels"].map((group) => (
            <section key={group} aria-label={group}>
              <h3 className="mb-1 text-[0.75rem] leading-4 text-muted-foreground">{group}</h3>
              <dl className="flex flex-col">
                {SHORTCUTS.filter((k) => k.group === group && !(read && k.what === "Build")).map((k) => (
                  <div key={k.what} className="flex h-8 items-center justify-between gap-4">
                    <dt className="text-[0.875rem] leading-[1.125rem] text-foreground/80">{k.what}</dt>
                    <dd className="flex gap-1">
                      {k.keys.split(" ").map((key) => (
                        <Kbd key={key}>{key}</Kbd>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** The IDL as the Call panel reads it, for Copy IDL */
/** An account's roles, read by the IDL JSON and the Call panel alike, never two copies: the wallet
 * signs as the authority, a signer or an owner; every program account is written to */
export const accountRoles = (name: string) => ({ signer: /authority|signer|owner/.test(name), writable: true })

export function idlJson(p: Project) {
  return JSON.stringify(
    {
      version: "1.0.0",
      name: (p.slug ?? p.name).replace(/-/g, "_"),
      instructions: ixsOf(p).map((ix) => ({
        name: ix.name,
        accounts: ix.accounts.map((a) => ({ name: a, isMut: accountRoles(a).writable, isSigner: accountRoles(a).signer })),
        args: ix.args.map((a) => ({ name: a.name, type: a.type })),
      })),
    },
    null,
    2
  )
}

/** Rename in place: the head's name turns into a field. Started from the ⋯ or a double click on the name;
 * New project names a project for you, so this is where a name of your own goes */
const RENAME = "oak:rename-project"
export const startRename = (id: string) => window.dispatchEvent(new CustomEvent(RENAME, { detail: id }))

/** A delete's question, the words Your projects' rows use. A deployed program stays on devnet: deleting
 * the project doesn't take it down or hand its SOL back */
export const deleteQuestion = (p: Project) => `Delete ${p.name}? Its files go too.${onChain(p) ? " The program stays on devnet." : ""}`

/** Only your own projects can go; a read example isn't one, and an unsaved one leaves on its own */
export const deletable = (p: Project) => !p.read && !p.example && !p.opening

/** Delete and back to the list, with a line saying it's gone */
export function removeProject(p: Project) {
  deleteProject(p.name)
  go({ at: "catalog" })
  toast(`Deleted ${p.name}`)
}
const renamable = (p: Project) => !p.read && !p.example && !p.opening

export function ProjectName({ p, className }: { p: Project; className: string }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(p.name)
  useEffect(() => {
    const on = (e: Event) => {
      if ((e as CustomEvent<string>).detail !== p.id) return
      setDraft(p.name)
      setEditing(true)
    }
    window.addEventListener(RENAME, on)
    return () => window.removeEventListener(RENAME, on)
  }, [p.id, p.name])
  if (!editing)
    return (
      <h1 className={className} onDoubleClick={renamable(p) ? () => startRename(p.id) : undefined}>
        {p.name}
      </h1>
    )
  const done = (save: boolean) => {
    if (save) renameProject(p.id, draft)
    setEditing(false)
  }
  return (
    <input
      autoFocus
      aria-label="Project name"
      value={draft}
      spellCheck={false}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => done(true)}
      onKeyDown={(e) => {
        if (e.key === "Enter") done(true)
        if (e.key === "Escape") done(false)
      }}
      className={cn(className, "rounded-md bg-surface-raised px-1.5 outline-none focus-visible:ring-2 focus-visible:ring-ring")}
    />
  )
}

/** The head's ⋯: what an expert reaches for. Items that can't run now are left out; read mode has no
 * Build, Deploy again or Copy IDL, and its program id is Solana's copy on devnet */
export function MoreMenu({ p, onKeys }: { p: Project; onKeys?: () => void }) {
  const read = !!p.read
  const chain = onChain(p)
  const devnet = read ? metaOf(p)?.devnetId : null
  const meta = metaOf(p)
  const ts = p.framework === "ts-client"
  const idle = !busy(p)
  const pinned = !!usePins()[p.name]
  // Rename puts a field in the head: the menu must not hand focus back to ⋯ as it closes, or the field
  // loses it at once and closes before a key is typed
  const renaming = useRef(false)
  const [deleting, setDeleting] = useState(false)
  return (
    <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="More" className="relative text-muted-foreground after:absolute after:-inset-2 after:content-['']">
          <Ellipsis />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-52"
        onCloseAutoFocus={(e) => {
          if (!renaming.current) return
          e.preventDefault()
          renaming.current = false
          startRename(p.id)
        }}
      >
        {/* The nav keeps only what you pin (Almaz, 6 Nov), so this is the way into it. A pin is a bookmark:
            it doesn't save the program as a project (11/07) */}
        {!p.opening && (
          <>
            <DropdownMenuItem
              onSelect={() => {
                setPinned(p.name, !pinned)
                toast(pinned ? "Unpinned from the sidebar" : "Pinned to the sidebar")
              }}
            >
              {pinned ? "Unpin from sidebar" : "Pin to sidebar"}
            </DropdownMenuItem>
            {renamable(p) && <DropdownMenuItem onSelect={() => (renaming.current = true)}>Rename</DropdownMenuItem>}
            <DropdownMenuSeparator />
          </>
        )}
        {!ts && !read && idle && <DropdownMenuItem onSelect={() => build(p.id)}>Build</DropdownMenuItem>}
        {!ts && idle && chain && <DropdownMenuItem onSelect={() => deploy(p.id)}>Deploy again</DropdownMenuItem>}
        {chain && <DropdownMenuItem onSelect={() => copyText(chain.programId, "Program id")}>Copy program id</DropdownMenuItem>}
        {devnet && <DropdownMenuItem onSelect={() => copyText(devnet, "Program id")}>Copy program id</DropdownMenuItem>}
        {!ts && !read && p.idl && <DropdownMenuItem onSelect={() => copyText(idlJson(p), "IDL")}>Copy IDL</DropdownMenuItem>}
        {(chain || devnet) && <DropdownMenuItem onSelect={openExplorer}>View on Explorer</DropdownMenuItem>}
        {meta && <DropdownMenuItem onSelect={() => window.open(`https://github.com/${meta.repo}/tree/master/${meta.path}`, "_blank", "noreferrer")}>View on GitHub</DropdownMenuItem>}
        {/* No keyboard on a phone, so no shortcuts there */}
        {onKeys && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onKeys}>Keyboard shortcuts</DropdownMenuItem>
          </>
        )}
        {/* Last and apart, so it's never the item under a hurried click */}
        {deletable(p) && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(true)}>
              Delete project
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
    <AlertDialog open={deleting} onOpenChange={setDeleting}>
      <AlertDialogContent size="sm" className="sm:max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{`Delete ${p.name}?`}</AlertDialogTitle>
          <AlertDialogDescription>{deleteQuestion(p).replace(/^Delete [^?]+\? /, "")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mx-0! mb-0! border-t-0! bg-transparent! p-0! pt-2!">
          <AlertDialogCancel className="[html.touch_&]:h-11">Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={() => removeProject(p)} className="[html.touch_&]:h-11">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}

/** The composer at the foot: questions about the project go into the same thread */
export function Ask({ p, phone = false }: { p: Project; phone?: boolean }) {
  const [text, setText] = useState("")
  // One line, Send beside it, until the words outgrow it; focus alone moves nothing (Almaz, 6 Nov:
  // the button jumped on a press). Once tall it stays tall until the box is empty, or a line that
  // fits the wider box would flip it back and forth
  const [tall, setTall] = useState(false)
  const input = useRef<HTMLTextAreaElement>(null)
  useEffect(() => onFocusComposer(() => input.current?.focus()), [])
  return (
    <div className={cn("shrink-0", phone ? "px-4 pt-3 pb-[calc(var(--safe-bottom)+12px)] [html.portrait_&]:px-8" : "px-5 pt-3 pb-5")}>
      <Composer
        onSubmit={() => {
          if (!text.trim()) return
          ask(p.id, text.trim())
          setText("")
          setTall(false)
          // The composer sizes itself from its own input event, which clearing the value doesn't fire
          requestAnimationFrame(() => input.current?.dispatchEvent(new Event("input", { bubbles: true })))
        }}
        className={cn(!tall && "flex-row items-center")}
      >
        <ComposerInput
          ref={input}
          value={text}
          onChange={(e) => {
            const v = e.target.value
            setText(v)
            if (!v) setTall(false)
            else if (!tall && (v.includes("\n") || e.target.scrollHeight > 44)) setTall(true)
          }}
          placeholder={p.read ? "Ask about this program" : `Ask about ${p.name}`}
          aria-label={p.read ? "Ask about this program" : `Ask about ${p.name}`}
          enterKeyHint="send"
          className={cn("leading-[22px] placeholder:text-muted-foreground/80!", !tall && "min-h-10 pt-2.5 pb-2.5")}
        />
        <ComposerToolbar className={cn(!tall && "py-1 pr-1")}>
          <ComposerSend className="relative after:absolute after:-inset-1.5 after:content-[''] disabled:bg-surface-hover disabled:text-muted-foreground disabled:opacity-100">
            <ArrowUp />
          </ComposerSend>
        </ComposerToolbar>
      </Composer>
    </div>
  )
}

/** The left column, as in a lesson: the head, the step strip, the one thread and the composer */
export function GuideColumn({ p }: { p: Project }) {
  const scroller = useRef<HTMLDivElement>(null)
  const [keys, setKeys] = useState(false)
  return (
    <Column label="Guide">
      <div className="flex h-11 shrink-0 items-center gap-1 border-b border-border px-1.5">
        {/* Every project goes back to Programs, as a lesson to Tutorials: yours are listed there too (Almaz, 10 Nov) */}
        <Button variant="ghost" size="sm" className="gap-0.5 pl-1.5 text-muted-foreground" onClick={() => go({ at: "catalog" })}>
          <ChevronLeft className="size-4" />
          Programs
        </Button>
        <ProjectName p={p} className="ml-2 min-w-0 truncate text-[0.875rem] text-foreground" />
        {/* Build mode, opened from the catalog and not saved: it isn't in your projects until you change or
            deploy it. Read mode has no tag here, its mark is in the workspace head */}
        {p.example && !p.read && !p.opening && (
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <span tabIndex={0} className="ml-1 shrink-0 rounded-md bg-foreground/[0.08] px-1.5 py-0.5 text-[0.75rem] leading-4 text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
                Example
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-60">
              Not in your projects yet. Change or deploy it to keep it.
            </TooltipContent>
          </Tooltip>
        )}
        <span className="flex-1" />
        <MoreMenu p={p} onKeys={() => setKeys(true)} />
      </div>
      <StepStrip p={p} scroller={scroller} />
      <Feed p={p} scroller={scroller} />
      <Ask p={p} />
      <ShortcutsDialog open={keys} onOpenChange={setKeys} read={p.read} />
    </Column>
  )
}
