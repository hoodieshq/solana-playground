import styled from "styled-components";

import Markdown from "../../../../components/Markdown";
import assistantContext from "../content/assistant-context.md";

/**
 * The roadmap, rendered from the same document the assistant is given as
 * context — so what the panel shows and what it can talk about cannot drift.
 * Source is `docs/assistant-context.md`; see docs/decisions.md -> D6.
 */
/** The sync script stamps a provenance comment that Markdown would show as text */
const body = assistantContext.replace(/^<!--[\s\S]*?-->\s*/, "");

const Plan = () => (
  <Wrapper>
    <Markdown codeFontOnly>{body}</Markdown>
  </Wrapper>
);

const Wrapper = styled.div`
  flex-grow: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 1rem 0.875rem 2rem;
`;

export default Plan;
