import { BrandButtonIcon } from "@/components/ui/brand-button"

export function AssistantHead() {
  return (
    <div className="flex items-center gap-2 text-caption">
      <BrandButtonIcon className="size-4 text-brand-purple" />
      <span className="font-label text-foreground">Assistant</span>
      <span className="text-muted-foreground">· Opus 5.5</span>
    </div>
  )
}
