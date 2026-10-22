import type { FC } from "react";
import styled, { css } from "styled-components";

import { useCopy } from "../../../hooks";
import { PHONE, PHONE_SIZE } from "../phone";

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

    /* A word to read, a thumb's width to press: the Styleguide's 48 px */
    ${PHONE} {
      min-width: ${PHONE_SIZE.target};
      min-height: ${PHONE_SIZE.target};
      padding: 0 0.5rem;
      font-size: 0.9375rem;
    }

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

