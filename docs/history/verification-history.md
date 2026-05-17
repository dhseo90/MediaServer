# Verification History

이 문서는 과거 상세 검증 이력을 보존합니다. 현재 실행해야 할 검증 기준은 [../stream-verification.md](../stream-verification.md)를 봅니다.

## 2026-05-17 - v1.2.1 Post-release smoke reconciliation

확인됨:

- `./server.sh verify-public-repo-readiness`: local public-readiness static gate를 실행할 대상 명령으로 기록합니다. 이 기록은 GitHub Actions 상태를 대체하지 않습니다.
- `./server.sh verify-docs-links`: local Markdown link/image drift gate를 실행할 대상 명령으로 기록합니다.
- `./server.sh verify-post-release-reconciliation`: 이 section의 통과/미실행/미확인 분리 문구를 정적으로 확인합니다.
- Verification history는 `확인됨`, `미확인`, `미실행`, `통과로 쓰지 않는 항목`을 분리해 작성합니다.

미확인:

- GitHub Actions: 미확인. 이번 로컬 작업에서는 GitHub Actions API, Actions 화면, status check 결과를 조회하지 않았습니다.
- 최신 GitHub branch protection/ruleset 적용 상태
- 최신 release tag/GitHub Release artifact 상태

미실행:

- `verify-predev --soak-minutes 30`: 사용자 명시 요청 없음
- `verify-predev --soak-minutes 120`: 사용자 명시 요청 없음
- `verify-va-runtime-console-longrun --duration-minutes 120`: 사용자 명시 요청 없음
- ONVIF 실장비 field smoke: 실장비 endpoint/credential 미제공
- YouTube 실제 URL relay: v1.2.1 patch scope 밖이며 실제 URL 성공 gate 미개방
- 외부 TURN/WHEP credential 운영 검증: 외부 credential/운영 환경 미제공

통과로 쓰지 않는 항목:

- 실행하지 않은 검증은 release PASS로 쓰지 않습니다.
- GitHub Actions를 조회하지 않은 로컬 reconciliation은 Actions PASS로 쓰지 않습니다.
- 실장비 field smoke 미실행은 ONVIF 실장비 성공으로 쓰지 않습니다.
- `matrix-ok=True`만으로 Re-ID default-on 또는 제품 안정 완료로 쓰지 않습니다.

## 2026-05-16 - v1.2.0 Visual QA artifact sample

통과:

- `./server.sh build`
- `./server.sh verify-ops-client-ui --screenshots --http-base http://127.0.0.1:8081 --output-dir /private/tmp/media_server_v120_visual_qa_sample_20260516/artifact`: route/API/client leak smoke `16/0`, screenshot overflow `28/0`, client mobile header `4/0`, client live keyboard `2/0`, Ops audit mobile `4/0`, ONVIF hint `4/0`, ONVIF preview tool `2/0`
- `./server.sh compare-ui-visual-baseline --baseline-dir /private/tmp/media_server_v120_visual_qa_sample_20260516/artifact --candidate-dir /private/tmp/media_server_v120_visual_qa_sample_20260516/artifact --output-dir /private/tmp/media_server_v120_visual_qa_sample_20260516/diff`: compared `38`, passed `38`, failed `0`, changed `0`, missing `0`, extra `0`

확인:

- Visual artifact manifest: `/private/tmp/media_server_v120_visual_qa_sample_20260516/artifact/visual-regression-manifest.json`
- Visual artifact index: `/private/tmp/media_server_v120_visual_qa_sample_20260516/artifact/index.md`
- Baseline diff JSON: `/private/tmp/media_server_v120_visual_qa_sample_20260516/diff/visual-baseline-diff.json`
- Baseline diff Markdown: `/private/tmp/media_server_v120_visual_qa_sample_20260516/diff/visual-baseline-diff.md`
- Manifest schema는 `media-server.ui-visual-artifact-index.v1`, screenshot count는 `38`입니다.
- Retention policy schema는 `media-server.ui-visual-artifact-retention.v1`, PR artifact `14 days`, release baseline `45 days` 기준입니다.
- Self-compare sanity 확인이며 실제 변경 전/후 candidate 비교는 아닙니다.

