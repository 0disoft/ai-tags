import * as path from 'path';
import * as vscode from 'vscode';
import { parseAiTagFromLine } from '../../core/tagParser';
import type { ExtensionConfig } from '../../services/config';
import { resolveSyncTargets, type SyncResolvedTarget } from './syncResolver';

const isMissingTarget = (
  item: SyncResolvedTarget
): item is Extract<SyncResolvedTarget, { status: 'missing' }> => item.status === 'missing';

export class SyncCodeActionProvider implements vscode.CodeActionProvider {
  constructor(private readonly readConfig: () => ExtensionConfig) {}

  async provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range,
    context: vscode.CodeActionContext
  ): Promise<vscode.CodeAction[]> {
    const config = this.readConfig();
    if (!config.sync.enabled) {return [];}
    if (context.diagnostics.length === 0) {return [];}

    const lineText = document.lineAt(range.start.line).text;
    const tag = parseAiTagFromLine(lineText, range.start.line);
    if (!tag || tag.kind !== 'sync') {return [];}

    const results = await resolveSyncTargets(document, tag.payload, { expandDirectories: false });
    const missing = results
      .filter(isMissingTarget)
      .filter((item) => item.allowCreate && item.candidateUri);
    if (missing.length === 0) {return [];}

    const actions: vscode.CodeAction[] = [];
    for (const item of missing) {
      const candidateUri = item.candidateUri;
      if (!candidateUri) {continue;}
      const action = new vscode.CodeAction(
        `Create ${item.token}`,
        vscode.CodeActionKind.QuickFix
      );
      action.command = {
        command: 'aiTags.createSyncTarget',
        title: 'Create file',
        arguments: [candidateUri]
      };
      action.diagnostics = [...context.diagnostics];
      action.isPreferred = missing.length === 1;
      actions.push(action);
    }

    return actions;
  }
}

export const createSyncTarget = async (uri: vscode.Uri): Promise<void> => {
  try {
    await vscode.workspace.fs.stat(uri);
  } catch {
    const dirPath = path.dirname(uri.fsPath);
    await vscode.workspace.fs.createDirectory(vscode.Uri.file(dirPath));
    await vscode.workspace.fs.writeFile(uri, new Uint8Array());
  }

  const document = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(document, { preview: false });
};
