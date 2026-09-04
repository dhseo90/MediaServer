# v4.1.0 로컬 개발 증적

이 문서는 v4.1.0 단계별 구현 위치와 직접 실행한 local 검증을 기록한다. local verifier
PASS는 UI 풀테스트, 30분/120분 장시간 테스트, PR/main merge, tag, GitHub Release 또는
published metadata 완료를 뜻하지 않는다.

## S05 후속 GStreamer 환경 보완 — 수정·제한 범위 재검증 통과

2026-09-04 최초 환경 검증의 17개 중 runner 12개 실패 후 사용자 승인으로 수정·재개했다.
`env_common.sh`의 Bash 3.2 빈 배열·상속 경로 치환, `gst_environment_test.py`의 실경로와
원인별 거부 검증, `gst_plugin_cache.py`의 `.so` 보존·root 순서를 보완했다.
`server.sh`의 환경 초기화는 S02~S05 녹화 검증으로 한정했다. S05 등록기의 고정 총계
오류도 별도 승인 후 수정해 기존 canonical 986개/S05 27개 검증과 환경 13개를 분리했다.

최종 환경 단위 20/0, 실제 macOS cold/warm 1525 features 일치·stderr 0, 필수 factory
44개 생성·WebRTC READY·무음 H264 decode·동일 basename plugin 우선순위가 통과했다.
S05는 C++ 140/0, application 7/0, runtime 20/0, mutation 2/0, 등록기 34/0,
action 27/0(check 89개), 제품 증분 build가 통과했다. 소스 감사 51/0·기존 승인 986개,
중앙 inventory 18/0, script inventory 11/0, 문서 링크·asset 검증도 통과했다.

이는 한 대의 macOS arm64에서 수행한 제한 범위 검증이다. 실제 Linux/Intel/다른 PC 설치,
launchd 서비스·브라우저·장시간 검증은 미실행이다. SSIM blacklist 1개의 원인은 미확인으로
남긴다. GTK/GI 경고 해소를 모든 플러그인·모든 PC 호환성 완료로 확대하지 않는다.
최초 실패·수정 파일/함수·개별 실행·cleanup은 [저장소 테스트 기록](release-test-records.md)에
보존했다. 패키지/전역 설정·C++ 녹화 로직·S06 이후는 변경하지 않았으며 커밋·푸시는 미수행이다.

## V410-S05 이벤트 녹화 연결과 파생 clip

### 테스트 범위와 승인 경계

| 테스트 카테고리 | 판정 | 직접 근거 | 근거 파일/행/기능 ID | 실행 승인 상태 |
| --- | --- | --- | --- | --- |
| 안정화 테스트 | 진행 대상 | S05 구현 후 관련 검증 지시와 단계 종료 조건 | `event_recording_bridge.cpp`, `event_clip_deriver.cpp`, `AGENTS.md` 3.5·7.6.2 | S05 focused·S01~S04 회귀·build·문서·인벤토리 범위 실행 |
| 30분 테스트 | 진행 대상 | 버전 개발 종료·릴리즈 완료 필수 evidence | `AGENTS.md` 7.6.2 | 별도 실행 승인 없음, 미실행·릴리즈 blocker |
| UI 풀테스트 | 진행 대상 | 버전 개발 종료·릴리즈 완료 필수 evidence | `AGENTS.md` 7.6.2 | 별도 실행 승인 없음, 미실행(판정 FAIL)·릴리즈 blocker |
| 120분 테스트 | 진행 대상 | writer cleanup과 application drain/lifecycle 직접 변경 | `gstreamer_segment_writer.cpp`, `media_server_application.cpp`, `AGENTS.md` 7.6.2 조건 4 | 별도 실행 승인 없음, 미실행; focused PASS로 대체 불가 |

### 구현과 직접 검증

