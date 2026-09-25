import { FC, useEffect, useRef, useState } from "react";
import styled, { css, keyframes } from "styled-components";

import { CodePreviewHost } from "./ChatCode";
import ChatGround from "./ChatGround";
import ChatItem from "./ChatItem";
import Chapters from "./Chapters";
import type { Chapter } from "./Chapters";
import { openConnectDialog } from "./ConnectDialog";
import Composer from "../../../flow/components/Composer";
import type { MenuRow } from "../../../flow/components/Menu";
import PlayRing from "../../../../components/PlayRing";
import {
  PgAssistant,
  turnAppliedApproval,
  turnProducedApproval,
} from "../store";
import { PgBuildOutput } from "../bridge/build-output";
import { describeLesson } from "../bridge/lesson-context";
import { realBridge } from "../bridge/playground-bridge";
import { createProvider } from "../model";
import { PgModelChoice, connectionFor, isReady } from "../model/choice";
import { useDefaultBackend } from "../model/default-backend";
import { PgChatSync } from "../../../../features/persistence/model/chat-sync";
import { toReplayMessages } from "../../../../features/persistence/model/replay";
import { PgCommand, PgExplorer, PgProgramInfo } from "../../../../utils";
import { useRenderOnChange } from "../../../../hooks";
import {
  currentStep,
  INITIAL_LESSON_STATE,
  PgLesson,
  verifyingStage,
} from "../../../flow/lessons";
import type { LessonState } from "../../../flow/lessons";
import type { Connection } from "../store";
import type { Provider } from "../model/types";

/**
 * Sent by "Make this change": models often describe an edit in prose instead of
 * calling `write_file`. This asks for the same edit as a patch, which lands in
 * the usual approval card.
 *
 * Phrased to work mid-lesson too, where the assistant is holding back a hint
 * and has described no edit yet — and leaving it a line to say afterwards, so
 * the turn does not end on a silence the panel has to explain.
 */
const MAKE_CHANGE =
  "Write this change for me, using write_file with the complete new content " +
  "of the file — the change you just described, or the one this step needs " +
  "if you have not described one yet. If it touches more than one file, do " +
  "them one at a time. Skip the explanation you would usually give first and " +
  "summarise it in one line afterwards.";

/** Where the thread starts before the first step's chapter, if there is one */
const OPENING = "Session start";

interface ChatProps {
  /** The session's name, which the empty state asks about */
  title?: string;
  /** Opens the sources and tools sheet over the chat */
  onOpenSources?: () => void;
}

/**
 * The conversation: one layout whether or not a model is connected.
 *
 * It used to be three — a stand-in composer that opened a form, the form
 * itself in the composer's place, and a different live composer once
 * connected. Now the composer is always the real one. With nothing connected,
 * sending asks for what the picked model needs in a dialog and the message
 * goes out the moment it is answered; nothing on the pane swaps out.
 */
