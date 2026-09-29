# VLM 개인정보와 외부 전송 guard

cloud VLM 후보를 검토하고 프로필을 저장하는 운영자와 API 개발자를 위한 기준입니다.
`media-server.vlm-privacy-transfer-guard.v1`은 Ops dry-run 응답의 `privacyTransferGuard`와
프로필의 `privacyGuard`에 사용하는 검토 metadata입니다. 체크를 마치거나 프로필을 저장하는 행위가
provider 호출, 원격 정책 준수, 실제 전송 승인 범위 전체를 입증하지는 않습니다.

## 프로필 저장 조건

cloud profile은 [프로필 저장 계약](vlm-profile-storage.md)에 더해 다음을 만족해야 합니다.

| 필드 | cloud 기준 |
| --- | --- |
| `privacyMode` | `cloud-allowed` |
| `cloudOptInAcknowledged` | `true` |
| `privacyGuard.schema` | `media-server.vlm-privacy-transfer-guard.v1` |
| `privacyGuard.externalTransfer` | provider 유형과 일치. UI는 cloud에 `true` 작성 |
| `privacyGuard.externalTransferWarningAcknowledged` | `true` |
| `privacyGuard.providerLoggingPolicy.reviewStatus` | `accepted` |
| `privacyGuard.providerLoggingPolicy.loggingAndRetentionReviewed` | `true` |
| `privacyGuard.providerLoggingPolicy.termsReviewed` | `true` |

`privacyGuard.redaction`의 `credentialMaterialStored`, `promptStored`, `rawProviderResponseStored`,
`sourceUrlStored`, `rawFrameBytesStored`, `viewerClientExposureAdded`는 모두 명시적 false여야 합니다.
guard/schema·필수 redaction 값·cloud 검토가 누락되거나 잘못되면 서버가 저장을 거부합니다.
`externalTransfer` 생략 시 서버는 provider 유형으로 기본값을 판단하며 반대 값을 명시하면 거부합니다.

local profile은 `privacyGuard` 생략이 허용됩니다. 객체를 제공하면 schema·redaction 검사는 동일하며
`externalTransfer=true`는 허용하지 않습니다. UI는 local에도 guard를 작성하고 provider review는
`not-applicable`로 표시합니다. local에 cloud logging/terms accepted 검토를 요구하지 않습니다.
UI의 `targetStep=V200-S11`, `externalTransferWarningRequired`, `currentProviderPolicyStored=false`는
호환·설명 metadata이며 실제 외부 정책 문서를 저장하거나 검사한 결과가 아닙니다.

## Ops 화면과 API

`/ops/vlm`의 Privacy/전송 guard panel은 cloud 후보에서 외부 전송 경고 확인과
provider logging/retention 검토를 받습니다. 두 체크가 충족되지 않으면 저장 버튼을 비활성화하고,
서버도 별도로 guard를 검증합니다. UI는 한 provider 검토 체크로 logging/retention과 terms 검토 값을 작성합니다.
dry-run의 `review-required` 표시와 저장 profile의 `accepted` 상태를 혼동하지 않습니다.

`/ops/api/vlm/profiles`·개별 프로필 조회는 `admin/operator`와 `ops:read`, 저장·삭제는 추가로
`rule:write`가 필요합니다. 상세 route는 [opt-in 계약](vlm-runtime-opt-in-contract.md#권한과-불변-경계)을 따릅니다.
dry-run JSON은 Ops debug details에만 두고 viewer/client에 원문·진단 또는 guard를 노출하지 않습니다.

## 비밀 비저장과 보호 한계

credential, raw prompt·provider response, source URL/locator, raw frame bytes를
profile·sidecar·Ops review 결과·viewer/client·Event POST/WebRTC DataChannel/SSE/WS payload에 넣지 않습니다.
provider 정책 전문이나 credential이 포함된 policy material도 복사하지 않고 검토 상태만 기록합니다.

현재 [저장 검증](../src/ingress/webrtc_http_server_detail.h)의 `PrepareVlmProfileDocumentLocked`는
`apiKey`, `credential`, `providerCredential`, `prompt`, `rawPrompt`, `rawResponse`, `sourceUrl`,
`sourceLocator`, `imageData`, `frameBytes` 키를 거부하고 `ValidateVlmPrivacyGuardContract`가
위 상태·flag를 검사합니다. 이는 알려진 필드와 선언값의 validation이지 모든 문자열의 민감정보를
자동 탐지·삭제하는 기능이 아닙니다. 허용된 metadata나 오류 메시지에도 비밀을 넣지 말고 공유 전에 정제 상태를 확인합니다.

`accepted`는 운영자의 검토 선언입니다. provider의 최신 logging/retention/terms, 데이터 소재지,
계정 설정·비용·실제 원격 보관 행태를 이 guard가 대신 확인하거나 강제하지 않습니다.
[cloud smoke](vlm-cloud-provider-field-smoke-gate.md)는 저장 profile과 별개 CLI이며
명시 flag·env approval·credential을 검사합니다. guard 통과만으로 그 명령을 실행하지 않습니다.

## 검증 정의와 미실행 경계

```sh
./server.sh verify-vlm-privacy-transfer-guard
```

[검증기](../scripts/internal/verify_vlm_privacy_transfer_guard.mjs)는 fixture, 서버 validation·Ops panel source,
문서/명령 연결, viewer/client 및 기존 event 경계의 정적 검사를 수행합니다.
stdout `pass`·`fail`과 실패 시 exit 1을 출력하며 실제 브라우저 조작이나 API 저장을 실행하지 않습니다.
`verify-vlm-profile-storage`, `verify-auth-routes`, `verify-ops-client-ui`는 각각 별도 범위의 명령입니다.
기능 `UI-024`·`LAB-042`·`SAFE-024`의 정의는 [inventory](project-feature-test-inventory.md)에 있습니다.

[cases.json](../test/fixtures/vlm_privacy_transfer_guard/cases.json)의 schema는
`media-server.vlm-privacy-transfer-guard-fixtures.v1`이고 다음 기준을 유지합니다.

- `local-profile-redaction-pass`: local profile의 비저장 flag
- `cloud-profile-provider-logging-required`: 경고 확인만 있고 logging 검토가 빠진 cloud 후보 차단
- `cloud-profile-complete-guard-pass`: cloud 경고·logging/retention·terms 검토가 갖춰진 후보
- `ops-review-redaction-boundary`: Ops review와 viewer/client 정보 비노출

이 guard는 runtime/provider 호출, credential 영속 저장, sidecar 저장 정책 변경,
semantic event search·rule suggestion 구현을 수행하지 않습니다. EventRecord/API·Event POST·
WebRTC DataChannel·SSE/WS metadata 및 RTSP/WebRTC media path를 바꾸지 않습니다.
실제 provider 정책 검토·연결 성공·UI 풀테스트·30분/120분 실행 증거와는 별개입니다.
`verify-v230-vlm-opt-in-operational-evidence`를 포함한 공통 실행·기록 경계는
[검증과 결과 해석](vlm-runtime-opt-in-contract.md#검증과-결과-해석)을 따릅니다.
