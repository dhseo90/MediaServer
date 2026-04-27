<!--
이 파일의 목적/역할: MediaServer의 후속 개발 60개 작업을 실행 순서와 상태로 추적한다.
-->

# MediaServer 후속 개발 체크리스트

상태 표기:

- `[ ]`: 미시작
- `[~]`: 진행 중
- `[x]`: 완료

## 1차 안정화와 Rule/Profile 검증

1.  [x] 60개 작업 추적용 체크리스트 문서 추가
2.  [x] 현재 검증 명령별 pass/fail 기준 재정리
3.  [x] `/lab/rules` 저장 payload 스키마 문서화
4.  [x] Rule/Profile 카테고리 API 응답 예시 추가
5.  [x] Rule/Profile 빈 카테고리 validation 테스트 보강
6.  [x] Rule UI 카테고리 표시 스냅샷 검증 추가
7.  [x] Rule UI payload와 API 저장값 비교 테스트 추가
8.  [x] Profile 기본/전체/해제 버튼 상태 테스트 보강
9.  [x] Rule 기본/전체/해제 버튼 상태 테스트 보강
10. [x] 카테고리 catalog 순서 고정 테스트 추가

## Category/Rule Engine 정밀화

11. [x] `trackingClasses`와 category token 혼용 입력 테스트
12. [x] 세부 COCO class label 직접 입력 테스트
13. [x] `trackingClasses=*` 전체 추적 테스트 확장
14. [x] category token alias 매칭 테스트 추가
15. [x] Rule engine class/category match 단위 테스트 추가
16. [x] presence 이벤트 minDuration 테스트 보강
17. [x] enter/exit 상태 유지 테스트 보강
18. [x] line-crossing 방향 옵션 설계
19. [x] line-crossing 방향 옵션 구현
20. [x] line-crossing 방향별 검증 영상/테스트 추가
21. [x] 이벤트 highlight blink timing 테스트 추가
22. [x] 이벤트 POST payload schema 검증 강화
23. [x] 이벤트 POST 실패/재시도/드롭 카운터 테스트
24. [x] 이벤트 POST cooldown 정책 문서화
25. [x] 이벤트 POST 큐 포화 상황 검증

## Overlay/Tracker 안정화

26. [x] overlay label collision 개선 검토
27. [x] overlay label collision 테스트 영상 추가
28. [x] overlay event label 표시 우선순위 정리
29. [x] overlay track trail 표시 성능 점검
30. [x] tracker fragmentation 장시간 기준 재평가
31. [x] tracker 겹침 장면 추가 샘플 제작
32. [x] tracker stale PTS 비율 기준 문서화
33. [x] tracker class/category별 통계 리포트 추가
34. [x] 동물/도로/스포츠 category tracking opt-in 검증
35. [x] 정적 이미지 분석 API category fixture 확장
36. [x] `verify-image-analysis` 결과 리포트 상세화
37. [x] `verify-va-category-samples` 샘플 coverage 리포트 추가
38. [x] sports 샘플 의존성 실패 메시지 개선
39. [x] VA 샘플 파일 존재 여부 사전 진단 추가

## YOLO/Adaptive/WebRTC/URI 검증

40. [x] YOLO layout 검증 결과 요약 JSON 출력
41. [x] YOLO score mode 실패 원인 메시지 개선
42. [x] adaptive tuner 상태 전환 로그 정리
43. [x] adaptive tuner input-size fallback 테스트 추가
44. [x] adaptive tuner longrun threshold 문서화
45. [x] WebRTC ICE config UI 상태 테스트 보강
46. [x] TURN 미설정 relay fallback 테스트 유지보수
47. [x] 외부 TURN credential 준비 시나리오 문서화
48. [x] `verify-webrtc-ice --external-turn` skip/pass 리포트 개선
49. [x] WHIP publish 실패 원인 분류 로그 개선
50. [x] WHEP/simple signaling 공통 검증 helper 정리
51. [x] HTTP/HLS URI longrun 기본 외부 후보 상태 재확인
52. [x] 외부 HLS advisory 결과 캐시/리포트 추가
53. [x] URI source EOS/reconnect 로그 정리
54. [x] YouTube import 실험 기능 상태 문서 분리
55. [x] YouTube resolver 실패 타입 분류 추가
56. [x] `/lab/import` job 상태 UI 검증 추가
57. [x] source/session lifecycle trace 옵션 정리
58. [x] StreamRegistry idle cleanup 검증 추가
59. [x] 통합 `./server.sh test --include-*` 조합 smoke 재실행
60. [x] 다음 안정 커밋 후보 범위 산정

