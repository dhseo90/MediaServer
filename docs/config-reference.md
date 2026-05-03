# Config Reference

이 문서는 런타임 환경변수와 주요 build/script 설정을 모읍니다. 실제 기본값의 source of truth는 `include/stdafx.h`, `src/app_config.cpp`, `scripts/internal/*.sh`입니다.

## 기본 규칙

- boolean 값은 보통 `1/0`, `true/false`를 허용합니다.
- 경로는 repo 기준 상대경로를 우선 사용합니다.
- `file=` token은 기본적으로 `MEDIA_SERVER_FILE_ROOT` 아래에서 해석됩니다.
- 잘못된 값은 서버가 안전한 기본값으로 보정하고 stderr에 경고를 남깁니다.
- 표의 `code default`, `script default`, `resolver default`는 코드나 script 내부 기본값을 따른다는 뜻입니다.

## 서버 기본 env

### 런타임 기본값

| 환경변수 | 기본값 | 설명 |
| --- | --- | --- |
| `MEDIA_SERVER_ROUTE` | `dhseo` | RTSP route prefix |
| `MEDIA_SERVER_LISTEN_ADDRESS` | `127.0.0.1` | RTSP bind address |
| `MEDIA_SERVER_LISTEN_PORT` | `8554` | RTSP bind port |
| `MEDIA_SERVER_HTTP_LISTEN_ADDRESS` | `127.0.0.1` | HTTP/WebRTC bind address |
| `MEDIA_SERVER_HTTP_LISTEN_PORT` | `8080` | HTTP/WebRTC bind port |
| `MEDIA_SERVER_AUTH_MODE` | `off` | HTTP auth mode. `off`, `token`, `session` |
| `MEDIA_SERVER_AUTH_ADMIN_TOKEN` | empty | `token`/`session` mode에서 admin principal로 인증할 Bearer/query token |
| `MEDIA_SERVER_AUTH_OPERATOR_TOKEN` | empty | `token`/`session` mode에서 operator principal로 인증할 Bearer/query token |
| `MEDIA_SERVER_AUTH_VIEWER_TOKEN` | empty | `token`/`session` mode에서 viewer principal로 인증할 Bearer/query token |
| `MEDIA_SERVER_AUTH_INTEGRATOR_TOKEN` | empty | `token`/`session` mode에서 integrator principal로 인증할 Bearer/query token |
| `MEDIA_SERVER_AUTH_USERS_FILE` | `.media_server.users.json` | `session` login 계정 registry JSON |
| `MEDIA_SERVER_AUTH_SESSION_TTL_SECONDS` | `86400` | session cookie 만료 시간 |
| `MEDIA_SERVER_AUTH_COOKIE_NAME` | `media_server_session` | session cookie 이름 |
| `MEDIA_SERVER_AUTH_COOKIE_SECURE` | `0` | `1`이면 session cookie에 `Secure` attribute 추가 |
| `MEDIA_SERVER_UI_DEFAULT_HOME` | `lab` | auth off에서 `/`가 이동할 home. `lab`, `ops`, `client` |
| `MEDIA_SERVER_ENABLE_LAB` | `1` | `/lab` 개발/검증 route 노출 |
| `MEDIA_SERVER_ENABLE_OPS` | `1` | `/ops` 운영 shell/API route 노출 |
| `MEDIA_SERVER_ENABLE_CLIENT` | `1` | `/client` client shell/API route 노출 |
| `MEDIA_SERVER_SUBSCRIBER_QUEUE_SIZE` | `256` | subscriber queue 상한 |
| `MEDIA_SERVER_MAX_SESSIONS` | `2048` | session 상한 |
| `MEDIA_SERVER_MAX_STREAMS` | `512` | stream registry 상한 |
| `MEDIA_SERVER_IDLE_GRACE_MS` | `10000` | idle cleanup grace |
| `MEDIA_SERVER_FILE_ROOT` | `video` | file token root |
| `MEDIA_SERVER_DEFAULT_FILE` | `video/sample_h264.mp4` | 기본 file source |

### HTTP auth MVP

`MEDIA_SERVER_AUTH_MODE=off`가 기본값이며 기존 `/lab/rules`, WebRTC, RTSP 검증 흐름을 그대로 유지합니다. Auth off에서 `/`는 `MEDIA_SERVER_UI_DEFAULT_HOME`에 따라 `/lab`, `/ops/live`, `/client/live` 중 하나로 이동합니다. `MEDIA_SERVER_AUTH_MODE=token`에서는 `/auth/whoami`가 `Authorization: Bearer <token>` 또는 개발용 `?token=<token>` query를 읽어 role/scope principal을 반환합니다. `MEDIA_SERVER_AUTH_MODE=session`에서는 같은 token auth를 유지하면서 `/login` 계정 로그인과 HttpOnly session cookie 인증을 추가합니다. Query token은 브라우저 주소, proxy log, referrer에 남을 수 있으므로 운영 환경에서는 권장하지 않습니다.

