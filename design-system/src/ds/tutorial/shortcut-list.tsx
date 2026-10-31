import { Button } from "@/components/ui/button"
import { Modal, ModalBody, ModalContent, ModalHeader, ModalTitle, ModalTrigger } from "@/components/ui/modal"
import { ShortcutList, ShortcutListItem, type Shortcut } from "@/components/ui/shortcut-list"

import { Block, More } from "../parts"

const SHORTCUTS: Shortcut[] = [
  { keys: "⌘↵", what: "Run the live action", group: "In the lesson" },
  { keys: "↵", what: "Start, or go to the next step", group: "In the lesson" },
  { keys: "1 2 3", what: "Pick an answer", group: "In the lesson" },
  { keys: "S", what: "Skip the question", group: "In the lesson" },
  { keys: "H", what: "Get a hint", group: "In the lesson" },
  { keys: "⌘B", what: "Menu", group: "Panels" },
  { keys: "⌘E", what: "Files", group: "Panels" },
  { keys: "⌘J", what: "Terminal", group: "Panels" },
  { keys: "⌥↑ ⌥↓", what: "Previous and next step", group: "Steps" },
]

function List() {
  return <ShortcutList className="w-80" items={SHORTCUTS} />
}

function ShortcutListMore() {
  return (
    <>
      <More label="Flat: rows with no group">
        <ShortcutList className="w-80">
          <ShortcutListItem keys="⌘B">Menu</ShortcutListItem>
          <ShortcutListItem keys="⌘J">Terminal</ShortcutListItem>
        </ShortcutList>
      </More>
      <More label="In a Modal, behind Keyboard shortcuts">
        <Modal>
          <ModalTrigger asChild>
            <Button variant="outline" size="sm">
              Keyboard shortcuts
            </Button>
          </ModalTrigger>
          <ModalContent className="md:w-[min(24rem,calc(100vw-2rem))]">
            <ModalHeader>
              <ModalTitle>Keyboard shortcuts</ModalTitle>
            </ModalHeader>
            <ModalBody>
              <List />
            </ModalBody>
          </ModalContent>
        </Modal>
      </More>
    </>
  )
}

function ShortcutListBlock() {
  return (
    <Block
      id="shortcut-list"
      title="Shortcut list"
      source="playground"
      registry="shortcut-list"
      more={<ShortcutListMore />}
      note="Every shortcut as a row 32 tall: what it does, then its keys as Kbd caps. No lines between rows: rows come in groups under a small grey name, 16 apart. Pass items with a group each, or write ShortcutListGroups by hand; items without a group, or ShortcutListItems straight inside, make one group with no name. keys takes a string split on spaces, or an array. A dl per group, so each row reads as a term and its keys. Put it in a Modal behind Keyboard shortcuts."
    >
      <List />
    </Block>
  )
}

export { ShortcutListBlock }
