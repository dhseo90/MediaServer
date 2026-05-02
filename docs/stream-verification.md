# Stream Verification

이 문서는 현재 기준의 스트리밍/VA 검증 명령을 관리합니다. 과거 날짜별 상세 검증 이력은 [history/verification-history.md](./history/verification-history.md)에 보관합니다.

## 목적

- RTSP/WebRTC 입력/출력 pipeline이 기존 동작을 유지하는지 확인합니다.
- 기존 Intrusion / LineCrossing rule event의 이벤트 타입, JSON/API/POST 형식이 유지되는지 확인합니다.
- TrackStateManager, SceneContextBuilder, EventManager, ScenarioEngine, cleanup 정책이 다채널 환경에서 무한 증가하지 않는지 확인합니다.
- 신규 VA 기능이 media pipeline을 blocking하지 않는지 확인합니다.
- 검증 명령은 로컬 재현성을 우선하고, 외부 source/TURN/장시간 테스트는 별도 gate로 분리합니다.

## 테스트 모드 요약

| 명령 | 범위 |
| --- | --- |
| `./server.sh test` | 기본 smoke. 로컬 file/RTSP/WebRTC/기본 API 중심 |
| `./server.sh test --basic` | 기본 smoke를 명시적으로 실행 |
| `./server.sh test --full` | Rule/Profile UI, VA event, image analysis, event POST, multichannel, redaction 포함 |
| `./server.sh test --external` | `--full` + LAN/external source, WebRTC ICE, 외부 HTTP/HLS URI 선택 검증 |
| `./server.sh test --stable` | 기존 stable 호환 기준 |

외부 RTSP/HLS/HTTP source, 운영 TURN relay/auth, YouTube import/source는 외부 환경 영향을 받으므로 기본 hard gate가 아닙니다.

## 단기 테스트 명령

개발 전후 빠른 기준:

```bash
./server.sh build
./server.sh test
```

VA rule/scenario 변경:

```bash
./server.sh verify-analysis-state
./server.sh verify-va-replay
./server.sh verify-va-events
```

UI 변경:

```bash
./server.sh verify-rule-ui
./server.sh verify-lab-layout
```

WebRTC/stream 변경:

```bash
./server.sh verify-codecs
./server.sh verify-webrtc-ice
./server.sh verify-multichannel
```

## 장기 테스트 명령

30분 이상 사전 안정성 검증:

```bash
./server.sh verify-predev --soak-minutes 30
```

120분 predev는 상시 검증이 아니라 장기 gate입니다. release candidate 전, RTSP/GStreamer/WebRTC media path 변경 후, SharedStream/VA metadata/dashboard/SSE/WS fanout 변경 후, 또는 30분 predev에서 active RSS high-water가 이전 기준보다 커졌을 때 실행합니다.

```bash
./server.sh verify-predev --soak-minutes 120
```

긴 VA event/tracker 검증:

```bash
./server.sh verify-va-events --long
./server.sh verify-tracker-stability --long --overlap-focus
```

반복 다채널 VA 검증:

```bash
./server.sh verify-multichannel --include-va --repeat 3
```

외부 source 장시간 검증은 사용할 source가 준비된 경우에만 실행합니다.

```bash
./server.sh verify-uri-longrun --iterations 3 --include-external
```

## RTSP 검증

기본 codec/RTSP route 검증:

```bash
./server.sh verify-codecs
```

RTSP output 수동 확인 예시:

```bash
ffprobe -rtsp_transport tcp \
  'rtsp://127.0.0.1:8554/dhseo?file=sample_h264.mp4'
```

RTSP input pull 경로는 로컬 또는 준비된 upstream URL을 사용합니다. 개인 LAN IP는 문서에 고정하지 않고 환경에 맞게 치환합니다.

```bash
ffprobe -rtsp_transport tcp \
  'rtsp://127.0.0.1:8554/dhseo?url=rtsp%3A%2F%2Fexample.local%3A8554%2Fsource'
```

확인 기준:

