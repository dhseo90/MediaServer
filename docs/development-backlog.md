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
- 구현 완료: VA metadata replay, baseline fixture 비교, debug overlay/state dump, metrics, EventRecord file storage/query/search UI, EventRecord rotation/retention/recovery 1차, snapshot/clip hook, WebRTC VA metadata DataChannel 출력 구조.
- 구현 완료: VA Metadata Runtime Console 1차. WebRTC Metadata Viewer, browser client-side overlay, Runtime Dashboard drill-down, client-side Trend/Stale/Cleanup warning 1차, vaRule Runtime Debug 1차, SSE/WS metadata side-channel, RTSP overlay 정책 UI, custom SSE metadata client 예제, Custom RTSP+SSE overlay renderer 예제, IntrusionDwell/ReEntry/WrongDirection/IntrusionAfterLineCrossing scenario UI 템플릿, 자동/longrun 검증 명령.
- 구현 완료: Auth / Role / Scope, account login/session MVP, SourceRegistry / PublishedView MVP, client scoped view API 1차, Client scoped dashboard MVP.
- 실험/제약: 실제 Re-ID extractor는 기본 비활성 실험 기능이며 모델/성능/개인정보 정책 확정이 필요합니다.
- 실험/제약: snapshot/clip은 hook/marker 중심이며 실제 제품용 frame extraction/clip recorder는 후속 구현입니다.
- 신규 우선순위: Auth / Role / Scope, SourceRegistry / PublishedView, `/ops` / `/client` / `/lab` route 분리, Client scoped dashboard, Client Live Monitor, Operator Live Monitor, Analysis tap reuse / fanout 검증입니다.
- 후속/보류: 기존 Scenario UI 5~6번인 Loitering UI 템플릿과 ZoneOccupancyScenario는 신규 운영/클라이언트 분리 로드맵 이후 재개합니다.
- 남은 후속: EventRecord archive query/compaction, 정밀 scenario timeline, Runtime Dashboard trend/stale/cleanup warning 고도화(sparkline/장기 baseline), WS metadata filter/subscription/control, 실제 현장 샘플 기반 튜닝입니다.

## 신규 우선순위 - 운영/클라이언트 분리

이 섹션은 기존 Scenario UI 로드맵 1~4번 완료 이후의 다음 작업 순서입니다. Loitering UI 템플릿과 ZoneOccupancyScenario는 아래 운영/클라이언트 분리 기준이 잡힌 뒤 후속으로 재개합니다.

### O1. Auth / Role / Scope

- 상태: 완료: token auth + account session MVP
- 목적: 운영자, 클라이언트, lab 사용자 권한과 요청 scope 기준을 먼저 정의합니다.
- 완료 범위: `MEDIA_SERVER_AUTH_MODE=off|token|session`, role별 token env, users file, libsodium passwordHash 검증, HttpOnly session cookie, Principal 구조, Bearer/query token 해석, `RequireRole`/`RequireScope` guard helper, `/login`, `/logout`, `/auth/whoami`, 임시 `/ops`/`/client` landing 1차입니다.
- 후속: route별 상세 guard 적용과 `/ops` / `/client` / `/lab` 화면 분리는 다음 묶음에서 진행합니다.
- 우선순위 이유: route, source/view 노출, dashboard/live monitor 접근 정책의 공통 전제가 됩니다.

### O2. SourceRegistry / PublishedView

- 상태: 완료: MVP
- 목적: 내부 source 관리와 클라이언트에 공개되는 view 모델을 분리합니다.
- 완료 범위: `.media_server.sources.json`, `.media_server.views.json`, `MEDIA_SERVER_SOURCE_REGISTRY`, `MEDIA_SERVER_PUBLISHED_VIEWS`, `/ops/api/sources`, `/ops/api/views`, `/client/api/views`, `/client/api/views/{viewId}`, canonical source 중복 차단, `/ops/sources` JSON/form MVP입니다.
- 후속: PublishedView 기반 client live monitor, route별 세부 guard, source lifecycle와 live monitor 연결은 다음 묶음에서 진행합니다.
- 우선순위 이유: source 원본 설정, 운영자 제어, 클라이언트 노출 범위를 한 모델로 섞지 않기 위한 선행 작업입니다.

### O3. `/ops` / `/client` / `/lab` route 분리

- 상태: 완료: MVP
- 목적: 운영 화면, 클라이언트 화면, 개발/lab 화면의 URL과 역할을 분리합니다.
- 완료 범위: `MEDIA_SERVER_UI_DEFAULT_HOME`, `MEDIA_SERVER_ENABLE_LAB`, `MEDIA_SERVER_ENABLE_OPS`, `MEDIA_SERVER_ENABLE_CLIENT`, role-aware `/` redirect, `/ops/live` shell, `/client/live` shell, `/ops/rules` alias, `/lab` guard와 기존 `/lab/rules` 호환 유지입니다.
- 후속: 실제 live monitor를 PublishedView/source runtime 데이터에 연결합니다.
- 우선순위 이유: 현재 lab 중심 UI에서 운영/고객 화면으로 확장할 때 권한과 탐색 구조가 명확해야 합니다.

