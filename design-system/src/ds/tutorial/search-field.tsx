import * as React from "react"

import { FilterButton } from "@/components/ui/filter-button"
import { SearchField, SearchFieldAside, SearchFieldCancel, SearchFieldInput } from "@/components/ui/search-field"

import { Block, More } from "../parts"

const FRAMEWORKS = [
  { value: "all", label: "All" },
  { value: "anchor", label: "Anchor" },
  { value: "native", label: "Native" },
]

/* The tutorials page's head: the heading, the search, the filter */
function Head({ className }: { className?: string }) {
  const [query, setQuery] = React.useState("")
  const [framework, setFramework] = React.useState("all")
  return (
    <SearchField collapsible value={query} onValueChange={setQuery} className={className}>
      <SearchFieldAside className="mr-auto">
        <h2 className="font-heading text-[1.75rem] font-normal tracking-[-0.015em] text-foreground">Tutorials</h2>
      </SearchFieldAside>
      <SearchFieldInput placeholder="Search 24 tutorials" aria-label="Search tutorials" />
      <SearchFieldCancel />
      <SearchFieldAside>
        <FilterButton label="Framework" options={FRAMEWORKS} value={framework} onValueChange={setFramework} />
      </SearchFieldAside>
    </SearchField>
  )
}

function SearchFieldMore() {
  return (
    <More label="collapsible, in a row under 35rem: folded to a square, press it to open across the row">
      <Head className="w-80" />
    </More>
  )
}

function SearchFieldBlock() {
  return (
    <Block
      id="search-field"
      title="Search field"
      source="playground"
      registry="search-field"
      className="block space-y-6"
      more={<SearchFieldMore />}
      note="A search in a soft well: a fill a few steps over the ground and a hairline only just over it. Esc takes back what was typed, then closes an open row. collapsible folds it to a square under 35rem of its row (the row's own width decides, so a larger font folds it sooner); pressed, it opens across the row, SearchFieldAside steps out of the way and SearchFieldCancel gives the row back. 44px and 16px type under a finger, so a phone doesn't zoom."
    >
      <SearchField className="w-80">
        <SearchFieldInput placeholder="Search tutorials" aria-label="Search tutorials" />
      </SearchField>
      <SearchField defaultValue="counter" className="w-80">
        <SearchFieldInput placeholder="Search tutorials" aria-label="Search tutorials" />
      </SearchField>
      <Head className="w-full max-w-2xl" />
    </Block>
  )
}

export { SearchFieldBlock }
