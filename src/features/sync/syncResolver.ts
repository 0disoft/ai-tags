// @AI:CONTEXT Parses @AI:SYNC tag payload and resolves file paths
// @AI:SYNC ./syncHoverProvider.ts, ./syncInlayProvider.ts
import * as path from 'path';
import * as vscode from 'vscode';

export type SyncResolveOptions = {
  expandDirectories?: boolean;
};

// @AI:CONTEXT Line range info type (single line or range)
export type LineRange = {
  start: number;
  end?: number;
};

// @AI:CONTEXT Parsed SYNC token info (filePath + optional lineRange/symbol)
export type ParsedSyncToken = {
  /** File path (excluding line/symbol) */
  filePath: string;
  /** Line number or range (L123, L10-L20) */
  lineRange?: LineRange;
  /** Symbol name (#func, #Class.method) */
  symbol?: string;
};

export type SyncResolvedTarget =
  | {
      status: 'ok';
      token: string;
      uri: vscode.Uri;
      isDirectory: boolean;
      fromDirectory: boolean;
      /** Line range info (if present) */
      lineRange?: LineRange;
      /** Symbol name (if present) */
      symbol?: string;
    }
  | {
      status: 'missing';
      token: string;
      reason: string;
      candidateUri?: vscode.Uri;
      allowCreate: boolean;
    };

// @AI:CONTEXT Parses :L123, :L10-L20 format line number/range
// @AI:INVARIANT Uses regex :L(\d+)(?:-L?(\d+))?$
export const parseLineRange = (token: string): ParsedSyncToken | null => {
  // Regex: :L(\d+)(?:-L?(\d+))?$
  const match = token.match(/:L(\d+)(?:-L?(\d+))?$/i);
  if (!match) {
    return null;
  }

  const start = parseInt(match[1], 10);
  const end = match[2] ? parseInt(match[2], 10) : undefined;
  const filePath = token.slice(0, match.index);

  return {
    filePath,
    lineRange: { start, end }
  };
};

// @AI:CONTEXT Parses #func, #Class.method format symbol names
// @AI:INVARIANT Uses regex #([\w.]+)$
export const parseSymbol = (token: string): ParsedSyncToken | null => {
  // Regex: #([\w.]+)$
  const match = token.match(/#([\w.]+)$/);
  if (!match) {
    return null;
  }

  const filePath = token.slice(0, match.index);
  const symbol = match[1];

  return {
    filePath,
    symbol
  };
};

// @AI:CONTEXT Extracts path/line/symbol from token (parseLineRange → parseSymbol order)
// @AI:CONSTRAINT Line numbers and symbols cannot be used together
export const parseSyncToken = (token: string): ParsedSyncToken => {
  // Try line number first
  const lineResult = parseLineRange(token);
  if (lineResult) {
    return lineResult;
  }

  // Try symbol
  const symbolResult = parseSymbol(token);
  if (symbolResult) {
    return symbolResult;
  }

  // If neither, return path only
  return { filePath: token };
};

const splitPayload = (payload: string): string[] => {
  if (payload.includes(',')) {
    return payload
      .split(',')
      .map((token) => token.trim())
      .filter(Boolean);
  }

  return payload
    .trim()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
};

const isDocumentRelative = (token: string): boolean =>
  token.startsWith('./') || token.startsWith('../') || token.startsWith('.\\') || token.startsWith('..\\');

const isWithinRoot = (root: string, target: string): boolean => {
  const relative = path.relative(root, target);
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
};

const shouldAllowCreate = (token: string): boolean =>
  token.length > 0 && !token.endsWith('/') && !token.endsWith('\\');

const resolveTokenPath = async (
  document: vscode.TextDocument,
  token: string
): Promise<
  | { status: 'ok'; uri: vscode.Uri; isDirectory: boolean }
  | { status: 'missing'; reason: string; candidateUri?: vscode.Uri; allowCreate: boolean }
> => {
  if (!token) {
    return { status: 'missing', reason: 'missing file path', allowCreate: false };
  }

  if (path.isAbsolute(token)) {
    return { status: 'missing', reason: 'use a workspace-relative path', allowCreate: false };
  }

  const folder = vscode.workspace.getWorkspaceFolder(document.uri);
  if (!folder) {
    return { status: 'missing', reason: 'workspace folder not found', allowCreate: false };
  }

  const rootPath = folder.uri.fsPath;
  const basePath = isDocumentRelative(token)
    ? path.dirname(document.uri.fsPath)
    : rootPath;
  const targetPath = path.normalize(path.join(basePath, token));

  if (!isWithinRoot(rootPath, targetPath)) {
    return { status: 'missing', reason: 'path is outside workspace root', allowCreate: false };
  }

  const uri = vscode.Uri.file(targetPath);
  try {
    const stat = await vscode.workspace.fs.stat(uri);
    const isDirectory = (stat.type & vscode.FileType.Directory) === vscode.FileType.Directory;
    return { status: 'ok', uri, isDirectory };
  } catch {
    return {
      status: 'missing',
      reason: `target not found: ${token}`,
      candidateUri: uri,
      allowCreate: shouldAllowCreate(token)
    };
  }
};

export const resolveSyncTargets = async (
  document: vscode.TextDocument,
  payload: string,
  options: SyncResolveOptions = {}
): Promise<SyncResolvedTarget[]> => {
  const targets = splitPayload(payload);
  if (targets.length === 0) {
    return [
      {
        status: 'missing',
        token: '',
        reason: 'missing file path',
        allowCreate: false
      }
    ];
  }

  const results: SyncResolvedTarget[] = [];
  const expandDirectories = options.expandDirectories === true;

  for (const token of targets) {
    // @AI:CONTEXT Parse line/symbol info from token
    const parsed = parseSyncToken(token);
    const filePath = parsed.filePath;

    const resolved = await resolveTokenPath(document, filePath);
    if (resolved.status === 'missing') {
      results.push({
        status: 'missing',
        token,
        reason: resolved.reason,
        candidateUri: resolved.candidateUri,
        allowCreate: resolved.allowCreate
      });
      continue;
    }

    if (resolved.isDirectory && expandDirectories) {
      const entries = await vscode.workspace.fs.readDirectory(resolved.uri);
      let added = 0;
      for (const [name, type] of entries) {
        if ((type & vscode.FileType.File) !== vscode.FileType.File) continue;
        const childUri = vscode.Uri.joinPath(resolved.uri, name);
        results.push({
          status: 'ok',
          token,
          uri: childUri,
          isDirectory: false,
          fromDirectory: true,
          lineRange: parsed.lineRange,
          symbol: parsed.symbol
        });
        added += 1;
      }
      if (added === 0) {
        results.push({
          status: 'missing',
          token,
          reason: `no files found in folder: ${token}`,
          allowCreate: false
        });
      }
      continue;
    }

    results.push({
      status: 'ok',
      token,
      uri: resolved.uri,
      isDirectory: resolved.isDirectory,
      fromDirectory: false,
      lineRange: parsed.lineRange,
      symbol: parsed.symbol
    });
  }

  return results;
};

