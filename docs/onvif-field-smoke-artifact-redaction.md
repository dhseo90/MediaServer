# ONVIF 현장 산출물 정제 기준

현장 검증 자료를 공유하기 전에 비밀·장비·고객 식별자를 제거하는 기준입니다.
공유용 요약은 제품 API payload나 실장비 인증 정보가 아니며, 정제본을 원본과 같은 바이트의 증거라고 하지 않습니다.
실행 승인·gate 상태·합격 조건은 [현장 검증 절차](./onvif-field-smoke-gate.md)가 기준입니다.

## 공유 가능한 자료와 금지 값

| 자료 | 공유 가능한 요약 | 그대로 공유하면 안 되는 부분 |
| --- | --- | --- |
| Probe 결과 | 서비스 가용 여부, profile의 API·encoding·크기·fps·transport, 정제된 실패 | 실제 endpoint, host, profile token/name, stream URI, raw SOAP |
| Draft API | 미저장 상태, 익명 source/view ID, `selectedProfile`의 비식별 기술 값, `auth.credentialRefPresent` | `sourceDraft.rtspUrl`, `candidate.serialNumber`, 장비·장소가 드러나는 이름/tag/group |
| Ops 확인 | `/ops/sources`·`/ops/rules`의 Live/VA URL copy parity 결과 | 복사한 source locator·ONVIF endpoint·원본 URL |
| Client 확인 | `/client/api/views`·`/client/api/views/{viewId}`의 `clientRedaction` pass/fail | credential reference, source locator, raw diagnostic JSON |
| Screenshot | 필요한 전체 화면·상태·control이 보이고 민감값이 제거된 자료 | source URL, 계정·고객·장소·운영자 이름, credential 관련 값 |

`sourceDraft`는 Ops용 원본 URI를 포함하므로 전체 응답을 공개 안전한 JSON으로 취급하지 않습니다.
`notSaved=true`는 저장 부작용이 없다는 뜻이지 비식별화를 뜻하지 않습니다.
`publishedViewDraft`에 locator가 없더라도 displayName·group·ID까지 자동 정제되는 것은 아닙니다.
[합성 probe fixture](../test/fixtures/onvif_probe_result_stub.json)는 내부 probe-to-draft 입력 참고용이며,
그 내용을 실제 장비 값으로 바꿔 Git에 넣거나 원문 그대로 공유하지 않습니다.

로그·Markdown·JSON·screenshot·압축파일·파일명·directory 이름에서 다음 값을 제거합니다.

- 실제 camera IP/hostname/FQDN/MAC address/serial number와 ONVIF Device service endpoint·query.
- RTSP/RTSPS/live URI, WHEP/HLS origin URL과 source locator.
- username/password/token/cookie, Authorization·HTTP header, 실제 `credentialRef`·secret store key.
- raw SOAP request/response·XML body dump·raw diagnostic JSON, certificate dump·private key.
- 개인·고객 장소명·설치 위치·계정명·운영자 이름.

placeholder는 `<redacted-host>`, `<redacted-source-id>`, `<redacted-view-id>`, `<redacted-token>`처럼 사용합니다.
인증정보는 존재 여부와 `plaintextSecretIncluded=false`만 남기며,
`credentialRef present, plaintext omitted`는 인증 성공을 의미하지 않습니다.
상세 비밀 경계는 [인증정보 정책](./onvif-credential-reference-policy.md)을 따릅니다.

## 실제 wrapper 출력과 sample의 구분

[field HTTP wrapper](../scripts/internal/verify_onvif_field_http_probe.mjs)의 `--output`은
[PrintJson](../scripts/internal/onvif_field_http_probe_smoke.cpp)이 만든
`media-server.onvif-field-http-probe-result.v1` 결과를 저장합니다.

- `ok`, `status=pass|fail`, `error`, `credentialReferencePresent`, `profilesDiscovered`를 포함합니다.
- `endpointRedacted=true`, `streamUriRedacted=true`, `rawSoapIncluded=false`,
  `plaintextSecretIncluded=false`이며 실제 endpoint·URI 대신 서비스 요약과 선택 profile의 정제 정보를 담습니다.
- profile이 없으면 `selectedProfile`은 생략될 수 있습니다. token/name은 placeholder로 바꾸지만
  나머지 기술 값도 공유 전 사람이 확인합니다.
