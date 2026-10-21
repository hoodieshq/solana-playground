import type { ReactNode } from "react"

/** The lesson's column. In the product this is where the assistant's chat lives; during a
 * tutorial it carries the tutorial page, the step and the assistant's answers */
export function Column({ label, children }: { label: string; children: ReactNode }) {
  return (
    <aside aria-label={label} className="flex w-[360px] shrink-0 flex-col border-r border-border bg-surface-base">
      {children}
    </aside>
  )
}