const Chat: FC<ChatProps> = ({ title, onOpenSources }) => {
  useRenderOnChange(PgAssistant.onDidChange);
  const defaultBackend = useDefaultBackend();

  const [input, setInput] = useState("");
  const provider = useRef<{
    connection: Connection;
    instance: Provider;
  } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const turn = useRef<AbortController | null>(null);
  // Bridges `onDidRequestPrompt`, which must subscribe unconditionally, to
  // `send`, which is redefined every render
  const sendRef = useRef<(text: string) => void>(() => {});
  /** A message typed before anything was connected, sent once something is */
  const waiting = useRef<string | null>(null);
  /** Items older than this were restored, not said while the pane was open */
  const [openedAt] = useState(() => new Date().toISOString());

  // "Fix with assistant" and similar callers outside the panel ask for a
  // prompt to be sent through `PgAssistant.requestPrompt`; this is the only
  // place that turns the request into an actual send
  useEffect(() => {
    return PgAssistant.onDidRequestPrompt(
      ({ text, send }) => {
        // A prompt the user did not type gets one look before it costs a
        // turn — and with nothing connected, sending is where the model is
        // asked for anyway
        if (!send || !PgAssistant.isConnected) {
          setInput(text);
          inputRef.current?.focus();
          return;
        }
        sendRef.current(text);
      },
      { sends: true }
    ).dispose;
  }, []);

  const items = PgAssistant.items;
  const status = PgAssistant.status;
  // A stopped turn still has to unwind, and `cancelPending` drops the status to
  // idle before it does; the controller is what says a turn is really over
  const busy = status !== "idle" || !!turn.current;

  // Follow the conversation as it grows
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [items.length, status]);

  // Focus is handed back once a turn ends
  useEffect(() => {
    if (!busy) inputRef.current?.focus();
  }, [busy]);

  const [lessonState, setLessonState] =
    useState<LessonState>(INITIAL_LESSON_STATE);
  useEffect(() => PgLesson.onDidChange(setLessonState).dispose, []);

  const connection = PgAssistant.connection;

  // One provider per connection; it owns the conversation history. The store
  // keeps the same object while the settings are unchanged, so identity is
  // enough to catch a switched key or model as well as a switched provider.
  if (!connection) provider.current = null;
  else if (provider.current?.connection !== connection) {
    provider.current = {
      connection,
      // Seeded from what is rendered, so a new model — or a reopened stored
      // thread — picks up the conversation rather than starting blank
      instance: createProvider(connection, toReplayMessages(PgAssistant.items)),
    };
  }

  // The message that was waiting on a connection goes out as soon as there is
  // one to send it through
  useEffect(() => {
    if (!connection || !waiting.current) return;
    const text = waiting.current;
    waiting.current = null;
    sendRef.current(text);
  }, [connection]);

  const lesson = describeLesson(lessonState);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    if (!provider.current) {
      // Nothing connected: connect what was picked, asking only for what it
      // needs. The message stays in the composer until it can really go.
      waiting.current = trimmed;
      const { option, effort } = PgModelChoice.get();
      const next = connectionFor(option, effort, null);
      const keyless =
        option.provider === "default" ? defaultBackend === true : isReady(next);
      if (keyless) PgAssistant.connect(next);
      else {
        const made = await openConnectDialog({
          provider: option.provider,
          model: option.id,
          effort,
        });
        if (!made) waiting.current = null;
      }
      return;
    }

    setInput("");
    PgAssistant.addUserMessage(
      trimmed,
      lesson ? `Step ${lesson.stepIndex} · ${lesson.objective}` : undefined
    );
    PgAssistant.setStatus("running");

    const controller = new AbortController();
    turn.current = controller;

    try {
      await provider.current.instance.send(trimmed, controller.signal);
    } catch (e) {
      // Stopping is the user's own doing; `stop` already said so
      if (!controller.signal.aborted) {
        PgAssistant.addError(e instanceof Error ? e.message : String(e));
      }
    } finally {
      if (turn.current === controller) turn.current = null;
      PgAssistant.setStatus("idle");

      // End of turn is the natural commit point: the exchange is complete and
      // the user is reading rather than typing. Deliberately not awaited --
      // a slow or failed upload must not hold up the panel, and the local
      // copy is already written either way.
      const threadId = PgAssistant.threadId;
      if (threadId) void PgChatSync.push(threadId);
    }
  };
  sendRef.current = send;

  /**
   * Aborting the request is not enough on its own: a tool waiting on an
   * approval holds the agent loop open, so deny whatever is pending too.
   */
  const stop = () => {
    if (!turn.current) return;
    turn.current.abort();
    PgAssistant.cancelPending();
    PgAssistant.addNotice("Stopped.");
  };

  // Mirror what `describeProject()` actually sends, so the row cannot claim
  // less than the model gets. Paths only — never file content, since this runs
  // on every render, including every streamed token.
  const currentFilePath = PgExplorer.currentFilePath;
  const filePaths = realBridge.listFiles();
  const openPaths = realBridge.listOpenFiles();
  const chips = [
    lesson
      ? {
          label: `Step ${lesson.stepIndex} of ${lesson.stepCount}`,
          title: lesson.objective,
        }
      : null,
    currentFilePath
      ? {
          label: PgExplorer.getItemNameFromPath(currentFilePath),
          title: "The tab you are looking at, sent in full every turn",
        }
      : null,
    {
      label: `${filePaths.length} ${filePaths.length === 1 ? "file" : "files"}`,
      title: `Every path is sent each turn, and the assistant can read any of them:\n\n${filePaths.join(
        "\n"
      )}`,
    },
    openPaths.length > 1
      ? {
          label: `${openPaths.length} open`,
          title: `Your open tabs are named each turn; only the active one is sent in full:\n\n${openPaths.join(
            "\n"
          )}`,
        }
      : null,
    PgBuildOutput.latest?.failed
      ? { label: "Build error", title: "The last build's compiler output" }
      : null,
    PgProgramInfo.idl
      ? { label: "IDL", title: "The built program's interface" }
      : null,
  ].filter((chip): chip is { label: string; title: string } => !!chip);

  // Offer "Make this change" on the reply the assistant just finished, and
  // only there: an older message describes code that has since moved on, and a
  // turn ending in an approval card has already produced its patch.
  const lastItem = items[items.length - 1];
  const wroteThisTurn = turnProducedApproval(items);
  const changeableId =
    !busy && lastItem?.kind === "assistant" && lastItem.text && !wroteThisTurn
      ? lastItem.id
      : null;

  /**
   * The two mid-lesson actions on a finished reply, offered one at a time so
   * the reply always names the single next move:
   *
   * - the patch has landed but no build has run yet: the move is that build,
   *   which is also the only thing that can prove the step.
   * - a build has run and the step is still unverified: the learner may be
   *   right and the grader wrong, so the escape valve appears. Nothing here
   *   proves anything, so it stays labelled as the skip it records.
   */
  const onFinishedReply = !busy && lesson && lastItem?.kind === "assistant";
  const step =
    lessonState.path && currentStep(lessonState.path, lessonState.progress);
  const stage = step && verifyingStage(step.verify);

  const verifiableId =
    onFinishedReply &&
    !lessonState.attempted &&
    stage &&
    turnAppliedApproval(items)
      ? lastItem.id
      : null;

  const skippableId =
    onFinishedReply && lessonState.attempted ? lastItem.id : null;

  // Cover the silent gaps: before the first token and while tools run.
  // Once text streams into the last assistant item the mark stands down.
  const thinking =
    status === "running" && (lastItem?.kind !== "assistant" || !lastItem.text);

  /* Chapters: a new one wherever the step a question was asked in changes.
     Anything said before the first step sits under the opening. */
  const chapters: Chapter[] = [];
  let lastChapter: string | undefined;
  for (const item of items) {
    if (item.kind !== "user" || !item.chapter) continue;
    if (item.chapter === lastChapter) continue;
    if (!chapters.length && item !== items[0]) {
      chapters.push({ id: items[0].id, title: OPENING });
    }
    chapters.push({ id: item.id, title: item.chapter });
    lastChapter = item.chapter;
  }
  const startsChapter = new Map(chapters.map((c) => [c.id, c.title]));

  const [currentChapter, setCurrentChapter] = useState<string | null>(null);
  const onScroll = () => {
    const list = listRef.current;
    if (!list || chapters.length < 2) return;
    let at: string | null = chapters[0].id;
    for (const c of chapters) {
      const el = list.querySelector<HTMLElement>(`[data-chapter="${c.id}"]`);
      if (el && el.offsetTop - list.scrollTop <= 48) at = c.id;
    }
    setCurrentChapter(at);
  };
  const jump = (id: string) => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-chapter="${id}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const suggestions = lesson
    ? ["Explain this step", "Give me a hint", "Why did my build fail?"]
    : [
        "What does this program do?",
        "Why did my build fail?",
        "How do I deploy this?",
      ];

  const addRows: MenuRow[] = [
    ...(onOpenSources
      ? [
          {
            id: "sources",
            label: "Sources and tools",
            hint: "S",
            onSelect: onOpenSources,
          },
        ]
      : []),
    {
      id: "connect",
      label: connection ? "Connection and key…" : "Connect a model…",
      hint: "K",
      onSelect: () => {
        const { option, effort } = PgModelChoice.get();
        openConnectDialog({
          provider: connection?.id ?? option.provider,
          model: option.id,
          effort,
        });
      },
    },
  ];

  return (
    <Wrapper>
      <ChatGround />
      <CodePreviewHost />

      {chapters.length > 1 && (
        <Chapters
          chapters={chapters}
          current={currentChapter ?? chapters[chapters.length - 1].id}
          onJump={jump}
        />
      )}

      <Messages
        ref={listRef}
        role="log"
        aria-label="Conversation"
        onScroll={onScroll}
      >
        {items.length === 0 ? (
          <Empty>
            <EmptyMark aria-hidden="true" />
            <EmptyTitle>Ask about {title ?? "this project"}</EmptyTitle>
            <EmptyBody>
              It reads the file you are looking at and the last build error, and
              proposes patches you apply yourself.
            </EmptyBody>
            <Suggestions>
              {suggestions.map((s) => (
                <Suggestion key={s} type="button" onClick={() => send(s)}>
                  {s}
                </Suggestion>
              ))}
            </Suggestions>
          </Empty>
        ) : (
          items.map((item) => (
            <Row
              key={item.id}
              data-chapter={startsChapter.has(item.id) ? item.id : undefined}
            >
              {startsChapter.has(item.id) && (
                <ChapterRule>
                  <span>{startsChapter.get(item.id)}</span>
                </ChapterRule>
              )}
              <ChatItem
                item={item}
                fresh={item.createdAt > openedAt}
                onMakeChange={
                  item.id === changeableId ? () => send(MAKE_CHANGE) : undefined
                }
                // Inside a lesson the same click skips the hint ladder, so it
                // is offered as a way out rather than as the obvious next step
                makeChangeIsLastResort={!!lesson}
                onVerifyStep={
                  item.id === verifiableId
                    ? () => PgCommand[stage!].execute()
                    : undefined
                }
                verifyStepLabel={stage === "deploy" ? "Deploy" : "Build"}
                verifyStepTitle={
                  lesson &&
                  `${lesson.verifiedBy} — this is what proves it, and the only thing that can.`
                }
                onSkipStep={
                  item.id === skippableId
                    ? () => PgLesson.skipStep()
                    : undefined
                }
                skipStepTitle={
                  lesson &&
                  `This step is still not verified — ${lesson.verifiedBy}. Skipping records that you moved past it unproven; you can come back with the arrows.`
                }
              />
            </Row>
          ))
        )}
        {thinking && <Thinking />}
        <div ref={bottomRef} />
      </Messages>

      <Foot>
        <Composer
          compact
          value={input}
          onChange={setInput}
          onSubmit={send}
          busy={busy}
          onStop={stop}
          inputRef={inputRef}
          placeholder={
            status === "awaiting"
              ? "Waiting on your decision…"
              : busy
              ? "Working…"
              : "Ask about this project…"
          }
          context={
            chips.length > 0
              ? chips.map((chip) => (
                  <ContextChip key={chip.label} title={chip.title}>
                    {chip.label}
                  </ContextChip>
                ))
              : undefined
          }
          addRows={addRows}
        />
        <FootNote>
          Nothing is written to your project without your click
        </FootNote>
      </Foot>
    </Wrapper>
  );
};

