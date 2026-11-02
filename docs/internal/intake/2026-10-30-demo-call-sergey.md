# Demo-build review call with Sergey, 2026-10-30 - what it changed

## Source

A call on 30 Oct 2026, 18:18-19:04 (UTC+5), recorded with Wispr Flow (45:34 on tape, 15
screenshots). Present: Sergey Prokhorov (`@sergo`, tech lead) and Slava Koreshkov. Sergey
walked the demo build stage by stage (Build, Deploy, Interact, Settings, Programs, Home) an
hour before the client demo, and dictated corrections "for the record".

- Items: 54 (I-1..I-54), parsed in `.claude/lead/intake/2026-10-30-demo-call-sergey/items.md`.
- Level 2 used: Whisper large-v3-turbo with the glossary prompt, compared line by line with
  Wispr's level 1; doubtful clips re-run without the prompt. Validation: found=33,
  resolved=29, unresolved=4 (one of them, I-33, affects scope; see Open questions).
- Scope approved by Slava in the Planner window on 2026-11-02 16:43 (per card), with the
  remaining points and the list as a whole confirmed at 16:46 ("да"). Approval verbatim in
  `approved-scope.md` next to the items. This record follows the approved scope, not the
  raw items: what Slava cut, merged or turned into a question is under Open questions.

Totals after approval: 16 new tickets, 8 additions to open tickets, 8 cards not scope.

## Decided

Each line: what, who decided, item ids.

**IDL on-chain**
- The on-chain IDL goes to the **Program Metadata** program (PDA seeded "idl"), not to
  Anchor's IDL account, which is legacy. Sergey ("это современный способ хранения IDL"). I-2.
- Deploy gets an action that publishes the build's IDL on-chain, so nobody downloads and
  re-uploads it; Explorer then names instructions instead of "Unknown instruction". Sergey,
  restated by Slava. I-1.
- Before implementing it, a spike: can the browser write to Program Metadata (anchor-cli
  WASM or our own client). The spike lands before Breakpoint; the implementation after.
  Slava, 2 Nov. I-1.
- Download IDL and the local "Upload IDL from file" both stay (for experiments on devnet).
  Sergey. I-3, I-4, I-22.

**Deploy with the CLI dialog**
- Step 3.1 "Upload IDL": the Program Metadata command on the Solana CLI tab, Anchor's legacy
  `anchor idl` command on the Anchor tab; "Download IDL" next to "Download SO". Sergey. I-5,
  I-7, I-8, with I-6 (check that the shown scripts work).

**Networks and mainnet**
- Settings, Network keeps only our platform RPCs; the public Devnet and Mainnet Beta are
  dropped (rate limits). The platform entries are named plainly "Devnet" and "Mainnet".
  Sergey, confirmed by Slava 2 Nov. I-12, I-18.
- "Mainnet Beta" is written "Mainnet" everywhere in the UI, and cluster names are
  capitalised as proper nouns (Mainnet, Devnet, Testnet). Sergey, Slava agreed. I-18, I-19.
- Every mainnet deploy asks for confirmation, on each request. Sergey asked, Slava fixed
  "each request" on 2 Nov. I-14.
- On mainnet, "Deploy with the CLI" becomes the primary action and "Redeploy to Mainnet"
  secondary: push users to deploy from their own machine. Sergey, Slava. I-17, I-10.
