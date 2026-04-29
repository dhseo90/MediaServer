# UI Guide

이 문서는 `/lab`와 `/lab/rules`의 영상 분석 UI 사용법을 설명합니다. 서버 실행/검증 명령은 [development-guide.md](./development-guide.md), VA 내부 구조는 [video-analysis.md](./video-analysis.md)를 봅니다.

## 1. UI 개요

| 화면 | URL | 용도 |
| --- | --- | --- |
| 통합 Lab | `http://127.0.0.1:8080/lab` | 스트림 재생, VA 분석, 영상 분석 설정, 실험실 도구를 한 화면에서 확인 |
| 영상 분석 관리 | `http://127.0.0.1:8080/lab/rules` | Rule/Profile/Scenario/영역/보기 탭 관리 |
| 런타임 상태 | `http://127.0.0.1:8080/lab/runtime/status` | session, stream, analysis tap 상태 확인 |

실제 host/port는 `./server.sh status` 또는 `./server.sh urls` 출력값을 우선합니다.

`/lab/rules`는 두 탭으로 나뉩니다.

- 영상 분석 설정: 저장된 영상 분석 룰 목록과 룰 편집 화면
- 영상 분석 보기: Live Streaming, VA Overlay, VA Rule 미리보기

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

저장하지 않은 변경사항이 있으면 목록 이동, 다른 룰 수정, 영상 분석 보기 이동 전에 확인 경고가 뜹니다. 저장/삭제 성공 또는 실패는 화면 상단 feedback으로 표시됩니다.

## 4. 분석 Profile

룰 편집 화면에서는 profile 선택과 요약을 먼저 보여주고, 세부 설정은 `고급 Profile 설정` 접힘 영역에서 다룹니다.

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

## 6. 시나리오 이벤트

Scenario는 여러 frame에 걸친 시간 조건과 상태 전이를 판단하는 이벤트입니다. 기존 기본 이벤트를 끄거나 바꾸지 않고 별도 scenario event로 동작합니다.

![시나리오 설정](assets/ui/analysis-rule-editor-scenario.png)

현재 상태:

| 시나리오 | 엔진/검증 상태 | UI 템플릿 상태 |
| --- | --- | --- |
| Intrusion Dwell | 구현됨 | 룰 편집 UI에서 선택 가능 |
| ReEntry | 구현됨 | 전용 UI 템플릿은 후속 작업 |
| WrongDirection | 구현됨 | 전용 UI 템플릿은 후속 작업 |
| IntrusionAfterLineCrossing | 구현됨 | 전용 UI 템플릿은 후속 작업 |
| Loitering | 구현됨 | 전용 UI 템플릿은 후속 작업 |

현재 UI의 시나리오 템플릿은 `Intrusion Dwell · 제한구역 체류`를 중심으로 구성되어 있습니다.

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
| Live Streaming | 선택한 영상의 원본 프레임만 확인 |
| 영상 + VA Overlay | 선택한 영상에 기본 `va=1` 객체 검출 overlay 적용 |
| 영상 + VA Rule | 저장된 `vaRule` ID를 선택하고, 해당 룰에 묶인 source/profile/rule을 사용 |

`영상 + VA Rule` 모드에서는 source를 따로 선택하지 않습니다. 선택한 rule ID에 저장된 source가 자동으로 고정됩니다.

연결 상태:

- 대기
- 연결 중
- 재생 중
- 중지됨
- 오류

요청 URL은 일반 화면에 크게 노출하지 않고 `개발자 요청 URL` 접힘 영역에 둡니다.

![개발자 요청 URL](assets/ui/analysis-developer-url.png)

URL 규칙:

- Live Streaming: source query만 사용
- 영상 + VA Overlay: `va=1` 추가
- 영상 + VA Rule: `vaRule=<숫자>`만 사용
- `vaRule` 요청에는 `file/url/source` override를 함께 쓰지 않음

## 10. 자주 발생하는 오류

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

README와 이 문서에서 사용하는 screenshot은 `docs/assets/ui/` 아래 역할 기반 파일명으로 보관합니다. 새 이미지가 없으면 문서에 broken link를 만들지 않고 “이미지 추가 예정” 문구만 둡니다.
