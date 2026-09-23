# History and threads: the two Slack threads with Cat, mid-September

Source record for D43, D44 and D45. Two threads, both about the chat
history that HOO-1633 implements: a 30-reply question-and-answer between
Sergey and Cat that settles what history means as a product, and a status
update Sergey posted to the customer afterwards.

**Neither thread is dated in what we hold.** Bounds, inferred and marked
as such: the Q&A precedes the implementation - HOO-1633 was filed
2026-09-14, and Sergey describes local history as *"in-memory... they
wont survive the page refresh at the moment"*, which was true until PR
#29 - so **between 14 and 17 Sep**. The status update reports that saving
and cross-browser download already work, which puts it **after PR #29,
around 18-19 Sep**. If either exact date matters, it is in Slack.

Nothing here is the authority: the decisions are. See also
`2026-09-11-call-notes-cat.md`, the earlier thread from the same
customer.

---

## Thread 1 - what history is, verbatim

> **Sergey Prokhorov**
> @Cat McGee, hi. A couple of questions regarding the history which we
> decided to store.
> Do we store the history only for the default chat?
> Do we need a "thread (or topic)" entity?
>
> **Cat Mcgee** [6:26 PM]
> i think we need to keep all. can we do latest 50 messages in latest 5
> conversations?
> yes
>
> **Sergey Prokhorov** [7:13 PM]
> I am not sure "latest 5 conversations" makes implementation easier. It
> seems to me it would make things complex. Can not answer right now,
> need some time to process
>
> **Cat Mcgee** [7:15 PM]
> ok so maybe just latest 200 messages
>
> **Sergey Prokhorov** [7:59 PM]
> Currently, by thread, I mean the dialogue with the default agent for
> each tutorial (not sure about the program, having the fact that we
> could create separate "projects" for each program)
> Default convo with the default agent would be record without a thread
> Do you have the same picture?
> [7:59 PM] Also, we're gonna save the questions and the agent's answers,
> without the reasoning process. does it sound right to you?
>
> **Cat Mcgee** [8:01 PM]
> im confused. what is default convo with default agent?
>
> **Sergey Prokhorov** [8:01 PM]
> default agent is the thread with agent api key to which we store on the
> backend
> [8:03 PM] i mean you start the project and enter the dialogue. That is
> the default conversation (convo) with default agent
>
> **Cat Mcgee** [8:04 PM]
> i dont think we need to associate the conversation with the agent. they
> should be able to change agent and continue conversation
>
> **Sergey Prokhorov** [8:04 PM]
> okay. makes sense
>
> **Cat Mcgee** [8:04 PM]
> does that make sense? not sure im quite understanding the question
>
> **Sergey Prokhorov** [8:07 PM]
> Would it work then if each tutorial/project is an individual thread? Or
> do you mean each project should have different threads within?
> [8:07 PM] Currently we do not have a UI for different threads within
> chat
>
> **Cat Mcgee** [8:14 PM]
> each tutorial/project is an individual thread
> [8:14 PM] should be clearable though. is it?
>
> **Sergey Prokhorov** [8:17 PM]
> that depends on the condition. I'd prefer not to have any async task to
> clean DB or any implicit dependencies
> [8:20 PM] "latest 5 of anything" seems to vague. I'd rather save all.
> Imagine you created a new project (=thread). Deleting the latest thread
> for a project might not be a good UX. Especially if the user just
> created severla projects just to check how the PG works
>
> **Cat Mcgee** [8:22 PM]
> im imagining they can clear a specific thread by opening that project
> and clicking Clear Conversation
> the code should still exist, just not the messages
>
> **Sergey Prokhorov** [8:23 PM]
> I do not mean to delete the code, yes.
> But what if they wouldnt click "clear conversation"?
> [8:24 PM] We could add a function to clear (and delete chat history);
> that is possible.
>
> **Cat Mcgee** [8:25 PM]
> when they arent logged in we still store threads locally right?
>
> **Sergey Prokhorov** [8:25 PM]
> yes. in-memory. but they wont survive the page refresh at the moment
>
> **Cat Mcgee** [8:25 PM]
> i think thats when we store latest 200 messages. but if theyre logged
> in and we use DB we can store 1000s
> [8:25 PM] > *they wont survive the page refresh at the moment*
> can we save in localstorage?
>
> **Sergey Prokhorov** [8:29 PM]
> Yes, we could. do you expect that all the conversation user had beeing
> not signed should be saved to the DB at the moment of "logging in"?
> [8:30 PM] I'd rather simplify that. at least up to the end of the week
>
> **Cat Mcgee** [8:32 PM]
> > *do you expect that all the conversation user had beeing not signed
> > should be saved to the DB at the moment of "logging in"?*
> yes
>
> **Sergey Prokhorov** [8:36 PM]
> Could we split that into that pipeline: sync only active thread > sync
> all outstanding threads?
> I'm trying to understand what could be delivered first to fit into the
> deadline
>
> **Cat Mcgee** [8:37 PM]
> i dont think it would be complex to sync all threads. it would just be
> grabbing them from localstorage
>
> **Sergey Prokhorov** [8:40 PM]
> They should be synced preferably in the background. Also the user could
> work within a thread that already has a history but the user is not
> logged in yet. so we need to decide what parts should be updated. Also,
> I could work with the same project(=thread) from different browsers

