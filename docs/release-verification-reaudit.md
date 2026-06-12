# Release Verification Re-audit

상태: 재감사 결과 문서. 이 문서는 신규 테스트 실행 결과가 아니라, 릴리즈 태그별
검증 evidence를 행 단위로 다시 분리한 기록입니다.

## 판정 규칙

- `pass`: 해당 태그 시점 문서나 현재 evidence ledger가 명시적으로 PASS/통과/0 fail을 기록한 항목.
- `fail`: 해당 evidence가 명시적으로 FAIL/실패를 기록한 항목.
- `기록없음`: 실행하지 않음, 미확인, Not Run / Unverified, manual-not-run, 제외, 또는 로드맵/예상 검증에만 있고 실행 evidence가 아직 확인되지 않은 항목.
- verifier PASS는 그 verifier가 직접 검사한 범위에만 사용한다.
- tag release-policy의 aggregate PASS 문장을 근거로 둔 행은 historical verifier pass
  기록일 뿐이며, 개별 제품 기능 동작, UI 직접 조작, 장시간 안정화, provider field
  success로 확대하지 않는다.
- UI 풀테스트 PASS는 브라우저 직접 조작 evidence가 있는 행에만 사용한다.
- 외부 TURN/WHEP, real ONVIF, real cloud/provider, VLM runtime/model bundle은 endpoint/credential/실기기 승인 evidence가 없으면 `기록없음`이다.

## 원천 우선순위

1. 현재 `docs/release-evidence-index.md`의 Test Token Usage Ledger와 Not-run 문장.
2. 각 태그 시점의 `docs/release-policy.md` `## Verification` / `## Not Run / Unverified`.
3. 각 태그 시점의 `docs/history/verification-history.md` 중 버전명이 직접 붙은 release/local gate 섹션.
4. 각 태그 시점의 `docs/development-backlog.md` roadmap 예상 검증과 종료 기준.

로드맵 표에 있는 예상 검증은 실행 evidence가 아니므로, 대응 PASS 행을 찾기 전에는
`기록없음`으로 둔다.

## 릴리즈 태그

확인한 태그: `v1.0.0`, `v1.1.0`, `v1.2.0`, `v1.2.1`, `v1.3.0`, `v1.4.0`, `v1.5.0`, `v1.6.0`, `v1.7.0`, `v1.8.0`, `v1.9.0`, `v2.0.0`, `v2.1.0`, `v2.2.0`, `v2.3.0`, `v2.4.0`.

## v1.0.0

| 항목 | 판정 | 근거 | 주의 |
| --- | --- | --- | --- |
| Preflight | pass | tag `v1.0.0:docs/release-policy.md` `## Verification` | release-policy 행 |
| Licensing and Artifact Guardrails | pass | tag `v1.0.0:docs/release-policy.md` | release-policy 행 |
| `verify-public-repo-readiness` | pass | tag `v1.0.0:docs/release-policy.md` | release-policy 행 |
| `verify-bundle-policy` | pass | tag `v1.0.0:docs/release-policy.md` | release-policy 행 |
| 2026-05-09 `verify-ops-backup-restore-dry-run` | pass | `v1.0.0:docs/history/verification-history.md`, 운영 제품화 안정화 순차 검증 | dry-run 검증 |
| 2026-05-09 `verify-ops-evidence-retention-cleanup` | pass | 같은 history 섹션 | evidence cleanup 검증 |
| 2026-05-09 `verify-ops-audit-persistence` | pass | 같은 history 섹션 | audit persistence 검증 |
| 2026-05-09 `verify-rc-release-gate` | pass | 같은 history 섹션 | RC release gate |
| 2026-05-09 `verify-ops-root-cause-panel` | pass | 같은 history 섹션 | Ops root cause panel verifier |
| 2026-05-09 `verify-ops-tables-layout --http-base http://127.0.0.1:8081 --widths 1180,900,560,390,760,1180` | pass | 같은 history 섹션, `18/0` | table layout verifier |
| 2026-05-09 `verify-ops-client-ui --http-base http://127.0.0.1:8081 --visual-widths 390,1180 --screenshots=1` | pass | 같은 history 섹션, route/API `12/0`, screenshot `14/0` | UI screenshot smoke. UI 풀테스트 전체 PASS 아님 |
| 2026-05-09 `verify-ops-click-e2e --http-base http://127.0.0.1:8081 --widths 390,1180` | pass | 같은 history 섹션, `2/0` | click E2E |
| 2026-05-09 `./server.sh build` | pass | 같은 history 섹션 | build |
| 2026-05-09 `git diff --check` | pass | 같은 history 섹션 | diff whitespace verifier |
| 2026-05-03 `python3 -m pip install --user --break-system-packages opencv-python` | pass | `v1.0.0:docs/history/verification-history.md`, 실패 이슈 재점검 | dependency install 기록 |
| 2026-05-03 `python3 -c import cv2` | pass | 같은 history 섹션, `4.13.0` | OpenCV import/version 확인 |
| 2026-05-03 `python3 scripts/examples/va_rtsp_sse_overlay_client.py --help` | pass | 같은 history 섹션 | example help |
| 2026-05-03 `verify-event-post --mode schema --http-base http://127.0.0.1:8082` | pass | 같은 history 섹션, `7/0/0` | Event POST enabled 보정 서버 |
| 2026-05-03 `verify-event-post --mode recovery --http-base http://127.0.0.1:8082` | pass | 같은 history 섹션, `11/0/1` | EventStorage disabled skip 1 포함 |
| 2026-05-03 `verify-va-metadata-sidechannel --http-base http://127.0.0.1:8081` | pass | 같은 history 섹션, `5/0` | sidechannel verifier |
| 2026-05-03 `verify-rtsp-va-overlay-policy --http-base http://127.0.0.1:8081 --rtsp-base rtsp://127.0.0.1:8555/dhseo` | pass | 같은 history 섹션, `6/0/0` | RTSP VA overlay verifier |
| 2026-05-03 RTSP/SSE overlay client | pass | 같은 history 섹션, frames `79`, metadataMessages `6`, parse/schema error `0` | sandbox 권한 상승 재실행 통과 |
| 2026-05-03 `git diff --check` | pass | 같은 history 섹션 | diff whitespace verifier |
| 2026-05-03 default `verify-event-post --mode schema/recovery` on 8081 | fail | 같은 history 섹션 `환경 이슈로 분리` | dispatcher disabled 환경 실패. 제품 회귀로 단정 금지 |
| 2026-05-03 default `verify-va-metadata-sidechannel` | fail | 같은 history 섹션 `환경 이슈로 분리` | 8080 listener 없음 |
| 2026-05-03 default `verify-rtsp-va-overlay-policy` | fail | 같은 history 섹션 `환경 이슈로 분리` | 8080/8554 listener 없음 |
| 2026-05-03 sandbox overlay client direct run | fail | 같은 history 섹션 `환경 이슈로 분리` | sandbox localhost SSE `Operation not permitted`; 권한 상승 재실행은 별도 PASS |
| 2026-05-03 `compare-close-object-tracker --file imports/va_tracking_event_1280x720_30fps_h264.mp4 --modes off,diagnostic,enforce` | 기록없음 | 같은 history 섹션 `관찰/후속`, command success but `judgement: warning` | 제품 회귀는 아니나 default-on 근거 아님 |
| 2026-04-30 `./server.sh build` | pass | `v1.0.0:docs/history/verification-history.md`, VA Runtime Console / WebRTC metadata overlay sync 안정화 | build |
| 2026-04-30 `git diff --check` | pass | 같은 history 섹션 | diff whitespace verifier |
| 2026-04-30 Markdown link/image path check | pass | 같은 history 섹션 | 문서 링크/이미지 경로 check |
| 2026-04-30 sandbox `./server.sh test` | fail | 같은 history 섹션 | sandbox localhost TCP/RTSP probe `Operation not permitted` |
| 2026-04-30 escalated `./server.sh test` | pass | 같은 history 섹션, `15/0/12` | 권한 상승 재실행 기준 |
| 2026-04-30 `verify-webrtc-va-metadata --http-base http://127.0.0.1:8081 --file imports/va_tracking_event_1280x720_30fps_h264.mp4` | pass | 같은 history 섹션, `12/0` | WebRTC VA metadata verifier |
| 2026-04-30 `verify-va-runtime-console-longrun --duration-minutes 30 --clients 1 --include-rtsp --include-sidechannel --include-dashboard --skip-build` | pass | 같은 history 섹션, `10/0/1` | 30분 runtime longrun |
| 2026-04-30 2시간 이상 장기 검증 | 기록없음 | 같은 history 섹션 `관찰/후속` | 추가 확인 필요로 기록 |
| 2026-04-29 Release GStreamer/ONNX CMake configure | pass | `v1.0.0:docs/history/verification-history.md`, Step 32 통합 검증 | release build configure |
| 2026-04-29 `cmake --build build-release-gst-onnx` | pass | 같은 history 섹션 | release build |
| 2026-04-29 `verify-analysis-state` | pass | 같은 history 섹션, `9/0` | analysis state verifier |
| 2026-04-29 `verify-va-replay` | pass | 같은 history 섹션, `10 cases` | VA replay |
| 2026-04-29 EventRecord/snapshot/clip hook replay | pass | 같은 history 섹션, 예상 `2`, 실제 `2` | hook replay 확인 |
| 2026-04-29 Event POST schema/recovery on enabled server | pass | 같은 history 섹션 | Event POST 활성 서버 분리 재검증 |
| 2026-04-29 WebRTC DataChannel browser message 수신 자동화 | 기록없음 | 같은 history 섹션 `보류` | 실행하지 않음 |
| 2026-04-29 실제 Re-ID enabled 모델 검증 | 기록없음 | 같은 history 섹션 `보류` | 실행하지 않음 |
| 2026-04-29 신규 전체 코드 30분 이상 다채널 soak | 기록없음 | 같은 history 섹션 `보류` | 실행하지 않음 |
| 2026-04-29 `./server.sh build` | pass | `v1.0.0:docs/history/verification-history.md`, UI/검증 항목 재검증 | build |
| 2026-04-29 `verify-analysis-state` | pass | 같은 history 섹션, `4/0` | analysis state verifier |
| 2026-04-29 `verify-rule-ui --http-base http://127.0.0.1:8081` | pass | 같은 history 섹션, `5/0/0` | rule UI verifier |
| 2026-04-29 `verify-ops-client-ui --http-base http://127.0.0.1:8081` | pass | 같은 history 섹션, `10/0` | Ops/Client UI smoke |
| 2026-04-29 `test --no-start --include-rules --include-rule-ui --include-va-events --include-image-analysis --include-redaction` | pass | 같은 history 섹션, `19/0/8` | skip 8 포함 |
| 2026-04-29 `verify-event-post --mode schema` | pass | 같은 history 섹션, `7/0/0` | Event POST schema |
| 2026-04-29 `verify-event-post --mode recovery` | pass | 같은 history 섹션, `11/0/0` | Event POST recovery |
| 2026-04-29 multichannel live streaming 1/2/4/8 clients | pass | 같은 history 섹션, each `3/0` | 다채널 live streaming |
| 2026-04-29 VA overlay 4/8 clients | pass | 같은 history 섹션, each `5/0` | VA overlay |
| 2026-04-28 `./server.sh build` | pass | `v1.0.0:docs/history/verification-history.md`, `/lab/rules` 영상 분석 관리 개편 | build |
| 2026-04-28 Release GStreamer/ONNX build | pass | 같은 history 섹션 | release build |
| 2026-04-28 `verify-rule-ui --http-base http://127.0.0.1:8081` | pass | 같은 history 섹션, `5/0/0` | rule UI verifier |
| 2026-04-28 `verify-ops-client-ui --http-base http://127.0.0.1:8081` | pass | 같은 history 섹션, `10/0` | Ops/Client UI smoke |
| 2026-04-28 통합 smoke | pass | 같은 history 섹션, `19/0/8` | skip 8 포함 |
| 2026-04-28 `verify-multichannel --include-va` | pass | 같은 history 섹션, `9/0/0` | multichannel VA verifier |
| 2026-04-28 `verify-predev --skip-build --soak-minutes 30` | pass | 같은 history 섹션, `68/0/2`, 약 `2483s` | 30분 soak |
| 2026-04-28 legacy `verify-ops-client-ui` responsive widths | pass | `v1.0.0:docs/history/verification-history.md`, Legacy layout 안정화 | 390/768/1180/1365/1600 overflow 없음 |
| 2026-04-28 legacy `verify-predev --skip-build --soak-minutes 30` | pass | 같은 history 섹션, `68/0/2`, 약 `2512s` | 30분 soak |
| 2026-04-27 사람 객체 자동 모자이크 smoke | pass | `v1.0.0:docs/history/verification-history.md`, Redaction 승격과 test mode 분리 | redaction smoke |
| 2026-04-27 `verify-redaction` | pass | 같은 history 섹션 | redaction verifier |
| 2026-04-27 `test --full` | pass | 같은 history 섹션 | full test |
| 2026-04-27 `verify-predev` | pass | 같은 history 섹션 | predev verifier |
| 2026-04-27 `verify-predev --quick` | pass | `v1.0.0:docs/history/verification-history.md`, Predev 안정화 묶음 | `14/0/0` |
| 2026-04-27 `verify-predev --soak-minutes 30` | pass | 같은 history 섹션, `89/0/0` | 30분 soak |
| 2026-04-27 predev summary/report 생성 | pass | 같은 history 섹션 | report 생성 |
| 2026-04-27 대표 port listener cleanup | pass | 같은 history 섹션 | 종료 후 listener 없음 |
| 2026-04-27 `verify-multichannel --include-va --repeat 3 --single-clients 3 --clients-per-source 2 --hold-ms 12000` | pass | `v1.0.0:docs/history/verification-history.md`, 다채널/URI/VA 장기성 | `24/0/0` |
| 2026-04-27 `verify-uri-longrun --iterations 3 --include-external --use-default-external --external-rtsp-routes default,h264,opus` | pass | 같은 history 섹션, `12/0/0` | URI longrun |
| 2026-04-27 `verify-va-events --long` | pass | 같은 history 섹션, `17/0/0` | VA events long |
| 2026-04-27 `verify-tracker-stability --long --overlap-focus` | pass | 같은 history 섹션, `8/0/0` | tracker stability |
| 2026-04-27 `verify-yolo-layouts --duration 10 --no-download` | pass | 같은 history 섹션, `7/0/0` | YOLO layouts |
| 2026-04-27 `verify-adaptive` | pass | 같은 history 섹션, `8/0/0` | adaptive verifier |
| 2026-04-27 `verify-route-profiles` | pass | 같은 history 섹션, `7/0/0` | route profiles |
| 2026-04-27 `verify-webrtc-ice` | pass | 같은 history 섹션, `8/0/0` | WebRTC ICE |
| 2026-04-27 `verify-codecs` | pass | 같은 history 섹션, `67/0/3` | codec verifier skip 3 포함 |
| 2026-04-27 외부 운영 TURN relay/auth credential | 기록없음 | 같은 history 섹션 `보류` | credential 미확보 |
| 2026-04-26 `test --no-start` | pass | `v1.0.0:docs/history/verification-history.md`, VA event/category/tracker 검증 | stable 기준 `15/0/5` |
| 2026-04-26 `--include-rules --include-va-events` | pass | 같은 history 섹션, `6/0/6` | include test subset |
| 2026-04-26 `verify-route-profiles` | pass | 같은 history 섹션, `6/0/0` | route profiles |
| 2026-04-26 `verify-tracker-stability --long --overlap-focus` | pass | 같은 history 섹션, `8/0/0` | tracker stability |
| 2026-04-26 `verify-webrtc-ice --skip-browser --skip-whip` | pass | 같은 history 섹션 | WebRTC ICE partial |
| 2026-04-26 `verify-uri-longrun --iterations 1` | pass | 같은 history 섹션 | URI longrun |
| 2026-04-26 `verify-va-events --duration 30` | pass | 같은 history 섹션 | VA events duration |
| 2026-04-26 `verify-va-events --long` | pass | 같은 history 섹션 | VA events long |
| 2026-04-26 `verify-rule-ui` | pass | 같은 history 섹션 | rule UI |
| 2026-04-26 `verify-image-analysis` | pass | 같은 history 섹션 | image analysis |
| 2026-04-26 `verify-va-category-samples` | pass | 같은 history 섹션 | VA category samples |
| 2026-04-26 `verify-event-post --mode schema` | pass | 같은 history 섹션 | Event POST schema |
| 2026-04-26 `verify-event-post --mode queue` | pass | 같은 history 섹션 | Event POST queue |
| 2026-04-26 Mac local coturn relay candidate | pass | `v1.0.0:docs/history/verification-history.md`, WebRTC ICE/TURN/HLS | local coturn 기준 |
| 2026-04-26 browser WebRTC file consume playback | pass | 같은 history 섹션 | browser playback |
| 2026-04-26 WHIP publish to WebRTC signaling | pass | 같은 history 섹션 | WHIP publish/signaling |
| 2026-04-26 external HLS mux/Apple advisory | pass | 같은 history 섹션 | HLS pad drain 보정 후 통과 |
| 2026-04-26 relay request with TURN unset fallback | pass | 같은 history 섹션 | TURN 미설정 fallback |
| 2026-04-26 Windows WSL2 coturn end-to-end | 기록없음 | 같은 history 섹션 `보류` | Mac to Windows LAN inbound `No route to host` |
| 2026-04-24 file to RTSP baseline | pass | `v1.0.0:docs/history/verification-history.md`, 영상 분석 착수 전 기준선 | 통과 기준 |
| 2026-04-24 file to WebRTC baseline | pass | 같은 history 섹션 | 통과 기준 |
| 2026-04-24 RTSP pull to RTSP/WebRTC baseline | pass | 같은 history 섹션 | 통과 기준 |
| 2026-04-24 WebRTC publish to RTSP/WebRTC baseline | pass | 같은 history 섹션 | 통과 기준 |
| 2026-04-24 SharedStream reuse in multi-session | pass | 같은 history 섹션 | 통과 기준 |
| 2026-04-24 start/stop/restart/status/diagnose | pass | 같은 history 섹션 | 통과 기준 |
| 2026-04-24 source descriptor and track discovery | pass | 같은 history 섹션 | 통과 기준 |
| 2026-04-24 listener cleanup after server stop | pass | 같은 history 섹션 | 통과 기준 |

