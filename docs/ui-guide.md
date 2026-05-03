# UI Guide

이 문서는 `/lab`와 `/lab/rules`의 영상 분석 UI 사용법을 설명합니다. 서버 실행/검증 명령은 [development-guide.md](./development-guide.md), VA 내부 구조는 [video-analysis.md](./video-analysis.md)를 봅니다.

## 1. UI 개요

| 화면 | URL | 용도 |
| --- | --- | --- |
| 통합 Lab | `http://127.0.0.1:8080/lab` | 스트림 재생, VA 분석, 영상 분석 설정, 실험실 도구를 한 화면에서 확인 |
| 영상 분석 관리 | `http://127.0.0.1:8080/lab/rules` | 영상 분석 설정/보기/Runtime Dashboard 3탭 관리 |
| 런타임 상태 | `http://127.0.0.1:8080/lab/runtime/status` | session, stream, analysis tap 상태 확인 |

실제 host/port는 `./server.sh status` 또는 `./server.sh urls` 출력값을 우선합니다.

UI는 light/dark theme-aware design token을 사용하며, card/button/form/table/badge/debug 영역은 같은 semantic color 규칙을 공유합니다. 기본 화면은 요약과 주요 액션을 먼저 보이게 하고, raw JSON, debugCounters, Developer URL 같은 세부 정보는 낮은 visual weight의 접힘 영역에 둡니다.

액션 계층은 다음 기준을 따릅니다.

- 저장, 검색, 보기 시작 같은 primary action은 fill 버튼으로 표시합니다.
- 목록으로, 재시작, 좌표 초기화, 복사 같은 보조 작업은 weak/ghost 버튼으로 표시합니다.
- 삭제, 중단처럼 되돌리기 어렵거나 위험한 작업에만 danger 버튼을 사용합니다.
- status badge는 `success`, `warning`, `danger`, `info`, `neutral` 의미를 구분하고 한 줄에 과도하게 늘어놓지 않습니다.

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

룰 편집 화면의 profile 흐름:

- 먼저 profile 선택과 요약을 보여줍니다.
- 새 profile이 필요할 때만 `새 Profile 설정`을 시작합니다.
- 세부 설정은 `고급 Profile 설정` 접힘 영역에서 다룹니다.
- 룰 작성 흐름에서는 `Profile 저장`과 `닫기`만 노출합니다.
- 기존 profile 삭제 같은 관리 동작은 기본 작성 흐름에 노출하지 않습니다.

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

현재 UI가 제공하는 시나리오 템플릿:

| 템플릿 | 설정 항목 | event |
| --- | --- | --- |
| Intrusion Dwell · 제한구역 체류 | zone, 후보 시간, 체류 시간, cooldown | scenario event |
| WrongDirection · 금지 방향 통과 | line 2점 geometry, 허용 방향, cooldown | `wrong-direction` |

WrongDirection UI 정책:

- 허용 방향은 `forward` 또는 `reverse`를 사용합니다.
- `any`는 위반 방향을 정의할 수 없으므로 WrongDirection 템플릿에서 사용하지 않습니다.
- 기존 `line-crossing` 기본 이벤트는 유지합니다.
- WrongDirection은 별도 `wrong-direction` scenario event로 발생합니다.
- Event POST payload schema, WebRTC/SSE/WS metadata schema, ScenarioEngine 판단 로직은 변경하지 않습니다.

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

영상 영역 아래에는 두 줄의 보조 정보를 표시합니다.

| Row | 내용 | 표시 정책 |
| --- | --- | --- |
| compact status row | 재생/연결 상태 | 짧은 상태 문구 중심 |
| 영상 spec row | source, codec, resolution, fps | 고정 값과 갱신 값을 분리 |

source/codec은 왼쪽 그룹에 두고, 재생 중 갱신될 수 있는 resolution/fps는 오른쪽 그룹에 둡니다. FPS는 반올림한 정수만 표시하며, 일시적으로 새 값이 없을 때는 마지막 유효 FPS를 유지합니다.

`WebRTC 메타데이터` 모드는 WebRTC video와 `vaMetadata=1` DataChannel을 함께 점검하는 화면입니다.

