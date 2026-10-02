# VLM 검증 전 fixture 리허설

개발자가 실패 상태와 실행 준비 조건을 짧게 점검하는 정적 리허설이다.
`verify-vlm-test-rehearsal`은 JSON fixture를 평가하고 선택한 보고서를 쓰지만
제품 서버·모델·cloud provider를 호출하거나 포트를 bind하지 않는다.
실제 큐 실행은 [큐 검증](vlm-queue-backpressure-stability.md),
연결 smoke는 [로컬 연결](vlm-local-runtime-connection-smoke.md)과 구분한다.

## 사례와 불변 조건

[fixture](../test/fixtures/vlm_test_rehearsal/cases.json) schema는
`media-server.vlm-test-rehearsal-fixtures.v1`이다.
[검증기](../scripts/internal/verify_vlm_test_rehearsal.mjs)의 `deriveOutcome/evaluateCase`가
아래 기대값 및 side effect false 조건을 비교한다.

| case | 기대 outcome |
| --- | --- |
| `short-vlm-smoke` | `fixture-smoke-ready` |
| `missing-model` | `blocked-missing-model` |
| `cloud-disabled` | `blocked-cloud-disabled` |
| `invalid-output` | `rejected-invalid-output` |
| `queue-timeout` | `timeout-no-media-path-failure` |
| `cleanup-lifecycle` | `cleanup-ok` |
| `port-server-lifecycle` | `lifecycle-plan-valid` |

각 fixture의 `runtimeVlmCallPerformed=false`, `cloudProviderApiCalled=false`,
`sidecarStored=false`, `viewerClientExposureAdded=false`를 유지한다.
모델 다운로드·credential/profile 저장·Event POST/WebRTC DataChannel/SSE/WS schema·
RTSP/WebRTC 경로 변경도 false다.

`cleanupRequired`와 `cleanupState=cleanup-ok`는 fixture의 기대 계약에서 만든 값이며,
실제 파일을 삭제하고 부재를 확인한 결과가 아니다.
`serverLifecycle=throwaway-required-for-attached-smoke`,
`portLifecycle=explicit-isolated-port-required`도 후속 attached smoke의 준비 조건이다.
현재 리허설이 서버 시작·포트 격리·종료를 실행했다는 뜻으로 사용하지 않는다.

## 실행과 결과

```bash
: "${vlm_run_root:?이번 실행의 소유 절대 경로를 지정하세요}"
./server.sh verify-vlm-test-rehearsal \
  --report "$vlm_run_root/rehearsal.md" \
  --json-report "$vlm_run_root/rehearsal.json"
```

report schema는 `media-server.vlm-test-rehearsal-report.v1`이다.
`summary`의 `cases/failureFixtures/cleanupCases/lifecycleCases`와
`cases[].status/outcome/expectedOutcome/sideEffects/verdictNotes`, `checks`를 함께 읽는다.
기대된 실패 outcome을 올바르게 분류하면 case는 `pass`이며, 실제 운영 성공을 뜻하지 않는다.
불일치는 report의 `status=fail`과 exit 1로 전파된다.

필요한 범위의 기존 짧은 검사를 선택하는 fallback은
`verify-vlm-boundary`, `verify-vlm-install-connection-dry-run`, `verify-vlm-profile-storage`,
`verify-vlm-evaluation-harness`, `verify-vlm-observation-sidecar`,
`verify-vlm-event-explanation-hints`, `verify-vlm-summary-search-candidates`,
`verify-vlm-rule-suggestion-candidates`다. 리허설은 이 명령들을 자동 실행하지 않으며
실패한 선행 검사를 건너뛰기 위한 대체 PASS도 아니다.

실제 부작용·정리·서버 수명·runtime 품질은 별도로 관측해야 한다.
[검증 정책](stream-verification.md#검증-정책)과 [UI 풀테스트](manual-ui-fulltest.md)의
승인·증거 요건을 따르며 이 결과만으로 안정화/30분/120분/UI 완료를 선언하지 않는다.
