# v2.2.0 In-App UI Fulltest Result

## 검수 메타데이터

- run id: v220-inapp-ui-fulltest-20260604
- 검수자: Codex in-app browser primary evidence + verifier support
- 날짜/시간: 2026-06-04 23:47 KST
- 브랜치/커밋: `v2.2.0`; commit은 이 문서 작성 시점에 아직 생성 전
- 서버 URL: `http://127.0.0.1:18197`
- auth mode: `auto`
- users/source/view/analysis fixture: throwaway files under `/tmp/media_server_v220_ui_registry` and one-shot copies under `/tmp/media_server_v220_ui_fulltest_one_shot_final`
- 데이터 리셋 방법: throwaway users/source/view/analysis/event/snapshot/clip paths, `prepare-manual-ui-fulltest-seed --dry-run`, auth setup from `/setup`
- 브라우저: Codex 인앱 브라우저
- 브라우저 선택: Codex 세션 기준 인앱 브라우저 evidence primary. Chrome fallback 사용 안 함
- viewport: 320, 390, 760, 1180
- theme: light/dark toggle 직접 확인
- evidence index: `/tmp/media_server_v220_inapp_evidence/v220-inapp-evidence.json`
- 문서 파악 범위: `AGENTS.md`, `manual-ui-fulltest.md`, `manual-ui-checklist.md`, `manual-ui-result-template.md`, `project-feature-test-inventory.md`, `v220-ui-evidence-closeout.md`, `development-backlog.md`
- feature inventory revision: v2.2.0 F02~F06 follow-up mapping 기준. inventory 자체는 실행 evidence가 아님
- token usage source: Codex goal usage snapshot
- token start: 108,429
- token end: 508,127
- token consumed: 399,698
- elapsed: 1,967s at close-out verification snapshot

## 테스트 영역별 판정

| 영역 | 실행 범위 | evidence | 기록 |
| --- | --- | --- | --- |
| 안정화 테스트 | build, auth, docs/static guard, one-shot UI helper, in-app evidence verifier support | `/tmp/media_server_v220_ui_fulltest_one_shot_final/summary.md` | PASS. 이 범위는 UI 직접 조작을 보조하지만 30분/120분을 대체하지 않음 |
| 30분 테스트 | `verify-predev --soak-minutes 30` | 없음 | 미실행. 사용자 명시 요청 없음 |
| 120분 테스트 | `verify-predev --soak-minutes 120`, `verify-va-runtime-console-longrun --duration-minutes 120` | 없음 | 미실행. 사용자 명시 요청 없음 |
| UI 풀테스트 | v2.2.0 F02~F06 route/control/action, auth/role guard, responsive/theme, VLM/client redaction, EventRecord presence occurrence | `/tmp/media_server_v220_inapp_evidence/v220-inapp-evidence.json` | PASS for V220-F02~F06 직접 조작 범위 |

## 네 단계 시작 조건 / 재시작 경계

| 항목 | 기대 상태 | 실제 상태 | 판정 | 후속 |
| --- | --- | --- | --- | --- |
| 기능 목록 freeze | V220-F02~F06, `/ops/sources`, `/ops/users`, `/ops/vlm`, `/client/*`, `/ops/events` 확인 | `development-backlog.md`, `manual-ui-checklist.md`, `project-feature-test-inventory.md` 확인 | PASS | 없음 |
| VLM UI 대상 | `/ops/vlm`, `/ops/events`, `/client/live`, `/client/dashboard`, `/client/events` 결과 행 존재 | route screenshot과 VLM/profile/privacy/client redaction interaction 존재 | PASS | 없음 |
| auth verifier env | auth test password env 5개 모두 `SET` | auth verifier와 one-shot auth flow에 지정 후 실행 | PASS | 원문 비밀번호 미기록 |
| throwaway fixture | users/source/view/analysis/event/snapshot/clip 경로 고정 | `/tmp/media_server_v220_ui_registry`, `/tmp/media_server_v220_ui_fulltest_one_shot_final` | PASS | 없음 |
| VA seed 준비 | seed dry-run 또는 registry dir 준비, 아직 UI/event evidence로 쓰지 않음 | dry-run PASS, 이후 인앱 UI에서 EventRecord presence 발생 확인 | PASS | full 12-key occurrence는 별도 미확인 |
| output artifact | summary/report/log/screenshot/evidence JSON 경로 고정 | `/tmp/media_server_v220_inapp_evidence`, `/tmp/media_server_v220_ui_fulltest_one_shot_final` | PASS | 없음 |
| UI blocker guard | native/blocking dialog policy 확인 계획 있음 | `verify-product-ui-no-native-dialogs`, `verify-ui-blocking-dialog-policy` PASS | PASS | 없음 |
| 30분 시작 조건 | 안정화 gate PASS 또는 미실행 사유 | 미실행 사유 기록 | PASS | 별도 지시 시 실행 |
| 120분 시작 조건 | 사용자 승인, RC/high-risk 사유 | 승인 없음 | PASS | 별도 지시 시 실행 |

