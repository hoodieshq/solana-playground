import { createContext, useContext, type ReactNode } from "react"

import { Field, FieldLabel } from "@/components/ui/field"
import { cn } from "@/lib/utils"

/** The phone's screens (Phone and Tablet 820): the phone bar, 52 rows, 16px labels, selects under
 * their labels. The page decides once and every row reads it */
export const PhoneCtx = createContext(false)
export const usePhone = () => useContext(PhoneCtx)

/** A group's small title: Assistant, Network, Advanced. The first group has none */
export const GROUP_TITLE = "text-caption font-act text-(color:--text-quiet)"

/** One row, as Clear Desk lays it: the label left, the control right, centred on each other, no box,
 * no rule, no hover fill. `help` is the line under the label (three rows have one, all in Advanced);
 * `line` is a state under it, with its own dot. On the phone the line runs the row's whole width under
 * it, so the value and its action don't squeeze it onto two lines. `stack` drops the control under its label on the
 * phone's screens, for a select and the fields that open under it */
export function Row({
  label,
  htmlFor,
  help,
  line,
  stack,
  className,
  children,
}: {
  label: ReactNode
  htmlFor?: string
  help?: string
  line?: ReactNode
  stack?: boolean
  className?: string
  children?: ReactNode
}) {
  const phone = usePhone()
  const stacked = stack && phone
  return (
    <>
      <Field
        orientation={stacked ? "vertical" : "horizontal"}
        className={cn("gap-6 py-2", phone ? "min-h-(--phone-row)" : "min-h-12 [html.touch_&]:min-h-13", help && "py-3", stacked ? "gap-2 py-3" : "items-center! justify-between", className)}
      >
        <div className="flex min-w-0 flex-col">
          <FieldLabel htmlFor={htmlFor} className={cn("font-act text-foreground", phone ? "text-body" : "text-control leading-5")}>
            {label}
          </FieldLabel>
          {help && <p className="text-[0.8125rem] leading-5 font-read text-muted-foreground">{help}</p>}
          {!phone && line}
        </div>
        {children !== undefined && <div className={cn("flex shrink-0 items-center gap-2", stacked && "w-full")}>{children}</div>}
      </Field>
      {phone && line && <div className="-mt-2 pb-2">{line}</div>}
    </>
  )
}
