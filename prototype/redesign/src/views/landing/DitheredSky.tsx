import { FC, useEffect, useRef } from "react";

/**
 * The background: a vertical ramp quantised with ordered dithering, so the
 * gradient is made of crosshatched dots rather than a smooth blend.
 *
 * After damarberlari/visualizing-dithering-codrops, which does this in a
 * Three.js shader. The maths is the same either way — an 8×8 Bayer matrix
 * thresholding each pixel against the ramp — done here as one ImageData pass
 * on a 2D context, at twelve frames a second because the movement is slower
 * than that and sixty would be four times the work for nothing.
 *
 * Ordered dithering is what gives the reference poster its texture: instead of
 * blending two colours, it alternates them in a fixed pattern, and the eye
 * mixes them. The pattern is the point — it is visibly constructed, which is
 * exactly the quality a smooth CSS gradient cannot have.
 */

/** The classic 8×8 Bayer matrix, 0–63. */
const BAYER = [
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
];

/**
 * The ramp, top to bottom: the brand board's ice, periwinkle and indigo,
 * ending at the page colour. Dithering mixes neighbours, so the fewer the
 * steps the more visible the pattern — nine is enough to read as a gradient
 * and few enough to read as dots.
 */
const RAMP = [
  "#C9D4FB",
  "#B4C1F7",
  "#9AA6EF",
  "#7C85E0",
  "#5E63C9",
  "#4340AE",
  "#2A2596",
  "#1E1B8C",
  "#12105A",
  "#0A0836",
  "#050507",
].map((hex) => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
]);

interface DitheredSkyProps {
  /** Pixel size of one dither cell — bigger reads coarser, like a halftone */
  scale?: number;
}

const DitheredSky: FC<DitheredSkyProps> = ({ scale = 2 }) => {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame = 0;
    let started = 0;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const render = (time: number) => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      /* Drawn at a fraction of the real resolution and scaled up by CSS, which
         is what makes the dither cells visible instead of a fine grey mist —
         and makes the whole thing cheap. */
      const w = Math.max(1, Math.ceil(rect.width / scale));
      const h = Math.max(1, Math.ceil(rect.height / scale));
      canvas.width = w;
      canvas.height = h;

      const img = ctx.createImageData(w, h);
      const data = img.data;
      const last = RAMP.length - 1;

      for (let y = 0; y < h; y++) {
        // Down the frame, with a gentle bow so the light pools off-centre
        const ny = y / (h - 1 || 1);
        for (let x = 0; x < w; x++) {
          const nx = x / (w - 1 || 1);
          const bow = Math.pow(Math.abs(nx - 0.46), 2) * 0.16;
          /* The ramp breathes: two slow waves crossing the frame, moving the
             position by about one step. Because the steps are quantised, what
             you see is not a colour shift but the dither pattern itself
             crawling — which is the only kind of motion this texture has. */
          const drift =
            Math.sin(nx * 2.3 + time * 0.00021) * 0.014 +
            Math.sin((nx + ny) * 3.1 - time * 0.00013) * 0.010;
          const t = Math.min(1, Math.max(0, ny * 1.02 + bow + drift));

          // Where this pixel falls on the ramp, and how far between steps
          const pos = t * last;
          const step = Math.floor(pos);
          const frac = pos - step;

          // Ordered threshold: the fraction decides how often we take the
          // next step up, and the matrix decides which pixels those are.
          const threshold = (BAYER[y & 7][x & 7] + 0.5) / 64;
          const level = Math.min(last, step + (frac > threshold ? 1 : 0));

          const c = RAMP[level];
          const i = (y * w + x) * 4;
          data[i] = c[0];
          data[i + 1] = c[1];
          data[i + 2] = c[2];
          data[i + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
    };

    /* Redrawn on a timer rather than every frame: the whole picture is one
       ImageData pass, and at this speed twelve a second is already smoother
       than the movement is. Sixty would be four times the work for nothing. */
    const FPS = 12;
    let last = 0;
    const loop = (now: number) => {
      if (!started) started = now;
      if (now - last > 1000 / FPS) {
        last = now;
        render(now - started);
      }
      frame = requestAnimationFrame(loop);
    };

    if (reduced) render(0);
    else frame = requestAnimationFrame(loop);

    const observer = new ResizeObserver(() => render(performance.now()));
    observer.observe(canvas);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [scale]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        // Nearest-neighbour, or the browser smooths the dots back into a blend
        imageRendering: "pixelated",
      }}
    />
  );
};

export default DitheredSky;
