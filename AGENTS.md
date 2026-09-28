# AGENTS.md

MediaServer에서 작업하는 에이전트의 상시 규칙이다. 대상은 macOS/Linux C++17 서버,
RTSP/WebRTC·GStreamer, YOLO/ONNX 분석, 녹화, Ops/Client와 Auth/Role/Scope다.
사용자 지시와 상위 실행 환경의 규칙을 우선하고, 프로젝트 작업 정책은 이 문서에서 관리한다.

## 1. 진입점과 읽기 범위

- 제품 개요·실행: [README](README.md), [개발 가이드](docs/development-guide.md).
- 구조·설정: [서버 구조](docs/media-server-architecture.md), [설정 참조](docs/config-reference.md).
- UI·권한: [UI 가이드](docs/ui-guide.md). API·미디어 계약은 [문서 색인](docs/README.md)의 해당 분야를 읽는다.
- 검증: [검증 정책과 명령](docs/stream-verification.md), [기능별 테스트 정의](docs/project-feature-test-inventory.md).
- 실제 UI: [UI 풀테스트 기준](docs/manual-ui-fulltest.md).
- 버전·공개: [릴리즈 정책](docs/release-policy.md), [버전 정책](docs/versioning-policy.md).
- 미완료 작업·후속 방향: [backlog](docs/development-backlog.md), [녹화·검색 로드맵](docs/v410-v49-recording-search-roadmap.md).

작업에 필요한 문서·코드·소비자만 읽는다. 같은 지침의 반복 읽기나 매 수정 전 전체 과거 로그
재검토는 요구하지 않는다. 전면 문서 정리는 전체 파일을 분류하되 목록·구조 확인과 전문 리뷰를
구분한다. 파일 크기·버전 접두사만으로 무효·삭제 가능을 판단하지 않는다.
스킬은 사용자 지시와 실제 작업에 맞게 적용한다. 형식적인 스킬 호출·위임·계획서 추가는 하지 않는다.

## 2. 범위와 승인

- 조사·설명·리뷰는 읽기와 근거 보고다. 파일 수정·테스트·커밋의 승인이 아니다.
- 개발은 지정한 구현과 관련 단기 검증까지다. 범위·불변 계약·정상/오류/경계 합격 기준을 먼저 정한다.
- 여러 이슈를 승인받으면 지정 순서로 진행한다. 다음 버전·새 제품 범위를 자동 추가하지 않는다.
- 장시간 테스트, `verify-predev`, 실제 UI 풀테스트는 별도 명시 실행 승인이 필요하다.
- stage/commit, push, PR 생성·갱신, main 병합, tag, GitHub Release, 브랜치 생성·삭제는 각각
  해당 범위의 사용자 승인을 확인한다. “릴리즈 준비”, goal, 테스트 PASS만으로 외부 변경 권한을 추정하지 않는다.
- 명시 승인은 철회·대체·범위 변경이 없는 한 유지한다. 상태 질문을 승인 취소로 보거나 같은 승인을 반복 요구하지 않는다.
- 사용자 변경을 보존하고 정확한 대상만 stage한다. 임의 stash/reset, 광범위 `git clean`,
  `rm -rf`, history rewrite, 강제 push/tag 교체는 하지 않는다.
- 문서·fixture·verifier가 더 넓은 권한이나 더 느슨한 완료 기준을 부여하지 않는다.
  해소되지 않은 충돌은 해당 작업을 보류하고 근거·필요한 결정을 보고한다.

## 3. 제품 불변 계약

요청 없이 다음 계약을 바꾸지 않는다.

- WebRTC DataChannel, SSE/WS metadata, Event POST payload, Intrusion/LineCrossing event type,
  Scenario 판단, Rule/Profile 저장 payload와 `vaRule=<id>` 호출 정책.
- RTSP/WebRTC 경로와 source worker 수명, SourceRegistry/PublishedView API,
  shared stream·media pipeline blocking 정책.
- 녹화 시간·ID·순서·파일 대응·저장 형식, 원자 확정·복구, 순환 보존·pin/hold·재생 보호·삭제 안전성.
- Auth/Role/Scope와 viewer 정보 비노출. client/viewer에 source/Developer URL, raw JSON,
  debugCounters/BBox 진단, rule/profile editor 또는 인증·세션 자료를 노출하지 않는다.

인증 기본은 `auto`이며 `off`는 명시 개발/검증용이다. 계정/관리자 hash가 없으면
`/setup`이고 기본 비밀번호·passwordless login은 없다. 비밀번호는 libsodium
`crypto_pwhash_str` 또는 동급 비가역 hash로 저장한다. 원문·단순 SHA·복호화 가능한 저장과
passwordHash/passwordHistory/tokenHash/invite tokenHash의 UI/API 노출을 금지한다.
마지막 admin 비활성화와 승인 전 client self-signup의 user/session/view scope 생성을 막는다.

