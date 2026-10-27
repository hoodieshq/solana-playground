# Spec Delta

## REMOVED Requirements

### Requirement: The objective band is one row

**Reason**: The band served the lesson path, and Hello Anchor had the only
one. Hello Anchor now runs in the conversation (`tutorial-conversation`),
where the step bar and the cards take the band's place.

**Migration**: A tutorial with a lesson path gets a definition
(`tutorial-definition`). Its steps, goals and hints move into it.

### Requirement: The step rail reads as the prototype's

**Reason**: The conversation's step bar and dividers replace the rail
(`tutorial-conversation`, "Each step opens with a divider and the step bar
jumps to it").

**Migration**: None. No tutorial other than Hello Anchor had a rail.

### Requirement: The phone's lesson bar

**Reason**: The phone shows the conversation with its own header and tabs
(`tutorial-phone`).

**Migration**: None.
