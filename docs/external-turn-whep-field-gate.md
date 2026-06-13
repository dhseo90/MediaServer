# External TURN/WHEP Field Gate

이 문서는 `v2.1.0 V210-S10 External TURN/WHEP field gate`의 세부 gate 기준입니다.
기본 release 검증과 외부 TURN/WHEP credential 운영 검증을 분리해, 미실행 또는
실패한 external field smoke를 release PASS로 과장하지 않게 합니다.

## 직접 답

v2.1.0 S10의 1차 gate는 `./server.sh verify-external-turn-whep-field-gate`입니다.
이 gate는 실제 외부 TURN relay나 외부 WHEP playback endpoint에 접속하지 않고,
field smoke 절차, report schema, redaction, 미실행/실패/PASS 분리 기준을 검증합니다.

외부 TURN relay auth 성공이나 외부 WHEP playback 성공은 현재 기본 release 완료
조건이 아닙니다. 실제 endpoint, credential, 방화벽, 운영 relay 권한이 준비된 경우에만
별도 field smoke report로 남기며, 그 결과도 `verify-webrtc-ice` 같은 로컬 ICE
검증이나 UI 풀테스트 PASS를 대체하지 않습니다.

## Gate 원칙

- 기본 gate는 external endpoint에 네트워크 요청을 보내지 않습니다.
- TURN credential, WHEP URL, ICE candidate, source URL, auth token은 report에 원문 저장하지 않습니다.
- 외부 TURN/WHEP 미실행은 `not-run`이며 PASS가 아닙니다.
- credential 또는 endpoint 누락은 `blocked`이며 PASS가 아닙니다.
- relay 실패, WHEP session 실패, playback 실패는 `failed`이며 PASS가 아닙니다.
- 외부 TURN/WHEP field PASS는 별도 field evidence일 뿐 기본 release PASS와 동일하지 않습니다.
- 로컬 coturn, loopback WHEP fixture, `verify-webrtc-ice` 기본 성공은 운영 TURN/WHEP credential 성공을 대체하지 않습니다.
- RTSP/WebRTC media path, WebRTC DataChannel schema, SSE/WS metadata schema, Event POST payload는 이 gate에서 변경하지 않습니다.

## 상태 모델

| 필드 | 값 | 의미 |
| --- | --- | --- |
| `gateStatus` | `pass`, `fail` | 절차와 문서/verifier 연결 상태 |
| `fieldSmokeStatus` | `not-run`, `blocked`, `failed`, `passed` | 실제 external field smoke 상태 |
| `turnRelayStatus` | `not-run`, `missing-credential`, `failed`, `passed` | 외부 TURN relay/auth 상태 |
| `whepPlaybackStatus` | `not-run`, `missing-endpoint`, `failed`, `passed` | 외부 WHEP playback 상태 |
| `defaultReleasePassClaimAllowed` | `false` | field smoke를 기본 release PASS로 쓸 수 있는지 여부 |
| `redactionReview` | `pass`, `fail` | credential/URL/candidate 원문 미저장 검토 |

## Fixture Matrix

`test/fixtures/external_turn_whep_field_gate/cases.json`는 아래 case를 고정합니다.

| case | 의미 |
| --- | --- |
| `not-approved-not-run` | 운영 승인과 endpoint/credential이 없으면 외부 call 없이 `not-run` |
| `approved-missing-turn-credential-blocked` | WHEP endpoint가 있어도 TURN credential이 없으면 `blocked` |
| `approved-missing-whep-endpoint-blocked` | TURN credential이 있어도 WHEP endpoint가 없으면 `blocked` |
| `approved-turn-relay-fail-not-release-pass` | TURN relay/auth 실패는 field 실패이며 release PASS 아님 |
| `approved-whep-playback-fail-not-release-pass` | WHEP playback 실패는 field 실패이며 release PASS 아님 |
| `approved-turn-whep-pass-field-only` | TURN/WHEP 모두 통과해도 별도 field PASS이며 기본 release PASS 아님 |

## 실행 절차

기본 절차 고정:

```bash
./server.sh verify-external-turn-whep-field-gate \
  --report /tmp/media_server_external_turn_whep_field_gate.md \
  --json-report /tmp/media_server_external_turn_whep_field_gate.json
./server.sh verify-webrtc-ice
git diff --check
```

