# v4.1.1 녹화 RSS 보유·회수 경계 진단

판정은 **B(의도된 누적 보유 확인) + C(할당기 영역의 RSS 잔존 근거 확인)**이며, **D(전체 증가분의 소유자별 분해 미완료)**가 남는다. **A(실제 해제 누락·불필요한 누적이 RSS 상승의 원인)는 확정하지 않았다.** 기존 녹화120분의 기능·저장·재기동·cleanup PASS와 RSS 안정성 승인 보류를 유지한다. 이번 결과는 제한 진단 완료이며 자원 안정성·릴리즈 PASS가 아니다.

## 기준·실제 수행

- 현재 실행 HEAD `6297af4b9fb0a7d5394a9af2cb34e5aff02c7ac0`, branch `v4.1.1`. 시작 시 index·작업 트리 clean.
- 제품 SHA-256 `ec93cbc5418bd1fe0c83eb4a90bf3fb837d9acd0f76356c6771b042e37d60c25`, runtime archive `d857542636a2ac9aafd4165c0f4530120fffb29f582e6fb413725289a5f92ba5`.
- 기존120분 실행 HEAD `860aa46b4d616291e0fad5cadb17ea127ebf2dc8`, 보존 `b6d35b4ea5f0b6dcc0357d556c84b001d522e22c`. 관련 제품·검사·config·fixture 추적 diff 없음. 이전 준비에 기록한 입력20개 해시 전부 일치([대조](prior-analysis.json)).
- 새 제품 진단 **1회**, PID `27909`, start identity `macos:1790934615:625299`. 설치된 `vmmap -summary <pid>`와 `heap --noContent -s -z <pid>`를 초기/5분/15분/off 직후/off 약3분의 다섯 시점에서 사용했다. 도구10회 모두 exit0, timeout·signal·출력 상한 초과 없음. MallocStackLogging·할당기 설정·캐시 비우기·DB 설정·서명·권한 변경 없음.
- 기존 wrapper의 관측용 컴파일 준비와 longrun의 환경·fixture 생성·서버/설정/종료 함수, 관측 helper를 소유 임시 구동에서 재사용했다. 추적 runner나 120분 명령의 시간/검사 코드는 수정하지 않았다. 구동 파일은 추적 실행기로 추가하지 않았으며 해시는 [provenance](provenance.json)에 남겼다.
- 2026-10-02 09:50:10.628~10:08:23.990 UTC, 준비 포함 1,093.358초, exit0. 녹화 주 관측 루프900초, 경계 프로파일·두 채널 off 완료까지 시작 후903.521초, 이후 마지막 구성 표본까지181.601초다. 실제 관측 경계 총1,085.121초(**18분5.12초**)로 승인한20분 이내다. 재기동하지 않았다.
- 같은 snow/640×360/30fps/120frame/H264 lossless 생성 명령, source9101/9201, segment2초, 채널별 continuous/event128MiB·3시간, retention1초, 기존 local-env 차단·headless 준비·latency slow trace를 유지했다. 새 MP4는 이전과 같은62,334,405 bytes지만 **전체 SHA는 다르다**([입력](generated-inputs.json)). 이전 생성 미디어 원문은 이미 정리돼 차이의 원인을 확정하지 않았으며 바이트 동등성을 주장하지 않는다. 제품과 관측용 normalize/process-metrics 바이너리 해시는 이전과 같다.

## 기존1440개 표본이 말하는 범위

[기존 원출력](../recording-longrun-20261002/launcher.stdout.log.gz)의 해제 SHA `a6bb5c93ca7237142ee125fe04fec08f0d463234eee8543b8a04afd1eaa34d49`를 확인했다. RSS는 macOS `proc_pidinfo(PROC_PIDTASKINFO).pti_resident_size`로 측정한 **제품 PID10392**의 바이트이며 Node/native 관측기 메모리나 디렉터리448MiB 상한이 아니다. 동일 start identity의1440개 표본이며 중복·역행·15초 초과 공백이 없다.

