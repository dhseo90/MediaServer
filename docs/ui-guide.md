# UI Guide

이 문서는 `/lab`와 `/lab/rules`의 영상 분석 UI 사용법을 설명합니다. 서버 실행/검증 명령은 [development-guide.md](./development-guide.md), VA 내부 구조는 [video-analysis.md](./video-analysis.md)를 봅니다.

## 1. UI 개요

| 화면 | URL | 용도 |
| --- | --- | --- |
| 통합 Lab | `http://127.0.0.1:8080/lab` | 스트림 재생, VA 분석, 영상 분석 설정, 실험실 도구를 한 화면에서 확인 |
| 영상 분석 관리 | `http://127.0.0.1:8080/lab/rules` | Rule/Profile/Scenario/영역/보기 탭 관리 |
| 런타임 상태 | `http://127.0.0.1:8080/lab/runtime/status` | session, stream, analysis tap 상태 확인 |

실제 host/port는 `./server.sh status` 또는 `./server.sh urls` 출력값을 우선합니다.

UI는 light/dark theme-aware design token을 사용하며, card/button/form/table/badge/debug 영역은 같은 semantic color 규칙을 공유합니다.

`/lab/rules`는 세 탭으로 나뉩니다.

- 영상 분석 설정: 저장된 영상 분석 룰 목록과 룰 편집 화면
- 영상 분석 보기: 실시간 스트리밍, VA 오버레이, VA 룰 미리보기
- Runtime Dashboard: active analysis tap의 runtime metadata, backpressure, scenario/event/debug 상태

![영상 분석 룰 목록](assets/ui/analysis-rule-list.png)

## 2. 영상 분석 룰 목록

룰 목록은 저장된 `vaRule` 설정을 관리하는 첫 화면입니다. `vaRule`은 숫자 ID이며, 영상 source, 분석 profile, event/scenario, 영역/라인, event action을 하나로 묶습니다.

목록에서 확인하는 정보:

- 전체 룰 수
- 적용 중 룰 수
- 시나리오 룰 수
- 다음 자동 번호
- 각 룰의 ID, 이름, source, event 방식, 적용 상태

주요 동작:

- 룰 추가: 목록 상단의 단일 버튼으로 제공하며, 기본값이 채워진 새 룰 편집 화면으로 이동합니다.
- 룰 수정: 각 룰 행의 수정 버튼으로 저장 데이터를 편집 화면에 불러옵니다.
- 룰 삭제: 각 룰 행의 삭제 버튼을 누른 뒤 룰 ID와 이름을 확인하는 dialog 후 삭제합니다.
- 룰 보기/테스트: 영상 분석 보기 탭에서 해당 룰을 선택해 확인합니다.
- 적용 상태: 목록에서 적용/비활성 상태를 확인하고 토글할 수 있습니다.
- 룰 복제: 각 룰 행의 복제 버튼을 사용합니다. 새 숫자 ID를 사용하며, 복제 룰은 실수 적용을 막기 위해 비활성 상태를 기본으로 둡니다.

목록은 다중 선택 기반 toolbar를 사용하지 않습니다. 보기/수정/복제/삭제는 각 룰 행의 작업 버튼에만 노출하고, 필터 결과 수는 `표시 중` 요약 배지로 작게 표시합니다.

사용자가 rule number를 직접 입력하지 않습니다. 서버/UI가 빈 숫자 ID를 자동 배정하고, URL에서는 `vaRule=<숫자>`만 사용합니다.

## 3. 룰 편집 흐름

룰 추가 또는 수정 시 편집 화면으로 전환됩니다. 저장 완료 후에는 목록으로 돌아가는 흐름을 기본으로 합니다.

![룰 편집 기본 정보](assets/ui/analysis-rule-editor-basic.png)

편집 화면은 8개 섹션입니다.

| 섹션 | 설명 |
| --- | --- |
| 기본 정보 | Rule ID, Rule 이름, 적용 상태 |
| 영상 소스 | 대상 source, 송출 경로, 현재 연결된 source 요약 |
| 분석 Profile | 사용할 profile 선택, profile 요약, 고급 Profile 설정 |
| 이벤트 방식 | 기본 이벤트 또는 시나리오 선택 |
| 대상 객체 | 객체 category, 최소 신뢰도, 최소 지속 시간, 불안정 track 제외 옵션 |
| 영역/라인 설정 | 영상 프레임 보기, polygon/line 캔버스, 영역 이름 |
| 이벤트 동작 | overlay blink, blink 시간, POST URL, payload preview |
| 저장 전 검토 | 현재 설정 요약, validation 결과, 저장 버튼 |