## 현재 진행 메모

- 1차 묶음은 문서 추적, Rule/Profile 카테고리 schema, UI 표시, 빈 선택 validation, 저장 payload round-trip 검증까지 완료했다.
- 기능 동작을 바꾸기보다 이미 구현된 카테고리 정책이 UI/API/문서에서 같은 의미로 보이는지 먼저 고정한다.
- 검증: `./server.sh verify-rule-ui --http-base http://127.0.0.1:8081` 통과. catalog 순서/스키마, UI 포함 객체명 표시, 빈 선택 차단, 저장 payload/API round-trip을 확인했다.
- 2차 묶음은 trackingClasses category/all/mixed/direct/alias 정책과 rule engine category/direct class/alias presence match까지 완료했다.
- 검증: `MEDIA_SERVER_VERIFY_IMAGE_HTTP_BASE=http://127.0.0.1:8081 ./server.sh verify-image-analysis` 통과. `animal,car`, `traffic light`, `vehicles`, `*` 정책을 확인했다.
- 검증: `MEDIA_SERVER_VERIFY_VA_CATEGORY_HTTP_BASE=http://127.0.0.1:8081 ./server.sh verify-va-category-samples --duration 10` 통과. 기본 category 10개와 `car` 직접 class, `vehicles` alias rule 이벤트를 확인했다.
- 3차 묶음은 `verify-va-events`에 `minDurationMs=500` presence rule과 enter/exit/line-crossing rule별 trackId 상태 검증을 추가했다.
- 검증: `MEDIA_SERVER_VERIFY_VA_HTTP_BASE=http://127.0.0.1:8081 ./server.sh verify-va-events --duration 30` 통과. `presence-500ms`, `enter-center`, `exit-center`, `line-left`, `line-right` rule 이벤트와 유효 trackId를 확인했다.
- 4차 묶음은 line-crossing 방향을 `any`, `forward`, `reverse`로 확장하고 Rule UI 선택값 저장과 이벤트 방향 분할 검증을 추가했다.
- 검증: `./server.sh verify-rule-ui --http-base http://127.0.0.1:8081` 통과. `line-crossing` payload에 `direction=forward`가 저장되는 것을 확인했다.
- 검증: `MEDIA_SERVER_VERIFY_VA_HTTP_BASE=http://127.0.0.1:8081 ./server.sh verify-va-events --duration 30` 통과. line-crossing `8`, `line-left/right` any 결과와 `forward/reverse` 분할 합이 일치하는 것을 확인했다.
- 5차 묶음은 `./server.sh verify-event-post`를 추가해 POST payload schema, 실패 counter, cooldown suppress, bounded queue drop을 분리 검증한다.
- 검증: `MEDIA_SERVER_ANALYSIS_EVENT_POST_ENABLED=1 MEDIA_SERVER_ANALYSIS_EVENT_POST_MAX_QUEUE=64 ./server.sh verify-event-post --mode schema` 통과. `enqueued=6`, `sent=3`, `failed=3`, `suppressed=6`, schema `media-server.va.event.v1` payload를 확인했다.
- 검증: `MEDIA_SERVER_ANALYSIS_EVENT_POST_ENABLED=1 MEDIA_SERVER_ANALYSIS_EVENT_POST_MAX_QUEUE=2 ./server.sh verify-event-post --mode queue` 통과. slow endpoint에서 `enqueued=18`, `dropped=15`, `maxQueueSize=2`를 확인했다.
- 검증: `MEDIA_SERVER_VERIFY_VA_HTTP_BASE=http://127.0.0.1:8081 ./server.sh verify-va-events --duration 30` 재실행 통과. 모든 이벤트 rule에서 highlight color `#ff0000`, `durationMs=1500`이 유지되는 것을 확인했다.
- 6차 묶음은 overlay label placement, tracker class/category 통계, category sample preflight/coverage 리포트를 보강했다. 새 대용량 binary fixture는 추가하지 않고 기존 `va_tracking_event*`, `va_four_scene_sample`, `va_sports_sample`과 자동 생성 long sample 정책을 사용한다.
- 검증: `MEDIA_SERVER_VERIFY_IMAGE_HTTP_BASE=http://127.0.0.1:8081 ./server.sh verify-image-analysis` 통과 `6/0/0`. tracking summary JSON과 animal/road/category/all/direct/alias 결과를 확인했다.
- 검증: `MEDIA_SERVER_VERIFY_VA_CATEGORY_HTTP_BASE=http://127.0.0.1:8081 ./server.sh verify-va-category-samples --duration 10` 통과 `18/0/0`. 기본/sports 샘플 사전 진단, category coverage JSON, sports labels를 확인했다.
- 검증: `MEDIA_SERVER_VERIFY_TRACKER_HTTP_BASE=http://127.0.0.1:8081 ./server.sh verify-tracker-stability --duration 8 --repeat 1 --overlap-focus` 통과 `4/0/0`. category/class track/sample counts, stalePtsRatio `0.0`, fragmentationRatio `1.0`을 확인했다.
- 7차 묶음은 YOLO/adaptive/WebRTC/URI 검증 리포트를 JSON summary와 실패 힌트 중심으로 보강했다.
- 검증: `MEDIA_SERVER_VERIFY_YOLO_LAYOUT_HTTP_BASE=http://127.0.0.1:8081 ./server.sh verify-yolo-layouts --duration 5 --no-download` 통과 `7/0/0`. 세 layout/score 조합 summary NDJSON을 확인했다.
- 검증: `MEDIA_SERVER_VERIFY_ADAPTIVE_HTTP_BASE=http://127.0.0.1:8081 MEDIA_SERVER_VERIFY_ADAPTIVE_POLL_COUNT=50 ./server.sh verify-adaptive` 통과 `8/0/0`. downshift, input-size `640→320`, upshift summary JSON을 확인했다.
- 검증: `MEDIA_SERVER_WEBRTC_ICE_TRANSPORT_POLICY=relay MEDIA_SERVER_WEBRTC_TURN_SERVER= ./server.sh verify-webrtc-ice --skip-browser --skip-whip` 통과 `7/0/2`. TURN 미설정 relay 요청이 `/webrtc/config`에서 `relayPolicyFallback=true`, effective policy `all`로 내려가는 것을 확인했다.
- 검증: `MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 ./server.sh verify-uri-longrun --iterations 1 --include-external --use-default-external --skip-local-http --skip-local-hls --external-rtsp-routes default` 통과. Mux/Apple 외부 HLS 후보 모두 `RTSP /default -> h264/aac`, WebRTC signaling 통과했고 summary JSON을 확인했다.
- 8차 묶음은 YouTube/import 상태 문서 분리, resolver 실패 유형 확장, Lab import UI smoke, lifecycle/idle cleanup 기준 정리, 최종 smoke 재실행을 완료했다.
- 검증: `./server.sh verify-lab-import-ui --http-base http://127.0.0.1:8081` 통과 `3/0/0`. `/lab/import` HTML 필수 요소와 `/lab/import/jobs` 구조를 확인했다.
- 검증: `MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 ./server.sh test --no-start --include-rules --include-rule-ui --include-va-events --include-image-analysis`는 `18/1/4`로 WHIP publish 케이스가 1회 readiness race(`unknown WebRTC source`) 실패했다.
- 후속 보강: WHIP publish source readiness를 `/lab/runtime/status`의 `webrtcHttp.publishSources[].hasVideo/hasAudio` 기준으로 기다리게 했다. `MEDIA_SERVER_VERIFY_SOURCE_FILTER=webrtc_local_publish_h264_opus ./server.sh verify-codecs`는 readiness 보강 후 `5/0/11`로 통과했다.
- 추가 다채널 점검은 `./server.sh verify-multichannel`로 분리했다. 같은 영상 다중 WebRTC client는 `activeSessions=N`, dedup stream `1`을 확인하고, 여러 영상 다중 client는 source 수와 같은 dedup stream 수를 확인한다. `--include-va`는 VA overlay 다채널의 `activeAnalysisTaps`와 종료 후 cleanup까지 확인한다.
- 9차 장기성 검증 묶음은 WHIP readiness 보강, 다채널 VA 반복, URI/HLS 반복, VA/tracker/YOLO/adaptive, WebRTC ICE, route profile, 전체 codec matrix를 같은 서버 세션에서 재검증했다.
- 검증: `./server.sh verify-multichannel --include-va --repeat 3 --single-clients 3 --clients-per-source 2 --hold-ms 12000` 통과 `24/0/0`. 일반/VA 단일 source와 다중 source fan-out 모두 반복 간 cleanup까지 확인했다.
- 검증: `./server.sh verify-uri-longrun --iterations 3 --include-external --use-default-external --external-rtsp-routes default,h264,opus` 통과 `12/0/0`. 로컬 HTTP/HLS와 Mux/Apple 외부 HLS advisory를 함께 확인했다.
- 검증: `./server.sh verify-va-events --long` 통과 `17/0/0`, `./server.sh verify-tracker-stability --long --overlap-focus` 통과 `8/0/0`, `./server.sh verify-yolo-layouts --duration 10 --no-download` 통과 `7/0/0`, `./server.sh verify-adaptive` 통과 `8/0/0`.
- 검증: `./server.sh verify-route-profiles` 통과 `7/0/0`, `./server.sh verify-webrtc-ice` 통과 `8/0/0`, `./server.sh verify-codecs` 통과 `67/0/3`. 외부 운영 TURN relay/auth는 credential 미확보로 이번 묶음에서도 진행하지 않았다.
- 10차 후속 개발은 Lab runtime 상태 표시, 수동 다채널 WebRTC 패널, 검증 summary Markdown 생성기, URI 실패 원인 분류, event POST recovery 검증을 추가했다.
- 검증: `MEDIA_SERVER_LISTEN_PORT=8555 MEDIA_SERVER_HTTP_LISTEN_PORT=8081 ./server.sh test --no-start --include-rules --include-rule-ui --include-va-events --include-image-analysis` 통과 `19/0/4`.
- 검증: `/lab` 브라우저 확인에서 runtime panel, 다채널 수동 테스트 DOM, runtime text `session 0 · stream 0 · tap 0`을 확인했다.
- 검증: `./server.sh verify-multichannel --include-va --repeat 1 --single-clients 2 --clients-per-source 2 --hold-ms 5000` 통과 `8/0`.
- 검증: `MEDIA_SERVER_ANALYSIS_EVENT_POST_ENABLED=1 ./server.sh verify-event-post --mode recovery` 통과 `11/0/0`. 복구 endpoint에서 `sentCount=3`, `failedCount=3`, `/flaky` 수신 `8`건을 확인했다.
- 검증: `./server.sh summarize-reports /tmp/media_server_*summary*.json --output /tmp/media_server_verification_report.md` 출력 생성 확인.
- 11차 후속 개발은 기능 개발 재개 전 안정화 묶음 `./server.sh verify-predev`를 추가했다. 통합 smoke, 다채널 WebRTC/VA, VA event, event POST schema/recovery/queue, summary report, runtime idle, 대표 port cleanup을 하나의 실행으로 확인한다.
- 검증: `./server.sh verify-predev --quick` 통과 `14/0/0`.
- 검증: `./server.sh verify-predev --soak-minutes 30` 통과 `89/0/0`, duration `2457s`, summary `/tmp/media_server_predev-1777284107-17671_summary.json`, report `/tmp/media_server_predev-1777284107-17671_report.md`. 종료 후 `8080/8081/8554/8555` listener 없음.
- 12차 후속 개발은 Lab 리포트 뷰어, event POST 상태 패널, 다채널 client별 통계 표시, `/lab/runtime/status` profile/rule matching 요약, `verify-event-post-longrun`, `verify-tracker-stability --stress`, `verify-uri-longrun --external-config`, `verify-predev --include-external-turn`, `summarize-reports --html-output`을 추가했다.
- 외부 운영 TURN relay/auth는 credential 확보 전까지 기본 안정 기준에서 제외한다. `--include-external-turn`을 명시하면 credential/policy 누락도 실패로 처리한다.

