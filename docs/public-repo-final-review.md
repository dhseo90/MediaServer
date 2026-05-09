# Public Repo Final Review

이 문서는 private 저장소를 public으로 바꾸기 직전 마지막 확인 기준입니다.
GitHub Settings 화면에서 직접 눌러야 하는 항목은 자동화하지 않고 수동 체크로 남깁니다.

## 현재 수동 설정 기록

2026-05-10 기준 확인 상태:

- 최신 public readiness commit: `944c218 Add public repo readiness checks`
- Actions 성공 확인:
  - `Preflight #5`
  - `Licensing and Artifact Guardrails #2`
- Required status checks:
  - `static-gates`
  - `guardrails`
- Ruleset branch rule:
  - `Restrict deletions`: enabled
  - `Block force pushes`: enabled
- Repository metadata:
  - Description: `RTSP/WebRTC media server with optional YOLO-based video analytics`
  - Topics: `rtsp`, `gstreamer`, `cpp`, `webrtc`, `media-server`, `yolo`, `video-analytics`
- Visibility: private 유지. public 전환은 owner가 수동으로 판단합니다.

`Restrict deletions`와 `Block force pushes`는 GitHub Actions check가 아니라 ruleset branch rule입니다.
Required status check에는 추가하지 않고, checkbox enabled 상태만 확인합니다.

## 자동 확인

공개 전 로컬 또는 CI에서 실행합니다.

```bash
./server.sh verify-script-inventory
./server.sh verify-code-comments
./server.sh verify-docs-links
./server.sh verify-docs-ui-assets
./server.sh verify-actions-security
./server.sh write-dependency-notice --check
./server.sh verify-public-repo-readiness --report /tmp/media_server_public_repo_readiness.md
./server.sh dependency-snapshot --stable --output /tmp/media_server_dependency_snapshot.md --json-output /tmp/media_server_dependency_snapshot.json --no-linked-libs
./server.sh verify-bundle-policy --output /tmp/media_server_bundle_policy.md --json-output /tmp/media_server_bundle_policy.json
./server.sh source-offer-checklist --stable --bundle-policy-report /tmp/media_server_bundle_policy.json --output /tmp/media_server_source_offer_checklist.md
```

media pipeline을 바꾸지 않은 공개 준비 변경은 FFmpeg CLI 의존을 분리한 smoke를 사용할 수 있습니다.

```bash
./server.sh test --basic --ffmpeg-free
```

## 공개 대상

- 기본 공개 대상은 Apache-2.0 소스, 문서, 설정 예시, 검증 스크립트, allowlist된 생성 sample fixture입니다.
- 기본 공개 대상에 FFmpeg, FFprobe, libav*, x264/x265, GStreamer GPL-risk plugin 바이너리는 포함하지 않습니다.
- YOLO model, 대형 import video, 로컬 auth store, 운영 로그, evidence media는 공개 대상에 포함하지 않습니다.
- 현재 추적되는 `video/*.mp4`와 allowlist된 `video/imports/va_tracking_event_1280x720_30fps_h264.mp4`는 재현용 생성 fixture로만 취급합니다.
- binary bundle, app bundle, container image, offline package는 별도 release gate 통과 전까지 제공하지 않습니다.

## 수동 GitHub 설정

Actions:

- Settings > Actions > General
- Workflow permissions: Read repository contents permission
- Allow GitHub Actions to create and approve pull requests: off

Branch protection:

- Settings > Branches > Add branch protection rule
- Branch name pattern: `main`
- Require status checks to pass before merging: on
- Status check: `Licensing and Artifact Guardrails / guardrails`
- Allow force pushes: off
- Allow deletions: off
- Require a pull request before merging: public 전까지는 보류 가능

Repository metadata:

- Description은 public 사용자에게 제품 범위를 짧게 설명합니다.
- Topics는 실제 지원 범위만 넣습니다.
- Visibility는 이 문서와 CI가 통과한 뒤 마지막에 수동으로 public 전환합니다.

Public 전환 후 확인:

- Rulesets 화면에서 `main` ruleset이 실제 enforced 상태인지 확인합니다.
- Required status checks에 `static-gates`, `guardrails`가 유지되는지 확인합니다.
- test branch에서 force push/delete가 차단되는지 확인합니다.
- README badge가 public 화면에서 정상 표시되는지 확인합니다.
- `Actions` 탭에서 public 전환 이후 첫 `Preflight`, `Licensing and Artifact Guardrails` run이 성공하는지 확인합니다.
- 이 확인은 GitHub UI/권한 동작이므로 자동 수정하지 않습니다.

## History/Asset 판단

- 2026-05-10 로컬 점검에서 `.git`은 약 165MB입니다.
- 현재 추적 중인 가장 큰 public fixture는 `video/imports/va_tracking_event_1280x720_30fps_h264.mp4` 약 16MB입니다.
- `models/`는 로컬에는 있을 수 있지만 `.gitignore` 대상이며 추적하지 않습니다.
- public 전환을 위해 history rewrite는 권장하지 않습니다. 현재 asset 범위는 `config/public_repo_policy.json` allowlist와 `verify-public-repo-readiness`로 관리합니다.

## 공개 전 점검표

- [ ] `git status --short`에 의도하지 않은 파일이 없습니다.
- [ ] secret, token, password, auth store, 개인 local path가 문서/코드/history에 없습니다.
- [ ] `verify-public-repo-readiness`가 통과했습니다.
- [ ] README 첫 화면이 실행 환경, 접속 주소, 문서 로드맵을 명확히 보여줍니다.
- [ ] LICENSE는 Apache-2.0이고 NOTICE/THIRD_PARTY_NOTICES가 최신입니다.
- [ ] `DEPENDENCY_SNAPSHOT.md`가 현재 release 판단 기준과 맞습니다.
- [ ] `verify-bundle-policy` 결과에 기본 정책 위반 항목이 없습니다.
- [ ] runtime 포함 배포를 선택한 경우 source offer checklist를 release 기록에 첨부했습니다.
- [ ] public 전환 후 처음 열 사용자가 따라 할 빠른 시작 경로가 깨지지 않습니다.
