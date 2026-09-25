# B-05 소비자 보호·기본 구성 연결

독자: 녹화 개발·검증 담당자. 수명: 이번 소비자 연결부터 S11 최종 증거 결속까지.
정책은 AGENTS.md, 실행 전 정의와 전체 상태는 중앙 테스트 기록이 기준이다.

## 범위와 상태

원래6번에서 B의 재생·이벤트 보호와 예약 소비자, 기본 runtime 전환을 연결한다.
형식 전환/복구 자체는 dfe22712의 B-04 결과를 재사용하고 호출 경계의 차이를 검사한다.
소비자 보호·지원 빌드 B default 연결과 관련 단기를 마쳤다. 실제 앱 HTTP·누적·장시간/UI 완료 판정은 아니다.

| 단위 | 구현·실행 상태 | 완료 범위와 한계 |
| --- | --- | --- |
| B05-P01~P05 | 구현·집중/영향 검사 완료 | finalize+hold, read-only 임시 보호, 최종 권위와 예약 호출 연결 |
| B05-R01~R07 | 지원 빌드 구현·단기 완료 | runtime 전환·재기동 orchestration·공개 상태 대응. 전체 미지원 서버 빌드는 아래 한계 참조 |
| 원래7~9번 | 미착수 | 현행 검증기 연결·누적/HTTP 통합·코드 고정 후 최종 검증 |

## 불변 계약·직접 검토

임시 hold는 영구 mutation이 아니다. B finalize가 내구화된 뒤 hold SQL까지 실패하면
성공으로 fallback하지 않고 owner를 차단하며 fresh Open으로 실제 내구 결과를 확인한다.
반대로 영속 전이를 동반하지 않는 temporary hold SQL 오류는 rollback하여 기존 메모리와
같은 owner의 재시도를 유지한다. read-only에서 보호를 허용하는 기존 계약도 유지한다.

기존 B03-W05의 미연결 finalize+hold 거부는 이번 승인된 연결로 대체하는 대상이다.
해당 assertion만 성공·hold1·삭제 거부·정확 durable row로 승계하며 다른 권한 차단은 유지한다.
과거 W05 PASS는 당시 미연결 차단의 증거이지 새 기능 실행의 증거가 아니다.

runtime은 지원 빌드에서만 B를 기본 사용한다. 기존 자료는 strict 전환 후 fresh owner로,
미정리 거래는 private 복구 후 fresh owner로 열며 불확실 상태를 V1 fallback으로 숨기지 않는다.
기존 byte/ID/시간·원본 media·기존 캐시 보존과 공개 API/권한·schema 유지가 합격 조건이다.
원래8번의 저장·자원 증가 판정 없이 수용 상수를 RSS/무제한 운영 보장으로 표현하지 않는다.

## 검증 필요성 판정

| 테스트 카테고리 | 판정 | 직접 근거 | 근거 파일/행/기능 ID | 실행 승인 상태 |
| --- | --- | --- | --- | --- |
| 안정화: 보호/예약 집중 | 진행 대상 | Catalog/Journal·writer·파생 예약 변경 | B05-P01~P05 | 사용자 원래1~9번 개발 승인 |
| 안정화: 기본 구성 집중 | 진행 대상 | runtime 전환/복구 호출·공개 상태 대응 | B05-R01~R07 | 같은 범위, P 단위 통과 후 실행 |
| 안정화: 저장·읽기·파생 영향 | 진행 대상 | 이전 B 읽기 권한·append/checkpoint·actual consumer 영향 | 기존 B02-Q, B03-W/C, default-composition/derived-job-service | 단기 영향 검증 |
| 안정화: 빌드·문서/등록 | 진행 대상 | 제품 컴파일/링크·새 runner/기록 | CMake/server dispatch·inventory | 동일 범위 |
| 30분·120분·실제 UI | 미진행(현재6번) | 코드 고정·현행 통합 선행 필요 | 원래9번·AGENTS 7.6.2 | 후속 단계에서 승계/재실행 범위 판정 |
| 외부 서비스·실기기 | 미진행 | 사용자 명시 제외 | 사용자 지시 | 제외, PASS 아님 |

## 실패·미실행 구분

최초 보호 fixture는 재사용 함수의 실제 이름과 다른 이름을 호출하여 컴파일에 실패했다.
제품 source 수정 전 fixture 이름을 바로잡은 뒤, B finalize+hold 미구현 거부라는 사전 지정
RED를 확인했다. 컴파일 오류를 예상 RED로 바꾸지 않으며 두 원출력을 각각 보존한다.

token start/end/consumed는 실제 집계 source 부재로 미집계다. 실행·정리·개별 결과는
원출력을 확보한 후 아래에 덧붙이며 미실행 항목을 PASS로 쓰지 않는다.

### 기본 구성 영향 검사 실행 준비

기존 `verify_recording_default_composition.sh`의 GStreamer 환경 준비를 소유 임시 root
생성·cleanup trap 뒤로 옮기고 기존 headless helper에 격리 cache/registry를 전달한다.
사용자 registry나 저장소 기본 cache를 이번 검증 산출물로 변경하지 않기 위한 준비 보완이다.
제품 플러그인 선택·지원 코덱·검사 assertion·deadline은 변경하지 않는다.

## 실행 결과·메인 검토

각 행은 실제 종료 코드0이다. 합계 **867개 PASS/0 FAIL**, 제품 빌드는 별도다.
중간 실패와 중간 PASS를 이 합계에 중복 가산하지 않는다.
원문과 974개 개별 assertion 행(중간 실행 포함)은 [실행 목록](execution-manifest.json),
[개별 결과](individual-results.json.gz)에 보존했다. 아래 명령의 앞부분은 `bash scripts/internal/`이다.

