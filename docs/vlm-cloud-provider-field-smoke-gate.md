# VLM cloud provider 호출 승인과 smoke

기본 무호출 검사와 별도 승인된 provider 호출을 구분하는 운영자·개발자 안내입니다.
`verify-vlm-cloud-provider-field-smoke-gate`는 기본 실행에서 합성 fixture와 gate를 검사합니다.
`gateStatus=pass`여도 `fieldSmoke.status=not-run`, `providerApiCalled=false`, `releasePassEligible=false`일 수 있습니다.
이는 provider 성공이나 릴리즈 전체 완료를 뜻하지 않습니다.

## 실제 호출 조건과 지원 범위

현재 구현은 `gemini`만 호출하며 기본 model 문자열은 `gemini-2.5-flash`입니다.
이는 코드/fixture 기본값 설명이지 현재 가용성·최신성·품질 추천이 아닙니다.
실제 호출에는 다음 조건이 모두 필요합니다.

- CLI `--allow-field-call`
- `MEDIA_SERVER_VLM_CLOUD_FIELD_SMOKE_APPROVED=1`
- `MEDIA_SERVER_VLM_CLOUD_API_KEY` 또는 `GEMINI_API_KEY`의 env credential(앞의 값 우선)
- 지원 provider `gemini`

이 CLI는 제품 서버 로그인이나 저장된 `privacyGuard`를 읽지 않습니다.
[프로필의 전송 guard](vlm-privacy-transfer-guard.md)와 별개로 실행 대상·전송·비용·정책·정리 범위를 승인해야 합니다.
키는 승인된 비밀 관리 경로로 실행 환경에 주입하고 shell 명령·history·Git·보고서에 직접 적지 않습니다.

| 옵션·환경변수 | 의미 |
| --- | --- |
| `--provider`, `MEDIA_SERVER_VLM_CLOUD_PROVIDER` | CLI → env → fixture 기본값 순. 다른 provider는 호출 전 `fail` |
| `--model`, `MEDIA_SERVER_VLM_CLOUD_MODEL` | 같은 우선순위의 요청 model 문자열 |
| `--endpoint`, `MEDIA_SERVER_VLM_CLOUD_FIELD_ENDPOINT` | CLI → env 순의 요청 URL override. 없으면 Gemini `generateContent` HTTPS endpoint |
| `--timeout-ms` | 요청 제한, 기본 8000 ms |
| `--report`, `--json-report` | 각각 Markdown·JSON 출력 경로. 생략하면 stdout만 출력 |

override endpoint에도 `x-goog-api-key` header가 전달됩니다. 도구가 endpoint의 신뢰성·provider 소유권이나
HTTPS 전용 정책을 강제하지 않으므로 승인받은 주소와 환경변수 override를 실행 전에 직접 확인해야 합니다.
사용자가 외부 실행을 제외한 경우 이 절차를 자동 실행 과제로 추가하지 않습니다.

## 실행 예시

