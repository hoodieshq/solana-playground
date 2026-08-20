# Task 00 — Codebase map before any implementation

Purpose: one pass over the repository that produces a reusable map, so nobody has to walk the folders again. This runs **before** `task-01-assistant-panel.md`. Do not write feature code during this task.

Two outputs:

- `docs/codebase-map.yaml` — structured, machine-readable, the source of truth
- `docs/codebase-map.html` — a single self-contained page rendered from that YAML, for reading

The bias throughout: **the client and its interfaces**. Backend and wasm matter only where they touch what the client can do.

---

## Rules

- Only what you verified by reading files. Every non-obvious claim carries the path it came from.
- Anything uncertain goes under `unknowns` with a note on what would resolve it. Do not fill gaps with plausible guesses — a wrong map is worse than a short one.
- Prefer "how it actually works here" over generic descriptions of the libraries involved.
- Keep each description to one or two sentences. This is a map, not documentation.

---

## Required shape of `docs/codebase-map.yaml`

```yaml
overview:
  what_it_is:            # one paragraph
  runtime_topology:      # which processes exist, what talks to what, over which protocol
  entry_points:          # path -> what starts here

stack:
  client:                # framework, language, versions, styling, state management, router
  server:                # language, framework, what it actually does
  wasm:                  # which crates are compiled to wasm, what the browser uses them for
  build_tooling:         # bundler, package manager, monorepo tooling if any
  testing:               # what exists, how it is run
  storybook:             # present or absent; if present, how to run it

running_locally:
  verified: true|false   # did you actually run it
  fastest_path:          # the least-effort way to get a UI on screen
  commands:              # exact commands, in order
  env_vars:              # name -> purpose, which are required
  ports:
  docker:                # services, profiles, what each one is for
  can_client_run_alone:  # can the client point at a remote/public backend? how is the base URL configured?
  gotchas:               # version pins, node version, native deps, long build steps

client_architecture:
  layout_system:         # how the screen is composed: panels, sidebars, tabs; where it is defined
  extension_points:      # existing places where a new panel/tab/view can be registered
  state_management:      # what holds project state, how components subscribe
  theming:               # tokens, dark mode, where styles live
  routing:
  key_modules:           # path -> one-line purpose, for the 15-30 files that matter

ui_inventory:            # for each: path, what it renders, how it gets data
  editor:
  file_explorer:
  terminal:
  build_and_deploy_controls:
  test_panel:            # the IDL-driven one
  wallet_ui:
  tutorials_and_snippets:
  settings:

project_context_available_in_client:   # this section is the most important one for our work
  open_files:            # where file contents live in state, shape, how to read and write them
  build_errors:          # where a compilation error surfaces, its shape, is the raw compiler output preserved
  idl:                   # is it in client state after a build, where, what shape
  program_id_and_deploy_state:
  wallet_state:
  network_cluster:

data_flows:              # short step-by-step traces, with file paths at each hop
  build_flow:            # from clicking Build to bytecode in the browser
  deploy_flow:           # from bytecode to a program on devnet
  share_flow:            # how a project is shared by link
  wasm_boundary:         # what crosses between JS and wasm

integration_seams:       # where our assistant panel would plug in, ranked by least invasive
  - seam:
    path:
    why:
    risk:                # how likely this file is to change upstream and cause merge pain

conventions:
  code_style:
  file_naming:
  commit_and_pr:         # anything in CONTRIBUTING or visible in history

upstream_sync:
  fork_divergence:       # how far our fork is from upstream, if determinable
  hot_files:             # files upstream is actively changing — avoid or touch carefully

unknowns:
  - question:
    why_it_matters:
    how_to_resolve:
```

## The HTML page

Single file, no external assets, readable on a phone. It renders the YAML above in this order: overview and topology first, then running locally, then client architecture and UI inventory, then the project-context section, then data flows, then integration seams, then unknowns.

Requirements: a short table of contents at the top; file paths in monospace; the data-flow traces rendered as numbered steps; the unknowns visually distinct so they cannot be mistaken for findings. Support both light and dark colour schemes — declare `color-scheme: light dark` and provide a real dark palette, do not rely on the browser inverting things.

## Done when

- Both files exist and the HTML renders the full content of the YAML.
- The `running_locally.fastest_path` has actually been executed, not inferred.
- `project_context_available_in_client` answers, with paths, how to read the open file contents, the last build error and the IDL from client state. These three are what the assistant panel needs; if any is unclear, it goes in `unknowns` with a specific next step.
- A short summary in chat: the three things that most affect how we build the assistant panel, and anything that changes the plan in `task-01`.
