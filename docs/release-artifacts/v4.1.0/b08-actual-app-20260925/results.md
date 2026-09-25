# B-08 실제 앱 단기 관측·통합 기록

독자: v4.1.0 녹화 검증 담당자. 수명: 이번 실제 앱 실행 이력.
정책은 AGENTS.md, 실행 전 정의는 중앙 테스트 기록 B08-H01/I01을 따른다.

## B08-Q01~Q04 실행 전 등록

현행 5단계의 재기동 후 타임라인 HTTP 4초 초과를 계측했다. 해당 요청 안에서
동일 archive의 전체 검증이 반복되는지 집중 검사한다. Q01의 구현 전 예상 RED는
같은 요청의 전체 읽기 2회(기대 1회)이며 컴파일·환경 실패는 예상 RED가 아니다.
Q02는 새 요청·복사·재개방·active 변경·예산 소진, Q03은 동일 크기 변조·행 변경·
파일 교체·소유권, Q04는 Catalog 소비자·hold·삭제·기존 지원 구성을 각각 독립
판정한다. 이 등록은 실행 결과가 아니며 Q01~Q04의 실제 결과·원출력은 실행 뒤
추가한다. 실패한 실제 앱 검증의 기준 4초는 유지한다.

## 최초 실행과 원인 경계

B08-Q01~Q04의 최종 집중 검사는 네 구성에서 개별 [52개 결과](request-proof-items.md)가
모두 통과했다. 이는 요청 내 archive 전체 재읽기 2→1회와 안전 반례의 단기
증거일 뿐, 실제 HTTP·현행 통합 PASS는 아니다. 실행 중 발견한 오류도 보존한다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| B08-Q fixture 준비 | Complete 상태의 정리 시각 누락 | fail | exit2, 제품 미실행. [원출력](b08-request-proof-red.log) |
| B08-Q 예상 RED | fixture 수정 후 같은 요청의 전체 archive 읽기 | fail | exit1, 실제 2회·기대 1회. [원출력](b08-request-proof-red-fixture-fixed.log) |
| B08-Q 초안 | B 원장 proof 저장 경계 | fail | exit1, 기존 provenance 판정이 B 링크에 적용되지 않아 미보관. [원출력](b08-request-proof-green-initial.log) |
| B08-Q 좁은 보완 | B provenance 결박 뒤 단기 검사 | pass | exit0, 당시 초안 4개. [원출력](b08-request-proof-green-provenance.log) |
| B08-Q 반례 준비 | 동적 검사 제목의 인자 타입 | fail | exit1, 컴파일 단계·제품 미실행. [원출력](b08-request-proof-boundaries.log) |
| B08-Q 예산 반례 | B 링크의 논리 charge 0을 확인 | fail | exit1, 0 예산에서 증거가 남는 결함. [원출력](b08-request-proof-boundaries-fixed.log) |
| B08-Q 예산·회전 보완 | 요청 예산과 정상 append·회전·재개방 | pass | exit0, 당시 44개. [원출력](b08-request-proof-budget-rotation.log) |
| B08-Q 최종 집중 | 두 지원·두 비지원 구성, FD·소유·변조·hold | pass | exit0, 52/52·격리 root 33,945,516B 정리. [원출력](b08-request-proof-final.log) |

