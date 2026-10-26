import { useState, type ReactNode } from "react"
import { ChevronDown, Lock, Pin, Send, Terminal } from "lucide-react"

import { Button } from "@/components/ui/button"
import { EditorTab, EditorTabLabel, EditorTabs, EditorTabTrigger } from "@/components/ui/editor-tabs"
import { Kbd } from "@/components/ui/kbd"
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

import { CLIENT, LIB } from "../data"
import { useStore } from "../store"
import { FileTreeList } from "../ui/FileTreeList"
import { NAV_ICONS } from "../ui/navIcons"
import { FILES_KEYS, TERMINAL_KEYS } from "./keys"

/** The open tab on the code's own ground, so tab and code read as one sheet, without the coloured bar */
const TAB = "before:hidden data-active:bg-(--code-ground)"

/** What opens the Files popover is marked, so a press on it while the popover is up isn't also a
 * press outside it, which would close it and open it again on the same click */
const FILES_TOGGLE = "data-files-toggle"

/** A tool at the head's right end: its glyph alone, the name and key in the tip */
function Tool({ label, keys, icon, pressed, onClick, files = false }: { label: string; keys: string; icon: ReactNode; pressed: boolean; onClick: () => void; files?: boolean }) {
  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={label}
          aria-pressed={pressed}
          onClick={onClick}
          {...(files ? { [FILES_TOGGLE]: "" } : {})}
          // As Claude Code's tools: the glyph alone at 18 in a square, the name and key in the tip
          className={cn("rounded-lg text-muted-foreground hover:text-foreground [&_svg]:size-[18px]! [&_svg]:stroke-[1.5]", pressed && "bg-surface-hover text-foreground")}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {label}
        <Kbd className="ml-1.5">{keys}</Kbd>
      </TooltipContent>
    </Tooltip>
  )
}

/** The workspace head (spec 8.1): the file tabs, which never close, then at the right end the Call
 * panel, Files and Terminal. Call sits with the tools, apart from the files, since it isn't a file.
 * Files is the tree's one way in: it opens as a popover off the tabs, and its pin docks it beside the
 * editor. Before Start the head says the code is the finished program, read only, instead of a pill
 * over the code. No Build, Deploy or Run here: those live in the chat (D20) */
