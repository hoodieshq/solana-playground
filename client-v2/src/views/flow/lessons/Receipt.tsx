import type { FC } from "react";
import styled, { css } from "styled-components";

import { BASE_FEE_LAMPORTS, COMPUTE_LIMIT } from "./kora";
import type { KoraTx } from "./kora";
import { BRAND } from "../tokens";
import CopyText from "../components/CopyText";

const LAMPORTS_PER_SOL = 1_000_000_000;

/** A key or signature cut in the middle, as explorers show them */
export const short = (key: string) => `${key.slice(0, 6)}…${key.slice(-6)}`;

const sol = (lamports: number) =>
  (lamports / LAMPORTS_PER_SOL).toFixed(9).replace(/0+$/, "").replace(/\.$/, "");

const count = (n: number) => n.toLocaleString("en-US");

/**
 * One call of the tutorial's program, read the way an explorer would show
 * it: what ran, what it said back, and what it cost. The cost is the point:
 * the network fee is real money on mainnet, and here Kora pays it, so the
 * learner sees 0 SOL next to the figure they did not have to find.
 *
 * On the review stand the call is mocked (see `kora.ts`), so the figures are
 * dummies in devnet's shape and the receipt says so.
 */
const Receipt: FC<{ tx: KoraTx }> = ({ tx }) => {
  const fee = tx.feeLamports ?? BASE_FEE_LAMPORTS;
  const call =
    tx.name === null ? "hello()" : `hello(${JSON.stringify(tx.name)})`;

  return (
    <Wrapper aria-label="Transaction receipt" aria-live="polite">
      <Head>
        <Status>
          <Dot aria-hidden />
          Confirmed
        </Status>
        <HeadMeta>
          devnet · {new Date(tx.at).toLocaleTimeString()} · demo
        </HeadMeta>
      </Head>

      <Rows>
        <Row>
          <Key>Instruction</Key>
          <Value>
            <Mono>{call}</Mono>
          </Value>
        </Row>
        {tx.programId && (
          <Row>
            <Key>Program</Key>
            <Value>
              <Mono title={tx.programId}>{short(tx.programId)}</Mono>
              <CopyText text={tx.programId} label="program id" />
            </Value>
          </Row>
        )}
        <Row>
          <Key>Fee</Key>
          <Value>
            <Strong>0 SOL</Strong>
            <Muted>
              {sol(fee)} SOL network fee, paid by Kora
            </Muted>
          </Value>
        </Row>
        {tx.computeUnits !== undefined && (
          <Row>
            <Key>Compute</Key>
            <Value>
              <Mono>
                {count(tx.computeUnits)} of {count(COMPUTE_LIMIT)} units
              </Mono>
            </Value>
          </Row>
        )}
        {tx.slot !== undefined && (
          <Row>
            <Key>Slot</Key>
            <Value>
              <Mono>{count(tx.slot)}</Mono>
            </Value>
          </Row>
        )}
        <Row>
          <Key>Signature</Key>
          <Value>
            <Mono title={tx.signature}>{short(tx.signature)}</Mono>
            <CopyText text={tx.signature} label="signature" />
            <Explorer
              type="button"
              disabled
              title="A demo transaction: it never reached devnet, so Explorer has nothing to show"
            >
              Open in Explorer
            </Explorer>
          </Value>
        </Row>
      </Rows>

      <Logs aria-label="Program logs">
        <LogLine>Program log: Instruction: Hello</LogLine>
        <LogLine>
          Program log: <Said>{tx.said}</Said>
        </LogLine>
      </Logs>
    </Wrapper>
  );
};

export default Receipt;

const Wrapper = styled.section`
  ${({ theme }) => css`
    margin-top: 0.875rem;
    border: 1px solid ${theme.colors.default.border};
    border-radius: ${theme.default.borderRadius};
    text-align: left;
    overflow: hidden;
  `}
`;

const Head = styled.div`
  ${({ theme }) => css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.25rem 0.75rem;
    padding: 0.625rem 0.875rem;
    border-bottom: 1px solid ${theme.colors.default.border};
    background: ${theme.colors.state.hover.bg};
  `}
`;

const Status = styled.span`
  ${({ theme }) => css`
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: ${theme.colors.default.textPrimary};
  `}
`;

const Dot = styled.span`
  width: 0.4375rem;
  height: 0.4375rem;
  border-radius: 999px;
  background: ${BRAND.green};
`;

const HeadMeta = styled.span`
  ${({ theme }) => css`
    font-size: 0.75rem;
    color: ${theme.colors.default.textSecondary};
  `}
`;

const Rows = styled.dl`
  margin: 0;
  padding: 0.375rem 0.875rem;
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: 5.5rem 1fr;
  gap: 0.75rem;
  align-items: baseline;
  padding: 0.3125rem 0;

  @media (max-width: 420px) {
    grid-template-columns: 1fr;
    gap: 0.125rem;
  }
`;

const Key = styled.dt`
  ${({ theme }) => css`
    font-size: 0.75rem;
    color: ${theme.colors.default.textSecondary};
  `}
`;

const Value = styled.dd`
  margin: 0;
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.25rem 0.625rem;
`;

const Mono = styled.span`
  ${({ theme }) => css`
    font-family: ${theme.font.code.family};
    font-size: 0.8125rem;
    color: ${theme.colors.default.textPrimary};
    overflow-wrap: anywhere;
  `}
`;

const Strong = styled.span`
  ${({ theme }) => css`
    font-size: 0.8125rem;
    font-weight: 500;
    color: ${theme.colors.default.textPrimary};
  `}
`;

const Muted = styled.span`
  ${({ theme }) => css`
    font-size: 0.75rem;
    color: ${theme.colors.default.textSecondary};
  `}
`;

const Explorer = styled.button`
  ${({ theme }) => css`
    padding: 0;
    border: 0;
    background: none;
    font: inherit;
    font-size: 0.75rem;
    color: ${theme.colors.default.textSecondary};
    cursor: not-allowed;
  `}
`;

const Logs = styled.div`
  ${({ theme }) => css`
    padding: 0.625rem 0.875rem;
    border-top: 1px dashed ${theme.colors.default.border};
    font-family: ${theme.font.code.family};
    font-size: 0.8125rem;
    overflow-wrap: anywhere;
  `}
`;

const LogLine = styled.p`
  ${({ theme }) => css`
    margin: 0;
    color: ${theme.colors.default.textSecondary};
  `}
`;

const Said = styled.span`
  color: ${BRAND.green};
`;
