# v4.1.0 릴리즈 잔여 확인 — 보완 진단 시점

## 2026-09-19 최신 중단 지점

아래 9월17일/16일 대조는 당시 이력이다. 현재 기준 HEAD795b3c15a, 원격 추적 대비ahead1와 LP11/LP12 미커밋 변경이 남아 있다. LP12 입력 AVC framing 수정은 단위7/capture50/기존FE193/Node110 및 build PASS이며 source/build SHA가 유지됐다. 실제 앱 F05 재개는 exit1/39222ms, timeline HTTP header4003ms timeout으로 실패했다. writer 오류0·원본2개 complete 선택 trace는 관측했지만 마지막 대상 상태intent/출력0 이후 완료는 미확인이다. 기존 `file-original-timestamp-mismatch` 해결의 실제 통합 PASS를 주장하지 않는다.

최우선 잔여는 **HTTP 지연 원인 구간 계측 및 HTTP 실패에서도 대상 job 진단 보존 → 확인된 병목 보완·동일 단기 검사 → 누적 비용 최종 판정 → 실제 복수 출력/재기동·전체 통합**이다. 기존32원본의 잠금3.85초/체크포인트3.56초와 실제 HTTP 실패의 인과관계는 미확정이다. S11 도구 정합·구형 정리·문서 정렬·최종 안정화/30분/UI/필수120분·별도 승인 release action은 아래 목록대로 남는다. 이번에는 앞 단계 실패로 뒤 단계·커밋·푸시를 수행하지 않았다. 원출력/누락 진단의 한계/정리는 [중앙 최신 기록](../../../release-test-records.md)과 [F05 원출력](lp12-framing-output.txt)에 보존한다.

## 2026-09-17 LP11 현재 대조

아래 최신 대조는 LP10 `795b3c15a` 이후 기준이다. 이 절 아래의 2026-09-16 감사는 당시 이력이며 현재 완료 상태가 아니다. 전체 문서 전문 리뷰가 아니라 릴리즈 잔여 범위의 구현·실행 연결 확인이다. LP11 실행 결과는 중앙 테스트 기록이 기준이다. 현재 실제 영상 생성 실패로 요청 전체는 미완료이며, 안전 진단 준비 보완은 제품 실패 해결과 구분한다.

| 번호 | 사용자 지시 | 처리 상태 | 결과 | 근거 |
| --- | --- | --- | --- | --- |
| 1 | 누적16/32·HTTP 지연 | 미완료 | 누적 fixture174PASS; 실제 이벤트 영상 생성 실패. HTTP180개는 모두4초 이내지만 단계PASS 아님 | 중앙 LP11-01/02 |
| 2 | 실제 앱 완전2출력·재기동 | 건너뜀 | 1번 실패로 선수조건 미충족 | 중앙 LP11-03 |
| 3 | 분할 커밋·최종 푸시 | 미수행 | 승인 유지, 실패 단계는 커밋/푸시 조건 미충족 | AGENTS3.1/5 |
| 4 | 종합 보고·릴리즈 잔여 | 대조 | 아래 표; 현행 최종검증 완료를 주장하지 않음 | AGENTS2 |

| 항목 | 기준 값 | 직접 확인 결과 | 근거 |
| --- | --- | --- | --- |
| source/빌드 | 4.1.0 | VERSION:1, CMakeLists:3, CMakeCache:140 일치 | 파일 직접 확인 |
| branch | v4.1.0 | 시작795b3c15a, clean/ahead1 | git status/log |
| 원격 | main431397d9, v4.1.0 9881bb7a | ls-remote 성공·푸시 전 상태 | 2026-09-17 읽기 조회 |
| tag/Release | 최신공개v4.0.0 | v4.1.0 원격tag없음, latest API v4.0.0 | git ls-remote, gh api releases/latest |
| PR/CI | 승인된 릴리즈 PR·check 필요 | v4.1.0 open PR0, branch run 조회0; CI PASS 아님 | gh pr list/run list |
| CHANGELOG/NEWS | 제품 공개 기록 | 루트/제품 문서 대상 파일 없음 | rg --files, test fixture 제외 |

