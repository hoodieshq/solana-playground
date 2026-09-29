import { CSSProperties, FC, Fragment } from "react";
import styled, { css, keyframes } from "styled-components";

import { Headline } from "./Headline";
import type { Bar, Gate, PlanItem, SlideSpec, Stop, Track } from "./slides";
import { BODY, GREEN, HEADLINE, INK, PAPER, PURPLE } from "./tokens";

/**
 * The roadmap, told in the proposal's voice.
 *
 * Every slide here is laid out on the proposal's own 1920 × 1080 frame, in
 * one unit of it held by whichever of width or height runs out first — the
 * rule the cards slide set — so a projector and a laptop show the same
 * composition. The heading is the deck's Headline, so its words pop in and,
 * where the next slide says the same word, travel there; under it there is
 * only type and hairlines. No boxes: the one filled shape is a sprint's bar.
 *
 * On a screen taller than it is wide the frame would shrink to a strip, so
 * there a slide becomes a column that scrolls, and a sprint board turns into
 * a list by sprint.
 */

const PLAN = [
  "row",
  "horizons",
  "tracks",
  "pairs",
  "goals",
  "ranked",
  "board",
] as const;
type PlanKind = typeof PLAN[number];
export type PlanSpec = Extract<SlideSpec, { kind: PlanKind }>;

export const isPlan = (slide: SlideSpec): slide is PlanSpec =>
  (PLAN as readonly string[]).includes(slide.kind);

/* Taller than wide: the frame gives way to a column */
const TALL = "(max-aspect-ratio: 1/1)";

/* In a column that scrolls, the wheel scrolls it. Everywhere else it goes on
   to the deck, where it turns the page. */
const keepScroll = (ev: React.WheelEvent<HTMLDivElement>) => {
  const el = ev.currentTarget;
  if (
    window.matchMedia(TALL).matches &&
    el.scrollHeight > el.clientHeight + 1
  ) {
    ev.stopPropagation();
  }
};

const Plan: FC<{ slide: PlanSpec; light: boolean }> = ({ slide, light }) => (
  <Sheet $light={light} onWheel={keepScroll}>
    {slide.kind === "tracks" ? (
      <Tracks tracks={slide.tracks} light={light} />
    ) : (
      <>
        <Head
          title={slide.title}
          note={slide.note}
          light={light}
          legend={slide.kind === "ranked"}
        />
        {slide.kind === "row" && (
          <RowOf items={slide.items} perRow={slide.perRow} />
        )}
        {slide.kind === "horizons" && <Horizons stops={slide.stops} />}
        {slide.kind === "pairs" && (
          <Pairs left={slide.left} right={slide.right} rows={slide.rows} />
        )}
        {slide.kind === "goals" && <Goals columns={slide.columns} />}
        {slide.kind === "ranked" && <Ranked groups={slide.groups} />}
        {slide.kind === "board" && (
          <Board
            sprints={slide.sprints}
            gates={slide.gates ?? []}
            lanes={slide.lanes}
          />
        )}
      </>
    )}
  </Sheet>
);

export default Plan;

/* ── pieces every slide shares ────────────────────────────────────────── */

/** A size in the frame's units that never drops below what can be read */
const size = (units: number, min: number) =>
  `max(${min}px, calc(${units} * var(--u)))`;

const EASE = "cubic-bezier(0.22, 0.61, 0.24, 1)";

const rise = keyframes`
  from { opacity: 0; transform: translate3d(0, calc(18 * var(--u)), 0); }
  to   { opacity: 1; transform: translate3d(0, 0, 0); }
`;

