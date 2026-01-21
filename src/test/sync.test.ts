/**
 * Sync Parser Unit Tests
 * Tests parseLineRange, parseSymbol, parseSyncToken functions.
 */
import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
import * as vscode from 'vscode';
import { parseLineRange, parseSymbol, parseSyncToken } from '../features/sync/syncResolver';

suite('Sync Parser Test Suite', () => {
  vscode.window.showInformationMessage('Start sync parser tests.');

  suite('parseLineRange', () => {
    test('Single line number parsing (L123)', () => {
      const result = parseLineRange('file.ts:L123');
      assert.strictEqual(result?.filePath, 'file.ts');
      assert.strictEqual(result?.lineRange?.start, 123);
      assert.strictEqual(result?.lineRange?.end, undefined);
    });

    test('Line range parsing (L10-L20)', () => {
      const result = parseLineRange('file.ts:L10-L20');
      assert.strictEqual(result?.filePath, 'file.ts');
      assert.strictEqual(result?.lineRange?.start, 10);
      assert.strictEqual(result?.lineRange?.end, 20);
    });

    test('Line range parsing - omit L (L10-20)', () => {
      const result = parseLineRange('file.ts:L10-20');
      assert.strictEqual(result?.filePath, 'file.ts');
      assert.strictEqual(result?.lineRange?.start, 10);
      assert.strictEqual(result?.lineRange?.end, 20);
    });

    test('Case insensitive (l123)', () => {
      const result = parseLineRange('file.ts:l123');
      assert.strictEqual(result?.filePath, 'file.ts');
      assert.strictEqual(result?.lineRange?.start, 123);
    });

    test('Path without line number returns null', () => {
      const result = parseLineRange('file.ts');
      assert.strictEqual(result, null);
    });

    test('Supports relative paths', () => {
      const result = parseLineRange('../utils/helper.ts:L50');
      assert.strictEqual(result?.filePath, '../utils/helper.ts');
      assert.strictEqual(result?.lineRange?.start, 50);
    });
  });

  suite('parseSymbol', () => {
    test('Simple symbol parsing (#func)', () => {
      const result = parseSymbol('file.ts#hello');
      assert.strictEqual(result?.filePath, 'file.ts');
      assert.strictEqual(result?.symbol, 'hello');
    });

    test('Nested symbol parsing (#Class.method)', () => {
      const result = parseSymbol('file.ts#Foo.bar');
      assert.strictEqual(result?.filePath, 'file.ts');
      assert.strictEqual(result?.symbol, 'Foo.bar');
    });

    test('Symbol with underscore', () => {
      const result = parseSymbol('file.ts#my_function');
      assert.strictEqual(result?.symbol, 'my_function');
    });

    test('Path without symbol returns null', () => {
      const result = parseSymbol('file.ts');
      assert.strictEqual(result, null);
    });
  });

  suite('parseSyncToken', () => {
    test('Normal path parsing', () => {
      const result = parseSyncToken('src/utils.ts');
      assert.strictEqual(result.filePath, 'src/utils.ts');
      assert.strictEqual(result.lineRange, undefined);
      assert.strictEqual(result.symbol, undefined);
    });

    test('Path with line number parsing', () => {
      const result = parseSyncToken('src/utils.ts:L50');
      assert.strictEqual(result.filePath, 'src/utils.ts');
      assert.strictEqual(result.lineRange?.start, 50);
    });

    test('Path with line range parsing', () => {
      const result = parseSyncToken('src/utils.ts:L10-L30');
      assert.strictEqual(result.filePath, 'src/utils.ts');
      assert.strictEqual(result.lineRange?.start, 10);
      assert.strictEqual(result.lineRange?.end, 30);
    });

    test('Path with symbol parsing', () => {
      const result = parseSyncToken('src/utils.ts#myFunc');
      assert.strictEqual(result.filePath, 'src/utils.ts');
      assert.strictEqual(result.symbol, 'myFunc');
    });

    test('Path with nested symbol parsing', () => {
      const result = parseSyncToken('src/utils.ts#MyClass.myMethod');
      assert.strictEqual(result.filePath, 'src/utils.ts');
      assert.strictEqual(result.symbol, 'MyClass.myMethod');
    });
  });

});
