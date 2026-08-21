import type { FC } from "react";
import { useState } from "react";
import styled, { css } from "styled-components";

import Terminal from "../../main/secondary/terminal/Component/Terminal";
import { useKeybind } from "../../../hooks";

/**
 * The console lives at the bottom of the center column and collapses by
 * height rather than unmounting, so the xterm buffer (scrollback, running
 * process) survives while the drawer is closed.
 */
const ConsoleDrawer: FC = () => {
  const [open, setOpen] = useState(false);
  useKeybind("Ctrl+J", () => setOpen((o) => !o));

  return (
    <Wrapper $open={open}>
      <Handle
        type="button"
        aria-expanded={open}
        aria-controls="flow-console-drawer-body"
        onClick={() => setOpen((o) => !o)}
      >
        Console {open ? "▾" : "▴"}
        <Hint>Cmd+J</Hint>
      </Handle>
      <Body id="flow-console-drawer-body" $open={open}>
        <Terminal />
      </Body>
    </Wrapper>
  );
};

export default ConsoleDrawer;

const Wrapper = styled.div<{ $open: boolean }>`
  ${({ theme }) => css`
    border-top: 1px solid ${theme.colors.default.border};
    background: ${theme.colors.default.bgPrimary};
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
    height: 1.75rem;
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
