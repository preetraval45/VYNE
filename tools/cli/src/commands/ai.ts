import type { Command } from "commander";
import kleur from "kleur";
import ora from "ora";
import { api } from "../config.js";

interface AiAnswer {
  answer: string;
  reasoningSteps?: string[];
}

export function registerAi(program: Command): void {
  const ai = program.command("ai").description("Ask VYNE AI about your business");

  ai
    .command("query <question...>")
    .description("Run a natural-language query against the AI orchestrator")
    .option("--trace", "show the agent's reasoning steps")
    .action(async (parts: string[], opts: { trace?: boolean }) => {
      const question = parts.join(" ");
      const spinner = ora("Thinking…").start();
      try {
        const res = await api<AiAnswer>("POST", "/ai/query", { question });
        spinner.stop();
        console.log(kleur.bold(question));
        console.log(kleur.cyan("→ ") + res.answer);
        if (opts.trace && res.reasoningSteps?.length) {
          console.log();
          console.log(kleur.dim("Reasoning trace:"));
          for (const step of res.reasoningSteps) {
            console.log(kleur.dim("  • ") + step);
          }
        }
      } catch (e) {
        spinner.fail();
        throw e;
      }
    });
}
