import { Button } from "@/components/ui/button"
import { CodeBlockLine } from "@/components/ui/code-block"
import { DiffGap, DiffLine } from "@/components/ui/diff"
import {
  FileChange,
  FileChangeActions,
  FileChangeDiff,
  FileChangeExcerpt,
  FileChangeHeader,
  FileChangeLabel,
  FileChangeMore,
  FileChangeNote,
  FileChangeOpen,
  FileChangeRecord,
  FileChangeTitle,
} from "@/components/ui/file-change"
import { Tag } from "@/components/ui/tag"

import { Block, More } from "../parts"

function FileChangeBlock() {
  return (
    <Block
      id="file-change"
      title="File change"
      source="playground"
      registry="file-change"
      note="A file the assistant touched, in the conversation. wrote shows its name and the first three lines written, numbered, and the whole card opens the file at those lines. Code is 12px on a 20px line and never wraps: a long line scrolls sideways while the numbers and the fold of more lines stay put. created is one row with a New file tag. proposal is a change shown before it lands, a numbered diff with Apply and Keep it; once answered it folds to a record line."
      className="block"
      more={
        <>
          <More label="Written at the end, and a proposal answered" className="block">
            <div className="grid max-w-md gap-3">
              <FileChange>
                <FileChangeOpen aria-label="Show lines 21 to 23 in lib.rs">
                  <FileChangeHeader>
                    <FileChangeTitle>src/lib.rs</FileChangeTitle>
                  </FileChangeHeader>
                  <FileChangeNote>I put it at the end: your own lines are kept.</FileChangeNote>
                  <FileChangeExcerpt start={21}>
                    <CodeBlockLine>{"#[derive(Accounts)]"}</CodeBlockLine>
                    <CodeBlockLine>{"pub struct Greet {}"}</CodeBlockLine>
                    <CodeBlockLine>{""}</CodeBlockLine>
                  </FileChangeExcerpt>
                </FileChangeOpen>
              </FileChange>
              <FileChangeRecord status="applied">Applied the fix to lib.rs</FileChangeRecord>
              <FileChangeRecord status="kept">Kept line 9 as it was</FileChangeRecord>
            </div>
          </More>
          <p className="mt-4 max-w-2xl text-caption text-muted-foreground">
            FileChangeOpen makes the card one button, so a press anywhere on it opens the file; give it an aria-label that says where. Around the head and the
            excerpt it is the card's body, so the wheel and a swipe still scroll a long line; empty, it covers the card, for a card with nothing to scroll. The
            excerpt is CodeBlockLines numbered from start, with FileChangeMore as its last row; pass the lines highlighted if the app has a highlighter. The
            proposal's body is the library's DiffLine with number and strike, and DiffGap between runs. Apply and Keep it are Buttons, outline and ghost, at
            size sm.
          </p>
        </>
      }
    >
      <div className="grid max-w-md gap-3">
        <FileChange>
          <FileChangeOpen aria-label="Show lines 3 to 11 in lib.rs">
            <FileChangeHeader>
              <FileChangeTitle>src/lib.rs</FileChangeTitle>
            </FileChangeHeader>
            <FileChangeExcerpt start={3}>
              <CodeBlockLine>{'declare_id!("6Hn2rFw9ZbJxVq3pLmT8sKcY4dE1aGuR7oXiN5vBzQhW");'}</CodeBlockLine>
              <CodeBlockLine>{""}</CodeBlockLine>
              <CodeBlockLine>{"#[program]"}</CodeBlockLine>
              <FileChangeMore>6 more lines</FileChangeMore>
            </FileChangeExcerpt>
          </FileChangeOpen>
        </FileChange>
        <FileChange variant="created">
          <FileChangeHeader>
            <FileChangeLabel>Created</FileChangeLabel>
            <FileChangeTitle>client/client.ts</FileChangeTitle>
            <Tag>New file</Tag>
          </FileChangeHeader>
          <FileChangeOpen aria-label="Open client.ts" />
        </FileChange>
        <FileChange variant="proposal">
          <FileChangeHeader>
            <FileChangeTitle>src/lib.rs:9</FileChangeTitle>
          </FileChangeHeader>
          <FileChangeDiff>
            <DiffLine number={8}>{"    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {"}</DiffLine>
            <DiffLine number={null} variant="removed" strike>
              {'        msg!("Hi");'}
            </DiffLine>
            <DiffLine number={9} variant="added">
              {'        msg!("Hello, Playground");'}
            </DiffLine>
            <DiffGap />
            <DiffLine number={14}>{"#[derive(Accounts)]"}</DiffLine>
            <DiffLine number={15} variant="added">
              {"pub struct Initialize {}"}
            </DiffLine>
          </FileChangeDiff>
          <FileChangeActions>
            <Button variant="outline" size="sm">
              Apply to lib.rs
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              Keep it
            </Button>
          </FileChangeActions>
        </FileChange>
      </div>
    </Block>
  )
}

export { FileChangeBlock }
