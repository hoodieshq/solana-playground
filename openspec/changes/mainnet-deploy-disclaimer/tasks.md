# Tasks

## 1. Mainnet deploy warning (HOO-867)

- [x] 1.1 ([plan](plans/1.1-mainnet-deploy-warning.md)) Declare the warning once in `commands/deploy`, print it from the `deploy` command on mainnet-beta, show it as a warning `Callout` in `BaseDeploy` on mainnet-beta; verify with `BaseDeploy.test.tsx` cases (mainnet shows it, devnet does not, deploy stays enabled), an in-source test of the cluster check, and the e2e specs `mainnet-deploy-warning: Deploy stage on mainnet shows the warning` and `mainnet-deploy-warning: Deploy stage on devnet shows no warning`
