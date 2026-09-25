import { useEffect, useState } from "react";
import styled, { css, keyframes } from "styled-components";

import Chat from "./Chat";
import { openConnectDialog } from "./ConnectDialog";
import Grounding from "./Grounding";
import Menu, { useMenu } from "../../../flow/components/Menu";
import type { MenuRow } from "../../../flow/components/Menu";
import { HEAD_HEIGHT } from "../../../flow/tokens";
import PlayRing from "../../../../components/PlayRing";
import { PgAssistant } from "../store";
import { PgModelChoice } from "../model/choice";

interface AssistantProps {
  /** The session's name — the project or tutorial it belongs to */
  title?: string;
  /** Hides the pane; the host offers a way to bring it back */
  onCollapse?: () => void;
  /** Widens the pane, when the host can */
  onExpand?: () => void;
  /** Whether it is widened, for the expand control's state */
  expanded?: boolean;
}

/**
 * The assistant pane: the session's name at the head, the conversation below.
 *
 * It is one surface now. Chat and Sources used to be two tabs, so the pane
 * switched between being a conversation and being a settings list; sources
 * and tools open as a sheet over the chat instead, and the backend, model and
 * effort live on the composer. The head carries what Claude's does — the name,
 * a menu, expand, and hide.
 */
const Assistant = ({
  title,
  onCollapse,
  onExpand,
  expanded,
}: AssistantProps) => {
  const [sources, setSources] = useState(false);
  const menu = useMenu();

  // Ask the gateway what it serves and what those servers offer. Up front:
  // `createTools` reads the result, so a model connected before this ran
  // would be offered no MCP tool at all, with nothing on screen to say why.
  useEffect(() => {
    PgAssistant.initMcp();
  }, []);

  // A prompt raised from elsewhere lands in the composer, which is no use
  // while the sources sheet is covering it
  useEffect(() => {
    return PgAssistant.onDidRequestPrompt(() => setSources(false)).dispose;
  }, []);

  const rows: MenuRow[] = [
    {
      id: "sources",
      label: "Sources and tools",
      hint: "S",
      onSelect: () => setSources(true),
    },
    {
      id: "connection",
      label: PgAssistant.connection
        ? "Connection and key…"
        : "Connect a model…",
      hint: "K",
      onSelect: () => {
        const { option, effort } = PgModelChoice.get();
        openConnectDialog({
          provider: PgAssistant.connection?.id ?? option.provider,
          model: option.id,
          effort,
        });
      },
    },
    {
      id: "clear",
      label: "Clear conversation",
      hint: "D",
      danger: true,
      divider: true,
      disabled: PgAssistant.items.length === 0,
      onSelect: () => {
        if (window.confirm("Clear this conversation? It cannot be undone.")) {
          PgAssistant.clearConversation();
        }
      },
    },
  ];

  return (
    <Wrapper>
      <Header>
        <Heading title={title}>
          <Mark aria-hidden="true" />
          <HeaderTitle>{title ?? "Assistant"}</HeaderTitle>
        </Heading>
        <HeaderEnd>
          <MenuAnchor>
            <IconButton
              ref={menu.anchorRef}
              type="button"
              aria-label="More"
              title="More"
              aria-haspopup="menu"
              aria-expanded={menu.open}
              onClick={menu.toggle}
            >
              {ICONS.more}
            </IconButton>
            {menu.open && (
              <Menu
                rows={rows}
                anchorRef={menu.anchorRef}
                onClose={menu.close}
                placement="bottom-end"
              />
            )}
          </MenuAnchor>
          {onExpand && (
            <IconButton
              type="button"
              aria-label={
                expanded ? "Narrow the assistant" : "Widen the assistant"
              }
              title={expanded ? "Narrow" : "Widen"}
              aria-pressed={expanded}
              onClick={onExpand}
            >
              {expanded ? ICONS.shrink : ICONS.expand}
            </IconButton>
          )}
          {onCollapse && (
            <IconButton
              type="button"
              aria-label="Hide the assistant"
              title="Hide the assistant"
              onClick={onCollapse}
            >
              {ICONS.panel}
            </IconButton>
          )}
        </HeaderEnd>
      </Header>

      <Body>
        <Chat title={title} onOpenSources={() => setSources(true)} />

        {sources && (
          <Sheet role="dialog" aria-label="Sources and tools">
            <SheetHead>
              <SheetTitle>Sources and tools</SheetTitle>
              <IconButton
                type="button"
                aria-label="Close"
                title="Close"
                onClick={() => setSources(false)}
              >
                {ICONS.close}
              </IconButton>
            </SheetHead>
            <SheetBody>
              <Grounding />
            </SheetBody>
          </Sheet>
        )}
      </Body>
    </Wrapper>
  );
};

