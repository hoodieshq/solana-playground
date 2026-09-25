import { css } from "styled-components";

/**
 * A head row over the window's ground: nearly opaque, with the ground blurred
 * behind it. The grid never runs under a control — under a label it was only
 * noise — but the cursor's light still warms the bar as it passes, which is
 * the one part of the ground worth keeping up here.
 */
export const frosted = css`
  background: rgba(16, 16, 17, 0.82);
  -webkit-backdrop-filter: blur(18px) saturate(1.15);
  backdrop-filter: blur(18px) saturate(1.15);
`;
