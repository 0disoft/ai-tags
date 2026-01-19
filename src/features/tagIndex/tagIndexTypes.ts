import type * as vscode from 'vscode';

export type TagIndexEntry = {
  key: string;
  payload: string;
  fileUri: vscode.Uri;
  line: number;
  range: vscode.Range;
  preview: string;
};

export type TagIndexGroup = {
  key: string;
  entries: TagIndexEntry[];
};
