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
- RC longrun 결과는 `rc-release-checklist` 또는 Actions artifact로 보관합니다.
- UI visual release baseline artifact는 승인된 release/RC 화면 상태를 다음 candidate와 비교하는 approved comparator입니다. public release asset으로 기본 업로드하지 않으며, release note에는 [UI Visual Release Baseline Approval Log](./ui-visual-release-baseline-approval-template.md)를 기준으로 accepted baseline run, baseline diff, 수동 비노출 검토 결과 링크만 남깁니다. template presence와 CI 연결은 `./server.sh verify-ui-release-baseline-approval-log`로 확인합니다.
- public visibility 전환은 이 문서와 [public-repo-final-review.md](./public-repo-final-review.md) 확인 후 수동으로만 진행합니다.

## Release / Visual Baseline Readiness

`verify-release-closeout-helper`는 release local verifier, tag/push 수동 gate,
visual artifact policy, screenshot review 체크포인트를 한 dry-run report로 묶습니다.
JSON report의 visual 자동화 영역은
`media-server.release-visual-baseline-automation.v1` schema를 사용합니다.

```bash
./server.sh verify-release-closeout-helper --dry-run --report <report.md> --json-report <report.json>
```

preflight CI는 이 report를 `media-server-release-closeout-helper-dry-run`
artifact로 업로드합니다. 같은 release 준비 흐름에서
`verify-docs-ui-assets`, `verify-ui-visual-artifact-index`,
`verify-ui-release-baseline-approval-log`, `write-ui-visual-baseline-comment`,
`ui-visual-artifact-maintenance` 결과를 함께 확인합니다.
future tag, push, GitHub Release, accepted baseline 채택, 320/390/760/1180px
screenshot review는 리포트에 manual/not-run으로 남기며, 실제 실행 및 링크가
없는 항목을 pass로 쓰지 않습니다.
v1.6.0 stabilization release에서는
[v1.6.0 Release Evidence Dashboard](./v1.6.0-release-evidence-dashboard.md)와
`./server.sh verify-v160-release-evidence-dashboard`로 release evidence의
확인됨/미실행/미확인 상태를 분리합니다.
ONVIF field smoke evidence는
[v1.6.0 ONVIF Field Smoke Evidence Reconciliation](./v1.6.0-onvif-field-smoke-evidence-reconciliation.md)와
`./server.sh verify-v160-onvif-field-smoke-evidence-reconciliation` 기준으로
no-device suite, 실장비 미실행, redacted artifact review를 분리합니다.

## Tag 전략

- 현재 published source-only release tag는 `v1.5.0`입니다.
- public-readiness, bundle policy, Actions status check가 모두 통과한 커밋에만 tag를 붙입니다.
- `v1.5.0`은 live-only source release 기준을 유지한 minor release이며, binary/runtime/model bundle의 운영 배포 완료를 뜻하지 않습니다.
- route/API/config/schema migration이 필요한 변경은 `v2.0.0` 후보로 분리합니다.
- tag release에는 generated sample pack, YOLO model, FFmpeg/GStreamer runtime bundle을 붙이지 않습니다.

## Actions update 정책

`verify-actions-security`는 공식 `actions/*@v4`, SHA pin, local action만 허용합니다.
Dependabot이 `actions/checkout@v6`, `actions/upload-artifact@v7`처럼 major update를 제안하면
Preflight가 실패하는 것이 현재 정책상 정상입니다.
major update를 적용하려면 workflow 권한, upstream changelog, pin 전략을 먼저 검토합니다.

## Release Note Template

```markdown
# Media Server v1.5.0

## Scope

- Live-only source/doc minor release
- Binary/runtime/model bundle: not included

## Live-only Scope

- Live media relay and live VA event focus
- ONVIF Profile S/T assisted source onboarding, source health operator workflow, VA event quality, UI refresh, delivery contract artifact work, and rule-level tracker/Re-ID opt-in work
- v1.5.0 close-out: explicit tracker/Re-ID opt-in guard, stability matrix, Re-ID provenance/fallback approval, tracker warning next-action copy, audit export masking hardening, field smoke summary evidence boundary, OC-SORT manifest-only sandbox, and follow-up closure
- EventRecord/snapshot/clip: short event evidence helper, not the main product message

## Non-goals

- VMS/NVR/long-term recording/playback/search: not included
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
- Real ONVIF device field smoke:
- YouTube real URL relay:
- External TURN/WHEP credential operations:

Do not list an item as pass unless it was actually executed for this release cut.

## Notes

- FFmpeg/GStreamer runtime은 사용자 설치 의존성입니다.
- YOLO model file은 release asset에 포함하지 않습니다.
- sample video는 검증 fixture이며 운영/고객 영상이 아닙니다.

## Known Limitations

- 장기 soak/RC 검증은 별도 workflow_dispatch 기준입니다.
- ONVIF 실장비 field smoke, YouTube 실제 URL relay, Re-ID default-on, tracker default-on, OC-SORT runtime promotion은 v1.5.0 완료 근거가 아닙니다.
```