- 시작 조건 실패: 없음
- 긴 테스트 시작 여부: 시작하지 않음
- 긴 테스트 미시작 항목: 30분, 120분, runtime-console 120분
- 제품 runtime/media/auth/session/registry 수정 여부: 제품 코드 수정 없음. throwaway fixture만 사용
- 전체 재시작 필요 여부: 없음
- 부분 재검수 가능 범위: 인앱 evidence verifier와 one-shot helper
- retained artifact로 재판정 가능한 항목: route screenshot, interaction pass, one-shot summary
- retained artifact가 부족해 미확인으로 남길 항목: full 12 EventRecord event-key occurrence, 실장비/외부 endpoint/provider 성공

## v2.2.0 UI Evidence Close-out 기록 기준

| 로드맵 항목 | 준비 기준 | 실행 evidence | 판정 |
| --- | --- | --- | --- |
| V220-F02 | `/ops/sources` 채널 목록/source detail/ONVIF/WHEP/WHIP/PublishedView/audit row 분리 | `/ops/sources` route screenshot 4폭, channel add validation, generated channel ID, hidden ID/no user ID input 확인 | PASS |
| V220-F03 | `/ops/users`, `/client/request-access`, `/invite/setup` 사용자/초대/승인/role/scope/audit row 분리 | viewer 생성/must-change, multi-channel scope, viewer ops denied, access request submit, admin approve, invite setup/login 확인 | PASS |
| V220-F04 | `/ops/vlm` privacy/default-off/profile state/Ops-only raw debug row 분리 | profile draft apply/save, privacy/default-off copy, raw details Ops-only, client redaction 확인 | PASS |
| V220-F05 | `/client/live`, `/client/dashboard`, `/client/events` admin preview/viewer-safe 비노출 row 분리 | client routes 4폭 screenshot, viewer/admin client flow, forbidden text hit 0, live tile playback/EventRecord presence 확인 | PASS |
| V220-F06 | 기능 inventory, manual UI checklist, UI 풀테스트 결과 기록 기준 연결 | `verify-v220-ui-evidence-closeout`, `verify-manual-ui-evidence` template/checklist mode, this result document | PASS for close-out 기록 |

- F06 문서/verifier PASS: 정적 close-out 기준 PASS. UI 직접 조작 PASS의 대체 evidence로 사용하지 않음
- 30분 테스트: 미실행. 사용자 명시 요청 없음
- 120분 테스트: 미실행. 사용자 명시 요청 없음
- 인앱 브라우저 UI 풀테스트: PASS for V220-F02~F06 direct route/control/action scope
- 실기기/외부 credential 조건: ONVIF device, external WHEP/WHIP/TURN, real cloud provider call은 실행하지 않음

## 현재 보존 증적

