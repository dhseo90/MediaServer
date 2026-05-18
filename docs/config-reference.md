# Config Reference

이 문서는 런타임 환경변수와 주요 build/script 설정을 모읍니다.
실제 기본값의 source of truth는 `include/stdafx.h`, `src/app_config.cpp`,
`scripts/internal/*.sh`입니다.

## 기본 규칙

- boolean 값은 보통 `1/0`, `true/false`를 허용합니다.
- 경로는 repo 기준 상대경로를 우선 사용합니다.
- `file=` token은 기본적으로 `MEDIA_SERVER_FILE_ROOT` 아래에서 해석됩니다.
- 잘못된 값은 서버가 안전한 기본값으로 보정하고 stderr에 경고를 남깁니다.
- 표의 `code default`, `script default`, `resolver default`는 코드나 script 내부 기본값을 따른다는 뜻입니다.

## Config Presets

배포 전 기준점은 `config/presets/*.env.example`에 둡니다.

| Preset | 용도 | 특징 |
| --- | --- | --- |
| `dev.env.example` | 로컬 개발/검증 | auth off, loopback bind, repo-local registry |
| `staging.env.example` | 운영 전 검증 | auth auto, 외부 bind, staging 전용 registry, STUN |
| `production.env.example` | 운영 배포 초안 | auth auto, secure cookie, `/var/lib/media-server` registry, TURN relay 정책 |

운영 장애 공유용 자료는 다음 명령으로 수집합니다.

```bash
./server.sh ops-bundle --http-base http://127.0.0.1:8080
```

bundle에는 `/health`, runtime status, `check_server`, `diagnose`,
log tail, registry/auth store 파일 metadata, redacted env 요약이 포함됩니다.
Auth users file 내용과 plaintext secret은 포함하지 않습니다.
복구용 백업 대상과 복구 후 검증 절차는 [docs/ops-backup-recovery.md](ops-backup-recovery.md)에 둡니다.

## 서버 기본 env

### 런타임 기본값