편집 화면 상단의 룰 이름, 저장 상태, 저장/목록 버튼, 섹션 이동 영역은 스크롤 중에도 따라다닙니다. 일반 폭에서는 섹션 이동을 버튼 탭으로 표시하고, 버튼 텍스트를 읽기 어려운 매우 좁은 폭에서는 드롭다운으로 전환합니다.

저장하지 않은 변경사항이 있으면 목록 이동, 다른 룰 수정, 영상 분석 보기 이동 전에 확인 경고가 뜹니다. 저장/삭제 성공 또는 실패는 feedback으로 표시됩니다.

## 4. 분석 Profile

룰 편집 화면에서는 profile 선택과 요약을 먼저 보여주고, 새 profile이 필요할 때만 `새 Profile 설정`을 시작합니다. 세부 설정은 `고급 Profile 설정` 접힘 영역에서 다루며, 룰 작성 흐름에서는 새 profile을 `Profile 저장`하거나 `닫기`로 닫는 동작만 노출합니다. 기존 profile 삭제 같은 관리 동작은 룰 작성의 기본 흐름에 노출하지 않습니다.

Profile 항목:

- Detector: `YOLO/ONNX` 또는 `개발용 더미(검증용)`
- FPS: 분석 sampling FPS
- Queue: detector 앞 queue 크기
- Confidence: detection confidence threshold
- NMS: non-maximum suppression threshold
- Input size: model input width/height
- Tracking category: track ID와 event 판단에 사용할 category

`YOLO/ONNX`는 실제 객체 검출입니다. `개발용 더미`는 모델 없이 pipeline과 UI를 확인하기 위한 검증용 옵션이며 운영 설정에는 보통 사용하지 않습니다.

Tracking category가 비어 있으면 profile 저장을 막습니다. 전체 추적이 필요하면 UI의 전체 선택 또는 API의 `*` 토큰을 사용합니다.

## 5. 기본 이벤트

기본 이벤트는 기존 rule event engine을 사용하며, 외부 event JSON/API/POST 형식을 유지합니다.

지원 이벤트:

| 이벤트 | 의미 |
| --- | --- |
| `presence` | 영역 안에 대상 객체가 감지됨 |
| `enter` | 대상 객체가 영역 밖에서 안으로 진입 |
| `exit` | 대상 객체가 영역 안에서 밖으로 이탈 |
| `line-crossing` | 대상 객체가 line을 통과 |

`line-crossing`은 방향을 선택할 수 있습니다.

- `any`: 양방향
- `forward`: 선분 시작점에서 끝점으로 향하는 기준의 정방향
- `reverse`: 반대 방향

라인 모드에서는 영역/라인 캔버스의 선 중앙에 현재 설정 방향을 나타내는 작은 화살표를 표시합니다. `any`는 양방향, `forward`/`reverse`는 선택한 한 방향만 표시합니다.

## 6. 시나리오 이벤트

Scenario는 여러 frame에 걸친 시간 조건과 상태 전이를 판단하는 이벤트입니다. 기존 기본 이벤트를 끄거나 바꾸지 않고 별도 scenario event로 동작합니다.

![시나리오 설정](assets/ui/analysis-rule-editor-scenario.png)

현재 상태:

| 시나리오 | 엔진/검증 상태 | UI 템플릿 상태 |
| --- | --- | --- |
| Intrusion Dwell | 구현됨 | 룰 편집 UI에서 선택 가능 |
| ReEntry | 구현됨 | 전용 UI 템플릿은 후속 작업 |
| WrongDirection | 구현됨 | 룰 편집 UI에서 선택 가능 |
| IntrusionAfterLineCrossing | 구현됨 | 전용 UI 템플릿은 후속 작업 |
| Loitering | 구현됨 | 전용 UI 템플릿은 후속 작업 |

현재 UI의 시나리오 템플릿은 `Intrusion Dwell · 제한구역 체류`와 `WrongDirection · 금지 방향 통과`를 제공합니다. WrongDirection은 line 2점 geometry와 `forward`/`reverse` 허용 방향을 설정하며, `any` 방향은 위반 방향을 정의할 수 없으므로 사용하지 않습니다. 기존 `line-crossing` 기본 이벤트와 별도 scenario event로 동작하고 Event POST payload schema는 유지합니다.

