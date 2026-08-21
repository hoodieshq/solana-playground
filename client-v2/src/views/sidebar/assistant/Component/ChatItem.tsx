import { FC, useMemo } from "react";
import styled, { css } from "styled-components";

import Button from "../../../../components/Button";
import GradientButton from "./GradientButton";
import Markdown from "../../../../components/Markdown";
import { diffLines, summarizeDiff } from "../diff";
import { PgAssistant, type ChatItem as Item } from "../store";

const ChatItem: FC<{
  item: Item;
  /**
   * Offered on the newest reply only: asks the assistant to turn what it just
   * described into a patch. The patch still arrives as an approval card, so
   * nothing is written on this click.
   */
  onMakeChange?: () => void;
}> = ({ item, onMakeChange }) => {
  switch (item.kind) {
    case "user":
      return (
        <Turn>
          <Role>YOU</Role>
          <UserText>{item.text}</UserText>
        </Turn>
      );

    case "assistant":
      // Nothing streamed yet — the chat's thinking indicator stands in, so
      // don't render a role header with nothing under it
      if (!item.text) return null;
      return (
        <Turn>
          <Role $accent>ASSISTANT</Role>
          <Markdown codeFontOnly>{item.text}</Markdown>
          {onMakeChange && (
            <MakeChange
              title="Ask the assistant to write this change, for you to review"
              onClick={onMakeChange}
            >
              Make this change
            </MakeChange>
          )}
        </Turn>
      );

    case "tool":
      return (
        <ToolLine>
          <Tick aria-hidden>✓</Tick>
          {item.label}
        </ToolLine>
      );

    case "error":
      return <ErrorBox role="alert">{item.text}</ErrorBox>;

    case "notice":
      return <Notice role="status">{item.text}</Notice>;

    case "approval":
      return <Approval item={item} />;
  }
};

const Approval: FC<{ item: Extract<Item, { kind: "approval" }> }> = ({
  item,
}) => {
  const { request, status } = item;
  const pending = status === "pending";

  // The shared Button restores its own state after awaiting onClick; resolving
  // synchronously unmounts the pending actions row under it. Defer a tick.
  const allow = () =>
    setTimeout(() => PgAssistant.resolveApproval(item.id, true), 0);
  const deny = () =>
    setTimeout(() => PgAssistant.resolveApproval(item.id, false), 0);

  const label =
    status === "allowed" ? "APPLIED" : status === "denied" ? "DECLINED" : null;

  return (
    <Card $pending={pending}>
      <CardHead>
        {request.type === "patch" ? (
          <PatchTitle request={request} />
        ) : (
          <CardTitle>wants to run {request.name}</CardTitle>
        )}
        <StatusLabel $status={status}>{label ?? "PROPOSED"}</StatusLabel>
      </CardHead>

      {request.type === "patch" ? (
        <Diff before={request.before} after={request.after} />
      ) : (
        <CommandBody>
          <Command>$ {request.name}</Command>
          <Effect>{request.effect}</Effect>
        </CommandBody>
      )}

      {pending ? (
        <Actions>
          <GradientButton kind="primary" size="small" fullWidth onClick={allow}>
            {request.type === "patch" ? "Apply" : "Allow"}
          </GradientButton>
          <Button kind="outline" size="small" onClick={deny}>
            {request.type === "patch" ? "Reject" : "Deny"}
          </Button>
        </Actions>
      ) : (
        <Outcome $allowed={status === "allowed"}>
          {item.outcome ?? (status === "allowed" ? "done" : "not applied")}
        </Outcome>
      )}
    </Card>
  );
};

const PatchTitle: FC<{
  request: Extract<Item, { kind: "approval" }>["request"] & { type: "patch" };
}> = ({ request }) => {
  const { added, removed } = useMemo(
    () => summarizeDiff(diffLines(request.before, request.after)),
    [request.before, request.after]
  );

  return (
    <CardTitle>
      {request.path}
      <Counts>
        <Added>+{added}</Added>
        <Removed>−{removed}</Removed>
      </Counts>
    </CardTitle>
  );
};

