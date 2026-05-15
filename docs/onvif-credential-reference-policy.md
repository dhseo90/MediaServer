# ONVIF Credential Reference Policy

이 문서는 v1.2.0 ONVIF field integration에서 credential reference를 다루는 기준을
고정합니다. 현재 구현은 credential 저장소가 아니라 live source 등록 draft와
redaction 검증을 제공하는 범위입니다.

## 현재 정책

- ONVIF credential 원문은 SourceRegistry, PublishedView, client/viewer API,
  field smoke artifact, 로그에 저장하거나 출력하지 않습니다.
- probe fixture의 `auth.credentialRef`는 실제 secret 값이 아니라 운영자가 별도로
  보관하는 reference가 존재한다는 합성 fixture 표현입니다.
- draft API 응답은 `auth.credentialRefPresent=true/false` 같은 boolean summary만
  반환합니다.
- `sourceDraft`, `publishedViewDraft`에는 credential field를 넣지 않습니다.
- endpoint URL에 username, password, token을 넣는 방식은 금지합니다.
- `verify-onvif-field-http-probe --credential-ref-present`는 reference 존재 여부만
  산출물에 남기며 인증 header나 secret을 주입하지 않습니다.
- credential이 필요한 실제 장비가 HTTP 401/403을 반환하면 현재 단계에서는
  sanitized probe failure로 기록합니다.

## 운영 저장 비범위

아래 항목은 현재 v1.2.0 ONVIF live source draft 범위에 포함하지 않습니다.

- secret manager 연동
- credential 암호화 저장
- ONVIF WS-Security UsernameToken 생성
- HTTP Digest/Basic 인증 주입
- credential rotation, expiry, audit event
- SourceRegistry origin metadata 안의 credential binding

## 향후 구현 조건

credential reference 저장/주입을 추가할 때는 별도 단계에서 아래 조건을 만족해야
합니다.

- credential 원문은 libsodium 등 동급 암호화 또는 외부 secret manager에만 보관합니다.
- SourceRegistry와 PublishedView에는 secret 원문, token, password hash, reversible
  credential을 넣지 않습니다.
- API/UI 응답은 reference 존재 여부와 sanitized status만 노출합니다.
- Auth on에서는 `source:write` scope 없이는 credential reference 변경을 막습니다.
- field smoke artifact와 screenshot에는 reference 실제 값도 남기지 않습니다.
- 실패 문구는 `verify-onvif-probe-error-wording`과 같은 redaction matrix로
  고정합니다.

## 검증

```bash
./server.sh verify-onvif-credential-reference-policy
./server.sh verify-onvif-probe-fixture-contract
./server.sh verify-onvif-probe-draft-api
./server.sh verify-onvif-field-smoke-redaction
git diff --check
```
