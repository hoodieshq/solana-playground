import { useEffect, useRef, useState } from "react";
import type { FC } from "react";
import styled, { css } from "styled-components";

import { BrandPill } from "../stages/EmptyStage";
import { getLessonPath } from "../lessons";
import { PgLessonSummary } from "../lessons/summary";
import type { LessonSummary } from "../lessons/summary";
import { BRAND } from "../tokens";
import { startOnOpen } from "./autostart";
import { tutorialTitle } from "./title";
import IsoVoxels from "./banner-art/IsoVoxels";
import { usePhone } from "../phone";
import { HEADLINE_FONT } from "../../../themes/solana-v3/theme";
import { PgTutorial, PgView } from "../../../utils";

const TUTORIAL = "Hello Anchor";
/** Where the banner points once Hello Anchor is done */
const NEXT = "Counter PDA Tutorial";

/* An id of the component's own for as long as it lives. React 17 has no
   useId, and two banners on a page must not share a heading id */
let ids = 0;
/** The banner's width, in px, from which the mark stands beside the words */
const WIDE_MIN = 640;
const useOwnId = (prefix: string) => useState(() => `${prefix}${++ids}`)[0];

/**
 * The top of the tutorials list: the one a newcomer begins with, in three
 * states. Fresh it invites, started it picks up at the next step, finished
 * it says so, and then it points at the next one. In every state the
 * picture is the same voxel mark: beside the words on a wide banner, hung
 * from the top right corner on a narrow one or a phone.
 */