### O4. Client scoped dashboard

- 상태: 완료: MVP
- 목적: 클라이언트 scope에 맞는 source/view/event 요약 dashboard를 구성합니다.
- 완료 범위: `/client/dashboard`, `/client/api/views/{viewId}/dashboard`, `/client/api/views/{viewId}/events?limit=...`, PublishedView `showDashboard`/`showEvents` 플래그, `dashboard:read:{viewId}`/`event:read:{viewId}` scope guard, source/profile tap snapshot 기반 health/stale 요약, sanitized event summary입니다.
- 보안/노출 정책: source 원본 URL, Developer URL, raw JSON, debugCounters, analysisTapId, internal session id, rule/profile editor, Event POST 설정, SSE/WS 전체 endpoint는 client dashboard 응답과 화면에 노출하지 않습니다.
- 우선순위 이유: 운영자용 runtime/debug 정보와 클라이언트용 상태 요약을 분리해야 합니다.

### O5. Client Live Monitor

- 상태: 예정
- 목적: PublishedView 기반 클라이언트용 live monitor 화면을 정의합니다.
- 우선순위 이유: 클라이언트 화면은 허용된 view와 이벤트만 노출해야 하므로 SourceRegistry/PublishedView 이후에 진행합니다.

### O6. Operator Live Monitor

- 상태: 예정
- 목적: 운영자가 source, runtime 상태, event, analysis tap 상태를 함께 볼 수 있는 live monitor를 정의합니다.
- 우선순위 이유: 운영 화면은 장애 대응과 source 제어가 핵심이라 클라이언트 화면과 다른 정보 밀도가 필요합니다.

### O7. Analysis tap reuse / fanout 검증

- 상태: 완료: source+profile reuse MVP
- 목적: source+analysis profile 기준으로 analysis tap을 재사용하고 metadata fanout, rule/scenario evaluation, cleanup lifecycle이 안정적인지 검증합니다.
- 완료 범위: source/profile reuse key, logical refcount, per-source active profile/tap cap, `analysisTapCreated/Reused/Rejected/RefCount/ReuseKey` debug counter, Runtime Dashboard reuse summary, `verify-multichannel --include-va`의 dedup tap 기대값 반영입니다.
- 후속: Client/Operator Live Monitor에서 PublishedView별 overlay 정책과 operator debug profile 선택을 연결할 때, profile fanout UI와 cap 초과 안내를 더 촘촘히 다듬습니다.
- 우선순위 이유: live monitor가 여러 화면으로 분리되면 tap 중복 생성과 fanout 부하가 streaming 안정성에 직접 영향을 줍니다.

## P0 - 문서/UI 정리

### P0-1. 문서 구조 최종 QA

- 상태: 완료
- 목적: README와 `docs/*.md` 사이의 중복, 깨진 링크, 구현 완료/실험/예정 표현 혼선을 제거합니다.
- 관련 파일: `README.md`, `docs/ui-guide.md`, `docs/video-analysis.md`, `docs/media-server-architecture.md`, `docs/development-guide.md`, `docs/config-reference.md`, `docs/stream-verification.md`, `docs/development-backlog.md`
- 검증 명령:

```bash
git diff --check -- README.md docs
```

- 우선순위 이유: 문서가 다음 개발 지시와 검증 기준의 기준점이므로 먼저 안정화해야 합니다.

### P0-2. UI screenshot 최신화

- 상태: 완료
- 목적: README와 UI guide의 대표 화면이 실제 `/lab/rules` UI와 일치하도록 스크린샷을 갱신합니다.
- 관련 파일: `docs/assets/ui/`, `README.md`, `docs/ui-guide.md`, `scripts/internal/verify_lab_layout.mjs`
- 완료 범위:
  - dark mode 기준 대표 screenshot 갱신
  - `analysis-rule-list`, `analysis-rule-editor-basic`, `analysis-rule-editor-scenario`
  - `analysis-region-canvas`, `analysis-preview`, `analysis-developer-url`
  - Runtime Dashboard section crop: `analysis-runtime-dashboard`, `analysis-runtime-dashboard-trend`, `analysis-runtime-dashboard-metadata`, `analysis-runtime-dashboard-runtime`, `analysis-runtime-dashboard-tracks`, `analysis-runtime-dashboard-scenarios`, `analysis-runtime-dashboard-records`, `analysis-runtime-dashboard-tracking-issues`
  - 영상 화면은 실제 객체가 보이는 `va_four_scene_sample.mp4` 기준으로 캡처
  - 영상/캔버스 하단이 잘리지 않도록 section 경계 기준으로 재캡처
  - Runtime Dashboard는 active analysis tap 데이터가 있는 Health Summary/Controls, Warnings/Trend, Metadata/Backpressure, Runtime Detail, Tracks, Scenarios/Events, Event Records, Tracking Issues 구간별 crop으로 교체
  - 이미지 내부 개인 절대경로 제거
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

