import { cn } from "@/lib/utils"

export function BuildLog({ log, empty = "Nothing built yet. The build runs after you apply a patch." }: { log: string[]; empty?: string }) {
  if (log.length === 0) return <p className="flex-1 px-4 py-6 text-caption text-muted-foreground">{empty}</p>
  return (
    <pre className="min-h-0 flex-1 overflow-y-auto bg-surface-well px-4 py-3 font-mono text-code whitespace-pre-wrap break-words">
      {log.map((line, i) => (
        <div
          key={i}
          className={cn(
            "text-muted-foreground",
            line.startsWith("$") && "text-muted-foreground",
            line.startsWith("error") && "text-error",
            /successful|finished$/i.test(line) && "text-success"
          )}
        >
          {line}
        </div>
      ))}
    </pre>
  )
}