위 8회 모두 실행기가 소유한 fixture만 정리하고 `removed=true`를 출력했다.
각 임시 로그는 저장소 사본과 byte 대조 후 삭제했다. token start/end/consumed는
전용 집계가 없어 미집계이며 source는 로컬 명령 원출력이다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| B08-H01 첫 실행 | 현재 코드의 `--app-observe`; 로컬 H264 fixture 준비 → 실제 앱 HTTP/보존 | fail | 준비 명령 `gst-launch-1.0`이 30,000ms 뒤 ETIMEDOUT/SIGTERM. 출력 파일 없음, 앱 기동 0회·HTTP 미실행. [원출력](b08-app-observe-first.log) |
| B08-H01 권한 조정 재실행 | 같은 `--app-observe`; 준비·실제 앱 상태 HTTP·자원·종료 | pass | exit0, 개별 73/73, 실제 30,229ms 관측·성공 HTTP 최대 1,323ms·서버/포트 정리. 장시간 자원 추세는 미판정. [원출력](b08-app-observe-escalated.log) |
| B08-I01 최초 실제 통합 | 현행 5단계; HTTP/auth 선수 조건 | fail | API 35개 후 auth 임시값으로 `/ops/api/users` 400. 응답 원문이 보존되지 않아 400의 세부 사유는 확정하지 않음. 뒤 단계 미실행·정리 완료. [원출력](b08-current-integration-auth-fail.log) |
| B08-I01 인증 fixture RED | 임시 비밀번호가 제품 정책의 반복·연속 패턴을 피하도록 요구 | fail | 새 assertion 1개 예상 RED, 나머지 20개 통과. [원출력](b08-auth-policy-red.log) |
| B08-I01 인증 fixture GREEN | 요청마다 128비트 난수와 정책 안전 형태로 임시값 생성 | pass | exit0, 21/21. 실제 제품·계정 정책 변경 없음. [원출력](b08-auth-policy-green.log) |
| B08-I01 재실행 | API·auth·lifecycle·default·actual-app 순차 | fail | 첫 네 단계 통과, actual-app 첫 기동의 완전 출력 2개·HTTP200·파일 hash 통과. 두 번째 기동 첫 타임라인 GET은 4,001ms에 header timeout; 뒤 검증 중단, 양쪽 서버 exit0·포트와 root 정리. [원출력](b08-current-integration-restart-timeout.log) |
| B08-I01 원장 증거 보완 뒤 | 같은 5단계, 같은 HTTP 4초 기준 | fail | 첫 네 단계와 두 번째 기동 첫 타임라인 1,121ms·보존 영상 2건 HTTP200까지 통과. 이후 검증기 live root 관측 중 SQLite 임시 journal의 목록화→`lstat` 사이 삭제로 ENOENT. 양쪽 서버 exit0·포트/root 정리. 두 번째 기동 새 출력은 미검증. [원출력](b08-current-integration-proof-fixed.log) |

이 새 실패의 대상은 격리 저장소의 `recording-generation-catalog.sqlite3-journal`이며,
제품 요청 오류나 4초 초과가 아니다. `verify_recording_current_app.mjs`의 비원자
용량 `scan(root)`가 디렉터리 목록 다음 각 파일에 `lstat`를 수행하는 사이
SQLite 트랜잭션 임시 파일이 사라졌다. 같은 코드의 엄격 archive hash 경로는
대상 파일 부재를 계속 실패로 처리한다. B08-I02는 비원자 관측의 정확한
임시 파일 경쟁만 허용하고 일반 파일 부재·용량 상한을 유지하도록 등록했다.

| 제목 | 테스트내용 | pass/fail | 비고 |
| --- | --- | --- | --- |
| B08-I02 예상 RED | 정확한 임시 journal ENOENT와 일반 파일·권한 오류 구분 | fail | exit1, 예상 assertion 실패·fixture 7B 정리. [원출력](b08-i02-root-scan-red.log) |
| B08-I02 집중 GREEN | exact journal만 비원자 관측에서 부재로 계상, 다른 오류·448MiB 경계 유지 | pass | exit0, 9/9·fixture 34,211B 정리. [원출력](b08-i02-root-scan-green.log) |
| B08-I02 기존 관측기 회귀 | 실제 native 관측기 67개 | pass | `--self-test` exit0, 67/67·root 11,646,103B 정리. 내부 20MiB 단발 native 진단은 자체 3초 제한으로 ETIMEDOUT을 기록했으나 별도 bounded normalization assertion은 통과; 이를 native 규모 PASS로 사용하지 않음. [원출력](b08-i02-observer-self-test.log) |
| B08-I02 최종 집중 | journal의 정확한 ENOENT와 일반 파일·권한 오류 구분 | pass | 보완 뒤 exit0, 9/9·격리 root 정리. [원출력](b08-i02-root-scan-final.log) · 별도 통합 자체검사 54/54 [원출력](b08-current-integration-contract-final.log); JS 구문 검사·공백 검사 통과. |
| B08-I01 최종 실제 통합 | 기존 4초 기준의 현행 API→auth→lifecycle→default→actual-app 5단계 | pass | exit0, 35+40+10+46+27개; 두 기동에서 각각 새 출력 2개·HTTP200·소유 파일 hash, 기존 출력 2개 보존, 동일 축 증거·복구·종료 확인. 실제 timeline 114회 최대 3,717ms, media 6회 최대 760ms. 서버 2개 exit0·포트 4개 해제·격리 root 부재. [27개 개별 결과](integration-items.md) · [원출력](b08-current-integration-i02-fixed.log) |