- 현재 상태: S05 local 구현·개별 등록·재실행·독립 인벤토리 재결속 검증 완료.
  아래 최초 실행 이력은 당시 등록 누락 FAIL을 소급해서 지우지 않는다.
  등록 보정 당시 재검증은 C++ 140/0, application-only 7/0, 등록기 단위 16/0, 개별 동작 27/0
  (당시 check 69개), 소스 감사 51/0, 승인 986개, 구현 오류 0·negative 15/15,
  중앙 inventory 18/0, coverage 8/0이다.
  [개별 결과 및 독립 검토 기록](release-test-records.md)을 최종 증거로 사용한다.
- S05 잔여 통합 검증 완료(선행 커밋 `d7ee14a1` 이후):
  `event_storage_recording_runtime_smoke.cpp`의 `VerifyAdmission`/`VerifyRecovery`와
  `verify_v410_event_storage_recording_runtime.mjs`를 기존 S05 dispatch에 연결했다.
  실제 EventStorage queue=2에 이벤트 5개를 접수해 2개가 퇴출되더라도 5개 PTS 연결이
  유지되며, JSONL 비활성은 파일 없음·stored=0, 활성은 event 0/3/4만 stored=3이다.
  각 모드의 새 프로세스가 원래 SQLite 대신 journal로 새 primary를 재구축하고,
  후행 H264 source의 UTC 매핑 후 퇴출 이벤트까지 실제 clip 5개를 파생한다.
  재접수는 같은 derived ID를 유지한다. 고정 설정·시각·가용량과 worker latch는 시험 장치이며 제품 코드는
  추가 변경하지 않았다. 전체 서버/HTTP/환경변수 파싱/라이브 입력 재시작의 증거는 아니다.
  최종 정식 실행은 C++ 140/0, application 7/0, runtime 20/0, source mutation 2/0,
  등록기 단위 26/0, 개별 동작 27/0(check 89개)다.
  [통합 개별 결과](release-artifacts/v4.1.0/20260904-s05-runtime/individual-results.json)에
  실제 assertion·check·소스 SHA와 cleanup을 보존한다. 독립 검토의 mutation 로그 누락
  대조 지적 1건도 TDD RED 후 보강해 CLOSED했다. 기존 canonical 986개 직접 결박은
  변경되지 않아 새로운 승인 원장 이행은 하지 않았다.
- 구현 위치:
  - `event_storage.h/.cpp`, `event_storage_application_service.*`,
    `webrtc_http_server_ops_incidents.cpp`: optional event 시간축/anchor/epoch와 recording
    link/completeness, JSONL 저장과 독립된 bridge dispatch, derived 우선·bounded
    frame-buffer fallback
  - `analysis_session_read_application_service.h`,
    `analysis_session_read_application_adapter.cpp`: analysis session의 event 시간축/UTC·PTS
    anchor/stream epoch를 application 경계 양방향에 보존
  - `event_recording_bridge.h/.cpp`: event ID별 bounded 비동기 job과 durable pending 재흡수,
    추정 없는 PTS→UTC 변환, finalized continuous overlap, source lease, SHA-256 결정 ID,
    pending 재시작 복구, remux 중 admission lock 해제, terminal resource-release 재시도
  - `event_clip_deriver.h/.cpp`: 검증된 video-only H.264/MP4 overlap seek/remux,
    source와 output fd 결박, MPEG-TS 순차 출력, owner-only output/inode 재검증,
    UUID partial을 결박한 durable v2 cleanup marker, no-replace publish/fsync/SHA-256, 실제 packet timestamp로
    측정한 keyframe 확대 범위. VP8/WebM event 파생은 fail-closed
  - `recording_catalog.*`, `recording_contracts.*`, `retention_coordinator.*`: event link/segment
    조회, 일괄 hold lease, 동일 event ID 충돌 방지, Event 전용 quota reservation·oldest-first,
    optional actual range/미해석 media PTS/fallback locator/derivation mode/time basis/
    completeness reason와 SQLite/JSONL projection, terminal link 전 derived output hold
  - `media_server_application.cpp`: ingress 전 recording bridge 등록과 ingress → continuous
    finalize → EventStorage drain → event bridge drain/해제 종료 순서
  - `event_recording_link_smoke.cpp`, `verify_v410_event_recording.sh`, `server.sh`,
    `CMakeLists.txt`: 실제 H.264/MP4 source→MPEG-TS remux를 포함한 focused verifier와
    제품 build 연결
