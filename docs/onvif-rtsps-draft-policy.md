# ONVIF RTSPS 후보와 draft 정책

이 문서는 개발자가 `rtsps://` media URI를 probe 후보·draft·수동 채널 등록에서 다룰 때의 계약입니다.
새 source kind나 저장 schema를 만들지 않으며, URI 수용을 실제 카메라 재생 성공으로 해석하지 않습니다.
전체 지원 범위는 [지원 표](./onvif-protocol-support-matrix.md),
profile 선택·권한·저장은 [라이브 소스 안내](./onvif-live-source-support.md)를 봅니다.

## 현재 정책

| 구간 | `rtsp://` | `rtsps://` | 기준 |
| --- | --- | --- | --- |
| Media/Media2 `GetStreamUri` parser·probe 후보 | 허용 | 허용 | 두 scheme 모두 profile의 `transport=RTSP`로 분류 |
| draft 입력 fixture | 허용 | 허용 | decision의 `expectedSourceDraft.kind=rtsp`, `expectedSourceDraft.rtspUrl`과 선택 profile URI 대응 |
| `POST /ops/api/onvif/import-draft` 응답 | 허용 | 허용 | `sourceDraft.kind=rtsp`, `sourceDraft.rtspUrl`에 URI 유지. 미저장 응답 |
| `/ops/sources` 수동 등록 | 허용 | 허용 | `kind=rtsp`, `rtspUrl`로 구성하고 운영자가 명시적으로 쌍 저장 |
| 실장비 재생 성공 보고 | 별도 확인 | 별도 확인 | 무장비 검증만으로는 모두 미확인 |

`expectedSourceDraft`는 fixture decision의 기대 입력이며 응답 필드명이 아닙니다.
`BuildOnvifLiveImportDraft`는 이를 검증하고 응답의 `sourceDraft`와 `publishedViewDraft`를 구성합니다.
선택 profile은 Media/Media2, H264/H265, `transport=RTSP`여야 하며 URI·숫자 ID·source/view 대응·tag 조건을 따릅니다.
URI authority의 username/password나 plaintext credential 표시 입력은 거부합니다.

응답은 `notSaved=true`와 `media-server.onvif-draft-preview.v1` preview를 유지합니다.
`storageAction=none`, `sourceRegistryMutation=false`, `publishedViewMutation=false`이며
장비 probe·registry 저장·media 재생을 수행하지 않습니다.
후속 저장은 `PUT /ops/api/onvif/channels/{channelId}`의 별도 쌍 저장입니다.
실패 시 보상 복구와 부분 실패를 구분하며, draft 성공만으로 저장 완료를 보고하지 않습니다.

Ops용 `sourceDraft.rtspUrl`에는 URI가 들어가지만 `publishedViewDraft`와 client/viewer 공개 응답에는
source locator·ONVIF endpoint·credential reference·raw diagnostic JSON을 노출하지 않습니다.
profile 요약과 URI 비노출 범위를 구분하고, draft 응답을 그대로 공유 산출물로 사용하지 않습니다.

## Fixture와 실패 경계

- [RTSPS probe fixture](../test/fixtures/onvif_probe_result_rtsps_stub.json)는 `media-server.onvif-probe-result-stub.v1`
  형식의 합성 입력입니다. `draftDecision`과 선택 profile이 대응하며, 제품 전체 API schema나 실장비 성공 증거가 아닙니다.
- [profile variants](../test/fixtures/onvif_probe_profile_variants.json)의 `media2-rtsps-live-rtsp`는 Media2 RTSPS direct,
  `media-rtsps-fallback-when-media2-non-rtsp`는 Media2 non-RTSP 후보 뒤 Media RTSPS 선택을 정의합니다.
  두 경우 모두 새 `rtsps` kind가 아니라 기존 `kind=rtsp`로 매핑합니다.
- Media2 우선·Media 조회 순서·빈 profile 실패는 라이브 소스 안내의 기준을 따릅니다.
  HTTP/HLS URI는 수동 등록에 쓸 수 있지만 자동 probe의 live RTSP/RTSPS 후보 성공 조건이 아닙니다.