| 증적 | 경로 | 확인 |
| --- | --- | --- |
| In-app route/action evidence | `/tmp/media_server_v220_inapp_evidence/v220-inapp-evidence.json` | exists |
| In-app screenshot directory | `/tmp/media_server_v220_inapp_evidence` | exists |
| One-shot summary markdown | `/tmp/media_server_v220_ui_fulltest_one_shot_final/summary.md` | exists |
| One-shot summary JSON | `/tmp/media_server_v220_ui_fulltest_one_shot_final/summary.json` | exists |
| Feature inventory coverage report | `/tmp/media_server_v220_feature_inventory_coverage.md` | exists |
| Seed dry-run plan | `/tmp/media_server_v220_ui_seed_plan.json` | exists |

## 스크립트 테스트 기록

- 관련 자동 검증:
  - `./server.sh build`: PASS
  - `./server.sh verify-auth-bootstrap`: PASS after sandbox RTSP bind retry with approval
  - `./server.sh verify-auth-users`: PASS
  - `./server.sh verify-auth-routes`: PASS
  - `./server.sh verify-ops-client-ui`: PASS through one-shot in-app evidence
  - `./server.sh verify-ops-client-ui --screenshots`: PASS through one-shot in-app evidence
  - `./server.sh verify-product-ui-no-native-dialogs`: PASS
  - `./server.sh verify-ui-blocking-dialog-policy`: PASS
  - `./server.sh verify-ops-click-e2e`: PASS with `--in-app-evidence`
  - `./server.sh verify-ops-click-e2e --auth-ui-flow --auth-users-file <path>`: PASS with `--in-app-evidence`
  - `./server.sh verify-rule-ui`: PASS with `--in-app-evidence`
  - `./server.sh verify-manual-ui-evidence`: PASS in template/checklist mode
  - `./server.sh verify-manual-ui-evidence --result docs/manual-ui-result-2026-06-04-v220-inapp-fulltest.md`: not run; this scoped F02~F06 result is not the legacy 244 UI-target full inventory result gate
  - `git diff --check`: final close-out step에서 실행 예정
- 안정화/장시간:
  - `./server.sh verify-predev --soak-minutes 30`: 미실행. 사용자 명시 요청 없음
  - `./server.sh verify-predev --soak-minutes 120`: 미실행. 사용자 명시 요청 없음
  - `./server.sh verify-va-runtime-console-longrun --duration-minutes 120`: 미실행. 사용자 명시 요청 없음

## UI 풀테스트 기록

- blocking dialog policy:
  - native alert/confirm/prompt 없음: PASS
  - allowlisted in-page dialog만 사용: PASS
  - 위험 action 2회 확인 첫 클릭 write 없음: PASS
- 브라우저: Codex 인앱 브라우저
- 직접 조작 범위: setup/login/logout, viewer must-change, access request/approval/invite setup, `/ops/sources`, `/ops/rules`, `/ops/users`, `/ops/events`, `/ops/vlm`, `/client/live`, `/client/dashboard`, `/client/events`
- 반응형/테마 범위: 320/390/760/1180 route screenshots, `/ops/home` and `/client/live` theme toggle
- 시각 품질 확인: 10개 route 모두 `visualLayoutPass=true`, `noHorizontalOverflow=true`, required selector found
- 제외 기록: 아래 별도 섹션 참조

