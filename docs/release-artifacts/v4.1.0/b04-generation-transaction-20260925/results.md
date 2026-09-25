# B-04 형식 게시·중단 복구

독자: 녹화 저장 구현·검증 담당자. 수명: 형식 게시/회전 중단 복구부터 S11 최종 판정까지.
작업 정책은 AGENTS.md, 사전 정의·진행 상태는 중앙 테스트 기록이 기준이다.
준비 후보나 값 codec의 PASS와 실제 게시·복구의 PASS를 구분한다.

## 현재 범위

원래5번의 private cutover/checkpoint coordinator와 재기동 복구를 구현하고 관련 검증을 마쳤다.
PREPARED 영수증, 파일 승격, 원본 marker inode 보존과 v2 교체, 게시 의도 내구화,
manifest 게시 및 소유 준비물 정리를 연결한다. DTO만으로 게시 권위를 부여하지 않는다.
원본 journal/SQLite/media는 보존하고 일반 writer guard·공개 API·runtime 기본 선택을 바꾸지 않는다.
원래6~9번 소비자/기본 연결·누적/실제 통합·최종 검증은 이 결과가 아니다.

## 구현 경계와 기존 반례 연결

`recording_generation_transaction.cpp`는 private stage와 receipt, 알려진 파일의
승격·정리만 담당한다. `RecordingCatalog::PublishManagedCutover`와
`RecoverManagedCutover`는 원본 strict domain·현재 투영 대조를 담당하고,
Journal은 기존 독점 lease와 owner/FD/세대 결박을 유지한다. 새 영수증이나 값 DTO만으로
미검증 상태를 게시하지 않는다. `recording_journal.cpp`의 세대 checkpoint도 같은
stage/receipt 경계에 연결하되 정상 회전의 과거 상세 전수 재처리를 되살리지 않는다.

| 기존 B03-C03 반례 | 새 경로/주입 위치 | 유지하는 판정 |
| --- | --- | --- |
| 다음 active·manifest 임시 파일 충돌 | root 고정 이름 사전 확인. 이후 실제 race는 receipt/게시 실패 경계 | 기존 manifest·active·foreign bytes 보존, 명시적 fixture 충돌 제거 뒤 같은 owner 재시도 |
| 정리 읽기 뒤 같은 inode/길이의 바이트 변경 | 완결 stage 준비 후 예외 → live-only 정리의 hash 읽기/최종 stat 사이 변경 | 의심 파일·stage 보존, owner 사용 차단. 단순 위치 변경이며 손상 거부 삭제 아님 |
| 게시 직전 identity 변경 | 기존 manifest helper의 before-binding 주입 유지 | 게시 거부·의심 파일 보존·같은 owner 재사용 금지 |
| manifest rename 후 directory fsync 실패 | 기존 helper의 directory-sync 실패 주입 유지 | 새 manifest 존재와 내구 불확실 구분, 같은 owner 차단·새 읽기 owner strict Open |
| SQL UPDATE/COMMIT 실패 | 기존 실제 trigger/reader lock 유지, 재개 전 private transaction 복구 추가 | 이전 SQL rollback, 새 manifest/cut 보존, 복구 후 새 owner에서 정확 SQL 재구축 |
| 미완결 active tail | 기존 실제 파일 반례 유지 | 자동 truncate 금지 |

기존 root 직접 준비에서 private stage로 위치만 바뀐 반례와, 새 receipt 복구를 필요로 하는
재개 순서를 구분했다. 새 경계의 읽기 전용 복구 중에는 SQLite·쓰기 권한을 열지 않고,
정리 뒤 정상 소유자를 새로 구성해야 한다. 영수증 없는 준비물/불확실한 게시 상태를
자동 복구 완료로 간주하지 않는 한계도 유지한다.

## 최초 실행 이력

### 검증 범위 판정

| 테스트 카테고리 | 판정 | 직접 근거 | 근거 파일/행/기능 ID | 실행 승인 상태 |
| --- | --- | --- | --- | --- |
| 안정화: 게시·복구 focused | 진행 대상 | 새 private coordinator·receipt/marker/manifest 중단과 정리 | B04-T01~T06, transaction runner | 사용자1~9번 순차 개발 승인 |
| 안정화: 저장 영향 회귀 | 진행 대상 | Journal Open·checkpoint 변경, candidate의 shared scratch 재사용 | B03-C01~C06, B04-C01~C07/S01~S07, 기존 B Journal/Catalog/append/preappend runner | 같은 단계 영향 검증 |
| 안정화: 전체 빌드·문서/등록 | 진행 대상 | 신규 C++ 연결·헤더·dispatch·기록 변경 | CMakeLists.txt/server.sh, B04-T01~T06 | 같은 단계 영향 검증 |
| 30분·120분·실제 UI | 미진행(현재5번) | runtime 기본 연결·누적 통합 선행 미완료 | 원래9번 코드 고정 뒤 승계/무효 범위 판정 | 이번 단위에서 실행하지 않음 |
| 외부 서비스·실기기 | 미진행 | 사용자 명시 제외 | 사용자 지시 | 제외, PASS 아님 |

