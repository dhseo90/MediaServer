# Release Policy

이 문서는 Media Server 공개 release에 무엇을 올리고, 무엇을 올리지 않는지 정리합니다.
버전 의미는 [versioning-policy.md](./versioning-policy.md), 현재 개발 상태는
[development-backlog.md](./development-backlog.md)를 함께 봅니다.

## 현재 공개 상태

- 현재 소스 버전: `2.8.0`
- 최신 공개 GitHub Release: `v2.7.0`
- `v2.7.0` 공개 상태: source-only GitHub Release. Binary, runtime, model bundle은
  포함하지 않습니다.
- 현재 source roadmap은 `v2.8.0 Operator-Supervised Action Readiness`입니다.

## 기본 공개 범위

- 기본 release는 GitHub source archive와 문서 중심입니다.
- 별도 승인 전에는 binary bundle, app bundle, container image, offline package를
  공개 release asset으로 올리지 않습니다.
- FFmpeg, FFprobe, libav*, x264/x265, GStreamer GPL-risk plugin, ONNX Runtime package,
  YOLO/Re-ID/VLM model binary는 기본 release asset에 넣지 않습니다.
- 운영 auth store, log, snapshot, evidence bundle, 고객/현장 영상은 release asset에
  넣지 않습니다.

## 권한 경계

아래 작업은 각각 최신 사용자 지시에서 명시 승인된 경우에만 수행합니다.

- push
- PR 생성 또는 PR 갱신
- main merge
- tag 생성 또는 tag push
- GitHub Release 생성/갱신
- release branch 삭제
- 후속 브랜치 생성

`릴리즈 준비`, `마무리`, `close-out`, verifier PASS는 위 작업의 승인으로 해석하지
않습니다. tag 삭제, force push, GitHub Release 삭제, merge revert 같은 rollback성
작업도 별도 명시 지시 없이는 수행하지 않습니다.

## Local Release 준비

문서와 release metadata만 정리하는 기본 확인은 아래 범위입니다.

```bash
git diff --check
./server.sh verify-docs-links
./server.sh verify-docs-ui-assets
./server.sh verify-release-metadata
./server.sh verify-release-closeout-helper --dry-run --report <report.md> --json-report <report.json>
```

이 명령은 local 문서/버전 기준과 dry-run gate를 확인합니다. tag, push, GitHub Release,
main merge를 수행하지 않습니다.

## Published Release 확인

GitHub Release를 실제 publish한 뒤에만 아래 명령으로 외부 공개 상태를 확인합니다.

```bash
./server.sh verify-release-metadata --published --report <report.md> --json-report <report.json>
```

published metadata 확인에는 GitHub Releases list/view/latest, GitHub API
`/releases/latest`, repository page Releases/Latest link, remote tag/branch 확인이
포함됩니다. 네트워크, GitHub CLI, auth, remote ref 조회 실패는 published metadata
gate 실패 또는 미확인으로 보고하며 제품 runtime/media 회귀와 섞지 않습니다.

## GitHub Releases 운영

### v2.8.0 Release Close-out Runbook

아래 runbook은 수동으로만 진행합니다. `verify-release-closeout-helper`의 dry-run은
순서와 문서 경계를 확인할 뿐, 실제 release action을 실행하지 않습니다.

Dry-run checklist:

- `./server.sh verify-release-closeout-helper --dry-run --report <report.md> --json-report <report.json>`
- `./server.sh verify-release-closeout-helper --one-shot-dry-run`
- one-shot schema: `media-server.release-closeout-one-shot-gate.v1`
- fail-stop: 실패 단계 이후의 release action은 건너뜁니다.

Real close-out checklist:

- Branch close
- PR merge
- Main fast-forward/sync
- public-readiness, bundle policy, Actions status check
- Tag 전략에 맞춘 signed annotated tag 생성
- GitHub Release 생성/갱신
- Latest 확인
- published metadata 재검증
- release branch 삭제
- Next branch sync

