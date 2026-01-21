import * as vscode from 'vscode';
import { parseAiTagFromLine } from '../../core/tagParser';
import type { ExtensionConfig } from '../../services/config';
import { resolveSyncTargets, type LineRange, type SyncResolvedTarget } from './syncResolver';
import { findSymbolInFile } from './syncSymbolResolver';

const isOkTarget = (
  item: SyncResolvedTarget
): item is Extract<SyncResolvedTarget, { status: 'ok' }> => item.status === 'ok';

const isMissingTarget = (
  item: SyncResolvedTarget
): item is Extract<SyncResolvedTarget, { status: 'missing' }> => item.status === 'missing';

/**
 * 줄/심볼 정보를 기반으로 vscode.open 명령 URI 생성
 */
const buildOpenCommand = async (
  uri: vscode.Uri,
  lineRange?: LineRange,
  symbol?: string
): Promise<string> => {
  // 심볼이 있으면 심볼 위치 검색
  if (symbol) {
    const result = await findSymbolInFile(uri, symbol);
    if (result.status === 'found') {
      const options = {
        selection: new vscode.Range(result.line, result.character, result.line, result.character)
      };
      const args = [uri, options];
      const encoded = encodeURIComponent(JSON.stringify(args));
      return `command:vscode.open?${encoded}`;
    }
  }

  // 줄 번호가 있으면 해당 줄로 이동
  if (lineRange) {
    const startLine = lineRange.start - 1; // 0-indexed
    const endLine = lineRange.end ? lineRange.end - 1 : startLine;
    const options = {
      selection: new vscode.Range(startLine, 0, endLine, 0)
    };
    const args = [uri, options];
    const encoded = encodeURIComponent(JSON.stringify(args));
    return `command:vscode.open?${encoded}`;
  }

  // 기본: 파일만 열기
  const encoded = encodeURIComponent(JSON.stringify(uri));
  return `command:vscode.open?${encoded}`;
};

/**
 * 라벨에 줄/심볼 정보 추가
 */
const buildLabel = (
  relativePath: string,
  lineRange?: LineRange,
  symbol?: string
): string => {
  if (symbol) {
    return `${relativePath}#${symbol}`;
  }
  if (lineRange) {
    const rangeStr = lineRange.end
      ? `L${lineRange.start}-L${lineRange.end}`
      : `L${lineRange.start}`;
    return `${relativePath}:${rangeStr}`;
  }
  return relativePath;
};

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
        const relativePath = vscode.workspace.asRelativePath(item.uri, false);
        const label = buildLabel(relativePath, item.lineRange, item.symbol);
        const commandUri = await buildOpenCommand(item.uri, item.lineRange, item.symbol);
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

