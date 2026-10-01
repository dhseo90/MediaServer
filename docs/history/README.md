# 종료 기록 조회

현재 사용법·계약·미래 계획은 [문서 안내](../README.md)에서 찾습니다.
종료된 실행·검토 원본은 아래 보존 커밋의 원래 경로에서 읽을 수 있습니다.
과거 PASS/FAIL·미실행·관측 시각은 당시 기록이며 현재 소스의 실행 결과가 아닙니다.

## 보존 위치

아래 보존 커밋은 원격 `v4.1.1`의 확인된 기준
`4944ca5a6c42598adacb34adc08fceee7a762bc6`에서 모두 도달할 수 있습니다.
이전에 로컬 전용으로 안내했던 기록도 이 이력에 포함됩니다. 원출력에 있는
“당시 push 미수행” 등의 provenance는 수정하지 않습니다.

| 버전·자료 | 원본 보존 commit | 원래 경로 |
| --- | --- | --- |
| v3.1.0~v3.8.0 및 v4.1.0 종료 실행, 초기 v4.1.1 문서 검사 | `0f85cec7ea066ff626f7b2983f924468467c9717` | `docs/release-artifacts/` 아래 해당 버전·실행 경로 |
| 현재 설명에 통합된 과거 UI 구현 문서 13개 | `0f85cec7ea066ff626f7b2983f924468467c9717` | 당시 `docs/v220-*.md`, `docs/v230-ui-renderer-module-decomposition.md` 중 정리 목록의 정확한 파일 |
| 이전 1,622개 정리 목록·최초 실패·재검증 | `d252e1fb241ab37af0509f18eac965dbb73decda` | `docs/release-artifacts/v4.1.1/closed-record-cleanup-20260929/result.json` |
| 임시 문서 리뷰와 1단계 결과 | `ca3e76e871d05577e6d461746a8918ac618a64a5` | `docs/documentation-review-2026-09-28.md`, `docs/release-artifacts/v4.1.1/backlog-roadmap-20260929/result.json` |
| 후보 범위·핵심 기록 의존 확인 | `1cc3bea3617cf0027c6773fe60f6eeeba7f14cf6` | `docs/release-artifacts/v4.1.1/core-record-dependencies-20260929/result.json` |

이 표는 같은 접두사의 모든 문서를 삭제했다는 뜻이 아닙니다. 현행 계약·회귀 입력·
출처 자료는 유지하며, 정확한 삭제 목록은 각 정리 커밋에서 확인합니다.
이미 정리한 1,622개를 이번에 다시 감사한 것으로 해석하지 않습니다.

## v4.1.1 개발 브랜치 마감

C1 소스·구조 확인, C2 독립 검토와 C3 적용·readback·coverage/readiness의 원본은
`4944ca5a6c42598adacb34adc08fceee7a762bc6`에 보존돼 있습니다.
다음 종료 자료 17개(3,227,847바이트)는 삭제 전 해당 커밋의 전체 바이트·SHA-256과 대조했습니다.
경로는 모두 `docs/release-artifacts/v4.1.1/` 아래입니다.

| 종료 자료 | 원래 경로 | 파일 수 |
| --- | --- | --- |
| 문서 링크·manifest 쓰기 경계 | `docs-links/result.json`, `manifest-write-boundary/result.json` | 2 |
| 중앙 기록 소비자 전환·제한 보완·명령 연결 | `central-record-migration-20260929/result.json`, `limited-review-fixes-20260929/result.json`, `command-binding-fix-20260930/result.json` | 3 |
| 제한 계약·수명 수정 | `limited-2a-contracts-20260930/result.json`, `limited-2b-boundaries-20260930/result.json` | 2 |
| C1 최초 결과·소비자 정합 | `structure-c1-20260930/result.json`, `structure-c1-consumers-20260930/result.json` | 2 |
| C2 수정 전후·재검토 준비 | `c2-review-fixes-20261001/result.json` | 1 |
| C2 검토 원본 6개와 C3 적용 결과 | `c3-approval-20261001/`의 JSON 7개 | 7 |

이번 3/4 문서·버전·삭제 검사의 최초 링크 실패와 재검증 원출력은
`90dba00492584612e74b6af057d80a6d43f58e35`의
`docs/release-artifacts/v4.1.1/stage3-closeout-20261001/result.json`에 보존했습니다.
이 추가 기록 1개(32,226바이트)도 Git 바이트 대조 뒤 현재 트리에서 제거했습니다.
최종 정리 확인은 정리 커밋 본문에, 푸시 확인은 작업 보고에 남깁니다.

C3 적용 원장 4개는 `ad562b309033b9ef4d50b7501fe267da23cf6a92`에 반영됐고
현재 `test/fixtures/`의 실행·검증 입력으로 유지합니다. 상세 승인 판단은 위 C3 보존 위치에서
조회하며 과거 수정 요청을 새 승인으로 덮지 않습니다. 이 소스 검토·정합 확인은 실제 UI나
장시간 실행을 대신하지 않습니다. 공개 조건은 [릴리즈 정책](../release-policy.md)을 따릅니다.

