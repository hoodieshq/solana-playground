import { useEffect, useState } from "react";
import styled, { css, keyframes } from "styled-components";

import IdlActions from "./IdlActions";
import { parseBuildReport } from "./build-report";
import type { BuildReport } from "./build-report";
import Button from "../../../components/Button";
import { PgBuildOutput } from "../../sidebar/assistant/bridge/build-output";
import type { BuildOutput } from "../../sidebar/assistant/bridge/build-output";
import GradientButton from "../../sidebar/assistant/Component/GradientButton";
import { PgAssistant } from "../../sidebar/assistant/store";
import { PgFlow } from "../state/stage";
import type { FlowState } from "../state/stage";
import { PgCommand, PgExplorer, PgFramework } from "../../../utils";

/** `flow.buildMs` as a ` - 3.2s` suffix, or nothing while it is unknown */
const msSuffix = (ms: number | null) =>
  ms === null ? "" : ` - ${(ms / 1000).toFixed(1)}s`;

const Build = () => {
  const [out, setOut] = useState<BuildOutput | null>(null);
  const [flow, setFlow] = useState<FlowState>(PgFlow.state);
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    const a = PgBuildOutput.onDidChange(setOut);
    const b = PgFlow.onDidChange(setFlow);
    return () => {
      a.dispose();
      b.dispose();
    };
  }, []);

  const report: BuildReport | null = out ? parseBuildReport(out.stderr) : null;
  const ms = msSuffix(flow.buildMs);

  if (!out) {
    return (
      <Surface>
        <EmptyMark viewBox="0 0 40 40" width="40" height="40" aria-hidden>
          <rect x="6" y="20" width="6" height="14" />
          <rect x="17" y="12" width="6" height="22" />
          <rect x="28" y="6" width="6" height="28" />
        </EmptyMark>
        <Headline>Nothing built yet</Headline>
        <Muted>
          Build compiles your program on the server. Nothing leaves your browser
          except the source.
        </Muted>
        <Actions>
          <Button kind="primary" onClick={() => PgCommand.build.execute()}>
            Build
          </Button>
        </Actions>
      </Surface>
    );
  }

  if (!out.failed) {
    return (
      <Surface>
        <StatusRow>
          <StatusGlyph
            $ok
            viewBox="0 0 14 14"
            width="18"
            height="18"
            aria-hidden
          >
            <circle cx="7" cy="7" r="6" className="fill" />
            <path
              d="M4.2 7.3l1.9 1.9 3.7-4"
              fill="none"
              stroke="var(--on-fill)"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </StatusGlyph>
          <Headline $ok>
            Build succeeded
            <Ms>{ms}</Ms>
          </Headline>
        </StatusRow>
        <Muted>The IDL below reflects this build. Deploy when ready.</Muted>
        <Actions>
          <GradientButton onClick={() => PgFlow.setStage("deploy")}>
            Continue to Deploy
          </GradientButton>
          <IdlActions showGenerate />
          <Button onClick={() => PgFramework.exportWorkspace()}>
            Export project
          </Button>
        </Actions>
      </Surface>
    );
  }

  const n = report?.diagnostics.length ?? flow.buildErrorCount;
  return (
    <Surface>
      <StatusRow>
        <StatusGlyph viewBox="0 0 14 14" width="18" height="18" aria-hidden>
          <circle cx="7" cy="7" r="6" className="fill" />
          <path
            d="M4.6 4.6l4.8 4.8M9.4 4.6l-4.8 4.8"
            fill="none"
            stroke="var(--on-fill)"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </StatusGlyph>
        <Headline $error>
          Build failed
          <Count>
            {n} error{n === 1 ? "" : "s"}
          </Count>
          <Ms>{ms}</Ms>
        </Headline>
      </StatusRow>

      <CardList>
        {report?.diagnostics.map((d, i) => (
          <Card key={i}>
            <CardHead>
              <Index aria-hidden>{String(i + 1).padStart(2, "0")}</Index>
              <CardHeadText>
                <CardTitle>
                  {d.code && <CodeChip>{d.code}</CodeChip>}
                  {d.title}
                </CardTitle>
                {d.file && (
                  <Location>
                    {d.file}
                    <LocationDim>
                      :{d.line}:{d.col}
                    </LocationDim>
                  </Location>
                )}
              </CardHeadText>
            </CardHead>

            {d.excerpt && <Excerpt>{d.excerpt}</Excerpt>}

            <CardActions>
              <GradientButton
                onClick={() => {
                  PgAssistant.requestPrompt(
                    `Explain this build error and propose a fix: ` +
                      `${d.code ?? ""} ${d.title} at ${d.file}:${d.line}`
                  );
                }}
              >
                Fix with assistant
              </GradientButton>
              {d.file && (
                <Button onClick={() => PgExplorer.openFile(d.file as string)}>
                  Open in editor
                </Button>
              )}
            </CardActions>
          </Card>
        ))}
      </CardList>

      <RawSection>
        <Toggle
          type="button"
          aria-expanded={showRaw}
          onClick={() => setShowRaw((s) => !s)}
        >
          <Chevron $open={showRaw} aria-hidden>
            <path d="M3 2l4 4-4 4" fill="none" strokeWidth="1.4" />
          </Chevron>
          {showRaw ? "Hide" : "Show"} raw compiler output
        </Toggle>
        {showRaw && <Raw>{report?.raw}</Raw>}
      </RawSection>
    </Surface>
  );
};

export default Build;

const rise = keyframes`
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
`;

const Surface = styled.div`
  ${({ theme }) => css`
    height: 100%;
    overflow-y: auto;
    padding: 2rem 1.75rem;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
    font-family: ${theme.font.other.family};
    color: ${theme.colors.default.textPrimary};
  `}
`;

