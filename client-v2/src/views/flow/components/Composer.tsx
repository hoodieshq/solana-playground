import {
  FC,
  ReactNode,
  RefObject,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import styled, { css } from "styled-components";

import Menu, { useMenu } from "./Menu";
import type { MenuRow } from "./Menu";
import ModelControls from "../../sidebar/assistant/Component/ModelControls";

/**
 * The composer, as one object: where you type, and a row of controls along its
 * bottom edge — add on the left; model, effort and send on the right, the way
 * Claude lays them out. It appears on the home screen and in the assistant
 * pane, and it is the same component in both, so the controls a person meets on
 * the first screen are the ones they find on the second.
 *
 * Two ways to use it. Given `onSubmit` it is live: it holds a textarea that
 * grows with what is typed, Enter sends, Shift+Enter breaks the line, and the
 * send button becomes Stop while a turn runs. Given only `onActivate` it is a
 * launcher — the home screen, before there is a project to talk about — and
 * any part of it hands off. Model and effort are real controls either way.
 */

interface ComposerProps {
  /** Launcher: what any part of it does when there is no `onSubmit` */
  onActivate?: () => void;
  /** Live: the text, and what to do with it */
  value?: string;
  onChange?: (value: string) => void;
  onSubmit?: (text: string) => void;
  /** A turn is running: the send button stops it instead */
  busy?: boolean;
  onStop?: () => void;
  placeholder?: string;
  /** Narrower padding, for the assistant pane and for list views */
  compact?: boolean;
  inputRef?: RefObject<HTMLTextAreaElement>;
  /** Above the text, inside the box: what the assistant will see */
  context?: ReactNode;
  /** What the + opens. Without rows it activates, like the rest. */
  addRows?: MenuRow[];
}

/* The textarea grows to this many pixels, then scrolls */
const MAX_INPUT = 200;

const Composer: FC<ComposerProps> = ({
  onActivate,
  value = "",
  onChange,
  onSubmit,
  busy = false,
  onStop,
  placeholder = "Ask anything…",
  compact = false,
  inputRef,
  context,
  addRows,
}) => {
  const live = !!onSubmit;

  /* The assistant pane is resizable from 288px; below the threshold the effort
     label goes and its dial stays. Measured rather than asked with a container
     query: styled-components 5 compiles `@container` to a rule with no
     selector — valid-looking source, silently dead CSS. */
  const boxRef = useRef<HTMLDivElement>(null);
  const [dense, setDense] = useState(false);
  useEffect(() => {
    const box = boxRef.current;
    if (!box || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) =>
      setDense(entry.contentRect.width < 384)
    );
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  const ownRef = useRef<HTMLTextAreaElement>(null);
  const textRef = inputRef ?? ownRef;

  // Grow with the text, up to a point
  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_INPUT)}px`;
  }, [value, textRef]);

  const add = useMenu();
  const empty = !value.trim();

  const submit = () => {
    if (!live) return onActivate?.();
    if (!empty && !busy) onSubmit!(value);
  };

  return (
    <Box ref={boxRef} $compact={compact}>
      {context && <Context>{context}</Context>}

      {live ? (
        <TextArea
          ref={textRef}
          rows={1}
          value={value}
          placeholder={placeholder}
          aria-label="Message the assistant"
          onChange={(ev) => onChange?.(ev.target.value)}
          onKeyDown={(ev) => {
            // `isComposing` guards IME input — Enter there commits the
            // composition, it must not send the message
            if (
              ev.key === "Enter" &&
              !ev.shiftKey &&
              !ev.nativeEvent.isComposing
            ) {
              ev.preventDefault();
              submit();
            }
          }}
        />
      ) : (
        <Launcher
          type="button"
          onClick={onActivate}
          aria-label="Ask the assistant"
        >
          {placeholder}
        </Launcher>
      )}

      <Bar>
        <Group>
          <AddAnchor>
            <Chip
              ref={add.anchorRef}
              type="button"
              aria-label="Add"
              aria-haspopup={addRows ? "menu" : undefined}
              aria-expanded={addRows ? add.open : undefined}
              onClick={addRows ? add.toggle : onActivate}
            >
              {ICONS.plus}
            </Chip>
            {addRows && add.open && (
              <Menu
                rows={addRows}
                anchorRef={add.anchorRef}
                onClose={add.close}
                placement="top-start"
              />
            )}
          </AddAnchor>
        </Group>
        <Group>
          <ModelControls dense={dense} />
          {busy ? (
            <Send
              type="button"
              onClick={onStop}
              aria-label="Stop this turn"
              title="Stop"
              $stop
            >
              {ICONS.stop}
            </Send>
          ) : (
            <Send
              type="button"
              onClick={submit}
              aria-label="Send"
              disabled={live && empty}
            >
              {ICONS.up}
            </Send>
          )}
        </Group>
      </Bar>
    </Box>
  );
};

export default Composer;

const svg = (d: JSX.Element) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {d}
  </svg>
);

const ICONS = {
  plus: svg(
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  up: svg(
    <>
      <path d="M12 19V5" />
      <path d="m6 11 6-6 6 6" />
    </>
  ),
  stop: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="7" y="7" width="10" height="10" rx="2" />
    </svg>
  ),
};

/* 16px radius, a typing area that starts at one comfortable line, 2rem
   controls. Focus lights the edge in the accent, so the box you are typing in
   is never in doubt. */
const Box = styled.div<{ $compact: boolean }>`
  ${({ theme, $compact }) => css`
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    width: 100%;
    padding: ${$compact
      ? "0.625rem 0.625rem 0.5rem"
      : "0.75rem 0.75rem 0.625rem"};
    border: 1px solid ${theme.colors.default.border};
    border-radius: 16px;
    background: ${theme.colors.default.bgSecondary};
    box-shadow: 0 1px 0 rgba(255, 255, 255, 0.02) inset,
      0 10px 30px -18px rgba(0, 0, 0, 0.8);
    transition: border-color 0.15s ease, box-shadow 0.2s ease;

    &:hover {
      border-color: ${theme.colors.default.textSecondary}33;
    }

    &:focus-within {
      border-color: ${theme.colors.default.primary}73;
      box-shadow: 0 0 0 3px ${theme.colors.default.primary}1f,
        0 10px 30px -18px rgba(0, 0, 0, 0.8);
    }

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  `}
`;

const Context = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.3125rem;
  padding: 0 0.125rem;
`;

const TextArea = styled.textarea`
  ${({ theme }) => css`
    display: block;
    width: 100%;
    min-height: 2.75rem;
    padding: 0.375rem 0.375rem 0;
    border: none;
    outline: none;
    resize: none;
    background: none;
    color: ${theme.colors.default.textPrimary};
    font-family: inherit;
    font-size: 0.9375rem;
    line-height: 1.5;

    &::placeholder {
      color: ${theme.colors.state.disabled.color};
    }
  `}
`;

const Launcher = styled.button`
  ${({ theme }) => css`
    display: block;
    width: 100%;
    min-height: 3.25rem;
    padding: 0.375rem 0.375rem 0;
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
  flex-wrap: nowrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  min-width: 0;
`;

const Group = styled.div`
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 0.25rem;
  min-width: 0;
`;

const AddAnchor = styled.div`
  position: relative;
`;

const Chip = styled.button`
  ${({ theme }) => css`
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    padding: 0;
    border: 1px solid ${theme.colors.default.border};
    border-radius: 999px;
    background: transparent;
    color: ${theme.colors.default.textSecondary};
    font-family: inherit;
    cursor: pointer;

    & > svg {
      width: 1rem;
      height: 1rem;
    }

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

/* The one filled control: Solana's purple, and a quiet grey until there is
   something to send */
const Send = styled.button<{ $stop?: boolean }>`
  ${({ theme, $stop }) => css`
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    margin-left: 0.125rem;
    padding: 0;
    border: none;
    border-radius: 999px;
    background: ${$stop
      ? theme.colors.default.textPrimary
      : theme.colors.default.primary};
    color: ${$stop ? theme.colors.default.bgPrimary : "#fff"};
    cursor: pointer;
    transition: background 0.15s ease, filter 0.15s ease;

    & > svg {
      width: 0.9375rem;
      height: 0.9375rem;
    }

    &:hover:not(:disabled) {
      filter: brightness(1.12);
    }

    &:disabled {
      background: ${theme.colors.state.hover.bg};
      color: ${theme.colors.state.disabled.color};
      cursor: default;
    }

    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
      outline-offset: 2px;
    }

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  `}
`;
