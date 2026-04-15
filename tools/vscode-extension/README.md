# VYNE for VS Code

VYNE issues, docs, and AI without leaving your editor.

## Features

- **Inline issue badges** — gutter + hover for `ENG-43`, `iss_8k4j2n`, etc.
- **Doc search** — ⌘P → "VYNE: Search docs"
- **AI scoped to selection** — right-click → "VYNE: Ask AI about this file"
- **Commit message helper** — drafts a message from your staged diff and drops it into the SCM input box

## Setup

1. Install: `ext install vyne.vyne-vscode`
2. Run `VYNE: Sign in` and paste your personal API key (Settings → Developer in [vyne.vercel.app](https://vyne.vercel.app))
3. Done — try `VYNE: Search docs` from the command palette

## Configuration

| Setting | Default | Description |
|---|---|---|
| `vyne.apiUrl` | `https://api.vyne.dev/v1` | API base URL |
| `vyne.apiKey` | (use Sign in instead) | Personal API key |
| `vyne.showInlineIssueBadges` | `true` | Decorate issue IDs with a 🔗 badge |
