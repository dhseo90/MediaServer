# v4.1.0 로컬 개발 증적

이 문서는 v4.1.0 단계별 구현 위치와 직접 실행한 local 검증을 기록한다. local verifier
PASS는 UI 풀테스트, 30분/120분 장시간 테스트, PR/main merge, tag, GitHub Release 또는
published metadata 완료를 뜻하지 않는다.

## V410-S04 등급별 순환 보존과 disk reserve

- 상태: local focused PASS
- 구현 위치:
  - `retention_coordinator.h/.cpp`: catalog snapshot 기반 순수 `Plan`, 등급별 quota·기간,
    `(end_utc_ms, segment_id)` oldest-first, continuous 우선 reserve 정리와
    `RequestDeletion → unlink → CompleteDeletion` 실행 경계, pending 재시도,
    채널별 pending 격리, 채널 간 in-flight 용량 예약과 실제 쓰기 진행량 정산,
    `openat`/`unlinkat` dirfd 결박 삭제
  - `recording_catalog.h/.cpp`, `recording_contracts.h/.cpp`: retention snapshot,
    process-lifetime `hold_count`, 삭제 완료 시 media locator 제거, retention class가 포함된
    additive tombstone와 SQLite/in-memory projection parity, SQLite 투영 실패 즉시
    `jsonl-fallback` 전환과 재시작 journal rebuild
  - `recording_runtime_defaults.h`, `recording_runtime_config_data.h`, `app_config.cpp`:
    `MEDIA_SERVER_RECORDING_RESERVED_FREE_BYTES`,
    `MEDIA_SERVER_RECORDING_RETENTION_INTERVAL_MS` 기본값·검증·환경변수 로드
  - `source_view_registry.*`, `source_view_application_service.*`,
    `product_ui_ops_sources_script.cpp`: `continuousMaxBytes/continuousMaxAgeMs`와
    `eventMaxBytes/eventMaxAgeMs` 분리 저장, 기존 `quotaBytes/retentionDays` 호환 이행,
    viewer-safe 비노출
  - `gstreamer_segment_writer.*`, `recording_supervisor.*`,
    `media_server_application.cpp`: segment-open admission, 채널별 policy reconcile/주기 정리,
    공간 부족 시 해당 writer만 keyframe 쓰기 보류, container overhead를 포함한 segment
    예약 상한, partial/final 실제 크기 보고, finalize/실패 시 reserve 반환,
    cleanup 전 dirfd·`O_NOFOLLOW|O_EXCL` 결박 fsync 내구 마커, 안전한 unlink/truncate,
    회복 시 새 epoch 재개
  - `recording_retention_smoke.cpp`, `verify_v410_recording_retention.sh`, `server.sh`,
    `CMakeLists.txt`: 실제 C++ focused verifier와 제품 runtime 연결
- RED 확인:
  - 최초 `./server.sh verify-v410-recording-retention`은
    `src/recording/retention_coordinator.cpp` 부재로 compile 실패
  - source 등급별 설정과 writer admission test 추가 뒤에는 해당 config/policy/callback 심볼
    부재로 compile 실패
  - 안전성 보강 RED에서 `CompleteContinuousWrite`/`media_root` 계약 부재로 compile
    실패했고, 음수·비정상 quota 입력은 recorder smoke `fail=2`를 확인
- GREEN 확인:
  - `./server.sh verify-v410-recording-retention`: `pass=56 fail=0`
  - `./server.sh verify-v410-recording-recorder`: `pass=67 fail=0`
  - `./server.sh verify-v410-recording-catalog`: C++ `pass=37 fail=0`, supervisor/composition
    정적 항목 8건 PASS
  - `./server.sh verify-v410-recording-contracts`: `pass=45 fail=0`
  - `./server.sh build`: `media_server_runtime`, `media_server` 100% PASS
- 개별 확인: continuous/event quota·기간 상호 비침범, 예상 segment 크기를
  포함한 oldest-first 선회, pinned/hold·hold overflow 보호, journal/unlink/tombstone 각 실패
  경계, pending idempotent 복구와 채널별 실패 격리, reserve continuous 우선,
  실제 병렬 채널 중복 예약 차단, partial 물리 사용량 이중 차감 방지,
  삭제 불가 채널의 `storage-blocked`, 공간 회복·새 epoch, tombstone 존치와
  media/locator 제거, replay containment와 dirfd 결박 unlink 경쟁 조건 방어,
  event quota 초과와 continuous admission 분리, SQLite projection 장애 폴백/재구축,
  legacy source policy 이행, Ops 복제 시 event 보존 정책 유지, 예약보다 큰 실제 EOS 파일과
  catalog callback 실패의 catalog 전 cleanup, 삭제·truncate 동시 실패 시 예약·내구 마커 유지,
  symlink/hardlink 마커 선점 시 외부·공유 inode 불변, catalog 성공 뒤 마커 제거 실패 시
  예약 유지, 재시작 시 catalog가 추적 media는 보존하고 미추적 orphan과 마커는 정리하며
  안전 제거가 불가능하면 open을 거부하는 복구
