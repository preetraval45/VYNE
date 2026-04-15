import * as vscode from "vscode";
import type { VyneClient } from "./client";

export function registerCommitMessageHelper(
  context: vscode.ExtensionContext,
  client: VyneClient,
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("vyne.commitMessageHelper", async () => {
      // Pull the diff from the SCM Git extension
      const gitExt = vscode.extensions.getExtension("vscode.git");
      if (!gitExt) {
        vscode.window.showErrorMessage("VYNE: Git extension not available.");
        return;
      }
      // Activate Git extension if needed
      const api = gitExt.isActive
        ? gitExt.exports
        : await gitExt.activate();
      const git = api?.getAPI?.(1);
      const repo = git?.repositories?.[0];
      if (!repo) {
        vscode.window.showErrorMessage("VYNE: no Git repository in workspace.");
        return;
      }

      const diff = (await repo.diff(true)) as string;
      if (!diff || diff.trim().length === 0) {
        vscode.window.showWarningMessage(
          "VYNE: nothing staged. Stage some files first.",
        );
        return;
      }

      const suggestion = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "VYNE: drafting commit message…",
        },
        () => client.suggestCommit(diff),
      );

      if (suggestion) {
        repo.inputBox.value = suggestion;
        vscode.window.showInformationMessage(
          "VYNE: commit message inserted into the SCM box.",
        );
      }
    }),
  );
}