## 13차 잔여 안정화 이슈 15개

압축 전 대화에 있던 번호 목록은 파일에 남아 있지 않아, 현재 코드 기준으로 남은 안정화 잔여 이슈를 아래 15개로 재고정한다. 신규 기능 구현은 제외하고, 검증/리포트/문서의 추적성을 우선 보강한다.

1.  [x] `verify-predev --quick` 도움말과 실제 VA event duration 설명 일치
2.  [x] `verify-predev` 외부 TURN hard gate 제외 상태를 summary step에 skip으로 기록
3.  [x] `verify-predev` runtime idle 판정에 WebRTC publish session/source 잔여 상태 포함
4.  [x] `verify-predev`를 loopback 기본 bind로 실행하고 로컬 env override와 cleanup port 판정 정리
5.  [x] `verify-predev` LAN IP 외부 접근성 hard gate를 `--include-external-client`로 분리
6.  [x] `verify-predev` summary에 status, workDir, finishedAt metadata 추가
7.  [x] `verify-event-post-longrun` summary에 status, httpBase, workDir, duration metadata 추가
8.  [x] `verify-event-post-longrun` mode 오타/중복을 시작 전에 검출
9.  [x] `summarize-reports`가 삭제 중인 `/tmp` 파일 stat 실패에 견디도록 보강
10. [x] `summarize-reports`가 읽기 실패 파일을 전체 실패가 아닌 개별 실패 payload로 기록
11. [x] `summarize-reports` Markdown 표에 상태 컬럼 추가
12. [x] `summarize-reports` report kind 추정 범위 확장
13. [x] Lab report 목록/본문 응답에 extension, kind, maxBytes, truncatedBytes metadata 추가
14. [x] Lab report UI truncation 문구를 실제 max/truncated byte 기준으로 표시
15. [x] 후속 기능 후보에 사람 객체 자동 모자이크 모드 추가

