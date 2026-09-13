# S10 3D-2 D02 기본 녹화 구성·수명

독자: 구현·검토 담당자. lifecycle: 이번 격리 단기 실행과 실패 이력 보존. 정책은 AGENTS, 정의·결과 source-of-truth는 중앙 release-test-records다. 공개 조회/UI의 3D-3 또는 S11 완료 증거가 아니다.

## 결과와 변경

신규 **46개 + 직접 영향 회귀 478개 = 524 pass / 0 fail**의 유효 결과를 [전수표](D02-results.md)에 보존했다. 최초 실패는 아래 이력에 남겼다. 제품 build exit 0. 메인의 최종 검토·문서 갱신·커밋/푸시는 별도이며 담당자는 커밋/푸시하지 않았다.

| 파일·함수 | 구현 경계 |
| --- | --- |
| recording_journal.h/.cpp — OpenManagedLocked, ManagedStoreId | lease 아래 기존 init/format ID 재사용 또는 getentropy 128bit 난수 생성. 명시 ID 생성자 유지, marker 충돌/손상/nonempty legacy root는 자동 변환·삭제하지 않음 |
| recording_runtime_composition.h/.cpp — RecordingRuntimeStorage | 녹화 on/off와 독립적인 managed 원장→V2 catalog open, 동일 store ID writer 옵션. off는 생산 없음이지 legacy 형식 전환이 아님 |
| recording_evidence_observer.h/.cpp — OnResult, Latest, OnStopped, Stop | immutable decoded snapshot의 source/channel/namespace 결박, frame4096·기본64/max128 cache, try-lock publication/query, namespace 종료/전체 종료 정리 |
| recording_derived_event_worker.h/.cpp — RecordingRuntimeEventBudget, Submit, Query | runtime 준비 예산과 capped 사유, 초기 history 증거 null이면 잠금 밖 provider 조회 후 기존 증거 검증·stopped/slot 재검사. 일반 worker 기본1초/16회 유지 |
| event_recording_bridge.h/.cpp — TryResolve | 명시 runtime raw-stream adapter, public record 원문 불변. 기존 generic source/channel 독립 참조 mode 유지. 초기 provider 전에 bridge 잠금 해제 |
| recording_catalog.h/.cpp — FinalizedSegmentIdsForStartup | 동일 catalog snapshot의 V1/V2 finalized ID 열거 |
| recording_media_inspector.cpp — InspectAndMarkRecordingMedia | V2 실제 미디어 검사와 canonical metadata/경로/lifecycle 재대조. 기존 corrupt 보호 guard 유지 |
| recording_startup_recovery.h/.cpp 및 runtime helper | metadata ready/deletion→derived reconcile·잔여 active 차단→physical inspection. 기존 일반 startup API는 metadata+physical 조합 유지 |
| media_server_application.cpp | managed storage, writer, consumer projector, cache observer/provider, derived service/bridge 기본 composition 연결. bridge 등록·복구 후 supervisor/ingress 시작; bridge 접수 차단·drain 후 생산자/분석/EventStorage 종료 |
| CMakeLists.txt·focused/runner | 신규 runtime/cache TU 링크, 실제 media/source/복구 검증. catalog 정적 oracle은 helper 내부 journal→catalog 및 recovery→bridge→supervisor→ingress 순서를 유지하도록 갱신 |

`verify_recording_default_composition.sh`와 직접 영향 event runner는 실제 `CMakeFiles/media_server.dir/link.txt`의 executable 전용 TU만 executable 시각에 대조한다. runtime TU·공용 header는 archive 시각에 대조하여 오래된 ABI 혼합을 계속 거부한다. runner 주석은 default composition 용도로 정리했다.

## 정상 실제 경로와 한계