const Diff: FC<{ before: string | null; after: string }> = ({
  before,
  after,
}) => {
  const lines = useMemo(() => diffLines(before, after), [before, after]);

  return (
    <DiffBody>
      {lines.map((line, i) => (
        <DiffRow key={i} $kind={line.kind}>
          <Gutter>{line.number ?? ""}</Gutter>
          <Sign $kind={line.kind}>
            {line.kind === "added" ? "+" : line.kind === "removed" ? "-" : " "}
          </Sign>
          <Code>{line.text || " "}</Code>
        </DiffRow>
      ))}
    </DiffBody>
  );
};

const Turn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
`;

const Role = styled.div<{ $accent?: boolean }>`
  ${({ theme, $accent }) => css`
    color: ${$accent
      ? theme.colors.default.primary
      : theme.colors.default.textSecondary};
    font-size: ${theme.font.code.size.xsmall};
    letter-spacing: 0.1em;
  `}
`;

const UserText = styled.div`
  ${({ theme }) => css`
    color: ${theme.colors.default.textPrimary};
    line-height: 1.55;
    white-space: pre-wrap;
    word-break: break-word;
  `}
`;

const ToolLine = styled.div`
  ${({ theme }) => css`
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: ${theme.colors.default.textSecondary};
    font-size: ${theme.font.code.size.small};
  `}
`;

const Tick = styled.span`
  ${({ theme }) => css`
    color: ${theme.colors.state.success.color};
  `}
`;

const MakeChange = styled.button`
  ${({ theme }) => css`
    align-self: flex-start;
    margin-top: 0.5rem;
    padding: 0.1875rem 0.5rem;
    background: transparent;
    border: 1px solid ${theme.colors.default.border};
    border-radius: ${theme.default.borderRadius};
    color: ${theme.colors.default.textPrimary};
    font: inherit;
    font-size: ${theme.font.code.size.xsmall};
    cursor: pointer;
    transition: all ${theme.default.transition.duration.medium}
      ${theme.default.transition.type};

    &:hover {
      background: ${theme.colors.state.hover.bg};
      border-color: ${theme.colors.default.primary};
    }

    &:focus-visible {
      outline: 1px solid ${theme.colors.default.primary};
      outline-offset: -1px;
    }
  `}
`;

const Notice = styled.div`
  ${({ theme }) => css`
    color: ${theme.colors.default.textSecondary};
    font-size: ${theme.font.code.size.xsmall};
    font-style: italic;
  `}
`;

const ErrorBox = styled.div`
  ${({ theme }) => css`
    padding: 0.625rem 0.6875rem;
    border: 1px solid ${theme.colors.state.error.color};
    border-radius: ${theme.default.borderRadius};
    color: ${theme.colors.state.error.color};
    font-size: ${theme.font.code.size.small};
    line-height: 1.55;
    word-break: break-word;
  `}
`;

const Card = styled.div<{ $pending: boolean }>`
  ${({ theme, $pending }) => css`
    border: 1px solid
      ${$pending ? theme.colors.default.primary : theme.colors.default.border};
    border-radius: ${theme.default.borderRadius};
    background: ${theme.colors.default.bgSecondary};
    overflow: hidden;
    /*
     * Messages (Chat.tsx) is a flex column that scrolls, and every other
     * item in it leaves overflow visible, so its content height is also
     * its flex-shrink floor. This card is the one item that sets its own
     * overflow: hidden, which per the flexbox spec drops its automatic
     * minimum size to 0 -- with a full conversation above it, flex-shrink
     * then crushes just this card down to a sliver (title visible, diff
     * and Apply/Reject clipped away) to keep Messages from overflowing.
     * flex-shrink: 0 opts it back out, so it renders at content height and
     * the list scrolls instead, same as every other item.
     */
    flex-shrink: 0;
  `}
