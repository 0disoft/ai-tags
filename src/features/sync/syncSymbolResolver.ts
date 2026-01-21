// @AI:CONTEXT Searches for symbol locations (functions, classes, methods) in a file
// @AI:SYNC ./syncCommands.ts#openSyncTarget
import * as vscode from 'vscode';

// @AI:CONTEXT Symbol lookup result type (found/not_found discriminated union)
export type SymbolLookupResult =
  | {
      status: 'found';
      /** Line number where symbol is located (0-indexed) */
      line: number;
      /** Column where symbol is located (0-indexed) */
      character: number;
    }
  | {
      status: 'not_found';
      reason: string;
    };

// @AI:CONTEXT Traverses nested symbols (e.g., Class.method -> ["Class", "method"])
// @AI:ASSUMPTION symbols array is vscode.DocumentSymbol[] type
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

  return findNestedSymbol(found.children, rest);
};

// @AI:CONTEXT Searches symbols using vscode.executeDocumentSymbolProvider
// @AI:CONSTRAINT Requires active Language Server for the target file
export const findSymbolInFile = async (
  uri: vscode.Uri,
  symbolName: string
): Promise<SymbolLookupResult> => {
  // Split symbol path (e.g., "Foo.bar" -> ["Foo", "bar"])
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

