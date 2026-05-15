# ONVIF No-Device Verification

이 문서는 ONVIF 실장비가 없는 환경에서 v1.2.0 ONVIF 현장 연동 범위를
검증하는 기준을 고정합니다. 이 모드는 실장비 제외 조건으로 진행하며,
실제 camera endpoint 성공은 검증 완료로 기록하지 않습니다.

관련 기준:

- [ONVIF Live Source Support](./onvif-live-source-support.md)
- [ONVIF Protocol Support Matrix](./onvif-protocol-support-matrix.md)
- [ONVIF Field Smoke Artifact Redaction Checklist](./onvif-field-smoke-artifact-redaction.md)
- [ONVIF TLS Transport Policy](./onvif-tls-transport-policy.md)
- [ONVIF Credential Reference Policy](./onvif-credential-reference-policy.md)

## 범위

실장비 제외 모드에서 확인하는 항목:

- synthetic fixture 기반 ONVIF live import contract
- synthetic fixture 기반 Device/Media/Media2 parser와 probe adapter 동작
- synthetic profile variant 기반 Media2 우선, Media fallback, Media-only, H265
  RTSP 선택 동작
- loopback HTTP SOAP transport smoke
- endpoint가 없는 환경의 명시 skip 동작
- closed loopback endpoint의 sanitized failure 동작
- closed loopback failure matrix의 endpoint/path/credential redaction 동작
- 현장 smoke 산출물 redaction 기준
- credential reference 원문 미저장 기준
- TLS endpoint fail-closed 정책
- SourceRegistry/PublishedView draft 매핑과 client redaction 계약

실장비 제외 모드에서 미확인으로 남기는 항목:

- 실장비 endpoint 성공
- 실제 camera 인증 handshake 성공
- 실제 camera Media/Media2 service 호환성
- 실제 camera `GetStreamUri`가 반환한 RTSP/RTSPS 재생 성공
- 현장 네트워크, 방화벽, NAT, DNS, TLS trust store 영향

## 실행 기준

실장비가 없으면 아래 검증만 사용합니다.

```bash
./server.sh verify-onvif-no-device-suite
./server.sh verify-onvif-no-device-mode
./server.sh verify-onvif-protocol-support-matrix
./server.sh verify-onvif-live-import-contract
./server.sh verify-onvif-probe-fixture-contract
./server.sh verify-onvif-probe-profile-variants
./server.sh verify-onvif-probe-parser
./server.sh verify-onvif-probe-adapter
./server.sh verify-onvif-http-transport
./server.sh verify-onvif-probe-error-wording
./server.sh verify-onvif-field-smoke-redaction
./server.sh verify-onvif-field-smoke-sample-bundle
./server.sh verify-onvif-field-http-probe --allow-missing-endpoint
./server.sh verify-onvif-field-http-probe --endpoint http://127.0.0.1:9/onvif/device_service --expect-failure --credential-ref-present
./server.sh verify-onvif-closed-loopback-failure-matrix
./server.sh verify-onvif-tls-transport-policy
./server.sh verify-onvif-credential-reference-policy
```

서버를 별도로 실행한 로컬 smoke에서는 아래 항목을 추가할 수 있습니다. 이 항목도
실장비 성공 검증이 아니라 fixture와 임시 registry 기반의 no-device 확인입니다.

```bash
./server.sh verify-onvif-probe-draft-api
./server.sh verify-onvif-import-draft-api
./server.sh verify-onvif-rtsp-downstream
./server.sh verify-onvif-ops-sources-ui
```

## 보고 기준

실장비 제외 모드 결과 보고에는 아래 문구를 구분해서 남깁니다.

```text
확인됨:
- verify-onvif-no-device-suite
- synthetic fixture/parser/adapter/transport/redaction 검증
- verify-onvif-field-http-probe --allow-missing-endpoint
- closed loopback endpoint --expect-failure sanitized failure
- verify-onvif-closed-loopback-failure-matrix
- SourceRegistry/PublishedView draft redaction 계약

미확인:
- 실장비 endpoint 성공
- 실제 camera 인증 및 Media/Media2 호환성
- 실제 camera RTSP/RTSPS 재생 성공
```

실장비 endpoint가 제공되기 전까지는 현장 성공 smoke를 통과로 표시하지 않습니다.
실장비가 준비되면 [ONVIF Live Source Support](./onvif-live-source-support.md)의
현장 수동 Smoke 절차로 별도 진행하고, endpoint/credential/raw SOAP는 공유
산출물에서 제거합니다.