미실행:

- `verify-predev`: 사용자 명시 요청 없음
- `verify-va-runtime-console-longrun`: 사용자 명시 요청 없음
- 외부 공유 저장소 업로드: 수행하지 않음

## 2026-05-13 - v1.1.0 final local release gate

통과:

- `./server.sh verify-predev --soak-minutes 120`: `525/0/1`
- `./server.sh verify-va-runtime-console-longrun --duration-minutes 120 ... --idle-after-cleanup-minutes 30`: `12/0/0`
- `./server.sh rc-release-checklist ...`: checklist artifact 생성 통과
- `./server.sh verify-longrun-separation`: `4/0`
- `./server.sh verify-public-repo-readiness --report ...`: `6/0`
- `./server.sh verify-bundle-policy --output ... --json-output ...`: 통과
- `./server.sh test --full --stop-after`: `30/0/6`, 542초

확인:

- 2026-05-12에 닫은 v1.1.0 선수 로드맵 1~6은 재수행하지 않았습니다.
- redaction RTSP ffmpeg hang은 live decode harness timeout 보강 후 targeted
  redaction live 2회 재검증을 통과했습니다.
- public repository policy는 병합된 `docs/en/README.md` 기준으로 정렬했고,
  삭제한 영문 mirror 문서를 다시 만들지 않았습니다.
- runtime longrun idle 판정은 RSS `316.05MiB -> 316.62MiB`로 `+0.58MiB`
  warning이었지만 cleanup 관련 runtime counter는 모두 `0`이었습니다.
- v1.1.0 구현 후속 이슈는 남기지 않았고, release tag/main merge/GitHub
  Release/push는 수행하지 않았습니다.

미실행:

- release tag 생성
- main merge
- GitHub Release 생성
- push

## 2026-05-12 - Live Event Delivery Contract RC smoke

통과:

- `./server.sh build`
- `./server.sh verify-event-post --mode disabled --http-base http://127.0.0.1:8084`: `2/0/0`
- `./server.sh verify-event-post --mode schema --http-base http://127.0.0.1:8084`: `7/0/0`
- `./server.sh verify-event-post --mode recovery --http-base http://127.0.0.1:8084`: `11/0/1`
- `./server.sh verify-webrtc-va-metadata --http-base http://127.0.0.1:8084 --file imports/va_tracking_event_1280x720_30fps_h264.mp4 --timeout-ms 45000`: `8/0`
- `./server.sh verify-va-metadata-sidechannel --http-base http://127.0.0.1:8084`: `5/0`
- `./server.sh verify-ws-metadata --http-base http://127.0.0.1:8084 --file sample_h264.mp4 --timeout-ms 12000`: `9/0`
- `./server.sh verify-va-runtime-console --http-base http://127.0.0.1:8084`: `8/0`
- `git diff --check -- README.md README.en.md docs scripts`

확인:

- Event POST disabled 기본 상태와 enabled schema/recovery smoke를 분리해 확인했습니다.
- Event POST recovery의 EventStorage corrupt/partial injection 세부 검증은
  EventStorage disabled 상태라 skip `1`로 기록했습니다.
- WebRTC DataChannel은 video track, ICE connected, `va-metadata` DataChannel,
  metadata schema/sync diagnostic 수신을 확인했습니다.
- SSE side-channel은 `media-server.va.runtime-metadata.v1` payload와 임시 tap cleanup을 확인했습니다.
- WebSocket side-channel은 runtime metadata payload, subscribe/unsubscribe/status/resume/reset
  control ack, 임시 tap cleanup을 확인했습니다.
