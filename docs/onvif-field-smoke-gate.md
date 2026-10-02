# ONVIF 현장 검증 절차와 판정

승인된 실제 장비·네트워크에서 ONVIF probe와 선택 profile의 재생을 확인할 때 사용하는 절차입니다.
이 문서는 실장비 실행 승인이나 release 필수 조건을 추가하지 않습니다. 제외·미승인 작업은 미실행으로 남깁니다.

자료 정제·실패 문구·보고서는 [redaction 기준](./onvif-field-smoke-artifact-redaction.md),
구현은 [라이브 소스 안내](./onvif-live-source-support.md), 실행 환경은 [무장비 검증](./onvif-no-device-verification.md)을 따릅니다.

## 지원·권한·실행 경계

- 실제 field smoke는 운영자가 통제하고 별도로 승인한 장비·endpoint·네트워크에서만 수행합니다.
  공개 인터넷의 임의 ONVIF endpoint를 대체 장비로 사용하지 않습니다.
- 현재 field wrapper는 HTTP 전용이며 SOAP 조회를 수행합니다. HTTPS C++ 구현 지원과 이 CLI의 지원 범위는 다릅니다.
  TLS 조건은 [TLS 정책](./onvif-tls-transport-policy.md)을 따릅니다.
- `--credential-ref-present`는 reference 보관 여부의 표시일 뿐입니다. wrapper는 기본 None provider를 사용하며
  secret을 조회하거나 Basic/Digest/WS-Security 인증을 주입하지 않습니다.
  명시적 provider의 Basic 구현과 제품 영속 저장소 미구현은 [인증정보 정책](./onvif-credential-reference-policy.md)에서 구분합니다.
- wrapper의 `GetServices`·`GetProfiles`·`GetStreamUri` probe 자체는 SourceRegistry/PublishedView에 저장하지 않습니다.
  제품 `POST /ops/api/onvif/import-draft`도 미저장 변환이며 Ops 접근과 `source:write`가 필요합니다.
  별도 쌍 저장이나 UI round-trip은 쓰기를 포함하므로 조회 절차의 승인만으로 수행하지 않습니다.
  `sourceDraft.rtspUrl`은 원본 URI를 담으므로 draft 전체를 공개 산출물에 복사하지 않습니다.
