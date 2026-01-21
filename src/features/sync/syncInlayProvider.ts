import * as vscode from 'vscode';
import { parseAiTagFromLine } from '../../core/tagParser';
import type { ExtensionConfig } from '../../services/config';
import { resolveSyncTargets, type LineRange } from './syncResolver';
import { findSymbolInFile } from './syncSymbolResolver';

/**
 * 줄/심볼 정보를 기반으로 vscode.open 명령 인자 생성
 */
const buildOpenArgs = async (
  uri: vscode.Uri,
  lineRange?: LineRange,
  symbol?: string
): Promise<unknown[]> => {
  // 심볼이 있으면 심볼 위치 검색
  if (symbol) {
    const result = await findSymbolInFile(uri, symbol);
    if (result.status === 'found') {
      return [uri, { selection: new vscode.Range(result.line, result.character, result.line, result.character) }];
    }
  }

  // 줄 번호가 있으면 해당 줄로 이동
  if (lineRange) {
    const startLine = lineRange.start - 1;
    const endLine = lineRange.end ? lineRange.end - 1 : startLine;
    return [uri, { selection: new vscode.Range(startLine, 0, endLine, 0) }];
  }

  // 기본: 파일만 열기
  return [uri];
};

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
      const args = await buildOpenArgs(target.uri, target.lineRange, target.symbol);
      label.command = {
        title: 'Open linked file',
        command: 'vscode.open',
        arguments: args
      };
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