| 확인 대상 | 직접 근거·제한 |
| --- | --- |
| 실제 source 생산 | 자체 H264 MP4→실제 SourceViewApplicationService/SessionManager/RecordingSessionService/RecordingSupervisor. 숫자 007, global off→on→off→on에서 생산0/실제 V2 파일 생성, 같은 root ID·기존 파일 보존, owner0 확인 |
| source-cycle 종료 | 격리 fixture에 MEDIA_SERVER_IDLE_GRACE_MS=0을 명시. 기존 기본10초 grace 동작을 바꾸지 않았으며 이 검사는 기본10초 종료 지연 검증이 아님 |
| 실제 이벤트 후행 준비 | H264 201 packet을 100ms 간격으로 실제 RawVideoDecoder+관리 writer에 공급. decoded frame의 직접 증거를 cache에 갱신하며 DispatchEventRecords에 history와 같은 초기 decoded null result 전달. raw key와 numeric context 분리 |
| default16초 근거 | segment10초+post5초+finalize여유1초, retry500ms/33회. 실제 요청 [2000,13000]ms, pre/post 각각5000ms. event 이후 약15.5초에 Complete/full 및 2출력 확인. 출력 직접 decoder 80/30 frame, EOS 확인 |
| 예산 상한 | overflow 포함 60초/121회 제한과 capped 사유. 시간 경과 자체를 coverage로 승격하지 않음. 기존 일반 호출 기본1초/16회는 불변 |
| 실제 복구 | CommittedDurable 및 CreatedBeforeReceipt child가 각각 `_exit(23)` 후 새 process/catalog/service open. 전자는 동일 inode nlink2 확인→cleanup→V2 물리검사→Complete, 후자는 파일 무삭제·source 삭제 거부·예약 유지와 startup 실패. 파일 없는 Intent는 cleanup 확인 후 Failed |
| 잠금·종료 | provider에서 QueryReferenceResult 및 StopAndDrain 재진입, 동시 같은 reference 접수의 내구 accepted 1개, stop 뒤 신규 accepted 없음. 독립 watchdog4초는 교착 검출용이며 분리 thread를 방치하지 않음 |
| 비차단 cache | try-lock 경합·누락은 증거 없음이다. 현재 provider missing은 unknown으로 끝날 수 있어 동시 이벤트 전부의 완료를 보장하지 않음. 실제 후행 갱신 사례가 완료했지만 deterministic contention 빈도·성능은 측정하지 않음 |
| 검증 층 구분 | 정상 이벤트는 실제 RawVideoDecoder 증거다. recovery 준비는 packet에서 구성한 synthetic interval이며 decoded identity 증명으로 쓰지 않음. 전체 AnalysisManager·실제 RTSP/HTTP application 프로세스·공개 화면 end-to-end 검사는 아님 |
| 환경 | macOS 실제 실행. getentropy Linux API 대상 코드는 포함하되 Linux 빌드/실행 미수행. crypto-off focused는 root ID 생성/재개방만 증명하며 crypto 의존 실제 녹화 지원으로 확대하지 않음 |

source lifecycle, streaming pipeline, 공개 Event POST/SSE/WS/schema/route/DTO, Auth는 변경하지 않았다. 새 V2 저장이 기존 공개 timeline/UI에 완전히 표시된다고 주장하지 않는다. 기존 nonempty legacy root는 녹화 on/off 모두 명시 오류이며 운영 데이터 자동 이관은 없다.

## 명령과 유효 결과

모든 명령은 저장소 root에서 실행하고 원출력을 아래 파일로 직접 redirect했다. 도구 표시 잘림으로 원출력을 복원하지 않았다.

| 명령 | exit / 개별 결과 | 원출력 |
| --- | --- | --- |
| `bash scripts/internal/verify_recording_default_composition.sh` | 0 / 신규42 | [ActualRuntimeIdleFixed](D02-ActualRuntimeIdleFixed.log) |
| 같은 full runner의 closing 확장 | 1 / 독립 provider 1개 유효, 뒤 recovery 준비 exit134. 앞42개 중복 합산 안 함 | [ClosingActual](D02-ClosingActual.log) |
| `bash scripts/internal/verify_recording_default_composition.sh --recovery-only` | 0 / 신규3, child exit23 각각 확인 | [RecoveryOnly](D02-RecoveryOnly.log) |
| `bash scripts/internal/verify_v410_recording_catalog.sh` | 0 / 246 | [CatalogRegression](D02-CatalogRegression.log) |
| `bash scripts/internal/verify_v410_recording_startup.sh` | 0 / 44 | [StartupRegression](D02-StartupRegression.log) |
| `bash scripts/internal/verify_recording_managed_writer.sh` | 0 / 44 | [ManagedWriterRegression](D02-ManagedWriterRegression.log) |
| `bash scripts/internal/verify_recording_consumer_connection.sh` | 0 / 22 | [ConnectionRegression](D02-ConnectionRegression.log) |
| `bash scripts/internal/verify_recording_consumer_reference.sh` | 0 / 19 | [ReferenceRegression](D02-ReferenceRegression.log) |
| `bash scripts/internal/verify_recording_retention_v2.sh` | 0 / 24 | [RetentionRegression](D02-RetentionRegression.log) |
| `bash scripts/internal/verify_recording_derived_event_integration.sh` | 0 / 56 | [EventIntegrationRegression](D02-EventIntegrationRegression.log) |
| `bash scripts/internal/verify_recording_identity.sh` | 0 / 23 | [IdentityRegression](D02-IdentityRegression.log) |
| `./server.sh build` | 0 / 제품 build, assertion 수와 별도 | [FinalBuild](D02-FinalBuild.log) |

