# Live Source Health

이 문서는 v1.1.0-beta.1의 live source health 1차 구현 기준과
선수 로드맵 3/6 close-out 상태를 정의합니다.
목표는 `/ops/dashboard`, source health API, client dashboard가 같은 상태 의미를
공유하되 노출 범위를 다르게 유지하는 것입니다.

관련 기준:

- [v1.1.0 Roadmap](./v1.1.0-roadmap.md)
- [Media Server Architecture](./media-server-architecture.md)
- [UI Guide](./ui-guide.md)

## 범위

포함:

- source reachability 상태
- last frame age
- reconnect count
- stale/offline reason
- codec/profile summary
- `/ops/dashboard` source lifecycle 요약과 같은 상태 의미 사용
- client dashboard sanitized health 표현
- source validation smoke와 bulk API 계약

비범위:

- 저장 영상 health
- playback gap 분석
- 장기 recording retention 상태
- client/viewer에 source URL, ONVIF endpoint, raw diagnostic JSON 노출
- RTSP/WebRTC media path 변경

## 1차 구현 상태

상태:

- `완료`: 2026-05-12 순차 close-out 기준으로 선수 로드맵 3/6을 닫았습니다.
- RC 잔여 범위는 source health API/UI/client sanitized state smoke 유지 여부입니다.
- 새 top-level health 상태 모델, client raw diagnostic 노출, RTSP/WebRTC media
  path 변경은 RC 범위가 아닙니다.

구현 완료:

- `GET /ops/api/source-health`
- `POST /ops/api/source-health/bulk`
- `/ops/dashboard` 문제 원인 패널의 source health 요약과 Dashboard 이동 흐름
- client dashboard/live detail의 sanitized health summary
- `SessionManager` source restart 기반 `reconnectCount`, `lastReconnectAt` 연동
- active stream descriptor와 WHIP published descriptor 기반 codec/profile/width/height/fps 연동
- source health bulk API의 partial failure와 failed-only retry 계약
- source health 상태 변화의 짧은 Ops audit trail 기록
- `verify-ops-source-lifecycle` auto-start/settle/port cleanup/port randomization 전제 자동화
- `verify-ops-root-cause-panel`, `verify-client-dashboard-polish`,
  `verify-ops-source-lifecycle`, `verify-ops-source-health-bulk`,
  `verify-ops-audit-trail`,
  `verify-ops-client-ui --screenshots` smoke 기준

후속 예정:

- 없음

## 상태 모델

운영자용 source health는 다음 상태 중 하나로 요약합니다.

| 상태 | 의미 | 대표 이유 |
| --- | --- | --- |
| `live` | 최근 frame 또는 metadata가 stale 기준 안에 있음 | `receiving` |
| `connecting` | source/session 생성 또는 재연결 중 | `initializing`, `retrying`, `no-egress-session` |
| `stale` | 마지막 frame age가 stale 기준을 넘음 | `last-frame-aged`, `metadata-aged` |
| `offline` | source 도달 실패 또는 구성이 비활성 | `unreachable`, `disabled`, `no-subscriber` |
| `unknown` | 아직 health check가 실행되지 않음 | `not-checked` |

`degraded` 같은 중간 상태는 1차 초안에서 별도 top-level 상태로 만들지 않습니다.
codec mismatch, high reconnect, metadata delay 같은 조건은 `warnings[]`로 표시해
상태 수를 늘리지 않습니다.

## Ops Health Fields

`/ops/api/source-health`와 `/ops/dashboard`에서 공유하는 1차 field:

```json
{
  "ok": true,
  "schema": "media-server.ops.source-health.v1",
  "status": "source-health",
  "generatedAt": "fixture-time",
  "summary": {
    "total": 3,
    "live": 1,
    "connecting": 0,
    "stale": 0,
    "offline": 2,
    "unknown": 0
  },
  "sourceHealth": [
    {
      "sourceId": "sample-h264",
      "status": "live",
      "reason": "receiving",
      "checkedAt": "fixture-time",
      "lastFrameAgeMs": 320,
      "lastMetadataAgeMs": 480,
      "reconnectCount": 0,
      "lastReconnectAt": null,
      "codec": {
        "video": "h264",
        "profile": "high",
        "width": 1920,
        "height": 1080,
        "fps": 30
      },
      "warnings": []
    }
  ]
}
```

필드 원칙:

- `sourceId`는 operator용 상관관계 확인에 사용합니다.
- `checkedAt`, `lastReconnectAt`은 구현 시 ISO-8601 UTC를 권장합니다.
- `lastFrameAgeMs`와 `lastMetadataAgeMs`는 값이 없으면 `null`로 둡니다.
- `reconnectCount`는 `SessionManager`의 프로세스 runtime source restart 기준이며
  registry 누적 값과 섞지 않습니다.
- `codec`은 active `SharedStream` descriptor 또는 WHIP published descriptor에서
  확인된 값만 넣고 추정값은 넣지 않습니다.