Intrusion Dwell UI 항목:

- 후보 판단 시간(ms)
- 체류 확정 시간(ms)
- 재알림 대기 시간(ms)
- 제한구역 이름
- 대상 객체
- 불안정 track 제외
- 상태 흐름 미리보기

실제 scenario engine 활성화와 기본값은 서버 설정과 함께 동작합니다. 환경변수는 [config-reference.md](./config-reference.md)를 봅니다.

## 7. 영역/라인 캔버스

영역/라인 설정 섹션에서 영상 프레임을 보면서 polygon 또는 line을 지정합니다.

![영역/라인 캔버스](assets/ui/analysis-region-canvas.png)

캔버스 규칙:

- polygon은 최소 3점이 필요합니다.
- line-crossing은 2점짜리 line이 필요합니다.
- 최대 polygon 점 수는 현재 UI 기준 12개입니다.
- 기존 점 근처를 드래그하면 새 점을 만들지 않고 점 위치를 이동합니다.
- 마지막 점 삭제, 전체 영역 초기화, 되돌리기 버튼을 제공합니다.
- 점 번호는 캔버스 안에 표시됩니다.
- 좌표 목록은 접힘 영역에서 확인합니다.
- 저장 전 검토에 영역 저장 가능 여부가 반영됩니다.
- 저장 가능 여부는 `저장 가능: polygon 4개 점`, `저장 불가: line은 점 2개 필요`처럼 현재 geometry 조건을 직접 설명합니다.

좌표는 기존 payload 구조와 같이 normalized 0~1 비율로 저장됩니다. 캔버스 크기가 바뀌어도 저장 좌표 비율은 유지됩니다.

## 8. 이벤트 발생 시 동작

이벤트 동작 섹션에서 event 발생 시 후처리를 정합니다.

지원 UI:

- overlay blink: 이벤트 객체를 overlay에서 깜빡임으로 강조
- 깜빡임 시간(ms)
- POST URL
- payload preview 접힘 영역

POST URL은 형식 검증을 거칩니다. 실제 외부 전송은 서버가 `MEDIA_SERVER_ANALYSIS_EVENT_POST_ENABLED=1`로 실행된 경우에만 수행됩니다.

EventRecord/snapshot/clip hook:

- EventRecord 저장은 서버 설정으로 켜는 기능이며, 룰 편집 UI의 기본 입력 항목은 아닙니다.
- snapshot/clip hook은 현재 marker/hook 중심이며 실제 frame/clip recorder는 후속 작업입니다.
- 상태 확인은 `/lab/analysis/event-storage/status` API와 관련 metrics를 사용합니다.

## 9. 영상 분석 보기 탭

보기 탭은 설정을 검증하는 테스트/미리보기 화면입니다.

![영상 분석 보기](assets/ui/analysis-preview.png)

보기 모드:

| 모드 | 설명 |
| --- | --- |
| 실시간 스트리밍 | 선택한 영상의 원본 프레임만 확인 |
| 영상 + VA 오버레이 | 선택한 영상에 기본 `va=1` 객체 검출 overlay 적용 |
| 영상 + VA 룰 | 저장된 `vaRule` ID를 선택하고, 해당 룰에 묶인 source/profile/rule을 사용 |
| WebRTC 메타데이터 | WebRTC simple signaling 영상과 `vaMetadata=1` DataChannel 수신 JSON을 확인 |

`영상 + VA 룰` 모드에서는 source를 따로 선택하지 않습니다. 선택한 rule ID에 저장된 source가 자동으로 고정됩니다.

영상 영역 아래에는 compact status row와 영상 spec row를 표시합니다. 변하지 않는 값인 source/codec은 왼쪽 그룹, 재생 중 갱신될 수 있는 resolution/fps는 오른쪽 그룹에 둡니다. FPS는 반올림한 정수만 보여주며, 재생 중 일시적으로 새 값이 없을 때는 마지막 유효 FPS를 유지해 값이 깜빡이지 않게 합니다.