| roadmap 항목 | 문서상 상태 | 직접 확인 상태 | 불일치 여부 | 근거 |
| --- | --- | --- | --- | --- |
| S00~S03 | 기존 단계 구현 | 계약/writer/catalog 존재, 새 시간기반 적용 이력은 S10 | 당시완료와 현행전수검증 구분 | roadmap176~, src/recording |
| S04 | 완료 | 현행 영속 order_sequence 우선 보존 | backlog의 UTC 정렬 설명이 오래됨 | retention_coordinator.cpp:50, backlog S04 |
| S05~S08 | 기존 단계 완료 | 이벤트/조회/관측/복구 경로 존재; 현행 최종 증거는 별도 | 과거PASS 재사용 범위 미확정 | application_service, native Ready, LP10 |
| S09 | roadmap 종료·대체 | 성공 완료 아님 | backlog S09는 여전히 구현·부분검증중 | roadmap S09/backlog S09 |
| S10 | 부분 완료 | LP09 native 공통 소비·LP10 제한 대기 구현/단기검증 완료 | roadmap 상단/증적색인에 대기·소비 미완료 문구 잔존 | LP09/10 중앙 기록과 현재 코드 |
| S11 | 계획·미실행 | 최종 코드/범위고정·도구정합·최종실행 남음 | 일치 | roadmap S11 |

| 확인 대상 | 실제 파일·route·함수·API·UI·verifier | 확인 결과 | 근거 |
| --- | --- | --- | --- |
| 원본 확정 대기 | recording_derived_event_worker.cpp Loop/RenderLoop/Process | runtime60초/121상한, scheduler/renderer 분리 및 lease 인계 | 795b3c15a/LP10 252개 |
| native 공통 소비 | recording_derived_job.cpp:420, derived_remux.cpp:403, derived_job_ready.cpp:243 | 별도 profile 및 EvaluateNativeOutputCoverage 소비 | LP09 결과/현재 코드 |
| 공개 녹화 소비 | ingress/webrtc_http_server_runtime.cpp:766~771, product_ui_page_scripts.cpp:10330 | status/timeline/media route 및 UI 소비 존재 | 실제 앱 검증 결과는 LP11에서 별도 |
| 누적·HTTP | recording_catalog_scale_probe.cpp, verify_recording_current_app.mjs --latency-only | 16/32 비용과 복구, HTTP4초 oracle 분리 | LP11-01/02 |
| 현행 통합 묶음 | recording_current_integration_suite.mjs currentSteps | API35/auth38/lifecycle12/default46/actual 앱25의 5단계; 실제 호출 성공 필요 | wrapper --current-integration |
| 장시간 도구 | recording_journal_reader.mjs:5, verify_v410_recording_foundation.mjs:828 | reader가 이전7개 mutation만 허용; 현행 segment_v2_bound_finalized 등 제외 | journal.cpp:291 vs reader types |
| UI seed | verify_v410_recording_ui_contract.mjs:679~686, recording_timeline_smoke.cpp:76 | HTTP는 managed seed, 브라우저는 이전 V1 --seed-ui 경로 | D08 실제 재생 미실행 |
| 구형 경로 정리 | recording_foundation_runtime_smoke.cpp:323, timeline SeedHttp | V1 검증 경로 존재; 삭제 필요성은 소유/소비 대조 후 판단 | 무조건 삭제·PASS 대체 금지 |

| 항목 | 근거 유형 | 근거 | 릴리즈 영향 |
| --- | --- | --- | --- |
| 30분/UI 필수·120분 판정 | AGENTS 직접 규칙 | 7.6/7.6.2, roadmap S11 | 미충족 blocker |
| 검증기 전환·문서불일치 | 프로젝트 직접 확인 | 위 실제 파일 연결 | 최종 실행 전 준비 필요 |
| 저장 규모 비용 | 프로젝트 직접 확인 | LP11 계측값; 운영 합격 수치는 미정 | 근거 없는 성능PASS 금지 |
| 준비→코드고정→최종검증 순서 | 추론/제안 | 도구/제품 상태와 정책 결합 | 기존 증거 무조건 폐기하지 않음 |
| 외부 release action | AGENTS 직접 규칙 | 4/5 | 이번push 외 PR/merge/tag/Release 미승인 |

