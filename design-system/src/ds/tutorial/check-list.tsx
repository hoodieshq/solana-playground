import { CheckList, CheckListItem } from "@/components/ui/check-list"

import { Block } from "../parts"

function CheckListBlock() {
  return (
    <Block
      id="check-list"
      title="Check list"
      source="playground"
      registry="check-list"
      note="What a lesson taught, at its finish: a green tick a line in the reading text, 16/24, items 6 apart, the tick centred on the first line. One idea a line, said as what you can now do."
    >
      <CheckList className="max-w-md">
        <CheckListItem>An Anchor program is a module of instructions</CheckListItem>
        <CheckListItem>A deploy puts the program on devnet at an address of its own</CheckListItem>
        <CheckListItem>A client calls an instruction and reads the log it prints, so you see the program answer you by name from devnet</CheckListItem>
      </CheckList>
    </Block>
  )
}

export { CheckListBlock }
