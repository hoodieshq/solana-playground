import { Diff, DiffContent, DiffGap, DiffHeader, DiffLine, DiffNote, DiffNoteTrigger, DiffStat, DiffTitle } from "@/components/ui/diff"

import { Block } from "../parts"

function DiffUpdateBlock() {
  return (
    <Block
      id="diff-update"
      title="Diff: numbered, struck, with notes"
      source="playground"
      registry="diff"
      note="From the tutorial's proposals. Given a number (null on a removed line), a line takes the numbered layout: the new file's number, a column for the mark, and an edge in green or red. strike draws a removed line through. A DiffNoteTrigger in the mark's column is the dot on a line the assistant explains; it opens a DiffNote under the line. DiffGap stands for unchanged lines left out between two runs of change."
      className="block"
    >
      <Diff className="max-w-xl">
        <DiffHeader>
          <DiffTitle>lib.rs</DiffTitle>
          <DiffStat added={2} removed={1} />
        </DiffHeader>
        <DiffContent>
          <DiffLine number={6}>{"    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {"}</DiffLine>
          <DiffLine number={null} variant="removed" strike>
            {'        msg!("Hi");'}
          </DiffLine>
          <DiffLine number={7} variant="added" mark={<DiffNoteTrigger open aria-label="Note on line 7" />}>
            {'        msg!("Hello, Playground");'}
          </DiffLine>
          <DiffNote>msg! writes to the program log, which the terminal prints after a call.</DiffNote>
          <DiffLine number={8}>{"        Ok(())"}</DiffLine>
          <DiffGap />
          <DiffLine number={14}>{"#[derive(Accounts)]"}</DiffLine>
          <DiffLine number={15} variant="added" mark={<DiffNoteTrigger aria-label="Note on line 15" />}>
            {"pub struct Initialize {}"}
          </DiffLine>
        </DiffContent>
      </Diff>
    </Block>
  )
}

export { DiffUpdateBlock }
