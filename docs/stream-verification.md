# Stream Verification

이 문서는 현재 기준의 스트리밍/VA 검증 명령을 관리합니다.
과거 날짜별 상세 검증 이력은
[history/verification-history.md](./history/verification-history.md)에 보관합니다.

## 목적

- RTSP/WebRTC 입력/출력 pipeline이 기존 동작을 유지하는지 확인합니다.
- 기존 Intrusion / LineCrossing rule event의 이벤트 타입, JSON/API/POST 형식이 유지되는지 확인합니다.
- TrackStateManager, SceneContextBuilder, EventManager, ScenarioEngine, cleanup 정책이 다채널 환경에서 무한 증가하지 않는지 확인합니다.
- 신규 VA 기능이 media pipeline을 blocking하지 않는지 확인합니다.
- 검증 명령은 로컬 재현성을 우선하고, 외부 source/TURN/장시간 테스트는 별도 gate로 분리합니다.
- 현재 기본 테스트 환경에는 ONVIF camera, 외부 RTSP upstream, 외부 WHEP/WebRTC publisher처럼 원본 영상을 제공할 실물 장비가 없습니다. 장비가 필요한 항목은 검증 가능한 공개 URL, 로컬 fixture/simulator, loopback publisher, no-device suite 같은 대체 테스트로 실행하고, 실장비 검증은 미수행/후속 field smoke로 분리합니다.

## 테스트 모드 요약

| 명령 | 범위 |
| --- | --- |
| `./server.sh test` | 기본 smoke. 로컬 file/RTSP/WebRTC/기본 API 중심 |
| `./server.sh test --basic` | 기본 smoke를 명시적으로 실행 |
| `./server.sh test --full` | Product UI smoke, Rule/Profile UI, VA event, image analysis, event POST smoke, redaction 포함 |
| `./server.sh test --external` | `--full` + LAN/external source, WebRTC ICE, 외부 HTTP/HLS URI 선택 검증. 외부 WHEP endpoint는 환경 의존 별도 검증 |
| `./server.sh test --stable` | 기존 stable 호환 기준 |

외부 RTSP/HLS/HTTP/WHEP source, 운영 TURN relay/auth는 외부 환경 영향을 받으므로 기본 hard gate가 아닙니다. YouTube import/source는 기본 빌드에서 제외한 lab-only 실험 기능이며, 현재 기본 검증에서는 실제 YouTube URL 성공을 확인하지 않습니다. 공개 URL을 사용할 때는 재현 가능한 예시 URL 또는 환경 변수로만 주입하고, 개인 LAN IP, credential, 고객/운영 영상 URL은 문서와 artifact에 남기지 않습니다.

문서/UI/Auth/권한/계정처럼 media pipeline 자체를 바꾸지 않은 변경에서는
`./server.sh test`, `./server.sh test --basic`, `./server.sh test --full`,
`./server.sh verify-predev --quick`를 기본으로 실행하지 않습니다.
이 명령들은 기본 추가 RTSP/WebRTC source 영상과 codec matrix를 사용하므로 느립니다.
해당 변경 범위에서는 아래의 문서/UI/Auth 전용 smoke만 사용합니다.
RTSP/WebRTC codec/source 자체를 수정했거나
release candidate gate를 열 때만 명시적으로 실행합니다.

## 단기 테스트 명령

개발 전후 빠른 기준:

```bash
./server.sh build
./server.sh test
```

문서/UI/Auth/권한 전용 빠른 기준:

```bash
./server.sh build
git diff --check -- README.md NOTICE THIRD_PARTY_NOTICES.md DEPENDENCY_SNAPSHOT.md .github config docs scripts src include
./server.sh verify-script-inventory
./server.sh verify-code-comments
./server.sh verify-release-metadata
./server.sh verify-v121-follow-up-closure
./server.sh verify-v130-follow-up-closure
./server.sh verify-v140-follow-up-closure
./server.sh verify-v140-report-archive-policy
./server.sh verify-v150-follow-up-closure
./server.sh verify-docs-links
./server.sh verify-docs-ui-assets
./server.sh verify-manual-ui-evidence
./server.sh verify-actions-security
./server.sh write-dependency-notice --check
./server.sh verify-public-repo-readiness --report /tmp/media_server_public_repo_readiness.md
./server.sh verify-post-release-reconciliation
./server.sh verify-release-closeout-helper --dry-run --report /tmp/media_server_release_closeout_helper.md
./server.sh verify-release-closeout-helper --dry-run --report <report.md> --json-report <report.json>
./server.sh verify-release-evidence-index
./server.sh dependency-snapshot --stable --output /tmp/media_server_dependency_snapshot.md --no-linked-libs
./server.sh verify-bundle-policy --output /tmp/media_server_bundle_policy.md --json-output /tmp/media_server_bundle_policy.json
./server.sh verify-release-bundle-dry-run
./server.sh source-offer-checklist --stable --bundle-policy-report /tmp/media_server_bundle_policy.json
./server.sh verify-auth-routes
./server.sh verify-ops-client-ui
./server.sh verify-ops-click-e2e
./server.sh verify-ops-tables-layout
./server.sh verify-rule-ui
./server.sh verify-ops-rules-roundtrip
./server.sh verify-analysis-state
```

`verify-release-metadata`는 v1.8.0부터 로컬 VERSION/문서 일치만으로 통과하지
않습니다. 기본 실행은 `gh release list`, `gh release view`, GitHub API
`/releases/latest`, `git ls-remote --tags origin <tag>`를 실제로 호출해 GitHub Latest
Release와 원격 tag가 현재 published source-only tag를 가리키는지 확인합니다. 네트워크,
GitHub CLI, origin 접근이 준비되지 않았으면 실패로 보고하고 release close-out PASS로
대체하지 않습니다.

v1.4.0 tracker/Re-ID opt-in 이후 남은 후속 항목 분류와 종료 판정은
[v1.4.0 Follow-up Closure](./v1.4.0-follow-up-closure.md)를 기준으로 확인합니다.
v1.5.0 Tracker/Re-ID opt-in 안정화 이후 남은 후속 항목 분류와 종료 판정은
[v1.5.0 Follow-up Closure](./v1.5.0-follow-up-closure.md)를 기준으로 확인합니다.
v1.6.0 stabilization release evidence는
[v1.6.0 Release Evidence Dashboard](./v1.6.0-release-evidence-dashboard.md)를
기준으로 확인하며, 실행한 검증과 미실행 장시간/실장비/외부 credential gate를
분리합니다.
`verify-predev` report에 `건너뜀`이 있으면 skip count와 step reason을 같이
검토합니다. 사용자가 요청하지 않은 optional external TURN 같은 선택 gate만
건너뛴 경우에는 predev 결과와 외부 TURN `NOT RUN`을 분리해 기록합니다.
요청한 hard gate가 건너뛰어진 경우에는 release PASS가 아니라 HOLD 또는 NOT RUN으로
남깁니다.

```bash
./server.sh verify-v160-release-evidence-dashboard
./server.sh verify-v160-stability-verification-gate
./server.sh verify-v160-debug-exposure-regression-guard
./server.sh verify-v160-tracker-reid-opt-in-closeout
./server.sh verify-v160-onvif-field-smoke-evidence-reconciliation
./server.sh verify-v160-audit-export-masking-regression-hardening
./server.sh verify-v160-runtime-model-bundle-rc-policy
./server.sh verify-v160-manual-ui-release-checklist-closure
./server.sh verify-v160-public-docs-consistency-polish
./server.sh verify-v160-tracker-benchmark-harness-planning
```

Stability gate 분류는
[v1.6.0 Stability Verification Gates](./v1.6.0-stability-verification-gates.md)에
고정합니다. static/docs gate, attached UI/Auth gate, Runtime/VA metadata gate,
Tracker/Re-ID carry-over gate, flaky/cleanup isolation gate, longrun/external gate를
분리하고, 실행하지 않은 gate를 release pass처럼 쓰지 않습니다.
Client/Ops debug exposure guard는
[v1.6.0 Client/Ops Debug Exposure Regression Guard](./v1.6.0-debug-exposure-regression-guard.md)에
고정합니다. `verify-ops-client-ui`의 client forbidden text/key matrix가 source URL,
raw JSON, debug counter, rule/profile editor, model/source/auth material을 검사하는지
`verify-v160-debug-exposure-regression-guard`로 확인합니다.
Tracker/Re-ID opt-in close-out은
[v1.6.0 Tracker/Re-ID Opt-in Stabilization Close-out](./v1.6.0-tracker-reid-opt-in-closeout.md)에
고정합니다. v1.5.0 follow-up closure, stability matrix, Re-ID provenance/fallback
approval verifier를 carry-over gate로 연결하되, default-on이나 runtime/model bundle
승격은 P0 완료로 쓰지 않습니다.
ONVIF field smoke evidence reconciliation은
[v1.6.0 ONVIF Field Smoke Evidence Reconciliation](./v1.6.0-onvif-field-smoke-evidence-reconciliation.md)에
고정합니다. 실장비 field smoke를 실행하지 않았으면 `NOT RUN`과
`realDeviceEndpointSuccess=unverified`로 유지하고, no-device suite 결과를 field
smoke pass로 쓰지 않는지 `verify-v160-onvif-field-smoke-evidence-reconciliation`로
확인합니다.
Audit/export masking regression hardening은
[v1.6.0 Audit Export Masking Regression Hardening](./v1.6.0-audit-export-masking-regression-hardening.md)에
고정합니다. `/ops/api/audit` 조회와 JSON/CSV/Diff JSON export가 source/model/auth/raw
material을 다시 노출하지 않는지 `verify-v160-audit-export-masking-regression-hardening`로
확인합니다.
Runtime/model bundle RC policy는
[v1.6.0 Runtime/Model Bundle RC Policy](./v1.6.0-runtime-model-bundle-rc-policy.md)에
고정합니다. v1.6.0 기본 release에 ONNX Runtime package나 YOLO/Re-ID/model binary를
포함하지 않고, 향후 별도 RC의 bundle policy, source offer, model provenance,
privacy/redaction review 조건만 `verify-v160-runtime-model-bundle-rc-policy`로
확인합니다.
Manual UI release checklist closure는
[v1.6.0 Manual UI Release Checklist Closure](./v1.6.0-manual-ui-release-checklist-closure.md)에
고정합니다. 자동 smoke나 screenshot 생성만으로 수동 클릭 검수를 완료했다고 쓰지
않고, 실제 실행 artifact/link와 미실행/미확인 항목을
`verify-v160-manual-ui-release-checklist-closure`로 분리합니다.
Public docs consistency polish는
[v1.6.0 Public Docs Consistency Polish](./v1.6.0-public-docs-consistency-polish.md)에
고정합니다. 이 historical gate는 v1.6.0 close-out 당시의 public tag/evidence drift와
v1.6.0 stabilization roadmap/evidence를 분리하고, public docs가 tag/push/GitHub
Release나 후속 Phase 후보를 완료로 쓰지 않는지
`verify-v160-public-docs-consistency-polish`로 확인합니다.
V160-P2-01 Public docs consistency polish는 public docs current tag와
stabilization evidence 표현을 정리하는 항목입니다.
Tracker benchmark harness planning only는
[v1.6.0 Tracker Benchmark Harness Planning](./v1.6.0-tracker-benchmark-harness-planning.md)에
고정합니다. OC-SORT/BoT-SORT/DeepSORT를 runtime tracker로 승격하지 않고,
metadata-only sandbox와 별도 Phase benchmark 요구사항만
`verify-v160-tracker-benchmark-harness-planning`으로 확인합니다.

위 전용 기준은 느린 기본 추가 RTSP/WebRTC source 영상, codec matrix, multichannel media soak를 사용하지 않습니다.
기본 smoke와 longrun gate가 섞이지 않았는지는 다음 명령으로 정적으로 확인합니다.

```bash
./server.sh verify-longrun-separation
```

FFmpeg/ffprobe CLI가 없는 공개/CI 환경에서는 codec matrix와 RTSP decode 기반 VA overlay 검증을 분리합니다.

```bash
./server.sh test --basic --ffmpeg-free
```

`verify-auth-routes`는 임시 users/source/view 파일과 격리 포트로 서버를 직접 띄웁니다.
`verify-ops-client-ui`, `verify-rule-ui`는 실행 중인 HTTP 서버를 대상으로 하는 attached UI smoke입니다.
`verify-ops-click-e2e`는 실제 포인터 클릭으로 다음 흐름을 확인합니다.

- 대시보드 문제 원인 조치
- 채널 추가/상세
- 룰 패널 이동
- 사용자 상세
- 접근 요청 승인 채널 ID 입력과 invite 출력
- client dashboard

서버를 `MEDIA_SERVER_AUTH_USERS_FILE` override로 띄운 경우에는
`verify-ops-click-e2e --auth-users-file <path>`에도 같은 경로를 넘겨
접근 요청 fixture cleanup을 같은 users file에 적용합니다.

## Flaky verifier stabilization

아래 항목은 UI 기능 자체보다 브라우저 자동화/fixture 상태에 민감하므로,
실패 원인을 제품 회귀와 환경 문제로 분리합니다.

- Access approval: `verify-ops-click-e2e`는 실행 전 users file snapshot을 저장하고,
  승인 fixture를 만든 뒤 `finally`에서 snapshot restore와 server cleanup assertion을
  수행합니다.
- rule preview save: `verify-rule-ui`는 shared rule preview fixture helper를 사용하고,
  저장 전 validation 실패가 실제 write로 이어지지 않는지 확인합니다.
- clipboard fallback: `verify-ops-click-e2e`는 clipboard 실패와 capture stub을
  강제로 주입하고 각각 restore합니다. Browser Use clipboard 자체 오류는
  [browser-use-clipboard-diagnostics.md](./browser-use-clipboard-diagnostics.md) 기준으로
  제품 fallback 회귀와 분리합니다.
- Browser/Computer Use fallback: 수동 UI evidence는 Browser Use 직접 조작,
  Chrome 직접 조작, Computer Use visible UI 조작 순서로 시도하고, raw JSON/API-only
  확인을 수동 클릭 evidence로 쓰지 않습니다.
- fixture cleanup: `verify-fixture-cleanup-contracts`는 access request, EventRecord,
  audit/evidence fixture가 실행 후 복원/삭제되는지 정적으로 확인합니다.
- browser route smoke: click E2E는 path wait, scroll idle, browser error collector,
  overflow assertion을 같이 사용합니다. sandbox local fetch/CDP 제한으로 실패하면
  같은 명령을 권한 밖에서 재실행해 환경 제한과 제품 회귀를 분리합니다.

정적 guard:

```bash
./server.sh verify-flaky-verifiers
./server.sh verify-fixture-cleanup-contracts
```

