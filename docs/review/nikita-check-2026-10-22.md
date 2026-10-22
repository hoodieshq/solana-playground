# Nikita's feedback checked against the product, 22.10.2026

What I checked: branch `almaz/tutorial-in-product`, commit `5ee06779` (during the check another session committed it into the same worktree, the page reloaded once from HMR, and the code didn't change after that). Product at `http://localhost:3001/#app`, headless Chromium (Playwright 1.62) with fresh profiles: desktop 1440×900 and phone 390×844. The build is real, through the Foundation server, 2 to 5 seconds. Deploy and calls go through a Kora stub. That's a decision, not a bug.

Runs:

- desktop A: Start here, steps 1 to 4 via Write it for me, quiz with a wrong answer on key 2, Reject, request again, Apply, Undo patch, the I'm stuck ladder, first build with an error, Fix with assistant, Open in editor, Esc and Enter, deploy, client, step 4, Call hello on the finish screen, Interact, Open the project, gallery;
- desktop B: writing it myself, missing `;` after `use anchor_lang::prelude::*`, Fix with assistant, manual fix, an edit after a successful build, reload in the middle of step 2 and with a pending patch, steps back and forward, step 3 by hand;
- desktop C: step 1 by hand, Skip on step 3, step 4 by hand, finish with a skipped step;
- phone: menu, Start, Chat and Code, quiz with Skip, patch, build, fix, deploy, Write it on a computer, Copy link, Undo patch, Read the page, client, step 4, finish, Call hello.

Screenshots are in `/private/tmp/claude-501/-Users-almaz-zaripov-Documents-Claude-Code-Playground/21384be8-c2d0-460c-b07a-7289641fcc14/scratchpad/shots/`, below I only give file names. Prefix `d` means desktop A, `b` desktop B, `c` desktop C, `p` phone, `e` other checks.

What can't be checked locally: Studio (Annotate, Viewport) only exists on the stand. I didn't open the stand and didn't touch the password. A real chat with a model can't be checked without a key. Task statuses in Linear aren't about the code.

Statuses: ✅ done, ⚠️ partly, ❌ no, ➖ outside the tutorial or intentionally not doing it.

## Shell and functionality

**Comments via Agentation.** ⚠️ It's in the code: `stand/build.sh:12-18` puts Studio with `annotate.js` on the stand. There's no Studio locally (`e03`, not a single Studio element in the DOM). I didn't check it on the stand with my own eyes.

1. **Wrong logo.** ✅ The sidebar has the ▷O lockup with the Solana Playground wordmark, and so does the phone menu (`d01-tutorials.png`, `p01-menu.png`).
2. **Brand icons are gone.** ✅ The Home, New project, Tutorials, Programs icons are in place in the sidebar and the phone menu (`d00-home.png`, `p01-menu.png`).
3. **Brand elements are gone.** ✅ Grid background, Start here banner on the pattern, the mark on the finish screen (`d01-tutorials.png`, `d22-step4-built.png`).
4. **Chat is gone.** ✅ Chat is open next to the code from the first screen, Opus 5.5 and High in the composer (`d03-step1-open.png`).
5. **No target actions.** ✅ The step band has a button that proves the step: Build, Deploy to devnet, Run the client, Rebuild after an error (`d03`, `d18`, `d20`).
6. **No text buttons for WCAG.** ✅ Copy and Open in Explorer are text, the step icons have `aria-label` (Previous step, Next step). I found no visible buttons without a name (script `e6.js`, everything it found without a name sits under `visibility: hidden`).
7. **The agent doesn't show up at the start.** ✅ On desktop the chat is open and greets you right away with the step description and two paths (`d03`). On the phone the tutorial opens on Code, the greeting is in the neighboring Chat tab (`p02-step1.png`, `p03-chat.png`).
8. **Cover art on brand.** ✅ Covers are built as brand tiles: background by framework, white mark (`d02-covers.png`, `e01`). Small thing: some covers only have the triangle, while the Styleguide asks for the full mark (`TutorialCover.tsx`, `PLACES`).
9. **The author disappeared.** ✅ "by acheron" in the banner, and "by acheron" on the tutorial page as a link to Twitter (`e09-seahorse-from-counter.png`).
10. **No way to move between steps.** ✅ Back and forward arrows in the band: from step 3 to 2 and back (`b08-step-back.png`), on the phone they're in the bottom bar (`p02-step1.png`).
11. **No AI agent settings.** ✅ The chat menu has Sources and tools, Connect a model, Clear conversation (`e04-chat-menu.png`); the Connect a model window has backend, model, effort (`d10-typed-request.png`). The general Settings have no assistant section (`e03-settings.png`).
12. **Unclear how to connect models.** ✅ "Connect the assistant" in Get set up, an item in the chat menu, and a free-form message without a model opens Connect a model (`d10-typed-request.png`).
13. **One mobile breakpoint, bring back the size tools.** ⚠️ Viewport only exists in Studio on the stand (`stand/build.sh:12-18`), can't check it locally.
14. **No navigation to the menu on the phone.** ✅ The burger in the header opens the menu as a full page (`p01-menu.png`).
15. **No full AI chat.** ✅ It's the same product chat with model, effort, chapters; without a key the tutorial script answers, anything else leads to Connect a model. I didn't test a conversation with a live model.
16. **No switching between code and preview.** ✅ On the phone, Chat and Code in the header and ▶ for the preview (`p02-step1.png`, `p07-preview-deploy.png`); on desktop, the Write, Build, Deploy, Interact stages.
17. **No help when you're stuck.** ⚠️ I'm stuck with a hint ladder and Skip this step are there (`d11-stuck-ladder.png`). Step 3 has no I'm stuck at all (the step's type is read, `ObjectiveBand.tsx`, `help = !isRead && ...`).
18. **No start from scratch.** ✅ New project in the sidebar and on Home (`d00-home.png`).
19. **DS animations aren't used.** ⚠️ Everything uses `cubic-bezier(0.2, 0, 0, 1)` from Nikita's branch (`Finish.tsx:196`, `StartHere.tsx:175`, `ObjectiveBand.tsx:432`), not Press 200 ms and Rise 620 ms from Styleguide v1. The Write it on a computer sheet and the receipt appear with no motion. Reduced motion is handled.
20. **Couldn't find how to open files.** ✅ Files tab with a tree and New file (`d26-files-tab.png`). Right click gives New File, New Folder, Rename, Delete (`b15-context-menu.png`). In the first version of this report I wrote that you can't delete: that was a bug in my script.
21. **"..."** ➖ No item, nothing to check.

