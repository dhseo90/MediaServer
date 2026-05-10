# ONVIF Live Source Import

이 문서는 v1.1.0-alpha.2의 ONVIF live source import 설계를 고정합니다.
목표는 ONVIF camera를 찾아 live RTSP source로 등록하는 onboarding 흐름입니다.
ONVIF conformant server, recorder, replay, Profile G scope는 포함하지 않습니다.

관련 기준:

- [v1.1.0 Roadmap](./v1.1.0-roadmap.md)
- [Media Server Architecture](./media-server-architecture.md)
- [Config Reference](./config-reference.md)

## 범위

포함:

- ONVIF discovery 후보 수집
- device information과 capabilities 조회
- Media/Media2 profile 조회
- live RTSP stream URI 추출
- stream URI를 기존 SourceRegistry의 `kind=rtsp` source draft로 변환
- PublishedView와 `vaRule` 연결 흐름 유지
- credential/plaintext secret 노출 금지

비범위:

- ONVIF server conformance
- ONVIF Profile G recording/replay
- camera recording configuration
- edge storage 조회
- playback/replay URL import
- PTZ control 1차 구현
- SourceRegistry/PublishedView 저장 payload 변경

## Import Flow

```text
Operator
  -> ONVIF probe/import UI or API draft
  -> discovery candidate
  -> device information/capabilities
  -> Media/Media2 profiles
  -> live stream URI
  -> SourceRegistry RTSP source draft
  -> PublishedView binding
```

1. Discovery 단계는 device endpoint와 기본 식별 정보만 표시합니다.
2. Credential이 필요한 장비는 operator가 입력하되, UI/API 응답에 원문 secret을
   다시 표시하지 않습니다.
3. Media profile 조회는 live streaming profile만 후보로 둡니다.
4. 선택된 profile의 stream URI가 RTSP이면 기존 `kind=rtsp` SourceRegistry
   draft로 변환합니다.
5. 저장 후 client 노출은 기존 PublishedView 정책과 scope를 그대로 사용합니다.

## Draft Data Model

이 단계의 fixture는 내부 import draft contract를 고정하기 위한 설계/검증용입니다.
제품 API schema나 registry schema를 추가하지 않습니다.

ONVIF candidate draft:

- `endpoint`: ONVIF device service endpoint
- `manufacturer`, `model`, `firmwareVersion`, `serialNumber`
- `profiles[]`: Media/Media2 profile 후보
- `profiles[].token`, `name`, `encoding`, `resolution`, `fps`
- `profiles[].streamUri`: live RTSP stream URI
- `auth.required`: credential 필요 여부
- `importDecision`: operator가 선택한 profile과 registry draft 예상값

SourceRegistry 저장 예상값:

- `sourceId`: operator가 정한 source id
- `displayName`: 운영자용 채널 이름
- `kind`: `rtsp`
- `rtspUrl`: 선택된 ONVIF profile의 live stream URI
- `tags`: `onvif`, `live`, profile 방향 등 운영 추적용 tag
- `ownerGroup`: 기존 source ownership 정책 사용

ONVIF origin metadata는 1단계에서 registry schema에 넣지 않습니다. 필요한 최소
필드는 별도 SourceRegistry origin metadata 설계 단계에서 검토합니다.

## Import Draft Contract

v1.1.0-alpha.2의 첫 구현 단위는 실제 camera 연결이 아니라 ONVIF 응답을 기존
운영 source/view 저장 payload로 바꾸는 내부 계약을 고정하는 것입니다.

입력 contract:

- `device.endpoint`는 discovery 또는 수동 입력으로 얻은 ONVIF device service
  endpoint입니다.
- `device.manufacturer`, `model`, `firmwareVersion`, `serialNumber`는 operator
  후보 표시와 진단용입니다.
- `profiles[]`는 Media/Media2 profile 후보이며, `token`, `name`, `mediaApi`,
  `encoding`, `width`, `height`, `fps`, `transport`, `streamUri`를 포함합니다.
- `importDecision.selectedProfileToken`은 선택된 profile token입니다.
- 인증 관련 입력은 `auth.required`와 `auth.credentialRef` 같은 reference만
  남기며 원문 secret은 포함하지 않습니다.

출력 contract:

- `expectedSourceDraft`는 기존 `/ops/api/sources` 저장 payload만 사용합니다.
- `expectedSourceDraft.kind`는 `rtsp`입니다.
- `expectedSourceDraft.rtspUrl`은 선택된 profile의 `streamUri`와 같습니다.
- `expectedSourceDraft.tags`에는 최소 `onvif`, `live`가 포함됩니다.
- `expectedSourceDraft`에는 `origin`, `endpoint`, `credentialRef`, `auth`,
  `profiles`, raw SOAP 응답, password/token 원문을 넣지 않습니다.
