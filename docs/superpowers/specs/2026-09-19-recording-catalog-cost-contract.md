# 녹화 catalog 누적 비용·보관 수명 보완 계약

독자: 녹화 저장·복구·검증 구현자. 수명: S10 내부 저장 보완 설계와 후속 구현의 기준.
작업 정책은 AGENTS.md, 버전 범위는 녹화 로드맵, 실행 사실은 release-test-records.md가 기준이다.
종료점 계약은 시간 대응을, 이 문서는 원장 처리 비용과 데이터 보관 수명을 담당한다.
기존 808행 foundation 설계의 별도 수명 주제이므로 분리하며 같은 계약을 다른 문서에 복제하지 않는다.

상태: LP17 사용자 승인 1~3번의 **판정 기준·비교 설계·안전 계약 작성 완료**. 후속 LP18 제품 보완 1~5번은 사용자 승인으로 착수했다.
후속 비교 도구·원본/2-job 진단은 실행했고 실제 결과와 최초 실패는 release-test-records.md의 LP17 실행 절을 따른다.
상세 보관 잔존·테스트/캐시의 비용 기여를 구분했지만 정확한 heap 귀속, 정량 운용 용량, 제품 구현과 성능 합격은 완료하지 않았다.
이 문서는 그 미확인을 숨기거나 4번 제품 구조 변경을 자동 승인하지 않는다.

## 0. LP18 공통 소유·검증 경계

### O29 저장 처리 구조 선행 판정

