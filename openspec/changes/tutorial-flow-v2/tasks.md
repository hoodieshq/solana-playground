# Tasks

Spec ticket: HOO-2321. One task is one ticket and one PR. Owner and estimate
(session-days) follow each task. Groups 1, 2 and 6 start at once; 3 needs
1.1; 4 needs 3.1; 5 needs 3.1 and 2.1.

## 1. Definition

- [x] 1.1 Definition v1: `tutorial.schema.json`, `yarn tutorial:check` with
      the semantic rules, the loader into the catalog (with "Step n of m"
      progress), Hello Anchor's prototype script as `tutorial.json`,
      `tutorial_definition_rejected`. Verify: the check passes on Hello Anchor
      and fails with path errors on the spec's two broken fixtures; the catalog
      lists Hello Anchor from JSON (HOO-1792; fleet; M 1.5; after nothing;
      plan: [plans/1.1-definition-v1.md](plans/1.1-definition-v1.md))
- [ ] 1.2 `AUTHORING.md`, the instruction an agent follows to write a
      tutorial. Verify: an agent following only it writes a two-step fixture
      tutorial that passes the check and runs (ticket to file; Natalia; S 1;
      after 1.1)

## 2. Frame

- [ ] 2.1 The tutorial frame: rail, chat column and workspace slot, the
      navigation folding to its rail with overlay, pin and the first-time hint,
      the chat head with back, name and ⋯ menu, column width and handle,
      opened for a tutorial with a definition. Verify: unit tests for the fold
      rules and the width clamp; widths at 1440, 1280 and 1152 (ticket to
      file; fleet; M 1.5; after nothing)
- [ ] 2.2 The workspace: head tabs that never close, the Call button slot,
      Files ⌘E and Terminal ⌘J icons, the tree popover and dock, the terminal
      bar and drawer with its states and auto-open rules, the editor's
      written, arriving, landing, error and busy lines. Verify: unit tests
      for the line states and the tree keys (ticket to file; fleet; M 1.5;
      after nothing; mounts in 2.1's slot)

## 3. Conversation

- [ ] 3.1 The conversation engine: the reducer over definition and
      progress, the runner's clock, saving to `tutorial-storage.json` under
      `conversation`, reload (turns whole, runs interrupted), Start over,
      `tutorial_started` and `tutorial_finished`. Verify: unit tests that walk
      Hello Anchor's definition from intro to finish with stubbed runs, and
      reload at every beat (ticket to file; fleet; M 1.5; after 1.1)
- [ ] 3.2 Step goals on real results: `build`, `deploy` and `call` checks
      extending `VerifyCondition`, `read` dropped, `tutorial_step_passed`.
      Verify: unit tests per goal, including a call before the upgrade that
      does not pass the argument goal (HOO-1790; fleet; S 1; after 1.1)
- [ ] 3.3 The feed: intro card, dividers, step bar with its states and keys,
      say and quote, wrote card, records, the back pill, `role="log"`.
      Verify: component tests for every record line in the spec and the jump
      from step 3 to step 1 (ticket to file; fleet; M 1.5; after 2.1, 3.1)
- [ ] 3.4 Win and finish cards: Next with ↵, "Open Call" / "Write it in
      client.ts", the finish's Transaction details, "What you learned", the
      steps · SOL · time line, "Next: <tutorial>" and "All tutorials". Verify: component tests for the last step's win with no Next
      (ticket to file; fleet; S 1; after 3.1)
- [ ] 3.5 The question card: picks, keys (1-3, H, S), "Not quite." and
      reasons, two-wrong outline, Hint, Skip, Type it myself, the key line
      typed by hand, the right pick's write with its wrote card, the
      expandable record, `tutorial_question_answered`. Verify: component tests for
      the spec's wrong-then-right scenario and the typed-by-hand path (ticket
      to file; fleet; M 1.5; after 2.2, 3.1)
- [ ] 3.6 Composer and the live assistant in one thread: action words (and
      the open-question refusal), scripted matches, the finish chips, free
      questions to the assistant in tutorial mode (no writing or running tools), the apply
      card, the merged feed, `tutorial_question_asked`. Verify: unit tests
      for the routing order; a tool call to write a file is refused in
      tutorial mode (ticket to file; fleet; L 2.5; after 3.1)