- WS-Discovery, Digest/WS-Security 자동 인증, persistent credential store, ONVIF Profile G / Recording / Replay는
  이 gate의 구현 범위가 아닙니다. Profile G는 MediaServer 자체의 [관리 녹화·조회·재생](./ui-guide.md#녹화-설정조회재생)과 다릅니다.
- RTSP/WebRTC media path, SourceRegistry/PublishedView payload schema, client redaction 계약과
  Event POST/WebRTC DataChannel/SSE/WS metadata schema를 현장 검증을 위해 변경하지 않습니다.

## Gate 상태와 합격 조건

보고서의 gate 식별자는 `media-server.onvif-field-smoke-gate.v1`입니다.
sample JSON은 `gateDecision` 객체 안에 아래 gate 필드를 두며, 그 안의 `gateDecision`은 상태 문자열입니다.

| 필드 | 허용 값 | 의미 |
| --- | --- | --- |
| `releaseDevelopmentStatus` | `procedure-fixed` | 절차가 정의됐다는 기존 식별자. 제품 개발·release·실장비 성공 판정이 아님 |
| `gateDecision` | `not-run`, `blocked`, `failed`, `passed` | 미실행, 전제 조건 차단, 실행 실패, 현장 gate 충족을 구분 |
| `realDeviceTestPerformed` | `true`, `false` | 실제 장비를 사용한 실행 여부 |
| `realDeviceEndpointSuccess` | `pass`, `fail`, `unverified` | endpoint 결과. 실제 장비 미실행이면 `unverified` |
| `playbackStatus` | `pass`, `fail`, `skipped` | 선택한 RTSP/RTSPS playback 결과. URI 발견만으로 pass가 아님 |
| `redactionArtifactReview` | `pass`, `fail` | 공유 자료의 비밀·식별자 제거 검토 결과 |
| `fieldSmokeReportReview` | `pass`, `fail` | 확인·실패·미확인·미실행과 근거를 구분했는지 검토한 결과 |
| `noDeviceSuiteCountsAsFieldSuccess` | `false` | 무장비 suite 결과는 현장 성공 증거가 아님 |

`gateDecision=passed`에는 다음 조건이 모두 필요합니다.

- `realDeviceTestPerformed=true`, `realDeviceEndpointSuccess=pass`, `playbackStatus=pass`.
- `redactionArtifactReview=pass`, `fieldSmokeReportReview=pass`.
- `verificationStatus`에 보고서가 요구하는 각 명령의 실제 pass/fail/skipped와 필요한 사유·근거가 있고,
  필수 검사의 실패·미실행이 남아 있지 않음.
- 공유 자료의 `endpointRedacted=true`, `streamUriRedacted=true`,
  `rawSoapIncluded=false`, `plaintextSecretIncluded=false`를 실제 내용과 대조함.

실장비 미실행은 `realDeviceTestPerformed=false`, `realDeviceEndpointSuccess=unverified`, `playbackStatus=skipped`입니다.
기본 판정은 `gateDecision=not-run`이며 전제 조건으로 막혔다면 `blocked`와 이유를 구분합니다.
review 미실행도 명시하고 sample의 pass 값을 복사하거나 gate를 passed로 닫지 않습니다.

## 승인된 현장 작업의 순서

1. 사용할 장비·네트워크·source/환경, 허용된 probe·재생·저장 범위, credential 준비 여부,
   임시 경로·프로세스·포트와 정리 방법을 확인합니다. 원문 값은 공유 보고서에 쓰지 않습니다.
2. 실행한 개발 검증은 해당 source/환경의 결과만 연결하며, `verify-onvif-no-device-suite` 전체를 자동 요구하지 않습니다.
   필요한 검증과 실행 승인은 [검증 정책](./stream-verification.md#검증-정책)에 따라 결정합니다.
3. endpoint URL에 username/password/token을 넣지 않고 승인된 probe를 수행합니다.
   credential이 필요한 장비를 reference 존재 표시만으로 인증 성공 처리하지 않습니다.
4. Media/Media2의 live RTSP/RTSPS profile을 선택하고, 별도로 승인된 재생 절차의 실제 결과를 기록합니다.
   HTTP/HLS URI나 SOAP 성공은 `playbackStatus=pass`의 대체 증거가 아닙니다.
5. 제품 등록·UI 확인까지 승인된 경우에만 `/ops/sources`, `/ops/rules`의 copy parity와
   `/client/api/views`, `/client/api/views/{viewId}` 비노출을 확인합니다.
   API·UI 검사 환경과 쓰기·cleanup 경계는 [무장비 검증의 별도 검사](./onvif-no-device-verification.md#서버가-필요한-별도-검사)를 따릅니다.
6. 정제 근거·실패→재검증 연결을 보존하고 [checklist](./onvif-field-smoke-artifact-redaction.md#공유-전-체크리스트)와 보고서를 각각 검토합니다.
   소유 자원 정리·부재 확인까지 기록합니다. 검토·정리 미확인을 성공으로 덮지 않습니다.

## Field HTTP wrapper의 실제 동작

실행기는 [field HTTP wrapper](../scripts/internal/verify_onvif_field_http_probe.mjs),
출력은 [C++ smoke](../scripts/internal/onvif_field_http_probe_smoke.cpp)의 `PrintJson`이 기준입니다.

| 입력·조건 | 동작·주의 |
| --- | --- |
| `--endpoint` 또는 `MEDIA_SERVER_ONVIF_FIELD_ENDPOINT` | CLI 값이 우선. 있으면 C++ 빌드 후 해당 HTTP endpoint에 실제 접속 |
| `--allow-missing-endpoint` | endpoint가 없을 때만 skip. 환경변수가 있으면 무접속을 보장하지 않음 |
| `--timeout-ms` / `MEDIA_SERVER_ONVIF_FIELD_TIMEOUT_MS` | 양의 정수, 기본 3000ms. SOAP action의 timeout이지 전체 절차 제한 시간이 아님 |
| `--credential-ref-present` / `MEDIA_SERVER_ONVIF_FIELD_CREDENTIAL_REF` | 존재 여부 boolean 표시만. 환경값을 secret으로 넣지 않음 |
| `--output` | endpoint 실행 결과의 정제 JSON 저장. endpoint 없는 skip에서는 파일을 생성하지 않음 |
| `--build-dir`, `--cxx` | 승인된 실행 전용 build 경로·compiler 지정. 기본 경로는 `os.tmpdir()` 아래이며 wrapper가 자동 정리하지 않음 |
| `--expect-failure` | 정제된 probe 실패를 예상한 검사에서 exit 0. 예상과 달리 probe가 성공하면 exit 1 |

`--expect-failure`의 exit 0은 실패 처리 검사의 통과입니다. payload의 `ok=false`, `status=fail`을
실장비 성공으로 바꾸지 않습니다. 일반 probe 실패·입력 거부·빌드 오류 역시 별도로 구분합니다.

### 무장비 skip 확인 예시

아래는 장비 없이 skip 분기만 확인하는 명령입니다. endpoint 인자를 추가하지 않고,
이 프로세스에서 상속 endpoint·reference·timeout 설정을 제거합니다.

```sh
env -u MEDIA_SERVER_ONVIF_FIELD_ENDPOINT \
    -u MEDIA_SERVER_ONVIF_FIELD_CREDENTIAL_REF \
    -u MEDIA_SERVER_ONVIF_FIELD_TIMEOUT_MS \
    ./server.sh verify-onvif-field-http-probe --allow-missing-endpoint
```

이 분기는 빌드·네트워크·JSON 파일 생성 없이 stdout에 `endpoint: not configured`, `result: skipped`를 출력하고 exit 0입니다.
이는 skip 분기 확인이며 실제 장비 검사나 no-device suite 실행 결과가 아닙니다.
격리된 예상 실패·loopback 검사와 소유 build 경로 예시는 [무장비 검증](./onvif-no-device-verification.md)에 둡니다.

## 절차와 자료 검증 명령

```sh
./server.sh verify-onvif-field-smoke-gate
./server.sh verify-onvif-field-smoke-redaction
./server.sh verify-onvif-field-smoke-sample-bundle
./server.sh verify-docs-links
git diff --check
```

앞의 세 명령은 문서·합성 sample의 계약 검사이며 실제 camera probe, playback 또는 UI를 실행하지 않습니다.
gate 검사의 `--backlog <path>`는 명시한 과거 roadmap의 종료 문구를 추가 감사하는 옵션이며 기본 실행에서는 읽지 않습니다.
특히 sample bundle 검사는 미실행 template 상태를 요구하므로 실제 성공 보고서의 범용 합격 판정기로 사용하지 않습니다.
공유 자료 layout과 `verificationStatus`·`evidenceIndex`는 [redaction 기준](./onvif-field-smoke-artifact-redaction.md#보고서와-sample-bundle)을 따릅니다.

### 조건부 field evidence 연결

`./server.sh verify-v230-conditional-field-evidence`는 `media-server.v230-conditional-field-evidence.v1`으로
ONVIF와 외부 TURN/WHEP의 절차 판정을 연결하는 로컬 통합검사입니다. 실행·출력·정리는 [통합검사 안내](./external-turn-whep-field-gate.md#조건부-통합검사)를 따릅니다.
`approved environment only`, `redacted field report`, `not-run is not PASS` 경계를 유지하며,
절차 report의 pass는 실제 장비·외부 credential·WHEP의 default release PASS가 아닙니다.
정적·무장비·UI·30분/120분 결과가 현장 성공을 대신하거나 사용자 제외를 해제하지 않습니다.
