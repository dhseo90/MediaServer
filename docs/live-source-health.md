# 라이브 입력 상태와 운영자 대응

운영자와 on-call 담당자가 입력 source의 신호 상태를 확인하고 재검증·인계하는 안내입니다.
상태 API, Ops 화면, client의 정제된 상태 요약을 설명합니다. 저장 영상의 health,
재생 gap, 녹화 retention은 이 문서의 대상이 아닙니다.

화면 조작은 [UI 가이드](./ui-guide.md), 구성과 수집 입력은
[설정 참조](./config-reference.md), 실제 복구 준비는
[백업·복구 가이드](./ops-backup-recovery.md)를 함께 확인합니다.
source 수명 구조는 [서버 구조](./media-server-architecture.md),
미해결 작업과 후속 방향은 [backlog](./development-backlog.md)를 따릅니다.

## 조회 범위와 권한

- `GET /ops/api/source-health`: 등록 source 전체의 현재 health snapshot.
- `POST /ops/api/source-health/bulk`: 선택 source 또는 전체 source의 dry-run 재조회.
- 인증 사용 시 Ops가 활성화되어 있고 admin, 또는 `operator` 역할과 `ops:read`
  scope가 필요합니다. viewer/client에는 원문 응답과 bulk 결과를 제공하지 않습니다.
- 조회는 SourceRegistry/PublishedView, 분석 tap, published source, descriptor,
  source restart·egress 통계를 조합합니다. 새 네트워크 연결 시험이나 source 재시작 명령이 아닙니다.

여기서 읽기 전용은 SourceRegistry·PublishedView와 미디어 설정을 변경하지 않는다는 뜻입니다.
snapshot 조회는 warning 집계 메모리를 갱신하며, health GET/bulk는 상태 변화 시 Ops audit
기록을 시도합니다. 자동 recovery, registry mutation, PublishedView write,
EventRecord/Event POST 또는 WebRTC/SSE/WS schema 변경은 수행하지 않습니다.

<a id="operator-runbook-and-reliability-handoff"></a>

## 운영자 점검과 인계

이 절이 source reliability 점검·인계의 기준입니다. 문제가 있는 source를 식별한 뒤,
입력 구성, 현재 신호, 상태 변화, incident 영향, client 노출을 순서대로 대조합니다.

1. **대상 확인:** `/ops/sources`의 채널과 PublishedView 연결을 확인합니다.
   `/ops/api/source-registry/snapshot`에서 sourceId, source kind, canonical source key,
   owner/site/group 문맥을 대조합니다. 내부 key·원본 locator는 운영자 자료로만 취급합니다.
2. **입력 품질 확인:** 채널의 Onboarding 품질과
   `/ops/api/source-registry/onboarding-quality`에서 validation issue,
   duplicate/conflict/missing/ready를 확인합니다. 저장된 입력의 `ready`가 실제
   ONVIF/WHEP/RTSP 장비 연결 성공을 뜻하지는 않습니다.
3. **현재 신호와 이력 확인:** `/ops/dashboard`의 `라이브 소스 상태` 다음 조치에서
   snapshot과 bulk 결과를 확인합니다. 채널의 Reliability Timeline과
   `/ops/api/source-registry/reliability-timeline`을 함께 보고, 아래의 상태·시각 의미로
   frame age, metadata age, reconnect count, warning을 해석합니다.
4. **재검증과 incident 인계:** `retryBody.sourceIds`가 비어 있지 않을 때만
   `operation=retry`로 그 목록을 재조회합니다. `/ops/sources` 변경 이력의
   `소스 상태 변경` 프리셋과 `source:<sourceId>` target을 확인합니다.
   사건과 연관되면 `/ops/events`의 상세와 `/ops/api/events/reviews`에서
   source cause, closure impact, retry candidate, recovery checklist, operator note 연결을 확인합니다.
5. **사용자 영향 확인:** 허용된 view의 `/client/live`, `/client/dashboard`에서
   신호·연결 요약을 확인합니다. `/client/events`도 직접 접근 가능한 경로지만 기본 Client
   내비게이션은 Live/Dashboard입니다. 사용자에게 원본 URL·raw JSON·운영자 복구 조작을 넘기지 않습니다.

Dashboard는 비정상 source 목록으로 `check`를 요청하고, 재검증 버튼은 응답의 retry 목록을
사용합니다. 대상 ID를 생략하면 전체 조회가 되므로, 비정상 목록이 없는 경우까지 항상
선택 조회라고 가정하지 않습니다. 채널의 Reliability Timeline은 health와 audit의 요약이며,
별도의 Live Source Health bulk 작업 패널은 채널 화면에 두지 않습니다.

### 인계할 내용

