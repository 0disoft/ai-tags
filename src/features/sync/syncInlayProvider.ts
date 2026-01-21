// @AI:CONTEXT Displays inlay hints (clickable links) at end of @AI:SYNC tag lines
// @AI:SYNC ./syncResolver.ts, ./syncCommands.ts
import * as vscode from 'vscode';
import { parseAiTagFromLine } from '../../core/tagParser';
import type { ExtensionConfig } from '../../services/config';
import type { OpenSyncTargetArgs } from './syncCommands';
import { resolveSyncTargets, type LineRange } from './syncResolver';

// @AI:CONTEXT Builds aiTags.openSyncTarget command arguments
const buildOpenArgs = (
  uri: vscode.Uri,
  lineRange?: LineRange,
  symbol?: string
): OpenSyncTargetArgs => ({
  uri: uri.toString(),
  line: lineRange?.start,
  endLine: lineRange?.end,
  symbol
});

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
      const target = results.find((item) => item.status === 'ok');
      if (!target || target.status !== 'ok') continue;

      const position = new vscode.Position(line, lineText.length);
      const label = new vscode.InlayHintLabelPart('🔗');
      const args = buildOpenArgs(target.uri, target.lineRange, target.symbol);

      // Use custom command if line/symbol info exists, otherwise vscode.open
      if (target.lineRange || target.symbol) {
        label.command = {
          title: 'Open linked file',
          command: 'aiTags.openSyncTarget',
          arguments: [args]
        };
      } else {
        label.command = {
          title: 'Open linked file',
          command: 'vscode.open',
          arguments: [target.uri]
        };
      }

      label.tooltip = target.symbol
        ? `Open ${target.symbol}`
        : target.lineRange
          ? `Open L${target.lineRange.start}${target.lineRange.end ? `-L${target.lineRange.end}` : ''}`
          : 'Open linked file';

      const hint = new vscode.InlayHint(position, [label], vscode.InlayHintKind.Type);
      hint.paddingLeft = true;
      hints.push(hint);
    }

    return hints;
  }
}


