// @AI:CONTEXT Tests for @AI:EXPIRY diagnostics.
// @AI:SYNC ../features/expiry/expiryDiagnostics.ts
import * as assert from 'assert';
import type { AiTagEntry } from '../core/tagTypes';
import { buildExpiryDiagnostics } from '../features/expiry/expiryDiagnostics';
import type { ExpiryConfig } from '../services/config';

export type ExpiryTestCase = {
  name: string;
  payload: string;
  now: Date;
  expected: 'active' | 'expired' | 'invalid';
};

/**
 * Builds a minimal expiry tag entry for diagnostics.
 * @param payload - Payload string to test.
 * @returns AiTagEntry for @AI:EXPIRY.
 */
const buildExpiryTagEntry = (payload: string): AiTagEntry => ({
  kind: 'expiry',
  payload,
  raw: `@AI:EXPIRY ${payload}`,
  line: 0,
  startChar: 0,
  endChar: `@AI:EXPIRY ${payload}`.length
});

/**
 * Builds an expiry config for test cases.
 * @returns Default expiry config for tests.
 */
const buildExpiryTestConfig = (): ExpiryConfig => {
  return {
    enabled: true,
    warnOnInvalid: true,
    graceDays: 0
  };
};

/**
 * Executes a single expiry test case.
 * @param testCase - Test case input and expected state.
 */
const runExpiryTestCase = (testCase: ExpiryTestCase): void => {
  const config = buildExpiryTestConfig();
  const tag = buildExpiryTagEntry(testCase.payload);
  const diagnostics = buildExpiryDiagnostics([tag], config, testCase.now);

  if (testCase.expected === 'active') {
    assert.strictEqual(diagnostics.length, 0);
    return;
  }

  assert.ok(diagnostics.length > 0);
  const message = diagnostics[0]?.message ?? '';

  if (testCase.expected === 'invalid') {
    assert.ok(message.includes('format invalid'));
    return;
  }

  assert.ok(message.includes('expired on'));
};

suite('Expiry Diagnostics Test Suite', () => {
  suite('parseExpiryPayload', () => {
    test('Valid date payload (YYYY-MM-DD)', () => {
      runExpiryTestCase({
        name: 'valid-date',
        payload: '2026-06-30',
        now: new Date('2026-01-01T00:00:00Z'),
        expected: 'active'
      });
    });

    test('Invalid date payload', () => {
      runExpiryTestCase({
        name: 'invalid-date',
        payload: '2026-99-99',
        now: new Date('2026-01-01T00:00:00Z'),
        expected: 'invalid'
      });
    });

    test('Invalid timezone payload', () => {
      runExpiryTestCase({
        name: 'invalid-timezone',
        payload: '2026-06-30 PST',
        now: new Date('2026-01-01T00:00:00Z'),
        expected: 'invalid'
      });
    });
  });

  suite('buildExpiryDiagnostics', () => {
    test('Expired payload emits warning', () => {
      runExpiryTestCase({
        name: 'expired-date',
        payload: '2025-01-01',
        now: new Date('2026-01-01T00:00:00Z'),
        expected: 'expired'
      });
    });
  });
});
