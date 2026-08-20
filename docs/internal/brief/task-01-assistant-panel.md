# Task 01 — Assistant panel prototype, fastest path to a demo

Goal: something demoable **today**. Optimise for a visible, honest prototype, not for architecture.

---

## Step 0 — Recon before writing code (15 minutes, do not skip)

Report findings before starting implementation:

1. `package.json` in `client/` — scripts, framework version, state management, styling approach. Is there a `storybook` script or a `.storybook/` directory anywhere?
2. `docker-compose*.yml` — services, profiles, ports, which of them the client needs to run.
3. Does the client run standalone against the **public** backend (i.e. can `npm start` work without the local server)? This is the single most important question for today's speed — check the API base URL configuration.
4. Where the editor layout is composed (panels, sidebars) and whether there is an existing extensible panel or tab system to hook into.
5. Where build and deploy are triggered from in the client, and what those calls look like — request shape, response shape, error shape.
6. Whether the IDL of a built program is available in client state, and where.

## Step 1 — Choose the run strategy based on step 0

Preference order, fastest first:

- **A. Client only, against the public backend.** If the client can be pointed at the existing public build service, do that. No Docker, no Rust toolchain, fastest possible loop.
- **B. Client only, with a mocked bridge.** If A is not possible or is flaky, implement the mock bridge from step 2 and run the client alone. Build and deploy return fixtures.
- **C. Full docker-compose.** Only if A and B both fail to produce a credible demo. If it comes to this, start `docker compose up` in the background and keep developing against mocks meanwhile — do not sit and wait for images to build.

Do **not** add Storybook if it is not already in the repository. Setting it up in a codebase this size costs more than it returns today. If it already exists, use it for isolated panel development. If it does not, add a temporary dev-only route or a query flag that mounts the panel with fixture data — same benefit, minutes instead of hours.

## Step 2 — The mock bridge

One module, clearly named (e.g. `playgroundBridge`), with a real implementation and a mock implementation behind the same interface. It should cover:

- `build(files)` → success with bytecode metadata, or a realistic Rust/Anchor compilation error (take a real error message from an actual failed build, not an invented one)
- `deploy()` → program id + transaction signature on devnet
- `getProjectContext()` → open files, current errors, IDL if present
- `applyPatch(patch)` → writes into the client's file state

The mock is what makes the demo possible today; the interface is what makes it real later. Keep the seam obvious.

## Step 3 — The assistant panel

- A dockable panel next to the editor. Placement matters for the demo: it must be visible without hiding the code.
- Message list, input, streaming response, and — the important part — **actionable messages**: when the assistant proposes a change, the message renders a diff and an "Apply" button. Nothing is applied silently.
- The panel receives project context from the bridge on every request: open file contents, last build error, IDL when available.
- Model calls go through a thin adapter so the provider can be swapped. Key comes from an environment variable in development. No key in the repo, no key in client-side committed config.
- If wiring a real model costs more than an hour, ship the panel with a scripted response for the demo scenario first, then swap in the real call. Mark clearly in the code which one is active.

## Step 4 — The demo scenario, wired end to end

The one path that must work flawlessly:

1. Open a project with a deliberate error (a missing account constraint or a type mismatch — something a real newcomer hits).
2. Hit build → error appears.
3. Assistant explains the error in plain language, referencing the actual code, not generic advice.
4. Assistant proposes the fix as a diff → user clicks Apply.
5. Build succeeds → deploy → program id and transaction link to Explorer.

Everything else can be rough. This path cannot be.

## Step 5 — The in-product plan artifact

A second tab in the same panel (or a section in it) titled "What we're building", rendering the short roadmap from `docs/product-brief.md`. Two reasons: the person clicking through the prototype sees the direction inside the product, and the same content is fed to the assistant as context so it can answer "what is this and what's planned" itself.

Keep it as content, not hardcoded markup — a markdown file the panel renders.

---

## Acceptance for today

- The demo scenario runs locally start to finish without manual intervention between steps.
- The mock boundary is one module and is documented in a short README section.
- The branch is pushed and its name is announced to the team.
- A short note listing what is real and what is mocked, so nobody demos something as working when it is not.

## Friction log (keep this running)

Every time the environment prevents the assistant from doing the right thing, add a line here: what the assistant should have suggested, and why the environment could not support it. Examples to look out for: a fix that requires a crate outside the whitelist, a Rust-side test, a generated client, a current Anchor API. This log is the raw material for the next strategic conversation — it should be collected while working, not reconstructed afterwards.