## v1.1.0

| 항목 | 판정 | 근거 | 주의 |
| --- | --- | --- | --- |
| Preflight | pass | tag `v1.1.0:docs/release-policy.md` | release-policy 행 |
| Licensing and Artifact Guardrails | pass | tag `v1.1.0:docs/release-policy.md` | release-policy 행 |
| `verify-public-repo-readiness` | pass | tag `v1.1.0:docs/release-policy.md` | release-policy 행 |
| `verify-bundle-policy` | pass | tag `v1.1.0:docs/release-policy.md` | release-policy 행 |
| `verify-predev --soak-minutes 120` | pass | `v1.1.0:docs/history/verification-history.md`, `v1.1.0 final local release gate`, `525/0/1` | 120분 predev 실행 evidence |
| `verify-va-runtime-console-longrun --duration-minutes 120 ... --idle-after-cleanup-minutes 30` | pass | 같은 history 섹션, `12/0/0` | runtime longrun 실행 evidence |
| `rc-release-checklist ...` | pass | 같은 history 섹션, checklist artifact 생성 통과 | artifact 생성 통과 |
| `verify-longrun-separation` | pass | 같은 history 섹션, `4/0` | longrun 분리 gate |
| `verify-public-repo-readiness --report ...` | pass | 같은 history 섹션, `6/0` | release-policy 행과 중복 근거 |
| `verify-bundle-policy --output ... --json-output ...` | pass | 같은 history 섹션, 통과 | release-policy 행과 중복 근거 |
| `test --full --stop-after` | pass | 같은 history 섹션, `30/0/6`, 542초 | skip 6 포함 |
| release tag 생성 | 기록없음 | 같은 history 섹션의 `미실행` | 실행하지 않음 |
| main merge | 기록없음 | 같은 history 섹션의 `미실행` | 실행하지 않음 |
| GitHub Release 생성 | 기록없음 | 같은 history 섹션의 `미실행` | 실행하지 않음 |
| push | 기록없음 | 같은 history 섹션의 `미실행` | 실행하지 않음 |

## v1.2.0

| 항목 | 판정 | 근거 | 주의 |
| --- | --- | --- | --- |
| Preflight | pass | tag `v1.2.0:docs/release-policy.md` | release-policy 행 |
| Licensing and Artifact Guardrails | pass | tag `v1.2.0:docs/release-policy.md` | release-policy 행 |
| `verify-public-repo-readiness` | pass | tag `v1.2.0:docs/release-policy.md` | release-policy 행 |
| `verify-bundle-policy` | pass | tag `v1.2.0:docs/release-policy.md` | release-policy 행 |
| `verify-release-bundle-dry-run` | pass | tag `v1.2.0:docs/release-policy.md` | release-policy 행 |
| `build` | pass | `v1.2.0:docs/history/verification-history.md`, `v1.2.0 Visual QA artifact sample` | Visual QA sample 섹션 |
| `verify-ops-client-ui --screenshots ...` | pass | 같은 history 섹션, route/API/client leak smoke `16/0`, screenshot overflow `28/0`, client mobile header `4/0`, client live keyboard `2/0`, Ops audit mobile `4/0`, ONVIF hint `4/0`, ONVIF preview tool `2/0` | screenshot artifact sample |
| `compare-ui-visual-baseline ...` | pass | 같은 history 섹션, compared `38`, passed `38`, failed `0` | self-compare sanity이며 변경 전/후 비교 아님 |
| `verify-predev` | 기록없음 | 같은 history 섹션 `미실행`, 사용자 명시 요청 없음 | 장시간/soak로 확대 금지 |
| `verify-va-runtime-console-longrun` | 기록없음 | 같은 history 섹션 `미실행`, 사용자 명시 요청 없음 | runtime longrun 미실행 |
| 외부 공유 저장소 업로드 | 기록없음 | 같은 history 섹션 `미실행` | 실행하지 않음 |

## v1.2.1

| 항목 | 판정 | 근거 | 주의 |
| --- | --- | --- | --- |
| Preflight | pass | tag `v1.2.1:docs/release-policy.md` | release-policy 행 |
| Licensing and Artifact Guardrails | pass | tag `v1.2.1:docs/release-policy.md` | release-policy 행 |
| `verify-public-repo-readiness` | pass | tag `v1.2.1:docs/release-policy.md` | release-policy 행 |
| `verify-bundle-policy` | pass | tag `v1.2.1:docs/release-policy.md` | release-policy 행 |
| `verify-release-bundle-dry-run` | pass | tag `v1.2.1:docs/release-policy.md` | release-policy 행 |
| `verify-public-repo-readiness` local static gate 대상 기록 | 기록없음 | `v1.2.1:docs/history/verification-history.md`, Post-release smoke reconciliation `확인됨` | 실행 PASS가 아니라 대상 명령 기록 |
| `verify-docs-links` local drift gate 대상 기록 | 기록없음 | 같은 history 섹션 `확인됨` | 실행 PASS가 아니라 대상 명령 기록 |
| `verify-post-release-reconciliation` | 기록없음 | 같은 history 섹션 `확인됨` | section 정적 확인 설명, 실행 PASS로 승격하지 않음 |
| GitHub Actions | 기록없음 | 같은 history 섹션 `미확인` | Actions/API/UI 조회 없음 |
| branch protection/ruleset | 기록없음 | 같은 history 섹션 `미확인` | 최신 상태 미확인 |
| release tag/GitHub Release artifact 상태 | 기록없음 | 같은 history 섹션 `미확인` | 최신 상태 미확인 |
| `verify-predev --soak-minutes 30` | 기록없음 | 같은 history 섹션 `미실행` | 사용자 명시 요청 없음 |
| `verify-predev --soak-minutes 120` | 기록없음 | 같은 history 섹션 `미실행` | 사용자 명시 요청 없음 |
| `verify-va-runtime-console-longrun --duration-minutes 120` | 기록없음 | 같은 history 섹션 `미실행` | 사용자 명시 요청 없음 |
| ONVIF 실장비 field smoke | 기록없음 | 같은 history 섹션 `미실행` | endpoint/credential 미제공 |
| YouTube 실제 URL relay | 기록없음 | 같은 history 섹션 `미실행` | patch scope 밖 |
| 외부 TURN/WHEP credential 운영 검증 | 기록없음 | 같은 history 섹션 `미실행` | credential/운영 환경 미제공 |

## v1.3.0

| 항목 | 판정 | 근거 | 주의 |
| --- | --- | --- | --- |
| Preflight | pass | tag `v1.3.0:docs/release-policy.md` | release-policy 행 |
| Licensing and Artifact Guardrails | pass | tag `v1.3.0:docs/release-policy.md` | release-policy 행 |
| `verify-public-repo-readiness` | pass | tag `v1.3.0:docs/release-policy.md` | release-policy 행 |
| `verify-bundle-policy` | pass | tag `v1.3.0:docs/release-policy.md` | release-policy 행 |
| `verify-release-bundle-dry-run` | pass | tag `v1.3.0:docs/release-policy.md` | release-policy 행 |
| V130-P0-01 `verify-va-runtime-console` | 기록없음 | tag `v1.3.0:docs/development-backlog.md`, V130 table/section | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V130-P0-01 `verify-webrtc-va-metadata` | 기록없음 | 같은 V130 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V130-P0-01 `verify-va-metadata-sidechannel` | 기록없음 | 같은 V130 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V130-P0-01 `verify-ops-client-ui --screenshots` | 기록없음 | 같은 V130 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V130-P0-02 `verify-onvif-no-device-suite` | 기록없음 | tag `v1.3.0:docs/development-backlog.md`, V130 table/section | no-device suite 로드맵 예상 검증. 실장비 PASS 아님 |
| V130-P0-02 `verify-onvif-field-smoke-gate` | 기록없음 | 같은 V130 source | field gate 로드맵 예상 검증. 실장비 성공 아님 |
| V130-P0-02 `verify-onvif-field-smoke-redaction` | 기록없음 | 같은 V130 source | field redaction 로드맵 예상 검증 |
| V130-P0-02 field smoke report review | 기록없음 | 같은 V130 source | 수동/report review 로드맵 예상 항목. 실장비 field smoke PASS 아님 |
| V130-P0-03 `verify-ops-source-health-bulk` | 기록없음 | tag `v1.3.0:docs/development-backlog.md`, V130 table/section | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V130-P0-03 `verify-ops-audit-trail` | 기록없음 | 같은 V130 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V130-P0-03 `verify-ops-client-ui --screenshots` | 기록없음 | 같은 V130 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V130-P1-01 `verify-ops-client-ui --screenshots` | 기록없음 | tag `v1.3.0:docs/development-backlog.md`, V130 table | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V130-P1-01 client accessibility DOM snapshot | 기록없음 | 같은 V130 source | 로드맵 예상 UI 검토. 실행 PASS output/report 미확인 |
| V130-P1-01 `verify-auth-routes` | 기록없음 | 같은 V130 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V130-P1-02 `verify-rule-ui` | 기록없음 | tag `v1.3.0:docs/development-backlog.md`, V130 table/section | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V130-P1-02 `verify-va-replay` | 기록없음 | 같은 V130 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V130-P1-02 `verify-va-events` | 기록없음 | 같은 V130 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V130-P1-02 docs review | 기록없음 | 같은 V130 source | 로드맵 예상 review. 실행 PASS output/report 미확인 |
| V130-P1-03 `verify-auth-users` | 기록없음 | tag `v1.3.0:docs/development-backlog.md`, V130 table/section | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V130-P1-03 `verify-auth-routes` | 기록없음 | 같은 V130 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V130-P1-03 `verify-ops-audit-trail` | 기록없음 | 같은 V130 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V130-P2-01 `verify-release-closeout-helper` | 기록없음 | tag `v1.3.0:docs/development-backlog.md`, V130 table/section | 로드맵 예상 검증. tag/push/GitHub Release 실행 아님 |
| V130-P2-01 `verify-docs-ui-assets` | 기록없음 | 같은 V130 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V130-P2-01 `verify-ui-visual-artifact-index` | 기록없음 | 같은 V130 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V130-P2-01 `git diff --check` | 기록없음 | 같은 V130 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V130-P2-02 `compare-close-object-tracker` | 기록없음 | tag `v1.3.0:docs/development-backlog.md`, V130 table/section | 로드맵 예상 검증. Re-ID default-on PASS 아님 |
| V130-P2-02 `verify-reid-advanced-tracking` | 기록없음 | 같은 V130 source | 로드맵 예상 검증. Re-ID default-on PASS 아님 |
| V130-P2-02 privacy/docs review | 기록없음 | 같은 V130 source | 로드맵 예상 review. 실행 PASS output/report 미확인 |
| GitHub Actions status check | 기록없음 | tag `v1.3.0:docs/release-policy.md` `Not Run / Unverified` | PASS 아님 |
| Longrun / soak | 기록없음 | 같은 release-policy 섹션 | PASS 아님 |
| Real ONVIF device field smoke | 기록없음 | 같은 release-policy 섹션 | PASS 아님 |
| YouTube real URL relay | 기록없음 | 같은 release-policy 섹션 | PASS 아님 |
| External TURN/WHEP credential operations | 기록없음 | 같은 release-policy 섹션 | PASS 아님 |

## v1.4.0

| 항목 | 판정 | 근거 | 주의 |
| --- | --- | --- | --- |
| Preflight | pass | tag `v1.4.0:docs/release-policy.md` `## Verification` | release-policy 행 |
| Licensing and Artifact Guardrails | pass | tag `v1.4.0:docs/release-policy.md` | release-policy 행 |
| `verify-public-repo-readiness` | pass | tag `v1.4.0:docs/release-policy.md` | release-policy 행 |
| `verify-bundle-policy` | pass | tag `v1.4.0:docs/release-policy.md` | release-policy 행 |
| `verify-release-bundle-dry-run` | pass | tag `v1.4.0:docs/release-policy.md` | release-policy 행 |
| V140-P0-01 `verify-rule-ui` | 기록없음 | tag `v1.4.0:docs/development-backlog.md`, V140 table | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V140-P0-01 `verify-ops-rules-roundtrip` | 기록없음 | 같은 V140 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V140-P0-01 `verify-analysis-state` | 기록없음 | 같은 V140 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V140-P0-01 metadata schema review | 기록없음 | 같은 V140 source | 로드맵 예상 검토 항목 |
| V140-P0-02 `verify-rule-ui` | 기록없음 | tag `v1.4.0:docs/development-backlog.md`, V140 table | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V140-P0-02 `verify-ops-rules-roundtrip` | 기록없음 | 같은 V140 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V140-P0-02 `verify-ops-client-ui --screenshots` | 기록없음 | 같은 V140 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V140-P0-03 `verify-reid-advanced-tracking` | 기록없음 | tag `v1.4.0:docs/development-backlog.md`, V140 table | 로드맵 예상 검증. Re-ID default-on PASS 아님 |
| V140-P0-03 privacy/docs review | 기록없음 | 같은 V140 source | 로드맵 예상 검토 항목 |
| V140-P0-03 `verify-webrtc-va-metadata` | 기록없음 | 같은 V140 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V140-P0-03 `verify-va-metadata-sidechannel` | 기록없음 | 같은 V140 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V140-P1-01 `verify-tracker-stability` | 기록없음 | tag `v1.4.0:docs/development-backlog.md`, V140 table | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V140-P1-01 `compare-close-object-tracker` | 기록없음 | 같은 V140 source | 로드맵 예상 검증. tracker default-on PASS 아님 |
| V140-P1-01 `verify-va-replay` | 기록없음 | 같은 V140 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V140-P1-01 `verify-va-events` | 기록없음 | 같은 V140 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V140-P1-02 `compare-close-object-tracker --fixture-matrix` | 기록없음 | tag `v1.4.0:docs/development-backlog.md`, V140 table | 로드맵 예상 검증. tracker default-on PASS 아님 |
| V140-P1-02 `verify-tracker-stability` | 기록없음 | 같은 V140 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V140-P1-02 `verify-va-replay` | 기록없음 | 같은 V140 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V140-P1-02 `verify-va-events` | 기록없음 | 같은 V140 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V140-P1-03 `verify-reid-advanced-tracking` | 기록없음 | tag `v1.4.0:docs/development-backlog.md`, V140 table | 로드맵 예상 검증. Re-ID default-on PASS 아님 |
| V140-P1-03 `compare-close-object-tracker` | 기록없음 | 같은 V140 source | 로드맵 예상 검증. tracker default-on PASS 아님 |
| V140-P1-03 privacy review | 기록없음 | 같은 V140 source | 로드맵 예상 검토 항목 |
| V140-P2-01 benchmark report | 기록없음 | tag `v1.4.0:docs/development-backlog.md`, V140 table | 로드맵 예상 report 항목 |
| V140-P2-01 `compare-close-object-tracker` | 기록없음 | 같은 V140 source | 로드맵 예상 검증. OC-SORT 승격 PASS 아님 |
| V140-P2-01 docs review | 기록없음 | 같은 V140 source | 로드맵 예상 검토 항목 |
| V140-P2-02 `verify-bot-sort-deepsort-research-boundary` | 기록없음 | tag `v1.4.0:docs/development-backlog.md`, V140 table | 로드맵 예상 검증. runtime tracker 승격 PASS 아님 |
| V140-P2-02 `verify-reid-advanced-tracking` | 기록없음 | 같은 V140 source | 로드맵 예상 검증. Re-ID default-on PASS 아님 |
| V140-P2-02 privacy/bundle docs review | 기록없음 | 같은 V140 source | 로드맵 예상 검토 항목 |
| GitHub Actions status check | 기록없음 | tag `v1.4.0:docs/release-policy.md` `Not Run / Unverified` | PASS 아님 |
| Longrun / soak | 기록없음 | 같은 release-policy 섹션 | PASS 아님 |
| Real ONVIF device field smoke | 기록없음 | 같은 release-policy 섹션 | PASS 아님 |
| YouTube real URL relay | 기록없음 | 같은 release-policy 섹션 | PASS 아님 |
| External TURN/WHEP credential operations | 기록없음 | 같은 release-policy 섹션 | PASS 아님 |

## v1.5.0

| 항목 | 판정 | 근거 | 주의 |
| --- | --- | --- | --- |
| Preflight | pass | tag `v1.5.0:docs/release-policy.md` `## Verification` | release-policy 행 |
| Licensing and Artifact Guardrails | pass | tag `v1.5.0:docs/release-policy.md` | release-policy 행 |
| `verify-public-repo-readiness` | pass | tag `v1.5.0:docs/release-policy.md` | release-policy 행 |
| `verify-bundle-policy` | pass | tag `v1.5.0:docs/release-policy.md` | release-policy 행 |
| `verify-release-bundle-dry-run` | pass | tag `v1.5.0:docs/release-policy.md` | release-policy 행 |
| V150-P0-01 `verify-rule-ui` | 기록없음 | tag `v1.5.0:docs/development-backlog.md`, V150 table | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V150-P0-01 `verify-ops-rules-roundtrip` | 기록없음 | 같은 V150 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V150-P0-01 `verify-analysis-state` | 기록없음 | 같은 V150 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V150-P0-01 tracker/Re-ID off 기본 회귀 테스트 | 기록없음 | 같은 V150 source | 로드맵 예상 회귀 항목 |
| V150-P0-02 `verify-tracker-stability` | 기록없음 | tag `v1.5.0:docs/development-backlog.md`, V150 table | 로드맵 예상 검증. tracker/Re-ID default-on PASS 아님 |
| V150-P0-02 `compare-close-object-tracker --fixture-matrix` | 기록없음 | 같은 V150 source | 로드맵 예상 검증. tracker/Re-ID default-on PASS 아님 |
| V150-P0-02 `verify-va-replay` | 기록없음 | 같은 V150 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V150-P0-02 `verify-va-events` | 기록없음 | 같은 V150 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V150-P0-03 `verify-reid-advanced-tracking` | 기록없음 | tag `v1.5.0:docs/development-backlog.md`, V150 table | 로드맵 예상 검증. Re-ID model 승인 PASS 아님 |
| V150-P0-03 invalid/missing model fixture | 기록없음 | 같은 V150 source | 로드맵 예상 fixture 항목 |
| V150-P0-03 metadata 비노출 guard | 기록없음 | 같은 V150 source | 로드맵 예상 guard 항목 |
| V150-P1-01 `verify-ops-client-ui --screenshots` | 기록없음 | tag `v1.5.0:docs/development-backlog.md`, V150 table | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V150-P1-01 tracker warning fixture smoke | 기록없음 | 같은 V150 source | 로드맵 예상 smoke 항목 |
| V150-P1-01 `verify-va-runtime-console` | 기록없음 | 같은 V150 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V150-P1-02 `verify-ops-audit-trail` | 기록없음 | tag `v1.5.0:docs/development-backlog.md`, V150 table | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V150-P1-02 `verify-auth-users` | 기록없음 | 같은 V150 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V150-P1-02 민감정보 masking regression | 기록없음 | 같은 V150 source | 로드맵 예상 회귀 항목 |
| V150-P1-03 docs guard | 기록없음 | tag `v1.5.0:docs/development-backlog.md`, V150 table | 로드맵 예상 guard 항목 |
| V150-P1-03 report archive policy verifier | 기록없음 | 같은 V150 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V150-P1-03 `compare-close-object-tracker --history-dir` | 기록없음 | 같은 V150 source | 로드맵 예상 검증. tracker/Re-ID default-on PASS 아님 |
| V150-P2-01 experimental fixture | 기록없음 | tag `v1.5.0:docs/development-backlog.md`, V150 table | 로드맵 예상 fixture 항목. OC-SORT 제품 승격 PASS 아님 |
| V150-P2-01 `compare-close-object-tracker` | 기록없음 | 같은 V150 source | 로드맵 예상 검증. OC-SORT 제품 승격 PASS 아님 |
| V150-P2-01 runtime tracker boundary verifier | 기록없음 | 같은 V150 source | 로드맵 예상 검증. runtime tracker 승격 PASS 아님 |
| GitHub Actions status check | 기록없음 | tag `v1.5.0:docs/release-policy.md` `Not Run / Unverified` | PASS 아님 |
| Longrun / soak | 기록없음 | 같은 release-policy 섹션 | PASS 아님 |
| Real ONVIF device field smoke | 기록없음 | 같은 release-policy 섹션 | PASS 아님 |
| YouTube real URL relay | 기록없음 | 같은 release-policy 섹션 | PASS 아님 |
| External TURN/WHEP credential operations | 기록없음 | 같은 release-policy 섹션 | PASS 아님 |

