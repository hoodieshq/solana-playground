import { FC } from "react";
import styled, { css, keyframes } from "styled-components";

import { useReveal } from "./useReveal";

/**
 * The label-and-claim rows the Figma uses on the landing and on the UX page
 * alike: a label in the left column, the claim and a sentence or two in the
 * right, a hairline between each. One component, so the two pages cannot set
 * the same rows two ways.
 *
 * Values are the Figma's: Manrope, a light 34 on a 41.48 line at -2% for the
 * claim, 17 on 27.2 for the paragraph, 15 for the label; a 224 label column,
 * 64 apart, rows 71 above and 72 below their hairline.
 */

export interface Row {
  id: string;
  label: string;
  title: string;
  text: string;
}

const Rows: FC<{ rows: Row[]; className?: string }> = ({ rows, className }) => (
  <List className={className}>
    {rows.map((row) => (
      <RevealRow key={row.id} {...row} />
    ))}
  </List>
);

export default Rows;

/** One row, rising in as it is reached — the deck's entrance, a beat apart */
const RevealRow: FC<Row> = ({ id, label, title, text }) => {
  const [ref, shown] = useReveal<HTMLElement>();
  return (
    <Item id={id} ref={ref} $shown={shown}>
      <Label>{label}</Label>
      <Body>
        <Title>{title}</Title>
        <Text>{text}</Text>
      </Body>
    </Item>
  );
};

const FACE = `"Manrope", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
const TEXT = "#EDF1FF";
const MUTED = "rgba(237, 241, 255, 0.66)";

const rise = keyframes`
  from { opacity: 0; transform: translate3d(0, 0.9rem, 0); }
  to   { opacity: 1; transform: translate3d(0, 0, 0); }
`;

const entrance = (delay: number) => css`
  animation: ${rise} 620ms cubic-bezier(0.22, 0.61, 0.24, 1) ${delay}ms both;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
  max-width: 76rem;
  margin: 0 auto;
  padding: 9rem clamp(1.5rem, 5vw, 5rem);
  color: ${TEXT};
`;

const Item = styled.section<{ $shown: boolean }>`
  ${({ $shown }) => css`
    display: grid;
    grid-template-columns: 14rem 1fr;
    gap: 4rem;
    padding: 4.4375rem 0 4.5rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);

    &:first-child {
      border-top: none;
      padding-top: 0;
    }

    & > *,
    & > * > * {
      opacity: ${$shown ? 1 : 0};
    }

    ${$shown &&
    css`
      & > h2 {
        ${entrance(0)}
      }
      & > div > :nth-child(1) {
        ${entrance(90)}
      }
      & > div > :nth-child(2) {
        ${entrance(200)}
      }
    `}

    @media (prefers-reduced-motion: reduce) {
      & > *,
      & > * > * {
        opacity: 1;
      }
    }

    @media (max-width: 52rem) {
      grid-template-columns: 1fr;
      gap: 1rem;
      padding: 3rem 0;
    }
  `}
`;

const Label = styled.h2`
  margin: 0;
  font-family: ${FACE};
  font-size: 0.9375rem;
  font-weight: 400;
  color: ${MUTED};
`;

const Body = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 40rem;
`;

const Title = styled.p`
  margin: 0;
  font-family: ${FACE};
  font-size: clamp(1.625rem, 3vw, 2.125rem);
  font-weight: 300;
  line-height: 1.22;
  letter-spacing: -0.02em;
`;

const Text = styled.p`
  margin: 0;
  font-family: ${FACE};
  font-size: 1.0625rem;
  line-height: 1.6;
  color: ${MUTED};
`;
