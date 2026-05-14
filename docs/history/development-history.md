# Development History

이 문서는 완료된 개발 이력을 보존합니다.
아래 항목은 당시 기준의 기록이며 현재 제품 진입점이 아닙니다.
현재 남은 작업은 [../development-backlog.md](../development-backlog.md)를 봅니다.
현재 실행/검증 기준은 [../stream-verification.md](../stream-verification.md)를 봅니다.

현재 기준:

- 제품 UI는 `/ops`와 `/client`입니다.
- `/lab`, `/lab/rules`, `/lab/import` 화면 route는 404로 닫혔습니다.
- `/webrtc/test` 같은 초기 브라우저 테스트 화면은 제품 문서와 UI 진입점에서 제거합니다.

## 13차 - v1.1.0 문서 통합

완료:

- v1.1.0 전용 roadmap 문서를 제거하고 현재 기준은 `development-backlog.md`와
  기능별 상세 문서로 통합했습니다.
- README/English index의 문서 지도에서 v1.1.0 전용 roadmap 링크를 제거했습니다.
- `development-backlog.md`를 현재 main baseline과 v1.2.0 roadmap 후보 중심으로
  축소했습니다.
- ONVIF, source health, live event/metadata, scenario timeline 문서는 버전별
  분리 문서가 아니라 현재 기능 기준 문서로 정리했습니다.

검증:

- `./server.sh verify-docs-links`
- `./server.sh verify-docs-ui-assets`
- `git diff --check`

## 12차 - 운영 제품화 안정화

완료:

- 운영 백업/복구 dry-run 리허설 명령 추가
- Evidence retention cleanup job 추가
- Audit trail 기간/사용자/대상 검색, CSV/JSON/Diff export, interactive/export limit 분리
- RC release gate artifact 외부 directory archive와 checksum/index 생성
- `/ops/dashboard` 문제 원인 패널의 다음 조치 버튼 추가
- 채널/룰/사용자 table row/action/detail helper 공통화

검증:

- `./server.sh verify-ops-backup-restore-dry-run`
- `./server.sh verify-ops-evidence-retention-cleanup`
- `./server.sh verify-ops-audit-persistence`
- `./server.sh verify-rc-release-gate`
- `./server.sh verify-ops-root-cause-panel`
- `./server.sh verify-ops-tables-layout`
- `./server.sh verify-ops-client-ui`
- `./server.sh verify-ops-click-e2e`

## 1차 - Rule/Profile 안정화

완료:

- 60개 작업 추적용 체크리스트 추가
- 검증 명령별 pass/fail 기준 정리
- 당시 `/lab/rules` 저장 payload schema 문서화. 현재 화면 route는 404이며 제품 룰 관리는 `/ops/rules`에서 합니다.
- Rule/Profile category API 응답 예시 추가
- 빈 category validation 테스트 보강
- Rule UI category 표시와 payload/API round-trip smoke 추가
- profile/rule 기본/전체/해제 버튼 상태 테스트 보강
- category catalog 순서 고정

검증:

- `./server.sh verify-rule-ui`
- `./server.sh verify-image-analysis`
- `./server.sh verify-va-category-samples`

## 2차 - Category/Rule Engine 정밀화

완료:

- `trackingClasses`와 category token 혼용 입력 테스트
- COCO class label 직접 입력 테스트
- `trackingClasses=*` 전체 추적 테스트
- category alias matching 테스트
- rule engine class/category match 단위 테스트
- presence minDuration, enter/exit 상태 유지 테스트
- line-crossing 방향 옵션 설계/구현/검증
- event highlight blink timing 테스트
- event POST payload schema, 실패/재시도/drop counter 검증

## 3차 - Overlay/Tracker 안정화

완료:

- overlay label collision 개선 검토
- event label 표시 우선순위 정리
- tracker fragmentation 장시간 기준 재평가
- tracker 겹침 장면 샘플과 stale PTS 기준 문서화
- tracker class/category별 통계 리포트
- 동물/도로/스포츠 category tracking opt-in 검증
- 정적 이미지 분석 API category fixture 확장
- `verify-image-analysis`, `verify-va-category-samples`, `verify-tracker-stability` 리포트 강화

## 4차 - YOLO/Adaptive/WebRTC/URI 검증

완료:

- YOLO layout 검증 summary JSON 출력
- YOLO score mode 실패 원인 메시지 개선
- adaptive tuner 상태 전환 로그와 input-size fallback 테스트
- WebRTC ICE config UI 상태 테스트
- TURN 미설정 relay fallback 검증
- 외부 TURN credential 준비 시나리오 문서화
- WHIP/WHEP/simple signaling 검증 helper 정리
- HTTP/HLS URI longrun 후보 검증
- URI source EOS/reconnect 로그 정리