| 항목 | 확인 자료 | 인계 시 남길 내용 |
| --- | --- | --- |
| source 식별 | registry snapshot, 채널 상세 | sourceId·kind·PublishedView·canonical key·owner 문맥 |
| 입력 품질 | onboarding quality | validation issue, duplicate/conflict/missing, ready 근거와 미확인 실기기 조건 |
| 신호·이력 | health, reliability timeline, audit | 조회 시각·상태·reason·age·reconnect·warning과 확인한 변화 |
| incident 상관관계 | events reviews | source cause, closure impact, correlation signal, audit 연결 |
| 재검증·복구 준비 | bulk 결과, recovery queue 요약 | retry 대상·제외 이유, failed-only recheck, checklist, dry-run 상태, operator note 링크 |
| client 영향 | 허용 view의 health/digest | sourceStatus·connectionStatus·videoFrameStatus·metadataStatus·summaryText·severity·timelineHint |

recovery queue는 기존 review와 source 문맥으로 계산한 읽기 전용 모델입니다.
`ready-not-run`·`blocked-not-run`은 실행 결과가 아니며 영속 복구 작업 큐나 자동 복구를
생성하지 않습니다. Reliability Search의 요약·저장 view 프리셋과 백업 인계 카드 역시
실제 저장형 검색 설정 변경이나 백업·복원 실행과 구분합니다.

구성 수정이 필요하면 별도 change ticket에 대상·영향·백업·복구 절차를 정합니다.
health bulk 자체는 registry를 수정하지 않으므로 registry rollback 대상이 없습니다.
원본 URL, credential, raw 진단 자료는 client 화면이나 공개 인계 기록에 포함하지 않습니다.

## health 상태 해석

현재 분류는 source 비활성 여부, 대응하는 분석 tap, published source 순으로 판단합니다.

| 상태 | 현재 분류와 대표 reason |
| --- | --- |
| `live` | tap의 frame 또는 metadata age가 5,000ms 이하이면 `receiving`. 또는 분석 tap 없이 active published WebRTC source에 video와 egress session이 있음 |
| `connecting` | tap은 있으나 신호가 없거나 published source가 video를 기다리면 `initializing`. video는 있지만 egress session이 없으면 `no-egress-session` |
| `stale` | tap의 관측 가능한 신호가 모두 오래됨. frame age가 있으면 `last-frame-aged`, metadata age만 있으면 `metadata-aged` |
| `offline` | source 비활성은 `disabled`, inactive published source는 `unreachable`, 대응 tap/published source가 없으면 `no-subscriber` |
| `unknown` | 초기·미제공 상태의 `not-checked` 등. bulk의 없는 ID는 `unknown/not-found`로 구분 |

`live`는 모든 영상·metadata·브라우저 재생이 정상이라는 보장이 아닙니다.
frame과 metadata 중 하나만 fresh여도 live일 수 있고 다른 쪽은 warning이 됩니다.
published source의 active/video/egress 조건으로 분류한 live에는 frame age가 없을 수 있습니다.
반대로 `no-subscriber`만으로 장비의 네트워크 장애를 확정하지 않습니다.

별도 `degraded` top-level 상태를 만들지 않고 주의 조건은 `warnings[]`로 표현합니다.
`unknown/not-checked`는 초기값으로 남아 있지만 현재 일반 source 분류는 위 네 상태 중
하나를 선택합니다. UI label이나 이전 설계의 reason을 현재 API가 항상 출력한다고 가정하지 않습니다.

## Ops 응답 필드와 시간

GET 응답 schema는 `media-server.ops.source-health.v1`입니다.
정상 응답의 `ok=true`, `status=source-health`, `generatedAt`,
`summary`, `sourceHealth[]`를 확인합니다.
`summary`에는 `total/live/connecting/stale/offline/unknown` count가 있습니다.
registry 읽기 실패는 `ok=false`와 `error`로 전달되므로 HTTP 200만으로 정상 판정하지 않습니다.

| `sourceHealth[]` 필드 | 의미 |
| --- | --- |
| `sourceId` | 운영자 상관관계 식별자 |
| `status`, `reason` | 현재 분류와 machine-readable 이유 |
| `checkedAt` | snapshot이 만들어진 시각 |
| `lastFrameAgeMs`, `lastMetadataAgeMs` | 대응 분석 tap의 마지막 frame·분석 결과 관측 후 경과 시간. 값이 없으면 `null` |
| `reconnectCount`, `lastReconnectAt` | 프로세스 안에서 기록한 source restart 횟수·최근 시각 |
| `codec.video/profile/width/height/fps` | descriptor·caps와 확인된 frame에서 얻은 영상 정보. 미확인 항목은 `null` |
| `warnings[]` | 상태와 함께 읽는 짧은 경고 token |

