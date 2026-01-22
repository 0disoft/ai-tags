import * as vscode from 'vscode';
import type { AiTagEntry } from '../../core/tagTypes';
import type { ExpiryConfig } from '../../services/config';

type ExpiryParseResult =
  | { status: 'ok'; expiresAt: Date; timezone: string }
  | { status: 'invalid'; reason: string };

const datePattern = /^(\d{4})-(\d{2})-(\d{2})$/;

const timezoneOffsets: Record<string, number> = {
  UTC: 0,
  KST: 9
};

const isValidDayInMonth = (year: number, month: number, day: number): boolean => {
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  return (
    utcDate.getUTCFullYear() === year &&
    utcDate.getUTCMonth() === month - 1 &&
    utcDate.getUTCDate() === day
  );
};

const toExpiryDate = (dateText: string, timezone: string): Date | null => {
  const match = datePattern.exec(dateText);
  if (!match) {return null;}

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {return null;}
  if (!isValidDayInMonth(year, month, day)) {return null;}

  const offset = timezoneOffsets[timezone];
  if (offset === undefined) {return null;}

  const utcHour = 23 - offset;
  return new Date(Date.UTC(year, month - 1, day, utcHour, 59, 59, 999));
};

const parseExpiryPayload = (payload: string): ExpiryParseResult => {
  const tokens = payload.trim().split(/\s+/).filter(Boolean);
  if (tokens.length < 1 || tokens.length > 2) {
    return { status: 'invalid', reason: 'format invalid. Use YYYY-MM-DD [TZ]' };
  }

  const [dateText, tzRaw] = tokens;
  const timezone = (tzRaw ?? 'UTC').toUpperCase();

  const expiresAt = toExpiryDate(dateText, timezone);
  if (!expiresAt) {
    return { status: 'invalid', reason: 'format invalid. Use YYYY-MM-DD [TZ]' };
  }

  return { status: 'ok', expiresAt, timezone };
};

const addGraceDays = (date: Date, graceDays: number): Date => {
  if (graceDays <= 0) {return date;}
  return new Date(date.getTime() + graceDays * 24 * 60 * 60 * 1000);
};

export const buildExpiryDiagnostics = (
  tags: AiTagEntry[],
  config: ExpiryConfig,
  now = new Date()
): vscode.Diagnostic[] => {
  if (!config.enabled) {return [];}

  const diagnostics: vscode.Diagnostic[] = [];

  for (const tag of tags) {
    if (tag.kind !== 'expiry') {continue;}

    if (tag.payload.includes('${')) {
      continue;
    }

    const parsed = parseExpiryPayload(tag.payload);
    if (parsed.status === 'invalid') {
      if (!config.warnOnInvalid) {continue;}
      const range = new vscode.Range(
        new vscode.Position(tag.line, tag.startChar),
        new vscode.Position(tag.line, tag.endChar)
      );
      diagnostics.push(
        new vscode.Diagnostic(
          range,
          `@AI:EXPIRY ${parsed.reason}`,
          vscode.DiagnosticSeverity.Warning
        )
      );
      continue;
    }

    const expiresAt = addGraceDays(parsed.expiresAt, config.graceDays);
    if (now.getTime() <= expiresAt.getTime()) {continue;}

    const range = new vscode.Range(
      new vscode.Position(tag.line, tag.startChar),
      new vscode.Position(tag.line, tag.endChar)
    );
    diagnostics.push(
      new vscode.Diagnostic(
        range,
        `@AI:EXPIRY expired on ${parsed.expiresAt.toISOString().slice(0, 10)} ${parsed.timezone}`,
        vscode.DiagnosticSeverity.Warning
      )
    );
  }

  return diagnostics;
};