- endpoint 없는 skip은 이 JSON을 만들지 않습니다. skip·예상 실패의 exit와 실제 probe 성공을 구분하는 기준은
  [wrapper 안내](./onvif-field-smoke-gate.md#field-http-wrapper의-실제-동작)를 따릅니다.

이 결과에 field gate 판정·재생·UI review가 자동 포함되는 것은 아닙니다.
도구의 금지 literal 검사도 모든 민감정보를 찾아내는 범용 정제기가 아니므로,
빌드·예외의 stdout/stderr를 포함한 전체 공유 자료를 별도로 검토합니다.

## 보고서와 sample bundle

[test/fixtures/onvif_field_smoke_artifact_sample](../test/fixtures/onvif_field_smoke_artifact_sample/README.md)은
실장비 없는 합성 layout입니다. 실제 실행 결과나 공개 API 계약으로 바꾸지 않습니다.

| 파일 | 역할 |
| --- | --- |
| `manifest.json` | `media-server.onvif-field-smoke-artifact-sample-manifest.v1`; 파일 목록·`requiredVerification`·상태 template |
| `redacted_probe_summary.json` | `media-server.onvif-field-smoke-artifact-sample.v1`; `mode=field-smoke-template`, 정제 요약·gate·검사 상태·증거 목록 |
| `redaction-checklist.md` | 작성 완료 모양을 보여주는 합성 checklist |
| `field-smoke-report-template.md` | 상태·사유·evidenceIndex를 작성하는 보고서 template |
| `README.md` | 합성 자료의 출처·용도·한계 |

sample의 `gateDecision` 객체는 `media-server.onvif-field-smoke-gate.v1`이며,
`releaseDevelopmentStatus=procedure-fixed`, `gateDecision=not-run`,
`realDeviceTestPerformed=false`, `realDeviceEndpointSuccess=unverified`, `playbackStatus=skipped`입니다.
sample의 `redactionArtifactReview`·`fieldSmokeReportReview`·`clientRedaction`·`opsCopyParity`·
`probeErrorWording` pass는 합성 예시 값입니다. 현재 실행 결과로 복사하지 않습니다.

`verificationStatus`는 `command`, 실제 `status`(pass/fail/skipped), skipped일 때의 `skipReason`을 구분합니다.
manifest의 필수 명령은 `verify-onvif-field-smoke-redaction`, `verify-onvif-field-smoke-gate`,
`verify-onvif-field-http-probe`, `verify-onvif-probe-draft-api`, `verify-onvif-ops-sources-ui`입니다.
이 목록은 보고서의 누락 방지 기준이지 모든 명령의 즉시 실행 승인이 아닙니다.
마지막 두 명령은 별도 격리 서버가 필요하고, UI 명령은 브라우저·source/view/rule 쓰기·cleanup을 포함합니다.
[무장비 검증의 별도 검사](./onvif-no-device-verification.md#서버가-필요한-별도-검사)와 실행 승인을 따릅니다.

`evidenceIndex`의 `type`·`path`는 실제로 존재하는 정제 summary/checklist/reportTemplate/screenshot만 가리킵니다.
미실행·부분 실행은 그대로 쓰고 없는 증거 파일을 참조하지 않습니다.
`operatorChecklistStatus=ready|skipped|incomplete`, `failureWording`, notes도 실제 상태와 정제 사유로 작성합니다.
gate 상태·passed 조건은 [현장 판정 기준](./onvif-field-smoke-gate.md#gate-상태와-합격-조건)을 따릅니다.

## 공유 전 체크리스트

- [ ] 장비·네트워크·probe/재생/쓰기의 승인 범위와 실제 실행·미실행을 구분했다.
- [ ] endpoint·URI·credential reference·secret·고객 식별자를 본문과 파일명에서 제거했다.
- [ ] raw SOAP·HTTP header·cookie·Authorization·request/response dump·raw diagnostic JSON을 제거했다.
- [ ] `sourceDraft.rtspUrl`과 candidate/profile/이름/tag의 식별자를 공유용 요약에서 제거했다.
- [ ] `publishedViewDraft` 및 Client 응답에 source locator·ONVIF endpoint·credential 정보가 없는지 확인했다.
- [ ] `clientRedaction`, `opsCopyParity`, `probeErrorWording`에 실행 근거가 있고, 미실행은 pass로 쓰지 않았다.
- [ ] screenshot은 민감값 제거와 전체 viewport·control·상태의 가독성을 직접 확인했다.
- [ ] gate·playback·`redactionArtifactReview`·`fieldSmokeReportReview`를 분리했고 sample 값을 그대로 승계하지 않았다.
- [ ] `verificationStatus`에 명령·실제 상태·skip reason을 빠짐없이 남겼다.
- [ ] `evidenceIndex`가 정제된 실제 파일만 가리키며 정제본과 원본의 차이를 기록했다.
- [ ] 실패→재검증 연결, 필요한 stdout/stderr·exit·source/환경 및 소유 자원의 cleanup을 확인했다.

정적 문서·bundle 검사 통과만으로 이 사람 검토가 완료되거나 screenshot이 안전하다고 판정하지 않습니다.
실제 UI 증거는 [UI 풀테스트 기준](./manual-ui-fulltest.md),
실행·보존·정리는 [검증 정책](./stream-verification.md#검증-정책)을 따릅니다.

## 정제된 실패 문구

다음은 보고서용 예시입니다. 실제 C++/CLI 오류 문자열이나 고정 enum이 아니며 원문 오류·주소를 붙이지 않습니다.

| 상황 | `failureWording` 예시 |
| --- | --- |
| 장비/endpoint 미제공 | `skipped: real device endpoint not provided; no-device suite result only` |
| credential 미제공 또는 인증 실패 | `failed: credential required or rejected; credential reference only, plaintext omitted` |
| SOAP/probe 실패 | `failed: ONVIF probe failed with sanitized transport or service error; raw SOAP omitted` |
| RTSP/RTSPS playback 실패 | `failed: selected live profile playback failed; stream URI omitted` |
| TLS 실패 | `failed: HTTPS/TLS transport failed; certificate and endpoint details omitted` |
| Digest/WS-Security 필요 | `blocked: Digest or WS-Security required; out of current live source scope` |

첫 문장은 기존 sample의 skip 예시입니다. no-device suite도 미실행이면 `no-device suite result only`는 생략하고
실제 미실행 사유를 적습니다. 실패 문구 검사 정의는 `./server.sh verify-onvif-probe-error-wording`,
fixture 계약은 `./server.sh verify-onvif-probe-fixture-contract`에 있습니다.
문서·sample 검사는 [현장 절차의 검증 명령](./onvif-field-smoke-gate.md#절차와-자료-검증-명령)을 사용하며,
검사 통과가 현장 성공이나 제품 지원 범위를 확대하지 않습니다.
