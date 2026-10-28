# Tasks

One PR (HOO-2404); groups land in order.

## 1. Binary download

- [x] 1.1 `PgServer._send` throws `PgServerError` with `status` and body; verify by a `server.test.ts` case that a 500 keeps its status (HOO-2404)
- [x] 1.2 Slice `features/cli-deploy`: prefix `cli` registered, `model/telemetry.ts` declares the four events, `model/` builds the program name and classifies a failed download; verify by in-source tests and `slice-structure.test.ts` (HOO-2404; after 1.1)
- [x] 1.3 `BaseDownloadProgram`/`DownloadProgram`, rendered beside Download IDL in the Build stage's success surface; verify by tests that it saves `<program>.so`, shows the rebuild line on `not-built`, sends `cli_binary_downloaded`/`cli_binary_download_failed` through the memory provider, and is absent on a failed build (HOO-2404; after 1.2)

## 2. CLI deploy guide

- [x] 2.1 `BaseCliDeployGuide`/`CliDeployGuide` dialog with Tool and Cluster controls, the commands, copy buttons, the keypair note and the download; verify by tests of the commands per tool and cluster and of `cli_guide_opened`/`cli_command_copied` (HOO-2404; after 1.3)
- [x] 2.2 Triggers: the mainnet warning's own words "deploy from your own machine", "Deploy with the CLI" on the Deploy stage; verify by `BaseDeploy` tests and the e2e scenarios "cli-deploy: Guide from the Deploy stage" and "mainnet-deploy-warning: Guide from the mainnet warning" (HOO-2404; after 2.1)
