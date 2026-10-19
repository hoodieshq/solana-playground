# Neon preview databases

A PR into `master-2.0` labelled `preview` gets its Vercel preview pointed at its own Neon branch, `preview/pr-<number>`, cut from
`main`, the project's default branch. A preview deployed by hand from a laptop gets `preview/<git-branch>`. Production uses
the project's default branch through the project-level `DATABASE_URL`; see
[Deploy the client to Vercel](deploy-client-vercel.md).

## Previews from a PR label

The Neon project caps its branch count. The Vercel integration's own option, a branch for every preview
deployment, created one for every pushed git branch. So that option is off, and
[`preview.yml`](../../.github/workflows/preview.yml) owns preview branches instead. Vercel's Git integration
still builds and deploys every preview; the workflow builds nothing, and only gives a labelled PR's previews a
database:

| PR event | What happens |
| --- | --- |
| `preview` label added, or a labelled PR opened, reopened or pushed to | Create or reuse `preview/pr-<n>`, apply pending migrations to it, empty it the first time, set its pooled URL as a Preview `DATABASE_URL` scoped to the PR's git branch, redeploy the head commit's preview if Vercel built it before that variable changed, and say so in one PR comment that later runs edit |
| `preview` label removed, or PR closed or merged | Remove that variable, delete `preview/pr-<n>`, and `preview/<head-branch>` if an older path left one |

A branch-scoped variable outranks the project's unscoped Preview `DATABASE_URL` for that git branch only, and
it stays, so every later push's build picks it up by itself. A deployment reads its variables when it is built,
so the preview Vercel started on the push that added the label still points at the unscoped database; that one
is redeployed ([`vercel.sh`](../../.github/scripts/vercel.sh) `redeploy-if-stale`). A preview that is not
labelled, or whose label was removed, uses the unscoped Preview `DATABASE_URL`.

### Every other preview uses production's database

The unscoped Preview `DATABASE_URL` is production's: the pooled URL of `main`. So every preview without the
label, and a labelled PR's first build until the workflow redeploys it, signs users in and syncs projects
against production. That is deliberate. The Vercel project is a sandbox deployment of upstream, not a product
with users to protect, and the constraint this setup solves is the Neon branch cap: a branch per preview, or
per pushed git branch, used it up fast. Only a PR that asks for its own database gets one.

What follows from it:

- **Label a PR that adds a migration.** Without the label its preview runs the new code against production's
  schema, which nothing migrates until the PR merges and someone runs `migrate-production-db`.
- **Label a PR whose testing must start from nothing**, such as sign-in, a first project or sync. An unlabelled
  preview shows whatever production holds, and what it writes stays there.
- **Open the preview the workflow's comment names**, or wait for the comment, on a newly labelled PR. The
  deployment Vercel built before the label still points at production.

On a push to a labelled PR, Vercel's build and the workflow's migration run side by side, so a preview can go
live a little before a migration it adds has been applied. Migrations are additive so far, so the earlier
schema serves it until then.

A push cancels the run it supersedes; a close cancels a run still going. PRs from forks get no secrets and are
skipped. The app reads no other `DATABASE_*` variable, so the integration's other project-level ones, if still
set for Preview, are unused.

[`preview-sweep.yml`](../../.github/workflows/preview-sweep.yml) is the safety net for a teardown that was
cancelled or failed. Daily, it deletes every `preview/pr-<n>` older than its `MIN_AGE_MINUTES` whose PR is no
longer open and labelled. Run by hand (Actions → preview-sweep → Run workflow) it defaults to a dry run, and scope `all-preview`
extends it to every other `preview/*` branch whose git branch has no open PR: the integration's leftovers and
hand-deployed previews. It never touches `main` (the default branch) or a protected branch.

