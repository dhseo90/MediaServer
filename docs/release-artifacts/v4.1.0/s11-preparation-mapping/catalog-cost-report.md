# 3-B 비용 계측·보완 실행 기록

독자: 녹화 구현·검증 담당자. lifecycle: v4.1.0 실행 증거 보존. 정책은 AGENTS.md, 결과의 중앙 source-of-truth는 release-test-records.md이며 이 파일은 상세 결과표다.

## 범위와 현재 상태

FC01~05의 승인된 계측·중복 처리 보완·비교·관련 회귀·전체 빌드를 마쳤다. 저장 바이트·ID·손상 거부·원본 semantic replay·1MiB checkpoint 조건을 유지한다. UI/장시간/실제 HTTP 성능은 이번 범위가 아니다. 저장 비용이 완전히 해결됐거나3-B의 운영 성능이 합격했다고 확대하지 않는다. 최종 Git 결과는 중앙 기록을 따른다.

| 번호 | 사용자 지시 | 처리 상태 | 결과 | 근거 |
| --- | --- | --- | --- | --- |
| 1 | 구간별 비용 계측 | 완료 | 잠금·검증·journal·SQL·checkpoint 분리 | FC01 baseline2 |
| 2 | 중복 처리 최소 보완 | 완료 | 두 catalog 분기에서 문서1회 해석, 오류/롤백 유지 | FC02 RED→GREEN |
| 3 | 같은 조건 비교 | 완료 | 기존/새·1/8원본·동일/상이 후보의 비용/복구 확인 | FC03 candidate/compaction |
| 4 | 관련 회귀·전체 build | 완료 | 최종 FE193개, 기존 회귀, 최종build exit0 | FC04/05 아래 전수표 |
| 5 | 분할 커밋·푸시 | 일부 수행 | 제품·검증19d4d553 완료, 상태 문서 커밋·푸시 직전 기록 | 실제 원격 확인은 최종 보고 |
| 6 | 잔여 이슈 | 산정 | 잔여 지연·제한 대기·공통 소비/실제 통합·S11 준비 | 아래 한계/중앙 기록 |

## 최종 판정과 증거 유효 범위

- 같은 계측조건의 evidence8 잠금 점유 합계10.044716초→6.562861초(34.7% 감소), 최대1.908531초→1.226518초다.
  legacy8도0.982617초→0.614492초로 개선됐다. snapshot66.198→68.886ms는 개선 대상이 아니며 측정상 개선 없음이다.
  기존/신규 동등성은 각 실행의 원본 binding/segment 바이트와 SQLite/JSONL 복구 대조다.
  서로 다른 실행의 UUID·작성시각까지 동일하다는 뜻이 아니다.
- 전체 build와 source20·write-boundary8·checkpoint9·catalog246·finalize74·finalize-integration140·managed-writer44개 출력상 PASS를 확인했다.
  최종 FE는193개 PASS이며 큰 정수/escaping 합성 검사와 실제 H264·분수FPS·B-frame·VFR, 실제Ready 위조 거부를 포함한다.
- 검토에서 FE06 잘못된 wrapper oracle과 MP4 data reference 조건 누락을 발견해 보완했다.
  profile-red는 예상 assertion 실패, ready-oracle-fixed는 fixture 파일명/segmentID 불일치 준비 실패이며,
  ready-oracle-fixed2에서193개를 통과했다. 과거 FE06 wrapper PASS는 완료 증거로 쓰지 않는다.
- 마지막 parser 변경은 H264 evidence의 미지원 참조 거부에 한정된다. 최종 FE 전체와 build는 다시 실행했다.
  catalog/JSON parse/checkpoint/VP8 경로는 변경하지 않아 기존 영향 회귀를 유지한다.
  수정마다 무관한 전체 검증을 재시작하지 않았다.
- 잔여 P0: 누적 catalog의 긴 잠금 점유와 실제 HTTP 응답 지연·부하 적합성은 미확인이다.
  1.227초를 합격 상한으로 새로 정하지 않는다. 실제 통합 전에 허용 기준/측정 조건을 정해 판정해야 한다.
  제한 대기 및 새 증거를 이용한 생성/복구/타임라인 공통 판정은 미구현이다.
- 4번 대기·5번 실제 복수 출력/재기동·S11·UI·30/120분·release action은 실행하지 않았다.
  미래 범위 또는 기존 partial을 이번 저장/단기 PASS로 완료 승격하지 않는다.

## FC01 관측

최적화 없는 현재 빌드와 동일 조건, 단일 catalog 호출, 중첩 timer inclusive/exclusive, 계측 overhead 미차감이다. 경합 없는 잠금 대기를 운영 HTTP 지연으로 해석하지 않는다. 실제4096 AU fixture를1개/8개 원본으로 복제했고 파일 대응은 측정 전 검증했다.

| 항목 | 기존 binding | 새 증거 binding | 해석 |
| --- | --- | --- | --- |
| 8원본 commit 잠금 점유 합계 | 982.6ms | 10044.7ms | 자동 checkpoint는 각각1/8회 |
| 새 증거 자동 checkpoint 합계 | 해당 없음 | 6742.5ms | 원본 semantic replay6713.5ms가99.57% |
| 같은 후보 비교 / journal commit | 해당 없음 | 6.70ms / 15.13ms | 8회 모두 동일 후보·noWrite |
| SQLite / journal append | 해당 없음 | 1395.2ms / 203.9ms | 동기 처리, 제품 수정 전 |

코드 직접 대조: bound Apply 분기는 동일 payload를4회, SQL 분기는3회 strict parse한다. 원본 replay 자체는 유지하고 두 분기 안에서 단일 document를 재사용하는 최소 보완을 FC02에서 검증한다.

## 원출력·개별 결과

### catalog-cost-output-baseline.txt

[보존 원출력](catalog-cost-output-baseline.txt), SHA-256 `8fc0ef04bbf8c90500ff641d955e8745a6dcc228026cbc175b1a969f5c18aa70`, 3059bytes.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| FC01 준비 | 삽입점 정의가 아닌 호출부까지 감지하여 실행 전 중단 | fail | 예상 RED 아님. 함수 정의 앵커로 보완 후 baseline2 통과 |

- `[cleanup] path=/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-catalog-cost.mJTVm0 bytes=170722 removed=true`
- `[exit] code=1 elapsed_seconds=0 token_usage=unavailable source=bash-SECONDS`

### catalog-cost-output-baseline2.txt

[보존 원출력](catalog-cost-output-baseline2.txt), SHA-256 `37cc71f05a2fc20696fea294fce035f622e6ba1134b3de104d8582b2b62182d7`, 260377bytes.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| catalog-cost-output-baseline2-1 | FC01 exact insertion checks count=92 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-2 | actual4096 FE02 writer start | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-3 | actual4096 FE04 bound finalized mutation segment0 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-4 | actual4096 FC01 actual4096 evidence prerequisite | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-5 | FC01/legacy/sources1 reserve0 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-6 | FC01/legacy/sources1 actual file verified outside catalog0 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-7 | FC01/legacy/sources1 commit0  | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-8 | FC01/legacy/sources1 snapshot count | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-9 | FC01/legacy/sources1 checkpoint  | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-10 | FC01/legacy/sources1 reopen journal sql1 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-11 | FC01/legacy/sources1 reopen catalog sql1 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-12 | FC01/legacy/sources1 exact recovered segment+binding sql1 cost-0 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-13 | FC01/legacy/sources1 reopen journal sql0 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-14 | FC01/legacy/sources1 reopen catalog sql0 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-15 | FC01/legacy/sources1 exact recovered segment+binding sql0 cost-0 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-16 | FC01/evidence/sources1 reserve0 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-17 | FC01/evidence/sources1 actual file verified outside catalog0 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-18 | FC01/evidence/sources1 commit0  | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-19 | FC01/evidence/sources1 snapshot count | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-20 | FC01/evidence/sources1 checkpoint  | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-21 | FC01/evidence/sources1 reopen journal sql1 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-22 | FC01/evidence/sources1 reopen catalog sql1 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-23 | FC01/evidence/sources1 exact recovered segment+binding sql1 cost-0 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-24 | FC01/evidence/sources1 reopen journal sql0 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-25 | FC01/evidence/sources1 reopen catalog sql0 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-26 | FC01/evidence/sources1 exact recovered segment+binding sql0 cost-0 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-27 | FC01/legacy/sources8 reserve0 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-28 | FC01/legacy/sources8 actual file verified outside catalog0 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-29 | FC01/legacy/sources8 commit0  | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-30 | FC01/legacy/sources8 reserve1 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-31 | FC01/legacy/sources8 actual file verified outside catalog1 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-32 | FC01/legacy/sources8 commit1  | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-33 | FC01/legacy/sources8 reserve2 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-34 | FC01/legacy/sources8 actual file verified outside catalog2 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-35 | FC01/legacy/sources8 commit2  | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-36 | FC01/legacy/sources8 reserve3 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-37 | FC01/legacy/sources8 actual file verified outside catalog3 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-38 | FC01/legacy/sources8 commit3  | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-39 | FC01/legacy/sources8 reserve4 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-40 | FC01/legacy/sources8 actual file verified outside catalog4 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-41 | FC01/legacy/sources8 commit4  | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-42 | FC01/legacy/sources8 reserve5 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-43 | FC01/legacy/sources8 actual file verified outside catalog5 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-44 | FC01/legacy/sources8 commit5  | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-45 | FC01/legacy/sources8 reserve6 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-46 | FC01/legacy/sources8 actual file verified outside catalog6 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-47 | FC01/legacy/sources8 commit6  | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-48 | FC01/legacy/sources8 reserve7 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-49 | FC01/legacy/sources8 actual file verified outside catalog7 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-50 | FC01/legacy/sources8 commit7  | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-51 | FC01/legacy/sources8 snapshot count | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-52 | FC01/legacy/sources8 checkpoint  | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-53 | FC01/legacy/sources8 reopen journal sql1 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-54 | FC01/legacy/sources8 reopen catalog sql1 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-55 | FC01/legacy/sources8 exact recovered segment+binding sql1 cost-0 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-56 | FC01/legacy/sources8 exact recovered segment+binding sql1 cost-1 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-57 | FC01/legacy/sources8 exact recovered segment+binding sql1 cost-2 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-58 | FC01/legacy/sources8 exact recovered segment+binding sql1 cost-3 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-59 | FC01/legacy/sources8 exact recovered segment+binding sql1 cost-4 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-60 | FC01/legacy/sources8 exact recovered segment+binding sql1 cost-5 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-61 | FC01/legacy/sources8 exact recovered segment+binding sql1 cost-6 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-62 | FC01/legacy/sources8 exact recovered segment+binding sql1 cost-7 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-63 | FC01/legacy/sources8 reopen journal sql0 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-64 | FC01/legacy/sources8 reopen catalog sql0 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-65 | FC01/legacy/sources8 exact recovered segment+binding sql0 cost-0 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-66 | FC01/legacy/sources8 exact recovered segment+binding sql0 cost-1 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-67 | FC01/legacy/sources8 exact recovered segment+binding sql0 cost-2 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-68 | FC01/legacy/sources8 exact recovered segment+binding sql0 cost-3 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-69 | FC01/legacy/sources8 exact recovered segment+binding sql0 cost-4 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-70 | FC01/legacy/sources8 exact recovered segment+binding sql0 cost-5 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-71 | FC01/legacy/sources8 exact recovered segment+binding sql0 cost-6 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-72 | FC01/legacy/sources8 exact recovered segment+binding sql0 cost-7 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-73 | FC01/evidence/sources8 reserve0 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-74 | FC01/evidence/sources8 actual file verified outside catalog0 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-75 | FC01/evidence/sources8 commit0  | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-76 | FC01/evidence/sources8 reserve1 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-77 | FC01/evidence/sources8 actual file verified outside catalog1 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-78 | FC01/evidence/sources8 commit1  | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-79 | FC01/evidence/sources8 reserve2 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-80 | FC01/evidence/sources8 actual file verified outside catalog2 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-81 | FC01/evidence/sources8 commit2  | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-82 | FC01/evidence/sources8 reserve3 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-83 | FC01/evidence/sources8 actual file verified outside catalog3 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-84 | FC01/evidence/sources8 commit3  | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-85 | FC01/evidence/sources8 reserve4 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-86 | FC01/evidence/sources8 actual file verified outside catalog4 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-87 | FC01/evidence/sources8 commit4  | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-88 | FC01/evidence/sources8 reserve5 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-89 | FC01/evidence/sources8 actual file verified outside catalog5 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-90 | FC01/evidence/sources8 commit5  | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-91 | FC01/evidence/sources8 reserve6 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-92 | FC01/evidence/sources8 actual file verified outside catalog6 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-93 | FC01/evidence/sources8 commit6  | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-94 | FC01/evidence/sources8 reserve7 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-95 | FC01/evidence/sources8 actual file verified outside catalog7 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-96 | FC01/evidence/sources8 commit7  | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-97 | FC01/evidence/sources8 snapshot count | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-98 | FC01/evidence/sources8 checkpoint  | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-99 | FC01/evidence/sources8 reopen journal sql1 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-100 | FC01/evidence/sources8 reopen catalog sql1 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-101 | FC01/evidence/sources8 exact recovered segment+binding sql1 cost-0 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-102 | FC01/evidence/sources8 exact recovered segment+binding sql1 cost-1 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-103 | FC01/evidence/sources8 exact recovered segment+binding sql1 cost-2 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-104 | FC01/evidence/sources8 exact recovered segment+binding sql1 cost-3 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-105 | FC01/evidence/sources8 exact recovered segment+binding sql1 cost-4 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-106 | FC01/evidence/sources8 exact recovered segment+binding sql1 cost-5 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-107 | FC01/evidence/sources8 exact recovered segment+binding sql1 cost-6 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-108 | FC01/evidence/sources8 exact recovered segment+binding sql1 cost-7 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-109 | FC01/evidence/sources8 reopen journal sql0 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-110 | FC01/evidence/sources8 reopen catalog sql0 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-111 | FC01/evidence/sources8 exact recovered segment+binding sql0 cost-0 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-112 | FC01/evidence/sources8 exact recovered segment+binding sql0 cost-1 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-113 | FC01/evidence/sources8 exact recovered segment+binding sql0 cost-2 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-114 | FC01/evidence/sources8 exact recovered segment+binding sql0 cost-3 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-115 | FC01/evidence/sources8 exact recovered segment+binding sql0 cost-4 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-116 | FC01/evidence/sources8 exact recovered segment+binding sql0 cost-5 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-117 | FC01/evidence/sources8 exact recovered segment+binding sql0 cost-6 | pass | 원출력 동일 행 |
| catalog-cost-output-baseline2-118 | FC01/evidence/sources8 exact recovered segment+binding sql0 cost-7 | pass | 원출력 동일 행 |

- `[cleanup] path=/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-catalog-cost.HpBsiT bytes=101181988 removed=true`
- `[exit] code=0 elapsed_seconds=38 token_usage=unavailable source=bash-SECONDS`

## 후속 원출력·개별 결과

### catalog-cost-output-candidate.txt

