import { FC } from "react";
import styled, { css, keyframes } from "styled-components";

import { Headline } from "../deck/Slide";
import { useReveal } from "./useReveal";

/**
 * Claims, one at a time, the way the presentation says things: a short line
 * set large in the headline face, arriving letter by letter as it is reached,
 * and a single quiet sentence under it. Each gets most of a screen to itself,
 * so a page of them reads like slides rather than like a document.
 *
 * Shared by the landing and the UX page, which say different things the same
 * way.
 */

export interface Statement {
  id: string;
  title: string;
  line: string;
}

const Statements: FC<{ items: Statement[]; className?: string }> = ({
  items,
  className,
}) => (
  <List className={className}>
    {items.map((item) => (
      <One key={item.id} {...item} />
    ))}
  </List>
);

export default Statements;

/* The line only goes onto the page once it is reached, so its letters arrive
   in front of the reader rather than out of sight */
const One: FC<Statement> = ({ id, title, line }) => {
  const [ref, shown] = useReveal<HTMLElement>();
  return (
    <Item id={id} ref={ref}>
      <Claim>
        {shown && (
          <Headline
            as="h2"
            lines={[title]}
            light={false}
            scale={0.36}
            weight={500}
            leading={1.04}
          />
        )}
      </Claim>
      <Line $shown={shown} $delay={Math.min(1400, 240 + title.length * 18)}>
        {line}
      </Line>
    </Item>
  );
};

const rise = keyframes`
  from { opacity: 0; transform: translate3d(0, 0.75rem, 0); }
  to   { opacity: 1; transform: translate3d(0, 0, 0); }
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
`;

/* Most of a screen each — the space is what makes it read as a statement */
const Item = styled.section`
  min-height: 72vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: clamp(1rem, 2vw, 1.75rem);
  padding: 4rem clamp(1.5rem, 6vw, 6rem);
  text-align: center;
`;

/* Held open before the claim arrives, so nothing below jumps when it does.
   Sized against the window rather than the deck's scale, so it stays a
   headline on a phone. */
const Claim = styled.div`
  width: min(100%, 20em);
  min-height: 2.1em;
  font-size: clamp(2rem, 4.1vw, 5rem);
  display: flex;
  align-items: center;
  justify-content: center;

  & > h2 {
    font-size: 1em;
  }
`;

const Line = styled.p<{ $shown: boolean; $delay: number }>`
  ${({ $shown, $delay }) => css`
    margin: 0;
    max-width: 34rem;
    font-family: "Manrope", -apple-system, BlinkMacSystemFont, sans-serif;
    font-size: clamp(1rem, 1.25vw, 1.25rem);
    line-height: 1.5;
    color: rgba(237, 241, 255, 0.66);
    opacity: 0;
    ${$shown &&
    css`
      animation: ${rise} 620ms cubic-bezier(0.22, 0.61, 0.24, 1) ${$delay}ms
        both;
    `}

    @media (prefers-reduced-motion: reduce) {
      animation: none;
      opacity: 1;
    }
  `}
`;
