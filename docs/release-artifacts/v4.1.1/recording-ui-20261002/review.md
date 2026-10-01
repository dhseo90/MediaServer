# v4.1.1 녹화 UI 실행 및 증거 검토

기존 [결과 템플릿](../../../manual-ui-result-template.md)의 녹화 action·검수 메타데이터·Policy v4 공통 조건을 사용한 이번 run 기록이다. 제품/검사/정책/fixture/원장 변경은 없다.

## 판정

- 녹화 8개 ID: PASS 8 / FAIL 0 / 미실행 0. 세부 action: PASS 31 / FAIL 0 / 미실행 0 / unsupported 0.
- 메인 AI의 새 증거 검토: PASS. 아래 42개 새 캡처와 구조화 관측을 실제 확인하여 이번 녹화 범위의 미해결 visual/accessibility reviewRequired는 0이다.
- 원본 `evidence/results.json`의 `visualReviewRequired=true`, `uiFulltestPass=false` 및 개별 원본 필드는 그대로 보존한다. 이 문서가 원본 해시를 연결한 추가 판단이며 자동 실행의 원래 판정을 소급 변경하지 않는다.
- 기존 baseline424 PASS와 이번 녹화8 PASS를 서로 다른 run으로 합쳐 현재 정의된 UI432 범위 충족을 판단한다. 기존424 qualifier를 432로 바꾸거나 이번 녹화를 삽입하지 않았다. 녹화 별도120분·전체 릴리즈 완료 판정은 아니다.

## 검수 메타데이터

- 실행·검토 담당: 이 대화의 메인 Codex AI. 인간/사용자 승인 또는 독립 C2 검토자로 표시하지 않는다. 체크리스트는 메인이 공통 조건과 전체 집계를 확인하도록 정하며 별도 사람/세션 검토자를 요구하지 않아 새 agent는 사용하지 않았다.
- 검토 기록 시각: 2026-10-01T22:22:36.143624+00:00; 실제 실행: 2026-10-01T22:12:37.526771+00:00 → 2026-10-01T22:13:52.998223+00:00 (75.442초, 단1회).
- branch/source: v4.1.1 / `ce0d01e2b964cdcde27360b2f533039499ed2941`; tree `388b9dc06f7f5a328e719c4677a4acfa6d307657`; 실행 전 작업 트리/index clean.
- 제품 SHA-256: `ec93cbc5418bd1fe0c83eb4a90bf3fb837d9acd0f76356c6771b042e37d60c25`. 기존 archive·제품·UI·정책·fixture와 입력 해시는 preparation/evidence-checks에 기록했다.
- 브라우저: 기존 native Google Chrome 152.0.7977.83, Playwright 1.62.1, headless actual visible DOM 조작. 설치/업데이트/수동 개입 없음.
- evidence mode: qualified-native-automation + 메인 시각 검토. provenance의 fallback 문구는 기존 runner의 고정 문구이며 이번에 인앱 브라우저 실패를 새로 재현한 뜻이 아니다.
- 명령: `node scripts/internal/run_recording_ui_acceptance.mjs --all --output-dir "$UI_OUTPUT"`; 실제 절대경로·PID는 invocation.json. canonical os.tmpdir 직속 신규 소유0700 빈 root를 사용했다.
- 인증: `--ui-auth-direct`/auto. 격리 계정 준비 후 실제 로그인 form을 입력·제출하고 whoami로 role/scope를 확인했다. 비밀번호는 메모리 전달, 캡처 시 password input 비어 있음, 원문 credential Git 보존 없음.
- source/view/analysis/users/event/recording/cache/tmp는 harness 소유 root. loopback 서버·proxy·UDP, local env 차단. 운영/외부 저장소 사용 없음.
- 토큰 사용량: 신뢰할 수 있는 집계 도구 값이 없어 미집계. 실행 경과는 subprocess monotonic 측정이다.

## V410 녹화 8개 ID action별 결과

