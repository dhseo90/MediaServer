# Public Repo Final Review

이 문서는 public repository 상태와 release readiness를 확인하는 기준입니다. GitHub가
제공하는 동일 설정 필드는 read-only API 실제 응답으로 확인할 수 있으며, API가 제공하지
않는 표시·설정만 owner가 GitHub Settings UI에서 직접 확인합니다. 확인 수단을 바꿔 PASS를
추정하거나 설정을 변경하지 않습니다.

## 현재 공개 상태

- 현재 소스 버전: `4.1.0`
- Live GitHub Latest: `https://github.com/dhseo90/MediaServer/releases/latest`
- 현재 release target: `v4.1.0`
- 직전 공개 baseline: `v4.0.0 Local Operations Policy and Stabilization`
- 이전 공개 baseline: `v3.9.1 Release Correctness and Public Repository Hygiene`
- 현재 source roadmap: `v4.1.0 Recording Foundation`
- S11 제품 검증과 B14 공개 준비는 완료했습니다. v4.1.0 외부 release는 signed tag,
  source-only GitHub Release, `verify-release-metadata --published` evidence로 확인합니다.
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

현재 추적되는 `video/*.mp4`와 allowlist된 아래 두 VA 입력은 재현용 생성 fixture로만
취급합니다.

- `video/imports/va_tracking_event_1280x720_30fps_h264.mp4`
- `video/imports/va_tracking_event_long_1280x720_30fps_h264.mp4`

두 번째 입력은 re-entry 시나리오의 clean-checkout 재현에 필요한 고정 fixture입니다.
릴리즈 UI full-test 스크린샷은 `docs/release-artifacts/v<version>/ui-fulltest-<date>/in-app-screenshots/`
또는 `docs/release-artifacts/v<version>/ui-fulltest-<date>/in-app-final-screenshots/`
아래의 최종 evidence 경로만 허용합니다. v3.9.0에서 이미 보존 계약에 결속된 audit-only
historical root 7개와 bounded failure root 1개의 PNG는 해당 정확한 경로만 추가 허용합니다.
v4.1.0 S09의 JPEG20개는 직접 시각·metadata 검토를 마친 과거 부분 증거로 유지합니다.
`reviewedHistoricalAssets`가 지정한 검토 manifest의 SHA와 개별 path/bytes/SHA가 모두
일치할 때만 허용하며, 동일 폴더의 새 이미지나 변경된 바이트는 허용하지 않습니다.
기존 실패·잘못 촬영한 화면·`wholeSuitePass=false`는 그대로이며 현재 UI PASS나 공개
대표 이미지로 승격하지 않습니다. 정제 transcript는 원본/정제본 해시·치환 영수증과
함께 평문으로 보존해 내용 검사가 가능해야 합니다. 원본 로그의 단순 압축은 정제가 아닙니다.
그 밖의 raw auth/registry/log/ports/seed 산출물과 운영 snapshot/clip bundle은 공개 대상이
아닙니다.

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

## GitHub 설정 확인

아래 항목은 read-only API의 동일 필드 실제 응답 또는 API가 제공하지 않는 경우 owner의
GitHub UI 직접 확인으로 판정합니다.

| 영역 | 확인 항목 | 허용 근거 |
| --- | --- | --- |
| Actions | Workflow permissions가 read-only인지 확인 | Actions permissions API의 `default_workflow_permissions=read` 실제 응답 또는 UI |
| Actions | GitHub Actions가 pull request를 create/approve할 수 없도록 설정 | Actions permissions API의 `can_approve_pull_request_reviews=false` 실제 응답 또는 UI |
| Branch protection | `main` required status checks가 저장소 정책과 일치 | active ruleset API의 strict required checks 실제 응답 또는 UI |
| Branch protection | force push 차단 | active ruleset API의 `non_fast_forward`/bypass 실제 응답 또는 UI |
| Branch protection | branch deletion 차단 | active ruleset API의 deletion/bypass 실제 응답 또는 UI |
| Repository metadata | Description과 topics가 현재 제품 경계를 설명 | repository/topics API 실제 응답 또는 UI |
| Visibility | public 상태와 owner 정책 일치 | repository API의 visibility·permission 실제 응답 또는 UI |

read-only API가 반환하지 않는 UI 표시나 owner 정책 의도는 수동 UI 확인으로 남깁니다.
API 응답 일부만으로 API 미제공 항목까지 확인했다고 확장하지 않습니다.

## Release 직전 확인

| 항목 | 상태 기준 |
| --- | --- |
| working tree | `git status --short --branch`가 의도한 변경만 표시 |
| secret scan | 현재 추적 텍스트의 금지 경로·고신뢰 비밀 패턴과 기본 최근500 commit의 고신뢰 비밀 패턴 검사를 구분해 기록. 임의 비밀번호·모든 archive·전체 이력 부재로 확대하지 않음 |
| README 첫 화면 | 제품 경계, release target, live Latest 링크, 현재 소스 버전, 빠른 시작이 한눈에 보임 |
| 영문 문서 | README.en과 docs/en/README가 한국어 문서와 같은 상태를 설명 |
| VERSION/CMake | `VERSION`과 `CMakeLists.txt` 버전 일치 |
| release policy | source-only, tag, GitHub Release, not-run 경계가 현재 상태와 일치 |
| bundle policy | 기본 release asset에 runtime/model/binary가 포함되지 않음 |
| required checks | 최신 PR/main 기준 required checks와 warning/failure annotation 확인 |

각 항목은 실제 확인한 날짜와 명령/화면 근거가 있을 때만 PASS로 기록합니다. 이 문서는
과거 체크박스를 현재 PASS로 재사용하지 않습니다.
정제 전 원본 증거의 개인/임시 경로는 현재 파일에서 제거하되 원본 commit과 해시를
역사적 복구 근거로 보존합니다. 따라서 현재 자료 정제와 Git 전체 이력의 경로 삭제는
다릅니다. 이력 재작성이나 비밀 원문의 공개 허용을 뜻하지 않으며, 별도 이력 삭제는
사용자 결정이 필요합니다.
