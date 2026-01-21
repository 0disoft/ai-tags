# AI Tags - Sync 확장 문법 TODO

생성일: 2026-01-21
출처: 대화 기반 요구사항 분석

## 진행 상태 범례

- [ ] 대기
- [/] 진행 중
- [x] 완료

## 점수표

| 순위 | 작업 | 총점 | 의존성×3 | 임팩트×2 | 리스크×2 | 노력 | 블로커 |
|------|------|------|----------|----------|----------|------|--------|
| 1 | TODO-001 줄번호 파서 | 52 | 9 (27) | 6 (12) | 3 (6) | 5 | 2 |
| 2 | TODO-002 심볼 파서 | 52 | 9 (27) | 6 (12) | 3 (6) | 5 | 2 |
| 3 | TODO-003 타입 확장 | 49 | 8 (24) | 6 (12) | 3 (6) | 5 | 2 |
| 4 | TODO-004 심볼 검색 유틸 | 46 | 7 (21) | 7 (14) | 5 (10) | 6 | -5 |
| 5 | TODO-005 중첩 심볼 탐색 | 40 | 5 (15) | 6 (12) | 5 (10) | 6 | -3 |
| 6 | TODO-006 resolveToken 분기 | 44 | 6 (18) | 8 (16) | 5 (10) | 5 | -5 |
| 7 | TODO-007 Hover 반영 | 38 | 4 (12) | 8 (16) | 3 (6) | 4 | 0 |
| 8 | TODO-008 Inlay 반영 | 34 | 3 (9) | 7 (14) | 3 (6) | 4 | 1 |
| 9 | TODO-009 테스트 추가 | 32 | 2 (6) | 6 (12) | 4 (8) | 5 | 1 |
| 10 | TODO-010 문서 업데이트 | 26 | 1 (3) | 5 (10) | 2 (4) | 4 | 5 |

---

## Phase 1: 기반 구축 (파싱 + 타입)

- [x] TODO-001: 줄 번호/범위 정규식 파서 [S] (skeleton)
  - 위치: `src/features/sync/syncResolver.ts`
  - AC: `:L123`, `:L10-L20` 패턴 추출 성공

- [x] TODO-002: 심볼 정규식 파서 [S] (skeleton)
  - 위치: `src/features/sync/syncResolver.ts`
  - AC: `#symbol`, `#Class.method` 패턴 추출 성공

- [x] TODO-003: SyncResolvedTarget 타입 확장 [S] (skeleton)
  - 위치: `src/features/sync/syncResolver.ts`
  - AC: `lineRange`, `symbol` 필드 추가, 빌드 성공

## Phase 2: 핵심 로직 (심볼 검색 + 통합)

- [x] TODO-004: 심볼 검색 유틸 함수 [M] (skeleton)
  - 위치: `src/features/sync/syncSymbolResolver.ts` (NEW)
  - AC: 함수명으로 검색 시 줄 번호 반환
  - 선행: 없음

- [x] TODO-005: 중첩 심볼 탐색 [M] (skeleton)
  - 위치: `src/features/sync/syncSymbolResolver.ts`
  - AC: `Class.method` 형식 지원
  - 선행: TODO-004

- [x] TODO-006: resolveTokenPath 함수 분기 추가 [M] (impl)
  - 위치: `src/features/sync/syncResolver.ts`
  - AC: 기존 테스트 통과 + 새 문법 지원
  - 선행: TODO-001, TODO-002, TODO-003, TODO-004

## Phase 3: UI 반영

- [x] TODO-007: HoverProvider에 줄/심볼 이동 반영 [M] (impl)
  - 위치: `src/features/sync/syncHoverProvider.ts`
  - AC: 호버 링크 클릭 시 해당 줄/심볼로 커서 이동
  - 선행: TODO-006

- [x] TODO-008: InlayProvider에 줄/심볼 이동 반영 [S] (impl)
  - 위치: `src/features/sync/syncInlayProvider.ts`
  - AC: Inlay 힌트 클릭 시 해당 줄/심볼로 이동
  - 선행: TODO-007

## Phase 4: 품질 보증

- [x] TODO-009: 파싱 로직 유닛 테스트 [M] (impl)
  - 위치: `src/test/sync.test.ts` (NEW)
  - AC: L123, L10-L20, #func, #Class.method 모두 통과
  - 선행: TODO-006

- [x] TODO-010: README.md 문법 설명 추가 [S] (impl)
  - 위치: `projects/ai-tags/README.md`
  - AC: 새 문법 예시 및 설명 추가
  - 선행: TODO-006

---

## 복잡도 요약

| Phase | 작업 수 | S | M | 예상 시간 |
|-------|---------|---|---|-----------|
| 1 | 3 | 3 | 0 | 1시간 |
| 2 | 3 | 0 | 3 | 2시간 |
| 3 | 2 | 1 | 1 | 1시간 |
| 4 | 2 | 1 | 1 | 1시간 |
| 합계 | 10 | 5 | 5 | 5시간 |