`verify-ops-tables-layout`은 채널/룰/사용자 table을
1180/900/760/560/390/320/760/1180px 순서로 리사이즈하며
cell/action overflow를 확인합니다. 각 화면의 첫 상세 panel과 audit
filter/preset control도 같은 폭에서 부모 패널과 viewport 밖으로 밀리지 않는지
함께 확인합니다.
`verify-ops-rules-roundtrip`은 같은 서버의 이벤트 템플릿 API round-trip을 영상 재생 없이 확인합니다.
UI 전용 검증에서는 별도 터미널에서
`MEDIA_SERVER_AUTH_MODE=off ./server.sh foreground`를 실행하고,
포트가 다르면 `--http-base`를 명시합니다.
두 screenshot artifact를 비교할 때는 baseline/candidate의
`visual-regression-manifest.json`을 기준으로 파일을 매칭합니다.

```bash
./server.sh compare-ui-visual-baseline \
  --baseline-dir <baseline-artifact-dir> \
  --candidate-dir <candidate-artifact-dir> \
  --output-dir <diff-artifact-dir>
```

비교 결과는 `media-server.ui-visual-baseline-diff.v1` schema의
`visual-baseline-diff.json`과 `visual-baseline-diff.md`로 남습니다.
candidate 비교 정책은 `media-server.ui-visual-baseline-candidate-policy.v1`
schema로 report에 포함됩니다. 기본 정책은 missing, decode-error,
dimension-mismatch, threshold 초과 diff, candidate-only screenshot을 실패로
봅니다. 의도한 신규 screenshot은 `--allow-extra`로 허용하되
`decision=review`와 `reviewRequired=true`로 남기며, review도 gate 실패로
취급하려면 `--fail-on-review`를 사용합니다.
Visual artifact retention은 `media-server.ui-visual-artifact-retention.v1`
정책으로 manifest에 기록합니다. PR screenshot artifact는 기본 14 days,
release baseline으로 채택한 artifact는 45 days 보존을 기준으로 하며,
client/source/debug/raw JSON 비노출 검토 전에는 공유 보관소에 올리지 않습니다.
release baseline artifact role은 승인된 release/RC 화면 상태를 다음
candidate artifact와 비교하는 approved comparator입니다. 이 artifact는
public release asset 또는 candidate 통과 증빙이 아니며, baseline 교체 시에는
accepted baseline run, 교체 이유, 수동 비노출 검토 결과를 PR/릴리스 기록에
연결합니다.
baseline을 새로 채택하거나 교체할 때는
[UI Visual Release Baseline Approval Log](./ui-visual-release-baseline-approval-template.md)
템플릿에 manifest/index, diff report, 320/390/760/1180px 수동 검토,
client/viewer source/debug/raw 비노출 확인, 미실행 field smoke를 함께 남깁니다.
template presence와 CI 연결은 `./server.sh verify-ui-release-baseline-approval-log`로 확인합니다.
작성 형식 예시는 `test/fixtures/ui_visual_release_baseline_approval_log_sample.md`에
sample-only fixture로 고정하며, 실제 approval/pass evidence로 사용하지 않습니다.
UI visual regression issue는 `.github/ISSUE_TEMPLATE/ui_visual_qa.yml`
템플릿을 사용해 artifact directory, manifest/index, viewport, client/viewer
debug/source 비노출 확인, 미실행 검증을 함께 남깁니다.
`./server.sh write-ui-visual-qa-issue-links --artifact-dir <artifact-dir> --output <artifact-dir>/ui-visual-qa-issue-links.md`
를 실행하면 issue template의 artifact 영역에 붙일 manifest/index/baseline diff/screenshot 링크를 자동으로 생성합니다.
`./server.sh write-ui-visual-baseline-comment --diff-report <visual-baseline-diff.json> --output <comment.md>`
는 PR/issue comment에 붙일 decision, summary, attention item Markdown을 생성합니다.
preflight CI는 정적 fixture 기준 `media-server-ui-visual-baseline-diff` artifact에
`visual-baseline-diff.json`, `visual-baseline-diff.md`,
`visual-baseline-comment.md`를 함께 업로드해 PR에서 helper 출력 형식을 바로 확인하게 합니다.
같은 comment 본문은 `GITHUB_STEP_SUMMARY`에도 자동 게시되어 PR check summary에서 확인하며,
summary에는 Actions artifact download 링크도 함께 표시합니다.
보존 기간이 지난 artifact는 먼저
`./server.sh ui-visual-artifact-maintenance --artifact-root <artifact-root> --archive-dir <archive-dir> --report <report.json>`
로 dry-run report를 생성합니다. 실제 archive/cleanup은 `--apply`가 있을 때만 수행하며,
report schema는 `media-server.ui-visual-artifact-maintenance.v1`입니다.
Markdown report에는 PR 본문에 붙일 `PR Summary` 섹션이 포함되며 decision,
dry-run/apply mode, expired artifact 수, archive/cleanup 예정 수를 짧게 요약합니다.
`--apply`로 archive가 생성되면 archive directory에
`media-server.ui-visual-artifact-archive-index.v1` schema의
`ui-visual-artifact-archive-index.json`과 Markdown index도 함께 남깁니다.
index는 apply 실행 `history`를 누적하고, 같은 artifact directory 이름이 이미
archive에 있으면 숫자 suffix를 붙인 뒤 `duplicatePolicy`, `archiveSequence`,
`duplicateOf`로 중복 처리 내역을 남깁니다.
preflight CI는 같은 명령을 `--apply` 없이 실행하고
`media-server-ui-visual-maintenance-dry-run` artifact에 JSON/Markdown report를 업로드합니다.

### Release / Visual Baseline Readiness

release/PR 준비에서는 release close-out helper가 visual artifact policy와
screenshot review 체크포인트를 함께 요약합니다.

```bash
./server.sh verify-release-closeout-helper --dry-run --report <report.md> --json-report <report.json>
```

helper JSON report에는 `media-server.release-visual-baseline-automation.v1`
schema의 visual automation 요약이 포함됩니다. 이 요약은
`verify-docs-ui-assets`, `verify-ui-visual-artifact-index`,
`verify-ui-release-baseline-approval-log`, `write-ui-visual-baseline-comment`,
`ui-visual-artifact-maintenance`를 release 준비 체크리스트로 묶고,
preflight의 `media-server-release-closeout-helper-dry-run`,
`media-server-ui-visual-baseline-diff`,
`media-server-ui-visual-maintenance-dry-run` artifact를 함께 확인하게 합니다.
tag, push, GitHub Release, accepted baseline adoption, 320/390/760/1180px 수동
screenshot review는 실제 실행 전까지 pass로 쓰지 않고 manual/not-run 상태로 남깁니다.

VA rule/scenario 변경:

```bash
./server.sh verify-analysis-state
./server.sh verify-va-replay
./server.sh verify-va-events
./server.sh verify-ops-scenario-presets
```

Live VA event quality 변경에서는 state-dump/runtime debug와 Ops 표시를
함께 확인합니다.

- `/lab/analysis/taps/{tapId}/state-dump`의
  `analyticsState.debugState.scenarioTimeline[]`가 phase elapsed,
  cooldown, event emit/dedupe marker를 읽기 전용으로 제공하는지 확인합니다.
- `/ops/dashboard` Live VA Event Quality panel이 Scenario Timeline과
  TrackHealth issue grouping을 표시하고, scenario/rule/track/phase/issue
  filter 입력으로 같은 데이터를 좁혀 볼 수 있는지 확인합니다.
- Event POST payload, WebRTC DataChannel schema, SSE/WS metadata schema,
  RTSP/WebRTC media path는 변경하지 않습니다.

UI 변경:

```bash
./server.sh verify-rule-ui
./server.sh verify-ops-rules-roundtrip
./server.sh verify-ops-client-ui
./server.sh verify-ops-client-ui --screenshots
./server.sh verify-ops-root-cause-panel
./server.sh verify-client-dashboard-polish
./server.sh verify-ops-source-lifecycle
MEDIA_SERVER_VERIFY_AUTH_VISUAL=1 MEDIA_SERVER_VERIFY_AUTH_SCREENSHOTS=1 ./server.sh verify-auth-bootstrap
```

UI 변경 검증에서는 기본 추가 RTSP/WebRTC source 영상이나 codec matrix를 쓰지 않습니다.
v1.2.0에서 도입되어 v1.3.0에서도 유지되는 UI visual regression gate는 ERP/운영 콘솔형 visual refresh 기준을 함께 봅니다.
즉, 기능 selector만 통과하면 끝이 아니라 compact product shell, nav/account header,
metric/card/table/form/badge 밀도, client source/debug 비노출, 모바일 overflow를 같은
artifact에서 확인합니다.
화면 selector/API 계약만 확인할 때는 서버를 띄운 뒤 아래 순서로 확인합니다.

- `verify-ops-client-ui`
- `verify-ops-click-e2e`
- `verify-ops-tables-layout`
- `verify-rule-ui`
- `verify-ops-rules-roundtrip`
- `verify-ops-root-cause-panel`
- `verify-client-dashboard-polish`
- `verify-ops-source-lifecycle`

WebRTC/RTSP streaming 동작이 바뀐 경우에만
별도 WebRTC/stream 변경 명령을 실행합니다.

Ops/Client shell 변경 확인 포인트:

- product shell selector 유지
- client debug/source 비노출
- `/client/api/views`, 단일 view, dashboard, events, metadata 응답의 민감 key 비노출
- `/client/live`와 `/ops/rules` 미리보기의 `raw/va-overlay/va-rule` payload
- channel/rule URL 복사 버튼의 selector와 출력 URL 생성
- `/ops/dashboard` 문제 원인 패널의 source lifecycle, stale, reconnect, auth/config 다음 조치 버튼
- 채널/룰/사용자 공통 table helper 적용과 모바일 320/390/760px action/detail overflow 없음

추가 참고:

- Auth route smoke는 격리된 Source/View registry 파일을 사용합니다.
- `--screenshots` 옵션은 `/ops/home`, `/ops/dashboard`, `/ops/rules`,
  `/ops/sources`, `/ops/users`, `/client/live`, `/client/dashboard`를
  기본 320/390/760/1180px 폭으로 열어 overflow와 screenshot을 남깁니다.
  release gate나 단계 종료 보고에서는 `--output-dir`로 artifact 경로를 고정합니다.
  예: `--output-dir /tmp/media_server_v120_p0_02_screenshots`
  통과 시 같은 디렉터리에 `visual-regression-manifest.json`과 `index.md`를
  생성합니다. manifest schema는 `media-server.ui-visual-artifact-index.v1`이며
  page/selector가 있는 기본 screenshot과 ONVIF hint/preview 같은 보조 screenshot을
  같은 index에서 확인합니다.
- 채널/사용자 변경 이력 필터는 table layout과 별도 계약으로 봅니다.
  320/390px에서 검색/작업자/사용자/대상/동작/시작/종료/페이지 크기
  control이 감사 로그 패널 폭 안에 있어야 하며, 시작/종료 date/time
  input이 viewport 밖으로 밀리면 실패입니다.
- 실제 Chrome DevTools 수동 리뷰는 자동 overflow 결과와 별개로 아래
  체크리스트를 닫습니다.
  PR을 여는 경우 같은 항목을 `.github/PULL_REQUEST_TEMPLATE.md`의
  `UI Visual Review` 섹션에 artifact directory와 함께 남깁니다.
  - [ ] Device toolbar를 320px로 맞추고 Ops nav, 계정/로그아웃,
    채널/룰/사용자 table action, client live/dashboard header가 좌우를 침범하지 않는지 확인
  - [ ] Device toolbar를 390px로 맞추고 위 항목과 변경 이력 시작/종료 입력,
    룰 URL copy 버튼 줄바꿈이 서로 겹치지 않는지 확인
  - [ ] Device toolbar를 760px로 맞추고 nav/account 2열 배치,
    dashboard 카드 폭, channel/rule URL copy 버튼 높이가 같은 규칙으로 보이는지 확인
  - [ ] 1180px에서 product shell의 brand/nav/account가 한 줄 콘솔 header로 유지되고,
    nav label이 잘려 기능명을 잃지 않는지 확인
  - [ ] `verify-ops-client-ui --screenshots` 산출물 경로를 리뷰 기록에 남김
  - [ ] `visual-regression-manifest.json` schema가
    `media-server.ui-visual-artifact-index.v1`인지 확인
  - [ ] manifest retention policy schema가 `media-server.ui-visual-artifact-retention.v1`이고
    PR artifact 14 days, release baseline 45 days 보존 기준을 따르는지 확인
  - [ ] `index.md`가 모든 screenshot artifact를 링크하는지 확인
  - [ ] client/viewer screenshot에 source URL, Developer URL, raw JSON,
    debug counter, BBox diagnostics, rule/profile editor가 노출되지 않는지 확인
- `webrtc_http_server.cpp`에서 `product_ui_page_scripts.*`로 UI 소유권을 옮기는
  구조 변경은 `./server.sh build`,
  `./server.sh verify-auth-routes`,
  `./server.sh verify-ops-client-ui`를 함께 실행합니다.
- Auth shell 변경은 기존 auth workflow에
  `MEDIA_SERVER_VERIFY_AUTH_VISUAL=1`,
  필요하면 `MEDIA_SERVER_VERIFY_AUTH_SCREENSHOTS=1`을 붙여 확인합니다.
  Auth screenshot smoke도 320/390/760/1180px 기준으로
  `visual-regression-manifest.json`과 `index.md`를 생성합니다.

```bash
BASE=http://127.0.0.1:8080
for path in \
  /ops /ops/home /ops/dashboard /ops/sources /ops/rules /ops/events /ops/users \
  /client /client/live /client/dashboard
do
  curl -fsS -D "/tmp/media-server-ui${path//\//_}.headers" \
    -o "/tmp/media-server-ui${path//\//_}.html" \
    "${BASE}${path}"
done

if grep -E 'href="/(lab/runtime/status|lab/analysis/event-post/status|lab/analysis/events/records|ops/api|client/api)' /tmp/media-server-ui_ops*.html
then
  echo "[fail] ops shell exposes internal JSON/API href"
  exit 1
fi
```

확인 기준:

- `/ops`, `/ops/home`, `/ops/dashboard`, `/ops/sources`,
  `/ops/rules`, `/ops/users`는 HTML을 반환하고
  공통 Ops Console header/nav를 유지합니다.
  Primary nav는 홈, 대시보드, 채널, 룰, 사용자(admin),
  클라이언트 미리보기 순서입니다.
- `/ops/dashboard`의 Live VA Event Quality panel은 active analysis tap이
  있을 때 Scenario Timeline과 TrackHealth issue grouping/filter를 표시하고,
  없을 때는 empty 상태를 보여줍니다. 이 패널은 `/lab/analysis/*`
  state-dump/metrics를 operator debug summary로 읽을 뿐 event schema나
  media path를 바꾸지 않습니다.
- `/ops/events`는 primary nav에서 숨긴 직접/진단 route입니다.
  독립 제품 탭으로 취급하지 않습니다.
  이벤트 조건은 룰에서 설정하고 운영 요약은 대시보드에서 확인합니다.
