# v4.1.0 S11 현행 결과 및 릴리즈 잔여 전수 판정

독자: v4.1.0 검증·릴리즈 담당자. 수명: 녹화 UI 실패의 원인 확인 및 S11 최종 판정까지.
정책 source-of-truth는 `AGENTS.md`다. 이 문서는 2026-09-26의 직접 관측과
후속 제안을 분리하며, 미완료 단계를 PASS로 만들지 않는다.

## 2026-09-28 B14 공개 증거 정제·공개 준비

현재 판정은 이 절이다. 아래 B13은 당시 실패 이력이며 덮어쓰지 않는다. 사용자 승인
1~4번과 릴리즈 잔여를 대조한다. 원본/정제본 관계는 [변환 영수증](b14-migration-receipt.json.gz),
단계별 실행은 [중앙 B14 기록](../../../release-test-records.md#v410-s11-b14-공개-증거-정제-2026-09-28)을 따른다.

### B14 지시 전수

| 번호 | 사용자 지시 | 처리 상태 | 결과 | 근거 |
| --- | --- | --- | --- | --- |
| 1 | 보존 방식·JPEG20 결정 | 완료·커밋 | 원본 해시/실패 보존·평문 정제, 정확한20개 시각/metadata·SHA 확인 | `c7f9f577`, [검토](b14-historical-ui-review.json) |
| 2 | 자료 정제·참조 보완 | 완료·커밋 | 원본960개 이행·관련361파일, 단위30·관측11·inventory986·현재 공개 검사 통과 | `393f2eea`, [원출력](b14-step2-results.json.gz) |
| 3 | 공개·배포·Actions 검사 | 검증 통과·기록 마감 중 | history500 8/8, 의존성 조회5/5·source tree·source-only/위험 후보4종·Actions/대응·정적 검사 통과 | [원출력](b14-step3-results.json.gz)·[전수207행](b14-step3-items.md.gz) |
| 4 | 분할 커밋·가능 시 푸시 | 일부 수행 | 1·2번 및 원본 대조 보완 커밋, 최종 문서·정리·증분 이력 확인 후 푸시 | Git 상태·AGENTS5 |
| 5 | 종합보고·릴리즈 잔여 | 갱신 중 | 아래 완료/미실행/승인 경계를 실제 결과와 대조 | 이 절 |

### B14 기준 대조

| 항목 | 기준 값 | 직접 확인 결과 | 근거 |
| --- | --- | --- | --- |
| 버전 | branch v4.1.0·VERSION/CMake4.1.0 | 일치, 제품 마지막 `c4735579` 이후 src/include 변경0 | Git diff·VERSION·CMake |
| 원격·공개 | 원격 v4.1.0/main·태그 | 실제 조회 v4.1.0=`534a8dfa`, main=`431397d9`, v4.1.0 tag 없음. published 문서 기준v4.0.0, release action 없음 | Git 원격 조회·release policy |
| 공개 범위 | source-only | 제품/runtime/model binary 번들 제외 | release/distribution policy |
| CHANGELOG/NEWS | 루트 제품 문서 존재 시 반영 | 없음, fixture는 비대상 | 기존 B13 직접 확인·추가 생성 없음 |

### B14 roadmap 대조

| roadmap 항목 | 문서상 상태 | 직접 확인 상태 | 불일치 여부 | 근거 |
| --- | --- | --- | --- | --- |
| S10·S11 제품/최종 검증 | 제품·빌드/인증/녹화·30분/UI/120분 완료 | 제품 변경0, 유효한 기존 증거 유지 | 없음. 새 전수 실행으로 표기하지 않음 | B13-E02·B12·B11 |
| 공개 준비 | B13 정책 위반·미완료 | 자료 정제·기본 history500·배포/Actions 대응 통과, 당시 실패 보존 | B14 결과로 현재 상태 갱신 | B14-02/03 |
| 외부 릴리즈 | 미실행·별도 승인 | 이번은 개발 branch push까지 | 없음 | AGENTS4 |

### B14 실제 구현·소비자

| 확인 대상 | 실제 파일·route·함수·API·UI·verifier | 확인 결과 | 근거 |
| --- | --- | --- | --- |
| 정제 | b14-evidence-sanitizer·b14-migrate-evidence | root만 치환·원본 fingerprint·목적지 충돌·JSON·영수증·원본 정리, secret 정책 불변 | 단위30·1321개 이행 지문 확인 |
| 이미지 | public_repo_readiness_lib::loadReviewedHistoricalAssets | SHA 고정 manifest와 exact path/bytes/SHA만 허용. 새 파일·변조·중복·탈출·symlink 거부 | B14-A01~09 |
| 녹화 관측 반례 | recording_current_longrun_diagnostics.test.mjs A03 | 새 평문 경로만 변경. 초과5개와 첫 실패 assertion 유지 | 관측11 PASS |
| 문서/과거 manifest | Markdown 실제 링크·변환 영수증 | 현재 링크는 정제본, raw/source 해시는 역사적 원본 의미 유지 | docs-links·B14-M05/M07 |
| 공개/배포 | public readiness·licensing guardrails·source-only rehearsal | history8/8, source tree4736파일 hit0, 실제 bundle 위험3개 거부, source-only16파일·위험 후보4종 거부. Actions3개 오류0·CI/local6/6 | B14-03 실제 결과. GitHub CI/배포 아님 |

### B14 근거 분류

| 항목 | 근거 유형 | 근거 | 릴리즈 영향 |
| --- | --- | --- | --- |
| 보존·정제 범위 | 사용자 승인+프로젝트 직접 확인 | B13 1301파일·20개 시각 검토·현재 소비자 | 범위 밖 제품/이력 rewrite 없음 |
| 기존 제품 증거 유지 | 직접 확인+메인 영향 판정 | 제품 diff0·원래 assertion 불변·focused 회귀 | 30분/UI/120분 자동 재실행 안 함 |
| 커밋/푸시 조건 | AGENTS 직접 규칙 | 3·5·7.8 | 전체 승인 범위 PASS·정리 뒤 푸시 |
| PR/CI/서명/공개 | AGENTS 직접 규칙+프로젝트 정책 | AGENTS4·public-repo-final-review | 별도 승인·실제 외부 확인 필요 |

### B14 테스트 필요성

| 테스트 카테고리 | 판정 | 직접 근거 | 근거 파일·행·기능 ID | 실행 승인 상태 |
| --- | --- | --- | --- | --- |
| 정제·공개·배포·Actions 대응 | 진행 대상 | 이번 변경과 B13 실패 | B14-01~04·OPS-163/SAFE-196 | 승인·실제 통과. 최종 기록·정리 진행 |
| 새 빌드·30분·UI·공통/녹화120분 | 미진행 | 제품·판정·실행 경로 불변, 기존 유효 결과 유지 | B13-E02·B14 A03 | 새 실행 없음 |
| 실제 GitHub CI·annotation | 조건부 진행 | PR/main 트리거·required checks | workflows·AGENTS4.5 | PR 승인 뒤 |
| 외부 서비스·실기기 | 미진행 | 사용자 명시 제외 | 현행 릴리즈 범위 | 제외, 재추가하지 않음 |

### B14 릴리즈 잔여 순서

| 순서 | 우선순위 | 잔여 이슈 | 해야 할 일 | 성격 | 근거 유형 | release action 전·후 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | P0 | 최종 증거·정리 | 통과한 history500 이후 증분 커밋과 현재 파일 대조, 문서·소유 임시 자료 정리 | 로컬 기록·정리 | B14 직접 범위 | 전 |
| 2 | 마감 | 개발 branch 동기화 | 승인 범위 전체 PASS 후 clean·원격 비교·누적 커밋 push | 승인된 외부 변경 | 사용자 지시·AGENTS5 | 전 |
| 3 | P0 | PR·GitHub 설정·실제 CI | 별도 PR 승인, owner 설정/required checks·최신 CI·annotation 확인 | 외부 검증·수동 확인 | AGENTS4·public review | 병합 전 |
| 4 | P0 | main 병합·서명 태그 | 별도 승인 후 최신 main·정확한 hash·서명 key 확인, signed annotated tag 전후 검증 | 외부 릴리즈 | AGENTS4.6~8 | 승인 후 |
| 5 | P0 | source-only Release·published 확인 | 별도 승인 후 tag 기반 Release·Latest URL/remote tag/hash 확인 | 외부 릴리즈 | AGENTS4.9 | 승인 후 |

### B14 미해소·한계

| 항목 | 상태 | 사유 | 완료 evidence 사용 가능 여부 | 다음 조건 |
| --- | --- | --- | --- | --- |
| history500·후속 배포 | 완료 | 실제840.352초·500개SHA 보존, 배포/source-only·Actions 대응 통과 | 해당 로컬 검사 범위만 가능 | 후속 커밋은 증분 대조 |
| 의존성 제한 환경 timeout | 최초 실패 보존·최종 조회 통과 | 제한 환경5개 timeout, 승인된 로컬 권한·새 registry·동일5초 상한에서5/5 ok. 정확한 OS 대기 원인은 미확정 | 로컬 실제 관측에만 사용 | 제한 환경 보편 지원으로 확대하지 않음 |
| 비밀 검사 전체 보장 | 보장하지 않음 | 현재 고신뢰5패턴·최근500이 정책 검사 범위. 임의 비밀번호·모든 archive/전체 Git 이력을 전수 감사한 결과 아님 | 설정된 범위에만 사용 | 공개/승인 판단에서 범위 확대 주장 금지 |
| 역사적 개인/임시 경로 | 현재 파일은 정제, 과거 commit은 보존 | 원본 증거 복구·기존 실패 보존 계약, history rewrite 미승인 | 현재 자료 정제 증거로 사용, 전체 이력 경로 삭제 증거 아님 | 이력 재작성은 별도 사용자 결정 |
| 과거 인증 실패 원인·무기한 RSS | 미확정/보장 불가 | 이전 진단 부재·120분 관측 한계 | 현행72 PASS·120분 결과와 분리 | 재발 시 진단·설명 과장 금지 |
| 실행 root 정리 | 대기 | 동일 소유 root로3번까지 로그 보존 | 정리 전 전체 마감 불가 | 필요 증거 이관 뒤 정확한 root 삭제·부재 확인 |
| PR/merge/tag/Release/published | 미실행·미승인 | branch push와 별도 | 불가 | 단계별 승인 |

## 2026-09-28 B13 당시 마감 판정

이 절은 B13 당시 판정이다. B12 제품 검증 PASS는 유지하지만 공개 준비까지 모두 완료했다는
포괄 결론은 정정한다. [B13 단계별 직접 결과](b12-s11-final-local-gate.md#b13-재감사-후-마감)를
근거로 하며 새로운 제품·장시간/UI 실행을 임의로 추가하지 않는다.

### 1. 지시 전수

| 번호 | 사용자 지시 | 처리 상태 | 결과 | 근거 |
| --- | --- | --- | --- | --- |
| 1 | 인증 진단 보완 | 완료·커밋 | unit20·users72·inventory18 PASS, 승인 본문 불변 | `dae8f3ae`, B13 AUTH-P10/P11 |
| 2 | 최종 코드 증거 연결 | 완료·커밋 | 제품3커밋·인증 복원 영향 대조, 기존 증거 유지 | `6a2c1e31`, [영수증](b13-evidence-audit.json) |
| 3 | 문서 정합 | 완료·커밋 | backlog/version/roadmap/정책·현재 기록 정정, metadata 최초 실패 뒤 관련 검사 PASS | `076b248c`, B13-D03 |
| 4 | 공개 준비 실제 검사 | 일부 실행·실패 | notice 정합 PASS. 공개 준비에서 기존 증거의 경로/내용/이미지 정책 위반 확인, 뒤 배포·Actions 검사 보류 | B13-P04 |
| 5 | 분할 커밋·가능 시 푸시 | 일부 수행 | 1~3번 3커밋, 공개 준비 실패·미완료 기록이 남아 푸시 불가 | Git 상태·AGENTS5 |
| 6 | 종합보고·릴리즈 잔여 산정 | 완료 | 공개 gate의 실제 실패·이력 중단·정리와 아래7·8절에 잔여 반영 | 이 문서·B13-P04 원출력 |

### 2. 기준

| 항목 | 기준 값 | 직접 확인 결과 | 근거 |
| --- | --- | --- | --- |
| 버전 | branch v4.1.0·VERSION/CMake4.1.0 | 일치 | 기존 entry33 및 파일 직접 대조 |
| 소스·원격 | 마지막 제품 `c4735579`, 개발 원격 `534a8dfa` | 제품 이후 src/include 변경0, B13 문서·검증기 커밋은 로컬 | Git diff·원격 조회 |
| 공개 | main `431397d9`, published 기준v4.0.0 | v4.1.0 remote tag 없음. published 재조회·release action 미실행 | 원격 ref 조회·현재 정책 |
| 범위 | source-only 공개 | runtime/model binary 배포·외부 서비스·실기기 제외 | 사용자 지시·release 정책 |
| 변경 이력 | CHANGELOG/NEWS 존재 시 갱신 | 루트 제품 CHANGELOG/NEWS 없음, fixture는 비대상 | 파일 목록 직접 확인 |

### 3. 로드맵 대조

| roadmap 항목 | 문서상 상태 | 직접 확인 상태 | 불일치 여부 | 근거 |
| --- | --- | --- | --- | --- |
| S10·S11 제품 검증 | 구현·최종 제품 검증 완료 | B12와 최종30/UI/120분 PASS·B13 영향 대조 | 현재 증거로 유지 | [연결표](b12-s11-final-local-gate.md#b13-2번-최종-소스와-증거-연결) |
| backlog·버전 설명 | UI/120분 미완료·S00만 완료라는 오래된 문구 | 녹화 구현·최종 검증 증거 존재 | B13-D03 정정 | backlog·versioning-policy |
| 공개 준비·릴리즈 | B12에서 로컬 blocker0으로 포괄 표현 | 실제 공개 검사에서 원본 산출물960·개인/임시 경로874파일·비허용 JPEG20 검출 | 기존 증거 보존/공개 정책의 정합 미완료 | B13-P04 |

### 4. 구현·실행 연결

| 확인 대상 | 실제 파일·route·함수·API·UI·verifier | 확인 결과 | 근거 |
| --- | --- | --- | --- |
| 인증 진단 | verify_auth_workflow.sh의 expect_eq | 고정 대상만 숫자/invalid, 성공·실패 판정 불변 | unit20·실제users72 |
| 승인 readback | verify_password_change_lifecycle·manifest986 items | 함수/승인 의미 불변, inventory 문서 SHA만 갱신 | B13 1번 직접 SHA·inventory18 |
| 최종 녹화 코드 | journal/active·ResolveMediaWithContext·identity chain | 압축·삭제·증분 검증의 API/ID/미디어 불변과 후속 회귀 연결 | B13 2번·B11 8/9/10차 |
| 공개 검사 | verify_public_repo_readiness.mjs·public_repo_policy.json | 직접 실행에서 보존 자료 위반 확인. notice PASS, 배포·Actions는 뒤 단계여서 미실행 | B13-P04·guardrails workflow |

### 5. 근거 분류

| 항목 | 근거 유형 | 근거 | 릴리즈 영향 |
| --- | --- | --- | --- |
| 진단/증거/문서 공백 | 프로젝트 직접 확인 | B12 원출력·현재 diff·오래된 문서 | 공개 전 마감 필요 |
| 기존 검증 유지 | 직접 확인+메인 영향 판정 | 불변 계약·focused 회귀·최종120분·B12·B13users | 전수 재실행 자동 추가 안 함 |
| 공개 검사·단계별 승인 | AGENTS 직접 규칙+현재 release 정책 | AGENTS4/7.6.2·public-repo-final-review | 실행 증거·각 외부 승인 필요 |
| 기존 자료 정제 필요 | 프로젝트 직접 확인+제안 | 위반 합집합1,301파일 모두 B13 이전부터 존재. JPEG manifest·과거 실패/원출력 참조가 있어 무차별 삭제 불가 | 제품 회귀가 아닌 공개 증거 정비. 정제·원본/변환본 결속 범위 확정 필요 |

### 6. 테스트 필요성

| 테스트 카테고리 | 판정 | 직접 근거 | 근거 파일·행·기능 ID | 실행 승인 상태 |
| --- | --- | --- | --- | --- |
| 인증 집중 | 진행 대상 | 진단 변경 | AUTH-P10/P11 | 실행·PASS |
| 문서·공개 준비 안정화 | 진행 대상 | 현행 설명·공개 gate 공백 | B13-D03/P04 | 문서 PASS·공개 준비 FAIL, 후속 검사 보류 |
| 30분·실제 UI·공통/녹화120분 새 실행 | 미진행 | 최종 변경의 실제 focused/장시간과 불변 표출 계약 연결, 기존 결과 유지 | B13-E02·AGENTS7.6.2 | 새 실행 없음 |
| 외부 서비스·실기기 | 미진행 | 사용자 명시 제외 | release 정책 | 제외 |
| GitHub CI | 조건부 진행 | PR/main 트리거·required checks | workflows·AGENTS4 | PR 별도 승인 전 미실행 |

### 7. 릴리즈 잔여 순서

| 순서 | 우선순위 | 잔여 이슈 | 해야 할 일 | 성격 | 근거 유형 | release action 전·후 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | P0 | 과거 증거의 공개용 정제 범위 확정 | 1,301개 합집합 대상의 결과/실패/원본 해시 보존과 정제본 대응 방식, JPEG20의 보존·허용 경로 판단. 내용 정제 없이 압축으로 숨기거나 포괄 allowlist 추가 금지 | 보존 계약·소비자 영향 검토 | 직접 확인+제안, AGENTS7.8/8 | 전 |
| 2 | P0 | 승인된 자료 정제·참조 재결속 | 개인/임시 경로 제거, 원본 로그의 최소 공개 증거 전환, 필요한 이미지 노출 검토. 링크·해시·판정 결과 대응을 확인하고 과거 실패를 유지 | 자료·문서 정리, 관련 정적 검증 | 직접 확인+제안 | 전 |
| 3 | P0 | 공개 준비 실제 gate 마감 | 동일 public readiness 통과 후 의존성 snapshot·bundle policy·source offer·source-only 리허설·Actions/local parity. 검사 의미와 실제 CI 구분 | 로컬 검증 | 정책+직접 확인 | 전 |
| 4 | 마감 | 개발 branch 커밋·푸시 판정 | 전체 승인 범위 결과·clean·원격 비교 후 푸시. 현재 3커밋은 유지, 실패 단계는 미커밋 | 커밋/외부 변경 | 사용자 승인·AGENTS5 | 전 |
| 5 | P0 | PR·CI·main·서명 tag·Release | 각 승인 후 required checks·annotation·저장소 설정·merge 대상·서명·published 확인 | 외부 릴리즈 | AGENTS4·public-repo-final-review | 단계별 승인 후 |

### 8. 미해소·제외

| 항목 | 상태 | 사유 | 완료 evidence 사용 가능 여부 | 다음 조건 |
| --- | --- | --- | --- | --- |
| 과거 인증 두 실패 원인 | 미확정·현재 미재현 | 당시 안전 진단 누락, 원문 소급 복원 불가 | 과거 실패는 해결 PASS 아님; 현행72 PASS 별도 사용 | 재발 시 B13 고정 상태로 조사 |
| 무기한 RSS 누수 부재 | 미확인 |120분은 관측 범위 내 상한 준수만 입증 | 무기한 보장 불가 | 이번 릴리즈 설명에서 확대 금지 |
| 공개 준비 실제 gate | 실패·후속 미실행 | 기존 자료 보존 요구와 공개 제한을 함께 만족하는 정제/이전이 필요 | 불가 | 자료 정제 범위 확정·보완 후 동일 gate |
| history500 비밀 패턴 검사 | 중단·미확인 | 선행3정책 실패 확정 후 소유 검색 자식 종료. 현재 파일 패턴 PASS와 별개 | 불가 | 정제 후 같은 공개 gate의 이력 검사 완료 |
| 기존 증거의 광범위 변경 | 승인 범위 판단 필요 | 단순 실행에서 과거1,301파일 정제·해시/참조 변경과 이미지 허용 판단으로 확대. 아직 변경/삭제/정책 완화 없음 | 현재 상태로 공개 준비 PASS 불가 | 위1·2번 범위 확정 후 진행 |
| 이번 작업 cleanup | 완료 | 소유 로그 root30파일·1,045,628B 이관 후 삭제·부재 확인. 새 서버/브라우저/포트 없음 | 정리 증거로 사용 | [영수증](b13-closeout-records.json.gz) |
| PR/merge/tag/Release/published | 미실행·미승인 | 개발 branch push와 별도 | 불가 | 단계별 사용자 승인 |
| 외부 서비스·실기기 | 사용자 제외 | 이번 릴리즈에서 안 함 | 외부 PASS 불가 | 후속 목록에 재추가하지 않음 |

## 2026-09-27 B11 누적·통합·코드 고정 후 당시 판정

이 절은 B12 마감 당시 이력이다. 현행 판단은 위 B13을 우선하며 아래 B10 실패 직후 및 최초 중단 표도 보존한다.
B11-O03의 2,049개 삭제 이력 누적 비용, B11-H01 실제 HTTP, B11-I01 현행 5단계와
B11-F01~03 최종 단기 gate, 최종30분, 영향받는 녹화 UI를 통과했다. 녹화120분은 저장
상한·관측 비용·live 파일시스템 원자 전이와 검증기 경계의 실패 이력을 보존한 뒤 10차에서
실제7,200.547초·10,093 PASS·0 FAIL과 자원 상한·복구·정리를 통과했다. B12 최종 로컬
gate도 build·현행 녹화158·auth19/72/146·환경20·inventory986·문서/버전/metadata·
close-out dry-run을 통과했다. 따라서 개발 브랜치의 로컬 release blocker는 해소됐다.
외부 서비스·실기기는 사용자 제외이며 PR·CI·main 병합·서명 tag·GitHub Release·published
확인은 별도 승인 전 미실행이므로 공개 릴리즈 자체는 아직 완료가 아니다.

### 1. 지시 전수

| 번호 | 사용자 지시 | 처리 상태 | 결과 | 근거 |
| --- | --- | --- | --- | --- |
| 1 | 누적 저장소·관측 비용 판정 | 완료·분할 커밋 | 2,049개 timeline/복구/관측/root/RSS 기존 상한 통과 | [결과](results.md), `3ca7ea01` |
| 2 | 실제 HTTP·출력2개·hash·재기동 통합 | 완료·분할 커밋 | H01 74/74, I01 35+40+10+46+27, HTTP4초·두 기동·정리 통과 | [결과](results.md), `debeb12e` |
| 3 | 코드 고정·최종 단기·증거 영향 판정 | 완료·분할 커밋 | build·manifest986/986·inventory/docs/version/close-out dry-run 통과, 최초 실패 이력 보존 | [중앙 기록](../../../release-test-records.md) |
| 4 | 분할 커밋 | 수행 | 1·2번은 독립 커밋, 3번은 최종 단기/문서 정합 커밋으로 분리 | Git log |
| 5 | 가능하면 푸시 | 수행 | clean·ahead26/behind0 확인 뒤 승인 범위의 `v4.1.0` 개발 branch를 origin에 동기화. PR/merge/tag/Release는 제외 | Git push·최종 보고 |
| 6 | 종합 보고·잔여 이슈 | 수행 | 아래 7·8절에 릴리즈 전 잔여와 승인 경계 전수 기록 | 이 문서 |

### 2. 기준 대조

| 항목 | 기준 값 | 직접 확인 결과 | 근거 |
| --- | --- | --- | --- |
| branch/VERSION/CMake | `v4.1.0`/`4.1.0`/`4.1.0` | 일치 | `verify-v410-entry-baseline` 33/33 |
| 현재 기능 inventory | 986행·UI424·30분50·120분7 | 986/986, implementation/source/verifier986, manual UI424 | project inventory18/18·semantic negative15/15 |
| 빌드 | 현행 source C++17/GStreamer | runtime98%·server100%, exit0 | `./server.sh build` |
| HTTP·재기동 | 4초·출력2개·기존 보존·새 출력 | 최대3,965ms, 두 기동 각각2개, hash/HTTP200·보존·새 event/job/output | [I01 원출력](b11-current-integration-green.log.gz) |
| cleanup | 프로세스·포트·소유 root 정리 | 실제 통합 서버 exit0·포트4/root 삭제, 최종 8080/8081/8554/8555 LISTEN 없음 | [결과](results.md), `lsof` |
| published/release action | latest published v4.0.0, 별도 승인 | 현행 source v4.1.0·published external-not-checked, PR/merge/tag/Release 미실행 | release metadata18/18·close-out dry-run6/6 |

### 3. 로드맵 대조

| roadmap 항목 | 문서상 상태 | 직접 확인 상태 | 불일치 여부 | 근거 |
| --- | --- | --- | --- | --- |
| S10/B11 저장·관측 구조 | 구현·focused 회귀 완료 | O03 누적과 H01/I01 실제 통합까지 통과 | 없음·로드맵 상단 보완 | [로드맵](../../../v410-v49-recording-search-roadmap.md), [결과](results.md) |
| S11 최종 단기 | 과거 B09 통과 뒤 B11 변경 | B11 최종 build·inventory·semantic·docs·metadata 통과 | 현행 결과로 재고정 | [중앙 기록](../../../release-test-records.md) |
| S11 30분 | B10 이전 코드 PASS | G03 저장 writer 반영 최종 코드에서 2,438초·20회·109 PASS·0 FAIL 재실행 | 해소 | [B11-G01/G03](results.md) |
| S11 UI | B10 공통424+녹화8 ID PASS | 공통424 유지, 영향 녹화8 ID·31 action을 현행 backend에서31 PASS 재실행·메인 시각 적격 | 해소 | [B11-G02](b11-final-ui.md) |
| S11 120분 | B10과 B11 1~9차 실패 이력 | B11 10차 실제7,200.547초·10,093 PASS·0 FAIL, 자원 상한·복구·정리 PASS | 해소·과거 실패 유지 | [B11-G03](b11-recording-120-attempt10.md) |
| S11 최종 로컬 gate | 120분 뒤 잔여 | B12 build·녹화158·auth19/72/146·환경20·inventory986·문서/버전/metadata·close-out PASS | 해소 | [B12](b12-s11-final-local-gate.md) |

### 4. 구현·실행 연결

| 확인 대상 | 실제 파일·route·함수·API·UI·verifier | 확인 결과 | 근거 |
| --- | --- | --- | --- |
| 삭제 이력 저장·복구 | `recording_catalog*`, `recording_journal.cpp`, generation projection/snapshot/identity | 2,049개 삭제 이력·SQLite/JSONL 재개방·손상/ID 의미 유지 | B11-O03 |
| 타임라인·재생 상태 | `recording_timeline_projection.cpp`, `/ops/api/recordings/timeline`, `/media/` | 전체 deleted/nonplayable·total2,049, 실제 HTTP 최대3,965ms | B11-O03·H01/I01 |
| 실제 이벤트 출력 | current app fixture→EventRecord→reference/job→MP4 | 각 기동 완전 출력2개·HTTP200·파일 hash, 두 번째 기동 기존2개 보존 | B11-I01 |
| final inventory | `project-feature-test-inventory.md`·implementation manifest·coverage/script verifier | B11-O03 등록, 기존 986 feature 의미 행 불변·SHA 재결속 | B11-F01/F02 |
| 제품 UI 변경 | `c60d5129..HEAD` 제품 파일 대조 | recording 내부 11개, product UI/CSS/HTML 변경0 | `git diff --name-only` 직접 확인 |

### 5. 근거 분류

| 항목 | 근거 유형 | 근거 | 릴리즈 영향 |
| --- | --- | --- | --- |
| 누적·HTTP·통합 PASS | 프로젝트 직접 확인 | O03/H01/I01 실제 exit·수치·원출력·cleanup | 저장/복구/단기 통합 blocker 해소 |
| generic manifest refresh 실패 | 프로젝트 직접 확인 | items 동일이나 approval envelope 제거, validation6/global992 | 자동 승인 재생성 금지 경계 확인·산출물 폐기 |
| SHA 한정 재결속 | 프로젝트 직접 확인+AGENTS 경계 | inventory의 새 B11 행은 986 feature parser 대상 밖, items 구조 hash 동일 | 기존 semantic approval 유지 가능 |
| 공통 UI424 유지 | 메인 영향 판정 | UI 제품 파일 변경0, exact manifest/semantic986 유지 | 공통 UI 증거 유지; 녹화 UI로 확대 불가 |
| 30분·녹화UI·120분 재실행 | AGENTS 직접 규칙+변경 매핑 | 저장/복구/timeline·source lifecycle 직접 변경 | 릴리즈 전 P0 |
| 외부 서비스·실기기 제외 | 사용자 직접 지시 | 이번 릴리즈 대화 지시 | 실행·PASS 주장·후속 재추가 없음 |

### 6. 테스트 필요성

| 테스트 카테고리 | 판정 | 직접 근거 | 근거 파일·행·기능 ID | 실행 승인 상태 |
| --- | --- | --- | --- | --- |
| 안정화 | 진행 대상 | B11 저장·관측 변경 | B11-O03/H01/I01/F01~03 | 이번 범위 실행·PASS |
| 30분 | 진행 대상 | release 필수+저장/source lifecycle 변경 | inventory 30분50, S11 | 승인·최종 코드 109/109 PASS |
| 공통 UI424 | 미진행(기존 유지) | 제품 UI·exact manifest 의미 변경 없음 | B10 424/424·Policy v4 | 유효 증거 유지 |
| 녹화 UI8 ID·31 action | 진행 대상 | timeline/deleted/playable/재기동 backend 변경 | V410-S06-I27~I34 | 승인·현행 backend 31/31 PASS |
| 녹화120분·자원 | 진행 대상 | 사용자 기존 명시+media/storage/lifecycle 직접 변경+B10 실패 | B10-L01·B11-O03/H01/I01 | 승인·10차 전체 PASS·수동 자원 판정 완료 |
| 공통120분 | 미진행(기존 한정 승계) | B11 변경은 녹화/storage 경계, 공통 불변 구성요소의 기존 80회·409 PASS 유지 | 7.6.2·기존 common120·최종 녹화120분 | 영향 대조 완료, 새 공통120분 불필요 |
| 외부 서비스·실기기 | 미진행 | 사용자 명시 제외 | AGENTS 7.6 | 실행하지 않음 |

### 7. 릴리즈까지 잔여 순서

| 순서 | 우선순위 | 잔여 이슈 | 해야 할 일·완료 기준 | 성격 | 근거 유형 | release action 전·후 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 완료 | 최종30분 안정화 | B11-G03 writer 변경분을 포함한 최종 코드에서 2,438초·20회·109 PASS·정리 PASS | 장시간 검증 | 직접 확인+7.6.2 | 전 |
| 2 | 완료 | 영향받는 녹화 UI 재검증 | B11-G02 I27~I34 31 PASS·시각/권한/재생·정리 적격, 공통424 유지 | 실제 UI | 직접 확인 | 전 |
| 3 | 완료 | 녹화120분·자원 판정 | 10차 실제7,200.547초·10,093 PASS·0 FAIL, HTTP/관측/RSS/root/복구/cleanup 직접 판정 | 장시간/자원 gate | 직접 확인+7.6.2 | 전 |
| 4 | 완료 | S11 최종 증거·release local gate | B12 build·인증·녹화 통합·환경·inventory·문서·버전·증거·clean close-out·cleanup PASS | 증거·로컬 마감 | 직접 확인+AGENTS | 전 |
| 5 | 별도 승인 | PR·CI·main·서명 tag·Release | 각 단계 별도 승인 후 required check→merge→signed annotated tag 검증→GitHub Release/published 확인 | 외부 변경 | AGENTS 4 | 후 |

### 8. 미해소·승인 경계

| 항목 | 상태 | 사유 | 완료 evidence 사용 가능 여부 | 다음 조건 |
| --- | --- | --- | --- | --- |
| 최종30분 | 실행 완료·PASS | G03 writer 반영 뒤 동일30분 재실행 | 가능 | 109행·summary·원출력·정리 보존 |
| 녹화 UI 현행 backend | 실행 완료·PASS | B11-G02 현행 backend에서31 action·시각·정리 적격 | 가능 | 공통424와 결합해432 대상 적격 |
| 녹화120분·자원 | 실행 완료·PASS | 10차 전체120분과 자원 수동 판정 완료, 1~9차 실패 유지 | 가능 | 상세 원출력·정리 보존 |
| 공통120분 승계 | 영향 대조 완료 | 녹화/storage 변경은 녹화120분이 직접 검증, 공통 불변 구성요소는 기존 80회·409 PASS 유지 | 한정 사용 가능 | 새 공통120분 재실행 불필요 |
| S11 최종 로컬 gate | 실행 완료·PASS | B12 승인 범위 전부 통과·정리 완료 | 가능 | 최종 기록 커밋·개발 branch push |
| 개발 branch push | 수행 | 승인된 `v4.1.0`만 origin에 동기화 | release action 완료 증거 아님 | PR·CI·main·tag·Release 별도 승인 |
| PR/CI/main/tag/Release | 미실행·미승인 | 개발 branch push와 별도 | 불가 | 로컬 P0 전부 통과 후 단계별 승인 |
| 외부 서비스·실기기 | 사용자 제외 | 이번 릴리즈에서 안 함 | 외부 PASS 불가 | 후속 대상에서 제외 |

## B11 후속 개발 마감 — 전체 S11 완료 아님

승인된 계약·제품 저장/복구·관측 구조 보완을 분할 커밋했고 관련 focused 검사와 B10 실제
metadata 단기 대조를 통과했다. 현재 결과는 [B11 마감·후속](results.md#b11-o02-실제-보존-자료·마감-판정)을
따른다. snapshot2.10MB·warm 관측40~42ms는 이번 입력의 결과이며, 더 큰 누적/실제 HTTP·
전체 자원·녹화120분은 여전히 남는다. cold 이력 영구 삭제·새 장시간/UI·푸시는 하지 않았다.

## B10 당시 판정 — 녹화120분 첫 실행 이후

후속 사용자 승인으로 B11 계약→제품 저장/복구→관측 구조 보완과 분할 커밋에 착수했다.
현재 진행은 [B11 결과 절](results.md)을 따른다. 아래 B10 표는 실패 직후 판정이며,
새 제품/관측 개선이나120분 완료를 주장하지 않는다. 이번 새 범위에는 푸시를 포함하지 않는다.

B10 실패 직후 기준은 이 절이다. 그 아래 최초 중단 표도 당시 실패 이력으로 보존한다.
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

## B11-G03 120분 8차 및 재개 판정 (2026-09-27)

8차는 두 채널 live 120분·상태 API·저장 상한·정상 종료를 통과했으나 종료 후 삭제
미디어 전수 확인이 고정 15초를 넘겨 최종 FAIL이다. 따라서 녹화 120분·자원·S11
local gate·푸시는 아직 완료 evidence가 아니다.

| 판정 대상 | 직접 확인 | 현재 판정 | 다음 조건 |
| --- | --- | --- | --- |
| 120분 live | duration7,201,978ms, 채널별3,589 finalized·3,587 deleted, HTTP200 | 유효한 부분 증거 | 최종 전체 실행에서도 유지 |
| 종료 snapshot | query 뒤 media에서15,006ms timeout | fail | 삭제 ID 조기 fail-closed 적용 후 전체 재실행 |
| 수정 영향 | 같은 저장소 media3.954초→0.320초, digest·계수 동일 | 집중 pass | 120분 전체 대체 불가 |
| 자원 | 최대769,458,176B, warmup 뒤1.928MiB/min, FD/thread 안정 | 원자료 확보·최종 판정 보류 | 최종 실행의 종료/정리 포함 판정 |
| cleanup | 실패 root·복제본·집중 복제본·원출력 임시본 부재 | pass | 최종 실행도 동일 기준 |

[8차 상세 기록](b11-recording-120-attempt8.md)에 실패 receipt, 집중 검사, SHA-256과
정리 전수표를 보존한다. 현재 재개 순서는 녹화 120분 전체 1회 → 통과 시 S11 최종
로컬 gate이며, 30분·UI 전체를 다시 시작하지 않는다.

## B11-G03 120분 10차 완료와 현재 재개 판정 (2026-09-28)

9차 generation 전환 관측 비용 보완 뒤 10차가 실제 7,200.547초·10,093 PASS·
0 FAIL·exit 0으로 완료됐다. 채널별 finalized3,590/deleted3,588, 상태 API
최대1,017ms, drain 최대1,614.976ms, root413,002,799B/448MiB, partial0이다.

| 판정 대상 | 직접 확인 | 현재 판정 | 다음 조건 |
| --- | --- | --- | --- |
| 녹화 120분 | 실제 duration7,200.547초·표본1,440·기능 실패0 | pass | 최종 gate에서 증거 결속 확인 |
| 자원 상한 | peak RSS794,443,776B/1GiB, warmup 뒤1.4436MiB/min, FD -8·thread -3 | pass | 수치 보존; 무기한 누수 부재로 확대 금지 |
| 저장·지연 | root413,002,799B/448MiB, HTTP1,017ms/4초, drain1,614.976ms/3초 | pass | 기준 유지 |
| 종료·복구·정리 | PID3개 exit0, 포트/UDP 폐쇄, 원본 불변, 복제본·root 부재 | pass | 최종 cleanup 대조 |
| S11 최종 로컬 gate | 미실행 | pending | build·auth·media·inventory·문서·버전·증거 정합 실행 |

상세는 [10차 기록](b11-recording-120-attempt10.md)을 따른다. 현재 순서는 S11 최종
로컬 gate이며, 이미 통과한 30분·UI 전체는 변경 영향 없이 재실행하지 않는다.
