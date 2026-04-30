# Development Backlog

이 문서는 현재 남은 작업과 후속 로드맵만 관리합니다. 완료된 개발 이력은 [history/development-history.md](./history/development-history.md), 과거 검증 이력은 [history/verification-history.md](./history/verification-history.md)를 봅니다.

상태 표기:

- `예정`: 아직 구현하지 않은 작업
- `진행`: 현재 정리 또는 검토 중인 작업
- `실험`: 기본 비활성 또는 제한된 조건에서만 확인한 작업
- `보류`: 외부 credential, 모델, 운영 정책 등 선행 조건이 필요한 작업
- `완료`: 구현/검증 완료. 상세 이력은 history 문서에 보관

## 현재 상태 요약

- 구현 완료: RTSP/WebRTC relay, File/RTSP/WebRTC/HTTP-HLS source, YOLO/ONNX VA overlay, Rule/Profile UI, `vaRule=<id>` 호출, 기존 Intrusion/LineCrossing 이벤트 회귀 구조.
- 구현 완료: TrackStateManager, SceneContextBuilder, EventManager, ScenarioEngine, IntrusionDwell, ReEntry, WrongDirection, IntrusionAfterLineCrossing, Loitering, TrackHealth, cleanup 정책.
- 구현 완료: VA metadata replay, baseline fixture 비교, debug overlay/state dump, metrics, EventRecord file storage, snapshot/clip hook, WebRTC VA metadata DataChannel 출력 구조.
- 구현 완료: VA Metadata Runtime Console 1차. WebRTC Metadata Viewer, browser client-side overlay, Runtime Dashboard, SSE/WS metadata side-channel, RTSP overlay 정책 UI, 자동/longrun 검증 명령.
- 실험/제약: 실제 Re-ID extractor는 기본 비활성 실험 기능이며 모델/성능/개인정보 정책 확정이 필요합니다.
- 실험/제약: snapshot/clip은 hook/marker 중심이며 실제 제품용 frame extraction/clip recorder는 후속 구현입니다.
- 남은 핵심: 실제 30분/2시간 장시간 검증 재실행, 운영 이벤트 조회/보관, dashboard 고도화, custom metadata client 예제, 실제 현장 샘플 기반 튜닝입니다.

## P0 - 문서/UI 정리

### P0-1. 문서 구조 최종 QA

- 상태: 진행
- 목적: README와 `docs/*.md` 사이의 중복, 깨진 링크, 구현 완료/실험/예정 표현 혼선을 제거합니다.
- 관련 파일: `README.md`, `docs/ui-guide.md`, `docs/video-analysis.md`, `docs/media-server-architecture.md`, `docs/development-guide.md`, `docs/config-reference.md`, `docs/stream-verification.md`, `docs/development-backlog.md`
- 검증 명령:

```bash
git diff --check -- README.md docs
```

- 우선순위 이유: 문서가 다음 개발 지시와 검증 기준의 기준점이므로 먼저 안정화해야 합니다.

### P0-2. UI screenshot 최신화

- 상태: 예정
- 목적: README와 UI guide의 대표 화면이 실제 `/lab/rules` UI와 일치하도록 스크린샷을 갱신합니다.
- 관련 파일: `docs/assets/ui/`, `README.md`, `docs/ui-guide.md`, `scripts/internal/verify_lab_layout.mjs`
- 검증 명령:

```bash
./server.sh verify-lab-layout
```

- 우선순위 이유: UI 개편 후 문서의 첫인상과 실제 화면이 어긋나면 사용자 검수 비용이 커집니다.

### P0-3. 영상 분석 설정 UI 후속 피드백 반영

- 상태: 예정
- 목적: 룰 목록/편집/보기 탭에서 저장 피드백, 삭제 확인, source 매핑 안내, 개발자 URL 접힘 영역 같은 UX를 최종 점검합니다.
- 관련 파일: `src/ingress/webrtc_http_server.cpp`, `scripts/internal/rule_ui_smoke_check.mjs`, `docs/ui-guide.md`
- 검증 명령:

```bash
./server.sh verify-rule-ui
./server.sh verify-lab-layout
```

- 우선순위 이유: 현재 가장 자주 만지는 화면이며 rule 설정 오류가 VA 검증 오류로 이어질 수 있습니다.

## P1 - 안정화/검증

### P1-1. 30분 이상 다채널 soak 재실행