Session login은 `libsodium crypto_pwhash_str` password hash를 사용합니다. 안전한 password hashing dependency가 없는 build에서는 password login을 사용할 수 없으며 plaintext password나 단순 SHA 계열 저장을 지원하지 않습니다.

초기 role/scope 모델:

| 역할 | MVP scope |
| --- | --- |
| `admin` | 모든 scope. `view:read:*`, `source:read:*`, `rule:read:*`, `event:read:*`, `metadata:read:*`, `dashboard:read:*`, `debug:read`, `rule:write`, `source:write`, `ops:read`, `lab:read` |
| `operator` | 운영 live monitor, rule/scenario 관리, runtime dashboard, event 조회 scope |
| `viewer` | 할당 view/read 계열 MVP scope. `view:read:*`, `metadata:read:*`, `dashboard:read:*`, `event:read:*` |
| `integrator` | 연동 API용 `metadata:read:*`, `event:read:*` |

`*` scope는 MVP의 wildcard 표현입니다. SourceRegistry/PublishedView가 들어오면 `view:read:{viewId}`, `event:read:{viewId}`처럼 구체 ID scope로 좁힐 예정입니다.

Users file 예시:

```json
{
  "users": [
    {
      "username": "operator1",
      "displayName": "Operator One",
      "role": "operator",
      "scopes": ["view:read:*", "source:read:*", "rule:read:*", "event:read:*", "metadata:read:*", "dashboard:read:*", "debug:read", "rule:write", "source:write", "ops:read", "lab:read"],
      "passwordHash": "$argon2id$...",
      "enabled": true
    }
  ]
}
```

`passwordHash`는 libsodium `crypto_pwhash_str` 출력 문자열만 사용합니다. `tokenHash`도 같은 방식으로 저장할 수 있으며, plaintext password/token 저장은 금지합니다.

### 개발/script 보조값

| 환경변수 | 기본값 | 설명 |
| --- | --- | --- |
| `MEDIA_SERVER_ENABLE_AI` | script default | `./server.sh build`에서 ONNX Runtime/AI 빌드 여부 |
| `MEDIA_SERVER_BUILD_DIR` | script default | build directory override |
| `MEDIA_SERVER_BIN_PATH` | script default | 실행 binary path override |
| `MEDIA_SERVER_ONNXRUNTIME_ROOT` | script default | ONNX Runtime install root |
| `MEDIA_SERVER_SKIP_BUILD` | unset | foreground/test script에서 build 생략 |
| `MEDIA_SERVER_SKIP_LOCAL_ENV` | unset | `scripts/.media_server.env` source 생략 |
| `MEDIA_SERVER_PORT_CANDIDATES` | script default | 대체 RTSP port 목록 |
| `MEDIA_SERVER_START_MODE` | `nohup` | `nohup` 또는 macOS `launchd` 실행 방식 |
| `MEDIA_SERVER_SKIP_ENV_CHECK` | unset | pkg-config 등 환경 점검 생략 |
| `HOMEBREW_PREFIX` | system default | Homebrew prefix override |

## RTSP/WebRTC env

### 공통 transport/session

| 환경변수 | 기본값 | 설명 |
| --- | --- | --- |
| `MEDIA_SERVER_FORCE_RTSP_TCP` | `0` | RTSP source TCP-only 강제 |
| `MEDIA_SERVER_GST_ATTACH_CONTEXT` | unset | GLib context attach mode |
| `MEDIA_SERVER_SESSION_TRACE` | `0` | session/source lifecycle trace |
| `MEDIA_SERVER_RUNTIME_DEBUG_COUNTER_TRACE` | `0` | Runtime debug counter lifecycle trace log. 기본은 counter만 누적하고, `1`이면 RTSP/GStreamer egress/session/tap/subscriber counter 변화 로그를 출력 |
| `MEDIA_SERVER_WEBRTC_TRACE` | `0` | WebRTC 협상/상태 로그 |
| `MEDIA_SERVER_WEBRTC_TRACE_VERBOSE` | `0` | sample/pad/caps/SDP 상세 로그 |
| `MEDIA_SERVER_WEBRTC_STUN_SERVER` | Google STUN | WebRTC STUN URI |
| `MEDIA_SERVER_WEBRTC_TURN_SERVER` | empty | WebRTC TURN URI |
| `MEDIA_SERVER_WEBRTC_ICE_TRANSPORT_POLICY` | `all` | `all` 또는 `relay` |
| `MEDIA_SERVER_WEBRTC_SOURCE_READY_TIMEOUT_MS` | code default | WebRTC publish source readiness timeout |
| `MEDIA_SERVER_RTSP_SOURCE_PREFLIGHT_TIMEOUT_MS` | code default | RTSP source preflight timeout |
| `MEDIA_SERVER_RTSP_SOURCE_START_TIMEOUT_MS` | code default | RTSP source start timeout |
| `MEDIA_SERVER_RTSP_TRACK_SETTLE_QUIET_PERIOD_MS` | code default | RTSP track settle quiet period |
| `MEDIA_SERVER_RTSP_TRACK_SETTLE_MAX_MS` | code default | RTSP track settle max wait |

### WebRTC egress video

