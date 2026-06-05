# Change Management

**Owner:** Preet Raval · **Last reviewed:** 2026-06-05 · **Maps to:** SOC 2 CC8.1

Every production change at VYNE goes through the same pipeline. The
pipeline IS the change-management control — auditors should look at
the CI logs + PR history as primary evidence.

## The pipeline

```
edit on local branch
      │
      ▼
 git commit  ──▶  Husky pre-commit (prettier + tsc --noEmit)
      │
      ▼
 git push    ──▶  GitHub Pull Request
      │
      ▼
 GitHub Actions CI:
   • Typecheck (tsc --noEmit) — required
   • Unit tests (vitest + coverage thresholds) — required
   • Build (next build) — required
   • Lint (eslint) — soft, report-only
      │
      ▼
 Branch protection on `main` blocks merge until all required checks pass
      │
      ▼
 Merge → Vercel deploys to Production automatically (via `vercel --prod`)
      │
      ▼
 Sentry monitors error rate; rollback via Vercel "Promote previous deployment"
```

## Evidence for auditors

| Control point                  | Where evidence lives                                                                                  | How to retrieve                                                                    |
| ------------------------------ | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Pre-commit gate                | `.husky/pre-commit` runs `lint-staged` + `pnpm --filter web typecheck`                                | `git log --grep '\\-\\-no-verify' --since 90.days` should be empty                 |
| PR review                      | GitHub PR list on `preetraval/VYNE`                                                                   | `gh pr list --state all --limit 100 --json number,title,mergedAt,reviews`          |
| CI green-required-before-merge | Branch protection on `main`                                                                           | `gh api repos/preetraval/VYNE/branches/main/protection`                            |
| Test coverage threshold        | `vitest.config.ts` enforces lines/funcs/stmts 25%, branches 50% on `lib/**`, `hooks/**`, `app/api/**` | CI job log: `Unit tests (vitest + coverage)`                                       |
| Build success on every deploy  | Vercel build log                                                                                      | `vercel inspect <deploy-url> --logs`                                               |
| Production change log          | `git log main`                                                                                        | `git log --since 90.days --first-parent --pretty=format:'%h %ad %s' main`          |
| Rollback capability            | Vercel "Promote previous deployment" + Neon PITR for DB rollback                                      | Vercel project dashboard; [docs/runbooks/db-restore.md](../runbooks/db-restore.md) |

## Branch protection — required status checks

Configured via [scripts/apply-branch-protection.sh](../../scripts/apply-branch-protection.sh)
(applies the JSON in [.github/branch-protection.json](../../.github/branch-protection.json)):

- `Typecheck (tsc --noEmit)` — required
- `Unit tests (vitest + coverage)` — required
- `Build (next build)` — required
- `enforce_admins`: false (operator can break-glass during a SEV1)
- `allow_force_pushes`: false
- `required_conversation_resolution`: true
- `strict`: true (branch must be up-to-date before merge)

The CODEOWNERS file at [.github/CODEOWNERS](../../.github/CODEOWNERS)
maps every path to the owner so review is forced when a second
operator is added.

## Break-glass procedure

When a SEV1 requires a hot-fix:

1. Make the smallest possible change on a branch.
2. Push + open PR.
3. If CI is broken in a way that blocks the fix, an admin
   (operator only) may merge with `enforce_admins: false` (the
   override is logged in audit_events as `prod.hotfix.merged`).
4. Open a follow-up issue to restore CI + add the missing test
   within 48h.
5. Postmortem: explain why the break-glass was necessary + what
   prevents repeat use.

## Database schema changes

Schema lives in [apps/web/prisma/schema.prisma](../../apps/web/prisma/schema.prisma)
and is push-deployed via [apps/web/scripts/safe-db-push.js](../../apps/web/scripts/safe-db-push.js)
during the Vercel build. The script retries 4× with exponential
backoff so a Neon auto-suspend doesn&apos;t fail the deploy.

For destructive schema changes (drop column, rename table):

1. **Two-deploy migration** — first deploy adds the new shape +
   double-writes; second deploy stops reading from the old shape and
   drops it. Never combine in a single deploy.
2. **Preview database** — apply the migration on a Neon preview
   branch + run the test suite against it before merging the PR
   that ships the migration.
3. **Manual rollback** — if a destructive migration corrupts data,
   follow [docs/runbooks/db-restore.md](../runbooks/db-restore.md) →
   "Scenario A — Bad migration".

## Dependency updates

Dependabot opens PRs weekly for:

- npm dependencies (minor + patch auto-merge on green CI; major reviewed)
- GitHub Actions

Lockfile pinned via pnpm; production builds use the committed
lockfile. Major-version bumps follow the normal PR pipeline above
(no special handling).

## Audit log entries this control writes

| Action                   | When                                      |
| ------------------------ | ----------------------------------------- |
| `prod.deploy.completed`  | After every successful Vercel deploy      |
| `prod.deploy.failed`     | After every failed Vercel deploy          |
| `prod.hotfix.merged`     | When admin merge bypasses required checks |
| `schema.migrate.applied` | After safe-db-push reports success        |

These come from the GitHub → Sentry → audit_events pipeline; not all
are live yet — `prod.deploy.completed` is the first to ship.
