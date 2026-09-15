# v4.1.0 릴리즈 잔여 감사 — 시간 구간 3번 중단 시점

독자: 개발·최종 검증·릴리즈 담당자. 수명: 2026-09-15 작업 종료 시점의 상태 스냅샷.
정책은 AGENTS.md, 로드맵은 v410-v49-recording-search-roadmap, 실행 기록은 release-test-records가 기준이다.
이 문서는 전체 테스트 실행 결과나 릴리즈 승인이 아니다. 모든 과거 문서의 전문 리뷰도 아니다.

## 결론

2026-09-16 정정: 아래 MAP-A 역변환 후보 검사는 실제 forward mux 변환이나 영상 누락을 입증하지 않는다.
완전 녹화 의미 변경의 사용자 선택이 필수라는 결론은 철회했다. 사용자는 기존 요청 충족·지원 범위를
유지하는 3-A 실제 변환 근거 보완 → 3-B 수집·저장·복구 → 4번 제한 대기 개발을 승인했다.
현재 계약은 endpoint-contract의 2026-09-16 절을 따른다. 아래 표는 9월15일 중단 시점의 기록이며,
그날의 실패·미완료를 현재 PASS로 변경하지 않는다.

같은 날 후속 결과: FW01~04 실제372AU/5파일과 FW05 33개가 통과했다. 실제 writer 정수 원점에
native 표시 구간을 이동하고 원본 identity와 분리하는 3-A 계약을 확정했다. 양수 gap은 rational에서
검사하고 기존 partial 자동 승격은 없다. 다음은3-B 수집·저장·복구, 이어4번 제한 대기다.
이 결과는 제품 저장·복구·완전 출력·통합 PASS가 아니다. 현재 실행 상세는 중앙 기록을 따른다.

최신 추가 확인(3-A/3-B 개발 요청): MAP-A01~03은3PASS로 변환의 식별 불가능 반례를 고정했다.
같은TP01 tail50개와native표를 만족하는 후보에서 gap0/1/6ns가 공존한다. 실제누락이 아니라 현재 증거의 한계다.
3-A는 원본축 엄격 판정 유지/원천 증거 추가와 파일축 판정·원본시간품질 분리 중 의미 결정이 남아 미완료다.
3-B 미착수, 커밋·푸시 보류. [계약 결정 경계](../../../superpowers/specs/2026-09-15-recording-endpoint-contract.md)를 따른다.
아래 Git 기준은 그대로이며 이번 새 변경도 로컬미커밋이다. 이번 추가 확인으로 기존 제품/최종 검증을 PASS로 바꾸지 않는다.

| 번호 | 이번 사용자 지시 | 처리 상태 | 결과 | 근거 |
| --- | --- | --- | --- | --- |
| 1 | 3-A 개발 | 선수 확인, 계약 미완료 | 시간 판정 의미 결정 필요 | MAP-A01~03/endpoint 계약 |
| 2 | 3-B 개발 | 건너뜀 |3-A 미확정 가정을 저장 계약에 고정하지 않음 | AGENTS3·8 |
| 3 | 분할 커밋 | 미수행 | 해당 단계 미완료 | AGENTS5.1 |
| 4 | 문제 없을 때 최종 푸시 | 미수행 | 계약 미확정·미커밋 | AGENTS5.2 |
| 5 | 릴리즈 잔여 목록 | 최신 blocker 추가 | 아래 순서1을3-A 의미결정→3-B로 구체화, 나머지 개발/최종/외부 경계 동일 | 이 문서7절 |