## 4. Runs

- [ ] 4.1 Build act and the planned failure: build through the server, the
      error parsed to code, line and column, the failed card with Explain and
      "I'll fix it myself", the planned explanation and fix question, the
      unplanned failure through the assistant with "Show me the fix",
      `tutorial_action_run` for builds. Verify: parser unit tests on real
      server logs; Hello Anchor's E0412 path in a component test (ticket to
      file; fleet; M 1.5; after 3.1, 3.2)
- [ ] 4.2 Deploy from the wallet: no-wallet path, airdrop funding as a stage,
      "Not enough devnet SOL" with the faucet, the program keypair kept,
      upgrade in place, the result with SOL spent, the program id and the
      deploy transaction linked to Explorer on devnet, the redeploy nudge,
      a deploy recognised after a reload. Verify: unit tests with a stubbed
      connection for funding and recognition; one devnet deploy and upgrade
      by hand (ticket to file; fleet; L 2.5; after 3.1, 3.2)
- [ ] 4.3 Client run and the call act: the run bound to the program and
      wallet, the signatures it sent captured, logs fetched and the
      definition's line picked, the receipt with Explorer links, failed
      transactions. Verify: unit tests for signature capture and log picking;
      Hello Anchor's step 3 on devnet by hand (ticket to file; fleet; M 1.5;
      after 3.1, 3.2)
- [ ] 4.4 The Call panel from the deployed IDL: the Form | IDL switch, the
      program row with Explorer, the instruction cards with "New", the call
      button, the latest result in the panel and the log in the terminal,
      passing steps 3 and 4. Verify: component tests for the upgrade adding
      `name`; a call passing step 3 (ticket to file; fleet; M
      1.5; after 2.2, 4.3)

## 5. Phone

- [ ] 5.1 The phone: the header with the steps sheet and Start over, the
      Chat | Code spaces with swipe and Code's dot, Code's file switcher and
      status strip, Show in switching to Code, the Call sheet, no typing
      paths, touch sizes. Verify: component tests at 390 px;
      the same turns as desktop from one saved progress (ticket to file;
      fleet; L 2.5; after 3.3, 3.5, 4.4)

## 6. Tutorials page and content

- [ ] 6.1 The tutorials page by level: tutorials-gallery-stand tasks 3.1 and
      3.2, plus a conversation tutorial's "Step n of m" and "Continue · Step
      n of m" on its card and the Start here banner. Verify: that change's
      scenarios and "Hello Anchor half done" (ticket to file; Natalia; S 1;
      after 1.1)
- [ ] 6.2 Hello Anchor on the real flow: the copy without Kora per Almaz,
      the log patterns and goals tuned on the build server and devnet, a full
      run by hand. Verify: the check passes and a full run lands every win
      (ticket to file; Natalia; S 1; after 1.2, 4.1, 4.2, 4.3)
- [ ] 6.3 Lumberjack (Intermediate) as a definition from Almaz's script.
      Verify: the check passes; a full run on devnet (ticket to file; Natalia;
      M 1.5; after 1.2 and Almaz's script)
- [ ] 6.4 Zero Copy (Advanced) as a definition from Almaz's script, with the
      deploy and rent costs confirmed on devnet. Verify: the check passes; a
      full run on devnet (ticket to file; Natalia; L 2.5; after 1.2 and
      Almaz's script)
- [ ] 6.5 e2e for the flow: Hello Anchor from intro to finish on desktop
      and at 390 px with the build server and devnet as an `env` case; the
      wrong pick, planned failure and Call panel paths. Verify: the specs run green
      in CI's e2e job (ticket to file; Natalia; M 1.5; after 3.5, 4.1, 4.2,
      4.4, 5.1, 6.2)

## 7. Cleanup

- [ ] 7.1 Retire the lesson band, rail, reader and phone bar, `PgLesson`'s
      key and `migrate.ts`, per the `client-v2-lessons` delta. Verify: `yarn
      run check` passes and no import of `views/flow/lessons` remains (ticket
      to file; fleet; XS 0.5; after 3.3, 6.2)
