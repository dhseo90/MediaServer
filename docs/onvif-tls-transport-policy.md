# ONVIF TLS Transport Policy

이 문서는 v1.2.0 ONVIF probe의 HTTPS/TLS 처리 기준을 고정합니다. 현재 구현은
HTTP SOAP transport와 OpenSSL 기반 HTTPS SOAP fixture transport를 포함합니다.
HTTPS SOAP transport 기준은
[ONVIF HTTPS SOAP Transport Design](./onvif-https-soap-transport-design.md)을
따르며, no-device TLS fixture harness 기준은
[ONVIF HTTPS TLS Fixture Harness Design](./onvif-https-tls-fixture-harness-design.md)에
분리합니다.

## 현재 정책

- `http://` ONVIF Device service endpoint는 `SendOnvifSoapHttp`가 SOAP POST를
  수행합니다.
- `https://` endpoint는 OpenSSL 빌드에서 TCP connect, TLS handshake,
  certificate verification, hostname verification 후 SOAP POST를 수행합니다.
- OpenSSL이 없는 빌드는 `https transport requires OpenSSL support`로 fail-closed
  처리합니다.
- TLS failure summary는 endpoint, host, credential, raw SOAP를 포함하지 않습니다.
- `https://`를 자동으로 `http://`로 downgrade하지 않습니다.
- 인증서 검증 우회, hostname 검증 비활성화, custom CA 무시, insecure TLS opt-in은
  제공하지 않습니다.
- endpoint URL에는 username, password, token, cookie를 넣지 않습니다.
- field smoke 산출물에는 TLS 실패도 sanitized summary로만 기록합니다.
- v1.2.0에서 도입되어 현재 유지되는 기준은 fixture-only TLS harness와 production transport fixture success 및
  production transport failure matrix를 실행합니다.
- `verify-onvif-https-tls-fixture`은 fixture TLS server/client 실행으로 trusted success,
  untrusted CA, hostname mismatch, certificate expired, handshake failure,
  connection refused의 sanitized failure를 확인합니다.
- `verify-onvif-http-transport`는 production `SendOnvifSoapHttp`의 HTTPS fixture
  success, untrusted CA failure, hostname mismatch failure, handshake failure,
  connection refused, URL userinfo redaction을 확인합니다.

## 운영자 안내

- 실제 장비가 HTTPS만 제공하면 OpenSSL 빌드에서 probe transport를 시도할 수 있지만,
  실장비 성공은 별도 field smoke 전까지 미확인입니다.
- 운영자가 통제하는 테스트 네트워크에서만 `verify-onvif-field-http-probe`를
  사용합니다.
- HTTPS 장비 결과를 공유할 때도 endpoint 원문, certificate dump, credential,
  raw SOAP request/response는 산출물에서 제거합니다.

## TLS 유지 조건

TLS transport는 아래 조건을 계속 만족해야 합니다.

- CA bundle 또는 trust store 선택 정책이 문서화되어야 합니다.
- hostname verification을 기본 활성화해야 합니다.
- 인증서 오류는 endpoint/host/certificate body를 노출하지 않는 sanitized wording으로
  고정해야 합니다.
- credential reference 정책과 결합하더라도 credential 원문을 HTTP header, URL,
  log, artifact에 남기지 않아야 합니다.
- explicit TLS fixture harness는 ephemeral CA, fixture CA bundle, hostname
  verification, trusted fixture success, untrusted CA failure, hostname mismatch
  failure, certificate expired failure, handshake failure를 검증해야 합니다.
- `verify-onvif-http-transport`는 production transport에서 untrusted CA,
  hostname mismatch, handshake failure, connection refused redaction case를
  유지해야 합니다.
- `verify-onvif-probe-error-wording`, `verify-onvif-field-smoke-redaction`에도 TLS
  redaction case를 유지해야 합니다.

## 검증

```bash
./server.sh verify-onvif-https-soap-transport-design
./server.sh verify-onvif-https-tls-fixture
./server.sh verify-onvif-tls-transport-policy
./server.sh verify-onvif-http-transport
./server.sh verify-docs-links
git diff --check
```
