import { FC, useState } from "react";
import styled, { css } from "styled-components";

import { PgTheme, PgTutorial, PgView } from "../../../utils";
import { TUTORIAL_LEVELS } from "../../../utils/tutorial/details";
import { ICONS } from "../nav/icons";
import { PHONE, PHONE_SIZE, PHONE_TYPE, usePhone } from "../phone";
import { PgLessonSummary } from "../lessons/summary";
import { BRAND } from "../tokens";
import { tutorialTitle } from "./title";
import TutorialCover from "./TutorialCover";

interface TutorialsTabProps {
  /** Lowercased search query from the modal's search box */
  query: string;
  /** Show only the first few, whole: a sample of the list, not the list */
  limit?: number;
  /** Only this framework's tutorials, or every one */
  framework?: FrameworkFilter;
  /** In sections by level, each a few cards deep with the rest behind Show all */
  byLevel?: boolean;
}

export type FrameworkFilter = "all" | "Anchor" | "Seahorse" | "Native";

/** Cards a level shows before Show all: two rows of the list's two columns */
const LEVEL_FIRST = 4;

/** What the page lists: the search reads the name and the description, the
 * filter narrows by framework */
export const filterTutorials = (query: string, framework: FrameworkFilter) => {
  const q = query.trim().toLowerCase();
  return PgTutorial.all.filter(
    (t) =>
      (framework === "all" || t.framework === framework) &&
      (!q ||
        t.name.toLowerCase().includes(q) ||
        tutorialTitle(t.name).toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q))
  );
};

/**
 * Lists every registered tutorial (`PgTutorial.all`) filtered by `query`.
 * Opening one hands off to the existing tutorial route/flow, then closes
 * the gallery so the reader lands straight on the tutorial page.
 */
const TutorialsTab: FC<TutorialsTabProps> = ({
  query,
  limit,
  framework = "all",
  byLevel = false,
}) => {
  const [error, setError] = useState<{ name: string; message: string } | null>(
    null
  );
  /* On a phone the whole card opens it, and a quiet chevron says so */
  const phone = usePhone();

  const [opened, setOpened] = useState<string[]>([]);

  const matching = filterTutorials(query, framework);
  const items = limit ? matching.slice(0, limit) : matching;

  if (!items.length) {
    // The page's own results line says so when it is grouped
    return byLevel ? null : (
      <Empty>No tutorials match &ldquo;{query}&rdquo;.</Empty>
    );
  }

  const card = (t: typeof items[number]) => {
    const summary = PgLessonSummary.read(t.name);
    const finished = !!summary?.finished;
    const started =
      !!summary && !finished && PgLessonSummary.proved(summary) > 0;
    return (
      <Card key={t.name}>
        <Thumb name={t.name} framework={t.framework} />
        <Body>
          <Title>
            {tutorialTitle(t.name)}
            {started && <LessonStatus name={t.name} />}
          </Title>
          <Sub>{t.description}</Sub>
          <Meta>
            {/* In a level's section the level is its heading, so the line
                  names the framework and who wrote it instead */}
            {(byLevel
              ? [t.framework, t.authors[0] && `by ${t.authors[0].name}`]
              : [t.level, t.framework]
            )
              .filter(Boolean)
              .join(" \u00b7 ")}
          </Meta>
          {error?.name === t.name && <ErrorText>{error.message}</ErrorText>}
        </Body>
        <Corner
          type="button"
          $done={finished}
          data-shot="tutorial-open"
          aria-label={
            finished
              ? `${tutorialTitle(t.name)} completed. Open it`
              : `${started ? "Continue" : "Open"} ${tutorialTitle(t.name)}`
          }
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
          {finished ? (
            <Tick viewBox="0 0 16 16" aria-hidden>
              <path d="M3.5 8.5l3 3 6-7" />
            </Tick>
          ) : phone ? (
            <Go>{ICONS.forward}</Go>
          ) : (
            <Arrow viewBox="0 0 16 16" aria-hidden>
              <path d="M5 11 11 5M6 5h5v5" />
            </Arrow>
          )}
        </Corner>
      </Card>
    );
  };

  if (!byLevel) return <Grid>{items.map(card)}</Grid>;

  // A search shows everything it finds; browsing, each level opens in place
  const searching = !!query.trim();
  return (
    <>
      {TUTORIAL_LEVELS.map((level) => {
        const all = items.filter((t) => t.level === level);
        if (!all.length) return null;
        const more = !searching && all.length > LEVEL_FIRST;
        const open = opened.includes(level);
        const shown = more && !open ? all.slice(0, LEVEL_FIRST) : all;
        const id = `level-${level.toLowerCase()}`;
        return (
          <Level key={level} aria-labelledby={id}>
            <LevelHead>
              <LevelName id={id}>{level}</LevelName>
              <LevelCount>{all.length}</LevelCount>
              {/* Opens in place, so it points down, not on to another page */}
              {more && (
                <LevelMore
                  type="button"
                  aria-expanded={open}
                  onClick={() =>
                    setOpened((o) =>
                      open ? o.filter((l) => l !== level) : [...o, level]
                    )
                  }
                >
                  {open ? "Show less" : `Show all ${all.length}`}
                  <Chevron $up={open} aria-hidden>
                    {ICONS.forward}
                  </Chevron>
                </LevelMore>
              )}
            </LevelHead>
            <Grid>{shown.map(card)}</Grid>
          </Level>
        );
      })}
    </>
  );
};

