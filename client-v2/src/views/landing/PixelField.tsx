import { FC, useEffect, useRef } from "react";

/**
 * The hero's moving image: code punctuation drawn as dot matrices, drifting
 * slowly across a gradient.
 *
 * Canvas rather than WebGL. The whole scene is a few hundred filled circles a
 * frame — a 2D context draws that without breaking a sweat, and it costs no
 * shader, no context-loss handling and no fallback path. WebGL would be the
 * right answer at ten thousand sprites; here it would be a way of looking
 * busy.
 *
 * The glyphs are the characters a program is made of — braces, brackets,
 * arrows, semicolons — because that is what the page is about. Each is a 7×7
 * bitmap, scaled up and stamped as dots, which is where the pattern in the
 * reference comes from: not a pixel font rendered small, but a coarse grid
 * rendered large enough that you read the construction before the character.
 */

/** 7×7 bitmaps. `#` is a dot, a space is nothing. */
const GLYPHS: Record<string, string[]> = {
  "{": ["  ###  ", " ##    ", " ##    ", "###    ", " ##    ", " ##    ", "  ###  "],
  "}": ["  ###  ", "    ## ", "    ## ", "    ###", "    ## ", "    ## ", "  ###  "],
  "[": [" ##### ", " ##    ", " ##    ", " ##    ", " ##    ", " ##    ", " ##### "],
  "]": [" ##### ", "    ## ", "    ## ", "    ## ", "    ## ", "    ## ", " ##### "],
  "<": ["    ## ", "  ##   ", "##     ", "##     ", "##     ", "  ##   ", "    ## "],
  ">": [" ##    ", "   ##  ", "     ##", "     ##", "     ##", "   ##  ", " ##    "],
  "/": ["     ##", "     ##", "   ##  ", "  ##   ", " ##    ", "##     ", "##     "],
  ";": ["       ", "  ##   ", "  ##   ", "       ", "  ##   ", "  ##   ", " ##    "],
  "=": ["       ", "       ", "#######", "       ", "#######", "       ", "       "],
  "*": ["       ", " ## ## ", "  ###  ", "#######", "  ###  ", " ## ## ", "       "],
  "+": ["       ", "   #   ", "   #   ", "#######", "   #   ", "   #   ", "       "],
  "#": [" ## ## ", " ## ## ", "#######", " ## ## ", "#######", " ## ## ", " ## ## "],
  "%": ["##   ##", "##  ## ", "   ##  ", "  ##   ", " ##    ", " ##  ##", "##   ##"],
  "&": ["  ###  ", " ##    ", "  ##   ", " ### ##", "##  ## ", "##  ###", " ####  "],
  "(": ["   ### ", "  ##   ", " ##    ", " ##    ", " ##    ", "  ##   ", "   ### "],
  ")": [" ###   ", "   ##  ", "    ## ", "    ## ", "    ## ", "   ##  ", " ###   "],
  ":": ["       ", "  ##   ", "  ##   ", "       ", "  ##   ", "  ##   ", "       "],
  "_": ["       ", "       ", "       ", "       ", "       ", "       ", "#######"],
};

const KEYS = Object.keys(GLYPHS);

interface Mote {
  glyph: string[];
  x: number;
  y: number;
  /** Size of one bitmap cell, in CSS pixels */
  cell: number;
  vx: number;
  vy: number;
  alpha: number;
  /** Radians; kept small so the characters stay readable */
  angle: number;
  spin: number;
}

interface PixelFieldProps {
  /** Dots per glyph cell relative to the cell — under 1 leaves the gaps */
  dotRatio?: number;
}

const PixelField: FC<PixelFieldProps> = ({ dotRatio = 0.62 }) => {
  const ref = useRef<HTMLCanvasElement>(null);

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
    let motes: Mote[] = [];
    let frame = 0;

    /* Sized to the area rather than a fixed count, so a wide window is not
       emptier than a narrow one. */
    const populate = () => {
      const target = Math.round((width * height) / 78000);
      motes = Array.from({ length: target }, () => spawn(true));
    };

    const spawn = (anywhere: boolean): Mote => {
      /* A wide range on purpose: a few large glyphs carry the frame the way
         the poster's do, and the small ones are the dust around them. */
      const cell = 4 + Math.pow(Math.random(), 1.7) * 24;
      return {
        glyph: GLYPHS[KEYS[Math.floor(Math.random() * KEYS.length)]],
        x: Math.random() * width,
        // New motes enter from below; the first fill starts scattered.
        y: anywhere ? Math.random() * height : height + cell * 8,
        cell,
        vx: (Math.random() - 0.5) * 0.07,
        vy: -(0.04 + Math.random() * 0.13),
        // Bigger glyphs sit further forward and read brighter
        alpha: 0.13 + Math.min(cell / 28, 1) * 0.5,
        angle: (Math.random() - 0.5) * 0.5,
        spin: (Math.random() - 0.5) * 0.00018,
      };
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      populate();
    };

    const drawMote = (m: Mote) => {
      const r = (m.cell * dotRatio) / 2;
      const size = m.glyph.length * m.cell;
      ctx.save();
      ctx.translate(m.x + size / 2, m.y + size / 2);
      ctx.rotate(m.angle);
      ctx.translate(-size / 2, -size / 2);
      ctx.globalAlpha = m.alpha;
      ctx.fillStyle = "#EDF1FF";
      for (let row = 0; row < m.glyph.length; row++) {
        const line = m.glyph[row];
        for (let col = 0; col < line.length; col++) {
          if (line[col] === " ") continue;
          ctx.beginPath();
          ctx.arc(
            col * m.cell + m.cell / 2,
            row * m.cell + m.cell / 2,
            r,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
      }
      ctx.restore();
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      for (const m of motes) drawMote(m);
    };

    const step = () => {
      for (let i = 0; i < motes.length; i++) {
        const m = motes[i];
        m.x += m.vx;
        m.y += m.vy;
        m.angle += m.spin;
        // Off the top, back in from the bottom
        if (m.y + m.glyph.length * m.cell < 0) motes[i] = spawn(false);
        else if (m.x < -120) m.x = width + 60;
        else if (m.x > width + 120) m.x = -60;
      }
      draw();
      frame = requestAnimationFrame(step);
    };

    resize();
    if (reduced) draw();
    else frame = requestAnimationFrame(step);

    const observer = new ResizeObserver(() => {
      resize();
      if (reduced) draw();
    });
    observer.observe(canvas);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [dotRatio]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    />
  );
};

export default PixelField;
