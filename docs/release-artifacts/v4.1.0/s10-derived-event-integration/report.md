# S10 3C-5.4 opt-in 이벤트 통합 기록

독자: 구현·검토 담당자. lifecycle: 이번 단위의 사전등록·실행 증거와 검토 인계 기록. 정책은 AGENTS, 개별 정의와 결과 source-of-truth는 중앙 release-test-records다. 메인의 최종 검토·커밋은 별도다. default composition·공개 route/schema·3D/S11·장시간/UI는 범위 밖이다.

## 코드 고정 후 유효 결과

메인 최종 검토: 실제 제품 diff·검증 oracle·원출력을 대조했고 변경 source 22개 SHA-256,
최종 assertion 717개와 임시 경로 27개 부재를 직접 재확인했다. 문서 링크와 diffcheck도
exit 0이다. 첫 메인 개수 대조는 legacy의 `[s05-assert]` 형식을 빠뜨려 573으로 실패했고,
실제 로그 형식을 포함한 재대조는 717로 통과했다(검토용 집계 오류, 제품 검증 재실행 아님).
따라서 3C-5.4 내부 opt-in 단위는 완료·커밋 가능이며 기본 서버 연결이나 S11 완료는 아니다.
최초 stage 뒤 `git diff --cached --check`는 새 CatalogRegression.log의 줄 끝 공백
15개로 exit 2였다. 해당 공백만 정규화했으며 행·결과·측정값은 보존했다.
정규화 전 로그 SHA-256은 `b39ad6635177d1476297f44781381c0792498316c31442d3e7a75c2d415382c5`다.
이 로그는 바이트 그대로의 원본이 아니라 공백 정규화본이며, 제품 재검증은 하지 않았다.

제품 assertion **717 pass / 0 fail**. 개별 최종 717행과 historical 382행, 임시 경로 27개의 정리 결과는 [전수 결과](results.md)에 원출력 행과 함께 보존했다. 기본 구성/public route/UI가 아니라 이번 5.4 내부 opt-in 단위의 결과다.

| 제목 | 실제 명령 | exit / 개별 결과 | 근거 |
| --- | --- | --- | --- |
| 제품 build | `./server.sh build` | 0 | [FinalFixedBuild](FinalFixedBuild.log) |
| 최종 실제 이벤트 통합 | `bash scripts/internal/verify_recording_derived_event_integration.sh` | 0 / 56 pass (48+1+1+2+2+2) | [FinalCompleteFocused](FinalCompleteFocused.log) |
| 내부 선택 직접 영향 | `bash scripts/internal/verify_recording_derived_selection.sh` | 0 / 27 pass | [SelectionRegression](SelectionRegression.log) |
| consumer 연결/관측 producer | `bash scripts/internal/verify_recording_consumer_connection.sh` | 0 / 22 pass | [FinalConnectionRegression](FinalConnectionRegression.log) |
| consumer 참조 저장/조회 | `bash scripts/internal/verify_recording_consumer_reference.sh` | 0 / 19 pass | [ReferenceRegression](ReferenceRegression.log) |
| 기존 media/UTC range | `bash scripts/internal/verify_recording_range_resolution.sh` | 0 / 16 pass | [RangeRegression](RangeRegression.log) |
| legacy event bridge | `bash scripts/internal/verify_v410_event_recording.sh --bridge-only` | 0 / 144 pass | [LegacyBridgeRegression](LegacyBridgeRegression.log) |
| ID·session 직접 링크 | `bash scripts/internal/verify_recording_identity.sh` | 0 / 23 pass | [IdentityRegression](IdentityRegression.log) |
| writer/finalize 직접 링크 | `bash scripts/internal/verify_v410_recording_finalize_recovery.sh --integration` | 0 / 140 pass | [FinalizeIntegrationRegression](FinalizeIntegrationRegression.log) |
| catalog/SQLite/crypto-off/static | `MEDIA_SERVER_VERIFY_V410_RECORDING_CATALOG_BUILD_DIR=<새 mktemp 소유 경로> bash scripts/internal/verify_v410_recording_catalog.sh` | 0 / 246 pass | [CatalogRegression](CatalogRegression.log) |
| retention/V2 playback-off | `bash scripts/internal/verify_recording_retention_v2.sh` | 0 / 24 pass (22+2) | [RetentionRegression](RetentionRegression.log) |

