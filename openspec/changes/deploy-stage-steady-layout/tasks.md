# Tasks

One task, one PR (HOO-2796). The placement waits on the design review; the PR is a draft until then.

## 1. Deploy stage

- [x] 1.1 Draw the progress region in the facts card's who-pays row before a first deploy, the row reserving the
  four-step list's height, in `BaseDeploy.tsx`; verify with `BaseDeploy.test.tsx` and the two "starts in place"
  scenarios in `e2e/client-v2-deploy.e2e.spec.ts`, which fail on the code before it (HOO-2796)
