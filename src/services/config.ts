import * as vscode from 'vscode';

export type ExpiryConfig = {
  enabled: boolean;
  warnOnInvalid: boolean;
  graceDays: number;
};

export type SyncConfig = {
  enabled: boolean;
  warnOnMissing: boolean;
};

export type ExtensionConfig = {
  expiry: ExpiryConfig;
  sync: SyncConfig;
  highlight: {
    enabled: boolean;
  };
};

const fallbackConfig: ExtensionConfig = {
  expiry: {
    enabled: true,
    warnOnInvalid: true,
    graceDays: 0
  },
  sync: {
    enabled: true,
    warnOnMissing: true
  },
  highlight: {
    enabled: true
  }
};

const clampGraceDays = (value: unknown, fallback: number): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) {return fallback;}
  if (value < 0) {return 0;}
  return Math.floor(value);
};

export const getConfig = (): ExtensionConfig => {
  const config = vscode.workspace.getConfiguration('aiTags');

  return {
    expiry: {
      enabled: config.get<boolean>('expiry.enabled') ?? fallbackConfig.expiry.enabled,
      warnOnInvalid: config.get<boolean>('expiry.warnOnInvalid') ??
        fallbackConfig.expiry.warnOnInvalid,
      graceDays: clampGraceDays(
        config.get<number>('expiry.graceDays'),
        fallbackConfig.expiry.graceDays
      )
    },
    sync: {
      enabled: config.get<boolean>('sync.enabled') ?? fallbackConfig.sync.enabled,
      warnOnMissing: config.get<boolean>('sync.warnOnMissing') ?? fallbackConfig.sync.warnOnMissing
    },
    highlight: {
      enabled: config.get<boolean>('highlight.enabled') ?? fallbackConfig.highlight.enabled
    }
  };
};
