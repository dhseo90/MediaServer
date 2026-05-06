# Stream Verification

이 문서는 현재 기준의 스트리밍/VA 검증 명령을 관리합니다. 과거 날짜별 상세 검증 이력은 [history/verification-history.md](./history/verification-history.md)에 보관합니다.

## 목적

- RTSP/WebRTC 입력/출력 pipeline이 기존 동작을 유지하는지 확인합니다.
- 기존 Intrusion / LineCrossing rule event의 이벤트 타입, JSON/API/POST 형식이 유지되는지 확인합니다.
- TrackStateManager, SceneContextBuilder, EventManager, ScenarioEngine, cleanup 정책이 다채널 환경에서 무한 증가하지 않는지 확인합니다.
- 신규 VA 기능이 media pipeline을 blocking하지 않는지 확인합니다.
- 검증 명령은 로컬 재현성을 우선하고, 외부 source/TURN/장시간 테스트는 별도 gate로 분리합니다.

## 테스트 모드 요약

| 명령 | 범위 |
| --- | --- |
| `./server.sh test` | 기본 smoke. 로컬 file/RTSP/WebRTC/기본 API 중심 |
| `./server.sh test --basic` | 기본 smoke를 명시적으로 실행 |
| `./server.sh test --full` | Rule/Profile UI, VA event, image analysis, event POST, multichannel, redaction 포함 |
| `./server.sh test --external` | `--full` + LAN/external source, WebRTC ICE, 외부 HTTP/HLS URI 선택 검증. 외부 WHEP endpoint는 환경 의존 별도 검증 |
| `./server.sh test --stable` | 기존 stable 호환 기준 |

외부 RTSP/HLS/HTTP/WHEP source, 운영 TURN relay/auth, YouTube import/source는 외부 환경 영향을 받으므로 기본 hard gate가 아닙니다.

문서/UI/Auth/권한/계정처럼 media pipeline 자체를 바꾸지 않은 변경에서는 `./server.sh test`, `./server.sh test --basic`, `./server.sh test --full`, `./server.sh verify-predev --quick`를 기본으로 실행하지 않습니다. 이 명령들은 기본 추가 RTSP/WebRTC source 영상과 codec matrix를 소비해 느리므로, 해당 변경 범위에서는 아래의 문서/UI/Auth 전용 smoke만 사용합니다. RTSP/WebRTC codec/source 자체를 수정했거나 release candidate gate를 열 때만 명시적으로 실행합니다.

## 단기 테스트 명령

개발 전후 빠른 기준:

```bash
./server.sh build
./server.sh test
```

문서/UI/Auth/권한 전용 빠른 기준:

```bash
./server.sh build
git diff --check -- README.md docs scripts src include
./server.sh verify-auth-routes
./server.sh verify-ops-client-ui
./server.sh verify-rule-ui
./server.sh verify-lab-layout --no-screenshots
./server.sh verify-analysis-state
```

위 전용 기준은 느린 기본 추가 RTSP/WebRTC source 영상, codec matrix, multichannel media soak를 사용하지 않습니다.

`verify-auth-routes`는 임시 users/source/view 파일과 격리 포트로 서버를 직접 띄웁니다. `verify-ops-client-ui`, `verify-rule-ui`, `verify-lab-layout`는 실행 중인 HTTP 서버를 대상으로 하는 attached smoke이므로, UI 전용 검증에서는 별도 터미널에서 `MEDIA_SERVER_AUTH_MODE=off ./server.sh foreground`를 실행하고 포트가 다르면 `--http-base`를 명시합니다.

VA rule/scenario 변경:

```bash
./server.sh verify-analysis-state
./server.sh verify-va-replay
./server.sh verify-va-events
```

UI 변경:

```bash
./server.sh verify-rule-ui
./server.sh verify-lab-layout
./server.sh verify-ops-client-ui
./server.sh verify-ops-client-ui --screenshots
MEDIA_SERVER_VERIFY_AUTH_VISUAL=1 MEDIA_SERVER_VERIFY_AUTH_SCREENSHOTS=1 ./server.sh verify-auth-bootstrap
```

UI 변경 검증에서는 기본 추가 RTSP/WebRTC source 영상이나 codec matrix를 쓰지 않습니다. 화면 selector/API 계약만 확인할 때는 서버를 띄운 뒤 `verify-ops-client-ui`, `verify-rule-ui`, `verify-lab-layout --no-screenshots`를 우선 사용하고, WebRTC/RTSP streaming 동작이 변경된 경우에만 별도 WebRTC/stream 변경 명령을 실행합니다.

Ops/Client shell 변경은 전용 smoke로 product shell selector와 client debug/source 비노출을 먼저 확인합니다. 이 smoke는 `/client/api/views`뿐 아니라 단일 view, dashboard, events, metadata 응답의 민감 JSON key도 재귀적으로 검사합니다. Auth route smoke는 격리된 Source/View registry 파일을 사용해 기본 seed, client wrapper, malformed source/view registry fail-closed, 기존 malformed 파일 비덮어쓰기를 함께 확인합니다. `--screenshots` 옵션은 headless Chrome으로 `/ops/home`, `/ops/dashboard`, `/ops/rules`, `/ops/sources`, `/ops/users`, `/client/live`, `/client/dashboard`를 폭별로 열어 overflow와 screenshot을 남깁니다. Ops shell script처럼 `webrtc_http_server.cpp`에서 `product_ui_page_scripts.*`로 UI 소유권을 옮기는 구조 변경은 `./server.sh build`, `./server.sh verify-auth-routes`, `./server.sh verify-ops-client-ui`를 함께 실행해 route guard와 제품 selector/API 계약을 같이 확인합니다. Auth shell 변경은 기존 auth workflow에 `MEDIA_SERVER_VERIFY_AUTH_VISUAL=1`을 붙여 `/setup`, `/login`, `/client/request-access`, 필요 시 `/password/change`, `/invite/setup` selector를 확인하고, `MEDIA_SERVER_VERIFY_AUTH_SCREENSHOTS=1`로 auth screenshot smoke까지 남깁니다. 화면 단위 회귀가 의심되거나 nav/table/form 반응형을 직접 봐야 할 때는 auth-off 또는 로그인 cookie/token을 준비한 서버에서 아래 수동 smoke를 함께 확인합니다.

```bash
BASE=http://127.0.0.1:8080
for path in \
  /ops /ops/home /ops/live /ops/dashboard /ops/sources /ops/rules /ops/events /ops/users \
  /client /client/live /client/dashboard /lab /lab/rules
do
  curl -fsS -D "/tmp/media-server-ui${path//\//_}.headers" \
    -o "/tmp/media-server-ui${path//\//_}.html" \
    "${BASE}${path}"
done

if grep -E 'href="/(lab/runtime/status|lab/analysis/event-post/status|lab/analysis/events/records|ops/api|client/api)' /tmp/media-server-ui_ops*.html
then
  echo "[fail] ops shell exposes raw JSON/API href"
  exit 1
fi
```

확인 기준:

- `/ops`, `/ops/home`, `/ops/live`, `/ops/dashboard`, `/ops/sources`, `/ops/rules`, `/ops/users`는 HTML을 반환하고 공통 Ops Console header/nav를 유지합니다. Primary nav는 홈, 대시보드, 채널, 룰, 사용자(admin), 클라이언트 미리보기 순서이며 `/ops/live`는 자동 media session을 열지 않는 고밀도 source/runtime/event 상태 타일을 표시합니다. Ops Live smoke는 focus selector, search input, attention count, unassigned count selector가 제품 shell에 남아 있는지도 함께 확인합니다.
- `/ops/events`는 primary nav에서 숨긴 직접/진단 route입니다. 독립 제품 탭으로 취급하지 않고, 이벤트 조건은 룰에서 설정하며 운영 요약은 대시보드에서 확인합니다.
- `/ops/dashboard`와 `/ops/rules`는 Lab iframe이나 `/lab/rules?embed=1`을 포함하지 않습니다. 대시보드는 `/ops/api/runtime/status`, 룰 카탈로그는 `/ops/api/rules/catalog`, 숨김 이벤트 상태는 `/ops/api/events/status`를 사용합니다. raw JSON은 접힘 debug 영역에만 둡니다.
- `/ops/sources`는 숫자 채널 table을 먼저 보여주며, Live URL/VA URL 복사 버튼은 RTSP와 WebRTC 버튼을 실제 클립보드에 복사해야 합니다. source 원본 URL은 ops 화면에만 표시합니다.
- `/ops/users`는 사용자 목록 table과 접근 요청 table을 보여주고, 사용자 추가/수정 editor는 접힘 영역으로 열립니다. Access request 승인 UI는 password setup invite token/setup URL을 승인 응답에서 한 번만 표시하며, 거절은 request 상태만 바꿉니다. `passwordHash`, `passwordHistory`, `tokenHash`, invite `tokenHash`를 노출하지 않습니다.
- `/client/live`, `/client/dashboard`는 client shell을 유지하고 source URL, Developer URL, BBox diagnostics, raw JSON, `debugCounters`, rule/profile editor를 노출하지 않습니다. Client Events tab은 primary nav에서 제거합니다.
- `/lab`와 `/lab/rules`는 기존 Lab layout과 Rule/Profile UI smoke 기준을 계속 통과해야 합니다.