const StartHere: FC = () => {
  const titleId = useOwnId("start-here-title-");
  const phone = usePhone();
  const [summary, setSummary] = useState<LessonSummary | null>(() =>
    PgLessonSummary.read(TUTORIAL)
  );
  useEffect(
    () =>
      PgLessonSummary.onDidChange(() =>
        setSummary(PgLessonSummary.read(TUTORIAL))
      ).dispose,
    []
  );

  // A finished tutorial has nothing more to offer from the top of the list,
  // so the banner moves on to the next one: Start, or Continue on the page
  // it was left at
  const [nextAt, setNextAt] = useState<{ page: number } | null>(null);
  useEffect(() => {
    if (!summary?.finished) return;
    let live = true;
    try {
      if (!PgTutorial.isStarted(NEXT)) return;
    } catch {
      return;
    }
    PgTutorial.getMetadata(NEXT)
      .then((m) => live && !m.completed && setNextAt({ page: m.pageNumber }))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [summary?.finished]);

  const steps = getLessonPath(TUTORIAL)?.steps ?? [];
  const finished = !!summary?.finished;
  const started = !!summary && !finished && summary.passed.some(Boolean);
  const done = summary ? PgLessonSummary.proved(summary) : 0;

  const label = finished
    ? "Completed"
    : started
    ? "Pick up where you left off"
    : "Start here";
  const line = finished
    ? "Your program is on devnet, and its hello came back"
    : started && summary?.next
    ? `Next: ${summary.next}`
    : "Write, deploy and call your first Solana program";

  // Under the width the words need beside the mark, the mark moves to the
  // corner. Measured, since the styling here has no container queries
  const box = useRef<HTMLElement>(null);
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) =>
      setWide(e.contentRect.width >= WIDE_MIN)
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const open = async () => {
    // The banner's Start is the start: no second one on the About page
    startOnOpen(TUTORIAL);
    await PgTutorial.open(TUTORIAL);
    PgView.setModal(null);
  };

  const nextTutorial = PgTutorial.all.find((t) => t.name === NEXT);
  const next = finished ? nextTutorial : null;

  const nextBanner = (n: NonNullable<typeof nextTutorial>) => {
    const pages = n.pageCount;
    return (
      <Wrapper ref={box} aria-labelledby={titleId}>
        {/* The mark as a voxel sculpture on every size, the same cubes: beside
            the words on a wide banner, hung from the top right corner where
            the words run the full width */}
        <IsoVoxels corner={phone || !wide} />
        <Inner>
          <Words>
            <Label $fresh={!nextAt}>
              {nextAt ? "Pick up where you left off" : "Up next"}
            </Label>
            <Title id={titleId}>{tutorialTitle(n.name)}</Title>
            <Line>{n.description}</Line>
            {nextAt && pages ? (
              <Progress>
                <Meter aria-hidden>
                  <MeterFill
                    style={{ width: `${(nextAt.page / pages) * 100}%` }}
                  />
                </Meter>
                <Meta>
                  Page {nextAt.page} of {pages}
                </Meta>
              </Progress>
            ) : (
              <Meta>
                {[
                  pages && `${pages} pages`,
                  n.level,
                  n.framework,
                  n.authors[0] && `by ${n.authors[0].name}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </Meta>
            )}
            <Actions>
              <Go kind="primary" onClick={() => PgTutorial.open(n.name)}>
                {nextAt ? "Continue" : "Start"}
              </Go>
            </Actions>
          </Words>
        </Inner>
      </Wrapper>
    );
  };

  if (next) return nextBanner(next);

  return (
    <Wrapper ref={box} aria-labelledby={titleId}>
      {/* The same voxel mark as on every banner: one picture of the brand,
          whatever the banner says */}
      <IsoVoxels corner={phone || !wide} />
      <Inner>
        <Words>
          <Label $fresh={!started && !finished}>
            {finished && <Done aria-hidden>✓</Done>}
            {label}
          </Label>
          <Title id={titleId}>{TUTORIAL}</Title>
          <Line>{line}</Line>
          {started ? (
            <Progress>
              <Meter aria-hidden>
                <MeterFill
                  style={{ width: `${(done / steps.length) * 100}%` }}
                />
              </Meter>
              <Meta>
                {done} of {steps.length}
              </Meta>
            </Progress>
          ) : (
            !finished && (
              <Meta>
                10 min · {steps.length} steps · Beginner · Anchor · by acheron
              </Meta>
            )
          )}
          <Actions>
            <Go kind="primary" onClick={open}>
              {finished ? "Open again" : started ? "Continue" : "Start"}
            </Go>
          </Actions>
        </Words>
      </Inner>
    </Wrapper>
  );
};

export default StartHere;

const Wrapper = styled.section`
  ${({ theme }) => css`
    position: relative;
    isolation: isolate;
    overflow: hidden;
    margin-bottom: 1rem;
    /* The cards' own line: purple is for what is current, and a banner is
       not that */
    border: 1px solid ${theme.colors.default.border};
    border-radius: 16px;
    background: radial-gradient(
        120% 140% at 100% 0%,
        ${BRAND.purple}24,
        transparent 62%
      ),
      ${theme.colors.default.bgSecondary};
  `}
`;

const Inner = styled.div`
  position: relative;
  padding: 1.75rem;
`;

/* The words keep to where the mark has faded out, about the left 42% of a
   wide banner; on a phone the banner is narrower than this anyway */
const Words = styled.div`
  min-width: 0;
  max-width: 19rem;
`;

const Label = styled.p<{ $fresh: boolean }>`
  ${({ theme, $fresh }) => css`
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.8125rem;
    color: ${$fresh ? BRAND.periwinkle : theme.colors.default.textSecondary};
  `}
`;

const Done = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1rem;
  height: 1rem;
  border-radius: 999px;
  background: ${BRAND.green}26;
  color: ${BRAND.green};
  font-size: 0.625rem;
`;

const Title = styled.h2`
  ${({ theme }) => css`
    margin: 0.375rem 0 0;
    font-family: ${HEADLINE_FONT};
    font-size: 1.5rem;
    font-weight: 400;
    letter-spacing: -0.015em;
    color: ${theme.colors.default.textPrimary};
  `}
`;

const Line = styled.p`
  ${({ theme }) => css`
    margin: 0.5rem 0 0;
    max-width: 44ch;
    font-size: 0.9375rem;
    line-height: 1.35;
    /* No word left alone on the last line */
    text-wrap: balance;
    /* The lead, a step under the title and well over the caption below */
    color: ${theme.colors.default.textPrimary}c7;
  `}
`;

/* The caption: the cards' quieter grey (4.9:1), set apart from the lead by
   space as well as by size and colour */
const Meta = styled.p`
  ${({ theme }) => css`
    margin: 0.75rem 0 0;
    font-size: 0.75rem;
    font-weight: 380;
    line-height: 1rem;
    font-variant-numeric: tabular-nums;
    color: ${theme.colors.default.textSecondary}cc;
  `}
`;

const Progress = styled.div`
  margin-top: 0.75rem;
  max-width: 20rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;

  & > ${Meta} {
    margin: 0;
  }
`;

const Meter = styled.span`
  ${({ theme }) => css`
    flex: 1;
    height: 3px;
    border-radius: 2px;
    overflow: hidden;
    background: ${theme.colors.default.border};
  `}
`;

const MeterFill = styled.span`
  display: block;
  height: 100%;
  background: linear-gradient(90deg, ${BRAND.purple}, ${BRAND.green});
  transition: width 400ms cubic-bezier(0.2, 0, 0, 1);
`;

/* One row, one height: the outline button is drawn to the pill's height
   beside it, so the pair reads as a choice rather than two sizes of thing */
const Actions = styled.div`
  margin-top: 1.5rem;
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  gap: 0.5rem;
`;

/* The brand's pill with its word alone: the even padding the icon's side
   used to make up for */
/* The angle the beam stands at, registered so it can be animated: a plain
   custom property would jump from one end to the other */
try {
  // Typed by the DOM library this TypeScript ships without it
  (
    CSS as unknown as {
      registerProperty: (d: {
        name: string;
        syntax: string;
        inherits: boolean;
        initialValue: string;
      }) => void;
    }
  ).registerProperty({
    name: "--start-beam",
    syntax: "<angle>",
    inherits: false,
    initialValue: "0deg",
  });
} catch {
  // Registered already (a hot reload), or a browser without it: the beam
  // then stands still, and the ring still lights
}

/* The brand's pill with its word alone: the even padding the icon's side
   used to make up for. Under the pointer it does not fill: a beam of light
   runs once round the ring instead, the ring being the brand's mark of
   an action. Pressed, it fills as every brand action does */
const Go = styled(BrandPill)`
  && {
    padding: 0 1.25rem;
  }

  &&:hover:not(:disabled):not(:active)::before {
    opacity: 0;
  }

  &&::after {
    content: "";
    position: absolute;
    inset: -1px;
    padding: 1.5px;
    border-radius: inherit;
    background: conic-gradient(
      from var(--start-beam),
      transparent 0deg 230deg,
      ${BRAND.purple} 280deg,
      #ffffff 330deg,
      ${BRAND.green} 345deg,
      transparent 360deg
    );
    -webkit-mask: linear-gradient(#000 0 0) content-box,
      linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    opacity: 0;
    pointer-events: none;
  }

  /* One lap per hover, then the beam goes out rather than standing still as
     a stray highlight. 1.2s carries it round the pill's ~330px at about
     280px a second, slow enough for the eye to follow the ring, on the
     Styleguide's Ground curve */
  &&:hover:not(:disabled)::after,
  &&:focus-visible::after {
    animation: start-beam 1200ms cubic-bezier(0.45, 0, 0.2, 1) both;
  }

  @keyframes start-beam {
    from {
      --start-beam: 0deg;
      opacity: 1;
    }
    80% {
      opacity: 1;
    }
    to {
      --start-beam: 360deg;
      opacity: 0;
    }
  }

  /* Still, the ring fills under the pointer as the Styleguide has it */
  @media (prefers-reduced-motion: reduce) {
    &&::after {
      display: none;
    }
    &&:hover:not(:disabled):not(:active)::before {
      opacity: 1;
    }
  }
`;
