# Video Analysis / VA Guide

이 문서는 MediaServer의 영상 분석(VA) 기능만 따로 설명합니다. 메인 README는 빠른 실행과 대표 URL만 담고, VA 모델/라벨/overlay/rule/API 세부 내용은 이 문서에서 관리합니다.

## 현재 범위

현재 VA 경로는 `va=1` 요청으로 켭니다.

지원하는 입력 경로:

- file source
- RTSP pull source
- WebRTC publish source의 소비 경로
- 정적 이미지 파일 분석 API

지원하는 출력 경로:

- RTSP/WebRTC 영상 위 detection overlay
- 사람 객체 bbox 기반 redaction overlay
- analysis metadata JSON
- snapshot JPEG
- overlay JPEG
- rule/event JSON
- opt-in event POST

기본 detector는 YOLO/ONNX Runtime 경로입니다. URL에는 보통 `va=1`만 붙이고, detector/model/labels/fps/queue 같은 개발자 값은 `include/stdafx.h`, `scripts/.media_server.env`, `MEDIA_SERVER_ANALYSIS_*` 환경변수로 관리합니다.

## 빠른 URL

RTSP overlay stream:

```text
rtsp://127.0.0.1:8554/dhseo?file=va_four_scene_sample.mp4&va=1
```

WebRTC overlay consume:

```text
POST http://127.0.0.1:8080/webrtc/session?file=va_four_scene_sample.mp4&va=1
POST http://127.0.0.1:8080/whep?file=va_four_scene_sample.mp4&va=1
```

정적 이미지 metadata:

```bash
curl -fsS 'http://127.0.0.1:8080/lab/analysis/image?asset=va-four-scene-sample.png'
```

정적 이미지 overlay JPEG:

```bash
curl -fsS -o overlay.jpg \
  'http://127.0.0.1:8080/lab/analysis/image/overlay.jpg?asset=va-four-scene-sample.png&labelLang=ko&quality=88'
```

사람 객체 자동 모자이크:

```bash
curl -fsS -o person-mosaic.jpg \
  'http://127.0.0.1:8080/lab/analysis/image/overlay.jpg?asset=va-four-scene-sample.png&redaction=person-mosaic&redactionBlockSize=20&redactionMarginRatio=0.08'
```

```text
rtsp://127.0.0.1:8554/dhseo?file=va_four_scene_sample.mp4&va=1&redaction=person-mosaic&redactionBlockSize=20
POST http://127.0.0.1:8080/webrtc/session?file=va_four_scene_sample.mp4&va=1&redaction=person-mosaic&redactionBlockSize=20
```

현재 redaction은 얼굴 인식/세그멘테이션이 아니라 detection bbox 기반 block mosaic입니다. 사람 검출이 누락되면 원본 영역이 남을 수 있으므로 운영 배포 전에는 실제 카메라 각도와 조명에서 `./server.sh verify-redaction --long`과 샘플별 수동 확인을 같이 수행해야 합니다. 원본 snapshot endpoint와 redaction 없는 overlay route는 그대로 원본을 보여줄 수 있으므로, 비식별화가 필수인 환경에서는 노출 route 정책도 함께 제한합니다.

정적 이미지 분석은 서버에 overlay 파일을 저장하지 않고 요청 시 즉석에서 JPEG 응답을 생성합니다.
`/lab`의 "정적 이미지 분석" 섹션은 `/lab/files`에서 `docs/assets` 샘플 이미지와 video root의 이미지 파일 목록을 받아 드롭다운으로 표시합니다. 직접 API를 호출할 때도 경로는 각 root 기준 상대경로만 허용합니다.

## Overlay 샘플

아래 이미지는 외부 영상 캡처가 아니라 문서/테스트용으로 생성한 license-safe 4분할 샘플을 YOLO/ONNX detector로 분석한 결과입니다.

![VA overlay 한글 라벨 샘플](assets/va-four-scene-overlay-ko.jpg)

원본 샘플:

![VA 원본 샘플](assets/va-four-scene-sample.png)

동일 샘플을 영상 테스트에도 사용할 수 있도록 `video/va_four_scene_sample.mp4`를 기본 `video` 경로에 포함합니다.

## YOLO / COCO 기준

현재 검증한 기본 모델은 Ultralytics assets `v8.4.0`의 `yolo11n.onnx`입니다.