- 상태: 예정
- 목적: Step 32 이후 문서/UI/VA 변경 묶음 기준으로 memory/CPU/event/state count가 안정화되는지 확인합니다.
- 관련 파일: `scripts/internal/verify_predev_stability.sh`, `docs/stream-verification.md`
- 검증 명령:

```bash
./server.sh verify-predev --soak-minutes 30
```

- 우선순위 이유: 미디어 서버에서는 장시간 안정성이 기능 추가보다 먼저입니다.

### P1-2. VA Runtime Console 30분 이상 longrun

- 상태: 예정
- 목적: WebRTC metadata viewer, DataChannel 수신, dashboard polling, SSE side-channel, RTSP server-side overlay consumer가 함께 켜진 상태에서 RSS/CPU/session/tap/client cleanup을 확인합니다.
- 관련 파일: `scripts/internal/verify_va_runtime_console_longrun.py`, `scripts/internal/verify_webrtc_va_metadata.mjs`, `scripts/internal/va_metadata_stream_smoke.py`, `docs/stream-verification.md`
- 검증 명령:

```bash
./server.sh verify-va-runtime-console-longrun \
  --duration-minutes 30 \
  --clients 1 \
  --include-sidechannel \
  --include-dashboard \
  --include-rtsp
```

- 우선순위 이유: Runtime Console은 UI, WebRTC DataChannel, SSE client, RTSP overlay consumer가 동시에 붙기 때문에 단기 smoke만으로는 누수나 stalled 상태를 판단하기 어렵습니다.

### P1-3. 2시간 이상 장기 soak

- 상태: 예정
- 목적: 30분 테스트에서 보이지 않는 누적 memory, queue, event/state 증가를 확인합니다.
- 관련 파일: `scripts/internal/verify_predev_stability.sh`, `scripts/internal/verify_va_runtime_console_longrun.py`, `src/analysis/track_state_manager.cpp`, `src/analysis/event_manager.cpp`, `src/analysis/scenario_engine.cpp`
- 검증 명령:

```bash
./server.sh verify-predev --soak-minutes 120
./server.sh verify-va-runtime-console-longrun --duration-minutes 120 --clients 1 --include-sidechannel --include-dashboard --include-rtsp
```

- 우선순위 이유: 다채널 운영 환경에서는 작은 누수가 긴 시간 후 streaming 안정성 문제로 커질 수 있습니다.

### P1-4. VA state cleanup 전용 검증 추가

- 상태: 예정
- 목적: mock metadata로 track/scenario/event retention, cap, active state 보호를 빠르게 검증하는 전용 테스트를 추가합니다.
- 관련 파일: `scripts/internal/analysis_state_smoke.cpp`, `scripts/internal/verify_analysis_state_smoke.sh`, `src/analysis/track_state_manager.cpp`, `src/analysis/scenario_engine.cpp`, `src/analysis/event_manager.cpp`
- 검증 명령:

```bash
./server.sh verify-analysis-state
```

- 우선순위 이유: cleanup 버그는 다채널 장시간 테스트 전 작은 fixture로 먼저 잡아야 합니다.

### P1-5. WebRTC DataChannel browser 수신 자동화

- 상태: 완료
- 목적: offer/application m-line 확인을 넘어 browser에서 VA metadata message를 실제 수신하는 검증을 자동화합니다.
- 관련 파일: `src/ingress/webrtc_http_server.cpp`, `src/ingress/webrtc_egress_session.cpp`, `scripts/internal/verify_webrtc_va_metadata.mjs`
- 검증 명령:

```bash
./server.sh verify-webrtc-va-metadata --http-base http://127.0.0.1:8080
```

- 우선순위 이유: WebRTC metadata는 Lab client-side overlay와 Runtime Console의 핵심 입력이므로 실제 브라우저 수신 검증이 필요했습니다.

## P2 - 이벤트 운영

### P2-1. EventRecord 조회/검색 API

- 상태: 예정
- 목적: 저장된 EventRecord를 eventId, eventType, streamId/channelId, trackId, 시간 범위로 조회할 수 있게 합니다.
- 관련 파일: `include/analysis/event_storage.h`, `src/analysis/event_storage.cpp`, `src/ingress/webrtc_http_server.cpp`, `docs/video-analysis.md`
- 검증 명령:

```bash
./server.sh verify-event-post --mode schema
./server.sh verify-va-replay
```

- 우선순위 이유: 이벤트를 저장만 하고 조회하지 못하면 운영 화면과 사후 분석으로 이어지기 어렵습니다.