D01의 숫자 focused11·range16 등 변경 없는 경계 증거는 [D01 보고서](D01-report.md)에 유지하며 D02 신규 실행 수에 더하지 않는다. identity/catalog/consumer/retention은 D02 원장·구성·잠금 변경의 직접 영향 때문에 재실행했다. 기존 5.3b429개 전체는 반복하지 않았다.

## 최초 실패·TDD 이력

| 실행·원출력 | exit / 관측 | 분류·조치 |
| --- | --- | --- |
| D02-IdentityRed.log, focused runner | 1 / 2pass3fail | 사전 지정 빈 store ID 자동 생성 미구현 RED |
| D02-CacheStubBuild.log, build | 2 | getentropy 선언 header 누락 준비 실패. sys/random.h 포함 후 CacheStubBuildFixed exit0 |
| D02-CacheRedIdentityGreen.log, focused | 1 | fixture incomplete snapshot type include 누락, 준비 실패 |
| D02-CacheRedIdentityGreenFixed.log, focused | 1 / 13pass2fail | identity GREEN, cache 미구현 예상 RED |
| D02-ProviderBudgetRed.log, focused | 1 / 15pass2fail | default budget와 raw/history-null 접수 미구현 예상 RED |
| D02-RuntimeStartupRed.log, focused | 1 / 18pass4fail | V2 검사·managed factory·runtime helper 미구현 예상 RED. 당시 off 기대는 최종 managed-on/off 계약 증거가 아님 |
| D02-CompositionFirst.log, focused | 1 / 실행 전 거부 | application TU를 archive 시각과 비교한 준비 오류. executable 전용 TU만 분리하며 runtime/header archive 검사는 유지 |
| D02-CompositionFirstFixed.log, focused | 0 / 22pass | 첫 composition helper GREEN. 실제 source/default 경로는 뒤 검사로 추가 |
| D02-ActualRuntime.log, focused | 1 / 준비 실패 | fixture close 선언 누락, unistd.h 추가 |
| D02-ActualRuntimeFixed.log, focused | 1 / 36pass2fail | source-cycle 5초 정리 대기와 기존 기본 idle grace10초 불일치. 메인 원인 대조 후 격리 idle0 명시, 뒤 default 묶음은 당시 건너뜀 |
| D02-ActualRuntimeIdleFixed.log, focused | 0 / 42pass | 실제 source·default후행 완료까지 GREEN |
| D02-ClosingActual.log, focused | 1 / recovery child134, expected23과 다름 | PrepareRuntimeJob created_at_ms=0이 기존 양수 계약 위반. 제품 validator 유지, fixture1로 수정. /cores/core.13548 부재 |
| D02-RecoveryOnly.log, recovery-only | 0 / 3pass | 기존42개를 반복하지 않고 recovery child23·복구만 확인 |

나머지 중간 build 원출력 `D02-IdentityBuild`, `CacheStubBuildFixed`, `ProviderStubBuild`, `ProviderBuild`, `RuntimeStubBuild`, `RuntimeBuild`, `CompositionBuild`, `SourceBuild`, `DrainBuild`는 각각 exit0이며 최종 build로 마감했다. 준비 오류를 예상 RED로 소급하지 않았다. [전수표](D02-results.md)는 historical assertion119행도 보존한다.

## 정리·미실행

[전수표의 정리19개 root](D02-results.md)는 실패·성공 모두 삭제 전 bytes와 삭제·부재 확인을 포함한다. raw media/임시 source registry/생성 파일/fixture binary는 제거했다. 원출력·제품/runner fingerprint·전수표만 저장소에 보존한다. 기존 build directory는 재사용 제품 산출물이다. 운영 root·외부 입력·port 서버·credential은 사용하지 않았다.

| 테스트 카테고리 | 판정 | 직접 근거 | 실행 승인 상태 |
| --- | --- | --- | --- |
| 안정화 | 진행 대상 | D02 기본 구성·managed 원장·worker 수명 직접 변경 | 관련 단기 focused/build/회귀 실행 |
| 30분 | 미진행 | 이번 실행 미승인, S11 최종 gate 별도 | 미승인·미실행 |
| 120분 | 조건부 진행 | S11 최종 cut에서 source/증거 fanout·cleanup 영향 범위 대조 | 이번 실행 미승인 |
| UI | 미진행 | 이번 내부 구성 범위, 공개 조회/UI는 3D-3 이후 | 미승인·미실행 |

token start/end/consumed는 담당자별 실제 집계 도구가 없어 미집계다. elapsed는 지원 runner의 bash SECONDS를 원출력 그대로 사용했고 없는 runner는 미집계다. 별도 토큰 절약량을 주장하지 않는다. 커밋·푸시 수행 여부: 담당자 미수행, 메인 최종 검토 후 승인 범위 처리.
