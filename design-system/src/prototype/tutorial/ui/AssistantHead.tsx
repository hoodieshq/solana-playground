import { AssistantMark } from "./AssistantMark"

/** Who is answering, with the assistant's mark at 20px, where its outline, eyes and smile all read
 * (see AssistantMark). In a tutorial the hosted model goes unnamed: a newcomer needs to know the
 * assistant answered, not which model. `model` is passed only when someone has connected their own
 * (Claude or Codex, DES-138), because then it changes the answers and the limits */
export function AssistantHead({ model }: { model?: string }) {
  return (
    <div className="flex items-center gap-2 text-caption">
      {/* Up a pixel: centred on the line it sat below the middle of the capitals, and read as low */}
      <AssistantMark className="size-5 -translate-y-px text-brand-purple" />
      <span className="font-label text-foreground">Assistant</span>
      {model && <span className="text-muted-foreground">· {model}</span>}
    </div>
  )
}
