# ONVIF 인증 주입 설계

ONVIF SOAP probe 개발자가 현재 인증 주입 경계와 미구현 인증 방식의 확장 조건을 확인하는 문서입니다.
현재 구현은 기본 None provider와 명시적 provider가 제공한 HTTP Basic material뿐입니다.
제품 credential 입력·영속 저장·binding API를 제공한다는 뜻이 아닙니다.
입력·권한·공개 응답은 [인증정보 참조 정책](./onvif-credential-reference-policy.md),
provider와 저장소 선택은 [저장소 연동 설계](./onvif-credential-store-integration-design.md)가 기준입니다.

## 현재 요청 흐름

[RunOnvifProbeAdapter](../src/ingress/onvif_live_import.cpp)는 다음 순서로 동작합니다.

1. provider를 받지 않는 overload는 `NoneOnvifCredentialProvider()`를 사용합니다.
2. endpoint·timeout·transport를 확인하고, `credential_ref_present`와 `credential_ref`로
   `CredentialLookupRequest`를 만들어 provider의 `Lookup`을 한 번 호출합니다.
3. `ApplyCredentialMaterial`은 lookup이 `credential_ready`이고
   `secret_material_present=true`, scheme이 `http_basic`, username/password가 모두 비어 있지 않을 때만
   `Authorization` header를 추가합니다.
4. 같은 lookup 결과를 `GetServices`, `Media2.GetProfiles`/`Media.GetProfiles`,
   `Media2.GetStreamUri`/`Media.GetStreamUri` 요청에 적용합니다.
   요청은 원래 지정된 endpoint로 보내며, 장비가 반환한 별도 service 주소로 credential을 재전달하는 기능은 없습니다.
5. `OnvifProbeResult`는 `credential_ref_present`와 `plaintext_secret_included=false`를 유지합니다.
   lookup status·reference 값·secret material을 공개 결과에 복사하지 않습니다.

Basic header에는 실제 인증 material의 Base64 표현이 들어갑니다. Base64는 암호화나 redaction이 아니며,
fixture의 정제된 header 표기가 실제 전송값을 마스킹한다는 뜻도 아닙니다.
`SendOnvifSoapHttp`는 전달받은 header를 전송하며 별도 secret lookup을 하지 않습니다.
현재 주입 조건은 HTTPS만으로 제한하지 않습니다. HTTP/HTTPS 전송과 OpenSSL·인증서 검증 조건은
[HTTPS SOAP 전송 설계](./onvif-https-soap-transport-design.md)를 따르며,
실제 credential을 평문 HTTP 요청이나 공유 trace에 넣지 않습니다.

### 기본 경로와 오류

- None provider 또는 준비되지 않은 lookup에서는 인증값을 주입하지 않습니다.
  자동 Cookie, HTTP Digest 인증 주입, ONVIF WS-Security UsernameToken 생성은 없습니다.
- `credentialRef`만 있다고 인증하거나 401 challenge를 파싱·재시도하지 않습니다.
  `GetServices`의 HTTP 401/403은 HTTP status만 포함한 정제된 실패로 반환합니다.
  뒤의 profile/URI 요청이 실패하면 다른 후보를 확인할 수 있지만, 이는 인증 방식 fallback이 아닙니다.
- None provider가 probe 자체를 무조건 실패시키지는 않습니다. 인증이 필요 없는 endpoint에서 유효한
  Media/Media2 profile과 URI를 받으면 성공할 수 있습니다. 이를 credential 인증 성공의 증거로 쓰지 않습니다.
- 인증이 필요한 장비에 기본 비밀번호를 넣거나, 인증 실패를 성공으로 바꾸는 경로는 제공하지 않습니다.

