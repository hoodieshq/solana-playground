# Slack: product specs for every flow, design tasks to Almaz (2026-10-22)

**Source:** Slack thread on the tutorial design, Nikita Treptsov to Almaz
Zaripov and Grigory Samoylov, 2026-10-22 18:11–18:15. Raw:
`solana-playground/.claude/intake/raw/2026-10-22-slack-nikita-product-specs.md`
(local). Read alongside: intake 2026-10-19-slack-grigory-almaz-design,
2026-10-21-slack-almaz-tutorial-prototype. The specs index (Hoodies' Linear,
document "Product specs: index and open decisions") is not readable from
this machine's Linear connection, which reaches the Foundation workspace only.

**Decided**

- Product specs for every flow are the reference for checking design: what a
  flow must do, its states, its texts and what happens on a phone. Each spec
  has a QA section with scenarios. (Nikita.)
- All design tasks before Breakpoint are Almaz's. Grigory is tagged on each
  and owns the dates and the client sign-off. (Nikita.)

**Requirements changed**

- Design task owner before Breakpoint: Nikita → Almaz.

**Facts learned**

- 17 specs, written with Claude from the existing product, the prototype and
  the development docs, reviewed by Nikita, open to comments: 01 Tutorial
  (DES-139), 02 Account, sign-in and profile (DES-119, DES-140), 03 Deploy
  and Interact (DES-120), 04 Program Pal (DES-122), 05 GitHub sharing
  (DES-123), 06 First run, Home and statuses (DES-126), 07 Settings
  (DES-128), 08 Errors and empty states (DES-124), 09 New project from
  scratch (DES-155), 10 Open a program and import code (DES-156), 11
  Projects and files (DES-157), 12 Wallet and devnet SOL (DES-158), 13
  Terminal and commands (DES-159), 14 Landing (DES-114), 15 Mobile without
  code (DES-142), 16 Analytics, 17 QA plan.
- The specs are attached on the Hoodies design project's landing page.
- Several specs cover flows our client-v2 tickets are building now: 01 ↔
  HOO-2076 lesson frame and HOO-2072 tutorial page; 06 ↔ HOO-2063 Home and
  HOO-2075 Get set up; 07 ↔ HOO-2071 Settings page; 08 ↔ HOO-2072 and
  HOO-2100 failed-click message; 09 ↔ HOO-2068 New project; 12 ↔ HOO-2074
  wallet; 15 ↔ the I Mobile milestone.

**Open questions**

- Where a spec and a merged or in-flight client-v2 ticket disagree, which one
  moves? Nikita: "если что-то не сходится с реальностью, пишите, поправим".
- Do the specs' QA scenarios feed our testing (TESTING.md, e2e), or stay
  design-side?

**Actions** (Slava, 2026-10-26: Linear access is settled, the rest goes to the
Design alignment session as a current task)

1. ~~Get the specs readable here~~ Dropped: Slava has connected both Linear
   workspaces (Foundation and Hoodies); no action.
2. Design alignment: check the in-flight client-v2 tickets above against their
   specs and send Nikita the mismatches as comments on the specs.
3. Design alignment: decide whether spec QA scenarios become test cases on our
   side (TESTING.md, e2e).