### P2-2. EventRecord retention/rotation/recovery

- 상태: 예정
- 목적: JSON Lines 파일 증가, corruption, 서버 재시작 후 복구 정책을 정리합니다.
- 관련 파일: `src/analysis/event_storage.cpp`, `include/analysis/event_storage.h`, `docs/config-reference.md`
- 검증 명령:

```bash
./server.sh verify-event-post --mode recovery
```

- 우선순위 이유: 이벤트 저장은 운영 데이터이므로 장기 보관 정책과 실패 복구가 필요합니다.

### P2-3. Runtime status에 VA/event metric 노출

- 상태: 예정
- 목적: active/lost/terminated track, scenario instance, event emitted/dedup, cleanup count를 `/lab/runtime/status`에서 확인합니다.
- 관련 파일: `src/analysis/event_rule_engine.cpp`, `src/analysis/track_state_manager.cpp`, `src/analysis/event_manager.cpp`, `src/ingress/webrtc_http_server.cpp`
- 검증 명령:

```bash
./server.sh verify-analysis-state
./server.sh verify-lab-layout
```

- 우선순위 이유: 장시간 테스트 중 내부 상태가 무한 증가하는지 UI/API로 바로 봐야 합니다.

### P2-4. Event POST 활성/비활성 smoke 분리

- 상태: 예정
- 목적: Event POST가 꺼진 기본 서버와 켜진 서버의 기대 결과를 test output에서 명확히 분리합니다.
- 관련 파일: `scripts/internal/test_all.sh`, `scripts/internal/verify_event_post_dispatch.sh`, `src/analysis/event_post_dispatcher.cpp`
- 검증 명령:

```bash
./server.sh test --full
./server.sh verify-event-post --mode schema
./server.sh verify-event-post --mode recovery
```

- 우선순위 이유: POST 설정 차이 때문에 통합 검증 결과 해석이 흐려지는 문제를 줄입니다.

## P3 - UI/제품화

### P3-1. Scenario timeline/debug UI

- 상태: 예정
- 목적: track별 first seen, dwell time, zone 이동, ScenarioPhase, 중복 억제 상태를 timeline으로 표시합니다.
- 관련 파일: `src/ingress/webrtc_http_server.cpp`, `src/analysis/event_rule_engine.cpp`, `docs/ui-guide.md`
- 검증 명령:

```bash
./server.sh verify-rule-ui
./server.sh verify-lab-layout
```

- 우선순위 이유: 상황 기반 이벤트는 내부 상태가 보이지 않으면 오탐/미탐 원인 분석이 어렵습니다.

### P3-2. `vaRule` runtime debug view

- 상태: 진행
- 목적: 선택한 rule의 active tracks, scene context, scenario instances, event lifecycle, cleanup metric을 실시간으로 표시합니다. 1차 Runtime Dashboard는 구현됐고, rule별 drill-down과 timeline은 후속입니다.
- 관련 파일: `src/ingress/webrtc_http_server.cpp`, `src/analysis/event_rule_engine.cpp`, `docs/ui-guide.md`
- 검증 명령:

```bash
./server.sh verify-analysis-state
./server.sh verify-lab-layout
```

- 우선순위 이유: 저장 rule과 실제 실행 rule이 일치하는지 운영자가 확인할 수 있어야 합니다.

### P3-3. Tracking issue report UI

- 상태: 진행
- 목적: overlapRisk, missedFrame spike, directionChange spike, lost/reacquired 기록을 Runtime Dashboard/state dump에 연결했습니다. 사람이 보기 쉬운 table/timeline UI는 후속입니다.
- 관련 파일: `src/analysis/track_state_manager.cpp`, `src/analysis/event_rule_engine.cpp`, `docs/ui-guide.md`
- 검증 명령:

```bash
./server.sh verify-tracker-stability --long --overlap-focus
```

- 우선순위 이유: direction-based tracking의 한계를 보완하기 전에 실제 실패 패턴을 볼 수 있어야 합니다.

### P3-4. EventRecord 검색 UI

- 상태: 예정
- 목적: 이벤트 목록, 필터, EventRecord detail, snapshot/clip link placeholder를 Lab에서 확인합니다.
- 관련 파일: `src/ingress/webrtc_http_server.cpp`, `src/analysis/event_storage.cpp`, `docs/ui-guide.md`
- 검증 명령:

```bash
./server.sh verify-lab-layout
./server.sh verify-event-post --mode schema
```

