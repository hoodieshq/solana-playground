import type { FC } from "react";
import styled from "styled-components";

import { BEDS, FIELDS } from "../../deck/Atmosphere";
import type { Ground } from "../../deck/Atmosphere";
import { patternImage } from "../../deck/tokens";
import { MARK_PATH } from "../../../components/PlaygroundMarkNext";

type Colour = Exclude<Ground, "paper" | "ink">;

/* One ground per framework, from the Styleguide's four: what a card is built
   with reads before its title does */
const GROUND_BY_FRAMEWORK: Record<string, Colour> = {
  Anchor: "deep",
  Native: "explore",
  Seahorse: "violet",
};

/* Crops of the mark, as on the Styleguide's row of brand tiles: the whole
   ▷O small in the middle, or the play triangle alone, centred, low on the
   right, or large and cut by the edge. Each is a viewBox into the mark's own
   970 × 574 box, in a thumbnail's 4:3, and `play` keeps the triangle only. */
const CROPS: { box: string; play: boolean }[] = [
  { box: "-415 -388 1800 1350", play: false },
  { box: "-395 -163 1000 750", play: true },
  { box: "-560 -300 1000 750", play: true },
  { box: "-40 -60 560 420", play: true },
];

/** Where the triangle ends and the O begins, in the mark's box */
const PLAY_WIDTH = 418;

/** A small stable number from the name, so a cover never changes on reload */
const hash = (s: string) =>
  [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

interface TutorialCoverProps {
  name: string;
  framework?: string;
  className?: string;
}

/**
 * A tutorial's cover in the brand, in place of upstream's art (a black square
 * with the name set in it).
 *
 * Built the way Nikita's Styleguide builds a brand tile: one of the four
 * grounds, the pattern over it at the slides' strength, and the mark in white
 * cropped large, so a wall of them reads as one family and each still differs.
 * The ground says the framework; the crop comes from the name. Decorative: the
 * card's own text names the tutorial.
 */
const TutorialCover: FC<TutorialCoverProps> = ({
  name,
  framework,
  className,
}) => {
  const ground = GROUND_BY_FRAMEWORK[framework ?? ""] ?? "haze";
  const crop = CROPS[hash(name) % CROPS.length];
  return (
    <Tile
      className={className}
      aria-hidden="true"
      style={{ backgroundColor: BEDS[ground] }}
    >
      {/* The ground's seven fields, held still: the deck's StillMesh
          without its breathing, which a wall of covers would turn to noise */}
      {FIELDS[ground].map((f, i) => (
        <Field
          key={i}
          style={{
            color: f.c,
            opacity: f.o ?? 0.94,
            left: `${f.x}%`,
            top: `${f.y}%`,
            transform: `translate(-50%, -50%) scale(${f.s})`,
          }}
        />
      ))}
      <Pattern />
      <Glyph viewBox={crop.box} preserveAspectRatio="xMidYMid slice">
        {crop.play ? (
          <svg x="0" y="-20" width={PLAY_WIDTH} height="620" overflow="hidden">
            <path d={MARK_PATH} fill="currentColor" transform="translate(0 20)" />
          </svg>
        ) : (
          <path d={MARK_PATH} fill="currentColor" />
        )}
      </Glyph>
    </Tile>
  );
};

export default TutorialCover;

const Tile = styled.span`
  position: relative;
  display: block;
  overflow: hidden;
  flex-shrink: 0;
  color: #fff;
`;

const Field = styled.span`
  position: absolute;
  width: 100%;
  aspect-ratio: 1;
  border-radius: 50%;
  background: radial-gradient(
    closest-side,
    currentColor 0%,
    color-mix(in srgb, currentColor 72%, transparent) 30%,
    color-mix(in srgb, currentColor 34%, transparent) 60%,
    color-mix(in srgb, currentColor 10%, transparent) 82%,
    transparent 100%
  );
`;

/* The slides' 0.1 white mortar, at a pitch a thumbnail can still draw */
const Pattern = styled.span`
  position: absolute;
  inset: 0;
  background-image: ${patternImage(0.14)};
  background-size: 12px 12px;
`;

const Glyph = styled.svg`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 1px 6px rgba(20, 10, 60, 0.25));
`;