- client connect/disconnect 후 listener와 session cleanup이 정상 동작
- 동일 source 다중 session에서 SharedStream fan-out 유지
- RTSP source preflight/track settle timeout에서 서버가 hang 되지 않음

## WebRTC 검증

WebRTC ICE/signaling smoke:

```bash
./server.sh verify-webrtc-ice
```

WebRTC simple signaling 수동 요청:

```bash
curl -fsS -X POST \
  'http://127.0.0.1:8080/webrtc/session?file=sample_h264.mp4'
```

WHEP 수동 요청:

```bash
curl -fsS -X POST \
  'http://127.0.0.1:8080/whep?file=sample_h264.mp4'
```

확인 기준:

- SDP offer/answer 생성
- ICE candidate 수집
- browser/client disconnect 후 session cleanup
- DataChannel 실패가 audio/video streaming 실패로 전파되지 않음
- WebRTC 메타데이터 뷰어는 browser client-side overlay이고 RTSP URL과 혼동하지 않음

WebRTC VA 메타데이터 뷰어 수동 확인:

1. 서버 실행 후 브라우저에서 `/lab/rules`를 연다.
2. `영상 분석 보기` 탭으로 이동한다.
3. 보기 모드를 `WebRTC 메타데이터`로 선택한다.
4. 서버 파일 또는 URL source를 선택하고 `보기 시작`을 누른다.
5. 개발자 요청 URL의 WebRTC simple signaling query에 `vaMetadata=1`이 포함되는지 확인한다.
6. DataChannel label이 기본값 `va-metadata`로 표시되는지 확인한다.
7. 상태가 `연결 중`에서 `열림` 또는 `수신 중`으로 전환되고 message count, Track/이벤트/시나리오 count, latest JSON preview가 갱신되는지 확인한다.
8. DataChannel이 `지연` 또는 `오류`가 되어도 영상 재생 상태가 별도로 유지되는지 확인한다.

WebRTC VA metadata 자동 검증:

```bash
./server.sh verify-webrtc-va-metadata --http-base http://127.0.0.1:8080
```

확인할 항목:

- `/webrtc/session?...&vaMetadata=1`로 WebRTC session을 생성
- browser `RTCPeerConnection`에서 video `ontrack` 확인
- ICE 상태가 `connected` 또는 `completed`로 전환되는지 확인
- `va-metadata` DataChannel이 열리는지 확인
- 최소 1개 metadata message를 수신하고 `media-server.webrtc.va-metadata.v1` schema, `tracks[]`, `events[]` 필드를 확인
- sync 진단 필드(`videoFramePtsMs`, `analysisPtsMs`, `syncDeltaMs`, `syncStatus`, `syncToleranceMs`, `metadataSequence`, `sentAtMs`, `frameWidth`, `frameHeight`, `coordinateSpace`)가 포함되는지 확인
- `syncStatus`가 `exact`, `near`, `fallback-latest`, `missing`, `stale` 중 하나인지 확인
- Lab WebRTC client-side overlay는 기본적으로 `syncStatus=fallback-latest` metadata를 그리지 않는지 확인
- fallback 표시가 필요할 때만 `clientOverlayFallback=1` 또는 `vaMetadataDrawFallback=1`을 사용하고, 이 경우 fallback metadata가 흐리게 표시되는지 확인
- fallback metadata가 숨겨진 경우 `Fallback 숨김` count가 증가하는지 확인
- 실패 시 Chrome log 경로와 summary JSON 경로를 출력

WebRTC VA metadata overlay sync 자동 검증:

```bash
./server.sh verify-webrtc-va-metadata-sync --http-base http://127.0.0.1:8080
```

확인할 항목:

- 실제 `/lab/rules` UI에서 `영상 분석 보기` → `WebRTC 메타데이터` 모드를 시작
- WebRTC session 생성, video `ontrack`, ICE 연결, `va-metadata` DataChannel 수신 확인
- `requestVideoFrameCallback` 기반 video frame count가 증가하는지 확인
- metadata payload에 sync 진단 필드가 포함되는지 확인
- 검증 전용 hook으로 metadata buffer 상한을 초과하는 synthetic metadata를 주입하고 buffer가 제한되는지 확인
- client overlay draw count가 video frame callback 기준으로 증가하는지 확인
- `fallback metadata 표시` 옵션이 기본 off인지 확인
- `syncStatus=fallback-latest`가 수신되더라도 기본 정책에서 draw되지 않는지 확인
- 브라우저 검증 hook으로 `requestVideoFrameCallback`을 일정 frame 이후 멈춰 video stalled 상태를 재현
- video stalled 상태에서 stale overlay clear가 발생하고 draw count가 더 증가하지 않는지 확인
- 실패 시 `videoPresentedFrameCount`, `metadataReceivedCount`, `metadataDrawnCount`, `metadataDroppedCount`, `fallbackHiddenCount`, `staleClearCount`, `maxMetadataBufferSize`, `maxSyncDeltaMs`, `averageSyncDeltaMs`를 summary JSON에 남김

이 검증은 선택 검증이며 기본 `./server.sh test`에는 포함하지 않는다. 브라우저/렌더링 타이밍에 따라 flaky할 수 있으므로 실패 시 summary JSON과 Chrome log를 함께 확인한다.

## RTSP / WebRTC VA 표시 정책 검증

RTSP와 WebRTC는 metadata 표시 방식이 다릅니다.

수동 확인:

1. `/lab/rules`의 `영상 분석 보기` 탭을 연다.
2. `개발자 요청 URL`을 펼친다.
3. `WebRTC 메타데이터 뷰어` URL에는 `/webrtc/session`과 `vaMetadata=1`이 포함되는지 확인한다.
4. `RTSP 서버 오버레이` URL에는 `rtsp://...`와 `va=1` 또는 `vaRule=<id>`가 포함되는지 확인한다.
5. `RTSP 원본 스트림` URL에는 `va=1`, `vaRule=<id>`, `vaMetadata=1`이 포함되지 않는지 확인한다.
6. `커스텀 메타데이터 사이드채널` URL이 `/metadata/stream` SSE endpoint를 가리키는지 확인한다.
7. `커스텀 RTSP + 메타데이터 연결 정보` 영역에 RTSP 원본 스트림과 SSE 메타데이터 스트림이 함께 표시되는지 확인한다.
8. `커스텀 메타데이터 사이드채널` 설명이 일반 VLC/ffplay에서 metadata UI가 표시되는 것처럼 표현하지 않는지 확인한다.

확인 기준:

- RTSP 일반 viewer는 DataChannel을 사용하지 않음
- RTSP VA 표시는 server-side overlay가 기본 정책
- RTSP/server-side overlay의 latest result fallback 정책은 기존대로 유지됨
- WebRTC browser viewer만 DataChannel metadata와 client-side overlay를 사용
- WebRTC client-side overlay는 fallback-latest를 기본 숨김 처리하고 opt-in에서만 표시
- custom client는 RTSP video와 별도 SSE metadata side-channel을 직접 조합해야 함

RTSP video 재생은 일반 player 명령으로 별도 확인합니다.

```bash
ffplay -rtsp_transport tcp 'rtsp://127.0.0.1:8554/dhseo?file=sample_h264.mp4'
ffplay -rtsp_transport tcp 'rtsp://127.0.0.1:8554/dhseo?file=sample_h264.mp4&va=1'
```

위 명령은 RTSP 영상 확인용입니다. VLC/ffplay/IINA는 SSE/WS metadata side-channel을 자동 overlay하지 않습니다.

SSE metadata side-channel 수동 확인:

```bash
curl -N 'http://127.0.0.1:8080/lab/analysis/metadata/stream?vaRule=1&intervalMs=500&maxMessageBytes=65536'
```

이미 생성된 analysis tap을 재사용할 때:

```bash
curl -N 'http://127.0.0.1:8080/lab/analysis/taps/{tapId}/metadata/stream?intervalMs=500&maxMessageBytes=65536'
```

