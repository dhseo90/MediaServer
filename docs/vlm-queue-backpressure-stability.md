# VLM 큐·backpressure 검증

개발자가 VLM 작업의 실패를 media/EventRecord/metadata fanout/Event POST dispatch와
분리하는 계약을 확인하는 안내다. 기본 명령은 `verify-vlm-queue-backpressure-stability`다.
**이 명령 전체는 정적 fixture 검사만이 아니다.** 내부에서 `verify-analysis-state`를 호출해
C++ 제품 큐의 timeout/drop 및 configured-zones 경계를 실제 smoke로 확인한다.

## 계약과 사례

[fixture](../test/fixtures/vlm_queue_backpressure/cases.json)의 schema는
`media-server.vlm-queue-backpressure-fixtures.v1`이다.
[검증기](../scripts/internal/verify_vlm_queue_backpressure_stability.mjs)의 `evaluateCase`는
입력에서 outcome을 계산하고 기대값·차단 경로·side effect를 비교한다.

| case | 기대 outcome |
| --- | --- |
| `default-off-no-worker` | `default-off-no-queue-start` |
| `missing-model-nonblocking` | `blocked-missing-model-nonblocking` |
| `queue-timeout-drop-vlm-only` | `timeout-no-media-path-failure` |
| `invalid-output-rejected-no-sidecar` | `rejected-invalid-output-nonblocking` |
| `metadata-fanout-independent` | `metadata-fanout-independent` |
| `event-post-dispatch-independent` | `event-post-dispatch-independent` |

fixture의 `runtimeVlmCallPerformed=false`, `sidecarStored=false`,
`viewerClientExposureAdded=false`와 credential/schema/media 변경 금지를 유지한다.
`mediaPathBlocked/eventRecordBlocked/metadataFanoutBlocked/eventPostDispatchBlocked`도 false다.

[vlm_feature_queue.cpp](../src/analysis/vlm_feature_queue.cpp)의 `MakeOutcome`와 큐 처리 경계를
[analysis_state_smoke.cpp](../scripts/internal/analysis_state_smoke.cpp)가 관측한다.
검증기는 `[review4-safe-032-036]`의 `queueAction=drop-vlm-task`·
`failureReason=queue-timeout` 및 비차단 값을 읽는다. `[safe-056-cross-zone]`의
configured-zones/re-entry·schema/media/viewer 불변 조건도 별도로 읽는다.
기능 연결은 LAB-058·SAFE-032·SAFE-036·SAFE-056이다.

## 실행과 출력

C++ smoke의 빌드 도구·의존성과 임시 산출물 실행 범위를 먼저 확인한다.

```bash
: "${vlm_run_root:?이번 실행의 소유 절대 경로를 지정하세요}"
./server.sh verify-vlm-queue-backpressure-stability \
  --report "$vlm_run_root/queue.md" \
  --json-report "$vlm_run_root/queue.json"
```

report schema는 `media-server.vlm-queue-backpressure-stability-report.v1`이다.
`status/checks/cases/summary`를 함께 읽으며 개별 case의 `outcome/queueAction/failureReason`,
`nonblocking/blockedPaths/sideEffects`를 구분한다. check 결과가 report로 생성되는 경우
검사 실패는 전체 `status=fail`과 exit 1이다. 입력·report assertion 등에서 먼저 예외가 나면
JSON 파일이 생성되지 않을 수 있으므로 원출력과 exit도 함께 확인한다.
합성 fixture의 비차단 판정과 실제 C++ smoke 관측을 같은 종류의 증거로 취급하지 않는다.

fixture의 `requiredCommands`는 영향 회귀 정의이며 이 검증기가 아래 묶음을 모두 실행하는
것은 아니다: `build`, `verify-va-events`, `verify-event-post`,
`verify-webrtc-va-metadata`, `verify-va-metadata-sidechannel`, `verify-ws-metadata`,
본 검증기, `git diff --check`. 각 명령은 승인된 범위에서 별도로 실행·기록한다.

실제 VLM/provider 호출·모델 다운로드·운영 sidecar 쓰기·미디어 부하 측정은 이 검사의
결과가 아니다. 안정화/30분/120분의 필요성과 승인·미실행 표기는
[검증 정책](stream-verification.md#검증-정책), 실제 화면 판정은
[UI 풀테스트](manual-ui-fulltest.md)를 따른다. 정적·짧은 smoke를 장시간/UI 성공으로 대체하지 않는다.
