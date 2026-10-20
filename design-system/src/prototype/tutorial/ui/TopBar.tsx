import type { ReactNode } from "react"

export function TopBar({ left, title, right }: { left?: ReactNode; title: string; right?: ReactNode }) {
  return (
    <header className="flex h-phone-head shrink-0 items-center gap-1 border-b border-border px-1.5">
      <div className="flex size-11 shrink-0 items-center justify-center">{left}</div>
      <h1 className="min-w-0 flex-1 truncate font-heading text-title">{title}</h1>
      <div className="flex size-11 shrink-0 items-center justify-center">{right}</div>
    </header>
  )
}
