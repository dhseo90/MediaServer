# Ops Backup / Recovery Guide

이 문서는 운영자가 auth store, registry, sample/model 파일, audit/event 기록을
백업하고 복구할 때 따르는 기준입니다. 장기 영상 녹화 백업 절차가 아니라,
제품 설정과 EventRecord 기반 짧은 증거 기록을 보존하는 절차입니다.

## 백업 대상

| 범위 | 기본 경로/env | 백업 기준 |
| --- | --- | --- |
| Auth store | `MEDIA_SERVER_AUTH_USERS_FILE`, `.media_server.users.json` | 계정, invite, access request, password hash/history 포함. 원본 권한은 `0600` 유지 |
| Source registry | `MEDIA_SERVER_SOURCE_REGISTRY`, `.media_server.sources.json` | 채널 source와 locator 설정입니다. |
| PublishedView registry | `MEDIA_SERVER_PUBLISHED_VIEWS`, `.media_server.views.json` | client 노출 view와 scope 연결 기준입니다. |
| Analysis registry | `MEDIA_SERVER_ANALYSIS_REGISTRY`, `.media_server.analysis_registry.json` | profile/rule/VA 설정입니다. |
| Ops audit | `.media_server.ops_audit.jsonl`, `MEDIA_SERVER_OPS_AUDIT_RETENTION_DAYS` | 채널/룰/사용자/evidence export 변경 이력입니다. |
| EventRecord | `MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_PATH`, `.media_server.va_events.jsonl*` | active JSON Lines와 rotated archive를 함께 보관합니다. |
| Evidence media | `MEDIA_SERVER_ANALYSIS_EVENT_SNAPSHOT_DIR`, `MEDIA_SERVER_ANALYSIS_EVENT_CLIP_DIR` | snapshot 파일, clip manifest, frame bundle을 포함합니다. |
| Sample/model assets | `MEDIA_SERVER_FILE_ROOT`, `MEDIA_SERVER_ANALYSIS_MODEL`, `MEDIA_SERVER_ANALYSIS_LABELS` | sample video, YOLO model, label 파일 보관 |
| Config preset/env | `config/presets/*.env.example`, 운영 env 파일 | token/secret은 secret vault에 보관. 백업 bundle에는 redacted summary만 포함 |

`./server.sh ops-bundle --http-base http://127.0.0.1:8080`은 상태 공유용
진단 bundle입니다. Auth users file 본문과 plaintext secret은 넣지 않으므로,
복구용 백업과 진단 bundle을 혼동하지 않습니다.

임시 디렉터리 기반 dry-run 리허설은 다음 명령으로 수행합니다.

```bash
./server.sh verify-ops-backup-restore-dry-run
```

이 명령은 fixture runtime을 만들고 auth store, source/view/analysis registry,
audit JSON Lines, EventRecord active/archive, snapshot/clip evidence,
sample/model/label asset, redacted env summary를 백업한 뒤 다른 runtime
디렉터리에 복원합니다. `manifest.json`, `SHA256SUMS`,
`restore-validation-plan.md`를 생성하고 checksum과 auth store `0600` 권한이
유지되는지 확인합니다. 실제 운영 runtime을 수정하지 않는 리허설이며,
실제 백업본 생성과 외부 보관을 대체하지는 않습니다.

Evidence 보존 기간 정리는 백업과 별도 운영 job으로 처리합니다.
기본은 dry-run이고 `--apply`를 붙여야 삭제됩니다.

```bash
./server.sh ops-evidence-cleanup \
  --http-base http://127.0.0.1:8080 \
  --max-age-days 30 \
  --keep-compactions 10 \
  --report-file /tmp/media_server_evidence_cleanup.json
```

적용 모드에서 `--http-base`를 지정하면 Ops audit에 `retention-cleanup`
기록을 남깁니다. HTTP audit을 사용할 수 없는 환경에서는 `--audit-file`로
동일 payload를 파일에 보존합니다.

## 백업 절차

1. 유지보수 창을 잡고 운영 UI에서 채널 저장, 룰 저장, 사용자 변경을 멈춥니다.
2. 가능하면 `./server.sh stop`으로 쓰기 중인 프로세스를 멈춥니다.
3. `./server.sh ops-bundle --http-base http://127.0.0.1:8080`으로 복구 전 상태와 로그 요약을 남깁니다.
4. 위 표의 파일과 디렉터리를 같은 backup root 아래에 복사합니다. Auth store는 `0600`, registry와 EventRecord는 원본 owner/group을 유지합니다.
5. `shasum -a 256` 또는 운영 표준 도구로 manifest를 만들고 backup root에 같이 저장합니다.
6. 백업 manifest, ops bundle, redacted env summary를 같은 change ticket에 연결합니다.
7. 외부 보관소로 이동할 때 model/sample/evidence 파일의 개인정보 보존 정책을 확인합니다.