- 상태: 진행
- 목적: WebRTC metadata viewer, DataChannel 수신, dashboard polling, SSE side-channel, RTSP server-side overlay consumer가 함께 켜진 상태에서 RSS/CPU/session/tap/client cleanup과 connect/disconnect cycle 후 idle baseline RSS를 확인합니다.
- 관련 파일: `scripts/internal/verify_va_runtime_console_longrun.py`, `scripts/internal/verify_va_runtime_console_cycles.py`, `scripts/internal/verify_webrtc_va_metadata.mjs`, `scripts/internal/va_metadata_stream_smoke.py`, `docs/stream-verification.md`
- 검증 명령:

```bash
./server.sh verify-va-runtime-console-longrun \
  --duration-minutes 30 \
  --clients 1 \
  --include-sidechannel \
  --include-dashboard \
  --include-rtsp

./server.sh verify-va-runtime-console-cycles \
  --cycles 10 \
  --active-minutes 5 \
  --idle-minutes 2 \
  --clients 1 \
  --include-sidechannel \
  --include-dashboard \
  --include-rtsp
```

- 우선순위 이유: Runtime Console은 UI, WebRTC DataChannel, SSE client, RTSP overlay consumer가 동시에 붙기 때문에 단기 smoke만으로는 누수나 stalled 상태를 판단하기 어렵습니다. Cycle 검증은 active peak 증가와 idle baseline 누적 증가를 분리하기 위한 선택 검증입니다.

### P1-3. VA Runtime Console RSS WARNING: RTSP/GStreamer egress 및 Full fanout 후보 후속 검증

- 상태: 완료 / stable 승격 가능
- 목적: VA Runtime Console 안정화 트랙에서 기능, cleanup, port cleanup은 통과했고 RSS WARNING 해제 가능 근거와 30분 predev 회귀 검증 통과를 함께 추적합니다. active 구간 RSS high-water 관찰은 유지하되, Runtime Console은 stable 승격 가능 상태로 판단합니다.
- 관련 파일: `scripts/internal/verify_va_runtime_console_longrun.py`, `scripts/internal/verify_va_runtime_console_cycles.py`, `src/ingress/gstreamer_rtsp_server.cpp`, `src/ingress/rtsp_egress_session.cpp`, `src/core/shared_stream.cpp`, `src/analysis/va_runtime_metadata.cpp`, `src/ingress/webrtc_http_server.cpp`, `docs/stream-verification.md`
- 확인 결과:
  - 최종 판정: RSS WARNING 해제 가능입니다. 단, active 구간 RSS plateau는 뚜렷하지 않아 allocator high-water 또는 GStreamer/WebRTC buffer pool retention 관찰 메모는 유지합니다.
  - RTSP-only 5-cycle: `PASS`. Summary는 `/tmp/media_server_va-runtime-cycles-1777636885-89479_summary.json`입니다.
  - RTSP-only 세부: `monotonicIdleRssIncrease=false`, cleanup/port cleanup 정상, lifecycle counter 균형, pending queue 잔여 `0`, `appsrcPushAfterStopCount=0`입니다.
  - RTSP-only flow return은 FLUSHING 중심이며 `ERROR` / `NOT_LINKED` / `NOT_NEGOTIATED` / `OTHER`는 없습니다.
  - Full 20-cycle: `PASS`. Summary는 `/tmp/media_server_va-runtime-cycles-1777639240-94883_summary.json`입니다.
  - Full 20-cycle 세부: idle RSS 단조 증가 없음, cleanup/port cleanup 정상, RTSP lifecycle/probe/bus watch counter 균형입니다.
  - Full 20-cycle cleanup failure: pending queue stop/destroy 잔여 `0`, metadata/DataChannel/SSE cleanup failure 없음.
  - 120m full + 30m idle-after-cleanup: `PASS`. Summary는 `/tmp/media_server_va-runtime-longrun-1777648583-19035_summary.json`입니다. active last-30m는 `+51.77MiB`, `+1.726MiB/min`로 plateau가 뚜렷하지 않았습니다. cleanup 후 30분 idle RSS는 `642.97MiB -> 642.67MiB`로 유지/하락했습니다.
  - 30분 predev 회귀 검증: `PASS`. Summary는 `/tmp/media_server_predev-1777679318-64004_summary.json`, report는 `/tmp/media_server_predev-1777679318-64004_report.md`입니다. 결과는 `pass=69`, `fail=0`, `skip=1`이며 port cleanup과 runtime idle cleanup이 정상입니다.
  - 기능 실패, crash, child process 실패, cleanup 실패, port cleanup 실패, DataChannel failure는 없습니다.
  - cleanup 후 activeSessions, activeStreams, activeAnalysisTaps, SSE/WS clients, RTSP consumers는 모두 0입니다.
  - idle-after-cleanup 해석: cleanup 후 RSS 증가 지속은 보이지 않아 lifecycle leak 가능성은 낮고, allocator high-water 또는 GStreamer/WebRTC buffer pool retention 후보가 더 강합니다.
  - active 구간 high-water 관찰은 유지합니다. active RSS 증가만으로 리소스 잔여를 단정하지 않습니다.