| 환경변수 | 기본값 | 설명 |
| --- | --- | --- |
| `MEDIA_SERVER_ROUTE` | `dhseo` | RTSP route prefix |
| `MEDIA_SERVER_LISTEN_ADDRESS` | `127.0.0.1` | RTSP bind address |
| `MEDIA_SERVER_LISTEN_PORT` | `8554` | RTSP bind port |
| `MEDIA_SERVER_HTTP_LISTEN_ADDRESS` | `127.0.0.1` | HTTP/WebRTC bind address |
| `MEDIA_SERVER_HTTP_LISTEN_PORT` | `8080` | HTTP/WebRTC bind port |
| `MEDIA_SERVER_AUTH_MODE` | `auto` | HTTP auth mode. `auto`, `off`, `token`, `session` |
| `MEDIA_SERVER_AUTH_ADMIN_TOKEN` | empty | `token`/`auto`/`session` mode에서 admin principal로 인증할 Bearer/query token |
| `MEDIA_SERVER_AUTH_OPERATOR_TOKEN` | empty | `token`/`auto`/`session` mode에서 operator principal로 인증할 Bearer/query token |
| `MEDIA_SERVER_AUTH_VIEWER_TOKEN` | empty | `token`/`auto`/`session` mode에서 viewer principal로 인증할 Bearer/query token |
| `MEDIA_SERVER_AUTH_INTEGRATOR_TOKEN` | empty | `token`/`auto`/`session` mode에서 integrator principal로 인증할 Bearer/query token |
| `MEDIA_SERVER_AUTH_USERS_FILE` | `.media_server.users.json` | `auto`/`session` login 계정 registry JSON |
| `MEDIA_SERVER_AUTH_SESSION_TTL_SECONDS` | `86400` | session cookie 만료 시간 |
| `MEDIA_SERVER_AUTH_SESSION_IDLE_TIMEOUT_SECONDS` | `3600` | session idle timeout. `0`이면 idle timeout 비활성 |
| `MEDIA_SERVER_AUTH_PASSWORD_POLICY` | `kr-privacy` | password policy. `kr-privacy`, `strict`, `custom` |
| `MEDIA_SERVER_AUTH_PASSWORD_MIN_LENGTH` | `0` | policy 기본 최소 길이를 더 높일 때 사용하는 override |
| `MEDIA_SERVER_AUTH_PASSWORD_HISTORY_COUNT` | `5` | 재사용 금지할 password hash history 개수. `0`이면 history 검사 비활성 |
| `MEDIA_SERVER_AUTH_PASSWORD_MAX_AGE_DAYS` | `0` | password age 초과 시 `mustChangePassword` 표시. `0`이면 age 검사 비활성 |
| `MEDIA_SERVER_AUTH_LOGIN_MAX_FAILURES` | `5` | 계정별 연속 로그인 실패 lockout 기준. `0`이면 lockout 비활성 |
| `MEDIA_SERVER_AUTH_LOGIN_LOCKOUT_SECONDS` | `300` | lockout 유지 시간 |
| `MEDIA_SERVER_AUTH_COOKIE_NAME` | `media_server_session` | session cookie 이름 |
| `MEDIA_SERVER_AUTH_COOKIE_SECURE` | `0` | `1`이면 session cookie에 `Secure` attribute 추가 |
| `MEDIA_SERVER_UI_DEFAULT_HOME` | `ops` | auth off에서 `/`가 이동할 home. `ops`, `client`; `lab`은 이전 설정 호환값이며 `/ops/home`으로 fallback |
| `MEDIA_SERVER_ENABLE_LAB` | `1` | `/lab/analysis/*`, `/lab/runtime/status` 같은 개발/검증 API 노출. `/lab` 화면 route는 열지 않음 |
| `MEDIA_SERVER_ENABLE_OPS` | `1` | `/ops` 운영 shell/API route 노출 |
| `MEDIA_SERVER_ENABLE_CLIENT` | `1` | `/client` client shell/API route 노출 |
| `MEDIA_SERVER_SUBSCRIBER_QUEUE_SIZE` | `256` | subscriber queue 상한 |
| `MEDIA_SERVER_MAX_SESSIONS` | `2048` | session 상한 |
| `MEDIA_SERVER_MAX_STREAMS` | `512` | stream registry 상한 |
| `MEDIA_SERVER_IDLE_GRACE_MS` | `10000` | idle cleanup grace |
| `MEDIA_SERVER_FILE_ROOT` | `video` | file token root |
| `MEDIA_SERVER_DEFAULT_FILE` | `video/sample_h264.mp4` | 기본 file source |

### HTTP auth

`MEDIA_SERVER_AUTH_MODE=auto`가 기본값입니다.

Auth mode 기준:

- `auto`: users file이 없거나 admin user/passwordHash가 없으면 `/setup`으로 보냅니다.
  setup 이후에는 `/login` session 인증을 요구합니다.
- `off`: 개발/테스트 호환용 명시 모드입니다. 제품 기본값으로 사용하지 않습니다.
- `token`: `/auth/whoami`가 Bearer token 또는 개발용 `?token=<token>` query를 읽어
  role/scope principal을 반환합니다.
- `session`: auto의 setup 감지를 유지하면서 `/login` 계정 로그인과
  HttpOnly session cookie 인증을 사용합니다.

Root redirect 기준:

- Auth off: `MEDIA_SERVER_UI_DEFAULT_HOME`에 따라 `/ops/home` 또는 `/client/live`로 이동합니다.
- `MEDIA_SERVER_UI_DEFAULT_HOME=lab`: 화면 route를 열지 않고 `/ops/home`으로 fallback합니다.
- Auth on setup required: `/setup`
- Auth on 미인증: `/login`
- Auth on admin/operator: `/ops/home`
- Auth on viewer: `/client/live`

Query token은 브라우저 주소, proxy log, referrer에 남을 수 있으므로
운영 환경에서는 권장하지 않습니다.

Generic media 생성 route:

- 대상 route: `POST /webrtc/session`, `POST /whep`, `POST /whip/publish`
- Auth on 권한: admin/operator `ops:read` 또는 `lab:read`
- 후속 answer/ICE/delete: 같은 생성 principal 또는
  `sessionToken`/`X-Session-Capability` 필요