**릴리즈 불가.** 시간 구간 3번 저장·원본 연결이 미완료여서 4번 대기 정책은 건너뛰었다.
1ns writer profile 두 후보가 실제 파일의 edit 길이 문제를 일으켜 제외됐다.
이는 기존 제품 writer의 새 회귀가 아니라 테스트 전용 후보 설정의 실패다. 제품 코드는 변경하지 않았다.
동일 실패 재현 후 메인이 회수했고 추가 변형 실험을 중단했다. 제품 수용 범위 축소나 +1ns 보정으로 통과시키지 않았다.
[실측·실패·정리](timing-profile-report.md), [기존 계산 계약](../../../superpowers/specs/2026-09-15-recording-endpoint-contract.md)을 함께 본다.

계산 계약 자체가 불가능하다고 입증된 것은 아니다. `track1e9/movie1e9`와 `track1e9/movie0` 두 후보만 배제했다.
명시적으로 낮은 movie 단위, 일반 native reader, writer 원본 대응 증거 방식은 구현·실측 미확정이다.
**재개 제안:** 기본 컨테이너 설정을 유지하는 원본 AU 식별·파일 시간 대응 증거 설계와,
정밀도 보존 profile의 지원 한계를 비교해 3번의 최소 저장 표현을 먼저 확정한다.
샘플 번호만으로 연결하거나 잃은 시간을 추정하지 않고, 대응 입증 실패는 unknown/partial로 남긴다.
새로운 입력 제한·컨테이너 변경·기존 판정 완화가 필요한 안은 사용자 결정 전 적용하지 않는다.

## 1. 사용자 지시 전수 대조

| 번호 | 사용자 지시 | 처리 상태 | 결과 | 근거 |
| --- | --- | --- | --- | --- |
| 1 | 3번 최소 증거 저장·원본 연결 | 미완료·중단 | 선수 실험 두 후보 실패. 저장 schema·원본 연결 제품 미수정 | timing-profile-report, src/include diff 없음 |
| 2 | 4번 대기 정책 | 건너뜀 | 3번 합격 전 착수 금지 | AGENTS 3·8, 현재 worker |
| 3 | 동일 기준 분할 커밋 | 미수행 | 실패 단계 커밋 조건 미충족. 승인 취소가 아님 | AGENTS 3.1·5.1 |
| 4 | 최종 푸시 | 미수행 | 3·4 미완료, 현재 기록/도구 미커밋 | AGENTS 5.2, Git 상태 |
| 5 | 5번 포함 릴리즈 전체 잔여 목록 | 작성 | 아래 기준·로드맵·구현·검증·순서·미해소 전수표 | 이 문서2~8절 |

## 2. 기준 값과 직접 확인

| 항목 | 기준 값 | 직접 확인 결과 | 근거 |
| --- | --- | --- | --- |
| branch/source | v4.1.0 | branch v4.1.0, VERSION4.1.0 | git status; VERSION1행 |
| CMake/build metadata | 4.1.0 | project4.1.0, cache STATIC4.1.0 | CMakeLists.txt3행; build-gst-onnx/CMakeCache.txt140행 |
| 이번 제품 빌드 | 이번 제품 변경 없음 | 전체 빌드 미실행. cache 버전 일치가 binary 최신성 증명은 아님 | 제품 diff 없음; 과거 cp2-final-build.log와 이번 범위 구분 |
| local/upstream/remote HEAD | 6358d2162f2e58f3a3cf1f84feab76645c286789 | 세 값 일치, ahead/behind 없음 | git log/branch/status; git ls-remote |
| main 최신 | 431397d9b86af69f1690aff6fa6f3e61ea4fbe03 | local main/origin/main/원격 main 일치 | git branch -vv; git ls-remote |
| tag | 공개 v4.0.0, 신규 v4.1.0 없음 | local/remote v4.0.0, 원격 tag object a739712d742ad6c747d7b3a4456726d60f93dbbf, peeled main431397d9b | git tag --list; git ls-remote |
| 공개 Release | v4.0.0 | draft=false, prerelease=false, published2026-09-02T13:55:49Z | gh release view; https://github.com/dhseo90/MediaServer/releases/tag/v4.0.0 |
| PR/CI | v4.1.0 | open PR조회[], 최근 branch run조회[]. required checks/미래 PR checks는 미확인 | gh pr list --head v4.1.0; gh run list --branch v4.1.0 |
| CHANGELOG/NEWS | 실제 존재 확인 | 제품 루트 없음. test/fixtures/integrator_contract_artifact/CHANGELOG.md는 fixture | rg --files |
| 작업 트리 | 소유 변경만 보존 | 이번 사전등록·실험 도구·실패 증거·감사 문서 미커밋. 운영 데이터 변경 없음 | git status/diff, cleanup 직접 대조 |

