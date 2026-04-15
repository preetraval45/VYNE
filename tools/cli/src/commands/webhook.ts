import type { Command } from "commander";
import kleur from "kleur";
import ora from "ora";
import { api } from "../config.js";

interface Webhook {
  id: string;
  url: string;
  events: string[];
  active: boolean;
}

export function registerWebhook(program: Command): void {
  const wh = program.command("webhook").description("Manage outbound webhooks");

  wh
    .command("list")
    .description("List configured webhook endpoints")
    .action(async () => {
      const spinner = ora("Fetching webhooks…").start();
      try {
        const res = await api<Webhook[]>("GET", "/webhooks");
        spinner.stop();
        if (res.length === 0) {
          console.log(kleur.dim("No webhooks configured."));
          return;
        }
        for (const w of res) {
          console.log(
            `${kleur.gray(w.id)}  ${w.active ? kleur.green("●") : kleur.red("○")}  ${kleur.bold(w.url)}`,
          );
          console.log(kleur.dim(`    ${w.events.join(", ")}`));
        }
      } catch (e) {
        spinner.fail();
        throw e;
      }
    });

  wh
    .command("test <event>")
    .description(
      "Send a test fixture for the given event (e.g. order.created) to all subscribers",
    )
    .action(async (event: string) => {
      const spinner = ora(`Dispatching ${event}…`).start();
      try {
        await api("POST", "/webhooks/test", { event });
        spinner.succeed(`Test ${kleur.cyan(event)} dispatched`);
      } catch (e) {
        spinner.fail();
        throw e;
      }
    });
}