- `/ws/va-metadata`: Lab/custom-client 경로이므로 admin/operator 또는 `lab:read` 필요
- Auth off: 기존 개발/자동화 호환을 위해 허용
- Viewer/client: source locator를 직접 보내지 않고
  `/client/api/views/{viewId}/webrtc/session` wrapper를 사용

내장 HTTP server hardening limit:

- Header: 64KiB
- Request body: 2MiB
- malformed `Content-Length`, unsupported transfer encoding, socket read timeout,
  동시 active connection 초과는 route handler 전에 오류 응답으로 닫음

CORS는 별도 env 없이 same-origin 고정 정책입니다.

- `Origin`이 없으면 `Access-Control-Allow-Origin`을 내지 않습니다.
- `Origin`이 있으면 요청 `Host`와 같은 `http://` 또는 `https://` origin만 반사합니다.
- 다른 origin의 실제 요청과 preflight는 `403`으로 거부합니다.
- wildcard origin과 credential 허용 헤더는 사용하지 않습니다.

Session login은 `libsodium crypto_pwhash_str` password hash를 사용합니다.
안전한 password hashing dependency가 없는 build에서는 password login을 사용할 수 없습니다.
plaintext password나 단순 SHA 계열 저장도 지원하지 않습니다.
Login 성공 시 새 session id를 발급하고, logout은 server-side session을 삭제하며 cookie를 만료시킵니다.
Session은 TTL과 idle timeout 중 먼저 도달한 기준으로 만료됩니다.

최초 관리자 bootstrap:

- 기본 admin username은 `admin`입니다.
- 기본 admin 비밀번호는 없습니다.
- users file이 없거나 `admin.passwordHash`가 없거나 admin이 disabled이면 setup required 상태입니다.
- setup required 상태에서 UI 요청은 `/setup`으로 이동합니다.
- `/setup`은 setup required 상태에서만 접근할 수 있고, 완료 후에는 `/login`으로 이동합니다.
- 기본 password policy는 `kr-privacy`입니다.
  대문자/소문자/숫자/특수문자 중 3종류 이상이면 최소 8자,
  2종류 조합이면 최소 10자를 요구합니다.
- username 포함, 3회 이상 반복 문자, 4자리 이상 연속 숫자, 키보드 배열, 흔한 비밀번호, 최근 password history 재사용은 거부합니다.
- 연속 로그인 실패가 `MEDIA_SERVER_AUTH_LOGIN_MAX_FAILURES`에 도달하면 계정별 `lockedUntil`까지 로그인 시도를 거부합니다.
- 초기화된 계정은 `mustChangePassword=true`로 저장할 수 있습니다.
  로그인 후 `/password/change`에서 새 정책을 만족하는 비밀번호로 변경해야 합니다.
- `/auth/whoami`는 `setupRequired`, `setupReason`, `authMode`, `authenticated`, `username`, `role`, `scopes`, `passwordChangeRequired`를 반환합니다.

계정 관리는 admin 전용 `/ops/users` 또는 `./server.sh auth-user` CLI를 사용합니다.
Users file 직접 편집은 복구나 bootstrap 문제 해결 때만 사용합니다.
운영 절차로 권장하지 않습니다.
Self-signup 자동 승인은 제공하지 않습니다.
viewer/client 계정은 admin이 직접 생성하거나 pending access request를 승인해
password setup invite를 발급합니다.

현재 role/scope 모델:

| 역할 | Scope |
| --- | --- |
| `admin` | 모든 scope. `view/source/rule/event/metadata/dashboard` read, `debug:read`, `rule:write`, `source:write`, `ops:read`, `lab:read` |
| `operator` | `ops:read`, `rule:write`, `source:write`, `dashboard:read:*`, `event:read:*` |
| `viewer` | `view:read:{viewId}`, `dashboard:read:{viewId}`, `event:read:{viewId}`, `metadata:read:{viewId}` |
| `integrator` | `metadata:read:{viewId}`, `event:read:{viewId}` |

`*` scope는 wildcard 표현입니다.
`/ops/users`와 CLI에서 viewId를 넣으면 viewer/integrator scope template은
`{viewId}` 단위로 생성됩니다.

변경 권한:

- `/ops/api/sources`, `/ops/api/views`: `source:write`
- Lab rule/profile/vaRule 변경: `rule:write`
- Integrator: client shell/live/dashboard UI 대신
  `/client/api/views/{viewId}/events`,
  `/client/api/views/{viewId}/metadata` 같은 scoped API만 사용

Users file 예시:

```json
{
  "users": [
    {
      "username": "admin",
      "displayName": "Admin",
      "role": "admin",
      "scopes": ["*"],
      "passwordHash": "$argon2id$...",
      "passwordHistory": ["$argon2id$..."],
      "enabled": true,
      "mustChangePassword": false,
      "failedLoginCount": 0,
      "lockedUntil": "",
      "lastFailedLoginAt": "",
      "createdAt": "2026-05-03T00:00:00Z",
      "passwordUpdatedAt": "2026-05-03T00:00:00Z",
      "lastLoginAt": "",
      "lastLoginIp": "",
      "disabledAt": ""
    },
    {
      "username": "client-a",
      "displayName": "Client A",
      "role": "viewer",
      "scopes": ["view:read:1", "event:read:1", "metadata:read:1", "dashboard:read:1"],
      "passwordHash": "$argon2id$...",
      "passwordHistory": ["$argon2id$..."],
      "enabled": true,
      "mustChangePassword": true
    }
  ],
  "invites": [
    {
      "tokenHash": "$argon2id$...",
      "username": "client-b",
      "displayName": "Client B",
      "role": "viewer",
      "scopes": ["view:read:2", "event:read:2", "metadata:read:2", "dashboard:read:2"],
      "expiresAt": "2026-05-04T00:00:00Z",
      "usedAt": ""
    }
  ],
  "accessRequests": [
    {
      "requestId": "access-1",
      "username": "client-c",
      "displayName": "Client C",
      "contact": "client@example.test",
      "reason": "site access",
      "viewId": "3",
      "status": "pending",
      "createdAt": "2026-05-03T00:00:00Z"
    }
  ]
}
```

Auth users file 저장 규칙:

- `passwordHash`와 `passwordHistory`는 libsodium `crypto_pwhash_str` 출력 문자열만 저장합니다.
- `tokenHash`도 같은 방식으로 저장할 수 있습니다.
- plaintext password/token 저장은 금지합니다.
- Password hash 값은 `/ops/api/users`, `/ops/users`, CLI list 응답에 노출하지 않습니다.
- Auth users file은 owner read/write 전용 `0600`으로 생성/보정합니다.
- 저장은 임시 파일 write/fsync 후 rename하고 parent directory도 fsync합니다.
- User-only 저장 경로는 기존 auth store 전체를 먼저 읽어
  `invites`와 `accessRequests`를 보존합니다.
- 읽기 실패 또는 invalid record가 있으면 덮어쓰지 않고 실패합니다.

제품 UI 계정 흐름:

- `/ops/users`에서 admin이 초기 비밀번호를 입력해 계정을 직접 생성합니다.
- pending access request 승인/거절 table을 같은 화면에서 제공합니다.
- 승인 시 password setup invite token/setup URL은 응답에서 한 번만 표시합니다.
- invite 비밀번호는 사용자가 `/invite/setup`에서 직접 입력합니다.
- Invite 생성과 access-request approve는 invite record만 추가합니다.
- 기존 user의 role/scope/enabled/session 상태는 invite 수락 전 즉시 바꾸지 않습니다.
- 초대 링크는 기본 24시간 동안 유효하며 `expiresAt`과 setup URL은 생성/승인 응답에서
  한 번만 운영자에게 표시합니다. 만료 후에는 새 초대를 발급합니다.
- `/ops/users` 상세 패널에서 비밀번호 초기화를 수행하면 기존 세션을 회수하고
  `mustChangePassword=true`로 저장합니다. 원문 비밀번호는 users file, API 응답,
  Ops audit export에 남기지 않습니다.
- disable은 hard delete가 아니며 로그인과 기존 세션을 차단합니다. enable/restore는
  실패 횟수와 lockout 상태를 초기화합니다.

Public access request 제한:

- body 4KiB
- displayName 96B
- contact 160B
- reason 500B
- 숫자 viewId 64B
- 같은 peer의 5회/5분 초과 요청 거부
- 기존 user, 중복 pending username/contact, pending 100건 초과 거부

Invite/request 전용 env는 별도로 두지 않고 같은 users file에 저장합니다.
Invite 만료 시간은 API 요청의 `ttlSeconds`로 지정하거나 서버 기본값을 사용합니다.

Admin user management API:

| Route | 권한 | 설명 |
| --- | --- | --- |
| `GET /ops/api/users` | admin | hash/token을 제외한 user list |
| `POST /ops/api/users` | admin | 계정 생성 API. 제품 UI는 admin이 초기 비밀번호를 입력하는 직접 생성 흐름을 사용 |
| `PUT /ops/api/users/{username}` | admin | displayName/role/scopes/enabled/mustChangePassword 수정 |
| `POST /ops/api/users/{username}/reset-password` | admin | password 재설정 API. `/ops/users` 상세 패널에서 임시 비밀번호를 설정하면 다음 로그인 변경이 필요하고 기존 세션은 회수 |
| `POST /ops/api/users/{username}/disable` | admin | hard delete 대신 비활성화 |
| `POST /ops/api/users/{username}/enable` | admin | 비활성 계정 재활성화 |
| `POST /ops/api/invites` | admin | password setup invite 발급. token 원문은 응답에서 한 번만 표시하며 수락 전 user 권한은 변경하지 않음 |
| `GET /ops/api/access-requests` | admin | pending/rejected/approved client access request 조회. `/ops/users` 접근 요청 table이 사용 |
| `POST /ops/api/access-requests/{requestId}/approve` | admin | pending request 승인과 password setup invite 발급. token/setup URL은 한 번만 표시 |
| `POST /ops/api/access-requests/{requestId}/reject` | admin | pending request 거절. `/ops/users`는 상태만 갱신하고 user/session/view scope는 생성하지 않음 |
| `POST /client/api/access-requests` | public | client access request를 `pending` 상태로 저장 |

마지막 활성 admin 계정은 disable하거나 admin이 아닌 role로 바꿀 수 없습니다.

Ops audit trail:

| 환경변수 | 기본값 | 설명 |
| --- | --- | --- |
| `MEDIA_SERVER_OPS_AUDIT_RETENTION_DAYS` | `180` | `.media_server.ops_audit.jsonl` 보존 기간. `0` 이하는 정리 비활성 |

`GET /ops/api/audit` 지원 항목:

- 필터: `area`, `actor`, `user`, `target`, `action`, `q`, `fromMs`, `toMs`
- Paging: `offset`, `limit`
- 기간 기준: `receivedAtMs`
- Interactive 조회: 작은 limit cap 적용
- Export: `format=json|csv|diff-json` 또는 `download=1`
- Export limit: `exportLimitMax` 범위 허용
- CSV: `receivedAtMs` 포함
- Diff JSON: 전/후 변경값 중심

### 개발/script 보조값

| 환경변수 | 기본값 | 설명 |
| --- | --- | --- |
| `MEDIA_SERVER_ENABLE_AI` | script default | `./server.sh build`에서 ONNX Runtime/AI 빌드 여부 |
| `MEDIA_SERVER_BUILD_DIR` | script default | build directory override |
| `MEDIA_SERVER_BIN_PATH` | script default | 실행 binary path override |
| `MEDIA_SERVER_ONNXRUNTIME_ROOT` | script default | ONNX Runtime install root |
| `MEDIA_SERVER_SKIP_BUILD` | unset | foreground/test script에서 build 생략 |
| `MEDIA_SERVER_SKIP_LOCAL_ENV` | unset | `scripts/.media_server.env` source 생략 |

운영 보조 명령:

| 명령 | 용도 |
| --- | --- |
| `./server.sh ops-bundle --http-base ...` | health/runtime/diagnose/log/config 요약을 redacted bundle로 수집 |
| `./server.sh verify-ops-backup-restore-dry-run` | 임시 runtime 기반 백업/복구 리허설과 checksum/권한 검증 |
| `./server.sh ops-evidence-cleanup --max-age-days N` | snapshot/clip/compaction 만료 정리 dry-run 또는 `--apply` 실행 |
| `./server.sh rc-artifact-archive --source-dir ... --destination-dir ...` | RC gate artifact를 외부 보관소 directory로 복사하고 checksum/index 생성 |
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
| `MEDIA_SERVER_RUNTIME_DEBUG_COUNTER_TRACE` | `0` | Runtime debug counter lifecycle trace log. `1`이면 egress/session/tap/subscriber counter 변화 로그 출력 |
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

`/webrtc/config`는 위 STUN/TURN/ICE policy를 browser `RTCPeerConnection` 옵션으로 직렬화합니다.
Lab WebRTC 테스트와 Client Live는 이 endpoint의 `peerConnectionConfig`를 사용합니다.
relay-only 운영 배포에서는 client portal도 같은 TURN 설정을 따릅니다.
외부 WHEP pull source의 `whepsrc` 설정도 사용 가능한 경우 같은 STUN/TURN/ICE policy 값을 전달합니다.

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

`file=` source의 root와 기본 파일은 `서버 기본 env`의 값을 사용합니다.
대상 env는 `MEDIA_SERVER_FILE_ROOT`, `MEDIA_SERVER_DEFAULT_FILE`입니다.
HTTP/HLS URI source와 transcode 관련 값은 아래에서 관리합니다.

외부 WHEP playback URL source는 SourceRegistry의 `kind=whep`/`whepUrl`로 지정합니다.
직접 query를 쓸 때는 `source=whep&url=...`을 사용합니다.
WHEP credential 저장/주입은 아직 별도 운영 정책 대상입니다.

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

SourceRegistry:

- 관리 API: `/ops/api/sources`
- 저장 필드: `sourceId`, `displayName`, `kind`, `canonicalSourceKey`,
  source input, `enabled`, `tags`, `ownerGroup`
- ONVIF origin metadata는 후속 schema review 항목이며
  현재 저장 필드가 아닙니다. 구현은
  [ONVIF Live Source Support](./onvif-live-source-support.md)와 `onvif`/`live`
  tag를 기준으로 기존 source/view 저장 payload를 사용합니다.
- 제품 UI: 숫자 채널로 묶어 `/ops/sources`에 표시
- Seed 조건: registry가 비어 있으면 기본 file/VA file/공개 RTSP/HLS 채널 추가
- 저장 방식: atomic write/fsync/rename

Registry 오류 정책:

- malformed record
- 중복 source/view id
- 중복 canonical source
- 깨진 PublishedView `sourceId` 참조

위 오류가 있으면 조용히 누락하거나 seed로 덮지 않고 `500`으로 실패합니다.

Source kind:

- `kind=webrtc`: `/whip/publish`로 먼저 등록된 내부 `webrtcSourceId`
- `kind=whep`: 외부 WHEP playback endpoint. `whepUrl`로 등록
- 직접 consume query: `?source=whep&url={encodedEndpoint}`

PublishedView:

- 관리 API: `/ops/api/views`
- 저장 필드: `viewId`, `sourceId`, `defaultRuleId`, `allowedRuleIds`,
  `allowedOverlayModes`, dashboard/event/metadata 노출 정책,
  `clientGroups`, `maxTiles`
- `maxTiles`: UI 배정과 `/client/api/views/{viewId}/webrtc/session`의
  같은 principal+view 동시 session 상한에 모두 적용
- 초과 응답: `409`
- `va-rule` mode: rule source가 PublishedView source와 같을 때만 session 생성 허용

Client API:

- `/client/api/views`: `view:read:{viewId}` scope로 공개 필드만 반환
- 숨김 필드: 원본 URL, file/sourceId, WHEP endpoint input
- `/client/api/views/{viewId}/dashboard`: `dashboard:read:{viewId}`
- `/client/api/views/{viewId}/events`: `event:read:{viewId}`
- `/client/api/views/{viewId}/metadata`: `metadata:read:{viewId}`

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
| `MEDIA_SERVER_ANALYSIS_TRACKING_CLOSE_OBJECT_GUARD_MODE` | `off` | close-object association guard 모드. `diagnostic`은 후보 진단, `enforce`는 opt-in score 보정 |
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

