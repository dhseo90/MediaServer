# v4.1.0 S11 현행 결과 및 릴리즈 잔여 전수 판정

독자: v4.1.0 검증·릴리즈 담당자. 수명: 녹화 UI 실패의 원인 확인 및 S11 최종 판정까지.
정책 source-of-truth는 `AGENTS.md`다. 이 문서는 2026-09-26의 직접 관측과
후속 제안을 분리하며, 미완료 단계를 PASS로 만들지 않는다.

## B10 현행 판정 — 녹화120분 첫 실행 이후

후속 사용자 승인으로 B11 계약→제품 저장/복구→관측 구조 보완과 분할 커밋에 착수했다.
현재 진행은 [B11 결과 절](results.md)을 따른다. 아래 B10 표는 실패 직후 판정이며,
새 제품/관측 개선이나120분 완료를 주장하지 않는다. 이번 새 범위에는 푸시를 포함하지 않는다.

현재 기준은 이 절이다. 그 아래 최초 중단 표는 당시 실패 이력으로 보존한다.
준비·I30·녹화UI31 action을 마쳤으나,120분 관측이18분48초에 실패하여
S11 마감과 푸시는 보류했다. 제품 코드는 이번 작업에서 변경하지 않았다.

### 1. 지시 전수

| 번호 | 사용자 지시 | 처리 상태 | 결과 | 근거 |
| --- | --- | --- | --- | --- |
| 1 | 안전한 UI 준비 | 완료·커밋 | driver6/6·UA/SF21/21·proxy11/11, 새 임시값 메모리 전달·정리 | [준비](b10-ui-prep.md),98df4acc |
| 2 | I30 집중 | 완료·커밋 | 실제 native 재생/정지/탐색3/3, 최초 탐색 실패 보존 | [I30](b10-i30.md),63cc1799 |
| 3 | 녹화 UI 전수 | 완료·커밋 |31/31·8개 화면조건·역할·메인 시각 적격, 전체432 ID | [UI](b10-ui.md),c60d5129 |
| 4 | 녹화120분·자원 | 실패 |18분48초 관측 native3초 timeout. 정상 종료·정리, 후속 read-only 진단1회 | [실행·원인](b10-longrun.md) |
| 5 | S11 최종 마감 | 건너뜀 | 필수120분·자원 판정 미충족 | AGENTS3.1·8 |
| 6 | 분할 커밋 | 승인 범위 중 통과 단계 수행 | 이번3커밋, 이전3커밋 유지. 실패 단계 기록 미커밋 | Git log/status |
| 7 | 가능하면 푸시 | 불가·미수행 |4번 실패 및 미커밋 실패 증거 | AGENTS5.2 |
| 8 | 종합보고·잔여 선정 | 수행 | 아래 근거·필요성·순서·미해소 표 | 이 문서 |

### 2. 기준 대조

| 항목 | 기준 값 | 직접 확인 결과 | 근거 |
| --- | --- | --- | --- |
| branch/VERSION/CMake/build metadata | v4.1.0/4.1.0 | 모두 일치 | VERSION·CMakeLists3·CMakeCache140 |
| 현재 source/binary | c60d5129·6c2149d4… | UI 최종과 녹화120분 동일 제품. 검증기·문서만 변경 | [provenance](b10-observer-input-manifest.json) |
| 원격 | branch/main 실제 hash | origin/v4.1.0=3bf07716,main=431397d9; 로컬6커밋 앞섬 | 이번 `git ls-remote --heads origin v4.1.0 main` exit0 |
| tag/공개 | 별도 승인·실행 | 로컬v4.1.0 tag 없음. 이번 remote tag/Release/CI 조회 미실행 | `git tag --list v4.1.0`; release action 미수행 |
| CHANGELOG/NEWS | 존재 시 반영 | 루트 제품 CHANGELOG/NEWS 없음. test fixture CHANGELOG는 공개 변경 이력 아님 | `rg --files` |
| 임시 정리 | 소유 프로세스·포트·파일 정리 | UI8개root 및 장시간root·로그사본 부재, 최소 원증거 보존 | [UI](b10-ui.md),[장시간](b10-longrun.md) |

### 3. 로드맵 대조

