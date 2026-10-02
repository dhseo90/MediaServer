# v4.1.1 RSS 보완 판단 — footprint·live 보유·운영 경계

**높은 RSS 자체를 미해제 객체량으로 해석하던 보류 사유는 해소한다.** off 이후 footprint38.0M/heap16.995MiB라는 기존 원출력이 이를 뒷받침한다. 남은 위험은 **B: 필요한 영속 이력의 누적과 운영 범위**, 그리고 **D: off 이후 잔존 live 할당의 세부 귀속 부족**이다. 불필요한 보유·해제 누락(A)을 확인한 것은 아니다. 주요 off live 보유까지 모두 확인했다는 C의 강한 결론이나 무제한 자원 안정성 PASS도 내리지 않는다.

기존 일반 acceptance·UI432·녹화 단기·녹화120분 기능/저장/재기동/cleanup PASS와 과거 FAIL/미확정 기록은 유지한다. 원본 `resourceTrendPass`/`reviewRequired`는 변경하지 않았다. 이번 문서는 과거 판단을 덮어쓰지 않는 보완 기록이며 릴리즈 공개 승인이 아니다.

## 기존 다섯 시점의 해석 보완

출처는 [기존 진단](../recording-rss-diagnosis-20261002/review.md)의 같은 PID27909, start identity `macos:1790934615:625299`다. 원본 보존 커밋 `3fb33ef09a59a78e0a036c3f10b0677ad4d1ed6f`의 다섯 vmmap gzip과 기존 heap/RSS 집계를 대조했다. 개별 입력/해제 hash와 순차 시각은 [비교 자료](prior-footprint-comparison.json)에 있다.

| 지표 | 초기 | 녹화5분 | 녹화15분 | off 직후 | off 약3분 |
| --- | ---: | ---: | ---: | ---: | ---: |
| vmmap 시각(KST) | 18:50:17.339 | 18:55:19.015 | 19:05:18.974 | 19:05:22.457 | 19:08:22.446 |
| RSS 전→후(MiB) | 34.219→34.328 | 396.062→409.359 | 446.094→446.109 | 459.375→459.375 | 384.625→384.625 |
| heap allocated(MiB) | 3.767 | 257.132 | 107.917 | 68.657 | 16.995 |
| heap 블록 수 | 31,464 | 72,452 | 126,702 | 123,963 | 122,936 |
| Physical footprint | 10.9M | 368.0M | 118.1M | 131.3M | 38.0M |
| Physical footprint peak | 11.0M | 368.8M | 395.5M | 395.5M | 395.5M |
| malloc allocated | 3858K | 230.9M | 117.8M | 52.7M | 17.0M |
| malloc resident | 7936K | 303.7M | 373.9M | 344.2M | 344.2M |
| malloc dirty | 7936K | 303.7M | 181.5M | 167.8M | 49.4M |
| malloc swapped | 0K | 0K | 0K | 0K | 0K |
| Malloc Small(empty) resident/dirty | 행 없음 | 37.4M/37.4M | 211.2M/20.2M | 235.2M/60.2M | 295.2M/20.0M |
| 전체 VM region resident | 426.0M | 835.9M | 895.6M | 908.9M | 834.4M |

`M/K`는 vmmap 원문 단위·반올림이며 RSS/heap의 MiB는 바이트를 2²⁰으로 나눈 표시값이다. 각 열에서도 vmmap→heap→RSS는 순차 관측이다. 전체 VM region 합계에는 공유/매핑 구간이 들어가며 RSS·footprint·heap과 같은 회계값이 아니다. 표의 행들을 합산·차감하여 owner별 양을 만들지 않는다.

녹화 중에도 footprint가368.0M→118.1M으로 내려갔고 off 약3분에는38.0M이다. 그때 RSS384.625MiB와 빈 malloc small resident295.2M이 함께 관측됐다. **RSS의 잔존 전부를 살아 있는 객체나 회수되지 않은 malloc로 보는 해석은 부적절하다.** 같은 기존 run의 runtime 상태는 공유 스트림2→0, sourceLifecycle.idle=true이며 명명된 file worker/writer 블록도 사라졌다. 다만 footprint가 낮아진 사실은 영속 이력의 장기 상한을 입증하지 않는다. 기존120분에는 footprint/heap/off 표본이 없으므로 그 상승193.188MiB를 이번 비율로 소급 분해하지 않는다.

