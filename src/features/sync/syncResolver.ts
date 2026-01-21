import * as path from 'path';
import * as vscode from 'vscode';

export type SyncResolveOptions = {
  expandDirectories?: boolean;
};

/**
 * 줄 범위 정보
 * @example { start: 10 } - 단일 줄
 * @example { start: 10, end: 20 } - 범위
 */
export type LineRange = {
  start: number;
  end?: number;
};

/**
 * 토큰에서 파싱된 경로 정보
 */
export type ParsedSyncToken = {
  /** 파일 경로 (줄/심볼 제외) */
  filePath: string;
  /** 줄 번호 또는 범위 (L123, L10-L20) */
  lineRange?: LineRange;
  /** 심볼명 (#func, #Class.method) */
  symbol?: string;
};

export type SyncResolvedTarget =
  | {
      status: 'ok';
      token: string;
      uri: vscode.Uri;
      isDirectory: boolean;
      fromDirectory: boolean;
      /** 줄 범위 정보 (있는 경우) */
      lineRange?: LineRange;
      /** 심볼명 (있는 경우) */
      symbol?: string;
    }
  | {
      status: 'missing';
      token: string;
      reason: string;
      candidateUri?: vscode.Uri;
      allowCreate: boolean;
    };

/**
 * 토큰에서 줄 번호/범위를 파싱합니다.
 * @param token - 원본 토큰 (예: "file.ts:L123", "file.ts:L10-L20")
 * @returns 파싱 결과 { filePath, lineRange } 또는 null
 */
export const parseLineRange = (token: string): ParsedSyncToken | null => {
  // 정규식: :L(\d+)(?:-L?(\d+))?$
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

/**
 * 토큰에서 심볼명을 파싱합니다.
 * @param token - 원본 토큰 (예: "file.ts#func", "file.ts#Class.method")
 * @returns 파싱 결과 { filePath, symbol } 또는 null
 */
export const parseSymbol = (token: string): ParsedSyncToken | null => {
  // 정규식: #([\w.]+)$
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

/**
 * 토큰을 파싱하여 경로, 줄 범위, 심볼 정보를 추출합니다.
 * @param token - 원본 토큰
 * @returns 파싱된 토큰 정보
 */
export const parseSyncToken = (token: string): ParsedSyncToken => {
  // 줄 번호 우선 시도
  const lineResult = parseLineRange(token);
  if (lineResult) {
    return lineResult;
  }

  // 심볼 시도
  const symbolResult = parseSymbol(token);
  if (symbolResult) {
    return symbolResult;
  }

  // 둘 다 없으면 경로만 반환
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
    // 토큰에서 줄/심볼 정보 파싱
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