`WebRTC 메타데이터` 모드는 DataChannel 상태, 최신 metadata JSON, browser client-side overlay를 확인하는 테스트 화면입니다.
기본 label은 `va-metadata`이며 상태는 `비활성`, `연결 중`, `열림`, `수신 중`, `지연`, `닫힘`, `오류`로 표시됩니다.
DataChannel이 열리지 않거나 JSON parse에 실패해도 영상 재생 자체는 별도 상태로 유지되어야 합니다.
overlay는 WebRTC browser viewer 전용이며 RTSP 일반 viewer에는 적용되지 않습니다. 이 모드의 video track은 서버가 bbox를 합성하지 않은 원본 영상이고, 브라우저 canvas가 현재 관측 중인 track만 그립니다. 표시 옵션은 박스, 라벨, Track ID, 시나리오, 이벤트 highlight, TrackHealth, 현재 Zone, 체류 시간을 개별로 켜고 끌 수 있습니다.
metadata가 일정 시간 갱신되지 않으면 stale 상태로 표시하고 overlay를 흐리게 보여줍니다.
overlay는 DataChannel 수신 즉시 그리지 않고 현재 표시 중인 video frame 기준으로 가장 가까운 metadata를 선택합니다. DataChannel은 정상 수신 중이지만 현재 frame에 맞는 metadata가 없으면 `프레임 매칭 실패`로 분리해 표시하며, 짧은 grace window 동안 마지막 overlay를 유지해 불필요한 깜빡임을 줄입니다.
WebRTC 메타데이터 모드의 기본 client overlay는 `fallback-latest` payload를 받지 않고 `missing` 상태로 처리합니다. 파일 loop 경계처럼 video frame과 분석 결과 PTS가 크게 벌어진 경우 오래된 bbox가 실제 객체와 다른 위치에 그려지는 것을 막기 위한 정책입니다. fallback 확인이 필요하면 `fallback metadata 표시(opt-in)`을 켭니다.
파일 loop로 metadata timestamp가 되감기면 client overlay buffer와 PTS 보정을 초기화해 새 loop의 bbox를 현재 video frame에 다시 맞춥니다.
파일 loop 경계에서는 analysis tap의 tracker/track-state도 새 playback cycle로 정리해 이전 loop의 track ID와 lifecycle 상태가 Runtime Dashboard에 누적되지 않게 합니다.
`BBox 진단 갱신`은 자동 polling 없이 기존 tap을 찾은 뒤 `/lab/analysis/taps/<tapId>/bbox-diagnostics?ptsMs=...`를 한 번 조회해 WebRTC DataChannel track bbox와 near-PTS detector 원본/tracker 보정 bbox를 비교합니다. `Detector 원본 bbox` 표시를 켜면 현재 metadata frame과 가까운 snapshot일 때 tracker smoothing 전 box를 점선으로 겹쳐 볼 수 있습니다.
진단 table은 `DC selected`, `detector raw`, `track` bbox를 분리해서 보여줍니다. `det↔DC`, `track↔DC`는 IoU와 center distance를 함께 표시하며, `continuity`와 `TrackHealth` 열은 center jump, 가까운 같은 class track, association confidence, overlapRisk, missed count, lost/reacquired 상태를 확인하는 용도입니다.
`close-object guard` 열은 같은 class 객체가 가까운 구간의 tracker association 진단값을 보여줍니다. `closeObjectRisk`, `nearestSameClassTrackId`, best/second score, `scoreMargin`, `centerJump`, direction conflict, would-penalize/hold-reacquire, `guardMode`, `guardDecision`은 진단용이며 `diagnostic-only` 모드에서는 tracking 결과를 바꾸지 않습니다. 기본 정책은 `guard off`이고 기존 동작을 유지합니다. `diagnostic-only`는 score 변경 없는 관찰, `enforce`는 실험적 opt-in score 보정 skeleton 적용 상태를 뜻하며 default on 전환은 보류합니다.
`closeObjectGuardApplied`가 `false`이면 `enforce` 모드라도 해당 row의 ranking score는 보정되지 않은 상태입니다. 값이 없으면 `미제공` 또는 `guard off`로 표시해 direct tap/source tap과 실제 tracker 진단 부재를 구분합니다.
초 단위로 overlay가 늦게 따라오면 metadata selector 또는 PTS sync 문제를 먼저 봅니다. `det↔DC`와 `track↔DC`가 높고 center distance가 작지만 ID만 흔들리면 bbox 좌표 문제가 아니라 tracker association/ID continuity 문제로 봅니다. `detector raw`부터 실제 객체와 어긋나면 detector 후처리, model box format, coordinate transform 쪽을 분리해서 확인합니다.
상태 패널의 `Metadata 수신`, `Metadata buffer`, `Metadata drop`, `프레임 매칭 실패`, `표시 video frame`, `Overlay draw`, `마지막 video frame`, `마지막 metadata`, `영상 멈춤` 값을 함께 보면 metadata 수신과 실제 overlay draw가 분리되어 동작하는지 확인할 수 있습니다.
영상 frame callback이 멈춘 상태에서는 DataChannel이 계속 열려 있어도 overlay는 갱신하지 않고 stale 상태로 정리합니다.

