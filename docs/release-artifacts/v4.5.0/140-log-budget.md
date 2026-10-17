# R140 source-derived log budget

**판정: HOLD_45_LOG_BUDGET_PROOF_GAP.** 정상45분 cap 초과도, cap 내 수집도 아직 증명되지 않았다. 제품 실행은0회다. 아래 숫자는 출력 transport 상한이며 동시에 도달 가능한 정상 workload 최대값이 아니다. null/unknown을0으로 합산하지 않는다.

| Prefix | 위치/활성 | 한 줄 bytes | 횟수 계약 | captured bytes 상한 | 삭제 영향 | 필수/overflow |
|---|---|---:|---|---:|---|---|
| memory-attribution | include/recording/recording_memory_diagnostic_output.h; recording_resource_trace.h / True | 16383 | Poll >=5s; four boundaries; <=580 over2880s, <=544 over2700s including boundaries; seq cap1600 | 9502140 | retired/model/counter changes affect width; actual maximum row unknown | R139 strict required; Emit refuses before sink if formatted bytes>=16384; missing pair/final caught |
| recording-resource | include/recording/recording_resource_trace.h / True | 1023 | same rows as owner, not a second timer | 593340 | reservation/reject/cleanup changes scalar width | required; buffer/fwrite invalid -> false; phase/sequence/owner pairing checked |
| recording-completion + recording-evidence | include/recording/recording_completion_trace.h; src/recording/evidence_package_store.cpp / True | 511 completion /767 evidence | SHARED4095 regular rows; shared <2MiB budget; at mostone terminal loss | 2097152 | durable finalize, search media/page, evidence/A; no dedicated per-delete message; indirect count not proved | preserved raw; no explicit semantic loss gate in mixed; on cap emits event14 or lost:true, stops this shared stream; parent does not fail on marker alone |
| recording-state | include/recording/recording_state_trace.h / True | None | 128 transition rows + probe/end + oneoverflow (catch errors separate) | None | admission replacements/recovered/deferred can add transitions; delete record != one state line | required summary; overflow/writeError/capture-error detected by recordingStateSummary; safe() stops at240 unless continuation-byte; phase callsite finite, complete byte bound not certified |
| visual-request | include/recording/recording_latency_trace.h:VisualRequestSummary / True | 3071 | <=1024 completed trace rows; 2clients/15s main schedule normally360 but full startup/postloop bound not substituted | 3144704 | current source and index docs/generation change widths, not one row/delete | required probe/end and counts; >1024 ->loss; buffer/IO loss marker consumed |
| visual-preparation | include/recording/recording_latency_trace.h:Preparation / True | 639 | RequestMedia destructor once per active VisualRequestSummary <=1024 (callsite visual_search_application_service.cpp) | 654336 | eligible/reprepare counts may change | raw companion; shares visual-request-loss marker; no extra independent cap |
| visual-frame | src/recording/visual_frame_decoder.cpp:DecodeTrace / True | None | bounded success <=3 (2Automatic+1SoftwareOnly); failure rows not sampled, count unknown | None | new file/index extraction; failed exact target emits independently | required bounded representative; not full frame trace; write/config failure marker fails process capture; arrays32events16factories fixed, edges fixed, final ostream bytes not constrained by16KiB memory cap |
| recording-latency + slow/complete summaries | include/recording/recording_latency_trace.h:SlowSummary / True | 511 perrow; fixed summary formats | last64 slow completed rows +2summaries on normal shutdown | None | extra delete/retention spans replace ring slots, not unbounded emitted rows | slow summary required; complete summary not explicitly parsed by slowTraceSummary; no slow-count overflow assertion in current mixed consumer; unavailable slow summary fails |
| search-request-cost | include/recording/recording_search_diagnostic.h / True | 6143 | first128 SearchDiagnostic instances; up to40 phases each | 786304 | retries/related revision affect phases/width; no new standalone delete log | preserved timing diagnostic; truncation emits search-cost-loss; direct consumer coverage needs review separately from search-failure |
| search-failure + search-capacity | include/recording/recording_search_diagnostic.h / True | 2047 +511 if capacity failed | one terminal per status>=500 request; no global emit count cap; request workload count coupling not fully proved | None | source-currentness/retention errors possible | failure semantics required; failure loss marker checked; capacity buffer branch may suppress line iftoo long; no forged successful request |
| writer-cost | src/recording/gstreamer_segment_writer.cpp / False | 0 | VERIFY_CATALOG_SUBCOSTS unset in state | 0 | none in this mode | not available in state; not an omission of enabled detailed diagnostics |
| recorder-cost | src/core/shared_stream.cpp / False | 0 | VERIFY_CATALOG_SUBCOSTS unset in state | 0 | none in this mode | not available in state; not an omission of enabled detailed diagnostics |
| R119-admission/R131-periodic/search-capture-cost | src/recording/retention_coordinator.cpp; src/recording/recording_search_source.cpp / False | 0 | VERIFY_CATALOG_SUBCOSTS unset in state | 0 | none in this mode | not available in state; not an omission of enabled detailed diagnostics |
| catalog-holder / visual-phase | include/recording/recording_latency_trace.h / False | 0 | holderoff and short-only detailed phaseoff | 0 | none | not available in state; off |
| generation/checkpoint/deletion_requested/deletion_completed | src/recording/recording_catalog.cpp; src/recording/retention_coordinator.cpp / no dedicated normal stdout emitter | 0 | journal mutations persist; observer is separate process, not product log | 0 | 0 DIRECT stdout bytes for these mutation names; indirect latency/state/resource counted elsewhere | closed journal is independent required evidence; mutation or checkpoint error propagates; no synthetic per-mutation product lines invented |
| recording-v2 discontinuity | src/recording/gstreamer_segment_writer.cpp / True | None | 64 samples per writer lifetime; writer recreation count notproved; input rejected onceperwriter | None | loss/generation boundaries can shorten segments; no unlossy count inference | bounded input-quality observations; cap is intentional sampling; not total loss counter |
| R119 visual-worker-failure / R129 frame-binding | src/recording/visual_index_worker.cpp / False | 0 | SubcostEnabled false in state; enabled mode has16 failed-attempt cap | 0 | candidate sets change when recordings deleted; failure count notproved | first error preserved when enabled; error logs+product readiness semantics; not fixed-success budget |
| A/evidence lifecycle | completion callsites; evidence_package_store.cpp / True | 0 | A main opportunities<=45; all product completion/evidence bytes already in shared group | 0 | retained packages/jobs may affect other owner rows | API state required separately; NO double counting; [A-*] wrapper logs excluded |
| startup/shutdown / LOAD_RESOURCE / uri-source / gst | src/application/media_server_application.cpp; src/core/source_factory.cpp; src/analysis/siglip2_encoder.cpp; server.sh / True | None | banner/startupsource/model/normalshutdown sites; path/config/string sizes not all source-bounded for this task | None | file source initial/sample messages; per-loop no impliedper-delete log | normal shutdown/journal/resource separate evidence; combined capture counts both streams; root/path environment preconditions not fixed byte envelope |
| errors/third-party runtime | reachable GStreamer/ORT/libc plus source errors / conditional | None | no arbitrary error flood bound; abnormal path separately | None | deletion I/O/poison/cleanup faults | first failure + fail closed, not successful45 guarantee; combined4MiB cap kills product; cap expansion forbidden |

