# Live Source Health

이 문서는 현재 source tree 기준의 live source health 1차 구현 기준과
운영자/client 노출 경계를 정의합니다.
목표는 `/ops/dashboard`, source health API, client dashboard가 같은 상태 의미를
공유하되 노출 범위를 다르게 유지하는 것입니다.

관련 기준:

- [Development Backlog](./development-backlog.md)
- [Media Server Architecture](./media-server-architecture.md)
- [UI Guide](./ui-guide.md)

## 목차

| 섹션 | 내용 |
| --- | --- |
| [범위](#범위) | 포함/비범위 |
| [1차 구현 상태](#1차-구현-상태) | 현재 구현 상태 |
| [상태 모델](#상태-모델) | health 상태 |
| [Ops Health Fields](#ops-health-fields) | 운영자 노출 field |
| [Client Sanitized Health](#client-sanitized-health) | client 노출 field |
| [Operator Diagnostics](#operator-diagnostics) | 운영 진단 |
| [Source Health Incident Workflow](#source-health-incident-workflow) | incident workflow |
| [Source Health Audit](#source-health-audit) | audit |
| [Verification Plan](#verification-plan) | 검증 계획 |

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

운영자 next action:

- `/ops/dashboard`의 `라이브 소스 상태` 다음 조치는 현재 source health snapshot을
  다시 읽고, 비정상 sourceId만 `/ops/api/source-health/bulk` `check`로 dry-run
  재검증합니다.
- 응답의 `retryBody.sourceIds`는 `retryable=true` 행만 포함합니다. Dashboard의
  재검증 버튼은 이 목록만 `operation=retry`로 다시 보내므로 정상 source와
  재시도 불가 source를 건드리지 않습니다.
- source health bulk는 SourceRegistry/PublishedView를 변경하지 않는 dry-run입니다.
  따라서 rollback 대상은 없으며, bulk channel mutation의 partial rollback 계약과
  분리합니다.
- 상태 변화 이력은 `/ops/sources` 변경 이력의 `Source Health 변경` 프리셋으로
  확인합니다.

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

## Source Health Incident Workflow

`/ops/dashboard`의 `최근 인시던트 흐름`은 source health 단서를
`source-health:<sourceId>:<status>:<reason>` 형태의 클라이언트 측
incident ID로 묶어 표시합니다. 이 값은 운영자가 같은 source의 root-cause,
EventRecord, log tail 단서를 검색/공유하기 위한 UI 식별자이며
`/ops/api/source-health` 또는 `/ops/api/source-health/bulk` schema를
변경하지 않습니다.

Source Health 인시던트 항목의 `관련 화면`은 `/ops/sources` 변경 이력의
`Source Health 변경` preset과 `source:<sourceId>` target으로 이어집니다.
운영자는 같은 source incident에서 상태 변화 audit을 먼저 확인한 뒤,
Dashboard의 bulk 결과가 제공하는 `retryBody.sourceIds`만 다시 보내
retryable-only 재검증을 수행합니다. source health bulk는 dry-run이므로
registry rollback 대상은 없고, partial failure는 실패 source만 구성 수정
대상으로 남깁니다.

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

## Operator Runbook and Reliability Handoff

독자: 운영자, on-call, release handoff reviewer.
Lifecycle: v3.3.0 Live Source Reliability Workspace 동안 유지되는 운영 runbook입니다.
Source-of-truth: 이 섹션은 source reliability workspace 사용 흐름의 기준이고,
[UI Guide](./ui-guide.md)는 화면 위치와 조작 순서, [Config Reference](./config-reference.md)는
env와 bundle 수집 기준, [Ops Backup / Recovery Guide](./ops-backup-recovery.md)는
복구 입력 경계만 보조로 설명합니다.

### Runbook quick path

1. `/ops/sources`에서 Source Registry Snapshot and Identity를 확인합니다.
   sourceId, source kind, PublishedView 연결, canonical source key, owner/site/group
   context가 같은 source를 가리키는지 확인합니다.
2. Source Onboarding Quality Summary에서 저장 전 validation, 중복, 충돌, 누락, ready 상태를 확인합니다.
   ONVIF/WHEP/RTSP 입력 품질이 `ready`가 아니면 registry를 바로 고치기 전에
   validation issue와 field evidence 조건을 분리합니다.
3. Reliability Timeline and Health History에서 live/stale/offline/reconnect 변화와 Ops audit handoff를 확인합니다.
   같은 source의 상태 변화가 반복되면 `source-health-state-change` audit,
   last frame age, metadata age, reconnect count를 함께 기록합니다.
4. `/ops/events`에서 Incident-to-Source Correlation Layer와 Operator Recheck and Recovery Queue를 함께 확인합니다.
   source 원인/context, closure impact, failed-only recheck, retry candidate,
   recovery checklist, dry-run 결과, operator note link를 같은 incident ticket에 묶습니다.
5. `/client/live`, `/client/dashboard`, `/client/events`에서 viewer-safe Source Status Digest만 노출되는지 확인합니다.
   viewer에게 source URL, raw locator, raw JSON, debug material, credential,
   operator note, recovery/action control이 보이면 release blocker로 분리합니다.

### Handoff checklist

| 항목 | 확인 위치 | handoff에 남길 내용 | 완료로 보지 않는 것 |
| --- | --- | --- | --- |
| source registry snapshot | `/ops/api/source-registry/snapshot`, `/ops/sources` | sourceId/source kind/PublishedView/canonical key/owner context | source registry write 완료 |
| onboarding quality summary | `/ops/api/source-registry/onboarding-quality`, `/ops/sources` | validation issue, duplicate/conflict/missing/ready, input quality | 실기기 field success |
| reliability timeline | `/ops/api/source-registry/reliability-timeline`, `/ops/sources` | live/stale/offline/reconnect 변화, audit target, 반복 stale 여부 | 장시간 안정화 PASS |
| incident-to-source correlation | `/ops/api/events/reviews`, `/ops/events` | source cause, closure impact, source handoff, correlation signal | EventRecord/Event POST schema 변경 |
| operator recheck recovery queue | `/ops/api/events/reviews`, `/ops/events` | failed-only recheck, retry candidate, recovery checklist, dry-run result, operator note link | persistent recovery queue write, 자동 recovery |
| client-safe source status digest | `/client/live`, `/client/dashboard`, `/client/events` | sourceStatus, connectionStatus, videoFrameStatus, metadataStatus, summaryText, severity, timelineHint | source URL/raw locator/raw JSON/debug/credential/operator material 노출 |

### Boundary and rollback

자동 recovery, 자동 registry mutation, PublishedView write, EventRecord/Event POST schema 변경은 이 runbook 범위가 아닙니다.
runbook 확인 중 source registry나 PublishedView를 수정해야 한다고 판단되면
별도 change ticket과 백업/복구 절차로 분리합니다.

- 이 runbook은 UI 풀테스트 PASS가 아닙니다.
- 이 runbook은 30분/120분 장시간 안정화 PASS가 아닙니다.
- 이 runbook은 GitHub Release publish 또는 published metadata PASS가 아닙니다.
- 이 runbook은 real ONVIF/WHEP/TURN/cloud field smoke PASS가 아닙니다.
- 이 runbook은 Source Reliability Search and Metrics 완료가 아닙니다.
- 이 runbook은 Ops Backup and Recovery Source Handoff 완료가 아닙니다.

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