[원출력](catalog-cost-output-candidate.txt), SHA-256 `f3f01a3819c24783f4aa9341fe716e6b5e004f1aa819f8a2ac94db449fb654bc`, 260314bytes.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| catalog-cost-output-candidate:1 | FC01 exact insertion checks count=92 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:2 | actual4096 FE02 writer start | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:3 | actual4096 FE04 bound finalized mutation segment0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:4 | actual4096 FC01 actual4096 evidence prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:5 | FC01/legacy/sources1 reserve0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:6 | FC01/legacy/sources1 actual file verified outside catalog0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:7 | FC01/legacy/sources1 commit0  | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:8 | FC01/legacy/sources1 snapshot count | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:9 | FC01/legacy/sources1 checkpoint  | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:10 | FC01/legacy/sources1 reopen journal sql1 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:11 | FC01/legacy/sources1 reopen catalog sql1 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:12 | FC01/legacy/sources1 exact recovered segment+binding sql1 cost-0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:13 | FC01/legacy/sources1 reopen journal sql0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:14 | FC01/legacy/sources1 reopen catalog sql0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:15 | FC01/legacy/sources1 exact recovered segment+binding sql0 cost-0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:16 | FC01/evidence/sources1 reserve0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:17 | FC01/evidence/sources1 actual file verified outside catalog0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:18 | FC01/evidence/sources1 commit0  | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:19 | FC01/evidence/sources1 snapshot count | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:20 | FC01/evidence/sources1 checkpoint  | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:21 | FC01/evidence/sources1 reopen journal sql1 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:22 | FC01/evidence/sources1 reopen catalog sql1 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:23 | FC01/evidence/sources1 exact recovered segment+binding sql1 cost-0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:24 | FC01/evidence/sources1 reopen journal sql0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:25 | FC01/evidence/sources1 reopen catalog sql0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:26 | FC01/evidence/sources1 exact recovered segment+binding sql0 cost-0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:27 | FC01/legacy/sources8 reserve0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:28 | FC01/legacy/sources8 actual file verified outside catalog0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:29 | FC01/legacy/sources8 commit0  | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:30 | FC01/legacy/sources8 reserve1 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:31 | FC01/legacy/sources8 actual file verified outside catalog1 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:32 | FC01/legacy/sources8 commit1  | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:33 | FC01/legacy/sources8 reserve2 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:34 | FC01/legacy/sources8 actual file verified outside catalog2 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:35 | FC01/legacy/sources8 commit2  | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:36 | FC01/legacy/sources8 reserve3 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:37 | FC01/legacy/sources8 actual file verified outside catalog3 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:38 | FC01/legacy/sources8 commit3  | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:39 | FC01/legacy/sources8 reserve4 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:40 | FC01/legacy/sources8 actual file verified outside catalog4 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:41 | FC01/legacy/sources8 commit4  | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:42 | FC01/legacy/sources8 reserve5 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:43 | FC01/legacy/sources8 actual file verified outside catalog5 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:44 | FC01/legacy/sources8 commit5  | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:45 | FC01/legacy/sources8 reserve6 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:46 | FC01/legacy/sources8 actual file verified outside catalog6 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:47 | FC01/legacy/sources8 commit6  | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:48 | FC01/legacy/sources8 reserve7 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:49 | FC01/legacy/sources8 actual file verified outside catalog7 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:50 | FC01/legacy/sources8 commit7  | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:51 | FC01/legacy/sources8 snapshot count | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:52 | FC01/legacy/sources8 checkpoint  | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:53 | FC01/legacy/sources8 reopen journal sql1 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:54 | FC01/legacy/sources8 reopen catalog sql1 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:55 | FC01/legacy/sources8 exact recovered segment+binding sql1 cost-0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:56 | FC01/legacy/sources8 exact recovered segment+binding sql1 cost-1 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:57 | FC01/legacy/sources8 exact recovered segment+binding sql1 cost-2 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:58 | FC01/legacy/sources8 exact recovered segment+binding sql1 cost-3 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:59 | FC01/legacy/sources8 exact recovered segment+binding sql1 cost-4 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:60 | FC01/legacy/sources8 exact recovered segment+binding sql1 cost-5 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:61 | FC01/legacy/sources8 exact recovered segment+binding sql1 cost-6 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:62 | FC01/legacy/sources8 exact recovered segment+binding sql1 cost-7 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:63 | FC01/legacy/sources8 reopen journal sql0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:64 | FC01/legacy/sources8 reopen catalog sql0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:65 | FC01/legacy/sources8 exact recovered segment+binding sql0 cost-0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:66 | FC01/legacy/sources8 exact recovered segment+binding sql0 cost-1 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:67 | FC01/legacy/sources8 exact recovered segment+binding sql0 cost-2 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:68 | FC01/legacy/sources8 exact recovered segment+binding sql0 cost-3 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:69 | FC01/legacy/sources8 exact recovered segment+binding sql0 cost-4 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:70 | FC01/legacy/sources8 exact recovered segment+binding sql0 cost-5 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:71 | FC01/legacy/sources8 exact recovered segment+binding sql0 cost-6 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:72 | FC01/legacy/sources8 exact recovered segment+binding sql0 cost-7 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:73 | FC01/evidence/sources8 reserve0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:74 | FC01/evidence/sources8 actual file verified outside catalog0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:75 | FC01/evidence/sources8 commit0  | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:76 | FC01/evidence/sources8 reserve1 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:77 | FC01/evidence/sources8 actual file verified outside catalog1 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:78 | FC01/evidence/sources8 commit1  | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:79 | FC01/evidence/sources8 reserve2 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:80 | FC01/evidence/sources8 actual file verified outside catalog2 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:81 | FC01/evidence/sources8 commit2  | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:82 | FC01/evidence/sources8 reserve3 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:83 | FC01/evidence/sources8 actual file verified outside catalog3 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:84 | FC01/evidence/sources8 commit3  | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:85 | FC01/evidence/sources8 reserve4 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:86 | FC01/evidence/sources8 actual file verified outside catalog4 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:87 | FC01/evidence/sources8 commit4  | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:88 | FC01/evidence/sources8 reserve5 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:89 | FC01/evidence/sources8 actual file verified outside catalog5 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:90 | FC01/evidence/sources8 commit5  | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:91 | FC01/evidence/sources8 reserve6 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:92 | FC01/evidence/sources8 actual file verified outside catalog6 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:93 | FC01/evidence/sources8 commit6  | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:94 | FC01/evidence/sources8 reserve7 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:95 | FC01/evidence/sources8 actual file verified outside catalog7 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:96 | FC01/evidence/sources8 commit7  | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:97 | FC01/evidence/sources8 snapshot count | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:98 | FC01/evidence/sources8 checkpoint  | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:99 | FC01/evidence/sources8 reopen journal sql1 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:100 | FC01/evidence/sources8 reopen catalog sql1 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:101 | FC01/evidence/sources8 exact recovered segment+binding sql1 cost-0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:102 | FC01/evidence/sources8 exact recovered segment+binding sql1 cost-1 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:103 | FC01/evidence/sources8 exact recovered segment+binding sql1 cost-2 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:104 | FC01/evidence/sources8 exact recovered segment+binding sql1 cost-3 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:105 | FC01/evidence/sources8 exact recovered segment+binding sql1 cost-4 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:106 | FC01/evidence/sources8 exact recovered segment+binding sql1 cost-5 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:107 | FC01/evidence/sources8 exact recovered segment+binding sql1 cost-6 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:108 | FC01/evidence/sources8 exact recovered segment+binding sql1 cost-7 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:109 | FC01/evidence/sources8 reopen journal sql0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:110 | FC01/evidence/sources8 reopen catalog sql0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:111 | FC01/evidence/sources8 exact recovered segment+binding sql0 cost-0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:112 | FC01/evidence/sources8 exact recovered segment+binding sql0 cost-1 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:113 | FC01/evidence/sources8 exact recovered segment+binding sql0 cost-2 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:114 | FC01/evidence/sources8 exact recovered segment+binding sql0 cost-3 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:115 | FC01/evidence/sources8 exact recovered segment+binding sql0 cost-4 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:116 | FC01/evidence/sources8 exact recovered segment+binding sql0 cost-5 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:117 | FC01/evidence/sources8 exact recovered segment+binding sql0 cost-6 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-candidate:118 | FC01/evidence/sources8 exact recovered segment+binding sql0 cost-7 | pass | 해당 실행 source/범위에 한정 |

- `[cleanup] path=/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-catalog-cost.kOV3ct bytes=101183432 removed=true`
- `[exit] code=0 elapsed_seconds=29 token_usage=unavailable source=bash-SECONDS`

### catalog-cost-output-compaction.txt

[원출력](catalog-cost-output-compaction.txt), SHA-256 `33f76b49f67dff88479686229d9241f8d894dee341f5b781c8c1b95d33b6af96`, 14498bytes.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| catalog-cost-output-compaction:1 | FC01 exact insertion checks count=92 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-compaction:2 | actual12 FE02 writer start | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-compaction:3 | actual12 FE04 bound finalized mutation segment0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-compaction:4 | actual12 FC03 actual source evidence prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-compaction:5 | FC03/different-candidate event revision0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-compaction:6 | FC03/different-candidate event revision1 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-compaction:7 | FC03/different-candidate event revision2 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-compaction:8 | FC03/different-candidate event revision3 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-compaction:9 | FC03/different-candidate event revision4 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-compaction:10 | FC03/different-candidate event revision5 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-compaction:11 | FC03/different-candidate event revision6 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-compaction:12 | FC03/different-candidate event revision7 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-compaction:13 | FC03/different-candidate event revision8 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-compaction:14 | FC03/different-candidate event revision9 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-compaction:15 | FC03/different-candidate event revision10 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-compaction:16 | FC03/different-candidate event revision11 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-compaction:17 | FC03/different-candidate actual checkpoint  | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-compaction:18 | FC03/different-candidate different candidate observed | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-compaction:19 | FC03/different-candidate both semantic replays observed | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-compaction:20 | FC03/different-candidate actual write branch observed | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-compaction:21 | FC03/different-candidate record count preserved and journal reduced | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-compaction:22 | FC03/different-candidate mutation identity ordinal0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-compaction:23 | FC03/different-candidate mutation identity ordinal1 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-compaction:24 | FC03/different-candidate mutation identity ordinal2 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-compaction:25 | FC03/different-candidate mutation identity ordinal3 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-compaction:26 | FC03/different-candidate mutation identity ordinal4 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-compaction:27 | FC03/different-candidate mutation identity ordinal5 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-compaction:28 | FC03/different-candidate mutation identity ordinal6 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-compaction:29 | FC03/different-candidate mutation identity ordinal7 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-compaction:30 | FC03/different-candidate mutation identity ordinal8 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-compaction:31 | FC03/different-candidate mutation identity ordinal9 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-compaction:32 | FC03/different-candidate mutation identity ordinal10 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-compaction:33 | FC03/different-candidate mutation identity ordinal11 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-compaction:34 | FC03/different-candidate mutation identity ordinal12 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-compaction:35 | FC03/different-candidate mutation identity ordinal13 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-compaction:36 | FC03/different-candidate exact11 superseded receipts | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-compaction:37 | FC03/different-candidate reopen journal sql1 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-compaction:38 | FC03/different-candidate reopen catalog sql1 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-compaction:39 | FC03/different-candidate exact source and latest event recovery sql1 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-compaction:40 | FC03/different-candidate reopen journal sql0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-compaction:41 | FC03/different-candidate reopen catalog sql0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-compaction:42 | FC03/different-candidate exact source and latest event recovery sql0 | pass | 해당 실행 source/범위에 한정 |

- `[cleanup] path=/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-catalog-cost.QaGiZR bytes=5506986 removed=true`
- `[exit] code=0 elapsed_seconds=8 token_usage=unavailable source=bash-SECONDS`

### catalog-cost-output-parse-green.txt

[원출력](catalog-cost-output-parse-green.txt), SHA-256 `1bcf40efe55415de94f35a20523d1b5a997baeea78b1a297932a004618249bf4`, 12848bytes.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| catalog-cost-output-parse-green:1 | FC01 exact insertion checks count=92 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:2 | FC02 temporary access/parser exact insertions=2 strict_original_sha256=be1057725d0a0b54d705543ce635da6c832e4c53fbec008e91ad63c9a1d0f58b header_original_sha256=e923f9ae493d59c9516163f1909c8973ded4b5f2d18676907ad6932cf3539df2 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:3 | actual12 FE02 writer start | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:4 | actual12 FE04 bound finalized mutation segment0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:5 | actual12 FC02 actual file evidence prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:6 | FC02/unbound/apply/positive valid reservation prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:7 | FC02/unbound/apply/positive actual reservation replay prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:8 | FC02/unbound/apply/positive acceptance expected1 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:9 | FC02/unbound/apply/positive positive exact memory projection | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:10 | FC02/unbound/apply/positive original payload parsed once | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:11 | FC02/unbound/apply/truncated valid reservation prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:12 | FC02/unbound/apply/truncated actual reservation replay prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:13 | FC02/unbound/apply/truncated acceptance expected0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:14 | FC02/unbound/apply/truncated no partial memory projection | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:15 | FC02/unbound/apply/duplicate-key valid reservation prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:16 | FC02/unbound/apply/duplicate-key actual reservation replay prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:17 | FC02/unbound/apply/duplicate-key acceptance expected0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:18 | FC02/unbound/apply/duplicate-key no partial memory projection | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:19 | FC02/unbound/apply/segment-wrong-type valid reservation prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:20 | FC02/unbound/apply/segment-wrong-type actual reservation replay prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:21 | FC02/unbound/apply/segment-wrong-type acceptance expected0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:22 | FC02/unbound/apply/segment-wrong-type no partial memory projection | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:23 | FC02/unbound/apply/relative-wrong-type valid reservation prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:24 | FC02/unbound/apply/relative-wrong-type actual reservation replay prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:25 | FC02/unbound/apply/relative-wrong-type acceptance expected0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:26 | FC02/unbound/apply/relative-wrong-type no partial memory projection | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:27 | FC02/unbound/apply/missing-segment valid reservation prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:28 | FC02/unbound/apply/missing-segment actual reservation replay prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:29 | FC02/unbound/apply/missing-segment acceptance expected0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:30 | FC02/unbound/apply/missing-segment no partial memory projection | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:31 | FC02/unbound/apply/missing-relative valid reservation prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:32 | FC02/unbound/apply/missing-relative actual reservation replay prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:33 | FC02/unbound/apply/missing-relative acceptance expected0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:34 | FC02/unbound/apply/missing-relative no partial memory projection | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:35 | FC02/unbound/apply/unknown-extra-existing-boundary valid reservation prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:36 | FC02/unbound/apply/unknown-extra-existing-boundary actual reservation replay prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:37 | FC02/unbound/apply/unknown-extra-existing-boundary acceptance expected0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:38 | FC02/unbound/apply/unknown-extra-existing-boundary no partial memory projection | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:39 | FC02/unbound/sql/positive valid reservation prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:40 | FC02/unbound/sql/positive actual reservation replay prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:41 | FC02/unbound/sql/positive acceptance expected1 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:42 | FC02/unbound/sql/positive positive SQL rows | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:43 | FC02/unbound/sql/positive original payload parsed once | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:44 | FC02/unbound/sql/truncated valid reservation prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:45 | FC02/unbound/sql/truncated actual reservation replay prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:46 | FC02/unbound/sql/truncated acceptance expected0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:47 | FC02/unbound/sql/truncated rollback no partial SQL rows | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:48 | FC02/unbound/sql/duplicate-key valid reservation prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:49 | FC02/unbound/sql/duplicate-key actual reservation replay prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:50 | FC02/unbound/sql/duplicate-key acceptance expected0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:51 | FC02/unbound/sql/duplicate-key rollback no partial SQL rows | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:52 | FC02/unbound/sql/segment-wrong-type valid reservation prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:53 | FC02/unbound/sql/segment-wrong-type actual reservation replay prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:54 | FC02/unbound/sql/segment-wrong-type acceptance expected0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:55 | FC02/unbound/sql/segment-wrong-type rollback no partial SQL rows | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:56 | FC02/unbound/sql/relative-wrong-type valid reservation prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:57 | FC02/unbound/sql/relative-wrong-type actual reservation replay prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:58 | FC02/unbound/sql/relative-wrong-type acceptance expected0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:59 | FC02/unbound/sql/relative-wrong-type rollback no partial SQL rows | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:60 | FC02/unbound/sql/missing-segment valid reservation prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:61 | FC02/unbound/sql/missing-segment actual reservation replay prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:62 | FC02/unbound/sql/missing-segment acceptance expected0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:63 | FC02/unbound/sql/missing-segment rollback no partial SQL rows | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:64 | FC02/unbound/sql/missing-relative valid reservation prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:65 | FC02/unbound/sql/missing-relative actual reservation replay prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:66 | FC02/unbound/sql/missing-relative acceptance expected0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:67 | FC02/unbound/sql/missing-relative rollback no partial SQL rows | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:68 | FC02/unbound/sql/unknown-extra-existing-boundary valid reservation prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:69 | FC02/unbound/sql/unknown-extra-existing-boundary actual reservation replay prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:70 | FC02/unbound/sql/unknown-extra-existing-boundary acceptance expected1 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:71 | FC02/unbound/sql/unknown-extra-existing-boundary positive SQL rows | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:72 | FC02/bound/apply/positive valid reservation prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:73 | FC02/bound/apply/positive actual reservation replay prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:74 | FC02/bound/apply/positive acceptance expected1 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:75 | FC02/bound/apply/positive positive exact memory projection | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:76 | FC02/bound/apply/positive original payload parsed once | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:77 | FC02/bound/apply/truncated valid reservation prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:78 | FC02/bound/apply/truncated actual reservation replay prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:79 | FC02/bound/apply/truncated acceptance expected0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:80 | FC02/bound/apply/truncated no partial memory projection | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:81 | FC02/bound/apply/duplicate-key valid reservation prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:82 | FC02/bound/apply/duplicate-key actual reservation replay prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:83 | FC02/bound/apply/duplicate-key acceptance expected0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:84 | FC02/bound/apply/duplicate-key no partial memory projection | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:85 | FC02/bound/apply/segment-wrong-type valid reservation prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:86 | FC02/bound/apply/segment-wrong-type actual reservation replay prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:87 | FC02/bound/apply/segment-wrong-type acceptance expected0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:88 | FC02/bound/apply/segment-wrong-type no partial memory projection | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:89 | FC02/bound/apply/relative-wrong-type valid reservation prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:90 | FC02/bound/apply/relative-wrong-type actual reservation replay prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:91 | FC02/bound/apply/relative-wrong-type acceptance expected0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:92 | FC02/bound/apply/relative-wrong-type no partial memory projection | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:93 | FC02/bound/apply/missing-segment valid reservation prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:94 | FC02/bound/apply/missing-segment actual reservation replay prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:95 | FC02/bound/apply/missing-segment acceptance expected0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:96 | FC02/bound/apply/missing-segment no partial memory projection | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:97 | FC02/bound/apply/missing-relative valid reservation prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:98 | FC02/bound/apply/missing-relative actual reservation replay prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:99 | FC02/bound/apply/missing-relative acceptance expected0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:100 | FC02/bound/apply/missing-relative no partial memory projection | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:101 | FC02/bound/apply/binding-wrong-type valid reservation prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:102 | FC02/bound/apply/binding-wrong-type actual reservation replay prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:103 | FC02/bound/apply/binding-wrong-type acceptance expected0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:104 | FC02/bound/apply/binding-wrong-type no partial memory projection | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:105 | FC02/bound/apply/unknown-extra-existing-boundary valid reservation prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:106 | FC02/bound/apply/unknown-extra-existing-boundary actual reservation replay prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:107 | FC02/bound/apply/unknown-extra-existing-boundary acceptance expected0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:108 | FC02/bound/apply/unknown-extra-existing-boundary no partial memory projection | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:109 | FC02/bound/sql/positive valid reservation prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:110 | FC02/bound/sql/positive actual reservation replay prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:111 | FC02/bound/sql/positive acceptance expected1 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:112 | FC02/bound/sql/positive positive SQL rows | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:113 | FC02/bound/sql/positive original payload parsed once | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:114 | FC02/bound/sql/truncated valid reservation prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:115 | FC02/bound/sql/truncated actual reservation replay prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:116 | FC02/bound/sql/truncated acceptance expected0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:117 | FC02/bound/sql/truncated rollback no partial SQL rows | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:118 | FC02/bound/sql/duplicate-key valid reservation prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:119 | FC02/bound/sql/duplicate-key actual reservation replay prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:120 | FC02/bound/sql/duplicate-key acceptance expected0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:121 | FC02/bound/sql/duplicate-key rollback no partial SQL rows | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:122 | FC02/bound/sql/segment-wrong-type valid reservation prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:123 | FC02/bound/sql/segment-wrong-type actual reservation replay prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:124 | FC02/bound/sql/segment-wrong-type acceptance expected0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:125 | FC02/bound/sql/segment-wrong-type rollback no partial SQL rows | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:126 | FC02/bound/sql/relative-wrong-type valid reservation prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:127 | FC02/bound/sql/relative-wrong-type actual reservation replay prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:128 | FC02/bound/sql/relative-wrong-type acceptance expected0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:129 | FC02/bound/sql/relative-wrong-type rollback no partial SQL rows | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:130 | FC02/bound/sql/missing-segment valid reservation prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:131 | FC02/bound/sql/missing-segment actual reservation replay prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:132 | FC02/bound/sql/missing-segment acceptance expected0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:133 | FC02/bound/sql/missing-segment rollback no partial SQL rows | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:134 | FC02/bound/sql/missing-relative valid reservation prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:135 | FC02/bound/sql/missing-relative actual reservation replay prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:136 | FC02/bound/sql/missing-relative acceptance expected0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:137 | FC02/bound/sql/missing-relative rollback no partial SQL rows | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:138 | FC02/bound/sql/binding-wrong-type valid reservation prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:139 | FC02/bound/sql/binding-wrong-type actual reservation replay prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:140 | FC02/bound/sql/binding-wrong-type acceptance expected0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:141 | FC02/bound/sql/binding-wrong-type rollback no partial SQL rows | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:142 | FC02/bound/sql/unknown-extra-existing-boundary valid reservation prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:143 | FC02/bound/sql/unknown-extra-existing-boundary actual reservation replay prerequisite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:144 | FC02/bound/sql/unknown-extra-existing-boundary acceptance expected1 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-green:145 | FC02/bound/sql/unknown-extra-existing-boundary positive SQL rows | pass | 해당 실행 source/범위에 한정 |

