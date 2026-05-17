# ONVIF Field Smoke Gate

이 문서는 v1.3.0 `V130-P0-02 ONVIF field smoke gate`의 절차 기준입니다.
목표는 실제 ONVIF 카메라 smoke 결과를 release 개발 완료와 섞지 않고,
endpoint, credential, RTSP/RTSPS playback, redaction artifact, report review를
별도 gate로 기록하는 것입니다.

관련 기준:

- [Development Backlog](./development-backlog.md)
- [ONVIF Live Source Support](./onvif-live-source-support.md)
- [ONVIF No-Device Verification](./onvif-no-device-verification.md)
- [ONVIF Field Smoke Artifact Redaction Checklist](./onvif-field-smoke-artifact-redaction.md)
- [ONVIF Credential Reference Policy](./onvif-credential-reference-policy.md)
- [ONVIF TLS Transport Policy](./onvif-tls-transport-policy.md)

## Gate 원칙

- `verify-onvif-no-device-suite` 통과는 ONVIF fixture/parser/loopback/redaction의
  개발 검증입니다. 이것을 실제 `realDeviceEndpointSuccess=pass`로 기록하지 않습니다.
- 실제 field smoke는 운영자가 통제하는 장비와 네트워크에서만 수행합니다. 공개
  인터넷의 임의 ONVIF endpoint는 대체 검증으로 쓰지 않습니다.
- endpoint, credential, RTSP/RTSPS playback URL, raw SOAP, HTTP header, raw
  diagnostic JSON은 공유 산출물에 남기지 않습니다.
- credential은 `credentialRef present, plaintext omitted` 수준으로만 기록합니다.
- Digest, WS-Security, persistent credential store, WS-Discovery, Profile G /
  Recording / Replay는 이 gate를 닫기 위해 구현하지 않습니다.
- RTSP/WebRTC media path, SourceRegistry/PublishedView payload schema, client
  redaction 계약은 변경하지 않습니다.

## Gate 상태

field smoke report는 아래 상태를 분리해 기록합니다.

| Field | 허용 값 | 의미 |
| --- | --- | --- |
| `releaseDevelopmentStatus` | `procedure-fixed` | v1.3.0 (2)의 개발 산출물은 gate 절차와 verifier를 고정했다는 뜻입니다. |
| `gateDecision` | `not-run`, `blocked`, `failed`, `passed` | 실제 장비 gate의 최종 판정입니다. no-device suite만으로는 `passed`가 될 수 없습니다. |
| `realDeviceTestPerformed` | `true`, `false` | 실제 ONVIF camera를 사용했는지 여부입니다. |
| `realDeviceEndpointSuccess` | `pass`, `fail`, `unverified` | 실제 endpoint 성공 여부입니다. `realDeviceTestPerformed=false`이면 `unverified`만 사용합니다. |
| `playbackStatus` | `pass`, `fail`, `skipped` | 선택된 RTSP/RTSPS playback smoke 결과입니다. |
| `redactionArtifactReview` | `pass`, `fail` | 공유 산출물의 redaction review 결과입니다. |
| `fieldSmokeReportReview` | `pass`, `fail` | 보고서가 확인/미확인/건너뜀을 분리했는지 검토한 결과입니다. |

`gateDecision=passed`는 아래 조건을 모두 만족할 때만 쓸 수 있습니다.

- `realDeviceTestPerformed=true`
- `realDeviceEndpointSuccess=pass`
- `playbackStatus=pass`
- `redactionArtifactReview=pass`
- `fieldSmokeReportReview=pass`
- `verificationStatus`에 필수 검증 명령의 pass/fail/skipped가 누락 없이 있음
- 공유 artifact의 `endpointRedacted=true`, `streamUriRedacted=true`,
  `rawSoapIncluded=false`, `plaintextSecretIncluded=false`

## 실행 절차

1. 개발 검증으로 `verify-onvif-no-device-suite`를 먼저 실행합니다.
2. 실제 field smoke를 수행하지 않는 경우 `gateDecision=not-run`,
   `realDeviceTestPerformed=false`, `realDeviceEndpointSuccess=unverified`,
   `playbackStatus=skipped`를 기록합니다.
3. 실제 장비가 준비되면 운영자 승인, endpoint 입력 주체, credential reference 준비
   여부를 먼저 기록하되 원문 값은 보고서에 쓰지 않습니다.
4. field HTTP probe는 운영자 환경에서만 실행하고, endpoint URL에는 username,
   password, token을 넣지 않습니다.
