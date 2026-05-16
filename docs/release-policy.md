# Release Policy

이 문서는 release에 무엇을 올릴지 고정합니다.
버전 의미는 [versioning-policy.md](./versioning-policy.md)에서 함께 관리합니다.

## 기본 release 범위

- 기본 release는 source archive와 문서 중심입니다.
- GitHub가 자동 생성하는 source archive 외 binary bundle은 기본 제공하지 않습니다.
- FFmpeg, FFprobe, libav*, x264/x265, GStreamer GPL-risk plugin, ONNX Runtime package, YOLO model binary는 release asset에 넣지 않습니다.
- 운영 auth store, log, snapshot, evidence bundle, 고객/현장 영상은 release asset에 넣지 않습니다.

## Binary/Container release 기준

binary bundle, app bundle, container image, offline package는 별도 release candidate로 취급합니다.

필수 확인:

```bash
./server.sh verify-bundle-policy --bundle-dir <release_bundle_dir> --json-output /tmp/media_server_bundle_policy.json
./server.sh source-offer-checklist --stable --bundle-policy-report /tmp/media_server_bundle_policy.json
./server.sh verify-public-repo-readiness --report /tmp/media_server_public_repo_readiness.md
```

위반 항목이 있으면 기본 release 대상이 아닙니다.
runtime을 의도적으로 포함하면 upstream license text, attribution, source offer, checksum manifest를 release note에 연결합니다.

## GitHub Releases 운영

- release note에는 commit, 검증 명령, known limitation을 짧게 적습니다.
- source-only release에는 sample/model/runtime binary를 추가 업로드하지 않습니다.
- RC longrun 결과는 `rc-release-checklist` 또는 Actions artifact로 보관합니다.
- UI visual release baseline artifact는 승인된 release/RC 화면 상태를 다음 candidate와 비교하는 approved comparator입니다. public release asset으로 기본 업로드하지 않으며, release note에는 [UI Visual Release Baseline Approval Log](./ui-visual-release-baseline-approval-template.md)를 기준으로 accepted baseline run, baseline diff, 수동 비노출 검토 결과 링크만 남깁니다.
- public visibility 전환은 이 문서와 [public-repo-final-review.md](./public-repo-final-review.md) 확인 후 수동으로만 진행합니다.

## Tag 전략

- 현재 source-only tag 후보는 `v1.1.0`입니다.
- public-readiness, bundle policy, Actions status check가 모두 통과한 커밋에만 tag를 붙입니다.
- `v1.1.0`은 live-only source release 기준이며, binary/runtime/model bundle의 운영 배포 완료를 뜻하지 않습니다.
- route/API/config/schema migration이 필요한 변경은 `v2.0.0` 후보로 분리합니다.
- tag release에는 generated sample pack, YOLO model, FFmpeg/GStreamer runtime bundle을 붙이지 않습니다.

## Actions update 정책

`verify-actions-security`는 공식 `actions/*@v4`, SHA pin, local action만 허용합니다.
Dependabot이 `actions/checkout@v6`, `actions/upload-artifact@v7`처럼 major update를 제안하면
Preflight가 실패하는 것이 현재 정책상 정상입니다.
major update를 적용하려면 workflow 권한, upstream changelog, pin 전략을 먼저 검토합니다.

## Release Note Template

```markdown
# Media Server v1.1.0

## Scope

- Live-only source/doc release baseline
- Binary/runtime/model bundle: not included

## Live-only Scope

- Live media relay and live VA event focus
- ONVIF-assisted live source onboarding, source health, VA event quality, and delivery contract work
- EventRecord/snapshot/clip: short event evidence helper, not the main product message

## Non-goals

- VMS/NVR/long-term recording/playback/search: not included
- ONVIF Profile G recording/replay: not included
- Recorded evidence API as primary integration contract: not included

## Verification

- Preflight: pass
- Licensing and Artifact Guardrails: pass
- verify-public-repo-readiness: pass
- verify-bundle-policy: pass

## Notes

- FFmpeg/GStreamer runtime은 사용자 설치 의존성입니다.
- YOLO model file은 release asset에 포함하지 않습니다.
- sample video는 검증 fixture이며 운영/고객 영상이 아닙니다.

## Known Limitations

- 장기 soak/RC 검증은 별도 workflow_dispatch 기준입니다.
```
