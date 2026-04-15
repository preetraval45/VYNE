import type { Command } from "commander";
import kleur from "kleur";
import ora from "ora";
import { readFile } from "node:fs/promises";
import { api } from "../config.js";

export function registerDocs(program: Command): void {
  const docs = program
    .command("docs")
    .description("Sync local Markdown files into VYNE docs");

  docs
    .command("sync <file> <docPath>")
    .description("Upload a local Markdown file to a docs path")
    .action(async (file: string, docPath: string) => {
      const spinner = ora(`Reading ${file}…`).start();
      let content: string;
      try {
        content = await readFile(file, "utf8");
      } catch (e) {
        spinner.fail(`Could not read ${file}`);
        throw e;
      }
      spinner.text = `Uploading ${docPath}…`;
      try {
        await api("POST", "/docs/sync", { path: docPath, body: content });
        spinner.succeed(
          `Synced ${kleur.cyan(file)} → ${kleur.cyan(docPath)} (${content.length} bytes)`,
        );
      } catch (e) {
        spinner.fail();
        throw e;
      }
    });
}