## v1.6.0

| 항목 | 판정 | 근거 | 주의 |
| --- | --- | --- | --- |
| Preflight | pass | tag `v1.6.0:docs/release-policy.md` `## Verification` | release-policy 행 |
| Licensing and Artifact Guardrails | pass | tag `v1.6.0:docs/release-policy.md` | release-policy 행 |
| `verify-public-repo-readiness` | pass | tag `v1.6.0:docs/release-policy.md` | release-policy 행 |
| `verify-bundle-policy` | pass | tag `v1.6.0:docs/release-policy.md` | release-policy 행 |
| `verify-release-bundle-dry-run` | pass | tag `v1.6.0:docs/release-policy.md` | release-policy 행 |
| V160-P0-01 `verify-docs-links` | 기록없음 | tag `v1.6.0:docs/development-backlog.md`, V160 table | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V160-P0-01 release evidence checks | 기록없음 | 같은 V160 source | 로드맵 예상 check 항목 |
| V160-P0-01 `git diff --check` | 기록없음 | 같은 V160 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V160-P0-02 `verify-script-inventory` | 기록없음 | tag `v1.6.0:docs/development-backlog.md`, V160 table | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V160-P0-02 주요 smoke suite | 기록없음 | 같은 V160 source | 로드맵 예상 smoke suite. 실행 PASS output/report 미확인 |
| V160-P0-02 `git diff --check` | 기록없음 | 같은 V160 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V160-P0-03 `verify-ops-client-ui` | 기록없음 | tag `v1.6.0:docs/development-backlog.md`, V160 table | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V160-P0-03 `verify-auth-routes` | 기록없음 | 같은 V160 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V160-P0-03 client redaction checks | 기록없음 | 같은 V160 source | 로드맵 예상 check 항목 |
| V160-P0-04 `verify-v150-follow-up-closure` | 기록없음 | tag `v1.6.0:docs/development-backlog.md`, V160 table | 로드맵 예상 검증. tracker/Re-ID default-on PASS 아님 |
| V160-P0-04 tracker/Re-ID stability matrix verifier | 기록없음 | 같은 V160 source | 로드맵 예상 검증. tracker/Re-ID default-on PASS 아님 |
| V160-P1-01 field smoke summary verifier | 기록없음 | tag `v1.6.0:docs/development-backlog.md`, V160 table | 로드맵 예상 검증. real ONVIF field PASS 아님 |
| V160-P1-01 docs guard | 기록없음 | 같은 V160 source | 로드맵 예상 guard 항목 |
| V160-P1-02 audit export verifier | 기록없음 | tag `v1.6.0:docs/development-backlog.md`, V160 table | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V160-P1-02 `verify-ops-audit-trail` | 기록없음 | 같은 V160 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V160-P1-03 provenance/fallback verifier | 기록없음 | tag `v1.6.0:docs/development-backlog.md`, V160 table | 로드맵 예상 검증. runtime/model bundle PASS 아님 |
| V160-P1-03 privacy verifier | 기록없음 | 같은 V160 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V160-P1-03 bundle policy checks | 기록없음 | 같은 V160 source | 로드맵 예상 checks. runtime/model bundle PASS 아님 |
| V160-P1-04 manual UI checklist | 기록없음 | tag `v1.6.0:docs/development-backlog.md`, V160 table | 로드맵 예상 checklist. UI 풀테스트 PASS 아님 |
| V160-P1-04 screenshots when run | 기록없음 | 같은 V160 source | conditional screenshot item. 실행 evidence 미확인 |
| V160-P1-04 `verify-docs-ui-assets` | 기록없음 | 같은 V160 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V160-P2-01 `verify-release-metadata` | 기록없음 | tag `v1.6.0:docs/development-backlog.md`, V160 table | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V160-P2-01 `verify-docs-links` | 기록없음 | 같은 V160 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V160-P2-01 `git diff --check` | 기록없음 | 같은 V160 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V160-P2-02 docs guard | 기록없음 | tag `v1.6.0:docs/development-backlog.md`, V160 table | 로드맵 예상 guard 항목 |
| V160-P2-02 no runtime adapter change | 기록없음 | 같은 V160 source | 로드맵 예상 invariant. tracker adapter 구현 PASS 아님 |
| V160-P2-02 `git diff --check` | 기록없음 | 같은 V160 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| GitHub Actions status check | 기록없음 | tag `v1.6.0:docs/release-policy.md` `Not Run / Unverified` | PASS 아님 |
| Longrun / soak | 기록없음 | 같은 release-policy 섹션 | PASS 아님 |
| Real ONVIF device field smoke | 기록없음 | 같은 release-policy 섹션 | PASS 아님 |
| YouTube real URL relay | 기록없음 | 같은 release-policy 섹션 | PASS 아님 |
| External TURN/WHEP credential operations | 기록없음 | 같은 release-policy 섹션 | PASS 아님 |

## v1.7.0

| 항목 | 판정 | 근거 | 주의 |
| --- | --- | --- | --- |
| Preflight | pass | tag `v1.7.0:docs/release-policy.md` `## Verification` | release-policy 행 |
| Licensing and Artifact Guardrails | pass | tag `v1.7.0:docs/release-policy.md` | release-policy 행 |
| `verify-public-repo-readiness` | pass | tag `v1.7.0:docs/release-policy.md` | release-policy 행 |
| `verify-bundle-policy` | pass | tag `v1.7.0:docs/release-policy.md` | release-policy 행 |
| `verify-release-bundle-dry-run` | pass | tag `v1.7.0:docs/release-policy.md` | release-policy 행 |
| V170-P0-01 UI inventory review | 기록없음 | tag `v1.7.0:docs/development-backlog.md`, V170 table | 로드맵 예상 검토 항목 |
| V170-P0-01 `verify-ops-client-ui --screenshots` | 기록없음 | 같은 V170 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V170-P0-01 수동 브라우저 검수 | 기록없음 | 같은 V170 source | 로드맵 예상 수동 UI 항목. UI 풀테스트 PASS 아님 |
| V170-P0-02 브라우저 drag/drop 수동 검수 | 기록없음 | tag `v1.7.0:docs/development-backlog.md`, V170 table | 로드맵 예상 수동 UI 항목. 실행 evidence 미확인 |
| V170-P0-02 `verify-ops-client-ui --screenshots` | 기록없음 | 같은 V170 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V170-P0-02 `verify-auth-routes` | 기록없음 | 같은 V170 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V170-P0-03 `verify-ops-client-ui --screenshots` | 기록없음 | tag `v1.7.0:docs/development-backlog.md`, V170 table | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V170-P0-03 `verify-webrtc-va-metadata` | 기록없음 | 같은 V170 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V170-P0-03 event redaction review | 기록없음 | 같은 V170 source | 로드맵 예상 검토 항목 |
| V170-P0-04 수동 개별/전체 disconnect 검수 | 기록없음 | tag `v1.7.0:docs/development-backlog.md`, V170 table | 로드맵 예상 수동 UI 항목. 실행 evidence 미확인 |
| V170-P0-04 `verify-webrtc-ice` | 기록없음 | 같은 V170 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V170-P0-04 `verify-ops-client-ui --screenshots` | 기록없음 | 같은 V170 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V170-P0-05 `verify-va-events` | 기록없음 | tag `v1.7.0:docs/development-backlog.md`, V170 table | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V170-P0-05 review state roundtrip smoke | 기록없음 | 같은 V170 source | 로드맵 예상 smoke 항목 |
| V170-P0-05 audit/redaction review | 기록없음 | 같은 V170 source | 로드맵 예상 검토 항목 |
| V170-P1-01 `verify-auth-users` | 기록없음 | tag `v1.7.0:docs/development-backlog.md`, V170 table | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V170-P1-01 `verify-auth-routes` | 기록없음 | 같은 V170 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V170-P1-01 source group roundtrip smoke | 기록없음 | 같은 V170 source | 로드맵 예상 smoke 항목 |
| V170-P1-02 브라우저 overlay 수동 검수 | 기록없음 | tag `v1.7.0:docs/development-backlog.md`, V170 table | 로드맵 예상 수동 UI 항목. 실행 evidence 미확인 |
| V170-P1-02 WebRTC stats smoke | 기록없음 | 같은 V170 source | 로드맵 예상 smoke 항목 |
| V170-P1-02 `verify-ops-client-ui --screenshots` | 기록없음 | 같은 V170 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V170-P1-03 preference roundtrip smoke | 기록없음 | tag `v1.7.0:docs/development-backlog.md`, V170 table | 로드맵 예상 smoke 항목 |
| V170-P1-03 `verify-auth-routes` | 기록없음 | 같은 V170 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V170-P1-03 수동 새로고침 검수 | 기록없음 | 같은 V170 source | 로드맵 예상 수동 UI 항목. 실행 evidence 미확인 |
| V170-P1-04 `verify-va-runtime-console` | 기록없음 | tag `v1.7.0:docs/development-backlog.md`, V170 table | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V170-P1-04 `verify-ops-source-health-bulk` | 기록없음 | 같은 V170 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V170-P1-04 수동 Ops click 검수 | 기록없음 | 같은 V170 source | 로드맵 예상 수동 UI 항목. 실행 evidence 미확인 |
| V170-P2-01 delivery fixture smoke | 기록없음 | tag `v1.7.0:docs/development-backlog.md`, V170 table | 로드맵 예상 smoke 항목. 실제 외부 delivery PASS 아님 |
| V170-P2-01 `verify-event-post` | 기록없음 | 같은 V170 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V170-P2-01 audit/export masking review | 기록없음 | 같은 V170 source | 로드맵 예상 검토 항목 |
| V170-P2-02 `verify-rule-ui` | 기록없음 | tag `v1.7.0:docs/development-backlog.md`, V170 table | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V170-P2-02 `verify-ops-rules-roundtrip` | 기록없음 | 같은 V170 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V170-P2-02 scenario preview smoke | 기록없음 | 같은 V170 source | 로드맵 예상 smoke 항목 |
| V170-P2-03 `verify-ops-client-ui --screenshots` | 기록없음 | tag `v1.7.0:docs/development-backlog.md`, V170 table | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V170-P2-03 수동 Ops click 검수 | 기록없음 | 같은 V170 source | 로드맵 예상 수동 UI 항목. 실행 evidence 미확인 |
| GitHub Actions status check | 기록없음 | tag `v1.7.0:docs/release-policy.md` `Not Run / Unverified` | PASS 아님 |
| Longrun / soak | 기록없음 | 같은 release-policy 섹션 | PASS 아님 |
| Real ONVIF device field smoke | 기록없음 | 같은 release-policy 섹션 | PASS 아님 |
| YouTube real URL relay | 기록없음 | 같은 release-policy 섹션 | PASS 아님 |
| External TURN/WHEP credential operations | 기록없음 | 같은 release-policy 섹션 | PASS 아님 |

## v1.8.0

| 항목 | 판정 | 근거 | 주의 |
| --- | --- | --- | --- |
| Preflight | pass | tag `v1.8.0:docs/release-policy.md` `## Verification` | release-policy 행 |
| Licensing and Artifact Guardrails | pass | tag `v1.8.0:docs/release-policy.md` | release-policy 행 |
| `verify-public-repo-readiness` | pass | tag `v1.8.0:docs/release-policy.md` | release-policy 행 |
| `verify-bundle-policy` | pass | tag `v1.8.0:docs/release-policy.md` | release-policy 행 |
| `verify-release-bundle-dry-run` | pass | tag `v1.8.0:docs/release-policy.md` | release-policy 행 |
| `stability-script-smoke-20260525` | pass | `docs/release-evidence-index.md` Test Token Usage Ledger | 안정화 테스트 행 |
| `predev-30min-20260525` | pass | 같은 ledger | 30분 soak 행 |
| `ui-fulltest-restart-20260525-oehkFG` | pass | 같은 ledger | UI 풀테스트 행 |
| V180-P0-01 `verify-release-metadata` | 기록없음 | tag `v1.8.0:docs/development-backlog.md`, V180 table | local metadata 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V180-P0-01 `gh release list` | 기록없음 | 같은 V180 source | GitHub 조회 로드맵 예상 항목. 실행 evidence 미확인 |
| V180-P0-01 GitHub API `/releases/latest` | 기록없음 | 같은 V180 source | GitHub 조회 로드맵 예상 항목. 실행 evidence 미확인 |
| V180-P0-01 remote tag check | 기록없음 | 같은 V180 source | remote ref check 로드맵 예상 항목. 실행 evidence 미확인 |
| V180-P0-01 `verify-release-metadata --published` | 기록없음 | 같은 V180 source | published metadata 로드맵 예상 검증. release evidence row 미확인 |
| V180-P0-01 `git diff --check` | 기록없음 | 같은 V180 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V180-P0-02 `capture_docs_ui_assets.mjs --lang=ko/en` | 기록없음 | tag `v1.8.0:docs/development-backlog.md`, V180 table | 로드맵 예상 capture 항목. 실행 evidence 미확인 |
| V180-P0-02 `verify-docs-ui-assets` | 기록없음 | 같은 V180 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V180-P0-02 direct image review | 기록없음 | 같은 V180 source | 로드맵 예상 수동 검토 항목 |
| V180-P0-02 stale baseline search | 기록없음 | 같은 V180 source | 로드맵 예상 search/review 항목 |
| V180-P0-03 브라우저 수동 검수 | 기록없음 | tag `v1.8.0:docs/development-backlog.md`, V180 table | 로드맵 예상 수동 UI 항목. `ui-fulltest-restart`와 직접 매핑 필요 |
| V180-P0-03 `verify-ops-client-ui --screenshots` | 기록없음 | 같은 V180 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V180-P0-03 `verify-rule-ui` | 기록없음 | 같은 V180 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V180-P0-03 evidence index | 기록없음 | 같은 V180 source | 로드맵 예상 index linkage 항목. 실행 evidence 미확인 |
| V180-P0-04 dry-run checklist | 기록없음 | tag `v1.8.0:docs/development-backlog.md`, V180 table | 로드맵 예상 checklist 항목 |
| V180-P0-04 real close-out checklist | 기록없음 | 같은 V180 source | 로드맵 예상 checklist 항목. 실제 close-out PASS 아님 |
| V180-P0-04 `verify-docs-links` | 기록없음 | 같은 V180 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V180-P0-04 `verify-release-metadata` | 기록없음 | 같은 V180 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V180-P0-04 publish 후 `verify-release-metadata --published` | 기록없음 | 같은 V180 source | published metadata 로드맵 예상 검증. 실행 evidence 미확인 |
| V180-P1-01 stale/current wording search | 기록없음 | tag `v1.8.0:docs/development-backlog.md`, V180 table | 로드맵 예상 search 항목 |
| V180-P1-01 `verify-docs-links` | 기록없음 | 같은 V180 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V180-P1-01 `verify-release-metadata` | 기록없음 | 같은 V180 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V180-P1-02 English browser review | 기록없음 | tag `v1.8.0:docs/development-backlog.md`, V180 table | 로드맵 예상 수동 UI 항목 |
| V180-P1-02 `verify-ui-copy-i18n-parity` | 기록없음 | 같은 V180 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V180-P1-02 `verify-ops-client-ui --screenshots` | 기록없음 | 같은 V180 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V180-P1-03 evidence index review | 기록없음 | tag `v1.8.0:docs/development-backlog.md`, V180 table | 로드맵 예상 검토 항목 |
| V180-P1-03 `verify-docs-links` | 기록없음 | 같은 V180 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V180-P1-03 skipped-test wording review | 기록없음 | 같은 V180 source | 로드맵 예상 검토 항목 |
| V180-P2-01 roadmap review | 기록없음 | tag `v1.8.0:docs/development-backlog.md`, V180 table | 로드맵 예상 검토 항목 |
| V180-P2-01 non-scope review | 기록없음 | 같은 V180 source | 로드맵 예상 검토 항목 |
| V180-P2-01 `git diff --check` | 기록없음 | 같은 V180 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| 120분 longrun | 기록없음 | Not run for v1.8 evidence rows | 실행하지 않음 |
| main merge / release tag / GitHub Release / published metadata | 기록없음 | Not run for `ui-fulltest-restart-20260525-oehkFG` | 실행하지 않음 |
| GitHub Actions / Real ONVIF / YouTube / External TURN-WHEP | 기록없음 | tag `v1.8.0:docs/release-policy.md` `Not Run / Unverified` | PASS 아님 |

