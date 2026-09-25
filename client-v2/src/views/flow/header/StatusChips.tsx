import type { FC } from "react";
import { useContext, useEffect, useRef, useState } from "react";
import styled, { css } from "styled-components";

import BrandIcon from "../../../components/BrandIcon";
import {
  useBalance,
  useConnection,
  useKeybind,
  useRenderOnChange,
  useWallet,
} from "../../../hooks";
import { PgSession } from "../../../features/auth";
import { PgConnection, PgView, PgWallet } from "../../../utils";
import NavMenu, { anchorTo } from "../nav/NavMenu";
import type { NavMenuAnchor, NavMenuGroup } from "../nav/NavMenu";
import SetupChecklist from "../nav/SetupChecklist";
import type { SetupStep } from "../nav/SetupChecklist";
import { ICONS } from "../nav/icons";
import {
  fadeIn,
  Glyph,
  Label,
  NavContext,
  RailButton,
  Row,
  shortcut,
} from "../nav/parts";
import { SETTINGS_TRIGGER_ATTR } from "../settings/GearSidebar";
import type { SettingsFocus } from "../settings/GearSidebar";
import { openConnectDialog } from "../../sidebar/assistant/Component/ConnectDialog";
import { PgAssistant } from "../../sidebar/assistant/store";

interface StatusChipsProps {
  onToggleSettings: (focus?: SettingsFocus) => void;
  settingsOpen: boolean;
}

const DOCS_URL = "https://solana.com/docs";
const BUG_URL =
  "https://github.com/solana-playground/solana-playground/issues/new/choose";

const shortenPk = (s: string) => `${s.slice(0, 4)}…${s.slice(-4)}`;

/** "devnet" reads "Devnet", "mainnet-beta" reads "Mainnet Beta" */
const clusterLabel = (cluster: string) =>
  cluster
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

/**
 * The session, at the foot of the sidebar: the cluster, and one row for who
 * you are that opens everything else.
 *
 * It was a strip of pills — cluster, wallet, sign-in, a settings gear — which
 * the sidebar then restyled into rows. Claude's answer is a single account row
 * whose menu holds the rest, and that is what this is now: the account and
 * sign-in, Settings, Docs and Report a bug, the wallet, the proposal's two
 * doors, and Sign out. The cluster stays outside it, because which network
 * you are on is something you should never have to open a menu to see.
 *
 * Above the rule sits "Get set up", while there is anything left to set up —
 * its steps are this session's flows, so they are built here.
 *
 * On the rail the same controls fold to two squares: the cluster's dot and the
 * avatar, whose menu opens beside the rail.
 */
