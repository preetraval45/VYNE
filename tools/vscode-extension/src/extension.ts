import * as vscode from "vscode";
import { VyneClient } from "./client";
import { registerIssueDecorations } from "./decorations";
import { registerCommitMessageHelper } from "./commitHelper";

export function activate(context: vscode.ExtensionContext): void {
  const client = new VyneClient(context);

  // ── Sign in / out ────────────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand("vyne.signIn", async () => {
      const cfg = vscode.workspace.getConfiguration("vyne");
      const apiUrl = cfg.get<string>("apiUrl") ?? "https://api.vyne.dev/v1";
      const loginUrl = `${apiUrl.replace(/\/v1$/, "")}/cli/login`;
      const token = await vscode.window.showInputBox({
        prompt: `Paste a VYNE personal API key (create one at ${loginUrl})`,
        password: true,
        ignoreFocusOut: true,
      });
      if (!token) return;
      await context.secrets.store("vyne.apiKey", token.trim());
      vscode.window.showInformationMessage("VYNE: signed in.");
    }),

    vscode.commands.registerCommand("vyne.signOut", async () => {
      await context.secrets.delete("vyne.apiKey");
      vscode.window.showInformationMessage("VYNE: signed out.");
    }),
  );

  // ── Open issue from line ─────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand("vyne.openIssueFromLine", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      const line = editor.document.lineAt(editor.selection.active.line).text;
      const match = line.match(/\b([A-Z]{2,6}-\d+|iss_[a-z0-9]+)\b/);
      if (!match) {
        vscode.window.showWarningMessage(
          "VYNE: no issue ID found on this line.",
        );
        return;
      }
      const apiUrl = vscode.workspace
        .getConfiguration("vyne")
        .get<string>("apiUrl");
      const baseWeb = apiUrl?.replace("api.", "").replace("/v1", "") ??
        "https://vyne.vercel.app";
      void vscode.env.openExternal(
        vscode.Uri.parse(`${baseWeb}/projects?issue=${match[1]}`),
      );
    }),
  );

  // ── Search docs (Quick Pick) ─────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand("vyne.searchDocs", async () => {
      const query = await vscode.window.showInputBox({
        prompt: "Search VYNE docs",
        placeHolder: "e.g. onboarding, postmortem, api keys",
      });
      if (!query) return;
      const docs = await client.searchDocs(query);
      const pick = await vscode.window.showQuickPick(
        docs.map((d) => ({
          label: d.title,
          description: d.module,
          detail: d.snippet,
          docId: d.id,
          href: d.href,
        })),
        { matchOnDetail: true, placeHolder: `${docs.length} results` },
      );
      if (pick?.href) {
        void vscode.env.openExternal(vscode.Uri.parse(pick.href));
      }
    }),
  );

  // ── Ask AI about the active selection ────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand("vyne.askAi", async () => {
      const editor = vscode.window.activeTextEditor;
      const selectionText = editor?.document.getText(editor.selection) ?? "";
      const question = await vscode.window.showInputBox({
        prompt: selectionText
          ? "Ask VYNE AI about this selection"
          : "Ask VYNE AI",
        placeHolder: "What does this code do? / Find related issues / …",
      });
      if (!question) return;
      const answer = await client.askAi(question, selectionText);
      const doc = await vscode.workspace.openTextDocument({
        language: "markdown",
        content: `# ${question}\n\n${answer.answer}\n\n${(answer.reasoningSteps ?? [])
          .map((s) => `- ${s}`)
          .join("\n")}`,
      });
      void vscode.window.showTextDocument(doc, { preview: true });
    }),
  );

  // ── Inline issue badges (gutter + hover) ─────────────────────────
  registerIssueDecorations(context, client);

  // ── Commit message helper (powered by AI) ────────────────────────
  registerCommitMessageHelper(context, client);

  // Status bar
  const status = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100,
  );
  status.text = "$(sparkle) VYNE";
  status.tooltip = "Click for VYNE commands";
  status.command = "vyne.searchDocs";
  status.show();
  context.subscriptions.push(status);
}

export function deactivate(): void {
  // nothing to clean up
}