Do not list an item as pass unless it was actually executed. tag, GitHub Release,
published metadata, release branch 삭제, Next branch sync는 각각 실행 evidence가
있을 때만 완료로 기록합니다.

## v2.8.0 Source Roadmap Scope

현재 `2.8.0` source tree는 아래 roadmap 후보를 source 기능과 local verifier 기준으로
정리합니다. 각 항목은 구현과 직접 evidence가 생긴 뒤에만 완료로 기록합니다. UI
풀테스트, 30분, 120분, 외부 endpoint field smoke는 실행한 경우에만 release evidence로
기록합니다.

- v2.8.0 source-of-truth/bootstrap 정렬
- 2.x runway / 3.0 major-change boundary
- Incident Action Readiness Queue
- Approval-gated Rule Draft Readiness
- Evidence Intake and Field Readiness
- Runtime Evidence Window
- Client-safe Follow-up Digest
- v2.8.0 owner release readiness

`v2.8.0` publish 완료 여부는 tag, GitHub Release, published metadata 검증 evidence가
있을 때만 완료로 기록합니다. 현재 latest published release는 `v2.7.0`입니다.
현재 공개 release tag 기준은 `v2.7.0`입니다. 다음 준비 중인 source tag 기준은 `v2.8.0`입니다.

## 2.x runway / 3.0 전환 경계

- 2.x 라인은 `2.8.0`과 `2.9.0`까지만 유지합니다.
- `2.8.0`은 기존 계약을 유지한 operator-supervised action readiness입니다.
- `2.9.0`은 2.x의 마지막 안정화와 3.0 transition readiness입니다.
- `3.0.0`은 route/API/config/schema, registry/storage, auth/scope, evidence storage,
  RTSP/WebRTC media path 같은 큰 변경을 별도 설계와 승인 후 다루는 major line입니다.

## v2.8.0 소유권 분리 / 릴리즈 준비 게이트

S07 local readiness gate는 구현 시 `media-server.v280-owner-release-readiness.v1`
기준으로 v2.8.0 Operator-Supervised Action Readiness Coverage Mapping, 수동 UI
criteria, release evidence index, release close-out dry-run command를 같은 범위로
묶습니다. 이 절은 source tree 준비 상태를 확인할 뿐 release action을 승인하거나
실행하지 않습니다.

Companion local gate 후보:

```bash
./server.sh verify-v280-owner-release-readiness
./server.sh verify-release-metadata
./server.sh verify-docs-links
./server.sh verify-docs-ui-assets
./server.sh verify-feature-inventory-coverage
./server.sh verify-manual-ui-evidence
./server.sh verify-release-evidence-index
./server.sh verify-release-closeout-helper --dry-run
git diff --check
```

`verify-v280-owner-release-readiness`는 아직 구현 후보 이름입니다. 스텝 구현 전에는
PASS 근거가 아니며, 실제 command wiring과 script inventory가 추가된 뒤에만 실행
evidence로 사용할 수 있습니다.

Not-run/excluded boundary:

- UI 풀테스트 직접 조작 미실행은 local readiness PASS로 대체하지 않습니다.
- 30분 테스트 미실행은 local readiness PASS가 아닙니다.
- 120분 테스트 미실행은 local readiness PASS가 아닙니다.
- tag/push/GitHub Release 실행은 S07 gate PASS로 대체하지 않습니다.
- `verify-release-metadata --published` 미실행 상태는 GitHub Release publish 전에는 PASS로 기록하지 않습니다.
- PR merge/main sync/후속 브랜치 생성은 별도 명시 승인과 실행 evidence가 있을 때만 완료로 기록합니다.
- ONVIF 실기기, external TURN/WHEP, real cloud/VLM provider 호출은 endpoint/credential/승인 없이는 제외 상태입니다.

## Tag 전략