## 5차 - YouTube/import와 당시 Lab 통합

완료:

- YouTube import 실험 기능 상태를 [../youtube-import.md](../youtube-import.md)로 분리
- YouTube resolver 실패 타입 분류
- 당시 `/lab/import` job 상태 UI 검증. 현재 화면 route는 404이며 채널 관리는 `/ops/sources`에서 합니다.
- source/session lifecycle trace 옵션 정리
- StreamRegistry idle cleanup 검증
- 당시 `/lab` 통합 진입점 정리
- 당시 `/webrtc/test`, `/lab/rules`, `/lab/import` 호환 route 유지. 현재는 제품 UI에서 제거된 이전 화면입니다.

## 6차 - 다채널/리포트/Predev 안정화

완료:

- `./server.sh verify-multichannel`
- `./server.sh summarize-reports`
- `./server.sh verify-event-post --mode recovery`
- `/lab/runtime/status` runtime 상태 패널
- 다채널 WebRTC 수동 테스트 패널
- 검증 summary Markdown/HTML 생성
- event POST longrun, tracker stress, URI external config, predev external TURN option
- `./server.sh verify-predev` 안정화 묶음

## 7차 - Test mode 분리와 redaction

완료:

- `./server.sh test`를 `basic/full/external/stable`로 분리
- 사람 객체 bbox 기반 `redaction=person-mosaic`
- 정적 이미지, RTSP overlay, WebRTC overlay, Lab VA controls 연결
- `./server.sh verify-redaction`
- `test --full`과 `verify-predev`에 redaction smoke 포함

주의:

- redaction은 detection bbox 기반입니다. 얼굴 인식/segmentation 기반 비식별화는 후속 작업입니다.

## 8차 - 상황 기반 VA Step 0-11

완료:

- 현재 RTSP/WebRTC/VA 구조 분석
- 기존 streaming + VA rule event baseline 검증 추가
- Detection/Tracking metadata adapter 정리
- `TrackedObjectMetadata`
- `TrackRuntimeState`
- `TrackStateManager`
- stream/channel별 track map 분리
- observation ring buffer와 trajectory cap
- Active/Lost/Terminated lifecycle
- `SceneContextBuilder`
- `ZoneState`, `LineCrossState`
- 기존 Intrusion/LineCrossing event를 TrackState/SceneContext 기반으로 이식
- `EventManager` lifecycle, dedupe, cooldown
- `ScenarioPhase`, `ScenarioInstance`, `IScenario`, `ScenarioEngine`
- `IntrusionDwellScenario`
- `TrackHealth`
- `AppearanceProfile`, `IAppearanceExtractor`, `NoOpAppearanceExtractor`
- 다채널 cleanup 정책

제약 유지:

- 기존 direction-based tracking id 생성 방식 유지
- Kalman Filter 미도입
- 외부 tracker 미도입
- 실제 Re-ID 모델 미도입
- 기존 event JSON/API/POST 형식 유지

## 9차 - Step 12-19 검증/운영 도구

완료:

- Step 12 전체 회귀/cleanup/다채널 검증
- Step 13 VA metadata replay 도구
- Step 14 baseline fixture와 replay 결과 비교
- Step 15 debug overlay/state dump
- Step 16 VA metrics/TrackHealth report
- Step 17 EventRecord 저장 구조
- Step 18 snapshot/clip hook
- Step 19 WebRTC DataChannel VA metadata output 설계/구현

## 10차 - Step 20-28 Scenario/Tracking/Geometry

완료:

- Step 20 ReEntryScenario
- Step 21 WrongDirectionScenario
- Step 22 IntrusionAfterLineCrossingScenario
- Step 23 LoiteringScenario
- Step 24 Tracking issue report
- Step 25 IoU + center distance + direction + class score 기반 association 보강
- Step 26 Lost track buffer/reacquire 정책
- Step 27 HomographyConfig/CameraCalibration 구조
- Step 28 ground-plane distance/speed/radius 계산 연동

## 11차 - Step 29-32 Re-ID/성능/통합

완료:

- Step 29 실험용 ONNX Re-ID extractor hook
- Step 30 Re-ID 실행 정책과 다채널 resource budget
- Step 31 다채널 VA 성능 최적화 기준과 metrics/queue 정책
- Step 32 최종 통합 검증과 문서/backlog 정리

남은 리스크:

- 실제 Re-ID enabled 모델 검증은 모델 파일/운영 policy 확정 전까지 제한적입니다.
- WebRTC DataChannel은 offer/application m-line smoke 이후 browser message 자동 수신 검증이 남아 있습니다.
- 실제 snapshot JPEG/clip recorder는 marker hook 이후 후속 구현입니다.
