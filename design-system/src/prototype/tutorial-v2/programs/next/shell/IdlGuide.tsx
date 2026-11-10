import { useState } from "react"
import { Download, Upload } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { CodeBlock, CodeBlockContent } from "@/components/ui/code-block"
import { CopyButton } from "@/components/ui/copy-button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Segmented, SegmentedItem } from "@/components/ui/segmented"

import { uploadIdl, type Project } from "../../store"

/* "Build the IDL locally", as the product has it on the new build server (Sergo's feat/stable-anchor-1.1.2,
   openspec change stable-anchor-1-1-2, spec client-v2-idl-build-guide): the server builds Anchor 1.1.2
   without an IDL, so the call form has nothing to read until the visitor builds the IDL on their machine
   and uploads it. A dialog with two methods, Docker first, each a numbered list from downloading the
   project to uploading idl.json. The steps and versions are the product's (model/steps.ts, versions.ts) */

/** The stable build server's versions (server/programs/Cargo.lock, server/Dockerfile) */
const ANCHOR_VERSION = "1.1.2"
const SOLANA_VERSION = "3.1.10"

/** Where both methods write the IDL: the project root */
const IDL_PATH = "idl.json"

type Method = "docker" | "local"
type Step = { kind: "download"; title: string } | { kind: "command"; title: string; note?: string; lines: string[] } | { kind: "upload"; title: string }

const DOWNLOAD: Step = { kind: "download", title: "Download the project, unzip it, and open a terminal in its folder." }
const UPLOAD: Step = {
  kind: "upload",
  title: `Upload ${IDL_PATH} from the project folder. Build the IDL again after you change the program's instructions or accounts.`,
}

const STEPS: Record<Method, Step[]> = {
  docker: [
    DOWNLOAD,
    {
      kind: "command",
      title: `Build the IDL in Anchor ${ANCHOR_VERSION}'s Docker image.`,
      lines: [`docker run --rm --platform linux/amd64 -v "$PWD":/workdir -w /workdir quay.io/ottersec/anchor:v${ANCHOR_VERSION} anchor idl build -o ${IDL_PATH}`],
    },
    UPLOAD,
  ],
  local: [
    DOWNLOAD,
    {
      kind: "command",
      title: "Install Rust.",
      note: "On Linux, install build-essential, pkg-config, libssl-dev, and libudev-dev first.",
      lines: ["curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y", '. "$HOME/.cargo/env"'],
    },
    {
      kind: "command",
      title: `Install the Solana CLI ${SOLANA_VERSION}.`,
      lines: [`sh -c "$(curl -sSfL https://release.anza.xyz/v${SOLANA_VERSION}/install)"`, 'export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"'],
    },
    {
      kind: "command",
      title: `Install Anchor ${ANCHOR_VERSION} through avm.`,
      lines: [`cargo install --git https://github.com/otter-sec/anchor --tag v${ANCHOR_VERSION} avm --locked --force`, `avm install ${ANCHOR_VERSION}`, `avm use ${ANCHOR_VERSION}`],
    },
    { kind: "command", title: "Build the IDL.", lines: [`anchor idl build -o ${IDL_PATH}`] },
    UPLOAD,
  ],
}

/** A step's command: soft wrapped, since the Docker line is longer than the dialog, with Copy at its corner */
function Command({ lines }: { lines: string[] }) {
  return (
    <CodeBlock className="relative mt-2 bg-surface-well">
      <CodeBlockContent className="pr-11 text-[0.75rem]">
        {lines.map((l) => (
          <code key={l} className="block whitespace-pre-wrap [overflow-wrap:anywhere]">
            {l}
          </code>
        ))}
      </CodeBlockContent>
      <CopyButton value={lines.join("\n")} label="Copy command" className="absolute top-1.5 right-1.5" />
    </CodeBlock>
  )
}

export function IdlGuide({ p, open, onOpenChange }: { p: Project; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [method, setMethod] = useState<Method>("docker")
  const steps = STEPS[method]
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-4rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Build the IDL on your machine</DialogTitle>
          <DialogDescription>
            Playground's build server makes no IDL for Anchor {ANCHOR_VERSION} yet, and the call form is built from one. Build it on your computer, then upload it here.
          </DialogDescription>
        </DialogHeader>
        <Segmented aria-label="IDL build method" value={method} onValueChange={(v) => v && setMethod(v as Method)} className="justify-self-start">
          <SegmentedItem value="docker">Docker</SegmentedItem>
          <SegmentedItem value="local">Local toolchain</SegmentedItem>
        </Segmented>
        <ol className="flex flex-col gap-5">
          {steps.map((s, i) => (
            <li key={s.title} className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-2">
              <span aria-hidden="true" className="grid size-6 place-items-center rounded-full bg-foreground/[0.06] text-[0.75rem] text-muted-foreground tabular-nums">
                {i + 1}
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="text-[0.875rem] leading-5 text-foreground">{s.title}</p>
                {s.kind === "command" && s.note && <p className="mt-1 text-caption text-muted-foreground">{s.note}</p>}
                {s.kind === "command" && <Command lines={s.lines} />}
                {s.kind === "download" && (
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => toast(`${p.name}.zip downloaded`)}>
                    <Download />
                    Download project
                  </Button>
                )}
                {s.kind === "upload" && (
                  <Button
                    size="sm"
                    className="mt-2"
                    onClick={() => {
                      uploadIdl(p.id)
                      onOpenChange(false)
                    }}
                  >
                    <Upload />
                    Upload IDL
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ol>
      </DialogContent>
    </Dialog>
  )
}
