import { FC, useCallback, useEffect, useRef, useState } from "react";
import styled, { createGlobalStyle, css, keyframes } from "styled-components";

import Slide from "./Slide";
import { SLIDES } from "./slides";
import { BODY, HEADLINE, INK } from "./tokens";

/**
 * The design proposal, as a thing you present rather than a thing you scroll.
 *
 * One slide at a time, advanced by the keyboard, a click, the wheel or a
 * swipe — every way a person in front of a room actually advances a slide.
 * The deck is a linear argument (what this is, what the mark became, what it
 * says) and ends on three signposts that hand off to the live product: the
 * landing, the product itself, and the evaluation of what it used to be.
 *
 * Those last three are not links buried in a slide. They are the point of the
 * whole build — the deck exists so that the thing it is arguing about is one
 * key away, rather than a screenshot of itself.
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

const Deck: FC<DeckProps> = ({ onLanding, onProduct, onEvaluation }) => {
  const [index, setIndex] = useState(0);
  /* Which way the last move went, so a slide arrives from the side it should */
  const [back, setBack] = useState(false);
  const wheelLock = useRef(0);
  const touchFrom = useRef<number | null>(null);

  const go = useCallback((next: number) => {
    setIndex((current) => {
      const clamped = Math.max(0, Math.min(SLIDES.length - 1, next));
      setBack(clamped < current);
      return clamped;
    });
  }, []);

  const next = useCallback(() => go(index + 1), [go, index]);
  const prev = useCallback(() => go(index - 1), [go, index]);

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
     This was an invisible full-bleed button, which sat *over* the slide's own
     CTA: it is a later sibling with z-index 0 against a frame at auto, so it
     painted on top and swallowed the one click that mattered. Asking the
     event where it landed has no stacking order to get wrong. */
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

      {/* Keyed, so React tears the old slide down and the animation runs */}
      <Frame key={index} $back={back}>
        <Slide
          slide={slide}
          onLanding={onLanding}
          onProduct={onProduct}
          onEvaluation={onEvaluation}
        />
      </Frame>

      <Rail aria-hidden="true">
        {SLIDES.map((s, i) => (
          <Tick
            key={s.id}
            type="button"
            aria-label={`Slide ${i + 1}`}
            $on={i === index}
            $dark={slide.ground === "paper"}
            onClick={() => go(i)}
          />
        ))}
      </Rail>

      <Count $dark={slide.ground === "paper"}>
        {index + 1} / {SLIDES.length}
      </Count>
    </Stage>
  );
};

export default Deck;

/* The headline face, loaded once for the whole deck. Variable on weight
   between 400 and 700, which is the range Google serves for it. */
const DeckFont = createGlobalStyle`
  @import url("https://fonts.googleapis.com/css2?family=Stack+Sans+Headline:wght@400..700&display=swap");
`;

const Stage = styled.div`
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: ${INK};
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

const arrive = (from: string) => keyframes`
  from { opacity: 0; transform: translate3d(${from}, 0, 0) scale(0.985); }
  to   { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
`;

const Frame = styled.div<{ $back: boolean }>`
  ${({ $back }) => css`
    position: absolute;
    inset: 0;
    animation: ${arrive($back ? "-3%" : "3%")} 520ms
      cubic-bezier(0.22, 0.61, 0.24, 1) both;

    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }
  `}
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
  `}
`;