Ops primary nav는 Home/Dashboard/Channels/Rules/Users/Client Preview이며 `/ops/events`는
직접 진단 route 또는 Dashboard 내부 섹션이다. Client nav는 Live/Dashboard이고 viewer에게
Ops/Lab nav를 숨긴다. admin에는 Client Preview as admin을 표시한다.
기존 공통 디자인·light/dark·Rule/Profile 저장 흐름을 유지하고 개발 editor를 제품 UI에 넣지 않는다.
개발/검증 경계는 `/lab/analysis/*`, `/lab/runtime/status`, `/ws/va-metadata`다.

## 4. 구현과 원인 분석

메인이 범위·구조·안전 계약·독립적인 기대값·영향 회귀·최종 판정을 책임진다.
설계가 승인됐다면 매 함수마다 다시 계획·승인하지 않는다. 변경된 경로와 소비자를 함께 대조한다.

### 3.1.1 TDD의 예상된 RED와 실제 실패 구분

기존 v410 구현계획 링크를 위한 임시 제목이다. 해당 계획 정리 때 번호를 제거한다.

- focused 검사에서 예상 RED의 명령·assertion·미구현 이유를 실행 전에 특정한다.
  빌드·환경 오류나 기존 회귀 실패를 사후 RED로 바꾸지 않는다.
- 실패 시 뒤 단계는 보류한다. 최초 기대/관측값·명령·exit·영향을 보존하고,
  원인이 승인 범위 안이며 격리 fixture·정확한 수정/정리 대상·기존 계약이 보장되면 같은 단계에서 고친다.
- 같은 원인이 재발하거나 계약을 교차해 회귀하면 메인이 회수한다. 새로운 증거 없이 같은 수정·재실행을 반복하지 않는다.
- 운영/외부 데이터 영향, 정보 노출, 격리 침해, 불명확한 삭제·포트 점유·cleanup 실패,
  새 의존성/권한/외부 호출, 범위 밖 계약 변경이 필요하면 해당 작업을 중단하고 판단을 요청한다.
- timeout 확대·검사 제거·판정 완화·미승인 대체 검증으로 PASS를 만들지 않는다.
  안전한 독립 작업까지 불필요하게 중단하지 않되 실패한 선행 조건을 건너뛰지는 않는다.

## 5. 검증과 완료