- `[cleanup] path=/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-catalog-cost.6xzyL2 bytes=11990526 removed=true`
- `[exit] code=0 elapsed_seconds=7 token_usage=unavailable source=bash-SECONDS`

### catalog-cost-output-parse-red.txt

[원출력](catalog-cost-output-parse-red.txt), SHA-256 `a06d6acf68210250cdcc1027b715c6aeeca4a7ba17716f12360fbe19ab7b86c6`, 3393bytes.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| catalog-cost-output-parse-red:1 | FC01 exact insertion checks count=92 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-output-parse-red:2 | FC02 temporary access/parser exact insertions=2 strict_original_sha256=be1057725d0a0b54d705543ce635da6c832e4c53fbec008e91ad63c9a1d0f58b header_original_sha256=e923f9ae493d59c9516163f1909c8973ded4b5f2d18676907ad6932cf3539df2 | pass | 해당 실행 source/범위에 한정 |
| FC02 준비 | 비공개 예약 serializer명을 사용한 fixture 컴파일 오류 | fail | 예상 RED 아님. 실제 예약/replay 선수조건으로 보완 |

- `[cleanup] path=/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-catalog-cost.iNX8E1 bytes=352990 removed=true`
- `[exit] code=1 elapsed_seconds=7 token_usage=unavailable source=bash-SECONDS`

### catalog-cost-output-parse-red2.txt

[원출력](catalog-cost-output-parse-red2.txt), SHA-256 `b751ca01b800efe6bade61c8cfb3b42e3f142fc6bf670994f774c5fa2b46a34b`, 12887bytes.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| catalog-cost-output-parse-red2:1 | FC01 exact insertion checks count=92 | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:2 | FC02 temporary access/parser exact insertions=2 strict_original_sha256=be1057725d0a0b54d705543ce635da6c832e4c53fbec008e91ad63c9a1d0f58b header_original_sha256=e923f9ae493d59c9516163f1909c8973ded4b5f2d18676907ad6932cf3539df2 | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:3 | actual12 FE02 writer start | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:4 | actual12 FE04 bound finalized mutation segment0 | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:5 | actual12 FC02 actual file evidence prerequisite | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:6 | FC02/unbound/apply/positive valid reservation prerequisite | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:7 | FC02/unbound/apply/positive actual reservation replay prerequisite | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:8 | FC02/unbound/apply/positive acceptance expected1 | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:9 | FC02/unbound/apply/positive positive exact memory projection | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:10 | FC02/unbound/apply/positive original payload parsed more than once | fail | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:11 | FC02/unbound/apply/truncated valid reservation prerequisite | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:12 | FC02/unbound/apply/truncated actual reservation replay prerequisite | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:13 | FC02/unbound/apply/truncated acceptance expected0 | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:14 | FC02/unbound/apply/truncated no partial memory projection | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:15 | FC02/unbound/apply/duplicate-key valid reservation prerequisite | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:16 | FC02/unbound/apply/duplicate-key actual reservation replay prerequisite | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:17 | FC02/unbound/apply/duplicate-key acceptance expected0 | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:18 | FC02/unbound/apply/duplicate-key no partial memory projection | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:19 | FC02/unbound/apply/segment-wrong-type valid reservation prerequisite | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:20 | FC02/unbound/apply/segment-wrong-type actual reservation replay prerequisite | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:21 | FC02/unbound/apply/segment-wrong-type acceptance expected0 | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:22 | FC02/unbound/apply/segment-wrong-type no partial memory projection | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:23 | FC02/unbound/apply/relative-wrong-type valid reservation prerequisite | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:24 | FC02/unbound/apply/relative-wrong-type actual reservation replay prerequisite | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:25 | FC02/unbound/apply/relative-wrong-type acceptance expected0 | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:26 | FC02/unbound/apply/relative-wrong-type no partial memory projection | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:27 | FC02/unbound/apply/missing-segment valid reservation prerequisite | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:28 | FC02/unbound/apply/missing-segment actual reservation replay prerequisite | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:29 | FC02/unbound/apply/missing-segment acceptance expected0 | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:30 | FC02/unbound/apply/missing-segment no partial memory projection | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:31 | FC02/unbound/apply/missing-relative valid reservation prerequisite | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:32 | FC02/unbound/apply/missing-relative actual reservation replay prerequisite | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:33 | FC02/unbound/apply/missing-relative acceptance expected0 | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:34 | FC02/unbound/apply/missing-relative no partial memory projection | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:35 | FC02/unbound/apply/unknown-extra-existing-boundary valid reservation prerequisite | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:36 | FC02/unbound/apply/unknown-extra-existing-boundary actual reservation replay prerequisite | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:37 | FC02/unbound/apply/unknown-extra-existing-boundary acceptance expected0 | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:38 | FC02/unbound/apply/unknown-extra-existing-boundary no partial memory projection | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:39 | FC02/unbound/sql/positive valid reservation prerequisite | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:40 | FC02/unbound/sql/positive actual reservation replay prerequisite | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:41 | FC02/unbound/sql/positive acceptance expected1 | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:42 | FC02/unbound/sql/positive positive SQL rows | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:43 | FC02/unbound/sql/positive original payload parsed more than once | fail | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:44 | FC02/unbound/sql/truncated valid reservation prerequisite | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:45 | FC02/unbound/sql/truncated actual reservation replay prerequisite | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:46 | FC02/unbound/sql/truncated acceptance expected0 | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:47 | FC02/unbound/sql/truncated rollback no partial SQL rows | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:48 | FC02/unbound/sql/duplicate-key valid reservation prerequisite | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:49 | FC02/unbound/sql/duplicate-key actual reservation replay prerequisite | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:50 | FC02/unbound/sql/duplicate-key acceptance expected0 | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:51 | FC02/unbound/sql/duplicate-key rollback no partial SQL rows | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:52 | FC02/unbound/sql/segment-wrong-type valid reservation prerequisite | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:53 | FC02/unbound/sql/segment-wrong-type actual reservation replay prerequisite | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:54 | FC02/unbound/sql/segment-wrong-type acceptance expected0 | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:55 | FC02/unbound/sql/segment-wrong-type rollback no partial SQL rows | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:56 | FC02/unbound/sql/relative-wrong-type valid reservation prerequisite | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:57 | FC02/unbound/sql/relative-wrong-type actual reservation replay prerequisite | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:58 | FC02/unbound/sql/relative-wrong-type acceptance expected0 | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:59 | FC02/unbound/sql/relative-wrong-type rollback no partial SQL rows | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:60 | FC02/unbound/sql/missing-segment valid reservation prerequisite | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:61 | FC02/unbound/sql/missing-segment actual reservation replay prerequisite | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:62 | FC02/unbound/sql/missing-segment acceptance expected0 | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:63 | FC02/unbound/sql/missing-segment rollback no partial SQL rows | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:64 | FC02/unbound/sql/missing-relative valid reservation prerequisite | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:65 | FC02/unbound/sql/missing-relative actual reservation replay prerequisite | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:66 | FC02/unbound/sql/missing-relative acceptance expected0 | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:67 | FC02/unbound/sql/missing-relative rollback no partial SQL rows | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:68 | FC02/unbound/sql/unknown-extra-existing-boundary valid reservation prerequisite | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:69 | FC02/unbound/sql/unknown-extra-existing-boundary actual reservation replay prerequisite | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:70 | FC02/unbound/sql/unknown-extra-existing-boundary acceptance expected1 | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:71 | FC02/unbound/sql/unknown-extra-existing-boundary positive SQL rows | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:72 | FC02/bound/apply/positive valid reservation prerequisite | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:73 | FC02/bound/apply/positive actual reservation replay prerequisite | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:74 | FC02/bound/apply/positive acceptance expected1 | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:75 | FC02/bound/apply/positive positive exact memory projection | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:76 | FC02/bound/apply/positive original payload parsed more than once | fail | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:77 | FC02/bound/apply/truncated valid reservation prerequisite | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:78 | FC02/bound/apply/truncated actual reservation replay prerequisite | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:79 | FC02/bound/apply/truncated acceptance expected0 | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:80 | FC02/bound/apply/truncated no partial memory projection | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:81 | FC02/bound/apply/duplicate-key valid reservation prerequisite | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:82 | FC02/bound/apply/duplicate-key actual reservation replay prerequisite | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:83 | FC02/bound/apply/duplicate-key acceptance expected0 | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:84 | FC02/bound/apply/duplicate-key no partial memory projection | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:85 | FC02/bound/apply/segment-wrong-type valid reservation prerequisite | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:86 | FC02/bound/apply/segment-wrong-type actual reservation replay prerequisite | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:87 | FC02/bound/apply/segment-wrong-type acceptance expected0 | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:88 | FC02/bound/apply/segment-wrong-type no partial memory projection | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:89 | FC02/bound/apply/relative-wrong-type valid reservation prerequisite | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:90 | FC02/bound/apply/relative-wrong-type actual reservation replay prerequisite | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:91 | FC02/bound/apply/relative-wrong-type acceptance expected0 | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:92 | FC02/bound/apply/relative-wrong-type no partial memory projection | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:93 | FC02/bound/apply/missing-segment valid reservation prerequisite | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:94 | FC02/bound/apply/missing-segment actual reservation replay prerequisite | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:95 | FC02/bound/apply/missing-segment acceptance expected0 | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:96 | FC02/bound/apply/missing-segment no partial memory projection | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:97 | FC02/bound/apply/missing-relative valid reservation prerequisite | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:98 | FC02/bound/apply/missing-relative actual reservation replay prerequisite | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:99 | FC02/bound/apply/missing-relative acceptance expected0 | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:100 | FC02/bound/apply/missing-relative no partial memory projection | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:101 | FC02/bound/apply/binding-wrong-type valid reservation prerequisite | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:102 | FC02/bound/apply/binding-wrong-type actual reservation replay prerequisite | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:103 | FC02/bound/apply/binding-wrong-type acceptance expected0 | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:104 | FC02/bound/apply/binding-wrong-type no partial memory projection | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:105 | FC02/bound/apply/unknown-extra-existing-boundary valid reservation prerequisite | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:106 | FC02/bound/apply/unknown-extra-existing-boundary actual reservation replay prerequisite | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:107 | FC02/bound/apply/unknown-extra-existing-boundary acceptance expected0 | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:108 | FC02/bound/apply/unknown-extra-existing-boundary no partial memory projection | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:109 | FC02/bound/sql/positive valid reservation prerequisite | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:110 | FC02/bound/sql/positive actual reservation replay prerequisite | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:111 | FC02/bound/sql/positive acceptance expected1 | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:112 | FC02/bound/sql/positive positive SQL rows | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:113 | FC02/bound/sql/positive original payload parsed more than once | fail | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:114 | FC02/bound/sql/truncated valid reservation prerequisite | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:115 | FC02/bound/sql/truncated actual reservation replay prerequisite | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:116 | FC02/bound/sql/truncated acceptance expected0 | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:117 | FC02/bound/sql/truncated rollback no partial SQL rows | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:118 | FC02/bound/sql/duplicate-key valid reservation prerequisite | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:119 | FC02/bound/sql/duplicate-key actual reservation replay prerequisite | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:120 | FC02/bound/sql/duplicate-key acceptance expected0 | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:121 | FC02/bound/sql/duplicate-key rollback no partial SQL rows | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:122 | FC02/bound/sql/segment-wrong-type valid reservation prerequisite | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:123 | FC02/bound/sql/segment-wrong-type actual reservation replay prerequisite | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:124 | FC02/bound/sql/segment-wrong-type acceptance expected0 | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:125 | FC02/bound/sql/segment-wrong-type rollback no partial SQL rows | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:126 | FC02/bound/sql/relative-wrong-type valid reservation prerequisite | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:127 | FC02/bound/sql/relative-wrong-type actual reservation replay prerequisite | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:128 | FC02/bound/sql/relative-wrong-type acceptance expected0 | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:129 | FC02/bound/sql/relative-wrong-type rollback no partial SQL rows | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:130 | FC02/bound/sql/missing-segment valid reservation prerequisite | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:131 | FC02/bound/sql/missing-segment actual reservation replay prerequisite | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:132 | FC02/bound/sql/missing-segment acceptance expected0 | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:133 | FC02/bound/sql/missing-segment rollback no partial SQL rows | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:134 | FC02/bound/sql/missing-relative valid reservation prerequisite | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:135 | FC02/bound/sql/missing-relative actual reservation replay prerequisite | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:136 | FC02/bound/sql/missing-relative acceptance expected0 | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:137 | FC02/bound/sql/missing-relative rollback no partial SQL rows | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:138 | FC02/bound/sql/binding-wrong-type valid reservation prerequisite | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:139 | FC02/bound/sql/binding-wrong-type actual reservation replay prerequisite | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:140 | FC02/bound/sql/binding-wrong-type acceptance expected0 | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:141 | FC02/bound/sql/binding-wrong-type rollback no partial SQL rows | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:142 | FC02/bound/sql/unknown-extra-existing-boundary valid reservation prerequisite | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:143 | FC02/bound/sql/unknown-extra-existing-boundary actual reservation replay prerequisite | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:144 | FC02/bound/sql/unknown-extra-existing-boundary acceptance expected1 | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |
| catalog-cost-output-parse-red2:145 | FC02/bound/sql/unknown-extra-existing-boundary positive SQL rows | pass | 예상 RED 횟수 assertion만 실패, GREEN에서 해소 |

- `[cleanup] path=/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-catalog-cost.nhKzPY bytes=11990266 removed=true`
- `[exit] code=1 elapsed_seconds=8 token_usage=unavailable source=bash-SECONDS`

### catalog-cost-regression-boundaries.txt

[원출력](catalog-cost-regression-boundaries.txt), SHA-256 `b9adaead24d8e1b34495aece28d79a6cb4287fca52ccd53d5ada7d14c6dcfadd`, 579bytes.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| catalog-cost-regression-boundaries:1 | C323-A 거부 결과 불변 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-boundaries:2 | C323-B 성공 원본 tuple | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-boundaries:3 | C323-C 상한 이후 수락·거부 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-boundaries:4 | C334-A 정상 순서 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-boundaries:5 | C334-B validate 실패 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-boundaries:6 | C334-C publish 실패 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-boundaries:7 | C334-D commit 실패 보존 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-boundaries:8 | C334-E clear 실패 | pass | 해당 실행 source/범위에 한정 |

