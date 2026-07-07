# Public Repo Final Review

이 문서는 public repository 상태와 release readiness를 확인하는 기준입니다. GitHub
Settings 화면에서 직접 눌러야 하는 항목은 자동화하지 않고 수동 체크로 남깁니다.

## 현재 공개 상태

- 현재 소스 버전: `3.9.0`
- 최신 공개 GitHub Release: `v3.8.0`
- `v3.8.0` 공개 상태: source-only GitHub Release. Binary, runtime, model bundle은 포함하지 않습니다.
- 최신 published baseline: `v3.8.0 Operator-Gated Action Pilot & Outcome Loop`
- 현재 source roadmap: `v3.9.0 Feature Completion, Structure Stabilization, and Test Model Preparation`
- `v3.9.0` publish 완료는 tag, GitHub Release, `verify-release-metadata --published` evidence가 있을 때만 완료로 기록합니다.
- public repository 기준은 source-only 공개입니다.

## 공개 대상

- Apache-2.0 source code
- 문서, 설정 예시, 검증 스크립트
- allowlist된 생성 sample fixture
- cleanup과 민감정보 스캔을 마친 release UI full-test in-app screenshot evidence

## 공개 제외 대상

- FFmpeg, FFprobe, libav*, x264/x265, GStreamer GPL-risk plugin binary
- YOLO/Re-ID/VLM model binary
- runtime bundle, app bundle, container image, offline package
- 로컬 auth store, credential, token, 운영 로그
- 고객/현장 영상, 운영 evidence media, snapshot, clip bundle

현재 추적되는 `video/*.mp4`와 allowlist된
`video/imports/va_tracking_event_1280x720_30fps_h264.mp4`는 재현용 생성 fixture로만
취급합니다.
릴리즈 UI full-test 스크린샷은 `docs/release-artifacts/v<version>/ui-fulltest-<date>/in-app-screenshots/`
또는 `docs/release-artifacts/v<version>/ui-fulltest-<date>/in-app-final-screenshots/`
아래의 최종 evidence 경로만 허용하며, raw auth/registry/log/ports/seed 산출물과 운영
snapshot/clip bundle은 공개 대상이 아닙니다.

## 자동 확인

public/release readiness를 로컬 또는 CI에서 확인할 때 실행합니다.

```bash
./server.sh verify-script-inventory
./server.sh verify-feature-inventory-coverage
./server.sh verify-code-comments
./server.sh verify-docs-links
./server.sh verify-docs-ui-assets
./server.sh verify-actions-security
./server.sh verify-ci-local-gate-parity
./server.sh write-dependency-notice --check
./server.sh verify-public-repo-readiness --report /tmp/media_server_public_repo_readiness.md
./server.sh dependency-snapshot --stable --output /tmp/media_server_dependency_snapshot.md --json-output /tmp/media_server_dependency_snapshot.json --no-linked-libs
./server.sh verify-bundle-policy --output /tmp/media_server_bundle_policy.md --json-output /tmp/media_server_bundle_policy.json
./server.sh source-offer-checklist --stable --bundle-policy-report /tmp/media_server_bundle_policy.json --output /tmp/media_server_source_offer_checklist.md
```

CI/local gate parity는 `media-server.ci-local-gate-parity.v1` 기준입니다.
`./server.sh verify-ci-local-gate-parity`는 Preflight/static-gates/guardrails workflow와
로컬 release gate 명령이 서로 빠지지 않았는지 확인합니다.

GitHub check-run annotation JSON을 확보한 경우에만 아래 gate를 추가합니다.

```bash
./server.sh verify-actions-security --annotations-json <annotations.json>
```

annotation 상태를 확인하지 않았으면 release gate PASS로 대체하지 않습니다.

## 수동 GitHub 설정

아래 항목은 owner가 GitHub UI에서 직접 확인합니다.

| 영역 | 확인 항목 |
| --- | --- |
| Actions | Workflow permissions가 read-only인지 확인 |
| Actions | GitHub Actions가 pull request를 create/approve할 수 없도록 설정 |
| Branch protection | `main` required status checks가 저장소 정책과 일치 |
| Branch protection | force push 차단 |
| Branch protection | branch deletion 차단 |
| Repository metadata | Description과 topics가 현재 제품 경계를 설명 |
| Visibility | public 상태와 owner 정책 일치 |

## Release 직전 확인

| 항목 | 상태 기준 |
| --- | --- |
| working tree | `git status --short --branch`가 의도한 변경만 표시 |
| secret scan | secret, token, password, auth store, 개인 local path가 문서/코드/history에 없음 |
| README 첫 화면 | 제품 경계, 최신 공개 릴리즈, 현재 소스 버전, 빠른 시작이 한눈에 보임 |
| 영문 문서 | README.en과 docs/en/README가 한국어 문서와 같은 상태를 설명 |
| VERSION/CMake | `VERSION`과 `CMakeLists.txt` 버전 일치 |
| release policy | source-only, tag, GitHub Release, not-run 경계가 현재 상태와 일치 |
| bundle policy | 기본 release asset에 runtime/model/binary가 포함되지 않음 |
| required checks | 최신 PR/main 기준 required checks와 warning/failure annotation 확인 |

각 항목은 실제 확인한 날짜와 명령/화면 근거가 있을 때만 PASS로 기록합니다. 이 문서는
과거 체크박스를 현재 PASS로 재사용하지 않습니다.
