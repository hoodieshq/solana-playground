import { ChevronDown, Send, Terminal } from "lucide-react"

import { EditorTab, EditorTabLabel, EditorTabs, EditorTabsActions, EditorTabsBar, EditorTabTrigger } from "@/components/ui/editor-tabs"
import { ToolButton } from "@/components/ui/tool-button"

import { Block } from "../parts"

const FILES = ["lib.rs", "client.ts", "state.rs", "errors.rs", "instructions.rs", "Anchor.toml", "Cargo.toml", "tests.ts"]

function EditorTabsUpdateBlock() {
  return (
    <Block
      id="editor-tabs-update"
      title="Editor tabs: quiet"
      source="playground"
      registry="editor-tabs"
      note="The tutorial's head over the editor. variant=quiet drops the purple line and sets the current tab on the code ground, in a bar a step taller. Past the strip's width the edge that hides tabs fades, and the current tab scrolls into view as it opens and as the strip narrows; fade and followActive turn these on for the default look too. EditorTabsBar holds the strip and EditorTabsActions, the tools at its end."
      className="block"
    >
      <div className="max-w-md overflow-hidden rounded-t-xl">
        <EditorTabsBar variant="quiet">
          <EditorTabs variant="quiet">
            {FILES.map((file, i) => (
              <EditorTab key={file} active={i === 5} className="px-0">
                <EditorTabTrigger className="gap-1.5 px-3">
                  <EditorTabLabel>{file}</EditorTabLabel>
                </EditorTabTrigger>
                {i === 5 && (
                  <button
                    type="button"
                    aria-label="Files"
                    className="mr-1.5 grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <ChevronDown aria-hidden="true" className="size-3.5" />
                  </button>
                )}
              </EditorTab>
            ))}
          </EditorTabs>
          <EditorTabsActions>
            <ToolButton label="Call">
              <Send />
            </ToolButton>
            {/* Lucide draws >_ in the lower part of its box, so it rides a pixel up to sit level with Send */}
            <ToolButton label="Terminal" shortcut="⌘J">
              <Terminal className="-translate-y-px" />
            </ToolButton>
          </EditorTabsActions>
        </EditorTabsBar>
        <div className="h-16 bg-code-ground" />
      </div>
    </Block>
  )
}

export { EditorTabsUpdateBlock }