한눈에 보는 구성:

| 영역 | 확인하는 것 | 해석 |
| --- | --- | --- |
| DataChannel 상태 | `va-metadata` 연결과 수신 상태 | metadata 경로가 열렸는지 확인 |
| Latest JSON | 마지막 metadata payload | schema, track/event/scenario count 확인 |
| Client overlay | 브라우저 canvas bbox/label | WebRTC 전용 client-side overlay 확인 |
| BBox 진단 | DataChannel, detector, tracker bbox 비교 | 좌표 문제와 tracker ID 문제를 분리 |
| 상태 패널 | buffer/drop/frame matching/stale 값 | 수신과 실제 draw가 분리되어 동작하는지 확인 |

DataChannel 상태:

| 상태 | 의미 |
| --- | --- |
| `비활성` | metadata channel을 요청하지 않음 |
| `연결 중` | WebRTC session 또는 channel 연결 대기 |
| `열림` | channel은 열렸지만 아직 metadata 수신 전 |
| `수신 중` | metadata JSON을 정상 수신 중 |
| `지연` | 수신 age가 커져 overlay stale 가능성이 있음 |
| `닫힘` | session 종료 또는 channel close |
| `오류` | channel 생성, 수신, JSON parse 중 오류 |

영상 재생과 metadata channel은 별도 상태로 봅니다. DataChannel이 열리지 않거나 JSON parse에 실패해도 video track 재생 자체가 곧바로 실패로 전파되면 안 됩니다.

Overlay 정책:

| 항목 | 정책 |
| --- | --- |
| 적용 범위 | WebRTC browser viewer 전용. RTSP 일반 viewer에는 적용되지 않음 |
| 영상 입력 | 서버가 bbox를 합성하지 않은 원본 video track |
| 그리기 방식 | 브라우저 canvas가 현재 관측 중인 track만 그림 |
| 표시 옵션 | 박스, 라벨, Track ID, 시나리오, 이벤트 highlight, TrackHealth, 현재 Zone, 체류 시간 |
| stale 처리 | metadata가 일정 시간 갱신되지 않으면 stale 표시와 흐린 overlay 적용 |
| video stall | video frame callback이 멈추면 DataChannel이 열려 있어도 overlay를 갱신하지 않음 |

Frame sync 정책:

| 상황 | 동작 |
| --- | --- |
| metadata 수신 | 즉시 그리지 않고 현재 video frame에 가장 가까운 metadata를 선택 |
| frame에 맞는 metadata 없음 | `프레임 매칭 실패`로 분리 표시 |
| 짧은 mismatch | grace window 동안 마지막 overlay를 유지해 깜빡임 완화 |
| `fallback-latest` payload | 기본 overlay에서는 `missing`으로 처리 |
| fallback 확인 필요 | `fallback metadata 표시(opt-in)`을 켜서 별도 확인 |
| 파일 loop timestamp 되감김 | overlay buffer와 PTS 보정을 초기화 |
| 파일 loop 경계 | tap의 tracker/track-state도 새 playback cycle로 정리 |

`fallback-latest`를 기본 표시하지 않는 이유는 오래된 bbox가 새 loop의 실제 객체와 다른 위치에 그려지는 일을 막기 위해서입니다.

`BBox 진단 갱신`은 자동 polling 없이 한 번만 조회합니다.

- 기존 tap을 찾은 뒤 `/lab/analysis/taps/<tapId>/bbox-diagnostics?ptsMs=...`를 호출합니다.
- WebRTC DataChannel track bbox와 near-PTS detector/tracker bbox를 비교합니다.
- `Detector 원본 bbox`를 켜면 tracker smoothing 전 box를 점선으로 겹쳐 봅니다.

진단 table 읽는 법:

| 열 | 의미 |
| --- | --- |
| `DC selected` | DataChannel overlay가 선택한 bbox |
| `detector raw` | detector 원본 bbox |
| `track` | tracker 보정 bbox |
| `det↔DC`, `track↔DC` | IoU와 center distance 비교 |
| `continuity` | center jump와 같은 class 근접 후보 확인 |
| `TrackHealth` | association confidence, overlapRisk, missed/lost/reacquired 확인 |
| `close-object guard` | 가까운 같은 class 객체 구간의 association 진단 |

