# v4.1.0 릴리즈 잔여 확인 — 보완 진단 시점

## LP29 30분·UI 승인 작업 현재 전수 대조

최신 후속 승인으로 주석 단계 C01~04를 마감했다. [실행 정의·이력](lp29-final-validation.md),
[주석 전수 결과](lp29-comments-summary.json)를 따른다. 최초30분은41.067초·exit1/soak0으로 실패했고
그 원인이던 주석 정책은 보완·재검증 통과했다. 실제30분 재개/UI는 다음 순서이며 PASS가 아니다.

### 지시 전수

| 번호 | 사용자 지시 | 처리 상태 | 결과 | 근거 |
| --- | --- | --- | --- | --- |
| 1 | 주석만 보완·정적·기존 증거 영향 확인 | 완료 | 주석160파일·비주석 동일·결속985승계/1재검토 | LP29-C01~04 |
| 2 | 실제30분→통과 후UI·browser | 실행 대기 | 최초 실패 보존,준비만 완료 | LP29-L/U |
| 3 | 분할 커밋·조건 충족 시push | 주석 단계 커밋 준비 | 전체 범위 완료 전push보류 | 변경목록·실제Git |
| 4 | 종합·릴리즈 잔여 | 아래 전수 대조 | 실측과 제안 구분 | 이 표 |
| 5 | 외부서비스·실기기 제외 | 유지 | 제외·PASS 아님 | 사용자 명시 지시 |

### 기준

| 항목 | 기준 값 | 직접 확인 결과 | 근거 |
| --- | --- | --- | --- |
| branch/source | v4.1.0 / VERSION4.1.0 | 시작2055ed9b/upstream동기 | Git·LP28 |
| 제품/build | LP28실행물 유지 | 주석 raw hash변경·비주석 동일·binary hash불변 | LP29-C02 |
| published/main/tag | 이번 외부release범위밖 | 문서4.0.0유지,현재원격release/CI조회안함 | release policy·범위 |
| 커밋 | 승인된 단계별 분할 | 주석/결속/기록 마감 후 수행 | Git최종보고 |

### 로드맵 대조

| roadmap 항목 | 문서상 상태 | 직접 확인 상태 | 불일치 여부 | 근거 |
| --- | --- | --- | --- | --- |
| S00~08 | 구현·과거검증 | 관련 LP28증거유지 | 없음 | 실제diff |
| S09 | 종료·대체 | 실패이력보존 | 없음 | roadmap |
| S10 | 구현·고정 | 주석 hash변경,동작불변판정 | 원문hash새값주의 | LP29-C02 |
| S11 | 단기/장시간/UI | 기존 전체단기 주장정정,주석보완PASS·30/UI/120잔여 | 정정반영 | LP29 |

### 구현 대조

| 확인 대상 | 실제 파일·route·함수·API·UI·verifier | 확인 결과 | 근거 |
| --- | --- | --- | --- |
| 주석 | verify_code_comments.mjs·160소스 | 1161파일 상단0/영문0,비주석160동일·구문71 | C01~03 |
| 결속 | review4 migration/producer·3fixture | audit1항목/WHEP주석만,985승계·1검토 | C04 |
| 실제30분 | verify_predev_stability.sh main/run_soak_loop | 동일기준1800초·ledger·정리검사예정 | L01~03 |
| UI | test_ui.sh/native424/finalizer visual80 | 계약60PASS·실제실행전 | U01/02 |
| 녹화UI | verify_v410_recording_ui_contract.mjs | managed seed는준비,실제I27~34·seek별도 | U03 |
| browser media | verify-webrtc-va-metadata | 실제video/ICE/DataChannel/metadata필요 | U04 |

### 근거 분류

| 항목 | 근거 유형 | 근거 | 릴리즈 영향 |
| --- | --- | --- | --- |
| 네 영역·전수·정리 | AGENTS 직접 규칙 | 3/5/7/8장 | 필수미실행blocker |
| 주석 보완/결속 | 프로젝트 직접 확인 | diff·전수정적·실행로그 | C단계마감 |
| 기존 단기 유지 | 프로젝트 직접 확인+범위판정 | 비주석/실행물 불변 | 새30분/UI PASS아님 |
| 다음 실행 순서 | 사용자 지시·AGENTS | 30분통과후UI | 순서준수 |

### 테스트 판정

| 테스트 카테고리 | 판정 | 직접 근거 | 근거 파일·행·기능 ID | 실행 승인 상태 |
| --- | --- | --- | --- | --- |
| 안정화 | 진행 대상 | 주석·증거결속 영향 | LP29-C01~04 | 완료·기존 기능증거 유지 |
| 30분 | 진행 대상 | 사용자·버전필수 | AGENTS7.6·FINAL-30 | 승인·재개준비 |
| 실제UI/browser | 진행 대상 | 사용자·버전필수 | AGENTS7.6.3/7.9·LP29-U | 승인·30분통과후 |
| 공통·녹화120분 | 진행 대상 | media/보존·복구 직접매핑 | S11·AGENTS7.6.2 | 이번범위밖 |
| 외부서비스·실기기 | 미진행 | 사용자명시제외 | 최신지시 | 제외·PASS아님 |

### 릴리즈까지 남은 순서

| 순서 | 우선순위 | 잔여 이슈 | 해야 할 일 | 성격 | 근거 유형 | release action 전·후 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | P0 | 실제30분 | duration1800초·반복·전수로그·정리 후 커밋 | 장시간 | 사용자/AGENTS | 전 |
| 2 | P0 | 실제UI·browser | exact424·visual80·녹화/seek·metadata·정리 | UI | 사용자/실행연결 | 전 |
| 3 | P0 | 공통·녹화120분 | 각각 자원/drift·보존/복구·정리 | 장시간 | S11/직접매핑 | 전 |
| 4 | P0/P1 | 최종문서·증적 | 릴리즈노트/출처/대표이미지·증거유효성·커밋/push | 마감 | AGENTS/release policy | 전 |
| 5 | P0 | PR·CI·main | 별도승인·필수CI·병합hash확인 | 외부변경 | AGENTS4 | 로컬gate후 |
| 6 | P0 | 서명태그·Release | 별도승인·서명/GitHubVerified·published | 외부변경 | AGENTS4 | main병합후 |

### 미해소·제외

| 항목 | 상태 | 사유 | 완료 evidence 사용 가능 여부 | 다음 조건 |
| --- | --- | --- | --- | --- |
| 최초30분 | 실패이력보존 | 주석FAIL·soak0 | 불가 | 보완후별도재실행 |
| 현재30분/UI | 미실행 | 단계순서·커밋준비 | 불가 | 승인된순서실행 |
| 전체push | 보류 | 승인범위30분/UI잔여 | 불가 | 검증/기록/정리/clean |
| 120분/외부release | 미실행 | 이번범위밖 | 불가 | 선수gate·해당승인 |
| 외부서비스·실기기 | 명시제외 | 사용자판단 | 불가 | 이번릴리즈잔여로재추가안함 |
| 최초실패정리 | 완료 | PID부재/port재바인딩/소유root삭제 | 정리증거만 | 서버wait exit는미수집 |
| 주석정리 | 완료 | 증거이관 후46파일21,809,115B삭제·root부재 | 정적정리증거 | runtime생성없음 |

## LP28 승인 1~5 전수 대조

이 절은 아래 LP27/이전 진단표보다 최신이다. 1~5번 구현·검증·기록·정리를 마쳤다. Git 값은 마지막
기록 커밋 직전의 스냅샷이며 실제 최종 커밋/푸시 해시는 Git과 최종 보고를 따른다. 릴리즈 완료 판정은 아니다.
직접 근거와 실행 전수는 [LP28](lp28-locator-closure.md), 과거 실패는 원기록으로 보존한다.

### 지시 전수

| 번호 | 사용자 지시 | 처리 상태 | 결과 | 근거 |
| --- | --- | --- | --- | --- |
| 1 | 위치 처리 일관성 | 완료·커밋 | 현재 위치 일관 판정·중복/변경/삭제 거부 | f8ed4546/4a213d5b |
| 2 | 실제 영향·공백 | 완료·커밋 | 오류 serializer25/UI11/WHEP1 보완·재검토. 최초 무공백 판단 정정 | 13d82e46/fa5afd8d·독립 검토02/WHEP13·12 |
| 3 | CLOSE·S10 고정 | 완료·커밋 | 제품287파일 고정·출처/공개 설명 정합·구형 소비자 보존 | 5e5f45d7·source-freeze |
| 4 | 독립 검토·재결속/PREP | 완료·커밋 | 307행 승인/679동등 승계·986정합·반례15/core17/combined3/native60 | fa5afd8d·독립 판정02·LP28 PREP 결과 |
| 5 | S11 단기 | 실행 완료·PASS | 빌드/인증19·72·146/녹화156/환경20/버전33·18/close-out6. 최초문서FAIL→보완PASS | LP28 단기 원출력/개별 결과 |
| 6 | 분할 커밋·조건부푸시 | 분할 커밋 진행·최종 푸시 판정 대기 | 1~4 신규5커밋,5번 마감 커밋 직전. 실패/정리 잔여 없음·원격behind0,최종clean 후 승인된 개발 브랜치 push | Git/LP28 |
| 7 | 외부 서비스/실기기 안 함 | 반영 | 사용자 명시 제외, 조건부 후속에서 제거, PASS 아님 | 최신 요청 |
| 8 | 릴리즈 잔여 전수 | 계속 갱신 | 개발·최종검증·외부 release action 분리 | 아래 전수표 |

### 기준

