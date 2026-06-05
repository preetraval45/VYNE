#!/usr/bin/env bash
# PH-F R3 — One-shot script to apply branch protection to `main`.
# Prereqs:
#   1. `gh` CLI installed (https://cli.github.com)
#   2. Authenticated as a repo admin: `gh auth login`
# Usage:
#   ./scripts/apply-branch-protection.sh
# Idempotent — re-running just overwrites with the same payload.

set -euo pipefail

# Resolve the repo's owner/name from origin so this works for forks.
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
echo "Applying branch protection to ${REPO}/main..."

# The Branch Protection API needs PUT with the full payload; gh's
# `--input` flag streams a JSON file directly to the API.
gh api \
  --method PUT \
  --header "Accept: application/vnd.github+json" \
  --header "X-GitHub-Api-Version: 2022-11-28" \
  "repos/${REPO}/branches/main/protection" \
  --input .github/branch-protection.json

echo ""
echo "✓ Branch protection applied. Status checks required for merge:"
echo "  - Typecheck (tsc --noEmit)"
echo "  - Unit tests (vitest + coverage)"
echo "  - Build (next build)"
echo ""
echo "Lint stays soft (continue-on-error) until the a11y backlog is cleaned."
echo "To verify in the UI: gh browse -s -- 'settings/branches'"