`close-object guard` 해석:

| 값 | 해석 |
| --- | --- |
| `guard off` | 기본 정책. 기존 tracking 동작 유지 |
| `diagnostic-only` | score 변경 없이 후보 진단만 수집 |
| `enforce` | 실험적 opt-in score 보정 skeleton 적용 가능 |
| `closeObjectGuardApplied=false` | `enforce`여도 해당 row ranking score는 보정되지 않음 |
| `미제공` | direct tap/source tap 또는 실제 tracker 진단 없음 |

진단값은 `closeObjectRisk`, `nearestSameClassTrackId`, best/second score, `scoreMargin`, `centerJump`, direction conflict, would-penalize/hold-reacquire, `guardMode`, `guardDecision`을 포함할 수 있습니다. default on 전환은 보류 상태입니다.

문제 판단 팁:

| 증상 | 먼저 볼 후보 |
| --- | --- |
| overlay가 초 단위로 늦게 따라옴 | metadata selector 또는 PTS sync |
| bbox는 맞는데 ID만 흔들림 | tracker association 또는 ID continuity |
| `det↔DC`, `track↔DC`가 높음 | 좌표 변환보다 tracker continuity 쪽 |
| `detector raw`부터 어긋남 | detector 후처리, model box format, coordinate transform |
| DataChannel은 수신 중인데 화면이 멈춤 | video frame callback stall 또는 stale clear |

상태 패널에서는 `Metadata 수신`, `Metadata buffer`, `Metadata drop`, `프레임 매칭 실패`, `표시 video frame`, `Overlay draw`, `마지막 video frame`, `마지막 metadata`, `영상 멈춤` 값을 함께 봅니다.

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

Side-channel endpoint 구분:

| Endpoint | 주 용도 | 비고 |
| --- | --- | --- |
| SSE metadata | Lab URL 패널에서 기본 표시 | custom client/dashboard 연동 |
| WebSocket metadata | 직접 URL로 사용 | `/ws/va-metadata?tapId=<id>` 또는 `?vaRule=<id>` |
| 일반 RTSP viewer | side-channel 미지원 | VLC/ffplay/IINA가 자동 overlay하지 않음 |

SSE 수신만 확인하는 최소 custom client 예제는 `scripts/examples/va_metadata_sse_client.py`입니다.

| 확인 항목 | 설명 |
| --- | --- |
| metadata event | `event: metadata` 수신 |
| schema | `media-server.va.runtime-metadata.v1` 확인 |
| context | `streamId/channelId` 출력 |
| count | `tracks/events/scenarios` count 출력 |
| freshness | latest timestamp와 message count 출력 |
| 제외 범위 | RTSP player와 overlay renderer는 포함하지 않음 |

```bash
python3 scripts/examples/va_metadata_sse_client.py \
  --url 'http://127.0.0.1:8080/lab/analysis/metadata/stream?vaRule=1&intervalMs=500&maxMessageBytes=65536' \
  --max-messages 5 \
  --timeout-seconds 15
```

payload 본문까지 확인하려면 `--print-json`을 추가합니다. RTSP 영상은 별도 player로 확인합니다.

```bash
ffplay -rtsp_transport tcp 'rtsp://127.0.0.1:8554/dhseo?file=sample_h264.mp4'
```

RTSP 원본 스트림과 SSE metadata를 직접 조합하려면 optional OpenCV 예제 `scripts/examples/va_rtsp_sse_overlay_client.py`를 사용합니다.

| 입력 | 역할 |
| --- | --- |
| `--rtsp-url` | Developer URL panel의 `RTSP 원본 스트림` |
| `--metadata-url` | Developer URL panel의 `SSE 메타데이터 스트림` |
| OpenCV window/headless | bbox, trackId, className client-side draw 또는 smoke 확인 |

