import type * as vscode from 'vscode';
import { parseAiTagsFromDocument } from '../core/tagParser';
import { buildMarkdownFenceMask, isMarkdownDocument } from '../core/markdownFence';
import type { ExtensionConfig } from './config';
import { buildExpiryDiagnostics } from '../features/expiry/expiryDiagnostics';
import { buildSyncDiagnostics } from '../features/sync/syncDiagnostics';

export const buildDiagnosticsForDocument = async (
  document: vscode.TextDocument,
  config: ExtensionConfig
): Promise<vscode.Diagnostic[]> => {
  const tags = parseAiTagsFromDocument(document);
  let filteredTags = tags;
  if (isMarkdownDocument(document)) {
    const fenceMask = buildMarkdownFenceMask(document);
    filteredTags = tags.filter((tag) => !fenceMask[tag.line]);
  }
  const diagnostics = buildExpiryDiagnostics(filteredTags, config.expiry);
  const syncDiagnostics = await buildSyncDiagnostics(document, filteredTags, config.sync);
  return diagnostics.concat(syncDiagnostics);
};
