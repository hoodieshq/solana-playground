import { FC } from "react";
import styled, { createGlobalStyle, css } from "styled-components";

import { FINDINGS } from "./findings";
import {
  BODY,
  GRID_PITCH,
  GREEN,
  HEADLINE,
  INK,
  PAPER,
  PURPLE,
  grid,
} from "../deck/tokens";

/**
 * The evaluation: what the product's interface was, what it is now, and the
 * reason each thing moved.
 *
 * Every entry here is a change that actually shipped in this build, with the
 * mechanism named rather than an adjective. "Cleaner" is not a finding; "a bar
 * that existed in one view and not the other, so the start screen drew a
 * second one of its own" is. That is the difference between a design review
 * somebody can argue with and one they can only nod at.
 *
 * Three of these were found by doing the design pass, not by testing — which
 * is the argument for the pass, so they are marked.
 */

interface EvaluationProps {
  onBack: () => void;
  onProduct: () => void;
}

const Evaluation: FC<EvaluationProps> = ({ onBack, onProduct }) => (
  <Page>
    <EvalFont />

    <Bar>
      <Back type="button" onClick={onBack}>
        <BackGlyph aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 6 9 12l5.5 6" />
          </svg>
        </BackGlyph>
        Back
      </Back>
      <Open type="button" onClick={onProduct}>
        Open the product
      </Open>
    </Bar>

    <Head>
      <Title>
        UX evaluation
      </Title>
      <Lede>
        Every change below shipped in this build. Each one names what the
        interface did before, what it does now, and the mechanism that made the
        old behaviour wrong — not an adjective.
      </Lede>
      <Stats>
        <Stat>
          <StatFigure>{FINDINGS.length}</StatFigure>
          <StatLabel>changes reviewed</StatLabel>
        </Stat>
        <Stat>
          <StatFigure>{FINDINGS.filter((f) => f.bug).length}</StatFigure>
          <StatLabel>bugs the design pass found</StatLabel>
        </Stat>
        <Stat>
          <StatFigure>70</StatFigure>
          <StatLabel>files touched in one pass</StatLabel>
        </Stat>
      </Stats>
    </Head>

    <List>
      {FINDINGS.map((f, i) => (
        <Item key={f.id}>
          <Index aria-hidden="true">{String(i + 1).padStart(2, "0")}</Index>
          <Body>
            <ItemHead>
              <ItemTitle>{f.title}</ItemTitle>
              <Tags>
                <Tag>{f.area}</Tag>
                {f.bug && <Tag $bug>found by the pass</Tag>}
              </Tags>
            </ItemHead>

            <Pair>
              <Side>
                <SideLabel $was>Was</SideLabel>
                <SideText>{f.was}</SideText>
              </Side>
              <Side>
                <SideLabel>Is</SideLabel>
                <SideText>{f.is}</SideText>
              </Side>
            </Pair>

            <Why>{f.why}</Why>
          </Body>
        </Item>
      ))}
    </List>

    <Foot>
      <FootLine>
        The three marked entries were not reported by anyone using the product.
        They surfaced because somebody looked at the interface closely enough to
        notice it was broken.
      </FootLine>
      <Open type="button" onClick={onProduct}>
        Open the product
      </Open>
    </Foot>
  </Page>
);

export default Evaluation;

const EvalFont = createGlobalStyle`
  @import url("https://fonts.googleapis.com/css2?family=Stack+Sans+Headline:wght@400..700&display=swap");
`;

const Page = styled.div`
  position: fixed;
  inset: 0;
  overflow-y: auto;
  background: ${INK};
  background-image: ${grid(0.045)};
  background-size: ${GRID_PITCH} ${GRID_PITCH};
  color: ${PAPER};
  font-family: ${BODY};
  font-weight: 300;
`;

const Bar = styled.div`
  position: sticky;
  top: 0;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  height: 3.25rem;
  padding: 0 clamp(1rem, 4vw, 3rem);
  background: linear-gradient(${INK} 55%, transparent);
`;

const Back = styled.button`
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.4rem 0.7rem 0.4rem 0.45rem;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: rgba(255, 255, 255, 0.62);
  font-family: inherit;
  font-size: 0.875rem;
  cursor: pointer;

  &:hover {
    background: rgba(255, 255, 255, 0.07);
    color: ${PAPER};
  }
`;

const BackGlyph = styled.span`
  display: flex;
  width: 1rem;
  height: 1rem;

  & > svg {
    width: 100%;
    height: 100%;
  }
`;

const Open = styled.button`
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 999px;
  background: ${PAPER};
  color: ${INK};
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: transform 160ms ease;

  &:hover {
    transform: translateY(-1px);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const Measure = css`
  width: min(64rem, 100%);
  margin: 0 auto;
  padding-left: clamp(1rem, 4vw, 3rem);
  padding-right: clamp(1rem, 4vw, 3rem);