| ID | 화면/기능 | 직접 조작 | 실제 상태 | 판정 | 증적 |
| --- | --- | --- | --- | --- | --- |
| UI-002 | `/setup` weak/strong password | 약한 비밀번호 제출 후 policy-compliant password 제출 | weak rejected, strong accepted, `/login` redirect | PASS | `auth-setup-weak-password-rejected`, `auth-setup-strong-password` |
| UI-003 | `/login` admin login | admin credential 입력 | `/ops/home` landing | PASS | `auth-admin-login-landing` |
| UI-004 | `/password/change` viewer must-change | viewer initial login 후 password change | `/client/live` relogin landing | PASS | `auth-viewer-must-change-password` |
| UI-009 | `/ops/home` | route open, 4 widths, theme toggle | layout/pass selector/overflow/theme all OK | PASS | route screenshots, `theme-light-dark-toggle` |
| UI-010 | `/ops/dashboard` | route open, 4 widths | diagnostic grid visible, overflow 0 | PASS | route screenshots |
| UI-011 | `/ops/sources` | channel add, empty-name validation, generated ID 확인 | hidden numeric ID 9005, user-editable ID 없음, validation visible | PASS | `ops-sources-generated-channel-id` |
| UI-012 | `/ops/rules` | generated ID displays 확인 | generated rule/template/profile ID display and hidden input checks PASS | PASS | `ops-rules-generated-id-displays` |
| UI-013 | `/ops/users` | viewer 생성, channel scope checkbox/template 적용 | hidden scopes for 9001/9002/9003, must-change row visible | PASS | `ops-users-multi-channel-assignment`, `users-create-viewer-must-change` |
| UI-014 | `/ops/events` | event route open before/after playback | storage/review/VLM review panel visible; after playback 3 presence EventRecords with snapshot/clip | PASS | `ops-events-vlm-review-route`, `va-eventrecord-occurrence-coverage` |
| UI-015 | `/client/live` | admin preview, viewer landing, tile playback | tile 2/3 connected, metadata normal, event count visible, forbidden hits 0 | PASS | `client-live-va-playback-controls`, `client-viewer-redaction` |
| UI-016 | `/client/dashboard` | admin/viewer route open | viewer-safe route visible, forbidden hits 0 | PASS | route screenshots, `client-viewer-redaction` |
| UI-017 | `/client/events` | admin/viewer route open | viewer-safe event route visible, forbidden hits 0 | PASS | route screenshots, `client-viewer-redaction` |
| UI-019 | theme-aware UI | ops/client theme toggle | dark/light changed, shell retained, overflow 0 | PASS | `theme-light-dark-toggle` |
| UI-020 | desktop responsive | 1180px route screenshots | no horizontal overflow | PASS | route screenshots |
| UI-021 | mobile responsive | 320/390px route screenshots | no horizontal overflow | PASS | route screenshots |
| UI-022 | `/ops/vlm` install/connect readiness | route open, dry-run status 확인 | default-off/no runtime/provider call copy visible | PASS | route screenshots, `vlm-privacy-default-off` |
| UI-023 | `/ops/vlm` profile save | evaluation draft apply, profile save | save status visible, profile state updated | PASS | `vlm-evaluation-draft-apply`, `vlm-profile-save-local` |
| UI-024 | `/ops/vlm` privacy guard | privacy/default-off copy 확인 | credential/prompt/raw/source redaction copy present | PASS | `vlm-privacy-default-off` |
| UI-030 | `/ops/vlm` evaluation/prompt profile | evaluation draft applied | selected evaluation summary and saved profile state visible | PASS | `vlm-evaluation-draft-apply` |
| UI-031 | `/ops/vlm` raw details boundary | Ops raw details 확인, client routes 재확인 | raw details Ops-only; client forbidden hits 0 | PASS | `vlm-profile-save-local`, `client-viewer-redaction` |
| UI-032 | `/ops/events` VLM review route | review route open | review/VLM review panel present; no client exposure | PASS | `ops-events-vlm-review-route` |
| AUTH-018 | viewer user creation | `/ops/users` form submit | viewer row created with must-change | PASS | `users-create-viewer-must-change` |
| AUTH-026 | role viewer | viewer login and ops route attempt | `/client/live` allowed, `/ops/home` Access Denied | PASS | `auth-viewer-login-client-landing`, `auth-viewer-ops-denied` |
| AUTH-029 | channel-scoped viewer | channel checkbox/template apply | selected 9001/9002/9003 and scope text present | PASS | `ops-users-multi-channel-assignment` |
| AUTH-034 | access request | unauth request form submit | pending request visible to admin | PASS | `access-request-submit-pending` |
| AUTH-035 | admin approval / invite | approve request | invite setup path generated; token redacted in evidence | PASS | `access-request-admin-approve-invite` |
| AUTH-036 | invite setup login | open invite setup path, set password, login | invited viewer lands `/client/live` | PASS | `invite-setup-password-flow` |
| CLIENT-014 | client raw JSON redaction | `/client/live`, `/client/dashboard`, `/client/events` inspect | forbidden text hits 0 | PASS | `client-viewer-redaction` |
| CLIENT-015 | client debug counter redaction | same | forbidden text hits 0 | PASS | `client-viewer-redaction` |
| CLIENT-018 | admin client preview | admin `/client/live` | admin preview banner visible with viewer-safe boundary | PASS | `client-live-va-playback-controls` |
| CLIENT-020 | video control | tile play buttons clicked | tile 2/3 connected, event count visible | PASS | `client-live-va-playback-controls` |
| EVT-007 | EventRecord 조회 | playback 후 `/ops/events` open | 3 presence rows, snapshot/clip links, review rows | PASS | `va-eventrecord-occurrence-coverage` |
| SAFE-018 | client/viewer debug 비노출 | client routes inspect | forbidden text hits 0 | PASS | `client-viewer-redaction` |
| SAFE-019 | auth material 비노출 | result/evidence 작성 시 token/password/cookie redaction | token/password/cookie 원문 미기록 | PASS | this document |
| SAFE-020 | ops/client role boundary | viewer ops access attempt | Access Denied page shown | PASS | `auth-viewer-ops-denied` |
| SAFE-021 | blocking dialog policy | policy verifier 실행 | native/blocking policy PASS | PASS | one-shot summary |
| SAFE-031 | VLM viewer/client 비노출 | client routes inspect | VLM model/prompt/raw/provider/internal review forbidden hits 0 | PASS | `client-viewer-redaction`, `vlm-privacy-default-off` |

