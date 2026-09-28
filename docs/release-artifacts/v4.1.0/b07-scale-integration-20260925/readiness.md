# B안 요청1~9 대조와 릴리즈 잔여 판정

독자: v4.1.0 개발·릴리즈 판단 담당자. 수명:2026-09-25 현재 판정 기록.
정책은 AGENTS.md, 개별 실행은 중앙 테스트 기록과 [B07 결과](results.md)를 따른다.
이전 전수표는 당시 이력으로 보존한다. 이 표는 새 제품 삭제·장시간·release action 승인이 아니다.

## 지시 전수

| 번호 | 사용자 지시 | 처리 상태 | 결과 | 근거 |
| --- | --- | --- | --- | --- |
| 1 | 원래1 cut 동등성 고정 | 완료 | 계약·반례 확정 | `3ba32e44` |
| 2 | 원래2 복원 동등성 보완 | 완료 | strict 복원·현재 상태·충돌 보존 | `809413bd` |
| 3 | 원래3 B 공개 읽기·SQLite 연결 | 완료 | 현재 값 조회·typed 투영·fallback | `c59610c2` |
| 4 | 원래4 증분 append·세대 회전 | 완료 | 내구 전 검증·변경분 쓰기·과거 상세 재직렬화 분리 | `fdce369f`, `1062f5de`, `54eaba09` |
| 5 | 원래5 전환·receipt·중단 복구 | 완료 | 원본 보존 전환·소유 결박·새 owner 복구 | `e58ad5e3`~`dfe22712`, [B04 결과](../b04-generation-transaction-20260925/results.md) |
| 6 | 원래6 소비자 보호·B 기본 구성 | 완료 | pin/hold·예약·보존·기본 runtime·지원 구성 | `939826a5`, [867개·빌드](../b05-consumers-runtime-20260925/results.md) |
| 7 | 원래7 현행 verifier·관측 연결 | 완료 | 실제 B seed·복제본 Catalog·live reader·용량 분류·lifecycle SQL | `7b62c8ea`, [B06 결과](../b06-verifier-connection-20260925/results.md) |
| 8 | 원래8 누적 비용·실제 HTTP/통합 | 부분 완료 | 유한 누적 수치 PASS, 이전snapshot 누적·잠금 일부 미확인. 실제 앱 미실행 | [B07](results.md) |
| 9 | 원래9 코드 고정·최종 판정 | 보류 | 수명 계약과8번 미완료. 기존 장시간/UI 영향의 읽기 검토만 수행 | 아래 테스트 판정 |
| 10 | 분할 커밋 | 수행 | 위 완료 단위별 커밋. B07은 진단 단위만 마감 대상으로 구분 | Git·중앙 기록 |
| 11 | 푸시 가능 시 수행 | 불가·미수행 | 승인 범위의8/9 미완료. 중간 저장을 완료 푸시로 바꾸지 않음 | AGENTS5.2 |
| 12 | 릴리즈까지 잔여 재산정 | 완료 | 아래 성격·우선순위·미실행·제외 분리 | 이 문서 |
| 13 | 외부 서비스·실기기 제외 | 유지 | 실행·PASS로 계산하지 않음 | 사용자 명시 지시 |

## 기준

| 항목 | 기준 값 | 직접 확인 결과 | 근거 |
| --- | --- | --- | --- |
| branch/VERSION/CMake | v4.1.0/4.1.0/4.1.0 | 일치 | Git, VERSION, CMakeLists.txt:3 |
| 시작/완료 단위 HEAD | 개발 브랜치·분할 커밋 | 완료1~7 HEAD7b62c8ea. B07 진단은 별도 마감 | Git log |
| 원격 동기화 | 조건 충족 뒤 승인된 push | cached upstream 대비ahead46(이번 진단 커밋 전). 원격 최신 재조회·push 미실행 | git status, AGENTS5.2 |
| 릴리즈 태그 | 승인 후 서명 태그 | 로컬v4.1.0 없음. 원격 태그/CI는 미확인 | git tag --list v4.1.0 |
| 기존 실행 한도 | HTTP4초·관측15초/native3초·복구15초 | 변경 없음. B07 새 프로세스 Open 최대3.642306초·관측부모 최대1.550143초 | [B07 원출력](deleted-pass.log.gz) |
| 자원 상한 | 검증root448MiB·프로세스RSS1GiB | 측정 data191,782,928B·부모143,540,224B. 관측 자식 peak 미계측 | B07 결과 |

## 로드맵 대조

| roadmap 항목 | 문서상 상태 | 직접 확인 상태 | 불일치 여부 | 근거 |
| --- | --- | --- | --- | --- |
| S01~S08 | 기존 완료 이력 | B 변경 영향은 새 소비자·현행 검증에 연결, 과거 PASS 자동 승계 아님 | 현행 최종 증거 별도 | [로드맵](../../../v410-v49-recording-search-roadmap.md) |
| S09 | 종료·대체 | 실패 이력 유지 | 없음 | 같은 로드맵 |
| S10 | 과거 구현·고정 완료 | 이후S11 B 제품 변경으로 새 고정 필요 | 최신 상태 보완 | B05/B06·현재 로드맵 상단 |
| S11 | 일부 단기·장시간/UI 이력, 미완료 | B 누적 수명·실제 통합·최종 소스·녹화UI/120분 잔여 | 전체 완료 아님 | B07·기존 S11 기록 |
| v4.2.0 이후 | 장기 검색 방향 | 이번 릴리즈 구현 대상 아님 | 없음 | 사용자 범위 |