- 최종 판정:
  - 기능 안정성: PASS
  - cleanup 안정성: PASS
  - port cleanup: PASS
  - 메모리 안정성: RSS WARNING 해제 가능 후보
  - Runtime Console stable 승격: 가능
- HOLD/FAIL이 아닌 이유: crash, child process 실패, cleanup count 잔류, port listener 잔류가 없습니다.
- 원인 후보:
  - allocator high-water / GStreamer-WebRTC buffer pool retention
  - Full fanout / tap 공유 / VaRuntimeMetadataBuilder / JSON serialization 조합의 active high-water
  - RTSP overlay consumer / GStreamer egress / server-side overlay path는 lifecycle/queue/probe counter 기준으로 잔여 가능성이 낮아졌습니다.
- 후속 방향:
  - 추가 장시간 반복보다 기존 계측 결과를 기준으로 active high-water/retention 경향을 문서화합니다.
  - Runtime Console stable 승격은 가능 상태로 전환하되, active 구간 high-water 관찰 메모는 유지합니다.
- 1차 최소 debug counter 구현:
  - `/lab/runtime/status`의 내부 `debugCounters` 블록과 longrun/cycle summary/report에 counter 최종값을 노출합니다.
  - RTSP/GStreamer egress release: `OnMediaConfigure` / `OnMediaUnprepared`, RTSP egress session `Start` / `Stop` / destructor, appsrc push ok/fail, pending queue peak/drop을 계측합니다.
  - fanout lifecycle: SharedStream subscriber add/remove, Analysis tap attach/detach를 계측합니다.
  - metadata fanout: VaRuntimeMetadataBuilder build count와 JSON payload bytes total/max를 계측합니다.
  - 기존 RTSP/WebRTC streaming flow, GStreamer pipeline 구성, Event POST/WebRTC/SSE metadata payload schema는 변경하지 않습니다.
  - lifecycle trace log는 기본 off이며 필요할 때만 `MEDIA_SERVER_RUNTIME_DEBUG_COUNTER_TRACE=1`로 켭니다.
- 보류 조건:
  - `./server.sh verify-predev --soak-minutes 120`은 상시 실행하지 않고 release candidate 또는 고위험 변경 gate로만 실행합니다.
  - active 구간 RSS high-water 관찰은 계속 남깁니다.
- 우선순위 이유: 기능과 cleanup은 안정적으로 동작하고 cleanup 후 idle RSS도 유지/하락했으며 30분 predev 회귀도 통과했습니다. 다만 active 구간 RSS high-water가 남아 있으므로 120분 predev는 조건부 장기 gate로 분리합니다.

### P1-4. 2시간 이상 장기 soak

- 상태: 조건부 gate
- 목적: 30분 테스트에서 보이지 않는 누적 memory, queue, event/state 증가를 확인합니다. RSS WARNING은 해제 가능 후보로 전환됐지만, release candidate 또는 고위험 streaming/VA fanout 변경 전에는 120분 predev로 한 번 더 확인합니다.
- 관련 파일: `scripts/internal/verify_predev_stability.sh`, `scripts/internal/verify_va_runtime_console_longrun.py`, `src/analysis/track_state_manager.cpp`, `src/analysis/event_manager.cpp`, `src/analysis/scenario_engine.cpp`
- 실행 조건:
  - release candidate 전 최종 안정성 확인
  - RTSP/GStreamer egress, WebRTC media path, SharedStream fanout, VA metadata serialization, dashboard/SSE/WS fanout 변경 후
  - GStreamer/WebRTC/ONNX runtime 등 장시간 allocator 또는 buffer pool 동작에 영향을 줄 수 있는 dependency 변경 후
  - 30분 predev는 통과했지만 active RSS high-water가 이전 기준보다 커졌을 때
- 검증 명령:

```bash
./server.sh verify-predev --soak-minutes 120
./server.sh verify-va-runtime-console-longrun --duration-minutes 120 --clients 1 --include-sidechannel --include-dashboard --include-rtsp
```

- 우선순위 이유: 다채널 운영 환경에서는 작은 누수가 긴 시간 후 streaming 안정성 문제로 커질 수 있습니다.

