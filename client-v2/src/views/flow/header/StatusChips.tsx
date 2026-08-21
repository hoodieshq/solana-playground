import type { FC } from "react";
import styled, { css } from "styled-components";

import {
  useBalance,
  useConnection,
  useRenderOnChange,
  useWallet,
} from "../../../hooks";
import { PgCommand, PgConnection } from "../../../utils";

interface StatusChipsProps {
  onOpenSettings: () => void;
}

const shortenPk = (s: string) => `${s.slice(0, 4)}...${s.slice(-4)}`;

/** Cluster, wallet + balance and a settings entry point. */
const StatusChips: FC<StatusChipsProps> = ({ onOpenSettings }) => {
  const connection = useConnection();
  const wallet = useWallet();
  const balance = useBalance();
  const cluster = useRenderOnChange(PgConnection.onDidChangeCluster);
  const isClusterDown = useRenderOnChange(
    PgConnection.onDidChangeIsClusterDown
  );

  return (
    <Wrapper>
      <Chip title={connection?.rpcEndpoint}>
        <ClusterDot $down={isClusterDown === true} />
        {cluster ?? "unknown"}
      </Chip>
      <WalletChip
        type="button"
        onClick={() => PgCommand.connect.execute()}
        aria-label={wallet ? "Toggle wallet" : "Connect wallet"}
      >
        {wallet ? (
          <>
            <span>{shortenPk(wallet.publicKey.toBase58())}</span>
            <Balance>
              {typeof balance === "number"
                ? `${balance.toFixed(2)} SOL`
                : "..."}
            </Balance>
          </>
        ) : (
          "Connect wallet"
        )}
      </WalletChip>
      <IconButton aria-label="Open settings" onClick={onOpenSettings}>
        <GearIcon />
      </IconButton>
    </Wrapper>
  );
};

export default StatusChips;

// Three slider tracks with knobs -- avoids a hand-authored gear path (a
// version of that broke mid-render because of manual line wrapping).
const GearIcon: FC = () => (
  <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
    <g stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
      <line x1="2" y1="3.5" x2="14" y2="3.5" />
      <line x1="2" y1="8" x2="14" y2="8" />
      <line x1="2" y1="12.5" x2="14" y2="12.5" />
    </g>
    <circle cx="10" cy="3.5" r="1.6" fill="currentColor" />
    <circle cx="5" cy="8" r="1.6" fill="currentColor" />
    <circle cx="11" cy="12.5" r="1.6" fill="currentColor" />
  </svg>
);

const Wrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const Chip = styled.span`
  ${({ theme }) => css`
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.25rem 0.625rem;
    border: 1px solid ${theme.colors.default.border};
    border-radius: 999px;
    font-family: ${theme.font.code.family};
    font-size: ${theme.font.code.size.small};
    color: ${theme.colors.default.textSecondary};
    white-space: nowrap;
  `}
`;

// A `<button>` with `Chip`'s look -- kept as its own styled component
// (rather than `Chip` rendered with a polymorphic `as="button"`) so the
// native button props (`type`, `onClick`) type-check without a fight.
const WalletChip = styled.button`
  ${({ theme }) => css`
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.25rem 0.625rem;
    border: 1px solid ${theme.colors.default.border};
    border-radius: 999px;
    background: transparent;
    color: ${theme.colors.default.textSecondary};
    font-family: ${theme.font.code.family};
    font-size: ${theme.font.code.size.small};
    white-space: nowrap;
    cursor: pointer;
    transition: background 140ms ease, color 140ms ease;

    &:hover {
      background: ${theme.colors.default.bgSecondary};
      color: ${theme.colors.default.textPrimary};
    }
    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
      outline-offset: 2px;
    }

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  `}
`;

const Balance = styled.span`
  color: ${({ theme }) => theme.colors.state.success.color};
`;

const ClusterDot = styled.span<{ $down: boolean }>`
  ${({ theme, $down }) => css`
    width: 0.4rem;
    height: 0.4rem;
    border-radius: 50%;
    background: ${$down
      ? theme.colors.state.error.color
      : theme.colors.state.success.color};
  `}
`;

const IconButton = styled.button`
  ${({ theme }) => css`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: 1px solid ${theme.colors.default.border};
    border-radius: 50%;
    background: transparent;
    color: ${theme.colors.default.textSecondary};
    cursor: pointer;
    transition: background 140ms ease, color 140ms ease;

    &:hover {
      background: ${theme.colors.default.bgSecondary};
      color: ${theme.colors.default.textPrimary};
    }
    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
      outline-offset: 2px;
    }

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  `}
`;
