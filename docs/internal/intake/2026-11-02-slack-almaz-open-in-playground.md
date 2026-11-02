# Slack: "Open in Playground" button for the docs quickstart (2026-11-02)

## Source
Slack, Almaz Zaripov, Grigory Samoylov, Sergey Prokhorov, Slava Koreshkov; passed on by Slava 2026-11-02 18:43. Raw: `.claude/intake/raw/2026-11-02-slack-almaz-open-in-playground.md`.

## Decided
- Slava takes the build task for the docs-quickstart button (Sergey asked him to pick it up; Slava, 2 Nov: "took it").
- Grigory: we should make it in time for Breakpoint.

## Requirements changed
None.

## Facts learned
- Kat asked for one more Breakpoint feature: an "Open in Playground" button on the docs page that opens the quickstart in the Playground and runs it with one script.
- The quickstart is TypeScript only, with Token-2022 calls and no program of its own, so Build and Deploy are not needed.
- Almaz takes the design (design ticket DES-203, "Open a TypeScript-only project in Playground (docs quickstart)") together with his two other design tasks (DES-193, DES-195).
- Kat's original request is a Slack thread in ext-solana-playground from 30 Oct about TS-only imports.

## Open questions
- Can the button be built before Breakpoint (Almaz's question to Slava and Sergey)?
- How it relates to the TypeScript project import already in scope.

## Actions
- Create the build ticket for "Open in Playground", checking DES-203 and the TS import work first -> Lead, pending.
- Almaz's "can we build it" question: estimate and place in the plan before Breakpoint -> planner.
