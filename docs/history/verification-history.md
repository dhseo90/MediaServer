# Verification History

이 문서는 과거 상세 검증 이력을 보존합니다. 현재 실행해야 할 검증 기준은 [../stream-verification.md](../stream-verification.md)를 봅니다.

## 2026-05-03 - theme-aware design system 1차 반영 후 UI screenshot 재점검

갱신:

- `docs/assets/ui/analysis-rule-list.png`
- `docs/assets/ui/analysis-rule-editor-basic.png`
- `docs/assets/ui/analysis-rule-editor-scenario.png`
- `docs/assets/ui/analysis-region-canvas.png`
- `docs/assets/ui/analysis-preview.png`
- `docs/assets/ui/analysis-developer-url.png`
- `docs/assets/ui/analysis-runtime-dashboard.png`

확인:

- light/dark semantic token, button fill/weak/ghost/danger, badge status 계층을 반영한 dark mode 기준 캡처
- `analysis-rule-editor-basic.png`는 상단 command card와 섹션 이동 버튼, 기본 정보 card 사이 여백이 분리된 상태로 캡처
- `analysis-region-canvas.png`와 `analysis-preview.png`는 실제 객체가 있는 `va_four_scene_sample.mp4` 기준이며 영상 프레임 하단까지 포함
- `analysis-developer-url.png`는 일반 확인용 URL과 custom client용 side-channel URL 그룹을 모두 포함
- `analysis-runtime-dashboard.png`는 Health Summary, Warnings, Metadata/Backpressure, Runtime Detail, Tracks, Scenario/Event/Tracking Issues 구간이 table row 중간에서 잘리지 않도록 panel 경계 기준으로 캡처

## 2026-05-03 - 문서 UI screenshot 전면 갱신

갱신:

- `docs/assets/ui/analysis-rule-list.png`
- `docs/assets/ui/analysis-rule-editor-basic.png`
- `docs/assets/ui/analysis-rule-editor-scenario.png`
- `docs/assets/ui/analysis-region-canvas.png`
- `docs/assets/ui/analysis-preview.png`
- `docs/assets/ui/analysis-developer-url.png`
- `docs/assets/ui/analysis-runtime-dashboard.png`

확인:

- 문서 대표 이미지는 dark mode 기준으로 캡처
- 영상/캔버스 이미지는 실제 객체가 있는 `va_four_scene_sample.mp4` 사용
- 영상 분석 보기와 영역/라인 캔버스는 영상 프레임 하단까지 포함
- 룰 편집 상단 command card와 `기본 정보` 섹션 이동 버튼 영역은 서로 붙어 보이지 않는 상태로 캡처
- Runtime Dashboard는 table row 중간에서 잘리지 않도록 전체 panel 경계 기준으로 캡처

## 2026-05-03 - 실패 이슈 재점검

확인:

- git 상태: `main`은 `origin/main`과 동일했고 미푸시 커밋 없음
- 현재 기본 foreground 서버: HTTP `8081`, RTSP `8555`
- `8080/8554/8082` 기본 포트는 재점검 시작 시 listener 없음

통과:

- `python3 -m pip install --user --break-system-packages opencv-python`: `opencv-python 4.13.0.92` 설치
- `python3 -c "import cv2; print(cv2.__version__)"`: `4.13.0`
- `python3 scripts/examples/va_rtsp_sse_overlay_client.py --help`
- `./server.sh verify-event-post --mode schema --http-base http://127.0.0.1:8082`: `7/0/0`, Event POST enabled 보정 서버
- `./server.sh verify-event-post --mode recovery --http-base http://127.0.0.1:8082`: `11/0/1`, EventStorage disabled로 storage injection 세부 검증 skip
- `./server.sh verify-va-metadata-sidechannel --http-base http://127.0.0.1:8081`: `5/0`
- `./server.sh verify-rtsp-va-overlay-policy --http-base http://127.0.0.1:8081 --rtsp-base rtsp://127.0.0.1:8555/dhseo`: `6/0/0`
- `python3 scripts/examples/va_rtsp_sse_overlay_client.py --rtsp-url 'rtsp://127.0.0.1:8555/dhseo?file=sample_h264.mp4' --metadata-url 'http://127.0.0.1:8081/lab/analysis/metadata/stream?file=sample_h264.mp4&va=1&intervalMs=500&maxMessageBytes=65536' --max-seconds 2 --headless`: frames `79`, metadataMessages `6`, parse/schema error `0`
- `git diff --check`

환경 이슈로 분리:

- 기본 `./server.sh verify-event-post --mode schema|recovery`는 현재 8081 서버가 `MEDIA_SERVER_ANALYSIS_EVENT_POST_ENABLED=0`이라 dispatcher disabled로 실패
- 기본 `./server.sh verify-va-metadata-sidechannel`은 8080 listener 없음으로 connection refused
- 기본 `./server.sh verify-rtsp-va-overlay-policy`는 8080/8554 listener 없음으로 실패
- sandbox 내부 overlay client 직접 실행은 localhost SSE connect가 `Operation not permitted`였고, 권한 상승 재실행에서는 통과

