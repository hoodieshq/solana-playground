import { FC, Fragment } from "react";
import styled, { css } from "styled-components";

/**
 * Which landing is showing — the deck's own, or the one whose headlines
 * arrive trailing light — and a way to flip between them in front of a room.
 *
 * A presenter's control, not part of the page: small and quiet until the
 * pointer finds it. It sits at the top, centred in the gap above the top
 * bar, between the logo and the links. Not in a bottom corner: the classic's
 * button spans the render's whole width along the bottom of the first
 * screen, so any corner there would sit on it. And it is in the same place
 * on both versions, so flipping back and forth never moves it from under the
 * pointer. Choosing the other one simply navigates to it.
 */

export type Variant = "classic" | "trail";

const OPTIONS: { value: Variant; label: string }[] = [
  { value: "classic", label: "Classic" },
  { value: "trail", label: "Trail" },
];

interface VersionSwitchProps {
  value: Variant;
  onChange: (next: Variant) => void;
}

const VersionSwitch: FC<VersionSwitchProps> = ({ value, onChange }) => (
  <Pill role="group" aria-label="Landing version" data-shot="version-switch">
    {OPTIONS.map((option, i) => (
      <Fragment key={option.value}>
        {i > 0 && <Dot aria-hidden="true">·</Dot>}
        <Option
          type="button"
          aria-pressed={option.value === value}
          $on={option.value === value}
          onClick={() => {
            if (option.value !== value) onChange(option.value);
          }}
        >
          {option.label}
        </Option>
      </Fragment>
    ))}
  </Pill>
);

export default VersionSwitch;

/* Centred in the 54 above the top bar at any width, and never tighter to the
   top of the screen than 6px */
const Pill = styled.div`
  position: fixed;
  top: max(0.375rem, env(safe-area-inset-top), calc(27 * var(--u) - 0.78rem));
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  display: inline-flex;
  align-items: center;
  gap: 0.125rem;
  padding: 0.1875rem;
  border-radius: 999px;
  background: rgba(21, 21, 21, 0.62);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.1);
  -webkit-backdrop-filter: blur(12px) saturate(1.2);
  backdrop-filter: blur(12px) saturate(1.2);
  font-family: "Manrope", -apple-system, BlinkMacSystemFont, "Segoe UI",
    sans-serif;
  font-size: 0.6875rem;
  font-weight: 500;
  line-height: 1;
  letter-spacing: 0.01em;
  opacity: 0.78;
  transition: opacity 200ms ease;

  &:hover,
  &:focus-within {
    opacity: 1;
  }
`;

const Option = styled.button<{ $on: boolean }>`
  ${({ $on }) => css`
    padding: 0.25rem 0.5625rem;
    border: none;
    border-radius: 999px;
    background: ${$on ? "rgba(255, 255, 255, 0.12)" : "transparent"};
    color: ${$on ? "#ffffff" : "rgba(237, 241, 255, 0.55)"};
    font: inherit;
    cursor: ${$on ? "default" : "pointer"};
    transition: color 160ms ease, background-color 160ms ease;

    &:hover {
      color: #ffffff;
    }

    &:focus-visible {
      outline: 1.5px solid #ffffff;
      outline-offset: 1px;
    }
  `}
`;

const Dot = styled.span`
  color: rgba(237, 241, 255, 0.3);
`;