- API smoke의 `--fixture`와 `--profile-variant`는 함께 사용할 수 없습니다.
  variant 옵션은 선택 fixture에서 기존 draft request를 합성해 동일 endpoint를 검사합니다.

## SOAP HTTPS와 media RTSPS 구분

`https://`는 ONVIF Device service SOAP endpoint의 transport이고,
`rtsps://`는 Media/Media2 `GetStreamUri`가 반환하는 media URI의 scheme입니다.
한쪽 성공으로 다른 쪽 TLS·인증·재생 성공을 증명하지 않습니다.

- 제품 `SendOnvifSoapHttp`는 HTTP와 OpenSSL 빌드의 HTTPS를 구현합니다.
  HTTPS는 certificate verification·hostname verification을 적용하며
  `MEDIA_SERVER_ONVIF_TLS_CA_FILE` 또는 기본 trust store를 사용합니다.
  OpenSSL 없는 빌드는 fail-closed이며 HTTP downgrade하지 않습니다.
- `verify-onvif-http-transport`는 제품 C++ transport를,
  `verify-onvif-https-tls-fixture`는 별도 Node TLS fixture harness를 검사합니다.
  실제 장비 HTTPS endpoint 성공은 별도 현장 결과가 없으면 미확인입니다.
- RTSPS parser·draft 검사는 URI를 기존 RTSP source로 매핑하는 경계입니다.
  실제 RTSPS 연결·인증서 검증·영상 decode·재생을 실행한 결과가 아닙니다.
- 기본 probe provider는 `NoneOnvifCredentialProvider()`이며 reference 표시만으로 인증하지 않습니다.
  explicit provider가 ready `http_basic` material을 공급할 때의 Basic 주입은 구현되어 있지만,
  이것도 실제 카메라 인증 성공이나 RTSPS 재생 인증을 보장하지 않습니다.

상세 TLS·인증 조건은 [TLS 정책](./onvif-tls-transport-policy.md)과
[인증 주입 안내](./onvif-auth-injection-design.md)를 봅니다.

## 검증 명령과 실행 조건

아래 명령은 정의이며 이번 실행 결과를 나타내지 않습니다.
`verify-onvif-rtsps-draft-policy`는 정적 검사뿐 아니라 C++17 smoke를 빌드해 실행합니다.
실행 중인 MediaServer나 실제 카메라는 필요 없지만 compiler와 소유 build 경로가 필요합니다.

```sh
# onvif_run_root는 이번 승인된 실행에서 생성·소유한 절대 경로
: "${onvif_run_root:?먼저 소유한 실행 경로를 지정하세요}"
./server.sh verify-onvif-rtsps-draft-policy --build-dir "$onvif_run_root/rtsps-draft"
./server.sh verify-onvif-protocol-support-matrix
./server.sh verify-onvif-probe-profile-variants
```

이 검사는 실제 `IsRtspOrRtspsUri`·`AttachOnvifStreamUriSoap`·draft 구현과
`product_ui_ops_sources_script.cpp`의 수동 URI 매핑을 대조하고,
[C++ smoke](../scripts/internal/onvif_rtsps_import_draft_smoke.cpp)에서 RTSPS draft의 미저장 응답을 확인합니다.
UI 매핑의 소스 검사는 실제 브라우저 조작과 다릅니다.

격리 서버에서 API까지 확인하는 별도 명령은 다음과 같습니다.

```sh
./server.sh verify-onvif-probe-draft-api --fixture test/fixtures/onvif_probe_result_rtsps_stub.json
./server.sh verify-onvif-probe-draft-api --profile-variant media-rtsps-fallback-when-media2-non-rtsp
```

API smoke는 정상 draft·400 오류·SourceRegistry readback·redaction을 확인하며 저장이나 재생 검사가 아닙니다.
서버/Auth 준비, 외부 접속 제외, 임시 경로와 cleanup은 [무장비 검증 안내](./onvif-no-device-verification.md),
실행 승인과 결과 기록은 [검증 정책](./stream-verification.md#검증-정책)을 따릅니다.
빌드 산출물을 자동 삭제한다고 가정하지 않으며, 실패 로그를 보존한 뒤 소유 경로만 정리합니다.
