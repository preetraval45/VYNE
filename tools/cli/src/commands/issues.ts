import type { Command } from "commander";
import kleur from "kleur";
import ora from "ora";
import { api } from "../config.js";

interface Issue {
  id: string;
  title: string;
  status: string;
  priority?: string;
  assigneeId?: string | null;
}

export function registerIssues(program: Command): void {
  const issue = program
    .command("issue")
    .description("Create, list, and update issues");

  issue
    .command("list")
    .description("List recent issues")
    .option("-s, --status <status>", "filter by status (todo, in_progress, done…)")
    .option("-l, --limit <n>", "max items to show", "20")
    .action(async (opts: { status?: string; limit?: string }) => {
      const spinner = ora("Fetching issues…").start();
      try {
        const params = new URLSearchParams();
        if (opts.status) params.set("status", opts.status);
        if (opts.limit) params.set("limit", opts.limit);
        const res = await api<{ data: Issue[] }>(
          "GET",
          `/issues?${params.toString()}`,
        );
        spinner.stop();
        if (res.data.length === 0) {
          console.log(kleur.dim("No issues match."));
          return;
        }
        for (const issue of res.data) {
          const tag = priorityColor(issue.priority);
          console.log(
            `${kleur.gray(issue.id.slice(0, 10))}  ${tag}  ${kleur.bold(issue.title)}  ${statusBadge(issue.status)}`,
          );
        }
      } catch (e) {
        spinner.fail();
        throw e;
      }
    });

  issue
    .command("create")
    .description("Create a new issue")
    .requiredOption("-t, --title <title>", "issue title")
    .option("-d, --description <desc>", "long-form description")
    .option("-p, --priority <p>", "low | medium | high | urgent", "medium")
    .action(async (opts: {
      title: string;
      description?: string;
      priority?: string;
    }) => {
      const spinner = ora("Creating issue…").start();
      try {
        const res = await api<Issue>("POST", "/issues", {
          title: opts.title,
          description: opts.description,
          priority: opts.priority,
        });
        spinner.succeed(`Created ${kleur.cyan(res.id)} — ${res.title}`);
      } catch (e) {
        spinner.fail();
        throw e;
      }
    });

  issue
    .command("close <id>")
    .description("Close an issue (sets status to done)")
    .action(async (id: string) => {
      const spinner = ora(`Closing ${id}…`).start();
      try {
        await api("PATCH", `/issues/${id}`, { status: "done" });
        spinner.succeed(`Closed ${kleur.green(id)}`);
      } catch (e) {
        spinner.fail();
        throw e;
      }
    });
}

function priorityColor(p?: string): string {
  if (p === "urgent") return kleur.bgRed().white(" URGENT ");
  if (p === "high") return kleur.bgYellow().black(" HIGH ");
  if (p === "low") return kleur.bgBlue().white(" LOW ");
  return kleur.bgGray().white(" MED ");
}

function statusBadge(s: string): string {
  if (s === "done") return kleur.green(`(${s})`);
  if (s === "in_progress") return kleur.yellow(`(${s})`);
  return kleur.dim(`(${s})`);
}
