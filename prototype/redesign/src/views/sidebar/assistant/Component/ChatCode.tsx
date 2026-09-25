import { FC, useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import styled, { css, keyframes, useTheme } from "styled-components";

import { highlight } from "../../../../components/CodeBlock/highlight";
import { useAsyncEffect } from "../../../../hooks";
import { PgTheme } from "../../../../utils";

/**
 * Code in a reply, with the two things you do with it: copy it, or look at it
 * properly. A side pane is the wrong width for reading forty lines of Rust, so
 * Preview opens the snippet over the workspace — the right-hand window, where
 * code is normally read — at a size meant for reading, and Escape puts it away.
 */

interface Snippet {
  code: string;
  lang?: string;
}

/* One preview at a time, opened from any block in the thread */
let current: Snippet | null = null;
const listeners = new Set<() => void>();
export const PgCodePreview = {
  get current() {
    return current;
  },
  open(snippet: Snippet) {
    current = snippet;
    listeners.forEach((l) => l());
  },
  close() {
    current = null;
    listeners.forEach((l) => l());
  },
  onDidChange(cb: () => void) {
    listeners.add(cb);
    return {
      dispose: () => {
        listeners.delete(cb);
      },
    };
  },
};

const useCopy = (code: string) => {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 1400);
    return () => window.clearTimeout(t);
  }, [copied]);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      // Clipboard refused (an insecure origin, a denied permission): the
      // code is still selectable, so there is nothing worse to report
    }
  };
  return { copied, copy };
};

/** A block in the thread: language on the left, Copy and Preview on the right */
const ChatCode: FC<Snippet> = ({ code, lang }) => {
  const { copied, copy } = useCopy(code);

  return (
    <Block>
      <Head>
        <Lang>{lang ?? "code"}</Lang>
        <Actions>
          <Action type="button" onClick={copy} aria-live="polite">
            {copied ? ICONS.check : ICONS.copy}
            <span>{copied ? "Copied" : "Copy"}</span>
          </Action>
          <Action
            type="button"
            onClick={() => PgCodePreview.open({ code, lang })}
          >
            {ICONS.preview}
            <span>Preview</span>
          </Action>
        </Actions>
      </Head>
      <Body>
        <Highlighted code={code} lang={lang} />
      </Body>
    </Block>
  );
};

export default ChatCode;

/**
 * The preview itself, laid over the workspace. Mounted once, by the chat; it
 * finds the workspace by the id Flow gives its body and follows its box as the
 * panes resize, falling back to a centred sheet if there is none.
 */
export const CodePreviewHost: FC = () => {
  const [shown, setShown] = useState<Snippet | null>(PgCodePreview.current);
  const [box, setBox] = useState<DOMRect | null>(null);

  useEffect(
    () =>
      PgCodePreview.onDidChange(() => setShown(PgCodePreview.current)).dispose,
    []
  );

  useLayoutEffect(() => {
    if (!shown) return;
    const target = document.getElementById("work-panel");
    const measure = () =>
      setBox(target ? target.getBoundingClientRect() : null);
    measure();
    window.addEventListener("resize", measure);
    const observer =
      target && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(measure)
        : null;
    if (target) observer?.observe(target);
    return () => {
      window.removeEventListener("resize", measure);
      observer?.disconnect();
    };
  }, [shown]);

  useEffect(() => {
    if (!shown) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") PgCodePreview.close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [shown]);

  if (!shown) return null;

  const place = box
    ? { top: box.top, left: box.left, width: box.width, height: box.height }
    : { top: "6vh", left: "8vw", right: "8vw", bottom: "6vh" };

  return createPortal(
    <Sheet style={place} role="dialog" aria-label="Code from the assistant">
      <SheetHead>
        <SheetTitle>
          From the assistant
          <Lang>{shown.lang ?? "code"}</Lang>
        </SheetTitle>
        <Actions>
          <SheetCopy code={shown.code} />
          <Action
            type="button"
            onClick={PgCodePreview.close}
            aria-label="Close"
          >
            {ICONS.close}
            <span>Close</span>
          </Action>
        </Actions>
      </SheetHead>
      <SheetBody>
        <Highlighted code={shown.code} lang={shown.lang} numbered />
      </SheetBody>
    </Sheet>,
    document.body
  );
};

const SheetCopy: FC<{ code: string }> = ({ code }) => {
  const { copied, copy } = useCopy(code);
  return (
    <Action type="button" onClick={copy} aria-live="polite">
      {copied ? ICONS.check : ICONS.copy}
      <span>{copied ? "Copied" : "Copy"}</span>
    </Action>
  );
};

/** The product's own highlighter, the one every other code block uses */
const Highlighted: FC<Snippet & { numbered?: boolean }> = ({
  code,
  lang,
  numbered = false,
}) => {
  const theme = useTheme();
  const [html, setHtml] = useState("");

  useAsyncEffect(async () => {
    if (!lang) return setHtml("");
    try {
      setHtml(
        await highlight(code, lang, PgTheme.convertToTextMateTheme(theme))
      );
    } catch {
      setHtml("");
    }
  }, [code, lang, theme]);

  return (
    <Code $numbered={numbered}>
      {html ? (
        <div dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <pre>
          <code>
            {code.split("\n").map((line, i) => (
              <span className="line" key={i}>
                {line}
                {"\n"}
              </span>
            ))}
          </code>
        </pre>
      )}
    </Code>
  );
};

const svg = (d: JSX.Element) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {d}
  </svg>
);

const ICONS = {
  copy: svg(
    <>
      <rect x="8" y="8" width="12" height="12" rx="2.5" />
      <path d="M16 8V6.5A2.5 2.5 0 0 0 13.5 4h-7A2.5 2.5 0 0 0 4 6.5v7A2.5 2.5 0 0 0 6.5 16H8" />
    </>
  ),
  check: svg(<path d="m5 12.5 4.5 4.5L19 7.5" />),
  preview: svg(
    <>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d="M13 4v16" />
      <path d="M16 9h2M16 12h2" />
    </>
  ),
  close: svg(<path d="M6 6l12 12M18 6 6 18" />),
};

const Block = styled.div`
  ${({ theme }) => css`
    margin: 0.25rem 0;
    border: 1px solid ${theme.colors.default.border};
    border-radius: 12px;
    background: #0e0e0f;
    overflow: hidden;
  `}
`;

const Head = styled.div`
  ${({ theme }) => css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    height: 2.125rem;
    padding: 0 0.25rem 0 0.75rem;
    border-bottom: 1px solid ${theme.colors.default.border};
  `}