/* Everything under the heading arrives after it, one piece behind another */
const arrive = css`
  animation: ${rise} 620ms ${EASE} both;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;
const at = (step: number): CSSProperties => ({
  animationDelay: `${280 + Math.round(step * 70)}ms`,
});

const Head: FC<{
  title: string;
  note?: string;
  light: boolean;
  legend?: boolean;
}> = ({ title, note, light, legend }) => (
  <Top>
    <Headline
      lines={[title]}
      light={light}
      as="h2"
      size="calc(100 * var(--u))"
      leading={0.95}
    />
    {note && <Lede>{note}</Lede>}
    {legend && (
      <Legend>
        <Keyed>
          <Mark $track="brand" />
          Brand
        </Keyed>
        <Keyed>
          <Mark $track="product" />
          Product
        </Keyed>
      </Legend>
    )}
  </Top>
);

/* Brand is a dot and Product a square, so the two part on shape as well as
   on colour */
const Mark = styled.span<{ $track: Track }>`
  ${({ $track }) => css`
    flex: none;
    display: inline-block;
    width: ${size(13, 8)};
    height: ${size(13, 8)};
    border-radius: ${$track === "brand" ? "50%" : "22%"};
    background: ${$track === "brand" ? "var(--brand)" : "var(--product)"};
  `}
`;

const Sheet = styled.div<{ $light: boolean }>`
  ${({ $light }) => css`
    --u: min(calc(100vw / 1920), calc(100vh / 1080));
    --ink: ${$light ? INK : PAPER};
    --quiet: ${$light ? "rgba(0, 0, 0, 0.52)" : "rgba(255, 255, 255, 0.62)"};
    --rule: ${$light ? "rgba(0, 0, 0, 0.13)" : "rgba(255, 255, 255, 0.17)"};
    /* Solana's green is too pale to read on white, so the paper slides take
       a deeper one; its purple holds on both */
    --brand: ${$light ? "#00A36C" : GREEN};
    --product: ${$light ? PURPLE : "#AE7BFF"};
    /* The bars' tints, mixed in advance so they are solid: a sprint's line
       stops at a bar's edge instead of running through it */
    --bar-brand: ${$light ? "#DEF3EC" : "#153829"};
    --bar-product: ${$light ? "#F4EBFF" : "#372152"};

    position: absolute;
    left: 50%;
    top: 50%;
    z-index: 1;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    width: calc(1920 * var(--u));
    height: calc(1080 * var(--u));
    padding: calc(104 * var(--u)) calc(128 * var(--u)) 0;
    transform: translate(-50%, -50%);
    color: var(--ink);
    font-family: ${BODY};
    text-align: left;

    @media ${TALL} {
      --u: calc(100vw / 680);
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      padding: 72px 24px 112px;
      transform: none;
      overflow-y: auto;
      touch-action: pan-y;
    }
  `}
`;

const Top = styled.header`
  position: relative;
  flex: none;
`;

const Lede = styled.p`
  margin: calc(26 * var(--u)) 0 0;
  max-width: calc(1180 * var(--u));
  font-size: ${size(28, 15)};
  font-weight: 300;
  line-height: 1.4;
  color: var(--quiet);
  ${arrive}
  animation-delay: 240ms;
`;

const Legend = styled.div`
  position: absolute;
  right: 0;
  top: calc(30 * var(--u));
  display: flex;
  gap: calc(32 * var(--u));
  font-size: ${size(21, 13)};
  font-weight: 300;
  color: var(--quiet);
  ${arrive}
  animation-delay: 320ms;

  @media ${TALL} {
    position: static;
    margin-top: 16px;
  }
`;

const Keyed = styled.span`
  display: inline-flex;
  align-items: center;
  gap: calc(12 * var(--u));
`;

/* A name set in the deck's face, and the grey line under it */
const Name = styled.div`
  font-family: ${HEADLINE};
  font-weight: 400;
  letter-spacing: -0.01em;
  line-height: 1.05;
`;

const Quiet = styled.div`
  font-weight: 300;
  line-height: 1.45;
  color: var(--quiet);
