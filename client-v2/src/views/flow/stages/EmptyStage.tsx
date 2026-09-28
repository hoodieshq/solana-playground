import type { FC, ReactNode } from "react";
import styled, { css } from "styled-components";

import Button from "../../../components/Button";
import PlayRing from "../../../components/PlayRing";
import { HEADLINE_FONT } from "../../../themes/solana-v3/theme";
import { PHONE, PHONE_SIZE, PHONE_TYPE, phoneActions } from "../phone";
import { brandAction } from "../components/gradient";

interface EmptyStageProps {
  /** The state, said large: "Nothing built yet" */
  title: string;
  /** One short line under it */
  line?: ReactNode;
  /** A small mark above the title, for a state that needs one (a failure) */
  mark?: ReactNode;
  /** A quiet line under the title, for a figure such as the time taken */
  meta?: ReactNode;
  /** Something that went wrong, between the line and the actions */
  notice?: ReactNode;
  /** The row of actions, the brand pill first */
  actions?: ReactNode;
  /** What stays reachable under the actions: a secondary action, an id */
  children?: ReactNode;
}

/**
 * A stage with nothing in it yet, said the way the landing says things: the
 * line set large in the headline face, one quiet sentence, and the one thing
 * to press as the brand's pill, centred in the stage.
 *
 * No ground of its own. The window has one pattern behind everything (in
 * `Flow`), and a second one here collided with it at the pane's edge, so
 * this stays transparent and lets that one show through. The stage router
 * already plays the one entrance a stage gets, so nothing here moves on its
 * own either.
 *
 * On a phone the words sit in the middle of what is left and the pill goes
 * to the foot of the page, under the thumb, with what stays reachable (an
 * IDL upload, an id) just above it.
 */
const EmptyStage: FC<EmptyStageProps> = ({
  title,
  line,
  mark,
  meta,
  notice,
  actions,
  children,
}) => (
  <Frame>
    <Content>
      {mark}
      <Title>{title}</Title>
      {meta && <Meta>{meta}</Meta>}
      {line && <Line>{line}</Line>}
      {notice && <Notice>{notice}</Notice>}
      {(actions || children) && (
        <End>
          {actions && <Actions>{actions}</Actions>}
          {children && <Foot>{children}</Foot>}
        </End>
      )}
    </Content>
  </Frame>
);

export default EmptyStage;

/**
 * The brand's pill, a smaller cousin of the landing's "Open Playground": the
 * green-into-purple fill, a white label in the headline face and the play
 * ring after it. Built on the shared `Button`, so a click still disables it
 * for as long as the command runs.
 *
 * `$off` is for a pill that cannot be pressed yet (Deploy before a build):
 * it fades rather than turning grey, so it still reads as where you are
 * headed. A pill that is only busy keeps its colour.
 */
export const BrandPill = styled(Button)<{ $off?: boolean }>`
  ${({ theme, $off }) => css`
    /* Ringed in the brand at rest, filled with it under the pointer; the base
       button repaints its background for hover and disabled, and the ring
       holds through all of them */
    && {
      ${brandAction(theme.colors.state.hover.bg)}
    }

    && {
      height: 2.5rem;
      padding: 0 1rem 0 1.25rem;
      border-radius: 999px;
      font-family: ${HEADLINE_FONT};
      font-size: 0.9375rem;
      font-weight: 500;
      letter-spacing: -0.005em;
      white-space: nowrap;
      transition: transform 200ms cubic-bezier(0.22, 0.61, 0.36, 1),
        opacity 200ms ease;
    }

    && > span.right-icon > * {
      margin-left: 0.5rem;
    }

    ${PHONE} {
      && {
        height: ${PHONE_SIZE.target};
        padding: 0 1.125rem 0 1.375rem;
        font-size: 16px;
        font-weight: 440;
      }
    }

    &&:hover:not(:disabled) {
      transform: translateY(-1px);
    }

    &&:active:not(:disabled) {
      transform: none;
    }

    &&:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
      outline-offset: 3px;
    }

    ${$off &&
    css`
      && {
        opacity: 0.4;
      }
    `}

    @media (prefers-reduced-motion: reduce) {
      && {
        transition: none;
      }
      &&:hover:not(:disabled) {
        transform: none;
      }
    }
  `}
`;

/** Our play icon, sized to the label it sits beside */
export const PlayIcon = styled(PlayRing)`
  flex-shrink: 0;
  width: 1.15em;
  height: 1.15em;
`;

/* Transparent, so the window's one ground shows through. Centred with auto
   margins rather than justify-content, so a short stage scrolls from the top
   instead of clipping the title. */
const Frame = styled.div`
  ${({ theme }) => css`
    height: 100%;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    padding: 2rem 1.75rem;
    background: transparent;
    font-family: ${theme.font.other.family};
    color: ${theme.colors.default.textPrimary};

    ${PHONE} {
      padding: 2rem 1.25rem 0;
    }
  `}
`;

const Content = styled.div`
  margin: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 36rem;
  text-align: center;

  ${PHONE} {
    flex: 1 0 auto;
    width: 100%;
    max-width: none;
    margin: 0;

    & > :first-child {
      margin-top: auto;
    }
  }
`;

const Title = styled.h2`
  ${({ theme }) => css`
    margin: 0;
    font-family: ${HEADLINE_FONT};
    font-size: clamp(1.75rem, 2.4vw, 2.5rem);
    font-weight: 500;
    line-height: 1.1;
    letter-spacing: -0.01em;
    color: ${theme.colors.default.textPrimary};

    ${PHONE} {
      ${PHONE_TYPE.display}
    }
  `}
`;

const Meta = styled.span`
  ${({ theme }) => css`
    margin-top: 0.5rem;
    font-family: ${theme.font.code.family};
    font-size: ${theme.font.other.size.xsmall};
    color: ${theme.colors.default.textSecondary};

    /* On a phone in the interface face, like every other small line */
    ${PHONE} {
      font-family: ${theme.font.other.family};
      font-variant-numeric: tabular-nums;
      ${PHONE_TYPE.label}
    }
  `}
`;

const Line = styled.p`
  ${({ theme }) => css`
    max-width: 28rem;
    margin: 0.875rem 0 0;
    font-size: ${theme.font.other.size.small};
    line-height: 1.55;
    color: ${theme.colors.default.textSecondary};

    ${PHONE} {
      margin-top: 0.75rem;
      ${PHONE_TYPE.secondary}
    }
  `}
`;

const Notice = styled.div`
  margin-top: 1.25rem;
`;

/* The pill and what goes with it: part of the column on a desk, the foot of
   the page on a phone, the pill last */
const End = styled.div`
  display: contents;

  ${PHONE} {
    ${phoneActions}
    flex-direction: column-reverse;
    align-items: stretch;
    margin-top: auto;
    padding-top: 2rem;

    & > * {
      margin-top: 0;
    }

    & > div > button {
      width: 100%;
    }
  }
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin-top: 1.75rem;
`;

const Foot = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  margin-top: 1.25rem;
`;
