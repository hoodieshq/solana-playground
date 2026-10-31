import { ArrowUp } from "lucide-react"

import {
  Composer,
  ComposerInput,
  ComposerSend,
  ComposerSuggestion,
  ComposerSuggestions,
  ComposerToolbar,
} from "@/components/ui/composer"

import { Block, More } from "../parts"

function ComposerUpdateBlock() {
  return (
    <Block
      id="composer-update"
      title="Composer: one line at rest, suggestions"
      source="playground"
      registry="composer"
      note="The tutorial's chat. collapsible keeps the box to one line, the words and Send side by side, until it is focused or holds text; it folds back once a press elsewhere ends, so what was pressed stays put. ComposerSuggestions sits over the box: with a mouse the chips that do not fit fold into More, under a finger the row scrolls sideways under a fade. disabledLook=solid greys Send out on the hover grey instead of fading the purple. A controlled value now sizes the box and Send too, so clearing it after sending puts both back."
      className="block"
      more={
        <More label="Focused, or holding text: the full box" className="block">
          <Composer collapsible className="max-w-xl">
            <ComposerInput defaultValue="Why does the account need a payer?" />
            <ComposerToolbar>
              <ComposerSend disabledLook="solid">
                <ArrowUp />
              </ComposerSend>
            </ComposerToolbar>
          </Composer>
        </More>
      }
    >
      <div className="flex max-w-xl flex-col gap-3">
        <ComposerSuggestions>
          <ComposerSuggestion value="Explain this step" />
          <ComposerSuggestion value="Why a PDA?" />
          <ComposerSuggestion value="What does msg! cost?" />
          <ComposerSuggestion value="Show me the client" />
          <ComposerSuggestion value="I'm stuck" />
        </ComposerSuggestions>
        <Composer collapsible>
          <ComposerInput placeholder="Ask about this step" />
          <ComposerToolbar>
            <ComposerSend disabledLook="solid">
              <ArrowUp />
            </ComposerSend>
          </ComposerToolbar>
        </Composer>
      </div>
    </Block>
  )
}

export { ComposerUpdateBlock }
