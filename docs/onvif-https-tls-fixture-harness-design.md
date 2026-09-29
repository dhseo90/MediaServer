# ONVIF TLS fixture 검사 안내

독자: 실장비 없이 TLS 오류·정제를 확인하는 검증 유지보수자.
현행 실행 도구는 `scripts/internal/verify_onvif_https_tls_fixture.mjs`입니다.
이 문서는 테스트 정의이며 실행 결과 원장이 아닙니다.

## 두 전송 경로의 구분

```bash
./server.sh verify-onvif-https-tls-fixture
```

위 명령은 **Node의 HTTPS client/server**로 검사합니다. C++ `SendOnvifSoapHttp`를 호출하지 않으며
C++ 검사는 `verify-onvif-http-transport`로 별도 실행합니다.
[HTTPS 계약](./onvif-https-soap-transport-design.md), [TLS 정책](./onvif-tls-transport-policy.md),
[지원 범위](./onvif-protocol-support-matrix.md)를 함께 봅니다.
어느 검사도 실장비 HTTPS 성공의 대체 증거가 아닙니다.

## 준비와 수명

- Node와 필요한 인증서 생성 옵션을 지원하는 `openssl`이 필요합니다. 명령/옵션 미지원은
  준비 실패이며 검사 생략이나 제품 TLS 회귀로 바꾸지 않습니다.
- 도구는 `os.tmpdir()` 아래 `media_server_onvif_tls_fixture-` 실행 전용 디렉터리에
  ephemeral CA·인증서·server private key를 생성합니다. private key를 저장소·공개 artifact에 보존하지 않습니다.
- fixture CA bundle은 Node 요청의 `ca`로 전달합니다. 제품의
  `MEDIA_SERVER_ONVIF_TLS_CA_FILE`을 설정하거나 사용하는 검사는 아닙니다.
- server는 `127.0.0.1`의 임시 포트에만 바인딩합니다. connection refused 반례는
  loopback 포트 9를 사용하므로 다른 프로세스가 점유하면 결과를 점검해야 합니다.
- hostname verification과 `rejectUnauthorized: true`를 유지합니다. HTTP downgrade는 없습니다.
- 각 서버는 `finally`에서 닫고 handshake 반례의 socket도 파괴합니다.
  최상위 `finally`는 실행 전용 디렉터리를 제거합니다.
  강제 종료 후에는 소유권을 확인한 잔여물만 정리합니다.

## 반례와 기대값

| 검사 | 실제 대상 | 기대값 |
| --- | --- | --- |
| trusted fixture success | 신뢰 CA와 hostname이 맞는 요청 | HTTP 200·SOAPAction/GetServices·요청/응답 본문 구조 |
| untrusted CA failure | CA를 주지 않은 요청 | `certificate verification failed` |
| hostname mismatch failure | 인증서와 다른 servername | `hostname verification failed` |
| certificate expired failure | 만료일이 고정된 합성 인증서 | `certificate expired` |
| handshake failure | TLS 요청을 plain TCP server로 전송 | `TLS handshake failed` |
| connection refused | loopback의 닫힌 포트 요청 | `network failure` |

실패 반례는 실제 요청이 실패하고 정제 오류가 일치해야 통과합니다. 원문 endpoint·host/IP,
certificate dump·private key·credential·raw SOAP는 공개 요약에 넣지 않습니다.
정제 기준은 [field 자료 정책](./onvif-field-smoke-artifact-redaction.md)에 연결합니다.

## 출력과 판정

현행 CLI는 stdout의 개별 `[pass]`와 아래 summary를 출력합니다.
별도 JSON schema나 `--json-output` 옵션은 구현되어 있지 않습니다.

| stdout 필드 | 모든 검사가 실제 통과했을 때 값 |
| --- | --- |
| `mode` | fixture-only |
| `trustedFixtureSuccess` | true |
| `redactionVerified` | true |
| `productionHttpsTransport` | verified by verify-onvif-http-transport |
| `realDeviceEndpointSuccess` | 미확인 |
| `failures` | 0 |

`productionHttpsTransport` 문자열은 별도 검사 명령을 가리키는 기존 출력이며,
이번 Node 명령이 그 검사를 실행했다는 뜻이 아닙니다. C++ 실행·exit·결과가 없으면 미실행입니다.
assertion/준비 실패 시 종료는 실패이고 성공 summary까지 도달하지 않습니다.
stdout/stderr·exit·source·최초 실패/재검증·cleanup은 해당 실행 자료에 함께 보존합니다.
문서 preflight나 summary 형식 검사만 통과한 결과는 실제 TLS PASS가 아닙니다.