- 실행 경고: macOS GStreamer plugin scanner가 GI/GTK 동적 라이브러리 경고를 출력했지만
  recorder smoke 본체는 `67/0`으로 종료했다. 경고를 기능 PASS로 숨기거나 해결 완료로
  기록하지 않는다.
- 미실행/비대체: S05 event linker/파생 clip, S06 timeline API/UI, 실제 UI 풀테스트,
  30분/120분 장시간 녹화, disk-full 실장비 field smoke, published metadata,
  PR/main/tag/GitHub Release
- 회귀 가능성: filesystem 여유 공간 조회와 container overhead 예약치의 편차,
  cleanup 마커 복구 시 디렉터리 권한·I/O 실패가 catalog open blocker가 되는 경계,
  source policy legacy 이행 drift, GStreamer keyframe 간격이 긴 채널의 재개 지연.
  pending은 다음 retention tick에서 재시도하고, focused retention/recorder/catalog verifier와
  제품 build로 현재 S04 경계를 방어

## V410-S03 JSONL 원장, SQLite projection과 supervisor wiring

- 상태: local focused PASS
- 구현 위치:
  - `recording_journal.h/.cpp`: mutation envelope, 6종 type, mutex append/write/fsync,
    corrupt/truncated replay report
  - `recording_catalog.h/.cpp`: `RecordingStorePort` 구현, idempotent memory projection,
    SQLite schema v1/WAL/FK/index, JSONL fallback, 손상 DB 격리/rebuild, orphan 분류
  - `recording_supervisor.h/.cpp`: 시작 snapshot, source 저장 callback, 5초 safety reconcile,
    policy revision idempotency와 channel recorder lifecycle
  - `media_server_application.cpp`: journal→catalog→session→supervisor→ingress 시작 순서와
    ingress→supervisor finalize→EventStorage 종료 순서
  - `recording_catalog_smoke.cpp`, `verify_v410_recording_catalog.sh`, `server.sh`:
    C++ recovery/parity test와 composition order 확인
- RED 확인: 최초 verifier는 `recording_journal.cpp`, `recording_catalog.cpp` 부재로 실패
- GREEN 확인:
  - `./server.sh verify-v410-recording-catalog`: C++ `pass=24 fail=0`, supervisor/composition
    정적 항목 8건 PASS
  - `./server.sh verify-v410-recording-recorder`: `pass=38 fail=0`
  - `./server.sh verify-v410-recording-contracts`: `pass=45 fail=0`
  - `./server.sh build`: 제품 runtime/executable 100% PASS
- 개별 확인: 동일 mutation 중복 replay, 마지막 truncate, 중간 corrupt, SQLite on/off query
  parity, event link FK 위반 무기록 rollback, 정상/손상 final media orphan, 손상 SQLite 원본
  격리와 journal rebuild, 저장 callback/5초 reconcile/revision idempotency, 시작·종료 순서
- 미실행/비대체: S04 순환 삭제, event runtime 연결, timeline API/UI, UI 풀테스트,
  30분/120분, published metadata, PR/main/tag/GitHub Release
- 회귀 가능성: journal append 후 projection 실패 시 재시작 replay에 의존하는 경계,
  SQLite compile-time on/off drift, source policy revision 누락, shutdown 순서 역전.
  focused catalog/recorder verifier와 제품 build로 방어

## V410-S02 채널 정책, Recorder subscriber와 segment writer

