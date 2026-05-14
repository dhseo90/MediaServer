# ONVIF Live Source Support

이 문서는 v1.1.0의 ONVIF live source 지원 범위를 고정합니다.
ONVIF는 file, RTSP pull, HTTP/HLS URI, WHEP pull, Published WebRTC와 같은
채널 source 유형 중 하나로 취급합니다. 제품 UI에서 ONVIF만 별도 import
화면이나 특별한 workflow로 분리하지 않습니다.

관련 기준:

- [v1.1.0 Roadmap](./v1.1.0-roadmap.md)
- [Media Server Architecture](./media-server-architecture.md)
- [Config Reference](./config-reference.md)

## 범위

구현 완료:

- `/ops/sources` 채널 추가 폼의 `ONVIF 카메라` source 유형
- ONVIF live profile에서 선택한 재생 URI 입력
- `rtsp://`, `rtsps://`, `http://`, `https://` ONVIF live URI를 기존
  SourceRegistry source로 저장
- SourceRegistry 저장 시 `onvif`, `live` tag 부여
- 기본 seed 채널의 `Public ONVIF Stream Sample`
- 채널 목록의 ONVIF Live/VA URL copy parity
- 룰 목록의 ONVIF RTSP/WHEP/WebRTC URL copy parity
- client/viewer API의 source locator, ONVIF endpoint, credential, raw JSON redaction

비범위:

- ONVIF conformant server
- ONVIF Profile G recording/replay
- camera recording configuration
- edge storage 조회
- playback/replay URL 지원
- PTZ control 1차 구현
- SourceRegistry/PublishedView 저장 payload schema 변경
- client/viewer 화면의 source URL, ONVIF endpoint, credential reference,
  raw diagnostic JSON 노출

## UI 계약

`/ops/sources`에서 ONVIF는 다른 채널 source와 같은 자격으로 다룹니다.

1. 운영자는 `채널 추가`에서 `ONVIF 카메라`를 선택합니다.
2. `ONVIF 스트림 URI`에 ONVIF live profile에서 얻은 재생 URI를 입력합니다.
3. 저장 후 채널 목록에서는 source type을 `ONVIF`로 표시합니다.
4. Live URL과 VA URL 영역에는 각각 `ONVIF RTSP`, `ONVIF WHEP` copy 버튼을
   표시합니다.
5. 해당 ONVIF 채널에 VA rule이 연결되면 `/ops/rules`의 URL 복사 영역에도
   `ONVIF RTSP`, `ONVIF WHEP`, `WebRTC` 버튼을 같은 테이블 UI 규칙으로 표시합니다.

`/lab/import` 화면 route는 닫힌 상태를 유지합니다. ONVIF는 `/ops/sources`의
일반 채널 관리 흐름 안에서만 제품 UI에 노출합니다.

## 저장 계약

ONVIF source는 기존 SourceRegistry 저장 payload만 사용합니다.

- `sourceId`: 운영자가 정한 채널 ID
- `displayName`: 운영자용 채널 이름
- `kind`: 입력 URI transport에 따라 `rtsp`, `http`, `hls`, `whep` 중 하나
- `rtspUrl`, `httpUrl`, `whepUrl`: 선택된 ONVIF live URI
- `tags`: 최소 `onvif`, `live`
- `ownerGroup`: 기존 source ownership 정책 사용

ONVIF origin metadata는 v1.1.0 저장 schema에 포함하지 않습니다. 필요한 최소 필드는
별도 SourceRegistry origin metadata 설계 단계에서 검토합니다.

## Fixture Draft Contract

아래 API와 fixture는 제품 UI 기능명이 아니라 검증용 compatibility contract입니다.
기존 명령/API 이름은 테스트 호환성 때문에 유지하지만, 제품 화면에서는
ONVIF를 별도 import UI나 특별한 제품 기능으로 노출하지 않습니다.

```text
POST /ops/api/onvif/import-draft
test/fixtures/onvif_live_import_stub.json
```

계약:

- 입력 fixture는 실제 camera 연결 대신 합성 ONVIF 응답을 표현합니다.
- 응답은 기존 `/ops/api/sources`와 `/ops/api/views`에 보낼 수 있는 draft만
  반환합니다.
- 저장 side effect는 없습니다.
- `expectedSourceDraft.tags`에는 최소 `onvif`, `live`가 포함됩니다.
- 응답에는 password, token 원문, ONVIF raw SOAP, credential 원문을 포함하지 않습니다.

## Verification

기본 검증:

```bash
./server.sh build
./server.sh verify-onvif-live-import-contract
./server.sh verify-onvif-import-draft-api
./server.sh verify-onvif-rtsp-downstream
./server.sh verify-onvif-ops-sources-ui
./server.sh verify-ops-client-ui
./server.sh verify-ops-client-ui --screenshots
./server.sh verify-rule-ui
git diff --check
./server.sh verify-docs-links
```

`verify-onvif-ops-sources-ui`는 `/ops/sources`의 ONVIF 채널 저장 흐름과
채널/룰 URL copy parity를 임시 registry에서 확인합니다. client API에 RTSP URL,
ONVIF endpoint, credential reference, raw diagnostic JSON이 노출되지 않는지도
함께 확인합니다.

구현 단계에서도 Event POST payload, WebRTC DataChannel schema,
SSE/WS metadata schema, RTSP/WebRTC media path는 변경하지 않습니다.
