import * as vscode from 'vscode';
import { parseAiTagFromLine } from '../../core/tagParser';
import type { ExtensionConfig } from '../../services/config';
import { resolveSyncTargets } from './syncResolver';

export class SyncInlayProvider implements vscode.InlayHintsProvider {
  constructor(private readonly readConfig: () => ExtensionConfig) {}

  async provideInlayHints(
    document: vscode.TextDocument,
    range: vscode.Range
  ): Promise<vscode.InlayHint[]> {
    const config = this.readConfig();
    if (!config.sync.enabled) return [];

    const hints: vscode.InlayHint[] = [];
    const startLine = range.start.line;
    const endLine = range.end.line;

    for (let line = startLine; line <= endLine; line += 1) {
      const lineText = document.lineAt(line).text;
      const tag = parseAiTagFromLine(lineText, line);
      if (!tag || tag.kind !== 'sync') continue;

      const results = await resolveSyncTargets(document, tag.payload, { expandDirectories: false });
      const hasTarget = results.some((item) => item.status === 'ok');
      if (!hasTarget) continue;

      const position = new vscode.Position(line, lineText.length);
      const label = new vscode.InlayHintLabelPart('🔗');
      const target = results.find((item) => item.status === 'ok');
      if (!target) continue;
      label.command = {
        title: 'Open linked file',
        command: 'vscode.open',
        arguments: [target.uri]
      };
      label.tooltip = 'Open linked file';

      const hint = new vscode.InlayHint(position, [label], vscode.InlayHintKind.Type);
      hint.paddingLeft = true;
      hints.push(hint);
    }

    return hints;
  }
}
