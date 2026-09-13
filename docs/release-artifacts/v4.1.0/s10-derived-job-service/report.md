# S10 3C-5.3b 실제 파생 파일·게시·복구 기록

독자: 구현·검토 담당자. lifecycle: 이번 단위의 실행·실패 이력 보존. 정책은 AGENTS, 정의와 결과 source-of-truth는 중앙 release-test-records다. 5.4/3D/S11은 범위 밖이다.

## 결과

3C-5.3b 내부 동기 서비스의 실제 파일 생성·게시·원자 commit·중단 복구를 구현하고 **개별 429개**를 확인했다. [전수 429행과 cleanup 19행](results.md)은 원출력 자동 추출이다. main의 마지막 코드 검토와 커밋은 메인 소유이며 이 담당자는 commit/push하지 않았다. 기본 서버 구성·이벤트 생산자 연결·공개 조회/재생 전환은 구현하지 않았다.

| 실행 | 실제 명령 | exit / 전수 결과 | 원출력 |
| --- | --- | --- | --- |
| 실제 정상·중단·소유권·projection | `bash scripts/internal/verify_recording_derived_job_service.sh` | 0 / 43 pass, 0 fail; 25초 | [ProjectionFirst](ProjectionFirst.log) |
| 누락 경계·committed 보호 | `MEDIA_SERVER_DERIVED_JOB_GROUP=closing bash scripts/internal/verify_recording_derived_job_service.sh` | 0 / 6 pass, 0 fail; 6초 | [ClosingFinalFixed](ClosingFinalFixed.log) |
| 5.3a 직접 영향 | `bash scripts/internal/verify_recording_derived_jobs.sh` | 0 / 23 pass | [JobsRegression](JobsRegression.log) |
| catalog / SQLite / crypto-off / static | `bash scripts/internal/verify_v410_recording_catalog.sh` | 0 / 246 pass | [CatalogRegression](CatalogRegression.log) |
| retention | `bash scripts/internal/verify_v410_recording_retention.sh` | 0 / 56 pass | [RetentionRegression](RetentionRegression.log) |
| V2 retention / GStreamer-off | `bash scripts/internal/verify_recording_retention_v2.sh` | 0 / 24 pass (22+2) | [RetentionV2Regression](RetentionV2Regression.log) |
| 실제 remux / 단발 취소 | `bash scripts/internal/verify_recording_derived_remux.sh` | 0 / 31 pass (1+30) | [RemuxRegression](RemuxRegression.log) |
| 최종 제품 build | `./server.sh build` | 0, runtime archive와 실행 파일 일치 | [BoundedSnapshotBuild](BoundedSnapshotBuild.log) |
| whitespace | `git diff --check` | 0 | 원출력 없음, 제품 assertion 수와 별도 |
| 문서 링크(메인 실행) | `./server.sh verify-docs-links` | 0 / markdown246, local3141, images22, anchors110, indexed76, exclusions160, failures0 | results 추가 후 메인 직접 확인; 제품 429개와 별도 |

43행 이후 제품 변경은 없다. closing fixture의 누락 oracle 추가만 별도 실행했고, 이전 43행을 인계 때문에 재실행하지 않았다. 원출력의 `[pass]` 429행과 결과표 행수를 대조했다. build/static 검사로 장시간/UI를 대체하지 않는다.

## 구현과 불변 경계