| 테스트 카테고리 | 판정 | 직접 근거 | 근거 파일·행·기능 ID | 실행 승인 상태 |
| --- | --- | --- | --- | --- |
| 개발 단기 안정화 | 진행 대상 | 이번1~2 순차 지시 | LP11-01~04 | 승인 |
| 최종 안정화 | 진행 대상 | S10 코드고정 후 S11 | roadmap S11, currentSteps/현행 기능 매핑 | 이번 전체실행 미승인 |
| 30분 | 진행 대상 | 버전완료 필수 | AGENTS7.6/roadmap S11 | 최종 명령/범위 확정 후 별도 실행 |
| UI 풀테스트 | 진행 대상 | 필수·D08 미실행 | AGENTS7.6.3, UI seed 경로 | 이번 미실행, 과거개발 제외를 릴리즈 면제로 사용하지 않음 |
| 120분 | 진행 대상 | 녹화/writer/종료 수명 변경 및 roadmap | writer/runtime composition/LP10 Stop/roadmap S11 | 최종 공통·녹화 대상 분리와 실행 승인 확인 필요 |
| 외부실기기/provider | 조건부 진행 | 환경/자격증명/승인 필요 | AGENTS4.1/7.6 | 미제공·미승인 |

| 순서 | 우선순위 | 잔여 이슈 | 해야 할 일 | 성격 | 근거 유형 | release action 전·후 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | P0 | 실제 파일·원본 대응 실패 | `file-original-timestamp-mismatch` 재현 보존. trace 준비 보완 후 원본 catalog proof와 legacy intent projection을 구분하여 profile 선택 원인 확정·관련 수정; 같은 HTTP 검사 재개 | 원인 확인·제한 수정 | 직접확인/제안 | 전 |
| 1-2 | P0 | 누적 비용 판정 | 32원본 commit 잠금3.85초·자동 checkpoint3.56초. 운영 합격 수치는 미정이며 실제 HTTP 결과와 구분해 추가 보완 범위 결정 | 성능 판단 | 직접확인/제안 | 전 |
| 1-3 | P0 | 실제 앱 통합 | 앞 단계 완료 후 완전2출력·HTTP/hash·재기동 보존/새 녹화, 해당 단계 커밋 및 승인된 최종 푸시 | 단기 검증 | 사용자 승인/직접확인 | 전 |
| 2 | P0 | S11 검증 도구 정합 | 장시간 reader/observer·UI seed·현행 통합5단계와 exact기능 매핑 정리 | 검증준비 개발 | 직접확인 | 전 |
| 3 | P0 | 구형 코드·개발 데이터 정리 | 실제 소비/소유 확인 후 불필요 경로만 제거; 필요한 fixture·실패 이력 보존 | 정리 개발 | roadmap/직접확인 | 전 |
| 4 | P0 | 문서 정렬·S10 코드고정 | backlog S09/보존·roadmap/색인 상태 정렬, 기존 증거 유지/무효 표 확정 | 문서/검토 | 직접확인 | 전 |
| 5 | P0 | S11 최종 검증 | 안정화→30분/UI/필수120분 승인된 순서·개별결과·cleanup | 실행 | AGENTS 직접 규칙 | 전 |
| 6 | P1 | 공개 문서·출처 품질 | 한글 기본/현재 이미지/NOTICE/source-only 및 metadata/entry/inventory/closeout gate | 릴리즈 준비 | release-policy | 전 |
| 7 | P0 | 최종 외부 공개 | 승인별 push·PR/CI·main merge→서명tag검증→Release/published 확인 | 외부 변경 | AGENTS 직접 규칙 | 필수gate 후 |

