# Media Server Architecture

Korean detailed guide: [../media-server-architecture.md](../media-server-architecture.md)

## Product Boundary

Media Server is an RTSP/WebRTC relay with optional video analytics. It is not a long-term recording system by default. Evidence is event-oriented and short-lived unless a later product policy extends retention.

## Pipeline

```text
File / RTSP Pull / WHEP Pull / WHIP Publish / HTTP-HLS URI
        -> Source lifecycle
        -> Media pipeline
        -> RTSP Output / WebRTC Output
        -> optional VA overlay / metadata / events
```

## Source Types

| Source | Purpose |
| --- | --- |
| File | Local sample or fixture playback |
| RTSP pull | External camera or upstream RTSP source |
| WHEP pull | External WebRTC playback endpoint as an input source |
| WHIP publish | Browser or encoder publishes into the server |
| HTTP/HLS URI | HTTP media source experiment and verification path |

## Runtime Areas

- Source lifecycle: registration, reconnect, stale detection, cleanup.
- Session fanout: multiple viewers and outputs for a source.
- VA layer: detection, tracking, scene context, rule/scenario evaluation.
- Event layer: Event POST, EventRecord, short evidence artifacts.
- Ops state: channels, rules, profiles, users, scopes, audit records.

## Route Boundary

- `/ops` is the operator surface.
- `/client` is viewer-only.
- `/lab/analysis/*` is API/verification-only and does not expose product screens.

## Verification

```bash
./server.sh verify-analysis-state
./server.sh verify-route-profiles
./server.sh verify-ops-source-lifecycle
./server.sh verify-ops-root-cause-panel
```