- 우선순위 이유: 이벤트 운영 기능은 저장 API만으로는 제품 사용 흐름이 완성되지 않습니다.

### P3-5. Runtime Dashboard 고도화

- 상태: 예정
- 목적: 현재 카드/JSON 중심 dashboard를 stream/rule/tap별 drill-down, trend sparkline, stale warning, cleanup warning 중심으로 정리합니다.
- 관련 파일: `src/ingress/webrtc_http_server.cpp`, `scripts/internal/verify_va_runtime_console_longrun.py`, `docs/ui-guide.md`
- 검증 명령:

```bash
./server.sh verify-lab-layout
./server.sh verify-va-runtime-console
./server.sh verify-va-runtime-console-longrun --duration-minutes 30 --clients 1 --include-sidechannel --include-dashboard
```

- 우선순위 이유: Runtime Console은 운영자가 현재 분석 상태를 빠르게 판단하는 화면이므로 raw JSON보다 시각적 요약이 필요합니다.

## P4 - 시나리오 확장

### P4-1. Scenario rule payload를 runtime per-rule 설정으로 연결

- 상태: 예정
- 목적: UI에서 저장한 scenario rule 조건이 runtime ScenarioEngine의 per-rule 설정으로 일관되게 적용되도록 정리합니다.
- 관련 파일: `src/ingress/analysis_query.cpp`, `src/analysis/event_rule_engine.cpp`, `src/analysis/scenario_engine.cpp`, `include/analysis/scenario_engine.h`
- 검증 명령:

```bash
./server.sh verify-rule-ui
./server.sh verify-va-replay
```

- 우선순위 이유: env 기반 scenario와 저장 rule 기반 scenario가 혼동되면 현장 설정 재현성이 떨어집니다.

### P4-2. Loitering 실제 샘플 튜닝

- 상태: 예정
- 목적: 실제 CCTV 샘플에서 dwell time, movement radius, trajectory point 기준을 조정합니다.
- 관련 파일: `src/analysis/loitering_scenario.cpp`, `test/fixtures/va_replay/loitering_metadata.json`, `docs/video-analysis.md`
- 검증 명령:

```bash
./server.sh verify-va-replay
./server.sh verify-va-events --long
```

- 우선순위 이유: Loitering은 threshold 민감도가 높아 fixture만으로 제품 품질을 판단하기 어렵습니다.

### P4-3. ZoneOccupancyScenario

- 상태: 예정
- 목적: 특정 zone 내부 동시 track 수가 threshold 이상일 때 crowd/occupancy 이벤트를 발생시킵니다.
- 관련 파일: `src/analysis/scenario_engine.cpp`, `src/analysis/scene_context_builder.cpp`, `include/analysis/scenario_engine.h`, `test/fixtures/va_replay/`
- 검증 명령:

```bash
./server.sh verify-va-replay
./server.sh verify-analysis-state
```

- 우선순위 이유: 침입/체류 다음으로 운영 현장에서 이해하기 쉬운 zone 기반 scenario입니다.

### P4-4. 후속 scenario 후보 정리

- 상태: 예정
- 목적: LineDwell, StoppedVehicle, AbandonedObjectCandidate를 최소 구현 후보로 구체화합니다.
- 관련 파일: `docs/video-analysis.md`, `docs/config-reference.md`, `src/analysis/`
- 검증 명령:

```bash
./server.sh verify-va-replay
```

- 우선순위 이유: scenario를 무작정 늘리기 전에 상태 머신, fixture, UI 노출 기준을 먼저 맞춰야 합니다.

## P5 - Tracking/Re-ID 고도화

### P5-1. 실제 샘플 기반 TrackHealth threshold 수집

- 상태: 예정
- 목적: overlapRisk, missedFrameCount, directionChangeCount 기준을 실제 영상에서 수집해 report threshold를 조정합니다.
- 관련 파일: `src/analysis/track_state_manager.cpp`, `scripts/internal/verify_tracker_stability.sh`, `docs/video-analysis.md`
- 검증 명령:

```bash
./server.sh verify-tracker-stability --long --overlap-focus
```

- 우선순위 이유: tracker를 바꾸기 전에 현재 direction-based tracker가 어디서 흔들리는지 수치화해야 합니다.

### P5-2. Association 보강 전후 replay 비교

