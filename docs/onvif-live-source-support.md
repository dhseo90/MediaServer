# ONVIF 라이브 소스 등록과 지원 범위

이 문서는 운영자·연동 개발자를 위한 현재 ONVIF 라이브 소스 안내입니다.
Profile S/T 계열의 live stream URI를 기존 SourceRegistry/PublishedView에 연결하는 제한 지원이며,
ONVIF conformant server나 Profile S/T 전체 conformance를 제공한다는 뜻은 아닙니다.
프로토콜별 조건은 [지원 표](./onvif-protocol-support-matrix.md), 화면 사용법은 [UI 가이드](./ui-guide.md)를 봅니다.

## 범위

현재 경로를 구분합니다.

| 경로 | 구현된 동작 | 하지 않는 일 |
| --- | --- | --- |
| `/ops/sources` 수동 등록 | 운영자가 확인한 ONVIF live URI를 일반 채널 폼으로 저장 | Device endpoint 자동 검색·접속 |
| 같은 폼의 probe fixture 도구 | JSON 입력 → profile 선택 → `POST /ops/api/onvif/import-draft` → 폼 적용 | 카메라 SOAP probe 실행, draft 자동 저장 |
| C++ probe/transport와 검증 harness | Device/Media2/Media SOAP 응답에서 live RTSP/RTSPS 후보 수집 | 제품 UI의 endpoint probe API, 모든 제조사 호환 보장 |

ONVIF는 file·RTSP pull·HTTP/HLS·WHEP pull·Published WebRTC와 나란히 있는 source 유형입니다.
별도 import 화면을 만들지 않고 채널 폼 안에 수동 URI와 fixture 적용 도구를 제공합니다.
기본 seed의 `Public ONVIF Stream Sample`도 ONVIF tag를 붙인 RTSP 예시이며 실제 ONVIF 카메라 발견·인증 증거가 아닙니다.

WS-Discovery 자동 검색, PTZ 제어, ONVIF Events/PullPoint subscription,
ONVIF Profile G recording/replay·camera recording configuration·edge storage·playback/search는 지원하지 않습니다.
이는 MediaServer 자체 녹화 기능과 별개입니다. 나머지 미지원 서비스와 API 경계는
[지원 표](./onvif-protocol-support-matrix.md)와 [미지원 API 기준](./onvif-unsupported-api-guard.md)을 따릅니다.

## UI 계약

1. `/ops/sources`의 채널 추가/편집에서 `ONVIF 카메라`를 선택합니다.
2. `ONVIF 스트림 URI`에 이미 확인한 `rtsp://`, `rtsps://`, `http://`, `https://` live URI를 입력하거나,
   합성 probe fixture를 붙여 넣고 profile을 선택해 `Probe draft 적용`을 누릅니다.
3. fixture 도구는 `mediaProfiles` 중 token과 RTSP/RTSPS URI가 있는 후보를 표시합니다.
   기본 선택은 `draftDecision.selectedProfileToken`, `selected=true`, 첫 후보 순이며 사용자가 바꿀 수 있습니다.
   최종 Media/Media2·encoding·ID·URI 검사는 draft API가 수행합니다.
4. 적용된 이름·URI와 채널 설정을 검토한 뒤 별도로 저장합니다. draft 적용 성공은 저장이나 재생 성공이 아닙니다.
5. 저장된 ONVIF 채널은 채널 목록의 Live/VA URL copy와 룰 목록의 URL copy 흐름을 사용합니다.
   `ONVIF RTSP`, `ONVIF WHEP`, `WebRTC`는 MediaServer 출력 링크이며 ONVIF 장비 제어 API가 아닙니다.

이 UI는 Device endpoint를 직접 probe하지 않습니다. fixture의 endpoint·profile 정보가 있더라도
`import-draft`는 입력 JSON을 변환할 뿐 네트워크 요청이나 credential lookup을 하지 않습니다.
fixture의 합성 주소·장비명은 예시이며 실제 장비 정보를 공유 문서에 복사하지 않습니다.

## 저장 계약