| 항목 | 기준 값 | 직접 확인 결과 | 근거 |
| --- | --- | --- | --- |
| branch/VERSION/CMake | v4.1.0/4.1.0 | 일치 | entry33·metadata18/소스 |
| published 기준 | v4.0.0 | 공개 문서 기준 유지, 실시간 published 조회 아님 | metadata local |
| HEAD/upstream | 현재개발브랜치 | 단기 실행fa5afd8d, fresh fetch 뒤ahead10/behind0; 마지막 기록 커밋 제외 스냅샷 | git fetch/rev-list exit0 |
| main/tag/PR/CI | 릴리즈 직전 직접 확인 | fresh origin/main431397d9,local4.1tag없음. PR/CI/원격tag·published는 이번 미조회,외부변경 없음 | 승인 범위·git |
| 제품 내용 | 고정287파일 | 새 변경 없음 | lp28-source-freeze.json·git diff src/include/CMake |
| CHANGELOG/NEWS | 루트 문서 | 없음, fixture CHANGELOG는 비대상 | 기존 파일 조사 |

### 로드맵 대조

| roadmap 항목 | 문서상 상태 | 직접 확인 상태 | 불일치 여부 | 근거 |
| --- | --- | --- | --- | --- |
| S00 | 출처·독립 설계 | SQLite 기존사용 notice 정합, 새 외부코드 반입없음 | 없음; 법적 보증 아님 | THIRD_PARTY_NOTICES |
| S01~S08 | 단계 구현 완료 | 현행 recorder/catalog/retention/event/query/UI/metrics 경로 존재, 과거 통합156 증거 | 현재 전체 릴리즈 PASS 아님 | LP25/26·FINAL manifest |
| S09 | 종료·대체 | 최초 실패·수정·증거 보존 | 없음 | roadmap S09 |
| S10 | 제품 고정/PREP 마감 | CLOSE·독립승인·현재검사연결 완료 | 최신요약 반영 | LP28 |
| S11 | 단기완료·전체미완료 | 단기PASS,30분·실제UI·공통/녹화120분 미실행 | 없음 | LP28 단기 원출력/실행 상태표 |

### 구현 대조

| 확인 대상 | 실제 파일·route·함수·API·UI·verifier | 확인 결과 | 근거 |
| --- | --- | --- | --- |
| 위치 일관성 | feature_semantic_evidence_lib/feature_semantic_review4_trust_lib/source_audit | 동일 anchor/context의 현재 위치, 내용/중복/손상 거부 | R4L22·M30·A11 |
| serializer 연결 | OpsSourceHealthJson 등25함수 | 오류분기 대신 성공 schema/실제 HTTP 관측 연결 보완 | PREP-R05 |
| UI 연결 | product_ui scripts·verify_ops_ui_click_e2e | 별도API 별칭 대신 실제조작의 DOM/API helper 연결; 실제실행 아님 | SRC009/RULE10 |
| WHEP | POST /whep·CreateAnswer·session/ice/DELETE | 로컬 검증13self/12actual PASS; RTP/UI/외부 연결 PASS 아님 | MEDIA003/WLS/WLR |
| 복합요구·환경 | recording_preparation_contracts.cpp/gst_environment_actual_probe.cpp | native8/actual94 결과와 현재 source/archive 대조 | LP27 원출력 |
| 현행 녹화 통합 | recording_current_integration_suite.mjs·eventOutputs | 5단계156PASS,각2완전출력/HTTP/hash/두기동/복제본복구·정리,실제요청최대2882ms | FINAL-recording |
| 장시간·UI | current observer/managed seed/exact native browser | 준비 소스 있음, 최종 실행 PASS 없음 | LP26/current observer |

### 근거 분류

| 항목 | 근거 유형 | 근거 | 릴리즈 영향 |
| --- | --- | --- | --- |
| 승인·실패·정리·최종 evidence | AGENTS 직접 규칙 | 3/4/5/7/8장 | 통과 전 release 불가 |
| 검토 결함37·로컬 준비 | 프로젝트 직접 확인 | 독립 판정/실제 원출력 | PREP 선행 보완 |
| 제품·기존 미디어 증거 | 프로젝트 직접 확인 | source digest/binary/hash/codec67·ICE8 | 같은 경계만 유지, 새 전체 PASS 아님 |
| 좁은 보완 후 최종실행 | 추론/제안·승인 순서 | 승인1~5·기존 계약 | 의미 변경 없이 확인된 공백만 보완 |
| 외부검증 제외 | 사용자 직접 지시 | 최신 요청 | 미실행·명시 제외; 릴리즈 기능 증거로 사용 불가 |

### 테스트 필요성 판정

| 테스트 카테고리 | 판정 | 직접 근거 | 근거 파일·행·기능 ID | 실행 승인 상태 |
| --- | --- | --- | --- | --- |
| 안정화 focused/PREP | 진행 대상 | 위치/37공백/준비 수정 | LP28 R4L/PREP/WLS/WLR | 이번 승인 |
| S11 단기 | 진행 대상 | 5번·고정 코드 최종 묶음 | LP27 FINAL manifest/LP28 결과 | 이번 승인·실행PASS |
| 30분 | 진행 대상 | 버전 필수 | AGENTS7.6/roadmap S11 | 이번 실행 범위 밖 |
| 실제 UI·browser media | 진행 대상 | exact UI/영상·metadata 변경 | AGENTS7.6.3/7.9·MEDIA003·D08 | 이번 실행 범위 밖 |
| 공통120분 | 진행 대상 | source lifecycle/media/cleanup 직접변경·기존명시승인 | AGENTS7.6.2·gst_decode_compatibility/RTSP paths | 이번 실행 범위 밖 |
| 녹화120분 | 진행 대상 | 보존/복구·장시간 관측 직접매핑 | verify_v410_recording_longrun.sh·S11 | 이번 실행 범위 밖 |
| 외부 서비스·실기기 | 미진행 | 사용자 명시 제외 | 최신 요청 | 실행하지 않음 |

### 공개까지의 순서

| 순서 | 우선순위 | 잔여 이슈 | 해야 할 일 | 성격 | 근거 유형 | release action 전·후 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | P0 | 30분 | 고정코드 실제duration/iteration/cleanup | 장시간 | AGENTS/S11 | 전 |
| 2 | P0 | 실제 UI/브라우저 미디어 | exactID·role/viewport/theme/시각/영상/metadata,대표이미지의 실제UI대조 | UI | AGENTS/S11 | 전 |
| 3 | P0 | 공통·녹화120분 | 자원/지속영상/보존/복구/drift/cleanup.각 결과별판정 | 장시간 | 직접매핑/규칙 | 전 |
| 4 | P0/P1 | 최종정합 | v4.1 릴리즈노트/출처/source-only/증거유효성·최종cleanup·commit/push | 마감 | AGENTS/release policy | 전 |
| 5 | P0 | 승인된 PR·CI·main | 별도 승인 후 PR/필수CI·merge 대상hash확인 | 외부변경 | AGENTS4 | 로컬gate뒤 |
| 6 | P0 | 서명tag·Release | 별도 승인·signed annotated/검증·published확인 | 외부변경 | AGENTS4 | merge뒤 |

30/120 공통 실행은 `verify-v390-server-longrun`의 실제 `verify-predev --soak-minutes`
위임(해당 runner397행)과 원출력/summary를 함께 남기는 방식으로 다음 실행 시 명령을 확정한다.
wrapper 자체나 fixture PASS로 duration을 대체하지 않고 두 runner를 같은 시간으로 중복 실행하지 않는다.

### 미해소·제외

| 항목 | 상태 | 사유 | 완료 evidence 사용 가능 여부 | 다음 조건 |
| --- | --- | --- | --- | --- |
| PREP 원장 | 완료 | 기각 보완·독립검토·gate 통과 | 해당 source 결속에만 가능 | 실제 UI/장시간으로 확대 금지 |
| S11 단기 | 완료 | 승인FINAL manifest 실행,문서실패보완·소유93,498,346B정리 | 단기 범위만 가능 | 후속 장시간·UI와 구분 |
| UI/30/120 | 미실행 | 이번 단기범위 밖 | 불가 | 고정코드·실행순서확인 |
| 외부 서비스/실기기 | 명시 제외 | 사용자 실행 안 함 | 불가 | 임의 후속조건으로 되살리지 않음 |
| PR/CI/main/tag/Release | 미실행·미확인 | 각각 실행승인 필요 | 불가 | 로컬gate·별도승인 |
| 새 검색 기능 | 비범위 | v4.2 이후 로드맵 | 불가 | 후속버전 지시 |

최신 승인 순서는 [LP28](lp28-locator-closure.md)의 위치 판정→실제 변경/공백→CLOSE·고정→
독립 재결속/PREP→S11 단기다. 외부 서비스·실기기 검증은 사용자 명시 제외이며 완료 PASS가 아니다.
아래 LP27 전수표는 이전 실행 결과를 보존한다. 그 표의435ID 선행 재결속·외부 조건부 실행 제안은
최신 순서가 아니다. 일반 role의 파일 해시는 hard 비교에서 제외되며 함수/블록 변경과 낡은 위치를
분리해야 한다. 이번 상태와 최종 전수표는 LP28 결과로 갱신한다.

