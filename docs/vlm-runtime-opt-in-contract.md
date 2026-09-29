# VLM 명시 활성화와 runtime 저장 계약

VLM 프로필을 저장하거나 검증 도구를 유지보수하는 개발자·운영자를 위한 기준입니다.
프로필의 활성화 metadata, 로컬 연결 검사, 외부 provider 호출은 서로 다른 경로입니다.
VLM 실행은 default-off이며, 프로필을 저장하거나 `activation.status=active`로 승인해도 현재 제품이 VLM을 자동 호출하지 않습니다.

| 경로 | 실제로 하는 일 | 하지 않는 일 |
| --- | --- | --- |
| `/ops/vlm`·프로필 API | 후보 선택, 서버 평가 참조 확인, opt-in metadata 저장 | 모델 설치·runtime 시작·provider 호출 |
| [로컬 smoke](vlm-local-runtime-connection-smoke.md) | 검증기 내부 loopback HTTP와 오류·정리 검사 | 사용자 Ollama/vLLM 모델 실행·품질 판정 |
| [cloud gate](vlm-cloud-provider-field-smoke-gate.md) | 기본은 합성 사례 검사, 별도 승인 조건에서만 실제 HTTP 호출 | 기본 실행의 provider 성공 승격 |

프로필 전체 payload·평가 승격은 [프로필 저장](vlm-profile-storage.md), 외부 전송 검토는
[개인정보 전송 guard](vlm-privacy-transfer-guard.md), 화면은 [상태 UI](vlm-runtime-status-ui.md)가 기준입니다.

## 저장 필드와 상태

`media-server.vlm-profile.v1` 안의 `runtimeContract` 객체 schema는
`media-server.vlm-runtime-opt-in-contract.v1`입니다. 현재 UI는 `targetStep=V210-S01`을
호환 metadata로 작성합니다. 이는 실행 날짜나 현재 개발 단계가 아니며 서버의 필수값 검사와도 구분합니다.

| 필드 | 저장 검증 기준 |
| --- | --- |
| `schema` | `media-server.vlm-runtime-opt-in-contract.v1` |
| `mode` | `disabled`, `local-runtime`, `cloud-provider` |
| `status` | 아래 여섯 상태 중 하나 |
| `defaultEnabled` | `false` |
| `operatorOptInRequired` | `true` |
| `runtimeCallAllowed` | `false` |
| `providerCallAllowed` | `false` |
| `sideEffects` | 아래 열거된 필드가 모두 명시적 `false` |

| `status` | 의미와 제한 |
| --- | --- |
| `disabled` | 활성화 `enabled=true`나 `status=active` 불가. `mode=disabled`이면 이 상태여야 함 |
| `local-runtime` | local provider와 구성된 runtime의 metadata. `provider-api`·`not-configured` runtime은 불가 |
| `cloud-provider` | cloud provider 후보. 외부 호출이나 field smoke 성공을 나타내지 않음 |
| `missing-model` | local 준비 부족을 나타내며 cloud profile에는 불가. 활성화 `enabled=true` 불가 |
| `invalid-output` | VLM 결과 거부 상태. 활성화 `enabled=true` 불가 |
| `timeout` | VLM 지연 실패 상태. 활성화 `enabled=true` 불가 |

cloud profile에는 `mode=cloud-provider`가 필요하고 local profile에는 그 mode를 허용하지 않습니다.
프로필 활성화에는 별도로 서버가 검증한 평가 결과와 운영자의 저장·활성화 검토가 필요합니다.
상태 이름을 실제 연결 측정이나 현재 runtime의 자동 상태 전이로 해석하지 않습니다.

`sideEffects`의 필수 false 필드는 `runtimeVlmCallPerformed`, `cloudProviderApiCalled`,
`modelArtifactDownloaded`, `modelArtifactBundled`, `credentialStored`, `sidecarStored`,
`eventPostPayloadChanged`, `webrtcDataChannelSchemaChanged`, `sseMetadataSchemaChanged`,
`wsMetadataSchemaChanged`, `rtspOrWebrtcMediaPathChanged`, `viewerClientExposureAdded`입니다.

UI가 작성하는 `operatorOptInAcknowledged`, `providerFieldSmokeRequired`, `failurePolicy`는
설명 metadata입니다. cloud 후보는 `providerFieldSmokeRequired=true`로 표시합니다.
`failurePolicy`는 missing model의 `blocked-missing-model-no-media-path-failure`,
invalid output의 `rejected-invalid-output-no-sidecar-write`, timeout의
`timeout-no-media-path-failure`를 구분하지만 이 객체 자체가 호출·재시도·fallback을 실행하지는 않습니다.