## v1.9.0

| 항목 | 판정 | 근거 | 주의 |
| --- | --- | --- | --- |
| Preflight | pass | tag `v1.9.0:docs/release-policy.md` `## Verification` | release-policy 행 |
| Licensing and Artifact Guardrails | pass | tag `v1.9.0:docs/release-policy.md` | release-policy 행 |
| `verify-public-repo-readiness` | pass | tag `v1.9.0:docs/release-policy.md` | release-policy 행 |
| `verify-bundle-policy` | pass | tag `v1.9.0:docs/release-policy.md` | release-policy 행 |
| `verify-release-bundle-dry-run` | pass | tag `v1.9.0:docs/release-policy.md` | release-policy 행 |
| v1.9.0 전용 안정화 테스트 evidence row | 기록없음 | 현재 `release-evidence-index.md`에서 `v190-*` 실행 row 미확인 | v1.8 rows를 v1.9 PASS로 재사용하지 않음 |
| v1.9.0 전용 30분 soak evidence row | 기록없음 | 현재 `release-evidence-index.md`에서 `v190-*` 실행 row 미확인 | 실행 evidence 미확인 |
| v1.9.0 전용 UI 풀테스트 evidence row | 기록없음 | 현재 `release-evidence-index.md`에서 `v190-*` 실행 row 미확인 | 실행 evidence 미확인 |
| v1.9.0 전용 120분 longrun evidence row | 기록없음 | 현재 `release-evidence-index.md`에서 `v190-*` 실행 row 미확인 | 실행 evidence 미확인 |
| V190-P0-01 GitHub check-runs annotations API review | 기록없음 | tag `v1.9.0:docs/development-backlog.md`, V190 table | 로드맵 예상 GitHub review 항목. 실행 evidence 미확인 |
| V190-P0-01 release gate policy review | 기록없음 | 같은 V190 source | 로드맵 예상 검토 항목 |
| V190-P0-01 `verify-actions-security` | 기록없음 | 같은 V190 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V190-P0-01 Preflight/static-gates/guardrails | 기록없음 | 같은 V190 source | 로드맵 예상 CI/check set. GitHub check evidence 미확인 |
| V190-P0-01 `git diff --check` | 기록없음 | 같은 V190 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V190-P0-02 upstream action version/changelog review | 기록없음 | tag `v1.9.0:docs/development-backlog.md`, V190 table | 로드맵 예상 검토 항목 |
| V190-P0-02 `.github/dependabot.yml` review | 기록없음 | 같은 V190 source | 로드맵 예상 검토 항목 |
| V190-P0-02 `verify-actions-security` | 기록없음 | 같은 V190 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V190-P0-02 Preflight/static-gates/guardrails | 기록없음 | 같은 V190 source | 로드맵 예상 CI/check set. GitHub check evidence 미확인 |
| V190-P0-02 `git diff --check` | 기록없음 | 같은 V190 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V190-P0-03 feature inventory fixture review | 기록없음 | tag `v1.9.0:docs/development-backlog.md`, V190 table | 로드맵 예상 검토 항목 |
| V190-P0-03 autonomous UI runner | 기록없음 | 같은 V190 source | runner 로드맵 예상 항목. UI 풀테스트 실행 PASS 아님 |
| V190-P0-03 per-ID evidence report | 기록없음 | 같은 V190 source | 로드맵 예상 report 항목 |
| V190-P0-03 manual spot review | 기록없음 | 같은 V190 source | 로드맵 예상 수동 검토 항목 |
| V190-P0-03 `verify-ops-client-ui --screenshots` | 기록없음 | 같은 V190 source | 로드맵 예상 검증. UI 풀테스트 PASS 아님 |
| V190-P0-03 `verify-rule-ui` | 기록없음 | 같은 V190 source | 로드맵 예상 검증. UI 풀테스트 PASS 아님 |
| V190-P0-03 `git diff --check` | 기록없음 | 같은 V190 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V190-P0-04 `verify-feature-inventory-coverage` inventory-to-verifier mapping report | 기록없음 | tag `v1.9.0:docs/development-backlog.md`, V190 table | 로드맵 예상 검증/report. 실행 PASS output/report 미확인 |
| V190-P0-04 missing-ID FAIL check | 기록없음 | 같은 V190 source | 로드맵 예상 negative check |
| V190-P0-04 `verify-script-inventory` | 기록없음 | 같은 V190 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V190-P0-04 release gate dry-run | 기록없음 | 같은 V190 source | 로드맵 예상 dry-run item |
| V190-P0-04 `git diff --check` | 기록없음 | 같은 V190 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V190-P0-05 contract artifact review | 기록없음 | tag `v1.9.0:docs/development-backlog.md`, V190 table | 로드맵 예상 검토 항목 |
| V190-P0-05 schema/payload sample diff | 기록없음 | 같은 V190 source | 로드맵 예상 diff 항목 |
| V190-P0-05 `verify-integrator-contract-artifact` | 기록없음 | 같은 V190 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V190-P0-05 `verify-webrtc-va-metadata` | 기록없음 | 같은 V190 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V190-P0-05 `verify-va-metadata-sidechannel` | 기록없음 | 같은 V190 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V190-P0-05 `verify-ws-metadata` | 기록없음 | 같은 V190 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V190-P0-05 `verify-event-post` | 기록없음 | 같은 V190 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V190-P0-05 `git diff --check` | 기록없음 | 같은 V190 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V190-P0-06 fixture cleanup matrix | 기록없음 | tag `v1.9.0:docs/development-backlog.md`, V190 table | 로드맵 예상 matrix 항목 |
| V190-P0-06 throwaway state path review | 기록없음 | 같은 V190 source | 로드맵 예상 검토 항목 |
| V190-P0-06 `verify-fixture-cleanup-contracts` | 기록없음 | 같은 V190 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V190-P0-06 access request cleanup | 기록없음 | 같은 V190 source | 로드맵 예상 cleanup 항목 |
| V190-P0-06 EventRecord cleanup | 기록없음 | 같은 V190 source | 로드맵 예상 cleanup 항목 |
| V190-P0-06 port cleanup check | 기록없음 | 같은 V190 source | 로드맵 예상 check 항목 |
| V190-P0-06 `git diff --check` | 기록없음 | 같은 V190 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V190-P0-07 local-vs-CI gate matrix | 기록없음 | tag `v1.9.0:docs/development-backlog.md`, V190 table | 로드맵 예상 matrix 항목 |
| V190-P0-07 `.github/workflows/*` review | 기록없음 | 같은 V190 source | 로드맵 예상 검토 항목 |
| V190-P0-07 `verify-ci-local-gate-parity` | 기록없음 | 같은 V190 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V190-P0-07 `verify-script-inventory` | 기록없음 | 같은 V190 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V190-P0-07 `verify-actions-security` | 기록없음 | 같은 V190 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V190-P0-07 Preflight/static-gates/guardrails | 기록없음 | 같은 V190 source | 로드맵 예상 CI/check set. GitHub check evidence 미확인 |
| V190-P0-07 `git diff --check` | 기록없음 | 같은 V190 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V190-P1-01 `verify-release-metadata --published` report review | 기록없음 | tag `v1.9.0:docs/development-backlog.md`, V190 table | 로드맵 예상 published metadata 항목. 실행 evidence 미확인 |
| V190-P1-01 GitHub API latest release check | 기록없음 | 같은 V190 source | 로드맵 예상 GitHub check. 실행 evidence 미확인 |
| V190-P1-01 remote refs check | 기록없음 | 같은 V190 source | 로드맵 예상 remote check. 실행 evidence 미확인 |
| V190-P1-01 release evidence index review | 기록없음 | 같은 V190 source | 로드맵 예상 검토 항목 |
| V190-P1-01 `git diff --check` | 기록없음 | 같은 V190 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V190-P1-02 sandbox/non-sandbox verifier comparison | 기록없음 | tag `v1.9.0:docs/development-backlog.md`, V190 table | 로드맵 예상 comparison 항목 |
| V190-P1-02 `gh` failure reproduction | 기록없음 | 같은 V190 source | 로드맵 예상 reproduction 항목 |
| V190-P1-02 GitHub API fallback review | 기록없음 | 같은 V190 source | 로드맵 예상 검토 항목 |
| V190-P1-02 `verify-release-metadata --published` | 기록없음 | 같은 V190 source | 로드맵 예상 검증. 실행 evidence 미확인 |
| V190-P1-02 `git diff --check` | 기록없음 | 같은 V190 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V190-P1-03 VA replay matrix | 기록없음 | tag `v1.9.0:docs/development-backlog.md`, V190 table | 로드맵 예상 matrix 항목 |
| V190-P1-03 EventRecord history report | 기록없음 | 같은 V190 source | 로드맵 예상 report 항목 |
| V190-P1-03 rule/scenario event type coverage | 기록없음 | 같은 V190 source | 로드맵 예상 coverage 항목 |
| V190-P1-03 invalid-combination FAIL rows | 기록없음 | 같은 V190 source | 로드맵 예상 negative rows. 실행 evidence 미확인 |
| V190-P1-03 `verify-va-events` | 기록없음 | 같은 V190 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V190-P1-03 `verify-va-replay` | 기록없음 | 같은 V190 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V190-P1-03 `git diff --check` | 기록없음 | 같은 V190 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V190-P1-04 `verify-release-closeout-helper --dry-run --one-shot-dry-run` | 기록없음 | tag `v1.9.0:docs/development-backlog.md`, V190 table | 로드맵 예상 dry-run. actual close-out PASS 아님 |
| V190-P1-04 dry-run close-out gate | 기록없음 | 같은 V190 source | 로드맵 예상 dry-run item |
| V190-P1-04 remote refs check | 기록없음 | 같은 V190 source | 로드맵 예상 remote check. 실행 evidence 미확인 |
| V190-P1-04 GitHub latest release API check | 기록없음 | 같은 V190 source | 로드맵 예상 GitHub check. 실행 evidence 미확인 |
| V190-P1-04 `verify-release-metadata --published` | 기록없음 | 같은 V190 source | 로드맵 예상 published metadata verifier. 실행 evidence 미확인 |
| V190-P1-04 failure-stop rehearsal | 기록없음 | 같은 V190 source | 로드맵 예상 rehearsal 항목 |
| V190-P1-04 `git diff --check` | 기록없음 | 같은 V190 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V190-P1-05 `verify-auth-regression-matrix` | 기록없음 | tag `v1.9.0:docs/development-backlog.md`, V190 table | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V190-P1-05 auth/scope matrix report | 기록없음 | 같은 V190 source | 로드맵 예상 report 항목 |
| V190-P1-05 `verify-auth-bootstrap` | 기록없음 | 같은 V190 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V190-P1-05 `verify-auth-users` | 기록없음 | 같은 V190 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V190-P1-05 `verify-auth-routes` | 기록없음 | 같은 V190 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V190-P1-05 `verify-ops-click-e2e --auth-ui-flow` | 기록없음 | 같은 V190 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V190-P1-05 viewer redaction UI smoke | 기록없음 | 같은 V190 source | 로드맵 예상 smoke 항목 |
| V190-P1-05 `git diff --check` | 기록없음 | 같은 V190 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V190-P1-06 `verify-v190-entry-baseline` | 기록없음 | tag `v1.9.0:docs/development-backlog.md`, V190 table | 로드맵 예상 검증. 전용 evidence row 미확인 |
| V190-P1-06 final baseline report | 기록없음 | 같은 V190 source | 로드맵 예상 report 항목. 전용 evidence row 미확인 |
| V190-P1-06 release evidence index review | 기록없음 | 같은 V190 source | 로드맵 예상 검토 항목 |
| V190-P1-06 `verify-release-evidence-index` | 기록없음 | 같은 V190 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V190-P1-06 `verify-post-release-reconciliation` | 기록없음 | 같은 V190 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V190-P1-06 `verify-release-metadata` | 기록없음 | 같은 V190 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V190-P1-06 CI check review | 기록없음 | 같은 V190 source | 로드맵 예상 검토 항목 |
| V190-P1-06 `git diff --check` | 기록없음 | 같은 V190 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V190-P2-01 `verify-ui-blocking-dialog-policy` | 기록없음 | tag `v1.9.0:docs/development-backlog.md`, V190 table | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V190-P2-01 blocking dialog fixture | 기록없음 | 같은 V190 source | 로드맵 예상 fixture 항목 |
| V190-P2-01 autonomous UI runner fail-fast check | 기록없음 | 같은 V190 source | 로드맵 예상 check 항목 |
| V190-P2-01 modal allowlist review | 기록없음 | 같은 V190 source | 로드맵 예상 검토 항목 |
| V190-P2-01 ops/client UI smoke | 기록없음 | 같은 V190 source | 로드맵 예상 smoke 항목 |
| V190-P2-01 `git diff --check` | 기록없음 | 같은 V190 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V190-P2-02 `verify-runtime-media-longrun-trigger-matrix` | 기록없음 | tag `v1.9.0:docs/development-backlog.md`, V190 table | 로드맵 예상 검증. 120분 실행 PASS 아님 |
| V190-P2-02 longrun trigger matrix | 기록없음 | 같은 V190 source | 로드맵 예상 matrix 항목 |
| V190-P2-02 `verify-longrun-separation` | 기록없음 | 같은 V190 source | 로드맵 예상 검증. 120분 실행 PASS 아님 |
| V190-P2-02 `verify-rc-release-gate` | 기록없음 | 같은 V190 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| V190-P2-02 `verify-runtime-dashboard-longrun-template` | 기록없음 | 같은 V190 source | 로드맵 예상 검증. 120분 실행 PASS 아님 |
| V190-P2-02 high-risk change rehearsal | 기록없음 | 같은 V190 source | 로드맵 예상 rehearsal 항목 |
| V190-P2-02 `git diff --check` | 기록없음 | 같은 V190 source | 로드맵 예상 검증. 실행 PASS output/report 미확인 |
| GitHub Actions status check | 기록없음 | tag `v1.9.0:docs/release-policy.md` `Not Run / Unverified` | PASS 아님 |
| Longrun / soak | 기록없음 | 같은 release-policy 섹션 | PASS 아님 |
| Real ONVIF device field smoke | 기록없음 | 같은 release-policy 섹션 | PASS 아님 |
| YouTube real URL relay | 기록없음 | 같은 release-policy 섹션 | PASS 아님 |
| External TURN/WHEP credential operations | 기록없음 | 같은 release-policy 섹션 | PASS 아님 |

## v2.0.0