WebRTC/stream 변경:

```bash
./server.sh verify-codecs
./server.sh verify-webrtc-ice
./server.sh verify-multichannel
```

Auth 변경:

```bash
./server.sh verify-auth-bootstrap
./server.sh verify-auth-users
./server.sh verify-auth-routes
```

위 세 명령은 임시 users file과 격리 포트에서 auth 서버를 띄워 setup/login/session/user/route smoke를 자동으로 확인합니다. 로컬 QA나 수동 smoke에서 테스트 계정을 만들거나 초기화할 때는 계정 비밀번호를 `qweasd0-`로만 사용합니다. 이 규칙은 검증 재현성을 위한 것이며, 제품 기본 admin 비밀번호가 아닙니다. 수동으로 세부 상태를 확인할 때는 아래 curl 흐름을 사용합니다.

```bash
MEDIA_SERVER_AUTH_MODE=auto \
MEDIA_SERVER_AUTH_USERS_FILE=/tmp/media-server-bootstrap-users.json \
  ./server.sh foreground
curl -fsS -D - -o /tmp/root-setup.out 'http://127.0.0.1:8080/'
curl -fsS 'http://127.0.0.1:8080/auth/whoami'

MEDIA_SERVER_AUTH_MODE=off ./server.sh foreground
curl -fsS 'http://127.0.0.1:8080/auth/whoami'

MEDIA_SERVER_AUTH_MODE=token \
MEDIA_SERVER_AUTH_ADMIN_TOKEN=admin-token \
  ./server.sh foreground
curl -fsS -H 'Authorization: Bearer admin-token' 'http://127.0.0.1:8080/auth/whoami'

MEDIA_SERVER_AUTH_MODE=session \
MEDIA_SERVER_AUTH_USERS_FILE=/path/to/users.json \
MEDIA_SERVER_AUTH_LOGIN_MAX_FAILURES=5 \
MEDIA_SERVER_AUTH_LOGIN_LOCKOUT_SECONDS=300 \
  ./server.sh foreground
curl -fsS 'http://127.0.0.1:8080/login'
curl -fsS -c /tmp/media-server.cookies \
  -d 'username=operator1&password=qweasd0-' \
  'http://127.0.0.1:8080/login'
curl -fsS -b /tmp/media-server.cookies 'http://127.0.0.1:8080/auth/whoami'
curl -fsS -b /tmp/media-server.cookies -X POST 'http://127.0.0.1:8080/logout'

MEDIA_SERVER_AUTH_MODE=session \
MEDIA_SERVER_AUTH_USERS_FILE=/path/to/users.json \
  ./server.sh auth-user list
```

확인 기준은 auto mode에서 users file이 없거나 admin passwordHash가 없으면 `/setup`으로 이동하고 `/auth/whoami`가 `setupRequired=true`를 반환하는 것입니다. Auth off에서는 dev admin principal이 반환되고, token mode에서 admin/operator/viewer/integrator token별 role과 scope가 반환되며, 누락/invalid token은 `401`을 반환합니다. Session/auto setup 완료 후에는 `/login` 렌더링, 로그인 성공 후 `/auth/whoami` principal 반환, logout 후 cookie principal 제거, 잘못된 로그인 `401` 또는 실패 메시지를 확인합니다. Password policy smoke는 약한 비밀번호/username 포함 비밀번호 거부, 3종류 8자 이상 허용, 2종류 조합 최소 10자 허용, password history 재사용 거부를 확인합니다. Lockout smoke는 실패 N회 후 lockout 메시지와 `lockedUntil` 저장, lockout 만료 후 정상 로그인, TTL/idle timeout 만료 후 `/auth/whoami` 401을 확인합니다. Admin user smoke는 admin만 `/ops/users`와 `/ops/api/users`에 접근 가능하고, viewer는 `403`, low-level CLI add/list/reset/disable 동작과 auth users file mode `600`을 확인합니다. Product UI smoke는 `/ops/users` 사용자 목록, 접근 요청 table, 접힘 editor selector, `/setup`, `/login`, `/password/change`, `/invite/setup`, `/client/request-access` auth shell selector를 확인합니다. Invite/request smoke는 invite token 원문이 생성 응답에서 한 번만 표시되고 hash만 저장되는지, pending invite와 approved request가 user-only 저장 후에도 users file에 남는지, 기존 enabled user invite가 수락 전 role/scope/session을 바꾸지 않는지, access request approve가 invite setup 전 user row를 만들지 않는지, access request reject가 rejected 상태로 남는지, invite 수락 후 이전 session이 폐기되는지 확인합니다. Public access request abuse smoke는 중복 pending `409`, unsafe viewId `400`, 4KiB 초과 body `413`, peer rate limit `429`를 함께 확인합니다. Route smoke는 별도 registry fixture로 unauth/viewer/readonly-operator/integrator/public access request matrix를 함께 확인합니다. `?token=` query는 개발 smoke용으로만 사용하고 운영 검증에서는 Bearer header를 우선합니다.

Route smoke:

```bash
MEDIA_SERVER_AUTH_MODE=off MEDIA_SERVER_UI_DEFAULT_HOME=lab ./server.sh foreground
curl -fsS -D - -o /tmp/root.out 'http://127.0.0.1:8080/'

MEDIA_SERVER_AUTH_MODE=off MEDIA_SERVER_UI_DEFAULT_HOME=client ./server.sh foreground
curl -fsS -D - -o /tmp/root.out 'http://127.0.0.1:8080/'

MEDIA_SERVER_AUTH_MODE=token \
MEDIA_SERVER_AUTH_ADMIN_TOKEN=admin-token \
MEDIA_SERVER_AUTH_OPERATOR_TOKEN=operator-token \
MEDIA_SERVER_AUTH_VIEWER_TOKEN=viewer-token \
  ./server.sh foreground
curl -fsS -D - -o /tmp/root-admin.out -H 'Authorization: Bearer admin-token' 'http://127.0.0.1:8080/'
curl -fsS -D - -o /tmp/root-viewer.out -H 'Authorization: Bearer viewer-token' 'http://127.0.0.1:8080/'
curl -fsS -D - -o /tmp/root-unauth.out 'http://127.0.0.1:8080/'
curl -fsS -i -H 'Authorization: Bearer viewer-token' 'http://127.0.0.1:8080/ops'
```

확인 기준은 auth off + `lab` home에서 `/ -> /lab`, auth off + `client` home에서 `/ -> /client/live`, admin/operator token에서 `/ -> /ops/home`, viewer token에서 `/ -> /client/live`, 미인증 auth-on 요청에서 `/ -> /login`, viewer의 `/ops` 접근에서 `403`, viewer의 `/lab` 접근에서 `403`입니다. `/ops`는 admin/operator role과 `ops:read` scope를 함께 요구하며, unauth 요청은 주요 `/ops/api/*` read route에서 `401`, viewer 요청은 `403`이어야 합니다. Readonly operator는 `/ops/api/sources`, `/ops/api/runtime/status`, `/ops/api/rules/catalog`, `/ops/api/events/status`를 읽을 수 있지만 `/ops/api/users`, invite, access request review, source/view 변경은 `403`이어야 합니다. `/ops/api/sources`와 `/ops/api/views` 변경은 `source:write`, `/lab` rule/profile/vaRule 변경은 `rule:write`를 추가로 요구합니다. `/client/api/views`는 viewer에게 할당된 PublishedView만 반환하고 다른 view의 dashboard/WebRTC wrapper는 `403`이어야 합니다. Integrator는 `/client` shell이 `403`이고 `/client/api/views` 목록에 live view가 노출되지 않지만 `/client/api/views/{viewId}/events`와 `/client/api/views/{viewId}/metadata`는 각각 scope가 있으면 `200`이어야 합니다. `POST /client/api/access-requests`는 public route로 남아야 하지만 abuse guard를 통과해야 합니다. Auth on에서 `/webrtc/session`, `/whep`, `/whip/publish` 직접 생성 요청은 미인증 `401`, viewer `403`이어야 하며, `/ws/va-metadata`도 미인증 `401`, viewer `403`으로 막혀야 합니다. Auth off 개발 모드에서는 기존 검증 명령으로 계속 확인합니다.

## 장기 테스트 명령

30분 이상 사전 안정성 검증:

```bash
./server.sh verify-predev --soak-minutes 30
```

120분 predev는 상시 검증이 아니라 release candidate 또는 고위험 변경 gate입니다. release candidate 전, RTSP/GStreamer/WebRTC media path 변경 후, SharedStream/VA metadata/dashboard/SSE/WS fanout 변경 후, 또는 30분 predev에서 active RSS high-water가 이전 기준보다 커졌을 때 실행합니다.

