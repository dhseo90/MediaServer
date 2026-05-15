# ONVIF HTTPS SOAP Transport Design

이 문서는 향후 ONVIF `https://` Device service SOAP transport를 추가할 때 지켜야
할 설계 기준입니다. v1.2.0 현재 구현은 HTTPS SOAP transport를 구현 완료로 보지
않으며, `https://` ONVIF endpoint는 fail-closed가 정상 동작입니다.

관련 기준:

- [ONVIF TLS Transport Policy](./onvif-tls-transport-policy.md)
- [ONVIF Protocol Support Matrix](./onvif-protocol-support-matrix.md)
- [ONVIF Credential Reference Policy](./onvif-credential-reference-policy.md)
- [ONVIF Field Smoke Artifact Redaction Checklist](./onvif-field-smoke-artifact-redaction.md)

## 현재 상태

- `http://` ONVIF Device service endpoint만 `SendOnvifSoapHttp` transport smoke
  대상으로 둡니다.
- `https://` ONVIF Device service endpoint는 자동 downgrade 없이 fail-closed입니다.
- fail-closed error summary는 endpoint, host, certificate body, credential,
  raw SOAP를 출력하지 않습니다.
- 실장비가 없는 환경에서는 HTTPS 성공을 미확인으로 남깁니다.

## 향후 구현 조건

HTTPS SOAP transport를 추가하려면 별도 단계에서 아래 조건을 모두 만족해야 합니다.

1. TLS trust store 선택 기준을 문서화합니다.
2. hostname verification은 기본 활성화하며 opt-out을 제공하지 않습니다.
3. certificate verification failure는 sanitized summary로만 노출합니다.
4. HTTP downgrade fallback을 자동 수행하지 않습니다.
5. endpoint URL username/password/token은 계속 금지합니다.
6. credential reference 정책과 결합하더라도 secret 원문은 header, log, artifact에
   남기지 않습니다.
7. timeout, connection refused, handshake failure, certificate failure를
   redaction matrix에 추가합니다.
8. field smoke artifact에는 endpoint, host, certificate dump, raw SOAP를 넣지
   않습니다.
9. 성공 smoke는 실장비 또는 explicit TLS fixture harness에서만 완료로 보고합니다.

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
./server.sh verify-onvif-https-soap-transport-design
./server.sh verify-onvif-tls-transport-policy
./server.sh verify-onvif-protocol-support-matrix
git diff --check
```
