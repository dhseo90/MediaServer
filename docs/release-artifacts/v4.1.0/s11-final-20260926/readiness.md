# v4.1.0 S11 실행 중단 및 릴리즈 잔여 전수 판정

독자: v4.1.0 검증·릴리즈 담당자. 수명: 녹화 UI 실패의 원인 확인 및 S11 최종 판정까지.
정책 source-of-truth는 `AGENTS.md`다. 이 문서는 2026-09-26의 직접 관측과
후속 제안을 분리하며, 미완료 단계를 PASS로 만들지 않는다.

**B10 재개 상태:** 아래 전수표는 최초 중단 시점의 이력이다. 이후 사용자 승인 순서는
준비 보완→I30 집중→31 action→녹화120분→S11 마감이다.
현재 준비 보완의 6+21+11개 검사는 통과했고 [결과](b10-ui-prep.md)에 전수 기록했다.
이전 인앱 renderer 충돌은 로그로 확인됐고 빈 탭 목록으로 cleanup을 확인했다.
구체적인 renderer 내부 원인은 미확정이며, I30 제품 결함은 입증되지 않았다.
기존 차단된 인증 파일에 접근하지 않고 새 격리 계정의 메모리 전달 경로를 구현했다.
실제 I30·31 action·120분은 이 준비 PASS로 대체하지 않는다.

## 지시 전수

| 번호 | 사용자 지시 | 처리 상태 | 결과 | 근거 |
| --- | --- | --- | --- | --- |
| 1 | S11 영향 판정·30분·실제 UI 순차 실행 | 일부 완료 | 30분과 공통 UI 424개 PASS, 녹화 UI는 탭 충돌로 미완료 | [실행 결과](results.md), [녹화 UI 시도](recording-ui-attempt.md) |
| 2 | 녹화 전용 120분·자원 판정 | 건너뜀 | 1번 필수 UI gate 실패 뒤 단계이므로 미실행 | [실행 결과](results.md), `AGENTS.md` 3.1·8 |
| 3 | 단계별 분할 커밋 | 일부 완료 | 통과한 주석·30분·공통 UI 증거 3커밋. 실패 단계 기록은 미커밋 | Git `09173a69`, `5aed4af1`, `4fc1b768`; `git status` |
| 4 | 가능 시 최종 푸시 | 미수행 | 실패 단계와 미커밋 기록이 있어 불가. 원격 대비 3커밋 앞섬 | `git status --short --branch`, `AGENTS.md` 5.2 |
| 5 | 종합 보고·릴리즈까지 잔여 산정 | 진행 | 이 문서의 근거별 표와 아래 순서 | 이 문서 |

## 기준 대조

| 항목 | 기준 값 | 직접 확인 결과 | 근거 |
| --- | --- | --- | --- |
| 브랜치·버전 | `v4.1.0`·`4.1.0` | 일치 | `git branch --show-current`, `VERSION`, `CMakeLists.txt:3` |
| 커밋·원격 | S11 성공 범위만 커밋, 푸시 전 clean·gate | HEAD `4fc1b768`, upstream 대비 ahead 3/behind 0, 실패·잔여 기록 6파일 미커밋 | `git log -4`, `git status`, `git rev-list --left-right --count HEAD...@{upstream}` |
| 단기 gate | 현재 코드 build·인증·미디어·문서 | B09-F01 당시 통과; 이번 최종 소스의 주석 외 제품 변경 없음 | [B09 결과](../b09-final-short-20260926/results.md), [30분 결과](results.md) |
| 30분 | 실제 30분과 정리 | 2,437초·20회·109 PASS/0 FAIL, 외부 TURN 1건 제외 | [전수](predev-30-items.md), [원출력](predev-30.log.gz) |
| 실제 UI | 현재 버전 424+녹화 8 ID·31 action | 공통 424/424 적격; 녹화 31 action은 부분 관측 뒤 탭 충돌 | [공통 전수](ui-baseline-items.md), [녹화 시도](recording-ui-attempt.md) |
| 120분 | 녹화 전용·자원 증거 | 이번 미실행; 과거 공통 120분은 이전 바이너리·녹화 비활성 범위 | [과거 공통 결과](../s11-recording-ui-20260923/common-120-pass.md) |

## 로드맵 대조