```bash
./server.sh verify-predev --soak-minutes 120
```

긴 VA event/tracker 검증:

```bash
./server.sh verify-va-events --long
./server.sh verify-tracker-stability --long --overlap-focus
```

Close-object guard 검증은 mode별 목적을 분리합니다.

| 모드 | 확인할 것 | 통과 기준 |
| --- | --- | --- |
| `off` | 일반 회귀 baseline | 기존 event/scenario 결과 유지 |
| `diagnostic` | metadata/UI 진단 노출 | score와 tracking 결과 변경 없음 |
| `enforce` | opt-in 보정 후보 비교 | ID continuity 지표만 비교 |

기본 비교 리포트는 같은 sample을 `off`, `diagnostic`, `enforce` 순서로 실행하고 mode별 tracker summary JSON과 Markdown report를 `/tmp/media_server_close_object_tracker_*` 아래에 남깁니다.

```bash
./server.sh compare-close-object-tracker \
  --file imports/va_tracking_event_1280x720_30fps_h264.mp4 \
  --modes off,diagnostic,enforce
```

비교 기준:

| 범주 | 지표 |
| --- | --- |
| association | associationConfidence 최저값, score margin |
| overlap/이동 | overlapRisk 최대값, center jump 최대값 |
| lifecycle | lost/reacquired, missed-frame-spike, direction-change-spike |
| ID 안정성 | ID switch risk, fragmentation, overlap fragmentation |
| guard 동작 | guardDecision count, closeObjectGuardApplied/rejected count |
| 제품 영향 | event/scenario signature delta |

판정 규칙:

- `diagnostic`은 score 변경이 없어야 합니다.
- `enforce`는 opt-in 보정 후보로만 봅니다.
- event/scenario delta가 있으면 default on 전환 금지입니다.
- replay/event 결과가 흔들려도 default on 전환 금지입니다.
- default on은 여러 fixture와 현장 샘플에서 ID continuity 개선과 event 결과 무변화가 함께 확인된 뒤에만 검토합니다.

비교 리포트 해석:

- command success라도 `judgement: warning`일 수 있습니다.
- `event/scenario delta=False`여도 `enforceVsOff idSwitchRiskScore`가 증가할 수 있습니다.
- 이 경우 default-on 근거로 사용하지 않습니다.
- close-object guard는 계속 default off로 둡니다.
- 후속은 threshold tuning 또는 추가 fixture 수집입니다.

```bash
./server.sh verify-tracker-stability --long --overlap-focus
./server.sh verify-va-replay
./server.sh verify-analysis-state

MEDIA_SERVER_ANALYSIS_TRACKING_CLOSE_OBJECT_GUARD_MODE=diagnostic ./server.sh verify-analysis-state
MEDIA_SERVER_ANALYSIS_TRACKING_CLOSE_OBJECT_GUARD_MODE=diagnostic ./server.sh verify-va-replay
MEDIA_SERVER_ANALYSIS_TRACKING_CLOSE_OBJECT_GUARD_MODE=diagnostic ./server.sh verify-va-events
MEDIA_SERVER_ANALYSIS_TRACKING_CLOSE_OBJECT_GUARD_MODE=diagnostic ./server.sh verify-webrtc-va-metadata-sync --file imports/va_tracking_event_1280x720_30fps_h264.mp4
MEDIA_SERVER_ANALYSIS_TRACKING_CLOSE_OBJECT_GUARD_MODE=diagnostic ./server.sh verify-va-runtime-console

MEDIA_SERVER_ANALYSIS_TRACKING_CLOSE_OBJECT_GUARD_MODE=enforce ./server.sh verify-tracker-stability --long --overlap-focus
MEDIA_SERVER_ANALYSIS_TRACKING_CLOSE_OBJECT_GUARD_MODE=enforce ./server.sh verify-va-replay
MEDIA_SERVER_ANALYSIS_TRACKING_CLOSE_OBJECT_GUARD_MODE=enforce ./server.sh verify-analysis-state
```

수동 mode별 명령은 비교 리포트의 원인 분석이나 특정 mode 재현이 필요할 때 사용합니다. report judgement가 `hold`이면 event/scenario delta 또는 주요 회귀가 있다는 뜻이므로 default on 검토를 중단하고 fixture와 summary log를 먼저 확인합니다.

반복 다채널 VA 검증:

```bash
./server.sh verify-multichannel --include-va --repeat 3
```

외부 source 장시간 검증은 사용할 source가 준비된 경우에만 실행합니다.

```bash
./server.sh verify-uri-longrun --iterations 3 --include-external
```

## RTSP 검증

기본 codec/RTSP route 검증:

```bash
./server.sh verify-codecs
```

RTSP output 수동 확인 예시:

```bash
ffprobe -rtsp_transport tcp \
  'rtsp://127.0.0.1:8554/dhseo?file=sample_h264.mp4'
```

RTSP input pull 경로는 로컬 또는 준비된 upstream URL을 사용합니다. 개인 LAN IP는 문서에 고정하지 않고 환경에 맞게 치환합니다.

```bash
ffprobe -rtsp_transport tcp \
  'rtsp://127.0.0.1:8554/dhseo?url=rtsp%3A%2F%2Fexample.local%3A8554%2Fsource'
```

확인 기준:

- client connect/disconnect 후 listener와 session cleanup이 정상 동작
- 동일 source 다중 session에서 SharedStream fan-out 유지
- RTSP source preflight/track settle timeout에서 서버가 hang 되지 않음

## WebRTC 검증

WebRTC ICE/signaling smoke:

```bash
./server.sh verify-webrtc-ice
```

WebRTC simple signaling 수동 요청:

```bash
curl -fsS -X POST \
  'http://127.0.0.1:8080/webrtc/session?file=sample_h264.mp4'
```

WHEP 수동 요청:

```bash
curl -fsS -X POST \
  'http://127.0.0.1:8080/whep?file=sample_h264.mp4'
```

위 직접 생성 요청은 auth off 개발 모드 또는 auth on의 admin/operator `ops:read`, `lab:read` 권한에서 확인합니다. Auth route smoke는 미인증과 viewer 요청이 이 generic media 생성 route에서 거부되는지, 생성된 session id가 난수 token 형태인지, 후속 ICE/delete가 생성 principal 또는 `X-Session-Capability` 없이는 거부되는지도 함께 확인합니다. Client WebRTC wrapper smoke는 내부 session id/token을 숨기는지, PublishedView `maxTiles`와 source override 금지를 강제하는지, generic session route가 client alias를 받지 않는지도 확인합니다. 같은 smoke는 raw HTTP 요청으로 malformed `Content-Length`가 `400`, body limit 초과 선언이 `413`으로 닫히고 이후 `/health`가 계속 `200`인지 확인합니다. CORS smoke는 Origin 없는 요청이 CORS 헤더를 내지 않는지, 다른 origin의 실제 요청/preflight가 `403`인지, same-origin preflight만 origin을 반사하는지도 확인합니다.

확인 기준:

- SDP offer/answer 생성
- ICE candidate 수집
- Auth on 후속 answer/ICE/delete는 생성 principal 또는 session capability와 일치
- browser/client disconnect 후 session cleanup
- DataChannel 실패가 audio/video streaming 실패로 전파되지 않음
- WebRTC 메타데이터 뷰어는 browser client-side overlay이고 RTSP URL과 혼동하지 않음

WebRTC VA 메타데이터 뷰어 수동 확인:

1. 서버 실행 후 브라우저에서 `/lab/rules`를 연다.
2. `영상 분석 보기` 탭으로 이동한다.
3. 보기 모드를 `WebRTC 메타데이터`로 선택한다.
4. 서버 파일 또는 URL source를 선택하고 `보기 시작`을 누른다.
5. 개발자 요청 URL의 WebRTC simple signaling query에 `vaMetadata=1`이 포함되는지 확인한다.
6. DataChannel label이 기본값 `va-metadata`로 표시되는지 확인한다.
7. 상태가 `연결 중`에서 `열림` 또는 `수신 중`으로 전환되고 message count, Track/이벤트/시나리오 count, latest JSON preview가 갱신되는지 확인한다.
8. DataChannel이 `지연` 또는 `오류`가 되어도 영상 재생 상태가 별도로 유지되는지 확인한다.

WebRTC VA metadata overlay sync 수동 판단 기준:

- 초 단위로 bbox overlay가 영상보다 늦게 따라오면 metadata selector 또는 PTS sync 문제를 먼저 의심한다.
- `BBox 진단 갱신`에서 `det↔DC`, `track↔DC` IoU가 높고 center distance가 작지만 trackId만 흔들리면 tracker association / ID continuity 문제로 분리한다.
- `detector raw` bbox부터 실제 객체와 어긋나면 detector 후처리, model box format, letterbox/coordinate transform 문제로 분리한다.
- `frame matching failure`가 계속 증가하거나 `syncDeltaMs`가 1500~2000ms 이상으로 지속되면 WebRTC metadata selector와 PTS 보정을 다시 확인한다.
- close-object guard mode가 `diagnostic`이면 `closeObjectRisk`, `scoreMargin`, `centerJump`, `guardDecision`만 보고 score 변경은 없다고 판단한다. `enforce`에서는 `closeObjectGuardApplied`, would-penalize/hold-reacquire, rejected 후보 수를 함께 보고 실제 보정 여부를 분리한다.
- det/DC/track bbox가 서로 잘 맞는데 ID만 흔들리면 WebRTC DataChannel schema나 canvas scale 문제가 아니라 tracker association 후보로 본다.

WebRTC VA metadata 자동 검증:

```bash
./server.sh verify-webrtc-va-metadata --http-base http://127.0.0.1:8080
```

확인할 항목:

- `/webrtc/session?...&vaMetadata=1`로 WebRTC session을 생성
- browser `RTCPeerConnection`에서 video `ontrack` 확인
- ICE 상태가 `connected` 또는 `completed`로 전환되는지 확인
- `va-metadata` DataChannel이 열리는지 확인
- 최소 1개 metadata message를 수신하고 `media-server.webrtc.va-metadata.v1` schema, `tracks[]`, `events[]` 필드를 확인
- sync 진단 필드(`videoFramePtsMs`, `analysisPtsMs`, `syncDeltaMs`, `syncStatus`, `syncToleranceMs`, `metadataSequence`, `sentAtMs`, `frameWidth`, `frameHeight`, `coordinateSpace`)가 포함되는지 확인
- `syncStatus`가 `exact`, `near`, `fallback-latest`, `missing`, `stale` 중 하나인지 확인
- Lab WebRTC client-side overlay는 기본적으로 `syncStatus=fallback-latest` metadata를 그리지 않는지 확인
- fallback 표시가 필요할 때만 `clientOverlayFallback=1` 또는 `vaMetadataDrawFallback=1`을 사용하고, 이 경우 fallback metadata가 흐리게 표시되는지 확인
- fallback metadata가 숨겨진 경우 `Fallback 숨김` count가 증가하는지 확인
- 실패 시 Chrome log 경로와 summary JSON 경로를 출력

WebRTC VA metadata overlay sync 자동 검증:

```bash
./server.sh verify-webrtc-va-metadata-sync --http-base http://127.0.0.1:8080
```

확인할 항목:

- 실제 `/lab/rules` UI에서 `영상 분석 보기` → `WebRTC 메타데이터` 모드를 시작
- WebRTC session 생성, video `ontrack`, ICE 연결, `va-metadata` DataChannel 수신 확인
- `requestVideoFrameCallback` 기반 video frame count가 증가하는지 확인
- metadata payload에 sync 진단 필드가 포함되는지 확인
- 검증 전용 hook으로 metadata buffer 상한을 초과하는 synthetic metadata를 주입하고 buffer가 제한되는지 확인
- client overlay draw count가 video frame callback 기준으로 증가하는지 확인
- `fallback metadata 표시` 옵션이 기본 off인지 확인
- `syncStatus=fallback-latest`가 수신되더라도 기본 정책에서 draw되지 않는지 확인
- 브라우저 검증 hook으로 `requestVideoFrameCallback`을 일정 frame 이후 멈춰 video stalled 상태를 재현
- video stalled 상태에서 stale overlay clear가 발생하고 draw count가 더 증가하지 않는지 확인
- 실패 시 `videoPresentedFrameCount`, `metadataReceivedCount`, `metadataDrawnCount`, `metadataDroppedCount`, `fallbackHiddenCount`, `staleClearCount`, `maxMetadataBufferSize`, `maxSyncDeltaMs`, `averageSyncDeltaMs`를 summary JSON에 남김

이 검증은 선택 검증이며 기본 `./server.sh test`에는 포함하지 않는다. 브라우저/렌더링 타이밍에 따라 flaky할 수 있으므로 실패 시 summary JSON과 Chrome log를 함께 확인한다.

## RTSP / WebRTC VA 표시 정책 검증

RTSP와 WebRTC는 metadata 표시 방식이 다릅니다.

수동 확인:

1. `/lab/rules`의 `영상 분석 보기` 탭을 연다.
2. `개발자 요청 URL`을 펼친다.
3. `WebRTC 메타데이터 뷰어` URL에는 `/webrtc/session`과 `vaMetadata=1`이 포함되는지 확인한다.
4. Metadata subscription filter 입력값을 넣으면 WebRTC metadata viewer URL과 SSE/WS side-channel URL 모두에 `eventType`, `scenarioName`, `trackId`, `zoneId` query가 반영되는지 확인한다.
5. `RTSP 서버 오버레이` URL에는 `rtsp://...`와 `va=1` 또는 `vaRule=<id>`가 포함되는지 확인한다.
6. `RTSP 원본 스트림` URL에는 `va=1`, `vaRule=<id>`, `vaMetadata=1`이 포함되지 않는지 확인한다.
7. `커스텀 메타데이터 사이드채널` URL이 `/metadata/stream` SSE endpoint를 가리키는지 확인한다.
8. `커스텀 RTSP + 메타데이터 연결 정보` 영역에 RTSP 원본 스트림과 SSE 메타데이터 스트림이 함께 표시되는지 확인한다.
9. `커스텀 메타데이터 사이드채널` 설명이 일반 VLC/ffplay에서 metadata UI가 표시되는 것처럼 표현하지 않는지 확인한다.

확인 기준:

- RTSP 일반 viewer는 DataChannel을 사용하지 않음
- RTSP VA 표시는 server-side overlay가 기본 정책
- RTSP/server-side overlay의 latest result fallback 정책은 기존대로 유지됨
- WebRTC browser viewer만 DataChannel metadata와 client-side overlay를 사용
- WebRTC client-side overlay는 fallback-latest를 기본 숨김 처리하고 opt-in에서만 표시
- custom client는 RTSP video와 별도 SSE metadata side-channel을 직접 조합해야 함

RTSP video 재생은 일반 player 명령으로 별도 확인합니다.

```bash
ffplay -rtsp_transport tcp 'rtsp://127.0.0.1:8554/dhseo?file=sample_h264.mp4'
ffplay -rtsp_transport tcp 'rtsp://127.0.0.1:8554/dhseo?file=sample_h264.mp4&va=1'
```

위 명령은 RTSP 영상 확인용입니다. VLC/ffplay/IINA는 SSE/WS metadata side-channel을 자동 overlay하지 않습니다.

SSE metadata side-channel 수동 확인:

```bash
curl -N 'http://127.0.0.1:8080/lab/analysis/metadata/stream?vaRule=1&intervalMs=500&maxMessageBytes=65536'
curl -N 'http://127.0.0.1:8080/lab/analysis/metadata/stream?vaRule=1&eventType=loitering&scenarioName=loitering&includeMetrics=0&intervalMs=500&maxMessageBytes=65536'
```

이미 생성된 analysis tap을 재사용할 때:

```bash
curl -N 'http://127.0.0.1:8080/lab/analysis/taps/{tapId}/metadata/stream?intervalMs=500&maxMessageBytes=65536'
```

Custom SSE metadata client 예제:

```bash
python3 scripts/examples/va_metadata_sse_client.py \
  --url 'http://127.0.0.1:8080/lab/analysis/metadata/stream?vaRule=1&intervalMs=500&maxMessageBytes=65536' \
  --max-messages 5 \
  --timeout-seconds 15
```

SSE metadata client 검증 범위:

| 포함 | 제외 |
| --- | --- |
| `event: metadata` 수신 | RTSP video 재생 |
| JSON parse/schema 확인 | overlay renderer |
| `streamId/channelId` 확인 | 일반 player 자동 overlay |
| track/event/scenario count |  |
| latest timestamp와 message count |  |

payload 본문까지 보고 싶으면 `--print-json`을 추가합니다. 영상은 ffplay/VLC 같은 일반 RTSP player로 별도 재생합니다.

Custom RTSP + SSE metadata overlay renderer는 optional client example입니다. 검증은 세 단계로 나눕니다.

| 단계 | 확인 |
| --- | --- |
| RTSP raw video | overlay 없는 영상 재생 |
| SSE metadata | runtime metadata 수신 |
| OpenCV client | video와 metadata를 client-side에서 조합 |

이 단계에서도 VLC/ffplay/IINA가 SSE/WS metadata를 자동 overlay한다고 판단하지 않습니다.

Custom RTSP + SSE overlay renderer 예제:

```bash
python3 scripts/examples/va_rtsp_sse_overlay_client.py --help
python3 scripts/examples/va_rtsp_sse_overlay_client.py \
  --rtsp-url 'rtsp://127.0.0.1:8554/dhseo?file=sample_h264.mp4' \
  --metadata-url 'http://127.0.0.1:8080/lab/analysis/metadata/stream?file=sample_h264.mp4&va=1&intervalMs=500&maxMessageBytes=65536' \
  --max-seconds 15 \
  --headless
```

