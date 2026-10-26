# Zoom: sync before the customer presentation (2026-10-23)

**Source:** Zoom call, Sergey Prokhorov, Almaz Zaripov, Grigory Samoylov, Slava,
about 45 minutes before the presentation to the customer (Cat). The transcript
labels Slava's first lines as "Speaker 1" and Grigory leaves early for another
meeting. Raw: `solana-playground/.claude/intake/raw/2026-10-23-zoom-pre-pitch-sync.md`
(local). Read alongside: intake 2026-10-22-slack-nikita-product-specs,
2026-10-19-slack-grigory-almaz-design.

**Decided**

- Order of the presentation (Grigory, Sergey, Almaz agreed):
  1. Walk through Linear and a two-minute update on what was done; everyone
     checks their own tasks are current first. (Grigory.)
  2. Slava shows the current state in production: the model connects, sign-in
     works, feedback is sent, projects load. (Sergey.)
  3. Cat gets the deployed version to poke at; Grigory invited Jonus to look at
     the new designs. (Grigory.)
  4. Almaz presents the new design as research and a possible V2, without
     pushing for it now: what we can take from it. 5–7 minutes, cut to the pace.
     (Grigory; Almaz: "we looked at the current flow and have ideas".)
- The version in production is not touched; all changes stay in branches, and
  what moves next is decided after the demo. (Sergey.)
- No sharp moves before Breakpoint; discuss with the customer the minimum scope
  that is feasible. (Almaz, Grigory.)
- Next week is the last working week before Breakpoint (early November); after
  it, release prep, critical bugs, testing. (Slava, Almaz.)

**Requirements changed**

- Tutorial screen: four columns → two areas of 604 px (lesson + assistant on
  the right, code on the left); tutorials in three levels; on a phone, no
  hand-written code. Proposed in the 23-slide deck, not agreed as scope.

**Facts learned**

- A new version went to production this morning; polish on top of the new
  face deploys continuously. (Sergey, Slava.)
- "Share feedback" sits under a click on the user's name in the sidebar, which
  is not obvious. (Sergey.)
- The deck shows the 4-part progress in five places. (Almaz.)
- Feasibility (Sergey): everything looks feasible except the blocks of the
  "Write with assistant" step where the user chooses where code goes; unclear
  whether the assistant generates them or each lesson needs markup.
- The Write, Build, Deploy and Interact tabs are not the tutorial steps: they
  are the developer's flow, and IDL upload and interact with a program stay
  there. The deck leaves IDL out; the customer should hear it is not being cut.
- Fitting the redesign before Breakpoint means cutting something, for example
  Anchor 1.1.2 support (stay on 0.29), which is odd that close to Breakpoint.
  (Sergey.)
- Slava expects to be on UI and UX most of next week and says someone must
  take the rest of the scope: infrastructure, deploys, Anchor 1.2, which is
  not moving much. Sergey agrees and is approaching Anchor, but is pulled
  elsewhere and cannot be full-time. An extra engineer from the customer's
  side was approved earlier in principle; Grigory keeps it as a card to play
  only if Cat asks to go faster.
- Cat describes Playground as a test ground; the Foundation may lose interest
  after its docs launch, so no big push. (Grigory.)
- Whether Almaz works on Playground is decided by today's presentation.
- The design system was a draft and does not match the prototype; our master
  now carries the one closest to the prototype. Almaz's team evolves it in
  parallel with versions. (Slava, Almaz.)
- Slava will share an issue with his audit of the project's current state:
  design, specs, prototypes and design system, with gaps and inconsistencies.

**Open questions**

- What is cut or slipped if the redesign is taken before Breakpoint, and what
  does Slava propose to Cat?
- How does the "choose where to insert code" block get its data?
- One repository for the design system and the feature work, and how to sync?

**Actions**

1. Before the call, bring Linear current for every open task (Grigory's ask).
2. Prepare Slava's four-line talk of the current state and the line on the IDL
   flow, so nothing is heard as cut.
3. Plan the choice "redesign vs Anchor 1.2 / other scope" before Breakpoint
   and who covers infrastructure, deploys and Anchor next week.
4. Share Slava's audit issue; settle the design system's home with Almaz.
5. Decide whether "Share feedback" gets an easier entry.