| 환경변수 | 기본값 | 설명 |
| --- | --- | --- |
| `MEDIA_SERVER_WEBRTC_VIDEO_WIDTH` | code default | WebRTC video encode width |
| `MEDIA_SERVER_WEBRTC_VIDEO_HEIGHT` | code default | WebRTC video encode height |
| `MEDIA_SERVER_WEBRTC_VIDEO_FPS` | code default | WebRTC video encode FPS |
| `MEDIA_SERVER_WEBRTC_VIDEO_BITRATE_KBPS` | code default | WebRTC video bitrate |
| `MEDIA_SERVER_WEBRTC_VIDEO_KEYFRAME_INTERVAL` | code default | keyframe interval |
| `MEDIA_SERVER_WEBRTC_X264_PRESET` | code default | x264 preset |

## Source env

`file=` source의 root와 기본 파일은 `서버 기본 env`의 `MEDIA_SERVER_FILE_ROOT`, `MEDIA_SERVER_DEFAULT_FILE`을 사용합니다. HTTP/HLS URI source와 transcode 관련 값은 아래에서 관리합니다.

| 환경변수 | 기본값 | 설명 |
| --- | --- | --- |
| `MEDIA_SERVER_URI_VIDEO_WIDTH` | code default | URI source transcode video width |
| `MEDIA_SERVER_URI_VIDEO_HEIGHT` | code default | URI source transcode video height |
| `MEDIA_SERVER_URI_VIDEO_FPS` | code default | URI source transcode FPS |
| `MEDIA_SERVER_URI_VIDEO_BITRATE_KBPS` | code default | URI source video bitrate |
| `MEDIA_SERVER_URI_X264_PRESET` | code default | x264 preset |
| `MEDIA_SERVER_URI_TRACK_SETTLE_QUIET_PERIOD_MS` | code default | URI track settle quiet period |
| `MEDIA_SERVER_URI_TRACK_SETTLE_MAX_MS` | code default | URI track settle max wait |

## VA detector env

### Detector/profile

| 환경변수 | 기본값 | 설명 |
| --- | --- | --- |
| `MEDIA_SERVER_ANALYSIS_DETECTOR` | `yolo` | 기본 detector |
| `MEDIA_SERVER_ANALYSIS_MODEL` | `models/yolo11n.onnx` | YOLO model path |
| `MEDIA_SERVER_ANALYSIS_LABELS` | `models/coco.names` | label path |
| `MEDIA_SERVER_ANALYSIS_FPS` | `8` | sampling FPS |
| `MEDIA_SERVER_ANALYSIS_MAX_QUEUE` | `1` | detector queue 상한 |
| `MEDIA_SERVER_ANALYSIS_FRAME_SAMPLE_INTERVAL` | `1` | decoded frame sampling interval |
| `MEDIA_SERVER_ANALYSIS_MAX_FRAME_AGE_MS` | `0` | stale frame drop 기준. `0`은 비활성 |
| `MEDIA_SERVER_ANALYSIS_INPUT_WIDTH` | `640` | model input width |
| `MEDIA_SERVER_ANALYSIS_INPUT_HEIGHT` | `640` | model input height |
| `MEDIA_SERVER_ANALYSIS_CONFIDENCE` | `0.25` | confidence threshold |
| `MEDIA_SERVER_ANALYSIS_NMS` | `0.45` | NMS threshold |
| `MEDIA_SERVER_ANALYSIS_PREPROCESS` | `letterbox` | preprocessing mode |
| `MEDIA_SERVER_ANALYSIS_REGISTRY` | `.media_server.analysis_registry.json` | Lab profile/rule registry |
| `MEDIA_SERVER_SOURCE_REGISTRY` | `.media_server.sources.json` | 운영 SourceRegistry 저장 파일 |
| `MEDIA_SERVER_PUBLISHED_VIEWS` | `.media_server.views.json` | client PublishedView 저장 파일 |
| `MEDIA_SERVER_ANALYSIS_MAX_ACTIVE_PROFILES_PER_SOURCE` | `8` | source 하나에서 동시에 허용할 active analysis profile 수. `0`은 제한 비활성 |
| `MEDIA_SERVER_ANALYSIS_MAX_ACTIVE_TAPS_PER_SOURCE` | `8` | source 하나에서 동시에 허용할 active analysis tap 수. `0`은 제한 비활성 |

SourceRegistry는 운영자 API `/ops/api/sources`에서 관리하며 `sourceId`, `displayName`, `kind`, `canonicalSourceKey`, source locator, `enabled`, `tags`, `ownerGroup`을 저장합니다. PublishedView는 `/ops/api/views`에서 관리하며 `viewId`, `sourceId`, `defaultRuleId`, `allowedRuleIds`, `allowedOverlayModes`, dashboard/event/metadata 노출 정책, `clientGroups`, `maxTiles`를 저장합니다. Client API `/client/api/views`는 `view:read:{viewId}` scope로 필터링한 공개 필드만 반환하고 원본 URL/file locator는 숨깁니다.

### Adaptive inference

