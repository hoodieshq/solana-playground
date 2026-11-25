import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { ArrowUp, Ellipsis } from "lucide-react"

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Composer, ComposerInput, ComposerSend, ComposerToolbar } from "@/components/ui/composer"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Kbd } from "@/components/ui/kbd"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

import { ASSISTANT_KEYS, FILES_KEYS, MENU_KEYS, PRIMARY_KEYS, TERMINAL_KEYS } from "../../../desktop/keys"
import { ChipRow } from "../../../ui/ChipRow"
import { openExplorer } from "../../../ui/explorer"
import { launch } from "../../../ui/turns/YouPill"
import { showFailLine } from "./Talk"
import { isMainnet, networkWord, useChoices } from "../../../desktop/navLit/choices"
import { Choose } from "../../../desktop/navLit/StatusChip"
import { useEnv } from "../../../newProject/next/model"
import { openSettings } from "../../../settings/open"
import { pinToSidebar, usePins } from "../../../desktop/navLit/pins"
import { ask, build, busy, deleteProject, deploy, go, ixsOf, metaOf, onChain, renameProject, titleOf, type Project } from "../../store"
import { WALLET_KEY, fakeKey } from "../../data"
import { BUILD_KEYS } from "./Stages"
import { copyText, onFocusComposer } from "./util"


const SHORTCUTS = [
  { group: "In the project", what: "Run the next step", keys: PRIMARY_KEYS },
  { group: "In the project", what: "Build", keys: BUILD_KEYS },
  { group: "Panels", what: "Terminal", keys: TERMINAL_KEYS },
  { group: "Panels", what: "Files", keys: FILES_KEYS },
  { group: "Panels", what: "Assistant", keys: ASSISTANT_KEYS },
  { group: "Panels", what: "Nav", keys: MENU_KEYS },
]

