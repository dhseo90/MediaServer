# LP26-O10 격리 누적 선행 진단 결과

독자: S11 녹화 누적 비용 분석 담당자. lifecycle: 이번 선행진단의 최초 실패·교정·단회 재검증을 보존한다.
정책 source-of-truth는 AGENTS.md, 실행 정의와 색인은 [중앙 기록](../../../release-test-records.md)을 따른다.

1020원본/4080행의 strict 복구·cold/warm checkpoint·원장 회전 관측을 확보했다.
2049원본/8196행은 initial 관측 뒤 **독립 recovery15초 제한에서 중단**해 다음 단계가 미완료다.
실제 앱 HTTP timeout이나 기존 장시간 실패의 원인을 확정하지 않는다. 제품 코드는 수정하지 않았다.

## 기준과 독립 oracle

- 작업 시작: HEAD `dccd425f`, `v4.1.0` clean 직접 확인.
- 측정 source: 메인 담당의 LP15 wrapper 호환 커밋 후 `4f39b2f6cf5e31c78f55e3291ade962e2b653f84`.
  원본/소유복제본 SHA256, compiler/library 버전은 각 measurement 로그 앞부분에 있다.
- macOS Darwin arm64, Apple clang21, GStreamer1.28.1, SQLite3.51.0, OpenSSL3.6.2.
  C++17 **명시적인 -O 없음**, FC01 소유복제본 중첩계측 켬; overhead를 빼지 않았다.
  해당 fixture의 시간은 최적화된 실제 서버 성능과 동등한 증거가 아니다.
- 실제 writer가 생성한 60 AU 원본1개의 파일증거를 검증한 뒤, 각 ID/order의 segment·binding·tombstone을
  typed struct 및 기존 serializer로 다시 생성했다. 별도 strict catalog Open의 zero recovery errors·4N mutation·N tombstone이 oracle이다.
  모든 scaled 원본은 삭제 완료 상태이고 media 파일을 생성하지 않는다. seed 실제파일도 생성 뒤 삭제한다.
- 작은16/64행, 실패근접1020/4080행, record상한초과2049/8196행.
  실제 보존 실패4071행과 synthetic4080행은9행 차이가 있다. 시간축·동시성·실제 payload 전체는 동일하지 않다.
- 64MiB·8192행 exact/plus1은 별도 admission 함수의 논리경계 검사다. 임의 payload를 쓴 경계검사가
  유효한 대용량 저장/복구 PASS를 뜻하지 않는다.

## 실행과 실패 이력

```sh
node --test scripts/internal/recording_accumulation_plan.test.mjs
bash scripts/internal/verify_recording_accumulation_probe.sh --run
bash scripts/internal/verify_recording_accumulation_probe.sh --case 1020
bash scripts/internal/verify_recording_accumulation_probe.sh --case 2049
bash -n scripts/internal/verify_recording_accumulation_probe.sh
node --check scripts/internal/recording_accumulation_run.mjs
node --check scripts/internal/recording_accumulation_prepare.mjs
git diff --check
```

| 실행 | exit | 실제 결과 | 근거 |
| --- | --- | --- | --- |
| 단위 RED | 1 | 미구현 helper assertion3개 예상 RED | [red.log](red.log) |
| 최초 단위 GREEN | 0 | 3/3 | [green.log](green.log) |
| 최초 전체계획 측정 | 1 |34초; small 통과,1020 두번째 checkpoint에서 합산 fixture15초 제한 | [measurement-attempt1.log](measurement-attempt1.log) |
| 단계 경계 교정 unit | 0 |4/4 | [stage-oracle.log](stage-oracle.log) |
| 1020 단회 재검증 | 0 |39초; 독립 각 단계15초 안 완료 | [measurement-1020-recheck.log](measurement-1020-recheck.log) |
| 2049 단회 측정 | 1 |38초; recovery 독립15초 제한, 뒤 단계 건너뜀 | [measurement-2049.log](measurement-2049.log) |
| 최종 unit | 0 |4/4; begin 없는 null wall 거부 포함 | [final-unit.log](final-unit.log) |
| 문법/공백 | 0 |bash -n, 두 node --check, git diff --check | 도구 exit 직접 확인 |