- 상태: local focused PASS
- 구현 위치:
  - `include/core/recording_runtime_defaults.h`,
    `include/core/recording_runtime_config_data.h`, `include/app_config.h`, `src/app_config.cpp`:
    default-off 전역 설정, 전용 root, quota, 10초 segment와 storage layout validation
  - `include/ingress/source_view_registry.h`, `src/ingress/source_view_registry.cpp`,
    `source_view_application_service.*`, `webrtc_http_server.cpp`,
    `product_ui_ops_sources_script.cpp`: nested recording policy의 create/upsert/save/load/snapshot/
    Ops form round-trip, 저장 후 callback, viewer-safe quota/path 비노출
  - `include/core/shared_stream.h`, `src/core/shared_stream.cpp`, `StreamRegistry`,
    `SessionManager`: Recorder 역할, client/analysis/recorder 독립 계수와 queue
  - `segment_writer.h`, `gstreamer_segment_writer.*`: H.264/MP4·VP8/WebM keyframe segment,
    `.partial`→final atomic rename, checksum, PTS rollback epoch
  - `recording_session_service.*`: auxiliary stream acquire/subscribe/start와 detach/release 순서
  - `recording_segment_writer_smoke.cpp`, `verify_v410_recording_recorder.sh`, `server.sh`:
    실제 encoded fixture 기반 focused verifier
- RED 확인:
  - 최초 verifier는 `gstreamer_segment_writer.cpp` 부재로 실패
  - 첫 구현 후 GStreamer 미포함 `-Werror` 경계와 VP8 intermediate parser 경로가 실패했고,
    미포함 fail-closed와 `video/x-vp8 → webmmux` 직접 경로로 수정
- GREEN 확인:
  - `./server.sh verify-v410-recording-recorder`: `pass=38 fail=0`
  - `./server.sh build`: `media_server_runtime`, `media_server` 100% PASS
- 개별 확인: global/source/channel disabled, quota 0, 녹화/media root 중복, source policy
  round-trip, 저장 실패 callback 미호출, viewer-safe 비노출, 역할별 subscriber 계수,
  느린 recorder queue 격리, H.264/VP8 delta-start 차단, 10초 뒤 keyframe 분할,
  `.partial`/final callback 순서, PTS rollback 새 epoch
- 미실행/비대체: UI 풀테스트 직접 조작, 30분/120분, S03 catalog/recovery,
  순환 삭제/event 연동/timeline, external field smoke, published metadata, release action
- 회귀 가능성: source policy revision 누락, client quota/path 노출, codec caps와 muxer drift,
  recorder detach lease 불균형. focused C++ verifier와 제품 build로 방어

## V410-S02 전 선행 인벤토리 정합성 부채

- 상태: local focused PASS
- 구현 위치:
  - `docs/project-feature-test-inventory.md`: current release 목표를 `v4.1.0`으로 pin하고
    S00/S01 현재 범위와 후속 `REC-*` ID 추가 시점을 분리
  - `test/fixtures/manual_ui_fulltest_va_seed_matrix.json`,
    `scripts/internal/verify_project_feature_test_inventory.mjs`: 수동 UI 준비 fixture를
    current `v4.1.0`, latest published `v4.0.0`으로 정렬
  - `scripts/internal/verify_v290_release_test_records_enforcement.mjs`:
    Markdown 표의 pass/fail 결과 열만 검사하고 상태표는 분리하는 parser와 양·음성 self-check
  - `docs/release-test-records.md`: historical 개발 상태표 다섯 곳을 pass/fail 결과표와 분리
  - REVIEW4 audit/approval/implementation/native exact fixture: 공식 migration-aware producer로
    980행 strict carry-forward와 6행 독립 검토를 원자 반영
- RED 확인:
  - `verify-project-inventory`: current inventory/seed pin과 published seed 기준 실패
  - `verify-v290-release-test-records-enforcement`: 상태표 `미실행`을 결과 셀로 오인
  - `verify-feature-inventory-coverage`: REVIEW4 trust binding drift로 실패
- GREEN 확인:
  - `verify-v290-release-test-records-enforcement`: 8/0
  - `verify-project-inventory`: 17/0
  - REVIEW4 migration: 986행 중 carry-forward 980, independent-review
    `UI-019`, `SAFE-064`, `SAFE-071`, `SAFE-075`, `OPS-041`, `OPS-045`
  - `verify-feature-implementation-evidence`: 986/986와 negative fixture 전부 PASS
  - `verify-feature-inventory-coverage`: 986/986 exact mapping, 테스트 영역 7/7
- 독립 검토 경계: UI 테마, V280/V290 역사적 inventory, V290 기록 분리의 각
  owner→dispatch→action→state→readback→verifier 의미를 행 단위로 확인했다. whole-file
  또는 inventory pin 변경을 다른 기능 승인으로 확장하지 않는다.
- 미실행/비대체: 실제 UI 풀테스트, 30분/120분, field smoke, published metadata,
  release action
