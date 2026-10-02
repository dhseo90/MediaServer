# ONVIF 무장비 검증

ONVIF 실장비 없이 개발·회귀 검사를 준비하는 안내입니다. 합성 fixture, 로컬 loopback,
정적 계약 검사의 범위와 실행 방법을 설명하며, 이 문서나 성공 fixture 자체가 실행 PASS는 아닙니다.
실장비 endpoint 성공, 실제 카메라 인증·Media/Media2 호환성·RTSP/RTSPS 재생,
현장 네트워크·방화벽·NAT·DNS·trust store 영향은 미확인으로 남깁니다.
공개 인터넷의 임의 ONVIF endpoint를 실장비 대체로 사용하지 않습니다.

제품 지원 범위는 [지원 표](./onvif-protocol-support-matrix.md),
등록·profile 선택·권한·쌍 저장은 [라이브 소스 안내](./onvif-live-source-support.md),
실제 장비 판정은 [현장 gate](./onvif-field-smoke-gate.md)가 기준입니다.

## 확인하는 계약

| 대상 | 무장비 검증 범위 |
| --- | --- |
| draft | 합성 입력의 선택 profile을 기존 SourceRegistry/PublishedView draft로 매핑. `notSaved=true`와 미저장 preview, credential/reference·endpoint·raw diagnostic JSON 비노출 |
| parser·probe | Device/Media/Media2, Media2 우선·Media fallback·Media-only, H265, RTSPS direct/fallback, Media/Media2 empty-profile 실패 |
| 응답 차이 | 합성 main/substream·low-fps·비기본 Device path. 제조사 호환 인증이 아님 |
| 실패·redaction | request/transport/service/profile 실패 요약, SOAP Fault·malformed response, 닫힌 loopback의 path·query credential/token sentinel과 `--output` JSON 산출물 비노출 |
| transport | C++ HTTP/OpenSSL HTTPS와 별도 TLS fixture harness의 성공·실패 경계. 장비의 실제 stream 재생과 별개 |
| 인증 | 기본 None provider의 비주입과 명시적 in-memory provider의 HTTP Basic 주입, 정제된 실패 요약. 제품 persistent credential store나 현장 인증 성공이 아님 |
| 운영 정책 | 현장 gate·산출물 redaction·미지원 API·credential reference 정책의 연결 |

주요 정의는 [probe fixture](../test/fixtures/onvif_probe_result_stub.json),
[profile variants](../test/fixtures/onvif_probe_profile_variants.json),
[synthetic vendor pack](../test/fixtures/onvif_synthetic_vendor_fixture_pack.json),
[실패 문구](../test/fixtures/onvif_probe_error_wording_matrix.json),
[SOAP Fault/malformed matrix](../test/fixtures/onvif_soap_fault_malformed_matrix.json),
[closed loopback matrix](../test/fixtures/onvif_closed_loopback_failure_matrix.json)에 있습니다.
합성 fixture의 원본·schema·기대값을 실제 장비 자료나 실행 결과로 교체하지 않습니다.

### HTTPS와 인증의 구현·시험 구분

- 제품 `SendOnvifSoapHttp`는 HTTP를 지원하며 `MEDIA_SERVER_USE_OPENSSL=1` 빌드에서
  HTTPS certificate verification·hostname verification을 수행합니다.
  `MEDIA_SERVER_ONVIF_TLS_CA_FILE` 또는 기본 trust store를 사용하고, OpenSSL 없는 빌드는
  `https transport requires OpenSSL support`로 실패합니다. HTTP downgrade는 하지 않습니다.
- `verify-onvif-http-transport`는 해당 C++ 구현을 빌드해 loopback으로 검사합니다.
  이 스크립트는 `pkg-config openssl` 발견 여부로 HTTPS 빌드를 선택하므로 실제 실행의 빌드 조건을 기록해야 합니다.
- `verify-onvif-https-tls-fixture`는 별도 Node fixture TLS server/client를 실행합니다.
  trusted fixture 성공, untrusted CA·hostname mismatch·expired certificate·handshake·connection refused 실패와
  redaction을 확인하는 정의이지, 이 명령 하나가 제품 C++ 경로나 실장비 HTTPS를 검사하는 것은 아닙니다.