`generatedAt`·`checkedAt`은 snapshot 생성 시의 system clock을 ISO-8601 UTC
(`...SS.mmmZ`)로 표시합니다. `lastReconnectAt`도 기록된 Unix ms를 UTC로 변환하며
재연결 기록이 없으면 `null`입니다. 반면 age는 분석 tap의 steady clock 기준 경과
milliseconds이므로 PTS·UTC timestamp·네트워크 왕복 지연으로 해석하지 않습니다.

`reconnectCount`는 기존 SharedStream의 source worker를 다시 시작했을 때 SessionManager가
기록한 값입니다. 새 stream의 최초 시작이나 모든 네트워크 재시도 횟수를 뜻하지 않으며,
registry에 누적 보존되는 값도 아닙니다.

codec 정보는 active SharedStream descriptor 또는 WHIP published descriptor에서 얻습니다.
분석 frame의 크기가 있으면 width/height에 반영합니다. caps의 분수 framerate는 정수로
반올림되므로 `codec.fps`를 이번 실행의 수신 FPS 측정값으로 사용하지 않습니다.

### 경고 해석

- `missing-published-view`, `view-disabled`: source와 사용자 시청 구성을 따로 확인합니다.
- `waiting-video`: active published source가 video를 기다립니다.
- `published-source-ready`와 `no-egress-session`: video descriptor가 있어도
  egress session이 없어 connecting으로 분류했습니다.
- `last-frame-aged`, `metadata-aged`: 다른 신호는 fresh여서 live이지만 해당 신호는 오래됐습니다.
- `high-reconnect`: `reconnectCount >= 3`.
- `repeated-stale`: 같은 source가 동일한 `stale/last-frame-aged` 또는
  `stale/metadata-aged`로 snapshot 생성 시 3회 이상 연속 관측됐습니다.
  reason 변경이나 다른 상태 관측은 이 연속 집계를 초기화합니다.

연속 stale 집계는 프로세스 메모리이며 서버 재시작 시 초기화됩니다.
health 외의 reliability 조회도 같은 builder를 사용할 수 있으므로 3회를 고정된 시간 간격의
독립 측정이나 장애 지속 시간으로 바꾸어 해석하지 않습니다.

## bulk 재조회와 재시도

`POST /ops/api/source-health/bulk`의 응답 schema는
`media-server.ops.source-health.bulk.v1`입니다.

```http
POST /ops/api/source-health/bulk
Content-Type: application/json

{
  "operation": "check",
  "sourceIds": ["sample-h264", "camera-01"]
}
```

`operation`은 `check`(기본값) 또는 `retry`이며 둘 다 현재 snapshot의 dry-run 재조회입니다.
`sourceIds`를 생략하거나 빈 배열로 보내면 전체 source를 대상으로 합니다.
ID는 trim·중복 제거되며, 지원하지 않는 operation은 `ok=false` 오류입니다.

| 응답 | 해석 |
| --- | --- |
| `status=source-health-bulk`, `dryRun=true` | registry 변경·source 재시작 없이 재조회 |
| `results[].ok` | source를 찾아 결과를 만들었는지 여부. 영상 정상 여부와 별개 |
| `results[].healthy` | `status=live`일 때만 true |
| `results[].retryable` | live와 disabled는 false. connecting/stale/offline 등 재조회 대상은 true |
| `results[].health` | 존재하는 source의 위 health 필드 전체 |
| `requestedCount/okCount/failCount` | 선택된 ID와 조회 결과 수 |
| `unhealthyCount/retryableCount` | 존재하는 source 중 비정상·재조회 가능 수 |
| `partialFailure` | 존재하는 ID와 없는 ID가 섞여 `okCount > 0 && failCount > 0`인 경우 |
| `retryPolicy`, `retryBody` | `retryable=true` 행만 담은 재시도 안내·요청 본문 |
| `generatedAt`, `summary` | 생성 시각과 전체 source snapshot 요약. 선택 결과의 count와 혼동하지 않음 |

없는 sourceId는 `ok=false`, `healthy=false`, `reason=not-found`,
`retryable=false`, `checkedAt=null`입니다.
비정상 source가 있다는 이유만으로 `failCount`나 `partialFailure`가 증가하지는 않습니다.
모든 ID가 없을 때는 `partialFailure=false`여도 전체 조회 실패이므로 각 결과를 확인합니다.

`retryBody.sourceIds`가 비어 있으면 재전송하지 않습니다. 빈 배열은 전체 조회 의미이므로
그대로 재전송하면 failed-only 재시도가 되지 않습니다. disabled·not-found는 구성 확인
대상으로 남기고, 나머지 재조회 결과도 실제 복구 성공과 구분합니다.

## 상태 변화와 incident 기록

