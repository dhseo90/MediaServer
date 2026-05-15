# ONVIF Auth Injection Design

이 문서는 향후 ONVIF SOAP probe에 credential 주입을 추가할 때의 설계 기준을
고정합니다. v1.2.0 현재 구현은 credential reference와 redaction policy만
제공하며, WS-Security UsernameToken, HTTP Digest, HTTP Basic 인증 주입은
구현 완료가 아닙니다.

관련 기준:

- [ONVIF Credential Reference Policy](./onvif-credential-reference-policy.md)
- [ONVIF HTTPS SOAP Transport Design](./onvif-https-soap-transport-design.md)
- [ONVIF Protocol Support Matrix](./onvif-protocol-support-matrix.md)

## 현재 상태

- `credentialRef`는 secret 값이 아니라 운영자가 별도 보관하는 reference 존재
  여부를 나타내는 합성 fixture 표현입니다.
- field smoke와 draft API는 `credentialRefPresent=true/false` 같은 boolean
  summary만 남깁니다.
- ONVIF SOAP request에는 `Authorization`, `Cookie`, WS-Security UsernameToken을
  주입하지 않습니다.
- endpoint URL에 username, password, token을 넣는 방식은 금지합니다.
- 인증이 필요한 장비의 HTTP 401/403은 sanitized probe failure로 기록합니다.

## 향후 구현 조건

인증 주입을 추가하려면 별도 단계에서 아래 조건을 모두 만족해야 합니다.

1. secret 원문은 SourceRegistry, PublishedView, client/viewer API, field artifact,
   log에 저장하거나 출력하지 않습니다.
2. secret storage는 libsodium 등 동급 암호화 저장소 또는 외부 secret manager를
   사용합니다.
3. `credentialRef`는 secret lookup key로만 쓰며 API/UI 응답에는 실제 reference
   값도 redacted 처리합니다.
4. WS-Security UsernameToken, HTTP Digest, HTTP Basic 중 어떤 방식을 지원할지
   장비별 fallback 순서를 명시합니다.
5. 인증 header와 SOAP security header는 redaction matrix 대상에 포함합니다.
6. 실패 문구는 HTTP status, auth method, sanitized reason만 남기고 endpoint,
   username, realm, nonce, token, password를 남기지 않습니다.
7. Auth on 환경에서는 `source:write` scope 없이는 credential reference를 생성,
   수정, 삭제할 수 없습니다.
8. credential rotation, expiry, audit event는 secret 원문 없이 reference id와
   sanitized status만 기록합니다.
9. 실장비 성공 smoke는 credential 원문 없이 redacted artifact로만 공유합니다.

## 비범위

- URL credential
- plaintext credential 저장
- reversible credential을 SourceRegistry/PublishedView에 저장
- client/viewer API에 credential reference 노출
- raw SOAP request/response에 secret 포함 산출물 저장
- passwordless ONVIF probe 성공 처리

## 검증

현재 단계에서 실행할 검증:

```bash
./server.sh verify-onvif-auth-injection-design
./server.sh verify-onvif-credential-reference-policy
./server.sh verify-onvif-protocol-support-matrix
git diff --check
```