## 구현·검증 연결

| 확인 대상 | 실제 파일·route·함수·API·UI·verifier | 확인 결과 | 근거 |
| --- | --- | --- | --- |
| 새 저장·회전 | recording_journal.cpp:PublishGenerationCheckpoint | 새 snapshot/identity/active 게시 후 transaction 정리 | 코드 직접 확인 |
| 중단·정리 | recording_generation_transaction.cpp:Cleanup(true) | stage/receipt 정리이며 predecessor snapshot 회수 없음 | 코드·최종39개 snapshot |
| 기존 보존 검사 | recording_generation_checkpoint_smoke.cpp:B03-C01 | snapshot-2 보존도 oracle에 포함. 회수는 수명 계약 보완 필요 | 코드106행 |
| 현재 상태·재개방 | recording_generation_scale_probe.cpp:Current/ReopenWorker | 실제 Catalog·독립 expected hash·파일/삭제/사용량·SQLite/fallback | B07-S01/S02 |
| live 관측 | recording_generation_observation.h:Observe | B07에서는 file/index와synthetic Normalize만 실행. 실제 JS 경로 아님 | B07-S03·B06 |
| 실제 status/보존 | verify_recording_current_longrun.mjs, --app-observe | 현재B의 HTTP4초·관측15초·생산/삭제·재기동은 미실행 | B07-H01 정의 |
| 이벤트 통합 | recording_current_integration_suite.mjs | API35/auth40/lifecycle10/default46/실제앱27 실행 경로 존재. 현재B 전체 미실행 | B07-I01 정의 |
| 앱 공통 수명 | media_server_application.cpp:RecordingRuntimeStorage/Open·RecoverRuntimeRecordingAtStartup | recording_enabled=false에도 초기화/복구 수행. 비활성만으로 무영향 주장 불가 | 코드328~364행 |
| 녹화UI | product_ui_page_scripts.cpp·/ops/events | 기본424 이후 unknown 자동선택 제외·MP4 및 B backend 변경 있음 | 8fa98a99..HEAD diff·기존 I30 기록 |

## 근거 분류

| 항목 | 근거 유형 | 근거 | 릴리즈 영향 |
| --- | --- | --- | --- |
| 승인·실패 후 순서·push | AGENTS 직접 규칙 | 3·5·7·8장 | 미완료를 완료/push 가능으로 바꾸지 않음 |
| 누적 기준 통과·snapshot 잔존 | 프로젝트 직접 확인 | raw·최종manifest/파일stat·코드 | 수치 통과와 수명 문제를 구별 |
| 보관량 증가 위험 | 직접 확인+추론 | 입력 약2배에 snapshot총량 약3.84배·회수 경로 없음 | 장시간 저장 비용 해결 판정 보류. 아직 한도 초과로 관측한 것은 아님 |
| snapshot 회수 보완 | 추론/제안 | 현행/복구/독자 참조·소유권 대조 필요 | 정책 범위 선택 후 구현·반례 필요 |
| UI/30분/120분 | AGENTS 직접 규칙+직접 기록 | 7.6.2·과거 실행source와 변경diff | 유효성 재판정, 전체 자동 폐기/승계 금지 |

## 테스트 필요성 판정

| 테스트 카테고리 | 판정 | 직접 근거 | 근거 파일·행·기능 ID | 실행 승인 상태 |
| --- | --- | --- | --- | --- |
| 안정화: 누적 | 진행 대상 | 현재B공개경로·자원·삭제 재개방 | B07-S01~S03 | 이번 승인으로 수치 검사 실행 완료, 수명/진단은 미해소 |
| 안정화: HTTP/통합 | 진행 대상 | runtime 기본·소비자 변경 | B07-H01/I01, currentSteps5개 | 승인 있음, 선수 비용 미완료로 미실행 |
| 최종 단기 | 진행 대상 | 코드 고정 뒤 최종source 결속 | 원래9번·AGENTS4/7장 | 이번9번 범위, 선수 미완료로 미실행 |
| 30분 | 조건부 진행 | 이전109 PASS. 현재B초기화/복구 변경과 최종diff 대조 필요 | [30분](../s11-recording-ui-20260923/i30-mp4-revalidation.md), 앱328~364행 | 과거 승인/실행 이력. 이번B07 실행 아님 |
| 공통120분 | 조건부 진행 | 이전409 PASS·첫H264실패 보존. 같은실행binary와현행 차이 대조 필요 | [공통120분](../s11-recording-ui-20260923/common-120-pass.md) | 과거 승인 이력, 현재source 승계 미판정 |
| 녹화120분 | 진행 대상 | 현행 저장·복구·보존 변경, 과거3회FAIL·최종PASS 없음 | [이전 전수표](../s11-preparation-mapping/release-readiness-20260924.md), B07 | 과거 승인 이력, 현재 선수 미완료·미실행 |
| UI 풀테스트 | 진행 대상 | 기본424/visual80과 녹화31조작 별도. 수정 후 새source 적격 미완료 | [기본UI](../s11-preparation-mapping/lp31-ui-final-items.md), [녹화UI](../s11-recording-ui-20260923/README.md) | 기존 증거 보존. 현재영향범위·실행계획 미확정 |
| 외부 서비스·실기기 | 미진행 | 사용자 명시 제외 | 사용자 지시 | 제외·PASS 아님 |

