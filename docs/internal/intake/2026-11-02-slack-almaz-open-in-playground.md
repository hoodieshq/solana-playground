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
- Create the build ticket for "Open in Playground", checking DES-203 and the TS import work first -> lead, filed as [HOO-2507](https://linear.app/solana-fndn/issue/HOO-2507) Open the docs quickstart in Playground from a link and run it (High, Slava).
- Almaz's "can we build it" question: estimate and place in the plan before Breakpoint -> planner, placed as D-docsopen, 1.5 bd.

## Update 2026-11-02 19:05: Cat's answers from the customer chat
Raw: `.claude/intake/raw/2026-11-02-slack-cat-open-in-playground-answers.md`. Slack thread of 30 Oct in ext-solana-playground.

### Decided (Cat, customer)
- It opens through an "Open in Playground" button on the docs page that loads the code.
- It runs as one script, not step by step like the docs.
- A SOL-funded wallet is enough to start ("SOL is probably fine"); no devnet USDC needed.
- Scope for Breakpoint: the quickstart only.

### Requirements changed
- Scope after Breakpoint: other docs pages too (payments, assets); Cat wants something repeatable, not a one-off for the quickstart.

### Facts learned
- The quickstart uses the Token-2022 program and sends test USDC; it is on a preview site reachable through the Solana Foundation Vercel.
- Cat said "SOL is probably fine" (hedged), so the funding answer is soft.

### Open questions
- How the repeatable mechanism should work for other docs pages (not specified).

### Actions
- Cat's answers go into the "Open in Playground" ticket and its estimate -> Lead and planner.