기존 `recording_current_observer.test.mjs`를 fixture root 인자 없이 직접 호출한
명령은 exit1 `ERR_INVALID_ARG_TYPE` 준비 오류였다. 원출력을 별도 파일로 보존하지
못했으며 제품 테스트가 실행된 것으로 보지 않는다. 지정 wrapper인
`verify_recording_current_observer.sh --self-test`로 위 회귀를 수행했다.

두 번째 기동의 [지연 원출력](../s11-preparation-mapping/latency-83e1acd8-5f57-416b-a27c-8da348ffb245.json)은
`QueryTimeline` 약 4.897초, snapshot 약 0.967초, finalize 약 3.921초다.
finalize 중 기록 획득 9회 약 1.892초와 기록 검증 12회 약 1.882초를
분리했다. 코드 대조에서 한 요청의 기존 작업 증거를 다시 얻을 때마다
전체 archive의 hash 검증으로 돌아가는 경로를 확인했다. B08-Q01~Q04의
요청 한정 증거 재사용은 이 구간만 보완하며 HTTP 4초 기준을 변경하지 않는다.
이후 B08-I02 보완 후 같은 현행 5단계를 다시 실행해 실제 통합은 통과했다.
최종 응답의 `currentIntegrationExecutionPass=true`는 이 5단계에 한정된다.
별도 모드 전용 `latencyPass=false`, `boundaryDiagnosticPass=false`, terminal 관측 전용
`fullOutputPass=false`를 최종 통합의 실패로 혼동하거나 장시간·UI 완료로 승격하지 않는다.
완전 출력은 전체 페이지·실제 파일·HTTP·hash의 별도 27개 검사에서 확인했다.
수정 후 장시간 자원 추세와 30분·실제 UI·120분은 이번 실행에서 미확인이다.

고정 30초 한도를 늘리거나 제품 HTTP 실패로 바꾸지 않는다. stderr 494B의
비민감 분류는 macOS 서비스 연결 오류(`macosService=true`)이며 원문은
증거·대화에 복사하지 않았다. 2026-09-04 동일 환경의 새 GStreamer registry
검색이 sandbox에서 시간초과되고 권한 조정 실행에서는 통과한 이력은
`docs/release-test-records.md`의 PKG-01에 있다. 이번 실행 원인과의 동일성은
권한을 조정한 **같은 단기 검사** 결과로 판정한다. 준비 실패 시 서버·포트는
시작하지 않았으며 제품 판정은 미실행이다. 후속 5단계 통합은 이 단계 통과 전
실행하지 않는다.

## 임시 자료·한계

첫 실행의 임시 root는 소유 UID·device·inode를 기록했고, 실패 보존 당시
9,819,508B였다. fixture media·제품 journal은 0B, 도구·캐시뿐이다.
서버 기동 0, 프로세스 종료 미해결 0, `lsof +D` 열린 FD 0을 확인했다.
원출력 보존과 소유권 확인 뒤 정확한 root를 정리했고 부재를 확인했다.
후속 두 실제 앱 실행도 각각 도구 기록에서 서버 exit0·포트 해제·root 부재를 확인했다.
token start/end/consumed는
전용 집계기가 없어 미집계(`source=로컬 명령 원출력`)다.