기본 label 파일은 `models/coco.names`이며 COCO 80개 class 기준입니다. 모델/label 파일은 repo에 커밋하지 않고 로컬 `models/` 아래에 둡니다.

현재 COCO label 기준으로 overlay에 표출 가능한 객체:

```text
person, bicycle, car, motorcycle, airplane, bus, train, truck, boat, traffic light,
fire hydrant, stop sign, parking meter, bench, bird, cat, dog, horse, sheep, cow,
elephant, bear, zebra, giraffe, backpack, umbrella, handbag, tie, suitcase, frisbee,
skis, snowboard, sports ball, kite, baseball bat, baseball glove, skateboard, surfboard,
tennis racket, bottle, wine glass, cup, fork, knife, spoon, bowl, banana, apple,
sandwich, orange, broccoli, carrot, hot dog, pizza, donut, cake, chair, couch,
potted plant, bed, dining table, toilet, tv, laptop, mouse, remote, keyboard,
cell phone, microwave, oven, toaster, sink, refrigerator, book, clock, vase,
scissors, teddy bear, hair drier, toothbrush
```

## Label 표기와 색상

기본 overlay label은 `labelLang=ko` 기준 한글 카테고리 묶음과 percentage로 표기합니다.

예:

- `사람 91%`
- `차량(자동차) 88%`
- `도로(신호등) 76%`
- `동물(강아지) 84%`
- `기기(노트북) 79%`

`labelLang=en`을 지정하면 `Person 91%`, `Vehicle(car) 88%`처럼 영문 카테고리로 표시합니다.

일반 분석 색상:

| 카테고리 | 색상 |
| --- | --- |
| 사람 | 진한 파랑 |
| 차량 | 초록 |
| 도로 | 노랑 |
| 동물 | 진한 보라 |
| 운동 | 청록 |
| 음식 | 주황 |
| 가구 | 갈색 |
| 기기 | 마젠타 |
| 식기 | 하늘색 |
| 잡화 | 회색 |

빨간색 계열은 이벤트/위험 강조용으로 남겨두고 일반 분석에는 사용하지 않습니다.

## 분석 동작

VA 분석은 relay 경로를 직접 대체하지 않고 같은 source stream을 구독하는 별도 처리 경로로 붙습니다.

핵심 동작:

- compressed video packet을 raw frame으로 decode
- profile 기준 fps로 frame sampling
- bounded queue에서 오래된 frame drop
- YOLO/ONNX inference
- detection box, label, score, timestamp 생성
- tracker가 켜진 경우 frame 간 detection 연결 후 `trackId` 부여
  - 기본 추적 대상은 카테고리 토큰 `person`, `vehicle`
  - `vehicle`은 COCO 차량 계열(`bicycle`, `car`, `motorcycle`, `airplane`, `bus`, `train`, `truck`, `boat`)을 포함한다.
  - `animal`을 추가하면 COCO 동물 계열(`bird`, `cat`, `dog`, `horse`, `sheep`, `cow`, `elephant`, `bear`, `zebra`, `giraffe`)을 추적한다.
  - `road`, `sports`, `tableware`, `food`, `furniture`, `device`, `object`를 추가하면 도로 표식/운동/식기/음식/가구/기기/잡화 계열도 시간 기반 이벤트 대상으로 opt-in한다.
  - 그 외 객체는 detection/overlay만 유지하고 ID/trail은 붙이지 않는다.
  - 기본 대상 밖의 카테고리에 시간 기반 이벤트가 필요하면 query/profile의 `trackingClasses` 또는 `MEDIA_SERVER_ANALYSIS_TRACKING_CLASSES`로 opt-in한다.
- 후속 상태/상황 분석 계층은 기존 `AnalysisResult`를 직접 바꾸지 않고 `BuildTrackedObjects()` adapter를 통해 `TrackedObjectMetadata` 목록을 얻는다.
  - 각 객체 metadata는 `stream_id/channel_id`, `frame_id`, `timestamp_ns/ms`, `track_id`, `class_id/class_name`, `confidence`, `bbox`, `center`, trail 기반 `direction`, `track_state`를 포함한다.
  - 이 adapter는 read-only 변환 계층이며 기존 tracking id 생성, rule event JSON, overlay 출력 형식을 바꾸지 않는다.
