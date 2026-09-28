import { ComponentPropsWithoutRef, FC, forwardRef, ReactNode } from "react";
import styled, { css } from "styled-components";

import { PHONE, PHONE_SIZE } from "../../views/flow/phone";

interface CheckboxProps extends ComponentPropsWithoutRef<"input"> {
  /** Checkbox `label` to show */
  label?: ReactNode;
}

const Checkbox: FC<CheckboxProps> = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, ...props }, ref) => (
    <Label>
      <StyledCheckbox ref={ref} type="checkbox" {...props} />
      {label && <LabelText>{label}</LabelText>}
    </Label>
  )
);

const Label = styled.label`
  ${({ theme }) => css`
    user-select: none;
    width: fit-content;
    display: flex;
    align-items: center;
    color: ${theme.colors.default.textSecondary};
    font-size: ${theme.font.code.size.small};
    transition: all ${theme.default.transition.type}
      ${theme.default.transition.duration.short};

    &:hover {
      cursor: pointer;
      color: ${theme.colors.default.textPrimary};
    }

    &:has(> input[type="checkbox"]:checked) {
      color: ${theme.colors.default.textPrimary};
    }

    &:hover,
    &:has(> input[type="checkbox"]:checked) {
      & * {
        color: inherit;
      }
    }

    /* The box stays a box; what you press is a fingertip around it */
    ${PHONE} {
      min-width: ${PHONE_SIZE.target};
      min-height: ${PHONE_SIZE.target};
      justify-content: center;
      -webkit-tap-highlight-color: transparent;
    }
  `}
`;

const StyledCheckbox = styled.input`
  accent-color: ${({ theme }) => theme.colors.default.primary};

  &:hover {
    cursor: pointer;
  }

  ${PHONE} {
    width: 22px;
    height: 22px;
    margin: 0;
  }
`;

const LabelText = styled.span`
  ${({ theme }) => css`
    margin-left: 0.5rem;
    transition: all ${theme.default.transition.type}
      ${theme.default.transition.duration.short};
  `}
`;

export default Checkbox;
