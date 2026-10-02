# WebRTC VA 메타데이터 클라이언트

대상은 WebRTC 영상과 `va-metadata` DataChannel을 소비하는 개발자입니다.
공개 schema와 세션 순서, [독립 예제](../scripts/examples/webrtc_va_metadata_client.html)의
실제 기능·한계를 설명합니다. 예제는 영상과 metadata JSON 관측 도구이며 canvas renderer가 아닙니다.

공개 payload 기준은 [Live Event and Metadata Contracts](./live-event-metadata-contracts.md),
동기화·backpressure·custom overlay 설계는 [VA 가이드](./video-analysis.md),
제품 사용자의 시청 흐름은 [UI 가이드](./ui-guide.md)를 따릅니다.

## 권한과 적용 범위

예제는 generic `/webrtc/session`을 사용하는 개발·운영자 연동용입니다.
인증 사용 시 admin, 또는 `operator`와 `ops:read`를 함께 가진 계정,
또는 `lab:read` scope가 필요합니다. 제한된 operator의 역할명만으로 허용되지 않습니다.

viewer/client 제품은 `/client/api/views/{viewId}/webrtc/session` wrapper를 사용합니다.
이 경로에 source locator, raw debug JSON, generic session ID·token을 노출하거나
generic route로 권한을 우회하지 않습니다. 예제에 나타나는 개발용 원문을 사용자 화면에
그대로 옮기지 않습니다.

포함하는 계약은 video track 수신, `vaMetadata=1` opt-in,
`va-metadata` label, `media-server.webrtc.va-metadata.v1` payload,
`tracks`/`events` 및 sync 진단입니다.
Event POST의 `media-server.va.event.v1`, SSE/WS schema, RTSP 일반 viewer의 동작은 바꾸지 않습니다.

## 세션 순서

```text
GET /webrtc/config
  -> peerConnectionConfig로 RTCPeerConnection 생성
POST /webrtc/session?file=<token>&va=1&vaMetadata=1
  <- { sessionId, sessionToken, offer }
  -> setRemoteDescription(offer) -> createAnswer() -> setLocalDescription(answer)
POST /webrtc/session/{sessionId}/answer   (Content-Type: application/sdp)
POST /webrtc/session/{sessionId}/ice      (로컬 ICE candidate JSON)
GET  /webrtc/session/{sessionId}/ice      (서버 ICE candidate 수신)
  <- DataChannel(label=va-metadata)의 JSON message
DELETE /webrtc/session/{sessionId}        (사용 종료)
```

후속 answer/ICE/delete는 세션 소유 principal 또는 유효한 session capability로 보호합니다.
`sessionToken`은 비밀 capability이며 로그·문서·사용자 UI에 넣지 않습니다.
현재 예제는 이 token을 저장하거나 헤더로 보내지 않고 동일 origin의 인증 session에 의존합니다.
별도 client의 capability 전달은 기존 `X-Session-Capability` 계약을 따릅니다.

| Query | 의미 |
| --- | --- |
| `va=1` | 분석/overlay 경로 요청 |
| `vaMetadata=1` | metadata DataChannel 요청 |
| `vaMetadataIntervalMs=500` | 최소 metadata 송신 간격 설정 |
| `vaMetadataMaxMessageBytes=65536` | message 크기 상한 |
| `vaMetadataMaxBufferedBytes=<bytes>` | DataChannel 송신 buffer 상한 |

룰 기반 연동은 `vaRule=<id>`에 저장된 source/profile/rule을 사용하며
`file/url/source` override를 함께 넣지 않습니다. 예제 폼은 file token 경로를 제공합니다.

## Payload 읽기

| 필드 | 의미 |
| --- | --- |
| `schema` | `media-server.webrtc.va-metadata.v1` |
| `streamId`, `channelId`, `profileKey` | 분석·미디어 문맥 |
| `frameId`, `pts`, `timestampMs` | frame 식별과 미디어 시간 문맥 |
| `videoFramePtsMs`, `analysisPtsMs` | 영상 frame과 선택 분석 결과의 PTS |
| `syncDeltaMs`, `syncStatus`, `syncToleranceMs` | 시간 차이·선택 상태·허용 오차 |
| `metadataSequence`, `sentAtMs` | metadata 순서와 발행 시각 |
| `frameWidth`, `frameHeight`, `coordinateSpace` | 원본 frame 크기와 좌표계 |
| `tracks[]`, `events[]` | 현재 track와 live rule/scenario event 요약 |

