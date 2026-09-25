import {
  FC,
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import styled, { createGlobalStyle, css, keyframes } from "styled-components";

import Atmosphere from "./Atmosphere";
import type { Ground } from "./Atmosphere";
import { CARRY_MS, noteCarried } from "./carry";
import Slide, { SHOTS } from "./Slide";
import { SLIDES, isLight } from "./slides";
import { BODY, HEADLINE } from "./tokens";

/**
 * The design proposal, as a thing you present rather than a thing you scroll.
 *
 * One slide at a time, advanced by the keyboard, a click, the wheel or a
 * swipe — every way a person in front of a room actually advances a slide.
 * The deck ends on three signposts that hand off to the live product: the
 * landing, the product itself, and the evaluation of what it used to be.
 *
 * It is built in two layers, which is what lets it move the way the Figma
 * prototype does. Underneath, one ground that never unmounts — the gradient,
 * the pattern — and each slide only tells it where to go, so a change of slide
 * is the colour travelling rather than a cut. On top, the slide's content: the
 * outgoing slide stays for a moment and fades while the next one arrives, and
 * anything the two have in common is carried from one to the other.
 */

interface DeckProps {
  /** Leave the deck for the landing page */
  onLanding: () => void;
  /** Leave the deck for the product */
  onProduct: () => void;
  /** Leave the deck for the UX evaluation */
  onEvaluation: () => void;
}

/**
 * Chrome that belongs to a tool laid over the page rather than to the deck.
 *
 * Studio injects its toolkit into whatever it is proxying — the ribbon, the
 * annotation host, the component picker. Those want the clicks and the
 * keystrokes that land on them, and a deck that advances on every click takes
 * the note-taking click away before the note exists.
 */
const TOOL_CHROME =
  "#agentation-host,.ribbon,.ribshow,.studiobld,.cmp,.cmp-pin," +
  ".reelbar,.reelpanel,.reeltip,.reelhit,#anntoast";

/** Something is being typed into, so the deck has no business with the keys */
const typing = (el: Element | null) =>
  !!el &&
  (el.tagName === "INPUT" ||
    el.tagName === "TEXTAREA" ||
    el.tagName === "SELECT" ||
    (el as HTMLElement).isContentEditable);

/**
 * An overlay tool has the page. Studio's annotation puts `ann-on` on the root
 * element for exactly this — it says "something is laid over me" without the
 * deck needing to know what.
 */
const overlayHasThePage = () =>
  document.documentElement.classList.contains("ann-on");

/** How long the outgoing slide stays, which is as long as anything is moving */
const LEAVE_MS = Math.max(CARRY_MS, 900);

type Colour = Exclude<Ground, "paper" | "ink">;

/* The last colour the ground had, so that on white and on black the fields
   fade out from where they were. Before any colour at all — the white opening
   slides — it is the first colour to come, so the gradient blooms in place. */
const colourAt = (index: number): Colour => {
  const isColour = (g: Ground): g is Colour => g !== "paper" && g !== "ink";
  for (let i = index; i >= 0; i--) {
    const g = SLIDES[i].ground;
    if (isColour(g)) return g;
  }
  const next = SLIDES.find((s) => isColour(s.ground));
  return next && isColour(next.ground) ? next.ground : "haze";
};

const Deck: FC<DeckProps> = ({ onLanding, onProduct, onEvaluation }) => {
  const [index, setIndex] = useState(0);
  const [leaving, setLeaving] = useState<number | null>(null);
  /* Read by handlers that fire faster than React re-renders */
  const at = useRef(0);
  const current = useRef<HTMLDivElement>(null);
  const wheelLock = useRef(0);
  const touchFrom = useRef<number | null>(null);

  /* Whether the last move went forward — a timed slide only plays on when
     it was arrived at that way */
  const forward = useRef(true);

  const go = useCallback((next: number) => {
    const to = Math.max(0, Math.min(SLIDES.length - 1, next));
    if (to === at.current) return;
    /* Measured now, while the old slide is still the one on screen */
    noteCarried(current.current);
    forward.current = to > at.current;
    setLeaving(at.current);
    at.current = to;
    setIndex(to);
  }, []);

  /* Timed slides move on by themselves. Any other move in the meantime — a
     click, a key — replaces the timer rather than racing it. */
  useEffect(() => {
    const wait = SLIDES[index].auto;
    if (!wait || !forward.current) return;
    const t = window.setTimeout(() => go(index + 1), wait);
    return () => window.clearTimeout(t);
  }, [index, go]);

  useEffect(() => {
    if (leaving === null) return;
    const t = window.setTimeout(() => setLeaving(null), LEAVE_MS);
    return () => window.clearTimeout(t);
  }, [leaving, index]);

  /* The renders are the heaviest thing in the deck — one is almost 5 MB — and
     they sit near the end. Fetch them once the first slide is up, so none of
     them arrives in front of the room half loaded. */
  useEffect(() => {
    const t = window.setTimeout(() => {
      Object.values(SHOTS).forEach((src) => {
        const img = new Image();
        img.decoding = "async";
        img.src = src;
      });
    }, 600);
    return () => window.clearTimeout(t);
  }, []);

  const next = useCallback(() => go(at.current + 1), [go]);
  const prev = useCallback(() => go(at.current - 1), [go]);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      const target = ev.target as HTMLElement | null;

      /* Anything being typed into keeps its keys. Space is a space in a note,
         not the next slide, and the deck listens on the window so it would
         otherwise take it from a field it has never heard of. */
      if (typing(target) || target?.closest(TOOL_CHROME)) return;
      if (overlayHasThePage()) return;

      // A slide's own button has the keyboard when it is focused
      if (target?.tagName === "BUTTON" && (ev.key === " " || ev.key === "Enter")) {
        return;
      }
      switch (ev.key) {
        case "ArrowRight":
        case "PageDown":
        case " ":
          ev.preventDefault();
          next();
          break;
        case "ArrowLeft":
        case "PageUp":
          ev.preventDefault();
          prev();
          break;
        case "Home":
          ev.preventDefault();
          go(0);
          break;
        case "End":
          ev.preventDefault();
          go(SLIDES.length - 1);
          break;
        default:
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, go]);

  /* A trackpad sends a burst of events per gesture, so one gesture would
     otherwise run the whole deck. Lock out the rest of the burst. */
  const onWheel = (ev: React.WheelEvent) => {
    if (overlayHasThePage()) return;
    const now = Date.now();
    if (now - wheelLock.current < 600) return;
    if (Math.abs(ev.deltaY) < 12 && Math.abs(ev.deltaX) < 12) return;
    wheelLock.current = now;
    (ev.deltaY > 0 || ev.deltaX > 0 ? next : prev)();
  };

  /* Click anywhere to advance — except on something that is itself a control.
     Asking the event where it landed has no stacking order to get wrong. */
  const onClick = (ev: React.MouseEvent) => {
    const el = ev.target as HTMLElement | null;
    if (el?.closest("button, a, [role='button']")) return;
    if (el?.closest(TOOL_CHROME)) return;
    /* While a tool is laid over the page, a click on a slide is that tool's —
       it is how you pin a note to the thing you are pointing at. Advancing
       would move the slide out from under the note. */
    if (overlayHasThePage()) return;
    next();
  };

  const onTouchStart = (ev: React.TouchEvent) => {
    touchFrom.current = ev.touches[0].clientX;
  };
  const onTouchEnd = (ev: React.TouchEvent) => {
    if (touchFrom.current === null) return;
    if (overlayHasThePage()) {
      touchFrom.current = null;
      return;
    }
    const dx = ev.changedTouches[0].clientX - touchFrom.current;
    touchFrom.current = null;
    if (Math.abs(dx) > 48) (dx < 0 ? next : prev)();
  };

  const slide = SLIDES[index];
  const light = isLight(slide);
  const out = leaving !== null && leaving !== index ? leaving : null;
  /* Between two pictures the outgoing one holds until the next has covered
     it; fading both at once would show the ground through the middle of the
     change. Anywhere else it fades. */
  const hold = out !== null && SLIDES[out].kind === "image" && slide.kind === "image";

  return (
    <Stage
      onClick={onClick}
      onWheel={onWheel}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      role="region"
      aria-roledescription="presentation"
      aria-label="Design proposal"
    >
      <DeckFont />

      <Atmosphere
        ground={slide.ground}
        lastColour={colourAt(index)}
        pattern={!!slide.grid}
      />

      {/* Keyed by slide, and the outgoing one rendered first, so React keeps
          the very element that was on screen and only changes its role. */}
      {[out, index]
        .filter((i): i is number => i !== null)
        .map((i) => (
          <Layer
            key={SLIDES[i].id}
            ref={i === index ? current : undefined}
            leaving={i !== index}
            hold={hold}
          >
            <Slide
              slide={SLIDES[i]}
              onLanding={onLanding}
              onProduct={onProduct}
              onEvaluation={onEvaluation}
            />
          </Layer>
        ))}

      <Rail aria-hidden="true">
        {SLIDES.map((s, i) => (
          <Tick
            key={s.id}
            type="button"
            aria-label={`Slide ${i + 1}`}
            $on={i === index}
            $dark={light}
            onClick={() => go(i)}
          />
        ))}
      </Rail>

      <Count $dark={light}>
        {index + 1} / {SLIDES.length}
      </Count>
    </Stage>
  );
};