- `TrackStateManager`는 adapter 결과를 stream/channel별 track map으로 나눠 `first_seen`, `last_seen`, `lost_since`, 최신 bbox/center/confidence/class/direction, 최근 관측 ring buffer를 관리한다.
  - 기본 ring buffer는 track당 최근 32개 관측이며, stream/channel별 active track은 기본 512개로 제한한다.
  - trajectory는 원본 frame 없이 center/timestamp만 500ms 간격으로 downsample해 track당 최대 32개 point를 보관한다.
  - 업데이트가 끊긴 track은 2초 뒤 `Lost`, 10초 뒤 `Terminated`로 전이하고 terminated 상태는 기본 2초 보관한 뒤 cleanup한다.
  - cleanup은 기본 1초 간격으로 실행하며 active track은 cleanup 대상으로 삭제하지 않는다.
  - frame 원본은 저장하지 않고 metadata만 저장한다.
  - `/lab/analysis/taps/{tapId}` 응답의 `analyticsState.trackState`는 channel/active/lost/terminated track 수, observation/trajectory point 수, cleanup 횟수와 삭제 수를 디버그 metric으로 제공한다.
  - `TrackHealth`는 direction-based tracking id의 진단 metadata다. association confidence, missed frame count, bbox overlap/center distance 기반 overlap risk, direction change count, last stable time, unstable 여부를 track별로 기록한다.
  - track이 `Lost`가 되거나 다시 관측되면 `last_health_event`, `lost_count`, `reacquired_count`에 기록한다. 이 정보는 진단/후속 scenario 입력용이며 현재 tracking id 생성 알고리즘, Kalman Filter, Re-ID, 외부 tracker는 추가하지 않는다.
  - `AppearanceProfile`은 Re-ID/attribute 분석을 위한 placeholder metadata다. embedding, embedding quality, 상/하의 색상, gender/hat/glasses placeholder, last updated time, sample count를 담는다.
  - `IAppearanceExtractor`는 향후 appearance 분석 모델 연결 지점이고, 현재 기본 구현은 `NoOpAppearanceExtractor`다. 실제 Re-ID/attribute 모델, ONNXRuntime/TensorRT/OpenVINO 의존성, 매 프레임 appearance 실행은 추가하지 않는다.
  - `AppearanceUpdatePolicy`는 `onTrackCreated`, `everyNSeconds`, `onTrackLost`, `onReacquireCandidate`, `onLowConfidenceAssociation` trigger를 분리한다. 기본값은 `MEDIA_SERVER_ANALYSIS_APPEARANCE_ENABLED=0`이라 extractor 호출 자체를 하지 않는다.
- `SceneContextBuilder`는 `TrackRuntimeState`와 기존 rule 문서의 polygon/line region을 입력으로 받아 track별 zone/line context만 계산한다.
  - `ZoneState`는 현재/이전 zone, 진입/이탈 시각, dwell time, restricted zone 포함 여부를 담는다.
  - `LineCrossState`는 line별 이전/현재 signed side, crossing 여부, crossing 방향, 마지막 crossing 시각을 담는다.
  - 이 계층은 이벤트를 직접 발생시키지 않으며 기존 rule event JSON, overlay highlight, POST dispatch 형식을 바꾸지 않는다.
  - 오래 관측되지 않는 scene context는 track/scenario retention과 cleanup interval 정책을 공유해 다채널 state 증가를 제한한다.
- 기존 presence/enter/exit/line-crossing rule event engine은 이벤트 출력 owner로 유지한다.
  - `trackId`가 있는 객체는 내부적으로 `TrackStateManager` snapshot과 `SceneContextBuilder`의 `ZoneState`/`LineCrossState`를 사용해 기존 이벤트 타입을 판단한다.
  - tracker가 꺼졌거나 `trackId=0`인 객체는 기존 detection index fallback으로 평가해 기존 호환성을 유지한다.
- `EventManager`는 rule/scenario 이벤트의 내부 lifecycle을 `start`, `update`, `confirmed`, `cooldown`, `end` 단계로 관리한다.
  - lifecycle key는 stream/channel, scenario/rule id, zone id, track id 또는 fallback object key를 기준으로 만든다.
  - 기존 rule event는 호환 옵션으로 기존 반복 emit과 JSON/API/POST 형식을 유지한다. 후속 ScenarioEngine은 cooldown/update interval 옵션을 사용해 동일 track/zone 중복 이벤트를 억제한다.
  - ended/cooldown event state는 cleanup interval마다 retention을 초과한 항목만 삭제한다.