UI의 `onvif`는 별도 저장 kind가 아닙니다. `channelPayloadsFromFormData`가 기존 source/view payload로 변환합니다.

| 입력·필드 | 현재 매핑 |
| --- | --- |
| 채널 ID | 폼은 1 이상의 숫자 ID를 사용하며 source/view의 ID를 동일하게 구성 |
| `rtsp://`, `rtsps://` | `kind=rtsp`, `rtspUrl` |
| `http://`, `https://` | `httpUrl`; 주소에 `.m3u8`이 있으면 `kind=hls`, 그 외 `kind=http` |
| `tags` | `onvif`, `live` |
| 이름·소유·일반 설정 | 기존 `displayName`, `ownerGroup`, 위치·그룹·녹화 정책과 PublishedView 설정 사용 |

수동 ONVIF 폼은 WHEP URI를 입력 종류로 제공하지 않습니다. 별도 WHEP source 등록이나
기존 registry가 표현할 수 있는 kind와 이 폼의 입력 범위를 혼동하지 않습니다.
`publishedViewDraft`에는 RTSP URI·ONVIF endpoint·credential reference를 넣지 않습니다.
fixture의 `proposedOriginMetadata`는 진단/설계 입력이지 현재 저장되는 origin metadata가 아닙니다.

ONVIF 채널의 명시적 저장은 `PUT /ops/api/onvif/channels/{channelId}`에
`source`, `publishedView`를 함께 보내는 경로입니다. 서버의 `UpsertOnvifSourceView`는 두 객체를 검증한 뒤
`paired-write-with-compensating-rollback`으로 저장합니다. 저장 실패 시 이전 상태 복구를 시도하며,
복구 실패는 `partialSave=true`, `consistencyStatus=manual-recovery-required`로 구분합니다.
이를 무조건 성공하는 원자 저장이나 자동 복구 완료로 해석하지 않습니다.
기존 `/ops/api/sources/{channelId}`·`/ops/api/views/{channelId}`는 개별 저장 경로로 남지만,
현재 ONVIF 폼의 쌍 저장을 두 개의 독립 요청으로 대체하지 않습니다.
저장·재시작 복구 세부 기준은 [설정 참조](./config-reference.md)를 봅니다.

## Draft API와 미저장 응답

`POST /ops/api/onvif/import-draft`는 두 기존 fixture 형식을 받습니다.

- [live import fixture](../test/fixtures/onvif_live_import_stub.json): `profiles`와 `importDecision`.
- [probe result fixture](../test/fixtures/onvif_probe_result_stub.json): `mediaProfiles`와 `draftDecision`.

공통 decision은 `selectedProfileToken`, `expectedSourceDraft`, `expectedPublishedViewDraft`를 사용합니다.
응답에는 선택 profile 요약, `sourceDraft`, `publishedViewDraft`, `notSaved=true`와 다음 경계가 포함됩니다.

| `previewContract` 필드 | 값 |
| --- | --- |
| `schema` | `media-server.onvif-draft-preview.v1` |
| `scope` | `ops-sources-before-save` |
| `requiresExplicitSave` | `true` |
| `storageAction` | `none` |
| `sourceRegistryMutation`, `publishedViewMutation` | `false` |
| `rawSoapIncluded`, `credentialMaterialIncluded`, `endpointIncluded`, `diagnosticJsonIncluded` | `false` |

preview에는 ONVIF endpoint·credential reference 원문·raw SOAP·raw diagnostic JSON을 반환하지 않습니다.
다만 Ops용 `sourceDraft.rtspUrl`에는 저장에 필요한 선택 stream URI가 들어갑니다.
이 응답을 그대로 client/viewer 응답이나 공유 산출물로 사용하면 안 됩니다.

다음 오류는 400으로 거부하며 draft API는 저장을 수행하지 않습니다.