export default Deck;

/**
 * One slide's content. When it becomes the outgoing slide it fades — or holds,
 * between two pictures — and if it comes back before it is gone, anything the
 * next slide carried away from it is put back.
 */
const Layer = forwardRef<
  HTMLDivElement,
  { leaving: boolean; hold: boolean; children: React.ReactNode }
>(({ leaving, hold, children }, ref) => {
  const own = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (leaving || !own.current) return;
    own.current
      .querySelectorAll<HTMLElement>("[data-carry]")
      .forEach((el) => (el.style.visibility = ""));
  }, [leaving]);

  const attach = (el: HTMLDivElement | null) => {
    own.current = el;
    if (typeof ref === "function") ref(el);
    else if (ref) ref.current = el;
  };

  return (
    <LayerBox
      ref={attach}
      $leaving={leaving}
      $hold={hold}
      data-leaving={leaving ? "" : undefined}
      data-current={leaving ? undefined : ""}
      aria-hidden={leaving || undefined}
    >
      {children}
    </LayerBox>
  );
});

const LayerBox = styled.div<{ $leaving: boolean; $hold: boolean }>`
  ${({ $leaving, $hold }) => css`
    position: absolute;
    inset: 0;
    pointer-events: ${$leaving ? "none" : "auto"};
    ${$leaving &&
    !$hold &&
    css`
      animation: ${fadeOut} 520ms cubic-bezier(0.4, 0, 0.6, 1) both;
    `}

    @media (prefers-reduced-motion: reduce) {
      animation: none;
      ${$leaving && "opacity: 0;"}
    }
  `}
`;

