import { MessageCircle } from "lucide-react"

/** Who is answering. The bubble matches the Ask button, and stands in until
 * Sole has a mark of its own. Playground's play mark stays with Continue */
export function AssistantHead() {
  return (
    <div className="flex items-center gap-2 text-caption">
      <MessageCircle strokeWidth={1.75} className="size-4 text-brand-purple" />
      <span className="font-label text-foreground">Assistant</span>
      <span className="text-muted-foreground">· Opus 5.5</span>
    </div>
  )
}
