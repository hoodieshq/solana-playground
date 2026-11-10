import { FolderUp } from "lucide-react"
import { RadioGroup } from "radix-ui"
import { useState, type KeyboardEvent, type Ref } from "react"

import { Button } from "@/components/ui/button"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group"
import { Spinner } from "@/components/ui/spinner"
import { StatusDot } from "@/components/ui/status-dot"
import { cn } from "@/lib/utils"

import { soon } from "../../desktop/Catalog"
import { frameworkOf } from "./data"
import { ImportSteps, type Step } from "./ImportSteps"
import { CheckBadge, LitPick } from "./LitPick"
import { isGithubLink, repoOf, type Env, type FirstLightState, type ImportProblem } from "./model"
import { ProblemCallout, type CalloutAction } from "./ProblemCallout"
import { GitHubMark } from "./SourceRail"

const HINT = "Public repos with an Anchor, Native or Seahorse program."
const NOT_A_LINK = "This isn't a GitHub link. Paste one that starts with https://github.com/ or https://gist.github.com/"

type Problem = { title: string; cause: string; primary?: "edit" | "github" | "folder" | "retry" | "retry-off"; secondary?: "edit" | "github" }

/** What each problem says and offers (CONSENSUS.md, section 8). Only a broken copy is Playground's
 * fault, so only it is red */
const PROBLEMS: Record<ImportProblem, Problem> = {
  "not-found": {
    title: "Couldn't open this repo",
    cause: "It may be private, moved, or misspelled. Playground imports public repos only.",
    primary: "edit",
    secondary: "github",
  },
  "not-found-signed-in": { title: "Repo not found", cause: "Check the link. The repo may have moved or been deleted.", primary: "edit", secondary: "github" },
  private: {
    title: "This repo is private",
    cause: "Playground imports public repos only. Download it and import the folder instead.",
    primary: "folder",
    secondary: "edit",
  },
  "no-program": { title: "No Solana program here", cause: "Playground opens Anchor, Native and Seahorse programs. Try a link to the program's folder.", primary: "edit" },
  "rate-limited": { title: "GitHub limit reached", cause: "GitHub limits how often this browser can import. Try again after 4:12 PM.", primary: "retry-off" },
  "too-large": { title: "Repo too large", cause: "GitHub sent only part of its file list. Link to the program's folder instead.", primary: "edit" },
  broke: { title: "Could not import the repo.", cause: "Nothing was added to your projects.", primary: "retry" },
}

/** The other way in, under the link: a folder from your computer. A drop zone with its own button, so it
 * reads as an action and not a line of text (Almaz, 10 Nov). Where there's a finger there's no dragging,
 * so the button alone says what to do */
function FolderDrop() {
  const [over, setOver] = useState(false)
  const touch = document.documentElement.classList.contains("touch")
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        soon()
      }}
      // A soft ground and no outline: the dashed edge read heavier than the link field it stands under
      // (Almaz, 10 Nov). A folder held over it lights a ring, so the drop still has a target
      className={cn(
        "mt-6 flex items-center gap-3 rounded-xl px-4 py-3.5 transition-[background-color,box-shadow] duration-100 motion-reduce:transition-none [html.phone_&]:mt-4",
        over ? "bg-(--np-current) ring-2 ring-(--ring)" : "bg-(--np-hover)"
      )}
    >
      <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-lg bg-foreground/[0.06] text-muted-foreground">
        <FolderUp className="size-[18px]" strokeWidth={1.75} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[0.875rem] leading-5 font-act text-foreground">Import a folder</span>
        <span className="text-[0.8125rem] leading-[1.125rem] font-read text-muted-foreground">{touch ? "Choose one from your device." : "Drop it here, or choose one from your computer."}</span>
      </span>
      <Button variant="outline" size="sm" onClick={soon} className="shrink-0 [html.touch_&]:h-11">
        Choose folder
      </Button>
    </div>
  )
}

/** The checklist's four rows for where the import stands */
function stepsOf(i: FirstLightState["import"]): Step[] {
  if (i.state !== "fetching" && i.state !== "failed" && i.state !== "choose") return []
  const at = i.state === "fetching" ? i.step : i.state === "failed" ? i.at : 2
  const status = (n: number): Step["status"] => (n < at ? "done" : n > at ? "waiting" : i.state === "failed" ? "failed" : "running")
  const found = i.state === "fetching" ? i.found : i.state === "choose" ? i.programs.length : undefined
  const loaded = i.state === "fetching" || i.state === "failed" ? i.loaded : undefined
  const program = i.state === "fetching" ? i.program : undefined
  const open = program && !program.readme ? `Open ${frameworkOf(program.framework).main.split("/").at(-1)}` : "Open README"
  return [
    { label: "Read the repo", detail: at > 0 ? `${repoOf(i.url)} · main` : undefined, status: status(0) },
    { label: "Find programs", detail: at > 1 && found !== undefined ? `${found} found` : undefined, status: status(1) },
    { label: "Copy files", detail: loaded !== undefined ? `${loaded} of ${i.state === "fetching" ? (i.total ?? 24) : 24}` : undefined, status: status(2) },
    { label: open, status: status(3) },
  ]
}

/** Import from GitHub (CONSENSUS.md, 3.7): the link, a line under it, then the checklist once a fetch
 * starts, the program pick when a repo holds several, and what went wrong where it went wrong */