export default Chat;

/**
 * The mark, breathing, while the assistant works — and how long it has been,
 * the way Claude counts its own time.
 */
const Thinking: FC = () => {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const id = window.setInterval(
      () => setSeconds(Math.floor((Date.now() - start) / 1000)),
      1000
    );
    return () => window.clearInterval(id);
  }, []);

  return (
    <ThinkingRow role="status" aria-label="Assistant is working">
      <Breathing aria-hidden="true" />
      <Shimmer>Thinking</Shimmer>
      {seconds > 0 && <Elapsed>{seconds}s</Elapsed>}
    </ThinkingRow>
  );
};

const Wrapper = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  min-height: 0;
  isolation: isolate;
`;

const Messages = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 1.125rem;
  flex-grow: 1;
  overflow-y: auto;
  padding: 1rem 1.25rem 1rem 0.875rem;
  min-height: 0;
`;

const Row = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.125rem;
  scroll-margin-top: 0.75rem;
`;

/* A step's name on a hairline — the chapter, where it starts */
const ChapterRule = styled.div`
  ${({ theme }) => css`
    display: flex;
    align-items: center;
    gap: 0.625rem;
    color: ${theme.colors.default.textSecondary};
    font-size: 0.75rem;

    &::before,
    &::after {
      content: "";
      flex: 1;
      height: 1px;
      background: ${theme.colors.default.border};
    }

    & > span {
      max-width: 75%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `}
