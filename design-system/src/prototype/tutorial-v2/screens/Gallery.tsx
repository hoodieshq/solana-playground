import { TutorialsBody } from "../desktop/Gallery"
import { PhoneMenu } from "../ui/PhoneMenu"
import { TopBar } from "../ui/TopBar"

/** The tutorials page on a phone: the desktop's page, heading, folding search, banner and cards, in
 * the phone's frame. The page's own heading names it, so the bar keeps only the menu */
export function Gallery() {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {/* No Close: there is nothing for the tutorials page to close back to, and it only said so in a toast */}
      <TopBar left={<PhoneMenu />} />
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 pt-1 pb-[calc(var(--safe-bottom)+24px)]">
        <TutorialsBody phone />
      </div>
      {/* The list runs to the bottom edge, so it fades out under the home indicator */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[calc(var(--safe-bottom)+24px)] bg-linear-to-t from-surface-base to-transparent"
      />
    </div>
  )
}
