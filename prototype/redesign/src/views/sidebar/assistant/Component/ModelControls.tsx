import { FC } from "react";
import styled, { css } from "styled-components";

import { openConnectDialog } from "./ConnectDialog";
import Menu, { useMenu } from "../../../flow/components/Menu";
import type { MenuRow } from "../../../flow/components/Menu";
import { useRenderOnChange } from "../../../../hooks";
import {
  DEFAULT_OPTION,
  EFFORTS,
  MORE_MODELS,
  PRIMARY_MODELS,
  PgModelChoice,
  connectionFor,
  connectionModel,
  effortLabel,
  effortLevel,
  takesEffort,
} from "../model/choice";
import type { ModelOption } from "../model/choice";
import { useDefaultBackend } from "../model/default-backend";
import { PgAssistant } from "../store";
import type { Effort } from "../model/types";

/**
 * Model and effort, on the composer — the two choices Claude keeps there.
 *
 * Picking a model on the backend already connected changes it in place and
 * the conversation carries on. Picking one that needs a key this tab does not
 * hold asks for the key in a dialog; nothing connected yet, the pick is just
 * remembered, and the key is asked for when there is something to send.
 */
const ModelControls: FC<{ dense?: boolean }> = ({ dense = false }) => {
  useRenderOnChange(PgAssistant.onDidChange);
  useRenderOnChange(PgModelChoice.onDidChange);
  const defaultBackend = useDefaultBackend();

  const models = useMenu();
  const efforts = useMenu();

  const connection = PgAssistant.connection;
  const choice = PgModelChoice.get();
  const model = connection ? connectionModel(connection) : choice.option;
  const effort = connection?.settings?.effort ?? choice.effort;

  const same = (a: ModelOption) =>
    a.id === model.id && a.provider === model.provider;

  const pickModel = (option: ModelOption) => {
    PgModelChoice.set({ option });
    if (!connection) return;
    const next = connectionFor(option, effort, connection);
    if (connection.id === option.provider) PgAssistant.tune(next);
    else if (option.provider === "default") PgAssistant.connect(next);
    else
      openConnectDialog({
        provider: option.provider,
        model: option.id,
        effort,
      });
  };

  const pickEffort = (next: Effort) => {
    PgModelChoice.set({ effort: next });
    if (connection?.settings) {
      PgAssistant.tune({
        ...connection,
        settings: { ...connection.settings, effort: next },
      });
    }
  };

  const toRow = (option: ModelOption, hint?: string): MenuRow => ({
    id: `${option.provider}:${option.id}`,
    label: option.label,
    hint,
    checked: same(option),
    onSelect: () => pickModel(option),
  });

  const more = [
    ...(defaultBackend ? [DEFAULT_OPTION] : []),
    ...MORE_MODELS,
  ].map((o) => toRow(o));

  const modelRows: MenuRow[] = [
    ...PRIMARY_MODELS.map((o, i) => toRow(o, String(i + 1))),
    { id: "more", label: "More models", more, divider: true },
    {
      id: "connection",
      label: connection ? "Connection and key…" : "Connect with a key…",
      hint: "K",
      onSelect: () =>
        openConnectDialog({
          provider: model.provider,
          model: model.id,
          effort,
        }),
    },
  ];

  const effortRows: MenuRow[] = EFFORTS.map((e, i) => ({
    id: e.id,
    label: e.label,
    hint: String(i + 1),
    checked: e.id === effort,
    onSelect: () => pickEffort(e.id),
  }));

  return (
    <Controls>
      <Anchor>
        <Control
          ref={models.anchorRef}
          type="button"
          aria-haspopup="menu"
          aria-expanded={models.open}
          title="Model"
          onClick={models.toggle}
        >
          <Label>{model.label}</Label>
          <Chevron aria-hidden="true">{ICONS.chevron}</Chevron>
        </Control>
        {models.open && (
          <Menu
            title="Model"
            rows={modelRows}
            anchorRef={models.anchorRef}
            onClose={models.close}
          />
        )}
      </Anchor>

      {takesEffort(model.provider) && (
        <Anchor>
          <Control
            ref={efforts.anchorRef}
            type="button"
            aria-haspopup="menu"
            aria-expanded={efforts.open}
            title={`Effort: ${effortLabel(effort)}`}
            onClick={efforts.toggle}
          >
            <Dial level={effortLevel(effort)} />
            {!dense && <Label>{effortLabel(effort)}</Label>}
          </Control>
          {efforts.open && (
            <Menu
              title="Effort"
              rows={effortRows}
              anchorRef={efforts.anchorRef}
              onClose={efforts.close}
              minWidth="11rem"
            />
          )}
        </Anchor>
      )}
    </Controls>
  );
};

export default ModelControls;

/** How hard it thinks, as a ring that fills — Claude's dial, in our colour */
const Dial: FC<{ level: number }> = ({ level }) => {
  const r = 6;
  const c = 2 * Math.PI * r;
  return (
    <DialSvg viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r={r} fill="none" strokeWidth="2" opacity="0.28" />
      <circle
        cx="8"
        cy="8"
        r={r}
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={`${c * level} ${c}`}
        transform="rotate(-90 8 8)"
      />
    </DialSvg>
  );
};

const ICONS = {
  chevron: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  ),
};

const Controls = styled.div`
  display: flex;
  align-items: center;
  gap: 0.125rem;
  min-width: 0;
`;

const Anchor = styled.div`
  position: relative;
  min-width: 0;
`;

const Control = styled.button`
  ${({ theme }) => css`
    display: flex;
    align-items: center;
    gap: 0.375rem;
    min-width: 0;
    max-width: 11rem;
    height: 2rem;
    padding: 0 0.5rem;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: ${theme.colors.default.textSecondary};
    font-family: inherit;
    font-size: 0.8125rem;
    font-weight: 500;
    white-space: nowrap;
    cursor: pointer;

    &:hover,
    &[aria-expanded="true"] {
      background: ${theme.colors.state.hover.bg};
      color: ${theme.colors.default.textPrimary};
    }

    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
      outline-offset: 1px;
    }
  `}
`;

const Label = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Chevron = styled.span`
  display: flex;
  flex-shrink: 0;
  width: 0.75rem;
  height: 0.75rem;

  & > svg {
    width: 100%;
    height: 100%;
  }
`;

const DialSvg = styled.svg`
  ${({ theme }) => css`
    flex-shrink: 0;
    width: 0.9375rem;
    height: 0.9375rem;
    stroke: ${theme.colors.default.primary};
  `}
`;