Custom SSE metadata client 예제:

```bash
python3 scripts/examples/va_metadata_sse_client.py \
  --url 'http://127.0.0.1:8080/lab/analysis/metadata/stream?vaRule=1&intervalMs=500&maxMessageBytes=65536' \
  --max-messages 5 \
  --timeout-seconds 15
```

이 예제는 SSE URL을 입력받아 `event: metadata`를 수신하고, JSON parse/schema 확인, `streamId/channelId`, `tracks/events/scenarios` count, latest timestamp, message count를 출력합니다. payload 본문까지 보고 싶으면 `--print-json`을 추가합니다. RTSP video 재생기나 overlay renderer는 포함하지 않습니다. 영상은 위 ffplay/VLC 같은 일반 RTSP player로 별도 재생해야 하며, 일반 VLC/ffplay/IINA는 SSE/WS metadata side-channel을 자동 overlay하지 않습니다.

확인할 항목:

- 응답 header가 `text/event-stream`인지 확인
- `event: metadata`의 `data:` JSON schema가 `media-server.va.runtime-metadata.v1`인지 확인
- `tracks`, `events`, `scenarios`, `metrics` 필드가 포함되는지 확인
- frame이 갱신되지 않을 때 동일 metadata를 반복 전송하지 않고 heartbeat/stale comment로 유지되는지 확인
- curl 중단 후 임시 tap이 cleanup되는지 `/lab/analysis/taps`에서 확인

SSE metadata side-channel smoke:

```bash
./server.sh verify-sse-metadata --http-base http://127.0.0.1:8080
./server.sh verify-va-metadata-sidechannel --http-base http://127.0.0.1:8080
```

확인할 항목:

- `/lab/analysis/metadata/stream?file=...` 응답이 `text/event-stream`인지 확인
- 첫 `event: metadata`의 JSON schema가 `media-server.va.runtime-metadata.v1`인지 확인
- `tracks`, `events`, `scenarios`, `metrics` 필드가 포함되는지 확인
- 임시 SSE analysis tap이 client disconnect 후 cleanup되는지 확인
- `verify-va-metadata-sidechannel`은 같은 검증을 수행하면서 summary JSON을 출력하는 명시적 alias

WebSocket metadata side-channel smoke:

```bash
./server.sh verify-ws-metadata --http-base http://127.0.0.1:8080
```

확인할 항목:

- `/ws/va-metadata?file=...` handshake가 `101 Switching Protocols`로 완료되는지 확인
- 첫 text frame의 JSON schema가 `media-server.va.runtime-metadata.v1`인지 확인
- `tracks`, `events`, `scenarios`, `metrics` 필드가 포함되는지 확인
- 임시 WebSocket analysis tap이 client disconnect 후 cleanup되는지 확인
- WebSocket 실패가 RTSP/WebRTC video/audio 흐름으로 전파되지 않는지 확인

VA Runtime Console 자동 검증:

```bash
./server.sh verify-lab-layout
./server.sh verify-analysis-state
./server.sh verify-va-runtime-console --http-base http://127.0.0.1:8080
```

확인할 항목:

- 임시 analysis tap 생성 후 dashboard polling이 가능한지 확인
- Runtime Dashboard drill-down UI가 lab layout을 깨뜨리지 않는지 확인
- state-dump 기반 Tracks/Scenarios/Tracking Issues 표시와 vaRule Runtime Debug가 기존 endpoint만 재사용하는지 확인
- `/lab/analysis/taps/{tapId}/metrics`의 `tapState`, `trackState`, `metricsReport` 확인
- `/lab/analysis/taps/{tapId}/state-dump` JSON 확인
- `/lab/analysis/taps/{tapId}/events` 접근과 recent event buffer 확인
- `/lab/analysis/event-post/status`, `/lab/analysis/event-storage/status`, `/lab/analysis/events/records`, `/lab/runtime/status` 접근 확인
- smoke용 analysis tap cleanup 확인

RTSP VA overlay 정책 자동 검증:

```bash
./server.sh verify-rtsp-va-overlay-policy \
  --http-base http://127.0.0.1:8080 \
  --rtsp-base rtsp://127.0.0.1:8554/dhseo
```

확인할 항목:

- RTSP 원본 스트림 URL에는 `va=1`, `vaRule=<id>`, `vaMetadata=1`이 포함되지 않음
- RTSP 서버 오버레이 URL에는 `va=1`이 포함됨
- metadata side-channel은 RTSP URL이 아니라 `/metadata/stream` HTTP SSE URL로 분리됨
- `ffmpeg`가 있으면 raw/overlay RTSP URL을 짧게 decode
- 모든 결과는 summary JSON으로 남김

VA Metadata Runtime Console 장시간 검증:

```bash
./server.sh verify-va-runtime-console-longrun \
  --duration-minutes 30 \
  --clients 1 \
  --include-sidechannel \
  --include-dashboard
```

RTSP server-side overlay consumer까지 함께 유지할 때:

```bash
./server.sh verify-va-runtime-console-longrun \
  --duration-minutes 30 \
  --clients 1 \
  --include-sidechannel \
  --include-dashboard \
  --include-rtsp
```

consumer cleanup 이후 서버를 즉시 종료하지 않고 idle RSS를 관찰할 때:

```bash
./server.sh verify-va-runtime-console-longrun \
  --duration-minutes 30 \
  --clients 1 \
  --include-sidechannel \
  --include-dashboard \
  --include-rtsp \
  --idle-after-cleanup-minutes 15 \
  --idle-sample-interval-seconds 30
```

RSS WARNING 해제 여부를 판단하기 위한 full fanout 120분 active + 30분 idle 검증:

```bash
./server.sh verify-va-runtime-console-longrun \
  --duration-minutes 120 \
  --clients 1 \
  --include-dashboard \
  --include-sidechannel \
  --include-rtsp \
  --rss-warmup-minutes 5 \
  --rss-large-drop-mb 20 \
  --idle-after-cleanup-minutes 30 \
  --idle-sample-interval-seconds 30
```

consumer connect/disconnect cycle 이후 idle baseline RSS 누적 증가를 확인할 때:

```bash
./server.sh verify-va-runtime-console-cycles \
  --cycles 10 \
  --active-minutes 5 \
  --idle-minutes 2 \
  --clients 1 \
  --include-sidechannel \
  --include-dashboard \
  --include-rtsp \
  --rss-warmup-minutes 5 \
  --rss-large-drop-mb 20
```

확인할 항목:

- WebRTC `vaMetadata=1` DataChannel이 장시간 metadata를 계속 수신하는지 확인
- dashboard polling 중 `/metrics`, `/state-dump`, `/events`, event POST/storage status 접근이 유지되는지 확인
- dashboard drill-down과 vaRule Runtime Debug polling이 media pipeline을 blocking하지 않는지 확인
- SSE metadata side-channel client가 장시간 연결 후 cleanup되는지 확인
- `--include-rtsp` 지정 시 RTSP `va=1` server-side overlay consumer가 함께 유지되는지 확인
- process RSS/CPU, active sessions/streams/taps, metadata side-channel client count를 주기적으로 기록
- `--idle-after-cleanup-minutes` 지정 시 consumer와 dashboard tap cleanup 후 서버 process를 유지하면서 idle RSS/CPU와 active count 재상승 여부를 별도로 기록
- `verify-va-runtime-console-cycles`는 서버를 유지한 채 WebRTC/SSE/dashboard/RTSP consumer를 반복 연결/해제하고 cycle별 active peak RSS와 idleEnd RSS baseline을 비교
- WebRTC metadata sent/dropped/failure count는 longrun 서버 로그의 `[webrtc-metadata] close` 라인에서 집계
- `/lab/runtime/status`의 `debugCounters` 블록으로 RTSP/GStreamer egress release와 fanout lifecycle counter를 확인
- longrun/cycle summary JSON과 Markdown report의 `debugCounters` 또는 `Runtime Debug Counters` 섹션에서 counter 최종값을 확인
- 종료 후 active sessions, active analysis taps, SSE/WS metadata clients가 0으로 정리되는지 확인
- idle 관찰 중 active sessions/streams/taps, SSE/WS clients, RTSP egress consumer가 다시 증가하면 cleanup/RSS 해석보다 `idleJudgement`를 우선 확인
- cycle 검증에서는 cycle별 cleanup count가 0이 아니면 `HOLD`, 최종 port cleanup 실패는 `FAIL`, idleEnd RSS가 cycle마다 계속 증가하면 `WARNING`으로 판단
- active 구간 RSS slope와 idle-after-cleanup RSS slope는 분리해서 해석합니다. active 중 RSS가 증가해도 cleanup 후 모든 active count가 0이고 idle RSS가 유지/하락하면 lifecycle 잔여 증거보다 allocator high-water 또는 GStreamer/WebRTC buffer pool retention 후보로 봅니다.
- longrun summary JSON과 Markdown report는 `/tmp/media_server_va-runtime-longrun-*`, cycle summary/report는 `/tmp/media_server_va-runtime-cycles-*` 경로에 남김

