import * as React from "react"

import { FileTree, FileTreeDock, FileTreeFolder, FileTreeItem, FileTreeItemNote } from "@/components/ui/file-tree"

import { Block, More } from "../parts"

const FILES = ["src/lib.rs", "client/client.ts", "tests/anchor.test.ts", "Anchor.toml"]

/* The tree as a lesson draws it: folders, the open file, the step's file marked, one not there yet */
function Files({ open, onOpen, size, className = "w-64" }: { open: string; onOpen: (file: string) => void; size?: "default" | "touch"; className?: string }) {
  return (
    <FileTree size={size} className={className}>
      {["src", "client", "tests"].map((folder) => (
        <React.Fragment key={folder}>
          <FileTreeFolder>{folder}</FileTreeFolder>
          {FILES.filter((f) => f.startsWith(`${folder}/`)).map((f) => (
            <FileTreeItem
              key={f}
              depth={1}
              selected={open === f}
              marked={f === "src/lib.rs"}
              markLabel="This step's file"
              disabled={f === "client/client.ts"}
              onClick={() => onOpen(f)}
            >
              {f.split("/").pop()}
              {f === "client/client.ts" && <FileTreeItemNote>Created in step 3</FileTreeItemNote>}
            </FileTreeItem>
          ))}
        </React.Fragment>
      ))}
      <FileTreeItem selected={open === "Anchor.toml"} onClick={() => onOpen("Anchor.toml")}>
        Anchor.toml
      </FileTreeItem>
    </FileTree>
  )
}

function FileTreeMore() {
  const [open, setOpen] = React.useState("src/lib.rs")
  const [docked, setDocked] = React.useState(true)
  return (
    <>
      <More label="size=touch: 44px rows, folders at 36px, a press instead of hover">
        <div className="rounded-xl bg-surface-panel p-2">
          <Files size="touch" open={open} onOpen={setOpen} className="w-72" />
        </div>
      </More>
      <More label="FileTreeDock: docked beside the editor, unpin to give it back">
        <div className="flex h-56 w-[28rem] overflow-hidden rounded-xl border border-border">
          <FileTreeDock open={docked} onUndock={() => setDocked(false)} className="border-r">
            <Files open={open} onOpen={setOpen} className="w-full" />
          </FileTreeDock>
          <div className="flex flex-1 items-start bg-code-ground p-3 font-mono text-xs text-muted-foreground">
            {docked ? (
              open
            ) : (
              <button type="button" className="text-foreground underline underline-offset-2" onClick={() => setDocked(true)}>
                Dock the files
              </button>
            )}
          </div>
        </div>
      </More>
    </>
  )
}

function FileTreeBlock() {
  const [open, setOpen] = React.useState("src/lib.rs")
  return (
    <Block
      id="file-tree"
      title="File tree"
      source="playground"
      registry="file-tree"
      more={<FileTreeMore />}
      note="A project's files by folder. Folders are labels; files are 28px rows, the open one filled. A dot marks the file the current step works in, and a file that is not there yet is disabled with a note saying when it comes. Arrow keys, Home and End move between files. size=touch is the phone's. FileTreeDock docks it beside the editor and clips it while it opens, so nothing rewraps."
    >
      <Files open={open} onOpen={setOpen} />
    </Block>
  )
}

export { FileTreeBlock }