OpenCV 예제 확인 항목:

| 환경 | 기대 결과 |
| --- | --- |
| OpenCV 설치됨 | window mode에서 RTSP raw frame 표시 |
| metadata 수신 중 | bbox, trackId, className 표시 |
| metadata 끊김 | stale 표시 |
| OpenCV 없음 | 설치 안내 메시지와 함께 실패 |

이 optional example 검증은 서버 core, RTSP server-side overlay 정책, WebRTC DataChannel schema, SSE/WS metadata schema, Event POST payload 변경 검증이 아닙니다.

OpenCV dependency 확인:

```bash
python3 -c "import cv2; print(cv2.__version__)"
```

macOS/Homebrew Python이 PEP 668 `externally-managed-environment`로 plain `pip install`을 막는 경우에는 project venv를 만들거나, 사용자 site-packages에만 설치합니다. 최근 재점검에서는 아래 명령으로 `cv2` import와 headless overlay smoke를 확인했습니다.

```bash
python3 -m pip install --user --break-system-packages opencv-python
python3 scripts/examples/va_rtsp_sse_overlay_client.py \
  --rtsp-url 'rtsp://127.0.0.1:8555/dhseo?file=sample_h264.mp4' \
  --metadata-url 'http://127.0.0.1:8081/lab/analysis/metadata/stream?file=sample_h264.mp4&va=1&intervalMs=500&maxMessageBytes=65536' \
  --max-seconds 2 \
  --headless
```

기본 예시는 `8080/8554`를 사용하지만 local override나 이미 떠 있는 foreground 서버가 `8081/8555`를 쓰는 경우에는 HTTP/RTSP base만 맞춥니다. 기본 포트에 listener가 없어서 생기는 `Connection refused`나 RTSP decode 실패는 보정 포트 검증 결과와 분리해서 기록합니다.

확인할 항목:

- 응답 header가 `text/event-stream`인지 확인
- `event: metadata`의 `data:` JSON schema가 `media-server.va.runtime-metadata.v1`인지 확인
- `tracks`, `events`, `scenarios`, `metrics` 필드가 포함되는지 확인
- frame이 갱신되지 않을 때 동일 metadata를 반복 전송하지 않고 heartbeat/stale comment로 유지되는지 확인
- curl 중단 후 임시 tap이 cleanup되는지 `/lab/analysis/taps`에서 확인

SSE metadata side-channel smoke:

```bash
./server.sh verify-sse-metadata --http-base http://127.0.0.1:8080
./server.sh verify-va-metadata-sidechannel --http-base http://127.0.0.1:8080
./server.sh verify-va-metadata-sidechannel --http-base http://127.0.0.1:8080 \
  --metadata-event-type loitering \
  --metadata-scenario-name loitering \
  --omit-metrics
```

확인할 항목:

- `/lab/analysis/metadata/stream?file=...` 응답이 `text/event-stream`인지 확인
- 첫 `event: metadata`의 JSON schema가 `media-server.va.runtime-metadata.v1`인지 확인
- `tracks`, `events`, `scenarios`, `metrics` 필드가 포함되는지 확인
- `eventType`, `scenarioName`, `trackId`, `zoneId` 같은 subscription filter가 metadata `events`/debug `tracks` 범위를 줄이고, `includeMetrics=0` 같은 include flag가 지정 필드를 생략하는지 확인
- filter/include smoke는 metadata payload 본문을 직접 검사합니다. matching event가 없는 샘플에서는 count가 0일 수 있으나, 존재하는 `events`/`tracks` 항목은 요청 filter와 맞아야 하고 `--omit-metrics`에서는 `metrics` field가 없어야 합니다.
- 임시 SSE analysis tap이 client disconnect 후 cleanup되는지 확인
- `verify-va-metadata-sidechannel`은 같은 검증을 수행하면서 summary JSON을 출력하는 명시적 alias

WebSocket metadata side-channel smoke:

```bash
./server.sh verify-ws-metadata --http-base http://127.0.0.1:8080
```

확인할 항목:

- auth off 또는 admin/operator/`lab:read` 권한에서 `/ws/va-metadata?file=...` handshake가 `101 Switching Protocols`로 완료되는지 확인
- auth on의 미인증 요청은 `401`, viewer 요청은 `403`으로 거부되는지 확인
- 첫 text frame의 JSON schema가 `media-server.va.runtime-metadata.v1`인지 확인
- `tracks`, `events`, `scenarios`, `metrics` 필드가 포함되는지 확인
- `{"type":"subscribe","eventType":"loitering","includeMetrics":false}` 같은 client text command 후 `media-server.va.metadata-control.v1` ack가 오고, 이어서 `unsubscribe`, `status`, `resume`, `reset` ack 순서와 subscribed/filter/include 상태가 기대값과 맞는지 확인
- `/lab/rules` Custom client URL 패널에서 metadata filter preset 저장/재적용 후에도 WebRTC metadata viewer, SSE, WS URL query가 같은 filter/include 값을 유지하는지 확인
- 임시 WebSocket analysis tap이 client disconnect 후 cleanup되는지 확인
- WebSocket 실패가 RTSP/WebRTC video/audio 흐름으로 전파되지 않는지 확인

VA Runtime Console 자동 검증:

```bash
./server.sh verify-lab-layout
./server.sh verify-analysis-state
./server.sh verify-va-runtime-console --http-base http://127.0.0.1:8080
```

확인할 항목:

- 임시 analysis tap 생성 후 dashboard polling이 가능한지 확인
- Runtime Dashboard drill-down UI가 lab layout을 깨뜨리지 않는지 확인
- state-dump 기반 Tracks/Scenarios/Tracking Issues 표시와 vaRule Runtime Debug가 기존 endpoint만 재사용하는지 확인
- Runtime Dashboard의 Trend / Stale / Cleanup section이 최근 sample 수, delta/min/max, warning badge를 표시하는지 확인
- Trend detail이 activeSessions/activeStreams/activeAnalysisTaps, SSE/WS clients, RTSP consumers, WebRTC metadata sent/drop/fail, metadata payload avg/max, DataChannel bufferedAmount, tracking issue/close-object risk, Event POST/EventRecord count를 기존 endpoint 값으로 표시하는지 확인
- 값이 없는 항목은 `미제공`으로 표시하고 새 대형 backend endpoint나 WebRTC/SSE/WS/Event POST payload schema 변경이 없는지 확인
- dashboard tab을 벗어난 뒤 polling과 trend sample 증가가 멈추는지 확인
- active tap이 있는데 `/metrics` progress가 3개 이상 sample 동안 정체되면 tap metrics stale warning이 표시되는지 확인
- DataChannel open 상태에서 metadata 미수신 또는 3초 초과 stale, video frame/overlay draw age 3초 초과, SSE/WS client active 상태의 metadata build 정체가 warning badge로 보이는지 확인
- WebRTC metadata viewer 중지 후 activeSessions/activeStreams/activeAnalysisTaps/SSE/WS/RTSP 잔류가 있으면 cleanup warning으로 표시되는지 확인
- cleanup warning은 보기 중지/dashboard 비활성 후 짧은 grace period 이후 판단하며 longrun report를 대체하지 않는 live observation 보조 지표로 해석
- `/lab/analysis/taps/{tapId}/metrics`의 `tapState`, `trackState`, `metricsReport` 확인
- `/lab/analysis/taps/{tapId}/state-dump` JSON 확인
- `/lab/analysis/taps/{tapId}/events` 접근과 recent event buffer 확인
- `/lab/analysis/event-post/status`, `/lab/analysis/event-storage/status`, `/lab/analysis/events/records`, `/lab/runtime/status` 접근 확인
- smoke용 analysis tap cleanup 확인

RTSP VA overlay 정책 자동 검증:

```bash
./server.sh verify-rtsp-va-overlay-policy \
  --http-base http://127.0.0.1:8080 \
  --rtsp-base rtsp://127.0.0.1:8554/dhseo
```

확인할 항목:

- RTSP 원본 스트림 URL에는 `va=1`, `vaRule=<id>`, `vaMetadata=1`이 포함되지 않음
- RTSP 서버 오버레이 URL에는 `va=1`이 포함됨
- metadata side-channel은 RTSP URL이 아니라 `/metadata/stream` HTTP SSE URL로 분리됨
- `ffmpeg`가 있으면 raw/overlay RTSP URL을 짧게 decode
- 모든 결과는 summary JSON으로 남김

VA Metadata Runtime Console 장시간 검증:

```bash
./server.sh verify-va-runtime-console-longrun \
  --duration-minutes 30 \
  --clients 1 \
  --include-sidechannel \
  --include-dashboard
```

RTSP server-side overlay consumer까지 함께 유지할 때:

```bash
./server.sh verify-va-runtime-console-longrun \
  --duration-minutes 30 \
  --clients 1 \
  --include-sidechannel \
  --include-dashboard \
  --include-rtsp
```

consumer cleanup 이후 서버를 즉시 종료하지 않고 idle RSS를 관찰할 때:

```bash
./server.sh verify-va-runtime-console-longrun \
  --duration-minutes 30 \
  --clients 1 \
  --include-sidechannel \
  --include-dashboard \
  --include-rtsp \
  --idle-after-cleanup-minutes 15 \
  --idle-sample-interval-seconds 30
```

RSS WARNING 해제 여부를 판단하기 위한 full fanout 120분 active + 30분 idle 검증:

```bash
./server.sh verify-va-runtime-console-longrun \
  --duration-minutes 120 \
  --clients 1 \
  --include-dashboard \
  --include-sidechannel \
  --include-rtsp \
  --rss-warmup-minutes 5 \
  --rss-large-drop-mb 20 \
  --idle-after-cleanup-minutes 30 \
  --idle-sample-interval-seconds 30
```

consumer connect/disconnect cycle 이후 idle baseline RSS 누적 증가를 확인할 때:

```bash
./server.sh verify-va-runtime-console-cycles \
  --cycles 10 \
  --active-minutes 5 \
  --idle-minutes 2 \
  --clients 1 \
  --include-sidechannel \
  --include-dashboard \
  --include-rtsp \
  --rss-warmup-minutes 5 \
  --rss-large-drop-mb 20
```

확인할 항목:

- WebRTC `vaMetadata=1` DataChannel이 장시간 metadata를 계속 수신하는지 확인
- dashboard polling 중 `/metrics`, `/state-dump`, `/events`, event POST/storage status 접근이 유지되는지 확인
- dashboard drill-down과 vaRule Runtime Debug polling이 media pipeline을 blocking하지 않는지 확인
- SSE metadata side-channel client가 장시간 연결 후 cleanup되는지 확인
- `--include-rtsp` 지정 시 RTSP `va=1` server-side overlay consumer가 함께 유지되는지 확인
- process RSS/CPU, active sessions/streams/taps, metadata side-channel client count를 주기적으로 기록
- `--idle-after-cleanup-minutes` 지정 시 consumer와 dashboard tap cleanup 후 서버 process를 유지하면서 idle RSS/CPU와 active count 재상승 여부를 별도로 기록
- `verify-va-runtime-console-cycles`는 서버를 유지한 채 WebRTC/SSE/dashboard/RTSP consumer를 반복 연결/해제하고 cycle별 active peak RSS와 idleEnd RSS baseline을 비교
- WebRTC metadata sent/dropped/failure count는 longrun 서버 로그의 `[webrtc-metadata] close` 라인에서 집계
- `/lab/runtime/status`의 `debugCounters` 블록으로 RTSP/GStreamer egress release와 fanout lifecycle counter를 확인
- longrun/cycle summary JSON과 Markdown report의 `debugCounters` 또는 `Runtime Debug Counters` 섹션에서 counter 최종값을 확인
- 종료 후 active sessions, active analysis taps, SSE/WS metadata clients가 0으로 정리되는지 확인
- idle 관찰 중 active sessions/streams/taps, SSE/WS clients, RTSP egress consumer가 다시 증가하면 cleanup/RSS 해석보다 `idleJudgement`를 우선 확인
- cycle 검증에서는 cycle별 cleanup count가 0이 아니면 `HOLD`, 최종 port cleanup 실패는 `FAIL`, idleEnd RSS가 cycle마다 계속 증가하면 `WARNING`으로 판단
- active 구간 RSS slope와 idle-after-cleanup RSS slope는 분리해서 해석합니다. active 중 RSS가 증가해도 cleanup 후 모든 active count가 0이고 idle RSS가 유지/하락하면 lifecycle 잔여 증거보다 allocator high-water 또는 GStreamer/WebRTC buffer pool retention 후보로 봅니다.
- longrun summary JSON과 Markdown report는 `/tmp/media_server_va-runtime-longrun-*`, cycle summary/report는 `/tmp/media_server_va-runtime-cycles-*` 경로에 남김

최근 RSS WARNING 해제 후보 검증 결과:

- RTSP-only 5-cycle: `PASS`. `monotonicIdleRssIncrease=false`, RTSP lifecycle counter 균형, pending queue stop/destroy 잔여 `0`, `appsrcPushAfterStopCount=0`, flow return은 FLUSHING 중심입니다.
- Full 20-cycle: `PASS`. `monotonicIdleRssIncrease=false`, cleanup/port cleanup 정상, RTSP lifecycle/probe/bus watch counter 균형, pending queue stop/destroy 잔여 `0`, flow return은 전부 FLUSHING입니다.
- 120m full + 30m idle-after-cleanup: `PASS`. Summary는 `/tmp/media_server_va-runtime-longrun-1777648583-19035_summary.json`, report는 `/tmp/media_server_va-runtime-longrun-1777648583-19035_report.md`입니다.
- 120m active 구간은 warmup baseline `679.80MiB`에서 last RSS `881.38MiB`까지 증가했고, last-30m slope는 `+51.77MiB`, `+1.726MiB/min`입니다. active plateau는 뚜렷하지 않으므로 high-water 관찰 메모는 유지합니다.
- cleanup 후 30분 idle RSS는 `642.97MiB -> 642.67MiB`로 유지/하락했고, idle 중 activeSessions, activeStreams, activeAnalysisTaps, SSE/WS clients, RTSP consumers 재증가는 없었습니다.
- `ERROR` / `NOT_LINKED` / `NOT_NEGOTIATED` / `OTHER` flow return은 관찰되지 않았고, port cleanup은 정상입니다. 이 조합이면 RSS WARNING 해제 가능 후보로 봅니다.
- 후속 30분 predev 회귀 검증도 `PASS`입니다.
- Summary는 `/tmp/media_server_predev-1777679318-64004_summary.json`입니다.
- Report는 `/tmp/media_server_predev-1777679318-64004_report.md`입니다.
- 결과는 `pass=69`, `fail=0`, `skip=1`입니다.
- Runtime Console은 stable 승격 가능 상태로 판단하되 active 구간 high-water 관찰 메모는 유지합니다.

Runtime Console 검증 정책:

| 항목 | 정책 |
| --- | --- |
| 기본 test 포함 여부 | `./server.sh test`에는 포함하지 않음 |
| 실행 성격 | 30분 이상 실행하는 선택 검증 |
| 120분 실행 | release candidate 또는 고위험 RTSP/GStreamer/WebRTC/VA fanout 변경 gate |
| trace env | 검증용 subprocess env에서 `MEDIA_SERVER_WEBRTC_TRACE=1` 사용 |
| 집계 | DataChannel sent/drop/failure count를 로그에서 집계 |
| 영구 설정 | `scripts/.media_server.env` 같은 파일은 수정하지 않음 |

Runtime debug counter는 기존 Event POST/WebRTC/SSE metadata payload schema를 변경하지 않는 내부 진단 값입니다. 기본적으로 counter만 누적하며, lifecycle trace log가 필요할 때만 `MEDIA_SERVER_RUNTIME_DEBUG_COUNTER_TRACE=1`을 서버 실행 환경에 추가합니다.

주요 counter:

- `rtspMediaConfiguredCount`, `rtspMediaUnpreparedCount`
- `rtspEgressSessionCreatedCount`, `rtspEgressSessionStartedCount`, `rtspEgressSessionStoppedCount`, `rtspEgressSessionDestroyedCount`
- `rtspAppsrcPushOkCount`, `rtspAppsrcPushFailCount`
- `rtspPendingQueuePeak`, `rtspPendingQueueDroppedCount`
- `sharedStreamSubscriberAddedCount`, `sharedStreamSubscriberRemovedCount`
- `analysisTapAttachedCount`, `analysisTapDetachedCount`
- `analysisTapCreatedCount`, `analysisTapReusedCount`, `analysisTapRejectedCount`
- `analysisTapRefCount`, `analysisTapReuseKey`
- `metadataJsonBuildCount`, `metadataJsonBytesTotal`, `metadataJsonBytesMax`

Analysis tap reuse smoke 기준:

- 같은 source와 같은 analysis profile을 여러 client/view에서 요청하면 `sessionManager.registryActiveStreams=1`, `analysisMatching.activeTapCount=1`, 해당 tap의 `refCount`가 client 수만큼 증가합니다.
- 같은 source라도 detector model, input size, FPS, tracking class, tracker config, preprocessing config가 다른 profile이면 별도 tap이 허용됩니다.
- client별 overlay 표시 옵션만 다른 경우에는 `analysisTapReusedCount`가 증가하고 `analysisTapCreatedCount`는 추가로 증가하지 않아야 합니다.
- 종료 후 cleanup 상태에서 `activeAnalysisTaps=0`, `analysisMatching.activeTapCount=0`으로 돌아와야 합니다.

