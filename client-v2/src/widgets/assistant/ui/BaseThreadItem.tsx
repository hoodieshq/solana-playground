import { CheckIcon } from "lucide-react";

import { Bubble, BubbleContent } from "@/shared/ui/bubble";
import { Button } from "@/shared/ui/button";
import { Callout, CalloutDescription } from "@/shared/ui/callout";
import { Marker, MarkerContent, MarkerIcon } from "@/shared/ui/marker";
import { Message, MessageContent, MessageFooter } from "@/shared/ui/message";
import Markdown from "../../../components/Markdown";
import type { ChatItem } from "../../../views/sidebar/assistant/store";
import { BaseApprovalCard } from "./BaseApprovalCard";
import type { ApprovalAnswer } from "./BaseApprovalCard";

/**
 * The moves offered on a finished reply. Each is present only on the reply
 * that offers it; the thread decides which reply that is.
 */
export type ReplyActions = {
  /**
   * Asks the assistant to turn what it just described into a patch, which
   * still arrives as an approval card
   */
  makeChange?: { onClick: () => void };
};

/** One item of the conversation, drawn from props only */
export const BaseThreadItem = ({
  item,
  actions,
  onAnswer,
}: {
  item: ChatItem;
  actions?: ReplyActions;
  onAnswer: (id: string, answer: ApprovalAnswer) => void;
}) => {
  switch (item.kind) {
    case "user":
      return (
        <Message align="end">
          <MessageContent>
            <Bubble variant="default" align="end">
              <BubbleContent className="whitespace-pre-wrap">
                {/* Alignment and colour say who spoke; a screen reader
                    reading the log needs it said */}
                <span className="sr-only">You: </span>
                {item.text}
              </BubbleContent>
            </Bubble>
          </MessageContent>
        </Message>
      );

    case "assistant":
      // Nothing streamed yet: the thread's working marker stands in
      if (!item.text) return null;
      return (
        <Message>
          <MessageContent>
            <Bubble variant="ghost" className="w-full">
              <BubbleContent className="w-full">
                <span className="sr-only">Assistant: </span>
                <Markdown codeFontOnly>{item.text}</Markdown>
              </BubbleContent>
            </Bubble>
            {actions && <ReplyFooter actions={actions} />}
          </MessageContent>
        </Message>
      );

    case "tool":
      return (
        <Marker>
          <MarkerIcon>
            <CheckIcon className="text-success" />
          </MarkerIcon>
          <MarkerContent>{item.label}</MarkerContent>
        </Marker>
      );

    case "error":
      return (
        <Callout variant="error" role="alert">
          <CalloutDescription className="break-words">
            {item.text}
          </CalloutDescription>
        </Callout>
      );

    case "notice":
      return (
        <Callout role="status">
          <CalloutDescription>{item.text}</CalloutDescription>
        </Callout>
      );

    case "approval":
      return (
        <BaseApprovalCard
          item={item}
          onAnswer={(answer) => onAnswer(item.id, answer)}
        />
      );
  }
};

const ReplyFooter = ({ actions }: { actions: ReplyActions }) => {
  const { makeChange } = actions;
  if (!makeChange) return null;

  return (
    <MessageFooter className="flex-wrap gap-2 px-0">
      <Button
        size="sm"
        variant="outline"
        title="Ask the assistant to write this change, for you to review"
        onClick={makeChange.onClick}
      >
        Make this change
      </Button>
    </MessageFooter>
  );
};