**Task statuses in Linear.** ➖ Not about the code.

## QA against the checklist

1. **Two paths, diff in the file with notes, Apply, Discard, Undo.** ⚠️ The diff in the open file is there (`d05-patch-proposed.png`), Apply, Reject and Undo patch work (`d07`, `d08-undone.png`). There are no notes on the changes in the file, just one sentence in the chat (`patch-preview.ts`). The patch to `client/client.ts` isn't visible in the file, because the file isn't open and doesn't exist yet (`d21-client-patch.png`).
2. **You write it yourself, the assistant explains your error.** ✅ Fixed after the check. Before: for a missing `;`, Fix with assistant replied with a canned answer about `Hello` and an empty `+0 -0` patch (`b02-fix-with-assistant.png`). Now: the step fix is only for the step's own error (E0412 on `Hello`), anything else gets an answer built from rustc's words: "The build stopped at src/lib.rs line 1: expected ;, found declare_id", the rustc hint, and a patch of exactly one line with the `;`. After Apply and Rebuild the step passes (`h01-semicolon-explained.png`). The planned error on the Write it for me path is explained as before, without "as expected" (`h10-planned-path.png`).
3. **Phone: code is read-only, link for a computer, Copy.** ✅ "On a computer" next to the patch, "Write it on a computer" in the band, a sheet with the link `beta.solpg.io/t/hello-anchor/3`, Copy link puts it on the clipboard (`p03-chat.png`, `p08-toast.png`).
4. **Comprehension question.** ✅ On steps 1 and 4, three answers, keys 1/2/3 work even with focus in the empty composer, Skip and show the code (`d04-quickcheck.png`, `p03-quickcheck.png`). After a reload the question isn't asked a second time.
5. **First build fails, Explain, Review the fix, click on a compiler line.** ⚠️ The build really fails, 4 errors (`d12-first-build-failed.png`). Explain and Review the fix are replaced by a single Fix with assistant button, which explains and offers a fix right away (`d17-fix-proposed.png`). Open in editor doesn't put the cursor on the line at all, doesn't switch to Write, and opens a second tab `/Hello Anchor/../src/lib.rs` (`d14-open-in-editor.png`, `d31-dup-tabs.png`, `stages/Build.tsx:319-322`). On the phone the pending fix is scrolled into view (`p05-fix-in-code.png`), that's fixed.
6. **Deploy via Kora, cards, tap targets on the phone.** ✅ 0 SOL, Program id with Copy and Open in Explorer (`d20-deployed.png`). On the phone Copy is 48×48, Open in Explorer 65×73, Interact 84×48 (measured in `p6.js`).
7. **Lesson as a sheet on the phone, as a column on desktop.** ✅ Read the page on the phone opens over the code (`p11-read-page.png`), on desktop as a dialog over the editor.
8. **Hotkeys, Esc doesn't leave the editor.** ✅ Click on a line, Esc drops focus (active element is BODY), Enter after that doesn't change the code (`d14`, `s16.js`). 1/2/3 work. ⌘B in the product collapses the sidebar (that's how Nikita has it, `Flow.tsx:318`), it doesn't start a build.
9. **Status in the gallery.** ✅ Check mark and "Completed" on a finished one (`d27-gallery-done.png`), "3 of 4" and "Pick up where you left off" on a started one (`e01-gallery-inprogress.png`).
10. **Finish, first try counts against the learner.** ✅ First try is removed along with the time. What's left: steps proved, skipped, 0 SOL, receipt, what you learned, what's next (`d23-finish-called.png`). The spec (item 8) promises first try and time, and they aren't there.

## Other problems

1. **Code gets broken, an edit after a build isn't checked.** ✅ Esc and Enter don't touch the code. An edit after a successful build resets Build, the band shows Build again instead of Deploy, and on the Deploy stage the button is disabled with the hint "Build successfully first" (`b05-edit-after-pass.png`, `b06-deploy-after-broken.png`). Broken code can't be deployed. The step 1 check mark stays, though.
2. **Step 4 contradicts itself.** ⚠️ The call with a name is there on the finish screen and in Interact, the program is upgraded before the call (a second entry in Deploy, Upgrading in the terminal), the receipt shows `hello("Nikita")` and "Hello, Nikita!" (`d23`, `d25-interact.png`). But `client/client.ts` still calls `hello()` with no argument (`d26-client-ts.png`), step 4 counts as done after one build, and the finish screen says "Hello Anchor is live on devnet" before the redeploy, the string is hardcoded (`lessons/Finish.tsx:81`).
3. **Toasts on the phone cover the header.** ✅ No toasts left in the tutorial: Copied shows on the button itself, Undone in the patch card (`p08-toast.png`). The general toast on the phone is raised above the bottom bar (`components/Toast/Toast.tsx:41-58`).
4. **Wrong logo in the sidebar.** ✅ ▷O lockup (`d00-home.png`). The circle with play is only left as the assistant avatar and on the phone's Home above the question (`p00-home.png`).
5. **Small things.**
   - Discard and request again, old "Not quite" still on screen. ✅ There's no separate feedback panel, after Reject the guide says "Left it as it was" and offers Write it for me again (`d06-rejected.png`).
   - Chips disappear after first use. ⚠️ After Reject and after a hint, Write it for me comes back (`d11`). But after Undo patch there's no chip, and you can only repeat the patch by typing (`d08-undone.png`, `turnAppliedApproval` in `Chat.tsx:314`). After a system note in the chat on the phone, both Write it for me and On a computer disappeared (`p13-chat-step3.png`). On step 2, Write it for me leads to the Connect a model window (`d19-step2-writeforme.png`).
   - The answer to the question repeats the note in the code. ✅ There are no notes in the code, the quiz answer and the patch sentence are different (`d05`).
   - Click below the code doesn't focus, no auto-indent. ✅ A click below the code puts the cursor at the end, Enter after `{` gives a 4 space indent (`s16.js`, `b3.js`).
   - Phone: long lines in the lesson and terminal are cut off. ⚠️ The terminal wraps (`p07-preview-deploy.png`). In Read the page the code is still cut off on the right, `pre` scrolls sideways instead of wrapping (`p12-lesson-pre-cut.png`). Lines in the patch card also run off the edge (`p03-patch.png`).
   - Inconsistent labels, no Open the project on the phone. ⚠️ The phone finish screen has Open the project (`p15-finish-bottom.png`). The deploy history link still says "Explorer", while the card next to it says "Open in Explorer" (`stages/Deploy.tsx:240`, `d20-deployed.png`).
   - Tic-tac-toe. ✅ "Tic-tac-toe Seahorse" in the gallery (`e1.js`).

## What to keep

1. **Two paths on every step.** ✅ After the fix, step 3 by hand passes too, see "Beyond the list", item 2.
2. **Comprehension question.** ✅ See QA 4.
3. **The planned first error.** ✅ Real build, real error (`d12`). The first card is E0432 about `__client_accounts_hello`, and the clear E0412 only comes second.
4. **Handoff from phone to computer, does it work without a login.** ➖ The link is a stub, there's no login, by decision this is a prototype. But the sheet copy promises "Your progress comes with you" (`lessons/Handoff.tsx:126`), and without sign-in that isn't true.
5. **Cards after deploy and after the client.** ⚠️ There's a card after deploy. After Run the client there's no card, just a chat message and the terminal (`d21-client-ran.png`). The receipt with Copy and Explorer appears after the call with a name.
6. **Stats at the end, achievements needed.** ✅ Stats are there. No achievements ➖.

## What's missing compared to the previous version

1. **Account.** ➖ That's the product, not the tutorial. The menu is there: Sign in with GitHub, Settings, Docs, Report a bug, Connect wallet (`e02-account-menu.png`). There's no sign-in, yet the "progress comes with you" promise is still there (see above).
2. **Interact.** ✅ Form from the IDL: `hello`, a `name: string` field, Call hello via Kora, a receipt with instruction, fee, compute, slot, signature, logs and a demo label (`d25-interact.png`).
3. **Who's answering.** ✅ Opus 5.5, High and "Nothing is written to your project without your click" under the composer on every chat screen (`d03`, `p03-chat.png`). Without a model, a message opens Connect a model instead of "not connected".
4. **Statuses, DES-126.** ➖ The Devnet indicator with a dot is in the sidebar. AI and analyzer statuses belong to the whole product.
5. **Help and navigation.** ✅ I'm stuck, hints, Skip this step, step arrows, locked steps labeled locked in the list (`d03`). Exception: step 3 has no I'm stuck.
6. **Files.** ✅ src and client tree, lib.rs and client.ts tabs side by side (`d26-files-tab.png`, `d30-undo-after-build.png`).
7. **Before and after the tutorial.** ➖ Mostly product. Home, New project, Programs and saved projects open fully (`e02-programs.png`, `e02-counter.png`), Get set up and Settings are in place. Sharing DES-123 and the badge DES-135/140 are product work.
8. **Errors, DES-124.** ➖ Product. In the tutorial, the program closing after 7 days is only mentioned in text on step 2.

## Beyond the list

1. **Another tutorial wouldn't open from inside Hello Anchor.** ✅ Fixed. Before: Up next → Start changed the URL and the header, but the screen kept showing the Hello Anchor finish, chat and steps (`e10-up-next.png`, `e08-seahorse-reload.png`). Now: the Counter PDA Tutorial page opens with the author and Start, with no Hello Anchor finish or band; Start launches Counter PDA; going back to Hello Anchor shows its finish again (`g01-upnext-fixed.png`, `g02-counter-pda-started.png`). The chat on another tutorial's page still shows the active project's thread, which is how the product behaves with regular projects too.
2. **Step 3 by hand: dead end and a broken project.** ✅ Fixed. Before: there was no `client/client.ts`, New file created `src/client/client.ts`, Run the client didn't see it, and the build failed with "Invalid path" (`b11-created.png`, `b14-finish-selfwritten.png`). Now: on step 3 `client/client.ts` is created and opened, the way upstream page 3 did it (`h02-step3-client-created.png`); a call written by hand passes Run the client; if the call is in a different `.ts`, the terminal says where to move it (`h09-call-elsewhere.png`); `.ts` in `src/` no longer goes to the build server, and the project from `b14` now builds.
3. **A build right after an edit picks up the old text.** Autosave waits 500 ms (`components/Editor/Monaco/Monaco.tsx:450-470`, Slava's code). I fixed the `;` and hit Rebuild right away: the server got the line without the `;` and failed again, the second Rebuild passed (`b03-self-fixed-built.png`, `b04`).
4. **Undo of the step 1 patch while on step 3.** Undoing the fix silently removes `struct Hello`, the steps stay passed, the build resets (`p10-code-top.png`). The learner is on step 3 with a program that doesn't build, and nobody tells them.
5. **I'm stuck shows the internal prompt.** The chat has a bubble from the learner: "Hint 1 of 3. I am on this lesson step… Name no API and show no code." (`d11-stuck-ladder.png`).
6. **Finish and skipping.** With step 3 skipped, "What you learned" still lists "Calling a program from TypeScript" (`c01-finish-skip.png`). In the gallery banner a skipped step gets the same check mark as passed ones and counts toward "3 of 4" (`e01`, `lessons/summary.ts:34-36`).
7. **On the phone, Call hello on the finish screen takes you to the Deploy page.** An upgrade runs before the call, the preview opens with Deploy and the terminal, and the receipt stays on the finish screen, off screen (`p15-finish-receipt.png`).
8. **Chat jumps to the top after Skip this step.** After Skip on step 3 the chat is scrolled to step 1 (scrollTop 0 of 1986).
9. **Copy.** After Reject on step 3 the guide says "press Build", but it should be Run the client (`lessons/guide.ts:64-65`). The step 3 band says "Not machine-checked" with a double hyphen, even though the step is now checked by running the client (`lessons/band-copy.ts:22`). The handoff sheet has "typescript client" in lowercase. The deploy terminal has the line "$ Writing buffer…" with an extra `$`.
10. **Styleguide in the old product buttons.** Build in the chat, Continue to Deploy, Fix with assistant are filled with `#9945FF` at rest; the Styleguide asks for `#8A3FF5` under white text, and a gradient ring for Build (`ChatItem.tsx:87-96`, treptsov's code). Not part of the tutorial, but it stands out next to the tutorial's buttons.
11. **Phone, Deploy.** The terminal covers half the deploy card, and in the history the date and id break into a column (`p07`, `p15-finish-receipt.png`).

## What to fix, by priority

1. ~~Explaining an error without a model~~ fixed 22.10.
2. ~~Step 3 by hand~~ fixed 22.10.
3. ~~Up next and Open of another tutorial from inside Hello Anchor~~ fixed 22.10.
4. Open in editor: jump to the error's line and column, switch to Write, no second `../src/lib.rs` tab.
5. Step 4: update the client for `hello(name)` or remove the call from it, count the step after the call with a name, don't say "live on devnet" before the redeploy.
6. Chips: Write it for me after Undo patch and after a system note; on step 2 don't show Write it for me that leads to Connect a model; bring I'm stuck back to step 3.
7. Build before autosave: save the file before Build.
8. Phone: wrap lines in Read the page and in the patch card; Call hello on the finish screen without going to Deploy.
9. Copy and labels: Explorer in the deploy history, "Your progress comes with you", "press Build" on step 3, "Not machine-checked", the bubble with the internal prompt in I'm stuck.
10. Finish with a skipped step and the gallery banner: don't count a skipped step as learned and passed.
11. Motion from Styleguide v1 (Press, Rise) in the new parts of the tutorial, notes on changes in the in-file diff.

## Fixed after the check (22.10)

Items from "What to fix" above, verified with an end-to-end run in headless Chromium:

1. Explaining someone else's error without a model: rustc retold plus a one-line patch, no "as expected".
2. Step 3 by hand: `client/client.ts` is created when the step opens, `.ts` in `src/` doesn't break the build.
3. Up next and Open of another tutorial open the chosen tutorial.
4. Open in editor: switches to Write, cursor on the error's line and column, no second tab.
5. Step 4: after the `lib.rs` patch, a second patch for the client with `hello("Solana")`, Run the client understands the call with a name, the finish screen says "live on devnet" only after the redeploy.
6. Chips: Write it for me after Undo patch and after a system note, not on step 2, and step 3 has I'm stuck.
7. Before a build, text from the editors is flushed to files, so a build right after an edit picks up the new code.
8. Phone: lines wrap in Read the page and in the patch card, Call hello on the finish screen stays on the finish screen.
9. Copy: Open in Explorer in the deploy history, "press Run the client" on step 3, "Verified when" on the step that runs the client, "Not machine-checked." without the double hyphen, the I'm stuck bubble reads "I'm stuck, hint 1 of 3", the handoff sheet has the step capitalized and an honest "Sign in with GitHub on both".
10. Skipped step: "skipped" in the gallery with no check mark and not counted, no check mark in What you learned on the finish screen.
11. The receipt appears with Rise from the Styleguide (620 ms).
