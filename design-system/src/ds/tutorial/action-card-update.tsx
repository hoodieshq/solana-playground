import {
  ActionCard,
  ActionCardContent,
  ActionCardDescription,
  ActionCardIndicator,
  ActionCardMedia,
  ActionCardMeta,
  ActionCardTitle,
} from "@/components/ui/action-card"

import { Block } from "../parts"

/* A stand in for a tutorial's cover, so the specimen needs no image */
function Cover({ from, to }: { from: string; to: string }) {
  return <span aria-hidden="true" style={{ backgroundImage: `linear-gradient(135deg, ${from}, ${to})` }} />
}

function ActionCardUpdateBlock() {
  return (
    <Block
      id="action-card-update"
      title="Action card: fill"
      source="playground"
      registry="action-card"
      note="The tutorial gallery's card. variant=fill fills a step on hover instead of brightening its edge, with its title at 500. ActionCardMeta is the line under the description: who made it and with what. ActionCardIndicator is the way in, a square in the corner that carries the stretched link: an arrow, or a green tick once the tutorial is done. Give it an aria-label that names the card."
      className="grid max-w-3xl gap-3 md:grid-cols-2"
    >
      <ActionCard variant="fill">
        <ActionCardMedia variant="image">
          <Cover from="var(--brand-purple)" to="var(--brand-violet)" />
        </ActionCardMedia>
        <ActionCardContent>
          <ActionCardTitle>
            Hello, Anchor
            <span className="ml-2 align-middle text-xs font-normal text-muted-foreground tabular-nums">2 of 4</span>
          </ActionCardTitle>
          <ActionCardDescription>Write a program that says hello, deploy it, and call it.</ActionCardDescription>
          <ActionCardMeta>Anchor · by Solana Foundation</ActionCardMeta>
        </ActionCardContent>
        <ActionCardIndicator aria-label="Continue Hello, Anchor" />
      </ActionCard>
      <ActionCard variant="fill">
        <ActionCardMedia variant="image">
          <Cover from="var(--brand-teal)" to="var(--brand-green)" />
        </ActionCardMedia>
        <ActionCardContent>
          <ActionCardTitle>Counter</ActionCardTitle>
          <ActionCardDescription>Keep a number on chain and add one to it.</ActionCardDescription>
          <ActionCardMeta>Anchor · by acheron</ActionCardMeta>
        </ActionCardContent>
        <ActionCardIndicator state="done" aria-label="Counter completed. Open it" />
      </ActionCard>
    </Block>
  )
}

export { ActionCardUpdateBlock }
