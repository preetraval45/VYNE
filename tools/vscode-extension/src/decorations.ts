import * as vscode from "vscode";
import type { VyneClient } from "./client";

const ISSUE_REGEX = /\b([A-Z]{2,6}-\d+|iss_[a-z0-9]{6,})\b/g;

export function registerIssueDecorations(
  context: vscode.ExtensionContext,
  _client: VyneClient,
): void {
  const decoration = vscode.window.createTextEditorDecorationType({
    after: {
      contentText: " 🔗",
      color: new vscode.ThemeColor("textLink.foreground"),
      margin: "0 0 0 4px",
    },
  });
  context.subscriptions.push(decoration);

  function refresh(editor?: vscode.TextEditor) {
    if (!editor) return;
    const cfg = vscode.workspace.getConfiguration("vyne");
    if (!cfg.get<boolean>("showInlineIssueBadges", true)) {
      editor.setDecorations(decoration, []);
      return;
    }
    const ranges: vscode.DecorationOptions[] = [];
    const text = editor.document.getText();
    for (const match of text.matchAll(ISSUE_REGEX)) {
      if (match.index === undefined) continue;
      const start = editor.document.positionAt(match.index);
      const end = editor.document.positionAt(match.index + match[0].length);
      ranges.push({
        range: new vscode.Range(start, end),
        hoverMessage: new vscode.MarkdownString(
          `[**Open ${match[0]} in VYNE**](command:vyne.openIssueFromLine)`,
        ),
      });
    }
    editor.setDecorations(decoration, ranges);
  }

  refresh(vscode.window.activeTextEditor);
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(refresh),
    vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document === vscode.window.activeTextEditor?.document) {
        refresh(vscode.window.activeTextEditor);
      }
    }),
  );
}
