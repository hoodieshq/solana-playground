import { MessageCircle } from "lucide-react"

/** Who is answering. The bubble matches the Ask button, and stands in until Sole has a mark of
 * its own. In a tutorial the hosted model goes unnamed: a newcomer needs to know the assistant
 * answered, not which model. `model` is passed only when someone has connected their own
 * (Claude or Codex, DES-138), because then it changes the answers and the limits */
export function AssistantHead({ model }: { model?: string }) {
  return (
    <div className="flex items-center gap-2 text-caption">
      <MessageCircle strokeWidth={1.75} className="size-4 text-brand-purple" />
      <span className="font-label text-foreground">Assistant</span>
      {model && <span className="text-muted-foreground">· {model}</span>}
    </div>
  )
}