`;

/* ── a few things side by side ────────────────────────────────────────── */

const RowOf: FC<{ items: PlanItem[]; perRow?: number }> = ({
  items,
  perRow,
}) => (
  <Row
    $wrap={!!perRow}
    style={{ "--n": perRow ?? items.length } as CSSProperties}
  >
    {items.map((item, i) => (
      <RowItem key={item.name} style={at(perRow ? i * 0.5 : i)}>
        <RowName $small={!!perRow}>{item.name}</RowName>
        {item.note && <RowNote>{item.note}</RowNote>}
      </RowItem>
    ))}
  </Row>
);

/* Low on the frame, under the heading's weight, so the slide reads as one
   statement and its evidence. Rows that wrap start under the heading
   instead, since they fill the frame. */
const Row = styled.div<{ $wrap: boolean }>`
  ${({ $wrap }) => css`
    display: grid;
    grid-template-columns: repeat(var(--n), minmax(0, 1fr));
    gap: calc(${$wrap ? 36 : 48} * var(--u)) calc(48 * var(--u));
    margin: ${$wrap
      ? "calc(64 * var(--u)) 0 0"
      : "auto 0 calc(200 * var(--u))"};

    @media ${TALL} {
      grid-template-columns: 1fr;
      gap: 0;
      margin: 40px 0 0;
    }
  `}
`;

const RowItem = styled.div`
  padding-top: calc(28 * var(--u));
  border-top: 1px solid var(--rule);
  ${arrive}

  @media ${TALL} {
    padding: 18px 0;
  }
`;

const RowName = styled(Name)<{ $small: boolean }>`
  font-size: ${({ $small }) => ($small ? size(31, 19) : size(40, 22))};
`;

const RowNote = styled(Quiet)`
  margin-top: calc(14 * var(--u));
  font-size: ${size(22, 14)};
`;

/* ── the plan's stops along one line ──────────────────────────────────── */

const Horizons: FC<{ stops: Stop[] }> = ({ stops }) => (
  <Stops style={{ "--n": stops.length } as CSSProperties}>
    {stops.map((stop, i) => (
      <StopBox key={stop.name} style={at(i)}>
        <StopDate>{stop.date}</StopDate>
        <StopTrack $first={i === 0} $last={i === stops.length - 1}>
          <Dot $key={!!stop.key} />
        </StopTrack>
        <StopName>{stop.name}</StopName>
        <StopNote>{stop.note}</StopNote>
      </StopBox>
    ))}
  </Stops>
);

const Stops = styled.div`
  display: grid;
  grid-template-columns: repeat(var(--n), minmax(0, 1fr));
  margin: auto calc(-24 * var(--u)) calc(260 * var(--u));

  @media ${TALL} {
    grid-template-columns: 1fr;
    margin: 40px 0 0;
  }
`;

const StopBox = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 calc(24 * var(--u));
  text-align: center;
  ${arrive}

  @media ${TALL} {
    align-items: flex-start;
    padding: 18px 0;
    text-align: left;
    border-top: 1px solid var(--rule);
  }
`;

const StopDate = styled(Name)`
  font-size: ${size(52, 26)};
`;

/* The line runs from the first stop's dot to the last one's: each column
   draws its share, and the two ends stop at their dots */
const StopTrack = styled.div<{ $first: boolean; $last: boolean }>`
  ${({ $first, $last }) => css`
    position: relative;
    align-self: stretch;
    display: flex;
    align-items: center;
    justify-content: center;
    height: calc(30 * var(--u));
    margin: calc(26 * var(--u)) calc(-24 * var(--u)) 0;

    &::before {
      content: "";
      position: absolute;
      top: 50%;
      left: ${$first ? "50%" : "0"};
      right: ${$last ? "50%" : "0"};
      height: 1px;
      background: var(--quiet);
      opacity: 0.55;
    }

    @media ${TALL} {
      display: none;
    }
  `}
`;

const Dot = styled.span<{ $key: boolean }>`
  ${({ $key }) => css`
    position: relative;
    width: ${$key ? "calc(28 * var(--u))" : "calc(14 * var(--u))"};
    height: ${$key ? "calc(28 * var(--u))" : "calc(14 * var(--u))"};
    border-radius: 50%;
    background: ${$key
      ? `linear-gradient(135deg, ${GREEN}, ${PURPLE})`
      : "var(--ink)"};
    box-shadow: ${$key
      ? "0 0 0 calc(10 * var(--u)) rgba(153, 69, 255, 0.12)"
      : "none"};
  `}
`;

const StopName = styled(Name)`
  margin-top: calc(26 * var(--u));
  font-size: ${size(36, 20)};

  @media ${TALL} {
    margin-top: 6px;
  }
`;