WebRTC 메타데이터 뷰어 사용 순서:

1. `영상 분석 보기` 탭에서 `WebRTC 메타데이터` 모드를 선택합니다.
2. 서버 파일, URL source, 또는 저장 rule 기반 source를 선택합니다.
3. `보기 시작`을 누르면 `/webrtc/session?...&vaMetadata=1` 세션을 생성합니다.
4. 영상은 WebRTC video track으로 재생되고 metadata는 `va-metadata` DataChannel로 수신됩니다.
5. JSON preview와 Track/이벤트/시나리오 count를 확인합니다.
6. client-side overlay toggle로 박스/라벨/Track ID/시나리오/이벤트/TrackHealth 표시를 조정합니다.
7. bbox 위치가 의심되면 `BBox 진단 갱신`을 눌러 DataChannel/detector/track box의 IoU와 판단 문구를 확인합니다.
8. `보기 중지`를 누르면 WebRTC session과 metadata channel이 닫히고 overlay canvas가 정리됩니다.

연결 상태:

- 대기
- 연결 중
- 재생 중
- 중지됨
- 오류

요청 URL은 일반 화면에 크게 노출하지 않고 `개발자 요청 URL` 접힘 영역에 둡니다. 이 패널은 기본적으로 접혀 있으며, 일반 확인용 URL과 custom client용 side-channel URL을 분리해 보여줍니다.

![개발자 요청 URL](assets/ui/analysis-developer-url.png)

URL 규칙:

- 실시간 스트리밍: source query만 사용
- 영상 + VA 오버레이: `va=1` 추가
- 영상 + VA 룰: `vaRule=<숫자>`만 사용
- WebRTC 메타데이터: WebRTC simple signaling URL에 `vaMetadata=1`을 명시적으로 추가
- `vaRule` 요청에는 `file/url/source` override를 함께 쓰지 않음

출력 방식 정책:

| 출력 방식 | 용도 | 주의 |
| --- | --- | --- |
| WebRTC 메타데이터 뷰어 | WebRTC video와 DataChannel metadata를 브라우저가 받아 client-side overlay 표시 | RTSP client에서는 동작하지 않음 |
| RTSP 서버 오버레이 | VLC/ffplay/IINA 같은 일반 RTSP client에서 VA overlay 영상 확인 | 서버가 영상 위에 직접 bbox/label을 그린 결과 |
| RTSP 원본 스트림 | overlay 없는 원본 RTSP 출력 | metadata UI 없음 |
| 커스텀 메타데이터 사이드채널 | custom client가 RTSP video와 별도 SSE metadata stream을 함께 처리 | 일반 VLC/ffplay는 side-channel metadata를 표시하지 못함 |

개발자 요청 URL 패널은 두 그룹으로 나뉩니다.

- 일반 확인용: WebRTC metadata viewer, RTSP server overlay처럼 브라우저 또는 일반 RTSP viewer에서 바로 확인하는 URL
- Custom client용: RTSP raw stream, SSE metadata stream, WS metadata stream처럼 custom client가 영상과 metadata를 직접 조합할 때 쓰는 URL

Custom client 영역은 custom client가 같이 사용해야 하는 값을 한 번에 보여줍니다.

- RTSP 원본 스트림: custom client가 재생할 overlay 없는 영상
- SSE 메타데이터 스트림: 같은 source 또는 `vaRule`에 대한 runtime metadata JSON
- RTSP 서버 오버레이: 일반 RTSP viewer에서 바로 확인할 때 쓰는 대체 URL

현재 Lab에서 바로 복사 가능한 custom side-channel URL은 SSE endpoint입니다.