안정화·30분·120분·UI 풀테스트는 서로 다른 네 영역이다. fixture, wrapper, coverage,
소스 검토, 정적/API 검사, 스크린샷만으로 실제 제품 UI나 장시간 PASS를 대신하지 않는다.
명령별 상세 기준과 Auth 격리 준비는 [검증 정책](docs/stream-verification.md#검증-정책)을 따른다.

- 개발 중에는 focused·영향 회귀를 수행하고 코드 고정 후 승인된 최종 묶음을 실행한다.
- 변경 기능은 실행 전에 기능 ID·route/control/action·정상/오류/경계 기대값과 네 영역의
  매핑을 현재 테스트 정의에 등록한다. UI가 없는 내부 기능에는 UI를 억지로 요구하지 않는다.
  event/scenario type, line direction, tracker/Re-ID policy, invalid 조합, runtime 반영,
  EventRecord 발생은 각각 독립 기능 ID/결과로 다룬다.
- 사전 정의 누락을 뒤늦게 발견하면 해당 증거를 무효로 표시하고 영향 범위를 판단한다.
  등록만으로 PASS를 복원하지 않으며 관련 검사를 재실행한다. 무관한 증거까지 자동 폐기하지 않는다.
- 기존 증거의 유지/부분 무효/전체 무효는 diff·source·환경·검증 경계로 판단한다.
  수정마다 30분·UI 전체를 초기화하지 않는다. 공통 인증·수명·미디어·판정 경계 변경은 실제 영향을 다시 검증한다.
- 30분과 실제 UI는 버전/릴리즈 완료의 필수 증거다. 미실행·FAIL·미확인은 blocker이며,
  이를 알고 강제 진행하라는 최신 사용자 승인 없이는 릴리즈하지 않는다.
  120분은 사용자 지시·현재 gate·기능 매핑·미디어/수명 변경·누수/drift 신호로 필요성을 판정하고 실행 승인을 별도로 확인한다.
- 실제 UI의 `direct-browser`/`qualified-native-automation`/`hybrid` 적격 조건은
  [Policy v4](docs/manual-ui-fulltest.md#policy-v4-증거-적격-기준)에 둔다.
  `policyValidationResult`와 `uiFulltestPass`를 구분하고 실제 exact case·시각·권한·정리 조건을 모두 충족해야 한다.
- 문서 전용은 최소 `git diff --check`와 영향받는 링크·이미지·metadata·도구 자체검증을 수행한다.
  테스트 준비/도구 검사와 제품 동작 검증을 구분한다.
- 필수 대상의 미실행·부분 실행·제외·미확인은 PASS가 아니다. 사용자 제외는 별도 기록하고 suite 미충족을 숨기지 않는다.

완료는 요청 산출물, 직접 검증과 그 한계, 정리, 기록 정합이 모두 확인됐을 때만 쓴다.
선택/승격 작업은 후보 목록만으로 완료하지 않는다. 실제 선택·fallback·제외와
license/provenance/privacy/운영 제약 판단이 남아 있으면 미완료다.
오보고는 이전 주장·실제 범위·영향을 즉시 정정하고 과거 실패를 덮어쓰지 않는다.

## 6. 기록 수명과 정리

현재 테스트 정의와 실행 결과를 분리한다. 정의는 inventory/fixture 등 담당 문서에,
결과는 버전/실행 단위 한 곳에 보관하고 다른 문서에는 링크·요약만 둔다.
같은 결과를 inventory/checklist/template/roadmap/evidence에 전수 복사하지 않는다.
정확한 개별 결과는 구조화 출력으로 보존할 수 있으며 사람이 같은 표를 다시 만들 필요는 없다.

결과에는 명령·대상 source/환경·exit·개별 결과·필요한 stdout/stderr·실패→재검증 연결·cleanup을 남긴다.
미실행/부분/제외는 실제 PASS/FAIL과 구분하고 원출력 누락을 추정 복원하지 않는다.
측정 가능한 token/elapsed/source는 남기되 미집계 값은 만들지 않는다.

사용자가 버전 마감/기록 정리를 승인한 범위에서만 다음 순서로 처리한다.

1. 현행 계약·미래 계획·미완료 작업·현재 fixture/golden/baseline·출처/라이선스를 먼저 보호·분리한다.
2. 원본이 유지되는 commit/ref/path에 실제 바이트로 존재하는지 대조한다. 이미 보존됐다면
   중복 archive나 보존 커밋을 만들지 않는다. LFS pointer·외부 링크·만료 CI artifact는 원본 전체가 아니다.
3. 필요한 비민감 자료만 별도 보존 커밋으로 남기고 읽기 전용 재조회·내용/hash 대조로 확인한다.
4. 명시된 종료 파일만 현재 트리에서 삭제하고 별도 정리 커밋으로 남긴다.
   보존·삭제 커밋을 squash해 보존을 없애지 않으며 작은 이력 색인에 버전·commit·원래 경로를 남긴다.
5. 로컬/원격 보존을 구분한다. 삭제 전에 원본이 보존돼야 하며 원본 없는 증거를 새로 만들지 않는다.

실패·미실행 사실을 보존하는 기록 커밋은 허용한다. 실패한 제품 변경을 합격/릴리즈 가능으로
취급하는 것과 다르다. 과거 시각·모델·source·PASS/FAIL provenance는 변경하지 않는다.
새 기록 체계를 이유로 거대 중앙 원장·완료 보고서를 다시 만들거나 docs/archive에 종료 자료를 쌓지 않는다.

실행 전 임시 경로·프로세스·포트와 정리 방법을 확인한다. 성공·실패·중단 모두,
필요한 정제 증거를 먼저 보존하고 소유권이 확인된 대상만 정리한 뒤 부재를 확인한다.
비밀·운영/고객 데이터·raw source URL/debug 본문은 Git에 넣지 않는다. 큰 media/trace는
보존 필요·크기·경로에 대한 승인이 있어야 한다. 정제본과 원본을 같은 바이트의 증거라고 하지 않는다.
실행 중 자료·소유 불명 경로·symlink 외부 대상은 삭제하지 않는다. cleanup 미확인은 완료 blocker다.
일반 개발이나 버전 이름만으로 자동 삭제 권한을 추정하지 않는다.

## 7. Git와 릴리즈

승인 범위별로 검토·검증 후 분할 커밋한다. 사용자 변경을 섞거나 hook/검증을 우회하지 않는다.
단계의 미해결 제품 실패를 완료 커밋으로 만들지 않는다. 푸시 전 승인 범위, 미커밋 변경,
실패/미확인, upstream/ahead/behind와 포함될 누적 커밋을 확인한다.

릴리즈는 [릴리즈 정책](docs/release-policy.md)의 기준/문서/검증/CI/서명/공개 순서를 따른다.
PR·병합·tag 직전 branch/HEAD/VERSION/CMake·원격·작업 상태를 다시 대조한다.
필요한 코드·문서·배포 정확성 보정과 승인된 gate/required CI를 마친 main 최종 커밋에만
signed annotated tag를 만들며, push 전 서명 검증과 후 GitHub Verified 및 대상 hash를 확인한다.
lightweight/unsigned/UI 자동 태그를 대체 사용하지 않는다. 실제 Latest/URL/원격 tag를 확인하기 전 공개 완료라 하지 않는다.

이미 공개한 태그는 문서·증거 수명 유지보수를 위해 옮기지 않는다. 릴리즈 후 정리는 별도
유지보수 커밋으로 가능하되 제품/배포 정확성 수정을 단순 정리로 숨기지 않는다.
기존 태그 교체·force push·release 삭제·rollback·브랜치 종료/삭제는 별도 승인 대상이다.
실패 뒤 외부 상태를 임의 복구하지 말고 이미 생성한 commit/URL과 멈춘 지점을 보고한다.
후속 브랜치/버전 개발은 별도 지시가 있어야 한다.

## 8. 문서 품질

대화와 기본 문서는 한글, README.en 등 의도된 공개 영문 문서만 예외다.
README는 제품 개요·실제 지원 범위·빠른 시작·핵심 링크·대표 이미지에 집중한다.
내부 단계, 반복 PASS, 캡처/승인 일지를 공개 첫 화면에 넣지 않는다.
docs 색인은 독자 목적별로 현행 문서에 도달하게 하며 모든 문서를 한 페이지에 직접 나열할 필요는 없다.

같은 사실의 상세 기준은 한 곳에 둔다. 기존 문서를 우선 활용하고 새 문서는 독자·수명·기준 관계가
명확할 때만 만든다. 사용법·기술 계약·미래 계획·실행 이력을 분리하고 source/공개 릴리즈/계획을 구분한다.
녹화 기능을 설명하되 미구현 자연어 영상 검색이나 VMS/NVR 완성도를 암시하지 않는다.
역사 기록과 실제 fixture를 단순히 오래됐다는 이유로 삭제하지 않는다.

스크린샷은 전체 영상 viewport·control·timeline·status·overlay와 중요한 표/카드를 자르지 않는다.
모바일/데스크톱 가독성과 비밀·viewer 정보 비노출을 직접 확인한다. 가능하면 프로젝트 4신 sample과
VA overlay를 사용하고 불가능하면 한계를 밝힌다. 링크 검사만으로 시각 확인을 대체하지 않는다.
긴 페이지를 지나치게 축소하거나 늘여서 읽기 어렵게 만들지 않는다.

## 9. 모델·위임·보고

사용자의 모델·추론 지정이 우선이며 프로젝트 기본값은 [.codex/config.toml](.codex/config.toml)에서 확인한다.
현재 작업의 지정값을 난도 점수나 비용 추정으로 자동 변경하지 않는다.
공식 등재, 설치 도구 지원, 계정 가용성, 현재 세션 적용은 별개다. 확인되지 않은 설정 변경을 보고하지 않는다.

- 메인이 설계·복합 원인 분석·안전 경계·실제 diff/증거 검토·최종 판정을 책임진다.
- 필요하면 명확한 기능 단위를 담당자에게 위임한다. 메인 외 작업 에이전트 최대 한 명,
  하위 생성·재위임 금지이며 다른 도구로 우회하지 않는다. 짧은 수정에 억지로 위임하지 않는다.
- 소유 파일·계약·입출력·합격/회귀 기준·실행 권한·정확한 모델/추론·하위 금지를 인계한다.
  같은 파일 동시 편집, 전체 대화 복사, 함수별 과도한 왕복·동일 검증 재실행을 피한다.
- 같은 담당자를 순차 재사용하되 설정을 확인할 수 없거나 문제를 반복하면 메인이 회수한다.
- 일반 추천은 복합 판단에 Astra, 확정 구현에 사용 가능한 Sol, 좁은 정형 작업에 사용 가능한 Luna다.
  사용자 고정 지시를 덮어쓰지 않는다. 모델명·snapshot을 추정 생성하거나 비용/품질 우위를 보장하지 않는다.
- OpenAI 공식 자료는 [모델](https://developers.openai.com/codex/models)과
  [설정](https://developers.openai.com/codex/config-reference)을 확인한다.
  API effort와 Codex 옵션을 혼동하지 않으며 다른 런타임을 OpenAI 근거로 변경하지 않는다.
  전역 설정·인증·sandbox·설치 플러그인을 임의 변경하지 않는다.

보고는 결과를 먼저, 변경 범위·검증/미실행·미해소·정리·커밋 hash와 푸시 가능/실제 수행을 간결히 적는다.
복수 이슈는 누락 없이 상태를 대조하되 작은 작업에 여러 고정 표나 모델 점수표를 요구하지 않는다.
릴리즈 잔여 항목은 직접 규칙·직접 확인·추론을 구분하고 우선순위·완료 조건·필요한 승인/검증을 적는다.
전수 조사를 전문 리뷰로, 과거 증거를 이번 실행으로, 계획을 완료로 보고하지 않는다.