## 3. 로드맵 대조

| roadmap 항목 | 문서상 상태 | 직접 확인 상태 | 불일치 여부 | 근거 |
| --- | --- | --- | --- | --- |
| S00 | 조사·설계 완료 | IP/오픈소스 경계와 비반입 기록 존재, 이번 외부 코드 반입 없음 | 새 법적 보증 아님 | foundation-design의 IP/출처 절, S00 기록 |
| S01~S03 | 기존 계약·writer·catalog 완료 | 실제 구현/기존 검사 있음. S10 현행 계약·새 시간 증거는 별도 미완료 | 역사적 완료와 현행 완료 구분 필요 | s00-s09-mapping 초기 단계 표; contracts/writer/catalog |
| S04 | 보존 완료 | 현행 store order·hold/삭제 구현 있음. 4번 pending 대기 보호는 별도 | backlog의 UTC oldest-first 현재 요약은 현행 order와 재정렬 필요 | retention_coordinator.cpp; development-backlog400행 |
| S05 | 단계 구현/서비스 모드 통과 | 과거 foreground/nohup/launchd 기록 있음. 현행 실제 앱 완전 출력은 미완료 | 과거 서비스 PASS를 현행 2출력 PASS로 사용 불가 | service-lifecycle 기록; cp-http-actual.log |
| S06 | timeline/API/UI 단계 완료 | route·Range·Ops 소비 구현 존재. 현재 종료점 소비는 구형 duration 합산 | 제품 표시 존재와 새 정확성 미완료 구분 | runtime766~771행; timeline_projection123행 |
| S07 | 분석 관측 구현 완료 | source/epoch/FrameLocator 및 내부 전달 보완 있음 | 후속 검색 엔진 구현은 범위 밖 | S07 기록, S10 evidence 전달 기록 |
| S08 | 복구/호환 단계 완료 | 기존 recovery/golden 검사 존재. 새 증거의 손상/복구 검증은 미구현 | 기존 PASS를 새 저장 계약에 자동 승격 금지 | S08 기록; derived_job_ready.cpp |
| S09 | 장기 roadmap에서 종료·대체 | 과거 성과/실패만 보존. 약93분 실패는120분 PASS 아님 | backlog405행은 아직 구현·부분검증 중으로 오래됨 | roadmap183~194행; backlog405행 |
| S10 | 부분 완료 | 3번·4번·5번, 구형 정리·코드 고정 남음 | 요약에 현재 시간 증거 blocker 반영 필요 | endpoint-contract5절, 이번 실험 |
| S11 | 계획·미실행 | 현행 최종 검증 아직 불가. 준비 도구에 구형 소비가 남음 | 일치 | current_integration_suite, longrun_progress, journal_reader |
| v4.2 이후 검색 | 후속 버전 계획 | 이번 검색·벡터·자연어/API 개발 없음 | 일치 | recording-search-roadmap |

로드맵의 과거 시점 서술을 일괄 오보로 바꾸지 않는다. 현재 상태 요약과 historical 문단을 구분해 정리한다.

## 4. 구현·검증 연결 직접 대조

아래 경로는 저장소 루트 기준이다. 번호 매핑 전수 상세는 기존 s00-s09-mapping.md/s10-mapping.md에 보존한다.