const fadeOut = keyframes`
  from { opacity: 1; }
  to   { opacity: 0; }
`;

/* The headline face, loaded once for the whole deck — variable on weight
   between 400 and 700, the range Google serves for it — and Inter, which the
   cards slide is set in. */
const DeckFont = createGlobalStyle`
  @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400&family=Stack+Sans+Headline:wght@400..700&display=swap");
`;

const Stage = styled.div`
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: #151515;
  font-family: ${BODY};
  /* The deck owns the window; nothing behind it should scroll */
  touch-action: none;
  user-select: none;
  cursor: e-resize;

  /* ...unless a tool is laid over it, in which case the deck is the subject
     and not the interface: the cursor stops promising to advance, and text
     becomes selectable so a note can quote it. */
  html.ann-on & {
    cursor: default;
    user-select: text;
  }
`;

const Rail = styled.div`
  position: absolute;
  left: 50%;
  bottom: 1.75rem;
  transform: translateX(-50%);
  display: flex;
  gap: 0.375rem;
  z-index: 2;
`;

const Tick = styled.button<{ $on: boolean; $dark: boolean }>`
  ${({ $on, $dark }) => css`
    width: ${$on ? "1.75rem" : "0.375rem"};
    height: 0.375rem;
    padding: 0;
    border: none;
    border-radius: 999px;
    background: ${$dark
      ? `rgba(0, 0, 0, ${$on ? 0.75 : 0.18})`
      : `rgba(255, 255, 255, ${$on ? 0.9 : 0.28})`};
    cursor: pointer;
    transition: width 320ms cubic-bezier(0.22, 0.61, 0.24, 1),
      background 200ms ease;

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  `}
`;

const Count = styled.div<{ $dark: boolean }>`
  ${({ $dark }) => css`
    position: absolute;
    right: 1.75rem;
    bottom: 1.6rem;
    z-index: 2;
    font-family: ${HEADLINE};
    font-size: 0.8125rem;
    letter-spacing: 0.02em;
    color: ${$dark ? "rgba(0, 0, 0, 0.42)" : "rgba(255, 255, 255, 0.55)"};
    transition: color 300ms ease;
  `}
`;
