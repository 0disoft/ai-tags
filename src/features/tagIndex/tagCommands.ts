import * as vscode from 'vscode';

export const openTagLocation = async (
  uri: vscode.Uri,
  range: vscode.Range
): Promise<void> => {
  const document = await vscode.workspace.openTextDocument(uri);
  const editor = await vscode.window.showTextDocument(document, { preview: false });
  editor.selection = new vscode.Selection(range.start, range.end);
  editor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
};
