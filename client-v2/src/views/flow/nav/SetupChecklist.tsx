import { FC, useContext, useState } from "react";
import styled, { css } from "styled-components";

import { ICONS } from "./icons";
import { fadeIn, Glyph, NavContext, rowBase } from "./parts";
import { BRAND } from "../tokens";

export interface SetupStep {
  id: string;
  label: string;
  done: boolean;
  /** What is set, once there is something to say — a network, a handle */
  value?: string;
  /** Said instead of the arrow while the step is in flight: "Cancel" */
  action?: string;
  /** The value is a problem: a network that is not answering */
  warn?: boolean;
  /** For the row's title: what the value means, when it is a problem */
  title?: string;
  onSelect: () => void;
}

const DISMISSED = "flow-setup-dismissed";
const FOLDED = "flow-setup-folded";

const read = (key: string) => {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
};

const write = (key: string, on: boolean) => {
  try {
    if (on) localStorage.setItem(key, "1");
    else localStorage.removeItem(key);
  } catch {}
};

/**
 * Getting Playground ready: a key for the assistant, a network, an account and
 * a wallet — the four things that otherwise turn up one at a time, each as the
 * reason something else did not work.
 *
 * It replaces the quickstart card, which pointed at the gallery the sidebar
 * already opens. A checklist says what is left instead, and stops saying it:
 * it folds to its one line, dismisses for good, and is gone once every step
 * is done. Every row is the step itself — pressing it does the thing, and a
 * finished row says what it settled on.
 *
 * The session footer builds the steps (`header/StatusChips`), because the
 * session is what they set up and it already holds each flow; this only draws
 * them and remembers whether you put it away.
 */
const SetupChecklist: FC<{ steps: SetupStep[] }> = ({ steps }) => {
  const { animate } = useContext(NavContext);
  const [dismissed, setDismissed] = useState(() => read(DISMISSED));
  const [folded, setFolded] = useState(() => read(FOLDED));

  const done = steps.filter((step) => step.done).length;
  if (dismissed || done === steps.length) return null;

  const fold = () => {
    setFolded(!folded);
    write(FOLDED, !folded);
  };
  const dismiss = () => {
    setDismissed(true);
    write(DISMISSED, true);
  };

  return (
    <Setup aria-labelledby="nav-setup-title" $animate={animate}>
      <Head>
        <Toggle
          type="button"
          aria-expanded={!folded}
          aria-controls="nav-setup-steps"
          onClick={fold}
        >
          <span id="nav-setup-title">Get set up</span>
          <Progress>
            {done} of {steps.length}
          </Progress>
          <Caret $folded={folded} aria-hidden="true">
            {ICONS.caret}
          </Caret>
        </Toggle>
        <Dismiss
          type="button"
          onClick={dismiss}
          aria-label="Dismiss setup"
          title="Dismiss"
        >
          {ICONS.close}
        </Dismiss>
      </Head>

      {!folded && (
        <Steps id="nav-setup-steps">
          {steps.map((step) => (
            <Step
              key={step.id}
              type="button"
              $done={step.done}
              title={step.title}
              onClick={step.onSelect}
            >
              <Glyph aria-hidden="true">
                <Status $done={step.done}>{step.done && ICONS.check}</Status>
              </Glyph>
              <StepLabel>
                {step.label}
                <Hidden>{step.done ? ", done" : ", to do"}</Hidden>
              </StepLabel>
              <End $warn={step.warn}>
                {step.action ??
                  step.value ??
                  (step.done ? null : (
                    <Arrow aria-hidden="true">{ICONS.forward}</Arrow>
                  ))}
              </End>
            </Step>
          ))}
        </Steps>
      )}
    </Setup>
  );
};

export default SetupChecklist;

/* Its own dismiss button shows on hover, like a row's menu button: at rest
   the block is a heading and four rows, nothing else. */
