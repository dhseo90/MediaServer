# Release Policy

이 문서는 release에 무엇을 올릴지 고정합니다.
버전 의미는 [versioning-policy.md](./versioning-policy.md)에서 함께 관리합니다.

## 기본 release 범위

- 기본 release는 source archive와 문서 중심입니다.
- GitHub가 자동 생성하는 source archive 외 binary bundle은 기본 제공하지 않습니다.
- FFmpeg, FFprobe, libav*, x264/x265, GStreamer GPL-risk plugin, ONNX Runtime package, YOLO/Re-ID model binary는 release asset에 넣지 않습니다.
- 운영 auth store, log, snapshot, evidence bundle, 고객/현장 영상은 release asset에 넣지 않습니다.

## Binary/Container release 기준

binary bundle, app bundle, container image, offline package는 별도 release candidate로 취급합니다.

필수 확인:

```bash
./server.sh verify-release-bundle-dry-run
./server.sh verify-bundle-policy --bundle-dir <release_bundle_dir> --json-output /tmp/media_server_bundle_policy.json
./server.sh source-offer-checklist --stable --bundle-policy-report /tmp/media_server_bundle_policy.json
./server.sh verify-public-repo-readiness --report /tmp/media_server_public_repo_readiness.md
./server.sh verify-release-closeout-helper --dry-run --report /tmp/media_server_release_closeout_helper.md
./server.sh verify-release-closeout-helper --dry-run --report <report.md> --json-report <report.json>
```

위반 항목이 있으면 기본 release 대상이 아닙니다.
`verify-release-bundle-dry-run`은 source-only, local-binary, offline-package,
container-root 후보를 임시로 만들고, FFmpeg/GStreamer GPL-risk runtime,
ONNX Runtime package, model binary가 policy gate에서 차단되는지 negative fixture로
함께 확인합니다.
runtime/model을 의도적으로 포함하면 upstream license text, attribution,
source offer, model provenance, checksum manifest를 release note에 연결합니다.

## GitHub Releases 운영

- release note에는 commit, 검증 명령, known limitation을 짧게 적습니다.
- source-only release에는 sample/model/runtime binary를 추가 업로드하지 않습니다.
- `verify-release-closeout-helper`는 dry-run summary만 생성하며 tag, push, GitHub Release 생성을 수행하지 않습니다.
- `verify-release-metadata` 기본 실행은 release prep 단계에서 반복 가능한 로컬
  문서/버전 기준만 확인하고, GitHub latest/tag 확인은 `manual-not-run`으로 남깁니다.
- GitHub Releases latest/list/view, GitHub API `/releases/latest`, repository page
  Releases/Latest link, 원격 tag/branch 확인은
  main/tag/GitHub Release publish 이후 `./server.sh verify-release-metadata --published`
  로 실행합니다. 네트워크나 GitHub CLI 접근 실패는 published metadata gate 실패로
  기록하고 PASS evidence로 대체하지 않습니다.
- publish 후 Markdown/JSON report를 남길 때 `Published Release Evidence` 섹션은
  `media-server.published-release-evidence.v1` schema로 API/list/view, repository
  page link, remote refs 증적을 함께 보존합니다.
- `gh` 인증/도구 실패는 curl GitHub REST API fallback으로, SSH origin refs 실패는
  GitHub HTTPS refs fallback으로 재시도합니다. fallback까지 실패하면
  `media-server.github-metadata-fallback-policy.v1` 기준의
  `failure-class=external-auth-or-permission`, `failure-class=external-network`,
  `failure-class=tool-unavailable`, `failure-class=external-github-access` 중 하나로
  보고하고, 제품 runtime/media 회귀와 섞어 쓰지 않습니다.
- RC longrun 결과는 `rc-release-checklist`와 `media-server-rc-gate` GitHub
  Actions artifact, 또는 `rc-artifact-archive` 외부 archive로 보관합니다.
  임시 `/tmp` 경로는 staging/local-only evidence이며, release-grade 보존 완료로
  쓰지 않습니다.