`red.log`의 의미 없는 공백-only 줄 6개는 저장소 공백 검사를 위해 빈 줄로 정규화했다. 실패 내용·순서·판정은 변경하지 않았다.

최초 합산15초는 fixture 정의 오류였다. 당시 **복구9.803초, 첫checkpoint4.197초는 각각 완료**됐고
두번째 checkpoint는 측정되지 않았다. 제품 복구 timeout으로 해석하지 않는다.
원래 실패를 보존하고 메인 지시에 따라 단계 begin/wall의 순서를 검사하는 독립15초 watchdog을 구현했다.
전체65초는 process cleanup을 위한 기술적 상한으로만 남겼다. 1020을 한 번 재검증한 뒤 메인 지시로2049를 한 번 실행했다.
HTTP4초·표본15초·native normalize3초·복구15초·원장 계약은 바꾸지 않았다.

각 실행에서 native probe/normalizer/metrics 컴파일을 독립60초 상한으로 수행했으며 모두 exit0,
생성은60초, 출력은4MiB, 소유root는448MiB, 각 측정프로세스 RSS는1GiB 경계를 사용했다.
장시간/실제 HTTP/브라우저를 실행하지 않았다. 마지막 malformed mutation 거부는1020 실행에서 통과했다.
2049 실행은 recovery 실패 뒤 해당 거부 검사를 다시 실행하지 않았다.

## 규모와 비용 직접 측정

| 항목 | 작은16/64행(첫 실행) | 실패근접1020/4080행(재검증) | record초과2049/8196행 |
| --- | ---: | ---: | ---: |
| 원장 원본 bytes |299,331|19,113,993|38,420,091|
| cache 논리 charge bytes |300,163|19,167,033|38,526,639|
| 논리 입장 예상 |허용|허용|record수로 거부,64MiB 미초과|
| initial observer drain |0.445초/1poll|5.590초/1poll|11.224초/2poll|
| strict recovery wall |0.088644초|9.931961초|독립15초 중단·미완료|
| recovery catalog hold |0.076018초|9.205167초|미확인|
| 첫·끝 비활성 binding2개 cold획득 |0.004856초|0.005232초|미실행|
| 첫 checkpoint wall/hold |0.067713초|4.179822초|미실행|
| 첫 checkpoint 원본적용/cache |64/retained|4080/retained|미실행|
| 반복 checkpoint wall/hold |0.038450초|2.435146초|미실행|
| 반복 checkpoint 재사용/원본적용 |64/0|4080/0|미실행|
| 실제 checkpoint inode교체 뒤 observer drain |0.130724초/fresh0|5.339934초/fresh0|미실행|
| native 확인 RSS high-water |32,817,152B|242,024,448B|외부 관측최대333,676,544B,종료시 self peak 미확인|

모든 completed catalog lock wait는 단일스레드의 수백ns 수준(1020 recovery208ns/cold250ns/warm125ns)이었다.
이는 실제 요청 경합의 wait를 측정한 것이 아니다. 관측기 parent RSS와 native child RSS도 구분하며 합산peak라고 주장하지 않는다.
1020 parent는 drain 전69,369,856B→initial후130,809,856B→회전후153,960,448B,
2049 parent는67,944,448B→initial후174,948,352B→종료시196,427,776B였다.
단회 high-water/current 변화는 leak/drift 판정이 아니다.

### 1020 checkpoint 비용 분해

| 완료 구간 | cold inclusive | warm inclusive | 의미/겹침 |
| --- | ---: | ---: | --- |
| catalog hold 전체 |4.179820초|2.435144초|아래 중첩단계를 포함 |
| CheckpointLocked 전체 |4.179761초|2.435081초|hold 내부 |
| ReadCheckpointRecords |1.263542초|1.923362초|warm에서도 원장 전체 읽기/해석 비용 존재 |
| originalSemantic |2.239350초|42ns|warm prefix4080 재사용으로 originalApplied0 |
| PrepareCheckpoint |0.167862초|0.001134초|candidate 준비 |
| CommitCheckpoint |0.199485초|0.006351초|원본 semantic 검증과 별도 |
| CheckpointLocked exclusive |0.308444초|0.503080초|계측된 자식 구간 외 비용, 임의로 특정 함수에 귀속하지 않음 |