이 설정은 tracker 종류를 바꾸는 설정이 아닙니다. Kalman-lite와 ByteTrack은
rule-level `analysis.trackingPolicy.tracker` opt-in으로만 선택하며, BoT-SORT와
Re-ID 모델 도입은 별도 review 범위입니다.
OC-SORT도 현재 환경변수나 rule-level tracker 허용값이 아니며, 후순위 benchmark
경계는 [OC-SORT Benchmark Boundary](./oc-sort-benchmark-boundary.md)에 둡니다.

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
| `MEDIA_SERVER_ANALYSIS_APPEARANCE_MODEL_SHA256` | empty | Re-ID model opt-in checksum gate. 비어 있거나 불일치하면 NoOp fallback |
| `MEDIA_SERVER_ANALYSIS_APPEARANCE_MODEL_PROVENANCE` | empty | Re-ID model opt-in provenance gate. 비어 있으면 NoOp fallback |
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

ReEntry 상태:

- 룰 편집 UI에서 선택 가능
- Event POST payload schema, WebRTC/SSE/WS metadata schema, ScenarioEngine 판단 로직 변경 없음

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

LineCrossing preset 상태:

- `line-crossing`은 scenario env 없이 기본 이벤트 룰로 동작함
- Ops UI 현장 preset은 `event.minConfidence` 시작값만 채우고 direction/2점 line geometry는 운영자가 현장 영상에서 확인함
- preset label을 새 payload field로 저장하지 않으며 Event POST payload schema, WebRTC/SSE/WS metadata schema 변경 없음

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

IntrusionAfterLineCrossing 상태:

- 룰 편집 UI에서 선택 가능
- 기존 `line-crossing` 기본 이벤트 유지
- Event POST payload schema, WebRTC/SSE/WS metadata schema, ScenarioEngine 판단 로직 변경 없음

### Loitering

| 환경변수 | 기본값 |
| --- | --- |
| `MEDIA_SERVER_ANALYSIS_LOITERING_ENABLED` | `0` |
| `MEDIA_SERVER_ANALYSIS_LOITERING_MIN_DWELL_TIME_MS` | `30000` |
| `MEDIA_SERVER_ANALYSIS_LOITERING_MAX_MOVEMENT_RADIUS` | `0.08` |
| `MEDIA_SERVER_ANALYSIS_LOITERING_MIN_TRAJECTORY_POINTS` | `4` |
| `MEDIA_SERVER_ANALYSIS_LOITERING_COOLDOWN_MS` | `12000` |
| `MEDIA_SERVER_ANALYSIS_LOITERING_TARGET_CLASSES` | scenario default |
| `MEDIA_SERVER_ANALYSIS_LOITERING_TARGET_ZONE_IDS` | scenario default |
| `MEDIA_SERVER_ANALYSIS_LOITERING_USE_GROUND_PLANE` | `0` |

Loitering 상태:

- engine/replay와 전용 룰 편집 UI 템플릿은 구현됨
- 룰 편집 UI는 `minDwellTimeMs`, `maxMovementRadius`, `minTrajectoryPoints`, `cooldownMs`, `targetZoneIds`, `useGroundPlaneMovementRadius`를 저장함
- 실제 현장 샘플 tuning 시작값으로 retail/lobby/platform/doorway/parking/elevator 프리셋을 제공함

### Zone Occupancy

| 환경변수 | 기본값 |
| --- | --- |
| `MEDIA_SERVER_ANALYSIS_ZONE_OCCUPANCY_ENABLED` | `0` |
| `MEDIA_SERVER_ANALYSIS_ZONE_OCCUPANCY_THRESHOLD` | `4` |
| `MEDIA_SERVER_ANALYSIS_ZONE_OCCUPANCY_MIN_DWELL_TIME_MS` | `7000` |
| `MEDIA_SERVER_ANALYSIS_ZONE_OCCUPANCY_COOLDOWN_MS` | `12000` |
| `MEDIA_SERVER_ANALYSIS_ZONE_OCCUPANCY_TARGET_CLASSES` | scenario default |
| `MEDIA_SERVER_ANALYSIS_ZONE_OCCUPANCY_TARGET_ZONE_IDS` | scenario default |