- `recording_derived_job_service.h/.cpp`: `DerivedJobService::Run`, `Reconcile`과 내부 `Render`, `Finish`, `FailIntent`. catalog당 단일 서비스 소유, 동시 Run은 대기열 없이 거부한다. 소유자는 기존 직접 cleanup API를 차단하며 terminal 전이는 소유 서비스만 기록한다.
- `recording_derived_job_ready.cpp`: 기존 미출시 `record.v1` 하나에 엄격한 files/ready 필드를 확장했다. receipt→Ready→Committed→Complete를 상태별로 검증한다. `BuildDerivedJobReady`는 immutable selection, 원본별 confirmed 요청 범위, 실측 AU 기간으로 계산한 미충족을 대조한다. source-index 목록·AU/VCL/visible hash·90k 변환 잔차·quality를 그대로 보존하며 최종 envelope는 4MiB 이하이다.
- `recording_catalog.cpp`: `UpdateDerivedJob`의 output 전체+provenance+Committed는 **단일 기존 journal mutation**, 하나의 catalog 잠금 경계, SQLite 단일 transaction으로 적용한다. replay/checkpoint도 같은 엄격 전이를 사용한다. source 및 committed output 보호와 durable 예약은 cleanup 완료 전 유지한다.
- `recording_journal.cpp`: commit 내부에 중첩된 모든 output order를 기존 durable reservation에 대조한다. `ReserveRecordingOrder`를 재사용하고 order를 재사용/조작하지 않는다. released segment/source 계약과 기존 continuous-only FinalizeReadyTicket은 변경하지 않았다.
- `recording_derived_provenance.h`: 5.2 값 타입을 include cycle 없이 공유하도록 이동했다. 필드/품질 의미는 변경하지 않았다. CMake 및 catalog를 직접 compile하는 기존 관련 runner 21개는 새 Ready 계약 구현을 링크한다.
- 신규 runner는 제품 cpp를 archive와 중복 링크하지 않고 runtime archive 하나만 사용한다. include/src가 archive보다 새로우면 `./server.sh build` 선수조건을 명시하며 실행을 거부한다.

파일은 anchored root와 각 parent의 O_NOFOLLOW·dev/inode를 확인한다. 새 private 디렉터리는 0700, 새 파일은 O_EXCL/0600이며 기존 경로를 chmod하지 않는다. 기존 보호된 source FD와 빈 output FD를 5.2 remux에 전달한다. Ready 전에 fsync/size/hash를 재확인하고, linkat no-replace 게시 후 양 부모를 fsync한다. 복구의 temp/final nlink2 쌍은 동일 inode/hash로만 인정한다. 최종 link/unlink 직전에 parent/root와 이름의 inode를 다시 대조한다. 파일 open은 O_NONBLOCK 뒤 regular 검사이므로 동명 FIFO를 읽으며 멈추지 않는다.

출력은 actual emitted PTS/duration의 독립 epoch, ns timebase, Event retention이다. UTC는 unknown/null 및 `derived-output-utc-unavailable`로 보존한다. 원본 epoch/UTC 복사나 가짜 source binding을 만들지 않는다. `verified_output`과 `request_fully_satisfied`는 분리되며 5.2의 `file-duration-on-source-pts-axis` 품질을 원본 duration/decoded identity로 승격하지 않는다.

## F01~F16 마감 대조