- `RunOnvifProbeAdapter`의 기본 provider는 `NoneOnvifCredentialProvider()`입니다.
  명시적으로 연결한 provider가 `credential_ready`와 `http_basic` material을 반환할 때만 `Authorization`을 주입합니다.
  `verify-onvif-auth-injection-loopback`은 이 Basic 주입과 reference-only 비주입을 확인합니다.
  Basic fixture도 Device-only 응답에서 정제된 service 실패로 끝나므로 전체 live probe 성공 증거가 아닙니다.
- Digest/WS-Security 자동 fallback, 제품 persistent secret store·외부 secret manager는 이 구현에 포함되지 않습니다.
  [credential store 결정 fixture](../test/fixtures/onvif_credential_store_policy_decision.json)의 후속 gate를 유지합니다.

상세 기준은 [TLS 정책](./onvif-tls-transport-policy.md),
[인증 주입](./onvif-auth-injection-design.md), [credential reference](./onvif-credential-reference-policy.md),
[RTSPS draft 정책](./onvif-rtsps-draft-policy.md)을 봅니다.

## Suite 구성과 실행 환경

[runner](../scripts/internal/verify_onvif_no_device_suite.mjs)는 현재 다음 28개 명령을 순차 실행하고,
첫 실패에서 중단합니다. 아래 번호는 실행 순서이며 과거 개발 단계나 완료 선언이 아닙니다.
단계 수의 기준은 runner의 `suite.length`와 해당 실행의 `total`입니다.

| 순서 | `./server.sh` 하위 명령 | 실제 작업 |
| --- | --- | --- |
| 1 | `verify-onvif-no-device-mode` | 문서·runner·summary fixture 정적 검사 |
| 2 | `verify-onvif-protocol-support-matrix` | 지원 조건·소스 연결 정적 검사 |
| 3 | `verify-onvif-rtsps-draft-policy` | 정책·fixture·소스 검사와 C++ draft 실행 |
| 4 | `verify-onvif-https-soap-transport-design` | HTTPS 구현·설계 연결 정적 검사 |
| 5 | `verify-onvif-https-tls-fixture` | 별도 Node TLS loopback 서버·인증서 생성 |
| 6 | `verify-onvif-auth-injection-design` | 인증 method·설계 fixture 정적 검사 |
| 7 | `verify-onvif-auth-injection-loopback` | C++ Basic/None provider loopback 실행 |
| 8 | `verify-onvif-ws-discovery-ux` | 미지원 UI 문구·소스 정적 검사 |
| 9 | `verify-onvif-unsupported-api-guard` | route·fixture 정적 검사; suite에서는 `--exercise-routes` 생략 |
| 10 | `verify-onvif-live-import-contract` | 합성 import fixture 검사 |
| 11 | `verify-onvif-probe-fixture-contract` | 합성 probe·preview fixture 검사 |
| 12 | `verify-onvif-probe-profile-variants` | 선택·fallback·실패 fixture 검사 |
| 13 | `verify-onvif-synthetic-vendor-fixtures` | 합성 응답 차이·출처 검사 |
| 14 | `verify-onvif-probe-parser` | C++ 합성 SOAP parser 실행 |
| 15 | `verify-onvif-probe-adapter` | C++ fake transport adapter 실행 |
| 16 | `verify-onvif-http-transport` | 제품 C++ HTTP/조건부 HTTPS loopback 실행 |
| 17 | `verify-onvif-local-simulator` | Media2 우선·Media fallback·Media-only·non-RTSP GetStreamUri 실패 실행 |
| 18 | `verify-onvif-probe-error-wording` | C++ 실패 요약 fixture 실행 |
| 19 | `verify-onvif-soap-fault-matrix` | C++ SOAP Fault/malformed response fixture 실행 |
| 20 | `verify-onvif-field-smoke-redaction` | 산출물 redaction 기준 정적 검사 |
| 21 | `verify-onvif-field-smoke-sample-bundle` | 정제된 sample bundle 검사 |
| 22 | `verify-onvif-field-smoke-gate` | 현장 gate 정의·fixture 연결 정적 검사 |
| 23 | `verify-onvif-field-http-probe --allow-missing-endpoint` | endpoint가 없을 때 명시 skip |
| 24 | `verify-onvif-closed-loopback-failure-matrix` | 닫힌 loopback 실패와 출력 JSON redaction 실행 |
| 25 | `verify-onvif-field-http-probe --endpoint http://127.0.0.1:9/onvif/device_service --expect-failure --credential-ref-present` | C++ probe의 예상 실패·reference 표시 확인 |
| 26 | `verify-onvif-tls-transport-policy` | TLS 정책·소스·fixture 연결 정적 검사 |
| 27 | `verify-onvif-credential-reference-policy` | 정책·fixture 검사와 C++ provider 실행 |
| 28 | `verify-onvif-no-device-completion` | 완료 조건·suite·summary fixture 정적 검사 |

