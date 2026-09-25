import { FC, useEffect, useRef } from "react";
import styled from "styled-components";

import { PATTERN_PITCH, PATTERN_RISE, patternImage } from "./tokens";

/**
 * The brand pattern, lit by the pointer.
 *
 * Two copies of one image. The first sits at rest — the slides' own strength,
 * a texture you notice rather than see. The second is the same pattern a
 * little brighter, seen only through a soft circle that follows the cursor, so
 * moving the mouse reads as a light passing over the grid rather than as a
 * spotlight laid on top of it. A faint halo goes with it, so the light has a
 * body and not only an edge.
 *
 * The light trails the pointer instead of sitting on it: each frame closes a
 * fraction of the distance, which is what makes it glide. It fades out when
 * the pointer leaves the window and in again where it comes back.
 *
 * Everything moves through two custom properties on the wrapper, set from one
 * animation frame loop that stops as soon as the light has caught up — no
 * React renders, and nothing running while the pointer is still.
 */

interface PatternProps {
  /** Strength at rest. The slides' own is 0.1. */
  rest?: number;
  /** Strength under the light */
  lit?: number;
  /**
   * How much of the black slide's rise the resting layer takes — none of it
   * (even across the frame, as on the colour slides) to all of it (gone by
   * the top). A number rather than a switch so the deck can move between the
   * two.
   */
  fade?: number;
  /**
   * A dimmer on the resting pattern only. The light is never dimmed with it:
   * on a ground where the pattern should barely be there at rest, the light
   * passing over it is the whole point.
   */
  strength?: number;
  /**
   * A mask of the page's own for the resting pattern, in place of the rise —
   * for a layout whose pattern falls away somewhere else. The light is never
   * masked by it.
   */
  restMask?: string;
  className?: string;
}

/* How much of the remaining distance the light closes each frame */
const FOLLOW = 0.14;

const Pattern: FC<PatternProps> = ({
  rest = 0.1,
  lit = 0.24,
  fade = 0,
  strength = 1,
  restMask,
  className,
}) => {
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const k = still ? 1 : FOLLOW;

    let x = 0;
    let y = 0;
    let tx = 0;
    let ty = 0;
    let on = 0;
    let tOn = 0;
    let seen = false;
    let frame = 0;

    const paint = () => {
      el.style.setProperty("--lx", `${x.toFixed(1)}px`);
      el.style.setProperty("--ly", `${y.toFixed(1)}px`);
      el.style.setProperty("--lon", on.toFixed(3));
    };

    const tick = () => {
      x += (tx - x) * k;
      y += (ty - y) * k;
      on += (tOn - on) * (still ? 1 : 0.1);
      paint();
      const moving =
        Math.abs(tx - x) + Math.abs(ty - y) > 0.4 || Math.abs(tOn - on) > 0.004;
      frame = moving ? requestAnimationFrame(tick) : 0;
    };
    const wake = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };

    const onMove = (ev: PointerEvent) => {
      const box = el.getBoundingClientRect();
      tx = ev.clientX - box.left;
      ty = ev.clientY - box.top;
      /* First sighting: start the light where the pointer is, rather than
         sweeping it in from the corner */
      if (!seen) {
        seen = true;
        x = tx;
        y = ty;
      }
      tOn = 1;
      wake();
    };
    const onLeave = (ev: PointerEvent) => {
      if (ev.relatedTarget) return;
      tOn = 0;
      wake();
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <Wrap ref={wrap} className={className} aria-hidden="true">
      {restMask ? (
        <Rest
          $alpha={rest}
          $rise={false}
          style={{ opacity: strength, WebkitMaskImage: restMask, maskImage: restMask }}
        />
      ) : (
        /* A mask cannot be half applied, so the rise is two resting layers —
           one masked, one even — and the balance between them */
        <>
          <Rest $alpha={rest} $rise style={{ opacity: fade * strength }} />
          <Rest $alpha={rest} $rise={false} style={{ opacity: (1 - fade) * strength }} />
        </>
      )}
      <Halo />
      <Lit $alpha={lit} />
    </Wrap>
  );
};

export default Pattern;

const Wrap = styled.div`
  ${PATTERN_PITCH}
  --lx: -999px;
  --ly: -999px;
  --lon: 0;
  --lr: clamp(14rem, 26vmax, 26rem);
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
`;

/* Placed as the slides place it: a line down the middle of a 1920 frame, and
   a row of tiles across the middle of its height */
const Layer = styled.div`
  position: absolute;
  inset: 0;
  background-size: var(--pp) var(--pp);
  background-position: calc(var(--pp) / 30) calc(var(--pp) * 31 / 60);
`;

const Rest = styled(Layer)<{ $alpha: number; $rise: boolean }>`
  background-image: ${({ $alpha }) => patternImage($alpha)};
  ${({ $rise }) => ($rise ? PATTERN_RISE : "")}
  transition: opacity 1400ms cubic-bezier(0.45, 0, 0.2, 1);

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

/* The pattern, brighter, through a circle that follows the pointer. Unmasked:
   the light is what reveals the grid, including where the resting layer has
   fallen away to nothing. */
const Lit = styled(Layer)<{ $alpha: number }>`
  background-image: ${({ $alpha }) => patternImage($alpha)};
  opacity: var(--lon);
  -webkit-mask-image: radial-gradient(
    circle var(--lr) at var(--lx) var(--ly),
    #000 0%,
    rgba(0, 0, 0, 0.5) 38%,
    transparent 100%
  );
  mask-image: radial-gradient(
    circle var(--lr) at var(--lx) var(--ly),
    #000 0%,
    rgba(0, 0, 0, 0.5) 38%,
    transparent 100%
  );
`;

const Halo = styled(Layer)`
  opacity: var(--lon);
  background: radial-gradient(
    circle calc(var(--lr) * 1.4) at var(--lx) var(--ly),
    rgba(255, 255, 255, 0.04) 0%,
    rgba(255, 255, 255, 0.012) 45%,
    rgba(255, 255, 255, 0) 100%
  );
`;
