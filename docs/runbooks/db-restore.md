# DB Restore Runbook

**Owner:** Preet Raval · **Last reviewed:** 2026-06-01 · **SEV escalation:** SEV1

This is the disaster-recovery playbook for VYNE's primary Postgres
(Neon). Use it when: data is corrupted by a bad migration, an admin
delete went sideways, or Neon has an outage and you need to fail over.

## At-a-glance

- **Primary DB:** Neon Postgres (POSTGRES_PRISMA_URL in Vercel env)
- **Backup cadence:** daily 06:00 UTC via [/api/admin/backup?cron=1](../../apps/web/src/app/api/admin/backup/route.ts), POST mode ships JSON to Vercel Blob when `BACKUP_BLOB_TOKEN` is set
- **Neon PITR:** 7-day point-in-time recovery (enable in Neon console → Branch settings)
- **Verification cadence:** weekly via [.github/workflows/backup-verify.yml](../../.github/workflows/backup-verify.yml) — dry-run restore against an ephemeral Neon branch
- **RPO (Recovery Point Objective):** **5 minutes** — Neon PITR replays WAL up to the chosen second; the app-level JSON dump is 24 h granular as a backstop
- **RTO (Recovery Time Objective):** **30 minutes** — branch + swap DATABASE_URL + redeploy. Measured end-to-end during the last manual restore drill.

## Recovery scenarios

### Scenario A — Bad migration corrupted data (most common)

Use Neon PITR. The app dump is the backstop.

```bash
# 1. STOP WRITES. Flip the maintenance flag so /api/auth/login + every
#    /api/{deals,contacts,...} returns 503 while we work.
vercel env add NEXT_PUBLIC_MAINTENANCE production
#    Set value to "true". Redeploy is automatic on env change.

# 2. Identify the timestamp BEFORE the corruption. Use git log on the
#    schema + the audit log:
gh api repos/preetraval/VYNE/commits --paginate \
  | jq '.[] | select(.commit.message | test("migrate|schema")) | {sha,message:.commit.message,date:.commit.author.date}'

# 3. In the Neon console: Branches → main → Restore → pick the
#    timestamp from step 2 (UTC). Neon creates a NEW branch named
#    `restore-<timestamp>`.

# 4. Capture the new branch's connection strings (Pooled + Direct).
#    They're shown in the branch's connection-string panel.

# 5. Verify against the new branch BEFORE swapping prod:
POSTGRES_PRISMA_URL="<new pooled URL>" \
POSTGRES_URL_NON_POOLING="<new direct URL>" \
  pnpm --filter web exec prisma migrate status
#    Expect: "Database schema is up to date!" If not, the corruption
#    happened during a migration — restore to an earlier point.

# 6. Smoke-check rows survived:
POSTGRES_PRISMA_URL="<new pooled URL>" \
POSTGRES_URL_NON_POOLING="<new direct URL>" \
  pnpm --filter web exec prisma studio
#    Open http://localhost:5555 and spot-check deals, contacts, users.

# 7. Swap prod env to the new branch + redeploy:
vercel env rm POSTGRES_PRISMA_URL production
vercel env rm POSTGRES_URL_NON_POOLING production
vercel env add POSTGRES_PRISMA_URL production         # paste new pooled URL
vercel env add POSTGRES_URL_NON_POOLING production    # paste new direct URL
vercel --prod --yes

# 8. Remove maintenance flag.
vercel env rm NEXT_PUBLIC_MAINTENANCE production
vercel --prod --yes

# 9. Promote the restore branch to be the new primary in Neon (Console
#    → Branches → restore-… → Promote to default). Old `main` becomes
#    `pre-restore-<date>` and stays for 7 days.
```

### Scenario B — App-level data loss (a row was deleted, no migration changed schema)

Use the app's JSON dump. Far faster than full PITR for spot recovery.

```bash
# 1. Pull the most recent dump from Vercel Blob:
curl -sSL -H "Authorization: Bearer $BACKUP_BLOB_TOKEN" \
  "https://blob.vercel-storage.com/vyne-backup-<orgId>-<timestamp>.json" \
  > /tmp/vyne-backup.json

# 2. Dry-run restore against prod (NEVER skip this — confirms the
#    dump is parseable + see what would be written):
curl -sSL https://vyne.vercel.app/api/admin/restore?dryRun=1 \
  -H "Cookie: vyne-token=<admin session>" \
  -H "Content-Type: application/json" \
  --data-binary @/tmp/vyne-backup.json \
  | jq '.summary, .perEntity[].errors'

# 3. If the dry run reports zero errors, do the actual restore:
curl -sSL https://vyne.vercel.app/api/admin/restore?dryRun=0 \
  -H "Cookie: vyne-token=<admin session>" \
  -H "Content-Type: application/json" \
  --data-binary @/tmp/vyne-backup.json \
  | jq '.summary'

# 4. The route uses upsert per row — re-running is idempotent. Rows
#    that didn't exist get created; existing rows get overwritten with
#    the dump's values. Acceptable because dumps are within 24h of
#    "good" state; PITR covers the gap.
```

### Scenario C — Neon outage

Failover plan (untested at scale; expect ~20 min of downtime):

1. Verify the outage on Neon's status page + the audit_events table
   isn't accepting writes.
2. Spin a Neon project in a different region (US East → US West).
3. Restore the most recent dump from Vercel Blob into the new project
   via the Prisma migrate + restore route flow (Scenario B steps 2-4).
4. Swap `POSTGRES_PRISMA_URL` + `POSTGRES_URL_NON_POOLING` in Vercel.
5. Redeploy.
6. When Neon recovers, run a diff between the failover DB and the
   original to identify any writes that happened in between (audit_events
   tagged with `createdAt > <outage-start>` are the source of truth).

## Verification

Weekly cron at [.github/workflows/backup-verify.yml](../../.github/workflows/backup-verify.yml):

1. Pulls the most recent JSON dump from Vercel Blob.
2. POSTs it to `/api/admin/restore?dryRun=1&targetOrgId=verify-org`.
3. Asserts `summary.totalErrors === 0`.
4. On failure: Sentry alert (`backup-verify-failed`) at SEV2.

Run the same verification locally any time:

```bash
./scripts/restore-test.sh
# or against a specific backup:
./scripts/restore-test.sh /tmp/vyne-backup.json
```

## Post-incident

After any restore:

1. Append an entry to `docs/postmortems/<YYYY-MM-DD>-restore.md` with:
   - What happened
   - What was lost (rows + time window)
   - How we noticed
   - RPO/RTO actual numbers vs commitment
   - Why prevention didn't catch it
2. Re-test the restore drill within 30 days.

## Last manual restore drill

- **Date:** _pending — run before paid launch_
- **Branch:** _pending_
- **RTO observed:** _pending_
- **RPO observed:** _pending_
- **Operator notes:** _pending_

> **Action required:** Run `./scripts/restore-test.sh` end-to-end at
> least once before flipping paid launch on. Record the timings above.
