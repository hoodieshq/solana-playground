import { Diff, DiffContent, DiffHeader, DiffLine, DiffStat, DiffTitle } from "@/components/ui/diff"

import type { Patch } from "../data"
import { countRows, diffLines, trimContext } from "../diff"

export function PatchDiff({ patch, className }: { patch: Patch; className?: string }) {
  const rows = diffLines(patch.before, patch.after)
  const { added, removed } = countRows(rows)
  return (
    <Diff className={className}>
      <DiffHeader>
        <DiffTitle>{patch.file}</DiffTitle>
        <DiffStat added={added} removed={removed} />
      </DiffHeader>
      <DiffContent className="max-h-64 overflow-y-auto whitespace-pre-wrap break-words">
        {trimContext(rows).map((r, i) => (
          <DiffLine key={i} variant={r.kind}>
            {r.text || " "}
          </DiffLine>
        ))}
      </DiffContent>
    </Diff>
  )
}