| 확인 대상 | 실제 파일·route·함수·API·UI·verifier | 확인 결과 | 근거 |
| --- | --- | --- | --- |
| 입력/파일 | src/recording/gstreamer_segment_writer.cpp OpenLocked/PushBuffer/FinalizeLocked | 기본 mux, source ordinal/PTS 저장. native endpoint/변환 증거 미저장 | 331/403/456행 부근; NP실험은 factory wrapper만 변경 |
| 원본 연결 계약 | include/recording/recording_contracts.h RecordingSourceSampleV1; recording_contracts.cpp | ordinal/PTS 두 필드, complete/index cap4096. 최소 새 표현 결정 필요 | 80행; 489~552행 |
| 저장·복구 | recording_catalog.cpp CommitBoundLocked/SnapshotDerivedSources; finalize recovery | source binding durable 결합 존재. 새 endpoint 증거 parser/재생복구는 없음 | sourceBinding 처리, derived_job_ready |
| 실제 영상 구간 | recording_derived_remux.cpp ReadAus/RecordMissing | parser duration 소비·원본 exact PTS 매칭 유지 | TP01~04, endpoint 계약 |
| Ready/타임라인 | recording_derived_job_ready.cpp232~233; recording_timeline_projection.cpp123 | original_pts+file_duration 합산, 같은 새 판정으로 교체 필요 | 직접 식 확인 |
| 대기/공정성 | recording_derived_event_worker.cpp73/114~199 | 접수 deadline·단일 FIFO 처리 내 대기. 긴GOP/다중 요청 원본 확정 중심 보완 필요 | 현재 Process/Loop |
| pending 보존 | retention_coordinator.cpp AdmitDerivedJob/BeginDerivedJobIntent | Intent 시 원본 hold, 단순 accepted pending에 같은 보호 없음 | 현재 호출 경계 |
| 공개 소비 | webrtc_http_server_runtime.cpp766~771, product_ui_page_scripts.cpp10330~10343 | GET status/timeline, media GET/HEAD/Range 및 Ops 화면 연결 존재 | /ops/api/recordings/* |
| 현행 통합 | recording_current_integration_suite.mjs7~13/35~38 | HTTP35/auth38/lifecycle12/default46/actual25, 5단계 판정 구현 | actualEventPass/restartPass 및 출력각2 강제 |
| 실제 앱 현재 근거 | verify_recording_current_app.mjs; cp-http-actual.log 마지막5행 | 지연검사190요청,max3786ms PASS. 출력1개 partial, actualEventPass=false/restartPass=false | latency-only 결과는 통합 PASS 아님 |
| 임시 인증 | recording_auth_preparation.mjs createPasswords; verify_auth_workflow.sh14~16 | 실행별 randomBytes 서로 다른5개, stdin 전달·격리 정리 구현 | 사용자 비밀번호 재요구 불필요. 후속 전체 auth 실행은 별도 |
| 관측/120분 | recording_journal_reader.mjs4~17; recording_longrun_progress.mjs45~60 | 구형 mutation enum, UTC 엄격증가 및 number 범위 검사. 현행 order/epoch/null UTC/string 정밀도와 연결 전환 필요 | 실제 읽기 확인, 기존 감사와 일치 |
| UI 준비 | verify_v410_recording_ui_contract.mjs680~686 | HTTP는 managed seed, ui-direct/ui-auth는 기존 seed 경로. 동일 새 계약 연결 필요 | 브라우저 실행 제외와 준비 코드 미완료는 별개 |
| 등록/runner 공백 | s00-s09-mapping15~23/418절 | S01~04 검사 자체는 존재, 고정 ID 공백. ENV12 과거 직접 검사 있으나 영속 재현 runner 공백 | 테스트 부재라고 과장하지 않음 |
| legacy 정리 | mapping README의6번, golden/구형 fixture 및 실제 현행 소비 | 대체 검증·호출자·소유 확인 전 삭제 불가. 현재 계약V1 이름만으로 제거 금지 | 삭제 목록 최종 확정은 미완료 |

## 5. 근거 분류

| 항목 | 근거 유형 | 근거 | 릴리즈 영향 |
| --- | --- | --- | --- |
| 실패 단계 뒤 진행/커밋 금지 | AGENTS 직접 규칙 | 3.1·8·5 | 3번 실패 미해소,4번/커밋/푸시 보류 |
| 30분/UI 필수 | AGENTS 직접 규칙 | 7.6·4 | 이번 제외가 릴리즈 면제는 아님 |
| 120분 필요 | AGENTS 직접 규칙+프로젝트 직접 확인 | 7.6.2 media/lifecycle 변경, S10 writer/worker/fanout와 S11 정책 | 준비 이후 release 전 필요, 단기/30분/UI로 대체 불가 |
| 2출력/재기동 미완료 | 프로젝트 직접 확인 | current app summary 및 strict suite | P0 제품·통합 blocker |
| 1ns 후보 배제 | 프로젝트 직접 확인 | NP01/NP-T01 실제 edit·count 실패 | 기존 제품 수정 아님;3번 설계 후보 재선택 |
| 기존 파일 단위 유지+대응 증거 비교 | 추론/제안 | 기본 writer 회귀를 피하고 원본/파일 축을 명시해야 함 | 구현 설계 미확정, 제품 PASS 아님 |
| 미확정 외부 환경 | AGENTS 직접 규칙 | 4·7.6.2 | endpoint/실기기/credential 없는 항목은 조건부, 기본 PASS 아님 |

## 6. 테스트 필요성 및 승인 판정

| 테스트 카테고리 | 판정 | 직접 근거 | 근거 파일·행·기능 ID | 실행 승인 상태 |
| --- | --- | --- | --- | --- |
| 3번 선수 단기 | 진행 대상·실행 FAIL | 실제 파일 원본 연결 설계 | NP01,NP-T01 | 승인 범위 실행 후 중단 |
| 3/4 focused 저장·복구·대기 | 조건부 진행 | 안전 설계 확정 및 중단 해소 후 | endpoint3/4, worker/catalog | 원래 개발 승인 유지, 현재 중단 |
| 5번 생성/Ready/타임라인 및 통합 | 진행 대상 | 구간 판정 직접 소비·실제2출력/재기동 공백 | R03/CI09~11, current suite | 이번 목록만, 구현·실행 착수 미승인 |
| 최종 안정화/build/API/auth/media/VA | 진행 대상 | S10 시간·writer·event/metadata·전송 경계 변경 | AGENTS7.2~7.5; inventory/mapping 현행 ID | 준비 후 고정 source·범위를 확인, 이번 미실행 |
| 최종 문서/entry/metadata/등록/closeout dry-run | 진행 대상 | 릴리즈 기준·문서·검증 연결 | verify-v410-entry-baseline, verify-docs-links/assets, verify-release-metadata, verify-script-inventory, feature inventory, closeout helper | 전체 gate는 이번 미실행. 이번 수정 문서 링크/diffcheck만 실행 |
| 30분 | 진행 대상 | 버전 필수, 변경 후 현행 최종 증거 없음 | AGENTS7.6; verify-predev --soak-minutes30/S11 | 과거 승인 이력 있음. 준비 후 정확 runner/source 확정, 이번 미실행 |
| 120분 | 진행 대상 | 녹화·source worker·metadata·cleanup 변경 직접 매핑 | S10-T/3C/3D; AGENTS7.6.2; verify-v410-recording-longrun | 과거 승인 이력 있음. 구형 observer 준비 후 정확 묶음 확인, 이번 미실행 |
| UI 풀테스트 | 진행 대상(릴리즈 기준) | timeline/player/auth/권한/새 계약 시각 확인 | D08 및 Policy v4 exact case | 최신 브라우저 제외 유지. 재승인 또는 blocker 인지 강행 승인 전 릴리즈 불가 |
| 외부 TURN/WHEP/ONVIF/VLM | 조건부 진행 | 외부 endpoint/기기/자격증명 필요 | AGENTS4.4,7.6.2 | 제공·실행 승인 없음, 기본 PASS 아님 |
| published metadata/PR CI | 조건부 진행 | 실제 승인된 release action 후 해당 상태 확인 | AGENTS4.5~9 | action별 승인 없음. 이번 읽기 상태조회만 |

기존 PASS는 source·환경·검증 경계가 같은 부분만 유지한다. S10 제품 변경으로 무효가 된 범위를 판정하고
준비 종료·코드 고정 후 최종 묶음을 실행한다. 수정마다 전체30분/UI/120분을 초기화하지 않는다.
공통 장시간과 녹화 전용120분의 관측 목적은 다르다. 한쪽을 다른 쪽 PASS로 쓰지 않고 정확 실행 연결을 먼저 확정한다.

## 7. 권장 개발·릴리즈 순서

| 순서 | 우선순위 | 잔여 이슈 | 해야 할 일·완료 기준 | 성격 | 근거 유형 | release action 전·후 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | P0 | 3번 최소 증거·원본 연결 | 실패 후보 배제, 기존 지원 유지하는 대응 증거 선택→canonical 저장·파일 hash/원본 식별 결박·손상 거부·복구·기존 partial 비승격 검증 | 설계+개발 | 직접확인+제안 | 전 |
| 2 | P0 | 4번 제한 대기 | 원본 확정 상태 중심, 긴GOP/복수 요청 공정성/pending 보존·취소/상한. 미확보 partial, timeout 확대만으로 해결 금지 | 개발 | worker/retention 직접확인 | 전 |
| 3 | P0 | 5번 공통 적용·실제 통합 | 생성/Ready/복구/타임라인 한 판정, 진짜 누락·손상 음성 유지, 실제 완전 출력2개/HTTP·hash/두 번째 기동 기존+새 녹화,5stage 전수 | 개발+단기 검증 | 계약5절/current suite | 전 |
| 4 | P0 | 현행 관측·장시간 도구 | mutation/order/epoch/UTC nullable·정밀도/자원 추이 전환, UTC 역행과 저장 순서 분리, 실제120분 전 단기 oracle 검증 | 검증 준비 개발 | journal_reader/longrun_progress | 전 |
| 5 | P0 | UI 준비·등록 누락 정리 | managed UI seed·복수출력·null/문자열시간/exact action 연결. S01~04 ID·ENV12 실행 경로 대조·보완 | 검증 준비 개발 | mapping 및UI runner | 전 |
| 6 | P0 | 구형 코드·개발 데이터 정리 | 대체 검사 확보, 정확 사용처·소유·크기 확인, 현행V1 이름과 과거golden 보존 구분. 불필요 경로만 삭제·회귀 | 정리 개발 | S10 roadmap/기존 감사 | 전 |
| 7 | P0 | S10 고정·증거/문서 정합성 | backlog S09/현재 보존 기준, roadmap S10 blocker, 사용법·release notes·버전 기준 정렬. source별 증거 유지/무효 판정 | 문서+준비 | 직접 불일치/AGENTS | 전 |
| 8 | P0 | S11 최종 안정화 | 확정된 build/auth/API/media/metadata/등록/docs/entry/cleanup 전수 합격, 처음 실패→수정 보존 | 실행 | AGENTS/영향 ID | 전 |
| 9 | P0 | S11 30분·UI·120분 | 승인된 정확 순서·묶음, 실제 duration/UI action/자원·녹화·보존·복구·cleanup 및 evidence 보존. 각영역 독립 PASS | 최종 검증 | AGENTS/S11 | 전 |
| 10 | P1 | 공개 문서·출처 최종 점검 | 기능 과장·구형 이미지/설정 제거, 의도된 영문 제외 한글, LICENSE/NOTICE·codec/plugin 출처·source-only assets 경계 | 릴리즈 품질 | release-policy/AGENTS12 | 전 |
| 11 | P0 | 커밋·푸시/PR·CI·main | 승인 범위 커밋·푸시 후 별도 PR/merge 승인, checks 확인. 실패/미해소 cleanup 때 다음 action 금지 | 외부 변경 | AGENTS4·5 | gate 뒤 |
| 12 | P0 | 서명 tag·Release·published 확인 | 최신 main 대상 signed annotated tag, 전후 서명 검증, 별도 Release 승인·published gate. tag/Release 아직 없음 | 외부 변경 | AGENTS4 | PR/merge 뒤 |
| 13 | P2 | 외부 현장 확인·다음 브랜치 | 외부 조건 제공 시 별도 smoke, 다음 브랜치도 별도 승인. v4.2 검색을 현행 완료조건에 끼워 넣지 않음 | 조건부 외부 | AGENTS4/13 | 승인된 순서 |

P1 공개 문서라도 사실 오류·비밀 노출이 확인되면 P0로 정정한다. 새 제품 범위·의존성 설치·대규모 패키징 변경은 이 목록에서 자동 승인하지 않는다.

## 8. 미해소·제외·승인 경계

| 항목 | 상태 | 사유 | 완료 evidence 사용 가능 여부 | 다음 조건 |
| --- | --- | --- | --- | --- |
| 3번·4번 | 미완료/건너뜀 | 지원 보존하는 설계 미확정/선수 실패 | 아니오 | 회수한 3번 설계 재개 결정 |
| native250 원본 일치 | 일부 직접 확인 | demux122뿐, tail/Bframe 미실행 | 전체 녹화/연결 PASS로 불가 | 후보 폐기 또는 안전 대안 새 근거 |
| 5초 STTS 위험 | 산술·미실행 | 5e9 tick >uint32, 실제 fixture는 건너뜀 | 실측으로 불가 | 지원 범위 판정 시 별도 증거 |
| 기존 latency PASS | 유효 범위 제한 |190요청/max3786ms, 출력partial1 | latency 범위만 | 5번 실제2출력/재기동 별도 |
| S11 관측/UI/등록/legacy 준비 | 미완료 | 실제 구형 검사 소비/미결박 남음 | 아니오 | 위 순서4~7 |
| 30분/UI/120분 | 현행 최종 미실행 | S10 미고정·준비 미완료/브라우저 제외 | 아니오 | 준비·승인·정확source/명령 |
| PR/CI/tag/Release | 미실행/체크 미확인 | 현재openPR/branchrun없음, 신규tag없음 | 아니오 | 별도 승인·gate 후 |
| 로컬 tag 서명 설정 | 미확인 | 이번 tag실행 없음 | 아니오 | 실제 tag 전에 키/서명 조건 확인 |
| 운영·외부 장비/서비스 | 미실행 | 이번 격리 실험만 | 아니오 | 사용자 제공·명시 승인 |
| 임시 산출물 | 정리 확인 | 세 소유root 삭제·14개 증거hash/크기 대조 | cleanup 범위만 | 미커밋 보존물은 실패 이력으로 유지 |
| 커밋/푸시 | 미수행 | 실패 단계 조건 미충족 | 아니오 | 해당 단계 합격 후 승인 유지 범위 수행 |

이번 읽기 명령 git/gh는 exit0. 문서 대조 중 잘못된 경로/glob 조회는 수정해 실제 경로를 확인했으며 제품 테스트로 집계하지 않았다.
서버·포트·계정·외부 영상 사용 없음. token start/end/consumed 및 전체 경과시간은 전용 집계 소스 부재로 미집계다.
실험 경과는 총18초이며 전체 조사/설계 작업시간을 뜻하지 않는다. 문서 검증 실제 결과는 중앙 기록을 따른다.