- `[cleanup] path=/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-write-boundaries.sEPJAR bytes=124725 removed=true`
- `[elapsed] seconds=1`
- `[run-result] command=bash scripts/internal/verify_recording_write_boundaries.sh exit=0 signal=null elapsed_ms=557 token_usage=unavailable`

### catalog-cost-regression-build-final.txt

[원출력](catalog-cost-regression-build-final.txt), SHA-256 `d4c3c0e5801230d9dd3b7bd0ad826abf881ffab2e13f51ea3d8d5abfe86da6b8`, 696bytes.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 제품 build | 전체 CMake configure/build | pass | 실제 exit 및 아래 원출력 기준 |

- `[run-result] command=./server.sh-build exit=0 signal=null elapsed_ms=1457 token_usage=unavailable`

### catalog-cost-regression-build.txt

[원출력](catalog-cost-regression-build.txt), SHA-256 `7bd56dd92b1904c34eb228d09e6945565bdfb954abe7ace4c94040bcc41f274c`, 3948bytes.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| 제품 build | 전체 CMake configure/build | pass | 실제 exit 및 아래 원출력 기준 |

- `[run-result] command=./server.sh-build exit=0 signal=null elapsed_ms=21518 token_usage=unavailable`

### catalog-cost-regression-checkpoint.txt

[원출력](catalog-cost-regression-checkpoint.txt), SHA-256 `06551998ecd005ac75c6646f4ab81c707a874e8a705eb19dff076df1aa20d46f`, 9250bytes.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| catalog-cost-regression-checkpoint:1 | CP06 exact canonical sequence equality | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-checkpoint:2 | CP06 same length different payload rejected | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-checkpoint:3 | CP06 reordered sequence rejected | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-checkpoint:4 | CP06 different count rejected | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-checkpoint:5 | CP06 different schema despite canonical equality rejected | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-checkpoint:6 | CP06 different enum despite canonical equality rejected | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-checkpoint:7 | CP01 actual Ready Complete shape canonical files reservation | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-checkpoint:8 | CP02 bounded two jobs over 1MiB canonical transitions | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-checkpoint:9 | CP03 bounded partial missing source then same evidence complete | pass | 해당 실행 source/범위에 한정 |

- `[bounded] {"pid":27307,"code":0,"signal":null,"limit":false,"outputBytes":8464,"diagnostic":false,"automaticCheckpoints":null}`
- `[cleanup] path=/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-checkpoint-reproduction.qarnGX bytes=15034093 removed=true`
- `[elapsed] seconds=27 source=bash-SECONDS`
- `[run-result] command=bash scripts/internal/verify_recording_checkpoint_reproduction.sh exit=0 signal=null elapsed_ms=26900 token_usage=unavailable`

### catalog-cost-regression-evidence.txt

[원출력](catalog-cost-regression-evidence.txt), SHA-256 `d0a836b563928fde8f6ce5bb7c35e308dfd88f5fd4a7ba73a8d650d58dddbef7`, 13539bytes.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| catalog-cost-regression-evidence:1 | actual-1 FE02 writer start | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:2 | actual-1 FE04 bound finalized mutation segment0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:3 | actual-1 FE04 bound finalized mutation segment1 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:4 | actual-1 FE02 expected segment count | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:5 | TP01/segment0 FE01 actual evidence persisted | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:6 | TP01/segment0 FE02 physical native and hash verification | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:7 | TP01/segment1 FE01 actual evidence persisted | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:8 | TP01/segment1 FE02 physical native and hash verification | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:9 | actual-2 FE02 writer start | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:10 | actual-2 FE04 bound finalized mutation segment0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:11 | actual-2 FE02 expected segment count | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:12 | TP02/segment0 FE01 actual evidence persisted | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:13 | TP02/segment0 FE02 physical native and hash verification | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:14 | actual-3 FE02 writer start | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:15 | actual-3 FE04 bound finalized mutation segment0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:16 | actual-3 FE02 expected segment count | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:17 | TP03/segment0 FE01 actual evidence persisted | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:18 | TP03/segment0 FE02 physical native and hash verification | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:19 | actual-4 FE02 writer start | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:20 | actual-4 FE04 bound finalized mutation segment0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:21 | actual-4 FE02 expected segment count | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:22 | TP04/segment0 FE01 actual evidence persisted | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:23 | TP04/segment0 FE02 physical native and hash verification | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:24 | TP01/contract FE01 strict evidence roundtrip | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:25 | TP01/contract FE01 absent existing bytes unchanged | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:26 | TP01/contract FE06 reject ordinal | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:27 | TP01/contract FE06 reject original PTS | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:28 | TP01/contract FE06 reject origin | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:29 | TP01/contract FE06 reject mux DTS | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:30 | TP01/contract FE06 reject native PTS | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:31 | TP01/contract FE06 reject native duration | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:32 | TP01/contract FE06 reject timescale | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:33 | TP01/contract FE06 reject duplicate VCL | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:34 | TP01/contract FE06 reject duplicate raw | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:35 | TP01/contract FE06 reject missing sample | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:36 | TP01/contract FE06 reject profile | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:37 | TP01/contract FE06 reject hash format | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:38 | TP01/contract FE06 reject overflow | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:39 | TP01/contract FE06 reject file hash binding | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:40 | TP01/contract FE06 JSON unknown field | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:41 | TP01/contract FE06 JSON duplicate field | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:42 | TP01/contract FE06 JSON oversize | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:43 | TP01/contract FE06 reject evidence version | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:44 | TP01/malformed FE03 reject zero box with recomputed file hash | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:45 | TP01/malformed FE03 reject duplicate box with recomputed file hash | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:46 | TP01/malformed FE03 reject outside mdat with recomputed file hash | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:47 | TP01/malformed FE03 reject table count with recomputed file hash | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:48 | TP01/malformed FE03 reject sample count overflow with recomputed file hash | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:49 | TP01/malformed FE03 reject box overflow with recomputed file hash | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:50 | TP01/malformed FE03 reject edit rate with recomputed file hash | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:51 | TP01/malformed FE03 reject edit version with recomputed file hash | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:52 | TP01/malformed FE03 reject truncated with recomputed file hash | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:53 | actual-1/sqlite/checkpoint FE05 journal reopen | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:54 | actual-1/sqlite/checkpoint FE05 SQLite reopen | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:55 | actual-1/sqlite/checkpoint FE05 exact evidence roundtrip | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:56 | actual-1/sqlite/checkpoint FE05 checkpoint | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:57 | actual-1/jsonl/replay FE05 journal reopen | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:58 | actual-1/jsonl/replay FE05 JSONL fallback reopen | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:59 | actual-1/jsonl/replay FE05 exact evidence roundtrip | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:60 | actual-1/ready FE04 write exact evidence Ready | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:61 | actual-1/ready FE05 Ready journal | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:62 | actual-1/ready FE05 Ready catalog | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:63 | actual-1/ready FE05 Ready replay actual file verification | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:64 | actual-1/ready FE04 Ready cleaned | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:65 | actual-1/ready FE06 forged sample hash physical Ready refusal | pass | 원출력상 pass이나 oracle 무효, 완료 증거 제외 |
| catalog-cost-regression-evidence:66 | cap4096 FE02 writer start | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:67 | cap4096 FE04 bound finalized mutation segment0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:68 | cap4096 FE07 4096 single segment | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:69 | cap4096/capacity FE07 actual4096 within2MiB | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:70 | cap4096/capacity FE07 wide integer and escaped track roundtrip | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:71 | cap4096/capacity FE07 numeric width conservative envelope below2MiB | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:72 | cap4096/capacity FE07 structure-only validation iteration0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:73 | cap4096/capacity FE07 structure-only validation iteration1 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:74 | cap4096/capacity FE07 structure-only validation iteration2 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:75 | cap4096/capacity FE07 structure-only validation iteration3 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:76 | cap4096/capacity FE07 structure-only validation iteration4 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:77 | cap4096/capacity FE07 structure-only validation iteration5 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:78 | cap4096/capacity FE07 structure-only validation iteration6 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:79 | cap4096/capacity FE07 structure-only validation iteration7 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:80 | cap4096/capacity FE07 structure-only validation iteration8 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:81 | cap4096/capacity FE07 structure-only validation iteration9 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:82 | cap4096/capacity FE07 4097 structure refusal | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:83 | cap4096/capacity FE07 intent roundtrip source2 legacy0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:84 | cap4096/capacity FE07 intent roundtrip source8 legacy0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:85 | cap4096/capacity FE07 intent roundtrip source2 legacy1 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:86 | cap4096/capacity FE08 projection preserves full intent bytes and ID source2 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:87 | cap4096/capacity FE07 intent roundtrip source8 legacy1 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:88 | cap4096/capacity FE08 projection preserves full intent bytes and ID source8 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:89 | cap4096/sqlite/checkpoint FE05 journal reopen | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:90 | cap4096/sqlite/checkpoint FE05 SQLite reopen | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:91 | cap4096/sqlite/checkpoint FE05 exact evidence roundtrip | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:92 | cap4096/sqlite/checkpoint FE05 checkpoint | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:93 | cap4096/jsonl/replay FE05 journal reopen | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:94 | cap4096/jsonl/replay FE05 JSONL fallback reopen | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:95 | cap4096/jsonl/replay FE05 exact evidence roundtrip | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:96 | cap4096/legacy-job FE08 new job identity and bytes unchanged | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:97 | cap4096/legacy-job FE08 invalid optional proof is rejected before projection | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:98 | cap4096/legacy-job FE08 preexisting proof job retains proof and ID | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:99 | cap4096/legacy-job FE08 compatibility journal | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:100 | cap4096/legacy-job FE08 compatibility catalog | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:101 | cap4096/legacy-job FE08 admission policy registered | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:102 | cap4096/legacy-job FE08 live legacy rejects source/ordinal/PTS/hash variant0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:103 | cap4096/legacy-job FE08 live legacy rejects source/ordinal/PTS/hash variant1 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:104 | cap4096/legacy-job FE08 live legacy rejects source/ordinal/PTS/hash variant2 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:105 | cap4096/legacy-job FE08 live legacy rejects source/ordinal/PTS/hash variant3 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:106 | cap4096/legacy-job FE08 proof job requires full live evidence match | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:107 | cap4096/legacy-job FE08 legacy job accepts exact live identity with optional proof | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:108 | cap4096/legacy-job FE08 proof job accepts exact full live proof | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:109 | cap4096/legacy-job FE08 proof and legacy job checkpoint | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:110 | cap4096/legacy-job FE08 job recovery journal sql1 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:111 | cap4096/legacy-job FE08 job recovery catalog sql1 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:112 | cap4096/legacy-job FE08 immutable recovered job proof0 sql1 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:113 | cap4096/legacy-job FE08 immutable recovered job proof1 sql1 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:114 | cap4096/legacy-job FE08 job recovery journal sql0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:115 | cap4096/legacy-job FE08 job recovery catalog sql0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:116 | cap4096/legacy-job FE08 immutable recovered job proof0 sql0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:117 | cap4096/legacy-job FE08 immutable recovered job proof1 sql0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:118 | cap4096/catalog8-evidence FE07 catalog8 reserve0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:119 | cap4096/catalog8-evidence FE07 catalog8 verify outside catalog0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:120 | cap4096/catalog8-evidence FE07 catalog8 commit0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:121 | cap4096/catalog8-evidence FE07 catalog8 reserve1 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:122 | cap4096/catalog8-evidence FE07 catalog8 verify outside catalog1 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:123 | cap4096/catalog8-evidence FE07 catalog8 commit1 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:124 | cap4096/catalog8-evidence FE07 catalog8 reserve2 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:125 | cap4096/catalog8-evidence FE07 catalog8 verify outside catalog2 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:126 | cap4096/catalog8-evidence FE07 catalog8 commit2 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:127 | cap4096/catalog8-evidence FE07 catalog8 reserve3 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:128 | cap4096/catalog8-evidence FE07 catalog8 verify outside catalog3 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:129 | cap4096/catalog8-evidence FE07 catalog8 commit3 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:130 | cap4096/catalog8-evidence FE07 catalog8 reserve4 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:131 | cap4096/catalog8-evidence FE07 catalog8 verify outside catalog4 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:132 | cap4096/catalog8-evidence FE07 catalog8 commit4 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:133 | cap4096/catalog8-evidence FE07 catalog8 reserve5 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:134 | cap4096/catalog8-evidence FE07 catalog8 verify outside catalog5 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:135 | cap4096/catalog8-evidence FE07 catalog8 commit5 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:136 | cap4096/catalog8-evidence FE07 catalog8 reserve6 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:137 | cap4096/catalog8-evidence FE07 catalog8 verify outside catalog6 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:138 | cap4096/catalog8-evidence FE07 catalog8 commit6 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:139 | cap4096/catalog8-evidence FE07 catalog8 reserve7 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:140 | cap4096/catalog8-evidence FE07 catalog8 verify outside catalog7 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:141 | cap4096/catalog8-evidence FE07 catalog8 commit7 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:142 | cap4096/catalog8-evidence FE07 catalog8 source snapshot | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:143 | cap4096/catalog8-evidence FE07 catalog8 checkpoint | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:144 | cap4096/catalog8-legacy FE07 catalog8 reserve0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:145 | cap4096/catalog8-legacy FE07 catalog8 verify outside catalog0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:146 | cap4096/catalog8-legacy FE07 catalog8 commit0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:147 | cap4096/catalog8-legacy FE07 catalog8 reserve1 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:148 | cap4096/catalog8-legacy FE07 catalog8 verify outside catalog1 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:149 | cap4096/catalog8-legacy FE07 catalog8 commit1 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:150 | cap4096/catalog8-legacy FE07 catalog8 reserve2 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:151 | cap4096/catalog8-legacy FE07 catalog8 verify outside catalog2 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:152 | cap4096/catalog8-legacy FE07 catalog8 commit2 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:153 | cap4096/catalog8-legacy FE07 catalog8 reserve3 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:154 | cap4096/catalog8-legacy FE07 catalog8 verify outside catalog3 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:155 | cap4096/catalog8-legacy FE07 catalog8 commit3 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:156 | cap4096/catalog8-legacy FE07 catalog8 reserve4 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:157 | cap4096/catalog8-legacy FE07 catalog8 verify outside catalog4 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:158 | cap4096/catalog8-legacy FE07 catalog8 commit4 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:159 | cap4096/catalog8-legacy FE07 catalog8 reserve5 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:160 | cap4096/catalog8-legacy FE07 catalog8 verify outside catalog5 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:161 | cap4096/catalog8-legacy FE07 catalog8 commit5 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:162 | cap4096/catalog8-legacy FE07 catalog8 reserve6 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:163 | cap4096/catalog8-legacy FE07 catalog8 verify outside catalog6 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:164 | cap4096/catalog8-legacy FE07 catalog8 commit6 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:165 | cap4096/catalog8-legacy FE07 catalog8 reserve7 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:166 | cap4096/catalog8-legacy FE07 catalog8 verify outside catalog7 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:167 | cap4096/catalog8-legacy FE07 catalog8 commit7 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:168 | cap4096/catalog8-legacy FE07 catalog8 source snapshot | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:169 | cap4096/catalog8-legacy FE07 catalog8 checkpoint | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:170 | cap4097 FE02 writer start | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:171 | cap4097 FE04 bound finalized mutation segment0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:172 | cap4097 FE08 cap keeps existing recording | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:173 | duplicate FE02 writer start | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:174 | duplicate FE04 bound finalized mutation segment0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:175 | duplicate FE08 ambiguous VCL keeps recording | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:176 | missing-dts FE02 writer start | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:177 | missing-dts FE04 bound finalized mutation segment0 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-evidence:178 | missing-dts FE08 unsupported original DTS keeps recording | pass | 해당 실행 source/범위에 한정 |

- `[cleanup] path=/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-file-evidence.Oddk0d bytes=101003571 removed=true`
- `[elapsed] seconds=28 source=bash-SECONDS`
- `[run-result] command=bash scripts/internal/verify_recording_file_evidence.sh cost-final exit=0 signal=null elapsed_ms=28650 token_usage=unavailable`

### catalog-cost-regression-finalize-integration.txt