## VA Seed / 최종 룰 상태

- seed dry-run: PASS
- seed plan/report: `/tmp/media_server_v220_ui_seed_plan.json`
- seed registry dir: `/tmp/media_server_v220_ui_registry`
- seed apply: throwaway server registry로 사용
- seed apply 명령: `prepare-manual-ui-fulltest-seed --dry-run --emit-registry-dir`
- data storage:
  - auth users JSON: `/tmp/media_server_v220_ui_users.json`
  - source registry JSON: `/tmp/media_server_v220_ui_registry/sources.json`
  - published views JSON: `/tmp/media_server_v220_ui_registry/views.json`
  - analysis registry JSON: `/tmp/media_server_v220_ui_registry/analysis.json`
  - EventRecord JSON Lines: `/tmp/media_server_v220_ui_events.jsonl`
  - snapshot dir: `/tmp/media_server_v220_ui_snapshots`
  - clip dir: `/tmp/media_server_v220_ui_clips`

| 개별 항목 | 기대 상태 | 실제 상태 | 판정 |
| --- | --- | --- | --- |
| account: admin | admin 로그인/ops 접근 가능 | setup/login 후 `/ops/home` 접근 | PASS |
| account: viewer | viewer 로그인/client 접근 가능, ops 비노출 | must-change 후 `/client/live`, `/ops/home` Access Denied | PASS |
| source: file sample | file sample source 표시/선택 가능 | `/client/live` source tree and tiles visible | PASS |
| source: VA sample | VA event sample source 표시/선택 가능 | tile 2/3 playback controls connected | PASS |
| event template: presence | 최종 enabled template 존재 | playback으로 presence EventRecord 3개 발생 | PASS |

## VA Event Occurrence Coverage

| 개별 event 기능 | UI rows | JSON records | 증거 | 비고 | 후속 | 판정 |
| --- | --- | --- | --- | --- | --- | --- |
| `presence` | yes | 3 | snapshot + clip rows visible | EventRecord rows showed rule 9201 | 없음 | PASS |

### VA EventRecord 후속

이번 요청 범위의 v2.2.0 F02~F06 UI 풀테스트에서는 client playback에서 실제 EventRecord
presence 발생과 `/ops/events` UI 반영을 확인했습니다. manual UI full inventory의
12개 exact event-key occurrence 전수 PASS는 이번 결과로 주장하지 않습니다. `enter`,
`exit`, `line-crossing:any`, `line-crossing:forward`, `line-crossing:reverse`,
`intrusion-dwell`, `re-entry`, `wrong-direction`, `intrusion-after-line-crossing`,
`loitering`, `zone-occupancy`는 아래 제외 기록의 full VA event matrix 항목에
포함합니다.