| 항목 | 판정 | 근거 | 주의 |
| --- | --- | --- | --- |
| Preflight | pass | tag `v2.0.0:docs/release-policy.md` `## Verification` | release-policy 행 |
| Licensing and Artifact Guardrails | pass | tag `v2.0.0:docs/release-policy.md` | release-policy 행 |
| `verify-public-repo-readiness` | pass | tag `v2.0.0:docs/release-policy.md` | release-policy 행 |
| `verify-bundle-policy` | pass | tag `v2.0.0:docs/release-policy.md` | release-policy 행 |
| `verify-release-bundle-dry-run` | pass | tag `v2.0.0:docs/release-policy.md` | release-policy 행 |
| V200-S00 `verify-vlm-boundary` | pass | tag `v2.0.0:docs/development-backlog.md` S00 완료 판정 | VLM boundary verifier |
| V200-S00 `verify-integrator-contract-artifact` | pass | 같은 S00 source | integrator contract verifier |
| V200-S00 `verify-webrtc-va-metadata` | pass | 같은 S00 source | WebRTC metadata verifier |
| V200-S00 `verify-va-metadata-sidechannel` | pass | 같은 S00 source | sidechannel metadata verifier |
| V200-S00 `verify-ws-metadata` | pass | 같은 S00 source | WS metadata verifier |
| V200-S00 `verify-event-post` | pass | 같은 S00 source | Event POST verifier |
| V200-S00 `git diff --check` | pass | 같은 S00 source | diff whitespace verifier |
| V200-S00 VLM runtime/config/UI 구현 | 기록없음 | 같은 S00 source에서 완료 조건 아님으로 분리 | 실행하지 않음 |
| V200-S01 `verify-vlm-selection-decision` | pass | tag `v2.0.0:docs/development-backlog.md` S01 완료 판정 | 모델 선택 결정 verifier |
| V200-S01 `verify-bundle-policy` | pass | 같은 S01 source | bundle policy verifier |
| V200-S01 `git diff --check` | pass | 같은 S01 source | diff whitespace verifier |
| V200-S01 VLM runtime 실행/UI/장시간 테스트 | 기록없음 | 같은 S01 source에서 미수행으로 분리 | 실행하지 않음 |
| V200-S02 `verify-vlm-pc-capability` | pass | tag `v2.0.0:docs/development-backlog.md` S02 완료 판정 | PC capability verifier |
| V200-S02 `verify-vlm-boundary` | pass | 같은 S02 source | 기존 VLM boundary 재검증 |
| V200-S02 `verify-vlm-selection-decision` | pass | 같은 S02 source | 모델 선택 경계 재검증 |
| V200-S02 `verify-script-inventory` | pass | 같은 S02 source | script inventory verifier |
| V200-S02 `verify-project-inventory` | pass | 같은 S02 source | project inventory verifier |
| V200-S02 `verify-feature-inventory-coverage` | pass | 같은 S02 source | feature inventory coverage verifier |
| V200-S02 `git diff --check` | pass | 같은 S02 source | diff whitespace verifier |
| V200-S02 추천/설치/UI/VLM 호출 | 기록없음 | 같은 S02 source에서 미수행으로 분리 | 실행하지 않음 |
| V200-S03 `verify-vlm-recommendation-engine` | pass | tag `v2.0.0:docs/development-backlog.md` S03 완료 판정 | recommendation engine verifier |
| V200-S03 `verify-vlm-pc-capability` | pass | 같은 S03 source | PC capability input verifier |
| V200-S03 `verify-vlm-selection-decision` | pass | 같은 S03 source | selection decision input verifier |
| V200-S03 `verify-script-inventory` | pass | 같은 S03 source | script inventory verifier |
| V200-S03 `verify-project-inventory` | pass | 같은 S03 source | project inventory verifier |
| V200-S03 `verify-feature-inventory-coverage` | pass | 같은 S03 source | feature inventory coverage verifier |
| V200-S03 `git diff --check` | pass | 같은 S03 source | diff whitespace verifier |
| V200-S03 설치 UI/profile 저장/VLM 호출 | 기록없음 | 같은 S03 source에서 후속 범위로 분리 | 실행하지 않음 |
| V200-S04 `verify-vlm-install-connection-scope-gate` | pass | tag `v2.0.0:docs/development-backlog.md` S04 scope gate/dry-run/UI 완료 기준 | install/connection scope gate |
| V200-S04 `verify-vlm-selection-decision` | pass | 같은 S04 source | selection decision input verifier |
| V200-S04 `verify-vlm-pc-capability` | pass | 같은 S04 source | PC capability input verifier |
| V200-S04 `verify-vlm-recommendation-engine` | pass | 같은 S04 source | recommendation input verifier |
| V200-S04 `verify-vlm-install-connection-dry-run` | pass | 같은 S04 source | dry-run contract verifier |
| V200-S04 `verify-vlm-install-connection-ui` | pass | 같은 S04 source | Ops UI/API verifier |
| V200-S04 `./server.sh build` | pass | 같은 S04 source | UI 변경 안정화 gate |
| V200-S04 `verify-auth-bootstrap` | pass | 같은 S04 source | auth bootstrap verifier |
| V200-S04 `verify-auth-users` | pass | 같은 S04 source | auth users verifier |
| V200-S04 `verify-auth-routes` | pass | 같은 S04 source | auth routes verifier |
| V200-S04 `verify-ops-client-ui` | pass | 같은 S04 source | Ops/Client UI smoke |
| V200-S04 `verify-ops-client-ui --screenshots` | pass | 같은 S04 source | screenshot smoke. UI 풀테스트 PASS로 확대 금지 |
| V200-S04 `verify-rule-ui` | pass | 같은 S04 source | rule UI verifier |
| V200-S04 `git diff --check` | pass | 같은 S04 source | diff whitespace verifier |
| V200-S04 실제 설치/profile 저장/VLM 호출/sidecar 저장 | 기록없음 | 같은 S04 source에서 후속 범위로 분리 | 실행하지 않음 |
| V200-S05 `./server.sh build` | pass | tag `v2.0.0:docs/development-backlog.md` S05 local evidence | build |
| V200-S05 `verify-vlm-profile-storage` | pass | 같은 S05 source | profile storage verifier |
| V200-S05 `verify-auth-routes` | pass | 같은 S05 source | auth route verifier |
| V200-S05 `verify-ops-client-ui --http-base http://127.0.0.1:8082` | pass | 같은 S05 source | Ops/Client UI smoke |
| V200-S05 `verify-ops-client-ui --screenshots --http-base http://127.0.0.1:8082` | pass | 같은 S05 source | screenshot smoke. UI 풀테스트 PASS로 확대 금지 |
| V200-S05 `verify-rule-ui --http-base http://127.0.0.1:8082` | pass | 같은 S05 source | rule UI verifier |
| V200-S05 browser direct `/ops/vlm` save/delete and `/client/live` redaction check | pass | 같은 S05 source | tag-local 직접 확인 기록 |
| V200-S05 실제 VLM runtime/cloud call/credential/sidecar 저장 | 기록없음 | 같은 S05 source에서 미수행으로 분리 | 실행하지 않음 |
| V200-S06 `evaluate-vlm-harness --fixture test/fixtures/vlm_evaluation_harness/cases.json` | pass | tag `v2.0.0:docs/development-backlog.md` S06 local evidence | evaluation harness report 생성 |
| V200-S06 `verify-vlm-evaluation-harness` | pass | 같은 S06 source | evaluation harness verifier |
| V200-S06 `verify-script-inventory` | pass | 같은 S06 source | script inventory verifier |
| V200-S06 `verify-project-inventory` | pass | 같은 S06 source | project inventory verifier |
| V200-S06 `verify-feature-inventory-coverage` | pass | 같은 S06 source | feature inventory coverage verifier |
| V200-S06 `verify-docs-links` | pass | 같은 S06 source | docs link verifier |
| V200-S06 `verify-docs-ui-assets` | pass | 같은 S06 source | docs UI assets verifier |
| V200-S06 `git diff --check` | pass | 같은 S06 source | diff whitespace verifier |
| V200-S06 실제 model/runtime/cloud call/sidecar 저장 | 기록없음 | 같은 S06 source에서 미수행으로 분리 | 실행하지 않음 |
| V200-S07 `./server.sh build` | pass | tag `v2.0.0:docs/development-backlog.md` S07 local evidence | build |
| V200-S07 `verify-vlm-event-evidence-extraction` | pass | 같은 S07 source | event evidence extraction verifier |
| V200-S07 `verify-analysis-state` | pass | 같은 S07 source | analysis state verifier |
| V200-S07 `verify-va-replay` | pass | 같은 S07 source | VA replay verifier |
| V200-S07 `verify-va-events` | pass | 같은 S07 source | auth-off isolated VA events smoke |
| V200-S07 `git diff --check` | pass | 같은 S07 source | diff whitespace verifier |
| V200-S07 실제 VLM runtime/cloud call/sidecar 저장 | 기록없음 | 같은 S07 source에서 미수행으로 분리 | 실행하지 않음 |
| V200-S08 `./server.sh build` | pass | tag `v2.0.0:docs/development-backlog.md` S08 local evidence | build |
| V200-S08 `verify-vlm-observation-sidecar` | pass | 같은 S08 source | observation sidecar verifier |
| V200-S08 `verify-analysis-state` | pass | 같은 S08 source | analysis state verifier |
| V200-S08 `verify-event-post --http-base http://127.0.0.1:8084` | pass | 같은 S08 source | Event POST verifier |
| V200-S08 `verify-ws-metadata --http-base http://127.0.0.1:8084` | pass | 같은 S08 source | WS metadata verifier |
| V200-S08 `git diff --check` | pass | 같은 S08 source | diff whitespace verifier |
| V200-S08 실제 VLM runtime/cloud call/이벤트 설명/UI | 기록없음 | 같은 S08 source에서 후속 범위로 분리 | 실행하지 않음 |
| V200-S09 `node --check scripts/internal/generate_vlm_event_explanation.mjs` | pass | tag `v2.0.0:docs/development-backlog.md` S09 local evidence | Node syntax check |
| V200-S09 `node --check scripts/internal/verify_vlm_event_explanation_hints.mjs` | pass | 같은 S09 source | Node syntax check |
| V200-S09 `generate-vlm-event-explanation --fixture test/fixtures/vlm_event_explanation/cases.json` | pass | 같은 S09 source | event explanation report 생성 |
| V200-S09 `verify-vlm-event-explanation-hints` | pass | 같은 S09 source | explanation/hints verifier |
| V200-S09 `verify-vlm-observation-sidecar` | pass | 같은 S09 source | S08 sidecar boundary verifier |
| V200-S09 `git diff --check` | pass | 같은 S09 source | diff whitespace verifier |
| V200-S09 실제 VLM runtime/cloud call/Ops UI | 기록없음 | 같은 S09 source에서 후속 범위로 분리 | 실행하지 않음 |
| V200-S10 `node --check scripts/internal/verify_vlm_ops_event_review_ui.mjs` | pass | tag `v2.0.0:docs/development-backlog.md` S10 완료 evidence | Node syntax check |
| V200-S10 `verify-vlm-ops-event-review-ui` | pass | 같은 S10 source | VLM Ops event review UI verifier |
| V200-S10 `verify-ops-event-review-inbox` | pass | 같은 S10 source | Ops event review inbox verifier |
| V200-S10 `./server.sh build` | pass | 같은 S10 source | build |
| V200-S10 `verify-script-inventory` | pass | 같은 S10 source | script inventory verifier |
| V200-S10 `verify-project-inventory` | pass | 같은 S10 source | project inventory verifier |
| V200-S10 `verify-feature-inventory-coverage` | pass | 같은 S10 source | feature inventory coverage verifier |
| V200-S10 `verify-vlm-install-connection-scope-gate` | pass | 같은 S10 source | VLM scope gate verifier |
| V200-S10 in-app `/ops/events` direct check | pass | 같은 S10 source | fixture EventRecord/VLM 설명/힌트/질문 표시 확인 |
| V200-S10 in-app `/client/live` and `/client/dashboard` redaction check | pass | 같은 S10 source | client/viewer 비노출 확인 |
| V200-S10 `verify-ops-client-ui` and `verify-ops-client-ui --screenshots` | 기록없음 | 같은 S10 source: Chrome/CDP timeout 위험으로 미실행 분리 | 실행하지 않음 |
| V200-S11 `verify-vlm-privacy-transfer-guard` | pass | tag `v2.0.0:docs/development-backlog.md` S11 완료 evidence | privacy transfer guard verifier |
| V200-S11 `verify-vlm-profile-storage` | pass | 같은 S11 source | profile storage verifier |
| V200-S11 `verify-auth-routes` | pass | 같은 S11 source | auth route verifier |
| V200-S11 `verify-ops-client-ui` | pass | 같은 S11 source | Ops/Client leak guard verifier |
| V200-S11 `git diff --check` | pass | 같은 S11 source | diff whitespace verifier |
| V200-S11 실제 provider API call/credential/raw prompt 저장 | 기록없음 | 같은 S11 source에서 미수행으로 분리 | 실행하지 않음 |
| V200-S12 `./server.sh build` | pass | tag `v2.0.0:docs/development-backlog.md` S12 local evidence | build |
| V200-S12 `verify-vlm-summary-search-candidates` | pass | 같은 S12 source | summary search candidate verifier |
| V200-S12 `verify-analysis-state` | pass | 같은 S12 source | analysis state verifier |
| V200-S12 `verify-vlm-observation-sidecar` | pass | 같은 S12 source | observation sidecar verifier |
| V200-S12 `verify-event-post --http-base http://127.0.0.1:8084` | pass | 같은 S12 source | Event POST verifier |
| V200-S12 `verify-ws-metadata --http-base http://127.0.0.1:8084` | pass | 같은 S12 source | WS metadata verifier |
| V200-S12 `git diff --check` | pass | 같은 S12 source | diff whitespace verifier |
| V200-S12 runtime VLM re-query/provider rerank/vector DB/UI | 기록없음 | 같은 S12 source에서 미수행으로 분리 | 실행하지 않음 |
| V200-S13 `verify-vlm-rule-suggestion-candidates` | pass | tag `v2.0.0:docs/development-backlog.md` S13 완료 evidence | rule suggestion candidate verifier |
| V200-S13 `verify-analysis-state` | pass | 같은 S13 source | analysis state verifier |
| V200-S13 `verify-rule-ui` | pass | 같은 S13 source | rule UI verifier |
| V200-S13 `git diff --check` | pass | 같은 S13 source | diff whitespace verifier |
| V200-S13 제품 rule suggestion UI/자동 Rule/Profile 적용 | 기록없음 | 같은 S13 source에서 미수행으로 분리 | 실행하지 않음 |
| V200-S14 `verify-project-inventory` | pass | tag `v2.0.0:docs/development-backlog.md` S14 완료 evidence | 369 feature rows / 238 UI targets |
| V200-S14 `verify-feature-inventory-coverage` | pass | 같은 S14 source | feature coverage verifier |
| V200-S14 `verify-manual-ui-evidence-runner` | pass | 같은 S14 source | UI evidence runner self-test. UI 풀테스트 PASS로 확대 금지 |
| V200-S14 `verify-vlm-install-connection-scope-gate` | pass | 같은 S14 source | VLM scope gate verifier |
| V200-S14 `verify-vlm-pc-capability` | pass | 같은 S14 source | PC capability verifier |
| V200-S14 `verify-vlm-recommendation-engine` | pass | 같은 S14 source | recommendation engine verifier |
| V200-S14 `verify-vlm-install-connection-dry-run` | pass | 같은 S14 source | install connection dry-run verifier |
| V200-S14 `verify-script-inventory` | pass | 같은 S14 source | script inventory verifier |
| V200-S14 `git diff --check` | pass | 같은 S14 source | diff whitespace verifier |
| V200-S14 실제 VLM/cloud/UI 풀테스트/30분/120분 | 기록없음 | 같은 S14 source에서 미수행으로 분리 | 실행하지 않음 |
| V200-S15 `verify-vlm-test-rehearsal` | pass | tag `v2.0.0:docs/development-backlog.md` S15 완료 evidence | 7 rehearsal, 4 failure fixture, 6 cleanup, 1 lifecycle case |
| V200-S15 `verify-script-inventory` | pass | 같은 S15 source | script inventory verifier |
| V200-S15 `git diff --check` | pass | 같은 S15 source | diff whitespace verifier |
| V200-S15 안정화/30분/120분/UI 풀테스트 | 기록없음 | 같은 S15 source: 리허설은 실제 안정화/장시간/UI PASS 아님 | 실행하지 않음 |
| V200-S16 `./server.sh build` | pass | tag `v2.0.0:docs/development-backlog.md` S16 완료 evidence | build |
| V200-S16 `verify-auth-routes` | pass | 같은 S16 source | 최초 sandbox EPERM 후 sandbox 밖 재실행 PASS 135/0 |
| V200-S16 `verify-ops-client-ui --http-base http://127.0.0.1:8182 --browser-mode static` | pass | 같은 S16 source | static mode PASS 18/0. UI 풀테스트 PASS 아님 |
| V200-S16 `verify-rule-ui --http-base http://127.0.0.1:8182 --chrome-path ...` | pass | 같은 S16 source | Chrome 경로 명시 후 PASS |
| V200-S16 `verify-va-replay` | pass | 같은 S16 source | 14 baseline cases |
| V200-S16 `verify-va-events` | pass | 같은 S16 source | isolated server PASS 31/0 |
| V200-S16 `verify-webrtc-va-metadata --http-base http://127.0.0.1:8182 --chrome-path ...` | pass | 같은 S16 source | PASS 8/0 |
| V200-S16 `verify-va-metadata-sidechannel --http-base http://127.0.0.1:8182` | pass | 같은 S16 source | summary fail=0 |
| V200-S16 `verify-ws-metadata --http-base http://127.0.0.1:8182` | pass | 같은 S16 source | PASS 9/0 |
| V200-S16 `verify-event-post --http-base http://127.0.0.1:8183` | pass | 같은 S16 source | Event POST enabled isolated server PASS 9/0 |
| V200-S16 UI 풀테스트/30분/120분 | 기록없음 | 같은 S16 source에서 미수행으로 분리 | 실행하지 않음 |
| V200-S17 `verify-runtime-media-longrun-trigger-matrix` | pass | tag `v2.0.0:docs/development-backlog.md` S17 완료 evidence | longrun trigger matrix verifier |
| V200-S17 `verify-longrun-separation` | pass | 같은 S17 source | smoke/longrun separation verifier |
| V200-S17 `verify-manual-ui-evidence` | pass | 같은 S17 source | UI evidence structure verifier. UI 풀테스트 PASS 아님 |
| V200-S17 `verify-script-inventory` | pass | 같은 S17 source | script inventory verifier |
| V200-S17 `verify-docs-links` | pass | 같은 S17 source | docs link verifier |
| V200-S17 `git diff --check` | pass | 같은 S17 source | diff whitespace verifier |
| V200-S17 30분/120분/UI 풀테스트 실행 | 기록없음 | 같은 S17 source에서 미수행으로 분리 | 실행하지 않음 |
| V200-S18 `verify-vlm-closeout-readiness` | pass | tag `v2.0.0:docs/development-backlog.md` S18 완료 evidence | close-out readiness verifier |
| V200-S18 `verify-release-evidence-index` | pass | 같은 S18 source | release evidence verifier |
| V200-S18 `verify-release-metadata` | pass | 같은 S18 source | release metadata verifier |
| V200-S18 `verify-vlm-test-rehearsal` | pass | 같은 S18 source | VLM rehearsal verifier |
| V200-S18 `verify-runtime-media-longrun-trigger-matrix` | pass | 같은 S18 source | longrun trigger matrix verifier |
| V200-S18 `verify-longrun-separation` | pass | 같은 S18 source | longrun separation verifier |
| V200-S18 `verify-manual-ui-evidence` | pass | 같은 S18 source | UI evidence structure verifier. UI 풀테스트 PASS 아님 |
| V200-S18 `verify-script-inventory` | pass | 같은 S18 source | script inventory verifier |
| V200-S18 `verify-docs-links` | pass | 같은 S18 source | docs link verifier |
| V200-S18 `git diff --check` | pass | 같은 S18 source | diff whitespace verifier |
| V200-S18 release publish/tag/main merge/GitHub Release/UI/30분/120분 | 기록없음 | 같은 S18 source: 이후 별도 evidence로 분리 | S18 자체에서는 실행하지 않음 |
| `v200-vlm-closeout-readiness-20260531` | pass | `docs/release-evidence-index.md` ledger | VLM close-out readiness, UI/30분/120분/provider/publish 대체 아님 |
| `v200-restart-stability-20260531` | pass | 같은 ledger | 안정화 테스트 |
| `v200-restart-30min-20260531` | fail | 같은 ledger | Chrome executable not found로 30분 soak 1차 FAIL |
| `v200-restart-30min-retry-20260531` | pass | 같은 ledger | 30분 soak 재실행 PASS |
| `v200-inapp-policy-stability-20260601` | pass | 같은 ledger | 안정화 테스트 |
| `v200-inapp-policy-30min-20260601` | pass | 같은 ledger | 30분 soak |
| `v200-inapp-policy-ui-fulltest-20260601` | pass | 같은 ledger | 인앱 브라우저 UI 풀테스트 |
| `v200-inapp-policy-120min-20260601` | pass | 같은 ledger | `verify-predev --soak-minutes 120` |
| `v200-release-publication-20260601` | pass | 같은 ledger | release publication |
| `v200-signed-tag-verification-20260602` | pass | 같은 ledger | signed tag verification |
| `verify-va-runtime-console-longrun --duration-minutes 120` | 기록없음 | Not run for `v200-inapp-policy-120min-20260601` | predev 120과 runtime-console 120은 별개 |
| real cloud provider call / credential 저장 / external TURN field gate | 기록없음 | v200 not-run 문장 | 실행하지 않음 |
| VLM model/runtime bundle | 기록없음 | tag `v2.0.0:docs/release-policy.md` `Not Run / Unverified` | source-only release 경계 |

## v2.1.0