- The yellow "Mainnet uses real SOL" warning is accepted as built. Sergey. I-16.
- Switching the cluster asks for no confirmation. Sergey, rejecting Slava's suggestion. I-20.
- Settings stores endpoint **aliases**, never provided URLs; only a custom URL is stored as
  an address. An alias that no longer resolves falls back to Devnet. Sergey ("это прям
  очень важно"), Slava "под запись". I-41, I-42.
- SolPg (original backend) leaves the build-server list; whoever needs it enters it as
  Custom. Sergey, Slava. I-39.
- Network and Connection, Endpoint both stay, though they look like duplicates. Sergey. I-40.

**Interact**
- Interact works today and must not break: an acceptance line for every change below.
  Sergey. I-21.
- The PDA seed generator ("From seed") stays. Sergey. I-30.

**Home and assistant**
- The Home "Ask anything" composer is disabled when signed out. Sergey; Slava approved it as
  High. I-45.
- A signed-in default agent sees every MCP server and skill by default; the Explorer MCP
  stays. Sergey. I-46.

**Demo (same evening)**
- The client demo shows the main flow as walked on this call, not the small design fixes;
  Sergey leads it, Slava turns this call into tickets. Slava, Sergey agreed. I-52..I-54.

## Requirements changed

- **Mainnet naming:** "Mainnet Beta" chip per the specs (Word the mainnet deploy warning,
  faucet line and Mainnet Beta chip as the specs say) → "Mainnet" everywhere; the new
  networks ticket supersedes that chip. I-18.
- **Network list:** Devnet, Testnet, Localnet, Devnet (Platform), Mainnet Beta (Platform),
  Mainnet Beta → platform Devnet and Mainnet only, labelled without "Platform" or "Beta". I-12.
- **Mainnet deploy (Warn before a mainnet deploy):** warning only → warning plus a
  confirmation on every deploy, and the CLI path as the primary button. I-14, I-17.
- **Custom RPC:** one custom URL per setting → several saved custom RPCs (Triton, Helius,
  ...), selectable. I-13.
- **Sidebar Get set up rows:** links into Settings → quick network and wallet switchers at
  the sidebar bottom (after Breakpoint). I-11.
- **Build-server list:** Solana Foundation, Local, SolPg, Custom → SolPg removed. I-39.
- **Interact layout:** form with Call history below → two columns, form left and Call
  history right; ACCOUNTS stays at the bottom. I-23.
- **Account picker:** flat-looking groups, top-level-only search → visible groups and
  nesting, a Solana system-programs section, search into groups, autocomplete by name and
  by address prefix (Tab), address beside the name, match highlight. I-26..I-29.
- **TypeScript import (Import a plain TypeScript project):** "a TypeScript program" → "tests
  and tooling around a program"; texts and template say so. Sergey: "не бывает
  TypeScript-овой программы". I-37.
- **Home composer (Design question: should the Home composer start something real?):**
  undefined → its job is product navigation: suggest a program to run or a tutorial to
  open. Not urgent. Slava 2 Nov. I-44, I-48.
- **Seeds (1.x IDL support in the generator and the seeds UI):** manual only → after the
  Anchor 1.1.2 move, derive PDA seeds from the IDL as Solana Explorer does. I-32.

## Facts learned

- Two on-chain IDL stores exist: Anchor's IDL account (legacy) and the Program Metadata
  program. Explorer reads them to decode instructions.
- Sergey's reason for the mainnet confirmation: the Playground wallet's private key lives in
  the browser and is readable by any XSS; on mainnet that is real money and the user's risk.
- Public Solana RPCs hit rate limits, mainnet especially, so the product relies on platform
  RPCs (Triton keys).
- Sergey says Solana moved to Alpenglow "last week" and the `mainnet-beta` moniker may
  retire. Not verified.
- The build server runs Anchor 0.29; the move to 1.1.2 is planned, and Anchor 1.2.0 is a
  separate later template. Codama's `nodes-from-anchor` converts an Anchor IDL to Codama.
- The settings code already stores `{ option }` for provided endpoints and `{ option:
  "custom", url }` for custom ones; the gap is plain URL strings saved before #31, which
  are kept as they are.
- The "Call initializasde" label on the demo came from the demo program's own instruction
  name, not from app copy (I-24).

## Open questions

- **I-33, Anchor version for Codama:** Sergey said "1.1.2" at 29:04, then "1.2" at 29:09;
  Slava recorded "1.2". Level 2, an unprompted re-run and the live transcript all hear 1.2,
  so this stays unresolved. Best guess 1.1.2, low confidence. Asked of Sergey in the
  "Download IDL in Anchor or Codama format" ticket.
- **I-15, the mainnet cookie:** Sergey wants a cookie recording that the user accepted the
  risk. Whether it suppresses later confirmations, how long it lives and why a cookie and
  not localStorage were not said. Slava's line: confirm every request; the cookie's meaning
  is an explicit question to Sergey in the mainnet-warning ticket.
- **I-42, fallback scope:** does the Devnet fallback apply beyond RPC (the build server's
  default is not Devnet)? Question to Sergey in the aliases ticket.
- **I-35, decode by IDL:** account data (more likely: "если там написаны аккаунты") or
  instruction arguments? Question to Sergey in the backlog ticket.
- **I-47..I-50, community tutorials:** what-to-learn skill, template repo and registry,
  create-tutorial skill. Slava: "далёкий бэклог"; unclear points go to Sergey in the ticket.
- **I-23, Interact columns:** a question to Nikita in the ticket, or a link to the related
  design ticket.
- **I-9:** is the mainnet RPC URL and moniker still `mainnet-beta` after Alpenglow, and does
  the stored moniker change or only the label? Folded into the networks ticket.
- **I-12:** Testnet, Localnet and Playnet were not discussed; Slava kept "only our platform
  Devnet and Mainnet", so whether the other clusters stay is for the networks ticket.
- **I-38, pure-TS sample project:** Slava and Sergey meant to ask Kat at the demo which
  pure-TS project she wants shown. The answer is not recorded here.
- **Cut from scope by Slava:** I-31 (more int seed types, withdrawn on the spot); I-24 (the
  typo, a demo-day fix); I-3, I-4, I-22, I-16, I-21, I-30, I-40 (keep-as-is, no work);
  I-52..I-54 (demo actions).
- **Recognition doubts left, no scope impact:** 34:35 (Sergey pointing at Endpoint), 39:55
  (what the Home composer opens today), 41:12 ("Zerokey", most likely ZK).

## Actions

New tickets, all `→ Lead, pending` (no numbers yet). Stage 4 "The user's own work" unless
marked; priority in brackets.

- Spike: upload the IDL through Program Metadata from the browser (anchor-cli WASM or our own
  client), before Breakpoint [High]. I-1, I-2. → Lead, pending
- CLI deploy dialog: step 3.1 Upload IDL and Download IDL [Medium]. I-5..I-8. → Lead, pending
- Networks: platform RPCs only, named Devnet and Mainnet; cluster names capitalised [High].
  I-9, I-12, I-18, I-19. → Lead, pending
- Several saved custom RPCs in Settings, Network [Medium]. I-13. → Lead, pending
- Quick network and wallet switchers at the sidebar bottom, after Breakpoint [Medium]. I-11,
  I-20. → Lead, pending
- Interact in two columns: form left, Call history right [Medium], with a question to
  Nikita or a linked design ticket. I-23. → Lead, pending
- Bug: picker search misses entries inside groups; check every program address in the lists
  [High]. I-25, I-27. → Lead, pending
- Account picker rework, after Breakpoint [Medium]; upstream code, divergence register row.
  I-26, I-28, I-29. → Lead, pending
- Download IDL in Anchor or Codama format, after Breakpoint [Low], with the Anchor-version
  question to Sergey. I-33. → Lead, pending
- Address book for generated addresses, after Breakpoint [Medium]. I-34. → Lead, pending
- Decode data by IDL layouts, far backlog [Low], with the question to Sergey. I-35. → Lead,
  pending
- Drop SolPg (original backend) from the build-server list [High]; divergence register row.
  I-39. → Lead, pending
- Store endpoint aliases only, migrate legacy URLs, fall back to Devnet [High], with the
  fallback-scope question to Sergey. I-41, I-42. → Lead, pending
- Community tutorials: what-to-learn skill, template repo and registry, create-tutorial
  skill, far backlog [Low], with questions to Sergey. I-47, I-49..I-51. → Lead, pending
- Bug: sidebar program label overlaps the next label [Medium]. Screenshot 18.12.14, not
  discussed on tape. → Lead, pending
- Bug: Mainnet header says 1 deployment and offers Redeploy to Mainnet with nothing deployed
  there [Medium]. Screenshot 18.28.19, not discussed on tape. → Lead, pending

Additions to open tickets, `→ Lead, pending`:

- Init and upgrade the on-chain IDL from the Deploy stage: Upload IDL writes into Program
  Metadata in one transaction; after Breakpoint, behind the spike. I-1, I-2.
- Warn before a mainnet deploy: confirm every mainnet deploy, CLI as primary, cookie
  question to Sergey. I-10, I-14, I-15, I-17.
- 1.x IDL support in the generator and the seeds UI: derive seeds from the IDL after 1.1.2.
  I-32.
- Import a plain TypeScript project (both tickets): "tests and tooling around a program".
  I-36, I-37.
- Trim the GitHub program list to Solana-native and notable programs: Futarchy, Drift and
  Mango are examples to drop. I-43.
- Design question: should the Home composer start something real?: navigation inside the
  product, not urgent. I-44, I-48.
- Gate the AI surfaces on the status response: Home composer disabled when signed out
  [High]. I-45.
- Make MCP servers a flagged feature of the default backend: everything visible by default,
  Explorer MCP stays; checked 2 Nov, no conflict with Refuse loading a skill the user
  unticked. I-46.

Other:

- glossary → architect (the confirmed terms below).
- SCOPE-DONE 2026-11-02 16:48 from planner

## Dictionary candidates

**Confirmed by Slava, 2026-11-02 (all candidates):** IDL, Anchor, Codama, nodes-from-anchor,
Program Metadata, .so, solana program deploy, Deploy with the CLI, Alpenglow, mainnet-beta,
Mainnet, Devnet, Testnet, Localnet, Pyth, WSOL, System Program, Associated Token Program, PDA,
Current wallet, From seed, Triton, Helius, Futarchy, Drift, Mango, SolPg, Solana Foundation,
Solana Explorer, MCP, gist, Playground, Interact, Call history, signed in, download, upload,
Kat.