| 항목 | 상태 | 사유 | 완료 evidence 사용 가능 여부 | 다음 조건 |
| --- | --- | --- | --- | --- |
| LP11 | 실패·부분 수행 | 실제 생성 실패 및 trace 수집 실패. 원본 proof 부재는 아직 미확정 | 전체PASS 불가 | 안전 진단 보완·원인 확인 후 같은 단계 재검증 |
| 실제 최종 UI/30분/120분 | 미실행 | 현행 도구/코드/증거 범위 미고정 | 불가 | 준비 완료·별도 실행 |
| 5단계 current integration | 전체PASS 미확인 | 단일actual 앱 통과도 전체 suite 대신 못함 | 불가 | 실제 묶음 또는 유효 증거/실행 연결 판정 |
| PR/CI/tag/Release | 미수행 | open PR/run없음, v4.1.0 미발행 | 불가 | gate통과·각각 승인 |
| 외부실기기·서비스 | 조건부 | endpoint/credential 없음 | 기본 release PASS 아님 | 제공/승인 |

## 2026-09-16 당시 감사(이력 보존)

독자: 개발·릴리즈 담당자. lifecycle: 이번 작업 종료 시점의 읽기 감사 기록. 정책 AGENTS.md, 로드맵 v410-v49-recording-search-roadmap, 실행 결과 release-test-records에 종속한다. 과거 모든 문서의 전문 리뷰나 릴리즈 실행 승인이 아니다.

## 지시 대조

| 번호 | 사용자 지시 | 처리 상태 | 결과 | 근거 |
| --- | --- | --- | --- | --- |
| 1 | 진단 자체검증 | 수행 | typed fixture 및 초기화 보완 | LP05-01~03 |
| 2 | 겹치는 원본 관측 | 준비 | 시간상 후보와 typed 실제 선택 원본 구분 | LP05-04/helper/probe |
| 3 | 실패 입력 확보 | 조건부 | 실제 실패가 있어야 수행 가능 | LP05-05 |
| 4 | 독립 재현 | 준비 | 가짜 실패 사유와 정상 원본의 불일치 검사 | LP05-06 |
| 5 | 확인된 원인 수정 | 미완료 | 실제 실패 원인 확정 전 임의 제품 수정 금지 | LP05-07 |
| 6 | 분할 커밋·완료 후 푸시 | 일부 | 단계1 커밋; 전체완료 조건부 푸시 | Git/중앙 기록 |
| 7 | 릴리즈 잔여 목록 | 수행 | 아래 개발·검증·외부 변경 분리 | 직접 대조 |

최종 보완: 실제 앱1회 partial1출력으로 이전failed 미재현. mapping별timeline을 ID만dedup하던관측결함을수정해helper33/33 PASS이나 수정후actual관측은미실행이다. 2번은관측도구준비,3~5번은실제실패선수조건미충족으로미완료다. 제한없이추가실행하거나제품을추측수정하지않았다.

## 기준

| 항목 | 기준 값 | 직접 확인 결과 | 근거 |
| --- | --- | --- | --- |
| 버전 | 4.1.0 | VERSION/CMake/cache 일치 | VERSION:1; CMakeLists.txt:3; CMakeCache.txt:140 |
| 브랜치 | v4.1.0 | 현재 동일 | git status |
| upstream | origin/v4.1.0 | 로컬 추적값 b8298a6e; 이번 작업 커밋은 별도 | git rev-parse; 최종 보고 |
| main | 로컬/추적 main | 모두431397d9; 원격 최신성 미확인 | git rev-parse |
| tag | v4.1.0 | 로컬없음; 로컬v4.0.0 존재 | git tag --list |
| 원격 HEAD/tag | 현재 원격 | git ls-remote DNS실패(-65563); 미확인 | 이번 읽기 명령 |
| 공개 Release/PR/CI | 별도 직접 확인 필요 | 이번 미조회; 정책 문서상 공개v4.0.0 | docs/release-policy.md:현재 공개 상태 |
| CHANGELOG/NEWS | 실제 파일 | 루트없음; test fixture CHANGELOG만 있음 | rg --files |

## 로드맵 대조

