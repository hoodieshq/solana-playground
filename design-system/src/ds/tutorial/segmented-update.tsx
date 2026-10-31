import { Segmented, SegmentedItem } from "@/components/ui/segmented"

import { Block } from "../parts"

function SegmentedUpdateBlock() {
  return (
    <Block
      id="segmented-update"
      title="Segmented: pill, quiet, neutral chips"
      source="playground"
      registry="segmented"
      note="From the tutorial. pill is the sliding thumb, round, for a view switch in a bar. quiet is a faint well with the current one a step lighter, no thumb or ring: Form and IDL in the Call panel. tone=neutral greys the current chip instead of the purple, for chips that only pick what to show, such as an instruction."
    >
      <Segmented defaultValue="files" aria-label="Left panel">
        <SegmentedItem value="files">Files</SegmentedItem>
        <SegmentedItem value="lessons">Lessons</SegmentedItem>
      </Segmented>
      <Segmented variant="pill" defaultValue="desktop" aria-label="View">
        <SegmentedItem value="phone">Phone</SegmentedItem>
        <SegmentedItem value="tablet">Tablet</SegmentedItem>
        <SegmentedItem value="desktop">Desktop</SegmentedItem>
      </Segmented>
      <Segmented variant="quiet" defaultValue="form" aria-label="Call panel view">
        <SegmentedItem value="form">Form</SegmentedItem>
        <SegmentedItem value="idl">IDL</SegmentedItem>
      </Segmented>
      <Segmented variant="chips" tone="neutral" defaultValue="initialize" aria-label="Instruction">
        <SegmentedItem value="initialize" className="font-mono">
          initialize
        </SegmentedItem>
        <SegmentedItem value="increment" className="font-mono">
          increment
        </SegmentedItem>
      </Segmented>
    </Block>
  )
}

export { SegmentedUpdateBlock }
