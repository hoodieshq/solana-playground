import { TestForm } from "../ui/TestForm"

/** The Call panel in the editor's place: the IDL's form on the chrome's ground, not the code's, with the
 * terminal bar still under it. It keeps to its column as the editor does (min-w-0) and gives the panel
 * its whole height, so the response band reaches down to the terminal; the panel scrolls its own bands */
export function TestPane() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-surface-base">
      <TestForm />
    </div>
  )
}