| roadmap 항목 | 문서상 상태 | 직접 확인 상태 | 불일치 여부 | 근거 |
| --- | --- | --- | --- | --- |
| S00 | 완료 | 출처·독립설계 경계 유지, 이번 외부코드 반입없음 | 새 법적 적합성 보증 아님 | roadmap/이번diff |
| S01~S03 | 기존 단계 완료 | contracts/writer/catalog 존재, 새 증거 소비는 미완료 | 과거완료와 현행전체 구분 | src/recording; job.cpp:390 |
| S04 | 완료 | 영속 order_sequence 정렬 | backlog의 UTC oldest-first 설명과 불일치 | retention_coordinator.cpp:50; backlog:400 |
| S05 | 기존 단계 완료 | 실제앱 완전2출력·재기동은 현재 미완료 | 과거foreground PASS로 대체불가 | current app/suite |
| S06~S08 | 단계 완료 | 조회/API/UI/관측/복구 존재; 새 종료점 소비 전체미완료 | 과거증거와 현행 구분 | application_service/derived_job_ready |
| S09 | 종료·대체 | roadmap은종료, backlog는구현·부분검증중 | 불일치 | roadmap:190; backlog:405 |
| S10 | 부분 완료 | 비용·증거 저장 완료분과 실제실패/대기/소비/통합 잔여 | 최신요약과대체로일치 | roadmap:5~8 |
| S11 | 계획·미실행 | 코드고정전, 전체최종증거 없음 | 일치 | roadmap:265~280 |

## 구현·검증 연결

| 확인 대상 | 실제 파일·route·함수·API·UI·verifier | 확인 결과 | 근거 |
| --- | --- | --- | --- |
| 진단·재현 | recording_current_archive_probe.cpp; --diagnose-failed/--replay-failed | 테스트전용; 제품 변경 아님 | diff/LP05 |
| 지연 | verify_recording_current_app.mjs --latency-only | partial 관측가능, 완전녹화·재시작PASS 아님 | latency helper |
| 저장 증거 소비 | recording_derived_job.cpp:390; recording_derived_remux.cpp:333~340 | 새 job은file_evidence 비소비; exact PTS역대응 유지 | 직접 코드 |
| 보존 | retention_coordinator.cpp | order_sequence 우선 정렬 | 직접 코드 |
| 대기 | recording_derived_event_worker.cpp:126 | 제한 재시도·snapshot·소진뒤부분선정 존재; 공정성/미확정원본보호 개선 완료 아님 | roadmap잔여와 코드 |
| 공개 조회 | /ops/api/recordings/timeline; webrtc_http_server_runtime.cpp; recording_application_service.cpp; product_ui_page_scripts.cpp | 실제 route/UI 소비 존재, 이번UI 미실행 | 코드 검색 |
| 실제통합 | recording_current_integration_suite.mjs | HTTP API35/auth38/lifecycle12/default46/actual2출력·두기동5단계 | currentSteps/completedCurrentStep |
| 장시간 관측 | recording_journal_reader.mjs; recording_longrun_progress.mjs | reader가이전mutation 집합 열거,현행전환 필요 | reader:5~16 |
| 최종 문서 | release-policy; entry/docs/metadata/closeout 명령 | 도구경계 존재,이번release gate 미실행 | 정책 Local Release 준비 |

## 근거 분류

| 항목 | 근거 유형 | 근거 | 릴리즈 영향 |
| --- | --- | --- | --- |
| 필수30분/UI 및120분판정 | AGENTS 직접 규칙 | 7.6/7.6.2 | 미충족시 blocker |
| 실패·partial·미완료 | 프로젝트 직접 확인 | LP01~05 및 current suite | 진단PASS로 release 불가 |
| 새증거소비 미완료 | 프로젝트 직접 확인 | job.cpp:390 및 roadmap | 제품개발 잔여 |
| 고정PTS 대신 입력 재현 | 추론/제안 | LP04 조건미충족과 typed replay | 원인확정 방법,제품원인 보장 아님 |
| 외부작업 승인 경계 | AGENTS 직접 규칙 | 4·5 | push/PR/merge/tag/Release 각각 구분 |

## 테스트 판정

