import { FC, useEffect, useMemo, useRef, useState } from "react";
import styled, { css } from "styled-components";

import { CustomSetting } from "../../../app/Panels/Side/Left/CustomSetting";
import Button from "../../../components/Button";
import Checkbox from "../../../components/Checkbox";
import Select from "../../../components/Select";
import { ExportFile, Github, ImportFile } from "../../../components/Icons";
import Link from "../../../components/Link";
import { Endpoint, PLATFORM_ENDPOINTS } from "../../../constants";
import {
  useBlockExplorer,
  useProgramInfo,
  useRenderOnChange,
  useSetStatic,
  useWallet,
} from "../../../hooks";
import {
  PgCommon,
  PgFramework,
  PgProgramInfo,
  PgSettings,
  PgView,
} from "../../../utils";
import type { RequiredKey, Setting as SettingType } from "../../../utils";
import {
  ImportFs,
  ImportGithub,
} from "../../sidebar/explorer/Component/Modals";
import { HEAD_HEIGHT, HEAD_INSET } from "../tokens";

/** Which control the panel puts focus on when it opens */
export type SettingsFocus = "panel" | "network";

/**
 * Marks the controls that open settings. Kept because the status chips use it
 * to point the page at the network section.
 */
export const SETTINGS_TRIGGER_ATTR = "data-settings-trigger";

interface GearSidebarProps {
  open: boolean;
  onClose: () => void;
  focus?: SettingsFocus;
}

// `string`, not `Endpoint`: platform endpoints are build-time URLs, not enum
// members.
const NETWORKS: ReadonlyArray<{ label: string; endpoint: string }> = [
  { label: "Devnet", endpoint: Endpoint.DEVNET },
  { label: "Testnet", endpoint: Endpoint.TESTNET },
  { label: "Localnet", endpoint: Endpoint.LOCALNET },
  ...PLATFORM_ENDPOINTS.map(({ name, value }) => ({
    label: name,
    endpoint: value,
  })),
];

/**
 * Settings, as a page rather than a drawer.
 *
 * It was a 22rem panel sliding out of the right edge, pinned below a bar that
 * no longer exists, over a product it hid half of. Linear's answer — which
 * Cursor and Vercel both take too — is that settings is somewhere you *go*:
 * the whole window becomes it, the categories take the column the navigation
 * had, and a single measure of rows takes the rest. You leave by the control
 * that says so, at the top of the column, in the place the wordmark was.
 *
 * Each row is its label, its description under it, and its control at the
 * right. The descriptions used to be tooltips behind a question mark, which
 * meant the only way to learn what a setting did was to hover every one in
 * turn; there is room for them here.
 */
