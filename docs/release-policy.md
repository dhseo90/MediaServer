# Release Policy

이 문서는 public repo 전환 후 release에 무엇을 올릴지 고정합니다.

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
- public visibility 전환은 이 문서와 [public-repo-final-review.md](./public-repo-final-review.md) 확인 후 수동으로만 진행합니다.

## Release Note Template

```markdown
# Media Server <version>

## Scope

- Source/doc release
- Binary/runtime/model bundle: not included

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