| 환경변수 | 기본값 | 설명 |
| --- | --- | --- |
| `MEDIA_SERVER_ANALYSIS_ADAPTIVE` | `1` | adaptive tuner 사용 |
| `MEDIA_SERVER_ANALYSIS_ADAPTIVE_INPUT_SIZE` | `1` | input size 조절 허용 |
| `MEDIA_SERVER_ANALYSIS_ADAPTIVE_MIN_FPS` | `2` | FPS 하한 |
| `MEDIA_SERVER_ANALYSIS_ADAPTIVE_COOLDOWN_MS` | `3000` | 조절 간 cooldown |
| `MEDIA_SERVER_ANALYSIS_ADAPTIVE_INPUT_STEP` | `128` | input size 조절 단위 |
| `MEDIA_SERVER_ANALYSIS_ADAPTIVE_MIN_INPUT_WIDTH` | `320` | input width 하한 |
| `MEDIA_SERVER_ANALYSIS_ADAPTIVE_MIN_INPUT_HEIGHT` | `320` | input height 하한 |
| `MEDIA_SERVER_ANALYSIS_ADAPTIVE_HIGH_LATENCY_RATIO` | `0.85` | overload 판정 ratio |
| `MEDIA_SERVER_ANALYSIS_ADAPTIVE_LOW_LATENCY_RATIO` | `0.35` | recovery 판정 ratio |

## Tracking env

### Direction-based tracking association

| 환경변수 | 기본값 | 설명 |
| --- | --- | --- |
| `MEDIA_SERVER_ANALYSIS_TRACKING` | `1` | lightweight direction-based tracker 사용 |
| `MEDIA_SERVER_ANALYSIS_TRACKING_CLASSES` | `person,vehicle` | tracking 대상 category/class |
| `MEDIA_SERVER_ANALYSIS_TRACKING_LOST_BUFFER_FRAMES` | `8` | tracker lost buffer frame 수 |
| `MEDIA_SERVER_ANALYSIS_TRACKING_IOU_WEIGHT` | `0.45` | association IoU weight |
| `MEDIA_SERVER_ANALYSIS_TRACKING_DISTANCE_WEIGHT` | `0.35` | association center distance weight |
| `MEDIA_SERVER_ANALYSIS_TRACKING_DIRECTION_WEIGHT` | `0.15` | association direction weight |
| `MEDIA_SERVER_ANALYSIS_TRACKING_CLASS_WEIGHT` | `0.05` | association class consistency weight |
| `MEDIA_SERVER_ANALYSIS_TRACKING_MIN_ASSOCIATION_SCORE` | `0.10` | matching 최소 점수 |
| `MEDIA_SERVER_ANALYSIS_TRACKING_SMOOTHING_ALPHA` | `0.20` | bbox smoothing 비율. 높을수록 흔들림은 줄지만 moving object overlay가 뒤따라감 |
| `MEDIA_SERVER_ANALYSIS_TRACKING_CLOSE_OBJECT_GUARD_MODE` | `off` | close-object association guard 모드. `off`는 기존 동작, `diagnostic`은 후보 진단만 수집, `enforce`에서만 opt-in score 보정 skeleton 적용 |
| `MEDIA_SERVER_ANALYSIS_TRACKING_CLOSE_OBJECT_DISTANCE_RATIO` | `0.65` | 같은 class track/detection 근접 위험을 계산할 때 `max_center_distance`에 곱하는 비율 |
| `MEDIA_SERVER_ANALYSIS_TRACKING_CLOSE_OBJECT_OVERLAP_THRESHOLD` | `0.20` | close-object overlap risk 계산 기준 |
| `MEDIA_SERVER_ANALYSIS_TRACKING_CLOSE_OBJECT_LOW_MARGIN_THRESHOLD` | `0.08` | best/second association score margin이 낮다고 볼 기준 |
| `MEDIA_SERVER_ANALYSIS_TRACKING_CENTER_JUMP_PENALTY` | `0.10` | `enforce` 모드에서 큰 center jump 후보에 적용할 수 있는 score 감점 상한 |
| `MEDIA_SERVER_ANALYSIS_TRACKING_CLOSE_OBJECT_MIN_SCORE_BOOST` | `0.03` | `enforce` 모드에서 안정 track continuity 후보에 적용할 수 있는 작은 score 보정 |
| `MEDIA_SERVER_ANALYSIS_TRACKING_CLOSE_OBJECT_MAX_DIAGNOSTICS` | `64` | frame별 close-object candidate diagnostic 보관 상한 |

close-object guard는 lightweight direction-based tracker 내부의 opt-in 진단/보정 skeleton입니다.

| 모드 | 동작 | 영향 범위 |
| --- | --- | --- |
| `off` | 기본 동작 유지 | scoring, Event POST payload, WebRTC/SSE/WS metadata schema, Scenario 판단 변경 없음 |
| `diagnostic` | `closeObjectRisk`, `scoreMargin`, `centerJump`, `guardDecision` 후보 진단만 수집 | tracking 결과 변경 없음 |
| `enforce` | center jump penalty와 continuity boost 후보를 ranking에 반영 가능 | 실험적 opt-in, default on 보류 |