[원출력](catalog-cost-regression-finalize-integration.txt), SHA-256 `1c5e9d71826f6f7671c31cb2eb1bbab144f4cd27ad97891bfb888debe76b821f`, 6993bytes.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| catalog-cost-regression-finalize-integration:1 | FR09 actual H264 packet fixture | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:2 | FR09 writer start | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:3 | FR09 callback observes durable ready | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:4 | FR09 callback observes owned marker | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:5 | FR09 exact final bytes metadata | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:6 | FR09 completion actual bytes | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:7 | FR09 exactly one finalized callback | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:8 | FR09 successful cleanup and reservation completion | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:9 | FR09 writer start | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:10 | FR09 callback observes durable ready | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:11 | FR09 callback observes owned marker | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:12 | FR09 exact final bytes metadata | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:13 | FR10 failure occurs during Push and blocks later packet admission before Stop | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:14 | FR10 repeated Push while started cannot bypass recovery pending | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:15 | FR09 exactly one finalized callback | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:16 | FR10 failure blocks repeat admission and reservation release | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:17 | FR10 Stop preserves media ready marker | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:18 | FR10 recovery journal | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:19 | FR10 recovery Open preserves ready | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:20 | FR10 restart recovers callback failure original ID | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:21 | FR06 known journal | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:22 | FR06 known catalog | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:23 | FR06 known original metadata | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:24 | FR06 known ready | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:25 | FR06 temporary hold fixture | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:26 | FR06 durable diagnostic before rejected Mark preserves journal | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:27 | FR06 release fixture hold | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:28 | FR06 before Mark restart journal | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:29 | FR06 before Mark restart catalog | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:30 | FR06 diagnostic before Mark crash converges to Corrupt | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:31 | FR06 after Mark restart journal | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:32 | FR06 after Mark restart catalog | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:33 | FR06 after Mark crash repeat no append | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:34 | FR06 diagnostic conflict preserves original and journal | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:35 | FR16 event journal open | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:36 | FR16 event catalog open | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:37 | FR16 actual catalog mode | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:38 | FR12 original source registered | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:39 | FR12 durable Pending precedes remux | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:40 | FR11 actual MPEGTS remux ready | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:41 | FR11 actual tsdemux healthy | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:42 | FR12 ready contains derived epoch fixture | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:43 | FR12 raw mismatched event epoch recovery rejects without registration | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:44 | FR13 new event output recovered | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:45 | FR13 source and new output holds exactly once | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:46 | FR16 query contains source and recovered output | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:47 | FR14 recreate exact postcommit stale ready | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:48 | FR14 restart journal | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:49 | FR14 restart catalog | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:50 | FR14 Open restores source output holds | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:51 | FR14 committed replay no journal append | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:52 | FR14 committed recovery no duplicate holds | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:53 | FR15 bridge quota policy | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:54 | FR14 existing output terminal recovery no remux | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:55 | FR14 existing terminal releases all restored holds | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:56 | FR15 production bridge accepts event | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:57 | FR15 every actual bridge request carries ready metadata and reservation | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:58 | FR15 actual production bridge remux completes | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:59 | FR15 production bridge clears ready before terminal | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:60 | FR15 reservation exceed before ready emission | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:61 | FR15 reservation exceed cleans owned output only | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:62 | FR16 event journal open | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:63 | FR16 event catalog open | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:64 | FR16 actual catalog mode | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:65 | FR12 original source registered | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:66 | FR12 durable Pending precedes remux | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:67 | FR11 actual MPEGTS remux ready | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:68 | FR11 actual tsdemux healthy | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:69 | FR12 ready contains derived epoch fixture | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:70 | FR12 raw mismatched event epoch recovery rejects without registration | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:71 | FR13 new event output recovered | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:72 | FR13 source and new output holds exactly once | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:73 | FR16 query contains source and recovered output | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:74 | FR16 direct SQLite open | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:75 | FR16 direct SQLite prepare | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:76 | FR16 actual SQL lifecycle and exact codec metadata projection | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:77 | FR14 recreate exact postcommit stale ready | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:78 | FR14 restart journal | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:79 | FR14 restart catalog | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:80 | FR14 Open restores source output holds | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:81 | FR14 committed replay no journal append | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:82 | FR14 committed recovery no duplicate holds | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:83 | FR15 bridge quota policy | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:84 | FR14 existing output terminal recovery no remux | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:85 | FR14 existing terminal releases all restored holds | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:86 | FR15 production bridge accepts event | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:87 | FR15 every actual bridge request carries ready metadata and reservation | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:88 | FR15 actual production bridge remux completes | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:89 | FR15 production bridge clears ready before terminal | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:90 | FR15 reservation exceed before ready emission | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:91 | FR15 reservation exceed cleans owned output only | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:92 | FR15 failure journal | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:93 | FR15 failure catalog | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:94 | FR15 failure source | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:95 | FR15 failure quota policy | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:96 | FR15 failure request accepted | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:97 | FR15 failed Pending append prevents remux and releases source lease | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:98 | FR15 failed Pending append leaves original and replacement journal unchanged | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:99 | FR15 failed Pending append creates no ready | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:100 | FR15 failed Pending append released exact reservation for readmission | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:101 | FR06 size ready fixture | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:102 | FR06 size journal fixture | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:103 | FR06 size catalog fixture | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:104 | FR06 size definite corruption never finalized | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:105 | FR06 size corrupt original and ticket retained | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:106 | FR06 size repeat logical quarantine converges | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:107 | FR06 container ready fixture | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:108 | FR06 container journal fixture | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:109 | FR06 container catalog fixture | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:110 | FR06 container definite corruption never finalized | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:111 | FR06 container corrupt original and ticket retained | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:112 | FR06 container repeat logical quarantine converges | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:113 | FR06 two-links ready fixture | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:114 | FR06 two-links journal fixture | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:115 | FR06 two-links catalog fixture | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:116 | FR06 two-links definite corruption never finalized | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:117 | FR06 two-links corrupt original and ticket retained | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:118 | FR06 two-links repeat logical quarantine converges | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:119 | FR12 missing link journal | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:120 | FR12 missing link catalog | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:121 | FR12 missing link source | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:122 | FR12 missing durable link actual remux fixture | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:123 | FR12 missing durable Pending prevents inferred event registration | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:124 | FR12 mismatched durable event fixture | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:125 | FR12 mismatched durable event preserves output and journal | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:126 | FR11 unsupported MPEGTS codec metadata unavailable | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:127 | FR11 actual MPEGTS changed bytes definitely corrupt | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:128 | FR11 unclassified MPEGTS error unavailable preserves bytes and journal | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:129 | FR06 path journal | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:130 | FR06 path catalog | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:131 | FR06 path known corrupt fixture | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:132 | FR06 path foreign relative ready fixture | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:133 | FR06 known Corrupt same metadata different stored path rejected | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:134 | FR09 single packet writer start | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:135 | FR09 single packet cleanup returns actual bytes | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:136 | FR09 single packet invalid interval cleans before ready without callback | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:137 | FR09 restart after incomplete single packet | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:138 | FR09 recovered positive interval callback valid V1 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:139 | FR09 single packet cleanup returns actual bytes | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize-integration:140 | FR09 positive interval after incomplete packet finalizes normally | pass | 해당 실행 source/범위에 한정 |

- `[cleanup] path=/private/tmp/media-server-finalize-og4t9I bytes=8234290 removed=true`
- `[run-result] command=bash scripts/internal/verify_v410_recording_finalize_recovery.sh --integration exit=0 signal=null elapsed_ms=11290 token_usage=unavailable`

### catalog-cost-regression-finalize.txt

[원출력](catalog-cost-regression-finalize.txt), SHA-256 `8486e00bf6bd0c5bc99ed9ce9aea5af75d7b44249c1de5e064f0a12b1bc09fb7`, 4655bytes.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| catalog-cost-regression-finalize:1 | ready partial recovers original segment ID | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:2 | FR02 interrupted publish converges: final only | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:3 | FR02 repeated recovery no duplicate mutation | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:4 | FR02 interrupted publish converges: owned two links | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:5 | FR02 repeated recovery no duplicate mutation | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:6 | FR03 catalog commit before cleanup does not append or replace | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:7 | FR04 invalid version preserves original without publication | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:8 | FR04 invalid duplicate preserves original without publication | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:9 | FR04 invalid nonce preserves original without publication | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:10 | FR04 invalid escape preserves original without publication | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:11 | FR04 invalid identity preserves original without publication | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:12 | FR05 symlink ticket rejected and external target untouched | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:13 | FR05 foreign hardlink rejected without unlink | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:14 | FR05 actual unreadable ticket preserves media | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:15 | FR06 corrupt unknown isolated in place without finalized mutation | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:16 | FR06 repeated corruption recovery converges without resurrection | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:17 | FR07 pending takes precedence over ready publication | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:18 | FR07 deleted takes precedence over ready publication | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:19 | FR07 conflict takes precedence over ready publication | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:20 | FR08 orphan not inferred and legacy owned partial cleaned | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:21 | S10-M08 catalog startup preserves V2 ready and cleanup marker partial | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:22 | S10-M08 V2 ready recovers exact metadata partial | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:23 | S10-M08 V2 journal restart and repeated recovery partial | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:24 | S10-M08 catalog startup preserves V2 ready and cleanup marker two-links | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:25 | S10-M08 V2 ready recovers exact metadata two-links | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:26 | S10-M08 V2 journal restart and repeated recovery two-links | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:27 | S10-M08 catalog startup preserves V2 ready and cleanup marker final | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:28 | S10-M08 V2 ready recovers exact metadata final | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:29 | S10-M08 V2 journal restart and repeated recovery final | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:30 | S10-M08 catalog startup preserves V2 ready and cleanup marker committed | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:31 | S10-M08 V2 ready recovers exact metadata committed | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:32 | S10-M08 V2 journal restart and repeated recovery committed | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:33 | S10-M08 V2 ready writer preserves versioned envelope | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:34 | S10-M09 V2 ready refusal preserves originals missing-order | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:35 | S10-M09 V2 ready refusal preserves originals wrong-tuple | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:36 | S10-M09 V2 ready refusal preserves originals optout | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:37 | S10-M09 V2 ready refusal preserves originals deleted | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:38 | S10-M09 V2 ready refusal preserves originals mapping | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:39 | S10-M09 V2 ready refusal preserves originals path | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:40 | S10-M09 V2 ready refusal preserves originals version | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:41 | S10-M09 V2 ready refusal preserves originals event | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:42 | S10-M09 V2 ready refusal preserves originals corrupt-pair | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:43 | S10-M09 V2 ready refusal preserves originals foreign-link | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:44 | S10-M09 V2 ready writer rejects mixed-id | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:45 | S10-M09 V2 ready writer rejects mixed-size | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:46 | S10-M09 V2 ready writer rejects mixed-source | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:47 | S10-M09 V2 ready writer rejects mixed-time | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:48 | S10-M09 V2 ready writer rejects event | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:49 | S10-M09 V2 ready writer rejects oversize | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:50 | S10-M09 V2 direct publish requires catalog | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:51 | S10-M09 V1 inspector still rejects two links | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:52 | S10-M09 V2 direct clear preserves uncommitted ticket and marker | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:53 | S10-WR09 active ready validates publishes commits and clears exact ticket | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:54 | S10-WR09 active ready refusal preserves originals changed-ticket | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:55 | S10-WR09 active ready refusal preserves originals missing-order | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:56 | S10-C328 ready3 writer의 엄격 원본 결박 envelope | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:57 | S10-C328 ready3 거부 identity | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:58 | S10-C328 ready3 거부 legacy | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:59 | S10-C328 ready3 거부 event | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:60 | S10-C328 ready3 거부 missing-binding | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:61 | S10-C328 ready3 거부 null-binding | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:62 | S10-C328 ready3 거부 extra | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:63 | S10-C329 ready 버전별 읽기 상한 1 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:64 | S10-C329 ready 버전별 읽기 상한 2 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:65 | S10-C329 ready 버전별 읽기 상한 3 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:66 | S10-C329 ready3은1MiB를넘는유효결박을수용 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:67 | S10-C330 ready3 원본 결박 복구 partial | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:68 | S10-C331 ready3 원본 결박 복구 two-links | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:69 | S10-C332 ready3 원본 결박 복구 final | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:70 | S10-C333 ready3 원본 결박 복구 committed | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:71 | S10-C334 ready3 거부 상태 원본 보존 no-reservation-final | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:72 | S10-C335 ready3 거부 상태 원본 보존 pending | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:73 | S10-C335 ready3 거부 상태 원본 보존 conflict | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-finalize:74 | S10-C335 ready3 거부 상태 원본 보존 damaged-media | pass | 해당 실행 source/범위에 한정 |

- `[cleanup] path=/private/tmp/media-server-finalize-VAxKhG bytes=11911266 removed=true`
- `[run-result] command=bash scripts/internal/verify_v410_recording_finalize_recovery.sh exit=0 signal=null elapsed_ms=6691 token_usage=unavailable`

### catalog-cost-regression-journal.txt

