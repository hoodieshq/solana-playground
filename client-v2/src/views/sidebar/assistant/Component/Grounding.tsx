import { useState } from "react";
import styled, { css } from "styled-components";

import Checkbox from "../../../../components/Checkbox";
import { useRenderOnChange } from "../../../../hooks";
import { PgAssistant } from "../store";
import {
  MCP_SERVERS,
  parseServers,
  serializeServers,
  SKILLS,
} from "../grounding";
import { PROVIDERS } from "../model/types";

/** The only backend with a server-side MCP connector */
const MCP_PROVIDER = "anthropic";

const Grounding = () => {
  useRenderOnChange(PgAssistant.onDidChange);

  const enabledSkills = PgAssistant.enabledSkillIds;
  const servers = PgAssistant.mcpServers;
  const providerId = PgAssistant.connection?.id;
  const providerName = PROVIDERS.find((p) => p.id === providerId)?.name;
  const mcpUsable = providerId === MCP_PROVIDER;

  const [draft, setDraft] = useState(() => serializeServers(servers));
  const [error, setError] = useState<string | null>(null);

  const applied = serializeServers(servers);
  const dirty = draft !== applied;

  const apply = () => {
    try {
      const parsed = parseServers(draft);
      PgAssistant.setMcpServers(parsed);
      // Show the normalised result, so defaults the parser filled in are visible
      setDraft(serializeServers(parsed));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const reset = () => {
    setDraft(serializeServers(MCP_SERVERS));
    setError(null);
  };

  return (
    <Wrapper>
      <Section>
        <Heading>SKILLS</Heading>
        <Lead>
          Reference documents the assistant loads when it decides it needs them.
          Only the names and descriptions below sit in the prompt.
        </Lead>

        {SKILLS.map((skill) => (
          <Row key={skill.id}>
            <Checkbox
              label={skill.name}
              checked={enabledSkills.includes(skill.id)}
              onChange={(ev) =>
                PgAssistant.setSkillEnabled(skill.id, ev.target.checked)
              }
            />
            <RowNote>
              {skill.source.type === "bundled"
                ? "bundled — always available"
                : "fetched from GitHub when loaded"}
            </RowNote>
          </Row>
        ))}
      </Section>

      <Section>
        <Heading>MCP SERVERS</Heading>
        <Lead>
          Tools the model calls on a remote server. Anthropic opens the
          connection on its side, which is why servers that send no CORS headers
          still work.
        </Lead>

        {providerId && !mcpUsable && (
          <Warning>
            {providerName} cannot use MCP — it has no server-side connector.
            Skills still work on every backend. Switch to Anthropic for MCP.
          </Warning>
        )}

        <Active>
          {servers.filter((s) => s.enabled).length
            ? `In effect: ${servers
                .filter((s) => s.enabled)
                .map((s) => s.name || s.id)
                .join(", ")}`
            : "In effect: nothing — every server is disabled."}
        </Active>

        <Json
          value={draft}
          onChange={(ev) => setDraft(ev.target.value)}
          spellCheck={false}
          rows={16}
          aria-label="MCP server configuration"
        />

        {error && <ErrorText role="alert">{error}</ErrorText>}

        <Actions>
          <Action onClick={apply} disabled={!dirty}>
            {dirty ? "Apply" : "Applied"}
          </Action>
          <Action onClick={reset}>Reset to defaults</Action>
        </Actions>

        <Note>
          <code>authToken</code> is sent as a bearer token.{" "}
          <code>queryParams</code> is folded into the URL — the only way to pass
          a credential a server wants outside the Authorization header, such as
          a bot-protection bypass. <code>headers</code> is accepted but{" "}
          <strong>not sent</strong>: the connector&apos;s server definition has
          no header map, so a server that truly needs a custom header is out of
          reach until we run a proxy. See docs/decisions.md &rarr; D12.
        </Note>
      </Section>
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

const Section = styled.div`
  &:not(:first-child) {
    padding-top: 1.75rem;
  }
`;

const Heading = styled.div`
  ${({ theme }) => css`
    color: ${theme.colors.default.textSecondary};
    font-size: ${theme.font.code.size.xsmall};
    letter-spacing: 0.1em;
    padding-bottom: 0.4375rem;
  `}
`;

const Lead = styled.div`
  ${({ theme }) => css`
    color: ${theme.colors.default.textSecondary};
    font-size: ${theme.font.code.size.xsmall};
    line-height: 1.6;
    padding-bottom: 0.875rem;
  `}
`;

const Row = styled.div`
  padding-bottom: 0.75rem;
`;

const RowNote = styled.div`
  ${({ theme }) => css`
    padding-left: 1.25rem;
    padding-top: 0.1875rem;
    color: ${theme.colors.default.textSecondary};
    font-size: ${theme.font.code.size.xsmall};
  `}
`;

const Warning = styled.div`
  ${({ theme }) => css`
    margin-bottom: 0.875rem;
    padding: 0.5rem 0.625rem;
    border: 1px solid ${theme.colors.state.warning.color}55;
    border-radius: ${theme.default.borderRadius};
    color: ${theme.colors.default.textSecondary};
    font-size: ${theme.font.code.size.xsmall};
    line-height: 1.55;
  `}
`;

const Active = styled.div`
  ${({ theme }) => css`
    padding-bottom: 0.4375rem;
    color: ${theme.colors.default.textSecondary};
    font-size: ${theme.font.code.size.xsmall};
  `}
`;

const Json = styled.textarea`
  ${({ theme }) => css`
    width: 100%;
    resize: vertical;
    padding: 0.5rem 0.625rem;
    background: ${theme.colors.default.bgPrimary};
    border: 1px solid ${theme.colors.default.border};
    border-radius: ${theme.default.borderRadius};
    color: ${theme.colors.default.textPrimary};
    font-family: ${theme.font.code.family};
    font-size: ${theme.font.code.size.small};
    line-height: 1.5;
    tab-size: 2;

    &:focus-visible {
      outline: 1px solid ${theme.colors.default.primary};
      outline-offset: -1px;
    }
  `}
`;

const ErrorText = styled.div`
  ${({ theme }) => css`
    padding-top: 0.4375rem;
    color: ${theme.colors.state.error.color};
    font-size: ${theme.font.code.size.xsmall};
    line-height: 1.5;
  `}
`;

const Actions = styled.div`
  display: flex;
  gap: 0.375rem;
  padding-top: 0.625rem;
`;

const Action = styled.button`
  ${({ theme }) => css`
    padding: 0.3125rem 0.625rem;
    background: transparent;
    border: 1px solid ${theme.colors.default.border};
    border-radius: ${theme.default.borderRadius};
    color: ${theme.colors.default.textSecondary};
    font: inherit;
    font-size: ${theme.font.code.size.xsmall};
    cursor: pointer;

    &:hover:not(:disabled) {
      background: ${theme.colors.state.hover.bg};
      color: ${theme.colors.default.textPrimary};
    }

    &:disabled {
      opacity: 0.45;
      cursor: default;
    }
  `}
`;

const Note = styled.div`
  ${({ theme }) => css`
    padding-top: 0.875rem;
    color: ${theme.colors.default.textSecondary};
    font-size: ${theme.font.code.size.xsmall};
    line-height: 1.6;

    & code {
      font-family: ${theme.font.code.family};
    }
  `}
`;

export default Grounding;
