import { useState } from "react";
import styled, { css } from "styled-components";

import GradientButton from "./GradientButton";
import Input from "../../../../components/Input";
import Link from "../../../../components/Link";
import Select from "../../../../components/Select";
import { PgAssistant } from "../store";
import {
  PROVIDERS,
  type Effort,
  type ProviderId,
  type ProviderInfo,
} from "../model/types";

/** Model and effort a backend starts on, when it offers the choice */
const defaultSettings = (provider: ProviderInfo) =>
  provider.modelSettings ? { ...provider.modelSettings.defaults } : undefined;

const CAPABILITIES = [
  {
    tag: "READS",
    text:
      "the tab you are looking at, every file in the project, the last " +
      "compiler error",
  },
  {
    tag: "WRITES",
    text: "proposes patches as a diff — applied only when you click Apply",
  },
  { tag: "RUNS", text: "build and deploy, each behind an explicit approval" },
  {
    tag: "KNOWS",
    text: "this project's roadmap, decisions and current status",
  },
];

const Connect = () => {
  // Reopened over a live connection: seed the fields with it so changing just
  // the model id does not mean retyping the key
  const current = PgAssistant.connection;

  const initial = PROVIDERS.find((p) => p.id === (current?.id ?? "scripted"))!;

  const [providerId, setProviderId] = useState<ProviderId>(
    current?.id ?? "scripted"
  );
  const [key, setKey] = useState(current?.apiKey ?? "");
  const [endpoint, setEndpoint] = useState<{
    baseUrl: string;
    model: string;
  } | null>(() => (current?.endpoint ? { ...current.endpoint } : null));
  const [settings, setSettings] = useState(() =>
    current?.settings ? { ...current.settings } : defaultSettings(initial)
  );

  const provider = PROVIDERS.find((p) => p.id === providerId)!;

  const pickProvider = (p: typeof PROVIDERS[number]) => {
    setProviderId(p.id);
    // Seed the endpoint fields with the provider's defaults, editable from there
    setEndpoint(p.endpoint ? { ...p.endpoint } : null);
    setSettings(
      p.id === current?.id && current.settings
        ? { ...current.settings }
        : defaultSettings(p)
    );
    // A key belongs to the backend it was issued for: never carry it across.
    // Coming back to the connected one restores its own key.
    setKey(p.id === current?.id ? current.apiKey : "");
  };

  const keyReady = !provider.needsKey || provider.keyOptional || !!key.trim();
  const endpointReady =
    !provider.endpoint ||
    (!!endpoint?.baseUrl.trim() && !!endpoint?.model.trim());
  const ready = keyReady && endpointReady;

  const trimmedEndpoint = endpoint
    ? { baseUrl: endpoint.baseUrl.trim(), model: endpoint.model.trim() }
    : undefined;
  const next = {
    id: providerId,
    apiKey: key.trim(),
    endpoint: trimmedEndpoint,
    settings,
  };
  const switching = !!current && !PgAssistant.isCurrent(next);

  // `Button` restores its own state after awaiting this handler, so unmounting
  // synchronously would leave it setting state on an unmounted component.
  const connect = () => setTimeout(() => PgAssistant.connect(next), 0);

  return (
    <Wrapper>
      {current && (
        <Back onClick={() => PgAssistant.keepBackend()}>Back to chat</Back>
      )}

      <Intro>
        <Title>
          {current
            ? "Switch backend"
            : "An assistant that can see your project"}
        </Title>
        {!current && (
          <Lead>
            It reads the tab you are looking at and the last build error,
            explains what went wrong against your actual code, and proposes
            patches you apply yourself.
          </Lead>
        )}
      </Intro>

      <Label as="div">BACKEND</Label>
      <Providers>
        {PROVIDERS.map((p) => (
          <ProviderOption
            key={p.id}
            aria-pressed={p.id === providerId}
            $selected={p.id === providerId}
            disabled={p.unavailable}
            onClick={() => pickProvider(p)}
          >
            <ProviderName $selected={p.id === providerId}>
              {p.name}
              {!p.needsKey && !p.unavailable && <NoKey>no key needed</NoKey>}
            </ProviderName>
            <ProviderDescription>{p.description}</ProviderDescription>
          </ProviderOption>
        ))}
      </Providers>

      {provider.endpoint && endpoint && (
        <>
          <Label htmlFor="assistant-base-url">BASE URL</Label>
          <Field
            id="assistant-base-url"
            value={endpoint.baseUrl}
            onChange={(ev) =>
              setEndpoint({ ...endpoint, baseUrl: ev.target.value })
            }
            placeholder={provider.endpoint.baseUrl}
            autoComplete="off"
          />
          <Label htmlFor="assistant-model">MODEL</Label>
          {provider.endpoint.models && (
            <Presets>
              {provider.endpoint.models.map((m) => (
                <Preset
                  key={m}
                  type="button"
                  aria-pressed={m === endpoint.model}
                  $selected={m === endpoint.model}
                  onClick={() => setEndpoint({ ...endpoint, model: m })}
                >
                  {m}
                </Preset>
              ))}
            </Presets>
          )}
          <Field
            id="assistant-model"
            value={endpoint.model}
            onChange={(ev) =>
              setEndpoint({ ...endpoint, model: ev.target.value })
            }
            placeholder={provider.endpoint.model}
            autoComplete="off"
          />
        </>
      )}

      {provider.modelSettings && settings && (
        <>
          <Label as="div">MODEL</Label>
          <Picker>
            <Select
              options={provider.modelSettings.models.map((m) => ({
                label: m,
                value: m,
              }))}
              value={{ label: settings.model, value: settings.model }}
              onChange={(option) =>
                option && setSettings({ ...settings, model: option.value })
              }
              isSearchable={false}
            />
          </Picker>

          <Label as="div">EFFORT</Label>
          <Picker>
            <Select
              options={provider.modelSettings.efforts.map((e) => ({
                label: e,
                value: e,
              }))}
              value={{ label: settings.effort, value: settings.effort }}
              onChange={(option) =>
                option &&
                setSettings({ ...settings, effort: option.value as Effort })
              }
              isSearchable={false}
            />
          </Picker>
        </>
      )}

      {provider.needsKey && (
        <>
          <Label htmlFor="assistant-api-key">
            API KEY{provider.keyOptional ? " (OPTIONAL)" : ""}
          </Label>
          <Input
            id="assistant-api-key"
            value={key}
            onChange={(ev) => setKey(ev.target.value)}
            onKeyDown={(ev) => {
              if (ev.key === "Enter" && ready) connect();
            }}
            placeholder={provider.keyPlaceholder}
            type="password"
            autoComplete="off"
          />
        </>
      )}

      <ConnectButton
        kind="primary"
        fullWidth
        disabled={!ready}
        onClick={connect}
      >
        {current ? "Switch" : provider.needsKey ? "Connect" : "Start"}
      </ConnectButton>

      {switching && (
        <Note>
          Switching starts a new conversation. The current one cannot be
          replayed to another backend.
        </Note>
      )}

      {provider.needsKey && (
        <Note>
          Held in memory for this tab only — never written to disk, never sent
          anywhere but{" "}
          {provider.endpoint ? "the endpoint above" : provider.name}. You will
          re-enter it after a reload.
        </Note>
      )}

      {!current && (
        <Capabilities>
          {CAPABILITIES.map(({ tag, text }) => (
            <Capability key={tag}>
              <Tag>{tag}</Tag>
              <span>{text}</span>
            </Capability>
          ))}
        </Capabilities>
      )}

      {provider.keyUrl && (
        <Footer>
          No key? <Link href={provider.keyUrl}>Create one</Link>
        </Footer>
      )}
    </Wrapper>
  );
};

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 1.25rem 1rem;
`;

const Back = styled.button`
  ${({ theme }) => css`
    align-self: flex-start;
    padding: 0 0 0.75rem;
    background: transparent;
    border: none;
    color: ${theme.colors.default.textSecondary};
    font: inherit;
    font-size: ${theme.font.code.size.small};
    cursor: pointer;

    &:hover {
      color: ${theme.colors.default.textPrimary};
    }

    &:focus-visible {
      outline: 1px solid ${theme.colors.default.primary};
    }
  `}
