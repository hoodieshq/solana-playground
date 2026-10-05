# Tasks: client-v2 on the design system

Two tracks run in parallel after the rules. The tools track is the critical
path: decisions, the React 19 upgrade, design-system components, the layout
shell. Each task runs as its own stream, in its own worktree, with its own
ticket and small PRs. Update the state here in the PR that moves it.

Until the React 19 upgrade lands, new code may use Tailwind utilities and
tokens, but no design-system components.

| #   | Task                                   | Track          | Depends on        | Ticket / PR     | State     | Done when                                                                                                                 |
| --- | -------------------------------------- | -------------- | ----------------- | --------------- | --------- | ------------------------------------------------------------------------------------------------------------------------- |
| 1   | Record the decisions                   | Rules          | -                 | HOO-1857        | done      | Nine decisions in the project's decision log; root rules on upstream narrowed to `client/` and `server/`                  |
| 2   | Rules every agent reads                | Rules          | 1                 | HOO-1858 / #43  | in review | `client-v2/CLAUDE.md` and `openspec/` on `master-2.0`                                                                     |
| 3   | Layer check in CI                      | Rules          | 2                 | HOO-1859        | todo      | `eslint-plugin-boundaries` in CRA's ESLint, legacy roots excluded, a violation fails the build                            |
| 4   | Design system into the repo            | Design system  | -                 | HOO-1852 / #44  | in review | `design-system/` on `master-2.0`, builds and serves its catalogue                                                         |
| 5   | Registry that stands alone             | Design system  | 4                 | HOO-1852 / #44  | in review | No outside URLs in the built registry                                                                                     |
| 6   | Jest to vitest                         | Tools (beside) | 1                 | HOO-1715 / #46  | in review | Same test count as Jest on `master-2.0` today. No `jest.*` left in `src/`                                                 |
| 7   | Lift the TypeScript pin                | Tools (beside) | 6                 | HOO-1855        | backlog   | `typescript` above 5.6. The `=5.0.4` resolution is gone. Monaco's TypeScript features still work                          |
| 8   | React 19 spike                         | Tools          | 1                 | HOO-1840        | done      | See `design.md`, "The React 19 spike, measured"                                                                           |
| 9   | React 19 upgrade                       | Tools          | 8                 | HOO-1850 / #45  | in review | The product looks and behaves the same. The gate in `design.md` passes                                                    |
| 10  | DS components in `shared/ui`           | Tools          | 9, 5              | -               | todo      | The first components a ticket needs are installed through the reinstall script                                            |
| 11  | Raise the browser floor                | Foundation     | 1                 | HOO-1860        | todo      | `browserslist` updated. Build and bundle checked                                                                          |
| 12  | Tailwind 4 and the `@/` alias          | Foundation     | 11                | HOO-1861        | todo      | Utilities render beside styled-components. Nothing on screen moves. The alias resolves in the build, the editor and tests |
| 13  | Token bridge                           | Foundation     | 12, 4             | HOO-1802        | todo      | One palette for both systems. Two themes. Monaco and xterm follow the theme                                               |
| 14  | e2e in CI, or a written manual gate    | Tools          | -                 | HOO-1856        | todo      | The React 19 gate is either a CI job or a checklist in this folder                                                        |
| 15  | New layout shell                       | Screens        | 10, 13            | HOO-1854        | backlog   | The new arrangement with today's panels inside. The responsive breakpoint is agreed (1024 px vs 600 px)                   |
| 16  | Panels move one by one                 | Screens        | 15                | one ticket each | todo      | Each panel by the change rule in `client-v2/CLAUDE.md`                                                                    |
| 17  | Breakpoint screens                     | Screens        | 16                | -               | todo      | What the cut line says, by Nov 11                                                                                         |
| 18  | Global reset on, styled-components out | Screens        | last global style | -               | todo      | After Breakpoint. Monaco and xterm excluded from preflight or checked on their own                                        |

States: `backlog` (not scheduled), `todo`, `in progress`, `in review`,
`done`. When every row is `done`, the folder moves to
`openspec/changes/archive/` and `specs/` is brought up to date.
