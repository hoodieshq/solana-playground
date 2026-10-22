import type { FC } from "react";
import styled, { css } from "styled-components";

import type { ScrollEdges } from "./scroll";

/**
 * Fades laid over a scroller's edges, in the colour of what it sits on, for
 * a scroller whose own scrollbar must stay crisp: a mask would fade the bar
 * too. Put it after the scroller, inside a box that is `position: relative`.
 */
const ScrollFades: FC<{ edges: ScrollEdges; bg: string }> = ({ edges, bg }) => (
  <>
    {edges.right && (
      <Right aria-hidden $bg={bg} style={{ bottom: edges.barX }} />
    )}
    {edges.bottom && (
      <Bottom
        aria-hidden
        $bg={bg}
        style={{ bottom: edges.barX, right: edges.barY }}
      />
    )}
  </>
);

export default ScrollFades;

const fade = css`
  position: absolute;
  pointer-events: none;
`;

const Right = styled.div<{ $bg: string }>`
  ${({ $bg }) => css`
    ${fade}
    top: 0;
    right: 0;
    width: 2.5rem;
    background: linear-gradient(to right, transparent, ${$bg});
  `}
`;

const Bottom = styled.div<{ $bg: string }>`
  ${({ $bg }) => css`
    ${fade}
    left: 0;
    height: 2rem;
    background: linear-gradient(to bottom, transparent, ${$bg});
  `}
`;