`;

const Intro = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  padding-bottom: 1.25rem;
`;

const Title = styled.h2`
  ${({ theme }) => css`
    margin: 0;
    color: ${theme.colors.default.textPrimary};
    font-size: ${theme.font.code.size.medium};
    font-weight: 600;
    line-height: 1.5;
  `}
`;

const Lead = styled.div`
  ${({ theme }) => css`
    color: ${theme.colors.default.textSecondary};
    font-size: ${theme.font.code.size.small};
    line-height: 1.65;
  `}
`;

const Label = styled.label`
  ${({ theme }) => css`
    display: block;
    color: ${theme.colors.default.textSecondary};
    font-size: ${theme.font.code.size.xsmall};
    letter-spacing: 0.1em;
    padding-bottom: 0.4375rem;
  `}
`;

const Providers = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  padding-bottom: 1rem;
`;

const ProviderOption = styled.button<{ $selected: boolean }>`
  ${({ theme, $selected }) => css`
    &:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    text-align: left;
    padding: 0.5rem 0.625rem;
    background: transparent;
    border: 1px solid
      ${$selected ? theme.colors.default.primary : theme.colors.default.border};
    border-radius: ${theme.default.borderRadius};
    font: inherit;
    cursor: pointer;
    transition: all ${theme.default.transition.duration.medium}
      ${theme.default.transition.type};

    &:hover {
      background: ${theme.colors.state.hover.bg};
    }

    &:focus-visible {
      outline: 1px solid ${theme.colors.default.primary};
      outline-offset: -1px;
    }
  `}