집중 기능은 중앙에 실행 전 등록했다. 이 표는 기존에 명시한 단기/영향/빌드 범위를
대조 형식으로 정리하며 새 실행 영역을 추가하거나 과거 실패를 PASS로 바꾸지 않는다.

### 원출력별 결과

| 제목 | 수행내용 | 결과(pass/fail) |
| --- | --- | --- |
| 예상 RED | transaction focused exit1, 사전 지정한 미구현 private 게시 거부1건 | fail |
| 정상 구현 첫 실행 | crypto/backend-on 정상 게시1개 PASS 뒤 crypto-off fixture `Need` 선언 부재로 컴파일 실패, 전체 exit1 | fail |
| 준비 단계 복구 첫 실행 | 정상 store·점/콜론 store·새 B 조회·old owner 차단과 PREPARED 중단8개 복구는 통과. 뒤 crypto-off 새 메서드 media/sqlite 미사용 인자 `-Werror` 실패, 전체 exit1 | fail |
| 경계 검사 준비 오류 | checkpoint fixture가 허용되지 않는 corruption reason `probe`를 사용하여 실제 checkpoint 검사 전에 종료, exit2 | fail |
| checkpoint 게시·복구 첫 실행 | 정상 게시 및 PREPARED/게시 후 복구의 stage-empty 검사3건 실패, exit1. 기존 파일 준비 helper가 stage에 별도 lock 파일을 생성한 것이 원인 | fail |
| 소유 준비물 보완·경계 확장 | 앞선 checkpoint 제품 실패3건은 통과. 첫 receipt-renamed hook을 PUBLISH_INTENT로 가정한 fixture 기대값2건 실패, exit1 | fail |
| 영수증 단계 분리 후 | 첫 PREPARED와 두 번째 PUBLISH_INTENT 중단을 구분하여 focused exit0. 기존 C03 정리 대응과 전체 영향 회귀 전의 중간 결과 | pass |
| 살아 있는 owner 실패 정리 | 완전한 준비물 목록의 직접 정리·같은 owner 재시도 포함159 PASS/0 FAIL·exit0 | pass |
| mkdir 성공 후 FD 전 실패 | 미결합 stage를 정리 완료로 숨기지 않는 반례 추가 후160 PASS/0 FAIL·exit0 | pass |
| 기존 checkpoint 영향 회귀 | 4개 지원 구성, C03 실제 SQL 실패/복구와 과거 상세 IO 비교 포함133 PASS/0 FAIL·exit0 | pass |
| 전체 서버 빌드 | `./server.sh build` exit0, compiler warning/error 없음. 아래 device 결박 보완 전 소스 | pass |

두 컴파일 오류는 예상 RED가 아니다. 첫 오류는 fixture 선언 조건, 두 번째는 제품의
비활성 지원 분기 인자 처리 누락으로 원인이 확인되었다. 수정과 전체 지원 구성 재검증을
이어가며 앞부분 PASS를 전체 T01~T06 PASS로 확대하지 않는다. 원출력·개별 결과·소유 fixture
정리는 이 디렉터리의 명세에 보존한다. 향후 최종 PASS로 이 이력을 지우지 않는다.

fixture 준비 오류는 기존 허용 값 `missing-media`로 수정한다. stage-empty 실패는
unknown 파일 삭제나 빈 디렉터리 검사를 완화해서 처리하지 않는다. 기존 managed lease와
전용 stage를 가진 private transaction이 새 파일을 직접 O_EXCL·SHA·fsync로 준비하도록
보완하여 불필요한 잠금 파일 생성을 제거한다. 첫 세 실행은 `initial-artifact-manifest.json`,
뒤 경계 실행들은 `boundary-artifact-manifest.json`과 각각의 압축 원출력·개별 결과에 보존한다.

`receipt-renamed`는 초기 PREPARED 저장과 후속 PUBLISH_INTENT 교체에서 모두 호출된다.
첫 호출의 실제 PREPARED 복구 가능 상태와 두 번째 호출의 게시 의도 상태를 별도 반례로
분리한다. 동일 이름의 hook만 보고 첫 상태를 게시 불확실로 잘못 분류한 검증기 오류이며,
PUBLISH_INTENT의 자동 rollback 금지 정책을 완화하는 수정이 아니다.

기존 B03-C03과의 대조에서 PREPARED 이전 실패를 무조건 정리 성공으로 반환하면,
살아 있는 owner도 자신이 완전히 만든 stage를 회수하지 못하는 차이가 확인되었다.
현재 호출이 보유한 완전한 inode/size/SHA 목록에 한정한 실패 정리를 보완한다.
재기동의 무영수증 stage 자동 소유 추정은 계속 금지하며, unknown/부분 쓰기/temp/변조를
만나면 보존·거부한다. 해당 반례와 영향 회귀가 끝나기 전에는 5번 완료로 처리하지 않는다.

