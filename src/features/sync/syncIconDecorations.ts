import * as vscode from 'vscode';
import { parseAiTagFromLine } from '../../core/tagParser';
import type { ExtensionConfig } from '../../services/config';
import { resolveSyncTargets } from './syncResolver';

const isInlayHintsEnabled = (document: vscode.TextDocument): boolean => {
  const config = vscode.workspace.getConfiguration('editor', document.uri);
  const setting = config.get<string | boolean>('inlayHints.enabled');

  if (typeof setting === 'boolean') {return setting;}
  if (typeof setting !== 'string') {return true;}

  return setting === 'on' || setting === 'onUnlessPressed';
};

export class SyncIconDecorationManager {
  private readonly readConfig: () => ExtensionConfig;
  private readonly decorationType: vscode.TextEditorDecorationType;

  constructor(readConfig: () => ExtensionConfig) {
    this.readConfig = readConfig;
    this.decorationType = vscode.window.createTextEditorDecorationType({
      after: {
        contentText: '🔗',
        margin: '0 0 0 6px',
        color: new vscode.ThemeColor('charts.blue')
      }
    });
  }

  async update(editor?: vscode.TextEditor): Promise<void> {
    if (!editor) {return;}

    const config = this.readConfig();
    if (!config.sync.enabled) {
      this.clear(editor);
      return;
    }

    if (isInlayHintsEnabled(editor.document)) {
      this.clear(editor);
      return;
    }

    const decorations: vscode.DecorationOptions[] = [];
    for (let line = 0; line < editor.document.lineCount; line += 1) {
      const lineText = editor.document.lineAt(line).text;
      const tag = parseAiTagFromLine(lineText, line);
      if (!tag || tag.kind !== 'sync') {continue;}

      const results = await resolveSyncTargets(editor.document, tag.payload, { expandDirectories: false });
      const hasTarget = results.some((item) => item.status === 'ok');
      if (!hasTarget) {continue;}

      const range = new vscode.Range(
        new vscode.Position(line, lineText.length),
        new vscode.Position(line, lineText.length)
      );
      decorations.push({ range });
    }

    editor.setDecorations(this.decorationType, decorations);
  }

  clear(editor?: vscode.TextEditor): void {
    if (!editor) {return;}
    editor.setDecorations(this.decorationType, []);
  }

  dispose(): void {
    this.decorationType.dispose();
  }
}