const EmptyMark = styled.svg`
  ${({ theme }) => css`
    margin-bottom: 0.25rem;
    fill: ${theme.colors.default.textSecondary};
    opacity: 0.55;
  `}
`;

const StatusRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.625rem;
`;

const StatusGlyph = styled.svg<{ $ok?: boolean }>`
  ${({ theme, $ok }) => css`
    flex-shrink: 0;
    --on-fill: ${theme.colors.default.bgPrimary};

    .fill {
      fill: ${$ok
        ? theme.colors.state.success.color
        : theme.colors.state.error.color};
    }
  `}
`;

const Headline = styled.h2<{ $ok?: boolean; $error?: boolean }>`
  ${({ theme, $ok, $error }) => css`
    margin: 0;
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    font-size: ${theme.font.other.size.xlarge};
    font-weight: 600;
    letter-spacing: -0.01em;
    color: ${$ok
      ? theme.colors.state.success.color
      : $error
      ? theme.colors.state.error.color
      : theme.colors.default.textPrimary};
  `}
`;

const Count = styled.span`
  ${({ theme }) => css`
    font-size: ${theme.font.other.size.medium};
    font-weight: 400;
    color: ${theme.colors.default.textSecondary};
  `}
`;

const Ms = styled.span`
  ${({ theme }) => css`
    font-family: ${theme.font.code.family};
    font-size: ${theme.font.other.size.small};
    font-weight: 400;
    color: ${theme.colors.default.textSecondary};
  `}
`;

const Muted = styled.p`
  ${({ theme }) => css`
    margin: 0;
    max-width: 34rem;
    font-size: ${theme.font.other.size.small};
    line-height: 1.55;
    color: ${theme.colors.default.textSecondary};
  `}
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.625rem;
  align-items: center;
  margin-top: 0.25rem;
`;

const CardList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  width: 100%;
  max-width: 42rem;
  margin-top: 0.5rem;
`;

const Card = styled.section`
  ${({ theme }) => css`
    padding: 1.125rem 1.25rem;
    border: 1px solid ${theme.colors.default.border};
    border-radius: ${theme.default.borderRadius};
    background: ${theme.colors.default.bgSecondary};
    display: flex;
    flex-direction: column;
    gap: 0.875rem;
    animation: ${rise} 180ms ease both;

    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }
  `}
`;

const CardHead = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
`;

const Index = styled.span`
  ${({ theme }) => css`
    flex-shrink: 0;
    padding-top: 0.125rem;
    font-family: ${theme.font.code.family};
    font-size: ${theme.font.code.size.small};
    color: ${theme.colors.state.error.color};
    opacity: 0.7;
  `}
`;

const CardHeadText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.3125rem;
  min-width: 0;
`;

const CardTitle = styled.h3`
  ${({ theme }) => css`
    margin: 0;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
    font-size: ${theme.font.other.size.medium};
    font-weight: 600;
  `}
`;

const CodeChip = styled.span`
  ${({ theme }) => css`
    padding: 0.0625rem 0.375rem;
    border: 1px solid ${theme.colors.state.error.color};
    border-radius: ${theme.default.borderRadius};
    font-family: ${theme.font.code.family};
    font-size: ${theme.font.code.size.xsmall};
    color: ${theme.colors.state.error.color};
  `}
`;

const Location = styled.div`
  ${({ theme }) => css`
    font-family: ${theme.font.code.family};
    font-size: ${theme.font.code.size.small};
    color: ${theme.colors.default.textPrimary};
  `}
`;

const LocationDim = styled.span`
  ${({ theme }) => css`
    color: ${theme.colors.default.textSecondary};
  `}
`;

const Excerpt = styled.pre`
  ${({ theme }) => css`
    margin: 0;
    padding: 0.75rem 0.875rem;
    overflow-x: auto;
    border-radius: ${theme.default.borderRadius};
    background: ${theme.colors.default.bgPrimary};
    border: 1px solid ${theme.colors.default.border};
    font-family: ${theme.font.code.family};
    font-size: ${theme.font.code.size.small};
    line-height: 1.5;
    color: ${theme.colors.default.textSecondary};
  `}
`;

const CardActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
`;

const RawSection = styled.div`
  width: 100%;
  max-width: 42rem;
  margin-top: 0.25rem;
`;

const Toggle = styled.button`
  ${({ theme }) => css`
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    border: none;
    background: none;
    padding: 0;
    color: ${theme.colors.default.textSecondary};
    cursor: pointer;
    font: inherit;
    font-size: ${theme.font.other.size.small};

    &:hover {
      color: ${theme.colors.default.textPrimary};
    }
  `}
`;

const Chevron = styled.svg.attrs({ viewBox: "0 0 8 8", width: 8, height: 8 })<{
  $open: boolean;
}>`
  ${({ theme, $open }) => css`
    flex-shrink: 0;
    stroke: currentColor;
    transition: transform ${theme.default.transition.duration.medium}
      ${theme.default.transition.type};
    transform: rotate(${$open ? "90deg" : "0deg"});

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  `}
`;

const Raw = styled.pre`
  ${({ theme }) => css`
    margin: 0.5rem 0 0;
    padding: 0.75rem 0.875rem;
    overflow-x: auto;
    white-space: pre-wrap;
    border-radius: ${theme.default.borderRadius};
    background: ${theme.colors.default.bgPrimary};
    border: 1px solid ${theme.colors.default.border};
    font-family: ${theme.font.code.family};
    font-size: ${theme.font.code.size.small};
    line-height: 1.5;
    color: ${theme.colors.default.textSecondary};
  `}
`;