- RED/수정 확인: 신규 구현 부재 compile 실패 뒤 async 이동 ID, status/reason 분리,
  canonical `/tmp` root와 GStreamer 출력 fd 경계를 재현해 수정했다. Matroska 시도는 seek 뒤
  header가 없는 산출물을 만들어 실제 demux 검증이 실패했으며, pre-opened fd에 순차 쓰기가
  가능한 MPEG-TS로 바꿔 끝까지 재생 가능한지 확인했다. SQLite primary에서 같은 event
  link의 overlap/fallback 갱신 projection이 유지되는 회귀 항목도 추가했다.
- GREEN 확인:
  - `./server.sh verify-v410-event-recording`: C++ `pass=140 fail=0`
    - 같은 명령의 EventStorage application-only 계약: `pass=6 fail=0`
  - `./server.sh verify-v410-recording-contracts`: `pass=45 fail=0`
  - `./server.sh verify-v410-recording-retention`: `pass=56 fail=0`
  - `./server.sh verify-v410-recording-catalog`: C++ `pass=45 fail=0`, composition 정적 항목 9건 PASS
  - `./server.sh verify-v410-recording-recorder`: `pass=71 fail=0`
  - `./server.sh build`: `media_server_runtime`, `media_server` 100% PASS
- 개별 확인: 3개 segment overlap 순서와 반개구간 경계, PTS anchor UTC 변환,
  derive 중 hold/완료 후 해제, 동일 event 중복 방지, 정확한 missing range와 fallback,
  불명확 시간축 PTS 보존·segment mapping 복구, event quota가 continuous를 삭제하지 않는 경계,
  policy 제거 중 reservation 보존, SQLite link 갱신,
  restart에서 이미 finalized된 결정적 event segment 재연결, 다른 channel/class의 동일
  segment ID 충돌과 tombstone ID 재사용 거부, 96자 초과 공통 prefix ID 비충돌, queue가
  EventRecord를 버리기 전 catalog link 선행 기록과 pending 재흡수, 같은 process에서 anchor 없는
  PTS가 finalized segment 추가 뒤 재dispatch 없이 완료되는 복구, complete event 범위 확장 시
  새 결정 segment 파생, 긴 remux 중 다른 event admission 비차단, cleanup/terminal resource 해제
  실패의 hold·reservation 유지와 재시도, 빈 epoch의 ID 계산 전 source epoch 고정,
  hold overflow 거부, pending derived
  hold 재구성, overlap/missing exact partition, 실제 H.264/MP4 다중 source의 무재인코딩
  MPEG-TS remux·재생 가능성·checksum·cleanup marker·no-replace·실측 actual range, foreign final/
  fixed partial 보존, v2 marker 소유 crash partial만 정리한 뒤 재파생, hardlink partial
  fail-closed와 orphan 진단, terminal complete 기록 전 source/output 삭제 차단,
  marker/terminal 중 event·fallback 갱신의 단계 보존과 내구 UTC 확장 요청 round-trip/후속 파생,
  cleanup 복구 중 확장 요청의 Partial/Failed 수렴, anchor 없는 PTS complete 후 범위 확장,
  미해석 후속 PTS의 별도 내구 기록·round-trip과 후행 segment/worker 재시작 복구,
  VP8/WebM fail-closed