권장 backup root 예시:

```text
backup-YYYYMMDD-HHMM/
  config/
  registry/
  auth/
  audit/
  events/
  evidence/
  media-assets/
  ops-bundle/
  SHA256SUMS
```

## 복구 절차

1. 대상 서버의 media server를 중지합니다.
2. 새 runtime directory 또는 staging directory에 백업 파일을 먼저 복원합니다.
3. Auth store 권한을 `0600`으로 맞추고, 운영 사용자만 읽을 수 있는지 확인합니다.
4. 운영 env에서 다음 경로를 복원 위치로 지정합니다.
   - `MEDIA_SERVER_AUTH_USERS_FILE`
   - `MEDIA_SERVER_SOURCE_REGISTRY`
   - `MEDIA_SERVER_PUBLISHED_VIEWS`
   - `MEDIA_SERVER_ANALYSIS_REGISTRY`
   - `MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_PATH`
   - `MEDIA_SERVER_ANALYSIS_EVENT_SNAPSHOT_DIR`
   - `MEDIA_SERVER_ANALYSIS_EVENT_CLIP_DIR`
   - `MEDIA_SERVER_FILE_ROOT`
   - `MEDIA_SERVER_ANALYSIS_MODEL`
   - `MEDIA_SERVER_ANALYSIS_LABELS`
5. `./server.sh build` 후 `./server.sh diagnose`로 경로, 권한, asset 접근성을 확인합니다.
6. 계정은 직접 JSON을 수정하지 않고 `./server.sh auth-user list`로 읽기 검증부터 수행합니다.
7. 서버를 staging 포트로 기동해 `/health`, `/auth/whoami`, `/ops/home`, `/client/live` 접근을 확인합니다.
8. 복구 검증이 끝나기 전에는 외부 viewer와 integrator traffic을 붙이지 않습니다.

복구 후 최소 검증:

```bash
./server.sh verify-auth-bootstrap
./server.sh verify-auth-users
./server.sh verify-auth-routes
./server.sh verify-ops-route-boundaries
./server.sh verify-ops-rule-relationships --http-base http://127.0.0.1:8080
./server.sh verify-ops-event-records-scope --http-base http://127.0.0.1:8080
./server.sh verify-ops-audit-persistence
./server.sh verify-ops-diagnostics-bundle
./server.sh verify-ops-backup-restore-dry-run
./server.sh verify-ops-evidence-retention-cleanup
```

EventRecord storage나 snapshot/clip hook을 운영에서 꺼 둔 환경은
`verify-ops-event-records-scope` 대신 해당 env가 비활성인 것을 change ticket에
기록합니다. UI까지 확인하는 복구 리허설에서는
`verify-ops-client-ui`, `verify-ops-click-e2e`, `verify-ops-tables-layout`도 같이
실행합니다.

## Source reliability handoff