환경·HEAD·컴파일러/의존 버전은 [Environment](Environment.log)에 보존했다. catalog 임시 경로는 `mktemp -d /private/tmp/media-server-s10-event-catalog.XXXXXX`로 새로 확보했고 runner가 전부 제거했다. 기존 5.3b 429개를 인계 때문에 재실행하지 않았다. catalog의 composition 관련 행은 정적 검사이며 서버 실행 증거가 아니다.

제품·CMake·변경 runner·fixture 전체 22개의 현재 SHA-256은 [source fingerprints](source-fingerprints.log)에 보존했다. `shasum -a 256 -c docs/release-artifacts/v4.1.0/s10-derived-event-integration/source-fingerprints.log`는 exit 0, 전부 OK다. 실행 당시 raw 로그는 historical을 포함해 그대로 유지하며 현재 해시를 과거 코드 해시로 소급 주장하지 않는다.

문서 검증은 `./server.sh verify-docs-links`, exit 0: markdown 248 / local links 3321 / images 22 / anchors 110 / indexed 76 / exclusions 162 / failures 0 (`DocsLinks.log`). `git diff --check`도 exit 0이다. 두 검사는 제품 assertion 717개와 별도이며 메인 소유의 최신 plan/spec 변경을 포함한다.

## 실행 이력

| 제목 | 실제 결과 | 근거 |
| --- | --- | --- |
| 초기 인터페이스 build | exit 0 | [원출력](InterfaceBuild.log) |
| E01 예상 RED | exit 1, 0/1. H264 decoded/evidence 30, reference 1, job 0으로 pending-only 미구현 재현 | [원출력](InitialRed.log) |
| catalog 인터페이스 build | exit 0 | [원출력](CatalogInterfaceBuild.log) |
| worker build | exit 0 | [원출력](WorkerBuild.log) |
| 첫 연결 GREEN | exit 0, 1/0. job Complete와 2출력까지; 이 시점은 직접 decode/조회 oracle 확장 전 | [원출력](FirstGreenAttempt.log) |
| E13/E17 예상 RED | exit 1, 1/2. Stop 후 신규 reference 저장 및 무주입 재생성의 소유권 상실 | [원출력](OwnershipRed.log) |
| 소유권 build | exit 0 | [원출력](OwnershipBuild.log) |
| 소유권 GREEN | exit 0, 3/0. 실제 출력 2개 각 10프레임 decode/EOS/오류 없음, verified/fullySatisfied true | [원출력](OwnershipGreen.log) |
| E20 예상 RED | exit 1, 3/1. 비권위 원장 조회 실패 때 legacy 억제 누락 | [원출력](UncertainOwnershipRed.log) |
| 비권위 보완 build | exit 0; 이후 추가 편집은 다음 build 필요 | [원출력](UncertainOwnershipBuild.log) |
| 묶음 실행 준비 실패 | exit 1. 추가 source 편집 후 archive freshness guard가 실행을 차단; 제품 assertion 실행 아님/RED 아님 | [원출력](EventBehaviorFirst.log) |
| snapshot hook oracle 준비 오류 | exit 1, 12 pass/1 fail. 프레임 부재는 기존 hook의 성공 marker 경로임을 직접 확인. 실제 marker와 의도적으로 생성한 소유 clip 경로 오류로 호출·실패 집계 대조 수정 | [실패](HookBehavior.log), [수정 후](AdapterHookBehavior.log) |
| UTC fixture 위치 준비 오류 | exit 2, 선행 assertion 30 pass 후 중단. V1 전용 path getter의 부재를 확인해 V2 위치 getter와 optional/root guard로 변경. 복사 전 오류이며 소유 root 밖 파일 생성 없음 | [원출력](ClosingBehavior.log) |
| UTC lifecycle 제품 결함 | exit 1, 39 pass/1 fail. Utc의 SourceValid가 binding reset만으로 corrupt를 판별하지 않는 교차 경계를 메인이 회수·확정. 내부 available_for_selection으로 보완 | [실패](ClosingBehaviorRetry.log), [수정 후](LifecycleGreen.log) |
| consumer 회귀 기대값 누락 | exit 1, 20 pass/2 fail(C422/C423). 승인된 미주입 error/reference link/managed=false 예상값만 추가 갱신; pre-roll·멱등·저장 assertions 유지 | [실패](ConnectionRegression.log), [수정 후](ConnectionRegressionRetry.log), [코드 고정 후](FinalConnectionRegression.log) |
| resolver 소유권 예상 RED | exit 1, 41 pass/3 fail. stable reference의 소유 조회 전 resolver nullopt/불일치/예외로 managed 상실. 소유 조회 뒤 신규 접수 검증으로 순서 보완 | [실패](ResolverOwnershipRed.log), [수정 후](FinalFocused.log), [최종](FinalCompleteFocused.log) |