- 기존 active tap: `/lab/analysis/taps/{tapId}/metadata/stream`
- rule 기반 임시 tap: `/lab/analysis/metadata/stream?vaRule=<id>`

SSE와 WebSocket은 일반 RTSP viewer 기능이 아니라 custom client/dashboard 연동용입니다. Lab URL 패널은 기본적으로 SSE URL을 보여주며, WebSocket은 `/ws/va-metadata?tapId=<id>` 또는 `/ws/va-metadata?vaRule=<id>`로 직접 사용할 수 있습니다.
SSE 수신만 확인하는 최소 custom client 예제는 `scripts/examples/va_metadata_sse_client.py`입니다. 이 예제는 RTSP player를 구현하지 않고, metadata event를 받아 JSON schema, `streamId/channelId`, `tracks/events/scenarios` count, last timestamp만 출력합니다.

```bash
python3 scripts/examples/va_metadata_sse_client.py \
  --url 'http://127.0.0.1:8080/lab/analysis/metadata/stream?vaRule=1&intervalMs=500&maxMessageBytes=65536' \
  --max-messages 5 \
  --timeout-seconds 15
```

예제 출력은 connected 상태, message count, schema, `streamId/channelId`, `tracks/events/scenarios` count, last timestamp를 보여줍니다. payload 본문까지 확인하려면 `--print-json`을 추가합니다. RTSP 영상은 별도 player로 확인합니다. 일반 VLC/ffplay/IINA는 위 SSE metadata를 자동 overlay하지 않습니다.

```bash
ffplay -rtsp_transport tcp 'rtsp://127.0.0.1:8554/dhseo?file=sample_h264.mp4'
```

현재 상태:

- 구현 완료: WebRTC 메타데이터 뷰어, DataChannel 수신 상태 표시, latest JSON preview, client-side overlay canvas/toggle
- 구현 완료: 런타임 대시보드의 metrics/state dump/tracking issue report 표시
- 구현 완료: SSE metadata side-channel과 Lab의 custom pairing URL 표시
- 구현 완료: WebSocket metadata side-channel 최소 subscribe/stream endpoint
- 구현 완료: SSE metadata side-channel 수신 중심 custom client 예제
- 예정: WebSocket command/filter/subscribe-unsubscribe 제어, custom RTSP client overlay renderer

검증용 smoke:

```bash
./server.sh verify-webrtc-va-metadata --http-base http://127.0.0.1:8080
./server.sh verify-sse-metadata --http-base http://127.0.0.1:8080
./server.sh verify-ws-metadata --http-base http://127.0.0.1:8080
```

## 10. VA 런타임 대시보드

VA 런타임 대시보드는 현재 분석 서버 상태를 한 화면에서 보는 운영용 탭입니다. 화면은 Health Summary, Warnings, Metadata / Backpressure, Tracking / Scenario, Event Records, Debug 순서로 읽도록 정리되어 있습니다. 영상 분석 보기가 활성화되어 active tap이 생기기 전에는 대시보드 본문이 비활성 상태처럼 낮은 visual weight로 표시되고, 보기 탭에서 먼저 보기를 시작하라는 안내를 보여줍니다.

![VA 런타임 대시보드](assets/ui/analysis-runtime-dashboard.png)

표시 항목:

- Health Summary: sessions, streams, analysis taps, SSE/WS clients, RTSP consumers, cleanup warning, metadata stale, guard mode
- Warnings: dashboard sample, runtime delta, cleanup watch, stale metadata를 badge 중심으로 표시
- Metadata / Backpressure: WebRTC sent/drop/fail, SSE/WS client/message, metadata JSON build/payload size, DataChannel bufferedAmount
- Tracking / Scenario: Tracks, Tracking Issues, Scenarios, Scenario Timeline
- Event Records: 자동 polling 없이 검색 버튼으로만 조회하는 저장 event metadata table
- Debug: vaRule Runtime Debug, raw JSON, debugCounters, tracking issue detail

선택 UI:

- 분석 Tap: 현재 활성 tap 중 하나를 선택합니다.
- 룰: 저장된 rule ID를 기준으로 관련 tap을 우선 선택할 때 사용합니다.
- 갱신 주기: 수동, 2초, 5초, 10초 중 선택합니다.

drill-down 사용법:

- Overview는 session/stream/tap 수, FPS, queue, inference latency, event POST/storage 상태를 빠르게 확인하는 영역입니다.
- vaRule Runtime Debug는 선택 rule과 active tap의 관계를 `rule matched`, `source 기반 tap · rule 매칭 없음`, `rule 미연결 분석 tap`, `rule mismatch`, `active tap 없음`으로 구분하고, source/profile/event/scenario/region, event lifecycle, recent event를 요약합니다. `rule mismatch`는 선택 ruleId와 active tap ruleId가 실제로 다를 때만 표시하며, ruleId가 없는 direct file/source 기반 tap은 mismatch로 표시하지 않습니다.
- Tracks는 state-dump의 debug track을 표로 보여주며, trackId/class/lifecycle/currentZone/dwellTimeMs/TrackHealth를 확인합니다.
- Scenarios는 현재 state-dump에 노출된 scenarioName/scenarioPhase/zone/line/elapsed/cooldown 값을 list 형태로 보여줍니다. scenario instance가 없거나 zone/dwell 값이 비어 있으면 `조건을 만족한 track 없음`, `rule 매칭 없음`, `zone 조건 미충족`, `현재 track이 zone 내부에 없음`, `zone context 없음` 같은 짧은 empty reason을 표시합니다. phase entered time과 cooldown remaining의 정확한 timestamp는 아직 별도 UI로 표시하지 않습니다.
- Scenario Timeline은 같은 state-dump와 `/events` buffer를 조합해 active scenario instance를 시간 흐름 점검용 table로 표시합니다. Candidate/Observing/Confirmed/Cooldown/Ended phase는 chip으로 구분하고, row별 event emitted 여부, dedup count, 연결 가능한 recent event의 eventId/eventType/status를 함께 보여줍니다. 표시할 timeline이 없을 때도 Scenarios와 같은 empty reason을 사용합니다.
- Events는 선택 tap의 `/events` buffer를 받아 최근 event를 표시합니다. 선택 rule이 있으면 해당 rule의 recent event만 vaRule Runtime Debug 카드에 반영합니다.
- Event Records는 저장된 EventRecord metadata를 수동 검색하는 접힘 섹션입니다. `eventType`, `streamId`, `channelId`, `trackId`, `scenarioName`, `status`, `startTimeMs`, `endTimeMs`, `limit` filter를 입력하고 검색 버튼을 눌렀을 때만 `/lab/analysis/events/records`를 호출합니다. 결과 table은 eventId, eventType, startTime/status, stream/channel, track/class, zone/line, scenario/phase, snapshot/clip 저장 문자열을 보여주며, eventId를 선택하면 detail 영역에서 원본 JSON을 확인합니다. 영상 재생, snapshot 추출, clip recorder 제어는 제공하지 않습니다.
- Metadata / Backpressure는 WebRTC DataChannel sent/dropped/skipped/failure, max buffered amount, SSE/WS client count, 선택 tap의 analytics queue pending/capacity/peak/drop, `debugCounters`의 metadata JSON build/payload size, RTSP lifecycle/pending queue/appsrc/flow return/fanout balance를 읽기 전용으로 요약합니다. count 불균형, cleanup 잔여, failure가 관찰되면 warning badge로 표시합니다. 현재 endpoint가 제공하지 않는 SSE/WS sent/drop/failure 누적값, 서버 dashboard polling count, live RSS는 `미제공` 또는 `longrun report에서 확인`으로 표시합니다.
- Trend / Stale / Cleanup은 새 backend endpoint 없이 Dashboard가 이미 polling한 payload를 브라우저 client-side bounded buffer에 저장해 최근 변화만 보여줍니다. metadata 수신 age, video frame age, overlay draw age, DataChannel open 상태, SSE/WS client 존재 여부, 보기 중지 후 activeSessions/activeStreams/activeAnalysisTaps/SSE/WS/RTSP 잔류를 warning badge로 표시합니다. Dashboard tab이 비활성화되면 sample도 더 이상 추가되지 않습니다.
- Runtime Dashboard의 RSS 표시는 장시간 검증 결과나 longrun report를 대체하지 않습니다. Runtime Console RSS는 해제 가능 후보 상태로 정리했지만 active 구간 high-water 관찰은 유지하며, stable 승격은 verify-predev 30분 이후 별도 판단합니다. live dashboard 패널은 RTSP/GStreamer egress 또는 Full fanout 후보를 좁히기 위한 운영 관찰 보조 화면입니다.

