import { Fragment, useEffect, useRef, useState } from "react";
import type { FC } from "react";
import styled, { css } from "styled-components";

import { PgLesson } from "./store";
import { currentStep, stepNumber } from "./progress";
import { PHONE_SIZE, PHONE_TYPE, phoneScrim, phoneSheet } from "../phone";
import type { Disposable } from "../../../utils";
import { PgCommon } from "../../../utils";

/**
 * The way out for someone who wants to type the code: a phone is for reading
 * and pressing, a keyboard is for writing. The same step goes on on a
 * computer, from a link to it.
 *
 * Reviewers of the first prototype asked to keep it. The link is a dummy in
 * the shape the product would hand out (a short one to the step); carrying
 * the progress across devices is the sign in's job, which the developers
 * wire up later.
 */
export class PgHandoff {
  static open() {
    PgHandoff._open = true;
    PgHandoff._listeners.forEach((cb) => cb());
  }

  static close() {
    PgHandoff._open = false;
    PgHandoff._listeners.forEach((cb) => cb());
  }

  static get isOpen() {
    return PgHandoff._open;
  }

  static onDidChange(cb: () => void): Disposable {
    PgHandoff._listeners.add(cb);
    return { dispose: () => PgHandoff._listeners.delete(cb) };
  }

  private static _open = false;
  private static readonly _listeners = new Set<() => void>();
}

/** The step's link, without the scheme: what gets typed if nothing else works */
const linkFor = (tutorial: string, step: number) =>
  `beta.solpg.io/t/${PgCommon.toKebabFromTitle(tutorial)}/${step}`;

/** Rendered once, at the root; shows while `PgHandoff` is open */
export const HandoffSheet: FC = () => {
  const [open, setOpen] = useState(PgHandoff.isOpen);
  useEffect(
    () => PgHandoff.onDidChange(() => setOpen(PgHandoff.isOpen)).dispose,
    []
  );
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(t);
  }, [copied]);
  const sheet = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const back = document.activeElement as HTMLElement | null;
    sheet.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") PgHandoff.close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      back?.focus?.({ preventScroll: true });
    };
  }, [open]);

  const { path, progress } = PgLesson.state;
  const step = path ? currentStep(path, progress) : null;
  if (!open || !path || !step) return null;

  const number = stepNumber(path, progress);
  const link = linkFor(path.tutorial, number);
  const url = `https://${link}`;
  const canShare = typeof navigator.share === "function";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // No clipboard here (an embed, an automated browser): still say it
    }
    setCopied(true);
  };

  const share = async () => {
    try {
      await navigator.share({
        title: `${path.tutorial}, step ${number}`,
        url,
      });
    } catch {
      // Closing the share sheet rejects too, which is not an error
    }
  };

  return (
    <>
      <Scrim aria-hidden="true" onClick={() => PgHandoff.close()} />
      <Sheet
        ref={sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby="handoff-title"
        tabIndex={-1}
      >
        <Grip aria-hidden />
        <Icon aria-hidden viewBox="0 0 24 24">
          <rect x="3" y="4" width="18" height="12" rx="2" />
          <path d="M8 20h8M12 16v4" />
        </Icon>
        <Title id="handoff-title">Write it yourself on a computer</Title>
        <Line>
          Typing code is easier with a keyboard. Open this link on your
          computer to write step {number} yourself: {step.objective}. Sign in
          with GitHub on both and your progress comes with you.
        </Line>
        {/* The whole link, wrapped after a slash, never cut */}
        <Link>
          {link.split("/").map((part, i) => (
            <Fragment key={i}>
              {i > 0 && (
                <>
                  /<wbr />
                </>
              )}
              {part}
            </Fragment>
          ))}
        </Link>
        <Row>
          <Action
            type="button"
            data-shot="handoff-copy"
            onClick={copy}
            $done={copied}
          >
            <span aria-live="polite">{copied ? "Copied" : "Copy link"}</span>
          </Action>
          {canShare && (
            <Action type="button" data-shot="handoff-share" onClick={share}>
              Share
            </Action>
          )}
        </Row>
        <Stay
          type="button"
          data-shot="handoff-stay"
          onClick={() => PgHandoff.close()}
        >
          Stay on the phone
        </Stay>
      </Sheet>
    </>
  );
};

const Scrim = styled.div`
  ${phoneScrim}
`;

const Sheet = styled.div`
  ${phoneSheet}
  ${({ theme }) => css`
    display: flex;
    flex-direction: column;
    padding: 0.5rem 1.25rem calc(1rem + env(safe-area-inset-bottom, 0px));
    color: ${theme.colors.default.textPrimary};
    outline: none;
  `}
`;

const Grip = styled.span`
  ${({ theme }) => css`
    align-self: center;
    width: 2.25rem;
    height: 0.25rem;
    margin-bottom: 1rem;
    border-radius: 999px;
    background: ${theme.colors.default.border};
  `}
`;

const Icon = styled.svg`
  ${({ theme }) => css`
    width: 1.75rem;
    height: 1.75rem;
    fill: none;
    stroke: ${theme.colors.default.textSecondary};
    stroke-width: 1.6;
    stroke-linecap: round;
    stroke-linejoin: round;
  `}
`;

const Title = styled.h2`
  margin: 0.75rem 0 0;
  ${PHONE_TYPE.title}
`;

const Line = styled.p`
  ${({ theme }) => css`
    margin: 0.375rem 0 0;
    ${PHONE_TYPE.secondary}
    color: ${theme.colors.default.textSecondary};
  `}
`;

const Link = styled.p`
  ${({ theme }) => css`
    margin: 1rem 0 0;
    padding: 0.75rem;
    border: 1px solid ${theme.colors.default.border};
    border-radius: ${theme.default.borderRadius};
    font-family: ${theme.font.code.family};
    font-size: 14px;
    overflow-wrap: anywhere;
    user-select: all;
  `}
`;

const Row = styled.div`
  margin-top: 0.5rem;
  display: flex;
  gap: 0.5rem;
`;

const Action = styled.button<{ $done?: boolean }>`
  ${({ theme, $done }) => css`
    flex: 1;
    height: ${PHONE_SIZE.target};
    border: 1px solid ${theme.colors.default.border};
    border-radius: ${theme.default.borderRadius};
    background: ${theme.colors.state.hover.bg};
    color: ${$done
      ? theme.colors.state.success.color
      : theme.colors.default.textPrimary};
    font: inherit;
    ${PHONE_TYPE.control}
    cursor: pointer;
  `}
`;

const Stay = styled.button`
  ${({ theme }) => css`
    margin-top: 1rem;
    height: ${PHONE_SIZE.target};
    border: 0;
    border-radius: ${theme.default.borderRadius};
    background: transparent;
    color: ${theme.colors.default.textSecondary};
    font: inherit;
    ${PHONE_TYPE.control}
    cursor: pointer;
  `}
`;