실제 H264 RawVideoDecoder callback 증거를 AnalysisResult에 전달해 DispatchEventRecords에 진입했다. AnalysisManager 전체 경로 검증이나 VP8→H264 remux라고 보고하지 않는다. managed flag는 내구 소유 또는 소유권 불명확 시 legacy 억제이며 접수 성공 뜻이 아니다. 현재 출력 availability 조회는 catalog 상태만 대조하고 현재 파일 hash/read 건강도를 재검증하는 API가 아니다.

각 runner 원출력 끝에 실행 소유 임시 경로·삭제 전 bytes·removed=true가 보존되어 있다. 새 runner와 지원하는 기존 runner의 elapsed source는 bash SECONDS이며, 기존 runner에 elapsed 출력이 없는 명령은 미집계다. token start/end/consumed는 하위 작업별 계측 도구가 없어 미집계다. 통과 뒤 실패 이력을 지우지 않았으며 원출력 자체가 잘린 파일은 없다.

## 구현과 내부 소비 경계

- `CatalogEventRecordingBridge::TryResolve`는 `use_consumer_references`와 선택적 `derived_service` 주입일 때만 작업을 연결한다. 기존 UTC legacy 경로와 기본 application 구성은 그대로다. stable reference의 내구 소유를 먼저 조회하고 resolver 미주입/nullopt/불일치/예외·Stop·저장 불확실성에도 기존 소유를 잃지 않는다. context/record 자체 source/channel 모순 입력의 기존 거부는 유지한다.
- `DerivedEventWorker::Submit/Process/StopAndDrain`은 슬롯 확보→기존 journal의 accepted commit→worker 공개 순서를 사용한다. 기본 active+queued 16개(최대 32), 증거 4096 frame, 기본 대기 1초(최대 5초)/16회, 기본 예약 32MiB(양수 총 256MiB 이하)다. 실제 작업은 `RetentionCoordinator::AdmitDerivedJob` 뒤 기존 service의 30초 bounded Run으로 실행한다. 동시에 호출한 Stop은 직렬화하고 bridge의 신규 저장을 막은 뒤 취소·join한다.
- `RecordingCatalog::SnapshotDerivedSources`는 동일 잠금의 continuous segment/binding/lifecycle/deleted를 요청 관련성으로 필터링한 후 256개 상한을 적용한다. 미디어 경계 비교는 `__int128`의 정확한 반개구간 비교다. 잘못된 binding의 generation 차이를 제외 근거로 쓰지 않는다. `DerivedSourceEvidence::available_for_selection`은 내부 기본 true 값이며 worker가 lifecycle/결박 불확실성을 false로 전달해 UTC에서도 Unknown에 기여시킨다. 공개 저장 shape는 바뀌지 않는다.
- `ResolveUtcRangeFromSnapshot`은 기존 `ResolveUtcRange`의 동일 동작을 순수 함수로 추출했다. 기존 read의 기본 후보 상한 의미는 유지하고 opt-in worker만 mapping/후보 4096 상한을 준다. UTC mapping 공백을 증명된 영상 공백으로 바꾸지 않으며 unplaced/복수 후보를 보존한다.
- `AcceptDerivedReference`/`DerivedReferenceAccepted`는 별도 DB 없이 기존 catalog 소유 journal·SQLite projection·checkpoint에 정확한 reference를 결박한다. accepted/no-job의 재시작 상태는 `managed=true`, `unknown`, `evidence-not-durable`이다. 소실된 decoded 증거를 발명하거나 자동 재렌더하지 않는다.
- `QueryReferenceResult`/`QueryDerivedReferenceResult`는 영속 reference→job/전체 출력 목록을 돌려준다. job은 ID 기준 결정적 top-8이고 초과 시 truncated/unknown을 명시한다. 기존 job 목록이 있어도 새 inflight는 pending, 새 실패/부분 결과는 해당 현재 상태로 표시한다. wall timestamp를 최신 작업 판정에 사용하지 않는다. 출력 availability는 catalog 상태만 확인하며 현재 실제 파일의 hash/read 건강도 보증이 아니다.
- `EventRecordingBridgeResult::derived_job_managed`는 내부 비직렬화 필드이며 기본 false다. 실제 접수/기존 소유뿐 아니라 소유권 조회 불확실성의 legacy 억제에도 true를 사용하므로 접수 성공 뜻이 아니다. EventStorage의 clip fallback·실패 집계·RecordFallback만 이 값으로 억제하고 snapshot hook은 유지한다. 새 경로의 `derived_clip_ready=false`/빈 `clip_path`는 복수 출력 중 첫 파일을 전체 요청으로 승격하지 않기 위한 계약이다. EventRecord 작성 후 비동기 재작성은 없다.