| ID | action | 판단 | 직접 대조한 근거 |
| --- | --- | --- | --- |
| V410-S06-I27 | I27-filter — 정상 필터 | PASS | seed의 시간 확인 115·귀속 미확인 31과 실제 응답/DOM 개수 일치. [관측](evidence/I27-filter.json) · [화면](evidence/I27-filter.png) |
| V410-S06-I27 | I27-empty — 빈값·빈 결과 | PASS | 필수 시작값 비움 거부·추가 요청 없음, 채널2 결과 0·선택 영상 해제. [관측](evidence/I27-empty.json) · [화면](evidence/I27-empty.png) |
| V410-S06-I27 | I27-inverted — 역전 시간 | PASS | 역전 범위 요청 거부, 올바른 시작·종료 안내와 영상 해제. [관측](evidence/I27-inverted.json) · [화면](evidence/I27-inverted.png) |
| V410-S06-I27 | I27-page — 페이지 | PASS | offset100 다음/이전, 끝에서 다음 비활성·처음에서 이전 비활성. [관측](evidence/I27-page.json) · [화면](evidence/I27-page.png) |
| V410-S06-I28 | I28-event — 이벤트 우선 | PASS | 겹친 event의 실제 media 선택과 이벤트 우선 badge 일치. [관측](evidence/I28-event.json) · [화면](evidence/I28-event.png) |
| V410-S06-I29 | I29-original — 원본 | PASS | 숨긴 원본 1개를 펼쳐 14→15행, 해당 원본 선택 후 접으면 다른 선택으로 전환. [관측](evidence/I29-original.json) · [화면](evidence/I29-original.png) |
| V410-S06-I30 | I30-play — 재생 | PASS | 10초/1280×720 영상, Space 후 0→0.669332초·0→25 frame. [관측](evidence/I30-play.json) · [화면](evidence/I30-play.png) |
| V410-S06-I30 | I30-pause — 정지 | PASS | Space 후 paused, 357.95ms 동안 0.790934초 유지. [관측](evidence/I30-pause.json) · [화면](evidence/I30-pause.png) |
| V410-S06-I30 | I30-seek — 탐색 | PASS | ArrowRight20회로 0.790934→2.79093초·28→201 frame, seeking/seeked 및 동일 파일206 Range 상관. [관측](evidence/I30-seek.json) · [화면](evidence/I30-seek.png) |
| V410-S06-I31 | I31-partial — partial | PASS | 실제 partial job 일부 구간 안내, playable URL과 readyState4 연결. exact missingRanges를 요구하지 않음. [관측](evidence/I31-partial.json) · [화면](evidence/I31-partial.png) |
| V410-S06-I31 | I31-deleted — 삭제 | PASS | 실제 삭제 fixture의 deleted 행·재생 불가 안내, src 없음/paused. [관측](evidence/I31-deleted.json) · [화면](evidence/I31-deleted.png) |
| V410-S06-I31 | I31-corrupt — 손상 | PASS | 실제 바이트 손상 fixture의 corrupt 행·재생 불가 안내, src 없음/paused. [관측](evidence/I31-corrupt.json) · [화면](evidence/I31-corrupt.png) |
| V410-S06-I31 | I31-pending — 미완결 event | PASS | ui-accepted-only 미완결 event·출력 없음, src 없음/paused. Writing 검증으로 대체하지 않음. [관측](evidence/I31-pending.json) · [화면](evidence/I31-pending.png) |
| V410-S06-I31 | I31-gap — 공백 | PASS | 채널2 빈 목록과 공백 안내, 기존 영상 해제. [관측](evidence/I31-gap.json) · [화면](evidence/I31-gap.png) |
| V410-S06-I31 | I31-error — 오류 | PASS | 기존 단발503 대역을 실제 조회로 소비, 오류 안내와 stale 영상 해제; 이후 정상 조회. [관측](evidence/I31-error.json) · [화면](evidence/I31-error.png) |
| V410-S06-I32 | I32-quota — quota | PASS | 실제 status 응답과 DOM의 바이트/상한 일치, 채널3 128MiB·채널4 continuous1MiB. [관측](evidence/I32-quota.json) · [화면](evidence/I32-quota.png) |
| V410-S06-I32 | I32-active — 활성 | PASS | 실제 채널 편집/저장으로 enabled·active false→true, revision2→3 및 status DOM 반영. [관측](evidence/I32-active.json) · [화면](evidence/I32-active.png) |
| V410-S06-I32 | I32-blocked — blocked | PASS | 실제 채널4 storageBlocked=true와 저장 공간 차단 안내. [관측](evidence/I32-blocked.json) · [화면](evidence/I32-blocked.png) |
| V410-S06-I33 | I33-navigation — navigation | PASS | 기존6개 primary nav 유지, events는 직접 route, 녹화 form에 자연어/vector 입력 없음. [관측](evidence/I33-navigation.json) · [화면](evidence/I33-navigation.png) |
| V410-S06-I34 | I34-admin — admin | PASS | 실제 admin 로그인/whoami * scope 및 event media 선택. [관측](evidence/I34-admin.json) · [화면](evidence/I34-admin.png) |
| V410-S06-I34 | I34-operator — operator scope | PASS | 실제 operator source:read:1만 표시·허용, 타채널403/타미디어404, no-source 빈 목록·no-ops403. [관측](evidence/I34-operator.json) · [화면](evidence/I34-operator.png) |
| V410-S06-I34 | I34-viewer-unauth — viewer·미인증 | PASS | 실제 viewer403와 미인증/login 전환·녹화 control 없음. 빈 로그인 추가 캡처 확인. [관측](evidence/I34-viewer-unauth.json) · [화면](evidence/I34-viewer-unauth.png) |
| V410-S06-I34 | I34-redaction — redaction | PASS | operator/뷰어 표시 및 HTML credential 검증, viewer 캡처에 Ops/Lab·내부 자료 없음. [관측](evidence/I34-redaction.json) · [화면](evidence/I34-redaction.png) |
| V410-S06-I34 | I34-320-light — 320 light | PASS | 320px light 실제 전환. filters/영상 2개 캡처 직접 확인: 날짜·checkbox·영상 controls 가림/가로 잘림 없음, Tab focus 및 Space checkbox 복원, label/geometry 일치. [관측](evidence/I34-320-light.json) · [화면](evidence/I34-320-light.png) |
| V410-S06-I34 | I34-320-dark — 320 dark | PASS | 320px dark 실제 전환. filters/영상 2개 캡처 직접 확인: 날짜·checkbox·영상 controls 가림/가로 잘림 없음, Tab focus 및 Space checkbox 복원, label/geometry 일치. [관측](evidence/I34-320-dark.json) · [화면](evidence/I34-320-dark.png) |
| V410-S06-I34 | I34-390-light — 390 light | PASS | 390px light 실제 전환. filters/영상 2개 캡처 직접 확인: 날짜·checkbox·영상 controls 가림/가로 잘림 없음, Tab focus 및 Space checkbox 복원, label/geometry 일치. [관측](evidence/I34-390-light.json) · [화면](evidence/I34-390-light.png) |
| V410-S06-I34 | I34-390-dark — 390 dark | PASS | 390px dark 실제 전환. filters/영상 2개 캡처 직접 확인: 날짜·checkbox·영상 controls 가림/가로 잘림 없음, Tab focus 및 Space checkbox 복원, label/geometry 일치. [관측](evidence/I34-390-dark.json) · [화면](evidence/I34-390-dark.png) |
| V410-S06-I34 | I34-760-light — 760 light | PASS | 760px light 실제 전환. filters/영상 2개 캡처 직접 확인: 날짜·checkbox·영상 controls 가림/가로 잘림 없음, Tab focus 및 Space checkbox 복원, label/geometry 일치. [관측](evidence/I34-760-light.json) · [화면](evidence/I34-760-light.png) |
| V410-S06-I34 | I34-760-dark — 760 dark | PASS | 760px dark 실제 전환. filters/영상 2개 캡처 직접 확인: 날짜·checkbox·영상 controls 가림/가로 잘림 없음, Tab focus 및 Space checkbox 복원, label/geometry 일치. [관측](evidence/I34-760-dark.json) · [화면](evidence/I34-760-dark.png) |
| V410-S06-I34 | I34-1180-light — 1180 light | PASS | 1180px light 실제 전환. filters/영상 2개 캡처 직접 확인: 날짜·checkbox·영상 controls 가림/가로 잘림 없음, Tab focus 및 Space checkbox 복원, label/geometry 일치. [관측](evidence/I34-1180-light.json) · [화면](evidence/I34-1180-light.png) |
| V410-S06-I34 | I34-1180-dark — 1180 dark | PASS | 1180px dark 실제 전환. filters/영상 2개 캡처 직접 확인: 날짜·checkbox·영상 controls 가림/가로 잘림 없음, Tab focus 및 Space checkbox 복원, label/geometry 일치. [관측](evidence/I34-1180-dark.json) · [화면](evidence/I34-1180-dark.png) |

