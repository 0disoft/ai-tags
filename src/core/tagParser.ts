import type * as vscode from 'vscode';
import type { AiTagEntry, AiTagKind } from './tagTypes';

const tagPattern = /@AI:([A-Z_]+)\b(.*)$/;

const resolveKind = (name: string): AiTagKind | null => {
  const upper = name.toUpperCase();
  if (upper === 'EXPIRY') return 'expiry';
  if (upper === 'SYNC') return 'sync';
  return null;
};

const findCommentStart = (lineText: string, tagIndex: number): number => {
  const lineCommentIndex = lineText.lastIndexOf('//', tagIndex);
  const hashIndex = lineText.lastIndexOf('#', tagIndex);
  const blockIndex = lineText.lastIndexOf('/*', tagIndex);
  const htmlIndex = lineText.lastIndexOf('<!--', tagIndex);

  if (blockIndex !== -1) {
    const closeIndex = lineText.indexOf('*/', blockIndex + 2);
    if (closeIndex !== -1 && closeIndex < tagIndex) {
      return Math.max(lineCommentIndex, hashIndex, htmlIndex);
    }
  }

  if (htmlIndex !== -1) {
    const closeIndex = lineText.indexOf('-->', htmlIndex + 4);
    if (closeIndex !== -1 && closeIndex < tagIndex) {
      return Math.max(lineCommentIndex, hashIndex, blockIndex);
    }
  }

  return Math.max(lineCommentIndex, hashIndex, blockIndex, htmlIndex);
};

export const parseAiTagKeyFromLine = (
  lineText: string,
  line: number
): { tagKey: string; line: number; startChar: number; endChar: number } | null => {
  const tagIndex = lineText.indexOf('@AI:');
  if (tagIndex === -1) return null;

  const commentIndex = findCommentStart(lineText, tagIndex);
  if (commentIndex === -1) return null;

  const match = tagPattern.exec(lineText.slice(tagIndex));
  if (!match) return null;

  const tagKey = `@AI:${match[1] ?? ''}`;
  if (tagKey.length <= 4) return null;

  const startChar = tagIndex + match.index;
  const endChar = startChar + tagKey.length;

  return { tagKey, line, startChar, endChar };
};

export const parseAiTagFromLine = (lineText: string, line: number): AiTagEntry | null => {
  const keyMatch = parseAiTagKeyFromLine(lineText, line);
  if (!keyMatch) return null;

  const match = tagPattern.exec(lineText.slice(keyMatch.startChar));
  if (!match) return null;

  const kind = resolveKind(match[1] ?? '');
  if (!kind) return null;

  const payload = (match[2] ?? '').trim();
  const startChar = keyMatch.startChar;
  const endChar = keyMatch.startChar + match[0].length;

  return {
    kind,
    payload,
    raw: match[0],
    line,
    startChar,
    endChar
  };
};

export const parseAiTagsFromDocument = (document: vscode.TextDocument): AiTagEntry[] => {
  const tags: AiTagEntry[] = [];
  for (let line = 0; line < document.lineCount; line += 1) {
    const lineText = document.lineAt(line).text;
    const tag = parseAiTagFromLine(lineText, line);
    if (tag) tags.push(tag);
  }
  return tags;
};
