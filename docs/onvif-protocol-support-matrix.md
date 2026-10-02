# ONVIF 프로토콜 지원 표

이 표는 현재 소스의 구현 범위와 조건을 요약합니다. ONVIF Profile S/T live source 등록을 위한
제한 지원이며, ONVIF Profile S/T 전체 conformance 지원이나 ONVIF conformant server 구현이 아닙니다.
[라이브 소스 안내](./onvif-live-source-support.md)의 수동 입력·fixture draft·명시적 저장 흐름과 함께 읽습니다.
현재 제품 UI/API는 Device endpoint를 입력받아 SOAP probe를 실행하지 않으며,
아래 probe/transport 지원은 C++ adapter와 별도 harness의 구현을 뜻합니다.

## 지원 범위

| 항목 | 현재 상태 | 구현·검증 경계 |
| --- | --- | --- |
| ONVIF Device service SOAP | live source 제한 지원 | `GetServices`로 광고된 service 이름·namespace·available 여부를 읽음. `http://` 또는 OpenSSL 빌드의 `https://` Device service endpoint에 SOAP POST |
| ONVIF Media2 service SOAP | live profile 조회 | `Media2.GetProfiles`, `Media2.GetStreamUri`를 먼저 호출해 RTSP/RTSPS 후보 수집 |
| ONVIF Media service SOAP | 후순위 후보 조회 | 광고된 Media가 있으면 `Media.GetProfiles`, `Media.GetStreamUri`도 조회. Media2가 없거나 유효 후보가 없을 때 Media 후보가 선택되지만, Media2 성공 시 Media 조회를 생략하는 구현은 아님 |
| Live stream URI import | 기존 draft 변환 | `rtsp://` 또는 `rtsps://` GetStreamUri live 후보를 `kind=rtsp` source draft로 축약. Media/Media2·H264/H265·선택 token·URI/ID/tag 대응 검사, `notSaved=true` 유지 |
| 수동 ONVIF stream URI 등록 | `/ops/sources` 채널 폼에 구현 | `rtsp://`, `rtsps://`, `http://`, `https://` live URI를 기존 `rtsp`/`http`/`hls` source로 매핑. fixture 적용 또는 수동 입력 후 운영자가 별도 쌍 저장 |
| MediaServer egress URL | 기존 출력 흐름 사용 | ONVIF 채널도 MediaServer RTSP/WHEP/WebRTC 출력 URL copy 사용. ONVIF service 지원이나 장비의 원본 locator 공개를 의미하지 않음 |
| HTTPS/TLS ONVIF SOAP endpoint | OpenSSL 빌드 제한 지원 | `SendOnvifSoapHttp`의 HTTPS 경로는 certificate verification·hostname verification 적용. OpenSSL 미탑재 시 fail-closed, HTTP downgrade 없음. fixture 성공과 실장비 HTTPS endpoint 성공은 별도 |
| Credential reference / HTTP Basic auth | provider 명시 연결 시에만 Basic 주입 | `credential_ready`와 `http_basic` material이 있을 때 `Authorization` header 주입. 기본 provider는 `none`; 제품 persistent store·외부 secret manager·credential binding store는 비활성 |
| SOAP Fault / malformed response | 실패 요약·비노출 | HTTP 상태 또는 service/profile 부재로 실패를 요약. raw SOAP·fault detail을 운영자 오류 요약에 복사하지 않음. 완전한 ONVIF/XML 적합성 검증을 뜻하지 않음 |

모든 SOAP action은 입력한 endpoint로 전송하며, 광고된 XAddr를 service별 목적지로 자동 추적하지 않습니다.
profile 후보는 Media2→Media 및 응답 순서로 쌓고 첫 후보만 `selected=true`로 둡니다.
후속 UI profile 선택은 fixture 기반이며 실기기와 협상하는 기능이 아닙니다.

### HTTPS와 인증의 확인 수준

- `verify-onvif-http-transport`는 실제 제품 C++ `SendOnvifSoapHttp`를 빌드하여 HTTP와,
  OpenSSL 사용 시 HTTPS의 trusted fixture 성공·실패 경계를 확인하는 정의입니다.
- `verify-onvif-https-tls-fixture`는 별도 fixture-only harness로 TLS 성공·실패·redaction을 확인합니다.
  두 검사는 서로 다른 경로이며 실장비 성공으로 합치지 않습니다.
- 실장비 HTTPS endpoint 성공은 미확인입니다. 실제 카메라 인증·Media/Media2 호환성·RTSP/RTSPS 재생도
  승인된 현장 결과가 없으면 미확인으로 남깁니다.
