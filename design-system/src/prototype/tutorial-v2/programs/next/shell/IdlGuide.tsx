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
   project to uploading idl.json. The commands and versions are the product's (model/steps.ts, versions.ts);
   the words are cut to what each step needs (Almaz, 18 Nov: too much text). A step's title never repeats
   its button: the title says what to do, the button does the other half */

/** The stable build server's versions (server/programs/Cargo.lock, server/Dockerfile) */
const ANCHOR_VERSION = "1.1.2"
const SOLANA_VERSION = "3.1.10"

/** Where both methods write the IDL: the project root */
const IDL_PATH = "idl.json"

type Method = "docker" | "local"
type Step = { kind: "download"; title: string } | { kind: "command"; title: string; note?: string; lines: string[] } | { kind: "upload"; title: string }

const DOWNLOAD: Step = { kind: "download", title: "Unzip the project and open a terminal in it" }
const UPLOAD: Step = {
  kind: "upload",
  title: `Upload ${IDL_PATH}`,
}

const STEPS: Record<Method, Step[]> = {
  docker: [
    DOWNLOAD,
    {
      kind: "command",
      title: "Build the IDL",
      lines: [`docker run --rm --platform linux/amd64 -v "$PWD":/workdir -w /workdir quay.io/ottersec/anchor:v${ANCHOR_VERSION} anchor idl build -o ${IDL_PATH}`],
    },
    UPLOAD,
  ],
  local: [
    DOWNLOAD,
    {
      kind: "command",
      title: "Install Rust",
      note: "Linux needs build-essential, pkg-config, libssl-dev and libudev-dev first",
      lines: ["curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y", '. "$HOME/.cargo/env"'],
    },
    {
      kind: "command",
      title: `Install Solana CLI ${SOLANA_VERSION}`,
      lines: [`sh -c "$(curl -sSfL https://release.anza.xyz/v${SOLANA_VERSION}/install)"`, 'export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"'],
    },
    {
      kind: "command",
      title: `Install Anchor ${ANCHOR_VERSION}`,
      lines: [`cargo install --git https://github.com/otter-sec/anchor --tag v${ANCHOR_VERSION} avm --locked --force`, `avm install ${ANCHOR_VERSION}`, `avm use ${ANCHOR_VERSION}`],
    },
    { kind: "command", title: "Build the IDL", lines: [`anchor idl build -o ${IDL_PATH}`] },
    UPLOAD,
  ],
}

/** A step's command: soft wrapped, since the Docker line is longer than the dialog, with Copy at its corner.
 * The dialog is 672 wide so every line but Docker's and cargo's fits, and those two break at a space, not
 * inside a path (Almaz, 18 Nov) */
function Command({ lines }: { lines: string[] }) {
  return (
    <CodeBlock className="relative mt-2.5 bg-surface-well">
      <CodeBlockContent className="pr-11 text-[0.75rem] leading-5">
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
      {/* The dialog hangs from a fixed top, not the screen's middle: Docker has three steps and the local
          toolchain six, and centred, the switch you had just pressed jumped away from the pointer (Almaz,
          18 Nov). The head and the switch stay put; the steps scroll under them when the window is short.
          One rhythm, read from the outside in: 24 round the edge, 20 between the head, the switch and the
          steps, 24 between steps, 10 from a step's words to its control */}
      <DialogContent className="top-[max(2rem,calc(50dvh-23rem))] flex max-h-[calc(100dvh-4rem)] translate-y-0 flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl [&>[data-slot=dialog-close]]:top-4 [&>[data-slot=dialog-close]]:right-4">
        <div className="flex shrink-0 flex-col gap-5 px-6 pt-6 pb-5">
          <DialogHeader className="gap-1.5">
            <DialogTitle className="pr-8 leading-6">Build the IDL locally</DialogTitle>
            <DialogDescription>
              The call form needs an IDL, and Playground can't build one yet.
            </DialogDescription>
          </DialogHeader>
          {/* The switch New project's dialog has across its top, at its size: a full width track, 32 high
              tabs (Almaz, 18 Nov: the 28 thumb was small for the dialog's one choice) */}
          <Segmented variant="boxed" aria-label="IDL build method" value={method} onValueChange={(v) => v && setMethod(v as Method)} className="flex w-full bg-foreground/[0.05]">
            {(["docker", "local"] as const).map((m) => (
              <SegmentedItem key={m} value={m} className="flex-1 rounded-lg text-sm leading-5 data-[state=on]:bg-foreground/[0.11] [html.touch_&]:h-10">
                {m === "docker" ? "Docker" : "Local toolchain"}
              </SegmentedItem>
            ))}
          </Segmented>
        </div>
        <ol className="flex min-h-0 flex-col gap-6 overflow-y-auto px-6 pb-6">
          {steps.map((s, i) => (
            <li key={s.title} className="grid grid-cols-[1rem_minmax(0,1fr)] gap-x-2.5">
              {/* A plain numeral on the title's own line: six grey discs down the side were louder than the steps */}
              <span aria-hidden="true" className="text-[0.875rem] leading-5 text-muted-foreground tabular-nums">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-[0.875rem] leading-5 font-medium text-foreground">{s.title}</p>
                {s.kind === "command" && s.note && <p className="mt-1 text-caption text-muted-foreground">{s.note}</p>}
                {s.kind === "command" && <Command lines={s.lines} />}
                {s.kind === "download" && (
                  <Button variant="outline" className="mt-2.5" onClick={() => toast(`${p.name}.zip downloaded`)}>
                    <Download />
                    Download project
                  </Button>
                )}
                {s.kind === "upload" && (
                  <Button
                    className="mt-2.5"
                    onClick={() => {
                      uploadIdl(p.id)
                      onOpenChange(false)
                    }}
                  >
                    <Upload />
                    Choose file
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