## 증거 적격성·시각/접근성 검토

원본 results SHA-256 `e74f1df96045afb7cf0c5980f9db3305e18121e0dc213a09dc2013ecca6a3d36`; provenance SHA-256 `21bf132a543c5741385f3f11b7b190057207084a01f0ed5998deb5178a23b648`. `evidence-checks.json`은 기존 assessRecordingConsole/validateI30Observation/recordingGeometry/validatePolicy를 저장된 이번 관측에 적용한 결과다. 새로운 qualifier/schema/승인 원장을 만들지 않았으며 baseline424 qualifier의 기계 판정을 녹화8에 적용했다고 쓰지 않는다.

- 95개 manifest artifact의 소유·정규경로·중복 없음·바이트/해시 대조 PASS. results 자체는 별도 해시로 결속. 31개 action의 begin/end trace62행·실행 시각·실제 observed role/scope 및 완료 시 viewport/theme를 대조했다. theme 전환 action의 begin은 전환 전 theme이고 완료 관측이 요청 theme임을 구분했다.
- 새 PNG42개 전부 기존 Pillow로 verify/load하고 메인이 원본을 직접 열었다. 31개 action 화면, 8개 `I34-*-filters.png`, viewer-redaction, unauth-empty-login, final이 전부이며 파일별 해시·크기는 png-decode.json에 있다. 예전424 캡처를 전수 재검토했다고 주장하지 않는다.
- 320/390/760/1180×light/dark: 각 필터 캡처에서 채널·날짜·체크박스·조회와 focus outline을, 영상 캡처에서 전체 video viewport/기본 controls/탐색 막대·상태 설명을 확인했다. 좁은 화면은 세로 배치이고 1180은 가로 필터 배치다. 가로 이탈·겹침·필수 조작 가림을 관측하지 않았다. 320 native controls의 압축 배치는 390 이상과 다르지만 재생·진행 막대·전체화면이 식별된다. 읽을 수 있는 light/dark 대비, 실제 Tab focus/Space checkbox 조작, 6개 control label·geometry를 결합해 기존 녹화 접근성 조건을 충족한다. 화면 전체의 별도 WCAG 인증이나 새로운 접근성 전수 감사는 아니다.
- I30 play/pause/seek 화면에서 실제 영상 변화와 0:00→0:02 표시를 확인했다. Range206 세 응답은 같은 seek 파일이며 탐색보다 먼저 받은 buffered bytes일 수 있다. 탐색이 매번 새 Range 요청을 만들었다고 주장하지 않는다.
- 일부 action PNG는 정상 상태로 복원한 뒤의 화면이거나 긴 페이지의 한 viewport다. 빈값/역전/오류·거부 상태의 모든 순간이 PNG에 있다고 쓰지 않는다. 해당 판단은 action 내 실제 control 조작·상관 응답·DOM 관측과 trace를 함께 사용했다. 영상/필터의 전체 시각 경계는 별도8조합 캡처로 확인했다.
- seed oracle: 현재 C++ seed가 실제 생성한 파일·hash·삭제/손상/Pending/페이지/원본-파생 관계를 준비 시 검증하고 제품 응답과 연결했다. 저장한 seed-oracle은 정제 직렬화이며 provenance.seedHash가 지칭하는 원래 manifest 바이트와 같다고 주장하지 않는다. server-log.txt도 runner가 정제한 자료이고 private server 원본과 동일 바이트가 아니다.
- browser console 오류10건은 실행 전부터 코드에 정의된 I31 단발503, operator users403/타채널403/타미디어404/ops scope403, viewer403와 session/action/route/status/시각으로 각각 연결된다. 새 allowlist 없음. 미승인 browser error/warning/pageerror/crash0, manualIntervention0, failed action0. Policy의 forbidden-material 정규식으로 텍스트 전부를 재스캔하고 캡처도 눈으로 확인했다.
- seed 준비 stderr에는 `file evidence unavailable: file evidence profile/bound 오류` 5행이 있다. 원출력을 삭제하거나 새 allowlist로 승인하지 않았다. 이는 별도 seed 프로세스의 선택적 file_evidence 생성 진단이며 실제 서버 보존 로그에는 해당 경고/오류가 없다. 제품 코드는 file_evidence가 없으면 해당 부가 검증을 적용하지 않는 기존 계약이고 seed의 물리/hash·재기동 oracle은 통과했다. 이것을 완전한 file-evidence 생성 성공이나 알려진 원인 수정으로 주장하지 않는다. 이번 UI의 파일 재생·Range·오류 상태 판단은 실제 관측에 근거한다.
- 서버 로그21행: 소유 경로 정제, local-env 차단, startup recovery inspected113/corrupt0, TCP 설정. 브라우저 원출력 및 server log를 제품 내부 미관측 상태의 증거로 확대하지 않는다.