- `/ops/dashboard`와 `/ops/rules`는 Lab iframe이나
  `/lab/rules?embed=1`을 포함하지 않습니다.
  대시보드는 `/ops/api/runtime/status`,
  룰 화면은 `/ops/api/rules/catalog`,
  숨김 이벤트 상태는 `/ops/api/events/status`를 사용합니다.
  `/ops/rules` detail panel은 `opsVaRuleForm`,
  `opsEventRuleForm`, `opsProfileForm` 네이티브 폼으로 열립니다.
  `/ops/rules`는 `rule/profile/source` 검색 입력과 `#q=` hash를 지원합니다.
  `/ops/dashboard` 문제 원인 패널은 source lifecycle, stale tap,
  reconnect/cleanup, auth/config 항목을 표시하고 다음 조치 버튼으로
  source 재검증, registry diff, Event/evidence 진단, auth/config 확인,
  log correlation 필터를 실행합니다.
  Live Source Health 항목은 `/ops/api/source-health`를 사용하고
  운영자는 대시보드에서 상태 요약과 다음 조치를 확인합니다.
  내부 진단 JSON은 제품 화면에 직접 노출하지 않고 API/검증 명령에서만 확인합니다.
- `/ops/sources`는 숫자 채널 table을 먼저 보여줍니다.
  상단 안내 카드와 detail form에서
  `외부 WHEP pull`과 `Published WebRTC 소스` 차이를 설명해야 합니다.
  ONVIF 채널은 다른 source 유형과 같은 테이블 규칙으로 표시하고,
  Live/VA URL copy 영역에 `ONVIF RTSP`, `ONVIF WHEP` 버튼을 표시합니다.
  Live URL/VA URL 복사 버튼은 RTSP/WHEP 값을 실제 클립보드에 복사해야 합니다.
  rendered HTML에 `AppendTableHead(` 같은 템플릿 문자열이 새면 안 됩니다.
  source 원본 URL은 ops 화면에만 표시합니다.
- 채널/룰/사용자 table은 `ops-responsive-table`, `ops-row-actions`,
  `ops-detail-panel` 공통 class/helper를 사용하고, 모바일 390px과
  desktop resize에서 cell/action 내용이 자기 칸을 침범하지 않아야 합니다.
- `/ops/users`는 사용자 목록 table과 접근 요청 table을 보여줍니다.
  사용자 추가/수정 editor는 접힘 영역으로 열립니다.
  Access request 승인 UI는 password setup invite token/setup URL을
  승인 응답에서 한 번만 표시합니다.
  거절은 request 상태만 바꿉니다.
  `passwordHash`, `passwordHistory`, `tokenHash`, invite `tokenHash`를 노출하지 않습니다.
- `/client/live`, `/client/dashboard`는 client shell을 유지합니다.
  source URL, Developer URL, BBox diagnostics, 내부 진단 JSON,
  rule/profile editor를 노출하지 않습니다.
  Client Events tab은 primary nav에서 제거합니다.
- `/lab`, `/lab/rules`, `/lab/import` 화면 route는 404로 닫고, 개발/검증 API는 `/lab/analysis/*`에서만 유지합니다.

WebRTC/stream 변경:

```bash
./server.sh verify-codecs
./server.sh verify-webrtc-ice
```

Close-object tracker diagnostic/enforce 비교는 기본 tracking 정책 변경 여부와
event/scenario side effect를 함께 확인합니다.

```bash
./server.sh compare-close-object-tracker
```

리포트의 `Quality Gate` 섹션은 risk 증가, event/scenario 불변,
default-on 후보 여부, 권고를 요약합니다.

초기 `/webrtc/test` 화면에 의존하던 다채널 브라우저 harness는 제품 UI 정리 후
실행하지 않습니다. 긴 RTSP/WebRTC 다채널 재생 검증은 별도 제품 UI harness가
준비될 때까지 기본 안정성 테스트에서 제외합니다.

Auth 변경:

```bash
./server.sh verify-auth-bootstrap
./server.sh verify-auth-users
./server.sh verify-auth-routes
```

위 세 명령은 임시 users file과 격리 포트에서 auth 서버를 띄워
setup/login/session/user/route smoke를 자동으로 확인합니다.
자동 auth smoke, 로컬 QA, 수동 smoke의 표준 테스트 계정 비밀번호는
`qweasd0-`로 통일합니다.
이 규칙은 검증 재현성을 위한 것이며, 제품 기본 admin 비밀번호가 아닙니다.
수동으로 세부 상태를 확인할 때는 아래 curl 흐름을 사용합니다.

```bash
MEDIA_SERVER_AUTH_MODE=auto \
MEDIA_SERVER_AUTH_USERS_FILE=/tmp/media-server-bootstrap-users.json \
  ./server.sh foreground
curl -fsS -D - -o /tmp/root-setup.out 'http://127.0.0.1:8080/'
curl -fsS 'http://127.0.0.1:8080/auth/whoami'

MEDIA_SERVER_AUTH_MODE=off ./server.sh foreground
curl -fsS 'http://127.0.0.1:8080/auth/whoami'

MEDIA_SERVER_AUTH_MODE=token \
MEDIA_SERVER_AUTH_ADMIN_TOKEN=admin-token \
  ./server.sh foreground
curl -fsS -H 'Authorization: Bearer admin-token' 'http://127.0.0.1:8080/auth/whoami'

MEDIA_SERVER_AUTH_MODE=session \
MEDIA_SERVER_AUTH_USERS_FILE=/path/to/users.json \
MEDIA_SERVER_AUTH_LOGIN_MAX_FAILURES=5 \
MEDIA_SERVER_AUTH_LOGIN_LOCKOUT_SECONDS=300 \
  ./server.sh foreground
curl -fsS 'http://127.0.0.1:8080/login'
curl -fsS -c /tmp/media-server.cookies \
  -d 'username=operator1&password=qweasd0-' \
  'http://127.0.0.1:8080/login'
curl -fsS -b /tmp/media-server.cookies 'http://127.0.0.1:8080/auth/whoami'
curl -fsS -b /tmp/media-server.cookies -X POST 'http://127.0.0.1:8080/logout'

MEDIA_SERVER_AUTH_MODE=session \
MEDIA_SERVER_AUTH_USERS_FILE=/path/to/users.json \
  ./server.sh auth-user list
```

확인 기준:

- Auto mode: users file이 없거나 admin passwordHash가 없으면 `/setup`으로 이동합니다.
- `/auth/whoami`: setup required 상태에서 `setupRequired=true`를 반환합니다.
- Auth off: dev admin principal을 반환합니다.
- Token mode: admin/operator/viewer/integrator token별 role과 scope를 반환합니다.
- 누락/invalid token: `401`
- Session/auto setup 완료 후:
  `/login` 렌더링, 로그인 성공 후 `/auth/whoami` principal 반환,
  logout 후 cookie principal 제거, 잘못된 로그인 `401` 또는 실패 메시지를 확인합니다.

Password policy smoke:

- 약한 비밀번호 거부
- username 포함 비밀번호 거부
- 3종류 8자 이상 허용
- 2종류 조합 최소 10자 허용
- password history 재사용 거부

Lockout smoke:

- 실패 N회 후 lockout 메시지와 `lockedUntil` 저장
- lockout 만료 후 정상 로그인
- TTL/idle timeout 만료 후 `/auth/whoami` 401

Admin user smoke:

- admin만 `/ops/users`와 `/ops/api/users` 접근 가능
- viewer는 `403`
- low-level CLI add/list/reset/disable 동작 확인
- auth users file mode `600` 확인

Product UI smoke:

- `/ops/users` 사용자 목록
- 계정 라이프사이클 정책 영역
- 비밀번호 초기화 상세 패널
- 접근 요청 table
- 접힘 editor selector
- `/setup`, `/login`, `/password/change`, `/invite/setup`,
  `/client/request-access` auth shell selector

Invite/request smoke:

- invite token 원문은 생성 응답에서 한 번만 표시하고 hash만 저장
- invite `expiresAt`과 setup URL은 운영자 응답에만 표시
- pending invite와 approved request가 user-only 저장 후에도 users file에 유지
- 기존 enabled user invite가 수락 전 role/scope/session을 바꾸지 않음
- access request approve가 invite setup 전 user row를 만들지 않음
- access request reject가 rejected 상태로 유지
- invite 수락 후 이전 session 폐기
- password reset 후 `mustChangePassword=true`와 기존 session 회수
- disable은 login/session 차단, restore는 lockout/실패 횟수 초기화

Public access request abuse smoke:

- 중복 pending `409`
- unsafe viewId `400`
- 4KiB 초과 body `413`
- peer rate limit `429`

Route smoke는 별도 registry fixture로
unauth/viewer/readonly-operator/integrator/public access request matrix를 확인합니다.
`?token=` query는 개발 smoke용으로만 사용하고,
운영 검증에서는 Bearer header를 우선합니다.

Route smoke:

```bash
MEDIA_SERVER_AUTH_MODE=off MEDIA_SERVER_UI_DEFAULT_HOME=lab ./server.sh foreground
curl -fsS -D - -o /tmp/root.out 'http://127.0.0.1:8080/'

MEDIA_SERVER_AUTH_MODE=off MEDIA_SERVER_UI_DEFAULT_HOME=client ./server.sh foreground
curl -fsS -D - -o /tmp/root.out 'http://127.0.0.1:8080/'

MEDIA_SERVER_AUTH_MODE=token \
MEDIA_SERVER_AUTH_ADMIN_TOKEN=admin-token \
MEDIA_SERVER_AUTH_OPERATOR_TOKEN=operator-token \
MEDIA_SERVER_AUTH_VIEWER_TOKEN=viewer-token \
  ./server.sh foreground
curl -fsS -D - -o /tmp/root-admin.out -H 'Authorization: Bearer admin-token' 'http://127.0.0.1:8080/'
curl -fsS -D - -o /tmp/root-viewer.out -H 'Authorization: Bearer viewer-token' 'http://127.0.0.1:8080/'
curl -fsS -D - -o /tmp/root-unauth.out 'http://127.0.0.1:8080/'
curl -fsS -i -H 'Authorization: Bearer viewer-token' 'http://127.0.0.1:8080/ops'
```

Root/route 확인 기준:

- Auth off 기본 home: `/ -> /ops/home`
- Auth off + `client` home: `/ -> /client/live`
- Admin/operator token: `/ -> /ops/home`
- Viewer token: `/ -> /client/live`
- 미인증 auth-on 요청: `/ -> /login`
- Viewer의 `/ops` 접근: `403`
- `/lab` 화면 route: `404`

Ops 권한 기준:

- `/ops`: admin/operator role과 `ops:read` scope 모두 필요
- 주요 `/ops/api/*` read route: unauth `401`, viewer `403`
- Readonly operator 읽기 허용:
  `/ops/api/sources`, `/ops/api/runtime/status`,
  `/ops/api/rules/catalog`, `/ops/api/events/status`
- Readonly operator 차단:
  `/ops/api/users`, invite, access request review, source/view 변경
- `/ops/api/sources`, `/ops/api/views` 변경: `source:write`
- `/lab/analysis/*` rule/profile/vaRule 변경: `rule:write`

Client/integrator 기준:

- `/client/api/views`: viewer에게 할당된 PublishedView만 반환
- 다른 view의 dashboard/WebRTC wrapper: `403`
- Integrator `/client` shell: `403`
- Integrator `/client/api/views`: live view 목록 노출 없음
- Integrator events/metadata API: scope가 있으면 `200`
- `POST /client/api/access-requests`: public route로 유지하되 abuse guard 적용

Generic media route 기준:

- Auth on 직접 `/webrtc/session`, `/whep`, `/whip/publish`: 미인증 `401`, viewer `403`
- `/ws/va-metadata`: 미인증 `401`, viewer `403`
- Auth off 개발 모드: 기존 검증 명령으로 계속 확인

## 장기 테스트 명령

### RC 전용 Release Gate

아래 두 검증은 상시 실행하지 않습니다. release candidate 전,
RTSP/GStreamer/WebRTC media path 변경 후,
SharedStream/VA metadata/dashboard/SSE/WS fanout 변경 후,
또는 30분 predev에서 active RSS high-water가 이전 기준보다 커졌을 때만
명시적으로 실행합니다.

```bash
./server.sh verify-predev --soak-minutes 120
./server.sh verify-va-runtime-console-longrun --duration-minutes 120 --clients 1 --include-sidechannel --include-dashboard --include-rtsp --idle-after-cleanup-minutes 30
./server.sh rc-release-checklist \
  --predev-summary /tmp/media_server_predev_summary.json \
  --predev-report /tmp/media_server_predev_report.md \
  --runtime-summary /tmp/media_server_va_runtime_summary.json \
  --runtime-report /tmp/media_server_va_runtime_report.md \
  --output /tmp/media_server_rc_release_checklist.md \
  --html-output /tmp/media_server_rc_release_checklist.html \
  --artifact-name media-server-rc-gate \
  --history-dir /tmp/media_server_rc_gate_history
```

보존 위치 정책:

- `/tmp` 경로는 local-only staging evidence입니다. release report에는 실행 경로로
  남길 수 있지만, 보존 완료로 쓰지 않습니다.
- release-grade 보존 위치는 `artifacts/rc-gate/`를 업로드한
  `media-server-rc-gate` GitHub Actions artifact이거나, `rc-artifact-archive`로
  생성한 외부 S3/NAS archive입니다.
- 보존 완료 evidence에는 summary JSON, Markdown report, checklist Markdown/HTML,
  history index, artifact retention days를 함께 남깁니다.
- 외부 archive를 쓰면 `external-artifact-manifest.json`, `SHA256SUMS`, root
  `index.json`, `index.md`를 보존 evidence로 연결합니다.
- 장기 테스트가 통과했더라도 durable artifact가 없으면 release checklist에는
  `local-only` 또는 `NOT PRESERVED`로 기록합니다.

CI에서는 `.github/workflows/rc-release-gate.yml`을 수동 실행합니다.
기본 입력값은 긴 검증을 실행하지 않고 `CHECK` checklist만 생성합니다.
RC 판정 시 `run_predev_120=true`, `run_va_runtime_120=true`로 실행하면
`artifacts/rc-gate/` 아래 summary/report/checklist Markdown/HTML을 모아
`media-server-rc-gate` GitHub Actions artifact로 업로드합니다.
Checklist 생성기는 `--history-dir artifacts/rc-gate/history`를 함께 사용해
run별 `record.json`, summary/report/checklist 사본, `index.json`,
`index.md`, `index.html`을 자동으로 갱신합니다. RC 리뷰에서는 root의
`rc-release-checklist.md/html`과 history index를 같이 확인합니다.
GitHub artifact 외부 보관이 필요한 환경은 S3/NAS를 runner에 마운트한 뒤
workflow input `external_artifact_dir`를 지정합니다. 이 경우 workflow가
다음 명령을 실행해 checksum manifest와 외부 index를 함께 남깁니다.

```bash
./server.sh rc-artifact-archive \
  --source-dir artifacts/rc-gate \
  --destination-dir /mnt/media-server-rc-gate \
  --run-id "${GITHUB_RUN_ID:-local}" \
  --retention-days 30
```

