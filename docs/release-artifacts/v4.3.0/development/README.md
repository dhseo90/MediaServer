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
