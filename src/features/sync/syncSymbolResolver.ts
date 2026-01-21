/**
 * 심볼 검색 유틸리티
 * 파일 내 함수, 클래스, 메서드 등의 심볼 위치를 검색합니다.
 */
import * as vscode from 'vscode';

/**
 * 심볼 검색 결과
 */
export type SymbolLookupResult =
  | {
      status: 'found';
      /** 심볼이 있는 줄 번호 (0-indexed) */
      line: number;
      /** 심볼이 있는 컬럼 (0-indexed) */
      character: number;
    }
  | {
      status: 'not_found';
      reason: string;
    };

/**
 * 중첩 심볼을 검색합니다 (예: Class.method).
 * @param symbols - 문서 심볼 배열
 * @param path - 심볼 경로 (예: ["Foo", "bar"])
 * @returns 찾은 심볼 또는 undefined
 */
export const findNestedSymbol = (
  symbols: vscode.DocumentSymbol[],
  path: string[]
): vscode.DocumentSymbol | undefined => {
  if (path.length === 0 || symbols.length === 0) {
    return undefined;
  }

  const [first, ...rest] = path;
  const found = symbols.find((s) => s.name === first);

  if (!found) {
    return undefined;
  }

  if (rest.length === 0) {
    return found;
  }

  // 중첩 심볼 탐색
  return findNestedSymbol(found.children, rest);
};

/**
 * 파일 내에서 심볼(함수, 클래스 등)의 위치를 검색합니다.
 * @param uri - 검색할 파일 URI
 * @param symbolName - 심볼명 (예: "hello", "Foo.bar")
 * @returns 심볼 위치 또는 not_found
 */
export const findSymbolInFile = async (
  uri: vscode.Uri,
  symbolName: string
): Promise<SymbolLookupResult> => {
  // 심볼 경로를 분리 (예: "Foo.bar" -> ["Foo", "bar"])
  const symbolPath = symbolName.split('.');

  try {
    const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
      'vscode.executeDocumentSymbolProvider',
      uri
    );

    if (!symbols || symbols.length === 0) {
      return { status: 'not_found', reason: 'no symbols found in file' };
    }

    const found = findNestedSymbol(symbols, symbolPath);

    if (!found) {
      return { status: 'not_found', reason: `symbol not found: ${symbolName}` };
    }

    return {
      status: 'found',
      line: found.selectionRange.start.line,
      character: found.selectionRange.start.character
    };
  } catch {
    return { status: 'not_found', reason: 'failed to execute symbol provider' };
  }
};
