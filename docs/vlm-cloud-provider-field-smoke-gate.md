# VLM Cloud Provider Field Smoke Gate

이 문서는 `v2.1.0 V210-S03 Cloud provider field smoke gate`의
세부 gate 기준입니다. S03은 cloud provider를 기본 release PASS로 자동 승격하지 않고,
credential 저장 없이 명시 승인과 env credential이 있을 때만 실제 field smoke를
수행하게 하는 gate입니다.

## 직접 답

S03에서 쓰기로 한 1차 gate는 `verify-vlm-cloud-provider-field-smoke-gate`입니다.
이 명령은 `media-server.vlm-cloud-provider-field-smoke-gate-fixtures.v1` fixture로
아래 조건을 확인하고 `media-server.vlm-cloud-provider-field-smoke-gate-report.v1`
report를 만들 수 있습니다.

- 기본 provider 후보: `gemini`
- 기본 model 후보: `gemini-2.5-flash`
- 실제 provider 호출 조건: `--allow-field-call` manual flag,
  `MEDIA_SERVER_VLM_CLOUD_FIELD_SMOKE_APPROVED=1`, env credential이 모두 필요
- credential source: `MEDIA_SERVER_VLM_CLOUD_API_KEY` 또는 `GEMINI_API_KEY`
- credential 저장: 금지
- 미실행/실패: release PASS로 사용할 수 없음

기본 실행은 provider API를 호출하지 않습니다. default report의 field smoke status는
`not-run`이고 `releasePassEligible=false`입니다. 실제 provider 호출을 하려면 아래처럼
사용자가 승인과 credential을 같은 실행에 제공해야 합니다.

```bash
MEDIA_SERVER_VLM_CLOUD_FIELD_SMOKE_APPROVED=1 \
MEDIA_SERVER_VLM_CLOUD_API_KEY=<env-only-secret> \
./server.sh verify-vlm-cloud-provider-field-smoke-gate \
  --allow-field-call \
  --provider gemini \
  --model gemini-2.5-flash \
  --report /tmp/media_server_vlm_cloud_field_smoke.md \
  --json-report /tmp/media_server_vlm_cloud_field_smoke.json
```

## Gate Matrix

| Case | 목적 | field smoke status | release PASS 가능 |
| --- | --- | --- | --- |
| `not-approved-not-run` | 승인/credential 없는 기본 실행은 호출하지 않음 | `not-run` | 아니오 |
| `manual-flag-without-env-approval-not-run` | manual flag만으로는 호출하지 않음 | `not-run` | 아니오 |
| `env-approval-without-manual-flag-not-run` | env approval만으로는 호출하지 않음 | `not-run` | 아니오 |
| `approved-missing-credential-blocked` | 승인됐지만 credential이 없으면 호출 전 중단 | `blocked-missing-credential` | 아니오 |
| `approved-provider-timeout-fail-not-release-pass` | provider timeout/failure는 release PASS가 아님 | `fail` | 아니오 |
| `approved-provider-pass-release-eligible` | 승인, credential, provider response shape가 모두 통과한 field run만 eligible | `pass` | 예 |

## Redaction Boundary

Report와 public artifact에는 아래 값을 저장하지 않습니다.

- credential material
- raw prompt
- raw provider response
- source URL/source locator
- raw frame bytes
- viewer/client exposure

Report에는 provider/model, approval state, credential source가 env인지 여부, HTTP status,
latency bucket, response shape pass/fail 같은 sanitized field만 남깁니다.

## 운영 증적 경계

이 gate는 cloud provider를 자동으로 켜거나 기본 release PASS로 승격하지 않습니다.
관련 안정화 증적은 아래 경계를 함께 확인합니다.

- operator-approved profile promotion
- local/provider smoke intake
- privacy/default-off evidence
- no VLM default-on

기본 PASS는 provider gate 동작 증적입니다. 실제 cloud provider call, provider success,
provider credential 저장, model/runtime bundle, sidecar write, UI 풀테스트, 30분/120분
longrun 실행을 뜻하지 않습니다. Sidecar는 EventRecord/API schema에 섞지 않고,
Event POST/WebRTC DataChannel/SSE/WS metadata와 RTSP/WebRTC media path도 바꾸지
않습니다.

## Verification

```bash
./server.sh verify-vlm-cloud-provider-field-smoke-gate \
  --report /tmp/media_server_vlm_cloud_field_gate.md \
  --json-report /tmp/media_server_vlm_cloud_field_gate.json
./server.sh verify-vlm-privacy-transfer-guard
git diff --check
```

`verify-vlm-cloud-provider-field-smoke-gate`의 기본 PASS는 gate 동작 PASS입니다. 실제
provider field smoke PASS가 아닙니다. provider call이 미실행이면 release PASS로 쓰지
않고, provider call이 실패해도 release PASS로 쓰지 않습니다.

## Non-Scope

S03에서 하지 않는 일:

- provider credential persistent store 추가
- provider billing/retention 운영 승인 보장
- local runtime smoke PASS를 cloud provider PASS로 대체
- VLMObservation sidecar 저장
- Event POST/WebRTC DataChannel/SSE/WS metadata schema 변경
- RTSP/WebRTC media path 변경
- UI 풀테스트 PASS 생성
- 30분/120분 장시간 안정화 실행
