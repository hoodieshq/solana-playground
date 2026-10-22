import type { FC } from "react";
import { useEffect, useRef, useState } from "react";
import styled, { css } from "styled-components";

import Terminal from "../../main/secondary/terminal/Component/Terminal";
import { useKeybind } from "../../../hooks";
import { PgBuildOutput } from "../../sidebar/assistant/bridge/build-output";
import { PgCommand } from "../../../utils";
import { PgFlow } from "../state/stage";
import type { StageStatus } from "../state/stage";
import { BOTTOM_BAR_HEIGHT } from "../tokens";
import { describeConsoleStatus } from "./status";
import type { ConsoleStatus } from "./status";

/**
 * The console lives at the bottom of the center column and collapses by
 * height rather than unmounting, so the xterm buffer (scrollback, running
 * process) survives while the drawer is closed.
 */
const ConsoleDrawer: FC = () => {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<ConsoleStatus>(() =>
    describeConsoleStatus(PgFlow.state)
  );
  const prevDeploy = useRef<StageStatus | null>(null);
  useKeybind("Ctrl+J", () => setOpen((o) => !o));

  // Opens on deploy start and on the transition into failure; never
  // re-opens on unrelated state changes.
  useEffect(() => {
    const a = PgCommand.deploy.onDidStart(() => setOpen(true));
    const b = PgFlow.onDidChange((flow) => {
      const prev = prevDeploy.current;
      prevDeploy.current = flow.deploy;
      if (flow.deploy === "failed" && prev !== "failed") setOpen(true);
      setStatus(describeConsoleStatus(flow));
    });
    // `PgBuildOutput` fills in slightly after the `build-finish` event that
    // sets `flow.build`, and it carries the diagnostic code a failed
    // status line needs -- recompute once it lands so a failed build never
    // gets stuck on the bare "build failed" fallback.
    const c = PgBuildOutput.onDidChange(() =>
      setStatus(describeConsoleStatus(PgFlow.state))
    );
    return () => {
      a.dispose();
      b.dispose();
      c.dispose();
    };
  }, []);

  return (
    <Wrapper>
      <Handle
        type="button"
        aria-expanded={open}
        aria-controls="flow-console-drawer-body"
        aria-label="Console"
        onClick={() => setOpen((o) => !o)}
      >
        {/* \u25be/\u25b8 keep the source ASCII-only: the small
            down-pointing / right-pointing triangles the board uses. */}
        <Glyph aria-hidden>{open ? "\u25be" : "\u25b8"}</Glyph>
        <TextGroup>
          <Label>CONSOLE</Label>
          {status.text && (
            <Status $tone={status.tone}>{` ${status.text}`}</Status>
          )}
        </TextGroup>
        <Hint>&#8984;J</Hint>
      </Handle>
      <Body id="flow-console-drawer-body" $open={open}>
        <Terminal />
      </Body>
    </Wrapper>
  );
};

export default ConsoleDrawer;

// Transparent: this drawer lives inside \`Center\`'s single floating panel
// (\`views/flow/Flow.tsx\`), which already supplies the panel background --
// the top border is only the internal divider between stage and console.
const Wrapper = styled.div`
  ${({ theme }) => css`
    border-top: 1px solid ${theme.colors.default.border};
    background: transparent;
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
  `}
`;

const Handle = styled.button`
  ${({ theme }) => css`
    display: flex;
    align-items: center;
    gap: 0.5rem;
    height: ${BOTTOM_BAR_HEIGHT};
    padding: 0 0.75rem;
    border: none;
    background: transparent;
    color: ${theme.colors.default.textSecondary};
    font-family: ${theme.font.code.family};
    font-size: ${theme.font.code.size.small};
    cursor: pointer;
    text-align: left;
    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
    }
  `}
`;

const Glyph = styled.span`
  display: inline-block;
  font-size: 0.8em;
`;

const TextGroup = styled.span`
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Label = styled.span`
  ${({ theme }) => css`
    color: ${theme.colors.default.textPrimary};
    font-weight: 600;
    letter-spacing: 0.06em;
  `}
`;

const Status = styled.span<{ $tone: ConsoleStatus["tone"] }>`
  ${({ theme, $tone }) => css`
    color: ${$tone === "error"
      ? theme.colors.state.error.color
      : theme.colors.default.textSecondary};
  `}
`;

const Hint = styled.span`
  margin-left: auto;
  opacity: 0.6;
`;

const Body = styled.div<{ $open: boolean }>`
  display: flex;
  flex-direction: column;
  height: ${({ $open }) => ($open ? "16rem" : "0")};
  overflow: hidden;
  transition: height 320ms cubic-bezier(0.2, 0, 0, 1);

  /* Terminal's own root has no explicit height; stretch it to fill the
     drawer body so xterm's ResizeObserver sees a real, non-zero size. */
  & > div {
    flex: 1;
    min-height: 0;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;
