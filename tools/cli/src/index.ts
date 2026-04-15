#!/usr/bin/env node
/**
 * VYNE CLI — entry point.
 * Run `vyne --help` to see all commands.
 */

import { Command } from "commander";
import kleur from "kleur";
import { registerAuth } from "./commands/auth.js";
import { registerIssues } from "./commands/issues.js";
import { registerDocs } from "./commands/docs.js";
import { registerAi } from "./commands/ai.js";
import { registerWebhook } from "./commands/webhook.js";

const program = new Command();

program
  .name("vyne")
  .description(
    "VYNE — issues, docs, ERP, and AI from your terminal.\n\n" +
      "Quick start:\n" +
      "  $ vyne login\n" +
      "  $ vyne issue list --status in_progress\n" +
      "  $ vyne ai query \"Which orders are stuck?\"",
  )
  .version("0.1.0", "-v, --version", "print the CLI version")
  .option("--api-url <url>", "override the API base URL", "https://api.vyne.dev/v1")
  .option("--json", "machine-readable output");

registerAuth(program);
registerIssues(program);
registerDocs(program);
registerAi(program);
registerWebhook(program);

program.on("command:*", (operands: string[]) => {
  console.error(kleur.red(`✖ Unknown command: ${operands[0]}`));
  console.error("Run `vyne --help` to see available commands.");
  process.exit(1);
});

program.parseAsync(process.argv).catch((err) => {
  console.error(kleur.red(`✖ ${err.message ?? err}`));
  process.exit(1);
});