외부 보관 디렉터리에는 run별 `external-artifact-manifest.json`,
`SHA256SUMS`, root `index.json`, `index.md`가 생성됩니다. `retention-days`가
0보다 크면 같은 디렉터리의 오래된 run folder를 manifest 기준으로 정리합니다.
실제 RC에서는 `runner_label`을 sample video, YOLO model, labels가 준비된
self-hosted macOS runner로 지정하는 것을 권장합니다. Workflow는 실행 전에
`video/sample_h264.mp4`, `video/va_four_scene_sample.mp4`,
`MEDIA_SERVER_ANALYSIS_MODEL` 또는 `models/yolo11n.onnx`,
`MEDIA_SERVER_ANALYSIS_LABELS` 또는 `models/coco.names`를
`artifacts/rc-gate/asset-manifest.json`에 기록합니다.
`require_va_assets=true`이고 120분 gate를 실행하는 경우 누락된 asset은
RC gate 실패로 처리합니다. 결과 artifact 보존 기간은
`artifact_retention_days` 입력값과 checklist의 `artifactRetentionDays`에
같이 남깁니다.

RC 전용 gate가 기본 smoke에 섞이지 않았는지는 다음 명령으로 확인합니다.

```bash
./server.sh verify-rc-release-gate
```

event POST 반복 안정성:

```bash
./server.sh verify-event-post-longrun --iterations 3 --modes schema,recovery
```

30분 이상 사전 안정성 검증:

```bash
./server.sh verify-predev --soak-minutes 30
```

120분 predev는 상시 검증이 아니라 release candidate 또는 고위험 변경 gate입니다.

실행 조건:

- release candidate 전
- RTSP/GStreamer/WebRTC media path 변경 후
- SharedStream/VA metadata/dashboard/SSE/WS fanout 변경 후
- 30분 predev에서 active RSS high-water가 이전 기준보다 커졌을 때

```bash
./server.sh verify-predev --soak-minutes 120
```

긴 VA event/tracker 검증:

```bash
./server.sh verify-va-events --long
./server.sh verify-tracker-stability --long --overlap-focus
```

rule-level tracker policy를 직접 태워야 하면 `verify-tracker-stability`가 임시
event rule/vaRule을 만들고 `?vaRule=<id>` 경로로 tap을 붙입니다. 이 경로는
file/url/source override와 섞지 않으며, 종료 시 임시 rule을 정리합니다.

```bash
./server.sh verify-tracker-stability --tracker-policy kalman-lite
./server.sh verify-tracker-stability --tracker-policy bytetrack
```

Close-object guard 검증은 mode별 목적을 분리합니다.

| 모드 | 확인할 것 | 통과 기준 |
| --- | --- | --- |
| `off` | 일반 회귀 baseline | 기존 event/scenario 결과 유지 |
| `diagnostic` | metadata/UI 진단 노출 | score와 tracking 결과 변경 없음 |
| `enforce` | opt-in 보정 후보 비교 | ID continuity 지표만 비교 |

기본 비교 리포트는 같은 sample을 `off`, `diagnostic`, `enforce` 순서로 실행합니다.
기본 실행은 mode별 격리 서버를 띄워
`MEDIA_SERVER_ANALYSIS_TRACKING_CLOSE_OBJECT_GUARD_MODE`가 실제 서버 프로세스에
적용됐는지 함께 확인합니다.
mode별 tracker summary JSON과 Markdown report는
`/tmp/media_server_close_object_tracker_*` 아래에 남깁니다.

```bash
./server.sh compare-close-object-tracker \
  --file imports/va_tracking_event_1280x720_30fps_h264.mp4 \
  --modes off,diagnostic,enforce
```

Kalman-lite 또는 ByteTrack opt-in tracker에서 같은 guard 비교를 보려면
`--tracker-policy kalman-lite` 또는 `--tracker-policy bytetrack`을 추가합니다.
ByteTrack fixture matrix는 field-driving sample의 짧은 detection gap을 내부
lost buffer floor로 흡수할 수 있지만, matrix 통과 또는 warning 결과를 제품
default-on 승격으로 해석하지 않습니다.
Re-ID assist opt-in까지 같이 태우는 경우에는 `--reid-policy assist`를 함께
지정합니다. 이 옵션은 임시 vaRule의 `analysis.trackingPolicy.reid=assist`를
검증하기 위한 것이며, Re-ID를 default tracker나 default-on 제품 판단으로
승격하지 않습니다.

```bash
./server.sh verify-tracker-stability --tracker-policy bytetrack --reid-policy assist
./server.sh compare-close-object-tracker \
  --tracker-policy bytetrack \
  --reid-policy assist \
  --history-dir /private/tmp/media_server_v140_reid_assist_warning_trend
```

단일 비교에 `--history-dir`를 지정하면 summary/report 사본과 Markdown/JSON index가
누적됩니다. 이 index는 warning reason count와 recommendation 추세를 보기 위한
것이며, 제품 default-on 승인 또는 Re-ID assist 기본 활성화 근거가 아닙니다.
보존할 수 있는 report/index 파일과 보존하지 않는 raw media/image 범위는
[Close-object Report Archive Policy](./close-object-report-archive-policy.md)를
따릅니다.

OC-SORT 후순위 benchmark boundary는 별도 정적 verifier로 확인합니다. 이 검증은
OC-SORT가 `analysis.trackingPolicy.tracker`, `/ops/rules` UI,
`ObjectTrackerKind`, tracker stability/compare harness에 runtime tracker로
추가되지 않았고, 실제 OC-SORT algorithm 구현 또는 benchmark 실행이 후속 Phase
후보로만 남아 있는지 확인합니다.

```bash
./server.sh verify-oc-sort-benchmark-boundary
```

v1.5.0 OC-SORT experimental sandbox는 같은 runtime 승격 금지 경계를 유지하면서
`compare-close-object-tracker` report에 `manifest-only` sandbox metadata만 남깁니다.
이 sandbox는 OC-SORT를 실행하지 않고, `--tracker-policy` 허용값도
`lite`, `kalman-lite`, `bytetrack`에 머뭅니다.

```bash
./server.sh verify-v150-oc-sort-experimental-sandbox
./server.sh compare-close-object-tracker --list-experimental-sandboxes
./server.sh compare-close-object-tracker --fixture-matrix --experimental-sandbox oc-sort --tracker-policy bytetrack --max-fixtures 1
```

BoT-SORT/DeepSORT research boundary도 별도 정적 verifier로 확인합니다. 이 검증은
BoT-SORT/DeepSORT가 `analysis.trackingPolicy.tracker`, `/ops/rules` UI,
`ObjectTrackerKind`, tracker stability/compare harness에 runtime tracker로
추가되지 않았고, Re-ID/model/privacy/bundle 검토가 후속 Phase 후보로만 남아
있는지 확인합니다.

```bash
./server.sh verify-bot-sort-deepsort-research-boundary
```

이미 실행 중인 서버를 기준으로만 비교해야 하면 `--use-existing-server --http-base <url>`을 사용합니다.
이 경우 리포트의 `mode effective`가 `yes`인지 확인해야 합니다.

내장 fixture matrix는 명시적으로 실행합니다.

```bash
./server.sh compare-close-object-tracker --list-quality-presets
./server.sh compare-close-object-tracker --list-fixtures
./server.sh compare-close-object-tracker \
  --fixture-matrix \
  --fixture-ids tracking-event,tracking-event-long \
  --modes off,diagnostic,enforce
```

matrix 실행은 fixture별 `summary.json`/`report.md`와 상위
`matrix-summary.json`/`matrix-report.md`를 함께 남깁니다.
`--use-existing-server`를 쓰는 경우 `/lab/analysis/taps`가 JSON으로 응답하려면
기존 서버의 `MEDIA_SERVER_AUTH_MODE`가 `off`이거나 해당 `/lab` API를
호출 가능한 인증 상태여야 합니다.
회차별 품질 추세를 남겨야 하면 `--history-dir <dir>`를 함께 지정합니다.
이 경우 run별 `matrix-summary.json`/`matrix-report.md` 사본과 root
`index.json`/`index.md`가 갱신됩니다.
history index는 `defaultOnDecision`, `productDefaultOn`, `candidateCount`,
`defaultOnReason`을 함께 남겨 `matrix-ok`와 제품 default-on 결정을 분리합니다.
단일 비교의 quality preset 기본값은 `strict`입니다.
내장 matrix fixture는 close-object sample과 control sample의 live polling
특성이 달라 fixture별 `qualityPreset`을 사용합니다. close-object sample은
`close-object-live`, synthetic control sample은 `control-live`, vehicle-heavy
field-like sample은 `field-driving-live` 기준으로 observed risk 허용치를
분리해 판정합니다. 여기에는 실제 주행 데이터 특성을 반영한
`field-new-york-driving`(vehicle-heavy control-like)도 포함됩니다.
이 fixture는 baseline 자체의 vehicle-heavy fragmentation 난이도와 guard mode
delta를 분리하기 위해 fixture 전용 tracker-stability 상한을 전달합니다.
`classWhitelist`는 fragmentation 계산뿐 아니라 observed issue counter와
close-object diagnostic 집계에도 적용합니다. `trackingIssueCounts`는
polling snapshot 반복 관측 합계가 아니라 `type/class/trackId` 기준 고유 이슈
수이며, 반복 관측 raw count는 `trackingIssueObservationCounts`에 따로 남깁니다.
이 상한은 `verify-tracker-stability` 명령 통과 기준일 뿐이며, matrix의
event/scenario stable 판정은 완화하지 않습니다. hard risk는 fixture별
`riskTolerances`에 명시한 작은 live polling jitter 안에서만 통과시킵니다.
필요하면 단일 비교에서
`--quality-preset strict|close-object-live|control-live|field-driving-live`로 같은 기준을
명시할 수 있습니다.
파일이 없는 fixture는 기본적으로 skipped이며, release gate처럼 누락을 실패로
보고 싶으면 `--fail-on-missing-fixtures`를 사용합니다.

정기/CI용 전체 fixture gate는 전용 명령을 사용합니다.

```bash
./server.sh verify-close-object-fixture-matrix
./server.sh verify-close-object-fixture-matrix \
  --history-dir /tmp/media_server_close_object_matrix_history
```

이 명령은 모든 내장 fixture를 실행하고 fixture 파일 누락을 실패로 처리합니다.
정기 gate는 default-off와 diagnostic 관찰 경계 확인을 위해 `off,diagnostic`
mode만 비교합니다. `enforce` mode는 opt-in 실험 비교이며 clean gate에 섞지
않습니다.
또한 `judgement=hold`를 hard gate 실패로 처리합니다. `hold`는 event/scenario
stable delta 또는 주요 association risk 증가가 있어 default-on 검토를 중단해야
한다는 뜻입니다. 관찰용으로 `hold` report까지 모으려면
`compare-close-object-tracker --fixture-matrix`를 사용합니다.
live polling 변동성을 분리하려면 반복 실행 통계를 함께 봅니다.

Matrix gate 상태 정의:

| 상태 | gate 의미 | default-on 해석 |
| --- | --- | --- |
| `fail` | mode 실행 실패, mode 미적용, fixture 누락 같은 검증 자체 실패 | 제품 판단 중단 |
| `hold` | event/scenario stable delta 또는 hard risk 증가 | default-on 검토 중단, guard opt-in 유지 |
| `warning` | observed risk/counter 변동 또는 반복 검증 필요 | 안정 판정 아님, default-on 근거로 사용 금지 |
| `pass` + `defaultOnCandidate=false` | hard gate는 통과했지만 후보 조건 부족 | default-off 유지, 추가 sample 필요 |
| `pass` + `defaultOnCandidate=true` | 해당 fixture 단독으로 후보 조건 충족 | 제품 default-on 완료 아님, fixture별 후보로만 기록 |

`verify-close-object-fixture-matrix`의 성공은 clean gate 확인용입니다.
`compare-close-object-tracker --fixture-matrix`의 성공은 관찰 리포트 생성 성공일 수
있으므로 `matrix-ok`, fixture `judgement`, `defaultOnCandidate`를 따로 읽어야 합니다.
`matrix-ok`는 명령/gate 결과이며 제품 default-on 승인 값이 아닙니다. matrix 출력의
`[matrix-default-on-decision]`과 `[matrix-product-default-on]`를 함께 확인해
`not-promoted` 또는 `review-required`를 구분합니다.
`warning`은 안정적이라는 뜻이 아니며, close-object guard default-on이나 Re-ID
제품 완료 근거로 쓰지 않습니다.
`enforce` mode까지 비교하려면 다음처럼 명시적으로 실행하고, 결과는 제품
default-on gate가 아니라 opt-in risk report로 해석합니다.

```bash
./server.sh compare-close-object-tracker \
  --fixture-matrix \
  --modes off,diagnostic,enforce
```

2026-05-16 재검토의 fixture별 후보 표는
[`reid-fixture-default-on-candidates.md`](./reid-fixture-default-on-candidates.md)에
분리합니다.

```bash
./server.sh compare-close-object-tracker \
  --file imports/va_tracking_event_1280x720_30fps_h264.mp4 \
  --modes off,diagnostic,enforce \
  --repeat 3
```

반복 실행 리포트의 `Repeat Metric Stats`는 observed risk key별
count, mean, stdev, variance, min, max를 표시합니다.

비교 기준:

| 범주 | 지표 |
| --- | --- |
| association | associationConfidence 최저값, score margin |
| overlap/이동 | overlapRisk 최대값, center jump 최대값 |
| lifecycle | lost/reacquired, missed-frame-spike, direction-change-spike |
| ID 안정성 | tracker association risk, fragmentation, overlap fragmentation |
| 관찰 지표 | idSwitchRiskScore, maxOverlapRisk, lost/reacquired, spike count, stale PTS/PTS regression |
| guard 동작 | guardDecision count, closeObjectGuardApplied/rejected count |
| 제품 영향 | event/scenario stable delta |
| 관찰 참고 | event/scenario observed counter delta |

판정 규칙:

- `diagnostic`은 score 변경이 없어야 합니다.
- `enforce`는 opt-in 보정 후보로만 봅니다.
- event/scenario stable delta가 있으면 default on 전환 금지입니다.
- `eventsEmitted`, `eventsDeduped`, cleanup count 같은 observed counter delta는 live polling 흔들림이 있어 참고값으로만 봅니다.
- hard risk non-increasing 판정은 close-object guard의 structural association 결과인 `trackerAssociationRiskScore`, `fragmentationRatio`, `overlapFragmentationRatio` 기준이며, fixture preset의 `riskTolerances`를 적용합니다.
- `idSwitchRiskScore`, `maxOverlapRisk`, `lost/reacquired`, spike count는 live polling 변동성이 있어 observed risk로 따로 해석합니다.
- observed risk가 증가하면 default-on 후보로 쓰지 않고 반복/fixture 검증으로 넘깁니다.
- replay/event 결과가 흔들려도 default on 전환 금지입니다.
- default on은 여러 fixture와 현장 샘플에서 ID continuity 개선과 event 결과 무변화가 함께 확인된 뒤에만 검토합니다.
- privacy/default-off gate는 `verify-reid-advanced-tracking`으로 별도 확인합니다.
- v1.5.0 명시 opt-in guard는 `verify-v150-opt-in-tracking-policy`로 확인합니다.
  이 검증은 tracker 없는 `reid=assist` fixture를 저장 거부하고, runtime/UI/docs가
  자동 migration 또는 default-on 승격 근거가 아닙니다 라는 경계를 유지하는지
  점검합니다.
