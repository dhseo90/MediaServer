# Video Analytics

Korean detailed guide: [../video-analysis.md](../video-analysis.md)

## Scope

Video analytics is optional. Streaming paths can build and run without AI assets.

```bash
MEDIA_SERVER_ENABLE_AI=0 ./server.sh build
```

## Analysis Flow

```text
YOLO Detection
  -> Direction-Based Tracker
  -> TrackStateManager
  -> SceneContextBuilder
  -> RuleEventEngine / ScenarioEngine
  -> EventManager
  -> Overlay / Metadata / Event POST / EventRecord
```

## Models And Assets

- YOLO ONNX models are local runtime assets, not public release assets.
- Model names and hashes belong in [../../DEPENDENCY_SNAPSHOT.md](../../DEPENDENCY_SNAPSHOT.md).
- Labels and small config files can be documented, but large model binaries stay ignored.

## Rule And Scenario Areas

| Area | Purpose |
| --- | --- |
| Rule | Operator-configured event condition bound to a channel/source |
| Profile | Reusable analysis configuration |
| Scenario | Higher-level VA behavior such as Loitering or LineCrossing |
| EventRecord | Stored event summary and short evidence reference |

## Field Presets

Current field-oriented presets include Loitering, ZoneOccupancy, LineCrossing, and Intrusion. Starting thresholds are tracked in [analysis-threshold-baselines.md](./analysis-threshold-baselines.md).

## Verification

```bash
./server.sh verify-va-replay
./server.sh verify-va-events
./server.sh verify-rtsp-va-overlay-policy
./server.sh verify-webrtc-va-metadata
```