`;

/* The empty pane in the landing's voice: the mark, one question set large in
   the headline face, a line, and three ways in — centred, like a slide */
const Empty = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.625rem;
  margin: auto 0;
  padding: 2rem 0.5rem 1rem;
  text-align: center;
`;

const EmptyMark = styled(PlayRing)`
  ${({ theme }) => css`
    width: 2.5rem;
    height: 2.5rem;
    margin-bottom: 0.5rem;
    color: ${theme.colors.default.primary};
    filter: drop-shadow(0 0 18px ${theme.colors.default.primary}66);
  `}
`;

const EmptyTitle = styled.h2`
  ${({ theme }) => css`
    margin: 0;
    max-width: 16em;
    font-family: "Stack Sans Headline", ${theme.font.other.family};
    font-size: clamp(1.375rem, 1.9vw, 1.75rem);
    font-weight: 500;
    line-height: 1.12;
    letter-spacing: -0.015em;
    color: ${theme.colors.default.textPrimary};
  `}
`;

const EmptyBody = styled.p`
  ${({ theme }) => css`
    margin: 0;
    max-width: 21rem;
    font-size: ${theme.font.other.size.small};
    line-height: 1.5;
    color: ${theme.colors.default.textSecondary};
  `}
`;

const Suggestions = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.375rem;
  padding-top: 0.875rem;