## 재산정한 개발·릴리즈 순서

| 순서 | 우선순위 | 잔여 이슈 | 해야 할 일·완료 기준 | 성격 | 근거 유형 | release action 전·후 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | P0 | snapshot 수명 계약 | 현재·복구·사용 중/과거 증거 참조·소유권으로 회수 가능한 파일만 확정. 사용자 범위 판단 | 안전 설계·범위 선택 | 직접 확인+제안 | 전 |
| 2 | P0 | 승인된 최소 회수 보완 | 게시/SQL/receipt·실패/중단·재개방·unknown파일/독자 보호를 유지. 필요한 identity/active/원본 이력 보존 | 조건부 제품 개발·반례 | 제안·기존 계약 | 전 |
| 3 | P0 | 누적 비용 판정 마감 | 같은1020/2049 규모에서 필요한 차이만 비교. 관측/준비비용 분리·잠금 손실의 미확인 범위 해소, cap 유지 | 집중 안정화 | B07 직접 측정 | 전 |
| 4 | P0 | 실제 HTTP·현행5단계 통합 | 4초/15초·완전2출력·HTTP/파일hash·재기동 기존/새녹화·정리 | 승인된 실제 앱 검증 | B07-H01/I01 | 전 |
| 5 | P0 | 원래9번 고정·S11단기 | 실제 최종source·build·auth/미디어/환경·문서/metadata·inventory·증거 결속 | 최종 단기·정리 | 로드맵·AGENTS | 전 |
| 6 | P0 | 기존증거 영향·실제UI | 기존30분/공통120분/기본424 유지·부분무효 판정. 영향받는 녹화재생·탐색·Policy적격·브라우저media 수행 | 증거 검토·필요 범위 실행 | AGENTS7.6.2·기존FAIL | 전 |
| 7 | P0 | 녹화120분·자원 | 고정된 코드의 실제120분·관측/HTTP·메모리/디스크 추세·복구/정리. 공통검사로 대체하지 않음 | 장시간 안정화 | 직접 변경·기존FAIL | 전 |
| 8 | P0 | 최종 기록·커밋·push | 승인 범위 완료·clean·원격차이 확인 후 개발브랜치push | 마감 | AGENTS5장 | 전 |
| 9 | 별도 승인 | PR·CI·병합·서명tag·Release | 각각 승인·직전gate·대상hash/서명/published 확인 | 외부 릴리즈 실행 | AGENTS4장 | 로컬gate 후 |

이번재산정 번호와 원래 요청1~9는 다른 목록이다. 원래1~7을 새로 다시 수행하라는 뜻이 아니다.

## 미해소·제외·정리

| 항목 | 상태 | 사유 | 완료 evidence 사용 가능 여부 | 다음 조건 |
| --- | --- | --- | --- | --- |
| 이전snapshot | 직접 관측·제품 변경 안 함 | 현재 외38개131,857,206B | 저장비용 전체PASS 불가 | 회수 범위 선택·안전 계약 |
| 잠금 전수 | 일부 미확인 | 고정trace cap·loss1 | 확보 구간만 가능, 전체최대 불가 | 관련구간 유효 계측/호출시간 경계 대조 |
| 실제HTTP/통합·9번 | 미실행 | 앞선 비용·수명 미완료 | 불가 | 선수 마감 |
| 30분/기본UI/공통120분 | 과거PASS 보존·현행승계 미판정 | source/공통수명 변화 | 무관범위 후보, 전체 자동승계 불가 | 최종diff/환경/증거 대조 |
| 녹화UI/120분 | 최종미완료 | 기존실패·부분결과 | 불가 | 현행코드 실제실행 |
| PR/원격CI/병합/tag/Release | 미확인·미실행 | 별도 승인 없음 | 릴리즈완료 불가 | 별도 승인 |
| 외부 서비스/실기기 | 명시 제외 | 사용자 선택 | PASS 아님 | 이번릴리즈 미수행 |
| 이번fixture/원문tmp | 정리 완료 | 원문hash·소유 대조 후 필요한증거 보존 | 이번정리 증거만 | [정리 전수](cleanup.json) |

`푸시 가능: 아니오 / 푸시 수행: 없음`. 제품 수명 미해소를 숨기는 중간 저장 push는 수행하지 않았다.
