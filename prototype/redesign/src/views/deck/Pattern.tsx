import { FC, useEffect, useRef } from "react";
import styled from "styled-components";

import { PATTERN_FADE, PATTERN_PITCH, patternImage } from "./tokens";

/**
 * The brand pattern, lit by the pointer.
 *
 * Two copies of one image. The first sits at rest — the asset's own strength,
 * fading out towards the left the way the asset fades. The second is the same
 * pattern much brighter, seen only through a soft circle that follows the
 * cursor, so moving the mouse reads as a light passing over the grid rather
 * than as a spotlight laid on top of it. A faint halo goes with it, so the
 * light has a body and not only an edge.
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
  /** Strength at rest. The asset's own is 0.2. */
  rest?: number;
  /** Strength under the light */
  lit?: number;
  /**
   * How much of the asset's right-to-left fade the resting layer takes, from
   * none to all of it. A number rather than a switch so the deck can move
   * between slides that fade it and slides that do not.
   */
  fade?: number;
  /**
   * A dimmer on the resting pattern only. The light is never dimmed with it:
   * on a ground where the pattern should barely be there at rest, the light
   * passing over it is the whole point.
   */
  strength?: number;
  /**
   * A mask of the page's own for the resting pattern, in place of the asset's
   * fade — for a layout whose pattern falls away somewhere other than to the
   * left. The light is never masked by it.
   */
  restMask?: string;
  className?: string;
}

/* How much of the remaining distance the light closes each frame */
const FOLLOW = 0.14;

const Pattern: FC<PatternProps> = ({
  rest = 0.2,
  lit = 0.62,
  fade = 1,
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
          $fade={false}
          style={{ opacity: strength, WebkitMaskImage: restMask, maskImage: restMask }}
        />
      ) : (
        /* A mask cannot be half applied, so the fade is two resting layers —
           one faded, one even — and the balance between them */
        <>
          <Rest $alpha={rest} $fade style={{ opacity: fade * strength }} />
          <Rest $alpha={rest} $fade={false} style={{ opacity: (1 - fade) * strength }} />
        </>
      )}
      <Halo />
      <Lit $alpha={lit} />
    </Wrap>
  );
};

export default Pattern;

const Wrap = styled.div`
  --lx: -999px;
  --ly: -999px;
  --lon: 0;
  --lr: clamp(14rem, 26vmax, 26rem);
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
`;

const Layer = styled.div`
  position: absolute;
  inset: 0;
  background-size: ${PATTERN_PITCH} ${PATTERN_PITCH};
`;

const Rest = styled(Layer)<{ $alpha: number; $fade: boolean }>`
  background-image: ${({ $alpha }) => patternImage($alpha)};
  ${({ $fade }) => ($fade ? PATTERN_FADE : "")}
  transition: opacity 1400ms cubic-bezier(0.45, 0, 0.2, 1);

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

/* The pattern, brighter, through a circle that follows the pointer. Unfaded:
   the light is what reveals the grid, including on the side where the resting
   layer has faded to nothing. */
const Lit = styled(Layer)<{ $alpha: number }>`
  background-image: ${({ $alpha }) => patternImage($alpha)};
  opacity: var(--lon);
  -webkit-mask-image: radial-gradient(
    circle var(--lr) at var(--lx) var(--ly),
    #000 0%,
    rgba(0, 0, 0, 0.55) 38%,
    transparent 100%
  );
  mask-image: radial-gradient(
    circle var(--lr) at var(--lx) var(--ly),
    #000 0%,
    rgba(0, 0, 0, 0.55) 38%,
    transparent 100%
  );
`;

const Halo = styled(Layer)`
  opacity: var(--lon);
  background: radial-gradient(
    circle calc(var(--lr) * 1.4) at var(--lx) var(--ly),
    rgba(255, 255, 255, 0.075) 0%,
    rgba(255, 255, 255, 0.025) 45%,
    rgba(255, 255, 255, 0) 100%
  );
`;
