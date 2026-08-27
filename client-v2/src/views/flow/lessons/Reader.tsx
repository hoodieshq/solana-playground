import type { FC } from "react";
import { useEffect, useRef, useState } from "react";
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
  const closeRef = useRef<HTMLButtonElement>(null);

  useAsyncEffect(async () => {
    const { readPage } = step;
    if (!readPage) return;

    // Fire the load without awaiting it here, so this effect's own
    // promise settles immediately and its cleanup (below) is wired up
    // before the load can finish. `live` is then checked before either
    // state update, so a step closed mid-load never touches state after
    // this component has unmounted.
    let live = true;
    (async () => {
      try {
        const page = await readPage();
        if (live) setContent(page);
      } catch {
        if (live) setFailed(true);
      }
    })();

    return () => {
      live = false;
    };
  }, [step]);

  useKeybind("Escape", onClose);

  // Move focus into the sheet on open, and give it back on close. This
  // is the half of dialog behaviour that carries real value without a
  // focus trap: `aria-modal` is deliberately not claimed below, since
  // nothing here makes the background inert.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => previouslyFocused?.focus();
  }, []);

  return (
    <Sheet role="dialog" aria-label={step.objective}>
      <Bar>
        <Title>{step.objective}</Title>
        <Close
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close the page"
        >
          &times;
        </Close>
      </Bar>
      <Body>
        {failed ? (
          <Failure>
            This page could not be loaded. The step is unaffected -- prose is
            not what verifies it.
          </Failure>
        ) : !step.readPage ? (
          <Failure>This step has no page to read.</Failure>
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