초기89.484→끝470.984MiB, 최대508.109MiB. 초기5분 이후 +193.188MiB이고, 10~20분 중앙값351.336→110~120분468.633MiB다. 마지막 표본에서 채널별 확정3592·삭제3590, mutation28730, 세대 회전86회였다. 스레드는 대부분25, FD는19~30 범위로 누적 증가가 보이지 않는다. 세부 구간과 처리량은 [prior-analysis.json](prior-analysis.json)에 있다. 처리 이력과 RSS의 동반 상승은 관측이며 소유자별 인과 비율은 아니다.

**비활성화 이후 같은 PID의 RSS·heap 표본은 기존 실행에 없다.** 재기동 PID의 메모리나 종료 후 SQLite 파일/page 수를 제품 연결의 cache 사용량으로 대체하지 않았다. 기존 일반/UI 자료는 재조회·복사하지 않았다.

## 실제 보유 경로

아래는 현재 제품의 generation backend 경로다. [RuntimeCatalogOptions/RuntimeLimits](../../../../src/recording/recording_runtime_composition.cpp#L7)가 V2/generation 쓰기를 켜고, [Open](../../../../src/recording/recording_catalog.cpp#L589)이 generation으로 분기한다. 새 실행의 generation11/cut3356 snapshot과 후속 mutation도 이를 뒷받침한다. 과거 `checkpoint_cache_`의 shadow/prefix fallback 경로를 현재 RSS 소유자로 섞지 않았다.

| 후보·보유 주체 | 누적 단위·목적 | 해제·축소 경계와 상한 | 실제 측정·판단 |
| --- | --- | --- | --- |
| `RecordingCatalog::retired_v2_`, cold link, `source_bindings_` | 삭제 완료 segment별 최소 영수증, source 요약·원문 결속. 상세 없는 상태에서도 참조·삭제·조회 판단 유지 | [삭제 전이](../../../../src/recording/recording_catalog.cpp#L1751)는 segment/state/path/reason을 erase하고 [고정 필드 영수증](../../../../include/recording/recording_catalog_snapshot.h#L22)으로 전환. [정상 append](../../../../src/recording/recording_catalog.cpp#L1832)는 활성 job이 보호하지 않는 binding resident를 reset. 요약·영수증은 checkpoint/off에서 지우지 않으며 일반적인 TTL/개수 기반 축소는 이 경로에 없음. 객체 소멸은 owner 종료/교체 경계 | 새 journal 확정901·삭제895, snapshot cut 시 source 요약842·retired836·생존segment6. 이는 영속 행 관측이며 live map 크기 측정으로 바꾸지 않음. heap에서 source-binding make_shared 블록294→901개(마지막403,648B) 확인. 생성자의 weak도 남으므로 블록 존재만으로 상세 객체·내부vector가 살아 있다고 판단하지 않음. **B** |
| Catalog mutation/accepted-state/order 인덱스 | mutation ID당 중복·충돌 방지와 최초 ordinal, 예약 request/segment의 순서·재사용 방지 | [Apply](../../../../src/recording/recording_catalog.cpp#L1482), [예약](../../../../src/recording/recording_catalog.cpp#L1673), [accepted-state](../../../../src/recording/recording_catalog.cpp#L1783). 정상 수용 후 삭제/off/checkpoint로 이력을 제거하지 않음. 실패 mutation ID의 erase와 정상 역사 축소는 다름 | mutation3592=예약901+확정901+상태895+삭제895. generation 참조 블록874→2691개(258,336B) 확인. 블록 외 map/string/다른 인덱스의 전이적 바이트는 미측정. **B**, RSS 전체 귀속 아님 |
| `RecordingJournalGenerationState`: chain·identities·order 및 active rows | 최초 mutation identity/원문 좌표, retry 의미, 전체 예약 이력. active에는 아직 회전하지 않은 논리 payload | [state](../../../../src/recording/recording_journal.cpp#L627), [append](../../../../src/recording/recording_journal.cpp#L2685), [order](../../../../src/recording/recording_journal.cpp#L544). 회전 시 active 교체·소멸, 과거 identity/order는 유지. runtime count admission은 `size_t::max`, component1GiB/row16MiB+1은 수용값이며 RSS/수명 이력 예산 아님. 보통 물리 active1MiB에서 회전하지만 압축된 물리 크기는 논리 할당량과 다름 | 실제 세대 진행·원문 해시·종류별 개수 확인. journal 구조별 live heap 바이트 없음. 데이터 보존 의무가 있어 단순 erase/캐시 비우기 제안 불가. **B** |
| checkpoint plan/export/serialization의 호출-local 값 | [Prepare](../../../../src/recording/recording_journal.cpp#L2397)의 전체 chain 복사와 새 identity/order, [export](../../../../src/recording/recording_catalog_snapshot_export.cpp#L58)의 정렬 행·JSON 문자열, catalog snapshot/bytes | [게시 swap](../../../../src/recording/recording_journal.cpp#L2536) 후 이전 chain/active와 plan·snapshot·문자열은 호출이 끝나면 소멸. 기존 영수증·이력은 제거하지 않음. 이력에 비례한 일시 peak 가능; 호출-local 객체가 있다는 사실만으로 누수 아님 | profiler를 checkpoint 경계에 결속하지 않았고 호출 stack도 없음. 해당 경로가 allocator 고수위를 얼마나 만들었는지는 **D** |
| Catalog의 generation SQLite 연결·statement·pager | generation owner 동안 연결1개, identity/요약/현재 상태 SQL 투영 | [prepare/project](../../../../src/recording/recording_catalog.cpp#L1880)의 statement는 정상 경로에서 finalize, 임시 transaction 종료. [CloseSqliteLocked](../../../../src/recording/recording_catalog.cpp#L4233)는 Catalog 소멸/해당 실패 경계; recording off는 Catalog 파괴가 아님. 현재 generation 경로에 별도 page-cache 튜닝/강제 축소 없음 | 실제 제품 연결의 `db_status`/pager heap 값은 수집하지 못함. 별도 sqlite3 프로세스를 사용하지 않았음. 파일 크기를 메모리로 환산하지 않음. **D** |
| 녹화 writer·공유 file source/packet·GStreamer | recorder별 appsrc/parser/mux/sink, 공유 stream별 GOP·subscriber queue, file worker/appsink | writer [Finalize/Reset](../../../../src/recording/gstreamer_segment_writer.cpp#L465)는 EOS·NULL·unref, [StopChannel](../../../../src/recording/recording_session_service.cpp#L136)는 subscriber 제거·writer Stop·idle lease 반환. file source는 [grace 뒤 idle 조건](../../../../src/core/session_manager.cpp#L342)에만 [StopSource/erase](../../../../src/core/stream_registry.cpp#L68). GOP4096 packet·subscriber 설정 개수·appsink8 buffer 제한은 바이트/RSS 상한이 아님 | off 직후 heap에는 FileSourceWorker/SharedStream 각2개가 아직 관측됐고, 약3분 뒤 해당 명명 블록과 writer/channel state는 표에서 사라짐. runtime API도 active streams2→0, idle=true. 개별 Gst buffer/pool 바이트까지 계측한 것은 아님. 이번 종료 경계에서 회수되는 소유 확인 |

v4.1.0 [B10](../../v4.1.0/s11-final-20260926/b10-longrun.md)은 같은 두 채널 보존 명령 계열이지만 다른 binary/OS, 삭제 상세 유지 구현, 약18분48초 observer timeout 실행이다. [O28](../../v4.1.0/lp26-o10-accumulation-20260923/o28-results.md)은 생존 영상 없는 합성 입력·과거 shadow 경로다. 둘 다 동등 대조군이 아니며 개선율·원인 배제에 사용하지 않았다.

## 새 메모리 구성·회수 관측

| 시점 | 제품 RSS¹ MiB | heap 할당² MiB / 블록 수 | vmmap malloc zone resident / dirty / 할당량³ MiB |
| --- | ---: | ---: | --- |
| source 시작 전 | 34.328 | 3.767 / 31,464 | 7.750 / 7.750 / 3.768 |
| 녹화 약5분 | 409.359 | 257.132 / 72,452 | 303.7 / 303.7 / 230.9 |
| 녹화 약15분 | 446.109 | 107.917 / 126,702 | 373.9 / 181.5 / 117.8 |
| recording off 직후 | 459.375 | 68.657 / 123,963 | 344.2 / 167.8 / 52.7 |
| off 약3분, 동일 PID | **384.625** | **16.995 / 122,936** | **344.2 / 49.4 / 17.0** |

¹ 구성 프로파일 직후의 기존 제품 RSS 수집기 값. ² heap의 zone별 정확한 allocated block bytes를 합산. ³ vmmap의 반올림된 보고값. vmmap→heap→RSS를 순차 관측했으므로 서로 같은 순간의 회계값이 아니다. vmmap 전체 region TOTAL·physical footprint·제품 RSS는 정의가 다르며 혼용하거나 정확히 차감해 소유자를 배정하지 않는다. 원출력 정제본은 [profiles](profiles), 개수·시각·exit와 계산은 [observations-analysis.json](observations-analysis.json).

마지막 `Malloc Small (empty)`는 virtual300.0MiB, **resident295.2MiB, dirty20.0MiB**였다. malloc zone 전체는 resident344.2MiB 중 dirty49.4MiB, allocated17.0MiB, 도구의 dirty+swap fragmentation32.4MiB/66%였다. 따라서 **살아 있는 malloc17MiB와 별개로, 할당기가 빈 것으로 분류한 resident 영역이 큰 부분을 차지한다**는 C의 직접 근거가 있다. 실제 OS 회수·압력 반응을 시험하지 않았고, 384.6MiB 전체가 회수 가능하다고 단정하지 않는다.

녹화5→15분에서 allocated bytes는 감소했지만 블록 수는 증가했다. 마지막 non-object는113,837개/16,627,600B이며 call stack이 없어 catalog/journal·SQLite·라이브러리의 정확한 분담을 모른다. source-binding/shared-ref 명명 블록 합661,984B는 전체 할당의 일부일 뿐이다. weak가 붙은 make_shared 블록을 완전한 binding 상세로 계산하지 않았다. `leaks`의 PASS나 이름만으로 reachable 누적 증가를 배제하지 않았다.

기존 도구 문서의 `%FRAG = 100 - 100 * allocated / (dirty + swapped)` 정의를 따랐다(`/usr/share/man/man1/vmmap.1`). `heap`은 MallocStackLogging이 없으면 non-object의 호출 위치를 제공하지 않는다는 현재 설치 도구 문서·출력을 확인했다. 소유 Python 준비 프로세스에서는 vmmap exit255, heap exit0이었고, 실제 제품에서는 두 도구 모두 성공했다. sudo/재서명/전역 설정 변경은 없었다.

## 실행 경계·판정 한계

정규5초 간격 녹화180표본·off36표본과 구성 전후10표본, 총226개는 동일 PID/start identity다. 정규 간격 최대5,006ms, 모든 해당 채널 상태 정상, 원장·삭제 확인 실패 없음. 두 채널은 off 전 약15분 시점에 각각449확정/447삭제, 정상 off의 마지막 finalize까지 합치면9101은450/447, 9201은451/448이다. off 뒤 mutation3592와 각 확정/삭제 수는 추가 증가 없이 유지됐다. 스레드는 녹화 대부분25→off 후9, FD13으로 내려갔다.

[runtime-recording.json](runtime-recording.json)과 [runtime-disabled.json](runtime-disabled.json), [마지막 off 상태](runtime-disabled-late.json)는 실제 기존 `/ops/api/runtime/status` 응답의 비민감 부분이다. 공유 스트림2→0, 세션/analysis/egress/publish/metadata0, sourceLifecycle.idle=true다. 이는 단순 off 설정만 본 것이 아니라 실제 소유 상태와 heap의 file worker 부재까지 대조한 결과다. 모든 GStreamer 전역 pool/cache가 소멸했다고 확대하지 않는다. 제품 SQLite 연결과 카탈로그는 서버 종료까지 살아 있는 것이 정상이다.

**즉시 적용할 RSS 해결용 제품 수정안은 확정하지 않는다.** 이력 map을 지우면 retry/충돌·예약·삭제 참조 계약이 바뀌고, allocator 조정은 이번 원인 판정을 대신하지 못한다. 다음에 필요한 단일 관측은 **같은 workload에서 증가·잔존하는 non-object live allocation의 호출 위치별 바이트/개수**다. 특히 Catalog/Journal 역사 인덱스·checkpoint 일시 직렬화·미디어 buffer·SQLite 중 어디에 속하는지 초기/누적/off를 같은 PID에 결속해야 한다. 이번에 추가 run이나 계측 API·제품 변경을 시작하지 않았다. 이 관측을 무기한 반복할 새 완료 조건으로 만들지 않는다.

기존120분에는 off 이후 구성 자료가 없고, 이번 짧은 run은 파일 hash·스케줄링·프로파일러 영향이 있으므로 **이전193.188MiB 증가를 몇 %가 allocator라고 소급 확정하지 않는다.** 의도된 역사 누적 B와 이번 회수/빈 영역 C는 확인했지만, 장기간 live allocation의 상한·세부 귀속 D는 남는다. RSS 안정성 승인은 계속 보류다.

## 보존·cleanup·기존 증거 유지

제품 exit0/signal없음/강제 종료 없음, native 관측기 exit0, launcher 그룹·제품·준비 PID 부재, HTTP64197/RTSP64198/UDP63025 해제 및 loopback 재bind 가능을 확인했다([cleanup-check.json](cleanup-check.json)). 기본 `.media_server/recordings`는 전후 부재, 상속 외부 recording root 없음, 기존 환경 allowlist가 소유 root를 사용했다. 소유 root 최대327.209MiB로 기존448MiB 한도 이내다. 보존 커밋 `3fb33ef09a59a78e0a036c3f10b0677ad4d1ed6f`의28개 파일과 압축 해제 표현을 Git에서 재조회했다. 원문24개 해시와 소유 identity·종료·포트 해제를 확인한 뒤, 이번 root 및 ignored 임시 준비 경로2개만 정리하고 부재를 확인했다([최종 대조·cleanup](readback-cleanup.json)). `result.json`의 pending은 보존 시점 상태이고 최종 정리는 이 후속 기록으로 연결된다.

[보존 manifest](preservation-manifest.json)는 원문 hash/크기와 정제·압축 표현 hash를 구분한다. 주소·소유 경로·URL은 정제했으며 정제본을 원문 바이트라고 하지 않는다. 도구 출력의 행 끝 공백·표 정렬은 수정하지 않고 gzip 표현에 그대로 보존했다. 생성 media·DB·private memory 문자열·원본 private 로그·임시 실행 바이너리는 Git에 넣지 않았다. heap은 `--noContent`로 호출했고 memory graph/dump는 생성하지 않았다. 원문을 보존하지 않은 파일은 hash만 남았다는 한계를 유지한다.

제품·검사·정책·fixture 기대값·승인 원장은 불변이다. candidate·C2·producer를 실행하지 않았다. 기존 녹화120분 기능/저장/재기동/cleanup, 일반 acceptance, UI432, 녹화 단기 PASS와 Opus/ENOENT 최초 FAIL·미확정 한계를 유지한다. 이번에는 일반 acceptance·UI·장시간 재실행·push·PR·merge·tag·Release를 하지 않았다. 판단자는 이 대화의 메인 Codex AI이며 독립/인간 승인으로 표시하지 않는다.