`credentialRef`의 실제 C++ lookup key와 fixture의 합성 reference, 공개 `credentialRefPresent`는
서로 다릅니다. URL credential과 공개 reference·secret 노출 금지선은
[인증정보 참조 정책](./onvif-credential-reference-policy.md#참조와-비밀의-구분)에 모았습니다.

## 인증 방식별 구현·설계 경계

[인증 방식 fixture](../test/fixtures/onvif_auth_method_design_matrix.json)의 schema는
`media-server.onvif-auth-method-design-matrix.v1`입니다.
이 자료는 `design-fixture`이며 secret store, 실장비 captured trace, 제품 API 계약이 아닙니다.
`realDeviceEndpointSuccess=미확인`, `plaintextSecretIncluded=false`,
`rawSoapIncluded=false`, `persistentSecretStoreImplemented=false`를 유지합니다.

| method ID | 현재 상태 | 확장 전 필요한 조건 |
| --- | --- | --- |
| `http-basic-provider-material` | `implemented-provider-boundary`; 명시적 `http_basic` material 주입, challenge retry 없음 | 제품 영속 저장소 또는 외부 manager 선택, `source:write` binding guard, 정제된 현장 증거 |
| `http-digest-challenge-retry` | `design-only`; 요청 변경·challenge retry 미구현 | nonce/realm을 정제하는 challenge parser, timeout budget 안의 단일 retry 정책, Basic/WS-Security와의 fallback 순서 |
| `ws-security-username-token-text` | `design-only`; SOAP security header 미구현 | header builder, clock skew 처리, 장비별 fallback 순서 |
| `ws-security-password-digest` | `design-only`; PasswordDigest 생성 미구현 | nonce/Created 시각 정책, secret 수명을 제한한 digest builder, 장비별 fallback 순서 |

모든 방식에서 인증 header, reference와 username/password를 산출물에서 제거해야 합니다.
Digest의 realm/nonce/opaque/responseDigest와 WS-Security의 UsernameToken/PasswordDigest/Nonce/Created도
방식별 redaction 대상입니다. 상세 필드 목록은 위 fixture의 `redaction.mustRedact`가 기준입니다.
이 설계 식별자는 현재 `CredentialAuthScheme` enum에 Digest나 WS-Security가 구현됐다는 뜻이 아닙니다.

## 향후 제품 연동 조건

현재 Basic 경계를 제품 저장소와 연결하거나 새 인증 방식을 추가할 때는 다음 조건을 먼저 정의합니다.

1. SourceRegistry·PublishedView·client/viewer·로그·산출물의 secret 비저장·비노출을 유지합니다.
   암호화 저장소 또는 외부 manager, binding·rotation·expiry·audit의 기준은
   [저장소 연동 설계](./onvif-credential-store-integration-design.md#영속-저장소를-추가하기-전의-조건)를 따릅니다.
2. reference는 내부 lookup key로만 쓰며 공개 API/UI에는 실제 값을 노출하지 않습니다.
   binding 생성·교체·삭제에는 `source:write` guard가 필요합니다.
3. 장비별 인증 방식의 fallback 순서, retry 횟수·timeout budget과 실패 정책을 명시합니다.
4. 실패 요약에는 방식에 맞는 HTTP/SOAP status, auth method, sanitized reason만 허용합니다.
   endpoint·username·realm·nonce·token·password·provider path와 auth/SOAP header 원문은 남기지 않습니다.
5. header/SOAP security header redaction matrix와 실장비 credential smoke의 정제된 artifact를 확인합니다.
   fixture나 문서 검사만으로 실장비 인증 성공을 선언하지 않습니다.

## 검증 정의와 한계

정적 설계 검사는 method ID, 구현/설계 구분, redaction 목록과 source 연결을 확인합니다.
provider 검사는 내부 lookup 상태를, auth loopback은 실제 로컬 요청의 주입 여부를 확인합니다.

```bash
./server.sh verify-onvif-auth-injection-design
./server.sh verify-onvif-credential-reference-policy
./server.sh verify-onvif-auth-injection-loopback
./server.sh verify-onvif-protocol-support-matrix
```

[auth loopback smoke](../scripts/internal/onvif_auth_injection_loopback_smoke.cpp)는
None provider의 401 challenge 응답에서 인증값이 없는 요청과 정제된 실패를 확인합니다.
명시적 in-memory provider case는 Basic header 주입을 확인하지만, Device-only 응답 때문에
Media/Media2 부재로 끝나도록 설계돼 있습니다. 따라서 장비 인증·전체 probe 성공 검사가 아닙니다.
합성 fixture 값을 실제 credential로 교체하거나 원문 요청을 공유 산출물에 복사하지 않습니다.

위 명령은 검증 정의이며 이번 실행 결과가 아닙니다.
C++ 빌드·loopback·소유 임시 경로·cleanup 및 실행 승인 경계는
[무장비 검증](./onvif-no-device-verification.md)과 [검증 정책](./stream-verification.md#검증-정책)을 따릅니다.
전체 지원 범위는 [프로토콜 지원표](./onvif-protocol-support-matrix.md)를 참조합니다.