const GearSidebar: FC<GearSidebarProps> = ({
  open,
  onClose,
  focus = "panel",
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  const returnFocusTo = useRef<HTMLElement | null>(null);

  /* Escape belongs to whichever modal is on top, not to this page. Tracks the
     latest MODAL_SET event, not a stack. */
  const [modalOpen, setModalOpen] = useState(false);
  useSetStatic(
    PgCommon.getSendAndReceiveEventNames(PgView.events.MODAL_SET).send,
    (detail: { elementable: unknown } | null) =>
      setModalOpen(!!detail?.elementable)
  );

  /* No outside-click close: a page has no outside. It was a drawer, so a
     stray click anywhere in the product shut it — including the first click
     inside a modal it had opened itself, which is why that hook needed a
     modal guard and a selector exception to work at all. */

  // Re-render on endpoint change (e.g. from the embedded upstream select)
  // and read the current value straight off `PgSettings`, matching how the
  // rest of the codebase consumes non-React-owned static state.
  useRenderOnChange(PgSettings.onDidChangeConnectionEndpoint);
  const endpoint = PgSettings.connection.endpoint;
  const activeNetwork = NETWORKS.findIndex((n) => n.endpoint === endpoint);

  const explorer = useBlockExplorer();
  const wallet = useWallet();
  useProgramInfo();
  const pk = PgProgramInfo.getPkStr();

  // Focus the panel itself on open so keyboard users land somewhere sane
  // without having to guess which control comes first -- unless the caller
  // asked for a specific control, as the header's cluster chip does. On close,
  // restore focus to the element that was active before the panel opened.
  useEffect(() => {
    if (open) {
      if (document.activeElement instanceof HTMLElement) {
        returnFocusTo.current = document.activeElement;
      }
      // Falls back to the first chip when the endpoint is one `NETWORKS` does
      // not list (Playnet, Mainnet Beta, a custom URL).
      const target =
        focus === "network"
          ? chipsRef.current?.querySelector<HTMLElement>(
              '[role="radio"][aria-checked="true"]'
            ) ?? chipsRef.current?.querySelector<HTMLElement>('[role="radio"]')
          : null;
      (target ?? panelRef.current)?.focus();
    } else {
      if (returnFocusTo.current && document.contains(returnFocusTo.current)) {
        returnFocusTo.current.focus();
      }
      returnFocusTo.current = null;
    }
  }, [open, focus]);

  // Arrow keys move between clusters, selecting as they go. A radiogroup of
  // `<button>`s gets none of this for free, unlike real radio inputs.
  const moveNetworkFocus = (delta: number) => {
    const chips =
      chipsRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]');
    if (!chips?.length) return;

    const current = Array.from(chips).indexOf(
      document.activeElement as HTMLButtonElement
    );
    const next =
      ((current === -1 ? 0 : current) + delta + chips.length) % chips.length;

    PgSettings.connection.endpoint = NETWORKS[next].endpoint;
    chips[next].focus();
  };

  // Close on Escape while open. Scoped to `open` (and skipped while a modal
  // is open, for the same reason as the outside-click guard above) rather
  // than a global keybind, so it never fires while the panel is closed.
  useEffect(() => {
    if (!open || modalOpen) return;

    const handleKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, modalOpen, onClose]);

  /* Which category the reader is in. The nav scrolls the page rather than
     swapping it: there are a few dozen settings in total, which is a page, not
     a set of pages. */
  const [current, setCurrent] = useState<string>("network");
  const bodyRef = useRef<HTMLDivElement>(null);

  /* The declarative settings, grouped the way upstream groups them: by the
     first segment of the id. */
  const groups = useMemo(() => {
    const out: Array<{ id: string; label: string; settings: SettingType[] }> =
      [];
    for (const setting of PgSettings.all) {
      const id = setting.id.split(".")[0];
      const last = out.at(-1);
      if (last?.id === id) last.settings.push(setting);
      else
        out.push({
          id,
          label: PgCommon.toTitleFromCamel(id).replace("Ui", "UI"),
          settings: [setting],
        });
    }
    for (const group of out) {
      group.settings.sort((a, b) => {
        // A row with a menu before a row with a switch, then by name
        if (a.values && !b.values) return -1;
        if (b.values && !a.values) return 1;
        return a.name.localeCompare(b.name);
      });
    }
    return out;
  }, []);

  const sections = useMemo(
    () => [
      { id: "network", label: "Network" },
      { id: "project", label: "Project" },
      ...(wallet || pk ? [{ id: "explorer", label: "Explorer" }] : []),
      ...groups.map((g) => ({ id: g.id, label: g.label })),
    ],
    [groups, wallet, pk]
  );

  /* Mark the category you are reading. Topmost section whose heading has
     passed the top of the scroll area wins, which is what stops the last
     section from never lighting up when it is too short to fill the view. */
  useEffect(() => {
    const root = bodyRef.current;
    if (!open || !root) return;
    const onScroll = () => {
      let seen = sections[0]?.id;
      for (const { id } of sections) {
        const el = root.querySelector<HTMLElement>(`#settings-${id}`);
        if (
          el &&
          el.getBoundingClientRect().top - root.getBoundingClientRect().top < 80
        ) {
          seen = id;
        }
      }
      if (seen) setCurrent(seen);
    };
    onScroll();
    root.addEventListener("scroll", onScroll, { passive: true });
    return () => root.removeEventListener("scroll", onScroll);
  }, [open, sections]);

  const go = (id: string) => {
    bodyRef.current
      ?.querySelector<HTMLElement>(`#settings-${id}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
    setCurrent(id);
  };

  return (
    <Overlay
      ref={panelRef}
      $open={open}
      tabIndex={-1}
      aria-hidden={!open}
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
    >
      <Nav aria-label="Settings sections">
        <NavHead>
          <Back type="button" onClick={onClose}>
            <BackGlyph aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14.5 6 9 12l5.5 6" />
              </svg>
            </BackGlyph>
            Back to app
          </Back>
        </NavHead>
        <NavList>
          {sections.map((section) => (
            <NavRow
              key={section.id}
              type="button"
              $current={current === section.id}
              aria-current={current === section.id ? "true" : undefined}
              onClick={() => go(section.id)}
            >
              {section.label}
            </NavRow>
          ))}
        </NavList>
      </Nav>

      <Body ref={bodyRef}>
        <Measure>
          <PageTitle>Settings</PageTitle>

          <Block id="settings-network">
            <BlockTitle>Network</BlockTitle>
            <Chips
              ref={chipsRef}
              role="radiogroup"
              aria-label="Network"
              onKeyDown={(ev) => {
                const delta =
                  ev.key === "ArrowRight" || ev.key === "ArrowDown"
                    ? 1
                    : ev.key === "ArrowLeft" || ev.key === "ArrowUp"
                    ? -1
                    : 0;
                if (!delta) return;
                ev.preventDefault();
                moveNetworkFocus(delta);
              }}
            >
              {NETWORKS.map((n, i) => (
                <Chip
                  key={n.endpoint}
                  type="button"
                  role="radio"
                  aria-checked={endpoint === n.endpoint}
                  // Roving tabindex: one stop for the whole group. Index 0
                  // takes it when the endpoint is not one of these, so the
                  // group stays reachable by Tab.
                  tabIndex={
                    endpoint === n.endpoint || (activeNetwork === -1 && i === 0)
                      ? 0
                      : -1
                  }
                  $active={endpoint === n.endpoint}
                  onClick={() => (PgSettings.connection.endpoint = n.endpoint)}
                >
                  {n.label}
                </Chip>
              ))}
            </Chips>
          </Block>

          <Block id="settings-project">
            <BlockTitle>Project</BlockTitle>
            <Actions>
              <Button
                leftIcon={<ExportFile />}
                onClick={() => PgFramework.exportWorkspace()}
              >
                Export project (zip)
              </Button>
              <Button
                kind="outline"
                leftIcon={<Github />}
                onClick={() => PgView.setModal(ImportGithub)}
              >
                From GitHub
              </Button>
              <Button
                kind="outline"
                leftIcon={<ImportFile />}
                onClick={() => PgView.setModal(ImportFs)}
              >
                From files
              </Button>
            </Actions>
          </Block>

          {(wallet || pk) && (
            <Block id="settings-explorer">
              <BlockTitle>Explorer</BlockTitle>
              <Links>
                {wallet && (
                  <Link
                    href={explorer.getAddressUrl(wallet.publicKey.toBase58())}
                  >
                    Wallet
                  </Link>
                )}
                {pk && <Link href={explorer.getAddressUrl(pk)}>Program</Link>}
                {pk && (
                  <Link href={`${explorer.getAddressUrl(pk)}/idl`}>
                    Program IDL
                  </Link>
                )}
              </Links>
            </Block>
          )}

          {groups.map((group) => (
            <Block key={group.id} id={`settings-${group.id}`}>
              <BlockTitle>{group.label}</BlockTitle>
              <Rows>
                {group.settings.map((setting) => (
                  <SettingRow key={setting.id} {...setting} />
                ))}
              </Rows>
            </Block>
          ))}
        </Measure>
      </Body>
    </Overlay>
  );
};

/** One setting: what it is, what it does, and the control that changes it. */
const SettingRow: FC<SettingType> = (setting) => {
  useRenderOnChange(setting.onChange);
  return (
    <SettingWrapper>
      <SettingText>
        <SettingName>{setting.name}</SettingName>
        {setting.description && (
          <SettingDescription>{setting.description}</SettingDescription>
        )}
      </SettingText>
      <SettingControl $wide={!!setting.values}>
        {setting.values ? (
          <SettingSelect {...(setting as RequiredKey<SettingType, "values">)} />
        ) : (
          <Checkbox
            onChange={(ev) => setting.setValue(ev.target.checked)}
            checked={setting.getValue()}
          />
        )}
      </SettingControl>
    </SettingWrapper>
  );
};

const SettingSelect: FC<RequiredKey<SettingType, "values">> = (setting) => {
  const options = useMemo(() => {
    const opts = PgCommon.callIfNeeded(setting.values).map(convertValue);
    if (setting.custom) opts.push({ label: "Custom", value: "" });
    return opts;
  }, [setting.values, setting.custom]);

  return (
    <Select
      options={options}
      value={findOption(options, setting.getValue()) ?? options.at(-1)}
      onChange={(o) => {
        if (o?.value) setting.setValue(o.value);
        else if (setting.custom?.Component)
          PgView.setModal(setting.custom.Component);
        else PgView.setModal(<CustomSetting setting={setting} />);
      }}
    />
  );
};

/** Shape a setting's value for `Select`. Mirrors upstream's own conversion. */
const convertValue = (v: any): any => {
  if (typeof v === "object") {
    if (v.value) return { label: v.name, value: v.value };
    if (v.values) return { label: v.name, options: v.values.map(convertValue) };
    throw new Error(`Invalid option value: ${v}`);
  }
  return { label: PgCommon.toTitleFromKebab(v), value: v };
};

/** Options may be grouped, so the search goes one level down as well. */
const findOption = (opts: any[], v: any): any => {
  for (const opt of opts) {
    if (opt.value === v) return opt;
    if (opt.options) {
      const found = findOption(opt.options, v);
      if (found) return found;
    }
  }
};

export default GearSidebar;

/* ── the page ─────────────────────────────────────────────────────────────
   The whole window, over everything. A drawer let you see the product behind
   it and touch none of it, which is the worst of a page and a panel at once. */
const Overlay = styled.div<{ $open: boolean }>`
  ${({ theme, $open }) => css`
    position: fixed;
    inset: 0;
    display: flex;
    background: ${theme.colors.default.bgPrimary};
    font-family: ${theme.font.other.family};
    opacity: ${$open ? 1 : 0};
    visibility: ${$open ? "visible" : "hidden"};
    transition: opacity 160ms ease,
      visibility 0s linear ${$open ? "0s" : "160ms"};
    z-index: 3;

    &:focus-visible {
      outline: none;
    }

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  `}
`;

/* The categories take the column the navigation had, at the width it had. */
const Nav = styled.nav`
  ${({ theme }) => css`
    width: 14.5rem;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    border-right: 1px solid ${theme.colors.default.border};
    overflow-y: auto;
  `}
`;

const NavHead = styled.div`
  ${({ theme }) => css`
    display: flex;
    align-items: center;
    flex-shrink: 0;
    height: ${HEAD_HEIGHT};
    padding: 0 0.5rem 0 calc(${HEAD_INSET} - 0.5rem);
    border-bottom: 1px solid ${theme.colors.default.border};
  `}
`;

/* The way out, where the wordmark is on every other screen. */
const Back = styled.button`
  ${({ theme }) => css`
    display: flex;
    align-items: center;
    gap: 0.375rem;
    height: 1.75rem;
    padding: 0 0.5rem;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: ${theme.colors.default.textSecondary};
    font-family: inherit;
    font-size: 0.8125rem;
    font-weight: 400;
    cursor: pointer;

    &:hover {
      background: ${theme.colors.state.hover.bg};
      color: ${theme.colors.default.textPrimary};
    }

    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
      outline-offset: -2px;
    }
  `}
`;

const BackGlyph = styled.span`
  display: flex;
  width: 14px;
  height: 14px;

  & > svg {
    width: 100%;
    height: 100%;
  }
`;

const NavList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 0.5rem;
`;

/* The same row the sidebar uses, because it is the same kind of thing. */
const NavRow = styled.button<{ $current: boolean }>`
  ${({ theme, $current }) => css`
    display: flex;
    align-items: center;
    width: 100%;
    height: 1.75rem;
    padding: 0 0.5rem;
    border: none;
    border-radius: 6px;
    background: ${$current ? theme.colors.state.hover.bg : "transparent"};
    color: ${$current
      ? theme.colors.default.textPrimary
      : theme.colors.default.textSecondary};
    font-family: inherit;
    font-size: 0.8125rem;
    font-weight: ${$current ? 500 : 400};
    text-align: left;
    white-space: nowrap;
    cursor: pointer;

    &:hover {
      background: ${theme.colors.state.hover.bg};
      color: ${theme.colors.default.textPrimary};
    }

    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
      outline-offset: -2px;
    }
  `}
`;

const Body = styled.div`
  flex: 1;
  min-width: 0;
  overflow-y: auto;
`;

/* One measure for the whole page, as on the start screen. */
const Measure = styled.div`
  width: min(40rem, 100%);
  margin: 0 auto;
  padding: 3.5rem 2rem 6rem;
`;

const PageTitle = styled.h1`
  ${({ theme }) => css`
    margin: 0 0 2rem;
    font-size: 1.375rem;
    font-weight: 500;
    letter-spacing: -0.02em;
    color: ${theme.colors.default.textPrimary};
  `}
`;

const Block = styled.section`
  /* Enough that a heading scrolled to sits under the top edge, not on it */
  scroll-margin-top: 1.5rem;

  & + & {
    margin-top: 2.5rem;
  }
`;

const BlockTitle = styled.h2`
  ${({ theme }) => css`
    margin: 0 0 0.75rem;
    font-size: 0.9375rem;
    font-weight: 500;
    color: ${theme.colors.default.textPrimary};
  `}
`;

const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
`;

const Chip = styled.button<{ $active: boolean }>`
  ${({ theme, $active }) => css`
    height: 1.75rem;
    padding: 0 0.75rem;
    border-radius: 6px;
    border: 1px solid
      ${$active ? theme.colors.default.primary : theme.colors.default.border};
    background: ${$active
      ? theme.colors.default.primary + theme.default.transparency.low
      : "transparent"};
    color: ${$active
      ? theme.colors.default.textPrimary
      : theme.colors.default.textSecondary};
    font-family: inherit;
    font-size: 0.8125rem;
    cursor: pointer;

    &:hover {
      color: ${theme.colors.default.textPrimary};
    }
    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
      outline-offset: 1px;
    }
  `}
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const Links = styled.div`
  display: flex;
  gap: 1rem;
`;

const Rows = styled.div`
  ${({ theme }) => css`
    border-top: 1px solid ${theme.colors.default.border};

    & > * {
      border-bottom: 1px solid ${theme.colors.default.border};
    }
  `}
`;

/* Label and description on the left, control on the right, a line between
   each. The description was a tooltip behind a question mark, so the only way
   to find out what a setting did was to hover all of them in turn. */
const SettingWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 0.75rem 0;
`;

const SettingText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
`;

const SettingName = styled.span`
  ${({ theme }) => css`
    font-size: 0.8125rem;
    font-weight: 400;
    color: ${theme.colors.default.textPrimary};
  `}
`;

const SettingDescription = styled.span`
  ${({ theme }) => css`
    font-size: 0.75rem;
    line-height: 1.45;
    color: ${theme.colors.default.textSecondary};
  `}
`;

const SettingControl = styled.div<{ $wide: boolean }>`
  ${({ $wide }) => css`
    flex-shrink: 0;
    ${$wide && "width: 11.5rem;"}
  `}
`;
