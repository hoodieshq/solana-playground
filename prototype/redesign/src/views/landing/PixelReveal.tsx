import { FC, useEffect, useRef } from "react";

/**
 * The load: the page arrives through a pixel wipe.
 *
 * After J0SUKE/gsap-threejs-codrops, where a WebGL shader dissolves an image
 * block by block under a GSAP timeline. Here the same picture comes from a
 * canvas full of opaque blocks that clear in a shuffled order — no shader, no
 * timeline library, and the reveal is of whatever happens to be behind it,
 * which on this page is a live canvas rather than a texture.
 *
 * Blocks clear in a shuffled order weighted toward the centre, so the middle
 * of the frame opens first and the corners last. A pure random order reads as
 * static clearing; this reads as something opening.
 */

interface PixelRevealProps {
  /** Milliseconds for the whole wipe */
  duration?: number;
  /** Size of one block, in CSS pixels */
  block?: number;
  /** The colour the page arrives out of */
  color?: string;
  onDone?: () => void;
}

const PixelReveal: FC<PixelRevealProps> = ({
  duration = 1100,
  block = 26,
  color = "#050507",
  onDone,
}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = rect.width;
    const height = rect.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (reduced) {
      // No wipe: the page is simply there
      canvas.style.display = "none";
      done.current?.();
      return;
    }

    const cols = Math.ceil(width / block);
    const rows = Math.ceil(height / block);

    /* Order weighted toward the centre: each block gets its distance from the
       middle plus some noise, and they clear in that order. The noise is what
       stops it reading as a tidy expanding circle. */
    const cells: Array<{ c: number; r: number; k: number }> = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const dx = (c + 0.5) / cols - 0.5;
        const dy = (r + 0.5) / rows - 0.5;
        cells.push({ c, r, k: Math.hypot(dx, dy * 0.8) + Math.random() * 0.34 });
      }
    }
    cells.sort((a, b) => a.k - b.k);

    let cleared = 0;
    let frame = 0;
    let started = 0;

    const paintAll = () => {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, width, height);
    };
    paintAll();

    const step = (now: number) => {
      if (!started) started = now;
      const t = Math.min((now - started) / duration, 1);
      // Ease out: most blocks go early, the last few linger
      const eased = 1 - Math.pow(1 - t, 2.2);
      const want = Math.floor(eased * cells.length);

      for (; cleared < want; cleared++) {
        const { c, r } = cells[cleared];
        ctx.clearRect(c * block, r * block, block + 1, block + 1);
      }

      if (t < 1) {
        frame = requestAnimationFrame(step);
      } else {
        canvas.style.display = "none";
        done.current?.();
      }
    };
    frame = requestAnimationFrame(step);

    return () => cancelAnimationFrame(frame);
  }, [duration, block, color]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 3,
        pointerEvents: "none",
      }}
    />
  );
};

export default PixelReveal;