## 추가 1회의 목적·실제 중단

당초 남은 non-object의 owner가 필요한 identity/order/retired 이력인지, 수명이 끝난 미디어/임시 객체인지에 따라 코드 수정과 운영 제한의 판단이 달라진다고 보아 추가 관측을 선택했다. 목표는 RSS100% 귀속이 아니라 **live allocation의 호출 위치별 바이트·개수**였다.

- 실행 HEAD `0749ba019e50aeb4aa18f651577cea5f2481d6d8`, 시작 index/작업 트리 clean. 제품 SHA-256 `ec93cbc5418bd1fe0c83eb4a90bf3fb837d9acd0f76356c6771b042e37d60c25`, archive와 기존 입력20개 불변.
- 설치 SDK의 `malloc.3:240–262`에서 `MallocStackLogging=lite`가 현재 할당만 메모리에 기록하며 filesystem history를 쓰지 않는 모드임을 확인했다. 임시 BIN_PATH exec 전달로 **제품에만** lite와 소유 stack directory를 주었다. 부모/observer/profiler 환경에는 세 stack logging 변수를 넣지 않았다. 최초 heap의 LiteZone과 실제 제품의 RecordingCatalog/Journal 함수명이 적용 근거다([조건](provenance.json)).
- 명령은 `malloc_history <pid> -allBySize -fullStacks`, `heap --noContent -s -z <pid>`, `vmmap -summary <pid>`. `showContent`, memory graph, full event history, sudo/재서명/도구 설치/재빌드는 사용하지 않았다. 기존 helper만 임시 컴파일했다.
- 동일 두 source9101/9201, snow640×360/30fps/120frame·lossless H264 생성 조건, segment2초, 채널별128MiB/3시간, retention1초와 격리를 유지했다. 생성 파일 해시는 [별도 기록](generated-inputs.json)이며 이전 미디어와 바이트 동등하다고 주장하지 않는다.
- 승인된 새 제품 실행은 **1회**, PID30793/start `macos:1790938433:596757`. 2026-10-02 10:53:51.815~10:59:03.493 UTC, launcher311.677초/exit1. 실제 관측304.672초, 표본64개다. 초기 세 도구는 모두 exit0.
- 녹화5분의 malloc_history 출력이 임시 수집기의16,777,216-byte 상한을 넘어 **ENOBUFS, tool exit255**가 됐다. 캡처된16,842,752 bytes는 완전한 결과가 아니다. 전체 스택을 넓게 선택한 수집 방식의 한계이며 제품 assertion 실패·I/O timeout·메모리 부족으로 바꾸어 해석하지 않는다. 상한/시간을 늘리거나 재실행하지 않았다.
- 계획한 녹화12분 및 정상 off 후3분의 스택/heap/footprint는 **미실행**이다. 새 실행에서 off 회수를 확인했다고 쓰지 않는다. 제품은 오류 뒤 기존 정상 종료 절차로 exit0, 강제 종료 없음. 관측기 exit0, profiler/launcher 그룹과 포트 해제를 확인했다([정리](cleanup-check.json)).

초기 full malloc 그룹30,686개 블록/4,268,816B는 같은 초기 heap의 LiteZone 블록/bytes와 일치한다. heap 전체4,324,592B에는 다른 zone도 포함된다. allBySize가 함께 출력한 VM/thread mapping은 malloc 집계에서 분리했다. `N calls`는 도구가 현재 live 상태로 묶은 할당이며 누적 malloc 호출량이 아니다. 부모·자식 stack frame의 바이트를 더하지 않았다.

## 살아 있는 할당의 확인 범위

5분 prefix의 마지막 미완결 stack1개는 버렸다. **완결된2,467개 stack 그룹만** 분석했으며 총량·개수는 모두 수집된 앞부분의 하한이다. 초기3,746개 stack 그룹은 완결됐다. 5분 직전에는 각 source146확정/144삭제, mutation1162, segment기록292개였다. 아래 수치의 합계나 비율로 전체 heap을 설명하지 않는다. 정확한 그룹 분류와 선택 원문은 [할당 집계](allocation-analysis.json), [압축된 선택 stack](profiles)에 있다.