- `expectedPublishedViewDraft`는 기존 `/ops/api/views` 저장 payload만 사용합니다.
- `expectedPublishedViewDraft.sourceId`는 `expectedSourceDraft.sourceId`와 같습니다.
- `expectedPublishedViewDraft`에는 RTSP URL, ONVIF endpoint, credential reference,
  raw diagnostic JSON을 넣지 않습니다.

검증 contract:

- 카메라가 없어도 `test/fixtures/onvif_live_import_stub.json`으로 import draft
  변환 계약을 검증합니다.
- 공개 RTSP URL 검증은 ONVIF discovery/SOAP 검증이 아니라 import 이후 media path
  검증으로 분리합니다.
- local virtual ONVIF device는 선택 검증으로 두고, 기본 smoke는 fixture 기반으로
  유지합니다.

## ONVIF Origin Metadata Draft

이 초안은 v1.1.0 구현 후보의 최소 필드 설계입니다. 현재 코드의
SourceRegistry payload에는 아직 포함하지 않으며, 구현 단계에서 별도 schema
review와 migration 판단을 거칩니다.

목적:

- ONVIF로 import된 source와 수동 RTSP source를 operator가 구분
- stream URI 재조회, credential 재입력, source health 진단 시 원래 device
  후보를 추적
- client/viewer API에는 origin metadata를 노출하지 않고 sanitized 상태만 제공

제안 필드:

```json
{
  "origin": {
    "type": "onvif",
    "endpoint": "http://192.0.2.10/onvif/device_service",
    "manufacturer": "ExampleCam",
    "model": "EC-LiveT-200",
    "profile": "T",
    "mediaProfileToken": "profile-live-main",
    "mediaApi": "Media2",
    "streamUriImportedAt": "fixture-time",
    "credentialRef": "operator-entered-secret",
    "credentialInline": false
  }
}
```

최소 필드 의미:

- `type`: `onvif`만 허용하는 origin discriminator
- `endpoint`: device service endpoint. client API에는 반환하지 않음
- `manufacturer`, `model`: 운영자 표시와 진단용 식별 정보
- `profile`: `T`, `S`, `M-candidate` 같은 운영 추적용 profile 방향
- `mediaProfileToken`: stream URI를 가져온 ONVIF media profile token
- `mediaApi`: `Media` 또는 `Media2`
- `streamUriImportedAt`: stream URI를 가져온 시점. 구현 시 ISO-8601 UTC 권장
- `credentialRef`: 외부 secret store 또는 auth 정책이 정한 reference
- `credentialInline`: 항상 `false`. 원문 credential 저장/응답 금지

비포함 필드:

- password, digest secret, token 원문
- recording/replay/edge storage 설정
- PTZ preset/control 상태
- ONVIF raw SOAP 응답 전체
- client scope 계산에 필요한 필드

저장 위치 후보:

- `SourceRecord.origin` optional object를 추가하는 방식이 가장 명확합니다.
- 구현 전까지는 `tags=["onvif","live",...]`와 운영 문서만 사용합니다.
- registry strict load 정책 때문에 필드 추가 시 backward/forward compatibility와
  unknown field 처리 방식을 먼저 결정해야 합니다.

## Credential Policy Draft

- Password, digest secret, bearer token 같은 원문 secret은 fixture, 문서 예시,
  UI 응답, API 응답에 쓰지 않습니다.
- 저장 정책이 확정되기 전까지 credential persistence는 구현하지 않습니다.
- 검증 fixture는 `credentialRef` 또는 `auth.required=true`만 남기고 원문 값을
  포함하지 않습니다.
- 실패 메시지는 인증 필요/실패 여부와 다음 조치만 표시하고 secret 일부를
  echo하지 않습니다.

## Stub Fixture

설계 fixture:

- [test/fixtures/onvif_live_import_stub.json](../test/fixtures/onvif_live_import_stub.json)

fixture는 합성 장비와 합성 private-network RTSP URI만 사용합니다. 실제 카메라
응답, 운영 endpoint, credential, 고객/현장 영상 정보는 포함하지 않습니다.

## Verification Plan

현재 단계:

```bash
./server.sh verify-onvif-live-import-contract
git diff --check -- docs test/fixtures scripts server.sh
./server.sh verify-docs-links
./server.sh verify-public-repo-readiness --report /tmp/media_server_public_repo_readiness.md
```

ONVIF import 구현 단계 후보:

```bash
./server.sh build
./server.sh verify-ops-source-lifecycle
```

구현 단계에서도 Event POST payload, WebRTC DataChannel schema,
SSE/WS metadata schema, RTSP/WebRTC media path는 변경하지 않습니다.
