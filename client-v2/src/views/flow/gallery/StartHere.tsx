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
import PlaygroundMarkNext from "../../../components/PlaygroundMarkNext";
import { PgTutorial, PgView } from "../../../utils";

const TUTORIAL = "Hello Anchor";
/** Where the banner points once Hello Anchor is done */
const NEXT = "Counter PDA Tutorial";

/* An id of the component's own for as long as it lives. React 17 has no
   useId, and two banners on a page must not share their SVG filter ids */
let ids = 0;
/** The banner's width, in px, from which the picture has its column */
const WIDE_MIN = 640;
const useOwnId = (prefix: string) => useState(() => `${prefix}${++ids}`)[0];

/* The steps' names in a few words each, so all four fit the picture's rows */
const SHORT: Record<string, string> = {
  "write-program": "Write the program",
  deploy: "Build & deploy to devnet",
  "call-client": "Call it from a client",
  "greet-by-name": "Give hello a name",
};

/**
 * The top of the tutorials list: the one a newcomer begins with, in three
 * states. Fresh it invites, started it picks up at the next step, finished
 * it says so. The picture is the tutorial as a small Playground window, its
 * four steps ticked as they pass, on a dithered field of Solana's purple
 * going to green. The phone keeps the words and a corner of the field.
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

  // Under the width the two columns need, the words keep the room and the
  // picture steps out. Measured, since the styling here has no container
  // queries
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
        <Inner $wide={false}>
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
      <Field layout={phone || !wide ? "corner" : "glow"} />
      <Inner $wide={wide}>
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
        {/* Finished, every row is a tick and the words already say so: the
            field alone carries the banner then */}
        {!phone && wide && !finished && (
          <Picture aria-hidden>
            <StepsArt
              steps={steps.map((s) => SHORT[s.id] ?? s.objective)}
              passed={summary?.passed ?? []}
              skipped={summary?.skipped ?? []}
              finished={finished}
            />
          </Picture>
        )}
      </Inner>
    </Wrapper>
  );
};

export default StartHere;

/**
 * The tutorial as a small Playground window: its four steps, ticked as they
 * pass, the next one lit. A light runs down the list once per page load, so
 * the eye follows all four; with reduced motion the list is simply there.
 */
let swept = false;
const StepsArt: FC<{
  steps: string[];
  passed: boolean[];
  skipped: boolean[];
  finished: boolean;
}> = ({ steps, passed, skipped, finished }) => {
  const rows = useRef<(HTMLSpanElement | null)[]>([]);
  useEffect(() => {
    if (swept) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const runs = rows.current.flatMap((row, i) =>
      row
        ? [
            row.animate(
              [{ opacity: 0 }, { opacity: 1, offset: 0.35 }, { opacity: 0 }],
              {
                duration: 700,
                delay: 450 + i * 140,
                easing: "cubic-bezier(0.2, 0, 0, 1)",
              }
            ),
          ]
        : []
    );
    // Spent only once the last row has run: a cancelled first mount (React's
    // dev mode mounts twice) must not use up the only one
    runs[runs.length - 1]?.finished.then(() => (swept = true)).catch(() => {});
    return () => runs.forEach((r) => r.cancel());
  }, []);

  const next = finished ? -1 : passed.findIndex((p) => !p);
  const at = next === -1 && !finished ? passed.length : next;

  return (
    <Window>
      {/* The tutorial's name is already the banner's title; the head says
          what the title does not, how far the steps have come */}
      <WindowHead>
        <PlaygroundMarkNext />
        {finished || passed.some(Boolean)
          ? `${passed.filter(Boolean).length} of ${steps.length} steps`
          : `${steps.length} steps`}
      </WindowHead>
      <Rows>
        {steps.map((name, i) => {
          const isSkipped = !!skipped[i];
          const isPassed = (finished || !!passed[i]) && !isSkipped;
          const current = i === at;
          return (
            <Row key={name} $current={current} $passed={isPassed}>
              <Sweep ref={(el) => void (rows.current[i] = el)} />
              <Dot $current={current} $passed={isPassed}>
                {isPassed ? "✓" : i + 1}
              </Dot>
              <RowName>
                {name}
                {/* Behind the learner but not proved: said, not ticked */}
                {isSkipped && <Skipped> · skipped</Skipped>}
              </RowName>
            </Row>
          );
        })}
      </Rows>
    </Window>
  );
};

/* ── the field ─────────────────────────────────────────────────────────── */

// Bayer's 4 by 4 matrix: a threshold per cell, so any grey becomes an even scatter
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const TILE = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 4' shape-rendering='crispEdges'>${BAYER.map(
    (v, i) =>
      `<rect x='${i % 4}' y='${Math.floor(
        i / 4
      )}' width='1' height='1' fill='rgb(${Math.round(
        ((v + 0.5) / 16) * 255
      )},0,0)'/>`
  ).join("")}</svg>`
)}`;
// One pixel of the dither in CSS pixels: reads as a pixel on a 1x screen too
const CELL = 3;
const LIGHT = {
  // Behind the steps' window: a soft glow, since a mark would only show in
  // scraps around the window's edges. Faded to nothing before the words
  glow: { cx: 0.86, cy: 0.5, r: 0.7, x1: 0.4, x2: 0.6 },
  // A phone's top right corner, gone before the words under it
  corner: { cx: 1, cy: 0, r: 0.75, x1: 0.62, x2: 0.97 },
};