2026-09-24 판정이다. 독자·수명은 이 문서 머리말을 따른다. O28 후속 순차 개발 승인을 받아 아래 경계를 직접 확인했다.
이 절은 2026-09-24 당시의 제품 분기 조사이며 제품 구현 완료가 아니다. 이후 사용자는 B안을
구현 범위로 선택했다. 현재 적용할 영속 계약과 검출 경계는 아래 「B안 구현 계약」을 따른다.
O28 측정은 [원인 판정](../../release-artifacts/v4.1.0/lp26-o10-accumulation-20260923/o28-results.md#5번-근본-원인-판정과-최소-후속-방향),
이번 실행 여부는 [중앙 O29 기록](../../release-test-records.md#v410-s11-o29-저장-처리-구조-선행-판정)을 따른다.

#### 바꾸지 않을 의미와 수명

| 자료 | 필요한 의미·소비자 | 이번에 임의로 해서는 안 되는 일 |
| --- | --- | --- |
| 활성 녹화·작업·보호 | writer, 진행 중 derived job, pin/hold/wait lease, 재생 reader가 참조하는 현재 상태 | 상세 해제 때문에 진행 작업·보호·재생 대상이 달라지는 것 |
| 삭제·ID·참조 최소 증거 | 삭제 상태 표출, ID 재사용/다른 내용 충돌 거부, 기존 참조의 삭제 판정 | 영상이 삭제됐다는 이유만으로 tombstone·identity·참조 증거를 함께 삭제하는 것 |
| 비활성 상세 | 원본 연결·시간/파일 대응·과거 작업의 필요한 증거. 현재는 원장에서 다시 읽음 | RAM 비상주를 영구 삭제로 해석하거나 해시만으로 필요한 원문을 대체하는 것 |
| SQLite 투영 | 현재 원장의 검증된 의미를 반영하는 재구축 가능 투영 | SQLite만 남겨 JSONL fallback·복구 가능성을 없애는 것 |
| 실패·재현 증거 | 최초 실패의 단계·종료·입력 결박과 정리 판정 | 새 구조 검증이 과거 O26 실패 원인을 소급 확정했다고 기록하는 것 |

#### 현재 검증 분기와 남는 비용

이전 O29의 "모든 checkpoint가 전체 원문을 다시 읽고 파일을 교체한다"는 설명은 과도했다.
호출 방식·상주 여부·후보 축소 여부를 분리한다. `ReadCheckpointRecords`는 관리 상태·FD를 확인한 뒤
상주 핸들은 재사용하고, 비상주 위치만 `AcquireLocatedRecordLocked`로 원문/해시/엄격 파싱을 한다.
상주 재사용을 새 디스크 변조의 전수 검출로 표현해서는 안 된다.

| 분기 | 원문 확인·의미 검증 | 영속 쓰기 |
| --- | --- | --- |
| 적격 자동 no-op | `TryAutomaticCheckpointNoop`가 모든 물리 행의 raw SHA를 읽어 대조. 부적격·pending은 일반 경로로 이동 | 없음 |
| 일반 checkpoint, 상주 행 | 상주 핸들 재사용. cache 적격이면 원본 의미 재적용은 suffix만, 후보가 변경되면 후보 전체 적용·투영 대조 | `CommitCheckpoint`가 후보 전체 바이트를 생성하지만 현재보다 작지 않으면 교체 없음 |
| 일반 checkpoint, 비상주 행 | 해당 행을 위치에서 재획득하며 raw/해시/엄격 파싱. 원본 cache 부적격이면 원본 의미를 다시 적용 | 후보가 작아질 때만 stage·fsync·rename으로 원장 전체를 원자 교체 |
| 복구/pending | 기존 strict 입력·후보·pending prefix 및 SQLite 경계를 별도로 확인 | 필요한 pending 정리 또는 위의 축소 조건에 한정 |

따라서 **자동 no-op의 전체 raw 읽기**와 **일반 경로의 후보 전체 직렬화·원본/후보 의미 처리**는
서로 다른 비용이다. 현재 형식에서도 resident·cache·축소 여부에 따라 호출 비용이 다르다.
전체 파일 교체는 축소된 후보에서만 일어난다. 호환 범위 안의 scratch 재사용·스트리밍 처리로
일시 상세 실체화와 중복 CPU를 낮출 여지는 있으나, 이를 모든 정상 호출의 과거 이력 비례 비용이
사라졌다는 증거로 삼지 않는다. 새 영속 형식은 이 분기별 잔여 비용과 검출 시점 계약을 대조해 결정한다.
cache 상한 변경, no-op 주기 확대, 검사 생략만으로 해결됐다고 하지 않는다.

이는 코드 경계에서 도출한 판정이며 모든 장비에서 HTTP 실패가 반드시 난다는 측정 결론은 아니다.
O28에서 RSS 전체 귀속과 O26 최초 native 실패가 미확정이라는 한계도 그대로 유지한다.

#### 저장 구조 선택

| 대안 | 유지·변경 | 구현 전 판단과 남는 한계 |
| --- | --- | --- |
| A: 현재 형식 안의 제한된 처리 | JSONL 바이트/복구 계약과 분기별 기존 검증 시점을 유지. 검증된 scratch를 수용하고 cold 물리 행을 제한된 수명으로 처리 | 자동 no-op의 전수 raw 읽기, 일반 경로의 전체 후보 생성, 실제 축소 때의 전체 재작성은 각각 별도 비용. 동일/변경 후보와 strict fallback을 대조 |
| B: 검증된 현재 상태 + 증분 원장 + 분리된 과거 증거 | 정상 처리를 전체 역사 재처리에서 분리. 공개 API·시간·ID 의미는 유지하되 영속 배치·세대 게시·복구 경계 변경 필요 | 사용자에게 변경 범위 선택 요청. 원자 게시/중단 복구, 기존 형식 읽기, 최소 ID/삭제 증거, cold 상세 검증 시점, SQLite 독립 복구를 먼저 확정 |

구조적 상한을 없애려면 B를 검토해야 하지만 이 표만으로 구현 승격하지 않는다. 별도 증거 저장소는 새 Git 저장소를 뜻하지 않는다.
현재 저장소 내부의 저장 자료 배치에 관한 선택이다. B를 택하더라도 무한 이력의 저장량이 자동으로
상수가 되거나 RAM/RSS 문제가 모두 해결되지는 않는다. 최소 ID 색인의 증가, cold 상세 보관 의무,
조회 시 검증과 전체 감사 시점, 호환 데이터의 처리 비용은 별도 합격 기준이 필요하다.

#### 복구 개선의 공통 안전 조건

- 뒤 행에 오류가 있을 때 앞 행의 상태가 공개되면 안 된다. strict scratch 전체 성공 전에 live 상태를
  채택하거나 SQLite의 부분 투영을 COMMIT하지 않는다. 실패한 Open의 기존 거부 의미를 유지한다.
- catalog 전체 객체를 이동하지 않는다. mutex/journal 참조/SQLite 연결/service·lease 상태와 구분한
  투영 자료, 최초 수용 ordinal, 중복/복구 counters만 명시적으로 결속한다.
- 같은 Open의 검증된 행 내용은 호출-local로 소비할 수 있으나, 이전 상태를 최종 상태로 치환하거나
  순서·예약·ID 충돌·참조 검증을 생략하지 않는다. history 전체 typed cache를 늘리지 않는다.
- `ValidateRecordingOrderHistory`의 store/sequence/tuple·일반 ID와 request ID 충돌·derived 출력 예약 규칙을
  ordered accumulator로 연결하기 전에는 별도 검사를 없애지 않는다. V2/order 없는 legacy의 부분 복구
  집계는 managed strict 복구와 합치지 않는다. pending checkpoint 이전 scratch는 새 세대의 증명이 아니다.
- SQLite 사용 불가 fallback, 트랜잭션 실패, pending checkpoint, 읽기 세대 변경의 실패/재시도 경계는
  구현 전에 정한다. 원장과 다른 시점의 projection을 공개하거나 무제한 재시도하지 않는다.
- SQLite Open 불가와 Open 뒤 재구축 실패는 다르다. 기존 전자는 JSONL fallback, 후자는 Open 실패다.
  검증 전 SQLite 파일/스키마를 생성하는 것까지 기존 실패 부작용과 대조해야 하며, transaction rollback만으로
  파일 생성 부작용까지 없다고 간주하지 않는다. 전체 catalog의 무차별 swap으로 해결하지 않는다.
- 합격 반례는 뒤 행 손상/중복 ID 충돌·상태 전이·예약·참조·pin/hold·삭제·SQLite rollback/fallback·
  중단 재개방·동시 변경이다. 제품 수정 전 등록하고 작은 반례 → 누적 비교 → 실제 앱 순서로 진행한다.

이번 선행 판정으로 2번 제품 구현 또는 3~4번 실제 앱/UI/120분의 완료를 주장하지 않는다.

#### B안 구현 계약

2026-09-25 사용자가 검증된 현재 상태·증분 변경·분리된 과거 증거 구조의 순차 구현을 지시했다.
이는 현재 제품이 그 형식을 사용한다는 뜻이 아니다. 아래 계약을 단계별 구현·검증의 기준으로 둔다.

**권위와 저장 단위.** 관리 store의 기존 lease·store ID·nofollow 경계를 유지한다. 하나의 내구
manifest가 현재 세대, 확정된 현재 상태 snapshot, 쓰기 가능한 증분 원장, 불변 과거 증거 및
최소 identity/예약/삭제 색인의 소유 파일과 마지막 수용 순서를 지목한다. 불변 파일에는
정확한 길이·digest를 결박하고, 쓰기 중인 증분 원장은 게시 순간의 확정 prefix와 이후
완결 append를 구분해 검증한다.
`cutOrdinal`은 배타적 경계다. snapshot과 identity head가 반영한 물리 순서는 모두
`< cutOrdinal`, 새 active 증분은 `>= cutOrdinal`이다. 빈 기록은 cut 0을 허용하며,
세대 회전에서는 앞 세대보다 cut이 감소하지 않는다. ordinal의 연속성은 강제하지 않는다.
SQLite는 이 권위 상태의 재구축 가능한 투영이다. 별도 파일에 대한 SQLite transaction만으로
manifest·영상·증거까지 원자 확정됐다고 판정하지 않는다. 경로는 store root 안의 고정된
이름과 검증된 세대 ID로 구성하고, manifest의 임의 경로를 따라가지 않는다. 새 형식 적용 전
기존 관리 원장은 그대로 읽고 엄격 검증한다. 전환 중에는 기존 원본을 덮어쓰지 않는다.

**현재 상태 snapshot.** 활성 segment와 영상 경로·상태·보호, 이벤트 연결, 관측·참조,
작업 현재 상태와 출력 예약, source binding의 현재 요약 및 상세 위치를 보존한다. 모든 수용
mutation ID의 충돌 판정에 필요한 type/entity/time/원문 identity, request 예약의 전체 tuple와
sequence 상한, 삭제·참조 판정에 필요한 최소 증거도 보존한다. 상세를 단순 hash로 바꾸어
필요한 원문을 잃지 않는다. mutex, 열린 FD·SQLite handle, 약한 cache, 일시 wait lease와
hold count는 저장하지 않고 확정된 관계·진행 작업에서 복구한다. snapshot을 읽을 때 schema,
중복, ID/예약/참조, 길이·digest·세대 결박을 검사한 임시 투영 전체가 성공해야 공개한다.
값 형식은 첫 JSONL 행에 schema/store/generation/배타 cut/현재 세대 identity head
descriptor를 두고, 이후 현재 상태 row를 `(kind,key)` 순으로 보존한다. 기존 domain payload는
필드 순서와 원문을 임의 재정렬하지 않는다. 형식 코덱의 outer 구조 검증과 제품 복원의
domain canonical·내부 ID·참조·cold 상세 검증은 다른 경계이며 하나의 PASS로 합치지 않는다.
`mutation_ids_`와 미사용 예약은 검증된 identity chain에서 재구성한다. snapshot에는
segment-state 계열의 최초 수용 provenance와 현재 projection만 두고, `orders_v2_`를
유일한 예약 권위로 쓰거나 일시 hold count를 그대로 영속화하지 않는다.

**증분과 세대 게시.** 새로운 mutation은 현재 세대의 증분 원장에 엄격 검증·append·fsync한 뒤
현재 투영에 적용한다. 적용 또는 SQLite 투영이 실패하면 현행 쓰기를 중단하고 복구 경계를
따른다. 세대 회전은 현재 검증된 상태와 필요한 새 identity 색인 조각·과거 증거 조각을
불변 파일로 준비·fsync하고, 새 증분 파일과 디렉터리를 내구화한 뒤 단일 manifest의 원자
교체·directory fsync로 게시한다. 게시 전후 세대의 파일을 섞지 않는다. 실패나 동시 변경은
기존 세대 또는 새 세대 중 완결된 한쪽으로만 복구하고, 쓰기·재생 reader가 잡은 세대의
자료를 수명 종료 전에 회수하지 않는다. 변경 없는 과거 identity 조각과 상세 증거는 세대
회전 때 다시 직렬화하지 않는다. rename 성공 뒤 directory fsync 실패는 이전 manifest가
보존됐다고 보고하지 않고 내구 결과 불확실로 분류하여 쓰기를 중단하고 재개방한다.

**검출 시점.** 정상 append·조회·세대 회전은 변경된 증분과 필요한 cold 증거를 검증한다.
재기동은 manifest·현재 snapshot·필수 identity 색인과 증분 전체를 엄격 검증하고, 이후
변경을 임시 투영에 적용한 뒤 한꺼번에 공개한다. 사용하지 않는 과거 상세 전체의 원문 검사는
재기동의 필수 경로에서 분리한다. 해당 상세를 읽을 때 원문·digest·locator·세대를 검사하고,
명시적 전체 감사에서는 모든 과거 증거를 검사한다. 그러므로 과거 비활성 상세의 손상은
그 자료를 사용할 때 또는 전체 감사 때 처음 드러날 수 있다. manifest digest만으로
snapshot의 의미 검증이나 과거 모든 mutation 전이의 재증명을 마쳤다고 주장하지 않는다.
검증 전 자료를 재생·검색 결과·SQLite projection으로 공개하지 않는다. manifest 파일
검사만 통과한 상태는 사용 가능한 catalog가 아니며, 기존·새 active tail의 완결성과
snapshot 의미 동등성이 확인돼야 새 세대를 게시할 수 있다.

**과거 증거 참조 폐쇄.** manifest의 `evidence` 목록은 이번 세대에 새로 준비한 파일만
포함한다. 이전 자료를 매 회전마다 이 목록에 다시 나열하거나 복사하지 않는다. 현재
snapshot은 불변 최소 색인 head의 고정 이름·정확한 길이·SHA-256을 결박한다. 각 색인
조각은 이전 조각의 검증 descriptor와 이번 세대에서 확정한 mutation의 최소 identity,
예약/삭제 분류 및 상세 원문의 고정 locator·원본 파일 길이/digest를 기록한다. 조각의
이름은 `identity-<generation>.jsonl`로 세대 번호에서 결정하고, 상세 archive의
`evidence-<generation>-<slot>.jsonl`과 구분한다. 임의 경로를 따라가지 않는다. 재기동은 head부터 이전
조각의 hash·세대 순서·중복/충돌을 검증하여 최소 색인을 재구성하고, 상세 원문 자체는
사용 시 또는 전체 감사 때 확인한다. 현재 active 증분은 이 체인 밖의 미확정 tail로
엄격 검증해 이어 붙인다. 회전 시 현재 active를 확정·봉인한 descriptor와 그 변경분만
새 조각에 넣는다. 이는 이전 세대 증거를 새 manifest에 쓰지 않는 대신 필요한 영속
참조를 잃지 않기 위한 계약이다. 색인 조각·snapshot 의미 코덱과 실제 제품 연결은
아직 구현/검증되지 않았으며, 기존 helper의 `PrefixOnly` 결과로 대체하지 않는다.

**복구·호환.** 새 manifest가 없으면 기존 관리 형식의 엄격한 Open 의미를 유지한다. 전환은
기존 자료 전체를 한 번 검증하고 새 snapshot·증분·과거 증거와 독립 투영을 대조한 뒤에만
새 manifest를 게시한다. 중단되면 기존 형식으로 다시 열 수 있어야 한다. 개발 전용 구형
자료는 소유권·필요한 반례를 대조하고 보존 또는 명시적 거부를 결정하며 임의 변환하지 않는다.
SQLite Open 불가 시 새 권위 상태에서 fallback한다. SQLite Open 후 재구축 오류는 실패로
남기고 원본을 보존한다. pending finalize, pin·hold, ID 재사용 거부, 기존 시간·ID/API 의미는
변경하지 않는다.

**비용 합격 기준.** 활성 자료·이번 증분량을 고정하고 과거 상세 이력만 늘리는 비교에서
정상 저장·조회·세대 회전의 과거 상세 읽기·파싱·직렬화가 역사 크기와 함께 증가하지 않아야
한다. 재기동은 현재 상태·최소 identity 색인·이번 증분에 비례할 수 있으며, 전체 감사와
호환 전환은 과거 전체를 읽을 수 있다. RAM·disk 총량을 상수라고 주장하지 않고 각 소유자별
측정한다. HTTP 4초, 관측 간격 15초, 복구 검사 15초의 기존 판정은 변경하지 않는다.
작은 손상·충돌·중단 반례 → 누적 규모 → 실제 앱·관련 최종 검증 순서로 적용한다.

### LP24 복구 호출 내부의 제한된 내용 재사용

후속1~6 승인 중1번은 Open의 반복 preflight/apply/SQLite 재투영 내용 비용을 대상으로 한다.
아래 LP18의 신규/복구 입력 strict 검증은 **첫 입력 검증**에 그대로 적용한다. 같은 Open 안에서 엄격 검증과
상태 적용까지 통과한 불변 기록은 별도 RecoveryContentContext로 내용만 재사용할 수 있다.
기존 정상 전이의 Prepared/ContentProof를 recovery로 넘기거나 opened 상태를 거짓으로 만들지 않는다.
64항목/논리64MiB 이내, 호출 종료/실패/예외 시 전부 해제하는 admission 정책으로 무제한 O(H) typed 캐시를 금지한다.
초과·admission 할당 실패는 정상 입력 거부가 아니라 strict fallback이며 실제 heap/RSS는 별도 측정한다.
전체 envelope/payload·물리 ordinal·owner/Open 수명을 대조하고 과거 전이를 최신 상태로 치환하지 않는다.
재읽기 불일치·pending checkpoint에는 재사용을 폐기한다. 상태 전이·예약·source/삭제/보호·중복과
SQLite accepted ordinal gate는 생략하지 않는다. 새 Open은 다시 strict 검증한다.
검증된 typed 내용과 기존 serializer의 canonical을 함께 소유할 수 있지만 영속 바이트/공개API는 바꾸지 않는다.
후속 LP24-R의 동등성·손상·수명·15초 cold 진단은 구현 후 별도 판정이며 이 설계만으로 PASS가 아니다.

### LP20 공동 합격 기준과 순차 구현 경계

2026-09-20 승인 범위는 기존 증적 정리와 다음 1~4번 개발이다. 실제 HTTP/전체 통합 실행은 후속5번이며
이번 구현 PASS로 대체하지 않는다. 기존 LP19 기능742 PASS·비용 미충족은 그대로 보존한다.

1. 정상 저장은 새 변경의 엄격 검증을 유지한다. 자동 checkpoint의 무변경 경로는 journal 입력 검증과
   catalog 적용 완료를 모두 증명해야 한다. owner/attachment/세대/현재 revision에 결박되지 않은 증명,
   Open 도중·실패 Apply·raw 시험 주입으로 만들어진 입력에는 적용하지 않는다.
2. canonical 물리행·연속 위치·동일 후보·pending 없음이 입증되면 과거 내용의 재파싱·직렬화·shadow 재구성만
   생략한다. 실제 원문 전체 읽기와 SHA·FD/inode/소유/길이 확인은 유지하여 같은 크기의 변조도 거부한다.
   원문 읽기 O(H)가 남는다는 한계를 명시한다. 새 typed 전체 캐시나 영속 PASS 플래그는 만들지 않는다.
   빈줄/noncanonical/중복·receipt 전이/후보 변경/pending/crypto-off/큰 행은 적격을 입증하지 못하면
   기존 strict 경로로 복귀한다. 정상 입력을 새로 거부하거나 현재 체크포인트 주기를 늘리지 않는다.
3. 조회는 관련 후보 전체·독립 반환값·삭제 이력·wait lease를 보존한다. strict 재획득에서 이미 확인한
   같은 불변 binding의 검증을 한 호출 안에서 재사용할 수 있지만, 별도 호출/새 디스크 읽기의 검증은 생략하지 않는다.
   잠금 밖 계산을 도입하면 불변 입력의 소유권과 최종 현재 상태·보호의 원자적 검사가 먼저 필요하다.
   top-N 축소, 삭제 경쟁 허용, 오래된 값으로 성공 반환, 무제한 재시도는 불가다.
4. 통합 actual-app 종료 판정은 실제 producer의 normalExitPass/normalShutdownPass/forcedTermination/
   archiveSafe/ports와 일치시킨다. HTTP fixture의 별도 graceful 계약은 변경하지 않는다.

공동 합격은 저장 바이트/투영/복구·손상 거부와 상세 비상주를 유지하면서, 적격 자동 checkpoint의 과거
Parse/Serialize가 없어지고 조회의 중복 검증 비용이 감소하는 것이다. 작은 입력·실제2-job·누적16/32·삭제/재open
측정은 같은 조건과 독립 oracle로 대조하며 총 실행 시간·잠금·RSS·raw 읽기를 섞지 않는다.
제품 전역 RSS나 채널 수 SLO는 신설하지 않는다. 실제 HTTP는 기존4000ms를 유지하고 후속 실행으로만 판정한다.
해당 정상/오류/경계 focused 및 영향 회귀가 통과한 단위만 커밋한다. 기능 검증 실패는 수정/동일 재검증 전 다음 단계 금지다.

사용자 승인 순서는 소유/검증 계약 → 중복 보관 제거 → 정상 전이/체크포인트 중복 검증 제거 → 상세 RAM 수명 → 영향 회귀/실제 HTTP다.
기존 변경은 LP12 입력 보완, LP16 임시 수명, LP17 진단으로 먼저 분할 커밋했다. 이 절부터 새로운 제품 보완 범위다.

### 불변 값과 변경 상태의 분리

| 경계 | 공유하거나 재사용할 값 | 매번 확인할 조건 | 무효화/실패 처리 |
| --- | --- | --- | --- |
| 원장 내부 기록 | 수용 후 변경 불가능한 envelope 전체 값(모든 필드/전체 payload) | store/lease/FD/inode/owner·현재 원장 상태 | 재open/소유자 교체/원장 불확실 시 기존 전체 검사. hash만으로 동일 내용 판정하지 않음 |
| checkpoint 원본/후보/prefix | 동일 불변 기록의 읽기 전용 소유 핸들, receipt 치환 기록만 새 값 | 현재 이력과 후보의 정확한 대응, 순서·필드·변경 후보 projection 동등성 | stale 후보·충돌은 거부, 캐시 불일치는 전체 검증으로 복귀. 포인터 주소가 입력 신뢰를 만들지 않음 |
| 내용 검증 증명 | 엄격히 파싱·검증한 immutable payload와 그 typed 값의 결박 | 현재 상태 전이, 이전 작업·예약·삭제·참조·보호 조건 | 신규/변조/복구/다른 owner는 전체 내용 검증. 기존 PreparedDerivedMutation은 live 한 호출 전용이며 shadow에 전달하지 않음 |
| typed 증거 | 같은 불변 원본/Intent/Ready 내용 | 사용 소비자의 현재 lifecycle·manifest·출력 소유권·참조 닫힘 | public 반환값은 독립 값이며 외부 변경이 내부 값에 영향을 주지 않음 |
| RAM 내림 | 불변 상세 내용의 resident 소유권만 해제 | 동일 내구 기록을 다시 읽을 locator/무결성, 활성 reader/job/복구의 소유 참조 | 영구 삭제 아님. 누락/손상 시 기존 거부·degraded 정책, 빈 값/complete로 대체 금지 |

`ManagedJournalState::records`와 checkpoint 원본/후보/prefix는 우선 `shared_ptr<const RecordingMutationV1>` 기반 내부 소유로 바꾼다.
공개 `RecordingMutationV1`·`Replay()`의 값 반환 계약은 유지하고 내부 checkpoint만 소유 핸들을 사용한다.
journal 잠금 밖에서 mutable vector/string의 참조를 빌리지 않는다. 후보 준비 후 원장 append/예약/receipt 변경이 있으면
게시 시 현재 이력으로 다시 대조하여 낡은 후보가 쓰이지 않게 한다. 변경된 receipt는 원본을 수정하지 않고 새 immutable 값을 만든다.
기존 64MiB/8192 입장 계산은 공유 여부와 관계없이 논리 envelope 크기를 기준으로 유지한다.
이 첫 공유 구현은 전체 상세 RAM의 상한이나 typed 소유 통합 완료가 아니며, 남는 parsed live/shadow 소유량을 별도로 계측한다.

accepted canonical 사본도 같은 envelope 소유로 연결한다. Apply에 소유 핸들을 제공할 때 모든 필드를 대조하고,
duplicate의 전체 canonical·SQLite 최초 ordinal gate를 유지한다. managed Open의 값/핸들은 한 snapshot에서 만들며
서로 다른 시점의 원장 목록을 ordinal만으로 결합하지 않는다. 공개 Replay와 Open의 일시 값 사본은 별도 경계다.

typed binding은 먼저 내부 const 소유로 전환한다. shadow의 신규 bound 기록을 기존 규칙으로 엄격 검증한 뒤
호출 동안 제공된 live 풀의 같은 ID와 canonical 전체를 대조해 같은 소유를 선택한다. checkpoint마다 전체 binding map을
재직렬화하는 후처리는 추가하지 않는다. null/부적합 풀은 독립 엄격 경로로 복귀하며 raw owner를 shadow에 저장하지 않는다.
public 조회·Snapshot은 독립 값, deleted binding은 역사 증거로 보존한다. 이 단계는 내용 검증 생략이나 RAM 내림이 아니다.

typed job은 현재 상태 하나만 const 소유로 보관하고 Prepared의 prior/검증후 후보/applied를 owned handle로 구분한다.
검증후 후보는 같은 mutex 호출에서 한 번 게시하며 SQL projection 종료까지 수명을 보유한다. 이전 record 소유는 현재 map 슬롯을
가리키는 raw 주소가 아니라 불변 값이다. owner/phase/payload/current prior/state/files 조건은 계속 검사한다.
shadow는 자신의 전체 parse/전이 검증을 통과한 **해당 기록**만 live의 같은 job ID/canonical 최종값과 대조해 공유한다.
과거 Files/Ready 입력을 현재 Complete 값으로 치환하지 않고, 전체 이력의 typed proof를 새로 축적하지 않는다.
활성 보호/retention·Complete의 출력 소유/Ready/provenance·timeline 소비와 public 값 독립성을 유지한다.

내용 검증 재사용은 현재 live catalog가 정상이라는 사실만으로 shadow 전체를 신뢰하는 최적화가 아니다.
내용 증명과 상태 전이 검증을 구분하며, shadow의 다른 prior state·예약·tombstone도 항상 검사한다.
증명은 영속 PASS 플래그로 저장하지 않는다. O(H) 전체 typed 증명 캐시를 추가하는 방식도 채택하지 않는다.

3번 첫 재사용 단위는 정상 `UpdateDerivedJob`의 Prepared strict 파싱과 성공한 append/apply 뒤 mint한 호출-local 내용 증명이다.
증명은 live owner와 실제 append의 불변 envelope·게시된 const record를 결박한다. 해당 owner/journal·현재 job·수용 envelope·
전체 입력 필드/payload가 같은 경우에만 같은 호출의 자동 checkpoint에서 내용 Parse를 재사용한다. 주소만 같은 임의 입력은 신뢰하지 않는다.
shadow의 Intent/receipt/Ready 동등성·현재 상태·source lifecycle/예약 검사는 그대로 수행하며 live Prepared의 상태검증 결과는 넘기지 않는다.
증명은 SQL/자동 checkpoint까지 owned lifetime을 유지하지만 shadow/cache에 저장하지 않는다. manual/recovery checkpoint·새 입력·다른 owner·
stale/mismatch·과거 이력은 strict fallback이다. 이것만으로 과거 이력 전수 처리나 모든 직렬화 비용이 없어졌다고 판정하지 않는다.
증명 생성자는 catalog 내부에 봉인한다. 적격 판정에서 다시 전체 Serialize/Validate를 수행하지 않으며,
성공한 strict Prepared 적용에서 생성한 불변 값의 출처와 전체 envelope 결박을 검사한다. 검사 복제본의 접근 노출은 제품 API가 아니다.

envelope 비교는 semantic 검증과 구분한다. serializer의 출력이 고정 schema/enum 이름을 쓰는 점을 고려해
SameSequence는 기록 수·순서·null·schema/type/id/entity/time/payload 전체값으로 판정한다. canonical 임시 생성은 하지 않는다.
CommitCheckpoint는 잠금 안의 현재 원장으로 재구성한 expected와 후보 전체값이 같은지 먼저 확인하고,
동일 expected bytes 한 개만 pending-prefix·크기 판단·write/fsync/rename에 사용한다. 원자게시/poison/상한은 유지한다.

Intent의 내부 반복은 `recording_derived_job_context.h`의 구현 전용 context로 분리한다. 최초 엄격 검사에서 얻은
선택 복원값과 상한 검사한 canonical을 호출 안에서 소유하며 입력 Intent는 마지막 소비까지 불변이다.
새 입력과 옛 context를 조합하는 소비 API는 없고, RecordContext는 자기 record의 Intent만 분석한다.
Parse는 지역 Intent를 채운 뒤 strict/canonical 검사를 하고 public out 이동 후 context를 소비하지 않는다.
BuildReady는 shape→selection 순서를 유지하고 확정된 지역 Intent 이외의 ready/state만 채운다.
모든 공개 호출은 새 strict 분석을 수행하며 manifest·receipt·AU·native·coverage·unfulfilled 검사와 오류/출력 초기화를 유지한다.
이 context는 상주 캐시나 과거 상태 증명이 아니며 catalog의 별도 상태 비교 호출까지 자동으로 없애지는 않는다.

전이의 duplicate 비교는 incoming의 엄격 검사 뒤에만 좁힌다. state 또는 files 개수가 다르면 같은 canonical Record일 수 없으므로
동등 비교를 위한 Record 생성만 생략하고 기존 상태·receipt·Ready·source/예약 검사를 계속한다.
Apply의 incoming은 strict Parse canonical equality 또는 봉인 proof의 exact payload 결박을 통과한 문자열을 재사용한다.
동일 shape의 prior와 pool 후보는 기존 전체 canonical 비교를 유지하고, 불변 Intent 대조를 shape 검사로 대체하지 않는다.

불변 Intent 대조에서는 incoming strict Parse/proof와 현재 prior의 검증된 게시 경계를 통과한 뒤에만
catalog 전용 호출-local canonical을 만든다. 기존 Json formatter·4MiB 상한·전체 문자열 동등성은 유지하고,
동일 내용의 Validate/Restore만 반복하지 않는다. 생성자는 catalog에만 허용하며 새 입력을 받는 재사용 메서드,
외부/Prepared/cache 보관은 없다. 생성 실패/빈 값은 동등으로 취급하지 않는다. 공개 Serialize/Parse는 항상 strict다.
prior의 신뢰는 shared_ptr 주소가 아니라 strict Apply/Prepared 게시 경로에서 성립한다. 임의로 private map에
삽입한 미검증 fixture 값의 유효성을 보장하는 계약으로 확대하지 않는다. source binding 등 하위 serializer는 유지한다.

### RAM 수명 구현의 소비자 경계

terminal Complete 작업도 `MediaV2EligibleLocked`가 출력의 유일 소유자·Ready·manifest·AU provenance를 검사한다.
deleted binding도 `SnapshotDerivedSourcesLocked`의 삭제 이력·관련 구간 판정에 쓰인다. terminal/deleted를 이유로 지우지 않는다.
따라서 journal 상세, live typed 값, checkpoint shadow 모두에 내구 locator 기반 재획득 경로와 얇은 identity/검색/보호 색인이 필요하다.
locator는 같은 저장소의 기존 JSONL 기록을 가리키며 새 영속 형식·SQLite 필수화·대체 임시 원장을 도입하지 않는다.
checkpoint 파일 교체 시 기존 reader의 FD/불변 값 수명은 보존하고 새 게시 세대와 혼동하지 않는다. 재open은 전체 입력을 엄격히 검사하되
종료 후 모든 상세 typed 값이 상주 상태로 복원되지 않아야 한다. 구체 locator/eviction 구현은 4번 착수 시 소비자별로 연결하고 반례를 먼저 등록한다.
활성 작업 수·reader 반환량에 따른 필요한 메모리와 비활성 이력 누적 보관량을 구분하며, 제품 RSS 수치를 임의 선정하지 않는다.

### 단계 합격 경계

#### 자동 해제까지의 내부 참조 연결 순서

물리 위치와 논리 기록 참조를 구분한다. journal이 봉인해 생성한 논리 참조는 저장소 수명 lineage와
물리 행 ordinal을 식별하며 payload·raw owner·옛 FD를 붙잡지 않는다. checkpoint가 같은 위치의 원본/게시값을
전체 필드로 대조해 동일한 경우에만 참조를 유지한다. receipt 치환은 새 참조이며 이전 참조가 새 내용을 읽어서는 안 된다.
참조 획득은 현재 원장 소유권·현재 참조표·현재 위치의 strict 읽기를 거친다. 주소/hash만으로 외부 입력을 신뢰하지 않는다.
교체될 참조표는 rename 전에 준비하고 성공 뒤에는 할당 없이 함께 게시한다. 이 기반 자체는 자동 해제 완료가 아니다.

후속 소비 연결은 다음 경계를 닫은 뒤에만 자동으로 resident를 내린다.

- accepted/prefix의 기록 참조는 같은 Read/Append snapshot에서 실제 envelope와 결박한다. 별도 시점 목록의 ordinal을
  임의로 맞추지 않는다. 내용이 같은 봉인 참조의 출처를 입증하지 못하면 전체값 대조/기존 resident 경로로 복귀한다.
  duplicate 전체값·SQLite ordinal·cache 논리64MiB/8192 기준은 유지한다.
- shadow는 raw catalog owner를 저장하지 않는다. 필요 시 journal의 현재 attachment에 결박된 읽기 capability를
  사용하고 detach/reopen 뒤에는 무효다. caller owned 값은 capability가 끝나도 독립 수명을 갖는다.
- binding의 channel/source/generation/order/track 및 job의 channel/reference/state/output·활성 보호 색인을
  상세 samples/Intent/Ready와 분리한다. 무관한 행을 필터링하기 위해 상세를 전수 재획득하지 않는다.
  public 전체 snapshot처럼 호출 자체가 전체 값을 요구하는 경우만 일시 전체 materialization을 허용한다.
- 활성 job·Prepared·반환 reader는 strong 소유를 유지한다. Complete/Failed·삭제 binding은 필요한 내구 증거를
  없애지 않고 상세의 RAM 소유만 해제한다. live와 retained shadow를 함께 적용해야 한다.
- cold 읽기 오류는 정상적인 부재와 구별해 내부 실패/불확실 상태로 남긴다. bool/error 조회는 실패와 빈 out,
  optional 조회는 값 없음과 원장 불확실을 유지한다. 보호 판정은 보수적으로 유지하고 투영 비교의 빈 값끼리 같음을
  성공으로 처리하지 않는다. 공개 API/JSON 형식은 바꾸지 않는다.
- Open의 전체 strict 검증과 SQLite fallback/재구축은 유지한다. 성공 종료 뒤 비활성 상세가 계속 상주하지 않아야
  하며 전체 replay의 일시 peak와 정상 운용 보관량은 별도 측정한다. crypto-off/대형 행은 기존 resident fallback이다.

아래 소비 구현과 active reader·변조·삭제·재open·선택 조회 재획득 수 반례 및 관련 단기 회귀는
2026-09-20 중앙 LP18 기록에서 완료했다. 누적 메모리 수치와 실제 HTTP 합격은 별도 판정이며 설계/단기 PASS로 주장하지 않는다.

첫 소비 단위는 accepted/prefix다. journal 내부 sealed owned view 하나로 같은 Append/Read mutex 안의
envelope·논리ref·attachment를 결박한다. catalog는 view의 전체값과 입력이 같을 때만 thin link를 추출한다.
view 자체를 보관하지 않고 논리ref/attachment/weak envelope만 남긴다. 신규 view 없는 raw/legacy 입력은 기존
resident fallback이며, 제공된 view가 다른 입력/owner라면 등록 전에 실패한다. ref와 값을 임의 tuple로 조합하지 않는다.
Append retry는 새로운 view 없이 기존 원본 반환을 유지할 수 있다. 특히 receipt 교체 뒤 원본 EventLink 반환을
receipt ref와 결박하지 않는다. 정상 duplicate는 기존 accepted thin entry를 fallback으로 덮어쓰지 않는다.
prefix는 현재 sealed snapshot과 같은 불변 ref의 검증된 계보를 이용해 현재 owned 값을 소비할 수 있지만,
외부 candidate 전체 필드·projection 비교와 accepted duplicate의 전체 canonical 비교는 생략하지 않는다.
authority/ref 불일치는 cache full fallback, 실제 cold 변조/I/O 오류는 fail-closed다. 변경 receipt는 작은 resident
fallback으로 유지할 수 있다. 이 단위에서는 typed 상세와 자동 journal 해제를 아직 바꾸지 않는다.

다음 소비 단위는 typed binding/job과 자동 해제를 함께 연결한다. 얇은 entry는 같은 엄격 Apply에서
생성한 검색·보호 metadata, sealed mutation link, weak typed 값과 필요한 strong resident만 보관한다.
작업 상태/출력·원본 ID/예약량과 binding의 channel/source/generation/order/track은 상세를 읽기 전에
대상을 좁히는 데만 쓴다. 새 외부 입력의 검증 증명이 아니며 cold 획득은 현재 원장 strict 읽기 후
typed Parse·원래 segment 결박·metadata 일치를 확인한다. warm 공유 후보만 기존 pool에서 재사용한다.
raw owner나 이전 FD를 entry에 넣지 않고 포인터 반환/암묵적 역참조 대신 호출-local owned 값을 사용한다.

활성 live 작업과 Prepared/반환 reader는 strong 수명을 유지한다. 이전 checkpoint shadow의 작업도
같은 ID의 live 작업이 현재 활성인 동안만 resident로 유지하며, live가 terminal로 바뀌면 양쪽의
비활성 상세를 내린다. binding은 삭제 이력까지 재획득 가능해야 한다. durable 참조가 없는 raw 입력과
crypto-off/대형 행의 fallback은 그대로 resident를 유지한다. 내구 내용 삭제·변환이나 새 입력 상한은 없다.
정상 append는 SQL/자동 checkpoint 성공 뒤 변경 entry만 처리한다. Open/새 checkpoint의 sweep과
매 append의 처리를 구분하며, journal 해제도 현재 세대의 신규 suffix만 방문해 과거 행 전체를 반복하지 않는다.
checkpoint 교체는 해제 cursor를 새 세대로 재설정하고 이전 reader 소유는 유지한다.

선택 조회는 thin metadata로 먼저 필터링하고 선택된 상세만 읽는다. 공개 전체 snapshot의 일시 값 사본은
허용하지만 조회가 cache를 자동 재가열하지 않는다. cold 오류는 catalog 불확실 상태로 유지하고
보호는 보수적으로 처리한다. 조회 출력은 초기화하고 projection 실패/빈 직렬화는 동등한 정상값이 아니다.
일반 Apply/projection 예외는 기존 unwind·cache 폐기·full 재시도 계약을 유지한다. 실제 cold 획득 실패로
불확실해진 shadow만 live로 전파하고 false로 닫으며, 정상 조회 상한 실패를 catalog 손상으로 취급하지 않는다.
Open의 strict replay·SQLite 재구축/fallback 후 비활성 resident를 해제하되, Open 중 일시 peak까지
없어졌다고 주장하지 않는다. 얇은 entry와 fallback의 실제 보관량도 계측에 포함한다.
이 계약의 구현 PASS와 누적16/32·실제 HTTP/하드웨어 영향·S11 최종 검증 완료는 별개다.

#### 4번 첫 단위: 기존 JSONL 위치 재획득

구현 상태: 위치 재획득 자체 반례와 승인된 SW writer 영향 회귀, service/2-job를 통과해 primitive 단위를 마감한다.
후속 동일 파일 재현은 WR01/WR05의 vtdec_hw 입력/출력 프레임 감소와 SW 정상 대조를 확인했다.
검증 분리는 사용자 승인 후 명시 SW/전체PTS/오류거부로 구현해 순수14·실제46개를 통과했다.
service43·2job 기능120/계측1도 통과했지만 하드웨어 내부 세부 원인·제품 영향은 미확정이다. 저장 계약 수정 근거로 확대하지 않는다.
이 절은 안전 계약이지4번 완료 판정이 아니다. 상세 결과는 중앙 LP18 기록을 따른다.

공개 API/영속 형식은 바꾸지 않는다. journal 전용 opaque location은 물리 행마다 세대 소유 식별,
ordinal·offset·실제 LF 포함 길이·raw SHA와 parsed envelope metadata/canonical identity를 보유한다.
빈 줄도 offset에는 포함하고 동일 ID 반복 행은 순서/개수를 유지한다. 비정규 공백/필드 순서의 기존 수용을 유지한다.
Load/새 Append/Reserve/실제 checkpoint 교체에서만 위치를 생성하며 retry는 위치를 늘리지 않는다.
checkpoint 위치는 같은 한 번의 JournalBytes 생성으로 얻은 span에서 교체 전에 준비하고, rename/디렉터리 fsync 후
FD/inode/bytes와 함께 게시한다. no-write/recover-only는 기존 세대를 유지한다. old generation은 현재 FD에 재해석하지 않는다.

private `ReadRecordLocations`/`AcquireLocatedRecord`는 owner/PID·lease·parent/FD/inode·현재 크기와 세대를 먼저
검사한다. 기존 16MiB 행 경계 안에서 bounded pread 후 raw hash·strict Parse·metadata/내용 결박·읽기 후 FD 상태를
검사한다. 같은 inode/길이 변조도 **읽은 행**에서 탐지한다. 전수 파일 감사를 한 것으로 확대하지 않는다.
null/다른 owner/다른 journal/stale token은 거부만 하고, 실제 읽기/변조 불확실은 poison 경계를 따른다. 실패 out은 비운다.
이미 반환한 const 값은 원장 교체 뒤에도 소유자가 놓을 때까지 살아 있다. 외부 값 반환은 여전히 독립 값이다.
crypto-off 또는 기존 Append가 수용한 16MiB 초과 행은 새로 거부하지 않고 resident 경로를 유지한다.
그 예외에서 RAM 해제나 파일 본문 재검증까지 됐다고 주장하지 않는다.

이 단위는 location 기반만 연결한다. 기존 journal 강한 소유 및 typed/cache 소유 해제는 후속 연결 전까지 유지한다.
따라서 locator의 자체 PASS는 RAM 상주 개선이나4번 전체 완료가 아니다. 다음 소비 연결 때는 checkpoint 교체 후
유효한 새 위치 재결박, 활성 owned reader 보호, cold lookup 실패 전달을 함께 검증해야 한다.

#### 4번 다음 단위: resident 없는 위치 재획득

위치 primitive 커밋은 `229d82a5`다. 자동 해제에 앞서 private 명시 해제/재획득을 독립 검증한다.
해제는 owner/원장 상태를 확인한 뒤 재읽기 가능한 행의 journal 강한 참조만 놓는다. 내구 행·ID·위치·순서와
crypto-off/기존16MiB초과 resident fallback은 유지한다. 이미 반환한 owned reader를 강제로 무효화하지 않는다.
resident가 없으면 trusted 위치의 raw LF 포함 SHA·strict envelope Parse·전체 metadata·canonical identity와
읽기 전후 FD/owner/세대를 검사해 새 const owned 값을 만든다. resident가 있으면 기존 전체 payload 대조도 유지한다.
실제 누락/손상·읽기 불확실은 빈 정상값으로 대체하지 않고 outclear/poison 경계로 전달한다.
Replay/ReadCheckpointRecords/Prepare/Commit도 같은 lock 아래 필요한 cold 행을 재획득해 기존 반환·후보 의미를 유지한다.
일시 조회가 상세를 무조건 다시 상주시키지 않아야 하며, 위치/owned 수명은 no-write/recover-only/실제 교체별로 검사한다.
이 단계에는 제품의 자동 해제 호출을 아직 연결하지 않는다. journal primitive만으로 accepted/prefix/live/shadow
전체 보관 수명 완료라고 주장하지 않으며 다음 소비 연결·비활성 해제·재open 검증까지 별도로 마쳐야 한다.

#### 자동 내림 전의 호출-local checkpoint 원본

`86131a3b`는 명시 해제/재획득 기반이다. cold 원본을 Read→Prepare→Commit마다 다시 읽지 않도록
private opaque snapshot이 한 호출 동안 검증된 immutable 원본을 소유한다. snapshot은 원장·catalog attachment
고유 토큰·PID·물리 세대·현재 bytes/순서 개수를 결박한다. 같은 owner 주소로 재attach해도 이전 증명은 재사용하지 않는다.
Prepare/Commit의 매번 owner/lease/FD 상태 검사와 전체 후보 필드 대조·semantic projection·원자 쓰기는 유지한다.
부적격/null/다른 journal/append·예약·교체 뒤 snapshot은 현재 원장의 기존 strict 경로로 복귀한다.
후보가 낡았으면 기존 후보 대조에서 거부한다. snapshot을 cache/live 상태나 영속 PASS로 보관하지 않는다.
공개 값이나 반환 vector 변경이 봉인된 원본을 바꾸지 않으며, 명시 위치 재획득은 실제 행을 계속 재검사한다.
등록한 counter로 cold 행 읽기 수와 source/bytes·예외·재소유 반례를 대조한다. 구현/실행 전이면 PASS가 아니다.

1. 계약: 위 소유/검증/무효화/소비자 경계와 실행 순서가 기존 불변 계약과 일치한다. 문서 PASS는 제품 PASS가 아니다.
2. 중복 보관: 불변 alias 공유 및 외부 반환값 독립성, receipt 원본 보존, 후보 경쟁/충돌/상한 검사를 통과한다. typed/상세 잔존을 숨기지 않는다.
3. 검증 재사용: 실제 큰 job 전이에 동일 내용 파싱·검증이 반복되지 않으며 잘못된 재사용·불법 전이·손상은 기존대로 거부된다.
4. RAM 수명: 활성 참조/복구를 보호하면서 삭제·재open 뒤 비활성 상세가 자동으로 모두 상주하지 않는다. 재획득 비용도 기록한다.
5. 최종 단기: 작은 입력 → 실제2-job →16/32 원본·삭제/재개방 → 실제 앱 HTTP4000ms. 저장·복구 의미와 정리 모두 확인한다.
각 구현/회귀 통과 후 분할 커밋한다. 이번 푸시·장시간/UI는 실행하지 않는다.

## 1. 판정 대상과 범위

| 대상 | 고정 기준 | 사용하면 안 되는 해석 |
| --- | --- | --- |
| 실제 HTTP | 기존 단기 검사 4000ms, 동일 요청·잠금 소유·job 참조 상관관계 | 독립 비용 감소만으로 실제 HTTP PASS |
| 제품 의미·내구성 | 시간/ID/파일 결박, 상태 전이, 손상 거부, 원자 확정, SQLite/JSONL 복구 동등성 | 빠른 처리 때문에 검증 생략 |
| 기존 LP16 검사 RSS | 536870912B 초과 이력은 그대로 FAIL 보존 | 기존 제품 전역 RSS 요구사항으로 소급 적용 |
| 제품 정량 자원 예산 | 미선정. 채널·보존량·활성 작업·증거 크기·배포 환경을 명시한 뒤 선정 | 임의 전역 512MiB·처리량 수치 추가 |
| 기존 캐시 입장 | prefix 계산 64MiB/8192 records 유지 | shadow·allocator·전체 RSS도 이 상한 안이라는 주장 |
| 진단 실행 자원 | 컴파일60초, 검사 프로세스180초, 소유 디스크512MiB, 출력2MiB 유지 | 디스크 상한을 RSS와 혼용하거나 timeout을 성능 PASS로 사용 |

LP17은 RSS 수치를 관측·원인 구분하는 계약과 진단이다. LP16 검증기의 상한/판정 코드는 바꾸지 않는다.
새 진단을 구현할 때도 `기존 RSS 기준 충족 여부`, `관측의 유효성`, `기능 동등성`을 별도 결과로 남긴다.
512MiB 초과를 성공으로 이름만 바꾸지 않으며, 실제 앱의 선수조건을 조용히 제거하지 않는다.
선수관계 조정은 실행 계획에서 명시적으로 확정해야 하고 이번에는 실제 앱을 실행하지 않는다.
기존 RSS 결과가 false인 유효 관측을 얻는 것과 진단 자체가 실패하는 것은 다르다. 비교의 진행 조건은
구현계획 LP17에서 따로 정의한다. 이는 LP16의 FAIL을 PASS로 바꾸거나 제품 운용 예산을 선정한 것이 아니다.

### 직접 확인과 미확정

- LP14 실제 HTTP 실패는 같은 catalog 잠금의 긴 점유와 연결됐다. 이후 캐시 구현의 실제 HTTP 효과는 미확인이다.
- 최신 scale 기록에서 commit32회 모두 자동 checkpoint, candidate.identical 및 noWrite32회였다.
  이것은 해당 원본 누적 fixture의 사실이며 이벤트 이력 압축까지 항상 무효라는 뜻은 아니다.
- `ManagedJournalState::records`, live catalog, checkpoint prefix/shadow, 테스트 `outputs`/snapshot은 별도 소유다.
- `CompactRecords`는 현재 과거 EventLinkCreated를 receipt로 치환한다. 녹화 상세 증거 전체의 보관 수명을 제한하지 않는다.
- SegmentV2Deleted 적용은 tombstone과 hold 해제를 수행하나 해당 source binding을 회수하지 않는다.
  영상 quota가 전체 메타데이터 크기의 상한이라는 보장은 없다. 당장 임의 삭제하라는 결론은 아니다.
- 650MiB 중 각 소유자의 기여, allocator 잔류, 누수 여부와 LP15 캐시 도입 전 대비 증가는 미확정이다.
- LP16 수명 보완은 회귀 통과지만 단일 전후 RSS 차이로 효과를 확정하지 않는다. 미커밋 변경을 임의 폐기하지 않는다.

## 2. 구현 시 유지할 불변 조건

1. 공개 API/event/SSE/WS, 시간·ID·순서, partial/complete 판정, 미디어 바이트와 pin/hold 정책을 변경하지 않는다.
2. JSONL의 내구 권한과 SQLite의 재구축 가능성, SQLite 미사용 fallback을 유지한다.
   단순 메모리 절약을 이유로 SQLite를 필수 의존성으로 만들지 않는다.
3. 신규 입력·디스크에서 읽은 증거·복구 입력은 원래의 엄격한 검증을 통과해야 한다.
4. 이미 검증한 불변 값의 재사용은 같은 owner/내용/세대/전이 조건을 입증한 경우에만 허용한다.
   ID·파일 크기·hash 단독이나 live catalog가 존재한다는 이유만으로 검증을 생략하지 않는다.
   캐시 부적합은 재사용을 거부하고 원래 전체 검증으로 돌아갈 조건이지 정상 입력까지 거부할 이유가 아니다.
   실제 입력 충돌·손상은 전체 검증에서도 기존대로 거부한다.
5. 영속화 전 실패는 성공으로 공개하지 않는다. commit 실패·불확실 fsync·잘못된 후보·손상은 기존 거부/복구 의미를 유지한다.
6. 삭제와 재생·작업의 경쟁에서는 잠금 또는 동등한 원자적 참조 획득으로 보호한다. 해제한 원본을 늦게 참조하지 않는다.
7. 현재 미커밋 AVC 수집 보완과 catalog 수명 보완은 별개다. 어느 하나의 PASS를 다른 하나의 완료로 대체하지 않는다.

## 3. 채택할 구조 방향과 제외할 단기 우회

### 변경 처리와 전체 복구 검증 분리

정상 쓰기는 이번 변경과 그 변경이 참조하는 검증된 상태를 처리하는 경로로 설계한다.
전체 과거 이력의 재구성은 Open/복구/무효화 또는 명시적 checkpoint 구성 경계에서 수행한다.
정상 변경마다 이력 전체에 비례하는 깊은 복사·파싱·직렬화를 catalog 조회 잠금 안에서 반복하는 구조는
최종 보완의 완료 상태로 채택하지 않는다. 이력 길이를 H, 이번 변경량을 D라 할 때 D가 같은데
H만 증가하는 비용을 따로 보고한다. 전체 시스템 상수 시간이나 복구 O(1)을 약속하지 않는다.

불변 증거는 메모리에서 소유권이 명확한 한 값으로 공유하고, 작업 상태와 변경 가능한 참조/lease는 분리한다.
영속 바이트를 유지하는 내부 공유와 재사용을 먼저 검토한다. 파생 작업의 원본 증거를 영속 참조로 정규화하거나
새 checkpoint 형식을 만드는 것은 별도 저장 포맷 설계 대상이다. 이번 문서만으로 그 변경을 승인하지 않는다.

### checkpoint 경계

- no-op도 소유권·원장 무결성·pending 복구·상태 전이의 안전 경계를 통과해야 한다.
- 실제 변경이 없음을 이미 검증한 동일 세대/불변 내용으로 입증할 수 있을 때만 재구성 생략을 허용한다.
- 무거운 후보 구성과 짧은 게시 경계를 분리할 경우, 후보가 참조한 세대와 게시 시 세대의 일치를 다시 확인한다.
  그 사이 append/삭제가 있으면 낡은 후보로 덮어쓰지 않는다. 재시도도 무제한으로 반복하지 않는다.
- 이전 또는 새 일관된 상태 중 하나로 복구돼야 한다. half-published 상태나 SQLite만의 성공은 인정하지 않는다.
- 캐시를 끄는 것은 비교용 대조군이지 제품 해결안이 아니다. 상한 초과 fallback의 비용도 숨기지 않는다.
- 단순 checkpoint 주기 연장·HTTP timeout 확대·잠금만 다른 스레드로 이동하는 방법은 완료 조건을 충족하지 않는다.

## 4. 데이터별 보관·회수 계약

| 데이터 | 필요한 동안 | 메모리 내림/영구 회수 조건 | 반드시 남길 근거 |
| --- | --- | --- | --- |
| 불변 원본·파일 대응 상세 증거 | 보존 미디어, 활성/복구 중 작업, lease·재생 보호의 해석 의무가 있는 동안 | RAM 내림은 검증 가능한 내구 원본·안전한 재획득이 있으면 가능; 영구 삭제는 상세 증거 의무 종료를 별도로 입증 | 재생 가능 여부, identity·무결성·참조 해결 근거 |
| 작업 Intent/Files/Ready/Committed | 진행 중 및 crash recovery/cleanup가 필요한 동안 | Complete/Failed만으로 즉시 회수 금지; 출력·보호·정리·idempotency 의무 종료 확인 | 요청 identity, 최종 판정, 출력 연결, 미충족 사유, 재접수 충돌 판단 |
| 삭제/변이 영수증·순서 정보 | ID 재사용·중복 전이·후속 참조를 판단해야 하는 동안 | 작은 내구 색인으로 분리 가능, 보존기간 임의 설정 금지 | tombstone 의미, sequence 단조성, payload 충돌 거부에 충분한 증명 |
| 재생·작업 보호 | 실제 reader/job/복구 의무가 소유한 동안 | 성공·취소·오류의 exact owner 해제, 복구 의무는 영속 기준 | 이중 해제·회수 중 사용 방지 |
| 캐시·파싱 projection | 동일 owner/내용/세대가 유효하고 정해진 예산 내인 동안 | eviction 가능하되 원본을 잃지 않고 동일 판정으로 재구성 | 무효화 경계·resident 비용·fallback 비용 |
| 테스트 기대값 | 해당 oracle 비교가 끝날 때까지 | 원본 불변을 확인한 독립 canonical 저장과 필요 부분 읽기로 대체 가능 | 원래 검사와 바이트/의미 동등성, 원출력·hash |

메모리 내림과 영구 삭제는 다른 동작이다. 사용 중인 reader가 가진 불변 값은 해제하지 않으며,
내린 값을 다시 얻을 때에는 동일 저장소·대상·세대 확인, 필요한 검증과 삭제 경쟁 보호를 거친다.
재획득 비용도 측정하므로 단순히 RAM 밖으로 옮겼다는 이유로 지연 문제가 해결됐다고 하지 않는다.

상세 증거의 참조 폐쇄 집합은 직접 pin/hold뿐 아니라 대기 lease, 작업 sources/outputs, 재생 중 reader,
pending finalize/삭제/복구 및 event/analysis/consumer의 **실제 재생·검증·복구 의무**를 포함한다.
살아 있는 미디어의 해석 의무가 있으면 RAM 밖에서도 상세 증거를 유지해야 한다.
반면 이미 삭제된 영상의 ID·삭제 사유를 설명하는 역사 참조는 반드시 상세 프레임 증거를 요구하는 참조와 구분한다.
그러나 어떤 참조가 최소 영수증만으로 충분한지는 각 소비자와 복구/중복 판정 계약으로 입증해야 하며,
단순히 terminal 상태이거나 오래됐다는 이유로 역사 참조를 무시하지 않는다. 해석 불가를 silently 성공 처리하지 않는다.
작은 삭제 증거까지 전체 디스크 사용이 상수라는 주장은 하지 않는다. 그 용량 정책도 명시적으로 선정해야 한다.

**현재 형식에서는 회수해도 안전한 내구 증명이 아직 구현되지 않았다.** 따라서 이 계약을 근거로
기존 JSONL 기록·source binding·tombstone·개발 데이터를 즉시 지우거나 포맷을 억지 변환하지 않는다.

## 5. 구현 수단 선택과 미확정 경계

| 결정 | 채택/보류 | 이유 |
| --- | --- | --- |
| 검증된 불변 값의 명시적 소유·재사용, 변경 처리/복구 분리 | 채택할 설계 기준 | 복사와 재검증 비용의 원인에 직접 대응 |
| active 상태와 cold 증거/삭제 색인 분리 | 채택할 수명 기준, 구체 저장 구현 보류 | 상시녹화 누적과 안전 회수를 함께 다뤄야 함 |
| 새 DB·외부 서비스·새 저장 프로토콜 | 미선정·이번 비범위 | 기존 optional SQLite/JSONL 내 대안부터 대조 |
| 캐시 total 예산·제품 RSS/지원 부하 수치 | 미선정 | prefix64MiB 또는 테스트512MiB를 근거 없이 전용하지 않음 |
| 영속 참조 정규화·새 snapshot 세대/파일 형식 | 별도 상세 설계 필요 | byte 호환·fallback·복구·손상 검증 계약 영향 |

이번 3번은 위 **안전·수명·비용 방향의 계약**을 고정한다. 세부 구현 수단과 정량 예산까지
선정 완료한 것으로 보고하지 않는다. 비교 증거 없이 확정할 수 없는 항목은 다음 제품 구현의 진입 조건으로 남긴다.
외부 코드/새 기술을 채택한다면 기존 Apache-2.0·출처·IP 검토 원칙을 적용한다. 이번에는 외부 코드 반입이 없다.

### LP26-R02 삭제 bound 행의 가역 물리 표현

위 수명 계약의 영구 삭제 조건은 아직 충족되지 않았다. 따라서 이번 S11 보완은
상세 프레임/파일 증거를 지우는 최소 영수증으로 승격하지 않는다. 대신 삭제가
확정된 `SegmentV2BoundFinalized` 한 행의 **물리 표현만** checkpoint에서
`media-server.recording-compressed-mutation.v1`로 바꿀 수 있다. 독립 파일이나
SQLite 필수화 없이 기존 JSONL 한 행·동일 위치·동일 mutation ID와 순서를 유지한다.
압축 전 논리 envelope는 변경하지 않으며 공개 serializer·Replay·catalog·consumer는
항상 검증 후 원문을 본다. 예전 원장은 그대로 열 수 있다. 더 커지는 입력은 기존 행으로
유지한다. 원자 checkpoint와 pending 복구는 기존 경계를 쓴다.

물리 행은 codec, 논리 길이(16MiB 이하), CRC32, 정규 base64의 zlib 압축 본문만
포함한다. 복원은 제한된 크기의 버퍼에서 수행하고 원래 mutation schema·정규
직렬화·bound type까지 재검증한다. 원문/압축문 손상, 길이·CRC·base64·중첩 wrapper
불일치와 기존 ID/순서/참조 충돌은 거부한다. CRC는 우발 손상 검출이며 암호학적
서명은 아니다. managed crypto가 있는 위치 검증의 SHA-256 경계는 그대로 유지한다.
이 형식은 영구 데이터 폐기나 디스크 총량 상수 보장이 아니다. SQLite의 삭제된
binding 투영 중복 제거는 LP26-R01로 분리하고, 기존 SQLite 파일의 물리 회수와
120분 상한/잠금·복구 비용은 LP26-R02 통과 후 별도 실측한다. 직접 링크 검증기와
제품 모두 zlib을 필수로 결박해 다른 PC에서 읽기 기능이 달라지지 않게 한다.

## 6. 계약의 반례와 구현 완료 증거

| ID | 반례/대상 | 합격 기준 |
| --- | --- | --- |
| LP17-C01 | 같은 ID지만 내용/owner/세대가 다른 재사용 | 부적합 캐시는 폐기·전체 검증으로 복귀; 정상 입력은 같은 결과, 실제 충돌·손상은 기존대로 거부 |
| LP17-C02 | no-op checkpoint와 pending 복구 동시 존재 | pending 내구 의무를 생략하지 않음, 잘못된 후보는 거부 |
| LP17-C03 | 후보 구성 중 append/삭제·재시작·중간 I/O 실패 | 원장 유실·낡은 상태 덮어쓰기 없이 이전/새 일관 상태로 복구 |
| LP17-C04 | RAM 내림/재획득과 활성 job/lease/reader/복구·역사 참조 | 사용 중 값·내구 상세 의무를 보존; 역사 영수증만으로 충분함을 입증한 대상만 영구 회수, tombstone 의미 유지 |
| LP17-C05 | journal/SQLite/cold 증거 손상·누락·fallback | 실제 증거 없는 complete 금지, 기존 거부·degraded 정책 유지 |
| LP17-C06 | 같은 활성량·반복 보존 삭제에도 과거 이력 증가 | 상세 resident/처리 비용과 최소 역사 증거 비용 분리; 숨은 무제한 보관 여부 판정 |
| LP17-C07 | 캐시 예산 경계·초과·eviction·복구 | 전체 소유 비용을 설명하고 fallback의 의미/비용 모두 검증 |
| LP17-C08 | 원본 단독과 실제 작업 전이의 다른 부하 | 두 workload를 별도 판정, 원본32 fixture로 실제 event HTTP PASS 대체 금지 |

실행 순서/비교 축은 [구현계획의 LP17](../plans/2026-09-02-v410-recording-foundation-implementation-plan.md#lp17-판정-기준-비교-설계-저장-계약)에서만 관리한다.
이번 계약 문서 검토는 위 반례를 실행한 증거가 아니다.
