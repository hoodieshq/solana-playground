# Tasks

## 1. Platform networks only (HOO-2488)

- [x] 1.1 `NETWORKS` (Devnet, Mainnet; platform URL else public) and `clusterName` in `constants/connection.ts`; the endpoint setting, `getCluster` and the stored-endpoint options read it, with legacy keys aliased. Verify: unit tests in `constants/__tests__/connection.test.ts` and the `settings/stored-endpoint` block (a stored `mainnet-beta`, `devnet-platform` and `testnet` each read back as specified).
- [x] 1.2 Settings › Network chips are exactly Devnet and Mainnet; "Deploys with real SOL" under Mainnet. Depends on 1.1. Verify: `BaseNetworkChoice.test.tsx`; e2e `mainnet-deploy-warning: Mainnet picked in Settings`.
- [x] 1.3 Every shown cluster name goes through `clusterName`/`networkName` (Deploy, Interact head and history, Explorer labels, fund dialog, footer status, CLI guide copy). Depends on 1.1. Verify: unit tests of `format.ts`, `account.ts`, `BaseNotEnoughSol`; e2e specs that read "Deploy to Devnet", "Explorer (Devnet)"; `grep -rn "Mainnet Beta" client-v2/src` finds nothing.
