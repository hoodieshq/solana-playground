import { CirclePlayIcon } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { Callout, CalloutDescription } from "@/shared/ui/callout";
import { Marker, MarkerIcon } from "@/shared/ui/marker";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/shared/ui/message-scroller";
import { Spinner } from "@/shared/ui/spinner";
import { useEffect, useRef } from "react";
import type * as React from "react";
import type { ReactNode } from "react";
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";
import { useMessageScroller } from "@/shared/ui/message-scroller";
import { THREAD_NOT_SAVED } from "../../../views/sidebar/assistant/store";
import type { ChatItem } from "../../../views/sidebar/assistant/store";
import { BaseThreadItem } from "./BaseThreadItem";
import type { ReplyActions } from "./BaseThreadItem";
import type { ApprovalAnswer } from "./BaseApprovalCard";

/**
 * The conversation, drawn from props only.
 *
 * The scroller follows new content while the reader is at the end and stays
 * put once they scroll up by wheel, touch or keys, offering "Scroll to end"
 * instead. The log "Conversation" is the scroller's content; there is no
 * scroll anchor, so a send made while scrolled up does not move the thread.
 */
const ThreadNow = ({
  items,
  working,
  unsaved,
  project,
  suggestions,
  onSuggestion,
  actionsFor,
  onAnswer,
}: {
  items: readonly ChatItem[];
  /** The turn is running and the last item is not a reply with text: before the first token and while tools run */
  working: boolean;
  /** The open thread could not be read, so nothing typed into it is saved */
  unsaved: boolean;
  /** The open project's name, or `null` when there is none */
  project: string | null;
  suggestions: readonly string[];
  onSuggestion: (text: string) => void;
  /** The moves offered on a reply, for the one reply that offers them */
  actionsFor: (id: string) => ReplyActions | undefined;
  onAnswer: (id: string, answer: ApprovalAnswer) => void;
}) => (
  <MessageScrollerProvider autoScroll>
    {SPIKE === "fix" && <FollowOnSend items={items} />}
    <MessageScroller className="flex-1">
      <MessageScrollerViewport>
        <MessageScrollerContent
          aria-label="Conversation"
          className="gap-4 px-3 py-4"
        >
          {unsaved && (
            <Callout role="status">
              <CalloutDescription>{THREAD_NOT_SAVED}</CalloutDescription>
            </Callout>
          )}
          {items.length === 0 ? (
            <EmptyThread
              project={project}
              suggestions={suggestions}
              onSuggestion={onSuggestion}
            />
          ) : (
            items.map((item) => (
              <MessageScrollerItem key={item.id} messageId={item.id}>
                <BaseThreadItem
                  item={item}
                  actions={actionsFor(item.id)}
                  onAnswer={onAnswer}
                />
              </MessageScrollerItem>
            ))
          )}
          {working && (
            <Marker role="status" aria-label="Assistant is working">
              <MarkerIcon>
                <Spinner />
              </MarkerIcon>
            </Marker>
          )}
        </MessageScrollerContent>
      </MessageScrollerViewport>
      <MessageScrollerButton />
    </MessageScroller>
  </MessageScrollerProvider>
);

const EmptyThread = ({
  project,
  suggestions,
  onSuggestion,
}: {
  project: string | null;
  suggestions: readonly string[];
  onSuggestion: (text: string) => void;
}) => (
  <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
    <CirclePlayIcon className="size-12 text-primary" aria-hidden />
    {/* Under the panel head, which is the h2 */}
    <h3 className="text-xl font-semibold text-foreground">
      {project ? `Ask about ${project}` : "Ask the assistant"}
    </h3>
    <p className="max-w-xs text-sm text-muted-foreground">
      It reads the file you are looking at and the last build error, and
      proposes patches you apply yourself.
    </p>
    <div className="flex flex-col items-center gap-2 pt-2">
      {suggestions.map((suggestion) => (
        <Button
          key={suggestion}
          variant="outline"
          size="sm"
          className="h-auto rounded-full border-border bg-card px-3 py-1.5 text-[0.8125rem] font-normal text-muted-foreground dark:border-border dark:bg-card"
          onClick={() => onSuggestion(suggestion)}
        >
          {suggestion}
        </Button>
      ))}
    </div>
  </div>
);

// --- Spike HOO-2293, never merged: `localStorage.spikeScroller` picks the variant
type ThreadProps = Parameters<typeof ThreadNow>[0];
const SPIKE = (() => {
  try {
    return localStorage.getItem("spikeScroller") ?? "now";
  } catch {
    return "now";
  }
})();

const lastUserId = (items: readonly ChatItem[]) =>
  [...items].reverse().find((i) => i.kind === "user")?.id;

/** Minimal fix: a new user message takes the thread back to the end, which re-arms following */
const FollowOnSend = ({ items }: { items: readonly ChatItem[] }) => {
  const { scrollToEnd } = useMessageScroller();
  const id = lastUserId(items);
  const seen = useRef(id);
  useEffect(() => {
    if (id === seen.current) return;
    seen.current = id;
    scrollToEnd({ behavior: "auto" });
  }, [id, scrollToEnd]);
  return null;
};

// Its components return `ReactNode`, which this TypeScript does not take as a JSX component
const Stb = StickToBottom as unknown as (
  p: React.ComponentProps<"div"> & { initial?: "smooth"; resize?: "smooth" }
) => React.JSX.Element;
const StbContent = StickToBottom.Content as unknown as (
  p: React.ComponentProps<"div">
) => React.JSX.Element;

/** AI Elements `Conversation`, as its registry source draws it */
const Conversation = ({ children }: { children: ReactNode }) => (
  <Stb
    className="relative flex-1 overflow-y-hidden"
    initial="smooth"
    resize="smooth"
    role="log"
  >
    {children}
  </Stb>
);

const ConversationScrollButton = () => {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();
  return isAtBottom ? null : (
    <Button
      className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full"
      size="icon-sm"
      variant="secondary"
      onClick={() => scrollToBottom()}
    >
      <span className="sr-only">Scroll to end</span>↓
    </Button>
  );
};

const ThreadStb = ({
  items,
  working,
  actionsFor,
  onAnswer,
}: ThreadProps) => (
  <Conversation>
    <StbContent
      aria-label="Conversation"
      className="flex flex-col gap-4 px-3 py-4"
    >
      {items.map((item) => (
        <div key={item.id} data-message-id={item.id}>
          <BaseThreadItem
            item={item}
            actions={actionsFor(item.id)}
            onAnswer={onAnswer}
          />
        </div>
      ))}
      {working && (
        <Marker role="status" aria-label="Assistant is working">
          <MarkerIcon>
            <Spinner />
          </MarkerIcon>
        </Marker>
      )}
    </StbContent>
    <ConversationScrollButton />
  </Conversation>
);

export const BaseThread = (props: ThreadProps) =>
  SPIKE === "stb" ? <ThreadStb {...props} /> : <ThreadNow {...props} />;