bbox는 `coordinateSpace=normalized-frame`의 `[0, 1]` 좌표입니다.
별도 overlay renderer는 실제 video 표시 크기와 letterbox offset을 반영해 화면 좌표로
변환해야 합니다. DataChannel 자체가 영상에 bbox를 합성하지는 않습니다.

`syncStatus`는 `exact`, `near`, `fallback-latest`, `missing`, `stale`를 구분합니다.
PTS와 wall-clock/UTC를 혼용하지 않습니다. fallback·stale 표시와 frame matching 기준은
[VA 가이드](./video-analysis.md)에 둡니다. 예제에서 값을 출력했다는 사실은 overlay 정합성
검증이나 모든 frame의 정확한 매칭을 뜻하지 않습니다.

## 독립 예제 사용

파일은 `scripts/examples/webrtc_va_metadata_client.html`입니다.

1. 허용된 개발 환경에서 HTML을 제공합니다. 동일 origin의 로그인 session을 사용하는 것이
   기본이며 서버가 이 파일을 특정 제품 route로 자동 제공한다고 가정하지 않습니다.
2. 실제 HTTP base, 허용된 file token, metadata 간격·최대 message 크기를 입력하고 `Start`를 누릅니다.
3. video와 상태 JSON, 마지막 metadata JSON을 각각 확인합니다.
4. 종료 전에 `Stop`을 누르고 서버 session이 정리되었는지 확인합니다.

`file://` 열기는 `null` origin 때문에 실패할 수 있습니다. 별도 origin 허용만으로 인증도
전달되는 것은 아닙니다. 예제에는 로그인·Bearer 입력·cross-origin credentials 설정이 없습니다.
운영 인증을 끄거나 운영 계정·source를 테스트용으로 재사용하지 않습니다.

예제가 수행하는 일과 확인 책임을 구분합니다.

| 구분 | 현재 동작 |
| --- | --- |
| 예제의 검사 | 수신 label/schema, `tracks`/`events` 배열 여부를 `errors`에 표시 |
| 예제의 관측 | `ontrack` video 연결, DataChannel 상태·message 수, sync/sequence와 마지막 JSON 표시 |
| 사용자가 확인 | 실제 영상 재생, ICE/연결 상태, 비어 있는 결과의 이유, 전송 지연·정리 성공 |
| 구현하지 않은 기능 | canvas overlay, frame callback 동기화, BBox 비교, 영상 FPS 합격 판정 |

예제는 완성된 오류·수명 관리 client가 아닙니다. JSON parse 예외를 모두 상태 메시지로
변환하지 않으며 ICE/DELETE 실패를 삼키는 경로가 있습니다. `stopped:true` 표시는 서버
삭제 성공을 증명하지 않습니다. 페이지 이탈 자동 정리도 보장하지 않으므로 결과와 cleanup을
별도로 확인합니다.

## 오류 경계와 검증

DataChannel 생성·parse·buffer·send 실패는 metadata 실패입니다.
RTSP/WebRTC 미디어 경로 자체에 문제가 없다면 audio/video 실패로 전파하지 않습니다.
연동 변경 시 다음을 서로 구분해 확인합니다.

- 정상: 영상·ICE 연결, channel open, 올바른 label/schema·배열·sync field 수신.
- 오류: 잘못된 label/schema·JSON/배열은 metadata 오류로 식별하고 미디어 상태와 분리.
- 경계: channel 미개방/close, message 초과, buffer 초과는 송신 제한과 drop/skip 지표로 확인.
- 권한·정리: viewer의 generic 생성 거부, 다른 principal의 세션 접근 거부, 종료 후 session 부재 확인.

승인된 격리 서버에서 실행할 runtime smoke 예시입니다. 실제 주소·입력과 결과 경로는
[검증 정책](./stream-verification.md#검증-정책)에 맞추며 이 문서는 실행 승인이 아닙니다.

```bash
./server.sh verify-webrtc-va-metadata --http-base http://127.0.0.1:8080 --interval-ms 500
```

이 명령은 브라우저 RTCPeerConnection으로 video track·ICE·DataChannel·schema·sync를
검사하고 관련 source guard도 확인합니다. 예제 HTML이나 제품 canvas의 시각·stall·draw
검사를 대신하지 않습니다. 간격을 100/200/500ms로 바꾼 것만으로 수신 FPS·latency 개선·
장시간 안정성을 PASS로 판단하지 않습니다. 실행하지 않은 runtime delivery와 negative·
권한·cleanup 검사는 각각 미실행으로 남깁니다.