- v1.5.0 Tracker/Re-ID stability matrix는
  `verify-v150-tracker-reid-stability-matrix`로 문서/entrypoint/fixture-history
  경계를 먼저 고정합니다. 이 정적 guard는 runtime matrix를 직접 실행하지 않으며,
  `lite/off`, `kalman-lite/off`, `bytetrack/off`, `lite/assist`,
  `kalman-lite/assist`, `bytetrack/assist` 조합이 warning drift 관찰 대상이고
  `matrix-ok`가 제품 default-on 승인 값이 아닙니다 라는 해석을 확인합니다.
- v1.5.0 Re-ID model provenance/fallback approval은
  `verify-v150-reid-provenance-fallback-approval`로 문서/entrypoint/smoke fixture
  경계를 고정합니다. 이 guard는 missing/invalid/mismatched model을 NoOp fallback으로
  닫고, privacy/retention approval을 제품 default-on 승인이나 model bundle 승인으로
  해석하지 않습니다.
- v1.5.0 Ops Dashboard tracker warning next-action은
  `verify-v150-ops-tracker-warning-next-action`으로 UI copy, tracker warning fixture
  smoke, docs 경계를 고정합니다. 이 guard는 warning을 사용자 opt-in 튜닝 참고와
  다음 조치로 표시하되 default-on 근거가 아닙니다 라는 해석을 확인합니다.
- v1.5.0 Audit export review hardening은
  `verify-v150-audit-export-review-hardening`으로 Ops audit 조회와
  JSON/CSV/Diff JSON export의 model/source material 마스킹, Tracker/Re-ID
  설정 변경 review chip, model/fallback status-only 표시 경계를 고정합니다.
  이 guard는 audit export UX를 강화하되 Event POST/WebRTC/SSE/WS metadata schema나
  RTSP/WebRTC media path 변경으로 해석하지 않습니다.
- v1.5.0 Field smoke summary evidence boundary는
  `verify-v150-field-smoke-summary-evidence-boundary`로
  `compare-close-object-tracker --history-dir`가 summary/report/history index evidence만
  보존하고 raw media, crop, embedding, model/source/auth material을 archive하지
  않는지 확인합니다. 이 guard는 release 문서에서 완료/미확인/비범위를 분리하며,
  제품 default-on 승인, 실장비 ONVIF field smoke 성공, 장기 field sample workflow
  완료로 해석하지 않습니다.

비교 리포트 해석:

- command success라도 `judgement: warning`일 수 있습니다.
- `event/scenario stable delta=False`여도 observed counter delta나 observed risk 차이가 있을 수 있습니다.
- 이 경우 default-on 근거로 사용하지 않습니다.
- `warning` fixture가 남아 있으면 안정 판정으로 닫지 않고 반복 실행 또는
  field/model review 대상으로 남깁니다.
- `matrix-ok=True`와 `default-on candidate=False`는 함께 나올 수 있습니다.
  이는 default-off experiment gate는 통과했지만 제품 default-on 근거는 아직
  부족하다는 뜻입니다.
- `verify-close-object-fixture-matrix`에서 `judgement: hold`는 실패 exit로 처리합니다.
- close-object guard는 계속 default off로 둡니다.
- threshold tuning 또는 추가 fixture 수집은 새 field/model review가 열릴 때 별도 review로 다룹니다.

```bash
./server.sh verify-v150-opt-in-tracking-policy
./server.sh verify-v150-tracker-reid-stability-matrix
./server.sh verify-v150-reid-provenance-fallback-approval
./server.sh verify-v150-ops-tracker-warning-next-action
./server.sh verify-v150-audit-export-review-hardening
./server.sh verify-v150-field-smoke-summary-evidence-boundary
./server.sh verify-v150-oc-sort-experimental-sandbox
./server.sh verify-v150-follow-up-closure
./server.sh verify-reid-advanced-tracking
./server.sh verify-tracker-stability --long --overlap-focus
./server.sh verify-va-replay
./server.sh verify-analysis-state

MEDIA_SERVER_ANALYSIS_TRACKING_CLOSE_OBJECT_GUARD_MODE=diagnostic ./server.sh verify-analysis-state
MEDIA_SERVER_ANALYSIS_TRACKING_CLOSE_OBJECT_GUARD_MODE=diagnostic ./server.sh verify-va-replay
MEDIA_SERVER_ANALYSIS_TRACKING_CLOSE_OBJECT_GUARD_MODE=diagnostic ./server.sh verify-va-events
MEDIA_SERVER_ANALYSIS_TRACKING_CLOSE_OBJECT_GUARD_MODE=diagnostic ./server.sh verify-webrtc-va-metadata --file imports/va_tracking_event_1280x720_30fps_h264.mp4
MEDIA_SERVER_ANALYSIS_TRACKING_CLOSE_OBJECT_GUARD_MODE=diagnostic ./server.sh verify-va-runtime-console

MEDIA_SERVER_ANALYSIS_TRACKING_CLOSE_OBJECT_GUARD_MODE=enforce ./server.sh verify-tracker-stability --long --overlap-focus
MEDIA_SERVER_ANALYSIS_TRACKING_CLOSE_OBJECT_GUARD_MODE=enforce ./server.sh verify-va-replay
MEDIA_SERVER_ANALYSIS_TRACKING_CLOSE_OBJECT_GUARD_MODE=enforce ./server.sh verify-analysis-state
```

수동 mode별 명령은 비교 리포트의 원인 분석이나
특정 mode 재현이 필요할 때 사용합니다.
report judgement가 `hold`이면 event/scenario delta 또는 주요 회귀가 있다는 뜻입니다.
이 경우 default on 검토를 중단하고 fixture와 summary log를 먼저 확인합니다.

반복 다채널 VA 브라우저 검증은 제거된 초기 harness가 아니라 별도 제품 UI
harness가 준비된 뒤 장기 테스트로만 실행합니다.

외부 source 장시간 검증은 사용할 source가 준비된 경우에만 실행합니다.

```bash
./server.sh verify-uri-longrun --iterations 3 --include-external
```

## RTSP 검증

기본 codec/RTSP route 검증:

```bash
./server.sh verify-codecs
```

RTSP output 수동 확인 예시:

```bash
ffprobe -rtsp_transport tcp \
  'rtsp://127.0.0.1:8554/dhseo?file=sample_h264.mp4'
```

RTSP input pull 경로는 로컬 또는 준비된 upstream URL을 사용합니다. 개인 LAN IP는 문서에 고정하지 않고 환경에 맞게 치환합니다.

```bash
ffprobe -rtsp_transport tcp \
  'rtsp://127.0.0.1:8554/dhseo?url=rtsp%3A%2F%2Fexample.local%3A8554%2Fsource'
```

확인 기준:

- client connect/disconnect 후 listener와 session cleanup이 정상 동작
- 동일 source 다중 session에서 SharedStream fan-out 유지
- RTSP source preflight/track settle timeout에서 서버가 hang 되지 않음

## WebRTC 검증

WebRTC ICE/signaling smoke:

```bash
./server.sh verify-webrtc-ice
```

WebRTC simple signaling 수동 요청:

```bash
curl -fsS -X POST \
  'http://127.0.0.1:8080/webrtc/session?file=sample_h264.mp4'
```

WHEP 수동 요청:

```bash
curl -fsS -X POST \
  'http://127.0.0.1:8080/whep?file=sample_h264.mp4'
```

직접 생성 요청은 다음 조건에서 확인합니다.

- Auth off 개발 모드
- Auth on admin/operator `ops:read`
- Auth on admin/operator `lab:read`

Auth route smoke:

- 미인증과 viewer 요청이 generic media 생성 route에서 거부되는지 확인
- 생성된 session id가 난수 token 형태인지 확인
- 후속 ICE/delete가 생성 principal 또는 `X-Session-Capability` 없이는 거부되는지 확인

Client WebRTC wrapper smoke:

- 내부 session id/token 숨김
- PublishedView `maxTiles` 강제
- source override 금지
- generic session route가 client alias를 받지 않음

HTTP hardening smoke:

- malformed `Content-Length`: `400`
- body limit 초과 선언: `413`
- 이후 `/health`: 계속 `200`

CORS smoke:

- Origin 없는 요청은 CORS 헤더를 내지 않음
- 다른 origin의 실제 요청/preflight는 `403`
- same-origin preflight만 origin 반사

확인 기준:

- SDP offer/answer 생성
- ICE candidate 수집
- Auth on 후속 answer/ICE/delete는 생성 principal 또는 session capability와 일치
- browser/client disconnect 후 session cleanup
- DataChannel 실패가 audio/video streaming 실패로 전파되지 않음
- WebRTC 메타데이터 뷰어는 browser client-side overlay이고 RTSP URL과 혼동하지 않음

WebRTC VA 메타데이터 수동 확인:

1. `/ops/rules`에서 저장된 채널 분석 설정과 `vaRule` ID를 확인한다.
2. `/client/live` 또는 custom client에서 해당 `vaRule`을 선택한다.
3. 개발 검증은 `verify-webrtc-va-metadata --http-base ...`로 수행한다.
4. WebRTC simple signaling query에 `vaMetadata=1`이 포함되는지 확인한다.
5. DataChannel label이 기본값 `va-metadata`로 표시되는지 확인한다.
6. 상태가 `연결 중`에서 `열림` 또는 `수신 중`으로 전환되는지 확인한다.
7. message count, Track/이벤트/시나리오 count, latest JSON preview가 갱신되는지 확인한다.
7. DataChannel이 `지연` 또는 `오류`가 되어도 영상 재생 상태가 별도로 유지되는지 확인한다.

WebRTC VA metadata overlay sync 수동 판단 기준:

- 초 단위로 bbox overlay가 영상보다 늦게 따라오면 metadata selector 또는 PTS sync 문제를 먼저 의심한다.
- `BBox 진단 갱신`에서 `det↔DC`, `track↔DC` IoU가 높고 center distance가 작지만 trackId만 흔들리면 tracker association / ID continuity 문제로 분리한다.
- `detector raw` bbox부터 실제 객체와 어긋나면 detector 후처리, model box format, letterbox/coordinate transform 문제로 분리한다.
- `frame matching failure`가 계속 증가하거나 `syncDeltaMs`가 1500~2000ms 이상으로 지속되면 WebRTC metadata selector와 PTS 보정을 다시 확인한다.
- close-object guard mode가 `diagnostic`이면 score 변경은 없다고 판단한다.
- 이때는 `closeObjectRisk`, `scoreMargin`, `centerJump`, `guardDecision`만 본다.
- `enforce`에서는 `closeObjectGuardApplied`, would-penalize/hold-reacquire, rejected 후보 수를 함께 본다.
- 실제 보정 여부는 diagnostic 결과와 분리해 판단한다.
- det/DC/track bbox가 서로 잘 맞는데 ID만 흔들리면 WebRTC DataChannel schema나 canvas scale 문제가 아니라 tracker association 후보로 본다.

WebRTC VA metadata 자동 검증:

```bash
./server.sh verify-webrtc-va-metadata --http-base http://127.0.0.1:8080
```

확인할 항목:

- `/webrtc/session?...&vaMetadata=1`로 WebRTC session을 생성
- browser `RTCPeerConnection`에서 video `ontrack` 확인
- ICE 상태가 `connected` 또는 `completed`로 전환되는지 확인
- `va-metadata` DataChannel이 열리는지 확인
- 최소 1개 metadata message를 수신하고 `media-server.webrtc.va-metadata.v1` schema, `tracks[]`, `events[]` 필드를 확인
- sync 진단 필드가 포함되는지 확인
- 필수 필드: `videoFramePtsMs`, `analysisPtsMs`, `syncDeltaMs`, `syncStatus`, `syncToleranceMs`
- 추가 필드: `metadataSequence`, `sentAtMs`, `frameWidth`, `frameHeight`, `coordinateSpace`
- `syncStatus`가 `exact`, `near`, `fallback-latest`, `missing`, `stale` 중 하나인지 확인
- Lab WebRTC client-side overlay는 기본적으로 `syncStatus=fallback-latest` metadata를 그리지 않는지 확인
- fallback 표시가 필요할 때만 `clientOverlayFallback=1` 또는 `vaMetadataDrawFallback=1`을 사용하고, 이 경우 fallback metadata가 흐리게 표시되는지 확인
- fallback metadata가 숨겨진 경우 `Fallback 숨김` count가 증가하는지 확인
- 실패 시 Chrome log 경로와 summary JSON 경로를 출력

WebRTC VA metadata overlay sync 자동 검증:

```bash
./server.sh verify-webrtc-va-metadata --http-base http://127.0.0.1:8080
```

확인할 항목:

- `/ops/rules`에서 선택한 `vaRule` 또는 custom client의 `vaMetadata=1` 세션을 시작
- WebRTC session 생성, video `ontrack`, ICE 연결, `va-metadata` DataChannel 수신 확인
- `requestVideoFrameCallback` 기반 video frame count가 증가하는지 확인
- metadata payload에 sync 진단 필드가 포함되는지 확인
- 검증 전용 hook으로 metadata buffer 상한을 초과하는 synthetic metadata를 주입하고 buffer가 제한되는지 확인
- client overlay draw count가 video frame callback 기준으로 증가하는지 확인
- `fallback metadata 표시` 옵션이 기본 off인지 확인
- `syncStatus=fallback-latest`가 수신되더라도 기본 정책에서 draw되지 않는지 확인
- 브라우저 검증 hook으로 `requestVideoFrameCallback`을 일정 frame 이후 멈춰 video stalled 상태를 재현
- video stalled 상태에서 stale overlay clear가 발생하고 draw count가 더 증가하지 않는지 확인
- 실패 시 summary JSON에 frame/metadata count를 남김
- 남길 값: `videoPresentedFrameCount`, `metadataReceivedCount`, `metadataDrawnCount`, `metadataDroppedCount`
- stale/buffer 값: `fallbackHiddenCount`, `staleClearCount`, `maxMetadataBufferSize`
- sync 값: `maxSyncDeltaMs`, `averageSyncDeltaMs`

이 검증은 선택 검증이며 기본 `./server.sh test`에는 포함하지 않는다.
브라우저/렌더링 타이밍에 따라 flaky할 수 있다.
실패 시 summary JSON과 Chrome log를 함께 확인한다.

## RTSP / WebRTC VA 표시 정책 검증

RTSP와 WebRTC는 metadata 표시 방식이 다릅니다.

수동 확인:

1. `/ops/rules`에서 채널 분석 설정의 출력 URL을 확인한다.
2. `/client/live` 또는 custom client에서 WebRTC metadata URL을 확인한다.
3. `WebRTC 메타데이터 뷰어` URL에는 `/webrtc/session`과 `vaMetadata=1`이 포함되는지 확인한다.
4. Metadata subscription filter 입력값을 넣는다.
5. WebRTC metadata viewer URL과 SSE/WS side-channel URL에 filter query가 반영되는지 확인한다.
6. 확인할 query는 `eventType`, `scenarioName`, `trackId`, `zoneId`이다.
5. `RTSP 서버 오버레이` URL에는 `rtsp://...`와 `va=1` 또는 `vaRule=<id>`가 포함되는지 확인한다.
6. `RTSP 원본 스트림` URL에는 `va=1`, `vaRule=<id>`, `vaMetadata=1`이 포함되지 않는지 확인한다.
7. `커스텀 메타데이터 사이드채널` URL이 `/metadata/stream` SSE endpoint를 가리키는지 확인한다.
8. `커스텀 RTSP + 메타데이터 연결 정보` 영역에 RTSP 원본 스트림과 SSE 메타데이터 스트림이 함께 표시되는지 확인한다.
9. `커스텀 메타데이터 사이드채널` 설명이 일반 VLC/ffplay에서 metadata UI가 표시되는 것처럼 표현하지 않는지 확인한다.

확인 기준:

- RTSP 일반 viewer는 DataChannel을 사용하지 않음
- RTSP VA 표시는 server-side overlay가 기본 정책
- RTSP/server-side overlay의 latest result fallback 정책은 기존대로 유지됨
- WebRTC browser viewer만 DataChannel metadata와 client-side overlay를 사용
- WebRTC client-side overlay는 fallback-latest를 기본 숨김 처리하고 opt-in에서만 표시
- custom client는 RTSP video와 별도 SSE metadata side-channel을 직접 조합해야 함

RTSP video 재생은 일반 player 명령으로 별도 확인합니다.

```bash
ffplay -rtsp_transport tcp 'rtsp://127.0.0.1:8554/dhseo?file=sample_h264.mp4'
ffplay -rtsp_transport tcp 'rtsp://127.0.0.1:8554/dhseo?file=sample_h264.mp4&va=1'
```

위 명령은 RTSP 영상 확인용입니다. VLC/ffplay/IINA는 SSE/WS metadata side-channel을 자동 overlay하지 않습니다.

SSE metadata side-channel 수동 확인:

```bash
curl -N 'http://127.0.0.1:8080/lab/analysis/metadata/stream?vaRule=1&intervalMs=500&maxMessageBytes=65536'
curl -N 'http://127.0.0.1:8080/lab/analysis/metadata/stream?vaRule=1&eventType=loitering&scenarioName=loitering&includeMetrics=0&intervalMs=500&maxMessageBytes=65536'
```

이미 생성된 analysis tap을 재사용할 때:

```bash
curl -N 'http://127.0.0.1:8080/lab/analysis/taps/{tapId}/metadata/stream?intervalMs=500&maxMessageBytes=65536'
```

Custom SSE metadata client 예제:

```bash
python3 scripts/examples/va_metadata_sse_client.py \
  --url 'http://127.0.0.1:8080/lab/analysis/metadata/stream?vaRule=1&intervalMs=500&maxMessageBytes=65536' \
  --max-messages 5 \
  --timeout-seconds 15
```

SSE metadata client 검증 범위:

| 포함 | 제외 |
| --- | --- |
| `event: metadata` 수신 | RTSP video 재생 |
| JSON parse/schema 확인 | overlay renderer |
| `streamId/channelId` 확인 | 일반 player 자동 overlay |
| track/event/scenario count |  |
| latest timestamp와 message count |  |

payload 본문까지 보고 싶으면 `--print-json`을 추가합니다. 영상은 ffplay/VLC 같은 일반 RTSP player로 별도 재생합니다.

Custom RTSP + SSE metadata overlay renderer는 optional client example입니다. 검증은 세 단계로 나눕니다.

| 단계 | 확인 |
| --- | --- |
| RTSP raw video | overlay 없는 영상 재생 |
| SSE metadata | runtime metadata 수신 |
| OpenCV client | video와 metadata를 client-side에서 조합 |

이 단계에서도 VLC/ffplay/IINA가 SSE/WS metadata를 자동 overlay한다고 판단하지 않습니다.

Custom RTSP + SSE overlay renderer 예제:

```bash
python3 scripts/examples/va_rtsp_sse_overlay_client.py --help
python3 scripts/examples/va_rtsp_sse_overlay_client.py \
  --rtsp-url 'rtsp://127.0.0.1:8554/dhseo?file=sample_h264.mp4' \
  --metadata-url 'http://127.0.0.1:8080/lab/analysis/metadata/stream?file=sample_h264.mp4&va=1&intervalMs=500&maxMessageBytes=65536' \
  --max-seconds 15 \
  --headless
```

OpenCV 예제 확인 항목:

| 환경 | 기대 결과 |
| --- | --- |
| OpenCV 설치됨 | window mode에서 RTSP raw frame 표시 |
| metadata 수신 중 | bbox, trackId, className 표시 |
| metadata 끊김 | stale 표시 |
| OpenCV 없음 | 설치 안내 메시지와 함께 실패 |

이 optional example 검증은 서버 core, RTSP server-side overlay 정책, WebRTC DataChannel schema, SSE/WS metadata schema, Event POST payload 변경 검증이 아닙니다.

OpenCV dependency 확인:

```bash
python3 -c "import cv2; print(cv2.__version__)"
```

macOS/Homebrew Python이 PEP 668 `externally-managed-environment`로
plain `pip install`을 막는 경우에는 project venv를 만들거나,
사용자 site-packages에만 설치합니다.
최근 재점검에서는 아래 명령으로 `cv2` import와
headless overlay smoke를 확인했습니다.

```bash
python3 -m pip install --user --break-system-packages opencv-python
python3 scripts/examples/va_rtsp_sse_overlay_client.py \
  --rtsp-url 'rtsp://127.0.0.1:8555/dhseo?file=sample_h264.mp4' \
  --metadata-url 'http://127.0.0.1:8081/lab/analysis/metadata/stream?file=sample_h264.mp4&va=1&intervalMs=500&maxMessageBytes=65536' \
  --max-seconds 2 \
  --headless
```

기본 예시는 `8080/8554`를 사용합니다.
local override나 이미 떠 있는 foreground 서버가 `8081/8555`를 쓰는 경우에는
HTTP/RTSP base만 맞춥니다.
기본 포트에 listener가 없어서 생기는 `Connection refused`나 RTSP decode 실패는
보정 포트 검증 결과와 분리해서 기록합니다.

확인할 항목:

- 응답 header가 `text/event-stream`인지 확인
- `event: metadata`의 `data:` JSON schema가 `media-server.va.runtime-metadata.v1`인지 확인
- `tracks`, `events`, `scenarios`, `metrics` 필드가 포함되는지 확인
- frame이 갱신되지 않을 때 동일 metadata를 반복 전송하지 않고 heartbeat/stale comment로 유지되는지 확인
- curl 중단 후 임시 tap이 cleanup되는지 `/lab/analysis/taps`에서 확인

SSE metadata side-channel smoke:

```bash
./server.sh verify-sse-metadata --http-base http://127.0.0.1:8080
./server.sh verify-va-metadata-sidechannel --http-base http://127.0.0.1:8080
./server.sh verify-va-metadata-sidechannel --http-base http://127.0.0.1:8080 \
  --metadata-event-type loitering \
  --metadata-scenario-name loitering \
  --omit-metrics
```

확인할 항목:

- `/lab/analysis/metadata/stream?file=...` 응답이 `text/event-stream`인지 확인
- 첫 `event: metadata`의 JSON schema가 `media-server.va.runtime-metadata.v1`인지 확인
- `tracks`, `events`, `scenarios`, `metrics` 필드가 포함되는지 확인
- `eventType`, `scenarioName`, `trackId`, `zoneId` 같은 subscription filter가
  metadata `events`/debug `tracks` 범위를 줄이는지 확인
- `includeMetrics=0` 같은 include flag가 지정 필드를 생략하는지 확인
- filter/include smoke는 metadata payload 본문을 직접 검사합니다.
  matching event가 없는 샘플에서는 count가 0일 수 있습니다.
  존재하는 `events`/`tracks` 항목은 요청 filter와 맞아야 합니다.
  `--omit-metrics`에서는 `metrics` field가 없어야 합니다.
- 임시 SSE analysis tap이 client disconnect 후 cleanup되는지 확인
- `verify-va-metadata-sidechannel`은 같은 검증을 수행하면서 summary JSON을 출력하는 명시적 alias

WebSocket metadata side-channel smoke:

```bash
./server.sh verify-ws-metadata --http-base http://127.0.0.1:8080
```

확인할 항목:

- auth off 또는 admin/operator/`lab:read` 권한에서 `/ws/va-metadata?file=...` handshake가 `101 Switching Protocols`로 완료되는지 확인
- auth on의 미인증 요청은 `401`, viewer 요청은 `403`으로 거부되는지 확인
- 첫 text frame의 JSON schema가 `media-server.va.runtime-metadata.v1`인지 확인
- `tracks`, `events`, `scenarios`, `metrics` 필드가 포함되는지 확인
- `{"type":"subscribe","eventType":"loitering","includeMetrics":false}` 같은
  client text command 후 `media-server.va.metadata-control.v1` ack가 오는지 확인
- 이어서 `unsubscribe`, `status`, `resume`, `reset` ack 순서와
  subscribed/filter/include 상태가 기대값과 맞는지 확인
- custom client metadata filter preset 저장/재적용 후에도 WebRTC metadata viewer, SSE, WS URL query가 같은 filter/include 값을 유지하는지 확인
- 임시 WebSocket analysis tap이 client disconnect 후 cleanup되는지 확인
- WebSocket 실패가 RTSP/WebRTC video/audio 흐름으로 전파되지 않는지 확인

Custom RTSP + WebSocket metadata overlay renderer smoke:

```bash
python3 -m py_compile scripts/examples/va_rtsp_ws_overlay_client.py
python3 scripts/examples/va_rtsp_ws_overlay_client.py --help
python3 scripts/examples/va_rtsp_ws_overlay_client.py \
  --rtsp-url 'rtsp://127.0.0.1:8554/dhseo?file=sample_h264.mp4' \
  --metadata-url 'ws://127.0.0.1:8080/ws/va-metadata?file=sample_h264.mp4&va=1&intervalMs=500&maxMessageBytes=65536' \
  --max-seconds 2 \
  --headless
```

이 예제는 RTSP raw stream과 WebSocket runtime metadata를 custom client가 직접
조합하는 reference입니다. 일반 VLC/ffplay/IINA viewer가 WebSocket metadata를
자동 overlay한다는 의미가 아니며, 서버 core schema를 변경하지 않습니다.

VA Runtime Console 자동 검증:

```bash
./server.sh verify-ops-client-ui
./server.sh verify-analysis-state
./server.sh verify-va-runtime-console --http-base http://127.0.0.1:8080
```

확인할 항목:

- 임시 analysis tap 생성 후 dashboard polling이 가능한지 확인
- Runtime Dashboard drill-down UI가 lab layout을 깨뜨리지 않는지 확인
- state-dump 기반 Tracks/Scenarios/Tracking Issues 표시와 vaRule Runtime Debug가 기존 endpoint만 재사용하는지 확인
- Runtime Dashboard의 Trend / Stale / Cleanup section이 최근 sample 수, delta/min/max, warning badge를 표시하는지 확인
- Trend detail이 기존 endpoint 값으로 다음 항목을 표시하는지 확인
  - activeSessions/activeStreams/activeAnalysisTaps
  - SSE/WS clients
  - RTSP consumers
  - WebRTC metadata sent/drop/fail
  - metadata payload avg/max
  - DataChannel bufferedAmount
  - tracking issue/close-object risk
  - Event POST/EventRecord count
- 값이 없는 항목은 `미제공`으로 표시하고 새 대형 backend endpoint나 WebRTC/SSE/WS/Event POST payload schema 변경이 없는지 확인
- dashboard tab을 벗어난 뒤 polling과 trend sample 증가가 멈추는지 확인
- active tap이 있는데 `/metrics` progress가 3개 이상 sample 동안 정체되면 tap metrics stale warning이 표시되는지 확인
- DataChannel open 상태에서 metadata 미수신 또는 3초 초과 stale이 warning badge로 보이는지 확인
- video frame/overlay draw age 3초 초과가 warning badge로 보이는지 확인
- SSE/WS client active 상태의 metadata build 정체가 warning badge로 보이는지 확인
- WebRTC metadata viewer 중지 후 activeSessions/activeStreams/activeAnalysisTaps/SSE/WS/RTSP 잔류가 있으면 cleanup warning으로 표시되는지 확인
- cleanup warning은 보기 중지/dashboard 비활성 후 짧은 grace period 이후 판단하며 longrun report를 대체하지 않는 live observation 보조 지표로 해석
- `/lab/analysis/taps/{tapId}/metrics`의 `tapState`, `trackState`, `metricsReport` 확인
- `/lab/analysis/taps/{tapId}/state-dump` JSON 확인
- `/lab/analysis/taps/{tapId}/events` 접근과 recent event buffer 확인
- `/lab/analysis/event-post/status`, `/lab/analysis/event-storage/status`, `/lab/analysis/events/records`, `/lab/runtime/status` 접근 확인
- smoke용 analysis tap cleanup 확인

RTSP VA overlay 정책 자동 검증:

```bash
./server.sh verify-rtsp-va-overlay-policy \
  --http-base http://127.0.0.1:8080 \
  --rtsp-base rtsp://127.0.0.1:8554/dhseo
```

확인할 항목:

- RTSP 원본 스트림 URL에는 `va=1`, `vaRule=<id>`, `vaMetadata=1`이 포함되지 않음
- RTSP 서버 오버레이 URL에는 `va=1`이 포함됨
- metadata side-channel은 RTSP URL이 아니라 `/metadata/stream` HTTP SSE URL로 분리됨
- `ffmpeg`가 있으면 raw/overlay RTSP URL을 짧게 decode
- 모든 결과는 summary JSON으로 남김

VA Metadata Runtime Console 장시간 검증:

```bash
./server.sh verify-va-runtime-console-longrun \
  --duration-minutes 30 \
  --clients 1 \
  --include-sidechannel \
  --include-dashboard
```

RTSP server-side overlay consumer까지 함께 유지할 때:

```bash
./server.sh verify-va-runtime-console-longrun \
  --duration-minutes 30 \
  --clients 1 \
  --include-sidechannel \
  --include-dashboard \
  --include-rtsp
```

consumer cleanup 이후 서버를 즉시 종료하지 않고 idle RSS를 관찰할 때:

```bash
./server.sh verify-va-runtime-console-longrun \
  --duration-minutes 30 \
  --clients 1 \
  --include-sidechannel \
  --include-dashboard \
  --include-rtsp \
  --idle-after-cleanup-minutes 15 \
  --idle-sample-interval-seconds 30
```

