# vyne — VYNE CLI

Run VYNE from your terminal: issues, docs, ERP, AI.

```bash
npm install -g vyne
vyne login
vyne issue list --status in_progress
vyne ai query "Which orders are stuck?" --trace
```

## Commands

- `vyne login [--token]` — sign in via browser, or save an API key directly
- `vyne whoami` — show current user/key
- `vyne issue list|create|close` — manage issues
- `vyne docs sync <file> <docPath>` — upload Markdown to a docs path
- `vyne ai query <question>` — natural-language query against the AI orchestrator
- `vyne webhook list|test <event>` — manage outbound webhooks

Run `vyne --help` for the full reference.

## Configuration

Stored at `~/.vyne/config.json`. Override the API base URL with `--api-url`
or the `VYNE_API_URL` env var.
