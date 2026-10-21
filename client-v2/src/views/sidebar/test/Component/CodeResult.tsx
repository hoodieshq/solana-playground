import { CodeBlock, CodeBlockContent } from "@/shared/ui/code-block";

interface CodeResultProps {
  children: string;
  /** The item's place in its list; callers still pass it, nothing stripes by it */
  index: number;
}

/** A fetched account or received events, as JSON */
const CodeResult = ({ children }: CodeResultProps) => (
  <CodeBlock>
    <CodeBlockContent className="max-h-80 overflow-auto select-text">
      {children}
    </CodeBlockContent>
  </CodeBlock>
);

export default CodeResult;