최근 RSS WARNING 해제 후보 검증 결과:

- RTSP-only 5-cycle: `PASS`. `monotonicIdleRssIncrease=false`, RTSP lifecycle counter 균형, pending queue stop/destroy 잔여 `0`, `appsrcPushAfterStopCount=0`, flow return은 FLUSHING 중심입니다.
- Full 20-cycle: `PASS`. `monotonicIdleRssIncrease=false`, cleanup/port cleanup 정상, RTSP lifecycle/probe/bus watch counter 균형, pending queue stop/destroy 잔여 `0`, flow return은 전부 FLUSHING입니다.
- 120m full + 30m idle-after-cleanup: `PASS`. Summary는 `/tmp/media_server_va-runtime-longrun-1777648583-19035_summary.json`, report는 `/tmp/media_server_va-runtime-longrun-1777648583-19035_report.md`입니다.
- 120m active 구간은 warmup baseline `679.80MiB`에서 last RSS `881.38MiB`까지 증가했고, last-30m slope는 `+51.77MiB`, `+1.726MiB/min`입니다. active plateau는 뚜렷하지 않으므로 high-water 관찰 메모는 유지합니다.
- cleanup 후 30분 idle RSS는 `642.97MiB -> 642.67MiB`로 유지/하락했고, idle 중 activeSessions, activeStreams, activeAnalysisTaps, SSE/WS clients, RTSP consumers 재증가는 없었습니다.
- `ERROR` / `NOT_LINKED` / `NOT_NEGOTIATED` / `OTHER` flow return은 관찰되지 않았고, port cleanup은 정상입니다. 이 조합이면 RSS WARNING 해제 가능 후보로 봅니다.
- 후속 30분 predev 회귀 검증도 `PASS`입니다. Summary는 `/tmp/media_server_predev-1777679318-64004_summary.json`, report는 `/tmp/media_server_predev-1777679318-64004_report.md`이며 결과는 `pass=69`, `fail=0`, `skip=1`입니다. Runtime Console은 stable 승격 가능 상태로 판단하되 active 구간 high-water 관찰 메모는 유지합니다.

기본 `./server.sh test`에는 포함하지 않습니다. 30분 이상 실행하는 선택 검증이며, 잠자기 전에는 `--duration-minutes 120`처럼 시간을 늘려 실행합니다. 이 명령은 검증용 subprocess env로 `MEDIA_SERVER_WEBRTC_TRACE=1`을 켜서 DataChannel sent/drop/failure count를 로그에서 집계하며, `scripts/.media_server.env` 같은 영구 설정 파일은 수정하지 않습니다.

Runtime debug counter는 기존 Event POST/WebRTC/SSE metadata payload schema를 변경하지 않는 내부 진단 값입니다. 기본적으로 counter만 누적하며, lifecycle trace log가 필요할 때만 `MEDIA_SERVER_RUNTIME_DEBUG_COUNTER_TRACE=1`을 서버 실행 환경에 추가합니다.