| roadmap 항목 | 문서상 상태 | 직접 확인 상태 | 불일치 여부 | 근거 |
| --- | --- | --- | --- | --- |
| S10/B안 | 구현·단기 통과 이력, 장시간 별도 | 새 장시간에서 삭제 상세의 현재 snapshot 누적 확인. 기존 단기 PASS를 장시간 보장으로 확대 불가 | 최신 상단에 실패·미해소 반영 | [로드맵](../../../v410-v49-recording-search-roadmap.md),[원인](b10-longrun.md) |
| S11 30분 | 현재 소스 PASS |20회109PASS·0FAIL | 없음 | [전수](predev-30-items.md) |
| S11 UI | baseline424+녹화8 ID 적격 | 실제424·31action, main 시각/권한·cleanup | 없음 | [baseline](ui-baseline-items.md),[녹화](b10-ui.md) |
| S11 120분·마감 | 미완료 | observer timeout·자원 미판정 | 없음 | [원출력](b10-recording-120.log.gz) |

### 4. 구현·실행 연결

| 확인 대상 | 실제 파일·route·함수·API·UI·verifier | 확인 결과 | 근거 |
| --- | --- | --- | --- |
| 녹화 실제 UI | `run_recording_ui_acceptance.mjs`,before/after helper,`/ops/events` I27~34 |31action·실제 native 조작·독립 응답·시각 대조 | [정의/결과](b10-ui.md) |
| 장시간 | `verify-v410-recording-longrun`→`verify_recording_current_longrun.mjs` |2채널 실제 원본1108개·삭제1102개 직전 관측, 이후 실패 | [전수1556행](b10-recording-120-items.json.gz) |
| 관측 지연 | `recording_current_observer.mjs:139`·`recording_generation_observation.h:73` |매 poll 새 자식·전체 snapshot/identity 파싱·재직렬화 | [지연표](b10-longrun.md) |
| 현재 snapshot | `recording_catalog.cpp:1719`, `recording_catalog_snapshot_export.cpp:115` |삭제 뒤 segment 유지+tombstone 보관, 양쪽 전체 출력 | [실제 kind 집계](b10-longrun.md) |
| 사후 입력 | 종료 후metadata88개·seen4422 |원본 불변·2.63초, 실패 순간 원본은 아님 | [진단](b10-observer-poststop.json),[manifest](b10-observer-input-manifest.json) |

### 5. 근거 분류

| 항목 | 근거 유형 | 근거 | 릴리즈 영향 |
| --- | --- | --- | --- |
|120분·정리·실패 후 중단 | AGENTS 직접 규칙 |3.3·5.2·7.6.2·7.8·8 |실패 상태 마감/푸시/릴리즈 불가 |
| 관측 native3초 실패·drain 증가 | 프로젝트 직접 확인 |원출력·코드·종료 뒤 1회 측정 |관측 구조 보완 필요 |
| 삭제 상세 중복·snapshot27.2MB | 프로젝트 직접 확인 |실제 kind/bytes 및 삭제/export 함수 |제품 현재 상태·cold 상세 경계 보완 필요 |
| snapshot94.5%가 segment/tombstone | 프로젝트 직접 확인+산술 |25,726,078/27,212,677 |관측기만의 한도 확대는 근본 해결 아님 |
| 저장 표현·관측 증분 보완 순서 | 추론/제안 |B안 계약과 실제 누적의 차이 |범위 확정 후 구현.이번 자동 실행 안 함 |
| 기존 공통120분 구성요소 한정 유지 | 프로젝트 직접 확인+메인 영향 판정 |d58d450e..c60d5129 diff |전체 현행 프로세스/녹화120분 PASS로 승계 불가 |

### 6. 테스트 필요성

| 테스트 카테고리 | 판정 | 직접 근거 | 근거 파일·행·기능 ID | 실행 승인 상태 |
| --- | --- | --- | --- | --- |
| 안정화 | 진행 대상 |현재 UI helper·기록 변경 |B10-U01~03, [UI 정적](b10-ui.md) |승인·관련 검사 통과; 제품 기존 B09 증거 유지 |
|30분 | 진행 대상 |S11 필수·명시 승인 |109개 전수·현재 동일 제품 |기존 현재PASS 유지. 다음 제품 diff에 따라 부분/전체 재판정 |
| 실제UI | 진행 대상 |현재432ID·Policy v4 |I27~34·424baseline |승인·적격. 실패로 자동 폐기하지 않음 |
| 녹화120분 | 진행 대상 |명시 지시·저장 변경 |B10-L01·S11 |승인 실행FAIL. 원인 범위 확정 전 반복 안 함 |
| 공통120분 전체 재실행 | 조건부 진행 |변경 없는 구성요소는 기존 결과 유지, 새 storage/lifecycle은 현재 증거 필요 |[승계 경계](b10-longrun.md) |이번 추가 전체 실행 안 함. 새 변경으로 미충족 경계가 생기면 재판정 |
| 외부 서비스·실기기 | 미진행 |사용자 명시 제외 |AGENTS7.6 |제외.후속 이슈로 다시 추가하지 않음 |