## baseline424 유지와 승인 입력

`c888ac9baf613c773cbd8bb14bb547d3a3e4cc3a`의 기존 baseline424는 `test-acceptance-current-final`의 보존 manifest로 연결한 policy-v4-summary와 ui-fulltest-qualification/evaluation 두 원본만 압축·해제 해시를 대조했다. 실행 summary는 CAPTURED/uiFulltestPass=false이고 **후속 evaluation은 policyValidationResult=PASS, uiFulltestPass=true, qualified424**인 관계를 유지한다. 기존 capture 시각·SHA·판정을 수정하지 않았다.

현재 제품 hash가 그 summary의 buildSha256과 같고 src/include/UI/config/정책/fixture/관련 runner·seed·체크리스트의 누적 diff가 없다. 이후 변경은 녹화 단기 검사 준비/집계/live 관측과 실행 증거였다. 현재 입력 해시도 실행 전후 동일하다. 따라서 기존424의 제품/UI/정책 범위가 유지된다. 이번 증거는 새 녹화31action만이며 일반 acceptance/30분/서버120분/424/current-integration/codec를 재실행하지 않았다.

제품·verifier·policy·proof·approval 입력 변경0이므로 candidate·C2·producer를 실행하지 않았다. 기존 candidate digest `e32f557042a78e0478efaaeea05b617cdfff9b3af6eaf29872f86c0272cbf2f2` 및 적용 원장 불변이다. 최초 ENOENT·Opus timeout FAIL과 미확정 원인, 두 codec 미재현 진단, 이전 PASS는 그대로 유지한다.