- JSON object가 아닌 body, decision 또는 selected token 누락, 선택 profile 불일치.
- `mediaApi`가 Media/Media2가 아니거나 `encoding`이 H264/H265가 아닌 profile.
- `transport=RTSP`가 아니거나 RTSP/RTSPS URI가 없는 profile, URI authority의 credential 포함.
- source draft의 숫자 ID·`kind=rtsp`·선택 URI 대응 오류, view/source ID 불일치, `onvif`/`live` tag 누락.
- `auth.plaintextSecretIncluded=true`. 실제 비밀을 fixture 필드에 넣어도 된다는 의미는 아닙니다.

입력 검사와 API의 부작용 없음은 [무장비 검증 안내](./onvif-no-device-verification.md)의
`verify-onvif-import-draft-api`, `verify-onvif-probe-draft-api`가 다룹니다.
이들은 실행 중인 격리 서버·registry가 필요한 검사이며 문서 확인만으로 실행 결과를 얻지는 않습니다.

## Media/Media2 profile 선택

`RunOnvifProbeAdapter`의 순서는 다음과 같습니다.

1. `GetServices`에서 광고된 Media2/Media의 존재 여부를 확인합니다.
2. 사용 가능한 서비스에 대해 `Media2.GetProfiles` → `Media.GetProfiles` 순서로 조회합니다.
   Media2 후보가 있어도 Media가 광고됐다면 Media도 조회합니다.
3. 각 profile의 `Media2.GetStreamUri` 또는 `Media.GetStreamUri`가 `rtsp://`/`rtsps://`를 반환하면
   live 후보에 추가합니다. 실패한 profile은 추가하지 않습니다.
4. 서비스 우선순위와 응답 순서상 첫 후보 하나만 `selected=true`로 둡니다.
   Media2 후보가 없고 Media 후보가 있으면 결과적으로 Media fallback이 됩니다.

현재 parser는 service의 이름·namespace·available 여부를 요약하며 XAddr를 별도 목적지로 선택하지 않습니다.
모든 SOAP action은 입력한 `request.endpoint`로 전송합니다. 비기본 Device service path fixture는
입력 path를 다루는 시험이지 장비가 광고한 여러 service 주소를 자동 추적한다는 보장이 아닙니다.

probe의 RTSP/RTSPS 후보 수집과 draft의 H264/H265 검증은 서로 다른 단계입니다.
선택된 RTSP/RTSPS URI는 모두 `sourceDraft.kind=rtsp`, `sourceDraft.rtspUrl`로 축약합니다.
HTTP/HLS는 수동 URI 입력에는 사용할 수 있지만 자동 probe의 live 후보 성공 조건은 아닙니다.
`rtsps://` media URI와 `https://` SOAP endpoint도 별개입니다.
세부 fixture·호환 기준은 [RTSPS draft 정책](./onvif-rtsps-draft-policy.md)에 둡니다.

실패 요약은 raw SOAP나 장비 fault detail을 옮기지 않고 다음 경계를 유지합니다.

| 조건 | 대표 요약 |
| --- | --- |
| endpoint/timeout/transport 입력 오류 | `ONVIF probe failed at request: …` |
| GetServices HTTP 실패 | `ONVIF probe failed at GetServices: HTTP …` |
| GetServices 전송 실패 | `ONVIF probe failed at GetServices: transport error` |
| Media/Media2 없음 | `ONVIF probe failed at GetServices: Media or Media2 service is required` |
| 최종 live 후보 없음 | `ONVIF probe failed at GetStreamUri: no live RTSP profile discovered` |

`media2-and-media-empty-profiles`는 Media/Media2가 있지만 profile이 모두 비어 있는 실패 case입니다.
실패 fixture가 고정한 SOAP Fault·malformed XML·non-RTSP GetStreamUri case는 정상 draft 성공으로 바꾸지 않습니다.
개별 profile 조회 실패 뒤 다른 후보가 성공할 수 있으므로 모든 하위 실패가 즉시 전체 실패라는 뜻은 아닙니다.

## HTTP/HTTPS·인증·권한