| roadmap 항목 | 문서상 상태 | 직접 확인 상태 | 불일치 여부 | 근거 |
| --- | --- | --- | --- | --- |
| S10 | 제품 코드 고정·증거 연결 이력 | B09 단기 PASS 기록과 현재 버전 확인; 이번 턴 제품 변경 없음 | 없음 | [로드맵](../../../v410-v49-recording-search-roadmap.md), [B09](../b09-final-short-20260926/results.md) |
| S11 30분 | PASS | 실제 109/109 실행 PASS | 없음 | [결과](results.md) |
| S11 UI | 공통 PASS·녹화 미완료 | 공통 424 PASS, 녹화 탭 충돌·전체 미완료 | 없음 | [결과](results.md), [실패](recording-ui-attempt.md) |
| S11 120분·릴리즈 | 미완료 | 이번 녹화 120분 미실행, 외부 release action 미승인 | 없음 | [로드맵](../../../v410-v49-recording-search-roadmap.md), [결과](results.md) |

## 구현·검증 연결 대조

| 확인 대상 | 실제 파일·route·함수·API·UI·verifier | 확인 결과 | 근거 |
| --- | --- | --- | --- |
| 녹화 API | `src/ingress/webrtc_http_server_runtime.cpp`의 `/ops/api/recordings/status`, `/timeline`, `/media/` | route 구현 위치 확인; 이 표는 동작 PASS가 아님 | 해당 소스 766~771행 |
| 녹화 UI 정의 | `docs/manual-ui-result-template.md`의 V410-S06-I27~I34 | 8 ID·31 action 등록 확인 | [정의](../../../manual-ui-result-template.md) |
| 녹화 UI fixture | `scripts/internal/verify_v410_recording_ui_contract.mjs`의 `--ui-direct`, `--ui-auth-direct` | 격리 fixture 실행·종료; 자체 `actualUiPass=false` | [실패](recording-ui-attempt.md) |
| 브라우저 공통 검사 | `./test_ui.sh` | source `5aed4af1`에서 424/424·Policy v4 적격 | [전수](ui-baseline-items.md), [원증거](ui-baseline-full.tar.xz) |
| 녹화 장시간 | `./server.sh verify-v410-recording-longrun --duration-minutes 120` | 명령 연결 확인, 이번 미실행 | `server.sh:1249,3235`, [결과](results.md) |

## 근거 분류

| 항목 | 근거 유형 | 근거 | 릴리즈 영향 |
| --- | --- | --- | --- |
| 30분·공통 UI 통과 | 프로젝트 직접 확인 | 현재 실행의 exit·개별 결과·적격·정리 원장 | 해당 범위는 유지 가능; 녹화 UI로 확대 불가 |
| 녹화 UI 탭 충돌 | 프로젝트 직접 확인 | 인앱 탭 `This page crashed`, 동시 제품 HTTP 200 | 원인은 미확정, 전체 UI blocker |
| 기존 공통 120분의 범위 한정 | 프로젝트 직접 확인+추론/제안 | 이전 바이너리 SHA·녹화 비활성 기록과 현재 변경 대조 | 현재 녹화120분 PASS로 승계 불가 |
| 실패 뒤 단계 중단·미커밋 | AGENTS 직접 규칙 | 3.1·5.2·8 | 120분·푸시 중단 |
| 외부 서비스·실기기 제외 | 사용자 직접 지시 | 이번 버전 대화 지시 | 제외 기록만, PASS 주장 금지 |

## 테스트 필요성

| 테스트 카테고리 | 판정 | 직접 근거 | 근거 파일·행·기능 ID | 실행 승인 상태 |
| --- | --- | --- | --- | --- |
| 안정화 | 진행 대상 | B09 최종 단기·현재 30분 통합 | B09-F01·[결과](results.md) | 승인·통과 이력 확인 |
| 30분 | 진행 대상 | 사용자 1번·S11 필수 | [전수](predev-30-items.md) | 승인·PASS |
| 공통 UI 424 | 진행 대상 | 최종 소스 증거 교차 | [전수](ui-baseline-items.md) | 승인·PASS |
| 녹화 UI 8 ID·31 action | 진행 대상 | 신규 UI 및 버전 필수 | [정의](../../../manual-ui-result-template.md), [실패](recording-ui-attempt.md) | 승인·일부 실행·미완료 |
| 녹화 120분·자원 | 진행 대상 | 사용자 2번·직접 저장 변경 | `server.sh:1249,3235`, [결과](results.md) | 승인됐으나 선행 실패로 미실행 |
| 공통 120분 재실행 | 미확인 | 기존 실행은 이전 바이너리; 현행 변경 영향별 승계 판정 필요 | [기존 결과](../s11-recording-ui-20260923/common-120-pass.md) | 이번 신규 재실행 승인/필요성 미확정 |
| 외부 서비스·실기기 | 미진행 | 사용자 명시 제외 | `AGENTS.md` 7.6 | 실행하지 않음 |