`;

const ProviderName = styled.div<{ $selected: boolean }>`
  ${({ theme, $selected }) => css`
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: ${$selected
      ? theme.colors.default.primary
      : theme.colors.default.textPrimary};
    font-size: ${theme.font.code.size.small};
  `}
`;

const NoKey = styled.span`
  ${({ theme }) => css`
    color: ${theme.colors.state.success.color};
    font-size: ${theme.font.code.size.xsmall};
  `}
`;

const ProviderDescription = styled.div`
  ${({ theme }) => css`
    padding-top: 0.1875rem;
    color: ${theme.colors.default.textSecondary};
    font-size: ${theme.font.code.size.xsmall};
    line-height: 1.5;
  `}
`;

const Field = styled(Input)`
  margin-bottom: 0.75rem;
`;

const Presets = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  padding-bottom: 0.4375rem;
`;

const Preset = styled.button<{ $selected: boolean }>`
  ${({ theme, $selected }) => css`
    padding: 0.1875rem 0.4375rem;
    background: ${$selected ? theme.colors.state.hover.bg : "transparent"};
    border: 1px solid
      ${$selected ? theme.colors.default.primary : theme.colors.default.border};
    border-radius: ${theme.default.borderRadius};
    color: ${$selected
      ? theme.colors.default.primary
      : theme.colors.default.textSecondary};
    font: inherit;
    font-size: ${theme.font.code.size.xsmall};
    cursor: pointer;
    transition: all ${theme.default.transition.duration.medium}
      ${theme.default.transition.type};

    &:hover {
      background: ${theme.colors.state.hover.bg};
      color: ${theme.colors.default.textPrimary};
    }

    &:focus-visible {
      outline: 1px solid ${theme.colors.default.primary};
      outline-offset: -1px;
    }
  `}
`;

const Picker = styled.div`
  margin-bottom: 0.75rem;
`;

const ConnectButton = styled(GradientButton)`
  margin-top: 0.75rem;
`;

const Note = styled.div`
  ${({ theme }) => css`
    padding-top: 0.875rem;
    color: ${theme.colors.default.textSecondary};
    font-size: ${theme.font.code.size.xsmall};
    line-height: 1.6;
  `}
`;

const Capabilities = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-top: 1.25rem;
`;

const Capability = styled.div`
  ${({ theme }) => css`
    display: flex;
    gap: 0.5625rem;
    color: ${theme.colors.default.textSecondary};
    font-size: ${theme.font.code.size.xsmall};
    line-height: 1.55;
  `}
`;

const Tag = styled.span`
  ${({ theme }) => css`
    width: 3.25rem;
    flex-shrink: 0;
    color: ${theme.colors.default.primary};
    letter-spacing: 0.06em;
  `}
`;

const Footer = styled.div`
  ${({ theme }) => css`
    margin-top: auto;
    padding-top: 1.25rem;
    text-align: center;
    color: ${theme.colors.default.textSecondary};
    font-size: ${theme.font.code.size.xsmall};
  `}
`;

export default Connect;
