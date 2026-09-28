import {
  FC,
  MouseEvent,
  RefObject,
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import styled, { createGlobalStyle, css, keyframes } from "styled-components";

import PlaygroundLogoNext from "../../components/PlaygroundLogoNext";
import PlayRing from "../../components/PlayRing";
/* The product as it is now, shot from the build itself and framed on the
   brand render's geometry, so the crop below still lands on its window */
import productShot from "./art/product-closeup.jpg";
import phoneShot from "./art/phone-code.jpg";
import BuildHero from "../deck/BuildHero";
import type { BuildStep } from "../deck/BuildHero";
import { HEADLINE, HEADLINE_SIZE, INK } from "../deck/tokens";
import Flight from "./Flight";
import Light, { LIGHT_BELOW } from "./Light";
import PhoneMenu from "./PhoneMenu";
import type { MenuLink } from "./PhoneMenu";
import type { Pull } from "./Light";
import type { Statement } from "./Statements";
import { LogoPill, NavLink, NavPill, TopBar, frameUnit, u } from "./chrome";
import { trailLetters } from "./trail";

/**
 * The landing, as the presentation would say it (Figma 53:7077).
 *
 * It opens the way the deck's slides 7 to 9 do — "Explore", then "Learn,",
 * then "Build Onchain" arriving, words already on screen travelling to make
 * room, the gradient sliding from green to violet and settling into ink — but
 * played through on its own, a screen tall, every letter arriving trailing
 * copies of itself in Solana's ramp. Once the line has landed it rises a
 * little, the product comes up from the bottom of the screen into the room it
 * leaves, and the button arrives last: its words on light, ribbons in the
 * brand's colours standing still while the colour flows through them. Then
 * the claims fly at the reader out of depth as they scroll, and the page goes
 * round — the first screen again with a line of its own, the claims again,
 * and back to the top.
 *
 * Built from the deck's own parts rather than made to resemble them, and kept
 * short: a claim and one quiet line wherever there used to be a paragraph.
 */

interface LandingProps {
  /** Into the product */
  onEnter: () => void;
}

/* The deck's three steps, with its three grounds */
const STEPS: BuildStep[] = [
  { lines: ["Explore"], ground: "explore" },
  { lines: ["Explore, Learn,"], ground: "violet" },
  { lines: ["Explore, Learn,", "Build Onchain"], ground: "ink" },
];

/* The footer's line, built as the hero's is, over the same grounds */
const FOOTER_STEPS: BuildStep[] = [
  { lines: ["Start with the idea,"], ground: "violet" },
  { lines: ["Start with the idea,", "not the setup."], ground: "ink" },
];

const STATEMENTS: Statement[] = [
  {
    id: "what",
    title: "A Solana workbench in a browser tab.",
    line: "Editor, build server, wallet and test validator, all wired together.",
  },
  {
    id: "how",
    title: "Write, build, deploy, interact.",
    line: "Four steps in order, each one in view as you go.",
  },
  {
    id: "who",
    title: "A place to test ideas and learn.",
    line: "For people new to Solana, engineers from other chains and anyone with an idea to try.",
  },
];

/* The claims again, further round the loop */
const STATEMENTS_AGAIN = STATEMENTS.map((item) => ({
  ...item,
  id: `${item.id}-again`,
}));
const CLAIM_IDS = STATEMENTS.map((item) => item.id);
const CLAIM_IDS_AGAIN = STATEMENTS_AGAIN.map((item) => item.id);

/* In-page links must not touch the URL: the app reads its hash to decide what
   to show, and "#what" would take the reader off the landing entirely. */
const scrollTo = (id: string) => (ev: MouseEvent) => {
  ev.preventDefault();
  document
    .getElementById(id)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
};

/* ── the first screen, in motion ─────────────────────────────────────── */

/* Once the product has come up, the page glides down until the top bar is
   out of view, so the product and its light have the whole screen. A scroll
   down from there does not move the page at first: it pulls on the whole
   first screen — the headline, the product, the button's words and the light
   between them stretch up like a slinky held at the button — and past a
   point the page lets go and glides on to the claims. Lower down, the top
   bar floats back in. */

/* How long after the product rises the page glides down, how long that
   takes, and how far past the top bar it stops */
const SETTLE_AFTER = 1250;
const SETTLE_FOR = 1400;
const SETTLE_GAP = 16;

/* How much scrolling, in px, pulls all the way; how rubbery it is — quick to
   give at first, stiffer the further it goes — and how quickly an unfinished
   pull lets go */
const PULL_PX = 340;
const PULL_GIVE = 2.2;
const PULL_RELEASE = 3;

/* The layers the pull moves, each on a spring of its own — stiffest at the
   top, so the headline goes first, the product after it and the button's
   words last, with more bounce the lower they are — and how far each goes at
   a full pull, on the 1920 frame */
const PULL_LAYERS = [
  { name: "--pull-head", stiffness: 230, damping: 19 },
  { name: "--pull-product", stiffness: 160, damping: 14.5 },
  { name: "--pull-words", stiffness: 110, damping: 11 },
];
const PULL_HEAD = 120;
const PULL_PRODUCT = 84;
const PULL_WORDS = 56;

/* The stops the page glides between, going round: the hero
   at rest, the claims, the footer — the first screen again, with its own
   line — the claims again under names of their own, and a copy of the hero,
   from which the page goes round to the top */
type StopKind = "hero" | "claim" | "footer" | "loop";
interface Stop {
  y: number;
  kind: StopKind;
}

/* A glide between stops takes longer the further it goes, within these; and
   a trackpad's flick must go quiet this long before the next gesture counts */
const GLIDE_MIN = 700;
const GLIDE_MAX = 1300;
const QUIET = 220;

/* How hard each glide drives the light (`Light.tsx`): through the middle of
   it, easing in and out at its ends — the short settle gently, the glide on
   to the claims at full */
const SETTLE_DRIVE = 0.75;
const arch = (k: number) => Math.max(0, Math.sin(Math.PI * k));
const settleDrive = (k: number) => SETTLE_DRIVE * Math.pow(arch(k), 0.9);
const letGoDrive = (k: number) => Math.pow(arch(k), 0.6);

/* Eased in and out: a cubic, and a softer one for gliding from rest */
const inOut = (k: number) =>
  k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
const smoother = (k: number) => k * k * k * (k * (k * 6 - 15) + 10);

/* A scroll of the window to `to` over `ms`, telling `step` how far through
   it is; the returned function stops it where it is */
const glide = (
  to: number,
  ms: number,
  done?: () => void,
  ease: (k: number) => number = inOut,
  onStep?: (k: number) => void
) => {
  const from = window.scrollY;
  const start = performance.now();
  let frame = 0;
  const step = (now: number) => {
    /* A frame's time can fall a moment before the glide was asked for */
    const k = Math.min(1, Math.max(0, (now - start) / ms));
    const eased = ease(k);
    window.scrollTo(0, from + (to - from) * eased);
    onStep?.(k);
    if (k < 1) frame = requestAnimationFrame(step);
    else done?.();
  };
  frame = requestAnimationFrame(step);
  return () => cancelAnimationFrame(frame);
};

/* The same links as the top bar's pill, for the menu a phone gets instead */
const MENU_LINKS: MenuLink[] = [
  { label: "What it is", href: "#what", onClick: scrollTo("what") },
  { label: "How it works", href: "#how", onClick: scrollTo("how") },
  { label: "Who it's for", href: "#who", onClick: scrollTo("who") },
  { label: "Docs", href: "https://solana.com/docs", external: true },
];

/* Where an element is on the page, by the layout: no transform moves it */
const pageTop = (el: HTMLElement) => {
  let y = 0;
  for (let at: HTMLElement | null = el; at; ) {
    y += at.offsetTop;
    at = at.offsetParent as HTMLElement | null;
  }
  return y;
};

/* Under the landing's links fold: a phone */
const PHONE_FOLD = "(max-width: 40rem)";
const phoneNow = () => window.matchMedia(PHONE_FOLD).matches;

/* The first screen, as the hero measures it */
const SCREEN = "max(100vh, 34rem)";

/* How much of the product the first screen shows once it is up: the lower
   55%, so its light has room to rise into the interface */
const PEEK = 0.55;
const PRODUCT_PEEK = `calc(${SCREEN} * ${PEEK})`;

/* The line: the deck's, at the Figma's 185.6, two rows of 0.93 */
const LINE = `calc(${HEADLINE_SIZE} * 0.86)`;

/* Clear of the top bar: 54 down, a pill of 57 (never under 2.5rem), and 40 */
const CLEAR = `max(${u(151)}, calc(${u(94)} + 2.5rem))`;

/* How far the line rises once it has landed — enough that its lower row
   clears the product's window by 70 on the 1920 frame (never less than 1.5rem;
   the window starts 64 into the render), and never so far that it runs into
   the top bar */
const LIFT =
  `max(0px, min(calc(0.93 * ${LINE} + ${(PEEK - 0.5).toFixed(2)} * ${SCREEN}` +
  ` + max(${u(70)}, 1.5rem) - ${u(64)}),` +
  ` calc((${SCREEN} - 1.86 * ${LINE}) / 2 - ${CLEAR})))`;

const Landing: FC<LandingProps> = ({ onEnter }) => {
  const [up, setUp] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  const rise = useCallback(() => setUp(true), []);

  /* The first screen in motion: see the constants above */
  const pageRef = useRef<HTMLElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const loopRef = useRef<HTMLDivElement>(null);
  const [footerVisit, setFooterVisit] = useState(0);
  const pull = useRef<Pull>({ value: 0, drive: 0 });
  const touched = useRef(false);
  const stopSettle = useRef<() => void>(() => undefined);
  const [floating, setFloating] = useState(false);

  /* A reader who scrolls, presses a key or touches the page is in charge:
     no glide starts after that, and one under way stops */
  useEffect(() => {
    const take = () => {
      touched.current = true;
      stopSettle.current();
    };
    const opts = { capture: true, passive: true } as const;
    const events = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
    events.forEach((e) => window.addEventListener(e, take, opts));
    return () =>
      events.forEach((e) => window.removeEventListener(e, take, opts));
  }, []);

  /* Where the page rests once the top bar is out of view — measured on the
     layout, so the bar's own entrance, still sliding it in, does not count */
  const restAt = useCallback(() => {
    const top = topRef.current;
    return top ? Math.round(pageTop(top) + top.offsetHeight + SETTLE_GAP) : 0;
  }, []);

  /* Where the product's frame stands in the window once the page has come to
     rest on a first screen: the one moment its light is drawn for, so the
     ribbons keep that shape however the page moves (`Light.tsx`). Every first
     screen rests the same way, so the hero's answers for all three. A phone,
     or a reader who asked for less motion, rests where the page opened. */
  const heroFrameRef = useRef<HTMLElement>(null);
  const restTop = useCallback(() => {
    const frame = heroFrameRef.current;
    if (!frame) return null;
    const settles =
      !phoneNow() &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return pageTop(frame) - (settles ? restAt() : 0);
  }, [restAt]);

  useEffect(() => {
    if (!up) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    /* A phone keeps its top bar in view: the menu is in it */
    if (phoneNow()) return;
    const timer = window.setTimeout(() => {
      if (touched.current || window.scrollY > 4) return;
      const still = () => {
        pull.current.drive = 0;
      };
      const stop = glide(restAt(), SETTLE_FOR, still, smoother, (k) => {
        pull.current.drive = settleDrive(k);
      });
      stopSettle.current = () => {
        stop();
        still();
      };
    }, SETTLE_AFTER);
    return () => {
      window.clearTimeout(timer);
      stopSettle.current();
    };
  }, [up, restAt]);

  /* The page, as a loop of stops (see the constants above):
     the hero at rest, each claim, the footer at rest, each claim again, and a
     copy of the hero — which is the hero, so the page goes round from it */
  const stopsNow = useCallback((): Stop[] => {
    const rest = restAt();
    const at = (el: HTMLElement | null) =>
      el ? el.getBoundingClientRect().top + window.scrollY : NaN;
    const claims = (ids: string[]) =>
      ids.map((id) => ({
        y: at(document.getElementById(id)),
        kind: "claim" as StopKind,
      }));
    return [
      { y: rest, kind: "hero" as StopKind },
      ...claims(CLAIM_IDS),
      { y: at(footerRef.current) + rest, kind: "footer" as StopKind },
      ...claims(CLAIM_IDS_AGAIN),
      { y: at(loopRef.current) + rest, kind: "loop" as StopKind },
    ].filter((stop) => Number.isFinite(stop.y));
  }, [restAt]);

  /* A gesture glides to the next stop; at the hero and the footer it pulls on
     the first screen first, and lets go past a point */
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let wanted = 0;
    let pulledAt = 0;
    let last = 0;
    let frame = 0;
    let gliding = false;
    let settledAt = 0;
    let wheeledAt = 0;
    let stopGlide = () => undefined as void;
    const layers = PULL_LAYERS.map((layer) => ({ ...layer, at: 0, speed: 0 }));

    const show = () => {
      const page = pageRef.current;
      layers.forEach((layer) =>
        page?.style.setProperty(layer.name, layer.at.toFixed(4))
      );
      /* The light stretches with the product it reaches into */
      pull.current.value = layers[1].at;
    };
    const tick = (now: number) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      if (now - pulledAt > 140) {
        wanted += (0 - wanted) * Math.min(1, dt * PULL_RELEASE);
      }
      /* Rubbery: quick to give at first, stiffer the further it goes */
      const goal =
        (1 - Math.exp(-PULL_GIVE * wanted)) / (1 - Math.exp(-PULL_GIVE));
      let moving = Math.abs(wanted) > 0.0005;
      layers.forEach((layer) => {
        layer.speed +=
          (layer.stiffness * (goal - layer.at) - layer.damping * layer.speed) *
          dt;
        layer.at += layer.speed * dt;
        if (Math.abs(goal - layer.at) + Math.abs(layer.speed) > 0.0005) {
          moving = true;
        }
      });
      show();
      if (moving) {
        frame = requestAnimationFrame(tick);
      } else {
        frame = 0;
        last = 0;
        layers.forEach((layer) => {
          layer.at = 0;
          layer.speed = 0;
        });
        show();
      }
    };
    const wake = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };

    /* The stop the page rests at, or is nearest */
    const nearest = (stops: Stop[]) => {
      const y = window.scrollY;
      let best = 0;
      stops.forEach((stop, i) => {
        if (Math.abs(stop.y - y) < Math.abs(stops[best].y - y)) best = i;
      });
      return best;
    };

    const go = (stops: Stop[], to: number) => {
      const stop = stops[to];
      const from = stops[nearest(stops)];
      /* A first screen is in view at one end: its light glides with it */
      const lit = stop.kind !== "claim" || from.kind !== "claim";
      gliding = true;
      wanted = 0;
      wake();
      if (stop.kind === "footer") setFooterVisit((n) => n + 1);
      const distance = Math.abs(stop.y - window.scrollY);
      stopGlide = glide(
        stop.y,
        Math.max(GLIDE_MIN, Math.min(GLIDE_MAX, 520 + distance * 0.38)),
        () => {
          gliding = false;
          settledAt = performance.now();
          pull.current.drive = 0;
          /* Round the loop: the copy of the hero is the hero */
          if (stop.kind === "loop") window.scrollTo(0, stops[0].y);
        },
        inOut,
        lit
          ? (k) => {
              pull.current.drive = letGoDrive(k);
            }
          : undefined
      );
    };
    const next = () => {
      const stops = stopsNow();
      const i = nearest(stops);
      if (i < stops.length - 1) go(stops, i + 1);
    };
    const previous = () => {
      let stops = stopsNow();
      let i = nearest(stops);
      if (i === 0) {
        /* Round the loop the other way: from the top to its copy below */
        window.scrollTo(0, stops[stops.length - 1].y);
        stops = stopsNow();
        i = stops.length - 1;
      }
      go(stops, i - 1);
    };

    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      const now = performance.now();
      const gap = now - wheeledAt;
      wheeledAt = now;
      if (gliding) return;
      /* A trackpad's flick keeps sending after the glide it started: the
         next gesture counts once it has gone quiet */
      if (settledAt && gap < QUIET) return;
      settledAt = 0;
      const unit =
        ev.deltaMode === 1 ? 16 : ev.deltaMode === 2 ? window.innerHeight : 1;
      const dy = ev.deltaY * unit;
      if (Math.abs(dy) < 1) return;
      if (dy < 0) {
        previous();
        return;
      }
      const stops = stopsNow();
      if (stops[nearest(stops)].kind === "claim") {
        next();
        return;
      }
      /* At a first screen, a pull first */
      wanted = Math.min(1.15, wanted + dy / PULL_PX);
      pulledAt = now;
      wake();
      if (wanted >= 1) next();
    };
    const onKey = (ev: KeyboardEvent) => {
      const onPage =
        !document.activeElement || document.activeElement === document.body;
      if (gliding || !onPage) return;
      if (["ArrowDown", "PageDown", " "].includes(ev.key)) {
        ev.preventDefault();
        next();
      } else if (["ArrowUp", "PageUp"].includes(ev.key)) {
        ev.preventDefault();
        previous();
      }
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      stopGlide();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [stopsNow]);

  /* A page scrolled by hand — a touch screen, the scroll bar — has no glide
     to go round on: coming to rest on the copy of the hero at the bottom, it
     goes round to the top, to the same place in the hero */
  useEffect(() => {
    let timer = 0;
    const settle = () => {
      const copy = loopRef.current;
      if (!copy) return;
      const copyTop = copy.getBoundingClientRect().top + window.scrollY;
      const y = window.scrollY;
      if (y >= copyTop - 2) window.scrollTo(0, Math.max(0, y - copyTop));
    };
    const onScroll = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(settle, 160);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(timer);
    };
  }, []);

  /* Over the claims the top bar floats in; over a first screen, which has
     its own, it keeps out of the way */
  useEffect(() => {
    let frame = 0;
    const check = () => {
      frame = 0;
      const stops = stopsNow();
      if (!stops.length) return;
      const y = window.scrollY;
      const near = window.innerHeight * 0.45;
      const overFirst = stops.some(
        (stop) => stop.kind !== "claim" && Math.abs(stop.y - y) < near
      );
      setFloating(!overFirst && y > stops[0].y + near);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    check();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [stopsNow]);

  /* A reader who scrolls before the line has finished should find the product
     there, not an empty stage still waiting on the animation */
  useEffect(() => {
    if (up) return;
    const opts = { capture: true, passive: true } as const;
    const events = ["scroll", "wheel", "touchmove"] as const;
    events.forEach((e) => window.addEventListener(e, rise, opts));
    return () =>
      events.forEach((e) => window.removeEventListener(e, rise, opts));
  }, [up, rise]);

  return (
    <Page id="landing-top" ref={pageRef}>
      <LandingFonts />

      {/* The deck's line at the Figma's 185.6: 0.86 of the deck's size */}
      <Hero
        steps={STEPS}
        scale={0.86}
        weight={500}
        leading={0.93}
        onSettled={rise}
        lift={LIFT}
        lifted={up}
      >
        <Top ref={topRef}>
          <LogoPill
            href="#landing-top"
            onClick={scrollTo("landing-top")}
            aria-label="Solana Playground"
          >
            <PlaygroundLogoNext />
          </LogoPill>
          <NavPill aria-label="Main">
            <NavLink href="#what" onClick={scrollTo("what")}>
              What it is
            </NavLink>
            <NavLink href="#how" onClick={scrollTo("how")}>
              How it works
            </NavLink>
            <NavLink href="#who" onClick={scrollTo("who")}>
              Who it's for
            </NavLink>
            <NavLink
              href="https://solana.com/docs"
              target="_blank"
              rel="noreferrer"
            >
              Docs
            </NavLink>
          </NavPill>
          <PhoneMenu links={MENU_LINKS} />
        </Top>
      </Hero>

      <FloatingTop $shown={floating} aria-hidden={!floating}>
        <LogoPill
          href="#landing-top"
          onClick={scrollTo("landing-top")}
          aria-label="Solana Playground"
          tabIndex={floating ? 0 : -1}
        >
          <PlaygroundLogoNext />
        </LogoPill>
        <NavPill aria-label="Main">
          <NavLink
            href="#what"
            onClick={scrollTo("what")}
            tabIndex={floating ? 0 : -1}
          >
            What it is
          </NavLink>
          <NavLink
            href="#how"
            onClick={scrollTo("how")}
            tabIndex={floating ? 0 : -1}
          >
            How it works
          </NavLink>
          <NavLink
            href="#who"
            onClick={scrollTo("who")}
            tabIndex={floating ? 0 : -1}
          >
            Who it's for
          </NavLink>
          <NavLink
            href="https://solana.com/docs"
            target="_blank"
            rel="noreferrer"
            tabIndex={floating ? 0 : -1}
          >
            Docs
          </NavLink>
        </NavPill>
        {floating && <PhoneMenu links={MENU_LINKS} />}
      </FloatingTop>

      <Product
        onEnter={onEnter}
        up={up}
        pull={pull}
        restTop={restTop}
        frameRef={heroFrameRef}
      />

      <Flight items={STATEMENTS} />
      <FirstScreen
        ref={footerRef}
        steps={FOOTER_STEPS}
        replay={footerVisit}
        onEnter={onEnter}
        pull={pull}
        restTop={restTop}
      />
      <Flight items={STATEMENTS_AGAIN} />
      <FirstScreen
        ref={loopRef}
        steps={STEPS}
        onEnter={onEnter}
        pull={pull}
        restTop={restTop}
        copy
      />
    </Page>
  );
};

export default Landing;

/**
 * The product, and the button across it. It waits below the first screen
 * until the line has landed, then comes up into the room the line leaves; the
 * button follows it, its words on a cone of light, held whole just above the
 * bottom edge until scrolling brings it to its place across the render.
 */
const Product: FC<{
  onEnter: () => void;
  up: boolean;
  /** The reader's pull on the light */
  pull?: RefObject<Pull>;
  /** Where this frame's top stands in the window at rest (`Light.tsx`) */
  restTop?: () => number | null;
  frameRef?: RefObject<HTMLElement>;
}> = ({ onEnter, up, pull, restTop, frameRef }) => {
  /* The light rises into the window and lights its edge */
  const windowRef = useRef<HTMLDivElement>(null);
  return (
    <ProductFrame ref={frameRef}>
      <Stage $up={up}>
        <Window ref={windowRef} $up={up}>
          <View>
            <picture>
              <source media={PHONE_FOLD} srcSet={phoneShot} />
              <Shot
                src={productShot}
                alt="Playground up close, with the Counter sample open and its code in view"
                draggable={false}
              />
            </picture>
          </View>
        </Window>
        <Shade />
        <Place />
        <LightCta
          type="button"
          $up={up}
          onClick={onEnter}
          data-shot="landing-cta"
        >
          <Light on={up} frame={windowRef} pull={pull} restTop={restTop} />
          <Label>Open Playground</Label>
          <Icon />
        </LightCta>
      </Stage>
    </ProductFrame>
  );
};

/**
 * The first screen again, further round the loop: the same headline, product
 * and light, already built. The footer is one, with its own line, which
 * builds again each time the page arrives at it; the copy of the hero at the
 * bottom is the other, which the page goes round from.
 */
interface FirstScreenProps {
  steps: BuildStep[];
  onEnter: () => void;
  pull: RefObject<Pull>;
  restTop: () => number | null;
  /** Changed, the line builds again */
  replay?: number;
  /** The copy of the hero: seen only on the way round, so not read out */
  copy?: boolean;
}

const FirstScreen = forwardRef<HTMLDivElement, FirstScreenProps>(
  ({ steps, onEnter, pull, restTop, replay = 0, copy = false }, ref) => (
    <Screen ref={ref} aria-hidden={copy || undefined}>
      <Hero
        key={replay}
        steps={steps}
        settled
        scale={0.86}
        weight={500}
        leading={0.93}
        lift={LIFT}
        lifted
      />
      <Product onEnter={onEnter} up pull={pull} restTop={restTop} />
    </Screen>
  )
);

const Screen = styled.div`
  position: relative;
`;

/* ── the page ─────────────────────────────────────────────────────────── */

const TEXT = "#EDF1FF";

/* The page's faces, loaded by the page itself — it can be opened straight
   from a link, without the deck having loaded them first. A global rule,
   because an @import nested inside a component's styles is dropped. */
const LandingFonts = createGlobalStyle`
  @import url("https://fonts.googleapis.com/css2?family=Manrope:wght@300;400&family=Stack+Sans+Headline:wght@400..700&display=swap");
`;

const Page = styled.main`
  ${frameUnit}
  min-height: 100vh;
  background: ${INK};
  color: ${TEXT};
  font-family: "Manrope", -apple-system, BlinkMacSystemFont, "Segoe UI",
    sans-serif;
  /* Clip, not hidden: hidden would make the page its own scroller, and the
     button's hold on the bottom edge would be against the page, not the
     window */
  overflow-x: clip;
`;

const rise = keyframes`
  from { opacity: 0; transform: translate3d(0, 1.5rem, 0); }
  to   { opacity: 1; transform: translate3d(0, 0, 0); }
`;

/* ── the hero ─────────────────────────────────────────────────────────── */

/* The deck's hero, its letters re-timed to arrive trailing light */
const Hero = styled(BuildHero)`
  padding-top: ${u(54)};
  ${trailLetters("h1")}

  /* Pulled on, the headline goes first and furthest */
  & h1 {
    translate: 0 calc(var(--pull-head, 0) * -1 * ${u(PULL_HEAD)});
  }
`;

const Top = styled(TopBar)`
  animation: ${rise} 620ms cubic-bezier(0.22, 0.61, 0.24, 1) 120ms both;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

/* The top bar again, floating over the page once the product has gone by:
   the same pills, sliding in from above */
const FloatingTop = styled(TopBar)<{ $shown: boolean }>`
  ${({ $shown }) => css`
    position: fixed;
    top: max(${u(30)}, 0.75rem);
    left: 0;
    right: 0;
    z-index: 40;
    max-width: 1920px;
    margin: 0 auto;
    opacity: ${$shown ? 1 : 0};
    transform: translate3d(0, ${$shown ? "0" : "-180%"}, 0);
    pointer-events: ${$shown ? "auto" : "none"};
    transition: transform 560ms cubic-bezier(0.22, 1, 0.36, 1),
      opacity 320ms ease;

    @media (prefers-reduced-motion: reduce) {
      transition: opacity 200ms ease;
    }
  `}
`;

/* ── the product ──────────────────────────────────────────────────────── */

/* Pulled up into the first screen by as much of it as the product takes, and
   laid over the hero's ground rather than on a band of its own */
const ProductFrame = styled.section`
  position: relative;
  z-index: 3;
  max-width: 1920px;
  margin: calc(-1 * ${PRODUCT_PEEK}) auto 0;
  padding: 0 0 ${u(120)};

  @media (max-width: 56rem) {
    padding: 0 0 4rem;
  }
`;

/* The same curve the line rises on, so the two read as one movement */
const COME_UP = "1300ms cubic-bezier(0.22, 1, 0.36, 1)";

/* The render and the button across it, on the render's own proportions —
   below the first screen until the line has landed */
const Stage = styled.div<{ $up: boolean }>`
  ${({ $up }) => css`
    position: relative;
    width: ${u(1779)};
    margin: 0 auto;
    aspect-ratio: 3840 / 2160;
    opacity: ${$up ? 1 : 0};
    transform: ${$up
      ? "none"
      : `translate3d(0, calc(${PRODUCT_PEEK} + 12vh), 0)`};
    transition: transform ${COME_UP} 60ms, opacity 600ms ease 60ms;

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }

    @media (max-width: 56rem) {
      width: calc(100% - 2rem);
      aspect-ratio: auto;
    }
  `}
`;

/* The window's edge: one line of the ramp, radiating from the middle of its
   top edge — where the headline stands over it — and gone before the far
   sides, where the page's shade takes over. Over it, two lights, green and
   purple, that the button's light runs up the window's sides and over
   its top on its own clock (`Light.tsx`); standing, they rest on the top
   edge. The custom properties are theirs: where they are, how bright, and how
   bright the edge is. */
const OUTLINE = `radial-gradient(
    12% 18% at var(--ax, 22%) var(--ay, 0%),
    rgba(20, 241, 149, var(--lit, 0.5)),
    rgba(20, 241, 149, 0) 100%
  ),
  radial-gradient(
    12% 18% at var(--bx, 78%) var(--ay, 0%),
    rgba(153, 69, 255, var(--lit, 0.5)),
    rgba(153, 69, 255, 0) 100%
  ),
  radial-gradient(
    ellipse 64% 130% at 46% 0%,
    rgba(20, 241, 149, calc(0.95 * var(--edge, 0.8))) 0%,
    rgba(45, 206, 169, calc(0.8 * var(--edge, 0.8))) 18%,
    rgba(98, 104, 240, calc(0.62 * var(--edge, 0.8))) 40%,
    rgba(153, 69, 255, calc(0.45 * var(--edge, 0.8))) 62%,
    rgba(153, 69, 255, 0) 88%
  ),
  rgba(98, 104, 240, 0.14)`;

/* The product up close: the top left of Playground at half as large again as
   the brand slides show it — the sidebar, the assistant and the start of the
   code, near enough to read. In a window where the slides' render has its
   corner, rounded as that is; the window is its edge's colour, and one pixel
   of it shows round the view */
const Window = styled.div<{ $up: boolean }>`
  position: absolute;
  top: ${(138 / 2160) * 100}%;
  left: ${(150 / 3840) * 100}%;
  right: 0;
  bottom: 0;
  padding: 1px;
  border-radius: ${u(18)} 0 0 0;
  background: ${OUTLINE};
  /* Pulled on, the product follows the headline */
  translate: 0 calc(var(--pull-product, 0) * -1 * ${u(PULL_PRODUCT)});
  /* It comes up out of focus and sharpens as it lands, as the claims
     further down do */
  filter: ${({ $up }) => ($up ? "none" : `blur(${u(16)})`)};
  transition: filter 1200ms cubic-bezier(0.22, 1, 0.36, 1) 80ms;

  @media (prefers-reduced-motion: reduce) {
    filter: none;
    transition: none;
  }

  @media (max-width: 56rem) {
    position: relative;
    top: auto;
    left: auto;
    right: auto;
    bottom: auto;
    border-radius: 1rem;
  }

  /* On a phone, Playground as a phone has it: a square off the top of its
     code screen, under the screen's own corners — 55 points of 402 */
  @media (max-width: 40rem) {
    aspect-ratio: 1 / 1;
    border-radius: 13.6% 13.6% 1rem 1rem;
  }
`;

const View = styled.div`
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: calc(${u(18)} - 1px) 0 0 0;
  background: #101011;

  @media (max-width: 56rem) {
    border-radius: calc(1rem - 1px);
  }

  @media (max-width: 40rem) {
    border-radius: 13.6% 13.6% calc(1rem - 1px) calc(1rem - 1px);
  }

  & > picture {
    display: contents;
  }
`;

const Shot = styled.img`
  display: block;
  width: 100%;
  height: auto;
  user-select: none;

  @media (max-width: 40rem) {
    height: 100%;
    object-fit: cover;
    object-position: left top;
  }
`;

/* The render eases into the page on the right and at the bottom */
const Shade = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  translate: 0 calc(var(--pull-product, 0) * -1 * ${u(PULL_PRODUCT)});
  background: linear-gradient(
      90deg,
      rgba(21, 21, 21, 0) 60%,
      rgba(21, 21, 21, 0.7) 100%
    ),
    linear-gradient(to bottom, rgba(21, 21, 21, 0) 72%, ${INK} 99%);

  @media (max-width: 56rem) {
    display: none;
  }
`;

/* ── the button ───────────────────────────────────────────────────────── */

/* The button's place, the Figma's: 603 into the render. A block of its own
   rather than a margin on the button — a margin would fold through the render
   into the page's pull-up, and would fence the button out of the room it
   needs to hold against the bottom edge. */
const Place = styled.div`
  height: ${u(603)};

  @media (max-width: 56rem) {
    display: none;
  }
`;

const Label = styled.span`
  font-size: ${u(171.6)};
  font-weight: 500;
  line-height: 1;
  letter-spacing: -0.015em;
  white-space: nowrap;

  @media (max-width: 56rem) {
    font-size: clamp(1.375rem, 6.4vw, 2rem);
  }
`;

const Icon = styled(PlayRing)`
  width: ${u(212)};
  height: ${u(212)};
  flex-shrink: 0;

  @media (max-width: 56rem) {
    width: clamp(2.5rem, 11vw, 3.25rem);
    height: clamp(2.5rem, 11vw, 3.25rem);
  }
`;

/* How far above the fold the button rests while it is held
   there: exactly as far as its light runs on below it, so the light stands
   on the edge of the screen */
const FLOAT = 298 * LIGHT_BELOW;

/* The words and the icon rise into the light out of focus, the icon a beat
   after the words */
const wordsIn = keyframes`
  from {
    opacity: 0;
    transform: translate3d(0, ${u(56)}, 0);
    filter: blur(${u(14)});
  }
`;

const iconIn = keyframes`
  from {
    opacity: 0;
    transform: translate3d(0, ${u(56)}, 0) scale(0.92);
    filter: blur(${u(14)}) drop-shadow(0 0 ${u(26)} rgba(14, 10, 40, 0.4));
  }
`;

/* The words and the icon, in white, on the northern lights — the light is
   `Light`, drawn under them. The button itself is
   transparent, but it is still the whole row you press, focus and hover, on
   the Figma's 1779 × 298 and 603 into the render.

   It holds at the bottom of the screen, whole, its light rising out of the
   edge, until scrolling brings it to its place. The light comes up first and
   the words rise into it; both entrances fill backwards only, so the hover
   lift still works after. */
const LightCta = styled.button<{ $up: boolean }>`
  ${({ $up }) => css`
    position: sticky;
    bottom: ${u(FLOAT)};
    isolation: isolate;
    width: 100%;
    height: ${u(298)};
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 ${u(75)} 0 ${u(80)};
    border: none;
    border-radius: ${u(70)};
    background: none;
    color: #ffffff;
    font-family: ${HEADLINE};
    cursor: pointer;
    opacity: ${$up ? 1 : 0};
    -webkit-tap-highlight-color: transparent;

    & > ${Label}, & > ${Icon} {
      position: relative;
      /* Pulled on, the words go last and least, bouncing most */
      translate: 0 calc(var(--pull-words, 0) * -1 * ${u(PULL_WORDS)});
      transition: transform 480ms cubic-bezier(0.22, 0.61, 0.36, 1);
    }

    /* Legible on the brightest of the light: a soft shade close under the
       letters, never an outline */
    & > ${Label} {
      text-shadow: 0 0 ${u(34)} rgba(14, 10, 40, 0.42),
        0 ${u(2)} ${u(5)} rgba(14, 10, 40, 0.3);
      ${$up &&
      css`
        animation: ${wordsIn} 1000ms cubic-bezier(0.22, 1, 0.36, 1) 1050ms
          backwards;
      `}
    }

    & > ${Icon} {
      filter: blur(0px) drop-shadow(0 0 ${u(26)} rgba(14, 10, 40, 0.4));
      ${$up &&
      css`
        animation: ${iconIn} 1000ms cubic-bezier(0.22, 1, 0.36, 1) 1150ms
          backwards;
      `}
    }

    &:hover > ${Label}, &:hover > ${Icon} {
      transform: translate3d(0, ${u(-4)}, 0);
    }

    &:active > ${Label}, &:active > ${Icon} {
      transform: translate3d(0, 0, 0);
      transition-duration: 160ms;
    }

    &:focus-visible {
      outline: 2px solid rgba(255, 255, 255, 0.92);
      outline-offset: ${u(10)};
    }

    @media (prefers-reduced-motion: reduce) {
      & > ${Label}, & > ${Icon} {
        animation: none;
        transition: none;
      }
    }

    @media (max-width: 56rem) {
      position: relative;
      bottom: auto;
      height: 5.5rem;
      margin-top: 1.25rem;
      padding: 0 1.25rem 0 1.5rem;
      border-radius: 1.5rem;
    }
  `}
`;