suite 자체에는 실행 중인 MediaServer, 실제 카메라, 브라우저가 필요하지 않습니다.
다만 C++17 compiler(`CXX` 또는 `c++`), Node.js, Bash, 인증서 생성용 `openssl` 및 loopback socket 사용이 필요합니다.
TLS harness가 사용하는 인증서 명령을 지원하는 OpenSSL 환경인지 확인합니다.
전체 제품 빌드나 GStreamer 재생을 실행하는 묶음은 아닙니다.

### 실행 전 격리와 예시

실행 승인·검증 영역·기록·cleanup 기준은 [검증 정책](./stream-verification.md#검증-정책)을 따릅니다.
특히 runner는 자식에게 환경을 그대로 전달합니다. `MEDIA_SERVER_ONVIF_FIELD_ENDPOINT`가 남아 있으면
23번도 실제 endpoint에 접속하므로 `--allow-missing-endpoint`만으로 무장비 모드가 보장되지 않습니다.
운영 endpoint·credential 환경을 제거하고, `127.0.0.1:9`가 실제 서비스에 사용되지 않는지도 먼저 확인합니다.

아래는 승인된 실행을 위한 저장소 루트 기준 예시입니다. 새 실행마다 소유 run root를 만들며,
`TMPDIR`를 무시하는 다섯 shell harness의 build 경로도 명시합니다. 명령 목록을 따로 재실행할 필요는 없습니다.

```sh
(
  umask 077
  onvif_run_root="$(mktemp -d "${TMPDIR:-/tmp}/media-server-onvif-no-device.XXXXXX")" || exit 1
  mkdir -p "$onvif_run_root/tmp" || exit 1
  printf 'runRoot=%s\n' "$onvif_run_root"
  unset MEDIA_SERVER_ONVIF_FIELD_ENDPOINT MEDIA_SERVER_ONVIF_FIELD_CREDENTIAL_REF MEDIA_SERVER_ONVIF_FIELD_TIMEOUT_MS
  export TMPDIR="$onvif_run_root/tmp"
  export MEDIA_SERVER_VERIFY_ONVIF_PROBE_PARSER_BUILD_DIR="$onvif_run_root/probe-parser"
  export MEDIA_SERVER_VERIFY_ONVIF_PROBE_ADAPTER_BUILD_DIR="$onvif_run_root/probe-adapter"
  export MEDIA_SERVER_VERIFY_ONVIF_HTTP_TRANSPORT_BUILD_DIR="$onvif_run_root/http-transport"
  export MEDIA_SERVER_VERIFY_ONVIF_LOCAL_SIMULATOR_BUILD_DIR="$onvif_run_root/local-simulator"
  export MEDIA_SERVER_VERIFY_ONVIF_AUTH_INJECTION_LOOPBACK_BUILD_DIR="$onvif_run_root/auth-loopback"
  if ./server.sh verify-onvif-no-device-suite --json-output "$onvif_run_root/summary.json" \
      >"$onvif_run_root/stdout.log" 2>"$onvif_run_root/stderr.log"; then
    onvif_suite_status=0
  else
    onvif_suite_status=$?
  fi
  printf 'exit=%s\n' "$onvif_suite_status"
  exit "$onvif_suite_status"
)
```

`--json-output`은 선택 옵션이며 생략하면 summary 파일을 만들지 않습니다.
상대 출력 경로는 저장소 루트 기준입니다. 위 예시는 절대 run root 경로를 사용합니다.
실행 source/환경·시작/종료 시각·exit와 원출력을 함께 기록하고, 최초 실패 자료를 덮어쓰지 않습니다.
summary에 stdout/stderr·전체 환경·cleanup 결과가 자동으로 들어가지는 않습니다.

suite에는 일괄 cleanup이 없습니다. Node TLS harness는 자체 임시 인증서 디렉터리를 정리하지만,
C++ build 디렉터리·일부 fixture key·closed loopback JSON 등은 남을 수 있습니다.
성공·실패·중단 모두 필요한 정제 자료를 먼저 보존하고 소유 프로세스·포트·파일을 확인해 정리합니다.
공유 자료에 private key·credential 원문·raw SOAP를 넣지 않으며, cleanup 미확인은 별도 blocker로 남깁니다.

### skip·예상 실패·인증 표시 해석

- `verify-onvif-field-http-probe --allow-missing-endpoint`는 endpoint가 없으면 exit 0인 skip입니다.
  suite에서는 성공한 명령 하나로 계산되지만 장비 접속 성공이 아닙니다.
- `--expect-failure`는 정제된 probe 실패를 exit 0으로 처리합니다. 예상과 달리 성공하면 실패합니다.
  closed loopback matrix는 query string credential/token sentinel을 합성해 console과 `--output` JSON 모두를 검사합니다.
- `--credential-ref-present`는 별도 reference가 있다는 boolean 표시일 뿐 secret 공급·lookup·인증 주입이 아닙니다.
  field HTTP harness는 현재 `http://`만 받으며 기본 None provider를 사용합니다.

## Summary JSON

생성자는 위 runner의 `writeJsonSummary`입니다. 정상 완료 또는 자식 명령의 실패를 처리할 때
최종 JSON을 한 번 기록합니다. 강제 종료·summary 파일 쓰기 오류까지 결과 파일 생성을 보장하지 않으므로
파일이 없거나 불완전하면 원출력과 함께 미완료로 보고합니다.

| 필드 | 값·형식 | 의미 |
| --- | --- | --- |
| `schema` | `media-server.onvif-no-device-suite-summary.v1` | 현재 summary 계약 |
| `generatedAt` | UTC ISO 8601 문자열 | summary 작성 시각; 실행 시작이나 전체 소요 시간이 아님 |
| `mode` | `실장비 제외` | 실장비 성공을 포함하지 않는 실행 |
| `realDeviceEndpointSuccess` | `미확인` | skip·예상 실패·fixture 성공으로 변경하지 않음 |
| `total` | `suite.length` | 계획된 명령 수 |
| `completed` | 정수 | exit 0으로 끝난 명령 수; 개별 assertion 수가 아님 |
| `failed` | `null` 또는 명령 문자열 | 성공이면 `null`, 실패하면 `./server.sh …` 형식의 첫 실패 명령 |
| `results` | 배열 | 실행한 명령만 순서대로 기록. 실패 뒤 미실행 명령은 포함하지 않음 |

각 `results` 항목은 `index`(1부터 시작), `command`, `ok`(boolean), `status`(정수)입니다.
`status`는 자식 exit code이고, 자식 상태가 `null`인 경우 runner가 1로 정규화합니다.
`ok`는 `status === 0`만 뜻하며 skip·예상 실패·정적 검사도 포함합니다.

- 전체 성공: `completed === total`, `failed === null`, `results.length === total`이며 모든 항목이 `ok=true`, `status=0`입니다.
- 첫 실패: `completed < total`, `results.length === completed + 1`이며 마지막 항목은 `ok=false`, `status!=0`입니다.
  마지막 `command`와 `failed`가 같고, runner도 실패 status로 종료합니다. 나머지는 미실행입니다.
- console의 성공 요약 `failed: 0`과 JSON의 `failed: null`은 표현이 다릅니다.

[성공 summary fixture](../test/fixtures/onvif_no_device_suite_success_summary.json)와
[실패 summary fixture](../test/fixtures/onvif_no_device_suite_failure_summary.json)는 형식·실패 전파의 테스트 입력입니다.
fixture의 날짜·성공 개수를 현재 실행 결과로 복사하지 않습니다.
`verify-onvif-no-device-mode`는 runner 상수와 두 fixture의 schema, 완료/실패 상태 및 redaction을 정적으로 대조합니다.
이 검사나 `verify-onvif-no-device-completion`의 통과는 실제 suite 실행 완료를 대신하지 않습니다.

## 서버가 필요한 별도 검사

다음은 suite에 포함되지 않습니다. 승인된 격리 서버·SourceRegistry/PublishedView와 필요한 권한을 준비한 뒤
개별 실행합니다. 현재 이 HTTP 스크립트들은 로그인/session 주입 옵션을 제공하지 않으므로 기본 `auth=auto`인
운영 서버에 그대로 실행하거나 인증을 임의로 끄지 않습니다. 명시 개발용 `auth=off`가 필요한 경우에도
운영 데이터와 분리된 승인 환경에서만 사용합니다.

```sh
./server.sh verify-onvif-probe-draft-api
./server.sh verify-onvif-probe-draft-api --fixture test/fixtures/onvif_probe_result_rtsps_stub.json
./server.sh verify-onvif-probe-draft-api --profile-variant media-rtsps-fallback-when-media2-non-rtsp
./server.sh verify-onvif-import-draft-api
./server.sh verify-onvif-unsupported-api-guard --http-base http://127.0.0.1:8081 --exercise-routes
```

draft 검사는 응답·400 오류·SourceRegistry readback을 확인합니다. draft 자체는 저장하지 않으며,
실제 ONVIF 채널 저장은 별도 `PUT /ops/api/onvif/channels/{channelId}`의 쌍 저장 계약입니다.
Ops용 `sourceDraft.rtspUrl`은 URI를 포함하므로 공유 JSON이나 client/viewer 공개 응답으로 사용하지 않습니다.

- `./server.sh verify-onvif-rtsp-downstream`: 실제 source/view를 쌍 저장하고 client 비노출을 확인합니다.
  기본 입력은 외부 공개 RTSP URL이므로 무네트워크 fixture 검사로 분류하지 않습니다.
  필요하면 승인된 로컬 RTSP fixture를 `--rtsp-url`로 지정하며 영상 재생 성공까지 검사한다고 해석하지 않습니다.
- `./server.sh verify-onvif-ops-sources-ui`: Chrome/Chromium과 격리 서버가 필요한 UI round-trip입니다.
  합성 URI로 source/view·rule을 만들고 copy·비노출을 확인합니다. 실제 UI 실행 승인을 별도로 확인합니다.

두 검사는 임시 registry guard를 유지하고 종료 시 만든 항목의 정리를 시도합니다.
`--allow-non-temp-registry`로 운영 저장소 보호를 우회하지 않습니다. cleanup 경고를 성공으로 덮지 말고
readback·프로세스·포트 상태를 직접 확인합니다. UI 전체 증거는 [UI 풀테스트 기준](./manual-ui-fulltest.md)을 따릅니다.

## 판정과 남는 범위

무장비 실행 완료는 해당 source/환경에서 계획된 suite가 모두 성공하고 원출력·summary·cleanup이 확인된 경우에만
그 실행 범위로 보고합니다. 실패·중단·미실행은 각각 구분합니다. no-device suite 통과는 field smoke gate pass가 아닙니다.
상세 결과는 실행 단위 한 곳에 보존하고 이 안내나 fixture에 완료 표를 복제하지 않습니다.

실장비 인증·HTTPS·Media/Media2 호환성·RTSP/RTSPS 재생은 승인된 현장 확인이 남습니다.
WS-Discovery·PTZ·Events/PullPoint·Profile G/Recording/Replay와 credential persistence도 현재 무장비 suite의
PASS로 지원 기능이 되지 않습니다. 이미 구현된 explicit provider Basic 경계를 미구현 인증 전체와 혼동하지 않습니다.
현장 작업이 별도 승인되면 [현장 gate](./onvif-field-smoke-gate.md)와
[산출물 redaction 기준](./onvif-field-smoke-artifact-redaction.md)을 적용합니다.