`;

const Lang = styled.span`
  ${({ theme }) => css`
    color: ${theme.colors.default.textSecondary};
    font-family: ${theme.font.code.family};
    font-size: 0.75rem;
  `}
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 0.125rem;
`;

/* Labelled, not bare icons: the reader should see at a glance what a block
   offers, the way Claude's code blocks say "Copy" */
const Action = styled.button`
  ${({ theme }) => css`
    display: flex;
    align-items: center;
    gap: 0.3125rem;
    height: 1.625rem;
    padding: 0 0.5rem;
    border: none;
    border-radius: 7px;
    background: transparent;
    color: ${theme.colors.default.textSecondary};
    font-family: ${theme.font.other.family};
    font-size: 0.75rem;
    font-weight: 500;
    cursor: pointer;

    & > svg {
      width: 0.875rem;
      height: 0.875rem;
    }

    &:hover {
      background: ${theme.colors.state.hover.bg};
      color: ${theme.colors.default.textPrimary};
    }

    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
      outline-offset: 1px;
    }
  `}
`;

const Body = styled.div`
  max-height: 18rem;
  overflow: auto;
`;

/* Line numbers are a counter on the highlighter's own lines, so the same
   styles serve highlighted and plain code */
const Code = styled.div<{ $numbered: boolean }>`
  ${({ theme, $numbered }) => css`
    & pre {
      margin: 0;
      padding: 0.625rem 0.75rem;
      background: transparent !important;
      font-family: ${theme.font.code.family};
      font-size: ${$numbered ? "0.875rem" : "0.8125rem"};
      line-height: 1.6;
      white-space: pre;
    }

    & code {
      font-family: inherit;
      counter-reset: line;
    }

    ${$numbered &&
    css`
      & pre {
        padding: 1rem 1.25rem 1.5rem 0.5rem;
      }

      & .line::before {
        counter-increment: line;
        content: counter(line);
        display: inline-block;
        width: 2.5rem;
        margin-right: 1.25rem;
        text-align: right;
        color: ${theme.colors.state.disabled.color};
      }
    `}
  `}
`;

const rise = keyframes`
  from { opacity: 0; transform: translate3d(0, 10px, 0); }
  to   { opacity: 1; transform: none; }
`;

const Sheet = styled.div`
  ${({ theme }) => css`
    position: fixed;
    z-index: 50;
    display: flex;
    flex-direction: column;
    background: #0e0e0f;
    border-left: 1px solid ${theme.colors.default.border};
    box-shadow: ${theme.default.boxShadow};
    font-family: ${theme.font.other.family};
    color: ${theme.colors.default.textPrimary};
    animation: ${rise} 200ms cubic-bezier(0.22, 1, 0.36, 1);

    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }
  `}
`;

const SheetHead = styled.div`
  ${({ theme }) => css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
    height: 2.75rem;
    padding: 0 0.5rem 0 1rem;
    border-bottom: 1px solid ${theme.colors.default.border};
  `}
`;

const SheetTitle = styled.div`
  display: flex;
  align-items: baseline;
  gap: 0.625rem;
  font-size: 0.875rem;
  font-weight: 500;
`;

const SheetBody = styled.div`
  flex: 1;
  min-height: 0;
  overflow: auto;
`;
