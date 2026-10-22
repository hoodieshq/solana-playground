# Tasks

## 1. SearchBar on the design system (HOO-2207)

- [x] 1.1 Add a `command` item to `design-system/registry.json` and install it
      with `yarn ds-add input-group command`; `cmdk` lands in
      `client-v2/package.json`. Verify: `src/shared/ui/command.tsx` exists and
      `yarn test-types` passes.
- [x] 1.2 Tests first, in `src/components/SearchBar/SearchBar.test.tsx`:
      picking an item fills the input and calls `onSearch`; an item with
      `items` opens a page and Back returns; a failing `validator` sets
      `aria-invalid`; Escape with `restoreIfNotSelected` puts back the last
      value; pasting `labelToSelectOnPaste` picks it; ArrowDown then Enter
      picks the second item. Verify: they fail against the legacy SearchBar
      (after 1.1).
- [x] 1.3 Rebuild `SearchBar.tsx` from `InputGroup`, `Popover` and `Command`
      per design.md; drop `searchButton.width`. Verify: 1.2 passes and
      `git grep styled-components client-v2/src/components/SearchBar` prints
      nothing (after 1.2).
- [x] 1.4 The spec's two scenarios as Playwright tests in
      `e2e/client-v2-stages.e2e.spec.ts`, titled
      `client-v2-search-field: <scenario>`. Verify: `yarn test-e2e
      e2e/client-v2-stages.e2e.spec.ts` passes (after 1.3).
- [x] 1.5 Verify: `yarn run check`; screenshots before and after at 1280, 834
      and 390 px; the field and list compared with the design system's Input
      group and Command blocks, differences kept listed in the PR (after 1.4).
