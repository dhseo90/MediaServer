# Sample Fixture Provenance

이 문서는 public repo에 남겨도 되는 sample 영상과 제외해야 하는 영상을 구분합니다.
기본 기준은 “운영/고객 영상이 아니라 검증 재현을 위해 생성한 fixture만 추적한다”입니다.

## 공개 가능 fixture

| 경로 | 용도 | 출처/생성 기준 | 공개 판단 |
| --- | --- | --- | --- |
| `video/sample.mp4` | 기본 file/RTSP smoke | 검증용으로 생성한 짧은 sample fixture | 공개 가능 |
| `video/sample_h264.mp4` | H.264 smoke | 검증용으로 생성한 codec fixture | 공개 가능 |
| `video/sample_h264_video_only.mp4` | audio 없는 H.264 smoke | 검증용으로 생성한 codec fixture | 공개 가능 |
| `video/sample_h265.mp4` | H.265 smoke | 검증용으로 생성한 codec fixture | 공개 가능 |
| `video/va_four_scene_sample.mp4` | 4분할 VA overlay 문서/검증 | 검증용으로 생성한 VA scene fixture | 공개 가능 |
| `video/va_sports_sample.mp4` | VA category/sample smoke | 검증용으로 생성한 sports-like fixture | 공개 가능 |
| `video/imports/va_tracking_event_1280x720_30fps_h264.mp4` | tracking/event 회귀 | 검증용으로 생성한 allowlist import fixture | 공개 가능 |
| `test/fixtures/onvif_live_import_stub.json` | ONVIF live source 지원 fixture draft 검증 | 실제 장비/credential 없는 합성 JSON fixture | 공개 가능 |
| `test/fixtures/onvif_synthetic_vendor_fixture_pack.json` | ONVIF Profile S/T vendor-style 응답 차이 검증 | 실제 장비/credential 없는 합성 JSON fixture | 공개 가능 |
| `test/fixtures/onvif_auth_method_design_matrix.json` | ONVIF Basic/Digest/WS-Security 인증 방식 설계 경계 검증 | secret/captured trace 없는 합성 JSON fixture | 공개 가능 |
| `test/fixtures/onvif_credential_store_policy_decision.json` | ONVIF persistent credential store 후속 gate 결정 검증 | secret/captured trace 없는 합성 JSON fixture | 공개 가능 |
| `test/fixtures/onvif_field_smoke_artifact_sample/` | ONVIF 현장 smoke 산출물 redaction layout | 실제 장비/credential 없는 합성 sample bundle | 공개 가능 |
| `test/fixtures/runtime_dashboard_longrun_evidence_sample/` | Runtime Dashboard longrun evidence template shape 검증 | 실제 longrun 실행 증거가 아닌 sample-only 합성 fixture | 공개 가능 |

## 공개 제외 대상

- `video/imports/`의 allowlist 밖 영상
- 운영/고객 영상, evidence snapshot, evidence clip bundle
- YOLO/ONNX model binary와 대형 test media
- FFmpeg/GStreamer runtime binary, package-manager cache, local auth store, log

## v1.2.1 Housekeeping Gate

v1.2.1 patch에서는 dependency snapshot, visual artifact, sample fixture provenance를
release 후 상태로 다시 확인하되 runtime/model/binary bundle 범위를 열지 않습니다.

- Dependency snapshot은 release review 때 `/tmp` 산출물로 재생성해 현재 환경을
  확인합니다. `DEPENDENCY_SNAPSHOT.md`는 의도한 release 기준 변경이 있을 때만
  커밋합니다.
- UI visual artifact는 `media-server.ui-visual-artifact-retention.v1` 기준으로
  PR artifact 14 days, release baseline 45 days 보존 정책을 유지합니다. screenshot
  artifact는 검증 산출물이며 public release asset이 아닙니다.
- Sample fixture provenance는 위 표의 allowlist 안에서만 공개 가능으로 봅니다.
  새 fixture를 추가하면 실제 장비/credential/customer media가 아닌지 먼저 이
  문서에 기록합니다.
- Bundle policy는 source/doc 기본 release 경계를 확인하는 guard입니다. FFmpeg,
  GStreamer runtime package, ONNX Runtime package, YOLO model binary를 patch
  release asset에 포함하지 않습니다.

## 검증

```bash
./server.sh dependency-snapshot --stable --output /tmp/media_server_dependency_snapshot.md --json-output /tmp/media_server_dependency_snapshot.json --no-linked-libs
./server.sh verify-ui-visual-artifact-index
./server.sh verify-bundle-policy --output /tmp/media_server_bundle_policy.md --json-output /tmp/media_server_bundle_policy.json
./server.sh verify-public-repo-readiness --report /tmp/media_server_public_repo_readiness.md
```

`config/public_repo_policy.json`의 `allowedTrackedAssetPatterns`가 이 문서의 공개 가능 목록과 맞아야 합니다.