export function WorkspaceTabs({ treeOpen, onTree, wide }: { treeOpen: boolean; onTree: (open: boolean) => void; wide: boolean }) {
  const { s, dispatch } = useStore()
  const [arrived] = useState(() => new Set(s.tabs))
  // Always in the project's order: lib.rs, then client.ts
  const order = [LIB, CLIENT]
  const tabs = s.tabs.filter((t) => order.includes(t)).sort((a, b) => order.indexOf(a) - order.indexOf(b))
  const callable = s.started && s.tabs.includes("test")
  const calling = callable && s.open === "test"
  const active = calling ? null : tabs.includes(s.open) ? s.open : tabs[0]
  const docked = s.tree === "docked"
  // Files, its key and the arrow in the open tab all do the same: open the popover, or undock the tree
  const toggleFiles = () => (docked ? dispatch({ type: "tree", state: "closed" }) : onTree(!treeOpen))
  const filesShown = treeOpen || docked

  const tree = (
    // A sheet out of the workspace's corner rather than a floating card: flush under the tab bar's line
    // and against the chat's, square there, rounded only at its free corner
    <PopoverContent
      side="bottom"
      align="start"
      sideOffset={1}
      className="w-64 gap-0 relative rounded-none rounded-br-lg border-r border-b border-border bg-surface-base p-1.5 ring-0 data-open:zoom-in-100 data-closed:zoom-out-100 data-[side=bottom]:slide-in-from-top-1"
      onOpenAutoFocus={(e) => {
        // Focus lands on the open file, not on the pin, so nothing in the head lights up on open
        e.preventDefault()
        ;(e.currentTarget as HTMLElement).querySelector<HTMLElement>('[aria-selected="true"]')?.focus({ preventScroll: true })
      }}
      onCloseAutoFocus={(e) => e.preventDefault()}
      onInteractOutside={(e) => {
        if (e.target instanceof Element && e.target.closest(`[${FILES_TOGGLE}]`)) e.preventDefault()
      }}
    >
      {/* No head: the Files button opened it. The pin sits over the first row's free end */}
      <div className="absolute top-1.5 right-1.5 z-10">
        {wide && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="rounded-md text-muted-foreground hover:text-foreground [&_svg]:size-4! [&_svg]:stroke-[1.5]"
                aria-label="Dock beside the editor"
                onClick={() => {
                  dispatch({ type: "tree", state: "docked" })
                  onTree(false)
                }}
              >
                <Pin />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Dock beside the editor</TooltipContent>
          </Tooltip>
        )}
      </div>
      <FileTreeList
        onPick={(file) => {
          dispatch({ type: "openFile", file })
          onTree(false)
        }}
      />
    </PopoverContent>
  )

  return (
    <div className="@container flex h-11 shrink-0 items-stretch border-b border-border bg-surface-base">
      <Popover open={treeOpen} onOpenChange={onTree}>
        <PopoverAnchor asChild>
          <EditorTabs className="h-full flex-1 border-b-0!">
            {tabs.map((tab) => (
              <EditorTab key={tab} active={tab === active} className={cn(TAB, "px-0!", !arrived.has(tab) && "animate-rise")}>
                <EditorTabTrigger className={cn("gap-1.5 px-3", tab === active && "pr-0.5")} onClick={() => dispatch({ type: "openFile", file: tab })}>
                  <EditorTabLabel>{tab.split("/").pop()}</EditorTabLabel>
                </EditorTabTrigger>
                {/* The open tab's arrow, as Cat asked: the tree from beside the file's name, to step back
                    from client.ts to lib.rs. Quiet until pointed at, no frame of its own; it turns over
                    while the tree is out */}
                {tab === active && (
                  <Tooltip delayDuration={300}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label="Files"
                        aria-haspopup="dialog"
                        aria-expanded={filesShown}
                        onClick={toggleFiles}
                        {...{ [FILES_TOGGLE]: "" }}
                        className="mr-1.5 grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <ChevronDown
                          aria-hidden="true"
                          className={cn("size-3.5 transition-transform duration-150 ease-standard motion-reduce:transition-none", filesShown && "rotate-180")}
                        />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      Files
                      <Kbd className="ml-1.5">{FILES_KEYS}</Kbd>
                    </TooltipContent>
                  </Tooltip>
                )}
              </EditorTab>
            ))}
          </EditorTabs>
        </PopoverAnchor>
        {tree}
      </Popover>
      <div className="ml-auto flex shrink-0 items-center gap-1.5 pr-2">
        {/* Plain words in the head's free space, so nothing covers the code's lines */}
        {!s.started && (
          <span className="mr-2 flex items-center gap-1.5 text-caption text-muted-foreground">
            <Lock className="size-3" aria-hidden="true" />
            Finished program · read only
          </span>
        )}
        {callable && (
          <>
            <Button
              variant="ghost"
              aria-pressed={calling}
              onClick={() => dispatch({ type: "openTest" })}
              className={cn(
                "rounded-lg text-[0.8125rem] text-muted-foreground hover:text-foreground [&_svg]:size-4! [&_svg]:stroke-[1.5]",
                calling && "bg-surface-hover text-foreground",
                !arrived.has("test") && "animate-rise"
              )}
            >
              <Send />
              Call
              {s.testDot && <span aria-hidden="true" className="size-1.5 shrink-0 animate-pulse-dot rounded-full bg-brand-purple [animation-iteration-count:2]" />}
            </Button>
            <span aria-hidden="true" className="mx-1 h-5 w-px bg-border" />
          </>
        )}
        <Tool
          label="Files"
          keys={FILES_KEYS}
          icon={<span className="flex size-[18px] [&>svg]:size-full">{NAV_ICONS.folder}</span>}
          pressed={filesShown}
          onClick={toggleFiles}
          files
        />
        <Tool label="Terminal" keys={TERMINAL_KEYS} icon={<Terminal />} pressed={s.terminal} onClick={() => dispatch({ type: "terminal", open: !s.terminal })} />
      </div>
    </div>
  )
}
