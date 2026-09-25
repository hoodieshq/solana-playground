import { FC } from "react";
import styled from "styled-components";

import Pattern from "../../../deck/Pattern";

/**
 * The landing's black ground, under the conversation: the tile pattern at the
 * slides' own scale, rising from behind the composer and gone by the middle of
 * the pane — the way it rises from below the fold on the landing's hero.
 *
 * The same pitch as the landing on purpose. Set small it turned into a mesh
 * of lines behind every reply, which is noise under text, not texture. The
 * cursor light stays, so moving over the chat lights the grid as it does on
 * the slides.
 */
const ChatGround: FC = () => (
  <Ground aria-hidden="true">
    <Pattern fade={1} lit={0.2} />
  </Ground>
);

export default ChatGround;

const Ground = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 70%;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
  /* The landing's ink, lifting out of the pane's own grey */
  background: linear-gradient(to top, #151515 0%, rgba(21, 21, 21, 0) 100%);
  -webkit-mask-image: linear-gradient(
    to top,
    #000 0%,
    rgba(0, 0, 0, 0.6) 45%,
    transparent 100%
  );
  mask-image: linear-gradient(
    to top,
    #000 0%,
    rgba(0, 0, 0, 0.6) 45%,
    transparent 100%
  );
`;
