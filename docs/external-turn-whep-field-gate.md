# 외부 TURN·WHEP 검증과 조건부 증거

외부 relay·재생 검증을 준비하는 운영자와 검증기 유지보수자를 위한 현행 계약입니다.
로컬 절차/fixture 검사와 실제 외부 실행을 분리합니다. 과거 버전의 수행·완료 기록은 이 문서의 역할이 아닙니다.
현재 테스트 정의는 [기능 inventory](./project-feature-test-inventory.md)의 `MEDIA-021`·`SAFE-039`,
실행 승인과 릴리즈 판정은 [검증 정책](./stream-verification.md#검증-정책)이 기준입니다.

## 실행 범위

`./server.sh verify-external-turn-whep-field-gate`는 합성 사례와 문서/명령 연결을 검사하며,
실제 TURN credential, WHEP endpoint, 방화벽 또는 relay 운영 권한을 사용하지 않습니다.
환경에 endpoint가 있더라도 이 명령이 외부 연결을 시작하지는 않습니다.
출력 `gateStatus=pass`는 이 로컬 검사 통과이지 운영 TURN 인증이나 WHEP 재생 성공이 아닙니다.

실제 현장 검증은 대상·자격증명·네트워크·재생·정리 범위를 별도로 승인받은 환경에서만 수행합니다.
사용자가 외부 검증을 제외한 경우 이를 추가 릴리즈 과제로 되살리지 않습니다.
로컬 coturn, loopback WHEP, `verify-webrtc-ice`, 실제 UI, 30분/120분 결과는 서로 대체하지 않습니다.
RTSP/WebRTC media path, Event POST, WebRTC DataChannel/SSE/WS metadata와 Auth/scope를
이 절차를 통과시키기 위해 변경하지 않습니다.

## 상태와 보고서

기존 출력 schema는 `media-server.external-turn-whep-field-gate-report.v1`입니다.
`targetStep=V210-S10`은 호환 식별자이며 현재 버전의 개발 완료를 뜻하지 않습니다.

| 필드 | 허용 값 | 의미 |
| --- | --- | --- |
| `gateStatus` | `pass`, `fail` | 로컬 검사 결과 |
| `fieldSmokeStatus` | `not-run`, `blocked`, `failed`, `passed` | 실제 실행에 대한 분류. 기본값은 `not-run` |
| `turnRelayStatus` | `not-run`, `missing-credential`, `failed`, `passed` | TURN 판정. 기본값은 `not-run` |
| `whepPlaybackStatus` | `not-run`, `missing-endpoint`, `failed`, `passed` | WHEP 판정. 기본값은 `not-run` |
| `externalNetworkAttempted` | `false` | 이 로컬 명령은 외부 접속을 하지 않음 |
| `fieldGatePassEligible` | `false` | 기본 실행은 실제 현장 PASS 자격이 없음 |
| `defaultReleasePassClaimAllowed` | `false` | 현장 결과를 기본 릴리즈 전체 PASS로 승격하지 않음 |

보고서는 `generatedAt`, `fixturePath`, `checks`, `cases`, `summary`를 포함합니다.
`cases` 안의 passed 사례는 합성 입력의 예상 판정일 뿐 최상위 미실행 상태를 바꾸지 않습니다.
`redaction`의 `credentialMaterialStored`, `rawTurnServerStored`, `rawWhepUrlStored`,
`rawIceCandidateStored`, `sourceUrlStored`, `viewerClientExposureAdded`는 모두 false여야 합니다.
실제 자료의 정제 검토를 했다는 `redactionReview` 필드는 이 명령이 생성하지 않습니다.

명시된 `--report <path>`는 Markdown, `--json-report <path>`는 구조화 결과를 저장합니다.
경로를 생략하면 stdout만 출력합니다. 출력 경로는 실행 소유 경로로 정하고,
실패 결과도 보존한 뒤 [기록 수명](../AGENTS.md#6-기록-수명과-정리)에 따라 정제·보존·정리합니다.
명령이 끝났다는 이유만으로 임시 경로를 영구 증거 링크로 사용하지 않습니다.

## 합성 회귀 사례

[cases.json](../test/fixtures/external_turn_whep_field_gate/cases.json)은
`media-server.external-turn-whep-field-gate-fixtures.v1` 형식의 현재 테스트 정의입니다.
위치는 `test/fixtures/external_turn_whep_field_gate/cases.json`이며, 과거 실행 로그가 아닙니다.

| 사례 ID | 독립 예상 결과 |
| --- | --- |
| `not-approved-not-run` | 승인 없으면 TURN/WHEP와 현장 상태 모두 not-run |
| `approved-missing-turn-credential-blocked` | credential 누락이면 blocked |
| `approved-missing-whep-endpoint-blocked` | endpoint 누락이면 blocked |
| `approved-turn-relay-fail-not-release-pass` | relay 실패는 failed이며 릴리즈 PASS 아님 |
| `approved-whep-playback-fail-not-release-pass` | 재생 실패는 failed이며 릴리즈 PASS 아님 |
| `approved-turn-whep-pass-field-only` | 둘 다 성공하고 정제 조건을 만족해도 현장 자격만 충족 |

미실행·차단·실패·성공은 다른 상태입니다. 합성 통과를 실제 성공으로 복사하지 않습니다.
실제 보고서에는 원문 서버 주소·credential·WHEP URL/query/token·ICE candidate·source URL을
저장하지 않고 승인된 별칭, candidate 종류/수, HTTP/session/playback 상태 등 필요한 정제 정보만 남깁니다.

## 조건부 통합검사

```sh
./server.sh verify-external-turn-whep-field-gate
./server.sh verify-v230-conditional-field-evidence
```

두 번째 명령은 [ONVIF 절차 검사](./onvif-field-smoke-gate.md)와 위 로컬 검사를 함께 실행합니다.
`media-server.v230-conditional-field-evidence.v1`, `targetStep=V230-S04`와 CLI 이름은 유지합니다.
이름에 과거 버전이 있어도 현행 기능 연결 검사이며, 과거 완료 원장을 읽어 PASS를 만들지 않습니다.
`SRC-014`·`MEDIA-021`·`SAFE-039` 정의, 실제 dispatch, 제품의 외부 미접속 표시를 대조합니다.

통합 명령도 `--report`와 `--json-report`를 받습니다. 자식 검사의 결과는 부모 JSON의
`runtimeEvidence.externalTurnWhepGate.report`에 보존하고, 폐기한 임시 경로를 증거로 남기지 않습니다.
기존 `jsonReport` 필드는 null이며, 소비자는 포함된 `report`를 읽습니다.
자식이 실패해도 해당 실패 결과를 먼저 보존하고 임시 JSON·디렉터리를 정리합니다.
실패/정리 오류는 부모의 실패로 전파되며 최상위 `status`를 pass로 덮지 않습니다.
`execution`은 성공·실패 모두 실제 stdout/stderr·exit·signal을 보존합니다.
정리 실패 때만 `cleanup.remainingPath`에 소유 임시 디렉터리와 `errorCode`를 남깁니다.
이는 후속 정리를 위한 위치이지 영구 증거 링크가 아니며, 확인되지 않은 오류 원문은 복사하지 않습니다.

부모 `runtimeEvidence`의 pass는 하위 로컬 검사가 통과했다는 뜻입니다.
실제 ONVIF 장비 성공과 외부 credential·relay·WHEP 재생은 미실행이며, 별도로 승인된 실행과
정제 증거 없이는 PASS로 쓸 수 없습니다. source archive에서 Git 정보가 없으면
`branch`·`head`가 `unknown`일 수 있지만 과거 로그를 fetch하거나 복원할 필요는 없습니다.
