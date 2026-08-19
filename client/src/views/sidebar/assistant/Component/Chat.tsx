import { useEffect, useRef, useState } from "react";
import styled, { css } from "styled-components";

import ChatItem from "./ChatItem";
import Connect from "./Connect";
import Button from "../../../../components/Button";
import { PgAssistant } from "../store";
import { PgBuildOutput } from "../bridge/build-output";
import { runTurn } from "../model/agent";
import { PgExplorer, PgProgramInfo } from "../../../../utils";
import { useRenderOnChange } from "../../../../hooks";
import type Anthropic from "@anthropic-ai/sdk";

const SUGGESTIONS = [
  "Why did my build fail?",
  "What does this program do?",
  "What's our current status and roadmap?",
];

const Chat = () => {
  useRenderOnChange(PgAssistant.onDidChange);

  const [input, setInput] = useState("");
  const history = useRef<Anthropic.Beta.BetaMessageParam[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const items = PgAssistant.items;
  const status = PgAssistant.status;
  const busy = status !== "idle";

  // Follow the conversation as it grows
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [items.length, status]);

  if (!PgAssistant.hasKey) return <Connect />;

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    setInput("");
    PgAssistant.addUserMessage(trimmed);
    PgAssistant.setStatus("running");

    try {
      history.current = await runTurn({
        apiKey: PgAssistant.apiKey!,
        history: history.current,
        input: trimmed,
      });
    } catch (e) {
      PgAssistant.addError(e instanceof Error ? e.message : String(e));
    } finally {
      PgAssistant.setStatus("idle");
    }
  };

  // Read the cheap accessors directly rather than building the whole project
  // context — this runs on every render, including every streamed token.
  const currentFilePath = PgExplorer.currentFilePath;
  const chips = [
    currentFilePath ? PgExplorer.getItemNameFromPath(currentFilePath) : null,
    PgBuildOutput.latest?.failed ? "build error" : null,
    PgProgramInfo.idl ? "idl" : null,
  ].filter((chip): chip is string => !!chip);

  return (
    <Wrapper>
      <Messages>
        {items.length === 0 ? (
          <Empty>
            <EmptyLabel>TRY ASKING</EmptyLabel>
            {SUGGESTIONS.map((suggestion) => (
              <Suggestion key={suggestion} onClick={() => send(suggestion)}>
                {suggestion}
              </Suggestion>
            ))}
          </Empty>
        ) : (
          items.map((item) => <ChatItem key={item.id} item={item} />)
        )}
        <div ref={bottomRef} />
      </Messages>

      <Composer>
        {chips.length > 0 && (
          <Context>
            <ContextLabel>CONTEXT</ContextLabel>
            {chips.map((chip) => (
              <Chip key={chip}>{chip}</Chip>
            ))}
          </Context>
        )}

        <InputRow>
          <TextArea
            value={input}
            placeholder={
              status === "awaiting"
                ? "Waiting on your decision…"
                : busy
                ? "Working…"
                : "Ask about this project…"
            }
            disabled={busy}
            rows={2}
            onChange={(ev) => setInput(ev.target.value)}
            onKeyDown={(ev) => {
              if (ev.key === "Enter" && !ev.shiftKey) {
                ev.preventDefault();
                send(input);
              }
            }}
          />
          <Button
            kind="primary"
            size="small"
            disabled={busy || !input.trim()}
            onClick={() => send(input)}
          >
            Send
          </Button>
        </InputRow>

        <Footer>
          <span>claude-opus-5</span>
          <span>nothing is written without your click</span>
        </Footer>
      </Composer>
    </Wrapper>
  );
};

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  min-height: 0;
`;

const Messages = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.125rem;
  flex-grow: 1;
  overflow-y: auto;
  padding: 1rem 0.75rem;
  min-height: 0;
`;

const Empty = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const EmptyLabel = styled.div`
  ${({ theme }) => css`
    color: ${theme.colors.default.textSecondary};
    font-size: ${theme.font.code.size.xsmall};
    letter-spacing: 0.1em;
    padding-bottom: 0.25rem;
  `}
`;

const Suggestion = styled.button`
  ${({ theme }) => css`
    text-align: left;
    padding: 0.625rem 0.6875rem;
    background: transparent;
    border: 1px solid ${theme.colors.default.border};
    border-radius: ${theme.default.borderRadius};
    color: ${theme.colors.default.textSecondary};
    font: inherit;
    font-size: ${theme.font.code.size.small};
    line-height: 1.5;
    cursor: pointer;

    &:hover {
      background: ${theme.colors.state.hover.bg};
      color: ${theme.colors.default.textPrimary};
    }
  `}
`;

const Composer = styled.div`
  ${({ theme }) => css`
    flex-shrink: 0;
    border-top: 1px solid ${theme.colors.default.border};
    padding: 0.5rem 0.75rem 0.75rem;
    background: ${theme.colors.default.bgSecondary};

    /**
     * The sidebar sizes itself with \`calc(100vh - <bottom height>)\`, so if
     * anything above it drifts by a pixel the panel is taller than the space it
     * has and the composer lands below the fold. Sticking it to the bottom of
     * the scrollport keeps it reachable either way.
     */
    position: sticky;
    bottom: 0;
    z-index: 1;
  `}
`;

const Context = styled.div`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-wrap: wrap;
  padding-bottom: 0.5rem;
`;

const ContextLabel = styled.span`
  ${({ theme }) => css`
    color: ${theme.colors.default.textSecondary};
    font-size: ${theme.font.code.size.xsmall};
    letter-spacing: 0.08em;
  `}
`;

const Chip = styled.span`
  ${({ theme }) => css`
    padding: 0.0625rem 0.4375rem;
    border: 1px solid ${theme.colors.default.border};
    border-radius: ${theme.default.borderRadius};
    color: ${theme.colors.default.textSecondary};
    font-size: ${theme.font.code.size.xsmall};
  `}
`;

const InputRow = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
`;

const TextArea = styled.textarea`
  ${({ theme }) => css`
    flex-grow: 1;
    resize: none;
    padding: 0.5rem 0.625rem;
    background: ${theme.colors.default.bgSecondary};
    border: 1px solid ${theme.colors.default.border};
    border-radius: ${theme.default.borderRadius};
    color: ${theme.colors.default.textPrimary};
    font: inherit;
    font-size: ${theme.font.code.size.small};

    &:focus {
      outline: 1px solid ${theme.colors.default.primary};
    }

    &:disabled {
      color: ${theme.colors.default.textSecondary};
    }
  `}
`;

const Footer = styled.div`
  ${({ theme }) => css`
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0 0.5rem;
    padding-top: 0.4375rem;
    color: ${theme.colors.default.textSecondary};
    font-size: ${theme.font.code.size.xsmall};

    /* Wrap between the two, never inside either */
    & > span {
      white-space: nowrap;
    }
  `}
`;

export default Chat;
