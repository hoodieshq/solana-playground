import type { FC } from "react";
import { useState } from "react";
import styled, { css } from "styled-components";

import type { LessonStep } from "./types";
import Markdown from "../../../components/Markdown";
import { SpinnerWithBg } from "../../../components/Loading";
import { useAsyncEffect, useKeybind } from "../../../hooks";

interface ReaderProps {
  step: LessonStep;
  onClose: () => void;
}

/**
 * The lesson page, over the editor, only when asked for.
 *
 * Reading is deliberately not a stepper stage: it is not part of the dev
 * loop, and making it one would put a surface into the rotation whose
 * job is to hide the code.
 */
const Reader: FC<ReaderProps> = ({ step, onClose }) => {
  const [content, setContent] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useAsyncEffect(async () => {
    if (!step.readPage) return;
    try {
      setContent(await step.readPage());
    } catch {
      setFailed(true);
    }
  }, [step]);

  useKeybind("Escape", onClose);

  return (
    <Sheet role="dialog" aria-modal="true" aria-label={step.objective}>
      <Bar>
        <Title>{step.objective}</Title>
        <Close type="button" onClick={onClose} aria-label="Close the page">
          &times;
        </Close>
      </Bar>
      <Body>
        {failed ? (
          <Failure>
            This page could not be loaded. The step is unaffected -- prose is
            not what verifies it.
          </Failure>
        ) : content === null ? (
          <SpinnerWithBg loading size="2rem" />
        ) : (
          <Markdown>{content}</Markdown>
        )}
      </Body>
    </Sheet>
  );
};

export default Reader;

const Sheet = styled.div`
  ${({ theme }) => css`
    position: absolute;
    inset: 0;
    z-index: 2;
    display: flex;
    flex-direction: column;
    background: ${theme.colors.default.bgSecondary};
  `}
`;

const Bar = styled.div`
  ${({ theme }) => css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid ${theme.colors.default.border};
  `}
`;

const Title = styled.span`
  ${({ theme }) => css`
    font-family: ${theme.font.other.family};
    font-weight: 600;
    color: ${theme.colors.default.textPrimary};
  `}
`;

const Close = styled.button`
  ${({ theme }) => css`
    width: 1.75rem;
    height: 1.75rem;
    border: none;
    border-radius: ${theme.default.borderRadius};
    background: transparent;
    color: ${theme.colors.default.textSecondary};
    font-size: 1.25rem;
    line-height: 1;
    cursor: pointer;

    &:hover {
      background: ${theme.colors.default.bgPrimary};
    }
    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
    }
  `}
`;

const Body = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
`;

const Failure = styled.p`
  color: ${({ theme }) => theme.colors.default.textSecondary};
`;