이 설정은 Kalman, ByteTrack, BoT-SORT, Re-ID 모델 도입이 아닙니다.

### TrackState/cleanup

| 환경변수 | 기본값 | 설명 |
| --- | --- | --- |
| `MEDIA_SERVER_ANALYSIS_MAX_ACTIVE_TRACKS_PER_STREAM` | `512` | stream/channel별 active track 상한 |
| `MEDIA_SERVER_ANALYSIS_MAX_RECENT_OBSERVATIONS_PER_TRACK` | `32` | track별 observation ring buffer |
| `MEDIA_SERVER_ANALYSIS_MAX_TRAJECTORY_POINTS_PER_TRACK` | `32` | track별 trajectory point 상한 |
| `MEDIA_SERVER_ANALYSIS_TRAJECTORY_DOWNSAMPLE_MS` | `500` | trajectory downsample interval |
| `MEDIA_SERVER_ANALYSIS_LOST_TRACK_TIMEOUT_MS` | `2000` | Lost 전이 timeout |
| `MEDIA_SERVER_ANALYSIS_TERMINATED_TRACK_TIMEOUT_MS` | `10000` | Terminated 전이 timeout |
| `MEDIA_SERVER_ANALYSIS_TERMINATED_TRACK_RETENTION_MS` | `2000` | terminated retention |
| `MEDIA_SERVER_ANALYSIS_CLEANUP_INTERVAL_MS` | `1000` | cleanup interval |

### TrackHealth / issue report

| 환경변수 | 기본값 | 설명 |
| --- | --- | --- |
| `MEDIA_SERVER_ANALYSIS_TRACKING_ISSUE_REPORT_ENABLED` | `1` | issue report 수집 |
| `MEDIA_SERVER_ANALYSIS_TRACKING_ISSUE_LOG_ENABLED` | `1` | issue log 출력 |
| `MEDIA_SERVER_ANALYSIS_TRACKING_ISSUE_MAX_ENTRIES` | `256` | channel별 보관 상한 |
| `MEDIA_SERVER_ANALYSIS_TRACKING_ISSUE_RATE_LIMIT_MS` | `5000` | 반복 기록 rate limit |
| `MEDIA_SERVER_ANALYSIS_TRACKING_ISSUE_OVERLAP_RISK_THRESHOLD` | `0.50` | overlap-risk threshold |
| `MEDIA_SERVER_ANALYSIS_TRACKING_ISSUE_MISSED_FRAME_JUMP_THRESHOLD` | `3` | missed-frame-spike threshold |
| `MEDIA_SERVER_ANALYSIS_TRACKING_ISSUE_DIRECTION_CHANGE_JUMP_THRESHOLD` | `2` | direction-change-spike threshold |

### Homography / ground-plane

| 환경변수 | 기본값 | 설명 |
| --- | --- | --- |
| `MEDIA_SERVER_ANALYSIS_HOMOGRAPHY_ENABLED` | `0` | env 기반 homography 등록 |
| `MEDIA_SERVER_ANALYSIS_HOMOGRAPHY_MATRIX` | empty | 3x3 row-major matrix |
| `MEDIA_SERVER_ANALYSIS_HOMOGRAPHY_STREAM_ID` | empty | 특정 streamId 한정 |
| `MEDIA_SERVER_ANALYSIS_HOMOGRAPHY_CHANNEL_ID` | empty | 특정 channelId 한정 |
| `MEDIA_SERVER_ANALYSIS_HOMOGRAPHY_UNITS` | `ground` | ground point 단위 label |
| `MEDIA_SERVER_ANALYSIS_GROUND_PLANE_SPEED_ENABLED` | `0` | ground-plane speed 사용 |
| `MEDIA_SERVER_ANALYSIS_GROUND_PLANE_MOVEMENT_RADIUS_ENABLED` | `0` | ground-plane radius 사용 |

### Appearance / Re-ID hook