### P1-5. VA state cleanup 전용 검증 추가

- 상태: 예정
- 목적: mock metadata로 track/scenario/event retention, cap, active state 보호를 빠르게 검증하는 전용 테스트를 추가합니다.
- 관련 파일: `scripts/internal/analysis_state_smoke.cpp`, `scripts/internal/verify_analysis_state_smoke.sh`, `src/analysis/track_state_manager.cpp`, `src/analysis/scenario_engine.cpp`, `src/analysis/event_manager.cpp`
- 검증 명령:

```bash
./server.sh verify-analysis-state
```

- 우선순위 이유: cleanup 버그는 다채널 장시간 테스트 전 작은 fixture로 먼저 잡아야 합니다.

### P1-6. WebRTC DataChannel browser 수신 자동화

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

- 상태: 완료
- 목적: 저장된 EventRecord를 eventId, eventType, streamId/channelId, trackId, 시간 범위로 조회할 수 있게 합니다.
- 관련 파일: `include/analysis/event_storage.h`, `src/analysis/event_storage.cpp`, `src/ingress/webrtc_http_server.cpp`, `docs/video-analysis.md`
- 검증 명령:

```bash
./server.sh verify-event-post --mode schema
./server.sh verify-va-replay
```

- 우선순위 이유: 이벤트를 저장만 하고 조회하지 못하면 운영 화면과 사후 분석으로 이어지기 어렵습니다.

### P2-2. EventRecord retention/rotation/recovery

- 상태: 완료 (1차)
- 목적: JSON Lines 파일 증가, corruption, 서버 재시작 후 복구 정책을 정리합니다.
- 관련 파일: `src/analysis/event_storage.cpp`, `include/analysis/event_storage.h`, `docs/config-reference.md`
- 구현 완료 범위:
  - active JSON Lines 파일 size 기반 rotation
  - `<active-stem>.<timestamp-ms>.<sequence><ext>` archive naming
  - max archive count / max total archive bytes 기반 oldest-first retention
  - active 파일 retention 제외
  - corrupt JSON line / partial final line skip 및 count
  - status API의 active/archive/retention/recovery/write failure summary
  - records API가 corrupt line 하나로 전체 실패하지 않는 정책
- 후속 범위:
  - retention days 정책
  - rotated archive query 옵션과 UI 필터
  - storage compaction 또는 repair rewrite
  - archive별 상세 status와 운영 cleanup 도구
  - 실제 snapshot frame extraction과 pre/post clip recorder는 P6에서 별도 진행
- 검증 명령:

