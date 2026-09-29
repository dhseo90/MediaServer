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

중앙 실행 원장과 일부 계획·증거는 아직 남아 있습니다. 현행 검사가 읽는 입력과
현재 계약을 분리하지 않은 자료를 과거 버전이라는 이유만으로 삭제하지 않습니다.
따라서 이 표는 전체 문서 정리 완료나 모든 기록의 삭제를 뜻하지 않습니다.
상세한 삭제 경로는 정리 커밋의 삭제 목록과 별도 보존된 실행 자료로 확인합니다.

이번 정리의 정확한 대상 1,622개와 검사·실패·재검증 원출력은 로컬 커밋
`d252e1fb241ab37af0509f18eac965dbb73decda`의
`docs/release-artifacts/v4.1.1/closed-record-cleanup-20260929/result.json`에 있습니다.
이 자료 자체도 보존 후 현재 트리에서 정리합니다. 원본 보존 기준과 달리 이 커밋은
이번 작업에서 푸시하지 않았으므로 원격 링크나 원격 보존 완료를 제시하지 않습니다.
이 기록의 보존 이후 최종 확인은 정리 커밋 본문에 남깁니다.

## 작업 파일을 덮어쓰지 않고 읽기

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
