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