# R140 ownership, numeric width and deletion proof obligations

## 고정 근거와 미확정

`SearchState`는 서비스 인스턴스당 하나이며 준비는 preparation_mutex로 직렬화한다. 같은 서비스 snapshot 저장 entries는 최대8/128MiB/5분이다. 이것은 전체 model 개수 상한이 아니다. `RecordingSearchPage::model`과 `ResolveHit` 결과 shared_ptr가 entry 퇴거 후에도 모델을 살린다. source/current와 WithEventFacts/WithPlayback의 준비·기존 모델도 다르며 EvidenceCreate는 snapshot 해제를 늦출 수 있다. 현재/retired visual index는 VisualIndexWorker의 별도2세대 관리이며 structured models 배열에 합산하지 않는다.

이 조사에서는 서버의 동시 처리/요청 종료 이후 잔여 handler와 모든 model 임시값을 합친 정확한 최대 live structured model 수를 증명하지 못했다. 따라서 등록128slot, snapshot8entry, R137 관측7개 어느 것도 정상45분 최대값으로 채택하지 않는다. pool registry16 역시 서비스/현재 요청의 실제 pool 수가 아니다. 아래 계산의 모든128/16slot 사용은 형식 민감도일 뿐이다. 기존640MiB 예약은 bytes 합계를 제한하지만 작은 모델/공유값/요청 개수까지 원하는 숫자로 제한하는 근거는 아니다.

