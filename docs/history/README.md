# 종료 기록 조회

현재 사용법·계약·미래 계획은 [문서 안내](../README.md)에서 찾습니다.
종료된 실행 결과는 아래 보존 커밋의 원래 경로에서 읽을 수 있습니다.
과거 PASS/FAIL은 당시 실행 결과이며 현재 소스의 검증 결과가 아닙니다.

## 보존 위치

아래 원본의 보존 커밋은 `0f85cec7ea066ff626f7b2983f924468467c9717`입니다.
사용자가 확인한 원격 기준이며 이번 정리에서는 원격을 다시 조회하거나 푸시하지 않습니다.
삭제 전 현재 파일과 해당 커밋의 Git blob이 같은지 대조합니다.

| 버전·자료 | 원래 경로 | 정리 범위 |
| --- | --- | --- |
| v3.1.0~v3.8.0 실행 결과 | `docs/release-artifacts/v3.1.0/` ~ `docs/release-artifacts/v3.8.0/` | 현재 입력으로 쓰이지 않는 종료 실행 자료 |
| v4.1.0 실행 결과 | `docs/release-artifacts/v4.1.0/` | 직접 소비자가 없는 종료 실행 묶음. 현행 회귀 입력·UI 판정 입력·출처 자료는 유지 |
| v4.1.1 문서 도구 검사 결과 | `docs/release-artifacts/v4.1.1/` | 이미 마감된 중간 결과만 정리. 미해결 인계와 현행 검사 입력은 유지 |
| 과거 UI 구현 설명 | `docs/v220-*.md`, `docs/v230-ui-renderer-module-decomposition.md` | 현행 설명이 [공통 컴포넌트 예시](../product-shell-component-examples.md)에 통합된 13개 문서만 정리. 접두사가 같은 모든 문서를 뜻하지 않음 |

일부 계획·증거는 현재 계약과 회귀 입력이므로 유지합니다. 과거 버전이라는 이유만으로
삭제하지 않으며 이 표는 전체 문서 정리 완료나 모든 기록의 삭제를 뜻하지 않습니다.
상세한 삭제 경로는 정리 커밋의 삭제 목록과 별도 보존된 실행 자료로 확인합니다.

이번 정리의 정확한 대상 1,622개와 검사·실패·재검증 원출력은 로컬 커밋
`d252e1fb241ab37af0509f18eac965dbb73decda`의
`docs/release-artifacts/v4.1.1/closed-record-cleanup-20260929/result.json`에 있습니다.
이 자료 자체도 보존 후 현재 트리에서 정리합니다. 원본 보존 기준과 달리 이 커밋은
이번 작업에서 푸시하지 않았으므로 원격 링크나 원격 보존 완료를 제시하지 않습니다.
이 기록의 보존 이후 최종 확인은 정리 커밋 본문에 남깁니다.

## 작업 파일을 덮어쓰지 않고 읽기

임시 문서 리뷰와 1단계 인계의 원본은 로컬 보존 기준
`ca3e76e871d05577e6d461746a8918ac618a64a5`에서 조회한다.
유효한 미해결 사항은 [backlog](../development-backlog.md)에 두며 이 이력 안내가
현재 실행 결과나 승인을 대신하지 않는다.

- 임시 리뷰: `docs/documentation-review-2026-09-28.md`
- 1단계 최초 실패·재검증: `docs/release-artifacts/v4.1.1/backlog-roadmap-20260929/result.json`

후보 범위 검사 보완과 핵심 잔여 확인의 원출력은 로컬 커밋
`1cc3bea3617cf0027c6773fe60f6eeeba7f14cf6`의
`docs/release-artifacts/v4.1.1/core-record-dependencies-20260929/result.json`에 보존한다.
기존 4개 FAIL과 보완 후 결과는 별개이며, 3단계 진입 판정은 backlog의 현재 장애물을 따른다.

저장소 루트에서 과거 문서 도구 검사의 원본을 읽는 예입니다.

```sh
git show 0f85cec7ea066ff626f7b2983f924468467c9717:docs/release-artifacts/v4.1.1/ui-component-documentation/result.json
git show d252e1fb241ab37af0509f18eac965dbb73decda:docs/release-artifacts/v4.1.1/closed-record-cleanup-20260929/result.json
git log --all -- docs/v220-ui-architecture-inventory.md
git archive 0f85cec7ea066ff626f7b2983f924468467c9717 docs/release-artifacts/v3.1.0 | tar -tf -
```

파일이 필요한 경우 별도 빈 디렉터리에 추출하고 현재 작업 트리를 덮어쓰지 않습니다.
shallow clone이나 source archive에 해당 커밋이 없을 수 있습니다. 이때 과거 기록의
조회는 불가능하지만, 일반 빌드·현재 테스트를 위해 과거 로그를 복원하지는 않습니다.
새 정리 실행 자료의 로컬 보존과 원격 보존은 별개이며, 푸시 전에는 원격 보존 완료로
간주하지 않습니다. 현재 트리 정리는 Git 이력 자체의 용량을 줄이는 작업이 아닙니다.

## 중앙 기록과 backlog 종료 본문

세 원본은 로컬 보존 커밋 `68566d63b13396b359a3b493a5b7e4d8a70015d6`에 있다.
삭제·축약 전 전체 바이트를 대조했다. 이 커밋의 원격 보존은 이번 작업에서 확인하지 않는다.

- `docs/development-backlog.md`: 종료 개발 이력. 현재 미완료 작업은 현행 backlog에 유지한다.
- `docs/release-test-records.md`: 버전별 최초 실패·재검증·개별 실행 결과.
- `docs/release-evidence-index.md`: 당시 증거 연결과 중복 실행 요약.

```sh
git show 68566d63b13396b359a3b493a5b7e4d8a70015d6:docs/release-test-records.md
git show 68566d63b13396b359a3b493a5b7e4d8a70015d6:docs/release-evidence-index.md
git show 68566d63b13396b359a3b493a5b7e4d8a70015d6:docs/development-backlog.md
```

원문의 절 제목과 기능 ID로 검색한다. 과거 `approved`/`closed`는 당시 상태이며,
일반 회귀는 현행 정의와 출처가 있는 최소 fixture를 사용하고 이 원장을 자동 복원하지 않는다.