`;

const Suggestion = styled.button`
  ${({ theme }) => css`
    padding: 0.375rem 0.75rem;
    border: 1px solid ${theme.colors.default.border};
    border-radius: 999px;
    background: ${theme.colors.default.bgSecondary};
    color: ${theme.colors.default.textSecondary};
    font-family: inherit;
    font-size: 0.8125rem;
    cursor: pointer;
    transition: color 0.15s ease, border-color 0.15s ease;

    &:hover {
      border-color: ${theme.colors.default.primary}80;
      color: ${theme.colors.default.textPrimary};
    }

    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
      outline-offset: 1px;
    }

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  `}
`;

const breathe = keyframes`
  0%, 100% { transform: scale(0.9); opacity: 0.75; }
  50%      { transform: scale(1);   opacity: 1; }
`;

const shimmer = keyframes`
  from { background-position: 100% 0; }
  to   { background-position: -100% 0; }
`;

const ThinkingRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.625rem;
  min-height: 1.5rem;
`;

const Breathing = styled(PlayRing)`
  ${({ theme }) => css`
    flex-shrink: 0;
    width: 1.25rem;
    height: 1.25rem;
    color: ${theme.colors.default.primary};
    animation: ${breathe} 1.4s ease-in-out infinite;

    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }
  `}
`;

/* The word, with the brand's light passing through it */
const Shimmer = styled.span`
  ${({ theme }) => css`
    font-size: 0.875rem;
    color: ${theme.colors.default.textSecondary};
    background: linear-gradient(
        90deg,
        ${theme.colors.default.textSecondary} 0%,
        ${theme.colors.default.textSecondary} 35%,
        #14f195 50%,
        ${theme.colors.default.textSecondary} 65%,
        ${theme.colors.default.textSecondary} 100%
      )
      0 0 / 200% 100%;
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: ${shimmer} 2.2s linear infinite;

    @media (prefers-reduced-motion: reduce) {
      animation: none;
      -webkit-text-fill-color: currentColor;
    }
  `}
`;

const Elapsed = styled.span`
  ${({ theme }) => css`
    font-size: 0.8125rem;
    color: ${theme.colors.state.disabled.color};
    font-variant-numeric: tabular-nums;
  `}
`;

const Foot = styled.div`
  position: relative;
  z-index: 1;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem 0.625rem;
`;

const ContextChip = styled.span`
  ${({ theme }) => css`
    max-width: 10rem;
    overflow: hidden;
    padding: 0.0625rem 0.5rem;
    border: 1px solid ${theme.colors.default.border};
    border-radius: 999px;
    color: ${theme.colors.default.textSecondary};
    font-size: 0.75rem;
    line-height: 1.5;
    text-overflow: ellipsis;
    white-space: nowrap;
  `}
`;

const FootNote = styled.p`
  ${({ theme }) => css`
    margin: 0;
    padding: 0 0.25rem;
    color: ${theme.colors.state.disabled.color};
    font-size: 0.75rem;
    text-align: center;
  `}
`;
