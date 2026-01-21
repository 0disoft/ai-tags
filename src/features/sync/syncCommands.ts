// @AI:CONTEXT Custom command for opening file and navigating to line/symbol
// @AI:SYNC ./syncHoverProvider.ts, ./syncInlayProvider.ts
import * as vscode from 'vscode';
import { findSymbolInFile } from './syncSymbolResolver';

// @AI:CONTEXT Arguments passed from HoverProvider/InlayProvider
export interface OpenSyncTargetArgs {
  uri: string;
  line?: number;
  endLine?: number;
  symbol?: string;
}

// @AI:CONTEXT Opens file and moves cursor to specified line or symbol
// @AI:CONSTRAINT vscode.Range is lost during JSON serialization, so receive primitives and create Range here
export const openSyncTarget = async (args: OpenSyncTargetArgs): Promise<void> => {
  if (!args?.uri) {
    return;
  }

  const uri = vscode.Uri.parse(args.uri);

  const document = await vscode.workspace.openTextDocument(uri);
  const editor = await vscode.window.showTextDocument(document);

  // Navigate to symbol if provided
  if (args.symbol) {
    const result = await findSymbolInFile(uri, args.symbol);
    if (result.status === 'found') {
      const position = new vscode.Position(result.line, result.character);
      editor.selection = new vscode.Selection(position, position);
      editor.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
      return;
    }
  }

  // Navigate to line if provided
  if (args.line !== undefined) {
    const startLine = args.line - 1; // 0-indexed
    const endLine = args.endLine !== undefined ? args.endLine - 1 : startLine;
    const startPos = new vscode.Position(startLine, 0);
    const endPos = new vscode.Position(endLine, 0);
    editor.selection = new vscode.Selection(startPos, endPos);
    editor.revealRange(new vscode.Range(startPos, endPos), vscode.TextEditorRevealType.InCenter);
  }
};