const StopNote = styled(Quiet)`
  max-width: calc(340 * var(--u));
  margin-top: calc(12 * var(--u));
  font-size: ${size(21, 14)};

  @media ${TALL} {
    max-width: none;
  }
`;

/* ── the two tracks ───────────────────────────────────────────────────── */

const Tracks: FC<{
  tracks: Extract<SlideSpec, { kind: "tracks" }>["tracks"];
  light: boolean;
}> = ({ tracks, light }) => (
  <TrackGrid>
    {tracks.map((t, i) => (
      <div key={t.name}>
        <Headline
          lines={[t.name]}
          light={light}
          as="h2"
          size="calc(150 * var(--u))"
          leading={0.92}
        />
        <TrackLine style={at(i)}>
          <Mark $track={t.track} />
          {t.line}
        </TrackLine>
        <TrackList>
          {t.items.map((item, j) => (
            <li key={item} style={at(1 + i * 0.5 + j * 0.6)}>
              {item}
            </li>
          ))}
        </TrackList>
      </div>
    ))}
  </TrackGrid>
);

const TrackGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: calc(160 * var(--u));
  margin: auto 0 calc(104 * var(--u));

  @media ${TALL} {
    grid-template-columns: 1fr;
    gap: 48px;
    margin: 0;
  }
`;

const TrackLine = styled.div`
  display: flex;
  align-items: center;
  gap: calc(14 * var(--u));
  margin-top: calc(24 * var(--u));
  font-size: ${size(30, 16)};
  font-weight: 300;
  color: var(--quiet);
  ${arrive}
`;

const TrackList = styled.ul`
  margin: calc(56 * var(--u)) 0 0;
  padding: 0;
  list-style: none;

  & > li {
    padding: calc(20 * var(--u)) 0;
    border-top: 1px solid var(--rule);
    font-size: ${size(28, 16)};
    line-height: 1.3;
    ${arrive}
  }

  & > li:last-child {
    border-bottom: 1px solid var(--rule);
  }
`;

/* ── two columns read across ──────────────────────────────────────────── */

const Pairs: FC<{
  left: string;
  right: string;
  rows: Array<{ a: string; b: string }>;
}> = ({ left, right, rows }) => (
  <PairTable>
    <PairHead style={at(0)}>
      <span>{left}</span>
      <span />
      <span>{right}</span>
    </PairHead>
    {rows.map((row, i) => (
      <PairRow key={row.a} style={at(0.6 + i * 0.6)}>
        <PairA>{row.a}</PairA>
        <Arrow aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h13M12.5 5.5 19 12l-6.5 6.5" />
          </svg>
        </Arrow>
        <PairB>{row.b}</PairB>
      </PairRow>
    ))}
  </PairTable>
);

const PairTable = styled.div`
  margin-top: calc(80 * var(--u));

  @media ${TALL} {
    margin-top: 36px;
  }
`;

const pairColumns = css`
  display: grid;
  grid-template-columns: minmax(0, 1fr) calc(88 * var(--u)) minmax(0, 1fr);
  align-items: baseline;

  @media ${TALL} {
    grid-template-columns: 1fr;
  }
`;

const PairHead = styled.div`
  ${pairColumns}
  padding-bottom: calc(16 * var(--u));
  font-size: ${size(21, 13)};
  font-weight: 300;
  color: var(--quiet);
  ${arrive}

  @media ${TALL} {
    display: none;
  }
`;

const PairRow = styled.div`
  ${pairColumns}
  padding: calc(20 * var(--u)) 0;
  border-top: 1px solid var(--rule);
  font-size: ${size(26, 15)};
  line-height: 1.35;
  ${arrive}

  &:last-child {
    border-bottom: 1px solid var(--rule);
  }
`;

const PairA = styled.div`
  font-weight: 400;
`;

const PairB = styled.div`
  font-weight: 300;
  color: var(--quiet);

  @media ${TALL} {
    margin-top: 6px;
  }
`;

const Arrow = styled.span`
  align-self: center;
  justify-self: center;
  display: flex;
  width: calc(24 * var(--u));
  height: calc(24 * var(--u));
  color: var(--quiet);

  & > svg {
    width: 100%;
    height: 100%;
  }

  @media ${TALL} {
    display: none;
  }
