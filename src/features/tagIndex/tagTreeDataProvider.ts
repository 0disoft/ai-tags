import * as vscode from 'vscode';
import type { TagIndexEntry, TagIndexGroup } from './tagIndexTypes';
import { TagIndexService } from './tagIndexService';

export type TagTreeNode = TagGroupNode | TagEntryNode;

export class TagGroupNode {
  constructor(public readonly group: TagIndexGroup) {}
}

export class TagEntryNode {
  constructor(public readonly entry: TagIndexEntry) {}
}

const buildEntryLabel = (entry: TagIndexEntry): string => {
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(entry.fileUri);
  const relativePath = workspaceFolder
    ? vscode.workspace.asRelativePath(entry.fileUri, false)
    : entry.fileUri.fsPath;
  return `${relativePath}:${entry.line + 1}`;
};

export class TagTreeDataProvider
  implements vscode.TreeDataProvider<TagTreeNode>, vscode.Disposable {
  private readonly onDidChangeEmitter = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this.onDidChangeEmitter.event;

  private readonly disposables: vscode.Disposable[] = [];

  constructor(private readonly indexService: TagIndexService) {
    this.disposables.push(
      indexService.onDidChange(() => {
        this.onDidChangeEmitter.fire();
      })
    );
  }

  getTreeItem(element: TagTreeNode): vscode.TreeItem {
    if (element instanceof TagGroupNode) {
      return {
        label: element.group.key,
        collapsibleState: vscode.TreeItemCollapsibleState.Collapsed
      };
    }

    const item = new vscode.TreeItem(buildEntryLabel(element.entry));
    item.description = element.entry.preview;
    item.command = {
      command: 'aiTags.openTagLocation',
      title: 'Open tag location',
      arguments: [element.entry.fileUri, element.entry.range]
    };
    item.tooltip = element.entry.preview;
    item.iconPath = new vscode.ThemeIcon('symbol-tag');
    return item;
  }

  getChildren(element?: TagTreeNode): TagTreeNode[] {
    if (!element) {
      return this.indexService.getGroups().map((group) => new TagGroupNode(group));
    }

    if (element instanceof TagGroupNode) {
      return element.group.entries.map((entry) => new TagEntryNode(entry));
    }

    return [];
  }

  dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables.length = 0;
  }
}
