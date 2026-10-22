# Nikita's feedback (Slack, 21 and 22.10.2026), translated from Russian

Transcribed from screenshots of the Slack thread. Nikita's own wording, not a summary.

## First reaction: shell and functionality

Why did the commenting tools disappear? I'd like to keep the option to
leave comments through Agentation, it's easier than screenshotting
everything and putting together a separate document with pictures.

1. The wrong logo is used. Right now it's a button, not a logo in the header.
2. The brand icons are gone. This is a set that needs to be developed and
   extended further, not removed.
3. The brand elements are gone.
4. The chat is gone.
5. Target actions are missing.
6. No text buttons for WCAG compliance.
7. The agent doesn't show up at the start.
8. The cover art needs to be updated to match the brand.
9. The tutorial author disappeared. That's a problem for community building.
10. The tab layout on desktop is convenient, but we lost the ability to move
    forward and back between steps, and that was one of the key ideas.
11. No AI agent settings, plus part of the existing functionality is lost.
12. It's not quite clear how to connect models and work with them.
13. Why are we only looking at one mobile breakpoint? Bring back the tools
    for viewing different sizes.
14. On mobile there's no navigation to the main menu.
15. No full AI chat.
16. No switching between the code tab and the preview tab.
17. No help for situations when the user is stuck.
18. No option to start from scratch.
19. The animations from the DS aren't used.
20. Couldn't find options for how to open files.
21. ...

Go through all the functionality that should be available to the user
while going through the tutorial, and check the current version against
this list. The visual updates are great in a lot of ways, but first all
the necessary functionality has to be in place.

Also, I don't see status changes (screenshot of the task list in Linear).
If they won't be used, say so.

## QA against the checklist

1. ✅ Two paths on every step: diff right in the file with notes, Apply and
   build, Discard, Undo patch.
2. ❌ You write it yourself on desktop, the assistant explains your specific error.
   It highlights the line correctly (I deliberately left out a semicolon).
   But the error text is generic: "Your code doesn't match what this step needs".
   Explain doesn't say a semicolon is missing. Review the fix
   compares against the reference solution, so indentation shows up as changes on 5
   lines, and the real fix gets lost in them.
3. ✅ On the phone you only read the code, Write it yourself gives a link for the
   computer. Copy works too.
4. ✅ Comprehension question before the patch, three options, you can skip it. It's on
   steps 1 and 4. Step 3 has no question.
5. ✅ The first build fails on purpose, Explain, Review the fix, click on a
   compiler line. The click puts the cursor on line 9, column 5, not 30.
   On the phone the fix ends up below the visible area.
6. ✅ Deploy via Kora for 0 SOL, Program id and transaction cards with Copy and
   Explorer. On the phone the icons are about 16 px, below the 44 px minimum.
7. ✅ The lesson is a sheet on the phone, a column on desktop, it collapses after the
   step.
8. ❌ Hotkeys. 1/2/3, S, ⌘Enter, ⌘B and Enter work. Esc doesn't always leave
   the editor.
9. ✅ Status in the gallery: check mark on a finished one, "3 of 4" on a started one.
10. ✅ Final screen: stats, last transaction, what you learned, what's
    next. But "first try 3/4" counts the planned error against the
    learner.

## Other problems

1. ❌ The code gets broken. I clicked on a compiler line, then Esc and Enter. Esc didn't
   leave the editor, Enter inserted a line break into the code. The step stayed
   "passed", the broken code got deployed and carried over into step 4. Nobody
   re-checks an edit after a successful build.
2. ❌ Step 4 contradicts itself. hello now takes name, but the client
   still calls hello() with no argument, and nothing was redeployed. Meanwhile
   the final screen says "live on devnet" and shows the transaction from
   step 3.
3. ❌ Toasts on the phone cover the header, including the back and
   close buttons. For example "Link copied", "Patch undone", "Only Hello Anchor is in
   this prototype".
4. ❌ Wrong logo. The sidebar has the play circle. The logo should be
   a triangle plus a circle.
5. ❌ Small things:
   - After Discard and a repeated request, the old "Not quite" feedback stays
     on screen.
   - The assistant chips disappear after first use.
   - The answer to the question repeats the note in the code word for word.
   - Clicking the empty space below the code doesn't focus the editor,
     there's no auto-indent.
   - On the phone, long lines of code in the lesson and in the terminal are cut off.
   - Labels differ between screens ("Explorer" and "Open in Explorer"). The
     phone's final screen has no "Open the project".
   - It should be "Tic-tac-toe", not "Tictactoe".

## What's better in the prototype than the original, keep it

1. Two explicit paths on every step.
2. The comprehension question.
3. The planned first error.
4. Handoff from phone to computer (but does it work without a login?).
5. Cards after deploy and after the client.
6. Stats at the end (stats will need achievements).

## What's missing compared to the previous version

1. ❌ Account. No Sign in with GitHub, no profile, no account menu
   (Settings, Docs, Report a bug, Connect wallet). Write it yourself promises
   "your progress comes with you", and without sign-in that can't work.
2. ❌ Interact. We have Write → Build → Deploy → Interact, with forms from the IDL.
   Here everything ends with a client script, you can't call the program from
   the interface.
3. ❌ Who's answering. In ours you can see the model (Opus 5.5, High) and it says "Nothing
   is written to your project without your click". DES-122 requires this on
   every AI surface. The free-form chat here answers "not connected".
4. ❌ Statuses. No Devnet indicator, no network, AI or analyzer status
   (DES-126).
5. ❌ Help and navigation. No "I'm stuck", hints, Skip this step,
   moving between steps, no locked steps in the list.
6. ❌ Files. One file per step and no file tree, so you can't see lib.rs and
   client.ts together.
7. ❌ What comes before and after the tutorial. Home, New project, Programs and
   saved projects answer "Only the tutorial flow is in this
   prototype". No start screen, no "Get set up" checklist, no sharing
   (DES-123), no badge at the end (DES-135/140) and no settings.
8. ❌ Errors. Apart from the first build, nothing fails: no rate limit, captcha,
   program closed after 7 days, no empty states (DES-124).