```bash
./server.sh build
./server.sh verify-event-post --mode recovery
git diff --check -- docs/video-analysis.md docs/config-reference.md docs/stream-verification.md docs/development-backlog.md
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

- 상태: 진행
- 목적: Runtime Dashboard의 Scenarios list와 vaRule Runtime Debug 1차는 구현했습니다. 남은 작업은 track별 first seen, phase entered time, cooldown remaining, zone 이동, 중복 억제 상태를 timeline으로 표시하는 것입니다.
- 관련 파일: `src/ingress/webrtc_http_server.cpp`, `src/analysis/event_rule_engine.cpp`, `docs/ui-guide.md`
- 검증 명령:

```bash
./server.sh verify-rule-ui
./server.sh verify-lab-layout
```

- 우선순위 이유: 상황 기반 이벤트는 내부 상태가 보이지 않으면 오탐/미탐 원인 분석이 어렵습니다.

### P3-2. `vaRule` runtime debug view

- 상태: 진행
- 목적: Runtime Dashboard 내부 1차 패널로 선택 rule, active tap ruleId 매칭, source/profile, event/scenario, region, event lifecycle, recent event를 표시합니다. 남은 작업은 rule별 상세 진입, phase timestamp/cooldown remaining, 더 긴 scenario timeline입니다.
- 관련 파일: `src/ingress/webrtc_http_server.cpp`, `src/analysis/event_rule_engine.cpp`, `docs/ui-guide.md`
- 검증 명령:

```bash
./server.sh verify-analysis-state
./server.sh verify-lab-layout
./server.sh verify-va-runtime-console
```

- 우선순위 이유: 저장 rule과 실제 실행 rule이 일치하는지 운영자가 확인할 수 있어야 합니다.

### P3-3. Tracking issue report UI

- 상태: 진행
- 목적: overlapRisk, missedFrame spike, directionChange spike, lost/reacquired 기록을 Runtime Dashboard table과 state dump에 연결했습니다. 남은 작업은 issue grouping, focus filter, timeline 표시입니다.
- 관련 파일: `src/analysis/track_state_manager.cpp`, `src/analysis/event_rule_engine.cpp`, `docs/ui-guide.md`
- 검증 명령:

```bash
./server.sh verify-tracker-stability --long --overlap-focus
```

- 우선순위 이유: direction-based tracking의 한계를 보완하기 전에 실제 실패 패턴을 볼 수 있어야 합니다.

### P3-4. EventRecord 검색 UI

- 상태: 완료 (1차)
- 목적: 이벤트 목록, 필터, EventRecord detail, snapshot/clip link placeholder를 Lab에서 확인합니다.
- 관련 파일: `src/ingress/webrtc_http_server.cpp`, `src/analysis/event_storage.cpp`, `docs/ui-guide.md`
- 구현 완료 범위: Runtime Dashboard의 수동 검색 UI, active file records 조회, storage status summary, corrupt/partial count 표시, snapshotPath/clipPath placeholder 표시입니다.
- 후속 범위: rotated archive query UI, 대량 archive paging, 실제 snapshot/clip preview 연결입니다. 현재 UI는 영상 재생이나 clip recorder를 수행하지 않습니다.
- 검증 명령:

```bash
./server.sh verify-lab-layout
./server.sh verify-event-post --mode schema
```

- 우선순위 이유: 이벤트 운영 기능은 저장 API만으로는 제품 사용 흐름이 완성되지 않습니다.

### P3-5. Runtime Dashboard 고도화

- 상태: 진행
- 목적: Overview, Tracks, Scenarios, Events, Metadata, Tracking Issues, vaRule Runtime Debug, client-side bounded Trend / Stale / Cleanup warning 1차 drill-down은 구현했습니다. 남은 작업은 trend sparkline, 장기 baseline 비교, phase entered time/cooldown remaining을 포함한 정밀 scenario timeline 고도화입니다.
- 구현 완료 범위: 최근 60개 dashboard sample ring buffer, runtime/metadata/event counter delta/min/max, DataChannel bufferedAmount high badge, metadata/video/overlay/tap metrics stale badge, 보기 중지/dashboard 비활성 후 cleanup residual badge입니다.
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

- 상태: 완료
- 목적: UI에서 저장한 scenario rule 조건이 runtime ScenarioEngine의 per-rule 설정으로 일관되게 적용되도록 정리합니다.
- 완료 범위:
  - 저장된 `scenario` payload를 runtime scenario option으로 변환
  - IntrusionDwell / WrongDirection per-rule 설정 우선 적용
  - ReEntry / IntrusionAfterLineCrossing / Loitering payload mapping 기반 준비
  - rule별 scenario lifecycle key 분리
  - env default는 저장 payload 누락/invalid field fallback으로 유지
  - Event POST payload, WebRTC/SSE/WS metadata schema, scenario event type 변경 없음
- 관련 파일: `src/analysis/event_rule_engine.cpp`, `src/analysis/scenario_engine.cpp`, `include/analysis/scenario_engine.h`, `src/analysis/scene_context_builder.cpp`, `test/fixtures/va_replay/`
- 검증 명령:

```bash
./server.sh verify-rule-ui
./server.sh verify-va-replay
```

- 후속/보류: Loitering 전용 UI 템플릿과 scenario 현장 fixture는 신규 운영/클라이언트 분리 로드맵 이후 재개합니다.

### P4-2. ReEntry Scenario UI 템플릿

- 상태: 완료
- 목적: 룰 편집 UI에서 ReEntry scenario를 선택하고 저장할 수 있게 합니다.
- 완료 범위:
  - Scenario template 목록에 ReEntry 추가
  - 재진입 window, cooldown, target zone, re-entry zone, unstable track exclude 설정
  - Inside → Exited → ReEntryCandidate → Confirmed → Cooldown → Ended 상태 흐름 미리보기
  - rule payload preview와 저장 전 validation
  - 저장된 `reEntryWindowMs`, `cooldownMs`, `targetZoneIds`, `reEntryZoneIds` round-trip 검증
  - Event POST payload, WebRTC/SSE/WS metadata schema, ScenarioEngine 판단 로직 변경 없음
- 관련 파일: `src/ingress/webrtc_http_server.cpp`, `scripts/internal/rule_ui_smoke_check.mjs`, `docs/ui-guide.md`, `docs/video-analysis.md`, `docs/stream-verification.md`
- 검증 명령:

```bash
./server.sh verify-rule-ui
./server.sh verify-lab-layout
./server.sh verify-analysis-state
```

- 후속: cross-zone A→B 재진입 판단은 별도 ScenarioEngine 확장으로 검토합니다.

### P4-3. IntrusionAfterLineCrossing Scenario UI 템플릿

- 상태: 완료
- 목적: 룰 편집 UI에서 line crossing 이후 target zone dwell 조합 scenario를 선택하고 저장할 수 있게 합니다.
- 완료 범위:
  - Scenario template 목록에 IntrusionAfterLineCrossing 추가
  - trigger line id/direction/좌표와 target zone polygon 저장
  - `zoneEntryTimeout(ms)` UI 값을 runtime field `maxDelayAfterCrossingMs`로 매핑
  - `dwellTimeMs`, `cooldownMs`, target class, unstable track exclude 설정
  - Idle → LineCrossed → ZoneEntered → Observing → Confirmed → Cooldown → Ended 상태 흐름 미리보기
  - rule payload preview와 저장 전 validation
  - 저장된 `targetLineIds`, `targetZoneIds`, `triggerLine`, `maxDelayAfterCrossingMs`, `dwellTimeMs`, `cooldownMs` round-trip 검증
  - 기존 line-crossing 기본 이벤트, Event POST payload, WebRTC/SSE/WS metadata schema, ScenarioEngine 판단 로직 변경 없음
- 관련 파일: `src/ingress/webrtc_http_server.cpp`, `src/analysis/scene_context_builder.cpp`, `src/analysis/event_rule_engine.cpp`, `scripts/internal/rule_ui_smoke_check.mjs`, `docs/ui-guide.md`, `docs/video-analysis.md`, `docs/stream-verification.md`
- 검증 명령:

```bash
./server.sh verify-rule-ui
./server.sh verify-lab-layout
./server.sh verify-analysis-state
```

- 후속: 실제 현장 샘플에서 line/zone 위치와 timeout/dwell 기본값을 튜닝합니다.

### P4-4. Loitering UI 템플릿 / 실제 샘플 튜닝

- 상태: 보류
- 목적: Loitering 전용 UI 템플릿과 실제 CCTV 샘플 기반 dwell time, movement radius, trajectory point 기준 튜닝을 후속으로 정리합니다.
- 보류 이유: Auth / Role / Scope, SourceRegistry / PublishedView, `/ops` / `/client` / `/lab` route 분리, live monitor scope가 먼저 확정되어야 scenario template 노출 정책을 안정적으로 정할 수 있습니다.
- 관련 파일: `src/analysis/loitering_scenario.cpp`, `test/fixtures/va_replay/loitering_metadata.json`, `docs/video-analysis.md`
- 재개 시 검증 명령:

```bash
./server.sh verify-rule-ui
./server.sh verify-lab-layout
./server.sh verify-va-replay
./server.sh verify-va-events --long
```

- 우선순위 이유: Loitering은 threshold 민감도가 높아 fixture만으로 제품 품질을 판단하기 어렵습니다.

### P4-5. ZoneOccupancyScenario

- 상태: 보류
- 목적: 특정 zone 내부 동시 track 수가 threshold 이상일 때 crowd/occupancy 이벤트를 발생시킵니다.
- 보류 이유: 신규 운영/클라이언트 분리 로드맵에서 source/view scope와 live monitor 노출 정책을 먼저 정리한 뒤 scenario 추가 여부를 판단합니다.
- 관련 파일: `src/analysis/scenario_engine.cpp`, `src/analysis/scene_context_builder.cpp`, `include/analysis/scenario_engine.h`, `test/fixtures/va_replay/`
- 재개 시 검증 명령:

```bash
./server.sh verify-va-replay
./server.sh verify-analysis-state
```

- 우선순위 이유: 침입/체류 다음으로 운영 현장에서 이해하기 쉬운 zone 기반 scenario입니다.

### P4-6. 후속 scenario 후보 정리

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

### P5-2. Close-object association diagnostic / opt-in guard

- 상태: 완료: default off opt-in, 비교 리포트 자동화 1차 완료
- 목적: 가까운 동일 class 객체가 겹치는 구간에서 `overlapRisk`, `associationConfidence`, lost/reacquired, missed-frame spike를 이용해 ID continuity 보수화가 필요한지 설계하고 opt-in diagnostic/guard skeleton으로 관측합니다.
- 관련 파일: `src/analysis/object_tracker.cpp`, `src/analysis/track_state_manager.cpp`, `scripts/internal/verify_tracker_stability.sh`, `scripts/internal/compare_close_object_tracker.py`, `docs/video-analysis.md`
- 검증 명령:

```bash
./server.sh compare-close-object-tracker --file imports/va_tracking_event_1280x720_30fps_h264.mp4 --modes off,diagnostic,enforce
./server.sh verify-tracker-stability --long --overlap-focus
./server.sh verify-va-replay
./server.sh verify-analysis-state
MEDIA_SERVER_ANALYSIS_TRACKING_CLOSE_OBJECT_GUARD_MODE=diagnostic ./server.sh verify-va-replay
MEDIA_SERVER_ANALYSIS_TRACKING_CLOSE_OBJECT_GUARD_MODE=enforce ./server.sh verify-tracker-stability --long --overlap-focus
```

- 현재 정책: `MEDIA_SERVER_ANALYSIS_TRACKING_CLOSE_OBJECT_GUARD_MODE=off`가 기본입니다. `diagnostic`은 score 변경 없는 관측, `enforce`는 실험적 opt-in 보정 skeleton이며 default on은 보류합니다.
- 구현 완료: `compare-close-object-tracker`가 같은 sample을 `off`, `diagnostic`, `enforce` mode로 실행하고 JSON summary, Markdown report, mode별 비교 table, track별 issue table, event/scenario delta를 남깁니다.
- 남은 작업: close-object fixture와 실제 현장 샘플을 추가해 threshold, center jump penalty, continuity boost 기준을 비교하고 event/scenario 결과 무변화를 재확인합니다. Kalman/Re-ID/ByteTrack 계열은 별도 실험 항목으로 분리합니다.
- 범위 제외: Kalman Filter, ByteTrack, BoT-SORT, Re-ID 모델 같은 대형 tracker 교체는 이 항목의 범위가 아닙니다.
- 우선순위 이유: 현재 direction-based tracker를 유지한 채 close-object association 한계를 먼저 정량화하고, 이벤트 결과 변화가 없는지 replay로 비교해야 합니다. 지금 단계에서 tracker 문제가 완전히 해결된 것으로 보지 않습니다.

### P5-3. Association 보강 전후 replay 비교

- 상태: 예정
- 목적: IoU + center distance + direction + class score 적용 전후 event 결과와 tracking issue 감소율을 비교합니다.
- 관련 파일: `src/analysis/object_tracker.cpp`, `src/analysis/track_state_manager.cpp`, `test/fixtures/va_replay/`
- 검증 명령:

```bash
./server.sh verify-va-replay
./server.sh verify-analysis-state
```

- 우선순위 이유: association 개선은 이벤트 결과를 바꿀 수 있으므로 replay 비교가 필수입니다.

### P5-4. Lost/reacquired 장기 검증

- 상태: 예정
- 목적: 짧은 detection 누락에서 같은 track이 유지되고, lost buffer가 무한 증가하지 않는지 확인합니다.
- 관련 파일: `src/analysis/track_state_manager.cpp`, `test/fixtures/va_replay/reacquire_metadata.json`
- 검증 명령:

```bash
./server.sh verify-va-replay
./server.sh verify-predev --soak-minutes 30
```

- 우선순위 이유: 상황 기반 이벤트는 track 시간 연속성이 핵심입니다.

### P5-5. 실제 Re-ID enabled 모델 benchmark

- 상태: 실험
- 목적: 기본 disabled 상태를 유지하면서 모델 파일이 있을 때만 Re-ID extractor 성능과 품질을 측정합니다.
- 관련 파일: `src/analysis/appearance_extractor.cpp`, `src/analysis/track_state_manager.cpp`, `docs/config-reference.md`
- 검증 명령:

```bash
./server.sh verify-analysis-state
```

- 우선순위 이유: Re-ID는 다채널 CPU/GPU 비용과 개인정보 영향이 커서 실험 결과 없이 기본 기능으로 승격하면 안 됩니다.

### P5-6. Appearance/embedding 운영 정책

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

- 상태: 완료
- 목적:
  - SSE metadata side-channel 수신 예제 `scripts/examples/va_metadata_sse_client.py` 구현
  - Python OpenCV 기반 Custom RTSP + SSE overlay 예제 `scripts/examples/va_rtsp_sse_overlay_client.py` 구현
  - RTSP raw stream과 SSE runtime metadata를 custom client가 직접 조합하는 예제 제공
  - 서버 core 기능, 일반 VLC/ffplay/IINA metadata UI 기능은 아님
- 관련 파일: `scripts/examples/va_metadata_sse_client.py`, `scripts/examples/va_rtsp_sse_overlay_client.py`, `scripts/internal/va_metadata_stream_smoke.py`, `docs/video-analysis.md`, `docs/ui-guide.md`, `docs/stream-verification.md`
- 검증 명령:

```bash
python3 -m py_compile scripts/examples/va_metadata_sse_client.py scripts/examples/va_rtsp_sse_overlay_client.py
python3 scripts/examples/va_metadata_sse_client.py --help
python3 scripts/examples/va_rtsp_sse_overlay_client.py --help
./server.sh verify-rtsp-va-overlay-policy
./server.sh verify-va-metadata-sidechannel
```

- 후속 범위: WS 기반 custom overlay renderer 확장, metadata filter/subscription 제어, 현장 sample별 색상/label/track 표시 옵션 개선, 배포용 dependency 안내 정리입니다.
- 우선순위 이유: RTSP 일반 viewer와 custom client의 차이를 실제 예제로 보여줘야 현장 연동 혼선을 줄일 수 있습니다. 서버 core, RTSP server-side overlay 정책, WebRTC DataChannel schema, SSE/WS metadata schema, Event POST payload는 이 항목에서 변경하지 않았습니다.

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
