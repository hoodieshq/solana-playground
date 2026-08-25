import type { FC } from "react";
import { useState } from "react";
import styled, { css } from "styled-components";

import {
  useBalance,
  useConnection,
  useRenderOnChange,
  useWallet,
} from "../../../hooks";
import { PgCommand, PgConnection, PgGithubAuth } from "../../../utils";

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
  useRenderOnChange(PgGithubAuth.onDidChange);
  const [authError, setAuthError] = useState<string | null>(null);
  const github = PgGithubAuth.user;

  const signIn = async () => {
    setAuthError(null);
    try {
      await PgGithubAuth.signIn();
    } catch (e) {
      setAuthError((e as Error).message);
    }
  };

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
      {github ? (
        <GithubChip
          type="button"
          onClick={() => PgGithubAuth.signOut()}
          title={`Signed in as ${github.login} - click to sign out`}
          aria-label={`GitHub: ${github.login}. Sign out`}
        >
          <Avatar src={github.avatarUrl} alt="" aria-hidden />
          <span>{github.login}</span>
        </GithubChip>
      ) : (
        <GithubChip
          type="button"
          onClick={signIn}
          aria-label="Sign in with GitHub"
        >
          <GithubMark />
          <span>Sign in</span>
        </GithubChip>
      )}
      {authError && (
        <AuthError role="alert" title={authError}>
          {authError}
        </AuthError>
      )}
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

// Kept as one unbroken path string -- see the note above `GearIcon`
// about manual line wrapping breaking SVG path data mid-render.
const GITHUB_MARK_PATH =
  "M8 .2a8 8 0 0 0-2.5 15.6c.4 0 .5-.2.5-.4v-1.4c-2 .4-2.5-.9-2.5-.9" +
  "-.4-.9-.9-1.2-.9-1.2-.7-.5.1-.5.1-.5.8.1 1.2.9 1.2.9.7 1.2 1.9.9" +
  " 2.4.7 0-.5.3-.9.5-1.1-1.8-.2-3.7-.9-3.7-4a3 3 0 0 1 .8-2.1 2.9" +
  " 2.9 0 0 1 .1-2.1s.7-.2 2.2.8a7.6 7.6 0 0 1 4 0c1.5-1 2.2-.8" +
  " 2.2-.8.3.7.3 1.5.1 2.1a3 3 0 0 1 .8 2.1c0 3.1-1.9 3.8-3.7 4" +
  " .3.3.6.8.6 1.5v2.1c0 .2.1.4.5.4A8 8 0 0 0 8 .2Z";

const GithubMark: FC = () => (
  <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden>
    <path fill="currentColor" d={GITHUB_MARK_PATH} />
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

const GithubChip = styled(WalletChip)``;

const Avatar = styled.img`
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
`;

const AuthError = styled.span`
  ${({ theme }) => css`
    color: ${theme.colors.state.error.color};
    font-size: ${theme.font.code.size.xsmall};
    white-space: nowrap;
    max-width: 16rem;
    overflow: hidden;
    text-overflow: ellipsis;
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