## 숫자폭

| 필드 | 소스/범위 | 운영상 추가 조건 |
|---|---|---|
| memory Now, sample/capture/site/event/expiry | steady_clock epoch nanoseconds ->uint64; 최대20자리 | 시작 uptime, 증분과 snapshot TTL5분을 결속해야 한다. 2700초는 epoch 절대값을 제한하지 않는다. collector는 JS safe integer만 허용한다. |
| latency Now | 독립 함수 내 최초호출 epoch의 상대ns | 정상 전체2880초면 대략13자리지만 memory clock과 동일 epoch가 아니다. |
| PID/thread/request | pid_t/int/unsigned, 형식10자리 | PID 실제값은 실행 전 미정; thread/request sequence는 uint32이며 성공 종료/부하 count와 별도다. |
| revision/identity/created/destroyed/eventSequence | uint64, 최대20자리 | identity는 model와 pool 생성 공유; revision은 journal 변이/rotation과 결합. 시작값과 전체 mutation/call 수 상한 필요. |
| model documents | 유효 Build 한도100000(6자리) | diagnostic registry 형식은 uint64라도 정상 모델은 이 한도. 실패 중간 source documents와 구분한다. |
| reservation bytes/site peak/largest | 실제 공유 한도640MiB(671088640,9자리) | category/site는 같은 ticket의 다른 축. 합산 금지. model 자체64MiB, snapshot pool 전체 entries의 누적 bytes_ 한도128MiB 회계(개별 entry admission 검사와 전체 bytes_ eviction은 별도)와도 구분. |
| ticket count, acquire/release/split totals | uint64 | byte 제한으로 누적 acquire/release 횟수 상한을 얻을 수 없다. 시간만으로 hot-loop 횟수를 생성하지 않는다. |
| allocator inUse/allocated/maxInUse/blocks | 세 bytes 필드는 malloc_statistics_t size_t ->uint64; blocks_in_use는 unsigned ->uint64(최대4294967295) | 공유 예약640MiB와 별개. RSS guard가 VM allocated 상한을 제공하지 않는다. 외부 allocator 상태 필요. |
| RSS/footprint | signed long long; 성공 rusage 비음수 | 런타임 RSS guard는 샘플 기반이며 순간 peak 또는 모든 allocator 분류 상한이 아니다. 미지원 -1은 collector 거부. |
| totals/live/peak | uint64, 고정20/14/14 | 일반 카운터, bytes, clocks가 혼합. 전부20자리로 두는 것은 type envelope이고 정상 공존 증명이 아니다. |

## 삭제와 finalize

2채널 ×2700초 /2초 =2700파일은 **연속 paced·손실 없는 nominal 계산**일 뿐이다. 실제 Source의 반복/generation, 입력 burst, keyframe 대기,116손실 후 구간 분할, 마지막 열린파일 확정은 별도다. 각 finalize를2초벽시계에 묶는 hard upper bound는 이 조사에서 확보하지 못했다. 입력 rate·quota·기간을 바꾸거나 과거 파일 수를 상한으로 쓰지 않는다.

`deletion_requested`/`deletion_completed`/checkpoint/generation은 Catalog/Journal 영속 자료다. 조사한 정상 경로에서 그 이름마다 product stdout/stderr 행을 내는 callsite는 없다. **직접 stdout 항목은0B**이며 원장 bytes는0이 아니다. 삭제의 간접 출력은 latency ring(64), state transition(128), memory/resource 정기표본, 요청 재준비/실패, completion의 기존 집합에만 포함한다. 별도 부모 observer의 원장 poll/JSON과 A load 출력은 product process4MiB에 합산하지 않는다.

새 hold/admission 보호 변화에 따른 `admission-protection-deferred`, `admission-replacements`, recovered/plan-rejected는 recording-state에 포함된다. 정상45분 동안 해당 transitions<=128을 보장하는 계약은 아직 미확정이다. 초과하면 정상자료 완전성 FAIL이며 표본 제한을 무손실로 취급하지 않는다. 정상 checkpoint 자체는 stdout 전용 row가 없고, lock/cost는 이미 해당 prefix의 간접 항목이다. EOS/fsync/hash/ready-ticket 등 writer-cost는 state의 subcostoff에서0이다.

