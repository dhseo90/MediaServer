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
| ONVIF Device service SOAP | v1.2.0 Profile S/T live source 제한 지원 | `http://` Device service endpoint에 SOAP POST, `GetServices` 조회 | `verify-onvif-http-transport`, `verify-onvif-field-http-probe` |
| ONVIF Media2 service SOAP | v1.2.0 Profile S/T live source 제한 지원 | `Media2.GetProfiles`, `Media2.GetStreamUri` 기반 live profile 후보 조회 | `verify-onvif-probe-parser`, `verify-onvif-probe-adapter`, `verify-onvif-probe-profile-variants` |
| ONVIF Media service SOAP | v1.2.0 Profile S/T live source 제한 지원 | Media2에서 live RTSP 후보가 없거나 Media2가 없을 때 `Media.GetProfiles`, `Media.GetStreamUri` fallback | `verify-onvif-probe-profile-variants` |
| Live stream URI import | v1.2.0 Profile S/T live source 제한 지원 | 자동 probe 성공 조건은 `rtsp://` 또는 `rtsps://` GetStreamUri live 후보입니다. fixture draft 저장 계약은 `rtsp://`/`rtsps://` URI를 기존 `kind=rtsp` source draft로 축약합니다. `rtsps://` draft 기준은 [ONVIF RTSPS Draft Policy](./onvif-rtsps-draft-policy.md)를 따릅니다. | `verify-onvif-probe-fixture-contract`, `verify-onvif-probe-draft-api`, `verify-onvif-rtsps-draft-policy` |
| 수동 ONVIF stream URI 등록 | 구현 완료 | `/ops/sources`에서 `rtsp://`, `rtsps://`, `http://`, `https://` live URI를 기존 SourceRegistry source로 저장 | `verify-onvif-ops-sources-ui` |
| MediaServer egress URL | 구현 완료 | ONVIF source를 기존 RTSP/WHEP/WebRTC 출력 URL copy 흐름에 연결합니다. 이는 ONVIF protocol이 아니라 MediaServer 출력입니다. | `verify-onvif-ops-sources-ui`, `verify-onvif-rtsp-downstream` |
| HTTPS/TLS ONVIF SOAP endpoint | fail-closed | `https://` Device service endpoint를 scheme preflight gate에서 차단하고 자동 downgrade하지 않습니다. sanitized failure와 향후 구현 조건은 [ONVIF HTTPS SOAP Transport Design](./onvif-https-soap-transport-design.md)을 따릅니다. no-device 성공 검증은 현재 설계 전용인 [ONVIF HTTPS TLS Fixture Harness Design](./onvif-https-tls-fixture-harness-design.md)의 explicit TLS fixture harness 조건으로 분리합니다. | `verify-onvif-https-soap-transport-design`, `verify-onvif-tls-transport-policy`, `verify-onvif-http-transport` |
| Credential reference | v1.2.0 reference/redaction 정책 지원 | credential 원문 저장/출력 없이 reference 존재 여부만 boolean summary로 유지. 저장소/secret manager 경계는 [ONVIF Credential Store Integration Design](./onvif-credential-store-integration-design.md)을 따르고, 향후 인증 주입 조건은 [ONVIF Auth Injection Design](./onvif-auth-injection-design.md)을 따릅니다. | `verify-onvif-auth-injection-design`, `verify-onvif-credential-reference-policy` |

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
| WS-Security UsernameToken | 비지원 | credential 원문 주입을 구현하지 않았고, 현재는 credential reference policy만 제공합니다. |
| HTTP Digest/Basic auth 주입 | 비지원 | endpoint URL credential 금지, 인증 header 주입 비범위. 인증 필요 장비는 sanitized failure로 기록합니다. |

## 보고 기준

지원으로 말할 수 있는 것:

- `http://` ONVIF Device service endpoint에 대한 SOAP POST transport
- `GetServices`, `Media2.GetProfiles`, `Media.GetProfiles`, `GetStreamUri` 기반 live
  RTSP 후보 확인
- 기존 SourceRegistry/PublishedView draft로의 live source 축약
- `/ops/sources` 수동 ONVIF stream URI 등록과 MediaServer RTSP/WHEP/WebRTC 출력 URL copy
- endpoint, credential, raw SOAP, source locator redaction

지원으로 말하면 안 되는 것:

- ONVIF 전체 protocol 지원
- ONVIF conformant server
- ONVIF Profile S/T 전체 conformance 지원
- WS-Discovery 자동 검색
- PTZ, Events/PullPoint, Recording/Replay/Profile G, camera-side Analytics
- HTTPS/TLS SOAP transport 성공
- credential 원문 저장 또는 인증 header 주입
- PTZ/Events/Profile G 같은 비지원 route/API 노출

실장비가 없는 환경에서는 [ONVIF No-Device Verification](./onvif-no-device-verification.md)
기준에 따라 실장비 endpoint 성공을 미확인으로 남깁니다.