export default Assistant;

const svg = (d: JSX.Element) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {d}
  </svg>
);

const ICONS = {
  more: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="5.5" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="12" cy="18.5" r="1.6" />
    </svg>
  ),
  expand: svg(
    <>
      <path d="M14 4h6v6" />
      <path d="M20 4l-7 7" />
      <path d="M10 20H4v-6" />
      <path d="M4 20l7-7" />
    </>
  ),
  shrink: svg(
    <>
      <path d="M20 10h-6V4" />
      <path d="M14 10l7-7" />
      <path d="M4 14h6v6" />
      <path d="M10 14l-7 7" />
    </>
  ),
  panel: svg(
    <>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d="M9 4v16" />
    </>
  ),
  close: svg(<path d="M6 6l12 12M18 6 6 18" />),
};

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  /* Fill the sidebar whether it hands us a flex slot or a definite height */
  flex: 1;
  height: 100%;
  max-height: 100%;
  min-height: 0;
`;

const Header = styled.div`
  ${({ theme }) => css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    height: ${HEAD_HEIGHT};
    padding: 0 0.375rem 0 0.875rem;
    flex-shrink: 0;
    /* The same rule the columns either side draw, at the same height */
    border-bottom: 1px solid ${theme.colors.default.border};
  `}
`;

const Heading = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
`;

const Mark = styled(PlayRing)`
  ${({ theme }) => css`
    flex-shrink: 0;
    width: 1rem;
    height: 1rem;
    color: ${theme.colors.default.primary};
  `}
`;

/* The session's name, in the same voice as every other pane title */
const HeaderTitle = styled.span`
  ${({ theme }) => css`
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.875rem;
    font-weight: 500;
    color: ${theme.colors.default.textPrimary};
  `}
`;

const HeaderEnd = styled.div`
  display: flex;
  align-items: center;
  gap: 0.125rem;
  flex-shrink: 0;
`;

const MenuAnchor = styled.div`
  position: relative;
`;

const IconButton = styled.button`
  ${({ theme }) => css`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.875rem;
    height: 1.875rem;
    padding: 0;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: ${theme.colors.default.textSecondary};
    cursor: pointer;

    & > svg {
      width: 1rem;
      height: 1rem;
    }

    &:hover,
    &[aria-expanded="true"],
    &[aria-pressed="true"] {
      background: ${theme.colors.state.hover.bg};
      color: ${theme.colors.default.textPrimary};
    }

    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
      outline-offset: 1px;
    }
  `}
`;

const Body = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
`;

const slideIn = keyframes`
  from { opacity: 0; transform: translate3d(0, 8px, 0); }
  to   { opacity: 1; transform: none; }
`;

/* Over the chat, not instead of it: closing it puts you back mid-sentence */
const Sheet = styled.div`
  ${({ theme }) => css`
    position: absolute;
    inset: 0;
    z-index: 5;
    display: flex;
    flex-direction: column;
    background: ${theme.colors.default.bgPrimary};
    animation: ${slideIn} 180ms cubic-bezier(0.22, 1, 0.36, 1);

    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }
  `}
`;

const SheetHead = styled.div`
  ${({ theme }) => css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
    height: 2.5rem;
    padding: 0 0.375rem 0 0.875rem;
    border-bottom: 1px solid ${theme.colors.default.border};
  `}
`;

const SheetTitle = styled.span`
  ${({ theme }) => css`
    font-size: 0.8125rem;
    font-weight: 500;
    color: ${theme.colors.default.textPrimary};
  `}
`;

const SheetBody = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
`;
