# ONVIF Protocol Support Matrix

이 문서는 v1.2.0 ONVIF Profile S/T live source 현장 연동에서 어떤
ONVIF protocol/service/profile 범위를 지원하는지 한곳에 고정합니다. 이 범위는
live source 등록과 redacted field verification을 위한 제한 지원이며, ONVIF
Profile S/T 전체 conformance나 ONVIF conformant server 구현이 아닙니다.

관련 기준:

- [ONVIF Live Source Support](./onvif-live-source-support.md)
- [ONVIF No-Device Verification](./onvif-no-device-verification.md)
- [ONVIF TLS Transport Policy](./onvif-tls-transport-policy.md)
- [ONVIF HTTPS TLS Fixture Harness Design](./onvif-https-tls-fixture-harness-design.md)
- [ONVIF Credential Reference Policy](./onvif-credential-reference-policy.md)
- [ONVIF Credential Store Integration Design](./onvif-credential-store-integration-design.md)
- [ONVIF RTSPS Draft Policy](./onvif-rtsps-draft-policy.md)
- [ONVIF HTTPS SOAP Transport Design](./onvif-https-soap-transport-design.md)
- [ONVIF Auth Injection Design](./onvif-auth-injection-design.md)
- [ONVIF Unsupported API Guard](./onvif-unsupported-api-guard.md)

## 지원 Matrix

| 항목 | 현재 상태 | 세부 범위 | 검증 |
| --- | --- | --- | --- |
| ONVIF Device service SOAP | v1.2.0 Profile S/T live source 제한 지원 | `http://` 또는 OpenSSL 빌드의 `https://` Device service endpoint에 SOAP POST, `GetServices` 조회 | `verify-onvif-http-transport`, `verify-onvif-https-soap-transport-design`, `verify-onvif-local-simulator`, `verify-onvif-field-http-probe` |
| ONVIF Media2 service SOAP | v1.2.0 Profile S/T live source 제한 지원 | `Media2.GetProfiles`, `Media2.GetStreamUri` 기반 live profile 후보 조회 | `verify-onvif-probe-parser`, `verify-onvif-probe-adapter`, `verify-onvif-probe-profile-variants`, `verify-onvif-local-simulator` |
| ONVIF Media service SOAP | v1.2.0 Profile S/T live source 제한 지원 | Media2에서 live RTSP 후보가 없거나 Media2가 없을 때 `Media.GetProfiles`, `Media.GetStreamUri` fallback | `verify-onvif-probe-profile-variants`, `verify-onvif-local-simulator` |
| Live stream URI import | v1.2.0 Profile S/T live source 제한 지원 | 자동 probe 성공 조건은 `rtsp://` 또는 `rtsps://` GetStreamUri live 후보입니다. fixture draft 저장 계약은 `rtsp://`/`rtsps://` URI를 기존 `kind=rtsp` source draft로 축약합니다. `rtsps://` draft 기준은 [ONVIF RTSPS Draft Policy](./onvif-rtsps-draft-policy.md)를 따릅니다. | `verify-onvif-probe-fixture-contract`, `verify-onvif-probe-draft-api`, `verify-onvif-rtsps-draft-policy` |
| 수동 ONVIF stream URI 등록 | 구현 완료 | `/ops/sources`에서 `rtsp://`, `rtsps://`, `http://`, `https://` live URI를 기존 SourceRegistry source로 저장 | `verify-onvif-ops-sources-ui` |
| MediaServer egress URL | 구현 완료 | ONVIF source를 기존 RTSP/WHEP/WebRTC 출력 URL copy 흐름에 연결합니다. 이는 ONVIF protocol이 아니라 MediaServer 출력입니다. | `verify-onvif-ops-sources-ui`, `verify-onvif-rtsp-downstream` |
| HTTPS/TLS ONVIF SOAP endpoint | OpenSSL 빌드 제한 지원 | `https://` Device service endpoint는 OpenSSL 빌드에서 TLS certificate verification과 hostname verification 후 SOAP POST를 수행합니다. OpenSSL이 없는 빌드는 fail-closed이며, HTTP downgrade는 하지 않습니다. no-device HTTPS 성공은 fixture server와 fixture-only harness 기준이고 실장비 HTTPS endpoint 성공은 미확인입니다. | `verify-onvif-https-soap-transport-design`, `verify-onvif-https-tls-fixture`, `verify-onvif-tls-transport-policy`, `verify-onvif-http-transport` |
| Credential reference / HTTP Basic auth | v1.2.0 reference/redaction 정책 지원 | credential 원문 저장/출력 없이 reference 존재 여부만 boolean summary로 유지합니다. no-device in-memory fixture store와 명시적으로 연결된 provider가 `http_basic` material을 반환할 때만 Authorization header를 주입합니다. Digest/WS-Security는 `test/fixtures/onvif_auth_method_design_matrix.json`에서 design-only로 고정합니다. 제품 persistent store/secret manager 경계는 [ONVIF Credential Store Integration Design](./onvif-credential-store-integration-design.md)을 따르고, 인증 주입 기준은 [ONVIF Auth Injection Design](./onvif-auth-injection-design.md)을 따릅니다. | `verify-onvif-auth-injection-design`, `verify-onvif-auth-injection-loopback`, `verify-onvif-credential-reference-policy` |
| SOAP Fault / malformed response | v1.2.0 fail-safe/redaction 정책 지원 | SOAP Fault body, malformed XML, HTTP fault response는 raw SOAP나 fault detail을 operator summary에 남기지 않고 기존 sanitized probe failure로 축약합니다. | `verify-onvif-soap-fault-matrix`, `verify-onvif-probe-error-wording` |