| ID | 실제 닫은 경계 | 근거 |
| --- | --- | --- |
| F01 | 실제 H264 writer→selector→Intent→2파일→Ready/publish/commit/Complete, catalog metadata·경로·inode/size/hash·단일 commit·hold 해제·temp/jobdir 부재, 두 파일 직접 decode | ProjectionFirst F01, decode 원출력 |
| F02 | 두 출력 독립 epoch·unknown UTC와 실제 AU/visible 출처, 전체 canonical 왕복 | ProjectionFirst F02/F12 |
| F03 | 생성 전 프로세스 중단 후 Failed, commit/output 없음 | ProjectionFirst F03 |
| F04 | create/receipt 전 실물은 Unknown blocker, source hold/정상 삭제사유 거부·예약 유지·파일 무삭제 | ProjectionFirst F04 및 강화된 child oracle |
| F05 | durable receipt 이후 중단은 정확 소유 partial 정리→Failed, source hold/예약 해제 | ProjectionFirst F05 |
| F06 | Ready 중단 후 재렌더 없이 같은 inode/hash 게시·commit·cleanup; 대표 복구 두 파일 직접 decode | ProjectionFirst F06, fault-3 decode |
| F07 | output 0/1 각각 link 직후 별도 프로세스 중단, 동일 nlink2 쌍 수렴 | ProjectionFirst F07 두 행 |
| F08 | 마지막 publish 내구 후 commit 전 중단 수렴 | ProjectionFirst F08 |
| F09 | 원자 commit 뒤 중단 및 재개 전 source/output 보호·허용 삭제사유 거부, cleanup 뒤 보호 해제 | ProjectionFirst F09 + ClosingFinalFixed F09 |
| F10 | 각 temp·attempt/job 디렉터리 삭제·Complete 직전; Failed cleanup의 디렉터리 삭제/저장 직전 중단까지 멱등 수렴 | ProjectionFirst F10 여덟 행 |
| F11 | hash/누락/foreign/symlink/FIFO/추가 hardlink/parent/root 교체 거부, 파일 상태 보존 | ProjectionFirst F11 + ClosingFinalFixed F11 |
| F12 | 선택/요청/미충족 결박·strict unknown/state/inode alias·canonical·SQLite/fallback/rebuild/checkpoint·중첩 미예약 order·불법 replay | ProjectionFirst F12 + ClosingFinalFixed F12 |
| F13 | Complete output tombstone 뒤 Reconcile은 출력 재생성 없음 | ProjectionFirst F13 |
| F14 | BeforeCreate/receipt 이후 취소·1ms 작업 예산·32byte 출력합계 cap·실제 4MiB serializer 상한, 자르지 않고 실패/정리 | ProjectionFirst F14 및 BeforeCreateCancel RED/GREEN |
| F15 | 단일 service·동시 Run·외부 terminal 거부, active snapshot 8개 상한/9번째 미처리 명시/다음 호출 수렴 | ProjectionFirst F15 + ClosingFinalFixed F15 |
| F16 | catalog 보호/예약 복원 확인 후 Reconcile; 허용 사유로 비보호 원본 삭제 positive control; 다른 catalog/journal/root는 Run/Reconcile 모두 무변경 | ProjectionFirst F16 + ClosingFinalFixed F16 |

실제 fault는 새 프로세스가 managed journal/catalog를 직접 open한 뒤 `_exit(73)`하고, 다른 프로세스가 새로 연다. 상속한 managed lease를 사용하거나 FD destructor cleanup을 복구 증거로 삼지 않는다. 고의 훼손/불법 replay root도 마지막에는 verifier 소유 containment 아래 정리했다.

## 실패와 중간 실행 이력

| 실행 | exit / 실제 결과 | 분류·후속 |
| --- | --- | --- |
| [InitialRed](InitialRed.log) | 1 / F01 0 pass, 1 fail | 사전등록된 service stub 예상 RED |
| [RequestBindingRed](RequestBindingRed.log) | 134 / assertion 전 abort | 새 공유형과 오래된 runtime archive의 혼합 ABI 검증 준비 실패. 예상 RED 아님. 전체 build 후 동일 negative 재실행. 소유 root 정리, 확인한 `/cores/core.96658` 부재; 시스템 공유 crash 자료 삭제 없음 |
| [ContractJournalBuild](ContractJournalBuild.log) | 0 | ABI 일치 full build |
| [RequestBindingExpectedRed](RequestBindingExpectedRed.log) | 1 / 0 pass, 4 fail | F12 세 결박 누락과 F01 stub의 예상 RED |
| [ServiceBuild](ServiceBuild.log) | 2 / compile 오류 | 새 코드의 order 필드명 오류, `sequence`로 수정. [ServiceBuildFixed](ServiceBuildFixed.log) exit 0 |
| [NormalFirst](NormalFirst.log) | 0 / 4 pass | 최초 F12/F01 GREEN, fault 전체 증거 아님 |
| [FaultFirst](FaultFirst.log) | 0 / 20 pass | 첫 프로세스 fault 묶음 |
| [OwnershipFirst](OwnershipFirst.log) | 0 / 32 pass | 당시 상태/예약 oracle 범위. 최종 강한 파일·보호 oracle로 확대 |
| [BeforeCreateCancelRed](BeforeCreateCancelRed.log) | 1 / 3 pass, 1 fail | BeforeCreate 취소 뒤 불필요 생성 경로 blocker 예상 RED |
| [BeforeCreateCancelGreen](BeforeCreateCancelGreen.log) | 0 / 4 pass | callback 직후 budget 검사와 live 생성 inode 정리 보완 |
| [IndependentOracle](IndependentOracle.log) | 0 / 37 pass | 파일/commit/decode 독립 oracle. blocked 삭제 이유가 허용 값이 아니었던 한계를 발견해 최종 ProjectionFirst에서 `continuous-capacity`와 positive control로 보완 |
| [ClosingFirst](ClosingFirst.log) | 2 / root 교체 후 setup 중단 | fail-closed 된 같은 catalog를 재조회한 fixture 오류. 경로 복원 뒤 새 catalog로 무변경 대조 |
| [ClosingFixed](ClosingFixed.log) | 0 / 5 pass | 누락 경계 GREEN |
| [ClosingFinal](ClosingFinal.log) | 1 / compile 오류 | 추가 fixture의 C++20 structured-binding capture, C++17 pair 참조로 수정 |
| [ClosingFinalFixed](ClosingFinalFixed.log) | 0 / 6 pass | committed output 보호 oracle까지 최종 GREEN |

