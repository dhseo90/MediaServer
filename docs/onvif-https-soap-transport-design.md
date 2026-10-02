# ONVIF HTTPS SOAP 구현 계약

독자: SOAP transport를 수정·검토하는 개발자.
현행 구현은 `src/ingress/onvif_live_import.cpp`이며 이 문서는 실행 결과가 아닌 기술 계약입니다.
운영 설정은 [TLS 정책](./onvif-tls-transport-policy.md),
인증값 선택은 [credential 정책](./onvif-credential-reference-policy.md)을 따릅니다.

## 입력과 처리 흐름

`SendOnvifSoapHttp`는 `http://`와 `https://` endpoint를 처리합니다.

1. `ParseHttpUrl`로 scheme·host·port·path를 분리합니다. authority에 userinfo가 있으면
   `invalid endpoint URL`로 거부합니다. 경로/query의 모든 token을 검사하는 parser는 아닙니다.
2. HTTP/HTTPS 이외 scheme 및 양수가 아닌 `timeout_ms`는 전송 전에 거부합니다.
3. HTTP는 socket 경로, HTTPS는 `MEDIA_SERVER_USE_OPENSSL` 빌드의 `SendOnvifSoapHttps`를 사용합니다.
   OpenSSL 미포함 빌드는 `https transport requires OpenSSL support`로 종료합니다.
4. HTTPS는 TCP 연결 후 `SSL_CTX_set_verify(..., SSL_VERIFY_PEER, ...)`로 certificate verification을 설정합니다.
   `MEDIA_SERVER_ONVIF_TLS_CA_FILE`이 있으면 `SSL_CTX_load_verify_locations`, 없으면
   `SSL_CTX_set_default_verify_paths`를 사용합니다. 지정 CA 로드 실패는 자동 fallback하지 않습니다.
5. `SSL_set1_host`로 hostname verification을 설정하고 `SSL_connect` 후 검증 결과를 확인합니다.
   성공한 연결로만 `BuildSoapHttpRequest`의 SOAP POST를 전송하고 응답을 파싱합니다.

HTTP로 자동 downgrade하거나 인증서/호스트 검증을 끄는 경로는 없습니다.
CA 선택과 공개 오류 정보의 기준은 위 TLS 정책이 단일 기준입니다.

## 실패와 비밀 경계

신뢰 경로 로드 실패는 `TLS trust store load failed`, 인증서 검증 실패는
`TLS certificate verification failed`, 그 외 handshake 실패는 `TLS handshake failed`처럼
고정 오류로 반환합니다. Node fixture와 C++ 오류 문구가 같다고 가정하지 않습니다.
endpoint, host, certificate dump, raw SOAP, 인증값을 오류·로그·artifact에 붙이지 않습니다.

기본 None provider는 비밀을 주지 않지만, 명시적인 준비 완료 provider의 `http_basic` material을
`ApplyCredentialMaterial`이 Authorization 헤더로 넣는 경로는 이미 있습니다.
따라서 인증 헤더 전송 자체 금지가 아니라 **허용된 전송과 공개/저장 비노출을 분리**해야 합니다.
허용 조건·미구현 인증 방식은 [인증 주입 계약](./onvif-auth-injection-design.md)을 봅니다.

## 검사와 반례

| 명령 | 대상과 정의 |
| --- | --- |
| `verify-onvif-https-soap-transport-design` | 문서·C++ TLS 함수·아래 smoke의 정적 연결 |
| `verify-onvif-tls-transport-policy` | 신뢰 설정·비노출·검증 경계의 정적 연결 |
| `verify-onvif-http-transport` | C++ trusted HTTPS 성공, untrusted CA, hostname mismatch, handshake failure, connection refused, URL userinfo·비밀번호 오류 비노출 |
| `verify-onvif-https-tls-fixture` | C++와 별도인 Node TLS client/server 검사. expired certificate도 포함 |

실행 시 `./server.sh <명령>`을 사용합니다. C++ 정의는
`scripts/internal/onvif_http_transport_smoke.cpp`의 `RunHttpsTransportSmoke`와
`RunHttpsTransportFailureMatrix`에 있습니다.
Node 정의는 [TLS fixture 안내](./onvif-https-tls-fixture-harness-design.md)로 분리합니다.
이 표는 과거 또는 현재 실행의 PASS 기록이 아닙니다.

Node의 만료 인증서 반례가 C++의 동일 반례 실행을 증명하지 않으며, 어느 fixture도
실장비 HTTPS 성공이나 영상 재생을 증명하지 않습니다.
지원 범위는 [프로토콜 표](./onvif-protocol-support-matrix.md),
외부 결과 정제는 [field 자료 기준](./onvif-field-smoke-artifact-redaction.md)을 따릅니다.
