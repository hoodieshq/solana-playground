# Hello Anchor inside the product

Date: 2026-10-22. Branch `almaz/tutorial-in-product`, cut from Nikita's
`saving-chats-history` (4fcb29b7). Replaces the standalone prototype in
`design-system/src/prototype/tutorial` as the thing we show.

## Why

Nikita's review of the standalone prototype: it rebuilt the product from
zero and lost what the product already had (Studio with Annotate and
Viewport, the ▷O mark, brand icons, the chat with model and effort, the
author, step back and forward, I'm stuck, Chat/Code on a phone, files,
start from scratch, AI settings, motion). His own rule from the UX
Evaluation: "Nothing appears on one screen and vanishes on the next".

So the product is the baseline. Nothing it has is removed. The prototype's
mechanics that reviewers asked to keep are added on top of it.

## What stays exactly as it is

Nav sidebar and rail, Home, gallery, About page with author, Get set up
checklist, account menu, cluster row, settings page, assistant pane with
model and effort, Connect a model, Sources and tools, chapters in chat,
Steps/Files, stage rail Write/Build/Deploy/Interact, Build diagnostics with
Fix with assistant, Deploy card and history, Interact with the IDL Test UI,
terminal, ObjectiveBand with back/forward, Read the page, I'm stuck hint
ladder, Skip this step, phone pages menu/work/preview with Chat/Code and ▶.
Brand: mark, BrandIcon, pattern ground, gradient on strokes only for what
is selected, brand actions ringed with gradient on hover, Stack Sans,
motion on cubic-bezier(0.2, 0, 0, 1). Real toolchain: the build, the IDL
and the deploy decide a step, not a click.

## What we add

1. **Target action in the band.** The step's verifying action (Build,
   Deploy, Run the client, Call hello) sits in the band beside Read the
   page, so the learner sees what to press. Preconditions are explained on
   the button instead of failing on click. This is Slava's open item in
   `docs/lesson-paths-todo.md` and our reading of Nikita's "целевые
   действия".
2. **Two paths on every step.** Write it in the editor and press the target
   action, or Write with assistant: the patch opens as a diff inside the
   file with a note per change, then Apply and build, Discard, and Undo
   patch after applying. Works without a connected model (the tutorial's
   own scripted patches); with a model connected the chat is the real one.
3. **The assistant greets the step.** The pane is open when a step starts
   and its first message says what the step does and offers both paths.
   Chips stay after use.
4. **Quick check.** Steps 1 and 4 ask one question with three answers
   before showing the patch, 1/2/3 keys, Skip and show the code.
5. **The planned first error is real.** Step 1's assistant patch leaves the
   `Hello` accounts struct out, so the real build fails with E0412. Build's
   diagnostic card gets Explain and Review the fix; the second patch adds
   the struct. First try on the finish screen does not count this error.
6. **Cards after deploy and after the client.** Program id and transaction
   with Copy and an Explorer link that names the network.
7. **Step 4 is consistent.** `hello` takes `name`, the learner rebuilds,
   redeploys and calls `hello` with a name in Interact. The log shows
   `Hello, <name>!` and the finish screen uses that transaction.
8. **A finish.** Today the last step just ends. Add the finish view: steps,
   first try, time, last transaction, what you learned, the next tutorial,
   Back to tutorials and Open the project.
9. **Gallery status.** Done mark and "n of 4" on the Hello Anchor card,
   and the Start here banner on the pattern with a new picture (2 or 3
   variants for Almaz to pick, the split code card is dropped).
10. **Studio on the stand.** The ribbon with Viewport, Components,
    Annotate (Agentation) and Narrate, as on solana-playground-ds.

## Bugs from the Slack review that must not come back

Esc leaves the editor; Enter after a click on a compiler line never edits
code; an edit after a passed build is graded again (the product re-grades
on every state change, keep it); toasts never cover the head and its
buttons; Discard clears the old feedback; long lines wrap in the lesson and
the terminal on a phone; one label per action across screens (Open in
Explorer); Tic-tac-toe spelled right in the gallery.

## Stand

New Vercel project in team hoodies, basic auth in edge middleware, password
and `X-Robots-Tag` from project env, measured after every deploy (root,
deep path, static asset, error page). Built from the worktree with the WASM
stubs (`yarn build-fast`) plus the Studio files from
`design-system/studio/tools`.

## Open with Nikita (not blocking)

Latest code and the Studio source, which brand elements he means, cover art
direction, which motion tokens, styled-components vs the shadcn layer in
master, how the agent should appear at start, the rest of his list.