5. Media/Media2 profile에서 live RTSP/RTSPS profile을 선택합니다. HTTP/HLS URI는
   이 gate의 playback 성공 조건으로 쓰지 않습니다.
6. 선택 profile로 RTSP/RTSPS playback smoke를 수행하고 결과만
   `playbackStatus`에 남깁니다.
7. `/ops/sources`, `/ops/rules`, `/client/api/views`,
   `/client/api/views/{viewId}` redaction/copy parity 결과를 pass/fail로 기록합니다.
8. redacted bundle은 `test/fixtures/onvif_field_smoke_artifact_sample/` layout을
   따르되 실제 endpoint, credential, raw SOAP, stream URI는 제거합니다.
9. 공유 전 `redactionArtifactReview`와 `fieldSmokeReportReview`를 별도로 닫습니다.

실장비 endpoint가 없는 로컬/CI에서는 아래처럼 skip/failure boundary만 검증합니다.

```bash
./server.sh verify-onvif-no-device-suite
./server.sh verify-onvif-field-smoke-gate
./server.sh verify-onvif-field-smoke-redaction
./server.sh verify-onvif-field-smoke-sample-bundle
./server.sh verify-onvif-field-http-probe --allow-missing-endpoint
./server.sh verify-onvif-field-http-probe --endpoint http://127.0.0.1:9/onvif/device_service --expect-failure --credential-ref-present
```

## 산출물 Review

공유 가능한 field smoke artifact는 다음 값만 포함합니다.

- `releaseDevelopmentStatus=procedure-fixed`
- `gateDecision=<not-run|blocked|failed|passed>`
- `realDeviceTestPerformed=<true|false>`
- `realDeviceEndpointSuccess=<pass|fail|unverified>`
- `playbackStatus=<pass|fail|skipped>`
- `redactionArtifactReview=<pass|fail>`
- `fieldSmokeReportReview=<pass|fail>`
- `endpointRedacted=true`
- `streamUriRedacted=true`
- `rawSoapIncluded=false`
- `plaintextSecretIncluded=false`
- `credentialRef present, plaintext omitted`
- `clientRedaction=<pass|fail>`
- `opsCopyParity=<pass|fail>`
- `probeErrorWording=<pass|fail>`

차단 또는 실패는 아래처럼 sanitized wording으로만 기록합니다.

| 상황 | 기록 문구 |
| --- | --- |
| 장비/endpoint 미제공 | `skipped: real device endpoint not provided; no-device suite result only` |
| 인증 필요 또는 실패 | `failed: credential required or rejected; credential reference only, plaintext omitted` |
| RTSP/RTSPS 재생 실패 | `failed: selected live profile playback failed; stream URI omitted` |
| TLS 실패 | `failed: HTTPS/TLS transport failed; certificate and endpoint details omitted` |
| Digest/WS-Security 필요 | `blocked: Digest or WS-Security required; out of current live source scope` |

## 개발 종료 판정

v1.3.0 (2)의 개발 범위는 실제 장비 성공을 만드는 것이 아니라 gate 절차를
고정하는 것입니다. 따라서 아래가 모두 통과하면 이 카테고리의 개발 가능한
후속 이슈는 남기지 않습니다.

- `docs/onvif-field-smoke-gate.md`가 gate 상태, 실행 절차, 산출물 review,
  개발 종료 판정을 명시합니다.
- `docs/development-backlog.md`의 `V130-P0-02`가 이 문서와
  `verify-onvif-field-smoke-gate`를 연결합니다.
- `docs/onvif-field-smoke-artifact-redaction.md`와 sample bundle이
  `gateDecision`, `playbackStatus`, `redactionArtifactReview`,
  `fieldSmokeReportReview`를 포함합니다.
- `verify-onvif-field-smoke-gate`, `verify-onvif-field-smoke-redaction`,
  `verify-onvif-field-smoke-sample-bundle`, `verify-onvif-no-device-suite`가 통과합니다.
- `git diff --check`가 통과합니다.

아래 항목은 이 카테고리의 개발 잔여가 아니라 별도 gate 또는 v1.3.0 비범위입니다.

- 실제 ONVIF camera endpoint 성공 미확인
- 실제 credential handshake 현장 성공 미확인
- 실제 RTSP/RTSPS playback 현장 성공 미확인
- persistent credential store
- Digest 또는 WS-Security 구현
- WS-Discovery 자동 검색
- Profile G / Recording / Replay
