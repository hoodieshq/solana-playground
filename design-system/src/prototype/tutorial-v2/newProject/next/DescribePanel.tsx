import { ChevronDown } from "lucide-react"
import type { Ref } from "react"

import { Composer, ComposerInput, ComposerToolbar } from "@/components/ui/composer"
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

import { soon } from "../../desktop/Catalog"
import { DESCRIBE_CHIPS, FRAMEWORKS, frameworkOf, type FrameworkId } from "./data"
import { FrameworkLogo } from "./FrameworkCard"
import type { Env, FirstLightState } from "./model"
import { ProblemCallout, type CalloutAction } from "./ProblemCallout"

/** Describe it (CONSENSUS.md, 3.8, concept): the request, the framework it starts from, three examples
 * that fill the box. Enter makes a new line; the footer sends. With no assistant to take it, the box
 * waits and the panel says why */
export function DescribePanel({
  s,
  env,
  boxRef,
  onText,
  onFramework,
  onUseStarter,
}: {
  s: FirstLightState
  env: Env
  boxRef: Ref<HTMLTextAreaElement>
  onText: (text: string) => void
  onFramework: (f: FrameworkId) => void
  onUseStarter: () => void
}) {
  const sending = s.run.state === "creating"
  const starter: CalloutAction = { label: "Use a starter", onClick: onUseStarter }
  const problem = !env.online
    ? { title: "You're offline", cause: "Describe it needs a connection. Starters work offline.", primary: starter }
    : env.assistant === "off"
      ? { title: "The assistant has no model", cause: "Connect a model to use Describe it. A starter works without it.", primary: { label: "Connect a model", onClick: soon }, secondary: starter }
      : env.assistant === "limit"
        ? {
            title: "Daily limit reached",
            cause: "You've used today's free assistant messages. They come back at 3:00 PM.",
            primary: { label: "Add an API key", onClick: soon },
            secondary: starter,
          }
        : null
  const off = problem !== null
  const f = frameworkOf(s.framework)

  return (
    // The box takes the body's height, the line and the examples keep to its foot: the panel had its words
    // at the top and a band of nothing under them (Almaz, 10 Nov). The phone's page has no fixed body, so
    // there the box keeps its own height
    <div className="flex h-full flex-col">
      <Composer onSubmit={() => {}} className={cn("min-h-0 flex-1 [html.phone_&]:flex-none", off && "pointer-events-none opacity-50")}>
        <ComposerInput
          ref={boxRef}
          aria-label="Describe the program"
          placeholder="Describe the program you want to build"
          value={s.describe.text}
          disabled={off}
          readOnly={sending}
          onChange={(e) => onText(e.target.value)}
          onKeyDown={(e) => {
            // Enter is a new line here; Cmd+Enter sends, from the dialog
            if (e.key !== "Enter" || e.metaKey || e.ctrlKey || e.shiftKey || e.nativeEvent.isComposing) return
            e.preventDefault()
            const el = e.currentTarget
            el.setRangeText("\n", el.selectionStart, el.selectionEnd, "end")
            onText(el.value)
          }}
          className="min-h-[120px] flex-1 font-read placeholder:text-subtle h-auto! max-h-none! [html.phone_&]:h-[160px]! [html.phone_&]:flex-none"
        />
        <ComposerToolbar>
          <DropdownMenu>
            <DropdownMenuTrigger
              disabled={off || sending}
              className="flex h-7 items-center gap-1.5 rounded-lg px-2 text-[0.8125rem] font-act text-foreground outline-none hover:bg-(--np-hover) focus-visible:ring-2 focus-visible:ring-ring [html.phone_&]:h-9 [html.touch_&]:h-9"
            >
              <FrameworkLogo f={f} size={14} />
              {f.name}
              <ChevronDown aria-hidden="true" className="size-3 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuRadioGroup value={s.framework} onValueChange={(v) => onFramework(v as FrameworkId)}>
                {FRAMEWORKS.map((x) => (
                  <DropdownMenuRadioItem key={x.id} value={x.id}>
                    <FrameworkLogo f={x} size={14} />
                    {x.name}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </ComposerToolbar>
      </Composer>

      {/* Under the box, where the worry comes up, and at the size of a field's hint: at 12 in the quiet grey
          under the examples the one line that answers "will it break my code" was the easiest to miss */}
      <p className="mt-2 text-[0.8125rem] leading-[1.125rem] font-read text-muted-foreground">The assistant builds on a starter. You review every change.</p>

      {/* "Try" says a chip fills the box: bare, they read as filters. On the phone they run in one row that
          scrolls sideways */}
      <div
        className={cn(
          "mt-4 flex flex-wrap items-center gap-2 [html.phone_&]:-mx-4 [html.phone_&]:flex-nowrap [html.phone_&]:overflow-x-auto [html.phone_&]:px-4 [html.phone_&]:[scrollbar-width:none]",
          off && "opacity-50"
        )}
      >
        <span className="mr-1 shrink-0 text-[0.8125rem] leading-[1.125rem] text-(color:--text-quiet)">Try</span>
        {DESCRIBE_CHIPS.map((c) => (
          <button
            key={c.label}
            type="button"
            disabled={off || sending}
            onClick={() => {
              onText(c.text)
              const box = document.querySelector<HTMLTextAreaElement>("[data-slot=composer-input]")
              requestAnimationFrame(() => {
                box?.focus()
                box?.setSelectionRange(box.value.length, box.value.length)
              })
            }}
            className="h-7 rounded-lg border border-border px-2.5 text-[0.8125rem] font-[380] text-muted-foreground outline-none hover:bg-(--np-hover) hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none [html.phone_&]:h-9 [html.phone_&]:shrink-0 [html.touch_&]:h-9"
          >
            {c.label}
          </button>
        ))}
      </div>

      {problem && <ProblemCallout tone="warning" title={problem.title} cause={problem.cause} primary={problem.primary} secondary={problem.secondary} focus={false} className="mt-3" />}
    </div>
  )
}
