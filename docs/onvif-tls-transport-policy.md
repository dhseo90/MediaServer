# ONVIF TLS Transport Policy

이 문서는 v1.2.0 ONVIF probe의 HTTPS/TLS 처리 기준을 고정합니다. 현재 구현은
HTTP SOAP transport만 포함하며, TLS 연결 자체를 구현 완료로 보지 않습니다.
향후 HTTPS SOAP transport 설계 기준은
[ONVIF HTTPS SOAP Transport Design](./onvif-https-soap-transport-design.md)을
따릅니다.

## 현재 정책

- `http://` ONVIF Device service endpoint는 `SendOnvifSoapHttp`가 SOAP POST를
  수행합니다.
- `https://` endpoint는 현재 transport 계층에서 fail-closed 처리합니다.
- fail-closed summary는 endpoint, host, credential, raw SOAP를 포함하지 않습니다.
- `https://`를 자동으로 `http://`로 downgrade하지 않습니다.
- 인증서 검증 우회, hostname 검증 비활성화, custom CA 무시, insecure TLS opt-in은
  제공하지 않습니다.
- endpoint URL에는 username, password, token, cookie를 넣지 않습니다.
- field smoke 산출물에는 TLS 실패도 sanitized summary로만 기록합니다.

## 운영자 안내

- 실제 장비가 HTTPS만 제공하면 현재 v1.2.0 probe transport에서는 실패가 정상입니다.
- 같은 장비가 운영자가 통제하는 테스트 네트워크에서 HTTP Device service를 제공할 때만
  `verify-onvif-field-http-probe`를 사용합니다.
- HTTPS 장비 결과를 공유할 때도 endpoint 원문, certificate dump, credential,
  raw SOAP request/response는 산출물에서 제거합니다.

## 향후 TLS 구현 조건

TLS transport를 추가할 때는 아래 조건을 별도 단계로 만족해야 합니다.

- CA bundle 또는 trust store 선택 정책이 문서화되어야 합니다.
- hostname verification을 기본 활성화해야 합니다.
- 인증서 오류는 endpoint/host/certificate body를 노출하지 않는 sanitized wording으로
  고정해야 합니다.
- credential reference 정책과 결합하더라도 credential 원문을 HTTP header, URL,
  log, artifact에 남기지 않아야 합니다.
- `verify-onvif-http-transport`, `verify-onvif-probe-error-wording`,
  `verify-onvif-field-smoke-redaction`에 TLS redaction case를 추가해야 합니다.

## 검증

```bash
./server.sh verify-onvif-https-soap-transport-design
./server.sh verify-onvif-tls-transport-policy
./server.sh verify-onvif-http-transport
./server.sh verify-docs-links
git diff --check
```