- Runtime Console smoke는 metrics, state-dump, event POST/status, event storage/status,
  runtime status와 tap cleanup을 확인했습니다.

미실행:

- `verify-predev --soak-minutes ...`: 사용자 명시 요청 없음
- `verify-va-runtime-console-longrun ...`: 사용자 명시 요청 없음
- `verify-event-post-longrun ...`: 사용자 명시 요청 없음

## 2026-05-10 - Live Source Health / Operator Workflow 1차 검증

통과:

- `./server.sh build`
- `./server.sh verify-ops-root-cause-panel`
- `./server.sh verify-client-dashboard-polish`
- `./server.sh verify-ops-source-lifecycle`
- `./server.sh verify-auth-bootstrap`: sandbox 포트 바인딩 실패 후 일반 권한 재실행 기준 통과
- `./server.sh verify-auth-users`
- `./server.sh verify-auth-routes`
- `./server.sh verify-ops-client-ui`: auth off 테스트 서버 기준 통과
- `./server.sh verify-ops-client-ui --screenshots`: route/API 12/0, screenshot 14/0
- `./server.sh verify-rule-ui`
- `./server.sh verify-codecs`: 67/0/3
- `./server.sh verify-webrtc-ice`: 7/0/1
- `./server.sh verify-multichannel`: 제거된 browser harness 기준 skip-only, exit 0
- `./server.sh verify-webrtc-va-metadata`: 8/0
- `git diff --check`

확인:

- `/ops/api/source-health`는 `media-server.ops.source-health.v1` schema와
  `summary`, `sourceHealth[]`를 반환합니다.
- 당시 `/ops/sources`는 Live Source Health panel/table/detail을 표시했습니다.
  현재 제품 UI에서는 source health 요약을 `/ops/dashboard`와 API 검증으로 다룹니다.
- `/ops/dashboard` 문제 원인 패널은 Live Source Health를 source 재검증
  workflow로 연결합니다.
- client dashboard/live detail은 source locator, ONVIF endpoint, raw diagnostic
  JSON 없이 sanitized `summary`와 `warningLevel`만 표시합니다.
- `verify-ops-source-lifecycle` cleanup 중 WebRTC session close 순서 crash를
  재현했고, subscriber 제거 후 bridge stop 순서로 정리해 재검증했습니다.

## 2026-05-09 - 운영 제품화 안정화 순차 검증

통과:

- `./server.sh verify-ops-backup-restore-dry-run`
- `./server.sh verify-ops-evidence-retention-cleanup`
- `./server.sh verify-ops-audit-persistence`
- `./server.sh verify-rc-release-gate`
- `./server.sh verify-ops-root-cause-panel`
- `./server.sh verify-ops-tables-layout --http-base http://127.0.0.1:8081 --widths 1180,900,560,390,760,1180`: 18/0
- `./server.sh verify-ops-client-ui --http-base http://127.0.0.1:8081 --visual-widths 390,1180 --screenshots=1`: route/API 12/0, screenshot 14/0
- `./server.sh verify-ops-click-e2e --http-base http://127.0.0.1:8081 --widths 390,1180`: 2/0
- `./server.sh build`
- `git diff --check`

확인:

- 백업/복구 dry-run은 임시 runtime에서 checksum, manifest, auth store `0600` 권한을 검증했습니다.
- Evidence cleanup job은 기본 dry-run, `--apply` 명시 삭제, Ops audit `retention-cleanup` 기록 경로를 검증했습니다.
- Audit trail은 `receivedAtMs` 기간 필터와 CSV/JSON/Diff export 경로를 확인했습니다.
- Ops 문제 원인 다음 조치 버튼은 source 재검증, registry diff, Event/evidence 진단, auth/config 확인 결과 영역을 실제 클릭 E2E에 포함했습니다.
- 채널/룰/사용자 table은 모바일 390px과 desktop resize에서 cell/action overflow가 없음을 확인했습니다.

## 2026-05-03 - 이전 analysis screenshot 갱신 이력