실제 external field smoke는 운영자가 endpoint와 credential을 준비한 별도 환경에서만
수동으로 수행합니다. 이 repository의 기본 verifier는 외부 접속을 수행하지 않으며,
field report에는 아래 항목만 redacted 상태로 남깁니다.

| 항목 | 기록 방식 |
| --- | --- |
| TURN 서버 | host 원문 대신 `redacted-turn-endpoint` 또는 운영자가 승인한 별칭 |
| TURN credential | `credentialSource=env`, 원문 금지 |
| WHEP URL | `redacted-whep-endpoint`, query/token 원문 금지 |
| ICE candidate | candidate type/count 요약만 허용 |
| WHEP playback | HTTP/session/playback status 요약만 허용 |

## Report Schema

`media-server.external-turn-whep-field-gate-report.v1` report는 아래를 포함해야 합니다.

- `targetStep=V210-S10`
- `defaultReleasePassClaimAllowed=false`
- `fieldSmokeStatus`
- `turnRelayStatus`
- `whepPlaybackStatus`
- `redaction.credentialMaterialStored=false`
- `redaction.rawTurnServerStored=false`
- `redaction.rawWhepUrlStored=false`
- `redaction.rawIceCandidateStored=false`
- `redaction.sourceUrlStored=false`
- `redaction.viewerClientExposureAdded=false`
- `checks[]`

## 미실행/제외 기록

현재 개발 환경에는 외부 TURN credential과 외부 WHEP playback endpoint가 준비되어
있지 않습니다. 따라서 이번 v2.1.0 S10 개발에서는 실제 external TURN/WHEP field
smoke를 실행하지 않고, `not-run` 상태와 제외 사유를 report에 남기는 절차만
완료합니다.

```text
external TURN relay/auth: 미실행
external WHEP playback: 미실행
이유: 사용자 승인 endpoint/credential 없음, 접속 불가 외부 서버는 기본 개발 범위 제외
대체 불가: verify-webrtc-ice, local coturn, UI fulltest, 30분/120분 longrun
```

## 완료 판정

S10 개발 완료는 아래가 모두 참일 때만 보고합니다.

- `verify-external-turn-whep-field-gate`가 fixture와 문서 연결을 PASS로 확인
- `verify-webrtc-ice`가 기존 ICE policy를 확인하거나, 실행 불가 사유가 별도로 기록됨
- 외부 TURN/WHEP 실제 성공을 완료로 보고하지 않음
- 미실행/제외 항목이 feature inventory와 release evidence에서 PASS 행으로 섞이지 않음
- RTSP/WebRTC media path, Event POST, WebRTC/SSE/WS metadata schema를 변경하지 않음

## v2.3.0 Conditional field evidence

`media-server.v230-conditional-field-evidence.v1`은 external TURN/WHEP gate를
v2.3.0 S04 조건부 field evidence 기준으로 다시 연결합니다. 이 기준은
`approved environment only` 원칙을 따르며, 운영자가 승인한 TURN relay credential,
WHEP playback endpoint, 방화벽/relay 권한이 있을 때만 실제 field smoke 결과를
`redacted field report`로 남깁니다.

- `not-run is not PASS`: 승인된 endpoint/credential이 없으면
  `fieldSmokeStatus=not-run`, `turnRelayStatus=not-run`,
  `whepPlaybackStatus=not-run`으로 남기며 default release PASS로 쓰지 않습니다.
- external TURN relay/auth 또는 external WHEP playback 성공은 redacted field report에만
  남기고, local ICE, local coturn, loopback WHEP, UI 풀테스트, 30분/120분 longrun PASS로
  대체하지 않습니다.
- report에는 raw TURN server, credential, raw WHEP URL, raw ICE candidate, source URL,
  auth token을 저장하지 않습니다.
- 이 gate는 RTSP/WebRTC media path, Event POST payload, WebRTC DataChannel schema,
  SSE/WS metadata schema를 변경하지 않습니다.

v2.3.0 연결 검증:

```bash
./server.sh verify-v230-conditional-field-evidence
```