- `ScenarioEngine`은 상태 머신 기반 상황 이벤트를 기존 RuleEventEngine과 별도 계층으로 실행하는 계층이다.
  - phase는 `Idle`, `Candidate`, `Observing`, `Confirmed`, `Cooldown`, `Ended`를 사용한다.
  - `ScenarioInstance`는 stream/channel, scenario id, zone id, track id, phase 진입/확정/cooldown/end 시각을 보관한다.
  - `IScenario` 구현체를 등록하면 `SceneContext`의 track별 context를 평가하고, emit은 `EventManager` lifecycle을 통해 처리한다.
  - 기본 skeleton 설정은 `MEDIA_SERVER_ANALYSIS_SCENARIO_ENABLED`, `MEDIA_SERVER_ANALYSIS_SCENARIO_MAX_INSTANCES_PER_CHANNEL`, `MEDIA_SERVER_ANALYSIS_SCENARIO_COOLDOWN_MS`, `MEDIA_SERVER_ANALYSIS_SCENARIO_UPDATE_INTERVAL_MS`, `MEDIA_SERVER_ANALYSIS_SCENARIO_RETENTION_MS`로 분리한다. 기존 `MEDIA_SERVER_ANALYSIS_SCENARIO_ENDED_RETENTION_MS`는 호환 입력으로 유지한다.
- `IntrusionDwellScenario`는 첫 번째 상황 기반 scenario다.
  - 기존 intrusion/presence/enter rule event와 별도 이벤트 타입 `intrusion-dwell`을 사용한다.
  - 기본 대상은 `person`이며, `MEDIA_SERVER_ANALYSIS_INTRUSION_DWELL_TARGET_CLASSES`로 category token/class/id를 조정할 수 있다.
  - 기존 rule 문서의 polygon region을 restricted zone으로 재사용하고, `MEDIA_SERVER_ANALYSIS_INTRUSION_DWELL_RESTRICTED_ZONE_IDS`가 비어 있으면 모든 polygon zone을 대상으로 본다.
  - 같은 `trackId`가 restricted zone에 들어오면 `Candidate`, 2초 이상 유지되면 `Observing`, 10초 이상 체류하면 `Confirmed`가 된다.
  - `Confirmed` 전이는 `EventManager`를 통해 `intrusion-dwell` 이벤트를 1회만 emit한다. 같은 track이 계속 zone 내부에 있어도 중복 emit하지 않고, zone 밖으로 나가면 `Ended`가 된다.
  - 기본값은 꺼짐이며 `MEDIA_SERVER_ANALYSIS_INTRUSION_DWELL_ENABLED=1`로 켠다. 시간값은 `MEDIA_SERVER_ANALYSIS_INTRUSION_DWELL_CANDIDATE_MS`, `MEDIA_SERVER_ANALYSIS_INTRUSION_DWELL_DWELL_MS`, `MEDIA_SERVER_ANALYSIS_INTRUSION_DWELL_COOLDOWN_MS`로 조정한다.
- RTSP/WebRTC raw video 구간에 overlay 합성
- metadata/snapshot/overlay JPEG API 제공

사람 객체 자동 모자이크:

- `redaction=person-mosaic` 또는 `redaction=mosaic`을 `va=1` overlay URL에 붙이면 detection 결과 중 사람 bbox 영역을 block mosaic으로 비식별 처리한다.
- 기본 대상은 `redactionClasses=person`이며, 필요하면 category token, class label, class id, `*`를 comma 구분으로 지정할 수 있다.
- `redactionBlockSize`는 mosaic tile 크기이며 기본 `18`, 범위는 `4..128`이다.
- `redactionMarginRatio`는 bbox 주변 확장 비율이며 기본 `0.08`, 범위는 `0..0.5`이다.
- 현재 구현은 bbox 기반이라 검출 누락, 사람 일부 영역 누락, segmentation/face 단위 정밀 비식별화까지 보장하지 않는다. 운영 비식별화 기능으로 쓰는 배포에서는 `./server.sh verify-redaction --long`과 실제 샘플 수동 확인, 원본 route 비노출 정책을 함께 적용한다.

