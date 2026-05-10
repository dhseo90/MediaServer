# Live Source Health

이 문서는 v1.1.0-beta.1의 live source health 1차 구현 기준을 정의합니다.
목표는 `/ops/sources`, `/ops/dashboard`, client dashboard가 같은 상태 의미를
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
- `/ops/sources` row/detail health 표시
- `/ops/dashboard` source lifecycle 요약과 같은 상태 의미 사용
- client dashboard sanitized health 표현
- bulk health check 또는 source validation smoke 설계

비범위:

- 저장 영상 health
- playback gap 분석
- 장기 recording retention 상태
- client/viewer에 source URL, ONVIF endpoint, raw diagnostic JSON 노출
- RTSP/WebRTC media path 변경

## 1차 구현 상태

구현 완료:

- `GET /ops/api/source-health`
- `/ops/sources` Live Source Health 요약, row badge, detail health panel
- `/ops/dashboard` 문제 원인 패널의 source health 요약과 Dashboard 이동 흐름
- client dashboard/live detail의 sanitized health summary
- `SessionManager` source restart 기반 `reconnectCount`, `lastReconnectAt` 연동
- `verify-ops-root-cause-panel`, `verify-client-dashboard-polish`,
  `verify-ops-source-lifecycle`, `verify-ops-client-ui --screenshots` smoke 기준

후속 예정:

- codec profile/fps 추출
- bulk health check 서버 계약과 partial failure retry 정책

## 상태 모델

운영자용 source health는 다음 상태 중 하나로 요약합니다.

| 상태 | 의미 | 대표 이유 |
| --- | --- | --- |
| `live` | 최근 frame 또는 metadata가 stale 기준 안에 있음 | `receiving` |
| `connecting` | source/session 생성 또는 재연결 중 | `initializing`, `retrying` |
| `stale` | 마지막 frame age가 stale 기준을 넘음 | `last-frame-aged`, `metadata-aged` |
| `offline` | source 도달 실패 또는 구성이 비활성 | `unreachable`, `disabled`, `no-subscriber` |
| `unknown` | 아직 health check가 실행되지 않음 | `not-checked` |

`degraded` 같은 중간 상태는 1차 초안에서 별도 top-level 상태로 만들지 않습니다.
codec mismatch, high reconnect, metadata delay 같은 조건은 `warnings[]`로 표시해
상태 수를 늘리지 않습니다.

## Ops Health Fields

`/ops/sources`와 `/ops/dashboard`에서 공유하는 1차 field:

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
        "video": null,
        "profile": null,
        "width": 1920,
        "height": 1080,
        "fps": null
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
- `codec`은 확인된 값만 넣고 추정값은 넣지 않습니다.
- `warnings[]`는 operator action을 돕는 짧은 machine-readable token으로 둡니다.

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

## `/ops/sources` UI Draft

목록 row:

- source display name 옆에 `live`, `connecting`, `stale`, `offline`, `unknown` badge
- last frame age와 reconnect count를 짧게 표시
- codec summary는 `H264 1080p30`처럼 한 줄로 축약
- raw JSON은 표시하지 않음

detail panel:

- 최근 check 시각
- last frame/metadata age
- stale/offline reason
- reconnect count와 마지막 reconnect 시각
- codec/profile summary
- 다음 조치 버튼:
  - source 재검증
  - registry diff 확인
  - dashboard 원인 패널로 이동
  - log correlation filter

bulk check:

- 선택 source 또는 전체 source를 대상으로 dry-run check 실행
- source별 `status`, `reason`, `checkedAt`, `warnings[]`를 반환
- partial failure는 실패 source만 재시도 가능해야 함
- viewer/client에는 bulk result를 노출하지 않음

## Verification Plan

문서/초안 단계:

```bash
git diff --check -- README.md docs
./server.sh verify-docs-links
```

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
