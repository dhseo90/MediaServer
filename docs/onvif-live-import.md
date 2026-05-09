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

이 단계의 fixture는 설계용입니다. 제품 API schema나 registry schema를 추가하지
않습니다.

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
git diff --check -- docs test/fixtures
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