따라서 deletion 전/후 전체 process log의 정확한 합계는 unknown이다. D 삭제마다 임의 고정 행을 생성한 합성 자료를 실제 deletion coverage라고 하지 않는다. prefix 표의0은 명시적 비활성/직접 emitter 없음에만 사용한다. 정상 시작/종료 및 third-party 출력의 전체 길이·횟수도 아직 완전하게 열거/결속되지 않았으므로 표는 증명된 전체 목록이라고 주장하지 않는다.

## 두 cap 및 실제 합성 결과

native format unit은 빈 owner 기록1508B를 emitted,128개 거대 숫자 slot을 인위 주입했을 때 Emit=false와 sink 호출 증가0, 복원 후 owner0를 확인했다. 입력은 실제128모델 소유를 만들지 않는다. 형식 거부의 원자성만 증명한다.

collector 시험은 wire bytes16383/16384/16385를 수신 허용했고16386을 거부했다. C++는 newline 포함<16384를 요구한다. JSON 뒤 whitespace를 붙인 결정적 자료로 드러난 경계 차이이며 정상 C++ emitter가 그 oversized row를 내보낼 수 있다는 증거는 아니다. 제품/gate 수정은 하지 않았다.

stdout/stderr 합계4194303/4194304는 수집완료,4194305는 stop callback1회·byte-cap·수집미완료였다. completion event14 손실 표식만 추가한 자료는 captureBoundedProcessLog와 slowTraceSummary에서 별도 실패를 일으키지 않았다. mixed의 finally에 completion/evidence loss 전용 소비자는 없다. 이는 cap 초과시 전체 로그를 보존한다는 의미가 아니고, 자기 제한 진단의 손실을 기존 총bytes guard만으로 검출할 수 없다는 최소 반례다. 모든 functional gate를 통과한 실제 제품 실행을 합성한 것은 아니다.

resource/owner 누락, 필수 opened/sample/before/after Finish/destruction 누락, malformed/tail,short-write는 기존 collector가 거부했다. 정상 합성 owner0는 실제 제품 종료/heap 무누수의 증명이 아니다.

## 최소 다음 결정안 — 이번에는 구현하지 않음

1. memory record cap의 newline 포함 기준을 emitter와 collector에 일치시킬 test-only 소비자 보완, completion/evidence loss와 필요한 end/count 누락을 실패로 올리는 최소 소비자 연결. 공개 API/제품 기능과 별개지만 현재 gate의 계약 변경은 별도 승인 필요.
2. request/worker/model 임시값·snapshot/Page/Evidence reader의 소유 그래프에서 동시 live model 상한을 먼저 확정한다. 정상 count/bytes가 아직 불명확하므로 특정 compressed 표현만으로4MiB를 보장한다고 제안하지 않는다.
3. 범위가 확인된 뒤에만 기존 의미를 보존하는 lossless 숫자표현/고정 site schema, 중복 immutable 정보의 단일 owner 표현과 clock base+delta를 검토한다. historical peak와 capture 시각, loss flag, ring semantics를 제거하면 안 된다. 모든 reader와 version/old-log 호환을 함께 검증해야 한다.
4. startup/source/runtime의 고정 환경 문자열과 deletion/rotation 호출수까지 입력 envelope에 결속한다. 필수기록 삭제·cap확대·오류무시는 대안이 아니다.

Source-feasible 정상 초과가 입증되지 않았으므로 BLOCKED가 아니다. 증명 공백과 수집 경계 차이를 해소하기 전 READY도 아니다. R139의 관측 추정과 과거 FAIL/HOLD는 그대로 보존한다.

## 형식 비용 분해 (도달 가능한 정상 상태 아님)

원천 allocator block 수 unsigned 폭을 반영한128model/16pool/32event 형식 envelope는30,239B이다. tickets742B, ticketWitness5,443B, models15,243B, snapshotPools3,170B, recentEvents4,113B이며 나머지는 budget.json의 배타적인 field/envelope 항목이다. model 추가1개119B·pool 추가1개197B는20자리 숫자의 쉼표 포함 한계 비용이다. 초기 storage-type-only30,249B 계산은 별도 분석값으로 보존했다. 실제 모델/예약/clock conservation을 만족하는 입력이 아니므로 둘 다 source-feasible overflow가 아니다. 현재 emitter transport의16383B×580=9,502,140B도 단지 느슨한 출력 ceiling이며 달성 가능한 정상 합계가 아니다. 정상 단일 최대·총량·삭제 간접총량은 null이다.