const Dismiss = styled.button`
  ${({ theme }) => css`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.25rem;
    height: 1.25rem;
    padding: 0;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: ${theme.colors.state.disabled.color};
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.1s, color 0.1s;

    & > svg {
      width: 0.75rem;
      height: 0.75rem;
    }

    &:hover {
      background: ${theme.colors.state.hover.bg};
      color: ${theme.colors.default.textPrimary};
    }

    &:focus-visible {
      opacity: 1;
      outline: 2px solid ${theme.colors.default.primary};
      outline-offset: -2px;
    }

    @media (hover: none) {
      opacity: 1;
    }

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  `}
`;

/* Above the foot's rule, where the quickstart card sat. It fades in with the
   rest of the column when the column opens. */
const Setup = styled.section<{ $animate: boolean }>`
  ${({ $animate }) => css`
    display: flex;
    flex-direction: column;
    gap: 1px;
    padding: 0.625rem 0.5rem 0.5rem;
    ${$animate && fadeIn}

    &:hover ${Dismiss}, &:focus-within ${Dismiss} {
      opacity: 1;
    }
  `}
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.25rem;
  padding-right: 0.25rem;
  margin-bottom: 0.125rem;
`;

/* The heading is also the fold: the whole line, title and progress, so the
   folded block is a single row you press to open again */
const Toggle = styled.button`
  ${({ theme }) => css`
    display: flex;
    align-items: center;
    gap: 0.375rem;
    min-width: 0;
    height: 1.5rem;
    padding: 0 0.5rem;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: ${theme.colors.state.disabled.color};
    font-family: inherit;
    font-size: 0.75rem;
    cursor: pointer;
    transition: color 0.1s;

    &:hover {
      color: ${theme.colors.default.textSecondary};
    }

    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
      outline-offset: -2px;
    }

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  `}
`;

/* Quiet: a count, not a progress bar */
const Progress = styled.span`
  font-variant-numeric: tabular-nums;

  &::before {
    content: "·";
    margin-right: 0.375rem;
  }
`;

const Caret = styled.span<{ $folded: boolean }>`
  ${({ $folded }) => css`
    display: flex;
    width: 0.75rem;
    height: 0.75rem;
    transform: rotate(${$folded ? "-90deg" : "0deg"});
    transition: transform 0.15s ease;

    & > svg {
      width: 100%;
      height: 100%;
    }

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  `}
`;

const Steps = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
`;

/* Open, a hairline ring; done, Solana's green with the ink check the brand
   slides use on it — the one place green means what it means everywhere
   else: finished. */
const Status = styled.span<{ $done: boolean }>`
  ${({ theme, $done }) => css`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 0.875rem;
    height: 0.875rem;
    border: 1.5px solid
      ${$done ? BRAND.green : theme.colors.state.disabled.color};
    border-radius: 50%;
    background: ${$done ? BRAND.green : "transparent"};
    color: ${BRAND.ink};

    & > svg {
      width: 0.625rem;
      height: 0.625rem;
    }
  `}
`;

const StepLabel = styled.span`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Hidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
`;

const Arrow = styled.span`
  display: flex;
  width: 0.875rem;
  height: 0.875rem;

  & > svg {
    width: 100%;
    height: 100%;
  }
`;

/* Right-aligned and quiet until the row is pointed at */
const End = styled.span<{ $warn?: boolean }>`
  ${({ theme, $warn }) => css`
    flex-shrink: 0;
    display: flex;
    align-items: center;
    max-width: 6.5rem;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 0.75rem;
    font-variant-numeric: tabular-nums;
    color: ${$warn
      ? theme.colors.state.error.color
      : theme.colors.state.disabled.color};
    transition: color 0.1s;

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  `}
`;

/* A finished step drops back a tone, so what is left reads first */
const Step = styled.button<{ $done: boolean }>`
  ${rowBase}
  ${({ theme, $done }) => css`
    position: relative;
    background: transparent;
    color: ${$done
      ? theme.colors.state.disabled.color
      : theme.colors.default.textSecondary};

    &:hover {
      background: ${theme.colors.state.hover.bg};
      color: ${theme.colors.default.textPrimary};
    }

    &:hover > ${End} {
      color: ${theme.colors.default.textPrimary};
    }

    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
      outline-offset: -2px;
    }
  `}
`;