const StatusChips: FC<StatusChipsProps> = ({
  onToggleSettings,
  settingsOpen,
}) => {
  const { collapsed, animate } = useContext(NavContext);
  const connection = useConnection();
  const wallet = useWallet();
  const balance = useBalance();
  const cluster = useRenderOnChange(PgConnection.onDidChangeCluster);
  const isClusterDown = useRenderOnChange(
    PgConnection.onDidChangeIsClusterDown
  );
  useRenderOnChange(PgSession.onDidChange);
  const github = PgSession.get();
  // The store announces every streamed token; this only needs the one flag,
  // and setting an unchanged boolean renders nothing
  const [assistantReady, setAssistantReady] = useState(
    () => PgAssistant.isConnected
  );
  useEffect(() => {
    const sync = () => setAssistantReady(PgAssistant.isConnected);
    sync();
    return PgAssistant.onDidChange(sync).dispose;
  }, []);

  const [authError, setAuthError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const [menu, setMenu] = useState<{
    anchor: NavMenuAnchor;
    from: HTMLElement;
  } | null>(null);
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const accountRef = useRef<HTMLButtonElement>(null);

  // What the menu's Settings row says it is
  useKeybind("Ctrl+,", () => onToggleSettings());

  // The menu hangs off a row that moves when the column folds, and settings
  // covers the column entirely
  useEffect(() => {
    setMenu(null);
    setConfirmingSignOut(false);
  }, [collapsed, settingsOpen]);

  const closeMenu = () => {
    setMenu(null);
    setConfirmingSignOut(false);
  };

  const toggleMenu = () => {
    const el = accountRef.current;
    if (menu || !el) {
      closeMenu();
      return;
    }
    setMenu({ anchor: anchorTo(el, collapsed ? "right" : "above"), from: el });
  };

  const signIn = async () => {
    setAuthError(null);
    setSigningIn(true);
    try {
      await PgSession.signIn();
    } catch (e) {
      setAuthError((e as Error).message);
    } finally {
      setSigningIn(false);
    }
  };

  const openNetwork = () => onToggleSettings("network");
  const clusterName = cluster ? clusterLabel(cluster) : "Unknown";
  const clusterDown = isClusterDown === true;
  const address = wallet ? shortenPk(wallet.publicKey.toBase58()) : null;
  const sol =
    typeof balance === "number" ? `${balance.toFixed(2)} SOL` : "… SOL";

  const name = github
    ? github.name ?? github.login ?? "Account"
    : signingIn
    ? "Signing in…"
    : "Sign in";
  // The quieter line: what went wrong, what is pending, or the wallet — the
  // balance used to sit in its own pill, and is worth a glance without a menu
  const detail = authError
    ? "Couldn't sign in"
    : signingIn
    ? "Waiting for GitHub"
    : address
    ? `${address} · ${sol}`
    : github?.login
    ? `@${github.login}`
    : null;

  const accountGroup: NavMenuGroup = github
    ? {
        id: "account",
        items: github.login
          ? [
              {
                id: "profile",
                label: name,
                description: `@${github.login}`,
                icon: <MenuAvatar image={github.image} />,
                hint: ICONS.external,
                href: `https://github.com/${github.login}`,
                external: true,
              },
            ]
          : [],
      }
    : {
        id: "account",
        items: [
          signingIn
            ? {
                id: "cancel-sign-in",
                label: "Cancel sign-in",
                icon: <GithubMark />,
                onSelect: PgSession.cancelSignIn,
              }
            : {
                id: "sign-in",
                label: "Sign in with GitHub",
                icon: <GithubMark />,
                onSelect: () => void signIn(),
              },
        ],
      };

  const groups: NavMenuGroup[] = [
    accountGroup,
    {
      id: "app",
      items: [
        {
          id: "settings",
          label: "Settings",
          icon: ICONS.gear,
          hint: shortcut(","),
          onSelect: () => {
            if (!settingsOpen) onToggleSettings();
          },
        },
        {
          id: "docs",
          label: "Docs",
          icon: ICONS.help,
          hint: ICONS.external,
          href: DOCS_URL,
          external: true,
        },
        {
          id: "bug",
          label: "Report a bug",
          icon: ICONS.bug,
          hint: ICONS.external,
          href: BUG_URL,
          external: true,
        },
      ],
    },
    {
      id: "wallet",
      items:
        wallet && address
          ? [
              {
                id: "wallet",
                label: address,
                icon: ICONS.wallet,
                hint: sol,
                onSelect: () => {
                  PgWallet.show = true;
                },
              },
              {
                id: "disconnect",
                label: wallet.isPg
                  ? "Disconnect wallet"
                  : `Disconnect ${wallet.name}`,
                icon: ICONS.unlink,
                onSelect: () => void toggleWallet(),
              },
            ]
          : [
              {
                id: "connect",
                label: "Connect wallet",
                icon: ICONS.wallet,
                onSelect: () => void toggleWallet(),
              },
            ],
    },
    /* The presentation's own two doors, marked as such so nobody reads them
       as product features. Plain links rather than router calls: a full load
       re-enters at the right stage and cannot get the view and the URL out
       of step. */
    {
      id: "proposal",
      label: "Proposal",
      items: [
        {
          id: "evaluation",
          label: "UX evaluation",
          icon: ICONS.review,
          href: "/#evaluation",
        },
        { id: "deck", label: "Back to deck", icon: ICONS.deck, href: "/" },
      ],
    },
    ...(github
      ? [
          {
            id: "session",
            items: [
              {
                id: "sign-out",
                label: "Sign out",
                icon: ICONS.signOut,
                keepOpen: true,
                onSelect: () => setConfirmingSignOut(true),
              },
            ],
          },
        ]
      : []),
  ].filter((group) => group.items.length > 0);

  // Signing out drops this browser's copy of every synced project, so it asks
  // first — in the menu, rather than in a dialog over it
  const confirmGroups: NavMenuGroup[] = [
    {
      id: "confirm",
      items: [
        {
          id: "confirm-sign-out",
          label: "Sign out",
          icon: ICONS.signOut,
          danger: true,
          onSelect: () => void PgSession.signOut(),
        },
        {
          id: "cancel",
          label: "Cancel",
          keepOpen: true,
          onSelect: () => setConfirmingSignOut(false),
        },
      ],
    },
  ];

  const steps: SetupStep[] = [
    {
      id: "assistant",
      label: "Connect the assistant",
      done: assistantReady,
      onSelect: () => void openConnectDialog(),
    },
    {
      // There is always a cluster — devnet, until you pick another — so this
      // starts done and says which. One that is not answering is not a
      // network you can work on, and it says that too.
      id: "network",
      label: "Choose a network",
      done: !!cluster && !clusterDown,
      value: clusterName,
      warn: clusterDown,
      title: clusterDown ? `${clusterName} is not responding` : undefined,
      onSelect: openNetwork,
    },
    {
      id: "github",
      label: "Sign in with GitHub",
      done: !!github,
      value: github ? (github.login ? `@${github.login}` : name) : undefined,
      action: github
        ? undefined
        : signingIn
        ? "Cancel"
        : authError
        ? "Retry"
        : undefined,
      warn: !github && !!authError,
      title: authError ?? undefined,
      onSelect: github
        ? toggleMenu
        : signingIn
        ? PgSession.cancelSignIn
        : () => void signIn(),
    },
    {
      id: "wallet",
      label: "Connect a wallet",
      done: !!wallet,
      value: address ?? undefined,
      onSelect: wallet
        ? () => {
            PgWallet.show = true;
          }
        : () => void toggleWallet(),
    },
  ];

  const accountMenu = menu && (
    <NavMenu
      label="Account"
      anchor={menu.anchor}
      groups={confirmingSignOut ? confirmGroups : groups}
      note={confirmingSignOut ? "Sign out of GitHub?" : undefined}
      initialFocus={confirmingSignOut ? "cancel" : undefined}
      matchWidth={!collapsed}
      minWidth={collapsed ? "15rem" : "13.5rem"}
      returnFocus={menu.from}
      toggle={menu.from}
      onClose={closeMenu}
    />
  );

  const clusterProps = {
    type: "button" as const,
    // The walkthrough's "settings" shot presses this: it is the one control
    // that opens settings without a menu in the way
    "data-shot": "nav-settings",
    "aria-label": `Change network, currently ${clusterName}`,
    "aria-expanded": settingsOpen,
    [SETTINGS_TRIGGER_ATTR]: "",
    onClick: openNetwork,
  };

  if (collapsed) {
    return (
      <RailSession $animate={animate}>
        <RailButton
          {...clusterProps}
          title={`${clusterName}${clusterDown ? " is not responding" : ""}`}
        >
          <ClusterDot $down={clusterDown} />
        </RailButton>
        <RailButton
          ref={accountRef}
          type="button"
          title={github ? name : "Account"}
          aria-label={github ? `Account, ${name}` : "Account, signed out"}
          aria-haspopup="menu"
          aria-expanded={!!menu}
          onClick={toggleMenu}
        >
          <Avatar image={github?.image} />
        </RailButton>
        {accountMenu}
      </RailSession>
    );
  }

  return (
    <>
      <SetupChecklist steps={steps} />
      <Session $animate={animate}>
        <Row {...clusterProps} title={connection?.rpcEndpoint}>
          <Glyph aria-hidden="true">
            <ClusterDot $down={clusterDown} />
          </Glyph>
          <Label>{clusterName}</Label>
          {clusterDown && <Quiet>Not responding</Quiet>}
        </Row>
        <Account
          ref={accountRef}
          type="button"
          aria-haspopup="menu"
          aria-expanded={!!menu}
          $open={!!menu}
          onClick={toggleMenu}
        >
          <Avatar image={github?.image} />
          <Who>
            <WhoName>{name}</WhoName>
            {detail && (
              <WhoDetail $error={!!authError} title={authError ?? undefined}>
                {detail}
              </WhoDetail>
            )}
          </Who>
          <Chevrons aria-hidden="true">{ICONS.chevrons}</Chevrons>
        </Account>
        {authError && <Announce role="alert">{authError}</Announce>}
        {accountMenu}
      </Session>
    </>
  );
};

export default StatusChips;

/**
 * The `connect` command's no-argument branches, run here directly.
 *
 * `PgCommand.connect` executes inside the terminal, and the terminal only
 * exists inside a project: on the start screen `PgTerminal.get()` waits for an
 * answer that never comes, so the wallet control did nothing there at all.
 * These four lines are the whole of what the command does without arguments.
 */
const toggleWallet = async () => {
  switch (PgWallet.state) {
    case "setup": {
      const { Setup } = await import("../../../components/Wallet/Modals/Setup");
      if (await PgView.setModal<boolean>(Setup)) PgWallet.state = "pg";
      break;
    }
    case "disconnected":
      PgWallet.state = "pg";
      break;
    case "pg":
      PgWallet.state = "disconnected";
      break;
    case "sol":
      if (PgWallet.current && !PgWallet.current.isPg) {
        await PgWallet.current.disconnect();
      }
      PgWallet.state = "pg";
      break;
    default:
      break;
  }
};

// Kept as one unbroken path string -- manual line wrapping inside SVG path
// data broke a glyph mid-render once already.
const GITHUB_MARK_PATH =
  "M8 .2a8 8 0 0 0-2.5 15.6c.4 0 .5-.2.5-.4v-1.4c-2 .4-2.5-.9-2.5-.9" +
  "-.4-.9-.9-1.2-.9-1.2-.7-.5.1-.5.1-.5.8.1 1.2.9 1.2.9.7 1.2 1.9.9" +
  " 2.4.7 0-.5.3-.9.5-1.1-1.8-.2-3.7-.9-3.7-4a3 3 0 0 1 .8-2.1 2.9" +
  " 2.9 0 0 1 .1-2.1s.7-.2 2.2.8a7.6 7.6 0 0 1 4 0c1.5-1 2.2-.8" +
  " 2.2-.8.3.7.3 1.5.1 2.1a3 3 0 0 1 .8 2.1c0 3.1-1.9 3.8-3.7 4" +
  " .3.3.6.8.6 1.5v2.1c0 .2.1.4.5.4A8 8 0 0 0 8 .2Z";

const GithubMark: FC = () => (
  <svg viewBox="0 0 16 16" aria-hidden>
    <path fill="currentColor" d={GITHUB_MARK_PATH} />
  </svg>
);

/* The picture, or with none the brand's own profile glyph in a disc — never
   the broken-image box an empty src draws */
const Avatar: FC<{ image?: string | null }> = ({ image }) => (
  <AvatarDisc>
    {image ? <img src={image} alt="" /> : <BrandIcon name="profile" />}
  </AvatarDisc>
);

/* In the menu it sits in the 16px icon column but draws at 24px, so the
   account's name starts where every other label in the menu starts */
const MenuAvatar: FC<{ image?: string | null }> = ({ image }) => (
  <AvatarDisc $inMenu>
    {image ? <img src={image} alt="" /> : <BrandIcon name="profile" />}
  </AvatarDisc>
);

const AvatarDisc = styled.span<{ $inMenu?: boolean }>`
  ${({ theme, $inMenu }) => css`
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    ${$inMenu && "margin: -0.25rem;"}
    border-radius: 50%;
    background: ${theme.colors.state.hover.bg};
    color: ${theme.colors.default.textSecondary};
    overflow: hidden;

    & > img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    & > svg {
      width: 0.75rem;
      height: 0.75rem;
    }
  `}
`;

const ClusterDot = styled.span<{ $down: boolean }>`
  ${({ theme, $down }) => css`
    width: 0.4375rem;
    height: 0.4375rem;
    border-radius: 50%;
    background: ${$down
      ? theme.colors.state.error.color
      : theme.colors.state.success.color};
  `}
`;

/* The rule the foot sits under is drawn here, so the setup list can sit
   above it; what sits on it fades in when the column opens. */
const Session = styled.div<{ $animate: boolean }>`
  ${({ theme, $animate }) => css`
    display: flex;
    flex-direction: column;
    gap: 1px;
    padding: 0.375rem 0.5rem 0.5rem;
    border-top: 1px solid ${theme.colors.default.border};

    ${$animate &&
    css`
      & > * {
        ${fadeIn}
      }
    `}
  `}
`;

const RailSession = styled.div<{ $animate: boolean }>`
  ${({ theme, $animate }) => css`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    padding: 0.5rem 0;
    border-top: 1px solid ${theme.colors.default.border};

    ${$animate &&
    css`
      & > * {
        ${fadeIn}
      }
    `}
  `}
`;

const Quiet = styled.span`
  ${({ theme }) => css`
    margin-left: auto;
    font-size: 0.75rem;
    color: ${theme.colors.state.error.color};
  `}
`;

/* Two lines, like the reference's: the name, and a quieter line under it. The
   avatar is centred on the rows' 16px icon column, so the name starts on the
   same line as the cluster's label above it. */
const Account = styled.button<{ $open: boolean }>`
  ${({ theme, $open }) => css`
    display: flex;
    align-items: center;
    gap: 0.25rem;
    width: 100%;
    min-height: 2.5rem;
    padding: 0.25rem 0.5rem;
    border: none;
    border-radius: 8px;
    background: ${$open ? theme.colors.state.hover.bg : "transparent"};
    color: ${theme.colors.default.textPrimary};
    font-family: inherit;
    text-align: left;
    cursor: pointer;
    transition: background 0.1s;

    & > ${AvatarDisc} {
      margin-left: -0.25rem;
    }

    &:hover {
      background: ${theme.colors.state.hover.bg};
    }

    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
      outline-offset: -2px;
    }

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  `}
`;

const Who = styled.span`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  line-height: 1.3;
`;

const WhoName = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.8125rem;
  font-weight: 500;
`;

const WhoDetail = styled.span<{ $error: boolean }>`
  ${({ theme, $error }) => css`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.75rem;
    font-variant-numeric: tabular-nums;
    color: ${$error
      ? theme.colors.state.error.color
      : theme.colors.state.disabled.color};
  `}
`;

const Chevrons = styled.span`
  ${({ theme }) => css`
    flex-shrink: 0;
    display: flex;
    width: 0.875rem;
    height: 0.875rem;
    color: ${theme.colors.state.disabled.color};

    & > svg {
      width: 100%;
      height: 100%;
    }
  `}
`;

const Announce = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
`;