Zone Occupancy 상태:

- engine/replay와 룰 편집 UI 템플릿 구현됨
- per-rule payload의 `occupancyThreshold`, `minDwellTimeMs`, `targetZoneIds`, `targetClasses`, `cooldownMs`가 env default보다 우선함

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

EventRecord 구현 범위:

- file storage
- active/archive query/search UI
- rotation/retention/recovery 1차
- 비파괴 compaction snapshot 생성 API
- compacted snapshot 목록/다운로드/삭제
- `keepNewest` cleanup API

Snapshot/clip hook:

- 분석 raw frame rolling buffer를 사용합니다.
- snapshot media file을 생성합니다.
- 짧은 pre/post frame bundle manifest를 생성합니다.
- Lab EventRecord detail은 안전한 preview route로
  snapshot inline preview와 clip manifest/frame link를 표시합니다.

후속 UI polish는 richer clip gallery 정도로 제한합니다.
MP4/VMS/NVR형 recorder는 현재 범위가 아니며 별도 제품 phase와
보관/개인정보/배포 정책 gate가 필요합니다.

### Snapshot / clip hook

| 환경변수 | 기본값 | 설명 |
| --- | --- | --- |
| `MEDIA_SERVER_ANALYSIS_EVENT_SNAPSHOT_HOOK_ENABLED` | `0` | snapshot hook |
| `MEDIA_SERVER_ANALYSIS_EVENT_SNAPSHOT_DIR` | `.media_server.va_snapshots` | snapshot media/manifest output dir |
| `MEDIA_SERVER_ANALYSIS_EVENT_CLIP_HOOK_ENABLED` | `0` | clip hook |
| `MEDIA_SERVER_ANALYSIS_EVENT_CLIP_DIR` | `.media_server.va_clips` | pre/post frame bundle output dir |
| `MEDIA_SERVER_ANALYSIS_EVENT_PRE_EVENT_MS` | `5000` | pre-event window |
| `MEDIA_SERVER_ANALYSIS_EVENT_POST_EVENT_MS` | `5000` | post-event window |
| `MEDIA_SERVER_ANALYSIS_EVENT_CLIP_BUFFER_MS` | `15000` | clip buffer limit |

Recorder 동작:

- snapshot hook은 이벤트 시점과 가장 가까운 분석 frame을 JPEG로 저장합니다.
  JPEG encoder를 사용할 수 없으면 RGB/BGR/Gray frame을 PPM/PGM evidence file로 저장합니다.
- clip hook은 같은 stream/channel rolling buffer에서 `PRE_EVENT_MS`부터 `POST_EVENT_MS`까지의 frame을 짧은 bundle directory와 `manifest.json`으로 저장합니다.
- frame buffer는 `CLIP_BUFFER_MS`와 내부 frame/stream 상한으로 제한됩니다. 장기 녹화, MP4 muxing, VMS/NVR retention은 이 hook의 범위가 아닙니다.

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
| CMake `MEDIA_SERVER_ENABLE_YOUTUBE_SOURCE` | `OFF` | lab-only YouTube resolver/source worker 빌드 포함 여부. 기본 빌드에서는 YouTube 기능이 제외되며 runtime env를 켜도 동작하지 않음 |
| `MEDIA_SERVER_ENABLE_EXPERIMENTAL_YOUTUBE_SOURCE` | `0` | opt-in 빌드에서만 `source=youtube` 직접 표출 노출 |
| `MEDIA_SERVER_ENABLE_LAB_YOUTUBE_IMPORT` | build option 기준 | 이전 import API opt-in. 기본 빌드에서는 무시되며 제품 화면은 `/ops/sources`에서 관리 |
| `MEDIA_SERVER_YOUTUBE_RESOLVER_BIN` | `yt-dlp` | resolver binary |
| `MEDIA_SERVER_YOUTUBE_FORMAT` | resolver default | yt-dlp format |
| `MEDIA_SERVER_YOUTUBE_RESOLVE_TIMEOUT_MS` | code default | resolve timeout |
| `MEDIA_SERVER_YOUTUBE_RECONNECT_DELAY_MS` | code default | reconnect delay |