후보 원본은 기존 `.media_server.test` 입력에 그대로 남깁니다. 적용 audit과 후보는 JSON
내용이 같지만 직렬화 바이트가 다릅니다. C3 기록은 compact 재직렬화가 원본 바이트와
일치함을 확인한 사실과 후보 원본 파일 자체를 Git에 복사하지 않았다는 사실을 구분합니다.
원본의 Git 바이트 보존을 확인하지 않은 ignored 입력은 이번 정리 대상이 아닙니다.

과거 계획·completion snapshot·회귀 fixture·출처 중 현재 검사가 참조하는 자료도 유지합니다.
예를 들어 구조 handoff 계획은 readiness의 입력이며, v3.9.0 감사·인계 문서는 현행 discovery
fixture에 연결돼 있습니다. 해당 소비자나 fixture를 바꾸는 작업은 이번 정리 범위가 아닙니다.
이력 조회가 필요하다는 이유로 삭제한 로그를 일반 검사 입력으로 되돌리지 않습니다.

## 작업 파일을 덮어쓰지 않고 읽기

저장소 루트에서 실제 보존 커밋의 원본을 조회하는 예입니다.

```sh
git show 4944ca5a6c42598adacb34adc08fceee7a762bc6:docs/release-artifacts/v4.1.1/c3-approval-20261001/result.json
git show 4944ca5a6c42598adacb34adc08fceee7a762bc6:docs/release-artifacts/v4.1.1/c3-approval-20261001/independent-decisions.c2-recheck.json
git show 4944ca5a6c42598adacb34adc08fceee7a762bc6:docs/release-artifacts/v4.1.1/c2-review-fixes-20261001/result.json
git show d252e1fb241ab37af0509f18eac965dbb73decda:docs/release-artifacts/v4.1.1/closed-record-cleanup-20260929/result.json
git log --all -- docs/v220-ui-architecture-inventory.md
git archive 0f85cec7ea066ff626f7b2983f924468467c9717 docs/release-artifacts/v3.1.0 | tar -tf -
```

파일이 필요한 경우 별도 빈 디렉터리에 추출하고 현재 작업 트리를 덮어쓰지 않습니다.
shallow clone이나 source archive에는 해당 커밋이 없을 수 있습니다. 과거 기록 조회가
불가능해도 일반 빌드·현재 테스트를 위해 과거 로그나 로컬 ignored 자료를 복원하지 않습니다.
현재 트리 정리는 Git 이력 자체의 용량을 줄이는 작업이 아닙니다.

## 중앙 기록과 backlog 종료 본문

세 원본은 보존 커밋 `68566d63b13396b359a3b493a5b7e4d8a70015d6`에 있으며
위 원격 기준의 부모 이력에 포함됩니다. 삭제·축약 전에 전체 바이트를 대조한 자료입니다.

- `docs/development-backlog.md`: 종료 개발 이력. 현재 미완료는 현행 [backlog](../development-backlog.md)에 둡니다.
- `docs/release-test-records.md`: 버전별 최초 실패·재검증·개별 실행 결과.
- `docs/release-evidence-index.md`: 당시 증거 연결과 중복 실행 요약.

```sh
git show 68566d63b13396b359a3b493a5b7e4d8a70015d6:docs/release-test-records.md
git show 68566d63b13396b359a3b493a5b7e4d8a70015d6:docs/release-evidence-index.md
git show 68566d63b13396b359a3b493a5b7e4d8a70015d6:docs/development-backlog.md
```

원문의 절 제목과 기능 ID로 검색합니다. 과거 `approved`/`closed`는 당시 상태이며,
일반 회귀는 현행 정의와 출처가 있는 fixture를 사용하고 이 원장을 자동 복원하지 않습니다.

## v4.1.1 릴리즈 재시도 원본

다음은 이번 릴리즈 준비에서 추가된 로컬 보존 커밋이다. 공개·실제 UI·장시간 PASS를 뜻하지 않는다.
경로는 `docs/release-artifacts/v4.1.1/` 기준이다.

| 자료 | 보존 commit | 원래 경로 |
| --- | --- | --- |
| 최초 acceptance 실패 원본 18개 | `a24988c6a0d0a44208edd9039f1f5d84bc88e4ea` | `test-acceptance-current-final/` |
| 주석 보정 확인과 157개 자체검사 실패 원본 3개 | `1a77dd0f131829a43424c39f33bf5dcb586c1c4a` | `comment-resume-20261001/` |
| 입력 대역·현행 문서 연결 수정, 970개 자체검사, 37개 독립 판단과 결속 원본 30개 | `ad8e58557746deea81fcebc9756c4ed718b369fe` | `fixture-resume-20261001/` |

최초 실패 출력 18개는 위 Git 원본의 바이트·hash를 대조한 뒤 고정 출력 경로에서 제거했다.
같은 경로의 새 실행 결과와 최초 실패는 commit·실행 source·run ID로 구분한다.
나머지 보존 자료와 ignored 검토 원본은 재실행 준비에서 삭제하지 않았다.