먼저 [소유 결과 경로](vlm-runtime-opt-in-contract.md#실행-자료-경로-준비)를 준비합니다.
기본 무호출 예시는 승인·credential·override env를 제거하며 `--allow-field-call`을 전달하지 않습니다.

```sh
: "${vlm_run_root:?이번 실행의 소유 절대 경로를 먼저 준비하세요}"
env -u MEDIA_SERVER_VLM_CLOUD_FIELD_SMOKE_APPROVED \
  -u MEDIA_SERVER_VLM_CLOUD_API_KEY -u GEMINI_API_KEY \
  -u MEDIA_SERVER_VLM_CLOUD_FIELD_ENDPOINT -u MEDIA_SERVER_VLM_CLOUD_PROVIDER \
  -u MEDIA_SERVER_VLM_CLOUD_MODEL \
  TMPDIR="$vlm_run_root/tmp" ./server.sh verify-vlm-cloud-provider-field-smoke-gate \
  --report "$vlm_run_root/cloud-gate.md" --json-report "$vlm_run_root/cloud-gate.json"
```

다음 예시는 외부 실행을 별도 승인하고 위 approval·credential 환경을 안전하게 주입한 경우에만 사용합니다.
flag만 추가하거나 env approval만 설정한 실행은 호출하지 않습니다.

```sh
: "${vlm_run_root:?이번 실행의 소유 절대 경로를 먼저 준비하세요}"
TMPDIR="$vlm_run_root/tmp" ./server.sh verify-vlm-cloud-provider-field-smoke-gate \
  --allow-field-call --provider gemini --model gemini-2.5-flash \
  --report "$vlm_run_root/cloud-field.md" --json-report "$vlm_run_root/cloud-field.json"
```

MediaServer 서버는 필요하지 않습니다. 실제 호출은 영상 없는 고정 smoke prompt를 POST하고
응답의 `media-server.vlm-cloud-field-smoke-output.v1`·`status=ok`를 검사합니다.
설명 품질, 영상 이해, 운영 모델 성능을 평가하지 않습니다.

## 판정과 fixture

[cases.json](../test/fixtures/vlm_cloud_provider_field_smoke_gate/cases.json)의 schema는
`media-server.vlm-cloud-provider-field-smoke-gate-fixtures.v1`이며 아래 여섯 사례는 합성 예상값입니다.

| 사례 ID | 기대 `fieldSmokeStatus` | `releasePassEligible` |
| --- | --- | --- |
| `not-approved-not-run` | `not-run` | `false` |
| `manual-flag-without-env-approval-not-run` | `not-run` | `false` |
| `env-approval-without-manual-flag-not-run` | `not-run` | `false` |
| `approved-missing-credential-blocked` | `blocked-missing-credential` | `false` |
| `approved-provider-timeout-fail-not-release-pass` | `fail` | `false` |
| `approved-provider-pass-release-eligible` | `pass` | `true` |

실행 보고서 schema는 `media-server.vlm-cloud-provider-field-smoke-gate-report.v1`입니다.
`targetStep=V210-S03`은 호환 식별자이며 `generatedAt`, `fixturePath`, `gateStatus`,
`fieldSmoke`, `redaction`, `summary`, `cases`, `checks`를 포함합니다.
실제 실행 결과는 `cases`의 합성 pass가 아니라 `fieldSmoke`를 읽습니다.

- `fieldSmoke`에는 provider/model, `manualApprovalFlag`, `envApproval`, `credentialSource=env|missing`,
  `providerApiCalled`, `status`, `releasePassEligible`, `reason`, `httpStatus`, `latencyMs`, `responseShape`가 있습니다.
- `providerApiCalled=true`는 요청을 시도했다는 뜻이며 응답 수신 성공을 보장하지 않습니다.
- HTTP 오류·timeout·잘못된 JSON은 `fail`입니다. `responseShape`는 `not-run`, `not-called`,
  `unsupported-provider`, `http-error`, `invalid-output`, `structured-json-pass`, `error`를 구분합니다.
- 내부 검사 실패 또는 flag+env로 요청한 field run이 pass가 아니면 exit 1입니다.
  `gateStatus`가 pass여도 credential 누락/field 실패로 exit 1일 수 있습니다.
- `releasePassEligible=true`는 이 smoke의 조건부 증거 자격일 뿐 전체 릴리즈 승인이나 profile 자동 활성화가 아닙니다.

## 개인정보와 검증 한계

보고서는 credential·raw prompt·raw provider response·source URL·raw frame·viewer/client 노출을 저장하지 않는 계약이며
`redaction`의 `credentialMaterialStored`, `rawPromptStored`, `rawProviderResponseStored`, `sourceUrlStored`,
`rawFrameBytesStored`, `viewerClientExposureAdded`는 모두 false입니다.
[구현](../scripts/internal/verify_vlm_cloud_provider_field_smoke_gate.mjs)은 알려진 prompt 문구와 주입한 키의
포함 여부를 검사하고 오류에서 그 키를 치환합니다. 임의의 endpoint·model 문자열이나 모든 오류 내용까지
일반적인 비밀 탐지·정제 도구로 보장하지 않으므로 공유 전 별도 검토가 필요합니다.

검증기는 `TMPDIR` 아래 일시 JSON readback 파일을 쓰고 정리합니다. credential 영속 저장소,
VLMObservation sidecar 저장, Auth/session/scope·Event POST/WebRTC DataChannel/SSE/WS schema·
RTSP/WebRTC media path 변경은 하지 않습니다. provider의 billing·retention 승인을 보장하지 않습니다.
현행 구현 증거에서 [기능 ID](project-feature-test-inventory.md) `LAB-057`은 이 하위 gate의 readback,
`SAFE-035`는 상위 `verify-v230-vlm-opt-in-operational-evidence`의 비밀·side-effect 경계 readback에 연결됩니다.
`verify-vlm-privacy-transfer-guard` 및 상위 묶음과의 관계는
[공통 검증 안내](vlm-runtime-opt-in-contract.md#검증과-결과-해석)를 따릅니다.
로컬 smoke·정적 gate·미실행 결과를 실제 provider 성공, UI·30분/120분 결과로 대체하지 않습니다.
