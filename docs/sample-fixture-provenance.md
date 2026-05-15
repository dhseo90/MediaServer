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
| `test/fixtures/onvif_field_smoke_artifact_sample/` | ONVIF 현장 smoke 산출물 redaction layout | 실제 장비/credential 없는 합성 sample bundle | 공개 가능 |

## 공개 제외 대상

- `video/imports/`의 allowlist 밖 영상
- 운영/고객 영상, evidence snapshot, evidence clip bundle
- YOLO/ONNX model binary와 대형 test media
- FFmpeg/GStreamer runtime binary, package-manager cache, local auth store, log

## 검증

```bash
./server.sh verify-public-repo-readiness --report /tmp/media_server_public_repo_readiness.md
```

`config/public_repo_policy.json`의 `allowedTrackedAssetPatterns`가 이 문서의 공개 가능 목록과 맞아야 합니다.