- 영향 범위: 내부 inventory/fixture/verifier/REVIEW4 evidence만 변경한다. C++ 제품 로직,
  API/schema/event payload, RTSP/WebRTC media path, 제품 UI 동작은 변경하지 않는다.

## V410-S01 녹화 v1 영속 계약과 golden fixture

- 상태: local focused PASS
- 구현 위치:
  - `include/recording/recording_contracts.h`, `src/recording/recording_contracts.cpp`:
    `RecordingSegmentV1`, `FrameLocatorV1`, `EventRecordingLinkV1`,
    `AnalysisObservationV1`, `RecordingTombstoneV1`의 strict parser와 정규 serializer
  - `include/recording/recording_store_port.h`: 세그먼트 finalize, 이벤트 연결, 분석 관측,
    삭제 요청·완료와 시간 범위 조회의 내부 port. filesystem path는 finalize 인자로만 전달
  - `test/fixtures/recording/v1/*.jsonl`: segment/event link/observation/tombstone v1
    golden fixture. segment fixture는 알 수 없는 optional field를 포함
  - `scripts/internal/recording_contract_smoke.cpp`,
    `scripts/internal/verify_v410_recording_contracts.sh`, `server.sh`: 실제 C++ compile/run
    verifier와 dispatch
  - `CMakeLists.txt`: `src/recording/recording_contracts.cpp`를 제품 runtime target에 연결
- 계약 원칙:
  - ID는 경로·빈 값·SQLite rowid가 아닌 opaque string이며 tombstone이 남은 segment ID는
    재사용하지 않는다.
  - 시간 범위는 UTC millisecond 반개구간 `[start, end)`이고 PTS와 timebase를 함께 보존한다.
  - 재생 가능 상태는 `finalized` 하나뿐이다. 알 수 없는 lifecycle은 호환 읽기 후
    `Unknown`으로 내리고 재생 가능 상태로 승격하지 않는다.
  - v1의 알 수 없는 optional field는 무시하고 known field를 보존한다. v1 변경은 additive
    optional field만 허용하고 breaking 변경은 새 schema version과 별도 fixture로 추가한다.
  - rebuild는 v1 JSONL record를 parser로 다시 읽는 방식이며, tombstone을 삭제의 최종
    기록으로 적용한다. v1 golden fixture는 후속 버전에서 덮어쓰지 않는다.
  - 공개 JSON에는 filesystem path를 직렬화하지 않는다.
- RED 확인:
  - 최초 `./server.sh verify-v410-recording-contracts`는 제품 구현 전
    `src/recording/recording_contracts.cpp` 부재로 exit 1 실패
- GREEN 확인:
  - `./server.sh verify-v410-recording-contracts`: `pass=45 fail=0`
  - `./server.sh build`: `media_server_runtime`, `media_server` 100% PASS
  - `./server.sh verify-docs-links`: 최초 내부 release evidence 문서가 공개 문서 색인 필수
    대상으로 잘못 분류돼 failure 1. 공개 색인 제외 정책과 verifier를 일치시킨 뒤
    Markdown 218개, local link 980개, failure 0 PASS
  - 확대 확인에서 `verify-project-inventory`, `verify-feature-inventory-coverage`,
    `verify-v290-release-test-records-enforcement`는 FAIL. 별도 clean clone의 시작 commit
    `b55f4bf0`에서도 각각 v4.1 inventory/seed 미정렬과 REVIEW4 trust binding 2건,
    기존 `| 미실행 |` cell로 동일하게 실패함을 확인했다. S01 회귀나 완료 evidence로
    사용하지 않고 후속 정합성 부채로 분리
- 개별 확인 항목:
  - opaque ID 정상/빈 값/path/SQLite rowid 4건
  - UTC 반개구간 겹침/맞닿음/빈 범위 3건
  - unknown optional field known-value 보존, PTS/timebase exact round-trip,
    public JSON path 비노출
  - unknown lifecycle 호환 parse, `Unknown` 보존, 비재생 3건
  - segment 2건, event link 1건, observation 1건, tombstone 1건의
    parse → canonical serialize → parse → serialize parity
  - tombstone segment ID 재사용 거부와 신규 ID 허용
- 미실행/비대체: 실제 녹화, 파일 쓰기, SQLite/JSONL store, recorder subscriber,
  event clip 생성, timeline API/UI, UI 풀테스트, 30분/120분 장시간 테스트,
  external field smoke, published metadata, release action
