# ONVIF TLS 연결 정책

독자: ONVIF 연결을 구성하는 운영자와 transport 유지보수자.
이 문서는 현행 SOAP TLS 기준이며 실행 결과 원장이 아닙니다.
구현 흐름은 [HTTPS SOAP 계약](./onvif-https-soap-transport-design.md),
검사 정의는 [TLS fixture 안내](./onvif-https-tls-fixture-harness-design.md)를 따릅니다.

## 지원과 신뢰 설정

`SendOnvifSoapHttp`는 HTTP SOAP transport와 OpenSSL 기반 HTTPS SOAP transport를 제공합니다.
`http://`는 암호화되지 않은 연결입니다. `https://`는 OpenSSL 빌드에서 인증서 검증
(certificate verification)과 호스트 이름 검증(hostname verification)을 거쳐 SOAP를 전송합니다.
OpenSSL이 없으면 `https transport requires OpenSSL support`로 실패합니다.

| 설정 | 현재 동작 |
| --- | --- |
| `MEDIA_SERVER_ONVIF_TLS_CA_FILE` 지정 | 지정한 CA 파일로 검증. fixture 전용 옵션이 아님 |
| 변수 미설정 또는 빈 값 | OpenSSL 기본 신뢰 경로 사용. macOS Keychain과 같다고 보장하지 않음 |
| CA 파일 로드 실패 | `TLS trust store load failed`로 종료. 기본 경로로 자동 우회하지 않음 |
| 인증서 또는 호스트 검증 실패 | 연결 실패. 임의 self-signed 인증서를 무조건 허용하지 않음 |

custom CA는 운영자가 신뢰할 근거가 있는 자료만 지정합니다.
HTTPS에서 HTTP로의 자동 downgrade, 검증 비활성화 또는 insecure TLS 옵션은 제공하지 않습니다.
SOAP HTTPS와 카메라 영상의 [RTSPS](./onvif-rtsps-draft-policy.md)는 서로 다른 연결입니다.

## 인증값과 진단

- endpoint URL에 username/password/token/cookie를 넣지 않습니다. 현재 parser는
  authority의 userinfo(`@`)를 `invalid endpoint URL`로 거부합니다.
  **모든 경로·query의 비밀을 자동 탐지·차단하는 기능은 아닙니다.**
- 기본 provider는 인증값을 제공하지 않습니다. 명시적으로 연결한 provider의 준비된
  `http_basic` material은 전송 요청의 Authorization 헤더에 사용될 수 있습니다.
  로그·artifact·공개 응답에 인증 헤더를 기록해도 된다는 뜻은 아닙니다.
  [인증값 정책](./onvif-credential-reference-policy.md)과 [인증 주입 계약](./onvif-auth-injection-design.md)을 따릅니다.
- Basic은 암호화 방식이 아닙니다. 실제 비밀을 암호화되지 않은 HTTP로 보내지 않습니다.
- TLS 실패 요약에는 endpoint/host/credential, certificate dump, private key, raw SOAP를 넣지 않습니다.
  공개 산출물은 [정제 기준](./onvif-field-smoke-artifact-redaction.md)을 적용합니다.

## 검증 경계

| 명령 | 검사하는 것 | 증명하지 않는 것 |
| --- | --- | --- |
| `verify-onvif-tls-transport-policy` | 정책과 현행 문서·코드·검사 연결의 정적 일치 | 실제 TLS 접속 |
| `verify-onvif-https-soap-transport-design` | C++ 계약·OpenSSL·오류 처리의 정적 연결 | 실제 TLS 접속 |
| `verify-onvif-https-tls-fixture` | 별도 Node loopback TLS client/server의 성공·실패·정제 | C++ transport 또는 실장비 성공 |
| `verify-onvif-http-transport` | C++ `SendOnvifSoapHttp`의 HTTP 및 OpenSSL HTTPS fixture | 실장비·영상 재생·제품 UI 성공 |

실행 시 명령 앞에 `./server.sh`를 붙입니다. 결과는 별도로 보존하며 정적 검사를 실제 접속
PASS로 바꾸지 않습니다. 실장비 HTTPS 성공은 미확인입니다.
`verify-onvif-field-http-probe`는 현재 **HTTP 전용**이므로 HTTPS 장비 검증 명령으로 안내하지 않습니다.
외부 접근은 별도 endpoint·권한·실행 승인과 [field 절차](./onvif-field-smoke-gate.md)가 필요합니다.
