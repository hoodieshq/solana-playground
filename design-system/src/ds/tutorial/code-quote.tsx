import { CodeQuote, CodeQuoteAction, CodeQuoteHeader, CodeQuoteLine, CodeQuoteMark, CodeQuoteTitle } from "@/components/ui/code-quote"

import { Block } from "../parts"

function CodeQuoteBlock() {
  return (
    <Block
      id="code-quote"
      title="Code quote"
      source="playground"
      registry="code-quote"
      note="One line of a file quoted in a message: its path and line, a way back to it in the editor, then the line itself, wrapped rather than cut. error turns it red, with the token the compiler named under a wavy line that draws in. resolved is that quote once it no longer holds: the words stay, the mark goes."
      className="block"
    >
      <div className="grid max-w-md gap-3">
        <CodeQuote>
          <CodeQuoteHeader>
            <CodeQuoteTitle>src/lib.rs:10</CodeQuoteTitle>
            <CodeQuoteAction>Show in lib.rs</CodeQuoteAction>
          </CodeQuoteHeader>
          <CodeQuoteLine>{'msg!("Hello, {}!", name);'}</CodeQuoteLine>
        </CodeQuote>
        <CodeQuote tone="error">
          <CodeQuoteHeader>
            <CodeQuoteTitle>src/lib.rs:9</CodeQuoteTitle>
            <CodeQuoteAction>Show in lib.rs</CodeQuoteAction>
          </CodeQuoteHeader>
          <CodeQuoteLine>
            {"pub fn initialize(ctx: Context<"}
            <CodeQuoteMark>Initialise</CodeQuoteMark>
            {">) -> Result<()> {"}
          </CodeQuoteLine>
        </CodeQuote>
        <CodeQuote tone="resolved">
          <CodeQuoteHeader>
            <CodeQuoteTitle>src/lib.rs:9</CodeQuoteTitle>
            <CodeQuoteAction>Show in lib.rs</CodeQuoteAction>
          </CodeQuoteHeader>
          <CodeQuoteLine>
            {"pub fn initialize(ctx: Context<"}
            <CodeQuoteMark>Initialise</CodeQuoteMark>
            {">) -> Result<()> {"}
          </CodeQuoteLine>
        </CodeQuote>
      </div>
    </Block>
  )
}

export { CodeQuoteBlock }
