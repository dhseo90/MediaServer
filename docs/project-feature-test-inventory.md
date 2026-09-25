# 프로젝트 기능별 테스트 목록

## S11 B-02 불변 세대 파일 안전 읽기

독자: 녹화 저장·검증 구현자. 수명: B안 snapshot·identity·과거 원문 복구 구현부터
S11 코드 고정까지. 제품 Open에 아직 연결되지 않은 reader 단위이며 완전 복구 PASS가 아니다.

| ID | 확인 항목 | 안정화 | 30분 | 120분 | UI |
| --- | --- | --- | --- | --- | --- |
| B02-I01 | 불변 파일 읽기 | 허용된 snapshot/identity/evidence 고정 이름·descriptor와 원문 bytes 일치 | 미실행: 단기 reader | 미실행: 최종 소스 판정 전 | 비대상: 내부 읽기 |
| B02-I02 | 소유·경로 차단 | root/file symlink·hardlink·임의 이름·세대 숫자 비정규/0·파일 교체 거부. 현재 manifest 세대 일치는 별도 검사 | 미실행: 단기 reader | 미실행: 최종 소스 판정 전 | 비대상: 내부 읽기 |
| B02-I03 | 손상·상한 차단 | 크기/hash 변조·누락·caller byte admission·1GiB 형식 상한, 실패 출력 불변 | 미실행: 단기 reader | 미실행: 최종 소스 판정 전 | 비대상: 내부 읽기 |
| B02-I04 | 암호 미지원 | crypto-off 파일 검증 fail-closed, 기존 v1 경로는 변경하지 않음 | 미실행: 단기 reader | 미실행: 최종 소스 판정 전 | 비대상: 내부 읽기 |
| B02-I05 | cold 구간 읽기 | 전체 파일 SHA를 스트리밍 대조하고 지정 offset/length만 반환; 선두/중간/끝/0길이와 큰 파일에서 출력 크기 확인 | 미실행: 단기 reader | 미실행: 최종 소스 판정 전 | 비대상: 내부 읽기 |
| B02-I06 | cold 구간 거부 | offset+length overflow·범위 이탈·caller 결과 admission·원본 교체·crypto-off 거부, 실패 출력 불변 | 미실행: 단기 reader | 미실행: 최종 소스 판정 전 | 비대상: 내부 읽기 |
| B02-T01 | source 얇은 값 | source-binding 현재 요약·latestMutationId의 고정 schema/canonical 왕복, 값 상한·잘못된 ID/필드 거부 | 미실행: 단기 값 codec | 미실행: 최종 소스 판정 전 | 비대상: 내부 저장 |
| B02-T02 | job 얇은 값 | derived-job 현재 요약·출력/원본 ID 목록·상태·latestMutationId의 canonical 왕복, 중복/상한/모순 거부 | 미실행: 단기 값 codec | 미실행: 최종 소스 판정 전 | 비대상: 내부 저장 |
| B02-T03 | 요약과 원문 경계 | 얇은 값의 parser 성공은 원문 검증·제품 import 성공이 아님; 실패 output 불변·crypto-off 동일 판정 | 미실행: 단기 값 codec | 미실행: 최종 소스 판정 전 | 비대상: 내부 저장 |
| B02-P01 | 제품 현재 상세 ID 보존 | Catalog의 bound source·derived job 현재 얇은 상태가 실제 적용된 latest mutation ID를 보유하고 동일 내용 재시도/복구 후에도 현재 원문을 가리킴 | 미실행: 제품 집중 회귀 | 미실행: 최종 소스 판정 전 | 비대상: 내부 저장 |

## S11 B-02 형식 전환 충돌 차단

독자: 녹화 저장·검증 구현자. 수명: B안 managed 전환부터 제품 재기동 판정까지.
현행 v1 writer가 B manifest 공존·v2 marker를 구형 저장소로 오인하지 않도록 하는
단기 안전 검사이며 B 형식 Open/Append/전환 완료 증거는 아니다.

| ID | 확인 항목 | 안정화 | 30분 | 120분 | UI |
| --- | --- | --- | --- | --- | --- |
| B02-G01 | 초기 열기 충돌 | 정상 v1 저장소의 bytes를 보존하고, manifest 이름 공존·v2/손상 marker에서는 Open 거부 | 미실행: 단기 저장 경계 | 미실행: 최종 소스 판정 전 | 비대상: 내부 저장 경계 |
| B02-G02 | 열기 후 변조 차단 | 이미 열린 v1 writer에 manifest 또는 marker 교체가 생기면 lease·append·replay 거부, 기존 bytes 불변 | 미실행: 단기 저장 경계 | 미실행: 최종 소스 판정 전 | 비대상: 내부 저장 경계 |

## S11 B-02 현재 catalog snapshot 값 형식

독자: 녹화 저장·검증 구현자. 수명: B안 snapshot 구조 구현부터 제품 복원 판정까지.
아래는 구현·실행 전 단기 반례 정의다. 값 코덱 결과는 catalog export/import·Open·SQLite·
30분/120분/UI 결과가 아니다. [중앙 기록](release-test-records.md#v410-s11-b안-저장-구조-구현)을 따른다.

| ID | 확인 항목 | 안정화 | 30분 | 120분 | UI |
| --- | --- | --- | --- | --- | --- |
| B02-S01 | 값 왕복 | 빈/모든 현재 map kind, object/string/true 값, 독립 canonical header/row literal | 미실행: 단기 값 코덱 | 미실행: 최종 소스 판정 전 | 비대상: 내부 형식 |
| B02-S02 | 엄격 JSONL | kind/key 순서·중복·extra/duplicate key·overflow·값 타입·LF·입력 크기 거부, 실패 output 불변 | 미실행: 단기 값 코덱 | 미실행: 최종 소스 판정 전 | 비대상: 내부 형식 |
| B02-S03 | manifest/head 결박 | store/세대/배타적 cut, 현 세대 `identity-*` 이름·길이·SHA, 0세대/미래 head 거부 | 미실행: 단기 값 코덱 | 미실행: 최종 소스 판정 전 | 비대상: 내부 형식 |
| B02-S04 | 최초 수용 순서 | accepted-state ID/type/ordinal을 완전 검증된 chain 최초행과 대조, 대상 ID 전수·후행 재시도 포함 배타 cut 검증 | 미실행: 단기 값 코덱 | 미실행: 최종 소스 판정 전 | 비대상: 내부 형식 |
| B02-S05 | crypto 미지원 | 값 코덱·구조 결박은 정상, 암호 체인 검증을 대신하지 않음 | 미실행: 단기 값 코덱 | 미실행: 최종 소스 판정 전 | 비대상: 내부 형식 |
| B02-SR01 | snapshot 검사 실행 연결 | `./server.sh verify-v410-recording-catalog-snapshot`, S01~S05·exit·임시 정리 | 미실행: 단기 값 코덱 | 미실행: 최종 소스 판정 전 | 비대상: 내부 형식 |

## S11 B-02 과거 identity 색인 조각 단위

독자: 녹화 저장·검증 구현자. 수명: B안 과거 증거 참조 폐쇄부터 S11 영향 판정까지.
아래는 구현·실행 전 반례 정의다. 독립 코덱 검증은 제품의 snapshot 결박·재기동 복구 또는
장시간 검증을 대체하지 않는다. 결과는 [중앙 기록](release-test-records.md#v410-s11-b안-저장-구조-구현)을 따른다.

| ID | 확인 항목 | 안정화 | 30분 | 120분 | UI |
| --- | --- | --- | --- | --- | --- |
| B02-H01 | 값 왕복 | 빈/예약/일반 물리 행의 canonical·signed 시각·archive 위치와 재시도 multiplicity 보존 | 미실행: 단기 코덱 | 미실행: 최종 소스 판정 전 | 비대상: 내부 색인 |
| B02-H02 | locator 경계 | `identity-<세대>.jsonl`과 active/evidence 고정 이름, 세대·slot·offset/length·범위 및 중첩 거부 | 미실행: 단기 코덱 | 미실행: 최종 소스 판정 전 | 비대상: 내부 색인 |
| B02-H03 | identity·예약 | 동일 ID/identity 재시도와 각 ordinal 보존·최초 ordinal 도출, 다른 identity/tuple·역순 ordinal·store/request/entity 충돌 거부 | 미실행: 단기 코덱 | 미실행: 최종 소스 판정 전 | 비대상: 내부 색인 |
| B02-H04 | 엄격 JSON | schema·추가/중복 키·배열/escape/overflow·비정규 입력 거부와 실패 출력 불변 | 미실행: 단기 코덱 | 미실행: 최종 소스 판정 전 | 비대상: 내부 색인 |
| B02-H05 | 세대 체인 | 2세대 fixture와 3세대 이상 순차 검증, descriptor 길이/SHA·store/세대·ID/ordinal 결박, 메모리 상한 실패 구분 | 미실행: 단기 코덱 | 미실행: 최종 소스 판정 전 | 비대상: 내부 색인 |
| B02-H06 | crypto 미지원 | 값 코덱 범위와 digest 체인 fail-closed 구분 | 미실행: 단기 코덱 | 미실행: 최종 소스 판정 전 | 비대상: 내부 색인 |
| B02-HR01 | 색인 코덱 실행 연결 | `./server.sh verify-v410-recording-identity-shards`의 H01~H06·임시 자료 정리·exit | 미실행: 단기 코덱 | 미실행: 최종 소스 판정 전 | 비대상: 내부 색인 |

## S11 B-02 세대 manifest 저장 단위

독자: 녹화 저장·검증 구현자. 수명: B안 형식 구현부터 S11 영향 판정까지.
아래는 구현 전 단기 반례 등록이며 실행 결과는 [중앙 기록](release-test-records.md#v410-s11-b안-저장-구조-구현)을 따른다.
manifest 단독 검사는 제품의 snapshot·증분·복구 또는 최종 장시간 합격을 뜻하지 않는다.

| ID | 확인 항목 | 안정화 | 30분 | 120분 | UI |
| --- | --- | --- | --- | --- | --- |
| B02-B01 | 제품 빌드 연결 | `./server.sh build`가 새 manifest source 포함해 exit0 | 미실행: 제품 단기 | 미실행: 최종 소스 판정 전 | 비대상: 내부 빌드 |
| B02-R01 | 검증기 dispatch | `./server.sh verify-v410-recording-generation`이 전체 6개 시나리오를 실행·정리 | 미실행: 단기 형식 | 미실행: 최종 소스 판정 전 | 비대상: 내부 검증 |
| B02-R02 | 파일 준비 검증기 dispatch | `./server.sh verify-v410-recording-generation-files`가 F01~F06 시나리오를 실행·정리 | 미실행: 단기 파일 준비 | 미실행: 최종 소스 판정 전 | 비대상: 내부 검증 |
| B02-M01 | 세대 manifest 왕복 | 정확한 store·generation·cut·파일 길이·digest·정렬 canonical 일치 | 미실행: 단기 형식 | 미실행: 최종 소스 판정 전 | 비대상: 내부 형식 |
| B02-M02 | 잘못된 값·경로 거부 | 중복/미지원 필드·0/overflow·상위/임의/symlink 경로 거부 | 미실행: 단기 형식 | 미실행: 최종 소스 판정 전 | 비대상: 내부 형식 |
| B02-M03 | 참조 파일 손상 거부 | 누락·다른 세대·크기/원문 digest 불일치 거부 | 미실행: 단기 형식 | 미실행: 최종 소스 판정 전 | 비대상: 내부 형식 |
| B02-M04 | 원자 게시 | stage fsync·rename·directory fsync 뒤 한 세대만 선택, rename 후 sync 실패는 불확실로 차단 | 미실행: 단기 형식 | 미실행: 최종 소스 판정 전 | 비대상: 내부 형식 |
| B02-M05 | 실패 후 원본 보존 | 게시 전 중단·충돌·I/O 실패에 기존 manifest 바이트 불변 | 미실행: 단기 형식 | 미실행: 최종 소스 판정 전 | 비대상: 내부 형식 |
| B02-M06 | crypto 미지원 경계 | 필수 digest를 만들 수 없는 빌드에서는 신규 형식 거부, 기존 형식 불변 | 미실행: 단기 형식 | 미실행: 최종 소스 판정 전 | 비대상: 내부 형식 |
| B02-F01 | 세대 파일 정상 준비 | 검증된 원본 FD와 snapshot을 고정 이름·정확한 길이/SHA·빈 active로 준비하고 원본 offset/bytes 및 소유 보고 불변 | 미실행: 단기 파일 준비 | 미실행: 최종 소스 판정 전 | 비대상: 내부 저장 |
| B02-F02 | 준비 입력 상한 | 세대 0, source 길이 1GiB 초과, 증거 65개, 잘못된 이름·digest·출력 충돌을 파일 생성 전에 거부; snapshot 1GiB 상한은 코드 대조만 함 | 미실행: 단기 파일 준비 | 미실행: 최종 소스 판정 전 | 비대상: 내부 저장 |
| B02-F03 | 원본 파일 결박 | 닫힌/다른 FD, 길이·해시 불일치, root/source symlink·hardlink를 거부하고 원본 보존 | 미실행: 단기 파일 준비 | 미실행: 최종 소스 판정 전 | 비대상: 내부 저장 |
| B02-F04 | 중단·충돌 보존 | O_EXCL 충돌, 부분 파일 소유 보고·잔여 보존, 기존 manifest 불변, 준비 결과 재사용 거부 및 소유 fixture 정리 | 미실행: 단기 파일 준비 | 미실행: 최종 소스 판정 전 | 비대상: 내부 저장 |
| B02-F05 | 게시·재열기 | 준비만으로 manifest 미생성, 별도 명시 게시·읽기 성공, 다음 세대는 새 증거만 포함, 이전 archive 불변, directory fsync 불확실 전파 | 미실행: 단기 파일 준비 | 미실행: 최종 소스 판정 전 | 비대상: 내부 저장 |
| B02-F06 | crypto 미지원 준비 | OpenSSL 없는 빌드에서 준비·별도 게시를 무생성으로 거부 | 미실행: 단기 파일 준비 | 미실행: 최종 소스 판정 전 | 비대상: 내부 저장 |

## S11 B-03 예약 이력 snapshot 코덱 단위

독자: 녹화 저장·검증 구현자. 수명: B안 현재 상태·복구 연결까지. 아래는 구현 전 단기 반례
정의이며 [중앙 기록](release-test-records.md#v410-s11-b안-저장-구조-구현)을 따른다.
독립 값 코덱은 실제 Journal 복원 또는 B-03 정상 저장 연결 PASS가 아니다.

| ID | 확인 항목 | 안정화 | 30분 | 120분 | UI |
| --- | --- | --- | --- | --- | --- |
| B03-R01 | 예약 코덱 검증기 연결 | `./server.sh verify-v410-recording-order-snapshot`에서 O01~O06·소유 임시 정리 | 미실행: 단기 값 코덱 | 미실행: 최종 소스 판정 전 | 비대상: 내부 상태 |
| B03-O01 | 빈/정상 왕복 | 빈 bound store·최대 0·ID 집합과 예약 전체 tuple·발생시각/segment 재구성 | 미실행: 단기 값 코덱 | 미실행: 최종 소스 판정 전 | 비대상: 내부 상태 |
| B03-O02 | 정렬·시각 경계 | 입력 순서와 무관한 canonical, sequence gap/int64 최대, 음수/최소 시각, 허용 ID·channel | 미실행: 단기 값 코덱 | 미실행: 최종 소스 판정 전 | 비대상: 내부 상태 |
| B03-O03 | 예약 충돌 | request/segment/sequence 중복, store·maximum·빈 store 모순 거부 | 미실행: 단기 값 코덱 | 미실행: 최종 소스 판정 전 | 비대상: 내부 상태 |
| B03-O04 | ID 집합 충돌 | ordinary/request·legacy/reserved segment 교차, 집합 중복·잘못된 ID 거부; 허용 namespace 교차 유지 | 미실행: 단기 값 코덱 | 미실행: 최종 소스 판정 전 | 비대상: 내부 상태 |
| B03-O05 | JSON 엄격성 | schema/extra/중복 키/타입/overflow·중첩 array와 인용·escape·비정규 입력 거부, 실패 output 불변 | 미실행: 단기 값 코덱 | 미실행: 최종 소스 판정 전 | 비대상: 내부 상태 |
| B03-O06 | crypto 미사용 | OpenSSL 미사용 빌드에서도 같은 정상 왕복·오류 거부 | 미실행: 단기 값 코덱 | 미실행: 최종 소스 판정 전 | 비대상: 내부 상태 |

## S11 O29 체크포인트 실제 분기 반례

독자: v4.1.0 녹화 저장 구현·검증 담당자. 수명: O29 구조 선택과 영향 회귀까지.
현재 제품 코드의 상주/비상주, 자동/일반, 무변경/축소 후보를 소유 임시 저장소에서 구분한다.
이 단기 반례는 실제 앱·장시간·UI의 합격 증거가 아니다. 실행 정의·실패·결과는
[중앙 기록](release-test-records.md#v410-s11-o29-저장-처리-구조-선행-판정)을 따른다.

| ID | 확인 항목 | 안정화 | 30분 | 120분 | UI |
| --- | --- | --- | --- | --- | --- |
| O29-C01 | 상주 checkpoint 읽기 | 동일 소유 원장의 resident 핸들·추가 cold 획득 0·바이트 불변 | 미실행: 단기 반례 | 미실행: 대체 불가 | 비대상: 내부 원장 |
| O29-C02 | 비상주 checkpoint 읽기 | resident 해제 후 위치 원문/해시/엄격 파싱·바이트 불변 | 미실행: 단기 반례 | 미실행: 대체 불가 | 비대상: 내부 원장 |
| O29-C03 | 적격 자동 no-op·변조 거부 | 전 물리 행 raw SHA 대조, 무변경은 무쓰기, 같은 길이 변조는 거부·원본 보존 | 미실행: 단기 반례 | 미실행: 대체 불가 | 비대상: 내부 원장 |
| O29-C04 | 일반 무축소 후보 | 후보 직렬화 뒤 크기가 줄지 않으면 inode/바이트/임시파일 불변 | 미실행: 단기 반례 | 미실행: 대체 불가 | 비대상: 내부 원장 |
| O29-C05 | 실제 축소 후보 | receipt 압축 때 정확한 후보 바이트 원자 교체·옛 소유 snapshot 불변·임시파일 부재 | 미실행: 단기 반례 | 미실행: 대체 불가 | 비대상: 내부 원장 |

## S11 O28 근본 원인 분석 진단

독자: v4.1.0 검증 개발 담당자. 수명: 원인 확정까지. 아래 항목은 제품/장시간 합격이 아닌 진단 정확도이며 정의·결과는 [중앙 기록](release-test-records.md)에 보존한다.

| ID | 확인 항목 | 안정화 | 30분 | 120분 | UI |
| --- | --- | --- | --- | --- | --- |
| O28-D01 | 자식 정상/실패 안전 분류 | 관측기 진단 자체검사 | 비대상: 진단 도구 | 비대상: 대체 PASS 금지 | 비대상: 내부 검증 |
| O28-D02 | 시간초과·출력상한·신호·실행오류 | 고정 코드/unknown 반례·상한 유지 | 비대상: 진단 도구 | 비대상: 대체 PASS 금지 | 비대상: 내부 검증 |
| O28-D03 | 단계 추적의 부분/손실/오류 | 기존 archive phase 재사용·비민감 증거 | 비대상: 진단 도구 | 비대상: 대체 PASS 금지 | 비대상: 내부 검증 |
| O28-D04 | 실제 native 소규모 경로 | 소유 임시 계측·Open/SQLite/조회/매체/소멸·기존 JSON | 미실행: 별도 영역 | 미실행: 별도 영역 | 비대상: 내부 검증 |
| O28-D05 | 최초 진단·기존 검사 보호 | 후속 오류와 분리·archive/observer 영향 회귀 | 비대상: 진단 도구 | 비대상: 대체 PASS 금지 | 비대상: 내부 검증 |
| O28-R01 | 소유 복제·입력 불변 | nofollow·해시·동일 자료 재실행·원본/소스 변경 거부 | 비대상: 진단 준비 | 비대상: 대체 PASS 금지 | 비대상: 내부 검증 |
| O28-R02 | 최초 진단/manifest 내구 보존 | 덮어쓰기 거부·안전 필드·source/build hash·후속 오류 분리 | 비대상: 진단 준비 | 비대상: 대체 PASS 금지 | 비대상: 내부 검증 |
| O28-R03 | 실패 자료 수명 | 자료 보존·프로세스 종료·소유권·원본 불변 확인 전 삭제 차단 | 비대상: 진단 준비 | 비대상: 대체 PASS 금지 | 비대상: 내부 검증 |
| O28-R04 | 실제 소규모 복제/재실행 | 같은 합성 저장소 복제본으로 native 결과·원본 hash 대조 후 정리 | 비대상: 진단 준비 | 비대상: 대체 PASS 금지 | 비대상: 내부 검증 |
| O28-C01 | 규모·cache 경계 | 16/1020/2048/2049·4N행·60샘플·64MiB 경계와 실제 입력형 구분 | 비대상: 단기 원인 비교 | 비대상: 대체 PASS 금지 | 비대상: 내부 검증 |
| O28-C02 | 복구 비용 분리 | 준비·drain·Open/replay/preflight/SQLite/해제 비용 | 비대상: 단기 원인 비교 | 비대상: 대체 PASS 금지 | 비대상: 내부 검증 |
| O28-C03 | 체크포인트 비용 | cold/repeat prefix·후보·직렬화·잠금·수동/자동 경로 분리 | 비대상: 단기 원인 비교 | 비대상: 대체 PASS 금지 | 비대상: 내부 검증 |
| O28-C04 | 비교 실패 증거 | 기존 상한·최초 진단/receipt·실패 자료 보존 | 비대상: 단기 원인 비교 | 비대상: 대체 PASS 금지 | 비대상: 내부 검증 |
| O28-M01 | 메모리 소유 분리 | journal/live/shadow/prefix의 부분논리량·resident/cold/weak 및 RSS | 비대상: 단기 원인 비교 | 비대상: 대체 PASS 금지 | 비대상: 내부 검증 |
| O28-M02 | reader/snapshot 수명 | 획득·재획득·해제·조회·새 프로세스 복구 대조 | 비대상: 단기 원인 비교 | 비대상: 대체 PASS 금지 | 비대상: 내부 검증 |

## S11 O27 임시 진단 분기 정리

독자: v4.1.0 검증 담당자. 수명: S11 원인 분석까지. O26 전용 실행 분기는 폐기했으며
S11-O26-01/02의 정의·실패·관측값은 [중앙 기록](release-test-records.md#s11-o27-불필요-진단-분기-정리근본-분석-준비-2026-09-24)에 보존한다.
자원 진단 요구 자체를 완료/제외로 바꾸지 않는다. 기존 제품·저장 계약과 장시간 합격 기준은 유지한다.

| ID | 확인 항목 | 안정화 | 30분 | 120분 | UI |
| --- | --- | --- | --- | --- | --- |
| S11-O27-01 | 폐기 모드의 준비 전 거부 | 관측기 `--self-test`: 제거 CLI는 exit 2·서버/임시자료 생성 없음 | 비대상: 검증기 CLI 정리 | 비대상: 녹화 120분 대체 아님 | 비대상: 내부 검증기 |
| S11-O27-02 | 기존 관측·판정 경계 | 같은 자기검사의 writer·원장·삭제/복구 및 진단의 장시간 PASS 승격 금지 | 미실행: 이번 정리의 범위 밖 | 미실행: 별도 실행·판정 필요 | 비대상: 내부 검증기 |
| S11-O27-03 | 정적·등록 정합 | 구문·inventory·coverage·문서·diff 검사 | 비대상: 정적 검증 | 비대상: 정적 검증 | 비대상: 제품 UI 변경 없음 |

## S11 O25 전체 페이지 상한 분리·렌더 대기 순서

독자: v4.1.0 녹화 저장·통합 검증 담당자. 수명: S11 통합 마감까지.
제품 출력·공개 API·파일 형식과 기존 HTTP 4초·작업 관측 30초 기준은 바꾸지 않는다.
`allTimelinePages`는 최상위 항목 4,096개, `file-group` 구성원을 포함한 leaf 8,192개,
직렬화된 전체 페이지 64MiB를 서로 다른 상한으로 검사한다. 구성원 4,111개를 가진 최상위
그룹 한 개는 최상위 상한 초과가 아니며, 구성원 8,193개는 leaf 상한으로 거부한다.
중복 ID·페이지 total 변경·offset 상한·byte 상한의 기존 fail-closed 검사도 유지한다.

`S11-CI04`의 첫 dispatch 참조 선택은 관측 대상을 고정하는 계약일 뿐 렌더 선두를 뜻하지 않는다.
새 렌더 순서는 별도 기능 ID `S11-O25-04`로 추적한다. 원본 준비가 역순이어도 이미 준비된
작업끼리는 최초 내구 접수 순서를 지키되, 실행 중 렌더를 선점하거나 미준비 작업을 기다리지 않는다.
동시각 입력은 안정 순서와 기존 queue node 소유를 유지한다.

| ID | 확인 항목 | 안정화 | 30분 | 120분 | UI |
| --- | --- | --- | --- | --- | --- |
| S11-O25-01 | 최상위와 그룹 구성원 상한 분리 | 4,111개 구성원은 누락 없이 소비하고 최상위 4,096·leaf 8,192·전체 64MiB를 독립 대조 | 미실행 | 미실행 | 비대상: 검증기 내부 페이지 소비 |
| S11-O25-02 | 분리 상한과 기존 fail-closed 반례 | leaf 8,193, 최상위·offset·byte 초과, 중복 ID, 페이지 total 변경을 각각 고정 코드로 거부 | 미실행 | 미실행 | 비대상: 검증기 내부 페이지 소비 |
| S11-O25-03 | 실제 앱과 현행 전체 통합 | 같은 실제 앱 조건에서 두 출력·HTTP/해시·재기동·정리를 확인하며 4초/30초 기준을 완화하지 않음 | 미실행 | 미실행 | 실제 UI 풀테스트 대체 불가 |
| S11-O25-04 | 준비 완료 이벤트의 렌더 대기 순서 | 내구 접수 순서·동시각 안정성·queue node 소유와 실행 중 선점/미준비 대기 금지를 이벤트 통합으로 대조 | 미실행 | 미실행 | 비대상: 내부 렌더 큐 계약 |

실행 전 정의와 최초 페이지 실패, 예상 RED, 작업 대기 실패, 권한 실패, 최종 집중·실제 앱 결과는
[중앙 O25 기록](release-test-records.md#v410-s11-o25-실제-앱-전체-페이지-경계-보완-실행-전-정의-2026-09-24)을 따른다.
inventory 연결 보완은 과거 실패를 지우거나 기존 결과를 새 실행으로 바꾸지 않는다.

## S11 상태 조회 전용 체크포인트 snapshot 사전등록

독자: v4.1.0 녹화 저장·검증 담당자. 수명: S11 누적 상태 병목 보완 검증까지.
공개 상태 JSON·권한·저장/원장/복구/보존/삭제/타임라인 계약은 바꾸지 않고,
카탈로그 전역 잠금을 실제 체크포인트가 보유한 동안에만 상태 조회용 불변 snapshot을 허용한다.
안정화 집중 검사만 실행하며 실제 1,020개 누적, 전체 5단계, 30분·120분·UI 검증은 미실행이다.

| ID | 확인 항목 | 안정화 | 30분 | 120분 | UI |
| --- | --- | --- | --- | --- | --- |
| S11-STATUS-SNAPSHOT-01 | 체크포인트 잠금 중 동일 snapshot의 mode/recovery/채널별 용량 | 마지막 성공 mutation 직후 상태를 게시하고 세 값을 한 호출에서 대조 | 미실행 | 미실행 | 비대상: 내부 상태 공급 |
| S11-STATUS-SNAPSHOT-02 | 체크포인트 외 잠금 경합의 fallback 금지 | 일반 잠금은 정상 경로를 기다리고 체크포인트 active일 때만 snapshot 사용 | 미실행 | 미실행 | 비대상: 내부 상태 공급 |
| S11-STATUS-SNAPSHOT-03 | 실패·authority 상실·poison 및 모든 탈출의 active 정리 | 예외/실패 후 stale snapshot을 거부하고 정상 잠금 또는 fail-closed | 미실행 | 미실행 | 비대상: 내부 상태 공급 |
| S11-STATUS-SNAPSHOT-04 | 동적 상태와 공개 응답 계약 유지 | 채널 설정·active·storageBlocked·인증 필터는 현재값, JSON 필드/값 의미 불변 | 미실행 | 미실행 | 실제 UI 풀테스트 대체 불가 |
| S11-STATUS-SNAPSHOT-05 | Apply·삭제·재개방·원장 변조 반례와 경로 격리 | 동시 변경은 mutex 이후 새 상태, 동일 길이/inode 교체는 기존 strict 거부, snapshot을 저장·보존·삭제·타임라인에 재사용하지 않음 | 미실행 | 미실행 | 비대상: 내부 저장/상태 경계 |

## LP26-O14 누적 지연 원인 분리와 실제 경로 확인

독자: v4.1.0 녹화 저장·검증 담당자. 수명: S11 누적 비용 판정까지. AGENTS.md의 테스트 정책을 따른다.
수동 전체 체크포인트 반례와 실제 HTTP 실패를 별도 실행 경로로 취급한다. 기존 4초 HTTP 응답,
15초 관측·복구 기준을 유지한다. 안정화 집중 검사만 실행하며 30분·120분·UI 전수는 이번 범위에서 미실행이다.

| ID | 확인 항목 | 안정화 | 30분 | 120분 | UI |
| --- | --- | --- | --- | --- | --- |
| LP26-O14-A | 동일 호출의 체크포인트 잠금·타임라인 전체/대기 비용, 수동과 자동 no-op/전체 분기 구분 | 소유 synthetic 복제본과 실제 앱 추적의 경로·시간 대응 | 미실행 | 미실행 | 비대상: UI 없어야 정상 |
| LP26-O14-B | 삭제 원본 타임라인의 누락·중복·재생 불가 판정 | 정확한 ID/개수·상태 oracle | 미실행 | 미실행 | 비대상: UI 없어야 정상 |
| LP26-O14-C | 계측 probe와 제품 빌드의 코드 출처 결박 | instrumented 소스와 연결 archive의 freshness/hash 확인 | 미실행 | 미실행 | 비대상: UI 없어야 정상 |
| LP26-O14-D | 공개 정상 lifecycle의 삭제가 자동 전체 체크포인트를 유발하는지 분류 | 새 ID를 예약·확정·삭제 요청·파일 부재·삭제 완료한 뒤 같은 호출의 no-op/전체 분기·잠금/전체 시간을 구분; 수동 checkpoint 또는 이미 삭제된 ID 재삭제로 대체 금지 | 미실행 | 미실행 | 비대상: UI 없어야 정상 |
| LP26-O14-E | 자동 처리 후 동일 root 재개방·손상 거부 | 기존·신규 삭제 ID와 관측 ID/개수를 정확히 대조하고 복구 손상·투영·정리 오류 0 확인 | 미실행 | 미실행 | 비대상: UI 없어야 정상 |
| LP26-O15 | 실제 앱 누적 규모의 상태 HTTP·잠금 경계 | 격리된 두 채널·1초 분할로 원본 1,020개까지 생성·보존/삭제하면서 매 표본 `GET /ops/api/recordings/status` 4초 및 15초 관측 간격을 유지하고, 실패 시 제품 지연 trace·종료·정리를 보존. 이 집중 진단은 120분 PASS가 아님 | 미실행 | 미실행 | 비대상: UI 없어야 정상 |
| LP26-O15-B | 이전 실패와 같은 2초 분할 누적 상태 대조 | 동일 두 채널·입력·128MiB/channel·4초 HTTP·15초 관측 제한에서 원본 1,020개를 확인한다. 1초 가속 결과와 journal 크기·checkpoint/잠금·상태 응답을 구분하고, 미도달/실패 시 대체 PASS 금지 | 미실행 | 미실행 | 비대상: UI 없어야 정상 |
| LP26-O16 | 체크포인트 묶음 결박 최적화와 손상 거부 | 행별 raw/hash/strict Parse 유지, 시작·끝 전체 결박과 행별 fd 상태 확인, 동일 길이 변조·inode 교체·세대 불일치·crypto-off·재개방 반례, 2,049개 누적 비용을 종전 계측과 비교 | 미실행 | 미실행 | 비대상: UI 없어야 정상 |
| LP26-O17 | 수정 후 실제 앱 2초 분할 상태 지연 | LP26-O15-B와 같은 두 채널·입력·1,020개·4초 HTTP/15초 표본 기준으로 체크포인트 최장 잠금과 API 지연을 다시 계측. 120분·자원 추세 PASS 대체 금지 | 미실행 | 미실행 | 비대상: UI 없어야 정상 |
| LP26-O18 | 통합 대기 실패 뒤 작업 코드 안전 보존 | 관측 중 실패와 대기 종료 후 실패를 구분하고, 사후 실패라면 복제본의 고정 허용 코드만 최초 상태 증거와 분리해 보존; 미등록 코드·저장 실패 시 정리 거부 | 미실행 | 미실행 | 비대상: UI 없어야 정상 |
| LP26-O19 | 실제 앱 통합의 30초 제한 엄격 판정 | 비동기 조회가 30초 뒤 성공하더라도 해당 통합 구간은 timeout으로 거부하고 최초 결과·지연 관측을 남긴다. 기존 다른 대기 호출의 의미는 바꾸지 않는다 | 미실행 | 미실행 | 비대상: UI 없어야 정상 |
| LP26-O20-A | 실제 앱 페이지 경계 실패 원인 구분 | 기존 4,096 item/leaf·64MiB 제한을 유지하며 top/offset/leaf 고정 코드와 비민감 수치를 구분한다. O16 오류와 O18 timeout을 섞지 않는다 | 미실행 | 미실행 | 비대상: UI 없어야 정상 |
| LP26-O20-B | dispatch 대상과 render 순서 분리 | S11-CI04 반례에서 첫 dispatch 선택을 고정하고 후보 수·원래 순서를 기록한다. render 선두로 가정하거나 늦다고 대상 교체하지 않는다 | 미실행 | 미실행 | 비대상: UI 없어야 정상 |
| LP26-O20-C | 독립 terminal·전체 페이지 동시 필요 | 완전 출력 2개·독립 terminal·전체 페이지 적격 중 하나라도 빠지면 실제 앱 통합 PASS를 거부한다 | 미실행 | 미실행 | 비대상: UI 없어야 정상 |
| LP26-O23-A | 타임라인 완료 작업 후보의 요청 간 재검증 | 이전 요청의 최대 8건/8MiB 후보를 현재 원장 envelope·출처·상태와 다시 대조하고, 동일 출력 JSON/파일·재획득 감소를 확인한다 | 미실행 | 미실행 | 비대상: UI 없어야 정상 |
| LP26-O23-B | 후보 손상·권한 상실·예산 fallback | 동일 길이 원장 변조, detach, 상태/원본 변경, 예산 0·할당 실패에서 낡은 영상을 제공하거나 권위를 복원하지 않으며 hold·메모리 상한을 유지한다 | 미실행 | 미실행 | 비대상: UI 없어야 정상 |
| LP26-O23-C | 동일 채널 9개 이상 완료 작업의 후보 상한 | cache resident/charge는 최대 8 jobs/8MiB, 초과 작업은 strict fallback이며 공개 timeline·파일·hold 결과가 같다 | 미실행 | 미실행 | 비대상: 내부 읽기 최적화 |
| LP26-O23-D | 채널 A→B→A 전환의 관련 후보 수명 | 이전 채널 8개가 다음 채널 후보 게시를 막지 않고, 각 요청이 현재 채널 후보만 bounded 보관하며 재사용마다 strict 대조한다 | 미실행 | 미실행 | 비대상: 내부 읽기 최적화 |
| LP26-O23-E | 삭제·재Open의 resident/charge 정리 | 삭제와 같은 catalog 재Open 뒤 strong job/envelope·owner·charge가 남지 않고 stale 재생 없이 strict 재획득 또는 거부한다 | 미실행 | 미실행 | 비대상: 내부 저장/읽기 경계 |

실행 결과는 중앙 기록에 별도 연결한다. 원인 미확정이나 이전 실패를 사후 PASS로 바꾸지 않는다.

## LP26-O12 누적 안전성·현행 통합 (4번) 실행 전 범위

후속 LP26-O13 원인 진단은 전체 통합 재실행 전에
`node scripts/internal/verify_recording_current_app.mjs --diagnose-restart-boundary`로
같은 격리 입력의 두 번째 기동에서 원본 영속 순서·구간 PTS와 분석 tap PTS를
유한 개수만 기록한다. 이는 안정화 집중 진단이며 실제 이벤트 새 출력·재기동
통합 PASS를 대신하지 않는다. 30분/120분/UI는 이 진단에서 미실행한다.
LP26-O13 통합 보완은 격리된 30초 입력 파일을 ffprobe로 읽어 0/8.333/16.667/25초
키프레임과 timebase를 정확히 검증한 뒤 첫 경계만 두 기동의 조기 이벤트 트리거로 쓴다.
실제 새 원본·두 출력은 사후 archive 증거로 각각 확인하며, 이전 기동 영상을 새 출력으로 수용하지 않는다.
실패 후 복제본 상태 진단은 해당 기동 종료 시점의 새 복제본을 쓰고 기존 복제본을 재사용하지 않는다.
안정화 개별 검사: 기존 경계/epoch 자체검사, 격리 두 기동의 실제 EventRecord·완전 파일2개·HTTP/해시·복구,
실패 시 복제본 시점/정리 확인. 30분·120분·UI는 이번 집중 보완에서는 실행하지 않는다.
같은 실제 분석 프레임에서 복수 event/job이 생기므로, 선택한 출력 2개만 완료된 시점에
즉시 서버를 내리지 않는다. 해당 dispatch 참조 전부의 서버 완료 추적상 terminal 상태와 저장소의 단일 링크
상태를 제품의 원본 대기 상한 60초 안에 확인하고 정상 종료한 뒤 아카이브를 검사한다. 미정착은 FAIL이며
원본 보호·복구·HTTP 합격 기준을 낮추지 않는다.

현재 코드에서 이전 O10/LP24 증거의 유효 범위를 먼저 대조한다. 추가 집중 회귀는
`verify_recording_retention_v2.sh`(pin·hold·참조·삭제),
`verify_v410_recording_corruption.sh`와 `verify_v410_recording_recovery.sh`
(손상·ID·복구·SQLite fallback), 현행 `--current-integration` 다섯 단계
(HTTP/API/Auth/lifecycle/default/실제 앱 출력2개·파일해시·재기동)이다.
작은 실제 앱과 누적 synthetic은 이미 O10/O11에서 실행했으나, 이것만으로
1,020개 원본의 **동시 실제 HTTP 부하** 또는 120분 자원 추세를 PASS로 승격하지 않는다.
안정화: 위 검증과 HTTP 4초·관측15초·독립복구15초 기존 기준 대조;
30분/120분: 이번 집중 회귀에서 미실행(최종 검증 별도); UI: O11 집중 표시 대조 외
전수 풀테스트 미실행. 실패 때 뒤 명령을 건너뛰고 동일 원인만 수정한다.

## LP26-O11 상태 용량 집계 대조 (3번)

실행 전 범위: 현재 보존 후보의 채널·등급·크기로 상태 API를 집계한다. 기존 v1/v2
보존 후보 접근자를 사용하고 공개 JSON 이름·UI 문자열·quota 정책은 바꾸지 않는다.
안정화: 실제 앱 격리 실행에서 확정된 녹화 파일 크기·삭제 원장 상태를 독립 예상값으로
합산하여 재기동 뒤 `/ops/api/recordings/status`와 대조한다. 삭제된 영상은 합계에서
빠져 역사적 총량보다 감소해야 한다. 30분/120분: 이번 집중검사에서는 미실행;
UI: 현재 `/ops/events`의 상태 문자열이 같은 API 값을 표시하는지 후속 실제 화면에서 대조한다.
API-focused 통과를 실제 UI 풀테스트 PASS로 사용하지 않는다.

실제 결과: 비승격 fixture30초 timeout(환경 실패)→승격 실행의9101 API 용량 assertion FAIL→
RetentionCandidate Channel/Class/Size 접근자 보완 뒤73/73·exit0. 실제파일/원장과 API 용량 일치,
삭제13개씩은 현재 사용량에서 제외됐다. IAB `/ops/events` AX와 동일 격리서버 API200의 채널별
상시/이벤트 값도 직접 대조했다. screenshot/trace 미보존으로 집중표시 확인에 한정하며 UI full424 PASS는 아니다.
[개별 실패/성공·cleanup](release-test-records.md#v410-s11-lp26-o11-상태-용량-집계)을 따른다.

## LP26-O10 격리 누적 선행 진단 사전등록

LP26-O10-G01 관측 cadence 보완: 표본 `phaseAt` 기준5초 start-to-start 목표에서
처리시간을 차감한다. 안정화: 순수시간 helper RED→GREEN·15초 연속성/실패 summary 회귀;
30분/120분: 이번 미실행(기존 장시간 기준 불변); UI: 비대상(UI 없어야 정상).
G01 결과: 예상RED4→GREEN4, 관련 회귀107개 통과. 당시2049 복구 미해결 상태는 아래 stage2 최종 결과와 구분한다.

제품 기능 추가가 아닌 synthetic 관측이다. 기존 serializer로 ID/order/segment/binding/tombstone을 다시 결박한다.
정의·실제 결과는 [중앙 기록](release-test-records.md#v410-s11-lp26-o10-격리-누적-선행-진단)을 따른다.

| ID | 확인 항목 | 안정화 | 30분 | 120분 | UI |
| --- | --- | --- | --- | --- | --- |
| LP26-O10-A | 작은16·실패근접1020·record초과2049 원본의4N행 독립 oracle | 새 fixture unit/실제 strict Open | 미실행 | 미실행 | 비대상 |
| LP26-O10-B | 관측 전체 drain·native3초·교체 prefix 재검증 | 각 규모 단회 측정 | 미실행 | 미실행 | 비대상 |
| LP26-O10-C | checkpoint wait/hold·cache admission/reuse/full fallback·cold binding | 소유 코드복제본 숫자계측 | 미실행 | 미실행 | 비대상 |
| LP26-O10-D | 64MiB·8192 exact/plus1 | 메모리 내 입장경계 검사, 저장 성공과 분리 | 미실행 | 미실행 | 비대상 |
| LP26-O10-E | RSS·디스크·손상·정리 | 소유root448MiB·프로세스1GiB·출력4MiB 및 시간제한 | 미실행 | 미실행 | 비대상 |

선행진단 당시: small16와1020은 명시된 strict/count/cache/rotation oracle 통과,
2049는 initial8196행 관측 후 독립 recovery15초 FAIL이며 해당 실행의 뒤 단계는 미실행이다. 최초 실패는 보존한다.
[결과·실패 이력·정리](release-test-records.md#lp26-o10-선행-진단-결과)를 참조한다.

후속 stage2 최종 범위는 **bounded focused 통과**다. 동일원장 재사전검증 생략·SQLite batch·원장 view에
결박된 live binding 재사용 후2049 복구12.127초, 두 checkpoint7.837/8.427초, 실제 앱30초 준비 실행이 통과했다.
기존 LP24 recovery14/14·LP15 checkpoint46/46 회귀와 실패/cleanup은 [stage2 기록](release-test-records.md#lp26-o10-stage2-bounded-focused-최종-결과)을 따른다.
누적1020 동시 HTTP부하·120분·전체통합은4번 잔여이며 위 수치로 PASS를 대신하지 않는다.

문서 마감 검증 사전정의: `./server.sh verify-docs-links`, `./server.sh verify-docs-ui-assets`,
`git diff --check`만 실행한다. 안정화: 문서 연결/자산/공백;30분/120분/UI: 미실행(문서검사로 대체 불가).

## LP26-O09 누적 규모 진단·조기 실패 사전등록

검증 전용이며 제품 기능 총계에 합산하지 않는다. UI는 비대상(UI 없어야 정상).

| ID | 확인 항목 | 안정화 | 30분 | 120분 | UI |
| --- | --- | --- | --- | --- | --- |
| LP26-O09-A | 첫/중간 sample 15초 경계 즉시 실패 | 결정적 helper 단위검사 | 미승인·미실행 | 미승인·미실행 | 비대상 |
| LP26-O09-B | HTTP header/body 4초 원인과 안전 route class | HTTP helper 단위검사 | 미승인·미실행 | 미승인·미실행 | 비대상 |
| LP26-O09-C | 마지막 slow mutex/checkpoint/status 숫자 증거, 출력 상한 | C++ trace smoke 단위검사 | 미승인·미실행 | 미승인·미실행 | 비대상 |
| LP26-O09-D | 실패에도 resource 요약·단계 elapsed·정리 | verifier 연결 직접검토·관련 관측 회귀 | 미승인·미실행 | 미승인·미실행 | 비대상 |

Stage 1 개발/단기 확인 결과는 [중앙 실행 기록](release-test-records.md#lp26-o09-실행-결과와-제한)을 따른다.
실앱·장시간·UI 미실행과 기존120분 실패는 유지한다.

## S11-I30 이벤트 우선 재생 형식 보완 사전등록

기존 제품 기능 `V410-S06-I30`의 실제 브라우저 실패를 보완하는 검사이며 새 제품 ID를
가산하지 않는다. [R01~R04 실행 전 정의](release-test-records.md#v410-s11-i30-이벤트-우선-재생-형식-보완-—-실행-전-정의)를 따른다.
안정화: 현재 제품의 managed 출력별 MP4/프레임·시간·FD/원자 확정·복구·HTTP/권한과
비활성 V1 경로의 기존 TS 다중 원본·복구 계약 회귀.
30분: 기존 승인된 최종 30분 증거의 유지/부분 무효를 변경 diff로 판정.
120분: 이벤트 출력·media lifecycle 직접 변경으로 공통 및 녹화 전용 대상이며,
I30 실제 재생 통과·코드 고정 후 기존 승인 범위에서 실행. UI: `/ops/events` 이벤트
기본 선택의 실제 play/pause/seek·영상 크기/시간 진행을 원본 MP4와 별도 검증.
외부 서비스·실기기는 사용자 명시 제외이고 R01~R04 등록은 PASS가 아니다.

## LP28 검토 위치 처리 사전등록

[R4L01~23/M/A·P01/02 개별 정의](release-artifacts/v4.1.0/s11-preparation-mapping/lp28-locator-closure.md#실행-전-정의).
안정화: `node --test scripts/internal/verify_review4_locator_resolution.test.mjs` 및 migration/approval 자체검사.
30분·120분: 검증기 자체 비대상. UI: 비대상(UI 없어야 정상). 기존986개 제품 기능 총계에 합산하지 않는다.
외부 서비스·실기기는 이번 버전 사용자 명시 제외이며 PASS로 사용하지 않는다.

PREP-R05/WHEP-L01~04는 같은 LP28 문서의 독립 검토 보완 정의에 등록한다.
안정화=소스 결속 및 로컬 WHEP signaling/lifecycle,30분·120분=기존 MEDIA-003 영역에서 별도,
UI=검증기 자체 비대상(실제 browser/media 품질을 대체하지 않음). 신규 제품 기능 총계에는 합산하지 않는다.

## LP27 릴리즈 선행 작업 사전등록

[실행 전 정의](release-artifacts/v4.1.0/s11-preparation-mapping/lp27-release-preparation.md). 등록은 PASS가 아니다.

후속 진단 준비: CPD01~24(안전수집·기본검사불변·제공기단독·실제 응답 형식/잘림/관측 부재), HWD01~04(실행선택·진단/정리),
HW-A01~04(실제한정비교/영향마감)를 위 문서에 각각 사전등록했다.
CPD/HWD는 안정화 도구 자체검사이며30분/120분/UI 비대상이다.
HW-A는 안정화 실제미디어 검사이며30분/120분은 S11 media/lifecycle 매핑, 실제UI는별도다.
PREP-C01~08은 같은 실행 전 정의의 복합 요구 검사다. 안정화=preparation-contracts runner,
30분/120분=기존 S11 source/recording 영역에서 실제 실행, UI=백엔드 검사 자체 비대상(제품 UI는 별도)이다.
ENV12는 `bash scripts/internal/verify_gst_environment_actual.sh`가 실제 플랫폼94개+cleanup을 연결한다.
정의는 LP27 ENV12 절에 전수 등록했다. 안정화=실제 cold/warm·44inspect/44make·READY/decode,
30분/120분=실행 환경 선수조건(장시간 자체를 대체하지 않음), UI=환경 도구 비대상이다.

| ID | 기능 | 안정화 | 30분 | 120분 | UI |
| --- | --- | --- | --- | --- | --- |
| LP27-H01 | 진단 입력/제품 source 결박 | 동일 AU·SHA·factory/builder | 비대상: 단기 진단 | 비대상: 단기 진단 | 비대상: UI 없음 |
| LP27-H02 | HW decoder 실제 경계 | sink/src PTS/EOS/누락 계수 | 비대상: 단기 진단 | 실제 영향에 따라 S11 판정 | 비대상: UI 없음 |
| LP27-H03 | downstream 영향 | URI encoder/RTSP overlay 앞 PTS | 비대상: 단기 진단 | 실제 영향에 따라 S11 판정 | 실제 UI 대체 아님 |
| LP27-H04 | 관측 반례 oracle | 중간 누락/중복·EOS·관측 부재 | 비대상: 도구 | 비대상: 도구 | 비대상: UI 없음 |
| LP27-H05 | 진단 종료/격리 | 소유 root·thread·port/probe | 비대상: 도구 | 비대상: 도구 | 비대상: UI 없음 |
| LP27-H06 | 미재현/실패 판정 | 관측과 제품PASS 구분 | 비대상: 도구 | 비대상: 도구 | 비대상: UI 없음 |
| LP27-D01 | 내부 로그 안전 분류 | drain/frame/clamp 숫자·미등록/악성 반례 | 비대상: 단기 도구 | 비대상: 단기 도구 | 비대상: UI 없음 |
| LP27-D02 | 진단 관측 수명/상한 | overflow·미확인·NULL/handler 정리 | 비대상: 단기 도구 | 비대상: 단기 도구 | 비대상: UI 없음 |
| LP27-D03 | 일반 입력 burst | normal20 동일 AU·EOS/PTS/내부 순서 | 비대상: 단기 진단 | S11 영향 판정 별도 | 비대상: UI 없음 |
| LP27-D04 | 일반 입력 paced | normal20 DTS 간격·EOS/PTS/내부 순서 | 비대상: 단기 진단 | S11 영향 판정 별도 | 비대상: UI 없음 |
| LP27-D05 | B-frame burst | bframe30 PTS 누락/중복과 clamp 대응 | 비대상: 단기 진단 | S11 영향 판정 별도 | 비대상: UI 없음 |
| LP27-D06 | B-frame paced | bframe30 DTS 간격·EOS 전후 구분 | 비대상: 단기 진단 | S11 영향 판정 별도 | 비대상: UI 없음 |
| LP27-M01 | 한정 디코더 후보 제외 | HW-MP01~15·MH01~12, exact platform/plugin/version/codec | S11 media cut | S11 source lifecycle | 비대상: 내부 선택 |
| LP27-M02 | 일반 입력 보존 | HW-MI01/02 PTS·선택·EOS 별도 | S11 media cut | S11 source lifecycle | 실제 UI는 별도 |
| LP27-M03 | B-frame 시간 보존 | HW-MI03/04 PTS·선택·EOS 별도 | S11 media cut | S11 source lifecycle | 실제 UI는 별도 |
| LP27-M04 | 빌드 경계 | 전체 build·GST OFF 컴파일 | 비대상: 빌드 | 비대상: 빌드 | 비대상: UI 없음 |
| LP27-R01 | 유한 EOS 반복 반례 | HW-RP01~16 N/B 전체 대응·선택64 | S11 media cut | S11 source lifecycle | 실제 UI 별도 |
| LP27-R02 | 타 코덱 지원 | HW-CC01~03 입력3종/출력 H264·H265 | S11 media cut | S11 source lifecycle | 실제 UI 별도 |
| LP27-R03 | URI 자동 선택 | HW-UC01~03 실제 uridecodebin | S11 source lifecycle | S11 source lifecycle | 실제 UI 별도 |
| LP27-R04 | 선택 정책 자원 영향 | HW-RS01~05 동일 입력 단기 비교 | S11 자원 | S11 자원·유지 | 비대상: 내부 비용 |
| LP27-R05 | 영향 검사 판정 반례 | HW-RF01~12·DC01~08·IO03, RTP 계수·fallback 관측 | 비대상: 검사 자체 | 비대상: 검사 자체 | 비대상: UI 없음 |
| LP27-R06 | 기존 미디어 관련 회귀 | HW-MEDIA01~03 codec67·ICE8·격리/정리 | S11 media cut | S11 source lifecycle | 이번 브라우저 제외, 릴리즈 별도 |

## 초기 녹화 요구의 고정 식별 등록

LP27부터 아래 41개 qualified requirement ID를 고정한다. 기존 기능의 세부 요구 식별이며
986개 legacy 기능 총계에 새 제품 기능으로 합산하지 않는다. 원문·정확 assertion/명령은
[현행 실행 연결 2절](release-artifacts/v4.1.0/s11-preparation-mapping/lp26-current-execution-map.md)이 유일한 매핑 본문이다.
등록은 과거 실행 증거 소급 복원이나 전체 PASS가 아니다. 최초 실패/legacy 한계는 보존한다.

| 요구 ID | 안정화 | 30분 | 120분 | UI |
| --- | --- | --- | --- | --- |
| S01/opaque | 현행 실행 연결 2절의 exact runner·oracle | S11 공통 녹화/수명 관측 | 공통 및 녹화 전용 유지·보존/복구 | 내부 계약 비대상; 표출은 S06/3D exact UI 별도 |
| S01/time | 현행 실행 연결 2절의 exact runner·oracle | S11 공통 녹화/수명 관측 | 공통 및 녹화 전용 유지·보존/복구 | 내부 계약 비대상; 표출은 S06/3D exact UI 별도 |
| S01/additive | 현행 실행 연결 2절의 exact runner·oracle | S11 공통 녹화/수명 관측 | 공통 및 녹화 전용 유지·보존/복구 | 내부 계약 비대상; 표출은 S06/3D exact UI 별도 |
| S01/lifecycle | 현행 실행 연결 2절의 exact runner·oracle | S11 공통 녹화/수명 관측 | 공통 및 녹화 전용 유지·보존/복구 | 내부 계약 비대상; 표출은 S06/3D exact UI 별도 |
| S01/golden | 현행 실행 연결 2절의 exact runner·oracle | S11 공통 녹화/수명 관측 | 공통 및 녹화 전용 유지·보존/복구 | 내부 계약 비대상; 표출은 S06/3D exact UI 별도 |
| S01/tombstone | 현행 실행 연결 2절의 exact runner·oracle | S11 공통 녹화/수명 관측 | 공통 및 녹화 전용 유지·보존/복구 | 내부 계약 비대상; 표출은 S06/3D exact UI 별도 |
| S02/disabled | 현행 실행 연결 2절의 exact runner·oracle | S11 공통 녹화/수명 관측 | 공통 및 녹화 전용 유지·보존/복구 | 내부 계약 비대상; 표출은 S06/3D exact UI 별도 |
| S02/policy | 현행 실행 연결 2절의 exact runner·oracle | S11 공통 녹화/수명 관측 | 공통 및 녹화 전용 유지·보존/복구 | 내부 계약 비대상; 표출은 S06/3D exact UI 별도 |
| S02/H264 | 현행 실행 연결 2절의 exact runner·oracle | S11 공통 녹화/수명 관측 | 공통 및 녹화 전용 유지·보존/복구 | 내부 계약 비대상; 표출은 S06/3D exact UI 별도 |
| S02/VP8 | 현행 실행 연결 2절의 exact runner·oracle | S11 공통 녹화/수명 관측 | 공통 및 녹화 전용 유지·보존/복구 | 내부 계약 비대상; 표출은 S06/3D exact UI 별도 |
| S02/GOP | 현행 실행 연결 2절의 exact runner·oracle | S11 공통 녹화/수명 관측 | 공통 및 녹화 전용 유지·보존/복구 | 내부 계약 비대상; 표출은 S06/3D exact UI 별도 |
| S02/split | 현행 실행 연결 2절의 exact runner·oracle | S11 공통 녹화/수명 관측 | 공통 및 녹화 전용 유지·보존/복구 | 내부 계약 비대상; 표출은 S06/3D exact UI 별도 |
| S02/rollback | 현행 실행 연결 2절의 exact runner·oracle | S11 공통 녹화/수명 관측 | 공통 및 녹화 전용 유지·보존/복구 | 내부 계약 비대상; 표출은 S06/3D exact UI 별도 |
| S02/queue | 현행 실행 연결 2절의 exact runner·oracle | S11 공통 녹화/수명 관측 | 공통 및 녹화 전용 유지·보존/복구 | 내부 계약 비대상; 표출은 S06/3D exact UI 별도 |
| S02/partial | 현행 실행 연결 2절의 exact runner·oracle | S11 공통 녹화/수명 관측 | 공통 및 녹화 전용 유지·보존/복구 | 내부 계약 비대상; 표출은 S06/3D exact UI 별도 |
| S03/idempotency | 현행 실행 연결 2절의 exact runner·oracle | S11 공통 녹화/수명 관측 | 공통 및 녹화 전용 유지·보존/복구 | 내부 계약 비대상; 표출은 S06/3D exact UI 별도 |
| S03/tail | 현행 실행 연결 2절의 exact runner·oracle | S11 공통 녹화/수명 관측 | 공통 및 녹화 전용 유지·보존/복구 | 내부 계약 비대상; 표출은 S06/3D exact UI 별도 |
| S03/corruption | 현행 실행 연결 2절의 exact runner·oracle | S11 공통 녹화/수명 관측 | 공통 및 녹화 전용 유지·보존/복구 | 내부 계약 비대상; 표출은 S06/3D exact UI 별도 |
| S03/sqlite | 현행 실행 연결 2절의 exact runner·oracle | S11 공통 녹화/수명 관측 | 공통 및 녹화 전용 유지·보존/복구 | 내부 계약 비대상; 표출은 S06/3D exact UI 별도 |
| S03/FK | 현행 실행 연결 2절의 exact runner·oracle | S11 공통 녹화/수명 관측 | 공통 및 녹화 전용 유지·보존/복구 | 내부 계약 비대상; 표출은 S06/3D exact UI 별도 |
| S03/orphan | 현행 실행 연결 2절의 exact runner·oracle | S11 공통 녹화/수명 관측 | 공통 및 녹화 전용 유지·보존/복구 | 내부 계약 비대상; 표출은 S06/3D exact UI 별도 |
| S03/rebuild | 현행 실행 연결 2절의 exact runner·oracle | S11 공통 녹화/수명 관측 | 공통 및 녹화 전용 유지·보존/복구 | 내부 계약 비대상; 표출은 S06/3D exact UI 별도 |
| S04/oldest | 현행 실행 연결 2절의 exact runner·oracle | S11 공통 녹화/수명 관측 | 공통 및 녹화 전용 유지·보존/복구 | 내부 계약 비대상; 표출은 S06/3D exact UI 별도 |
| S04/class | 현행 실행 연결 2절의 exact runner·oracle | S11 공통 녹화/수명 관측 | 공통 및 녹화 전용 유지·보존/복구 | 내부 계약 비대상; 표출은 S06/3D exact UI 별도 |
| S04/protection | 현행 실행 연결 2절의 exact runner·oracle | S11 공통 녹화/수명 관측 | 공통 및 녹화 전용 유지·보존/복구 | 내부 계약 비대상; 표출은 S06/3D exact UI 별도 |
| S04/unlink | 현행 실행 연결 2절의 exact runner·oracle | S11 공통 녹화/수명 관측 | 공통 및 녹화 전용 유지·보존/복구 | 내부 계약 비대상; 표출은 S06/3D exact UI 별도 |
| S04/journal | 현행 실행 연결 2절의 exact runner·oracle | S11 공통 녹화/수명 관측 | 공통 및 녹화 전용 유지·보존/복구 | 내부 계약 비대상; 표출은 S06/3D exact UI 별도 |
| S04/free | 현행 실행 연결 2절의 exact runner·oracle | S11 공통 녹화/수명 관측 | 공통 및 녹화 전용 유지·보존/복구 | 내부 계약 비대상; 표출은 S06/3D exact UI 별도 |
| S04/blocked | 현행 실행 연결 2절의 exact runner·oracle | S11 공통 녹화/수명 관측 | 공통 및 녹화 전용 유지·보존/복구 | 내부 계약 비대상; 표출은 S06/3D exact UI 별도 |
| S04/resume | 현행 실행 연결 2절의 exact runner·oracle | S11 공통 녹화/수명 관측 | 공통 및 녹화 전용 유지·보존/복구 | 내부 계약 비대상; 표출은 S06/3D exact UI 별도 |
| S04/tombstone | 현행 실행 연결 2절의 exact runner·oracle | S11 공통 녹화/수명 관측 | 공통 및 녹화 전용 유지·보존/복구 | 내부 계약 비대상; 표출은 S06/3D exact UI 별도 |
| S04/expected | 현행 실행 연결 2절의 exact runner·oracle | S11 공통 녹화/수명 관측 | 공통 및 녹화 전용 유지·보존/복구 | 내부 계약 비대상; 표출은 S06/3D exact UI 별도 |
| S04/inflight | 현행 실행 연결 2절의 exact runner·oracle | S11 공통 녹화/수명 관측 | 공통 및 녹화 전용 유지·보존/복구 | 내부 계약 비대상; 표출은 S06/3D exact UI 별도 |
| S04/retry | 현행 실행 연결 2절의 exact runner·oracle | S11 공통 녹화/수명 관측 | 공통 및 녹화 전용 유지·보존/복구 | 내부 계약 비대상; 표출은 S06/3D exact UI 별도 |
| S04/path | 현행 실행 연결 2절의 exact runner·oracle | S11 공통 녹화/수명 관측 | 공통 및 녹화 전용 유지·보존/복구 | 내부 계약 비대상; 표출은 S06/3D exact UI 별도 |
| S04/invalid | 현행 실행 연결 2절의 exact runner·oracle | S11 공통 녹화/수명 관측 | 공통 및 녹화 전용 유지·보존/복구 | 내부 계약 비대상; 표출은 S06/3D exact UI 별도 |
| S04/dirfd | 현행 실행 연결 2절의 exact runner·oracle | S11 공통 녹화/수명 관측 | 공통 및 녹화 전용 유지·보존/복구 | 내부 계약 비대상; 표출은 S06/3D exact UI 별도 |
| S04/isolation | 현행 실행 연결 2절의 exact runner·oracle | S11 공통 녹화/수명 관측 | 공통 및 녹화 전용 유지·보존/복구 | 내부 계약 비대상; 표출은 S06/3D exact UI 별도 |
| S04/partial-reserve | 현행 실행 연결 2절의 exact runner·oracle | S11 공통 녹화/수명 관측 | 공통 및 녹화 전용 유지·보존/복구 | 내부 계약 비대상; 표출은 S06/3D exact UI 별도 |
| S04/event-admission | 현행 실행 연결 2절의 exact runner·oracle | S11 공통 녹화/수명 관측 | 공통 및 녹화 전용 유지·보존/복구 | 내부 계약 비대상; 표출은 S06/3D exact UI 별도 |
| S04/projection | 현행 실행 연결 2절의 exact runner·oracle | S11 공통 녹화/수명 관측 | 공통 및 녹화 전용 유지·보존/복구 | 내부 계약 비대상; 표출은 S06/3D exact UI 별도 |

## LP26 현행 검증 준비 사전등록

개별 정의: [LP26 준비 기록](release-artifacts/v4.1.0/s11-preparation-mapping/lp26-verifier-preparation.md).
등록은 PASS가 아니며 도구 준비와 실제 영역 실행을 분리한다.

| ID | 기능 | 안정화 | 30분 | 120분 | UI |
| --- | --- | --- | --- | --- | --- |
| LP26-O01 | 현행 원장 compact 관측 | native parser/반례 | 비대상: 도구 자체검사 | 현행 관측 준비, 실행 별도 | 비대상: UI 없음 |
| LP26-O02 | bounded 읽기/교체 | 경로·부분행·prefix/손상 | 비대상: 도구 자체검사 | 현행 관측 준비, 실행 별도 | 비대상: UI 없음 |
| LP26-O03 | 영속 순서 진행 | ID/epoch/UTC 역행·unknown/삭제 | 비대상: 도구 자체검사 | 현행 관측 준비, 실행 별도 | 비대상: UI 없음 |
| LP26-O04 | 시간/자원 관측 | duration/stall/PID/표본 반례 | 비대상: 도구 자체검사 | 현행 관측 준비, 실행 별도 | 비대상: UI 없음 |
| LP26-O05 | 장시간 실행 연결 | 단기/120분 구분·정리 | 비대상: 도구 자체검사 | 실제 실행 별도 | 비대상: UI 없음 |
| LP26-O06 | 녹화 장시간 저장량 원인 구분 | 격리 root의 제품·입력·도구 비용 분리, 상한 직전/실패 측정, SQLite 페이지 관측, symlink·hardlink 거부와 비민감 출력 자체검사 | 비대상: 도구 자체검사 | 동일 120분의 측정 근거로 사용, 실행 별도 | 비대상: UI 없음 |
| LP26-R01 | 삭제된 bound 원본의 SQLite 중복 투영 회수 | 삭제 완료와 같은 SQL 전이에서 SQLite binding 행을 제거하고, JSONL·내부 상세 증거와 ID·재시도·복구 의미를 유지. SQLite/JSONL 재기동 및 checkpoint 반례 | 관련 저장 회귀·build | 기존 30분 영향 판정 필요 | 녹화 120분 재실행 대상 | 비대상: 내부 저장 |
| LP26-R02 | 삭제된 bound 원장 행의 가역 물리 압축 | 삭제 완료된 상세 행만 checkpoint에서 zlib로 압축, 논리 ID·순서·원본 증거와 재생성·손상 거부 유지. macOS/Linux 필수 의존성과 기존 원장 호환 확인 | 압축/복원·손상·crypto-off·checkpoint/복구 회귀·build | 기존 30분 영향 판정 필요 | 녹화 120분 재실행 대상 | 비대상: 내부 저장 |
| LP26-R03 | 삭제 영수증의 중복 투영 회수·가역 압축 | 원장 논리 tombstone을 유지하고 checkpoint 물리 행만 압축. SQLite에는 ID·사유·시각의 최소 영수증만 저장하며 재구축·중복/손상 거부 유지 | 삭제 전후 SQLite/원장 바이트·논리 동일성·재기동·손상·checkpoint 및 기존 보존 회귀 | 기존 30분 영향 판정 필요 | 녹화 120분 재실행 대상 | 비대상: 내부 저장 |
| LP26-O07 | 입력 fixture 생성 실패 진단 | 생성기 exit·signal·timeout·출력 상한·오류 종류를 비민감하게 구분하는 자체검사 | 비대상: 검증 준비 | 실제 실행 전 입력 선수조건, 장시간 PASS 아님 | 비대상: UI 없음 |
| LP26-O08 | 누적 원장 native 관측 실패 구분 | 동일 입력 규모에서 종료·시간초과·출력 상한·손상 행을 분리하고 물리 압축 행의 논리 복원을 자체검사. 원문·경로 비노출 | 비대상: 검증기 자체검사 | 실제 120분 재개 전 진단 경계 | 비대상: UI 없음 |
| LP26-U01 | UI seed 소유/옵션 | 준비 자체검사 | 비대상: seed | 비대상: seed | 실제 실행 별도 |
| LP26-U02 | UI 시각 근거 | 문자열/null/불연속 | 비대상: seed | 비대상: seed | 실제 실행 별도 |
| LP26-U03 | 파생 다중출력 | complete/partial/hash | 비대상: seed | 비대상: seed | 실제 실행 별도 |
| LP26-U04 | 페이지/우선순위 | 100초과/겹침 | 비대상: seed | 비대상: seed | 실제 실행 별도 |
| LP26-U05 | 오류 상태 | 손상/삭제/미생성 | 비대상: seed | 비대상: seed | 실제 실행 별도 |
| LP26-U06 | seed 복구 | 재개방/원장 불변 | 비대상: seed | 비대상: seed | 실제 실행 별도 |
| LP26-U07 | 인증 준비 | UA01~08 | 비대상: seed | 비대상: seed | 실제 실행 별도 |
| LP26-U08 | seek 준비 | SF01~06/실제 MP4 | 비대상: seed | 비대상: seed | 실제 실행 별도 |
| LP26-M01 | 기능 실행 연결 | 매핑·명령·oracle 대조 | S11 확정 후 | S11 확정 후 | S11 확정 후 |

## LP25 시간 표시 단위·완료 관측 순차 마감

LP25-C10: 현행 통합 HTTP producer 총계(auth40/lifecycle10) 수용·구형/부정확 총계 거부.
안정화는 Node focused/통합이며, 30분·120분·UI는 비대상(단기 검증 도구, UI 없음).

중앙 테스트 기록의 LP25가 실행 정의다. 등록만으로 PASS가 아니다. 저장 시간·완전성 판정을 바꾸지 않는다.

| ID | 기능 | 안정화 | 30분 | 120분 | UI |
| --- | --- | --- | --- | --- | --- |
| LP25-T01 | 기본 mapping 응답 호환 | 기존 ID/total/JSON/페이지 유지 | S11 최종cut | S11 최종cut | 비대상: API 선택 계약 |
| LP25-T02 | opt-in 파일별 미배치 표시 | 그룹 ID/페이지/UTC null | S11 최종cut | S11 최종cut | 비대상: 이번 UI 변경 없음 |
| LP25-T03 | 구성원 시간 근거 보존 | ID/PTS/품질/불연속·실제 누락 보존 | S11 최종cut | S11 최종cut | 비대상: API 선택 계약 |
| LP25-T04 | 파일·작업·상태 경계 | known/unknown·다른 파일/placeholder 분리 | S11 최종cut | S11 최종cut | 비대상: API 선택 계약 |
| LP25-T05 | 이벤트·재생 불변 | complete/partial·동일 실제 파일·unknown 미숨김 | S11 최종cut | S11 최종cut | S11 실제 UI는 별도 미실행 |
| LP25-T06 | query·권한 | 잘못된 단위400/권한403 우선 | S11 최종cut | S11 최종cut | 비대상: HTTP |
| LP25-T07 | 손상·삭제·복구 | 재생 거부/삭제 상태·재개방 동일 | S11 최종cut | S11 최종cut | 비대상: 내부/HTTP |
| LP25-T08 | 자원·페이지 상한 | 기존4096 known/64MiB·4352 unknown 구성원/파일 페이지 | S11 최종cut | S11 최종cut | 비대상: 내부/HTTP |
| LP25-O01 | 페이지별 완료 관측 | total 변경과 별도로 동일 job 완료 보존 | 비대상: 단기 도구 | 비대상: 단기 도구 | 비대상: 내부 도구 |
| LP25-O02 | 혼합 상태·계보 | ready/complete 혼합·다른 참조/작업/실패 거부 | 비대상: 단기 도구 | 비대상: 단기 도구 | 비대상: 내부 도구 |
| LP25-O03 | 시간제한·HTTP 오류 | 완료30초/HTTP4초 유지·후속 오류 보존 | 비대상: 단기 도구 | 비대상: 단기 도구 | 비대상: 내부 도구 |
| LP25-O04 | 전체 페이지 독립 판정 | total 변화 실패/누락/중복·완전2출력 조건 유지 | 비대상: 단기 도구 | 비대상: 단기 도구 | 비대상: 내부 도구 |


## LP24 복구 호출 내 중복 처리 사전등록

중앙 LP24-R의 exact 제목/반례가 실행 정의다. 등록은 PASS가 아니다.

| ID | 기능 | 안정화 | 30분 | 120분 | UI |
| --- | --- | --- | --- | --- | --- |
| LP24-R01 | 최초 strict 검증 | parse/손상 거부 | S11 최종cut | S11 최종cut | 비대상: 내부 저장 |
| LP24-R02 | 적용 재사용 | parse 감소·전이 유지 | S11 최종cut | S11 최종cut | 비대상: 내부 저장 |
| LP24-R03 | SQLite 재투영 재사용 | exact 내용·canonical | S11 최종cut | S11 최종cut | 비대상: 내부 저장 |
| LP24-R04 | 저장 동등성 | SQLite/JSONL/파일 bytes | S11 최종cut | S11 최종cut | 비대상: 내부 저장 |
| LP24-R05 | 새 Open | fresh strict 검증 | S11 최종cut | S11 최종cut | 비대상: 내부 저장 |
| LP24-R06 | envelope 결박 | 모든 필드별 변조 거부 | S11 최종cut | S11 최종cut | 비대상: 내부 저장 |
| LP24-R07 | ordinal/중복 | 충돌·물리 순서 | S11 최종cut | S11 최종cut | 비대상: 내부 저장 |
| LP24-R08 | 과거 상태 보존 | Ready/Complete 치환 거부 | S11 최종cut | S11 최종cut | 비대상: 내부 저장 |
| LP24-R09 | 상태·보호 | 예약/source/삭제/hold | S11 최종cut | S11 최종cut | 비대상: 내부 저장 |
| LP24-R10 | 원장 변경 | 무효화·strict 손상 거부 | S11 최종cut | S11 최종cut | 비대상: 내부 저장 |
| LP24-R11 | pending | strict 복구 유지 | S11 최종cut | S11 최종cut | 비대상: 내부 저장 |
| LP24-R12 | 상한/할당 | bounded admission·strict fallback | S11 최종cut | S11 최종cut | 비대상: 내부 저장 |
| LP24-R13 | 호출 수명 | 성공/실패/예외 해제 | S11 최종cut | S11 최종cut | 비대상: 내부 저장 |
| LP24-R14 | noncanonical | 기존 SQL bytes | S11 최종cut | S11 최종cut | 비대상: 내부 저장 |
| LP24-R15 | 실제 크기 | 6source/4job 출력 증거 | 비대상: 단기 fixture | 비대상: 단기 fixture | 비대상: 내부 검사 |
| LP24-R16 | 15초 cold 진단 | 실제 비용·RSS·정리 | 비대상: 단기 비용 | 비대상: 단기 비용 | 비대상: 내부 검사 |
| LP24-RH01 | RED/GREEN·현실규모 판정 도구 | exact 제목/합계/counter·거짓 PASS/RED·비교 timeout 구분 | 비대상: 단기 도구 | 비대상: 단기 도구 | 비대상: 내부 검사 |
| LP24-RH02 | 준비 전용 실행계획 | legacy/native 준비와 복구 phase 분리 | 비대상: 단기 도구 | 비대상: 단기 도구 | 비대상: 내부 검사 |
| LP24-RH03 | 안전진단 필드·비밀 거부 | 상태/고정 오류·unknown/null·누락/중복/임의원문 거부 | 비대상: 단기 도구 | 비대상: 단기 도구 | 비대상: 내부 검사 |
| LP24-RH04 | native 준비 경로·증거 결박 | 실제 worker와 profile/원본2/파일증거2/출력계획2 대조 | 비대상: 단기 도구 | 비대상: 단기 도구 | 비대상: 내부 검사 |
| LP24-RH05 | 실패/진단 누락 판정 | 실제 실패와 진단 관측 분리·timeout/누락 거부 | 비대상: 단기 도구 | 비대상: 단기 도구 | 비대상: 내부 검사 |
| LP24-R15-L | legacy 준비 진단 | 동일 입력 첫 작업·안전한 실패코드 확보 | 비대상: 단기 fixture | 비대상: 단기 fixture | 비대상: 내부 검사 |
| LP24-R15-N | native 준비 | 6원본/4작업/8출력·24전이·파일 hash | 비대상: 단기 fixture | 비대상: 단기 fixture | 비대상: 내부 검사 |

## LP23 사후 진단·원인 분석 사전등록

| ID | 기능 | 안정화 | 30분 | 120분 | UI |
| --- | --- | --- | --- | --- | --- |
| LP23-D01 | 복구 단계 계측 | 순서/단조 시각/누락/cap/timeout 자체검사 | 비대상: 단기 진단 도구 | 비대상: 단기 진단 도구 | 비대상: 내부 도구 |
| LP23-D02 | 비민감·격리 | 고정 enum/소유 복제본/경로·링크 거부 | 비대상: 단기 진단 도구 | 비대상: 단기 진단 도구 | 비대상: 내부 도구 |
| LP23-D03 | 15초 병목 구분 | 같은 자료의 journal/preflight/SQLite/query 계측 | 비대상: 원인 구분 | 비대상: 원인 구분 | 비대상: 내부 도구 |
| LP23-D04 | 엄격 상태 진단 | JSONL 비교·원래 실패 보존·모드 구분 | 비대상: 원인 구분 | 비대상: 원인 구분 | 비대상: 내부 도구 |
| LP23-D05 | 불변·정리 | 원본/source/build hash·자식 종료·temp 정리 | 비대상: 단기 진단 도구 | 비대상: 단기 진단 도구 | 비대상: 내부 도구 |

중앙 LP23 정의가 실행 범위다. 실제 앱·재기동·UI·릴리즈 PASS를 부여하는 도구가 아니다.

| ID | 기능 | 안정화 | 30분 | 120분 | UI |
| --- | --- | --- | --- | --- | --- |
| LP23-U01 | 동일 cadence | 기존 writer 직접 검사 | 비대상: 진단 | 비대상: 진단 | 비대상: 내부 도구 |
| LP23-U02 | 시계 안정/관측 지터 | unknown 쌍 원인 분리 | 비대상: 진단 | 비대상: 진단 | 비대상: 내부 도구 |
| LP23-U03 | UTC jump | 앞/뒤 이동과 media divergence 구분 | 비대상: 진단 | 비대상: 진단 | 비대상: 내부 도구 |
| LP23-U04 | PTS 중복/역행 | unknown 안전장치 | 비대상: 진단 | 비대상: 진단 | 비대상: 내부 도구 |
| LP23-U05 | clock 부재/손상 | 추정 생성 금지 | 비대상: 진단 | 비대상: 진단 | 비대상: 내부 도구 |
| LP23-U06 | 오차 경계 | 2ms 및1ns 초과 | 비대상: 진단 | 비대상: 진단 | 비대상: 내부 도구 |
| LP23-U07 | 세그먼트 재시작 | mapping/anchor 분리 | 비대상: 진단 | 비대상: 진단 | 비대상: 내부 도구 |
| LP23-U08 | mapping/끝 상한 | unknown tail 유지 | 비대상: 진단 | 비대상: 진단 | 비대상: 내부 도구 |
| LP23-U09 | 실입력 관측 | 250프레임 delta·writer 판정·정리 | 비대상: 진단 | 비대상: 진단 | 비대상: 내부 도구 |

## LP22 완료 관측 진단 사전등록

LP22-R 요청 내 검증 내용 재사용(제품 수정 전 정의): 공개DTO/저장/파일검사/hold 계약 불변.

| ID | 기능 | 안정화 | 30분 | 120분 | UI |
| --- | --- | --- | --- | --- | --- |
| LP22-R01 | 실제2출력 fixture | 기존 PrepareMedia 직접 생성/선수 확인 | S11최종cut판정 | S11최종cut판정 | 비대상: 내부소유 |
| LP22-R02 | 결과 동등 | strict/context 전수DTO·파일 hash | S11최종cut판정 | S11최종cut판정 | 비대상: 내부소유 |
| LP22-R03 | 중복검증 제거 | 동일job2출력 Parse횟수5→1 | S11최종cut판정 | S11최종cut판정 | 비대상: 내부소유 |
| LP22-R04 | 다음요청 재획득 | 이전 후보도 현재 원장 envelope·출처·상태 검사 뒤에만 재사용; 동일 후보 본문 재파싱은 생략 가능 | S11최종cut판정 | S11최종cut판정 | 비대상: 내부소유 |
| LP22-R05 | 정리·보호 | 성공/실패/예외 hold0, 요청-local 해제 및 별도 완료 후보 8건·8MiB 상한 | S11최종cut판정 | S11최종cut판정 | 비대상: 내부소유 |
| LP22-RH01 | focused 판정 결박 | RED/GREEN제목·summary·Parse실제횟수 | 비대상: 단기도구 | 비대상: 단기도구 | 비대상: 단기도구 |
| LP22-RH02 | focused 거짓PASS거부 | summary누락·다른실패·중단/신호/정리불명 | 비대상: 단기도구 | 비대상: 단기도구 | 비대상: 단기도구 |
| LP22-R06 | 재사용기원·원문 | saved변경/current교체/동일resident무효기원 각각 | S11최종cut판정 | S11최종cut판정 | 비대상: 내부소유 |
| LP22-R07 | 현재상태·소유 | state/thin/source/path/중복owner/deleted 각각 | S11최종cut판정 | S11최종cut판정 | 비대상: 내부소유 |
| LP22-R08 | 최적화예산·할당 | byte/job상한/할당예외 각각strict복귀 | S11최종cut판정 | S11최종cut판정 | 비대상: 내부소유 |
| LP22-R09 | 손상·정리 | 실파일/매체예외/원장동일size/권위분리 각각 | S11최종cut판정 | S11최종cut판정 | 비대상: 내부소유 |

| 기능 ID | 항목 | 안정화 | 30분 | 120분 | UI |
| --- | --- | --- | --- | --- | --- |
| LP22-T01 | 진단opt-in/비민감 | off/invalid/고정필드/hash/카나리 | S11최종cut판정 | S11최종cut판정 | 비대상: 내부진단 |
| LP22-T02 | 상태·시간 | 4참조분리·실제내구전이·late완료 | S11최종cut판정 | S11최종cut판정 | 비대상: 내부진단 |
| LP22-T03 | 유한증거 | count/byte/부분행/시각cap·loss·부분보존 | S11최종cut판정 | S11최종cut판정 | 비대상: 내부진단 |
| LP22-T04 | projection 비용 | request별media/overlap/page·반환불변 | S11최종cut판정 | S11최종cut판정 | 비대상: 내부진단 |
| LP22-O01 | 페이지관측 | callback동등·offset/상태/주기 | S11최종cut판정 | S11최종cut판정 | 비대상: 검증기 |
| LP22-O02 | 총계변경 | 재시작사유·기존거부 | S11최종cut판정 | S11최종cut판정 | 비대상: 검증기 |
| LP22-O03 | 상태혼합 | 동일total의ready/complete·거짓완료거부 | S11최종cut판정 | S11최종cut판정 | 비대상: 검증기 |
| LP22-O04 | 시각·timeout | fake clock·시계축분리·late완료 | S11최종cut판정 | S11최종cut판정 | 비대상: 검증기 |
| LP22-O05 | 일반실패선택 | 대상참조·pending/누락분리 | S11최종cut판정 | S11최종cut판정 | 비대상: 검증기 |
| LP22-O06 | 사후진단·정리 | 실패보존·complete상세·정리오류노출 | S11최종cut판정 | S11최종cut판정 | 비대상: 검증기 |

세부 실행전정의/결과는 중앙 LP22에 기록한다. 기존공개schema·HTTP/페이지·녹화정책을 바꾸는 기능이 아니다.

## LP21 누적·동시 비용 확인 사전등록

| 기능 ID | 항목 | 안정화 | 30분 | 120분 | UI |
| --- | --- | --- | --- | --- | --- |
| LP21-Q01 | 대기보호 조회 비용 | 전체16/32·관련2개 정상fixture, quiet/동시쓰기·전체 반환canonical·thread별 잠금/비용 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 검증 |
| LP21-Q02 | 동시 쓰기·복귀 관측 | 유한 public Apply·조회수/변경수/복귀수·최장 잠금·인위대기 분리·관측 누락 거부 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 검증 |
| LP21-Q03 | 조회 보호·수명 | 보호2개 삭제거부·해제·raw 불변·반환독립·상세비상주, 기존8cap 유지 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 검증 |
| LP21-Q04 | 계측 정확성 | thread별 metric 활성/수집·합계/최장 구분·출력/요약 누락 거부, 기존순차출력 유지 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 검사 도구 |

기존 LP20-C04의sources/2-job, P0-HTTP02와S11-CI07~11을 재사용한다. 중앙 LP21 실행 전 정의·결과가 source-of-truth다.
이 등록은 실행PASS가 아니며 전체16/32 일반조회와 관련2개 보호조회 결과를 서로 대체하지 않는다.

## LP20 저장·조회 비용과 종료 판정 사전등록

| 기능 ID | 항목 | 안정화 | 30분 | 120분 | UI |
| --- | --- | --- | --- | --- | --- |
| LP20-C01 | 적격 자동 checkpoint | 과거 Parse/Serialize 생략·raw 검증·bytes/투영 동등 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |
| LP20-C02 | 원문·권한 거부 | 같은 크기 변조/잘림/교체/오래된 owner·참조 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |
| LP20-C03 | 엄격 fallback | noncanonical/빈줄/중복/receipt/pending/미적용/crypto-off/큰 행 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |
| LP20-C04 | 공동 비용·수명 | 작은/2-job/16·32·삭제/재open, 비상주·RSS·잠금·raw 읽기 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |
| LP20-Q01 | 전체 관련 조회 | 모든 binding·canonical 반환 및 중복 검증 비용 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |
| LP20-Q02 | 조회 보호 | 변조/삭제/lease·출력 초기화·독립 값·무관 후보 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |
| LP20-X01 | actual-app 종료 | 실제 정상 producer2개·2포트씩·강제없음 수용 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 검증기 |
| LP20-X02 | 잘못된 종료 거부 | legacy-only·누락·비정상/강제/포트/archive 실패 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 검증기 |

실행 전 정의·세부 명령·실제 결과는 중앙 `release-test-records.md` LP20을 따른다. 등록은 PASS가 아니다.

## LP18 typed 상세 자동 수명 사전등록

| 기능 ID | 항목 | 안정화 | 30분 | 120분 | UI |
| --- | --- | --- | --- | --- | --- |
| LP18-R01 | 비활성 상세 자동 해제 | binding·terminal live/shadow·journal의 실제 weak 만료, 내구 내용 보존 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |
| LP18-R02 | 활성·독자 소유 보호 | active job/예약·원본 보호, 전이 전 반환 owned 값 수명 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |
| LP18-R03 | 조회·저장 불변 | 전체 canonical/원장 bytes·public 값 독립·읽기 후 bytes 동일 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |
| LP18-R04 | cold typed 재획득·독자 | strict canonical·일시 소유·기존 reader의 손상 우회 금지·전체 snapshot 독립 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |
| LP18-R05 | 선택·보호 색인 | 무관 binding/job 상세 읽기 없음·active 예약/보호 유지 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |
| LP18-R06 | 재open·삭제 이력 | SQLite/fallback strict 복구 후 inactive 해제·active 보호·삭제 binding 증거 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |
| LP18-R07 | cold 실패 전달 | detach/변조/획득 예외 out 초기화·불확실·public CP false; 일반 projection 예외는 기존 unwind/재시도 유지 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |
| LP18-R08 | 해제·CP 비용 | 세대별 suffix 방문·교체 cursor reset·cold CP 읽기 관측과 의미 유지 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |
| LP18-R09 | resident fallback | raw/기존 대형 append/crypto-off resident 유지·기존 상한 불변 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |
| LP18-R10 | 비상주 계측 자체검사 | 논리 samples 유지·cold/active resident 수·외부 reader 소유 제외 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 계측 |
| LP18-R11 | 조회 상한·저장 불확실 분리 | 실제 Collector 상한 실패 후 authority/정상 append 유지 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |

초기8+추가22+계측3+상한1=기본34개와 crypto-off1개, cache suite의 일반/불확실 projection 예외2개의 exact 정의는 중앙 LP18 기록을 따른다. 등록은 PASS가 아니다.

## LP18 accepted·prefix 비상주 소비 사전등록

| 기능 ID | 항목 | 안정화 | 30분 | 120분 | UI |
| --- | --- | --- | --- | --- | --- |
| LP18-L26 | sealed view와 입력 결박 | 같은 Read/Append·물리 중복 순서·6필드 반례·raw fallback·receipt retry | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |
| LP18-L27 | accepted/prefix 소유 수명 | live/shadow/prefix strong 해제·transient cold 획득·전체값/바이트 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |
| LP18-L28 | 참조 소비 권한 | shadow 현재 attachment·foreign/detach/동일 주소 재attach 거부 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |
| LP18-L29 | 수용·복구 의미 | canonical 충돌·ordinal/full canonical SQLite gate·SQLite/fallback 재open | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |
| LP18-L30 | 재사용·실패 경계 | cache mismatch 전체 replay·실제 손상 failclosed·예외 출력 clear·cold prefix N회 read | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |
| LP18-L31 | 논리량과 실제 strong 소유 계측 | weak 논리량/strong0·fallback1·동일 fallback2참조/1실체 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 검증 계측 |

중앙 LP18 기록의 exact30개와 기존 관련 회귀를 적용한다. typed binding/job·자동 해제는 후속 단위다.

## LP18 논리 기록 참조 기반 사전등록

| 기능 ID | 항목 | 안정화 | 30분 | 120분 | UI |
| --- | --- | --- | --- | --- | --- |
| LP18-L21 | 논리 참조·비상주 획득 | 물리 중복 행 구분·전체값/독립 Replay·owned 수명·대형/crypto-off fallback | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 CLI |
| LP18-L22 | append/예약 불변성 | 기존 참조 유지·재시도 행수/바이트/예약번호 불변 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 CLI |
| LP18-L23 | checkpoint 참조 게시 | no-write/recover-only 유지·전체필드 동일행만 유지·receipt 새참조·이전독자 생존 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 CLI |
| LP18-L24 | 참조 권한·변조 거부 | null/foreign/oldlineage/fork 거부·raw변조/절단/inode교체 failclosed | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 CLI |
| LP18-L25 | 할당 실패 원자성 | append/예약 durable뒤 poison·재open/재시도·checkpoint 교체전 실패 원본보존·Acquire out초기화 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 CLI |

원출력별26개 정의/결과는 중앙 LP18 기록을 따른다. 자동 RAM 수명 완료가 아니다.

## LP18 저장 기준 디코더 검증 보완

| 기능 ID | 항목 | 안정화 | 30분 | 120분 | UI |
| --- | --- | --- | --- | --- | --- |
| LP18-WR-OR01 | 전체 PTS 기준 | 실제 WR05 공통 판정 helper의 정상·동일 개수/첫PTS이지만 중간 중복/누락 반례 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 격리 CLI |
| LP18-WR-OR02 | 입력 기반 예상값 | 입력 observation PTS의 presentation 정렬·정상 duplicate PTS 보존. catalog 결과를 기대값으로 사용하지 않음 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 격리 CLI |
| LP18-WR-OR03 | 엄격한 기준 디코딩 | 명시 avdec_h264(output-corrupt=false)/vp8dec 실제 factory 확인·시작/bus/손상/시간값/EOS/상한 실패 거부 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 격리 CLI |
| LP18-WR-OR04 | 실제 실패 경로 | writer 정상 파일 복제본 truncate 거부·원본 hash 불변, 미가용 decoder의 실제 pipeline 생성 실패·자동 fallback 없음 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 격리 CLI |

자동선택 HW WD01~08의 FAIL/미확인은 유지한다. 현재 등록은 실행 전 정의이며 PASS가 아니다.

## LP18 writer 경계 진단 사전등록

| 기능 ID | 항목 | 안정화 | 30분 | 120분 | UI |
| --- | --- | --- | --- | --- | --- |
| LP18-WD01 | 동일 입력·파일 근거 | WR01/WR05 packet 시간/크기/hash, catalog·파일 전후 hash 일치 관측 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 격리 CLI |
| LP18-WD02 | 실제 디코딩 경계 | 자동 선택 demux/parser/decoder의 buffer·SEGMENT·EOS, 제한128행·누락 명시 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 격리 CLI |
| LP18-WD03 | 디코딩 종료 분류 | PLAYING 반환·appsink 수치·bus 안전 오류·고정 종료 이유, 기존 oracle/시간제한 불변 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 격리 CLI |
| LP18-WD04 | 진단 출처·정리 | source/환경/실행 시각·44개 결과·소유 root 삭제 확인 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 격리 CLI |
| LP18-WD05 | 동일 파일 반복 대조 | 한번 생성4파일 최대16round·최초실패중단·각 count/EOS/WR05 PTS/SHA | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 격리 CLI |
| LP18-WD06 | decoder 실패 경계 | 같은실패파일 software1회대조·기존FAIL 유지·미가용미실행 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 격리 CLI |
| LP18-WD07 | 미재현 종료 | 미재현exit3·원인해소PASS금지·기록/정리·다음단계보류 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 격리 CLI |
| LP18-WD08 | WR05 독립 경계 | WD05가WR01에서중단된 뒤 WR05파일만같은16회상한·최초실패시SW1회대조. WR01원인으로소급확정금지 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 격리 CLI |

관측 정의이며 실행/PASS가 아니다. 중앙 기록의 2026-09-20 LP18 잔여1~3을 따른다.

## LP18 불변 소유 첫 구현 사전등록

| 기능 ID | 기능 | 안정화 | 30분 | 120분 | UI |
| --- | --- | --- | --- | --- | --- |
| LP18-O01 | envelope 공유/외부 값 분리 | 호출-local 원본/후보 공유·prefix sealed lineage/전체값과 Replay 변경의 내부 불변 확인 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |
| LP18-O02 | receipt 치환 | 기존 envelope 불변, 변경 기록만 신규 소유, 영속 바이트·projection 동등성 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |
| LP18-O03 | 후보/원장 경쟁 | 후보 이후 append/예약/owner 변경 시 오래된 후보 게시 거부 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |
| LP18-O04 | 캐시 내용/순서 변조 | 전체 필드·payload/ID 충돌·순서·축소·null handle 반례, 기존 전체 검증 경계 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |
| LP18-O05 | 공유 보관 입장 | 64MiB/8192 논리 상한 유지, 외부 반환값 계약·fallback | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |
| LP18-O06 | 복구와 영향 | 중단/pending/SQLite·JSONL·2-job·손상/전이 거부 및 build | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |
| LP18-O07 | accepted 원장 출처 공유 | 정상 append·live·shadow의 sealed lineage와 canonical, public Replay 독립 값·cold 비상주 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |
| LP18-O08 | accepted 복구와 투영 | 동일 managed snapshot의 preflight/live 소유, SQLite·JSONL 재open 및 최초 수용 ordinal gate | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |
| LP18-O09 | accepted 결박·실패 | 모든 envelope 필드 불일치 거부, 실패 apply 미등록, canonical 중복/충돌 거부·prepared 의미 유지 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |
| LP18-O10 | typed binding 공유 | checkpoint 새 적용 ID의 warm reader 공유, no-op reader 유지·삭제 이력 canonical·전체 map 재비교 금지 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |
| LP18-O11 | binding 반환·바이트 | public Find/Snapshot 값 독립성·canonical/원장 bytes 유지 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |
| LP18-O12 | binding 거부·수명 | 같은 ID 변경/identity 불일치 거부, 삭제 뒤 내부 증거 유지, null·부적합 재사용 엄격 fallback | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |
| LP18-O13 | binding 복구 | SQLite/JSONL 재open·독립 full replay 의미 동등성, shadow owner 수명 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |
| LP18-J01 | 현재 job 불변 소유 | live/checkpoint의 명시 warm reader 공유·cold strict 재획득, 과거 상태를 현재값으로 대체 금지 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |
| LP18-J02 | Prepared 게시·수명 | prior/검증후 record/applied 소유를 구분, 같은 호출 한 번 게시와 SQL projection 수명 유지 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |
| LP18-J03 | job 반환·전이 안전 | public snapshot 값 독립, foreign owner/stale prior/reuse·불법 전이 거부, 보호/재생/timeline 유지 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |
| LP18-J04 | job 복구·바이트 | SQLite/JSONL full replay·Ready/Complete·실파일·예약/hold·전이 canonical 동등성 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |
| LP18-V01 | 호출-local 내용 증명 | strict Prepared→append/apply→자동 checkpoint의 같은 immutable 내용 Parse 재사용. 전수 이력 증명 저장 금지 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |
| LP18-V02 | 내용 증명 부적격 fallback | 다른 owner/journal·stale current·다른 envelope/전체 필드·null은 기존 strict 입력 검증으로 복귀 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |
| LP18-V03 | shadow 상태 독립 검증 | 잘못된 prior/예약/source 삭제·보호 조건은 유효 내용 증명과 무관하게 거부 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |
| LP18-V04 | 증명 수명·복구 | owner 밖/cache 보관 없음, manual/recovery/새 입력 strict와 공개 값·저장 bytes 유지 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |
| LP18-E01 | envelope 전체 비교 | count/순서/null/전체필드/제어문자/int64/공백·동일 부적격 입력의 비교 의미 유지. 비교는 strict semantic 검증 아님 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |
| LP18-E02 | 비교 중복 문자열 제거 | 두 SameSequence overload가 전체값을 비교하고 envelope 직렬화0 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |
| LP18-E03 | checkpoint 후보 게시 | stale/변조 후보 거부·receipt 원본/실제 저장 bytes·projection·pending/복구 의미 유지 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |
| LP18-E04 | checkpoint byte 생성 재사용 | 현재 expected/candidate 전체값 대조 뒤 JournalBytes1회. strict/FS/소유/상한 불변 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |
| LP18-I01 | 작업 단위 내부 검증 | 실제 작업의 각 상태 canonical/출력·hash와 공개 호출 최초 strict 검증 유지 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |
| LP18-I02 | Intent 분석 결과 재사용 | 공개 Serialize/Parse·BuildReady 호출 안의 Validate/Restore/Json 각1회, 단일입력 context는 외부/영속 재사용 금지 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |
| LP18-I03 | 새 입력·부적격 증거 | 동일주소 변경 후 새 호출 strict·manifest/receipt/AU/coverage 거부·실패 output 초기화/기존cap·오류 유지 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |
| LP18-T01 | 전이 입력 엄격성 | 실제2출력5회 update의 public Parse 각1회·완전 출력/hash/보호 해제 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |
| LP18-T02 | 동등 불가능 기록 비교 | state/files 개수로 canonical 불일치가 확정되면 Record 중복 생성 생략. 엄격 파싱한 incoming canonical만 재사용 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |
| LP18-T03 | 동일 가능 후보와 전이 거부 | cold retry strict 재획득·same-shape full 비교, immutable Intent/Ready 역전이/불완전 receipt/잘못된 payload 거부·전체값/내구 bytes 유지 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |

등록은 실행/PASS가 아니다. 전체 승인 범위와 실제 수행/미수행은 중앙 기록 LP18을 따른다.

| 기능 ID | 기능 | 안정화 | 30분 | 120분 | UI |
| --- | --- | --- | --- | --- | --- |
| LP18-C01 | 검증된 Intent의 호출-local 대조 | 실제5전이·독립 전이에서 strict Parse 유지, Apply Validate/Restore 각1회 및 전체 Json 대조 유지 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |
| LP18-C02 | 대조 신뢰 경계 | noncanonical·공개 사본 변경·null prior 거부, malformed/immutable/상태·proof/Prepared fallback 기존 회귀 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |
| LP18-L01 | 내구 위치 재획득 | 기존 JSONL 행별 offset/길이·raw hash·strict 내용 및 owned 반환 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |
| LP18-L02 | 위치/세대·retry | 빈줄/블록/공백/중복 행·Append/Reserve retry·checkpoint 교체/no-write/recover-only | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |
| LP18-L03 | 재획득 안전 경계 | 다른 owner/journal/fork/stale/null·동일 길이 변조/truncate/inode·실패 outclear/poison | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |
| LP18-L04 | 물리 행 복원 | 빈줄/공백/64KiB블록 교차·반복 ID 물리 순서/토큰 분리 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |
| LP18-L05 | 위치 교체와 소유 수명 | no-write/recover-only/receipt swap·stale·old owned 수명·원래 retry 값 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |
| LP18-L06 | 위치 접근 권한 | null/owner/journal/fork 거부·outclear·정상 부모 상태 유지 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |
| LP18-L07 | 위치 파일 손상 | 같은 길이 변조/줄임/inode 교체 poison·빈 출력·기존 owned 값 불변 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |
| LP18-L08 | 큰 기록의 기존 지원 | 16MiB 초과 Append/retry의 resident fallback·동일 값·행 무증가. cold 재획득 대상 아님 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |
| LP18-L09 | 위치 자원 예외 | Append/Reserve 내구write 뒤 poison/재open, CP write전 기존 세대 유지, Acquire outclear/poison | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |
| LP18-L10 | 암호화 미사용 지원 | 별도 crypto-off 빌드의 managed Append/Acquire/retry·기존 checkpoint 거부. resident 반환만 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |

## LP18 journal cold 재획득 기반

| 기능 ID | 기능 | 안정화 | 30분 | 120분 | UI |
| --- | --- | --- | --- | --- | --- |
| LP18-L11 | journal 비상주 재획득 | 명시 private release·weak 소멸·owner/원장 불변 확인 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |
| LP18-L12 | journal 비상주 재획득 | 위치에서 strict 재획득·기존 owned reader/공개 Replay 독립값·재open 확인 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |
| LP18-L13 | journal 비상주 재획득 | 원래 retry·충돌 거부·예약 sequence·물리 행수 확인 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |
| LP18-L14 | journal 비상주 재획득 | cold 후보·no-write/recover-only/실제 swap·이전 reader 및 checkpoint 묶음에서 행별 원문 재검증·시작/끝 결박 확인 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |
| LP18-L15 | journal 비상주 재획득 | cold 손상/예외의 poison·outclear·정상 빈 결과와 구분하고 checkpoint 묶음의 동일 길이 변조·inode 교체·세대 불일치 거부 확인 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |
| LP18-L16 | journal 비상주 재획득 | 큰 기록의 기존 resident fallback과 원장 불변 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |

## LP18 호출-local checkpoint 원본

| 기능 ID | 기능 | 안정화 | 30분 | 120분 | UI |
| --- | --- | --- | --- | --- | --- |
| LP18-L17 | snapshot 소유·불변 | private 봉인·외부 vector 독립·호출 종료 weak 소멸·물리 중복/비정규 입력 유지 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |
| LP18-L18 | snapshot 읽기 재사용 | cold 최초1회·Prepare/Commit 추가0·null strict fallback·실제 catalog 전체 흐름 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |
| LP18-L19 | snapshot 무효화·후보 검증 | append/예약/동일주소 재attach/foreign/receipt 교체·후보9종 반례·no-write/recover bytes | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |
| LP18-L20 | snapshot 오류 격리 | 명시 Acquire의 실제 행 tamper 검사·획득 예외 outclear/poison | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부 저장 |

## LP17 누적 비용·보관 계약의 계획된 검사

LP19는 같은 LP17-D01~07을 현재 typed 수명 구현에서 재실행한다. 관측 출력만 손실 없이 축약하는
LP19-H01(31열 왕복/기존 형식), H02(손상 거부), H03(실제 작은 비교)을 먼저 검증한다.
안정화: 이번 실행 대상. 30분/120분: S11 최종cut 별도 판정·이번 미실행. UI: 비대상(내부 계측).
실행 전 정의·단계별 사실은 `release-test-records.md`의 LP19를 따른다.

아래는 설계 등록이며 구현/실행/PASS가 아니다. 진단 축·oracle는 구현계획 LP17, 저장 반례는 누적 비용 계약을 따른다.
구체 runner 작성 시 실제 명령/실행 경로를 연결해야 하며 기존 테스트 증거로 자동 충족하지 않는다.

| 기능 ID | 기능 | 안정화 | 30분 | 120분 | UI |
| --- | --- | --- | --- | --- | --- |
| LP17-D01 | 기존 보관 기준군 | 설계·미실행 | 이번 미실행 | 이번 미실행 | 비대상: 진단 |
| LP17-D02 | 테스트 기대값 보관 분리 | 독립 바이트 oracle 설계·미실행 | 이번 미실행 | 이번 미실행 | 비대상: 진단 |
| LP17-D03 | 캐시 대조군 | 소유 복제본 설계·미실행 | 이번 미실행 | 이번 미실행 | 비대상: 진단 |
| LP17-D04 | 소유량/RSS 구별 | 관측 정합 설계·미실행 | 이번 미실행 | 이번 미실행 | 비대상: 진단 |
| LP17-D05 | 삭제/checkpoint 잔존 | 보관 수명 설계·미실행 | 이번 미실행 | 이번 미실행 | 비대상: 진단 |
| LP17-D06 | 새 프로세스 재개방 | SQLite/JSONL 동등성 설계·미실행 | 이번 미실행 | 이번 미실행 | 비대상: 진단 |
| LP17-D07 | 실패 증거·정리 | 소유/상한/불변 설계·미실행 | 이번 미실행 | 이번 미실행 | 비대상: 진단 |
| LP17-D08 | 실제 크기 2-job 전이 대조 | 기존 독립 fixture 재사용·설계·미실행 | 이번 미실행 | 이번 미실행 | 비대상: 내부 진단, HTTP/UI 대체 불가 |
| LP17-C01 | owner/내용/세대 오용 | 부적합 캐시 전체 검증 복귀·실제 충돌 거부 설계·미실행 | 구현 후 S11 영향 판정 | 구현 후 S11 영향 판정 | 비대상: 내부 저장 |
| LP17-C02 | no-op과 pending | 반례 설계·미실행 | 구현 후 S11 영향 판정 | 구현 후 S11 영향 판정 | 비대상: 내부 저장 |
| LP17-C03 | 후보/게시 경쟁·중단 | 반례 설계·미실행 | 구현 후 S11 영향 판정 | 구현 후 S11 영향 판정 | 비대상: 내부 저장 |
| LP17-C04 | RAM 내림/재획득과 영구 회수 | 사용 중 값·상세 의무·역사 영수증 구별 설계·미실행 | 구현 후 S11 영향 판정 | 구현 후 S11 영향 판정 | 비대상: 내부 저장 |
| LP17-C05 | 손상/누락/fallback | 반례 설계·미실행 | 구현 후 S11 영향 판정 | 구현 후 S11 영향 판정 | 비대상: 내부 저장 |
| LP17-C06 | 누적·반복 보존 삭제 | 반례 설계·미실행 | 구현 후 S11 영향 판정 | 구현 후 S11 영향 판정 | 비대상: 내부 저장 |
| LP17-C07 | 캐시 상한/eviction | 반례 설계·미실행 | 구현 후 S11 영향 판정 | 구현 후 S11 영향 판정 | 비대상: 내부 저장 |
| LP17-C08 | 원본/작업 전이 부하 | 별도 workload 설계·미실행 | 구현 후 S11 영향 판정 | 구현 후 S11 영향 판정 | 비대상: 내부 진단, 실제 UI 대체 불가 |

LP17-DOC01~04 문서 검사는 중앙 release-test-records.md의 개별 정의/결과를 따른다.

LP17 실행 준비 추가 등록: `LP17-H01~11`은 비교 runner의 판정 분리·누락/변조 거부·프로세스 상한·정리·입력 불변 자체검증이다.
안정화 대상이며 30분/120분은 이번 미실행, UI는 비대상(내부 진단)이다. 개별 정의와 실행 상태는 중앙 기록을 따른다.

## LP16 메모리 측정 경계 사전등록

| 기능 ID | 기능 | 안정화 | 30분 | 120분 | UI |
| --- | --- | --- | --- | --- | --- |
| LP16-M01 | 자기 프로세스 메모리 계측 | macOS 단위·단계·누락/오류 거부 | 이번 미실행 | 이번 미실행 | 비대상: 검증 도구 |
| LP16-M02 | 컴파일과 fixture 분리 | 개별 실행 exit/peak 및 단계별 current/peak | 이번 미실행 | 이번 미실행 | 비대상: 검증 도구 |
| LP16-M03 | 기존 oracle 유지 | 173개 기능·계측·상한·정리 | 이번 미실행 | 이번 미실행 | 비대상: 검증 도구 |
| LP16-M04 | 발생 구간과 최소 보완 판정 | 수명·관측 대조 후 필요한 영향 회귀 | 이번 미실행 | 이번 미실행 | 비대상: 내부 경계 |

실행 정의와 결과는 release-test-records.md의 LP16을 따른다. 등록은 실행 PASS가 아니다.

## LP15 체크포인트 증분 검증 사전등록

| 기능 ID | 기능 | 안정화 | 30분 | 120분 | UI |
| --- | --- | --- | --- | --- | --- |
| LP15-C01 | 정확prefix/증분·무효화 | 전체/증분 동등성·필드/순서/축소 반례 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부저장 |
| LP15-C02 | 큰작업전이/자동checkpoint | 실제source증거·상태전이·적용횟수·비용 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부저장 |
| LP15-C03 | 변경후보·복구 | 손상/중단/commit오류·SQLite/fallback | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부저장 |
| LP15-C04 | 보관상한 | 64MiB/8192 경계·overflow·peakRSS | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부저장 |
| LP15-C05 | 누적비용 | 동일16/32원본·복구bytes·job전이별도 | S11 최종cut 판정 | S11 최종cut 판정 | 비대상: 내부저장 |
| LP15-A01 | 실제앱HTTP | 선수PASS후 latency-only 4초 기준 | 이번미실행 | 이번미실행 | 이번미실행 |

실행 source-of-truth: release-test-records.md의 LP15. 현재는 등록이며 PASS가 아니다.

LP14-C01~04: 동일잠금·동일전이의canonical검증재사용, context오용거부·내구/복구/기존서비스회귀. 중앙LP14 3단계정의. 안정화: 신규focused·jobs/service/validation·build. 30분/120분: 이번미실행·S11 별도. UI: 내부재사용 비대상, API/실제앱은4단계.

LP14-D01~04: 종료 정상 판정과 프로세스/포트 회수·진단 안전성을 분리한다. exact 정의는 중앙 LP14. 안정화: 종료 helper/실제 격리 자식·기존 진단 회귀. 30분/120분: 이번 미실행. UI: 검증기 내부 비대상. 비정상 종료는 FAIL 유지.

LP13-T01~05: 검증 opt-in 시간/잠금소유/HTTP순번 동시 관측, 기본off·경합·중첩·상한·실제연결. 중앙 LP13 2단계 정의 참조. 안정화: 전용C++/JS 및 관련회귀·build. 30분/120분: 이번 미실행. UI: 내부계측 비대상. 계측PASS를 실제운영 지연PASS로 대체하지 않는다.

LP13-P01~05: HTTP 실패와 독립된 참조 선등록·범용 사후 상태·정리 보존 경계·비노출/회귀. exact 정의는 중앙 LP13 사전등록. 안정화: 격리 Node/C++ probe 단위. 30분/120분: 이번 미실행. UI: 검증기 내부 비대상. 준비 PASS가 제품 생성/지연 PASS가 아님.

LP12-F01~05: 실제 AVC writer·명시 입력 framing·거부 경계·회귀·실제 앱 생성 확인. 중앙 LP12-F 사전등록 참조. 안정화: AVC/capture/file-evidence/JS/build 후 실제 단기1회. 30분/120분: 이번 미실행·S11 영향판정 별도. UI: 내부 수집 비대상, 실제 UI PASS 대체 불가.

LP12-C01~07: file evidence 최초 실패 단계·고정 코드·원자 보존, 실제 수락/거부 동작 불변. 중앙 LP12-C 표 참조. 안정화: capture smoke/JS/file-evidence 회귀/빌드 후 실제앱 단기1회. 30분/120분: 이번 미실행·S11 영향판정 별도. UI: 내부 계측 비대상.

LP12-D01~07: 원본 catalog/intent projection 구별·전체 후보·writer 안전 코드·진단 연결. 중앙 LP12 정의 참조. 안정화: 진단 단위 및 동일 실제 앱 단기1회. 30분/120분: 이번 미실행. UI: 내부 진단 비대상. 실제 생성 해결은 별도 결과로 판정한다.

LP11-T01~06: 유효 대기 예산 전환·절대상한·시퀀스·안전 오류 보존·파서/runner 연결. 중앙 LP11 진단 준비 표 참조. 안정화: Node 단위 검사. 30분/120분: 이번 미실행. UI: 내부 검증기이므로 비대상.

LP11-01~04: 누적16/32 비용·실제 HTTP·완전2출력/재기동·정리. 기존 LP02/S11-CI07~11의 현행 코드 실행이며 exact 정의/명령은 중앙 LP11 표. 안정화: 이번 순차 실행 대상. 30분/120분: 최종 S11 별도 판정·이번 미실행. UI: 이번 API/서버 검사로 실제 브라우저 PASS 대체 불가.

LP10-W01~12: 제한 원본 대기·공정 평가·runtime lease·snapshot 보존. exact 정의는 중앙 LP10 표. 안정화: focused 및 관련 integration/native/default/jobs. 30분/120분: S11 코드 고정 후 영향 판정·별도 승인(이번 미실행). UI: 내부 backend 비대상; 실제 UI PASS를 주장하지 않는다.

LP09-N01~08/S01~03/Q01~03: 정확native구간 산술·관측 identity 선택/내구 소비·queued 최초증거갱신. S03 하위 exact 사례는 중앙 S03a(job codec), S03b(실제 생성), S03c(내구 복구)다. 중앙LP09 개별 정의에 연결. 안정화 대상, 30분/120분은 최종 변경 영향 판정 별도이며 이번 실행 제외, UI 비대상(내부 계산/worker). 산술 PASS는 파일 인증/제품 공통 소비 PASS가 아니다. S01~03은 중앙 정의가 먼저 존재했으나 이 색인의 명시 ID가 누락되어 보완했다. 보완 전 S01~02 RED 실행은 기능 증거로 사용하지 않고 등록 후 다시 확인한다.

LP09-D01/T01~02/W01~08/J01~02: 공통 소비 계약 문서·worker 재평가 시도 안전 계측·실제 참조 결박. 개별 정의는 중앙 기록 LP09. 안정화 대상, 30분/120분은 이번 개발실행 범위 밖(최종영향판정별도), UI 비대상(내부관측). 기록계측만으로 제품원인해결/완전출력 PASS를 만들지 않는다.

LP08-A01~03/B01~03/C01: completed partial의 typed 선택·파일 구간 증거, 안전 보존·정리 차단·실제 연결 및 단기 앱 진단. 개별 정의는 중앙 기록의 LP08 절이다. 안정화 대상; 30분/120분은 이번 범위 밖, UI 비대상(내부 진단/HTTP). 기존 failed 미재현과 별개로 선택 부족·파일 부족을 분류하며 제품 변경은 원인 확정 후 추가 등록한다.

LP07-01~04: 보완 실제앱 단기진단→조건부원인확정/수정→보류 작업 재개. 중앙 기록 2026-09-17 LP07 정의를 따른다. 안정화 대상, 30분/120분/UI는 이번 실행 범위 밖. 실제앱1회 결과 없이 후속 PASS 금지.

LP06-A01~08/B01~10: 진단 선보존/재현 오류·시간초과/진단 오류/보존 실패/정리 경계/파일 안전성/상세 수집 분리/환경·deadline/실제 typed 출력 연결. 중앙 기록의 2026-09-17 실행 전 정의를 따른다. 안정화 자체검사 대상, 30분·120분 이번 범위 밖, UI 비대상(내부 검증기). 실제앱 실행·제품 실패원인 확정은 별도다.

LP05-01~07: 실패코드 typed fixture/unknown redaction/복제본 격리/겹치는 원본 전수 관측/실제 실패입력 확보/독립재현/원인수정. 개별 정의는 중앙 release-test-records의 보완 진단 절을 따른다. 안정화 대상; 30분/120분/UI 이번 범위 밖(제품 수정의 최종 영역 판정은 실제 diff 후 별도).

LP04-A/B: 실패 구간 PTS 지정 gate 자체검사와 실제 1회 재현. 안정화 대상, 30분/120분 비대상(단기 진단), UI 비대상(내부 검증기). 중앙기록의 실패 구간 지정 재현 사전등록 참조.

진단 추가 LP03-A/B/C: 검증기 failed 즉시 중단, 종료 소유 복제본의 C++ Catalog 기반 whitelist 실패 코드 수집, 동일 실제 앱 1회. 안정화 대상; 30분/120분 비대상(이번 진단 범위 밖); UI 비대상(검증 도구). 정의·결과는 `docs/release-test-records.md`의 2026-09-16 실패 사유 제한 진단을 따른다.

### 2026-09-16 잔여 지연 판정

| 기능 ID | 기능/검사 | 안정화 | 30분 | 120분 | UI |
| --- | --- | --- | --- | --- | --- |
| LP01 | 기존 실제HTTP 지연 재측정 | P0-HTTP02 latency-only, 실제전이/4초상한/cleanup | 비대상: 단기 진단 | 비대상: 단기 진단 | 비대상: HTTP만 측정 |
| LP02 | 누적 catalog16/32 | 기존4096 AU 비용fixture, 크기/잠금/checkpoint/정확복구 | 비대상: 단기 진단 | 비대상: 단기 진단 | 비대상: 내부계측 |

### 2026-09-16 3-B 비용 보완

| 기능 ID | 기능/검사 | 안정화 | 30분 | 120분 | UI |
| --- | --- | --- | --- | --- | --- |
| FC01 | 실제 저장 구간 비용 | 잠금·직렬화·journal·SQLite·checkpoint 분리 계측 | 비대상: 개발 계측 | 비대상: 개발 계측 | 비대상: 내부 계측 |
| FC02 | 중복 처리 보완 | 예상 RED/GREEN, 원본·후보 손상 거부 유지 | S11 저장 반복 | S11 저장·복구 추이 | 비대상: 내부 계약 |
| FC03 | 동일 조건 비교 | 기존/새 증거·작은/누적·동일/상이 후보 비교 | 비대상: 개발 비교 | 비대상: 개발 비교 | 비대상: 내부 계약 |
| FC04 | 영향 회귀 | source-binding/write-boundaries/checkpoint/journal/finalize | S11 복구 | S11 복구 | 비대상: 내부 계약 |
| FC05 | build·지원·상한 | 전체 build·FE01~08·VP8·최악 숫자 envelope | S11 녹화 | S11 녹화·자원 | 비대상: 내부 계약 |

### 2026-09-16 4번 제한 대기 사전등록

3-B 합격 후 실행한다. 아래 등록은 구현·실행 완료가 아니며 기존 파생 소비 판정은 유지한다.

| 기능 ID | 기능/검사 | 안정화 | 30분 | 120분 | UI |
| --- | --- | --- | --- | --- | --- |
| WP01 | 요청별 재평가 공정성 | 첫 요청 미확보 중 준비된 두 번째 요청 처리, 단일 실제 미디어 작업 유지 | S11 이벤트 반복 | S11 요청·자원 추이 | 비대상: 내부 worker |
| WP02 | 일시 unavailable | 명시된 provider unavailable은 제한 내 재평가, 잘못된 identity와 구분 | S11 증거 전달 | S11 증거 전달 | 비대상: 내부 worker |
| WP03 | identity·namespace 거부 | 다른 source/channel/generation/namespace 증거를 혼합하지 않음 | 비대상: 결정적 검사 | 비대상: 결정적 검사 | 비대상: 내부 worker |
| WP04 | 절대 마감·시도·큐 상한 | 접수 steady deadline 불변, busy/재접수로 연장하지 않음. 기존60초/32개/121회 경계 | S11 대기·종료 | S11 대기·자원 | 비대상: 내부 worker |
| WP05 | pending 원본 보호 | 기존·대기 중 새 확정 관련 원본의 삭제 예약 거부, 무관 원본은 기존 보존 정책 | S11 보존 경쟁 | S11 보존·용량 | 비대상: 내부 catalog |
| WP06 | Intent 보호 인계 | 내구 Intent 확보 전 임시 보호를 풀지 않음, 인계/실패의 보호·예약 누수 없음 | S11 이벤트·보존 | S11 자원·복구 | 비대상: 내부 catalog |
| WP07 | 취소·종료 | 대기/실행 요청의 stop·drain·동시 종료에서 작업·보호 정리 | S11 lifecycle | S11 cleanup | 비대상: 내부 worker |
| WP08 | 만료·재시작 | 만료 lease의 제한적 수명, 재시작 때 임시 증거를 발명하지 않음. 내구 Intent는 기존 복구 | S11 재기동 | S11 복구 | 비대상: 내부 catalog |
| WP09 | 긴 GOP·미확보 결과 | 실제 원본 확정 뒤 재평가, 상한 내 미확보는 partial/unknown 유지. 시간만으로 complete 금지 | S11 실제 이벤트 | S11 녹화 지속 | 비대상: 내부 worker |
| WP10 | 용량·중복 접수 | 기존 quota/reserve·pin/hold 유지, 포화·중복 요청으로 무제한 예약/보호 생성 금지 | S11 보존·접수 | S11 자원 추이 | 비대상: 내부 worker |

### 2026-09-16 3-B 파일 증거 저장 사전등록

| 기능 ID | 기능/검사 | 안정화 | 30분 | 120분 | UI |
| --- | --- | --- | --- | --- | --- |
| FE01 | 선택적 증거 계약 | 실제 C++ roundtrip/absent 기존 바이트/엄격 필드 | S11 녹화 반복 조건 | S11 저장 추이 조건 | 비대상: 내부 계약 |
| FE02 | 실제 writer capture | accepted 원본/mux/file 내용·native 대응 | S11 녹화 반복 조건 | S11 녹화 지속 조건 | 비대상: 내부 계약 |
| FE03 | native parser 오류 | malformed box/table/edit·overflow·범위·중복 거부 | 비대상: 결정적 검사 | 비대상: 결정적 검사 | 비대상: 내부 계약 |
| FE04 | finalize 원자 결박 | EOS 뒤 파일 hash/Ready/원본 증거가 같은 mutation | S11 복구 조건 | S11 복구 조건 | 비대상: 내부 계약 |
| FE05 | 내구 복구 | SQLite·JSONL fallback·checkpoint·Ready 복구 일치 | S11 복구 조건 | S11 복구 조건 | 비대상: 내부 계약 |
| FE06 | 증거 손상 거부 | identity/hash/ordinal/tick/timescale/field 변조 거부 | 비대상: 결정적 검사 | 비대상: 결정적 검사 | 비대상: 내부 계약 |
| FE07 | 크기·잠금 비용 | 4096 경계, 직렬화 크기, 실제 catalog 전이·checkpoint 시간 기록 | S11 자원 조건 | S11 자원 조건 | 비대상: 내부 계약 |
| FE08 | 기존 지원·비소비 경계 유지 | unsupported/ambiguous/기존 binding의 녹화 유지. 신규 기존-profile job의13필드 projection은 기존 ID/bytes/8원본 상한 유지, 저장 증거는 보존. evidence 포함 job은 full strict | S11 현행 입력 조건 | S11 현행 입력 조건 | 비대상: 내부 계약 |

실행은 3-A 합격 후다. 제품 TDD RED와 준비 실패를 구분하고 중앙 기록에 명령·개별 결과를 보존한다.

### 2026-09-16 실제 forward 대응 사전등록

| 기능 ID | 기능/검사 | 안정화 | 30분 | 120분 | UI |
| --- | --- | --- | --- | --- | --- |
| FW01 | 기본 writer 긴 GOP 250/50 원본·mux·파일 대응 | 수락 input, mux 경계, native file의 내용·시각 대조 | 비대상: 설계 계측 | 비대상: 설계 계측 | 비대상: UI 없어야 정상 |
| FW02 | 분수 FPS 실제 변환 | 30000/1001의 ns/tick forward 관측 | 비대상: 설계 계측 | 비대상: 설계 계측 | 비대상: UI 없어야 정상 |
| FW03 | B-frame 원본 대응 | 내용·PTS/DTS·native CTTS 분리 대조 | 비대상: 설계 계측 | 비대상: 설계 계측 | 비대상: UI 없어야 정상 |
| FW04 | VFR 마지막 길이 | 실제 mux sink duration과 native endpoint 대조 | 비대상: 설계 계측 | 비대상: 설계 계측 | 비대상: UI 없어야 정상 |
| FW05 | 실제 forward 증거의 음성·정확 구간 | 독립적으로 내용·ordinal·시각·native 표를 변조해 거부,⅔ns 미충족·⅓ns overlap 확인 | 비대상: 설계 계측 | 비대상: 설계 계측 | 비대상: UI 없어야 정상 |

제품 수정 PASS가 아닌 3-A 근거 수집 검사다. `bash scripts/internal/recording_forward_probe_run.sh` 예정.
검사별 정의·실행 상태는 중앙 release-test-records의 2026-09-16 절을 따른다.

### 2026-09-15 3-A 변환 식별 가능성 사전등록

| 기능 ID | 기능/검사 | 안정화 | 30분 | 120분 | UI |
| --- | --- | --- | --- | --- | --- |
| MAP-A01 | 실제 TP01 tail50개 원본 ns를 같은 native 표의 서로 다른 rational 위상 두 개가 모두 설명 | `node --test scripts/internal/recording_mapping_ambiguity.test.mjs`, 기존 고정 CSV/JSON 읽기, 두 후보 floor의 실제 원본 일치 | 비대상: 설계 계측 | 비대상: 설계 계측 | 비대상: UI 없어야 정상 |
| MAP-A02 | 첫 파일 끝과 tail 시작은 두 후보에서0 또는1/6ns gap | 동일 명령, 정수ns값은 같아도 rational gap을 구분 | 비대상: 설계 계측 | 비대상: 설계 계측 | 비대상: UI 없어야 정상 |
| MAP-A03 | TP03 PTS 후보 위상을 DTS에 일반화하지 않음 | 동일 명령, nativeDTS0에서candidate floor−1 vs실제원본0 반례 | 비대상: 설계 계측 | 비대상: 설계 계측 | 비대상: UI 없어야 정상 |

### 2026-09-15 시간 정밀도 후보 분리계측 추가 사전등록

| 기능 ID | 기능/검사 | 안정화 | 30분 | 120분 | UI |
| --- | --- | --- | --- | --- | --- |
| NP-T01 | movie 기본/track1e9 긴GOP250+50, edit·원본PTS/DTS 정확성 | `recording_timing_profile_run.sh --track-only`, 실제 count/native 대조 | 비대상: 실험 | 비대상: 실험 | 비대상: UI 없어야 정상 |
| NP-T02 | 동일 profile 분수fps | 동일 명령, native 단위·원본 시작 대조 | 비대상: 실험 | 비대상: 실험 | 비대상: UI 없어야 정상 |
| NP-T03 | 동일 profile B-frame | 동일 명령, CTTS/edit·원본 PTS/DTS 대조 | 비대상: 실험 | 비대상: 실험 | 비대상: UI 없어야 정상 |
| NP-T04 | 동일 profile VFR 및 NP-T04-L 5초간격 한계 | 동일 명령, 마지막길이와 STTS 한계 특성화. 제품 PASS 아님 | 비대상: 실험 | 비대상: 실험 | 비대상: UI 없어야 정상 |

## 시간 구간 3번 선수조건: 신규 ns profile 실험

| 기능 ID | 안정화 | 30분 | 120분 | UI |
| --- | --- | --- | --- | --- |
| NP01 | 실제긴GOP ns profile·MDHD버전·원본시작 | 이번 제외 | 이번 제외 | 비대상: UI 없어야 정상 |
| NP02 | 실제분수fps ns profile·끝점 | 이번 제외 | 이번 제외 | 비대상: UI 없어야 정상 |
| NP03 | 실제B-frame ns profile·CTTS/edit·원본시작 | 이번 제외 | 이번 제외 | 비대상: UI 없어야 정상 |
| NP04 | VFR/마지막70ms·단일delta5초 한계 실험 | 이번 제외 | 이번 제외 | 비대상: UI 없어야 정상 |

검증 전용 실험이며 제품 기능 완료 ID가 아니다. 정의·실제 결과는 release-test-records를 따른다.

## S11 준비 시간 구간 계측·계산 계약

검증 전용이며 제품 완전 판정 수정이 아니다. 개별 실행 정의는 release-test-records의 2026-09-15 시간 구간 절을 따른다.

| 기능 ID | 안정화 | 30분 | 120분 | UI |
| --- | --- | --- | --- | --- |
| TP01 | 실제30fps/GOP250 입력·파일·demux·parser 시각 대조 | 이번 제외 | 이번 제외 | 비대상: UI 없어야 정상 |
| TP02 | 실제30000/1001·마지막 샘플 | 이번 제외 | 이번 제외 | 비대상: UI 없어야 정상 |
| TP03 | 실제B-frame·CTTS·PTS/DTS 재정렬 | 이번 제외 | 이번 제외 | 비대상: UI 없어야 정상 |
| TP04 | 실제VFR·마지막70ms | 이번 제외 | 이번 제외 | 비대상: UI 없어야 정상 |
| TP04-W | 동일 입력/caps writer 앞 parser 분리 계측 | 이번 제외 | 이번 제외 | 비대상: UI 없어야 정상 |
| EP01 | 끝점 변환과 각 항 절삭의1ns 반례 | 이번 제외 | 이번 제외 | 비대상: UI 없어야 정상 |
| EP02 | 분수fps literal 끝점 | 이번 제외 | 이번 제외 | 비대상: UI 없어야 정상 |
| EP03 | 실제1ns 누락 보존 | 이번 제외 | 이번 제외 | 비대상: UI 없어야 정상 |
| EP04 | 샘플별 가변 duration | 이번 제외 | 이번 제외 | 비대상: UI 없어야 정상 |
| EP05 | presentation interval 재정렬 | 이번 제외 | 이번 제외 | 비대상: UI 없어야 정상 |
| EP06 | 마지막 명시 duration·없으면unknown | 이번 제외 | 이번 제외 | 비대상: UI 없어야 정상 |
| EP07 | 무효 시간단위·길이·overflow·변환 거부 | 이번 제외 | 이번 제외 | 비대상: UI 없어야 정상 |
| EP08 | 증거 부족·기존 부분 승격 금지 | 이번 제외 | 이번 제외 | 비대상: UI 없어야 정상 |

## S11 P0 타임라인 지연 진단 — 실행 전 등록

| 기능 ID | 안정화 | 30분 | 120분 | UI |
| --- | --- | --- | --- | --- |
| P0-DIAG01 | HTTP 정상/헤더 실패/본문 실패를 단조 elapsed·phase·고정 route 분류로 관측, URL·query·비밀 미노출 자체검사 | 이번 제외 | 이번 제외 | 브라우저 제외 |
| P0-DIAG02 | 동일 격리 실제 앱1회에서 요청별 header/body/total 지연과 최초 실패 구간 기록. 기존4초/180초/64MiB 제한 유지 | 이번 제외 | 이번 제외 | 브라우저 제외 |
| P0-DIAG03 | 실제 실패의 근거를 분석하여 원인 확정 후 해당 수정·영향검증. 미확정 상태에서 timeout 확대/반복수정 금지 | 최종 코드 고정 후 별도 | 최종 코드 고정 후 별도 | 브라우저 제외 |
| P0-DIAG04 | 헤더 대기1초 초과 시 검증 소유 서버PID만1초 sample, 실행전체1회. 안전 함수스택만 보존하고 sampler/원문/root 정리 | 이번 제외 | 이번 제외 | 브라우저 제외 |
| P0-DIAG05 | 검증 opt-in 임시 서버 stage enter/exit 계측으로 snapshot/파일검사/재확인 경계 분리. 고정 stage·단조elapsed만 보존, 진단후 계측제거 | 이번 제외 | 이번 제외 | 브라우저 제외 |
| P0-DIAG06 | catalog 동일mutex의 wait/held 분리,50ms이상 안전함수명·시간만 해제후 출력. 동작/수명불변, 진단후제거 | 이번 제외 | 이번 제외 | 브라우저 제외 |
| P0-DIAG07 | 긴 UpdateDerivedJob 점유의 순수검증/직렬화 및 append/apply 비용 분리. 임시계측만, 진단후제거 | 이번 제외 | 이번 제외 | 브라우저 제외 |
| P0-CP01 | 실제 H264/managed writer의250 samples 원본으로 Ready/Complete·receipt·파일hash·예약해제 확인, shape/hash와 serialize/parse 각3회측정 | 이번 제외 | 이번 제외 | 비대상: UI 없어야 정상 |
| P0-CP02 | 실제 작업전이로 자동checkpoint 발생 확인, 원본/후보복원·서명비교·commit·전체전이 시간분리. 임시 opt-in계측 최종제거 | 이번 제외 | 이번 제외 | 비대상: UI 없어야 정상 |
| P0-CP03 | 전체요청decoded증거가 있는상태에서 두번째원본 미확정→3750ms예산후partial의 정확구간/이유, Stop후같은증거+source2의complete 대조 | 이번 제외 | 이번 제외 | 비대상: UI 없어야 정상 |
| P0-CP04 | 선형clock mapping1 baseline과 별도로 PTS/duration불변·1ms간격 도착의 합성burst profile에서250mapping 실제크기 Ready/Complete·자동checkpoint 재현. 실제앱clock 원인이라고 단정 안 함 | 이번 제외 | 이번 제외 | 비대상: UI 없어야 정상 |
| P0-CP05 | 정확히 동일한 mutation 후보에서 원본 복원1회·후보 재사용의 임시 계측 RED/GREEN | 이번 제외 | 이번 제외 | 비대상: UI 없어야 정상 |
| P0-CP06 | 내부 canonical 순서 비교의 동일 값 및 같은 길이 다른 payload·순서·개수 음성 | 이번 제외 | 이번 제외 | 비대상: UI 없어야 정상 |
| P0-CP07 | 원본 복원 선행·실패 전파 직접 검토와 공개 경계 불법 replay 거부. checkpoint 내부 불법 원본 직접 주입 미실행 | 이번 제외 | 이번 제외 | 비대상: UI 없어야 정상 |
| P0-CP08 | 변경된 후보의 실제 축약·동등·멱등·SQLite/JSONL·pending 복구·자동 checkpoint 기존 SC 회귀 | 이번 제외 | 이번 제외 | 비대상: UI 없어야 정상 |
| P0-HTTP01 | 지연 전용 관측의 pending/전이 완료·부분 녹화·다른 참조 거부 자체검사. 기존 정확2개 완전 출력 oracle 불변 | 이번 제외 | 이번 제외 | 브라우저 제외 |
| P0-HTTP02 | 최종 제품의 실제 이벤트→전이 완료와 이후5초 timeline HTTP 관측. 기존 요청4초/총180초/정리 상한 유지. 부분 결과는 지연 관측만 가능하며 완전2출력·재기동 PASS가 아님 | 이번 제외 | 이번 제외 | 브라우저 제외 |
| P0-PERF01 | 독립 source 1개·250 samples·45 confirmed slices의 기존 직렬화/복원 비용 측정, canonical 왕복과 source/mapping/identity 손상 거부 기준 고정. 제품 수정 전 baseline | 이번 제외 | 이번 제외 | 비대상: UI 없어야 정상 |
| P0-PERF02 | 동일 호스트·기본 최적화에서 record 직렬화 3회 중앙값 60000us 이하의 명시적 성능 검사, 수정 전 canonical SHA256 및 모든 거부 조건 유지. 다른 환경의 보편 기준 아님 | 이번 제외 | 이번 제외 | 비대상: UI 없어야 정상 |
| P0-ACTUAL01 | 최종 계측 제거 빌드·영향 회귀 후 S11-CI07/08/11 실제 앱 재검증. HTTP4초/전체180초·정확 출력2개/두 번째 기동·원본 복제 불변 조건 유지 | 이번 제외 | 이번 제외 | 브라우저 제외 |
| P0-STATE01 | complete 출력1개도 미완료 유지하면서 안전한 실제 출력 개수 관측 | 이번 제외 | 이번 제외 | 브라우저 제외 |
| P0-STATE02 | pending/partial/complete 상태 변화·최종 상태를 고정 enum/count로 구분 | 이번 제외 | 이번 제외 | 브라우저 제외 |
| P0-STATE03 | ID/path/임의 문자열 미노출·숫자형 요청 구간만 제한 개수로 관측, 실제 trigger/dispatch PTS 상관 | 이번 제외 | 이번 제외 | 브라우저 제외 |

## S11 내부 녹화 증거 전달 보완 — 실행 전 등록

| 기능 ID | 안정화 | 30분 | 120분 | UI |
| --- | --- | --- | --- | --- |
| S11-EV01 | 분석 read DTO 왕복: 동일 결과의 입력 식별·namespace·원본 연관·decoded snapshot 보존. source/frame/PTS가 다른 결과의 증거로 대체하지 않음 | S11 최종 코드 고정 후 영향 판정, 이번 미실행 | S11 최종 코드 고정 후 영향 판정, 이번 미실행 | 비대상: 내부 DTO, 브라우저 제외 |
| S11-EV02 | 실제 rule evaluation 전후 동일 녹화 증거 보존, 기존 이벤트 판정 불변 | 위와 같음 | 위와 같음 | 비대상: 내부 경계 |
| S11-EV03 | canonical/application dispatch projection과 저장 진입 복원에서 동일 증거 전달 | 위와 같음 | 위와 같음 | 비대상: 내부 경계 |
| S11-EV04 | 증거 부재·식별 모순의 기존 연결 거부 유지, 임의 최신 증거 보충 없음 | 위와 같음 | 위와 같음 | 비대상: 내부 경계 |
| S11-EV05 | 불변 snapshot 공유·해제와 기존 history의 snapshot 미보관 유지, collector 크기 제한 불변 | 위와 같음 | 위와 같음 | 비대상: 내부 경계 |
| S11-EV06 | 공개 분석/이벤트 직렬화에 내부 증거 미노출, 기존 application dependency 경계·관련 회귀 유지 | 위와 같음 | 위와 같음 | 브라우저 제외, 직렬화 검사는 UI PASS 아님 |

승인 범위는 내부 전달 누락 보완이며 저장 포맷·녹화/보존 정책·공개 schema 변경은 제외한다. 실제 앱 재검증과 통합 순서는 기존 S11-CI01~11 정의를 유지한다.

## S11 현행 통합 검증 연결 — 실행 전 등록

| 기능 ID | 안정화 | 30분 | 120분 | UI |
| --- | --- | --- | --- | --- |
| S11-CI01 | 현행 순차 실행: HTTP API→인증→전송 수명→default composition→실제 앱. child별 실제 exit·정확 summary·정리 출력 결박 | 비대상: 단기 준비 | 비대상: 단기 준비 | 비대상: 실제 UI 아님 |
| S11-CI02 | 실패 전파: child 실패·출력 한도·누락/중복 summary·cleanup 실패를 거부하고 뒤 단계 notRun. 종료 처리를 검증 결과와 구분 | 비대상: 단기 준비 | 비대상: 단기 준비 | 비대상: 실제 UI 아님 |
| S11-CI03 | 완료 범위 구분: legacy integrationExecutionPass 의미 보존. 새 currentIntegrationExecutionPass만 사용하고 전체 S11·UI·장시간 PASS는 false/미실행 | 비대상: 단기 준비 | 비대상: 단기 준비 | 비대상: 실제 UI 아님 |
| S11-CI04 | 이벤트 상관: 실제 dispatch tuple과 EventRecord ID 연결. 이전 ID·다른 tap/source/rule/track/PTS·복수 후보 거부; 기존 음성 계약 유지 | 비대상: 단기 준비 | 비대상: 단기 준비 | 비대상: 실제 UI 아님 |
| S11-CI05 | 공개 DTO와 복수 출력: 페이지 전체·total/unplacedTotal·itemId 중복 검사. 동일 출력의 다중 mapping 행과 파일 집합 구분, 독립 기대 파일2개. reference/job/Complete·completeness·정밀 문자열 검사 | 비대상: 단기 준비 | 비대상: 단기 준비 | 비대상: 실제 UI 아님 |
| S11-CI06 | 재기동 비교 자체검사: 기존 ID·HTTP bytes/hash 보존 및 새 event/reference/job/output 비중복. 누락·변형·새 생산 부재 거부 | 비대상: 단기 준비 | 비대상: 단기 준비 | 비대상: 실제 UI 아님 |
| S11-CI07 | 실제 앱 이벤트 통합: 소유 입력 source→실제 tap 분석/dispatch→EventRecord→reference/job→출력 파일2개 전체 HTTP. 고정 요청 범위가 정확 두 원본에 교차함을 독립 확인. 소유 regular 파일 bytes/hash 대조 | 비대상: 단기 준비 | 비대상: 단기 준비 | 비대상: 실제 UI 아님 |
| S11-CI08 | 실제 두 번째 기동: 첫 제품 프로세스 정상 종료·HTTP/RTSP 반환→같은 격리 archive 두 번째 제품 실행. 기존 출력 보존과 새 생산을 별도 확인 | 비대상: 단기 준비 | 비대상: 단기 준비 | 비대상: 실제 UI 아님 |
| S11-CI09 | 격리·정리: 외부 환경/ICE 차단·작업 소유 입력/상태/root. 성공/실패/중단의 서버·자식·포트·임시 파일 정리. raw 비밀/URL 미보존 | 비대상: 단기 준비 | 비대상: 단기 준비 | 비대상: 실제 UI 아님 |
| S11-CI10 | 기존 검사 재사용 경계: HTTP API/auth/lifecycle/default focused 실제 실행과 기존 accepted/partial/손상/삭제 검사의 정확 매핑 구분. 합성 seed와 실제 분석 흐름을 서로 대체하지 않음 | 비대상: 단기 준비 | 비대상: 단기 준비 | 비대상: 실제 UI 아님 |
| S11-CI11 | 종료 저장소 복제본 adapter: 공개 DTO에 없는 epoch/generation/order/track을 기존 C++ Catalog로 대조. live/원본 입력 거부·소유 복제본만 Open, 원본 전후 목록/bytes/hash 불변, 정확 두 원본 동일 시간축·정밀 문자열. 복제본 복구 결과를 원본의 복구 전 상태로 주장하지 않음 | 비대상: 단기 준비 | 비대상: 단기 준비 | 비대상: 실제 UI 아님 |

상세 정의·결과는 통합 준비 기록에 보존한다. 사전등록은 실행 PASS가 아니며 최종 S11 검증은 별도다.

## S11 인증 선수조건 보완 — 실행 전 등록

| 기능 ID | 안정화 | 30분 | 120분 | UI |
| --- | --- | --- | --- | --- |
| AUTH-P01 | 실행별 임시값: 서로 다른5개·정책 충족·두 실행 비재사용; 원문 미출력 | 비대상: 준비 경계 | 비대상: 준비 경계 | 비대상: 실제 UI 아님 |
| AUTH-P02 | 상속/추적 차단: inherited 값 무시, xtrace/allexport 차단; child argv/env/log 원문 없음 | 비대상: 준비 경계 | 비대상: 준비 경계 | 비대상: 실제 UI 아님 |
| AUTH-P03 | HTTP 비밀 전달: 실제 transport의 JSON/urlencoded·invite URL·header 의미 보존, curl argv 원문 없음; config escaping 음성 포함 | 비대상: 준비 경계 | 비대상: 준비 경계 | 비대상: 실제 UI 아님 |
| AUTH-P04 | JSON stdin: 빈값/따옴표/역슬래시/개행 JSON quoting 정확, Node argv 원문 없음 | 비대상: 준비 경계 | 비대상: 준비 경계 | 비대상: 실제 UI 아님 |
| AUTH-P05 | 소유권/정리: root0700·민감파일0600, 성공/실패/중단 정리와 정리 실패 비정상exit | 비대상: 준비 경계 | 비대상: 준비 경계 | 비대상: 실제 UI 아님 |
| AUTH-P06 | 서버 격리: env allowlist·상태/미디어 소유root·외부설정 차단. setupRequired=true일 때 ICE 검사를 설정 완료 뒤로 지연, false 즉시 검사·잘못된 응답 거부. double관측과 실제서버 증거 구분 | 비대상: 준비 경계 | 비대상: 준비 경계 | 비대상: 실제 UI 아님 |
| AUTH-P07 | 기존 인증 회귀: bootstrap/users/routes·role/scope/history 기대값 유지; 자체검사 후 격리 실제3모드 별도기록 | 비대상: 준비 경계 | 비대상: 준비 경계 | 비대상: 실제 UI 아님 |
| AUTH-P08 | S06 선수조건: 외부5env 없이 기존 Node memory auth 경로 선택, 기존 read-model/API/lifecycle 순서 유지 | 비대상: 준비 경계 | 비대상: 준비 경계 | 비대상: 실제 UI 아님 |
| AUTH-P09 | 등록기 정합성: operator env 강제조건 제거 후 안전 준비경계 검사, 누락된보안연결 거부 | 비대상: 준비 경계 | 비대상: 준비 경계 | 비대상: 실제 UI 아님 |

개별 명령·예상 RED·실제 결과는 [인증 준비 기록](release-artifacts/v4.1.0/s11-preparation-mapping/auth-preparation.md)에 보존한다. 사전등록은 PASS가 아니다.

S11 준비의 [v4.1.0 테스트 매핑 감사](release-artifacts/v4.1.0/s11-preparation-mapping/README.md)는 등록·소스·실행 연결의 차이를 기록한다. 실행 결과나 전체 coverage 충족 판정이 아니며 기존 ID/총계를 재번호화하지 않는다.

후속 매핑 보완은 감사의 S00~S09 보완 판정과 S10 미결박 분류를 기준으로 읽는다. shared/상위 요구/deprecated/실제 검사 공백을 분리하며 과거 ID를 재사용·재번호화하지 않는다. 제품 테스트는 이번 문서 보완에서 실행하지 않았다.

## S10 3D-3 D HTTP 안정화

실제 최종98행(HTTP85/harness5/seed8), 과거3행은 [D 전수 결과](release-artifacts/v4.1.0/s10-public-consumption/D-results.md)에 보존한다. 브라우저 제외 및 실제 서버 두 번째 기동 미실행을 유지한다.

| 기능 ID | 안정화 | 30분 | 120분 | UI |
| --- | --- | --- | --- | --- |
| D3D-01 | 관리 fixture: D-definition 사전 oracle | 이번 미승인 | S11 최종 영향 대조·이번 미승인 | 실제 브라우저 사용자 제외 |
| D3D-02 | 실제 timeline DTO: D-definition 사전 oracle | 이번 미승인 | S11 최종 영향 대조·이번 미승인 | 실제 브라우저 사용자 제외 |
| D3D-03 | 입력 오류: D-definition 사전 oracle | 이번 미승인 | S11 최종 영향 대조·이번 미승인 | 실제 브라우저 사용자 제외 |
| D3D-04 | 실제 파생 파일: D-definition 사전 oracle | 이번 미승인 | S11 최종 영향 대조·이번 미승인 | 실제 브라우저 사용자 제외 |
| D3D-05 | Range/HEAD: D-definition 사전 oracle | 이번 미승인 | S11 최종 영향 대조·이번 미승인 | 실제 브라우저 사용자 제외 |
| D3D-06 | 인증/권한: D-definition 사전 oracle | 이번 미승인 | S11 최종 영향 대조·이번 미승인 | 실제 브라우저 사용자 제외 |
| D3D-07 | 대용량 유효 파일: D-definition 사전 oracle | 이번 미승인 | S11 최종 영향 대조·이번 미승인 | 실제 브라우저 사용자 제외 |
| D3D-08 | 응답 hold: D-definition 사전 oracle | 이번 미승인 | S11 최종 영향 대조·이번 미승인 | 실제 브라우저 사용자 제외 |
| D3D-09 | 종료/정리: D-definition 사전 oracle | 이번 미승인 | S11 최종 영향 대조·이번 미승인 | 실제 브라우저 사용자 제외 |
| D3D-10 | 내구 시작복구: D-definition 사전 oracle | 이번 미승인 | S11 최종 영향 대조·이번 미승인 | 실제 브라우저 사용자 제외 |
| D3D-11 | harness 보존: D-definition 사전 oracle | 이번 미승인 | S11 최종 영향 대조·이번 미승인 | 실제 브라우저 사용자 제외 |
| D3D-12 | 최종 gate: D-definition 사전 oracle | 이번 미승인 | S11 최종 영향 대조·이번 미승인 | 실제 브라우저 사용자 제외 |

C 화면 소비 사전 정의의 메인 실행 최종29개(기존7/추가22)는 [C 결과](release-artifacts/v4.1.0/s10-public-consumption/C-results.md)에 연결한다. VM/DOM 안정화이며 실제 브라우저 사용자 제외 경계는 유지한다.

### S10 3D-3 B timeline 투영

실행 결과779행과 과거607행은 [B 전수 결과](release-artifacts/v4.1.0/s10-public-consumption/B-results.md)에 보존한다. focused38·구성 self22·직접회귀657·등록기35·정식ID27을 구분하며 실제 브라우저 제외를 유지한다.

| 기능 ID | 안정화 | 30분 | 120분 | UI |
| --- | --- | --- | --- | --- |
| D3B-01 | actual V2 mapping 조회/문자열 시간 | 이번 미승인 | S11 최종 영향 대조·이번 미승인 | 실제 브라우저 사용자 제외 |
| D3B-02 | 400/403/503·채널 권한 | 이번 미승인 | 동일 | C 순수 소비 후속 |
| D3B-03 | UTC0/null/int64/overflow | 이번 미승인 | 동일 | 동일 |
| D3B-04 | stable itemId/복수mapping | 이번 미승인 | 동일 | 동일 |
| D3B-05 | actual 파생 AU/output 투영 | 이번 미승인 | 동일 | 동일 |
| D3B-06 | 부분 overlap 원본 보존 | 이번 미승인 | 동일 | 동일 |
| D3B-07 | wrong lineage/page밖 우선 | 이번 미승인 | 동일 | 동일 |
| D3B-08 | output 현재 불가/완료 분리 | 이번 미승인 | 동일 | 동일 |
| D3B-09 | source 삭제 뒤 UTC 투영 | 이번 미승인 | 동일 | 동일 |
| D3B-10 | unknown 별도 pagination | 이번 미승인 | 동일 | 동일 |
| D3B-11 | 관련/unknown workspace 상한 | 이번 미승인 | 동일 | 동일 |
| D3B-12 | request 축/비노출 | 이번 미승인 | 동일 | 동일 |
| D3B-13 | 출력없는 placeholder/대체 | 이번 미승인 | 동일 | 동일 |
| D3B-14 | 고정 timebase span mismatch/non-integral 미확인 | 이번 미승인 | 동일 | 동일 |
| D3B-15 | read_service 직접 링크 runner11개 및 기존 assertion 회귀 | 이번 미승인 | S11 최종 영향 대조·이번 미승인 | 실제 브라우저 사용자 제외 |
| D3B-16 | D02 승인 종료4경로 static oracle와 source 변형 거부 | 이번 미승인 | S11 최종 영향 대조·이번 미승인 | 비대상: verifier 자체 검사 |

### S10 3D-3 A media 제공

| 기능 ID | 안정화 | 30분 | 120분 | UI |
| --- | --- | --- | --- | --- |
| D3A-01 | 실제 Complete 출력별 fd·bytes/type | 이번 미승인 | S11 최종 영향 대조·이번 미승인 | 실제 브라우저 사용자 제외 |
| D3A-02 | partial 요청 출력 제공·full 구분 | 이번 미승인 | 동일 | 비대상: 내부 media 안전 경계 |
| D3A-03 | channel authorizer/다른 채널 거부 | 이번 미승인 | 동일 | 동일 |
| D3A-04 | orphan/manual Event 거부 | 이번 미승인 | 동일 | 동일 |
| D3A-05 | Ready/Committed 거부 | 이번 미승인 | 동일 | 동일 |
| D3A-06 | fd hold/삭제 경합·release | 이번 미승인 | 동일 | 동일 |
| D3A-07 | 손상/metadata 변경·hold 누수 | 이번 미승인 | 동일 | 동일 |
| D3A-08 | 원본 삭제 후 durable 출력 제공 | 이번 미승인 | 동일 | 동일 |

## S10 3C-5.3a 내구 job 등록

| 기능 ID | 기능·oracle | 안정화 | 30분 | 120분 | UI | 경계 |
| --- | --- | --- | --- | --- | --- | --- |
| S10-J01 | compact job 계약 왕복 | 승인 focused | S11최종판정·이번미실행 | 조건부 진행·S11영향대조·이번미승인 | 비대상: UI 없어야 정상 | 5.3a만 |
| S10-J02 | 멱등 ID와 immutable 충돌 | 승인 focused | S11최종판정·이번미실행 | 조건부 진행·S11영향대조·이번미승인 | 비대상: UI 없어야 정상 | 5.3a만 |
| S10-J03 | 엄격 parser/상한 | 승인 focused | S11최종판정·이번미실행 | 조건부 진행·S11영향대조·이번미승인 | 비대상: UI 없어야 정상 | 5.3a만 |
| S10-J04 | 원자 Intent | 승인 focused | S11최종판정·이번미실행 | 조건부 진행·S11영향대조·이번미승인 | 비대상: UI 없어야 정상 | 5.3a만 |
| S10-J05 | live source 결박 | 승인 focused | S11최종판정·이번미실행 | 조건부 진행·S11영향대조·이번미승인 | 비대상: UI 없어야 정상 | 5.3a만 |
| S10-J06 | generic hold/pin 격리 | 승인 focused | S11최종판정·이번미실행 | 조건부 진행·S11영향대조·이번미승인 | 비대상: UI 없어야 정상 | 5.3a만 |
| S10-J07 | source 상태 경쟁 | 승인 focused | S11최종판정·이번미실행 | 조건부 진행·S11영향대조·이번미승인 | 비대상: UI 없어야 정상 | 5.3a만 |
| S10-J08 | 동일 job 재요청 | 승인 focused | S11최종판정·이번미실행 | 조건부 진행·S11영향대조·이번미승인 | 비대상: UI 없어야 정상 | 5.3a만 |
| S10-J09 | SQLite/fallback/rebuild | 승인 focused | S11최종판정·이번미실행 | 조건부 진행·S11영향대조·이번미승인 | 비대상: UI 없어야 정상 | 5.3a만 |
| S10-J10 | replay/checkpoint | 승인 focused | S11최종판정·이번미실행 | 조건부 진행·S11영향대조·이번미승인 | 비대상: UI 없어야 정상 | 5.3a만 |
| S10-J11 | event 동시quota | 승인 focused | S11최종판정·이번미실행 | 조건부 진행·S11영향대조·이번미승인 | 비대상: UI 없어야 정상 | 5.3a만 |
| S10-J12 | disk 동시예약 | 승인 focused | S11최종판정·이번미실행 | 조건부 진행·S11영향대조·이번미승인 | 비대상: UI 없어야 정상 | 5.3a만 |
| S10-J13 | provider 실패 | 승인 focused | S11최종판정·이번미실행 | 조건부 진행·S11영향대조·이번미승인 | 비대상: UI 없어야 정상 | 5.3a만 |
| S10-J14 | cleanup 후 Failed | 승인 focused | S11최종판정·이번미실행 | 조건부 진행·S11영향대조·이번미승인 | 비대상: UI 없어야 정상 | 5.3a만 |
| S10-J15 | 부분선택 사실보존 | 승인 focused | S11최종판정·이번미실행 | 조건부 진행·S11영향대조·이번미승인 | 비대상: UI 없어야 정상 | 5.3a만 |
| S10-J16 | 출력 계획/순서 | 승인 focused | S11최종판정·이번미실행 | 조건부 진행·S11영향대조·이번미승인 | 비대상: UI 없어야 정상 | 5.3a만 |
| S10-J17 | 무관source 추가 멱등 | 승인 focused RED/GREEN | S11최종판정 | 조건부·이번미승인 | 비대상: UI 없어야 정상 | 동일선택 ID |
| S10-J18 | cleanup wall시계 역행 | 승인 focused RED/GREEN | S11최종판정 | 조건부·이번미승인 | 비대상: UI 없어야 정상 | 순서는상태로판정 |
| S10-J19 | catalog coordinator 단일 소유 | 승인 focused RED/GREEN | S11최종판정 | 조건부·이번미승인 | 비대상: UI 없어야 정상 | 중복 coordinator의 일반/파생 admission·삭제 차단 |
| S10-J20 | 원장 불확실 후 공통 쓰기 차단 | 승인 focused RED/GREEN | S11최종판정 | 조건부·이번미승인 | 비대상: UI 없어야 정상 | 격리 append 실패 후 직접 삭제·corrupt·완료 차단 |

| 기능 ID | 기능 | 안정화 | 30분 | 120분 | UI 풀테스트 | UI 기준 |
| --- | --- | --- | --- | --- | --- | --- |
| S10-R11 | confirmed source 전수 결박·FD전체교차 | derived-remux 실제fixture | S11 판정 | S11 조건부 | 비대상 | 입력누락 성공승격 금지 |
| S10-R12 | I420 visible plane hash | derived-remux 실제fixture | S11 판정 | S11 조건부 | 비대상 | stride padding 동일성 아님 |
| S10-R13 | 전체 deadline·취소·partial 소유 | derived-remux 실제fixture | S11 판정 | S11 조건부 | 비대상 | stop/cleanup 경계 |
| S10-R14 | 단발 취소 단조 고정 | 내부 Budget focused RED/GREEN | S11 판정 | S11 조건부 | 비대상: UI 없어야 정상 | 해제 후 재사용 방지 |

| 기능 ID | 기능 | 안정화 | 30분 | 120분 | UI 풀테스트 | UI 기준 |
| --- | --- | --- | --- | --- | --- | --- |
| S10-R01 | 실제 H264 AU payload·decode remux 출처 | derived-remux 실제fixture | S11 판정 | S11 조건부 | 비대상 | 내부 FD 출력, publish 없음 |
| S10-R02 | 비영점·B-frame·GstSegment 실제 seek | derived-remux 실제fixture | S11 판정 | S11 조건부 | 비대상 | 고정 offset 금지 |
| S10-R03 | 분수90k timebase·1ns 미충족 | derived-remux 실제fixture | S11 판정 | S11 조건부 | 비대상 | verified/fullySatisfied 분리 |
| S10-R04 | GOP preroll·후행 dependency 실제범위 | derived-remux 실제fixture | S11 판정 | S11 조건부 | 비대상 | 요청과추가범위 분리 |
| S10-R05 | 다중 source/epoch 독립 출력 | derived-remux 실제fixture | S11 판정 | S11 조건부 | 비대상 | 단일영상·연속재생 주장 없음 |
| S10-R06 | source/output FD·inode 별칭 거부 | derived-remux 실제fixture | S11 판정 | S11 조건부 | 비대상 | 경로 임의open 없음 |
| S10-R07 | source size/hash/파일변경 거부 | derived-remux 실제fixture | S11 판정 | S11 조건부 | 비대상 | 원본 보존 |
| S10-R08 | 양수 byte상한·부분쓰기 실패 | derived-remux 실제fixture | S11 판정 | S11 조건부 | 비대상 | caller cleanup 책임 |
| S10-R09 | unsupported codec·ambiguous 선택 거부 | derived-remux 실제fixture | S11 판정 | S11 조건부 | 비대상 | 판단 완화 없음 |
| S10-R10 | partial 선택의 전체요청·미충족 보존 | derived-remux 실제fixture | S11 판정 | S11 조건부 | 비대상 | 선택 밖 unknown 제거 금지 |

| 기능 ID | 기능 | 안정화 | 30분 | 120분 | UI 풀테스트 | UI 기준 |
| --- | --- | --- | --- | --- | --- | --- |
| S10-D22 | 실제 30000/1001 decoder duration overlap 선택 | derived-remux 실제fixture·derived-selection | S11 판정 | S11 조건부 | 비대상 | 서로 다른 PTS overlap과 같은 PTS 모호성 분리 |

| 기능 ID | 기능 | 안정화 | 30분 | 120분 | UI 풀테스트 | UI 기준 |
| --- | --- | --- | --- | --- | --- | --- |
| S10-D21 | namespace reset 이후 재eviction에서 이전큰PTS 격리 | derived-selection focused/runtime | S11 판정 | S11 판정 | 비대상 | 반복namespace 증거 수명 |

| 기능 ID | 기능 | 안정화 | 30분 | 120분 | UI 풀테스트 | UI 기준 |
| --- | --- | --- | --- | --- | --- | --- |
| S10-D14 | 유효후보와 손상후보 병존 | derived-selection focused | S11 판정 | S11 판정 | 비대상 | 내부 후보 완전성 |
| S10-D15 | queued sequence 이후 callback 제외 | derived-selection focused/runtime | S11 판정 | S11 판정 | 비대상 | 내부 시간 증거 |
| S10-D16 | namespace reset·과거 eviction 격리 | derived-selection focused/runtime | S11 판정 | S11 판정 | 비대상 | 기존 reset 판단 불변 |
| S10-D17 | decoder 실제 duration 복원 | derived-selection focused/runtime | S11 판정 | S11 판정 | 비대상 | duration 추정 없음 |
| S10-D18 | 실제 decoder→manager 선택 정상범위 | observation runtime | S11 판정 | S11 판정 | 비대상 | VP8 fixture는 선택시간 검증, remux지원 아님 |
| S10-D19 | 실제 namespace reset 내부증거 단절 | observation runtime | S11 판정 | S11 판정 | 비대상 | 공개 metadata 불변 |
| S10-D20 | history snapshot 수명 제한 | observation runtime | S11 판정 | S11 판정 | 비대상 | live/latest 전용 내부 필드 |

| 기능 ID | 기능 | 안정화 | 30분 | 120분 | UI 풀테스트 | UI 기준 |
| --- | --- | --- | --- | --- | --- | --- |
| S10-D01 | 실제 callback 직접 구간 누적·불변 snapshot | derived-selection focused | S11 판정 | S11 판정 | 비대상 | 내부 시간 대응; UI 없어야 정상 |
| S10-D02 | 원본 PTS 0과 부재·fallback·duration 부재 | derived-selection focused | S11 판정 | S11 판정 | 비대상 | 공개 직렬화 변화 없음 |
| S10-D03 | pre/post·음수 확장·overflow | derived-selection focused | S11 판정 | S11 판정 | 비대상 | 반열림 요청 보존 |
| S10-D04 | exact 구간 union 정상 선택·파일 식별 | derived-selection focused | S11 판정 | S11 판정 | 비대상 | 재생 가능 판정 아님 |
| S10-D05 | 한 점 외삽 금지·표본 사이 미확인 | derived-selection focused | S11 판정 | S11 판정 | 비대상 | source duration 추정 금지 |
| S10-D06 | namespace·generation·track 격리 | derived-selection focused | S11 판정 | S11 판정 | 비대상 | 서로 다른 원점 합성 금지 |
| S10-D07 | 중복 PTS·복수 원본 후보 모호성 | derived-selection focused | S11 판정 | S11 판정 | 비대상 | 후보 자동 축약 금지 |
| S10-D08 | bounded 증거 cap·초과 범위 미확인 | derived-selection focused | S11 판정 | S11 판정 | 비대상 | 잘라 성공 금지 |
| S10-D09 | epoch·공백·삭제·미확인 구분 | derived-selection focused | S11 판정 | S11 판정 | 비대상 | 별도 출력 입력 유지 |
| S10-D10 | UTC piecewise 품질·복수 후보·unplaced | derived-selection focused | S11 판정 | S11 판정 | 비대상 | 원본 UTC mapping 유지 |
| S10-D11 | 분수 timebase exact 변환·잔차 거부 | derived-selection focused | S11 판정 | S11 판정 | 비대상 | 1ns 일괄 무시 금지 |
| S10-D12 | 후행 구간은 watermark 없으면 미확인 | derived-selection focused | S11 판정 | S11 판정 | 비대상 | 무한 pending 금지 |
| S10-D13 | source binding 무결성·source/channel 불일치 | derived-selection focused | S11 판정 | S11 판정 | 비대상 | 경로만으로 선택 금지 |

| 기능 ID | 기능 | 안정화 | 30분 | 120분 | UI 풀테스트 | UI 기준 |
| --- | --- | --- | --- | --- | --- | --- |
| S10-C419 | media-pts 초기 요청 원문 왕복 | consumer-reference/connection focused | S11 판정 | S11 판정 | 이번 비대상 | 내부 opt-in; 영상 생성·범위 증명 아님 |
| S10-C420 | UTC 초기 요청 원문 왕복 | consumer-reference/connection focused | S11 판정 | S11 판정 | 이번 비대상 | 내부 opt-in; 영상 생성·범위 증명 아님 |
| S10-C421 | 0·최대 pre 요청 및 오류 경계 | consumer-reference/connection focused | S11 판정 | S11 판정 | 이번 비대상 | 내부 opt-in; 영상 생성·범위 증명 아님 |
| S10-C422 | 실제 bridge 초기 pre-roll 수락·pending 유지 | consumer-reference/connection focused | S11 판정 | S11 판정 | 이번 비대상 | 내부 opt-in; 영상 생성·범위 증명 아님 |
| S10-C423 | 초기 요청 멱등·갱신·generation 분리 | consumer-reference/connection focused | S11 판정 | S11 판정 | 이번 비대상 | 내부 opt-in; 영상 생성·범위 증명 아님 |
| S10-C424 | 초기 요청 SQL·JSONL 복구 | consumer-reference/connection focused | S11 판정 | S11 판정 | 이번 비대상 | 내부 opt-in; 영상 생성·범위 증명 아님 |
| S10-C425 | 초기 요청 checkpoint 복구 | consumer-reference/connection focused | S11 판정 | S11 판정 | 이번 비대상 | 내부 opt-in; 영상 생성·범위 증명 아님 |

| 기능 ID | 기능 | 안정화 | 30분 | 120분 | UI 풀테스트 | UI 기준 |
| --- | --- | --- | --- | --- | --- | --- |
| S10-C501 | H264 실제 파일 시각 측정 | 실제 파일 측정 단기 | S11 판정 | S11 판정 | 이번 비대상 | 제품 UI 없음; 파생 기능 PASS 아님 |
| S10-C502 | 비영점 원본 시각 측정 | 실제 파일 측정 단기 | S11 판정 | S11 판정 | 이번 비대상 | 제품 UI 없음; 파생 기능 PASS 아님 |
| S10-C503 | 정상 segment 분할 측정 | 실제 파일 측정 단기 | S11 판정 | S11 판정 | 이번 비대상 | 제품 UI 없음; 파생 기능 PASS 아님 |
| S10-C504 | B-frame decode preroll 측정 | 실제 파일 측정 단기 | S11 판정 | S11 판정 | 이번 비대상 | 제품 UI 없음; 파생 기능 PASS 아님 |
| S10-C505 | 비영점 B-frame 시각 측정 | 실제 파일 측정 단기 | S11 판정 | S11 판정 | 이번 비대상 | 제품 UI 없음; 파생 기능 PASS 아님 |
| S10-C506 | 분수 frame rate 시각 측정 | 실제 파일 측정 단기 | S11 판정 | S11 판정 | 이번 비대상 | 제품 UI 없음; 파생 기능 PASS 아님 |
| S10-C507 | 시계 역행과 미디어 시각 분리 | 실제 파일 측정 단기 | S11 판정 | S11 판정 | 이번 비대상 | 제품 UI 없음; 파생 기능 PASS 아님 |
| S10-C508 | PTS 초기화 epoch 분리 | 실제 파일 측정 단기 | S11 판정 | S11 판정 | 이번 비대상 | 제품 UI 없음; 파생 기능 PASS 아님 |

| 기능 ID | 기능 | 안정화 | 30분 | 120분 | UI 풀테스트 | UI 기준 |
| --- | --- | --- | --- | --- | --- | --- |
| S10-C401 | 관측·참조 원자 저장 | consumer-connection focused | S11 판정 | S11 판정 | 이번 비대상 | 내부 opt-in: 신규 UI 없음 |
| S10-C402 | 쌍 identity 불일치 거부 | consumer-connection focused | S11 판정 | S11 판정 | 이번 비대상 | 내부 opt-in: 신규 UI 없음 |
| S10-C403 | 동일 원본 재전달·event 병합 | consumer-connection focused | S11 판정 | S11 판정 | 이번 비대상 | 내부 opt-in: 신규 UI 없음 |
| S10-C404 | 다른 원본 동일PTS 구분 | consumer-connection focused | S11 판정 | S11 판정 | 이번 비대상 | 내부 opt-in: 신규 UI 없음 |
| S10-C405 | SQL·JSONL·checkpoint 쌍 복구 | consumer-connection focused | S11 판정 | S11 판정 | 이번 비대상 | 내부 opt-in: 신규 UI 없음 |
| S10-C406 | 실제 OnResult 원본 참조 저장 | consumer-connection focused | S11 판정 | S11 판정 | 이번 비대상 | 내부 opt-in: 신규 UI 없음 |
| S10-C407 | OnEvent 강제 표본 | consumer-connection focused | S11 판정 | S11 판정 | 이번 비대상 | 내부 opt-in: 신규 UI 없음 |
| S10-C408 | 종료track 과거참조 보존 | consumer-connection focused | S11 판정 | S11 판정 | 이번 비대상 | 내부 opt-in: 신규 UI 없음 |
| S10-C409 | 종료track 참조부재 unknown | consumer-connection focused | S11 판정 | S11 판정 | 이번 비대상 | 내부 opt-in: 신규 UI 없음 |
| S10-C410 | sampling·queue·StopAndDrain 회귀 | consumer-connection focused | S11 판정 | S11 판정 | 이번 비대상 | 내부 opt-in: 신규 UI 없음 |
| S10-C411 | exact·미색인 복수 후보 보존 | consumer-connection focused | S11 판정 | S11 판정 | 이번 비대상 | 내부 opt-in: 신규 UI 없음 |
| S10-C412 | nearest/ambiguous/unavailable 미승격 | consumer-connection focused | S11 판정 | S11 판정 | 이번 비대상 | 내부 opt-in: 신규 UI 없음 |
| S10-C413 | UTC unknown·삭제 상태 재판정 | consumer-connection focused | S11 판정 | S11 판정 | 이번 비대상 | 내부 opt-in: 신규 UI 없음 |
| S10-C414 | 실제 TryResolve 요청참조 저장 | consumer-connection focused | S11 판정 | S11 판정 | 이번 비대상 | 내부 opt-in: 신규 UI 없음 |
| S10-C415 | event 재전달·확장·세대 구분 | consumer-connection focused | S11 판정 | S11 판정 | 이번 비대상 | 내부 opt-in: 신규 UI 없음 |
| S10-C416 | source/channel 충돌 거부 | consumer-connection focused | S11 판정 | S11 판정 | 이번 비대상 | 내부 opt-in: 신규 UI 없음 |
| S10-C417 | 같은 원본 미디어 교집합 우선 | consumer-connection focused | S11 판정 | S11 판정 | 이번 비대상 | 내부 opt-in: 신규 UI 없음 |
| S10-C418 | 공개 결과·구형 fallback 불변 | consumer-connection focused | S11 판정 | S11 판정 | 이번 비대상 | 내부 opt-in: 신규 UI 없음 |


| 기능 ID | 기능 | 안정화 | 30분 | 120분 | UI 풀테스트 | UI 기준 |
| --- | --- | --- | --- | --- | --- | --- |
| S10-C341 | 계약 왕복 | consumer-reference focused | S11 판정 | S11 판정 | 이번 비대상 | 내부 저장: UI 없어야 정상 |
| S10-C342 | unknown/중복 필드 거부 | consumer-reference focused | S11 판정 | S11 판정 | 이번 비대상 | 내부 저장: UI 없어야 정상 |
| S10-C343 | ID·종류·소유자 제약 | consumer-reference focused | S11 판정 | S11 판정 | 이번 비대상 | 내부 저장: UI 없어야 정상 |
| S10-C344 | 품질·원본 nullable 조합 | consumer-reference focused | S11 판정 | S11 판정 | 이번 비대상 | 내부 저장: UI 없어야 정상 |
| S10-C345 | 원본 수치·track 경계 | consumer-reference focused | S11 판정 | S11 판정 | 이번 비대상 | 내부 저장: UI 없어야 정상 |
| S10-C346 | event 요청·시간축 | consumer-reference focused | S11 판정 | S11 판정 | 이번 비대상 | 내부 저장: UI 없어야 정상 |
| S10-C347 | observation 요청 금지 | consumer-reference focused | S11 판정 | S11 판정 | 이번 비대상 | 내부 저장: UI 없어야 정상 |
| S10-C348 | 요청 음수·역전·padding | consumer-reference focused | S11 판정 | S11 판정 | 이번 비대상 | 내부 저장: UI 없어야 정상 |
| S10-C349 | 미지원 schema 거부 | consumer-reference focused | S11 판정 | S11 판정 | 이번 비대상 | 내부 저장: UI 없어야 정상 |
| S10-C350 | 실제 원장 저장·조회 | consumer-reference focused | S11 판정 | S11 판정 | 이번 비대상 | 내부 저장: UI 없어야 정상 |
| S10-C351 | 동일 참조 멱등 | consumer-reference focused | S11 판정 | S11 판정 | 이번 비대상 | 내부 저장: UI 없어야 정상 |
| S10-C352 | 동일 ID 충돌 거부 | consumer-reference focused | S11 판정 | S11 판정 | 이번 비대상 | 내부 저장: UI 없어야 정상 |
| S10-C353 | opt-in·미open 거부 | consumer-reference focused | S11 판정 | S11 판정 | 이번 비대상 | 내부 저장: UI 없어야 정상 |
| S10-C354 | SQL·JSONL 재시작 동등 | consumer-reference focused | S11 판정 | S11 판정 | 이번 비대상 | 내부 저장: UI 없어야 정상 |
| S10-C355 | checkpoint 참조 보존 | consumer-reference focused | S11 판정 | S11 판정 | 이번 비대상 | 내부 저장: UI 없어야 정상 |
| S10-C356 | 손상·충돌 replay 선차단 | consumer-reference focused | S11 판정 | S11 판정 | 이번 비대상 | 내부 저장: UI 없어야 정상 |


| 기능 ID | 합격 기준 | 안정화 | 30분 | 120분 | UI 풀테스트 |
| --- | --- | --- | --- | --- | --- |
| C323-A | 거부 결과가 tuple/last/완전성을 바꾸지 않음 | write-boundaries 단위 + writer 통합 | S11 | S11 | 신규 UI 비대상 |
| C323-B | 성공 결과 원본 tuple·last 반영 | write-boundaries 단위 + writer 통합 | S11 | S11 | 신규 UI 비대상 |
| C323-C | 4096 이후 성공/실패 상태 전이 | write-boundaries 단위 + writer 통합 | S11 | S11 | 신규 UI 비대상 |
| C334-A | validate→publish→commit→clear 순서 | write-boundaries 단위 + ready 통합 | S11 | S11 | 신규 UI 비대상 |
| C334-B | validate 실패 후 다음 단계 차단 | write-boundaries 단위 + ready 통합 | S11 | S11 | 신규 UI 비대상 |
| C334-C | publish 실패 후 다음 단계 차단 | write-boundaries 단위 + ready 통합 | S11 | S11 | 신규 UI 비대상 |
| C334-D | commit 실패 후 ready/final 보존 | write-boundaries 단위 + ready 통합 | S11 | S11 | 신규 UI 비대상 |
| C334-E | clear 실패 결과 반환 | write-boundaries 단위 + ready 통합 | S11 | S11 | 신규 UI 비대상 |

C323/C334의 이전 호출 주입 계획은 내부 단위+실제 통합 방식으로 대체 승인됐다. 상세 이력은 중앙 기록을 따른다.

## S10 3C-3B 실제 writer·ready 결박

| 기능 ID | 기능·합격 기준 | 안정화 | 30분 | 120분 | UI 풀테스트 | UI 존재 |
| --- | --- | --- | --- | --- | --- | --- |
| S10-C321 | 실제 writer 수락 결박: H264/VP8 실제 encode→writer→decode 후 bound segment와 generation/order/track/ordinal/원본PTS 일치 | 실제 synthetic writer/ready focused | S11 판정 | writer 수명 변경: S11 판정 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-C322 | 미수락 입력 제외: keyframe 대기·다른 track·빈 payload·동일 ordinal replay가 binding에 들어가지 않음 | 실제 synthetic writer/ready focused | S11 판정 | writer 수명 변경: S11 판정 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-C323 | push 실패 제외: 내부 수락 함수의 거부 결과 불변과 실제 GST_FLOW_OK 이후 연결 확인; 호출 주입은 폐기 | 내부 C323-A~C + 실제 synthetic writer 통합 | S11 판정 | writer 수명 변경: S11 판정 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-C324 | 4096 색인 상한: 실제 writer 4096/4097 이상 수락에서 prefix4096 유지·last 갱신·영상 지속·tail unknown | 실제 synthetic writer/ready focused | S11 판정 | writer 수명 변경: S11 판정 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-C325 | 정상 분할: 같은 epoch의 여러 segment가 각각 자기 수락 tuple만 보존하고 영속 순서를 유지 | 실제 synthetic writer/ready focused | S11 판정 | writer 수명 변경: S11 판정 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-C326 | 세대 전환·재시작: source generation/order와 media epoch를 독립 보존, 재시작 조회·다른 세대 혼입 차단 | 실제 synthetic writer/ready focused | S11 판정 | writer 수명 변경: S11 판정 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-C327 | B-frame 원본PTS: decode 순서 증가와 PTS 재정렬에서 원본PTS/ordinal 보존·UTC unknown 의미 유지 | 실제 synthetic writer/ready focused | S11 판정 | writer 수명 변경: S11 판정 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-C328 | ready3 엄격 계약: binding 필수·extra/mixed/null/schema/identity 오류 거부, 기존 ready1/2 직렬화 유지 | 실제 synthetic writer/ready focused | S11 판정 | writer 수명 변경: S11 판정 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-C329 | ready 버전별 상한: version1/2 1MiB, version3 2MiB 상한을 읽기·쓰기 양쪽에서 확인 | 실제 synthetic writer/ready focused | S11 판정 | writer 수명 변경: S11 판정 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-C330 | partial-only 복구: 실제 미디어 ready3+partial만 있는 중단 상태에서 segment와 binding 한꺼번에 복구 | 실제 synthetic writer/ready focused | S11 판정 | writer 수명 변경: S11 판정 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-C331 | two-links 복구: publish 중 partial/final 동일 inode 2links 상태 복구 및 exact binding 유지 | 실제 synthetic writer/ready focused | S11 판정 | writer 수명 변경: S11 판정 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-C332 | final-only 복구: publish 뒤 commit 전 final+ready 상태에서 bound catalog 복구 | 실제 synthetic writer/ready focused | S11 판정 | writer 수명 변경: S11 판정 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-C333 | committed-ready 복구: bound commit 뒤 ready 잔존 시 멱등 복구, 중복 원장·상태 부활 없음 | 실제 synthetic writer/ready focused | S11 판정 | writer 수명 변경: S11 판정 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-C334 | commit 실패 보존: 내부 순서 함수에서 commit 실패 후 clear 미호출·ready/final 보존, 실제 ready 복구와 결합 | 내부 C334-A~E + 실제 synthetic ready 통합; OS 강제 실패 아님 | S11 판정 | writer 수명 변경: S11 판정 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-C335 | prepublish 거부: 삭제·identity충돌·손상 미디어 또는 ticket이면 publish/소급등록 금지·원본 보존 | 실제 synthetic writer/ready focused | S11 판정 | writer 수명 변경: S11 판정 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-C336 | 기존 ready·소유권 회귀: ready1/2·nonce marker preserve·fd/no-follow/no-replace·hash/크기·정리 불변 | 실제 synthetic writer/ready focused | S11 판정 | writer 수명 변경: S11 판정 | 이번 비대상 | 비대상: 신규 UI 없음 |

## S10 3C-3A 원본 수락 결박

| 기능 ID | 기능·합격 기준 | 안정화 | 30분 | 120분 | UI 풀테스트 | UI 존재 |
| --- | --- | --- | --- | --- | --- | --- |
| S10-C301 | 결박 schema 왕복: 고정 field 집합·sample tuple·nullable 없는 값의 JSON 왕복 및 잘못된 schema/type/추가 field 거부 | 격리 source-binding focused | S11 판정 | 실제 생산/수명 연결 후 S11 판정 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-C302 | 식별·ordinal 검증: 빈/잘못된 ID, 0 generation/order/ordinal, 중복·역전 ordinal 거부 | 격리 source-binding focused | S11 판정 | 실제 생산/수명 연결 후 S11 판정 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-C303 | PTS 재정렬 보존: 증가 ordinal의 중복·감소 PTS를 허용하고 임의 정렬·새 epoch 생성 없음 | 격리 source-binding focused | S11 판정 | 실제 생산/수명 연결 후 S11 판정 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-C304 | 미디어 범위·timebase: 정수 유리수 변환과 닫힌 media 범위 검증; 비정수·overflow·범위 밖 거부 | 격리 source-binding focused | S11 판정 | 실제 생산/수명 연결 후 S11 판정 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-C305 | 색인 상한·미색인 꼬리: 4096 prefix 상한, complete/last/reason 정합성 및 초과·허위 truncated 거부 | 격리 source-binding focused | S11 판정 | 실제 생산/수명 연결 후 S11 판정 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-C306 | 단일 bound mutation: segment와 binding을 한 envelope로 append/replay하고 두 부분을 함께 투영 | 격리 source-binding focused | S11 판정 | 실제 생산/수명 연결 후 S11 판정 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-C307 | source·저장 identity 결박: source/channel/store/segment/media_epoch 불일치 거부; source_generation과 epoch는 독립 | 격리 source-binding focused | S11 판정 | 실제 생산/수명 연결 후 S11 판정 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-C308 | 불변·멱등: 동일 bound payload 복구만 수용; 다른 payload·mutation 충돌 거부 | 격리 source-binding focused | S11 판정 | 실제 생산/수명 연결 후 S11 판정 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-C309 | 소급·다운그레이드 금지: 기존 unbound V2에 binding 추가 및 bound ID의 unbound 복구 거부 | 격리 source-binding focused | S11 판정 | 실제 생산/수명 연결 후 S11 판정 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-C310 | 정확한 원본 tuple 조회: generation/order/track/ordinal/PTS 전부 일치한 수락 후보만 반환 | 격리 source-binding focused | S11 판정 | 실제 생산/수명 연결 후 S11 판정 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-C311 | 미색인·실제 부재 구분: prefix 내부 누락과 last 초과는 none; truncated tail만 unknown; 범위 추정 exact 금지 | 격리 source-binding focused | S11 판정 | 실제 생산/수명 연결 후 S11 판정 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-C312 | 복수 segment 후보: 같은 원본이 여러 segment에 수락됐으면 모든 후보·영속 순서 보존 | 격리 source-binding focused | S11 판정 | 실제 생산/수명 연결 후 S11 판정 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-C313 | 삭제·corrupt·pending 차단: 상태 변경 뒤 원본 위치 조회/재수용 차단, 동일 옛 mutation replay로 부활 없음 | 격리 source-binding focused | S11 판정 | 실제 생산/수명 연결 후 S11 판정 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-C314 | 채널·조회 오류 경계: 다른 source/channel 혼입 금지, invalid/null/미open 조회 거부·output 초기화 | 격리 source-binding focused | S11 판정 | 실제 생산/수명 연결 후 S11 판정 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-C315 | SQL·JSONL 재시작 동등: binding JSON projection·재시작·fallback 원본 후보/unknown 상태 동일 | 격리 source-binding focused | S11 판정 | 실제 생산/수명 연결 후 S11 판정 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-C316 | checkpoint 보존: managed checkpoint 및 재시작에서 원본 tuple·완전성·ID·상태 보존 | 격리 source-binding focused | S11 판정 | 실제 생산/수명 연결 후 S11 판정 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-C317 | 손상 원장 선차단: bound record 손상·truncated/unsupported·duplicate envelope 충돌 시 부분 공개 금지 | 격리 source-binding focused | S11 판정 | 실제 생산/수명 연결 후 S11 판정 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-C318 | 예약·옵트인 경계: bound record opt-in·예약 tuple·store 결박 및 예약 소급/ID 재사용 거부 | 격리 source-binding focused | S11 판정 | 실제 생산/수명 연결 후 S11 판정 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-C319 | 기존 segment·조회 불변: segmentV2 직렬화·UTC mapping 및 query journal/hold 무변경; unbound 위치 조회 유지 | 격리 source-binding focused | S11 판정 | 실제 생산/수명 연결 후 S11 판정 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-C320 | 실제 finalize 수락 경계: 실제 소유 파일 경로를 사용하는 새 catalog finalize/recover API, wrong path·missing·기존 ID 거부 | 격리 source-binding focused | S11 판정 | 실제 생산/수명 연결 후 S11 판정 | 이번 비대상 | 비대상: 신규 UI 없음 |

## S10 3C-2 공통 구간 해석

| 기능 ID | 기능·합격 기준 | 안정화 | 30분 | 120분 | UI 풀테스트 | UI 존재 |
| --- | --- | --- | --- | --- | --- | --- |
| S10-C201 | 미디어 구간 mapping 경계: 한 segment의 여러 mapping을 query 범위로 잘라 별도 조각으로 보존 | 격리 range focused | S11 판정 | 이번 읽기 전용 단위 미진행 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-C202 | unknown UTC의 미디어 위치: 닫힌 unknown mapping은 미디어 범위를 보존하며 UTC를 만들지 않음 | 격리 range focused | S11 판정 | 이번 읽기 전용 단위 미진행 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-C203 | 미디어 범위 밖: query 중 segment 앞뒤 부분은 미포함으로 남김 | 격리 range focused | S11 판정 | 이번 읽기 전용 단위 미진행 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-C204 | 미확정 끝: 열린 mapping 끝을 query 끝까지 확정 coverage로 확장하지 않음 | 격리 range focused | S11 판정 | 이번 읽기 전용 단위 미진행 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-C205 | UTC 중첩 mapping: 같은 파일의 역행·중첩 mapping 후보를 전부 보존 | 격리 range focused | S11 판정 | 이번 읽기 전용 단위 미진행 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-C206 | 저장소 경계·결정 순서: 두 catalog 각각 store 보존, 동일 store 다중 파일/order 정렬, cross-store 원장 혼입 거부 | 격리 range focused | S11 판정 | 이번 읽기 전용 단위 미진행 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-C207 | 정상 segment 분할: 같은 epoch라도 물리 segment 경계를 보존하고 자동 결합하지 않음 | 격리 range focused | S11 판정 | 이번 읽기 전용 단위 미진행 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-C208 | 반열린 구간 경계: 빈·역전 입력 거부와 인접 끝점 비중복 | 격리 range focused | S11 판정 | 이번 읽기 전용 단위 미진행 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-C209 | 유리수·비정수 경계: 정확한 timebase 변환; 비정수 끝은 반올림 없이 미확정 후보로 보존 | 격리 range focused | S11 판정 | 이번 읽기 전용 단위 미진행 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-C210 | 정수 범위 안전성: 극단 PTS/UTC/timebase 곱셈에서 overflow나 임의 clamp 없음 | 격리 range focused | S11 판정 | 이번 읽기 전용 단위 미진행 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-C211 | UTC 공백·unplaced 구분: known UTC coverage gap과 UTC를 알 수 없는 media 후보를 별도 보존 | 격리 range focused | S11 판정 | 이번 읽기 전용 단위 미진행 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-C212 | 입력 오류 초기화: 잘못된 ID·null output·미개방 catalog 거부 시 이전 결과 잔존 없음 | 격리 range focused | S11 판정 | 이번 읽기 전용 단위 미진행 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-C213 | 삭제·채널 경계: 삭제된 ID와 다른 채널의 segment를 잘못 연결하지 않음 | 격리 range focused | S11 판정 | 이번 읽기 전용 단위 미진행 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-C214 | 재시작 SQL·JSONL 동등: 동일 원장 재시작의 모든 구간·후보·품질 일치 | 격리 range focused | S11 판정 | 이번 읽기 전용 단위 미진행 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-C215 | 원본 mapping·조회 불변: 원본 provenance/uncertainty/reason 및 mapping 범위 유지; journal·hold 무변경 | 격리 range focused | S11 판정 | 이번 읽기 전용 단위 미진행 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-C216 | unknown 채널 격리: 타 채널 unknown 및 pending/corrupt segment를 현재 범위 결과에 섞지 않음 | 격리 range focused | S11 판정 | 이번 읽기 전용 단위 미진행 | 이번 비대상 | 비대상: 신규 UI 없음 |

## S10 3C-1 원본·분석 연관

| 기능 ID | 기능·합격 기준 | 안정화 | 30분 | 120분 | UI 풀테스트 | UI 존재 |
| --- | --- | --- | --- | --- | --- | --- |
| S10-C101 | 유일 timestamp 연관: 단일 유효 입력의 generation/order/ordinal/track/원본 PTS 보존; 프레임 고유성 아님 | 격리 focused/runtime | S11 판정 | 최종 diff 기준 판정 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-C102 | 최근접 추정 분리: 기존 숫자 PTS 선택은 유지하되 correlation은 nearest이며 확정 참조 없음 | 격리 focused/runtime | S11 판정 | 최종 diff 기준 판정 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-C103 | 중복 timestamp 모호성: 동일 decoder PTS에 다른 관측이 있으면 ambiguous; 임의 최신 선택 금지 | 격리 focused/runtime | S11 판정 | 최종 diff 기준 판정 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-C104 | 원본 미관측: observation 부재·빈 generation·0 order/ordinal이면 unavailable | 격리 focused/runtime | S11 판정 | 최종 diff 기준 판정 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-C105 | 출력 PTS 부재: 없는 출력 timestamp를 유효 0으로 취급하지 않음 | 격리 focused/runtime | S11 판정 | 최종 diff 기준 판정 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-C106 | 원본 PTS 부재·범위: 없는 원본 PTS·표현 범위 초과값은 확정 연관 불가; 유효0은 보존 | 격리 focused/runtime | S11 판정 | 최종 diff 기준 판정 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-C107 | bounded 이력: 상한 밖 과거 입력은 unavailable; 무한 증가 없음 | 격리 focused/runtime | S11 판정 | 최종 diff 기준 판정 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-C108 | 충돌·동일 입력 재전달: 동일 observation 재전달과 충돌 metadata를 구분; conflicting duplicate는 모호 | 격리 focused/runtime | S11 판정 | 최종 diff 기준 판정 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-C109 | 세대·track 분리: timestamp가 같아도 다른 generation/track 관측을 합치지 않음 | 격리 focused/runtime | S11 판정 | 최종 diff 기준 판정 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-C110 | 자체 영상 실제 decoder: 자체 생성 영상의 callback correlation과 기존 PTS·영상 frame 전달 확인 | 격리 focused/runtime | S11 판정 | 최종 diff 기준 판정 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-C111 | 실제 manager 전달: SharedStream→decoder→queue→AnalysisResult의 correlation 원문 유지 | 격리 focused/runtime | S11 판정 | 최종 diff 기준 판정 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-C112 | 미관측 입력 기존 동작: 원본 관측 없는 입력의 기존 영상·숫자PTS 동작 및 public payload 유지 | 격리 focused/runtime | S11 판정 | 최종 diff 기준 판정 | 이번 비대상 | 비대상: 신규 UI 없음 |


## S10 후속 3B 보존·재생 보호

| 기능 ID | 동작·PASS 기준 | 안정화 테스트 | 30분 테스트 | 120분 테스트 | UI 테스트 | UI 존재 |
| --- | --- | --- | --- | --- | --- | --- |
| S10-B01 | UTC 조작 없는 삭제 표식: V2 불변 segment의 직렬화·파싱 원문 일치, V1 UTC range 혼입 없음 | 보존·재생 focused | S11 최종 판정 | 녹화 수명 변경: S11 범위 확정 후 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-B02 | 상태 원장 엄격성: 잘못된 payload/entity/충돌 중복 거부 및 원문 보존 | 보존·재생 focused | S11 최종 판정 | 녹화 수명 변경: S11 범위 확정 후 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-B03 | 불변 metadata와 상태 분리: pending/corrupt/deleted 전이 후 원본 finalized payload 불변 | 보존·재생 focused | S11 최종 판정 | 녹화 수명 변경: S11 범위 확정 후 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-B04 | 부활 차단: 잘못된 전이·finalize 재시도로 정상 상태 복원 금지 | 보존·재생 focused | S11 최종 판정 | 녹화 수명 변경: S11 범위 확정 후 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-B05 | 체크포인트·재시작: overlay/tombstone·SQLite/JSONL 동일 상태 복원 | 보존·재생 focused | S11 최종 판정 | 녹화 수명 변경: S11 범위 확정 후 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-B06 | 영속 용량 삭제 순서: UTC 후퇴에도 order_sequence 순 삭제 | 보존·재생 focused | S11 최종 판정 | 녹화 수명 변경: S11 범위 확정 후 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-B07 | 혼재 순서 명시: legacy/여러 store는 결정적 별도 순서, 실제 시간 순서 주장 금지 | 보존·재생 focused | S11 최종 판정 | 녹화 수명 변경: S11 범위 확정 후 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-B08 | 보수적 기간 만료: 모든 known 매핑의 끝+uncertainty 최댓값을 ms 상향 변환 | 보존·재생 focused | S11 최종 판정 | 녹화 수명 변경: S11 범위 확정 후 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-B09 | 기간 미확정 분리: unknown/overflow이면 age 불가·capacity 가능 | 보존·재생 focused | S11 최종 판정 | 녹화 수명 변경: S11 범위 확정 후 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-B10 | 등급·reserve 분리: continuous/event quota와 disk reserve 경계 유지 | 보존·재생 focused | S11 최종 판정 | 녹화 수명 변경: S11 범위 확정 후 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-B11 | pin·hold 보호: 보호된 ID 삭제/손상 전이 거부 | 보존·재생 focused | S11 최종 판정 | 녹화 수명 변경: S11 범위 확정 후 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-B12 | 상태별 용량 계수: pending/corrupt byte 집계 유지·자동 삭제 제외 | 보존·재생 focused | S11 최종 판정 | 녹화 수명 변경: S11 범위 확정 후 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-B13 | 내구 삭제 순서: pending fsync 후 unlink, unlink 후 tombstone | 보존·재생 focused | S11 최종 판정 | 녹화 수명 변경: S11 범위 확정 후 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-B14 | 중단 삭제 복구: pending 재시작·missing file 재시도 후 부활 없음 | 보존·재생 focused | S11 최종 판정 | 녹화 수명 변경: S11 범위 확정 후 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-B15 | 손상 수동 정리: corrupt는 explicit manual-corrupt-cleanup만 허용 | 보존·재생 focused | S11 최종 판정 | 녹화 수명 변경: S11 범위 확정 후 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-B16 | UTC unknown 파일 재생: 정상 continuous 파일 fd 제공 및 실제 hold 확인 | 보존·재생 focused | S11 최종 판정 | 녹화 수명 변경: S11 범위 확정 후 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-B17 | 재생 identity 경계: wrong channel/event provenance 부재/fallback 충돌 거부 | 보존·재생 focused | S11 최종 판정 | 녹화 수명 변경: S11 범위 확정 후 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-B18 | 경로·누락 거부: missing/symlink/hardlink 재생 거부와 hold 반환 | 보존·재생 focused | S11 최종 판정 | 녹화 수명 변경: S11 범위 확정 후 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-B19 | 동일 크기 손상 검출: SHA 불일치·컨테이너 오류 거부와 hold 반환 | 보존·재생 focused | S11 최종 판정 | 녹화 수명 변경: S11 범위 확정 후 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-B20 | 삭제·재생 경쟁: 한쪽만 안전하게 성공, fd 종료 뒤 hold 반환 | 보존·재생 focused | S11 최종 판정 | 녹화 수명 변경: S11 범위 확정 후 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-B21 | borrowed fd 검사: caller 소유권 유지·검사 전후 파일 변화 감지 | 보존·재생 focused | S11 최종 판정 | 녹화 수명 변경: S11 범위 확정 후 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-B22 | GST 미지원 경계: GStreamer 없는 build는 새 재생 Unavailable | 보존·재생 focused | S11 최종 판정 | 녹화 수명 변경: S11 범위 확정 후 | 이번 비대상 | 비대상: 신규 UI 없음 |
| S10-B23 | 기존 저장 port 경계: V2 삭제 미지원 port는 명시 거부 | 보존·재생 focused | S11 최종 판정 | 녹화 수명 변경: S11 범위 확정 후 | 이번 비대상 | 비대상: 신규 UI 없음 |

## S10 후속 3A 내부 위치 해석

| 기능 ID | 동작·PASS 기준 | 안정화 테스트 | 30분 테스트 | 120분 테스트 | UI 테스트 | UI 존재 |
| --- | --- | --- | --- | --- | --- | --- |
| S10-LOC01 | 정확 미디어 위치: segment·epoch·PTS·timebase·mapping 원문 보존 | 위치 해석 focused | 이번 비대상 | 이번 비대상: 읽기 내부 단위 | 비대상 | 비대상: UI 없어야 정상 |
| S10-LOC02 | UTC 불명확 미디어 위치: 범위가 입증된 exact 위치는 Single+has_unknown; 열린 tail은 Unknown | 위치 해석 focused | 이번 비대상 | 이번 비대상: 읽기 내부 단위 | 비대상 | 비대상: UI 없어야 정상 |
| S10-LOC03 | 서로 다른 파일의 UTC 중첩: 후보 두 개를 Multiple로 보존 | 위치 해석 focused | 이번 비대상 | 이번 비대상: 읽기 내부 단위 | 비대상 | 비대상: UI 없어야 정상 |
| S10-LOC04 | 한 파일의 서로 다른 UTC 매핑: mapping ID가 다른 후보를 병합하지 않음 | 위치 해석 focused | 이번 비대상 | 이번 비대상: 읽기 내부 단위 | 비대상 | 비대상: UI 없어야 정상 |
| S10-LOC05 | 점 조회 반개구간: start 포함/end 제외; 구간 밖은 None | 위치 해석 focused | 이번 비대상 | 이번 비대상: 읽기 내부 단위 | 비대상 | 비대상: UI 없어야 정상 |
| S10-LOC06 | 알 수 없는 UTC: unknown 매핑과 열린 끝을 외삽하지 않음 | 위치 해석 focused | 이번 비대상 | 이번 비대상: 읽기 내부 단위 | 비대상 | 비대상: UI 없어야 정상 |
| S10-LOC07 | 알려진 후보와 미확정 공존: 후보를 보존하고 has_unknown으로 불완전성 표시 | 위치 해석 focused | 이번 비대상 | 이번 비대상: 읽기 내부 단위 | 비대상 | 비대상: UI 없어야 정상 |
| S10-LOC08 | 다른 timebase 정확 변환: 분모가 ns가 아닌 PTS를 checked rational로 보존 | 위치 해석 focused | 이번 비대상 | 이번 비대상: 읽기 내부 단위 | 비대상 | 비대상: UI 없어야 정상 |
| S10-LOC09 | 정수로 표현 불가능한 위치: 반올림하지 않고 Unknown | 위치 해석 focused | 이번 비대상 | 이번 비대상: 읽기 내부 단위 | 비대상 | 비대상: UI 없어야 정상 |
| S10-LOC10 | 산술 극값: int64 경계 차이·곱셈·최종 위치 overflow 거부 | 위치 해석 focused | 이번 비대상 | 이번 비대상: 읽기 내부 단위 | 비대상 | 비대상: UI 없어야 정상 |
| S10-LOC11 | 삭제 ID의 channel 경계: 동일 channel exact ID만 Deleted; 다른 channel은 None | 위치 해석 focused | 이번 비대상 | 이번 비대상: 읽기 내부 단위 | 비대상 | 비대상: UI 없어야 정상 |
| S10-LOC12 | 잘못된 입력: null 결과·잘못된 ID/channel 및 미open 거부, 상태 변경 없음 | 위치 해석 focused | 이번 비대상 | 이번 비대상: 읽기 내부 단위 | 비대상 | 비대상: UI 없어야 정상 |
| S10-LOC13 | 재시작/저장 모드 일치: JSONL/SQLite 재open 결과의 ID·매핑·순서 일치 | 위치 해석 focused | 이번 비대상 | 이번 비대상: 읽기 내부 단위 | 비대상 | 비대상: UI 없어야 정상 |
| S10-LOC14 | 읽기 전용 경계: 파일 부재와 무관한 metadata 해석; 원장/hold 불변 | 위치 해석 focused | 이번 비대상 | 이번 비대상: 읽기 내부 단위 | 비대상 | 비대상: UI 없어야 정상 |

## S10 외부 STUN 차단 검증 준비

| 기능 ID | 동작·PASS 기준 | 안정화 테스트 | 30분 테스트 | 120분 테스트 | UI 테스트 | UI 존재 |
| --- | --- | --- | --- | --- | --- | --- |
| S10-ISO01 | 중앙 S10 외부 STUN 차단 재검증의 개별 정의 | 단위/동일 미디어 회귀 | 비대상: 검증 준비만 변경 | 비대상: 제품/바이너리 미변경 | 비대상 | 비대상: UI 없어야 정상 |
| S10-ISO02 | 중앙 S10 외부 STUN 차단 재검증의 개별 정의 | 단위/동일 미디어 회귀 | 비대상: 검증 준비만 변경 | 비대상: 제품/바이너리 미변경 | 비대상 | 비대상: UI 없어야 정상 |
| S10-ISO03 | 중앙 S10 외부 STUN 차단 재검증의 개별 정의 | 단위/동일 미디어 회귀 | 비대상: 검증 준비만 변경 | 비대상: 제품/바이너리 미변경 | 비대상 | 비대상: UI 없어야 정상 |
| S10-ISO04 | 중앙 S10 외부 STUN 차단 재검증의 개별 정의 | 단위/동일 미디어 회귀 | 비대상: 검증 준비만 변경 | 비대상: 제품/바이너리 미변경 | 비대상 | 비대상: UI 없어야 정상 |
| S10-ISO05 | 중앙 S10 외부 STUN 차단 재검증의 개별 정의 | 단위/동일 미디어 회귀 | 비대상: 검증 준비만 변경 | 비대상: 제품/바이너리 미변경 | 비대상 | 비대상: UI 없어야 정상 |
| S10-ISO06 | 중앙 S10 외부 STUN 차단 재검증의 개별 정의 | 단위/동일 미디어 회귀 | 비대상: 검증 준비만 변경 | 비대상: 제품/바이너리 미변경 | 비대상 | 비대상: UI 없어야 정상 |
| S10-ISO07 | 중앙 S10 외부 STUN 차단 재검증의 개별 정의 | 단위/동일 미디어 회귀 | 비대상: 검증 준비만 변경 | 비대상: 제품/바이너리 미변경 | 비대상 | 비대상: UI 없어야 정상 |
| S10-ISO08 | 중앙 S10 외부 STUN 차단 재검증의 개별 정의 | 단위/동일 미디어 회귀 | 비대상: 검증 준비만 변경 | 비대상: 제품/바이너리 미변경 | 비대상 | 비대상: UI 없어야 정상 |
| S10-ISO09 | 중앙 S10 외부 STUN 차단 재검증의 개별 정의 | 단위/동일 미디어 회귀 | 비대상: 검증 준비만 변경 | 비대상: 제품/바이너리 미변경 | 비대상 | 비대상: UI 없어야 정상 |
| S10-ISO10 | 중앙 S10 외부 STUN 차단 재검증의 개별 정의 | 단위/동일 미디어 회귀 | 비대상: 검증 준비만 변경 | 비대상: 제품/바이너리 미변경 | 비대상 | 비대상: UI 없어야 정상 |

## S10 후속 2번 입력·writer 연결

| 기능 ID | 동작·PASS 기준 | 안정화 테스트 | 30분 테스트 | 120분 테스트 | UI 테스트 | UI 존재 |
| --- | --- | --- | --- | --- | --- | --- |
| S10-INPUT01 | 원본 timestamp 부재·유효 0·uint64 범위; 중앙 사전등록의 직접 oracle | 입력/writer focused | S11 최종 판정 | source/media 변경으로 S11 대상, 이번 미실행 | 이번 비대상 | 비대상: UI 없어야 정상 |
| S10-INPUT02 | SEGMENT/buffer 직렬 세대 결박; 중앙 사전등록의 직접 oracle | 입력/writer focused | S11 최종 판정 | source/media 변경으로 S11 대상, 이번 미실행 | 이번 비대상 | 비대상: UI 없어야 정상 |
| S10-INPUT03 | DISCONT 단독 연속성 유지; 중앙 사전등록의 직접 oracle | 입력/writer focused | S11 최종 판정 | source/media 변경으로 S11 대상, 이번 미실행 | 이번 비대상 | 비대상: UI 없어야 정상 |
| S10-INPUT04 | 관측기 새 수명 세대 분리; 중앙 사전등록의 직접 oracle | 입력/writer focused | S11 최종 판정 | source/media 변경으로 S11 대상, 이번 미실행 | 이번 비대상 | 비대상: UI 없어야 정상 |
| S10-INPUT05 | cache 복사 관측 보존; 중앙 사전등록의 직접 oracle | 입력/writer focused | S11 최종 판정 | source/media 변경으로 S11 대상, 이번 미실행 | 이번 비대상 | 비대상: UI 없어야 정상 |
| S10-INPUT06 | PTS 재정렬 입력 불변; 중앙 사전등록의 직접 oracle | 입력/writer focused | S11 최종 판정 | source/media 변경으로 S11 대상, 이번 미실행 | 이번 비대상 | 비대상: UI 없어야 정상 |
| S10-INPUT07 | clock 짝 읽기 provenance; 중앙 사전등록의 직접 oracle | 입력/writer focused | S11 최종 판정 | source/media 변경으로 S11 대상, 이번 미실행 | 이번 비대상 | 비대상: UI 없어야 정상 |
| S10-INPUT08 | SEGMENT 재전달 멱등성; 중앙 사전등록의 직접 oracle | 입력/writer focused | S11 최종 판정 | source/media 변경으로 S11 대상, 이번 미실행 | 이번 비대상 | 비대상: UI 없어야 정상 |
| S10-INPUT09 | 중복 설치와 BUFFER_LIST; 중앙 사전등록의 직접 oracle | 입력/writer focused | S11 최종 판정 | source/media 변경으로 S11 대상, 이번 미실행 | 이번 비대상 | 비대상: UI 없어야 정상 |
| S10-INPUT10 | 동일 buffer 다중 pad·재전달; 중앙 사전등록의 직접 oracle | 입력/writer focused | S11 최종 판정 | source/media 변경으로 S11 대상, 이번 미실행 | 이번 비대상 | 비대상: UI 없어야 정상 |
| S10-WR01 | 정상 미디어 분할·관리 저장; 중앙 사전등록의 직접 oracle | 입력/writer focused | S11 최종 판정 | source/media 변경으로 S11 대상, 이번 미실행 | 이번 비대상 | 비대상: UI 없어야 정상 |
| S10-WR02 | UTC 중간 후퇴; 중앙 사전등록의 직접 oracle | 입력/writer focused | S11 최종 판정 | source/media 변경으로 S11 대상, 이번 미실행 | 이번 비대상 | 비대상: UI 없어야 정상 |
| S10-WR03 | UTC keyframe 경계 후퇴; 중앙 사전등록의 직접 oracle | 입력/writer focused | S11 최종 판정 | source/media 변경으로 S11 대상, 이번 미실행 | 이번 비대상 | 비대상: UI 없어야 정상 |
| S10-WR04 | UTC 전진; 중앙 사전등록의 직접 oracle | 입력/writer focused | S11 최종 판정 | source/media 변경으로 S11 대상, 이번 미실행 | 이번 비대상 | 비대상: UI 없어야 정상 |
| S10-WR05 | PTS 재정렬·중복; 중앙 사전등록의 직접 oracle | 입력/writer focused | S11 최종 판정 | source/media 변경으로 S11 대상, 이번 미실행 | 이번 비대상 | 비대상: UI 없어야 정상 |
| S10-WR06 | 원본 세대 변경·재시작; 중앙 사전등록의 직접 oracle | 입력/writer focused | S11 최종 판정 | source/media 변경으로 S11 대상, 이번 미실행 | 이번 비대상 | 비대상: UI 없어야 정상 |
| S10-WR07 | 재전달·queue 처리 지연; 중앙 사전등록의 직접 oracle | 입력/writer focused | S11 최종 판정 | source/media 변경으로 S11 대상, 이번 미실행 | 이번 비대상 | 비대상: UI 없어야 정상 |
| S10-WR08 | duration 부재·overflow·관측 부재; 중앙 사전등록의 직접 oracle | 입력/writer focused | S11 최종 판정 | source/media 변경으로 S11 대상, 이번 미실행 | 이번 비대상 | 비대상: UI 없어야 정상 |
| S10-WR09 | 매핑 예산·저장 상한·복구; 중앙 사전등록의 직접 oracle | 입력/writer focused | S11 최종 판정 | source/media 변경으로 S11 대상, 이번 미실행 | 이번 비대상 | 비대상: UI 없어야 정상 |

## S10 저장소 활성화 선행 1C

| 기능 ID | 동작·PASS 기준 | 안정화 테스트 | 30분 테스트 | 120분 테스트 | UI 테스트 | UI 존재 |
| --- | --- | --- | --- | --- | --- | --- |
| S10-SC01 | 실제 반복 이벤트 fixture 유효성 | catalog focused | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| S10-SC02 | 예약의 전체 원장 읽기 제거 | catalog focused | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| S10-SC03 | 관리 V2 후보의 전체 재생 제거 | catalog focused | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| S10-SC04 | 이전 이벤트 payload 크기 감소 | catalog focused | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| S10-SC05 | 최종 이벤트와 모든 원장 ID 보존 | catalog focused | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| S10-SC06 | 멱등 checkpoint와 V2 보존 | catalog focused | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| S10-SC07 | raw checkpoint 거부 | catalog focused | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| S10-SC08 | receipt 재시도·직접 생성 거부 | catalog focused | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| S10-SC09 | SQLite·JSONL 재시작 동등성 | catalog focused | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| S10-SC10 | stage prefix 복구 선행 | catalog focused | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| S10-SC11 | 불일치 stage 보존·poison | catalog focused | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| S10-SC12 | 첫 ID 수용 순서 보존 | catalog focused | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| S10-SC13 | 암호 비활성 raw 유지 | catalog focused | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| S10-SC14 | 암호 비활성 checkpoint 거부 | catalog focused | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| S10-SC15 | 암호 비활성 receipt open 거부 | catalog focused | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| S10-SC16 | 누적 증가량 자동 checkpoint | catalog focused | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| S10-SC17 | checkpoint 전후 hold·삭제·관측 보존과 두 모드 재시작 | catalog focused | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| S10-SC18 | 쓰기·파일동기화·rename·디렉터리동기화 오류 후 poison과 재시작 | catalog focused | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| S10-SC19 | 손상·미지원·ID 충돌 원장 원문 보존 거부 | catalog focused | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| S10-SC20 | raw catalog의 receipt 투영 선행 거부 | catalog focused | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| S10-SC21 | poison 상태에서 hold 쓰기 거부 | catalog focused | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |

## S10 저장소 활성화 선행 1B

S10-SB07: SQLite -wal/-shm/-journal의 symlink·hardlink 각각 사전거부(6개); 안정화=catalog focused, 30분/120분/UI=비대상, UI 없어야 정상. 중앙에 실행 전 개별6행 등록.

| 기능 ID | 동작·PASS 기준 | 안정화 테스트 | 30분 테스트 | 120분 테스트 | UI 테스트 | UI 존재 |
| --- | --- | --- | --- | --- | --- | --- |
| S10-SB01 | 두 번째 관리 catalog 거부 | catalog focused | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| S10-SB02 | 실패 catalog의 원장·hold 변경 차단 | catalog focused | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| S10-SB03 | 연결 중 무소유 append 차단·예약 허용 | catalog focused | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| S10-SB04 | catalog 파괴 뒤 소유권 반환 | catalog focused | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| S10-SB05 | 안전하지 않은 관리 옵션 거부: outside | catalog focused | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| S10-SB05 | 안전하지 않은 관리 옵션 거부: dotdot | catalog focused | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| S10-SB05 | 안전하지 않은 관리 옵션 거부: media-symlink | catalog focused | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| S10-SB05 | 안전하지 않은 관리 옵션 거부: sqlite-symlink | catalog focused | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| S10-SB05 | 안전하지 않은 관리 옵션 거부: sqlite-hardlink | catalog focused | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| S10-SB05 | 안전하지 않은 관리 옵션 거부: disabled | catalog focused | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| S10-SB06 | 실패 연결 해제·poison journal 새 수명 재open | catalog focused | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |

## S10 저장소 활성화 선행 1번

S10-SW12의 test-only `scripts/internal/recording_journal_fd_probe.h`는 journal TU 한정 실제 syscall 전달 관측이며 제품 빌드에는 포함하지 않는다.

| 기능 ID | 동작·PASS 기준 | 안정화 테스트 | 30분 테스트 | 120분 테스트 | UI 테스트 | UI 존재 |
| --- | --- | --- | --- | --- | --- | --- |
| S10-SW11 | managed 미완결 tail 원문 보존 거부 | catalog focused | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| S10-SW12 | 복제 FD CLOEXEC와 exec 후 미상속 | catalog focused | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |

실행 전 등록. 중앙 기록의 S10-SW01~10을 따른다. 원장 성장/실제 writer 연결 완료를 뜻하지 않는다.

| 기능 ID | 동작·PASS 기준 | 안정화 테스트 | 30분 테스트 | 120분 테스트 | UI 테스트 | UI 존재 |
| --- | --- | --- | --- | --- | --- | --- |
| S10-SW01 | 빈 관리 root 초기화와 수명 lease | catalog focused | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| S10-SW02 | 동일 프로세스 중복 소유 거부 | catalog focused | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| S10-SW03 | 다른 프로세스 소유·fork 상속 거부 | catalog focused | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| S10-SW04 | 소유자 파괴 뒤 lease 반환 | catalog focused | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| S10-SW05 | 관리 예약·추가·재생의 소유 FD | catalog focused | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| S10-SW06 | raw 관리 원장·구형 기본 경로 거부 | catalog focused | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| S10-SW07 | 비어 있지 않은 기존 root 무변환 보존 | catalog focused | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| S10-SW08 | 부분 초기화 재시도 정확성 | catalog focused | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| S10-SW09 | 링크·inode·marker 안전성 거부 | catalog focused | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| S10-SW10 | 정확 root·V2 옵션 단일 catalog 연결 | catalog focused | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |


## S10-3C 세그먼트 시간 저장·복구

실행 전 등록. 세부 입력과 기대값은 중앙 테스트 기록의 S10-M01~09 및 구현계획 S10-3C를 따른다.

| 기능 ID | 동작·PASS 기준 | 안정화 테스트 | 30분 테스트 | 120분 테스트 | UI 테스트 | UI 존재 |
| --- | --- | --- | --- | --- | --- | --- |
| S10-M01 | V2 정수·출처·ID·순서 roundtrip | 해당 contracts/catalog/finalize focused | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| S10-M02 | unknown null·사유·미확정 media 끝 보존 | 해당 contracts/catalog/finalize focused | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| S10-M03 | mapping 미디어 전수·중복·인접성 검증 | 해당 contracts/catalog/finalize focused | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| S10-M04 | strict 형식·정수·metadata 상한 | 해당 contracts/catalog/finalize focused | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| S10-M05 | 기존 V1 golden 불변 | 해당 contracts/catalog/finalize focused | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| S10-M06 | 영속 예약과 finalize 결박 | 해당 contracts/catalog/finalize focused | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| S10-M07 | journal/SQLite/JSONL 재시작 동등성 | 해당 contracts/catalog/finalize focused | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| S10-M08 | ready 재시작과 멱등 정리 | 해당 contracts/catalog/finalize focused | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| S10-M09 | 삭제·ID/매핑/경로 충돌 원본 보존 | 해당 contracts/catalog/finalize focused | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |

## S10-3B 저장 계층 순서 예약

세부 입력·판정은 `release-test-records.md`의 S10-O01~10 사전등록과 구현계획 S10-3B를 따른다.
실제 writer 미연결 상태의 내부 저장 API이며 장시간/UI PASS를 대신하지 않는다.

| 기능 ID | 동작·PASS 기준 | 안정화 테스트 | 30분 테스트 | 120분 테스트 | UI 테스트 | UI 존재 |
| --- | --- | --- | --- | --- | --- | --- |
| S10-O01 | 최초 번호·store 결박·payload 보존 | catalog focused | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| S10-O02 | 동일 예약 재시도 번호·원문 불변 | catalog focused | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| S10-O03 | 재시작 후 번호 재사용 없음 | catalog focused | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| S10-O04 | 네 ID 및 다른 mutation ID 충돌 거부 | catalog focused | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| S10-O05 | 손상·미지원·tail·비정상 예약 거부 | catalog focused | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| S10-O06 | 양수·중복·정수 overflow 경계 보존 | catalog focused | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| S10-O07 | 프로세스 동시 발급 유일성·다음 번호 | catalog focused | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| S10-O08 | 일반 Append 우회 및 잘못된 입력 차단 | catalog focused | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| S10-O09 | inode·parent·symlink·hardlink 원본 보호 | catalog focused | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| S10-O10 | 기존 V1 segment·catalog 호환 | catalog focused | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |

## S09 장시간 실패 필드 진단

S09-LD02(실행 전 등록): 실제 H.264 writer에 4,034ms 후퇴한 UTC와 파일 반복 PTS를 입력하여 finalized 두 구간의 V1 유효성·파일 크기·입력 UTC 보존을 확인하고, 출력된 실제 메타데이터를 LongrunProgress가 `utc-progress`로 거부하는지 확인한다. 안정화 focused 대상, 30분/120분/UI 비대상(대체 PASS 불가). 호스트 시각 변경 없음.

| 기능 ID | 동작·PASS 기준 | 안정화 테스트 | 30분 테스트 | 120분 테스트 | UI 테스트 | UI 존재 |
| --- | --- | --- | --- | --- | --- | --- |
| S09-LD01 | 기존 세그먼트 실패 기준 유지, 이유별 진단과 원문 경로/ID/임의 문자열 비노출 | recording_longrun_progress.test.mjs | 비대상 | 기존 LR02 실패 시 진단, 120분 PASS 대체 불가 | 비대상 | 비대상: UI 없어야 정상 |

## S09 종료 수명 LC01~06 실행 전 등록

실제 Registry/SharedStream/SessionManager와 barrier SourceWorker만 사용한다. 명령은 `bash scripts/internal/verify_stream_shutdown_lifecycle.sh`이며 각 시나리오는 제한된 별도 프로세스로 실행한다. LC01~04는 기존 소멸자의 stop/drain/cancel 누락이 예상 RED이고 LC05~06은 기존 grace/lease 회귀다. 실제 GStreamer/app/장시간 종료의 PASS를 대체하지 않는다.

| 기능 ID | 동작·PASS 기준 | 안정화 테스트 | 30분 테스트 | 120분 테스트 | UI 테스트 | UI 존재 |
| --- | --- | --- | --- | --- | --- | --- |
| S09-LC01 | worker strong 참조가 있어도 registry 종료 전에 Stop/join 완료 | shutdown focused | 후속 승인 범위 | 후속 승인 범위 | 비대상 | 비대상: UI 없어야 정상 |
| S09-LC02 | 모든 stream 참조를 전체 worker Stop 완료까지 유지 | shutdown focused | 후속 승인 범위 | 후속 승인 범위 | 비대상 | 비대상: UI 없어야 정상 |
| S09-LC03 | 실행 중 idle callback을 manager 소멸자가 drain | shutdown focused | 후속 승인 범위 | 후속 승인 범위 | 비대상 | 비대상: UI 없어야 정상 |
| S09-LC04 | 종료 시 pending idle 예약 취소 | shutdown focused | 후속 승인 범위 | 후속 승인 범위 | 비대상 | 비대상: UI 없어야 정상 |
| S09-LC05 | 정상 grace 이후 idle stream 및 resource 해제 | shutdown focused | 후속 승인 범위 | 후속 승인 범위 | 비대상 | 비대상: UI 없어야 정상 |
| S09-LC06 | grace 중 lease 재획득은 stream 유지 | shutdown focused | 후속 승인 범위 | 후속 승인 범위 | 비대상 | 비대상: UI 없어야 정상 |

## S09 운영 요청 최소 진단 SD01~08

개별 정의와 실행 전 등록은 `release-test-records.md`의 S09 서버 요청 경계 최소 계측 절을 따른다. 다음은 그 정의의 inventory 매핑이며 새 PASS 판정이 아니다. 진단은 기본-off이고 두 GET의 고정 route·로컬 ID·elapsed·phase·전송 결과만 출력한다.

| 기능 ID | 동작·PASS 기준 | 안정화 테스트 | 30분 테스트 | 120분 테스트 | UI 테스트 | UI 존재 |
| --- | --- | --- | --- | --- | --- | --- |
| S09-SD01 | 정확한 opt-in만 허용, 비대상 출력0 | focused | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| S09-SD02 | 두 GET enum·ID·phase·elapsed 보존 | focused/integration | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| S09-SD03 | query/header/body/원문URL 비노출 | focused/integration | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| S09-SD04 | sink 예외 비전파 | focused | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| S09-SD05 | send bool 보존·재시도 없음 | focused 및 실제 연결 검토 | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| S09-SD06 | 실제 서버 opt-in 진단 연결 | loopback integration | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| S09-SD07 | 기본-off 진단0·HTTP 계약 유지 | loopback integration | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| S09-SD08 | 정상 종료·PID/포트/temp 정리 | loopback integration | 비대상 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |

S09 사전등록 절의 실행 승인·미실행 표기는 등록 당시 이력이다. 현재 사용자 승인과
실행 결과는 구현 계획의 Task9 판정표 및 `release-test-records.md`를 따른다.
이 inventory의 기능·검증 기준은 유지하며 과거 승인 제한을 현재 상태로 재해석하지 않는다.

## S09 PE05 PATH 문자열 전수 경계 사전등록

sentinel 실행 존재만으로 PATH 우선순위 보존을 증명하지 않는다. main 직전 설정한 PATH와 predev integrated/initial/refresh 및 test_all run_step에서 sentinel이 읽은 PATH 문자열의 exact 동일성을 추가 확인한다. 기존 로그인셸 코드를 잠시 복원하여 예상 RED를 확인하고 같은3곳 nonlogin fix 후 최종 회귀한다. 호스트profile 변경 없음, 승인 focused 범위만 실행한다.

## S09 PE 로그인 셸 제거 사전등록

PE01 실제 predev run_step의 integrated·initial report 및 refresh에서 PATH앞 sentinel 선택 보존, PE02 실제 test_all run_step PATH보존, PE03 양 경계 BASH_ENV표식 미실행, PE04 기존133개 args/exit/quoting/report 회귀. 기존 fixture main 직전에서만 PATH와 BASH_ENV를 설정하여 호스트profile은 변경하지 않는다. 실제 source 함수 실행, 느린 서버 경계는 기존 stub 유지. 예상 RED는 로그인 셸 PATH 재정의로 sentinel 미실행 또는 BASH_ENV표식 실행. 안정화 focused 대상,30/120/UI 비대체. 명령 `node scripts/internal/recording_predev_failfast.test.mjs`, 이후 `bash -n scripts/internal/verify_predev_stability.sh scripts/internal/test_all.sh` 및 diffcheck. 실제 서버/predev120/커밋/푸시 금지.

## S09 PH15 보존 전용 경로 경계 사전등록

PH15: 같은 bytes/SHA의 `scripts/current.mjs`를 예외로 등록해도 실제 verifier exit1이어야 한다. 현재 예외 경로가 보존 디렉터리로 제한되지 않아 exit0인 예상 RED를 먼저 확인한다. 안정화 focused 대상이며 30/120/UI를 대체하지 않는다. 기존14개 유지, 제품 실행코드에 예외를 확장하지 않는다.

## S09 PH 보존 헤더 예외 사전등록

`recording_preserved_header.test.mjs`는 실제 verifier와 의존 파일을 임시 최소 repo에 복사해 실행한다. 역사6개 원본은 읽기만 하고 fixture 복사본만 변경한다. 예상 RED: PH01 exact6 바이트 일치인데 헤더 누락으로 exit1; 요구 exit0. 사후 오류를 RED로 바꾸지 않는다. 예외는 동결6개 헤더에만 적용하며 영어 검사는 유지한다.

| 기능 ID | 동작·PASS 기준 | 안정화 | 30분 | 120분 | UI |
| --- | --- | --- | --- | --- | --- |
| S09-PH01 | 정확6개 바이트 일치 헤더 면제 | 실제 verifier fixture | 비대체 | 준비 blocker 검사만 | 비대상 |
| S09-PH02 | 한 바이트 변경 거부 | 실제 verifier fixture | 비대체 | 준비 blocker 검사만 | 비대상 |
| S09-PH03 | 정상 헤더 추가에도 해시 변경 거부 | 실제 verifier fixture | 비대체 | 준비 blocker 검사만 | 비대상 |
| S09-PH04 | 미등록 헤더 누락 거부 | 실제 verifier fixture | 비대체 | 준비 blocker 검사만 | 비대상 |
| S09-PH05 | 일치 해시여도 영어 주석 거부 | 실제 verifier fixture | 비대체 | 준비 blocker 검사만 | 비대상 |
| S09-PH06 | 등록 파일 삭제 거부 | 실제 verifier fixture | 비대체 | 준비 blocker 검사만 | 비대상 |
| S09-PH07 | 중복 경로 거부 | 실제 verifier fixture | 비대체 | 준비 blocker 검사만 | 비대상 |
| S09-PH08 | 잘못된 해시 형식 거부 | 실제 verifier fixture | 비대체 | 준비 blocker 검사만 | 비대상 |
| S09-PH09 | 경로 이탈 거부 | 실제 verifier fixture | 비대체 | 준비 blocker 검사만 | 비대상 |
| S09-PH10 | 파일 심링크 거부 | 실제 verifier fixture | 비대체 | 준비 blocker 검사만 | 비대상 |
| S09-PH11 | 상위 디렉터리 심링크 거부 | 실제 verifier fixture | 비대체 | 준비 blocker 검사만 | 비대상 |
| S09-PH12 | 한글 사유 누락 거부 | 실제 verifier fixture | 비대체 | 준비 blocker 검사만 | 비대상 |
| S09-PH13 | 비정규 경로 거부 | 실제 verifier fixture | 비대체 | 준비 blocker 검사만 | 비대상 |
| S09-PH14 | 예외 배열 형식 오류 거부 | 실제 verifier fixture | 비대체 | 준비 blocker 검사만 | 비대상 |

승인 명령: `node scripts/internal/recording_preserved_header.test.mjs --red`, 동일 무인자 GREEN, `./server.sh verify-code-comments`, `./server.sh verify-script-inventory`, `git diff --check`. cleanup 크기/부재와 모든 결과 보존. 서버/장시간/커밋/푸시 금지.

## S09 IR 내부 report-smoke 현재 범위 사전등록

| 기능 ID | 동작·PASS 기준 | 안정화 | 30분 | 120분 | UI 존재·UI 테스트 |
| --- | --- | --- | --- | --- | --- |
| S09-IR01 | actual test_all report 직전 현재 부분 JSON 생성·한개만 render, 완료문구 없음 | 실제 shell seam TDD | 비대체 | 실행준비만 | 비대상 |
| S09-IR02 | 최종 JSON에 새 카운터/elapsed 반영, schema/logDir quote 보존 | 기존 print_summary 실제실행 | 비대체 | 실행준비만 | 비대상 |
| S09-IR03 | 특수 LOG_DIR/decoy제외·보고서 실패 및 첫실패 전파 | 실제 Python renderer/controlled failure | 비대체 | 실행준비만 | 비대상 |
| S09-IR04 | rendered 부분5/0·최종실패0/1 또는5/1 및status 정확, exactschema counts 누락/문자열/bool/음수 fail·'-'(0치환금지), 기존generic/event/predev/unknown-schema 불변 | actual Python renderer TDD | 비대체 | 실행준비만 | 비대상 |

예상 RED는 현 test_all report argv가 현재 LOG_DIR/test-summary.json 한개가 아닌 것과 조기 부분 JSON 부재다. 기존 PF/PR72개 회귀 포함, 실제 서버/장시간은 실행하지 않는다.

## S09 PD120 기존 predev 이번 실행 범위 사전등록

확정 명령 `./server.sh verify-predev --soak-minutes 120 --fail-fast`. 중앙 `S09 PD120 실제 predev 실행 사전등록`의 PD120-01~14, I01~21, 매반복 S01~05를 기존 정의에 연결한다. 새 제품기능이나 PASS 등록이 아니며 실제 child assertion/반복 전수는 실행 후 보존한다. main env와 cleanup 범위는 실행 전 확정 대상이다.

| 기능 ID | 동작·PASS 기준 | 안정화 | 30분 | 120분 | UI 존재·UI 테스트 |
| --- | --- | --- | --- | --- | --- |
| S09-PD120 | 기존 predev build/mainserver/integrated21/반복5/queue2/idle/stop/ports/report/cleanup exact 실행 | 선수 결과 별도 | 이번 미실행·비대체 | 기존 승인된120 사전등록, 실제 미실행 | Codex RuleUI 제외; UI풀테스트 별도 미실행 |

외부 TURN/LAN/RTSP/HTTP·HLS 미승인 제외. test_all 내부 report-summary 전체/tmp glob은 IR 보완으로 현재 부분 summary 한개만 읽도록 수정·seam 검증했다. 실제predev은 미실행이다. 녹화직접120/자원추세 정상 판정을 이번 predev으로 대체하지 않는다.

## S09 PR predev 보고서 입력 범위 사전등록

| 기능 ID | 동작·PASS 기준 | 안정화 | 30분 | 120분 | UI 존재·UI 테스트 |
| --- | --- | --- | --- | --- | --- |
| S09-PR01 | 실제 initial/refresh 호출이 현재 SUMMARY_FILE 한개만 전달 | 기존 PF seam TDD | 실제 미실행·비대체 | 실제 미실행·비대체 | 비대상 |
| S09-PR02 | 공백/두 종류 따옴표/명령치환 문자가 argv 그대로 유지되고 실행되지 않음 | 실제 shell 경계 검사 | 비대체 | 비대체 | 비대상 |
| S09-PR03 | 실제 Python summarizer 출력에서 unrelated fixture 제외, initial/refresh 실패 기록과 exit 전파 | 임시 현재/무관 JSON 및 실패경계 | 비대체 | 비대체 | 비대상 |
| S09-PR04 | summary 이름의 [x]*?를 Python glob에서도 리터럴 처리, 매칭 decoy 제외 | 실제 Python renderer RED→GREEN | 비대체 | 비대체 | 비대상 |
| S09-PR05 | deprecated: 임시 Python formatter 실패경계 제거, Bash builtin 치환으로 단순화 | 62836 RED 이력 보존; 최종 PR04로 실제 renderer 검증 | 비대체 | 비대체 | 비대상 |

예상 RED: 현재 initial/refresh argv의 첫 입력이 현재 summary와 다르거나 glob인 검사 실패. 공통 summarizer/schema/step counts/기본 fail-fast 변경 없이 호출 입력만 보완한다. pretty report는 전수 증거표를 대체하지 않는다.

## S09 PF predev integrated fail-fast 전달 사전등록

기존 predev 실제 main/run_step을 테스트 전용 서버·네트워크 경계 stub과 실행한다. 예상 RED는 명시 `--fail-fast` 실행의 integrated child argv에서 옵션이 빠지는 assertion이다. 기본 cumulative 동작과 다른 옵션은 유지한다. 서버/장시간 검증이 아니라 실행 인자·실패 전파 계약 검사다.

| 기능 ID | 동작·PASS 기준 | 안정화 | 30분 | 120분 | UI 존재·UI 테스트 |
| --- | --- | --- | --- | --- | --- |
| S09-PF01 | 명시 fail-fast가 integrated child에 전달, 기본 실행에는 없음 | focused TDD 승인 | 실제 미실행·비대체 | 실제 미실행·비대체 | 비대상: UI 없어야 정상 |
| S09-PF02 | no-start/external/rules/VA/image/redaction 옵션 보존 | focused 실행 승인 | 비대체 | 비대체 | 비대상 |
| S09-PF03 | child 실패후 후속 case 차단·기본 cumulative 보존·cleanup | 실제 main 경계 및 기존 failure fixture | 비대체 | 비대체 | 비대상 |

## S09 SI 조건부 dispatch 인식 보완 사전등록

메인 session67480 `./server.sh verify-script-inventory` exit1/11pass1fail: documented commands unknown startup7refs. 초기 '문서오류' 설명은 정정한다. 실제 server.sh3067 조건부 --unit sh 및 기본 mjs 분기는 존재하고 파서가 누락했다. SI01 실제형태 조건부 두target RED, SI02 직선/alias/bash/node/ROOT_DIR 고정path, SI03 외부경로/python/주석/문자열가짜exec/다른case require혼입거부. 임의shell 전체파서 아님. 신규순수검사→동일목록검증만승인; startup/app/GST/auth/장시간실행금지.

| 기능 ID | 동작·PASS 기준 | 안정화 | 30분 | 120분 | UI 존재·UI 테스트 |
| --- | --- | --- | --- | --- | --- |
| S09-SI01 | 조건부startup두target | 순수TDD/목록검증 승인 | 비대상 | 비대상 | 비대상 |
| S09-SI02 | 직선·alias·고정canonical path | 순수검사 승인 | 비대상 | 비대상 | 비대상 |
| S09-SI03 | 가짜exec/외부path/다른case 거부 | 순수음성 승인 | 비대상 | 비대상 | 비대상 |

## S09 LR 실제 경로 구현 사전등록(실제 실행 금지)

TDD 스킬 적용. LR01 명시120분 CLI만 허용·오류temp전거부, LR02 bounded 증분 segment/삭제순서·각채널30초진전·중복/metadata오류거부, LR03 실제revision조회 후 quota128MiB/age3h 및 disable→snapshot→disabled restart→reenable 순서, LR04 PID별5초표본/10000상한/summary reviewRequired·duration증명분리. 예상 RED: parseLongrunArgs(['--duration-minutes','120'])가7200000을 반환하지 못하는 assertion; 이후 진전/삭제/정지 검증의 미구현 assertion. 순수 합성clock/행은 실제녹화PASS가 아니다. 실제앱/GST/build/auth/120분 금지.

| 기능 ID | 동작·PASS 기준 | 안정화 | 30분 | 120분 | UI 존재·UI 테스트 |
| --- | --- | --- | --- | --- | --- |
| S09-LR01 | 기간/unknown CLI temp전거부 | 순수·CLI음성 승인 | 비대체 | 실행도구 구현만, 실제미실행 | 비대상 |
| S09-LR02 | 두채널UTC진전/30초 watchdog/삭제상관/ID상한 | 순수단위 승인 | 비대체 | 직접120분 미실행 | 비대상 |
| S09-LR03 | 정상API revision·disable/restart/reenable·immutable/SHA | 순수계약만 승인 | 미실행 | 실제경로 미실행 | 비대상 |
| S09-LR04 | PID별표본/요약/실측duration·cleanup | 순수단위 승인 | 미실행 | 자원판정reviewRequired 유지 | 비대상 |


## S09 AP10-F seeded source 기대집합 보완 사전등록

실제 GET /ops/api/sources의 sources/sourceId를 초기 독립 기대집합으로 고정하고 성공 POST ID를 추적, 재시작 GET 목록과 exact 대조한다. status 응답 자체로 기대값을 만들지 않는다. 순수 helper 15case: seeded 초기집합, admin seeded 허용, 허용scope 필터, 무관scope빈집합, 누락/중복/잘못ID/권한외extra 거부, 목록형식거부, 초기중복거부, 재시작 동일/누락/extra, POST ID추가, 잘못scope거부. 예상 RED는 sourceRegistryIds가 빈집합을 반환하여 seeded 초기집합 assertion 실패. 실제 앱 재검증 아님.

| 기능 ID | 동작·PASS 기준 | 안정화 | 30분 | 120분 | UI 존재·UI 테스트 |
| --- | --- | --- | --- | --- | --- |
| S09-AP10-F | 독립 source 초기집합·POST 추적·재시작 exact 대조·scope 누락/중복/권한외 ID 거부 | 진행 대상: 순수15case 승인, 실제앱 재실행 금지 | 기존 필수영역 미실행 | 녹화직접 미실행 | 비대상: 검증기 내부 |

S09-LS03 사전보완: 테스트 check 밖 fixture 예외도 failed1/nonzero로전파하고 기존51case미완주도실패한다. 테스트전용 --fixture-error 음성실행으로비정상exit/본문비노출확인뒤51단위재실행. 안정화한정승인·실제서버/장시간/UI비대체.

| 기능 ID | 동작·PASS 기준 | 안정화 | 30분 | 120분 | UI 존재·UI 테스트 |
| --- | --- | --- | --- | --- | --- |
| S09-LS01 | PID/start 분리·first/last/max/delta/elapsed·warmup후2표본 미달null | 진행 대상: 순수단위 승인 | 도구준비만·실행미승인 | 도구준비만·실행미승인 | 비대상: UI 없어야 정상 |
| S09-LS02 | 필수값/시간/identity/cumulative 감소·10000표본/64그룹 상한거부 | 진행 대상: 순수음성단위 승인 | 미실행 | 미실행 | 비대상 |
| S09-LS03 | gap 실측표시·항상 resourceTrendPass false/reviewRequired true | 진행 대상: 결과한계단위 | 실제longrun대체불가 | 실제longrun대체불가 | 비대상 |

| 기능 ID | 동작·PASS 기준 | 안정화 | 30분 | 120분 | UI 존재·UI 테스트 |
| --- | --- | --- | --- | --- | --- |
| S09-EQ01 | worker 최초기록 뒤 deadline전 동일event 원장 증가0 | 진행 대상: enqueue focused 승인 | 버전필수·이번 미실행 | retry영향, 이번 미실행 | 비대상: UI 없어야 정상 |
| S09-EQ02 | 여러 event 각각처리·고유ID/일정 보존 | 진행 대상: 동일 focused | 버전필수·이번 미실행 | 이번 미실행 | 비대상: UI 없어야 정상 |
| S09-EQ03 | watchdog/StopAndDrain/원 exit/temp부재 | 진행 대상: bridge-only 회귀 | 이번 미실행 | 이번 미실행 | 비대상: UI 없어야 정상 |

S09-EQ01~03 사전등록: 실제 Catalog+Bridge 고정clock/미해석PTS Pending으로 worker 최초 journal 기록을 확인한 뒤 retry deadline 이전 journal 증가0, 두 event 각각 최초처리·ID보존을 검증한다. Enqueue move 후 키 소실이면 retry 일정이 Refill로 당겨져 EQ01 예상 RED. 안정화: --enqueue-only RED/GREEN 및 --bridge-only 관련회귀 승인. 30/120/UI·실제app·외부/GST source 이번 미실행, UI 없어야 정상. bounded watchdog·temp bytes/부재 cleanup 포함.

S09-OBS 실제 실행 사전등록: 승인된 `./server.sh verify-v410-recording-foundation --app-observe` 단기1회에서 native collector compile, 실제 PID별 RSS/thread/FD/startIdentity, 7type·고유ID·UTF8 ID bytes, 동일 archive 새 PID 재시작과 cursor 연속성, 최종 backlog/partial0, 기존 AP 전수 및 프로세스/포트/root/registry/log cleanup을 확인한다. 안정화 진행 대상·이번1회 승인. 30분/UI 미승인 필수 blocker, 직접녹화120 미승인·기존 predev120 비대체. 자원 추세 PASS 또는 전체 S09 완료로 확대하지 않는다.

S09-OBS04 사전등록 보완: 정상 tick의 partial bytes 관측은 허용하지만 최종 close의 partial>0은 거부한다. 앱 종료 미확인/개별실패는 observationCompleted=false이며 실패정리 close(false)는 reader FD를 닫는다. 안정화 단위 승인; 30/120/UI 이번 미실행, UI 없어야 정상.

S09-OBS 사전등록: 5초currentPID collector+증분journal7type·고유mutation/entity ID합100k/UTF8합32MiB bound, 동일livePID start변경거부·새PID그룹분리, 최초journal미생성pending/최종미측정실패, 중복tick금지·stop in-flight대기·오류시앱cleanup유지. 안정화 신규순수/임시파일단위만이번승인, 실제app-observe/30/UI/direct120미승인·predev120비대체. UI없어야정상. 가짜collector 단위는실제녹화PASS아님.

S09-ALL 사전등록: 기본/--all credential guard→고정runtime→고정app-auth 순서, 실패후후속미실행, exitnull/nonzero·summary누락/실패·cleanup누락/실패거부, runtime환경5secret제거·app계승, 출력secret redaction을순수DI로검사한다. 안정화 신규단위+authhelper24회귀만승인. 30/UI버전필수미승인·120기존predev승인과직접녹화미승인분리, 이번모두미실행. UI없어야정상인검증기다.

## S09 증분 journal reader 사전등록

| 기능 ID | 동작·PASS 기준 | 안정화 | 30분 | 120분 | UI 존재·UI 테스트 |
| --- | --- | --- | --- | --- | --- |
| S09-JR01 | LF완결행·빈파일·append·여러poll 무중복·consumed byte offset | 진행 대상: 신규단위 승인 | 버전필수·이번미실행 | 직접녹화120 미승인·reader준비만 | 비대상: UI 없어야 정상 |
| S09-JR02 | split UTF8·완성JSON noLF·tail repair 미소비재읽기 | 진행 대상 | 미진행: 단위경계 | 미진행: 단위경계 | 비대상 |
| S09-JR03 | chunk/poll/backlog/line 상한·초과오류 latch | 진행 대상 | 이번미실행 | 이번미실행 | 비대상 |
| S09-JR04 | 손상JSON/schema/type/기본필드 거부·7type 양성 | 진행 대상 | 미진행 | 미진행 | 비대상 |
| S09-JR05 | root containment·symlink·비일반파일·inode교체·prefixtruncate·close 오류 | 진행 대상 | 미진행 | 미진행 | 비대상 |
| S09-JR06 | 실제임시파일/FD 종료·bytes와부재cleanup | 진행 대상 | 이번미실행 | 이번미실행 | 비대상 |

S09-PM04 사전등록 보완: OS errno6개(EACCES/EPERM/ENOENT/ESRCH/EIO/0) 분류 양성·stage보존을 순수helper에서 검사. 실제Linux권한/PID재활용 재현은 미실행.

## S09 외부 PID collector 사전등록

| 기능 ID | 동작·PASS 기준 | 안정화 | 30분 | 120분 | UI 존재·UI 테스트 |
| --- | --- | --- | --- | --- | --- |
| S09-PM01 | 실제 별도 child PID/startIdentity와 유효 RSS/FD/thread 측정 | 진행 대상: collector focused 승인 | 진행 대상: 버전 필수·미승인 | 녹화 직접120 측정기 준비·실행 미승인 | 비대상: UI 없어야 정상 |
| S09-PM02 | child FD16개/thread3개/64MiB 페이지 접근 뒤 실제 증가, 해제 뒤 FD/thread 감소 | 진행 대상 | 실제 장시간 미실행 | 실제 장시간 미실행 | 비대상 |
| S09-PM03 | 종료 PID/잘못PID/누락/범위 초과는 null·validfalse·nonzero | 진행 대상 | 미진행: 단위 경계 | 미진행: 단위 경계 | 비대상 |
| S09-PM04 | 숫자·부분 stat/overflow/부분 FD read·포화 판별력 | 진행 대상: 순수 parser | 미진행 | 미진행 | 비대상 |
| S09-PM05 | child 완전종료·임시binary/root bytes 확인 및 부재 | 진행 대상 | 이번 미실행 | 이번 미실행 | 비대상 |

AP10-D/F 추가: 실제 timeline nonempty9101 전수(옛fallbackID 재표출 요구없음), 공유helper empty/타channel 거부·양성 및 coverage 한개누락 거부·전수양성. 안정화 helper 범위이며 실제auth 미실행.

AP10-F 추가 판별력: Cookie/cookie/Headers의 unauth 제거·Range/Content-Type 보존·중첩 secret 양순서 치환. AP10-D/E는 timeline admin/허용200·unauth401·다른channel/viewer/noops403, status unauth401까지 포함하며 실제auth는 아직 미실행이다.

S09 AP10 auth 구현 사전등록(실제auth 실행금지): AP10-A credential5개string≥12/서로다름·root/GST/app생성전거부; AP10-B setup/login/productionhash·재시작재로그인·메모리cookie; AP10-C 실제continuous/fallback/derived각admin+9101operator Range206 literal; AP10-D unauth401/9201operator media404·timeline403/viewer403/noops403·known/nonexistent응답동일; AP10-E status현재source scope필터·제한계정globalobservations없음·민감정보비노출; AP10-F 순수credential/cookie/redaction helper RED/GREEN 및일회격리cleanup. 안정화영역 구현/단위만이번승인, 실제auth는5env미설정으로미실행. 30/120/UI는기존영역판정유지·대체아님.

S09 AP08 원장진행 TDD 사전등록: AP07 완료 직후cursor/knownIDs 이후 신규9201 continuous Finalized distinct2개를 양수UTC/PTS·size·64lowerhex SHA·finalized_at_ms·시간진행으로 확인한다. 즉시tombstone된자료도 finalized→request→completed순서와실파일부재로검증하되 원장SHA를실파일재검사로표현하지 않는다. quota256복원후신규finalize와정상stop뒤살아있는파일size/SHA를별도확인한다. 단위 oldcursor/다른channel/중복ID/1개/invalidrange/size/sha/순서/Stop-old-only 거부, 실제형태두개즉시삭제인식 기대RED→GREEN. 기존AP08안정화영역이며 실제앱/장시간/UI는이번미실행.

S09 AP08 진단 사전등록: 기존 live-only/10초 predicate는 변경하지 않고 대기 직전·성공/실패 직후 quota PUT 이전offset부터9201 finalized/deletion_requested/completed 순서와 whitelist metadata를 보존한다. GET recordings/status의 해당channel enabled/active/storageBlocked/continuousBytes/quota를 수집하되 active는 subscriber존재이며 packet진행 증거가 아니다. 진단오류와 원래timeout을 모두 보존한다. 안정화 AP08 진단만이며 PASS 승격/장시간/UI 승인은 아니다.

S09 AP06/AP12 입력 보완 사전등록: 실제 retention snow/x264 quant0/keyint30/30fps/120frames는640×360으로 생성하고 sourcePOST 전에 실측96MiB 미만을 요구한다. root448MiB 선제감시/512MiB 한계·180초·합계64MiB초과/각segment64MiB미만/3개이상/15초 관측 기준은 그대로다. 과거1280×720 실패는 중앙기록 역사로 보존한다. 이번 실제 앱은 event→retention→동일archive restart 연속상태 검증 때문에 AP02/03도 재실행하며 별도 unit/build/장시간/UI 승인은 아니다.

S09 AP11 시간 대조 보완 사전등록: 실제 EventRecord 공통 `updateTime`을 응답 PTS의
밀리초 변환과 정확 비교한다. track-health 메타데이터에는 top-level pts가 없다는
producer 계약을 반영하며, 기본 event-record 메타데이터는 추가 pts 일치도 확인한다.
두 실제 schema의 양성, 잘못된 updateTime·알 수 없는 schema·누락 metadata 거부를
선택기 검사에 추가한다. 기존 old ID·rule·source·track·복수 ID 거부는 유지한다.
이는 기존 AP11 안정화 범위이며 제품·공개 schema 변경이나 장시간/UI 실행 승인이 아니다.

S09 AP03/AP11 선택 보강 사전등록: eventCase 전 durable ID 전수snapshot, 실제 tap dispatch의 rule/type/track 및 result sourceKey/PTS와 durable stream/channel·updateTime 및 metadata.ruleId tuple 일치, 최초응답 최소track 고정·고유ID 유일성. oldID update/wrongrule/tap/시간/track/복수ID 음성과 정확신규·동일ID 반복 양성을 `--event-selection-negative`로 검사한다. metadata는 위 두 실제 schema만 허용하고 기본 schema의 추가PTS 대조도 유지한다. AP03 새rule9102 전에 실제 latest PTS가 최신finalized.endPTS+750ms를 넘는지 확인하고 rollback/epoch변화는 오류로 보존한다. 기존 AP03/AP11의 안정화 영역 보강이며 30/120/UI 승인·범위는 기존 행 유지.

## V410 S09 fallback identity binding 사전등록

| 기능 ID | 동작·PASS 기준 | 안정화 | 30분 | 120분 | UI 존재·UI 테스트 |
| --- | --- | --- | --- | --- | --- |
| V410-S09-BF-01 | 실제 bridge→catalog→reader raw/numeric mapped fallback 양성 및 journal reopen | 신규 binding focused 및 승인 S05/S06 short | 진행 대상: 버전 필수, 이번 미실행 | 녹화 영역 대상, 직접검사 미승인·이번 미실행 | 비대상: 내부 결속, UI 대체 아님 |
| V410-S09-BF-02 | 독립 고정 length-prefix SHA vector와 opaque 길이/문자 | 신규 binding focused 및 승인 S05/S06 short | 진행 대상: 버전 필수, 이번 미실행 | 녹화 영역 대상, 직접검사 미승인·이번 미실행 | 비대상: 내부 결속, UI 대체 아님 |
| V410-S09-BF-03 | event/rawstream/rawchannel/catalogchannel/catalogsource/link/hash 각각 변조 거부 | 신규 binding focused 및 승인 S05/S06 short | 진행 대상: 버전 필수, 이번 미실행 | 녹화 영역 대상, 직접검사 미승인·이번 미실행 | 비대상: 내부 결속, UI 대체 아님 |
| V410-S09-BF-04 | malformed bound prefix·noOpenSSL failclosed 및 legacy downgrade 금지 | 신규 binding focused 및 승인 S05/S06 short | 진행 대상: 버전 필수, 이번 미실행 | 녹화 영역 대상, 직접검사 미승인·이번 미실행 | 비대상: 내부 결속, UI 대체 아님 |
| V410-S09-BF-05 | resolver 실패/다른 채널 및 기존 bound 재결속 거부: ID/locator 원본 보존 | 신규 binding focused 및 승인 S05/S06 short | 진행 대상: 버전 필수, 이번 미실행 | 녹화 영역 대상, 직접검사 미승인·이번 미실행 | 비대상: 내부 결속, UI 대체 아님 |
| V410-S09-BF-06 | 같은 RecordFallback 반복 ID 안정 및 legacy 자동승격 없음 | 신규 binding focused 및 승인 S05/S06 short | 진행 대상: 버전 필수, 이번 미실행 | 녹화 영역 대상, 직접검사 미승인·이번 미실행 | 비대상: 내부 결속, UI 대체 아님 |
| V410-S09-BF-07 | legacy exact 양성·legacy mismatch 거부·resolver 없는 exact 경로 | 신규 binding focused 및 승인 S05/S06 short | 진행 대상: 버전 필수, 이번 미실행 | 녹화 영역 대상, 직접검사 미승인·이번 미실행 | 비대상: 내부 결속, UI 대체 아님 |
| V410-S09-BF-08 | wrongchannel·manifest type/size/symlink/duplicate/tombstone 기존 read guard 유지 | 신규 binding focused 및 승인 S05/S06 short | 진행 대상: 버전 필수, 이번 미실행 | 녹화 영역 대상, 직접검사 미승인·이번 미실행 | 비대상: 내부 결속, UI 대체 아님 |
| V410-S09-BF-09 | UTF8·빈 rawstream 규칙 및 필수 identity 빈값 거부 | 신규 binding focused 및 승인 S05/S06 short | 진행 대상: 버전 필수, 이번 미실행 | 녹화 영역 대상, 직접검사 미승인·이번 미실행 | 비대상: 내부 결속, UI 대체 아님 |
| V410-S09-BF-10 | focused 실행 오류전파·mktemp bytes/부재·S05/S06 관련 회귀 | 신규 binding focused 및 승인 S05/S06 short | 진행 대상: 버전 필수, 이번 미실행 | 녹화 영역 대상, 직접검사 미승인·이번 미실행 | 비대상: 내부 결속, UI 대체 아님 |

## V410 S09 실제 앱 통합 사전 등록

AP05 재개 음성 세부항목: 공유 fallbackMedia의 completed encoded 실파일 선택, encoded schema/status/contentType·byteSize·격리경로 변형 거부. AP02는 실제 첫 continuous finalized barrier 뒤 rule/tap으로 양수 PTS를 관측하며 초기 음수 이벤트 이력은 정상 provisional 실패 원인으로 보존한다.

AP13은 실제 초기 provisional event의 manifest identity 관찰만 수행한다. requested_range·fallback 재생 성공/Range 또는 전체 앱 검증의 PASS를 뜻하지 않는다.

| 기능 ID | 동작·PASS 기준 | 안정화 | 30분 | 120분 | UI 존재·UI 테스트 |
| --- | --- | --- | --- | --- | --- |
| V410-S09-AP-13 | 실제 생성 manifest의 event 일치, stream/channel hash·catalog 일치boolean·encodedClip 필드 관찰 및 종료cleanup | --identity-diagnostic 1회 | 미진행: 진단 자체 비대상 | 미진행: 진단 자체 비대상 | 비대상: 진단 |

oracle 2/3/4와 실제 생성 media의 일부 oracle1을 검증한다. auth 미설정 상태에서는 `--app-nonauth` 부분 실행만 허용하며 전체 foundation/S09 PASS가 아니다. 실제 로컬 source/event를 사용하고 원장/SQLite는 읽기 보조일 뿐 합성 상태로 대체하지 않는다.

| 기능 ID | 동작·PASS 기준 | 안정화 | 30분 | 120분 | UI 존재·UI 테스트 |
| --- | --- | --- | --- | --- | --- |
| V410-S09-AP-01 | 실제 앱 opt-in source→finalized의 ID·metadata·SHA·UTC/PTS 및 파일크기 대조 | 신규 foundation focused | 진행 대상: 버전 완료 필수, 미승인·이번 미실행 | 120분 영역 대상; 녹화직접검사 미승인, predev120 비대체 | 비대상: API 검증; UI 풀테스트 대체 아님 |
| V410-S09-AP-02 | 실제 rule/tap EventRecord와 동일 event/link의 frame-buffer fallback 포착 | 신규 foundation focused | 진행 대상: 버전 완료 필수, 미승인·이번 미실행 | 120분 영역 대상; 녹화직접검사 미승인, predev120 비대체 | 비대상: API 검증; UI 풀테스트 대체 아님 |
| V410-S09-AP-03 | 별도 실제 event의 Complete derived·remux provenance·원본 overlap 결속 | 신규 foundation focused | 진행 대상: 버전 완료 필수, 미승인·이번 미실행 | 120분 영역 대상; 녹화직접검사 미승인, predev120 비대체 | 비대상: API 검증; UI 풀테스트 대체 아님 |
| V410-S09-AP-04 | timeline event priority200·continuous100·supersededByEventIds 및 요청/실제 범위 | 신규 foundation focused | 진행 대상: 버전 완료 필수, 미승인·이번 미실행 | 120분 영역 대상; 녹화직접검사 미승인, predev120 비대체 | 비대상: API 검증; UI 풀테스트 대체 아님 |
| V410-S09-AP-05 | derived와 fallback 각각 실제 GET Range206·Content-Range·literal 파일 byte 비교; fallback은 manifest가 아닌 completed encodedClip.mediaPath WebM이며 schema/event/codec/size/containment 확인 | 신규 foundation focused | 진행 대상: 버전 완료 필수, 미승인·이번 미실행 | 120분 영역 대상; 녹화직접검사 미승인, predev120 비대체 | 비대상: API 검증; UI 풀테스트 대체 아님 |
| V410-S09-AP-06 | 별도 실제 source에서 3개 이상 segment, 각64MiB미만·합계64MiB초과 확보 | 신규 foundation focused | 진행 대상: 버전 완료 필수, 미승인·이번 미실행 | 120분 영역 대상; 녹화직접검사 미승인, predev120 비대체 | 비대상: API 검증; UI 풀테스트 대체 아님 |
| V410-S09-AP-07 | 유효quota64MiB 하향 뒤 독립 endUTC/ID oldest 삭제요청·완료·tombstone·실파일 부재 | 신규 foundation focused | 진행 대상: 버전 완료 필수, 미승인·이번 미실행 | 120분 영역 대상; 녹화직접검사 미승인, predev120 비대체 | 비대상: API 검증; UI 풀테스트 대체 아님 |
| V410-S09-AP-08 | retention 뒤 신규 finalized 생성 및 삭제ID 부활 없음 | 신규 foundation focused | 진행 대상: 버전 완료 필수, 미승인·이번 미실행 | 120분 영역 대상; 녹화직접검사 미승인, predev120 비대체 | 비대상: API 검증; UI 풀테스트 대체 아님 |
| V410-S09-AP-09 | 정상 종료·새PID 동일 archive 재시작, 기존 ID/metadata/SHA/link/관측/tombstone 보존 및 재녹화 | 신규 foundation focused | 진행 대상: 버전 완료 필수, 미승인·이번 미실행 | 120분 영역 대상; 녹화직접검사 미승인, predev120 비대체 | 비대상: API 검증; UI 풀테스트 대체 아님 |
| V410-S09-AP-10 | 5개 auth env 부재 시 시작금지; nonauth 부분coverage와 전체PASS 분리 | 신규 foundation focused | 미진행: 검증도구 자체 비대상 | 미진행: 검증도구 자체 비대상 | 비대상: API 검증; UI 풀테스트 대체 아님 |
| V410-S09-AP-11 | literal oracle 음성대조: priority/Range bytes/oldest순서/중복ID 변조 거부 | 신규 foundation focused | 미진행: 검증도구 자체 비대상 | 미진행: 검증도구 자체 비대상 | 비대상: API 검증; UI 풀테스트 대체 아님 |
| V410-S09-AP-12 | 격리cwd/env/loopback·소유 process 종료·port0·cleanup; 생성 중512MiB 감시와 timeout 실패전파 | 신규 foundation focused | 미진행: 검증도구 자체 비대상 | 미진행: 검증도구 자체 비대상 | 비대상: API 검증; UI 풀테스트 대체 아님 |


## V410 S09 실제 runtime 통합 사전 등록

이 묶음은 oracle 1/5/7만 검증한다. warmup 1회 후 3회 반복하며 RSS는 관찰값일 뿐 누수 없음의 판정이 아니다.
실제 S05 검출용 입력 `video/imports/va_tracking_event_1280x720_30fps_h264.mp4`를 사용한다. RT04는 대기 중 공개 snapshot의 positive detections/tracks/유효 context 누적 관측과 durable locator를 함께 요구하며 loop 뒤 ambiguous epoch를 임의 추정하지 않는다.

| 기능 ID | 동작·PASS 기준 | 안정화 | 30분 | 120분 | UI 존재·UI 테스트 |
| --- | --- | --- | --- | --- | --- |
| V410-S09-RT-01 | 실제 등록 file source opt-in 뒤 source worker/stream/recorder/subscriber 각각 1 | 신규 runtime focused | 진행 대상: 버전 완료 필수, 미승인·이번 미실행 | 120분 영역 대상; 녹화직접검사 미승인, predev120은 비대체 | 비대상: 내부 통합; UI 풀테스트 대체 아님 |
| V410-S09-RT-02 | 동일 revision reconcile 반복 및 analysis attach 뒤 recorder/source 비증식 | 신규 runtime focused | 진행 대상: 버전 완료 필수, 미승인·이번 미실행 | 120분 영역 대상; 녹화직접검사 미승인, predev120은 비대체 | 비대상: 내부 통합 |
| V410-S09-RT-03 | 실제 source packet finalize의 V1/source/channel/epoch/UTC/PTS/파일크기/SHA 정확성 | 신규 runtime focused | 진행 대상: 버전 완료 필수, 미승인·이번 미실행 | 120분 영역 대상; 녹화직접검사 미승인, predev120은 비대체 | 비대상: 내부 통합 |
| V410-S09-RT-04 | 실제 decoder/tracker→production projector→catalog observation 및 실제 finalized locator 존재 | 신규 runtime focused | 진행 대상: 버전 완료 필수, 미승인·이번 미실행 | 120분 영역 대상; 녹화직접검사 미승인, predev120은 비대체 | 비대상: 내부 통합 |
| V410-S09-RT-05 | locator 동일 source/channel/epoch, PTS 반개구간 및 UTC 환산 대조 | 신규 runtime focused | 진행 대상: 버전 완료 필수, 미승인·이번 미실행 | 120분 영역 대상; 녹화직접검사 미승인, predev120은 비대체 | 비대상: 내부 통합 |
| V410-S09-RT-06 | stop/drain 뒤 stream/source/subscriber/recorder/analysis 0, partial/ready/marker 잔여 없음 | 신규 runtime focused | 진행 대상: 버전 완료 필수, 미승인·이번 미실행 | 120분 영역 대상; 녹화직접검사 미승인, predev120은 비대체 | 비대상: 내부 통합 |
| V410-S09-RT-07 | warmup1+3회 실제 종료 후 thread/FD/RSS 측정 및 내부 owner 0; 전역 pool drift 별도 보고 | 신규 runtime focused | 진행 대상: 버전 완료 필수, 미승인·이번 미실행 | 120분 영역 대상; 녹화직접검사 미승인, predev120은 비대체 | 비대상: 내부 통합 |
| V410-S09-RT-08 | oracle 음성 대조(중복 count/잘못된 epoch/상한 PTS/UTC 변조/잔여 subscriber) 거부; wrapper 오류전파·cleanup | 신규 runtime focused | 미진행: 도구 자체 비대상 | 미진행: 도구 자체 비대상 | 비대상: 검증 도구 |
| V410-S09-RT-09 | 실제 source 직후 조기실패·예외/정상 공통 RAII 정리, idle cleanup owner0 뒤 해제; timeout nonzero failclosed | 신규 --fail-after-source 및 정상 runtime | 미진행: 도구 자체 비대상 | 미진행: 도구 자체 비대상 | 비대상: 검증 도구 |

## V410 S08 startup 복구 사전 등록

ST13 검증기 경계: seed/read-model shell 조기실패(CXX 실패 포함)는 nonzero로 전파하고 전용 build root 정리. ST14는 실제 local sample source opt-in과 녹화 enabled=1에서 정상 신규 segment 및 복구 실패 시 worker 부작용 부재를 대조한다.

| 기능 ID | 동작·PASS 기준 | 안정화 | 30분 | 120분 | UI 존재·UI 테스트 |
| --- | --- | --- | --- | --- | --- |
| V410-S08-ST-01 | 실제 앱 recording off에서도 missing finalized를 Corrupt로 내구 반영한 뒤 HTTP 시작 | startup focused·실제 격리 앱 및 승인 영향 회귀 | 미진행: 버전 최종코드 별도 승인 | 진행 대상: 최종코드 기존 승인 predev120, 이번 실행 없음 | 비대상: 내부 startup; UI 풀테스트 대체 아님 |
| V410-S08-ST-02 | 실제 healthy archive 시작·재시작 metadata와 journal byte noappend | startup focused·실제 격리 앱 및 승인 영향 회귀 | 미진행: 버전 최종코드 별도 승인 | 진행 대상: 최종코드 기존 승인 predev120, 이번 실행 없음 | 비대상: 내부 startup; UI 풀테스트 대체 아님 |
| V410-S08-ST-03 | ready 원래 ID 복구가 HTTP 시작 전에 완료·반복 noappend | startup focused·실제 격리 앱 및 승인 영향 회귀 | 미진행: 버전 최종코드 별도 승인 | 진행 대상: 최종코드 기존 승인 predev120, 이번 실행 없음 | 비대상: 내부 startup; UI 풀테스트 대체 아님 |
| V410-S08-ST-04 | durable pending 삭제 존재/이미 unlink 상태를 tombstone으로 수렴·재시작 멱등 | startup focused·실제 격리 앱 및 승인 영향 회귀 | 미진행: 버전 최종코드 별도 승인 | 진행 대상: 최종코드 기존 승인 predev120, 이번 실행 없음 | 비대상: 내부 startup; UI 풀테스트 대체 아님 |
| V410-S08-ST-05 | pending+stale ready는 삭제 완료 뒤 ready 충돌로 시작 거부 | startup focused·실제 격리 앱 및 승인 영향 회귀 | 미진행: 버전 최종코드 별도 승인 | 진행 대상: 최종코드 기존 승인 predev120, 이번 실행 없음 | 비대상: 내부 startup; UI 풀테스트 대체 아님 |
| V410-S08-ST-06 | pending unlink 실패 원본/원장 보존 및 worker·HTTP 미시작 | startup focused·실제 격리 앱 및 승인 영향 회귀 | 미진행: 버전 최종코드 별도 승인 | 진행 대상: 최종코드 기존 승인 predev120, 이번 실행 없음 | 비대상: 내부 startup; UI 풀테스트 대체 아님 |
| V410-S08-ST-07 | ready 충돌 원본 보존 및 worker·HTTP 미시작 | startup focused·실제 격리 앱 및 승인 영향 회귀 | 미진행: 버전 최종코드 별도 승인 | 진행 대상: 최종코드 기존 승인 predev120, 이번 실행 없음 | 비대상: 내부 startup; UI 풀테스트 대체 아님 |
| V410-S08-ST-08 | checksum 계산불가/권한/파일변경·경로 검사불가 시작 거부·정상으로 무시 금지 | startup focused·실제 격리 앱 및 승인 영향 회귀 | 미진행: 버전 최종코드 별도 승인 | 진행 대상: 최종코드 기존 승인 predev120, 이번 실행 없음 | 비대상: 내부 startup; UI 풀테스트 대체 아님 |
| V410-S08-ST-09 | Pending event hold/source-output 손상 적용거부·원본 보존·미시작 | startup focused·실제 격리 앱 및 승인 영향 회귀 | 미진행: 버전 최종코드 별도 승인 | 진행 대상: 최종코드 기존 승인 predev120, 이번 실행 없음 | 비대상: 내부 startup; UI 풀테스트 대체 아님 |
| V410-S08-ST-10 | 기존 Corrupt 자료를 검사 재등록·정상 승격하지 않음 | startup focused·실제 격리 앱 및 승인 영향 회귀 | 미진행: 버전 최종코드 별도 승인 | 진행 대상: 최종코드 기존 승인 predev120, 이번 실행 없음 | 비대상: 내부 startup; UI 풀테스트 대체 아님 |
| V410-S08-ST-11 | 실제 memory/SQLite/fallback lifecycle 및 restart parity | startup focused·실제 격리 앱 및 승인 영향 회귀 | 미진행: 버전 최종코드 별도 승인 | 진행 대상: 최종코드 기존 승인 predev120, 이번 실행 없음 | 비대상: 내부 startup; UI 풀테스트 대체 아님 |
| V410-S08-ST-12 | 경로 해석 실패 Finalized도 전체 snapshot에 포함·시작 거부 | startup focused·실제 격리 앱 및 승인 영향 회귀 | 미진행: 버전 최종코드 별도 승인 | 진행 대상: 최종코드 기존 승인 predev120, 이번 실행 없음 | 비대상: 내부 startup; UI 풀테스트 대체 아님 |
| V410-S08-ST-13 | 실제 S06 HTTP seed SHA 정확성 및 startup 뒤 Range bytes 유지 | startup focused·실제 격리 앱 및 승인 영향 회귀 | 미진행: 버전 최종코드 별도 승인 | 진행 대상: 최종코드 기존 승인 predev120, 이번 실행 없음 | 비대상: 내부 startup; UI 풀테스트 대체 아님 |
| V410-S08-ST-14 | 실제 enabled local source 신규 segment 정상 생성·종료; 동일 설정 복구 실패 시 신규segment/partial/원장추가 없음 | startup active app | 미진행: 최종코드 별도 승인 | 진행 대상: 최종코드 기존 승인 predev120, 이번 미실행 | 비대상: 내부 startup |

## V410 S08 finalize 복구 사전 등록

| 기능 ID | 동작·PASS 기준 | 안정화 | 30분 | 120분 | UI 존재·UI 테스트 |
| --- | --- | --- | --- | --- | --- |
| V410-S08-FR-01 | ready partial을 기존 cleanup이 보존하고 원래ID로 복구 | finalize recovery focused 및 승인회귀 | 비대상: 이번단계 | 비대상: 별도승인분리 | 비대상: 내부복구 |
| V410-S08-FR-02 | publish 전후 final/partial 및 동일inode nlink2 crash 멱등 | finalize recovery focused 및 승인회귀 | 비대상: 이번단계 | 비대상: 별도승인분리 | 비대상: 내부복구 |
| V410-S08-FR-03 | catalog commit 뒤 ticket 잔여 재시작 noappend/identity 보존 | finalize recovery focused 및 승인회귀 | 비대상: 이번단계 | 비대상: 별도승인분리 | 비대상: 내부복구 |
| V410-S08-FR-04 | ticket version/중복키/metadata/nonce/path strict 거부 및 원본보존 | finalize recovery focused 및 승인회귀 | 비대상: 이번단계 | 비대상: 별도승인분리 | 비대상: 내부복구 |
| V410-S08-FR-05 | symlink/hardlink/경로escape/권한I/O 검사불가 보존 | finalize recovery focused 및 승인회귀 | 비대상: 이번단계 | 비대상: 별도승인분리 | 비대상: 내부복구 |
| V410-S08-FR-06 | size/checksum/container 손상 확정 시 원위치 논리 격리, binding 내구진단→Mark 전후 재시작 수렴 및 정상등록 금지 | finalize recovery focused 및 승인회귀 | 비대상: 이번단계 | 비대상: 별도승인분리 | 비대상: 내부복구 |
| V410-S08-FR-07 | tombstone/DeletionPending/Corrupt 우선 및 동일ID 충돌 거부 | finalize recovery focused 및 승인회귀 | 비대상: 이번단계 | 비대상: 별도승인분리 | 비대상: 내부복구 |
| V410-S08-FR-08 | provenance없는 orphan 등록금지 및 ticket없는 기존cleanup 유지 | finalize recovery focused 및 승인회귀 | 비대상: 이번단계 | 비대상: 별도승인분리 | 비대상: 내부복구 |
| V410-S08-FR-09 | continuous 실제writer ready 순서/성공정리/reservation; 단일packet invalid ready전 정리 및 다음 양수구간 재개 | finalize recovery focused 및 승인회귀 | 비대상: 이번단계 | 진행 대상: 버전 최종코드에서 기존 승인 predev120, 녹화 직접관찰 묶음 별도승인 대기 | 비대상: 내부복구 |
| V410-S08-FR-10 | ready 이후 callback실패 보존/반복write차단/Stop무삭제 | finalize recovery focused 및 승인회귀 | 비대상: 이번단계 | 진행 대상: 버전 최종코드에서 기존 승인 predev120, 녹화 직접관찰 묶음 별도승인 대기 | 비대상: 내부복구 |
| V410-S08-FR-11 | 실제 MPEGTS tsdemux Healthy·checksum 변조 Corrupt·지원외 codec 및 일반 demux 오류 Unavailable/원본 보존 | finalize recovery focused 및 승인회귀 | 비대상: 이번단계 | 비대상: 별도승인분리 | 비대상: 내부복구 |
| V410-S08-FR-12 | event source/link/output/epoch/요청범위 strict provenance | finalize recovery focused 및 승인회귀 | 비대상: 이번단계 | 비대상: 별도승인분리 | 비대상: 내부복구 |
| V410-S08-FR-13 | event 새output recovery output/sourcehold 재구성·재시작중복금지 | finalize recovery focused 및 승인회귀 | 비대상: 이번단계 | 비대상: 별도승인분리 | 비대상: 내부복구 |
| V410-S08-FR-14 | event 기존output Open복원hold 추가취득금지·terminalrelease | finalize recovery focused 및 승인회귀 | 비대상: 이번단계 | 비대상: 별도승인분리 | 비대상: 내부복구 |
| V410-S08-FR-15 | Pending 선행기록실패 lease/reservation 정리 및 remux 금지 | finalize recovery focused 및 승인회귀 | 비대상: 이번단계 | 비대상: 별도승인분리 | 비대상: 내부복구 |
| V410-S08-FR-16 | SQLite/fallback 복구parity 및 repeat crash identity/digest불변 | finalize recovery focused 및 승인회귀 | 비대상: 이번단계 | 비대상: 별도승인분리 | 비대상: 내부복구 |


## V410 S08-B2b 실제 media 검사 (실행 전 등록)

| 기능 ID | 동작·PASS 기준 | 안정화 | 30분 | 120분 | UI 존재·UI 테스트 |
| --- | --- | --- | --- | --- | --- |
| V410-S08-B2b-01 | 실제 H264/MP4·VP8/WebM healthy noappend | media inspector focused | 비대상 | 비대상 | 비대상: 명시 내부 검사 |
| V410-S08-B2b-02 | 안전 parent의 leaf ENOENT 확정 missing | media inspector focused | 비대상 | 비대상 | 비대상: 명시 내부 검사 |
| V410-S08-B2b-03 | size mismatch detail→checksum-mismatch | media inspector focused | 비대상 | 비대상 | 비대상: 명시 내부 검사 |
| V410-S08-B2b-04 | 동일size 바이트 SHA256 불일치 | media inspector focused | 비대상 | 비대상 | 비대상: 명시 내부 검사 |
| V410-S08-B2b-05 | size/hash 일치 malformed container 거부 | media inspector focused | 비대상 | 비대상 | 비대상: 명시 내부 검사 |
| V410-S08-B2b-06 | symlink/hardlink/rootescape/nonregular unavailable | media inspector focused | 비대상 | 비대상 | 비대상: 명시 내부 검사 |
| V410-S08-B2b-07 | missing root/parent unavailable | media inspector focused | 비대상 | 비대상 | 비대상: 명시 내부 검사 |
| V410-S08-B2b-08 | 전체시간예산 초과 unavailable noappend; 0/overflow 예산 거부, demux 단일 요청 16MiB 상한 | media inspector focused | 비대상 | 비대상 | 비대상: 명시 내부 검사 |
| V410-S08-B2b-09 | 파일 변경 감지 unavailable | media inspector focused | 비대상 | 비대상 | 비대상: 명시 내부 검사 |
| V410-S08-B2b-10 | held/pending/deleted 상태 적용 거부 | media inspector focused | 비대상 | 비대상 | 비대상: 명시 내부 검사 |
| V410-S08-B2b-11 | 확정손상 적용·replay Corrupt | media inspector focused | 비대상 | 비대상 | 비대상: 명시 내부 검사 |
| V410-S08-B2b-12 | 지원외container/codec/잘못된checksum metadata unavailable; H264/MP4·H264/MPEGTS·VP8/WebM 지원, request-limit은 손상 아님 | media inspector focused 및 FR11 | 비대상 | 비대상 | 비대상: 명시 내부 검사 |
| V410-S08-B2b-13 | 예상영상stream/buffer/EOS 확인·metadata mismatch | media inspector focused | 비대상 | 비대상 | 비대상: 명시 내부 검사 |
| V410-S08-B2b-14 | GStreamer 없는 빌드 unavailable | media inspector focused | 비대상 | 비대상 | 비대상: 명시 내부 검사 |
| V410-S08-B2b-15 | qtdemux registry 제거 시 Unavailable/noappend, 복원 확인 | media inspector --boundaries | 비대상 | 비대상 | 비대상: 명시 내부 검사 |
| V410-S08-B2b-16 | chmod000 실제 EACCES 및 Unavailable/noappend, 권한 복원 | media inspector --boundaries | 비대상 | 비대상 | 비대상: 명시 내부 검사 |
| V410-S08-B2b-17 | 실제 audio-only MP4는 expected video 부재로 Corrupt | media inspector --boundaries | 비대상 | 비대상 | 비대상: 명시 내부 검사 |
| V410-S08-B2b-18 | 실제 FD/appsrc callback에서 16MiB+1 request-limit/noIO/EOS, expired/EOS, seek 범위/offset 검사 | media inspector --limits 직접 callback 단위 경계 | 비대상 | 비대상 | 비대상: 명시 내부 검사 |

## V410 S08-B2a 손상 상태 적용 (실행 전 등록)

| 기능 ID | 동작·PASS 기준 | 안정화 | 30분 | 120분 | UI 존재·UI 테스트 |
| --- | --- | --- | --- | --- | --- |
| V410-S08-B2a-01 | 기존 corruption replay finalized→Corrupt | corruption focused | 비대상 | 비대상 | 비대상: 내부 상태 적용 |
| V410-S08-B2a-02 | Mark 정상 전이·반복 noappend | corruption focused | 비대상 | 비대상 | 비대상: 내부 상태 적용 |
| V410-S08-B2a-03 | 없는ID/잘못된reason/pending/deleted 거부 noappend | corruption focused | 비대상 | 비대상 | 비대상: 내부 상태 적용 |
| V410-S08-B2a-04 | held segment 변경 거부 | corruption focused | 비대상 | 비대상 | 비대상: 내부 상태 적용 |
| V410-S08-B2a-05 | Pending link source/output 변경 거부 | corruption focused | 비대상 | 비대상 | 비대상: 내부 상태 적용 |
| V410-S08-B2a-06 | 실제 SQLite lifecycle/원본 codecs_json 구분 | corruption focused | 비대상 | 비대상 | 비대상: 내부 상태 적용 |
| V410-S08-B2a-07 | SQLite-on/off 및 재시작 parity | corruption focused | 비대상 | 비대상 | 비대상: 내부 상태 적용 |
| V410-S08-B2a-08 | 동일metadata finalized 재등장 no-op | corruption focused | 비대상 | 비대상 | 비대상: 내부 상태 적용 |
| V410-S08-B2a-09 | 다른metadata/path/envelopeentity finalized 거부 | corruption focused | 비대상 | 비대상 | 비대상: 내부 상태 적용 |
| V410-S08-B2a-10 | pending/deleted corruption replay 우선순위 | corruption focused | 비대상 | 비대상 | 비대상: 내부 상태 적용 |
| V410-S08-B2a-11 | unknown/malformed mutation 진단·재생성 금지 | corruption focused | 비대상 | 비대상 | 비대상: 내부 상태 적용 |
| V410-S08-B2a-12 | Resolve 후 segment-base/UTC1500/PTS500000000 literal 확인, 초기 locator 유지·Corrupt revoke·media location 차단 | corruption focused | 비대상 | 비대상 | 비대상: 내부 상태 적용 |
| V410-S08-B2a-13 | SQLite 투영 실패 fallback 상태 보존 | corruption focused | 비대상 | 비대상 | 비대상: 내부 상태 적용 |
| V410-S08-B2a-14 | 동일 corruption envelope 생성전거부/생성후수용 SQL순서 | corruption focused | 비대상 | 비대상 | 비대상: 내부 상태 적용 |

## V410 S08-B1 journal tail 복구 (실행 전 등록)

| 기능 ID | 동작·PASS 기준 | 안정화 | 30분 | 120분 | UI 존재·UI 테스트 |
| --- | --- | --- | --- | --- | --- |
| V410-S08-B1-01 | 빈 원장 Append/Replay | recovery focused | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| V410-S08-B1-02 | newline 원장 prefix 바이트 보존 | recovery focused | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| V410-S08-B1-03 | truncated tail 격리 뒤 valid2 | recovery focused | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| V410-S08-B1-04 | 완결 JSON noLF 미승격 | recovery focused | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| V410-S08-B1-05 | 연속 재시작/추가 append 멱등 | recovery focused | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| V410-S08-B1-06 | 격리 payload byte exact·재사용 | recovery focused | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| V410-S08-B1-07 | 격리 실패 원본 불변 | recovery focused | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| V410-S08-B1-08 | 중간 corrupt line 보존·정상행 replay | recovery focused | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| V410-S08-B1-09 | journal symlink 거부 | recovery focused | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| V410-S08-B1-10 | journal hardlink 거부 | recovery focused | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| V410-S08-B1-11 | Open 후 inode 교체 거부 | recovery focused | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| V410-S08-B1-12 | 내부 parent symlink 거부 | recovery focused | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| V410-S08-B1-13 | macOS 시스템 alias 정상 허용 | recovery focused | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| V410-S08-B1-14 | quarantine symlink/hardlink 거부 | recovery focused | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| V410-S08-B1-15 | 16MiB 초과 꼬리 원본보존 거부 | recovery focused | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| V410-S08-B1-16 | Replay I/O오류 catalog Open 거부 | recovery focused, S03 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| V410-S08-B1-17 | 삭제 journal/parent 재Open 거부·재생성 금지 | recovery focused | 비대상 | 비대상 | 비대상: UI 없어야 정상 |

## V410 S08-A V1 호환 gate (실행 전 등록)

| 기능 ID | 동작·PASS 기준 | 안정화 | 30분 | 120분 | UI 존재·UI 테스트 |
| --- | --- | --- | --- | --- | --- |
| V410-S08-A-01 | digest manifest 누락 거부 | Node gate test | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| V410-S08-A-02 | golden 바이트 변조 거부 | Node gate test | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| V410-S08-A-03 | 4개 고정 digest와 정상 reader 통과 | 새 gate, 계약 smoke | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| V410-S08-A-04 | fixture 누락 거부 | Node gate test | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| V410-S08-A-05 | manifest 이상·digest 교체·추가/누락 entry 거부 | Node gate test | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| V410-S08-A-06 | 실제 C++ reader의 V1 필수 의미 보존 | 계약 smoke | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| V410-S08-A-07 | 실제 reader unknown optional additive 수용·기존 의미 보존 | 계약 smoke | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| V410-S08-A-08 | 실제 reader schema 변경·필수 ID 누락 거부 | 계약 smoke | 비대상 | 비대상 | 비대상: UI 없어야 정상 |

## V410 S07 관측 개별 항목 (실행 전 등록)

| 기능 ID | 동작·PASS 기준 | 안정화 | 30분 | 120분 | UI 존재·UI 테스트 |
| --- | --- | --- | --- | --- | --- |
| V410-S07-01 | V1 계약 유지, V2 null/located strict roundtrip | S07 focused | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| V410-S07-02 | V2 JSONL replay와 SQLite projection 동일 | S07 focused, S03 | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| V410-S07-03 | 60초 30fps 단일 track 1초 sampling bounded | S07 focused | 진행 대상·별도 승인 전 미실행 | 진행 대상·별도 승인 전 미실행 | 비대상: UI 없어야 정상 |
| V410-S07-04 | start/event/end 동일 PTS reasons 병합·한 번 summary | S07 focused | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| V410-S07-05 | stop/rollback/multi-tap namespace 분리 | S07 focused | 진행 대상·별도 승인 전 미실행 | 진행 대상·별도 승인 전 미실행 | 비대상: UI 없어야 정상 |
| V410-S07-06 | writing pending finalize 실제 UTC/PTS/keyframe 해석 | S07 focused | 진행 대상·별도 승인 전 미실행 | 진행 대상·별도 승인 전 미실행 | 비대상: UI 없어야 정상 |
| V410-S07-07 | gap/deleted/corrupt/ambiguous epoch null 실패안전 | S07 focused | 비대상 | 비대상 | 비대상: UI 없어야 정상 |
| V410-S07-08 | queue/state/pending 상한, interval 우선 drop, critical rejection 상태 | S07 focused | 진행 대상·별도 승인 전 미실행 | 진행 대상·별도 승인 전 미실행 | 비대상: 신규 화면 없음 |
| V410-S07-09 | observer 실패·지연 비전파, tap lock 밖 enqueue | S07 focused, build | 진행 대상·별도 승인 전 미실행 | 진행 대상·별도 승인 전 미실행 | 비대상: UI 없어야 정상 |
| V410-S07-10 | 실제 event ID와 production observer wiring·recording off 독립 | S07 focused, S05 | 비대상 | 비대상 | 비대상: 기존 serializer 불변 |


이 문서는 현재 release 목표 `v4.1.0` 기준의 기능별 테스트 분류 기준표입니다.
독자는 개발/테스트 에이전트이며, lifecycle은 active release target 동안 유지되는 test inventory입니다.
AGENTS.md가 개발/테스트/보고/커밋 권한의 최상위 규칙이고, 이 문서는 기능 ID와 테스트 영역만 관리합니다.

중요한 경계:

- 이 문서는 **테스트 실행 결과 문서가 아닙니다**.
- 이 문서는 **현재 테스트가 존재한다는 증거가 아닙니다**.
- inventory 단독으로 UI PASS 판정 불가이며 결과 문서 없이 inventory만으로 UI PASS 판정 불가입니다.
- coverage 대조 전에는 `테스트 있음`, `UI 있음`, `완료`라고 보고하지 않습니다.
- raw JSON/API-only 확인은 UI 풀테스트 evidence가 아닙니다.
- 테스트 영역은 `안정화`, `30분`, `120분`, `UI` 네 가지만 사용합니다.
- 실기기/외부 endpoint/credential 조건은 별도 영역이 아니라 안정화 조건 또는 UI 제외 기록에 편입합니다.

## Test Area Roles

| 영역 | 역할 | PASS evidence | 대체 불가 |
| --- | --- | --- | --- |
| 안정화 | build, static, API/schema, auth route, media path, verifier 중심 선수 테스트 | 실제 명령, exit code 0, summary/report fail 0, 실패/skip 사유 | 30분/120분 장시간 PASS, UI 직접 조작 evidence |
| 30분 | 장기간 테스트 지시 시 기본 soak | v3.9.0 release-grade `verify-v390-server-longrun --duration-minutes 30` summary/report와 내부 delegated predev summary. historical `verify-predev --soak-minutes 30` evidence는 legacy/compatibility로만 보존 | 안정화, 120분, UI 풀테스트 |
| 120분 | 메모리 릭, 장시간 누수, runtime drift 감시 | 사용자 승인 후 `verify-v390-server-longrun --duration-minutes 120` 또는 VA runtime 120분 longrun report. historical `verify-predev --soak-minutes 120` evidence는 legacy/compatibility로만 보존 | 안정화, 30분, UI 풀테스트 |
| UI | 인앱 브라우저 직접 클릭/타이핑/선택/반응형/시각 품질/role guard 확인 | route, 계정/권한, viewport/theme, 직접 조작, screenshot/artifact, 재검수 결과 | 스크립트 smoke, raw JSON/API-only 확인 |

## Summary

아래 요약은 역사적 canonical 986개 ID의 고정 집합이다. S05와 GStreamer 환경 신규 등록은 별도 고정 ID로
관리하며 이 집합이나 historical UI 424개를 재번호화하지 않는다. S06 신규 34개도 별도 등록한다.

| 항목 | 수 |
| --- | ---: |
| 전체 기능 항목 | 986 |
| UI 직접 필요 | 400 |
| UI 간접 필요 | 36 |
| UI 비대상 | 550 |
| 테스트 필요 | 986 |
| 안정화 대상 | 976 |
| UI 풀테스트 대상 | 424 |
| 30분 soak 대상 | 50 |
| 120분 대상 | 7 |

| 현재 등록 범위 | 수 |
| --- | ---: |
| 역사적 canonical ID | 986 |
| S05 개별 action ID | 27 |
| GStreamer 환경 개별 action ID | 13 |
| 녹화 ID 매핑 개별 action ID | 13 |
| S06 개별 action ID | 34 |
| V410 S07 관측 신규 개별 ID | 10 |
| V410 S08-A V1 호환 신규 개별 ID | 8 |
| V410 S08-B1 journal 신규 개별 ID | 17 |
| V410 S08-B2a 상태 적용 신규 ID | 14 |
| V410 S08-B2b media 검사 신규 ID | 18 |
| V410 S08 finalize 복구 신규 ID | 16 |
| V410 S08 startup 복구 신규 ID | 14 |
| V410 S09 runtime 통합 신규 ID | 9 |
| V410 S09 실제 앱 통합 신규 ID | 13 |
| V410 S09 fallback binding 신규 ID | 10 |
| 현재 등록 총계 | 1202 |

이는 등록 합계이지 전 제품 발견·실행 완료 선언이 아니다. S01~S04의 신규 등록 정합성은
이번 S05 보정에서 전수 감사하지 않았다.

S05 등록기의 변형 단위 시험은 가변적인 현재 총계나 다른 등록군 이름에 결합하지 않는다.
실제 문서 검증은 유지하고, 합계·중복·잘못된 수의 시험 입력만 독립 literal fixture로
구성한다. 이는 기존 검증기 시험의 보완으로 새 제품 ID를 추가하지 않으며,
`release-test-records.md`의 INV-BASE/EXTEND/MULTI/MULTI-WRONG/NEGATIVE에 실행 전 등록했다.
안정화 영역 대상이고 30분·120분·UI는 이 단위 시험 자체에는 비대상이다.
제품 ID 매핑 보완의 기존 장시간 테스트 판정은 별개로 유지한다.

## V410-S06 개별 동작 등록

2026-09-06 S06 구현·테스트 실행 전에 등록한 34개 고정 ID다. 아래는 기능 정의이며
구현·실행 완료 evidence가 아니다. 실제 명령·개별 결과·RED 이력·미실행은
`release-test-records.md`의 S06 절에 기록한다. UI contract 자동 검사는 브라우저
재생·시각 검수·UI 풀테스트를 대체하지 않는다. 기존 canonical/S05/ENV/IDMAP ID는 유지한다.

검증 도구 자체의 정리 실패 보존·강제 종료 거부·포트 부재 판정은 내부 보조 항목
`V410-S06-H01~H03`으로 release-test-records에 실행 전에 등록한다. 안정화 내부 harness
회귀이며 제품 action 총계에는 추가하지 않는다. 30분·120분·UI는 이 도구 동작 자체에는
비대상이고, 제품 I01~I34의 기존 네 영역 판정을 변경하거나 제품 PASS를 대체하지 않는다.
H03의 반환 객체 전달·미확인 성공 거부는 같은 내부 항목의 H03-R01/R02로 세분화한다.
실행 전 정의와 실제 결과는 release-test-records에 보존하며 제품 action 총계는 유지한다.

| 기능 ID | 개별 동작 | 구현 경계 | PASS 출력/판정 | 안정화 테스트 | 30분 테스트 | 120분 테스트 | UI 테스트·UI 존재 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V410-S06-I01 | 녹화 상태 조회 | status API (S06 구현됨; 실행 결과는 기록 참조) | 전역 opt-in·catalog degraded·채널 상태를 실제 서비스 값으로 반환 | 대상: S06 focused/관련 회귀 | 대상: 버전 종료 시 별도 승인 | 조건부: 관련 누수·drift 발견 시 별도 승인 | 비대상: UI 없어야 정상 |
| V410-S06-I02 | 상태 조회 범위 제한 | status API 권한 투영 (S06 구현됨; 실행 결과는 기록 참조) | 허용 채널만 반환하고 내부 경로·source URL·진단 원문을 숨김 | 대상: S06 focused/관련 회귀 | 대상: 버전 종료 시 별도 승인 | 조건부: 관련 누수·drift 발견 시 별도 승인 | 비대상: UI 없어야 정상 |
| V410-S06-I03 | 채널·UTC 반개구간 조회 | timeline read service (S06 구현됨; 실행 결과는 기록 참조) | 지정 채널의 [start,end) 교집합만 반환하고 인접 경계와 다른 채널을 제외 | 대상: S06 focused/관련 회귀 | 대상: 버전 종료 시 별도 승인 | 조건부: 관련 누수·drift 발견 시 별도 승인 | 비대상: UI 없어야 정상 |
| V410-S06-I04 | 잘못된 조회 인자 거부 | timeline API validation (S06 구현됨; 실행 결과는 기록 참조) | 누락·음수·overflow·역전 시간·잘못된 offset/limit을 거부 | 대상: S06 focused/관련 회귀 | 대상: 버전 종료 시 별도 승인 | 조건부: 관련 누수·drift 발견 시 별도 승인 | 비대상: UI 없어야 정상 |
| V410-S06-I05 | 안정 정렬과 페이지 | timeline read service (S06 구현됨; 실행 결과는 기록 참조) | startTimeMs DESC, displayPriority DESC, segmentId ASC 정렬 후 offset/limit 적용 | 대상: S06 focused/관련 회귀 | 대상: 버전 종료 시 별도 승인 | 조건부: 관련 누수·drift 발견 시 별도 승인 | 비대상: UI 없어야 정상 |
| V410-S06-I06 | 이벤트 우선 표시 계약 | timeline read service (S06 구현됨; 실행 결과는 기록 참조) | 같은 시간의 event 200과 continuous 100을 반환하고 event 우선 순서를 유지 | 대상: S06 focused/관련 회귀 | 대상: 버전 종료 시 별도 승인 | 조건부: 관련 누수·drift 발견 시 별도 승인 | 비대상: UI 없어야 정상 |
| V410-S06-I07 | 원본과 이벤트 교차 참조 | timeline read service (S06 구현됨; 실행 결과는 기록 참조) | 겹치는 정확한 event ID만 supersededByEventIds에 중복 없이 반환 | 대상: S06 focused/관련 회귀 | 대상: 버전 종료 시 별도 승인 | 조건부: 관련 누수·drift 발견 시 별도 승인 | 비대상: UI 없어야 정상 |
| V410-S06-I08 | 미완성·삭제 lifecycle 거부 | timeline/media read service (S06 구현됨; 실행 결과는 기록 참조) | writing·corrupt·deletion_pending·deleted는 재생 허용하지 않음 | 대상: S06 focused/관련 회귀 | 대상: 버전 종료 시 별도 승인 | 조건부: 관련 누수·drift 발견 시 별도 승인 | 비대상: UI 없어야 정상 |
| V410-S06-I09 | 누락·비정상 미디어 거부 | media resolver (S06 구현됨; 실행 결과는 기록 참조) | 파일 없음·비일반 파일·크기 불일치를 정상 playable로 반환하지 않음 | 대상: S06 focused/관련 회귀 | 대상: 버전 종료 시 별도 승인 | 조건부: 관련 누수·drift 발견 시 별도 승인 | 비대상: UI 없어야 정상 |
| V410-S06-I10 | 파생 이벤트 범위·완전성 | event read model (S06 구현됨; 실행 결과는 기록 참조) | 요청 범위와 실제 파생 범위를 혼동하지 않고 partial/complete 상태 보존 | 대상: S06 focused/관련 회귀 | 대상: 버전 종료 시 별도 승인 | 조건부: 관련 누수·drift 발견 시 별도 승인 | 비대상: UI 없어야 정상 |
| V410-S06-I11 | fallback과 파생 우선순위 | event read model/media resolver (S06 구현됨; 실행 결과는 기록 참조) | 완료 derived 우선, fallback은 내구 참조와 허용 root 확인 후 사용하며 불가 사유 표출 | 대상: S06 focused/관련 회귀 | 대상: 버전 종료 시 별도 승인 | 조건부: 관련 누수·drift 발견 시 별도 승인 | 비대상: UI 없어야 정상 |
| V410-S06-I12 | 관리자 녹화 접근 | 녹화 API role/scope guard (S06 구현됨; 실행 결과는 기록 참조) | admin의 허용 범위 status/timeline/media 요청을 허용 | 대상: S06 focused/관련 회귀 | 대상: 버전 종료 시 별도 승인 | 조건부: 관련 누수·drift 발견 시 별도 승인 | 비대상: UI 없어야 정상 |
| V410-S06-I13 | 운영자 녹화 접근 | 녹화 API role/scope guard (S06 구현됨; 실행 결과는 기록 참조) | operator의 허용 범위 status/timeline/media 요청을 허용 | 대상: S06 focused/관련 회귀 | 대상: 버전 종료 시 별도 승인 | 조건부: 관련 누수·drift 발견 시 별도 승인 | 비대상: UI 없어야 정상 |
| V410-S06-I14 | viewer 녹화 접근 거부 | 녹화 API role guard (S06 구현됨; 실행 결과는 기록 참조) | viewer의 세 endpoint 접근을 거부 | 대상: S06 focused/관련 회귀 | 대상: 버전 종료 시 별도 승인 | 조건부: 관련 누수·drift 발견 시 별도 승인 | 비대상: UI 없어야 정상 |
| V410-S06-I15 | 미인증 녹화 접근 거부 | 녹화 API auth guard (S06 구현됨; 실행 결과는 기록 참조) | 미인증 요청에 제품 auth 정책을 적용하고 미디어 byte를 전송하지 않음 | 대상: S06 focused/관련 회귀 | 대상: 버전 종료 시 별도 승인 | 조건부: 관련 누수·drift 발견 시 별도 승인 | 비대상: UI 없어야 정상 |
| V410-S06-I16 | 채널 scope 없는 접근 거부 | 녹화 API scope guard (S06 구현됨; 실행 결과는 기록 참조) | 조회 및 opaque ID 직접 접근으로 채널 scope를 우회할 수 없음 | 대상: S06 focused/관련 회귀 | 대상: 버전 종료 시 별도 승인 | 조건부: 관련 누수·drift 발견 시 별도 승인 | 비대상: UI 없어야 정상 |
| V410-S06-I17 | opaque ID와 path 입력 거부 | media endpoint (S06 구현됨; 실행 결과는 기록 참조) | 미등록 ID·절대경로·..·인코딩 traversal을 거부하고 파일 경로를 JSON에 넣지 않음 | 대상: S06 focused/관련 회귀 | 대상: 버전 종료 시 별도 승인 | 조건부: 관련 누수·drift 발견 시 별도 승인 | 비대상: UI 없어야 정상 |
| V410-S06-I18 | symlink 경로 탈출 거부 | media resolver (S06 구현됨; 실행 결과는 기록 참조) | root·중간 경로·leaf symlink 탈출을 거부 | 대상: S06 focused/관련 회귀 | 대상: 버전 종료 시 별도 승인 | 조건부: 관련 누수·drift 발견 시 별도 승인 | 비대상: UI 없어야 정상 |
| V410-S06-I19 | 검사 이후 파일 교체 방어 | fd-bound media read (S06 구현됨; 실행 결과는 기록 참조) | 열린 일반 파일 fd에 전송을 결박하고 경로 교체가 다른 파일 전송으로 이어지지 않음 | 대상: S06 focused/관련 회귀 | 대상: 버전 종료 시 별도 승인 | 대상: 전송·lease lifecycle, 별도 승인 | 비대상: UI 없어야 정상 |
| V410-S06-I20 | 닫힌 byte Range | HTTP direct sender (S06 구현됨; 실행 결과는 기록 참조) | bytes=시작-끝 요청에 206·Content-Range·Accept-Ranges·정확한 byte 반환 | 대상: S06 focused/관련 회귀 | 대상: 버전 종료 시 별도 승인 | 조건부: 관련 누수·drift 발견 시 별도 승인 | 비대상: UI 없어야 정상 |
| V410-S06-I21 | 열린·suffix byte Range | HTTP direct sender (S06 구현됨; 실행 결과는 기록 참조) | bytes=시작- 및 bytes=-길이에 파일 크기 경계를 적용해 정확한 byte 반환 | 대상: S06 focused/관련 회귀 | 대상: 버전 종료 시 별도 승인 | 조건부: 관련 누수·drift 발견 시 별도 승인 | 비대상: UI 없어야 정상 |
| V410-S06-I22 | 비정상 byte Range | HTTP direct sender (S06 구현됨; 실행 결과는 기록 참조) | 잘못된 범위·overflow·파일 끝 초과·지원하지 않는 다중 범위를 일관되게 거부 | 대상: S06 focused/관련 회귀 | 대상: 버전 종료 시 별도 승인 | 조건부: 관련 누수·drift 발견 시 별도 승인 | 비대상: UI 없어야 정상 |
| V410-S06-I23 | HEAD 미디어 응답 | HTTP direct sender (S06 구현됨; 실행 결과는 기록 참조) | GET과 맞는 길이·형식·Range header를 반환하되 body는 전송하지 않음 | 대상: S06 focused/관련 회귀 | 대상: 버전 종료 시 별도 승인 | 조건부: 관련 누수·drift 발견 시 별도 승인 | 비대상: UI 없어야 정상 |
| V410-S06-I24 | 대용량 bounded 전송 | HTTP direct sender (S06 구현됨; 실행 결과는 기록 참조) | 전체 파일을 HttpResponse body에 넣지 않고 최대 256KiB 읽기로 전송 | 대상: S06 focused/관련 회귀 | 대상: 버전 종료 시 별도 승인 | 대상: 전송·lease lifecycle, 별도 승인 | 비대상: UI 없어야 정상 |
| V410-S06-I25 | 재생 lease와 순환 삭제 | catalog lease/retention (S06 구현됨; 실행 결과는 기록 참조) | 삭제 요청과 원자적으로 lease를 취득하고 전송 중 삭제를 차단, 해제 후 허용 | 대상: S06 focused/관련 회귀 | 대상: 버전 종료 시 별도 승인 | 대상: 전송·lease lifecycle, 별도 승인 | 비대상: UI 없어야 정상 |
| V410-S06-I26 | 전송 오류·연결 종료 정리 | HTTP sender/lease lifecycle (S06 구현됨; 실행 결과는 기록 참조) | 실패·disconnect·정상 종료에서 fd와 lease가 누수되지 않음 | 대상: S06 focused/관련 회귀 | 대상: 버전 종료 시 별도 승인 | 대상: 전송·lease lifecycle, 별도 승인 | 비대상: UI 없어야 정상 |
| V410-S06-I27 | 채널·시간 필터 조작 | /ops/events 녹화 필터 (S06 구현됨; 실행 결과는 기록 참조) | 선택·입력·조회 후 요청 범위에 맞는 목록과 빈 결과 상태 반영 | 대상: S06 focused/관련 회귀 | 대상: 버전 종료 시 별도 승인 | 조건부: 관련 누수·drift 발견 시 별도 승인 | 대상: /ops/events 실제 브라우저, 별도 승인 |
| V410-S06-I28 | 이벤트 기본 선택 | /ops/events timeline (S06 구현됨; 실행 결과는 기록 참조) | event badge·종류·시간을 표시하고 겹치는 이벤트를 기본 재생 대상으로 선택 | 대상: S06 focused/관련 회귀 | 대상: 버전 종료 시 별도 승인 | 조건부: 관련 누수·drift 발견 시 별도 승인 | 대상: /ops/events 실제 브라우저, 별도 승인 |
| V410-S06-I29 | 상시녹화 원본 보기 | /ops/events 원본 보기 (S06 구현됨; 실행 결과는 기록 참조) | continuous 원본 펼침·선택이 해당 미디어로 연결되고 event 원본 관계 보존 | 대상: S06 focused/관련 회귀 | 대상: 버전 종료 시 별도 승인 | 조건부: 관련 누수·drift 발견 시 별도 승인 | 대상: /ops/events 실제 브라우저, 별도 승인 |
| V410-S06-I30 | 녹화 영상 재생 컨트롤 | /ops/events video (S06 구현됨; 실행 결과는 기록 참조) | controls/preload=metadata, 선택 영상·Range 재생 반영; 실제 codec/container 재생은 브라우저 확인 필요 | 대상: S06 focused/관련 회귀 | 대상: 버전 종료 시 별도 승인 | 조건부: 관련 누수·drift 발견 시 별도 승인 | 대상: /ops/events 실제 브라우저, 별도 승인 |
| V410-S06-I31 | 비재생·불완전 상태 UI | /ops/events status (S06 구현됨; 실행 결과는 기록 참조) | partial은 일부 구간·재생 가능 여부 표시(정확한 missingRanges 표출 요구 없음); 실제 삭제 참조 event·손상 fixture 각각 공통 불가 안내와 재생 차단; 미완결 event·공백·오류 확인. Writing 재생 금지는 내부 V410-S06-I08 및 verify-v410-recording-timeline --read-model로 별도 검증하며 Pending UI로 대체하지 않음 | 대상: S06 focused/관련 회귀 | 대상: 버전 종료 시 별도 승인 | 조건부: 관련 누수·drift 발견 시 별도 승인 | 대상: /ops/events 실제 브라우저, 별도 승인 |
| V410-S06-I32 | 용량·녹화 상태 UI | /ops/events status card (S06 구현됨; 실행 결과는 기록 참조) | continuous/event quota와 storage-blocked 상태를 실제 조회 값으로 표시 | 대상: S06 focused/관련 회귀 | 대상: 버전 종료 시 별도 승인 | 조건부: 관련 누수·drift 발견 시 별도 승인 | 대상: /ops/events 실제 브라우저, 별도 승인 |
| V410-S06-I33 | S06 화면 범위 유지 | /ops/events navigation (S06 구현됨; 실행 결과는 기록 참조) | 새 primary nav·자연어/vector 검색 입력을 추가하지 않고 기존 테마·배치 유지 | 대상: S06 focused/관련 회귀 | 대상: 버전 종료 시 별도 승인 | 조건부: 관련 누수·drift 발견 시 별도 승인 | 대상: /ops/events 실제 브라우저, 별도 승인 |
| V410-S06-I34 | 화면 권한·정보 비노출 | /ops/events role/redaction (S06 구현됨; 실행 결과는 기록 참조) | viewer 접근 제한, 내부 경로·source URL·raw debug 미노출, responsive/theme 상태 확인 | 대상: S06 focused/관련 회귀 | 대상: 버전 종료 시 별도 승인 | 조건부: 관련 누수·drift 발견 시 별도 승인 | 대상: /ops/events 실제 브라우저, 별도 승인 |

## V410-IDMAP 개별 동작 등록

실제 숫자 source ID와 runtime stream key 연결 보완이다. 기존 canonical 986개 및 S05
27개와 별도 등록하며 기존 고정 verifier를 완화하지 않는다. 구현·회귀와 실제 서비스
foreground GREEN은 2026-09-05 evidence로 확인했다. 30분·120분·UI 및 다른 실행 방식은
이 안정화 결과로 대체하지 않는다.

| ID | 동작 | 구현 경계 | 테스트 | 안정화 테스트 | 30분 테스트 | 120분 테스트 | UI 테스트 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| V410-IDMAP-I01 | 신규 숫자 link 접수 | `CatalogEventRecordingBridge::TryResolve` | `recording_identity_smoke.cpp` I01, `verify_recording_identity.sh` | 대상: focused | 대상: 별도 승인 연속 녹화 | 조건부: 별도 승인 누수·복구 | 비대상: UI 없어야 정상 |
| V410-IDMAP-I02 | 원본 EventRecord·epoch 유지 | `CatalogEventRecordingBridge::TryResolve` | `recording_identity_smoke.cpp` I02, `verify_recording_identity.sh` | 대상: focused | 대상: 별도 승인 연속 녹화 | 조건부: 별도 승인 누수·복구 | 비대상: UI 없어야 정상 |
| V410-IDMAP-I03 | 미등록 매핑 거부 | `CatalogEventRecordingBridge::TryResolve` | `recording_identity_smoke.cpp` I03, `verify_recording_identity.sh` | 대상: focused | 대상: 별도 승인 연속 녹화 | 조건부: 별도 승인 누수·복구 | 비대상: UI 없어야 정상 |
| V410-IDMAP-I04 | stream key 우선순위 | `CatalogEventRecordingBridge::TryResolve` | `recording_identity_smoke.cpp` I04, `verify_recording_identity.sh` | 대상: focused | 대상: 별도 승인 연속 녹화 | 조건부: 별도 승인 누수·복구 | 비대상: UI 없어야 정상 |
| V410-IDMAP-I05 | 정지 후 durable retry | `CatalogEventRecordingBridge::TryResolve` | `recording_identity_smoke.cpp` I05, `verify_recording_identity.sh` | 대상: focused | 대상: 별도 승인 연속 녹화 | 조건부: 별도 승인 누수·복구 | 비대상: UI 없어야 정상 |
| V410-IDMAP-I06 | 재시작 durable 복구 | `CatalogEventRecordingBridge::TryResolve` | `recording_identity_smoke.cpp` I06, `verify_recording_identity.sh` | 대상: focused | 대상: 별도 승인 연속 녹화 | 조건부: 별도 승인 누수·복구 | 비대상: UI 없어야 정상 |
| V410-IDMAP-I07 | resolver 없는 fixture 호환 | `CatalogEventRecordingBridge::TryResolve` | `recording_identity_smoke.cpp` I07, `verify_recording_identity.sh` | 대상: focused | 대상: 별도 승인 연속 녹화 | 조건부: 별도 승인 누수·복구 | 비대상: UI 없어야 정상 |
| V410-IDMAP-I08 | actual stream key 게시 | `RecordingSessionService::ResolveRecordingChannel` | `recording_identity_smoke.cpp` I08, `verify_recording_identity.sh` | 대상: focused | 대상: 별도 승인 연속 녹화 | 조건부: 별도 승인 누수·복구 | 비대상: UI 없어야 정상 |
| V410-IDMAP-I09 | 복수 채널 모호성 거부 | `RecordingSessionService::ResolveRecordingChannel` | `recording_identity_smoke.cpp` I09, `verify_recording_identity.sh` | 대상: focused | 대상: 별도 승인 연속 녹화 | 조건부: 별도 승인 누수·복구 | 비대상: UI 없어야 정상 |
| V410-IDMAP-I10 | StartAux 완료 전 비공개 | `RecordingSessionService::StartChannel` | `recording_identity_smoke.cpp` I10, `verify_recording_identity.sh` | 대상: focused | 대상: 별도 승인 연속 녹화 | 조건부: 별도 승인 누수·복구 | 비대상: UI 없어야 정상 |
| V410-IDMAP-I11 | 시작 실패 매핑 제거 | `RecordingSessionService::ResolveRecordingChannel` | `recording_identity_smoke.cpp` I11, `verify_recording_identity.sh` | 대상: focused | 대상: 별도 승인 연속 녹화 | 조건부: 별도 승인 누수·복구 | 비대상: UI 없어야 정상 |
| V410-IDMAP-I12 | 정지 후 조회 거부 | `RecordingSessionService::ResolveRecordingChannel` | `recording_identity_smoke.cpp` I12, `verify_recording_identity.sh` | 대상: focused | 대상: 별도 승인 연속 녹화 | 조건부: 별도 승인 누수·복구 | 비대상: UI 없어야 정상 |
| V410-IDMAP-I13 | 녹화 I/O 중 조회 비차단 | `RecordingSessionService::ResolveRecordingChannel` | `recording_identity_smoke.cpp` I13, `verify_recording_identity.sh` | 대상: writer latch | 대상: 별도 승인 연속 녹화 | 조건부: 별도 승인 누수·복구 | 비대상: UI 없어야 정상 |

## V410-S05 개별 동작 등록

아래 27개는 S05의 정식 고정 ID다. S08에서는 기존 ID를 보존해 종합 gate에 연결하며
등록 자체를 S08로 미루지 않는다. 신규 UI는 없으며 S06 UI 구현은 이번 범위가 아니다.
정확한 check ID·기대 메시지·시험 함수 연결은
`test/fixtures/recording/v1/s05-action-inventory.json`에서 대조한다.
정적 등록 검사는 실행 PASS가 아니다. `verify-v410-event-recording`이 실제 C++ assertion과
application-only check 및 실제 저장 큐 네 프로세스 결과를 모두 수집한 뒤 각 ID의 PASS를
판정한다. I02의 JSONL 비활성·퇴출·journal 재구축·실제 파생은 20개 runtime check이며,
두 source mutation의 실제 assertion 실패도 필수 대조한다. 반복 lease 검사는
같은 check를 여러 원본에 실행할 수 있으며 ID 정의 중복은 허용하지 않는다.

| 기능 ID | 개별 동작 | 구현 파일·함수 | 검증 함수·check ID | PASS 출력/판정 | 안정화 테스트 | 30분 테스트 | 120분 테스트 | UI 테스트·UI 존재 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| V410-S05-I01 | 선택 시간축 DTO 왕복 | `src/ingress/event_storage_application_service.cpp` · `DispatchEventRecordsForApplication` | `compiled fake canonical matrix preserves all fields failure/null outputs and lifecycle order` · V410-S05-I01-C01, V410-S05-I01-C02, V410-S05-I01-C03 | 선택 시간축·anchor·epoch 및 실패 출력 전체 매핑 | 대상 | 대상: 별도 승인 후 녹화 연속 운용 | 대상: 별도 승인 후 누수·복구 장시간 관찰 | 비대상: UI 없어야 정상 |
| V410-S05-I02 | 저장 큐 이전 내구 접수 | `src/analysis/event_storage.cpp` · `Enqueue` | `recording link is durably admitted before the bounded storage queue can drop an event` · `VerifyAdmission` · `VerifyRecovery` · V410-S05-I02-C01, V410-S05-I02-C02, V410-S05-I02-C03, V410-S05-I02-C04, V410-S05-I02-C05, V410-S05-I02-C06, V410-S05-I02-C07, V410-S05-I02-C08, V410-S05-I02-C09, V410-S05-I02-C10, V410-S05-I02-C11, V410-S05-I02-C12, V410-S05-I02-C13, V410-S05-I02-C14, V410-S05-I02-C15, V410-S05-I02-C16, V410-S05-I02-C17, V410-S05-I02-C18, V410-S05-I02-C19, V410-S05-I02-C20, V410-S05-I02-C21 | 정적 계약 및 실제 JSONL 비활성·큐 퇴출 내구 접수·새 프로세스 복구·H264 파생·멱등성 | 대상 | 대상: 별도 승인 후 녹화 연속 운용 | 대상: 별도 승인 후 누수·복구 장시간 관찰 | 비대상: UI 없어야 정상 |
| V410-S05-I03 | 명시적 PTS UTC 및 pre/post | `src/recording/event_recording_bridge.cpp` · `TryResolve` | `VerifyEventLinking` · V410-S05-I03-C01 | pre 1000/post 200으로 UTC 10300~12500 | 대상 | 대상: 별도 승인 후 녹화 연속 운용 | 대상: 별도 승인 후 누수·복구 장시간 관찰 | 비대상: UI 없어야 정상 |
| V410-S05-I04 | anchor 없는 PTS 내구 복구 | `src/recording/event_recording_bridge.cpp` · `TryResolve` | `VerifyEventLinking` · V410-S05-I04-C01, V410-S05-I04-C02, V410-S05-I04-C03 | finalized mapping 복구·불명확 PTS Pending 보존 | 대상 | 대상: 별도 승인 후 녹화 연속 운용 | 대상: 별도 승인 후 누수·복구 장시간 관찰 | 비대상: UI 없어야 정상 |
| V410-S05-I05 | 이벤트 중복 및 범위별 ID | `src/recording/event_recording_bridge.cpp` · `TryResolve` | `VerifyEventLinking` · V410-S05-I05-C01, V410-S05-I05-C02, V410-S05-I05-C03 | 동일 update 1회·확장 새 ID·긴 prefix 비충돌 | 대상 | 대상: 별도 승인 후 녹화 연속 운용 | 대상: 별도 승인 후 누수·복구 장시간 관찰 | 비대상: UI 없어야 정상 |
| V410-S05-I06 | 링크 계약과 가산 필드 | `src/recording/recording_contracts.cpp` · `ValidateEventRecordingLinkV1` | `VerifyLinkContractInvariants` · V410-S05-I06-C01, V410-S05-I06-C02, V410-S05-I06-C03, V410-S05-I06-C04, V410-S05-I06-C05, V410-S05-I06-C06, V410-S05-I06-C07, V410-S05-I06-C08 | 왕복 보존·축소/겹침/분할 누락/잘못된 terminal 거부 | 대상 | 대상: 별도 승인 후 녹화 연속 운용 | 대상: 별도 승인 후 누수·복구 장시간 관찰 | 비대상: UI 없어야 정상 |
| V410-S05-I07 | 정렬 overlap 및 누락 구간 | `src/recording/event_recording_bridge.cpp` · `Process` | `VerifyEventLinking` · V410-S05-I07-C01, V410-S05-I07-C02, V410-S05-I07-C03, V410-S05-I07-C04 | 3개 순서·접점 제외·gap 11000~12000 Partial | 대상 | 대상: 별도 승인 후 녹화 연속 운용 | 대상: 별도 승인 후 누수·복구 장시간 관찰 | 비대상: UI 없어야 정상 |
| V410-S05-I08 | 원본 lease 획득 및 해제 | `src/recording/recording_catalog.cpp` · `AcquireEventSourceLease` | `VerifyEventLinking` · V410-S05-I08-C01, V410-S05-I08-C02 | 각 원본 파생 중 hold 1·완료 뒤 0 | 대상 | 대상: 별도 승인 후 녹화 연속 운용 | 대상: 별도 승인 후 누수·복구 장시간 관찰 | 비대상: UI 없어야 정상 |
| V410-S05-I09 | 이벤트 용량과 예약 분리 | `src/recording/retention_coordinator.cpp` · `AdmitEventWrite` | `VerifyEventQuotaIsolation` · V410-S05-I09-C01, V410-S05-I09-C02, V410-S05-I09-C03, V410-S05-I09-C04 | continuous 보존·오래된 event 삭제·예약 수명 | 대상 | 대상: 별도 승인 후 녹화 연속 운용 | 대상: 별도 승인 후 누수·복구 장시간 관찰 | 비대상: UI 없어야 정상 |
| V410-S05-I10 | 긴 remux 접수 비차단 | `src/recording/event_recording_bridge.cpp` · `Process` | `VerifyQueueRefillAndCleanupHold` · V410-S05-I10-C01 | blocked deriver 중 다른 접수 100ms 이내 | 대상 | 대상: 별도 승인 후 녹화 연속 운용 | 대상: 별도 승인 후 누수·복구 장시간 관찰 | 비대상: UI 없어야 정상 |
| V410-S05-I11 | 포화 큐 내구 재흡수 | `src/recording/event_recording_bridge.cpp` · `Process` | `VerifyQueueRefillAndCleanupHold` · V410-S05-I11-C01 | 최대 대기 1에서 3개 이벤트 모두 완료 | 대상 | 대상: 별도 승인 후 녹화 연속 운용 | 대상: 별도 승인 후 누수·복구 장시간 관찰 | 비대상: UI 없어야 정상 |
| V410-S05-I12 | frame-buffer fallback 연결 | `src/recording/event_recording_bridge.cpp` · `RecordFallback` | `VerifyEventLinking` · V410-S05-I12-C01 | 동일 Partial link에 실제 절대 locator 보존 | 대상 | 대상: 별도 승인 후 녹화 연속 운용 | 대상: 별도 승인 후 누수·복구 장시간 관찰 | 비대상: UI 없어야 정상 |
| V410-S05-I13 | 완료 파생 clip 반환 | `src/recording/event_recording_bridge.cpp` · `TryResolve` | `VerifyEventLinking` · V410-S05-I13-C01, V410-S05-I13-C02, V410-S05-I13-C03 | ready·Complete·derived ID/path 동시 일치 | 대상 | 대상: 별도 승인 후 녹화 연속 운용 | 대상: 별도 승인 후 누수·복구 장시간 관찰 | 비대상: UI 없어야 정상 |
| V410-S05-I14 | H264 무재인코딩 실측 출력 | `src/recording/event_clip_deriver.cpp` · `Derive` | `VerifyRealRemux` · V410-S05-I14-C01, V410-S05-I14-C02, V410-S05-I14-C03, V410-S05-I14-C04, V410-S05-I14-C05 | MP4 입력→TS 출력 크기·checksum·keyframe 확대; 동일 함수 EOS parse도 성공 | 대상 | 대상: 별도 승인 후 녹화 연속 운용 | 대상: 별도 승인 후 누수·복구 장시간 관찰 | 비대상: UI 없어야 정상 |
| V410-S05-I15 | 출력 무덮어쓰기와 fd 결박 | `src/recording/event_clip_deriver.cpp` · `Derive` | `VerifyRealRemux` · V410-S05-I15-C01, V410-S05-I15-C02 | 기존 final/foreign partial 크기 보존 | 대상 | 대상: 별도 승인 후 녹화 연속 운용 | 대상: 별도 승인 후 누수·복구 장시간 관찰 | 비대상: UI 없어야 정상 |
| V410-S05-I16 | 소유 crash partial 복구 | `src/recording/recording_catalog.cpp` · `Open` | `VerifyRealRemux` · V410-S05-I16-C01, V410-S05-I16-C02 | v2 UUID marker 일치 partial 정리 후 재파생 성공 | 대상 | 대상: 별도 승인 후 녹화 연속 운용 | 대상: 별도 승인 후 누수·복구 장시간 관찰 | 비대상: UI 없어야 정상 |
| V410-S05-I17 | VP8 파생 거부 | `src/recording/event_clip_deriver.cpp` · `Derive` | `VerifyRealVp8Remux` · V410-S05-I17-C01 | 실제 VP8 source에서 파일 없이 명시적 거부 | 대상 | 대상: 별도 승인 후 녹화 연속 운용 | 대상: 별도 승인 후 누수·복구 장시간 관찰 | 비대상: UI 없어야 정상 |
| V410-S05-I18 | segment ID 충돌 거부 | `src/recording/event_recording_bridge.cpp` · `Process` | `VerifyRestartRecoveryAndIdConflict` · V410-S05-I18-C01, V410-S05-I18-C02 | 타 channel/class ID는 Failed·derive 0회 | 대상 | 대상: 별도 승인 후 녹화 연속 운용 | 대상: 별도 승인 후 누수·복구 장시간 관찰 | 비대상: UI 없어야 정상 |
| V410-S05-I19 | finalized 파생물 재시작 연결 | `src/recording/event_recording_bridge.cpp` · `Process` | `VerifyRestartRecoveryAndIdConflict` · V410-S05-I19-C01, V410-S05-I19-C02 | 기존 derived ID·actual range 연결·derive 0회 | 대상 | 대상: 별도 승인 후 녹화 연속 운용 | 대상: 별도 승인 후 누수·복구 장시간 관찰 | 비대상: UI 없어야 정상 |
| V410-S05-I20 | terminal 단계와 삭제 보호 | `src/recording/event_recording_bridge.cpp` · `ReleaseTerminalResources` | `VerifyQueueRefillAndCleanupHold` · V410-S05-I20-C01, V410-S05-I20-C02, V410-S05-I20-C03, V410-S05-I20-C04, V410-S05-I20-C05 | cleanup/marker/release 실패는 Pending 자원 유지·재시도 다른 hold 보존 | 대상 | 대상: 별도 승인 후 녹화 연속 운용 | 대상: 별도 승인 후 누수·복구 장시간 관찰 | 비대상: UI 없어야 정상 |
| V410-S05-I21 | 보류 확장 및 재시작 수렴 | `src/recording/event_recording_bridge.cpp` · `TryResolve` | `VerifyDeferredFailureAndPtsUpdates` · V410-S05-I21-C01, V410-S05-I21-C02, V410-S05-I21-C03, V410-S05-I21-C04, V410-S05-I21-C05 | UTC 실패/Partial 수렴·PTS 2회 확장·재시작 총3회 | 대상 | 대상: 별도 승인 후 녹화 연속 운용 | 대상: 별도 승인 후 누수·복구 장시간 관찰 | 비대상: UI 없어야 정상 |
| V410-S05-I22 | hold overflow 거부 | `src/recording/recording_catalog.cpp` · `AcquireEventSourceLease` | `VerifyQueueRefillAndCleanupHold` · V410-S05-I22-C01 | 저장 int64 한계에서 증가 거부 | 대상 | 대상: 별도 승인 후 녹화 연속 운용 | 대상: 별도 승인 후 누수·복구 장시간 관찰 | 비대상: UI 없어야 정상 |
| V410-S05-I23 | SQLite 동일 링크 갱신 | `src/recording/recording_catalog.cpp` · `PutEventLink` | `VerifyEventLinking` · V410-S05-I23-C01, V410-S05-I23-C02 | sqlite-primary 유지 | 대상 | 대상: 별도 승인 후 녹화 연속 운용 | 대상: 별도 승인 후 누수·복구 장시간 관찰 | 비대상: UI 없어야 정상 |
| V410-S05-I24 | terminal replay 및 삭제 차단 | `src/recording/recording_catalog.cpp` · `RequestDeletion` | `VerifyPendingDerivedHoldRecovery` · V410-S05-I24-C01, V410-S05-I24-C02, V410-S05-I24-C03, V410-S05-I24-C04 | 단계별 hold 복원·hold 0이어도 terminal 전 삭제 거부 | 대상 | 대상: 별도 승인 후 녹화 연속 운용 | 대상: 별도 승인 후 누수·복구 장시간 관찰 | 비대상: UI 없어야 정상 |
| V410-S05-I25 | 전송 DTO 경계 | `src/ingress/webrtc_http_server_ops_incidents.cpp` · `ProjectEventStorageDispatchRequest` | `transport has zero canonical bypass and exact projection/call ordering` · V410-S05-I25-C01 | 전송 DTO 우회·필드 누락·잘못된 호출 순서 거부 | 대상 | 대상: 별도 승인 후 녹화 연속 운용 | 대상: 별도 승인 후 누수·복구 장시간 관찰 | 비대상: UI 없어야 정상 |
| V410-S05-I26 | 출력 fd 검증 계약 | `src/recording/event_clip_deriver.cpp` · `Derive` | `event clip output remains fd-bound and measured before no-replace publication` · V410-S05-I26-C01 | fd 결박·timestamp 측정·no-replace 출판의 정적 경계 | 대상 | 대상: 별도 승인 후 녹화 연속 운용 | 대상: 별도 승인 후 누수·복구 장시간 관찰 | 비대상: UI 없어야 정상 |
| V410-S05-I27 | 제품 시작·종료 순서 | `src/application/media_server_application.cpp` · `RunMediaServerApplication`; `src/analysis/event_storage.cpp` · `EventStorageDispatcher::Stop`, `EventFrameBuffer::CancelPostEventWaits` | `S05 구성은 생산자 전에 bridge를 등록하고 의존성 종료 전에 drain한다`, `VerifyShutdownCancellation` · V410-S05-I27-C01, V410-S05-I27-C02, V410-S05-I27-C03, V410-S05-I27-C04 | 생산자 전 bridge 등록·시작실패/정상 4경로 조기 bridge drain·storage 미래 frame 대기 취소·접수 기록 drain 뒤 detach | 대상 | 대상: 별도 승인 후 녹화 연속 운용 | 대상: 별도 승인 후 누수·복구 장시간 관찰 | 비대상: UI 없어야 정상 |

## V410 GStreamer 실행 환경 개별 동작 등록

S05 후속 환경 보완이며 녹화 로직·UI 변경은 아니다. 실행 전 등록이며 결과는
`docs/release-test-records.md`에 별도 기록한다. fixture는 다른 OS 실측을 대체하지 않는다.

| 기능 ID | 개별 동작 | 구현·검증 연결 | 안정화 테스트 | 30분 테스트 | 120분 테스트 | UI 테스트·UI 존재 |
| --- | --- | --- | --- | --- | --- | --- |
| V410-ENV-01 | Linux 환경 불변 | env_common.sh / test_linux_unchanged | 대상 | 미진행: 이번 변경 비대상 | 미진행: 직접 경로 변경 없음 | 비대상: UI 없어야 정상 |
| V410-ENV-02 | Homebrew prefix·scanner 탐색 | env_common.sh / test_prefix_discovery, test_explicit_prefix | 대상 | 미진행 | 미진행 | 비대상: UI 없어야 정상 |
| V410-ENV-03 | GTK·Python만 제외 | gst_plugin_cache.py / test_filter | 대상 | 미진행 | 미진행 | 비대상: UI 없어야 정상 |
| V410-ENV-04 | 사용자 플러그인·공백 경로·우선순위 보존 | gst_plugin_cache.py / test_custom_paths, test_custom_so_plugins | 대상 | 미진행 | 미진행 | 비대상: UI 없어야 정상 |
| V410-ENV-05 | 캐시 재사용·갱신·동시 생성·상속 후 경로 추가 | gst_plugin_cache.py, env_common.sh / test_reapply, test_upgrade, test_concurrent, test_inherited_custom_paths | 대상 | 미진행 | 미진행 | 비대상: UI 없어야 정상 |
| V410-ENV-06 | 변조·잘못된 캐시 거부 | gst_plugin_cache.py / test_unsafe_cache, test_tampered_cache | 대상 | 미진행 | 미진행 | 비대상: UI 없어야 정상 |
| V410-ENV-07 | 전용 registry·명시 registry 유지 | env_common.sh / test_registry | 대상 | 미진행 | 미진행 | 비대상: UI 없어야 정상 |
| V410-ENV-08 | system 진단 모드·잘못된 모드 거부 | env_common.sh / test_system_profile, test_invalid_profile | 대상 | 미진행 | 미진행 | 비대상: UI 없어야 정상 |
| V410-ENV-09 | 로컬 설정 뒤 환경 적용 | build/start/foreground/test_all / test_override_order | 대상 | 미진행 | 미진행 | 비대상: UI 없어야 정상 |
| V410-ENV-10 | nohup·launchd 환경 전달과 실제 lifecycle | start_server.sh / test_nohup_environment, test_launchd_environment; verify_v410_s05_service_lifecycle.mjs / 실제 녹화·event link·restart·normal stop·cleanup | 대상 | 미진행 | 미진행 | 비대상: UI 없어야 정상 |
| V410-ENV-11 | 녹화 검증 명령 공통 적용·비미디어 CLI 무부작용 | server.sh, verify_v410_event_recording.sh / test_dispatch_environment, test_cli_no_gst_side_effects | 대상 | 미진행 | 미진행 | 비대상: UI 없어야 정상 |
| V410-ENV-12 | 실제 cold/warm 검색·44 factory·READY·무음 H264 | 공통 환경 적용 후 별도 실제 GStreamer 프로세스; fixture verifier와 구분 | 대상 | 미진행 | 미진행 | 비대상: UI 없어야 정상 |
| V410-ENV-13 | S05·빌드·등록·문서 회귀 | verify-v410-event-recording, v410_s05_inventory.test.mjs의 등록군 확장·총계/canonical/S05/중복/음수/소수/표 누락 검사, build, 문서/인벤토리 검증 | 대상 | 미진행: 기존 릴리즈 gate 유지 | 미진행: 기존 S05 판정 유지 | 비대상: 신규 UI 없음, 기존 릴리즈 gate 유지 |

## Current Coverage Status

이 절은 inventory 문서 자체의 coverage 상태입니다. 실제 안정화 테스트, 30분 soak, 120분 longrun, UI 풀테스트를 실행했다는 뜻이 아닙니다.

| 항목 | 현재 상태 | 결론 |
| --- | --- | --- |
| 기능 ID 목록 | 986개 기능 ID를 `UI-*`, `AUTH-*`, `SRC-*`, `RULE-*`, `EVT-*`, `CLIENT-*`, `MEDIA-*`, `LAB-*`, `SAFE-*`, `OPS-*`로 분리하고 exact-ID 집합을 고정 | ID/cardinality 목록은 current. 기존 semantic manifest closure는 REVIEW4-53 독립 재구축 전 완료 evidence가 아님 |
| 코드 로직 위치 | 기존 manifest가 986개 ID별 owner symbol→route/control→action→state→readback→verifier chain과 review reason/digest를 기록 | migration이 locator/edge/reason/approval을 함께 만든 historical source claim이며 REVIEW4-53에서 실제 call/data-flow로 독립 재구축 대기 |
| 제품 UI 위치 | UI 필요/간접 또는 UI absence boundary 441개 ID와 UI 테스트 영역 424개 manual case ID를 지정 | REVIEW4-56이 exact 424 기능별 input/control/action/state/readback/cleanup 설계를 닫았습니다. Requested/observed·completion·visual·Policy 독립 readiness는 REVIEW4-57~60 대기 |
| 안정화 테스트 매핑 | 기존 986개 ID에 `validateReview3CallChain` assertion과 verifier command를 지정 | 기존 mapping은 REVIEW4-53의 무관/generic/self-comparison negative를 통과하기 전 semantic 완료나 실행 PASS가 아님 |
| 30분 테스트 매핑 | 30분 대상 기능을 media/session/runtime 중심으로 분리 | 기준표 작성 완료 |
| 120분 테스트 매핑 | memory leak/runtime drift 조건부 대상 분리 | 기준표 작성 완료 |
| VA seed 데이터 | `test/fixtures/manual_ui_fulltest_va_seed_matrix.json`로 numeric ID/API payload 기준 full UI seed matrix를 고정 | 준비 기준일 뿐 실행 증거 아님 |
| UI 풀테스트 결과 | 기능 ID별 result template 기록란은 별도 문서가 관리 | 결과 문서 없이 inventory만으로 UI PASS 판정 불가 |
| Coverage gate | `./server.sh verify-feature-inventory-coverage`가 `media-server.feature-inventory-coverage.v1` report로 기능 ID별 연결을 점검 | `coverageStatus: covered/missing`, `executionEvidenceStatus: not-execution-evidence`, `missing coverage target` 누락 ID는 release gate에서 FAIL. covered는 mapping coverage이며 실행 PASS가 아님 |
| VLM current expansion | VLM route, control, action, runtime state, sidecar, privacy guard, feature-only retention과 v3.9 source baseline/feature completion inventory active roadmap, v3.8 operator-gated action pilot latest published baseline, v3.7 site-aware operations previous published baseline, v3.6 simulation input/run/dry-run/impact diff/safe apply readiness/field evidence adapter/default-off simulation explanation historical baseline, v3.5 live operations historical baseline을 현재 기능 ID에 연결 | 실행 증거 아님 |

## V390-REVIEW3-36 RulesJson Scope Decisions

`AnalysisDocumentRegistry::RulesJson()`에 남아 있던 두 `notImplementedYet` 문자열은 제품 기능
행이 아니었습니다. 아래 결정은 기능 row 수를 늘리지 않으며, JSON ledger
`test/fixtures/v390_review3_discovery_ledger.json`과
`./server.sh verify-v390-review3-discovery-ledger`가 source 경계를 대조합니다.

| 결정 ID | 기존 marker | disposition | inventory 영향 | 테스트 영역 | 결정 근거 |
| --- | --- | --- | ---: | --- | --- |
| V390-RULESJSON-NON-VA-AUTO-MATCH | automatic rule matching for non-VA streams | excluded-by-design | 0 | 안정화 | 저장 rule 선택은 명시적으로 VA가 활성화되어 analysis tap이 붙은 뒤에만 수행합니다. 비-VA media path에 분석을 자동 부착하면 제품 분석 경계를 바꾸므로 v3.9 기능에서 제외하고 미구현 광고 문자열을 제거했습니다. |
| V390-RULESJSON-RTSP-WEBRTC-LONGRUN | long-running RTSP/WebRTC route matching validation | transferred-to-test-condition | 0 | 120분 | 기존 route/profile matching의 duration evidence이며 제품 기능이 아닙니다. RTSP/WebRTC media path 변경 또는 선수 테스트 risk signal과 사용자 실행 승인이 있을 때 AGENTS 7.6.2의 조건부 120분 검증으로 수행합니다. 이번 단계에서는 실행 PASS로 기록하지 않습니다. |

두 결정 뒤 전체 기능 항목은 계속 986개입니다. Markdown ledger는 `AGENTS.md`를 별도 전문
감사하고, 나머지 tracked Markdown 173개에 대해 full-read byte count, SHA-256, 문서 분류,
명시 상태 marker, exact paragraph 중복, 조치를 파일별로 보존합니다. 이 정적 ledger는 문서
내용과 source marker coverage evidence일 뿐 UI 풀테스트·30분·120분 실행 evidence가 아닙니다.

## v3.9.0 Feature Completion, Structure Stabilization, and Test Model Preparation Coverage Mapping

이 절은 현재 active source target의 baseline/inventory 연결만 남깁니다. 아래 행은
실행 evidence가 아니며, feature discovery/dev, 구조 안정화 구현, 테스트 방식 전환
구현, UI 풀테스트, 30분/120분, published metadata, release action PASS로 승격하지
않습니다.

### Verification runner rebase Tasks 1–7 선등록 (2026-08-12)

최초 source는 `327afe0d4b3282400f1925252c59a53b87827224`이고 최초 actual RED는
`UI-001`의 `action redirect chain parent resourceType mismatch`입니다. 아래 행은
Task 8 Static 실행 전에 등록한 안정화 테스트 항목입니다. Recorded replay는 expected
value가 아닌 보조 회귀 evidence이고 actual browser/UI 풀테스트를 대체하지 않습니다.

| 기능 | 구현 파일·함수 | dispatch / positive boundary | negative boundary | 테스트 영역 및 실행 경계 |
| --- | --- | --- | --- | --- |
| V390 request capture-only recorder | `scripts/internal/v390_ui_request_event_recorder.mjs` `createRequestEventRecorder`, `captureSafely`, `objectIdentity`, `requestKindFor`, `snapshot` | `./server.sh verify-v390-ui-request-lifecycle-rebase-contract`; immutable request/response/finished/failed envelope, exact raw object identity, strict sequence/time/correlation capture | callback getter throw, missing/wrong resource type, explicit undefined projection, duplicate/foreign response, cross-case leak를 callback throw 없이 exhaustive capture error로 보존 | 안정화 `required`; 30분 `not-run`; 120분 `not-run`; UI `not-run` |
| V390 post-case request lifecycle evaluator | `scripts/internal/v390_ui_request_lifecycle_evaluator.mjs` `evaluateRequestLifecycle`, response exact-object binding, exact-one classification/census | 같은 lifecycle dispatch; actual-like positive `UI-001-bootstrap-redirect`, `UI-002-action-redirect`, representative API fetch, same-route rejection | callback-capture-error, missing-resource-type, wrong-redirect-parent, duplicate-response, stale-invocation, cross-action-leak와 raw/projected identity·redirect chain 결함을 fail-closed | 안정화 `required`; 30분 `not-run`; 120분 `not-run`; UI `not-run` |
| V390 native adapter callback capture integration | `scripts/internal/v390_ui_native_adapter.mjs` `createNativeRequestLifecycleLedger`, request/response callback recorder, immutable invocation ledger, memoized post-case evaluator | `verify-v390-ui-native-adapter-contract`, `verify-v390-ui-browser-callback-free-identifier-contract`, `verify-v390-ui-request-lifecycle-rebase-contract`; request-first/route-first 및 exact response identity | callback classifier/throw 재도입, global active-owner fallback, stale/cross-action ownership, subresource contamination, runtime-secret sink 부재를 거부 | 안정화 `required`; 30분 `not-run`; 120분 `not-run`; UI `not-run` |
| V390 one-case child finally summary | `scripts/internal/run_v390_ui_native_exact_cases.mjs` `finalizeCaseChildAttempt`, `buildMinimalCaseChildSummary`, `writeCaseChildSummaryAtomic`; `scripts/internal/v390_ui_native_exact_cases_lib.mjs` `createNativeExactCaseChildSummary` | `./server.sh verify-v390-ui-case-child-isolation-contract`; exactly one selected/attempted PASS 또는 ordinary FAIL summary, cleanup/source/policy-input binding, create-only atomic write | callback/lifecycle/DOM/API/rejection/timeout/cleanup/secret scan 실패, malformed summary, summary write failure 전용 infra marker, tainted disk artifact 제거·독립 rescan | 안정화 `required`; 30분 `not-run`; 120분 `not-run`; UI `not-run` |
| V390 canonical 424 child parent/failure census | `run_v390_ui_native_exact_cases.mjs` `runCanonicalExactParent`; `v390_ui_native_exact_cases_lib.mjs` `selectCanonicalParentCases`, `runCanonicalParentOrchestration`, `validateCanonicalParentChildSummary`, `validateCanonicalParentAcceptanceSummary` | `./server.sh verify-v390-ui-canonical-parent-isolation-contract`; ordered unique 424, ordinary FAIL 뒤 전수 시도, selected=attempted=424와 exhaustive census/firstFailure | malformed/missing/stale/duplicate/reordered/symlink/wrong-source/run/cleanup/actual child와 exit/status 모순 거부; only server bootstrap, port contamination, summary write가 infra-fatal | 안정화 `required`; 30분 `not-run`; 120분 `not-run`; UI `not-run` |
| V390 acceptance/Policy/final-integrity/launcher complete-census gate | `verify_v390_test_acceptance_bundle.mjs`, `v390_ui_policy_v4_evidence_producer.mjs` `evaluateCanonicalParentPolicyV4`/`producePolicyV4EvidenceFromCanonicalParent`, `v390_full_suite_eligibility_lib.mjs` `evaluateV390FullSuiteEligibility`, `v390_ui_native_exact_cases_lib.mjs` `qualifyCanonicalParentPolicyRows`/`validateCanonicalFinalIntegrityBindings`, `verify_v390_final_evidence_integrity.mjs`, `user_test_launcher_common.sh` | `verify-v390-test-acceptance-bundle-contract`, `verify-v390-ui-policy-v4-producer-contract`, `verify-v390-ui-policy-v4-independence-contract`, `verify-v390-final-evidence-integrity-contract`, `verify-v390-user-test-launchers-contract`; exact 424 success만 eligible/qualified/UI PASS | partial/stale/defaulted/static/replay/pilot/diagnostic/synthetic parent·Policy rows, path/digest/run/source/cleanup drift, missing summary/false gate, retained secret를 fail-closed. Complete attempted-424 FAIL은 census integrity만 PASS 가능하고 UI/release는 FAIL | 안정화 `required`; 30분 `not-run`; 120분 `not-run`; UI `not-run` |

Task 8 사전 등록 시점 공식 generator invocation `0`, Policy/evidence producer actual
invocation `0`입니다. `./test_ui.sh`, actual exact 424, Policy v4 actual qualification,
30분, 120분은 실행하지 않았습니다. Task 8 recorded replay `548/548`은 auxiliary
Static으로만 실행 예정이며 actual completion evidence가 아닙니다.

#### Task 8 최종 Static ledger

| 항목 | 최종 evidence | 실행 경계 |
| --- | --- | --- |
| Semantic review | Candidate `e4d6e57c53ae975efbb46f24d24ec160a61ac188c3b67fce379386fb98b63b36`; reviewedOn `2026-08-12`; carry-forward 981 + independent 5 | 최종 package/decision/snapshot digest는 원자적 source-of-truth `test/fixtures/v390_review4_feature_semantic_source_approvals.json`에서 검증한다. 이 self-bound inventory에는 변동 digest를 복제하지 않는다 |
| Drift writer ledger | Read-only drift proof 뒤 공식 writer만 실행하고 native generator와 actual Policy producer는 실행하지 않음 | writer 호출 수와 transaction 전 실패 이력은 Task 8 실행 report에 보존한다. Actual browser evidence를 생성하지 않음 |
| Build/static | `build-gst-onnx/media_server` SHA-256 `ac86d34d309768e4b254f3b0275e476434389887fda9a1ccd124294342dc204c`, 17,511,664 bytes; lifecycle 10, child 35, parent 40, native 55, adapter 58, runtime 63, acceptance 32, launcher 21, integrity 15, Policy 28 및 inventory/docs/syntax/diff PASS | Static contract 결과이며 actual UI/Policy/release PASS가 아님 |
| Replay/actual | Recorded replay exact `548/548` auxiliary; actual exact 424 browser executed `0`/not-run `424`; `./test_ui.sh`, 30분, 120분 미실행 | Replay는 actual completion evidence를 대체하지 않음 |

| Roadmap scope | Feature IDs | 대표 안정화 verifier | release evidence boundary |
| --- | --- | --- | --- |
| v4.1.0 Recording Foundation 현재 범위 | 기존 canonical 986개와 S05 고정 ID 27개 분리 | `verify-v410-research-gate`, `verify-v410-entry-baseline`, `verify-v410-recording-contracts`, `verify-v410-recording-recorder`, `verify-v410-recording-catalog`, `verify-v410-recording-retention`, `verify-v410-event-recording`, `verify-project-inventory`, `verify-feature-inventory-coverage` | S05 local 구현·개별 등록·재실행·독립 결속 검증 완료. 이전 등록 누락 FAIL과 보정 이력은 release-test-records에 보존합니다. S06 timeline API/UI, 검색 관측, UI 풀테스트, 30분/120분, published metadata, release action PASS가 아닙니다 |
| v3.9.1 release correction | `OPS-163`, `SAFE-196` inherited scope | `verify-release-metadata`, `verify-v391-documentation-truth`, `verify-public-repo-readiness`, `verify-docs-links`, `verify-docs-ui-assets` | current source `3.9.1`, latest published `v3.9.0`의 metadata/docs/public evidence/UI asset correction입니다. 기능 ID·API/schema/media 동작을 추가하지 않으며 fresh build, 30분, exact UI 424/Policy v4, 120분, release action은 별도 evidence가 필요합니다. |
| v4.0.0 Local Operations Policy and Stabilization roadmap | `OPS-163`, `SAFE-196` inherited scope | `verify-v400-roadmap-contract`, `verify-v400-entry-baseline`, `verify-script-inventory`, `verify-project-inventory`, `verify-docs-links` | 현재 source 개발 로드맵이 로컬 운영 정책화/안정화와 v4.1.0 신규 기능을 분리하고, 모든 스텝에 테스트 스크립트 반영 필수를 심었는지 확인합니다. v4.0.0 (1) 외 기능 구현, UI 풀테스트, 30분/120분, published metadata, release action PASS가 아닙니다 |
| v4.0.0 (1) v4.0.0 baseline 정렬 | `OPS-163`, `SAFE-196` inherited scope | `verify-v400-entry-baseline`, `verify-release-metadata`, `verify-docs-links`, `verify-docs-ui-assets`, `verify-v400-roadmap-contract`, `verify-script-inventory`, `verify-project-inventory` | current source `4.0.0`, latest published `v4.0.0`, current roadmap `v4.0.0 Local Operations Policy and Stabilization` 정렬. UI 풀테스트, 30분/120분, published metadata, PR/main/tag/GitHub Release evidence와는 별도 gate입니다 |
| v4.0.0 (2) User Review Gate | `OPS-165`, `SAFE-198` inherited scope | `verify-v400-user-review-gate`, `verify-v400-roadmap-contract`, `verify-script-inventory`, `verify-project-inventory` | 4.0.0 정책/안정화 범위와 4.1.0 신규 기능 경계를 `approved-through-recorded-user-goals`로 고정. 신규 기능은 `blocked-until-v400-complete`. 각 스텝 전용 verifier, UI 풀테스트, 30분/120분, published metadata, PR/main/tag/GitHub Release evidence와는 별도 gate입니다 |
| v4.0.0 (3) 검증 계층 축소 규칙 | `OPS-166`, `SAFE-199`, `OPS-167`, `SAFE-200` inherited scope | `verify-v400-verification-layer-reduction`, `verify-v390-evidence-test-gate-prep`, `verify-script-inventory`, `verify-project-inventory` | 986/424 유지, v390/contract/fixture 상한, v400 command allowlist, wrapper PASS와 실행 PASS 분리를 고정합니다. 역사적 verifier 삭제, UI 풀테스트, 30분/120분, published metadata, PR/main/tag/GitHub Release evidence와는 별도 gate입니다 |
| v4.0.0 (4) 로컬 운영 정책 freeze | `OPS-181`, `SAFE-214` inherited scope | `verify-v400-local-ops-policy-freeze`, `verify-v390-deferred-product-owner-signoff`, `verify-v390-action-execution-deferral-decision`, `verify-v390-onvif-credential-provider-status`, `verify-v390-backup-recovery-handoff-validation`, `verify-v390-conditional-field-ai-decisions`, `verify-v390-reid-readiness-consistency`, `verify-v390-external-field-smoke-no-device-closure`, `verify-script-inventory`, `verify-project-inventory` | v3.9 defer 5개(action-execution, persistent-credential-store, production-restore, external-vlm-provider-call, model-backed-reid-session)를 4.0 비구현 write path로 freeze하고 field smoke는 별도 `conditional-not-run`으로 유지합니다. 기존 v390 deferral/signoff verifier는 재사용만 합니다. write 구현, UI 풀테스트, 30분/120분, published metadata, PR/main/tag/GitHub Release evidence와는 별도 gate입니다 |
| v4.0.0 (5) Incident OS 정책화 | `UI-062`, `EVT-064`, `SAFE-104`, `OPS-071` inherited scope | `verify-v400-incident-os-policy`, `verify-v320-unified-ops-events-workspace`, `verify-v320-resolution-search-metrics`, `verify-v310-replay-timeline-ui`, `verify-ops-event-review-inbox`, `verify-script-inventory`, `verify-project-inventory` | 기존 `/ops/events` 검색/timeline/resolution을 Ops-only diagnostic/direct route로 정책 고정합니다. primary nav 승격, 새 event type, Event POST schema 변경, UI 풀테스트, 30분/120분, published metadata, PR/main/tag/GitHub Release evidence와는 별도 gate입니다 |
| v4.0.0 (6) Evidence 운영 정책화 | `OPS-052`, `SAFE-082` inherited scope | `verify-v400-evidence-ops-policy`, `verify-v300-event-evidence-contract`, `verify-v300-feature-only-retention`, `verify-v300-retention-pin-cleanup`, `verify-script-inventory`, `verify-project-inventory` | EventRecord/clip/retention을 opt-in·비-VMS로 고정하고 default-on 저장은 v4.1.0에 둡니다. VMS/NVR archive API, 24/7 상시녹화, UI 풀테스트, 30분/120분, published metadata, PR/main/tag/GitHub Release evidence와는 별도 gate입니다 |
| v4.0.0 (7) 로컬 운영 안정화 | `OPS-166`, `SAFE-199` inherited scope | `verify-v400-local-ops-stabilization`, `verify-v400-verification-layer-reduction`, `verify-v390-entry-baseline`, `verify-script-inventory`, `verify-project-inventory` | 역사적 v390 verifier 118개를 유지하고 stream-verification 현재 source `4.0.0`과 inherited 3.9 행을 구분하며 v320 page-owner drift를 기록합니다. 역사적 verifier 삭제, v320 REVIEW4 rewrite, UI 풀테스트, 30분/120분, published metadata, PR/main/tag/GitHub Release evidence와는 별도 gate입니다 |
| v4.0.0 (8) stabilization and release readiness | `OPS-163`, `SAFE-196` inherited scope | `verify-v400-release-readiness`, `verify-release-closeout-helper`, `verify-release-metadata`, `verify-script-inventory`, `verify-project-inventory` | 네 테스트 영역 판정과 close-out dry-run을 기록합니다. 현재 30분과 UI는 executed-pass, 120분은 conditional-not-run. 출시 가능 판정, tag/GitHub Release/PR/published metadata evidence와는 별도 gate입니다 |
| V390-REVIEW4-65 bootstrap/action document redirect lifecycle 분리 | `OPS-169`, `SAFE-202`, canonical exact 424개·initial document hop 425개·request completion 391개·document form 11개와 latest runner-start RED | `verify-v390-ui-page-owned-request-lifecycle-contract`, `verify-v390-ui-action-request-background-ledger-contract`, `verify-v390-ui-document-form-response-binding-contract`, `verify-v390-ui-browser-callback-free-identifier-contract`, `verify-v390-ui-native-adapter-contract`, `verify-v390-ui-native-exact-cases-contract`, `verify-v390-ui-completion-oracle-contract`, `verify-v390-ui-native-diagnostic-trace-replay-contract`, `verify-v390-ui-remaining-actual-trace-replay-contract`, `verify-v390-ui-policy-v4-producer-contract`, `verify-v390-test-acceptance-bundle-contract`, `verify-v390-final-evidence-integrity-contract`, `verify-script-inventory` | 시작 SHA `6c5c2f61...` latest actual은 canonical 실행 전 `424/0`, UI-001 `GET / → 302 → GET /login` bootstrap redirect에서 `bootstrap/redirect lifecycle mixing is forbidden`으로 중단됐습니다. Initial census는 redirect `1`·no redirect `423`, document form은 redirect `9`·same-route rejection `2`입니다. 분류기는 settling state, exact initial/form navigation invocation, action invocation/phase, request kind/resource type, redirectedFrom object chain을 함께 검증합니다. Bootstrap 두 hop은 `page/page/bootstrap/initial-page-load`, primary POST는 `action/explicit-action-registration/primary-action/primary-action`, action destination GET은 `page/document-navigation-ledger/document-navigation-chain/document-navigation-chain`이며 서로의 cardinality/ledger에 포함되지 않습니다. Missing/duplicate/cross-chain/stale/wrong invocation·object·status·Location·action correlation은 fail-closed이고 actual browser/diagnostic actual/`test_ui.sh`는 별도입니다 |
| v3.9.0 (1) v3.9.0 baseline 정렬 | `OPS-163`, `SAFE-196` | `verify-v390-entry-baseline`, `verify-release-metadata`, `verify-docs-links`, `verify-docs-ui-assets`, `verify-project-inventory`, `verify-feature-inventory-coverage`, `verify-script-inventory` | source `3.9.0`, latest published `v3.8.0`, current roadmap `v3.9.0 Feature Completion, Structure Stabilization, and Test Model Preparation` 정렬 기준. v3.9 feature discovery/dev, UI 풀테스트, 30분/120분, published metadata, PR/main/tag/GitHub Release evidence와는 별도 gate입니다 |
| v3.9.0 (2) Feature Completion Inventory/Discovery Gate | `OPS-164`, `SAFE-197` | `verify-v390-feature-completion-inventory`, `verify-project-inventory`, `verify-feature-inventory-coverage`, `verify-script-inventory` | v3.9 feature completion inventory scaffold, discovery source groups, disposition/test-area vocabulary, user review gate 경계 기준. 실제 feature discovery 완료, 기능 구현, 구조 안정화 구현, 테스트 방식 전환 구현, UI 풀테스트, 30분/120분, published metadata, PR/main/tag/GitHub Release evidence와는 별도 gate입니다 |
| v3.9.0 (3) User Review Gate / 개발 순서 확정 | `OPS-165`, `SAFE-198` | `verify-v390-user-review-gate`, `verify-project-inventory`, `verify-feature-inventory-coverage`, `verify-script-inventory` | initial review-ready/`blocked-before-user-approval` 상태를 historical snapshot으로 보존하고 current `approved-through-recorded-user-goals`/`closed-with-evidence`/active candidate 없음 상태를 분리 검증합니다. UI 풀테스트, 30분/120분, published metadata, PR/main/tag/GitHub Release evidence와는 별도입니다 |
| v3.9.0 (7) UI wrapper/result schema 오판 방지 | `OPS-166`, `SAFE-199` | `verify-v390-evidence-test-gate-prep`, `verify-ui-fulltest-one-shot`, `verify-feature-inventory-coverage`, `verify-script-inventory` | UI wrapper `wrapperResult`, `resultScope`, `uiFulltestEvidenceStatus`, `manualResultStatus`, `longrunStatus` schema와 문서 경계를 확인합니다. wrapper PASS를 UI 풀테스트 직접 조작, 30분/120분, manual result, published metadata evidence로 승격하지 않습니다 |
| v3.9.0 (8) feature inventory coverage wording 오판 방지 | `OPS-167`, `SAFE-200` | `verify-v390-evidence-test-gate-prep`, `verify-feature-inventory-coverage`, `verify-project-inventory`, `verify-script-inventory` | feature inventory coverage report가 `coverageStatus: covered/missing`와 `executionEvidenceStatus: not-execution-evidence`를 사용해 mapping coverage와 실행 PASS를 분리합니다 |
| v3.9.0 R1 / V390-ADD1-10 / V390-REVIEW2-31 AI-minimized server longrun first-fail runner | `OPS-168`, `SAFE-201` | `verify-v390-server-longrun`, `verify-v390-server-longrun-runner-contract`, `verify-v390-evidence-test-gate-prep`, `verify-runtime-media-longrun-trigger-matrix`, `verify-longrun-separation`, `verify-rc-release-gate` | 30분/120분 runner의 one command, fixed phase/case order, first failure 즉시 중단, later phase/case `not-run`, delegated predev first failure, context, 분리 stderr tail, reproduction command, cleanup/artifact policy를 `media-server.v390-server-longrun.v1` summary/report와 실행 fixture contract로 확인합니다. V390-REVIEW2-31은 `server-start-queue-256`/`integrated-smoke`/soak case/`main-runtime-idle`의 실제 delegated 결과를 parent `start-server`/`integrated-smoke`/`soak-case-loop`/`runtime-idle` ledger에 투영하고 실행 전 synthetic PASS가 없음을 start·smoke·runtime failure negative fixture로 검증합니다. fixture output은 `fixture-only-not-real-duration`이며 실제 30분/120분 longrun 실행 evidence가 아닙니다 |
| v3.9.0 R2 / V390-ADD1-07~09 native visible DOM UI automation exact case runner | `OPS-169`, `SAFE-202`, `UI-108`, `UI-109`, `UI-110`, `UI-111`, `UI-112`, `UI-113`, `UI-114`, `UI-115` | `verify-v390-ui-automation`, `verify-v390-ui-automation-report`, `verify-v390-ui-automation-runner-contract`, `verify-v390-ui-native-adapter`, `verify-v390-ui-native-adapter-contract`, `verify-v390-evidence-test-gate-prep`, `verify-ui-fulltest-one-shot`, `verify-manual-ui-evidence`, `verify-script-inventory` | case schema v3가 implementation manifest와 exact ordered 8개 ID/route를 대조합니다. bundled Playwright `playwright-native` adapter가 wait/click/fill/type/select/screenshot을 제공하며 fallback=false와 module/browser provenance를 기록합니다. runner는 trusted setup/primary action 뒤 exact-selector computed visibility/visible innerText만 `visible-dom-user-action-v1`으로 판정하고 source/script/outerHTML/whole-page marker를 배제합니다. failure/artifact/cleanup과 first-fail later `not-run`을 기록하며 `automationResult is not manual UI fulltest` 경계를 유지합니다 |
| v3.9.0 (25) / V390-ADD1-11 full-feature exact-ID UI automation coverage matrix | UI 테스트 영역 exact `manualUiCaseId` 424개 (`UI`/`AUTH`/`SRC`/`RULE`/`EVT`/`CLIENT`/`MEDIA`/`SAFE`) | `verify-v390-ui-automation-coverage`, `verify-v390-ui-automation-coverage-contract`, `verify-v390-ui-automation-report`, `verify-feature-implementation-evidence`, `verify-script-inventory` | exact ID 424개와 REVIEW4-58 correction 반영 workflow 분류 287/15/35/40/45/2, REVIEW4-57 canonical requested/runtime observed schema, REVIEW4-58 primary action completion oracle, REVIEW4-59 exact 80-probe visual matrix, REVIEW4-60 producer/qualifier 독립성을 보존합니다. Current status는 `exact-native-ready-current-not-run`이며 actual browser 실행 또는 UI PASS가 아닙니다 |
| V390-ADD1-12 Policy v4 UI evidence transition | `OPS-169`, `SAFE-202`, UI 테스트 영역 exact `manualUiCaseId` 424개 | `verify-ui-fulltest-evidence-policy-v4`, `verify-ui-fulltest-evidence-policy-v4-contract`, `verify-v390-ui-policy-v4-independence-contract`, `verify-v390-ui-automation-report`, `verify-v390-ui-automation-coverage`, `verify-script-inventory` | Producer는 raw v2 action/network/readback/visual capture만 만들고 qualifier는 primary action, exact selector, request/response, semantic readback, visual measurement를 별도 구현으로 재계산합니다. REVIEW4-56~60 source readiness는 닫혔지만 actual 실행은 pass 0/not-run 424이며 UI PASS가 아닙니다 |
| V390-REVIEW2-22 Policy v4 canonical 424 exact-ID binding | `OPS-169`, `SAFE-202`, reviewed implementation evidence의 exact `manualUiCaseId` 424개 | `verify-ui-fulltest-evidence-policy-v4`, `verify-ui-fulltest-evidence-policy-v4-contract`, `verify-feature-implementation-evidence`, `verify-v390-ui-automation-coverage-contract` | Policy v4 evaluator가 hash 대상 canonical/native manifest를 실제 파싱하고 reviewed implementation evidence와 test ID/feature ID/route/control-action을 대조합니다. Requested는 canonical API ownership route를 보존하고 observed는 product `screenRoute`와 runtime role·viewport·theme·DOM control state를 독립 기록해야 하며, 임의 424개 합성 ID·순서 drift·manifest 내용 drift는 full-suite PASS가 아닙니다 |
| V390-REVIEW2-23 Policy v4 evidence attestation | `OPS-169`, `SAFE-202`, canonical UI evidence case와 cross-cutting obligation | `verify-ui-fulltest-evidence-policy-v4`, `verify-ui-fulltest-evidence-policy-v4-contract`, `verify-script-inventory`, `verify-release-evidence-index` | completion/visual/cross-cutting/redaction evidenceRef를 artifact root 안 실파일·bytes·SHA-256·content type·case/correlation ID에 연결합니다. Screenshot은 PNG chunk/CRC/IDAT decode, trace는 interaction trace schema와 trusted action/completion event, redaction은 실제 artifact scan과 scan output correlation을 검증하며 summary의 PASS boolean만으로 적격 판정하지 않습니다 |
| V390-REVIEW2-24 exact 424 native execution cases | `OPS-169`, `SAFE-202`, reviewed canonical exact `manualUiCaseId` 424개 | `verify-v390-ui-native-exact-cases`, `verify-v390-ui-native-exact-cases-contract`, `verify-feature-implementation-evidence`, `verify-script-inventory` | Policy v4 canonical ordered 424개를 prefix/range 없이 exact ID로 소비하고 product-screen route, native action plan, role/viewport/theme, state-oracle seed, screenshot/trace/console/server-log artifact plan을 개별 case에 고정합니다. API/raw JSON route는 product UI screen으로 정규화하고 `UI-018`은 negative route로 별도 판정합니다. Contract/fixture PASS는 actual 424 UI 실행 또는 Step 26 full-suite eligibility PASS가 아닙니다 |
| V390-REVIEW2-25 no-op action completion oracle | `OPS-169`, `SAFE-202`, exact native 424개와 legacy `UI-108`~`UI-115` | `verify-v390-ui-completion-oracle-contract`, `verify-v390-ui-native-exact-cases-contract`, `verify-v390-ui-automation-runner-contract`, `verify-script-inventory` | click/select/fill/type 같은 trusted action은 before/after DOM digest 변화 또는 action window의 network+DOM, persisted readback, EventRecord, server-log correlation 중 하나가 있어야 completion PASS입니다. 동작 전부터 있던 visible text와 동일 digest, unrelated network/log/readback, action 미실행은 FAIL입니다. Navigation/negative route는 response status+DOM 또는 explicit negative status oracle을 사용합니다. Contract fixture는 actual UI 실행 evidence가 아닙니다 |
| V390-REVIEW3-41 historical exact 424 case-native workflow | `OPS-169`, `SAFE-202`, exact `manualUiCaseId` 424개 | `verify-v390-ui-native-exact-cases`, `verify-v390-ui-native-exact-cases-contract`, `run-v390-ui-native-exact-cases --plan-only`, `verify-script-inventory` | 당시 workflow source claim을 보존합니다. REVIEW4-56이 actionable/form/persisted/read-only/hidden/negative 유형별 input/control/action/state/readback/cleanup을 다시 닫기 전 current readiness가 아닙니다 |
| V390-REVIEW3-42 historical semantic completion oracle | `OPS-169`, `SAFE-202`, exact native 424개/848 action plan | `verify-v390-ui-completion-oracle-contract`, `verify-v390-ui-native-exact-cases-contract`, `verify-v390-ui-native-adapter`, `verify-v390-ui-native-adapter-contract`, `verify-script-inventory` | 당시 request/readback contract를 보존합니다. REVIEW4-58이 실제 primary action과 독립 readback을 다시 결속하기 전 current oracle 완료가 아니며 contract/adapter 단기는 UI PASS가 아닙니다 |
| V390-REVIEW3-43 historical Policy v4 evidence producer | `OPS-169`, `SAFE-202`, exact native 424 case result와 case/suite artifact | `verify-v390-ui-policy-v4-producer-contract`, `verify-v390-ui-native-exact-cases-contract`, `verify-ui-fulltest-evidence-policy-v4-contract`, `verify-script-inventory` | 당시 self-qualified producer source claim은 historical로 보존합니다. Current REVIEW4-60은 raw producer와 독립 qualifier로 대체됐으며 이 historical claim은 current UI PASS가 아닙니다 |
| V390-REVIEW3-44 historical responsive/theme/visual 판정 | `OPS-169`, `SAFE-202`, 320/390/760/1180×light/dark cross-cutting, video/overlay/clipping/contrast/focus | `verify-v390-ui-visual-evidence-contract`, `verify-v390-ui-policy-v4-producer-contract`, `verify-ui-fulltest-evidence-policy-v4-contract`, `verify-script-inventory` | 당시 visual contract를 보존합니다. REVIEW4-59 대표 route와 `/client/live` ready video/overlay/crop/control matrix actual 실행 전 current visual readiness가 아닙니다 |
| V390-REVIEW3-45 historical canonical one-command acceptance | `OPS-168`, `SAFE-201`, `OPS-169`, `SAFE-202`, exact 424 v4 summary | `verify-v390-test-acceptance-bundle-contract`, `verify-v390-full-suite-eligibility-contract`, `verify-v390-final-evidence-integrity-contract`, `verify-script-inventory` | 당시 외부 runtime 입력 bundle contract를 historical source claim으로 보존합니다. Current REVIEW4-62 self-contained environment와 case lifecycle로 대체됐으며 이 행은 actual execution PASS가 아닙니다 |
| V390-REVIEW4-62 self-contained one-command acceptance | `OPS-179`, `SAFE-212`, exact 424 v4 summary | `verify-v390-user-test-launchers-contract`, `verify-v390-test-acceptance-bundle-contract`, `verify-v390-server-longrun-runner-contract`, `verify-v390-final-evidence-integrity-contract`, native UI contracts, `verify-script-inventory` | 네 root launcher가 인자 거부, contract preflight, server OS temp/UI repository-local transient/release canonical output, ephemeral port, direct 120 승인과 conditional release 120을 소유합니다. UI/release는 throwaway HTTP/RTSP server, all-role account/0600 state, Playwright/browser provenance, exact-only memory secret와 cleanup을 소유합니다. Raw `CAPTURED`와 Policy v4 `uiFulltestPass`는 분리되고 bootstrap/producer 실패도 exact ledger를 남기며 final integrity는 canonical report/child evidence hash를 직접 확인합니다. Launcher 15/15·acceptance 17/17·final-integrity 12/12 fixture는 actual PASS가 아닙니다 |
| V390-REVIEW3-46 current HEAD/artifact containment | `OPS-179`, `SAFE-212`, canonical acceptance child summaries/artifact root | `verify-v390-final-evidence-integrity-contract`, `verify-v390-test-acceptance-bundle-contract`, `verify-v390-ui-policy-v4-producer-contract`, `verify-script-inventory` | Final integrity가 실행 시작/종료/current HEAD·branch·source-clean state, canonical command set/hash, child summary와 Policy source/artifact의 approved run-root realpath containment를 독립 검증해야 합니다. Summary 안 형식값과 path 문자열만 신뢰하지 않습니다 |
| V390-REVIEW3-47 historical exact readiness/historical isolation | `OPS-169`, `SAFE-202`, native exact 424 manifest, Policy v4 source binding | `verify-v390-current-ui-evidence-contract`, `verify-v390-ui-automation-coverage-contract`, `verify-ui-fulltest-evidence-policy-v4-contract`, `verify-v390-final-evidence-integrity-contract` | 당시 positive 423+negative route 1/unsupported 0과 executed 0/not-run 424 분리를 기록한 historical source claim입니다. REVIEW4-56 workflow 설계는 닫혔고 57~60 readiness는 대기이며 audit-only historical root 거부 경계는 유지합니다 |
| V390-REVIEW2-26 Policy v4 full-suite eligibility integration | `OPS-169`, `SAFE-202`, canonical exact `manualUiCaseId` 424개 | `verify-v390-full-suite-eligibility-contract`, `verify-v390-test-acceptance-bundle-contract`, `verify-v390-final-evidence-integrity-contract`, `verify-ui-fulltest-evidence-policy-v4` | acceptance와 final integrity는 실행 bundle PASS와 UI full-suite 자격을 분리합니다. Exact 424 qualified case, fail/not-run/unsupported 0, actual Policy v4 `uiFulltestPass=true`가 모두 독립 evidence로 연결된 경우에만 automated/full evidence eligibility를 허용하며 legacy UI-108~115 8-case, plan-only, fixture, policy validator PASS만으로 승격하지 않습니다. 안정화 test mapping이며 실제 UI 풀테스트 실행 자체는 별도 UI 영역입니다 |
| V390-REVIEW2-27 current UI evidence hygiene | `OPS-169`, `SAFE-202`, canonical exact `manualUiCaseId` 424개 | `verify-v390-current-ui-evidence-contract`, `verify-v390-ui-automation-coverage`, `verify-v390-ui-automation-coverage-contract`, `verify-v390-final-evidence-integrity` | tracked placeholder video와 stale/duplicate/source-unbound summary를 historical manifest에 격리합니다. V390-REVIEW3-47 기준 current state는 native positive 423+negative route 1/unsupported 0 readiness와 pass 0/not-run 424 execution을 분리하며 audit-only historical PASS를 current evidence로 재사용하지 않습니다 |
| v3.9.0 R3 / V390-ADD1-06 actual test acceptance bundle | `OPS-179`, `SAFE-212`, `OPS-168`, `SAFE-201`, `OPS-169`, `SAFE-202` | 네 root launcher, launcher/acceptance/longrun contracts, exact/Policy/final integrity lower runner | Historical non-dry mode는 8-case UI/replay였습니다. Current individual launchers는 30분·120분·exact UI를 분리하고 release launcher는 build/feature→30분→exact 424 Policy v4→AGENTS 7.6.2 trigger-only 120분→cleanup/final integrity를 실행합니다. Trigger가 없으면 120은 `not-required`; direct 120 launcher는 호출 승인입니다. 외부 option/runtime/summary 주입은 허용하지 않습니다 |
| v3.9.0 (17) Evidence 13~14 final evidence integrity and independent rerun | `OPS-179`, `SAFE-212`, `OPS-168`, `SAFE-201`, `OPS-169`, `SAFE-202` | `verify-v390-final-evidence-integrity`, `verify-v390-test-acceptance-bundle-contract`, `verify-v390-ui-automation-runner-contract`, `verify-v390-server-longrun-runner-contract`, `verify-script-inventory` | canonical final bundle의 screenshot content dedupe, video placeholder 부재, child/filesystem/port 실측 cleanup, source commit SHA/branch/worktree, 실행 command 전수, first-failure stage/command/context를 검증합니다. 실패 후 재시도는 최초 진단 log hash/tail과 child failure/cleanup을 `first-failure.json`/`.md`에 보존합니다. source `8fe583d8` final은 30분 118/0·soak 22회·UI-108~115 8/8·replay 7/0·integrity 7/0·duplicate/placeholder 0입니다. exact 424개 UI 풀테스트, 조건 미충족 120분, published metadata, release action PASS가 아닙니다 |
| v3.9.0 (17) Development 15 VLM incident-to-rule provenance | `UI-110`, `RULE-112`, `LAB-126`, `SAFE-213`, `OPS-180` | `verify-v390-vlm-incident-rule-provenance`, `verify-v390-vlm-rule-suggestion-draft-bridge`, `verify-vlm-rule-suggestion-draft-workflow`, `verify-rule-ui` | sidecar 후보의 event/observation/source, candidate/kind, provider/model/prompt/privacy 출처를 optional `vlmProvenance`로 `/ops/rules` 수동 draft와 `/lab/analysis/rules/{id}` PUT 저장까지 전달하고 서버가 generated rule ID/save route 일치를 검증합니다. auto-save/apply, provider/runtime call, EventRecord/Event POST/WebRTC/SSE/WS/media contract 변경, UI 풀테스트, 30분/120분 PASS가 아닙니다 |
| v3.9.0 (17) Development 16 / REVIEW4-63 accountable deferred product owner sign-off | `SAFE-214`, `OPS-181` | `verify-v390-deferred-product-owner-signoff`, `verify-v390-deferred-product-owner-source-region-contract`, `verify-v390-truthfulness-status-vocabulary`, `verify-v390-action-execution-deferral-decision`, `verify-v390-backup-recovery-handoff-validation`, `verify-v390-conditional-field-ai-decisions`, `verify-v390-reid-readiness-consistency` | `.github/CODEOWNERS` effective rule의 실제 owner `@dhseo90`와 기능 역할을 분리합니다. Exact 5개는 action execution, persistent credential store, production restore, external VLM provider call, model-backed Re-ID이며 field smoke는 별도 조건부입니다. External VLM/Re-ID UI source evidence는 고유 locator, bounded-region SHA-256, region-local required token으로 결속하고 unrelated UI 변경에는 안정적이며 bounded semantic 변경에는 fail-closed입니다. Production/staging, product/field harness, Re-ID experimental source/supported release 경계를 보존하고 `post-v3.9-unassigned`, scheduled=false dependency를 검증합니다 |
| v3.9.0 (17) / V390-REVIEW2-33~35 Development 17 structure stabilization readiness | `SAFE-215`, `OPS-182` | `verify-v390-structure-stabilization-readiness`, `verify-v390-truthfulness-status-vocabulary`, `verify-v390-structure-stabilization-handoff`, `verify-v390-test-acceptance-bundle-contract` | Historical REVIEW4-51 readiness/decision은 승인 당시 record로 보존합니다. REVIEW4-64 Slice 32 completion graph는 SHA `215ce928...`/최대 mixed owner 10,156, 이후 current generated graph는 최대 10,173이며 둘 다 production 215·C++103·owner10·target2, violation0/SCC0/internal separation true입니다. Completion/current graph를 교환하거나 historical metric을 current 값으로 바꾸면 FAIL하며 REVIEW4-65 actual acceptance는 pending입니다. |
| V390-REVIEW3-48 actual 9-owner dependency graph | `SAFE-215`, `OPS-182`, actual C++ 148개/CMake cpp declared 74·default active 73 | `verify-v390-structure-stabilization-readiness`, `verify-v390-truthfulness-status-vocabulary`, `verify-project-inventory`, `verify-script-inventory` | 9개 declared owner를 actual file에 ordered exact mapping하고 단일 `media_server` target, external link, 32 include direction/witness hash, target 위반 25 direction, legacy core 역의존 3 edge, 8-owner SCC와 6 slice entry/exit binding을 검증합니다. 이 baseline은 target architecture conformant/refactor complete evidence가 아닙니다 |
| V390-REVIEW3-49 superseded historical structure execution scope decision | `SAFE-215`, `OPS-182`, V390-REVIEW3-48 actual graph metrics | `verify-v390-structure-stabilization-readiness`, `verify-v390-truthfulness-status-vocabulary`, `verify-v390-structure-stabilization-handoff` | 당시 v4.0.0 이관 결정을 보존한 historical record입니다. REVIEW4-51이 이를 supersede해 50~63 뒤 current v3.9.0에서 64를 실행하며, 어느 decision도 refactor complete evidence가 아닙니다 |
| V390-REVIEW4-50 current truth reset | `SAFE-218`, `OPS-185`, 통합 순번 1~35 source 판정과 REVIEW4-50 repository snapshot | `verify-v390-review4-truth-reset`, `verify-v390-ui-automation-coverage-contract`, `verify-project-inventory`, `verify-script-inventory` | 통합 순번 1~35를 source 구현 확인 18/부분 13/미완성 4로 고정하고 runtime/UI/long-run PASS와 분리합니다. Discovery source 606은 REVIEW4-50 snapshot이고 HTTP server 42,897줄, product UI script 10,217줄을 보존합니다. REVIEW4-52 이후 exact workflow readiness는 56~60 전 false, actual execution은 false입니다 |
| V390-REVIEW4-51 v3.9 actual refactor scope decision | `SAFE-219`, `OPS-186`, REVIEW4-64 execution approval | `verify-v390-review4-structure-scope-decision`, `verify-v390-structure-stabilization-readiness`, `verify-v390-truthfulness-status-vocabulary`, `verify-script-inventory` | 64번 actual refactor를 v3.9.0 current branch에서 50~63 완료 뒤 실행하도록 승인한 사용자 결정, base commit `027678ba`, branch 비생성 경계, 9 preserved contract와 6 ordered slice를 고정합니다. Decision PASS는 refactor 실행이나 65번 acceptance PASS가 아닙니다 |
| V390-REVIEW4-64 Slice 3 registry/domain execution | `SRC-001`~`SRC-068`, `SAFE-219`, `OPS-186` | `verify-ops-source-registry-api`, `verify-ops-source-lifecycle`, `verify-v390-onvif-source-view-atomicity`, `verify-v390-backup-recovery-handoff-validation`, `verify-v390-review4-structure-stabilization-execution` | Registry read-model auth dependency를 transport-neutral authorizer로 바꾸고 role/scope 의미, write/persistence, crash/restart를 보존합니다. Target 위반 20/SCC 8이며 feature evidence 8,752 drift와 Slice 4~6/65 acceptance는 미완료입니다 |
| V390-REVIEW4-64 Slice 4 UI workspace execution | `UI-102`, `SAFE-189`, `OPS-156`, `SAFE-219`, `OPS-186` | `verify-v390-action-execution-deferral-decision`, `verify-v380-ops-action-control-workspace-ui`, `verify-ops-client-ui`, `verify-v390-ui-native-exact-cases`, `verify-ui-fulltest-evidence-policy-v4-contract`, `verify-v390-review4-structure-stabilization-execution` | Action Execution Deferral HTML/renderer를 focused UI owner로 이동하고 exact bytes, shared CSS SHA, DOM/test-ID/route/read-only 의미를 보존합니다. Static UI 28/0과 exact/Policy contract PASS는 실제 browser 424 실행이 아니며 feature evidence 8,752 drift와 Slice 5~6/65 acceptance는 미완료입니다 |
| V390-REVIEW4-64 Slice 5 VLM parser execution | `RULE-112`, `LAB-126`, `SAFE-213`, `OPS-180`, `SAFE-219`, `OPS-186` | `verify-v390-vlm-incident-rule-provenance`, `verify-v390-vlm-promotion-trust-boundary`, `verify-v390-vlm-evaluation-promotion-guard`, `verify-vlm-profile-storage`, `verify-v390-review4-structure-stabilization-execution` | Generic strict JSON을 core utility로, VLM provenance validator를 application service로 이동하고 duplicate/nested/no-write, record readback, generated ID/PUT route, restart quarantine, profile/promotion 의미를 보존합니다. SAFE-025 evidence binding과 8,752 current evidence drift는 Slice 6 blocker이며 provider/runtime/UI/longrun 실행 PASS가 아닙니다 |
| V390-REVIEW4-52 semantic document/source audit | `SAFE-220`, `OPS-187`, tracked Markdown 176개와 incomplete marker 전수 | `verify-v390-review4-semantic-discovery-ledger`, `verify-v390-review3-discovery-ledger`, `verify-project-inventory`, `verify-script-inventory` | SHA/byte/status marker만으로 review 완료를 판정하지 않습니다. AGENTS 별도, tracked Markdown 176개와 source marker 각각에 exact semantic role, actual owner, current/historical alignment, decision, source-backed evidence anchor를 저장하며 scripts/internal 일괄 분류, 미분류, stale current claim, 상충 수치를 거부합니다 |
| V390-REVIEW4-53 independent 986 semantic source audit | `SAFE-221`, `OPS-188`, feature inventory 986개 | `verify-v390-review4-feature-semantic-source-audit`, `verify-feature-implementation-evidence`, `verify-feature-semantic-closure-contract`, `verify-project-inventory` | 기존 review reason/digest/edge 선언을 입력 근거로 사용하지 않고 실제 source symbol span, dispatch/call reference, state mutation/read-model, verifier readback의 공통 contract token을 독립 추출합니다. File-scope/generic/shared owner, 무관 anchor, source proof 없는 invented edge, same-DOM expected/observed 자기 비교, generator가 locator·edge·reason·approval을 함께 만드는 경로를 거부합니다 |
| V390-REVIEW4-54 Analysis Registry failure atomicity | `SAFE-217`, `OPS-184` | `verify-v390-analysis-registry-durable-write`, `verify-analysis-state` | 신규 target `0640`과 기존 mode exact 보존, same-directory rollback snapshot, durable prepared/committed marker, parent-directory fsync commit point를 사용합니다. 12 mutation의 success 12, 9-stage HTTP 500 이전 상태 108, fault-cleared single retry 108, 4-point crash/restart 48, temp/transaction artifact 0을 actual HTTP/file/restart readback으로 검증합니다. Auth 전용 verifier는 operator secret 부재로 미실행이며 UI 풀테스트, 30분/120분, release action evidence가 아닙니다 |
| V390-REVIEW4-56 exact 424 product workflow design | `OPS-169`, `SAFE-202`, canonical exact `manualUiCaseId` 424개 | `verify-v390-ui-native-exact-cases`, `verify-v390-ui-native-exact-cases-contract`, `run-v390-ui-native-exact-cases --plan-only`, `verify-feature-implementation-evidence`, `verify-script-inventory` | REVIEW4-56 최초 분류 뒤 REVIEW4-58 handler 전수 대조로 RULE-016/073/075를 persisted transaction으로 교정해 current exact 424는 read-only 287/form-submit 15/persisted-mutation 35/actionable 40/hidden-disabled 45/negative-route 2입니다. 실제 input/seed, tracked exact control anchor+file digest 또는 explicit not-applicable proof, exclusive endpoint/local action, independent state/readback와 runtime-required readback step, inverse/no-op cleanup, AUTH cross-route action role을 요구합니다. 일반 div/list/link를 class 이름만으로 disabled 처리하지 않고 literal secret, mixed form status, `body`/route-root, selector-null generic, generic `interact`, `submit:false`, self-compare를 거부합니다. Contract·plan-only 424는 actual browser full-suite, Policy v4 eligibility, 30분/120분 evidence가 아닙니다 |
| V390-REVIEW4-57 canonical requested/observed schema | `OPS-169`, `SAFE-202`, canonical/native exact `manualUiCaseId` 424개 | `verify-v390-ui-native-exact-cases-contract`, `verify-ui-fulltest-evidence-policy-v4-contract`, `verify-v390-ui-policy-v4-producer-contract`, `verify-v390-ui-automation-coverage-contract`, `verify-script-inventory` | Canonical requested(`route/accountRole/viewport/theme/controlAction`)와 runtime observed(`screenRoute/accountRole/viewport/theme/controlAction/provenance`)를 서로 다른 exact typed projection으로 고정합니다. API ownership route를 browser product screen route로 혼용하거나 `role`/observed `route` 별칭, requested control 복사, 누락·추가 field, adapter tool/engine drift가 있으면 거부합니다. 58 completion oracle·59 visual matrix·60 Policy 독립성 및 actual browser 실행 PASS는 별도입니다 |
| V390-REVIEW4-58 primary action completion oracle | `OPS-169`, `SAFE-202`, canonical/native exact `manualUiCaseId` 424개 | `verify-v390-ui-completion-oracle-contract`, `verify-v390-ui-native-exact-cases-contract`, `verify-v390-ui-policy-v4-producer-contract`, `verify-ui-fulltest-evidence-policy-v4-contract`, `verify-script-inventory` | 최초 navigation GET을 primary action 완료로 재사용하지 않고, action ID/correlation ID/exact control selector에 결속한 unique exact request ID·method·concrete path·status 또는 handler별 local postcondition과 별도 fresh runtime DOM/persisted/EventRecord/server-log readback을 함께 요구합니다. V2 raw observation을 evaluator가 판정하며 manifest expected/observed 자기 비교, wrong fixture/selector/request, duplicate request, initial navigation 선택은 FAIL입니다. Contract/plan-only는 actual 424 UI PASS가 아닙니다 |
| V390-REVIEW4-59 representative visual matrix | `OPS-169`, `SAFE-202`, `UI-009`~`UI-017`, `UI-022`, `CLIENT-019`~`CLIENT-021` | `verify-v390-ui-visual-evidence-contract`, `verify-v390-ui-native-adapter-contract`, `verify-v390-ui-policy-v4-producer-contract`, `verify-ui-fulltest-evidence-policy-v4-contract`, `verify-v390-current-ui-evidence-contract` | 독립 plan이 10 route×4 viewport×2 theme=80을 요구합니다. Screenshot pixel 정보량과 실제 product theme/geometry/contrast/focus/overflow를 재계산하고 `/client/live` 모든 8 variant에 동일 tile VA session/answer, live frame progress, contain content rect, placeholder/control containment를 요구합니다. Contract PASS는 actual 80 browser capture나 exact 424 UI, 30분/120분 PASS가 아닙니다 |
| V390-REVIEW4-65 post-action visual owner lifecycle | `OPS-169`, `SAFE-202`, canonical exact `manualUiCaseId` 424개와 latest actual `UI-109` RED | `verify-v390-ui-post-action-visual-owner-contract`, `verify-v390-ui-native-adapter-contract`, `verify-v390-ui-native-diagnostic-trace-replay-contract`, `verify-v390-ui-policy-v4-producer-contract`, `verify-ui-fulltest-evidence-policy-v4-contract`, `verify-script-inventory` | Primary completion mode request/local/navigation `391/28/5`와 document redirect 9, local route transition 2, navigation 5를 canonical-derived census로 고정합니다. Action 후 source가 visible이면 exact source owner를 유지하고 hidden/detached면 같은 navigation epoch의 visible document owner를 사용하며, 선언된 route change는 visible destination owner만 허용합니다. Missing/duplicate/wrong selector·route·epoch/hidden destination은 fail-closed이고 latest `107 PASS / UI-109 FAIL / 316 not-run`은 replay-only RED입니다. Contract/replay는 새 actual browser나 Policy v4 qualification PASS가 아닙니다 |
| V390-REVIEW4-65 request-action ownership scope correction | `OPS-169`, `SAFE-202`, canonical exact `manualUiCaseId` 424개와 latest actual `UI-009` RED | `verify-v390-ui-request-action-ownership-scope-contract`, `verify-v390-ui-exact-oracle-runtime-contract`, `verify-v390-ui-native-adapter-contract`, `verify-v390-ui-native-exact-cases-contract`, `verify-v390-ui-completion-oracle-contract`, `verify-v390-ui-native-diagnostic-trace-replay-contract`, `verify-v390-ui-remaining-actual-trace-replay-contract`, `verify-v390-ui-policy-v4-producer-contract`, `verify-v390-ui-policy-v4-independence-contract`, `verify-v390-test-acceptance-bundle-contract`, `verify-v390-final-evidence-integrity-contract`, `verify-script-inventory` | 최신 SHA-bound actual `424/8/7/1/416`, first failure `UI-009`의 `nested request action ownership is forbidden`을 RED로 보존합니다. Canonical census는 primary request/local/navigation `391/28/5`, independent readback `421`, readback 비대상 negative route `3`입니다. 모든 행은 `bootstrap-settling → source-before-frozen → primary-action → independent-readback → post-action-observation`을 사용하며 같은 action helper는 explicit context를 받고 다른 action은 이전 scope 종료·attestation 뒤 시작합니다. Missing/duplicate/nested/stale/wrong action·case·phase/cleanup은 fail-closed이고 case-ID 예외·nesting·stack·silent auto-close가 없습니다. Contract/replay PASS는 actual browser/`test_ui.sh` 또는 release PASS가 아닙니다 |
| V390-REVIEW4-65 action request/page background ledger separation | `OPS-169`, `SAFE-202`, canonical request completion 391개와 latest actual `UI-010` RED | `verify-v390-ui-action-request-background-ledger-contract`, `verify-v390-ui-request-action-ownership-scope-contract`, `verify-v390-ui-native-adapter-contract`, `verify-v390-ui-exact-oracle-runtime-contract`, `verify-v390-ui-native-exact-cases-contract`, `verify-v390-ui-completion-oracle-contract`, `verify-v390-ui-native-diagnostic-trace-replay-contract`, `verify-v390-ui-remaining-actual-trace-replay-contract`, `verify-v390-ui-policy-v4-producer-contract`, `verify-v390-test-acceptance-bundle-contract`, `verify-v390-final-evidence-integrity-contract`, `verify-script-inventory` | SHA `a470638e...` actual `424/9/8/1/415`에서 declared `GET /ops/dashboard` 자체는 1/1 correlation PASS였지만 동시 refresh 7/7이 primary action/correlation을 상속한 결함을 RED로 보존합니다. 391 census는 GET/POST/PUT/DELETE `268/25/92/6`, literal/template-materialized `281/110`, document-form/exact-api-fetch `11/380`입니다. Route interceptor는 manifest envelope와 explicit initiating request object/sequence만 action-owned로 claim하고 bootstrap/polling/SSE/WS/background refresh는 source owner/phase를 가진 page ledger에 남깁니다. Same endpoint도 first explicit registration/object identity로 분리하며 missing/duplicate/leak/wrong method·path·status·object·phase/cardinality는 fail-closed입니다. EVT-004 inner correlation은 byte-identical preserve하고 actual browser/`test_ui.sh`는 별도입니다 |
| V390-REVIEW4-65 document-form initiating response binding | `OPS-169`, `SAFE-202`, canonical document-form 11개와 latest actual `UI-002` RED | `verify-v390-ui-document-form-response-binding-contract`, `verify-v390-ui-action-request-background-ledger-contract`, `verify-v390-ui-post-action-visual-owner-contract`, `verify-v390-ui-native-adapter-contract`, `verify-v390-ui-native-exact-cases-contract`, `verify-v390-ui-completion-oracle-contract`, `verify-v390-ui-native-diagnostic-trace-replay-contract`, `verify-v390-ui-remaining-actual-trace-replay-contract`, `verify-v390-ui-policy-v4-producer-contract`, `verify-v390-test-acceptance-bundle-contract`, `verify-v390-final-evidence-integrity-contract`, `verify-script-inventory` | SHA `81d3ec3d...` actual `424/2/1/1/422`의 UI-002 `action response cardinality mismatch: 0/1`을 RED로 보존합니다. Canonical 11 census는 POST initiating response 1/1, redirect 9·same-route rejection 2이며 method/path/status/Location/final route를 고정합니다. Envelope는 submit 전에 설치되고 `page.on("request")`에서 exact Playwright Request를 claim하며, `page.on("response")`의 `response.request()` 동일 객체만 primary response로 결속한 뒤 bounded promise barrier가 완료되어야 finalize합니다. Redirect destination GET은 page-owned document-navigation-chain ledger만 소유합니다. Missing/duplicate/reordered/wrong object·status·path·Location·destination/late response와 pending waiter/timer는 fail-closed이며 case-ID 예외, path-only match, sleep/retry/timeout 증가는 없습니다. Actual browser/`test_ui.sh`는 별도입니다 |
| V390-REVIEW4-65 browser callback free-identifier boundary | `OPS-169`, `SAFE-202`, canonical exact 424개와 request branch 391개, latest actual `UI-002` RED | `verify-v390-ui-browser-callback-free-identifier-contract`, `verify-v390-ui-action-request-background-ledger-contract`, `verify-v390-ui-request-action-ownership-scope-contract`, `verify-v390-ui-native-adapter-contract`, `verify-v390-ui-exact-oracle-runtime-contract`, `verify-v390-ui-native-exact-cases-contract`, `verify-v390-ui-completion-oracle-contract`, `verify-v390-ui-native-diagnostic-trace-replay-contract`, `verify-v390-ui-remaining-actual-trace-replay-contract`, `verify-v390-ui-policy-v4-producer-contract`, `verify-v390-ui-policy-v4-independence-contract`, `verify-v390-test-acceptance-bundle-contract`, `verify-v390-final-evidence-integrity-contract`, `verify-script-inventory` | Source `f8f819c0...` actual `424/2/1/1/422`의 UI-002 `assert is not defined`를 immutable SHA-bound RED로 보존합니다. `scripts/internal` 130 callsite/28 file 전수 census와 browser-evaluated callback 14개는 serialized argument/result schema와 Web API만 사용하고 Node-side validation은 callback 밖에서 수행합니다. 격리 VM mock-browser가 source serialization 뒤 모든 callback과 canonical 424/request 391 branch를 실행하며 missing argument, wrong schema/result, `ReferenceError`를 거부합니다. `window.assert`, case-ID 예외, catch-pass가 없고 UI-001 action/page/background ledger와 correlation leak zero를 보존합니다. Actual browser/`test_ui.sh`는 별도입니다 |
| V390-REVIEW4-60 Policy v4 producer/qualifier independence | `OPS-169`, `SAFE-202`, exact `manualUiCaseId` 424개와 80-probe visual plan | `verify-v390-ui-policy-v4-independence-contract`, `verify-v390-ui-policy-v4-producer-contract`, `verify-ui-fulltest-evidence-policy-v4-contract`, `verify-v390-ui-automation-coverage-contract`, `verify-script-inventory` | Producer의 trust/completion/visual/current-source 자기선언을 제거하고 raw v2 ledger만 보존합니다. 별도 qualifier가 exact action/selector/correlation, unique request/response, fresh semantic readback, requested/observed, visual measurement를 재계산하며 56~59 결함 fixture를 거부합니다. Source readiness는 actual exact 424 browser·80-probe capture·30분/120분 PASS가 아닙니다 |
| V390-REVIEW4-64 continuation Slice 2 principal view boundary | `SAFE-219`, `OPS-186`, Auth/UI renderer 경계 | `verify-v390-product-ui-principal-view-boundary`, `verify-auth-bootstrap`, `verify-auth-users`, `verify-auth-routes`, `verify-v390-ops-product-ui-renderer-owner`, `verify-v230-ui-renderer-module-decomposition`, `verify-ops-client-ui`, `verify-v390-review4-structure-stabilization-execution` | Stable-contract DTO가 display/role/scopes/capability만 소유하고 transport adapter가 기존 principal 판정을 보존합니다. HTML 15개 byte baseline, Auth 19/0·72/0·146/0, static UI 28/0, target 위반 20을 확인하지만 exact 424 actual UI·30분·120분·REVIEW4-65 PASS는 아닙니다 |
| V390-REVIEW4-64 continuation Slice 3 source request parser owner | `SAFE-219`, `OPS-186`, source/media parser 경계 | `verify-v390-source-request-parser-owner`, `verify-codecs`, `verify-route-profiles`, `verify-analysis-state`, `verify-v290-final-contract-freeze`, `verify-event-post --mode schema`, `verify-webrtc-va-metadata`, `verify-sse-metadata`, `verify-ws-metadata`, `verify-v390-review4-structure-stabilization-execution` | Shared parser를 ingress transport에서 core utility로 byte-equivalent 이동하고 create/attach/RTSP 세 consumer, route/file-root/source-kind/WHEP/YouTube/error 의미를 고정합니다. Focused 5/0, codec 67/0/3, route 8/0, analysis 181/0, metadata 9/0·8/0·5/0·9/0과 target 위반 19/SCC 6을 확인하지만 external disabled 3건, exact 424 actual UI, 장시간, parked evidence, REVIEW4-65 PASS는 아닙니다 |
| V390-REVIEW4-64 continuation Slice 4 CMake internal target separation | `SAFE-219`, `OPS-186`, build/runtime topology | `verify-v390-cmake-internal-target-separation`, `build`, `verify-server-start-modes`, `verify-codecs`, `verify-route-profiles`, `verify-analysis-state`, `verify-v390-review4-structure-stabilization-execution` | Composition executable 2 source와 runtime STATIC library 77 source(기본 76)를 중복·누락 없이 분리하고 optional source/compile definition/external link를 runtime에 보존합니다. Focused 5/0, build 100%, start 10/0, codec 67/0/3, route 8/0, analysis 181/0과 CMake target 2/internal separation true를 확인하지만 source dependency/SCC/server debt, parked evidence, exact 424 actual UI, 장시간, REVIEW4-65 PASS는 아닙니다 |
| V390-REVIEW4-64 continuation Slice 5 stable contract leaf | `SAFE-219`, `OPS-186`, Event/metadata contract | `verify-v390-stable-contract-leaf-boundary`, `build`, `verify-analysis-state`, `verify-event-post --mode schema`, `verify-webrtc-va-metadata`, `verify-sse-metadata`, `verify-ws-metadata`, `verify-v390-review4-structure-stabilization-execution` | Stable DTO의 stdafx/service 역참조를 제거하고 `AnalysisEvent` 23개 field/order/default를 contract owner에 보존합니다. Focused 5/0, build 100%, analysis 181/0, Event/WebRTC/SSE/WS 9/0·8/0·5/0·9/0과 위반 17/SCC 3을 확인하지만 남은 dependency/server debt, parked evidence, exact 424 actual UI, 장시간, REVIEW4-65 PASS는 아닙니다 |
| V390-REVIEW4-64 continuation Slice 6 analysis query owner | `SAFE-219`, `OPS-186`, rule/profile/overlay query contract | `verify-v390-analysis-query-owner-boundary`, `build`, `verify-analysis-state`, `verify-route-profiles`, `verify-rtsp-va-overlay-policy`, `verify-webrtc-va-metadata`, tracker research, discovery, structure verifier | `analysis_query` header/source를 rollback-equivalent bytes와 `ingress` public namespace 그대로 analysis owner로 이동하고 SessionManager/RTSP/WebRTC exact 세 consumer와 current verifier source path를 결속했습니다. Focused 5/0, build 100%, analysis 181/0, route 8/0, overlay/metadata 6/0·8/0, tracker 12/0·10/0, discovery 7/0, structure 15/0이며 위반 15/SCC 2는 중간 결과입니다. core↔analysis, 40,832줄 server, parked evidence, exact 424/장시간/REVIEW4-65는 미완료입니다 |
| V390-REVIEW4-64 continuation Slice 7 core-media analysis port inversion | `SAFE-219`, `OPS-186`, tap/runtime/media/metadata lifecycle | `verify-v390-core-media-analysis-port-inversion`, build/start/source parser/LAB core/source lifecycle/codec/route/analysis/Event POST/RTSP overlay/WebRTC/SSE/WS/CMake/structure verifier | Core→analysis 10개 witness를 제거하고 attach limit, 통합 media/auxiliary lease, reused ref drain, provider close-and-wait, final-lease-only file cleanup을 결속했습니다. Focused 11/0과 실제 source mutation 24건 rejection, build 100%, start 10/0, LAB/source lifecycle, codec 67/0, route 8/0, analysis 181/0, Event/RTSP/WebRTC/SSE/WS 9/0·6/0·8/0·5/0·9/0을 통과했습니다. production 162/C++ 80, 위반 14/SCC 0은 cycle closure이며 남은 direction/server/evidence 때문에 REVIEW4-64/65 완료는 아닙니다 |
| V390-REVIEW4-64 continuation Slice 8 stable contract owner realignment | `SAFE-219`, `OPS-186`, analysis/media/RTSP byte-stable contracts | `verify-v390-stable-contract-owner-realignment`, `verify-v390-stable-contract-leaf-boundary`, `verify-v390-core-media-analysis-port-inversion`, build/analysis/final-contract/Event POST/RTSP/WebRTC/SSE/WS/structure verifier | Stable owner를 dependency-free presentation leaf 하나로 축소하고 analysis/media/RTSP contract를 실제 owner로 정렬했습니다. Media facade를 추가하되 public bytes/schema는 보존했습니다. Focused 6/0, predecessor 5/0·11/0, build 100%, analysis 181/0, metadata 9/0·6/0·8/0·5/0·9/0이며 production 163/C++ 80, 위반 10/SCC 0입니다. 남은 direction/server/evidence 때문에 REVIEW4-64/65 완료는 아닙니다 |
| V390-REVIEW4-64 continuation Slice 9 public contract/interface owner realignment | `SAFE-219`, `OPS-186`, product UI/ONVIF/Ops/VLM public contracts, strict JSON domain path | `verify-v390-public-contract-interface-owner`, build, stable/analysis predecessor, VLM promotion/profile/provenance, ONVIF/action/S06/UI/freeze/structure verifier | Public presentation/application contract surface를 implementation owner와 분리 분류하고 strict JSON을 domain 경로로 물리 이동했습니다. Focused 6/0과 mutation 7건, build 100%, actual VLM HTTP/reload/no-write를 통과했습니다. Graph 163/C++80, edge20, 위반6/SCC0입니다. 10→6은 physical path 1개와 classifier 정렬의 합이며 broad source dependency 감소 또는 REVIEW4-64/65 완료 evidence가 아닙니다 |
| V390-REVIEW4-64 continuation Slice 10 core-media registry/rule port | `SAFE-219`, `OPS-186`, WebRTC published source/RTSP vaRule 경계 | `verify-v390-core-media-registry-rule-port`, `verify-v390-core-media-analysis-port-inversion`, `verify-v390-public-contract-interface-owner`, build, codec/route/analysis/overlay/WebRTC/freeze/structure verifier | WebRTC registry를 core-media 경로로 물리 이동하고 RTSP vaRule lookup을 injected port로 역전했습니다. Focused 5/0과 조기 return·순서·숨은 edge mutation, build 100%, codec 67/0/3, route 8/0, analysis 181/0, overlay 6/0, WebRTC 8/0을 통과했습니다. Graph 163/C++80, edge19, 위반5/SCC0이며 server/evidence debt 때문에 REVIEW4-64/65 완료 evidence가 아닙니다 |
| V390-REVIEW4-64 continuation Slice 11 split-safe server source bundle | `SAFE-219`, `OPS-186`, verifier/source-owner 결속 | `verify-v390-webrtc-http-server-source-bundle`, 170 consumer syntax, build, public/core/action/Ops/live/VLM/structure verifier | Rollback-bound 170파일/188 direct read를 ordered bundle로 이관하고 single-file SHA/bytes/lines, fixture callback, duplicate/missing/ambiguous fail-closed를 고정했습니다. Focused 6/0과 격리 mutation, syntax 170/0, build 100%, registered regression을 통과했습니다. 비프로덕션 Slice이라 graph 163/C++80, edge19, 위반5/SCC0, server40,840은 불변이며 physical split/evidence/REVIEW4-65를 대체하지 않습니다 |
| V390-REVIEW4-64 continuation Slice 12 physical server split | `SAFE-219`, `OPS-186`, transport mixed-owner line threshold | `verify-v390-webrtc-http-server-physical-split`, `verify-v390-webrtc-http-server-source-bundle`, build, public/core/action/UI/VLM/analysis/codec/route/overlay/metadata/freeze/structure verifier | 40,840줄 monolith를 implementation 5개와 private detail header로 분리하고 type/enum/function/default/constexpr/ODR/CMake target·graph 결속을 변이 검증합니다. Original-line logical bundle로 170 consumer 의미를 보존하고 one-shot generator는 제거했습니다. Focused/bundle 6/0·6/0, build, analysis 181/0을 통과했습니다. Stale listener evidence 폐기 후 fresh current binary에서 authenticated codec 67/0/3, route/VA/RTSP overlay/metadata 8/0·4/0·6/0·8/0을 재확인하고 2.1 MiB run artifact와 listener를 정리했습니다. Graph 168/C++84, edge19, 위반5/SCC0, target2, mixed max10,156이며 남은 위반/evidence/REVIEW4-65는 open입니다 |
| V390-REVIEW4-64 continuation Slice 13 analysis runtime port | `SAFE-219`, analysis/core dependency boundary | `verify-v390-analysis-runtime-port-boundary`, build, core-media/public-owner, analysis-state, ReID readiness/advanced tracking, VA replay/events, freeze, structure | 148개 config/default의 exact manifest와 AppConfig 무-shadow 상속, 모든 config/command/debug delegation, analysis owner의 `app_config::`/utility 직접 의존 0을 변이 검증합니다. 독립 리뷰 P0에서 드러난 transitive `stdafx` false PASS를 dependency-free defaults owner로 수정했습니다. Focused 5/0, build, core/public 11/0·6/0, analysis181, ReID12와 actual HTTP10, replay15, VA event31, freeze10을 통과했습니다. Graph 172/C++85, edge18, 위반4/SCC0이며 남은 transport/evidence/REVIEW4-65는 open입니다 |
| V390-REVIEW4-64 continuation Slice 14 transport runtime config | `SAFE-220`, transport/core-utility boundary | `verify-v390-transport-runtime-config-boundary`, build, source-bundle, physical-split, auth-routes, ReID readiness/advanced tracking, analysis-state, freeze, structure | Dependency-free exact 68-field snapshot, composition 1:1 mapping/DI, debug/stream-key callback, fourteen-field readiness normalization과 direct/transitive/alias/relabel/policy mutation을 검증합니다. Focused5, bundle/physical6/6, Auth146, ReID12/actual10, analysis181, freeze10 통과입니다. Graph 173/C++85, edge17, 위반3/SCC0이며 transport→analysis/core-media/domain과 parked evidence/REVIEW4-65는 open입니다 |
| V390-REVIEW4-64 continuation Slice 15 VLM profile JSON document boundary | `SAFE-023`~`SAFE-025`, transport/domain strict parser 경계 | `verify-v390-strict-json-service-boundary`, `verify-vlm-profile-storage`, `verify-vlm-privacy-transfer-guard`, `verify-vlm-runtime-opt-in-contract`, build, structure | Opaque application-service document가 strict duplicate/nested/trailing/type/null 의미를 보존하고 transport direct `StrictJson*`를 제거합니다. Focused5, profile6, privacy6, build/structure를 통과했으며 graph 175/C++86, edge17, 위반3/SCC0, transport→domain witness3→2입니다. Runtime 제품 4/4 뒤 SAFE-025 parked evidence binding 1건은 final evidence blocker로 남아 REVIEW4-64/65 완료 evidence가 아닙니다 |
| V390-REVIEW4-64 continuation Slice 16 Source/View application boundary | `SRC-001`~`SRC-068`, `MEDIA-025`, `MEDIA-026`, `SAFE-219`, `OPS-186` | `verify-v390-source-view-application-boundary`, `verify-ops-source-registry-api`, `verify-v390-onvif-source-view-atomicity`, `verify-ops-source-lifecycle`, `verify-webrtc-va-metadata --help`, public/transport/bundle/physical/structure gates | Exact Source 16·PublishedView 12필드와 15 operation, success-only output overwrite, null/failure 보존을 compiled fake-domain harness로 확인합니다. WebRTC는 GStreamer 1.28+ close reply, external signaling 직렬화, weak callback/active drain, strong ref를 결속합니다. Non-REPLIED 객체의 process-lifetime quarantine과 이후 restart-required Start 차단은 detached retry/unsafe unref/신규 누적을 금지합니다. MEDIA-026 4×8 accepted ICE/DELETE race와 전체 actual source registry 5회로 SIGABRT·late-callback 경계를 확인합니다. Graph 178/C++87, edge17, 위반3/SCC0, transport→domain witness2→1이며 남은 방향/parked evidence/REVIEW4-65는 open입니다 |
| V390-REVIEW4-64 continuation Slice 17 Appearance readiness application boundary | `LAB-125`, `SAFE-214`, `OPS-181`, `SAFE-219`, `OPS-186` | `verify-v390-appearance-readiness-application-boundary`, `verify-v390-reid-readiness-consistency`, `verify-v390-conditional-field-ai-decisions`, `verify-reid-advanced-tracking`, `verify-analysis-state`, transport/bundle/physical/contract/structure gates | Dependency-free raw 14-input/redacted 14-output DTO, exact lower/trim/min normalization, canonical analysis delegation을 확인합니다. Compiled OpenSSL/ONNX 2개와 actual HTTP 10-case가 application service를 통과하고 raw path/SHA/provenance/embedding/crop 비노출과 session/execution false 경계를 유지합니다. Graph 180/C++88, edge17, 위반3/SCC0, transport→analysis witness18→17이며 방향/parked evidence/REVIEW4-65는 open입니다 |
| V390-REVIEW4-64 continuation Slice 18 Category catalog application boundary | `LAB-001`, `RULE-017` | `verify-v390-category-catalog-application-boundary`, `verify-v390-review4-lab-core-api`, predecessor appearance, analysis/transport/bundle/physical/structure gates | Dependency-free 7-field DTO, canonical 10-entry order, final compact JSON의 7-key order와 UTF-8 SHA를 compiled/actual HTTP 양쪽에서 결속합니다. Transport 10파일 direct analysis 재도입과 graph count/allowed/witness hash mutation을 거부합니다. Graph 182/C++89, edge17, 위반3/SCC0, transport→analysis witness17→16이며 나머지 방향/parked evidence/REVIEW4-65는 open입니다 |
| V390-REVIEW4-64 continuation Slice 19 VLM observation application boundary | `LAB-036`, `LAB-043`, `RULE-048`, `LAB-061`, `LAB-070` | `verify-v390-vlm-observation-application-boundary`, actual LAB/provenance/analysis, sidecar/Ops review/draft/v260 review, predecessor/bundle/physical/structure gates | Dependency-free query/result/summary/rule DTO, canonical default store path, 전필드 mapping과 raw observation/candidate body를 결속합니다. Transport 10파일 direct store 결속은 0입니다. Graph184/C++90, edge17, 위반3/SCC0, transport→analysis16→15이며 parked manifest와 나머지 방향은 open입니다 |
| V390-REVIEW4-64 continuation Slice 20 Incident memory application boundary | `UI-039`, `UI-042`, `UI-045`, `EVT-041`, `LAB-067`, `LAB-069`, `SAFE-045`, `SAFE-048`, `SAFE-052` | `verify-v390-incident-memory-application-boundary`, v250 projection/index/semantic/similar/owner, v260 productization, predecessor/bundle/physical/structure gates | Dependency-free projection/search/hit DTO와 canonical event/audit projection→privacy 차단→forced local fallback index→search/highlight use-case를 결속합니다. Transport 10파일 raw incident-memory 결속은 0입니다. Graph186/C++91, edge17, 위반3/SCC0, transport→analysis15→14이며 parked evidence와 나머지 방향은 open입니다 |
| V390-REVIEW4-64 continuation Slice 21 Event POST application boundary | `SAFE-001`, `EVT-001`, `OPS-170`, `LAB-005`, `MEDIA-001`, `MEDIA-006` | `verify-v390-event-post-application-boundary`, actual `verify-event-post` disabled/schema/queue/recovery, core-port, WebRTC metadata, RTSP overlay, final contract, predecessor/bundle/physical/structure gates | Dependency-free source/event/action/bbox/status DTO, exact dispatcher read-set, status JSON bytes와 Record→Post→Ops alert/metadata order를 결속합니다. Canonical dispatcher bytes는 불변이고 transport raw dispatcher 결속은 0입니다. Graph188/C++92, edge17, 위반3/SCC0, transport→analysis14→13이며 parked evidence와 나머지 방향은 open입니다 |
| V390-REVIEW4-64 continuation Slice 22 image codec application boundary | `LAB-026`, `LAB-027`, `MEDIA-001`, `MEDIA-006` | `verify-v390-image-codec-application-boundary`, `verify-image-analysis`, `verify-v390-review4-lab-core-api`, `verify-redaction`, analysis/final-contract/predecessor/bundle/physical/structure gates | Dependency-free frame/JPEG DTO의 pixel format·metadata·binary byte 양방향 mapping과 decode1/encode4 call을 결속합니다. Path 승인 및 HTTP 응답 policy는 rollback-equivalent입니다. Graph190/C++93, edge17, 위반3/SCC0, transport→analysis13→11이며 parked evidence와 나머지 방향은 open입니다 |
| V390-REVIEW4-64 continuation Slice 23 Analysis Rule domain port boundary | `RULE-001`~`RULE-123`, transport/application/domain port 경계 | `verify-v390-analysis-rule-private-declaration-boundary`, `verify-v390-analysis-registry-durable-write`, analysis/public/source-view/final-contract/image/Event POST/bundle/physical/structure gates | Canonical 네 함수는 domain source에만 정의하고 application callback adapter가 transport backend를 one-time port로 결속합니다. Compiled harness가 incomplete/same/different configure, 선행 bind 충돌 no-change, callback 순서, public/application 양쪽 mapping, null과 기존 exception 전파를 검증하고 실제 transport backend body swap mutation, transport canonical definition, analysis→transport link를 거부합니다. Graph194/C++95, edge16, 위반2/SCC0이며 transport→domain direction은 제거됐고 transport→analysis/core-media 및 parked evidence는 open입니다 |
| V390-REVIEW4-64 continuation Slice 24 Analysis frame application boundary | detector/tracker/close-object/static·live overlay | `verify-v390-analysis-frame-application-boundary`, `verify-image-analysis`, `verify-redaction`, `verify-tracker-stability`, analysis/build/structure gates | Application source가 detector lifecycle, tracker 14필드·kind/class, close-object projection, overlay debug/timing/render를 소유합니다. Transport concrete include/call 3개는 0이고 actual image20/redaction4/tracker3/analysis181을 통과했습니다. Close-object matrix의 기존 default-on 미승격/외부 fixture 부재는 non-gate로 분리했습니다. Graph196/C++96, edge16, 위반2/SCC0, transport→analysis11→8/core-media4 불변이며 전체64/65와 parked evidence는 open입니다 |
| V390-REVIEW4-64 continuation Slice 25 VA metadata application boundary | SSE/WS/WebRTC filter·runtime/present/missing metadata | `verify-v390-va-metadata-application-boundary`, `verify-sse-metadata`, `verify-va-metadata-sidechannel`, `verify-ws-metadata`, `verify-webrtc-va-metadata`, analysis/build/structure gates | Application source가 filter9/sync11/build mapping, canonical schema, runtime 최대16회 events-first byte-budget, WebRTC 고정 옵션과 missing PTS/timestamp/zero sync를 소유합니다. Actual SSE5/side-channel5/WS9/WebRTC8/analysis181을 통과했습니다. Graph198/C++97, edge16, 위반2/SCC0, transport→analysis8→6/core-media4 불변이며 전체64/65와 parked evidence는 open입니다 |
| V390-REVIEW4-64 continuation Slice 26 Analysis query·overlay application boundary | profile/query resolve·overlay request/options/timing/attachment | `verify-v390-analysis-frame-application-boundary`, `verify-v390-analysis-query-owner-boundary`, `verify-v390-core-media-analysis-port-inversion`, `verify-v390-analysis-runtime-port-boundary`, `verify-webrtc-va-metadata`, `verify-rtsp-va-overlay-policy`, analysis/build/bundle/physical/structure gates | Application source가 canonical query/profile과 concrete overlay attachment를 소유하고 empty provider attach fail-closed를 보존합니다. Transport matched→snapshot→missing, Record→Post→metadata 순서를 mutation-oracle로 고정했습니다. Actual WebRTC8/RTSP6/analysis181을 통과했습니다. Graph198/C++97, edge16, 위반2/SCC0, transport→analysis6→4/core-media4 불변이며 전체64/65와 parked evidence는 open입니다 |
| V390-REVIEW4-64 continuation Slice 27 Event Feature Search application boundary | EventRecord/FeatureSet/Evidence/Review index·Search DSL·Ops/Integrator query | `verify-v390-event-feature-search-application-boundary`, `verify-v300-feature-search-index`, `verify-v300-search-dsl-query-convert`, `verify-v310-scoped-integrator-search-api`, analysis/build/bundle/physical/structure gates | Dependency-neutral application service가 canonical rebuild/DSL/query/search/result를 소유합니다. Exact transport wiring과 전체 two-record DTO/ordered feature/evidence matrix, URL/structured query 및 privacy RED mutation 10종을 결속했습니다. Focused6, index7, DSL7, Integrator8, analysis181 PASS입니다. Graph200/C++98, edge16, 위반2/SCC0, transport→analysis4→3/core-media4 불변이며 전체64/65와 parked evidence는 open입니다 |
| V390-REVIEW4-64 continuation Slice 28 Event Storage application boundary | Event record query·snapshot·compaction·compacted-file lifecycle·dispatch | `verify-v390-event-storage-application-boundary`, `verify-ops-event-records-scope`, `verify-v300-event-evidence-contract`, `verify-v310-event-clip-contract`, `verify-v310-scoped-integrator-search-api`, analysis/build 및 closure gates | Dependency-neutral application DTO/service가 canonical query, snapshot, compaction, compacted-file list/resolve/delete/cleanup과 dispatch mapping을 소유합니다. Transport는 query parsing/Auth/HTTP/JSON과 Record→POST→metadata 순서를 유지하고 canonical Stop은 composition root에 둡니다. Default `source_kind`/`route` `*`와 resolve failure overwrite를 compiled RED로 결속해 focused6, evidence9, clip10, Integrator8, analysis181, actual Ops HTTP/compaction/browser, bundle6, physical6, structure15, script11, docs0 PASS입니다. Graph202/C++99, edge16, 위반2/SCC0, transport→analysis3→2/core-media4 불변이며 전체64/65와 parked evidence는 open입니다 |
| V390-REVIEW4-64 continuation Slice 29 Event Rule application boundary | stored rule snapshot·evaluation·keyed/ephemeral runtime lifecycle·result accessors | `verify-v390-event-rule-application-boundary`, build, analysis/SSE/side-channel/WS/WebRTC/RTSP/structure 및 closure gates | Standard-only forward-declared PIMPL application이 canonical snapshot→evaluation, keyed map/mutex와 acquire/release, SSE/WS ephemeral runtime, annotated result/events/counts/metrics/tracking accessors를 소유합니다. Transport flags/JSON/Record→POST→alert·metadata/overlay/detach 5-key 순서는 유지하며 direct engine/runtime/apply/map은 0입니다. 문맥별 friend/public manifest와 omission RED 보강 후 focused6, build100, standalone header, analysis181, SSE5, side-channel5, WS9, WebRTC8, RTSP6, predecessor85, bundle6, physical6, structure15, script11, docs0 PASS입니다. Graph204/C++100, application37/16, edge16, 위반2/SCC0, transport→analysis2→1/core-media4 불변이며 Slice29는 완료됐지만 전체64/65와 parked evidence는 open입니다 |
| V390-REVIEW4-64 continuation Slice 30A Analysis Session read application boundary | Analysis Session snapshot/result/frame/active read DTO·port·adapter·mapping | `verify-v390-analysis-session-read-application-boundary`, build, analysis/SSE/side-channel/WS/WebRTC/RTSP/LAB core/source health/structure/diff/listener gates | Standard-only read port/service, canonical adapter와 internal mapping을 추가해 transport canonical read 71→0을 달성했습니다. 호출은 Snapshot11/Snapshots54/Wait2/LatestFrame1/LatestFrameAndResult1/ActiveTapCount2이고 Event Rule/VA/overlay/JSON/Ops/SSE/WS/WebRTC가 DTO를 소비합니다. Parser/exact binding transient verifier 실패를 수정한 뒤 focused6/0, structure15/0, build100%, analysis181/0, SSE5/0, side-channel5/0, WS9/0, WebRTC8/0, RTSP6/0, LAB core PASS, source health6/0, diff PASS, listener0입니다. Graph208/C++101, application41/C++17, edge17, 위반2/SCC0, transport→analysis1/core-media4, graph SHA `7b589b4df78580e71edbf7e49a5d5953e454a475c50c98a5e1a33db23ebd1f8c`, policy SHA `808cf2395f6d8f8871bc33ae1691d3ed615a5907b23a782bbcacfedd80a315d2`입니다. Attach/Detach/create/provider open은 Slice30B에 남아 64는 진행 중이고 65는 미착수입니다 |
| V390-REVIEW4-64 continuation Slice 30B Analysis Session lifecycle application boundary | Attach/Detach lifecycle DTO·port·canonical adapter·legacy types facade | `verify-v390-analysis-session-lifecycle-application-boundary`, build, analysis/SSE/side-channel/WS/WebRTC/RTSP/Ops lifecycle/LAB core/structure/cleanup/diff/listener gates | Standard lifecycle port와 data-only legacy application types facade가 Attach4/Detach1/helper15를 소유합니다. Request4/attach8/detach5 explicit mapping, `removed=true` exact5 runtime release와 RTSP/read/lifecycle/provider shared canonical identity를 검증합니다. Hidden value-type completeness build 실패는 facade로 수정해 build100%, focused anchor/transitive adapter blocker는 수정 후6/0입니다. Analysis181/SSE5/side5/WS9/WebRTC8/RTSP6, Ops lifecycle/LAB core/structure15 PASS, cleanup/diff PASS/listener0입니다. Graph212/C++102, application45/C++18, edge16, 위반1/SCC0, transport→analysis0/core-media4, graph SHA `dc68a9bacd49888a89f5689eff85fff8a48a3244596a2aafbd765a3e812017e9`, policy SHA `808cf2395f6d8f8871bc33ae1691d3ed615a5907b23a782bbcacfedd80a315d2`입니다. Core-media4가 남아 64는 진행 중이고 65는 미착수입니다 |
| V390-REVIEW4-64 continuation Slice 32 WebRTC media application boundary | WebRTC media deep DTO·opaque egress/source session port·canonical adapter | `verify-v390-webrtc-media-application-boundary`, `verify-v390-review4-structure-stabilization-execution`, source bundle, physical split, build, analysis-state 및 predecessor/runtime follow-up gates | Standard-only deep DTO와 opaque session port, canonical adapter가 SessionManager·WebRTC egress/source session·source registry 결속을 transport 밖으로 옮깁니다. Transport→core-media 4→0, application→core-media4, graph215/C++103, 위반0/SCC0, SHA `215ce9282593945dc820171348eabc2f06814ce2be4b2abe1dbd632919dd820a`입니다. Focused8/8, predecessor40/40, structure15/15, bundle6/6, physical6/6, build100%, analysis181/181, ICE8/8, codec67/67(외부3 제외), SSE5/5, side5/5, WS9/9, WebRTC metadata8/8, RTSP6/6, Ops lifecycle/source health와 LAB core PASS입니다. 최종 semantic review의 verifier false-PASS P1 1건은 exact mapping과 paired-swap·descriptor omission RED로 수정했습니다. Auth-off codec의 Bash 3.2 empty-array nounset 후속을 수정·RED 결속했고 cleanup 파일30개/32,763바이트 및 listener0을 확인했습니다. Slice32/64 구조 개발 완료 evidence이며 parked evidence를 확정하는 65 독립 acceptance PASS는 아닙니다 |
| V390-REVIEW4-61 duration·120분·cleanup 실측 | `OPS-168`, `OPS-179`, `SAFE-201`, `SAFE-212` | measurement/longrun/launcher/acceptance/final integrity contracts | Longrun v2가 monotonic duration/exact iteration과 runner-owned ephemeral port를 결속합니다. AGENTS 7.6.2 classifier는 media path, source worker, shared stream, metadata fanout, cleanup/port lifecycle 및 upstream signal을 분리하고 release auto-run은 trigger가 있을 때만 선택합니다. Unit/fixture PASS는 실제 30분/120분/UI evidence가 아닙니다 |
| v3.9.0 (17) Development 18 external field smoke no-device closure | `SAFE-216`, `OPS-183` | `verify-v390-external-field-smoke-no-device-closure`, `verify-v390-truthfulness-status-vocabulary`, `verify-v390-conditional-field-ai-decisions`, `verify-v380-field-connector-evidence-package` | TURN/WHEP, ONVIF 실기기, 외부 VLM/provider가 환경 부재로 `conditional-not-run`이며 external network/endpoint/credential/device/provider 접촉과 artifact 생성이 없고 field/release PASS를 주장하지 않음을 검증합니다 |
| v3.9.0 R4 longrun runner role alignment | `OPS-168`, `SAFE-201` | `verify-v390-longrun-runner-role-alignment`, `verify-runtime-media-longrun-trigger-matrix`, `verify-longrun-separation`, `verify-rc-release-gate`, `verify-v390-server-longrun-runner-contract` | `verify-predev`를 legacy/compatibility runner로 보존하고 `verify-v390-server-longrun`을 release-grade first-fail runner로 채택합니다. Runtime/media trigger matrix row의 30분/120분 server longrun trigger는 `verify-v390-server-longrun --duration-minutes 30/120`을 가리키며, R1 30분 runner actual final과 historical `verify-predev` evidence를 서로 대체하지 않습니다 |
| v3.9.0 R5 / V390-ADD1-07~09 UI automation report replay guard | `OPS-169`, `SAFE-202`, `UI-108`, `UI-109`, `UI-110`, `UI-111`, `UI-112`, `UI-113`, `UI-114`, `UI-115` | `verify-v390-ui-automation-report`, `verify-v390-ui-automation-report-replay-guard`, `verify-v390-ui-automation-runner-contract`, `verify-script-inventory` | v3 replay는 exact 8개 ID/route, trusted interaction executed, visible target, exact-selector assertion pass/visibility/source boundary, failure evidence, artifact files, console 허용 사유, first-fail 이후 `not-run`을 검증합니다. R5에서는 `artifactPreservationReason`을 누락 artifact 대체 evidence로 인정하지 않으며 replay PASS는 UI 풀테스트 직접 조작 PASS가 아닙니다 |
| v3.9.0 (10) AI-minimized UI automation adapter 기준 | `OPS-169`, `SAFE-202` | `verify-v390-evidence-test-gate-prep`, `verify-ui-fulltest-one-shot`, `verify-manual-ui-evidence`, `verify-script-inventory` | 무료 UI automation adapter 후보와 failure report 필드 기준을 문서/test-source로 고정합니다. Playwright/Selenium/SikuliX 후보 검토 기준이며 실제 UI 풀테스트 직접 조작 PASS가 아닙니다 |
| v3.9.0 (11) ONVIF credential/provider status summary | `UI-108`, `SRC-065`, `SAFE-203`, `OPS-170` | `verify-v390-onvif-credential-provider-status`, `verify-ops-client-ui` | `/ops/api/onvif/credential-provider-status`와 `/ops/sources`가 primary provider `none`, fallback `in-memory-fixture`, persistent/external secret store defer, secret/reference value 비노출 상태를 Ops-only read-only summary로 표시합니다. ONVIF 실기기 credential success, persistent secret store, source/view write, UI 풀테스트 직접 조작, 30분/120분, field smoke PASS가 아닙니다 |
| v3.9.0 (12) / V390-ADD1-05 + V390-REVIEW4-55 ONVIF source/view paired save | `UI-109`, `SRC-066`, `SAFE-204`, `OPS-171` | `verify-v390-onvif-source-view-atomicity`, `verify-v390-onvif-live-import-persist-decision`, `verify-ops-client-ui` | import draft `notSaved:true`와 one-shot=false는 유지하고, 명시적 operator save만 `/ops/api/onvif/channels/{channelId}`에서 양쪽 선검증·single lock·durable prepared/committed marker·private rollback snapshot으로 처리합니다. actual HTTP/file 19개 case가 first/second failure와 4 crash point의 bytes/existence/mode exact recovery, restart/retry, transaction artifact 0을 확인합니다. ONVIF 실기기, UI 풀테스트 직접 조작, 30분/120분, field smoke PASS가 아닙니다 |
| v3.9.0 (13) VLM rule suggestion draft bridge | `UI-110`, `RULE-111`, `SAFE-205`, `OPS-172` | `verify-v390-vlm-rule-suggestion-draft-bridge`, `verify-vlm-rule-suggestion-draft-workflow`, `verify-rule-ui` | `/ops/api/vlm/rule-suggestion-draft-bridge`와 `/ops/rules`가 incident review provenance를 기존 VLM rule suggestion draft-only/manual-save workflow로 연결합니다. rule/profile registry write, auto-apply, runtime/provider call, client/viewer exposure, EventRecord/Event POST/WebRTC/SSE/WS/media schema 변경, UI 풀테스트 직접 조작, 30분/120분 PASS가 아닙니다 |
| v3.9.0 (14) / V390-ADD1-03 VLM evaluation promotion trust boundary | `UI-111`, `LAB-123`, `SAFE-206`, `OPS-173` | `verify-v390-vlm-promotion-trust-boundary`, `verify-v390-vlm-evaluation-promotion-guard`, `verify-vlm-evaluation-result-workflow`, `verify-vlm-profile-storage` | `/ops/api/vlm/evaluation-results`와 `/ops/api/vlm/profiles`가 동일한 서버 소유 catalog revision/digest를 사용합니다. 클라이언트는 candidate reference만 제출하고 서버가 status/result/provenance를 생성하며 option/model/prompt binding과 active 조건을 검증합니다. runtime/provider/sidecar 호출, client/viewer 노출, EventRecord/Event POST/WebRTC/SSE/WS/media schema 변경, UI 풀테스트 직접 조작, 30분/120분 PASS가 아닙니다 |
| V390-REVIEW3-39 VLM structural profile quarantine | `UI-111`, `LAB-038`, `LAB-051`, `SAFE-206`, `OPS-173` | `verify-v390-vlm-promotion-trust-boundary`, `verify-v390-vlm-evaluation-promotion-guard`, `verify-vlm-profile-storage`, `verify-vlm-privacy-transfer-guard`, `verify-vlm-runtime-opt-in-contract` | Save와 reload가 strict structural JSON 및 canonical VLM profile envelope validator를 공유합니다. 모든 object scope decoded duplicate key, malformed/trailing JSON, nested top-level shadow를 거부하고 exact schema/ID, provider/model/runtime/privacy, privacyGuard, activation, runtimeContract side effects, invariants, forbidden key를 재검증합니다. 기존 14 HTTP+structural save 7+reload quarantine 13이며 runtime/provider call이나 schema/media 변경은 없습니다 |
| V390-REVIEW3-39 VLM incident provenance reload canonicalization | `UI-110`, `RULE-112`, `LAB-126`, `SAFE-213`, `OPS-180` | `verify-v390-vlm-incident-rule-provenance`, `verify-v390-vlm-rule-suggestion-draft-bridge`, `verify-vlm-rule-suggestion-draft-workflow`, `verify-rule-ui` | Rule PUT의 top-level optional `vlmProvenance`를 strict parse하고 active/archive EventRecord와 VLM observation sidecar의 actual record에 대조합니다. Forged·duplicate·nested-only·stale·deleted provenance는 persist 전 no-write로 거부하며 restart도 server record를 재조회해 invalid persisted rule을 quarantine합니다. Auto-save/apply, provider/runtime call, event/media/API schema 변경은 없습니다 |
| V390-REVIEW3-40 delegated exact phase ledger | `OPS-168`, `SAFE-201` | `verify-v390-server-longrun-runner-contract`, `verify-v390-server-longrun`, `verify-predev` | Parent runner가 delegated predev summary의 fixed start/smoke/runtime ID, 각 soak iteration의 5-case exact order, global uniqueness, summary count/status와 누락·중복·순서·unknown ID를 검증합니다. Contract fixture는 실제 30분/120분 duration evidence가 아닙니다 |
| V390-REVIEW2-30 ONVIF byte-exact transaction rollback | `UI-109`, `SRC-066`, `SAFE-204`, `OPS-171` | `verify-v390-onvif-source-view-atomicity`, `verify-v390-onvif-live-import-persist-decision`, `verify-onvif-live-import-contract` | Paired save 전에 source/view 파일의 존재·raw bytes·mode를 캡처하고 source/view write failure에서 교체된 대상만 atomic snapshot restore합니다. Unknown extension/whitespace, create/update, source-only/view-only, first/second replace failure와 rollback failure를 분리 검증하며 API/schema/media 경계는 유지합니다 |
| v3.9.0 (15) backup/recovery handoff validation | `UI-112`, `SRC-067`, `SAFE-207`, `OPS-174` | `verify-v390-backup-recovery-handoff-validation`, `verify-v340-staging-restore-validation-harness`, `verify-v330-ops-backup-recovery-source-handoff` | `/ops/api/source-registry/staging-restore-validation-handoff`와 `/ops/sources`가 source registry, PublishedView, source health, viewer scope staging restore checklist/result artifact contract를 표시합니다. production restore cutover, SourceRegistry/PublishedView write, automatic recovery, client exposure, UI 풀테스트 직접 조작, 30분/120분 PASS가 아닙니다 |
| v3.9.0 (16) action execution deferral decision | `UI-113`, `EVT-087`, `SAFE-208`, `OPS-175` | `verify-v390-action-execution-deferral-decision`, `verify-v380-ops-action-control-workspace-ui`, `verify-v380-default-off-action-explanation` | `/ops/api/actions/execution-deferral-decision`와 `/ops` Action Control Workspace가 `defer-all-action-writes`, source recheck/client notice/rule apply deferred, approval-gated execution disabled를 표시합니다. action execution, source recheck, client notice send, rule apply, request/approval/readiness/outcome/receipt persist, external delivery, UI 풀테스트 직접 조작, 30분/120분 PASS가 아닙니다 |
| v3.9.0 (17) field evidence bridge | `UI-114`, `SRC-068`, `MEDIA-027`, `LAB-124`, `SAFE-209`, `OPS-176` | `verify-v390-conditional-field-ai-decisions`, `verify-v380-field-connector-evidence-package`, `verify-v350-field-evidence-intake` | `/ops/api/field-evidence/bridge-decision`와 `/ops` dashboard가 external endpoint/credential/provider field evidence를 approval-only minimal evidence bridge로 분리합니다. field smoke, endpoint/credential probe, provider call, source/view/EventRecord/Ops audit write, raw endpoint/credential/provider material, media/schema 변경, UI 풀테스트 직접 조작, 30분/120분 PASS가 아닙니다 |
| v3.9.0 (18) / V390-ADD1-04 / V390-REVIEW2-32 Re-ID readiness consistency | `UI-115`, `LAB-125`, `SAFE-210`, `OPS-177` | `verify-v390-reid-readiness-consistency`, `verify-v390-conditional-field-ai-decisions`, `verify-reid-advanced-tracking`, `verify-analysis-state` | `/ops/api/analysis/reid-assist-decision`와 extractor factory가 `InspectAppearanceModelReadiness`를 공유하여 regular file, SHA 형식·읽기·일치, trim provenance, OpenSSL·ONNX Runtime을 판정합니다. NoOp fallback은 `Enabled=false`, stats disabled, request/queued/completed/drop 0이며 TrackStateManager의 Enabled guard가 worker start, crop build, async enqueue를 차단합니다. Ops UI는 preflight와 session load/execution을 분리하고 raw path/SHA/provenance를 노출하지 않습니다. 실제 model session 성공, identity search, UI 풀테스트 직접 조작, 30분/120분 PASS가 아닙니다 |
| v3.9.0 (19) structure stabilization handoff 상세계획 | `SAFE-211`, `OPS-178` | `verify-v390-structure-stabilization-handoff` | `V390-STRUCT-001`~`V390-STRUCT-005`를 behavior-preserving 구조 안정화 계획으로 이관합니다. 실제 route/API/UI extraction 구현, manual UI archive split 구현, VLM contract index 구현, UI 풀테스트 직접 조작, 30분/120분, published metadata, release action PASS가 아닙니다 |
| v3.9.0 (20) stabilization and release readiness | `SAFE-212`, `OPS-179` | `verify-v390-stabilization-release-readiness`, `verify-release-metadata`, `verify-release-evidence-index`, `verify-release-closeout-helper --dry-run` | AGENTS 네 테스트 영역 판정, local stabilization companion gate, release close-out dry-run, evidence/not-run boundary를 정리합니다. UI 풀테스트 직접 조작, 30분/120분 longrun 실행, published metadata, PR/main/tag/GitHub Release, field smoke PASS가 아닙니다 |
| v3.9.0 (21) / V390-REVIEW3-38 Analysis Registry crash durability | `SAFE-217`, `OPS-184` | `verify-v390-analysis-registry-durable-write`, `verify-analysis-state`, `verify-auth-routes` | profile/rule/VA rule/VLM profile create·update·delete가 기존 mode를 보존한 same-directory temp를 file fsync/close하고 rename 뒤 parent directory fsync까지 완료해야 성공합니다. 12개 정상 성공, 12 mutation×9 fault 108개와 12×3 crash/restart 36개가 pre-rename no-change, post-rename candidate consistency, stale-temp recovery, mode `0640`, temp 0을 actual HTTP로 확인합니다. UI 풀테스트, 30분/120분, published metadata, release action PASS가 아닙니다 |

## v3.8.0 Operator-Gated Action Pilot & Outcome Loop Coverage Mapping

이 절은 현재 active target의 계획/구현 단계 연결만 남깁니다. 아래 행은 실행 evidence가
아니며, 기능 구현 전에는 실제 기능 ID, route/control/action, verifier command를
추가해야 합니다. 신규 기능 ID가 예약되어 있어도 안정화/UI 테스트를 PASS로 보고하지
않습니다.

| Roadmap scope | Feature IDs | 대표 안정화 verifier | release evidence boundary |
| --- | --- | --- | --- |
| v3.8.0 (1) v3.8.0 baseline 정렬 | `OPS-147`, `SAFE-180` | `verify-v380-entry-baseline`, `verify-release-metadata`, `verify-docs-links`, `verify-docs-ui-assets` | source `3.8.0`, latest published `v3.8.0`, current roadmap `v3.8.0 Operator-Gated Action Pilot & Outcome Loop` 정렬 기준. v3.8 기능 구현, UI 풀테스트, 30분/120분, GitHub Release publish evidence와는 별도 gate입니다 |
| v3.8.0 (2) Ops Action Route Boundary | `LAB-111`, `SAFE-181`, `OPS-148` | `verify-v380-ops-action-route-boundary`, `verify-project-inventory`, `verify-feature-inventory-coverage`, `verify-script-inventory` | `/ops/api/actions/route-boundary` read-only route boundary와 v3.8 action namespace 분리 기준. action execution, action request persist, approval/readiness execution, source recheck, notice send, rule/source/view/runbook/EventRecord/Ops audit write, UI 풀테스트, 30분/120분, GitHub Release publish evidence와는 별도 gate입니다 |
| v3.8.0 (3) Action Capability Contract | `LAB-112`, `SAFE-182`, `OPS-149` | `verify-v380-action-capability-contract`, `verify-project-inventory`, `verify-feature-inventory-coverage`, `verify-script-inventory` | `/ops/api/actions/capability-contract` read-only capability contract와 허용/금지 action catalog, role/scope, idempotency, immutable schema boundary 기준. action execution, action request persist, approval/readiness execution, source recheck, notice send, rule/source/view/runbook/EventRecord/Ops audit write, UI 풀테스트, 30분/120분, GitHub Release publish evidence와는 별도 gate입니다 |
| v3.8.0 (4) Action Request Ledger Contract | `LAB-113`, `SAFE-183`, `OPS-150` | `verify-v380-action-request-ledger-contract`, `verify-project-inventory`, `verify-feature-inventory-coverage`, `verify-script-inventory` | `/ops/api/actions/request-ledger` read-only action request ledger contract와 actionRequestId/siteId/runbookId/requestedBy/status/createdAt/idempotencyKey, append-only/read-only policy 기준. request write, action execution, action request persist, approval/readiness execution, source recheck, notice send, rule/source/view/runbook/EventRecord/Ops audit write, UI 풀테스트, 30분/120분, GitHub Release publish evidence와는 별도 gate입니다 |
| v3.8.0 (5) Approval Decision Gate | `LAB-114`, `SAFE-184`, `OPS-151` | `verify-v380-approval-decision-gate`, `verify-project-inventory`, `verify-feature-inventory-coverage`, `verify-script-inventory` | `/ops/api/actions/approval-decision-gate` read-only approval decision gate와 approve/hold/reject/field-needed, reviewer, reason, auditRef, stale decision guard 기준. decision write, action execution, action request persist, approval/readiness execution, source recheck, notice send, rule/source/view/runbook/EventRecord/Ops audit write, UI 풀테스트, 30분/120분, GitHub Release publish evidence와는 별도 gate입니다 |
| v3.8.0 (6) Action Readiness Preflight | `LAB-115`, `SAFE-185`, `OPS-152` | `verify-v380-action-readiness-preflight`, `verify-project-inventory`, `verify-feature-inventory-coverage`, `verify-script-inventory` | `/ops/api/actions/readiness-preflight` read-only readiness preflight contract와 capability/approval/field evidence/source health/client impact/duplicate request blocker, readiness state 기준. readiness execution/result persist, action execution, action request persist, approval persist, source recheck, notice send, rule/source/view/runbook/EventRecord/Ops audit write, UI 풀테스트, 30분/120분, GitHub Release publish evidence와는 별도 gate입니다 |
| v3.8.0 (7) Source Recheck Action Pilot | `LAB-116`, `SAFE-186`, `OPS-153` | `verify-v380-source-recheck-action-pilot`, `verify-project-inventory`, `verify-feature-inventory-coverage`, `verify-script-inventory` | `/ops/api/actions/source-recheck-pilot` read-only source recheck action pilot contract와 source health recheck request, dry execution result envelope, readiness refs, pilot blocker state 기준. source recheck execution, source health write, action result persist, request/approval/readiness persist, notice send, rule/source/view/runbook/EventRecord/Ops audit write, UI 풀테스트, 30분/120분, GitHub Release publish evidence와는 별도 gate입니다 |
| v3.8.0 (8) Client Notice Draft Queue | `LAB-117`, `SAFE-187`, `OPS-154` | `verify-v380-client-notice-draft-queue`, `verify-project-inventory`, `verify-feature-inventory-coverage`, `verify-script-inventory` | `/ops/api/actions/client-notice-draft-queue` read-only client notice draft queue contract와 viewer-safe notice draft, queue preview, delivery blocker, redaction boundary, readiness/pilot refs 기준. client notice delivery, notice draft persist, notice queue write, operator-only blocker client exposure, source/rule/view/runbook/EventRecord/Ops audit write, UI 풀테스트, 30분/120분, GitHub Release publish evidence와는 별도 gate입니다 |
| v3.8.0 (9) Rule Draft Action Package | `LAB-118`, `SAFE-188`, `OPS-155` | `verify-v380-rule-draft-action-package`, `verify-project-inventory`, `verify-feature-inventory-coverage`, `verify-script-inventory` | `/ops/api/actions/rule-draft-package` read-only rule draft action package contract와 rule threshold/scenario 후보, draft package, review checklist, apply blocker, readiness/notice refs 기준. rule/scenario apply, rule draft persist, rule/profile registry write, source/view/runbook/EventRecord/Ops audit write, UI 풀테스트, 30분/120분, GitHub Release publish evidence와는 별도 gate입니다 |
| v3.8.0 (10) Ops Action Control Workspace UI | `UI-102`, `SAFE-189`, `OPS-156` | `verify-v380-ops-action-control-workspace-ui`, `verify-ops-client-ui`, `verify-project-inventory`, `verify-feature-inventory-coverage`, `verify-script-inventory` | `/ops` action control workspace UI와 기존 `/ops/api/actions/*` read-only contracts를 request/approval/readiness/pilot/receipt 흐름으로 연결하는 기준. action execution, action request persist, approval/readiness persist, source recheck, notice send, rule apply, client/media/schema mutation, UI 풀테스트 직접 조작, 30분/120분, GitHub Release publish evidence와는 별도 gate입니다 |
| v3.8.0 (11) Client-safe Action Notice Preview | `UI-103`, `CLIENT-040`, `SAFE-190`, `OPS-157` | `verify-v380-client-safe-action-notice-preview`, `verify-ops-client-ui`, `verify-project-inventory`, `verify-feature-inventory-coverage`, `verify-script-inventory` | `/client/api/views/{id}/events`와 client dashboard/events/live dock의 viewer-safe action notice preview 기준. maintenance/degraded/recovering/available status와 timeline만 노출하며 internal blocker, approval/readiness detail, source locator, credential, raw diagnostic, Ops-only action material, client notice send/persist/queue write, action execution, source recheck, rule apply, media/event schema mutation, UI 풀테스트 직접 조작, 30분/120분, GitHub Release publish evidence와는 별도 gate입니다 |
| v3.8.0 (12) Outcome Observer and Reconciliation | `UI-104`, `EVT-084`, `CLIENT-041`, `LAB-119`, `SAFE-191`, `OPS-158` | `verify-v380-outcome-observer-reconciliation`, `verify-ops-client-ui`, `verify-project-inventory`, `verify-feature-inventory-coverage`, `verify-script-inventory` | `/ops/api/actions/outcome-reconciliation`와 `/ops` action control workspace가 readiness/candidate/observed outcome ref를 source/EventRecord/client/rule diff로 비교하는 기준. action execution, source recheck execution, client notice send/queue write, rule apply, EventRecord/source/view/Ops audit write, viewer client payload/schema/media mutation, UI 풀테스트 직접 조작, 30분/120분, GitHub Release publish evidence와는 별도 gate입니다 |
| v3.8.0 (13) Action Receipt Bundle | `UI-105`, `EVT-085`, `CLIENT-042`, `LAB-120`, `SAFE-192`, `OPS-159` | `verify-v380-action-receipt-bundle`, `verify-ops-client-ui`, `verify-project-inventory`, `verify-feature-inventory-coverage`, `verify-script-inventory` | `/ops/api/actions/receipt-bundle`와 `/ops` action control workspace가 approval/request/readiness/candidate/outcome diff를 redacted release-safe receipt bundle과 handoff map으로 조합하는 기준. artifact/file/handoff write, action execution, source recheck execution, client notice send/queue write, rule apply, EventRecord/source/view/Ops audit write, viewer client payload/schema/media mutation, raw locator/credential/raw diagnostic inclusion, UI 풀테스트 직접 조작, 30분/120분, GitHub Release publish evidence와는 별도 gate입니다 |
| v3.8.0 (14) Field Connector Evidence Package | `UI-106`, `SRC-063`, `MEDIA-026`, `LAB-121`, `SAFE-193`, `OPS-160` | `verify-v380-field-connector-evidence-package`, `verify-ops-client-ui`, `verify-project-inventory`, `verify-feature-inventory-coverage`, `verify-script-inventory` | `/ops/api/actions/field-connector-evidence-package`와 `/ops` action control workspace가 ONVIF, external WHEP/TURN, cloud provider 조건을 credential/endpoint 승인 기반 field evidence package로 분리하는 기준. field smoke, endpoint/credential probe, provider/cloud call, ONVIF 실기기 contact, WHEP/TURN credential 사용, action execution, source/view/EventRecord/Ops audit write, viewer client payload/schema/media mutation, raw endpoint/locator/credential/provider/debug material inclusion, UI 풀테스트 직접 조작, 30분/120분, GitHub Release publish evidence와는 별도 gate입니다 |
| v3.8.0 (15) Default-off Action Explanation | `UI-107`, `SRC-064`, `EVT-086`, `LAB-122`, `SAFE-194`, `OPS-161` | `verify-v380-default-off-action-explanation`, `verify-ops-client-ui`, `verify-project-inventory`, `verify-feature-inventory-coverage`, `verify-script-inventory` | `/ops/api/actions/default-off-explanation`와 `/ops` action control workspace가 approval blocker, readiness reason, outcome hint를 default-off VLM/runtime explanation hint로 요약하는 기준. VLM/provider/runtime call, raw prompt/provider response, credential/locator/debug material, action execution, source/view/EventRecord/Ops audit write, viewer client payload/schema/media mutation, UI 풀테스트 직접 조작, 30분/120분, GitHub Release publish evidence와는 별도 gate입니다 |
| v3.8.0 (16) Stabilization and Release Readiness | `SAFE-195`, `OPS-162` | `verify-v380-stabilization-release-readiness`, `verify-release-metadata`, `verify-release-evidence-index`, `verify-release-closeout-helper --dry-run` | v3.8 Step 1~15 local gates, release policy/evidence index/test records, docs links/assets, feature/script inventory, close-out dry-run, `git diff --check`를 같은 local readiness gate로 묶음. UI 풀테스트 직접 조작, 30분/120분, published metadata, PR/main/tag/GitHub Release, field smoke 실행 PASS를 대체하지 않음 |

## previous published baseline v3.7.0 Site-Aware Operations and Safe Runbook Control Plane Coverage Mapping

이 절은 최신 published baseline의 기능 ID 연결입니다. 아래 행은 실행 evidence가
아니며, 후속 v3.8 기능 완료 근거로 승격하지 않습니다.

| Roadmap scope | Feature IDs | 대표 안정화 verifier | release evidence boundary |
| --- | --- | --- | --- |
| v3.7.0 (1) v3.7.0 baseline 정렬 | `OPS-129`, `SAFE-162` | `verify-v370-entry-baseline`, `verify-release-metadata`, `verify-docs-links`, `verify-docs-ui-assets` | source `3.7.0`, latest published `v3.7.0`, current roadmap `v3.7.0 Site-Aware Operations and Safe Runbook Control Plane` 정렬 기준. v3.7 기능 구현, UI 풀테스트, 30분/120분, GitHub Release publish evidence와는 별도 gate입니다 |
| v3.7.0 (2) Site / Source Group Contract | `SRC-054`, `SAFE-163`, `OPS-130` | `verify-v370-site-source-group-contract` | `/ops/api/site-operations/source-group-contract`가 site, sourceGroup, zone, viewGroup read model과 no-auto-write boundary를 정의합니다. SourceRegistry/PublishedView write, viewer/client 노출, EventRecord/Event POST/WebRTC/SSE/WS/media schema 변경, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.7.0 (3) Site-Aware Source Registry Projection | `SRC-055`, `SAFE-164`, `OPS-131` | `verify-v370-site-aware-source-registry-projection` | `/ops/api/site-operations/source-registry-projection`이 기존 SourceRegistry/PublishedView snapshot을 site/source group 관점의 Ops-only projection으로 노출합니다. source/view write, raw locator/credential 노출, viewer/client 노출, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.7.0 (4) Site Health Rollup | `SRC-056`, `SAFE-165`, `OPS-132` | `verify-v370-site-health-rollup` | `/ops/api/site-operations/health-rollup`이 source health를 site/group 단위 offline/degraded/recovering/field-needed 상태로 집계합니다. source health persistence, automatic recovery, field smoke, source/view write, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.7.0 (5) Site Impact Graph | `SRC-057`, `EVT-080`, `CLIENT-035`, `SAFE-166`, `OPS-133` | `verify-v370-site-impact-graph` | `/ops/api/site-operations/impact-graph`가 EventRecord, source health, PublishedView, client impact를 site/source group graph로 연결합니다. source/view/EventRecord/Ops audit/client/media mutation, viewer/client 노출, raw locator/credential/debug material, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.7.0 (6) Site Simulation Input Pack | `SRC-058`, `EVT-081`, `LAB-101`, `SAFE-167`, `OPS-134` | `verify-v370-site-simulation-input-pack` | `/ops/api/site-operations/simulation-input-pack`이 v3.6 simulation input/result envelope와 v3.7 site projection/impact graph를 site/source group 단위 read-only input pack으로 확장합니다. simulation input persist/run/result persist, source/view/rule/EventRecord/Ops audit/client/media mutation, viewer/client 노출, raw locator/credential material, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.7.0 (7) Cross-Site Safe Apply Readiness | `SRC-059`, `CLIENT-036`, `LAB-102`, `SAFE-168`, `OPS-135` | `verify-v370-cross-site-safe-apply-readiness` | `/ops/api/site-operations/cross-site-safe-apply-readiness`가 v3.6 safe apply readiness와 v3.7 site simulation input pack을 연결해 affected clients, blocker, approval-needed, field-needed 상태를 산출합니다. automatic/safe apply, field smoke, client notice send, source/view/rule/EventRecord/Ops audit/client/media mutation, viewer/client 노출, raw locator/credential material, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.7.0 (8) Runbook Template Contract | `LAB-103`, `SAFE-169`, `OPS-136` | `verify-v370-runbook-template-contract` | `/ops/api/site-operations/runbook-template-contract`가 source recheck, maintenance, rule draft, client notice 후보를 반복 가능한 read-only runbook template contract로 정의합니다. runbook instance persist, approval ticket write, source/view/rule/EventRecord/Ops audit/client/media mutation, client notice send, field smoke, viewer/client 노출, raw locator/credential material, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.7.0 (9) Runbook Instance Ledger | `LAB-104`, `SAFE-170`, `OPS-137` | `verify-v370-runbook-instance-ledger` | `/ops/api/site-operations/runbook-instance-ledger`가 runbookId, siteId, status, operator note, previous run comparison을 append-only/read-only ledger projection으로 누적합니다. runbook instance persist, operator note write, approval ticket write, result diff persist, source/view/rule/EventRecord/Ops audit/client/media mutation, viewer/client 노출, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.7.0 (10) Approval Ticket Workflow | `LAB-105`, `SAFE-171`, `OPS-138` | `verify-v370-approval-ticket-workflow` | `/ops/api/site-operations/approval-ticket-workflow`가 approval, hold, reject, field-needed 상태와 reviewer/reason/audit link를 read-only workflow projection으로 관리합니다. approval ticket write, reviewer assignment write, approval decision persist, runbook instance persist, operator note write, source/view/rule/EventRecord/Ops audit/client/media mutation, viewer/client 노출, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.7.0 (11) Site Operations Workspace UI | `UI-095`, `SAFE-172`, `OPS-139` | `verify-v370-site-operations-workspace-ui`, `verify-ops-client-ui` | `/ops` dashboard가 `media-server.ops.v370-site-operations-workspace-ui.v1` 기반 site list, health rollup, runbook queue, impact detail을 read-only로 표시합니다. source/view/runbook/approval write, client notice send, raw locator/credential/debug material, viewer/client 노출, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.7.0 (12) Client Notice by Site/View Group | `UI-096`, `CLIENT-037`, `SAFE-173`, `OPS-140` | `verify-v370-client-notice-by-site-view-group`, `verify-ops-client-ui` | `/ops/api/site-operations/client-notice-by-site-view-group`와 `/ops` dashboard가 site/view group 기준 viewer-safe notice preview와 delivery queue를 preview-only로 표시합니다. client notice send/persist, viewer client payload 변경, source/view/rule/EventRecord/Ops audit/client/media mutation, raw locator/credential/operator material 노출, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.7.0 (13) Rule/VA What-if by Site | `UI-097`, `RULE-110`, `EVT-082`, `LAB-106`, `SAFE-174`, `OPS-141` | `verify-v370-rule-va-what-if-by-site`, `verify-ops-client-ui` | `/ops/api/site-operations/rule-va-what-if-by-site`와 `/ops` dashboard가 site 영향과 EventRecord/VA fixture 기반 rule threshold/scenario 후보를 rule apply 없이 비교합니다. rule/profile registry write, EventRecord/Ops audit/source/view/client/media mutation, raw locator/credential/debug material 노출, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.7.0 (14) Field Evidence Attachment | `UI-098`, `SRC-060`, `MEDIA-025`, `LAB-107`, `SAFE-175`, `OPS-142` | `verify-v370-field-evidence-attachment`, `verify-ops-client-ui` | `/ops/api/site-operations/field-evidence-attachment`와 `/ops` dashboard가 ONVIF, external WHEP/TURN, cloud/VLM 조건부 evidence를 site/runbook에 not-run/conditional로 첨부합니다. field smoke, endpoint/credential probe, provider/VLM call, runbook/approval write, source/view/EventRecord/Ops audit/client/media mutation, raw endpoint/locator/credential/provider material 노출, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.7.0 (15) Limited Safe Execution Pilot | `UI-099`, `SRC-061`, `CLIENT-038`, `LAB-108`, `SAFE-176`, `OPS-143` | `verify-v370-limited-safe-execution-pilot`, `verify-ops-client-ui` | `/ops/api/site-operations/limited-safe-execution-pilot`와 `/ops` dashboard가 가장 낮은 위험의 source recheck 또는 notice queue action 후보만 approval-gated execution preview로 분리합니다. source recheck 실행, notice queue write/send, runbook/approval write, source/view/EventRecord/Ops audit/client/media mutation, raw locator/credential/operator material 노출, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.7.0 (16) Outcome Reconciliation | `UI-100`, `SRC-062`, `EVT-083`, `CLIENT-039`, `LAB-109`, `SAFE-177`, `OPS-144` | `verify-v370-outcome-reconciliation`, `verify-ops-client-ui` | `/ops/api/site-operations/outcome-reconciliation`와 `/ops` dashboard가 pre-simulation ref와 post-execution not-run ref를 source/event/client impact diff로 비교합니다. pilot execution, source recheck 실행, notice queue write/send, source/view/EventRecord/Ops audit/client/media mutation, raw locator/credential/operator material 노출, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.7.0 (17) Export / Handoff Bundle | `UI-101`, `LAB-110`, `SAFE-178`, `OPS-145` | `verify-v370-export-handoff-bundle`, `verify-ops-client-ui` | `/ops/api/site-operations/export-handoff-bundle`와 `/ops` dashboard가 site/runbook/evidence/approval/outcome refs를 redacted release-safe handoff bundle로 조합합니다. artifact export/file write/handoff write, pilot/source recheck/notice queue write/send, source/view/runbook/approval/EventRecord/Ops audit/client/media mutation, raw locator/endpoint/credential/provider/diagnostic/client raw material 노출, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.7.0 (18) Stabilization and Release Readiness | `SAFE-179`, `OPS-146` | `verify-v370-stabilization-release-readiness`, `verify-release-metadata`, `verify-release-evidence-index`, `verify-release-closeout-helper --dry-run` | v3.7 Step 1~17 local gates, release policy/evidence index/test records, docs links/assets, feature/script inventory, close-out dry-run, `git diff --check`를 같은 local readiness gate로 묶음. UI 풀테스트 직접 조작, 30분/120분, published metadata, PR/main/tag/GitHub Release, field smoke 실행 PASS를 대체하지 않음 |

## 직전 published baseline v3.6.0 Operations Simulation and Safe Apply Readiness Coverage Mapping

이 절은 직전 published baseline의 기능 ID 연결입니다. 아래 행은 실행 evidence가
아니며, 기능 구현 전에는 실제 기능 ID, route/control/action, verifier command를
추가해야 합니다. 신규 기능 ID가 예약되어 있어도 안정화/UI 테스트를 PASS로 보고하지
않습니다.

| Roadmap scope | Feature IDs | 대표 안정화 verifier | release evidence boundary |
| --- | --- | --- | --- |
| v3.6.0 (1) v3.6.0 baseline 정렬 | `OPS-115`, `SAFE-148` | `verify-v360-entry-baseline`, `verify-release-metadata`, `verify-docs-links`, `verify-docs-ui-assets` | source `3.6.0`, latest published `v3.6.0`, current roadmap `v3.6.0 Operations Simulation and Safe Apply Readiness` 정렬 기준. v3.6 기능 구현, UI 풀테스트, 30분/120분, GitHub Release publish evidence와는 별도 gate입니다 |
| v3.6.0 (2) Simulation Input Contract | `SRC-049`, `EVT-077`, `SAFE-149`, `OPS-116` | `verify-v360-simulation-input-contract` | `/ops/api/live-operations/simulation/input-pack`가 EventRecord, SourceRegistry, PublishedView, command plan, staged plan을 read-only simulation input pack으로 묶습니다. source/view/rule/EventRecord/Ops audit/client/media mutation, simulation execution, UI 풀테스트, 30분/120분, published metadata evidence가 아님 |
| v3.6.0 (3) Operations Simulation Run Contract | `LAB-095`, `SAFE-150`, `OPS-117` | `verify-v360-operations-simulation-run-contract` | `/ops/api/live-operations/simulation/run-contract`가 simulation route family, run schema, result envelope, not-run 상태를 정의합니다. simulation run persist/execute, result persist, source/view/rule/EventRecord/Ops audit/client/media mutation, UI 풀테스트, 30분/120분, published metadata evidence가 아님 |
| v3.6.0 (4) Command Plan Dry-run Simulator | `SRC-050`, `RULE-107`, `SAFE-151`, `OPS-118` | `verify-v360-command-plan-dry-run-simulator` | `/ops/api/live-operations/simulation/command-plan-dry-run`이 source recheck, recovery, maintenance, client notice, rule follow-up 후보를 실제 write 없이 dry-run 결과로 계산합니다. command execution, source/view/rule/EventRecord/Ops audit/client/media mutation, UI 풀테스트, 30분/120분, published metadata evidence가 아님 |
| v3.6.0 (5) Source/Rule Impact Diff | `SRC-051`, `RULE-108`, `CLIENT-033`, `SAFE-152`, `OPS-119` | `verify-v360-source-rule-impact-diff` | `/ops/api/live-operations/simulation/impact-diff`가 source/view/rule 변경 전후의 source health, event risk, client 영향 차이를 read-only diff로 표시합니다. source/rule apply, client notice send, source/view/rule/EventRecord/Ops audit/client/media mutation, UI 풀테스트, 30분/120분, published metadata evidence가 아님 |
| v3.6.0 (6) Safe Apply Readiness Gate | `SAFE-153`, `OPS-120` | `verify-v360-safe-apply-readiness-gate` | `/ops/api/live-operations/simulation/safe-apply-readiness`가 ready, blocked, approval-needed, field-needed, not-run 상태와 blocker를 산출합니다. automatic apply, safe apply, client notice, field smoke, source/view/rule/EventRecord/Ops audit/client/media mutation, UI 풀테스트, 30분/120분, published metadata evidence가 아님 |
| v3.6.0 (7) Ops Simulation Workspace UI | `UI-088`, `SAFE-154`, `OPS-121` | `verify-v360-ops-simulation-workspace-ui`, `verify-ops-client-ui` | `/ops` dashboard가 simulation input, run, impact diff, readiness blocker를 read-only command workspace 화면으로 표시합니다. source URL/raw locator/raw JSON/debug/credential material, command execution, source/view/rule/EventRecord/Ops audit/client/media mutation, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.6.0 (8) Simulation Run Ledger and Comparison | `UI-089`, `LAB-096`, `SAFE-155`, `OPS-122` | `verify-v360-simulation-run-ledger-comparison`, `verify-ops-client-ui` | `/ops/api/live-operations/simulation/run-ledger`와 `/ops` simulation workspace가 simulation run id, 입력 ref, 결과 diff, operator note, 이전 run 대비 변화를 append-only/read-only projection으로 누적 표시합니다. simulation run persist/execute, operator note write, client notice 발송, source/view/rule/EventRecord/Ops audit/client/media mutation, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.6.0 (9) Client Notice Preview | `UI-090`, `CLIENT-034`, `SAFE-156`, `OPS-123` | `verify-v360-client-notice-preview`, `verify-ops-client-ui` | `/ops/api/live-operations/simulation/client-notice-preview`와 `/ops` simulation workspace가 실제 발송 없이 viewer-safe maintenance/degraded/recovering notice preview를 표시합니다. client notice send/persist, viewer client payload 변경, source/view/rule/EventRecord/Ops audit/client/media mutation, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.6.0 (10) Rule/VA What-if Replay Pack | `UI-091`, `RULE-109`, `EVT-078`, `LAB-097`, `SAFE-157`, `OPS-124` | `verify-v360-rule-va-what-if-replay-pack`, `verify-ops-client-ui` | `/ops/api/live-operations/simulation/rule-va-what-if-replay-pack`와 `/ops` simulation workspace가 EventRecord/VA fixture 기반 rule threshold, preset, scenario 후보의 what-if 결과를 비교합니다. rule apply, EventRecord write, Event POST/schema/media/client mutation, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.6.0 (11) Simulation Export Bundle | `UI-092`, `LAB-098`, `SAFE-158`, `OPS-125` | `verify-v360-simulation-export-bundle`, `verify-ops-client-ui` | `/ops/api/live-operations/simulation/export-bundle`와 `/ops` simulation workspace가 simulation input/output, blocker, handoff map을 redacted release-safe export bundle로 조합합니다. artifact export/file write/handoff write, simulation run persist/execute, source/view/rule/EventRecord/Ops audit/client/media mutation, raw locator/credential/provider/client viewer material 노출, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.6.0 (12) Field Evidence Simulation Adapter | `UI-093`, `SRC-052`, `MEDIA-024`, `LAB-099`, `SAFE-159`, `OPS-126` | `verify-v360-field-evidence-simulation-adapter`, `verify-ops-client-ui` | `/ops/api/live-operations/simulation/field-evidence-adapter`와 `/ops` simulation workspace가 ONVIF, external WHEP/TURN, cloud/VLM provider 조건을 field 실행 없이 조건부/not-run evidence로 simulation에 연결합니다. field smoke/endpoint probe/credential probe/provider call, source/view/EventRecord/Ops audit/client/media mutation, raw endpoint/credential/provider/VLM/client material 노출, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.6.0 (13) VLM-assisted Simulation Explanation | `UI-094`, `SRC-053`, `EVT-079`, `LAB-100`, `SAFE-160`, `OPS-127` | `verify-v360-vlm-assisted-simulation-explanation`, `verify-ops-client-ui` | `/ops/api/live-operations/simulation/vlm-assisted-explanation`와 `/ops` simulation workspace가 default-off VLM 보조 설명으로 blocker, impact diff, operator review hint를 요약합니다. provider/runtime call은 opt-in 전 미수행이며 raw prompt/provider response/credential material, simulation run, field smoke, source/view/EventRecord/Ops audit/client/media mutation, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.6.0 (14) Stabilization and Release Readiness | `SAFE-161`, `OPS-128` | `verify-v360-stabilization-release-readiness`, `verify-release-metadata`, `verify-release-evidence-index`, `verify-release-closeout-helper --dry-run` | v3.6 Step 1~13 local gates, release policy/evidence index/test records, docs links/assets, feature/script inventory, close-out dry-run, `git diff --check`를 같은 local readiness gate로 묶음. UI 풀테스트 직접 조작, 30분/120분, published metadata, PR/main/tag/GitHub Release, field smoke 실행 PASS를 대체하지 않음 |

## historical published baseline v3.5.0 Live Operations Control Plane Coverage Mapping

이 절은 historical published baseline의 기능 ID 연결입니다. 아래 행은 실행 evidence가
아니며, 기능 구현 전에는 실제 기능 ID, route/control/action, verifier command를
추가해야 합니다. 신규 기능 ID가 예약되어 있어도 안정화/UI 테스트를 PASS로 보고하지
않습니다.

| Roadmap scope | Feature IDs | 대표 안정화 verifier | release evidence boundary |
| --- | --- | --- | --- |
| v3.5.0 (1) v3.5.0 baseline 정렬 | `OPS-102`, `SAFE-135` | `verify-v350-entry-baseline`, `verify-release-metadata`, `verify-docs-links`, `verify-docs-ui-assets` | source `3.5.0`, latest published `v3.4.0`, current roadmap `v3.5.0 Live Operations Control Plane` 정렬 기준. v3.5 기능 구현, UI 풀테스트, 30분/120분, GitHub Release publish evidence와는 별도 gate입니다 |
| v3.5.0 (2) Live Operations Graph Contract | `SRC-044`, `EVT-074`, `CLIENT-030`, `SAFE-136`, `OPS-103` | `verify-v350-live-operations-graph-contract` | `/ops/api/live-operations/graph`가 EventRecord, SourceRegistry, PublishedView, source health, continuity drill, client impact를 Ops-only graph read model로 연결합니다. source locator/credential/raw diagnostic JSON/media path 노출, source registry/PublishedView/EventRecord/Ops audit/command write, viewer/client exposure, UI 풀테스트, 30분/120분, published metadata evidence가 아님 |
| v3.5.0 (3) Operations Command Plan Contract | `SRC-045`, `RULE-105`, `SAFE-137`, `OPS-104` | `verify-v350-operations-command-plan-contract` | `/ops/api/live-operations/command-plan`이 source recheck, recovery, maintenance, client notice, rule follow-up 후보를 draft-only command plan으로 정의합니다. source/view/rule/client/EventRecord/Ops audit/media mutation, actual execution, UI 풀테스트, 30분/120분, published metadata evidence가 아님 |
| v3.5.0 (4) Incident-to-Command Handoff | `UI-080`, `EVT-075`, `SAFE-138`, `OPS-105` | `verify-v350-incident-to-command-handoff`, `verify-ops-client-ui` | `/ops/api/events/reviews`와 `/ops/events`가 source 원인, continuity drill 후보, command plan 초안 selected detail handoff를 read-only로 표시합니다. staged change apply, source/view/rule/EventRecord/Ops audit/client/media mutation, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.5.0 (5) Staged Change Plan and Impact Preview | `SRC-046`, `RULE-106`, `LAB-092`, `SAFE-139`, `OPS-106` | `verify-v350-staged-change-plan-impact-preview` | `/ops/api/live-operations/staged-change-plan-impact-preview`가 source/view/rule follow-up 변경 후보를 before-apply impact preview와 blocker로 표시합니다. source/view/rule write, client notice 발송, command execution, UI 풀테스트, 30분/120분, published metadata evidence가 아님 |
| v3.5.0 (6) Ops Command Workspace UI | `UI-081`, `SAFE-140`, `OPS-107` | `verify-v350-ops-command-workspace-ui`, `verify-ops-client-ui` | `/ops` dashboard가 incident, source, continuity drill, staged plan, client impact를 한 command workspace 흐름으로 read-only 표시합니다. command execution, source/view/rule/EventRecord/Ops audit/client/media mutation, source URL/raw locator/raw JSON/debug/credential material 노출, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.5.0 (7) Drill Run Ledger and Plan Comparison | `UI-082`, `SAFE-141`, `OPS-108` | `verify-v350-drill-run-ledger-plan-comparison`, `verify-ops-client-ui` | `/ops/api/live-operations/drill-run-ledger`와 `/ops` dashboard가 drill run id, operator note, blocker, evidence refs, 이전 run 대비 차이를 append-only/read-only projection으로 누적 표시합니다. drill run write/operator note write/command execution, source/view/rule/EventRecord/Ops audit/client/media mutation, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.5.0 (8) Client Impact Forecast | `UI-083`, `CLIENT-031`, `SAFE-142`, `OPS-109` | `verify-v350-client-impact-forecast`, `verify-ops-client-ui` | `/client/api/views/{id}/events`와 client live/dashboard/events가 source/view/command plan이 client live/dashboard/event digest에 주는 영향을 `clientImpactForecast` viewer-safe summary로 표시합니다. source URL/raw locator/raw JSON/debug/credential/operator material, command plan detail 노출, command execution, 30분/120분, published metadata evidence가 아님 |
| v3.5.0 (9) Client-safe Operations Notice | `UI-084`, `CLIENT-032`, `SAFE-143`, `OPS-110` | `verify-v350-client-safe-operations-notice`, `verify-ops-client-ui` | `/client/api/views/{id}/events`와 client live/dashboard/events가 `clientOperationsNotice`로 maintenance/degraded/recovering/available 상태와 timeline hint만 표시합니다. source URL/raw locator/raw JSON/debug/credential/operator material, command plan detail, incident detail 노출, command execution, 30분/120분, published metadata evidence가 아님 |
| v3.5.0 (10) Operations Export Bundle and Handoff Map | `UI-085`, `SAFE-144`, `OPS-111` | `verify-v350-operations-export-bundle-handoff-map`, `verify-ops-client-ui` | `/ops/api/live-operations/export-bundle-handoff-map`와 `/ops` dashboard가 command plan, drill ledger, field evidence, client impact forecast refs를 release-safe export bundle과 handoff map으로 조합합니다. artifact export/write/field smoke/provider call/command execution, source/view/EventRecord/Ops audit/client/media mutation, raw locator/credential/provider/VLM/client viewer material 노출, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.5.0 (11) Field Evidence Intake | `UI-086`, `SRC-047`, `MEDIA-023`, `LAB-093`, `SAFE-145`, `OPS-112` | `verify-v350-field-evidence-intake`, `verify-ops-client-ui` | `/ops/api/live-operations/field-evidence-intake`와 `/ops` dashboard가 ONVIF, external WHEP/TURN, cloud/VLM provider 결과를 redacted field evidence와 execution conditions/not-run 상태로 분리합니다. field smoke/provider call/endpoint probe/credential probe, source/view/EventRecord/Ops audit/client/media mutation, raw endpoint/credential/provider/VLM/client material 노출, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.5.0 (12) VLM-assisted Ops Explanation | `UI-087`, `SRC-048`, `EVT-076`, `LAB-094`, `SAFE-146`, `OPS-113` | `verify-v350-vlm-assisted-ops-explanation`, `verify-ops-client-ui` | `/ops/api/live-operations/vlm-assisted-explanation`와 `/ops` dashboard가 default-off VLM 보조 설명으로 command plan blocker, incident/source relation, operator review hint를 요약합니다. VLM/provider/runtime call, raw prompt/provider response/credential material, command execution, operator review write, source/view/EventRecord/Ops audit/client/media mutation, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.5.0 (13) Stabilization and Release Readiness | `SAFE-147`, `OPS-114` | `verify-v350-stabilization-release-readiness`, `verify-release-metadata`, `verify-release-evidence-index`, `verify-release-closeout-helper --dry-run` | v3.5 Step 1~12 local gates, release policy/evidence index/test records, docs links/assets, feature/script inventory, close-out dry-run, `git diff --check`를 같은 local readiness gate로 묶음. UI 풀테스트 직접 조작, 30분/120분, published metadata, PR/main/tag/GitHub Release, field smoke 실행 PASS를 대체하지 않음 |

## 직전 published baseline v3.4.0 Operations Continuity Drill Workspace Coverage Mapping

이 절은 직전 published baseline의 기능 ID 연결입니다. 아래 행은 실행 evidence가
아니며, v3.5.0 완료 근거 또는 UI 풀테스트/30분/120분 PASS로 대체하지 않습니다.

| Roadmap scope | Feature IDs | 대표 안정화 verifier | release evidence boundary |
| --- | --- | --- | --- |
| v3.4.0 (1) v3.4.0 baseline 정렬 | `OPS-091`, `SAFE-124` | `verify-v340-entry-baseline`, `verify-release-metadata`, `verify-docs-links`, `verify-docs-ui-assets` | source `3.4.0`, latest published `v3.4.0`, current roadmap `v3.4.0 Operations Continuity Drill Workspace` 정렬 기준. v3.4 기능 구현, UI 풀테스트, 30분/120분, GitHub Release publish evidence와는 별도 gate입니다 |
| v3.4.0 (2) Continuity Drill Contract | `SAFE-125`, `OPS-092` | `verify-v340-continuity-drill-contract` | `/ops/api/source-registry/continuity-drill/contract`가 recovery drill schema와 v3.3 handoff 입력을 Ops-only read-only contract로 노출하는지 확인합니다. source registry write, PublishedView write, EventRecord write, Ops audit write, secret/client exposure, media path/schema 변경, Recovery Candidate Package, Staging Restore Validation Harness, UI 풀테스트, 30분/120분, published metadata evidence가 아님 |
| v3.4.0 (3) Recovery Candidate Package Read Model | `SRC-041`, `EVT-073`, `SAFE-126`, `OPS-093` | `verify-v340-recovery-candidate-package` | `/ops/api/source-registry/recovery-candidate-package`가 SourceRegistry snapshot, PublishedView, source health, EventRecord/audit context를 redacted recovery candidate package로 조합하는지 확인합니다. source locator/credential/raw audit body/media path/client material 노출, production restore, write path, UI 풀테스트, 30분/120분, published metadata evidence가 아님 |
| v3.4.0 (4) Staging Restore Validation Harness | `LAB-090`, `SAFE-127`, `OPS-094` | `verify-v340-staging-restore-validation-harness` | temporary staging runtime에서 JSON parse, duplicate sourceId, missing sourceId reference, auth store `0600`, checksum, viewer scope를 production write 없이 검증합니다. source health replay/diff, Ops UI, approval-gated checklist, UI 풀테스트, 30분/120분, published metadata evidence가 아님 |
| v3.4.0 (5) Source Health Replay and Drift Diff | `SRC-042`, `SAFE-128`, `OPS-095` | `verify-v340-source-health-replay-drift-diff` | `/ops/api/source-registry/source-health-replay-drift-diff`가 handoff source health와 fresh source health를 비교해 stale/offline/reconnect/warning drift를 요약합니다. source registry write, PublishedView write, Ops audit write, source health persistence, automatic recovery, Ops UI, client digest, evidence export, field smoke, 30분/120분, published metadata evidence가 아님 |
| v3.4.0 (6) Ops Continuity Drill Workspace UI | `UI-075`, `SAFE-129`, `OPS-096` | `verify-v340-ops-continuity-drill-workspace-ui`, `verify-ops-client-ui` | `/ops/sources`가 drill package, validation status, blocked/ready 상태, source health drift를 read-only로 표시합니다. source URL/raw locator/raw JSON/debug/credential material 노출, source registry write, PublishedView write, Ops audit write, automatic recovery, approval-gated checklist, client digest, evidence export, field smoke, 30분/120분, published metadata evidence가 아님 |
| v3.4.0 (7) Approval-Gated Recovery Checklist and Audit | `UI-076`, `SAFE-130`, `OPS-097` | `verify-v340-approval-gated-recovery-checklist-audit`, `verify-ops-client-ui` | `/ops/sources`가 operator note, ready/blocked/field-smoke-needed/not-run 상태, dry-run result, Ops audit 연결을 read-only checklist로 표시합니다. automatic recovery, source registry write, PublishedView write, Ops audit write, source URL/raw locator/raw JSON/debug/credential material 노출, client digest, evidence export, field bridge, 30분/120분, published metadata evidence가 아님 |
| v3.4.0 (8) Client-safe Maintenance Digest | `UI-077`, `CLIENT-029`, `SAFE-131`, `OPS-098` | `verify-v340-client-safe-maintenance-digest`, `verify-ops-client-ui` | `/client/api/views/{id}/events`와 client live/dashboard/events가 maintenance/recovering/unavailable viewer-safe digest만 표시합니다. source URL/raw locator/raw JSON/debug/credential material, operator note/Ops audit/dry-run/recovery action 노출, source registry write, PublishedView write, EventRecord/Event POST/API/schema/media 변경, evidence export, field bridge, 30분/120분, published metadata evidence가 아님 |
| v3.4.0 (9) Drill Evidence Export and Cleanup Manifest | `UI-078`, `SAFE-132`, `OPS-099` | `verify-v340-drill-evidence-export-cleanup-manifest`, `verify-ops-client-ui` | `/ops/api/source-registry/drill-evidence-export-cleanup-manifest`와 `/ops/sources`가 redacted drill artifact manifest, minimum retained evidence, /tmp cleanup manifest, sensitive material scan boundary를 read-only로 표시합니다. cleanupExecutionPerformed=false, artifact export 실행, source URL/raw locator/raw JSON/debug/credential material/raw audit body 노출, field bridge, 30분/120분, published metadata evidence가 아님 |
| v3.4.0 (10) Field Bridge Condition Gates | `UI-079`, `SRC-043`, `MEDIA-022`, `LAB-091`, `SAFE-133`, `OPS-100` | `verify-v340-field-bridge-condition-gates`, `verify-ops-client-ui` | `/ops/api/source-registry/field-bridge-condition-gates`와 `/ops/sources`가 ONVIF 실기기, external WHEP/TURN, real cloud/VLM provider를 endpoint/credential/approval 조건부 field smoke로 분리합니다. source-only PASS는 field bridge PASS로 대체하지 않고 fieldSmokeExecuted=false, endpoint probe/provider call/media path 변경, source URL/raw locator/raw JSON/debug/credential/provider material 노출, 30분/120분, published metadata evidence가 아님 |
| v3.4.0 (11) Stabilization and Release Readiness | `SAFE-134`, `OPS-101` | `verify-v340-stabilization-release-readiness`, `verify-release-metadata`, `verify-release-evidence-index`, `verify-release-closeout-helper --dry-run` | v3.4 Step 1~10 local gates, release policy/evidence index/test records, docs links/assets, feature/script inventory, close-out dry-run, `git diff --check`를 같은 local readiness gate로 묶습니다. UI 풀테스트 직접 조작, 30분/120분, published metadata, PR/main/tag/GitHub Release, field smoke 실행 PASS를 대체하지 않음 |

## v3.3.0 Live Source Reliability Workspace Coverage Mapping

이 절은 현재 active target의 계획 단계 연결만 남깁니다. 아래 행은 실행 evidence가
아니며, 기능 구현 전에는 실제 기능 ID, route/control/action, verifier command를
추가해야 합니다. 신규 기능 ID가 예약되어 있어도 안정화/UI 테스트를 PASS로 보고하지
않습니다.

| Roadmap scope | Feature IDs | 대표 안정화 verifier | release evidence boundary |
| --- | --- | --- | --- |
| v3.3.0 (1) v3.3.0 roadmap/source baseline 정렬 | `OPS-080`, `SAFE-113` | `verify-v330-entry-baseline`, `verify-release-metadata`, `verify-docs-links`, `verify-docs-ui-assets` | source `3.3.0`, latest published `v3.3.0`, current roadmap `v3.3.0 Live Source Reliability Workspace` 정렬 기준. v3.3 기능 구현, UI 풀테스트, 30분/120분, GitHub Release publish evidence가 아님 |
| v3.3.0 (2) Source Registry Snapshot and Identity | `SRC-033`, `SAFE-114`, `OPS-081` | `verify-v330-source-registry-snapshot-identity` | `/ops/api/source-registry/snapshot`의 Ops-only read model이 sourceId, source kind, PublishedView 연결, canonical source key, owner/site/group context를 조합하는지 확인합니다. source registry write, PublishedView write, viewer/client 노출, onboarding quality, reliability timeline, incident correlation, recovery queue, client digest, search/metrics, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.3.0 (3) Source Onboarding Quality Summary | `SRC-034`, `SAFE-115`, `OPS-082` | `verify-v330-source-onboarding-quality-summary` | `/ops/api/source-registry/onboarding-quality`과 `/ops/sources`가 채널 저장 전 validation, 중복/충돌/누락/ready 상태, ONVIF/WHEP/RTSP 입력 품질 요약을 Ops-only로 표시하는지 확인합니다. source registry write, PublishedView write, viewer/client 노출, reliability timeline, incident correlation, recovery queue, client digest, search/metrics, 30분/120분, published metadata evidence가 아님 |
| v3.3.0 (4) Reliability Timeline and Health History | `SRC-035`, `SAFE-116`, `OPS-083` | `verify-v330-reliability-timeline-health-history` | `/ops/api/source-registry/reliability-timeline`과 `/ops/sources`가 live/stale/offline/reconnect/source warning 변화 이력과 Ops audit 연결을 Ops-only로 표시하는지 확인합니다. source registry write, PublishedView write, viewer/client 노출, API/schema/media 변경, 30분/120분, published metadata evidence가 아님 |
| v3.3.0 (5) Incident-to-Source Correlation Layer | `UI-070`, `SRC-036`, `EVT-071`, `SAFE-117`, `OPS-084` | `verify-v330-incident-source-correlation-layer`, `verify-ops-client-ui` | `/ops/api/events/reviews`와 `/ops/events`가 v3.2 resolution detail에 source reliability 원인/context, closure impact, source audit/recheck handoff를 Ops-only로 연결하는지 확인합니다. source registry write, PublishedView write, viewer/client 노출, EventRecord/Event POST/API/schema/media 변경, recovery queue, client digest, search/metrics, 30분/120분, published metadata evidence가 아님 |
| v3.3.0 (6) Operator Recheck and Recovery Queue | `UI-071`, `SRC-037`, `EVT-072`, `SAFE-118`, `OPS-085` | `verify-v330-operator-recheck-recovery-queue`, `verify-ops-client-ui` | `/ops/api/events/reviews`와 `/ops/events`가 failed-only recheck, retry candidate, recovery checklist, dry-run 결과, operator note link를 Ops-only로 연결하는지 확인합니다. source registry write, PublishedView write, viewer/client 노출, EventRecord/Event POST/API/schema/media 변경, persistent recovery queue write, client digest, search/metrics, 30분/120분, published metadata evidence가 아님 |
| v3.3.0 (7) Client-safe Source Status Digest | `UI-072`, `CLIENT-028`, `SRC-038`, `SAFE-119`, `OPS-086` | `verify-v330-client-safe-source-status-digest`, `verify-ops-client-ui` | `/client/api/views/{id}/events`와 client live/dashboard/events가 viewer-safe source status와 connection health digest를 표시하는지 확인합니다. source URL/raw locator/raw JSON/debug/credential/operator material, source registry write, PublishedView write, EventRecord/Event POST/API/schema/media 변경, search/metrics, 30분/120분, published metadata evidence가 아님 |
| v3.3.0 (8) Operator Runbook and Reliability Handoff | `SAFE-120`, `OPS-087` | `verify-v330-operator-runbook-reliability-handoff`, `verify-docs-links` | `docs/live-source-health.md`의 operator runbook source-of-truth와 docs index/UI guide/config/backup 문서 연결을 확인합니다. 제품 API/UI schema, source registry write, PublishedView write, real backup/restore, search/metrics, 30분/120분, published metadata evidence가 아님 |
| v3.3.0 (9) Source Reliability Search and Metrics | `UI-073`, `SRC-039`, `SAFE-121`, `OPS-088` | `verify-v330-source-reliability-search-metrics`, `verify-ops-client-ui` | `/ops/api/source-registry/reliability-search-metrics`와 `/ops/sources`가 source health filters, saved reliability view presets, reconnect/stale/offline metric summary를 Ops-only로 표시하는지 확인합니다. source registry write, PublishedView write, saved view write, viewer/client 노출, API/schema/media 변경, 30분/120분, published metadata evidence가 아님 |
| v3.3.0 (10) Ops Backup and Recovery Source Handoff | `UI-074`, `SRC-040`, `SAFE-122`, `OPS-089` | `verify-v330-ops-backup-recovery-source-handoff`, `verify-ops-client-ui` | `/ops/api/source-registry/backup-recovery-handoff`와 `/ops/sources`가 source registry snapshot, PublishedView registry, source health snapshot, recovery validation plan을 Ops-only handoff 입력으로 연결하는지 확인합니다. source registry write, PublishedView write, backup artifact persistence, automatic recovery, viewer/client 노출, API/schema/media 변경, 30분/120분, published metadata evidence가 아님 |
| v3.3.0 (11) Stabilization and Release Readiness | `SAFE-123`, `OPS-090` | `verify-v330-stabilization-release-readiness`, `verify-release-metadata`, `verify-release-evidence-index`, `verify-release-closeout-helper --dry-run` | v3.3 local stabilization gate, release evidence/not-run boundary, close-out dry-run 기록을 확인합니다. UI 풀테스트 직접 조작, 30분/120분, published metadata, PR/main/tag/GitHub Release 실행 evidence가 아님 |

## v3.2.0 Operations Resolution Workspace Coverage Mapping

이 절은 최신 published baseline의 기능 ID 연결입니다. 아래 행은 실행 evidence가
아니며, v3.3.0 완료 근거 또는 UI 풀테스트/30분/120분 PASS로 대체하지 않습니다.

| Roadmap scope | Feature IDs | 대표 안정화 verifier | release evidence boundary |
| --- | --- | --- | --- |
| v3.2.0 (1) v3.2.0 baseline 정렬 | `OPS-069`, `SAFE-102` | `verify-v320-entry-baseline`, `verify-release-metadata`, `verify-docs-links`, `verify-docs-ui-assets` | source `3.2.0`, latest published `v3.2.0`, current roadmap `v3.2.0 Operations Resolution Workspace` 정렬 기준. v3.2 기능 구현, UI 풀테스트, 30분/120분, GitHub Release publish evidence가 아님 |
| v3.2.0 (2) Resolution State Contract | `EVT-063`, `SAFE-103`, `OPS-070` | `verify-v320-resolution-state-contract` | 사건 상태, 판정 reason, close/reopen lifecycle contract를 `/ops/api/events/reviews`의 `media-server.ops.resolution-state.v1` Ops-only state/API/verifier와 연결합니다. Unified Ops Events Workspace, UI 풀테스트 직접 조작, 30분/120분, operator assignment flow, client digest, search/metrics, published metadata evidence가 아님 |
| v3.2.0 (3) Unified Ops Events Workspace | `UI-062`, `EVT-064`, `SAFE-104`, `OPS-071` | `verify-v320-unified-ops-events-workspace`, `verify-ops-client-ui` | `/ops/events` resolution queue/detail/timeline workspace를 실제 UI/verifier와 연결합니다. Evidence Quality Layer, Source Reliability Context, AI Review Quality Context, Operator Resolution Flow, Client-safe Resolution Digest, Resolution Search & Metrics, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.2.0 (4) Evidence Quality Layer | `UI-063`, `EVT-065`, `SAFE-105`, `OPS-072` | `verify-v320-evidence-quality-layer`, `verify-ops-client-ui` | evidence completeness/confidence/replay coverage hint를 `/ops/events` UI와 `/ops/api/events/reviews` `unifiedResolutionWorkspace.evidenceQuality` payload/verifier에 연결합니다. Source Reliability Context, AI Review Quality Context, Operator Resolution Flow, Client-safe Resolution Digest, Resolution Search & Metrics, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.2.0 (5) Source Reliability Context | `UI-064`, `EVT-066`, `SAFE-106`, `OPS-073` | `verify-v320-source-reliability-context`, `verify-v320-source-reliability-runtime-sample`, `verify-ops-client-ui` | source health와 recent failure context를 `/ops/events` UI와 `/ops/api/events/reviews` `unifiedResolutionWorkspace.sourceReliability` payload/verifier에 연결합니다. runtime sample은 fixture EventRecord item을 사용해 개별 item `sourceReliability`를 확인합니다. AI Review Quality Context, Operator Resolution Flow, Action Readiness Checklist, Client-safe Resolution Digest, Resolution Search & Metrics, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.2.0 (6) AI Review Quality Context | `UI-065`, `EVT-067`, `SAFE-107`, `OPS-074` | `verify-v320-ai-review-quality-context`, `verify-ops-client-ui` | correction/review signal, uncertainty reason, quality badge를 `/ops/events` UI와 `/ops/api/events/reviews` `unifiedResolutionWorkspace.aiReviewQuality` payload/verifier에 연결합니다. Operator Resolution Flow, Action Readiness Checklist, Client-safe Resolution Digest, Resolution Search & Metrics, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.2.0 (7) Operator Resolution Flow | `UI-066`, `EVT-068`, `SAFE-108`, `OPS-075` | `verify-v320-operator-resolution-flow`, `verify-ops-client-ui` | assign, note, close, reopen, audit trail을 `/ops/events` UI와 `/ops/api/events/reviews` write path/verifier에 연결합니다. Action Readiness Checklist, Client-safe Resolution Digest, Resolution Search & Metrics, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.2.0 (8) Action Readiness Checklist | `UI-067`, `EVT-069`, `SAFE-109`, `OPS-076` | `verify-v320-action-readiness-checklist`, `verify-ops-client-ui` | rule draft/evidence bundle/notification readiness checklist를 `/ops/events` UI와 `/ops/api/events/reviews` `unifiedResolutionWorkspace.actionReadinessChecklist` payload/verifier에 연결합니다. Client-safe Resolution Digest, Resolution Search & Metrics, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.2.0 (9) Client-safe Resolution Digest | `UI-068`, `CLIENT-027`, `SAFE-110`, `OPS-077` | `verify-v320-client-safe-resolution-digest`, `verify-ops-client-ui` | viewer-safe status summary와 redaction boundary를 `/client/api/views/{id}/events` `resolutionDigest`, client live/dashboard/events UI, 정적 verifier에 연결합니다. Resolution Search & Metrics, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.2.0 (10) Resolution Search & Metrics | `UI-069`, `EVT-070`, `SAFE-111`, `OPS-078` | `verify-v320-resolution-search-metrics`, `verify-ops-client-ui` | active resolution filters, saved view presets, 운영 metric summary를 `/ops/events` UI와 `/ops/api/events/reviews` `unifiedResolutionWorkspace.resolutionSearchMetrics` payload/verifier에 연결합니다. Stabilization and Release Readiness, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| v3.2.0 (11) Stabilization and Release Readiness | `SAFE-112`, `OPS-079` | `verify-v320-stabilization-release-readiness`, `verify-release-metadata`, `verify-release-evidence-index`, `verify-release-closeout-helper --dry-run` | v3.2 local stabilization gate, release evidence/not-run boundary, close-out dry-run 기록을 확인합니다. UI 풀테스트 직접 조작, 30분/120분, published metadata, PR/main/tag/GitHub Release 실행 evidence가 아님 |

## v3.1.0 Encoded Event Clip and Safe Sharing Expansion Coverage Mapping

이 절은 현재 active target의 계획 단계 연결만 남깁니다. 아래 행은 실행 evidence가
아니며, 기능 구현 전에는 실제 기능 ID, route/control/action, verifier command를
추가해야 합니다. 신규 기능 ID가 예약되어 있어도 안정화/UI 테스트를 PASS로 보고하지
않습니다.

| Roadmap scope | Feature IDs | 대표 안정화 verifier | release evidence boundary |
| --- | --- | --- | --- |
| V310-S00 Baseline/source-of-truth | `OPS-061`, `SAFE-093` | `verify-v310-entry-baseline`, `verify-release-metadata`, `verify-docs-links`, `verify-docs-ui-assets` | source `3.1.0`, latest published `v3.1.0`, current roadmap `v3.1.0 Encoded Event Clip and Safe Sharing Expansion` 정렬 기준. v3.1 기능 구현, UI 풀테스트, 30분/120분, GitHub Release publish evidence가 아님 |
| V310-S01 Encoded Event Clip Contract | `OPS-062`, `SAFE-094` | `verify-v310-event-clip-contract` | EncodedClipManifest, MP4/WebM format, FrameRef/PTS mapping, evidence links, retention/privacy/non-VMS boundary, fixture, docs/inventory/release records 연결 기준. encoder generation, replay UI, cleanup execution, client digest, scoped API, UI 풀테스트, 30분/120분, GitHub Release publish evidence가 아님 |
| V310-S02 Event Clip Encoder Pipeline | `EVT-059`, `SAFE-083` | `verify-analysis-state`, `./server.sh build`, `git diff --check` | 기존 frame-bundle hook에서 bounded WebM/VP8 encoded clip artifact, FrameRef-PTS mapping, queue/status manifest, partial cleanup, non-VMS boundary를 확인합니다. replay UI, client digest, VMS/NVR archive API, 24/7 recording, UI 풀테스트, 30분/120분, published metadata evidence가 아님 |
| V310-S03 Replay Timeline UI | `UI-060`, `OPS-063`, `SAFE-095` | `verify-v310-replay-timeline-ui`, `verify-ops-client-ui` | `/ops/events` Ops-only replay timeline UI가 event frame, representative image, frame bundle, encoded clip timeline, FrameRef/PTS mapping을 표시하는지 확인합니다. UI 풀테스트 직접 조작, 30분/120분, client digest, scoped API, cleanup execution, published metadata evidence가 아님 |
| V310-S04 Client-safe Event Digest | `CLIENT-025`, `SAFE-096` | `verify-v310-client-safe-event-digest`, `verify-ops-client-ui` | `/client/api/views/{id}/events`와 client live/dashboard/events가 `media-server.client.event-digest.v1` viewer-safe digest를 표시하고 source/raw/debug/provider/feature provenance/encoded clip path/rule action material을 노출하지 않는지 확인합니다. UI 풀테스트 직접 조작, 30분/120분, scoped API, cleanup execution, published metadata evidence가 아님 |
| V310-S05 Scoped Integrator Search API | `CLIENT-026`, `SAFE-097`, `OPS-064` | `verify-v310-scoped-integrator-search-api`, `verify-auth-routes` | `/client/api/views/{id}/events/search`가 integrator-only PublishedView-scoped event search API로 `event:read:{viewId}`를 요구하고 `media-server.integrator.scoped-event-search.v1` digest만 반환하는지 확인합니다. UI 풀테스트 직접 조작, 30분/120분, cleanup execution, vector search, published metadata evidence가 아님 |
| V310-S06 Operator Feature Correction | `UI-061`, `EVT-061`, `SAFE-098`, `OPS-065` | `verify-v310-operator-feature-correction`, `verify-ops-client-ui` | `/ops/events`가 operator-only correctedFeatureLabel/featureAliases/reanalysisRequested 상태를 기존 review state에 저장하고 `media-server.ops.operator-feature-correction.v1` view model로 표시합니다. UI 풀테스트 직접 조작, 30분/120분, vector search, cleanup execution, published metadata evidence가 아님 |
| V310-S07 Optional Vector Search | `LAB-089`, `SAFE-100`, `OPS-067` | `verify-v310-optional-vector-search`, `verify-analysis-state` | default-off optional embedding index가 명시 opt-in일 때만 non-identifying embedding을 quality gate와 dimension gate로 인덱싱하고 rebuild stale vector entry를 제거하는지 확인합니다. provider embedding calls, UI 풀테스트 직접 조작, 30분/120분, client/viewer 노출, published metadata evidence가 아님 |
| V310-S08 Retention/Export Hardening | `EVT-062`, `SAFE-099`, `OPS-066` | `verify-v310-retention-export-hardening`, `verify-analysis-state` | encoded clip lifecycle cleanup이 EventRecord/EvidenceManifest/FeatureSet/SearchIndex cleanup 계획에 묶이고 release-safe export bundle이 encoded media/path/material을 제외하며 `export-bundle` audit coverage를 남기는지 확인합니다. UI 풀테스트 직접 조작, 30분/120분, vector search, destructive operational cleanup, published metadata evidence가 아님 |
| V310-S09 Stabilization and Release Readiness | `SAFE-101`, `OPS-068` | `verify-v310-stabilization-release-readiness`, `verify-release-metadata`, `verify-release-evidence-index`, `verify-release-closeout-helper --dry-run` | v3.1 local stabilization gate, release evidence/not-run boundary, close-out dry-run 기록을 확인합니다. UI 풀테스트 직접 조작, 30분/120분, published metadata, PR/main/tag/GitHub Release 실행 evidence가 아님 |

## v3.0.0 Event Evidence Search MVP Coverage Mapping

이 절은 직전 published baseline의 계획 단계 연결입니다. 아래 행은 실행 evidence가
아니며, 기능 구현 전에는 실제 기능 ID, route/control/action, verifier command를
추가해야 합니다. 신규 기능 ID가 예약되어 있어도 안정화/UI 테스트를 PASS로 보고하지
않습니다.

| Roadmap scope | Feature IDs | 대표 안정화 verifier | release evidence boundary |
| --- | --- | --- | --- |
| V300-S00 Baseline/source-of-truth | `OPS-051`, `SAFE-081` | `verify-v300-entry-baseline`, `verify-release-metadata`, `verify-docs-links`, `verify-docs-ui-assets` | source `3.0.0`, latest published `v3.0.0`, current roadmap `v3.0.0 Event Evidence Search MVP` 정렬 기준. v3.0 기능 구현, UI 풀테스트, 30분/120분, GitHub Release publish evidence가 아님 |
| V300-S01 Event Evidence Contract | `OPS-052`, `SAFE-082` | `verify-v300-event-evidence-contract` | EvidenceManifest, FrameRef, retention lifecycle, privacy/non-VMS boundary, fixture, docs/inventory/release records 연결 기준. frame extraction, encoded clip/playback, Search DSL, `/ops/events` UI, UI 풀테스트, 30분/120분, GitHub Release publish evidence가 아님 |
| V300-S02 Frame Bundle Extraction | `EVT-060`, `SAFE-084` | `verify-analysis-state`, `./server.sh build`, `git diff --check` | EventRecord recorder가 eventFrame, representativeImage selection, bboxCrop, pre/event/post frameBundle manifest, EvidenceManifest sidecar를 생성하는지 확인합니다. encoded clip/playback, Search DSL, `/ops/events` UI, VMS/NVR archive API, UI 풀테스트, 30분/120분, published metadata evidence가 아님 |
| V300-S03 Feature Schema and Privacy Policy | `LAB-083`, `SAFE-085`, `OPS-053` | `verify-v300-feature-schema-privacy` | FeatureSet envelope, namespace allowed/disallowed matrix, raw prompt/response non-retention, identity feature prohibition, privacy guard fixture와 문서 연결 기준. VLM queue/runtime/provider success, Search DSL, `/ops/events` UI, 얼굴 인식/신원 식별/model 품질 PASS, UI 풀테스트, 30분/120분, published metadata evidence가 아님 |
| V300-S04 VLM Feature Queue | `LAB-084`, `SAFE-086`, `OPS-054` | `verify-v300-vlm-feature-queue`, `verify-analysis-state` | Background queue, lazy trigger, missing-runtime/queue-timeout/invalid-output VLM-only failure, structured FeatureSet revision 경계를 확인합니다. real provider success, Search DSL, `/ops/events` UI, UI 풀테스트, 30분/120분, published metadata evidence가 아님 |
| V300-S05 Feature-only Retention | `LAB-085`, `SAFE-087`, `OPS-055` | `verify-v300-feature-only-retention`, `verify-analysis-state` | Feature-only durable retention, raw prompt/response rejection, FeatureSet revision store, reanalysis revision policy를 확인합니다. Search DSL, Retention/Pin/Cleanup, `/ops/events` UI, UI 풀테스트, 30분/120분, published metadata evidence가 아님 |
| V300-S06 Search DSL and Query Convert | `LAB-086`, `SAFE-088`, `OPS-056` | `verify-v300-search-dsl-query-convert`, `verify-analysis-state` | Natural-language query conversion to constrained Search DSL, text/tags/filter matching, strict structured output, identity-query rejection을 확인합니다. Feature/Search Index, `/ops/events` UI, vector search, UI 풀테스트, 30분/120분, published metadata evidence가 아님 |
| V300-S07 Feature/Search Index | `LAB-087`, `SAFE-089`, `OPS-057` | `verify-v300-feature-search-index`, `verify-analysis-state` | EventRecord, FeatureSet, EvidenceManifest, operator review state projection과 index/rebuild/report, stale result guard를 확인합니다. `/ops/events` UI, vector search, semantic provider rerank, retention cleanup execution, UI 풀테스트, 30분/120분, published metadata evidence가 아님 |
| V300-S08 Ops Events UI | `UI-059`, `SAFE-090`, `OPS-058` | `verify-v300-ops-events-ui`, `verify-ops-client-ui` | `/ops/events` Ops-only search/detail UI가 evidence timeline, feature reasons, retry, pin, retention status를 표시하는지 확인합니다. UI 풀테스트 직접 조작, 30분/120분, Retention/Pin/Cleanup lifecycle execution, published metadata evidence가 아님 |
| V300-S09 Retention/Pin/Cleanup | `LAB-088`, `SAFE-091`, `OPS-059` | `verify-v300-retention-pin-cleanup`, `verify-analysis-state` | 기본 7일 retention, operator-configurable override, pinned event cleanup 제외, dry-run/apply lifecycle delete plan, audit trail을 확인합니다. destructive cleanup 실운영 실행, UI 풀테스트 직접 조작, 30분/120분, published metadata evidence가 아님 |
| V300-S10 Stabilization and Release Readiness | `SAFE-092`, `OPS-060` | `verify-v300-stabilization-release-readiness`, `verify-release-metadata`, `verify-release-evidence-index`, `verify-release-closeout-helper --dry-run` | v3.0 local stabilization gate, release evidence/not-run boundary, close-out dry-run 기록을 확인합니다. UI 풀테스트 직접 조작, 30분/120분, published metadata, PR/main/tag/GitHub Release 실행 evidence가 아님 |
## v2.9.0 Final 2.x Closure & Compatibility Baseline Coverage Mapping

이 절은 latest published baseline의 기능 ID 연결입니다. 아래 행은 실행 evidence가
아니며, v3.0.0 완료 근거 또는 UI 풀테스트/30분/120분 PASS로 대체하지 않습니다.

| Roadmap scope | Feature IDs | 대표 안정화 verifier | release evidence boundary |
| --- | --- | --- | --- |
| V290-S00 Baseline/source-of-truth | `OPS-041`, `SAFE-071` | `verify-release-metadata`, `verify-docs-links`, `verify-docs-ui-assets` | source `2.9.0`, latest published `v2.8.0`, current roadmap `v2.9.0` 정렬 기준. GitHub Release publish evidence가 아님 |
| V290-S01 2.x final contract freeze | `OPS-042`, `SAFE-072` | `verify-v290-final-contract-freeze` | Event POST/WebRTC/SSE/WS metadata, RTSP/WebRTC media path, Auth/Role/Scope, Rule/Profile payload의 2.x 최종 계약 기준. 3.0 migration 구현 evidence가 아님 |
| V290-S02 v2.8 feature regression bundle | `OPS-043`, `SAFE-073` | `verify-v290-v28-regression-bundle` | v2.8 완료 evidence 재사용이 아니라 v2.9 기준 재실행 evidence |
| V290-S03 2.x compatibility gate | `OPS-044`, `SAFE-074` | `verify-v290-2x-compatibility-baseline` | v2.5~v2.8 하위 verifier가 실제 실행한 범위만 PASS |
| V290-S04 release test records enforcement | `OPS-045`, `SAFE-075` | `verify-v290-release-test-records-enforcement` | 저장소 보존형 테스트 기록 체계, pass/fail 결과표, 미실행/제외 분리, cleanup/token 기록 기준. UI/30분/120분/published metadata 실행 evidence가 아님 |
| V290-S05 UI fulltest criteria freeze | `OPS-046`, `SAFE-076` | `verify-v290-ui-fulltest-criteria-freeze`, `verify-manual-ui-evidence` | v2.9 UI 풀테스트 route/control/action/role/viewport/theme 기준 freeze. 인앱 브라우저 직접 조작 실행 evidence가 아님 |
| V290-S06 release evidence hygiene | `OPS-047`, `SAFE-077` | `verify-v290-release-evidence-hygiene`, `verify-release-evidence-index`, `verify-script-inventory` | release evidence index, release test records, feature inventory, script inventory, manual UI evidence 연결과 PASS/FAIL vs 미실행/제외/manual-not-run/미확인 분리. 실제 UI/30분/120분/published metadata 실행 evidence가 아님 |
| V290-S07 public docs/assets refresh | `OPS-048`, `SAFE-078` | `verify-v290-public-docs-assets-refresh`, `verify-docs-ui-assets`, `verify-docs-links` | README/README.en/docs index/UI guide/docs asset policy/release-version policy refresh. 대표 이미지 직접 재캡처, UI 풀테스트, 30분/120분, published metadata 실행 evidence가 아님 |
| V290-S08 final stabilization run | `OPS-049`, `SAFE-079` | `verify-v290-final-stabilization-run` | build/auth/Ops-Client UI/rule/event/metadata/media-schema/docs-inventory 안정화 실행 기록 기준. UI 풀테스트 직접 조작, 30분/120분, published metadata, field smoke 실행 evidence가 아님 |
| V290-S09 owner release readiness | `OPS-050`, `SAFE-080` | `verify-v290-owner-release-readiness` | v2.9.0 local owner release readiness와 release close-out dry-run 기준. UI 풀테스트 직접 조작, 30분/120분, published metadata, PR/main/tag/GitHub Release, field smoke 실행 evidence가 아님 |

## v2.8.0 Operator-Supervised Action Readiness Coverage Mapping

이 절은 최신 published baseline의 기능 ID 연결입니다. 아래 행은 실행 evidence가
아니며, v2.9.0 완료 근거 또는 UI 풀테스트/30분/120분 PASS로 대체하지 않습니다.

| Roadmap scope | Feature IDs | 대표 안정화 verifier | release evidence boundary |
| --- | --- | --- | --- |
| V280-S00 Baseline/source-of-truth | `OPS-039`, `SAFE-064` | `verify-release-metadata`, `verify-docs-links`, `verify-docs-ui-assets` | source `2.8.0`, latest published `v2.7.0`, current roadmap `v2.8.0` 정렬 기준. GitHub Release publish evidence가 아님 |
| V280-S01 2.x runway boundary | `OPS-039`, `SAFE-064` | 문서 gate 기준 | `2.8.0`/`2.9.0`/`3.0.0` 경계 문서화 기준. 3.0 설계 완료나 migration 구현 evidence가 아님 |
| V280-S02 Incident Action Readiness Queue | `UI-055`, `EVT-055`, `LAB-079`, `SAFE-065` | `verify-v280-incident-action-readiness-queue` | Ops-only readiness queue 기준. 외부 실제 발송, 자동 action write, UI 직접 조작 PASS가 아님 |
| V280-S03 Approval-gated Rule Draft Readiness | `UI-056`, `RULE-104`, `EVT-056`, `LAB-080`, `SAFE-066` | `verify-v280-approval-gated-rule-draft` | 수동 approval/staged draft 기준. full replay, 자동 저장, 자동 적용 evidence가 아님 |
| V280-S04 Evidence Intake and Field Readiness | `UI-057`, `SRC-032`, `EVT-057`, `LAB-081`, `SAFE-067` | `verify-v280-evidence-intake-field-readiness` | redacted intake와 field precondition 기준. endpoint/credential 없는 field PASS가 아님 |
| V280-S05 Runtime Evidence Window | `UI-058`, `EVT-058`, `LAB-082`, `SAFE-068` | `verify-v280-runtime-evidence-window` | bounded runtime evidence window 기준. 30분/120분/장기 녹화 evidence가 아님 |
| V280-S06 Client-safe Follow-up Digest | `CLIENT-024`, `SAFE-069` | `verify-v280-client-safe-followup-digest` | viewer-safe follow-up digest 기준. source/raw/debug/provider/rule editor/action control 비노출은 브라우저 직접 확인 전 UI PASS가 아님 |
| V280-S07 Release readiness | `UI-055`, `UI-056`, `UI-057`, `UI-058`, `CLIENT-024`, `OPS-040`, `SAFE-070` | `verify-v280-owner-release-readiness` | v2.8.0 local release readiness gate 기준. UI 풀테스트 직접 조작, 30분/120분, published metadata, tag/push/GitHub Release evidence가 아님 |

## v2.7.0 Operational Incident Command Loop Coverage Mapping

이 절은 최신 published baseline의 기능 ID 연결입니다. 아래 행은 실행 evidence가
아니며, v2.8.0 완료 근거 또는 UI 풀테스트/30분/120분 PASS로 대체하지 않습니다.

| Roadmap scope | Feature IDs | 대표 안정화 verifier | release evidence boundary |
| --- | --- | --- | --- |
| V270-S01 Incident Triage Board | `UI-050`, `EVT-050`, `LAB-074`, `SAFE-058` | `verify-v270-incident-triage-board` | `/ops/events` board view, lane/filter/sort UI, viewer/client 비노출 기준. 브라우저 직접 조작 전 UI PASS가 아님 |
| V270-S02 Decision scorecard | `UI-051`, `EVT-051`, `LAB-075`, `SAFE-059` | `verify-v270-incident-decision-scorecard` | deterministic scorecard 기준. provider 호출, raw JSON/source URL 노출, schema/media 변경 evidence가 아님 |
| V270-S03 Operational Action Pack | `UI-052`, `EVT-052`, `LAB-076`, `SAFE-060` | `verify-v270-operational-action-pack` | evidence bundle/rule draft/alert dry-run/source health recheck 연결 기준. 외부 실제 발송과 자동 rule write는 비범위 |
| V270-S04 Rule What-if Preview | `UI-053`, `EVT-053`, `LAB-077`, `SAFE-061` | `verify-v270-rule-what-if-preview` | selected incident/rule suggestion preview 기준. full replay engine, 자동 저장, 자동 적용 evidence가 아님 |
| V270-S05 Operator outcome memory | `UI-054`, `EVT-054`, `LAB-078`, `SAFE-062` | `verify-v270-operator-outcome-memory` | 기존 Ops review state/audit 기반 deterministic history hint 기준. EventRecord top-level 변경과 client/viewer 노출은 비범위 |
| V270-S06 Release readiness | `UI-050`, `UI-051`, `UI-052`, `UI-053`, `UI-054`, `OPS-038`, `SAFE-063` | `verify-v270-owner-release-readiness` | v2.7.0 local release readiness gate 기준. UI 풀테스트 직접 조작, 30분/120분, published metadata, tag/push/GitHub Release evidence가 아님 |

## v2.6.0 Operational Hardening Coverage Mapping

이 절은 직전 published baseline의 기능 ID 연결입니다. 아래 행은 실행 evidence가 아니며,
v2.7.0 완료 근거 또는 UI 풀테스트/30분/120분 PASS로 대체하지 않습니다.

| Roadmap scope | Feature IDs | 대표 안정화 verifier | release evidence boundary |
| --- | --- | --- | --- |
| V260-S01 Incident memory productization | `UI-045`, `EVT-046`, `LAB-069`, `SAFE-052` | `verify-v260-incident-memory-productization` | `/ops/events` Ops-only wrapper/static smoke 기준. 브라우저 직접 조작, provider 호출, auto rule 적용, 장시간 테스트 evidence가 아님 |
| V260-S02 Rule suggestion review | `UI-046`, `EVT-047`, `LAB-070`, `SAFE-053` | `verify-v260-rule-suggestion-review` | `/ops/events` incident-to-rule review wrapper와 `/ops/rules` draft-only 링크 기준. 자동 저장, provider 호출, schema/media 변경, UI 풀테스트 evidence가 아님 |
| V260-S03 ONVIF credential gate | `UI-047`, `SRC-031`, `LAB-071`, `SAFE-054` | `verify-v260-onvif-credential-gate` | `/ops/sources` credential gate와 `/ops/api/onvif/import-draft` redaction guard 기준. persistent store, external secret manager, 실장비 credential 성공, UI 풀테스트 evidence가 아님 |
| V260-S04 Runtime dashboard trends | `UI-048`, `EVT-048`, `LAB-072`, `SAFE-055` | `verify-v260-runtime-dashboard-trends` | `/ops/dashboard` page-session-only runtime trend card와 static smoke 기준. 장기 녹화, 30분/120분, UI 풀테스트, schema/media/client 변경 evidence가 아님 |
| V260-S05 Scenario extension | `UI-049`, `RULE-103`, `EVT-049`, `LAB-073`, `SAFE-056` | `verify-v260-scenario-cross-zone-reentry` | `/ops/rules` configured-zones A→B 후보, analysis-state, va-replay fixture 기준. Event POST/WebRTC/SSE/WS schema, media path, client 노출, UI 풀테스트 evidence가 아님 |
| V260-S06 Release readiness | `UI-045`, `UI-046`, `UI-047`, `UI-048`, `UI-049`, `OPS-037`, `SAFE-057` | `verify-v260-owner-release-readiness` | v2.6.0 Operational Hardening local release readiness gate 기준. UI 풀테스트 직접 조작, 30분/120분, published metadata, tag/push/GitHub Release evidence가 아님 |

## v2.5.0 Semantic Incident Memory Coverage Mapping

이 절은 현재 active target의 기능 ID 연결만 남깁니다. 아래 행은 실행 evidence가 아니며, UI 풀테스트/30분/120분 PASS로 대체하지 않습니다.

| Roadmap scope | Feature IDs | 대표 안정화 verifier | release evidence boundary |
| --- | --- | --- | --- |
| V250-S01 Event/incident text projection | `EVT-039`, `LAB-063`, `SAFE-043` | `verify-v250-incident-text-projection` | 검색 UI/SQLite index/model provider 실행 evidence가 아님 |
| V250-S02 Local incident memory index | `EVT-040`, `LAB-064`, `SAFE-044` | `verify-v250-incident-memory-index` | `/ops/events` UI/API, similarity/timeline/brief, external embedding/provider 실행 evidence가 아님 |
| V250-S03 `/ops/events` semantic search UI | `UI-039`, `EVT-041`, `SAFE-045` | `verify-v250-ops-events-semantic-search-ui` | 브라우저 직접 조작 전 UI PASS가 아님 |
| V250-S04 Incident timeline graph | `UI-040`, `EVT-042`, `LAB-065`, `SAFE-046` | `verify-v250-incident-timeline-graph` | 브라우저 직접 조작과 운영 데이터 graph 판독 전 UI PASS가 아님 |
| V250-S05 Explainable incident brief | `UI-041`, `EVT-043`, `LAB-066`, `SAFE-047` | `verify-v250-explainable-incident-brief` | provider 호출 성공이나 VLM default-on 근거가 아님 |
| V250-S06 Similar incident lookup | `UI-042`, `EVT-044`, `LAB-067`, `SAFE-048` | `verify-v250-similar-incident-lookup` | external embedding/provider 실행 evidence가 아님 |
| V250-S07 Client-safe incident digest | `CLIENT-023`, `SAFE-049` | `verify-v250-client-safe-incident-digest` | viewer role UI 직접 확인 전 UI PASS가 아님 |
| V250-S08 Redacted incident evidence bundle | `UI-043`, `EVT-045`, `LAB-068`, `SAFE-050` | `verify-v250-redacted-incident-evidence-bundle` | 실제 다운로드 파일 육안 검수 전 UI PASS가 아님 |
| V250-S09 Owner decomposition/release readiness | `UI-044`, `OPS-036`, `SAFE-051` | `verify-v250-owner-release-readiness` | close-out gate와 UI 풀테스트 기준 정리. 실제 UI 직접 조작, 30분/120분, tag/push/GitHub Release PASS가 아님 |

## Historical UI Evidence Close-out Compatibility

이 절은 v2.2.0 F06 UI Evidence Close-out 준비 verifier 호환용 cross-reference입니다. 현재 v2.5.0 완료 근거가 아니며, inventory 자체는 실행 evidence가 아님.

| Row | 연결 문서 | verifier | 경계 |
| --- | --- | --- | --- |
| V220-F02 Ops Channels Workspace | [manual-ui-checklist.md](./manual-ui-checklist.md), [manual-ui-result-template.md](./manual-ui-result-template.md) | `verify-v220-ui-evidence-closeout` | F02 UI 실행 PASS가 아님 |
| V220-F03 Ops Users / Access Workspace | [manual-ui-checklist.md](./manual-ui-checklist.md), [manual-ui-result-template.md](./manual-ui-result-template.md) | `verify-v220-ui-evidence-closeout` | F03 UI 실행 PASS가 아님 |
| V220-F04 Ops VLM UI containment | [manual-ui-checklist.md](./manual-ui-checklist.md), [manual-ui-result-template.md](./manual-ui-result-template.md) | `verify-v220-ui-evidence-closeout` | F04 UI 실행 PASS가 아님 |
| V220-F05 Client Preview / Viewer Redaction | [manual-ui-checklist.md](./manual-ui-checklist.md), [manual-ui-result-template.md](./manual-ui-result-template.md) | `verify-v220-ui-evidence-closeout` | F05 UI 실행 PASS가 아님 |
| V220-F06 UI Evidence Close-out | [manual-ui-checklist.md](./manual-ui-checklist.md), [manual-ui-result-template.md](./manual-ui-result-template.md) | `verify-v220-ui-evidence-closeout` | F06는 결과 기록 기준 정리이며 UI 풀테스트 PASS가 아님 |
| V220-S06 Rules workspace redesign | `UI-012` | `verify-v220-rules-workspace-redesign` | `/ops/rules` readiness/assist/catalog/detail와 기존 저장 hook의 historical compatibility. 현재 UI 직접 조작 PASS가 아님 |
| v2.2.0 F04 Ops VLM UI containment 정리 | `UI-014`, `SAFE-025` | `verify-v220-ops-vlm-containment` | `/ops/vlm`의 default-off/privacy/profile/보조 작업 containment 정적 회귀. runtime/provider/UI 실행 PASS가 아님 |

## Owner Source Map

| ID prefix | 코드 로직 owner | 제품 UI owner | 대표 verifier family |
| --- | --- | --- | --- |
| `UI-*` | `src/ingress/product_ui_*`, `src/ingress/webrtc_http_server.cpp` | Auth/Ops/Client shell | UI/auth/ops/v250 verifier family |
| `AUTH-*` | `src/ingress/http_auth.cpp`, product auth pages/users scripts | `/setup`, `/login`, `/password/change`, `/invite/setup`, `/ops/users` | auth verifier family |
| `SRC-*` | source registry/factory/ONVIF import/ops source scripts | `/ops/sources`, `/ops/api/source-registry/snapshot`, `/client/live`, `/client/dashboard` | source/ONVIF/UI verifier family |
| `RULE-*` | analysis query/scenario/rule engine, `webrtc_http_server.cpp` AnalysisDocumentRegistry/AnalysisRegistry와 Lab analysis CRUD route | `/ops/rules` controller/actions, `/client/live` overlay | rule/VA verifier family |
| `EVT-*` | event manager/storage/webrtc HTTP server | `/ops/dashboard`, `/ops/events`, `/ops/home` | event/VLM/v250 verifier family |
| `CLIENT-*` | client UI scripts/CSS, WebRTC egress/session | `/client/live`, `/client/dashboard`, `/client/request-access` | client/UI verifier family |
| `MEDIA-*` | session manager, source factory, stream registry, RTSP/WebRTC adapters | video-visible client routes only | codec/WebRTC/longrun verifier family |
| `LAB-*` | analysis query, VLM local stores, internal scripts | 비대상 | lab/VLM fixture verifier family |
| `SAFE-*` | schema/payload/media/auth/UI boundary owners | route guard와 client 비노출 화면 | safety/boundary verifier family |
| `OPS-*` | ops backup/evidence/release readiness scripts | 비대상 | ops evidence/readiness verifier family |

## Verifier Coverage Map

| 기능 ID 범위 | 안정화 verifier 후보 | 비고 |
| --- | --- | --- |
| `UI-001`~`UI-115` | auth, Ops, Client, VLM, v250/v260/v270/v280/v300/v310/v320/v330/v340/v350/v360/v370/v380/v390 UI verifier family | route/control/action source anchor는 exact-ID manifest가 관리하며 UI 직접 조작 evidence는 별도 필요 |
| `AUTH-001`~`AUTH-042` | `verify-auth-regression-matrix`, `verify-auth-bootstrap`, `verify-auth-users`, `verify-auth-routes`, `verify-auth-ui-smoke`, `verify-auth-scope-picker` | role/scope별 브라우저 증거는 별도 |
| `SRC-001`~`SRC-068` | source/ONVIF/UI/v340/v350/v360/v370/v380/v390 verifier family | ONVIF field success는 approved environment only |
| `RULE-001`~`RULE-112` | rule/VA/v350/v360/v370/v390 verifier family | 실제 UI 이벤트 발생 전수 evidence 없음. 실제 UI 이벤트 발생 전수 evidence 없으면 FAIL |
| `EVT-001`~`EVT-087` | event/VLM/v250/v260/v270/v280/v300/v310/v320/v330/v340/v350/v360/v370/v380/v390 verifier family | event log 육안 확인은 UI 풀테스트 |
| `CLIENT-001`~`CLIENT-042` | client/UI/v350/v360/v370/v380 verifier family | viewer 비노출은 브라우저 확인 필요 |
| `MEDIA-001`~`MEDIA-027` | codec/WebRTC/external TURN/WHEP verifier family | 30분/120분은 사용자 지시 필요 |
| `LAB-001`~`LAB-126` | lab/VLM/v250/v260/v270/v280/v300/v310/v340/v350/v360/v370/v380/v390 fixture verifier family | 제품 UI 비대상 |
| `SAFE-001`~`SAFE-216` | safety/boundary verifier family | schema/media/auth/UI automation 불변 조건 |
| `OPS-035`~`OPS-184` | ops evidence/readiness verifier family | PR/main/tag/GitHub Release 실행 evidence와 분리 |

## VA Manual UI Seed Matrix

| 항목 | 기준 |
| --- | --- |
| fixture | `test/fixtures/manual_ui_fulltest_va_seed_matrix.json` |
| dry-run 준비 | 미공개 current source에서는 `./server.sh prepare-manual-ui-fulltest-seed --dry-run --published-seed-baseline`으로 latest published fixture를 명시 선택합니다. HTTP 요청 없이 numeric ID, payload 참조, media file 존재, coverage를 확인하며 UI/event evidence가 아닙니다. 상태 표기는 `dry-run 준비 가능, 서버 적용 evidence 없음`으로 남깁니다. |
| registry 파일 준비 | `./server.sh prepare-manual-ui-fulltest-seed --dry-run --published-seed-baseline --emit-registry-dir <dir>`은 throwaway registry 파일을 생성합니다. 이 결과도 UI/event evidence가 아닙니다. |
| registry preconditions file | `preconditions.json`은 throwaway registry 시작 조건 파일입니다. 파일 생성은 서버 적용, 제품 UI 조작, EventRecord 확인 evidence가 아닙니다. |
| apply 경계 | 미공개 current source의 실제 서버 적용은 사용자 지시 후 `--apply --published-seed-baseline --confirm-throwaway-data --http-base <url>`로만 수행하며, 적용 후에도 인앱 브라우저 확인 전에는 UI PASS가 아닙니다. |
| final state | profiles, event templates, VA rules가 모두 남아 있어야 하며 event log 확인 전 삭제하지 않음 |

## 30-Minute And 120-Minute Mapping

120분 조건부 대상은 memory growth, runtime drift, fanout/media path 고위험 변경,
VLM queue/backpressure 신호가 있을 때 안정화/30분/UI evidence와 분리해 기록합니다.

| 영역 | 대상 기능 | 실행 기준 |
| --- | --- | --- |
| 30분 soak | media/session/runtime, client live, selected rule/event/runtime queue rows | 사용자 장기간 테스트 지시 또는 명시 요청된 경우 `verify-predev --soak-minutes 30` 계열. 요청이 없으면 미실행으로 기록 |
| 120분 | media fanout, source worker lifecycle, non-blocking safety, runtime/cache drift high-risk rows | memory growth/runtime drift 고위험 변경 시 사용자에게 먼저 말하고 승인 후 실행 |

## Coverage Start Conditions

30분, 120분, UI 풀테스트는 실패 후 재시작 비용이 크므로 아래 항목이 먼저 `PASS` 또는 명시 제외로 정리되지 않으면 시작하지 않습니다.

| 시작 조건 | 긴 테스트 전 확인 | 실패 시 처리 |
| --- | --- | --- |
| 기능/route 목록 freeze | 현재 문서의 기능 ID 목록과 result template route/control/action 목록이 맞음 | mapping/template 수정 후 긴 테스트 시작 전 재검수 |
| side-effect 선수 gate | build/auth/Ops/Client/Rule/VA/WebRTC/SSE/WS/Event POST/media path verifier 목록이 실행 계획에 있음 | 선수 gate 실패 시 30분/120분/UI 시작 금지 |
| auth/env/fixture | auth password env, throwaway registry, output artifact 경로 기록 | 누락이면 긴 테스트 시작 전 중단 |
| UI phase order | Auth/setup, route/nav, fixture seed, VLM redaction, VA EventRecord, responsive/theme 순서로 early failure를 앞에 둠 | 앞 phase 실패 시 뒤 phase로 진행하지 않음 |

## Classification Rules

| 값 | 의미 |
| --- | --- |
| UI 필요: 필요 | 제품 화면에서 사용자가 직접 조작하거나 확인해야 합니다. |
| UI 필요: 간접 | 별도 제품 화면은 아니지만 화면 상태, redirect, nav, scope, session 결과로 확인되어야 합니다. |
| UI 필요: 비대상 | 제품 UI를 만들면 안 되거나 API/정책/backend/계약 기능입니다. |
| 테스트 필요: 필요 | 해당 기능은 하나 이상의 테스트 영역에 반드시 들어갑니다. |
| PASS 기준 | 요구 조건입니다. 실제 PASS 보고는 실행 evidence가 있을 때만 가능합니다. |

## A. Screen And Route

| ID | 기능 | UI 필요 | 테스트 필요 | 테스트 영역 | PASS 기준 |
| --- | --- | --- | --- | --- | --- |
| UI-001 | `/` 진입 후 제품 시작 route로 이동 | 필요 | 필요 | 안정화, UI | auth/setup 상태별 redirect가 실제 route와 브라우저 화면에서 일치 |
| UI-002 | `/setup` 최초 관리자 설정 화면 | 필요 | 필요 | 안정화, UI | setup form 표시, S08 `auth-form-grid`/password policy panel, weak/strong password flow 직접 확인 |
| UI-003 | `/login` 로그인 화면 | 필요 | 필요 | 안정화, UI | S08 `auth-login-form` credential 입력 후 role landing 확인 |
| UI-004 | `/password/change` 비밀번호 변경 화면 | 필요 | 필요 | 안정화, UI | S08 `auth-password-change-form`, 사용자 지정 테스트 pw -> 임시 pw 변경 성공, 임시 pw 로그인, 즉시 원래 pw 재사용 거부, history count 기준 복원 후 최종 로그인 확인 |
| UI-005 | `/logout` 세션 종료 | 간접 | 필요 | 안정화, UI | logout action 후 세션 종료와 보호 route 재접근 차단 확인 |
| UI-006 | `/auth/whoami` 현재 세션 확인 | 간접 | 필요 | 안정화 | principal/schema가 role/scope와 일치 |
| UI-007 | `/invite/setup` 초대 기반 계정 설정 | 필요 | 필요 | 안정화, UI | S08 `auth-invite-setup-form`, invite setup 전후 login/client 접근 경계 확인 |
| UI-008 | `/client/request-access` 시청자 접근 요청 | 필요 | 필요 | 안정화, UI | S08 `auth-access-request-form`, request submit, pending copy, 승인 전 접근 차단 확인 |
| UI-009 | `/ops/home` 운영 Home | 필요 | 필요 | 안정화, UI | home summary/nav/status와 S05 `ops-workspace-home` action grid가 표시되고 320/390/760/1180 overflow 없음 |
| UI-010 | `/ops/dashboard` 운영 Dashboard | 필요 | 필요 | 안정화, UI | filter/search/copy/refresh, root cause/runtime/event panel, S05 `ops-workspace-dashboard` diagnostic grid 표시 확인 |
| UI-011 | `/ops/sources` 채널 / 소스 관리 | 필요 | 필요 | 안정화, UI | source/view CRUD와 validation을 직접 조작 |
| UI-012 | `/ops/rules` VA 룰 / 프로파일 / 이벤트 템플릿 관리 | 필요 | 필요 | 안정화, UI | rule/template/profile CRUD, validation, preview, S06 `rules-workspace` readiness/assist/catalog/detail flow와 320/390/760/1180 overflow 확인 |
| UI-013 | `/ops/users` 사용자 관리 | 필요 | 필요 | 안정화, UI | user/invite/access request/role/scope flow 확인 |
| UI-014 | `/ops/events` Operator Event Review Inbox | 필요 | 필요 | 안정화, UI | operator review inbox list/detail, evidence refs, review state, operator note, false-positive/action target 저장 흐름과 primary nav 비노출 경계 확인 |
| UI-015 | `/client/live` 시청자 Live | 필요 | 필요 | 안정화, UI, 30분 | video viewport/control/status/overlay, S07 `client-live-workspace` video-first grid, viewer redaction, session 지속성 확인 |
| UI-016 | `/client/dashboard` 시청자 Dashboard | 필요 | 필요 | 안정화, UI | viewer scope 내 dashboard/filter/sort/copy와 S07 `client-viewer-dashboard` status/event summary 확인 |
| UI-017 | `/client/events` 시청자 이벤트 route | 필요 | 필요 | 안정화, UI | viewer scope 내 events 표시, S07 `client-viewer-events` direct route, 비노출 경계 확인 |
| UI-018 | `/lab`, `/lab/rules`, `/lab/import`, `/webrtc/test` 제품 UI 미제공 / 404 | 비대상 | 필요 | 안정화, UI | 이전 제품 UI route와 임의 route가 제품 UI로 열리지 않음 |
| UI-019 | light/dark theme-aware 공통 UI | 필요 | 필요 | UI | 주요 화면에서 contrast/token/상태 색상 일관성 확인 |
| UI-020 | desktop 반응형 화면 | 필요 | 필요 | UI | 1180px 이상에서 nav/table/form/video 겹침 없음 |
| UI-021 | mobile 반응형 화면 | 필요 | 필요 | UI | 320px/390px에서 text/control/video overflow 없음 |
| UI-022 | `/ops/vlm` VLM 설치/연결 준비 | 필요 | 필요 | 안정화, UI | Ops-only route에서 local/cloud dry-run 후보, cloud opt-in guard, 단일 선택 상태, 실행/저장 없음 boundary가 표시되고 viewer/client에는 노출되지 않음 |
| UI-023 | `/ops/vlm` VLM profile 저장 | 필요 | 필요 | 안정화, UI | 선택한 dry-run 후보를 profile ID, prompt profile, 평가 상태, 활성화/fallback/disable 상태와 함께 저장하고 저장 목록/삭제가 Ops-only로 동작 |
| UI-024 | `/ops/vlm` VLM Privacy/전송 guard | 필요 | 필요 | 안정화, UI | Cloud 후보에서 외부 전송 경고 확인과 provider logging/retention 검토가 profile 저장 전 guard로 표시되고, local 후보는 provider 전송 없음 상태로 표시 |
| UI-025 | `/ops/vlm` PC capability/recommendation 요약 | 필요 | 필요 | 안정화, UI | hardware class, runtime readiness, 추천/대안/비추천 사유가 Ops-only로 표시되고 자동 설치/호출/저장 action은 발생하지 않음 |
| UI-026 | `/ops/vlm` local model dry-run 후보 선택 | 필요 | 필요 | 안정화, UI | local 후보 선택 버튼이 단일 선택 상태를 반영하고 model download, runtime install, profile 저장 없이 dry-run 상태만 갱신 |
| UI-027 | `/ops/vlm` cloud connection dry-run 후보 선택 | 필요 | 필요 | 안정화, UI | cloud opt-in 전 후보가 disabled 상태이며 opt-in 확인 후에도 provider API 호출/credential 저장 없이 dry-run 선택만 반영 |
| UI-028 | `/ops/vlm` profile 활성화/fallback/disable control | 필요 | 필요 | 안정화, UI | profile row의 active/fallback/disabled 상태가 저장 목록과 상세 copy에 반영되고 VLM runtime 호출은 발생하지 않음 |
| UI-029 | `/ops/vlm` profile 삭제 action | 필요 | 필요 | 안정화, UI | 삭제 버튼이 Ops-only로 동작하고 삭제 후 목록에서 제거되며 EventRecord, sidecar, media path에는 영향 없음 |
| UI-030 | `/ops/vlm` evaluation/prompt profile 표시 | 필요 | 필요 | 안정화, UI | 평가 상태, prompt profile, language/JSON stability planning 값이 저장 profile에 표시되고 benchmark PASS로 과장하지 않음 |
| UI-031 | `/ops/vlm` raw details 접힘 영역 | 필요 | 필요 | 안정화, UI | dry-run/profile diagnostic JSON은 Ops debug details 안에만 접혀 있고 viewer/client 화면에는 노출되지 않음 |
| UI-032 | `/ops/events` VLM review detail control | 필요 | 필요 | 안정화, UI | VLM summary, explanation, false-positive hints, operator questions, evidence availability가 Ops event review 안에서만 열리고 client/viewer에는 노출되지 않음 |
| UI-033 | `/ops/vlm` VLM runtime status panel | 필요 | 필요 | 안정화, UI | provider 상태, runtime 연결 상태, 마지막 evaluation, 실패 사유, privacy mode, default-off 상태가 Ops-only panel에 표시되고 client/viewer에는 노출되지 않음 |
| UI-034 | `/ops/vlm` VLM evaluation result workflow | 필요 | 필요 | 안정화, UI | evaluation result 후보를 latency/JSON/explanation/hallucination/language 축으로 비교하고 profile draft 반영 버튼이 model/prompt/evaluation 상태만 채우며 자동 저장/활성화/runtime 호출은 하지 않음 |
| UI-035 | `/ops/events` VLM review action workflow | 필요 | 필요 | 안정화, UI | VLM review card의 action/target/note control이 `accept`, `dismiss`, `review-needed`를 Ops review state에 저장하고 EventRecord/Event POST/metadata/media path와 client/viewer 노출을 바꾸지 않음 |
| UI-036 | `/ops/rules` VLM Rule suggestion draft workflow | 필요 | 필요 | 안정화, UI | VLM rule draft 후보 refresh/kind filter/`폼에 적용`이 이벤트 템플릿 form draft만 채우고, 기존 저장 버튼 전에는 `/lab/analysis/rules`/`va-rules` write, 자동 Rule/Profile 적용, runtime/provider 호출이 발생하지 않음 |
| UI-037 | `/ops/events` Event Action and Incident Workflow | 필요 | 필요 | 안정화, UI | incident status/id/action target control이 `new`, `review-needed`, `acknowledged`, `in-progress`, `closed`, `false-positive`를 Ops review state에 저장하고 events audit trail에 `incident-action-update`로 표시되며 EventRecord/Event POST/metadata/media path와 client/viewer 노출을 바꾸지 않음 |
| UI-038 | `/ops/events` Alert Dry-run and Delivery Attempt Log | 필요 | 필요 | 안정화, UI | alert target draft의 dry-run button이 payload preview와 dry-run result를 표시하고 delivery attempt log에 `dry-run`/`externalDeliveryPerformed=false`를 남기며 endpoint secret과 Event POST payload를 노출하지 않음 |
| UI-039 | `/ops/events` Semantic Incident Search | 필요 | 필요 | 안정화, UI | 검색 입력, rule/source/incident status/time filter, `memorySearch` 결과, matched evidence highlight가 `/ops/events`에 Ops-only로 표시되고 primary nav/client/viewer에는 노출되지 않음 |
| UI-040 | `/ops/events` Incident Timeline Graph | 필요 | 필요 | 안정화, UI | source state → EventRecord → operator action → alert dry-run → close state graph가 `/ops/events`에 Ops-only로 표시되고 graph node/edge가 source URL/raw/debug/provider material 없이 연결됨 |
| UI-041 | `/ops/events` Explainable Incident Brief | 필요 | 필요 | 안정화, UI | action/object/context/environment slot 기반 brief가 `/ops/events`에 Ops-only로 표시되고 VLM enrichment는 default-off, provider call 없음, client/viewer 노출 없음으로 표시됨 |
| UI-042 | `/ops/events` Similar Incident Lookup | 필요 | 필요 | 안정화, UI | rule/scenario/source/status/action target 기반 similar incident lookup group이 `/ops/events`에 Ops-only로 표시되고 raw JSON/source URL/debug/provider material 없이 deterministic score와 explanation term만 표시됨 |
| UI-043 | `/ops/events` Redacted Incident Evidence Bundle | 필요 | 필요 | 안정화, UI | `/ops/events` evidence action이 raw signed bundle과 별도로 release-safe bundle 버튼을 제공하고 redacted manifest-only export 경계를 표시함 |
| UI-044 | `/ops/events` Semantic Incident Memory UI 풀테스트 준비 기준 | 필요 | 필요 | 안정화, UI | semantic search, timeline graph, explainable brief, similar lookup, release-safe bundle을 route/control/action 단위 UI 풀테스트 기준으로 분리하고 자동 smoke나 raw JSON/API-only 확인을 UI PASS로 쓰지 않음 |
| UI-045 | `/ops/events` VLM Summary Candidate Review | 필요 | 필요 | 안정화, UI | VLM summary candidate review panel이 `media-server.ops.vlm-summary-candidate-review.v1` wrapper, candidate count, matched terms, manual review route를 Ops-only로 표시하고 client/viewer에는 노출되지 않음 |
| UI-046 | `/ops/events` Incident-to-rule suggestion review | 필요 | 필요 | 안정화, UI | Event review row가 matching VLM rule suggestion을 `media-server.ops.incident-rule-suggestion-review.v1` 카드로 표시하고 `/ops/rules` draft-only manual save route로만 연결함 |
| UI-047 | `/ops/sources` ONVIF credential gate | 필요 | 필요 | 안정화, UI | ONVIF probe draft tool이 `media-server.onvif-credential-binding-gate.v1` gate status를 표시하고 secret input/reference echo 없이 source:write/reference-only/store-off 경계를 보여줌 |
| UI-048 | `/ops/dashboard` Runtime dashboard trend card | 필요 | 필요 | 안정화, UI | `/ops/dashboard`가 page-session-only sample로 runtime baseline/sparkline 후보, delta, longrun evidence 아님 상태를 운영 card에 표시하고 persistent trend store를 만들지 않음 |
| UI-049 | `/ops/rules` ReEntry cross-zone review control | 필요 | 필요 | 안정화, UI | ReEntry `configured-zones` 기준이 source zone A 이탈 후 `reEntryZoneIds` destination B 진입 후보임을 select/summary/review copy로 표시하고 event/schema/media/client 경계를 바꾸지 않음 |
| UI-050 | `/ops/events` Incident Triage Board | 필요 | 필요 | 안정화, UI | `/ops/events`가 priority/review state/source/rule/scenario/similar incident/VLM candidate 기준의 lane/filter/sort board를 `media-server.ops.incident-triage-board.v1`로 표시하고 client/viewer에는 노출하지 않음 |
| UI-051 | `/ops/events` Incident Decision Scorecard | 필요 | 필요 | 안정화, UI | `/ops/events`가 EventRecord/source health/similar incident/VLM summary/rule candidate/operator review age를 deterministic priority reason chip으로 표시하고 provider 호출/raw JSON/source URL 노출 없이 Ops-only로 유지함 |
| UI-052 | `/ops/events` Operational Action Pack | 필요 | 필요 | 안정화, UI | `/ops/events`가 release-safe evidence bundle, `/ops/rules` draft route, alert dry-run, source health recheck dry-run을 한 action pack card로 표시하고 외부 실제 발송/자동 rule write 없이 Ops-only로 유지함 |
| UI-053 | `/ops/events` Rule What-if Preview | 필요 | 필요 | 안정화, UI | `/ops/events`가 selected incident/EventRecord와 rule suggestion 후보를 저장 전 condition preview/draft comparison으로 표시하고 `/ops/rules` draft-only 수동 저장 경로로만 연결하며 full replay engine/자동 저장/자동 적용 없이 Ops-only로 유지함 |
| UI-054 | `/ops/events` Operator Outcome Memory | 필요 | 필요 | 안정화, UI | `/ops/events`가 accept/dismiss/review-needed outcome과 기존 Ops review/audit 상태를 deterministic history hint로 표시하고 새 저장소/자동 학습/client viewer 노출 없이 Ops-only로 유지함 |
| UI-055 | `/ops/events` Incident Action Readiness Queue | 필요 | 필요 | 안정화, UI | `/ops/events`가 operator 승인 가능한 follow-up 후보를 ready/blocked/field-smoke-needed/not-run 상태로 분리해 표시하고 외부 실제 발송, 자동 action write, EventRecord/Event POST/WebRTC/SSE/WS/media path 변경 없이 Ops-only로 유지함 |
| UI-056 | `/ops/rules` Approval-gated Rule Draft Readiness | 필요 | 필요 | 안정화, UI | `/ops/rules`가 incident/rule suggestion 후보를 approval state, validation summary, staged draft context로 표시하고 수동 저장 전 Rule/Profile registry write, 자동 저장, 자동 적용을 만들지 않음 |
| UI-057 | `/ops/events` Evidence Intake and Field Readiness | 필요 | 필요 | 안정화, UI | `/ops/events`가 redacted evidence intake, source health recheck, field smoke precondition을 passed/failed/blocked/not-run으로 구분하고 credential/source/raw/debug material을 노출하지 않음 |
| UI-058 | `/ops/events` Runtime Evidence Window | 필요 | 필요 | 안정화, UI | `/ops/events` incident detail이 bounded runtime/source/event evidence window를 Ops-only로 표시하되 장기 저장소, 30분/120분 evidence, client/viewer exposure를 만들지 않음 |
| UI-059 | `/ops/events` V300 Event Evidence Search UI | 필요 | 필요 | 안정화, UI | `/ops/events`가 V300 Feature/Search Index 기반의 search/detail UI를 Ops-only로 표시하고 evidence timeline, feature reasons, retry action, pin status, retention status를 source URL/raw provider/debug/client exposure 없이 보여줌 |
| UI-060 | `/ops/events` V310 Replay Timeline UI | 필요 | 필요 | 안정화, UI | `/ops/events`가 EventRecord evidence refs 기반 event frame, representative image, frame bundle, encoded clip timeline과 FrameRef/PTS mapping을 Ops-only로 표시하고 source URL/raw JSON/debug/client exposure 없이 유지함 |
| UI-061 | `/ops/events` V310 Operator Feature Correction | 필요 | 필요 | 안정화, UI | `/ops/events`가 correctedFeatureLabel, featureAliases, reanalysisRequested/reanalysisReason control과 summary card를 Ops-only로 표시하고 기존 review 저장 버튼으로 event review state에만 반영하며 client/viewer에는 노출하지 않음 |
| UI-062 | V320 Step 3 Unified Ops Events Workspace UI | 필요 | 필요 | 안정화, UI | `/ops/events`가 `media-server.ops.v320-unified-events-workspace.v1` 기반 resolution queue, resolution detail, resolution timeline을 한 작업공간으로 표시하고 source URL/raw JSON/debug/client exposure 없이 유지함 |
| UI-063 | V320 Step 4 Evidence Quality Layer UI | 필요 | 필요 | 안정화, UI | `/ops/events`가 `media-server.ops.v320-evidence-quality.v1` 기반 evidence completeness, deterministic confidence, replay coverage hint를 unified resolution detail 안에 표시하고 source URL/raw JSON/debug/client exposure 없이 유지함 |
| UI-064 | V320 Step 5 Source Reliability Context UI | 필요 | 필요 | 안정화, UI | `/ops/events`가 `media-server.ops.v320-source-reliability-context.v1` 기반 source health, recent failure, operator recheck hint를 unified resolution detail 안에 표시하고 source URL/raw JSON/debug/client exposure/source registry write 없이 유지함 |
| UI-065 | V320 Step 6 AI Review Quality Context UI | 필요 | 필요 | 안정화, UI | `/ops/events`가 `media-server.ops.v320-ai-review-quality-context.v1` 기반 correction/review signal, uncertainty reason, quality badge를 unified resolution detail 안에 표시하고 source URL/raw JSON/debug/client exposure/provider call 없이 유지함 |
| UI-066 | V320 Step 7 Operator Resolution Flow UI | 필요 | 필요 | 안정화, UI | `/ops/events`가 `media-server.ops.v320-operator-resolution-flow.v1` 기반 assignment target, operator note, close/reopen 가능 상태, audit trail을 unified resolution detail 안에 표시하고 source URL/raw JSON/debug/client exposure 없이 유지함 |
| UI-067 | V320 Step 8 Action Readiness Checklist UI | 필요 | 필요 | 안정화, UI | `/ops/events`가 `media-server.ops.v320-action-readiness-checklist.v1` 기반 readiness status, rule draft, evidence bundle, notification readiness checklist와 blocker chip을 unified resolution detail 안에 표시하고 자동 action write, external delivery, source URL/raw JSON/debug/client exposure 없이 유지함 |
| UI-068 | V320 Step 9 Client-safe Resolution Digest UI | 필요 | 필요 | 안정화, UI | `/client/live`, `/client/dashboard`, `/client/events`가 `media-server.client.resolution-digest.v1` 기반 resolutionStatus/resolutionLabel/summaryText/severity/timelineHint/time만 표시하고 source URL/raw JSON/debug/provider/operator note/action control을 노출하지 않음 |
| UI-069 | V320 Step 10 Resolution Search & Metrics UI | 필요 | 필요 | 안정화, UI | `/ops/events`가 `media-server.ops.v320-resolution-search-metrics.v1` 기반 active resolution filters, saved view presets, operations metric summary를 unified resolution detail 안에 표시하고 saved view write/source URL/raw JSON/debug/client exposure 없이 유지함 |
| UI-070 | V330 Step 5 Incident-to-Source Correlation UI | 필요 | 필요 | 안정화, UI | `/ops/events`가 `media-server.ops.v330-incident-source-correlation.v1` 기반 source cause, closure impact, source handoff를 unified resolution detail 안에 표시하고 source URL/raw JSON/debug/client exposure 없이 유지함 |
| UI-071 | V330 Step 6 Operator Recheck and Recovery Queue UI | 필요 | 필요 | 안정화, UI | `/ops/events`가 `media-server.ops.v330-operator-recheck-recovery-queue.v1` 기반 failed-only recheck, retry candidate, recovery checklist, dry-run result, operator note link를 unified resolution detail 안에 표시하고 source URL/raw JSON/debug/client exposure/자동 recovery 없이 유지함 |
| UI-072 | V330 Step 7 Client-safe Source Status Digest UI | 필요 | 필요 | 안정화, UI | `/client/live`, `/client/dashboard`, `/client/events`가 `media-server.client.source-status-digest.v1` 기반 sourceStatus/connectionStatus/videoFrameStatus/metadataStatus/summaryText/severity/timelineHint만 표시하고 source URL/raw locator/raw JSON/debug/credential/operator material/action control을 노출하지 않음 |
| UI-073 | V330 Step 9 Source Reliability Search and Metrics UI | 필요 | 필요 | 안정화, UI | `/ops/sources`가 `media-server.ops.v330-source-reliability-search-metrics.v1` 기반 source health filters, saved reliability view presets, reconnect/stale/offline metric summary와 search result list를 표시하고 saved view write/source URL/raw locator/raw JSON/debug/client exposure 없이 유지함 |
| UI-074 | V330 Step 10 Ops Backup and Recovery Source Handoff UI | 필요 | 필요 | 안정화, UI | `/ops/sources`가 `media-server.ops.v330-backup-recovery-source-handoff.v1` 기반 source registry snapshot, PublishedView registry, source health snapshot, recovery validation plan handoff를 표시하고 source URL/raw locator/raw JSON/debug/credential/client exposure 없이 유지함 |
| UI-075 | V340 Step 6 Ops Continuity Drill Workspace UI | 필요 | 필요 | 안정화, UI | `/ops/sources`가 `media-server.ops.v340-continuity-drill-workspace-ui.v1` 기반 drill package, validation status, blocked/ready 상태, source health drift를 read-only로 표시하고 source URL/raw locator/raw JSON/debug/credential material과 자동 recovery/source registry write를 노출하지 않음 |
| UI-076 | V340 Step 7 Approval-Gated Recovery Checklist and Audit UI | 필요 | 필요 | 안정화, UI | `/ops/sources`가 `media-server.ops.v340-approval-gated-recovery-checklist.v1` 기반 operator note, ready/blocked/field-smoke-needed/not-run 상태, dry-run result, Ops audit link를 read-only로 표시하고 source URL/raw locator/raw JSON/debug/credential material과 자동 recovery/source registry write를 노출하지 않음 |
| UI-077 | V340 Step 8 Client-safe Maintenance Digest UI | 필요 | 필요 | 안정화, UI | `/client/live`, `/client/dashboard`, `/client/events`가 `media-server.client.v340-maintenance-digest.v1` 기반 maintenance/recovering/unavailable viewer-safe digest를 표시하고 source URL/raw locator/raw JSON/debug/credential material/operator note/Ops audit/dry-run/recovery action을 노출하지 않음 |
| UI-078 | V340 Step 9 Drill Evidence Export and Cleanup Manifest UI | 필요 | 필요 | 안정화, UI | `/ops/sources`가 `media-server.ops.v340-drill-evidence-export-cleanup-manifest.v1` 기반 redacted drill artifact manifest, minimum retained evidence, /tmp cleanup manifest, sensitive material scan boundary를 read-only로 표시하고 source URL/raw locator/raw JSON/debug/credential material/raw audit body를 노출하지 않음 |
| UI-079 | V340 Step 10 Field Bridge Condition Gates UI | 필요 | 필요 | 안정화, UI | `/ops/sources`가 `media-server.ops.v340-field-bridge-condition-gates.v1` 기반 ONVIF 실기기, external WHEP/TURN, real cloud/VLM provider 조건 gate와 source-only PASS boundary를 read-only로 표시하고 endpoint URL/raw locator/raw JSON/debug/credential/provider material을 노출하지 않음 |
| UI-080 | V350 Step 4 incident command handoff detail | 필요 | 필요 | 안정화, UI | `/ops/events` selected detail이 `media-server.ops.v350-incident-command-handoff.v1` 기반 source 원인, continuity drill 후보, command plan 초안을 read-only로 표시하고 source/view/rule write, client notice 발송, media/schema mutation을 만들지 않음 |
| UI-081 | V350 Step 6 Ops Command Workspace UI | 필요 | 필요 | 안정화, UI | `/ops/dashboard`가 `media-server.ops.v350-command-workspace-ui.v1` 기반 incident, source, drill, staged plan, client impact flow를 read-only로 표시하고 source URL/raw locator/raw JSON/debug/credential material과 command execution/source-view-rule write를 노출하지 않음 |
| UI-082 | V350 Step 7 Drill Run Ledger and Plan Comparison UI | 필요 | 필요 | 안정화, UI | `/ops/dashboard`가 `media-server.ops.v350-drill-run-ledger.v1` 기반 drill run id, operator note, blocker, evidence refs, previous run diff를 read-only로 표시하고 drill run write/operator note write/command execution을 수행하지 않음 |
| UI-083 | V350 Step 8 Client Impact Forecast UI | 필요 | 필요 | 안정화, UI | `/client/live`, `/client/dashboard`, `/client/events`가 `media-server.client.v350-impact-forecast.v1` 기반 source/view/command plan 영향 forecast를 viewer-safe로 표시하고 source URL/raw locator/debug/operator/command detail을 노출하지 않음 |
| UI-084 | V350 Step 9 Client-safe Operations Notice UI | 필요 | 필요 | 안정화, UI | `/client/live`, `/client/dashboard`, `/client/events`가 `media-server.client.v350-operations-notice.v1` 기반 maintenance/degraded/recovering/available 상태와 timeline hint만 표시하고 source URL/raw locator/debug/operator/command/incident detail을 노출하지 않음 |
| UI-085 | V350 Step 10 Operations Export Bundle and Handoff Map UI | 필요 | 필요 | 안정화, UI | `/ops/dashboard`가 `media-server.ops.v350-export-bundle-handoff-map.v1` 기반 Operations Export Bundle과 Handoff Map을 표시하고 command plan refs, drill ledger refs, field evidence refs, client impact forecast refs를 release-safe/read-only로만 노출함 |
| UI-086 | V350 Step 11 Field Evidence Intake UI | 필요 | 필요 | 안정화, UI | `/ops/dashboard`가 `media-server.ops.v350-field-evidence-intake.v1` 기반 Field Evidence Intake를 표시하고 ONVIF, external WHEP/TURN, cloud/VLM provider의 redacted field evidence, execution conditions, not-run 상태를 raw endpoint/credential/provider/VLM material 없이 노출함 |
| UI-087 | V350 Step 12 VLM-assisted Ops Explanation UI | 필요 | 필요 | 안정화, UI | `/ops/dashboard`가 `media-server.ops.v350-vlm-assisted-explanation.v1` 기반 VLM-assisted Ops Explanation을 default-off로 표시하고 command plan blocker, incident/source relation, operator review hint를 raw prompt/provider response/credential material 없이 노출함 |
| UI-088 | V360 Step 7 Ops Simulation Workspace UI | 필요 | 필요 | 안정화, UI | `/ops/dashboard`가 `media-server.ops.v360-simulation-workspace-ui.v1` 기반 simulation input, run, impact diff, readiness blocker를 read-only로 표시하고 command execution/source-view-rule write/client notice 발송을 수행하지 않음 |
| UI-089 | V360 Step 8 Simulation Run Ledger and Comparison UI | 필요 | 필요 | 안정화, UI | `/ops/dashboard` simulation workspace가 `media-server.ops.v360-simulation-run-ledger.v1` 기반 simulation run id, input ref, result diff, operator note, previous run diff를 read-only로 표시하고 simulation 실행/operator note write/client notice 발송을 수행하지 않음 |
| UI-090 | V360 Step 9 Client Notice Preview UI | 필요 | 필요 | 안정화, UI | `/ops/dashboard` simulation workspace가 `media-server.ops.v360-client-notice-preview.v1` 기반 maintenance/degraded/recovering notice preview를 preview-only로 표시하고 client notice send/persist 또는 viewer client payload 변경을 수행하지 않음 |
| UI-091 | V360 Step 10 Rule/VA What-if Replay Pack UI | 필요 | 필요 | 안정화, UI | `/ops/dashboard` simulation workspace가 `media-server.ops.v360-rule-va-what-if-replay-pack.v1` 기반 rule threshold, preset, scenario what-if 후보를 read-only로 표시하고 rule apply/EventRecord write/media mutation을 수행하지 않음 |
| UI-092 | V360 Step 11 Simulation Export Bundle UI | 필요 | 필요 | 안정화, UI | `/ops/dashboard` simulation workspace가 `media-server.ops.v360-simulation-export-bundle.v1` 기반 simulation input/output, blocker, handoff map refs를 redacted release-safe bundle으로 표시하고 artifact export/file write/handoff write를 수행하지 않음 |
| UI-093 | V360 Step 12 Field Evidence Simulation Adapter UI | 필요 | 필요 | 안정화, UI | `/ops/dashboard` simulation workspace가 `media-server.ops.v360-field-evidence-simulation-adapter.v1` 기반 ONVIF, external WHEP/TURN, cloud/VLM provider 조건부/not-run evidence와 readiness blocker ref를 raw endpoint/credential/provider material 없이 표시함 |
| UI-094 | V360 Step 13 VLM-assisted Simulation Explanation UI | 필요 | 필요 | 안정화, UI | `/ops/dashboard` simulation workspace가 `media-server.ops.v360-vlm-assisted-simulation-explanation.v1` 기반 VLM-assisted Simulation Explanation을 default-off로 표시하고 blocker, impact diff, operator review hint를 raw prompt/provider response/credential material 없이 노출함 |
| UI-095 | V370 Step 11 Site Operations Workspace UI | 필요 | 필요 | 안정화, UI | `/ops/dashboard`가 `media-server.ops.v370-site-operations-workspace-ui.v1` 기반 site list, health rollup, runbook queue, impact detail을 read-only로 표시하고 source URL/raw locator/raw JSON/debug/credential/operator material과 source/view/runbook/approval write를 노출하지 않음 |
| UI-096 | V370 Step 12 Client Notice by Site/View Group UI | 필요 | 필요 | 안정화, UI | `/ops/dashboard`가 `media-server.ops.v370-client-notice-by-site-view-group.v1` 기반 site/view group viewer-safe notice preview와 delivery queue를 preview-only로 표시하고 client notice send/persist 또는 viewer client payload 변경을 수행하지 않음 |
| UI-097 | V370 Step 13 Rule/VA What-if by Site UI | 필요 | 필요 | 안정화, UI | `/ops/dashboard`가 `media-server.ops.v370-rule-va-what-if-by-site.v1` 기반 site-scoped rule threshold/scenario what-if 후보, site impact delta, EventRecord/VA fixture refs를 read-only로 표시하고 rule apply/EventRecord write/media mutation을 수행하지 않음 |
| UI-098 | V370 Step 14 Field Evidence Attachment UI | 필요 | 필요 | 안정화, UI | `/ops/dashboard`가 `media-server.ops.v370-field-evidence-attachment.v1` 기반 site/runbook field evidence attachment, condition refs, approval/runbook refs, not-run/conditional evidence boundary를 표시하고 field smoke, endpoint/provider 실행, source/view/runbook/approval write, raw endpoint/credential/provider material 노출을 수행하지 않음 |
| UI-099 | V370 Step 15 Limited Safe Execution Pilot UI | 필요 | 필요 | 안정화, UI | `/ops/dashboard`가 `media-server.ops.v370-limited-safe-execution-pilot.v1` 기반 source recheck 또는 notice queue pilot 후보, approval gate state, execution preview, idempotency key를 표시하고 source recheck 실행, notice send/queue write, source/view/runbook/approval write를 수행하지 않음 |
| UI-100 | V370 Step 16 Outcome Reconciliation UI | 필요 | 필요 | 안정화, UI | `/ops/dashboard`가 `media-server.ops.v370-outcome-reconciliation.v1` 기반 pre-simulation ref, post-execution not-run ref, source impact diff, EventRecord/client impact diff, pending reason을 표시하고 pilot execution, EventRecord write, client notice send, source/view/client/media mutation을 수행하지 않음 |
| UI-101 | V370 Step 17 Export / Handoff Bundle UI | 필요 | 필요 | 안정화, UI | `/ops/dashboard`가 `media-server.ops.v370-export-handoff-bundle.v1` 기반 bundle item, handoff map, redaction review, release safety boundary를 표시하고 artifact/file/handoff write, client notice send, raw material 노출을 수행하지 않음 |
| UI-102 | V380 Step 10 Ops Action Control Workspace UI | 필요 | 필요 | 안정화, UI | `/ops/dashboard`가 `media-server.ops.v380-action-control-workspace-ui.v1` 기반 request/approval/readiness/pilot/receipt flow를 read-only로 표시하고 action execution, request persist, approval persist, readiness persist, source recheck, notice send, rule apply, client/media/schema mutation을 수행하지 않음 |
| UI-103 | V380 Step 11 Client-safe Action Notice Preview UI | 필요 | 필요 | 안정화, UI | `/client/dashboard`, `/client/events`, `/client/live`가 `media-server.client.v380-action-notice-preview.v1` 기반 maintenance/degraded/recovering/available action notice preview를 status/timeline-only로 표시하고 internal blocker, approval/readiness detail, source locator, credential, raw diagnostic, Ops-only action material을 노출하지 않음 |
| UI-104 | V380 Step 12 Outcome Observer and Reconciliation UI | 필요 | 필요 | 안정화, UI | `/ops/dashboard`의 Action Control Workspace가 `media-server.ops.v380-outcome-observer-reconciliation.v1` 기반 readiness, execution candidate, observed outcome diff를 source/EventRecord/client/rule 축으로 표시하고 action execution, EventRecord write, client notice send, rule apply, media/schema mutation을 수행하지 않음 |
| UI-105 | V380 Step 13 Action Receipt Bundle UI | 필요 | 필요 | 안정화, UI | `/ops/dashboard`의 Action Control Workspace가 `media-server.ops.v380-action-receipt-bundle.v1` 기반 redacted release-safe receipt bundle, handoff map, redaction review를 표시하고 artifact/file/handoff write, action execution, raw locator/credential/raw diagnostic 노출을 수행하지 않음 |
| UI-106 | V380 Step 14 Field Connector Evidence Package UI | 필요 | 필요 | 안정화, UI | `/ops/dashboard`의 Action Control Workspace가 `media-server.ops.v380-field-connector-evidence-package.v1` 기반 ONVIF/external WHEP-TURN/cloud provider connector evidence package와 credential/endpoint approval condition을 표시하고 field smoke, endpoint/credential probe, provider call, raw endpoint/locator/credential/provider/debug material 노출을 수행하지 않음 |
| UI-107 | V380 Step 15 Default-off Action Explanation UI | 필요 | 필요 | 안정화, UI | `/ops/dashboard`의 Action Control Workspace가 `media-server.ops.v380-default-off-action-explanation.v1` 기반 approval blocker, readiness reason, outcome hint를 default-off explanation으로 표시하고 VLM/provider/runtime call, raw prompt/provider response, credential/locator/debug material, action execution을 수행하지 않음 |
| UI-108 | V390 Step 11 ONVIF credential/provider status UI | 필요 | 필요 | 안정화, UI | `/ops/sources` ONVIF 도구 영역이 `media-server.ops.v390-onvif-credential-provider-status.v1` 기반 primary provider `none`, fallback `in-memory-fixture`, persistent store deferred, `referenceValueExposed=false`, `credentialMaterialExposed=false`를 표시하고 credential reference value나 secret material을 노출하지 않음 |
| UI-109 | V390 ONVIF paired save status UI | 필요 | 필요 | 안정화, UI | `/ops/sources`의 `saveChannelSourceViewPair`와 persist decision status가 importDraftNotSaved=true, oneShotPersist=false, sourceWriteRequired=true, manual paired route, server rollback model을 표시하고 ONVIF form save/toggle에서 기존 source/view 연속 PUT을 사용하지 않음 |
| UI-110 | V390 Step 13 VLM rule suggestion draft bridge UI | 필요 | 필요 | 안정화, UI | `/ops/rules` VLM Rule draft 영역이 `media-server.ops.v390-vlm-rule-suggestion-draft-bridge.v1` 기반 `ops-review-to-rule-draft-bridge`, `provenance=incident-review-provenance`, `manualSaveRequired=true`, `autoApply=false`, `ruleRegistryWrite=false`를 표시하고 자동 저장/자동 적용 완료처럼 표시하지 않음 |
| UI-111 | V390 VLM server-verified promotion UI | 필요 | 필요 | 안정화, UI | `verify-v390-vlm-promotion-trust-boundary`가 `/ops/vlm` Evaluation을 read-only `server verified` 상태로 표시하고 payload는 `candidateId`, `expectedCatalogRevision`, `expectedProvenanceDigest`만 제출하며 editable passed option과 client result/status 선언이 없음을 확인 |
| UI-112 | V390 Step 15 staging restore validation handoff UI | 필요 | 필요 | 안정화, UI | `/ops/sources` Backup Handoff 영역이 `media-server.ops.v390-staging-restore-validation-handoff.v1` 기반 staging restore checklist와 result artifact contract, `resultArtifactPersistedByRoute=false`, `productionRestorePerformed=false`, `automaticRecoveryPerformed=false`를 표시하고 restore/cutover 완료처럼 표시하지 않음 |
| UI-113 | V390 Step 16 action execution deferral decision UI | 필요 | 필요 | 안정화, UI | `/ops/dashboard` Action Control Workspace 인근이 `media-server.ops.v390-action-execution-deferral-decision.v1` 기반 `defer-all-action-writes`, `approvalGatedExecutionEnabled=false`, `sourceRecheckExecuted=false`, `clientNoticeSent=false`, `ruleApplyPerformed=false`를 표시하고 action 실행 버튼이나 완료처럼 표시하지 않음 |
| UI-114 | V390 Step 17 field evidence bridge decision UI | 필요 | 필요 | 안정화, UI | `/ops/dashboard`가 `media-server.ops.v390-field-evidence-bridge-decision.v1` 기반 `approval-only-minimal-field-evidence-bridge`, `fieldSmokeExecuted=false`, `endpointProbePerformed=false`, `credentialProbePerformed=false`, `fieldPassClaimed=false`, `releasePassClaimed=false`를 표시하고 field 실행 버튼이나 release PASS처럼 표시하지 않음 |
| UI-115 | V390 Re-ID server readiness evidence UI | 필요 | 필요 | 안정화, UI | `/ops/dashboard`의 `renderV390ReidAssistDecision`이 regular file, SHA format/read/match, trim provenance, OpenSSL·ONNX availability, safe reason code, preflight/session-load 분리와 no-op fallback을 표시하고 raw model material 또는 Re-ID 실행 완료처럼 표시하지 않음 |

## B. Auth, Account, Role, Scope

| ID | 기능 | UI 필요 | 테스트 필요 | 테스트 영역 | PASS 기준 |
| --- | --- | --- | --- | --- | --- |
| AUTH-001 | auth mode `auto` | 간접 | 필요 | 안정화 | users/admin 상태별 setup/login/role gate 결정 일치 |
| AUTH-002 | auth mode `off` 개발/검증 모드 | 비대상 | 필요 | 안정화 | dev principal만 허용되고 제품 기본값으로 문서화되지 않음 |
| AUTH-003 | auth mode `token` | 비대상 | 필요 | 안정화 | bearer principal과 scope guard가 계약대로 동작 |
| AUTH-004 | auth mode `session` | 간접 | 필요 | 안정화, UI | login cookie 기반 보호 route 접근/차단 확인 |
| AUTH-005 | users file 없음 또는 admin passwordHash 없음 시 setup 유도 | 필요 | 필요 | 안정화, UI | `/setup` redirect와 bootstrap 후 `/login` redirect 확인 |
| AUTH-006 | 기본 admin username `admin` | 필요 | 필요 | 안정화, UI | setup/login/user 화면에서 기본 admin 정책 일치 |
| AUTH-007 | passwordless admin login 금지 | 필요 | 필요 | 안정화, UI | 빈 password 또는 hash 없는 admin으로 login 불가 |
| AUTH-008 | password hash 저장 | 비대상 | 필요 | 안정화 | 평문/단순 hash 저장 없음 |
| AUTH-009 | password history 저장 | 비대상 | 필요 | 안정화 | reuse rejection에 필요한 history가 저장/검증됨 |
| AUTH-010 | token hash 저장 | 비대상 | 필요 | 안정화 | token 원문이 저장/API 응답에 노출되지 않음 |
| AUTH-011 | invite token hash 저장 | 비대상 | 필요 | 안정화 | invite token 원문 저장/API 노출 없음 |
| AUTH-012 | passwordHash API/UI 비노출 | 비대상 | 필요 | 안정화, UI | API 응답과 admin/user UI에 hash가 보이지 않음 |
| AUTH-013 | passwordHistory API/UI 비노출 | 비대상 | 필요 | 안정화, UI | API 응답과 admin/user UI에 history가 보이지 않음 |
| AUTH-014 | tokenHash API/UI 비노출 | 비대상 | 필요 | 안정화, UI | API 응답과 UI에 tokenHash가 보이지 않음 |
| AUTH-015 | invite tokenHash API/UI 비노출 | 비대상 | 필요 | 안정화, UI | invite list/detail에 hash가 보이지 않음 |
| AUTH-016 | session cookie 로그인 | 간접 | 필요 | 안정화, UI | cookie 세션으로 role landing과 logout이 동작 |
| AUTH-017 | 현재 사용자 whoami 조회 | 간접 | 필요 | 안정화 | username/role/scopes/view scope가 세션과 일치 |
| AUTH-018 | 사용자 생성 | 필요 | 필요 | 안정화, UI | `/ops/users`에서 create 성공과 validation 확인 |
| AUTH-019 | 사용자 수정 | 필요 | 필요 | 안정화, UI | role/scope/status 수정 후 목록/detail 반영 |
| AUTH-020 | 사용자 삭제 또는 비활성화 | 필요 | 필요 | 안정화, UI | disable/delete action 후 login/access 차단 |
| AUTH-021 | 사용자 활성화 | 필요 | 필요 | 안정화, UI | disabled user restore 후 의도된 접근 복구 |
| AUTH-022 | 사용자 비밀번호 초기화 | 필요 | 필요 | 안정화, UI | reset은 password history 우회가 아님을 확인하고, reset 성공 시 must-change/password flow와 session revoke 확인 |
| AUTH-023 | 마지막 admin 비활성화 방지 | 필요 | 필요 | 안정화, UI | 마지막 admin disable/role change가 거부 copy를 표시 |
| AUTH-024 | role: admin | 필요 | 필요 | 안정화, UI | ops/users/rules/sources 접근과 admin action 허용 |
| AUTH-025 | role: operator | 필요 | 필요 | 안정화, UI | ops 운영 범위 접근과 admin-only action 차단 |
| AUTH-026 | role: viewer | 필요 | 필요 | 안정화, UI | client만 접근, ops/lab 차단 |
| AUTH-027 | role: integrator | 필요 | 필요 | 안정화, UI | API/scope 중심 접근과 제품 UI 경계 확인 |
| AUTH-028 | scope: ops 읽기 | 간접 | 필요 | 안정화, UI | read-only route/API 허용, write action 차단 |
| AUTH-029 | scope: source/rule 쓰기 | 간접 | 필요 | 안정화, UI | `source:write`는 source/view mutation, `rule:write`는 Rule/Profile mutation만 허용하고 다른 write action은 차단 |
| AUTH-030 | scope: client/view 접근 | 간접 | 필요 | 안정화, UI | assigned view만 client 화면에 표시 |
| AUTH-031 | scope: lab 읽기 | 비대상 | 필요 | 안정화 | lab API read guard가 scope와 일치 |
| AUTH-032 | Lab API operator 또는 `lab:read` guard | 비대상 | 필요 | 안정화 | 별도 `lab:write` scope를 만들지 않고 `require_lab_principal`이 operator role 또는 `lab:read` scope만 허용 |
| AUTH-033 | 초대 생성 | 필요 | 필요 | 안정화, UI | invite 생성 UI/API 성공, 원문 token 기록 금지 |
| AUTH-034 | 초대 수락 | 필요 | 필요 | 안정화, UI | invite setup 후 login/client 접근 확인 |
| AUTH-035 | 초대 만료/무효 처리 | 간접 | 필요 | 안정화, UI | expired/consumed token이 거부됨 |
| AUTH-036 | client 접근 요청 생성 | 필요 | 필요 | 안정화, UI | public request 제출 후 pending 상태 확인 |
| AUTH-037 | client 접근 요청 승인 | 필요 | 필요 | 안정화, UI | approve 후 invite/view scope 생성 확인 |
| AUTH-038 | client 접근 요청 거절 | 필요 | 필요 | 안정화, UI | reject 후 invite/session/view scope 미생성 확인 |
| AUTH-039 | 승인 전 client self-signup scope 미부여 | 간접 | 필요 | 안정화, UI | pending 상태에서 user/session/view 접근 없음 |
| AUTH-040 | route guard | 간접 | 필요 | 안정화, UI | role별 보호 route 접근/차단이 브라우저와 API에서 일치 |
| AUTH-041 | API 권한 guard | 비대상 | 필요 | 안정화 | unauthorized/forbidden status와 payload redaction 확인 |
| AUTH-042 | CORS / origin guard | 비대상 | 필요 | 안정화 | 허용되지 않은 origin이 차단됨 |

## C. Channel, Source, Published View

| ID | 기능 | UI 필요 | 테스트 필요 | 테스트 영역 | PASS 기준 |
| --- | --- | --- | --- | --- | --- |
| SRC-001 | file source 등록 | 필요 | 필요 | 안정화, UI | `/ops/sources` file source form의 `kind=file` 저장 후 `/ops/api/sources` 목록과 PublishedView 선택에서 사용 가능 |
| SRC-002 | RTSP pull source 등록 | 필요 | 필요 | 안정화, UI, 30분 | RTSP URL 저장, health/session 지속성 확인 |
| SRC-003 | HTTP/HLS URI source 등록 | 필요 | 필요 | 안정화, UI, 30분 | URI 저장, 재생/health 상태 확인 |
| SRC-004 | external WHEP playback URL source 등록 | 필요 | 필요 | 안정화, UI, 30분 | WHEP URL 저장, client wrapper session 생성/삭제, WHEP source sample ready 확인 |
| SRC-005 | internal WHIP published source 등록 | 필요 | 필요 | 안정화, UI, 30분 | WHIP publish sourceId가 view/source registry에 반영 |
| SRC-006 | source 목록 조회 | 필요 | 필요 | 안정화, UI | 목록 row/count/status가 API와 일치 |
| SRC-007 | source 상세 조회 | 필요 | 필요 | 안정화, UI | detail panel/route가 source fields를 표시 |
| SRC-008 | source 생성 | 필요 | 필요 | 안정화, UI | create validation, 빈 채널 이름 거부, 성공 row 반영 |
| SRC-009 | source 수정 | 필요 | 필요 | 안정화, UI | `/ops/sources` edit save가 `PUT /ops/api/sources/{sourceId}`로 반영되고 source API와 table row가 같은 displayName/zone을 표시 |
| SRC-010 | source 비활성화 (`DELETE`) | 필요 | 필요 | 안정화, UI | `DELETE /ops/api/sources/{sourceId}`가 record를 제거하지 않고 `enabled=false`로 soft-disable하며 연결된 view/session 접근은 비활성 source guard로 차단 |
| SRC-011 | source 활성/비활성 상태 | 필요 | 필요 | 안정화, UI | disabled source가 view/session/rule에서 차단됨 |
| SRC-012 | source health 조회 | 필요 | 필요 | 안정화, UI, 30분 | health status가 dashboard/list와 V240-S04 client-safe source health summary에 반영 |
| SRC-013 | source health bulk 조회 | 간접 | 필요 | 안정화 | bulk response schema와 status 집계 확인 |
| SRC-014 | ONVIF import draft | 필요 | 필요 | 안정화, UI | no-device 경계와 실기기 endpoint 조건을 안정화/UI 기록 안에서 분리하고 V230-S04 `verify-v230-conditional-field-evidence`에서 approved environment only, redacted field report, not-run is not PASS 경계를 확인 |
| SRC-015 | channel bulk API | 비대상 | 필요 | 안정화 | 제품 `/ops/sources`에는 channel bulk UI가 없어야 정상이며, `/ops/api/channels/bulk` payload/schema/status/partial failure/rollback/retry 계약이 `verify-ops-channel-bulk`에서 통과 |
| SRC-016 | PublishedView 목록 조회 | 필요 | 필요 | 안정화, UI | view 목록/count/scope 표시 확인 |
| SRC-017 | PublishedView 생성 | 필요 | 필요 | 안정화, UI | create 후 client/viewer scope에서 선택 가능 |
| SRC-018 | PublishedView 수정 | 필요 | 필요 | 안정화, UI | source/rule/scope 변경 후 반영 |
| SRC-019 | PublishedView 비활성화 (`DELETE`) | 필요 | 필요 | 안정화, UI | `DELETE /ops/api/views/{viewId}`가 record를 제거하지 않고 `enabled=false`로 soft-disable한 뒤 client view와 신규 session 접근을 차단 |
| SRC-020 | PublishedView 활성/비활성 | 필요 | 필요 | 안정화, UI | inactive view가 client/rule/session에서 차단 |
| SRC-021 | View별 source 연결 | 필요 | 필요 | 안정화, UI | view-source mapping이 client live에 반영 |
| SRC-022 | View별 allowed rule list | 필요 | 필요 | 안정화, UI | PublishedView `allowedRuleIds`가 client list/detail API에 유지되고 허용 rule만 client session/metadata에 반영 |
| SRC-023 | View별 viewer 접근 범위 | 필요 | 필요 | 안정화, UI | viewer별 assigned view만 노출 |
| SRC-024 | View별 WebRTC client wrapper | 간접 | 필요 | 안정화, UI, 30분 | wrapper session 생성/종료와 media path 확인 |
| SRC-025 | View별 dashboard | 필요 | 필요 | 안정화, UI | view-scoped dashboard가 assigned data만 표시 |
| SRC-026 | View별 events | 필요 | 필요 | 안정화, UI | view-scoped events가 assigned data만 표시 |
| SRC-027 | View별 metadata | 간접 | 필요 | 안정화 | metadata endpoint/schema가 view scope와 일치 |
| SRC-028 | Client preview as admin 표시 | 필요 | 필요 | UI | admin client 화면에 preview 상태가 명확히 표시 |
| SRC-029 | viewer에게 source URL 비노출 | 필요 | 필요 | 안정화, UI | client 화면/API에 source URL이 보이지 않음 |
| SRC-030 | viewer에게 developer URL 비노출 | 필요 | 필요 | 안정화, UI | client 화면에 Developer URL이 보이지 않음 |
| SRC-031 | ONVIF credential binding/store gate | 간접 | 필요 | 안정화, UI | `/ops/api/onvif/import-draft`가 `credentialGate` summary만 반환하고 `source:write` guard, URL credential reject, SourceRegistry/PublishedView secret field 비저장을 유지함 |
| SRC-032 | Evidence intake source health readiness | 간접 | 필요 | 안정화, UI | v2.8.0 evidence intake가 source health recheck 준비 상태를 표시하되 source registry write, credential 원문 저장, external endpoint 성공 보장, Event POST/WebRTC/SSE/WS/media path 변경을 만들지 않음 |
| SRC-033 | V330 Step 2 Source Registry Snapshot and Identity | 비대상 | 필요 | 안정화 | 비대상: 제품 UI 없어야 정상. `/ops/api/source-registry/snapshot`이 sourceId, source kind, PublishedView 연결, canonical source key, owner/site/group context를 Ops-only read model로 반환하고 source registry/PublishedView write와 viewer/client 노출을 만들지 않음 |
| SRC-034 | V330 Step 3 Source Onboarding Quality Summary | 필요 | 필요 | 안정화, UI | `/ops/api/source-registry/onboarding-quality`과 `/ops/sources`가 채널 저장 전 validation, 중복/충돌/누락/ready 상태, ONVIF/WHEP/RTSP 입력 품질 요약을 표시하고 raw locator/credential/client exposure/source registry write를 만들지 않음 |
| SRC-035 | V330 Step 4 Reliability Timeline and Health History | 필요 | 필요 | 안정화, UI | `/ops/api/source-registry/reliability-timeline`과 `/ops/sources`가 live/stale/offline/reconnect/source warning 변화 이력과 Ops audit 연결을 표시하고 raw locator/credential/client exposure/source registry write를 만들지 않음 |
| SRC-036 | V330 Step 5 Incident-to-Source Correlation source context | 필요 | 필요 | 안정화, UI | `/ops/api/events/reviews`의 incidentSourceCorrelation이 기존 sourceReliability와 source-health-state-change audit handoff만 읽어 source 원인/context를 연결하고 raw locator/credential/client exposure/source registry write를 만들지 않음 |
| SRC-037 | V330 Step 6 Operator Recheck and Recovery source context | 필요 | 필요 | 안정화, UI | `/ops/api/events/reviews`의 operatorRecheckRecoveryQueue가 기존 sourceReliability와 incidentSourceCorrelation만 읽어 failed-only source recheck와 retry candidate를 요약하고 raw locator/credential/client exposure/source registry write를 만들지 않음 |
| SRC-038 | V330 Step 7 client-safe source status context | 필요 | 필요 | 안정화, UI | `/client/api/views/{id}/events`와 client dashboard payload가 PublishedView-scoped source/tap 상태만 읽어 source status와 connection health를 요약하고 source URL/raw locator/credential/client scope 외 노출/source registry write를 만들지 않음 |
| SRC-039 | V330 Step 9 source reliability search metrics view model | 필요 | 필요 | 안정화, UI | `/ops/api/source-registry/reliability-search-metrics`가 기존 source health snapshot과 source-health-state-change audit history만 읽어 source health filters, saved reliability view presets, reconnect/stale/offline metric summary를 요약하고 source registry write/PublishedView write/saved view write/raw locator/credential/client exposure를 만들지 않음 |
| SRC-040 | V330 Step 10 backup recovery source handoff view model | 필요 | 필요 | 안정화, UI | `/ops/api/source-registry/backup-recovery-handoff`가 기존 SourceRegistry/PublishedView snapshot과 source health snapshot만 읽어 recovery validation plan 입력을 요약하고 source registry write/PublishedView write/backup artifact persistence/raw locator/credential/client exposure를 만들지 않음 |
| SRC-041 | V340 Step 3 recovery candidate package read model | 비대상 | 필요 | 안정화 | `verify-v340-recovery-candidate-package`가 SourceRegistry snapshot, PublishedView, source health를 redacted recovery candidate package로 조합하고 source registry write/PublishedView write/source locator 노출이 없음을 확인 |
| SRC-042 | V340 Step 5 source health replay drift diff read model | 비대상 | 필요 | 안정화 | `verify-v340-source-health-replay-drift-diff`가 handoff source health와 fresh source health를 비교해 stale/offline/reconnect/warning drift를 요약하고 source registry write/PublishedView write/source locator 노출이 없음을 확인 |
| SRC-043 | V340 Step 10 ONVIF real-device condition gate | 비대상 | 필요 | 안정화 | `verify-v340-field-bridge-condition-gates`가 ONVIF 실기기 endpoint/credential/operator approval 조건을 field-smoke-needed/not-run으로 분리하고 source-only PASS, fixture PASS, source health PASS를 ONVIF 실기기 PASS로 대체하지 않음을 확인 |
| SRC-044 | V350 Step 2 live operations source graph projection | 비대상 | 필요 | 안정화 | `verify-v350-live-operations-graph-contract`가 SourceRegistry snapshot, PublishedView, source health, continuity drill package를 `/ops/api/live-operations/graph` read model에 연결하되 source registry/PublishedView write와 raw locator/credential 노출을 만들지 않음 |
| SRC-045 | V350 Step 3 source recheck/recovery command candidates | 비대상 | 필요 | 안정화 | `verify-v350-operations-command-plan-contract`가 source recheck/recovery/maintenance 후보를 draft-only command plan으로 표시하고 source recheck 실행, recovery 실행, source registry/PublishedView write를 수행하지 않음을 확인 |
| SRC-046 | V350 Step 5 source/view staged change candidate | 비대상 | 필요 | 안정화 | `verify-v350-staged-change-plan-impact-preview`가 source/view 변경 후보를 staging plan과 impact preview로만 산출하고 source registry/PublishedView write, apply execution, raw locator/credential 노출을 수행하지 않음을 확인 |
| SRC-047 | V350 Step 11 ONVIF field evidence intake | 비대상 | 필요 | 안정화 | `verify-v350-field-evidence-intake`가 ONVIF 실기기 field evidence를 redacted intake/not-run 상태로만 수집하고 endpoint probe, credential probe, source registry write, raw locator/credential 노출을 수행하지 않음을 확인 |
| SRC-048 | V350 Step 12 source relation explanation context | 비대상 | 필요 | 안정화 | `verify-v350-vlm-assisted-ops-explanation`이 source health와 command plan context를 default-off VLM 보조 설명 입력으로만 요약하고 source registry/PublishedView write, raw locator/credential 노출, VLM/provider call을 수행하지 않음을 확인 |
| SRC-049 | V360 Step 2 SourceRegistry/PublishedView simulation input | 비대상 | 필요 | 안정화 | `verify-v360-simulation-input-contract`가 SourceRegistry, PublishedView, source health, command plan, staged plan을 read-only simulation input pack으로 묶고 source registry/PublishedView write, raw locator/credential 노출, media/schema 변경을 수행하지 않음을 확인 |
| SRC-050 | V360 Step 4 command plan dry-run source candidates | 비대상 | 필요 | 안정화 | `verify-v360-command-plan-dry-run-simulator`가 source recheck/recovery/maintenance 후보를 dry-run 결과로 계산하되 source recheck 실행, recovery 실행, source registry/PublishedView write를 수행하지 않음을 확인 |
| SRC-051 | V360 Step 5 source health impact diff | 비대상 | 필요 | 안정화 | `verify-v360-source-rule-impact-diff`가 source/view 변경 후보 전후의 source health diff를 read-only로 표시하고 source/view apply, source registry/PublishedView write, raw locator/credential 노출을 수행하지 않음을 확인 |
| SRC-052 | V360 Step 12 ONVIF simulation field evidence adapter | 비대상 | 필요 | 안정화 | `verify-v360-field-evidence-simulation-adapter`가 ONVIF 실기기 조건을 conditional/not-run simulation evidence로만 연결하고 endpoint probe, credential probe, source registry write, raw locator/credential 노출을 수행하지 않음을 확인 |
| SRC-053 | V360 Step 13 source simulation explanation context | 비대상 | 필요 | 안정화 | `verify-v360-vlm-assisted-simulation-explanation`이 source health와 simulation impact diff를 default-off VLM 보조 설명 입력으로만 요약하고 source registry/PublishedView write, raw locator/credential 노출, VLM/provider call을 수행하지 않음을 확인 |
| SRC-054 | V370 Step 2 site/source group contract | 비대상 | 필요 | 안정화 | `verify-v370-site-source-group-contract`가 site, sourceGroup, zone, viewGroup read model과 no-auto-write boundary를 확인하되 SourceRegistry/PublishedView write, viewer/client 노출, raw locator/credential 노출을 수행하지 않음 |
| SRC-055 | V370 Step 3 site-aware source registry projection | 비대상 | 필요 | 안정화 | `verify-v370-site-aware-source-registry-projection`가 SourceRegistry/PublishedView snapshot을 site/source group Ops-only projection으로 묶고 source/view write, viewer/client 노출, raw locator/credential 노출을 수행하지 않음을 확인 |
| SRC-056 | V370 Step 4 site health rollup source grouping | 비대상 | 필요 | 안정화 | `verify-v370-site-health-rollup`이 source health를 site/source group 단위로 offline/degraded/recovering/field-needed 상태로 집계하되 source health persistence, recovery execution, field smoke 실행을 수행하지 않음을 확인 |
| SRC-057 | V370 Step 5 site impact graph source linkage | 비대상 | 필요 | 안정화 | `verify-v370-site-impact-graph`가 SourceRegistry/PublishedView source refs를 site/source group graph node/edge로 연결하되 source/view write, raw locator/credential/debug material 노출, viewer/client payload 변경을 수행하지 않음을 확인 |
| SRC-058 | V370 Step 6 site simulation input source projection | 비대상 | 필요 | 안정화 | `verify-v370-site-simulation-input-pack`이 SourceRegistry/PublishedView source refs를 site/source group simulation input pack으로만 묶고 source/view write, raw locator/credential material 노출, simulation run을 수행하지 않음을 확인 |
| SRC-059 | V370 Step 7 cross-site readiness source scope | 비대상 | 필요 | 안정화 | `verify-v370-cross-site-safe-apply-readiness`가 source 변경 후보를 site/source group safe-apply readiness로만 매핑하고 source registry/PublishedView write, source change apply, raw locator/credential material 노출을 수행하지 않음을 확인 |
| SRC-060 | V370 Step 14 site/runbook field evidence source refs | 비대상 | 필요 | 안정화 | `verify-v370-field-evidence-attachment`가 SourceRegistry/PublishedView site/source group projection과 runbook ledger refs에 ONVIF 조건부/not-run evidence를 연결하되 source registry/PublishedView write, endpoint probe, credential probe, raw locator/credential 노출을 수행하지 않음을 확인 |
| SRC-061 | V370 Step 15 source recheck pilot candidate | 비대상 | 필요 | 안정화 | `verify-v370-limited-safe-execution-pilot`이 source recheck를 lowest-risk approval-gated pilot candidate로만 분리하고 source recheck 실행, source registry/PublishedView write, raw locator/credential 노출을 수행하지 않음을 확인 |
| SRC-062 | V370 Step 16 source outcome reconciliation | 비대상 | 필요 | 안정화 | `verify-v370-outcome-reconciliation`이 pre-simulation SourceRegistry/site impact ref와 post-execution not-run ref를 source impact diff로 비교하되 source recheck 실행, source registry/PublishedView write, raw locator/credential 노출을 수행하지 않음을 확인 |
| SRC-063 | V380 Step 14 ONVIF field connector evidence refs | 비대상 | 필요 | 안정화 | `verify-v380-field-connector-evidence-package`가 v3.7 field attachment와 v3.8 readiness/receipt refs에 ONVIF connector evidence를 credential/endpoint approval 조건으로만 연결하고 ONVIF 실기기 contact, endpoint probe, credential probe, source registry/PublishedView write, raw locator/credential 노출을 수행하지 않음을 확인 |
| SRC-064 | V380 Step 15 source readiness explanation context | 비대상 | 필요 | 안정화 | `verify-v380-default-off-action-explanation`이 source/readiness/field connector refs를 default-off explanation context로만 요약하고 source recheck 실행, source registry/PublishedView write, raw locator/credential 노출, VLM/provider call을 수행하지 않음을 확인 |
| SRC-065 | V390 Step 11 ONVIF provider readiness status summary | 간접 | 필요 | 안정화, UI | `verify-v390-onvif-credential-provider-status`가 `/ops/api/onvif/credential-provider-status`를 SourceRegistry/PublishedView write와 분리된 status summary로 검증하고, provider decision이 `none`/`in-memory-fixture`/persistent store deferred로 표시되며 raw locator, credential reference value, secret material을 source/view/client payload에 포함하지 않음을 확인 |
| SRC-066 | V390 ONVIF paired source/view save | 간접 | 필요 | 안정화, UI | `UpsertOnvifSourceView`가 source/view를 모두 선검증하고 한 registry lock에서 durable prepared/committed marker와 byte-exact rollback snapshot을 만든 뒤 두 파일을 저장하며, restart recovery가 prepared crash는 이전 pair로 복구하고 committed crash는 새 pair를 유지한 뒤 success에서만 두 memory vector를 함께 반영함을 확인 |
| SRC-067 | V390 Step 15 staging restore validation source/view refs | 간접 | 필요 | 안정화, UI | `verify-v390-backup-recovery-handoff-validation`이 SourceRegistry snapshot, PublishedView registry, source health snapshot, viewer scope validation을 staging restore checklist/result artifact contract로 연결하되 source registry/PublishedView write, production restore cutover, raw locator/credential 노출을 수행하지 않음을 확인 |
| SRC-068 | V390 Step 17 field evidence source approval boundary | 간접 | 필요 | 안정화, UI | `verify-v390-conditional-field-ai-decisions`가 ONVIF/source field evidence를 approval-only minimal evidence bridge로만 표시하고 SourceRegistry/PublishedView write, endpoint probe, credential probe, raw locator/credential 노출, field success PASS 승격을 수행하지 않음을 확인 |

## D. Rule, Profile, Scenario, Tracker

| ID | 기능 | UI 필요 | 테스트 필요 | 테스트 영역 | PASS 기준 |
| --- | --- | --- | --- | --- | --- |
| RULE-001 | `/ops/rules` VA rule/channel analysis setting 목록 | 필요 | 필요 | 안정화, UI | list count/status/source/type/profile이 표시됨 |
| RULE-002 | `/ops/rules` event template 목록 | 필요 | 필요 | 안정화, UI | template 목록과 type/scenario summary 표시 |
| RULE-003 | `/ops/rules` analysis profile 목록 | 필요 | 필요 | 안정화, UI | profile 목록과 detector/FPS/tracking summary 표시 |
| RULE-004 | channel analysis setting 생성 | 필요 | 필요 | 안정화, UI | source/template/profile/geometry 선택 후 저장 성공 |
| RULE-005 | channel analysis setting 수정 | 필요 | 필요 | 안정화, UI | 변경 값 저장 후 list/detail 반영 |
| RULE-006 | channel analysis setting 삭제 | 필요 | 필요 | 안정화, UI | 삭제 후 allowed rule/session에서 제거 |
| RULE-007 | channel analysis setting 상세 보기 | 필요 | 필요 | 안정화, UI | detail에 source/template/profile/geometry/status 표시 |
| RULE-008 | channel analysis setting apply/active 상태 | 필요 | 필요 | 안정화, UI | active/inactive 전환과 적용 상태 반영 |
| RULE-009 | channel analysis setting source 선택 | 필요 | 필요 | 안정화, UI | source select와 validation 동작 |
| RULE-010 | channel analysis setting event template 연결 | 필요 | 필요 | 안정화, UI | template 선택과 저장 payload 반영 |
| RULE-011 | channel analysis setting analysis profile 연결 | 필요 | 필요 | 안정화, UI | profile 선택과 저장 payload 반영 |
| RULE-012 | channel analysis setting region geometry 설정 | 필요 | 필요 | 안정화, UI | polygon/region 값 입력/초기화/저장 |
| RULE-013 | channel analysis setting line geometry 설정 | 필요 | 필요 | 안정화, UI | line points/direction 입력/저장 |
| RULE-014 | channel analysis setting output URL 표시 | 필요 | 필요 | UI | output URL/copy 표시가 role 정책과 일치 |
| RULE-015 | channel analysis setting status 표시 | 필요 | 필요 | 안정화, UI | status badge/copy가 runtime/API와 일치 |
| RULE-016 | vaRule numeric id 자동 생성 | 필요 | 필요 | 안정화, UI | 사용자가 직접 id 입력하지 않고 다음 번호가 부여 |
| RULE-017 | vaRule id 직접 입력 방지 | 필요 | 필요 | 안정화, UI | id field가 노출/수정되지 않음 |
| RULE-018 | event template 생성 | 필요 | 필요 | 안정화, UI | basic/scenario template 생성 성공 |
| RULE-019 | event template 수정 | 필요 | 필요 | 안정화, UI | type/condition 변경 저장 후 반영 |
| RULE-020 | event template 삭제 | 필요 | 필요 | 안정화, UI | 삭제 후 참조 rule validation 확인 |
| RULE-021 | event template 상세 보기 | 필요 | 필요 | 안정화, UI | condition/geometry/cooldown summary 표시 |
| RULE-022 | analysis profile 생성 | 필요 | 필요 | 안정화, UI | detector/FPS/queue/input/tracker 설정 저장 |
| RULE-023 | analysis profile 수정 | 필요 | 필요 | 안정화, UI | profile field 변경 후 반영 |
| RULE-024 | analysis profile 삭제 | 필요 | 필요 | 안정화, UI | 삭제 후 참조 rule validation 확인 |
| RULE-025 | analysis profile 상세 보기 | 필요 | 필요 | 안정화, UI | detector/FPS/queue/tracker/Re-ID 표시 |
| RULE-026 | detector: YOLO/ONNX | 필요 | 필요 | 안정화, UI | detector 선택과 payload 저장 |
| RULE-027 | detector: dummy | 필요 | 필요 | 안정화, UI | dummy detector 선택과 payload 저장 |
| RULE-028 | profile FPS 설정 | 필요 | 필요 | 안정화, UI | numeric input validation과 저장 |
| RULE-029 | profile queue 설정 | 필요 | 필요 | 안정화, UI | queue input validation과 저장 |
| RULE-030 | profile confidence 설정 | 필요 | 필요 | 안정화, UI | confidence range validation과 저장 |
| RULE-031 | profile NMS 설정 | 필요 | 필요 | 안정화, UI | NMS range validation과 저장 |
| RULE-032 | profile input size 설정 | 필요 | 필요 | 안정화, UI | width/height validation과 저장 |
| RULE-033 | profile tracking category 표시 | 필요 | 필요 | UI | tracking category summary가 선택 값과 일치 |
| RULE-034 | tracker `none` | 필요 | 필요 | 안정화, UI | tracker none 저장과 Re-ID off 정책 확인 |
| RULE-035 | tracker `lite` | 필요 | 필요 | 안정화, UI, 30분 | lite 저장과 runtime 안정성 확인 |
| RULE-036 | tracker `kalman-lite` | 필요 | 필요 | 안정화, UI, 30분 | kalman-lite 저장과 runtime 안정성 확인 |
| RULE-037 | tracker `bytetrack` | 필요 | 필요 | 안정화, UI, 30분 | bytetrack 저장과 runtime 안정성 확인 |
| RULE-038 | Re-ID `off` | 필요 | 필요 | 안정화, UI | Re-ID off 저장과 metadata policy 확인 |
| RULE-039 | Re-ID `assist` | 필요 | 필요 | 안정화, UI, 30분 | assist 저장과 tracker 조합 정책 확인 |
| RULE-040 | `tracker=none`이면 Re-ID off 강제 또는 거부 | 필요 | 필요 | 안정화, UI | invalid 조합이 저장되지 않거나 off로 정규화 |
| RULE-041 | basic event: presence | 필요 | 필요 | 안정화, UI | template 생성과 최종 EventRecord `presence` 발생 이력 확인 |
| RULE-042 | basic event: enter | 필요 | 필요 | 안정화, UI | template 생성과 최종 EventRecord `enter` 발생 이력 확인 |
| RULE-043 | basic event: exit | 필요 | 필요 | 안정화, UI | template 생성과 최종 EventRecord `exit` 발생 이력 확인 |
| RULE-044 | basic event: line-crossing | 필요 | 필요 | 안정화, UI | line geometry/direction 저장과 최종 EventRecord `line-crossing` 발생 이력 확인 |
| RULE-045 | line direction: any | 필요 | 필요 | 안정화, UI | any direction 저장과 적용 확인 |
| RULE-046 | line direction: forward | 필요 | 필요 | 안정화, UI | forward 저장과 적용 확인 |
| RULE-047 | line direction: reverse | 필요 | 필요 | 안정화, UI | reverse 저장과 적용 확인 |
| RULE-048 | scenario: intrusion-dwell | 필요 | 필요 | 안정화, UI | scenario UI 저장과 최종 EventRecord `intrusion-dwell` 발생 이력 확인 |
| RULE-049 | scenario: re-entry | 필요 | 필요 | 안정화, UI | scenario UI 저장과 최종 EventRecord `re-entry` 발생 이력 확인 |
| RULE-050 | scenario: wrong-direction | 필요 | 필요 | 안정화, UI | scenario UI 저장과 최종 EventRecord `wrong-direction` 발생 이력 확인 |
| RULE-051 | scenario: intrusion-after-line-crossing | 필요 | 필요 | 안정화, UI | scenario UI 저장과 최종 EventRecord `intrusion-after-line-crossing` 발생 이력 확인 |
| RULE-052 | scenario: loitering | 필요 | 필요 | 안정화, UI | scenario UI 저장과 최종 EventRecord `loitering` 발생 이력 확인 |
| RULE-053 | scenario: zone-occupancy | 필요 | 필요 | 안정화, UI | scenario UI 저장과 최종 EventRecord `zone-occupancy` 발생 이력 확인 |
| RULE-054 | scenario preset: default | 필요 | 필요 | 안정화, UI | preset 선택 후 condition 값 반영 |
| RULE-055 | scenario preset: road | 필요 | 필요 | 안정화, UI | preset 선택 후 condition 값 반영 |
| RULE-056 | scenario preset: retail | 필요 | 필요 | 안정화, UI | preset 선택 후 condition 값 반영 |
| RULE-057 | scenario preset: park | 필요 | 필요 | 안정화, UI | preset 선택 후 condition 값 반영 |
| RULE-058 | scenario preset: indoor | 필요 | 필요 | 안정화, UI | preset 선택 후 condition 값 반영 |
| RULE-059 | scenario preset: lobby | 필요 | 필요 | 안정화, UI | preset 선택 후 condition 값 반영 |
| RULE-060 | scenario preset: platform | 필요 | 필요 | 안정화, UI | preset 선택 후 condition 값 반영 |
| RULE-061 | scenario preset: entrance | 필요 | 필요 | 안정화, UI | preset 선택 후 condition 값 반영 |
| RULE-062 | scenario preset: doorway | 필요 | 필요 | 안정화, UI | preset 선택 후 condition 값 반영 |
| RULE-063 | scenario preset: parking | 필요 | 필요 | 안정화, UI | preset 선택 후 condition 값 반영 |
| RULE-064 | scenario preset: elevator | 필요 | 필요 | 안정화, UI | preset 선택 후 condition 값 반영 |
| RULE-065 | scenario preset: custom | 필요 | 필요 | 안정화, UI | custom value 입력과 저장 확인 |
| RULE-066 | intrusion-dwell zone 설정 | 필요 | 필요 | 안정화, UI | zone geometry 저장과 payload 반영 |
| RULE-067 | intrusion-dwell candidate time 설정 | 필요 | 필요 | 안정화, UI | candidateTime validation과 저장 |
| RULE-068 | intrusion-dwell dwell time 설정 | 필요 | 필요 | 안정화, UI | dwellTime validation과 저장 |
| RULE-069 | intrusion-dwell cooldown 설정 | 필요 | 필요 | 안정화, UI | cooldown validation과 저장 |
| RULE-070 | re-entry polygon zone 설정 | 필요 | 필요 | 안정화, UI | polygon zone 저장 |
| RULE-071 | re-entry window 설정 | 필요 | 필요 | 안정화, UI | reEntryWindow validation과 저장 |
| RULE-072 | re-entry cooldown 설정 | 필요 | 필요 | 안정화, UI | cooldown validation과 저장 |
| RULE-073 | wrong-direction line geometry 설정 | 필요 | 필요 | 안정화, UI | line geometry 저장 |
| RULE-074 | wrong-direction allowed direction 설정 | 필요 | 필요 | 안정화, UI | allowed direction에서 `any` 제외 정책 확인 |
| RULE-075 | wrong-direction cooldown 설정 | 필요 | 필요 | 안정화, UI | cooldown validation과 저장 |
| RULE-076 | intrusion-after-line-crossing trigger line 설정 | 필요 | 필요 | 안정화, UI | trigger line 저장 |
| RULE-077 | intrusion-after-line-crossing crossing direction 설정 | 필요 | 필요 | 안정화, UI | any/forward/reverse 저장 |
| RULE-078 | intrusion-after-line-crossing target zone 설정 | 필요 | 필요 | 안정화, UI | target zone 저장 |
| RULE-079 | intrusion-after-line-crossing max delay 설정 | 필요 | 필요 | 안정화, UI | maxDelayAfterCrossingMs validation과 저장 |
| RULE-080 | intrusion-after-line-crossing dwell 설정 | 필요 | 필요 | 안정화, UI | dwell validation과 저장 |
| RULE-081 | intrusion-after-line-crossing cooldown 설정 | 필요 | 필요 | 안정화, UI | cooldown validation과 저장 |
| RULE-082 | loitering target zone 설정 | 필요 | 필요 | 안정화, UI | target zone 저장 |
| RULE-083 | loitering min dwell 설정 | 필요 | 필요 | 안정화, UI | min dwell validation과 저장 |
| RULE-084 | loitering movement radius 설정 | 필요 | 필요 | 안정화, UI | radius validation과 저장 |
| RULE-085 | loitering trajectory points 설정 | 필요 | 필요 | 안정화, UI | min points validation과 저장 |
| RULE-086 | loitering cooldown 설정 | 필요 | 필요 | 안정화, UI | cooldown validation과 저장 |
| RULE-087 | loitering ground-plane 옵션 | 필요 | 필요 | 안정화, UI | `/ops/rules` loitering form의 ground-plane toggle이 표시되고 `scenario.useGroundPlaneMovementRadius` 저장/재조회에 반영 |
| RULE-088 | zone-occupancy target zone 설정 | 필요 | 필요 | 안정화, UI | target zone 저장 |
| RULE-089 | zone-occupancy threshold 설정 | 필요 | 필요 | 안정화, UI | threshold validation과 저장 |
| RULE-090 | zone-occupancy min dwell 설정 | 필요 | 필요 | 안정화, UI | min dwell validation과 저장 |
| RULE-091 | zone-occupancy cooldown 설정 | 필요 | 필요 | 안정화, UI | cooldown validation과 저장 |
| RULE-092 | duplicate id 검증 | 필요 | 필요 | 안정화, UI | `/ops/rules` validation panel이 VA rule/event template/profile 중복 ID를 표시하고, 서버 create API가 기존 event template/VA rule ID 재생성을 거부 |
| RULE-093 | missing template/profile 검증 | 필요 | 필요 | 안정화, UI | `/ops/rules` 저장 전 missing profile과 missing template을 각각 차단하고, 서버가 `analysis.profileId`/`templateStart.ruleId` missing reference 저장을 거부 |
| RULE-094 | inactive template/profile 검증 | 필요 | 필요 | 안정화, UI | `/ops/rules` 저장 전 inactive profile과 inactive template을 각각 차단하고, 서버가 inactive `analysis.profileId`/`templateStart.ruleId` 저장을 거부 |
| RULE-095 | source mismatch 검증 | 필요 | 필요 | 안정화, UI | `/ops/rules` validation matrix가 source mismatch를 표시하고, mismatched PublishedView `va-rule` session apply가 `vaRule source must match PublishedView source`로 거부 |
| RULE-096 | inactive channel/View 검증 | 필요 | 필요 | 안정화, UI | `/ops/rules` validation matrix가 inactive channel/view를 표시하고, inactive PublishedView와 inactive source의 `va-rule` session apply가 각각 404로 거부 |
| RULE-097 | client view 권한 없음 검증 | 필요 | 필요 | 안정화, UI | viewer가 권한 없는 rule/view를 보지 못함 |
| RULE-098 | va-rule not allowed 검증 | 필요 | 필요 | 안정화, UI | source는 일치하지만 PublishedView `allowedRuleIds` 밖인 VA rule이 `/ops/rules`에서 표시되고 client `va-rule` session이 `allowed vaRule is required for va-rule mode`로 거부 |
| RULE-099 | existing connection allowed rule 검증 | 간접 | 필요 | 안정화, 30분 | 연결 생성 후 PublishedView `allowedRuleIds`에서 해당 rule을 제거해도 기존 client session ICE/DELETE는 200으로 유지되고, 같은 rule의 신규 `va-rule` session은 `allowed vaRule is required for va-rule mode`로 거부 |
| RULE-100 | same channel/priority conflict 검증 | 필요 | 필요 | 안정화, UI | `/ops/rules` validation matrix가 `priority-conflict`를 표시하고, 같은 source+priority의 두 번째 VA rule 저장 API가 `vaRule priority conflicts with existing rule on same source`로 거부 |
| RULE-101 | class mismatch 검증 | 필요 | 필요 | 안정화, UI | `/ops/rules` 저장 전 검증이 profile/template class mismatch를 쓰기 없이 차단하고, 서버가 `analysis.classes`/profile classes가 template classes를 포함하지 않는 VA rule 저장을 각각 거부 |
| RULE-102 | Rule/Scenario 저장 전 review loop | 필요 | 필요 | 안정화, UI | `/ops/rules` 상세 편집기가 저장 전 예상 event type, conflict, missing reference, scenario preset 영향, `/ops/events` EventRecord coverage link를 표시하고, `verify-rule-ui` 인앱 evidence `v240-s05-rule-scenario-review-loop`와 `verify-ops-rule-validation-matrix`가 확인 |
| RULE-103 | re-entry cross-zone A→B 후보 | 필요 | 필요 | 안정화, UI | 저장 scenario payload의 `reEntryMode=configured-zones`와 `reEntryZoneIds`가 runtime ReEntryScenario source/destination zone 후보로 반영되고 기본 `same-zone` 동작과 event type `re-entry`는 유지 |
| RULE-104 | approval-gated staged rule draft 후보 | 필요 | 필요 | 안정화, UI | incident/rule suggestion 후보가 approval state와 validation summary를 가진 staged draft로만 표시되고 기존 저장 버튼 전에는 Rule/Profile registry write, 자동 적용, full replay execution, Event POST/WebRTC/SSE/WS/media path 변경을 만들지 않음 |
| RULE-105 | V350 Step 3 rule follow-up command candidate boundary | 비대상 | 필요 | 안정화 | `verify-v350-operations-command-plan-contract`가 rule follow-up 후보를 command plan draft로만 표시하고 Rule/Profile registry write, automatic apply, EventRecord/Event POST/WebRTC/SSE/WS/media path 변경을 수행하지 않음을 확인 |
| RULE-106 | V350 Step 5 rule follow-up staged change candidate | 비대상 | 필요 | 안정화 | `verify-v350-staged-change-plan-impact-preview`가 rule follow-up 변경 후보를 staging-only impact preview와 blocker로만 표시하고 Rule/Profile registry write, command execution, client notice 발송을 수행하지 않음을 확인 |
| RULE-107 | V360 Step 4 rule follow-up dry-run candidate | 비대상 | 필요 | 안정화 | `verify-v360-command-plan-dry-run-simulator`가 rule follow-up 후보를 dry-run result로만 표시하고 Rule/Profile registry write, rule follow-up apply, command execution, client notice 발송을 수행하지 않음을 확인 |
| RULE-108 | V360 Step 5 rule impact diff | 비대상 | 필요 | 안정화 | `verify-v360-source-rule-impact-diff`가 rule follow-up 변경 후보 전후의 event risk diff를 read-only로 표시하고 Rule/Profile registry write, rule follow-up apply, media/schema 변경을 수행하지 않음을 확인 |
| RULE-109 | V360 Step 10 Rule/VA what-if candidates | 비대상 | 필요 | 안정화 | `verify-v360-rule-va-what-if-replay-pack`이 rule threshold, preset, scenario 후보의 what-if delta를 계산-only로 표시하고 Rule/Profile registry write, rule apply, media/schema 변경을 수행하지 않음을 확인 |
| RULE-110 | V370 Step 13 site-scoped Rule/VA what-if candidates | 비대상 | 필요 | 안정화 | `verify-v370-rule-va-what-if-by-site`가 site/source group 기준 rule threshold/scenario 후보의 what-if delta를 계산-only로 표시하고 Rule/Profile registry write, rule apply, media/schema 변경을 수행하지 않음을 확인 |
| RULE-111 | V390 Step 13 VLM review-to-rule draft bridge | 필요 | 필요 | 안정화, UI | `verify-v390-vlm-rule-suggestion-draft-bridge`와 `verify-vlm-rule-suggestion-draft-workflow`가 incident review provenance와 sidecar rule suggestion 후보를 `/ops/rules` 이벤트 템플릿 draft로만 연결하고 기존 저장 버튼 전 Rule/Profile registry write, auto-apply, provider/runtime call, EventRecord/Event POST/WebRTC/SSE/WS/media path 변경을 만들지 않음을 확인 |
| RULE-112 | V390 (17) Development 15 generated rule provenance persistence | 간접 | 필요 | 안정화 | `verify-v390-vlm-incident-rule-provenance`가 event/candidate/evaluation source를 `/ops/rules` generated event-template rule의 optional `vlmProvenance`에 보존하고 generated rule ID와 `/lab/analysis/rules/{id}` PUT route를 일치시키며 수동 저장 전 write/auto-apply가 없음을 확인. 기존 후보 적용 control의 직접 UI case는 `UI-110`이 담당합니다 |

## E. Runtime, Dashboard, Events

| ID | 기능 | UI 필요 | 테스트 필요 | 테스트 영역 | PASS 기준 |
| --- | --- | --- | --- | --- | --- |
| EVT-001 | ops runtime status 조회 | 필요 | 필요 | 안정화, UI, 30분 | runtime status가 dashboard/home에 반영되고 drift 없음 |
| EVT-002 | lab runtime status 조회 | 비대상 | 필요 | 안정화, 30분 | lab runtime API schema와 counters 확인 |
| EVT-003 | ops source health 표시 | 필요 | 필요 | 안정화, UI, 30분 | source health list/dashboard 표시가 상태와 일치 |
| EVT-004 | ops diagnostics log tail | 필요 | 필요 | 안정화, UI | log tail 표시와 redaction 확인 |
| EVT-005 | event post status | 간접 | 필요 | 안정화 | event POST status schema와 실패/성공 상태 확인 |
| EVT-006 | event storage status | 간접 | 필요 | 안정화, 30분 | storage status/counters 안정성 확인 |
| EVT-007 | event records 조회 | 필요 | 필요 | 안정화, UI | `/ops/events` rows/filter/pagination/archive 상태가 표시되고 최종 rule/scenario별 EventRecord 발생 이력과 대조됨 |
| EVT-008 | event records compact | 비대상 | 필요 | 안정화 | compaction command/API 결과와 artifact 확인 |
| EVT-009 | event records compaction 목록 | 비대상 | 필요 | 안정화 | compaction list schema 확인 |
| EVT-010 | event records compaction cleanup | 비대상 | 필요 | 안정화 | cleanup 정책과 삭제 결과 확인 |
| EVT-011 | event records compaction file 조회 | 비대상 | 필요 | 안정화 | file fetch와 redaction 확인 |
| EVT-012 | evidence bundle token 발급 | 비대상 | 필요 | 안정화 | signed/limited token 발급과 원문 노출 없음 |
| EVT-013 | evidence bundle 조회 | 비대상 | 필요 | 안정화 | bundle 다운로드/권한/만료 확인 |
| EVT-014 | evidence 조회 | 간접 | 필요 | 안정화 | evidence metadata/file access 정책 확인 |
| EVT-015 | evidence 삭제 | 비대상 | 필요 | 안정화 | retention/delete 정책 확인 |
| EVT-016 | ops events status | 필요 | 필요 | 안정화, UI | events status panel/API 일치 |
| EVT-017 | alert deliveries 조회 | 필요 | 필요 | 안정화, UI | `/ops/events` Alert Delivery list에서 검색/kind/status filter와 empty filter 상태를 표시 |
| EVT-018 | alert delivery test | 필요 | 필요 | 안정화, UI | `/ops/events` Alert Delivery에서 integration 저장 후 Fixture/test action을 클릭하면 최근 시도에 `delivered · fixture`가 표시되고 endpoint token은 redacted 상태로 유지 |
| EVT-019 | Operator event review 목록 | 필요 | 필요 | 안정화, UI | review inbox list가 EventRecord와 별도 review state를 함께 표시 |
| EVT-020 | Operator event review 상세 | 필요 | 필요 | 안정화, UI | event list/detail, evidence refs, review status, operator note 표시 |
| EVT-021 | Operator event review 상태/action 저장 | 필요 | 필요 | 안정화, UI | status/classification/note/false-positive 또는 VLM action target 저장과 audit 반영 |
| EVT-022 | audit log 조회 | 필요 | 필요 | 안정화, UI | audit list/filter/export 표시 |
| EVT-023 | dashboard event 요약 | 필요 | 필요 | 안정화, UI | event summary count/status와 V240-S04 viewer-safe incident summary가 raw/debug/source locator 없이 표시 |
| EVT-024 | dashboard runtime 요약 | 필요 | 필요 | 안정화, UI, 30분 | runtime summary가 장시간 drift 없이 유지 |
| EVT-025 | dashboard source/channel 요약 | 필요 | 필요 | 안정화, UI | source/channel summary count/status 표시 |
| EVT-026 | dashboard VA 상태 요약 | 필요 | 필요 | 안정화, UI, 30분 | VA status/tap/event summary 표시와 안정성 확인 |
| EVT-027 | VLM event evidence refs extraction | 비대상 | 필요 | 안정화 | EventRecord `metadata.vlmEvidenceRefs`가 snapshot, bbox crop, clip manifest, previous/event/next frame refs를 reference-only로 제공하고 raw media/source URL/credential 노출 없음 |
| EVT-028 | VLM Ops event review evidence panel | 필요 | 필요 | 안정화, UI | `/ops/events` review inbox가 EventRecord, snapshot/short clip evidence, VLM explanation, false-positive hints, operator questions를 Ops 전용으로 표시하고 viewer/client 비노출, Event POST/WebRTC/SSE/WS schema와 media path 불변 확인 |
| EVT-029 | VLM evidence availability runtime state | 비대상 | 필요 | 안정화 | EventRecord review item이 snapshot, bbox crop, clip, previous/event/next frame ref 존재 여부를 상태값으로 제공하되 raw media/source URL/credential은 노출하지 않음 |
| EVT-030 | VLMObservation sidecar correlation state | 필요 | 필요 | 안정화, UI | sidecar observation은 `eventId`로만 EventRecord와 상관되고 Ops review UI는 matching/missing 상태를 표시하며 EventRecord top-level schema는 변경하지 않음 |
| EVT-031 | VLM explanation/hint review state | 필요 | 필요 | 안정화, UI | summary, eventExplanation, falsePositiveHints, operatorReviewQuestions가 Ops review 상태에 표시되고 provider raw response/prompt는 표시하지 않음 |
| EVT-032 | VLM summary search candidate state | 비대상 | 필요 | 안정화 | summary search 후보는 sidecar summary와 EventRecord `eventId` correlation만 사용하고 제품 검색 UI, vector index, provider rerank는 만들지 않음 |
| EVT-033 | VLM rule suggestion candidate state | 비대상 | 필요 | 안정화 | line/intrusion/zone rule suggestion 후보는 manual review 상태로만 산출하고 rule/profile registry write와 auto-apply는 발생하지 않음 |
| EVT-034 | VLM runtime disabled/queue readiness state | 비대상 | 필요 | 안정화 | profile/recommendation 상태가 runtime disabled, missing model, queue not started를 명확히 표시하고 media path나 Event POST dispatch를 block하지 않음 |
| EVT-035 | VLM review action state correlation | 간접 | 필요 | 안정화 | `media-server.ops.vlm-review-action-state.v1`은 Ops review state에서 `eventId`로만 EventRecord와 상관되고 EventRecord top-level payload나 Event POST payload에 action field를 추가하지 않음 |
| EVT-036 | VLM rule suggestion draft correlation state | 간접 | 필요 | 안정화, UI | `media-server.vlm-rule-suggestion-draft-workflow.v1`은 V200-S13 sidecar candidate를 `sourceCandidateReport`로만 참조하고 EventRecord/Event POST/WebRTC/SSE/WS payload에 draft field를 추가하지 않음 |
| EVT-037 | Event Action and Incident Workflow state | 필요 | 필요 | 안정화, UI | `media-server.ops.incident-action-state.v1`은 Ops review JSONL/audit에만 저장되고 `eventId`/`incidentId`로 EventRecord와 상관되며 EventRecord top-level payload나 Event POST payload에 incident/action field를 추가하지 않음 |
| EVT-038 | Alert dry-run payload preview and delivery attempt log state | 필요 | 필요 | 안정화, UI | `media-server.ops.alert-delivery-dry-run.v1`과 `media-server.ops.alert-delivery-payload-preview.v1`은 Ops alert delivery attempt JSONL/audit에만 남고 Event POST payload, EventRecord, WebRTC/SSE/WS metadata에 섞이지 않음 |
| EVT-039 | Event/incident text projection document | 비대상 | 필요 | 안정화 | `media-server.incident-text-projection.v1` 문서가 EventRecord, Ops audit, source health, alert dry-run을 searchable text/terms로 투영하고 Event POST/WebRTC/SSE/WS/media path payload를 변경하지 않음 |
| EVT-040 | Local incident memory search index state | 비대상 | 필요 | 안정화 | `media-server.incident-memory-index.v1` report가 SQLite FTS5 primary와 JSONL+BM25 fallback을 분리하고 동일 projection documents에 대해 deterministic query result parity를 보장함 |
| EVT-041 | Ops incident memory search view model | 필요 | 필요 | 안정화, UI | `/ops/api/events/reviews` 응답의 `media-server.ops.incident-memory-search-view.v1` `memorySearch`가 `q`, rule/source/status/time filter, matched terms, highlight fragments를 제공하되 model/provider dependency와 client/viewer exposure를 만들지 않음 |
| EVT-042 | Ops incident timeline graph view model | 필요 | 필요 | 안정화, UI | `/ops/api/events/reviews` 응답의 `media-server.ops.incident-timeline-graph.v1` `timelineGraph`가 source-state/event-record/operator-action/alert-dry-run/close-state node와 edge를 제공하되 EventRecord/Event POST payload와 client/viewer exposure를 바꾸지 않음 |
| EVT-043 | Ops explainable incident brief view model | 필요 | 필요 | 안정화, UI | `/ops/api/events/reviews` 응답의 `media-server.ops.explainable-incident-brief.v1` `incidentBrief`가 action/object/context/environment slot과 provider enrichment default-off 상태를 제공하되 EventRecord/Event POST payload와 client/viewer exposure를 바꾸지 않음 |
| EVT-044 | Ops similar incident lookup view model | 필요 | 필요 | 안정화, UI | `/ops/api/events/reviews` 응답의 `media-server.ops.similar-incident-lookup.v1` `similarIncidents`가 rule/scenario/source/status/action target 기반 deterministic score와 explanation terms를 제공하되 EventRecord/Event POST payload와 client/viewer exposure를 바꾸지 않음 |
| EVT-045 | Redacted incident evidence bundle export | 비대상 | 필요 | 안정화 | `/lab/analysis/events/evidence/bundle-token`과 `/lab/analysis/events/evidence/bundle`이 `releaseSafe=1` token binding과 `media-server.v250.redacted-incident-evidence-bundle.v1` manifest-only export를 제공하되 기존 raw evidence bundle mode를 release-safe PASS로 대체하지 않음 |
| EVT-046 | Ops VLM summary candidate review view model | 필요 | 필요 | 안정화, UI | `/ops/api/events/reviews` 응답의 `memorySearch.vlmSummaryCandidateReview`가 기존 `media-server.vlm-summary-search-candidates.v1`를 `sourceCandidateReport`로 감싸고 EventRecord/Event POST/WebRTC/SSE/WS/media path/client viewer 노출을 바꾸지 않음 |
| EVT-047 | Ops incident-to-rule suggestion review view model | 필요 | 필요 | 안정화, UI | `/ops/api/events/reviews` item의 `incidentRuleSuggestionReview`가 matching sidecar `ruleSuggestion`과 기존 candidate report를 Ops-only wrapper로 감싸고 EventRecord/Event POST/WebRTC/SSE/WS/media path/client viewer 노출을 바꾸지 않음 |
| EVT-048 | dashboard runtime baseline/sparkline summary | 필요 | 필요 | 안정화, UI | `/ops/dashboard`가 `/ops/api/runtime/status`, source health, events status 응답을 page-local sample로 요약해 baseline 대비 delta와 sparkline 후보를 표시하고 Event POST/WebRTC/SSE/WS payload, RTSP/WebRTC media path, client API를 바꾸지 않음 |
| EVT-049 | ScenarioEngine cross-zone re-entry candidate | 필요 | 필요 | 안정화, UI | A zone 이탈 후 B zone 진입 replay가 기존 `re-entry` EventRecord 후보를 만들고 Event POST/WebRTC/SSE/WS payload, RTSP/WebRTC media path, client API를 바꾸지 않음 |
| EVT-050 | Ops incident triage board view model | 필요 | 필요 | 안정화, UI | `/ops/api/events/reviews` 응답의 `incidentTriageBoard`가 기존 EventRecord/review/VLM candidate 상태를 Ops-only board card로 요약하고 EventRecord/Event POST/WebRTC/SSE/WS/media path/client viewer 노출을 바꾸지 않음 |
| EVT-051 | Ops incident decision scorecard view model | 필요 | 필요 | 안정화, UI | `/ops/api/events/reviews` 응답의 `incidentDecisionScorecard`가 EventRecord/source health/similar/VLM/review age 근거를 deterministic priority reason으로 요약하고 EventRecord/Event POST/WebRTC/SSE/WS/media path/client viewer 노출을 바꾸지 않음 |
| EVT-052 | Ops operational action pack view model | 필요 | 필요 | 안정화, UI | `/ops/api/events/reviews` 응답의 `operationalActionPack`이 release-safe bundle/rule draft/alert dry-run/source health recheck 수동 workflow link를 요약하고 EventRecord/Event POST/WebRTC/SSE/WS/media path/client viewer 노출을 바꾸지 않음 |
| EVT-053 | Ops rule what-if preview view model | 필요 | 필요 | 안정화, UI | `/ops/api/events/reviews` 응답의 `ruleWhatIfPreview`가 selected incident/EventRecord와 matching rule suggestion 후보의 condition preview/draft comparison/manual draft route를 요약하고 EventRecord/Event POST/WebRTC/SSE/WS/media path/client viewer 노출을 바꾸지 않음 |
| EVT-054 | Ops operator outcome memory view model | 필요 | 필요 | 안정화, UI | `/ops/api/events/reviews` 응답의 `operatorOutcomeMemory`가 기존 review state의 accept/dismiss/review-needed 결과와 audit action reference를 deterministic history hint로 요약하고 EventRecord/Event POST/WebRTC/SSE/WS/media path/client viewer 노출을 바꾸지 않음 |
| EVT-055 | Ops incident action readiness queue view model | 필요 | 필요 | 안정화, UI | `/ops/api/events/reviews`가 follow-up 후보를 ready/blocked/field-smoke-needed/not-run으로 요약하되 EventRecord/Event POST/WebRTC/SSE/WS/media path/client viewer 노출을 바꾸지 않음 |
| EVT-056 | Ops approval-gated rule draft readiness state | 필요 | 필요 | 안정화, UI | staged rule draft readiness가 approval state와 validation summary만 제공하고 EventRecord top-level, Event POST/WebRTC/SSE/WS payload, Rule/Profile registry 자동 write를 만들지 않음 |
| EVT-057 | Ops evidence intake field readiness view model | 필요 | 필요 | 안정화, UI | evidence intake/field readiness 상태가 passed/failed/blocked/not-run을 분리하고 credential/source/raw/debug/provider material을 EventRecord/Event POST/WebRTC/SSE/WS/client에 노출하지 않음 |
| EVT-058 | Ops runtime evidence window view model | 필요 | 필요 | 안정화, UI | incident-linked runtime/source/event evidence window가 bounded summary만 제공하고 장기 저장소, 30분/120분 PASS, Event POST/WebRTC/SSE/WS/media path/client viewer 변경을 만들지 않음 |
| EVT-059 | V310-S02 encoded event clip encoder pipeline | 비대상 | 필요 | 안정화 | EventRecord frame-bundle clip hook이 bounded short segment에서 WebM/VP8 encoded clip media artifact와 `media-server.encoded-event-clip-contract.v1` runtime manifest를 생성하고, FrameRef-PTS mapping/frameMap/queueName/status/non-VMS boundary/partial cleanup 결과를 남기며 EventRecord top-level, Event POST/WebRTC/SSE/WS payload, RTSP/WebRTC media path를 바꾸지 않음 |
| EVT-060 | V300-S02 frame bundle extraction sidecar | 비대상 | 필요 | 안정화 | EventRecord recorder가 trigger-time eventFrame, representativeImage selection status, bboxCrop reference, pre/event/post frameBundle manifest, EvidenceManifest sidecar를 생성하고 FrameRef를 source/channel/stream epoch/frame/time/relative event 기준으로 남기며 EventRecord top-level, Event POST/WebRTC/SSE/WS payload, RTSP/WebRTC media path를 바꾸지 않음 |
| EVT-061 | V310-S06 operator feature correction state | 필요 | 필요 | 안정화, UI | `/ops/api/events/reviews`가 correctedFeatureLabel, featureAliases, reanalysisRequested/reanalysisReason을 기존 Ops review JSONL에만 저장하고 operatorFeatureCorrection view model로 요약하되 EventRecord top-level, Event POST/WebRTC/SSE/WS payload, RTSP/WebRTC media path, Rule/Profile payload를 바꾸지 않음 |
| EVT-062 | V310-S08 encoded clip lifecycle cleanup | 비대상 | 필요 | 안정화 | retention cleanup plan이 encoded clip manifest/media를 EventRecord, EvidenceManifest, FeatureSet revision, SearchIndex와 같은 lifecycle group으로 묶고 pinned event 자동 cleanup 제외, dry-run/apply audit, Event POST/WebRTC/SSE/WS payload, RTSP/WebRTC media path 불변 조건을 유지함 |
| EVT-063 | V320 Step 2 resolution state contract | 비대상 | 필요 | 안정화 | `/ops/api/events/reviews`가 `media-server.ops.resolution-state.v1`로 resolutionStatus/resolutionReason/resolution.transition, close/reopen lifecycle, resolution note/timestamps를 Ops review JSONL에만 저장하고 EventRecord top-level, Event POST/WebRTC DataChannel/SSE/WS metadata, RTSP/WebRTC media path, Rule/Profile payload, client/viewer 출력을 바꾸지 않음 |
| EVT-064 | V320 Step 3 unified resolution workspace view model | 필요 | 필요 | 안정화, UI | `/ops/api/events/reviews` 응답의 `unifiedResolutionWorkspace`가 기존 EventRecord와 Ops review resolution state를 resolution queue/detail/timeline view model로 요약하고 EventRecord/Event POST/WebRTC DataChannel/SSE/WS metadata, RTSP/WebRTC media path, Rule/Profile payload, client/viewer 출력을 바꾸지 않음 |
| EVT-065 | V320 Step 4 evidence quality view model | 필요 | 필요 | 안정화, UI | `/ops/api/events/reviews` 응답의 `unifiedResolutionWorkspace.evidenceQuality`가 EventRecord evidence refs와 Ops review state만 읽어 evidence completeness, confidence, replay coverage hint를 요약하고 EventRecord/Event POST/WebRTC DataChannel/SSE/WS metadata, RTSP/WebRTC media path, Rule/Profile payload, client/viewer 출력을 바꾸지 않음 |
| EVT-066 | V320 Step 5 source reliability view model | 필요 | 필요 | 안정화, UI | `/ops/api/events/reviews` 응답의 `unifiedResolutionWorkspace.sourceReliability`가 SourceRegistry source health snapshot과 EventRecord source identifier만 읽어 source health, recent failure context, operator recheck hint를 요약하고, `verify-v320-source-reliability-runtime-sample`이 fixture EventRecord item의 개별 `sourceReliability` 런타임 샘플을 확인하며 EventRecord/Event POST/WebRTC DataChannel/SSE/WS metadata, RTSP/WebRTC media path, Rule/Profile payload, client/viewer 출력을 바꾸지 않음 |
| EVT-067 | V320 Step 6 AI review quality view model | 필요 | 필요 | 안정화, UI | `/ops/api/events/reviews` 응답의 `unifiedResolutionWorkspace.aiReviewQuality`가 기존 Ops review state와 EventRecord evidence/source context만 읽어 correction/review signal, uncertainty reason, quality badge를 요약하고 EventRecord/Event POST/WebRTC DataChannel/SSE/WS metadata, RTSP/WebRTC media path, Rule/Profile payload, client/viewer 출력을 바꾸지 않음 |
| EVT-068 | V320 Step 7 operator resolution flow view model | 필요 | 필요 | 안정화, UI | `/ops/api/events/reviews` write path와 응답의 `unifiedResolutionWorkspace.operatorResolutionFlow`가 기존 Ops review JSONL과 audit log만 사용해 assignment target, note presence, close/reopen availability, audit actions를 요약하고 EventRecord/Event POST/WebRTC DataChannel/SSE/WS metadata, RTSP/WebRTC media path, Rule/Profile payload, client/viewer 출력을 바꾸지 않음 |
| EVT-069 | V320 Step 8 action readiness checklist view model | 필요 | 필요 | 안정화, UI | `/ops/api/events/reviews` 응답의 `unifiedResolutionWorkspace.actionReadinessChecklist`가 기존 EventRecord evidence refs, source reliability, AI review quality, operator resolution flow만 읽어 rule draft/evidence bundle/notification readiness와 blocker를 요약하고 EventRecord/Event POST/WebRTC DataChannel/SSE/WS metadata, RTSP/WebRTC media path, Rule/Profile payload, client/viewer 출력을 바꾸지 않음 |
| EVT-070 | V320 Step 10 resolution search metrics view model | 필요 | 필요 | 안정화, UI | `/ops/api/events/reviews` 응답의 `unifiedResolutionWorkspace.resolutionSearchMetrics`가 기존 EventRecord, Ops review, v3.2 context만 읽어 active filters, saved view matches, 운영 metric summary를 요약하고 EventRecord/Event POST/WebRTC DataChannel/SSE/WS metadata, RTSP/WebRTC media path, Rule/Profile payload, client/viewer 출력을 바꾸지 않음 |
| EVT-071 | V330 Step 5 incident source correlation view model | 필요 | 필요 | 안정화, UI | `/ops/api/events/reviews` 응답의 `unifiedResolutionWorkspace.incidentSourceCorrelation`이 기존 resolution detail, sourceReliability, source health audit handoff만 읽어 source cause/closure impact/correlation signal을 요약하고 EventRecord/Event POST/WebRTC DataChannel/SSE/WS metadata, RTSP/WebRTC media path, Rule/Profile payload, client/viewer 출력을 바꾸지 않음 |
| EVT-072 | V330 Step 6 operator recheck recovery queue view model | 필요 | 필요 | 안정화, UI | `/ops/api/events/reviews` 응답의 `unifiedResolutionWorkspace.operatorRecheckRecoveryQueue`가 기존 resolution detail, sourceReliability, incidentSourceCorrelation, operator note 상태만 읽어 failed-only recheck/retry candidate/recovery checklist/dry-run status/operator note link를 요약하고 EventRecord/Event POST/WebRTC DataChannel/SSE/WS metadata, RTSP/WebRTC media path, Rule/Profile payload, client/viewer 출력을 바꾸지 않음 |
| EVT-073 | V340 Step 3 EventRecord/audit context projection | 비대상 | 필요 | 안정화 | `verify-v340-recovery-candidate-package`가 EventRecord query summary와 redacted Ops audit context를 package에 연결하되 EventRecord/Event POST schema, raw audit body, media path를 변경하지 않음 |
| EVT-074 | V350 Step 2 EventRecord graph projection | 비대상 | 필요 | 안정화 | `verify-v350-live-operations-graph-contract`가 EventRecord query 결과를 source/published view/source health/client impact graph node와 edge로만 투영하고 EventRecord write, Event POST payload, WebRTC/SSE/WS metadata, media path를 변경하지 않음을 확인 |
| EVT-075 | V350 Step 4 EventRecord to command handoff projection | 필요 | 필요 | 안정화, UI | `verify-v350-incident-to-command-handoff`가 `/ops/api/events/reviews` selected detail에 source cause, continuity drill candidate, command plan draft를 read-only handoff로 연결하고 EventRecord write, Ops audit write, client/viewer exposure를 만들지 않음을 확인 |
| EVT-076 | V350 Step 12 incident/source relation explanation context | 비대상 | 필요 | 안정화 | `verify-v350-vlm-assisted-ops-explanation`이 incident/source relation을 EventRecord/source health refs 기반 default-off 보조 설명으로만 요약하고 EventRecord write, Event POST payload, client/viewer exposure, VLM/provider call을 수행하지 않음을 확인 |
| EVT-077 | V360 Step 2 EventRecord simulation input | 비대상 | 필요 | 안정화 | `verify-v360-simulation-input-contract`가 EventRecord count/source refs를 read-only simulation input pack에 포함하되 EventRecord write, Event POST payload, WebRTC/SSE/WS metadata, RTSP/WebRTC media path를 변경하지 않음을 확인 |
| EVT-078 | V360 Step 10 EventRecord what-if replay input | 비대상 | 필요 | 안정화 | `verify-v360-rule-va-what-if-replay-pack`이 EventRecord aggregate ref를 what-if input으로만 사용하고 EventRecord write, Event POST payload, WebRTC/SSE/WS metadata, RTSP/WebRTC media path를 변경하지 않음을 확인 |
| EVT-079 | V360 Step 13 event risk simulation explanation context | 비대상 | 필요 | 안정화 | `verify-v360-vlm-assisted-simulation-explanation`이 EventRecord/what-if event risk context를 simulation explanation에만 사용하고 EventRecord write, Event POST payload, WebRTC/SSE/WS metadata, RTSP/WebRTC media path, client/viewer exposure, VLM/provider call을 수행하지 않음을 확인 |
| EVT-080 | V370 Step 5 EventRecord site impact graph aggregate | 비대상 | 필요 | 안정화 | `verify-v370-site-impact-graph`가 EventRecord count/source refs를 site graph aggregate로만 연결하고 EventRecord write, Event POST payload, WebRTC/SSE/WS metadata, RTSP/WebRTC media path를 변경하지 않음을 확인 |
| EVT-081 | V370 Step 6 EventRecord site simulation input aggregate | 비대상 | 필요 | 안정화 | `verify-v370-site-simulation-input-pack`이 EventRecord count/source refs를 site simulation input pack aggregate로만 포함하고 EventRecord write, Event POST payload, WebRTC/SSE/WS metadata, RTSP/WebRTC media path를 변경하지 않음을 확인 |
| EVT-082 | V370 Step 13 EventRecord what-if by site aggregate | 비대상 | 필요 | 안정화 | `verify-v370-rule-va-what-if-by-site`가 EventRecord aggregate ref를 site-scoped what-if input으로만 사용하고 EventRecord write, Event POST payload, WebRTC/SSE/WS metadata, RTSP/WebRTC media path를 변경하지 않음을 확인 |
| EVT-083 | V370 Step 16 EventRecord outcome reconciliation | 비대상 | 필요 | 안정화 | `verify-v370-outcome-reconciliation`이 pre-simulation EventRecord aggregate ref와 post-execution not-run ref를 event impact diff로 비교하되 EventRecord write, Event POST payload, WebRTC/SSE/WS metadata, RTSP/WebRTC media path를 변경하지 않음을 확인 |
| EVT-084 | V380 Step 12 EventRecord outcome observer | 비대상 | 필요 | 안정화 | `verify-v380-outcome-observer-reconciliation`이 action candidate와 observed outcome ref 사이의 EventRecord outcome diff를 not-run 상태로 표시하되 EventRecord write, Event POST payload, WebRTC/SSE/WS metadata, RTSP/WebRTC media path를 변경하지 않음을 확인 |
| EVT-085 | V380 Step 13 EventRecord receipt reference | 비대상 | 필요 | 안정화 | `verify-v380-action-receipt-bundle`이 EventRecord/outcome diff ref를 redacted receipt bundle에 reference-only로 포함하되 EventRecord write, Event POST payload, WebRTC/SSE/WS metadata, RTSP/WebRTC media path를 변경하지 않음을 확인 |
| EVT-086 | V380 Step 15 outcome hint explanation context | 비대상 | 필요 | 안정화 | `verify-v380-default-off-action-explanation`이 outcome observer/EventRecord/client impact refs를 outcome hint explanation으로만 요약하고 EventRecord write, Event POST payload, WebRTC/SSE/WS metadata, RTSP/WebRTC media path, VLM/provider call을 변경하거나 수행하지 않음을 확인 |
| EVT-087 | V390 Step 16 action outcome/write deferral context | 비대상 | 필요 | 안정화 | `verify-v390-action-execution-deferral-decision`이 v3.8 action outcome/receipt/default-off refs를 decision evidence로만 연결하고 action execution, EventRecord write, Event POST payload, WebRTC/SSE/WS metadata, RTSP/WebRTC media path, external delivery를 변경하거나 수행하지 않음을 확인 |

## F. Client And Viewer

| ID | 기능 | UI 필요 | 테스트 필요 | 테스트 영역 | PASS 기준 |
| --- | --- | --- | --- | --- | --- |
| CLIENT-001 | viewer live view 목록 조회 | 필요 | 필요 | 안정화, UI | assigned view만 source tree에 표시 |
| CLIENT-002 | viewer live WebRTC session 생성 | 필요 | 필요 | 안정화, UI, 30분 | tile start 후 video/status/session 생성 확인 |
| CLIENT-003 | viewer live SDP answer 처리 | 간접 | 필요 | 안정화, 30분 | answer exchange와 session state 확인 |
| CLIENT-004 | viewer live ICE candidate 처리 | 간접 | 필요 | 안정화, 30분 | ICE candidate 처리와 media path 확인 |
| CLIENT-005 | viewer live session 종료 | 필요 | 필요 | 안정화, UI, 30분 | stop/reconnect/logout 후 session cleanup 확인 |
| CLIENT-006 | viewer dashboard 조회 | 필요 | 필요 | 안정화, UI | dashboard가 viewer scope 안의 data와 V240-S04 event/status/source health/incident summary만 표시 |
| CLIENT-007 | viewer events 조회 | 필요 | 필요 | 안정화, UI | events와 client-safe summary가 viewer scope 안의 data만 표시 |
| CLIENT-008 | viewer metadata 조회 | 간접 | 필요 | 안정화 | metadata schema와 scope filtering 확인 |
| CLIENT-009 | live layout preference 저장 | 필요 | 필요 | 안정화, UI | grid/density/dock preference 저장 |
| CLIENT-010 | live layout preference 조회 | 필요 | 필요 | 안정화, UI | reload 후 preference 복원 |
| CLIENT-011 | viewer 권한 없는 view 숨김 | 필요 | 필요 | 안정화, UI | unassigned view가 목록/API/UI에 보이지 않음 |
| CLIENT-012 | viewer에게 Ops navigation 숨김 | 필요 | 필요 | 안정화, UI | client shell에 Ops nav 없음 |
| CLIENT-013 | viewer에게 Lab navigation 숨김 | 필요 | 필요 | 안정화, UI | client shell에 Lab nav 없음 |
| CLIENT-014 | viewer에게 raw JSON 비노출 | 필요 | 필요 | 안정화, UI | raw JSON/debug details가 client에 보이지 않음 |
| CLIENT-015 | viewer에게 debugCounters 비노출 | 필요 | 필요 | 안정화, UI | debug counters가 client에 보이지 않음 |
| CLIENT-016 | viewer에게 BBox diagnostics 비노출 | 필요 | 필요 | 안정화, UI | bbox diagnostics가 client에 보이지 않음 |
| CLIENT-017 | viewer에게 rule/profile editor 비노출 | 필요 | 필요 | 안정화, UI | editor controls가 client에 보이지 않음 |
| CLIENT-018 | admin client preview 표시 | 필요 | 필요 | UI | admin preview banner/state 표시 |
| CLIENT-019 | video viewport 표시 | 필요 | 필요 | UI, 30분 | video viewport가 재생되고 잘리지 않음 |
| CLIENT-020 | video control 표시 | 필요 | 필요 | UI | start/stop/reconnect/control 조작 확인 |
| CLIENT-021 | VA overlay 표시 | 필요 | 필요 | 안정화, UI, 30분 | overlay toggle/status/metadata 일치 |
| CLIENT-022 | status/caption 표시 | 필요 | 필요 | UI | caption/status와 V240-S04 live selected-tile client-safe status summary가 viewport를 가리지 않고 표시 |
| CLIENT-023 | Client-safe incident digest API/UI | 필요 | 필요 | 안정화, UI | `/client/api/views/{id}/events`와 client dashboard/events/live dock이 `media-server.client.incident-digest.v1` digest를 viewer-safe 요약으로 표시하고 source locator/raw evidence/debug/provider material을 포함하지 않음 |
| CLIENT-024 | Client-safe follow-up digest API/UI | 필요 | 필요 | 안정화, UI | viewer 할당 PublishedView 범위 안에서 follow-up status/severity/time만 `media-server.client.follow-up-digest.v1` 후보로 표시하고 source URL, raw evidence, debug material, provider material, rule editor/action controls를 노출하지 않음 |
| CLIENT-025 | V310-S04 Client-safe event digest API/UI | 필요 | 필요 | 안정화, UI | viewer 할당 PublishedView 범위 안에서 event summaryText/eventType/status/severity/timelineHint/time만 `media-server.client.event-digest.v1`로 표시하고 source URL, raw evidence, debug material, provider material, feature provenance, encoded clip path, rule editor/action controls를 노출하지 않음 |
| CLIENT-026 | V310-S05 Scoped Integrator Search API | 비대상 | 필요 | 안정화 | UI가 없어야 정상인 integrator-only API입니다. integrator role과 `event:read:{viewId}` scope가 있는 API client만 `/client/api/views/{id}/events/search`를 호출할 수 있고, 결과는 eventId/viewId와 digest summaryText/eventType/status/severity/timelineHint/time만 포함하며 source URL/raw evidence/debug/provider/feature provenance/encoded clip path/rule/action controls를 노출하지 않음 |
| CLIENT-027 | V320 Step 9 Client-safe resolution digest API/UI | 필요 | 필요 | 안정화, UI | viewer 할당 PublishedView 범위 안에서 resolutionStatus/resolutionLabel/summaryText/severity/timelineHint/time만 `media-server.client.resolution-digest.v1`로 표시하고 source URL, raw evidence, debug material, provider material, feature provenance, internal evidence, operator note, rule editor/action controls를 노출하지 않음 |
| CLIENT-028 | V330 Step 7 Client-safe source status digest API/UI | 필요 | 필요 | 안정화, UI | viewer 할당 PublishedView 범위 안에서 sourceStatus/connectionStatus/videoFrameStatus/metadataStatus/summaryText/severity/timelineHint/lastFrameAgeMs/metadataAgeMs만 `media-server.client.source-status-digest.v1`로 표시하고 source URL, raw locator, raw JSON, debug material, credential material, operator material, rule editor/action controls를 노출하지 않음 |
| CLIENT-029 | V340 Step 8 client-safe maintenance digest API/UI | 필요 | 필요 | 안정화, UI | `/client/api/views/{id}/events`와 dashboard events payload가 maintenanceState/summaryText/severity/timelineHint만 `media-server.client.v340-maintenance-digest.v1`로 노출하고 source URL/raw locator/raw JSON/debug/credential material/operator note/Ops audit/dry-run/recovery action을 포함하지 않음 |
| CLIENT-030 | V350 Step 2 client impact graph projection boundary | 비대상 | 필요 | 안정화 | `verify-v350-live-operations-graph-contract`가 PublishedView/client impact summary를 Ops-only graph read model 안에서만 표시하고 client route/API/viewer payload, Auth/Role/Scope, source URL/raw locator/debug material 노출을 변경하지 않음을 확인 |
| CLIENT-031 | V350 Step 8 client impact forecast API/UI | 필요 | 필요 | 안정화, UI | `/client/api/views/{id}/events`와 dashboard events payload가 `clientImpactForecast` viewer-safe source/view/command plan impact만 노출하고 command plan details, source URL/raw locator/raw JSON/debug/credential/operator material/action controls를 포함하지 않음 |
| CLIENT-032 | V350 Step 9 client-safe operations notice API/UI | 필요 | 필요 | 안정화, UI | `/client/api/views/{id}/events`와 dashboard events payload가 `clientOperationsNotice`로 operationsStatus/timelineHint만 노출하고 source URL/raw locator/raw JSON/debug/credential/operator material/command plan detail/incident detail/action controls를 포함하지 않음 |
| CLIENT-033 | V360 Step 5 client impact diff | 비대상 | 필요 | 안정화 | `verify-v360-source-rule-impact-diff`가 client impact diff를 Ops-only simulation result로만 표시하고 client route/API/viewer payload, source URL/raw locator/debug material, client notice 발송을 변경하지 않음을 확인 |
| CLIENT-034 | V360 Step 9 client notice preview | 비대상 | 필요 | 안정화 | `verify-v360-client-notice-preview`가 viewer-safe notice preview를 Ops-only simulation result로만 생성하고 client notice send/persist, viewer client payload 변경, source URL/raw locator/debug/operator material 노출을 수행하지 않음을 확인 |
| CLIENT-035 | V370 Step 5 site impact client summary boundary | 비대상 | 필요 | 안정화 | `verify-v370-site-impact-graph`가 client impact를 Ops-only viewer-safe summary/ref로만 계산하고 client route/API/viewer payload, source URL/raw locator/debug/operator material, client notice 발송을 변경하지 않음을 확인 |
| CLIENT-036 | V370 Step 7 affected client refs boundary | 비대상 | 필요 | 안정화 | `verify-v370-cross-site-safe-apply-readiness`가 affected clients를 PublishedView ref와 viewer-safe summary로만 산출하고 client notice 발송, client route/API/viewer payload 변경, source URL/raw locator/debug/operator material 노출을 수행하지 않음을 확인 |
| CLIENT-037 | V370 Step 12 site/view group client notice preview boundary | 비대상 | 필요 | 안정화 | `verify-v370-client-notice-by-site-view-group`가 site/view group notice preview를 Ops-only read model로 산출하고 client notice send/persist, viewer client payload 변경, source URL/raw locator/debug/operator material 노출을 수행하지 않음을 확인 |
| CLIENT-038 | V370 Step 15 notice queue pilot candidate | 비대상 | 필요 | 안정화 | `verify-v370-limited-safe-execution-pilot`이 notice queue action을 approval-gated preview candidate로만 분리하고 client notice send/persist, queue write, viewer client payload 변경, client 노출을 수행하지 않음을 확인 |
| CLIENT-039 | V370 Step 16 client impact outcome reconciliation | 비대상 | 필요 | 안정화 | `verify-v370-outcome-reconciliation`이 pre-simulation PublishedView/client notice preview ref와 post-execution not-run ref를 client impact diff로 비교하되 client notice send/persist, queue write, viewer client payload 변경, client 노출을 수행하지 않음을 확인 |
| CLIENT-040 | V380 Step 11 client-safe action notice preview API/UI | 필요 | 필요 | 안정화, UI | `/client/api/views/{id}/events`와 client dashboard/events/live dock이 `clientActionNoticePreview`로 maintenance/degraded/recovering/available status, viewerSafeTitle, viewerSafeBody, timelineHint만 노출하고 internal blocker, approval/readiness detail, source locator, credential, raw diagnostic, Ops-only action material, action controls를 포함하지 않음 |
| CLIENT-041 | V380 Step 12 client impact outcome observer | 필요 | 필요 | 안정화, UI | `verify-v380-outcome-observer-reconciliation`과 `/ops` outcome observer UI가 client impact outcome diff를 Ops-only로 표시하고 `/client` payload, client notice delivery, viewer raw material, source locator, credential, action control detail을 노출하지 않음을 확인 |
| CLIENT-042 | V380 Step 13 client-safe receipt redaction | 필요 | 필요 | 안정화, UI | `verify-v380-action-receipt-bundle`과 `/ops` receipt bundle UI가 client impact/action notice refs를 redacted receipt로만 표시하고 `/client` payload, viewer raw material, source locator, credential, raw diagnostic, Ops-only action control detail을 노출하지 않음을 확인 |

## G. Media And Streaming

| ID | 기능 | UI 필요 | 테스트 필요 | 테스트 영역 | PASS 기준 |
| --- | --- | --- | --- | --- | --- |
| MEDIA-001 | RTSP egress | 비대상 | 필요 | 안정화, 30분, 120분 | RTSP playback/session이 안정적으로 유지 |
| MEDIA-002 | generic WebRTC session | 비대상 | 필요 | 안정화, 30분, 120분 | generic session SDP/ICE/delete 계약 유지 |
| MEDIA-003 | WHEP session | 비대상 | 필요 | 안정화, 30분, 120분 | WHEP offer/answer/session lifecycle 유지 |
| MEDIA-004 | WHIP publish session | 비대상 | 필요 | 안정화, 30분, 120분 | WHIP publish/source registry lifecycle 유지 |
| MEDIA-005 | WebRTC SDP offer 생성 | 비대상 | 필요 | 안정화 | offer response schema와 codec/ICE 정보 확인 |
| MEDIA-006 | WebRTC SDP answer 수신 | 비대상 | 필요 | 안정화 | answer 처리와 session state 확인 |
| MEDIA-007 | WebRTC ICE candidate 수신 | 비대상 | 필요 | 안정화 | candidate 처리와 invalid payload guard 확인 |
| MEDIA-008 | WebRTC session 삭제 | 비대상 | 필요 | 안정화, 30분 | delete 후 cleanup/counter 감소 확인 |
| MEDIA-009 | WHIP published source registry | 간접 | 필요 | 안정화, 30분 | publish source가 registry/view에 반영되고 cleanup됨 |
| MEDIA-010 | external WHEP playback source | 간접 | 필요 | 안정화, 30분 | WHEP source registry와 session wrapper 확인 |
| MEDIA-011 | shared stream reuse | 비대상 | 필요 | 안정화, 30분, 120분 | 다중 session이 source worker를 재사용 |
| MEDIA-012 | source worker lifecycle | 비대상 | 필요 | 안정화, 30분, 120분 | start/stop/reconnect 후 worker leak 없음 |
| MEDIA-013 | stream registry | 비대상 | 필요 | 안정화, 30분 | registry add/remove/counter 일치 |
| MEDIA-014 | RTSP TCP 강제 옵션 | 비대상 | 필요 | 안정화 | `MEDIA_SERVER_FORCE_RTSP_TCP=1`이 `AppConfig.force_rtsp_tcp`와 GStreamer source transport에 반영되고 `verify-server-start-modes`가 기존 RTSP path 유지 확인 |
| MEDIA-015 | codec capability | 비대상 | 필요 | 안정화 | codec capability response와 negotiation 유지 |
| MEDIA-016 | H.264 sample playback | 필요 | 필요 | 안정화, UI, 30분 | sample 영상 표시. 단, 모든 VA 이벤트 검증으로 쓰지 않음 |
| MEDIA-017 | multi-channel playback | 필요 | 필요 | 안정화, UI, 30분 | 여러 tile/channel 동시 재생과 layout 안정성 확인 |
| MEDIA-018 | media path와 metadata path 분리 | 비대상 | 필요 | 안정화, 30분 | metadata 실패가 media path를 막지 않음 |
| MEDIA-019 | DataChannel metadata 송신 | 간접 | 필요 | 안정화, 30분 | metadata schema와 delivery 확인 |
| MEDIA-020 | WebRTC media 실패와 DataChannel 실패 분리 | 비대상 | 필요 | 안정화, 30분 | 한 경로 실패가 다른 경로 실패로 전파되지 않음 |
| MEDIA-021 | External TURN/WHEP credential boundary | 비대상 | 필요 | 안정화 | V230-S04 `verify-v230-conditional-field-evidence`와 `media-server.external-turn-whep-field-gate-report.v1`이 external TURN relay/auth와 external WHEP playback 상태를 not-run/blocked/failed/passed로 분리하고, 기본 release PASS와 local ICE/UI/longrun PASS로 대체하지 않음을 확인 |
| MEDIA-022 | V340 Step 10 external WHEP/TURN condition gate | 비대상 | 필요 | 안정화 | `verify-v340-field-bridge-condition-gates`가 external WHEP endpoint와 TURN credential/approval 조건을 field-smoke-needed/not-run으로 기록하고 local ICE/WebRTC/source-only PASS를 external bridge PASS로 승격하지 않음을 확인 |
| MEDIA-023 | V350 Step 11 external WHEP/TURN field evidence intake | 비대상 | 필요 | 안정화 | `verify-v350-field-evidence-intake`가 external WHEP/TURN 결과를 endpoint/credential/operator approval 조건과 not-run redacted evidence로 분리하고 WHEP 접속, TURN credential 사용, media path 변경을 수행하지 않음을 확인 |
| MEDIA-024 | V360 Step 12 external WHEP/TURN simulation field evidence adapter | 비대상 | 필요 | 안정화 | `verify-v360-field-evidence-simulation-adapter`가 external WHEP/TURN 조건을 conditional/not-run simulation evidence로만 연결하고 WHEP 접속, TURN credential 사용, endpoint probe, media path 변경을 수행하지 않음을 확인 |
| MEDIA-025 | V370 Step 14 external WHEP/TURN field evidence attachment | 비대상 | 필요 | 안정화 | `verify-v370-field-evidence-attachment`가 external WHEP/TURN 조건부 evidence를 site/runbook attachment ref로만 연결하고 WHEP 접속, TURN credential 사용, endpoint probe, field smoke, media path 변경을 수행하지 않음을 확인 |
| MEDIA-026 | V380 Step 14 external WHEP/TURN connector evidence | 비대상 | 필요 | 안정화 | `verify-v380-field-connector-evidence-package`가 external WHEP/TURN connector evidence를 credential/endpoint approval condition과 receipt/readiness refs로만 연결하고 WHEP 접속, TURN credential 사용, endpoint probe, field smoke, RTSP/WebRTC media path 변경을 수행하지 않음을 확인 |
| MEDIA-027 | V390 Step 17 external WHEP/TURN field evidence bridge | 비대상 | 필요 | 안정화 | `verify-v390-conditional-field-ai-decisions`가 external WHEP/TURN evidence를 approval-only minimal evidence bridge로만 분리하고 WHEP 접속, TURN credential 사용, endpoint probe, field smoke, RTSP/WebRTC media path 변경을 수행하지 않음을 확인 |

## H. Lab, Development API, Metadata

| ID | 기능 | UI 필요 | 테스트 필요 | 테스트 영역 | PASS 기준 |
| --- | --- | --- | --- | --- | --- |
| LAB-001 | `/lab/analysis/capabilities` 조회 | 비대상 | 필요 | 안정화 | capabilities schema 확인 |
| LAB-002 | lab analysis profile 목록 | 비대상 | 필요 | 안정화 | profile list schema 확인 |
| LAB-003 | lab analysis profile 생성 | 비대상 | 필요 | 안정화 | create API schema/validation 확인 |
| LAB-004 | lab analysis profile 수정 | 비대상 | 필요 | 안정화 | update API schema/validation 확인 |
| LAB-005 | lab analysis profile 삭제 | 비대상 | 필요 | 안정화 | delete API와 reference cleanup 확인 |
| LAB-006 | lab analysis rule 목록 | 비대상 | 필요 | 안정화 | rule list schema 확인 |
| LAB-007 | lab analysis rule 생성 | 비대상 | 필요 | 안정화 | create API schema/validation 확인 |
| LAB-008 | lab analysis rule 수정 | 비대상 | 필요 | 안정화 | update API schema/validation 확인 |
| LAB-009 | lab analysis rule 삭제 | 비대상 | 필요 | 안정화 | delete API와 reference cleanup 확인 |
| LAB-010 | lab va-rule 목록 | 비대상 | 필요 | 안정화 | va-rule list schema 확인 |
| LAB-011 | lab va-rule 생성 | 비대상 | 필요 | 안정화 | create API schema/validation 확인 |
| LAB-012 | lab va-rule 수정 | 비대상 | 필요 | 안정화 | update API schema/validation 확인 |
| LAB-013 | lab va-rule 삭제 | 비대상 | 필요 | 안정화 | delete API와 reference cleanup 확인 |
| LAB-014 | analysis image endpoint | 비대상 | 필요 | 안정화 | image endpoint response/redaction 확인 |
| LAB-015 | metadata stream | 비대상 | 필요 | 안정화, 30분 | SSE metadata stream schema와 지속성 확인 |
| LAB-016 | WS VA metadata `/ws/va-metadata` | 비대상 | 필요 | 안정화, 30분 | WS schema와 지속성 확인 |
| LAB-017 | analysis tap 목록 | 비대상 | 필요 | 안정화 | tap list schema 확인 |
| LAB-018 | analysis tap 생성 | 비대상 | 필요 | 안정화 | tap create API와 source/rule 연결 확인 |
| LAB-019 | analysis tap 삭제 | 비대상 | 필요 | 안정화 | tap cleanup 확인 |
| LAB-020 | tap metadata stream | 비대상 | 필요 | 안정화, 30분 | tap stream schema와 지속성 확인 |
| LAB-021 | tap metadata endpoint | 비대상 | 필요 | 안정화 | tap metadata schema 확인 |
| LAB-022 | tap bbox diagnostics | 비대상 | 필요 | 안정화 | diagnostics schema와 redaction 확인 |
| LAB-023 | tap state dump | 비대상 | 필요 | 안정화 | state dump schema와 redaction 확인 |
| LAB-024 | tap metrics dump | 비대상 | 필요 | 안정화 | metrics schema 확인 |
| LAB-025 | tap events | 비대상 | 필요 | 안정화 | tap event list/schema 확인 |
| LAB-026 | tap snapshot jpg | 비대상 | 필요 | 안정화 | jpg response/content-type 확인 |
| LAB-027 | tap overlay jpg | 비대상 | 필요 | 안정화 | overlay response/content-type 확인 |
| LAB-028 | global metadata endpoint | 비대상 | 필요 | 안정화 | global metadata schema 확인 |
| LAB-029 | global bbox diagnostics | 비대상 | 필요 | 안정화 | diagnostics schema와 redaction 확인 |
| LAB-030 | global state dump | 비대상 | 필요 | 안정화 | state schema와 redaction 확인 |
| LAB-031 | global metrics dump | 비대상 | 필요 | 안정화 | metrics schema 확인 |
| LAB-032 | lab files 조회 | 비대상 | 필요 | 안정화 | lab files listing schema 확인 |
| LAB-033 | lab reports 조회 | 비대상 | 필요 | 안정화 | report list schema 확인 |
| LAB-034 | lab report content 조회 | 비대상 | 필요 | 안정화 | report content fetch와 path guard 확인 |
| LAB-035 | VLM PC capability detector | 비대상 | 필요 | 안정화 | `media-server.vlm-pc-capability.v1` schema, macOS/Linux fixture, missing-tool fixture, no recommendation/install/runtime-call boundary, loopback-only probe 확인 |
| LAB-036 | VLM recommendation engine | 비대상 | 필요 | 안정화 | `media-server.vlm-recommendation.v1` schema, low/standard/high/unsupported fixture, local-only/cloud-disabled/cloud-allowed policy, recommendation/alternative/not-recommended/resource estimate, no install/profile/runtime-call/sidecar boundary 확인 |
| LAB-037 | VLM install/connection dry-run contract | 비대상 | 필요 | 안정화 | `media-server.vlm-install-connection-dry-run.v1` schema, local/cloud/unsupported/missing-runtime/cloud-opt-in fixture, dry-run-only side-effect false invariant, no profile/runtime-call/sidecar/cloud-provider-call boundary 확인 |
| LAB-038 | VLM profile storage API contract | 비대상 | 필요 | 안정화 | `media-server.vlm-profile.v1` schema, `/ops/api/vlm/profiles` CRUD, invalid profile fixture, provider/model/runtime/prompt/evaluation/activation/runtimeContract validation, `verify-v230-vlm-opt-in-operational-evidence`의 operator-approved profile promotion/default-off boundary, no runtime-call/sidecar/schema/media path boundary 확인 |
| LAB-039 | VLM evaluation harness fixture report | 비대상 | 필요 | 안정화 | `media-server.vlm-evaluation-report.v1` schema, event frame/bbox crop/previous-next frame refs, prompt profile A/B, latency/explanation/hallucination/JSON/한국어/영어 scoring, fixture-only no runtime/provider/sidecar/schema/media path boundary 확인 |
| LAB-040 | VLMObservation sidecar storage | 비대상 | 필요 | 안정화 | `media-server.vlm-observation.v1` schema, 별도 JSONL 저장, EventRecord `eventId` correlation report, raw prompt/response/source URL/credential/raw media 비저장, Event POST/WebRTC/SSE/WS schema와 RTSP/WebRTC media path 불변 확인 |
| LAB-041 | VLM event explanation and false-positive hints | 비대상 | 필요 | 안정화 | `media-server.vlm-event-explanation-report.v1` schema, 사람/차량/영역 관계 설명, `falsePositiveHints`, `operatorReviewQuestions`, byte-stable JSON, runtime/provider/client/schema/media path/auto-rule boundary 확인 |
| LAB-042 | VLM privacy transfer guard contract | 비대상 | 필요 | 안정화 | `media-server.vlm-privacy-transfer-guard.v1` schema, local/cloud fixture, external transfer warning, provider logging/retention review, `verify-v230-vlm-opt-in-operational-evidence`의 privacy/default-off evidence, credential/prompt/raw response/source URL/raw frame bytes 비저장 확인 |
| LAB-043 | VLM summary search candidates | 비대상 | 필요 | 안정화 | `media-server.vlm-summary-search-candidates.v1` schema, sidecar summary token 후보, EventRecord `eventId` correlation, excluded candidate/reason, no runtime/provider/client/schema/media path/auto-rule boundary 확인 |
| LAB-044 | VLM Rule suggestion candidates | 비대상 | 필요 | 안정화 | `media-server.vlm-rule-suggestion-candidates.v1` schema, line/intrusion/zone 수동 저장 후보, EventRecord `eventId` correlation, rejected auto-apply candidate, no runtime/provider/client/schema/media path/rule registry write boundary 확인 |
| LAB-045 | VLM boundary contract gate | 비대상 | 필요 | 안정화 | `verify-vlm-boundary`가 VLM을 YOLO 대체가 아닌 이벤트 해석 보조 계층으로 고정하고 Event POST/WebRTC/SSE/WS/media path 불변 조건을 확인 |
| LAB-046 | VLM model selection decision fixture | 비대상 | 필요 | 안정화 | `media-server.vlm-selection-decision.v1`이 1차 local standard, low-spec fallback, cloud opt-in fallback, 제외/조건부 후보와 license/provenance/privacy 판정을 보존 |
| LAB-047 | VLM model artifact/bundle exclusion | 비대상 | 필요 | 안정화 | model weight, runtime package, credential, download token이 repo/release/bundle/container image에 포함되지 않음을 selection/bundle gate가 확인 |
| LAB-048 | VLM PC capability hardware-class matrix | 비대상 | 필요 | 안정화 | Apple Silicon, Linux NVIDIA, CPU-only, missing runtime case가 hardware class만 산출하고 추천/설치/profile/runtime/sidecar 결과를 만들지 않음 |
| LAB-049 | VLM recommendation privacy-mode matrix | 비대상 | 필요 | 안정화 | local-only, cloud-disabled, cloud-allowed별 추천/대안/비추천/resource estimate가 산출되고 cloud 후보는 opt-in 전 실행 가능 상태가 아님 |
| LAB-050 | VLM install dry-run disabled-option matrix | 비대상 | 필요 | 안정화 | unsupported, missing-runtime, cloud-opt-in-required 후보가 disabled reason을 보존하고 install/profile/runtime/provider call side effect를 만들지 않음 |
| LAB-051 | VLM profile invalid-case matrix | 비대상 | 필요 | 안정화 | provider/model/runtime/prompt/evaluation/activation/privacyGuard/runtimeContract invalid profile이 저장 전 거부되고 credential/prompt/raw response/source URL 저장 없음 |
| LAB-052 | VLM evaluation scoring-axis matrix | 비대상 | 필요 | 안정화 | latency, explanation quality, hallucination, JSON stability, Korean/English scoring 축이 fixture report에 분리되고 실제 benchmark PASS로 보고하지 않음 |
| LAB-053 | VLM sidecar JSONL redaction invariant | 비대상 | 필요 | 안정화 | observation JSONL에는 raw prompt, raw provider response, credential, source URL, raw frame bytes가 저장되지 않고 별도 sidecar scope만 유지 |
| LAB-054 | VLM summary search query builder | 비대상 | 필요 | 안정화 | sidecar summary token 후보가 queryTerms, matchedTerms, matchScore, eventId correlation을 산출하되 제품 검색 UI나 external rerank를 만들지 않음 |
| LAB-055 | VLM rule suggestion no-auto-apply builder | 비대상 | 필요 | 안정화 | rule suggestion 후보가 manualSaveRoute와 autoApply=false를 고정하고 `/ops/rules` 수동 저장 전 registry write를 수행하지 않음 |
| LAB-056 | VLM local runtime connection smoke | 비대상 | 필요 | 안정화 | `media-server.vlm-local-runtime-smoke-report.v1`과 `verify-v230-vlm-opt-in-operational-evidence`가 Ollama/vLLM/API-compatible loopback endpoint 연결, missing-runtime, timeout queue cleanup, invalid-output fallback을 실행하고 cloud/provider/model quality/UI/longrun PASS로 과장하지 않음 |
| LAB-057 | VLM cloud provider credential gate | 비대상 | 필요 | 안정화 | `media-server.vlm-cloud-provider-field-smoke-gate-report.v1`과 `verify-v230-vlm-opt-in-operational-evidence`가 `gemini-2.5-flash` provider 후보의 env/manual 승인, credential env-only, not-run/missing-credential/failure/pass 분리, releasePassEligible 판정을 기록하고 기본 gate PASS를 provider PASS로 과장하지 않음 |
| LAB-058 | VLM queue/backpressure stability fixture | 비대상 | 필요 | 안정화, 30분 | `media-server.vlm-queue-backpressure-fixtures.v1`이 default-off, missing-model, invalid-output, timeout, metadata fanout, Event POST dispatch case를 VLM-only failure로 판정하고 media/Event/metadata/Event POST non-blocking 경계를 확인 |
| LAB-059 | VLM evaluation result workflow fixture | 비대상 | 필요 | 안정화 | `media-server.ops.vlm-evaluation-result-workflow.v1`이 1차 선택값, fallback, 제외 사유, latency/JSON/explanation/hallucination/language 품질축, profile draft-only side-effect false invariant를 보존 |
| LAB-060 | VLM review action workflow fixture | 비대상 | 필요 | 안정화 | `media-server.vlm-review-action-workflow-fixtures.v1`이 1차 action, fallback, 제외 사유, action target, license/provenance/privacy/operation 검토, side-effect false invariant를 보존 |
| LAB-061 | VLM rule suggestion draft workflow API/fixture | 비대상 | 필요 | 안정화 | `media-server.vlm-rule-suggestion-draft-workflow.v1` API와 fixture가 V200-S13 후보를 `/ops/rules` draft-only/manual-save contract로 감싸고 sourceCandidateReport, excluded auto-apply count, no runtime/provider/schema/media side-effect를 보존 |
| LAB-062 | Runtime/model bundle RC rehearsal fixture | 비대상 | 필요 | 안정화 | `media-server.runtime-model-bundle-rc-rehearsal-report.v1`이 source-only default, RC-only no-runtime/no-model dry-run 후보, runtime/model/GPL-risk/release asset blocked 후보, hash/provenance/license/source-offer review boundary를 실제 bundle 생성 없이 보존 |
| LAB-063 | Incident text projection fixture smoke | 비대상 | 필요 | 안정화 | `verify-v250-incident-text-projection`이 C++ fixture만 사용해 EventRecord/audit/source health/alert dry-run projection과 deterministic JSON을 검증하고 model/provider/runtime dependency를 만들지 않음 |
| LAB-064 | Incident memory index fixture smoke | 비대상 | 필요 | 안정화 | `verify-v250-incident-memory-index`가 SQLite FTS5 primary, forced JSONL+BM25 fallback, fallback JSONL materialization, query parity, deterministic ordering을 C++ fixture로 검증함 |
| LAB-065 | Incident timeline graph fixture linkage | 비대상 | 필요 | 안정화 | `verify-v250-incident-timeline-graph`가 source-state → event-record → operator-action → alert-dry-run → close-state node/edge와 `auditLinkage`를 fixture/static guard로 검증하고 Event POST/WebRTC/SSE/WS/media path schema를 변경하지 않음 |
| LAB-066 | Explainable incident brief fixture guard | 비대상 | 필요 | 안정화 | `verify-v250-explainable-incident-brief`가 action/object/context/environment slot, VLM default-off, no provider dependency, no Event POST/WebRTC/SSE/WS/media path schema change를 fixture/static guard로 검증함 |
| LAB-067 | Similar incident deterministic scoring fixture | 비대상 | 필요 | 안정화 | `verify-v250-similar-incident-lookup`이 rule/scenario/source/status/action target score weights, deterministic ordering, no provider dependency, no Event POST/WebRTC/SSE/WS/media path schema change를 fixture/static guard로 검증함 |
| LAB-068 | Release-safe incident evidence bundle fixture | 비대상 | 필요 | 안정화 | `verify-v250-redacted-incident-evidence-bundle`이 release-safe manifest schema, token releaseSafe binding, raw evidence file exclusion, searchResults/timelineSummary redaction policy를 fixture/static guard로 검증함 |
| LAB-069 | V260-S01 VLM summary productization fixture/static guard | 비대상 | 필요 | 안정화 | `verify-v260-incident-memory-productization`이 VLM summary candidate wrapper schema, sourceCandidateReport 보존, `/ops/events` UI marker, command/docs/inventory wiring, client/provider/auto-rule 비범위를 정적 검증함 |
| LAB-070 | V260-S02 rule suggestion review static guard | 비대상 | 필요 | 안정화 | `verify-v260-rule-suggestion-review`이 incident-to-rule wrapper schema, matching ruleSuggestion 보존, `/ops/events` UI marker, `/ops/rules` draft-only 링크, command/docs/inventory wiring, client/provider/auto-rule 비범위를 정적 검증함 |
| LAB-071 | V260-S03 ONVIF credential gate static guard | 비대상 | 필요 | 안정화 | `verify-v260-onvif-credential-gate`가 credential binding fixture, provider 선택값, 제외 사유, `/ops/sources` marker, URL credential reject, docs/inventory/command wiring, persistent store 비범위를 정적 검증함 |
| LAB-072 | V260-S04 runtime dashboard trend static guard | 비대상 | 필요 | 안정화 | `verify-v260-runtime-dashboard-trends`가 `/ops/dashboard` trend card marker, page-session-only sample buffer, sparkline rendering, command/docs/inventory wiring, longrun/schema/media/client 비범위를 정적 검증함 |
| LAB-073 | V260-S05 cross-zone re-entry replay/static guard | 비대상 | 필요 | 안정화 | `verify-v260-scenario-cross-zone-reentry`가 ReEntryScenario source/destination 분리, EventRuleEngine parser, analysis-state A→B case, va-replay fixture, UI/docs/inventory wiring, schema/media/client 비범위를 검증함 |
| LAB-074 | V270-S01 incident triage board static guard | 비대상 | 필요 | 안정화 | `verify-v270-incident-triage-board`가 triage board wrapper schema, lane/filter/sort UI marker, priority/review/source/rule/scenario/similar/VLM 기준, command/docs/inventory wiring, client/provider/auto-action 비범위를 정적 검증함 |
| LAB-075 | V270-S02 incident decision scorecard static guard | 비대상 | 필요 | 안정화 | `verify-v270-incident-decision-scorecard`가 decision scorecard wrapper schema, deterministic priority reason chips, EventRecord/source health/similar/VLM/review age 근거, command/docs/inventory wiring, raw/provider/schema/media 비범위를 정적 검증함 |
| LAB-076 | V270-S03 operational action pack static guard | 비대상 | 필요 | 안정화 | `verify-v270-operational-action-pack`이 action pack wrapper schema, release-safe bundle/rule draft/alert dry-run/source health recheck 연결, command/docs/inventory wiring, external delivery/auto rule/schema/media 비범위를 정적 검증함 |
| LAB-077 | V270-S04 rule what-if preview static guard | 비대상 | 필요 | 안정화 | `verify-v270-rule-what-if-preview`가 rule what-if preview wrapper schema, selected incident/rule suggestion condition preview, `/ops/rules` draft-only link, command/docs/inventory wiring, full replay/auto apply/schema/media 비범위를 정적 검증함 |
| LAB-078 | V270-S05 operator outcome memory static guard | 비대상 | 필요 | 안정화 | `verify-v270-operator-outcome-memory`이 operator outcome memory wrapper schema, review state/audit action 기반 deterministic history hint, command/docs/inventory wiring, persistent write/client/schema/media 비범위를 정적 검증함 |
| LAB-079 | V280-S02 incident action readiness queue static guard | 비대상 | 필요 | 안정화 | `verify-v280-incident-action-readiness-queue`가 `/ops/api/events/reviews`의 `incidentActionReadinessQueue`, ready/blocked/not-run status, command/docs/inventory wiring, external delivery/auto write/schema/media 비범위를 정적 검증 |
| LAB-080 | V280-S03 approval-gated rule draft static guard | 비대상 | 필요 | 안정화 | `verify-v280-approval-gated-rule-draft`가 `/ops/api/events/reviews`의 `approvalGatedRuleDraftReadiness`, approval state, staged draft, validation summary, auto save/auto apply/full replay/schema/media 비범위를 정적 검증 |
| LAB-081 | V280-S04 evidence intake field readiness static guard | 비대상 | 필요 | 안정화 | `verify-v280-evidence-intake-field-readiness`가 `/ops/api/events/reviews`의 `evidenceIntakeFieldReadiness`, redacted intake, source health recheck, field smoke precondition, credential/source/raw redaction, endpoint/credential 미실행 경계를 정적 검증 |
| LAB-082 | V280-S05 runtime evidence window static guard | 비대상 | 필요 | 안정화 | `verify-v280-runtime-evidence-window`가 `/ops/api/events/reviews`의 `runtimeEvidenceWindow`, bounded runtime/source/event evidence, no longrun substitute, no persistent archive, command/docs/inventory wiring을 정적 검증 |
| LAB-083 | V300-S03 feature schema fixture | 비대상 | 필요 | 안정화 | `verify-v300-feature-schema-privacy`가 `media-server.event-feature-set.v1` fixture의 FeatureSet envelope, allowed namespace feature values, confidence/uncertainty/evidenceRef, raw prompt/response non-retention, disallowed identity feature matrix를 검증하되 VLM runtime/provider call, Search DSL, `/ops/events` UI를 만들지 않음 |
| LAB-084 | V300-S04 VLM feature queue fixture | 비대상 | 필요 | 안정화, 30분 | `verify-v300-vlm-feature-queue`와 `verify-analysis-state`가 background queue, lazy trigger, missing-runtime, queue-timeout, invalid-output outcome과 structured FeatureSet revision을 검증하되 real provider call, Search DSL, `/ops/events` UI를 만들지 않음 |
| LAB-085 | V300-S05 feature-only retention fixture | 비대상 | 필요 | 안정화 | `verify-v300-feature-only-retention`와 `verify-analysis-state`가 FeatureSet revision store, raw prompt/response rejection, reanalysis revision policy, previous revision preservation을 검증하되 Search DSL, Retention/Pin/Cleanup, `/ops/events` UI를 만들지 않음 |
| LAB-086 | V300-S06 search DSL/query convert fixture | 비대상 | 필요 | 안정화 | `verify-v300-search-dsl-query-convert`와 `verify-analysis-state`가 natural language to constrained Search DSL, strict structured output, text/tags/filter matching, identity-query rejection을 검증하되 Feature/Search Index, `/ops/events` UI, vector search를 만들지 않음 |
| LAB-087 | V300-S07 feature/search index fixture | 비대상 | 필요 | 안정화 | `verify-v300-feature-search-index`와 `verify-analysis-state`가 EventRecord, FeatureSet, EvidenceManifest, operator review state projection, latest revision selection, orphan/privacy guard, stale result guard를 검증하되 `/ops/events` UI, vector search, provider rerank를 만들지 않음 |
| LAB-088 | V300-S09 retention/pin/cleanup fixture | 비대상 | 필요 | 안정화 | `verify-v300-retention-pin-cleanup`와 `verify-analysis-state`가 7일 기본 retention, source/rule override, pinned event cleanup 제외, dry-run 후보 산출, apply lifecycle delete/de-index, audit trail을 검증하되 destructive 운영 삭제, UI 풀테스트, 30분/120분을 만들지 않음 |
| LAB-089 | V310-S07 optional vector search fixture | 비대상 | 필요 | 안정화 | `verify-v310-optional-vector-search`와 `verify-analysis-state`가 default-off embedding index, explicit opt-in, quality/dimension gate, face/identity embedding rejection, rebuild stale vector result guard를 검증하되 provider embedding call, 제품 UI, client/viewer 노출을 만들지 않음 |
| LAB-090 | V340 Step 4 staging restore validation harness | 비대상 | 필요 | 안정화 | `verify-v340-staging-restore-validation-harness`가 temporary staging runtime에서 JSON parse, duplicate sourceId, missing sourceId reference, auth store `0600`, checksum, viewer scope를 production write 없이 검증 |
| LAB-091 | V340 Step 10 real cloud/VLM provider condition gate | 비대상 | 필요 | 안정화 | `verify-v340-field-bridge-condition-gates`가 real cloud/VLM provider endpoint/credential/operator approval 조건을 field-smoke-needed/not-run으로 기록하고 fixture/local VLM PASS를 real provider PASS로 승격하지 않음을 확인 |
| LAB-092 | V350 Step 5 staging impact preview harness | 비대상 | 필요 | 안정화 | `verify-v350-staged-change-plan-impact-preview`가 command plan 후보를 before-apply impact preview와 blocker로 정적 검증하고 source/view/rule write, client notice 발송, runtime/media mutation을 수행하지 않음을 확인 |
| LAB-093 | V350 Step 11 cloud/VLM provider field evidence intake | 비대상 | 필요 | 안정화 | `verify-v350-field-evidence-intake`가 cloud/VLM provider 결과를 redacted intake/not-run 상태로만 표시하고 provider call, raw VLM prompt, raw provider response, credential material 저장을 수행하지 않음을 확인 |
| LAB-094 | V350 Step 12 default-off VLM ops explanation harness | 비대상 | 필요 | 안정화 | `verify-v350-vlm-assisted-ops-explanation`이 VLM-assisted Ops Explanation을 defaultEnabled=false, runtime/provider call 미수행, raw prompt/response 미포함 상태로 검증하고 실제 VLM/provider 실행을 PASS로 대체하지 않음을 확인 |
| LAB-095 | V360 Step 3 simulation run schema/envelope | 비대상 | 필요 | 안정화 | `verify-v360-operations-simulation-run-contract`가 simulation route family, simulation run schema, result envelope, not-run 상태를 검증하고 simulation run persist/execute 또는 provider/runtime/media 작업을 수행하지 않음을 확인 |
| LAB-096 | V360 Step 8 simulation run ledger comparison | 비대상 | 필요 | 안정화 | `verify-v360-simulation-run-ledger-comparison`이 simulation input/run/dry-run/impact/readiness fixture를 append-only ledger projection으로 조합하고 simulation run persist/execute 또는 operator note write를 수행하지 않음을 확인 |
| LAB-097 | V360 Step 10 Rule/VA what-if replay pack | 비대상 | 필요 | 안정화 | `verify-v360-rule-va-what-if-replay-pack`이 EventRecord/VA fixture와 simulation diff를 조합해 threshold/preset/scenario 후보를 비교하되 실제 replay execution, rule apply, EventRecord mutation을 수행하지 않음을 확인 |
| LAB-098 | V360 Step 11 simulation export bundle | 비대상 | 필요 | 안정화 | `verify-v360-simulation-export-bundle`이 simulation input/output, readiness blocker, handoff map refs를 redacted release-safe projection으로 조합하되 artifact export, file write, simulation execution, raw material 노출을 수행하지 않음을 확인 |
| LAB-099 | V360 Step 12 cloud/VLM simulation field evidence adapter | 비대상 | 필요 | 안정화 | `verify-v360-field-evidence-simulation-adapter`가 cloud/VLM provider 조건을 conditional/not-run simulation evidence로만 연결하고 provider call, raw VLM prompt, raw provider response, credential material 저장을 수행하지 않음을 확인 |
| LAB-100 | V360 Step 13 default-off VLM simulation explanation harness | 비대상 | 필요 | 안정화 | `verify-v360-vlm-assisted-simulation-explanation`이 VLM-assisted Simulation Explanation을 defaultEnabled=false, runtime/provider call 미수행, raw prompt/response 미포함 상태로 검증하고 실제 VLM/provider 실행을 PASS로 대체하지 않음을 확인 |
| LAB-101 | V370 Step 6 site simulation input/result envelope harness | 비대상 | 필요 | 안정화 | `verify-v370-site-simulation-input-pack`이 v3.6 simulation input summary와 result envelope를 site/source group pack에 read-only ref로 연결하되 simulation run, result persist, provider/runtime/media 작업을 수행하지 않음을 확인 |
| LAB-102 | V370 Step 7 cross-site readiness harness | 비대상 | 필요 | 안정화 | `verify-v370-cross-site-safe-apply-readiness`가 v3.6 dry-run/impact diff/safe readiness와 v3.7 site simulation input pack을 read-only readiness harness로 연결하되 safe apply, field smoke, provider/runtime/media 작업을 수행하지 않음을 확인 |
| LAB-103 | V370 Step 8 runbook template contract harness | 비대상 | 필요 | 안정화 | `verify-v370-runbook-template-contract`가 v3.5 command plan, v3.6 dry-run/readiness, v3.7 site input/readiness를 read-only runbook template contract로 연결하되 runbook instance persist, approval ticket write, provider/runtime/media 작업을 수행하지 않음을 확인 |
| LAB-104 | V370 Step 9 runbook instance ledger harness | 비대상 | 필요 | 안정화 | `verify-v370-runbook-instance-ledger`가 runbook template contract, cross-site readiness, v3.6 simulation run ledger를 read-only append-only ledger projection으로 연결하되 runbook instance persist, operator note write, approval ticket write, provider/runtime/media 작업을 수행하지 않음을 확인 |
| LAB-105 | V370 Step 10 approval ticket workflow harness | 비대상 | 필요 | 안정화 | `verify-v370-approval-ticket-workflow`가 runbook template contract, runbook instance ledger, cross-site readiness를 read-only approval ticket workflow projection으로 연결하되 approval ticket write, reviewer assignment write, approval decision persist, provider/runtime/media 작업을 수행하지 않음을 확인 |
| LAB-106 | V370 Step 13 Rule/VA what-if by site harness | 비대상 | 필요 | 안정화 | `verify-v370-rule-va-what-if-by-site`가 v3.6 dry-run/impact diff/Rule-VA replay refs와 v3.7 site projection/simulation/readiness를 read-only what-if harness로 연결하되 simulation run, rule apply, provider/runtime/media 작업을 수행하지 않음을 확인 |
| LAB-107 | V370 Step 14 Field Evidence Attachment harness | 비대상 | 필요 | 안정화 | `verify-v370-field-evidence-attachment`가 v3.4 field bridge condition gates, v3.5 field evidence intake, v3.6 field evidence simulation adapter, v3.7 runbook/approval refs를 read-only attachment harness로 연결하되 field smoke, endpoint/credential probe, provider/VLM call, runtime/media 작업을 수행하지 않음을 확인 |
| LAB-108 | V370 Step 15 Limited Safe Execution Pilot harness | 비대상 | 필요 | 안정화 | `verify-v370-limited-safe-execution-pilot`이 runbook ledger, approval ticket workflow, field evidence attachment, client notice preview refs를 approval-gated pilot harness로 연결하되 source recheck, notice queue write/send, runtime/media 작업을 수행하지 않음을 확인 |
| LAB-109 | V370 Step 16 Outcome Reconciliation harness | 비대상 | 필요 | 안정화 | `verify-v370-outcome-reconciliation`이 limited safe execution pilot, site simulation input pack, source/rule impact diff, site impact graph, client notice refs를 read-only reconciliation harness로 연결하되 pilot execution, source recheck, notice queue write/send, runtime/media 작업을 수행하지 않음을 확인 |
| LAB-110 | V370 Step 17 Export / Handoff Bundle harness | 비대상 | 필요 | 안정화 | `verify-v370-export-handoff-bundle`이 site registry projection, runbook ledger, field evidence attachment, approval workflow, outcome reconciliation refs를 redacted release-safe handoff bundle harness로 연결하되 file/artifact export, handoff persist, execution/runtime/media 작업을 수행하지 않음을 확인 |
| LAB-111 | V380 Step 2 action route boundary harness | 비대상 | 필요 | 안정화 | `verify-v380-ops-action-route-boundary`가 `/ops/api/actions/route-boundary`, future action route catalog, v3.5/v3.7 legacy projection refs를 read-only route boundary harness로 연결하되 action execution, readiness execution, source recheck, notice send, rule apply, request/approval/runbook/EventRecord/Ops audit write를 수행하지 않음을 확인 |
| LAB-112 | V380 Step 3 action capability contract harness | 비대상 | 필요 | 안정화 | `verify-v380-action-capability-contract`가 `/ops/api/actions/capability-contract`, allowed/denied action catalog, role/scope, idempotency, immutable schema boundary를 read-only capability contract harness로 연결하되 action execution, readiness execution, source recheck, notice send, rule apply, request/approval/runbook/EventRecord/Ops audit write를 수행하지 않음을 확인 |
| LAB-113 | V380 Step 4 action request ledger contract harness | 비대상 | 필요 | 안정화 | `verify-v380-action-request-ledger-contract`가 `/ops/api/actions/request-ledger`, actionRequestId/siteId/runbookId/requestedBy/status/createdAt/idempotencyKey, append-only/read-only policy를 contract harness로 연결하되 request write, action execution, readiness execution, source recheck, notice send, rule apply, request/approval/runbook/EventRecord/Ops audit write를 수행하지 않음을 확인 |
| LAB-114 | V380 Step 5 approval decision gate harness | 비대상 | 필요 | 안정화 | `verify-v380-approval-decision-gate`가 `/ops/api/actions/approval-decision-gate`, approve/hold/reject/field-needed decision state, reviewer, reason, auditRef, stale decision guard를 contract harness로 연결하되 decision write, action execution, readiness execution, source recheck, notice send, rule apply, request/approval/runbook/EventRecord/Ops audit write를 수행하지 않음을 확인 |
| LAB-115 | V380 Step 6 action readiness preflight harness | 비대상 | 필요 | 안정화 | `verify-v380-action-readiness-preflight`가 `/ops/api/actions/readiness-preflight`, capability/approval/field evidence/source health/client impact/duplicate request blocker, readiness state를 contract harness로 연결하되 readiness execution/result persist, action execution, source recheck, notice send, rule apply, request/approval/runbook/EventRecord/Ops audit write를 수행하지 않음을 확인 |
| LAB-116 | V380 Step 7 source recheck action pilot harness | 비대상 | 필요 | 안정화 | `verify-v380-source-recheck-action-pilot`가 `/ops/api/actions/source-recheck-pilot`, source health recheck request, dry execution result envelope, readiness refs, pilot blocker state를 contract harness로 연결하되 source recheck execution, source health write, action result persist, notice send, rule apply, request/approval/readiness/runbook/EventRecord/Ops audit write를 수행하지 않음을 확인 |
| LAB-117 | V380 Step 8 client notice draft queue harness | 비대상 | 필요 | 안정화 | `verify-v380-client-notice-draft-queue`가 `/ops/api/actions/client-notice-draft-queue`, viewer-safe notice draft, queue preview, delivery blocker, redaction boundary, readiness/pilot refs를 contract harness로 연결하되 client notice delivery, notice draft persist, notice queue write, viewer payload mutation, source/rule/runbook/EventRecord/Ops audit write를 수행하지 않음을 확인 |
| LAB-118 | V380 Step 9 rule draft action package harness | 비대상 | 필요 | 안정화 | `verify-v380-rule-draft-action-package`가 `/ops/api/actions/rule-draft-package`, rule threshold/scenario 후보, draft package, review checklist, apply blocker, readiness/notice refs를 contract harness로 연결하되 rule/scenario apply, rule draft persist, rule/profile registry write, source/runbook/EventRecord/Ops audit write를 수행하지 않음을 확인 |
| LAB-119 | V380 Step 12 Outcome Observer harness | 비대상 | 필요 | 안정화 | `verify-v380-outcome-observer-reconciliation`이 `/ops/api/actions/outcome-reconciliation`, readiness/candidate/observed refs, source/EventRecord/client/rule diff, no-store guard, backlog/stream verification/release records/inventory/server dispatch 연결을 확인하되 action execution과 write를 수행하지 않음을 확인 |
| LAB-120 | V380 Step 13 Action Receipt Bundle harness | 비대상 | 필요 | 안정화 | `verify-v380-action-receipt-bundle`이 `/ops/api/actions/receipt-bundle`, approval/request/readiness/candidate/outcome refs, redaction summary, handoff map, no-store guard, backlog/stream verification/release records/inventory/server dispatch 연결을 확인하되 artifact/file/handoff/action write를 수행하지 않음을 확인 |
| LAB-121 | V380 Step 14 Field Connector Evidence Package harness | 비대상 | 필요 | 안정화 | `verify-v380-field-connector-evidence-package`가 `/ops/api/actions/field-connector-evidence-package`, ONVIF/external WHEP-TURN/cloud provider connector evidence, credential/endpoint approval refs, no-store guard, backlog/stream verification/release records/inventory/server dispatch 연결을 확인하되 field smoke/endpoint/credential/provider/action/media 작업을 수행하지 않음을 확인 |
| LAB-122 | V380 Step 15 default-off action explanation harness | 비대상 | 필요 | 안정화 | `verify-v380-default-off-action-explanation`이 `/ops/api/actions/default-off-explanation`, approval/readiness/outcome/receipt/field connector refs, no-store guard, backlog/stream verification/release records/inventory/server dispatch 연결을 확인하되 VLM/provider/runtime/action/source/media 작업을 수행하지 않음을 확인 |
| LAB-123 | V390 VLM server-owned evaluation catalog binding | 비대상 | 필요 | 안정화 | `ValidateVlmEvaluationPromotion`과 `verify-v390-vlm-promotion-trust-boundary`가 동일 catalog에서 평가 API 응답과 profile canonical status/provenance를 만들고 known candidate revision/digest 및 option/model/prompt binding 성공·실패를 실제 HTTP로 확인 |
| LAB-124 | V390 Step 17 cloud/VLM provider field evidence bridge | 비대상 | 필요 | 안정화 | `verify-v390-conditional-field-ai-decisions`가 cloud/VLM provider field evidence를 approval-only minimal evidence bridge로만 분리하고 provider call, VLM prompt/response 저장, raw provider material 노출, release PASS 승격을 수행하지 않음을 확인 |
| LAB-125 | V390 Re-ID shared readiness evaluator matrix | 비대상 | 필요 | 안정화 | `InspectAppearanceModelReadiness`, `verify-v390-reid-readiness-consistency`, `verify-reid-advanced-tracking`, `verify-analysis-state`가 no-OpenSSL/no-ONNX C++ capability 2종과 실제 HTTP 10개 positive/negative case로 file/SHA/provenance/runtime gate 및 factory/API 동일 판정을 확인 |
| LAB-126 | V390 incident-to-rule provenance save/readback | 비대상 | 필요 | 안정화 | `/lab/analysis/rules/{id}` PUT/GET과 registry 저장 파일 readback에서 provenance schema, event/candidate/evaluation source, generated rule ID/save route를 보존하고 invalid/mismatched provenance를 no-write로 거부하는지 확인 |

## I. Safety, Boundary, Invariant Contract

| ID | 기능 | UI 필요 | 테스트 필요 | 테스트 영역 | PASS 기준 |
| --- | --- | --- | --- | --- | --- |
| SAFE-001 | Event POST payload schema 유지 | 비대상 | 필요 | 안정화 | payload field/type 호환과 freeze baseline SHA-256 유지 |
| SAFE-002 | WebRTC DataChannel schema 유지 | 비대상 | 필요 | 안정화 | 기존 client metadata consumer 호환과 freeze baseline 유지 |
| SAFE-003 | SSE metadata schema 유지 | 비대상 | 필요 | 안정화 | SSE event/schema 호환과 freeze baseline 유지 |
| SAFE-004 | WS metadata schema 유지 | 비대상 | 필요 | 안정화 | WS payload/schema 호환과 freeze baseline 유지 |
| SAFE-005 | 기존 Intrusion event type 유지 | 비대상 | 필요 | 안정화 | existing event type string 유지 |
| SAFE-006 | 기존 LineCrossing event type 유지 | 비대상 | 필요 | 안정화 | existing event type string 유지 |
| SAFE-007 | scenario 판단 로직 유지 | 비대상 | 필요 | 안정화 | replay/scenario fixture 결과 유지 |
| SAFE-008 | RTSP media path 유지 | 비대상 | 필요 | 안정화, 30분 | RTSP playback path 회귀 없음 |
| SAFE-009 | WebRTC media path 유지 | 비대상 | 필요 | 안정화, 30분 | WebRTC playback path 회귀 없음 |
| SAFE-010 | SourceRegistry API 계약 유지 | 비대상 | 필요 | 안정화 | registry schema/semantics 호환과 freeze baseline 유지 |
| SAFE-011 | PublishedView API 계약 유지 | 비대상 | 필요 | 안정화 | view schema/semantics 호환과 freeze baseline 유지 |
| SAFE-012 | Rule/Profile 저장 payload 계약 유지 | 비대상 | 필요 | 안정화 | 저장 payload/schema 호환과 freeze baseline 유지 |
| SAFE-013 | `vaRule=<id>` 호출 정책 유지 | 비대상 | 필요 | 안정화 | allowed rule/session policy 유지 |
| SAFE-014 | media pipeline non-blocking 정책 | 비대상 | 필요 | 안정화, 30분, 120분 | VA/metadata 실패가 media path를 막지 않음 |
| SAFE-015 | lab 개발 UI 제품 화면 embed 금지 | 필요 | 필요 | 안정화, UI | ops/client 제품 화면에 lab editor가 없음 |
| SAFE-016 | undefined route 404 처리 | 간접 | 필요 | 안정화, UI | 정의하지 않은 route가 404 처리됨 |
| SAFE-017 | 구 `/lab` 제품 UI route 404 처리 | 간접 | 필요 | 안정화, UI | `/lab` 구 UI route가 제품 UI로 열리지 않음 |
| SAFE-018 | client/viewer debug 정보 비노출 | 필요 | 필요 | 안정화, UI | client 화면/API에 debug/source/raw 정보 없음 |
| SAFE-019 | auth material 비노출 | 필요 | 필요 | 안정화, UI | password/token/session material이 artifact/UI/API에 없음 |
| SAFE-020 | 운영 UI와 client UI 권한 경계 분리 | 필요 | 필요 | 안정화, UI | ops/client nav, route, action guard가 role별로 분리 |
| SAFE-021 | UI blocking dialog policy | 필요 | 필요 | 안정화, UI | `verify-ui-blocking-dialog-policy`가 native alert/confirm/prompt와 blocking beforeunload 금지, allowlisted read-only dialog, 제품 화면 안 2회 확인 흐름만 허용하는 정책을 확인 |
| SAFE-022 | VLM 설치/연결 UI scope gate | 비대상 | 필요 | 안정화 | `verify-vlm-install-connection-scope-gate`가 Ops-only S04 UI 준비 허용, profile 저장/VLM runtime 호출/sidecar 저장/cloud provider API 호출/schema/media path 변경 금지, viewer/client 비노출 경계를 확인 |
| SAFE-023 | VLM profile 저장 scope gate | 비대상 | 필요 | 안정화 | `verify-vlm-profile-storage`가 S05 profile 저장만 허용하고 VLM runtime 호출, sidecar 저장, cloud provider API 호출, credential/prompt/raw response/source URL 저장, Event/WebRTC/SSE/WS schema와 media path 변경을 금지 |
| SAFE-024 | VLM Privacy/전송 guard | 필요 | 필요 | 안정화, UI | `verify-vlm-privacy-transfer-guard`와 Ops/Client UI leak guard가 cloud 외부 전송 경고, provider logging/retention accepted review, credential/prompt/raw response/source URL/raw frame bytes 비노출을 확인 |
| SAFE-025 | VLM default-off / no runtime auto-start | 비대상 | 필요 | 안정화 | `verify-vlm-runtime-opt-in-contract`와 `verify-v230-vlm-opt-in-operational-evidence`가 VLM profile이나 recommendation이 있어도 `defaultEnabled=false`, runtime call, queue start, provider API call이 자동으로 발생하지 않음을 확인 |
| SAFE-026 | VLM model/runtime bundle 금지 | 비대상 | 필요 | 안정화 | Qwen/Gemini/Gemma 등 model weight, GGUF/safetensors/ckpt, runtime package, credential, download token이 repo/release/bundle에 포함되지 않음 |
| SAFE-027 | VLM cloud external transfer opt-in 필수 | 비대상 | 필요 | 안정화 | cloud 후보는 privacy mode와 외부 전송 경고, provider logging/retention review, runtimeContract `cloud-provider`/`providerFieldSmokeRequired=true`, `verify-v230-vlm-opt-in-operational-evidence`의 provider not-run/releasePassEligible=false 경계가 충족되기 전 전송 가능 상태가 되지 않음 |
| SAFE-028 | VLM prompt/raw response/credential/source redaction | 필요 | 필요 | 안정화, UI | profile, sidecar, Ops review, debug details, viewer/client, Event POST/WebRTC/SSE/WS payload에 prompt/raw response/credential/source URL/raw frame bytes가 노출되지 않음 |
| SAFE-029 | VLM sidecar와 외부 event/metadata 분리 | 비대상 | 필요 | 안정화 | VLMObservation, summary search, rule suggestion 결과는 sidecar/candidate contract에만 있고 `verify-v230-vlm-opt-in-operational-evidence` 기준으로 Sidecar/EventRecord/API schema, Event POST, WebRTC DataChannel, SSE/WS metadata에 섞이지 않음 |
| SAFE-030 | VLM 자동 rule/profile 적용 금지 | 비대상 | 필요 | 안정화 | rule suggestion 후보가 있어도 Rule/Profile registry write, auto apply, viewer/client suggestion 노출이 발생하지 않음 |
| SAFE-031 | VLM viewer/client 비노출 | 필요 | 필요 | 안정화, UI | viewer/client route/nav/API/UI에 VLM model, prompt, raw response, provider, internal review card, source/debug JSON이 노출되지 않음 |
| SAFE-032 | VLM queue/media path non-blocking | 비대상 | 필요 | 안정화 | VLM disabled/missing-model/invalid-output/timeout 상태가 RTSP/WebRTC media path, VA metadata, Event POST dispatch 실패로 전파되지 않음 |
| SAFE-033 | VLM Ops-only debug details boundary | 필요 | 필요 | 안정화, UI | VLM diagnostic JSON과 dry-run raw details는 Ops debug details 접힘 영역 안에만 있으며 제품 client 화면과 public evidence에는 노출되지 않음 |
| SAFE-034 | VLM local runtime smoke side-effect boundary | 비대상 | 필요 | 안정화 | `verify-vlm-local-runtime-smoke`와 `verify-v230-vlm-opt-in-operational-evidence`가 local runtime request/response/timeout cleanup을 실행하되 credential/prompt/raw runtime response/source URL/raw frame bytes 저장, sidecar write, Event POST/WebRTC/SSE/WS schema 변경, RTSP/WebRTC media path 변경, viewer/client 노출을 만들지 않음 |
| SAFE-035 | VLM cloud provider credential/redaction boundary | 비대상 | 필요 | 안정화 | `verify-vlm-cloud-provider-field-smoke-gate`와 `verify-v230-vlm-opt-in-operational-evidence`가 credential material, raw prompt, raw provider response, source URL, raw frame bytes를 report/profile/sidecar/Event POST/WebRTC/SSE/WS/client에 저장하지 않고, provider call 미실행은 PASS가 아님, 미실행/실패를 release PASS로 기록하지 않음 |
| SAFE-036 | VLM queue/backpressure non-blocking stability | 비대상 | 필요 | 안정화, 30분 | `verify-vlm-queue-backpressure-stability`와 VA/Event/metadata verifier 묶음이 VLM disabled/missing-model/invalid-output/timeout 상태가 RTSP/WebRTC media path, EventRecord, metadata fanout, Event POST dispatch를 block하지 않고 payload/schema를 바꾸지 않음을 확인 |
| SAFE-037 | VLM review action external schema boundary | 비대상 | 필요 | 안정화 | VLM review action은 Ops review JSONL/audit에만 저장되고 EventRecord, Event POST, WebRTC DataChannel, SSE/WS metadata, RTSP/WebRTC media path, client/viewer, sidecar에 action field나 raw note를 노출하지 않음 |
| SAFE-038 | VLM rule suggestion draft no-auto-save boundary | 필요 | 필요 | 안정화, UI | `/ops/rules` draft 적용은 이벤트 템플릿 form field만 채우며 기존 저장 버튼 수동 조작 전 Rule/Profile registry write, automatic apply, EventRecord/Event POST/WebRTC/SSE/WS schema 변경, media path 변경, client/viewer 노출을 만들지 않음 |
| SAFE-039 | External TURN/WHEP credential and endpoint redaction boundary | 비대상 | 필요 | 안정화 | V230-S04 `verify-v230-conditional-field-evidence`와 `verify-external-turn-whep-field-gate`가 TURN credential material, raw TURN server, raw WHEP URL, raw ICE candidate, source URL을 report/profile/Event POST/WebRTC/SSE/WS/client에 저장하지 않고, 미실행/실패/credential-only PASS를 기본 release PASS로 기록하지 않음 |
| SAFE-040 | Runtime/model bundle release asset prohibition | 비대상 | 필요 | 안정화 | `verify-runtime-model-bundle-rc-rehearsal`과 bundle policy가 ONNX Runtime package, FFmpeg/GStreamer GPL-risk runtime, YOLO/Re-ID/VLM model binary, download token, binary/runtime/model release asset 업로드를 기본 release에서 차단하고 source-only default를 유지 |
| SAFE-041 | V240-S02 EventRecord/Event POST incident workflow boundary | 필요 | 필요 | 안정화, UI | incident/action workflow는 Ops review JSONL와 `/ops/api/audit`에만 저장되고 EventRecord storage, Event POST payload, WebRTC DataChannel, SSE/WS metadata, RTSP/WebRTC media path, client/viewer에 incident/action field나 raw note를 노출하지 않음 |
| SAFE-042 | V240-S03 alert dry-run external delivery boundary | 필요 | 필요 | 안정화, UI | alert dry-run은 payload preview와 delivery attempt log만 생성하고 webhook/email/slack 외부 전송, Event POST payload 변경, EventRecord/metadata/media path 변경, endpoint secret/client-viewer 노출을 만들지 않음 |
| SAFE-043 | V250-S01 incident projection redaction boundary | 비대상 | 필요 | 안정화 | projection JSON/searchable text가 source URL, Developer URL, raw JSON/debugCounters/BBox diagnostics, auth material, model/provider internals를 저장하지 않고 EventRecord/Event POST/WebRTC/SSE/WS/media path schema를 변경하지 않음 |
| SAFE-044 | V250-S02 incident memory index dependency boundary | 비대상 | 필요 | 안정화 | local incident memory index가 external embedding/model/provider credential/runtime call을 만들지 않고 EventRecord/Event POST/WebRTC/SSE/WS/media path schema를 변경하지 않으며 SQLite unavailable 시 JSONL+BM25 fallback으로 제한됨 |
| SAFE-045 | V250-S03 incident search UI redaction boundary | 필요 | 필요 | 안정화, UI | `/ops/events` semantic search는 Ops-only review response의 redacted projection/highlight만 표시하고 source URL, Developer URL, raw JSON/debugCounters/BBox diagnostics, auth/model/provider material, Event POST/WebRTC/SSE/WS/media path schema를 변경하지 않음 |
| SAFE-046 | V250-S04 incident timeline graph boundary | 필요 | 필요 | 안정화, UI | incident timeline graph는 Ops-only node/edge summary와 audit linkage만 표시하고 source URL, Developer URL, raw JSON/debugCounters/BBox diagnostics, auth/model/provider material, Event POST/WebRTC/SSE/WS/media path schema를 변경하지 않음 |
| SAFE-047 | V250-S05 explainable incident brief boundary | 필요 | 필요 | 안정화, UI | explainable incident brief는 redacted slot summary와 VLM default-off/provider opt-in guard만 표시하고 source URL, Developer URL, raw JSON/debugCounters/BBox diagnostics, auth/model/provider material, Event POST/WebRTC/SSE/WS/media path schema를 변경하지 않음 |
| SAFE-048 | V250-S06 similar incident lookup boundary | 필요 | 필요 | 안정화, UI | similar incident lookup은 rule/scenario/source/status/action target 기반 score와 explanation term만 표시하고 source URL, Developer URL, raw JSON/debugCounters/BBox diagnostics, auth/model/provider material, Event POST/WebRTC/SSE/WS/media path schema를 변경하지 않음 |
| SAFE-049 | V250-S07 client-safe incident digest boundary | 필요 | 필요 | 안정화, UI | client-safe incident digest는 viewer-safe summaryText/severity/event type/status/time만 표시하고 source locator, raw evidence, debug material, provider material, Event POST/WebRTC/SSE/WS/media path schema를 변경하지 않음 |
| SAFE-050 | V250-S08 redacted incident evidence bundle boundary | 필요 | 필요 | 안정화, UI | release-safe incident evidence bundle은 manifest/searchResults/timelineSummary/redactionPolicy만 포함하고 snapshot/clip raw evidence, source URL, credential, debug material, provider material, Event POST/WebRTC/SSE/WS/media path schema를 변경하지 않음 |
| SAFE-051 | V250-S09 릴리즈 준비 경계 | 비대상 | 필요 | 안정화 | owner decomposition/release readiness gate는 Event POST/WebRTC/SSE/WS/RTSP/WebRTC media path/Auth/Rule/Profile payload schema를 바꾸지 않고 UI 풀테스트/30분/120분/published metadata/tag/push/GitHub Release 미실행을 PASS로 승격하지 않음 |
| SAFE-052 | V260-S01 VLM summary candidate productization boundary | 필요 | 필요 | 안정화, UI | `/ops/events` VLM summary candidate review는 Ops-only manual review wrapper만 추가하고 viewer/client route, EventRecord/Event POST/WebRTC/SSE/WS schema, RTSP/WebRTC media path, runtime VLM 호출, cloud provider 호출, 자동 Rule/Profile 적용을 만들지 않음 |
| SAFE-053 | V260-S02 incident-to-rule draft-only boundary | 필요 | 필요 | 안정화, UI | `/ops/events` incident-to-rule card는 matching rule suggestion을 표시하고 `/ops/rules` draft workflow로만 연결하며 Rule/Profile registry write, auto apply, client/viewer 노출, provider 호출, EventRecord/Event POST/WebRTC/SSE/WS/media path schema 변경을 만들지 않음 |
| SAFE-054 | V260-S03 ONVIF credential redaction boundary | 필요 | 필요 | 안정화, UI | ONVIF credential gate는 primary `none` provider와 fixture fallback만 허용하고 URL credential, credentialRef 원문, username/password/auth header/SOAP security header, SourceRegistry/PublishedView/client secret 노출, Event POST/WebRTC/SSE/WS/media path schema 변경을 만들지 않음 |
| SAFE-055 | V260-S04 runtime trend storage/schema boundary | 필요 | 필요 | 안정화, UI | runtime trend card는 현재 browser page session의 sample만 사용하고 localStorage/sessionStorage/indexedDB/server trend API, 장기 녹화, Event POST/WebRTC/SSE/WS schema 변경, RTSP/WebRTC media path 변경, client/viewer exposure를 만들지 않음 |
| SAFE-056 | V260-S05 scenario schema/media boundary | 필요 | 필요 | 안정화, UI | cross-zone re-entry 후보는 저장 rule scenario payload의 기존 field만 사용하고 새 event type, Event POST/WebRTC/SSE/WS schema 변경, RTSP/WebRTC media path 변경, client/viewer exposure를 만들지 않음 |
| SAFE-057 | V260-S06 릴리즈 준비 경계 | 비대상 | 필요 | 안정화 | release readiness gate는 UI 풀테스트 직접 조작, 30분/120분, `verify-release-metadata --published`, tag/push/GitHub Release, PR merge/main sync/후속 브랜치 생성을 local verifier PASS로 승격하지 않음 |
| SAFE-058 | V270-S01 incident triage board boundary | 필요 | 필요 | 안정화, UI | Incident Triage Board는 `/ops/events` Ops-only view model/UI만 추가하고 viewer/client route, EventRecord/Event POST/WebRTC/SSE/WS schema, RTSP/WebRTC media path, runtime VLM 호출, cloud provider 호출, 자동 조치 적용을 만들지 않음 |
| SAFE-059 | V270-S02 decision scorecard boundary | 필요 | 필요 | 안정화, UI | Decision scorecard는 `/ops/events` Ops-only deterministic reason summary만 추가하고 provider 호출, raw JSON/source URL 표시, viewer/client route, EventRecord/Event POST/WebRTC/SSE/WS schema, RTSP/WebRTC media path 변경을 만들지 않음 |
| SAFE-060 | V270-S03 operational action pack boundary | 필요 | 필요 | 안정화, UI | Operational Action Pack은 기존 수동 workflow link만 `/ops/events`에 표시하고 외부 실제 alert 발송, 자동 rule registry write, source registry write, viewer/client route, EventRecord/Event POST/WebRTC/SSE/WS schema, RTSP/WebRTC media path 변경을 만들지 않음 |
| SAFE-061 | V270-S04 rule what-if preview boundary | 필요 | 필요 | 안정화, UI | Rule What-if Preview는 selected incident/EventRecord와 rule suggestion 후보의 저장 전 condition preview만 `/ops/events`와 `/ops/rules` draft context에 표시하고 full replay engine, 자동 rule/profile 저장, 자동 적용, viewer/client route, EventRecord/Event POST/WebRTC/SSE/WS schema, RTSP/WebRTC media path 변경을 만들지 않음 |
| SAFE-062 | V270-S05 operator outcome memory boundary | 필요 | 필요 | 안정화, UI | Operator Outcome Memory는 기존 Ops review JSONL와 audit action reference만 읽어 accept/dismiss/review-needed history hint를 표시하고 새 persistent outcome store, 자동 학습/적용, viewer/client route, EventRecord/Event POST/WebRTC/SSE/WS schema, RTSP/WebRTC media path 변경을 만들지 않음 |
| SAFE-063 | V270-S06 릴리즈 준비 경계 | 비대상 | 필요 | 안정화 | `verify-v270-owner-release-readiness`는 v2.7.0 S01~S05 feature inventory, manual UI criteria, release policy/evidence, close-out dry-run companion command를 연결하되 UI 풀테스트 직접 조작, 30분/120분, `verify-release-metadata --published`, tag/push/GitHub Release, PR merge/main sync/후속 브랜치 생성을 local verifier PASS로 승격하지 않음 |
| SAFE-064 | V280-S00/S01 2.x runway and source-of-truth boundary | 비대상 | 필요 | 안정화 | source `2.8.0`, latest published `v2.7.0`, 2.x는 `2.8.0`/`2.9.0`까지만 유지, `3.0.0` major-change line을 분리하되 3.0 설계 완료나 publish/tag evidence로 승격하지 않음 |
| SAFE-065 | V280-S02 incident action readiness queue boundary | 필요 | 필요 | 안정화, UI | readiness queue는 Ops-only 준비 상태만 표시하고 외부 실제 발송, 자동 action write, EventRecord/Event POST/WebRTC/SSE/WS schema, RTSP/WebRTC media path, client/viewer 노출을 만들지 않음 |
| SAFE-066 | V280-S03 approval-gated rule draft boundary | 필요 | 필요 | 안정화, UI | staged rule draft readiness는 수동 approval 전 Rule/Profile registry write, 자동 저장, 자동 적용, full replay, EventRecord/Event POST/WebRTC/SSE/WS schema, RTSP/WebRTC media path 변경을 만들지 않음 |
| SAFE-067 | V280-S04 evidence intake field readiness boundary | 필요 | 필요 | 안정화, UI | evidence intake와 field readiness는 redacted 준비 상태만 표시하고 endpoint/credential 없는 field PASS, credential/source/raw/debug/provider material 노출, Event POST/WebRTC/SSE/WS/media path 변경을 만들지 않음 |
| SAFE-068 | V280-S05 runtime evidence window boundary | 필요 | 필요 | 안정화, UI | runtime evidence window는 bounded Ops-only summary이며 장기 녹화, persistent archive, 30분/120분 PASS, Event POST/WebRTC/SSE/WS schema, RTSP/WebRTC media path, client/viewer 노출을 만들지 않음 |
| SAFE-069 | V280-S06 client-safe follow-up digest boundary | 필요 | 필요 | 안정화, UI | client follow-up digest는 viewer-safe status/severity/time만 표시하고 source URL, raw evidence, debug material, provider material, rule editor/action controls를 노출하지 않음 |
| SAFE-070 | V280-S07 릴리즈 준비 경계 | 비대상 | 필요 | 안정화 | `verify-v280-owner-release-readiness`는 v2.8.0 feature inventory, manual UI criteria, release policy/evidence, close-out dry-run companion command를 연결하되 UI 풀테스트 직접 조작, 30분/120분, `verify-release-metadata --published`, tag/push/GitHub Release, PR merge/main sync/후속 브랜치 생성을 local verifier PASS로 승격하지 않음 |
| SAFE-071 | V290-S00 source-of-truth boundary | 비대상 | 필요 | 안정화 | source `2.9.0`, latest published `v2.8.0`, current roadmap `v2.9.0 Final 2.x Closure & Compatibility Baseline`을 분리 정렬하되 published metadata, tag/push/GitHub Release, UI 풀테스트, 30분/120분 PASS로 승격하지 않음 |
| SAFE-072 | V290-S01 2.x final contract freeze boundary | 비대상 | 필요 | 안정화 | `verify-v290-final-contract-freeze`가 Event POST/WebRTC/SSE/WS metadata, RTSP/WebRTC media path, Auth/Role/Scope, Rule/Profile payload의 2.x freeze 문서와 freeze-baseline hash 연결을 확인하되 runtime smoke, UI 풀테스트, 30분/120분, published metadata PASS로 승격하지 않음 |
| SAFE-073 | V290-S02 v2.8 기능군 회귀 묶음 boundary | 비대상 | 필요 | 안정화 | `verify-v290-v28-regression-bundle`이 v2.8 S02~S06 verifier를 v2.9 source tree에서 재실행하되 v2.8 완료 evidence 재사용, UI 직접 조작 PASS, 30분/120분, published metadata PASS로 승격하지 않음 |
| SAFE-074 | V290-S03 2.x compatibility baseline boundary | 비대상 | 필요 | 안정화 | `verify-v290-2x-compatibility-baseline`이 v2.5~v2.8 핵심 verifier와 v2.9 S01/S02 gate를 현재 source tree에서 재실행하되 각 하위 verifier 실행 범위만 PASS로 기록하고 UI/30분/120분/published metadata PASS로 승격하지 않음 |
| SAFE-075 | V290-S04 release test records enforcement boundary | 비대상 | 필요 | 안정화 | `verify-v290-release-test-records-enforcement`가 저장소 보존형 테스트 기록의 pass/fail 결과표, 미실행/제외 분리, `/tmp` final evidence 금지, summary-only 금지, cleanup/token 기록 경계를 확인하되 UI/30분/120분/published metadata PASS로 대체하지 않음 |
| SAFE-076 | V290-S05 UI fulltest criteria freeze boundary | 비대상 | 필요 | 안정화 | `verify-v290-ui-fulltest-criteria-freeze`가 v2.9 UI 풀테스트 route/control/action/role/viewport/theme 기준과 raw JSON/API-only/static smoke/screenshot-only/Chrome fallback 비승격 경계를 확인하되 실제 인앱 브라우저 직접 조작 PASS로 대체하지 않음 |
| SAFE-077 | V290-S06 release evidence hygiene boundary | 비대상 | 필요 | 안정화 | `verify-v290-release-evidence-hygiene`가 release evidence index, release test records, feature inventory, script inventory, manual UI evidence 연결과 PASS/FAIL vs 미실행/제외/manual-not-run/미확인 경계를 확인하되 실제 UI 풀테스트, 30분/120분, published metadata, tag/push/GitHub Release PASS로 대체하지 않음 |
| SAFE-078 | V290-S07 public docs/assets refresh boundary | 비대상 | 필요 | 안정화 | `verify-v290-public-docs-assets-refresh`가 README/README.en/docs index/UI guide/docs asset policy/release-version policy와 managed asset set을 확인하되 대표 이미지 직접 재캡처, 직접 브라우저 검수 PASS, UI 풀테스트, 30분/120분, published metadata, tag/push/GitHub Release PASS로 대체하지 않음 |
| SAFE-079 | V290-S08 final stabilization run boundary | 비대상 | 필요 | 안정화 | `verify-v290-final-stabilization-run`가 build/auth/Ops-Client UI/rule/event/metadata/media-schema/docs-inventory 안정화 실행 기록과 미실행 경계를 확인하되 UI 풀테스트 직접 조작, 30분/120분 longrun, published metadata, field smoke, tag/push/GitHub Release PASS로 대체하지 않음 |
| SAFE-080 | V290-S09 owner release readiness boundary | 비대상 | 필요 | 안정화 | `verify-v290-owner-release-readiness`가 v2.9.0 local readiness, release close-out dry-run, evidence/records/policy 연결을 확인하되 UI 풀테스트 직접 조작, 30분/120분 longrun, `verify-release-metadata --published`, PR/main/tag/GitHub Release, field smoke PASS로 대체하지 않음 |
| SAFE-081 | V300-S00 v3.0 baseline boundary | 비대상 | 필요 | 안정화 | `verify-v300-entry-baseline`가 source `3.0.0`, latest published `v3.0.0`, current roadmap `v3.0.0 Event Evidence Search MVP`, 1차 선택값/fallback/제외 대상, release records, inventory 연결을 확인하되 Event Evidence Contract, frame bundle, feature schema, search UI, UI 풀테스트 직접 조작, 30분/120분, published metadata, PR/main/tag/GitHub Release PASS로 대체하지 않음 |
| SAFE-082 | V300-S01 evidence contract boundary | 비대상 | 필요 | 안정화 | `verify-v300-event-evidence-contract`가 EvidenceManifest, FrameRef, 7일 retention, pin cleanup 제외, raw prompt/response non-retention, identity feature 금지, non-VMS boundary를 확인하되 frame extraction, encoded clip/playback, VMS archive API, Search DSL, `/ops/events` UI, UI 풀테스트, 30분/120분, published metadata PASS로 대체하지 않음 |
| SAFE-083 | V310-S02 encoded clip non-VMS boundary | 비대상 | 필요 | 안정화 | `verify-analysis-state`가 WebM/VP8 encoded clip artifact와 queue/status manifest의 bounded short segment, `continuousRecording=false`, `archiveApi=false`, partial cleanup 기록을 확인하되 24/7 recording, VMS/NVR archive API, replay UI, client viewer exposure, Event POST/WebRTC/SSE/WS schema 변경, RTSP/WebRTC media path 변경 evidence로 쓰지 않음 |
| SAFE-084 | V300-S02 frame bundle boundary | 비대상 | 필요 | 안정화 | `verify-analysis-state`가 V300-S02 EvidenceManifest와 frame bundle manifest의 eventFrame 필수, representativeImage selection 경계, bboxCrop reference, pre/event/post FrameRef, raw prompt/response non-retention, identity feature 금지, VMS/NVR archive API 금지, encoded clip/playback 비승격 경계를 확인하되 Search DSL, `/ops/events` UI, UI 풀테스트, 30분/120분, published metadata PASS로 대체하지 않음 |
| SAFE-085 | V300-S03 privacy and identity boundary | 비대상 | 필요 | 안정화 | `verify-v300-feature-schema-privacy`가 FeatureSet privacy guard에서 raw LLM/VLM prompt, raw provider response, face recognition, watchlist, face embedding, person/account identity, license plate searchable identity를 금지하고 EventRecord/Event POST/WebRTC/SSE/WS/media path 변경 없음과 UI/longrun/published 비승격 경계를 확인함 |
| SAFE-086 | V300-S04 VLM feature queue isolation boundary | 비대상 | 필요 | 안정화, 30분 | `verify-v300-vlm-feature-queue`가 missing-runtime, queue-timeout, invalid-output을 VLM-only failure로 닫고 media path, EventRecord, metadata fanout, Event POST dispatch, Event POST/WebRTC/SSE/WS schema, raw prompt/response retention으로 전파하지 않음을 확인함 |
| SAFE-087 | V300-S05 raw prompt/response non-retention boundary | 비대상 | 필요 | 안정화 | `verify-v300-feature-only-retention`가 raw prompt, raw provider response, provider request body, credential, source URL, raw frame bytes를 durable FeatureSet retention에서 거부하고 provider replay, Event POST/WebRTC/SSE/WS schema, RTSP/WebRTC media path 변경으로 전파하지 않음을 확인함 |
| SAFE-088 | V300-S06 query convert privacy and boundary | 비대상 | 필요 | 안정화 | `verify-v300-search-dsl-query-convert`가 query conversion 중 raw prompt/raw provider response를 보존하지 않고 runtime provider call, vector search, Event POST/WebRTC/SSE/WS schema, RTSP/WebRTC media path 변경으로 전파하지 않으며 identity/watchlist query를 거부함 |
| SAFE-089 | V300-S07 search index privacy and boundary | 비대상 | 필요 | 안정화 | `verify-v300-feature-search-index`가 Feature/Search Index projection 중 raw prompt/raw provider response, identity feature, provider call, vector search, Event POST/WebRTC/SSE/WS schema, RTSP/WebRTC media path 변경, viewer/client 노출을 만들지 않음을 확인함 |
| SAFE-090 | V300-S08 Ops Events UI boundary | 비대상 | 필요 | 안정화 | `verify-v300-ops-events-ui`가 `/ops/events` UI shell/view model/script/CSS와 Ops-only redaction boundary를 확인하되 UI 풀테스트 직접 조작, 30분/120분, Retention/Pin/Cleanup lifecycle delete/dry-run/audit, Event POST/WebRTC/SSE/WS schema, RTSP/WebRTC media path 변경 evidence로 쓰지 않음 |
| SAFE-091 | V300-S09 retention cleanup boundary | 비대상 | 필요 | 안정화 | `verify-v300-retention-pin-cleanup`가 cleanup plan에서 EventRecord, EvidenceManifest, FeatureSet revision, SearchIndex entry를 일관되게 삭제/de-index 대상으로 묶고 pinned event를 자동 cleanup에서 제외하며 Event POST/WebRTC/SSE/WS schema, RTSP/WebRTC media path, viewer/client 노출을 만들지 않음을 확인함 |
| SAFE-092 | V300-S10 stabilization/release readiness boundary | 비대상 | 필요 | 안정화 | `verify-v300-stabilization-release-readiness`가 v3.0 local stabilization, release evidence/not-run 경계, close-out dry-run 기록을 확인하되 UI 풀테스트 직접 조작, 30분/120분, published metadata, release action PASS로 대체하지 않음을 확인함 |
| SAFE-093 | V310-S00 v3.1 baseline boundary | 비대상 | 필요 | 안정화 | `verify-v310-entry-baseline`가 source `3.1.0`, latest published `v3.1.0`, current roadmap `v3.1.0 Encoded Event Clip and Safe Sharing Expansion`, 1차 선택값/fallback/제외 대상, license/provenance/privacy/운영 제약, release records, inventory 연결을 확인하되 encoded clip contract/pipeline/replay UI/client digest/scoped API/operator correction/vector search/export hardening, UI 풀테스트 직접 조작, 30분/120분, published metadata, PR/main/tag/GitHub Release PASS로 대체하지 않음 |
| SAFE-094 | V310-S01 encoded clip contract boundary | 비대상 | 필요 | 안정화 | `verify-v310-event-clip-contract`가 EncodedClipManifest, MP4/WebM format, FrameRef/PTS mapping, evidence links, 7일 retention, raw prompt/response non-retention, identity feature 금지, non-VMS boundary를 확인하되 encoder generation, replay UI, cleanup execution, client digest, scoped API, UI 풀테스트, 30분/120분, published metadata PASS로 대체하지 않음 |
| SAFE-095 | V310-S03 replay timeline UI boundary | 비대상 | 필요 | 안정화 | `verify-v310-replay-timeline-ui`가 `/ops/events` replayTimeline view model/UI shell/script/CSS에서 Event POST/WebRTC DataChannel/SSE/WS metadata schema, RTSP/WebRTC media path, viewer/client exposure, source URL/raw JSON/debug material을 변경하지 않음을 확인하되 UI 풀테스트 직접 조작, 30분/120분, client digest, scoped API, cleanup execution, published metadata PASS로 대체하지 않음 |
| SAFE-096 | V310-S04 client-safe event digest boundary | 비대상 | 필요 | 안정화 | `verify-v310-client-safe-event-digest`가 `/client/api/views/{id}/events`와 client live/dashboard/events에 viewer-safe digest만 추가하고 Event POST/WebRTC DataChannel/SSE/WS metadata schema, RTSP/WebRTC media path, Auth/Role/Scope, Rule/Profile payload, source URL/raw JSON/debug/provider/feature provenance/encoded clip path 노출을 변경하지 않음을 확인하되 UI 풀테스트 직접 조작, 30분/120분, scoped API, cleanup execution, published metadata PASS로 대체하지 않음 |
| SAFE-097 | V310-S05 scoped integrator search redaction boundary | 비대상 | 필요 | 안정화 | `verify-v310-scoped-integrator-search-api`가 integrator-only search API에서 Event POST/WebRTC DataChannel/SSE/WS metadata schema, RTSP/WebRTC media path, Rule/Profile payload, source URL/raw JSON/debug/provider/feature provenance/internal evidence/encoded clip path 노출을 변경하지 않음을 확인하되 UI 풀테스트 직접 조작, 30분/120분, cleanup execution, vector search, published metadata PASS로 대체하지 않음 |
| SAFE-098 | V310-S06 operator correction boundary | 필요 | 필요 | 안정화, UI | `verify-v310-operator-feature-correction`가 operator correction/alias/reanalysis request가 Ops review state와 audit에만 저장되고 EventRecord/Event POST/WebRTC DataChannel/SSE/WS metadata schema, RTSP/WebRTC media path, Rule/Profile payload, client/viewer exposure, runtime provider replay, vector search를 변경하지 않음을 확인하되 UI 풀테스트 직접 조작, 30분/120분, cleanup execution, published metadata PASS로 대체하지 않음 |
| SAFE-099 | V310-S08 retention/export boundary | 비대상 | 필요 | 안정화 | `verify-v310-retention-export-hardening`이 release-safe export bundle에서 encoded clip media/path/material, source URL, raw evidence, provider/debug material을 제외하고 signed token expiry와 `export-bundle` audit coverage를 확인하되 UI 풀테스트 직접 조작, 30분/120분, vector search, destructive operational cleanup, published metadata PASS로 대체하지 않음 |
| SAFE-100 | V310-S07 optional vector search boundary | 비대상 | 필요 | 안정화 | `verify-v310-optional-vector-search`가 optional vector index/search를 기본 off로 유지하고 명시 opt-in에서도 raw prompt/raw provider response/runtime provider call/face embedding/identity embedding/Event POST/WebRTC/SSE/WS schema/RTSP-WebRTC media path/client-viewer 노출을 만들지 않음을 확인하되 provider embedding calls, UI 풀테스트 직접 조작, 30분/120분, published metadata PASS로 대체하지 않음 |
| SAFE-101 | V310-S09 stabilization/release readiness boundary | 비대상 | 필요 | 안정화 | `verify-v310-stabilization-release-readiness`가 v3.1 local stabilization, release evidence/not-run 경계, close-out dry-run 기록을 확인하되 UI 풀테스트 직접 조작, 30분/120분, published metadata, release action PASS로 대체하지 않음을 확인함 |
| SAFE-102 | V320 Step 1 v3.2 baseline boundary | 비대상 | 필요 | 안정화 | `verify-v320-entry-baseline`가 source `3.2.0`, latest published `v3.2.0`, current roadmap `v3.2.0 Operations Resolution Workspace`, 1차 선택값/fallback/제외 대상, license/provenance/privacy/운영 제약, release records, inventory 연결을 확인하되 resolution state contract/unified workspace/evidence quality/source reliability/AI review/operator flow/action checklist/client digest/search metrics, UI 풀테스트 직접 조작, 30분/120분, published metadata, PR/main/tag/GitHub Release PASS로 대체하지 않음 |
| SAFE-103 | V320 Step 2 resolution boundary | 비대상 | 필요 | 안정화 | `verify-v320-resolution-state-contract`가 resolution state contract가 Ops review state/audit에만 저장되고 EventRecord/Event POST/WebRTC DataChannel/SSE/WS metadata, RTSP/WebRTC media path, Rule/Profile payload, client/viewer exposure, operator assignment flow, search/metrics를 변경하지 않음을 확인하되 UI 풀테스트 직접 조작, 30분/120분, published metadata PASS로 대체하지 않음 |
| SAFE-104 | V320 Step 3 unified workspace boundary | 필요 | 필요 | 안정화, UI | `verify-v320-unified-ops-events-workspace`가 `/ops/events`의 unifiedResolutionWorkspace UI/view model/script/CSS에서 EventRecord/Event POST/WebRTC DataChannel/SSE/WS metadata schema, RTSP/WebRTC media path, Rule/Profile payload, viewer/client exposure, source URL/raw JSON/debug material을 변경하지 않음을 확인하되 UI 풀테스트 직접 조작, 30분/120분, evidence quality, source reliability, AI review quality, operator assignment flow, client digest, search/metrics, published metadata PASS로 대체하지 않음 |
| SAFE-105 | V320 Step 4 evidence quality boundary | 필요 | 필요 | 안정화, UI | `verify-v320-evidence-quality-layer`가 evidenceQuality layer가 EventRecord evidence refs와 Ops review state를 deterministic hint로만 요약하고 EventRecord/Event POST/WebRTC DataChannel/SSE/WS metadata schema, RTSP/WebRTC media path, Rule/Profile payload, viewer/client exposure, source URL/raw JSON/debug material, raw evidence material을 변경하지 않음을 확인하되 UI 풀테스트 직접 조작, 30분/120분, full replay engine, source reliability, AI review quality, operator assignment flow, client digest, search/metrics, published metadata PASS로 대체하지 않음 |
| SAFE-106 | V320 Step 5 source reliability boundary | 필요 | 필요 | 안정화, UI | `verify-v320-source-reliability-context`와 `verify-v320-source-reliability-runtime-sample`이 sourceReliability context가 SourceRegistry source health snapshot과 EventRecord source identifier를 deterministic hint로만 요약하고 EventRecord/Event POST/WebRTC DataChannel/SSE/WS metadata schema, RTSP/WebRTC media path, Rule/Profile payload, viewer/client exposure, source URL/raw JSON/debug material, source registry write를 변경하지 않음을 확인하되 UI 풀테스트 직접 조작, 30분/120분, AI review quality, operator assignment flow, client digest, search/metrics, published metadata PASS로 대체하지 않음 |
| SAFE-107 | V320 Step 6 AI review quality boundary | 필요 | 필요 | 안정화, UI | `verify-v320-ai-review-quality-context`가 aiReviewQuality context가 기존 Ops review state, evidence quality, source reliability context를 deterministic hint로만 요약하고 EventRecord/Event POST/WebRTC DataChannel/SSE/WS metadata schema, RTSP/WebRTC media path, Rule/Profile payload, viewer/client exposure, source URL/raw JSON/debug material, runtime provider call, raw provider material을 변경하지 않음을 확인하되 UI 풀테스트 직접 조작, 30분/120분, operator assignment flow, action checklist, client digest, search/metrics, published metadata PASS로 대체하지 않음 |
| SAFE-108 | V320 Step 7 operator resolution boundary | 필요 | 필요 | 안정화, UI | `verify-v320-operator-resolution-flow`가 operatorResolutionFlow context와 nested write payload가 Ops review JSONL/audit에만 저장되고 EventRecord/Event POST/WebRTC DataChannel/SSE/WS metadata schema, RTSP/WebRTC media path, Rule/Profile payload, viewer/client exposure, source URL/raw JSON/debug material, 자동 조치를 변경하지 않음을 확인하되 UI 풀테스트 직접 조작, 30분/120분, action checklist, client digest, search/metrics, published metadata PASS로 대체하지 않음 |
| SAFE-109 | V320 Step 8 action readiness boundary | 필요 | 필요 | 안정화, UI | `verify-v320-action-readiness-checklist`가 actionReadinessChecklist context가 기존 EventRecord/source/AI/operator context를 deterministic checklist로만 요약하고 EventRecord/Event POST/WebRTC DataChannel/SSE/WS metadata schema, RTSP/WebRTC media path, Rule/Profile payload, viewer/client exposure, source URL/raw JSON/debug material, rule draft 생성, 자동 조치, external delivery를 변경하지 않음을 확인하되 UI 풀테스트 직접 조작, 30분/120분, client digest, search/metrics, published metadata PASS로 대체하지 않음 |
| SAFE-110 | V320 Step 9 client-safe resolution digest boundary | 필요 | 필요 | 안정화, UI | `verify-v320-client-safe-resolution-digest`가 `/client/api/views/{id}/events`와 client live/dashboard/events에 viewer-safe resolution digest만 추가하고 EventRecord/Event POST/WebRTC DataChannel/SSE/WS metadata schema, RTSP/WebRTC media path, Auth/Role/Scope, Rule/Profile payload, source URL/raw JSON/debug/provider/feature provenance/internal evidence/operator note/action control 노출을 변경하지 않음을 확인하되 UI 풀테스트 직접 조작, 30분/120분, search/metrics, published metadata PASS로 대체하지 않음 |
| SAFE-111 | V320 Step 10 resolution search metrics boundary | 필요 | 필요 | 안정화, UI | `verify-v320-resolution-search-metrics`가 resolutionSearchMetrics context가 기존 EventRecord/Ops review/v3.2 context를 deterministic search/metric view로만 요약하고 saved view write, client digest, source URL/raw JSON/debug material, EventRecord/Event POST/WebRTC DataChannel/SSE/WS metadata schema, RTSP/WebRTC media path, Auth/Role/Scope, Rule/Profile payload를 변경하지 않음을 확인하되 Stabilization and Release Readiness, UI 풀테스트 직접 조작, 30분/120분, published metadata PASS로 대체하지 않음 |
| SAFE-112 | V320 Step 11 stabilization/release readiness boundary | 비대상 | 필요 | 안정화 | `verify-v320-stabilization-release-readiness`가 v3.2 local stabilization, release evidence/not-run 경계, close-out dry-run 기록을 확인하되 UI 풀테스트 직접 조작, 30분/120분, published metadata, PR/main/tag/GitHub Release, field smoke PASS로 대체하지 않음을 확인함 |
| SAFE-113 | V330 Step 1 v3.3 baseline boundary | 비대상 | 필요 | 안정화 | `verify-v330-entry-baseline`가 source `3.3.0`, latest published `v3.2.0`, current roadmap `v3.3.0 Live Source Reliability Workspace`, 1차 선택값/fallback/제외 대상, license/provenance/privacy/운영 제약, release records, inventory 연결을 확인하되 source registry snapshot/onboarding quality/reliability timeline/incident correlation/recovery queue/client digest/search metrics, UI 풀테스트 직접 조작, 30분/120분, published metadata, PR/main/tag/GitHub Release PASS로 대체하지 않음 |
| SAFE-114 | V330 Step 2 source registry snapshot boundary | 비대상 | 필요 | 안정화 | `verify-v330-source-registry-snapshot-identity`가 SourceViewRegistry의 Ops-only snapshot identity read model과 `/ops/api/source-registry/snapshot` route가 sourceId/source kind/PublishedView/canonical source key/owner context를 읽기 전용으로 조합하고 source registry write, PublishedView write, EventRecord/Event POST/WebRTC DataChannel/SSE/WS metadata schema, RTSP/WebRTC media path, Rule/Profile payload, viewer/client output을 변경하지 않음을 확인하되 onboarding quality, reliability timeline, incident correlation, recovery queue, client digest, search/metrics, UI 풀테스트 직접 조작, 30분/120분, published metadata PASS로 대체하지 않음 |
| SAFE-115 | V330 Step 3 source onboarding quality boundary | 비대상 | 필요 | 안정화 | `verify-v330-source-onboarding-quality-summary`가 SourceViewRegistry의 Ops-only onboarding quality read model, `/ops/api/source-registry/onboarding-quality` route, `/ops/sources` 요약 UI가 저장 전 validation/중복/누락/ready/input quality를 읽기 전용으로 요약하고 source registry write, PublishedView write, EventRecord/Event POST/WebRTC DataChannel/SSE/WS metadata schema, RTSP/WebRTC media path, Rule/Profile payload, viewer/client output, raw locator/credential 노출을 변경하지 않음을 확인하되 reliability timeline, incident correlation, recovery queue, client digest, search/metrics, 30분/120분, published metadata PASS로 대체하지 않음 |
| SAFE-116 | V330 Step 4 reliability timeline boundary | 비대상 | 필요 | 안정화 | `verify-v330-reliability-timeline-health-history`가 current source health snapshot과 `source-health-state-change` Ops audit history를 Ops-only timeline으로 요약하고 source registry write, PublishedView write, EventRecord/Event POST/WebRTC DataChannel/SSE/WS metadata schema, RTSP/WebRTC media path, Rule/Profile payload, viewer/client output, raw locator/credential 노출을 변경하지 않음을 확인하되 incident correlation, recovery queue, client digest, search/metrics, 30분/120분, published metadata PASS로 대체하지 않음 |
| SAFE-117 | V330 Step 5 incident source correlation boundary | 필요 | 필요 | 안정화, UI | `verify-v330-incident-source-correlation-layer`가 incidentSourceCorrelation context가 기존 resolution detail/sourceReliability/source health audit handoff를 deterministic hint로만 요약하고 source registry write, PublishedView write, EventRecord write, EventRecord/Event POST/WebRTC DataChannel/SSE/WS metadata schema, RTSP/WebRTC media path, Rule/Profile payload, recovery queue, client digest, search/metrics, viewer/client output, source URL/raw JSON/debug/raw locator/credential 노출을 변경하지 않음을 확인하되 UI 풀테스트 직접 조작, 30분/120분, published metadata PASS로 대체하지 않음 |
| SAFE-118 | V330 Step 6 operator recheck recovery boundary | 필요 | 필요 | 안정화, UI | `verify-v330-operator-recheck-recovery-queue`가 operatorRecheckRecoveryQueue context가 기존 resolution detail/sourceReliability/incidentSourceCorrelation/operator note 상태를 deterministic queue hint로만 요약하고 source registry write, PublishedView write, EventRecord write, EventRecord/Event POST/WebRTC DataChannel/SSE/WS metadata schema, RTSP/WebRTC media path, Rule/Profile payload, persistent recovery queue write, client digest, search/metrics, viewer/client output, source URL/raw JSON/debug/raw locator/credential 노출, 자동 recovery를 변경하지 않음을 확인하되 UI 풀테스트 직접 조작, 30분/120분, published metadata PASS로 대체하지 않음 |
| SAFE-119 | V330 Step 7 client-safe source status digest boundary | 필요 | 필요 | 안정화, UI | `verify-v330-client-safe-source-status-digest`가 `/client/api/views/{id}/events`와 client live/dashboard/events에 viewer-safe sourceStatusDigest만 추가하고 source registry write, PublishedView write, EventRecord write, EventRecord/Event POST/WebRTC DataChannel/SSE/WS metadata schema, RTSP/WebRTC media path, Rule/Profile payload, search/metrics, source URL/raw locator/raw JSON/debug/credential/operator material/action control 노출을 변경하지 않음을 확인하되 UI 풀테스트 직접 조작, 30분/120분, published metadata PASS로 대체하지 않음 |
| SAFE-120 | V330 Step 8 operator runbook reliability handoff boundary | 비대상 | 필요 | 안정화 | `verify-v330-operator-runbook-reliability-handoff`가 operator runbook과 reliability handoff 문서 연결만 확인하고 제품 API/UI schema, EventRecord/Event POST/WebRTC DataChannel/SSE/WS metadata schema, RTSP/WebRTC media path, SourceRegistry/PublishedView write, automatic recovery, real backup/restore, search/metrics, UI 풀테스트 직접 조작, 30분/120분, published metadata PASS로 대체하지 않음을 확인함 |
| SAFE-121 | V330 Step 9 source reliability search metrics boundary | 필요 | 필요 | 안정화, UI | `verify-v330-source-reliability-search-metrics`가 sourceReliabilitySearchMetrics context가 기존 source health snapshot과 source-health-state-change audit history를 deterministic search/metric view로만 요약하고 source registry write, PublishedView write, saved view write, EventRecord/Event POST/WebRTC DataChannel/SSE/WS metadata schema, RTSP/WebRTC media path, Rule/Profile payload, viewer/client output, source URL/raw JSON/debug/raw locator/credential 노출, 자동 recovery를 변경하지 않음을 확인하되 Ops Backup and Recovery Source Handoff, UI 풀테스트 직접 조작, 30분/120분, published metadata PASS로 대체하지 않음 |
| SAFE-122 | V330 Step 10 backup recovery source handoff boundary | 필요 | 필요 | 안정화, UI | `verify-v330-ops-backup-recovery-source-handoff`가 backupRecoverySourceHandoff context가 기존 SourceRegistry/PublishedView snapshot과 source health snapshot을 deterministic recovery validation plan 입력으로만 요약하고 source registry write, PublishedView write, source health snapshot persistence, recovery validation plan persistence, real backup/restore, EventRecord/Event POST/WebRTC DataChannel/SSE/WS metadata schema, RTSP/WebRTC media path, Rule/Profile payload, viewer/client output, source URL/raw JSON/debug/raw locator/credential 노출, 자동 recovery를 변경하지 않음을 확인하되 UI 풀테스트 직접 조작, 30분/120분, published metadata PASS로 대체하지 않음 |
| SAFE-123 | V330 Step 11 stabilization/release readiness boundary | 비대상 | 필요 | 안정화 | `verify-v330-stabilization-release-readiness`가 v3.3 local stabilization, release evidence/not-run 경계, close-out dry-run 기록을 확인하되 UI 풀테스트 직접 조작, 30분/120분, published metadata, PR/main/tag/GitHub Release, field smoke PASS로 대체하지 않음을 확인함 |
| SAFE-124 | V340 Step 1 v3.4 baseline boundary | 비대상 | 필요 | 안정화 | `verify-v340-entry-baseline`가 source `3.4.0`, latest published `v3.4.0`, current roadmap `v3.4.0 Operations Continuity Drill Workspace`, release records, inventory, server dispatch 연결을 확인하되 v3.4 기능 구현, UI 풀테스트 직접 조작, 30분/120분, PR/main/tag/GitHub Release PASS로 대체하지 않음 |
| SAFE-125 | V340 Step 2 continuity drill contract boundary | 비대상 | 필요 | 안정화 | `verify-v340-continuity-drill-contract`가 recovery drill contract를 Ops-only read-only/no-write/no-secret/no-media-path-change 입력으로 노출하고 SourceRegistry/PublishedView/EventRecord/Ops audit write, automatic recovery, viewer/client exposure, schema/media path 변경이 없음을 확인 |
| SAFE-126 | V340 Step 3 recovery candidate redaction boundary | 비대상 | 필요 | 안정화 | `verify-v340-recovery-candidate-package`가 redacted recovery candidate package에 source locator, credential material, raw audit body, media path, client/viewer material을 포함하지 않고 EventRecord/Event POST/WebRTC/SSE/WS/media schema를 변경하지 않음을 확인 |
| SAFE-127 | V340 Step 4 staging restore no-production-write boundary | 비대상 | 필요 | 안정화 | `verify-v340-staging-restore-validation-harness`가 temporary staging runtime validation만 수행하고 production registry, PublishedView, auth store, media path write를 수행하지 않음을 확인 |
| SAFE-128 | V340 Step 5 source health replay drift diff boundary | 비대상 | 필요 | 안정화 | `verify-v340-source-health-replay-drift-diff`가 source health replay drift를 read-only 요약으로만 노출하고 SourceRegistry/PublishedView/Ops audit write, source health persistence, recovery plan persistence, automatic recovery, EventRecord/Event POST/WebRTC/SSE/WS/media schema 변경, source URL/raw locator/debug/credential 노출을 수행하지 않음을 확인 |
| SAFE-129 | V340 Step 6 Ops continuity drill UI boundary | 필요 | 필요 | 안정화, UI | `/ops/sources` Step 6 workspace가 drill package, validation status, blocked/ready 상태만 read-only로 표시하고 source URL/raw locator/raw JSON/debug/credential material, automatic recovery, source registry/PublishedView/Ops audit write를 수행하지 않음을 확인 |
| SAFE-130 | V340 Step 7 approval-gated recovery no-auto boundary | 필요 | 필요 | 안정화, UI | `verify-v340-approval-gated-recovery-checklist-audit`가 operator note, readiness status, dry-run result, Ops audit linkage를 read-only로 표시하되 automatic recovery, SourceRegistry/PublishedView/Ops audit write, EventRecord/Event POST/WebRTC/SSE/WS/media schema 변경, source URL/raw locator/raw JSON/debug/credential material 노출을 수행하지 않음을 확인 |
| SAFE-131 | V340 Step 8 client-safe maintenance digest boundary | 필요 | 필요 | 안정화, UI | `verify-v340-client-safe-maintenance-digest`가 client maintenance digest에서 source URL/raw locator/raw JSON/debug/credential material/operator note/Ops audit/dry-run/recovery action을 숨기고 source registry/PublishedView/EventRecord/Event POST/schema/media/search 변경을 수행하지 않음을 확인 |
| SAFE-132 | V340 Step 9 drill evidence export cleanup boundary | 필요 | 필요 | 안정화, UI | `verify-v340-drill-evidence-export-cleanup-manifest`가 redacted drill artifact manifest, minimum retained evidence, /tmp cleanup manifest, sensitive material scan boundary를 기록하되 artifact export 실행, cleanup 실행, SourceRegistry/PublishedView/EventRecord/Ops audit write, Event POST/WebRTC/SSE/WS/media schema 변경, source URL/raw locator/raw JSON/debug/credential material/raw audit body 노출을 수행하지 않음을 확인 |
| SAFE-133 | V340 Step 10 source-only PASS and credential boundary | 비대상 | 필요 | 안정화 | `verify-v340-field-bridge-condition-gates`가 sourceOnlyPassAccepted=false, localVerifierPassSubstitutesFieldSmoke=false, fieldSmokeExecuted=false를 고정하고 endpoint URL, credential material, raw locator/raw JSON/debug/provider material, raw TURN credential, raw VLM prompt/response를 노출하지 않음을 확인 |
| SAFE-134 | V340 Step 11 stabilization/release readiness boundary | 비대상 | 필요 | 안정화 | `verify-v340-stabilization-release-readiness`가 v3.4 Step 1~10 local verifier, release metadata/docs/assets/inventory/evidence/script/closeout dry-run 연결을 확인하되 UI 풀테스트 직접 조작, 30분/120분, published metadata, PR/main/tag/GitHub Release, field smoke PASS로 대체하지 않음을 확인 |
| SAFE-135 | V350 Step 1 v3.5 baseline boundary | 비대상 | 필요 | 안정화 | `verify-v350-entry-baseline`가 source `3.5.0`, latest published `v3.4.0`, current roadmap `v3.5.0 Live Operations Control Plane`, release records, inventory, server dispatch 연결을 확인하되 v3.5 기능 구현, UI 풀테스트 직접 조작, 30분/120분, PR/main/tag/GitHub Release PASS로 대체하지 않음 |
| SAFE-136 | V350 Step 2 live operations graph redaction boundary | 비대상 | 필요 | 안정화 | `verify-v350-live-operations-graph-contract`가 EventRecord, SourceRegistry, PublishedView, source health, continuity drill, client impact graph를 Ops-only read-only redacted model로 노출하고 source locator, credential, raw diagnostic JSON, media path, client/viewer material을 노출하지 않음을 확인 |
| SAFE-137 | V350 Step 3 command plan no-execution boundary | 비대상 | 필요 | 안정화 | `verify-v350-operations-command-plan-contract`가 source recheck, recovery, maintenance, client notice, rule follow-up 후보를 draft-only로 표시하되 실행, source/view/rule/client/EventRecord/Ops audit/media mutation을 수행하지 않음을 확인 |
| SAFE-138 | V350 Step 4 handoff read-only boundary | 필요 | 필요 | 안정화, UI | `verify-v350-incident-to-command-handoff`가 `/ops/events` selected detail handoff를 read-only/draft-only로 표시하고 command execution, source/view/rule/EventRecord/Ops audit/client/media mutation과 raw locator/credential 노출을 수행하지 않음을 확인 |
| SAFE-139 | V350 Step 5 staged change no-apply boundary | 비대상 | 필요 | 안정화 | `verify-v350-staged-change-plan-impact-preview`가 source/view/rule follow-up 후보를 staging-only impact preview로만 표시하고 sourceChangeApplied, publishedViewChangeApplied, ruleFollowUpApplied, commandPlanExecuted, source/view/rule/EventRecord/Ops audit/client/media mutation을 수행하지 않음을 확인 |
| SAFE-140 | V350 Step 6 Ops command workspace UI boundary | 필요 | 필요 | 안정화, UI | `verify-v350-ops-command-workspace-ui`가 `/ops` command workspace에서 incident/source/drill/staged plan/client impact를 read-only로 묶어 표시하고 commandPlanExecuted, source/view/rule/EventRecord/Ops audit/client/media mutation과 raw locator/credential/debug 노출을 수행하지 않음을 확인 |
| SAFE-141 | V350 Step 7 drill run ledger boundary | 비대상 | 필요 | 안정화 | `verify-v350-drill-run-ledger-plan-comparison`이 drill run ledger를 append-only/read-only projection으로 산출하고 drillRunWritePerformed, operatorNoteWritePerformed, commandPlanExecuted, source/view/rule/EventRecord/Ops audit/client/media mutation과 raw locator/credential/debug 노출을 수행하지 않음을 확인 |
| SAFE-142 | V350 Step 8 client impact forecast boundary | 비대상 | 필요 | 안정화 | `verify-v350-client-impact-forecast`가 clientImpactForecast를 viewer-safe PublishedView-scoped digest로만 표시하고 source URL/raw locator/raw JSON/debug/credential/operator material, command plan details/action controls, source/view/rule/EventRecord/Ops audit/client/media mutation을 수행하지 않음을 확인 |
| SAFE-143 | V350 Step 9 client-safe operations notice boundary | 비대상 | 필요 | 안정화 | `verify-v350-client-safe-operations-notice`가 clientOperationsNotice를 viewer-safe PublishedView-scoped notice로만 표시하고 operationsStatus/timelineHint 외 source URL/raw locator/raw JSON/debug/credential/operator material, command plan detail, incident detail/action controls, source/view/rule/EventRecord/Ops audit/client/media mutation을 수행하지 않음을 확인 |
| SAFE-144 | V350 Step 10 operations export bundle boundary | 비대상 | 필요 | 안정화 | `verify-v350-operations-export-bundle-handoff-map`이 release-safe export bundle과 handoff map을 route/id refs만으로 구성하고 artifactExportExecuted, handoffWritePerformed, fieldEvidenceExecutionPerformed, commandPlanExecuted, source/view/EventRecord/Ops audit/client/media mutation, raw locator/credential/provider/VLM/client viewer material 노출을 수행하지 않음을 확인 |
| SAFE-145 | V350 Step 11 field evidence redaction boundary | 비대상 | 필요 | 안정화 | `verify-v350-field-evidence-intake`가 redacted field evidence와 execution conditions/not-run 상태만 산출하고 fieldEvidenceWritePerformed, fieldSmokeExecuted, endpointProbePerformed, credentialProbePerformed, onvifDeviceContacted, externalWhepTurnContacted, cloudProviderContacted, vlmProviderCalled, source/view/EventRecord/Ops audit/client/media mutation, raw endpoint/credential/provider/VLM material 노출을 수행하지 않음을 확인 |
| SAFE-146 | V350 Step 12 VLM-assisted ops explanation boundary | 비대상 | 필요 | 안정화 | `verify-v350-vlm-assisted-ops-explanation`이 default-off VLM 보조 설명을 산출하면서 defaultEnabled=false, vlmProviderCallPerformed=false, vlmRuntimeCallPerformed=false, rawVlmPromptIncluded=false, rawProviderResponseIncluded=false, credentialMaterialIncluded=false, commandPlanExecuted=false, operatorReviewWritePerformed=false, source/view/EventRecord/Ops audit/client/media mutation 미수행을 확인 |
| SAFE-147 | V350 Step 13 stabilization/release readiness boundary | 비대상 | 필요 | 안정화 | `verify-v350-stabilization-release-readiness`가 v3.5 local readiness command, roadmap/stream verification/release policy/evidence index/release records/server dispatch/script inventory 연결을 확인하되 release action, published metadata, UI 풀테스트, 30분/120분, field smoke 실행 PASS로 대체하지 않음 |
| SAFE-148 | V360 Step 1 v3.6 baseline boundary | 비대상 | 필요 | 안정화 | `verify-v360-entry-baseline`가 source `3.6.0`, latest published `v3.6.0`, current roadmap `v3.6.0 Operations Simulation and Safe Apply Readiness`, release records, inventory, server dispatch 연결을 확인하되 v3.6 기능 구현, UI 풀테스트 직접 조작, 30분/120분, PR/main/tag/GitHub Release PASS로 대체하지 않음 |
| SAFE-149 | V360 Step 2 simulation input no-write boundary | 비대상 | 필요 | 안정화 | `verify-v360-simulation-input-contract`가 EventRecord, SourceRegistry, PublishedView, command plan, staged plan을 read-only input pack으로 묶되 source/view/rule/EventRecord/Ops audit/client/media mutation, credential/raw locator 노출, schema/media path 변경을 수행하지 않음을 확인 |
| SAFE-150 | V360 Step 3 simulation run no-execution boundary | 비대상 | 필요 | 안정화 | `verify-v360-operations-simulation-run-contract`가 simulation run schema/result envelope를 not-run 상태로 정의하고 simulationRunPersisted=false, simulationRunExecuted=false, resultEnvelopePersisted=false, automaticApplyPerformed=false를 확인 |
| SAFE-151 | V360 Step 4 dry-run no-execution boundary | 비대상 | 필요 | 안정화 | `verify-v360-command-plan-dry-run-simulator`가 source recheck, recovery, maintenance, client notice, rule follow-up 후보를 dry-runOnly로 계산하고 실행, write, client notice 발송, media path 변경을 수행하지 않음을 확인 |
| SAFE-152 | V360 Step 5 impact diff no-apply boundary | 비대상 | 필요 | 안정화 | `verify-v360-source-rule-impact-diff`가 source health/event risk/client impact diff를 diffOnly로 표시하고 sourceHealthChangedPersisted=false, sourceChangeApplied=false, ruleFollowUpApplied=false, automaticApplyPerformed=false를 확인 |
| SAFE-153 | V360 Step 6 safe apply readiness no-auto-apply boundary | 비대상 | 필요 | 안정화 | `verify-v360-safe-apply-readiness-gate`가 ready/blocked/approval-needed/field-needed/not-run 상태와 blocker를 산출하되 automaticApplyPerformed=false, safeApplyPerformed=false, clientNoticeSent=false, fieldSmokeExecuted=false를 확인 |
| SAFE-154 | V360 Step 7 simulation workspace UI boundary | 비대상 | 필요 | 안정화 | `verify-v360-ops-simulation-workspace-ui`가 `/ops` simulation workspace shell/renderer/CSS/client 비노출을 확인하되 source URL/raw locator/raw JSON/debug/credential material, command execution, source/view/rule/EventRecord/Ops audit/client/media mutation을 UI 경로에서 추가하지 않음을 확인 |
| SAFE-155 | V360 Step 8 simulation ledger boundary | 비대상 | 필요 | 안정화 | `verify-v360-simulation-run-ledger-comparison`이 simulation run ledger를 append-only/read-only projection으로 산출하고 simulationRunPersisted=false, simulationRunExecuted=false, operatorNoteWritePerformed=false, resultDiffPersisted=false, clientNoticeSent=false를 확인 |
| SAFE-156 | V360 Step 9 client notice preview boundary | 비대상 | 필요 | 안정화 | `verify-v360-client-notice-preview`가 notice preview를 viewer-safe/previewOnly로 산출하고 clientNoticeSent=false, clientNoticePersisted=false, viewerClientPayloadChanged=false, sourceUrlIncluded=false, rawLocatorIncluded=false, credentialMaterialIncluded=false를 확인 |
| SAFE-157 | V360 Step 10 Rule/VA what-if boundary | 비대상 | 필요 | 안정화 | `verify-v360-rule-va-what-if-replay-pack`이 whatIfOnly=true로 산출하고 ruleRegistryWritePerformed=false, ruleThresholdApplied=false, presetApplied=false, scenarioApplied=false, eventRecordWritePerformed=false, rtspOrWebrtcMediaPathChanged=false를 확인 |
| SAFE-158 | V360 Step 11 simulation export boundary | 비대상 | 필요 | 안정화 | `verify-v360-simulation-export-bundle`이 releaseSafe=true, redacted=true로 산출하고 artifactExportExecuted=false, bundlePersisted=false, fileWritePerformed=false, handoffWritePerformed=false, rawLocatorIncluded=false, credentialMaterialIncluded=false, rawProviderResponseIncluded=false를 확인 |
| SAFE-159 | V360 Step 12 field evidence simulation boundary | 비대상 | 필요 | 안정화 | `verify-v360-field-evidence-simulation-adapter`가 conditionalNotRunEvidence=true로 산출하고 fieldSmokeExecuted=false, endpointProbePerformed=false, credentialProbePerformed=false, onvifDeviceContacted=false, externalWhepTurnContacted=false, cloudProviderContacted=false, vlmProviderCalled=false, raw endpoint/credential/provider material 미포함을 확인 |
| SAFE-160 | V360 Step 13 VLM-assisted simulation explanation boundary | 비대상 | 필요 | 안정화 | `verify-v360-vlm-assisted-simulation-explanation`이 default-off VLM 보조 설명을 산출하면서 defaultEnabled=false, vlmProviderCallPerformed=false, vlmRuntimeCallPerformed=false, rawVlmPromptIncluded=false, rawProviderResponseIncluded=false, credentialMaterialIncluded=false, simulationRunExecuted=false, operatorReviewWritePerformed=false, source/view/EventRecord/Ops audit/client/media mutation 미수행을 확인 |
| SAFE-161 | V360 Step 14 stabilization/release readiness boundary | 비대상 | 필요 | 안정화 | `verify-v360-stabilization-release-readiness`가 v3.6 local readiness command, roadmap/stream verification/release policy/evidence index/release records/server dispatch/script inventory 연결을 확인하되 release action, published metadata, UI 풀테스트, 30분/120분, field smoke 실행 PASS로 대체하지 않음 |
| SAFE-162 | V370 Step 1 v3.7 baseline boundary | 비대상 | 필요 | 안정화 | `verify-v370-entry-baseline`가 source `3.7.0`, latest published `v3.7.0`, current roadmap `v3.7.0 Site-Aware Operations and Safe Runbook Control Plane`, release records, inventory, server dispatch 연결을 확인하되 v3.7 기능 구현, UI 풀테스트 직접 조작, 30분/120분, PR/main/tag/GitHub Release PASS로 대체하지 않음 |
| SAFE-163 | V370 Step 2 site/source group no-write boundary | 비대상 | 필요 | 안정화 | `verify-v370-site-source-group-contract`가 site/source group 계약을 read model로만 정의하고 SourceRegistry/PublishedView write, viewer/client exposure, EventRecord/Event POST/WebRTC/SSE/WS/media schema 변경, rule/profile payload 변경을 수행하지 않음을 확인 |
| SAFE-164 | V370 Step 3 source projection redaction boundary | 비대상 | 필요 | 안정화 | `verify-v370-site-aware-source-registry-projection`이 source/view projection에 raw locator, credential material, client viewer material을 포함하지 않고 source registry/PublishedView write와 media/schema 변경을 수행하지 않음을 확인 |
| SAFE-165 | V370 Step 4 site health rollup no-recovery boundary | 비대상 | 필요 | 안정화 | `verify-v370-site-health-rollup`이 health rollup을 read-only로 계산하고 source health persistence, automatic recovery, field smoke, source/view write, client exposure, media/schema 변경을 수행하지 않음을 확인 |
| SAFE-166 | V370 Step 5 site impact graph redaction boundary | 비대상 | 필요 | 안정화 | `verify-v370-site-impact-graph`가 site impact graph를 read-only/redacted로 계산하고 source/view/EventRecord/Ops audit/client/media mutation, viewer/client exposure, raw locator/credential/debug material 노출, media/schema 변경을 수행하지 않음을 확인 |
| SAFE-167 | V370 Step 6 site simulation input no-run boundary | 비대상 | 필요 | 안정화 | `verify-v370-site-simulation-input-pack`이 site simulation input pack을 read-only로 계산하고 simulation input persist/run/result persist, source/view/rule/EventRecord/Ops audit/client/media mutation, viewer/client exposure, raw locator/credential material 노출을 수행하지 않음을 확인 |
| SAFE-168 | V370 Step 7 cross-site safe apply no-apply boundary | 비대상 | 필요 | 안정화 | `verify-v370-cross-site-safe-apply-readiness`가 cross-site readiness를 read-only로 계산하고 automatic/safe apply, field smoke, client notice send, source/view/rule/EventRecord/Ops audit/client/media mutation, viewer/client exposure, raw locator/credential material 노출을 수행하지 않음을 확인 |
| SAFE-169 | V370 Step 8 runbook template no-write boundary | 비대상 | 필요 | 안정화 | `verify-v370-runbook-template-contract`가 runbook template contract를 read-only로 정의하고 runbook instance persist, approval ticket write, operator note write, source/view/rule/EventRecord/Ops audit/client/media mutation, client notice send, field smoke, viewer/client exposure, raw locator/credential material 노출을 수행하지 않음을 확인 |
| SAFE-170 | V370 Step 9 runbook ledger append-only boundary | 비대상 | 필요 | 안정화 | `verify-v370-runbook-instance-ledger`가 runbook instance ledger를 append-only/read-only projection으로 산출하고 runbook instance persist, operator note write, approval ticket write, result diff persist, source/view/rule/EventRecord/Ops audit/client/media mutation, viewer/client exposure를 수행하지 않음을 확인 |
| SAFE-171 | V370 Step 10 approval ticket workflow no-write boundary | 비대상 | 필요 | 안정화 | `verify-v370-approval-ticket-workflow`가 approval ticket workflow를 read-only로 산출하고 approval ticket write, reviewer assignment write, approval decision persist, runbook instance persist, operator note write, result diff persist, source/view/rule/EventRecord/Ops audit/client/media mutation, viewer/client exposure를 수행하지 않음을 확인 |
| SAFE-172 | V370 Step 11 site operations workspace boundary | 비대상 | 필요 | 안정화 | `verify-v370-site-operations-workspace-ui`가 `/ops` site operations workspace를 read-only로 표시하고 source/view/runbook/approval write, client notice send, source URL/raw locator/raw JSON/debug/credential material, viewer/client exposure, media mutation을 수행하지 않음을 확인 |
| SAFE-173 | V370 Step 12 client notice by site/view group boundary | 비대상 | 필요 | 안정화 | `verify-v370-client-notice-by-site-view-group`가 site/view group viewer-safe notice preview와 delivery queue를 preview-only로 표시하고 client notice send/persist, viewer client payload 변경, source/view/rule/EventRecord/Ops audit/client/media mutation, raw locator/credential/operator material 노출을 수행하지 않음을 확인 |
| SAFE-174 | V370 Step 13 Rule/VA what-if by site boundary | 비대상 | 필요 | 안정화 | `verify-v370-rule-va-what-if-by-site`가 site-scoped what-if를 read-only로 산출하고 rule/profile registry write, rule apply, EventRecord/Ops audit/source/view/client/media mutation, raw locator/credential/debug material 노출을 수행하지 않음을 확인 |
| SAFE-175 | V370 Step 14 Field Evidence Attachment boundary | 비대상 | 필요 | 안정화 | `verify-v370-field-evidence-attachment`가 field evidence attachment를 conditional/not-run read model로만 산출하고 field smoke, endpoint/credential probe, provider/VLM call, source/view/runbook/approval/EventRecord/Ops audit/client/media mutation, raw endpoint/credential/provider material 노출을 수행하지 않음을 확인 |
| SAFE-176 | V370 Step 15 Limited Safe Execution Pilot boundary | 비대상 | 필요 | 안정화 | `verify-v370-limited-safe-execution-pilot`이 source recheck/notice queue pilot을 approval-gated preview로만 산출하고 pilot execution, source recheck, notice queue write/send, source/view/runbook/approval/EventRecord/Ops audit/client/media mutation, raw locator/credential/operator material 노출을 수행하지 않음을 확인 |
| SAFE-177 | V370 Step 16 Outcome Reconciliation boundary | 비대상 | 필요 | 안정화 | `verify-v370-outcome-reconciliation`이 pre-simulation/post-execution source/event/client impact reconciliation을 pending/not-run read model로만 산출하고 pilot execution, source recheck, notice queue write/send, source/view/runbook/approval/EventRecord/Ops audit/client/media mutation, raw locator/credential/operator material 노출을 수행하지 않음을 확인 |
| SAFE-178 | V370 Step 17 Export / Handoff Bundle boundary | 비대상 | 필요 | 안정화 | `verify-v370-export-handoff-bundle`이 redacted release-safe handoff bundle만 산출하고 artifact export/file write/handoff write, pilot/source recheck/notice queue write/send, source/view/runbook/approval/EventRecord/Ops audit/client/media mutation, raw locator/endpoint/credential/provider/diagnostic/client raw material 노출을 수행하지 않음을 확인 |
| SAFE-179 | V370 Step 18 stabilization/release readiness boundary | 비대상 | 필요 | 안정화 | `verify-v370-stabilization-release-readiness`가 v3.7 local readiness command, roadmap/stream verification/release policy/evidence index/release records/server dispatch/script inventory 연결을 확인하되 release action, published metadata, UI 풀테스트, 30분/120분, field smoke 실행 PASS로 대체하지 않음 |
| SAFE-180 | V380 Step 1 v3.8 baseline boundary | 비대상 | 필요 | 안정화 | `verify-v380-entry-baseline`이 source `3.8.0`, latest published `v3.8.0`, current roadmap `v3.8.0 Operator-Gated Action Pilot & Outcome Loop`, release records, inventory, server dispatch 연결을 확인하되 v3.8 기능 구현, UI 풀테스트 직접 조작, 30분/120분, published metadata, PR/main/tag/GitHub Release PASS로 대체하지 않음 |
| SAFE-181 | V380 Step 2 Ops Action Route Boundary no-mutation boundary | 비대상 | 필요 | 안정화 | `verify-v380-ops-action-route-boundary`가 v3.8 action namespace를 `/ops/api/actions`로 분리하고 action execution, action request persist, approval decision persist, readiness check execution, source recheck, notice send/write, rule/source/view/runbook/EventRecord/Ops audit write, viewer/client payload, Event POST/EventRecord/WebRTC/SSE/WS/media schema 변경, raw locator/credential 노출을 수행하지 않음을 확인 |
| SAFE-182 | V380 Step 3 Action Capability Contract no-mutation boundary | 비대상 | 필요 | 안정화 | `verify-v380-action-capability-contract`가 allowed/denied action catalog, required role/scope, idempotency policy, immutable schema boundary를 산출하되 action execution, action request persist, approval decision persist, readiness check execution, source recheck, notice send/write, rule/source/view/runbook/EventRecord/Ops audit write, viewer/client payload, Event POST/EventRecord/WebRTC/SSE/WS/media schema 변경, raw locator/credential 노출을 수행하지 않음을 확인 |
| SAFE-183 | V380 Step 4 Action Request Ledger Contract no-mutation boundary | 비대상 | 필요 | 안정화 | `verify-v380-action-request-ledger-contract`가 action request ledger fields, append-only policy, read-only projection을 산출하되 request write, action execution, action request persist, approval decision persist, readiness check execution, source recheck, notice send/write, rule/source/view/runbook/EventRecord/Ops audit write, viewer/client payload, Event POST/EventRecord/WebRTC/SSE/WS/media schema 변경, raw locator/credential 노출을 수행하지 않음을 확인 |
| SAFE-184 | V380 Step 5 Approval Decision Gate no-mutation boundary | 비대상 | 필요 | 안정화 | `verify-v380-approval-decision-gate`가 approve/hold/reject/field-needed state, reviewer, reason, auditRef, stale decision guard를 산출하되 decision write, action execution, action request persist, approval decision persist, readiness check execution, source recheck, notice send/write, rule/source/view/runbook/EventRecord/Ops audit write, viewer/client payload, Event POST/EventRecord/WebRTC/SSE/WS/media schema 변경, raw locator/credential 노출을 수행하지 않음을 확인 |
| SAFE-185 | V380 Step 6 Action Readiness Preflight no-mutation boundary | 비대상 | 필요 | 안정화 | `verify-v380-action-readiness-preflight`가 capability/approval/field evidence/source health/client impact/duplicate request blocker와 readiness state를 산출하되 readiness execution/result persist, action execution, action request persist, approval decision persist, source recheck, notice send/write, rule/source/view/runbook/EventRecord/Ops audit write, viewer/client payload, Event POST/EventRecord/WebRTC/SSE/WS/media schema 변경, raw locator/credential 노출을 수행하지 않음을 확인 |
| SAFE-186 | V380 Step 7 Source Recheck Action Pilot no-mutation boundary | 비대상 | 필요 | 안정화 | `verify-v380-source-recheck-action-pilot`가 source health recheck request, dry execution result envelope, readiness refs, pilot blocker state를 산출하되 source recheck execution, source health write, action result persist, action request persist, approval/readiness persist, notice send/write, rule/source/view/runbook/EventRecord/Ops audit write, viewer/client payload, Event POST/EventRecord/WebRTC/SSE/WS/media schema 변경, raw locator/credential 노출을 수행하지 않음을 확인 |
| SAFE-187 | V380 Step 8 Client Notice Draft Queue no-send/no-leak boundary | 비대상 | 필요 | 안정화 | `verify-v380-client-notice-draft-queue`가 viewer-safe notice draft, queue preview, delivery blocker, redaction boundary를 산출하되 client notice delivery, notice draft persist, notice queue write, operator-only blocker client exposure, action request persist, approval/readiness persist, source recheck, rule/source/view/runbook/EventRecord/Ops audit write, viewer/client payload, Event POST/EventRecord/WebRTC/SSE/WS/media schema 변경, raw locator/credential 노출을 수행하지 않음을 확인 |
| SAFE-188 | V380 Step 9 Rule Draft Action Package no-apply/no-write boundary | 비대상 | 필요 | 안정화 | `verify-v380-rule-draft-action-package`가 rule threshold/scenario 후보, draft package, review checklist, apply blocker를 산출하되 rule/scenario apply, rule draft persist, rule/profile registry write, action request persist, approval/readiness persist, source recheck, notice send/write, source/view/runbook/EventRecord/Ops audit write, viewer/client payload, Event POST/EventRecord/WebRTC/SSE/WS/media schema 변경, raw locator/credential 노출을 수행하지 않음을 확인 |
| SAFE-189 | V380 Step 10 Ops Action Control Workspace UI no-action/no-leak boundary | 비대상 | 필요 | 안정화 | `verify-v380-ops-action-control-workspace-ui`가 `/ops` action control workspace가 기존 `/ops/api/actions/*` read-only contracts를 읽기만 하고 action execution, action request persist, approval decision persist, readiness result persist, source recheck, client notice send, notice queue write, rule apply/registry write, viewer/client payload, Event POST/EventRecord/WebRTC/SSE/WS/media schema 변경, raw locator/credential 노출을 수행하지 않음을 확인 |
| SAFE-190 | V380 Step 11 Client-safe Action Notice Preview redaction boundary | 비대상 | 필요 | 안정화 | `verify-v380-client-safe-action-notice-preview`가 client action notice preview에 maintenance/degraded/recovering/available status와 timeline만 남기고 internal blocker, approval decision detail, readiness blocker detail, source URL/raw locator/raw JSON/debug/credential/operator material, Ops-only action route/detail, action controls, Event POST/EventRecord/WebRTC/SSE/WS/media schema 변경을 포함하지 않음을 확인 |
| SAFE-191 | V380 Step 12 Outcome Observer boundary | 비대상 | 필요 | 안정화 | `verify-v380-outcome-observer-reconciliation`이 readiness/candidate/observed outcome diff를 산출하되 action execution, source recheck execution, client notice send/queue write, rule apply/registry write, source/view/EventRecord/Ops audit write, action result persist, viewer client payload, Event POST/EventRecord/WebRTC/SSE/WS/media schema 변경을 수행하지 않음을 확인 |
| SAFE-192 | V380 Step 13 Action Receipt Bundle boundary | 비대상 | 필요 | 안정화 | `verify-v380-action-receipt-bundle`이 redacted release-safe receipt bundle과 handoff map을 산출하되 bundle persist, artifact/file write, handoff write, action execution, source recheck execution, client notice send/queue write, rule apply/registry write, source/view/EventRecord/Ops audit write, raw locator/credential/raw diagnostic inclusion, Event POST/EventRecord/WebRTC/SSE/WS/media schema 변경을 수행하지 않음을 확인 |
| SAFE-193 | V380 Step 14 Field Connector Evidence Package boundary | 비대상 | 필요 | 안정화 | `verify-v380-field-connector-evidence-package`가 connector evidence package를 conditional/not-run read model로만 산출하고 field smoke, endpoint/credential probe, provider/cloud call, ONVIF device contact, external WHEP contact, TURN credential use, source/view/EventRecord/Ops audit write, raw endpoint/locator/credential/provider/debug material inclusion, Event POST/EventRecord/WebRTC/SSE/WS/media schema 변경을 수행하지 않음을 확인 |
| SAFE-194 | V380 Step 15 Default-off Action Explanation boundary | 비대상 | 필요 | 안정화 | `verify-v380-default-off-action-explanation`이 default-off explanation hint를 산출하면서 defaultEnabled=false, vlmProviderCallPerformed=false, vlmRuntimeCallPerformed=false, rawVlmPromptIncluded=false, rawProviderResponseIncluded=false, credentialMaterialIncluded=false, actionExecutionPerformed=false, source/view/EventRecord/Ops audit/client/media mutation 미수행을 확인 |
| SAFE-195 | V380 Step 16 stabilization/release readiness boundary | 비대상 | 필요 | 안정화 | `verify-v380-stabilization-release-readiness`가 v3.8 local readiness command, roadmap/stream verification/release policy/evidence index/release records/server dispatch/script inventory 연결을 확인하되 release action, published metadata, UI 풀테스트, 30분/120분, field smoke 실행 PASS로 대체하지 않음 |
| SAFE-196 | V390 Step 0 source baseline no-overclaim boundary | 비대상 | 필요 | 안정화 | `verify-v390-entry-baseline`과 `verify-release-metadata`가 source `3.9.0`, latest published `v3.8.0`, current roadmap `v3.9.0 Feature Completion, Structure Stabilization, and Test Model Preparation`, stream verification, release records/evidence, project inventory, script inventory 연결을 확인하되 feature discovery/dev, UI 풀테스트, 30분/120분, published metadata, release action PASS로 대체하지 않음 |
| SAFE-197 | V390 Step 1 feature completion inventory review boundary | 비대상 | 필요 | 안정화 | `verify-v390-feature-completion-inventory`가 feature completion inventory scaffold, discovery source groups, disposition vocabulary, user review gate, project inventory/release records/evidence 연결을 확인하되 실제 discovery 완료, 기능 구현, 구조 안정화 구현, 테스트 방식 전환 구현, UI 풀테스트, 30분/120분, published metadata, release action PASS로 대체하지 않음 |
| SAFE-198 | V390 Step 3 user review approval boundary | 비대상 | 필요 | 안정화 | `verify-v390-user-review-gate`가 initial review-ready/blocked snapshot과 current approved/closed reconciliation을 구분하며, current closure를 UI 풀테스트, 30분/120분, published metadata, release action PASS로 대체하지 않음 |
| SAFE-199 | V390 Step 7 UI wrapper result schema truthfulness boundary | 비대상 | 필요 | 안정화 | `verify-v390-evidence-test-gate-prep`가 `verify-ui-fulltest-one-shot` summary의 `wrapperResult`, `resultScope`, `uiFulltestEvidenceStatus`, `manualResultStatus`, `longrunStatus`, `evidenceBoundary`를 확인하되 wrapper PASS를 UI 풀테스트 직접 조작, 30분/120분, manual result, published metadata PASS로 대체하지 않음 |
| SAFE-200 | V390 Step 8 feature coverage wording truthfulness boundary | 비대상 | 필요 | 안정화 | `verify-v390-evidence-test-gate-prep`와 `verify-feature-inventory-coverage`가 per-feature report를 `coverageStatus: covered/missing`, `executionEvidenceStatus: not-execution-evidence`로 기록하는지 확인하되 coverage mapping을 실행 PASS로 대체하지 않음 |
| SAFE-201 | V390 R1/V390-ADD1-10 longrun runner first-fail boundary | 비대상 | 필요 | 안정화 | `verify-v390-server-longrun-runner-contract`와 `verify-v390-server-longrun` fixture가 one command, fixed phase/case order, delegated ID/order/uniqueness/count, 첫 실패 즉시 중단, later phase/case `not-run`, context, 분리 stderr tail, 재현 명령, cleanup/artifact policy를 확인하되 실제 30분/120분 longrun 실행 evidence가 아닙니다 |
| SAFE-202 | V390 UI automation / Policy v4 false-PASS boundary | 비대상 | 필요 | 안정화 | `verify-v390-evidence-test-gate-prep`, `verify-ui-fulltest-evidence-policy-v4`, `verify-ui-fulltest-evidence-policy-v4-contract`가 fixture/wrapper/static/API/screenshot-only/legacy replay, 부분 coverage, pre-existing marker, role·viewport·theme drift, artifact path/hash/type/redaction/visual/replay/cleanup 결함을 `automation-equivalent-pass`로 승격하지 않고 policy verifier PASS와 `uiFulltestPass`를 분리함 |
| SAFE-203 | V390 Step 11 ONVIF credential provider redaction boundary | 비대상 | 필요 | 안정화 | `verify-v390-onvif-credential-provider-status`가 credential lookup, credential reference value inclusion, secret material storage/exposure, product persistent secret store, external secret manager, SourceRegistry/PublishedView secret fields, client/viewer exposure, Auth/Role/Scope/schema/media 변경이 모두 false임을 확인 |
| SAFE-204 | V390 ONVIF partial-save rollback boundary | 비대상 | 필요 | 안정화 | `verify-v390-onvif-source-view-atomicity`가 invalid pair zero-write, first/second-write failure, rollback fault, prepared/source-replaced/view-replaced/committed process crash를 주입하고 bytes·existence·mode·API readback·restart·retry를 대조하며 marker/snapshot/temp artifact 0을 확인함 |
| SAFE-205 | V390 Step 13 VLM rule suggestion no-auto-apply boundary | 비대상 | 필요 | 안정화 | `verify-v390-vlm-rule-suggestion-draft-bridge`가 rule/profile registry write, EventRecord write, auto-apply, provider/runtime call, client/viewer exposure, Event POST/WebRTC/SSE/WS schema, RTSP/WebRTC media path 변경이 모두 false이고 기존 `/ops/rules` manual save 전까지 draft-only임을 확인 |
| SAFE-206 | V390 VLM client-forged promotion rejection boundary | 비대상 | 필요 | 안정화 | `verify-v390-vlm-promotion-trust-boundary`가 client-declared passed, unknown/stale candidate, digest/option/model/prompt mismatch, non-passed active 요청을 거부하고 rejected update 원본을 보존하며 restart 시 canonical provenance 불일치 profile을 quarantine하고 runtime/provider/sidecar/client/media/schema 불변을 확인 |
| SAFE-207 | V390 Step 15 no-production-restore boundary | 비대상 | 필요 | 안정화 | `verify-v390-backup-recovery-handoff-validation`이 staging restore validation handoff route가 read-only이고 resultArtifactPersistedByRoute=false, sourceRegistryWritePerformed=false, publishedViewWritePerformed=false, productionRestorePerformed=false, automaticRecoveryPerformed=false, viewerClientExposureAdded=false, media/schema 변경 false임을 확인 |
| SAFE-208 | V390 Step 16 no-action-execution boundary | 비대상 | 필요 | 안정화 | `verify-v390-action-execution-deferral-decision`이 action execution deferral route가 read-only이고 approvalGatedExecutionEnabled=false, actionExecutionPerformed=false, sourceRecheckExecuted=false, clientNoticeSent=false, ruleApplyPerformed=false, ruleRegistryWritePerformed=false, externalDeliveryPerformed=false, media/schema 변경 false임을 확인 |
| SAFE-209 | V390 Step 17 no-field-execution boundary | 비대상 | 필요 | 안정화 | `verify-v390-conditional-field-ai-decisions`가 field evidence bridge route가 read-only이고 fieldSmokeExecuted=false, endpointProbePerformed=false, credentialProbePerformed=false, provider calls false, raw endpoint/credential/provider material false, fieldPassClaimed=false, media/schema 변경 false임을 확인 |
| SAFE-210 | V390 Re-ID false-ready/privacy boundary | 비대상 | 필요 | 안정화 | `verify-v390-reid-readiness-consistency`가 incomplete gate에서 preflight=false/no-op을 강제하고 route session-load/execution claim을 false로 유지하며 raw model path/SHA/provenance, embedding/crop/identity material, client/viewer/media/schema 변경을 노출하지 않음을 확인 |
| SAFE-211 | V390 Step 19 structure handoff no-behavior-change boundary | 비대상 | 필요 | 안정화 | `verify-v390-structure-stabilization-handoff`가 `V390-STRUCT-001`~`V390-STRUCT-005`를 behavior-preserving plan으로 이관하고 Event POST/WebRTC DataChannel/SSE/WS metadata/RTSP/WebRTC media path/Auth/Role/Scope/SourceRegistry/PublishedView/Rule/Profile payload 변경을 수행하지 않았음을 확인 |
| SAFE-212 | V390 actual acceptance no-overclaim boundary | 비대상 | 필요 | 안정화 | `verify-v390-test-acceptance-bundle`이 clean worktree에서 throwaway server/ports/account/role-state/browser dependency와 PID/listener/artifact cleanup을 자체 생성·검증하고 build→feature gate→30분→exact 424→Policy v4→조건부 120분→final integrity를 stop-on-first-fail로 연결합니다. Legacy 8-case, 외부 runtime/summary, fixture/dry-run을 actual/UI fulltest/published/release PASS로 승격하지 않습니다 |
| SAFE-213 | V390 incident-to-rule provenance contract guard | 비대상 | 필요 | 안정화 | optional provenance가 없던 기존 rule payload는 유지하고, provenance가 있으면 required source fields, manual-review/no-auto-apply, generated rule ID/save route, raw credential/source URL/frame/prompt/response 비포함을 검증합니다. EventRecord/Event POST/WebRTC/SSE/WS/media schema/path는 변경하지 않습니다 |
| SAFE-214 | V390 deferred owner decision false-PASS boundary | 비대상 | 필요 | 안정화 | `verify-v390-deferred-product-owner-signoff`와 `verify-v390-truthfulness-status-vocabulary`가 CODEOWNERS effective 실제 owner `@dhseo90`, `repository-code-owner`, exact 5개 중 production restore 포함/field smoke 제외, current source SHA·route·schema·UI·false boundary, mixed capability truth와 `post-v3.9-unassigned` dependency를 검증합니다. Re-ID를 전체 미구현으로 낮추거나 역할명-only, 임의 owner, 임의 future version, field/UI/longrun/release PASS로 승격하지 않습니다 |
| SAFE-215 | V390 structure stabilization contract-preservation boundary | 비대상 | 필요 | 안정화 | `verify-v390-structure-stabilization-readiness`가 actual 148-file/declared 74·default active 73 cpp/9-owner/single-target graph, 25 target-violation direction, 8-owner SCC와 6 slice binding을 고정하고 REVIEW4-51 approval과 implementation `not-executed`를 분리합니다. 새 edge/SCC/target drift를 거부하며 9개 contract는 `changeAllowed=false`입니다 |
| SAFE-216 | V390 external field smoke no-device false-PASS boundary | 비대상 | 필요 | 안정화 | `verify-v390-external-field-smoke-no-device-closure`와 `verify-v390-truthfulness-status-vocabulary`가 external network, endpoint probe, credential access, device contact, provider call, artifact 생성이 모두 false이고 TURN/WHEP·ONVIF·external VLM target status가 `conditional-not-run`, field/release PASS claim이 false임을 확인합니다. 외부 실행 evidence가 아닙니다 |
| SAFE-217 | V390 Analysis Registry failed-write no-publish boundary | 비대상 | 필요 | 안정화 | 직접 C++ 제품 owner `WriteAnalysisRegistryFileAtomically`과 `PersistAndPublishLocked`가 profile/rule/VA rule/VLM profile create·update·delete의 candidate를 durable 저장 성공 전 publish하지 않습니다. `verify-v390-analysis-registry-durable-write`는 parent/open/short-write/flush/rename 실패의 HTTP 500, memory GET·registry file bytes·restart GET 불변, `.tmp.*` 0을 확인하며 fault stage는 safe token만 응답하고 storage path/body를 노출하지 않습니다 |

## J. Ops Evidence And Release Readiness

| ID | 기능 | UI 필요 | 테스트 필요 | 테스트 영역 | PASS 기준 |
| --- | --- | --- | --- | --- | --- |
| OPS-035 | v2.3.0 S06 Ops backup/recovery evidence lifecycle | 비대상 | 필요 | 안정화 | 비대상: UI 없어야 정상. `verify-v230-ops-backup-recovery-lifecycle`이 staging drill manifest/checksum/restore-validation-plan, redacted evidence bundle, retention cleanup dry-run/apply/audit를 확인하고 30분/120분/UI 실행 PASS로 대체하지 않음 |
| OPS-036 | V250-S09 incident memory route owner 분리 게이트 | 비대상 | 필요 | 안정화 | `verify-v250-owner-release-readiness`가 event memory/search route owner catalog, release-safe evidence bundle route matcher, release readiness 문서 연결을 확인하되 PR/tag/push/GitHub Release 실행 PASS로 대체하지 않음 |
| OPS-037 | V260-S06 릴리즈 준비 게이트 | 비대상 | 필요 | 안정화 | `verify-v260-owner-release-readiness`가 v2.6.0 feature inventory, UI criteria, release policy/evidence, close-out dry-run companion command를 연결하되 release publish, PR/main/tag/push, UI/longrun 실행 PASS로 대체하지 않음 |
| OPS-038 | V270-S06 릴리즈 준비 게이트 | 비대상 | 필요 | 안정화 | `verify-v270-owner-release-readiness`가 v2.7.0 S01~S05 feature inventory, manual UI criteria, release policy/evidence, close-out dry-run companion command를 연결하되 release publish, PR/main/tag/push, UI/longrun 실행 PASS로 대체하지 않음 |
| OPS-039 | V280-S00/S01 source-of-truth와 2.x runway 게이트 | 비대상 | 필요 | 안정화 | source `2.8.0`, latest published `v2.7.0`, next source tag `v2.8.0`, 2.x runway/3.0 major boundary 문서가 서로 일치하는지 확인하되 release publish, PR/main/tag/push, UI/longrun 실행 PASS로 대체하지 않음 |
| OPS-040 | V280-S07 릴리즈 준비 게이트 | 비대상 | 필요 | 안정화 | `verify-v280-owner-release-readiness`가 v2.8.0 S02~S06 feature inventory, manual UI criteria, release policy/evidence, close-out dry-run companion command를 연결하되 release publish, PR/main/tag/push, UI/longrun 실행 PASS로 대체하지 않음 |
| OPS-041 | V290-S00 source-of-truth와 latest published 분리 게이트 | 비대상 | 필요 | 안정화 | `verify-release-metadata`, `verify-docs-links`, `verify-docs-ui-assets`가 source `2.9.0`, latest published `v2.8.0`, current roadmap `v2.9.0 Final 2.x Closure & Compatibility Baseline`을 확인하되 published metadata, PR/main/tag/push, UI/longrun 실행 PASS로 대체하지 않음 |
| OPS-042 | V290-S01 2.x final contract freeze 게이트 | 비대상 | 필요 | 안정화 | `verify-v290-final-contract-freeze`가 contract freeze 문서, server command, stream verification, feature inventory, release test records, integrator freeze-baseline 연결을 확인하되 PR/main/tag/push/GitHub Release, UI/longrun 실행 PASS로 대체하지 않음 |
| OPS-043 | V290-S02 v2.8 기능군 회귀 묶음 게이트 | 비대상 | 필요 | 안정화 | `verify-v290-v28-regression-bundle`이 `verify-v280-incident-action-readiness-queue`, `verify-v280-approval-gated-rule-draft`, `verify-v280-evidence-intake-field-readiness`, `verify-v280-runtime-evidence-window`, `verify-v280-client-safe-followup-digest`를 현재 source tree에서 재실행하되 release publish, PR/main/tag/push, UI/longrun 실행 PASS로 대체하지 않음 |
| OPS-044 | V290-S03 2.x compatibility baseline 게이트 | 비대상 | 필요 | 안정화 | `verify-v290-2x-compatibility-baseline`이 v2.5/v2.6/v2.7 핵심 feature verifier와 `verify-v290-final-contract-freeze`, `verify-v290-v28-regression-bundle`을 현재 source tree에서 재실행하되 owner release readiness, PR/main/tag/push/GitHub Release, UI/longrun 실행 PASS로 대체하지 않음 |
| OPS-045 | V290-S04 release test records enforcement 게이트 | 비대상 | 필요 | 안정화 | `verify-v290-release-test-records-enforcement`가 `docs/release-test-records.md`의 테스트 항목/결과/deprecated/미실행/cleanup/token 기록 구조를 확인하되 실제 안정화/UI/30분/120분/published metadata 실행 완료로 대체하지 않음 |
| OPS-046 | V290-S05 UI fulltest criteria freeze 게이트 | 비대상 | 필요 | 안정화 | `verify-v290-ui-fulltest-criteria-freeze`와 `verify-manual-ui-evidence`가 v2.9 manual UI fulltest/checklist/result template 기준을 확인하되 UI 풀테스트 실행, 30분/120분, published metadata, tag/push/GitHub Release 완료로 대체하지 않음 |
| OPS-047 | V290-S06 release evidence hygiene 게이트 | 비대상 | 필요 | 안정화 | `verify-v290-release-evidence-hygiene`, `verify-release-evidence-index`, `verify-script-inventory`가 release evidence index/records/inventory/manual UI evidence 연결과 PASS/FAIL vs 미실행/제외 경계를 확인하되 release publish, PR/main/tag/push, UI/longrun 실행 PASS로 대체하지 않음 |
| OPS-048 | V290-S07 public docs/assets refresh 게이트 | 비대상 | 필요 | 안정화 | `verify-v290-public-docs-assets-refresh`, `verify-docs-ui-assets`, `verify-docs-links`가 공개 첫 화면, docs index, UI guide, docs asset policy, release/version policy를 확인하되 image recapture, release publish, PR/main/tag/push, UI/longrun 실행 PASS로 대체하지 않음 |
| OPS-049 | V290-S08 final stabilization run 게이트 | 비대상 | 필요 | 안정화 | `verify-v290-final-stabilization-run`가 release 순서의 build/auth/Ops-Client UI/rule/event/metadata/media-schema/docs-inventory 결과 기록을 확인하되 release publish, PR/main/tag/push, UI 풀테스트, 30분/120분, field smoke 실행 PASS로 대체하지 않음 |
| OPS-050 | V290-S09 owner release readiness 게이트 | 비대상 | 필요 | 안정화 | `verify-v290-owner-release-readiness`가 v2.9.0 S00~S09 local readiness, release close-out dry-run, policy/evidence/records/manual UI criteria 연결을 확인하되 release publish, PR/main/tag/push, UI 풀테스트, 30분/120분, field smoke 실행 PASS로 대체하지 않음 |
| OPS-051 | V300-S00 v3.0 baseline 게이트 | 비대상 | 필요 | 안정화 | `verify-v300-entry-baseline`가 VERSION/CMake/README/docs/backlog/source roadmap을 source `3.0.0`, latest published `v3.0.0`, current roadmap `v3.0.0 Event Evidence Search MVP` 기준으로 정렬했는지 확인하되 v3.0 기능 구현, release publish, PR/main/tag/push, UI 풀테스트, 30분/120분, field smoke 실행 PASS로 대체하지 않음 |
| OPS-052 | V300-S01 Event Evidence Contract 게이트 | 비대상 | 필요 | 안정화 | `verify-v300-event-evidence-contract`가 docs/event-evidence-contract.md, sample manifest fixture, stream verification, roadmap, release records, feature inventory, server dispatch 연결을 확인하되 runtime frame capture, encoded clip/playback, VMS archive API, Search DSL, `/ops/events` UI, release publish, UI/longrun 실행 PASS로 대체하지 않음 |
| OPS-053 | V300-S03 feature schema privacy 게이트 | 비대상 | 필요 | 안정화 | `verify-v300-feature-schema-privacy`가 docs/event-feature-schema-privacy.md, FeatureSet fixture, stream verification, roadmap, release records, feature inventory, server dispatch 연결을 확인하되 VLM queue/runtime/provider success, Search DSL, `/ops/events` UI, release publish, UI/longrun 실행 PASS로 대체하지 않음 |
| OPS-054 | V300-S04 VLM feature queue 게이트 | 비대상 | 필요 | 안정화 | `verify-v300-vlm-feature-queue`가 docs/v300-vlm-feature-queue.md, fixture, analysis smoke, stream verification, roadmap, release records, feature inventory, server dispatch 연결을 확인하되 provider success, Search DSL, `/ops/events` UI, release publish, UI/longrun 실행 PASS로 대체하지 않음 |
| OPS-055 | V300-S05 feature-only retention 게이트 | 비대상 | 필요 | 안정화 | `verify-v300-feature-only-retention`가 docs/v300-feature-only-retention.md, fixture, analysis smoke, stream verification, roadmap, release records, feature inventory, server dispatch 연결을 확인하되 Search DSL, Retention/Pin/Cleanup, `/ops/events` UI, release publish, UI/longrun 실행 PASS로 대체하지 않음 |
| OPS-056 | V300-S06 search DSL/query convert 게이트 | 비대상 | 필요 | 안정화 | `verify-v300-search-dsl-query-convert`가 docs/v300-search-dsl-query-convert.md, fixture, analysis smoke, stream verification, roadmap, release records, feature inventory, server dispatch 연결을 확인하되 Feature/Search Index, `/ops/events` UI, vector search, release publish, UI/longrun 실행 PASS로 대체하지 않음 |
| OPS-057 | V300-S07 feature/search index 게이트 | 비대상 | 필요 | 안정화 | `verify-v300-feature-search-index`가 docs/v300-feature-search-index.md, fixture, analysis smoke, stream verification, roadmap, release records, feature inventory, server dispatch 연결을 확인하되 `/ops/events` UI, vector search, semantic provider rerank, retention cleanup execution, release publish, UI/longrun 실행 PASS로 대체하지 않음 |
| OPS-058 | V300-S08 Ops Events UI 게이트 | 비대상 | 필요 | 안정화 | `verify-v300-ops-events-ui`가 `/ops/events` UI shell, eventEvidenceSearch view model, script rendering, CSS, ops smoke, backlog/stream verification/release records/server dispatch 연결을 확인하되 UI 풀테스트 직접 조작, 30분/120분, cleanup execution, release publish 실행 PASS로 대체하지 않음 |
| OPS-059 | V300-S09 retention/pin/cleanup 게이트 | 비대상 | 필요 | 안정화 | `verify-v300-retention-pin-cleanup`가 docs/v300-retention-pin-cleanup.md, fixture, analysis smoke, stream verification, roadmap, release records, feature inventory, server dispatch 연결을 확인하되 destructive 운영 cleanup 실행, UI 풀테스트 직접 조작, 30분/120분, release publish 실행 PASS로 대체하지 않음 |
| OPS-060 | V300-S10 stabilization/release readiness 게이트 | 비대상 | 필요 | 안정화 | `verify-v300-stabilization-release-readiness`가 v3.0 S00~S09 local gates, release policy/evidence index/test records, close-out dry-run command, server dispatch 연결을 확인하되 UI 풀테스트 직접 조작, 30분/120분, published metadata, PR/main/tag/GitHub Release 실행 PASS로 대체하지 않음 |
| OPS-061 | V310-S00 v3.1 baseline 게이트 | 비대상 | 필요 | 안정화 | `verify-v310-entry-baseline`가 VERSION/CMake/README/docs/backlog/source roadmap을 source `3.1.0`, latest published `v3.1.0`, current roadmap `v3.1.0 Encoded Event Clip and Safe Sharing Expansion` 기준으로 정렬했는지 확인하되 v3.1 기능 구현, release publish, PR/main/tag/push, UI 풀테스트, 30분/120분, field smoke 실행 PASS로 대체하지 않음 |
| OPS-062 | V310-S01 Encoded Event Clip Contract 게이트 | 비대상 | 필요 | 안정화 | `verify-v310-event-clip-contract`가 docs/v310-encoded-event-clip-contract.md, sample encoded clip manifest fixture, stream verification, roadmap, release records, feature inventory, server dispatch 연결을 확인하되 runtime encoder generation, replay UI, VMS archive API, cleanup execution, release publish, UI/longrun 실행 PASS로 대체하지 않음 |
| OPS-063 | V310-S03 Replay Timeline UI 게이트 | 비대상 | 필요 | 안정화 | `verify-v310-replay-timeline-ui`가 `/ops/events` UI shell, replayTimeline view model, script rendering, CSS, ops smoke, backlog/stream verification/release records/server dispatch 연결을 확인하되 UI 풀테스트 직접 조작, 30분/120분, client digest, scoped API, cleanup execution, release publish 실행 PASS로 대체하지 않음 |
| OPS-064 | V310-S05 Scoped Integrator Search API 게이트 | 비대상 | 필요 | 안정화 | `verify-v310-scoped-integrator-search-api`가 `/client/api/views/{id}/events/search` route, integrator role guard, `event:read:{viewId}` scope gate, redacted digest payload, backlog/stream verification/release records/server dispatch 연결을 확인하되 UI 풀테스트 직접 조작, 30분/120분, cleanup execution, vector search, release publish 실행 PASS로 대체하지 않음 |
| OPS-065 | V310-S06 Operator Feature Correction 게이트 | 비대상 | 필요 | 안정화 | `verify-v310-operator-feature-correction`가 `/ops/events` correction UI shell, review state persistence, alias/reanalysis request fields, product script/CSS, ops smoke, backlog/stream verification/release records/server dispatch 연결을 확인하되 UI 풀테스트 직접 조작, 30분/120분, cleanup execution, vector search, release publish 실행 PASS로 대체하지 않음 |
| OPS-066 | V310-S08 Retention/Export Hardening 게이트 | 비대상 | 필요 | 안정화 | `verify-v310-retention-export-hardening`가 encoded clip lifecycle cleanup, release-safe export bundle encoded media exclusion, `export-bundle` audit coverage, backlog/stream verification/release records/server dispatch 연결을 확인하되 UI 풀테스트 직접 조작, 30분/120분, vector search, destructive operational cleanup, release publish 실행 PASS로 대체하지 않음 |
| OPS-067 | V310-S07 Optional Vector Search 게이트 | 비대상 | 필요 | 안정화 | `verify-v310-optional-vector-search`가 optional vector fixture, EventFeatureSearchIndex optional vector API/report, analysis-state smoke, backlog/stream verification/release records/server dispatch 연결을 확인하되 provider embedding calls, UI 풀테스트 직접 조작, 30분/120분, client/viewer 노출, release publish 실행 PASS로 대체하지 않음 |
| OPS-068 | V310-S09 stabilization/release readiness 게이트 | 비대상 | 필요 | 안정화 | `verify-v310-stabilization-release-readiness`가 v3.1 S00~S08 local gates, release policy/evidence index/test records, close-out dry-run command, server dispatch 연결을 확인하되 UI 풀테스트 직접 조작, 30분/120분, published metadata, PR/main/tag/GitHub Release 실행 PASS로 대체하지 않음 |
| OPS-069 | V320 Step 1 v3.2 baseline 게이트 | 비대상 | 필요 | 안정화 | `verify-v320-entry-baseline`가 VERSION/CMake/README/docs/backlog/source roadmap을 source `3.2.0`, latest published `v3.2.0`, current roadmap `v3.2.0 Operations Resolution Workspace` 기준으로 정렬했는지 확인하되 v3.2 기능 구현, release publish, PR/main/tag/push, UI 풀테스트, 30분/120분, field smoke 실행 PASS로 대체하지 않음 |
| OPS-070 | V320 Step 2 Resolution State Contract 게이트 | 비대상 | 필요 | 안정화 | `verify-v320-resolution-state-contract`가 `/ops/api/events/reviews`의 `media-server.ops.resolution-state.v1`, status/reason/close-reopen lifecycle catalog, review JSONL persistence, resolution audit, backlog/stream verification/release records/server dispatch 연결을 확인하되 Unified Ops Events Workspace, UI 풀테스트 직접 조작, 30분/120분, operator assignment flow, client digest, search/metrics, published metadata PASS로 대체하지 않음 |
| OPS-071 | V320 Step 3 Unified Ops Events Workspace 게이트 | 비대상 | 필요 | 안정화 | `verify-v320-unified-ops-events-workspace`가 `/ops/events` UI shell, unifiedResolutionWorkspace view model, resolution queue/detail/timeline script rendering, CSS, ops smoke, backlog/stream verification/release records/server dispatch 연결을 확인하되 Evidence Quality Layer, Source Reliability Context, AI Review Quality Context, Operator Resolution Flow, Client-safe Resolution Digest, Resolution Search & Metrics, UI 풀테스트 직접 조작, 30분/120분, published metadata PASS로 대체하지 않음 |
| OPS-072 | V320 Step 4 Evidence Quality Layer 게이트 | 비대상 | 필요 | 안정화 | `verify-v320-evidence-quality-layer`가 `/ops/events` evidence quality UI, `unifiedResolutionWorkspace.evidenceQuality` view model, completeness/confidence/replay coverage hint, CSS, ops smoke, backlog/stream verification/release records/server dispatch 연결을 확인하되 Source Reliability Context, AI Review Quality Context, Operator Resolution Flow, Client-safe Resolution Digest, Resolution Search & Metrics, UI 풀테스트 직접 조작, 30분/120분, published metadata PASS로 대체하지 않음 |
| OPS-073 | V320 Step 5 Source Reliability Context 게이트 | 비대상 | 필요 | 안정화 | `verify-v320-source-reliability-context`가 `/ops/events` source reliability UI, `unifiedResolutionWorkspace.sourceReliability` view model, source health/recent failure/operator recheck hint, CSS, ops smoke, backlog/stream verification/release records/server dispatch 연결을 확인하고, `verify-v320-source-reliability-runtime-sample`이 실행 중인 서버에서 fixture EventRecord item의 개별 `sourceReliability` 샘플과 cleanup을 확인하되 AI Review Quality Context, Operator Resolution Flow, Client-safe Resolution Digest, Resolution Search & Metrics, UI 풀테스트 직접 조작, 30분/120분, published metadata PASS로 대체하지 않음 |
| OPS-074 | V320 Step 6 AI Review Quality Context 게이트 | 비대상 | 필요 | 안정화 | `verify-v320-ai-review-quality-context`가 `/ops/events` AI review quality UI, `unifiedResolutionWorkspace.aiReviewQuality` view model, correction/review signal, uncertainty reason, quality badge, CSS, ops smoke, backlog/stream verification/release records/server dispatch 연결을 확인하되 Operator Resolution Flow, Action Readiness Checklist, Client-safe Resolution Digest, Resolution Search & Metrics, UI 풀테스트 직접 조작, 30분/120분, published metadata PASS로 대체하지 않음 |
| OPS-075 | V320 Step 7 Operator Resolution Flow 게이트 | 비대상 | 필요 | 안정화 | `verify-v320-operator-resolution-flow`가 `/ops/events` operator resolution UI, `unifiedResolutionWorkspace.operatorResolutionFlow` view model, nested write payload, `operator-resolution-flow-update` audit, CSS, ops smoke, backlog/stream verification/release records/server dispatch 연결을 확인하되 Action Readiness Checklist, Client-safe Resolution Digest, Resolution Search & Metrics, UI 풀테스트 직접 조작, 30분/120분, published metadata PASS로 대체하지 않음 |
| OPS-076 | V320 Step 8 Action Readiness Checklist 게이트 | 비대상 | 필요 | 안정화 | `verify-v320-action-readiness-checklist`가 `/ops/events` action readiness UI, `unifiedResolutionWorkspace.actionReadinessChecklist` view model, rule draft/evidence bundle/notification readiness checklist, CSS, ops smoke, backlog/stream verification/release records/server dispatch 연결을 확인하되 Client-safe Resolution Digest, Resolution Search & Metrics, UI 풀테스트 직접 조작, 30분/120분, published metadata PASS로 대체하지 않음 |
| OPS-077 | V320 Step 9 Client-safe Resolution Digest 게이트 | 비대상 | 필요 | 안정화 | `verify-v320-client-safe-resolution-digest`가 `/client/api/views/{id}/events` `resolutionDigest`, client live/dashboard/events renderer, CSS, ops/client smoke, backlog/stream verification/release records/server dispatch 연결을 확인하되 Resolution Search & Metrics, UI 풀테스트 직접 조작, 30분/120분, published metadata PASS로 대체하지 않음 |
| OPS-078 | V320 Step 10 Resolution Search & Metrics 게이트 | 비대상 | 필요 | 안정화 | `verify-v320-resolution-search-metrics`가 `/ops/events` resolution search metrics UI, unifiedResolutionWorkspace.resolutionSearchMetrics view model, active filters/saved view presets/operations metrics, CSS, ops smoke, backlog/stream verification/release records/server dispatch 연결을 확인하되 Stabilization and Release Readiness, UI 풀테스트 직접 조작, 30분/120분, published metadata PASS로 대체하지 않음 |
| OPS-079 | V320 Step 11 Stabilization and Release Readiness 게이트 | 비대상 | 필요 | 안정화 | `verify-v320-stabilization-release-readiness`가 v3.2 Step 1~10 local gates, release policy/evidence index/test records, close-out dry-run command, server dispatch 연결을 확인하되 UI 풀테스트 직접 조작, 30분/120분, published metadata, PR/main/tag/GitHub Release, field smoke 실행 PASS로 대체하지 않음 |
| OPS-080 | V330 Step 1 v3.3 baseline 게이트 | 비대상 | 필요 | 안정화 | `verify-v330-entry-baseline`가 VERSION/CMake/README/docs/backlog/source roadmap을 source `3.3.0`, latest published `v3.2.0`, current roadmap `v3.3.0 Live Source Reliability Workspace` 기준으로 정렬했는지 확인하되 v3.3 기능 구현, release publish, PR/main/tag/push, UI 풀테스트, 30분/120분, field smoke 실행 PASS로 대체하지 않음 |
| OPS-081 | V330 Step 2 Source Registry Snapshot and Identity 게이트 | 비대상 | 필요 | 안정화 | `verify-v330-source-registry-snapshot-identity`가 SourceViewRegistry read model, `/ops/api/source-registry/snapshot` Ops-only route, backlog/stream verification/release records/server dispatch 연결을 확인하되 source registry write, PublishedView write, viewer/client 노출, onboarding quality, reliability timeline, incident correlation, recovery queue, client digest, search/metrics, release publish, UI 풀테스트, 30분/120분, field smoke 실행 PASS로 대체하지 않음 |
| OPS-082 | V330 Step 3 Source Onboarding Quality Summary 게이트 | 비대상 | 필요 | 안정화 | `verify-v330-source-onboarding-quality-summary`가 SourceViewRegistry read model, `/ops/api/source-registry/onboarding-quality` Ops-only route, `/ops/sources` summary hook, backlog/stream verification/release records/server dispatch 연결을 확인하되 source registry write, PublishedView write, viewer/client 노출, reliability timeline, incident correlation, recovery queue, client digest, search/metrics, release publish, 30분/120분, field smoke 실행 PASS로 대체하지 않음 |
| OPS-083 | V330 Step 4 Reliability Timeline and Health History 게이트 | 비대상 | 필요 | 안정화 | `verify-v330-reliability-timeline-health-history`가 `/ops/api/source-registry/reliability-timeline` Ops-only route, `/ops/sources` timeline/history UI, current source health snapshot, source-health-state-change Ops audit history, backlog/stream verification/release records/server dispatch 연결을 확인하되 source registry write, PublishedView write, viewer/client 노출, incident correlation, recovery queue, client digest, search/metrics, release publish, 30분/120분, field smoke 실행 PASS로 대체하지 않음 |
| OPS-084 | V330 Step 5 Incident-to-Source Correlation Layer 게이트 | 비대상 | 필요 | 안정화 | `verify-v330-incident-source-correlation-layer`가 `/ops/api/events/reviews` incidentSourceCorrelation view model, `/ops/events` source cause/closure impact/source handoff UI, CSS, ops smoke, backlog/stream verification/release records/server dispatch 연결을 확인하되 source registry write, PublishedView write, viewer/client 노출, EventRecord/Event POST/API/schema/media 변경, recovery queue, client digest, search/metrics, release publish, 30분/120분, field smoke 실행 PASS로 대체하지 않음 |
| OPS-085 | V330 Step 6 Operator Recheck and Recovery Queue 게이트 | 비대상 | 필요 | 안정화 | `verify-v330-operator-recheck-recovery-queue`가 `/ops/api/events/reviews` operatorRecheckRecoveryQueue view model, `/ops/events` failed-only recheck/retry candidate/recovery checklist/dry-run/operator note UI, CSS, ops smoke, backlog/stream verification/release records/server dispatch 연결을 확인하되 source registry write, PublishedView write, viewer/client 노출, EventRecord/Event POST/API/schema/media 변경, persistent recovery queue write, client digest, search/metrics, release publish, 30분/120분, field smoke 실행 PASS로 대체하지 않음 |
| OPS-086 | V330 Step 7 Client-safe Source Status Digest 게이트 | 비대상 | 필요 | 안정화 | `verify-v330-client-safe-source-status-digest`가 `/client/api/views/{id}/events` sourceStatusDigest, client live/dashboard/events renderer, CSS, ops/client smoke, backlog/stream verification/release records/manual UI/feature inventory/server dispatch 연결을 확인하되 source registry write, PublishedView write, viewer/client 범위 밖 노출, EventRecord/Event POST/API/schema/media 변경, search/metrics, release publish, 30분/120분, field smoke 실행 PASS로 대체하지 않음 |
| OPS-087 | V330 Step 8 Operator Runbook and Reliability Handoff 게이트 | 비대상 | 필요 | 안정화 | `verify-v330-operator-runbook-reliability-handoff`가 `docs/live-source-health.md` runbook source-of-truth, docs index/UI guide/config/backup handoff, backlog/stream verification/release records/feature inventory/server dispatch 연결을 확인하되 Source Reliability Search and Metrics, Ops Backup and Recovery Source Handoff, real backup/restore, release publish, UI 풀테스트, 30분/120분, field smoke 실행 PASS로 대체하지 않음 |
| OPS-088 | V330 Step 9 Source Reliability Search and Metrics 게이트 | 비대상 | 필요 | 안정화 | `verify-v330-source-reliability-search-metrics`가 `/ops/api/source-registry/reliability-search-metrics` Ops-only route, `/ops/sources` source health filters/saved reliability views/reconnect-stale-offline metrics UI, CSS, backlog/stream verification/release records/feature inventory/server dispatch 연결을 확인하되 source registry write, PublishedView write, saved view write, viewer/client 노출, API/schema/media 변경, Ops Backup and Recovery Source Handoff, release publish, 30분/120분, field smoke 실행 PASS로 대체하지 않음 |
| OPS-089 | V330 Step 10 Ops Backup and Recovery Source Handoff 게이트 | 비대상 | 필요 | 안정화 | `verify-v330-ops-backup-recovery-source-handoff`가 `/ops/api/source-registry/backup-recovery-handoff` Ops-only route, `/ops/sources` handoff input/recovery validation plan UI, CSS, backup guide, backlog/stream verification/release records/feature inventory/server dispatch 연결을 확인하되 source registry write, PublishedView write, backup artifact persistence, real backup/restore, automatic recovery, viewer/client 노출, API/schema/media 변경, release publish, 30분/120분, field smoke 실행 PASS로 대체하지 않음 |
| OPS-090 | V330 Step 11 Stabilization and Release Readiness 게이트 | 비대상 | 필요 | 안정화 | `verify-v330-stabilization-release-readiness`가 v3.3 Step 1~10 local gates, release policy/evidence index/test records, close-out dry-run command, server dispatch 연결을 확인하되 UI 풀테스트 직접 조작, 30분/120분, published metadata, PR/main/tag/GitHub Release, field smoke 실행 PASS로 대체하지 않음 |
| OPS-091 | V340 Step 1 v3.4 baseline 게이트 | 비대상 | 필요 | 안정화 | `verify-v340-entry-baseline`가 VERSION/CMake/README/docs/backlog/source roadmap을 source `3.4.0`, latest published `v3.4.0`, current roadmap `v3.4.0 Operations Continuity Drill Workspace` 기준으로 정렬했는지 확인하되 v3.4 기능 구현, release publish, PR/main/tag/push, UI 풀테스트, 30분/120분, field smoke 실행 PASS로 대체하지 않음 |
| OPS-092 | V340 Step 2 Continuity Drill Contract 게이트 | 비대상 | 필요 | 안정화 | `verify-v340-continuity-drill-contract`가 `/ops/api/source-registry/continuity-drill/contract` Ops-only route, recovery drill schema, v3.3 handoff 입력, backlog/stream verification/release records/inventory/server dispatch 연결을 확인하되 Recovery Candidate Package, Staging Restore Validation Harness, release publish, UI 풀테스트, 30분/120분, field smoke 실행 PASS로 대체하지 않음 |
| OPS-093 | V340 Step 3 Recovery Candidate Package 게이트 | 비대상 | 필요 | 안정화 | `verify-v340-recovery-candidate-package`가 `/ops/api/source-registry/recovery-candidate-package` Ops-only route, SourceRegistry/PublishedView/source health/EventRecord/audit context read model, redaction, backlog/stream verification/release records/inventory/server dispatch 연결을 확인하되 production restore, release publish, UI 풀테스트, 30분/120분, field smoke 실행 PASS로 대체하지 않음 |
| OPS-094 | V340 Step 4 Staging Restore Validation Harness 게이트 | 비대상 | 필요 | 안정화 | `verify-v340-staging-restore-validation-harness`가 temporary staging runtime validation, package marker, backlog/stream verification/release records/inventory/server dispatch 연결을 확인하되 production write, release publish, UI 풀테스트, 30분/120분, field smoke 실행 PASS로 대체하지 않음 |
| OPS-095 | V340 Step 5 Source Health Replay and Drift Diff 게이트 | 비대상 | 필요 | 안정화 | `verify-v340-source-health-replay-drift-diff`가 `/ops/api/source-registry/source-health-replay-drift-diff` Ops-only route, handoff source health, fresh source health, stale/offline/reconnect/warning drift summary, backlog/stream verification/release records/inventory/server dispatch 연결을 확인하되 Ops UI, automatic recovery, evidence export, release publish, UI 풀테스트, 30분/120분, field smoke 실행 PASS로 대체하지 않음 |
| OPS-096 | V340 Step 6 Ops Continuity Drill Workspace UI 게이트 | 비대상 | 필요 | 안정화 | `verify-v340-ops-continuity-drill-workspace-ui`가 `/ops/sources` read-only workspace, renderer/CSS, client 비노출, backlog/stream verification/manual UI/release records/inventory/server dispatch 연결을 확인하되 approval-gated checklist, client digest, evidence export, release publish, UI 풀테스트, 30분/120분, field smoke 실행 PASS로 대체하지 않음 |
| OPS-097 | V340 Step 7 Approval-Gated Recovery Checklist and Audit 게이트 | 비대상 | 필요 | 안정화 | `verify-v340-approval-gated-recovery-checklist-audit`가 `/ops/api/source-registry/approval-gated-recovery-checklist` Ops-only route, `/ops/sources` checklist UI, renderer/CSS, client 비노출, backlog/stream verification/manual UI/release records/inventory/server dispatch 연결을 확인하되 automatic recovery, client digest, evidence export, release publish, UI 풀테스트, 30분/120분, field smoke 실행 PASS로 대체하지 않음 |
| OPS-098 | V340 Step 8 Client-safe Maintenance Digest 게이트 | 비대상 | 필요 | 안정화 | `verify-v340-client-safe-maintenance-digest`가 client maintenance digest API/UI, renderer/CSS, ops/client smoke, backlog/stream verification/manual UI/release records/inventory/server dispatch 연결을 확인하되 evidence export, field bridge, release publish, UI 풀테스트, 30분/120분, field smoke 실행 PASS로 대체하지 않음 |
| OPS-099 | V340 Step 9 Drill Evidence Export and Cleanup Manifest 게이트 | 비대상 | 필요 | 안정화 | `verify-v340-drill-evidence-export-cleanup-manifest`가 `/ops/api/source-registry/drill-evidence-export-cleanup-manifest` Ops-only route, `/ops/sources` redacted manifest UI, CSS, ops/client smoke, backlog/stream verification/manual UI/release records/inventory/server dispatch 연결을 확인하되 cleanup 실행, artifact export 실행, field bridge, release publish, UI 풀테스트, 30분/120분, field smoke 실행 PASS로 대체하지 않음 |
| OPS-100 | V340 Step 10 Field Bridge Condition Gates 게이트 | 비대상 | 필요 | 안정화 | `verify-v340-field-bridge-condition-gates`가 `/ops/api/source-registry/field-bridge-condition-gates` Ops-only route, `/ops/sources` condition gate UI, CSS, ops/client smoke, backlog/stream verification/manual UI/release records/inventory/server dispatch 연결을 확인하되 ONVIF 실기기, external WHEP/TURN, real cloud/VLM provider field smoke 실행, endpoint probe, provider call, release publish, UI 풀테스트, 30분/120분을 PASS로 대체하지 않음 |
| OPS-101 | V340 Step 11 Stabilization and Release Readiness 게이트 | 비대상 | 필요 | 안정화 | `verify-v340-stabilization-release-readiness`가 v3.4 local readiness command, roadmap/stream verification/release policy/evidence index/release records/server dispatch/script inventory 연결을 확인하되 release action, published metadata, UI 풀테스트, 30분/120분, field smoke 실행 PASS로 대체하지 않음 |
| OPS-102 | V350 Step 1 v3.5 baseline 게이트 | 비대상 | 필요 | 안정화 | `verify-v350-entry-baseline`가 VERSION/CMake/README/docs/backlog/source roadmap을 source `3.5.0`, latest published `v3.4.0`, current roadmap `v3.5.0 Live Operations Control Plane` 기준으로 정렬했는지 확인하되 v3.5 기능 구현, release publish, PR/main/tag/push, UI 풀테스트, 30분/120분, field smoke 실행 PASS로 대체하지 않음 |
| OPS-103 | V350 Step 2 Live Operations Graph Contract 게이트 | 비대상 | 필요 | 안정화 | `verify-v350-live-operations-graph-contract`가 `/ops/api/live-operations/graph` Ops-only route, EventRecord/SourceRegistry/PublishedView/source health/continuity drill/client impact graph, redaction boundary, backlog/stream verification/release records/inventory/server dispatch 연결을 확인하되 command plan, UI 풀테스트, 30분/120분, release publish PASS로 대체하지 않음 |
| OPS-104 | V350 Step 3 Operations Command Plan Contract 게이트 | 비대상 | 필요 | 안정화 | `verify-v350-operations-command-plan-contract`가 `/ops/api/live-operations/command-plan` Ops-only route, source recheck/recovery/maintenance/client notice/rule follow-up 후보, draft-only/no-execution boundary, backlog/stream verification/release records/inventory/server dispatch 연결을 확인하되 incident handoff, staged change apply, UI 풀테스트, 30분/120분, release publish PASS로 대체하지 않음 |
| OPS-105 | V350 Step 4 Incident-to-Command Handoff 게이트 | 비대상 | 필요 | 안정화 | `verify-v350-incident-to-command-handoff`가 `/ops/api/events/reviews` selected detail handoff, `/ops/events` renderer marker, source cause/continuity drill/command plan draft, read-only boundary, backlog/stream verification/release records/inventory/server dispatch 연결을 확인하되 staged change apply, UI 풀테스트 직접 조작, 30분/120분, release publish PASS로 대체하지 않음 |
| OPS-106 | V350 Step 5 Staged Change Plan and Impact Preview 게이트 | 비대상 | 필요 | 안정화 | `verify-v350-staged-change-plan-impact-preview`가 `/ops/api/live-operations/staged-change-plan-impact-preview` Ops-only route, source/view/rule follow-up staging candidates, impact preview, blockers, no-apply boundary, backlog/stream verification/release records/inventory/server dispatch 연결을 확인하되 source/view/rule write, client notice 발송, UI 풀테스트, 30분/120분, release publish PASS로 대체하지 않음 |
| OPS-107 | V350 Step 6 Ops Command Workspace UI 게이트 | 비대상 | 필요 | 안정화 | `verify-v350-ops-command-workspace-ui`가 `/ops` dashboard command workspace shell, renderer/CSS, graph/command/staged/review read model 연결, client 비노출, backlog/stream verification/release records/inventory/server dispatch 연결을 확인하되 command execution, UI 풀테스트 직접 조작, 30분/120분, release publish PASS로 대체하지 않음 |
| OPS-108 | V350 Step 7 Drill Run Ledger and Plan Comparison 게이트 | 비대상 | 필요 | 안정화 | `verify-v350-drill-run-ledger-plan-comparison`이 `/ops/api/live-operations/drill-run-ledger` route, `/ops` ledger UI, drill run id/operator note/blocker/evidence refs/previous run diff, append-only boundary, backlog/stream verification/release records/inventory/server dispatch 연결을 확인하되 drill run write, command execution, UI 풀테스트 직접 조작, 30분/120분, release publish PASS로 대체하지 않음 |
| OPS-109 | V350 Step 8 Client Impact Forecast 게이트 | 비대상 | 필요 | 안정화 | `verify-v350-client-impact-forecast`가 client impact forecast API/UI/schema, viewer-safe redaction boundary, Ops/Client smoke marker, backlog/stream verification/release records/inventory/server dispatch 연결을 확인하되 notice 상태 노출, command execution, UI 풀테스트 직접 조작, 30분/120분, release publish PASS로 대체하지 않음 |
| OPS-110 | V350 Step 9 Client-safe Operations Notice 게이트 | 비대상 | 필요 | 안정화 | `verify-v350-client-safe-operations-notice`가 client operations notice API/UI/schema, status/timeline-only redaction boundary, Ops/Client smoke marker, backlog/stream verification/release records/inventory/server dispatch 연결을 확인하되 export bundle, field evidence, command execution, UI 풀테스트 직접 조작, 30분/120분, release publish PASS로 대체하지 않음 |
| OPS-111 | V350 Step 10 Operations Export Bundle and Handoff Map 게이트 | 비대상 | 필요 | 안정화 | `verify-v350-operations-export-bundle-handoff-map`이 `/ops/api/live-operations/export-bundle-handoff-map` Ops-only route, `/ops` dashboard export bundle/handoff map UI, release-safe boundary, CSS, ops/client smoke, backlog/stream verification/release records/inventory/server dispatch 연결을 확인하되 artifact export 실행, handoff write, field smoke/provider call, command execution, UI 풀테스트 직접 조작, 30분/120분, release publish PASS로 대체하지 않음 |
| OPS-112 | V350 Step 11 Field Evidence Intake 게이트 | 비대상 | 필요 | 안정화 | `verify-v350-field-evidence-intake`가 `/ops/api/live-operations/field-evidence-intake` Ops-only route, `/ops` dashboard field evidence intake UI, redaction/not-run boundary, CSS, ops/client smoke, backlog/stream verification/release records/inventory/server dispatch 연결을 확인하되 field smoke 실행, endpoint probe, credential probe, provider call, command execution, UI 풀테스트 직접 조작, 30분/120분, release publish PASS로 대체하지 않음 |
| OPS-113 | V350 Step 12 VLM-assisted Ops Explanation 게이트 | 비대상 | 필요 | 안정화 | `verify-v350-vlm-assisted-ops-explanation`이 `/ops/api/live-operations/vlm-assisted-explanation` Ops-only route, `/ops` dashboard VLM-assisted Ops Explanation UI, default-off/no-call boundary, CSS, ops/client smoke, backlog/stream verification/release records/inventory/server dispatch 연결을 확인하되 VLM/provider 실행, command execution, operator review write, UI 풀테스트 직접 조작, 30분/120분, release publish PASS로 대체하지 않음 |
| OPS-114 | V350 Step 13 Stabilization and Release Readiness 게이트 | 비대상 | 필요 | 안정화 | `verify-v350-stabilization-release-readiness`가 v3.5 local readiness command, roadmap/stream verification/release policy/evidence index/release records/server dispatch/script inventory 연결을 확인하되 release action, published metadata, UI 풀테스트, 30분/120분, field smoke 실행 PASS로 대체하지 않음 |
| OPS-115 | V360 Step 1 v3.6 baseline 게이트 | 비대상 | 필요 | 안정화 | `verify-v360-entry-baseline`가 VERSION/CMake/README/docs/backlog/source roadmap을 source `3.6.0`, latest published `v3.6.0`, current roadmap `v3.6.0 Operations Simulation and Safe Apply Readiness` 기준으로 정렬했는지 확인하되 v3.6 기능 구현, release publish, PR/main/tag/push, UI 풀테스트, 30분/120분, field smoke 실행 PASS로 대체하지 않음 |
| OPS-116 | V360 Step 2 Simulation Input Contract 게이트 | 비대상 | 필요 | 안정화 | `verify-v360-simulation-input-contract`가 `/ops/api/live-operations/simulation/input-pack` Ops-only route, EventRecord/SourceRegistry/PublishedView/command plan/staged plan input pack, no-write boundary, backlog/stream verification/release records/inventory/server dispatch 연결을 확인하되 simulation run, UI 풀테스트, 30분/120분, release publish PASS로 대체하지 않음 |
| OPS-117 | V360 Step 3 Operations Simulation Run Contract 게이트 | 비대상 | 필요 | 안정화 | `verify-v360-operations-simulation-run-contract`가 `/ops/api/live-operations/simulation/run-contract` Ops-only route, simulation route family, run schema, result envelope, no-run boundary, backlog/stream verification/release records/inventory/server dispatch 연결을 확인하되 dry-run 실행 결과, UI 풀테스트, 30분/120분, release publish PASS로 대체하지 않음 |
| OPS-118 | V360 Step 4 Command Plan Dry-run Simulator 게이트 | 비대상 | 필요 | 안정화 | `verify-v360-command-plan-dry-run-simulator`가 `/ops/api/live-operations/simulation/command-plan-dry-run` Ops-only route, source recheck/recovery/maintenance/client notice/rule follow-up dry-run, no-execution boundary, backlog/stream verification/release records/inventory/server dispatch 연결을 확인하되 command execution, UI 풀테스트, 30분/120분, release publish PASS로 대체하지 않음 |
| OPS-119 | V360 Step 5 Source/Rule Impact Diff 게이트 | 비대상 | 필요 | 안정화 | `verify-v360-source-rule-impact-diff`가 `/ops/api/live-operations/simulation/impact-diff` Ops-only route, source health/event risk/client impact diff, no-apply boundary, backlog/stream verification/release records/inventory/server dispatch 연결을 확인하되 source/rule apply, client notice 발송, UI 풀테스트, 30분/120분, release publish PASS로 대체하지 않음 |
| OPS-120 | V360 Step 6 Safe Apply Readiness Gate 게이트 | 비대상 | 필요 | 안정화 | `verify-v360-safe-apply-readiness-gate`가 `/ops/api/live-operations/simulation/safe-apply-readiness` Ops-only route, ready/blocked/approval-needed/field-needed/not-run 상태와 blocker, no-auto-apply boundary, backlog/stream verification/release records/inventory/server dispatch 연결을 확인하되 automatic apply, field smoke, UI 풀테스트, 30분/120분, release publish PASS로 대체하지 않음 |
| OPS-121 | V360 Step 7 Ops Simulation Workspace UI 게이트 | 비대상 | 필요 | 안정화 | `verify-v360-ops-simulation-workspace-ui`가 `/ops` dashboard simulation workspace shell, renderer/CSS, input/run/dry-run/impact/readiness read model 연결, client 비노출, backlog/stream verification/release records/inventory/server dispatch 연결을 확인하되 UI 풀테스트 직접 조작, command execution, safe apply, client notice 발송, 30분/120분, release publish PASS로 대체하지 않음 |
| OPS-122 | V360 Step 8 Simulation Run Ledger and Comparison 게이트 | 비대상 | 필요 | 안정화 | `verify-v360-simulation-run-ledger-comparison`이 `/ops/api/live-operations/simulation/run-ledger` Ops-only route, `/ops` ledger UI, simulation run id/input ref/result diff/operator note/previous run comparison, append-only boundary, backlog/stream verification/release records/inventory/server dispatch 연결을 확인하되 simulation execution, operator note write, client notice 발송, UI 풀테스트, 30분/120분, release publish PASS로 대체하지 않음 |
| OPS-123 | V360 Step 9 Client Notice Preview 게이트 | 비대상 | 필요 | 안정화 | `verify-v360-client-notice-preview`가 `/ops/api/live-operations/simulation/client-notice-preview` Ops-only route, `/ops` preview UI, maintenance/degraded/recovering viewer-safe notice preview, preview-only boundary, backlog/stream verification/release records/inventory/server dispatch 연결을 확인하되 client notice send/persist, viewer payload 변경, UI 풀테스트, 30분/120분, release publish PASS로 대체하지 않음 |
| OPS-124 | V360 Step 10 Rule/VA What-if Replay Pack 게이트 | 비대상 | 필요 | 안정화 | `verify-v360-rule-va-what-if-replay-pack`이 `/ops/api/live-operations/simulation/rule-va-what-if-replay-pack` Ops-only route, `/ops` what-if UI, EventRecord/VA fixture 기반 threshold/preset/scenario 후보 비교, no-apply boundary, backlog/stream verification/release records/inventory/server dispatch 연결을 확인하되 rule apply, EventRecord write, UI 풀테스트, 30분/120분, release publish PASS로 대체하지 않음 |
| OPS-125 | V360 Step 11 Simulation Export Bundle 게이트 | 비대상 | 필요 | 안정화 | `verify-v360-simulation-export-bundle`이 `/ops/api/live-operations/simulation/export-bundle` Ops-only route, `/ops` export bundle UI, simulation input/output/blocker/handoff refs, redacted release-safe boundary, backlog/stream verification/release records/inventory/server dispatch 연결을 확인하되 artifact export/file write/handoff write, field smoke/provider call, UI 풀테스트, 30분/120분, release publish PASS로 대체하지 않음 |
| OPS-126 | V360 Step 12 Field Evidence Simulation Adapter 게이트 | 비대상 | 필요 | 안정화 | `verify-v360-field-evidence-simulation-adapter`가 `/ops/api/live-operations/simulation/field-evidence-adapter` Ops-only route, `/ops` adapter UI, ONVIF/external WHEP-TURN/cloud-VLM conditional/not-run evidence, no-field-execution boundary, backlog/stream verification/release records/inventory/server dispatch 연결을 확인하되 field smoke, endpoint/credential probe, provider call, UI 풀테스트, 30분/120분, release publish PASS로 대체하지 않음 |
| OPS-127 | V360 Step 13 VLM-assisted Simulation Explanation 게이트 | 비대상 | 필요 | 안정화 | `verify-v360-vlm-assisted-simulation-explanation`이 `/ops/api/live-operations/simulation/vlm-assisted-explanation` Ops-only route, `/ops` simulation workspace VLM-assisted Simulation Explanation UI, default-off/no-call boundary, CSS, ops/client smoke, backlog/stream verification/release records/inventory/server dispatch 연결을 확인하되 VLM/provider 실행, simulation 실행, operator review write, UI 풀테스트 직접 조작, 30분/120분, release publish PASS로 대체하지 않음 |
| OPS-128 | V360 Step 14 Stabilization and Release Readiness 게이트 | 비대상 | 필요 | 안정화 | `verify-v360-stabilization-release-readiness`가 v3.6 Step 1~13 local gates, release policy/evidence index/test records, close-out dry-run command, server dispatch 연결을 확인하되 UI 풀테스트 직접 조작, 30분/120분, published metadata, PR/main/tag/GitHub Release, field smoke 실행 PASS로 대체하지 않음 |
| OPS-129 | V370 Step 1 v3.7 baseline 게이트 | 비대상 | 필요 | 안정화 | `verify-v370-entry-baseline`가 VERSION/CMake/README/docs/backlog/source roadmap을 source `3.7.0`, latest published `v3.7.0`, current roadmap `v3.7.0 Site-Aware Operations and Safe Runbook Control Plane` 기준으로 정렬했는지 확인하되 v3.7 기능 구현, release publish, PR/main/tag/push, UI 풀테스트, 30분/120분, field smoke 실행 PASS로 대체하지 않음 |
| OPS-130 | V370 Step 2 Site / Source Group Contract 게이트 | 비대상 | 필요 | 안정화 | `verify-v370-site-source-group-contract`가 `/ops/api/site-operations/source-group-contract` Ops-only route, site/sourceGroup/zone/viewGroup read model, no-write boundary, backlog/stream verification/release records/inventory/server dispatch 연결을 확인하되 source/view write, UI 풀테스트, 30분/120분, release publish PASS로 대체하지 않음 |
| OPS-131 | V370 Step 3 Site-Aware Source Registry Projection 게이트 | 비대상 | 필요 | 안정화 | `verify-v370-site-aware-source-registry-projection`가 `/ops/api/site-operations/source-registry-projection` Ops-only route, SourceRegistry/PublishedView site projection, redaction boundary, backlog/stream verification/release records/inventory/server dispatch 연결을 확인하되 source/view write, viewer/client 노출, UI 풀테스트, 30분/120분, release publish PASS로 대체하지 않음 |
| OPS-132 | V370 Step 4 Site Health Rollup 게이트 | 비대상 | 필요 | 안정화 | `verify-v370-site-health-rollup`이 `/ops/api/site-operations/health-rollup` Ops-only route, source health site/group rollup, offline/degraded/recovering/field-needed 상태, no-recovery boundary, backlog/stream verification/release records/inventory/server dispatch 연결을 확인하되 field smoke, automatic recovery, UI 풀테스트, 30분/120분, release publish PASS로 대체하지 않음 |
| OPS-133 | V370 Step 5 Site Impact Graph 게이트 | 비대상 | 필요 | 안정화 | `verify-v370-site-impact-graph`가 `/ops/api/site-operations/impact-graph` Ops-only route, EventRecord/source health/PublishedView/client impact site graph, redaction boundary, backlog/stream verification/release records/inventory/server dispatch 연결을 확인하되 source/view/EventRecord/Ops audit/client/media mutation, viewer/client 노출, UI 풀테스트, 30분/120분, release publish PASS로 대체하지 않음 |
| OPS-134 | V370 Step 6 Site Simulation Input Pack 게이트 | 비대상 | 필요 | 안정화 | `verify-v370-site-simulation-input-pack`이 `/ops/api/site-operations/simulation-input-pack` Ops-only route, v3.6 simulation input/result envelope와 site projection/impact graph 연결, no-run/no-persist boundary, backlog/stream verification/release records/inventory/server dispatch 연결을 확인하되 simulation 실행, source/view/rule/EventRecord/Ops audit/client/media mutation, UI 풀테스트, 30분/120분, release publish PASS로 대체하지 않음 |
| OPS-135 | V370 Step 7 Cross-Site Safe Apply Readiness 게이트 | 비대상 | 필요 | 안정화 | `verify-v370-cross-site-safe-apply-readiness`가 `/ops/api/site-operations/cross-site-safe-apply-readiness` Ops-only route, affected clients/blocker/approval-needed/field-needed 상태, no-apply/no-client-exposure boundary, backlog/stream verification/release records/inventory/server dispatch 연결을 확인하되 safe apply, field smoke, client notice, UI 풀테스트, 30분/120분, release publish PASS로 대체하지 않음 |
| OPS-136 | V370 Step 8 Runbook Template Contract 게이트 | 비대상 | 필요 | 안정화 | `verify-v370-runbook-template-contract`가 `/ops/api/site-operations/runbook-template-contract` Ops-only route, source recheck/maintenance/rule draft/client notice template contract, no-write boundary, backlog/stream verification/release records/inventory/server dispatch 연결을 확인하되 runbook instance persist, approval ticket write, UI 풀테스트, 30분/120분, release publish PASS로 대체하지 않음 |
| OPS-137 | V370 Step 9 Runbook Instance Ledger 게이트 | 비대상 | 필요 | 안정화 | `verify-v370-runbook-instance-ledger`가 `/ops/api/site-operations/runbook-instance-ledger` Ops-only route, runbookId/siteId/status/operator note/previous run comparison append-only ledger projection, no-write boundary, backlog/stream verification/release records/inventory/server dispatch 연결을 확인하되 runbook instance persist, operator note write, approval ticket write, UI 풀테스트, 30분/120분, release publish PASS로 대체하지 않음 |
| OPS-138 | V370 Step 10 Approval Ticket Workflow 게이트 | 비대상 | 필요 | 안정화 | `verify-v370-approval-ticket-workflow`가 `/ops/api/site-operations/approval-ticket-workflow` Ops-only route, approval/hold/reject/field-needed 상태, reviewer/reason/audit link read-only projection, no-write boundary, backlog/stream verification/release records/inventory/server dispatch 연결을 확인하되 approval ticket write, reviewer assignment write, approval decision persist, UI 풀테스트, 30분/120분, release publish PASS로 대체하지 않음 |
| OPS-139 | V370 Step 11 Site Operations Workspace UI 게이트 | 비대상 | 필요 | 안정화 | `verify-v370-site-operations-workspace-ui`가 `/ops` dashboard site operations workspace shell, renderer/CSS, site list/health rollup/runbook queue/impact detail read model 연결, client 비노출, backlog/stream verification/release records/inventory/server dispatch 연결을 확인하되 UI 풀테스트 직접 조작, source/view/runbook/approval write, client notice send, 30분/120분, release publish PASS로 대체하지 않음 |
| OPS-140 | V370 Step 12 Client Notice by Site/View Group 게이트 | 비대상 | 필요 | 안정화 | `verify-v370-client-notice-by-site-view-group`가 `/ops/api/site-operations/client-notice-by-site-view-group` Ops-only route, site/view group notice preview, delivery queue preview, no-send/no-persist boundary, dashboard renderer/CSS, client 비노출, backlog/stream verification/release records/inventory/server dispatch 연결을 확인하되 UI 풀테스트 직접 조작, client notice 발송, viewer payload 변경, 30분/120분, release publish PASS로 대체하지 않음 |
| OPS-141 | V370 Step 13 Rule/VA What-if by Site 게이트 | 비대상 | 필요 | 안정화 | `verify-v370-rule-va-what-if-by-site`가 `/ops/api/site-operations/rule-va-what-if-by-site` Ops-only route, site-scoped rule threshold/scenario 후보, EventRecord/VA fixture refs, no-apply/no-write boundary, dashboard renderer/CSS, client 비노출, backlog/stream verification/release records/inventory/server dispatch 연결을 확인하되 UI 풀테스트 직접 조작, rule apply, EventRecord write, 30분/120분, release publish PASS로 대체하지 않음 |
| OPS-142 | V370 Step 14 Field Evidence Attachment 게이트 | 비대상 | 필요 | 안정화 | `verify-v370-field-evidence-attachment`가 `/ops/api/site-operations/field-evidence-attachment` Ops-only route, ONVIF/external WHEP/TURN/cloud/VLM conditional evidence attachment, runbook/approval refs, no-execution/no-write boundary, dashboard renderer/CSS, client 비노출, backlog/stream verification/release records/inventory/server dispatch 연결을 확인하되 UI 풀테스트 직접 조작, field smoke, endpoint/provider 실행, 30분/120분, release publish PASS로 대체하지 않음 |
| OPS-143 | V370 Step 15 Limited Safe Execution Pilot 게이트 | 비대상 | 필요 | 안정화 | `verify-v370-limited-safe-execution-pilot`가 `/ops/api/site-operations/limited-safe-execution-pilot` Ops-only route, source recheck/notice queue lowest-risk pilot 후보, approval gate state, execution preview, no-execution/no-write boundary, dashboard renderer/CSS, client 비노출, backlog/stream verification/release records/inventory/server dispatch 연결을 확인하되 UI 풀테스트 직접 조작, source recheck 실행, notice queue write/send, 30분/120분, release publish PASS로 대체하지 않음 |
| OPS-144 | V370 Step 16 Outcome Reconciliation 게이트 | 비대상 | 필요 | 안정화 | `verify-v370-outcome-reconciliation`가 `/ops/api/site-operations/outcome-reconciliation` Ops-only route, pre-simulation/post-execution source/event/client impact diff, pending/not-run boundary, dashboard renderer/CSS, client 비노출, backlog/stream verification/release records/inventory/server dispatch 연결을 확인하되 UI 풀테스트 직접 조작, pilot execution, source recheck 실행, notice queue write/send, 30분/120분, release publish PASS로 대체하지 않음 |
| OPS-145 | V370 Step 17 Export / Handoff Bundle 게이트 | 비대상 | 필요 | 안정화 | `verify-v370-export-handoff-bundle`가 `/ops/api/site-operations/export-handoff-bundle` Ops-only route, site/runbook/evidence/approval/outcome refs, redacted release-safe bundle, handoff map, dashboard renderer/CSS, client 비노출, backlog/stream verification/release records/inventory/server dispatch 연결을 확인하되 UI 풀테스트 직접 조작, artifact/file/handoff write, execution, 30분/120분, release publish PASS로 대체하지 않음 |
| OPS-146 | V370 Step 18 Stabilization and Release Readiness 게이트 | 비대상 | 필요 | 안정화 | `verify-v370-stabilization-release-readiness`가 v3.7 Step 1~17 local gates, release policy/evidence index/test records, close-out dry-run command, server dispatch 연결을 확인하되 UI 풀테스트 직접 조작, 30분/120분, published metadata, PR/main/tag/GitHub Release, field smoke 실행 PASS로 대체하지 않음 |
| OPS-147 | V380 Step 1 v3.8 baseline 게이트 | 비대상 | 필요 | 안정화 | `verify-v380-entry-baseline`가 VERSION/CMake/README/docs/backlog/source roadmap을 source `3.8.0`, latest published `v3.8.0`, current roadmap `v3.8.0 Operator-Gated Action Pilot & Outcome Loop` 기준으로 정렬했는지 확인하되 v3.8 기능 구현, release publish, PR/main/tag/push, UI 풀테스트, 30분/120분, field smoke 실행 PASS로 대체하지 않음 |
| OPS-148 | V380 Step 2 Ops Action Route Boundary 게이트 | 비대상 | 필요 | 안정화 | `verify-v380-ops-action-route-boundary`가 `/ops/api/actions/route-boundary` Ops-only route, v3.8 action route catalog, v3.5 live-operations/v3.7 site-operations projection 분리, no-store guard, backlog/stream verification/release records/inventory/server dispatch 연결을 확인하되 action execution, request/approval/readiness persist, UI 풀테스트, 30분/120분, release publish PASS로 대체하지 않음 |
| OPS-149 | V380 Step 3 Action Capability Contract 게이트 | 비대상 | 필요 | 안정화 | `verify-v380-action-capability-contract`가 `/ops/api/actions/capability-contract` Ops-only route, allowed/denied action catalog, required role/scope, idempotency policy, immutable schema boundary, no-store guard, backlog/stream verification/release records/inventory/server dispatch 연결을 확인하되 action execution, request/approval/readiness persist, UI 풀테스트, 30분/120분, release publish PASS로 대체하지 않음 |
| OPS-150 | V380 Step 4 Action Request Ledger Contract 게이트 | 비대상 | 필요 | 안정화 | `verify-v380-action-request-ledger-contract`가 `/ops/api/actions/request-ledger` Ops-only route, actionRequestId/siteId/runbookId/requestedBy/status/createdAt/idempotencyKey, append-only/read-only policy, no-store guard, backlog/stream verification/release records/inventory/server dispatch 연결을 확인하되 request write, action execution, request/approval/readiness persist, UI 풀테스트, 30분/120분, release publish PASS로 대체하지 않음 |
| OPS-151 | V380 Step 5 Approval Decision Gate 게이트 | 비대상 | 필요 | 안정화 | `verify-v380-approval-decision-gate`가 `/ops/api/actions/approval-decision-gate` Ops-only route, approve/hold/reject/field-needed state, reviewer, reason, auditRef, stale decision guard, no-store guard, backlog/stream verification/release records/inventory/server dispatch 연결을 확인하되 decision write, action execution, request/approval/readiness persist, UI 풀테스트, 30분/120분, release publish PASS로 대체하지 않음 |
| OPS-152 | V380 Step 6 Action Readiness Preflight 게이트 | 비대상 | 필요 | 안정화 | `verify-v380-action-readiness-preflight`가 `/ops/api/actions/readiness-preflight` Ops-only route, capability/approval/field evidence/source health/client impact/duplicate request blocker, readiness state, no-store guard, backlog/stream verification/release records/inventory/server dispatch 연결을 확인하되 readiness execution/result persist, action execution, request/approval persist, UI 풀테스트, 30분/120분, release publish PASS로 대체하지 않음 |
| OPS-153 | V380 Step 7 Source Recheck Action Pilot 게이트 | 비대상 | 필요 | 안정화 | `verify-v380-source-recheck-action-pilot`가 `/ops/api/actions/source-recheck-pilot` Ops-only route, source health recheck request, dry execution result envelope, readiness refs, pilot blocker state, no-store guard, backlog/stream verification/release records/inventory/server dispatch 연결을 확인하되 source recheck execution, source health write, action result persist, UI 풀테스트, 30분/120분, release publish PASS로 대체하지 않음 |
| OPS-154 | V380 Step 8 Client Notice Draft Queue 게이트 | 비대상 | 필요 | 안정화 | `verify-v380-client-notice-draft-queue`가 `/ops/api/actions/client-notice-draft-queue` Ops-only route, viewer-safe notice draft, queue preview, delivery blocker, redaction boundary, readiness/pilot refs, no-store guard, backlog/stream verification/release records/inventory/server dispatch 연결을 확인하되 client notice delivery, notice draft persist, notice queue write, UI 풀테스트, 30분/120분, release publish PASS로 대체하지 않음 |
| OPS-155 | V380 Step 9 Rule Draft Action Package 게이트 | 비대상 | 필요 | 안정화 | `verify-v380-rule-draft-action-package`가 `/ops/api/actions/rule-draft-package` Ops-only route, rule threshold/scenario 후보, draft package, review checklist, apply blocker, readiness/notice refs, no-store guard, backlog/stream verification/release records/inventory/server dispatch 연결을 확인하되 rule/scenario apply, rule draft persist, rule/profile registry write, UI 풀테스트, 30분/120분, release publish PASS로 대체하지 않음 |
| OPS-156 | V380 Step 10 Ops Action Control Workspace UI 게이트 | 비대상 | 필요 | 안정화 | `verify-v380-ops-action-control-workspace-ui`가 `/ops` dashboard shell, `renderV380OpsActionControlWorkspace`, `refreshV380OpsActionControlWorkspace`, action route refs, CSS, backlog/stream verification/release records/inventory/server dispatch 연결을 확인하되 UI 풀테스트 직접 조작, action execution, request/approval/readiness persist, source recheck, notice send, rule apply, 30분/120분, release publish PASS로 대체하지 않음 |
| OPS-157 | V380 Step 11 Client-safe Action Notice Preview 게이트 | 비대상 | 필요 | 안정화 | `verify-v380-client-safe-action-notice-preview`가 client events/dashboard payload, `renderClientActionNoticePreview`, client live/dashboard/events renderer, CSS, backlog/stream verification/release records/inventory/server dispatch 연결을 확인하되 UI 풀테스트 직접 조작, client notice send/persist/queue write, action execution, source recheck, rule apply, 30분/120분, release publish PASS로 대체하지 않음 |
| OPS-158 | V380 Step 12 Outcome Observer 게이트 | 비대상 | 필요 | 안정화 | `verify-v380-outcome-observer-reconciliation`이 `/ops/api/actions/outcome-reconciliation`, `renderV380OutcomeObserverReconciliation`, source/EventRecord/client/rule outcome diff UI, CSS, backlog/stream verification/release records/inventory/server dispatch 연결을 확인하되 UI 풀테스트 직접 조작, action execution, source recheck, client notice send, rule apply, 30분/120분, release publish PASS로 대체하지 않음 |
| OPS-159 | V380 Step 13 Action Receipt Bundle 게이트 | 비대상 | 필요 | 안정화 | `verify-v380-action-receipt-bundle`이 `/ops/api/actions/receipt-bundle`, `renderV380ActionReceiptBundle`, redacted receipt bundle/handoff map/redaction review UI, CSS, backlog/stream verification/release records/inventory/server dispatch 연결을 확인하되 UI 풀테스트 직접 조작, artifact/file/handoff write, action execution, source recheck, client notice send, rule apply, 30분/120분, release publish PASS로 대체하지 않음 |
| OPS-160 | V380 Step 14 Field Connector Evidence Package 게이트 | 비대상 | 필요 | 안정화 | `verify-v380-field-connector-evidence-package`가 `/ops/api/actions/field-connector-evidence-package`, `renderV380FieldConnectorEvidencePackage`, connector evidence package/condition refs UI, CSS, backlog/stream verification/release records/inventory/server dispatch 연결을 확인하되 UI 풀테스트 직접 조작, field smoke, endpoint/credential probe, provider/cloud call, action execution, source/view/EventRecord/Ops audit write, 30분/120분, release publish PASS로 대체하지 않음 |
| OPS-161 | V380 Step 15 Default-off Action Explanation 게이트 | 비대상 | 필요 | 안정화 | `verify-v380-default-off-action-explanation`이 `/ops/api/actions/default-off-explanation`, `renderV380DefaultOffActionExplanation`, default-off explanation summary UI, CSS, backlog/stream verification/release records/inventory/server dispatch 연결을 확인하되 UI 풀테스트 직접 조작, VLM/provider/runtime call, action execution, source/view/EventRecord/Ops audit write, 30분/120분, release publish PASS로 대체하지 않음 |
| OPS-162 | V380 Step 16 Stabilization and Release Readiness 게이트 | 비대상 | 필요 | 안정화 | `verify-v380-stabilization-release-readiness`가 v3.8 Step 1~15 local gates, release policy/evidence index/test records, close-out dry-run command, server dispatch 연결을 확인하되 UI 풀테스트 직접 조작, 30분/120분, published metadata, PR/main/tag/GitHub Release, field smoke 실행 PASS로 대체하지 않음 |
| OPS-163 | V390 Step 0 Source Baseline Alignment 게이트 | 비대상 | 필요 | 안정화 | `verify-v390-entry-baseline`, `verify-release-metadata`, `verify-docs-links`, `verify-docs-ui-assets`, `verify-project-inventory`, `verify-feature-inventory-coverage`, `verify-script-inventory`가 v3.9 source baseline과 v3.8 latest published baseline 경계를 연결하되 feature discovery/dev, UI 풀테스트, 30분/120분, published metadata, PR/main/tag/GitHub Release 실행 PASS로 대체하지 않음 |
| OPS-164 | V390 Step 2 Feature Completion Inventory/Discovery Gate | 비대상 | 필요 | 안정화 | `verify-v390-feature-completion-inventory`, `verify-project-inventory`, `verify-feature-inventory-coverage`, `verify-script-inventory`가 v3.9 feature completion inventory scaffold와 user review gate를 연결하되 실제 discovery 완료, 기능 구현, 구조 안정화 구현, 테스트 방식 전환 구현, UI 풀테스트, 30분/120분, published metadata, PR/main/tag/GitHub Release 실행 PASS로 대체하지 않음 |
| OPS-165 | V390 Step 3 User Review Gate / 개발 순서 확정 | 비대상 | 필요 | 안정화 | `verify-v390-user-review-gate`, inventory/coverage/script gate가 initial historical snapshot과 current approved-through-recorded-user-goals/closed-with-evidence 상태를 연결하되 UI 풀테스트 직접 조작, 30분/120분, published metadata, PR/main/tag/GitHub Release 실행 PASS로 대체하지 않음 |
| OPS-166 | V390 Step 7 UI wrapper/result schema 오판 방지 gate | 비대상 | 필요 | 안정화 | `verify-v390-evidence-test-gate-prep`, `verify-ui-fulltest-one-shot`, `verify-feature-inventory-coverage`, `verify-script-inventory`가 wrapper result schema와 manual UI 문서 경계를 연결하되 wrapper PASS를 UI 풀테스트 직접 조작, 30분/120분, manual result, release 실행 PASS로 대체하지 않음 |
| OPS-167 | V390 Step 8 feature inventory coverage wording gate | 비대상 | 필요 | 안정화 | `verify-v390-evidence-test-gate-prep`, `verify-feature-inventory-coverage`, `verify-project-inventory`, `verify-script-inventory`가 coverage mapping을 `covered/missing`으로 기록하고 `not-execution-evidence` 경계를 확인하되 기능 실행/테스트 PASS로 대체하지 않음 |
| OPS-168 | V390 R1/V390-ADD1-10 AI-minimized server longrun first-fail gate | 비대상 | 필요 | 안정화 | `verify-v390-server-longrun`, `verify-v390-server-longrun-runner-contract`, `verify-v390-evidence-test-gate-prep`, `verify-runtime-media-longrun-trigger-matrix`, `verify-longrun-separation`, `verify-rc-release-gate`가 delegated exact phase/case manifest, global ID/order/uniqueness/count, 첫 실패 즉시 중단, later case `not-run`, context/stderr/reproduction failure report를 runner/fixture contract로 확인하되 실제 30분/120분 longrun 실행 evidence가 아닙니다 |
| OPS-169 | V390 UI automation / Policy v4 evidence qualification gate | 비대상 | 필요 | 안정화 | exact native runner/coverage와 `verify-ui-fulltest-evidence-policy-v4`가 423 positive+1 negative route의 provenance, completion oracle, role·viewport·theme, artifact integrity/redaction/visual/replay/cleanup을 판정합니다. Unsupported 0 readiness와 pass 0/not-run 424 execution은 분리되며 actual 전수와 교차 의무가 닫히기 전 전체 UI PASS가 아님 |
| OPS-170 | V390 Step 11 ONVIF provider status gate | 비대상 | 필요 | 안정화 | `verify-v390-onvif-credential-provider-status`, `verify-project-inventory`, `verify-feature-inventory-coverage`, `verify-script-inventory`가 `/ops/api/onvif/credential-provider-status`, `/ops/sources` 상태 표시, roadmap/release records/inventory/server dispatch 연결을 확인하되 ONVIF 실기기 credential success, persistent secret store, source/view persist, UI 풀테스트, 30분/120분, release publish PASS로 대체하지 않음 |
| OPS-171 | V390 ONVIF source/view atomicity gate | 비대상 | 필요 | 안정화 | `verify-v390-onvif-source-view-atomicity`, `verify-v390-onvif-live-import-persist-decision`, `verify-project-inventory`, `verify-feature-inventory-coverage`, `verify-script-inventory`가 paired route, recoverable journal, crash/restart/retry 행렬, byte/existence/mode 보존, UI/roadmap/release/dispatch를 확인하되 one-shot import persist, ONVIF 실기기 success, UI 풀테스트, 30분/120분, release publish PASS로 대체하지 않음 |
| OPS-172 | V390 Step 13 VLM draft bridge decision gate | 비대상 | 필요 | 안정화 | `verify-v390-vlm-rule-suggestion-draft-bridge`, `verify-project-inventory`, `verify-feature-inventory-coverage`, `verify-script-inventory`가 `/ops/api/vlm/rule-suggestion-draft-bridge`, `/ops/rules` bridge status, roadmap/release records/inventory/server dispatch 연결을 확인하되 rule/profile write, auto-apply, provider/runtime call, UI 풀테스트, 30분/120분, release publish PASS로 대체하지 않음 |
| OPS-173 | V390 VLM promotion trust boundary gate | 비대상 | 필요 | 안정화 | `verify-v390-vlm-promotion-trust-boundary`, `verify-v390-vlm-evaluation-promotion-guard`, `verify-project-inventory`, `verify-feature-inventory-coverage`, `verify-script-inventory`가 14개 HTTP promotion, 7개 structural save rejection, 13개 restart full-contract/structure quarantine, canonical provenance readback, no-write-on-reject를 확인하되 runtime/provider 호출, UI 풀테스트, 30분/120분, release publish PASS로 대체하지 않음 |
| OPS-174 | V390 Step 15 backup/recovery validation handoff gate | 비대상 | 필요 | 안정화 | `verify-v390-backup-recovery-handoff-validation`, `verify-project-inventory`, `verify-feature-inventory-coverage`, `verify-script-inventory`가 `/ops/api/source-registry/staging-restore-validation-handoff`, `/ops/sources` checklist/result artifact status, roadmap/release records/inventory/server dispatch 연결을 확인하되 production restore, automatic recovery, UI 풀테스트, 30분/120분, release publish PASS로 대체하지 않음 |
| OPS-175 | V390 Step 16 action execution deferral gate | 비대상 | 필요 | 안정화 | `verify-v390-action-execution-deferral-decision`, `verify-v380-ops-action-control-workspace-ui`, `verify-v380-default-off-action-explanation`, `verify-project-inventory`, `verify-feature-inventory-coverage`, `verify-script-inventory`가 `/ops/api/actions/execution-deferral-decision`, `/ops` deferral decision UI, roadmap/release records/inventory/server dispatch 연결을 확인하되 action execution, source recheck, client notice send, rule apply, UI 풀테스트, 30분/120분, release publish PASS로 대체하지 않음 |
| OPS-176 | V390 Step 17 field evidence bridge gate | 비대상 | 필요 | 안정화 | `verify-v390-conditional-field-ai-decisions`, `verify-v380-field-connector-evidence-package`, `verify-v350-field-evidence-intake`, `verify-project-inventory`, `verify-feature-inventory-coverage`, `verify-script-inventory`가 `/ops/api/field-evidence/bridge-decision`, `/ops` field evidence bridge UI, roadmap/release records/inventory/server dispatch 연결을 확인하되 field smoke, endpoint/provider execution, UI 풀테스트, 30분/120분, release publish PASS로 대체하지 않음 |
| OPS-177 | V390 Re-ID readiness consistency gate | 비대상 | 필요 | 안정화 | `verify-v390-reid-readiness-consistency`, `verify-v390-conditional-field-ai-decisions`, `verify-reid-advanced-tracking`, `verify-analysis-state`, `verify-project-inventory`, `verify-feature-inventory-coverage`, `verify-script-inventory`가 공용 readiness owner, C++ capability 2종, HTTP 10개 case, Ops UI, roadmap/release records/dispatch를 확인하되 실제 ONNX session 성공, identity search, UI 풀테스트, 30분/120분, release publish PASS로 대체하지 않음 |
| OPS-178 | V390 Step 19 Structure Stabilization Handoff 게이트 | 비대상 | 필요 | 안정화 | `verify-v390-structure-stabilization-handoff`, `verify-project-inventory`, `verify-feature-inventory-coverage`, `verify-script-inventory`가 structure handoff plan, backlog, v390 inventory, stream verification, release records/evidence 연결을 확인하되 실제 route/API/UI extraction, manual UI archive split, VLM contract index implementation, UI 풀테스트, 30분/120분, release publish PASS로 대체하지 않음 |
| OPS-179 | V390 actual acceptance bundle 실행 게이트 | 비대상 | 필요 | 안정화, 30분 | Current canonical command는 output root만 받아 throwaway server/ports/account/role-state/browser dependency를 자체 준비하고 build, current feature commands, 실제 30분, exact 424 v4 producer, owned server/artifact cleanup, Policy qualification, 조건부 120분, final integrity/report를 실행합니다. Contract fixture는 actual duration/UI evidence가 아니며 published metadata/release action을 실행하지 않습니다 |
| OPS-180 | V390 incident-to-rule provenance closure gate | 비대상 | 필요 | 안정화 | `verify-v390-vlm-incident-rule-provenance`가 candidate API→Ops draft→generated rule payload→save/readback/restart chain, duplicate/nested scope 거부, reload 시 current EventRecord/observation 재대조를 검증합니다. 실제 provider evaluation 실행이나 auto rule apply evidence가 아닙니다 |
| OPS-181 | V390 deferred product owner sign-off gate | 비대상 | 필요 | 안정화 | `verify-v390-deferred-product-owner-signoff`와 `verify-v390-truthfulness-status-vocabulary`가 machine-readable `accountable-owner-decision-record`, 실제 owner `@dhseo90`, production restore와 model-backed Re-ID capability truth, source evidence, 구조화 후속 dependency를 대조합니다. Current execution은 `not-executed`이고 owner sign-off는 구현·field/UI/longrun/release 실행 PASS가 아닙니다 |
| OPS-182 | V390 structure stabilization readiness gate | 비대상 | 필요 | 안정화 | `verify-v390-structure-stabilization-readiness`가 current REVIEW4-64 execution ledger와 source/CMake graph를 대조해 production 215·C++ 103·owner 10·CMake target 2, target violation 0·SCC 0·internal separation true를 검증합니다 |
| OPS-183 | V390 external field smoke no-device closure gate | 비대상 | 필요 | 안정화 | `verify-v390-external-field-smoke-no-device-closure`와 `verify-v390-truthfulness-status-vocabulary`가 field `conditional-not-run`과 field/release claim false를 대조합니다. 실제 external field smoke나 field/release PASS evidence가 아닙니다 |
| OPS-184 | V390 Analysis Registry durable write gate | 비대상 | 필요 | 안정화 | 직접 C++ 제품 owner `AnalysisRegistryMutationErrorResponse`와 `verify-v390-analysis-registry-durable-write`, `verify-analysis-state`, `verify-project-inventory`, `verify-feature-inventory-coverage`, `verify-script-inventory`가 mode-preserving temp write/file fsync/rename/parent fsync, typed persistence error, HTTP 500, 12×9 fault 및 12×3 crash/restart/stale-temp recovery 계약을 확인하되 UI 풀테스트, 30분/120분, release publish PASS로 대체하지 않음 |

## Completed Exact-ID Coverage Review

2026-07-11에 기존 984개 기능 행을 대조했고 V390-REVIEW2-21에서 `SAFE-217`/`OPS-184`를 추가해 현재 986개 기능 행을 `test/fixtures/project_feature_implementation_evidence.json`
`media-server.feature-implementation-evidence.v2` manifest와 1:1 대조했습니다. 이 완료는
content-addressed owner/route-control/action/state/readback 5-edge와 verifier assertion,
reviewer-bound semantic digest 확인이며
제품 테스트 실행 PASS가 아닙니다. manifest 갱신은 `--refresh-manifest`를 명시한 source 변경으로만
수행하고, 변경된 행은 `review-required`가 되며 명시 reviewer 승인 전 semantic closure로 전환되지
않습니다. 기본 verifier는 read-only로 source context와 relation drift를 검사합니다.

| 대조 항목 | exact-ID 결과 | 검증 경계 |
| --- | ---: | --- |
| 기능 ID 집합 | 986/986 | inventory와 manifest의 ID, section, feature, UI 필요, 테스트 영역이 완전 일치 |
| 코드 로직 owner/route-control/action/state/readback | 986/986 | exact file/symbol/content context hash와 5-edge chain, 행별 고유 semantic digest/reason; 실행 PASS 아님 |
| 제품 UI route/control/state anchor | 441/441 | UI 필요/간접 또는 UI absence boundary 행별 screen route, product UI action owner, exact selector 또는 비대상 사유; 직접 클릭 PASS 아님 |
| manual UI exact case | 424/424 | 테스트 영역 `UI` 행별 동일 `manualUiCaseId`; 실행 결과 없이 PASS 아님 |
| 안정화 semantic verifier assertion | 986/986 | `validateSemanticItem`/`validateReview3CallChain`이 5개 role/edge, content locator, reviewer/chain digest를 검증하며 missing edge, ID-only, generic/unrelated owner를 거부 |
| 30분 mapping | 50/50 | `verify-v390-server-longrun --duration-minutes 30`, current 986-row manifest에서 자동 산출, 사용자 명시 승인 전 미실행 |
| 120분 mapping | 7/7 | `verify-v390-server-longrun --duration-minutes 120`, 사용자 명시 승인 전 조건부 미실행 |
| manifest negative fixture | 15/15 | 기존 11개와 missing reviewed chain, duplicate bulk reason, unrelated SAFE-140, generic RULE-017 owner를 거부 |
| semantic closure contract | 19/19 | 986 reviewed/unique reason, 알려진 2건 교정, 자동 selector 봉쇄와 wrong role/anchor/edge/digest/reviewer/generic owner negative를 독립 확인 |

정적 대조는 `./server.sh verify-feature-implementation-evidence`와
`./server.sh verify-feature-inventory-coverage`로 수행합니다. `coverageStatus=covered`는
mapping coverage만 뜻하고 `executionEvidenceStatus=not-execution-evidence`를 유지합니다.
누락 ID, 존재하지 않는 source/UI/verifier anchor, legacy `verify-predev` current mapping은
release gate에서 FAIL합니다. 네 테스트 영역 밖 분류도 거부합니다.

## Script Inventory Boundary

이 문서는 기능별 UI 필요 여부와 테스트 영역을 관리합니다. `server.sh` command dispatch, `scripts/internal/*`, `scripts/examples/*`, helper script 전체 목록은 `./server.sh verify-script-inventory`가 전용 검증 기준입니다. script 파일 하나하나를 기능 row로 다시 나열하지 않습니다.

## S10 3C-5.3b 실제 파일·복구 사전등록

| 기능 ID | 기능/경계 | 안정화 | 30분 | 120분 | UI | 합격 기준 |
| --- | --- | --- | --- | --- | --- | --- |
| S10-F01 | 실제 정상 완료 | 승인 focused/영향 회귀 | S11 최종 cut | 조건부·이번 미승인 | 비대상: UI 없어야 정상 | 기존 H264 fixture→writer→selector→Intent→실제2출력→Ready→publish→원자commit→Complete, 파일hash·출처·자원해제 |
| S10-F02 | 출력 독립 시간축·출처 | 승인 focused/영향 회귀 | S11 최종 cut | 조건부·이번 미승인 | 비대상: UI 없어야 정상 | output PTS/duration 독립epoch·ns timebase·Event class·unknown UTC, AU/VCL/visible hash/90k 잔차 및 요청/실제/미충족 그대로 보존 |
| S10-F03 | Intent 생성 전 중단 | 승인 focused/영향 회귀 | S11 최종 cut | 조건부·이번 미승인 | 비대상: UI 없어야 정상 | 생성 전 재시작은 소유 파일 없음 확인 후 Failed, 렌더 재시도 없음 |
| S10-F04 | create/receipt 사이 중단 | 승인 focused/영향 회귀 | S11 최종 cut | 조건부·이번 미승인 | 비대상: UI 없어야 정상 | 파일 존재만으로 소유 추정 금지; Unknown blocker·보호/예약 유지·자동 삭제 없음 |
| S10-F05 | receipt 후 중단 | 승인 focused/영향 회귀 | S11 최종 cut | 조건부·이번 미승인 | 비대상: UI 없어야 정상 | 정확한 root/parents/dev/inode/attempt 및 nlink1·상한 확인 후 소유partial 정리→Failed |
| S10-F06 | Ready 중단 | 승인 focused/영향 회귀 | S11 최종 cut | 조건부·이번 미승인 | 비대상: UI 없어야 정상 | 실제 검증 Ready 재시작은 재렌더 없이 hash 대조·게시·원자commit·정리 수렴 |
| S10-F07 | 각 output link 중단 | 승인 focused/영향 회귀 | S11 최종 cut | 조건부·이번 미승인 | 비대상: UI 없어야 정상 | 두 출력 각각 linkat 직후 nlink2 동일inode 쌍 재시작·양 부모fsync·나머지publish 수렴 |
| S10-F08 | 게시 내구 후 중단 | 승인 focused/영향 회귀 | S11 최종 cut | 조건부·이번 미승인 | 비대상: UI 없어야 정상 | 모든 게시 뒤 commit 전 재시작은 동일 검증파일만 commit |
| S10-F09 | Committed 중단 | 승인 focused/영향 회귀 | S11 최종 cut | 조건부·이번 미승인 | 비대상: UI 없어야 정상 | 출력/출처/job 단일mutation과 source/output 보호 유지·임시정리 후 Complete |
| S10-F10 | cleanup 중단 | 승인 focused/영향 회귀 | S11 최종 cut | 조건부·이번 미승인 | 비대상: UI 없어야 정상 | 각 temp unlink·attempt/job 디렉터리 삭제·terminal 저장 직전 중단을 포함하며 Complete/Failed cleanup 모두 부재를 안전하게 증명해 재시작 수렴 |
| S10-F11 | hash/누락/foreign 파일 | 승인 focused/영향 회귀 | S11 최종 cut | 조건부·이번 미승인 | 비대상: UI 없어야 정상 | Ready hash변경·누락·동명foreign·symlink·FIFO·추가hardlink·root/parent교체는 비차단 regular 검사와 overwrite/unlink금지·blocker |
| S10-F12 | 엄격 원장 전이 | 승인 focused/영향 회귀 | S11 최종 cut | 조건부·이번 미승인 | 비대상: UI 없어야 정상 | receipt/Ready/Commit/Complete strict parser·unknown/불완전/ID충돌·중첩 output order 위조 거부 및SQLite/fallback/checkpoint 동등 |
| S10-F13 | terminal tombstone | 승인 focused/영향 회귀 | S11 최종 cut | 조건부·이번 미승인 | 비대상: UI 없어야 정상 | Complete output 보존삭제 후 재시작/Run은 재생성하지 않음 |
| S10-F14 | 취소·용량·기록 상한 | 승인 focused/영향 회귀 | S11 최종 cut | 조건부·이번 미승인 | 비대상: UI 없어야 정상 | 취소·30초budget·출력합계 cap·4MiB provenance 초과는 성공절단 금지, 소유cleanup 확인 후Failed |
| S10-F15 | 단일 실행·동시 호출 | 승인 focused/영향 회귀 | S11 최종 cut | 조건부·이번 미승인 | 비대상: UI 없어야 정상 | 같은 catalog service 소유1개·동시Run 거부·active snapshot 최대8개와 초과 명시, 중복 상태 멱등 |
| S10-F16 | 복구 시작 순서 | 승인 focused/영향 회귀 | S11 최종 cut | 조건부·이번 미승인 | 비대상: UI 없어야 정상 | catalogOpen 보호·예약 복원→service Reconcile→후속 retention/producer 순서만fixture검증; production기본연결 제외 |

## S10 3C-5.4 opt-in 이벤트 통합 사전등록

| 기능 ID | 기능 | 안정화 | 30분 | 120분 | UI | 독립 oracle |
| --- | --- | --- | --- | --- | --- | --- |
| S10-E01 | 실제 H264 decoder 이벤트 2출력 | 승인 focused/직접 영향 | S11 최종 cut·미실행 | 조건부·이번 미승인 | 비대상: UI 없어야 정상 | 실제 encoder/writer와 RawVideoDecoder callback 직접 증거→DispatchEventRecords→reference→job Complete→2개 output ID/file decode·출처; packet 합성 증거와 구분 |
| S10-E02 | 정상 단일 출력 | 승인 focused/직접 영향 | S11 최종 cut·미실행 | 조건부·이번 미승인 | 비대상: UI 없어야 정상 | 단일 원본 요청의 실제 파일과 job/output 목록·전체 요청 충족 |
| S10-E03 | 부분 출력 | 승인 focused/직접 영향 | S11 최종 cut·미실행 | 조건부·이번 미승인 | 비대상: UI 없어야 정상 | 일부 confirmed와 외부 unknown을 보존한 partial job/output; verified와 fully 분리 |
| S10-E04 | post-roll 증거 갱신 | 승인 focused/직접 영향 | S11 최종 cut·미실행 | 조건부·이번 미승인 | 비대상: UI 없어야 정상 | 동일 source/channel/ns/generation provider의 후행 직접 증거와 finalize snapshot 갱신으로 완전 출력 |
| S10-E05 | 대기 timeout | 승인 focused/직접 영향 | S11 최종 cut·미실행 | 조건부·이번 미승인 | 비대상: UI 없어야 정상 | 유한 steady/시도 예산 종료는 unknown이며 시간 경과를 coverage로 사용하지 않음 |
| S10-E06 | namespace/generation 경계 | 승인 focused/직접 영향 | S11 최종 cut·미실행 | 조건부·이번 미승인 | 비대상: UI 없어야 정상 | 새 namespace·세대·track 불일치 provider를 합성/재라벨링하지 않고 미확인 보존 |
| S10-E07 | immutable 요청 | 승인 focused/직접 영향 | S11 최종 cut·미실행 | 조건부·이번 미승인 | 비대상: UI 없어야 정상 | start/end/pre/post·원본 generation·namespace와 media/UTC 축을 reference/job까지 그대로 보존 |
| S10-E08 | 동일 snapshot UTC 선택 | 승인 focused/직접 영향 | S11 최종 cut·미실행 | 조건부·이번 미승인 | 비대상: UI 없어야 정상 | 원본 snapshot에서 순수 range helper를 사용하며 unknown/unplaced/복수 후보를 숨기지 않음 |
| S10-E09 | 멱등/선택 갱신 | 승인 focused/직접 영향 | S11 최종 cut·미실행 | 조건부·이번 미승인 | 비대상: UI 없어야 정상 | 같은 reference/selection은 동일 job/output ID; 선택 갱신은 새 job·이전 결과 목록 유지 |
| S10-E10 | continuous 원본 adapter | 승인 focused/직접 영향 | S11 최종 cut·미실행 | 조건부·이번 미승인 | 비대상: UI 없어야 정상 | 같은 source/channel의 continuous만 포함; 자신의 derived Event output 재선택 제외 |
| S10-E11 | 삭제/손상/unindexed | 승인 focused/직접 영향 | S11 최종 cut·미실행 | 조건부·이번 미승인 | 비대상: UI 없어야 정상 | 동일 catalog 잠금의 segment/binding/lifecycle/deleted 대조; 삭제·손상·결박부재를 숨겨 complete로 만들지 않음 |
| S10-E12 | 원자 quota/disk admission | 승인 focused/직접 영향 | S11 최종 cut·미실행 | 조건부·이번 미승인 | 비대상: UI 없어야 정상 | 양수 총 예약과 기존 retention admission; 부족·provider 실패 시 파일 생성 없음 |
| S10-E13 | 큐 포화/접수 종료 | 승인 focused/직접 영향 | S11 최종 cut·미실행 | 조건부·이번 미승인 | 비대상: UI 없어야 정상 | 유한 queue/evidence 상한과 stop 이후 신규 reference Put/Submit 금지, 기존 managed 보존·대기 상태 명시 |
| S10-E14 | 실행 중 stop 취소 | 승인 focused/직접 영향 | S11 최종 cut·미실행 | 조건부·이번 미승인 | 비대상: UI 없어야 정상 | 단일 worker service Run 취소→join, cleanup 전 자원 release 금지·무한 재시도 없음 |
| S10-E15 | 재시작 Ready/소실 대기 | 승인 focused/직접 영향 | S11 최종 cut·미실행 | 조건부·이번 미승인 | 비대상: UI 없어야 정상 | 내구 Ready는 기존 파일로 복구하고 Intent 전 메모리 증거 소실은 발명/재렌더 없이 unknown |
| S10-E16 | terminal tombstone 현재 가용성 | 승인 focused/직접 영향 | S11 최종 cut·미실행 | 조건부·이번 미승인 | 비대상: UI 없어야 정상 | historical Complete와 현재 output availability 분리·삭제 파일 재생성 없음 |
| S10-E17 | clip/fallback/공개 불변 | 승인 focused/직접 영향 | S11 최종 cut·미실행 | 조건부·이번 미승인 | 비대상: UI 없어야 정상 | managed 내부 기본 false flag로 접수된 요청만 clip fallback/실패 집계/RecordFallback 억제, snapshot hook 유지. 서비스 미주입 재생성 및 accepted 후 resolver nullopt/불일치/예외/미주입에서도 기존 내구 소유권 유지(신규 Put/접수 없음). reference link ID·내부 전체 목록·EventRecord 작성 당시 상태 분리; 공개 필드 추가/사후 재작성 없음 |
| S10-E18 | provider/입력 상한 오류 | 승인 focused/직접 영향 | S11 최종 cut·미실행 | 조건부·이번 미승인 | 비대상: UI 없어야 정상 | 다른 source/channel·과대 증거·provider 예외 거부; 누적 원본256초과/관련소수 성공과 실제 관련256초과 거부를 구분 |
| S10-E19 | 직접 영향 회귀 | 승인 focused/직접 영향 | S11 최종 cut·미실행 | 조건부·이번 미승인 | 비대상: UI 없어야 정상 | 기존 legacy event·consumer connection/reference·관측·writer·retention 및 build. C414/C418/C422/C423의 승인된 미주입 error/영속 reference link/managed=false 예상값으로 변경하며 기존 저장·공개·fallback assertions 유지. bridge 직접 링크 runner 4개에 신규 내부 worker 의존 cpp와 기존 gst-video 연결; 5.3b 전수는 인계만으로 재실행하지 않음 |
| S10-E20 | 내구 accepted 소유권 | 승인 focused/직접 영향 | S11 최종 cut·미실행 | 조건부·이번 미승인 | 비대상: UI 없어야 정상 | 실제 slot 확보→canonical reference accepted mutation→worker 공개; 확인된 미접수는 managed=false, 원장 비권위/소유권 조회 불가면 unknown+legacy 억제(접수 성공 아님). 중복/충돌·SQLite/fallback/rebuild·재시작 no-job unknown 및 legacy 비반환 |

## S10 3D-2 D01 숫자 참조

| 기능 ID | 기능/검증 | 안정화 | 30분 | 120분 | UI |
| --- | --- | --- | --- | --- | --- |
| D01-10 | 128/129 및 문자·경로 제약 | focused | 미승인·미실행 | S11 조건부, 이번 미승인 | 비대상: UI 없어야 정상 |
| D01-11 | 실제 metadata 생성 ID 위조 거부 | focused | 미승인·미실행 | S11 조건부, 이번 미승인 | 비대상: UI 없어야 정상 |
| D01-01 | consumer 숫자 참조: 007 source/channel 원문 serialize/parse 왕복 | focused/build/직접 영향 회귀 | 미승인·미실행 | S11 최종 cut 조건부, 이번 미승인 | 비대상: UI 없어야 정상 |
| D01-02 | 잘못된 참조: 빈 값·slash/backslash·경로 이탈 거부 | focused/build/직접 영향 회귀 | 미승인·미실행 | S11 최종 cut 조건부, 이번 미승인 | 비대상: UI 없어야 정상 |
| D01-03 | 생성 ID 구분: reference/owner/namespace 숫자-only 거부 유지 | focused/build/직접 영향 회귀 | 미승인·미실행 | S11 최종 cut 조건부, 이번 미승인 | 비대상: UI 없어야 정상 |
| D01-04 | order 참조: journal 예약과 strict parser 숫자 channel 왕복 | focused/build/직접 영향 회귀 | 미승인·미실행 | S11 최종 cut 조건부, 이번 미승인 | 비대상: UI 없어야 정상 |
| D01-05 | 생성 order ID: request/segment 숫자-only 거부 유지 | focused/build/직접 영향 회귀 | 미승인·미실행 | S11 최종 cut 조건부, 이번 미승인 | 비대상: UI 없어야 정상 |
| D01-06 | 실제 writer: 자체 H264 입력→관리 writer finalized segment/binding 숫자 원문 보존 | focused/build/직접 영향 회귀 | 미승인·미실행 | S11 최종 cut 조건부, 이번 미승인 | 비대상: UI 없어야 정상 |
| D01-07 | catalog consumer: 숫자 channel 저장·목록 조회 | focused/build/직접 영향 회귀 | 미승인·미실행 | S11 최종 cut 조건부, 이번 미승인 | 비대상: UI 없어야 정상 |
| D01-08 | range/location: 숫자 channel media/UTC 입력 허용, 공백 상태를 미디어 있음으로 승격하지 않음 | focused/build/직접 영향 회귀 | 미승인·미실행 | S11 최종 cut 조건부, 이번 미승인 | 비대상: UI 없어야 정상 |
| D01-09 | 내구 재개방: 새 journal/catalog에서 원본 segment 및 consumer 숫자 참조 유지 | focused/build/직접 영향 회귀 | 미승인·미실행 | S11 최종 cut 조건부, 이번 미승인 | 비대상: UI 없어야 정상 |

## S10 3D-2 D02 기본 구성

| 기능 ID | 기능/검증 | 안정화 | 30분 | 120분 | UI |
| --- | --- | --- | --- | --- | --- |
| D02-10 | 실제 default 후행 finalize와16s/cap60s/초기null provider | focused/build | 미승인·미실행 | S11 조건부, 이번 미승인 | 비대상: 내부 구성 |
| D02-11 | canonical raw key→numeric context, 공개 원문 보존·모순 거부 | focused | 미승인·미실행 | S11 조건부, 이번 미승인 | 비대상: 내부 구성 |
| D02-01 | 자동 store identity: empty managed root 난수 ID 생성·다른 root 구별·재개방 ID 유지·명시 ID 계약 유지 | focused/build/직접 영향 회귀 | 미승인·미실행 | S11 조건부, 이번 미승인 | 비대상: 내부 구성 |
| D02-02 | marker/lease 안전성: 충돌 ID·손상/unknown marker·legacy nonempty 거부, lease 동시 소유 거부·init 복구 | focused/build/직접 영향 회귀 | 미승인·미실행 | S11 조건부, 이번 미승인 | 비대상: 내부 구성 |
| D02-03 | bounded 증거 cache: 실제 OnResult snapshot source/channel/ns 결박·4096/capacity·try-lock publication/query, stop namespace 삭제 | focused/build/직접 영향 회귀 | 미승인·미실행 | S11 조건부, 이번 미승인 | 비대상: 내부 구성 |
| D02-04 | 후행 event 증거: history의 초기 decoded null에서도 같은 namespace cache 갱신으로 실제 job 생성·후행 요청 충족 | focused/build/직접 영향 회귀 | 미승인·미실행 | S11 조건부, 이번 미승인 | 비대상: 내부 구성 |
| D02-05 | V2 startup 검사: finalized V2 열거→실제 미디어/hash 검사→손상 Mark, 경로/metadata 변경·job 보호 시 안전 거부 | focused/build/직접 영향 회귀 | 미승인·미실행 | S11 조건부, 이번 미승인 | 비대상: 내부 구성 |
| D02-06 | opt-in 구성: off 비녹화/on 실제 numeric channel managed writer·consumer observation/event→파일·catalog 결과. 기존 public timeline을 새 결과 oracle로 사용하지 않음 | focused/build/직접 영향 회귀 | 미승인·미실행 | S11 조건부, 이번 미승인 | 비대상: 내부 구성 |
| D02-07 | 복구 선행: catalog/보호·예약→ready/deletion→derived bounded reconcile 잔여 blocker 검사→producer 순서 | focused/build/직접 영향 회귀 | 미승인·미실행 | S11 조건부, 이번 미승인 | 비대상: 내부 구성 |
| D02-08 | 종료 수명: 신규 접수 차단→cancel/join→의존 해제, stop 중 작업·재시작과 소유 temp 정리 | focused/build/직접 영향 회귀 | 미승인·미실행 | S11 조건부, 이번 미승인 | 비대상: 내부 구성 |
| D02-09 | 직접 영향 회귀: managed journal/catalog/writer/consumer/provider/startup/retention 관련 focused와 build. D01 유효 증거는 인계만으로 반복하지 않음 | focused/build/직접 영향 회귀 | 미승인·미실행 | S11 조건부, 이번 미승인 | 비대상: 내부 구성 |

## S10 3D-3 C 화면 소비 사전 등록

각 oracle은 [C 실행 전 정의](release-artifacts/v4.1.0/s10-public-consumption/C-definition.md)에 보존한다. 실제 브라우저는 사용자 제외이며 아래 VM 검증으로 대체하지 않는다.

| 기능 ID | 기능/검증 | 안정화 | 30분 | 120분 | UI |
| --- | --- | --- | --- | --- | --- |
| D3C-01 | UTC 0 문자열 | Node VM/DOM focused | 미승인·미실행 | S11 최종 cut 조건부·이번 미승인 | 실제 브라우저 사용자 제외 |
| D3C-02 | null 시간 별도 목록 | Node VM/DOM focused | 미승인·미실행 | S11 최종 cut 조건부·이번 미승인 | 실제 브라우저 사용자 제외 |
| D3C-03 | 잘못된 날짜 경계 | Node VM/DOM focused | 미승인·미실행 | S11 최종 cut 조건부·이번 미승인 | 실제 브라우저 사용자 제외 |
| D3C-04 | 항목 독립 선택 | Node VM/DOM focused | 미승인·미실행 | S11 최종 cut 조건부·이번 미승인 | 실제 브라우저 사용자 제외 |
| D3C-05 | 부분 중첩 원본 보존 | Node VM/DOM focused | 미승인·미실행 | S11 최종 cut 조건부·이번 미승인 | 실제 브라우저 사용자 제외 |
| D3C-06 | 페이지 바깥 이벤트 우선 | Node VM/DOM focused | 미승인·미실행 | S11 최종 cut 조건부·이번 미승인 | 실제 브라우저 사용자 제외 |
| D3C-07 | 원본 보기 | Node VM/DOM focused | 미승인·미실행 | S11 최종 cut 조건부·이번 미승인 | 실제 브라우저 사용자 제외 |
| D3C-08 | 독립 페이지 | Node VM/DOM focused | 미승인·미실행 | S11 최종 cut 조건부·이번 미승인 | 실제 브라우저 사용자 제외 |
| D3C-09 | 요청 축 구별 | Node VM/DOM focused | 미승인·미실행 | S11 최종 cut 조건부·이번 미승인 | 실제 브라우저 사용자 제외 |
| D3C-10 | 추정 시각 안내 | Node VM/DOM focused | 미승인·미실행 | S11 최종 cut 조건부·이번 미승인 | 실제 브라우저 사용자 제외 |
| D3C-11 | 파일 시작 재생 | Node VM/DOM focused | 미승인·미실행 | S11 최종 cut 조건부·이번 미승인 | 실제 브라우저 사용자 제외 |
| D3C-12 | 미지원 형식 | Node VM/DOM focused | 미승인·미실행 | S11 최종 cut 조건부·이번 미승인 | 실제 브라우저 사용자 제외 |
| D3C-13 | 상태 분리 | Node VM/DOM focused | 미승인·미실행 | S11 최종 cut 조건부·이번 미승인 | 실제 브라우저 사용자 제외 |
| D3C-14 | 늦은 조회 응답 | Node VM/DOM focused | 미승인·미실행 | S11 최종 cut 조건부·이번 미승인 | 실제 브라우저 사용자 제외 |
| D3C-15 | known 빈·unknown 존재 | Node VM/DOM focused | 미승인·미실행 | S11 최종 cut 조건부·이번 미승인 | 실제 브라우저 사용자 제외 |
| D3C-16 | 잘못된 응답 수량 | Node VM/DOM focused | 미승인·미실행 | S11 최종 cut 조건부·이번 미승인 | 실제 브라우저 사용자 제외 |
| D3C-17 | 공개 정보 제한 | Node VM/DOM focused | 미승인·미실행 | S11 최종 cut 조건부·이번 미승인 | 실제 브라우저 사용자 제외 |
| I31-R01/R02 기존 7개 | metadata·조회 실패·빈 목록·불가 선택·늦은 metadata·무선택 error·선택 error | 동일 Node 회귀 | 미승인·미실행 | S11 최종 cut 조건부·이번 미승인 | 실제 브라우저 사용자 제외 |
