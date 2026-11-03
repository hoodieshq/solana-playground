# Tasks

All tasks: HOO-2397. One PR; tasks run in order.

## 1. Program keypair slice

- [ ] 1.1 `features/program-keypair/model/keypair-file.ts`: parse and
  serialise the Solana CLI keypair file (`not_json`, `wrong_shape`), with
  in-source tests. `model/telemetry.ts` with the six events of the spec, the
  `keypair` prefix registered. Verify: `yarn test-unit` on the module and
  `src/app/slice-structure.test.ts` pass.
  Plan: [plans/1-program-keypair-block.md](plans/1-program-keypair-block.md)
- [ ] 1.2 `ui/BaseProgramKeypair.tsx` (props only) and
  `ui/ProgramKeypair.tsx` (connects `PgProgramInfo`): the fold, the field,
  the five actions, the dialog, the mismatch warning, the refusal line; the
  events emitted. Depends on 1.1. Verify: one React test per action, with
  the events asserted through the memory provider.

## 2. Deploy stage

- [ ] 2.1 `BaseDeploy` takes `programKeypair: ReactNode` and places it under
  the payer line before a deploy and under the history after one;
  `Deploy.tsx` passes `<ProgramKeypair />`. Depends on 1.2. Verify:
  `BaseDeploy.test.tsx` covers both placements; screenshots of the fold
  closed, open and on a mismatch.