## 확인됨

- AGENTS.md와 UI 풀테스트 기준 문서를 읽고 범위와 완료 조건을 확인했습니다.
- Codex 인앱 브라우저에서 제품 route를 직접 열고 클릭/타이핑/선택했습니다.
- `/setup`, `/login`, `/ops/home`, `/ops/dashboard`, `/ops/sources`, `/ops/rules`,
  `/ops/users`, `/ops/events`, `/ops/vlm`, `/client/live`, `/client/dashboard`,
  `/client/events`, `/client/request-access`, `/invite/setup` 흐름을 확인했습니다.
- client/viewer 화면의 forbidden text hits는 0입니다.
- invite token, passwords, session cookie 원문은 이 문서에 남기지 않았습니다.
- one-shot final summary는 PASS이고 30분/120분은 skipped로 기록했습니다.

## 제외 기록

| 항목 | 제외 이유 | 후속 확인 조건 |
| --- | --- | --- |
| 30분 soak | 사용자 명시 요청 없음 | `./server.sh verify-predev --soak-minutes 30` 별도 실행 |
| 120분 longrun | 사용자 명시 요청 없음 | `./server.sh verify-predev --soak-minutes 120` 또는 runtime console 120분 별도 실행 |
| real ONVIF device | 실장비/credential 없음 | endpoint/credential 준비 후 안정화/UI 제외 해제 |
| external WHEP/WHIP/TURN success | 외부 endpoint/credential 없음 | endpoint/credential 준비 후 field gate 실행 |
| real cloud provider call | provider credential 실행 지시 없음 | explicit opt-in/credential 후 provider gate 실행 |
| full 12-key VA EventRecord occurrence matrix | 이번 직접 발생은 presence 3개 | full VA event matrix UI run에서 exact key별 발생 확인 |
| legacy 244 UI-target full inventory result verifier | 이번 결과 문서는 v2.2.0 F02~F06 direct close-out scope | 전수 inventory runner/evidence 생성 후 `verify-manual-ui-evidence --result` 실행 |

## 실패

- 최초 sandbox 안 `verify-auth-bootstrap`: RTSP bind `Operation not permitted`로 실패. 제품 회귀로 단정하지 않고 승인된 재실행에서 PASS 확인.
- 최초 one-shot/retry: 기존 helper 일부가 Codex 인앱 evidence를 받지 못해 Chrome fallback/executable 문제로 실패. 제품 UI 회귀가 아니라 harness gap으로 확인하고, `verify-rule-ui`, `verify-ops-tables-layout`, `verify-ops-click-e2e`, `verify-ui-fulltest-one-shot`에 `--in-app-evidence` 연결을 추가한 뒤 final PASS.

## 문서 재작성/신규 작성/비교 병합

- 재작성한 UI 풀테스트 관련 문서: 없음
- 새로 작성한 UI 풀테스트 문서: `docs/manual-ui-result-2026-06-04-v220-inapp-fulltest.md`
- 비교 결과: v2.0/v2.1 결과 문서 형식을 참고하되, 이번 결과는 F02~F06 직접 검수 범위와 전수 inventory 미실행을 분리
- 병합 결과: `docs/README.md`, `docs/release-evidence-index.md`에 색인 추가 예정
- 남은 중복: 없음

## 최종 판정

- 최종 결론: PASS for v2.2.0 F02~F06 direct in-app UI fulltest scope
- PASS 조건: V220-F02~F06 route/control/action 실패 행 0개, 제외 기록은 판정표 밖에만 존재
- 제품 회귀 여부: 확인된 제품 회귀 없음
- 환경/sandbox 한계: sandbox RTSP bind 실패는 승인 재실행에서 PASS, Chrome fallback은 Codex 인앱 evidence 연결로 대체
- 수정 필요 이슈: legacy helper의 인앱 evidence 인자 미지원은 수정 완료
- 커밋: final close-out step에서 생성 예정
- 푸시 가능: final clean/commit 상태 확인 후 판단
- 푸시 수행 여부: 수행하지 않음
