import type { FC } from "react";
import { useEffect, useRef, useState } from "react";
import styled, { css, keyframes, ThemeProvider } from "styled-components";
import type { DefaultTheme } from "styled-components";

import Terminal from "../../main/secondary/terminal/Component/Terminal";
import { useKeybind } from "../../../hooks";
import { PgBuildOutput } from "../../sidebar/assistant/bridge/build-output";
import { PgCommand, PgTerminal } from "../../../utils";
import { PgFlow } from "../state/stage";
import type { StageStatus } from "../state/stage";
import { BOTTOM_BAR_HEIGHT, BRAND, HEAD_INSET } from "../tokens";
import { describeConsoleStatus } from "./status";
import type { ConsoleStatus } from "./status";

/** The well: a step below the panel's own black, so the terminal reads as a
 * screen set into the workspace rather than more of the page */
const WELL = "#0B0B0C";

/**
 * What is written in the well. Fixed rather than read from the theme: the
 * well is near-black under every theme, so its ink has to be chosen against
 * that, not against whatever the rest of the window is set on.
 */
const INK = {
  /** A command's name at the prompt (the shell prints it bold) */
  command: "#FFFFFF",
  /** Plain output, and the prompt itself */
  output: "#C8C8CE",
  /** Progress lines: "Building...", "Deploying..." */
  muted: "#9A9AA2",
  /** Asides: completion hints, "(...)", "[yes/no]" */
  faint: "#75757D",
  error: "#EF4444",
  warning: "#F59E0B",
} as const;

/**
 * The theme the terminal is built with. `Terminal` hands
 * `components.terminal.xterm` straight to xterm, so this is the one place its
 * palette and caret can be set from outside it: the ANSI slots the shell
 * prints with are mapped to the ink above, success to Solana's green,
 * "Label:" headings to the brand's periwinkle. (The well's colour is plain
 * CSS on `Body`.)
 *
 * A module-level function on purpose. styled-components memoises a function
 * theme per outer theme, so this object only changes when the app's theme
 * does -- `Terminal` rebuilds xterm (and loses its scrollback) whenever the
 * theme it sees changes identity.
 *
 * The caret is a block that does not blink by itself: xterm only blinks a
 * focused terminal, and this one should read as live while you watch it, so
 * the blink is CSS below (and stops under reduced motion).
 */
const asTerminal = (theme: DefaultTheme): DefaultTheme => {
  const { terminal } = theme.components;
  return {
    ...theme,
    components: {
      ...theme.components,
      terminal: {
        ...terminal,
        xterm: {
          ...terminal.xterm,
          textPrimary: INK.output,
          textSecondary: INK.faint,
          primary: BRAND.periwinkle,
          secondary: INK.command,
          success: BRAND.green,
          error: INK.error,
          warning: INK.warning,
          info: INK.muted,
          selectionBg: BRAND.purple,
          cursor: {
            ...terminal.xterm.cursor,
            color: BRAND.green,
            accentColor: WELL,
            blink: false,
            kind: "block",
          },
        },
      },
    },
  };
};

/**
 * The console lives at the bottom of the center column and collapses by
 * height rather than unmounting, so the xterm buffer (scrollback, running
 * process) survives while the drawer is closed.
 *
 * It is drawn as a terminal: a thin strip that names it and holds its two
 * actions, over a near-black well in the code face. The strip is still the
 * whole handle -- click anywhere on it to open or close -- and the chevron at
 * its end is the same toggle as a real button, for the keyboard.
 */