## 릴리즈 전 개발·판정 순서

| 순서 | 우선순위 | 잔여 이슈 | 해야 할 일·완료 기준 | 성격 | 근거 유형 | release action 전·후 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | P0 | 브라우저 탭 충돌 원인 확정·cleanup | 저장 가능한 최소 브라우저 진단으로 native control/renderer/제품 자원 경계를 구분. 충돌 탭 종료 여부를 확인하고, 동일 실패를 근거 없이 반복하지 않음 | 원인 분석·필요 시 한정 수정 | 직접 확인+추론/제안 | 전 |
| 2 | P0 | 녹화 UI 전체 적격 | 보안 정책을 우회하지 않는 인증 수단에서 I27~I34 31 action, 영상 재생·정지·탐색/Range, 4 viewport×2 theme, 역할·scope를 실제 브라우저 조작·시각/trace로 확인. 기존 424는 변경 영향만 재판정 | UI 검증·필요 시 수정 | 직접 확인+AGENTS 규칙 | 전 |
| 3 | P0 | 녹화 120분·자원 판정 | 2번 통과 뒤 현행 코드로 120분·보존/복구/삭제/용량/지연 추세와 cleanup을 개별 기록. 과거 공통 120분은 불변 영역만 별도 승계 판정 | 장시간 검증 | 직접 확인+사용자 승인 | 전 |
| 4 | P0 | S11 증거·로컬 release gate 마감 | 실패 이력·증거 유효성·문서/버전/빌드/인증/미디어/정리 대조, 필요 범위 검증 후 단계별 커밋과 조건 충족 시 푸시 | 검증·기록·개발 브랜치 마감 | AGENTS 직접 규칙 | 전 |
| 5 | P0 | 외부 release action | 별도 승인·필수 gate 뒤 PR→check→main 병합→서명 tag→GitHub Release→published 확인 | 외부 변경 | AGENTS 직접 규칙 | 후 |

## 미해소·승인 경계

| 항목 | 상태 | 사유 | 완료 evidence 사용 가능 여부 | 다음 조건 |
| --- | --- | --- | --- | --- |
| 녹화 UI·전체 432 | 미완료 | I30에서 탭 충돌, 저장소 screenshot/trace 없음, I31~I34 미실행 | 불가 | 원인 구분·안전한 실제 브라우저 전체 적격 |
| 인증 fixture | 미실행 | 임시 자격증명 파일의 브라우저 접근이 보안 정책에 차단; 우회하지 않음 | 불가 | 정책을 충족하는 안전한 실제 로그인 경로 |
| 충돌 탭 정리 | 미확인 | 탭 닫기 호출도 브라우저 정책 차단; 서버·포트·fixture는 정리됨 | 전체 cleanup PASS 불가 | 탭 종료/자동 정리 직접 확인 |
| 녹화 120분·자원 | 미실행 | 선행 UI 실패 | 불가 | 1번 gate 해결 후 승인된 동일 범위 실행 |
| 공통 120분 현행 전체 승계 | 미확인 | 과거 바이너리·녹화 비활성 | 녹화 자원 증거 불가 | 현행 diff와 공통 경계 분리 판정 |
| 실패 단계 문서·푸시 | 미커밋·미푸시 | 미해결 실패 및 미커밋 변경 | 릴리즈 완료 증거 불가 | 관련 gate 통과·기록 정합·clean 확인 |
| PR·병합·tag·Release | 미승인 | 각각 별도 승인 대상 | 불가 | 선행 필수 gate 후 명시 승인 |
| 외부 서비스·실기기 | 사용자 제외 | 이번 릴리즈에서 실행하지 않음 | 외부 PASS 불가 | 추가 작업 대상에서 제외 |
