import { HomeBody } from "../home/HomeBody"
import { PhoneMenu } from "../ui/PhoneMenu"
import { TopBar } from "../ui/TopBar"

/** Home on a phone and an upright tablet: the desktop's page in the phone's frame, as the tutorials page */
export function Home() {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <TopBar left={<PhoneMenu />} />
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 pt-1 pb-[calc(var(--safe-bottom)+24px)] [html.portrait_&]:px-8">
        <HomeBody phone />
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[calc(var(--safe-bottom)+24px)] bg-linear-to-t from-surface-base to-transparent" />
    </div>
  )
}