- UI visual release baseline artifact는 승인된 release/RC 화면 상태를 다음 candidate와 비교하는 approved comparator입니다. public release asset으로 기본 업로드하지 않으며, release note에는 [UI Visual Release Baseline Approval Log](./ui-visual-release-baseline-approval-template.md)를 기준으로 accepted baseline run, baseline diff, 수동 비노출 검토 결과 링크만 남깁니다. template presence와 CI 연결은 `./server.sh verify-ui-release-baseline-approval-log`로 확인합니다.
- public visibility 전환은 이 문서와 [public-repo-final-review.md](./public-repo-final-review.md) 확인 후 수동으로만 진행합니다.

## Release / Visual Baseline Readiness

`verify-release-closeout-helper`는 release local verifier, tag/push 수동 gate,
visual artifact policy, screenshot review 체크포인트를 한 dry-run report로 묶습니다.
`--one-shot-dry-run`은 `media-server.release-closeout-one-shot-gate.v1` schema로
main merge 이후 tag 생성, GitHub Release 생성, published metadata 검증,
release branch 삭제, next branch sync를 한 순서로 묶고 fail-stop rehearsal을
남깁니다. 이 모드도 tag, push, GitHub Release, release branch 삭제를 직접 수행하지
않고 `manual-not-run`으로만 기록합니다.
실행/미실행/미확인 evidence 색인은 [release-evidence-index.md](./release-evidence-index.md)에
두고, README 첫 화면에는 세부 matrix를 반복하지 않습니다.
JSON report의 visual 자동화 영역은
`media-server.release-visual-baseline-automation.v1` schema를 사용합니다.

```bash
./server.sh verify-release-closeout-helper --dry-run --report <report.md> --json-report <report.json>
./server.sh verify-release-closeout-helper --dry-run --one-shot-dry-run --release-branch <release-branch> --target-branch main --next-branch <next-branch> --report <report.md> --json-report <report.json>
```

preflight CI는 이 report를 `media-server-release-closeout-helper-dry-run`
artifact로 업로드합니다. 같은 release 준비 흐름에서
`verify-docs-ui-assets`, `verify-ui-visual-artifact-index`,
`verify-ui-release-baseline-approval-log`, `write-ui-visual-baseline-comment`,
`ui-visual-artifact-maintenance` 결과를 함께 확인합니다.
future tag, push, GitHub Release, accepted baseline 채택, 320/390/760/1180px
screenshot review는 리포트에 manual/not-run으로 남기며, 실제 실행 및 링크가
없는 항목을 pass로 쓰지 않습니다.

## v2.0.0 Release Close-out Runbook

이 runbook은 순서가 evidence입니다. dry-run에서는 실행 가능 여부와 수동 gate만
점검하고, real close-out에서는 아래 순서를 건너뛰지 않습니다.

Dry-run checklist:

1. Current branch close 준비: `git status --short`, 단계별 커밋, 미실행/미확인 테스트 기록을 확인합니다.
2. Local release gates: release prep에서는 `verify-release-metadata`, `verify-docs-links`, `verify-docs-ui-assets`, `verify-manual-ui-evidence`, `verify-release-closeout-helper --dry-run` 결과를 모읍니다.
3. UI evidence readiness: screenshot manifest, direct image review checklist, manual UI evidence index의 `확인됨/미확인/건너뜀` 구분을 확인합니다.
4. Manual-only actions: PR merge, main fast-forward, tag, push, GitHub Release 생성, Latest Release 확인, next branch sync는 dry-run에서 `manual-not-run`으로 남깁니다.

Real close-out checklist:

1. Branch close: release branch의 모든 단계 커밋과 최종 검증 결과를 확인합니다.
2. PR merge: required checks와 review 상태를 확인하고 main으로 merge합니다.
3. Main fast-forward/sync: 로컬 main을 원격 main 최신 commit으로 맞추고 release commit을 다시 확인합니다.
4. Tag: 검증된 main commit에만 annotated release tag를 생성합니다.
5. Push: tag와 필요한 branch를 명시 승인 후 push합니다.
6. GitHub Release: source-only release note를 만들고 sample/model/runtime binary를 업로드하지 않습니다.
7. Latest 확인: GitHub Releases latest, `/releases/latest`, repository page Releases/Latest link, remote tag/branch를 `verify-release-metadata --published --report <report.md> --json-report <report.json>`로 확인합니다. README는 publish 전 dead release URL을 걸지 않고 release 준비 기준 문서로 연결합니다.
8. Release branch 삭제: published metadata가 통과한 뒤에만 release branch 삭제를 수동 승인합니다.
9. Next branch sync: 다음 작업 branch를 main 최신 release fix 위로 동기화한 뒤 미커밋 변경이 없는지 확인합니다.

위 순서 중 실행하지 않은 항목은 테스트 결과 행을 만들지 않고 release evidence 실행
상태에 `미실행` 또는 `manual-not-run`으로 남기며, 실행하지 않은
tag/push/GitHub Release를 완료로 쓰지 않습니다.
v2.0.0 source-only release에서는
[development-backlog.md](./development-backlog.md)의
`v2.0.0 Release Close-out` 기준으로 VLM S00~S18 구현, 안정화/30분/UI/120분
evidence, GitHub Actions warning/Node 24 baseline, UI evidence runner, feature
inventory coverage, contract/schema freeze, fixture cleanup, CI/local gate parity,
published release evidence, auth/scope matrix의 확인됨/미실행/미확인 상태를 분리합니다.
Client/Ops UI-first workflow와 기존 live media path는 제품 baseline으로 유지합니다.
현재 release evidence는 [release-evidence-index.md](./release-evidence-index.md),
[manual-ui-checklist.md](./manual-ui-checklist.md),
[manual-ui-result-template.md](./manual-ui-result-template.md),
[project-feature-test-inventory.md](./project-feature-test-inventory.md),
[ui-visual-release-baseline-approval-template.md](./ui-visual-release-baseline-approval-template.md)를
source-of-truth로 삼습니다. 현재 `v2.0.0` release pass/fail 기준은 이 evidence와
통합 검증 명령으로 판단합니다.

## Tag 전략

- 현재 source-only release 기준 tag는 `v2.0.0`입니다.
- public-readiness, bundle policy, Actions status check가 모두 통과한 커밋에만 tag를 붙입니다.
- `v2.0.0`은 live-only media path를 유지하면서 VLM review assist를 source-only로 추가한 release이며, binary/runtime/model bundle의 운영 배포 완료를 뜻하지 않습니다.
- route/API/config/schema migration이 필요한 후속 변경은 `v2.1.0` 이후 후보로 분리합니다.
- tag release에는 generated sample pack, YOLO model, FFmpeg/GStreamer runtime bundle을 붙이지 않습니다.

## Actions update 정책

### GitHub Actions Node 24 baseline

v1.9.0 P0 기준 GitHub Actions 공식 action baseline은 `actions/checkout@v5`와
`actions/upload-artifact@v6`입니다. 두 action은 Node.js 24 runtime 경로이며,
self-hosted runner는 minimum Actions Runner version `2.327.1` 이상이어야 합니다.
GitHub-hosted runner를 쓰는 `Preflight`와 `Licensing and Artifact Guardrails`는 이
baseline을 사용하고, `RC Release Gate`에서 self-hosted runner를 지정할 때는 runner
version readiness를 별도 운영 조건으로 확인합니다.

`verify-actions-security`는 `actions/checkout@v5`, `actions/upload-artifact@v6`,
SHA pin, local action만 허용합니다. `.github/dependabot.yml`은 future semver major
update 알림을 자동 병합하지 않도록 유지합니다. Dependabot이 `actions/checkout@v6`
또는 `actions/upload-artifact@v7` 같은 future major update를 제안하면 Preflight가
실패하는 것이 현재 정책상 정상입니다. major update를 적용하려면 workflow 권한,
upstream changelog, runner compatibility, pin 전략을 먼저 검토합니다.

### GitHub Actions warning annotation gate