관찰/후속:

- `./server.sh compare-close-object-tracker --file imports/va_tracking_event_1280x720_30fps_h264.mp4 --modes off,diagnostic,enforce`는 command success였지만 `judgement: warning`
- warning reason: `enforceVsOff idSwitchRiskScore increased by 0.027`
- event/scenario delta는 `False`; 제품 회귀로 보지는 않지만 close-object guard default-on 근거로 사용하지 않음

## 2026-04-30 - VA Runtime Console / WebRTC metadata overlay sync 안정화

통과:

- `./server.sh build`
- `git diff --check`
- Markdown link/image path check
- `./server.sh test`: sandbox 실행은 localhost TCP/RTSP probe `Operation not permitted`로 실패했으나, 권한 상승 재실행 기준 `15/0/12` 통과
- `./server.sh verify-webrtc-va-metadata-sync --http-base http://127.0.0.1:8081 --file imports/va_tracking_event_1280x720_30fps_h264.mp4`: `12/0`
- `./server.sh verify-va-runtime-console-longrun --duration-minutes 30 --clients 1 --include-rtsp --include-sidechannel --include-dashboard --skip-build`: `10/0/1`

확인:

- WebRTC metadata viewer는 `requestVideoFrameCallback` 기준으로 overlay를 그리고, DataChannel 수신 시점에 즉시 draw하지 않음
- `syncStatus=fallback-latest` metadata는 기본 draw하지 않음
- video stalled 상태에서 metadata가 계속 들어와도 overlay draw count가 증가하지 않음
- 검증 전용 hook으로 metadata buffer 상한 `90`과 drop counter 동작 확인
- longrun 최종 cleanup: `activeSessions=0`, `activeAnalysisTaps=0`, `activeSseClients=0`, `activeWebSocketClients=0`, `egressSessions=0`, `publishSessions=0`
- longrun `portsClean=true`

관찰/후속:

- 30분 longrun 중 RSS는 warm-up 이후 완만히 증가했고 최종 `maxRssKb=747872`, `lastRssKb=747872`로 기록됨
- crash/session leak/client leak은 보이지 않았지만, 2시간 이상 장기 검증에서 메모리 평탄화 여부를 추가 확인할 것

## 2026-04-29 - Step 32 통합 검증

통과:

- Release build
  - `cmake -S . -B build-release-gst-onnx -DCMAKE_BUILD_TYPE=Release -DMEDIA_SERVER_USE_GSTREAMER=ON -DMEDIA_SERVER_USE_ONNXRUNTIME=ON -DMEDIA_SERVER_ONNXRUNTIME_ROOT=/opt/homebrew/opt/onnxruntime`
  - `cmake --build build-release-gst-onnx`
- `./server.sh verify-analysis-state`: `9/0`
- `./server.sh verify-va-replay`: `10 cases`
- Intrusion, LineCrossing, IntrusionDwell, ReEntry, WrongDirection, IntrusionAfterLineCrossing, Loitering fixture
- EventRecord/snapshot/clip hook replay: expected 2, actual 2
- JSON Lines 2건, snapshot marker 2건, clip marker 2건 생성
- Debug overlay off/on, state-dump, overlay JPEG 확인
- WebRTC VA metadata DataChannel 기본 off와 `vaMetadata=1` offer m-line 차이 확인
- Event POST schema/recovery는 event POST 활성 서버에서 분리 재검증 통과

보류:

- WebRTC DataChannel browser message 수신 자동화
- 실제 Re-ID enabled 모델 검증
- 신규 전체 코드 반영 후 30분 이상 다채널 soak

## 2026-04-29 - UI/검증 항목 재검증

통과:

- `./server.sh build`
- `./server.sh verify-analysis-state`: `4/0`
- `./server.sh verify-rule-ui --http-base http://127.0.0.1:8081`: `5/0/0`
- `./server.sh verify-lab-layout --http-base http://127.0.0.1:8081`: `10/0`
- `./server.sh test --no-start --include-rules --include-rule-ui --include-va-events --include-image-analysis --include-redaction`: `19/0/8`
- `./server.sh verify-event-post --mode schema`: `7/0/0`
- `./server.sh verify-event-post --mode recovery`: `11/0/0`
- 다채널 live streaming 1/2/4/8 client 단계: 각각 `3/0`
- VA overlay 4/8 client: 각각 `5/0`

cleanup 확인:

- runtime `activeSessions=0`
- `resourceActiveStreams=0`
- `activeAnalysisTaps=0`

## 2026-04-28 - `/lab/rules` 영상 분석 관리 개편

통과:

- `./server.sh build`
- Release GStreamer/ONNX build
- `./server.sh verify-rule-ui --http-base http://127.0.0.1:8081`: `5/0/0`
- `./server.sh verify-lab-layout --http-base http://127.0.0.1:8081`: `10/0`
- 통합 smoke: `19/0/8`
- `./server.sh verify-multichannel --include-va`: `9/0/0`
- `./server.sh verify-predev --skip-build --soak-minutes 30`: `68/0/2`, duration 약 2483s

확인:

- `영상 분석 설정`/`영상 분석 보기` 탭 분리
- `vaRule=<id>` 모드에서 source override 없이 저장 source만 사용
- 최종 cleanup 후 `8080/8081/8554/8555` listener 없음

## 2026-04-28 - Lab layout 안정화

통과:

- `./server.sh verify-lab-layout`: 390/768/1180/1365/1600 폭에서 stream/image-analysis overflow 없음
- `./server.sh verify-predev --skip-build --soak-minutes 30`: `68/0/2`, duration 약 2512s

## 2026-04-27 - Redaction 승격과 test mode 분리

통과:

- 사람 객체 자동 모자이크 smoke
- `./server.sh verify-redaction`
- `./server.sh test --full`
- `./server.sh verify-predev`

변경:

- `./server.sh test` 기본값을 `--basic`으로 정리
- `--full`, `--external`, `--stable` 모드 분리

## 2026-04-27 - Predev 안정화 묶음

통과:

- `./server.sh verify-predev --quick`: `14/0/0`
- `./server.sh verify-predev --soak-minutes 30`: `89/0/0`
- summary/report 생성
- 종료 후 대표 port listener 없음

추가:

- runtime status panel
- 다채널 WebRTC 수동 테스트 panel
- `summarize-reports`
- `verify-event-post --mode recovery`

## 2026-04-27 - 다채널/URI/VA 장기성

통과:

- `./server.sh verify-multichannel --include-va --repeat 3 --single-clients 3 --clients-per-source 2 --hold-ms 12000`: `24/0/0`
- `./server.sh verify-uri-longrun --iterations 3 --include-external --use-default-external --external-rtsp-routes default,h264,opus`: `12/0/0`
- `./server.sh verify-va-events --long`: `17/0/0`
- `./server.sh verify-tracker-stability --long --overlap-focus`: `8/0/0`
- `./server.sh verify-yolo-layouts --duration 10 --no-download`: `7/0/0`
- `./server.sh verify-adaptive`: `8/0/0`
- `./server.sh verify-route-profiles`: `7/0/0`
- `./server.sh verify-webrtc-ice`: `8/0/0`
- `./server.sh verify-codecs`: `67/0/3`

보류:

- 외부 운영 TURN relay/auth credential 미확보

## 2026-04-26 - VA event/category/tracker 검증

통과:

- `./server.sh test --no-start`: stable 기준 `15/0/5`
- `--include-rules --include-va-events`: `6/0/6`
- `./server.sh verify-route-profiles`: `6/0/0`
- `./server.sh verify-tracker-stability --long --overlap-focus`: `8/0/0`
- `./server.sh verify-webrtc-ice --skip-browser --skip-whip`
- `./server.sh verify-uri-longrun --iterations 1`
- `./server.sh verify-va-events --duration 30`
- `./server.sh verify-va-events --long`
- `./server.sh verify-rule-ui`
- `./server.sh verify-image-analysis`
- `./server.sh verify-va-category-samples`
- `./server.sh verify-event-post --mode schema`
- `./server.sh verify-event-post --mode queue`

확인:

- presence, enter, exit, line-crossing 이벤트
- line-crossing `any/forward/reverse` 방향 분할
- event highlight color/duration 유지
- POST worker queue/dedupe/failure counter
- tracker category/class counts와 overlap smoke

## 2026-04-26 - WebRTC ICE/TURN/HLS

통과:

- Mac 로컬 coturn 기준 relay candidate 수집
- browser WebRTC file consume playback
- WHIP publish -> WebRTC signaling
- 외부 HLS Mux/Apple advisory: HLS pad drain 보정 후 RTSP/WebRTC signaling 통과
- relay 요청 + TURN 미설정 fallback 확인

보류:

- Windows WSL2 coturn end-to-end: Mac -> Windows LAN inbound `No route to host`

## 2026-04-24 - 영상 분석 착수 전 기준선

통과 기준:

- 로컬 `file -> RTSP`
- 로컬 `file -> WebRTC`
- 로컬 `RTSP pull -> RTSP/WebRTC`
- 로컬 `WebRTC publish -> RTSP/WebRTC`
- 동일 source 다중 session에서 SharedStream 재사용
- `start/stop/restart/status/diagnose`
- source descriptor와 audio/video track discovery
- 서버 중지 후 listener cleanup

이 기준선 이후 VA overlay, rule event, TrackState/Scenario 계층을 단계적으로 추가했습니다.