| 항목 | 판정 | 근거 | 주의 |
| --- | --- | --- | --- |
| Preflight | pass | tag `v2.1.0:docs/release-policy.md` `## Verification` | release-policy 행 |
| Licensing and Artifact Guardrails | pass | tag `v2.1.0:docs/release-policy.md` | release-policy 행 |
| `verify-public-repo-readiness` | pass | tag `v2.1.0:docs/release-policy.md` | release-policy 행 |
| `verify-bundle-policy` | pass | tag `v2.1.0:docs/release-policy.md` | release-policy 행 |
| `verify-release-bundle-dry-run` | pass | tag `v2.1.0:docs/release-policy.md` | release-policy 행 |
| V210-S00 `verify-v210-entry-baseline` | pass | tag `v2.1.0:docs/release-policy.md` aggregated S00-S12 verifier PASS, `v2.1.0:docs/development-backlog.md` S00 종료 기준 | entry baseline verifier |
| V210-S00 `verify-release-metadata` | pass | 같은 S00 source | local release metadata verifier |
| V210-S00 `verify-release-evidence-index` | pass | 같은 S00 source | evidence index verifier |
| V210-S00 `verify-integrator-contract-artifact` | pass | 같은 S00 source | integrator contract verifier |
| V210-S00 `verify-event-post` | pass | 같은 S00 source | Event POST verifier |
| V210-S00 `verify-auth-routes` | pass | 같은 S00 source | auth route verifier |
| V210-S00 `verify-codecs` | pass | 같은 S00 source | codec verifier |
| V210-S00 `verify-webrtc-ice` | pass | 같은 S00 source | WebRTC ICE verifier |
| V210-S00 `verify-webrtc-va-metadata` | pass | 같은 S00 source | WebRTC VA metadata verifier |
| V210-S00 `verify-va-metadata-sidechannel` | pass | 같은 S00 source | sidechannel metadata verifier |
| V210-S00 `verify-ws-metadata` | pass | 같은 S00 source | WS metadata verifier |
| V210-S00 `git diff --check` | pass | 같은 S00 source | diff whitespace verifier |
| V210-S00 UI 풀테스트 | 기록없음 | 같은 S00 source에서 제외 대상으로 분리 | 실행하지 않음 |
| V210-S00 30분 soak | 기록없음 | 같은 S00 source에서 제외 대상으로 분리 | 실행하지 않음 |
| V210-S00 120분 longrun | 기록없음 | 같은 S00 source에서 제외 대상으로 분리 | 실행하지 않음 |
| V210-S00 real cloud provider call | 기록없음 | 같은 S00 source에서 제외 대상으로 분리 | 실행하지 않음 |
| V210-S01 `verify-vlm-runtime-opt-in-contract` | pass | tag `v2.1.0:docs/release-policy.md` aggregated S00-S12 verifier PASS, S01 종료 기준 | runtime opt-in contract verifier |
| V210-S01 `verify-vlm-profile-storage` | pass | 같은 S01 source | profile storage verifier |
| V210-S01 `verify-vlm-privacy-transfer-guard` | pass | 같은 S01 source | privacy transfer guard verifier |
| V210-S01 `verify-auth-routes` | pass | 같은 S01 source | auth route verifier |
| V210-S01 `git diff --check` | pass | 같은 S01 source | diff whitespace verifier |
| V210-S01 local VLM runtime smoke | 기록없음 | 같은 S01 source에서 미수행으로 분리 | 실행하지 않음 |
| V210-S01 cloud provider field smoke | 기록없음 | 같은 S01 source에서 미수행으로 분리 | 실행하지 않음 |
| V210-S01 30분/120분 longrun | 기록없음 | 같은 S01 source에서 미수행으로 분리 | 실행하지 않음 |
| V210-S02 `verify-vlm-test-rehearsal` | pass | tag `v2.1.0:docs/release-policy.md` aggregated S00-S12 verifier PASS, S02 code block | local runtime smoke prerequisite verifier |
| V210-S02 `verify-vlm-local-runtime-smoke --report /tmp/media_server_vlm_local_runtime_smoke.md --json-report /tmp/media_server_vlm_local_runtime_smoke.json` | pass | 같은 S02 source | loopback local runtime smoke fixture |
| V210-S02 `git diff --check` | pass | 같은 S02 source | diff whitespace verifier |
| V210-S02 사용자 설치 실제 모델 품질 | 기록없음 | 같은 S02 source에서 비대체 범위로 분리 | 실행하지 않음 |
| V210-S02 cloud provider field smoke | 기록없음 | 같은 S02 source에서 비대체 범위로 분리 | 실행하지 않음 |
| V210-S02 UI 풀테스트/장시간 안정화 | 기록없음 | 같은 S02 source에서 비대체 범위로 분리 | 실행하지 않음 |
| V210-S03 `verify-vlm-cloud-provider-field-smoke-gate --report /tmp/media_server_vlm_cloud_field_gate.md --json-report /tmp/media_server_vlm_cloud_field_gate.json` | pass | tag `v2.1.0:docs/release-policy.md` aggregated S00-S12 verifier PASS, S03 code block | cloud provider field smoke gate verifier |
| V210-S03 `verify-vlm-privacy-transfer-guard` | pass | 같은 S03 source | privacy transfer guard verifier |
| V210-S03 `git diff --check` | pass | 같은 S03 source | diff whitespace verifier |
| V210-S03 `verify-vlm-cloud-provider-field-smoke-gate --allow-field-call` | 기록없음 | S03 source requires approval/env credential for actual call | 실제 provider 호출 미실행 |
| V210-S03 cloud credential material | 기록없음 | 같은 S03 source | 저장/공개 artifact 없음 |
| V210-S04 `./server.sh build` | pass | tag `v2.1.0:docs/release-policy.md` aggregated S00-S12 verifier PASS, S04 code block | build |
| V210-S04 `verify-vlm-queue-backpressure-stability --report /tmp/media_server_vlm_queue_backpressure.md --json-report /tmp/media_server_vlm_queue_backpressure.json` | pass | 같은 S04 source | queue/backpressure stability verifier |
| V210-S04 `verify-va-events` | pass | 같은 S04 source | VA events verifier |
| V210-S04 `verify-event-post` | pass | 같은 S04 source | Event POST verifier |
| V210-S04 `verify-webrtc-va-metadata` | pass | 같은 S04 source | WebRTC VA metadata verifier |
| V210-S04 `verify-va-metadata-sidechannel` | pass | 같은 S04 source | sidechannel metadata verifier |
| V210-S04 `verify-ws-metadata` | pass | 같은 S04 source | WS metadata verifier |
| V210-S04 `git diff --check` | pass | 같은 S04 source | diff whitespace verifier |
| V210-S04 실제 VLM runtime/provider 호출 | 기록없음 | 같은 S04 source에서 비수행으로 분리 | 실행하지 않음 |
| V210-S04 30분 soak | 기록없음 | 같은 S04 source: runtime path 변경 시에만 실행 | 실행 evidence 없음 |
| V210-S05 `verify-vlm-runtime-status-ui` | pass | tag `v2.1.0:docs/release-policy.md` aggregated S00-S12 verifier PASS, S05 code block | runtime status UI verifier |
| V210-S05 `verify-vlm-install-connection-ui` | pass | 같은 S05 source | VLM install connection UI verifier |
| V210-S05 `verify-vlm-profile-storage` | pass | 같은 S05 source | profile storage verifier |
| V210-S05 `verify-vlm-privacy-transfer-guard` | pass | 같은 S05 source | privacy guard verifier |
| V210-S05 `verify-auth-routes` | pass | 같은 S05 source | auth route verifier |
| V210-S05 `verify-ops-client-ui` | pass | 같은 S05 source | Ops/Client UI smoke. UI 풀테스트 PASS로 확대 금지 |
| V210-S05 `git diff --check` | pass | 같은 S05 source | diff whitespace verifier |
| V210-S05 `/ops/vlm` 인앱 브라우저 직접 확인 | 기록없음 | S05 source는 완료 조건을 말하지만 artifact path/ledger row 미분리 | v210 전체 UI fulltest row와 혼동 금지 |
| V210-S05 30분/120분 longrun | 기록없음 | 같은 S05 source에서 미수행으로 분리 | 실행하지 않음 |
| V210-S06 `verify-vlm-evaluation-result-workflow` | pass | tag `v2.1.0:docs/release-policy.md` aggregated S00-S12 verifier PASS, S06 code block | evaluation result workflow verifier |
| V210-S06 `verify-vlm-evaluation-harness` | pass | 같은 S06 source | evaluation harness verifier |
| V210-S06 `verify-vlm-recommendation-engine` | pass | 같은 S06 source | recommendation engine verifier |
| V210-S06 `verify-vlm-profile-storage` | pass | 같은 S06 source | profile storage verifier |
| V210-S06 `git diff --check` | pass | 같은 S06 source | diff whitespace verifier |
| V210-S06 실제 VLM runtime/cloud call/model install | 기록없음 | 같은 S06 source에서 미수행으로 분리 | 실행하지 않음 |
| V210-S07 `verify-vlm-review-action-workflow` | pass | tag `v2.1.0:docs/release-policy.md` aggregated S00-S12 verifier PASS, S07 code block | review action workflow verifier |
| V210-S07 `verify-ops-event-review-inbox` | pass | 같은 S07 source | Ops event review inbox verifier |
| V210-S07 `verify-vlm-ops-event-review-ui` | pass | 같은 S07 source | VLM Ops event review UI verifier |
| V210-S07 `verify-event-post` | pass | 같은 S07 source | Event POST verifier |
| V210-S07 `verify-ws-metadata` | pass | 같은 S07 source | WS metadata verifier |
| V210-S07 `git diff --check` | pass | 같은 S07 source | diff whitespace verifier |
| V210-S07 실제 VLM runtime/cloud call/sidecar write | 기록없음 | 같은 S07 source에서 미수행으로 분리 | 실행하지 않음 |
| V210-S08 `verify-vlm-rule-suggestion-draft-workflow` | pass | tag `v2.1.0:docs/development-backlog.md` S08 local evidence | draft workflow verifier |
| V210-S08 `verify-vlm-rule-suggestion-candidates` | pass | 같은 S08 source | rule suggestion candidate verifier |
| V210-S08 `verify-analysis-state` | pass | 같은 S08 source | analysis state verifier |
| V210-S08 `verify-ops-rules-roundtrip` | pass | 같은 S08 source | rules roundtrip verifier |
| V210-S08 `verify-rule-ui` | pass | 같은 S08 source | rule UI smoke. UI 풀테스트 PASS로 확대 금지 |
| V210-S08 `verify-va-replay` | pass | 같은 S08 source | VA replay verifier |
| V210-S08 `verify-va-events` | pass | 같은 S08 source | VA events verifier |
| V210-S08 `git diff --check` | pass | 같은 S08 source | diff whitespace verifier |
| V210-S08 장시간 soak | 기록없음 | 같은 S08 source에서 제외 | 실행하지 않음 |
| V210-S08 수동 UI 풀테스트 | 기록없음 | 같은 S08 source에서 제외 | 실행하지 않음 |
| V210-S09 `verify-va-event-coverage-report --report /tmp/media_server_v210_s09_va_coverage.md --json-report /tmp/media_server_v210_s09_va_coverage.json` | pass | tag `v2.1.0:docs/development-backlog.md` S09 local evidence | 25행 report, 예상 PASS 21 / 예상 FAIL 4 분리 |
| V210-S09 `verify-va-replay` | pass | 같은 S09 source | 14 replay baseline PASS |
| V210-S09 `verify-va-events --dispatch-records` | pass | 같은 S09 source | 33 PASS / 0 FAIL |
| V210-S09 `git diff --check` | pass | 같은 S09 source | diff whitespace verifier |
| V210-S09 제품 UI 풀테스트 | 기록없음 | 같은 S09 source에서 비대체로 분리 | 실행하지 않음 |
| V210-S09 30분/120분 longrun | 기록없음 | 같은 S09 source에서 비대체로 분리 | 실행하지 않음 |
| V210-S10 `verify-external-turn-whep-field-gate --report /tmp/media_server_external_turn_whep_field_gate.md --json-report /tmp/media_server_external_turn_whep_field_gate.json` | pass | tag `v2.1.0:docs/development-backlog.md` S10 local evidence | gate 절차 PASS. 실제 external success 아님 |
| V210-S10 `verify-webrtc-ice` | pass | 같은 S10 source | WebRTC ICE verifier |
| V210-S10 `git diff --check` | pass | 같은 S10 source | diff whitespace verifier |
| V210-S10 external TURN credential 운영 성공 | 기록없음 | 같은 S10 source: endpoint/credential 없음, fieldSmokeStatus=not-run | 실제 field smoke 미실행 |
| V210-S10 external WHEP endpoint playback 성공 | 기록없음 | 같은 S10 source: whepPlaybackStatus=not-run | 실제 field smoke 미실행 |
| V210-S11 `verify-runtime-model-bundle-rc-rehearsal --report /tmp/media_server_runtime_model_bundle_rc_rehearsal.md --json-report /tmp/media_server_runtime_model_bundle_rc_rehearsal.json` | pass | tag `v2.1.0:docs/release-policy.md` aggregated S00-S12 verifier PASS, S11 code block | RC rehearsal verifier |
| V210-S11 `verify-bundle-policy --output /tmp/media_server_bundle_policy.md --json-output /tmp/media_server_bundle_policy.json` | pass | 같은 S11 source | bundle policy verifier |
| V210-S11 `verify-release-bundle-dry-run --candidate source-only` | pass | 같은 S11 source | source-only dry-run verifier |
| V210-S11 `dependency-snapshot --stable --no-linked-libs --output /tmp/media_server_dependency_snapshot_s11.md --json-output /tmp/media_server_dependency_snapshot_s11.json` | pass | 같은 S11 source | dependency snapshot |
| V210-S11 `git diff --check` | pass | 같은 S11 source | diff whitespace verifier |
| V210-S11 실제 runtime/model bundle 생성 | 기록없음 | 같은 S11 source: actualBundleCreated=false | 실행하지 않음 |
| V210-S11 release asset upload | 기록없음 | 같은 S11 source: releaseAssetUploaded=false | 실행하지 않음 |
| V210-S12 `verify-manual-ui-evidence-runner --report /tmp/media_server_manual_ui_evidence_runner_selftest.md --json-report /tmp/media_server_manual_ui_evidence_runner_selftest.json` | pass | tag `v2.1.0:docs/release-policy.md` aggregated S00-S12 verifier PASS, S12 code block | UI evidence runner selftest |
| V210-S12 `verify-feature-inventory-coverage` | pass | 같은 S12 source | feature inventory coverage verifier |
| V210-S12 `verify-ops-client-ui --screenshots` | pass | 같은 S12 source | screenshot smoke. UI 풀테스트 PASS로 확대 금지 |
| V210-S12 `verify-rule-ui` | pass | 같은 S12 source | rule UI smoke. UI 풀테스트 PASS로 확대 금지 |
| V210-S12 `git diff --check` | pass | 같은 S12 source | diff whitespace verifier |
| V210-S12 제품 UI 풀테스트 실행 | 기록없음 | 같은 S12 source: runner 개선이며 실제 UI PASS 아님 | 실행하지 않음 |
| `v210-inapp-ui-fulltest-20260603` | pass | `docs/release-evidence-index.md` ledger | UI 풀테스트 행 |
| 안정화/build release gate | 기록없음 | Not run for `v210-inapp-ui-fulltest-20260603` | UI evidence가 안정화 gate를 대체하지 않음 |
| 30분 soak | 기록없음 | 같은 not-run 문장 | 실행하지 않음 |
| 120분 longrun | 기록없음 | 같은 not-run 문장 | 실행하지 않음 |
| `verify-va-runtime-console-longrun --duration-minutes 120` | 기록없음 | 같은 not-run 문장 | 실행하지 않음 |
| real cloud provider / credential / external TURN-WHEP | 기록없음 | 같은 not-run 문장 및 release-policy | 실행하지 않음 |
| VLM model/runtime bundle | 기록없음 | tag `v2.1.0:docs/release-policy.md` `Not Run / Unverified` | PASS 아님 |

## v2.2.0