| 환경변수 | 기본값 | 설명 |
| --- | --- | --- |
| `MEDIA_SERVER_ANALYSIS_APPEARANCE_ENABLED` | `0` | appearance extraction 활성화 |
| `MEDIA_SERVER_ANALYSIS_APPEARANCE_EXTRACTOR` | `noop` | `noop` 또는 실험용 extractor |
| `MEDIA_SERVER_ANALYSIS_APPEARANCE_MODEL` | empty | model path |
| `MEDIA_SERVER_ANALYSIS_APPEARANCE_INPUT_WIDTH` | `128` | crop input width |
| `MEDIA_SERVER_ANALYSIS_APPEARANCE_INPUT_HEIGHT` | `256` | crop input height |
| `MEDIA_SERVER_ANALYSIS_APPEARANCE_MAX_EMBEDDING_DIM` | `4096` | embedding 상한 |
| `MEDIA_SERVER_ANALYSIS_APPEARANCE_LOG_ENABLED` | `0` | appearance log |
| `MEDIA_SERVER_ANALYSIS_APPEARANCE_ASYNC_ENABLED` | `1` | async queue 사용 |
| `MEDIA_SERVER_ANALYSIS_APPEARANCE_MAX_QUEUE` | `32` | manager queue 상한 |
| `MEDIA_SERVER_ANALYSIS_APPEARANCE_GLOBAL_MAX_QUEUE` | `128` | process global pending 상한 |
| `MEDIA_SERVER_ANALYSIS_APPEARANCE_PER_STREAM_RATE_LIMIT_MS` | `1000` | stream/channel enqueue 간격 |
| `MEDIA_SERVER_ANALYSIS_APPEARANCE_MAX_JOB_AGE_MS` | `2000` | 오래된 job drop 기준 |
| `MEDIA_SERVER_ANALYSIS_APPEARANCE_ON_TRACK_CREATED` | `1` | track 생성 trigger |
| `MEDIA_SERVER_ANALYSIS_APPEARANCE_EVERY_N_SECONDS` | `0` | 주기 trigger. `0`은 비활성 |
| `MEDIA_SERVER_ANALYSIS_APPEARANCE_ON_TRACK_LOST` | `0` | lost trigger |
| `MEDIA_SERVER_ANALYSIS_APPEARANCE_ON_REACQUIRE_CANDIDATE` | `1` | reacquire 후보 trigger |
| `MEDIA_SERVER_ANALYSIS_APPEARANCE_ON_LOW_CONFIDENCE_ASSOCIATION` | `1` | 낮은 association confidence trigger |

## Scenario env

### Scenario engine common

| 환경변수 | 기본값 | 설명 |
| --- | --- | --- |
| `MEDIA_SERVER_ANALYSIS_SCENARIO_ENABLED` | `0` | scenario engine 기본 활성화 |
| `MEDIA_SERVER_ANALYSIS_SCENARIO_MAX_INSTANCES_PER_CHANNEL` | `2048` | channel별 instance 상한 |
| `MEDIA_SERVER_ANALYSIS_SCENARIO_COOLDOWN_MS` | `5000` | 공통 cooldown |
| `MEDIA_SERVER_ANALYSIS_SCENARIO_UPDATE_INTERVAL_MS` | `1000` | update interval |
| `MEDIA_SERVER_ANALYSIS_SCENARIO_RETENTION_MS` | `5000` | stale scenario retention |
| `MEDIA_SERVER_ANALYSIS_SCENARIO_ENDED_RETENTION_MS` | `5000` | ended retention |

### IntrusionDwell

| 환경변수 | 기본값 |
| --- | --- |
| `MEDIA_SERVER_ANALYSIS_INTRUSION_DWELL_ENABLED` | `0` |
| `MEDIA_SERVER_ANALYSIS_INTRUSION_DWELL_CANDIDATE_MS` | `2000` |
| `MEDIA_SERVER_ANALYSIS_INTRUSION_DWELL_DWELL_MS` | `10000` |
| `MEDIA_SERVER_ANALYSIS_INTRUSION_DWELL_COOLDOWN_MS` | `5000` |
| `MEDIA_SERVER_ANALYSIS_INTRUSION_DWELL_TARGET_CLASSES` | scenario default |
| `MEDIA_SERVER_ANALYSIS_INTRUSION_DWELL_RESTRICTED_ZONE_IDS` | scenario default |

### ReEntry

| 환경변수 | 기본값 |
| --- | --- |
| `MEDIA_SERVER_ANALYSIS_RE_ENTRY_ENABLED` | `0` |
| `MEDIA_SERVER_ANALYSIS_RE_ENTRY_WINDOW_MS` | `10000` |
| `MEDIA_SERVER_ANALYSIS_RE_ENTRY_COOLDOWN_MS` | `5000` |
| `MEDIA_SERVER_ANALYSIS_RE_ENTRY_TARGET_CLASSES` | scenario default |
| `MEDIA_SERVER_ANALYSIS_RE_ENTRY_TARGET_ZONE_IDS` | scenario default |

### WrongDirection

| 환경변수 | 기본값 |
| --- | --- |
| `MEDIA_SERVER_ANALYSIS_WRONG_DIRECTION_ENABLED` | `0` |
| `MEDIA_SERVER_ANALYSIS_WRONG_DIRECTION_COOLDOWN_MS` | `5000` |
| `MEDIA_SERVER_ANALYSIS_WRONG_DIRECTION_TARGET_CLASSES` | scenario default |
| `MEDIA_SERVER_ANALYSIS_WRONG_DIRECTION_TARGET_LINE_IDS` | scenario default |
| `MEDIA_SERVER_ANALYSIS_WRONG_DIRECTION_ALLOWED_DIRECTIONS` | scenario default |

WrongDirection 상태:

- engine 구현 완료
- 룰 편집 UI 템플릿에서 선택 가능
- 기존 `line-crossing` 기본 이벤트 유지
- WrongDirection은 별도 `wrong-direction` scenario event로 발생
- Event POST payload schema, WebRTC/SSE/WS metadata schema, ScenarioEngine 판단 로직 변경 없음

### IntrusionAfterLineCrossing