주요 counter:

- `rtspMediaConfiguredCount`, `rtspMediaUnpreparedCount`
- `rtspEgressSessionCreatedCount`, `rtspEgressSessionStartedCount`, `rtspEgressSessionStoppedCount`, `rtspEgressSessionDestroyedCount`
- `rtspAppsrcPushOkCount`, `rtspAppsrcPushFailCount`
- `rtspPendingQueuePeak`, `rtspPendingQueueDroppedCount`
- `sharedStreamSubscriberAddedCount`, `sharedStreamSubscriberRemovedCount`
- `analysisTapAttachedCount`, `analysisTapDetachedCount`
- `metadataJsonBuildCount`, `metadataJsonBytesTotal`, `metadataJsonBytesMax`

## VA overlay 검증

기본 YOLO/ONNX overlay:

```bash
./server.sh verify-va
```

수동 RTSP overlay URL:

```bash
ffprobe -rtsp_transport tcp \
  'rtsp://127.0.0.1:8554/dhseo?file=va_four_scene_sample.mp4&va=1'
```

확인 기준:

- `va=1` 요청에서 bbox/class/confidence overlay 표시
- overlay wait/sync timeout 때문에 media pipeline이 blocking되지 않음
- debug overlay 기본값은 off
- TrackHealth/Scenario debug 정보는 debug mode에서만 표시

## vaRule 검증

Rule/Profile UI와 저장 rule 호출:

```bash
./server.sh verify-rule-ui
./server.sh verify-lab-layout
```

저장 rule 수동 URL:

```bash
ffprobe -rtsp_transport tcp \
  'rtsp://127.0.0.1:8554/dhseo?vaRule=1'
```

확인 기준:

- `vaRule=<number>`가 저장된 rule/profile/source를 사용
- rule에 연결된 source가 있는 경우 URL의 source override와 충돌하지 않음
- 기존 rule payload 구조와 외부 이벤트 출력 형식 유지
- 숫자 ID 범위와 자동 할당 정책이 UI에서 깨지지 않음

## Event POST 검증

Event POST schema:

```bash
./server.sh verify-event-post --mode schema
```

Event POST recovery/queue:

```bash
./server.sh verify-event-post --mode recovery
```

확인 기준:

- 기존 Intrusion / LineCrossing POST payload 형식 유지
- 신규 scenario event도 EventManager를 통해 emit
- POST 실패가 media pipeline 실패로 이어지지 않음
- queue/dedupe/cooldown counter가 무한 증가하지 않음
- EventRecord 조회 API는 저장된 metadata만 반환하며 영상 검색, snapshot 추출, clip recorder를 수행하지 않음

## Replay 검증

실제 영상 없이 metadata fixture로 회귀를 비교합니다.

```bash
./server.sh replay-va-metadata \
  --input test/fixtures/va_metadata_replay_basic.json \
  --output /tmp/va_metadata_replay.json
```

baseline fixture 전체 검증:

```bash
./server.sh verify-va-replay
```

검증 대상:

- Intrusion
- LineCrossing
- IntrusionDwell
- ReEntry
- WrongDirection
- IntrusionAfterLineCrossing
- Loitering
- cleanup
- lost/reacquired
- multichannel separation

## 다채널 검증

기본 다채널:

```bash
./server.sh verify-multichannel
```

VA 포함 다채널:

```bash
./server.sh verify-multichannel --include-va --repeat 2
```

단계별 수동 기준:

- 1채널: 기본 stream/session lifecycle 확인
- 2채널: streamId/channelId state 분리 확인
- 4채널: cleanup과 metrics count 확인
- 8채널 이상: CPU/memory 증가 추세와 queue 상한 확인

확인 기준:

- 같은 trackId가 다른 channel에서 충돌하지 않음
- 한 channel disconnect가 다른 channel에 영향 없음
- active track/scenario/event가 cleanup으로 잘못 삭제되지 않음

## Redaction 검증