inclusive 수치를 서로 중복 합산하지 않는다. 세부 함수별 inclusive/exclusive/count는 원출력 cost 행 전부에 보존했다.
ReadCheckpointRecords가 cached prefix 판정보다 먼저 수행되는 현행 구조와 warm측정이 일치한다.
cache 입장 거부가1020의 원인이라는 주장은 직접 evidence와 맞지 않는다: 논리charge약19.17MB·4080행이며 실제cache 유지/재사용이 확인됐다.
2049는 record상한을 넘지만 actual fallback 단계까지 도달하지 않아 그 경로 비용은 미확인이다.

## 직접 확인·가설·미확정 구분

| 항목 | 분류 | 결론 |
| --- | --- | --- |
| 1020 cold hold4.180초 | 직접 확인 | 이 계측 fixture의 catalog 단일 잠금 보유가4초를 넘었다 |
| 실제 HTTP4초 timeout 가능성 | 가설 | cold checkpoint와 같은 mutex를 요구하는 요청이 겹치면 대기 위험이 있다. 요청 시작시점·기타 대기·최적화/계측 차이를 미측정 |
| 1020 warm hold2.435초 | 직접 확인 | 이 단일 구간만으로4초 초과를 입증하지 않는다. 기타 단계/경합을 합쳐 확정하지 않음 |
| 기존 pause5초+drain 비용 | 계산/가설 |1020 회전drain5.340+pause5=10.340초;15초까지4.660초가 metrics/root/status 등 나머지 예산이다 |
| 2049 관측 간격 위험 | 계산/가설 |initial drain11.224+pause5=16.224초. 동일비용이 실제 반복루프에서 발생한다면 부가작업 없이15초를 넘긴다. 실제 반복 환경 재현은 아님 |
| 장시간 원래 HTTP timeout/15초 gap5건 | 미확정 |이번은 paused synthetic 단일스레드·60AU·삭제완료 표본이며 실제 앱의 source/retention 동시성·HTTP·전송/부하를 재현하지 않았다 |
| recovery 초과 | 직접 확인 |2049 fixture의 recovery는15초 안 완료되지 않았다. 종료된 scope의 세부 cost만 배출하는 계측이라 미완료 recovery 내부 원인별 시간은 없다 |

## 개별 실행 결과

아래 pass/fail은 표시된 oracle/단계의 실제 결과이며 전체제품·성능 PASS가 아니다.
예상RED·최초 fixture 시간 오류·2049 중단을 삭제하지 않는다.

