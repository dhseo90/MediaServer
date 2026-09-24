# v4.1.0 릴리즈 잔여 전수 대조 — 2026-09-24

독자: v4.1.0 개발·릴리즈 검증 담당자. 수명: S11 종료와 릴리즈 승인 전까지의 현재 판정. 작업 정책은 `AGENTS.md`, 역사적 실행 기록은 `docs/release-test-records.md`, 단계 상태는 녹화·검색 로드맵이 우선한다. O14의 30초 초과 반환 PASS 정정, O23의 한정 단기 통과, O24의 누적 계측, O25의 현행 통합 PASS와 이전 실패를 모두 구분해 보존한다. 과거 실행 원문은 덮어쓰지 않는다.

## 지시 전수

| 번호 | 사용자 지시 | 처리 상태 | 결과 | 근거 |
| --- | --- | --- | --- | --- |
| 1 | 재산정 1번 실제 앱 시간·증거 계약 | 완료 | 제품 작업 30초·원본 대기·검증기 선택 참조/전체 페이지 30초를 분리, 과거 늦은 PASS를 유지하지 않음 | [계약](s11-current-app-time-and-evidence-contract.md) |
| 2 | 2번 검증기 반례 | 완료 | 페이지 경계·첫 dispatch·독립 terminal/전체 페이지 81/81 뒤 O25의 분리 상한 83/83까지 확인 | [O25 결과](../lp26-o10-accumulation-20260923/o25-results.md) |
| 3 | 3번 타임라인 지연 | 범위 한정 완료 | 요청 간 후보의 현재 원장 대조, 한정 앱 통과. O25 전체 통합에서 HTTP 최대 3.392초/4초; 전역 revision 후보 무효화의 비용은 별도 판정 필요 | [O25 원출력](../lp26-o10-accumulation-20260923/o25-current-integration-final.log.gz) |
| 4 | 4번 누적 checkpoint·상태 HTTP | 단기 판정 완료·자원 미확정 | O24 합성 2,049개/8,196행 복구 12.098초/15초, 실제 1,024개·상태 HTTP 198건 최대 32ms/4초. 자동 checkpoint와 실제 HTTP의 최악 동시성, RSS 증가의 누수 여부는 이 결과만으로 확정하지 않음 | [O24 중앙 결과](../../../release-test-records.md) |
| 5 | 5번 최종 집중·현행 5단계 통합 | 완료 | O25 최초 페이지 경계·작업 후순위 실패를 보완한 뒤 API35·인증40·수명10·기본46·실제 앱27개, 전체 exit0·정리 PASS | [O25 결과](../../../release-test-records.md#s11-o25-실행-결과와-실패-이력) |
| 6 | 분할 커밋·가능할 때 푸시 | 진행 중 | O24 기록·O25 페이지 경계·작업 순서 커밋 완료. O25 증거 정합·미커밋 정리와 푸시 판정이 남음 | Git 상태·AGENTS 5장 |
| 7 | 외부 서비스·실기기 검증 제외 | 유지 | 실행하지 않았고 PASS로 세지 않음 | 사용자 명시 지시 |

## 기준

| 항목 | 기준 값 | 직접 확인 결과 | 근거 |
| --- | --- | --- | --- |
| 개발 기준 | `v4.1.0`, VERSION·CMake `4.1.0` | 세 값 일치 | Git·VERSION·CMakeLists.txt 직접 확인 |
| 푸시 기준 | 승인 범위 검증·커밋·clean | 브랜치가 원격보다 앞서 있으며 O25 기록·증거 변경이 미커밋이다. 문서 검증·범위 정리 후 재판정 | `git status --short --branch`·AGENTS 5장 |
| 로컬 릴리즈 태그 | 릴리즈 승인 뒤 서명 태그 | 로컬 `v4.1.0` 없음. 원격 태그·CI는 이번 조사에서 미확인 | `git tag --list`·AGENTS 4장 |
| 시간·자원 제한 | HTTP 4초, 녹화 전용 120분 | O25 현행 HTTP 378건 최대 3,392ms로 단기 통과. O24 RSS 증가의 의미 미확정이며 녹화 120분 최종 PASS 없음 | [O25 결과](../lp26-o10-accumulation-20260923/o25-results.md)·[3차 실패](../../../release-test-records.md#lp26-o08-녹화-120분-재실행-실패) |

## 로드맵 대조

| roadmap 항목 | 문서상 상태 | 직접 확인 상태 | 불일치 여부 | 근거 |
| --- | --- | --- | --- | --- |
| S09 | 종료·S10/S11로 대체 | 과거 실패·유효 수정 보존 | 없음 | [로드맵](../../../v410-v49-recording-search-roadmap.md) |
| S10 | 구현·코드 고정·PREP 완료 기록 | S11에서 journal·상태 응답·타임라인·이벤트 작업 순서까지 제품 변경. 최종 소스 증거 재결속 필요 | 릴리즈 소스 재고정 필요 | 로드맵·O24/O25 결과 |
| S11 | 단기·30분·기본 UI 부분 완료, 녹화 120분·새 UI 잔여 | O14/O16/O18 실패는 보존. O25 현행 5단계 단기 통합은 PASS, 자원 추세·최종 증거 승계·녹화 UI/120분은 남음 | 전체 완료 아님 | [O25 결과](../../../release-test-records.md#s11-o25-실행-결과와-실패-이력)·[LP31 UI](lp31-ui-final-items.md) |
| v4.2.0 이후 검색 | 장기 방향만 확정 | v4.1.0 릴리즈 게이트 아님 | 없음 | 로드맵·사용자 범위 |

## 실제 구현·검증 연결

| 확인 대상 | 실제 파일·route·함수·API·UI·verifier | 확인 결과 | 근거 |
| --- | --- | --- | --- |
| 장시간 실패 요청 | `webrtc_http_server_runtime.cpp`의 `GET /ops/api/recordings/status`, `RecordingApplicationService::Status` | 3차 녹화 120분의 4초 시간초과 지점. O24 현행 1,024개·198건 최대 32ms, 관측 최대 간격 11.052초이나 자동 checkpoint와 동시 겹침의 일반 보증 및 120분 자원 판정은 아님 | [O24 중앙 결과](../../../release-test-records.md) |
| 이번 실제 HTTP | 같은 runtime의 `/ops/api/recordings/timeline`, `verify_recording_current_app.mjs` | O25 두 기동·HTTP 378건 전체 최대 3.392초/4초. 전역 revision 후보 무효화의 요청 간 비용이 관측됐으나 단독 인과는 미확정. **status 장시간 자원 결과로 승격하지 않음** | [O25 원출력](../lp26-o10-accumulation-20260923/o25-current-integration-final.log.gz) |
| 누적 저장 | `RecordingCatalog::PutObservationV2`, checkpoint·재개방 probe | O24 2,049개/8,196행 자동 checkpoint·엄격 복구 12.098초/15초, 수동 checkpoint catalog 잠금 약 7.16초. 해당 잠금을 실제 HTTP 4초 시간초과로 오인하지 않으며 동시성 위험은 별도 | [O24 중앙 결과](../../../release-test-records.md) |
| 현행 통합 | `./server.sh verify-v410-recording-foundation --current-integration`, `verify_recording_current_app.mjs` | O25 전체 5단계 158개 검사 exit0·두 기동 각각 완전 출력2개·HTTP/파일 해시·재시작 보존·정리. 최초 페이지·작업 대기 FAIL은 이력 보존 | [O25 개별 결과](../lp26-o10-accumulation-20260923/o25-results.md) |
| 녹화 화면 | `/ops/events` 및 I27~I34, Policy v4 | 이전 31조작 중 1건 실패 뒤 관련 MP4 브라우저 재생만 범위 한정 통과. 전체 31조작·시각/trace 적격은 미완료 | [수정 전 UI](../s11-recording-ui-20260923/README.md)·[I30 재검증](../s11-recording-ui-20260923/i30-mp4-revalidation.md) |

## 근거 분류

| 항목 | 근거 유형 | 근거 | 릴리즈 영향 |
| --- | --- | --- | --- |
| 30분·UI blocker, 120분 필요성·증거 유효성 | AGENTS 직접 규칙 | 7.6·7.6.2·7.9 | 미충족을 release PASS로 사용할 수 없음 |
| status 120분 실패, 타임라인 단기 통과 | 프로젝트 직접 확인 | O24/O25 원출력·중앙 기록 | 서로 다른 규모·시간 경로라 120분 대체 불가 |
| 자동 전체 checkpoint 위험 | 프로젝트 직접 확인+추론 | O24 2,049개 원본·8,196행의 엄격 복구 12.098초, 수동 checkpoint 잠금 약 7.16초; 실제 HTTP와 겹친 실패는 이번 단기에 관측하지 못함 | 동시 HTTP 4초 위험을 확정 실패나 해결로 보고하지 않음 |
| 실제 앱 시간 판정 | 프로젝트 직접 확인 | 과거 늦은 반환 30.597초·O25 두 실패 보존. O25 최종 두 기동은 기존 30초 작업 판정 내 출력2개씩 완료 | 현행 단기 통합 PASS, 장시간·UI까지 확대 불가 |
| 누적 메모리 추세 | 프로젝트 직접 확인+추론 | O24 첫/마지막 RSS 92,356,608→677,609,472바이트, 준비 5분 뒤 +164,560,896바이트. 계속 생산된 원본/내부 작업·캐시와 누수를 분리하지 못함 | `resourceTrendPass=false/reviewRequired=true`; 누수 없음 주장 불가 |
| PR·병합·태그·Release 별도 승인 | AGENTS 직접 규칙 | 4·5장 | 이 문서·개발 브랜치 푸시로 승인 성립하지 않음 |

## 테스트 필요성 판정

| 테스트 카테고리 | 판정 | 직접 근거 | 근거 파일·행·기능 ID | 실행 승인 상태 |
| --- | --- | --- | --- | --- |
| 안정화 | 진행 대상 | O25 build·집중 83/83·이벤트 통합·현행 5단계 158개 검사 PASS. O24 누적 관측 PASS는 장시간 자원 판정과 분리 | [O25 결과](../lp26-o10-accumulation-20260923/o25-results.md), roadmap S11 | 이번 영향 단기 완료, 릴리즈 전체 안정화 미완료 |
| 30분 | 조건부 진행 | 이전 20회·109 PASS·0 FAIL 증거 있음. 이후 상태·타임라인·이벤트 작업 변경 diff와 source/환경을 비교해 유지·부분/전체 무효 판정 필요 | [30분 요약](../s11-recording-ui-20260923/predev-30-summary.json) | 과거 실행 완료, 현재 코드 승계 미판정 |
| 공통 120분 | 조건부 진행 | 첫 무음 H.264 실패 뒤 80회·409 PASS·0 FAIL. 최종 diff와 원인 미확정 영향 대조 필요 | [공통 120분](../s11-recording-ui-20260923/common-120-pass.md) | 과거 실행 완료, 녹화 전용으로 대체 불가 |
| 녹화 전용 120분 | 진행 대상 | 1차 root 상한, 2차 native 관측, 3차 status HTTP 4초 실패. O24/O25 단기로는 메모리·디스크 추세까지 포함한 120분 PASS 없음 | [1차](../s11-recording-ui-20260923/recording-120-attempt1.md)·[2/3차 중앙 기록](../../../release-test-records.md#lp26-o08-녹화-120분-재실행-실패) | 과거 승인·실행 이력. 이번 요청에서 재실행하지 않음 |
| UI 풀테스트 | 진행 대상 | 기본 424/424·시각80 적격과 녹화 I27~I34/31조작은 별개. 최신 이벤트 렌더 순서가 재생·탐색에 주는 영향 판정 필요 | [LP31 UI](lp31-ui-final-items.md)·[수정 전 녹화 UI](../s11-recording-ui-20260923/README.md) | 과거 실제 실행 이력. 영향받는 새 녹화 전수는 이번 요청에서 미실행 |
| 외부 서비스·실기기 | 미진행 | 사용자 명시 제외 | 사용자 지시·AGENTS 4.1 | 제외, PASS 아님 |

## 릴리즈까지 남은 순서

| 순서 | 우선순위 | 잔여 이슈 | 해야 할 일 | 성격 | 근거 유형 | release action 전·후 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | P0 | 누적 비용·자원 추세 최종 판정 | O24의 2,049개 checkpoint 잠금과 실제 1,024개 상태 HTTP를 같은 사건으로 합치지 않는다. 자동 checkpoint·상태 요청 겹침과 RSS 증가의 제품/검증·정상 증가/누수 원인을 분리한 뒤 확인된 병목만 보완 | 계측·필요 시 한정 제품 보완 | 프로젝트 직접 확인+제안 | 전 |
| 2 | P0 | 현행 타임라인 후보 비용 판정 | O25 4초 내 통과와 이전보다 느려진 두 번째 기동을 함께 보존. 전역 revision 무효화의 hit/miss·현재 원장 재검증·잠금 비용을 통제된 비교로 확정하고 필요한 경우 stale 재생·8슬롯 보호를 유지하며 보완 | 성능·안전 계약 검토 | 직접 확인+제안 | 전 |
| 3 | P0 | 기존 30분·공통120분·기본 UI 증거 유효성 | O24/O25 최종 제품·검증기 diff와 실행 source/환경을 대조해 유지/부분/전체 무효를 판정하고 필요한 범위만 재실행 | 증거 재결속·필요 시 검증 | AGENTS 7.6.2 | 전 |
| 4 | P0 | 새 녹화 UI 전체 적격 | 안정화 후 I27~I34 31조작, 이벤트 우선 실제 재생·브라우저 미디어·시각/trace·Policy v4를 최종 소스에서 판정 | 실제 브라우저 검증 | 직접 확인+로드맵 | 전 |
| 5 | P0 | 녹화 전용 120분 | 앞 단계 통과 뒤 실제 120분·메모리/디스크·drift·재기동·정리의 독립 결과를 획득. 과거 3회 FAIL 보존 | 장시간 검증 | 직접 확인+로드맵 | 전 |
| 6 | P0 | S11 최종 마감 | 최종 빌드·인증·미디어·환경·문서/버전·인벤토리, 기록·cleanup·자원 판정과 최종 소스 결속 확인 | 최종 로컬 gate | AGENTS 직접 규칙 | 전 |
| 7 | 별도 승인 | PR·CI·main 병합·서명 태그·Release | 각 외부 변경은 별도 승인과 직전 gate 확인 뒤 순서대로 수행 | 릴리즈 실행 | AGENTS 직접 규칙 | 로컬 gate 후 |

## 미해소·제외·정리

| 항목 | 상태 | 사유 | 완료 evidence 사용 가능 여부 | 다음 조건 |
| --- | --- | --- | --- | --- |
| 현행 실제 앱 통합 | O25 현행 5단계 PASS | O14 늦은 PASS·O16/O18 및 O25 중간 실패 보존. 이번 최종 단기 실행은 두 기동 완전 출력·HTTP·해시·정리 통과 | 현행 단기 통합 evidence만 가능 | 최종 소스 변경 시 7.6.2 영향 판정 |
| 녹화 120분 | FAIL 이력 3회, 현재 미완료 | 최종 3차 status HTTP 4초 초과 | 불가 | 누적·단기 안정화 후 별도 승인된 실제 장시간 통과 |
| 새 녹화 UI 전체 | 일부 실행·미적격 | 범위 한정 I30 수정 재검증만 존재 | 전체 PASS 불가 | I27~I34/31조작+시각/Policy 증거 |
| 기존 30분·공통120분·기본 UI | 개별 PASS 이력, 최종 승계 미판정 | O24/O25 최종 소스·환경 차이 대조 필요 | 범위 한정 가능, 전체 자동 승계 불가 | AGENTS 7.6.2 영향 판정 |
| 자동 전체 checkpoint·자원 | O24 단기 안정성 관측, 자원 판정 보류 | 합성 2,049개·8,196행 엄격 복구는 15초 내, 수동 checkpoint 잠금 약 7.16초. 실제 1,024개 상태 HTTP 198건은 4초 내였으나 자동 겹침·RSS 원인은 미확정 | 장시간 자원/최악 동시성 PASS 불가 | 원인 분리 후 확인된 범위만 보완·재검증 |
| 타임라인 요청 간 후보 | O25 단기 4초 내, 비용 원인 미확정 | 2기동 최대 3.392초. 전역 revision 무효화가 지연의 유력 후보이나 동일 조건 hit/miss 계측·A/B 미실행 | 성능 병목 해결 증거로 확대 불가 | stale 8슬롯 반례를 포함한 통제 비교 |
| 원격 태그·CI·PR/병합/Release | 미확인·미실행 | 개발 브랜치 푸시 외 승인 없음 | 릴리즈 완료 증거 불가 | 별도 승인·직전 원격 확인 |
| 외부 서비스·실기기 | 사용자 명시 제외 | 이번 버전 검증 범위에서 제외 | PASS 불가 | 이번 릴리즈에서 실행하지 않음 |
| 이번 단기 실행 임시 산출물 | 정리 확인 | O25 두 제품 프로세스 정상 종료·포트/root 부재. 최초 페이지·작업 대기·sandbox 권한 실패는 별도 이력 | 단기 cleanup 증거로만 사용 | [O25 개별 결과](../lp26-o10-accumulation-20260923/o25-results.md) |

이번 목록은 후속 실행·제품 변경·외부 릴리즈 작업에 대한 새 승인이 아니다. 현재 버전 완료 조건만 정리한다.

## O23 당시 집중 검증 임시 산출물 정리

O25의 최신 정리 전수는 [O25 개별 결과](../lp26-o10-accumulation-20260923/o25-results.md#작업-소유-임시-산출물-정리)를 따른다. 아래 O23 원출력은 `docs/release-artifacts/v4.1.0/` 아래에 보존했고, 당시 terminal 원문 로그 15개는 내용 보존 gzip으로 약 268KiB에 압축했다. 검증기가 소유한 격리 root만 적는다. 다른 사용자 자료·운영 저장소는 삭제하지 않았다.

| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | --- | --- | --- | --- |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-current-integration-W2iVBH` | O21 실제 앱 | 397,914,204바이트 | 계측 충돌 후 PID 부재·소유권·비링크를 확인하고 해당 root만 제거 | 수동 제거·부재 확인, 원출력은 실패로 보존 | [O21 원출력](../lp26-o10-accumulation-20260923/o21-targeted-actual-app.log.gz) |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-current-integration-py5HFT` | O22 실제 앱 | 375,854,587바이트 | 검증기 정리 | root 부재·실패 0 | [O22 원출력](../lp26-o10-accumulation-20260923/o22-targeted-actual-app.log.gz) |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-current-integration-5u0IJc` | O23 실제 앱 | 398,618,017바이트 | 검증기 정리 | root 부재·실패 0 | [O23 원출력](../lp26-o10-accumulation-20260923/o23-targeted-actual-app.log.gz) |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-catalog-cost.jzAlUL` | O23 권한 실패 집중 검사 | 약 372KiB | 프로세스 부재·소유권·비링크 확인 뒤 정확한 root 제거 | 수동 제거·부재 확인 | [첫 집중 실패](lp22-read-context-green-lp22-media-lp26-o23-a.txt) |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-catalog-cost.lyX5Op` | O23 첫 권한 확장 | 10,674,614바이트 | 검증기 정리 | 제거 확인 | [첫 권한 확장](lp22-read-context-green-lp22-media-lp26-o23-b.txt) |
| `/private/var/folders/k0/qhmr6zdx11q0_41wfx4dsd200000gn/T/media-server-catalog-cost.AnEg9V` | O23 집중 재검증 | 10,674,614바이트 | 검증기 정리 | 제거 확인 | [집중 PASS](lp22-read-context-green-lp22-media-lp26-o23-c.txt) |