GitHub runs a schedule, and lists a workflow under Run workflow, only from the repository's default branch,
`master`. Until `preview-sweep.yml` is on `master`, it neither runs daily nor can be started from the Actions tab;
clean up by hand meanwhile (see [Cleanup](#cleanup)).

## Configuration

| Name | Where to get it |
| --- | --- |
| `NEON_API_KEY` | Neon console → the org that owns the project below → Settings → API keys → Create new → Project-scoped, for the project below. Only org Admins can mint one, and it is shown once |
| `NEON_PROJECT_ID` | Neon console → the project behind the Vercel Marketplace store `neon-solana-playground` → Settings → General → Project ID |

Both go in two places:

- **`client-v2/.env`**, for the `Makefile.vercel` targets. Make does not read `.env` the way dbmate does, so
  `Makefile.vercel` reads these two names out of it. A value already exported in the shell wins.
- **GitHub**, under the same names, for the [preview workflows](#previews-from-a-pr-label): the key as a
  repository secret, the project ID as a repository variable, since it grants nothing on its own:

  ```sh
  gh secret set NEON_API_KEY --repo solana-foundation/solana-playground
  gh variable set NEON_PROJECT_ID --repo solana-foundation/solana-playground
  ```

The app never reads either, so neither is set in the Vercel dashboard.

`preview.yml` also sets and removes the branch's `DATABASE_URL` and redeploys, so GitHub needs the Vercel side
too, and the label:

| Name | Kind | Value |
| --- | --- | --- |
| `VERCEL_TOKEN` | secret | A token for the team that owns the project, from an account allowed to edit Preview variables and redeploy (see [Tokens](deploy-client-vercel.md#tokens)) |
| `VERCEL_ORG_ID` | variable | `orgId` in `.vercel/project.json` |
| `VERCEL_PROJECT_ID` | variable | `projectId` in `.vercel/project.json` |

```sh
gh secret set VERCEL_TOKEN --repo solana-foundation/solana-playground
gh variable set VERCEL_ORG_ID --repo solana-foundation/solana-playground
gh variable set VERCEL_PROJECT_ID --repo solana-foundation/solana-playground
gh label create preview --repo solana-foundation/solana-playground --description "Deploy a preview with its own database"
```

In Vercel, turn off the Neon integration's database branch for Preview deployments (Storage → the Neon store →
Settings), or every pushed branch keeps getting a Neon branch regardless of the label.

A Vercel-managed Neon account has no CLI login, so `neon login` cannot work: the project-scoped key is the only
way in.

## The parent branch

Every preview branch is cut from `main`, the default branch production uses (`NEON_BASE_BRANCH` overrides it).
A copy-on-write branch carries `main`'s schema and its `schema_migrations`, so dbmate applies only the migrations
the PR adds. It carries `main`'s rows too, a copy of production's data as of the moment the branch was cut.
`preview.yml` truncates every table but `schema_migrations` once, after the first migration, so a labelled PR's
preview starts with no users, projects or conversations; later pushes keep what was made on it. Remove and re-add
the label to start over. A hand-deployed `preview/<git-branch>` is not emptied. A `--schema-only` branch is no way
around the copy: it carries the tables but leaves `schema_migrations` empty, so dbmate would try to create tables
that already exist.

The empty `preview-base` parent this replaced is no longer read by anything. Delete it from the Neon project once
no preview branch still has it as its parent.

## A branch per git branch

`scripts/neon-preview-branch.sh` creates `preview/<git-branch>` on first use and prints its connection string. The
name comes from the local branch checked out where `make` runs. Three targets call it:

| Target | What it does with the branch |
| --- | --- |
| `preview-db-branch` | Creates or reuses it and prints its host |
| `migrate-preview-db` | Applies pending migrations to it, with no confirmation prompt |
| `deploy-client-to-vercel-preview` | Passes its pooled URL as the deployment's `DATABASE_URL` |

`migrate-preview-db` applies the migrations the git branch adds over `main`'s. The branch belongs to one git branch and
nothing else reads it, so a bad migration costs a `neon branches delete`, not an incident, and two people testing
two migrations cannot corrupt each other. Before previews had their own branches, preview and production shared a
single database.

## Cleanup

The Neon project caps its branch count, so every `preview/*` branch left behind blocks a future preview. Labelled
PRs clean up after themselves (see [Previews from a PR label](#previews-from-a-pr-label)). A hand-deployed
`preview/<git-branch>` is deleted when a PR with that head branch closes. Otherwise it stays until the
`all-preview` sweep or a hand delete removes it. A hand deploy from a local branch named differently from the
PR's head branch, or from a detached HEAD (`preview/HEAD`), is never matched to a PR.

By hand, with both values exported from `client-v2/.env`:

```sh
npx neonctl@latest branches list --project-id "$NEON_PROJECT_ID"
npx neonctl@latest branches delete preview/<git-branch> --project-id "$NEON_PROJECT_ID"
```

## Known gaps

- **The `Makefile.vercel` Neon targets are untested against real Neon.** `preview-db-branch` and
  `migrate-preview-db` were exercised with a stubbed `neonctl` against a local Postgres, which proves the
  arguments and the shell but not that the Neon API accepts them. `preview-db-branch` is the smallest real call
  and fails fastest.