- 현재 공개 release tag 기준은 `v2.7.0`입니다.
- 다음 준비 중인 source tag 기준은 `v2.8.0`입니다.
- `v2.8.0` release tag는 signed annotated tag로 생성합니다.
- 다음 신규 release tag는 signed annotated tag로 생성합니다.
- unsigned annotated tag와 lightweight tag는 새 release tag로 사용하지 않습니다.
- tag는 `main`의 public readiness, bundle policy, required Actions가 통과한 커밋에만
  붙입니다.
- signed tag evidence는 GitHub Tags/Releases의 Verified 표시 또는 GitHub API tag
  verification `verified=true`/`reason=valid`로 확인합니다.
- tag release에는 generated sample pack, YOLO model, FFmpeg/GStreamer runtime bundle을
  붙이지 않습니다.

## Binary/Container 후보

binary bundle, app bundle, container image, offline package는 별도 release candidate로
취급합니다.

필수 확인:

```bash
./server.sh verify-release-bundle-dry-run
./server.sh verify-runtime-model-bundle-rc-rehearsal
./server.sh verify-bundle-policy --bundle-dir <release_bundle_dir> --json-output /tmp/media_server_bundle_policy.json
./server.sh source-offer-checklist --stable --bundle-policy-report /tmp/media_server_bundle_policy.json
./server.sh verify-public-repo-readiness --report /tmp/media_server_public_repo_readiness.md
```

runtime/model을 의도적으로 포함하면 upstream license text, attribution, source offer,
model provenance, checksum manifest를 release note에 연결합니다.

## GitHub Actions 정책

- GitHub Actions Node 24 baseline은 `actions/checkout@v5`,
  `actions/upload-artifact@v6`, Node.js 24, minimum Actions Runner version `2.327.1`,
  `.github/dependabot.yml` 관리 기준을 함께 뜻합니다.
- 현재 GitHub Actions 공식 action baseline은 `actions/checkout@v5`와
  `actions/upload-artifact@v6`입니다.
- 두 action은 Node.js 24 runtime 경로이며, self-hosted runner는 minimum Actions Runner
  version `2.327.1` 이상이어야 합니다.
- `verify-actions-security`는 `actions/checkout@v5`, `actions/upload-artifact@v6`,
  SHA pin, local action만 허용합니다.
- GitHub Actions warning/failure annotation은 release gate PASS evidence로 대체하지
  않습니다. warning/failure annotation은 PASS evidence로 대체하지 않습니다.
  warning/failure annotation은 차단하거나 owner가 별도 정책으로 허용 범위와 만료일을
  승인해야 합니다.

Annotation JSON을 확보한 경우:

```bash
./server.sh verify-actions-security --annotations-json <annotations.json>
```

## v2.8.0 Release Note Template

아래 템플릿은 v2.8.0 source-only GitHub Release note 기준입니다. 실행하지 않은
장시간/UI/field smoke 테스트는 PASS로 쓰지 않습니다.

```markdown
# Media Server v2.8.0

## Scope

- Source-only live media server release
- Operator-supervised action readiness source scope
- 2.x runway: 2.8.0 and 2.9.0 only; 3.0.0 reserved for major changes
- Binary/runtime/model bundle: not included

## Verification

- Preflight:
- Licensing and Artifact Guardrails:
- GitHub Actions status check:
- Local docs/release metadata:
- UI fulltest:
- Longrun / soak:

## Not Run / Unverified

- Real ONVIF device field smoke:
- External TURN/WHEP credential operation:
- Real cloud provider call:
- VLM model/runtime bundle:
- YouTube real URL relay:

Do not list an item as pass unless it was actually executed for this release cut.
```

## 관련 문서

- [versioning-policy.md](versioning-policy.md)
- [development-backlog.md](development-backlog.md)
- [distribution-policy.md](distribution-policy.md)
- [public-repo-final-review.md](public-repo-final-review.md)
- [stream-verification.md](stream-verification.md)