GET health와 bulk는 프로세스 안에서 직전 source별 `status/reason`을 기억합니다.
첫 관측은 기준선으로 저장하고, 이후 둘 중 하나가 달라지면 다음 Ops audit를 기록하려고 시도합니다.

- `area=channels`, `action=source-health-state-change`, `target=source:<sourceId>`
- `before`: 이전 `status/reason`
- `after`: 현재 `status/reason/checkedAt/warnings`

warning만 바뀐 경우는 별도 상태 변화가 아니며, audit 저장 오류가 health 응답의 실패로
전파되지는 않습니다. 따라서 응답 성공이나 audit 항목 부재로 이력의 완전성을 보장하지 않습니다.
현재 분류와 그 사이에 실제로 관측·보존된 변화만 설명하는 자료입니다.

Reliability Timeline은 현재 health 항목과 source health audit 조회의 최대 200개 전체 결과를
source별로 조합합니다. `healthHistory`의 `current-health` 항목은 새 상태 변화가 아니며,
`statusTransitionCount`도 source의 전체 생애 변화 횟수가 아닙니다.

Dashboard의 incident ID `source-health:<sourceId>:<status>:<reason>`는 UI에서 단서를
검색·공유하기 위한 값입니다. EventRecord ID나 health API schema를 대체하지 않습니다.
`관련 화면`은 source 상태 변경 audit로 이어지며, 같은 source의 원인·EventRecord·로그
단서를 함께 확인한 뒤 필요할 때 retry 목록을 사용합니다.

## client에 제공하는 상태

client는 허용된 PublishedView의 상태만 받습니다. Ops의 source 전체 목록·warning·audit를
그대로 복사하지 않습니다. view 설정과 `metadata:read` 권한에 따라 metadata 관측이
제외될 수 있고 published-source 전용 분류 경로도 다르므로 Ops와 결과가 항상 같지는 않습니다.

- view 식별: `viewId`.
- dashboard health: `live`, `status`, `summary`, `warningLevel`, `connectionStatus`,
  `videoFrameStatus`, `metadataStatus`, `stale`, `lastFrameAgeMs`, `metadataAgeMs`.
- source status digest(`media-server.client.source-status-digest.v1`):
  `sourceStatus`, `connectionStatus`, `videoFrameStatus`, `metadataStatus`, `summaryText`,
  `severity`, `timelineHint`, `lastFrameAgeMs`, `metadataAgeMs`.

`rtspUrl/httpUrl/whepUrl/webrtcSourceId`, ONVIF endpoint/profile token/credential reference,
원본 locator, raw source lifecycle JSON, auth/debug 세부, 운영자 note·복구 조작은 노출하지 않습니다.
이 경계의 위반은 단순 표시 차이가 아니라 별도 수정·검증이 필요한 문제입니다.

## 확인 명령과 실행 경계

문서와 직접 소비자만 확인할 때:

```bash
git diff --check -- docs/live-source-health.md
./server.sh verify-docs-links
./server.sh verify-ops-source-health-bulk
./server.sh verify-v330-operator-runbook-reliability-handoff
```

관련 화면·audit 구현을 바꾼 경우에는 `verify-ops-root-cause-panel`,
`verify-client-dashboard-polish`, `verify-ops-audit-trail` 정적 검사를 영향에 맞게 선택합니다.
제품 변경의 build와 승인된 `verify-ops-client-ui --screenshots`는 별도 범위입니다.

`./server.sh verify-ops-source-lifecycle`는 실제 session 생성·해제와 idle 정리를 검사합니다.
기본 `http://127.0.0.1:8081`이 응답하지 않으면 임시 auth-off 서버를 자동 시작하며,
`--auto-start=0 --http-base <격리 서버 주소>`로 기존 승인 서버만 사용하도록 제한할 수 있습니다.
`--random-ports=1`은 자동 시작 때 명시하지 않은 HTTP/RTSP 포트만 선택합니다.
이미 응답하는 서버의 소유권이나 격리를 보장하는 옵션은 아닙니다.

자동 시작 경로는 `MEDIA_SERVER_SKIP_LOCAL_ENV=1`, 임시 registry/users 파일,
`MEDIA_SERVER_FORCE_RTSP_TCP=1`을 설정하지만 상속 환경 전체를 격리하지는 않습니다.
실행 전에 운영 저장소·녹화 root를 참조하지 않는지 확인하고, 종료 후 소유 프로세스·포트·
상태 경로 정리를 확인합니다. 운영 서버에 이 smoke를 그대로 실행하지 않습니다.

runtime·실기기 field smoke·30분/120분은 [검증 정책](./stream-verification.md#검증-정책),
실제 화면은 [UI 풀테스트 기준](./manual-ui-fulltest.md),
공개·릴리즈 판정은 [릴리즈 정책](./release-policy.md)을 따르며 문서·정적 검사와 구분합니다.
