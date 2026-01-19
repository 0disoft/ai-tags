import type * as vscode from 'vscode';

const fencePattern = /^\s*(```+|~~~+)/;

export const isMarkdownDocument = (document: vscode.TextDocument): boolean =>
  document.languageId === 'markdown' || document.fileName.toLowerCase().endsWith('.md');

export const buildMarkdownFenceMask = (document: vscode.TextDocument): boolean[] => {
  const mask = new Array(document.lineCount).fill(false);
  let inFence = false;
  let fenceChar: string | null = null;

  for (let line = 0; line < document.lineCount; line += 1) {
    const text = document.lineAt(line).text;
    const match = fencePattern.exec(text);
    if (match) {
      const char = match[1][0] ?? null;
      if (!inFence) {
        inFence = true;
        fenceChar = char;
        continue;
      }
      if (fenceChar === char) {
        inFence = false;
        fenceChar = null;
        continue;
      }
    }

    if (inFence) {
      mask[line] = true;
    }
  }

  return mask;
};