| 항목 | 판정 | 근거 | 주의 |
| --- | --- | --- | --- |
| Preflight | pass | tag `v2.2.0:docs/release-policy.md` `## Verification` | release-policy 행 |
| Licensing and Artifact Guardrails | pass | tag `v2.2.0:docs/release-policy.md` | release-policy 행 |
| `verify-public-repo-readiness` | pass | tag `v2.2.0:docs/release-policy.md` | release-policy 행 |
| `verify-bundle-policy` | pass | tag `v2.2.0:docs/release-policy.md` | release-policy 행 |
| `verify-release-bundle-dry-run` | pass | tag `v2.2.0:docs/release-policy.md` | release-policy 행 |
| V220-S00 `verify-v220-entry-boundary` | pass | tag `v2.2.0:docs/development-backlog.md`, S00 closure evidence | entry boundary verifier |
| V220-S00 `verify-integrator-contract-artifact` | pass | 같은 S00 closure evidence | integrator contract verifier |
| V220-S00 `verify-event-post` | pass | 같은 S00 closure evidence | Event POST verifier. 최초 서버/auth 조건 보정 후 재실행 |
| V220-S00 `verify-auth-routes` | pass | 같은 S00 closure evidence | auth route verifier |
| V220-S00 `verify-webrtc-va-metadata` | pass | 같은 S00 closure evidence | WebRTC VA metadata verifier |
| V220-S00 `verify-va-metadata-sidechannel` | pass | 같은 S00 closure evidence | sidechannel metadata verifier |
| V220-S00 `verify-ws-metadata` | pass | 같은 S00 closure evidence | WS metadata verifier |
| V220-S00 `verify-docs-links` | pass | 같은 S00 closure evidence | docs link verifier |
| V220-S00 `verify-script-inventory` | pass | 같은 S00 closure evidence | script inventory verifier |
| V220-S00 `git diff --check` | pass | 같은 S00 closure evidence | diff whitespace verifier |
| V220-S00 UI 풀테스트 | 기록없음 | 같은 S00 closure evidence `미실행` | 실행하지 않음 |
| V220-S00 30분 soak | 기록없음 | 같은 S00 closure evidence `미실행` | 실행하지 않음 |
| V220-S00 120분 longrun | 기록없음 | 같은 S00 closure evidence `미실행` | 실행하지 않음 |
| V220-S00 published metadata 재검증 | 기록없음 | 같은 S00 closure evidence `미실행` | 실행하지 않음 |
| V220-S01 `verify-v220-ui-architecture-inventory` | pass | tag `v2.2.0:docs/development-backlog.md`, S01 closure evidence | UI architecture inventory verifier |
| V220-S01 `verify-ops-client-ui --browser-mode static` | pass | 같은 S01 closure evidence | static UI smoke. UI 풀테스트 PASS로 확대 금지 |
| V220-S01 `verify-docs-links` | pass | 같은 S01 closure evidence | docs link verifier |
| V220-S01 `verify-script-inventory` | pass | 같은 S01 closure evidence | script inventory verifier |
| V220-S01 `verify-code-comments` | pass | 같은 S01 closure evidence | code comment verifier |
| V220-S01 `git diff --check` | pass | 같은 S01 closure evidence | diff whitespace verifier |
| V220-S01 브라우저 UI 풀테스트 | 기록없음 | 같은 S01 closure evidence `미실행` | 실행하지 않음 |
| V220-S01 visual redesign mockup | 기록없음 | 같은 S01 closure evidence `미실행` | 실행하지 않음 |
| V220-S01 30분 soak | 기록없음 | 같은 S01 closure evidence `미실행` | 실행하지 않음 |
| V220-S01 120분 longrun | 기록없음 | 같은 S01 closure evidence `미실행` | 실행하지 않음 |
| V220-S02 `verify-v220-responsive-task-shell` | pass | tag `v2.2.0:docs/development-backlog.md`, S02 closure evidence | responsive task shell verifier |
| V220-S02 `verify-ops-client-ui --browser-mode static` | pass | 같은 S02 closure evidence | static UI smoke. UI 풀테스트 PASS로 확대 금지 |
| V220-S02 `verify-docs-links` | pass | 같은 S02 closure evidence | docs link verifier |
| V220-S02 `verify-script-inventory` | pass | 같은 S02 closure evidence | script inventory verifier |
| V220-S02 `git diff --check` | pass | 같은 S02 closure evidence | diff whitespace verifier |
| V220-S02 screenshot evidence | 기록없음 | 같은 S02 closure evidence `미실행` | 실행하지 않음 |
| V220-S02 브라우저 UI 풀테스트 | 기록없음 | 같은 S02 closure evidence `미실행` | 실행하지 않음 |
| V220-S02 visual redesign mockup | 기록없음 | 같은 S02 closure evidence `미실행` | 실행하지 않음 |
| V220-S02 30분 soak | 기록없음 | 같은 S02 closure evidence `미실행` | 실행하지 않음 |
| V220-S02 120분 longrun | 기록없음 | 같은 S02 closure evidence `미실행` | 실행하지 않음 |
| V220-S03 `./server.sh build` | pass | tag `v2.2.0:docs/development-backlog.md`, S03 closure evidence | build |
| V220-S03 `verify-v220-design-token-refresh` | pass | 같은 S03 closure evidence | design token verifier |
| V220-S03 `verify-product-ui-token-drift` | pass | 같은 S03 closure evidence | UI token drift verifier |
| V220-S03 `verify-ops-client-ui --browser-mode static` | pass | 같은 S03 closure evidence | static UI smoke |
| V220-S03 `verify-ops-client-ui --screenshots` | pass | 같은 S03 closure evidence | screenshot smoke. UI 풀테스트 PASS로 확대 금지 |
| V220-S03 `verify-rule-ui` | pass | 같은 S03 closure evidence | rule UI verifier |
| V220-S03 `verify-auth-bootstrap` | pass | 같은 S03 closure evidence | auth bootstrap verifier |
| V220-S03 `verify-auth-users` | pass | 같은 S03 closure evidence | auth users verifier |
| V220-S03 `verify-auth-routes` | pass | 같은 S03 closure evidence | auth routes verifier |
| V220-S03 `verify-docs-links` | pass | 같은 S03 closure evidence | docs link verifier |
| V220-S03 `verify-docs-ui-assets` | pass | 같은 S03 closure evidence | docs UI asset verifier |
| V220-S03 `verify-script-inventory` | pass | 같은 S03 closure evidence | script inventory verifier |
| V220-S03 `verify-code-comments` | pass | 같은 S03 closure evidence | code comment verifier |
| V220-S03 `verify-release-metadata` | pass | 같은 S03 closure evidence | local release metadata verifier |
| V220-S03 `git diff --check` | pass | 같은 S03 closure evidence | diff whitespace verifier |
| V220-S03 브라우저 UI 풀테스트 | 기록없음 | 같은 S03 closure evidence `미실행` | 실행하지 않음 |
| V220-S03 visual redesign mockup | 기록없음 | 같은 S03 closure evidence `미실행` | 실행하지 않음 |
| V220-S03 30분 soak | 기록없음 | 같은 S03 closure evidence `미실행` | 실행하지 않음 |
| V220-S03 120분 longrun | 기록없음 | 같은 S03 closure evidence `미실행` | 실행하지 않음 |
| V220-S03 published metadata 재검증 | 기록없음 | 같은 S03 closure evidence `미실행` | 실행하지 않음 |
| V220-S04 `./server.sh build` | pass | tag `v2.2.0:docs/development-backlog.md`, S04 closure evidence | build |
| V220-S04 `verify-v220-component-primitives` | pass | 같은 S04 closure evidence | component primitives verifier |
| V220-S04 `verify-v220-design-token-refresh` | pass | 같은 S04 closure evidence | design token verifier |
| V220-S04 `verify-product-ui-token-drift` | pass | 같은 S04 closure evidence | UI token drift verifier |
| V220-S04 `verify-ops-tables-layout` | pass | 같은 S04 closure evidence | ops tables layout verifier |
| V220-S04 `verify-ops-client-ui --screenshots` | pass | 같은 S04 closure evidence | screenshot smoke. UI 풀테스트 PASS로 확대 금지 |
| V220-S04 `verify-rule-ui` | pass | 같은 S04 closure evidence | rule UI verifier |
| V220-S04 `verify-auth-bootstrap` | pass | 같은 S04 closure evidence | auth bootstrap verifier |
| V220-S04 `verify-auth-users` | pass | 같은 S04 closure evidence | auth users verifier |
| V220-S04 `verify-auth-routes` | pass | 같은 S04 closure evidence | auth routes verifier |
| V220-S04 `verify-docs-links` | pass | 같은 S04 closure evidence | docs link verifier |
| V220-S04 `verify-docs-ui-assets` | pass | 같은 S04 closure evidence | docs UI asset verifier |
| V220-S04 `verify-script-inventory` | pass | 같은 S04 closure evidence | script inventory verifier |
| V220-S04 `verify-code-comments` | pass | 같은 S04 closure evidence | code comment verifier |
| V220-S04 `verify-release-metadata` | pass | 같은 S04 closure evidence | local release metadata verifier |
| V220-S04 `git diff --check` | pass | 같은 S04 closure evidence | diff whitespace verifier |
| V220-S04 브라우저 UI 풀테스트 | 기록없음 | 같은 S04 closure evidence `미실행` | 실행하지 않음 |
| V220-S04 visual redesign mockup | 기록없음 | 같은 S04 closure evidence `미실행` | 실행하지 않음 |
| V220-S04 30분 soak | 기록없음 | 같은 S04 closure evidence `미실행` | 실행하지 않음 |
| V220-S04 120분 longrun | 기록없음 | 같은 S04 closure evidence `미실행` | 실행하지 않음 |
| V220-S04 published metadata 재검증 | 기록없음 | 같은 S04 closure evidence `미실행` | 실행하지 않음 |
| V220-S05 `./server.sh build` | pass | tag `v2.2.0:docs/development-backlog.md`, S05 closure evidence | build |
| V220-S05 `verify-v220-ops-workspace-redesign` | pass | 같은 S05 closure evidence | Ops workspace verifier |
| V220-S05 `verify-v220-component-primitives` | pass | 같은 S05 closure evidence | component primitives verifier |
| V220-S05 `verify-product-ui-token-drift` | pass | 같은 S05 closure evidence | UI token drift verifier |
| V220-S05 `verify-ops-click-e2e` | pass | 같은 S05 closure evidence | click E2E. Chrome/server/RTSP 조건 보정 후 재실행 |
| V220-S05 `verify-ops-client-ui` | pass | 같은 S05 closure evidence | ops/client UI verifier |
| V220-S05 `verify-ops-client-ui --screenshots` | pass | 같은 S05 closure evidence | screenshot smoke. UI 풀테스트 PASS로 확대 금지 |
| V220-S05 `verify-rule-ui` | pass | 같은 S05 closure evidence | rule UI verifier |
| V220-S05 `verify-auth-bootstrap` | pass | 같은 S05 closure evidence | auth bootstrap verifier |
| V220-S05 `verify-auth-users` | pass | 같은 S05 closure evidence | auth users verifier |
| V220-S05 `verify-auth-routes` | pass | 같은 S05 closure evidence | auth routes verifier |
| V220-S05 `verify-docs-links` | pass | 같은 S05 closure evidence | docs link verifier |
| V220-S05 `verify-docs-ui-assets` | pass | 같은 S05 closure evidence | docs UI asset verifier |
| V220-S05 `verify-script-inventory` | pass | 같은 S05 closure evidence | script inventory verifier |
| V220-S05 `verify-code-comments` | pass | 같은 S05 closure evidence | code comment verifier |
| V220-S05 `verify-release-metadata` | pass | 같은 S05 closure evidence | local release metadata verifier |
| V220-S05 `git diff --check` | pass | 같은 S05 closure evidence | diff whitespace verifier |
| V220-S05 브라우저 UI 풀테스트 | 기록없음 | 같은 S05 closure evidence `미실행` | 실행하지 않음 |
| V220-S05 30분 soak | 기록없음 | 같은 S05 closure evidence `미실행` | 실행하지 않음 |
| V220-S05 120분 longrun | 기록없음 | 같은 S05 closure evidence `미실행` | 실행하지 않음 |
| V220-S05 published metadata 재검증 | 기록없음 | 같은 S05 closure evidence `미실행` | 실행하지 않음 |
| V220-S06 `./server.sh build` | pass | tag `v2.2.0:docs/development-backlog.md`, S06 closure evidence | build |
| V220-S06 `verify-v220-rules-workspace-redesign` | pass | 같은 S06 closure evidence | rules workspace verifier |
| V220-S06 `verify-rule-ui` | pass | 같은 S06 closure evidence | rule UI verifier |
| V220-S06 `verify-ops-rules-roundtrip` | pass | 같은 S06 closure evidence | rules roundtrip verifier |
| V220-S06 `verify-ops-rule-conflict-ui` | pass | 같은 S06 closure evidence | rule conflict UI verifier |
| V220-S06 `verify-ops-rule-validation-matrix` | pass | 같은 S06 closure evidence | rule validation matrix verifier |
| V220-S06 `verify-ops-client-ui` | pass | 같은 S06 closure evidence | ops/client UI verifier |
| V220-S06 `verify-ops-client-ui --screenshots` | pass | 같은 S06 closure evidence | screenshot smoke. UI 풀테스트 PASS로 확대 금지 |
| V220-S06 `verify-auth-bootstrap` | pass | 같은 S06 closure evidence | auth bootstrap verifier |
| V220-S06 `verify-auth-users` | pass | 같은 S06 closure evidence | auth users verifier |
| V220-S06 `verify-auth-routes` | pass | 같은 S06 closure evidence | auth routes verifier |
| V220-S06 `verify-v220-component-primitives` | pass | 같은 S06 closure evidence | component primitives verifier |
| V220-S06 `verify-v220-ops-workspace-redesign` | pass | 같은 S06 closure evidence | Ops workspace verifier |
| V220-S06 `verify-product-ui-token-drift` | pass | 같은 S06 closure evidence | UI token drift verifier |
| V220-S06 `verify-docs-links` | pass | 같은 S06 closure evidence | docs link verifier |
| V220-S06 `verify-docs-ui-assets` | pass | 같은 S06 closure evidence | docs UI asset verifier |
| V220-S06 `verify-script-inventory` | pass | 같은 S06 closure evidence | script inventory verifier |
| V220-S06 `verify-feature-inventory-coverage` | pass | 같은 S06 closure evidence | feature inventory coverage verifier |
| V220-S06 `verify-code-comments` | pass | 같은 S06 closure evidence | code comment verifier |
| V220-S06 `verify-release-metadata` | pass | 같은 S06 closure evidence | local release metadata verifier |
| V220-S06 `git diff --check` | pass | 같은 S06 closure evidence | diff whitespace verifier |
| V220-S06 브라우저 UI 풀테스트 | 기록없음 | 같은 S06 closure evidence `미실행` | 실행하지 않음 |
| V220-S06 30분 soak | 기록없음 | 같은 S06 closure evidence `미실행` | 실행하지 않음 |
| V220-S06 120분 longrun | 기록없음 | 같은 S06 closure evidence `미실행` | 실행하지 않음 |
| V220-S06 published metadata 재검증 | 기록없음 | 같은 S06 closure evidence `미실행` | 실행하지 않음 |
| V220-S07 `./server.sh build` | pass | tag `v2.2.0:docs/development-backlog.md`, S07 closure evidence | build |
| V220-S07 `verify-v220-client-live-redesign` | pass | 같은 S07 closure evidence | client live redesign verifier |
| V220-S07 `verify-ops-route-boundaries` | pass | 같은 S07 closure evidence | ops route boundary verifier |
| V220-S07 `verify-ops-client-ui --browser-mode static` | pass | 같은 S07 closure evidence | static UI smoke |
| V220-S07 `verify-ops-client-ui --screenshots` | pass | 같은 S07 closure evidence | screenshot smoke. UI 풀테스트 PASS로 확대 금지 |
| V220-S07 `verify-rule-ui` | pass | 같은 S07 closure evidence | rule UI verifier |
| V220-S07 `verify-ops-rules-roundtrip` | pass | 같은 S07 closure evidence | rules roundtrip verifier |
| V220-S07 `verify-auth-bootstrap` | pass | 같은 S07 closure evidence | auth bootstrap verifier |
| V220-S07 `verify-auth-users` | pass | 같은 S07 closure evidence | auth users verifier |
| V220-S07 `verify-auth-routes` | pass | 같은 S07 closure evidence | auth routes verifier |
| V220-S07 `verify-v220-component-primitives` | pass | 같은 S07 closure evidence | component primitives verifier |
| V220-S07 `verify-v220-ops-workspace-redesign` | pass | 같은 S07 closure evidence | Ops workspace verifier |
| V220-S07 `verify-v220-rules-workspace-redesign` | pass | 같은 S07 closure evidence | rules workspace verifier |
| V220-S07 `verify-product-ui-token-drift` | pass | 같은 S07 closure evidence | UI token drift verifier |
| V220-S07 `verify-client-live-workspace` | pass | 같은 S07 closure evidence | client live workspace verifier |
| V220-S07 `verify-client-source-dock-events` | pass | 같은 S07 closure evidence | client source dock verifier |
| V220-S07 `verify-client-dashboard-polish` | pass | 같은 S07 closure evidence | client dashboard polish verifier |
| V220-S07 `verify-client-tile-info-overlay-health` | pass | 같은 S07 closure evidence | client tile info/overlay verifier |
| V220-S07 `verify-client-saved-views-layout-presets` | pass | 같은 S07 closure evidence | client saved views/layout presets verifier |
| V220-S07 `verify-docs-links` | pass | 같은 S07 closure evidence | docs link verifier |
| V220-S07 `verify-docs-ui-assets` | pass | 같은 S07 closure evidence | docs UI asset verifier |
| V220-S07 `verify-script-inventory` | pass | 같은 S07 closure evidence | script inventory verifier |
| V220-S07 `verify-feature-inventory-coverage` | pass | 같은 S07 closure evidence | feature inventory coverage verifier |
| V220-S07 `verify-code-comments` | pass | 같은 S07 closure evidence | code comment verifier |
| V220-S07 `verify-release-metadata` | pass | 같은 S07 closure evidence | local release metadata verifier |
| V220-S07 `git diff --check` | pass | 같은 S07 closure evidence | diff whitespace verifier |
| V220-S07 브라우저 UI 풀테스트 | 기록없음 | 같은 S07 closure evidence `미실행` | 실행하지 않음 |
| V220-S07 30분 soak | 기록없음 | 같은 S07 closure evidence `미실행` | 실행하지 않음 |
| V220-S07 120분 longrun | 기록없음 | 같은 S07 closure evidence `미실행` | 실행하지 않음 |
| V220-S07 published metadata 재검증 | 기록없음 | 같은 S07 closure evidence `미실행` | 실행하지 않음 |
| V220-S08 `./server.sh build` | pass | tag `v2.2.0:docs/development-backlog.md`, S08 closure evidence | build |
| V220-S08 `verify-v220-auth-setup-redesign` | pass | 같은 S08 closure evidence | auth/setup redesign verifier |
| V220-S08 `verify-v220-component-primitives` | pass | 같은 S08 closure evidence | component primitives verifier |
| V220-S08 `verify-product-ui-token-drift` | pass | 같은 S08 closure evidence | UI token drift verifier |
| V220-S08 `verify-docs-links` | pass | 같은 S08 closure evidence | docs link verifier |
| V220-S08 `verify-docs-ui-assets` | pass | 같은 S08 closure evidence | docs UI asset verifier |
| V220-S08 `verify-script-inventory` | pass | 같은 S08 closure evidence | script inventory verifier |
| V220-S08 `verify-feature-inventory-coverage` | pass | 같은 S08 closure evidence | feature inventory coverage verifier |
| V220-S08 `verify-auth-bootstrap` | pass | 같은 S08 closure evidence | auth bootstrap verifier |
| V220-S08 `verify-auth-users` | pass | 같은 S08 closure evidence | auth users verifier |
| V220-S08 `verify-auth-routes` | pass | 같은 S08 closure evidence | auth routes verifier |
| V220-S08 `verify-ops-route-boundaries --http-base http://127.0.0.1:8081` | pass | 같은 S08 closure evidence | route boundary verifier |
| V220-S08 `verify-ops-client-ui --browser-mode static --http-base http://127.0.0.1:8081` | pass | 같은 S08 closure evidence | static UI smoke |
| V220-S08 `verify-ops-client-ui --screenshots --browser-mode chrome --allow-chrome-fallback --http-base http://127.0.0.1:8081` | pass | 같은 S08 closure evidence | screenshot smoke. UI 풀테스트 PASS로 확대 금지 |
| V220-S08 `verify-rule-ui` | pass | 같은 S08 closure evidence | rule UI verifier |
| V220-S08 `verify-ops-rules-roundtrip` | pass | 같은 S08 closure evidence | rules roundtrip verifier |
| V220-S08 `node --check scripts/internal/verify_auth_scope_picker.mjs` | pass | 같은 S08 closure evidence | Node syntax check |
| V220-S08 브라우저 UI 풀테스트 | 기록없음 | 같은 S08 closure evidence `미실행` | 실행하지 않음 |
| V220-S08 30분 soak | 기록없음 | 같은 S08 closure evidence `미실행` | 실행하지 않음 |
| V220-S08 120분 longrun | 기록없음 | 같은 S08 closure evidence `미실행` | 실행하지 않음 |
| V220-S08 published metadata 재검증 | 기록없음 | 같은 S08 closure evidence `미실행` | 실행하지 않음 |
| `v220-inapp-ui-fulltest-20260604` | pass | `docs/release-evidence-index.md` ledger | F02~F06 UI 직접 검수 evidence |
| 30분 soak | 기록없음 | Not run for `v220-inapp-ui-fulltest-20260604` | 실행하지 않음 |
| 120분 longrun | 기록없음 | 같은 not-run 문장 | 실행하지 않음 |
| `verify-va-runtime-console-longrun --duration-minutes 120` | 기록없음 | 같은 not-run 문장 | 실행하지 않음 |
| real cloud provider / credential / real ONVIF / external WHEP-WHIP-TURN | 기록없음 | 같은 not-run 문장 | 실행하지 않음 |
| full 12-key VA EventRecord occurrence matrix | 기록없음 | 같은 not-run 문장 | 실행하지 않음 |
| legacy 244 UI-target full inventory result gate | 기록없음 | 같은 not-run 문장 | 실행하지 않음 |