| 제목 | 수행내용 | 결과(pass/fail) |
| --- | --- | --- |
| 소비자 집중 | `verify_recording_generation_consumers.sh`, 118개, crypto/SQLite/backend 4조합 | pass |
| B 공개 읽기 | `verify_recording_catalog_generation_readonly.sh`, 106개 | pass |
| B append | `verify_recording_generation_append.sh`, 219개; W05만 승인된 finalize+hold 성공 의미로 변경 | pass |
| B checkpoint | `verify_recording_generation_checkpoint.sh`, 133개 | pass |
| 소비자 연결 | `verify_recording_consumer_connection.sh`, 22개 | pass |
| 파생 작업 | `verify_recording_derived_jobs.sh`, 23개 | pass |
| 실제 파생 생성 | `verify_recording_derived_job_service.sh`, 43개 | pass |
| 보존 영향 | `verify_recording_retention_v2.sh`, GST22개·off2개, 기존 V1 저장 backend 영향 회귀 | pass |
| Runtime 집중 | `verify_recording_runtime_generation.sh`, 33개; 지원 실제 archive·전환·중단 복구·공개 status | pass |
| 실제 기본 구성 | `verify_recording_default_composition.sh`, 46개; 실제 로컬 source/writer·2출력 decode·재시작 복구 | pass |
| 제품 빌드 | `./server.sh build`, 소비자 변경 뒤·최종 runtime 변경 뒤 각 exit0 | pass |

메인은 Catalog→Journal→SQL의 잠금/최종 권위 검사, durable 뒤 실패의 poison,
temporary SQL 실패 rollback과 동일 owner 재시도, startup 전환 뒤 fresh owner를 직접 대조했다.
실제 application은 Storage.Open 성공 뒤에만 writer/retention의 참조를 얻으므로 교체 전 객체의
외부 참조를 남기지 않는다. 공개 status는 기존 enum·degraded 의미를 유지하며 auth/scope는 변경하지 않았다.
최종 focused 원출력의 제품·검사 SHA와 현재 source 일치를 확인했다.

기본 구성의 `file evidence unavailable: file evidence profile/bound 오류`는 이 격리 입력의
파일 구간 증거 부재 진단이다. 이를 증거 생성 PASS로 바꾸지 않는다. 해당 검사는 별도의
원본 샘플 연결/실제 출력 decode oracle로 통과했으며 실제 앱 증거 생성은 원래8번에서 확인한다.

## 최초 실패와 검증 한계

| 실행 | 실제 결과 | 이후 조치 |
| --- | --- | --- |
| 소비자 최초 | fixture 함수명 compile 실패(exit1) | fixture 함수명만 수정, 예상 RED 아님 |
| 소비자 RED | finalize+hold 기존 미연결 거부(exit1·1 FAIL) | 사전 정의한 제품 연결 구현 |
| 소비자 초기 GREEN | 지원 조합89개 PASS 뒤 crypto-off fixture compile 실패(exit1) | 지원 분기 안으로 fixture 사용 이동 |
| 소비자 보완 | 116 PASS 뒤 독립 retention/tombstone 반례 추가 | 최종118 PASS; 과거 결과는 별도 보존 |
| Runtime RED | B 기본 선택 assertion 1 FAIL(exit1) | 기본 구성 연결 후 최종33 PASS |

| 미실행/제외 | 수행내용 | 사유 | 완료 evidence로 사용할 수 없는 경계 |
| --- | --- | --- | --- |
| 전체 미지원 서버 빌드 | crypto/backend-off 전체 runtime 빌드 | 이 단위는 해당 핵심 저장 조합 실행과 기존 V1 분기 직접 대조. 전체 optional 서버를 빌드하지 않음 | core 조합 PASS를 전체 서버 플랫폼 PASS로 확대하지 않음 |
| 실제 HTTP·누적 비용 | 원래8번 | 현행 검증기 연결 선행 | 867개로 HTTP4초·누적 RAM/저장량을 주장하지 않음 |
| 30분·UI·120분 | 원래9번 이후 확정 대상 | 고정 코드·기존 증거 영향 판정 전 | 장시간/실제 UI PASS 아님 |
| 외부 서비스·실기기 | 사용자 제외 | 실행 안 함 | PASS 아님 |

## 정리·증적

소유 fixture15개는 원출력의 경로·삭제 전 크기와 현재 부재를 대조했다.
상세 전수는 실행 목록의 `cleanup`이다. 새 실제 서버나 HTTP listener·계정은 생성하지 않았다.
제품 archive/executable은 다음 단기 통합에 필요한 빌드 산출물로 유지한다.
원로그18개는 비밀/원문 URL 없음 확인 후 gzip으로 보존하고 inode/uid/hash 재대조 뒤 제거한다.
소비자/Runtime 시작·종료 시각과 기존 runner elapsed는 각 로그 그대로 보존하며,
시각이 없는 빌드의 elapsed와 token start/end/consumed는 실제 집계 source 없어 미집계다.

최종 정적 검사: 문서 링크13,611개·오류0, 문서 자산10 PASS, 인벤토리986행·18그룹 PASS,
`git diff --check` exit0. [정적 원출력·정리](static-manifest.json)와
[개별 결과](static-individual-results.json.gz)를 보존했다. 기존986개 행은 HEAD와 동일하며
검증 manifest는 전체 inventory 파일 SHA 한 값만 재결속했다. 사전 점검 도우미의 반환
필드 오기(`valid`/실제 `ok`)는 바로잡아 실제 검증기를 실행했으며 제품/검증 oracle 변경은 없다.
실행18개·정적3개 원로그를 압축 내용/hash/소유권 대조 후 정확한 경로만 삭제했고 현재 부재를 확인했다.
