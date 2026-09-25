import { colour, hueAt, toward } from "./aurora";
import { seeded, smoothstep } from "./trail";

/**
 * Hyperspace, in Solana's colours: the lines over the trail button's light.
 *
 * Thin streaks come out of a dark heart behind the middle of the button and
 * run to the edges, accelerating and lengthening as they go — the way stars
 * stretch past a ship at warp. Most are hairlines; one in every fourteen is a
 * thicker, brighter streak, which is what gives a warp its depth. Each takes
 * its colour from where it is across the button, so the left runs green and
 * teal and the right blue-violet and purple, over the same ramp the flow
 * beneath them is filled with.
 *
 * Drawn sharp, on a canvas of its own, over the blurred flow (`aurora.ts`):
 * lines for the speed, the flow for the colour. They fade in out of the heart
 * — kept dim there, where the words are — and out again before any edge of
 * the canvas, so nothing ends on a cut.
 */

const TAU = Math.PI * 2;

const fract = (n: number) => n - Math.floor(n);

interface Line {
  /** Its heading out of the heart, radians */
  angle: number;
  phase: number;
  /** Trips from the heart to the edge per second, before the hover speed-up */
  rate: number;
  strength: number;
  width: number;
  hero: boolean;
}

const LINES: Line[] = (() => {
  const random = seeded(29);
  return Array.from({ length: 260 }, (_, i) => {
    const hero = i % 14 === 0;
    return {
      angle: random() * TAU,
      phase: random(),
      rate: hero ? 0.2 + random() * 0.14 : 0.3 + random() * 0.6,
      strength: hero ? 1 : 0.32 + random() * 0.6,
      width: hero ? 3.6 + random() * 2.2 : 0.7 + random() * 1.3,
      hero,
    };
  });
})();

/**
 * One frame of the lines at time `t`, in seconds, on a canvas `w` × `h`, out
 * of a heart at (`cx`, `cy`) — shares of the canvas.
 */
export const drawWarp = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  cx: number,
  cy: number
) => {
  ctx.globalCompositeOperation = "source-over";
  ctx.clearRect(0, 0, w, h);
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";

  const px = cx * w;
  const py = cy * h;
  const reach = Math.hypot(Math.max(px, w - px), Math.max(py, h - py));
  /* The dark heart the lines come out of */
  const heart = 0.03 * w;
  const scale = w / 1280;

  LINES.forEach((line) => {
    const u = fract(line.phase + t * line.rate);
    const d = heart + Math.pow(u, 2.1) * (reach - heart);
    const length =
      (0.02 + 0.5 * Math.pow(u, 1.35)) * reach * (line.hero ? 0.85 : 0.6);
    const alpha =
      line.strength * smoothstep(0, 0.18, u) * (1 - smoothstep(0.82, 1, u));
    if (alpha < 0.02) return;

    const dx = Math.cos(line.angle);
    const dy = Math.sin(line.angle);
    const tail = Math.max(heart, d - length);
    const hx = px + dx * d;
    const hy = py + dy * d;
    const tx = px + dx * tail;
    const ty = py + dy * tail;

    const tint = toward(hueAt(hx / w), line.hero ? 0.55 : 0.32);
    const stroke = ctx.createLinearGradient(tx, ty, hx, hy);
    stroke.addColorStop(0, colour(tint, 0));
    stroke.addColorStop(1, colour(tint, alpha));
    ctx.strokeStyle = stroke;
    ctx.lineWidth = line.width * (0.6 + 1.6 * u) * scale;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(hx, hy);
    ctx.stroke();
  });

  /* Dim at the heart, where the words are; gone before any edge */
  ctx.globalCompositeOperation = "destination-in";
  const around = ctx.createRadialGradient(px, py, 0, px, py, reach);
  around.addColorStop(0, "rgba(0, 0, 0, 0.3)");
  around.addColorStop(0.16, "rgba(0, 0, 0, 1)");
  around.addColorStop(0.72, "rgba(0, 0, 0, 0.9)");
  around.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = around;
  ctx.fillRect(0, 0, w, h);
  const edges = ctx.createLinearGradient(0, 0, 0, h);
  edges.addColorStop(0, "rgba(0, 0, 0, 0)");
  edges.addColorStop(0.2, "rgba(0, 0, 0, 1)");
  edges.addColorStop(0.88, "rgba(0, 0, 0, 1)");
  edges.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = edges;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = "source-over";
};