RSS WARNING 해제 여부를 판단하기 위한 full fanout 120분 active + 30분 idle 검증:

```bash
./server.sh verify-va-runtime-console-longrun \
  --duration-minutes 120 \
  --clients 1 \
  --include-dashboard \
  --include-sidechannel \
  --include-rtsp \
  --rss-warmup-minutes 5 \
  --rss-large-drop-mb 20 \
  --idle-after-cleanup-minutes 30 \
  --idle-sample-interval-seconds 30
```

consumer connect/disconnect cycle 이후 idle baseline RSS 누적 증가를 확인할 때:

```bash
./server.sh verify-va-runtime-console-cycles \
  --cycles 10 \
  --active-minutes 5 \
  --idle-minutes 2 \
  --clients 1 \
  --include-sidechannel \
  --include-dashboard \
  --include-rtsp \
  --rss-warmup-minutes 5 \
  --rss-large-drop-mb 20
```

확인할 항목:

- WebRTC `vaMetadata=1` DataChannel이 장시간 metadata를 계속 수신하는지 확인
- dashboard polling 중 `/metrics`, `/state-dump`, `/events`, event POST/storage status 접근이 유지되는지 확인
- dashboard drill-down과 vaRule Runtime Debug polling이 media pipeline을 blocking하지 않는지 확인
- SSE metadata side-channel client가 장시간 연결 후 cleanup되는지 확인
- `--include-rtsp` 지정 시 RTSP `va=1` server-side overlay consumer가 함께 유지되는지 확인
- process RSS/CPU, active sessions/streams/taps, metadata side-channel client count를 주기적으로 기록
- `--idle-after-cleanup-minutes` 지정 시 cleanup 후 서버 process를 유지한다.
- 이후 idle RSS/CPU와 active count 재상승 여부를 별도로 기록한다.
- `verify-va-runtime-console-cycles`는 서버를 유지한 채 consumer를 반복 연결/해제한다.
- cycle별 active peak RSS와 idleEnd RSS baseline을 비교한다.
- WebRTC metadata sent/dropped/failure count는 longrun 서버 로그의 `[webrtc-metadata] close` 라인에서 집계
- `/lab/runtime/status`의 `debugCounters` 블록으로 RTSP/GStreamer egress release와 fanout lifecycle counter를 확인
- longrun/cycle summary JSON과 Markdown report의 `debugCounters` 또는 `Runtime Debug Counters` 섹션에서 counter 최종값을 확인
- 종료 후 active sessions, active analysis taps, SSE/WS metadata clients가 0으로 정리되는지 확인
- idle 관찰 중 active sessions/streams/taps, SSE/WS clients, RTSP egress consumer가 다시 증가하면 cleanup/RSS 해석보다 `idleJudgement`를 우선 확인
- cycle 검증에서는 cycle별 cleanup count가 0이 아니면 `HOLD`, 최종 port cleanup 실패는 `FAIL`, idleEnd RSS가 cycle마다 계속 증가하면 `WARNING`으로 판단
- active 구간 RSS slope와 idle-after-cleanup RSS slope는 분리해서 해석합니다.
  active 중 RSS가 증가해도 cleanup 후 모든 active count가 0이고
  idle RSS가 유지/하락하면 lifecycle 잔여 증거보다
  allocator high-water 또는 GStreamer/WebRTC buffer pool retention 후보로 봅니다.
- longrun summary JSON과 Markdown report는 `/tmp/media_server_va-runtime-longrun-*`, cycle summary/report는 `/tmp/media_server_va-runtime-cycles-*` 경로에 남김
- Runtime Dashboard 장시간 evidence record는
  [runtime-dashboard-longrun-evidence-template.md](./runtime-dashboard-longrun-evidence-template.md)
  형식을 사용합니다. 이 템플릿은 longrun 실행 증거가 아니며, 실제 실행하지 않은 경우 `미실행`으로 보고합니다.
- `test/fixtures/runtime_dashboard_longrun_evidence_sample/`는 evidence field shape를 고정하는 sample-only fixture입니다.
  `longrunExecuted=false`이므로 RC/릴리스 PASS 증거로 쓰지 않습니다.

최근 RSS WARNING 해제 후보 검증 결과:

- RTSP-only 5-cycle: `PASS`
  - `monotonicIdleRssIncrease=false`
  - RTSP lifecycle counter 균형
  - pending queue stop/destroy 잔여 `0`
  - `appsrcPushAfterStopCount=0`
  - flow return은 FLUSHING 중심
- Full 20-cycle: `PASS`
  - `monotonicIdleRssIncrease=false`
  - cleanup/port cleanup 정상
  - RTSP lifecycle/probe/bus watch counter 균형
  - pending queue stop/destroy 잔여 `0`
  - flow return은 전부 FLUSHING
- 120m full + 30m idle-after-cleanup: `PASS`
  - Summary: `/tmp/media_server_va-runtime-longrun-1777648583-19035_summary.json`
  - Report: `/tmp/media_server_va-runtime-longrun-1777648583-19035_report.md`
- 120m active 구간:
  - warmup baseline `679.80MiB`
  - last RSS `881.38MiB`
  - last-30m slope `+51.77MiB`, `+1.726MiB/min`
  - active plateau는 뚜렷하지 않으므로 high-water 관찰 메모 유지
- cleanup 후 30분 idle RSS:
  - `642.97MiB -> 642.67MiB`
  - activeSessions, activeStreams, activeAnalysisTaps,
    SSE/WS clients, RTSP consumers 재증가 없음
- `ERROR` / `NOT_LINKED` / `NOT_NEGOTIATED` / `OTHER` flow return은 관찰되지 않았습니다.
  port cleanup도 정상입니다.
  이 조합이면 RSS WARNING 해제 가능 후보로 봅니다.
- 후속 30분 predev 회귀 검증도 `PASS`입니다.
- Summary는 `/tmp/media_server_predev-1777679318-64004_summary.json`입니다.
- Report는 `/tmp/media_server_predev-1777679318-64004_report.md`입니다.
- 결과는 `pass=69`, `fail=0`, `skip=1`입니다.
- Runtime Console은 stable 승격 가능 상태로 판단하되 active 구간 high-water 관찰 메모는 유지합니다.

Runtime Console 검증 정책:

| 항목 | 정책 |
| --- | --- |
| 기본 test 포함 여부 | `./server.sh test`에는 포함하지 않음 |
| 실행 성격 | 30분 이상 실행하는 선택 검증 |
| 120분 실행 | release candidate 또는 고위험 RTSP/GStreamer/WebRTC/VA fanout 변경 gate |
| 120분 미실행 기록 | 사용자 명시 요청 없음 또는 변경 범위가 runtime fanout/media path가 아니면 `NOT RUN` |
| 대체 불가 | 30분 longrun, cycle 검증, sample fixture를 120분 PASS evidence로 쓰지 않음 |
| report 보존 | RC artifact 또는 외부 archive 보존 위치와 retention days를 기록 |
| trace env | 검증용 subprocess env에서 `MEDIA_SERVER_WEBRTC_TRACE=1` 사용 |
| 집계 | DataChannel sent/drop/failure count를 로그에서 집계 |
| 영구 설정 | `scripts/.media_server.env` 같은 파일은 수정하지 않음 |

Runtime debug counter는 기존 Event POST/WebRTC/SSE metadata payload schema를 변경하지 않는 내부 진단 값입니다.
기본적으로 counter만 누적합니다.
lifecycle trace log가 필요할 때만 `MEDIA_SERVER_RUNTIME_DEBUG_COUNTER_TRACE=1`을 서버 실행 환경에 추가합니다.

주요 counter:

- `rtspMediaConfiguredCount`, `rtspMediaUnpreparedCount`
- `rtspEgressSessionCreatedCount`, `rtspEgressSessionStartedCount`, `rtspEgressSessionStoppedCount`, `rtspEgressSessionDestroyedCount`
- `rtspAppsrcPushOkCount`, `rtspAppsrcPushFailCount`
- `rtspPendingQueuePeak`, `rtspPendingQueueDroppedCount`
- `sharedStreamSubscriberAddedCount`, `sharedStreamSubscriberRemovedCount`
- `analysisTapAttachedCount`, `analysisTapDetachedCount`
- `analysisTapCreatedCount`, `analysisTapReusedCount`, `analysisTapRejectedCount`
- `analysisTapRefCount`, `analysisTapReuseKey`
- `metadataJsonBuildCount`, `metadataJsonBytesTotal`, `metadataJsonBytesMax`

Analysis tap reuse smoke 기준:

- 같은 source와 같은 analysis profile을 여러 client/view에서 요청하면 source와 tap이 재사용됩니다.
- 이때 `sessionManager.registryActiveStreams=1`, `analysisMatching.activeTapCount=1`을 기대합니다.
- 해당 tap의 `refCount`는 client 수만큼 증가합니다.
- 같은 source라도 detector model, input size, FPS, tracking class, tracker config, preprocessing config가 다른 profile이면 별도 tap이 허용됩니다.
- client별 overlay 표시 옵션만 다른 경우에는 `analysisTapReusedCount`가 증가하고 `analysisTapCreatedCount`는 추가로 증가하지 않아야 합니다.
- 종료 후 cleanup 상태에서 `activeAnalysisTaps=0`, `analysisMatching.activeTapCount=0`으로 돌아와야 합니다.

## Client scoped dashboard 검증

Client dashboard는 PublishedView scope와 sanitized runtime summary를 확인하는 smoke로 검증합니다.

```bash
curl -fsS 'http://127.0.0.1:8080/client/api/views'
curl -fsS 'http://127.0.0.1:8080/client/api/views/{viewId}/dashboard'
curl -fsS 'http://127.0.0.1:8080/client/api/views/{viewId}/events?limit=20'
curl -fsS 'http://127.0.0.1:8080/client/api/views/{viewId}/metadata'
```

확인 기준:

- viewer는 `view:read:{viewId}`가 있는 view만 `/client/api/views`에서 확인합니다.
- dashboard API는 `dashboard:read:{viewId}`, events API는 `event:read:{viewId}`, metadata summary API는 `metadata:read:{viewId}` scope가 필요합니다.
- admin/operator는 client dashboard에서 전체 PublishedView 상태를 확인할 수 있습니다.
- `showDashboard=false`인 view는 dashboard API가 403을 반환하고, `showEvents=false`인 view는 events API가 403을 반환합니다.
- dashboard health는 `live`, `status`, `summary`, `warningLevel`,
  connection status, video frame status, metadata status, stale 여부,
  metadata age, last frame age를 반환합니다.
- 값이 없으면 UI는 `미제공`을 표시합니다.
- `/client/dashboard`의 `상태 복사`, `이벤트 복사`는 viewer에게 허용된
  sanitized 상태/이벤트 요약만 복사합니다.
- client dashboard 응답과 화면에 운영 내부 값이 노출되지 않아야 합니다.
- 숨길 값: source 원본 URL, Developer URL, 내부 진단 JSON, `analysisTapId`, internal session id
- 숨길 설정: rule/profile editor, Event POST 설정, SSE/WS 전체 endpoint
- Event POST payload, WebRTC DataChannel schema, SSE/WS metadata schema는 변경하지 않습니다.

Client Live Workspace smoke 기준:

```bash
curl -fsS 'http://127.0.0.1:8080/client/api/views'
curl -fsS -X POST \
  -H 'Content-Type: application/json' \
  -d '{"overlayMode":"raw"}' \
  'http://127.0.0.1:8080/client/api/views/{viewId}/webrtc/session'
```

확인 기준:

- `/client/live`는 source tree + live workspace로 표시하며 viewer는 기본 최대 4 tile, Ops preview는 최대 9 tile을 사용합니다.
- `/client/live`는 source tree 선택/drag-drop, tile별 시작/재연결/연결 해제, workspace 작업 메뉴의 layout 저장/복원/전체 연결 해제를 제공합니다.
- 320px 모바일 폭에서도 workspace 작업 메뉴의 layout 저장/복원/전체 연결 해제 항목은 viewport 안에 열려야 합니다.
- 빈 PublishedView 상태에서는 viewer에게 `/client/request-access` 접근 요청 CTA를 제공합니다.
- viewer는 assigned PublishedView만 tile에 선택할 수 있습니다.
- client WebRTC wrapper는 viewId만 허용하고 `file`, `url`, `source`, `rtspUrl`, `httpUrl`, `webrtcSourceId`, `whepUrl` override 요청을 400으로 거부합니다.
- 같은 principal+view의 활성 client session이 `maxTiles`에 도달하면 추가 session 생성은 `409`로 거부됩니다.
- `overlayMode`는 PublishedView의 `allowedOverlayModes` 안에서 `raw`, `va-overlay`, `va-rule`로 정규화됩니다.
- `va-rule` mode는 PublishedView의 `allowedRuleIds`/`defaultRuleId` 안의 rule만 사용할 수 있습니다.
- `va-rule` mode는 허용된 rule이라도 저장 source가 PublishedView source와 다르면 400으로 거부합니다.
- `/client/live`의 browser `RTCPeerConnection`은 `/webrtc/config`의 `peerConnectionConfig`를 사용합니다.
- 제품 smoke는 빈 `iceServers` 강제 코드가 남아 있지 않은지 확인합니다.
- client 생성 응답은 `client-live-<random>` alias만 반환하고 `sessionToken` 또는 내부 generic session id를 노출하지 않습니다.
- client answer/ICE/delete는 client session wrapper를 사용합니다.
- wrapper: `/client/api/views/{viewId}/webrtc/session/{clientSessionId}`
- client alias는 generic `/webrtc/session/{id}` route에서 사용할 수 없어야 합니다.
- tile stop은 PeerConnection/DataChannel을 닫고 client wrapper DELETE를 호출합니다.
- workspace-level all stop 또는 hidden tab/route leave 후 `activeSessions`가 감소하고 media stream track이 정리됩니다.
- tile status는 live/offline, stale, track count, event count, connection status를 표시합니다.
- 선택 tile detail의 `상태 복사`, `이벤트 복사`는 source URL이나 내부 진단
  정보 없이 sanitized 요약만 복사합니다.
- client 화면에 source URL, Developer URL, BBox diagnostics, 내부 진단 JSON, 내부 session id/token, rule/profile 수정 UI가 노출되지 않아야 합니다.
- 기존 `/webrtc/session?file=...` 개발용 경로는 변경하지 않습니다.
- WebRTC DataChannel schema와 Event POST payload도 변경하지 않습니다.
- auth on에서는 직접 generic media 생성 route가 admin/operator `ops:read` 또는 `lab:read` 권한을 요구합니다.
- viewer 제품 흐름은 client wrapper만 사용합니다.

## VA overlay 검증

기본 YOLO/ONNX overlay:

```bash
./server.sh verify-va
```

현재 `verify-va`의 WebRTC browser playback 구간은 초기 `/webrtc/test` harness 제거 후
별도 제품 UI harness가 준비될 때까지 skip됩니다. 기본 자동 기준은 lab API와 RTSP
server-side overlay를 확인합니다.

