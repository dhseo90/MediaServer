# ONVIF HTTPS TLS Fixture Harness Design

이 문서는 ONVIF `https://` Device service SOAP transport의 no-device TLS fixture
harness 기준을 고정합니다. v1.2.0에서 도입된 현재 상태는 fixture-only 검증이며, 실장비 HTTPS
endpoint 성공으로 보지 않습니다.

관련 기준:

- [ONVIF HTTPS SOAP Transport Design](./onvif-https-soap-transport-design.md)
- [ONVIF TLS Transport Policy](./onvif-tls-transport-policy.md)
- [ONVIF Protocol Support Matrix](./onvif-protocol-support-matrix.md)
- [ONVIF Field Smoke Artifact Redaction Checklist](./onvif-field-smoke-artifact-redaction.md)

## 현재 경계

- v1.2.0에서 도입되어 현재 유지되는 구현은 loopback fixture TLS server/client를 실행해
  trustedFixtureSuccess와 TLS failure redaction을 검증합니다.
- production `SendOnvifSoapHttp`의 HTTPS fixture success는
  `verify-onvif-http-transport`에서 OpenSSL 빌드 기준으로 검증합니다.
- harness 결과는 fixture-only HTTPS 성공이며, 실장비 HTTPS 성공의 대체 증거가
  아닙니다.
- 실장비가 없는 환경에서는 HTTPS real-device success를 계속 미확인으로 보고합니다.

## Fixture Command

현재 fixture-only 명령:

```bash
./server.sh verify-onvif-https-tls-fixture
```

이 명령은 ephemeral CA와 loopback HTTPS fixture server를 실행합니다.
`trustedFixtureSuccess`는 true, `realDeviceEndpointSuccess`는 미확인으로 보고합니다.
production `SendOnvifSoapHttp`의 HTTPS fixture success는
`verify-onvif-http-transport`에서 별도로 확인합니다.

## Harness 구성

fixture-only harness는 아래 구성만 허용합니다.

1. loopback 전용 synthetic ONVIF SOAP fixture server를 띄웁니다.
2. ephemeral CA와 server certificate를 테스트 실행 중 생성합니다.
3. server private key는 repository와 artifact에 저장하지 않습니다.
4. transport under test에는 fixture CA bundle을 명시적으로 전달합니다.
5. hostname verification은 기본 활성화하며 fixture hostname/SAN과 일치해야 합니다.
6. HTTP downgrade fallback은 수행하지 않습니다.
7. endpoint URL userinfo, credential 원문, raw SOAP body는 입력/출력 artifact에 남기지
   않습니다.

## Fixture Case

현재 `verify-onvif-https-tls-fixture` 명령은 아래 case를 포함해야 합니다.

| Case | 기대 결과 | Redaction 기준 |
| --- | --- | --- |
| trusted fixture success | HTTPS SOAP request/response 성공 | summary에는 endpoint, host, certificate dump, raw SOAP를 쓰지 않음 |
| untrusted CA failure | sanitized certificate failure | CA subject, host, endpoint 원문을 쓰지 않음 |
| hostname mismatch failure | sanitized hostname verification failure | 실제 host/SAN 값을 쓰지 않음 |
| certificate expired failure | sanitized certificate failure | certificate body를 쓰지 않음 |
| handshake failure | sanitized handshake failure | TLS transcript, endpoint를 쓰지 않음 |
| connection refused | sanitized network failure | endpoint, host를 쓰지 않음 |

## Summary JSON

fixture harness가 JSON summary를 남기는 경우 schema는 별도 버전으로 분리합니다.

```json
{
  "schema": "media-server.onvif-https-tls-fixture-summary.v1",
  "mode": "fixture-only",
  "realDeviceEndpointSuccess": "미확인",
  "trustedFixtureSuccess": true,
  "redactionVerified": true
}
```

금지 항목:

- endpoint 원문
- host/IP 원문
- certificate dump
- private key
- raw SOAP request/response
- credential 원문 또는 credential URL userinfo

## 완료 조건

HTTPS TLS transport를 구현 완료로 보고하려면 별도 단계에서 아래를 모두 통과해야
합니다.

1. production HTTPS transport가 OpenSSL 빌드에서 계속 활성화되어야 합니다.
2. fixture CA bundle 전달 경로와 hostname verification이 테스트로 고정되어야 합니다.
3. trusted fixture success, untrusted CA failure, hostname mismatch failure,
   certificate expired failure, handshake failure, timeout/refused failure를 모두
   검증해야 합니다.
4. `verify-onvif-https-soap-transport-design`,
   `verify-onvif-tls-transport-policy`, `verify-onvif-protocol-support-matrix`와 함께
   fixture harness 검증 명령이 no-device suite에 포함되어야 합니다.
5. 실장비 성공은 별도 field smoke 증거가 없는 한 계속 미확인으로 보고해야 합니다.

## 비범위

- 현재 단계에서 HTTPS SOAP transport 구현
- hostname verification 비활성화
- real device HTTPS 성공으로 간주
- hostname verification opt-out
- HTTP downgrade fallback
