/**
 * Sync Parser 유닛 테스트
 * parseLineRange, parseSymbol, parseSyncToken 함수를 테스트합니다.
 */
import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
import * as vscode from 'vscode';
import { parseLineRange, parseSymbol, parseSyncToken } from '../features/sync/syncResolver';

suite('Sync Parser Test Suite', () => {
  vscode.window.showInformationMessage('Start sync parser tests.');

  suite('parseLineRange', () => {
    test('단일 줄 번호 파싱 (L123)', () => {
      const result = parseLineRange('file.ts:L123');
      assert.strictEqual(result?.filePath, 'file.ts');
      assert.strictEqual(result?.lineRange?.start, 123);
      assert.strictEqual(result?.lineRange?.end, undefined);
    });

    test('줄 범위 파싱 (L10-L20)', () => {
      const result = parseLineRange('file.ts:L10-L20');
      assert.strictEqual(result?.filePath, 'file.ts');
      assert.strictEqual(result?.lineRange?.start, 10);
      assert.strictEqual(result?.lineRange?.end, 20);
    });

    test('줄 범위 파싱 - L 생략 (L10-20)', () => {
      const result = parseLineRange('file.ts:L10-20');
      assert.strictEqual(result?.filePath, 'file.ts');
      assert.strictEqual(result?.lineRange?.start, 10);
      assert.strictEqual(result?.lineRange?.end, 20);
    });

    test('대소문자 무시 (l123)', () => {
      const result = parseLineRange('file.ts:l123');
      assert.strictEqual(result?.filePath, 'file.ts');
      assert.strictEqual(result?.lineRange?.start, 123);
    });

    test('줄 번호 없는 경로는 null 반환', () => {
      const result = parseLineRange('file.ts');
      assert.strictEqual(result, null);
    });

    test('상대 경로 지원', () => {
      const result = parseLineRange('../utils/helper.ts:L50');
      assert.strictEqual(result?.filePath, '../utils/helper.ts');
      assert.strictEqual(result?.lineRange?.start, 50);
    });
  });

  suite('parseSymbol', () => {
    test('단순 심볼 파싱 (#func)', () => {
      const result = parseSymbol('file.ts#hello');
      assert.strictEqual(result?.filePath, 'file.ts');
      assert.strictEqual(result?.symbol, 'hello');
    });

    test('중첩 심볼 파싱 (#Class.method)', () => {
      const result = parseSymbol('file.ts#Foo.bar');
      assert.strictEqual(result?.filePath, 'file.ts');
      assert.strictEqual(result?.symbol, 'Foo.bar');
    });

    test('언더스코어 포함 심볼', () => {
      const result = parseSymbol('file.ts#my_function');
      assert.strictEqual(result?.symbol, 'my_function');
    });

    test('심볼 없는 경로는 null 반환', () => {
      const result = parseSymbol('file.ts');
      assert.strictEqual(result, null);
    });
  });

  suite('parseSyncToken', () => {
    test('일반 경로 파싱', () => {
      const result = parseSyncToken('src/utils.ts');
      assert.strictEqual(result.filePath, 'src/utils.ts');
      assert.strictEqual(result.lineRange, undefined);
      assert.strictEqual(result.symbol, undefined);
    });

    test('줄 번호 포함 경로 파싱', () => {
      const result = parseSyncToken('src/utils.ts:L50');
      assert.strictEqual(result.filePath, 'src/utils.ts');
      assert.strictEqual(result.lineRange?.start, 50);
    });

    test('줄 범위 포함 경로 파싱', () => {
      const result = parseSyncToken('src/utils.ts:L10-L30');
      assert.strictEqual(result.filePath, 'src/utils.ts');
      assert.strictEqual(result.lineRange?.start, 10);
      assert.strictEqual(result.lineRange?.end, 30);
    });

    test('심볼 포함 경로 파싱', () => {
      const result = parseSyncToken('src/utils.ts#myFunc');
      assert.strictEqual(result.filePath, 'src/utils.ts');
      assert.strictEqual(result.symbol, 'myFunc');
    });

    test('중첩 심볼 포함 경로 파싱', () => {
      const result = parseSyncToken('src/utils.ts#MyClass.myMethod');
      assert.strictEqual(result.filePath, 'src/utils.ts');
      assert.strictEqual(result.symbol, 'MyClass.myMethod');
    });
  });

});