계약/원장 syntax compile의 [ContractCompile](ContractCompile.log), [JournalCompile](JournalCompile.log)는 exit 0·원출력 없음이다. [RequestBindingBuild](RequestBindingBuild.log), [FaultBoundaryBuild](FaultBoundaryBuild.log), [CancelBuild](CancelBuild.log), [BoundedSnapshotBuild](BoundedSnapshotBuild.log)는 각 수정 후 exit 0이며 실패를 소급 제거하지 않는다.

## 한계와 인계

- create→durable receipt 이전 crash는 자동 삭제/재사용하지 않는 **소유권 미확인 blocker**다. 원장에는 Intent/보호/예약을 유지한다. 살아 있는 실행이 직접 만든 빈 디렉터리의 메모리 inode는 그 실행의 취소 정리에만 사용하며 재시작에 추정 복원하지 않는다.
- Ready/Committed cleanup에서는 정확한 부모가 있으면 receipt identity를 검사하고, 이미 삭제된 private 부모만 anchored root 아래 ENOENT로 증명한다. 권한 오류·symlink·다른 inode를 부재로 낮추지 않는다. 소유 불명확은 resource release 없이 멈춘다.
- 전체 remux 작업 budget은 30초 이하, inspector 구간의 취소 반영 지연은 기존 최대 5초다. OS 파일 I/O 자체의 강제 중단을 보장한다는 뜻은 아니다. 1ms fixture는 짧은 deadline 거부 검사이며 30초 장기 성능 테스트가 아니다.
- 한 입력 최대 32MiB, 원본/출력 최대 8개, AU 최대 4096, 전체 출력 최대 256MiB, job JSON 최대 4MiB를 유지한다. Reconcile은 최대 active 8개 snapshot과 전체 budget을 공유하며 초과를 명시한다. 임의 길이 pre/post 지원이나 무제한 startup 완료를 주장하지 않는다.
- 5.4는 live reference/selection 캡처와 bounded worker/event 정책, 전체 출력 목록의 내부 결과 전달을 연결해야 한다. 자기 derived Event 출력을 원본 adapter에 재투입하지 않는다. 기본 구성/공개 재생 route 전환은 3D이며 여기서 변경하지 않았다.
- 30분/UI 미실행. 120분은 조건부 진행: S11 최종 cut에서 영향 범위 대조, 이번 실행 미승인. 외부/운영 입력·비밀·서버/port·브라우저·새 의존성·별도 DB 없음.

## 증거·정리·사용량

[환경](Environment.log), [최종 source fingerprint](fingerprints.log), [전수 결과와 cleanup](results.md)를 보존한다. raw 미디어/원장/fault FIFO·symlink/실행 파일은 소유 root 19개에서 정리됐고 부재를 재확인했다. 텍스트 로그는 당시 개별 측정/실패 보존 목적이며 실제 source URL·자격증명은 없다.

token start/end/consumed: 미집계. source: 이 하위 작업에 token 사용량 API가 제공되지 않아 추정하지 않음. elapsed: 각 runner `[elapsed]`가 직접 제공한 값; catalog/retention 기존 runner에 없는 값은 미집계이며 임의 복원하지 않음. 실행 환경은 Environment.log에 보존했다.

커밋 수행: 없음(메인 담당). 푸시 가능: 아니오(미승인·메인 인계 전). 푸시 수행: 없음.