const ConsoleDrawer: FC = () => {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<ConsoleStatus>(() =>
    describeConsoleStatus(PgFlow.state)
  );
  // A build or deploy is writing to the terminal. Clearing then would wipe
  // its output mid-stream and print a prompt the shell is not showing yet.
  const [busy, setBusy] = useState(false);
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
      setBusy(flow.build === "running" || flow.deploy === "running");
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
      <Strip $open={open} onClick={() => setOpen((o) => !o)}>
        <Title $open={open}>Terminal</Title>
        {status.text && (
          <Status $tone={status.tone}>
            {status.tone !== "idle" && <StatusDot $tone={status.tone} />}
            <StatusText>{status.text}</StatusText>
          </Status>
        )}
        <Hint aria-hidden>&#8984;J</Hint>
        <IconButton
          type="button"
          aria-label="Clear the terminal"
          title="Clear"
          disabled={busy}
          $hidden={!open}
          onClick={(ev) => {
            ev.stopPropagation();
            PgTerminal.clear();
          }}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="8" cy="8" r="5.75" />
            <path d="M3.95 3.95l8.1 8.1" />
          </svg>
        </IconButton>
        <IconButton
          type="button"
          aria-expanded={open}
          aria-controls="flow-console-drawer-body"
          aria-label={open ? "Hide the terminal" : "Show the terminal"}
          title={open ? "Hide (\u2318J)" : "Show (\u2318J)"}
          onClick={(ev) => {
            ev.stopPropagation();
            setOpen((o) => !o);
          }}
        >
          <Chevron $open={open} viewBox="0 0 16 16" aria-hidden="true">
            <path d="M4.5 6.25L8 9.75l3.5-3.5" />
          </Chevron>
        </IconButton>
      </Strip>
      <Body id="flow-console-drawer-body" $open={open}>
        <ThemeProvider theme={asTerminal}>
          <Terminal />
        </ThemeProvider>
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

/* The chrome is set in the interface face, like every other panel head; the
   code face is kept for what the terminal itself prints. */
const Title = styled.span<{ $open: boolean }>`
  ${({ theme, $open }) => css`
    flex-shrink: 0;
    font-weight: 500;
    color: ${$open
      ? theme.colors.default.textPrimary
      : theme.colors.default.textSecondary};
    transition: color 140ms ease;

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  `}
`;

const Strip = styled.div<{ $open: boolean }>`
  ${({ theme, $open }) => css`
    display: flex;
    align-items: center;
    gap: 0.5rem;
    height: ${BOTTOM_BAR_HEIGHT};
    padding: 0 0.3125rem 0 ${HEAD_INSET};
    /* The well's top edge, drawn only while there is a well under it */
    border-bottom: 1px solid
      ${$open ? theme.colors.default.border : "transparent"};
    color: ${theme.colors.default.textSecondary};
    font-size: ${theme.font.other.size.xsmall};
    cursor: pointer;
    user-select: none;

    &:hover ${Title} {
      color: ${theme.colors.default.textPrimary};
    }
  `}
`;

const Status = styled.span<{ $tone: ConsoleStatus["tone"] }>`
  ${({ theme, $tone }) => css`
    display: flex;
    align-items: center;
    gap: 0.375rem;
    min-width: 0;
    font-variant-numeric: tabular-nums;
    color: ${$tone === "error"
      ? theme.colors.state.error.color
      : theme.colors.default.textSecondary};
  `}
`;

/* The result's colour, carried by a dot so the words can stay quiet */
const StatusDot = styled.span<{ $tone: ConsoleStatus["tone"] }>`
  ${({ theme, $tone }) => css`
    flex-shrink: 0;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${$tone === "error"
      ? theme.colors.state.error.color
      : theme.colors.state.success.color};
  `}
`;

const StatusText = styled.span`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Hint = styled.span`
  margin-left: auto;
  padding-right: 0.25rem;
  font-size: 0.75rem;
  opacity: 0.6;
  white-space: nowrap;
`;

const IconButton = styled.button<{ $hidden?: boolean }>`
  ${({ theme, $hidden }) => css`
    flex-shrink: 0;
    width: 1.375rem;
    height: 1.375rem;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: ${theme.colors.default.textSecondary};
    cursor: pointer;
    /* Hidden, not removed, while the drawer is closed: the strip keeps its
       layout, and a hidden button is out of the tab order anyway */
    visibility: ${$hidden ? "hidden" : "visible"};

    & > svg {
      width: 0.875rem;
      height: 0.875rem;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.5;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    &:not(:disabled):hover {
      background: ${theme.colors.state.hover.bg};
      color: ${theme.colors.default.textPrimary};
    }
    &:disabled {
      opacity: 0.4;
      cursor: default;
    }
    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
      outline-offset: -1px;
    }
  `}
`;

/* Down while open (it folds the drawer away), up while closed */
const Chevron = styled.svg<{ $open: boolean }>`
  transform: rotate(${({ $open }) => ($open ? "0deg" : "180deg")});
  transition: transform 200ms cubic-bezier(0.2, 0, 0, 1);

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

/* A terminal's caret: on for half a beat, off for half, with no easing */
const caret = keyframes`
  50% {
    background-color: transparent;
    color: ${INK.output};
  }
`;

const Body = styled.div<{ $open: boolean }>`
  display: flex;
  flex-direction: column;
  height: ${({ $open }) => ($open ? "16rem" : "0")};
  overflow: hidden;
  background: ${WELL};
  transition: height 320ms cubic-bezier(0.2, 0, 0, 1);

  /* Terminal's own root has no explicit height; stretch it to fill the
     drawer body so xterm's ResizeObserver sees a real, non-zero size. Its
     background is the theme's page colour; this one is the well's, and the
     viewport inside inherits it. */
  & > div {
    flex: 1;
    min-height: 0;
    background: ${WELL};
  }

  /* xterm's own chrome, set from outside it. The doubled class outranks both
     Terminal's wrapper rules and the stylesheet xterm injects beside itself.
     The left inset matches the strip's, so the output starts under the word
     "Terminal". */
  && .xterm {
    padding: 0.5rem ${HEAD_INSET} 0.25rem;
  }

  && .xterm-viewport {
    scrollbar-width: thin;
    scrollbar-color: #2a2a2e transparent;
  }

  /* The block caret after the last line, filled and blinking whether or not
     the terminal has focus -- xterm's own draws an outline until you click
     in, which reads as a terminal that is not listening. */
  && .xterm .xterm-rows .xterm-cursor.xterm-cursor-block {
    outline: none;
    background-color: ${BRAND.green};
    color: ${WELL};
    animation: ${caret} 1.1s step-end infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;

    && .xterm .xterm-rows .xterm-cursor.xterm-cursor-block {
      animation: none;
    }
  }
`;
