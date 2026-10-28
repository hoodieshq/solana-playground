import { useState } from "react";
import {
  Anchor,
  Axe,
  Expand,
  Check,
  ChevronRight,
  Copy,
  ExternalLink,
  Play,
} from "lucide-react";

import { Achievement, AchievementMedia } from "@/components/ui/achievement";
import { BrandButton } from "@/components/ui/brand-button";
import { cn } from "@/lib/utils";

import { LESSON, NEXT_TUTORIAL, STEPS, TX_FEE, shortKey } from "../data";
import { useOpenTutorial } from "../host";
import { useStore } from "../store";
import { lastTx } from "../tx";
import { openExplorer } from "./explorer";
import { PrintedReceipt, copyReceipt } from "./Receipt";

/** The flow's peak: the badge pops in once, on the design system's pop curve, and simply appears with reduced motion */
export function FinishBadge({ className }: { className?: string }) {
  return (
    <Achievement
      className={cn("mx-auto w-auto", className)}
      role="img"
      aria-label={`Badge earned: ${LESSON.badge}`}
    >
      <AchievementMedia className="size-16 shadow-glow duration-[440ms] ease-pop animate-in fade-in zoom-in-50 motion-reduce:animate-none">
        {/* The badge draws what the lesson built: an Anchor program, or a game's axe */}
        {LESSON.game ? <Axe /> : LESSON.memory ? <Expand /> : <Anchor />}
      </AchievementMedia>
    </Achievement>
  );
}

/** Steps and time, in one line under the headline: the numbers stay, without a strip of tiles that
 * argues with the headline */
export function FinishMeta({ className }: { className?: string }) {
  const { s } = useStore();
  const minutes =
    s.startedAt && s.finishedAt
      ? Math.max(1, Math.round((s.finishedAt - s.startedAt) / 60000))
      : 1;
  return (
    // text-caption outside cn, which takes it for a colour and drops it next to text-muted-foreground
    <p
      className={`${cn(
        "text-center text-muted-foreground tabular-nums",
        className,
      )} text-caption`}
    >
      <span className="whitespace-nowrap">
        {s.passed.filter(Boolean).length} steps
      </span>{" "}
      · <span className="whitespace-nowrap">{minutes} min</span>
    </p>
  );
}

/** The outcome in words, in the interface's type. What the program said back has its own card below */
export function FinishHeadline({
  as: Tag = "h1",
  className,
}: {
  as?: "h1" | "h2";
  className?: string;
}) {
  return (
    <Tag
      className={cn(
        "text-center font-heading text-[1.75rem] leading-[1.15] font-medium tracking-tight text-foreground max-[30rem]:text-[1.5rem]",
        className,
      )}
    >
      Your program is live on devnet
    </Tag>
  );
}

/** The proof, short: the call and what the program answered, the only place the name appears; then
 * what it cost your wallet, in test SOL. The full receipt opens under it on request */
export function AnswerCard({ className }: { className?: string }) {
  const { s } = useStore();
  const tx = lastTx(s);
  const [open, setOpen] = useState(false);
  const icon =
    "flex size-9 shrink-0 items-center justify-center rounded-control text-muted-foreground hover:bg-surface-hover hover:text-foreground pointer-coarse:size-11";
  return (
    <section aria-label="Your last transaction" className={className}>
      <div className="rounded-card border border-border bg-surface-well">
        <div className="px-4 pt-4 pb-3.5">
          <p className="font-mono text-code text-muted-foreground">
            {LESSON.callTx
              ? s.name !== null
                ? `hello("${s.name}") returned`
                : "hello() returned"
              : `${tx.instruction}() returned`}
          </p>
          <p className="mt-1 font-mono text-[1.375rem] leading-tight font-medium break-words text-foreground max-[30rem]:text-[1.25rem]">
            {tx.said}
          </p>
          <div className="mt-3.5 flex items-start justify-between gap-4 border-t border-border pt-3 text-caption">
            <span className="text-muted-foreground">You paid</span>
            <span className="text-right">
              <span className="block font-medium text-foreground">{TX_FEE}</span>
              <span className="block text-subtle">Devnet SOL: free test money</span>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 border-t border-border py-1 pr-1.5 pl-2">
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
            className="flex min-h-11 min-w-0 flex-1 items-center gap-1.5 rounded-control px-2 text-left text-caption text-muted-foreground hover:text-foreground"
          >
            <ChevronRight
              strokeWidth={1.75}
              className={cn(
                "size-3.5 shrink-0 transition-transform duration-150 motion-reduce:transition-none",
                open && "rotate-90",
              )}
              aria-hidden="true"
            />
            <span className="truncate">
              Transaction{" "}
              <span className="font-mono">{shortKey(tx.signature)}</span>
            </span>
          </button>
          <button
            type="button"
            aria-label="Copy receipt"
            onClick={() => copyReceipt(tx)}
            className={icon}
          >
            <Copy strokeWidth={1.75} className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Open in Explorer"
            onClick={openExplorer}
            className={icon}
          >
            <ExternalLink strokeWidth={1.75} className="size-4" />
          </button>
        </div>
      </div>
      {open && (
        <PrintedReceipt under tx={tx} when={s.finishedAt} className="mt-3" />
      )}
    </section>
  );
}

export function LearnedList({ className }: { className?: string }) {
  return (
    <ul className={cn("flex flex-col gap-2.5", className)}>
      {STEPS.map((step) => (
        // The reading weight, as in the lesson; grey stays, it's a secondary list
        <li
          key={step.id}
          className="flex items-start gap-2.5 text-body font-read text-muted-foreground"
        >
          <Check
            strokeWidth={2.25}
            className="mt-1 size-4 shrink-0 text-success"
          />
          {step.learned}
        </li>
      ))}
    </ul>
  );
}

/** One way on, and the only gradient on the screen: the next tutorial, by name */
export function NextTutorialButton({ className }: { className?: string }) {
  const openTutorial = useOpenTutorial();
  if (!NEXT_TUTORIAL || !LESSON.next) return null;
  const next = LESSON.next;
  return (
    <BrandButton
      className={cn("h-12 w-full text-[0.9375rem]", className)}
      onClick={() => openTutorial(next)}
    >
      <Play className="size-4 fill-current" aria-hidden="true" />
      Start {NEXT_TUTORIAL.name}
    </BrandButton>
  );
}