`SendOnvifSoapHttp`는 HTTP SOAP POST를 제공하며, `MEDIA_SERVER_USE_OPENSSL=1` 빌드에서는
HTTPS도 구현합니다. HTTPS는 인증서 검증과 hostname verification을 수행하고,
`MEDIA_SERVER_ONVIF_TLS_CA_FILE` 또는 기본 trust store를 사용합니다.
OpenSSL 없는 빌드는 `https transport requires OpenSSL support`로 실패하며 HTTP로 downgrade하지 않습니다.
TLS 세부 조건은 [TLS 정책](./onvif-tls-transport-policy.md)과
[HTTPS transport 설계](./onvif-https-soap-transport-design.md)를 봅니다.

- 기본 probe overload의 provider는 `NoneOnvifCredentialProvider()`입니다.
- 명시적으로 전달한 provider가 `credential_ready`, `http_basic` material을 반환할 때만
  `Authorization` header를 주입합니다. reference 존재 표시만으로 인증되지는 않습니다.
- provider가 준비되지 않으면 인증 header를 넣지 않습니다. Digest challenge/retry나
  WS-Security UsernameToken/PasswordDigest로 자동 전환하지 않습니다.
- 현재 제품 persistent secret store·외부 secret manager·credential binding store는 비활성입니다.
  in-memory provider는 fixture/loopback용 대체 경로입니다.
- `GET /ops/api/onvif/credential-provider-status`와
  `GET /ops/api/onvif/live-import-persist-decision`은 상태·저장 절차 요약이며 secret lookup이나 저장을 수행하지 않습니다.

Ops API는 admin 또는 operator+`ops:read`를 요구하며, draft 생성과 쌍 저장에는 `source:write`도 필요합니다.
admin은 기존 권한 helper의 우회 규칙을 따릅니다. Client/viewer에 ONVIF 관리 API를 열지 않습니다.
[credential reference 정책](./onvif-credential-reference-policy.md),
[provider/store 설계](./onvif-credential-store-integration-design.md),
[인증 주입 설계](./onvif-auth-injection-design.md)가 상세 기준입니다.

credential을 endpoint/stream URI·이름·tag·공유 로그에 넣지 않습니다.
`/client/api/views`와 `/client/api/views/{viewId}`는 허용된 PublishedView 요약만 반환하며
source locator, ONVIF endpoint, credential reference, raw diagnostic JSON을 전달하지 않습니다.
숨겨진 DOM이나 복사 기능에 이를 추가하는 것도 금지합니다.

## 검증 정의와 실행 경계

아래 자료는 유지되는 테스트 정의입니다. 합성 vendor 이름이나 fixture의 성공 기대값을
실제 제조사 호환 인증·이번 실행 PASS로 해석하지 않습니다.

| 대상 | 정의·안내 |
| --- | --- |
| Media2 우선·Media fallback·Media-only·H265·RTSPS·빈 profile | [profile variants](../test/fixtures/onvif_probe_profile_variants.json), [RTSPS fixture](../test/fixtures/onvif_probe_result_rtsps_stub.json) |
| main/substream·low-fps·비기본 path 등 합성 응답 차이 | [synthetic vendor pack](../test/fixtures/onvif_synthetic_vendor_fixture_pack.json) |
| request/transport/service/profile 실패 요약 | [error wording matrix](../test/fixtures/onvif_probe_error_wording_matrix.json) |
| SOAP Fault·malformed response 비노출 | [fault matrix](../test/fixtures/onvif_soap_fault_malformed_matrix.json) |
| 닫힌 loopback·query sentinel·출력 redaction | [closed loopback matrix](../test/fixtures/onvif_closed_loopback_failure_matrix.json) |
| 전체 no-device 명령·성공/실패 summary fixture·`media-server.onvif-no-device-suite-summary.v1` | [무장비 검증 안내](./onvif-no-device-verification.md) |

정적 지원 경계 확인 명령은 다음과 같습니다.

```sh
./server.sh verify-onvif-protocol-support-matrix
./server.sh verify-onvif-unsupported-api-guard
./server.sh verify-docs-links
```

`verify-onvif-no-device-suite`는 build·fixture·loopback 검사를 포함하는 별도 실행 묶음입니다.
`verify-onvif-http-transport`는 제품 C++ transport의 HTTP/OpenSSL HTTPS fixture를,
`verify-onvif-https-tls-fixture`는 별도 fixture-only TLS harness를 다룹니다.
정적 설계 검사, 합성 fixture, local simulator fixture 성공, 실제 장비 성공을 구분합니다.