- 재검토 RED/수정(2026-09-04): cleanup 대기 중 UTC 확장을 보존한 상태에서 실패 전이가
  계약에 거부되는 회귀(`pass=62 fail=1`)와 anchor 없는 PTS의 complete 이후 확장 유실
  (`pass=65 fail=1`)을 재현했다. finalized 파생물이 없으면 재파생 전에 보류 요청을
  소비하고, PTS 후속 요청은 기존 epoch의 segment map으로 변환하거나
  `deferred_media_pts_range_ms`에 내구 보존하도록 수정했다. 최종 focused `140/0`과
  독립 정적 재검토에서 두 Important의 해소를 확인했다.
- 실행 경고: macOS GStreamer plugin scanner가 기존 GI/GTK 경고를 출력했지만 실제 remux와
  smoke 본체는 `140/0`으로 종료했다. 경고 자체는 해결 완료로 기록하지 않는다.
- 역사적 gate 경계: `verify-v390-event-storage-application-boundary` 전체 명령은 v3.9.0
  branch와 당시 exact 구조 graph를 함께 요구하므로 현재 브랜치에서 application 계약
  `6/6 PASS`, 역사적 구조 결박은 신규 S05 파일의 inventory 재결합 전 FAIL이었다. 기본
  명령의 의미는 바꾸지 않고
  `--application-only`를 추가해 S05 verifier가 DTO/mapping/transport/queue 선행 내구 기록/
  fd-bound 출력/compiled matrix 6개만
  현재 회귀 gate로 실행한다. 이를 v3.9 구조 gate PASS로 확대 해석하지 않는다.
- 인벤토리 위치 이행의 첫 준비 이력: 기존 proof 중 중복 anchor 때문에 자동 위치 이동이 안 된 22개 ID의
  role/edge 위치를 HEAD 대비 diff로 대응시켰다. feature 계약·anchor·심볼·검증 의미는
  바꾸지 않았다. fresh candidate는 986개 모두 해석됐으며 semantic digest는 이전과 같다.
  파일/본문 trust 결박이 변한 109개는 자동 승인으로 넘기지 않고 독립 검토 대상으로
  분리하고, 나머지 877개만 strict-equivalent 이전 승인 이행 대상으로 둔다.
- 최종 인벤토리 이행: S05 정식 등록 27개를 기존 canonical 986개와 분리하고 중앙
  검사에 필수 연결했다. 이 연결로 바뀐 SAFE-064/071/200까지 포함해 독립 검토 112개,
  carry 874개를 공식 producer로 적용했다. 독립 검토에서 현재 anchor/edge와 562개 bounded
  본문을 확인했고 I01 owner·I14 EOS check·I02 정적 disabled guard 판정의 세 지적을
  수정 후 재검토했다. 실제 JSONL 비활성·포화 장시간 운용 PASS로 확대하지 않는다.
- 미실행/비대체: S06 timeline API/UI, S07 검색 관측, S08 recovery/compatibility 종합 gate,
  S09 안정화, 실제 UI 풀테스트, 30분/120분, field smoke, published metadata,
  PR/main/tag/GitHub Release
- 회귀 가능성: 긴 keyframe 간격의 actual range 확대, MPEG-TS 소비자 호환성,
  VP8/WebM event 파생 미지원에 따른 frame-buffer fallback 의존, catalog finalize/cleanup
  장애에서 marker/hold/reservation을 fail-closed로 유지하는 경계, GStreamer plugin 설치
  drift. 전용 verifier와 S01~S04 회귀 묶음으로 방어

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
  예약 유지, 재시작 시 catalog가 추적 media는 보존하고 미추적 partial과 마커만 정리하며
  소유권을 증명할 수 없는 final은 삭제하지 않고 orphan 진단에 남긴다. 안전 제거가
  불가능하면 open을 거부하는 복구
- 실행 경고: macOS GStreamer plugin scanner가 GI/GTK 동적 라이브러리 경고를 출력했지만
  recorder smoke 본체는 `67/0`으로 종료했다. 경고를 기능 PASS로 숨기거나 해결 완료로
  기록하지 않는다.
- 미실행/비대체: S06 timeline API/UI, 실제 UI 풀테스트,
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
