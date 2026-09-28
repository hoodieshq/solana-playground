import { FC, useState } from "react";
import styled, { css } from "styled-components";

import Button from "../../../components/Button";
import Img from "../../../components/Img";
import { PgTheme, PgTutorial, PgView } from "../../../utils";
import { ICONS } from "../nav/icons";
import { PHONE, PHONE_SIZE, PHONE_TYPE, usePhone } from "../phone";

interface TutorialsTabProps {
  /** Lowercased search query from the modal's search box */
  query: string;
  /** Show only the first few, whole: a sample of the list, not the list */
  limit?: number;
}

/**
 * Lists every registered tutorial (`PgTutorial.all`) filtered by `query`.
 * Opening one hands off to the existing tutorial route/flow, then closes
 * the gallery so the reader lands straight on the tutorial page.
 */
const TutorialsTab: FC<TutorialsTabProps> = ({ query, limit }) => {
  const [error, setError] = useState<{ name: string; message: string } | null>(
    null
  );
  /* On a phone the whole card opens it, and a quiet chevron says so */
  const phone = usePhone();

  const q = query.trim().toLowerCase();
  const matching = q
    ? PgTutorial.all.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q)
      )
    : PgTutorial.all;
  const items = limit ? matching.slice(0, limit) : matching;

  if (!items.length) {
    return <Empty>No tutorials match &ldquo;{query}&rdquo;.</Empty>;
  }

  return (
    <Grid>
      {items.map((t) => (
        <Card key={t.name}>
          <Thumb src={t.thumbnail} alt="" />
          <Body>
            <Eyebrow>
              {t.level}
              {t.framework ? ` \u00b7 ${t.framework}` : ""}
            </Eyebrow>
            <Title>{t.name}</Title>
            <Sub>{t.description}</Sub>
            {error?.name === t.name && <ErrorText>{error.message}</ErrorText>}
          </Body>
          <Button
            data-shot="tutorial-open"
            aria-label={`Open ${t.name}`}
            onClick={async () => {
              setError(null);
              try {
                await PgTutorial.open(t.name);
                PgView.setModal(null);
              } catch (e) {
                setError({
                  name: t.name,
                  message:
                    e instanceof Error ? e.message : "Could not open tutorial",
                });
              }
            }}
          >
            {phone ? <Go>{ICONS.forward}</Go> : "Open"}
          </Button>
        </Card>
      ))}
    </Grid>
  );
};

export default TutorialsTab;

/* Shared with ProgramsTab so both lists read as one family. */
export const Grid = styled.div`
  display: grid;
  /* Never a column wider than the list: one, full width, on a phone */
  grid-template-columns: repeat(auto-fill, minmax(min(20rem, 100%), 1fr));
  gap: 0.75rem;
`;

export const Card = styled.div`
  ${({ theme }) => css`
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 0.875rem;
    align-items: center;
    padding: 0.875rem;
    border: 1px solid ${theme.colors.default.border};
    border-radius: 12px;
    /* Raised, not sunken: these used to be darker than the page they sat on,
       which reads as a hole rather than a card. */
    background: ${theme.colors.default.bgSecondary};
    transition: border-color ${theme.default.transition.duration.short}
      ${theme.default.transition.type};

    &:hover {
      border-color: ${theme.colors.default.textSecondary};
    }

    /* The whole card is the button on a phone: its own button reaches over
       all of it, drawn only as the chevron at the end */
    ${PHONE} {
      position: relative;
      gap: 0.875rem;
      padding: 0.875rem 0.75rem 0.875rem 1rem;
      border-radius: 16px;
      -webkit-tap-highlight-color: transparent;

      & > button {
        position: static;
        min-width: 0;
        width: 1.5rem;
        min-height: ${PHONE_SIZE.target};
        padding: 0;
        border: none;
        background: transparent;
        color: ${theme.colors.state.disabled.color};

        &::after {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: 16px;
        }

        &:hover {
          background: transparent;
        }

        &:focus-visible {
          outline: none;
        }
      }

      &:hover {
        border-color: ${theme.colors.default.border};
      }

      &:has(> button:active) {
        background: ${theme.colors.state.hover.bg};
      }

      &:has(> button:focus-visible) {
        outline: 2px solid ${theme.colors.default.primary};
        outline-offset: 2px;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  `}
`;

export const Body = styled.div`
  min-width: 0;
`;

/* The chevron a phone's card ends in, where the Open button was */
export const Go = styled.span`
  display: flex;
  width: 18px;
  height: 18px;

  & > svg {
    width: 100%;
    height: 100%;
  }
`;

export const Eyebrow = styled.div`
  ${({ theme }) => css`
    /* Sentence case and grey, like every other label on the page. The
       uppercase accent-coloured version made sixteen cards each shout their
       level before saying their name. */
    font-size: 0.75rem;
    color: ${theme.colors.state.disabled.color};

    ${PHONE} {
      ${PHONE_TYPE.label}
    }
  `}
`;

export const Title = styled.div`
  ${({ theme }) => css`
    margin-top: 0.125rem;
    font-weight: 500;
    color: ${theme.colors.default.textPrimary};
    ${PgTheme.getClampLinesCSS(1)};

    ${PHONE} {
      ${PHONE_TYPE.body}
      font-weight: 440;
    }
  `}
`;

export const Sub = styled.div`
  ${({ theme }) => css`
    margin-top: 0.25rem;
    color: ${theme.colors.default.textSecondary};
    font-size: ${theme.font.other.size.small};
    ${PgTheme.getClampLinesCSS(2)};

    ${PHONE} {
      ${PHONE_TYPE.secondary}
    }
  `}
`;

/* Shared with ProgramsTab: an inline failure right at the card that
 * caused it, e.g. a GitHub rate limit or a missing tutorial asset. */
export const ErrorText = styled.div`
  ${({ theme }) => css`
    margin-top: 0.25rem;
    color: ${theme.colors.state.error.color};
    font-size: ${theme.font.other.size.small};
  `}
`;

export const Empty = styled.p`
  ${({ theme }) => css`
    margin: 1.5rem 0;
    text-align: center;
    color: ${theme.colors.default.textSecondary};
  `}
`;

const Thumb = styled(Img)`
  ${({ theme }) => css`
    width: 3.5rem;
    height: 2.625rem;
    object-fit: cover;
    border-radius: 8px;
    background: ${theme.colors.default.bgPrimary};
  `}
`;