| 제목 | 수행내용 | 결과(pass/fail) |
| --- | --- | --- |
| LP26-O10-A01 4N 독립 규모와 최대 bound | [final-unit.log](final-unit.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-B01 정확한 네 type·count·partial/backlog oracle | [final-unit.log](final-unit.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-B02 회전 후 fresh0·rotations1이상 oracle | [final-unit.log](final-unit.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-F01 복구·checkpoint별15초 독립 경계와 정확한 순서 | [final-unit.log](final-unit.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-A01 4N 독립 규모와 최대 bound | [green.log](green.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-B01 정확한 네 type·count·partial/backlog oracle | [green.log](green.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-B02 회전 후 fresh0·rotations1이상 oracle | [green.log](green.log)의 해당 assertion/직접 결과 | pass |
| FC01 exact insertion checks count=102 | [measurement-1020-recheck.log](measurement-1020-recheck.log)의 해당 assertion/직접 결과 | pass |
| seed FE02 writer start | [measurement-1020-recheck.log](measurement-1020-recheck.log)의 해당 assertion/직접 결과 | pass |
| seed FE04 bound finalized mutation segment0 | [measurement-1020-recheck.log](measurement-1020-recheck.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-A02 typed segment binding tombstone serialization and seed file verification | [measurement-1020-recheck.log](measurement-1020-recheck.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-B 1020 initial exact-count-prefix | [measurement-1020-recheck.log](measurement-1020-recheck.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-A02 strict Open exact4N and deletedN zero recovery errors | [measurement-1020-recheck.log](measurement-1020-recheck.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-C02 cache prefix or full fallback exact oracle | [measurement-1020-recheck.log](measurement-1020-recheck.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-B 1020 rotated exact-count-prefix | [measurement-1020-recheck.log](measurement-1020-recheck.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-E01 malformed mutation rejected | [measurement-1020-recheck.log](measurement-1020-recheck.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10 완료단계 1 recovery | [measurement-1020-recheck.log](measurement-1020-recheck.log); elapsedUs=9931961, oracle ok=true; 성능 PASS 아님 | pass |
| LP26-O10 완료단계 2 cold-binding | [measurement-1020-recheck.log](measurement-1020-recheck.log); elapsedUs=5232, oracle ok=true; 성능 PASS 아님 | pass |
| LP26-O10 완료단계 3 checkpoint-cold | [measurement-1020-recheck.log](measurement-1020-recheck.log); elapsedUs=4179822, oracle ok=true; 성능 PASS 아님 | pass |
| LP26-O10 완료단계 4 checkpoint-repeat | [measurement-1020-recheck.log](measurement-1020-recheck.log); elapsedUs=2435146, oracle ok=true; 성능 PASS 아님 | pass |
| LP26-O10 compile probe | [measurement-1020-recheck.log](measurement-1020-recheck.log); bounded-exit code0, timeout=false | pass |
| LP26-O10 compile normalize | [measurement-1020-recheck.log](measurement-1020-recheck.log); bounded-exit code0, timeout=false | pass |
| LP26-O10 compile metrics | [measurement-1020-recheck.log](measurement-1020-recheck.log); bounded-exit code0, timeout=false | pass |
| FC01 exact insertion checks count=102 | [measurement-2049.log](measurement-2049.log)의 해당 assertion/직접 결과 | pass |
| seed FE02 writer start | [measurement-2049.log](measurement-2049.log)의 해당 assertion/직접 결과 | pass |
| seed FE04 bound finalized mutation segment0 | [measurement-2049.log](measurement-2049.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-A02 typed segment binding tombstone serialization and seed file verification | [measurement-2049.log](measurement-2049.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-B 2049 initial exact-count-prefix | [measurement-2049.log](measurement-2049.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10 stage-time-cap | [measurement-2049.log](measurement-2049.log)의 해당 assertion/직접 결과 | fail |
| LP26-O10 compile probe | [measurement-2049.log](measurement-2049.log); bounded-exit code0, timeout=false | pass |
| LP26-O10 compile normalize | [measurement-2049.log](measurement-2049.log); bounded-exit code0, timeout=false | pass |
| LP26-O10 compile metrics | [measurement-2049.log](measurement-2049.log); bounded-exit code0, timeout=false | pass |
| FC01 exact insertion checks count=102 | [measurement-attempt1.log](measurement-attempt1.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-D01 records8192 admitted | [measurement-attempt1.log](measurement-attempt1.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-D01 records8193 rejected | [measurement-attempt1.log](measurement-attempt1.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-D01 charge64MiB admitted | [measurement-attempt1.log](measurement-attempt1.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-D01 charge64MiBplus1 rejected | [measurement-attempt1.log](measurement-attempt1.log)의 해당 assertion/직접 결과 | pass |
| seed FE02 writer start | [measurement-attempt1.log](measurement-attempt1.log)의 해당 assertion/직접 결과 | pass |
| seed FE04 bound finalized mutation segment0 | [measurement-attempt1.log](measurement-attempt1.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-A02 typed segment binding tombstone serialization and seed file verification | [measurement-attempt1.log](measurement-attempt1.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-B 16 initial exact-count-prefix | [measurement-attempt1.log](measurement-attempt1.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-A02 strict Open exact4N and deletedN zero recovery errors | [measurement-attempt1.log](measurement-attempt1.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-C02 cache prefix or full fallback exact oracle | [measurement-attempt1.log](measurement-attempt1.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-B 16 rotated exact-count-prefix | [measurement-attempt1.log](measurement-attempt1.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-B 1020 initial exact-count-prefix | [measurement-attempt1.log](measurement-attempt1.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-A02 strict Open exact4N and deletedN zero recovery errors | [measurement-attempt1.log](measurement-attempt1.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10 time-cap | [measurement-attempt1.log](measurement-attempt1.log)의 해당 assertion/직접 결과 | fail |
| LP26-O10 완료단계 1 recovery | [measurement-attempt1.log](measurement-attempt1.log); elapsedUs=88644, oracle ok=true; 성능 PASS 아님 | pass |
| LP26-O10 완료단계 2 cold-binding | [measurement-attempt1.log](measurement-attempt1.log); elapsedUs=4856, oracle ok=true; 성능 PASS 아님 | pass |
| LP26-O10 완료단계 3 checkpoint-cold | [measurement-attempt1.log](measurement-attempt1.log); elapsedUs=67713, oracle ok=true; 성능 PASS 아님 | pass |
| LP26-O10 완료단계 4 checkpoint-repeat | [measurement-attempt1.log](measurement-attempt1.log); elapsedUs=38450, oracle ok=true; 성능 PASS 아님 | pass |
| LP26-O10 완료단계 5 recovery | [measurement-attempt1.log](measurement-attempt1.log); elapsedUs=9802854, oracle ok=true; 성능 PASS 아님 | pass |
| LP26-O10 완료단계 6 cold-binding | [measurement-attempt1.log](measurement-attempt1.log); elapsedUs=5209, oracle ok=true; 성능 PASS 아님 | pass |
| LP26-O10 완료단계 7 checkpoint-cold | [measurement-attempt1.log](measurement-attempt1.log); elapsedUs=4197420, oracle ok=true; 성능 PASS 아님 | pass |
| LP26-O10 compile probe | [measurement-attempt1.log](measurement-attempt1.log); bounded-exit code0, timeout=false | pass |
| LP26-O10 compile normalize | [measurement-attempt1.log](measurement-attempt1.log); bounded-exit code0, timeout=false | pass |
| LP26-O10 compile metrics | [measurement-attempt1.log](measurement-attempt1.log); bounded-exit code0, timeout=false | pass |
| LP26-O10-A01 4N 독립 규모와 최대 bound | [red.log](red.log)의 해당 assertion/직접 결과 | fail |
| LP26-O10-B01 정확한 네 type·count·partial/backlog oracle | [red.log](red.log)의 해당 assertion/직접 결과 | fail |
| LP26-O10-B02 회전 후 fresh0·rotations1이상 oracle | [red.log](red.log)의 해당 assertion/직접 결과 | fail |
| LP26-O10-A01 4N 독립 규모와 최대 bound | [stage-oracle.log](stage-oracle.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-B01 정확한 네 type·count·partial/backlog oracle | [stage-oracle.log](stage-oracle.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-B02 회전 후 fresh0·rotations1이상 oracle | [stage-oracle.log](stage-oracle.log)의 해당 assertion/직접 결과 | pass |
| LP26-O10-F01 복구·checkpoint별15초 독립 경계와 정확한 순서 | [stage-oracle.log](stage-oracle.log)의 해당 assertion/직접 결과 | pass |

## 미완료/미실행

| 제목 | 수행내용 | 사유 | 완료 evidence로 사용할 수 없는 경계 |
| --- | --- | --- | --- |
| 최초1020 반복/회전 |둘째checkpoint·observer 재읽기|잘못된 합산15초 fixture 중단|첫실행은 FAIL 보존, 후속 단회 별도 결과로 구분 |
| 2049 strict Open |recovery 완주·count·projection oracle|독립15초 watchdog FAIL|단지 생성/initial parser 통과로 catalog strict PASS를 대체하지 않음 |
| 2049 cold/cache/회전 |cold binding·두checkpoint·회전재읽기|선수 recovery 실패 뒤 건너뜀|actual fallback 비용 미확인 |
| 64MiB 초과 유효누적저장 |대형 binding payload와 full Open|이번에는 순수 admission 경계만 실행|64MiB exact/plus1 함수 PASS만 있음 |
| 실제 앱/HTTP/장시간/UI |실제 sourceworker 동시성·HTTP status·120분·브라우저|이번 범위 밖|기존 실패 원인 확정/해결 및 release PASS로 사용 불가 |
| 제품 수정 |catalog/status/cadence 변경|메인 담당 판단 영역|이 담당자 미수행 |
| 커밋/푸시 |stage/commit/push|담당 범위 아님|이 담당자 미수행 |

## cleanup·보존·사용량

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-catalog-cost.ulmhn1` | 소유 native실행파일·source복제본·seed/원장/SQLite·cache |26266579bytes|자식close/readerclose 뒤 삭제|absent=true, 부재 재확인|[measurement-1020-recheck.log](measurement-1020-recheck.log)|
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-catalog-cost.QyQTUO` | 소유 native실행파일·source복제본·seed/원장/SQLite·cache |55913499bytes|자식close/readerclose 뒤 삭제|absent=true, 부재 재확인|[measurement-2049.log](measurement-2049.log)|
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-catalog-cost.3y8WBr` | 소유 native실행파일·source복제본·seed/원장/SQLite·cache |68194882bytes|자식close/readerclose 뒤 삭제|absent=true, 부재 재확인|[measurement-attempt1.log](measurement-attempt1.log)|
| final-unit.log | 비민감 실행 원출력 |420bytes|저장소 보존|보존|최초실패/계측/개별결과/cleanup 감사 근거|
| green.log | 비민감 실행 원출력 |329bytes|저장소 보존|보존|최초실패/계측/개별결과/cleanup 감사 근거|
| measurement-1020-recheck.log | 비민감 실행 원출력 |21725bytes|저장소 보존|보존|최초실패/계측/개별결과/cleanup 감사 근거|
| measurement-2049.log | 비민감 실행 원출력 |3764bytes|저장소 보존|보존|최초실패/계측/개별결과/cleanup 감사 근거|
| measurement-attempt1.log | 비민감 실행 원출력 |34163bytes|저장소 보존|보존|최초실패/계측/개별결과/cleanup 감사 근거|
| red.log | 비민감 실행 원출력 |3097bytes|저장소 보존|보존|최초실패/계측/개별결과/cleanup 감사 근거|
| stage-oracle.log | 비민감 실행 원출력 |417bytes|저장소 보존|보존|최초실패/계측/개별결과/cleanup 감사 근거|

서버/listening port/운영 계정/운영 원장은 만들지 않았다. compiler와 측정 자식은 bounded-exit/probe-process close로 종료를 확인했다.
2049와 최초실패 native는 소유 process group에 SIGTERM을 보내 close를 관찰했으며 강제SIGKILL 사용 evidence는 없다.
raw payload·영상·source URL·credentials는 보존하지 않았다. source/fixture hashes는 비민감 provenance다.

| 실행 영역 | token start | token end | token consumed | elapsed | source |
| --- | --- | --- | --- | --- | --- |
| 안정화 RED |미집계|미집계|미집계|31.544ms|node test summary; 작업별 usage 집계 없음 |
| 안정화 GREEN |미집계|미집계|미집계|29.386708ms|node test summary |
| 단계경계 unit |미집계|미집계|미집계|29.67775ms|node test summary |
| 최종 unit |미집계|미집계|미집계|30.170833ms|node test summary |
| 첫 측정 |미집계|미집계|미집계|34초(측정run26.430초)|bash SECONDS / Node performance |
| 1020 재검증 |미집계|미집계|미집계|39초(측정run30.283초)|bash SECONDS / Node performance |
| 2049 측정 |미집계|미집계|미집계|38초(측정run29.882초)|bash SECONDS / Node performance |
| 30분/120분/UI |미집계|미집계|미집계|미실행|이번 범위 밖 |
