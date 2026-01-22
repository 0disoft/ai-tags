import * as vscode from 'vscode';
import { parseAiTagKeyFromLine } from '../../core/tagParser';
import type { ExtensionConfig } from '../../services/config';

type TagStyle = {
  color: vscode.ThemeColor;
};

const tagStyles: Record<string, TagStyle> = {
  '@AI:CRITICAL': { color: new vscode.ThemeColor('charts.red') },
  '@AI:CONSTRAINT': { color: new vscode.ThemeColor('charts.orange') },
  '@AI:INVARIANT': { color: new vscode.ThemeColor('charts.orange') },
  '@AI:EXPIRY': { color: new vscode.ThemeColor('charts.orange') },
  '@AI:UNCERTAIN': { color: new vscode.ThemeColor('charts.purple') },
  '@AI:CONTEXT': { color: new vscode.ThemeColor('charts.blue') },
  '@AI:BOUNDARY': { color: new vscode.ThemeColor('charts.blue') },
  '@AI:ASSUMPTION': { color: new vscode.ThemeColor('charts.purple') },
  '@AI:SYNC': { color: new vscode.ThemeColor('charts.blue') },
  '@AI:PROMPT': { color: new vscode.ThemeColor('charts.green') },
  '@AI:FROZEN': { color: new vscode.ThemeColor('charts.yellow') },
  '@AI:RATIONALE': { color: new vscode.ThemeColor('charts.blue') },
  '@AI:ALTERNATIVE': { color: new vscode.ThemeColor('charts.orange') },
  '@AI:RISK': { color: new vscode.ThemeColor('charts.red') },
  '@AI:LIMITATION': { color: new vscode.ThemeColor('charts.gray') },
  '@AI:RUNBOOK': { color: new vscode.ThemeColor('charts.green') }
};

export class TagHighlightManager {
  private readonly readConfig: () => ExtensionConfig;
  private readonly decorationTypes = new Map<string, vscode.TextEditorDecorationType>();

  constructor(readConfig: () => ExtensionConfig) {
    this.readConfig = readConfig;
  }

  update(editor?: vscode.TextEditor): void {
    if (!editor) {return;}
    const config = this.readConfig();
    if (!config.highlight.enabled) {
      this.clear(editor);
      return;
    }

    const decorationsByKey = new Map<string, vscode.Range[]>();

    for (let line = 0; line < editor.document.lineCount; line += 1) {
      const lineText = editor.document.lineAt(line).text;
      const keyMatch = parseAiTagKeyFromLine(lineText, line);
      if (!keyMatch) {continue;}

      const style = tagStyles[keyMatch.tagKey];
      if (!style) {continue;}

      const range = new vscode.Range(
        new vscode.Position(line, keyMatch.startChar),
        new vscode.Position(line, keyMatch.endChar)
      );
      const ranges = decorationsByKey.get(keyMatch.tagKey) ?? [];
      ranges.push(range);
      decorationsByKey.set(keyMatch.tagKey, ranges);
    }

    for (const [key, ranges] of decorationsByKey) {
      const decorationType = this.getDecorationType(key);
      editor.setDecorations(decorationType, ranges);
    }
  }

  clear(editor?: vscode.TextEditor): void {
    if (!editor) {return;}
    for (const decorationType of this.decorationTypes.values()) {
      editor.setDecorations(decorationType, []);
    }
  }

  dispose(): void {
    for (const decorationType of this.decorationTypes.values()) {
      decorationType.dispose();
    }
    this.decorationTypes.clear();
  }

  private getDecorationType(tagKey: string): vscode.TextEditorDecorationType {
    const existing = this.decorationTypes.get(tagKey);
    if (existing) {return existing;}

    const style = tagStyles[tagKey] ?? tagStyles['@AI:EXPIRY'];
    const decorationType = vscode.window.createTextEditorDecorationType({
      color: style.color,
      fontWeight: 'bold'
    });
    this.decorationTypes.set(tagKey, decorationType);
    return decorationType;
  }
}