```bash
python3 scripts/examples/va_rtsp_sse_overlay_client.py \
  --rtsp-url 'rtsp://127.0.0.1:8554/dhseo?file=sample_h264.mp4' \
  --metadata-url 'http://127.0.0.1:8080/lab/analysis/metadata/stream?file=sample_h264.mp4&va=1&intervalMs=500&maxMessageBytes=65536' \
  --max-seconds 15 \
  --headless
```

RTSP overlay 방식 차이:

| 방식 | 일반 RTSP viewer 표시 | 설명 |
| --- | --- | --- |
| RTSP 서버 오버레이 | 가능 | 서버가 bbox/label을 영상에 합성 |
| Custom client overlay | 불가 | client가 RTSP raw frame과 SSE JSON을 직접 조합 |

OpenCV dependency는 예제 실행 전 `python3 -c "import cv2; print(cv2.__version__)"`로 확인합니다. 로컬 서버가 `8081/8555`처럼 보정 포트로 떠 있으면 Developer URL panel에 표시된 RTSP/SSE URL을 그대로 CLI에 넣습니다.

현재 상태:

- 구현 완료: WebRTC 메타데이터 뷰어, DataChannel 수신 상태 표시, latest JSON preview, client-side overlay canvas/toggle
- 구현 완료: 런타임 대시보드의 metrics/state dump/tracking issue report 표시
- 구현 완료: SSE metadata side-channel과 Lab의 custom pairing URL 표시
- 구현 완료: WebSocket metadata side-channel 최소 subscribe/stream endpoint
- 구현 완료: SSE metadata side-channel 수신 중심 custom client 예제
- 구현 완료: OpenCV 기반 Custom RTSP + SSE metadata overlay renderer 예제
- 예정: WebSocket command/filter/subscribe-unsubscribe 제어, WS 기반 custom overlay renderer 확장

검증용 smoke:

```bash
./server.sh verify-webrtc-va-metadata --http-base http://127.0.0.1:8080
./server.sh verify-sse-metadata --http-base http://127.0.0.1:8080
./server.sh verify-ws-metadata --http-base http://127.0.0.1:8080
```

## 10. VA 런타임 대시보드

VA 런타임 대시보드는 현재 분석 서버 상태를 한 화면에서 보는 운영용 탭입니다.

| 상태 | 화면 동작 |
| --- | --- |
| active tap 있음 | Health Summary부터 Debug까지 현재 runtime 상태 표시 |
| active tap 없음 | 본문을 낮은 visual weight로 표시하고 보기 시작 안내 |
| Dashboard tab 닫힘 | polling 중지 |
| 자동 갱신 사용 | 최소 2초 이상 간격으로 제한 |

문서용 screenshot은 긴 dashboard 전체를 한 장으로 축소하지 않고, active analysis tap 데이터가 들어간 상태에서 구간별로 나눠 캡처합니다. 각 이미지는 바로 위의 확인 포인트와 함께 읽습니다.

| Screenshot | 확인 포인트 |
| --- | --- |
| Health Summary / Controls | active stream/tap, rule, refresh, stale, cleanup, guard 상태 요약 |
| Warnings / Trend detail | 최근 sample 수, delta/min/max, warning badge |
| Metadata / Backpressure | WebRTC/SSE/WS metadata, payload, DataChannel buffer |
| Runtime Detail / vaRule Debug | 선택 tap/rule/source/profile/event/scenario runtime 관계 |
| Tracks | track lifecycle, zone/dwell, TrackHealth |
| Scenarios / Events | scenario phase/timeline, recent event buffer |
| Event Records | 자동 polling 없는 수동 검색 UI와 active JSON Lines 조회 범위 |
| Tracking Issues | tracking issue report와 close-object diagnostics |

### 10.1. Health Summary / Controls

대시보드 제목, tap/rule 선택, refresh 정책, Health Summary를 함께 봅니다. source는 문서용으로 상대 표시하며 개인 절대경로를 노출하지 않습니다.

![VA 런타임 대시보드 Health Summary](assets/ui/analysis-runtime-dashboard.png)

### 10.2. Warnings / Trend detail

최근 60개 client-side sample 기준의 delta/min/max와 warning badge를 확인합니다. Runtime Dashboard는 live observation 보조 화면이며 longrun report를 대체하지 않습니다.

