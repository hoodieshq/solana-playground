import { FC, ReactNode, useEffect, useRef } from "react";
import styled from "styled-components";

/**
 * Text that arrives through the same pixel wipe as the page, rather than
 * fading up.
 *
 * The block is drawn over the words in the page colour and then cleared cell
 * by cell in a shuffled order, left to right. It removes itself when finished,
 * so a revealed paragraph is plain text again — no canvas left sitting over
 * selectable copy.
 */

interface PixelInProps {
  /** Runs the wipe when this turns true */
  active: boolean;
  children: ReactNode;
  delay?: number;
  duration?: number;
  block?: number;
  color?: string;
  className?: string;
}

const PixelIn: FC<PixelInProps> = ({
  active,
  children,
  delay = 0,
  duration = 620,
  block = 14,
  color = "#050507",
  className,
}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (!active || ran.current) return;
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ran.current = true;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      canvas.style.display = "none";
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = rect.width;
    const height = rect.height;
    if (!width || !height) {
      canvas.style.display = "none";
      return;
    }
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);

    const cols = Math.ceil(width / block);
    const rows = Math.ceil(height / block);
    /* Weighted left to right, the way the words are read, with enough noise
       that the edge is ragged rather than a wipe bar. */
    const cells: Array<{ c: number; r: number; k: number }> = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        cells.push({ c, r, k: c / cols + Math.random() * 0.45 });
      }
    }
    cells.sort((a, b) => a.k - b.k);

    let cleared = 0;
    let frame = 0;
    let started = 0;

    const step = (now: number) => {
      if (!started) started = now + delay * 1000;
      if (now < started) {
        frame = requestAnimationFrame(step);
        return;
      }
      const t = Math.min((now - started) / duration, 1);
      const want = Math.floor((1 - Math.pow(1 - t, 2)) * cells.length);
      for (; cleared < want; cleared++) {
        const { c, r } = cells[cleared];
        ctx.clearRect(c * block, r * block, block + 1, block + 1);
      }
      if (t < 1) frame = requestAnimationFrame(step);
      else canvas.style.display = "none";
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [active, delay, duration, block, color]);

  return (
    <Wrap className={className}>
      {children}
      <Cover ref={ref} aria-hidden="true" />
    </Wrap>
  );
};

export default PixelIn;

const Wrap = styled.span`
  position: relative;
  display: block;
`;

const Cover = styled.canvas`
  position: absolute;
  inset: -2px -4px;
  width: calc(100% + 8px);
  height: calc(100% + 4px);
  pointer-events: none;
`;
