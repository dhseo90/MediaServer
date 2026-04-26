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

정적 이미지 분석은 서버에 overlay 파일을 저장하지 않고 요청 시 즉석에서 JPEG 응답을 생성합니다.

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
- RTSP/WebRTC raw video 구간에 overlay 합성
- metadata/snapshot/overlay JPEG API 제공

느린 detector 상황에서는 relay path를 막지 않기 위해 오래된 분석 frame부터 버립니다. adaptive tuner가 켜져 있으면 detector 처리 시간, pending queue, queue drop을 보고 런타임 fps를 먼저 낮춥니다. 모델이 dynamic input을 지원하면 input size도 단계적으로 낮출 수 있습니다.

## Overlay Sync

RTSP/WebRTC egress는 source packet PTS를 세션별 normalized PTS로 바꿉니다. overlay 합성 시에는 normalized PTS를 다시 source PTS로 매핑한 뒤 analysis result history에서 가장 가까운 결과를 찾습니다.

관련 기본값:

- `MEDIA_SERVER_ANALYSIS_OVERLAY_WAIT_MS`: 기본 `180`
- `MEDIA_SERVER_ANALYSIS_OVERLAY_SYNC_TOLERANCE_MS`: 기본 `400`

PTS 매칭이 실패하면 최신 result로 fallback합니다. 이 fallback은 overlay가 아예 사라지는 것보다 최신 분석 결과를 보여주는 쪽을 우선한 안전장치입니다.

## Rule / Event

`/lab`의 VA 룰 편집기에서 profile과 event rule을 저장할 수 있습니다.

지원하는 event rule 1차 범위:

- presence
- enter
- exit
- line-crossing(any)

룰 편집 UI 동작:

- profile은 fps, queue, confidence, nms, input size, adaptive 여부를 slider/dropdown으로 조정
- rule은 대상 source/route, 사용할 profile, 이벤트 타입, 분석 객체 타입을 선택
- polygon 영역은 최대 12개 점까지 지정
- 이미 지정된 점 근처를 드래그하면 새 점을 추가하지 않고 기존 점 위치 이동
- line-crossing rule은 polygon 대신 2개 점짜리 선분으로 저장
- 현재 line-crossing 방향은 `any`로 저장하며 양방향 통과를 같은 이벤트로 봄

이벤트 발생 객체는 overlay에서 `이벤트` 또는 `Event` label과 blink highlight로 강조합니다.

Event POST는 기본 비활성화입니다. 실제 외부 전송은 `MEDIA_SERVER_ANALYSIS_EVENT_POST_ENABLED=1`로 명시적으로 켠 경우에만 수행합니다.

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
curl -fsS -X DELETE 'http://127.0.0.1:8080/lab/analysis/taps/{tapId}'
```

Capabilities/profile/rule registry:

```bash
curl -fsS 'http://127.0.0.1:8080/lab/analysis/capabilities'
curl -fsS 'http://127.0.0.1:8080/lab/analysis/profiles'
curl -fsS 'http://127.0.0.1:8080/lab/analysis/rules'
```

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

기본 VA 회귀 검증:

```bash
./server.sh verify-va
```

긴 회귀 검증:

```bash
MEDIA_SERVER_VERIFY_VA_DURATION_S=120 ./server.sh verify-va
```

자주 쓰는 옵션:

- `MEDIA_SERVER_VERIFY_VA_FILE=imports/NewYorkDriving.mp4`: 로컬에 큰 움직임 영상이 있을 때 변경
- `MEDIA_SERVER_VERIFY_VA_DURATION_S=120`: 회귀 시간을 늘림
- `MEDIA_SERVER_VERIFY_VA_SKIP_WEBRTC=1`: 브라우저 검증 제외
- `MEDIA_SERVER_VERIFY_VA_SKIP_RTSP=1`: RTSP 검증 제외
- `MEDIA_SERVER_VERIFY_VA_EXTRA_QUERY='overlayWaitMs=180&overlaySyncToleranceMs=400'`: 추가 query 적용

정적 이미지 분석 검증:

```bash
./server.sh verify-image-analysis
```

Route/profile/rule 검증:

```bash
./server.sh verify-route-profiles
./server.sh verify-tracker-stability
./server.sh verify-adaptive
```

상세 검증 이력은 `stream-verification.md`를 봅니다.