`;

/* ── work in columns ──────────────────────────────────────────────────── */

const Goals: FC<{
  columns: Array<{ track?: Track; name?: string; items: PlanItem[] }>;
}> = ({ columns }) => (
  <GoalGrid
    $single={columns.length === 1}
    style={{ "--n": columns.length } as CSSProperties}
  >
    {columns.map((col, c) => (
      <div key={col.name ?? c}>
        {col.name && (
          <ColName style={at(c * 0.5)}>
            {col.track && <Mark $track={col.track} />}
            {col.name}
          </ColName>
        )}
        {col.items.map((item, i) => (
          <GoalItem key={item.name} style={at(0.5 + c * 0.5 + i * 0.6)}>
            <GoalName>{item.name}</GoalName>
            {item.note && <GoalNote>{item.note}</GoalNote>}
          </GoalItem>
        ))}
      </div>
    ))}
  </GoalGrid>
);

const GoalGrid = styled.div<{ $single: boolean }>`
  ${({ $single }) => css`
    display: grid;
    grid-template-columns: repeat(var(--n), minmax(0, 1fr));
    gap: calc(128 * var(--u));
    max-width: ${$single ? "calc(1180 * var(--u))" : "none"};
    margin-top: calc(${$single ? 72 : 80} * var(--u));

    @media ${TALL} {
      grid-template-columns: 1fr;
      gap: 40px;
      max-width: none;
      margin-top: 36px;
    }
  `}
`;

const ColName = styled(Name)`
  display: flex;
  align-items: center;
  gap: calc(14 * var(--u));
  margin-bottom: calc(22 * var(--u));
  font-size: ${size(34, 19)};
  ${arrive}
`;

const GoalItem = styled.div`
  padding: calc(18 * var(--u)) 0 calc(20 * var(--u));
  border-top: 1px solid var(--rule);
  ${arrive}

  &:last-child {
    border-bottom: 1px solid var(--rule);
  }
`;

const GoalName = styled.div`
  font-size: ${size(30, 16)};
  line-height: 1.25;
`;

const GoalNote = styled(Quiet)`
  margin-top: calc(6 * var(--u));
  font-size: ${size(22, 14)};
`;

/* ── MoSCoW groups, each in RICE order ────────────────────────────────── */

const Ranked: FC<{
  groups: Extract<SlideSpec, { kind: "ranked" }>["groups"];
}> = ({ groups }) => (
  <RankGrid style={{ "--n": groups.length } as CSSProperties}>
    {groups.map((group, g) => (
      <div key={group.name}>
        <RankHead style={at(g * 0.6)}>
          <span>{group.name}</span>
          <RankCount>{group.items.length}</RankCount>
        </RankHead>
        {group.items.map((item, i) => (
          <RankRow key={item.name} style={at(0.6 + g * 0.6 + i * 0.35)}>
            <Mark $track={item.track} />
            <RankName>{item.name}</RankName>
            <Score>{item.score}</Score>
          </RankRow>
        ))}
      </div>
    ))}
  </RankGrid>
);

const RankGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(var(--n), minmax(0, 1fr));
  gap: calc(56 * var(--u));
  margin-top: calc(56 * var(--u));

  @media ${TALL} {
    grid-template-columns: 1fr;
    gap: 36px;
    margin-top: 32px;
  }
`;

const RankHead = styled(Name)`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding-bottom: calc(14 * var(--u));
  font-size: ${size(40, 21)};
  ${arrive}
`;

const RankCount = styled.span`
  font-family: ${BODY};
  font-size: ${size(21, 13)};
  font-weight: 300;
  color: var(--quiet);
`;

const RankRow = styled.div`
  display: flex;
  align-items: center;
  gap: calc(12 * var(--u));
  min-height: calc(35 * var(--u));
  border-top: 1px solid var(--rule);
  font-size: ${size(19, 14)};
  ${arrive}

  &:last-child {
    border-bottom: 1px solid var(--rule);
  }

  @media ${TALL} {
    min-height: 40px;
  }
`;

const RankName = styled.span`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const Score = styled.span`
  font-family: ${HEADLINE};
  font-variant-numeric: tabular-nums;