| 호출 위치·소유 경계 | 5분 prefix에서 확인한 live 할당 | 증가/회수 및 판단 |
| --- | --- | --- |
| `core::SharedStream::EnqueuePacket` → packet payload vector 복사 | 한 그룹436블록 / **228,589,568B (218MiB)**. 제품 미디어 경로 전체 하한240,753,664B | [EnqueuePacket](../../../../src/core/shared_stream.cpp#L349)은 subscriber queue에 복사하고 기존256개 제한에서 오래된 packet을 pop한다. worker는 pop 후 callback 동안 지역 packet을 가진다. 두 subscriber의 queue+in-flight 보유와 연결되며, 측정 블록 수가 곧 정확한 queue length라는 뜻은 아니다. 정상 제거는 queue drain/join·owner 소멸 경계. 큰 lossless frame의 **개수 제한은 작은 바이트 상한이 아니다**. 과거 같은 binary run의 off 후 해제 근거는 있지만 새 run에서 회수 스택은 미실행. |
| GStreamer 등 미디어 라이브러리 | 하한33,151,120B; 그중 `gst_buffer_new_allocate` 한 그룹44블록/23,068,672B | buffer/pool·플러그인 초기화가 함께 포함된다. 활성 미디어 동작의 할당과 owner 종료 경계가 있는 후보이며, 계측이 queue/timing에 영향을 주므로 비계측 run과 절대값 성능 비교를 하지 않는다. |
| `RecordingJournal::AppendGenerationLocked`, mutation parser/compression | Journal 경로 하한**4,479,696B/15,398블록**. 그중 active parsed payload2,035,584B, compressed physical658,432B | [append](../../../../src/recording/recording_journal.cpp#L2685)는 논리 payload와 물리 압축 표현을 active rows에 저장한다. compressed file 크기와 live 논리 할당은 다르다. 이 부분은 회전 시 이전 active의 교체/소멸 경계가 있다. 전체를 영구 이력이나 누수로 합치지 않는다. |
| Journal checkpoint chain/order 및 Catalog apply/link 이력 | 위 Journal 합계 중 checkpoint 준비/전달 경로1,208,144B; 별도 Catalog 하한**1,190,464B/10,333블록**, 그중 ApplyMutation1,120,576B | [checkpoint](../../../../src/recording/recording_journal.cpp#L2390)에서 준비한 chain/order는 게시 시 current로 전달된다. 한 snapshot만으로 아직 살아 있는 plan과 게시된 구조의 전이적 바이트를 모두 구분하지는 못한다. Catalog retired/source 요약·mutation/order의 보유 목적과 off/checkpoint에서 지우지 않는 경계는 기존 조사와 동일하다. **B: 미디어 삭제량에 따라 이력도 사라지는 구조가 아니다.** |
| SQLite 제품 연결 경로 | 하한183,728B/388블록, 초기166,272B/256블록 | 실제 제품 allocation stack의 sqlite3MemMallocTyped→Catalog projection 연결이다. 별도 sqlite3 프로세스 값이 아니다. 하지만 pager `db_status` 자체를 측정한 것은 아니며 prefix라 증가량 상한/최종 회수는 말할 수 없다. |
| 기존 latency TLS·crypto·기타 | TLS 하한393,856B(초기196,928B), crypto 하한407,232B, 기타 분류는 JSON | TLS는 스레드 수명에 연결된 기존 계측 상태다. Catalog를 거친 호출이라는 이유만으로 Catalog 역사 소유로 넣지 않았다. allocator/profiler 자체와 미수집 꼬리는 별도 한계이며 0으로 채우지 않았다. |

Catalog/Journal 합계의 관측 하한은5,670,160B다. 초기보다 늘어난 실제 보유가 있으나 현재 active 논리 행·압축 문자열·게시된 역사·checkpoint 중 객체를 함께 포함하므로 이 값을 segment당 영구 비용으로 나누거나 일/월 단위로 선형 외삽하지 않는다. 별도 `[malloc/…]` 그룹들은 한 번씩만 집계했다. 중점 소유 구조의 과거 조사와 hash가 같아 전수 소스 감사를 반복하지 않았다.

## 수정·운영·마감 판단

1. **즉시 제품 수정을 요구할 A의 근거는 없다.** 미디어 큐 복사와 current generation 이력이라는 실제 호출 위치를 확인했다. 아직 확인하지 못한 off 할당을 해제 누락이라고 추정하거나 필요한 receipt/identity/order를 erase/clear하자는 수정안을 내지 않는다.
2. **남는 기술 위험은 B의 운영 경계다.** segment·mutation·예약 이력이 증가하며, 현재 media quota/age는 이력 RAM 예산이 아니다. 현행 runtime의1GiB component·행 제한과 `size_t::max` count admission은 무기한 RAM 보증이 아니다. 정상 off는 storage owner를 파괴하지 않고, 재시작도 영속 이력을 없애는 관리 수단이 아니다. 이 경로와 검토한 정책에는 이력 규모별 정량 RAM 예산/지원 운용시간이 정의돼 있지 않다. 이는 운영 범위의 미정 사실이지 이번 결과를 보고 만든 새17MiB/38M/500MiB 합격선이 아니다.
3. **RSS 고수위만의 보류는 해소한다.** 기존 off footprint38.0M와 빈 allocator resident 관측 때문에 RSS384.6MiB를 그대로 미해제 객체로 판단할 수 없다. 기존120분의 기능·저장·재기동·cleanup 및 FD/thread 관측에 새 반증은 없다. 다만 무제한 운용 안전성이나 전체 자원 안정성 PASS를 이 짧은 자료로 선언하지 않는다.
4. **D는 정확히 한정된다.** 필요한 off 경계에서 잔존 live bytes를 Catalog/Journal의 필수 이력과 종료돼야 하는 미디어/일시 할당으로 나눈 자료가 없다. 후자 비중과 수명 위반이 확인되면 A의 수정 판단이 되고, 전자면 B의 운영 제한 판단이다. 이번 추가 수집은 초기에 스택이 나왔지만5분 출력 상한으로 비교를 끝내지 못했다. 따라서 C의 “주요 off live 보유도 설명됨” 조건까지 충족했다고 하지 않는다.

**마감에 남은 판단은 지원할 이력 규모·운용 범위에서 이 누적 보유를 수용할지다.** 그 결정을 RSS100% 귀속, 모든 초기값 복귀, 같은 프로파일/acceptance/120분의 자동 추가로 바꾸지 않는다. 무제한 운용·전체 자원 승인 보류는 유지하되 사유를 “높은 RSS”에서 위 운영 경계와 한정된 귀속 부족으로 좁힌다. 새 정책·예산·관리 체계나 제품 변경은 만들지 않았다. 이번 요청의 재판정은 완료했으며 추가 프로파일 자체는 부분 실행이다.

## 보존·정리

이번 자료만 한 폴더에 보존했다. 초기 heap/vmmap·launcher/server 출력은 주소·소유 경로·URL 정제 후 gzip, 큰 malloc_history 원문은 **원문 hash와 선택된 완결 stack의 정제 발췌**만 보존한다. 캡처되지 않은 꼬리는 존재하지 않는 증거이며, 보존하지 않은 전체 원문을 재현 가능하다고 하지 않는다([manifest](preservation-manifest.json)). 프로파일 내용·credential·memory graph는 넣지 않았다.

제품/observer/profiler 그룹 종료와 HTTP65368/RTSP65369/UDP56291 해제, 기본 recording root 부재 및 제품/입력 불변을 확인했다. lite의 소유 stack directory는 비어 있었으며 시스템/사용자 profiling 자료를 건드리지 않았다. 보존 커밋 `bf81919f0ac3bc1b9726ce22f01f2aa1d4933149`의21개 파일·압축 해제 표현과 큰 stack 원문 hash를 재조회했다. 소유 identity·종료·포트 해제를 재확인한 뒤 이번 root/임시 준비 경로2개만 정리하고 부재를 확인했다([최종 대조·cleanup](readback-cleanup.json)). 원본 결과의 pending은 보존 시점 상태이며 이 후속 기록으로 완료를 연결한다.

candidate·C2·producer·일반 acceptance·UI·120분을 실행하지 않았다. 기존 증거 파일은 불변이고 원본 FAIL·시각·commit·판정 필드도 바꾸지 않았다. 판단자는 현재 대화의 메인 Codex AI이며 독립/인간 승인을 가장하지 않는다. push·PR·병합·태그·Release는 수행하지 않는다.