[원출력](catalog-cost-regression-journal.txt), SHA-256 `934ea3f15be1f20c0996d97b13a861aefc6a7b2fc4e0cc795cc71c0086b08de0`, 14450bytes.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| catalog-cost-regression-journal:1 | journal open:  | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:2 | fallback catalog open:  | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:3 | SQLite off mode 표시 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:4 | segment finalize journal+projection:  | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:5 | fallback range query | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:6 | event link FK 위반 거부 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:7 | FK 위반 transaction/journal 전체 rollback | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:8 | 최초 durable mutation 1개 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:9 | 동일 mutation 중복 append | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:10 | 손상 사이 정상 durable mutation 보존 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:11 | 중간 corrupt line count | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:12 | 마지막 truncated line skip | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:13 | fallback replay open | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:14 | 같은 mutation idempotent replay | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:15 | 재시작 시 nonce로 소유한 partial만 정리하고 foreign partial/final은 보존 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:16 | 중복 replay row/합계 불증가 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:17 | 추적 final은 보존하고 v2가 지목한 잔여 partial과 marker만 복구:  | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:18 | writer cleanup marker 안전 제거 실패는 catalog open을 fail-closed | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:19 | v2 marker가 지목해도 다중 link partial은 보존하고 catalog open을 fail-closed | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:20 | SQLite catalog open/rebuild:  | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:21 | SQLite primary mode 표시 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:22 | SQLite on/off range query ID·순서 parity | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:23 | journal 없는 정상 media와 소유권 불명 cleanup final을 orphan으로 구분 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:24 | journal 없는 손상 media orphan 구분 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:25 | projection failover journal open:  | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:26 | projection failover catalog open:  | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:27 | 실제 SQLite INSERT 실패 trigger 설치 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:28 | SQLite 투영 실패 뒤 journal+memory finalize 유지:  | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:29 | SQLite 투영 실패 즉시 JSONL fallback 전환 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:30 | 재시작 rebuild 전 실패 trigger 제거 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:31 | 투영 실패 직후 in-memory query 정합성 유지 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:32 | projection failover 재시작 journal rebuild:  | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:33 | 재시작 후 journal에서 누락 SQLite projection 복구 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:34 | 재시작 후 SQLite primary 복귀 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:35 | 재시작 journal rebuild가 실제 SQLite row 복원 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:36 | tombstone journal open:  | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:37 | tombstone catalog open:  | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:38 | tombstone 대상 segment finalize:  | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:39 | tombstone 대상 deletion request:  | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:40 | tombstone 완료 기록:  | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:41 | catalog finalize가 tombstone segment ID 재사용을 거부해야 함 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:42 | 손상 SQLite 격리 후 journal rebuild:  | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:43 | 손상 SQLite 원본 격리 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:44 | 격리 SQLite 파일 보존 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:45 | 격리 후 journal rebuild 결과 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:46 | S10-3A future-schema journal read open | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:47 | S10-3A future-schema unsupported classification | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:48 | S10-3A future-schema catalog open denied | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:49 | S10-3A future-schema catalog retry denied | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:50 | S10-3A future-schema journal bytes preserved | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:51 | S10-3A future-schema SQLite bytes preserved | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:52 | S10-3A future-schema writer cleanup untouched | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:53 | S10-3A arbitrary-schema journal read open | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:54 | S10-3A arbitrary-schema unsupported classification | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:55 | S10-3A arbitrary-schema catalog open denied | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:56 | S10-3A arbitrary-schema catalog retry denied | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:57 | S10-3A arbitrary-schema journal bytes preserved | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:58 | S10-3A arbitrary-schema SQLite bytes preserved | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:59 | S10-3A arbitrary-schema writer cleanup untouched | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:60 | S10-3A empty-schema journal read open | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:61 | S10-3A empty-schema unsupported classification | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:62 | S10-3A empty-schema catalog open denied | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:63 | S10-3A empty-schema catalog retry denied | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:64 | S10-3A empty-schema journal bytes preserved | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:65 | S10-3A empty-schema SQLite bytes preserved | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:66 | S10-3A empty-schema writer cleanup untouched | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:67 | S10-3A future-type journal read open | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:68 | S10-3A future-type unsupported classification | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:69 | S10-3A future-type catalog open denied | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:70 | S10-3A future-type catalog retry denied | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:71 | S10-3A future-type journal bytes preserved | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:72 | S10-3A future-type SQLite bytes preserved | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:73 | S10-3A future-type writer cleanup untouched | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:74 | S10-3A malformed journal open | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:75 | S10-3A malformed JSON missing fields and wrong types remain corrupt | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:76 | S10-O01 reservation journal open | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:77 | S10-O01 first reservation returns four IDs and sequence one | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:78 | S10-O01 versioned reservation payload replays | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:79 | S10-O01 new reservation records actual occurred time | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:80 | S10-O02 identical retry preserves sequence and bytes | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:81 | S10-O03 reopened instance allocates next sequence | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:82 | S10-O03 new process resumes durable sequence | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:83 | S10-O04 different store rejected | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:84 | S10-O04 reused request with different segment rejected | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:85 | S10-O04 reused request with different channel rejected | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:86 | S10-O04 reused segment with different request rejected | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:87 | S10-O04 conflicts preserve original bytes | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:88 | S10-O05/O06 reject and preserve corrupt | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:89 | S10-O05/O06 reject and preserve unsupported-schema | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:90 | S10-O05/O06 reject and preserve unsupported-type | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:91 | S10-O05/O06 reject and preserve tail | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:92 | S10-O05/O06 reject and preserve payload-zero | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:93 | S10-O05/O06 reject and preserve payload-negative | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:94 | S10-O05/O06 reject and preserve payload-fraction | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:95 | S10-O05/O06 reject and preserve payload-overflow | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:96 | S10-O05/O06 reject and preserve duplicate-sequence | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:97 | S10-O05/O06 reject and preserve decreasing-sequence | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:98 | S10-O05/O06 reject and preserve duplicate-request | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:99 | S10-O05/O06 reject and preserve duplicate-segment | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:100 | S10-O05/O06 reject and preserve store-conflict | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:101 | S10-O05/O06 reject and preserve ordinary-before | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:102 | S10-O05/O06 reject and preserve ordinary-after | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:103 | S10-O05/O06 reject and preserve line-cap | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:104 | S10-O05 reservation entity envelope binding rejects mismatch | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:105 | S10-O05 reservation request envelope binding rejects mismatch | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:106 | S10-O01 strict reservation parser accepts versioned literal | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:107 | S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:108 | S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:109 | S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:110 | S10-O05 strict reservation parser rejects invalid schema fields or duplicate keys | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:111 | S10-O06 INT64_MAX identical retry remains valid | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:112 | S10-O06 sequence overflow rejected without write | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:113 | S10-O02 identical durable reservation duplicates remain idempotent | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:114 | S10-O06 sequence gaps remain valid and allocate above maximum | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:115 | S10-O07 four simultaneous processes finish reservations | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:116 | S10-O07 concurrent sequences are unique and complete | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:117 | S10-O07 next sequence follows concurrent reservations | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:118 | S10-O08 ordinary Append cannot reserve orders | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:119 | S10-O08 unopened journal rejected | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:120 | S10-O08 null result rejected | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:121 | S10-O08 invalid opaque ID rejected | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:122 | S10-O08 failed reservation does not expose tentative result | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:123 | S10-O09 unsafe file binding rejected and original preserved inode | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:124 | S10-O09 unsafe file binding rejected and original preserved parent | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:125 | S10-O09 unsafe file binding rejected and original preserved symlink | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:126 | S10-O09 unsafe file binding rejected and original preserved hardlink | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:127 | S10-O10 reservation and normal segment coexist in catalog | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:128 | S10-O04 reserve then finalize permits identical retry | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:129 | S10-O10 reservation survives catalog rebuild without changing segment query | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:130 | S10-O04 legacy segment cannot acquire retroactive reservation | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:131 | S10-M06 opened catalog accepts fresh exact reservation V2 finalize | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:132 | S10-M07 V2 find preserves complete metadata | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:133 | S10-M07 identical V2 recovery is idempotent | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:134 | S10-M07 V2 is absent from V1 range query | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:135 | S10-M07 V2 registered path is not orphan | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:136 | S10-M07 SQLite exact V2 JSON and path match | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:137 | S10-M07 JSONL restart preserves V2 exact payload | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:138 | S10-M06 wrong reservation tuple rejected store | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:139 | S10-M06 wrong reservation tuple rejected request | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:140 | S10-M06 wrong reservation tuple rejected segment | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:141 | S10-M06 wrong reservation tuple rejected channel | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:142 | S10-M06 wrong reservation tuple rejected sequence | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:143 | S10-M09 immutable V2 mapping mismatch rejected | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:144 | S10-M09 bad V2 startup retry preserves original state bad-payload | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:145 | S10-M09 bad V2 startup retry preserves original state missing-order | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:146 | S10-M09 bad V2 startup retry preserves original state bad-order | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:147 | S10-M09 bad V2 startup retry preserves original state conflicting-order | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:148 | S10-M09 bad V2 startup retry preserves original state tail | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:149 | S10-M09 bad V2 startup retry preserves original state corrupt | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:150 | S10-M09 bad V2 startup retry preserves original state unsafe-path | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:151 | S10-M09 default off rejects V2 before SQLite changes | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:152 | S10-M09 V2 replay namespace and deletion duplicate | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:153 | S10-M09 V2 replay namespace and deletion deleted | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:154 | S10-M09 V2 replay namespace and deletion v1-before | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:155 | S10-M09 V2 replay namespace and deletion v1-after | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:156 | S10-M09 V2 replay namespace and deletion deleted-before | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:157 | S10-M09 V2 replay namespace and deletion resurrection | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:158 | S10-M09 V2 replay namespace and deletion mutation-collision | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:159 | S10-M09 V2 finalize rejects missing media | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:160 | S10-M09 V2 finalize rejects directory media | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:161 | S10-M09 fresh candidate rejects mapping | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:162 | S10-M09 fresh candidate rejects path | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:163 | S10-M09 fresh candidate rejects tombstone | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:164 | S10-SW01 managed empty root opens with lifetime lease | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:165 | S10-SW02 same process second managed owner denied | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:166 | S10-SW03 different process owner and inherited use denied | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:167 | S10-SW12 managed duplicate descriptors are close-on-exec | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:168 | S10-SW05 managed reserve append replay use owned descriptor | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:169 | S10-SW06 raw managed access and legacy default path denied | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:170 | S10-SW01 managed Reserve rejects different store identity | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:171 | S10-SW10 catalog connection can inspect managed lease | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:172 | S10-SW04 owner destruction releases lease | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:173 | S10-SW01 managed reopen rejects different store identity | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:174 | S10-SW11 managed incomplete tail rejects append without changing bytes | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:175 | S10-SW07 legacy nonempty root preserved without conversion | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:176 | S10-SW08 partial initialization retry validates exact state lease | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:177 | S10-SW08 partial initialization retry validates exact state init | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:178 | S10-SW08 partial initialization retry validates exact state barrier | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:179 | S10-SW08 partial initialization retry validates exact state journal | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:180 | S10-SW08 partial initialization retry validates exact state incomplete | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:181 | S10-SW08 partial initialization retry validates exact state unknown | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:182 | S10-SW09 symlink inode and malformed marker rejected journal | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:183 | S10-SW09 symlink inode and malformed marker rejected marker | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:184 | S10-SW09 symlink inode and malformed marker rejected barrier | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:185 | S10-SW09 symlink inode and malformed marker rejected root-symlink | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:186 | S10-SB01 second managed catalog is denied | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:187 | S10-SB02 failed catalog cannot mutate journal or holds | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:188 | S10-SB03 attached catalog blocks unowned append but permits reservation | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:189 | S10-SB04 catalog destruction releases attachment | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:190 | S10-SB05 managed catalog rejects unsafe options outside | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:191 | S10-SB05 managed catalog rejects unsafe options dotdot | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:192 | S10-SB05 managed catalog rejects unsafe options media-symlink | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:193 | S10-SB05 managed catalog rejects unsafe options sqlite-symlink | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:194 | S10-SB05 managed catalog rejects unsafe options sqlite-hardlink | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:195 | S10-SB05 managed catalog rejects unsafe options disabled | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:196 | S10-SB06 failed open releases catalog attachment | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:197 | S10-SB07 managed SQLite sidecar rejected -wal symlink | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:198 | S10-SB07 managed SQLite sidecar rejected -wal hardlink | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:199 | S10-SB07 managed SQLite sidecar rejected -shm symlink | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:200 | S10-SB07 managed SQLite sidecar rejected -shm hardlink | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:201 | S10-SB07 managed SQLite sidecar rejected -journal symlink | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:202 | S10-SB07 managed SQLite sidecar rejected -journal hardlink | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:203 | S10-SC01 managed repeated event fixture is valid | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:204 | S10-SC02 managed reservations avoid history reads | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:205 | S10-SC03 managed V2 finalize avoids full replay | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:206 | S10-SC04 checkpoint reduces superseded event payload bytes | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:207 | S10-SC05 checkpoint preserves latest event and all record identities | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:208 | S10-SC06 checkpoint is idempotent and preserves V2 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:209 | S10-SC08 receipt preserves retry identity and rejects direct append | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:210 | S10-SC09 checkpoint restart preserves SQLite and JSONL state sqlite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:211 | S10-SC09 managed checkpoint SQL V2 payload and path | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:212 | S10-SC09 checkpoint restart preserves SQLite and JSONL state jsonl | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:213 | S10-SC10 checkpoint prefix recovers before writes | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:214 | S10-SC11 checkpoint mismatch preserves bytes and poisons owner | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:215 | S10-SC12 first accepted mutation controls latest event | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:216 | S10-SC16 automatic checkpoint uses accumulated growth | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:217 | S10-SC07 raw checkpoint is rejected | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:218 | S10-SC18 checkpoint syscall failure poisons and reopens write | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:219 | S10-SC21 poison rejects hold mutation write | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:220 | S10-SC18 checkpoint syscall failure poisons and reopens file-fsync | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:221 | S10-SC21 poison rejects hold mutation file-fsync | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:222 | S10-SC18 checkpoint syscall failure poisons and reopens rename | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:223 | S10-SC21 poison rejects hold mutation rename | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:224 | S10-SC18 checkpoint syscall failure poisons and reopens dir-fsync | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:225 | S10-SC21 poison rejects hold mutation dir-fsync | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:226 | S10-SC17 checkpoint preserves holds observations and deletion | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:227 | S10-SC17 checkpoint SQL hold observation tombstone | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:228 | S10-SC17 checkpoint preserves holds observations and deletion restart sqlite | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:229 | S10-SC17 checkpoint SQL restart observation tombstone | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:230 | S10-SC17 checkpoint preserves holds observations and deletion restart jsonl | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:231 | S10-SC19 invalid managed history remains unchanged malformed | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:232 | S10-SC19 invalid managed history remains unchanged unsupported | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:233 | S10-SC19 invalid managed history remains unchanged conflict | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:234 | S10-SC20 raw catalog rejects receipt before side effects | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:235 | S10-SC13 crypto off raw remains usable | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:236 | S10-SC14 crypto off checkpoint is rejected | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:237 | S10-SC15 crypto off receipt reopen is rejected | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:238 | source 저장 callback reconcile 연결 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:239 | policy revision idempotency | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:240 | 5초 safety reconcile | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:241 | composition root 관리 저장소 선행 open | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:242 | composition helper journal 다음 catalog rebuild/open | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:243 | 서버 전 supervisor 시작 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:244 | ingress 전 event bridge 등록 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:245 | ingress 종료 뒤 recorder finalize | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-journal:246 | composition root 시작/종료 순서 | pass | 해당 실행 source/범위에 한정 |

- `[cleanup] path=/tmp/media_server_v410_recording_catalog-27380 bytes=26528854 removed=true`
- `[run-result] command=bash scripts/internal/verify_v410_recording_catalog.sh exit=0 signal=null elapsed_ms=13084 token_usage=unavailable`

### catalog-cost-regression-source.txt

[원출력](catalog-cost-regression-source.txt), SHA-256 `525d5748246adcffc08d53ed900ac42ecb58cec0d70771b26afe545c3b6f9175`, 1176bytes.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| catalog-cost-regression-source:1 | S10-C301 결박 schema 왕복 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-source:2 | S10-C302 식별·ordinal 검증 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-source:3 | S10-C303 PTS 재정렬 보존 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-source:4 | S10-C304 미디어 범위·timebase | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-source:5 | S10-C305 색인 상한·미색인 꼬리 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-source:6 | S10-C306 단일 bound mutation | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-source:7 | S10-C307 source·저장 identity 결박 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-source:8 | S10-C308 불변·멱등 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-source:9 | S10-C309 소급·다운그레이드 금지 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-source:10 | S10-C310 정확한 원본 tuple 조회 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-source:11 | S10-C311 미색인·실제 부재 구분 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-source:12 | S10-C312 복수 segment 후보 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-source:13 | S10-C313 삭제·corrupt·pending 차단 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-source:14 | S10-C314 채널·조회 오류 경계 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-source:15 | S10-C315 SQL·JSONL 재시작 동등 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-source:16 | S10-C316 checkpoint 보존 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-source:17 | S10-C317 손상 원장 선차단 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-source:18 | S10-C318 예약·옵트인 경계 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-source:19 | S10-C319 기존 segment·조회 불변 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-source:20 | S10-C320 실제 finalize 수락 경계 | pass | 해당 실행 source/범위에 한정 |

- `[cleanup] path=/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-binding.EMRudd bytes=6220896 removed=true`
- `[elapsed] seconds=7 source=bash-SECONDS`
- `[run-result] command=bash scripts/internal/verify_recording_source_binding.sh exit=0 signal=null elapsed_ms=7663 token_usage=unavailable`

### catalog-cost-regression-writer.txt

[원출력](catalog-cost-regression-writer.txt), SHA-256 `58b61a989116d3e5fedca8fab0d328519a60c1100de7367813001ba73de3867a`, 7975bytes.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| catalog-cost-regression-writer:1 | WR01 h264 managed segments decode all frames without legacy callback or snapshot | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-writer:2 | S10-C321 h264 실제 수락 원본 tuple과 segment 결박 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-writer:3 | WR01 vp8 managed segments decode all frames without legacy callback or snapshot | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-writer:4 | S10-C321 vp8 실제 수락 원본 tuple과 segment 결박 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-writer:5 | WR02 UTC-only change preserves media splits frames and independent mapping | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-writer:6 | WR03 UTC-only change preserves media splits frames and independent mapping | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-writer:7 | WR04 UTC-only change preserves media splits frames and independent mapping | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-writer:8 | WR05 duplicate PTS with advancing DTS preserves media and unknown mapping | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-writer:9 | WR06 explicit generation reset creates a new media epoch | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-writer:10 | S10-C326 세대별 원본 결박 분리 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-writer:11 | WR07 repeated observations and processing UTC do not duplicate media | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-writer:12 | S10-C325 분할·재전달의 segment별 수락 범위 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-writer:13 | S10-C322 keyframe 대기·다른 track·빈 입력·replay 제외 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-writer:14 | S10-C324 색인 상한 뒤에도 실제4100프레임 저장·미색인 꼬리 표시 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-writer:15 | WR08 missing final duration preserves media with unknown end | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-writer:16 | WR09 mapping budget retains bounded unknown tail and all frames | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-writer:17 | WR01 invalid binding rejects before writes journal | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-writer:18 | WR01 invalid binding rejects before writes catalog | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-writer:19 | WR01 invalid binding rejects before writes root | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-writer:20 | WR01 invalid binding rejects before writes store | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-writer:21 | WR01 invalid binding rejects before writes lease | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-writer:22 | WR01 invalid binding rejects before writes incomplete | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-writer:23 | WR08 clock process change preserves same-generation media with unknown comparison | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-writer:24 | WR08 invalid duration leaves unknown end zero | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-writer:25 | WR08 invalid duration leaves unknown end overflow | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-writer:26 | WR08 unsafe original input cannot become finalized observation | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-writer:27 | WR08 unsafe original input cannot become finalized pts | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-writer:28 | WR08 unsafe original input cannot become finalized range | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-writer:29 | WR07 older generation cache cannot switch media backwards | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-writer:30 | WR07 unrelated video track cannot change selected track identity | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-writer:31 | WR06 reopened store allocates fresh IDs and increasing durable order | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-writer:32 | WR05 actual H264 reordering preserves decode timestamps and mux origin | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-writer:33 | WR05 reordered segment end covers maximum presented frame end | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-writer:34 | S10-C327 실제 B-frame 원본PTS·ordinal 보존 | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-writer:35 | WR08 missing maximum PTS frame duration keeps reordered end unknown | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-writer:36 | WR09 failed active commit preserves ready order and quota reservation | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-writer:37 | WR09 restart recovers the same durable segment and all frames | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-writer:38 | WR08 excessive clock width preserves media as unknown | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-writer:39 | WR08 zero generation order cannot become finalized | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-writer:40 | WR08 media observation quality normal | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-writer:41 | WR08 media observation quality fast | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-writer:42 | WR08 media observation quality drift | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-writer:43 | WR08 media observation quality fast-step | pass | 해당 실행 source/범위에 한정 |
| catalog-cost-regression-writer:44 | WR01 actual appsink observation flows through managed writer and decode | pass | 해당 실행 source/범위에 한정 |

- `[cleanup] path=/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-managed-writer.z94mde bytes=14687375 removed=true`
- `[elapsed] seconds=9 source=bash-SECONDS`
- `[run-result] command=bash scripts/internal/verify_recording_managed_writer.sh exit=0 signal=null elapsed_ms=8746 token_usage=unavailable`

### file-evidence-output-profile-red.txt