`;

/* ── two-week sprints ─────────────────────────────────────────────────── */

/** Where a sprint position sits across the board, as a share of its width */
const across = (sprint: number) => `calc(${sprint} / var(--cols) * 100%)`;

const Board: FC<{
  sprints: Array<{ name: string; date: string }>;
  gates: Gate[];
  lanes: Array<{ track: Track; name: string; rows: Bar[][] }>;
}> = ({ sprints, gates, lanes }) => {
  let n = 0;
  return (
    <>
      <Wide style={{ "--cols": sprints.length } as CSSProperties}>
        <GateRow>
          {gates.map((gate) => (
            <GateLabel
              key={gate.name}
              $before={!gate.to}
              style={{
                ...(gate.to
                  ? { left: across(gate.to) }
                  : { right: `calc(100% - ${across(gate.at)})` }),
                ...at(0),
              }}
            >
              <GateName $accent={!!gate.accent}>{gate.name}</GateName>
              <GateNote>{gate.note}</GateNote>
            </GateLabel>
          ))}
        </GateRow>
        <SprintRow>
          {sprints.map((sprint, i) => {
            /* A band that opens a sprint takes the head of its column, so
               that sprint's name steps out from under it */
            const band = gates.find((g) => g.to && g.at === i);
            return (
              <SprintHead
                key={sprint.name}
                style={{
                  ...at(i * 0.25),
                  ...(band?.to && {
                    paddingLeft: `calc(${(band.to - band.at) * 100}% + 12 * var(--u))`,
                  }),
                }}
              >
                <SprintName>{sprint.name}</SprintName>
                <SprintDate>{sprint.date}</SprintDate>
              </SprintHead>
            );
          })}
        </SprintRow>
        <Lanes>
          {sprints.map((sprint, i) => (
            <Column key={sprint.name} style={{ left: across(i) }} />
          ))}
          {gates.map((gate) =>
            gate.to ? (
              <Band
                key={gate.name}
                style={{
                  left: across(gate.at),
                  width: `calc(${gate.to - gate.at} / var(--cols) * 100%)`,
                }}
              />
            ) : (
              <Freeze key={gate.name} style={{ left: across(gate.at) }} />
            )
          )}
          {lanes.map((lane) => (
            <Fragment key={lane.name}>
              <LaneName>
                <Mark $track={lane.track} />
                {lane.name}
              </LaneName>
              {lane.rows.map((row, r) => (
                <BarRow key={r}>
                  {row.map((bar) => (
                    <BarBox
                      key={bar.name}
                      $track={lane.track}
                      style={{
                        left: `calc(${across(bar.from)} + 4px)`,
                        width: `calc(${bar.to - bar.from} / var(--cols) * 100% - 8px)`,
                        ...at(0.6 + n++ * 0.18),
                      }}
                    >
                      <span>{bar.name}</span>
                    </BarBox>
                  ))}
                </BarRow>
              ))}
            </Fragment>
          ))}
        </Lanes>
      </Wide>

      {/* The same board read down, a sprint at a time, where it cannot be
          read across */}
      <BySprint>
        {sprints.map((sprint, i) => {
          const gate = gates.find((g) => g.to && g.at >= i && g.at < i + 1);
          return (
            <Fragment key={sprint.name}>
              {gate && (
                <SprintGate>
                  <GateName $accent>{gate.name}</GateName>
                  <GateNote>{gate.note}</GateNote>
                </SprintGate>
              )}
              <SprintBlock>
                <div>
                  <SprintName>{sprint.name}</SprintName>
                  <SprintDate>{sprint.date}</SprintDate>
                </div>
                {lanes.map((lane) => {
                  const here = lane.rows
                    .flat()
                    .filter((bar) => bar.from < i + 1 && bar.to > i);
                  return here.length ? (
                    <SprintLane key={lane.name}>
                      <Mark $track={lane.track} />
                      <span>{here.map((bar) => bar.name).join(", ")}</span>
                    </SprintLane>
                  ) : null;
                })}
              </SprintBlock>
            </Fragment>
          );
        })}
      </BySprint>
    </>
  );
};

const Wide = styled.div`
  position: relative;
  margin-top: calc(28 * var(--u));

  @media ${TALL} {
    display: none;
  }