![VA 런타임 대시보드 Warnings Trend](assets/ui/analysis-runtime-dashboard-trend.png)

### 10.3. Metadata / Backpressure

WebRTC DataChannel, SSE/WS side-channel, payload size, queue/drop/fail counter를 확인합니다. 값이 endpoint에서 제공되지 않으면 `미제공`으로 표시합니다.

![VA 런타임 대시보드 Metadata Backpressure](assets/ui/analysis-runtime-dashboard-metadata.png)

### 10.4. Runtime Detail / vaRule Debug

선택 rule과 active tap의 source/profile/event/scenario/region 관계를 읽기 전용으로 표시합니다. Event POST payload, metadata schema, ScenarioEngine 판단 로직은 변경하지 않습니다.

![VA 런타임 대시보드 Runtime Detail](assets/ui/analysis-runtime-dashboard-runtime.png)

### 10.5. Tracks

trackId, class, lifecycle, currentZone, dwellTimeMs, TrackHealth를 state-dump 기반으로 확인합니다.

![VA 런타임 대시보드 Tracks](assets/ui/analysis-runtime-dashboard-tracks.png)

### 10.6. Scenarios / Events

scenario phase, timeline, recent event buffer를 한 구간에서 확인합니다. 이벤트가 없으면 빈 상태 이유를 짧게 표시합니다.

![VA 런타임 대시보드 Scenarios Events](assets/ui/analysis-runtime-dashboard-scenarios.png)

### 10.7. Event Records

Event Records는 자동 polling하지 않습니다. 검색 버튼을 눌렀을 때 active JSON Lines의 metadata만 조회하며 rotated archive는 별도 archive query 후속 범위입니다.

![VA 런타임 대시보드 Event Records](assets/ui/analysis-runtime-dashboard-records.png)

### 10.8. Tracking Issues

tracking issue report와 close-object diagnostics를 분리해 봅니다. 아래 캡처는 table 하단과 diagnostics 접힘 영역이 잘리지 않도록 section 단위로 캡처한 예입니다.

![VA 런타임 대시보드 Tracking Issues](assets/ui/analysis-runtime-dashboard-tracking-issues.png)

표시 항목:

- Health Summary: sessions, streams, analysis taps, SSE/WS clients, RTSP consumers, cleanup warning, metadata stale, guard mode
- Warnings: dashboard sample, runtime delta, cleanup watch, stale metadata/backpressure를 badge 중심으로 표시
- Metadata / Backpressure: WebRTC sent/drop/fail, SSE/WS client/message, metadata JSON build/payload size, DataChannel bufferedAmount
- Tracking / Scenario: Tracks, Tracking Issues, Scenarios, Scenario Timeline
- Event Records: 자동 polling 없이 검색 버튼으로만 조회하는 저장 event metadata table
- Debug: vaRule Runtime Debug, raw JSON, debugCounters, tracking issue detail

선택 UI:

- 분석 Tap: 현재 활성 tap 중 하나를 선택합니다.
- 룰: 저장된 rule ID를 기준으로 관련 tap을 우선 선택할 때 사용합니다.
- 갱신 주기: 수동, 2초, 5초, 10초 중 선택합니다.

drill-down 사용법:

| 영역 | 주요 확인 항목 | 주의 |
| --- | --- | --- |
| Overview | session/stream/tap 수, FPS, queue, inference latency, event POST/storage | 빠른 상태 요약 |
| vaRule Runtime Debug | 선택 rule과 active tap 관계, source/profile/event/scenario/region, recent event | `rule mismatch`는 실제 ruleId가 다를 때만 표시 |
| Tracks | trackId, class, lifecycle, currentZone, dwellTimeMs, TrackHealth | state-dump debug track 기반 |
| Scenarios | scenarioName, phase, zone, line, elapsed, cooldown | 값이 없으면 짧은 empty reason 표시 |
| Scenario Timeline | phase chip, event emitted, dedup count, recent event 연결 | 판단 로직 변경 없이 읽기 전용 |
| Events | 선택 tap의 `/events` buffer | 선택 rule이 있으면 해당 rule recent event만 반영 |
| Event Records | EventRecord 수동 검색과 detail JSON | 영상 재생, snapshot 추출, clip recorder 없음 |
| Metadata / Backpressure | DataChannel, SSE/WS client, queue, payload size, RTSP lifecycle | 불균형, cleanup 잔여, failure는 warning badge |
| Trend / Stale / Cleanup | 최근 60개 dashboard sample의 count/age/delta/min/max/잔류 상태 | 새 backend endpoint 없이 client buffer만 사용 |
| RSS 표시 | live 보조 관찰 | longrun report를 대체하지 않음 |