Rule UI는 개별 COCO 객체명을 모두 체크박스로 노출하지 않고 기존 한글 카테고리인 `person`, `vehicle`, `road`, `animal`, `sports`, `tableware`, `food`, `furniture`, `device`, `object` 단위로 선택하게 한다. 각 카테고리 박스에는 포함 객체명을 한글로 표시한다. 이 카테고리 목록은 `/lab/analysis/capabilities`의 `trackingCategories`와 같은 C++ catalog에서 내려오며, JSON/API에서는 기존처럼 세부 class label 또는 class id를 직접 지정할 수 있다.

느린 detector 상황에서는 relay path를 막지 않기 위해 오래된 분석 frame부터 버립니다. adaptive tuner가 켜져 있으면 detector 처리 시간, pending queue, queue drop을 보고 런타임 fps를 먼저 낮춥니다. 모델이 dynamic input을 지원하면 input size도 단계적으로 낮출 수 있습니다.

## Overlay Sync

RTSP/WebRTC egress는 source packet PTS를 세션별 normalized PTS로 바꿉니다. overlay 합성 시에는 normalized PTS를 다시 source PTS로 매핑한 뒤 analysis result history에서 가장 가까운 결과를 찾습니다.

관련 기본값:

- `MEDIA_SERVER_ANALYSIS_OVERLAY_WAIT_MS`: 기본 `180`
- `MEDIA_SERVER_ANALYSIS_OVERLAY_SYNC_TOLERANCE_MS`: 기본 `400`

PTS 매칭이 실패하면 최신 result로 fallback합니다. 이 fallback은 overlay가 아예 사라지는 것보다 최신 분석 결과를 보여주는 쪽을 우선한 안전장치입니다.

## Rule / Event

`/lab/rules`의 **영상 분석 관리** 화면에서 profile, event rule, 영상 분석 설정(`vaRule`)을 저장할 수 있습니다. `/lab`에서는 같은 컴포넌트를 Shadow DOM으로 불러와 메인 실험실 안에서 이동할 수 있습니다.

URL 사용 방식:

- `?va=1`: 요청한 file/RTSP/WebRTC source에 서버 기본 VA overlay를 적용한다.
- `?vaRule=<숫자>`: 저장된 영상 분석 설정 ID를 사용한다. 이 설정은 source, profile, 이벤트 rule, scenario, geometry를 함께 묶으며 URL에는 `file/url/source` override를 함께 붙이지 않는다.
- `vaRule` 문서는 `match.vaRule`로 기존 rule과 분리되어, 기본 `va=1` rule event와 저장 설정 기반 event가 섞이지 않게 한다.

지원하는 event rule 1차 범위:

- presence
- enter
- exit
- line-crossing(`any`, `forward`, `reverse`)

룰 편집 UI 동작:

- 최상단 탭은 `영상 분석 설정`과 `영상 분석 보기`로 분리한다.
- `영상 분석 설정` 탭은 숫자 기반 `vaRule` ID, 설정 이름, 연결할 영상 소스, profile, 기본 이벤트/시나리오, 영역/라인, 출력 동작을 저장한다.
- `영상 분석 보기` 탭은 `Live Streaming`, `영상 + VA Overlay`, `영상 + VA Rule` 세 모드로 나뉜다. `영상 + VA Rule` 모드는 선택한 `vaRule`의 source만 사용하고 생성 URL도 `?vaRule=<id>` 형태로 표시한다.
- profile은 fps, queue, confidence, nms, input size, adaptive 여부를 slider/dropdown으로 조정
- rule은 대상 source/route, 사용할 profile, rule 구성 방식, 이벤트 타입 또는 시나리오 템플릿, 분석 객체 카테고리를 선택
- Rule UI는 `기본 설정`, `영상/영역`, `시나리오`, `객체/조건`, `출력/저장` 섹션 탭으로 주요 설정 위치를 바로 찾을 수 있게 한다.
- 영상 프레임 보기는 Rule 기본 정보 바로 아래의 `영상/영역` 섹션에 배치한다. 기본값은 현재 `vaRule`에 묶은 영상 소스이며, 필요하면 video root 파일 또는 메인 `/lab` 선택 소스를 사용할 수 있다. 선택한 영상의 객체 검출 overlay JPEG를 아래 영역 캔버스 배경으로 표시하고, 필요하면 원본 프레임 보기로 끌 수 있다.
- rule 구성 방식은 `기본 이벤트`와 `시나리오`로 나뉜다. 기본 이벤트는 기존 `presence`, `enter`, `exit`, `line-crossing` 설정을 그대로 사용한다.
- 시나리오 방식의 첫 UI 템플릿은 `Intrusion Dwell`이다. 제한구역 이름, 후보 판단 시간(ms), 체류 확정 시간(ms), 재알림 대기 시간(ms), 불안정 track 제외 여부를 설정하고, payload에는 `ruleKind=scenario`, `event.type=intrusion-dwell`, `scenario` 설정 블록을 저장한다.
- 시나리오 UI는 각 시간 range의 현재값, 최소/최대/기본값/단위를 `ms` 형식으로 표시한다. 저장 전 점검 영역에서 제한구역, 대상 객체, 시간 조건, 발생 이벤트, track 조건, 영역 형태를 한 번 더 요약하고, 상태 흐름 미리보기와 처음 보인 시각, 체류 시간, 구역 이동, 라인 방향, 중복 억제, track 안정성 같은 debug field 안내를 함께 표시한다.
- Rule/Profile 카테고리 버튼은 `기본`이 사람+차량만 선택, `전체 선택`이 모든 카테고리 선택, `전체 해제`가 모든 카테고리 해제다.
- 전체 해제 상태는 다시 고르기 위해 비워 둔 임시 상태이며 저장할 수 없다. Rule 저장 시 분석 카테고리가 비어 있으면 화면 다이얼로그를 띄우고 저장을 막는다.
- Profile도 tracking category가 비어 있으면 저장할 수 없다. 전체 match/전체 추적이 필요하면 전체 선택 또는 API의 `*` 토큰을 사용한다.
- polygon 영역은 최대 12개 점까지 지정
- 이미 지정된 점 근처를 드래그하면 새 점을 추가하지 않고 기존 점 위치 이동
- line-crossing rule은 polygon 대신 2개 점짜리 선분으로 저장
- line-crossing 방향은 `any`, `forward`, `reverse` 중 하나로 저장한다. `forward`/`reverse`는 선분 시작점에서 끝점으로 향하는 벡터 기준 signed side 변화로 구분한다.

이벤트 발생 객체는 overlay에서 `이벤트` 또는 `Event` label을 붙이고, 카테고리 기본색과 빨간색을 번갈아 표시하는 blink highlight로 강조합니다.
overlay label은 겹침을 줄이기 위해 먼저 후보 위치를 계산합니다. 이벤트 label은 일반 label보다 먼저 자리를 예약하고 마지막에 그려서, line-crossing/enter/exit 같은 이벤트 객체가 일반 객체 label에 가려지지 않게 합니다.

Event POST는 기본 비활성화입니다. 실제 외부 전송은 `MEDIA_SERVER_ANALYSIS_EVENT_POST_ENABLED=1`로 명시적으로 켠 경우에만 수행합니다. 전송 payload는 `media-server.va.event.v1`로 고정하며 `schema`, `eventId`, `timestampMs`, `source`, `rule`, `object`, `action.highlight`, `action.post`를 포함합니다. worker는 bounded queue와 cooldown을 사용하므로 전송 실패, drop, suppress 상태는 `/lab/analysis/event-post/status`와 `./server.sh verify-event-post`로 확인합니다.

## API

Analysis tap 생성:

```bash
curl -fsS -X POST 'http://127.0.0.1:8080/lab/analysis/taps?file=sample_h264.mp4&profileId=debug&fps=5'
```

상태/metadata/event/snapshot/overlay:

```bash
curl -fsS 'http://127.0.0.1:8080/lab/analysis/taps/{tapId}'
curl -fsS 'http://127.0.0.1:8080/lab/analysis/taps/{tapId}/metadata'
curl -fsS 'http://127.0.0.1:8080/lab/analysis/taps/{tapId}/events'
curl -fsS 'http://127.0.0.1:8080/lab/analysis/taps/{tapId}/events?dispatch=1'
curl -fsS 'http://127.0.0.1:8080/lab/analysis/event-post/status'
curl -fsS 'http://127.0.0.1:8080/lab/analysis/taps/{tapId}/snapshot.jpg?quality=85' -o snapshot.jpg
curl -fsS 'http://127.0.0.1:8080/lab/analysis/taps/{tapId}/overlay.jpg?quality=85&thickness=3&drawLabels=1' -o overlay.jpg
curl -fsS 'http://127.0.0.1:8080/lab/analysis/taps/{tapId}/overlay.jpg?quality=85&redaction=person-mosaic&redactionBlockSize=20' -o person-mosaic.jpg
curl -fsS -X DELETE 'http://127.0.0.1:8080/lab/analysis/taps/{tapId}'
```

