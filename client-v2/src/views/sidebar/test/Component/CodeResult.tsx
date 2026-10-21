import { reportButtonFailure } from "@/shared/lib/report-button-failure";
import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockContent,
  CodeBlockHeader,
  CodeBlockTitle,
} from "@/shared/ui/code-block";
import { CopyButton } from "@/shared/ui/copy-button";

interface CodeResultProps {
  children: string;
  /** The item's place in its list; callers still pass it, nothing stripes by it */
  index: number;
}

/** A fetched account or received events, as JSON the user can copy whole */
const CodeResult = ({ children }: CodeResultProps) => (
  <CodeBlock>
    <CodeBlockHeader>
      <CodeBlockTitle>JSON</CodeBlockTitle>
      <CodeBlockActions>
        <CopyButton value={children} onError={reportButtonFailure} />
      </CodeBlockActions>
    </CodeBlockHeader>
    <CodeBlockContent className="max-h-80 overflow-auto select-text">
      {children}
    </CodeBlockContent>
  </CodeBlock>
);

export default CodeResult;
