import { FC, useEffect, useRef } from "react";

/**
 * A grid of cubes rippling away from a point, drawn while the call to action
 * is hovered.
 *
 * After franky-adl/3d-wave-grid, which is a 40×40 cube grid displaced by a
 * GLSL wave in Three.js. This is the same picture reached another way: the
 * grid is projected by hand and each cube's top face is drawn as a filled
 * quad on a 2D canvas. Three.js, GSAP and a shader pipeline for one hover
 * state would be about 600 KB of dependency to move a thousand quads —
 * arithmetic a 2D context does comfortably.
 *
 * What is kept from the original: a square grid, height from a radial sine
 * that decays with distance, and a ripple that answers the pointer. What is
 * dropped: real cubes with three lit faces. At this scale and opacity the top
 * face alone reads as a cube field, and the sides would only add fill.
 */

interface WaveGridProps {
  /** Whether the effect is showing; it eases in and out rather than cutting */
  active: boolean;
  /**
   * Where the ripple starts, in fractions of the canvas box. Defaults to the
   * middle; the landing passes the button's centre.
   */
  originX?: number;
  originY?: number;
}

const COLS = 44;
const ROWS = 30;
/** How far the wave reaches before it dies out */
const DECAY = 1.5;
/** Rings per unit of distance */
const WAVES = 7;
const SPEED = 2.4;
/** Camera */
const TILT = 0.88;
const DIST = 2.65;
const FOCAL = 1.5;

const WaveGrid: FC<WaveGridProps> = ({
  active,
  originX = 0.5,
  originY = 0.5,
}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  /* Read inside the loop rather than closed over, so a change of target does
     not restart the animation. */
  const target = useRef(active);
  const origin = useRef({ x: originX, y: originY });
  target.current = active;
  origin.current = { x: originX, y: originY };

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let width = 0;
    let height = 0;
    let frame = 0;
    let intensity = 0;
    let started = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    /** Grid space (gx, gz in -1..1, y up) to screen. */
    const project = (gx: number, y: number, gz: number) => {
      const cos = Math.cos(TILT);
      const sin = Math.sin(TILT);
      const ry = y * cos - gz * sin;
      const rz = y * sin + gz * cos + DIST;
      const k = FOCAL / rz;
      return {
        x: width / 2 + gx * k * width * 0.62,
        y: height * 0.58 - ry * k * height * 0.62,
        k,
      };
    };

    const draw = (time: number) => {
      ctx.clearRect(0, 0, width, height);
      if (intensity <= 0.002) return;

      // The ripple starts where the pointer is, in grid coordinates
      const ox = origin.current.x * 2 - 1;
      const oz = origin.current.y * 2 - 1;

      ctx.globalCompositeOperation = "lighter";

      /* Back to front, so nearer cubes cover the ones behind them. */
      for (let r = 0; r < ROWS; r++) {
        const gz = 1 - (r / (ROWS - 1)) * 2;
        for (let c = 0; c < COLS; c++) {
          const gx = (c / (COLS - 1)) * 2 - 1;
          const d = Math.hypot(gx - ox, gz - oz);
          const fall = Math.exp(-d * DECAY);
          const y = Math.sin(d * WAVES - time * SPEED) * 0.16 * fall * intensity;

          const p = project(gx, y, gz);
          // One cell wide, scaled by its own depth
          const s = p.k * width * 0.0118;
          if (s < 0.4) continue;

          // Crests catch the light; troughs sit back
          const lift = (y / (0.16 * intensity || 1) + 1) / 2;
          const a = (0.05 + lift * 0.3) * fall * intensity;
          ctx.fillStyle = `rgba(214, 226, 255, ${a.toFixed(3)})`;
          ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
        }
      }

      ctx.globalCompositeOperation = "source-over";
    };

    const step = (now: number) => {
      if (!started) started = now;
      const t = (now - started) / 1000;
      // Ease toward the target so hover on and off are both soft
      intensity += ((target.current ? 1 : 0) - intensity) * 0.07;
      draw(t);
      frame = requestAnimationFrame(step);
    };

    resize();
    if (reduced) {
      // One still frame at full strength while hovered, no animation
      intensity = target.current ? 1 : 0;
      draw(0);
    } else {
      frame = requestAnimationFrame(step);
    }

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    />
  );
};

export default WaveGrid;