Capabilities/profile/rule registry:

```bash
curl -fsS 'http://127.0.0.1:8080/lab/analysis/capabilities'
curl -fsS 'http://127.0.0.1:8080/lab/analysis/profiles'
curl -fsS 'http://127.0.0.1:8080/lab/analysis/rules'
curl -fsS 'http://127.0.0.1:8080/lab/analysis/va-rules'
```

`/lab/analysis/capabilities`의 `trackingCategories`는 Rule/Profile UI와 tracker/rule engine이 공유하는 카테고리 catalog입니다.

영상 분석 설정(`vaRule`) 저장 예시:

```bash
curl -fsS -X POST 'http://127.0.0.1:8080/lab/analysis/va-rules' \
  -H 'Content-Type: application/json' \
  -d '{"name":"lobby sample","source":{"kind":"file","file":"sample_h264.mp4"},"analysis":{"profileId":"server-default-va","classes":["person","vehicle"]},"event":{"type":"presence","region":{"type":"polygon","points":[{"x":0.2,"y":0.2},{"x":0.8,"y":0.2},{"x":0.8,"y":0.8}]},"minConfidence":0.25,"minDurationMs":0},"outputs":{"overlay":true,"metadata":true,"events":true}}'
```

저장 후 사용 예시:

```text
POST http://127.0.0.1:8080/webrtc/session?vaRule=1
rtsp://127.0.0.1:8554/dhseo?vaRule=1
POST http://127.0.0.1:8080/lab/analysis/taps?vaRule=1
```

`vaRule` 요청에 `file`, `url`, `source`를 함께 붙이면 저장 설정의 source mapping을 깨뜨릴 수 있으므로 서버가 거부한다.

```json
{
  "trackingCategories": [
    {
      "value": "person",
      "label": "사람",
      "group": "core person",
      "labels": ["person"],
      "displayLabels": ["사람"]
    },
    {
      "value": "vehicle",
      "label": "차량",
      "group": "core vehicle",
      "labels": ["bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck", "boat"],
      "displayLabels": ["자전거", "자동차", "오토바이", "비행기", "버스", "기차", "트럭", "보트"]
    }
  ]
}
```

Rule 저장 payload는 `analysis.classes`, Profile 저장 payload는 `trackingClasses`에 같은 category token을 담습니다. 빈 배열은 UI/API 모두에서 저장을 막습니다.

## YOLO parser 옵션

1차 YOLO parser는 `YOLOv8/YOLO11` 계열의 `[1, 84, N]` 또는 `[1, N, 84]` 출력과 `YOLOv5` 계열의 objectness 포함 `[1, N, 85]` 출력을 대상으로 합니다.

지원 옵션:

- `outputLayout=auto|channels-first|channels-last`
- `boxFormat=cxcywh|xyxy`
- `scoreMode=auto|class-only|objectness-class|score-class|class-score`

기본값은 기존 `YOLOv8/YOLO11` 검증 모델과 호환되는 `auto + cxcywh + auto`입니다.

검증:

```bash
./server.sh verify-yolo-layouts
./server.sh verify-yolo-layouts --long
```

## 검증

기본 VA 검증:

```bash
./server.sh verify-va
```

긴 안정성 검증:

```bash
MEDIA_SERVER_VERIFY_VA_DURATION_S=120 ./server.sh verify-va
```

자주 쓰는 옵션:

- `MEDIA_SERVER_VERIFY_VA_FILE=imports/NewYorkDriving.mp4`: 로컬에 큰 움직임 영상이 있을 때 변경
- `MEDIA_SERVER_VERIFY_VA_DURATION_S=120`: 검증 시간을 늘림
- `MEDIA_SERVER_VERIFY_VA_SKIP_WEBRTC=1`: 브라우저 검증 제외
- `MEDIA_SERVER_VERIFY_VA_SKIP_RTSP=1`: RTSP 검증 제외
- `MEDIA_SERVER_VERIFY_VA_EXTRA_QUERY='overlayWaitMs=180&overlaySyncToleranceMs=400'`: 추가 query 적용

정적 이미지 분석 검증:

```bash
./server.sh verify-image-analysis
```

`./server.sh test --include-image-analysis`는 정적 이미지 분석 API와 함께 기본 `person,vehicle`, 10개 개별 카테고리, `*` 전체 추적, `animal,car` 혼합 입력, `traffic light` 직접 class label, `vehicles` alias 정책을 리포트에 표시한다.