Redaction은 개인정보 보호/모자이크 경로의 선택 검증입니다.

```bash
./server.sh verify-redaction
```

통합 테스트에 포함하려면:

```bash
./server.sh test --full
```

확인 기준:

- 대상 객체가 redaction 처리됨
- redaction 실패가 기본 streaming 실패로 이어지지 않음
- VA overlay/rule 경로와 같이 켰을 때 화면이 깨지지 않음

## 외부 접속 검증

서버가 LAN에서 접근 가능해야 할 때는 bind 주소와 출력 URL을 먼저 확인합니다.

```bash
./server.sh urls
./server.sh status
```

외부/LAN 포함 통합 검증:

```bash
./server.sh test --external
```

외부 source URL은 환경별 값으로 주입합니다. 문서에는 개인 IP/credential을 남기지 않습니다.

```bash
MEDIA_SERVER_TEST_EXTERNAL_RTSP_URLS='rtsp://example.local:8554/source' \
  ./server.sh test --external
```

TURN relay/auth는 운영 credential이 필요하므로 별도 검증으로 둡니다.

```bash
MEDIA_SERVER_VERIFY_WEBRTC_EXTERNAL_TURN_SERVER='turn://user:pass@example.local:3478' \
  ./server.sh verify-webrtc-ice
```

## 실패 시 로그 확인

서버 상태:

```bash
./server.sh status
./server.sh diagnose
```

background 로그:

```bash
tail -n 200 .media_server.log
tail -f .media_server.log
```

port listener:

```bash
lsof -nP -iTCP:8080 -sTCP:LISTEN
lsof -nP -iTCP:8554 -sTCP:LISTEN
```

WebRTC 상세 로그:

```bash
MEDIA_SERVER_WEBRTC_TRACE=1 ./server.sh foreground
```

GStreamer plugin:

```bash
gst-inspect-1.0 webrtcbin nicesrc nicesink
gst-inspect-1.0 rtph264pay rtph264depay h264parse
gst-inspect-1.0 uridecodebin
```

Replay 결과 차이는 누락/초과/불일치 이벤트를 먼저 확인합니다.

```bash
./server.sh verify-va-replay
```

## 최신 통과 기준 요약

현재 최신 기준은 Step 32 통합 검증 이후 다음 항목을 통과 대상으로 봅니다.

| 항목 | 기준 |
| --- | --- |
| Release build | GStreamer/ONNX 활성 Release build 성공 |
| 기본 streaming | file/RTSP/WebRTC smoke 통과 |
| 기존 Intrusion | 이벤트 타입/JSON/API/POST 형식 유지 |
| 기존 LineCrossing | 방향 계산과 이벤트 출력 형식 유지 |
| TrackStateManager | Active/Lost/Reacquired/Terminated, ring buffer, trajectory cap, cleanup |
| SceneContextBuilder | ZoneState, dwellTimeMs, LineCrossState, crossing direction 계산 |
| EventManager | dedupe, cooldown, lifecycle, stale state cleanup |
| ScenarioEngine | stream/channel별 instance 분리 |
| IntrusionDwell | Candidate -> Observing -> Confirmed -> Cooldown -> Ended |
| 신규 scenarios | ReEntry, WrongDirection, IntrusionAfterLineCrossing, Loitering replay 통과 |
| TrackHealth | 진단 metadata만 추가, tracking id 생성 방식 유지 |
| Appearance hook | 기본 NoOp, 실제 모델 호출 없음 |
| EventRecord/hook | JSON Lines, snapshot/clip hook 실패가 event emit을 막지 않음 |
| Cleanup | active track/scenario/event를 잘못 삭제하지 않음 |
| 다채널 | 같은 trackId가 다른 channel에서 충돌하지 않음 |

## 과거 이력 링크

날짜별 상세 검증 이력은 [history/verification-history.md](./history/verification-history.md)에 보관합니다.

현재 문서에는 지금 실행할 명령과 최신 통과 기준만 남깁니다. 과거 이력은 삭제하지 않고 history 문서에 누적합니다.