[원출력](file-evidence-output-profile-red.txt), SHA-256 `44b0299a02fc0b5a1b8d3afe060b8b4b4f80890eec469044cc4156fe699523d6`, 3604bytes.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| file-evidence-output-profile-red:1 | actual-1 FE02 writer start | pass | data reference index 예상 RED, 후속 수정으로 해소 |
| file-evidence-output-profile-red:2 | actual-1 FE04 bound finalized mutation segment0 | pass | data reference index 예상 RED, 후속 수정으로 해소 |
| file-evidence-output-profile-red:3 | actual-1 FE04 bound finalized mutation segment1 | pass | data reference index 예상 RED, 후속 수정으로 해소 |
| file-evidence-output-profile-red:4 | actual-1 FE02 expected segment count | pass | data reference index 예상 RED, 후속 수정으로 해소 |
| file-evidence-output-profile-red:5 | TP01/segment0 FE01 actual evidence persisted | pass | data reference index 예상 RED, 후속 수정으로 해소 |
| file-evidence-output-profile-red:6 | TP01/segment0 FE02 physical native and hash verification | pass | data reference index 예상 RED, 후속 수정으로 해소 |
| file-evidence-output-profile-red:7 | TP01/segment1 FE01 actual evidence persisted | pass | data reference index 예상 RED, 후속 수정으로 해소 |
| file-evidence-output-profile-red:8 | TP01/segment1 FE02 physical native and hash verification | pass | data reference index 예상 RED, 후속 수정으로 해소 |
| file-evidence-output-profile-red:9 | actual-2 FE02 writer start | pass | data reference index 예상 RED, 후속 수정으로 해소 |
| file-evidence-output-profile-red:10 | actual-2 FE04 bound finalized mutation segment0 | pass | data reference index 예상 RED, 후속 수정으로 해소 |
| file-evidence-output-profile-red:11 | actual-2 FE02 expected segment count | pass | data reference index 예상 RED, 후속 수정으로 해소 |
| file-evidence-output-profile-red:12 | TP02/segment0 FE01 actual evidence persisted | pass | data reference index 예상 RED, 후속 수정으로 해소 |
| file-evidence-output-profile-red:13 | TP02/segment0 FE02 physical native and hash verification | pass | data reference index 예상 RED, 후속 수정으로 해소 |
| file-evidence-output-profile-red:14 | actual-3 FE02 writer start | pass | data reference index 예상 RED, 후속 수정으로 해소 |
| file-evidence-output-profile-red:15 | actual-3 FE04 bound finalized mutation segment0 | pass | data reference index 예상 RED, 후속 수정으로 해소 |
| file-evidence-output-profile-red:16 | actual-3 FE02 expected segment count | pass | data reference index 예상 RED, 후속 수정으로 해소 |
| file-evidence-output-profile-red:17 | TP03/segment0 FE01 actual evidence persisted | pass | data reference index 예상 RED, 후속 수정으로 해소 |
| file-evidence-output-profile-red:18 | TP03/segment0 FE02 physical native and hash verification | pass | data reference index 예상 RED, 후속 수정으로 해소 |
| file-evidence-output-profile-red:19 | actual-4 FE02 writer start | pass | data reference index 예상 RED, 후속 수정으로 해소 |
| file-evidence-output-profile-red:20 | actual-4 FE04 bound finalized mutation segment0 | pass | data reference index 예상 RED, 후속 수정으로 해소 |
| file-evidence-output-profile-red:21 | actual-4 FE02 expected segment count | pass | data reference index 예상 RED, 후속 수정으로 해소 |
| file-evidence-output-profile-red:22 | TP04/segment0 FE01 actual evidence persisted | pass | data reference index 예상 RED, 후속 수정으로 해소 |
| file-evidence-output-profile-red:23 | TP04/segment0 FE02 physical native and hash verification | pass | data reference index 예상 RED, 후속 수정으로 해소 |
| file-evidence-output-profile-red:24 | TP01/contract FE01 strict evidence roundtrip | pass | data reference index 예상 RED, 후속 수정으로 해소 |
| file-evidence-output-profile-red:25 | TP01/contract FE01 absent existing bytes unchanged | pass | data reference index 예상 RED, 후속 수정으로 해소 |
| file-evidence-output-profile-red:26 | TP01/contract FE06 reject ordinal | pass | data reference index 예상 RED, 후속 수정으로 해소 |
| file-evidence-output-profile-red:27 | TP01/contract FE06 reject original PTS | pass | data reference index 예상 RED, 후속 수정으로 해소 |
| file-evidence-output-profile-red:28 | TP01/contract FE06 reject origin | pass | data reference index 예상 RED, 후속 수정으로 해소 |
| file-evidence-output-profile-red:29 | TP01/contract FE06 reject mux DTS | pass | data reference index 예상 RED, 후속 수정으로 해소 |
| file-evidence-output-profile-red:30 | TP01/contract FE06 reject native PTS | pass | data reference index 예상 RED, 후속 수정으로 해소 |
| file-evidence-output-profile-red:31 | TP01/contract FE06 reject native duration | pass | data reference index 예상 RED, 후속 수정으로 해소 |
| file-evidence-output-profile-red:32 | TP01/contract FE06 reject timescale | pass | data reference index 예상 RED, 후속 수정으로 해소 |
| file-evidence-output-profile-red:33 | TP01/contract FE06 reject duplicate VCL | pass | data reference index 예상 RED, 후속 수정으로 해소 |
| file-evidence-output-profile-red:34 | TP01/contract FE06 reject duplicate raw | pass | data reference index 예상 RED, 후속 수정으로 해소 |
| file-evidence-output-profile-red:35 | TP01/contract FE06 reject missing sample | pass | data reference index 예상 RED, 후속 수정으로 해소 |
| file-evidence-output-profile-red:36 | TP01/contract FE06 reject profile | pass | data reference index 예상 RED, 후속 수정으로 해소 |
| file-evidence-output-profile-red:37 | TP01/contract FE06 reject hash format | pass | data reference index 예상 RED, 후속 수정으로 해소 |
| file-evidence-output-profile-red:38 | TP01/contract FE06 reject overflow | pass | data reference index 예상 RED, 후속 수정으로 해소 |
| file-evidence-output-profile-red:39 | TP01/contract FE06 reject file hash binding | pass | data reference index 예상 RED, 후속 수정으로 해소 |
| file-evidence-output-profile-red:40 | TP01/contract FE06 JSON unknown field | pass | data reference index 예상 RED, 후속 수정으로 해소 |
| file-evidence-output-profile-red:41 | TP01/contract FE06 JSON duplicate field | pass | data reference index 예상 RED, 후속 수정으로 해소 |
| file-evidence-output-profile-red:42 | TP01/contract FE06 JSON oversize | pass | data reference index 예상 RED, 후속 수정으로 해소 |
| file-evidence-output-profile-red:43 | TP01/contract FE06 reject evidence version | pass | data reference index 예상 RED, 후속 수정으로 해소 |
| file-evidence-output-profile-red:44 | TP01/malformed FE03 reject zero box with recomputed file hash | pass | data reference index 예상 RED, 후속 수정으로 해소 |
| file-evidence-output-profile-red:45 | TP01/malformed FE03 reject duplicate box with recomputed file hash | pass | data reference index 예상 RED, 후속 수정으로 해소 |
| file-evidence-output-profile-red:46 | TP01/malformed FE03 reject outside mdat with recomputed file hash | pass | data reference index 예상 RED, 후속 수정으로 해소 |
| file-evidence-output-profile-red:47 | TP01/malformed FE03 reject table count with recomputed file hash | pass | data reference index 예상 RED, 후속 수정으로 해소 |
| file-evidence-output-profile-red:48 | TP01/malformed FE03 reject sample count overflow with recomputed file hash | pass | data reference index 예상 RED, 후속 수정으로 해소 |
| file-evidence-output-profile-red:49 | TP01/malformed FE03 reject box overflow with recomputed file hash | pass | data reference index 예상 RED, 후속 수정으로 해소 |
| file-evidence-output-profile-red:50 | TP01/malformed FE03 reject edit rate with recomputed file hash | pass | data reference index 예상 RED, 후속 수정으로 해소 |
| file-evidence-output-profile-red:51 | TP01/malformed FE03 reject edit version with recomputed file hash | pass | data reference index 예상 RED, 후속 수정으로 해소 |
| file-evidence-output-profile-red:52 | TP01/malformed FE03 reject truncated with recomputed file hash | pass | data reference index 예상 RED, 후속 수정으로 해소 |
| file-evidence-output-profile-red:53 | TP01/malformed FE03 reject data reference index with recomputed file hash | fail | data reference index 예상 RED, 후속 수정으로 해소 |

- `[cleanup] path=/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-file-evidence.Rphuei bytes=8450128 removed=true`
- `[elapsed] seconds=7 source=bash-SECONDS`

### file-evidence-output-ready-oracle-fixed.txt

[원출력](file-evidence-output-ready-oracle-fixed.txt), SHA-256 `848c94b43d2a5528d7345bf6d5f8c6a6cadede66884beb3c22aab096eec158dd`, 4529bytes.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| file-evidence-output-ready-oracle-fixed:1 | actual-1 FE02 writer start | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed:2 | actual-1 FE04 bound finalized mutation segment0 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed:3 | actual-1 FE04 bound finalized mutation segment1 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed:4 | actual-1 FE02 expected segment count | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed:5 | TP01/segment0 FE01 actual evidence persisted | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed:6 | TP01/segment0 FE02 physical native and hash verification | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed:7 | TP01/segment1 FE01 actual evidence persisted | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed:8 | TP01/segment1 FE02 physical native and hash verification | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed:9 | actual-2 FE02 writer start | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed:10 | actual-2 FE04 bound finalized mutation segment0 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed:11 | actual-2 FE02 expected segment count | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed:12 | TP02/segment0 FE01 actual evidence persisted | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed:13 | TP02/segment0 FE02 physical native and hash verification | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed:14 | actual-3 FE02 writer start | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed:15 | actual-3 FE04 bound finalized mutation segment0 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed:16 | actual-3 FE02 expected segment count | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed:17 | TP03/segment0 FE01 actual evidence persisted | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed:18 | TP03/segment0 FE02 physical native and hash verification | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed:19 | actual-4 FE02 writer start | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed:20 | actual-4 FE04 bound finalized mutation segment0 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed:21 | actual-4 FE02 expected segment count | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed:22 | TP04/segment0 FE01 actual evidence persisted | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed:23 | TP04/segment0 FE02 physical native and hash verification | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed:24 | TP01/contract FE01 strict evidence roundtrip | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed:25 | TP01/contract FE01 absent existing bytes unchanged | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed:26 | TP01/contract FE06 reject ordinal | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed:27 | TP01/contract FE06 reject original PTS | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed:28 | TP01/contract FE06 reject origin | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed:29 | TP01/contract FE06 reject mux DTS | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed:30 | TP01/contract FE06 reject native PTS | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed:31 | TP01/contract FE06 reject native duration | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed:32 | TP01/contract FE06 reject timescale | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed:33 | TP01/contract FE06 reject duplicate VCL | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed:34 | TP01/contract FE06 reject duplicate raw | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed:35 | TP01/contract FE06 reject missing sample | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed:36 | TP01/contract FE06 reject profile | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed:37 | TP01/contract FE06 reject hash format | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed:38 | TP01/contract FE06 reject overflow | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed:39 | TP01/contract FE06 reject file hash binding | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed:40 | TP01/contract FE06 JSON unknown field | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed:41 | TP01/contract FE06 JSON duplicate field | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed:42 | TP01/contract FE06 JSON oversize | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed:43 | TP01/contract FE06 reject evidence version | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed:44 | TP01/malformed FE03 reject zero box with recomputed file hash | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed:45 | TP01/malformed FE03 reject duplicate box with recomputed file hash | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed:46 | TP01/malformed FE03 reject outside mdat with recomputed file hash | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed:47 | TP01/malformed FE03 reject table count with recomputed file hash | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed:48 | TP01/malformed FE03 reject sample count overflow with recomputed file hash | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed:49 | TP01/malformed FE03 reject box overflow with recomputed file hash | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed:50 | TP01/malformed FE03 reject edit rate with recomputed file hash | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed:51 | TP01/malformed FE03 reject edit version with recomputed file hash | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed:52 | TP01/malformed FE03 reject truncated with recomputed file hash | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed:53 | TP01/malformed FE03 reject data reference index with recomputed file hash | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed:54 | TP01/malformed FE03 reject external data reference with recomputed file hash | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed:55 | TP01/malformed FE03 reject data reference count with recomputed file hash | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed:56 | actual-1/sqlite/checkpoint FE05 journal reopen | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed:57 | actual-1/sqlite/checkpoint FE05 SQLite reopen | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed:58 | actual-1/sqlite/checkpoint FE05 exact evidence roundtrip | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed:59 | actual-1/sqlite/checkpoint FE05 checkpoint | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed:60 | actual-1/jsonl/replay FE05 journal reopen | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed:61 | actual-1/jsonl/replay FE05 JSONL fallback reopen | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed:62 | actual-1/jsonl/replay FE05 exact evidence roundtrip | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed:63 | actual-1/ready FE04 write exact evidence Ready | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed:64 | actual-1/ready FE05 Ready journal | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed:65 | actual-1/ready FE05 Ready catalog | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed:66 | actual-1/ready FE05 Ready replay actual file verification | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed:67 | actual-1/ready FE04 Ready cleaned | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed:68 | actual-1/ready FE06-R reservation mode0 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed:69 | actual-1/ready FE06-R persisted Ready mode0 | fail | 해당 실행 source/범위에 한정 |

- `[cleanup] path=/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-file-evidence.GlDtyR bytes=9320213 removed=true`
- `[elapsed] seconds=7 source=bash-SECONDS`

### file-evidence-output-ready-oracle-fixed2.txt