- `verify-onvif-field-http-probe`는 현재 `http://`만 받으며 `--credential-ref-present`로 인증을 주입하지 않습니다.
- HTTP Basic 주입 경로는 존재하지만 provider 미연결 제품에서 자동 인증되는 것은 아닙니다.
  Digest와 WS-Security는 [auth method fixture](../test/fixtures/onvif_auth_method_design_matrix.json)의 design-only 항목입니다.

세부 기준·개별 실행 명령:

- [TLS 정책](./onvif-tls-transport-policy.md), [HTTPS transport](./onvif-https-soap-transport-design.md),
  [TLS fixture harness](./onvif-https-tls-fixture-harness-design.md): trust store·hostname·no downgrade 및
  `verify-onvif-https-soap-transport-design`, `verify-onvif-tls-transport-policy`.
- [credential reference](./onvif-credential-reference-policy.md),
  [provider/store](./onvif-credential-store-integration-design.md), [인증 주입](./onvif-auth-injection-design.md):
  reference 값 비노출·store 미구현 경계, `verify-onvif-auth-injection-design`, `verify-onvif-auth-injection-loopback`.
- [RTSPS draft](./onvif-rtsps-draft-policy.md): media URI의 `rtsps://`와 SOAP `https://` 구분,
  `verify-onvif-rtsps-draft-policy` 및 API fixture 옵션.
- [무장비 검증](./onvif-no-device-verification.md): `verify-onvif-probe-parser`,
  `verify-onvif-probe-adapter`, `verify-onvif-probe-profile-variants`, `verify-onvif-local-simulator`,
  `verify-onvif-soap-fault-matrix` 등 정상·오류·경계 정의. 검사 목록은 실행 결과가 아닙니다.

## 미지원 범위

| 항목 | 현재 상태 | 범위 밖 동작 |
| --- | --- | --- |
| ONVIF WS-Discovery | 비지원 | multicast 검색, device inventory, 자동 endpoint discovery |
| ONVIF PTZ | 비지원 | pan/tilt/zoom, preset, move/stop control |
| ONVIF Events / PullPoint | 비지원 | subscription, PullPoint, topic mapping. MediaServer VA 이벤트와 별개 |
| ONVIF Profile G / Recording / Replay | 비지원 | 카메라 recording 설정·edge storage·recording search·playback/replay URL. MediaServer 자체 녹화 기능과 별개 |
| ONVIF Analytics service | 비지원 | camera-side analytics rule/metadata 가져오기. 영상 분석은 MediaServer VA pipeline 담당 |
| ONVIF Imaging service | 비지원 | exposure, focus, image settings 제어 |
| ONVIF Device management | 비지원 | system date/time, network interface, reboot, firmware, 카메라 user management |
| WS-Security UsernameToken | 비지원 | SOAP security header, PasswordDigest fallback |
| HTTP Digest auth 주입 | 비지원 | challenge/nonce 처리와 retry fallback |

[미지원 API 기준](./onvif-unsupported-api-guard.md)과
[negative route fixture](../test/fixtures/onvif_unsupported_api_negative_routes.json)는
`import-draft`의 잘못된 method(405)와 discover/PTZ/Events/PullPoint/recording/replay/analytics/imaging/device-management
route 부재(404)를 고정합니다. 실제 HTTP 실행은 인증·격리 조건을 갖춘 별도 검사입니다.
이 fixture는 모든 현행 ONVIF route를 나열한 allowlist가 아닙니다.
현재 draft·쌍 저장·provider 상태·저장 절차 요약 API는 [라이브 소스 안내](./onvif-live-source-support.md)를 봅니다.

## 보고와 변경 경계

지원 여부는 소스 구현, 빌드 조건, 합성/loopback 시험, 실제 장비 결과를 분리해 보고합니다.
OpenSSL HTTPS 구현을 일괄 비지원으로 기록하거나 fixture 기대값을 현장 PASS로 올리지 않습니다.
공개 인터넷의 임의 ONVIF endpoint를 승인된 장비 대신 사용하지 않습니다.
실제 현장 판정·redaction 조건은 [현장 gate](./onvif-field-smoke-gate.md)에 둡니다.

source locator·ONVIF endpoint·credential reference·raw diagnostic JSON을 client/viewer에 노출하지 않습니다.
이 지원 범위는 SourceRegistry/PublishedView 공개 payload, Auth/Role/Scope,
Event POST payload, WebRTC DataChannel·SSE/WS metadata schema, RTSP/WebRTC media path 변경을 허용하지 않습니다.

이 문서의 정적 연결 확인은 `./server.sh verify-onvif-protocol-support-matrix`입니다.
제품·실기기·실제 UI·장시간 검사 실행 승인과 증거 기준은
[검증 정책](./stream-verification.md#검증-정책)을 따릅니다.
