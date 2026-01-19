import * as vscode from 'vscode';
import { parseAiTagFromLine } from '../../core/tagParser';
import type { ExtensionConfig } from '../../services/config';
import { resolveSyncTargets, type SyncResolvedTarget } from './syncResolver';

const isOkTarget = (
  item: SyncResolvedTarget
): item is Extract<SyncResolvedTarget, { status: 'ok' }> => item.status === 'ok';

const isMissingTarget = (
  item: SyncResolvedTarget
): item is Extract<SyncResolvedTarget, { status: 'missing' }> => item.status === 'missing';

export class SyncHoverProvider implements vscode.HoverProvider {
  constructor(private readonly readConfig: () => ExtensionConfig) {}

  async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<vscode.Hover | null> {
    const config = this.readConfig();
    if (!config.sync.enabled) {return null;}

    const lineText = document.lineAt(position.line).text;
    const tag = parseAiTagFromLine(lineText, position.line);
    if (!tag || tag.kind !== 'sync') {return null;}

    const range = new vscode.Range(
      new vscode.Position(tag.line, tag.startChar),
      new vscode.Position(tag.line, tag.endChar)
    );

    const results = await resolveSyncTargets(document, tag.payload, { expandDirectories: true });
    const markdown = new vscode.MarkdownString();

    const okTargets = results.filter(isOkTarget);
    const missingTargets = results.filter(isMissingTarget);

    if (okTargets.length > 0) {
      markdown.appendMarkdown(`Open linked file${okTargets.length > 1 ? 's' : ''}:\n`);
      for (const item of okTargets) {
        const label = vscode.workspace.asRelativePath(item.uri, false);
        const encoded = encodeURIComponent(JSON.stringify(item.uri));
        const commandUri = vscode.Uri.parse(`command:vscode.open?${encoded}`).toString();
        markdown.appendMarkdown(`- [${label}](${commandUri})\n`);
      }
    }

    if (missingTargets.length > 0) {
      if (okTargets.length > 0) {
        markdown.appendMarkdown('\n');
      }
      markdown.appendMarkdown('Missing targets:\n');
      for (const item of missingTargets) {
        if (item.allowCreate && item.candidateUri) {
          const encoded = encodeURIComponent(JSON.stringify(item.candidateUri));
          const commandUri = vscode.Uri.parse(
            `command:aiTags.createSyncTarget?${encoded}`
          ).toString();
          markdown.appendMarkdown(
            `- ${item.reason} ([Create file](${commandUri}))\n`
          );
        } else {
          markdown.appendMarkdown(`- ${item.reason}\n`);
        }
      }
    }

    markdown.isTrusted = { enabledCommands: ['vscode.open', 'aiTags.createSyncTarget'] };
    return new vscode.Hover(markdown, range);
  }
}