## 비지원 Matrix

| 항목 | 현재 상태 | 이유 |
| --- | --- | --- |
| ONVIF WS-Discovery | 비지원 | multicast discovery, device inventory, 자동 endpoint discovery는 현재 live source draft 범위 밖입니다. |
| ONVIF PTZ | 비지원 | pan/tilt/zoom command, preset, move/stop control은 현재 저장/API/UI 계약에 포함하지 않습니다. |
| ONVIF Events / PullPoint | 비지원 | event subscription, PullPoint, topic mapping은 MediaServer VA event payload와 별도 계약입니다. |
| ONVIF Profile G / Recording / Replay | 비지원 | camera recording configuration, recording search, playback/replay URL은 live source 등록 범위 밖입니다. |
| ONVIF Analytics service | 비지원 | camera-side analytics rule/metadata를 가져오지 않습니다. 영상 분석은 MediaServer VA pipeline이 담당합니다. |
| ONVIF Imaging service | 비지원 | exposure, focus, image settings 제어를 제공하지 않습니다. |
| ONVIF Device management | 비지원 | system date/time, network interface, reboot, firmware, user management 같은 장비 제어를 수행하지 않습니다. |
| WS-Security UsernameToken | 비지원 | SOAP security header 생성과 PasswordDigest fallback은 현재 live source draft 범위 밖입니다. |
| HTTP Digest auth 주입 | 비지원 | Digest challenge/nonce 처리와 retry fallback은 현재 범위 밖입니다. endpoint URL credential은 계속 금지합니다. |

## 보고 기준

지원으로 말할 수 있는 것:

- `http://` ONVIF Device service endpoint에 대한 SOAP POST transport
- `GetServices`, `Media2.GetProfiles`, `Media.GetProfiles`, `GetStreamUri` 기반 live
  RTSP 후보 확인
- 기존 SourceRegistry/PublishedView draft로의 live source 축약
- `/ops/sources` 수동 ONVIF stream URI 등록과 MediaServer RTSP/WHEP/WebRTC 출력 URL copy
- provider 연결 시 HTTP Basic Authorization header 주입과 sanitized 실패 요약
- endpoint, credential, raw SOAP, source locator redaction

지원으로 말하면 안 되는 것:

- ONVIF 전체 protocol 지원
- ONVIF conformant server
- ONVIF Profile S/T 전체 conformance 지원
- WS-Discovery 자동 검색
- PTZ, Events/PullPoint, Recording/Replay/Profile G, camera-side Analytics
- HTTPS/TLS SOAP transport 성공
- credential 원문 저장, provider 없는 인증 header 주입, Digest/WS-Security 자동 fallback
- PTZ/Events/Profile G 같은 비지원 route/API 노출

실장비가 없는 환경에서는 [ONVIF No-Device Verification](./onvif-no-device-verification.md)
기준에 따라 실장비 endpoint 성공을 미확인으로 남깁니다.
2026-05-15 v1.2.0 ONVIF 작업은 실제 ONVIF 카메라로 검증하지 않았고,
공개 인터넷의 임의 ONVIF endpoint도 사용하지 않았습니다. 실제 장비 성공과
local simulator fixture 성공은 보고에서 분리합니다.