- 상태: 예정
- 목적: IoU + center distance + direction + class score 적용 전후 event 결과와 tracking issue 감소율을 비교합니다.
- 관련 파일: `src/analysis/object_tracker.cpp`, `src/analysis/track_state_manager.cpp`, `test/fixtures/va_replay/`
- 검증 명령:

```bash
./server.sh verify-va-replay
./server.sh verify-analysis-state
```

- 우선순위 이유: association 개선은 이벤트 결과를 바꿀 수 있으므로 replay 비교가 필수입니다.

### P5-3. Lost/reacquired 장기 검증

- 상태: 예정
- 목적: 짧은 detection 누락에서 같은 track이 유지되고, lost buffer가 무한 증가하지 않는지 확인합니다.
- 관련 파일: `src/analysis/track_state_manager.cpp`, `test/fixtures/va_replay/reacquire_metadata.json`
- 검증 명령:

```bash
./server.sh verify-va-replay
./server.sh verify-predev --soak-minutes 30
```

- 우선순위 이유: 상황 기반 이벤트는 track 시간 연속성이 핵심입니다.

### P5-4. 실제 Re-ID enabled 모델 benchmark

- 상태: 실험
- 목적: 기본 disabled 상태를 유지하면서 모델 파일이 있을 때만 Re-ID extractor 성능과 품질을 측정합니다.
- 관련 파일: `src/analysis/appearance_extractor.cpp`, `src/analysis/track_state_manager.cpp`, `docs/config-reference.md`
- 검증 명령:

```bash
./server.sh verify-analysis-state
```

- 우선순위 이유: Re-ID는 다채널 CPU/GPU 비용과 개인정보 영향이 커서 실험 결과 없이 기본 기능으로 승격하면 안 됩니다.

### P5-5. Appearance/embedding 운영 정책

- 상태: 예정
- 목적: embedding 저장 기간, 암호화/삭제, 개인정보 안내, attribute extractor 유지 여부를 정리합니다.
- 관련 파일: `docs/video-analysis.md`, `docs/config-reference.md`, `src/analysis/appearance_extractor.cpp`
- 검증 명령:

```bash
git diff --check -- docs
```

- 우선순위 이유: appearance 기능은 기술 구현보다 운영 정책과 안전장치가 먼저 필요합니다.

## P6 - Snapshot/clip hook

### P6-1. 실제 snapshot frame extraction

- 상태: 예정
- 목적: EventRecord 발생 시점의 frame snapshot을 저장하고 `snapshotPath`와 연결합니다.
- 관련 파일: `src/analysis/snapshot_encoder.cpp`, `src/analysis/event_manager.cpp`, `src/analysis/event_storage.cpp`
- 검증 명령:

```bash
./server.sh verify-va-replay
./server.sh verify-event-post --mode schema
```

- 우선순위 이유: 이벤트 사후 확인에는 텍스트 record보다 snapshot이 먼저 필요합니다.

### P6-2. Pre/post event clip recorder

- 상태: 예정
- 목적: 제한된 ring buffer로 이벤트 전후 clip을 저장하고 `clipPath`와 연결합니다.
- 관련 파일: `src/core/shared_stream.cpp`, `src/analysis/event_manager.cpp`, `src/analysis/event_storage.cpp`
- 검증 명령:

```bash
./server.sh verify-predev --soak-minutes 30
```

- 우선순위 이유: clip recorder는 frame buffer와 encoder 부하가 있어 streaming 안정성 검증이 필수입니다.

### P6-3. Snapshot/clip retention과 실패 metric

- 상태: 예정
- 목적: 저장 실패 counter, retention/rotation, disk 사용량 상한을 config와 runtime status에 연결합니다.
- 관련 파일: `src/analysis/event_storage.cpp`, `src/analysis/event_rule_engine.cpp`, `docs/config-reference.md`
- 검증 명령:

```bash
./server.sh verify-analysis-state
./server.sh verify-lab-layout
```

- 우선순위 이유: 파일 저장 기능은 디스크를 무제한 사용하지 않도록 운영 보호가 필요합니다.

## P7 - 외부 연동

### P7-1. 운영 TURN relay/auth 검증

- 상태: 보류
- 목적: 실제 TURN credential로 WebRTC relay/auth 경로를 end-to-end 검증합니다.
- 관련 파일: `src/ingress/webrtc_http_server.cpp`, `docs/stream-verification.md`, `docs/config-reference.md`
- 검증 명령:

```bash
MEDIA_SERVER_VERIFY_WEBRTC_EXTERNAL_TURN_SERVER='turn://user:pass@example.local:3478' \
  ./server.sh verify-webrtc-ice
```