메인 최종 검토에서 private legacy 복구의 lease/barrier device 대조가 일반 guard보다
약해지지 않도록 root device 비교4개를 보완했다. 공개 marker 예외와 무관한 기존 소유
조건을 유지하는 변경이다. 위160·133·빌드는 보완 전 증거로 구분하고, 보완 후 복구 focused·
전체 서버 증분 빌드와 나머지 영향 회귀를 수행한다. C03 중 순수 B 회전/SQL/과거 IO는
변경되지 않은 경로이며 단순 소유 비교 추가 때문에 같은 검사 전수를 다시 실행하지 않는다.

## 실행 상태·제외

| 항목 | 실행 상태 | 현재 판정·다음 조건 |
| --- | --- | --- |
| B04-T01~T06 | 집중·영향 회귀 실행 완료 | 최종165 PASS, 관련1,409 PASS, 전체 빌드 exit0. 실제 앱/총 자원 완료 아님 |
| 실제 서버·포트·운영 계정 | 미실행 | 이 단위는 격리 파일/프로세스 검사 |
| 30분·120분·UI | 미실행 | 원래9번의 코드 고정·영향 판정 뒤 대상 확인 |
| 외부 서비스·실기기 | 제외 | 사용자 명시 제외, PASS 아님 |
| 커밋·푸시 | 5번 커밋 준비 완료 | 문서/등록 정합·원출력 정리 통과. 전체 승인 범위 완료 뒤 푸시 판정 |

## 최종 직접 확인

| 실행 | 실제 명령 | exit | 개별 PASS/FAIL |
| --- | --- | --- | --- |
| 게시·복구 | `bash scripts/internal/verify_recording_generation_transaction.sh` | 0 | 165/0 |
| 기존 회전/SQL | `bash scripts/internal/verify_recording_generation_checkpoint.sh` | 0 | 133/0 |
| 후보 | `bash scripts/internal/verify_recording_cutover_candidate.sh` | 0 | 68/0 |
| 원문 세션 | `bash scripts/internal/verify_recording_cutover_session.sh` | 0 | 46/0 |
| 공개읽기 | `bash scripts/internal/verify_recording_catalog_generation_readonly.sh` | 0 | 106/0 |
| 쓰기/예약 | `bash scripts/internal/verify_recording_generation_append.sh` | 0 | 219/0 |
| 선검증 | `bash scripts/internal/verify_recording_generation_preappend.sh` | 0 | 510/0 |
| B Journal | `./server.sh verify-v410-recording-journal-generation-readonly` | 0 | 78/0 |
| 기존 Catalog | `./server.sh verify-v410-recording-catalog` | 0 | 249/0 |
| 최종 서버 빌드 | `./server.sh build` | 0 | 명령 PASS, 위 assertion 합계와 별도 |

합계1,574개는 고유 기능 수가 아니라 지원 구성별 assertion 수다. 최종 집중은
`device-final.log.gz`, 회전은 `checkpoint-before-device.log.gz`, 그 밖 최종 결과는
`final-artifact-manifest.json`의 원출력과 압축 개별 표를 따른다. 회전의 private legacy
복구 device 보완 전후 범위 차이는 위에 명시했다. 메인이 실제 diff·원출력·최종 집중 소스35개
hash를 대조했다. 실제 macOS 컴파일/실행이며 Linux 실기기 결과로 확대하지 않는다.

## 기록 정합·정리

기존986개 기능 행이 HEAD와 동일하고 수정한 inventory SHA만 재결속한 메모리 검사가
통과했다. 실제 `./server.sh verify-project-inventory`, `verify-docs-links`,
`verify-docs-ui-assets`와 `git diff --check`도 exit0이다. 문서 링크 실패0, 자산10개 PASS다.
원출력·개별 결과는 `static-artifact-manifest.json`과 `static-individual-results.json.gz`에 보존한다.
이는 기존 UI 검토 결속 유지 검사이지 실제 UI 실행이나 새 소비자 경로 PASS가 아니다.

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| initial/boundary/integration/final 명세의 임시 로그20개 | 실행 원문 | 각 명세 bytes 전수 기록 | gzip 바이트 동일·SHA·uid/dev/inode 확인 뒤 원문 삭제 | 압축 원출력 보존·원문 부재 확인 | 각 명세 originalRemoved=true |
| static 명세의 임시 로그3개 | 정적 검사 원문 | 각 명세 bytes 전수 기록 | 동일 확인 뒤 이관·삭제 | 압축 원출력 보존·원문 부재 확인 | static 명세 |
| 각 실행의 격리 fixture | 테스트 파일·실행 파일 | 각 명세 cleanup.bytes 전수 기록 | runner 소유권 확인 후 정리 | 부재 재확인 | 원출력 cleanup과 명세 |
| build | 제품 빌드 산출물 | 정리 대상 아님 | 보존 | 후속 동일 소스 빌드에 재사용 | 실제 서버 실행 없음 |

과거 실패는 보존했다. 이번 단위는 서버·포트·운영/임시 계정을 생성하지 않았다.

token start/end/consumed는 실제 집계 source 부재로 미집계다. 실행 시각·elapsed는
원출력의 실제 시작/끝만 사용하고 중단 실행의 끝 시각을 추정하지 않는다.
