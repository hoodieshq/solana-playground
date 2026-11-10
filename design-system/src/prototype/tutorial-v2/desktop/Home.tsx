import { HomeBody } from "../home/HomeBody"
import { Page } from "./Catalog"

/** Home beside the nav: the tutorials' and the programs' frame and column, with Home's own page in it */
export function Home() {
  return (
    <Page>
      <div className="mx-auto flex w-[min(50rem,100%)] flex-col px-8 pt-8 pb-16">
        <HomeBody />
      </div>
    </Page>
  )
}