/**
 * A field of light turned into square pixels by an ordered dither, coloured
 * in Solana's purple going to green. One inline SVG filter, no image to load.
 */
const Field: FC<{ layout: keyof typeof LIGHT }> = ({ layout }) => {
  const id = useOwnId("start-here-field-");
  const f = LIGHT[layout];
  const url = (name: string) => `url(#${id}${name})`;
  return (
    <FieldSvg aria-hidden>
      <defs>
        <radialGradient id={`${id}field`} cx={f.cx} cy={f.cy} r={f.r}>
          <stop offset="0" stopColor="rgb(235,0,0)" />
          <stop offset="0.5" stopColor="rgb(110,0,0)" />
          <stop offset="1" stopColor="rgb(0,0,0)" />
        </radialGradient>

        <linearGradient id={`${id}ink`} x1="0.4" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={BRAND.purple} />
          <stop offset="0.6" stopColor={BRAND.violet} />
          <stop offset="1" stopColor={BRAND.green} />
        </linearGradient>
        <linearGradient id={`${id}fade`} x1={f.x1} x2={f.x2} y1="0" y2="0">
          <stop offset="0" stopColor="#000" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </linearGradient>
        <filter
          id={`${id}dither`}
          x="0"
          y="0"
          width="100%"
          height="100%"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feImage
            href={TILE}
            x="0"
            y="0"
            width={CELL * 4}
            height={CELL * 4}
            preserveAspectRatio="none"
          />
          <feTile result="threshold" />
          <feComposite
            in="SourceGraphic"
            in2="threshold"
            operator="arithmetic"
            k2="16"
            k3="16"
            k4="-16"
          />
          <feComponentTransfer>
            <feFuncR type="discrete" tableValues="0 1" />
          </feComponentTransfer>
          <feColorMatrix values="1 0 0 0 0  1 0 0 0 0  1 0 0 0 0  0 0 0 0 1" />
        </filter>
        <mask
          id={`${id}pixels`}
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="100%"
          height="100%"
        >
          <g filter={url("dither")}>
            <rect width="100%" height="100%" fill={url("field")} />
            <rect width="100%" height="100%" fill={url("fade")} />
          </g>
        </mask>
      </defs>
      <rect
        width="100%"
        height="100%"
        fill={url("ink")}
        mask={url("pixels")}
        opacity="0.7"
      />
    </FieldSvg>
  );
};

/* ── styles ────────────────────────────────────────────────────────────── */

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

const FieldSvg = styled.svg`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
`;

const Inner = styled.div<{ $wide: boolean }>`
  position: relative;
  display: grid;
  /* Beside the steps' window the words sit at its middle, not its top */
  align-items: center;
  gap: 1.5rem 2rem;
  padding: 1.75rem;
  grid-template-columns: ${({ $wide }) =>
    $wide ? "minmax(16rem, 1fr) minmax(0, 21rem)" : "1fr"};
`;

const Words = styled.div`
  min-width: 0;
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

const Picture = styled.div`
  min-width: 0;
`;

/* Blurs the pixels behind it, so its words read on a calm ground */
const Window = styled.div`
  ${({ theme }) => css`
    border: 1px solid ${theme.colors.default.border};
    border-radius: 12px;
    background: ${theme.colors.default.bgPrimary}bf;
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
  `}
`;

/* The desktop head row's 44 px, which also holds the mark at the
   Styleguide's minimum of 24 px high */
const WindowHead = styled.div`
  ${({ theme }) => css`
    height: 2.75rem;
    display: flex;
    align-items: center;
    gap: 0.625rem;
    padding: 0 1rem;
    border-bottom: 1px solid ${theme.colors.default.border};
    font-size: 0.75rem;
    color: ${theme.colors.default.textSecondary};

    & > svg {
      height: 1.5rem;
      width: auto;
      flex-shrink: 0;
    }
  `}
`;

const Rows = styled.ol`
  margin: 0;
  padding: 0.5rem;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
`;

const Skipped = styled.span`
  ${({ theme }) => css`
    color: ${theme.colors.default.textSecondary};
  `}
`;

const Row = styled.li<{ $current: boolean; $passed: boolean }>`
  ${({ theme, $current, $passed }) => css`
    position: relative;
    height: 2.25rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0 0.5rem;
    border-radius: 8px;
    font-size: 0.8125rem;
    background: ${$current ? `${BRAND.purple}1f` : "transparent"};
    color: ${$current || $passed
      ? theme.colors.default.textPrimary
      : theme.colors.default.textSecondary};
  `}
`;

const Sweep = styled.span`
  position: absolute;
  inset: 0;
  border-radius: 8px;
  background: ${BRAND.purple}29;
  opacity: 0;
`;

const Dot = styled.span<{ $current: boolean; $passed: boolean }>`
  ${({ theme, $current, $passed }) => css`
    position: relative;
    flex-shrink: 0;
    width: 1.25rem;
    height: 1.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    font-size: 0.6875rem;
    font-variant-numeric: tabular-nums;
    ${$passed
      ? css`
          background: ${BRAND.green}26;
          color: ${BRAND.green};
        `
      : css`
          border: 1px solid
            ${$current ? BRAND.periwinkle : theme.colors.default.border};
          color: ${$current ? BRAND.periwinkle : "inherit"};
        `}
  `}
`;

const RowName = styled.span`
  position: relative;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;