- 영향 범위: 새 `recording` C++ 계약과 내부 store port, fixture, focused verifier만 추가.
  기존 API/schema/event payload와 RTSP/WebRTC media path, 제품 UI 동작은 변경하지 않음
- 회귀 가능성: 후속 writer가 반개구간·PTS/timebase·lifecycle·tombstone 불변 조건을
  우회하거나 v1 fixture를 덮어쓸 위험. focused verifier와 제품 build로 S01 경계를 방어.
  release evidence를 공개 색인으로 오분류할 위험은 docs link verifier의 명시적 pattern으로 방어

## V410-S00 표준·오픈소스·IP 게이트와 source baseline

- 상태: local focused PASS
- 구현 위치:
  - `VERSION`, `CMakeLists.txt`: source target `4.1.0`
  - `README.md`, `README.en.md`, `docs/README.md`, `docs/en/README.md`,
    `docs/development-backlog.md`, `docs/versioning-policy.md`, `docs/release-policy.md`,
    `docs/public-repo-final-review.md`, `docs/ui-guide.md`, `docs/assets/ui/README.md`:
    current source와 latest published baseline 분리
  - `config/docs_ui_assets.json`, `scripts/internal/verify_docs_ui_assets.mjs`:
    current source `4.1.0`, latest published `v4.0.0`, 기존 캡처·직접 검수 날짜 보존
  - `docs/v410-v49-recording-search-roadmap.md`: S00 완료 및 S01~S09 미착수 경계
  - `docs/research/v410-recording-storage-open-source-review.md`: 공개 표준·revision·license·참고 범위
  - `docs/research/v410-recording-ip-risk-gate.md`: 접근별 허용/재설계/보류와 clean-room 차단선
  - `scripts/internal/verify_v410_research_gate.sh`: 자료별 provenance와 IP 차단선 검증
  - `scripts/internal/verify_v410_entry_baseline.sh`: branch/source/current roadmap/published baseline 검증
  - `scripts/internal/verify_release_metadata_consistency.mjs`: source `v4.1.0`과 published
    `v4.0.0` 분리, v4.0.0 release note source 보존
  - `server.sh`: 두 focused verifier dispatch
- RED 확인:
  - `./server.sh verify-v410-research-gate`: 조사 문서 부재로 예상 실패
  - `./server.sh verify-v410-entry-baseline`: source `4.0.0`과 문서 미정렬로 예상 실패
- GREEN 확인:
  - `bash -n scripts/internal/verify_v410_research_gate.sh scripts/internal/verify_v410_entry_baseline.sh`:
    PASS
  - `./server.sh verify-v410-research-gate`: PASS, source record 8개, IP 접근 결정 5개,
    특정 특허 상세 반입 `false`, 법률 의견/FTO 대체 안 함
  - `./server.sh verify-v410-entry-baseline`: PASS, `pass=33 fail=0`
  - `./server.sh verify-release-metadata`: 최초 `source-only/live-only` 정책 문구 누락으로
    `pass=17 fail=1` FAIL, 문구 복원 후 `pass=18 fail=0` PASS
  - `./server.sh verify-docs-ui-assets`: 최초 manifest source/published pin 불일치로
    `pass=9 fail=1` FAIL, manifest와 검증 상수 정렬 후 `pass=10 fail=0` PASS
  - `./server.sh verify-script-inventory`: 최초 S01~S09 planned verifier ID가 현재 실행
    명령처럼 적혀 `pass=10 fail=1` FAIL. 가짜 dispatch를 만들지 않고 구현계획의 미래
    명령을 `planned-command`로 명시한 뒤 `pass=11 fail=0` PASS
  - `./server.sh verify-docs-links`: PASS, Markdown 218개, local link 979개, failure 0
  - `git diff --check`: PASS
- 미실행: 제품 build, 안정화 묶음, UI 풀테스트, 30분/120분 장시간 테스트,
  external TURN/WHEP, ONVIF 실기기, 외부 VLM/provider, published metadata
- 비범위: V410-S01~S09 기능 구현, 녹화 API/schema/media path/UI 변경
- 영향 범위: source/release metadata, 공개 문서, 조사 기록, local verifier dispatch만 변경.
  C++ 제품 로직, 기존 API/schema/event payload, RTSP/WebRTC media path, 제품 UI 동작은 변경하지 않음
- 회귀 가능성: current source/published tag 분리 문구와 UI asset manifest pin drift. S00 entry,
  release metadata, docs UI asset, docs link, script inventory verifier로 방어
