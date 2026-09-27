# B12 S11 최종 로컬 게이트

- 독자: v4.1.0 릴리즈 검토자와 재감사 담당자
- 수명: v4.1.0 historical 실행 기록
- source-of-truth 관계: 정책은 `AGENTS.md`, 전수 결과는 `docs/release-test-records.md`를 따르며 이 문서는 B12 실행의 실패·재검증 근거를 보존한다.

## 범위와 제외

순서는 build → 현행 녹화 5단계 → auth bootstrap/users/routes → GStreamer 환경 →
기능·스크립트 inventory → 문서·버전·release evidence → close-out dry-run이다.
현재 diff가 RTSP/WebRTC codec·ICE 경로를 바꾸지 않아 기존 HW-03 증거는 재실행하지 않는다.
이미 통과한 30분·녹화 UI·녹화 120분도 다시 실행하지 않는다. 외부 서비스·실기기와
PR·병합·tag·GitHub Release는 사용자 제외 또는 미승인 범위다.

## 인증 사용자 검증의 실패·보완·재검증

| 제목 | 수행내용 | 결과(pass/fail) | 비고 |
| --- | --- | --- | --- |
| AUTH-B12-01 최초 실행 | `./server.sh verify-auth-users`; 사용자 생성 첫 POST 전까지 9개 통과 | fail | 포괄 `인증 HTTP transport 실패`만 남아 상태 분류 불가. 정상 종료·root 삭제 |
| AUTH-B12-02 안전 진단 RED | 가짜 curl HTTP400·connect 오류가 안전 분류를 남겨야 함 | fail | 17/18, 신규 assertion만 예상대로 실패 |
| AUTH-B12-03 안전 진단 GREEN | 원문 URL/token을 버리고 `http-NNN` 또는 allowlist 전송 종류만 기록 | pass | 자체검사 18/18, 비밀 marker 미노출 |
| AUTH-B12-04 두 번째 실제 실행 | 사용자 생성·reset 뒤 비밀번호 변경 POST까지 진행 | fail | 첫 실패는 미재현. 실제 상태를 잃는 `expect_eq` 경계에서 중단, 정상 종료·root 삭제 |
| AUTH-B12-05 상태 경계 자체검사 | 3자리 실제/예상 상태만 기록하고 그 외 입력은 `invalid` | pass | 테스트 double 준비 오류 1회 정정 뒤 19/19, shell syntax·diffcheck 통과 |
| AUTH-B12-06 최종 실제 실행 | 동일 `verify-auth-users` | pass | 72/72, 비밀번호 생성·scope·reset·history·invite·access request, 정상 종료·root 삭제 |

최초 두 실패는 서로 다른 경계였고 최종 실행에서는 모두 재현되지 않았다. 따라서 제품
결함이나 해결 완료로 단정하지 않는다. 재발 시에는 비밀 원문 없이 HTTP 상태 또는 전송
종류를 보존하므로 같은 포괄 실패를 반복하지 않는다. timeout·제품 인증 정책·API·payload는
변경하지 않았다.

## 원출력과 무결성

| 파일 | SHA-256 | 크기 | 내용 |
| --- | --- | ---: | --- |
| `b12-auth-users-attempt1.log.gz` | `1217610891136d651364a9748947fd2e1cd7228512699efba6a741fbf694cb6e` | 499B | 최초 전송 포괄 실패 |
| `b12-auth-users-attempt2.log.gz` | `396a5a4d93f0ebb60049c67b798957ba5225a9f5ef04ec90fd7f2756e6f26181` | 688B | 비밀번호 변경 assertion 실패 |
| `b12-auth-users-pass.log.gz` | `4383ef9c18aebaefe8e48e77438055bb239da8408f5189ebe6acfc6c61602add` | 1,403B | 최종 72/72 PASS |

원문에는 비밀번호·token·응답 body가 없다. 실행 소유 auth root는 세 실행 모두 삭제되어
부재하며 HTTP/RTSP 포트도 종료됐다. `/private/tmp` 원출력은 이관 무결성 확인 뒤 정리한다.

## 현재 상태

build, 현행 녹화 5단계, auth bootstrap과 auth users까지 실행됐다. auth routes 이후 단계는
아직 미실행이므로 B12 전체와 S11 로컬 게이트는 완료가 아니다.
