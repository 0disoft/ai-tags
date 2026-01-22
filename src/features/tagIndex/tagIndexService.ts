import * as vscode from 'vscode';
import { parseAiTagKeyFromLine } from '../../core/tagParser';
import { buildMarkdownFenceMask, isMarkdownDocument } from '../../core/markdownFence';
import type { TagIndexEntry, TagIndexGroup } from './tagIndexTypes';

type LineInfo = {
  line: number;
  text: string;
};

const tagIndexAllowlist = new Set(['@AI:EXPIRY']);

const getLineInfo = (document: vscode.TextDocument, line: number): LineInfo => ({
  line,
  text: document.lineAt(line).text
});

const readDocumentLines = (document: vscode.TextDocument): LineInfo[] => {
  const lines: LineInfo[] = [];
  for (let line = 0; line < document.lineCount; line += 1) {
    lines.push(getLineInfo(document, line));
  }
  return lines;
};

export class TagIndexService {
  private readonly entriesByUri = new Map<string, TagIndexEntry[]>();
  private readonly onDidChangeEmitter = new vscode.EventEmitter<void>();
  readonly onDidChange = this.onDidChangeEmitter.event;

  async scanWorkspace(): Promise<void> {
    this.entriesByUri.clear();
    const files = await vscode.workspace.findFiles('**/*', '**/{node_modules,out,dist,.git}/**');
    await Promise.all(
      files.map(async (file) => {
        const document = await vscode.workspace.openTextDocument(file);
        this.upsertDocument(document);
      })
    );
    this.onDidChangeEmitter.fire();
  }

  upsertDocument(document: vscode.TextDocument): void {
    const entries: TagIndexEntry[] = [];
    const fenceMask = isMarkdownDocument(document)
      ? buildMarkdownFenceMask(document)
      : null;
    for (const info of readDocumentLines(document)) {
      if (fenceMask && fenceMask[info.line]) {continue;}
      const match = parseAiTagKeyFromLine(info.text, info.line);
      if (!match) {continue;}
      if (!tagIndexAllowlist.has(match.tagKey)) {continue;}
      const payload = info.text.slice(match.endChar).trim();
      const range = new vscode.Range(
        new vscode.Position(info.line, match.startChar),
        new vscode.Position(info.line, match.endChar)
      );
      const preview = payload.trim();
      entries.push({
        key: match.tagKey,
        payload,
        fileUri: document.uri,
        line: info.line,
        range,
        preview
      });
    }
    if (entries.length === 0) {
      this.entriesByUri.delete(document.uri.toString());
    } else {
      this.entriesByUri.set(document.uri.toString(), entries);
    }
  }

  removeDocument(document: vscode.TextDocument): void {
    this.entriesByUri.delete(document.uri.toString());
  }

  getGroups(): TagIndexGroup[] {
    const grouped = new Map<string, TagIndexEntry[]>();
    for (const entries of this.entriesByUri.values()) {
      for (const entry of entries) {
        const list = grouped.get(entry.key) ?? [];
        list.push(entry);
        grouped.set(entry.key, list);
      }
    }
    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, entries]) => ({
        key,
        entries: entries.sort((a, b) => a.fileUri.fsPath.localeCompare(b.fileUri.fsPath))
      }));
  }

  fireDidChange(): void {
    this.onDidChangeEmitter.fire();
  }
}
