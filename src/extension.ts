import * as vscode from 'vscode';
import { TagHighlightManager } from './features/highlight/tagHighlight';
import { SyncCodeActionProvider, createSyncTarget } from './features/sync/syncCodeActions';
import { openSyncTarget } from './features/sync/syncCommands';
import { SyncHoverProvider } from './features/sync/syncHoverProvider';
import { SyncIconDecorationManager } from './features/sync/syncIconDecorations';
import { SyncInlayProvider } from './features/sync/syncInlayProvider';
import { getConfig } from './services/config';
import { AiTagScanService } from './services/scanService';

export const activate = (context: vscode.ExtensionContext): void => {
  const collection = vscode.languages.createDiagnosticCollection('ai-tags');
  const scanService = new AiTagScanService(getConfig, collection);
  const hoverProvider = new SyncHoverProvider(getConfig);
  const inlayProvider = new SyncInlayProvider(getConfig);
  const syncIconManager = new SyncIconDecorationManager(getConfig);
  const syncCodeActions = new SyncCodeActionProvider(getConfig);
  const highlightManager = new TagHighlightManager(getConfig);

  const rescanAll = async () => {
    scanService.clearAll();
    await scanService.scanWorkspace();
    await Promise.all(
      vscode.workspace.textDocuments.map((doc) => scanService.scanDocument(doc))
    );
  };

  context.subscriptions.push(collection);
  context.subscriptions.push(
    vscode.commands.registerCommand('aiTags.createSyncTarget', createSyncTarget)
  );
  context.subscriptions.push(
    vscode.commands.registerCommand('aiTags.openSyncTarget', openSyncTarget)
  );
  context.subscriptions.push(
    vscode.languages.registerHoverProvider({ scheme: 'file' }, hoverProvider)
  );
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      { scheme: 'file' },
      syncCodeActions,
      { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix] }
    )
  );
  context.subscriptions.push(
    vscode.languages.registerInlayHintsProvider({ scheme: 'file' }, inlayProvider)
  );

  void rescanAll();

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((document) => {
      void scanService.scanDocument(document);
    })
  );

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      highlightManager.update(editor);
      void syncIconManager.update(editor);
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      scanService.scheduleDocument(event.document);
      const active = vscode.window.activeTextEditor;
      if (active && active.document.uri.toString() === event.document.uri.toString()) {
        highlightManager.update(active);
        void syncIconManager.update(active);
      }
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((document) => {
      scanService.scheduleDocument(document);
      const active = vscode.window.activeTextEditor;
      if (active && active.document.uri.toString() === document.uri.toString()) {
        highlightManager.update(active);
        void syncIconManager.update(active);
      }
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((document) => {
      scanService.clearDocument(document);
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('aiTags')) {
        void rescanAll();
        highlightManager.update(vscode.window.activeTextEditor);
        void syncIconManager.update(vscode.window.activeTextEditor);
      }
    })
  );

  context.subscriptions.push({
    dispose: () => {
      highlightManager.dispose();
      syncIconManager.dispose();
    }
  });
};

export const deactivate = (): void => {};
