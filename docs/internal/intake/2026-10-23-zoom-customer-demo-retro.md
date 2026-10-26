# Zoom: customer demo and internal retro (2026-10-23)

**Source:** Zoom call 2026-10-23, 16:00 Berlin. Part 1: demo to the customer
(Cat, Jonas Hahn) by Grigory Samoylov, Sergey Prokhorov, Almaz Zaripov, Slava
(Slava's own opening is missing from the transcript). Part 2: internal retro
and next steps without the customer. Raw:
`solana-playground/.claude/intake/raw/2026-10-23-zoom-customer-demo-retro.md`
(local, abridged). Slava's framing: a demo is held every Friday and he sends
the customer a short summary afterwards. Read alongside: intake
2026-10-23-zoom-pre-pitch-sync (the call before this one),
2026-10-22-slack-nikita-product-specs.

**Decided**

- A second round with Cat and optionally Jonas on Tuesday 27 Oct, 16:00
  Berlin; Grigory sets up the meeting with Cat. Almaz brings a second desktop
  attempt. (Almaz proposed, Grigory agreed.)
- Almaz continues on Playground through Tuesday; whether longer depends on
  Cat's answer on Tuesday. Grigory asks Nastya (SDP) about Almaz's load for the
  second half of next week. (Almaz, Grigory.)
- Internal sync on Monday 26 Oct (Sergey, Grigory, Slava, Almaz; Grigory also
  wants Alexander Nikeev for the backend). (Sergey proposed, Grigory agreed.)
- Slava sends Cat a short digest of the call, with a link to the pull request
  that carries the new design (to be approved and merged into master) and the
  link to Almaz's deck. (Sergey proposed; Slava: "ссылку на pull request,
  который надо одобрить"; Almaz puts the deck link in the team chat.)
- Next week's commitment: keep improving "ARL" and bring the design to a
  polish; Sergey's pull request migrating to the SDK goes first. (Sergey,
  Grigory.)
- Future demos are prepared as hooks: first, second, third, with comments at
  hand; Slava prepares a demo for the pre-sync and runs it with the team.
  (Grigory; Slava agreed.)
- Grigory and Almaz will tell the customer on Tuesday that the new tutorial
  design needs more resources ("the elephant in the room"). (Grigory.)

**Requirements changed**

- Tutorial design direction (customer feedback, not final scope): step tabs
  with code-insertion buttons → a conversation-style, assistant-driven
  tutorial, like ChatGPT or Claude Desktop: chat on one side, results on the
  other; lesson steps possibly as assistant messages; the assistant asks
  before writing (as in the mobile flow). Almaz's second attempt follows this.
  (Cat; Jonas and Almaz agreed to try.)
- A file tree stays reachable inside a tutorial, small and simple (an arrow
  beside the lib file). (Cat, Jonas, Grigory.)

**Facts learned**

- Customer feedback on the 23-slide deck: the mobile flow landed best and is
  "where we are heading"; desktop felt a different, more complex flow and
  Cat warned two different flows may confuse; Cat and Jonas both picture a
  chat-driven interface; there are several entry points to the assistant and
  it is unclear how to get back to the lesson; the left navigation is not
  needed during a tutorial; Jonas doubts reading and copy-paste still suit
  learners (run, get a task, ask the agent, run again).
- Sergey's answer on interaction: IDL upload and a form generated from the IDL
  stay in the developer flow; a tutorial with several files gets a file picker.
- Team retro: the desktop opened first and was heavier than the simple flow the
  customer expected; showing a stripped-down interface made them think
  functionality (code view, interaction) was lost; the explanation of how it
  would work dragged. Slava's prepared failed build states went missing and he
  skipped the feedback section.
- Cat owns Playground, its budget and the decision on more engineers. Jonas
  led Playground before, handed it to Cat, stays on Explorer and still gives
  feedback. Jonas wants frequent small wins and picks at details; Cat is
  steadier.
- Nobody recorded notes on the call; the pasted transcript is the only record.
- Roles: Slava and Sergey full-stack, mostly front; Alexander Nikeev helps
  with the backend; Grigory everything on Playground. Almaz had no team
  intro and also works on the landing page, the design portal and SDP.

**Open questions**

- Which pull request is the one Cat gets to approve: for example
  [#32](https://github.com/hoodieshq/solana-playground/pull/32) Redesign
  client-v2: one chrome, a settings page, and a landing, or the new-face →
  master pull request?
- What "ARL" is in the transcript (garbled; probably the assistant).
- Slava's hanging question on tutorials: build to Nikita's spec for now, or
  hold the tutorial tickets until Tuesday? Prototype remains the target
  meanwhile.
- Does the "more engineers" request go to Cat on Tuesday as a concrete ask, and
  with what scope and who covers infrastructure, deploys and Anchor
  (continues the pre-pitch entry)?

**Actions**

1. Draft the Friday demo digest for Cat (done / almost there / next), plus
   identify the pull request to approve and attach the deck link (Slava
   sends it).
2. Set up a weekly Friday-demo summary routine in the fleet (Slava gives past
   summaries as examples); Slava suggested the Architect designs it.
3. Tell the tutorial tickets ([HOO-2076](https://linear.app/solana-fndn/issue/HOO-2076)
   lesson frame, [HOO-2072](https://linear.app/solana-fndn/issue/HOO-2072)
   tutorial page) that the tutorial direction may change after Tuesday's
   round; keep building to the prototype until then.
4. Carry into Monday's sync: ARL and polish plan, SDK migration, staffing and
   the engineers ask for Tuesday (merge with the pre-pitch entry's action 3).