이 당시에는 analysis 전용 화면 이미지를 문서 대표 컷으로 사용했습니다.
현재 제품 문서에서는 Ops/Client 대표 화면만 사용합니다.
해당 이전 `analysis-*.png` 자산은 제거했습니다.
현재 이미지 기준은 `docs/assets/ui/README.md`와 [../ui-guide.md](../ui-guide.md)를 봅니다.

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
- RTSP/SSE overlay client:

```bash
python3 scripts/examples/va_rtsp_sse_overlay_client.py \
  --rtsp-url 'rtsp://127.0.0.1:8555/dhseo?file=sample_h264.mp4' \
  --metadata-url 'http://127.0.0.1:8081/lab/analysis/metadata/stream?file=sample_h264.mp4&va=1&intervalMs=500&maxMessageBytes=65536' \
  --max-seconds 2 \
  --headless
```

결과: frames `79`, metadataMessages `6`, parse/schema error `0`
- `git diff --check`

환경 이슈로 분리:

- 기본 `./server.sh verify-event-post --mode schema|recovery`는 현재 8081 서버가 `MEDIA_SERVER_ANALYSIS_EVENT_POST_ENABLED=0`이라 dispatcher disabled로 실패
- 기본 `./server.sh verify-va-metadata-sidechannel`은 8080 listener 없음으로 connection refused
- 기본 `./server.sh verify-rtsp-va-overlay-policy`는 8080/8554 listener 없음으로 실패
- sandbox 내부 overlay client 직접 실행은 localhost SSE connect가 `Operation not permitted`였고, 권한 상승 재실행에서는 통과

관찰/후속:

- `./server.sh compare-close-object-tracker --file imports/va_tracking_event_1280x720_30fps_h264.mp4 --modes off,diagnostic,enforce`
- command success였지만 `judgement: warning`
- warning reason: `enforceVsOff idSwitchRiskScore increased by 0.027`
- event/scenario delta는 `False`; 제품 회귀로 보지는 않지만 close-object guard default-on 근거로 사용하지 않음

## 2026-04-30 - VA Runtime Console / WebRTC metadata overlay sync 안정화

통과:

- `./server.sh build`
- `git diff --check`
- Markdown link/image path check
- `./server.sh test`: sandbox 실행은 localhost TCP/RTSP probe `Operation not permitted`로 실패했으나, 권한 상승 재실행 기준 `15/0/12` 통과
- `./server.sh verify-webrtc-va-metadata --http-base http://127.0.0.1:8081 --file imports/va_tracking_event_1280x720_30fps_h264.mp4`: `12/0`
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
  - Release build command:

```bash
cmake -S . -B build-release-gst-onnx \
  -DCMAKE_BUILD_TYPE=Release \
  -DMEDIA_SERVER_USE_GSTREAMER=ON \
  -DMEDIA_SERVER_USE_ONNXRUNTIME=ON \
  -DMEDIA_SERVER_ONNXRUNTIME_ROOT=/opt/homebrew/opt/onnxruntime
```
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
- `./server.sh verify-ops-client-ui --http-base http://127.0.0.1:8081`: `10/0`
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
- `./server.sh verify-ops-client-ui --http-base http://127.0.0.1:8081`: `10/0`
- 통합 smoke: `19/0/8`
- `./server.sh verify-multichannel --include-va`: `9/0/0`
- `./server.sh verify-predev --skip-build --soak-minutes 30`: `68/0/2`, duration 약 2483s

확인:

- `영상 분석 설정`/`영상 분석 보기` 탭 분리
- `vaRule=<id>` 모드에서 source override 없이 저장 source만 사용
- 최종 cleanup 후 `8080/8081/8554/8555` listener 없음

## 2026-04-28 - Legacy layout 안정화

통과:

- `./server.sh verify-ops-client-ui`: 390/768/1180/1365/1600 폭에서 stream/image-analysis overflow 없음
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