## v2.3.0

| 항목 | 판정 | 근거 | 주의 |
| --- | --- | --- | --- |
| Preflight | pass | tag `v2.3.0:docs/release-policy.md` `## Verification` | release-policy 행 |
| Licensing and Artifact Guardrails | pass | tag `v2.3.0:docs/release-policy.md` | release-policy 행 |
| `verify-public-repo-readiness` | pass | tag `v2.3.0:docs/release-policy.md` | release-policy 행 |
| `verify-bundle-policy` | pass | tag `v2.3.0:docs/release-policy.md` | release-policy 행 |
| `verify-release-bundle-dry-run` | pass | tag `v2.3.0:docs/release-policy.md` | release-policy 행 |
| V230-S00 `./server.sh build` | pass | tag `v2.3.0:docs/development-backlog.md`, S00 종료 기준 PASS lines | entry baseline command |
| V230-S00 `verify-v230-entry-baseline` | pass | 같은 S00 source | entry baseline verifier |
| V230-S00 `verify-release-metadata` | pass | 같은 S00 source | local metadata verifier |
| V230-S00 `verify-release-evidence-index` | pass | 같은 S00 source | evidence index verifier |
| V230-S00 `verify-integrator-contract-artifact` | pass | 같은 S00 source | contract artifact verifier |
| V230-S00 `verify-event-post --mode schema --http-base http://127.0.0.1:8082` | pass | 같은 S00 source | Event POST schema verifier |
| V230-S00 `verify-auth-routes` | pass | 같은 S00 source | auth route verifier |
| V230-S00 `verify-webrtc-va-metadata --http-base http://127.0.0.1:8082` | pass | 같은 S00 source | WebRTC metadata verifier |
| V230-S00 `verify-va-metadata-sidechannel --http-base http://127.0.0.1:8082` | pass | 같은 S00 source | sidechannel verifier |
| V230-S00 `verify-ws-metadata --http-base http://127.0.0.1:8082` | pass | 같은 S00 source | WS metadata verifier |
| V230-S00 `verify-docs-links` | pass | 같은 S00 source | docs verifier |
| V230-S00 `verify-script-inventory` | pass | 같은 S00 source | script inventory verifier |
| V230-S00 `git diff --check` | pass | 같은 S00 source | diff whitespace verifier |
| `v230-s01-eventrecord-matrix-20260605` | pass | `docs/release-evidence-index.md` ledger | S01 exact matrix UI/evidence row |
| `v230-s02-four-test-evidence-consistency-20260605` | pass | 같은 ledger | S02 안정화/evidence 정합성 gate |
| `v230-s03-ui-renderer-module-decomposition-20260605` | pass | 같은 ledger | S03 안정화 gate. 최초 build/UI smoke FAIL 후 보정 PASS |
| `v230-s04-conditional-field-evidence-20260605` | pass | 같은 ledger | 조건부 field evidence gate. 실제 field 성공 아님 |
| `v230-s05-vlm-opt-in-operational-evidence-20260605` | pass | 같은 ledger | VLM opt-in gate. real provider/model bundle 아님 |
| `v230-s06-ops-backup-recovery-lifecycle-20260605` | pass | 같은 ledger | dry-run lifecycle gate. 실제 운영 백업/복구 아님 |
| `v230-s07-integrator-contract-conformance-20260605` | pass | 같은 ledger | S07 안정화 gate. `verify-ops-client-ui` failure는 PASS evidence에서 제외됨 |
| S02~S07 UI 풀테스트 직접 조작 | 기록없음 | 각 v230 not-run 문장 | S01 matrix UI만 해당 범위 PASS |
| 30분 soak | 기록없음 | 각 v230 not-run 문장 | 실행하지 않음 |
| 120분 longrun | 기록없음 | 각 v230 not-run 문장 | 실행하지 않음 |
| `verify-va-runtime-console-longrun --duration-minutes 120` | 기록없음 | 각 v230 not-run 문장 | 실행하지 않음 |
| real ONVIF / external WHEP-WHIP-TURN / real cloud provider | 기록없음 | 각 v230 not-run 문장 및 release-policy | 실행하지 않음 |

## v2.4.0

| 항목 | 판정 | 근거 | 주의 |
| --- | --- | --- | --- |
| Preflight | pass | tag `v2.4.0:docs/release-policy.md` `## Verification` | release-policy 행 |
| Licensing and Artifact Guardrails | pass | tag `v2.4.0:docs/release-policy.md` | release-policy 행 |
| `verify-public-repo-readiness` | pass | tag `v2.4.0:docs/release-policy.md` | release-policy 행 |
| `verify-bundle-policy` | pass | tag `v2.4.0:docs/release-policy.md` | release-policy 행 |
| `verify-release-bundle-dry-run` | pass | tag `v2.4.0:docs/release-policy.md` | release-policy 행 |
| V240-S00 roadmap review | 기록없음 | tag `v2.4.0:docs/development-backlog.md` table | 로드맵 예상 검토 항목. S00 종료 기준 PASS lines 미확인 |
| V240-S00 `verify-release-metadata` | 기록없음 | 같은 V240-S00 table | 로드맵 예상 검증. S00 종료 기준 PASS lines 미확인 |
| V240-S00 `verify-docs-links` | 기록없음 | 같은 V240-S00 table | 로드맵 예상 검증. S00 종료 기준 PASS lines 미확인 |
| V240-S00 `verify-release-evidence-index` | 기록없음 | 같은 V240-S00 table | 로드맵 예상 검증. S00 종료 기준 PASS lines 미확인 |
| V240-S00 `git diff --check` | 기록없음 | 같은 V240-S00 table | 로드맵 예상 검증. S00 종료 기준 PASS lines 미확인 |
| V240-S01 `verify-ops-event-review-inbox` | pass | tag `v2.4.0:docs/development-backlog.md` S01 실행 결과 | Operator Event Review Inbox verifier |
| V240-S01 `verify-ops-event-review-inbox --roundtrip-smoke --browser-smoke --http-base http://127.0.0.1:8081 --debug-port 9941` | pass | 같은 S01 source | browser smoke/roundtrip smoke |
| V240-S01 `verify-vlm-ops-event-review-ui` | pass | 같은 S01 source | VLM Ops event review UI verifier |
| V240-S01 Codex in-app `/ops/events` direct check | pass | 같은 S01 source, `/tmp/media_server_v240_s01_inapp_evidence.json` | route/control/action 직접 확인 |
| V240-S01 `verify-manual-ui-evidence` | pass | 같은 S01 source | manual UI evidence structure verifier |
| V240-S01 `verify-feature-inventory-coverage` | pass | 같은 S01 source | feature inventory coverage verifier |
| V240-S01 `verify-project-inventory` | pass | 같은 S01 source | project inventory verifier |
| V240-S01 `git diff --check` | pass | 같은 S01 source | diff whitespace verifier |
| V240-S01 30분/120분/전체 UI 풀테스트 | 기록없음 | 같은 S01 source `미실행` | 실행하지 않음 |
| V240-S02 `verify-ops-event-action-incident-workflow` | pass | tag `v2.4.0:docs/development-backlog.md` S02 선행 실행 결과 | incident/action workflow script gate |
| V240-S02 `verify-ops-audit-trail` | pass | 같은 S02 source | audit trail verifier |
| V240-S02 `verify-ops-audit-persistence` | pass | 같은 S02 source | audit persistence verifier |
| V240-S02 단계 완료 | 기록없음 | 같은 S02 source: table status `진행`, UI 풀테스트 evidence 없음 | 스크립트 PASS를 완료로 승격하지 않음 |
| V240-S02 `/ops/events` incident/action UI 직접 조작 | 기록없음 | 같은 S02 source `미실행` | 실행하지 않음 |
| V240-S02 30분/120분/전체 UI 풀테스트 | 기록없음 | 같은 S02 source `미실행` | 실행하지 않음 |
| V240-S03 `verify-ops-alert-delivery-integrations` 최초 실행 | fail | tag `v2.4.0:docs/development-backlog.md` S03 선행 실행 결과 | route owner split 반영 전 missing snippet |
| V240-S03 `verify-ops-alert-delivery-integrations` 재실행 | pass | 같은 S03 source | verifier가 `ops_event_route_owner.cpp`를 읽도록 보정 후 PASS |
| V240-S03 `git diff --check` | pass | 같은 S03 source | diff whitespace verifier |
| V240-S03 단계 완료 | 기록없음 | 같은 S03 source: table status `진행`, UI 풀테스트 evidence 없음 | verifier PASS를 완료로 승격하지 않음 |
| V240-S03 alert delivery UI 직접 조작/roundtrip smoke | 기록없음 | 같은 S03 source `미실행` | 실행하지 않음 |
| V240-S03 30분/120분/전체 UI 풀테스트 | 기록없음 | 같은 S03 source `미실행` | 실행하지 않음 |
| V240-S04 `./server.sh build` | pass | tag `v2.4.0:docs/development-backlog.md` S04 실행 결과 | build |
| V240-S04 `verify-client-dashboard-polish` | pass | 같은 S04 source | client dashboard polish verifier |
| V240-S04 `verify-v220-client-preview-redaction-review` | pass | 같은 S04 source | client preview/redaction verifier |
| V240-S04 `verify-auth-bootstrap` | pass | 같은 S04 source | auth bootstrap verifier |
| V240-S04 `verify-auth-users` | pass | 같은 S04 source | auth users verifier |
| V240-S04 `verify-auth-routes` | pass | 같은 S04 source | 최초 sandbox bind 제한 후 sandbox 밖 재실행 PASS |
| V240-S04 `verify-ops-client-ui --http-base http://127.0.0.1:8081 --in-app-evidence /tmp/media_server_s04_inapp_evidence/s04-ops-client-ui-evidence.json` | pass | 같은 S04 source | Ops/Client UI verifier with evidence |
| V240-S04 `verify-ops-client-ui --screenshots --http-base http://127.0.0.1:8081 --in-app-evidence /tmp/media_server_s04_inapp_evidence/s04-ops-client-ui-evidence.json` | pass | 같은 S04 source | screenshot smoke with evidence |
| V240-S04 `verify-rule-ui --in-app-evidence /tmp/media_server_s04_inapp_evidence/s04-ops-client-ui-evidence.json` | pass | 같은 S04 source | rule UI verifier |
| V240-S04 Codex in-app `/client/dashboard`, `/client/live`, `/client/events` direct check | pass | 같은 S04 source, `/tmp/media_server_s04_inapp_evidence/s04-ops-client-ui-evidence.json` | client forbidden text count 0 포함 |
| V240-S04 30분/120분/전체 UI 풀테스트 | 기록없음 | 같은 S04 source `미실행` | 실행하지 않음 |
| V240-S05 `./server.sh build` | pass | tag `v2.4.0:docs/development-backlog.md` S05 실행 결과 | build |
| V240-S05 `verify-rule-ui --in-app-evidence /tmp/media_server_s05_inapp_evidence/s05-rule-review-loop-evidence.json` | pass | 같은 S05 source | rule UI verifier with evidence |
| V240-S05 `verify-ops-rules-roundtrip --http-base http://127.0.0.1:8081` | pass | 같은 S05 source | 최초 sandbox EPERM 후 sandbox 밖 재실행 PASS |
| V240-S05 `verify-ops-rule-validation-matrix` | pass | 같은 S05 source | rule validation matrix verifier |
| V240-S05 `verify-va-event-coverage-report` | pass | 같은 S05 source | VA event coverage verifier |
| V240-S05 `verify-feature-inventory-coverage` | pass | 같은 S05 source | inventory row count 398 갱신 포함 |
| V240-S05 `git diff --check` | pass | 같은 S05 source | diff whitespace verifier |
| V240-S05 Codex in-app `/ops/rules`, `/ops/users`, `/ops/sources` direct check | pass | 같은 S05 source, `/tmp/media_server_s05_inapp_evidence/s05-rule-review-loop-evidence.json` | review loop/screenshot evidence |
| V240-S05 30분/120분/전체 UI 풀테스트 | 기록없음 | 같은 S05 source `미실행` | 실행하지 않음 |
| V240-S06 `verify-v240-ops-event-route-owner-decomposition` | pass | tag `v2.4.0:docs/development-backlog.md` S06 실행 결과 | route owner decomposition verifier |
| V240-S06 `./server.sh build` | pass | 같은 S06 source | build |
| V240-S06 `verify-v230-ui-renderer-module-decomposition` | pass | 같은 S06 source | UI renderer decomposition verifier |
| V240-S06 `verify-ops-client-ui --browser-mode static --http-base http://127.0.0.1:8081` | pass | 같은 S06 source | auth-off server에서 static route smoke PASS. UI 풀테스트 아님 |
| V240-S06 `verify-ops-route-boundaries --http-base http://127.0.0.1:8081` | pass | 같은 S06 source | route boundary verifier |
| V240-S06 `git diff --check` | pass | 같은 S06 source | diff whitespace verifier |
| V240-S06 UI 풀테스트 직접 조작/screenshots smoke | 기록없음 | 같은 S06 source `미실행` | 실행하지 않음 |
| V240-S06 30분/120분 | 기록없음 | 같은 S06 source `미실행` | 실행하지 않음 |
| `v240-s07-evidence-inventory-mapping-20260610` | pass | `docs/release-evidence-index.md` ledger | S07 안정화/evidence mapping |
| `v240-s08-release-readiness-gate-20260610` | pass | 같은 ledger | local release readiness gate. publish/UI/30/120 대체 아님 |
| `v240-release-30min-20260611` | pass | 같은 ledger | 30분 soak |
| `v240-release-ui-fulltest-20260611` | pass | 같은 ledger | UI 풀테스트 |
| `v240-release-120min-20260611` | pass | 같은 ledger | 120분 predev + runtime-console longrun |
| External TURN hard gate | 기록없음 | Not run for `v240-release-30min-20260611` / `v240-release-120min-20260611` | 요청하지 않아 skip |
| real ONVIF / external WHEP-WHIP-TURN / real cloud provider | 기록없음 | v240 not-run 문장 및 release-policy | 실행하지 않음 |
| 실제 외부 alert delivery | 기록없음 | Not run for `v240-release-ui-fulltest-20260611` | UI fulltest에서 dry-run/attempt log와 분리 |
| PR merge / main sync / tag / GitHub Release / published metadata / next branch | 기록없음 | v240 release not-run 문장 | 실행하지 않음 |

## 1차 모순/오보고 후보

- v1.3.0~v1.9.0: roadmap 예상 verifier 항목은 개별 행으로 분해했지만, 다수는 실행 output/report/count가 아니라 계획/기준 문장만 확인된다. 따라서 release-policy 기본 PASS로 이 항목들을 통과 처리하면 안 된다.
- v1.3.0~v1.7.0: tag-local backlog 상세 섹션을 확인한 결과 다수 항목은 `검증 기준`, `확인됨`, `완료 기준` 설명 중심이다. 명령 출력, report path, fail/pass count가 직접 붙은 행이 아니면 기능 또는 테스트 PASS evidence로 승격하지 않는다.
- v1.9.0: v1.9 전용 안정화/30분/UI/120분 ledger row는 현재 evidence index에서 확인하지 못했다. v1.8 rows를 v1.9 PASS로 재사용하면 안 된다.
- v2.1.0: UI 풀테스트 PASS 행은 있으나 안정화/build release gate, 30분, 120분은 not-run으로 분리되어 있다.
- v2.2.0: F02~F06 UI 직접 검수 PASS 행은 있으나 30분/120분, full 12-key VA occurrence matrix는 not-run이다.
- v2.4.0: tag-local backlog 표에서 V240-S02와 V240-S03 상태가 `진행`이고, 각 section도 UI 풀테스트 evidence가 없어 완료 승격하지 않는다고 적는다. 이후 release 30분/UI/120분 PASS가 있더라도 S02/S03 단계 완료 evidence로 자동 변환하면 안 된다.

## 재감사 결론

- 위 표는 현재 확인 가능한 릴리즈 태그 `v1.0.0`~`v2.4.0`의 태그별 release-policy,
  history, development-backlog, 현재 release-evidence-index를 기준으로 작성했다.
- `pass`는 해당 항목 자체의 실행 PASS/통과/0 fail 기록이 있는 경우에만 사용했다.
- `fail`은 동일 항목에 실패 기록이 명시된 경우에만 사용했다.
- `기록없음`은 미실행, 미확인, 보류, Not Run / Unverified, 또는 로드맵 예상 항목만
  있고 실행 evidence가 확인되지 않은 경우로 분리했다.
- release-policy aggregate PASS, verifier 존재, roadmap 표기는 기능 동작 또는
  UI 풀테스트/30분/120분 PASS로 승격하지 않았다.