## Client scoped dashboard 검증

Client dashboard는 PublishedView scope와 sanitized runtime summary를 확인하는 smoke로 검증합니다.

```bash
curl -fsS 'http://127.0.0.1:8080/client/api/views'
curl -fsS 'http://127.0.0.1:8080/client/api/views/{viewId}/dashboard'
curl -fsS 'http://127.0.0.1:8080/client/api/views/{viewId}/events?limit=20'
curl -fsS 'http://127.0.0.1:8080/client/api/views/{viewId}/metadata'
```

확인 기준:

- viewer는 `view:read:{viewId}`가 있는 view만 `/client/api/views`에서 확인합니다.
- dashboard API는 `dashboard:read:{viewId}`, events API는 `event:read:{viewId}`, metadata summary API는 `metadata:read:{viewId}` scope가 필요합니다.
- admin/operator는 client dashboard에서 전체 PublishedView 상태를 확인할 수 있습니다.
- `showDashboard=false`인 view는 dashboard API가 403을 반환하고, `showEvents=false`인 view는 events API가 403을 반환합니다.
- dashboard health는 live/offline, connection status, video frame status, metadata status, stale 여부, stale metadata age, last frame age를 반환합니다.
- 값이 없으면 UI는 `미제공`을 표시합니다.
- client dashboard 응답과 화면에 source 원본 URL, Developer URL, raw JSON, `debugCounters`, `analysisTapId`, internal session id, rule/profile editor, Event POST 설정, SSE/WS 전체 endpoint가 노출되지 않아야 합니다.
- Event POST payload, WebRTC DataChannel schema, SSE/WS metadata schema는 변경하지 않습니다.

Client Live Monitor smoke 기준:

```bash
curl -fsS 'http://127.0.0.1:8080/client/api/views'
curl -fsS -X POST \
  -H 'Content-Type: application/json' \
  -d '{"overlayMode":"raw"}' \
  'http://127.0.0.1:8080/client/api/views/{viewId}/webrtc/session'
```

확인 기준:

- `/client/live`는 2x2 grid, 최대 4 tile만 표시하며 PublishedView별 `maxTiles`를 UI 채널 배정/시작과 client wrapper API에서 함께 강제합니다.
- viewer는 assigned PublishedView만 tile에 선택할 수 있습니다.
- client WebRTC wrapper는 viewId만 허용하고 `file`, `url`, `source`, `rtspUrl`, `httpUrl`, `webrtcSourceId`, `whepUrl` override 요청을 400으로 거부합니다.
- 같은 principal+view의 활성 client session이 `maxTiles`에 도달하면 추가 session 생성은 `409`로 거부됩니다.
- `overlayMode`는 PublishedView의 `allowedOverlayModes` 안에서 `raw`, `va-overlay`, `va-rule`로 정규화됩니다.
- `va-rule` mode는 PublishedView의 `allowedRuleIds`/`defaultRuleId` 안의 rule만 사용할 수 있습니다.
- `va-rule` mode는 허용된 rule이라도 저장 source가 PublishedView source와 다르면 400으로 거부합니다.
- `/client/live`의 browser `RTCPeerConnection`은 `/webrtc/config`의 `peerConnectionConfig`를 사용하며, 제품 smoke는 빈 `iceServers` 강제 코드가 남아 있지 않은지 확인합니다.
- client 생성 응답은 `client-live-<random>` alias만 반환하고 `sessionToken` 또는 내부 generic session id를 노출하지 않습니다.
- client answer/ICE/delete는 `/client/api/views/{viewId}/webrtc/session/{clientSessionId}` wrapper를 사용하며, client alias는 generic `/webrtc/session/{id}` route에서 사용할 수 없어야 합니다.
- tile stop은 PeerConnection/DataChannel을 닫고 client wrapper DELETE를 호출합니다.
- all stop 또는 hidden tab/route leave 후 `activeSessions`가 감소하고 media stream track이 정리됩니다.
- tile status는 live/offline, stale, track count, event count, connection status를 표시합니다.
- client 화면에 source URL, Developer URL, BBox diagnostics, raw JSON, `debugCounters`, 내부 session id/token, rule/profile 수정 UI가 노출되지 않아야 합니다.
- 기존 `/webrtc/session?file=...` 개발용 경로와 WebRTC DataChannel schema, Event POST payload는 변경하지 않습니다. 단, auth on에서는 직접 generic media 생성 route가 admin/operator `ops:read` 또는 `lab:read` 권한을 요구하므로 viewer 제품 흐름은 client wrapper만 사용합니다.

## VA overlay 검증

기본 YOLO/ONNX overlay:

```bash
./server.sh verify-va
```

수동 RTSP overlay URL:

```bash
ffprobe -rtsp_transport tcp \
  'rtsp://127.0.0.1:8554/dhseo?file=va_four_scene_sample.mp4&va=1'
```

확인 기준:

- `va=1` 요청에서 bbox/class/confidence overlay 표시
- overlay wait/sync timeout 때문에 media pipeline이 blocking되지 않음
- debug overlay 기본값은 off
- TrackHealth/Scenario debug 정보는 debug mode에서만 표시

## vaRule 검증

Rule/Profile UI와 저장 rule 호출:

```bash
./server.sh verify-rule-ui
./server.sh verify-lab-layout
```

저장 rule 수동 URL:

```bash
ffprobe -rtsp_transport tcp \
  'rtsp://127.0.0.1:8554/dhseo?vaRule=1'
```

확인 기준:

- `vaRule=<number>`가 저장된 rule/profile/source를 사용
- rule에 연결된 source가 있는 경우 URL의 source override와 충돌하지 않음
- 기존 rule payload 구조와 외부 이벤트 출력 형식 유지
- ReEntry scenario를 룰 편집 UI에서 선택하고 `reEntryWindowMs`, `cooldownMs`, target zone, re-entry zone을 저장할 수 있음
- 저장된 ReEntry rule은 `event.type=scenario.type=re-entry`와 `targetZoneIds`/`reEntryZoneIds`를 유지함
- IntrusionAfterLineCrossing scenario를 룰 편집 UI에서 선택하고 trigger line, crossing direction, target zone, `maxDelayAfterCrossingMs`, `dwellTimeMs`, `cooldownMs`를 저장할 수 있음
- 저장된 IntrusionAfterLineCrossing rule은 기존 `line-crossing` 기본 이벤트와 분리된 `event.type=scenario.type=intrusion-after-line-crossing`을 유지함
- Loitering scenario를 룰 편집 UI에서 선택하고 target zone, field preset(로비/매장 통로/승강장/주차장), `minDwellTimeMs`, `maxMovementRadius`, `minTrajectoryPoints`, `cooldownMs`를 저장할 수 있음
- 저장된 Loitering rule은 `event.type=scenario.type=loitering`과 `targetZoneIds`/movement radius/trajectory point를 유지함
- ZoneOccupancyScenario를 룰 편집 UI에서 선택하고 field preset(대기열/로비/승강장/출입구/승강기 홀), `occupancyThreshold`, `minDwellTimeMs`, target zone, cooldown을 저장할 수 있음
- IntrusionDwell/WrongDirection UI와 기존 Event POST payload, WebRTC/SSE/WS metadata schema는 변경되지 않음
- 숫자 ID 범위와 자동 할당 정책이 UI에서 깨지지 않음

## Event POST 검증

Event POST schema:

```bash
./server.sh verify-event-post --mode schema
```

Event POST recovery/queue:

```bash
./server.sh verify-event-post --mode recovery
```

EventStorage status/records smoke:

```bash
curl -fsS 'http://127.0.0.1:8080/lab/analysis/event-storage/status'
curl -fsS 'http://127.0.0.1:8080/lab/analysis/events/records?limit=5'
```

서버가 `8081` 같은 다른 HTTP port로 떠 있으면 port만 맞춰 실행합니다.

`verify-event-post`는 서버가 `MEDIA_SERVER_ANALYSIS_EVENT_POST_ENABLED=1` 상태로 실행되어 있어야 합니다. 기본 서버가 Event POST disabled라서 `event POST dispatcher가 비활성화되어 있습니다`로 실패하면, 같은 build를 Event POST enabled 보정 서버로 띄워 schema/recovery를 재확인합니다.

```bash
MEDIA_SERVER_SKIP_LOCAL_ENV=1 \
MEDIA_SERVER_SKIP_BUILD=1 \
MEDIA_SERVER_LISTEN_ADDRESS=127.0.0.1 \
MEDIA_SERVER_HTTP_LISTEN_ADDRESS=127.0.0.1 \
MEDIA_SERVER_LISTEN_PORT=8556 \
MEDIA_SERVER_HTTP_LISTEN_PORT=8082 \
MEDIA_SERVER_ANALYSIS_EVENT_POST_ENABLED=1 \
./server.sh foreground

./server.sh verify-event-post --mode schema --http-base http://127.0.0.1:8082
./server.sh verify-event-post --mode recovery --http-base http://127.0.0.1:8082
```