/**
 * How far a lesson under way is, beside its name. A finished one says so on
 * its button instead, where the eye lands for what a card offers
 */
const LessonStatus: FC<{ name: string }> = ({ name }) => {
  const summary = PgLessonSummary.read(name);
  if (!summary) return null;
  const done = PgLessonSummary.proved(summary);
  if (summary.finished) {
    return (
      <Status $done title="Completed" aria-label="Completed">
        ✓
      </Status>
    );
  }
  if (!done) return null;
  return (
    <Status>
      {done} of {summary.passed.length}
    </Status>
  );
};

export default TutorialsTab;

const Level = styled.section`
  & + & {
    margin-top: 2rem;
  }
`;

const LevelHead = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 2.25rem;
  margin-bottom: 0.625rem;

  ${PHONE} {
    min-height: ${PHONE_SIZE.target};
    margin-bottom: 0.375rem;
  }
`;

/* A section's name at reading size: one step over the cards' names */
const LevelName = styled.h2`
  ${({ theme }) => css`
    margin: 0;
    font-size: 1rem;
    font-weight: 500;
    line-height: 1.25rem;
    color: ${theme.colors.default.textPrimary};

    ${PHONE} {
      ${PHONE_TYPE.title}
    }
  `}
`;

const LevelCount = styled.span`
  ${({ theme }) => css`
    padding: 0 0.5rem;
    border-radius: 999px;
    background: ${theme.colors.state.hover.bg};
    font-size: 0.75rem;
    line-height: 1.25rem;
    color: ${theme.colors.default.textSecondary};
    font-variant-numeric: tabular-nums;
  `}
`;

const LevelMore = styled.button`
  ${({ theme }) => css`
    margin-left: auto;
    margin-right: -0.5rem;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    height: 2.25rem;
    padding: 0 0.5rem;
    border: none;
    border-radius: 8px;
    background: none;
    color: ${theme.colors.default.textSecondary};
    font: inherit;
    font-size: 0.8125rem;
    cursor: pointer;

    &:hover {
      color: ${theme.colors.default.textPrimary};
    }

    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
      outline-offset: 1px;
    }

    ${PHONE} {
      height: ${PHONE_SIZE.target};
      ${PHONE_TYPE.label}
    }
  `}
