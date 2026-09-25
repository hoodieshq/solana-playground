import { FC, useEffect, useRef, useState } from "react";
import styled, { css } from "styled-components";

import { HEADLINE } from "../deck/tokens";
import Statements from "./Statements";
import type { Statement } from "./Statements";
import { RAMP, rgba, seeded, smoothstep } from "./trail";

/**
 * The claims, flown at the reader — the trail version's answer to three tall,
 * mostly empty sections.
 *
 * The page pins a screen and the scroll becomes a camera moving forward.
 * Each claim starts far off at the vanishing point, small and out of focus,
 * and comes in trailing copies of itself in the ramp — the headlines' trail,
 * pointed into depth. It lands crisp and white and holds for a beat of
 * scrolling, its line coming up under it; then it speeds past the reader,
 * smearing and fading, as the next one sets off from the distance. Faint
 * lines of light radiate from the vanishing point and stretch as the camera
 * moves, so speed is felt even between claims.
 *
 * All of it is driven by where the page is scrolled to: one passive scroll
 * listener wakes one animation-frame loop, which reads the track's position
 * once and writes only transforms, opacity and filter — and draws the lines
 * on a canvas. The loop sleeps as soon as nothing is moving. Asked for less
 * motion, the claims are simply the classic stack.
 */

/* Scroll per claim, in screens */
const PER = 0.8;

/* A claim's run, as shares of it: arriving until ARRIVE, held until LEAVE,
   gone by the end. The next claim sets off exactly as this one starts to
   leave, so the run is the spacing plus the time spent leaving. */
const ARRIVE = 0.36;
const LEAVE = 0.66;
const RUN = PER / LEAVE;

/* The first claim sets off while the stage is still rising into place, so it
   is all but landed when the stage pins */
const LEAD = 0.45;

/* How far off a claim starts and how near it comes before it has gone, in
   multiples of the distance it is read at; and how much nearer it drifts
   while it is being read, so a held claim is never quite still */
const FAR = 6;
const NEAR = 0.2;
const DRIFT = 0.06;

/* The copies trailing a claim, nearest first: how quickly each catches up,
   how strong it is, how soft */
const ECHO_LAG = [0.05, 0.085, 0.125, 0.18];
const ECHO_ALPHA = [0.9, 0.8, 0.7, 0.6];
const ECHO_BLUR = ["0.012em", "0.026em", "0.045em", "0.07em"];
/* Never trailing further than this, as a ratio of distances */
const SPREAD = 1.8;
/* Painted farthest first, so the nearest lies on top */
const ECHO_ORDER = [3, 2, 1, 0];

const TAU = Math.PI * 2;

const easeOut = (n: number) => 1 - Math.pow(1 - n, 3);

/** Distance from the reader through a claim's run: in fast and settling,
    held, then away past the reader, gathering speed */
const distance = (t: number) => {
  if (t <= ARRIVE) return FAR - (FAR - 1) * easeOut(t / ARRIVE);
  if (t <= LEAVE) return 1 - DRIFT * ((t - ARRIVE) / (LEAVE - ARRIVE));
  const u = (t - LEAVE) / (1 - LEAVE);
  /* It leaves at the speed it drifted at, so the hold has no seam */
  const glide = (DRIFT / (LEAVE - ARRIVE)) * (1 - LEAVE);
  return 1 - DRIFT - glide * u - (1 - DRIFT - NEAR - glide) * Math.pow(u, 1.8);
};

/* The handoff: a leaving claim is mostly gone by the time the next one is
   strong enough to read, so the two are never legible over each other */
const presence = (t: number) => {
  if (t <= ARRIVE) return smoothstep(0.15, 0.7, t / ARRIVE);
  if (t <= LEAVE) return 1;
  return 1 - smoothstep(0.05, 0.7, (t - LEAVE) / (1 - LEAVE));
};

/** Blur as seen, in px: out of focus far off, sharp while read, smeared as
    it passes */
const haze = (t: number) => {
  if (t <= ARRIVE) return 7 * (1 - smoothstep(0.15, 0.92, t / ARRIVE));
  if (t <= LEAVE) return 0;
  return 16 * Math.pow((t - LEAVE) / (1 - LEAVE), 1.5);
};

/* The quiet line only while the claim is held */
const sentence = (t: number) =>
  smoothstep(ARRIVE - 0.02, ARRIVE + 0.1, t) *
  (1 - smoothstep(LEAVE, LEAVE + 0.08, t));

