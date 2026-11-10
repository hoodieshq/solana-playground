import { useState } from "react"

import { filterPrograms } from "../ui/programs"
import { CatalogSearch, NoMatch, Page, ProgramGrid } from "./Catalog"

/** Programs, as client-v2's ProgramsPage draws it (scope/interface-2): the search field over the
 * product's eleven programs. Opening one isn't in this prototype */
export function Programs() {
  const [query, setQuery] = useState("")
  const list = filterPrograms(query)
  return (
    <Page>
      <section className="mx-auto flex w-full max-w-[46rem] flex-col gap-6 px-4 py-8">
        <CatalogSearch label="programs" query={query} onQuery={setQuery} />
        {list.length ? <ProgramGrid programs={list} /> : <NoMatch label="programs" query={query} onClear={() => setQuery("")} />}
      </section>
    </Page>
  )
}
