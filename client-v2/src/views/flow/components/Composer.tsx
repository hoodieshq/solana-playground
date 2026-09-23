import { FC } from "react";
import styled, { css } from "styled-components";

/**
 * The composer, as one object: where you type, and a row of controls along
 * its bottom edge. It appears on the home screen and in the assistant pane,
 * and it is the same component in both, so the controls a person meets on the
 * first screen are the ones they find on the second.
 *
 * Until a backend is connected it is a stand-in: every control opens the
 * assistant (or its setup) rather than accepting a sentence that would then
 * have nowhere to go. Once connected, `Chat` renders its own live composer,
 * shaped to match.
 */

interface ComposerProps {
  /** What happens when any part of it is used */
  onActivate: () => void;
  placeholder?: string;
  /** Narrower padding, for the assistant pane and for list views */
  compact?: boolean;
  /** Label of the mode control, e.g. "Assistant" */
  mode?: string;
  /** Label of the model control, e.g. "Model" */
  model?: string;
}

const Composer: FC<ComposerProps> = ({
  onActivate,
  placeholder = "Ask anything…",
  compact = false,
  mode = "Assistant",
  model = "Model",
}) => (
  <Box $compact={compact}>
    <Input type="button" onClick={onActivate} aria-label="Ask the assistant">
      {placeholder}
    </Input>
    <Bar>
      <Group>
        <Chip type="button" onClick={onActivate} aria-label="Attach">
          {ICONS.plus}
        </Chip>
        <Chip type="button" onClick={onActivate} aria-label="Tools">
          {ICONS.grid}
        </Chip>
        <Mode type="button" onClick={onActivate}>
          <Glyph aria-hidden="true">{ICONS.send}</Glyph>
          {mode}
        </Mode>
      </Group>
      <Group>
        <Mode type="button" onClick={onActivate}>
          <Glyph aria-hidden="true">{ICONS.asterisk}</Glyph>
          {model}
          <Glyph aria-hidden="true">{ICONS.chevron}</Glyph>
        </Mode>
        <Chip type="button" onClick={onActivate} aria-label="Voice">
          {ICONS.mic}
        </Chip>
        <Send type="button" onClick={onActivate} aria-label="Send">
          {ICONS.up}
        </Send>
      </Group>
    </Bar>
  </Box>
);

export default Composer;

const svg = (d: JSX.Element) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {d}
  </svg>
);

const ICONS = {
  asterisk: svg(<path d="M12 4v16M4.9 7.5l14.2 9M19.1 7.5l-14.2 9" />),
  plus: svg(
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  grid: svg(
    <>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </>
  ),
  send: svg(<path d="M21 3 10.5 13.5M21 3l-6.8 18-3.7-7.5L3 9.8z" />),
  chevron: svg(<path d="m6 9 6 6 6-6" />),
  mic: svg(
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </>
  ),
  up: svg(
    <>
      <path d="M12 19V5" />
      <path d="m6 11 6-6 6 6" />
    </>
  ),
};

/* 14px radius, a 3.5rem typing area, 2rem controls. */
const Box = styled.div<{ $compact: boolean }>`
  ${({ theme, $compact }) => css`
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
    padding: ${$compact ? "0.625rem 0.75rem" : "0.75rem 0.875rem"};
    border: 1px solid ${theme.colors.default.border};
    border-radius: 14px;
    background: ${theme.colors.default.bgSecondary};
    transition: padding 0.28s ease, border-color 0.15s ease;

    &:hover {
      border-color: ${theme.colors.default.textSecondary}33;
    }

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  `}
`;

const Input = styled.button`
  ${({ theme }) => css`
    display: block;
    width: 100%;
    min-height: 3.5rem;
    padding: 0.5rem 0.375rem 0;
    border: none;
    background: none;
    color: ${theme.colors.state.disabled.color};
    font-family: inherit;
    font-size: 0.9375rem;
    text-align: left;
    cursor: text;
  `}
`;

const Bar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
`;

const Group = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  min-width: 0;
`;

const Glyph = styled.span`
  display: flex;
  flex-shrink: 0;
  width: 0.9375rem;
  height: 0.9375rem;

  & > svg {
    width: 100%;
    height: 100%;
  }
`;

const Chip = styled.button`
  ${({ theme }) => css`
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 2rem;
    height: 2rem;
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

    &:hover {
      background: ${theme.colors.state.hover.bg};
      color: ${theme.colors.default.textPrimary};
    }
  `}
`;

const Mode = styled.button`
  ${({ theme }) => css`
    display: flex;
    align-items: center;
    gap: 0.375rem;
    height: 2rem;
    padding: 0 0.625rem;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: ${theme.colors.default.textSecondary};
    font-family: inherit;
    font-size: 0.8125rem;
    font-weight: 500;
    white-space: nowrap;
    cursor: pointer;

    &:hover {
      background: ${theme.colors.state.hover.bg};
      color: ${theme.colors.default.textPrimary};
    }
  `}
`;

const Send = styled.button`
  ${({ theme }) => css`
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 1.875rem;
    height: 1.875rem;
    margin-left: 0.25rem;
    padding: 0;
    border: none;
    border-radius: 999px;
    background: ${theme.colors.default.primary};
    color: #fff;
    cursor: pointer;

    & > svg {
      width: 0.875rem;
      height: 0.875rem;
    }

    &:hover {
      filter: brightness(1.1);
    }
  `}
`;
