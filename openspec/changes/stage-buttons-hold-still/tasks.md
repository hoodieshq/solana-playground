## 1. Stage buttons hold still (HOO-2795)

- [x] 1.1 AsyncButton keeps both labels in one cell (design system, then `yarn ds-add async-button`), the Build stage's brand pill does the same, and `STAGE_FRAME` reserves its scrollbar gutter on both edges. Verified by the unit tests in `src/app/shared-ui-buttons.test.tsx` and `BaseBuild.test.tsx` and by the two `client-v2-stages` Playwright scenarios, all failing without the fix