Trend / Stale / Cleanup 1차 기준:

| 범주 | 표시 대상 | warning 기준 |
| --- | --- | --- |
| Runtime trend | activeSessions, activeStreams, activeAnalysisTaps, SSE/WS clients, RTSP consumers | 최근 60개 sample window에서 증가/감소/유지, min/max 표시 |
| Metadata trend | WebRTC sent/drop/fail, metadataJsonBuildCount, payload avg/max, DataChannel bufferedAmount | drop/fail 증가, bufferedAmount가 session limit의 80% 초과 |
| Analysis/Event trend | tracking issue count, close-object risk count, events emitted/deduped, Event POST/EventRecord sent/stored/fail/drop | issue/risk 양수, Event POST/EventRecord fail/drop 관찰 |
| Stale | metadata receive age, last video frame age, overlay draw age, tap metrics progress | DataChannel open 상태에서 metadata 미수신/3초 초과, video/draw 3초 초과, tap metrics가 3개 이상 sample과 10초 이상 정체 |
| Cleanup | 보기 중지 또는 dashboard 비활성 후 active session/stream/tap/SSE/WS/RTSP 잔류 | 10초 grace 이후 잔류가 있으면 badge 표시 |

Trend detail은 기본 접힘 영역입니다. 값이 endpoint에 없으면 `미제공`으로 표시하며, Runtime Dashboard polling interval, WebRTC DataChannel/SSE/WS metadata schema, Event POST payload schema는 변경하지 않습니다.

Event Records 검색 filter:

- `eventType`, `streamId`, `channelId`, `trackId`
- `scenarioName`, `status`
- `startTimeMs`, `endTimeMs`, `limit`

Event Records 결과 table은 eventId, eventType, startTime/status, stream/channel, track/class, zone/line, scenario/phase, snapshot/clip 저장 문자열을 보여줍니다.

Runtime Dashboard의 RSS 표시는 장시간 검증 결과나 longrun report를 대체하지 않습니다. Runtime Console은 stable 승격 가능 상태로 정리하되 active 구간 high-water 관찰 메모는 유지합니다.

vaRule Runtime Debug와 Scenario Timeline은 새 backend API 없이 기존 metrics/state-dump/event buffer를 사용합니다. phase entered time 같은 세부 시각 값은 현재 state-dump에 노출된 값이 있을 때만 표시합니다. 원본 JSON은 `상태 덤프 / tracking issue report` 접힘 영역에서 확인할 수 있습니다.

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

Screenshot 관리 정책:

| 항목 | 정책 |
| --- | --- |
| 보관 위치 | `docs/assets/ui/` |
| 파일명 | 역할 기반 이름 사용 |
| 기본 theme | dark mode 대표 화면 |
| 링크 정책 | 새 이미지가 없으면 broken link 대신 “이미지 추가 예정” 문구 사용 |
| 현재 대표 이미지 | 2026-05-03 light/dark theme-aware design system 정리 후 재캡처 |

문서용 screenshot 촬영 기준:

- 버튼, 입력, 카드 제목, table row가 화면 경계에서 반쯤 잘리지 않게 자릅니다.
- section 경계 또는 대표 상태가 온전히 보이는 지점을 사용합니다.
- 영상 화면은 실제 객체가 보이는 `va_four_scene_sample.mp4` 기준으로 캡처합니다.
- 영상 프레임 하단이 온전히 보이도록 합니다.
- 긴 화면은 한 장에 모두 넣지 않고 핵심 section 대표 screenshot을 우선합니다.