Source reliability handoff는 복구용 백업 완료 evidence가 아니라 operator handoff 입력입니다.
운영자는 [Operator Runbook and Reliability Handoff](./live-source-health.md#operator-runbook-and-reliability-handoff)의
checklist를 따라 source registry snapshot, onboarding quality, reliability timeline,
incident-to-source correlation, operator recheck recovery queue, client-safe digest를
같은 change ticket에 연결합니다.

이 handoff는 복구 후보를 좁히는 입력이며, 실제 registry 복원, PublishedView 복원,
source health snapshot 보존, recovery validation plan까지 완료했다는 뜻은 아닙니다.
Ops Backup and Recovery Source Handoff는 별도 roadmap step evidence가 있어야 완료로 기록합니다.

## Ops Backup and Recovery Source Handoff

독자: 운영자, on-call, backup/recovery reviewer.
Lifecycle: v3.3.0 Step 10 Ops Backup and Recovery Source Handoff의 source-of-truth입니다.
이 절은 source reliability workspace 결과를 복구 handoff ticket에 묶는 기준이며,
실제 운영 백업 생성, production restore cutover, 자동 recovery 완료 evidence가 아닙니다.

검증 route:

```text
/ops/api/source-registry/backup-recovery-handoff
```

handoff bundle에 연결할 입력:

| 입력 | 확인 위치 | handoff에 남길 내용 | 완료로 보지 않는 것 |
| --- | --- | --- | --- |
| source registry snapshot | `/ops/api/source-registry/snapshot`, `/ops/sources` | sourceId, source kind, canonical source key, owner/site/group context, enabled state | source registry write, restore 적용 |
| PublishedView registry | `/ops/api/views`, `/ops/sources` | viewId, sourceId 연결, dashboard/events flag, allowed rules/overlays, client group, maxTiles | PublishedView write, viewer scope 자동 승인 |
| source health snapshot | `/ops/api/source-health`, `/ops/sources` | live/connecting/stale/offline count, reconnect count, warnings, generatedAt | source health snapshot 파일 보존, 장시간 안정화 PASS |
| recovery validation plan | `/ops/api/source-registry/backup-recovery-handoff` | registry restore validation, PublishedView restore validation, source health snapshot validation, viewer scope validation | production restore cutover, 자동 recovery |

recovery validation plan은 아래 순서로 같은 change ticket에 기록합니다.

1. registry restore validation: staging runtime에서 source registry를 먼저 읽고 sourceId,
   source kind, canonical source key, owner/site/group context, JSON parse 오류를 확인합니다.
2. PublishedView restore validation: PublishedView registry를 source registry와 함께 읽고
   sourceId link, enabled state, dashboard/events flag, maxTiles, client scope를 확인합니다.
3. source health snapshot validation: 복구 후 fresh source health snapshot을 캡처하고
   handoff ticket의 stale/offline/reconnect/warning 상태와 비교합니다.
4. viewer scope validation: `/client/api/views`와 scoped client route를 확인한 뒤 외부
   viewer나 integrator traffic을 다시 붙입니다.

경계:

- 이 handoff는 source registry, PublishedView, EventRecord, Event POST payload,
  WebRTC DataChannel, SSE/WS metadata, RTSP/WebRTC media path, Rule/Profile payload를 변경하지 않습니다.
- 이 handoff는 source URL, raw locator, raw JSON, debug material, credential material을
  client/viewer에게 노출하지 않습니다.
- 이 handoff는 `verify-ops-backup-restore-dry-run` staging drill, real operational
  backup, external storage replication, production restore cutover, UI 풀테스트,
  30분/120분 장시간 안정화, published metadata 검증을 대체하지 않습니다.

## 실패 시 롤백

- JSON parse 오류, 중복 source/view id, 존재하지 않는 `sourceId` 참조가 나오면 복원 파일을 덮어쓰지 말고 백업본을 그대로 보존합니다.
- Auth store가 읽히지 않으면 임시 admin을 만들기 전에 기존 store 사본, 권한, owner, hash format을 먼저 확인합니다.
- model/label/sample 누락은 `/ops` 설정 문제가 아니라 asset 준비 문제로 분리하고, registry를 임의 수정하지 않습니다.
- evidence bundle은 signed token 기반 임시 export입니다. 복구 대상은 원본 snapshot/clip/EventRecord이고, 만료된 bundle URL은 복구하지 않습니다.

## v2.3.0 Ops backup/recovery evidence lifecycle

`media-server.v230-ops-backup-recovery-lifecycle.v1`은 운영자가 실제 운영 데이터를
백업했다는 보고가 아니라, 백업/복구 evidence lifecycle의 staging drill과 보존
정리 경계를 검증하는 안정화 gate입니다. 이 gate는 `staging drill`,
`redacted evidence bundle`, `retention cleanup`을 한 묶음으로 확인하되,
운영 데이터 백업 완료로 확대 보고하지 않습니다.

검증 명령:

```bash
./server.sh verify-v230-ops-backup-recovery-lifecycle
```

이 명령은 아래를 fixture 기반으로 실행합니다.

| lifecycle 항목 | 확인 evidence | 완료로 보지 않는 것 |
| --- | --- | --- |
| staging drill | `verify-ops-backup-restore-dry-run`이 만든 `manifest.json`, `SHA256SUMS`, `restore-validation-plan.md`, auth store `0600` 권한 | 실제 운영 runtime 복구, production restore cutover |
| redacted evidence bundle | dry-run manifest의 auth/source/view/analysis/event/snapshot/clip/env-summary 항목과 checksum | plaintext secret, source URL, provider credential, raw media archive 보관 |
| retention cleanup | `ops-evidence-cleanup` fixture dry-run/apply report, `retention-cleanup` audit payload, `token-expiry-no-server-file` bundle 만료 정책 | UI/API evidence 원본 DELETE 허용, 장기 영상 녹화 백업, external storage replication |

미실행이면 이 항목은 안정화 테스트의 조건부 미실행으로 남깁니다. UI 풀테스트가
필요한 복구 리허설은 별도 브라우저 증적에서 `/setup`, `/login`, `/ops`, `/client`
route/action 단위로 확인해야 하며, 이 static/runtime fixture gate가 UI 직접 확인을
대체하지 않습니다.