- 검증: `./server.sh verify-predev --skip-build --soak-minutes 0 --heartbeat-interval 30` 통과 `8/0/3`, summary `/tmp/media_server_predev-1777292825-16550_summary.json`, report `/tmp/media_server_predev-1777292825-16550_report.md`, report html `/tmp/media_server_predev-1777292825-16550_report.html`. 기본 predev에서는 LAN IP 외부 접근성과 외부 TURN hard gate가 skip으로 기록되고, 종료 후 `8080/8081/8554/8555` listener 없음.

## 14차 테스트 모드 분리

- `./server.sh test` 무옵션은 `--basic`으로 실행한다. basic은 로컬 재현성을 우선해 외부망/LAN probe 없이 정적 검사, summary report smoke, 서버 readiness, 로컬 stream matrix, 기본 YOLO/VA overlay를 확인한다.
- `./server.sh test --full`은 basic에 Rule/Profile UI, VA event, image analysis, event POST, 일반/VA WebRTC 다채널 fan-out을 추가한다.
- `./server.sh test --external`은 full에 LAN IP 외부 클라이언트 접근성, 외부 RTSP advisory, WebRTC ICE, 외부 HTTP/HLS URI longrun을 추가한다.
- `./server.sh test --stable`은 기존 stable 호환 기준으로 로컬 stream/VA와 LAN IP 외부 클라이언트 접근성, 제3자 RTSP upstream advisory를 함께 본다.

## 후속 기능 후보

- 사람 객체 자동 모자이크 모드: 우선 `person bbox mosaic`부터 검토한다. `redaction=person-mosaic`, `redactionClasses=person`, margin/block size, 원본 route 노출 정책, `verify-redaction` 같은 별도 검증이 필요하다. 얼굴/세그멘테이션 기반 비식별화는 정확도와 누락 리스크가 커서 2단계 후보로 둔다.
