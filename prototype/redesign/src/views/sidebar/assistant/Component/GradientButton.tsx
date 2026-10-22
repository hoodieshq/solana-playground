import styled from "styled-components";

import Button from "../../../../components/Button";

/**
 * The one decisive action of a view, carrying the brand gradient.
 *
 * Gradient policy (docs/design/brand-research.md): the 135deg brand gradient
 * appears only on the single primary CTA of a view, the progress indicator and
 * the rail's active marker. Everything else stays flat. Black text — the
 * brand's own treatment on gradient fills, and the only color readable across
 * both gradient ends.
 */
const GradientButton = styled(Button)`
  && {
    background: linear-gradient(135deg, #9945ff 10%, #14f195 90%);
    color: #050505;
    font-weight: 700;

    &:hover:not(:disabled) {
      filter: brightness(1.1);
    }
  }
`;

export default GradientButton;