`verify-onvif-ops-sources-ui`는 임시 registry의 저장·copy parity·Client 비노출을 확인하는 UI 검사입니다.
`verify-ops-client-ui --screenshots`의 ONVIF 비지원 hint 확인과 320px 포함 규칙은
시각 회귀 정의이며, 실행되지 않은 screenshot이나 실제 UI PASS를 의미하지 않습니다.
실행 승인·격리·정리는 [검증 정책](./stream-verification.md#검증-정책),
실제 UI 증거는 [UI 풀테스트](./manual-ui-fulltest.md)를 따릅니다.

## 승인된 현장 확인의 경계

실장비가 없거나 실행 승인이 없으면 실장비 endpoint 성공은 미확인으로 남깁니다.
공개 인터넷의 임의 ONVIF endpoint를 대체 장비로 사용하지 않습니다.
no-device 결과는 [현장 gate](./onvif-field-smoke-gate.md)의 field smoke gate 결과와 분리합니다.
장비·네트워크·credential 사용을 승인받은 경우에만 해당 gate의 절차와
[산출물 redaction 기준](./onvif-field-smoke-artifact-redaction.md)을 적용합니다.

현장 도구 `verify-onvif-field-http-probe`의 현재 한계:

- `--endpoint` 또는 `MEDIA_SERVER_ONVIF_FIELD_ENDPOINT`는 `http://`만 받습니다.
  제품 C++ transport의 OpenSSL HTTPS 구현과 이 도구의 입력 허용 범위는 다릅니다.
- `--credential-ref-present`는 별도 reference 보관 여부의 boolean 표시입니다. credential을 공급하거나 인증 header를 주입하지 않습니다.
- `--allow-missing-endpoint`는 endpoint 미설정 시 명시 skip이며 성공한 장비 probe가 아닙니다.
- `--expect-failure`는 sanitized 실패 경계 확인용입니다. exit 0이어도 endpoint 성공으로 기록하지 않습니다.
- `--output`은 endpoint·stream URI·credential·raw SOAP를 제외한 요약을 저장합니다.
  이 redacted 결과 JSON은 URI를 포함한 draft 입력 fixture와 같지 않습니다.

승인된 현장 확인에서도 서비스/profile 확인, RTSP/RTSPS 재생, 명시적 채널 저장,
Ops 채널/룰 copy와 Client 비노출 확인을 구분합니다. 공유 보고에는 원문 대신 gate 상태·재생 결과·
redaction review·미확인만 남깁니다. 형식과 필수 필드는 위 현장 gate 및 sample bundle을 기준으로 삼습니다.

## 구현 위치

- [onvif_live_import.h](../include/ingress/onvif_live_import.h),
  [onvif_live_import.cpp](../src/ingress/onvif_live_import.cpp): `BuildOnvifLiveImportDraft`,
  `RunOnvifProbeAdapter`, `SendOnvifSoapHttp`, SOAP parser와 preview/credential gate 응답.
- [credential provider](../src/ingress/onvif_credential_provider.cpp): `NoneOnvifCredentialProvider`,
  `InMemoryCredentialSecretProvider`; 공개 interface는 [header](../include/ingress/onvif_credential_provider.h).
- [채널 UI](../src/ingress/product_ui_ops_sources_script.cpp): `applyOnvifProbeDraft`,
  `fixtureWithSelectedProbeProfile`, `channelPayloadsFromFormData`, `saveChannelSourceViewPair`.
- [HTTP route](../src/ingress/webrtc_http_server_runtime.cpp): Ops/source-write guard와 draft·쌍 저장 route.
- [SourceRegistry](../src/ingress/source_view_registry.cpp): `UpsertOnvifSourceView`, `ClientPublishedViewJson`.
  서버 구성과 저장 설정은 [구조](./media-server-architecture.md)·[설정 참조](./config-reference.md),
  미구현 확장은 [backlog](./development-backlog.md)를 봅니다.
