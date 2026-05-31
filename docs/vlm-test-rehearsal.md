# VLM Test Rehearsal

이 문서는 `v2.0.0 V200-S15 간이 테스트 리허설`의 source-of-truth입니다.
S15는 안정화, 30분, 120분, UI 풀테스트를 실행하기 전에 VLM 전용 짧은 smoke와
failure fixture가 막히지 않는지 확인하는 단계입니다. 이 문서와 verifier는
실제 VLM runtime 호출, model download, cloud provider API 호출, longrun, UI
풀테스트를 실행하지 않습니다.

## 직접 답

S15에서 쓰기로 한 1차 리허설은 `verify-vlm-test-rehearsal`입니다. 이 리허설은
fixture-only 방식으로 `short-vlm-smoke`, `missing-model`, `cloud-disabled`,
`invalid-output`, `queue-timeout`, `cleanup-lifecycle`, `port-server-lifecycle`을
확인합니다.

Fallback은 기존 짧은 VLM verifier 묶음입니다. 구체적으로
`verify-vlm-boundary`, `verify-vlm-install-connection-dry-run`,
`verify-vlm-profile-storage`, `verify-vlm-evaluation-harness`,
`verify-vlm-observation-sidecar`, `verify-vlm-event-explanation-hints`,
`verify-vlm-summary-search-candidates`, `verify-vlm-rule-suggestion-candidates`를
사용합니다.

제외 대상과 이유:

- 실제 VLM runtime 호출: S15는 테스트 리허설이며 runtime 품질 판정이 아닙니다.
- model/runtime download: bundle/release 경계와 privacy 검토가 별도입니다.
- cloud provider API 호출: cloud opt-in과 provider logging/retention 검토 전 호출하지 않습니다.
- sidecar 저장 또는 EventRecord 변경: S08~S13 fixture 검증과 S16 side effect 점검으로 분리합니다.
- 30분/120분 장시간 실행: 사용자 명시 요청 또는 S17 trigger 기준이 필요합니다.
- 인앱 브라우저 UI 풀테스트: S18 close-out readiness 전용 evidence로 분리합니다.

## Fixture Matrix

Fixture schema는 `media-server.vlm-test-rehearsal-fixtures.v1`입니다.
Report schema는 `media-server.vlm-test-rehearsal-report.v1`입니다.

| Case | 목적 | 기대 outcome |
| --- | --- | --- |
| `short-vlm-smoke` | VLM fixture-only command가 짧은 gate로 준비되는지 확인 | `fixture-smoke-ready` |
| `missing-model` | local model 부재를 media path 실패로 전파하지 않음 | `blocked-missing-model` |
| `cloud-disabled` | cloud 후보가 opt-in 없이 호출 가능 상태가 되지 않음 | `blocked-cloud-disabled` |
| `invalid-output` | 잘못된 structured output을 저장하지 않고 거부 | `rejected-invalid-output` |
| `queue-timeout` | queue timeout을 VLM-only timeout으로 분리 | `timeout-no-media-path-failure` |
| `cleanup-lifecycle` | throwaway artifact cleanup 필요 여부를 명시 | `cleanup-ok` |
| `port-server-lifecycle` | attached smoke는 격리 port/server lifecycle을 요구 | `lifecycle-plan-valid` |

`port/server lifecycle` case는 정적 리허설에서 포트를 bind하지 않습니다. 실제 attached
smoke가 필요한 경우에는 S16 또는 UI/attached verifier가 격리 HTTP/RTSP 포트와
throwaway registry를 명시해야 합니다.

## Command

```bash
./server.sh verify-vlm-test-rehearsal \
  --report /tmp/media_server_vlm_test_rehearsal.md \
  --json-report /tmp/media_server_vlm_test_rehearsal.json
```

## Non-Scope

S15에서 하지 않는 일:

- 안정화/30분/120분/UI 풀테스트 완료 evidence 생성
- 실제 VLM runtime 호출
- cloud provider API 호출
- model/runtime download 또는 bundle 추가
- credential 저장
- profile 저장
- VLMObservation sidecar 저장
- Event POST/WebRTC DataChannel/SSE/WS metadata schema 변경
- RTSP/WebRTC media path 변경
- viewer/client 화면 노출
- S16 side effect 점검
- S17 안정화/장시간/UI 기준 정리
- S18 close-out readiness

이 리허설은 안정화/30분/120분/UI 풀테스트 완료 evidence가 아닙니다. 실패 fixture가
기대 outcome으로 처리되는지 확인할 뿐, 실제 운영 안정성이나 수동 UI 품질 판정을
대신하지 않습니다.

## 완료 기준

- `./server.sh verify-vlm-test-rehearsal`이 fixture matrix, VLM-only outcome,
  cleanup, port/server lifecycle, docs/server/script inventory 연결을 검증합니다.
- 기존 VLM short verifier 중 필요한 명령이 계속 PASS합니다.
- `git diff --check`가 코드/문서/script whitespace drift를 확인합니다.

S15를 완료해도 S16 side effect 점검, S17 안정화/장시간/UI 기준 정리, S18 close-out
readiness는 완료되지 않습니다.