`;

const CardHead = styled.div`
  ${({ theme }) => css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.5rem 0.625rem;
    border-bottom: 1px solid ${theme.colors.default.border};
  `}
`;

const CardTitle = styled.div`
  ${({ theme }) => css`
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
    color: ${theme.colors.default.textSecondary};
    font-size: ${theme.font.code.size.small};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `}
`;

const Counts = styled.span`
  display: flex;
  gap: 0.375rem;
  flex-shrink: 0;
`;

const Added = styled.span`
  ${({ theme }) => css`
    color: ${theme.colors.state.success.color};
    font-size: ${theme.font.code.size.xsmall};
  `}
`;

const Removed = styled.span`
  ${({ theme }) => css`
    color: ${theme.colors.state.error.color};
    font-size: ${theme.font.code.size.xsmall};
  `}
`;

const StatusLabel = styled.span<{ $status: string }>`
  ${({ theme, $status }) => css`
    flex-shrink: 0;
    font-size: ${theme.font.code.size.xsmall};
    letter-spacing: 0.08em;
    color: ${$status === "allowed"
      ? theme.colors.state.success.color
      : $status === "denied"
      ? theme.colors.default.textSecondary
      : theme.colors.default.primary};
  `}
`;

const DiffBody = styled.div`
  ${({ theme }) => css`
    padding: 0.375rem 0;
    font-size: ${theme.font.code.size.small};
    /* A large patch scrolls inside its card instead of flooding the chat */
    max-height: 15rem;
    overflow: auto;
  `}
`;

const DiffRow = styled.div<{ $kind: string }>`
  ${({ theme, $kind }) => css`
    display: flex;
    line-height: 1.6;
    background: ${$kind === "added"
      ? theme.colors.state.success.color + "22"
      : $kind === "removed"
      ? theme.colors.state.error.color + "22"
      : "transparent"};
  `}
`;

const Gutter = styled.span`
  ${({ theme }) => css`
    width: 2.25rem;
    flex-shrink: 0;
    padding-right: 0.5rem;
    text-align: right;
    color: ${theme.colors.default.textSecondary};
    opacity: 0.7;
  `}
`;

const Sign = styled.span<{ $kind: string }>`
  ${({ theme, $kind }) => css`
    width: 0.75rem;
    flex-shrink: 0;
    color: ${$kind === "added"
      ? theme.colors.state.success.color
      : $kind === "removed"
      ? theme.colors.state.error.color
      : theme.colors.default.textSecondary};
  `}
`;

const Code = styled.span`
  ${({ theme }) => css`
    color: ${theme.colors.default.textPrimary};
    white-space: pre;
  `}
`;

const CommandBody = styled.div`
  padding: 0.625rem 0.6875rem;
`;

const Command = styled.div`
  ${({ theme }) => css`
    color: ${theme.colors.state.warning.color};
    font-size: ${theme.font.code.size.small};
  `}
`;

const Effect = styled.div`
  ${({ theme }) => css`
    padding-top: 0.375rem;
    color: ${theme.colors.default.textSecondary};
    font-size: ${theme.font.code.size.xsmall};
    line-height: 1.55;
  `}
`;

const Actions = styled.div`
  ${({ theme }) => css`
    display: flex;
    gap: 0.5rem;
    padding: 0.625rem;
    border-top: 1px solid ${theme.colors.default.border};
  `}
`;

const Outcome = styled.div<{ $allowed: boolean }>`
  ${({ theme, $allowed }) => css`
    padding: 0.625rem;
    border-top: 1px solid ${theme.colors.default.border};
    color: ${$allowed
      ? theme.colors.state.success.color
      : theme.colors.default.textSecondary};
    font-size: ${theme.font.code.size.xsmall};
  `}
`;

export default ChatItem;
