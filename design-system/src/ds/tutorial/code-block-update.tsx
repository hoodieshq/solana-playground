import { CodeBlock, CodeBlockContent, CodeBlockHeader, CodeBlockLine, CodeBlockMark, CodeBlockTitle } from "@/components/ui/code-block"

import { Block, More } from "../parts"

function CodeBlockUpdateBlock() {
  return (
    <Block
      id="code-block-update"
      title="Code block: line states, mark, soft wrap"
      source="playground"
      registry="code-block"
      note="From the tutorial's code view. A line's state marks it with an edge down its left: focus is what the step is about, added is just written (with arrive, its place in the run, it comes in lit green and settles), landing is where an answer will go, error is the line a failed build points at. CodeBlockMark puts the compiler's wavy line under the token it named. wrap soft-wraps long lines with a hanging indent, so a wrapped line reads as one."
      className="block"
      more={
        <More label="wrap, in a narrow column" className="block">
          <CodeBlock className="max-w-xs">
            <CodeBlockContent wrap>
              <CodeBlockLine>{"pub fn initialize(ctx: Context<Initialize>, name: String) -> Result<()> {"}</CodeBlockLine>
              <CodeBlockLine state="added">{'    msg!("Hello, {}! Your account is ready to use.", name);'}</CodeBlockLine>
              <CodeBlockLine>{"    Ok(())"}</CodeBlockLine>
              <CodeBlockLine>{"}"}</CodeBlockLine>
            </CodeBlockContent>
          </CodeBlock>
        </More>
      }
    >
      <CodeBlock className="max-w-xl">
        <CodeBlockHeader>
          <CodeBlockTitle>lib.rs</CodeBlockTitle>
        </CodeBlockHeader>
        <CodeBlockContent>
          <CodeBlockLine>{"#[program]"}</CodeBlockLine>
          <CodeBlockLine state="focus">{"pub mod hello_anchor {"}</CodeBlockLine>
          <CodeBlockLine state="added" arrive={0}>
            {"    use super::*;"}
          </CodeBlockLine>
          <CodeBlockLine state="added" arrive={1}>
            {"    // Say hello, then stop"}
          </CodeBlockLine>
          <CodeBlockLine state="error" indent={4}>
            {"    pub fn initialize(ctx: Context<"}
            <CodeBlockMark>Initialize</CodeBlockMark>
            {">) -> Result<()> {"}
          </CodeBlockLine>
          <CodeBlockLine state="landing">{""}</CodeBlockLine>
          <CodeBlockLine>{"        Ok(())"}</CodeBlockLine>
          <CodeBlockLine>{"    }"}</CodeBlockLine>
          <CodeBlockLine>{"}"}</CodeBlockLine>
        </CodeBlockContent>
      </CodeBlock>
    </Block>
  )
}

export { CodeBlockUpdateBlock }
