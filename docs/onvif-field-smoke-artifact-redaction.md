# ONVIF Field Smoke Artifact Redaction Checklist

이 문서는 실제 ONVIF 카메라로 수동 smoke를 수행한 뒤 공유 가능한 산출물과
반드시 제거해야 하는 값을 구분합니다. 산출물은 live source 등록 검증을
재현하기 위한 참고 자료이며, 제품 API contract나 장비 인증 정보를 대체하지
않습니다.

## 공유 가능 산출물

- Redacted probe fixture: `test/fixtures/onvif_probe_result_stub.json` 구조를
  따르되 실제 장비 host, credential, raw SOAP는 제외합니다.
- Draft API 결과 요약: `sourceDraft`, `publishedViewDraft`, `selectedProfile`,
  `auth.credentialRefPresent`, `auth.plaintextSecretIncluded=false`만 남깁니다.
- Field smoke report template: `realDeviceTestPerformed`,
  `realDeviceEndpointSuccess`, required verification status, evidence index만
  redacted placeholder로 남깁니다.
- Ops 확인 요약: `/ops/sources` 채널 표시, Live/VA URL copy parity,
  `/ops/rules` ONVIF RTSP/WHEP/WebRTC copy parity 결과.
- Client redaction 증거: `/client/api/views`, `/client/api/views/{viewId}`에서
  source locator, ONVIF endpoint, credential reference, raw diagnostic JSON이
  없다는 pass/fail 요약.
- Screenshot: client/viewer 화면에 source URL, ONVIF endpoint, raw diagnostic
  JSON, credential 관련 값이 보이지 않는 화면만 첨부합니다.

## 금지 값

다음 값은 로그, Markdown, screenshot, fixture, zip/tar artifact에 남기지 않습니다.

- 실제 camera IP, hostname, FQDN, MAC address, serial number 원문
- ONVIF Device service endpoint 원문과 query string
- RTSP/RTHS/live URI 원문, WHEP/HLS origin URL 원문
- username, password, token, cookie, Authorization header
- credentialRef 실제 값 또는 secret store key 원문
- raw SOAP request/response, XML body dump, raw diagnostic JSON
- 개인/고객 장소명, 설치 위치, 계정명, 운영자 이름

## Artifact Checklist

- [ ] 산출물에는 `<redacted-host>`, `<redacted-source-id>`, `<redacted-token>` 같은
  placeholder만 남겼다.
- [ ] `auth` 요약은 `credentialRef present`, `plaintext omitted` 수준으로만 썼다.
- [ ] raw SOAP, HTTP header, cookie, Authorization, request/response body dump를
  제거했다.
- [ ] `sourceDraft`에는 저장 가능한 source field만 남기고 origin metadata를
  별도 보류로 표시했다.
- [ ] `publishedViewDraft`에는 source locator, ONVIF endpoint, credential 관련
  field가 없음을 확인했다.
- [ ] `/client/api/views`와 `/client/api/views/{viewId}` redaction pass/fail을
  기록했다.
- [ ] `/ops/sources` Live/VA URL copy와 `/ops/rules` copy parity 결과를
  pass/fail로 기록했다.
- [ ] screenshot은 client/viewer에 source URL, ONVIF endpoint, raw diagnostic
  JSON이 보이지 않는 화면만 포함했다.
- [ ] 실패 문구는 `verify-onvif-probe-error-wording` matrix의 sanitized summary
  형태로만 남겼다.
- [ ] 실장비가 없거나 실행하지 않은 경우 `realDeviceEndpointSuccess=unverified`,
  `realDeviceTestPerformed=false`, skip reason을 명시했다.
- [ ] `verificationStatus`에는 각 필수 검증 명령의 pass/fail/skipped 상태를
  누락 없이 기록했다.
- [ ] `evidenceIndex`는 redacted summary, checklist, screenshot 같은 공유 가능
  파일만 가리킨다.
- [ ] 산출물 파일명과 directory 이름에도 실제 장비 host, site, 계정명을 쓰지 않았다.
- [ ] 공유 전 `verify-onvif-probe-fixture-contract`,
  `verify-onvif-probe-error-wording`, `verify-onvif-probe-draft-api`,
  `verify-onvif-ops-sources-ui`, `verify-docs-links` 결과를 함께 기록했다.

## 기록 템플릿

```text
artifact: onvif-field-smoke-<date>-<redacted-site>
camera: <vendor/model redacted>
endpoint: <redacted-host>/onvif/device_service
auth: credentialRef present, plaintext omitted
services: Device=<yes/no>, Media=<yes/no>, Media2=<yes/no>
selectedProfile: token=<redacted-token>, api=<Media|Media2>, encoding=<H264|H265>,
  size=<width>x<height>, fps=<n>, transport=RTSP
draft: sourceId=<redacted-source-id>, viewId=<redacted-view-id>, tags=onvif/live
clientRedaction: pass/fail
opsCopyParity: pass/fail
probeErrorWording: pass/fail
realDeviceTestPerformed: true/false
realDeviceEndpointSuccess: pass/fail/unverified
verificationStatus: <command>=<pass/fail/skipped>
evidenceIndex: <redacted file list>
notes: <sanitized operational note>
```

## 검증 명령

```bash
./server.sh verify-onvif-field-smoke-redaction
./server.sh verify-onvif-field-smoke-sample-bundle
./server.sh verify-onvif-probe-fixture-contract
./server.sh verify-onvif-probe-error-wording
./server.sh verify-docs-links
git diff --check
```

샘플 bundle layout과 report template은
`test/fixtures/onvif_field_smoke_artifact_sample/`에 둡니다. 실제 현장 산출물은
해당 layout을 참고하되, 공유 전 이 문서의 checklist를 다시 적용합니다.