/* Where the stage is scrolled to when a claim is at the middle of its hold —
   where the page's own links land */
const anchorAt = (i: number) => i * PER + ((ARRIVE + LEAVE) / 2) * RUN - LEAD;

interface Streak {
  /** Angle from the vanishing point */
  a: number;
  /** Distance out, as a share of the way to the corner */
  r: number;
  /** Width, in px */
  w: number;
  /** Its own speed */
  k: number;
  /** Which colour of the ramp */
  c: number;
  /** Its own strength */
  o: number;
}

interface Rig {
  index: number;
  root: HTMLElement;
  line: HTMLElement;
  echoes: HTMLElement[];
  /** Each copy's distance, chasing the claim's */
  depth: number[];
  shown: boolean;
}

const Flight: FC<{ items: Statement[] }> = ({ items }) => {
  const [still] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  return still ? <Statements items={items} /> : <FlightStage items={items} />;
};

export default Flight;

const FlightStage: FC<{ items: Statement[] }> = ({ items }) => {
  const track = useRef<HTMLElement>(null);
  const screen = useRef<HTMLDivElement>(null);
  const warp = useRef<HTMLCanvasElement>(null);
  const claims = useRef<(HTMLDivElement | null)[]>([]);
  const count = items.length;

  useEffect(() => {
    const trackEl = track.current;
    const screenEl = screen.current;
    const canvas = warp.current;
    const ctx = canvas ? canvas.getContext("2d") : null;
    if (!trackEl || !screenEl || !canvas || !ctx) return;

    const rigs: Rig[] = [];
    claims.current.slice(0, count).forEach((root, index) => {
      const line = root?.querySelector<HTMLElement>("[data-line]");
      if (!root || !line) return;
      const echoes = Array.from(
        root.querySelectorAll<HTMLElement>("[data-echo]")
      ).sort((a, b) => Number(a.dataset.echo) - Number(b.dataset.echo));
      rigs.push({
        index,
        root,
        line,
        echoes,
        depth: echoes.map(() => NaN),
        shown: false,
      });
    });

    const random = seeded(29);
    const streaks: Streak[] = Array.from(
      { length: window.innerWidth < 700 ? 56 : 90 },
      () => ({
        a: random() * TAU,
        r: 0.06 + random() * 1.14,
        w: 0.6 + random() * 0.9,
        k: 0.6 + random() * 0.8,
        c: Math.floor(random() * RAMP.length),
        o: 0.45 + random() * 0.55,
      })
    );

    /* Where the last claim has gone; the lines fade with it */
    const end = (count - 1) * PER + RUN;

    let width = 0;
    let height = 0;
    const measure = () => {
      width = screenEl.clientWidth;
      height = screenEl.clientHeight;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    let frame = 0;
    let last = 0;
    let inView = true;
    let fresh = true;
    /* The timeline in screens, smoothed, and as last read */
    let at = 0;
    let read = 0;
    /* How fast the camera is moving, in screens a second */
    let speed = 0;

    /* One claim at one point of the timeline. Says whether its copies are
       still catching up, which keeps the loop running until they have. */
    const place = (rig: Rig, x: number, dt: number) => {
      const t = (x - rig.index * PER) / RUN;
      const { root, line, echoes, depth } = rig;
      const seen = t > 0 && t < 1 ? presence(t) : 0;
      if (seen < 0.002) {
        /* Off the stage, or not yet or no longer visible: transparent, and let
           go of its layer — a claim leaving at four times its size should not
           be kept drawn at that size */
        if (rig.shown) {
          root.style.opacity = "0";
          root.style.transform = "none";
          root.style.filter = "none";
          line.style.opacity = "0";
          echoes.forEach((echo) => {
            echo.style.opacity = "0";
            echo.style.transform = "none";
          });
          rig.shown = false;
        }
        depth.fill(NaN);
        return false;
      }

      const z = distance(t);
      const scale = 1 / z;
      rig.shown = true;
      root.style.opacity = seen.toFixed(3);
      root.style.transform = `translate3d(0, 0, 0) scale(${scale.toFixed(4)})`;
      /* The filter is drawn before the scale, so it is set in the claim's own
         pixels for the blur to look as meant on screen */
      const blur = haze(t) / scale;
      root.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "none";
      line.style.opacity = sentence(t).toFixed(3);

      let trailing = false;
      echoes.forEach((echo, k) => {
        const was = Number.isNaN(depth[k]) ? z : depth[k];
        const chased = was + (z - was) * (1 - Math.exp(-dt / ECHO_LAG[k]));
        const d = Math.min(z * SPREAD, Math.max(z / SPREAD, chased));
        const lag = Math.abs(Math.log(d / z));
        if (lag < 0.001) {
          depth[k] = z;
          echo.style.opacity = "0";
          return;
        }
        trailing = true;
        depth[k] = d;
        echo.style.opacity = (Math.min(1, lag * 6) * ECHO_ALPHA[k]).toFixed(3);
        /* Inside the claim's own scale: this is the copy's size relative to it */
        echo.style.transform = `scale(${(z / d).toFixed(4)})`;
      });
      return trailing;
    };

    /* The lines of light. They travel out from the vanishing point as the
       camera moves forward, in again as it backs up, and stretch with its
       speed; standing still they are short and faint, a field of points. */
    const drawWarp = (dt: number) => {
      ctx.clearRect(0, 0, width, height);
      const shown =
        smoothstep(0.05, 0.4, at) * (1 - smoothstep(end - 0.2, end + 0.08, at));
      if (shown < 0.002 || !width || !height) return;

      const cx = width / 2;
      const cy = height / 2;
      const reach = Math.hypot(cx, cy);
      const pace = Math.min(1, Math.abs(speed) / 2.4);

      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      streaks.forEach((s) => {
        s.r += speed * dt * 0.9 * s.k * (0.18 + s.r);
        if (s.r > 1.25) {
          s.r = 0.03 + Math.random() * 0.2;
          s.a = Math.random() * TAU;
        } else if (s.r < 0.03) {
          s.r = 1 + Math.random() * 0.2;
          s.a = Math.random() * TAU;
        }

        const alpha =
          (0.07 + 0.4 * pace) *
          s.o *
          shown *
          smoothstep(0.03, 0.28, s.r) *
          (1 - smoothstep(0.92, 1.22, s.r));
        if (alpha < 0.004) return;

        const length = 0.006 + pace * 0.2 * s.k * (0.2 + s.r);
        /* The tail points back the way the camera came */
        const tail = speed >= 0 ? Math.max(0, s.r - length) : s.r + length;
        const cos = Math.cos(s.a);
        const sin = Math.sin(s.a);
        const x1 = cx + cos * tail * reach;
        const y1 = cy + sin * tail * reach;
        const x2 = cx + cos * s.r * reach;
        const y2 = cy + sin * s.r * reach;

        const colour = RAMP[s.c];
        const stroke = ctx.createLinearGradient(x1, y1, x2, y2);
        stroke.addColorStop(0, rgba(colour, 0));
        stroke.addColorStop(1, rgba(colour, alpha));
        ctx.strokeStyle = stroke;
        ctx.lineWidth = s.w * (0.8 + 0.7 * pace);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      });
      ctx.globalCompositeOperation = "source-over";
    };

    const tick = (now: number) => {
      frame = 0;
      if (!inView) {
        last = 0;
        return;
      }
      const dt = last
        ? Math.min(0.064, Math.max(0.001, (now - last) / 1000))
        : 1 / 60;
      last = now;

      /* The one read: how far the track has scrolled past the top, in
         screens, from when the first claim sets off */
      const screenHeight = screenEl.offsetHeight || window.innerHeight;
      const x = -trackEl.getBoundingClientRect().top / screenHeight + LEAD;
      if (fresh) {
        at = x;
        read = x;
        fresh = false;
      }

      /* Capped, so a jump — End, a link — is a burst and not a flash */
      const moved = Math.max(-8, Math.min(8, (x - read) / dt));
      speed += (moved - speed) * (1 - Math.exp(-dt / 0.16));
      read = x;
      /* A touch of inertia, so a mouse wheel's steps become one movement —
         short enough that it still answers the hand */
      at += (x - at) * (1 - Math.exp(-dt / 0.075));
      if (Math.abs(x - at) < 0.0003) at = x;

      let trailing = false;
      rigs.forEach((rig) => {
        trailing = place(rig, at, dt) || trailing;
      });
      drawWarp(dt);

      if (at !== x || Math.abs(speed) > 0.01 || trailing) {
        frame = requestAnimationFrame(tick);
      } else {
        /* At rest: the lines as they lie when nothing moves */
        last = 0;
        speed = 0;
        drawWarp(0);
      }
    };

    const wake = () => {
      if (!frame && inView) frame = requestAnimationFrame(tick);
    };
    const onResize = () => {
      measure();
      wake();
    };

    measure();
    window.addEventListener("scroll", wake, { passive: true });
    window.addEventListener("resize", onResize);

    /* Nothing runs while the stage is nowhere near the screen */
    const watch =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(
            ([entry]) => {
              inView = entry.isIntersecting;
              if (inView) wake();
            },
            { rootMargin: "25% 0px" }
          );
    watch?.observe(trackEl);
    wake();

    return () => {
      window.removeEventListener("scroll", wake);
      window.removeEventListener("resize", onResize);
      watch?.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [count]);

  /* Pinned for as long as the claims take, plus the lead-in */
  const span = (count - 1) * PER + RUN - LEAD;

  return (
    <Track ref={track} style={{ height: `${(1 + span) * 100}vh` }}>
      {/* The page's links scroll to these, not to the claims themselves:
          on a pinned stage every claim is in the same place */}
      {items.map((item, i) => (
        <Anchor
          key={item.id}
          id={item.id}
          style={{ top: `${anchorAt(i) * 100}vh` }}
        />
      ))}

      <Screen ref={screen}>
        <Warp ref={warp} aria-hidden="true" />
        {items.map((item, i) => (
          <Claim
            key={item.id}
            ref={(el: HTMLDivElement | null) => {
              claims.current[i] = el;
            }}
          >
            <Stack>
              {ECHO_ORDER.map((k) => (
                <Echo
                  key={k}
                  data-echo={k}
                  aria-hidden="true"
                  style={{ color: RAMP[k], filter: `blur(${ECHO_BLUR[k]})` }}
                >
                  {item.title}
                </Echo>
              ))}
              <Title>{item.title}</Title>
            </Stack>
            <Sentence data-line="">{item.line}</Sentence>
          </Claim>
        ))}
      </Screen>
    </Track>
  );
};

/* ── the stage ────────────────────────────────────────────────────────── */

const Track = styled.section`
  position: relative;
`;

const Anchor = styled.div`
  position: absolute;
  left: 0;
  width: 1px;
  height: 1px;
  pointer-events: none;
`;

/* The pinned screen. The faintest violet at the vanishing point, so there is
   a depth to come out of. */
const Screen = styled.div`
  position: sticky;
  top: 0;
  height: 100vh;
  overflow: hidden;
  display: grid;
  place-items: center;
  background: radial-gradient(
    ellipse 42% 36% at 50% 50%,
    rgba(90, 63, 217, 0.07),
    rgba(90, 63, 217, 0) 70%
  );
`;

const Warp = styled.canvas`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  pointer-events: none;
`;

/* Every claim in the same cell, centred on the vanishing point. The claim's
   box is its heading alone — the line hangs below it — so the point it
   scales about is the middle of the words. Transparent until the loop places
   it, but never hidden: all three stay readable to assistive technology. */
const Claim = styled.div`
  grid-area: 1 / 1;
  position: relative;
  width: min(calc(100vw - 3rem), 20em);
  font-size: clamp(2rem, 4.1vw, 5rem);
  text-align: center;
  opacity: 0;
  transform-origin: 50% 50%;
  pointer-events: none;
`;

/* The classic claims' type, so the two versions say it at the same size */
const type = css`
  margin: 0;
  font-family: ${HEADLINE};
  font-size: 1em;
  font-weight: 500;
  line-height: 1.04;
  letter-spacing: -0.01em;
`;

const Stack = styled.div`
  position: relative;
`;

const Title = styled.h2`
  ${type}
  position: relative;
  color: #ffffff;
`;

/* The copies: the same words laid exactly under the heading, each in one
   colour of the ramp and a little softer than the one before */
const Echo = styled.p`
  ${type}
  position: absolute;
  inset: 0;
  opacity: 0;
  transform-origin: 50% 50%;
  user-select: none;
`;

const Sentence = styled.p`
  position: absolute;
  left: 50%;
  top: 100%;
  width: min(34rem, calc(100vw - 3rem));
  margin: clamp(1rem, 2vw, 1.75rem) 0 0;
  transform: translateX(-50%);
  font-family: "Manrope", -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: clamp(1rem, 1.25vw, 1.25rem);
  line-height: 1.5;
  color: rgba(237, 241, 255, 0.66);
  opacity: 0;
`;
