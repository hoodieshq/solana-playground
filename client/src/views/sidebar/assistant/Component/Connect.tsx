import { useState } from "react";
import styled, { css } from "styled-components";

import Button from "../../../../components/Button";
import Input from "../../../../components/Input";
import Link from "../../../../components/Link";
import { PgAssistant } from "../store";

const CAPABILITIES = [
  { tag: "READS", text: "your open files, the project tree, the last compiler error" },
  { tag: "WRITES", text: "proposes patches as a diff — applied only when you click Apply" },
  { tag: "RUNS", text: "build and deploy, each behind an explicit approval" },
  { tag: "KNOWS", text: "this project's roadmap, decisions and current status" },
];

const Connect = () => {
  const [key, setKey] = useState("");

  return (
    <Wrapper>
      <Title>An assistant that can see your project</Title>
      <Lead>
        It reads your open files and the last build error, explains what went
        wrong against your actual code, and proposes patches you apply yourself.
      </Lead>

      <Label>ANTHROPIC API KEY</Label>
      <Input
        value={key}
        onChange={(ev) => setKey(ev.target.value)}
        onKeyDown={(ev) => {
          if (ev.key === "Enter") PgAssistant.setApiKey(key);
        }}
        placeholder="sk-ant-…"
        type="password"
        autoComplete="off"
      />
      <Connectbutton
        kind="primary"
        fullWidth
        disabled={!key.trim()}
        // `Button` restores its own loading state in a `finally` after awaiting
        // this handler, so unmounting synchronously here would leave it setting
        // state on an unmounted component. Let it finish first.
        onClick={() => setTimeout(() => PgAssistant.setApiKey(key), 0)}
      >
        Connect
      </Connectbutton>

      <Note>
        Held in memory for this tab only — never written to disk, never sent
        anywhere but Anthropic. You will re-enter it after a reload.
      </Note>

      <Capabilities>
        {CAPABILITIES.map(({ tag, text }) => (
          <Capability key={tag}>
            <Tag>{tag}</Tag>
            <span>{text}</span>
          </Capability>
        ))}
      </Capabilities>

      <Footer>
        No key? <Link href="https://console.anthropic.com/">Create one</Link>
      </Footer>
    </Wrapper>
  );
};

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 1.5rem 1rem;
`;

const Title = styled.div`
  ${({ theme }) => css`
    color: ${theme.colors.default.textPrimary};
    font-size: ${theme.font.code.size.medium};
    line-height: 1.5;
    padding-bottom: 0.625rem;
  `}
`;

const Lead = styled.div`
  ${({ theme }) => css`
    color: ${theme.colors.default.textSecondary};
    font-size: ${theme.font.code.size.small};
    line-height: 1.65;
    padding-bottom: 1.25rem;
  `}
`;

const Label = styled.div`
  ${({ theme }) => css`
    color: ${theme.colors.default.textSecondary};
    font-size: ${theme.font.code.size.xsmall};
    letter-spacing: 0.1em;
    padding-bottom: 0.4375rem;
  `}
`;

const Connectbutton = styled(Button)`
  margin-top: 0.75rem;
`;

const Note = styled.div`
  ${({ theme }) => css`
    padding-top: 1rem;
    color: ${theme.colors.default.textSecondary};
    font-size: ${theme.font.code.size.xsmall};
    line-height: 1.6;
  `}
`;

const Capabilities = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-top: 1.5rem;
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
