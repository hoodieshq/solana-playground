import styled from "styled-components";

import Button from "../../../../components/Button";

/**
 * The one decisive action of a view.
 *
 * It used to carry the 135deg brand gradient as a literal. It now takes the
 * theme's accent, flat, which is the same policy — one decisive CTA per view,
 * everything else quiet — expressed in a way each theme can answer for itself.
 * A gradient asks a button to be two colours at once, and at this size the eye
 * reads the muddle in the middle rather than either end; flat reads as one
 * deliberate thing, which is what a primary action should be.
 *
 * A theme that wants its gradient back can still have it: set
 * `colors.default.primary` to one.
 */
const GradientButton = styled(Button)`
  ${({ theme }) => `
    && {
      background: ${theme.colors.default.primary};
      color: #FFFFFF;
      font-weight: 600;

      &:hover:not(:disabled) {
        filter: brightness(1.12);
      }
    }
  `}
`;

export default GradientButton;
