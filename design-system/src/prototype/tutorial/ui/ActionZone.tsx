import { useEffect, useRef, useState } from "react"
import { ArrowRight, ChevronDown, X } from "lucide-react"

import { BrandButton } from "@/components/ui/brand-button"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { STEPS } from "../data"
import { fixFor, useStore } from "../store"
import { AssistantMark } from "./AssistantMark"
import { NameField } from "./NameField"
import { StepStatus, workingLabel, type Lead } from "./StepStatus"

/** A screen shorter than this, in rem, keeps the status to one line. rem, not px: a larger system
 * font makes the same phone shorter for the code, and that's when the line has to give way. At 44
 * a 320 by 640 phone folds at any size, a 390 by 844 one only at 130% */
const SHORT = 44

function useShort() {
  const measure = () => window.innerHeight / parseFloat(getComputedStyle(document.documentElement).fontSize) < SHORT
  const [short, setShort] = useState(measure)
  useEffect(() => {
    const update = () => setShort(measure())
    window.addEventListener("resize", update)
    // A font size set on the page changes no viewport, so watch the root's style too
    const mo = new MutationObserver(update)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["style", "class"] })
    return () => {
      window.removeEventListener("resize", update)
      mo.disconnect()
    }
  }, [])
  return short
}

/** The bottom of a step: a big zone, after Mimo's, holding the step's status
 * and one main button that shows the state too. Write or Deploy, then
 * Building, then a green Next. The status line replaces both the "Done when"
 * line up top and the passed / not yet sheets */
