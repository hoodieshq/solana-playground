import { FC, useMemo } from "react";
import styled, { css, keyframes } from "styled-components";

import Button from "../../../../components/Button";
import PlayRing from "../../../../components/PlayRing";
import ChatCode from "./ChatCode";
import GradientButton from "./GradientButton";
import Markdown from "../../../../components/Markdown";
import { diffLines, summarizeDiff } from "../diff";
import { PgAssistant, type ChatItem as Item } from "../store";

const ChatItem: FC<{
  item: Item;
  /**
   * Whether it arrived while the panel was open. New turns rise into place; a
   * thread restored from storage is already there, and animating forty
   * messages in at once on load would be noise, not arrival.
   */
  fresh?: boolean;
  /**
   * Offered on the newest reply only: asks the assistant to turn what it just
   * described into a patch. The patch still arrives as an approval card, so
   * nothing is written on this click.
   */
  onMakeChange?: () => void;
  /** Render it as a quiet way out rather than the obvious next step */
  makeChangeIsLastResort?: boolean;
  /**
   * Runs the action that can prove the current lesson step — the move after a
   * patch lands, and the reply's main CTA when offered.
   */
  onVerifyStep?: () => void;
  verifyStepLabel?: string;
  verifyStepTitle?: string | false | null;
  /**
   * The mid-lesson escape valve, offered only once a build has already been
   * attempted on this step. Recorded as a skip — nothing in the chat proves a
   * step.
   */
  onSkipStep?: () => void;
  skipStepTitle?: string | false | null;
}> = ({
  item,
  fresh = false,
  onMakeChange,
  makeChangeIsLastResort,
  onVerifyStep,
  verifyStepLabel,
  verifyStepTitle,
  onSkipStep,
  skipStepTitle,
}) => {
  switch (item.kind) {
    case "user":
      return (
        <UserBubble $fresh={fresh}>
          <UserText>{item.text}</UserText>
        </UserBubble>
      );

    case "assistant":
      // Nothing streamed yet -- the chat's thinking indicator stands in, so
      // don't render an empty reply under the mark
      if (!item.text) return null;
      return (
        <Reply $fresh={fresh}>
          <Avatar aria-hidden="true" />
          <Turn>
            <Prose>
              <Markdown
                renderCode={(code, lang) => (
                  <ChatCode code={code.replace(/\n+$/, "")} lang={lang} />
                )}
              >
                {item.text}
              </Markdown>
            </Prose>
            {(onMakeChange || onVerifyStep || onSkipStep) && (
              /* The reply's next moves, as buttons you can see from across
                 the room — one filled, the rest outlined, never a bare link */
              <NextMoves>
                {onVerifyStep && (
                  <Move
                    type="button"
                    $primary
                    title={verifyStepTitle || undefined}
                    onClick={onVerifyStep}
                  >
                    <MoveMark aria-hidden="true" />
                    {verifyStepLabel}
                  </Move>
                )}
                {onMakeChange && (
                  <Move
                    type="button"
                    $primary={!onVerifyStep && !makeChangeIsLastResort}
                    title={
                      makeChangeIsLastResort
                        ? "Skip the rest of the hints and have the assistant write it, for you to review"
                        : "Ask the assistant to write this change, for you to review"
                    }
                    onClick={onMakeChange}
                  >
                    {ICONS.write}
                    {makeChangeIsLastResort
                      ? "Write it for me"
                      : "Make this change"}
                  </Move>
                )}
                {onSkipStep && (
                  <Move
                    type="button"
                    title={skipStepTitle || undefined}
                    onClick={onSkipStep}
                  >
                    {ICONS.skip}
                    Skip this step
                  </Move>
                )}
              </NextMoves>
            )}
          </Turn>
        </Reply>
      );

    case "tool":
      return (
        <ToolLine>
          <Tick viewBox="0 0 12 12" width="12" height="12" aria-hidden>
            <path
              d="M2.5 6.3l2.4 2.4 4.6-5.4"
              fill="none"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Tick>
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

const moveIcon = (d: JSX.Element) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {d}
  </svg>
);

const ICONS = {
  write: moveIcon(
    <>
      <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17z" />
      <path d="m14.5 7.5 3 3" />
    </>
  ),
  skip: moveIcon(
    <>
      <path d="m5 5 7 7-7 7" />
      <path d="M13 5v14" />
    </>
  ),
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
    status === "allowed" ? "Applied" : status === "denied" ? "Declined" : null;

  return (
    <Card $pending={pending}>
      <CardHead>
        {request.type === "patch" ? (
          <PatchTitle request={request} />
        ) : (
          <CardTitle>wants to run {request.name}</CardTitle>
        )}
        <StatusLabel $status={status}>{label ?? "Proposed"}</StatusLabel>
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
        <Removed>-{removed}</Removed>
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

/* New turns rise a few pixels into place — enough to see a reply arrive, not
   enough to make reading wait for it */
const rise = keyframes`
  from { opacity: 0; transform: translate3d(0, 6px, 0); }
  to   { opacity: 1; transform: none; }
`;

const arrive = (fresh: boolean, ms: number) =>
  fresh &&
  css`
    animation: ${rise} ${ms}ms cubic-bezier(0.22, 1, 0.36, 1) both;

    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }
  `;

/* The assistant's replies sit against the mark, the way Claude's sit against
   its own; the text runs full width beside it */
const Reply = styled.div<{ $fresh: boolean }>`
  ${({ $fresh }) => css`
    display: flex;
    align-items: flex-start;
    gap: 0.625rem;
    min-width: 0;
    ${arrive($fresh, 380)}
  `}
`;

const Avatar = styled(PlayRing)`
  ${({ theme }) => css`
    flex-shrink: 0;
    width: 1.25rem;
    height: 1.25rem;
    margin-top: 0.125rem;
    color: ${theme.colors.default.primary};
  `}
`;

const Turn = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.375rem;
  min-width: 0;
`;

/* What you said, in a bubble at the right — the reply is the long part and
   gets the width */
const UserBubble = styled.div<{ $fresh: boolean }>`
  ${({ theme, $fresh }) => css`
    align-self: flex-end;
    max-width: 88%;
    padding: 0.5rem 0.8125rem;
    border-radius: 16px 16px 6px 16px;
    background: ${theme.colors.state.hover.bg};
    ${arrive($fresh, 240)}
  `}
`;

const UserText = styled.div`
  ${({ theme }) => css`
    color: ${theme.colors.default.textPrimary};
    font-size: 0.875rem;
    font-weight: 350;
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

const Tick = styled.svg`
  ${({ theme }) => css`
    flex-shrink: 0;
    stroke: ${theme.colors.state.success.color};
  `}
`;

/* Replies are read, not skimmed: the product's face at a comfortable size,
   with room between paragraphs and code that looks like code */
const Prose = styled.div`
  ${({ theme }) => css`
    color: ${theme.colors.default.textPrimary};
    font-size: 0.875rem;
    /* Stack Sans Text is variable; at 400 it sets heavy for running prose,
       so replies read a step lighter */
    font-weight: 350;
    line-height: 1.62;

    & p {
      margin: 0 0 0.625rem;
    }

    & p:last-child {
      margin-bottom: 0;
    }

    & ul,
    & ol {
      margin: 0 0 0.625rem;
      padding-left: 1.25rem;
    }

    & li + li {
      margin-top: 0.25rem;
    }

    & :not(pre) > code {
      padding: 0.0625rem 0.3125rem;
      border-radius: 5px;
      background: ${theme.colors.state.hover.bg};
      font-family: ${theme.font.code.family};
      font-size: 0.8125em;
    }

    & strong {
      font-weight: 600;
    }
  `}
`;

const NextMoves = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-top: 0.625rem;
`;

const Move = styled.button<{ $primary?: boolean }>`
  ${({ theme, $primary }) => css`
    display: inline-flex;
    align-items: center;
    gap: 0.4375rem;
    height: 2rem;
    padding: 0 0.875rem 0 0.75rem;
    border: 1px solid ${$primary ? "transparent" : theme.colors.default.border};
    border-radius: 999px;
    background: ${$primary ? theme.colors.default.primary : "transparent"};
    color: ${$primary ? "#fff" : theme.colors.default.textPrimary};
    font-family: inherit;
    font-size: 0.8125rem;
    font-weight: 500;
    cursor: pointer;
    transition: filter 0.15s ease, background 0.15s ease,
      border-color 0.15s ease;

    & > svg {
      width: 0.9375rem;
      height: 0.9375rem;
      flex-shrink: 0;
    }

    &:hover {
      ${$primary
        ? "filter: brightness(1.1);"
        : css`
            background: ${theme.colors.state.hover.bg};
            border-color: ${theme.colors.default.textSecondary}55;
          `}
    }

    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
      outline-offset: 2px;
    }

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  `}
`;

/* Our play mark on the move that runs something */
const MoveMark = styled(PlayRing)`
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
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
      ? theme.colors.state.success.color + theme.default.transparency.low
      : $kind === "removed"
      ? theme.colors.state.error.color + theme.default.transparency.low
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