`;

const Head = styled.header`
  ${Measure}
  padding-top: clamp(2rem, 7vw, 6rem);
  padding-bottom: clamp(2rem, 5vw, 4rem);
`;

const Title = styled.h1`
  margin: 0;
  font-family: ${HEADLINE};
  font-weight: 400;
  font-size: clamp(2.5rem, 8vw, 7rem);
  line-height: 0.9;
  letter-spacing: -0.015em;
`;

const Lede = styled.p`
  margin: clamp(1.25rem, 3vw, 2rem) 0 0;
  max-width: 44rem;
  font-size: clamp(0.9375rem, 1.35vw, 1.125rem);
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.66);
`;

const Stats = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: clamp(1.5rem, 5vw, 4rem);
  margin-top: clamp(2rem, 5vw, 3.5rem);
  padding-top: clamp(1.5rem, 3vw, 2.25rem);
  border-top: 1px solid rgba(255, 255, 255, 0.12);
`;

const Stat = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const StatFigure = styled.div`
  font-family: ${HEADLINE};
  font-size: clamp(1.75rem, 3.6vw, 3rem);
  line-height: 1;
  background: linear-gradient(100deg, ${GREEN}, ${PURPLE});
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const StatLabel = styled.div`
  font-size: 0.8125rem;
  color: rgba(255, 255, 255, 0.5);
`;

const List = styled.ol`
  ${Measure}
  list-style: none;
  margin: 0;
  padding-top: 0;
  padding-bottom: clamp(2rem, 6vw, 5rem);
`;

const Item = styled.li`
  display: grid;
  grid-template-columns: auto 1fr;
  gap: clamp(1rem, 3vw, 2.5rem);
  padding: clamp(1.75rem, 4vw, 3rem) 0;
  border-top: 1px solid rgba(255, 255, 255, 0.1);

  @media (max-width: 36rem) {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
`;

const Index = styled.div`
  font-family: ${HEADLINE};
  font-size: clamp(0.875rem, 1.2vw, 1rem);
  line-height: 1.9;
  color: rgba(255, 255, 255, 0.3);
`;

const Body = styled.div`
  min-width: 0;
`;

const ItemHead = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
`;

const ItemTitle = styled.h2`
  margin: 0;
  font-family: ${HEADLINE};
  font-weight: 400;
  font-size: clamp(1.25rem, 2.4vw, 2rem);
  line-height: 1.12;
  letter-spacing: -0.01em;
`;

const Tags = styled.div`
  display: flex;
  gap: 0.375rem;
  flex-shrink: 0;
`;

const Tag = styled.span<{ $bug?: boolean }>`
  ${({ $bug }) => css`
    padding: 0.2rem 0.55rem;
    border: 1px solid
      ${$bug ? "rgba(20, 241, 149, 0.4)" : "rgba(255, 255, 255, 0.16)"};
    border-radius: 999px;
    font-size: 0.6875rem;
    letter-spacing: 0.01em;
    white-space: nowrap;
    color: ${$bug ? GREEN : "rgba(255, 255, 255, 0.5)"};
  `}
`;

const Pair = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(0.75rem, 2vw, 1.5rem);
  margin-top: clamp(1rem, 2vw, 1.5rem);

  @media (max-width: 44rem) {
    grid-template-columns: 1fr;
  }
`;

const Side = styled.div`
  padding: clamp(0.875rem, 1.6vw, 1.25rem);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.025);
`;

const SideLabel = styled.div<{ $was?: boolean }>`
  ${({ $was }) => css`
    margin-bottom: 0.4rem;
    font-size: 0.6875rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: ${$was ? "rgba(255, 255, 255, 0.38)" : GREEN};
  `}
`;

const SideText = styled.p`
  margin: 0;
  font-size: clamp(0.8125rem, 1.1vw, 0.9375rem);
  line-height: 1.55;
  color: rgba(255, 255, 255, 0.78);
`;

const Why = styled.p`
  margin: clamp(0.875rem, 1.8vw, 1.25rem) 0 0;
  font-size: clamp(0.8125rem, 1.1vw, 0.9375rem);
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.55);
`;

const Foot = styled.footer`
  ${Measure}
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  padding-top: clamp(2rem, 4vw, 3rem);
  padding-bottom: clamp(3rem, 8vw, 7rem);
  border-top: 1px solid rgba(255, 255, 255, 0.12);
`;

const FootLine = styled.p`
  margin: 0;
  max-width: 34rem;
  font-size: 0.9375rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.6);
`;
