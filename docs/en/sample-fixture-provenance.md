# Sample Fixture Provenance

Detailed Korean document: [../sample-fixture-provenance.md](../sample-fixture-provenance.md)

The public repository keeps only generated verification fixtures. Operational media, customer media, evidence media, and large imported videos are excluded.

## Public Fixtures

| Path | Purpose | Provenance | Public decision |
| --- | --- | --- | --- |
| `video/sample.mp4` | Basic file/RTSP smoke | Generated test fixture | Allowed |
| `video/sample_h264.mp4` | H.264 smoke | Generated codec fixture | Allowed |
| `video/sample_h264_video_only.mp4` | H.264 without audio | Generated codec fixture | Allowed |
| `video/sample_h265.mp4` | H.265 smoke | Generated codec fixture | Allowed |
| `video/va_four_scene_sample.mp4` | Four-scene VA overlay docs and checks | Generated VA scene fixture | Allowed |
| `video/va_sports_sample.mp4` | VA category/sample smoke | Generated sports-like fixture | Allowed |
| `video/imports/va_tracking_event_1280x720_30fps_h264.mp4` | Tracking/event regression | Generated allowlisted import fixture | Allowed |

## Excluded

- Unallowlisted files under `video/imports/`
- Customer or field footage
- Evidence snapshots and clips
- YOLO/ONNX model binaries
- FFmpeg/GStreamer runtime binaries
- Auth stores, logs, package-manager caches

## Check

```bash
./server.sh verify-public-repo-readiness --report /tmp/media_server_public_repo_readiness.md
```
