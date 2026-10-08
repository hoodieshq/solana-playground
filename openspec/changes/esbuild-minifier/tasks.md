# Tasks

Groups 1 and 2 touch different parts of `craco.config.js` and may run at the
same time. Group 3 needs both.

## 1. Type check and lint leave the production build

- [x] 1.1 In `craco.config.js`, filter `ForkTsCheckerWebpackPlugin`,
      `ForkTsCheckerWarningWebpackPlugin`, and `ESLintWebpackPlugin` out of
      production builds only. Verify: craco's production webpack config lists
      none of the three and its development config lists the type checker and
      ESLint; with a deliberate type error, `yarn build-fast` completes, and
      `yarn test-types` and `yarn run check` fail. Depends on 1.2 for
      `yarn run check`. Ticket to file.
- [x] 1.2 Call the `check` script as `yarn run check` in `.githooks/pre-push`,
      `CLAUDE.md`, and `client-v2/README.md`, since yarn 1's built-in `check`
      shadows it. Verify: with a deliberate type error, `.githooks/pre-push`
      exits non-zero at `tsc --noEmit`, and on a clean tree it reaches the
      script's steps instead of reporting dependency mismatches. Ticket to
      file.

## 2. esbuild minifies the production bundle

- [x] 2.1 Add `esbuild` to `client-v2` `devDependencies`, pinned exactly at the
      version `tsx` already installs. Verify: `yarn install --frozen-lockfile`
      succeeds, and `yarn.lock` lists `@esbuild/linux-x64` among its optional
      dependencies. Ticket to file.
- [x] 2.2 Replace the `TerserPlugin` minimizer with `esbuildMinify`,
      `keepNames: true`, and a `target` resolved from the production
      `browserslist`; keep `parallel: 2`; drop the Terser-only
      `keep_classnames` and `keep_fnames` settings; update the comment in
      `getChangeEventName` (`src/utils/decorators/common.ts`) to name the
      setting that keeps `_Pg` names. Verify: a cold build with the
      deployment's `NODE_OPTIONS` peaks below 8 GB summed over its processes,
      and the PR states the peak, time, and gzipped JS size. Depends on 2.1.
      Ticket to file.
- [x] 2.3 Add a step after `yarn build-fast` in `client-v2.yml` that fails
      unless `build/static/js` contains `_PgConnection` and `_PgProgramInfo`.
      Verify: the step fails on a local build with `keepNames: false` and
      passes on the real build; the PR shows both outputs. Depends on 2.2.
      Ticket to file.

## 3. Integration on Vercel

- [ ] 3.1 Deploy a preview of the branch without a build cache. Verify: the
      build log has no "Out of Memory" event, and the manual scenarios of
      `client-v2-build` pass on the preview (every chunk loads in Safari 16.4;
      changing the endpoint while a program builds updates its on-chain info
      once). Depends on 1.1 and 2.2. Ticket to file.
- [ ] 3.2 File the follow-up ticket for shrinking esbuild's output (a decorator
      lookup that does not depend on `Function.name`, splitting the largest
      chunks), with the measurements from proposal.md as the baseline and
      Terser with `parallel: 2` as the fallback if no option closes the gap.
      Verify: the ticket exists and this change's proposal names it.