[원출력](file-evidence-output-ready-oracle-fixed2.txt), SHA-256 `d0bbf2612d883e707d739295a13a5bfb0cc828dbc0a4c650243ea9ad541ed68d`, 14361bytes.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| file-evidence-output-ready-oracle-fixed2:1 | actual-1 FE02 writer start | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:2 | actual-1 FE04 bound finalized mutation segment0 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:3 | actual-1 FE04 bound finalized mutation segment1 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:4 | actual-1 FE02 expected segment count | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:5 | TP01/segment0 FE01 actual evidence persisted | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:6 | TP01/segment0 FE02 physical native and hash verification | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:7 | TP01/segment1 FE01 actual evidence persisted | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:8 | TP01/segment1 FE02 physical native and hash verification | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:9 | actual-2 FE02 writer start | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:10 | actual-2 FE04 bound finalized mutation segment0 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:11 | actual-2 FE02 expected segment count | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:12 | TP02/segment0 FE01 actual evidence persisted | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:13 | TP02/segment0 FE02 physical native and hash verification | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:14 | actual-3 FE02 writer start | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:15 | actual-3 FE04 bound finalized mutation segment0 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:16 | actual-3 FE02 expected segment count | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:17 | TP03/segment0 FE01 actual evidence persisted | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:18 | TP03/segment0 FE02 physical native and hash verification | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:19 | actual-4 FE02 writer start | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:20 | actual-4 FE04 bound finalized mutation segment0 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:21 | actual-4 FE02 expected segment count | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:22 | TP04/segment0 FE01 actual evidence persisted | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:23 | TP04/segment0 FE02 physical native and hash verification | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:24 | TP01/contract FE01 strict evidence roundtrip | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:25 | TP01/contract FE01 absent existing bytes unchanged | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:26 | TP01/contract FE06 reject ordinal | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:27 | TP01/contract FE06 reject original PTS | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:28 | TP01/contract FE06 reject origin | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:29 | TP01/contract FE06 reject mux DTS | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:30 | TP01/contract FE06 reject native PTS | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:31 | TP01/contract FE06 reject native duration | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:32 | TP01/contract FE06 reject timescale | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:33 | TP01/contract FE06 reject duplicate VCL | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:34 | TP01/contract FE06 reject duplicate raw | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:35 | TP01/contract FE06 reject missing sample | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:36 | TP01/contract FE06 reject profile | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:37 | TP01/contract FE06 reject hash format | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:38 | TP01/contract FE06 reject overflow | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:39 | TP01/contract FE06 reject file hash binding | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:40 | TP01/contract FE06 JSON unknown field | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:41 | TP01/contract FE06 JSON duplicate field | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:42 | TP01/contract FE06 JSON oversize | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:43 | TP01/contract FE06 reject evidence version | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:44 | TP01/malformed FE03 reject zero box with recomputed file hash | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:45 | TP01/malformed FE03 reject duplicate box with recomputed file hash | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:46 | TP01/malformed FE03 reject outside mdat with recomputed file hash | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:47 | TP01/malformed FE03 reject table count with recomputed file hash | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:48 | TP01/malformed FE03 reject sample count overflow with recomputed file hash | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:49 | TP01/malformed FE03 reject box overflow with recomputed file hash | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:50 | TP01/malformed FE03 reject edit rate with recomputed file hash | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:51 | TP01/malformed FE03 reject edit version with recomputed file hash | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:52 | TP01/malformed FE03 reject truncated with recomputed file hash | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:53 | TP01/malformed FE03 reject data reference index with recomputed file hash | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:54 | TP01/malformed FE03 reject external data reference with recomputed file hash | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:55 | TP01/malformed FE03 reject data reference count with recomputed file hash | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:56 | actual-1/sqlite/checkpoint FE05 journal reopen | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:57 | actual-1/sqlite/checkpoint FE05 SQLite reopen | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:58 | actual-1/sqlite/checkpoint FE05 exact evidence roundtrip | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:59 | actual-1/sqlite/checkpoint FE05 checkpoint | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:60 | actual-1/jsonl/replay FE05 journal reopen | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:61 | actual-1/jsonl/replay FE05 JSONL fallback reopen | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:62 | actual-1/jsonl/replay FE05 exact evidence roundtrip | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:63 | actual-1/ready FE04 write exact evidence Ready | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:64 | actual-1/ready FE05 Ready journal | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:65 | actual-1/ready FE05 Ready catalog | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:66 | actual-1/ready FE05 Ready replay actual file verification | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:67 | actual-1/ready FE04 Ready cleaned | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:68 | actual-1/ready FE06-R reservation mode0 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:69 | actual-1/ready FE06-R persisted Ready mode0 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:70 | actual-1/ready FE06-R physical rejection exact error mode0 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:71 | actual-1/ready FE06-R rejection no durable or memory mutation mode0 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:72 | actual-1/ready FE06-R rejected original files preserved mode0 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:73 | actual-1/ready FE06-R reservation mode1 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:74 | actual-1/ready FE06-R persisted Ready mode1 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:75 | actual-1/ready FE06-R physical rejection exact error mode1 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:76 | actual-1/ready FE06-R rejection no durable or memory mutation mode1 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:77 | actual-1/ready FE06-R rejected original files preserved mode1 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:78 | actual-1/ready FE06-R reservation mode2 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:79 | actual-1/ready FE06-R persisted Ready mode2 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:80 | actual-1/ready FE06-R valid proof publishes commits and cleans | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:81 | cap4096 FE02 writer start | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:82 | cap4096 FE04 bound finalized mutation segment0 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:83 | cap4096 FE07 4096 single segment | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:84 | cap4096/capacity FE07 actual4096 within2MiB | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:85 | cap4096/capacity FE07 wide integer and escaped track roundtrip | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:86 | cap4096/capacity FE07 numeric width conservative envelope below2MiB | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:87 | cap4096/capacity FE07 structure-only validation iteration0 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:88 | cap4096/capacity FE07 structure-only validation iteration1 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:89 | cap4096/capacity FE07 structure-only validation iteration2 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:90 | cap4096/capacity FE07 structure-only validation iteration3 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:91 | cap4096/capacity FE07 structure-only validation iteration4 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:92 | cap4096/capacity FE07 structure-only validation iteration5 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:93 | cap4096/capacity FE07 structure-only validation iteration6 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:94 | cap4096/capacity FE07 structure-only validation iteration7 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:95 | cap4096/capacity FE07 structure-only validation iteration8 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:96 | cap4096/capacity FE07 structure-only validation iteration9 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:97 | cap4096/capacity FE07 4097 structure refusal | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:98 | cap4096/capacity FE07 intent roundtrip source2 legacy0 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:99 | cap4096/capacity FE07 intent roundtrip source8 legacy0 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:100 | cap4096/capacity FE07 intent roundtrip source2 legacy1 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:101 | cap4096/capacity FE08 projection preserves full intent bytes and ID source2 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:102 | cap4096/capacity FE07 intent roundtrip source8 legacy1 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:103 | cap4096/capacity FE08 projection preserves full intent bytes and ID source8 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:104 | cap4096/sqlite/checkpoint FE05 journal reopen | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:105 | cap4096/sqlite/checkpoint FE05 SQLite reopen | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:106 | cap4096/sqlite/checkpoint FE05 exact evidence roundtrip | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:107 | cap4096/sqlite/checkpoint FE05 checkpoint | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:108 | cap4096/jsonl/replay FE05 journal reopen | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:109 | cap4096/jsonl/replay FE05 JSONL fallback reopen | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:110 | cap4096/jsonl/replay FE05 exact evidence roundtrip | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:111 | cap4096/legacy-job FE08 new job identity and bytes unchanged | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:112 | cap4096/legacy-job FE08 invalid optional proof is rejected before projection | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:113 | cap4096/legacy-job FE08 preexisting proof job retains proof and ID | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:114 | cap4096/legacy-job FE08 compatibility journal | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:115 | cap4096/legacy-job FE08 compatibility catalog | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:116 | cap4096/legacy-job FE08 admission policy registered | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:117 | cap4096/legacy-job FE08 live legacy rejects source/ordinal/PTS/hash variant0 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:118 | cap4096/legacy-job FE08 live legacy rejects source/ordinal/PTS/hash variant1 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:119 | cap4096/legacy-job FE08 live legacy rejects source/ordinal/PTS/hash variant2 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:120 | cap4096/legacy-job FE08 live legacy rejects source/ordinal/PTS/hash variant3 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:121 | cap4096/legacy-job FE08 proof job requires full live evidence match | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:122 | cap4096/legacy-job FE08 legacy job accepts exact live identity with optional proof | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:123 | cap4096/legacy-job FE08 proof job accepts exact full live proof | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:124 | cap4096/legacy-job FE08 proof and legacy job checkpoint | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:125 | cap4096/legacy-job FE08 job recovery journal sql1 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:126 | cap4096/legacy-job FE08 job recovery catalog sql1 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:127 | cap4096/legacy-job FE08 immutable recovered job proof0 sql1 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:128 | cap4096/legacy-job FE08 immutable recovered job proof1 sql1 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:129 | cap4096/legacy-job FE08 job recovery journal sql0 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:130 | cap4096/legacy-job FE08 job recovery catalog sql0 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:131 | cap4096/legacy-job FE08 immutable recovered job proof0 sql0 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:132 | cap4096/legacy-job FE08 immutable recovered job proof1 sql0 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:133 | cap4096/catalog8-evidence FE07 catalog8 reserve0 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:134 | cap4096/catalog8-evidence FE07 catalog8 verify outside catalog0 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:135 | cap4096/catalog8-evidence FE07 catalog8 commit0 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:136 | cap4096/catalog8-evidence FE07 catalog8 reserve1 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:137 | cap4096/catalog8-evidence FE07 catalog8 verify outside catalog1 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:138 | cap4096/catalog8-evidence FE07 catalog8 commit1 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:139 | cap4096/catalog8-evidence FE07 catalog8 reserve2 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:140 | cap4096/catalog8-evidence FE07 catalog8 verify outside catalog2 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:141 | cap4096/catalog8-evidence FE07 catalog8 commit2 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:142 | cap4096/catalog8-evidence FE07 catalog8 reserve3 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:143 | cap4096/catalog8-evidence FE07 catalog8 verify outside catalog3 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:144 | cap4096/catalog8-evidence FE07 catalog8 commit3 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:145 | cap4096/catalog8-evidence FE07 catalog8 reserve4 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:146 | cap4096/catalog8-evidence FE07 catalog8 verify outside catalog4 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:147 | cap4096/catalog8-evidence FE07 catalog8 commit4 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:148 | cap4096/catalog8-evidence FE07 catalog8 reserve5 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:149 | cap4096/catalog8-evidence FE07 catalog8 verify outside catalog5 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:150 | cap4096/catalog8-evidence FE07 catalog8 commit5 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:151 | cap4096/catalog8-evidence FE07 catalog8 reserve6 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:152 | cap4096/catalog8-evidence FE07 catalog8 verify outside catalog6 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:153 | cap4096/catalog8-evidence FE07 catalog8 commit6 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:154 | cap4096/catalog8-evidence FE07 catalog8 reserve7 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:155 | cap4096/catalog8-evidence FE07 catalog8 verify outside catalog7 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:156 | cap4096/catalog8-evidence FE07 catalog8 commit7 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:157 | cap4096/catalog8-evidence FE07 catalog8 source snapshot | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:158 | cap4096/catalog8-evidence FE07 catalog8 checkpoint | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:159 | cap4096/catalog8-legacy FE07 catalog8 reserve0 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:160 | cap4096/catalog8-legacy FE07 catalog8 verify outside catalog0 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:161 | cap4096/catalog8-legacy FE07 catalog8 commit0 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:162 | cap4096/catalog8-legacy FE07 catalog8 reserve1 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:163 | cap4096/catalog8-legacy FE07 catalog8 verify outside catalog1 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:164 | cap4096/catalog8-legacy FE07 catalog8 commit1 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:165 | cap4096/catalog8-legacy FE07 catalog8 reserve2 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:166 | cap4096/catalog8-legacy FE07 catalog8 verify outside catalog2 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:167 | cap4096/catalog8-legacy FE07 catalog8 commit2 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:168 | cap4096/catalog8-legacy FE07 catalog8 reserve3 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:169 | cap4096/catalog8-legacy FE07 catalog8 verify outside catalog3 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:170 | cap4096/catalog8-legacy FE07 catalog8 commit3 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:171 | cap4096/catalog8-legacy FE07 catalog8 reserve4 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:172 | cap4096/catalog8-legacy FE07 catalog8 verify outside catalog4 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:173 | cap4096/catalog8-legacy FE07 catalog8 commit4 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:174 | cap4096/catalog8-legacy FE07 catalog8 reserve5 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:175 | cap4096/catalog8-legacy FE07 catalog8 verify outside catalog5 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:176 | cap4096/catalog8-legacy FE07 catalog8 commit5 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:177 | cap4096/catalog8-legacy FE07 catalog8 reserve6 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:178 | cap4096/catalog8-legacy FE07 catalog8 verify outside catalog6 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:179 | cap4096/catalog8-legacy FE07 catalog8 commit6 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:180 | cap4096/catalog8-legacy FE07 catalog8 reserve7 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:181 | cap4096/catalog8-legacy FE07 catalog8 verify outside catalog7 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:182 | cap4096/catalog8-legacy FE07 catalog8 commit7 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:183 | cap4096/catalog8-legacy FE07 catalog8 source snapshot | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:184 | cap4096/catalog8-legacy FE07 catalog8 checkpoint | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:185 | cap4097 FE02 writer start | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:186 | cap4097 FE04 bound finalized mutation segment0 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:187 | cap4097 FE08 cap keeps existing recording | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:188 | duplicate FE02 writer start | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:189 | duplicate FE04 bound finalized mutation segment0 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:190 | duplicate FE08 ambiguous VCL keeps recording | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:191 | missing-dts FE02 writer start | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:192 | missing-dts FE04 bound finalized mutation segment0 | pass | 해당 실행 source/범위에 한정 |
| file-evidence-output-ready-oracle-fixed2:193 | missing-dts FE08 unsupported original DTS keeps recording | pass | 해당 실행 source/범위에 한정 |

- `[cleanup] path=/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-file-evidence.dB28uQ bytes=103142164 removed=true`
- `[elapsed] seconds=28 source=bash-SECONDS`

## 정리 직접 확인

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-catalog-cost.kOV3ct` | 소유 임시 source/binary/media/catalog | 101183432B | runner 삭제 후 메인 부재 확인 | 삭제 완료 | catalog-cost-output-candidate.txt |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-catalog-cost.QaGiZR` | 소유 임시 source/binary/media/catalog | 5506986B | runner 삭제 후 메인 부재 확인 | 삭제 완료 | catalog-cost-output-compaction.txt |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-catalog-cost.6xzyL2` | 소유 임시 source/binary/media/catalog | 11990526B | runner 삭제 후 메인 부재 확인 | 삭제 완료 | catalog-cost-output-parse-green.txt |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-catalog-cost.iNX8E1` | 소유 임시 source/binary/media/catalog | 352990B | runner 삭제 후 메인 부재 확인 | 삭제 완료 | catalog-cost-output-parse-red.txt |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-catalog-cost.nhKzPY` | 소유 임시 source/binary/media/catalog | 11990266B | runner 삭제 후 메인 부재 확인 | 삭제 완료 | catalog-cost-output-parse-red2.txt |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-write-boundaries.sEPJAR` | 소유 임시 source/binary/media/catalog | 124725B | runner 삭제 후 메인 부재 확인 | 삭제 완료 | catalog-cost-regression-boundaries.txt |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-checkpoint-reproduction.qarnGX` | 소유 임시 source/binary/media/catalog | 15034093B | runner 삭제 후 메인 부재 확인 | 삭제 완료 | catalog-cost-regression-checkpoint.txt |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-file-evidence.Oddk0d` | 소유 임시 source/binary/media/catalog | 101003571B | runner 삭제 후 메인 부재 확인 | 삭제 완료 | catalog-cost-regression-evidence.txt |
| `/private/tmp/media-server-finalize-og4t9I` | 소유 임시 source/binary/media/catalog | 8234290B | runner 삭제 후 메인 부재 확인 | 삭제 완료 | catalog-cost-regression-finalize-integration.txt |
| `/private/tmp/media-server-finalize-VAxKhG` | 소유 임시 source/binary/media/catalog | 11911266B | runner 삭제 후 메인 부재 확인 | 삭제 완료 | catalog-cost-regression-finalize.txt |
| `/tmp/media_server_v410_recording_catalog-27380` | 소유 임시 source/binary/media/catalog | 26528854B | runner 삭제 후 메인 부재 확인 | 삭제 완료 | catalog-cost-regression-journal.txt |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-binding.EMRudd` | 소유 임시 source/binary/media/catalog | 6220896B | runner 삭제 후 메인 부재 확인 | 삭제 완료 | catalog-cost-regression-source.txt |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-managed-writer.z94mde` | 소유 임시 source/binary/media/catalog | 14687375B | runner 삭제 후 메인 부재 확인 | 삭제 완료 | catalog-cost-regression-writer.txt |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-file-evidence.Rphuei` | 소유 임시 source/binary/media/catalog | 8450128B | runner 삭제 후 메인 부재 확인 | 삭제 완료 | file-evidence-output-profile-red.txt |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-file-evidence.GlDtyR` | 소유 임시 source/binary/media/catalog | 9320213B | runner 삭제 후 메인 부재 확인 | 삭제 완료 | file-evidence-output-ready-oracle-fixed.txt |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-file-evidence.dB28uQ` | 소유 임시 source/binary/media/catalog | 103142164B | runner 삭제 후 메인 부재 확인 | 삭제 완료 | file-evidence-output-ready-oracle-fixed2.txt |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-catalog-cost.mJTVm0` | 소유 임시 source/binary/media/catalog | 170722B | runner 삭제 후 메인 부재 확인 | 삭제 완료 | catalog-cost-output-baseline.txt |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-catalog-cost.HpBsiT` | 소유 임시 source/binary/media/catalog | 101181988B | runner 삭제 후 메인 부재 확인 | 삭제 완료 | catalog-cost-output-baseline2.txt |

원출력은 오류·개별 결과·구간별 비용 재현에 필요한 소형 텍스트이며 이 디렉터리에 보존한다. raw media/임시 DB는 보존하지 않았다. 서버/외부 서비스/운영 계정은 기동·접근하지 않았다.

## 검토 후 소스 fingerprint

아래 hash는 검토 완료 시점 값이다. parse/compaction 선택 main의 실행 시 hash가 기존 로그에 없다는 한계를 소급 숨기지 않는다. 해당 파일은 실행 뒤 수정하지 않았고 저장소에 함께 보존한다.

- `scripts/internal/recording_catalog_parse_probe.cpp`: `4cbfbe2463958d298d36f2bb40473a57a08045b914eef510c69b5a3d1f10c75a`
- `scripts/internal/recording_catalog_compaction_probe.cpp`: `798a7203ea36498414769fa27427e4bc835ed02960583bc59b3a6d31d519503e`
- `scripts/internal/recording_file_evidence_smoke.cpp`: `2561b2236c7af59e9645d51eb87a32a73595c5cecbdcc699cfd66fda2a2fe0c1`
- `src/recording/recording_file_evidence.cpp`: `54440968f66ea84f3f17bd86fce5d1bef71b6a2de4f6daf9df210d49eaba7534`
- `src/recording/recording_catalog.cpp`: `d8d130590b972d5630f69865b1e067766a486914508871634445ac898753055e`

## 로그 공백 정규화와 diffcheck 이력

최초 staged diffcheck는 원출력의 줄 끝 공백 때문에 exit2였다. 제품 실패가 아니다. 아래 텍스트 로그에 한해 줄 끝 공백/빈 EOF 줄만 정규화했다. 위 실행별 SHA/크기는 수집 당시 원출력 기준이며, 저장된 정규화본 hash는 아래다. 검사 행·숫자·오류/판정은 바꾸지 않았다. 원출력 전체 byte를 보존했다는 뜻이 아니다.

| 파일 | 수집 원본 SHA-256 | 정규화본 SHA-256 | 원본/저장 bytes |
| --- | --- | --- | --- |
| catalog-cost-output-baseline2.txt | `37cc71f05a2fc20696fea294fce035f622e6ba1134b3de104d8582b2b62182d7` | `55a6cedf16a73518f44f2d9ce028d128fef9ebf38a34eed43b9c733bad2a890f` | 260377 / 260355 |
| catalog-cost-output-candidate.txt | `f3f01a3819c24783f4aa9341fe716e6b5e004f1aa819f8a2ac94db449fb654bc` | `26af3213e6286187e743b93a8f03e4254b20172784a5feb0bddc41c25ba8df37` | 260314 / 260292 |
| catalog-cost-output-compaction.txt | `33f76b49f67dff88479686229d9241f8d894dee341f5b781c8c1b95d33b6af96` | `552d843cff973c4d61d46f91fe3350cd93542a8f7b8aa00e18e0aa514db212f1` | 14498 / 14497 |
| catalog-cost-regression-journal.txt | `934ea3f15be1f20c0996d97b13a861aefc6a7b2fc4e0cc795cc71c0086b08de0` | `25261ffb7b1ffd26a9967a7641456bcb1cb1aac5515bc3e49673bfdfffad2799` | 14450 / 14435 |

## 집계·제외

토큰 start/end/consumed: 실제 집계 소스 부재로 미집계. elapsed는 각 실행 원출력의 bash-SECONDS다. 임시 media·DB·계측 source는 각 소유 root 정리 결과를 따르며 보존물은 로그뿐이다.
