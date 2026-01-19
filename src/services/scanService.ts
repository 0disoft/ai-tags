import * as vscode from 'vscode';
import { buildDiagnosticsForDocument } from './diagnosticService';
import type { ExtensionConfig } from './config';

const EXCLUDE_GLOB = '{**/node_modules/**,**/.git/**,**/dist/**,**/out/**,**/build/**,**/coverage/**,**/.vscode/**}';
const MAX_FILE_SIZE_BYTES = 1024 * 1024;
const SCAN_DEBOUNCE_MS = 150;

const isFileUri = (uri: vscode.Uri): boolean => uri.scheme === 'file';

export class AiTagScanService {
  private readonly readConfig: () => ExtensionConfig;
  private readonly collection: vscode.DiagnosticCollection;
  private readonly pending = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    readConfig: () => ExtensionConfig,
    collection: vscode.DiagnosticCollection
  ) {
    this.readConfig = readConfig;
    this.collection = collection;
  }

  scheduleDocument(document: vscode.TextDocument): void {
    if (!isFileUri(document.uri)) {return;}
    const key = document.uri.toString();
    const existing = this.pending.get(key);
    if (existing) {clearTimeout(existing);}
    const handle = setTimeout(() => {
      this.pending.delete(key);
      void this.scanDocument(document);
    }, SCAN_DEBOUNCE_MS);
    this.pending.set(key, handle);
  }

  async scanDocument(document: vscode.TextDocument): Promise<void> {
    if (!isFileUri(document.uri)) {return;}
    const config = this.readConfig();
    const diagnostics = await buildDiagnosticsForDocument(document, config);
    this.collection.set(document.uri, diagnostics);
  }

  async scanWorkspace(): Promise<void> {
    const uris = await vscode.workspace.findFiles('**/*', EXCLUDE_GLOB);
    for (const uri of uris) {
      if (!isFileUri(uri)) {continue;}
      try {
        const stat = await vscode.workspace.fs.stat(uri);
        if (stat.size > MAX_FILE_SIZE_BYTES) {continue;}
        const document = await vscode.workspace.openTextDocument(uri);
        await this.scanDocument(document);
      } catch {
        // Skip non-text or unreadable files.
      }
    }
  }

  clearDocument(document: vscode.TextDocument): void {
    this.collection.delete(document.uri);
  }

  clearAll(): void {
    this.collection.clear();
  }
}