최신 사용자 승인으로 진단 신뢰성→HW03→PREP→CLOSE→S11단기 1~5를 진행한다.
[현재 계약·결과](lp27-release-preparation.md#현재-승인-진단-신뢰성부터-s11-단기-안정화까지-15)가 아래 이전 전수표보다 최신이다.
1번은 실제 FFmpeg wrapper 인식 결함을 보완하고 CPD24·HTTP8·응답/stream6개 대응 및 정리를 통과했다.
2번은 codec67·ICE8·정상종료/정리를 통과해 현재 HW03 영향 범위를 마감했다. native99/81은 동일 source hash로 유지했다.
과거 미재현 실패는 그대로 보존하며 현재 정식 회귀가 통과하면 HW03 영향 범위로 닫기로 기준을 확정했다.
아래 **진단 완료·재개 판단 대기·3~6 건너뜀**은 이전 시점 상태이며 최신 완료/승인 판정이 아니다.

## LP27 1~5 승인 작업의 최신 전수 대조

이 절이 아래 과거 표보다 최신이다. 독자: 개발/릴리즈 담당자. 수명: PREP 검토 원장 재결속부터
v4.1.0 공개 전까지. 실행 근거는 [LP27 기록](lp27-release-preparation.md), 정책은 AGENTS.md다.
이번 읽기 상세 판독은 approval을 생성하거나 기존 실패를 PASS로 바꾸지 않았다.

### 사용자 지시 전수

| 번호 | 사용자 지시 | 처리 상태 | 결과 | 근거 |
| --- | --- | --- | --- | --- |
| 1 | 진단 신뢰성·미재현 기준 | 완료·커밋 | CPD24/AST2/실제HTTP8, wrapped 응답6건 대응, 원래 deadline·stdout 유지 | 05fb43ef |
| 2 | HW03 영향 마감 | 완료·커밋 | 실제 codec67/ICE8, 정상 종료·소유14경로 정리; native99/81 동일 source 증거 유지 | 76af0602 |
| 3 | PREP01 | 부분 완료·중단 | 복합8/환경94 PASS·41요구 고정등록/manifest. 기존 독립 증적 결속435ID 실패 | lp27-inventory-drift.json |
| 4 | CLOSE01·S10 고정 | 건너뜀 | 3번 선수조건 실패. 구형 삭제·고정 하지 않음 | AGENTS3/8 |
| 5 | S11 단기 안정화 | 건너뜀 | 3·4 미완료, final manifest만 준비 | LP27 manifest |
| 6 | 분할 커밋·조건부푸시·종합/잔여 | 부분 수행 | 신규2커밋. 미해결3번 미커밋, 조건부push 불가/미수행. 전수보고 작성 | git/아래 표 |

### 기준

| 항목 | 기준 값 | 직접 확인 결과 | 근거 |
| --- | --- | --- | --- |
| branch/HEAD | v4.1.0 | 76af0602d, 3번 소스/기록 dirty | git status/log |
| upstream | origin/v4.1.0 | f4e58b9cb2efbeec43a7e1132da940fce6afd521, ahead5/behind0 | 이번 git ls-remote exit0 |
| source/build | 4.1.0 | VERSION:1/CMake:3/cache:140 일치 | 직접 읽기 |
| main/tag | 별도 release action | main431397d9b86af69f1690aff6fa6f3e61ea4fbe03, local/remote v4.1.0 tag 없음 | git tag/ls-remote |
| 제품 불변 | HW02 이후 | 이번 src/include/CMake 변경0, media binary SHA2ce43399…9fd7 | diff/실제 run environment |
| release/CI/PR | 최신 공개·검사 분리 | 문서상 v4.0.0. 이번 GitHub API/CI 미조회, CI PASS 아님 | release-policy/미실행 |
| source-only/CHANGELOG | 현행 공개 정책 | source-only, 루트 CHANGELOG/NEWS 없음; test용 fixture CHANGELOG는 릴리즈 문서 아님 | release-policy·rg --files |
| 지침/모델 | 메인 책임·단일 담당 | Astra/medium 단일 담당 재사용, 하위 없음. 실제 모델 변경 주장 안 함 | AGENTS1.3·위임 기록 |

### 로드맵 대조

| roadmap 항목 | 문서상 상태 | 직접 확인 상태 | 불일치 여부 | 근거 |
| --- | --- | --- | --- | --- |
| S00 | 조사/계약 | 이번 외부 코드·패키지·특허 도입 없음 | 새 법적 보증 아님 | 변경목록 |
| S01~04 | 기존 단계 구현 | 41요구→정확 assertion 연결, 부족 복합8 보완. 기존986 검토 원장 실패 | 단계 이력과 최종 gate 분리 | LP26 최신 보완·PREP |
| S05~08 | 기존 단계 구현/검증 | 기존 LP25 통합156·LP26 준비436는 해당 source/범위의 과거 증거 | 최종 새 PASS 아님 | 기존 원출력 |
| S09 | 종료·대체 | 실패·수정 이력 보존 | 일치 | roadmap S09 |
| S10 | 부분 완료 | HW03 마감, PREP 원장 재결속·CLOSE/고정 남음 | 최신 요약 정합 반영 | LP27/roadmap |
| S11 | 미실행 | final 실행 목록 준비, 실제 최종 묶음/30/UI/120 미실행 | 일치 | manifest·AGENTS7 |

### 구현 대조

| 확인 대상 | 실제 파일·route·함수·API·UI·verifier | 확인 결과 | 근거 |
| --- | --- | --- | --- |
| 실제 RTSP 진단 | codec_probe_diagnostics.py Trace/collect; verify_codec_matrix.sh | wrapped/bare·불완전·stdout 계수 분리. 응답 없음으로 오해하지 않음 | CPD24/HTTP8 |
| 현재 미디어 회귀 | verify_recording_media_impact.mjs --run | codec67→ICE8 PASS. timeout 불변·정리, 외부3 미실행 | lp27-hw03-media-02.log |
| 초기/중복 ID | lp26-current-execution-map.md 2/3절·inventory | 41개 요구 고정등록; D/J qualified context 유지 | 읽기 대조·문서 |
| 복합 녹화 경계 | recording_preparation_contracts.cpp Unwritable/Cached/Blocked/Failover | 실제 권한·SharedStream·managed writer·SQLite→동일archive8PASS | lp27-prep-contracts.log |
| 실제 환경 | verify_gst_environment_actual.sh/gst_environment_actual_probe.cpp | 실제 cold/warm·44inspect·44make·READY·decode94PASS | lp27-env12-actual.log |
| 기존 검토 기준 | project_feature_implementation_evidence.json/feature_semantic_evidence_lib.mjs | 986행 중435 영향, 전체1,067오류. 제품 기능 실패 개수 아님 | lp27-inventory-drift.json |
| UI-001 범위 | WebRtcHttpServer::Start·RoleLandingPath·verify_auth_workflow.sh | auth assertion1427은 내용 유지, 단순 이동 허용. blob 변경과 구분 필요 | agent 읽기 대조·6ab2f61ce |
| actual 앱 통합 | recording_current_integration_suite.mjs currentSteps | 35/40/10/46/25 oracle 준비, 이번 최종 실행 안 함 | LP26 4절·LP27 manifest |
| 장시간/UI | current observer/longrun/current UI seed | 준비 완료 범위 유지. 실제 브라우저·duration evidence 미실행 | LP26 5절 |
| 구형 fixture | test/fixtures/recording/v1 8개 | compatibility/longrun legacy/S05 registry 참조 존재. 이번 삭제 안 함 | rg 참조, CLOSE는 건너뜀 |

### 근거 분류

| 항목 | 근거 유형 | 근거 | 릴리즈 영향 |
| --- | --- | --- | --- |
| 실제 진단·HW03/PREP 단기 | 프로젝트 직접 확인 | 개별 원출력/환경/source/exit/정리 | 각 범위만 PASS |
| 기존 원장 drift | 프로젝트 직접 확인 | 상세validator ok:false·435ID·1067오류 | 최종 인벤토리 gate blocker |
| 과거 HTTP/제공기 실패 | 미확정 이력 | 현재 정식 회귀 통과, 당시 원인 자료 불충분 | 과거 해결 주장 금지; 정한 진행 기준으로 HW03 현재 마감 |
| 권한창과 과거 실패 인과 | 추론 후보 | 사용자 설명만, 정확 앱/권한 미확인 | 권한 탓 확정 금지 |
| 중단·커밋/푸시 보류 | AGENTS 직접 규칙 | 1.2/3.3/5/8, 기존 독립 승인 자동 생성 금지 | 3번 확대 범위 결정 전 뒤 단계 금지 |
| 변경 행 독립 재검토 | 추론/제안+기존 절차 | strict-equivalence carry-forward와 independent decision producer | 기존 승인 대량 덮어쓰기 대신 exact delta 검토 |
| 자원 영향 | 직접 확인+한계 | native whole-graph CPU 약+42.9%/90frames | 채널capacity·누수/장시간PASS 아님 |

### 테스트 판정

| 테스트 카테고리 | 판정 | 직접 근거 | 근거 파일·행·기능 ID | 실행 승인 상태 |
| --- | --- | --- | --- | --- |
| 진단/미디어/PREP focused | 진행 대상 | 요청1~3 | CPD01~24/HW-A04/PREP-C01~08/ENV12 | 실행 완료, 해당 PASS |
| 검토 원장 정합 | 진행 대상 | PREP 연결·최종 gate | verify-project-inventory·986 manifest | 기존 gate 실행 FAIL;435행 독립 재결속은 확대 범위 판단 필요 |
| CLOSE 정리/기록 | 진행 대상 | 요청4 | roadmap S10·기존 fixture 사용처 | 승인 유지,3번 미충족으로 건너뜀 |
| S11 단기 | 진행 대상 | 요청5·로드맵 | LP27 FINAL-build/auth/recording/entry/metadata/docs 등 | 승인 유지, 선수 미충족 |
| 30분 | 진행 대상 | 버전 필수 | AGENTS7.6/S11·verify-predev30 | 이번 실행 제외, 필수 blocker |
| 실제 UI/브라우저 media | 진행 대상 | 버전 필수·S10-D08·media변경 | Policy v4 exact case·verify-webrtc-va-metadata | 이번 명시 제외, 면제 아님 |
| 공통120분 | 진행 대상 | media/lifecycle 변경·이전 명시승인 | LP27-M/R·AGENTS7.6.2 | 이번 미실행, 재개 시 범위/유효승인 확인 |
| 녹화120분 | 진행 대상 | 녹화/보존/복구 직접 매핑 | LP26-O05·current longrun runner | 이번 미실행, 공통과 대체 불가 |
| 외부TURN/WHEP/cloud/실기기 | 조건부 진행 | 환경·credential·endpoint 필요 | AGENTS4/7 | 미제공·미실행, 기본PASS 아님 |
| PR/CI/tag/Release | 미진행 | 로컬 필수gate 미완료·각승인 없음 | AGENTS4 | 별도 승인 대상 |

### 릴리즈 잔여 개발 순서

| 순서 | 우선순위 | 잔여 이슈 | 해야 할 일 | 성격 | 근거 유형 | release action 전·후 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | P0 | PREP 독립 검토 원장 재결속 | 승인된 확대 범위에서435ID exact delta와 나머지 엄격 동등성 분리. locator/oracle94건 원인별 대조→단일 독립 검토→원자 migration. 단순hash치환 금지 | 증적/검증 준비 | 직접확인+제안 | 전 |
| 2 | P0 | PREP 마감 | 동일 inventory gate를 완전 로그 보존 방식으로 재검증, script/doc gate, 요구41·기능986·UI424 경계 확인, 해당 커밋 | 관련 단기검증/기록 | 직접확인+규칙 | 전 |
| 3 | P0/P1 | CLOSE01·S10 고정 | 구형 코드/데이터 소유·실제 소비자·대체 검사 확인 후 필요한 반례/이력 보존, 불필요 부분만 제거, 문서·출처/NOTICE·evidence validity 고정 | 정리/고정 | roadmap+규칙 | 전 |
| 4 | P0 | S11 최종 단기 안정화 | 고정source build/auth/현행156통합/환경/entry/metadata/inventory/docs/closeout; 동일 HW03 결과는 hash/환경 유지 시 재사용 | 최종 단기 | roadmap+요청5 | 전 |
| 5 | P0 | 실제30분·UI | 단기통과 후30분→실제UI. auth/viewport/theme/재생·overlay·시각·metadata 브라우저 잔여와 cleanup 확인 | 필수 최종검증 | AGENTS7·S11 | 전 |
| 6 | P0 | 공통/녹화120분 | 두 목적의 실제duration·resource/drift·녹화순환/재기동/종료. CPU 상승·자원review 마감 | 필수 장시간 | 직접변경+로드맵 | 전 |
| 7 | P0 | 버전·문서·증거 최종 마감 | 최종 결과/실패·제외·cleanup/버전metadata 일치, 승인 범위 커밋·push. 공개이미지는 실제UI검토 후 | 준비/개발push | AGENTS4/5/12 | PR/공개 전 |
| 8 | P0 | 공개 절차 | 별도 승인된 PR/CI→main merge→hash확인→서명annotated tag/Verified→source-only Release→published검증 | 외부 변경 | AGENTS4 | gate/각승인 이후 |
| 9 | P2 | 외부 환경·실기기 | 제공된 환경/자격증명·명시승인 있을 때 수행, 없으면 이유와범위제외. 로컬필수gate 대체 금지 | 조건부 | AGENTS4/7 | 조건 충족 시 |

### 미해소 상태

| 항목 | 상태 | 사유 | 완료 evidence 사용 가능 여부 | 다음 조건 |
| --- | --- | --- | --- | --- |
| 1/2 신규커밋 | 완료 | 05fb43ef·76af0602 | 해당 범위만 가능 | 보존 |
| 3 준비8/환경94 | 실행PASS·미커밋 | 인벤토리전체gate 실패와 구분 | 해당 exact scope 가능, PREP전체불가 | 재결속/관련gate |
| 인벤토리 | FAIL | 435ID 결속불일치, 일부oracle미결속 | 불가 | 범위결정/독립검토/재검증 |
| CLOSE·S11 단기 | 건너뜀 | 3번 선수 미충족 | 불가 | 위 순서 |
| 30/UI/120 | 미실행 | 이번 범위밖, release 필수 | 불가 | 단기통과/승인확인 |
| cleanup | 완료 | 모든 이번 실제검사root/port 및 이관root 부재 확인 | 각실행정리 가능 | 다음실행은별도 |
| dirty/push | 보류 | 필요한3번 소스/기록 미커밋, ahead5 | push가능 아니오/미수행 | 승인 범위 마감 |
| PR/CI/main/tag/Release | 미실행/미확인 | gate·각승인 미충족 | 불가 | 최종gate와별도승인 |
| 과거 실패 | 이력보존·원인미확정 | 현재회귀PASS가 과거원인증명은아님 | 과거PASS로불가 | 새근거생길때해당경로분석 |
| 원출력 상한 | 일부출력미보존 | 최초inventory 도구출력잘림 | 전수PASS증거로불가 | 재실행때파일수집/전수행대조 |

token start/end/consumed는 전용 집계 없어 미집계다. 각 실제elapsed/source는 LP27 원출력 참조.
이번 감사는 관련 문서/소스 대조이며 전체 저장소 모든 문서 전문 리뷰가 아니다.

## LP27 HW-03 중단 후 현재 전수 대조

독자: 개발·릴리즈 담당자. 수명: HW03 미재현 실패 판정과 PREP/CLOSE/S11 재개까지.
정책은 AGENTS.md, 실행은 [최신 LP27 기록](lp27-release-preparation.md#2번-판정-한정-비교-통과와-과거-원인-미확정)이 기준이다.
이 표는 최신1~6 결과로 갱신했다. 과거 실제23PASS/2FAIL과 당시 증거는 LP27 원출력/기록에 보존하며,
새로운 제한 검사 PASS가 과거 원인을 확정하거나 전체 HW03 완료를 뜻하지 않는다.

### 현재 사용자 지시 전수

| 번호 | 사용자 지시 | 처리 상태 | 결과 | 근거 |
| --- | --- | --- | --- | --- |
| 1 | 진단 준비 보완 | 완료·커밋 | CPD18/HWD4·구문·등록12·문서/공백 통과 | 330e48ad·LP27 진단1번 |
| 2 | 한정 원인 구분 | 실행 완료·원인 미확정 | provider2, HTTP8, 파일20→HTTP8 모두 PASS. 원인 해결이 아니라 미재현 | LP27 HW-A01~03 |
| 3 | 확정원인 수정·HW03 마감 | 건너뜀 | 추측 제품수정·추가 전체반복 안 함. codec67/ICE8 마감 미실행 | AGENTS3.3/8 |
| 4 | PREP-01 | 건너뜀 | 초기ID·복합 요구·실제ENV12·최종manifest 잔여 | LP26 매핑 |
| 5 | CLOSE-01 | 건너뜀 | 구형정리·문서·증거 유효성·S10 고정 미완료 | roadmap S10 |
| 6 | S11 단기 안정화 | 건너뜀 | 이번 승인 있으나 선수조건 미충족. 30분/UI/120분 승인으로 확대 안 함 | 최신 승인표 |
| 7 | 분할커밋·조건부push·종합/잔여보고 | 부분 수행 | 신규330e48ad, 이후 미해소 기록/변경 보존. push불가·미수행 | AGENTS3/5/6·아래 상태 |

### 현재 기준

| 항목 | 기준 값 | 직접 확인 결과 | 근거 |
| --- | --- | --- | --- |
| branch/HEAD | v4.1.0 | 330e48ade62fd9b335d5c22ac7edac6716d70232·dirty | git status/rev-parse |
| upstream/원격 | origin/v4.1.0 | f4e58b9cb2efbeec43a7e1132da940fce6afd521·ahead3/behind0 | 이번 git ls-remote exit0 |
| 버전/build | 4.1.0 | VERSION:1·CMakeLists:3·CMakeCache:140 일치 | 직접 읽기 |
| 원격main/tag | main431397d9 | v4.1.0 remote tag 없음 | 이번 git ls-remote exit0 |
| 제품/binary | HW02 이후 제품 불변 | src/include/CMake diff0, binary SHA2ce43399…9fd7 동일 | 세 actual environment |
| Release/PR/CI | 별도 공개 승인 | 기존 API latestv4.0.0/PR0/run0, 이번 API 재조회 안 함 | 이전 LP27 감사, 현재 CI PASS 아님 |
| 공개 범위/변경기록 | source-only | release-policy:20~29 binary/model 제외. 루트 CHANGELOG/NEWS 없음 | 이전 파일조사·현재 정책 읽기 |

### 현재 로드맵 대조

| roadmap 항목 | 문서상 상태 | 직접 확인 상태 | 불일치 여부 | 근거 |
| --- | --- | --- | --- | --- |
| S00 | 조사/설계 | 이번 외부 패키지·특허·외부코드 도입 없음 | 새 법적 보증 아님 | 이번 diff |
| S01~04 | 기존 구현·단계확인 | 현재 초기 요구 exact ID/검사 연결 보완 잔여 | 당시 완료와 최종 전수 연결 구분 | LP26 매핑2·7절 |
| S05~08 | 기존 구현·단계확인 | LP25 통합156·LP26 준비436의 해당 범위 증거 유지 | HW/S11 전체PASS로 확대 금지 | currentSteps·기존 원출력 |
| S09 | 종료·대체 | 실패/수정 이력 보존, 성공완료 아님 | 일치 | roadmap238행 |
| S10 | 부분 완료 | HW03 영향 마감·정리·고정 남음 | 일치 | roadmap239행·현재 결과 |
| S11 | 계획·미실행 | 최종 안정화/30분/UI/120분 미실행 | 일치 | roadmap240·313행 이후 |

### 현재 구현·검증 연결

| 확인 대상 | 실제 파일·route·함수·API·UI·verifier | 확인 결과 | 근거 |
| --- | --- | --- | --- |
| HW02 선택 | gst_decode_compatibility.cpp:11 ShouldSkipAppleH264Decoder·:100 InstallDecodeCompatibility | exact macOS/applemedia1.28.1/H264 후보만 객체별 제외. 이번 불변 | HW02 committed source |
| 실제 적용 | source_factory.cpp:1579·gstreamer_rtsp_server.cpp:214 | URI/RTSP media 각각 hook | source 읽기 |
| HW03 native | recording_hw_impact_probe.cpp --regression-impact | 기존 self99/native81 PASS. 실제 codec/ICE 전체 아님 | impact04/self04 |
| 진단 수집 | codec_probe_diagnostics.py collect/Trace/append·verify_codec_matrix.sh | opt-in 고정 계수·launcher state·기존 deadline, unknown 보존 | CPD18 |
| 제한 실행 | verify_recording_media_impact.mjs selectedMode/commandPlan | providers2→HTTP8→prefix28 통과, --run 미실행 | HWD4·HW-A01~03 |
| 과거 RTSP 실패 | HTTP H264/AAC /dhseo/h264 | 현재 단독1.845초/파일후2.018초·exit0. 과거20초 실패 원인 미확정 | 세 로그 대조 |
| 과거 제공기 실패 | start_local_http_launcher | 현재 LISTEN/HTTP/종료 관측 성공. 과거 PID 상태는 복원 불가 | JSONL launcher state |
| trace 한계 | Trace.response_classes/discovered_stream_lines | 실제 인식0은 응답없음 증거 아님. method/SDP 인식, 첫RTP 미관측 | diag JSONL·unknown count |
| 실제 ICE/metadata | verify-webrtc-ice·verify-webrtc-va-metadata | 이번 미실행. signaling PASS와 별개 | commandPlan·AGENTS7.4 |
| 현재 녹화 통합 | recording_current_integration_suite.mjs:7 currentSteps | 이전35/40/10/46/25. 이번 무관 재실행 안 함 | LP25 로그·LP26 매핑4절 |
| 준비 연결 | lp26-current-execution-map.md·verify_gst_environment.sh:15 | 초기ID/복합요구·ENV12 실제 영속 경로 공백. 환경wrapper는 fixture | 직접 읽기 |
| 구형/UI·장시간 | test/fixtures/recording/v1 8개·현재 UI seed/current observer | 삭제 승인 범위의 사용처 대조·최종manifest 잔여. actual UI/longrun 미실행 | 파일목록·LP26 매핑5~7절 |

### 현재 근거 분류

| 항목 | 근거 유형 | 근거 | 릴리즈 영향 |
| --- | --- | --- | --- |
| 단계 중단·푸시 보류 | AGENTS 직접 규칙 | 3.3/5.2/8: 원인 미확정·미커밋 | 3~6 자동 진행 안 함 |
| CPD/HWD·세 실제 비교 | 프로젝트 직접 확인 | 원출력·고정 진단·exit/cleanup | 해당 검사만 PASS |
| 과거 두 실패 원인 | 미확정 | 과거 단계별 관측 부족·현재 미재현 | 해결완료로 닫지 않음 |
| 권한창 영향 | 추론 후보 | 사용자의 뒤늦은 허가 설명, 앱/권한 종류 미확인 | 권한 탓으로 확정 금지 |
| 계측의 타이밍 영향 | 한계·추론 | 이번 trace opt-in·진단 수집 추가 | 비계측 race 배제 불가 |
| 자원 영향 | 프로젝트 직접 확인+한계 | 기존 native whole-graph CPU 약+42.9%/90frame·순차 샘플 | 장시간·채널capacity/누수 PASS 아님 |
| 아래 순서 | 추론/제안 | 미확정 판정→HW마감→준비→고정→최종gate | 저장소 무관 재설계 불필요 |

### 현재 테스트 필요성 판정

| 테스트 카테고리 | 판정 | 직접 근거 | 근거 파일·행·기능 ID | 실행 승인 상태 |
| --- | --- | --- | --- | --- |
| 진단 자체/한정 비교 | 진행 대상 | 최신1~2 | CPD01~18/HWD01~04/HW-A01~03 | 실행 완료. 원인 확정과 구분 |
| HW03 codec/ICE 영향 | 진행 대상 | HW02 media 선택 변경·과거 실패 | HW-A04·source_factory1579·RTSP214 | 승인 유지, 미확정 판정 뒤 재개 |
| PREP/CLOSE 단기 | 진행 대상 | 최신4~5 | LP26 매핑2/6/7 | 승인 유지, 선수 미충족 |
| S11 최종 안정화 | 진행 대상 | 최신6·S10 고정 후 필수 | build/Auth/media/currentIntegration/ENV/metadata/inventory/closeout | 이번 승인, 아직 건너뜀 |
| 30분 | 진행 대상 | 버전 필수 | AGENTS7.6·S11 | 이번 실행 제외·별도 최종승인 |
| UI 풀테스트 | 진행 대상 | 버전 필수·S10-D08 | exact control/role/viewport/theme/영상 | 이번 제외, 릴리즈 면제 아님 |
| 공통·녹화120분 | 진행 대상 | media/lifecycle 직접변경·로드맵 | LP27-M/R·LP26-O05·S11 | 별도 최종승인, 상호대체 불가 |
| 외부서비스/실기기 | 조건부 진행 | endpoint/credential 필요 | AGENTS4/7 | 미제공·미승인 |

### 현재 릴리즈 잔여 순서

| 순서 | 우선순위 | 잔여 이슈 | 해야 할 일 | 성격 | 근거 유형 | release action 전·후 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | P0 | 미재현 실패의 처리 판정 | 당시 권한 정보 확인. 기존 실패를 미확정으로 유지한 채 진단을 켠 HW03 회귀로 넘어갈지 사용자 판단. 같은 비교 반복/추측수정 금지 | 원인·범위 판단 | 직접확인+제안 | 전 |
| 2 | P0 | HW03 영향 마감 | 승인된 재개 조건에서 codec67/ICE8, 실패 시 확보된 단계 근거로 해당 경로만 보완. CPU/지원범위·정리 확인 | 관련 개발/회귀 | 직접확인+정책 | 전 |
| 3 | P0 | PREP-01 연결 | 초기 정식ID/복합요구 exact검사·실제 ENV12·최종 UI/장시간/focused manifest 완성 | 준비 개발 | 직접확인 | 전 |
| 4 | P0/P1 | CLOSE-01·S10 고정 | 구형 사용처/대체검사/소유 확인, 불필요한 부분만 정리. 문서·출처/NOTICE·source-only·증거 유효성 확정 | 정리/고정 | 직접확인+정책 | 전 |
| 5 | P0 | S11 최종 안정화 | 고정source build/Auth/media/녹화통합/환경·entry/metadata/docs/inventory/closeout. 현재 준비PASS로 대체 안 함 | 최종 단기 실행 | 정책+로드맵 | 전 |
| 6 | P0 | S11 30분·UI·120분 | 안정화 뒤 승인된30분→실제UI→공통/녹화120분, 자원·재생·종료·정리 완료. 이번 미실행 | 최종 장시간/UI | 정책+로드맵 | 전 |
| 7 | P0 | 개발 마감·공개 절차 | 미해결 범위 정리·분할커밋/조건부push. 별도승인 PR/CI→main merge→서명tag→source-onlyRelease→published검증 | 외부 변경 | AGENTS 직접규칙 | 필수gate 뒤. 개발push는 범위조건 |
| 8 | P2 | 외부 조건 | 실기기/endpoint/provider 제공·승인 시 별도 확인, 없으면 명시적 제외. 로컬 필수검증 대체 불가 | 조건부 | 정책+환경 | 조건충족 시 |

### 현재 미해소 상태

| 항목 | 상태 | 사유 | 완료 evidence 사용 가능 여부 | 다음 조건 |
| --- | --- | --- | --- | --- |
| HW01/02·진단1번 | 개별완료·커밋 | d3d0dbc6/d5a0710b/330e48ad | 각 범위만 가능 | 영향 마감 별도 |
| 현재 실제 비교 | PASS·과거 원인 미확정 | 2/8/28 모두통과, 과거 실패 재현 안 됨 | 각 검사만 가능, HW03 전체 불가 | 미재현 처리 판단 |
| HW03/PREP/CLOSE/S11 | 미완료/건너뜀 | 선수 미해소 | 불가 | 위 순서 |
| LP25/26 | 기존 한정 증거 유지 | 이번 storage/API/auth/제품 바이트 불변 | 과거 범위가능·최종전수 불가 | 코드고정 때 diff/환경 대조 |
| cleanup | 완료 | 두 서버정상종료·TCP/UDP폐쇄·실행3root/6로그/1unitroot 삭제 | 해당 cleanup 가능 | 다음 실행 별도 소유 |
| 미커밋 | 보존 | native 회귀2파일·runner 로그권한2줄·진단/기록. 불필요 변경 아님 | 완료커밋/전체PASS로 사용불가 | 미해소 범위 마감·분할커밋 |
| push | 불가·미수행 | 원인 미확정·미커밋, ahead3 | 원격 반영완료 아님 | 승인 범위 조건 충족 |
| PR/CI/merge/tag/Release | 미수행/미확인 | 로컬필수gate·각 승인 미충족 | 불가 | 별도 승인과 gate |
| 외부조건 | 조건부 | 환경/자격증명 미제공 | 기본PASS 아님 | 조건·승인 |

token start/end/consumed는 전용집계 미제공. 각 actual elapsed/source/실패·미실행은 LP27 기록.
이번 전체문서 전문리뷰나 최종검증을 했다는 보고가 아니다. 원격조회는 읽기만, 푸시는 하지 않았다.

## LP27 후속 승인 — HW-01 원인 판정 완료

최신 승인 순서는 HW-01 → HW-02 → HW-03 → PREP-01 → CLOSE-01이며, 통과 단위 분할 커밋과
조건 충족 후 개발 브랜치 push다. 아래 전수표의 `선택 정책 결정 대기`·`1~4 건너뜀`은 이전 실행 이력이다.
HW-01은 진단03에서 normal burst/paced 정상과 B-frame burst/paced 실패를 모두 완전하게 관측했다.
EOS drain 중 늦은 callback → 낮은 PTS의 finish → 기저 디코더 시간값 보정 → overlay 전달까지
직접 연결했다. 이는 원인 진단 완료이며 제품 해결 완료가 아니다. 자체07의 50개 assertion은 PASS다.
HW-02는 macOS/applemedia1.28.1/H264의 해당 자동선택 후보에 한정한 보완을 적용하고,
HW-03에서 반례·다른 입력 코덱·자원 영향을 확인할 예정이다. 전역 rank·설치 패키지·입력 시간값은 바꾸지 않는다.
HW-02의 한정 정책 구현과 build/GST OFF helper·자체78·4셀8검사는 통과했다.
HW-03 영향 마감·PREP-01/CLOSE-01과 S11 최종 묶음은 아직 미실행이다. 상세 원인·한계·모든 실행/실패/정리는
[LP27 HW-01 최종 판정](lp27-release-preparation.md#hw-01-최종-판정과-개별-결과)을 따른다.

## 2026-09-21 LP27 이전 전수 대조

독자: 현재 개발·릴리즈 담당자. 수명: LP27 중단 및 재개 범위 결정까지.
AGENTS.md가 정책, 중앙 테스트 기록이 결과 기준이다. 아래 LP26 이하 표는 당시 이력이다.
제품 전체 전문 재감사나 실제 최종 검증이 아니라 승인된1~4의 진행 결과와 릴리즈 잔여 대조다.
상세 실행·처음 실패·수정·정리는 [LP27 기록](lp27-release-preparation.md)에 보존한다.

### 지시 전수

| 번호 | 사용자 지시 | 처리 상태 | 결과 | 근거 |
| --- | --- | --- | --- | --- |
| 1 | HW 영향 판정·필요 경로 보완 | 부분 완료 | 실제 RTSP builder graph에서 B-frame PTS 불일치와 overlay 전달 확인. 선택 정책 변경 여부 판단 대기 | LP27 자체04·영향03 |
| 2 | 검증 준비 마감 | 건너뜀 | 1번 미해소로 초기ID·복합 요구·ENV12 실행 연결·최종 manifest 남음 | LP26 현행 매핑 |
| 3 | 구형 코드·개발 자료 정리 | 건너뜀 | 사용처·대체 검사·소유권 검토 후 정리할 예정 | 현재 v1 fixture8개·legacy 소비 경로 |
| 4 | 문서·S10 코드/증거 고정 | 건너뜀 | 이번 실패 기록은 코드고정 완료가 아님 | 제품 diff 없음·로드맵 S10 |
| 5 | 분할 커밋·마지막 푸시 | 미수행 | 승인 유지, 실패 단계/미커밋으로 조건 미충족 | AGENTS3/5 |
| 6 | 종합 보고·릴리즈 잔여 재산정 | 대조 완료 | 아래 전수표, 실제 릴리즈 완료 아님 | AGENTS2/6 |

### 기준

| 항목 | 기준 값 | 직접 확인 결과 | 근거 |
| --- | --- | --- | --- |
| branch/HEAD | v4.1.0 | f4e58b9cb2efbeec43a7e1132da940fce6afd521 | git status/rev-parse |
| upstream/원격 | origin/v4.1.0 | 앞뒤0·원격 HEAD 동일, 이번 변경 미커밋 | git rev-list/ls-remote |
| 버전/build | 4.1.0 | VERSION:1/CMakeLists:3/CMakeCache:140 일치 | 직접 파일 확인 |
| 제품 source | src/include 불변 | 제품/build archive SHA 유지; 진단 도구와 기록만 변경 | diff·각 실행 source hash |
| main/tag | main431397d9 / 현재 소스4.1.0 | 원격main동일,v4.1.0 local/remote tag 없음 | git tag/ls-remote |
| 공개/PR/CI | latestv4.0.0 | release v4.0.0,draft/prerelease false; v4.1.0 openPR0/run0 | gh 읽기,CI PASS 아님 |
| CHANGELOG/NEWS | 제품 공개 변경 기록 | LP26의 루트 파일 없음 판정 유지, 이번 생성 없음 | LP26 파일 조사·이번 diff |

### 로드맵 대조

| roadmap 항목 | 문서상 상태 | 직접 확인 상태 | 불일치 여부 | 근거 |
| --- | --- | --- | --- | --- |
| S00 | 기존 조사/설계 | 새 의존성·외부 코드 도입/특허 참고 없음 | 일치,새 법적 보증 아님 | 이번 diff |
| S01~04 | 기존 단계 완료 | managed writer/catalog/보존 유지, 초기 exact 요구 연결 잔여 | 당시 구현과 현재 전수 검증 구분 필요 | LP26 매핑·현재 코드 |
| S05~08 | 기존 단계 완료 | 실제 통합156PASS 및 준비436개는 해당 범위의 기존 증거 | 현재 HW/전체 UI까지 확장 불가 | LP25/26 로그·동일 제품 source |
| S09 | 종료·대체 | 실패 이력 보존,새 성공 판정 없음 | 일치 | 로드맵238행 |
| S10 | 부분 완료 | HW 영향 확인,보완 방침·정리·고정 남음 | 일치 | 로드맵239행·LP27 |
| S11 | 계획·미실행 | 최종 안정화/30분/UI/120분 미실행 | 일치 | 로드맵240/313행 이후 |

### 구현·검증 연결

| 확인 대상 | 실제 파일·route·함수·API·UI·verifier | 확인 결과 | 근거 |
| --- | --- | --- | --- |
| HW 자동선택 RTSP | gst_pipeline_builder.cpp BuildFactoryLaunch, ConfigureFactory | 실제 생성 함수를 재사용한 graph에서 decoder PTS 불일치. 네트워크 end-to-end 아님 | lp27-hw-impact-03.log |
| 영향 전달 | decoder sink/src,analysis_overlay sink | 입력30개/PTS정상,출력30개지만2.6/2.7초누락·2.8초3개,overlay동일 | 같은 로그·자체oracle29 |
| URI 입력 | source_factory.cpp UriSourceWorker/uridecodebin | 자동선택 코드 있음,실제 HTTP/HLS 영향은 미측정 | source_factory:1562/1943 |
| 녹화/분석 | BuildFilePipelineLaunch,raw_video_decoder.cpp,recording_derived_remux.cpp | 압축 원본 writer 및 명시 SW H264 분석/파생 경로는 이번 변경 없음 | source_factory:390/raw_decoder:58/derived_remux:205 |
| 관측/장시간 준비 | current observer/longrun 공개 wrapper | LP26 실제단기71·자체60,장시간 실행은 별도 | LP26 실행 매핑·동일 소스 |
| UI 준비 | current_ui_seed/verify_v410_recording_ui_contract.mjs | managed seed/실제2파생·auth·seek 준비,실제UI미실행 | LP26 준비86 |
| 실제 이벤트 통합 | currentSteps의HTTP/API/auth/lifecycle/default/actual-app | 이전156PASS 유지,이번 HW 실패를 저장/HTTP 재실패로 바꾸지 않음 | current_integration_suite:7~12·LP25 |
| 환경 검사 | verify_gst_environment.sh → gst_environment_test.py | fixture 실행만 연결,실제44factory/READY/decode 절차 마감 필요 | wrapper 첫25행·ENV12 |
| 구형 코드/자료 | recording/v1 fixture8개,recording_timeline_smoke --seed-ui | 존재/소비 경로 확인,아직 삭제하지 않음 | 파일 목록·timeline_smoke:203 |

### 근거 분류

| 항목 | 근거 유형 | 근거 | 릴리즈 영향 |
| --- | --- | --- | --- |
| HW PTS→overlay 전달 | 프로젝트 직접 확인 | 실제 제품 builder graph·고정 AU·경계별 PTS/EOS | 현재 해결 전 blocker |
| vtdec drain와의 인과 | 추론/제안 | 공식1.28.1 drain/output 코드,내부 callback 미계측 | 내부 근본 원인 확정으로 사용 금지 |
| H264 SW 우선 보완 | 추론/제안 | 확인된경계·기존 SW 경로,전역rank/package유지 | 사용자 선택 정책 결정 후 구현 |
| 2~4 선수조건 및 실패 중단 | AGENTS 직접 규칙 | 3.3/8 | 1번 미해소 상태로 다음 개발 금지 |
| 30분/UI/120분·공개 | AGENTS 직접 규칙 | 4/7.6/7.6.2 및 S11 | 필수 evidence/각각 승인 |

### 테스트 필요성 판정

| 테스트 카테고리 | 판정 | 직접 근거 | 근거 파일·행·기능 ID | 실행 승인 상태 |
| --- | --- | --- | --- | --- |
| HW 자체/단기 영향 | 진행 대상 | 사용자1번 | LP27-H01~06·실행 로그 | 승인·실행,실패 보존·추가 맹목 반복 안 함 |
| 제품 보완/영향 회귀 | 조건부 진행 | 선택 정책 보완 결정 필요 | source_factory/gst_pipeline_builder | 범위 확인 대기,현재 미실행 |
| 문서/진단 정합 | 진행 대상 | 이번 도구/기록 변경 | bash구문/diff/docs/assets/script | 승인·실행. 제품 실패 대체 불가 |
| S11 최종 안정화 | 진행 대상 | S10 고정 후필수 | build/Auth/media/현행통합/ENV/metadata/closeout | 이번 전체실행 미승인,준비 선행 |
| 30분 | 진행 대상 | 버전 필수 | AGENTS7.6·S11 | 최종묶음 별도 실행 승인 |
| 실제 UI | 진행 대상 | 버전 필수·현재D08미실행 | exactID/role/viewport/theme/재생/overlay | 이번 실행 제외,릴리즈 면제 아님 |
| 120분 | 진행 대상 | writer/보존/복구/lifecycle·로드맵 | S10·LP26-O05·S11 | 공통/녹화전용 분리,별도 실행 승인 |
| 외부 실기기/서비스 | 조건부 진행 | 환경·자격증명 필요 | AGENTS4/7 | 미제공·미승인,기본PASS 아님 |

### 릴리즈까지 남은 개발·실행 순서

| 순서 | 우선순위 | 잔여 이슈 | 해야 할 일 | 성격 | 근거 유형 | release action 전·후 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | P0 | HW 디코더 보완 방침·영향 마감 | H264 로컬 선택 정책 결정 후 구현/반례·PTS/EOS·영향 회귀. URI/RTSP 적용 범위를 구분,기존 HW 실패 숨기지 않음 | 사용자 결정→개발 | 직접확인+제안 | 전 |
| 2 | P0 | 현행 검증 준비 마감 | S01~04 고정ID/복합요구·ENV12 실제 절차·최종UI/장시간manifest 결박,단기 자체검사 | 준비 개발 | 직접확인 | 전 |
| 3 | P0 | 구형 경로/개발 자료 정리 | 소유·사용처·대체검사 확인 후 불필요분 제거,유효 호환성/음성fixture·실패기록 유지 | 정리 개발 | 직접확인+기존지시 | 전 |
| 4 | P0/P1 | 문서·S10 코드/증거 고정 | 오래된설명·출처/NOTICE·source-only·자원판정기준,증거유지/부분무효/전체무효표,분할커밋·개발push | 준비 마감 | 정책+직접확인 | 전 |
| 5 | P0 | S11 최종 안정화 | 고정source build·Auth/media/관련기능·현행통합·ENV·entry/metadata/docs/inventory/closeout | 최종 실행 | 정책+로드맵 | 전 |
| 6 | P0 | S11 필수 장시간·실제 UI | 안정화 후30분→실제UI→공통/녹화전용120분,자원·종료·정리 판정. 부분FAIL은 영향 범위만보완 | 최종 실행 | 정책+로드맵 | 전 |
| 7 | P0 | 공개 절차 | 각승인 후push/PR·requiredCI→mainmerge→서명tag→source-onlyRelease→published검증 | 외부 변경 | AGENTS 직접규칙 | 필수gate 뒤 |
| 8 | P2 | 외부 조건 확인 | 제공·승인된실기기/endpoint/provider 확인 또는 제외경계 명시 | 조건부 | 정책+환경 | 조건충족시,필수gate 대체불가 |

### 미해소 상태

| 항목 | 상태 | 사유 | 완료 evidence 사용 가능 여부 | 다음 조건 |
| --- | --- | --- | --- | --- |
| HW 영향1번 | 부분완료/제품보완미실행 | decoder 선택 정책 결정 필요 | 원인 경계의 직접증거만 가능 | 사용자 결정·보완·영향검증 |
| 2~4 | 건너뜀 | 앞단계 미해소 | 불가 | 1번 완료 |
| LP25/26 과거 증거 | 해당범위 유지 | 이번제품source불변 | 그당시 단기범위 한정 | 제품변경후diff기준재판정 |
| 최종 안정화/30분/UI/120분 | 미실행 | 코드미고정·준비잔여 | 불가 | 최종범위·승인 |
| 임시정리 | 완료 |7개 소유root삭제·부재,서버/포트 생성없음 | 이번실행 cleanup 가능 | 다음실행 별도소유 |
| 커밋/푸시 | 미수행 | 승인유지하나실패단계·미커밋 | 불가 | 해결·관련검증·기록조건 |
| PR/CI/tag/Release | 미수행/CI미확인 | currentPR/run0·tag없음 | 불가 | 필수gate·각승인 |
| 외부조건 | 조건부 | 미제공/미승인 | 기본PASS아님 | 조건제공 |

토큰 start/end/consumed는 전용 집계 미제공으로 미집계. elapsed는 LP27 각 원출력에 기록했다.
원격 조회는 읽기만 수행했으며 최신 개발 원격은 로컬 HEAD와 같고 작업트리는 dirty다.

## 2026-09-21 LP26 최신 전수 대조

독자: 현재 개발·릴리즈 담당자. 수명: LP26 종료 시점의 잔여 감사. 정책은 AGENTS.md,
실행 결과는 중앙 테스트 기록이다. 아래 LP12 이전 실패 목록은 당시 이력이며 현재 blocker 목록이 아니다.
이번 감사는 관련 구현·등록·실행 연결의 대조이며 저장소 전체 문서 전문 리뷰나 릴리즈 실행 승인이 아니다.

### 지시 전수

| 번호 | 사용자 지시 | 처리 상태 | 결과 | 근거 |
| --- | --- | --- | --- | --- |
| 1 | 관측기·UI 데이터·실행 연결 현행화 | 요청한 구현·단기 검증 완료 | managed C++ 관측, order/monotonic, 실제 UI seed, 현행5단계와 분리 연결. S11 준비 전체는 아래 잔여와 구분 | [LP26 실행 기록](lp26-verifier-preparation.md) |
| 2 | 커밋·푸시 | 승인·분할 커밋 마감 | 구현/실행기록 `bda1ea25`. 이 잔여 대조의 별도 문서 커밋 및 개발 브랜치 push 결과는 Git 이력·최종 보고에서 확인 | AGENTS5, git 대조 |
| 3 | 종합 보고·릴리즈까지 잔여 전수 | 대조 | 아래8표. 준비·실행·공개 승인 분리 | AGENTS2/6 |

### 기준

| 항목 | 기준 값 | 직접 확인 결과 | 근거 |
| --- | --- | --- | --- |
| 버전·build metadata | 4.1.0 | VERSION, CMake project, build-gst-onnx cache 일치 | VERSION:1/CMakeLists:3/CMakeCache:140 |
| branch/upstream | v4.1.0/origin/v4.1.0 | 시작 ee1b7c4d15054da95d884c406dce020e875f5541, clean·ahead0/behind0 | git status/rev-list |
| main 최신 원격 | 431397d9b86af69f1690aff6fa6f3e61ea4fbe03 | ls-remote exit0 | [원격 읽기 기록](lp26-release-remote.log) |
| tag/Release | latest v4.0.0 | v4.1.0 원격tag 없음, latest API v4.0.0·draft=false/prerelease=false | 같은 원격 기록 |
| PR·CI | 릴리즈 대상 PR/check 필요 | open head=v4.1.0 PR0, branch workflow run0. CI PASS 아님 | gh pr list/run list |
| CHANGELOG/NEWS | 실제 파일 확인 | 제품 루트에 없음; test fixture CHANGELOG만 존재 | rg --files |
| 이번 diff | 검증 준비/기록만 | src/include/CMake/VERSION 제품 변경 없음 | git diff 및 최종 source fingerprint |

### 로드맵 대조

| roadmap 항목 | 문서상 상태 | 직접 확인 상태 | 불일치 여부 | 근거 |
| --- | --- | --- | --- | --- |
| S00 | 기존 조사·설계 완료 | 외부코드·패키지·특허 자료 추가 없음 | 새 법적 적합성 보증 아님 | 이번 diff·roadmap 독립 구현 원칙 |
| S01~04 | 기존 계약/writer/catalog/보존 완료 | 현재 managed writer·catalog·order 보존 구현, 초기 요구별 고정 등록은 별도 대조 | 초기 V1 설명을 현행 완료 판정으로 그대로 사용 불가 | [현행 실행 매핑](lp26-current-execution-map.md), retention_coordinator.cpp |
| S05~08 | 단계 구현·단기 완료 | 현재 이벤트/조회/관측/복구 존재; LP25 실제 통합156PASS | 과거 S06 UI를 현재 전체UI로 확대 불가 | 중앙 LP25, recording_current_integration_suite.mjs |
| S09 | 종료·대체 | 성공 완료 아님. 실패/개선 이력 보존 | 이번 backlog 단계 표는 종료·대체로 정렬 | roadmap S09·backlog 단계 표 |
| S10 | 부분 완료 | LP25 통합 마감, LP26 준비 보완. HW 영향·legacy 정리·코드고정 남음 | 전체 완료 아님 | 현재 구현계획/중앙 기록 |
| S11 | 계획·미실행 | 단기 준비436검사와 최종 안정화/30분/UI/120분은 별개 | 일치 | LP26 결과·AGENTS7 |

### 구현·검증 연결

| 확인 대상 | 실제 파일·route·함수·API·UI·verifier | 확인 결과 | 근거 |
| --- | --- | --- | --- |
| 원장 관측 | recording_current_observer_native.cpp Normalize, CurrentRecordingObserver.poll | 제품 parser 재사용. 상세 payload 미노출·checkpoint prefix·합산 bounded 읽기 | LP26-O01/02, 자체60 |
| 시간·진행·재기동 | CurrentLongrunProgress, verify_recording_current_longrun.mjs | UTC 아닌 order/ID와 monotonic, 두 채널순환·비활성/재활성·복제복구 | 실제 단기71, 30.155초 녹화 phase |
| 공개 실행 진입점 | server.sh verify-v410-recording-longrun → current observer; foundation --app-observe | 기존120분 인자/4초 HTTP 유지. 구형 --all은 최종대상으로 선택하지 않음 | wrapper 코드/LP26-M01 |
| UI 준비 | recording_current_ui_seed.cpp/.mjs, UI contract --ui-auth-direct | managed 원본·실제2파생·known/unknown·페이지·손상/삭제·seek 원본 MP4 | LP26-U01~08. 브라우저 TS/시각 결과 미확인 |
| HTTP·통합 | currentSteps/completedCurrentStep, /ops/api/recordings/{status,timeline,media/:id} | 실제 API35/auth40/lifecycle10/default46/app25=156 기존 직접PASS. 자체50 재확인 | LP25 실행로그·LP26 통합자체 로그 |
| HW 자동 디코딩 | source_factory.cpp uridecodebin, gst_pipeline_builder.cpp decodebin | WR01/05의 vtdec_hw 입력20→출력19,30→29 이력·제품 영향 미확인 | 중앙 WD05/08. SW PASS로 해소 안 함 |
| 환경 실제 검사 | V410-ENV-12, verify_gst_environment.sh | 환경 fixture20과 실제44factory/READY/decode는 별개. 실제 영속 runner 공백 | [매핑](lp26-current-execution-map.md), 20260904 환경 evidence |
| 구형 코드·자료 | test/fixtures/recording/v1, foundation runtime/timeline legacy | 구형8 fixture와 소비 경로 존재. 삭제는 아직 하지 않음 | rg --files/현행 실행 매핑 |

### 근거 분류

| 항목 | 근거 유형 | 근거 | 릴리즈 영향 |
| --- | --- | --- | --- |
| 30분/UI 필수·120분 판정 | AGENTS 직접 규칙 | 7.6/7.6.2, roadmap S11 | 현재 미실행은 blocker |
| LP25 통합/LP26 준비 | 프로젝트 직접 확인 | 실제 로그·코드·cleanup | 각 단기 범위만 PASS |
| ENV12/초기ID/HW/legacy 잔여 | 프로젝트 직접 확인 | 현재 runner·등록·과거 실패와 연결 코드 | 동작/검증 공백 판정 후 마감 필요 |
| 아래 순서 | 추론/제안 | 이미 확인된 의존관계+실패 반복 방지 | 관련 focused 뒤 고정된 최종 묶음1회 |
| PR/merge/tag/Release | AGENTS 직접 규칙 | 4/5 | 개발push 승인으로 외부 공개 불가 |

### 테스트 필요성

| 테스트 카테고리 | 판정 | 직접 근거 | 근거 파일·행·기능 ID | 실행 승인 상태 |
| --- | --- | --- | --- | --- |
| 이번 단기 준비/영향 회귀 | 진행 대상 | 사용자1번 개발 | LP26-O01~05/U01~08/M01 | 승인·실행. 개별 결과 별도 |
| 제품 build/실제5단계 재반복 | 미진행 | 이번 제품·HTTPseed 로직 불변 | LP25 source/실행156, 이번diff | 이번 수정만으로 반복하지 않음 |
| 최종 안정화 | 진행 대상 | S10 완료 후 S11 | 현재 기능 매핑+build/Auth/media/entry/metadata/docs/inventory/closeout | 이번 전체실행 미승인·범위고정 선행 |
| 30분 | 진행 대상 | 버전 필수 | AGENTS7.6/7.6.2·roadmap S11 | 별도 실행 승인. predev/공통 runner 역할정합 먼저 |
| UI 풀테스트 | 진행 대상 | 버전 필수·현행 D08 미실행 | Policy v4 exact ID/role/theme/viewport/재생·overlay | 이번 제외는 개발 단계 한정, 릴리즈 면제 아님 |
| 120분 | 진행 대상 | writer/보존/재기동/lifecycle 직접변경·로드맵 | S10/LP26-O05·공개 recording-longrun | 공통 장시간과 녹화 전용을 구분해 별도 실행승인 |
| 환경 실제44factory/READY/decode | 진행 대상 | V410-ENV-12 등록 및 패키징 우려 | ENV12·실제 환경 기록 | 실행 절차/runner 정합 후 단기 실행 |
| 외부 실기기/TURN/WHEP/ONVIF/VLM/provider | 조건부 진행 | endpoint/credential/실기기 필요 | AGENTS4/7, release policy | 미제공·미승인. 기본PASS 대체 안 함 |

### 릴리즈까지 잔여 순서

| 순서 | 우선순위 | 잔여 이슈 | 해야 할 일 | 성격 | 근거 유형 | release action 전·후 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | P0 | HW 자동 디코딩 영향 판정 | 재현 자료/자동선택 경계에서 누락 프레임·PTS의 실제 제품 영향을 확정. 필요한 경로만 보완하고 기존 저장/분석 회귀 | 원인 판정·필요시 개발 | 직접 확인+제안 | 전 |
| 2 | P0 | 남은 기능 등록·환경 실행 준비 | 초기 S01~04 요구별 고정ID 및 현행 검사 결박, ENV12 영속 실행 절차, exact UI/장시간 대상 누락 정리. 등록만으로 PASS 금지 | 준비 마감 | 직접 확인 | 전 |
| 3 | P0 | legacy 코드·개발 데이터 정리 | 소유/사용처/대체검사 확인 후 불필요 부분만 제거. 현행 이름 V1 소비 계약·음성 fixture·과거 실패는 무조건 삭제하지 않음 | 정리 개발 | 사용자 기존원칙+직접확인 | 전 |
| 4 | P0/P1 | 문서·S10 코드/증거 고정 | 상태 오래된 backlog/versioning 및 실제 UI/API/운영 설명·한국어·출처/NOTICE/source-only 점검. existing 증거 유지/부분무효/전체무효표, 장시간 공통/전용과 자원 판정 기준 확정 | 릴리즈 준비 | 정책+직접확인 | 전 |
| 5 | P0 | S11 최종 안정화 | 고정 source의 build·관련 기능/Auth/media·현행통합·ENV/entry/metadata/docs/assets/feature/script/closeout dry-run. 실패면 해당기능/영향만 보완하고 증거 재판정 | 최종 실행 | AGENTS 직접규칙 | 전 |
| 6 | P0 | S11 필수 장시간·실제 UI | 안정화 뒤 승인된30분→실제UI→필수120분(공통/녹화 각각). 자원/RSS·FD·drift·실재생·권한·반응형/시각·cleanup 판정. 짧은 준비나 과거 PASS 대체 금지 | 최종 실행/판정 | 정책+로드맵 | 전 |
| 7 | P0 | 공개 절차 | 최종 커밋·push/PR·required CI→main merge→대상hash확인→서명 annotated tag 전후검증→source-only Release→published metadata. 각 행위 별도승인 | 외부 변경 | AGENTS 직접규칙 | 필수gate 후 |
| 8 | P2 | 외부 조건 확인 | 제공·승인된 endpoint/실기기/provider만 field smoke. 조건 없는 항목은 이유·제외 범위 명시 | 조건부 | 정책+환경 | 승인/환경 충족시, 필수 로컬gate 대체불가 |

다음 버전 구현·새 검색 기능·후속 브랜치 생성은 이 릴리즈 잔여 개발 목록에 넣지 않는다.

### 미해소 상태

| 항목 | 상태 | 사유 | 완료 evidence 사용 가능 여부 | 다음 조건 |
| --- | --- | --- | --- | --- |
| HW WR01/WR05 | 원인 경계 확인·제품 영향 미확인 | 자동선택 decoder 입력/출력 차이 | SW 정상/LP26 원장 관측으로 대체 불가 | 영향 판정 |
| ENV12·초기 고정ID | 준비 잔여 | 과거 직접검사 존재와 현행 영속실행 연결 구분 | 현행 전수 coverage PASS 불가 | 매핑·선정·실행절차 확정 |
| S10 전체 | 미완료 | 위 정리·코드/문서고정 남음 | LP25/26 부분범위만 유효 | 잔여1~4 |
| 최종30분/UI/120분·자원추세 | 미실행/미판정 | 준비 결과와 별개 | 불가 | 고정 source/승인 후 실행 |
| 실제 UI 이벤트 TS/seek | 미확인 | 새 seed는 실제 TS와 원본MP4 구분만 검증 | 브라우저 codec·조작PASS 불가 | 실제UI exact재생/오류/seek 확인 |
| 현재cleanup | 실행결과별 확인 | LP26 소유root/서버/포트 삭제·반환 | 단기범위 가능 | 로그·최종 부재 대조 |
| PR·CI·v4.1.0 tag/Release | 미수행 | PR/run0, tag없음 | 불가 | 필수gate+각각 승인 |
| 외부 실기기/서비스 | 조건부 | 환경/자격증명 없음 | 기본PASS 아님 | 제공·승인 |

토큰 start/end/consumed는 전용 집계 없음으로 미집계. 읽기 감사 elapsed는 별도 전체집계 없음.
원격 상태 조회는 git ls-remote·gh api/pr/run, 모두 exit0이며 external write는 하지 않았다.

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
