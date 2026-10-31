import { SourcePeek, SourcePeekAnchor, SourcePeekCaption, SourcePeekContent, SourcePeekTrigger } from "@/components/ui/source-peek"
import { Terminal, TerminalLine } from "@/components/ui/terminal"

import { Block } from "../parts"

const LIB = `use anchor_lang::prelude::*;

declare_id!("7Hq5vRw1yJmZ9bX3cDfE8sLkT2nA4uPqWe6oGhK1Xk2P");

#[program]
pub mod hello_anchor {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Hello, Playground");
        Ok(())
    }
}`

function SourcePeekBlock() {
  return (
    <Block
      id="source-peek"
      title="Source peek"
      source="playground"
      registry="source-peek"
      note="Where a line in a log came from: a caption under it that opens a read only peek of the file around that line, the line itself lit. With a mouse it opens on hover after 150ms and a click keeps it open; a finger taps it. The peek opens off the line and its caption together, so it never covers the line it explains."
      className="block"
    >
      <Terminal className="max-w-xl">
        <TerminalLine variant="prompt">run client.ts</TerminalLine>
        <TerminalLine>Program 7Hq5vR…hK1Xk2P invoke [1]</TerminalLine>
        <SourcePeek>
          <SourcePeekAnchor>
            <TerminalLine variant="highlight">Program log: Hello, Playground</TerminalLine>
            <SourcePeekTrigger>from msg! · src/lib.rs:10</SourcePeekTrigger>
          </SourcePeekAnchor>
          <SourcePeekContent file="src/lib.rs" code={LIB} line={10}>
            <SourcePeekCaption>msg! wrote this line to the program log, and the transaction brought it back.</SourcePeekCaption>
          </SourcePeekContent>
        </SourcePeek>
        <TerminalLine variant="success">Program 7Hq5vR…hK1Xk2P success</TerminalLine>
      </Terminal>
    </Block>
  )
}

export { SourcePeekBlock }