## Thread 2 - the status Sergey sent the customer, verbatim

> **Sergey Prokhorov** [6:30 PM]
> Here is our status:
>
> Implemented history saving for projects/tutorials. It gets synced to
> PostgreSQL upon auth.
> Added history download upon logging in on a different browser
>
> In progress: improve handling of the program status in the Learning
> with AI flow
> In progress: Migrate internal structure to OSS AI SDK from vercel
> In progress: prepare PR with LSP integration for Solpg's client
>
> Some ideas that we have, which are not recorded yet:
>
> saving conversations alone doesn't make the LLM dialog fully resumable;
> you have to archive the context and make sure another device uses that
> archive to truly continue the conversation
> using websocket or long polling to auto-sync changes from concurrent
> devices - should probably happen when a tab goes from inactive to
> active
> adding Ctrl+S hotkey for explicit save
> handle corner case when user's session expires and he continues
> editing. Currently, nothing is stored on the server if you're not
> logged in
>
> [6:32 PM] We are going to test history in our staging first. Then a PR
> into Foundations' project would be created

---

## Answered

**Keep everything on the server; the cap belongs to the local store.**
Cat opened with *"latest 50 messages in latest 5 conversations"*, Sergey
refused the second half - *"'latest 5 of anything' seems to vague. I'd
rather save all"*, with the concrete harm: a user who makes several
projects to try the product would lose the thread of the one they kept.
She moved once (*"ok so maybe just latest 200 messages"*) and then split
it herself: *"i think thats when we store latest 200 messages. but if
theyre logged in and we use DB we can store 1000s."* -> **D44**.

**One thread per tutorial or project, and no thread picker is owed.**
*"each tutorial/project is an individual thread"*, answering Sergey's
explicit alternative (*"or do you mean each project should have
different threads within?"*) and his note that no UI for threads within
a chat exists. Multiple threads per project - lane B in the roadmap
sheet - is therefore ours to want, not something the customer asked for.

**A conversation is not bound to the agent that produced it.** *"i dont
think we need to associate the conversation with the agent. they should
be able to change agent and continue conversation."* This also disposes
of Sergey's proposal one message earlier that the default conversation
would be *"a record without a thread"* - everything is a thread. -> **D45**.

**Clearing is an explicit user action; nothing expires on its own.**
*"im imagining they can clear a specific thread by opening that project
and clicking Clear Conversation. the code should still exist, just not
the messages."* Sergey had already ruled out the alternative from the
implementation side: *"I'd prefer not to have any async task to clean DB
or any implicit dependencies."* Note what this does to lane B of the
roadmap sheet: the clear-thread rows sit at P2 there, and they are a
customer request, not a nicety. -> **D44**.

**Signed-out history survives the refresh, and all of it is imported on
sign-in.** `localStorage` for the signed-out user (*"can we save in
localstorage?"*), and at sign-in everything goes up: Sergey proposed
staging it - *"sync only active thread > sync all outstanding threads"*,
openly to fit the deadline - and Cat declined the staging: *"i dont think
it would be complex to sync all threads. it would just be grabbing them
from localstorage."* -> **D44**.

## Open, and why it is open

**Whether reasoning is stored was asked and never answered.** *"we're
gonna save the questions and the agent's answers, without the reasoning
process. does it sound right to you?"* Cat's next message answers a
different question and the thread moves on. **Do not record this as
agreed.** It is being implemented as "no reasoning" by default, which is
the reasonable reading, but it is an assumption of ours.

**Two threads' worth of concurrency questions Sergey raised into
silence.** *"the user could work within a thread that already has a
history but the user is not logged in yet. so we need to decide what
parts should be updated"*, and *"I could work with the same project
(=thread) from different browsers."* D39 accepts the two-devices race at
the schema level - newest thread wins - which answers where rows land,
not what a user sees. Merge behaviour on sign-in over an existing server
thread is undecided and will surface as a real defect.

**"Migrate internal structure to OSS AI SDK from vercel" is reported to
the customer as in progress, and our own gate says it is not.** The
roadmap sheet has *SDK spike with a written verdict* at P1 and
*Transport migration to the ai SDK* at P2 with the note "only if the
spike says yes"; R-2 in the same sheet is the risk that the migration
replaces working code. D1 rejected the Vercel AI SDK outright, on React
17 and a Node-only core. Either the spike happened and nothing recorded
it, or a P2-gated item is being built and reported before its gate. This
needs settling before the next status goes out - the customer has been
told it is underway.

**Four ideas Sergey flagged as "not recorded yet" now have somewhere to
go.** Context archiving for genuine resumability; websocket or long
polling to sync concurrent devices on tab activation; a `Ctrl+S`
explicit save; and the session-expiry case where a signed-out user keeps
working and nothing reaches the server. Under D43 these are scope, so
they belong as rows in the roadmap sheet rather than in this file - the
first one in particular, because "saved conversations are not a resumable
dialogue" is a product claim we would otherwise overstate.