보정 경로 해석:

- schema/recovery가 통과하면 기본 서버 disabled 실패는 제품 회귀가 아닙니다.
- 이 경우 실행 환경 조건으로 기록합니다.
- EventStorage가 비활성인 보정 서버에서는 corrupt/partial injection 세부 검증이 skip될 수 있습니다.
- Event POST dispatcher recovery와 EventRecord storage recovery 검증은 분리해서 봅니다.

확인 기준:

- 기존 Intrusion / LineCrossing POST payload 형식 유지
- 신규 scenario event도 EventManager를 통해 emit
- POST 실패가 media pipeline 실패로 이어지지 않음
- queue/dedupe/cooldown counter가 무한 증가하지 않음
- Event POST payload 검증과 EventRecord storage 정책 검증은 별도입니다. Storage rotation/recovery가 추가되어도 POST payload field는 변경하지 않습니다.
- EventRecord file storage, active/archive query/search UI와 JSON Lines rotation/retention/recovery 1차는 구현 완료 상태입니다.
- EventRecord 조회 API는 저장된 metadata와 recorder output path만 반환하며 영상 검색/재생을 수행하지 않음
- snapshot/clip hook 활성화 시 analysis frame buffer에서 snapshot media와 pre/post frame bundle manifest를 생성함. MP4/VMS/NVR 장기 녹화는 검증 범위가 아님
- records API와 Runtime Dashboard Event Records UI는 `evidence=snapshot|clip|any|both|missing` 조건으로 snapshot/clip-backed record를 검색하고, detail에서 snapshot path, clip manifest path, clip bundle directory를 분리해 표시함
- records API는 `offset`/`limit` paging으로 active/archive 합산 결과를 넘기고, compaction snapshot cleanup API는 `keepNewest` 기준으로 compacted snapshot만 정리함
- `/lab/analysis/events/evidence?path=...` preview route는 configured snapshot/clip 디렉터리 아래의 safe evidence만 열고, snapshot inline preview와 clip manifest/frame link의 backing route로 사용함
- `includeArchives=1`은 rotated archive를 조회에 포함하고, compaction snapshot API는 기존 파일을 수정하지 않음
- compaction snapshot 목록/다운로드/삭제 API는 compacted file pattern만 허용하고 active/archive 파일을 삭제하지 않음
- 손상되었거나 partial 상태인 EventRecord JSON Lines 행은 records API 전체 실패가 아니라 skip/count 처리됨
- `/lab/analysis/event-storage/status`의 `skippedCorruptLines`, `partialLineCount`, `lastRecoveryStatus`로 recovery summary를 확인할 수 있음
- `verify-event-post --mode recovery`는 EventStorage가 활성화되어 있고 안전한 `/tmp/media_server_*` path를 사용할 때 valid/corrupt/partial JSON Lines를 주입해 records API와 status recovery count를 확인함
- Rotation/retention은 `MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_MAX_FILE_BYTES`, `MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_MAX_ARCHIVES`, `MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_MAX_TOTAL_BYTES`를 켠 환경에서 status의 `activeFileSizeBytes`, `archivedFileCount`, `totalArchiveBytes`, `rotatedCount`, `retentionDeletedCount`로 smoke 확인함

## Replay 검증

실제 영상 없이 metadata fixture로 회귀를 비교합니다.

```bash
./server.sh replay-va-metadata \
  --input test/fixtures/va_metadata_replay_basic.json \
  --output /tmp/va_metadata_replay.json
```

baseline fixture 전체 검증:

```bash
./server.sh verify-va-replay
```

검증 대상:

- Intrusion
- LineCrossing
- IntrusionDwell
- IntrusionDwell per-rule override: 저장 rule의 `candidateTimeMs`/`dwellTimeMs`/`cooldownMs`와 `restrictedZoneIds`가 env default보다 우선 적용되는지 확인
- ReEntry
- WrongDirection
- IntrusionAfterLineCrossing
- Loitering
- cleanup
- lost/reacquired
- multichannel separation

## 다채널 검증

기본 다채널:

```bash
./server.sh verify-multichannel
```

VA 포함 다채널:

```bash
./server.sh verify-multichannel --include-va --repeat 2
```

단계별 수동 기준:

- 1채널: 기본 stream/session lifecycle 확인
- 2채널: streamId/channelId state 분리 확인
- 4채널: cleanup과 metrics count 확인
- 8채널 이상: CPU/memory 증가 추세와 queue 상한 확인

확인 기준:

- 같은 trackId가 다른 channel에서 충돌하지 않음
- 한 channel disconnect가 다른 channel에 영향 없음
- active track/scenario/event가 cleanup으로 잘못 삭제되지 않음

## Redaction 검증

Redaction은 개인정보 보호/모자이크 경로의 선택 검증입니다.

```bash
./server.sh verify-redaction
```

통합 테스트에 포함하려면:

```bash
./server.sh test --full
```

확인 기준:

- 대상 객체가 redaction 처리됨
- redaction 실패가 기본 streaming 실패로 이어지지 않음
- VA overlay/rule 경로와 같이 켰을 때 화면이 깨지지 않음

## 외부 접속 검증

서버가 LAN에서 접근 가능해야 할 때는 bind 주소와 출력 URL을 먼저 확인합니다.

```bash
./server.sh urls
./server.sh status
```

외부/LAN 포함 통합 검증:

```bash
./server.sh test --external
```

외부 source URL은 환경별 값으로 주입합니다. 문서에는 개인 IP/credential을 남기지 않습니다.

```bash
MEDIA_SERVER_TEST_EXTERNAL_RTSP_URLS='rtsp://example.local:8554/source' \
  ./server.sh test --external
```

TURN relay/auth는 운영 credential이 필요하므로 별도 검증으로 둡니다.

```bash
MEDIA_SERVER_VERIFY_WEBRTC_EXTERNAL_TURN_SERVER='turn://user:pass@example.local:3478' \
  ./server.sh verify-webrtc-ice
```

## 실패 시 로그 확인

서버 상태:

```bash
./server.sh status
./server.sh diagnose
```

background 로그:

```bash
tail -n 200 .media_server.log
tail -f .media_server.log
```

port listener:

```bash
lsof -nP -iTCP:8080 -sTCP:LISTEN
lsof -nP -iTCP:8554 -sTCP:LISTEN
```

WebRTC 상세 로그:

```bash
MEDIA_SERVER_WEBRTC_TRACE=1 ./server.sh foreground
```

GStreamer plugin:

```bash
gst-inspect-1.0 webrtcbin nicesrc nicesink
gst-inspect-1.0 rtph264pay rtph264depay h264parse
gst-inspect-1.0 uridecodebin
```

Replay 결과 차이는 누락/초과/불일치 이벤트를 먼저 확인합니다.

```bash
./server.sh verify-va-replay
```

## 최신 통과 기준 요약

현재 최신 기준은 Step 32 통합 검증 이후 다음 항목을 통과 대상으로 봅니다.

| 항목 | 기준 |
| --- | --- |
| Release build | GStreamer/ONNX 활성 Release build 성공 |
| 기본 streaming | file/RTSP/WebRTC smoke 통과 |
| 기존 Intrusion | 이벤트 타입/JSON/API/POST 형식 유지 |
| 기존 LineCrossing | 방향 계산과 이벤트 출력 형식 유지 |
| TrackStateManager | Active/Lost/Reacquired/Terminated, ring buffer, trajectory cap, cleanup |
| SceneContextBuilder | ZoneState, dwellTimeMs, LineCrossState, crossing direction 계산 |
| EventManager | dedupe, cooldown, lifecycle, stale state cleanup |
| ScenarioEngine | stream/channel별 instance 분리, saved scenario payload는 env default보다 우선 |
| IntrusionDwell | Candidate -> Observing -> Confirmed -> Cooldown -> Ended |
| 신규 scenarios | ReEntry, WrongDirection, IntrusionAfterLineCrossing, Loitering, ZoneOccupancy replay 통과 |
| TrackHealth | 진단 metadata만 추가, tracking id 생성 방식 유지 |
| Appearance hook | 기본 NoOp, 실제 모델 호출 없음 |
| EventRecord/hook | JSON Lines active/archive query/rotation/recovery, 비파괴 compaction snapshot, snapshot/clip frame evidence recorder 실패가 event emit을 막지 않음 |
| Cleanup | active track/scenario/event를 잘못 삭제하지 않음 |
| 다채널 | 같은 trackId가 다른 channel에서 충돌하지 않음 |

## 과거 이력 링크

날짜별 상세 검증 이력은 [history/verification-history.md](./history/verification-history.md)에 보관합니다.

현재 문서에는 지금 실행할 명령과 최신 통과 기준만 남깁니다. 과거 이력은 삭제하지 않고 history 문서에 누적합니다.