Route/profile/rule 검증:

```bash
./server.sh verify-route-profiles
./server.sh verify-rule-ui
./server.sh verify-analysis-state
./server.sh verify-tracker-stability
./server.sh verify-tracker-stability --long --overlap-focus
./server.sh verify-va-events --long
./server.sh verify-va-category-samples
./server.sh verify-va-category-samples --no-sports
./server.sh verify-adaptive
```

`verify-va-events`는 presence, `minDurationMs` presence, enter, exit, line-crossing을 같은 이동 테스트 영상에서 확인한다. line-crossing은 `any` 결과가 `forward`/`reverse` 방향별 결과로 분할되는지 함께 확인하고, enter/exit/line-crossing 이벤트는 tracker가 붙인 유효 `trackId` 기준으로 검증한다.

`verify-event-post`는 event POST worker를 켠 서버에서 실행한다. `--mode schema`는 성공 endpoint, 실패 endpoint, cooldown 억제, payload schema를 확인하고, `--mode queue`는 `MEDIA_SERVER_ANALYSIS_EVENT_POST_MAX_QUEUE=1` 또는 `2`로 시작한 서버에서 slow endpoint를 이용해 `droppedCount` 증가를 확인한다. `--mode recovery`는 초반에 실패하던 endpoint가 같은 검증 중 복구될 때 `failedCount`와 `sentCount`가 모두 증가하는지 확인한다.

`verify-analysis-state`는 mock detection/tracking metadata로 TrackStateManager, SceneContextBuilder, EventManager, ScenarioEngine, IntrusionDwellScenario, TrackHealth, Appearance NoOp hook, cleanup 정책을 직접 검증한다. media pipeline을 띄우지 않기 때문에 상황 기반 VA 내부 상태 전이와 기존 스트리밍 회귀 검증을 분리해서 확인할 수 있다.

`verify-va-category-samples`는 기본적으로 `va_four_scene_sample.mp4`와 sports 전용 `va_sports_sample.mp4`를 함께 사용해 10개 카테고리를 모두 hard fail 기준으로 확인한다. 같은 검증에서 `car` 직접 class rule과 `vehicles` alias rule도 presence event로 확인한다. 실행 시작 시 샘플 파일 크기와 ffprobe duration을 사전 진단하고, 성공/실패와 관계없이 category coverage JSON 경로를 출력한다. 브라우저 overlay 수동 확인은 `/lab`에서 `va=1`, `trackIds=1`, `trackTrails=1`을 켜고 진행한다. `2026-04-26` 기준 `route=webrtc` 테스트 rule(presence, line-crossing)을 임시 등록한 뒤 `va_four_scene_sample.mp4`와 `imports/va_tracking_event_1280x720_30fps_h264.mp4` 모두 WebRTC simple signaling 연결과 overlay 표출을 확인했다.

`verify-tracker-stability`는 fragmentation/stale PTS 기준 외에 class/category별 track/sample count를 summary NDJSON과 반복 요약에 출력한다. 기본 stale PTS 허용 비율은 `0.3`이고, `--overlap-focus`는 동시 track이 많은 구간의 fragmentation ratio를 별도로 hard gate로 확인한다. 더 강한 ID switch 검증이 필요하면 겹침/교차가 많은 샘플을 `--file imports/<sample>.mp4 --long --overlap-focus` 형태로 지정해 같은 기준을 재사용한다.

`verify-adaptive`는 downshift, input-size downshift/fallback, upshift를 각각 별도 tap으로 검증하고 summary JSON을 남긴다. 기본 장시간 검증은 `POLL_COUNT=80`, `INTERVAL=0.25s`이며 smoke가 필요하면 `MEDIA_SERVER_VERIFY_ADAPTIVE_POLL_COUNT=50`처럼 줄여 실행한다. input-size 케이스는 fps 하향을 막은 상태에서 640 입력이 480/320 단계로 내려가는지 확인한다.

`verify-yolo-layouts`는 각 모델/layout/box/scoreMode 케이스의 마지막 tap 상태를 summary NDJSON으로 남긴다. detection이 0건이면 output layout, box format, score mode 조합을 우선 확인하라는 힌트를 출력한다.

상세 검증 이력은 `stream-verification.md`를 봅니다.
