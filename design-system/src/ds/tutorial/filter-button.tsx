import * as React from "react"

import { FilterButton } from "@/components/ui/filter-button"

import { Block } from "../parts"

const FRAMEWORKS = [
  { value: "all", label: "All" },
  { value: "anchor", label: "Anchor" },
  { value: "native", label: "Native" },
  { value: "seahorse", label: "Seahorse" },
]

function FilterButtonBlock() {
  const [a, setA] = React.useState("all")
  const [b, setB] = React.useState("anchor")
  const [c, setC] = React.useState("all")
  return (
    <Block
      id="filter-button"
      title="Filter button"
      source="playground"
      registry="filter-button"
      note="A filter as an icon beside a search, not a second box. It opens one choice under a quiet heading with the tick on the right in the accent; a dot on the icon says a filter is on (any value but allValue, all by default). boxed is a desk's, a square of the search field's height outlined like it. bare is a phone's, the glyph alone in a thumb's square."
    >
      <FilterButton label="Framework" options={FRAMEWORKS} value={a} onValueChange={setA} />
      <FilterButton label="Framework" options={FRAMEWORKS} value={b} onValueChange={setB} />
      <FilterButton label="Framework" options={FRAMEWORKS} value={c} onValueChange={setC} variant="bare" />
      <FilterButton label="Framework" options={FRAMEWORKS} value="native" onValueChange={() => {}} variant="bare" />
    </Block>
  )
}

export { FilterButtonBlock }