| 환경변수 | 기본값 |
| --- | --- |
| `MEDIA_SERVER_ANALYSIS_INTRUSION_AFTER_LINE_CROSSING_ENABLED` | `0` |
| `MEDIA_SERVER_ANALYSIS_INTRUSION_AFTER_LINE_CROSSING_MAX_DELAY_MS` | `10000` |
| `MEDIA_SERVER_ANALYSIS_INTRUSION_AFTER_LINE_CROSSING_DWELL_MS` | `5000` |
| `MEDIA_SERVER_ANALYSIS_INTRUSION_AFTER_LINE_CROSSING_COOLDOWN_MS` | `5000` |
| `MEDIA_SERVER_ANALYSIS_INTRUSION_AFTER_LINE_CROSSING_TARGET_CLASSES` | scenario default |
| `MEDIA_SERVER_ANALYSIS_INTRUSION_AFTER_LINE_CROSSING_TARGET_LINE_IDS` | scenario default |
| `MEDIA_SERVER_ANALYSIS_INTRUSION_AFTER_LINE_CROSSING_TARGET_ZONE_IDS` | scenario default |

### Loitering

| 환경변수 | 기본값 |
| --- | --- |
| `MEDIA_SERVER_ANALYSIS_LOITERING_ENABLED` | `0` |
| `MEDIA_SERVER_ANALYSIS_LOITERING_MIN_DWELL_TIME_MS` | `30000` |
| `MEDIA_SERVER_ANALYSIS_LOITERING_MAX_MOVEMENT_RADIUS` | `0.08` |
| `MEDIA_SERVER_ANALYSIS_LOITERING_MIN_TRAJECTORY_POINTS` | `4` |
| `MEDIA_SERVER_ANALYSIS_LOITERING_COOLDOWN_MS` | `10000` |
| `MEDIA_SERVER_ANALYSIS_LOITERING_TARGET_CLASSES` | scenario default |
| `MEDIA_SERVER_ANALYSIS_LOITERING_TARGET_ZONE_IDS` | scenario default |
| `MEDIA_SERVER_ANALYSIS_LOITERING_USE_GROUND_PLANE` | `0` |

## Event POST env

| 환경변수 | 기본값 | 설명 |
| --- | --- | --- |
| `MEDIA_SERVER_ANALYSIS_EVENT_POST_ENABLED` | `0` | event POST worker |
| `MEDIA_SERVER_ANALYSIS_EVENT_POST_TIMEOUT_MS` | `3000` | POST timeout |
| `MEDIA_SERVER_ANALYSIS_EVENT_POST_MAX_QUEUE` | `256` | POST queue 상한 |
| `MEDIA_SERVER_ANALYSIS_EVENT_POST_COOLDOWN_MS` | `2000` | dedupe cooldown |

POST URL 자체는 rule output 설정에서 관리합니다. 외부 이벤트 JSON/API/POST payload 형식은 기존 형식을 유지합니다.

## EventStorage env

### EventRecord storage

| 환경변수 | 기본값 | 설명 |
| --- | --- | --- |
| `MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_ENABLED` | `0` | EventRecord file storage |
| `MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_PATH` | `.media_server.va_events.jsonl` | JSON Lines path |
| `MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_MAX_QUEUE` | `2048` | storage queue 상한 |
| `MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_MAX_FILE_BYTES` | `0` | active JSON Lines 파일 size rotation 기준. `0`이면 rotation 비활성 |
| `MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_MAX_ARCHIVES` | `0` | 보관할 rotated archive 파일 수 상한. `0`이면 파일 수 retention 비활성 |
| `MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_MAX_TOTAL_BYTES` | `0` | rotated archive 전체 byte 상한. `0`이면 byte retention 비활성 |

EventRecord storage 정책:

| 항목 | 정책 |
| --- | --- |
| 저장 대상 | metadata JSON Lines만 저장 |
| schema 영향 | Event POST payload와 EventRecord 저장 schema 변경 없음 |
| 기본값 | append 동작 유지를 위해 rotation/retention 제한 비활성 |
| rotation | active 파일이 `MAX_FILE_BYTES`를 넘기기 전에 archive로 이동 |
| archive 이름 | `<active-stem>.<timestamp-ms>.<sequence><ext>` |
| retention | rotated archive만 oldest-first 삭제 |
| active file | retention 삭제 대상에서 제외 |
| records API | 1차 구현은 active file 중심 조회 |
| 상태 확인 | `/lab/analysis/event-storage/status` |

값 보정 규칙:

- `MAX_FILE_BYTES`, `MAX_ARCHIVES`, `MAX_TOTAL_BYTES`의 `0`은 해당 제한 비활성화입니다.
- `MAX_QUEUE`의 `0`은 유효하지 않으며 기본값 `2048`로 보정합니다.
- 음수, 숫자가 아닌 값, `size_t` 범위 초과 값은 warning log 후 기본값으로 보정합니다.
- storage path가 빈 문자열이면 `.media_server.va_events.jsonl`로 보정합니다.
- corrupt/partial line recovery scan에는 별도 env가 없습니다.
- status/records read path에서 손상 행을 line-by-line으로 skip/count 처리합니다.