## cleanup·보존·다음 경계

harness는 서버 PID8708 정상 exit0/signal없음·RTSP53863/HTTP53864 ECONNREFUSED·소유 root 제거·UDP close를 기록했다. 후속 ps에서 실행 process group과 신규 Chrome 잔존0, 두 포트 bind 가능과 기본 `.media_server/recordings` 부재를 확인했다. Proxy는 기존 finishRecordingUiProxy가 close 완료를 기다린 뒤 harness 정리를 수행했고 launcher도 exit0이다. proxy port 번호 자체는 기존 출력에 없어 별도 숫자를 만들지 않는다. symlink277개는 기존 GStreamer 준비 경로이며 harness는 따라가지 않고 측정·정리했다.

새 UI 증거만 `evidence/`에 원본 artifact 바이트로 보존한다. 추적 증거는 후속 마감용으로 유지한다. Git 보존 커밋 readback 뒤 UI_OUTPUT과 이번 scratch만 정리하고 `preservation-readback.json`에 기록한다. 원본 results/과거 증거를 덮어쓰지 않는다. 보존파일과 원본/정제 표현의 관계는 preservation-manifest.json 참조.

이번 녹화 UI 실행·검토 범위에서 남은 차단은 없다. 별도 녹화120분은 미실행이며 이번에 수행하지 않는다. 푸시·PR·병합·태그·Release도 수행하지 않는다. UI 범위 충족을 전체 릴리즈 완료로 확대하지 않는다.
