import type { FC } from "react";
import styled, { css } from "styled-components";

import { useCopy } from "../../../hooks";

/* Copy as a word, not an icon: the action reads on its own and says when it
   worked */
const CopyText: FC<{ text: string; label: string }> = ({ text, label }) => {
  const [copied, copy] = useCopy(text);
  return (
    <TextButton
      type="button"
      onClick={copy}
      aria-label={copied ? `Copied the ${label}` : `Copy the ${label}`}
      $done={copied}
    >
      {copied ? "Copied" : "Copy"}
    </TextButton>
  );
};

export default CopyText;

const TextButton = styled.button<{ $done: boolean }>`
  ${({ theme, $done }) => css`
    padding: 0;
    border: 0;
    background: none;
    font: inherit;
    font-size: 0.75rem;
    color: ${$done
      ? theme.colors.state.success.color
      : theme.colors.default.primary};
    cursor: pointer;

    &:hover {
      text-decoration: underline;
    }
    &:focus-visible {
      outline: 2px solid ${theme.colors.default.primary};
      outline-offset: 2px;
      border-radius: 2px;
    }
  `}
`;