EventRecord file storage/query/search UI와 rotation/retention/recovery 1차는 구현 완료 상태입니다. 후속 범위는 rotated archive query, compaction/repair rewrite, archive별 상세 status와 운영 cleanup 도구입니다.

### Snapshot / clip hook

| 환경변수 | 기본값 | 설명 |
| --- | --- | --- |
| `MEDIA_SERVER_ANALYSIS_EVENT_SNAPSHOT_HOOK_ENABLED` | `0` | snapshot hook |
| `MEDIA_SERVER_ANALYSIS_EVENT_SNAPSHOT_DIR` | `.media_server.va_snapshots` | snapshot marker/output dir |
| `MEDIA_SERVER_ANALYSIS_EVENT_CLIP_HOOK_ENABLED` | `0` | clip hook |
| `MEDIA_SERVER_ANALYSIS_EVENT_CLIP_DIR` | `.media_server.va_clips` | clip marker/output dir |
| `MEDIA_SERVER_ANALYSIS_EVENT_PRE_EVENT_MS` | `5000` | pre-event window |
| `MEDIA_SERVER_ANALYSIS_EVENT_POST_EVENT_MS` | `5000` | post-event window |
| `MEDIA_SERVER_ANALYSIS_EVENT_CLIP_BUFFER_MS` | `15000` | clip buffer limit |

## WebRTC metadata env

| 환경변수 | 기본값 | 설명 |
| --- | --- | --- |
| `MEDIA_SERVER_WEBRTC_VA_METADATA_CHANNEL_ENABLED` | `0` | DataChannel 기본 활성화 |
| `MEDIA_SERVER_WEBRTC_VA_METADATA_CHANNEL_LABEL` | `va-metadata` | DataChannel label |
| `MEDIA_SERVER_WEBRTC_VA_METADATA_INTERVAL_MS` | `500` | metadata 전송 최소 간격 |
| `MEDIA_SERVER_WEBRTC_VA_METADATA_MAX_MESSAGE_BYTES` | `65536` | 메시지 크기 상한 |
| `MEDIA_SERVER_WEBRTC_VA_METADATA_MAX_BUFFERED_BYTES` | `262144` | buffered amount 상한 |

## Debug/Metrics env

### Overlay/debug/metrics

| 환경변수 | 기본값 | 설명 |
| --- | --- | --- |
| `MEDIA_SERVER_ANALYSIS_OVERLAY_WAIT_MS` | `180` | overlay result wait |
| `MEDIA_SERVER_ANALYSIS_OVERLAY_SYNC_TOLERANCE_MS` | `400` | PTS sync tolerance |
| `MEDIA_SERVER_ANALYSIS_OVERLAY_THICKNESS` | `3` | bbox 두께 |
| `MEDIA_SERVER_ANALYSIS_DEBUG_OVERLAY` | `0` | debug overlay 기본 활성화 |
| `MEDIA_SERVER_ANALYSIS_DEBUG_GROUND_POINT` | `0` | debug ground point 표시 |
| `MEDIA_SERVER_ANALYSIS_METRICS_LOG_INTERVAL_MS` | `30000` | VA metrics 주기 로그. `0`은 비활성 |

### 검증 script override

검증 script는 각자 `MEDIA_SERVER_VERIFY_*` 계열 override를 가집니다. 자주 쓰는 값:

| 환경변수 | 기본값 | 설명 |
| --- | --- | --- |
| `MEDIA_SERVER_VERIFY_HOST` | script default | 검증 client host override |
| `MEDIA_SERVER_VERIFY_*_HTTP_BASE` | script default | 특정 verify script의 HTTP base override |
| `MEDIA_SERVER_VERIFY_SOURCE_FILTER` | unset | codec matrix source filter |
| `MEDIA_SERVER_TEST_EXTERNAL_RTSP_URLS` | unset | 외부 RTSP hard gate 후보 |
| `MEDIA_SERVER_VERIFY_WEBRTC_EXTERNAL_TURN_SERVER` | unset | 외부 TURN 검증용 TURN URI |

세부 script별 override는 해당 `scripts/internal/verify_*.sh` 도움말과 소스 상단을 기준으로 확인합니다.

## YouTube experimental env

| 환경변수 | 기본값 | 설명 |
| --- | --- | --- |
| `MEDIA_SERVER_ENABLE_EXPERIMENTAL_YOUTUBE_SOURCE` | `0` | `source=youtube` 직접 표출 노출 |
| `MEDIA_SERVER_ENABLE_LAB_YOUTUBE_IMPORT` | `1` | `/lab/import` 노출 |
| `MEDIA_SERVER_YOUTUBE_RESOLVER_BIN` | `yt-dlp` | resolver binary |
| `MEDIA_SERVER_YOUTUBE_FORMAT` | resolver default | yt-dlp format |
| `MEDIA_SERVER_YOUTUBE_RESOLVE_TIMEOUT_MS` | code default | resolve timeout |
| `MEDIA_SERVER_YOUTUBE_RECONNECT_DELAY_MS` | code default | reconnect delay |