수동 RTSP overlay URL:

```bash
ffprobe -rtsp_transport tcp \
  'rtsp://127.0.0.1:8554/dhseo?file=va_four_scene_sample.mp4&va=1'
```

확인 기준:

- `va=1` 요청에서 bbox/class/confidence overlay 표시
- overlay wait/sync timeout 때문에 media pipeline이 blocking되지 않음
- debug overlay 기본값은 off
- TrackHealth/Scenario debug 정보는 debug mode에서만 표시

## vaRule 검증

Rule/Profile UI와 저장 rule 호출:

```bash
./server.sh verify-rule-ui
./server.sh verify-ops-rules-roundtrip
```

저장 rule 수동 URL:

```bash
ffprobe -rtsp_transport tcp \
  'rtsp://127.0.0.1:8554/dhseo?vaRule=1'
```

확인 기준:

- `vaRule=<number>`가 저장된 rule/profile/source를 사용
- rule에 연결된 source가 있는 경우 URL의 source override와 충돌하지 않음
- 기존 rule payload 구조와 외부 이벤트 출력 형식 유지
- ReEntry scenario를 룰 편집 UI에서 선택하고 `reEntryWindowMs`, `cooldownMs`, target zone, re-entry zone을 저장할 수 있음
- 저장된 ReEntry rule은 `event.type=scenario.type=re-entry`와 `targetZoneIds`/`reEntryZoneIds`를 유지함
- IntrusionAfterLineCrossing scenario를 룰 편집 UI에서 선택할 수 있음
- trigger line, crossing direction, target zone을 저장할 수 있음
- `maxDelayAfterCrossingMs`, `dwellTimeMs`, `cooldownMs`를 저장할 수 있음
- 저장된 IntrusionAfterLineCrossing rule은 기존 `line-crossing` 기본 이벤트와 분리된 `event.type=scenario.type=intrusion-after-line-crossing`을 유지함
- Loitering scenario를 룰 편집 UI에서 선택할 수 있음
- target zone과 field preset을 저장할 수 있음
- preset: 로비, 매장 통로, 승강장, 주차장
- `minDwellTimeMs`, `maxMovementRadius`, `minTrajectoryPoints`, `cooldownMs`를 저장할 수 있음
- 저장된 Loitering rule은 `event.type=scenario.type=loitering`과 `targetZoneIds`/movement radius/trajectory point를 유지함
- ZoneOccupancyScenario를 룰 편집 UI에서 선택할 수 있음
- field preset, `occupancyThreshold`, `minDwellTimeMs`, target zone, cooldown을 저장할 수 있음
- preset: 대기열, 로비, 승강장, 출입구, 승강기 홀
- IntrusionDwell/WrongDirection UI와 기존 Event POST payload, WebRTC/SSE/WS metadata schema는 변경되지 않음
- 숫자 ID 범위와 자동 할당 정책이 UI에서 깨지지 않음

## Event POST 검증

Live event delivery contract의 기준 schema와 변경 금지 기준은
[live-event-metadata-contracts.md](./live-event-metadata-contracts.md)를 먼저 봅니다.
이 절은 실제 실행 명령, 보정 서버, 실패 해석 기준을 다룹니다.

Event POST schema:

```bash
./server.sh verify-event-post --mode schema
```

Event POST recovery/queue:

```bash
./server.sh verify-event-post --mode recovery
```

기본 disabled 상태 확인:

```bash
./server.sh verify-event-post --mode disabled
```

EventStorage status/records smoke:

```bash
curl -fsS 'http://127.0.0.1:8080/lab/analysis/event-storage/status'
curl -fsS 'http://127.0.0.1:8080/lab/analysis/events/records?limit=5'
./server.sh verify-ops-event-records-scope --http-base http://127.0.0.1:8080
```

서버가 `8081` 같은 다른 HTTP port로 떠 있으면 port만 맞춰 실행합니다.
`verify-ops-event-records-scope`는 EventStorage 활성 서버에서 synthetic populated
EventRecord fixture를 active file에 잠시 주입하고 복원하며,
`ops-events-populated-<width>.png` screenshot으로 `/ops/events` table의
snapshot/clip/signed bundle action 표시를 확인합니다.

`verify-event-post --mode schema|recovery|queue`는 서버가
`MEDIA_SERVER_ANALYSIS_EVENT_POST_ENABLED=1` 상태로 실행되어 있어야 합니다.
기본 서버의 Event POST disabled 상태는
`verify-event-post --mode disabled`로 별도 확인합니다.
schema/recovery/queue mode에서 disabled가 나오면 enabled smoke의 사전 조건 실패로
보고하고, 같은 build를 Event POST enabled 보정 서버로 띄워 schema/recovery를
재확인합니다.

```bash
MEDIA_SERVER_SKIP_LOCAL_ENV=1 \
MEDIA_SERVER_SKIP_BUILD=1 \
MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 \
MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 \
MEDIA_SERVER_LISTEN_PORT=8556 \
MEDIA_SERVER_HTTP_LISTEN_PORT=8082 \
MEDIA_SERVER_ANALYSIS_EVENT_POST_ENABLED=1 \
./server.sh foreground

./server.sh verify-event-post --mode schema --http-base http://127.0.0.1:8082
./server.sh verify-event-post --mode recovery --http-base http://127.0.0.1:8082
```

보정 경로 해석:

- schema/recovery가 통과하면 기본 서버 disabled 실패는 제품 회귀가 아닙니다.
- 이 경우 실행 환경 조건으로 기록합니다.
- EventStorage가 비활성인 보정 서버에서는 corrupt/partial injection 세부 검증이 skip될 수 있습니다.
- Event POST dispatcher recovery와 EventRecord storage recovery 검증은 분리해서 봅니다.

확인 기준:

- 기존 Intrusion / LineCrossing POST payload 형식 유지
- 신규 scenario event도 EventManager를 통해 emit
- POST 실패가 media pipeline 실패로 이어지지 않음
- queue/dedupe/cooldown counter가 무한 증가하지 않음
- Event POST payload 검증과 EventRecord storage 정책 검증은 별도입니다. Storage rotation/recovery가 추가되어도 POST payload field는 변경하지 않습니다.
- EventRecord file storage, active/archive query/search UI와 JSON Lines rotation/retention/recovery 1차는 구현 완료 상태입니다.
- EventRecord 조회 API는 저장된 metadata와 recorder output path만 반환하며 영상 검색/재생을 수행하지 않음
- snapshot/clip hook 활성화 시 analysis frame buffer에서 snapshot media와 pre/post frame bundle manifest를 생성함. MP4/VMS/NVR 장기 녹화는 검증 범위가 아님
- records API와 Runtime Dashboard Event Records UI는 evidence 조건으로 기록을 검색합니다.
- evidence 조건: `snapshot`, `clip`, `any`, `both`, `missing`
- detail은 snapshot path, clip manifest path, clip bundle directory를 분리해 표시합니다.
- records API는 `offset`/`limit` paging으로 active/archive 합산 결과를 넘깁니다.
- compaction snapshot cleanup API는 `keepNewest` 기준으로 compacted snapshot만 정리합니다.
- evidence preview route는 configured snapshot/clip 디렉터리 아래의 safe evidence만 엽니다.
- UI는 preview 상태 문구와 clip frame summary를 함께 표시해야 합니다.
- `includeArchives=1`은 rotated archive를 조회에 포함하고, compaction snapshot API는 기존 파일을 수정하지 않음
- compaction snapshot 목록/다운로드/삭제 API는 compacted file pattern만 허용하고 active/archive 파일을 삭제하지 않음
- 손상되었거나 partial 상태인 EventRecord JSON Lines 행은 records API 전체 실패가 아니라 skip/count 처리됨
- `/lab/analysis/event-storage/status`의 `skippedCorruptLines`, `partialLineCount`, `lastRecoveryStatus`로 recovery summary를 확인할 수 있음
- `verify-event-post --mode recovery`는 EventStorage 활성 상태에서 실행합니다.
- 안전한 `/tmp/media_server_*` path를 사용할 때 valid/corrupt/partial JSON Lines를 주입합니다.
- 이후 records API와 status recovery count를 확인합니다.
- Rotation/retention은 storage limit env를 켠 환경에서 smoke 확인합니다.
- env: `MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_MAX_FILE_BYTES`
- env: `MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_MAX_ARCHIVES`
- env: `MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_MAX_TOTAL_BYTES`
- 확인 값: `activeFileSizeBytes`, `archivedFileCount`, `totalArchiveBytes`, `rotatedCount`, `retentionDeletedCount`

## Replay 검증

실제 영상 없이 metadata fixture로 회귀를 비교합니다.

```bash
./server.sh replay-va-metadata \
  --input test/fixtures/va_metadata_replay_basic.json \
  --output /tmp/va_metadata_replay.json
```

baseline fixture 전체 검증:

```bash
./server.sh verify-va-replay
```

검증 대상:

- Intrusion
- LineCrossing
- IntrusionDwell
- IntrusionDwell per-rule override: 저장 rule의 `candidateTimeMs`/`dwellTimeMs`/`cooldownMs`와 `restrictedZoneIds`가 env default보다 우선 적용되는지 확인
- ReEntry
- WrongDirection
- IntrusionAfterLineCrossing
- Loitering
- Loitering under-threshold no-event boundary
- ZoneOccupancy delayed-trigger boundary
- ZoneOccupancy
- cleanup
- lost/reacquired
- multichannel separation

## 다채널 검증

초기 `/webrtc/test` 기반 다채널 브라우저 harness는 제거되었습니다.
현재 quick 안정성 범위에서는 느린 RTSP/WebRTC 다채널 재생을 실행하지 않고,
제품 UI smoke, rule UI round-trip, route 404 smoke, API 계약 검증으로 대체합니다.

단계별 수동 기준:

- 1채널: 기본 stream/session lifecycle 확인
- 2채널: streamId/channelId state 분리 확인
- 4채널: cleanup과 metrics count 확인
- 8채널 이상: CPU/memory 증가 추세와 queue 상한 확인

확인 기준:

- 같은 trackId가 다른 channel에서 충돌하지 않음
- 한 channel disconnect가 다른 channel에 영향 없음
- active track/scenario/event가 cleanup으로 잘못 삭제되지 않음

## Redaction 검증

Redaction은 개인정보 보호/모자이크 경로의 선택 검증입니다.

```bash
./server.sh verify-redaction
```

통합 테스트에 포함하려면:

```bash
./server.sh test --full
```

`--full`은 release 전 로컬 기준선입니다. `--basic` 범위에 더해
`verify-ops-client-ui`, `verify-ops-click-e2e`,
`verify-ops-tables-layout`, `verify-ops-rules-roundtrip`,
`verify-rule-ui`, event POST schema/recovery, redaction을 함께 실행합니다.
무옵션 `test --full --stop-after`의 기본 목표 시간은 `1800s`입니다.
실행 summary는 `.media_server.test/<timestamp>/test-summary.json`에 남기며,
RC checklist에는 `--full-test-summary`로 연결할 수 있습니다.
2026-05-09 로컬 기준선은 543초(9.1분), pass 30 / fail 0 / skip 6입니다.

확인 기준:

- 대상 객체가 redaction 처리됨
- redaction 실패가 기본 streaming 실패로 이어지지 않음
- VA overlay/rule 경로와 같이 켰을 때 화면이 깨지지 않음

## 외부 접속 검증

서버가 LAN에서 접근 가능해야 할 때는 bind 주소와 출력 URL을 먼저 확인합니다.

```bash
./server.sh urls
./server.sh status
```

외부/LAN 포함 통합 검증:

```bash
./server.sh test --external
```

외부 source URL은 환경별 값으로 주입합니다. 문서에는 개인 IP/credential을 남기지 않습니다.

```bash
MEDIA_SERVER_TEST_EXTERNAL_RTSP_URLS='rtsp://example.local:8554/source' \
  ./server.sh test --external
```

TURN relay/auth는 운영 credential이 필요하므로 별도 검증으로 둡니다.

```bash
MEDIA_SERVER_VERIFY_WEBRTC_EXTERNAL_TURN_SERVER='turn://user:pass@example.local:3478' \
  ./server.sh verify-webrtc-ice
```

## 실패 시 로그 확인

서버 상태:

```bash
./server.sh status
./server.sh diagnose
```

background 로그:

```bash
tail -n 200 .media_server.log
tail -f .media_server.log
```

port listener:

```bash
lsof -nP -iTCP:8080 -sTCP:LISTEN
lsof -nP -iTCP:8554 -sTCP:LISTEN
```

WebRTC 상세 로그:

```bash
MEDIA_SERVER_WEBRTC_TRACE=1 ./server.sh foreground
```

GStreamer plugin:

```bash
gst-inspect-1.0 webrtcbin nicesrc nicesink
gst-inspect-1.0 rtph264pay rtph264depay h264parse
gst-inspect-1.0 uridecodebin
```

Replay 결과 차이는 누락/초과/불일치 이벤트를 먼저 확인합니다.

```bash
./server.sh verify-va-replay
```

## 최신 통과 기준 요약

현재 최신 기준은 Step 32 통합 검증 이후 다음 항목을 통과 대상으로 봅니다.

| 항목 | 기준 |
| --- | --- |
| Release build | GStreamer/ONNX 활성 Release build 성공 |
| 기본 streaming | file/RTSP/WebRTC smoke 통과 |
| 기존 Intrusion | 이벤트 타입/JSON/API/POST 형식 유지 |
| 기존 LineCrossing | 방향 계산과 이벤트 출력 형식 유지 |
| TrackStateManager | Active/Lost/Reacquired/Terminated, ring buffer, trajectory cap, cleanup |
| SceneContextBuilder | ZoneState, dwellTimeMs, LineCrossState, crossing direction 계산 |
| EventManager | dedupe, cooldown, lifecycle, stale state cleanup |
| ScenarioEngine | stream/channel별 instance 분리, saved scenario payload는 env default보다 우선 |
| IntrusionDwell | Candidate -> Observing -> Confirmed -> Cooldown -> Ended |
| 신규 scenarios | ReEntry, WrongDirection, IntrusionAfterLineCrossing, Loitering, ZoneOccupancy replay 통과 |
| TrackHealth | 진단 metadata만 추가, tracking id 생성 방식 유지 |
| Appearance hook | 기본 NoOp, 실제 모델 호출 없음 |
| EventRecord/hook | JSON Lines active/archive query/rotation/recovery, 비파괴 compaction snapshot, snapshot/clip frame evidence recorder 실패가 event emit을 막지 않음 |
| Cleanup | active track/scenario/event를 잘못 삭제하지 않음 |
| 다채널 | 같은 trackId가 다른 channel에서 충돌하지 않음 |

## 과거 이력 링크

날짜별 상세 검증 이력은 [history/verification-history.md](./history/verification-history.md)에 보관합니다.

현재 문서에는 지금 실행할 명령과 최신 통과 기준만 남깁니다. 과거 이력은 삭제하지 않고 history 문서에 누적합니다.