`;

const Chevron = styled.span<{ $up: boolean }>`
  display: flex;
  width: 0.875rem;
  height: 0.875rem;
  transform: rotate(${({ $up }) => ($up ? "-90deg" : "90deg")});
  transition: transform 200ms cubic-bezier(0.22, 0.61, 0.36, 1);

  & > svg {
    width: 100%;
    height: 100%;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const Status = styled.span<{ $done?: boolean }>`
  ${({ theme, $done }) => css`
    margin-left: 0.5rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    vertical-align: middle;
    font-size: 0.75rem;
    font-weight: 400;
    font-variant-numeric: tabular-nums;
    color: ${theme.colors.default.textSecondary};
    ${$done &&
    css`
      width: 1.125rem;
      height: 1.125rem;
      border-radius: 999px;
      background: ${BRAND.green}26;
      color: ${BRAND.green};
      font-size: 0.6875rem;
    `}
  `}
`;

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
    position: relative;
    grid-template-columns: auto 1fr auto;
    gap: 0.875rem;
    /* The cover and the button stand at the top with the name, not in the
       middle of however many lines the words take */
    align-items: start;
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

/* One family, three steps by size, weight and grey (Styleguide 84:3: rows
   13px, reading 15px, weights 350 to 500): the name, what it is, then the
   level and framework as a caption under both. The caption used to sit on
   top as an eyebrow, so each card said its level before its name, at a grey
   of 3.4:1 that AA does not allow at 12px. */
export const Title = styled.div`
  ${({ theme }) => css`
    font-size: 0.9375rem;
    font-weight: 500;
    line-height: 1.25rem;
    color: ${theme.colors.default.textPrimary};
    ${PgTheme.getClampLinesCSS(1)};

    ${PHONE} {
      ${PHONE_TYPE.body}
      font-weight: 440;
      line-height: 1.3;
    }
  `}
`;

export const Sub = styled.div`
  ${({ theme }) => css`
    margin-top: 0.125rem;
    font-size: 0.8125rem;
    font-weight: 350;
    line-height: 1.125rem;
    color: ${theme.colors.default.textSecondary};
    ${PgTheme.getClampLinesCSS(2)};

    ${PHONE} {
      ${PHONE_TYPE.secondary}
      line-height: 1.35;
    }
  `}
`;

/* The secondary grey a step down, 4.9:1 on the card */
export const Meta = styled.div`
  ${({ theme }) => css`
    margin-top: 0.5rem;
    font-size: 0.75rem;
    font-weight: 380;
    line-height: 1rem;
    color: ${theme.colors.default.textSecondary}CC;
    font-variant-numeric: tabular-nums;

    ${PHONE} {
      ${PHONE_TYPE.label}
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

const Thumb = styled(TutorialCover)`
  width: 3.5rem;
  height: 2.625rem;
  border-radius: 8px;
`;

/* The corner square, as the connectors' cards draw it: a raised fill, no
   outline, the arrow out to the tutorial, a tick once it is done. The whole
   card is its hit area, stretched over it, so the square only shows what a
   press does; its name says it to anyone listening */
const Corner = styled.button<{ $done: boolean }>`
  ${({ theme, $done }) => css`
    position: static;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    padding: 0;
    border: none;
    border-radius: 8px;
    background: ${$done ? `${BRAND.green}1f` : theme.colors.state.hover.bg};
    color: ${$done ? BRAND.green : theme.colors.default.textPrimary};
    cursor: pointer;
    transition: background ${theme.default.transition.duration.short}
      ${theme.default.transition.type};

    &::after {
      content: "";
      position: absolute;
      inset: 0;
      border-radius: 12px;
    }

    ${Card}:hover & {
      background: ${$done ? `${BRAND.green}2e` : theme.colors.default.border};
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

/* Under the pointer it leans the way it points: 2px out to the corner, on
   the Styleguide's Press curve */
const Arrow = styled.svg`
  width: 1rem;
  height: 1rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
  transition: transform 200ms cubic-bezier(0.22, 0.61, 0.36, 1);

  ${Card}:hover &,
  ${Card}:has(button:focus-visible) & {
    transform: translate(2px, -2px);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    ${Card}:hover &,
    ${Card}:has(button:focus-visible) & {
      transform: none;
    }
  }
`;

/* Drawn, not typed: a glyph brings its own side bearings and sat off
   centre */
const Tick = styled.svg`
  flex-shrink: 0;
  width: 1rem;
  height: 1rem;
  fill: none;
  stroke: ${BRAND.green};
  stroke-width: 1.75;
  stroke-linecap: round;
  stroke-linejoin: round;
`;
