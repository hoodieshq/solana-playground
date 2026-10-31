import { Terminal, TerminalEmpty, TerminalLine, TerminalStage, TerminalStages } from "@/components/ui/terminal"

import { Block, More } from "../parts"

function TerminalUpdateBlock() {
  return (
    <Block
      id="terminal-update"
      title="Terminal: lines that point, wrap, stages"
      source="playground"
      registry="terminal"
      note="From the tutorial's log. highlight is the program's own line, back from the network. link is a line that points into a file: put a button in it with asChild, and set lit while the editor points at the same line, so the two read as one error. wrap=none keeps every line on one row and scrolls sideways; wrap=errors lets only the error line wrap. TerminalStages lists a run's stages while it goes, and TerminalEmpty says what prints here before anything has."
      className="block"
      more={
        <More label="Before anything has run" className="block">
          <Terminal className="max-w-xl">
            <TerminalEmpty>Nothing run yet. Builds, deploys and calls print here.</TerminalEmpty>
          </Terminal>
        </More>
      }
    >
      <div className="grid max-w-xl gap-3">
        <Terminal wrap="errors">
          <TerminalLine variant="prompt">build</TerminalLine>
          <TerminalLine variant="error">error[E0412]: cannot find type `Initialize` in this scope, did you mean to declare it?</TerminalLine>
          <TerminalLine variant="link" asChild lit>
            <button type="button" title="Show in the editor">
              {"  --> src/lib.rs:7:43"}
            </button>
          </TerminalLine>
          <TerminalLine variant="link" asChild>
            <button type="button" title="Show in the editor">
              {"  --> src/lib.rs:12:10"}
            </button>
          </TerminalLine>
          <TerminalLine>{"   |      pub fn initialize(ctx: Context<Initialize>) -> Result<()> { msg!(\"Hello\"); Ok(()) }"}</TerminalLine>
        </Terminal>
        <Terminal>
          <TerminalLine variant="prompt">call hello</TerminalLine>
          <TerminalLine>Program 7Hq5…Xk2P invoke [1]</TerminalLine>
          <TerminalLine variant="highlight">Program log: Hello, Playground</TerminalLine>
          <TerminalLine variant="success">Program 7Hq5…Xk2P success</TerminalLine>
        </Terminal>
        <Terminal>
          <TerminalStages>
            <TerminalStage status="done">Building</TerminalStage>
            <TerminalStage status="running">Deploying</TerminalStage>
            <TerminalStage>Confirming</TerminalStage>
          </TerminalStages>
        </Terminal>
      </div>
    </Block>
  )
}

export { TerminalUpdateBlock }