## 명시적 한계와 비범위

| 항목 | 실제 경계 |
| --- | --- |
| 실제 decoder 증거 | 정상 E01은 H264 RawVideoDecoder callback에서 직접 축적한 증거다. AnalysisManager 전체 callback/sampling 경로를 이번에 재검증했다는 뜻이 아니다. recovery/cancel/cap fixture의 packet 합성 증거는 별도로 명시한다. |
| provider | 잠금 밖 thread-safe/nonblocking 주입 계약이다. callback 자체의 강제 timeout은 제공하지 않으며 임의 thread detach도 하지 않는다. 계약을 어긴 callback은 join을 지연할 수 있다. service inspector의 기존 최대 5초 취소 확인 지연은 유지된다. |
| 대기/재요청 | 경과 시간은 coverage가 아니다. 같은 reference의 inflight 접수는 병합하고 초기 snapshot을 유지하며 후행 증거는 주입 provider로 갱신한다. 명시 재접수에서 선택이 달라지면 별도 job, 같은 선택은 동일 job이다. 무한 자동 재시도는 없다. |
| startup | 구성 시 한 번 bounded Reconcile을 수행한다. 8개 초과의 more 또는 소유 blocker는 노출하고 남은 보호/예약을 유지한다. 자동 무한 복구를 하지 않는다. |
| 출처/시간 | 원본 association을 payload/decoded identity로 승격하지 않는다. 기존 remux의 verified/fullySatisfied, 원본·파일·출력 시간축/잔차/AU 출처를 typed Ready/job 결과 그대로 보존한다. 출력 자체 UTC는 직접 입증되지 않으면 unknown이다. |
| UI/public/default | 새 공개 route·Event POST/SSE/WS/schema·기본 application 주입·연속 재생 UI는 추가하지 않았다. 내부 결과 목록은 공개 소비자 조회 완료가 아니다. 3D/S11은 미구현/이번 범위 밖이다. |
| 장시간/UI | 30분·UI는 이번 실행 미승인/미실행. 120분은 조건부 진행이며 S11 최종 cut에서 영향 범위를 대조한다. 이번 단기 결과로 대체하지 않는다. |
| commit/push | 담당자는 실행하지 않았다. 푸시 가능: 아니오(미커밋·푸시 승인 없음). 메인 검토 후 해당 단위 커밋을 인계하며 3D/S11로 자동 진행하지 않는다. |
