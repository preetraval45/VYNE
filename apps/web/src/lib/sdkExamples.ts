/**
 * SDK / connector quick-start snippets (21.3 / 21.5 / 21.9).
 *
 * Each entry maps an integration target to the exact one-liner a
 * developer needs. Surfaced from Settings → Developer → SDKs so the
 * pitch isn't a docs link but copy-paste working code.
 *
 *   <pre>{SDK_EXAMPLES.javascript.snippet}</pre>
 *
 * Updates to this file are the source of truth for the marketplace
 * "Get started" tab — keep snippets short, runnable, no auth glue.
 */

export interface SdkExample {
  id: string;
  language:
    | "javascript"
    | "typescript"
    | "python"
    | "go"
    | "ruby"
    | "curl"
    | "graphql"
    | "zapier"
    | "make";
  title: string;
  blurb: string;
  /** Working snippet — copy + paste runnable. */
  snippet: string;
  /** Optional package name + install command. */
  install?: string;
  /** External docs link. */
  docsUrl?: string;
}

export const SDK_EXAMPLES: SdkExample[] = [
  {
    id: "javascript-list-deals",
    language: "javascript",
    title: "List deals (Node.js / fetch)",
    blurb:
      "Pure fetch — no SDK install needed. Works on Node 18+, Cloudflare Workers, Deno.",
    snippet: `const res = await fetch("https://vyne.vercel.app/api/deals?limit=20", {
  headers: { Authorization: \`Bearer \${process.env.VYNE_API_KEY}\` },
});
const { items, cursor } = await res.json();
console.log(\`Fetched \${items.length} deals; next cursor: \${cursor ?? "(end)"}\`);`,
  },
  {
    id: "typescript-create-deal",
    language: "typescript",
    title: "Create a deal (TypeScript)",
    blurb: "Strongly-typed call against the same REST surface.",
    install: `npm i @vyne/sdk`,
    snippet: `import { VyneClient } from "@vyne/sdk";

const vyne = new VyneClient({ apiKey: process.env.VYNE_API_KEY! });
const deal = await vyne.deals.create({
  company: "Acme Corp",
  contact: "Sarah Kim",
  value: 42_000,
  stage: "Negotiation",
});
console.log("Created", deal.id);`,
  },
  {
    id: "python-search",
    language: "python",
    title: "Workspace search (Python)",
    blurb: "Async aiohttp — drop into a FastAPI handler or a notebook.",
    install: `pip install vyne-sdk`,
    snippet: `import os
from vyne import Vyne

vyne = Vyne(api_key=os.environ["VYNE_API_KEY"])
hits = vyne.search("from:sarah type:deal acme")
for h in hits:
    print(h.title, h.score)`,
  },
  {
    id: "go-list-tasks",
    language: "go",
    title: "List tasks (Go)",
    blurb: "Single-file client using the standard library.",
    snippet: `req, _ := http.NewRequest("GET", "https://vyne.vercel.app/api/tasks?limit=50", nil)
req.Header.Set("Authorization", "Bearer "+os.Getenv("VYNE_API_KEY"))
res, err := http.DefaultClient.Do(req)
if err != nil { log.Fatal(err) }
defer res.Body.Close()
var body struct{ Items []map[string]any \`json:"items"\` }
json.NewDecoder(res.Body).Decode(&body)
fmt.Printf("got %d tasks\\n", len(body.Items))`,
  },
  {
    id: "curl-webhook",
    language: "curl",
    title: "Send a signed webhook",
    blurb: "Validates a delivery without writing any client code.",
    snippet: `curl -X POST https://vyne.vercel.app/api/webhooks/dispatch \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://hooks.slack.com/services/...",
    "secret": "whsec_test",
    "eventKey": "deal.won",
    "payload": { "id": "DEAL-42", "value": 12000 }
  }'`,
  },
  {
    id: "graphql-stub",
    language: "graphql",
    title: "GraphQL gateway (preview)",
    blurb:
      "GraphQL is wrapped over the REST surface; same auth (`Authorization: Bearer …`).",
    snippet: `# Endpoint: https://vyne.vercel.app/api/graphql
query DealsThisWeek($since: DateTime!) {
  deals(updatedAfter: $since, first: 50) {
    edges { node { id company value stage probability } }
    pageInfo { endCursor hasNextPage }
  }
}`,
    docsUrl: "https://vyne.vercel.app/api/openapi",
  },
  {
    id: "zapier-trigger",
    language: "zapier",
    title: "Zapier — trigger on deal-won",
    blurb:
      "Zapier auth is a Bearer key; map every Zap to one of the events listed at /api/openapi.",
    snippet: `Trigger:        New Deal Won
Trigger URL:    https://vyne.vercel.app/api/deals?stage=Won&since={{since}}
Auth header:    Authorization: Bearer {{api_key}}
Output sample:  { "id": "DEAL-42", "company": "Acme", "value": 42000 }`,
  },
  {
    id: "make-action",
    language: "make",
    title: "Make.com — create-task action",
    blurb: "Same REST surface; Make calls the action with the bundle data.",
    snippet: `URL:        https://vyne.vercel.app/api/tasks
Method:     POST
Headers:    Authorization: Bearer {{1.api_key}}
Body type:  Raw (JSON)
Body:       { "title": "{{1.title}}", "project": "{{1.project}}" }`,
  },
];

export function exampleByLanguage(language: string): SdkExample[] {
  return SDK_EXAMPLES.filter((s) => s.language === language);
}
