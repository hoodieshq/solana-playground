# Slack: where Almaz's tutorial prototype lives; master-2.0 mirrors master (2026-10-21)

**Source:** Slack thread, Almaz Zaripov, Sergey Prokhorov, Slava, evening of
2026-10-21. Relayed as a summary with quotes by the session "NEW - PR32
Redesign rebase" on 2026-10-22; not the verbatim thread. Raw:
`solana-playground/.claude/intake/raw/2026-10-21-slack-almaz-tutorial-prototype.md`
(local). Read alongside: hoodieshq/solana-playground#120, intake
2026-10-20-slack-new-face-to-master (its target question).

**Decided**

- Almaz's tutorial prototype (phone and desktop) is a reference, not code to
  merge: it lives in `almaz/tutorial-prototype` in hoodieshq/solana-playground,
  cut from `master-2.0`, and dies with the branch. The developers build the
  real screens on the design system's components. (Almaz, Sergey.)
- A branch that is not meant to merge gets an issue naming the branch, not a
  PR. ("я не оч люблю ПРы, которые по-умолчанию не должны быть смержены" —
  Sergey; Almaz followed it.)
- `master-2.0` is treated as a mirror of solana-foundation `master`. (Sergey.)
- Design-system changes found while prototyping go into the main code;
  Almaz's design-system findings go to DES-129. (Sergey, Almaz.)

**Requirements changed**

- Prototype delivery: a draft do-not-merge PR into `saving-chats-history` →
  a branch off `master-2.0` plus an issue (#120).

**Facts learned** (gh and git, 2026-10-22 14:36)

- Sergey merged `master-2.0` into solana-foundation `master` the week of
  12 Oct; the design system is now in that master under `design-system/`.
  Today the two branches are identical (0 commits apart).
- Slava ran the reconciliation the same day: nothing from `master-2.0` was
  left out of solana-foundation `master`.
- `almaz/tutorial-prototype` is 187 commits ahead of `master-2.0`, 98 files,
  additions only (prototype under `design-system/src/prototype/tutorial`,
  two design specs dated 20 and 21 Oct). Issue #120 "Tutorial flow
  prototype, phone and desktop (reference branch)", open, by Almaz; the
  stand is behind a password.
- PR #32 "Redesign client-v2: one chrome, a settings page, and a landing"
  (`saving-chats-history` → `master`) is open and is what brings the design
  system into client-v2 (Almaz).

**Open questions**

- With `master-2.0` = solana-foundation `master`, does the new-face → master
  PR go to solana-foundation `master` directly (question 2 of the 20 Oct
  entry)?

**Actions**

1. Add to Lead's row `2026-10-20-new-face-to-master-pr`: `master-2.0` mirrors
   solana-foundation `master` (Sergey), the two are identical today.
2. Point the tutorial-flow tickets (HOO-2076 lesson frame, HOO-2072 tutorial
   page) at issue #120 as the design reference.
3. Put "a branch not meant to merge gets an issue, not a PR" in the fork's
   PR conventions, with Slava's yes.
   Slava confirmed the rule 2026-10-22 16:20 and applied it to open PRs:
   PR #70 (HOO-1753, the ai SDK transport verdict, a draft into
   `master-2.0`) becomes an issue and the PR is closed.
