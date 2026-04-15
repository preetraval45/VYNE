import type { Command } from "commander";
import kleur from "kleur";
import open from "open";
import { loadConfig, saveConfig } from "../config.js";

export function registerAuth(program: Command): void {
  program
    .command("login")
    .description("Authenticate with VYNE — opens a browser window")
    .option("-t, --token <token>", "use an API key directly instead of OAuth")
    .action(async (opts: { token?: string }) => {
      if (opts.token) {
        await saveConfig({ apiKey: opts.token });
        console.log(kleur.green("✔ Saved API key to ~/.vyne/config.json"));
        return;
      }
      const cfg = await loadConfig();
      const loginUrl = `${cfg.apiUrl.replace(/\/v1$/, "")}/cli/login`;
      console.log(`Opening ${kleur.cyan(loginUrl)} …`);
      await open(loginUrl);
      console.log(
        kleur.dim(
          "After authorising, paste the displayed token with: vyne login --token <token>",
        ),
      );
    });

  program
    .command("logout")
    .description("Forget the saved API key")
    .action(async () => {
      await saveConfig({ apiKey: undefined, user: undefined });
      console.log(kleur.green("✔ Logged out"));
    });

  program
    .command("whoami")
    .description("Show the current authenticated user")
    .action(async () => {
      const cfg = await loadConfig();
      if (!cfg.apiKey) {
        console.log(kleur.yellow("Not logged in. Run `vyne login`."));
        return;
      }
      console.log(`API: ${kleur.cyan(cfg.apiUrl)}`);
      console.log(
        `Key: ${kleur.dim(cfg.apiKey.slice(0, 12) + "…" + cfg.apiKey.slice(-4))}`,
      );
      if (cfg.user) {
        console.log(`User: ${cfg.user.name} <${cfg.user.email}> (${cfg.user.id})`);
      }
    });
}