### 7. 릴리즈까지 잔여 순서

| 순서 | 우선순위 | 잔여 이슈 | 해야 할 일·완료 기준 | 성격 | 근거 유형 | release action 전·후 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | P0 | 현재 상태·삭제 증거 경계 확정 |삭제 상세를 현재 snapshot에 반복 보관하지 않되 ID충돌·삭제 판정·참조·재생/복구 의무 보존. 실제 mapping 크기의 반례·수용 기준 확정 |안전 설계·범위 확정 |직접 확인+제안 |전 |
| 2 | P0 | 제품 누적 상태 보완 |필요한 상세는 검증 가능한 cold 참조로 유지, 현재 상태·SQLite·checkpoint·복구에 일관 적용. 정상 append/회전의 과거 상세 전체 반복 제거 |제품 구현·집중 회귀 |B안 계약+직접 확인 |전 |
| 3 | P0 | 관측기의 증분 검증·누적 준비 |같은 원본·손상 거부·prefix/세대 결속 유지하며 전체 snapshot/identity 반복 제거.3초·32MiB·15초를 확대하지 않고 실제 실패 입력과 더 큰 상세 분포로 선행 판정 |검증기 개발·한정 검증 |직접 확인+제안 |전 |
| 4 | P0 | 영향 회귀·장시간 완료 |작은 반례→보존/손상/충돌/참조/SQLite fallback·재개방→실제 단기→승인된120분. HTTP4초·복구15초·자원/정리 확인.30분/UI는 diff 영향만 재판정 |검증 |AGENTS·로드맵 |전 |
| 5 | P0 | S11 증거·로컬 release 준비 마감 |실패 이력·source/환경·필수 실행 목록·문서/버전·source-only/출처·cleanup·최종gate 대조, 통과 변경 커밋·조건부push |기록·정리·로컬 마감 |AGENTS 직접 규칙 |전 |
| 6 | P0·별도 승인 | PR·CI·병합·공개 |각각 승인 후 PR/required check→main 대상확인→signed annotated tag/서명확인→Release/published검증 |외부 변경 |AGENTS4 |로컬gate 뒤·공개 전후 |

### 8. 미해소·권한 경계

| 항목 | 상태 | 사유 | 완료 evidence 사용 가능 여부 | 다음 조건 |
| --- | --- | --- | --- | --- |
| 관측 subphase CPU/IO |미확정 |전체 재처리 구조·시간 증가는 확인했으나 최초3초 초과 순간별기여는 없음 |제품 전체 병목 확정 근거 아님 |보존 입력에서 bounded 구간별 측정 |
| 현재 상태 상세 보관 |미해소 |segment/tombstone94.5%, 삭제 의무를 깨지 않는 cold 표현 필요 |완료 불가 |제품 저장 표현 보완 범위 확정 |
|120분·자원·재기동 |실패/뒤 검사 미실행 |18분48초 중단, 두번째/세번째기동 미실행 |불가 |앞선 구조/누적 판정 후 재실행 |
| 최초 인앱renderer |내부 원인 미확정·이력 보존 |exit5·탭cleanup확인, native fallback공개 |기존 충돌을 해결PASS로 쓰지 않음 |현재 실제native UI 적격 증거만 사용 |
| 커밋·푸시 |통과3단계커밋·원격6ahead, 실패기록미커밋 |실패 상태 AGENTS5.2 |전체완료 불가 |해당 실패 해결·gate·clean 뒤 승인 범위push |
| PR/CI/main/tag/Release |미실행·각별도승인 |개발브랜치push와 별개 |불가 |로컬필수gate 뒤 명시승인 |
| 외부 서비스/실기기 |사용자 제외 |이번 실행 안 함 |외부PASS 불가 |추가 작업 대상 아님 |

## 최초 중단 시점의 전수표 — 이력 보존

**B10 재개 당시:** 아래 전수표는 최초 중단 시점의 이력이다. 이후 사용자 승인 순서는
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
