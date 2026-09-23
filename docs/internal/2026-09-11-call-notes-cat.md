# Call with Cat, 2026-09-11 - what it changed

Source record for the decisions made after it. Two artefacts came out of
the same evening: the **Rev 2 requirements document**, which Sergey
finished editing right after the call
(`2026-09-11-release-requirements-rev2.md`), and the **Slack thread
below**, in which Cat posted her own recollection and then answered the
mainnet question Sergey raised against it.

The thread is the later of the two and overrules it where they differ.
That order is the whole reason this file exists: Rev 2 reads as the
settled plan, four of its statements are no longer true, and for eleven
days nothing in `docs/` said so. Two of those gaps surfaced on 2026-09-22
as contradictions between the roadmap spreadsheet and Linear.

Nothing here is the authority: the decisions are. Each item says what was
said, what it answers or contradicts, and where it now lives.

## Who was present

Cat (`Cat Mcgee`) is the customer side. Sergey (`Sergey Prokhorov`,
`rogaldh`) is the tech lead. Acheron is the upstream maintainer and, for
this release, an outside party we depend on. No recording and no notes
were taken on the call itself - Cat's own words: *"just putting these
here for my own reference. shouldve run a granola haha"*. What follows is
therefore her recollection plus the thread, not a transcript.

## The thread, verbatim

> **Cat Mcgee**
> k great
> just putting these here for my own reference. shouldve run a granola
> haha
>
> we want a db (preferably postgres) to store programs & conversations
> but having disagreements with acheron
> keeping /ide not a req
> kora deployments for devnet important but dont need to be included in
> sept release
> kora deployments probably not required for mainnet at all
>
> **Sergey Prokhorov** [9:04 PM]
> I've just finished editing the original proposal
> Added what we've clarified on the call. Also, I've added notes to
> Decisions needed for what we haven't discussed
> *[attaches `Playground September Release Rev 2.pdf`]*
>
> [9:08 PM] > *kora deployments probably not required for mainnet at all*
> What about the deployments to the mainnet in general?
> The current version allows deployment to the mainnet, but it is based
> on the wallet keypair stored within the localstorage. Which is a huge
> security issue.
> Do we need to disable it as well?
>
> **Cat Mcgee** [9:08 PM]
> i think mainnet deployments are good but should have a wallet connector
> [9:08 PM] does that exist rn?
>
> **Sergey Prokhorov** [9:17 PM]
> Not via wallet connector. It is done via a local wallet to not require
> signing a transaction for each buffer piece/batch to deploy a program
> to the chain. Adding a wallet connector is WIP on our side, but to
> deploy to the mainnet, it would require signing a bunch of
> transactions, not just 1 signing
>
> **Cat Mcgee** [9:28 PM]
> might get confusing if we have github login and wallet connector unless
> we use privy or something
>
> **Sergey Prokhorov** [9:31 PM]
> By wallet connector, I mean solana-wallet-adapter, not the
> WalletConnect
>
> **Cat Mcgee** [9:32 PM]
> yeah i understand that but still confusing no? (also we should use
> connectorkit)
>
> **Sergey Prokhorov** [9:38 PM]
> noted about connectorkit. I think having both Wallet and a GitHub
> profile might look a bit confusing, but they serve different purposes.
> Having them separate gives flexibility at this step I think

## Answered

**The wallet connector is ConnectorKit, and mainnet deploys stay.**
Sergey asked the sharpest question available - the current mainnet path
signs with a keypair in `localStorage`, so should it be disabled? - and
got a product answer rather than a security one: *"i think mainnet
deployments are good but should have a wallet connector"*. Then, after
Sergey named `solana-wallet-adapter` specifically, *"(also we should use
connectorkit)"*, which he accepted in the same breath.

So the customer named the library, and named it **after** HOO-1615,
HOO-1616 and HOO-1617 were filed on 10 Sep saying "Solana Wallet
Adapter". Those three tickets and the roadmap spreadsheet's
"ConnectorKit integration and funding flow" are one piece of work under
two names, and the spreadsheet's name is the current one. -> **D40**,
which amends D21.

Unresolved inside the answer, and worth carrying: Cat's *"might get
confusing if we have github login and wallet connector unless we use
privy or something"* against Sergey's *"they serve different purposes.
Having them separate gives flexibility at this step"*. Sergey's reading
stands for now because nobody argued further, but Privy was raised by the
customer and has not been evaluated.

**Kora is out of the September release, and mainnet through Kora is
probably not wanted at all.** *"kora deployments for devnet important but
dont need to be included in sept release"* and *"kora deployments
probably not required for mainnet at all"*. Rev 2 has six Kora P0s in
section C and postpones only mainnet, on the Jupiter key. Both halves of
that are now wrong: devnet Kora is important but not September, and
mainnet Kora is not merely blocked on a purchase - it may never be
wanted, which makes the Jupiter API key a lead-time item to stop chasing
rather than a blocker to escalate. -> **D41**.

**`/ide` was loose shorthand; there is no route split.** *"keeping /ide
not a req"* answers Rev 2's Decision 4 exactly as Sergey framed it. The
IDE stays at `/`, the learning shell stays a view inside the same route,
and section F's first-run work is unblocked. -> **D42**.

**Postgres for the database is confirmed by the customer.** *"we want a
db (preferably postgres) to store programs & conversations"*. Rev 2's
Decision 2 asked Supabase or the Foundation's managed Postgres; the
engine question is settled either way, and PRs #29 and #30 have since
shipped against a provider-neutral `DATABASE_URL` with Better Auth for
identity (D39). What survives is only who hosts it - and that is a
Foundation question, not ours.

## Open, and why it is open

**Programs in the database, against D31.** Cat wants the database to
store *"programs & conversations"*. D31 decided the opposite for
programs: no user cabinet, a project goes to the learner's own GitHub
repository, which is also how Rev 2's section E is written. One of the
two has to give, and the choice is not technical - it decides whether the
Foundation hosts users' code. Nobody has put the contradiction to Cat.
This needs to be the first item on the next call, and no work on either
side of it should start before then.

**"having disagreements with acheron".** About the database, in the same
line. Its content is not recorded anywhere we hold, and it is the
upstream maintainer disagreeing with the direction we are building. Worth
asking what the disagreement is, because if it is about hosting user
data, it is the same argument as the paragraph above.

**Privy.** Raised by Cat as the way to avoid two separate identities
(GitHub login and a wallet), dropped without a decision. It reads as an
aside rather than a request, but it came from the customer, so it is
recorded here rather than forgotten.

**What "Phase 1 ships Mon 21 Sep" means now.** The date passed. As of
2026-09-22 `feat/rust-analyzer-lsp` is unmerged, Anchor 1.2 is unstarted,
and Cloud Run access is still not held. Nobody restated the date after
the thread. The roadmap carries the true state; Rev 2 does not.
