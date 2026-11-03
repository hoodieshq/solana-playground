# Design

## Context

The dialog (`features/cli-deploy`, change `cli-deploy`, archived 29 Oct) is
our own: neither the DS prototype, the design system, Almaz's stand nor the
designers' specs draw it. The new parts reuse what the dialog already has:
step 3's CodeBlock with its copy button, and Download .so's outline button.

## Decisions

- **The Program Metadata command shows for both tools.** It writes the
  canonical IDL Explorer reads, and it is the one Sergey named for Mainnet.
  The Anchor command is the second, legacy way, shown only when Anchor is
  picked so the Solana CLI view stays one command per step.
- **`--rpc` is a full URL.** The CLI (0.11.0) takes `--rpc <url>` and falls
  back to the Solana config's `json_rpc_url`, not a cluster moniker; the
  command names `https://api.devnet.solana.com` or
  `https://api.mainnet-beta.solana.com` so it writes where step 3 deployed.
- **The authority is left to the Solana config.** Both commands sign with
  the CLI wallet, which is the upgrade authority after step 3; adding
  `--keypair` would name a path we cannot know.
- **No program id yet** (a project never deployed and with no keypair): the
  commands carry `<program-id>`, and a line says the deploy prints it.
- **The IDL file is `<program>.json`**, the same base name as the binary, so
  the files sit together and the commands name them without guessing.
- **No IDL** (a native program, or no build yet): Download IDL is off, and
  step 3.1 says there is no IDL to upload and shows no command.

## Risks

- `@latest` runs whatever the package publishes next. Sergey chose it; the
  command is shown, not run, by Playground.