/** Read mode has nothing to build, so Build leaves the list there */
export function ShortcutsDialog({ open, onOpenChange, read = false }: { open: boolean; onOpenChange: (open: boolean) => void; read?: boolean }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-80!">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {["In the project", "Panels"].map((group) => (
            <section key={group} aria-label={group}>
              <h3 className="mb-1 text-13 leading-4 text-muted-foreground">{group}</h3>
              <dl className="flex flex-col">
                {SHORTCUTS.filter((k) => k.group === group && !(read && k.what === "Build")).map((k) => (
                  <div key={k.what} className="flex h-8 items-center justify-between gap-4">
                    <dt className="text-13 leading-5 text-foreground/80">{k.what}</dt>
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
/** Where an account in a call comes from */
export type AccountSource = "wallet" | "program" | "pda" | "new" | "existing"
export type AccountInfo = { signer: boolean; writable: boolean; source: AccountSource; key: string }

/** Programs a call passes by their fixed address */
const PROGRAM_IDS: Record<string, string> = {
  system_program: "11111111111111111111111111111111",
  token_program: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  associated_token_program: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
  rent: "SysvarRent111111111111111111111111111111111",
}

/** An account's roles and where it comes from, read off the program's own Accounts struct: `Signer` signs,
 * `mut` or `init` writes, `seeds` is a PDA, `init` without seeds is a new keypair that signs too, `Program` is
 * a fixed address. Every account was "writable" and "Derived" before, the system program included (Almaz,
 * 20 Nov). With no Anchor struct to read, the name says it */
export function accountOf(p: Project, ixName: string, name: string): AccountInfo {
  const code = Object.entries(p.files).filter(([f]) => f.endsWith(".rs")).map(([, c]) => c).join("\n")
  const struct = new RegExp(`fn\\s+${ixName}\\s*\\(\\s*\\w+\\s*:\\s*Context<\\s*(\\w+)`).exec(code)?.[1]
  const body = struct ? new RegExp(`struct\\s+${struct}\\b[^{]*\\{([\\s\\S]*?)\\n\\}`).exec(code)?.[1] : undefined
  const field = body ? new RegExp(`((?:\\s*#\\[account\\([^\\]]*\\)\\]\\s*)*)pub\\s+${name}\\s*:\\s*([^,\\n]+)`).exec(body) : null
  const fixed = PROGRAM_IDS[name]
  if (field) {
    const [, attrs, type] = field
    if (/^\s*Program\b|^\s*Sysvar\b/.test(type) || fixed) return { signer: false, writable: false, source: "program", key: fixed ?? fakeKey(`${p.id}:${name}`) }
    const init = /\binit\b/.test(attrs)
    const pda = /\bseeds\b/.test(attrs)
    const signer = /^\s*Signer\b/.test(type) || (init && !pda)
    const writable = init || /\bmut\b/.test(attrs)
    if (/^\s*Signer\b/.test(type)) return { signer: true, writable, source: "wallet", key: WALLET_KEY }
    return { signer, writable, source: pda ? "pda" : init ? "new" : "existing", key: fakeKey(`${p.id}:${name}`) }
  }
  if (fixed) return { signer: false, writable: false, source: "program", key: fixed }
  if (/payer|authority|signer|owner|user|player|voter|tipper|sender/.test(name)) return { signer: true, writable: true, source: "wallet", key: WALLET_KEY }
  return { signer: false, writable: true, source: "existing", key: fakeKey(`${p.id}:${name}`) }
}

/** What fills it, in the form's words */
export const SOURCE_WORD: Record<AccountSource, string> = { wallet: "Your wallet", program: "Program", pda: "Derived", new: "New keypair", existing: "Saved earlier" }

export function idlJson(p: Project) {
  return JSON.stringify(
    {
      version: "1.0.0",
      name: (p.slug ?? p.name).replace(/-/g, "_"),
      instructions: ixsOf(p).map((ix) => ({
        name: ix.name,
        accounts: ix.accounts.map((a) => ({ name: a, isMut: accountOf(p, ix.name, a).writable, isSigner: accountOf(p, ix.name, a).signer })),
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
export const deleteQuestion = (p: Project) => `Delete ${titleOf(p)}? Its files go too.${onChain(p) ? " The program stays on devnet." : ""}`

/** Only your own projects can go; a read example isn't one, and an unsaved one leaves on its own */
export const deletable = (p: Project) => !p.read && !p.example && !p.opening

/** Delete and back to the list, with a line saying it's gone */
export function removeProject(p: Project) {
  deleteProject(p)
  go({ at: "catalog" })
  toast(`Deleted ${titleOf(p)}`)
}
const renamable = (p: Project) => !p.read && !p.example && !p.opening

export function ProjectName({ p, className }: { p: Project; className: string }) {
  const [editing, setEditing] = useState(false)
  const title = titleOf(p)
  const [draft, setDraft] = useState(title)
  useEffect(() => {
    const on = (e: Event) => {
      if ((e as CustomEvent<string>).detail !== p.id) return
      setDraft(title)
      setEditing(true)
    }
    window.addEventListener(RENAME, on)
    return () => window.removeEventListener(RENAME, on)
  }, [p.id, title])
  if (!editing)
    return (
      <h1 className={className} onDoubleClick={renamable(p) ? () => startRename(p.id) : undefined}>
        {title}
      </h1>
    )
  const done = (save: boolean) => {
    if (save && draft.trim() !== title) renameProject(p.id, draft)
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
              onSelect={() => pinToSidebar(p.name, !pinned)}
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
/** The model under the field, as Claude Code, Cursor and ChatGPT keep it by theirs (Almaz, 25 Nov): its name
 * and a chevron, the list of models the Status popover and Settings already pick from opening above it, and
 * Use your own API key under them. At its limit the name turns amber, "Limit reached", and Add API key leads */
/** The network under the field, a pick as the model beside it is: the Status popover's own list, with its
 * custom RPCs and Add custom RPC. Mainnet is amber, as everywhere, since deploys there cost real SOL */
function NetworkPicker() {
  const c = useChoices()
  const [open, setOpen] = useState(false)
  const real = isMainnet(c)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Network: ${networkWord(c)}. Change`}
          className={cn(
            "-ml-1 flex h-6 min-w-0 items-center gap-1 rounded-md px-1 hover:bg-foreground/[0.05] hover:text-foreground data-[state=open]:text-foreground focus-visible:outline-2 focus-visible:outline-brand-purple pointer-coarse:h-11",
            real && "text-warning-ink hover:text-warning-ink"
          )}
        >
          <span className="truncate">{networkWord(c)}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" sideOffset={6} className="w-[22rem] gap-0 rounded-(--radius-panel) p-1.5 shadow-panel" onCloseAutoFocus={(e) => e.preventDefault()}>
        <Choose view="Network" bare onBack={() => setOpen(false)} onClose={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  )
}

function ModelPicker() {
  const env = useEnv()
  const c = useChoices()
  const [open, setOpen] = useState(false)
  // Before any is connected it names the built-in one all the same, which needs no key: the one that will
  // answer (Almaz, 25 Nov: "Choose a model" read as if the assistant wouldn't work without a pick)
  const limit = env.assistant === "limit"
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Model: ${c.model}${limit ? ", limit reached" : ""}. Change`}
          className={cn(
            "-mr-1 flex h-6 max-w-[60%] shrink-0 items-center gap-1 rounded-md px-1 hover:bg-foreground/[0.05] hover:text-foreground data-[state=open]:text-foreground focus-visible:outline-2 focus-visible:outline-brand-purple pointer-coarse:h-11",
            limit && "text-warning-ink hover:text-warning-ink"
          )}
        >
          <span className="truncate">{limit ? `${c.model} · Limit reached` : c.model}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="end" sideOffset={6} className="w-[22rem] gap-0 rounded-(--radius-panel) p-1.5 shadow-panel" onCloseAutoFocus={(e) => e.preventDefault()}>
        {limit && (
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              openSettings({ section: "assistant" })
            }}
            className="mb-1 flex w-full flex-col rounded-lg border-b border-border px-2 py-1.5 text-left hover:bg-surface-raised"
          >
            <span className="text-13 leading-5 font-act text-foreground">Add API key</span>
            <span className="text-13 leading-4 text-warning-ink">Limit reached. Back at 3:00 PM</span>
          </button>
        )}
        <Choose view="Assistant" bare onBack={() => setOpen(false)} onClose={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  )
}

/** `context`: a quiet line under the field, as Claude Code's under its own: the network and the model, each
 * a pick, their words alone: no chevron, a press and the hover say it (Almaz, 25 Nov) */
export function Ask({ p, phone = false, chips = [], context = false }: { p: Project; phone?: boolean; chips?: string[]; context?: boolean }) {
  const [text, setText] = useState("")
  const [focused, setFocused] = useState(false)
  // A chip's question flies from the chip into the thread, as in a tutorial
  const pick = (label: string, button?: HTMLElement) => {
    if (button) launch(label, button.getBoundingClientRect())
    if (label === "Show me the line") showFailLine(p, label)
    else ask(p.id, label)
  }
  // One line, Send beside it, until the words outgrow it; focus alone moves nothing (Almaz, 6 Nov:
  // the button jumped on a press). Once tall it stays tall until the box is empty, or a line that
  // fits the wider box would flip it back and forth
  const [tall, setTall] = useState(false)
  const input = useRef<HTMLTextAreaElement>(null)
  useEffect(() => onFocusComposer(() => input.current?.focus()), [])
  // A program opens with the caret in the field, as a chat does when you switch to it (Almaz, 25 Nov). Not on
  // touch: there the focus would pull the keyboard up over the code
  useEffect(() => {
    if (!phone && !matchMedia("(pointer: coarse)").matches) input.current?.focus({ preventScroll: true })
  }, [p.id, phone])
  return (
    <div className={cn("shrink-0", phone ? "px-4 pt-3 pb-[calc(var(--safe-bottom)+12px)] [html.portrait_&]:px-8" : "px-5 pt-3 pb-5")}>
      {/* On a phone the chips go while the keyboard is up: the field needs the room */}
      {!(phone && focused) && <ChipRow chips={chips} phone={phone} onPick={pick} />}
      <Composer
        onFocus={() => setFocused(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) window.setTimeout(() => setFocused(false), 0)
        }}
        onSubmit={() => {
          if (!text.trim()) return
          ask(p.id, text.trim())
          setText("")
          setTall(false)
          // The composer sizes itself from its own input event, which clearing the value doesn't fire
          requestAnimationFrame(() => input.current?.dispatchEvent(new Event("input", { bubbles: true })))
        }}
        // Focused from the start, so the caret says it: the purple ring stood lit on every open (Almaz, 25 Nov)
        // 12, not the composer's 16: at 42 high 16 read as a pill (Almaz, 25 Nov)
        className={cn("rounded-xl focus-within:border-foreground/20 focus-within:ring-0", !tall && "flex-row items-center")}
      >
        <ComposerInput
          ref={input}
          value={text}
          onChange={(e) => {
            const v = e.target.value
            setText(v)
            if (!v) setTall(false)
            else if (!tall && (v.includes("\n") || e.target.scrollHeight > 46)) setTall(true)
          }}
          placeholder={p.read ? "Ask about this program" : p.draft ? "Reply, or say what to build" : `Ask about ${titleOf(p)}`}
          aria-label={p.read ? "Ask about this program" : p.draft ? "Reply to the assistant" : `Ask about ${titleOf(p)}`}
          enterKeyHint="send"
          // 13, the interface's size, as the lines under the field (Almaz, 25 Nov: 16 stood louder than the panel)
          className={cn("text-13 leading-5 font-normal", !tall && "min-h-10 pt-2.5 pb-2.5", !tall && phone && "min-h-11", phone && "max-h-[calc(4lh+1.25rem)]")}
        />
        <ComposerToolbar className={cn(!tall && "py-1 pr-1")}>
          {/* The arrow alone, no disc: the disc comes under the pointer (Almaz, 25 Nov). Grey with nothing to send,
              light once there is */}
          <ComposerSend className="bg-transparent text-foreground hover:bg-foreground/[0.08] disabled:bg-transparent disabled:text-subtle disabled:opacity-100 pointer-coarse:size-11">
            <ArrowUp />
          </ComposerSend>
        </ComposerToolbar>
      </Composer>
      {context && (
        // The network and the model, each a pick of its own; no file name, the tab says it (Almaz, 25 Nov)
        <div className="mt-2 flex items-center justify-between gap-3 px-1 text-13 leading-5 text-muted-foreground">
          <NetworkPicker />
          <ModelPicker />
        </div>
      )}
    </div>
  )
}