- 우선순위 이유: 외부 네트워크 WebRTC 운영에는 TURN 검증이 필요하지만 credential이 선행되어야 합니다.

### P7-2. WebRTC metadata client schema/example

- 상태: 진행
- 목적: DataChannel VA metadata JSON schema와 browser client 예제를 분리 문서화합니다. Lab viewer와 검증 스크립트는 구현됐고, 독립 예제 문서/샘플은 후속입니다.
- 관련 파일: `src/ingress/webrtc_egress_session.cpp`, `scripts/internal/verify_webrtc_va_metadata.mjs`, `docs/media-server-architecture.md`, `docs/video-analysis.md`
- 검증 명령:

```bash
./server.sh verify-webrtc-va-metadata
```

- 우선순위 이유: 영상과 별도 metadata를 UI에서 쓰려면 message contract가 명확해야 합니다.

### P7-3. WebSocket metadata 제어 기능 검토

- 상태: 보류
- 목적: 현재 WebSocket은 SSE와 같은 단방향 metadata stream 최소 구현입니다. client command, filter, subscribe/unsubscribe 제어가 실제로 필요한지 운영 UI 요구와 함께 검토합니다.
- 관련 파일: `src/ingress/webrtc_http_server.cpp`, `scripts/internal/verify_ws_va_metadata.mjs`, `docs/video-analysis.md`
- 검증 명령:

```bash
./server.sh verify-ws-metadata
```

- 우선순위 이유: 단순 수신은 SSE로 충분하므로 WebSocket 제어 기능은 custom client 요구가 명확해진 뒤 확장해야 합니다.

### P7-4. Custom RTSP + metadata client 예제

- 상태: 예정
- 목적: RTSP raw stream과 SSE/WS metadata side-channel을 함께 받아 client-side overlay를 그리는 최소 예제를 제공합니다. 일반 VLC/ffplay에 metadata UI가 생기는 기능은 아닙니다.
- 관련 파일: `scripts/internal/va_metadata_stream_smoke.py`, `docs/ui-guide.md`, `docs/stream-verification.md`
- 검증 명령:

```bash
./server.sh verify-rtsp-va-overlay-policy
./server.sh verify-va-metadata-sidechannel
```

- 우선순위 이유: RTSP 일반 viewer와 custom client의 차이를 실제 예제로 보여줘야 현장 연동 혼선을 줄일 수 있습니다.

### P7-5. Event JSON schema/OpenAPI 분리

- 상태: 예정
- 목적: 기존 외부 이벤트 JSON/API/POST 형식을 별도 schema 문서 또는 OpenAPI로 정리합니다.
- 관련 파일: `docs/video-analysis.md`, `src/analysis/event_manager.cpp`, `src/analysis/event_post_dispatcher.cpp`
- 검증 명령:

```bash
./server.sh verify-event-post --mode schema
```

- 우선순위 이유: 외부 연동이 늘어날수록 payload 변경 금지 원칙을 문서 계약으로 고정해야 합니다.

### P7-6. YouTube import/source 유지 여부 결정

- 상태: 보류
- 목적: 실험 기능으로 남길지, import만 유지할지, source 직접 표출을 제거할지 결정합니다.
- 관련 파일: `docs/youtube-import.md`, `src/core/source_factory.cpp`, `src/ingress/lab_import_manager.cpp`
- 검증 명령:

```bash
./server.sh verify-lab-import-ui
```

- 우선순위 이유: 외부 서비스 정책/권한 영향이 있어 core streaming 안정화와 분리해 판단해야 합니다.

## 완료 이력 링크

완료된 과거 작업은 삭제하지 않고 [history/development-history.md](./history/development-history.md)에 보관합니다.

현재 history 문서에는 다음 묶음이 보존되어 있습니다.

- 1차 - Rule/Profile 안정화
- 2차 - Category/Rule Engine 정밀화
- 3차 - Overlay/Tracker 안정화
- 4차 - YOLO/Adaptive/WebRTC/URI 검증
- 5차 - YouTube/import와 Lab 통합
- 6차 - 다채널/리포트/Predev 안정화
- 7차 - Test mode 분리와 redaction
- 8차 - 상황 기반 VA Step 0-11
- 9차 - Step 12-19 검증/운영 도구
- 10차 - Step 20-28 Scenario/Tracking/Geometry
- 11차 - Step 29-32 Re-ID/성능/통합