export function ActionZone({ lead }: { lead?: Lead }) {
  const { s, dispatch } = useStore()
  const step = STEPS[s.step]
  const last = s.step === STEPS.length - 1
  const busy = s.phase === "building" || s.phase === "deploying" || s.phase === "calling"
  // The step's last move, calling hello with a name: the field sits right above the buttons, in
  // reach of a thumb, and the main button runs the call
  const calls = s.phase === "call" || s.phase === "calling"
  const passed = s.phase === "passed"
  const failed = s.phase === "failed"
  const reviewing = s.phase === "patch"
  // Once the sheet has explained the error, what's left to do is look at the fix, as on desktop
  const toFix = failed && s.explained && !!fixFor(s)
  const big = "h-14"

  // On a short screen the status keeps to one line, so the code keeps its lines. A chevron opens
  // the rest when there is more, and every new status starts folded again
  const short = useShort()
  // Opened for one status only: the key of the one it was opened on
  const [openOn, setOpenOn] = useState<string | null>(null)
  const [cut, setCut] = useState(false)
  const status = useRef<HTMLParagraphElement>(null)
  const key = `${s.step}-${s.phase}-${s.review}-${lead?.text ?? ""}`
  const open = openOn === key
  const folded = short && !open
  useEffect(() => {
    // The sentence, after the status's icon
    const el = status.current?.querySelector<HTMLElement>(":scope > span:last-child")
    if (!el) return
    const check = () => setCut(el.scrollHeight - el.clientHeight > 1 || el.scrollWidth - el.clientWidth > 1)
    check()
    // The assistant's line types itself out, so it can run long a moment after it shows
    const ro = new ResizeObserver(check)
    ro.observe(el)
    const mo = new MutationObserver(check)
    mo.observe(el, { childList: true, subtree: true, characterData: true })
    return () => {
      ro.disconnect()
      mo.disconnect()
    }
  }, [folded, key])

  return (
    <footer className="shrink-0 border-t border-border bg-surface-panel px-3 pt-3 pb-[max(var(--safe-bottom),16px)]">
      <div className={cn("flex items-start gap-1", short ? "mb-3" : "mb-4")}>
        <p
          ref={status}
          role="status"
          aria-live="polite"
          className={cn(
            "flex min-h-5 min-w-0 flex-1 items-start gap-1.5 px-1 text-caption leading-relaxed text-muted-foreground",
            // The sentence is the status's last child: it takes the cut, the icon stays whole
            folded && "[&>span:last-child]:line-clamp-1"
          )}
        >
          <StepStatus lead={lead} />
        </p>
        {short && (cut || open) && (
          <button
            type="button"
            aria-expanded={open}
            aria-label={open ? "Show less" : "Show the whole status"}
            onClick={() => setOpenOn(open ? null : key)}
            // 44px to hit, pulled up and out so the line keeps its height
            className="-my-3 -mr-1 flex size-11 shrink-0 items-center justify-center text-muted-foreground active:text-foreground"
          >
            <ChevronDown strokeWidth={1.75} className={cn("size-4 transition-transform duration-150 ease-standard motion-reduce:transition-none", open && "rotate-180")} />
          </button>
        )}
      </div>
      {calls && (
        <form
          id="call-hello"
          className="mb-3"
          onSubmit={(e) => {
            e.preventDefault()
            dispatch({ type: "call" })
          }}
        >
          <NameField className="h-12" />
        </form>
      )}
      {/* Sized by its own width, which a larger system font narrows too: on a small phone Ask keeps
          only its mark, Don't apply only its cross, and a long label takes two lines rather than
          running into the edges */}
      <div className="@container flex gap-2">
        {reviewing ? (
          <Button
            variant="secondary"
            className={cn(big, "px-5 @max-xs:w-14 @max-xs:px-0")}
            aria-label="Don't apply"
            onClick={() => dispatch({ type: "close" })}
          >
            <X strokeWidth={1.75} className="hidden size-5 @max-xs:block" aria-hidden="true" />
            <span className="@max-xs:sr-only">Don't apply</span>
          </Button>
        ) : (
          // The assistant's mark: Ask goes to the assistant, the same one that answers in the sheet
          <Button
            variant="secondary"
            disabled={busy}
            className={cn(big, "gap-2 px-4 @max-xs:w-14 @max-xs:px-0")}
            aria-label="Ask the assistant about this step"
            onClick={() => dispatch({ type: "explain", mode: "step" })}
          >
            <AssistantMark className="size-[18px] text-brand-purple" />
            <span className="@max-xs:sr-only">Ask</span>
          </Button>
        )}

        {passed ? (
          <Button
            className={cn(big, "min-w-0 flex-1 gap-2 bg-success text-success-foreground hover:bg-success/90 @max-xs:px-3")}
            onClick={() => dispatch({ type: "next" })}
          >
            <Label>{last ? "Finish tutorial" : `Next: ${STEPS[s.step + 1].title}`}</Label>
            <ArrowRight strokeWidth={2.25} className="size-4" />
          </Button>
        ) : (
          <BrandButton
            variant="accent"
            disabled={busy || (calls && !s.draft.trim())}
            className={cn(big, "min-w-0 flex-1 gap-2 @max-xs:px-3")}
            // Calling submits the name's form, so Go on the keyboard and the button do the same
            type={calls ? "submit" : "button"}
            form={calls ? "call-hello" : undefined}
            onClick={() =>
              !calls &&
              dispatch(
                reviewing
                  ? { type: "apply" }
                  : toFix
                    ? { type: "reviewFix" }
                    : failed
                      ? { type: "explain", mode: "error" }
                      : step.deploy
                        ? { type: "deploy" }
                        : { type: "askPatch" }
              )
            }
          >
            <Label>
              {busy
                ? workingLabel(s)
                : calls
                  ? "Call hello"
                  : reviewing
                  ? step.id === "call-client"
                    ? "Apply and run"
                    : "Apply and build"
                  : toFix
                    ? "Review the fix"
                    : failed
                      ? "Explain the error"
                      : step.cta}
            </Label>
          </BrandButton>
        )}
      </div>
    </footer>
  )
}

/** A main button's words: one line where there's room, two at most where there isn't */
function Label({ children }: { children: string }) {
  return <span className="line-clamp-2 min-w-0 text-center leading-tight whitespace-normal">{children}</span>
}