export function ImportPanel({
  s,
  env,
  urlRef,
  onUrl,
  onStart,
  onPaste,
  onPick,
  onEnterKey,
  onEditLink,
  onRetry,
  onToggleDetails,
  onUseStarter,
}: {
  s: FirstLightState
  env: Env
  urlRef: Ref<HTMLInputElement>
  onUrl: (url: string) => void
  onStart: () => void
  /** "" is the Paste button: Oak pastes the sample link */
  onPaste: (url: string) => void
  onPick: (name: string) => void
  onEnterKey: (e: KeyboardEvent) => void
  onEditLink: () => void
  onRetry: () => void
  onToggleDetails: () => void
  onUseStarter: () => void
}) {
  const i = s.import
  const url = i.state === "empty" ? "" : i.url
  const fetching = i.state === "fetching"
  const notALink = i.state === "typed" && !isGithubLink(i.url)
  const steps = stepsOf(i)
  const action = (k?: Problem["primary"] | Problem["secondary"]): CalloutAction | undefined => {
    if (k === "edit") return { label: "Edit link", onClick: onEditLink }
    if (k === "github") return { label: "Open on GitHub", onClick: soon }
    if (k === "folder") return { label: "Import a folder", onClick: soon }
    if (k === "retry" || k === "retry-off") return { label: "Try again", onClick: onRetry, disabled: k === "retry-off" }
    return undefined
  }

  return (
    <div className="flex flex-col">
      <InputGroup className="np-field h-10 [html.phone_&]:h-12 [html.touch_&]:h-11">
        <InputGroupAddon>
          <GitHubMark className="text-muted-foreground" />
        </InputGroupAddon>
        <InputGroupInput
          ref={urlRef}
          aria-label="GitHub or gist link"
          aria-invalid={notALink || undefined}
          aria-describedby="np-url-line"
          placeholder="https://github.com/owner/repo"
          inputMode="url"
          enterKeyHint="go"
          autoComplete="off"
          spellCheck={false}
          disabled={!env.online}
          readOnly={fetching}
          value={url}
          onChange={(e) => onUrl(e.target.value)}
          onPaste={(e) => {
            const text = e.clipboardData.getData("text").trim()
            if (!isGithubLink(text)) return
            e.preventDefault()
            onPaste(text)
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.metaKey && !e.ctrlKey) {
              e.preventDefault()
              onStart()
            }
          }}
          className="font-mono text-[0.8125rem] md:text-[0.8125rem]"
        />
        <InputGroupAddon align="inline-end" className="pr-1.5 has-[>button]:mr-0">
          {fetching ? (
            <Spinner aria-hidden="true" role="presentation" className="mr-1 size-3.5 text-muted-foreground" />
          ) : (
            !url &&
            env.online && (
              <InputGroupButton size="xs" variant="ghost" onClick={() => onPaste("")} className="[html.phone_&]:h-9 [html.phone_&]:px-3">
                Paste
              </InputGroupButton>
            )
          )}
        </InputGroupAddon>
      </InputGroup>

      <p id="np-url-line" className="mt-1.5 flex min-h-4 items-start gap-2 text-xs leading-4 font-[380]">
        {notALink ? (
          <>
            <StatusDot variant="warning" className="mt-[5px]" />
            <span className="text-muted-foreground">{NOT_A_LINK}</span>
          </>
        ) : (
          <span className="text-(color:--text-quiet)">{HINT}</span>
        )}
      </p>

      {!env.online && (
        <ProblemCallout
          tone="warning"
          title="You're offline"
          cause="Import needs a connection. Starters work offline."
          primary={{ label: "Use a starter", onClick: onUseStarter }}
          focus={false}
          className="mt-3"
        />
      )}

      {env.online && !steps.length && <FolderDrop />}

      {steps.length > 0 && i.state !== "choose" && (
        <div className="mt-4">
          <ImportSteps steps={steps} tone={i.state === "failed" && i.kind === "broke" ? "error" : "warning"} />
        </div>
      )}

      {i.state === "choose" && (
        <div className="mt-4 flex flex-col">
          <p className="text-[0.8125rem] leading-[1.125rem] font-act text-foreground">{`${i.programs.length} programs found. Pick one to import.`}</p>
          <RadioGroup.Root aria-label="Program" value={i.picked ?? ""} onValueChange={onPick} onKeyDown={onEnterKey} className="mt-3 flex flex-col gap-1">
            {i.programs.map((p) => {
              const picked = i.picked === p.name
              const f = frameworkOf(p.framework)
              return (
                <RadioGroup.Item
                  key={p.path}
                  value={p.name}
                  data-picked={picked || undefined}
                  aria-label={`${p.path}, ${f.name}`}
                  className="np-pickable np-row -mx-3 flex h-12 shrink-0 items-center gap-2 rounded-xl px-3 text-left [html.phone_&]:h-16 [html.touch_&]:h-[52px]"
                >
                  <LitPick />
                  <span className="min-w-0 flex-1 truncate font-mono text-[0.8125rem] text-foreground">{p.path}</span>
                  {picked && <CheckBadge size={16} />}
                  <img src={f.logo} alt="" className={cn("size-4", f.round ? "rounded-full" : "rounded")} />
                </RadioGroup.Item>
              )
            })}
          </RadioGroup.Root>
        </div>
      )}

      {i.state === "failed" && (
        <ProblemCallout
          tone={i.kind === "broke" ? "error" : "warning"}
          title={PROBLEMS[i.kind].title}
          cause={PROBLEMS[i.kind].cause}
          primary={action(PROBLEMS[i.kind].primary)}
          secondary={action(PROBLEMS[i.kind].secondary)}
          details={i.kind === "broke" ? "TypeError: Failed to fetch\n    at copyFile (programs/counter/src/state.rs, 9 of 24)" : undefined}
          open={i.details}
          onToggle={onToggleDetails}
          className="mt-3 whitespace-pre-line"
        />
      )}
    </div>
  )
}

