# v3.0.0 Retention/Pin/Cleanup

Lifecycle: v3.0.0 `V300-S09 Retention/Pin/Cleanup` active release target 동안 유지합니다.
Source of truth: `docs/development-backlog.md`의 V300-S09 행과 이 문서입니다.

이 문서는 Event Evidence Search MVP의 retention cleanup 계약을 정의합니다. S09는
EventRecord, EvidenceManifest, FeatureSet revision, SearchIndex entry를 하나의
lifecycle 단위로 다루며, 운영 파일을 실제 삭제하는 destructive cleanup 실행
evidence가 아닙니다.

## Contract

Schema:

```text
media-server.v300-retention-cleanup-report.v1
```

Policy:

- `defaultRetentionDays`: 7
- `pinnedExcludesAutomaticCleanup`: true
- source/rule override는 허용합니다.
- cleanup dry-run은 destructive apply 전에 필요합니다.
- lifecycle delete는 EventRecord, EvidenceManifest, FeatureSet revision,
  SearchIndex entry를 같은 action으로 묶습니다.
- audit trail은 `retention-cleanup-dry-run`과 `retention-cleanup-apply`를 분리합니다.

## Fixture Cases

| Case | Expected behavior |
| --- | --- |
| `default-seven-day-expired-candidate` | 기본 7일 window를 넘은 non-pinned event는 dry-run에서 `would-delete` 후보가 됩니다. |
| `pinned-event-excluded-from-cleanup` | pinned event는 만료됐더라도 automatic cleanup에서 `retain-pinned`로 남습니다. |
| `source-and-rule-retention-override` | source/rule override가 기본 7일보다 우선하는 retention window를 제공합니다. |
| `apply-lifecycle-delete-and-deindex` | apply mode는 EventRecord/EvidenceManifest/FeatureSet/SearchIndex lifecycle delete/de-index 카운트를 함께 남깁니다. |
| `cleanup-audit-trail` | dry-run/apply mode는 audit action을 분리하고 summary audit entry를 남깁니다. |

## Boundaries

- raw prompt/response/provider request body를 보존하지 않습니다.
- Event POST payload schema, WebRTC DataChannel schema, SSE/WS metadata schema,
  RTSP/WebRTC media path를 바꾸지 않습니다.
- `/ops/events` UI에 이미 표시되는 retention status를 대체하지 않으며, S09 verifier
  PASS는 UI 풀테스트 직접 조작 PASS가 아닙니다.
- destructive 운영 cleanup 실행 evidence가 아님. 30분/120분 longrun, published metadata,
  tag/push, GitHub Release evidence도 아닙니다.

## Verification

```bash
./server.sh verify-v300-retention-pin-cleanup
./server.sh verify-analysis-state
```

`verify-v300-retention-pin-cleanup`은 fixture, C++ cleanup contract, analysis smoke,
roadmap, stream verification, feature inventory, release records, server dispatch
연결을 정적으로 확인합니다. `verify-analysis-state`는 S09 dry-run, pin exclusion,
apply lifecycle delete/de-index, audit, provider/schema/media/viewer boundary를
mock data로 확인합니다.
