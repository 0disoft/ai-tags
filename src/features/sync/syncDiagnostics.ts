import * as vscode from 'vscode';
import type { AiTagEntry } from '../../core/tagTypes';
import type { SyncConfig } from '../../services/config';
import { resolveSyncTargets, type SyncResolvedTarget } from './syncResolver';

const isMissingTarget = (
  item: SyncResolvedTarget
): item is Extract<SyncResolvedTarget, { status: 'missing' }> => item.status === 'missing';

export const buildSyncDiagnostics = async (
  document: vscode.TextDocument,
  tags: AiTagEntry[],
  config: SyncConfig
): Promise<vscode.Diagnostic[]> => {
  if (!config.enabled || !config.warnOnMissing) {return [];}

  const diagnostics: vscode.Diagnostic[] = [];

  for (const tag of tags) {
    if (tag.kind !== 'sync') {continue;}

    const results = await resolveSyncTargets(document, tag.payload, { expandDirectories: false });
    const missing = results.filter(isMissingTarget);
    if (missing.length === 0) {continue;}

    const range = new vscode.Range(
      new vscode.Position(tag.line, tag.startChar),
      new vscode.Position(tag.line, tag.endChar)
    );
    for (const item of missing) {
      diagnostics.push(
        new vscode.Diagnostic(
          range,
          `@AI:SYNC ${item.reason}`,
          vscode.DiagnosticSeverity.Warning
        )
      );
    }
  }

  return diagnostics;
};
