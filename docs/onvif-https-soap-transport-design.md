# ONVIF HTTPS SOAP Transport Design

이 문서는 ONVIF `https://` Device service SOAP transport 구현 기준과 이번
no-device 검증 결과를 고정합니다. v1.2.0에서 도입되어 현재 유지되는 구현은 OpenSSL을 사용할 수 있는
빌드에서 HTTPS SOAP fixture transport를 지원합니다. 실장비 HTTPS endpoint 성공은
별도 field smoke 전까지 미확인으로 남깁니다.

관련 기준:

- [ONVIF TLS Transport Policy](./onvif-tls-transport-policy.md)
- [ONVIF HTTPS TLS Fixture Harness Design](./onvif-https-tls-fixture-harness-design.md)
- [ONVIF Protocol Support Matrix](./onvif-protocol-support-matrix.md)
- [ONVIF Credential Reference Policy](./onvif-credential-reference-policy.md)
- [ONVIF Field Smoke Artifact Redaction Checklist](./onvif-field-smoke-artifact-redaction.md)

## 현재 상태

- `http://` ONVIF Device service endpoint는 기존 socket 기반 SOAP POST를
  유지합니다.
- `https://` ONVIF Device service endpoint는 OpenSSL 빌드에서 TLS handshake,
  certificate verification, hostname verification 후 SOAP POST를 수행합니다.
- OpenSSL이 없는 빌드는 `https transport requires OpenSSL support`로
  fail-closed하며 endpoint, host, credential, raw SOAP를 출력하지 않습니다.
- `MEDIA_SERVER_ONVIF_TLS_CA_FILE`을 지정하면 fixture CA bundle을 사용하고,
  지정하지 않으면 OS/OpenSSL 기본 trust store를 사용합니다.
- endpoint URL username/password/token은 `invalid endpoint URL`로 거부합니다.
- `https://`를 `http://`로 자동 downgrade하지 않습니다.
- `verify-onvif-https-tls-fixture`는 loopback fixture-only HTTPS 성공과 TLS failure
  redaction을 검증합니다.
- `verify-onvif-http-transport`는 production `SendOnvifSoapHttp`의 HTTPS fixture
  성공과 untrusted CA failure, hostname mismatch failure, handshake failure,
  connection refused, URL userinfo redaction을 검증합니다.
- 실장비 HTTPS endpoint 성공은 별도 field smoke 전까지 미확인으로 남깁니다.

## 구현 결과

이번 단계의 결과:

- `SendOnvifSoapHttp`는 `http://`와 `https://` scheme을 모두 허용합니다.
- OpenSSL 빌드에서 `https://localhost:<port>/onvif/device_service` fixture server에
  trusted CA bundle로 연결하고 SOAP 응답을 파싱합니다.
- TLS certificate verification과 hostname verification은 기본 활성화합니다.
- URL userinfo가 포함된 `HTTPS://user:pass@...` endpoint는 sanitized wording으로
  실패하며, username/password/host/SOAP action을 error에 노출하지 않습니다.
- production HTTPS transport failure matrix는 untrusted CA, hostname mismatch,
  handshake failure, connection refused를 sanitized wording으로 고정합니다.
- `https://`를 `http://`로 자동 downgrade하지 않습니다.
- OpenSSL이 없는 빌드는 HTTPS를 명확히 미지원으로 닫고 HTTP transport는 유지합니다.

## 유지 조건

HTTPS SOAP transport는 아래 조건을 계속 만족해야 합니다.

1. TLS trust store 선택 기준을 문서화합니다.
2. hostname verification은 기본 활성화하며 opt-out을 제공하지 않습니다.
3. certificate verification failure는 sanitized summary로만 노출합니다.
4. HTTP downgrade fallback을 자동 수행하지 않습니다.
5. endpoint URL username/password/token은 계속 금지합니다.
6. credential reference 정책과 결합하더라도 secret 원문은 header, log, artifact에
   남기지 않습니다.
7. timeout, connection refused, handshake failure, certificate failure를
   redaction matrix에 유지합니다.
8. field smoke artifact에는 endpoint, host, certificate dump, raw SOAP를 넣지
   않습니다.
9. fixture-only 성공과 실장비 성공을 보고에서 분리합니다.
10. no-device TLS fixture harness는
    [ONVIF HTTPS TLS Fixture Harness Design](./onvif-https-tls-fixture-harness-design.md)의
    ephemeral CA, hostname verification, trusted fixture success, untrusted CA
    failure, hostname mismatch failure, certificate expired failure, handshake
    failure case를 계속 만족해야 합니다.

## 비범위

- insecure TLS opt-in
- hostname verification 비활성화
- self-signed certificate 무조건 허용
- `https://`를 `http://`로 자동 downgrade
- TLS certificate dump 저장
- credential 원문 주입 또는 URL credential

## 검증

현재 단계에서 실행할 검증:

```bash
./server.sh build
./server.sh verify-onvif-https-soap-transport-design
./server.sh verify-onvif-https-tls-fixture
./server.sh verify-onvif-tls-transport-policy
./server.sh verify-onvif-protocol-support-matrix
./server.sh verify-onvif-http-transport
git diff --check
```
