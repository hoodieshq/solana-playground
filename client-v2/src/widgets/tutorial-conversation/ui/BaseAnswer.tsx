import Markdown from "@/components/Markdown";
import { cn } from "@/shared/lib/utils";

import { READ } from "./Prose";

export interface BaseAnswerProps {
  text: string;
  /** A reply, the reason a turn failed, or what the panel did (a stop) */
  tone: "reply" | "error" | "notice";
}

/** How each tone reads: a reply as the lesson's own lines do */
const TONE: Record<BaseAnswerProps["tone"], string> = {
  reply: READ,
  error: "text-caption text-error",
  notice: "text-caption text-subtle",
};

/**
 * The live assistant's turn in the feed: its Markdown on the column's
 * ground, with no bubble and in the lesson's own type (`inheritFont`), so
 * the two read as one thread (spec "The lesson and the assistant share one
 * thread").
 */
const BaseAnswer = ({ text, tone }: BaseAnswerProps) => (
  <div className={cn("flex flex-col gap-2", TONE[tone])}>
    <span className="sr-only">Assistant: </span>
    {tone === "reply" ? <Markdown inheritFont>{text}</Markdown> : <p>{text}</p>}
  </div>
);

export default BaseAnswer;