대시보드 탭이 닫혀 있을 때는 polling하지 않습니다. 자동 갱신은 최소 2초 이상 간격으로 동작해 다채널 분석 성능에 부담을 주지 않도록 제한합니다.
vaRule Runtime Debug와 Scenario Timeline은 새 backend API 없이 선택된 rule과 active tap의 ruleId를 대조하고, 기존 metrics/state-dump/event buffer에서 확인 가능한 track/scenario/event 상태를 표시합니다. phase entered time 같은 세부 시각 값은 현재 state-dump에 노출된 값이 있을 때만 표시하며, 원본 JSON은 `상태 덤프 / tracking issue report` 접힘 영역에서 확인할 수 있습니다.

VA 런타임 대시보드 사용 순서:

1. 서버 실행 후 `/lab/rules`의 `영상 분석 보기` 탭을 엽니다.
2. preview 또는 metadata viewer로 analysis tap을 만들거나 저장 rule을 선택합니다.
3. VA 런타임 대시보드 영역에서 tap/rule을 선택합니다.
4. 갱신 주기를 선택하면 `/lab/runtime/status`, `/metrics`, `/state-dump`, `/events`를 polling합니다.
5. dashboard를 접거나 refresh를 끄면 polling을 중단합니다.

재사용 endpoint:

```bash
curl -fsS 'http://127.0.0.1:8080/lab/runtime/status'
curl -fsS 'http://127.0.0.1:8080/lab/analysis/taps'
curl -fsS 'http://127.0.0.1:8080/lab/analysis/taps/{tapId}/metrics'
curl -fsS 'http://127.0.0.1:8080/lab/analysis/taps/{tapId}/state-dump'
curl -fsS 'http://127.0.0.1:8080/lab/analysis/taps/{tapId}/events'
curl -fsS 'http://127.0.0.1:8080/lab/analysis/event-post/status'
curl -fsS 'http://127.0.0.1:8080/lab/analysis/events/records?limit=100'
curl -fsS 'http://127.0.0.1:8080/lab/analysis/event-storage/status'
```

장시간 검증:

```bash
./server.sh verify-va-runtime-console-longrun \
  --duration-minutes 30 \
  --clients 1 \
  --include-sidechannel \
  --include-dashboard \
  --include-rtsp
```

이 검증은 선택 longrun입니다. 기본 `./server.sh test`에는 포함하지 않습니다.

## 11. 자주 발생하는 오류

| 오류 | 원인 | 처리 |
| --- | --- | --- |
| polygon 점 부족 | polygon 이벤트인데 점이 3개 미만 | 캔버스에서 최소 3점을 추가 |
| line 좌표 부족 | line-crossing인데 line 점이 2개가 아님 | line 모드에서 2점을 지정 |
| category 미선택 | 분석 대상 객체 category가 비어 있음 | 기본 또는 전체 선택으로 category 지정 |
| Profile tracking category 미선택 | profile의 tracking category가 비어 있음 | profile 고급 설정에서 category 선택 |
| POST URL 오류 | POST URL 형식이 올바르지 않음 | `http://` 또는 `https://` URL 입력 |
| `vaRule`과 source override 충돌 | `vaRule=<id>`에 `file`, `url`, `source`를 함께 붙임 | 저장된 rule source만 쓰도록 `vaRule=<id>`만 사용 |
| 영상 프레임 로딩 실패 | 파일 없음, source 접근 실패, 서버 상태 오류 | `./server.sh status`, source token, `/lab/files` 목록 확인 |

## Screenshot 자산

README와 이 문서에서 사용하는 screenshot은 `docs/assets/ui/` 아래 역할 기반 파일명으로 보관합니다. 기본 문서 이미지는 light mode 대표 화면을 유지하고, dark mode는 수동 QA 또는 별도 파일명으로만 보강합니다. 새 이미지가 없으면 문서에 broken link를 만들지 않고 “이미지 추가 예정” 문구만 둡니다.

문서용 screenshot은 화면 상단/하단에서 버튼, 입력, 카드 제목이 어색하게 반쯤 잘리지 않도록 section 경계 또는 대표 상태가 보이는 지점에서 자릅니다. 긴 화면은 한 장에 모든 내용을 넣기보다 핵심 section을 온전히 보여주는 대표 screenshot을 우선합니다.