| 테스트 카테고리 | 판정 | 직접 근거 | 근거 파일·행·기능 ID | 실행 승인 상태 |
| --- | --- | --- | --- | --- |
| 안정화(개발 focused) | 진행 대상 | 승인1~5 | LP05-01~07 | 승인,원인수정은확정후 |
| 최종 안정화 | 진행 대상 | S10고정후S11 | roadmap:270~276/currentSteps | 이번최종실행 미승인 |
| 30분 | 진행 대상 | 버전완료필수 | AGENTS7.6/roadmap:272 | 이번실행 미승인 |
| UI 풀테스트 | 진행 대상 | 버전완료필수;D08도미실행 | AGENTS7.6/roadmap:16 | 이번범위밖,과거제외를release면제로확대불가 |
| 120분 | 진행 대상 | writer/source lifecycle·복구·보존 직접변경 및 S11 녹화범위 | writer.cpp/recording_runtime_composition.cpp/roadmap:273 | 최종명령·순서승인 필요; 이번실행안함 |
| 외부실기기/provider | 조건부 진행 | endpoint/credential·사용자승인 필요 | AGENTS4.1/7.6 | 미승인·미제공 |

## 잔여 개발 순서

| 순서 | 우선순위 | 잔여 이슈 | 해야 할 일 | 성격 | 근거 유형 | release action 전·후 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | P0 | 실제 job 실패 원인 | 실패입력/코드 확보·독립재현·확정수정·영향회귀 | 제품진단/개발 | 직접확인 | 전 |
| 2 | P0 | 누적 catalog·HTTP 잔여지연 | 16/32초안 검증 후 동일조건 비용/응답 판정 | 계측/성능 | roadmap/LP02미실행 | 전 |
| 3 | P0 | 제한 대기 정책 | 긴GOP·복수요청·보존보호·취소·상한,미확보partial 유지 | 제품개발 | roadmap/worker | 전 |
| 4 | P0 | 종료점 증거 공통 소비 | 새증거 불변참조/identity·생성·Ready·복구·timeline 일치 | 제품개발 | job.cpp/endpoint계약 | 전 |
| 5 | P0 | 실제 통합 | 완전출력2개·HTTP/hash·재기동보존/새녹화·5단계통합 | 개발/단기검증 | current suite | 전 |
| 6 | P0 | S11검증 도구·구형정리 | 현행관측/장시간·UI seed/등록 매핑,소유확인된 불필요경로만 제거 | 검증준비/정리 | reader/roadmap | 전 |
| 7 | P0 | S10코드고정·문서정렬 | backlog S09/보존설명 등 정정,증거 유지·무효 범위확정 | 문서/판정 | 직접불일치 | 전 |
| 8 | P0 | S11 최종검증 | 안정화→승인된30분/UI/필수120분,실패·cleanup전수판정 | 실행 | AGENTS/roadmap | 전 |
| 9 | P1 | 공개품질·출처 | 한글기본문서·대표이미지·LICENSE/NOTICE·source-only 확인 | 릴리즈준비 | release-policy | 전 |
| 10 | P0 | 최종커밋·푸시/PR·CI·main | 최종gate통과후 각각 승인 범위 실행 | 외부변경 | AGENTS4·5 | gate뒤 |
| 11 | P0 | signed tag·Release | main최종hash/서명검증/Release/published확인 | 외부변경 | AGENTS4 | PR/merge뒤 |

## 미해소

| 항목 | 상태 | 사유 | 완료 evidence 사용 가능 여부 | 다음 조건 |
| --- | --- | --- | --- | --- |
| 제품실패원인/완전2출력 | 미완료 | 이전failed/partial 결과 | 불가 | 원인확정·수정·통합 |
| 누적16/32 | 미실행 | 선수실패와초안상태 | 불가 | 선수해결후승인범위실행 |
| UI/30분/120분 | 미실행 | 최종코드미고정 | 불가 | 코드고정·정확범위승인 |
| 원격상태/CI/Release | 미확인 | DNS조회실패/외부작업미수행 | 불가 | 읽기확인·각각실행승인 |
| 외부실기기 | 조건부 | 환경/credential 없음 | 불가 | 제공·승인 |
| 다음버전검색 | 제외 | v4.1.0 녹화기반범위밖 | 불가 | 해당버전사용자지시 |

실행·커밋·cleanup의 최종 실제 상태는 [이번 진단 보고](diagnostic-replay-report.md)와 중앙 기록에서 확인한다. 이 목록만으로 새로운 실행 권한이나 릴리즈 완료를 주장하지 않는다.