- `warnings[]`는 operator action을 돕는 짧은 machine-readable token으로 둡니다.
- Published WebRTC source가 video descriptor를 가진 채 active여도 실제 egress
  session이 없으면 `connecting/no-egress-session`으로 판단하고
  `published-source-ready`, `no-egress-session` warning을 표시합니다.
- `reconnectCount >= 3`이면 `high-reconnect` warning을 표시합니다.
- 같은 source가 `stale/last-frame-aged` 또는 `stale/metadata-aged`로 3회 연속
  관측되면 `repeated-stale` warning을 표시합니다. 이 기준은 프로세스
  runtime 메모리 기준이며 서버 재시작 후 초기화됩니다.

## Client Sanitized Health

client dashboard/live monitor는 같은 상태 의미를 쓰되 원본 locator와 진단 세부를
숨깁니다.

허용:

- `viewId`
- `status`
- `summary`
- `warningLevel`
- `connectionStatus`
- `videoFrameStatus`
- `metadataStatus`
- `stale`
- `lastFrameAgeMs`
- `metadataAgeMs`

금지:

- `rtspUrl`, `httpUrl`, `whepUrl`, `webrtcSourceId`
- ONVIF endpoint, profile token, credential reference
- raw source lifecycle JSON
- reconnect target URL 또는 auth/debug 세부

## Operator Diagnostics

`/ops/sources`는 채널 목록과 상세/URL copy/변경 이력 화면입니다.
source health는 `/ops/dashboard`의 문제 원인/운영 요약과 아래 API로 확인합니다.
채널 화면 안에 별도 Live Source Health panel/table/detail 또는 bulk 작업 패널을
두지 않습니다.

bulk API:

- 선택 source 또는 전체 source를 대상으로 dry-run check 실행
- source별 `status`, `reason`, `checkedAt`, `warnings[]`를 반환
- partial failure는 실패 source만 재시도 가능해야 함
- viewer/client에는 bulk result를 노출하지 않음

서버 계약:

```http
POST /ops/api/source-health/bulk
Content-Type: application/json

{
  "operation": "check",
  "sourceIds": ["sample-h264", "camera-01"]
}
```

응답 schema는 `media-server.ops.source-health.bulk.v1`입니다.
`sourceIds`를 생략하면 전체 source를 확인합니다.
`operation`은 `check` 또는 `retry`이며 서버 동작은 dry-run health 재조회입니다.
실패/비정상 항목은 `results[].retryable=true`로 표시되고,
운영 진단 workflow는 `retryBody`의 sourceIds만 다시 보내 partial retry를 수행할
수 있습니다.
없는 sourceId는 `ok=false`, `reason=not-found`, `retryable=false`로 남겨
구성 수정 대상과 단순 재시도 대상을 분리합니다.
`partialFailure=true`는 일부 sourceId만 실패했음을 의미합니다.

## Source Health Audit

`GET /ops/api/source-health`와 `POST /ops/api/source-health/bulk`는
서버 프로세스 안에서 직전 source별 `status/reason`을 기억합니다.
같은 source의 상태가 바뀌면 Ops audit에 다음 형태의 짧은 기록을 남깁니다.

- `area`: `channels`
- `action`: `source-health-state-change`
- `target`: `source:<sourceId>`
- `before`: 이전 `status`, `reason`
- `after`: 현재 `status`, `reason`, `checkedAt`, `warnings`

초기 관측값은 기준선으로만 저장하고 audit entry를 만들지 않습니다.
따라서 audit trail은 noise를 줄이고 실제 상태 변화만 보여줍니다.
`/ops/sources`의 채널 변경 이력 패널은 `Source Health 변경` 프리셋으로
`source-health-state-change` action만 빠르게 필터링할 수 있습니다.
client/viewer 응답에는 audit 세부를 노출하지 않습니다.

## Verification Plan

문서/초안 단계:

```bash
git diff --check -- README.md docs
./server.sh verify-docs-links
./server.sh verify-ops-source-health-bulk
./server.sh verify-ops-audit-trail
```

`verify-ops-source-lifecycle`는 기본적으로 `http://127.0.0.1:8081` 서버가
없으면 임시 auth-off 서버를 자동 시작합니다. 자동 시작 서버는
`MEDIA_SERVER_SKIP_LOCAL_ENV=1`, 임시 source registry/users file,
`MEDIA_SERVER_FORCE_RTSP_TCP=1`을 사용하고 검증이 끝나면 종료합니다.
이미 실행 중인 서버를 지정하려면 `--http-base`를 사용하고,
자동 시작을 끄려면 `--auto-start=0`을 사용합니다.
고정 포트 충돌을 피해야 하면 `--random-ports=1`을 함께 사용합니다.
이 옵션은 `--http-base`나 `--rtsp-port`로 명시하지 않은 포트만 임시 free port로
할당합니다.

구현 단계 후보:

```bash
./server.sh build
./server.sh verify-ops-client-ui
./server.sh verify-ops-source-lifecycle
```

UI screenshot 확인이 필요한 경우:

```bash
./server.sh verify-ops-client-ui --screenshots
```