## 권한과 불변 경계

`GET /ops/api/vlm/profiles` 및 개별 조회는 Ops 권한(`admin/operator`, `ops:read`)을 요구합니다.
`POST /ops/api/vlm/profiles`, `PUT`·`DELETE /ops/api/vlm/profiles/{id}`에는 추가로 `rule:write`가 필요합니다.
Auth/session/scope를 우회하거나 viewer/client에 프로필·진단 JSON을 노출하지 않습니다.

이 경로는 credential·모델/runtime bundle·VLMObservation sidecar를 저장하지 않습니다.
VLM 설명·sidecar 계약을 EventRecord/API schema에 섞거나 Event POST, WebRTC DataChannel,
SSE/WS metadata, RTSP/WebRTC media path를 변경하지 않습니다. 모델 품질·billing·외부 정책 승인은 별도입니다.

## 검증과 결과 해석

```sh
./server.sh verify-vlm-runtime-opt-in-contract
```

이 명령은 [구현](../scripts/internal/verify_vlm_runtime_opt_in_contract.mjs)의 fixture·source·문서 연결 검사입니다.
[cases.json](../test/fixtures/vlm_runtime_opt_in_contract/cases.json)의 schema는
`media-server.vlm-runtime-opt-in-contract-fixtures.v1`이며 여섯 정상 상태와
`default-enabled-rejected`, `runtime-call-side-effect-rejected`를 정의합니다.
검사 결과는 stdout의 `pass`·`fail`로 출력하고 실패 시 exit 1입니다. 이 정적 명령이 실제 API 저장을 실행하지는 않습니다.

관련 명령 `verify-vlm-profile-storage`, `verify-vlm-privacy-transfer-guard`, `verify-auth-routes`는
각자의 검사 범위와 실행 전제가 다릅니다. 기능 정의 `SAFE-025`·`LAB-038` 및
`SAFE-027`·`SAFE-029`는 [기능 inventory](project-feature-test-inventory.md)를 따릅니다.

`./server.sh verify-v230-vlm-opt-in-operational-evidence`는 위 정적 검사와 privacy 검사,
로컬 loopback smoke, 기본 cloud gate를 묶습니다. 단순 문서 검사가 아니므로 loopback 실행 승인이 필요합니다.
출력 schema `media-server.v230-vlm-opt-in-operational-evidence.v1`의 `targetStep=V230-S05`는
호환 식별자입니다. 이 묶음의 통과도 실제 사용자 모델·cloud provider·UI·30분/120분 증거를 대체하지 않습니다.
실행 승인과 결과 판정은 [검증 정책](stream-verification.md#검증-정책)을 따릅니다.

상위 명령의 보존할 JSON은 `--json-report <path>`로 지정합니다. `executions`에는 자식의
stdout/stderr·exit·signal을, `runtimeEvidence`에는 로컬·cloud 하위 report와 cleanup 결과를 포함합니다.
이 두 하위 결과의 `jsonReport`는 null이며 정리된 임시 자식 경로를 영구 증거로 링크하지 않습니다.
`--report <path>`의 Markdown은 요약이므로 상세 실패·정리 판단에는 JSON을 함께 보존합니다.

### 실행 자료 경로 준비

보고서를 쓰는 명령은 승인된 실행의 소유 경로를 먼저 준비합니다. 아래는 준비 예시이며 검사 실행 승인이 아닙니다.

```sh
vlm_run_root="$(mktemp -d "${TMPDIR:-/tmp}/media-server-vlm.XXXXXX")" || exit 1
mkdir "$vlm_run_root/tmp" || exit 1
export TMPDIR="$vlm_run_root/tmp"
```

명령·source·exit·stdout/stderr와 실패→재검증 연결을 실행 단위로 보존합니다.
필요한 정제 자료 보존 후 소유 임시 경로만 정리하고 부재를 확인하는 절차는
[기록 수명 정책](../AGENTS.md#6-기록-수명과-정리)을 따릅니다.

구현 기준은 [서버 저장 검증](../src/ingress/webrtc_http_server_detail.h)의
`ValidateVlmRuntimeOptInContract`와 [UI payload](../src/ingress/product_ui_page_scripts.cpp)의
`buildOpsVlmRuntimeContract`입니다.
