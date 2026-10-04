# v4.3.0 개발 실행 기록

개발 계약은 [설계](../../../superpowers/specs/2026-10-04-v430-visual-vector-search-design.md),
기능별 기대값은 [inventory](../../../project-feature-test-inventory.md#v430-자원-수명과-벡터-검색)에 둔다.
이슈1~9 구현과 개발 직접 검증을 마쳤다. 이슈10의 버전·문서·증거·정리도 확인했으며 최종 커밋과 브랜치 push 결과는 종합 보고에 기록한다. 아래 개발 마감 당시에는 릴리즈용 검사·30분·120분·UI 풀테스트·PR·병합·공개를 실행하지 않았다.
이후 별도 승인한 로컬 릴리즈 검증은 [후속 실행 결과](../test-acceptance-current-final/report.md)에 두며, 아래 개발 시점의 관측과 실패 기록을 변경하지 않는다. 현행 공개 여부와 검증 한계는 [릴리즈 노트](../../../release-notes-v4.3.0.md#검증-상태)를 따른다.

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

## UI 개발·현재 증거의 미해결 사항

Ops 대표 프레임 검색 화면과 현재 선택 재생을 구현했다. 수집 off인 등록 채널도 과거 녹화를
검색하도록 공급 목록을 보정했다. 현재 채널 삭제와 scope 검사는 유지한다. 앞 API 검사의
“채널 비활성”은 fixture 공급 목록에서 채널을 제거한 조건이며 수집 off의 직접 검증이 아니다.
이 화면과 수집 off 보정은 실제 UI 확인 전이며 아직 완료로 판정하지 않는다.

- [UI 상태 회귀](visual-ui-state-settled.log): 기존 구조화 검색과 새 화면을 합쳐18검사 PASS,
  exit0. 늦은 응답/이전 player event, 오류 응답, URL·seek 경계와 최초 탐색 완료 뒤 수동
  이동을 확인했다. VM 상태 검사이므로 브라우저·영상 표시·재생 PASS가 아니다.
- [현재 제품 build](visual-ui-history-build.log): 수집 off 채널 공급 보정까지 exit0.
  이전 [UI build](visual-ui-build.log), [탐색 완료 build](visual-ui-settled-build.log)도 보존했다.
- [worker 영향 회귀](visual-worker-interruption-regression.log): cache 중단 복구 변경 후
  21검사 PASS,4encode/7scan, exit0 및 소유 임시 directory 부재 확인.
- [구조 검사](visual-structure-check.log): 4검사 PASS, exit0. 기존 허용 의존 관계 안에서
  현재346파일/157translation unit을 [연결](visual-structure-bind.log)했다. 과거 승인 기록을
  새 검토로 바꾸지 않았다.
- [실제 UI 준비](visual-ui-preparation.json): FAIL. 최초 seed 컴파일의 iostream 누락을
  수정한 후 공개4신 원본240 AU/8초/대표8시점은 확인했으나 writer가
  `ambiguous-original-vcl`로 정확 원본 증명을 거부했다. 두 실패와 실제 명령·출력은 해당
  JSON에 보존했다. 모델/서버/브라우저 검증은 실행하지 않았고 소유 임시 root 부재를 확인했다.
  원본 증명 기준을 완화하지 않았다. 대체 ball 영상 UI 검증 또는 별도 codec 파생 fixture의
  사용 결정을 요청했으며 승인 전 대체 실행하지 않는다.
- [기능 증거 검사](visual-feature-evidence-check.log):
  `node scripts/internal/verify_feature_implementation_evidence.mjs`, exit1.
  inventory/manifest986행은 일치하지만 inventory hash와 기존 REVIEW4 source/body 연결
  불일치595건, negative fixture0/15 미실행이다. 제품 결함595개나 새 독립 검토 완료를
  의미하지 않는다. 검토 증거 갱신과 필요한 재검증이 남았으며 해시만 바꿔 PASS 처리하지 않았다.
  실패 로그의 ID/role을 현행 manifest의 `semanticEvidence.review4Proof.roles`와 읽기 전용으로
  대조한 결과,594건은297개 기능이 공유하는 `src/ingress/webrtc_http_server_runtime.cpp`
  한 파일의 연결이고 나머지1건은 inventory hash다. v4.2.0 tag 대비 해당 파일의 변경은
  녹화 권한 거부 응답에 no-store 추가와 visual-search 세 route 연결이다. 검사는 파일 전체
  SHA와 enclosing body SHA를 묶으므로 공유 파일 변경이 여러 기능의 재검토 요구로 전파된다.
  이는 불일치 발생 범위를 좁힌 결과이며297개 기능의 동작 동등성이나 독립 승인 증거는 아니다.

기존 이벤트 snapshot의 정확 원본 증거가 부족하여 대표 frame만 완성할지, snapshot 생성·저장
범위를 확장할지의 결정도 남아 있다. 버전 선언은4.2.0이며 v4.3.0 개발 완료·최종 push·
릴리즈 테스트 진입 준비를 주장하지 않는다. 위 실패 이후 새 제품 수정이나 대체 검증은
진행하지 않았으며 기존 미커밋 변경을 보존했다.

## 승인 후 이벤트 스냅샷 원본 증명 확장

사용자가 권장한 스냅샷 생성·저장 확장과 공개4신 codec 파생 fixture 개발을 승인하여 재개했다.
`originalFrameProof`는 실제 snapshot으로 선택된 frame의 ns 단위 원본 후보와 RGB/JPEG 해시를
기존 내부 manifest에 추가한다. 이벤트 시각이나 TimestampMatch를 decoded 고유성으로 승격하지
않는다. 현재 유일 원본의 보호 FD decode RGB가 저장 후보와 일치해야 실제 JPEG를 임베딩한다.
manifest 전체 SHA가 cache ID를 구분하며 조회·선택은 현재 이벤트·채널 권한·이미지와 원본을
다시 확인한다. 기존 무증명/미지원 snapshot은 제외하고 후보 픽셀 불일치는 색인 실패로 처리한다.

- 후보 증거 단기 검사: [최초 컴파일 실패](snapshot-proof-first.log)의 initializer list 타입
  불일치와 [두 번째 컴파일 실패](snapshot-proof-retry.log)의 Werror 복사 경고를 수정했다.
  둘 다 예상 RED가 아니다. [수정 후](snapshot-proof-compile-fixed.log) OpenSSL on31검사 /
  off2검사 PASS, exit0 및 소유 임시 경로 부재 확인. hash 독립 고정값, RGB row padding,
  ns/track 불일치·nearest·ambiguous, strict JSON/숫자 경계·실패 출력 불변을 확인했다.
- [실제 snapshot 원본 연결](snapshot-source-first.log): 실제 B writer/dispatcher가 저장한
  JPEG와 manifest에서805검사 PASS, exit0. 현재 원본 RGB 대조→JPEG decode→실제 SigLIP2,
  manifest/image 변조·symlink·삭제/재생보호를 확인했다. peak RSS3,180,544,000바이트.
- [검색/선택 연결 추가](snapshot-source-api.log):818검사 PASS, exit0. 한국어 실제 검색의
  snapshot 포함, 최소 공개 필드, 권한403, 이벤트 삭제 후 cached hit410/검색 제외를 확인했다.
  [snapshot 존재 사실 필터 반영 후](snapshot-source-event-filter.log)818검사 PASS,
  peak RSS3,197,730,816바이트. 두 실행 모두 소유 임시 경로 부재 확인.
- [통합 build](snapshot-integration-build.log), [현재 이벤트 필터/UI build](snapshot-events-filter-build.log): exit0.
  [UI 상태 검사](snapshot-ui-state.log)18 PASS, exit0이며 실제 UI 검증 대체가 아니다.
- [기존 분석 상태 회귀](snapshot-analysis-regression.log):181 PASS와 SAFE-083/084 clip/manifest
  확인, exit0. 스크립트 출력에서 식별한 build directory와 비민감 빈 dependency scan 출력의
  owner/형식·현재 내용을 확인하고 정리·부재 결과를 같은 로그에 남겼다.
- [현재 구조 연결](snapshot-structure-bind.log)은349파일/159translation unit/18edge이며
  [구조 검사](snapshot-structure-check.log)4 PASS, exit0. 허용 의존 관계는 확대하지 않았다.
- [기존 dispatcher 회귀 최초 실패](snapshot-dispatcher-regression.log): fixture의 수동 link 목록에
  현행 retired receipt 구현과 기존 zlib 연결이 빠져 exit1. 소유 임시 경로는 정리됐다.
  제품 판정이나 예상 RED가 아니다. 실제 정의 파일과 기존 의존성을 연결한
  [재실행](snapshot-dispatcher-regression-retry.log)은5개 실제 process와2개 mutation 음성대조
  PASS, exit0/40.828초이며 소유47파일/28,426,132바이트 정리·root 부재를 확인했다.

- [기존 대표 프레임 API 회귀](snapshot-representative-api-regression.log):54검사 PASS,
  exit0. 4thread×6회 검색 모두200, warm p95 385.792ms/max447.178ms,
  peak RSS3,195,371,520바이트이며 소유 임시 경로 부재를 확인했다.

공개4신 codec 준비의 초기4bit frame_num 16주기 중복과 intra-refresh 적용 후128주기
중복 실패는 [준비 결과](visual-ui-preparation.json)에 보존했다. 이후 격리 fixture 전용
CAVLC frame_num 4→12bit 변환에서 원본·codec 파생·최종 MP4의 decoded YUV 동일성과
240개 고유 AU, 현재 V2 원본 증명, 대표8시점의 재조회 불변을 확인했다. 최종 MP4 SHA는
`589f63229089e8f1230c0eb6c33bc6800125541eb47e3e9f75f0dc4598089049`다.
이는 파생 fixture 준비 PASS이며 원래 공개 MP4의 strict 원본 증명 지원을 고쳤다는 뜻은 아니다.

실제 모델 서버는 준비15,252ms 후8개768차원 유한 정규화 문서를 확인했다. 300초 hold 동안
1초 간격으로 관측한 최대 RSS는3,189,948,416바이트다. startup 전체 peak나 부하 검증값은 아니다.
브라우저는 `/setup` 화면까지만 관측했으며 검색·선택·영상 재생은 미실행이다.
따라서 `actualUiPass=false`를 유지한다. 2026-10-03T23:27:16.996Z 한도에 자동 종료됐고
서버 exit0, HTTP/RTSP 포트 폐쇄, UDP 종료, 소유 임시 root 부재와 브라우저 탭 닫기를 확인했다.
한도를 연장하거나 준비 PASS를 실제 UI PASS로 바꾸지 않았다.

실제 UI 재실행과 별도 모델의 최종 독립 검토 승인을 요청했다. 실제 UI·최종 독립 검토·
증거 갱신·버전 확정·최종 푸시는 아직 완료하지 않았다.


## 승인된 실제 UI 재실행

사용자가 독립 검토와 UI 재실행을 각각 승인했다. `--browser-ready` 모드는 기존 인증 fixture
API로 폐기용 계정을 준비하고 소유 root의0600 handoff만 사용했다. 브라우저 setup 검증은 아니다.
현재 binary SHA `e925fa7187c70fdd488eeb4a4fb1ff9568905bc9a76fc20dd25f9dd517a3bc5f`,
준비15,601ms, 준비·브라우저·정리 합403,228ms로 승인된 hold600초 이내에 종료했다.
실제 조작은 Codex in-app browser의 native/Playwright UI API로 수행했다. DOM 읽기는
표시 내용과 video.currentTime/duration/readyState/크기/error 확인에만 사용했다.

| 직접 조작 | 기대값과 관측 | 판정 |
| --- | --- | --- |
| 수집 off 등록 채널, 한국어 장면 설명 | 실제 모델 결과8개, score약0.040 | PASS |
| 영어 장면 설명 | 실제 모델 결과8개, score약0.047 | PASS |
| 한국어 첫 결과 선택 | currentTime2초, duration8초, readyState4,1280×720,error없음 | PASS |
| 실제 재생 버튼 | currentTime2→8초, ended=true,error없음, 전체4신 영상 관측 | PASS |
| threshold1 | 결과없음 안내, 이전 결과·player 비움 | PASS |
| 시작시간만 입력 | 시작·종료 모두 입력 안내, 결과·player 비움 | PASS |
| 정상 시간쌍 입력 | 08:30~08:40 현지시간에8결과 | PASS |
| 상태 새로고침 | coverage갱신/결과비움은 수행하나 '8개 유사 결과' 문구 잔존 | FAIL |
|390×844 모바일 light/dark | 입력·버튼 읽기 가능, 전체player와controls 표시, 선택1초로 이동 | PASS |
| viewer 로그인·Ops 직접경로 | Client Live/Dashboard만 표시, Ops경로 Access Denied | PASS |

시각 증거는 [전체 재생](visual-ui-playback.jpg), [입력 오류](visual-ui-input-error.jpg),
[모바일 다크 폼](visual-ui-mobile-dark-form.jpg), [모바일 다크 영상](visual-ui-mobile-dark-player.jpg),
[모바일 라이트 폼](visual-ui-mobile-light-form.jpg), [viewer 거부](visual-ui-viewer-denied.jpg)에 둔다.
이미지는 각각 현재 viewport이며 전체 페이지나 모든 결과 행을 한 장에 담았다고 주장하지 않는다.
동일4신 전체 영상의8시점으로 실제 연결·재생을 확인했으며 장면별 순위 품질 검증의 대체가 아니다.

UI setup/실제 snapshot 결과/410 삭제 경합/모델 unavailable의 실제 브라우저 조작은 미실행이다.
기존 API·VM 증거와 구분하며 이 실행 전체를 UI PASS 또는 릴리즈 풀테스트 PASS로 판정하지 않는다.
RSS는 hold 중1초 간격 관측 최대3,191,193,600바이트다. 소유 서버 정상exit0, HTTP/RTSP폐쇄,
UDP종료,18,512,350바이트 임시 root 부재, 탭 닫기와 viewport 초기화를 확인했다.
최초300초 실행과 이번 실행의 준비·정리 원자료는 [준비 JSON](visual-ui-preparation.json)에 유지한다.


## 최종 독립 검토 1차

사용자 명시 승인으로 새 `gpt-6-astra` / `xhigh` 에이전트가 읽기 전용 검토를 수행했다.
기준은 `8244db05`→HEAD `cb5855a3b1ffa90a6d10778c715d6b0c91606ca7`와 당시 미커밋 변경이다.
검토 시작149파일 SHA를 메인이 보관·대조했으며 검토 중 제품 소스 변경은 없었다.
UI 승인에 따른 fixture/정의/실행기록·화면만 추가됐다. 모델은 도구에 지정한 값이며
확인하지 않은 snapshot이나 service tier 적용을 주장하지 않는다. 검토자는 새 테스트·빌드·
브라우저·외부 호출·파일/Git 변경을 실행하지 않았다.

- P1: snapshot 후보 proof가 선택 frame만 검증하고 이벤트의 source association/epoch와
  결합하지 않는다. reconnect 후 PTS 중복 때 이전 이벤트에 새 세대 frame이 연결될 수 있다.
  `event_storage.cpp:2412`, `recording_visual_snapshots.cpp:68`, `EventFacts`의 epoch 누락.
  코드 경로 확인이며 경합 실행 재현은 아직 없다.
- P2: Search의5초 deadline이 하위 원본 검증에 전달되지 않고 Resolve실패를 후보 제외로
  처리한다. 마지막 후보가 timeout/I/O로 탈락하면200빈결과가 가능하다.
  `visual_search_application_service.cpp:128`, `recording_visual_source.cpp:113`.
  확정 삭제 제외와 검증 실패를 구분하고 하위·응답 직전까지 예산을 전달해야 한다.
- P2 설계 불일치: 미지원 decode를 제외·집계한다는 계약과 Encode실패 시 전체 unavailable
  전파가 다르다. 예:4096×2160상한 밖 입력. 무결성/픽셀 불일치 시 전체실패 정책 자체를
  결함으로 판정한 것은 아니다. `visual_index_worker.cpp:60`, `SelectSamples:34`.
- P2: 상태 새로고침 후 결과 개수 잔존. 위 실제 UI 관측을 소스로 확인했다.
  `product_ui_page_scripts.cpp:10530`.

이슈1~5와7은 명시한 제한 profile·기존증거 범위에서 완료로 검토됐고,
6·8·9는 위 결함,10은 결함·증거 불일치·버전/최종기록·커밋/푸시 때문에 미완료다.
개발 완료 판정은 보류다. 검토의 '새 결함 미발견'을 미실행 테스트 PASS로 바꾸지 않는다.


### 독립 검토 후 UI 수정

새로고침 시작·성공·실패마다 결과 안내를 갱신하도록 수정했다. 첫 추가 fixture의 정규식
SyntaxError는 [최초 출력](visual-ui-refresh-red.log)에 예상 RED가 아닌 준비 실패로 보존했다.
[수정한 fixture](visual-ui-refresh-red-retry.log)는 제품의 잔존 '2개' assertion에서 예상대로
실패했다. 제품 수정 후 [구조화 검색·영상 검색 상태 회귀](visual-ui-refresh-green.log)는19검사
PASS/exit0이다. 실제 브라우저 수정 후 재확인은 아직 미실행이며 이전 화면 증거를 수정 후
PASS로 재사용하지 않는다. 나머지 독립 검토3항목은 미해소다.

같은 독립 검토자가 좁은 UI 수정과 로그를 읽고4번은 코드상 해소로 확인했다. 직접 실행은 없었고,
수정 후 실제 UI 미실행과 나머지3항목의 전체 완료 보류 판정은 유지했다.


### P1 이벤트·스냅샷 세대 연결 보완

queued AnalysisResult의 PTS/TimestampMatch 원본으로 후보 generation/order/track을 제한하고,
proof 생성에서 재검사한다. 내부 proof v2의 필수 eventEpoch를 현재 EventRecord와 수집·검색·선택에서
대조한다. 공개 Event payload와 파생 cache 저장 형식은 유지하며 기존 v1 증거를 소급 승격하지 않는다.
같은 독립 검토자는 코드와 반례 fixture를 읽고 P1 코드상 해소로 판정했다. 검토자의 새 실행은 없다.

- [제품 build](snapshot-epoch-build.log): exit0.
- [후보 proof](snapshot-epoch-proof.log): OpenSSL on36/off2 PASS, exit0. 다른 세대/order,
  누락 association/epoch 거부와 원래 엄격한 parser·RGB 계약을 확인했다.
- [실제 저장·검색 연결](snapshot-epoch-source.log):823검사 PASS, exit0,
  peak RSS3,197,878,272바이트. 동일 PTS의 다른 세대 백색 frame을 나중에 넣어도 이전 세대 RGB를
  선택했고, 이벤트 epoch 변경 후 cached seek410/검색 제외를 확인했다. 기존 변조·삭제·hold
  검사를 함께 유지했다. 소유 임시 root 부재를 확인했으며 GStreamer scanner 경고는 원출력에 보존했다.

남은 제품 수정은 검색 deadline/실패 전파와 미지원 디코드 처리다. 공유 reader의 반복 파일 검증을
같은 보호 FD·요청 예산으로 연결하되 정상 삭제 제외와 timeout/I/O 실패를 구분해야 한다.
이 항목은 아직 구현·검증하지 않았으며 전체 개발 완료 판정은 계속 보류다.


### P2 검색 예산·실패 전파와 미지원 decode 보완

Search/Seek는 같은 5초 예산과 stop을 이벤트 facts, 물리 SHA/demux와 native evidence
검증에 전달하며 source seek는 이미 보호한 FD를 재사용한다. 확정 삭제만 후보에서 제외하고
I/O·hash·timeout 실패를 503으로 전파한다. 이벤트 비매칭 행·archive 열거·과대 행 skip도
협력적으로 취소한다. 내부 facts 조회의 중복 상태 복구 scan을 생략하며 일반 공개 조회 기본값은 유지한다.
OS blocking I/O와 ONNX 호출 자체의 선점 중단까지 보장하는 절대 wall-clock 한도는 아니다.

명시적으로 확인된 해상도 상한 초과·codec 미지원만 제외하고 채널별 개수를 표시한다.
무결성·픽셀 불일치·timeout·취소는 전체 새 색인 실패로 유지해 이전 완성본을 보존한다.
독립 검토자는 두 P2를 코드상 해소로 판정했고 이번 범위에서 추가 제품 회귀를 발견하지 못했다.
코드와 기록 읽기이며 검토자 직접 실행은 없다.

- [예산 초기 build](visual-budget-build.log), [최종 이벤트 예산 build](visual-event-budget-build.log): exit0.
- [예산 연결 검사](visual-budget-source.log):830검사 PASS, peak RSS3,198,484,480바이트.
- [이벤트 취소 포함 검사](visual-event-budget-source.log):837검사 PASS. 다만 과대행 assertion은
  약400KiB에서 취소되어 1MiB 초과 skip 증거로는 무효다. 다른 검사는 유지한다.
- [보정 후 재검사](visual-event-budget-source-retry.log):837검사 PASS, exit0,
  peak RSS3,201,351,680바이트. 350회 callback 뒤 취소하여 과대행 skip 분기를 실행한다.
- [미지원 build](visual-unsupported-build.log):exit0.
- [실제 decoder·worker](visual-unsupported-runtime.log):frame43,225·worker26검사 PASS, exit0.
  유효4352×64 MP4의 명시적 제외, 건강/미지원 혼합 게시와 무결성 실패 시 기존 게시본 보존을 확인했다.

모든 runtime 소유 임시 root 부재가 기록돼 있다. GStreamer plugin scanner 경고는 원출력에 보존한다.
사용자가 승인한 수정 후 실제 UI 재실행을 진행한다. 릴리즈 전체 UI·30분·120분 증거와 구분한다.


### 승인된 수정 후 UI 재실행

새 제품 binary로 같은 공개 4신 V2 codec fixture를 준비했다. 첫 준비는 loopback 포트의
sandbox EPERM으로 서버 시작 전에 실패했으며 root 부재를 확인했다. 권한 있는 재실행으로
준비했고 두 결과는 `visual-ui-preparation.json`의 현재 실행/previousRuns에 각각 보존된다.

실제 브라우저에서 admin 로그인 → `/ops/events` → 한국어/영어 검색 각각8결과,
한국어 첫 결과2초 이동(1280×720/8초/error 없음), 재생 버튼으로8초까지 정상 완료를 확인했다.
수정한 색인 상태 새로고침은 결과·player를 초기화하고 이전8개 안내를 지운 뒤 재검색 안내를 표시했다.
threshold1 빈 결과, 시작 시간만 입력 시 오류,09:10~09:20 정상 구간8결과를 확인했다.
390×844 light/dark의 입력·상태 가독성과 viewer 로그인 후 Live/Dashboard 메뉴만 표시,
`/ops/events` Access Denied를 확인했다. 임시 viewport/테마는 복원하고 생성 탭을 닫았다.
[새로고침 수정 화면](visual-ui-refresh-rerun.png)을 보존한다.

이는 변경 경로의 focused 실제 UI 재확인이다. API로 준비한 계정을 사용했으며 setup UI,
이벤트 snapshot 실제 UI, 삭제 race/503 실제 UI, 릴리즈 전체 UI·30분·120분은 실행하지 않았다.
준비 도구의 `actualUiPass:false`는 준비 결과를 제품 UI 전체 합격으로 승격하지 않는 경계다.
stdin이 닫힌 실행 세션에서는 수동 `stop` 전달이 불가능하여 기존600초 자동 종료를 기다린다.
자동 종료·포트·root 정리 확인은 아래 최종 상태에 기록한다.


현재 구조 graph는 [바인딩](visual-final-structure-bind.log)/[현행 검사](visual-final-graph-check.log)
exit0·4검사 PASS다. 실수로 실행한 [전체 과거 Slice 검사](visual-final-structure-check.log)는
14PASS/3FAIL로 보존한다. v390 기록의 branch·composition anchor·slice32 policy 결박이
현재 v430과 다르다는 실패이며 과거 승인 자료를 수정하지 않았다. graph-only 성공을 전체
검사 성공으로 대체하지 않는다. 현재 릴리즈 검증에서 필요한 역사 도구 적용 범위는 별도 확인 대상이다.

UI 재실행 정리 확인: binary `6885313e084e0338d7117270e0b6e3f357cc86f33e24450e5822064d6902c3df`, 준비 15805ms, 전체 616717ms, sampled peak RSS 3191226368바이트. 기존600초 자동 종료 후 소유 서버 exit0(강제 종료 없음), HTTP/RTSP 포트 닫힘·UDP 닫힘·소유 root 부재 확인. 실행 exit0이며 실제 focused UI 결과는 위 본문에 구분한다.

대표 프레임 API 회귀의 [최초 출력](visual-final-api-regression.log)은51번째 corrupt candidate excluded에서FAIL이다. 기존 fixture는 재색인 전 old ready 게시본에서도200을 기대했으며 새 승인 계약은 검증 실패503이다. 잘못된 반환값을 허용하지 않도록503에서 대기하고 다음 전체 재색인의200에서 corrupt ID 부재를 요구하도록 fixture를 보정한다. 동시4검색24건은 p95 398.404ms/max430.942ms였으나 전체 검사를PASS로 기록하지 않는다.

[API 회귀 재검증](visual-final-api-regression-retry.log)은59검사 PASS/exit0, 동시4검색24건 p95 399.877ms/max430.444ms, peak RSS3,195,387,904바이트다. 소유 root 부재를 확인했다. 서버 변경은 `fdf4f3e7`, 실제 UI와 fixture는 `9f9f3bc0`로 분할 커밋했다. 소스 VERSION/CMake는4.3.0으로 올렸으며 이전 UI binary와의 차이는 이 버전 표기 변경으로 구분한다.

버전 표기 갱신 후 [build](visual-version-build.log), [로컬 release metadata](visual-release-metadata.log), [문서 링크](visual-docs-links.log), [현행 graph](visual-version-graph-check.log)는 exit0이다. 외부 공개·전체 릴리즈 gate 실행을 뜻하지 않는다. 기존 증거7개 좌표 보정으로986개 모두 연결됐고689개동일이관/297개공통변경 재판정 집합을 확정했다. 최종 독립 판단 결박과 승인 원자 적용은 진행 중이다.


## 개발 마감 판정

독립 검토의 P1 세대 연결과 P2 예산/실패 전파·미지원 제외·UI 상태 초기화는 수정·직접 검증·재검토로 해소했다.
실제 UI는 승인된 변경 영역 재실행만 PASS이며 릴리즈 전체 UI는 미실행이다.

[독립 판단](independent-source-decisions.json)과 [고정 자료](independent-source-package.json)는
297개 변경 연결만 승인한다. [이관 근거](source-migration-evidence.json)로689개의 기존 승인을 유지하고
[원자 적용](source-migration-apply.log) exit0 후 [현행 증거 검사](visual-final-feature-evidence.log)는
986개 source/verifier/semantic 연결, validation/global 오류0, negative fixture15/15 PASS다.
이 검사는 실행 증거가 아니다. 최초 candidate는7개 중복 anchor 좌표 미해결이었으며,
EVT-010/011/060, MEDIA-007, LAB-026/027, SAFE-084의 기존 함수·context 바이트를 독립 대조한 뒤
좌표만 보정했다. 과거 audit/approval 원본은 `cb5855a3:test/fixtures/`의 같은 파일과 실제 바이트가
일치함을 확인해 중복 보존하지 않았다. [검토 diff](independent-source-snapshot.diff), 판단/package/이관/적용 로그의
보존 사본 바이트를 대조했고 소유 임시 검토 root를 정리해 부재를 확인했다.

현행 구조 gate의 handoff/readiness는 실제로 `--graph-only`를 호출한다. 실수로 실행한 역사 Slice 전체
모드3FAIL을 현행 graph4PASS로 덮어쓰지 않으며, 실패한 역사 승인·분기·anchor를 변경하지 않는다.

| 이슈 | 개발 판정 |
| --- | --- |
| 1 | 지원 규모·자원·동시성의 유한한 기준 확정 |
| 2 | 동일 조건의100,000 identity 전후 소유량/RSS 측정 완료 |
| 3 | 중복 상주량 개선과 ID·복구·삭제·pin/hold 영향 회귀 완료 |
| 4 | idle snapshot 만료·후보 사본·예약 중 검색 갱신 비용과 혼합 부하 검증 완료 |
| 5 | 실제 SigLIP2·tokenizer·contract·출처/라이선스·한영 품질 fixture 고정 |
| 6 | 대표 frame/이벤트 snapshot 원본 연결·재색인·중단 복구·contract 분리 구현 |
| 7 | exact top-k·threshold·안정 정렬·오류 경계 검증 완료 |
| 8 | 실제 텍스트 검색·권한·현재 재생과 변경 영역 UI 재확인 완료 |
| 9 | 설정 주기 색인·게시 세대/admission·취소·종료·재활성화 구현·검증 |
| 10 | build·영향 회귀·독립 검토·문서/VERSION4.3.0·증거/임시정리 확인, 분할 커밋 후 push 단계 |

릴리즈 잔여는 순서대로 다음과 같다. 아래 실행·공개 권한을 이번 개발 승인에서 추정하지 않는다.

1. 릴리즈 cut의 안정화/build/Auth/media 및 영향 회귀, `verify-predev` 실행 범위와 격리 환경을 별도 승인한다.
2. 필수30분과 Policy v4 실제 UI 전수 검증을 실행한다. 이번 focused UI와 fixture/정적 검사는 대체 증거가 아니다.
3. 새 worker·자동 만료·FD 검증·추론 수명 변경 때문에120분 검증을 권장한다. 현재 gate/기능 매핑에서 필요성을 최종 판단하고 별도 실행 승인을 받는다.
4. required CI·라이선스/배포 검토와 원본 기록 보존 확인을 마친 뒤 승인된 기록 정리 커밋을 만든다.
5. 별도 승인으로 PR 생성·main 병합, 최종 main 재확인, signed annotated tag와 서명/원격hash 검증, source-only Release 공개와 실제 Latest 확인을 수행한다.
6. 공개 결과 확인 후 별도 승인으로 로컬·원격 v4.3.0 브랜치를 삭제한다.

지원 범위는 개발 계약의 제한 profile이다. 무기한 이력·임의 codec·장시간 운용 안정성,
calibrated 사건 판단·얼굴/신원 검색·다음 버전 기능을 완료한 것으로 확대하지 않는다.

최종 staged diff 검사의 첫 exit2는 원본 patch의 빈 context행 접두 공백과 실패 stdout의 빈 들여쓰기2행 때문이다. raw bytes와 검토 hash를 보존하기 위해 기존 `.gitattributes`의 불변 실행자료 방식에 따라 위두파일만 blank-at-eol에서 제외했다. 소스/문서의 공백 검사와 제품 합격 조건은 유지하며 원문을 trim하지 않았다. 마지막 [문서 링크 확인](visual-closeout-docs-links.log)은 exit0이다.