`;

const GateRow = styled.div`
  position: relative;
  height: calc(66 * var(--u));
`;

/* A freeze reads leftward from its line, the event rightward from its band,
   so the two never meet. Placed by an edge, not a transform: the entrance
   animation owns the transform. */
const GateLabel = styled.div<{ $before: boolean }>`
  ${({ $before }) => css`
    position: absolute;
    bottom: calc(10 * var(--u));
    ${$before
      ? css`
          padding-right: calc(14 * var(--u));
          text-align: right;
        `
      : css`
          padding-left: calc(14 * var(--u));
        `}
    white-space: nowrap;
    ${arrive}
  `}
`;

const GateName = styled(Name)<{ $accent: boolean }>`
  display: inline;
  font-size: ${size(24, 15)};
  ${({ $accent }) =>
    $accent &&
    css`
      background: linear-gradient(90deg, #00a36c, ${PURPLE});
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    `}
`;

const GateNote = styled.span`
  margin-left: calc(10 * var(--u));
  font-size: ${size(19, 13)};
  font-weight: 300;
  color: var(--quiet);
`;

const SprintRow = styled.div`
  display: grid;
  grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
`;

/* A fixed height, so the lines that run up through it know where it starts */
const SprintHead = styled.div`
  box-sizing: border-box;
  height: calc(58 * var(--u));
  padding: calc(16 * var(--u)) calc(12 * var(--u)) 0;
  white-space: nowrap;
  ${arrive}
`;

const SprintName = styled(Name)`
  display: inline;
  font-size: ${size(28, 17)};
`;

const SprintDate = styled.span`
  margin-left: calc(10 * var(--u));
  font-size: ${size(18, 13)};
  font-weight: 300;
  color: var(--quiet);
`;

const Lanes = styled.div`
  position: relative;
  border-top: 1px solid var(--quiet);
`;

/* The sprint's own line, from its name down through both tracks */
const Column = styled.span`
  position: absolute;
  top: calc(-58 * var(--u));
  bottom: 0;
  width: 1px;
  background: var(--rule);
`;

/* The gates run the full height, from beside their labels to the floor */
const Band = styled.span`
  position: absolute;
  top: calc(-124 * var(--u));
  bottom: 0;
  background: linear-gradient(180deg, ${GREEN}, ${PURPLE});
  opacity: 0.4;
  border-radius: calc(6 * var(--u));
`;

const Freeze = styled.span`
  position: absolute;
  top: calc(-124 * var(--u));
  bottom: 0;
  border-left: 1px dashed var(--quiet);
`;

const LaneName = styled(Name)`
  display: flex;
  align-items: center;
  gap: calc(12 * var(--u));
  height: calc(52 * var(--u));
  padding-left: calc(12 * var(--u));
  font-size: ${size(26, 15)};
`;

const BarRow = styled.div`
  position: relative;
  height: calc(62 * var(--u));
`;

const BarBox = styled.div<{ $track: Track }>`
  ${({ $track }) => css`
    position: absolute;
    top: calc(5 * var(--u));
    box-sizing: border-box;
    display: flex;
    align-items: center;
    height: calc(52 * var(--u));
    padding: 0 calc(14 * var(--u));
    border-radius: calc(14 * var(--u));
    background: var(${$track === "brand" ? "--bar-brand" : "--bar-product"});
    font-size: ${size(17, 12)};
    line-height: 1.15;
    ${arrive}

    & > span {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
  `}
`;

const BySprint = styled.div`
  display: none;

  @media ${TALL} {
    display: block;
    margin-top: 32px;
  }
`;

const SprintBlock = styled.div`
  padding: 16px 0;
  border-top: 1px solid var(--rule);
`;

const SprintLane = styled.div`
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-top: 8px;
  font-size: 15px;
  line-height: 1.4;

  & > span:first-child {
    transform: translateY(-1px);
  }
`;

const SprintGate = styled.div`
  padding: 14px 0;
  border-top: 2px solid ${PURPLE};
`;
