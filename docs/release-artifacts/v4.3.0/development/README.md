# v4.3.0 개발 실행 기록

개발 계약은 [설계](../../../superpowers/specs/2026-10-04-v430-visual-vector-search-design.md),
기능별 기대값은 [inventory](../../../project-feature-test-inventory.md#v430-자원-수명과-벡터-검색)에 둔다.
현재 개발 중이다. 릴리즈용 검사·30분·120분·UI 풀테스트·PR·병합·공개는 실행하지 않았다.

## R01 historical identity 중복 상주 제거

2026-10-04 KST, macOS arm64. 기준 `f6d5cf83`와 이번 R01 diff에서 실행했다.
각 로그의 시작 시각·컴파일러·제품/fixture SHA-256으로 정확한 입력을 식별한다.
원본 ID·최초 순서·entity/time/digest·cold 위치는 유지하고 Journal 조회 색인의
historical 합성 identity 문자열 사본만 제거했다. 필요할 때 기존 함수로 같은 값을 복원한다.

| 명령 | 원출력 | exit·판정 |
| --- | --- | --- |
| `bash scripts/internal/verify_recording_generation_checkpoint.sh residency` | [최초](r01-red.log) | 1, 새 fixture가 없는 직렬화 함수를 사용한 빌드 실패. 예상 RED가 아님 |
| 위 명령, 실제 예약 필드 비교로 fixture 수정 | [RED](r01-red-retry.log) | 1, 사전 정의한 중복 문자열 0바이트 assertion 6개만 FAIL, 계약 assertion 8개 PASS |
| 위 명령, 제품 중복 보유 제거 후 | [GREEN](r01-green.log) | 0, 35 PASS/0 FAIL. SQLite on/off 및 crypto/backend 미지원 거부 포함 |
| `bash scripts/internal/verify_recording_generation_checkpoint.sh` | [checkpoint 회귀](r01-checkpoint-regression.log) | 0, 171 PASS/0 FAIL; 회전·중단 복구·fault·admission·SQLite·기존 v1 경계 |
| `bash scripts/internal/verify_recording_generation_append.sh` | [append 회귀](r01-append-regression.log) | 0, 222 PASS/0 FAIL; 충돌·예약·상태 전이·SQL 실패·poison/reopen 경계 |

R01 fixture의 historical 문자열은 처음 76바이트, 두 번의 회전 뒤 278바이트였고 수정 뒤
각 단계 0바이트다. active 예약 문자열은 101바이트를 유지하고 회전 뒤 해제됐다.
이는 특정 문자열의 직접 논리량이며 heap/RSS 전체 절감이나 100,000 ID 규모 PASS가 아니다.
각 실행은 자체 mktemp fixture만 사용했으며 서버/포트를 열지 않았다. 로그의 소유 경로
cleanup `removed=true`와 실행 종료를 확인했다. 모든 최초 실패 로그를 보존했다.

## R03 idle snapshot 만료

기준 `0384adc1`와 R03 diff, 같은 macOS arm64에서 실행했다. 기존 pool은 Begin/Resume/ResolveHit가
호출될 때만 만료 항목을 지웠다. 제품 SearchState가 자동 만료 모드를 사용하도록 연결하고,
pool 소유 worker가 다음 만료까지 기다린 후 pool의 shared 소유만 해제한다. shutdown은 worker를
깨워 join한다. 미디어 worker·보존 lease는 만들지 않으며 이미 반환한 page의 불변 모델은 유지한다.
수동 시계를 사용하는 기존 oracle은 자동 worker와 분리했다.

| 명령·대상 | 원출력 | exit·판정 |
| --- | --- | --- |
| `bash scripts/internal/verify_recording_search_lifetime.sh`, 자동 만료 구현 전 | [RED](r03-red.log) | 1, 41 PASS/2 FAIL. 후속 요청 없는 만료/마지막 외부 참조 해제 두 assertion만 실패 |
| 위 명령, 자동 만료 구현 후 | [GREEN](r03-green.log) | 0, crypto on 43 PASS/0 FAIL, crypto off 2 PASS/0 FAIL |
| `cmake --build build-gst-onnx -j 4` | [제품 빌드](r03-build.log) | 0, 기존 GStreamer/ONNX/OpenSSL/SQLite 제품 링크 완료 |
| 기존 `recording_search_application_smoke.cpp`, `recording_search_concurrent_smoke.cpp`를 현행 CMake defines/includes/link와 제품 archive로 컴파일·각 격리 fixture 실행 | [application 영향 회귀](r03-application-regression.log) | 0, 각각 13/6 PASS, 실패 0. 정확한 compile/run/제품 archive SHA와 cleanup은 로그에 있음 |

application 검사는 실제 원본·파생 파일/페이지·권한·검색 seek·원본 fallback을 확인했다.
동시 검사에서는 10,000관측과 90 packet의 writer를 사용했고 세 GOP 파일을 확인했다.
이 실행의 competing request 339.955ms/최대 검색 191.981ms는 4요청 목표의 p95가 아니다.
모든 실행은 종료했고 소유 임시 경로 제거를 확인했다. 전체 서버 RSS, 4요청, 8채널,
100,000 identity, 30분/120분·실제 UI 검증으로 확대하지 않는다.

## R02 삭제 이력 기준 측정 / R04·R05 검색 복사·동시 요청

기준 `3a8b8935`와 R04/R05 diff에서 실행했다. 행동 필터용 요청 사본은 object/channel/time 등으로
배제된 행을 복사하지 않는다. query 없는 전체 enrichment와 공유 원본·기존 snapshot은 유지한다.

| 명령·대상 | 원출력 | exit·판정 |
| --- | --- | --- |
| `bash scripts/internal/verify_recording_generation_scale.sh bounded-deleted` | [삭제 이력 기준](r02-deleted-baseline.log) | 0, 101초. 실제 제품 archive로 1,020/2,049개 삭제 segment, 4,080/8,196 mutation identity, pin/hold·삭제·checkpoint·SQLite/JSONL 재기동 검사 |
| `cmake --build build-gst-onnx -j 4` | [증분 제품 빌드](r04-build.log) | 0 |
| 현행 CMake defines/includes/link와 제품 archive로 events/application/concurrent/cost fixture 컴파일·격리 실행 | [검색 영향 회귀](r04-search-regression.log) | 0. events 33, application 13, concurrent 8 PASS/0 FAIL; cost 1/1,000/10,000 관측의 독립 위치·ID/개수 oracle 일치 |

삭제 이력 2,049개에서 parent peak RSS 129,646,592바이트, 재기동은 SQLite 99,205,120바이트 /
JSONL 92,110,848바이트였다. 격리 파일 전체 논리 크기는 36,277,429바이트다. template 기반
파일·메타데이터 검사이며 전체 observer drain이나 100,000 identity 검증이 아니다.

R05는 공유 문서 1,000개를 유지하면서 person 후보 한 개만 요청 사본에 남기고 논리량이
원본 1% 미만임을 확인했다. 기존 event evidence 불완전 거부와 빈 후보도 확인했다.
4개 동시 client는 총 165회 응답(성공 163, 일시적 503 2), 응답 전체 p95 144.702ms /
최대 160.214ms였다. 503은 latency 관측에 포함하고 성공 건수에서는 제외했다.
writer 90 packet/3 GOP 파일 확정과 현재 media 건강도를 확인했다. 단기 개발 fixture이며
8채널 운영·100,000 identity·전체 서버 혼합 RSS·장시간 안정성의 증거로 확대하지 않는다.
각 실행은 종료했고 소유 임시 경로 제거를 확인했다.

남은 작업: R02 목표 규모·전체 소유량과 5~10번 개발. 모델·격리 의존성은 준비됐으나
제품 C++ 전처리·검색 통합은 미완료다.


## R02 100,000 identity 전후 비교

`806e4a9c`와 규모 fixture diff에서 `verify_recording_generation_checkpoint.sh scale`을 실행했다.
활성 미디어 0개를 고정하고 8채널 ID에 1,000/100,000개의 고유 미사용 예약을 생성했다.
전체 ID 수, 첫/중간/마지막 예약의 독립 tuple·sequence, 충돌 거부, 원본 hash와 no-op checkpoint,
SQLite off/on 재기동이 통과했다. 삭제 이력·실제 미디어는 앞 절의 별도 fixture이며 이 예약 fixture와 혼동하지 않는다.

| 실행 | 원출력 | 결과 |
| --- | --- | --- |
| `scale`, 첫 규모 실행 | [규모](r02-identity-scale.log) | exit 0, 40 PASS, 100,000개 유지. native heap 관측 추가 전 결과 |
| `scale-baseline`, R01 이전 `f6d5cf83` Journal과 읽기 전용 probe | [최초 실패](r02-identity-baseline.log) | exit 1, 임시 source의 private include 검색 경로 누락. 제품 assertion RED가 아닌 빌드 오류 |
| `scale-baseline`, `-Isrc/recording` 추가 | [기준 재실행](r02-identity-baseline-retry.log) | exit 0, 40 PASS. 기준의 중복 문자열은 존재해야 한다는 별도 기대값 |
| `scale`, native heap 관측 포함 | [현행 비교](r02-identity-heap.log) | exit 0, 40 PASS. 같은 fixture·컴파일 옵션·재기동 순서, 중복 문자열 0 기대값 |

100,000개 / SQLite on 조건에서 historical 중복 문자열 8,888,890→0바이트,
macOS 전체 malloc zones `size_in_use` 174,955,328→165,355,328바이트(9,600,000바이트 감소),
reserved 378,290,176→369,901,568바이트였다. 제품 owner의 논리량과 native heap은 같은 지표가 아니다.
전체 native heap에는 allocator·SQLite·fixture의 남은 할당도 포함된다. current 데이터 전용 비용으로
정확히 귀속하지 않으며 RSS 전부를 누수로 해석하지 않는다. 이 fixture의 측정 native heap은
512MiB보다 작고, parser 준비를 포함한 peak RSS 691,683,328→681,263,104바이트도 4GiB 이하다.
Open은 14,453.7→14,440.5ms로 속도 개선을 주장할 차이가 아니다. 디스크 논리 크기는 양쪽 모두
129,979,457바이트로 필수 이력을 삭제해 공간을 줄인 결과가 아니다.
모든 프로세스 종료와 정확한 소유 fixture 제거를 로그에서 확인했다. 실제 영상의 8채널/4검색과
이력 규모를 한 번에 합친 교차 부하·장시간·운영 지원 전체의 PASS는 아직 아니다.


## R04 제품 B 8채널과 누적 이력의 교차 부하

기준 `44c9814c`와 R04 diff. 기존 1채널 fixture 외에 실제 `RecordingRuntimeStorage`의 B root,
8개의 독립 writer/4개 검색 client를 추가했다. 최초 검사는 90packet×8(160×90, H.264 30fps
파일, packet 공급 간격4ms)·10,000개 관측으로 실행했다. 실제 운영 전체 채널 해상도/FPS
지원 보증이 아니며 유한한 개발 자원 profile이다.

| 명령·대상 | 원출력 | exit·판정 |
| --- | --- | --- |
| 현행 runtime archive + `recording_search_runtime_load_smoke.cpp` | [최초](r04-runtime-load.log) | 1, 일부 client가 writer 진행 중 성공을 받지 못함. 예상 RED가 아님 |
| 같은 fixture에 client별 응답·writer off 진단 추가 | [직접 관측](r04-runtime-diagnostic.log) | 1, 한 client 성공0/503 2회; off 뒤 knownCount24. 용량 거부가 아닌 원본 변경 계열 |
| 원본 변경만 최대3회 재시도, 제품 build | [build](r04-retry-build.log), [재시도만 적용](r04-runtime-retry.log) | build0, fixture1. 같은 client 성공 누락이 남아 재시도만으로 해결되지 않음 |
| 예약의 불필요한 무효화 제거·empty delta 공유 모델 재사용 후 build/진단 application 사본 링크 | [build](r04-order-build.log), [원인 추적](r04-runtime-order.log) | 둘 다0. 임시 사본은 Failure의 내부 오류 문자열만 출력하며 source hash를 기록, `search-source-changed` 확인. 83회 중82성공, p95 474.943ms |
| source/generation/application/events/cost fixture를 현행 제품 archive에 링크, cost는 `V420_COST_BEHAVIOUR=1` | [영향 회귀](r04-order-regression.log) | 0. 35/20/13/33 PASS, cost의 1/1,000/10,000개 위치·결과 oracle 일치 |
| `bash scripts/internal/verify_recording_generation_checkpoint.sh scale-load` | [교차 부하](r04-mixed-load.log) | 0. 100,000개 예약 원문이 남은 **동일 root**를 실제 제품 runtime archive로 열어 위 8채널/4검색/10,000관측을 추가 |

순서 예약은 ID/sequence를 기록하지만 검색 문서·재생 후보를 바꾸지 않는다. 그 경우 검색
resolution을 무효화하지 않고, 빈 delta는 기존 immutable 모델을 재사용한다. 파일 확정·삭제·손상은
기존 무효화와 현재 파일 재검증을 그대로 수행한다. 검색 준비는 `search-source-changed`만 최대3회
시도하며 각 회의 전체 기존 guard를 통과한 뒤 snapshot을 한 번 게시한다. 오류 종류·용량 판정·
검증 한도는 완화하지 않았다. generation의 추가 oracle은 예약 직전 batch가 유효하고 요청 모델의
shared identity가 같음을 SQLite on/off/reopen 조건에서 확인했다.

최종 교차 실행은 진단 사본 없이 제품 archive 그대로 사용했다. 76회 응답 중75성공/503 1회,
p95 778.955ms/max1,341.08ms, 720packet/24파일(각 채널3개) 건강도와 writer off 뒤 knownCount24를
확인했다. source evidence SHA는 전후 동일했다. 전체 native heap used225,215,376바이트는
512MiB 이내이고 peak RSS768,606,208바이트는 4GiB 이내였다. malloc zones의 reserved489,684,992
바이트는 used와 분리한다. 전체 heap을 Catalog의 정밀 논리량으로 바꾸어 부르지 않는다.
해당 제품 부하 process는51.756초로 사전90초 한도 안에 종료했고 소유 fixture181,988,372바이트를
정리했다. 모든 앞선 실패와 재검증 로그를 유지했다. scanner의 기존 GTK/GI 경고는 로그에 남았으며
실제 H.264 파일 검사 PASS를 대신하거나 무효화하지 않는다.

이 결과로 정한 단기 자원 profile의 선행 개발 기준을 충족했다. 100,000행 전체를 어떤 metadata
폭에서도 허용한다는 보장이 아니며 검색64MiB admission이 먼저 적용된다. 더 높은 해상도/codec,
장시간·실제 UI·Linux 및 **임베딩을 추가한** 혼합 부하는 아직 별도 검증 대상이다.


## 벡터 값 계약·exact 순위·파생 cache의 단기 검증

`VisualSearchIndex`는 고정 image/text/cross-modal 계약, 유한 L2 768차원과 원본 hash·시간 참조를
검사한 완성 게시본만 받는다. 채널·선택 UTC 반개구간을 적용한 뒤 현재 원본 검증 callback을
통과한 후보의 exact dot score를 내림차순, 동점 ID를 오름차순으로 반환한다. top-k 메모리는
최대 200개이며, 게시본은 20,000문서/96MiB 기본 admission을 사용한다. 이 단계는 실제 모델
retrieval 품질·권한 HTTP·현재 파일 건강도 구현의 완료 증거가 아니다.

- [벡터 순위 실행](visual-index.log): native C++17 `-O2 -Wall -Wextra -Werror`, exit0,
  1,665개 검사. seed430의 독립 long-double 전수정렬 oracle와 20개 질의 순위·점수 일치,
  계약/NaN/Inf/0norm/차원/중복/용량/필터/threshold/실패 시 이전 출력 보존을 확인했다.
- [cache 최초](visual-store.log): enabled 검사는23개 PASS였으나 disabled fixture의 사용하지 않는
  두 helper가 `-Werror`에서 컴파일 실패해 전체 exit1. 예상 RED가 아니다.
- [cache 재검증](visual-store-retry.log): 해당 helper를 enabled 전용으로 한정한 뒤 동일 기준으로
  enabled23/disabled3 검사 PASS, exit0. SHA/짧은파일/뒤추가/부정길이/계약/용량/경로 symlink,
  rename 직전 주입 실패와 이전 원문 보존·임시 파일 부재·재로딩 필드 exact를 확인했다.

[경로 경계 추가](visual-store-paths.log)는 중간 directory symlink 거부와 FIFO 비차단 거부를
추가한 뒤 enabled26/disabled3, exit0을 확인했다.

cache는 전용 owner directory에서 공간 ID별로 분리한 파생 자료다. 완료 파일만 fsync/rename으로
게시하고 cache 실패는 원본 재색인이 필요한 상태다. 실제 worker 강제 종료·재시작의 재색인
수명 검증은 아직 남았다. 위 두 실행은 포트·서버를 만들지 않았으며 임시 directory 부재를
각 로그에서 확인했다. 모델/의존 파일은 승인된 지속 준비물로 유지한다.


## SigLIP2 adapter·제품 빌드와 색인 worker

고정 Google 모델·토크나이저·ONNX 및 공급자 parity의 원출력/구조화 결과는 승인된 Git 제외
`models/v430-siglip2/preparation.json`과 해당 경로의 실행별 logs에 유지한다. 원본 모델은
그대로 보존했고, 준비 script/출처와 라이선스 계약은 [provenance](../../../research/v430-siglip2-provenance.md)를 따른다.
최초 memory loader 진단에서는 image/text read buffer 단계에서 약372MB/1,129MB가 증가하고
free 직후 current RSS가 내려가지 않았다. 검증한 원본을 private0600 임시 FD로 stream copy하여
SHA 확인 후 같은 inode를 ORT path loader로 전달하는 방식으로 바꿨다. 임시 이름은 생성 즉시
unlink하고 정상/오류 모두 FD를 닫는다. 원본 모델을 다시 읽는 fallback은 없다.

`adapter-verify-fd-loader-final.log`의 최종 exit0은11개 pixel uint8/FP32 exact0,
실제4frame/8정상text의 maxabs9.1307946e-7, mincos0.9999999999834759,
normerror1.61057e-8을 확인했다. 빈질의2개 거부,21오류/3허용경계/disabled,
부분쓰기·read/write EINTR·ENOSPC와 FD 집합/임시경로 정리를 같은 기준으로 검증했다.
encoder C++ process peak는3,155,230,720바이트, 오류 process는3,189,817,344바이트다.
진단 memory loader process peak3,916,873,728 대비 encoder761,643,008바이트 감소이며
서로 다른 process peak를 합산해 제품 혼합 부하의 측정값으로 주장하지 않는다.
부정 fixture18개/1,140,550,812바이트와 소유 tmp를 제거·부재 확인했다.
원본 모델/venv/export 등 지속 준비물은4,114,053,252바이트로 유지한다(제품 build 별도).

[제품 build](embedding-product-build.log)는 기존 `build-gst-onnx`에
`MEDIA_SERVER_USE_SIGLIP2=ON`, 격리 SentencePiece prefix를 지정하고 parallel2로 빌드한 exit0이다.
제품 binary에 연결되지만 HTTP 검색 기능이 연결됐다는 뜻은 아니다.
[worker 단기 실행](visual-worker.log)은21개 검사 PASS/exit0이며 동일 참조 embedding 재사용,
현재 reader가 구세대를 잡은 동안 세 번째 build 대기, 추가·삭제 반영, source/encoder 실패의
이전 게시본 보존, 요청100개 coalesce, encoder 동시1, 취소1초 이내 종료와 재활성화를 확인했다.
이 fixture는 대체 encoder로 수명만 검증하며 실제 모델 품질이나 녹화 decode 검증이 아니다.
소유 임시 directory 부재를 확인했다. 준비 원출력의 최초 실패와 재검증은 삭제하지 않았다.


## 보호 FD의 영상 frame 추출

`DecodeVisualFrame`는 caller의 FD 소유권·offset을 유지하는 appsrc/pread 경로에서 처음부터
디코딩하여 검증된 파일 표시 시각과 일치하는 RGB sample만 반환한다. 근처 frame 대체나
공유 source pipeline 접근을 하지 않는다. 최대 입력512MiB, RGB4096×2160/32MiB와5초
work budget을 적용하고 종료 시 pipeline을 NULL로 전환한다. OS I/O 정체의 절대 종료시간을
보장하는 것은 아니며 실제 녹화 SourceSeek→frame 연결 검증은 후속이다.

[최초 실행](visual-frame.log)은 테스트 영상을 만드는 `gst-launch`가60초 timeout으로 끝나
추출 코드 컴파일/실행에 도달하지 못했다. 예상 RED가 아니다. subprocess가 자식을 종료·회수했고
PID15267 부재와 정확한 소유 임시 directory 부재를 확인했다. 같은 GStreamer pipeline을
기존 native fixture 방식의 C++ API로 생성하자5초 안에 완료되어 CLI 경계와 분리됐다.
[재실행](visual-frame-native.log)은 exit0이며 실제160×90/25fps red MP4의0/40ms/3.96초
표시 시각·전체 RGB 색·크기, 중간시각/범위밖의 거부, 취소·크기·시간 예산·disabled 경계를
확인했다. FD offset37·열린 소유 FD·원본SHA를 유지했으며 임시 directory를 제거했다.
개별 pixel 검사를 포함한 수는 enabled43,222/disabled8이며 별도 기능 수로 환산하지 않는다.

제품 영향 build: `cmake --build build-gst-onnx --parallel 2`, tool session79877, exit0.
새 decoder를 runtime archive에 컴파일하고 media_server 링크를 완료했다.


## 실제 녹화 대표 frame의 모델 연결

`RecordingVisualSource`는 확정된 V2 file evidence에서 같은 channel/epoch의 파일 경계를
넘어 sample 주기를 유지한다. 원본 ns PTS와 파일 표시 시간을 구분하고 현재 media/AU hash,
재생 보호 FD 및 기존 SourceSeek 검사를 통과한 frame만 decode한다. legacy·무증명 원본은
제외 수로 표시하며 수용량 초과·취소에서 부분 목록을 게시하지 않는다.

[최초 build](visual-source-build.log)는 exit0이지만 int64 경계의 부동소수 변환 경고가 있었다.
`2^63` 경계를 정확히 비교하도록 수정했다. [최초 fixture](visual-source.log)는 exit1:
unknown UTC 시험이 필수 mapping 전체를 지워 source validation을 실패시켰다.
유효한 unknown mapping으로 수정한 [재검증](visual-source-retry.log)은 다른 시험의
잘못된 corruption reason `fixture-invalid`에서 exit1이었다. 두 실패는 예상 RED가 아니다.
기존 허용 reason `container-invalid`를 사용한 [상태 재검증](visual-source-state-retry.log)은
45개 검사/exit0이다. 실제 H.264 3파일, 1초/10초 주기의 파일 경계, UTC 미확인, hash·채널·
취소·지원 제외, 손상/삭제의 옛 참조 거부, FD 보유 중 삭제 거부와 해제 후 삭제를 확인했다.

[실제 모델 연결](visual-source-model.log)은 제품 archive를 링크한 같은 fixture에 실제
SigLIP2를 연결한 exit0이다. 원본 PTS9,000,000,000ns의 frame에서 유한 L2 768차원을
생성했고 peak RSS3,175,776,256바이트를 측정했다. 817개 검사 중768개는 각 차원의 유한성
검사로 독립 기능 수가 아니다. 모든 실행의 소유 임시 directory 부재가 로그에 있다.
이 결과는 8채널·100k 이력·4검색과 모델을 함께 실행한 측정이나 HTTP/UI 완료가 아니다.

이벤트 snapshot 조사에서 기존 manifest의 ms 시각과 가장 가까운 frame 선택은 정확한
original sample 연결 증명이 아님을 확인했다. 기존 snapshot을 임의 승격하지 않으며,
생산·저장 경로 확장 또는 이번 버전 제외 여부를 사용자에게 확인 중이다.


## 고정 영상 retrieval 품질과 재현 준비

실제 encoder/index의 최초 품질 실행 `models/v430-siglip2/retrieval-verify-first.log`는 exit0이다.
사전 고정한 네 장면·영어8/한국어8 positive 모두 scene Hit@1=1/MRR=1이었다.
23개 warm 질의 p95 95.701542ms/max95.729167ms, process peak3,146,563,584바이트다.
무관 질의4개와 없는 조합4개는 정답 없는 진단 대상으로 보존했다. 없는 조합의 점수가 일부
positive와 겹치므로 단일 threshold의 정확한 거부나 일반 감시 영상 품질을 주장하지 않는다.
개별384개 점수·24개 질의와 지연은 `preparation.json.retrieval_verification`에 남아 있다.

작은 고정 JSON은 `scripts/fixtures/v430-siglip2-retrieval.json`에 최초 bytes 그대로 보존했다.
모델 미로딩 `retrieval-prepare`는 source PNG4개/crop PNG16개/RGB16개와 manifest copy의
기존 hash37개를 대조해 exit0이었다. JSON/RGB 소유 부정 copy는 각각 기대 exit1이며 기존
bytes를 덮어쓰지 않았다. tracked JSON·영상·이미지38개 불변 및 staging/부정 fixture/pyc
정리를 확인했다. 원출력은 `models/v430-siglip2/retrieval/retrieval-prepare-{first,final,boundaries}.log`,
구조화 결과는 `preparation.json.retrieval_preparation`과 `retrieval/reproduction-boundaries.json`이다.
준비 과정은 실제 모델 품질 재실행이 아니다. 추출기 버전 변경에 따른 bytes 차이는 실패한다.


## Cache 강제 중단·재시작

[강제 중단 실행](visual-store-interruption.log)은 enabled35/disabled3 검사 exit0이다.
완성본을 보존한 채 소유 child를 rename 직전에 SIGSTOP하고 SIGKILL·waitpid로 회수했다.
이전 완성 cache를 다시 읽고, writer 잠금 해제 후 고정 pending을 회수하여 같은 결과를
게시했다. 동시 writer는 거부하며 pending symlink와 전용 형식이 아닌 bytes는 건드리지 않는다.
정상·주입 오류·재시작 뒤 pending 부재와 소유 임시 directory 부재를 확인했다.

기존 random 임시명은 반복 중단 때 누적될 수 있으므로 전용 directory의 writer flock과
고정 pending 한 개로 바꿨다. `.visual-writer.lock`은 유지하는 빈 잠금 파일이고,
`.visual-pending.v1`만 검증 후 회수한다. 이전 cache 포맷·공간ID·원본 녹화는 그대로다.
임의 경로를 순회·삭제하는 cleanup은 추가하지 않았다. 실제 OS 디스크 고갈/전원 장애나
임의 파일시스템의 fsync 내구성을 이번 단기 검사로 입증한 것은 아니다.


## Ops API·모델/녹화 혼합 개발 검증

`VisualSearchApplicationService`와 설정·HTTP 연결을 추가했다. 모델 준비 실패/최초 색인 전은503,
권한 검사는 추론 전이고 결과 선택은 현재 채널·원본 hash/sample·재생 보호를 다시 확인한다.
최대4요청/추론1개이며 재구축 중에는 이전 완성본만 조회한다. 현재 파일 검증에 실패한 결과를
그대로 반환하지 않는다. 기본off이고 Client/viewer UI나 기존 구조화 검색 계약은 바꾸지 않는다.

- [최초 build](visual-api-build.log): exit2. 설정 로더에 넣을 블록을 const 접근자에도 중복 삽입해
  컴파일 실패했다. const 접근자의 중복 블록을 제거한 [재빌드](visual-api-build-retry.log)는 exit0.
  예상 RED로 분류하지 않았다.
- [실제 모델 API](visual-api.log): 제품 archive·실제 두 채널/6파일로53검사 exit0.
  한국어/영어 입력, 모든 금지 채널 사전403, invalid/Unicode 공백400, scope 철회와 현재
  채널 비활성·원본 손상·결과 선택 재검증, 공개 정제·Stop 후503을 확인했다.
- [4개 동시 검색](visual-api-concurrent.log): 재색인 중 이전 완성본 조회를 연결하고 같은 검사를
  유지한54검사 exit0. 4thread×6회 모두200, warm p95 397.766ms/max446.909ms,
  peak RSS3,195,027,456바이트. 소유 임시 directory 부재를 확인했다.
- [실제 HTTP](visual-http.json): 모델OFF 실제 loopback의28요청/146assertion PASS.
  admin/scoped operator의 disabled 기능503·status200, viewer/integrator/no-ops403,
  금지 source·혼합403, 미인증401, 입력400, 전 응답no-store/최소 공개JSON을 확인했다.
  최초 sandbox EPERM(exit1/HTTP0건)과 후속 실행을 previousRuns에 보존했다.
  최종 환경은 HOME을 보존하고 앱/TMPDIR/GST/XDG cache를 소유 경로로 격리했다.
  서버 정상exit0, TCP2개폐쇄·UDP종료·root부재를 확인했다. 모델ON HTTP/실제UI의 대체가 아니다.

[모델 혼합 부하](visual-mixed-load.log)는 같은100,000 예약 이력 B root에10,000관측,
8채널/4검색과 실제 SigLIP2를 실행했다. seed240packet/8파일을 먼저 색인하고, 녹화
720packet/24파일을 추가하여 최종채널별4파일/32파일·32대표frame을 확인했다.
부하 중 검색7회 모두200, client별1회이상 성공했고 각 검색 중 packet 진행이 관측됐다.
p95/max793.665ms, peak RSS3,698,327,552바이트다. 모델 포함 native heap used1,841,287,248 /
reserved2,133,393,408바이트는 Catalog의512MiB 논리량으로 부르지 않는다.
제품 부하 process65.963초/사전90초 이내 exit0, 원래 이력 SHA 불변·미디어 건강도·
소유 fixture183,864,560바이트 정리를 확인했다. GStreamer scanner의 기존 GTK class 경고는
로그에 유지했다. 작은7표본의 단기 지연이며 30분/120분이나 일반해상도·장시간 지원 보장이 아니다.

[통합 build](visual-integration-build.log)는 cache 중단 복구 변경까지 제품 archive/binary에
연결한 exit0이다. 이후 UI의 탐색완료 표시 수정은 다음 UI build로 검증한다.