GitHub Actions check-run이 `success`여도 warning/failure annotation이 남아 있으면
release gate PASS evidence로 대체하지 않습니다. 특히 action runtime deprecation처럼
main check-run을 실패시키지 않는 warning/failure annotation은 release close-out 전에
차단하거나, owner가 별도 정책으로 허용 범위와 만료일을 승인해야 합니다. 현재
v1.9.0 P0 기준은 warning/failure annotation 전부 차단입니다.

GitHub check-runs annotations API에서 받은 JSON export는 아래 명령으로 확인합니다.

```bash
./server.sh verify-actions-security --annotations-json <annotations.json>
```

이 명령은 `annotation_level`이 `warning` 또는 `failure`인 항목을 실패로 처리합니다.
`notice` annotation은 release gate 실패로 보지 않지만, 실행하지 않은 API 확인을
PASS evidence로 대체하지 않습니다.

### CI/local gate parity

로컬 release/static verifier와 GitHub Actions required/static/guardrail gate는
`media-server.ci-local-gate-parity.v1` 기준으로 대조합니다. Preflight/static-gates,
Licensing and Artifact Guardrails/guardrails, RC Release Gate workflow에 들어간
`./server.sh` 명령이 문서화된 로컬 gate와 어긋나면 아래 명령이 실패해야 합니다.

```bash
./server.sh verify-ci-local-gate-parity
```

이 gate는 30분/120분 장시간 검증을 자동 실행하지 않습니다. RC workflow의
`verify-predev --soak-minutes 120`과 `verify-va-runtime-console-longrun --duration-minutes 120`
는 `workflow_dispatch` 입력이 명시된 경우에만 실행되는 별도 evidence입니다.

## Release Note Template

```markdown
# Media Server v2.0.0

## Scope

- Live-only media path plus VLM review-assist source/doc release
- Binary/runtime/model bundle: not included

## Live-only Scope

- Live media relay and live VA event focus remain unchanged
- VLM is added as an Ops-only event review assist layer: model selection criteria, PC capability detection, recommendation, install/connection dry-run, profile storage, evaluation fixture harness, evidence refs, sidecar observations, explanations, privacy guard, summary search candidates, and manual-only rule suggestion candidates
- v2.0.0 close-out: VLM S00-S18 verifier PASS, stability/30-minute/UI/120-minute evidence, release evidence index, manual UI evidence, feature inventory coverage, release metadata, and release close-out one-shot dry-run
- EventRecord/snapshot/clip: short event evidence helper, not the main product message

## Non-goals

- VMS/NVR/long-term recording/playback/search: not included
- VLM default-on, model/runtime bundle, provider credential storage, and real cloud provider field success: not included
- ONVIF Profile G recording/replay: not included
- ONVIF real-device success guarantee, credential store, Digest, and WS-Security: not included
- Re-ID default-on, tracker default-on, OC-SORT/BoT-SORT/DeepSORT runtime promotion, and YouTube production promotion: not included
- Recorded evidence API as primary integration contract: not included

## Verification

- Preflight: pass
- Licensing and Artifact Guardrails: pass
- verify-public-repo-readiness: pass
- verify-bundle-policy: pass
- verify-release-bundle-dry-run: pass

## Not Run / Unverified

- GitHub Actions status check:
- Longrun / soak:
- `verify-va-runtime-console-longrun --duration-minutes 120`:
- Cloud provider field call / credential operation:
- External TURN/WHEP credential operations:
- VLM model/runtime bundle:
- Real ONVIF device field smoke:
- YouTube real URL relay:

Do not list an item as pass unless it was actually executed for this release cut.

## Notes

- FFmpeg/GStreamer runtime은 사용자 설치 의존성입니다.
- YOLO model file은 release asset에 포함하지 않습니다.
- sample video는 검증 fixture이며 운영/고객 영상이 아닙니다.

## Known Limitations

- 장기 soak/RC 검증은 별도 workflow_dispatch 기준입니다.
- ONVIF 실장비 field smoke, YouTube 실제 URL relay, Re-ID default-on, tracker default-on, OC-SORT runtime promotion, VLM runtime/model bundle, real cloud provider call은 v2.0.0 완료 근거가 아닙니다.
```
