# AGENTS.md

MediaServer 자동화 에이전트의 작업 규칙이다. 대상은 macOS/Linux C++17 RTSP/WebRTC 서버,
GStreamer, YOLO/ONNX 분석, 녹화, `/lab/analysis/*`, `/ops`, `/client`, Auth/Role/Scope다.
개발·테스트·보고·외부 변경 권한은 이 문서를 source-of-truth로 삼는다.

## 1. 문서 운용 원칙과 요청 라우터

최신 요청을 먼저 분류한다. 애매하면 더 넓은 권한을 추정하지 않고 가장 좁은 범위로 처리한다.

| 요청 유형 | 허용 범위 | 별도 승인 없이 금지 | 적용 장 |
| --- | --- | --- | --- |
| 조사/검토/목록화 | 읽기·직접 확인·근거 보고 | 수정·테스트·커밋·푸시 | 1, 6 |
| 릴리즈 잔여 이슈 | 2장의 조사와 산출물 | 수정·테스트·release action | 2, 6, 7 |
| 단계/로드맵 개발 | 지정 범위 구현·승인된 관련 검증 | 범위 밖 개발·다음 단계 자동 착수 | 3, 6, 7 |
| 테스트 실행 | 명시된 테스트 묶음 | 범위 확대·다른 검증으로 PASS 대체 | 7 |
| 릴리즈 실행 | 각각 명시 승인된 외부 변경 | 미승인 push/PR/merge/tag/release/branch | 4, 5 |
| 커밋/푸시 | 승인 범위 stage/commit/push | 자의적 수행 | 5 |
| 문서 변경/정리 | 지정 문서·관련 문서 검증 | 미실행 검증의 완료 기록 | 6, 12 |

### 1.1 최우선 원칙

1. 사용자 범위와 순서를 지키고, 요청 없는 제품 로직·API/schema·event payload·metadata·media path 변경을 하지 않는다.
2. 장시간 테스트, `verify-predev`, 커밋·푸시는 명시 승인 없이 실행하지 않는다.
3. 실패·미실행·미확인을 숨기지 않는다. 실패 뒤 단계는 진행하지 않으며, 같은 단계의 안전한 수정·재검증은 3.3, 중단 경계는 8장을 따른다.
4. 모든 대화·진행·최종 보고는 한글로 한다.
5. 개발에는 Superpowers 설계·TDD·원인 분석·검토·검증 절차를 활용하되 모델·위임은 1.3을 우선한다.

### 1.2 AGENTS.md 우선순위와 충돌 처리

README, roadmap, evidence, checklist, template, verifier가 이 문서보다 넓은 권한이나 완료 기준을 주지 않는다.
미해소 정책 충돌, 근거 없는 완료 표기, 검증 대체 주장, 사용자 범위 불명확은 중단·보고한다.
최신 명시 지시로 범위가 분명하거나 이미 해소된 충돌은 재승인을 반복하지 않는다.
조사 요청은 수정·실행 승인이 아니다. 승인 없는 외부 변경이나 거짓 완료를 이 원칙으로 정당화하지 않는다.
커밋 승인의 성립·유지는 5.1, 푸시는 5.2를 따른다.

### 1.3 버전 개발과 단일 서브에이전트 운영

새 작업이나 지침 변경 시 이 절을 확인하고, 담당자·모델을 선택하거나 재판단할 때 13장을 참고한다.
이미 읽은 동일 지침을 매 턴·매 수정마다 다시 읽지 않는다. 모델·위임 스킬 일반 지침보다 이 절이 우선한다.
이는 프로젝트 운영 기준이며 특정 모델의 보편적 성능·비용 우위를 보장하지 않는다.

1. Codex 메인 기본은 `gpt-6-astra` / `medium`이다. 실제 사용자 설정을 존중하며 점수·난도만으로 상향하지 않는다. 부족하면 원인·시도·미해소 판단을 보고하고 사용자 `high`/`xhigh` 승인을 기다린다.
2. 메인이 범위·구조·불변 계약·합격 기준·회귀 범위를 먼저 확정한다. 공개 schema, 시간·ID, 녹화·보존·복구, auth/scope, source lifecycle의 안전 설계와 복합 원인 분석·최종 판정은 메인 책임이다.
3. 확정된 기능 단위 구현은 단일 담당자 위임을 기본으로 하되 인계보다 직접 처리가 짧은 수정·단순 실행에는 에이전트를 억지로 만들지 않는다. 미확정 설계·정책 결정은 메인이 맡는다.
4. 메인 외 작업 에이전트는 최대 한 개다. 기존 담당자의 상태를 확인하고 순차 재사용한다. 별도 구현자·검토자를 동시에 추가하지 않는다.
5. 서브에이전트의 하위 생성·재위임은 금지한다. 다른 작업 생성 도구로 우회하지 않는다.
6. 위임 전 13장으로 모델·추론 수준을 정하고 지원되는 정확한 값을 지정한다. 기본 복합 후보는 Astra/medium, 제한 작업은 Sol/Terra/Luna다. 사용자 지정이 없으면 low/medium, high/xhigh는 명시 승인 후 사용한다. Codex 상한은 Astra/xhigh이며 max/ultra를 쓰지 않는다.
7. 위임에는 소유 파일·입출력·불변 계약·합격/회귀 기준·승인 명령·모델·하위 금지·보고 항목을 적는다. 같은 파일 동시 수정을 피한다.
8. 메인이 실제 diff·증거를 직접 검토한다. 자체 PASS 요약만으로 완료하지 않는다. 보완은 같은 담당자를 재사용하되 더 짧은 소규모 수정은 메인이 직접 할 수 있다.
9. 동일 원인 재발·교차 계약·근거 부족이면 메인이 회수한다. 두 번째 담당자 추가나 자동 모델 상향으로 우회하지 않으며 실패 후 권한은 3·8장을 따른다.
10. 기존 승인 설계·문맥을 유지하고 기능 단위로 인계한다. 전체 대화 복사·함수별 과도한 분할·같은 조사 반복을 피한다.
11. 같은 코드·환경·범위의 유효 증거는 인계만으로 재실행하지 않는다. 변경·누락·만료·실패에 따른 재검증은 7.6.2로 판단한다.
12. 설정 변경을 확인하지 못했으면 바꿨다고 보고하지 않는다. 낮은 추론·토큰 절약을 이유로 계약·검증을 줄이지 않으며 위임의 절감 효과는 실측 때만 말한다.

### 1.4 문맥과 절차의 적용 범위

목표·불변 조건·완료 증거를 명확히 하고, 그 안의 도구·읽기 순서·구현 방법은 작업에 맞게 선택한다.
구조 변경은 관련 설계, 저장 변경은 저장 계약, 릴리즈는 release 문서를 읽는다. 작은 수정에 전체 저장소 지도나 모든 과거 기록을 요구하지 않는다.
스킬은 사용자 명시 또는 실제 작업에 맞는 것을 적용하고, 필수 본문을 읽은 뒤 필요한 참조만 연다. 환경의 필수 스킬 적용 규칙은 유지한다.
이미 승인된 설계를 다시 작성·승인받거나 매 함수마다 계획·검토·인계를 반복하지 않는다. 새 규칙은 구체적인 재발 방지 근거가 있을 때 기존 절에 반영한다.
문서 변경만으로 모델·설치 스킬·실행 환경이 바뀌었다고 주장하지 않는다.
참고: [OpenAI의 Astra 지침 재검토 글](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra). 이 문서의 승인·보안 경계는 프로젝트 고유 정책이다.

## 2. 릴리즈 잔여 이슈 리스트업 프로토콜

릴리즈 잔여 항목·우선순위·개발 순서 요청에 적용한다. 일반 조사와 달리 아래 전수 산출물이 필요하다.

### 2.1 릴리즈 잔여 이슈 리스트업에서 허용되는 작업

AGENTS, roadmap/backlog/release, 구조·구현·route·verifier·dispatch·evidence를 읽고 실행/제외 상태를 직접 대조한다.
결론은 `AGENTS 직접 규칙`, `프로젝트 직접 확인`, `추론/제안`으로 구분한다.

### 2.2 릴리즈 잔여 이슈 리스트업에서 금지되는 작업

명시 승인 없는 수정·테스트·커밋·외부 변경, 문서상 완료만 믿기, verifier 범위 확대, 추론을 직접 규칙처럼 표현하기,
판정표 없는 테스트 필요성 단정, 필수 120분 판정을 release action 뒤로 미루기를 금지한다.

### 2.3 필수 확인 순서

사용자 지시 전수 분해 → 적용 규칙 → branch/VERSION/build metadata 기준 → roadmap 상태 →
실제 구현·검증 연결 → 근거 유형 → 테스트 필요성 표 → 작업 성격 분리 → 우선순위 →
미실행/미확인/제외/조건부/승인 필요 표 순서로 확인한다.

### 2.4 필수 산출물

아래 열을 갖춘 표를 모두 작성한다. 저장소 보고서에 전수표가 있으면 대화는 요약과 정확한 링크로 전달할 수 있다.

| 표 | 필수 열 |
| --- | --- |
| 지시 전수 | 번호 / 사용자 지시 / 처리 상태 / 결과 / 근거 |
| 기준 | 항목 / 기준 값 / 직접 확인 결과 / 근거 |
| roadmap 대조 | roadmap 항목 / 문서상 상태 / 직접 확인 상태 / 불일치 여부 / 근거 |
| 구현 대조 | 확인 대상 / 실제 파일·route·함수·API·UI·verifier / 확인 결과 / 근거 |
| 근거 분류 | 항목 / 근거 유형 / 근거 / 릴리즈 영향 |
| 테스트 판정 | 테스트 카테고리 / 판정 / 직접 근거 / 근거 파일·행·기능 ID / 실행 승인 상태 |
| 개발 순서 | 순서 / 우선순위 / 잔여 이슈 / 해야 할 일 / 성격 / 근거 유형 / release action 전·후 |
| 미해소 | 항목 / 상태 / 사유 / 완료 evidence 사용 가능 여부 / 다음 조건 |

### 2.5 우선순위와 순서 산정

- P0: release blocker, 거짓 PASS 방지, release 전 필수 개발·evidence·검증·cleanup.
- P1: P0 뒤 정리할 release 품질 항목.
- P2: credential·endpoint·실기기·외부 조건·사용자 제품 판단에 의존하는 조건부 항목.

기준/문서 대조 → 누락 개발·증거 → 테스트 판정 → 로컬 blocker → 정리 →
승인된 외부 release action → field smoke/외부 조건 순으로 분리한다.

### 2.6 리스트업 FAIL 조건

필수 표·확인 순서·근거 구분 누락, 확인 없는 완료, 30분/UI blocker를 선택처럼 표현,
미실행을 PASS로 사용, 승인 전 외부 작업을 가능한 다음 단계로 섞으면 리스트업 실패로 정정한다.

## 3. 단계/로드맵 개발 규칙

### 3.1 다중 단계 작업 규칙

시작 전에 구현 범위·비범위, 불변 계약, 정상/오류/경계 합격 기준, 관련 검증과 완료 산출물을 확정한다.
실행 중 발견한 요구는 기존 결함과 새 범위로 구분한다. 새 범위·계약 변경을 완료 조건에 자동 추가하지 않고 승인받는다.
지정 순서대로 개발 → 관련 안정화 → 결과/기록 → 커밋 가능 상태를 보고한다.
실패 시 뒤 단계는 보류하고 3.3의 안전한 수정 조건을 판단한다. 미해결 실패 단계는 커밋하지 않고 기존 승인 커밋은 유지한다.
지정 범위의 구현·관련 검증·기록까지 마치며 첫 초안이나 수정 가능한 실패만으로 매번 사용자에게 재개 승인을 묻지 않는다.
현재 버전·스텝 밖 후속 개발은 하지 않는다. 실제 커밋·푸시는 5장의 별도 승인 대상이다.

### 3.1.1 TDD의 예상된 RED와 실제 실패 구분

1. 실행 전에 focused test·예상 assertion·미구현 원인을 특정한다.
2. 실제 실패가 그 assertion과 일치해야 예상 RED다. 빌드·명령·의존성·환경 오류, 기존 회귀 실패는 RED가 아니다.
3. 명령·원인·결과를 기록한 뒤 동일 승인 범위 구현/GREEN을 이어간다. 임의 실패를 사후 RED로 바꾸지 않는다.
4. 해당 GREEN과 영향 회귀가 통과하기 전 완료·커밋·다음 단계로 넘어가지 않는다.

### 3.2 단계 완료 후 커밋 가능 상태 보고 전 필수 기록

로드맵/evidence에 개발 여부, 추가 로직의 파일·함수·route·control, 모든 관련 개별 테스트와 실제 결과를 남긴다.
등록·결과·정리 기록 누락이면 해당 단계 완료/커밋 가능 판정을 보류한다.
테스트 사전등록 누락 처리는 7.6.1을 따른다. 전체 브랜치 자동 폐기 사유로 확대하지 않는다.

### 3.3 승인 범위 안의 수정·재검증

개발·수정 요청은 같은 단계의 결함 수정과 관련 단기 검증까지 포함한다. 사용자가 수정 파일·실행 명령·재실행을 명시적으로 제한하면 그 제한을 우선한다. `/goal` 유무와 무관하게
실패 원인·영향·증거를 먼저 기록하고 다음 조건을 모두 확인하면 재승인 없이 수정·영향 검증을 이어간다.

- 검증에는 작업 소유의 격리 fixture·임시 저장소를 사용하며 운영 데이터·외부 서비스에 접근하지 않는다.
- 원인이 요청한 변경 또는 해당 검증 준비에 있고, 불변 계약·완료 기준·승인 범위를 바꾸지 않고 고칠 수 있다.
- 수정·검증·cleanup의 대상이 확인됐으며 8장의 중단 사유가 없다.

예: 격리된 테스트 경로 오류, 요청 변경의 컴파일 오류, 기존 계약을 복원하는 로컬 회귀 수정.
실제 실패를 예상 RED로 바꾸지 않고 최초 실패→수정→재검증을 보존한다. 통과 전 뒤 단계·커밋은 금지한다.
같은 원인 재발이나 다른 계약의 교차 회귀는 메인이 회수한다. 새 근거 없이 같은 수정을 반복하지 않는다.
회수 후 읽기 전용 원인 재검토는 가능하지만, 8장의 중단 사유에 해당하는 수정·재실행은 사용자 판단 전 진행하지 않는다.
해결 불가·안전성 미확인·새 범위/권한/사용자 결정이 필요하면 중단하고 뒤 단계는 `건너뜀`이다.
조사·검증만 요청받았다면 임의 구현하지 않는다. 장시간/UI 묶음과 커밋·외부 변경 승인은 그대로 별도다.

### 3.4 특정 로드맵 카테고리 지시 시 카테고리 이탈 금지

지정 카테고리의 하위 작업만 수행한다. 완료를 이유로 다음 카테고리를 자동 착수하거나 함께 완료했다고 보고하지 않는다.
다른 단계는 사용자가 명시한 경우에만 진행하며, 상태 확인/리뷰 지시는 구현 승인으로 해석하지 않는다.

### 3.5 단계별 완료 조건

요청 범위 산출물, 해당 검증 PASS, `git diff --check`, 변경 목록, 영향·회귀·미실행 보고와 필수 기록이 모두 있어야 한다.
개발 중 수정은 해당 기능+영향 회귀로 검증하고, 개발 범위가 끝나 코드가 고정된 뒤 승인된 최종 검증을 수행한다.
수정마다 30분/UI 전체를 자동 초기화하지 않는다. 기존 증거의 유지·부분 무효·전체 무효는 7.6.2의 근거 판정을 따른다.

## 4. 릴리즈 실행 프로토콜

### 4.1 릴리즈 준비 지시 처리

“릴리즈 준비/마무리”는 준비·blocker 정리이지 외부 변경 승인이 아니다.
push, PR 생성/갱신, main merge, tag, GitHub Release 생성/갱신, 후속 브랜치는 각각 명시 승인이 필요하다.
release branch 삭제, force push/tag 교체, release 삭제, revert·rollback도 별도 승인 없이는 하지 않는다.
승인된 단계만 순서대로 진행하며 실패 뒤 외부 단계는 중단한다.

1. **기준/상태:** branch, VERSION, CMake/build metadata, roadmap 기준을 대조한다. `git status --short --branch`, upstream/ahead·behind, local/remote tag, main 최신 여부, 미커밋/미추적을 확인하고 PR/merge/tag 직전 재확인한다. 불일치는 추정하지 않는다.
2. **문서:** 승인 범위의 현재 버전·current tag·README/docs·roadmap·evidence·UI/config/operation·release note source를 실제 상태로 맞춘다. deprecated 설명과 현재 UI가 아닌 대표 이미지를 정리하되 historical evidence는 덮어쓰지 않는다. CHANGELOG/NEWS가 있으면 갱신, 없으면 없음으로 보고한다. 상세 문서 기준은 12장이다.
3. **로컬 gate:** 7.6.2 판정 후 승인된 묶음만 실행한다. “필수 로컬 안정화 전체”는 build, diffcheck, 현재 entry/baseline, release metadata/evidence, docs links/assets, feature/script inventory, close-out dry-run을 포함한다. 없는/비대상 명령은 PASS로 대체하지 않는다.
4. **회귀/외부 조건:** Auth/scope, contract/schema/media, UI smoke, 현재 기능 verifier를 구분한다. Auth env는 7.6을 충족해야 한다. external TURN/WHEP·cloud·ONVIF·외부 VLM/provider는 endpoint/credential과 실행 승인 없으면 미실행/제외이며 기본 release PASS가 아니다.
5. **CI:** PR/required/optional check, warning/failure annotation, local 결과를 분리한다. annotation JSON 확보 시 승인 범위에서 `./server.sh verify-actions-security --annotations-json <annotations.json>`; 없으면 미확인이다. build/핵심 gate/CI 실패 시 다음 release action은 금지한다.
6. **PR/merge:** 승인 커밋·gate 후 승인된 push/PR를 수행한다. main merge는 승인과 PR check PASS 뒤 저장소 방식으로 수행한다. merge 후 최신 main 및 PR merge/tag 대상 commit hash를 확인한다.
7. **tag:** 같은 버전의 모든 repo/release correctness 보정 커밋이 tag 대상에 포함되어야 한다. tag 밖 보정이 있으면 branch closure·삭제·후속 브랜치를 중단하고 먼저 PR/merge로 포함한다. 기존 tag는 최종 증거가 아니며 교체/force update 승인 전에는 바꾸지 않는다.
8. **서명:** main release commit에 signed annotated tag만 사용한다. unsigned annotated/lightweight/UI 자동 unsigned tag 금지. local signing과 GitHub 등록 key를 먼저 확인하고 push 전 `git tag -v <tag>` 또는 동등 서명 검증, push 후 GitHub `Verified` 또는 API `verified=true/reason=valid`를 확인한다. 전후 대상 hash를 기록하며 기존 동일 tag 충돌은 중단한다.
9. **Release:** 승인 후 tag 기반 GitHub Release를 작성/갱신하고 실제 완료·실패·미실행을 구분한다. `./server.sh verify-release-metadata --published`로 Latest Release/URL/remote tag/branch를 확인하기 전 published 완료를 주장하지 않는다.
10. **후속 브랜치:** tag/Release 완료 후 별도 승인 범위에서 최신 main의 tag 포함 commit에서 생성·push한다. 기본 patch=0, minor 0~8은 +1, minor9 다음은 major+1.0.0이다. patch 브랜치·release branch 삭제는 별도 지시 없이는 하지 않는다.

30분/UI 미실행·FAIL·미확인 blocker가 있으면 이를 알고 강제 진행하라는 최신 명시 승인 없이는
PR/merge/tag/Release/published 재검증/후속 브랜치로 넘어가지 않는다. 필수 120분은 7.6.2로 결정한다.
cleanup 미완료는 blocker다(7.8). 실패 뒤 외부 상태를 임의 rollback하지 않고 생성된 hash/URL과 중단 지점을 보고한다.
최종 보고는 기준 버전, clean/sync, 문서·빌드/검증, PR/merge/tag/Release/published/후속 브랜치 각각의 상태,
CHANGELOG, 미실행/제외, 실패 지점과 cleanup을 포함한다.

## 5. 커밋과 푸시 규칙

### 5.1 커밋 규칙

커밋은 사용자가 해당 범위에 명시 승인한 경우만 수행한다. “마무리/완료/릴리즈 준비”, goal, PASS나 과거 포괄 지시는 승인이 아니다.
같은 범위의 명시 승인은 철회·대체·범위 변경이 없는 한 유지한다. 이후 단순 상태 질문을 승인 취소로 추정하지 않는다.
승인 범위·완료 조건이 충족되면 재승인을 반복하지 않고 해당 파일만 stage/commit한다.
여러 단계를 한 커밋에 섞거나 실패한 단계를 커밋하지 않는다.
메시지는 feat/fix/refactor/docs/test 등 성격을 명확히 하고 단계·메시지·해시·수행 여부를 보고한다.
미수행 시 승인 부재 또는 미충족 조건을 적고 커밋 가능 여부와 실제 수행을 구분한다.

### 5.2 푸시 규칙

푸시는 별도 명시 승인과 해당 범위 커밋/검증 조건 충족 후에만 수행한다.
최종 보고에 `푸시 가능: 예/아니오`, 이유, `푸시 수행 여부`를 적는다.
미커밋 변경·실패가 남으면 해당 범위의 푸시 가능으로 보고하지 않는다.

## 6. 진실성, 완료 판정, 보고 형식

### 6.1 거짓 보고 금지

미실행을 실행, 실패를 PASS, 부분/준비를 전체 완료, 추정을 사실로 보고하지 않는다.
생성하지 않은 파일·경로·커밋·푸시를 꾸미지 않고 코드 변경과 문서 반영을 구분한다.
환경/권한 실패를 제품 회귀로, 제품 회귀를 환경 탓으로 근거 없이 바꾸지 않는다.
verifier가 검사하지 않은 UI·운영·모델/라이선스 선택·장시간·릴리즈까지 PASS를 확대하지 않는다.

### 6.2 일부 수행과 완료 표현

- 완료: 요청 산출물이 실제 존재하고 그 자체의 직접 증거가 있으며 완료 조건의 미확인/review-required/not-approved가 없음.
- 부분 완료: 일부 산출물만 충족.
- gate 준비 완료: 도구/기준은 있으나 실제 실행·선택·판정이 남음.
- 미완료: 핵심 산출물 또는 필수 조건이 남음.

qualifier PASS와 실제 `uiFulltestPass`는 별개다. 실행 상태(미실행/일부/실행 완료)와 판정(PASS/FAIL)을 섞지 않는다.
필수 대상 미실행·미확인은 PASS가 아니며 suite는 미완료다. 실제 실패 이력은 별도로 보존한다.

### 6.3 선택/결정/후보군 단계의 특별 완료 조건

선택/선정/승격/default/baseline/기준 작업은 catalog만으로 닫지 않는다.
실제 대상·1차 선택·fallback/대안·제외와 이유·license/provenance/privacy/운영 제약 판정을 보고한다.
선택하지 않기로 했다면 결정·이유·다음 조건을 명시한다. 요구된 판단이 남으면 완료가 아니다.

### 6.4 완료 보고 전 필수 점검

요청 범위, 실제 산출물, 그 산출물을 검증한 evidence와 한계, 미해소 조건, roadmap/evidence 일치,
수행/미수행 구분을 모두 확인한다. 하나라도 부족하면 완료 표기를 하지 않는다.

### 6.5 필수 보고 형식

완료/중단 보고에는 범위·제외, 변경 파일/내용, 직접 확인 결과, 미완료/미확인, 실제 명령·exit·범위·증거,
영향/불변 계약, 커밋·푸시 여부를 포함한다. 없음/미실행/미확인은 생략하지 않고 그대로 쓴다.
복수 지시는 `번호 / 사용자 지시 / 처리 상태 / 결과 / 근거` 전수표로 대조한다.
전체 문서 리뷰는 발견한 모든 md/sub-md에 대해 `파일 / 분류(info/history/test/generated) / 전문 읽음 /
현재 로직 불일치 / 중복·복잡도 / 조치 / 근거`를 남긴다. 목록 조사만으로 전수 리뷰라 하지 않는다.
상세 전수 결과는 7.6.1의 저장소 기록에 보존하고 대화는 핵심 결과·실패·미실행·정확한 링크로 요약할 수 있다.
단계 실패에는 실패 지점·명령·확정/추정 원인·뒤 단계 건너뜀·다음 조건을 추가한다.
전체 종료에는 각 단계 상태와 현재 버전/스텝 내부 후속 이슈만 적는다.

### 6.6 거짓 보고 정정 규칙

오보고 발견 즉시 대화에서 이전 주장·잘못된 이유·실제 범위·영향 문서/커밋을 정정한다.
파일 정정은 별도 수정 권한을 확인하여 수행한다. 읽기 전용 리뷰가 파일 수정 권한을 만들지 않는다.
승인된 문서 정정은 완료를 실제 상태로 낮추고 과거 실패를 보존한다. 커밋/푸시·history rewrite는 5장과 4장을 따른다.

## 7. 테스트 정책

사용자가 구체적 검증 범위를 지정하면 이를 우선한다. 개발 중 focused/영향 회귀와 코드 고정 후 최종 묶음을 구분한다.
아래 최소 명령은 관련 작업의 검증 기준이며 조사 요청이나 미승인 장시간/UI 실행 권한을 만들지 않는다.
7.2~7.5는 해당 개발 범위를 닫을 때의 기준이다. 중간 수정마다 목록 전체를 반복하지 않고 7.6.2로
유효한 기존 결과와 재실행할 항목을 구분한다. 최종 판정에서는 필요한 항목의 유효 증거가 모두 있어야 한다.
실행 전 도구의 성공/실패 oracle, 원출력·시간/환경 증거 보존, 종료/port/temp 정리 준비를 짧게 확인한다.
없는 명령·준비 실패·출력 누락은 숨기거나 대체 PASS로 처리하지 않는다.

### 7.1 문서 전용 변경

최소 `git diff --check`. 허용 범위에서 `./server.sh verify-docs-links`, `./server.sh verify-docs-ui-assets`를 추가한다.
릴리즈 버전/metadata/published 변경이면 관련 metadata 검증 필요성을 따로 판단한다.

### 7.2 UI / Auth / Ops / Client 변경

`./server.sh`의 build, verify-auth-bootstrap, verify-auth-users, verify-auth-routes,
verify-ops-client-ui, verify-ops-client-ui --screenshots, verify-rule-ui 및 `git diff --check`.
추가 후보: verify-ops-click-e2e, verify-ops-tables-layout, verify-ops-rules-roundtrip.

### 7.3 `/ops/rules` / VA Rule / Scenario 변경

`./server.sh`의 build, verify-rule-ui, verify-ops-rules-roundtrip, verify-analysis-state,
verify-va-replay, verify-va-events 및 `git diff --check`.

### 7.4 RTSP / WebRTC / Media path 변경

`./server.sh`의 build, verify-codecs, verify-webrtc-ice, verify-webrtc-va-metadata 및 `git diff --check`.

### 7.5 Runtime Dashboard / metadata / SSE / WS 변경

`./server.sh`의 build, verify-va-runtime-console, verify-webrtc-va-metadata,
verify-va-metadata-sidechannel, verify-ws-metadata 및 `git diff --check`.

### 7.6 테스트 영역 역할 분리

영역은 안정화 테스트·30분 테스트·120분 테스트·UI 풀테스트 네 가지뿐이다.
preflight/gate/wrapper/rehearsal/field smoke/credential/no-device는 해당 영역의 조건·절차·제외이지 다섯 번째 영역이 아니다.

| 영역 | 인정 evidence | 대체 불가 |
| --- | --- | --- |
| 안정화 | build/static/API/auth/media/verifier 실제 명령·exit·summary·로그 | 장시간·실제 UI PASS |
| 30분 | `verify-predev --soak-minutes 30` duration/iteration/summary/log | 안정화·120분·UI |
| 120분 | 승인된 120분 명령의 실제 duration/자원·drift/summary/log | 안정화·30분·UI |
| UI 풀테스트 | direct-browser 또는 7.6.3 적격 실제 실행의 control/action·상태·로그·시각 증거 | API-only·fixture·wrapper·replay·screenshot-only·coverage |

안정화 실패 후 30분/120분/UI로 넘어가지 않는다. 개발·수정 요청의 관련 단기 검증과 재실행은 3.3 범위에 포함된다.
조사만 요청받은 경우와 장시간/UI/릴리즈 검증 묶음은 별도 명시 실행 승인이 필요하다.
30분과 UI는 버전 로드맵/릴리즈 완료의 필수 evidence다. 미실행/FAIL/미확인 시 생략 가능한 조건부가 아니라 blocker이며
이를 알고 강제 release 진행하라는 최신 명시 승인 전에는 릴리즈 불가다. 120분은 7.6.2로 판정한다.

Auth verifier의 격리 검증에서는 사용자에게 비밀번호 지정을 요구하지 않는다. 실행마다 암호학적으로 안전한 난수로
테스트 정책을 충족하는 서로 다른 임시값 다섯 개를 생성하고 아래 환경변수로 검증 프로세스에만 전달한다.
파일 없는 메모리·자식 프로세스 환경 전달을 우선하며, 고정 기본값·이전 실행 값 재사용은 금지한다.
실제 운영/기존 사용자 환경은 자동 생성값으로 대체하거나 비밀번호를 변경하지 않는다. 별도 승인·자격증명이 필요하다.
실행 도구가 자동 생성을 지원하지 않으면 격리 실행 준비 단계에서 주입한다. 격리 또는 안전한 주입을 보장하지 못하면
시작하지 않고 선수조건 실패/미실행을 보고한다. 문서 변경만으로 도구 구현까지 완료됐다고 보고하지 않는다.

- `MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD`
- `MEDIA_SERVER_VERIFY_AUTH_PREVIOUS_PASSWORD`
- `MEDIA_SERVER_VERIFY_AUTH_SECOND_PREVIOUS_PASSWORD`
- `MEDIA_SERVER_VERIFY_AUTH_WRONG_PASSWORD_ONE`
- `MEDIA_SERVER_VERIFY_AUTH_WRONG_PASSWORD_TWO`

임시파일이 필요한 경우 저장소 밖 실행 전용 디렉터리(권한 0700)에 파일 권한 0600으로 생성한다.
원문은 대화·로그·명령행 인자·증적·Git에 남기지 않고 shell tracing도 금지한다.
성공·실패·중단 시 자식 프로세스 종료와 함께 환경 참조·임시파일·검증 소유 계정 저장소를 정리한다.
강제 종료로 정리가 누락되면 다음 실행 전에 소유권이 확인된 잔여물만 정리하며 미확인 상태는 cleanup blocker로 남긴다.

보고는 스크립트(단기·30분·120분·미실행)와 UI(evidence mode·화면/action·exact 대상/pass/fail/notRun/unsupported·시각·제외)를 분리한다.
모든 영역 기록에 `token start`, `token end`, `token consumed`, `elapsed`, `source`를 남긴다.
자동 goal usage 등 실제 집계가 우선이며 없으면 미집계 이유를 적는다.

#### 7.6.1 네 영역 테스트 개별 항목 전수 보고

실행 묶음의 모든 개별 command/route/control/action/scenario/event type/role·scope/반응형·theme/longrun/cleanup을
저장소 표에 한 행씩 보존한다. 대표만 기록하거나 “나머지 동일”로 생략하지 않는다.

`제목 | 테스트내용 | pass/fail | 비고(실패 후 pass됨 등을 기록)`

내용에는 명령·exit·counts·보존 경로, HTTP method/path/status·안전한 핵심 응답, UI 조작·반영·로그,
장시간 duration/iteration/port/cleanup을 해당 항목에 맞게 적는다. 원출력과 전수 행수/누락을 대조한다.
실행한 항목의 실제 판정만 pass/fail로 쓰고 미실행·일부·미확인·제외는 별도 실행 상태 표에 남긴다.
필수 미충족은 suite PASS가 아니다. 사용자 명시 제외가 아닌 수행 불가는 임의 제외로 바꾸지 않는다.
최초 실패→수정→재검증 이력을 같은 제목에 보존하며 최종 PASS로 과거 실패를 지우지 않는다.
새/변경 기능은 실행 전에 inventory/manual checklist·template/evidence/해당 실행 항목 표에 개별 등록한다.
누락이 발견되면 해당 검증 증거를 무효로 기록하고 영향 범위를 판단한다. 사후 등록만으로 PASS를 복원하지 않고
등록 후 해당 검증을 재실행한다. 무관 검증·전체 브랜치를 자동 폐기하지 않는다.
v2.5.0 이후 전수 기록은 파일이 필수이며 대화만으로 대체하지 않는다. 공개 README 색인에는 실행 기록을 연결하지 않는다.

#### 7.6.1.1 저장소 보존형 테스트 기록

v2.8.0부터 `docs/release-test-records.md`가 기록 source-of-truth, `docs/release-evidence-index.md`는 색인이다.
기존 기록도 아래 형식으로 보존하며 상세 artifact는 중앙에서 연결한다.

| 기록 | 필수 열 |
| --- | --- |
| 실행 전 정의 | 제목 / 수행내용 / 수행 상세 내용(확인 방법) / 몇버전부터 들어갔는지 |
| deprecated 정의 | 제목 / 수행내용 / 수행 상세 내용(확인방법) / 몇버전부터 deprecated되었는지 |
| 실행 결과 | 제목 / 수행내용 / 결과(pass/fail) |
| 미실행/제외 | 제목 / 수행내용 / 사유 / 완료 evidence로 사용할 수 없는 경계 |

deprecated 항목과 과거 실패를 삭제하지 않는다. 결과표에 skip/조건부 pass를 넣지 않는다.
임시 경로는 최종 evidence가 아니다. 필요한 실제값을 중앙 또는 `docs/release-artifacts/<version>/<run-id>/`에
redaction·크기·보존 사유와 함께 이관하고 7.8로 정리한다.
개별 정의·실제 결과·cleanup 기록이 없으면 테스트 완료로 보고하지 않는다.

#### 7.6.2 테스트 필요성 판정 고정 규칙

테스트 계획은 다음 표부터 만든다. 판정은 진행 대상/조건부 진행/미진행/미확인 중 하나다.

`테스트 카테고리 | 판정 | 직접 근거 | 근거 파일/행/기능 ID | 실행 승인 상태`

진행 대상은 이번 범위의 직접 근거가 있음, 조건부는 명시 조건 충족 시 실행, 미진행은 범위 밖/근거 없음,
미확인은 source-of-truth 미확인이다. 직접 근거는 사용자 지시, 이번 cut 필수 gate, 변경 기능의 영역 매핑,
선수 결과의 high-risk signal 또는 제공된 외부 조건+승인이다. baseline ID 존재만으로 이번 cut에 끌어오지 않는다.

120분 진행 대상은 다음 중 하나가 있어야 하며 실행 승인은 별도로 확인한다.

1. 사용자 120분 명시 지시.
2. 현재 release policy/roadmap/evidence의 필수 gate.
3. 이번 변경/신규 기능 ID의 120분 직접 매핑.
4. RTSP/WebRTC/WHEP/WHIP media path, source worker lifecycle, shared stream reuse, runtime/metadata fanout, cleanup/port lifecycle 직접 변경.
5. 안정화/30분의 memory leak, runtime/cleanup drift, media/session 유지 문제 신호.

연결된 정확한 기능 ID·파일·route·module 없이 필요성을 단정하지 않는다. 새 근거 없이 판정을 뒤집지 않는다.
정정 시 이전 보고·오류 이유·새 직접 근거·새 판정·문서/커밋 영향을 적는다. 세부 명령은 영역 판정 뒤 제시한다.

기존 증거는 변경 diff·실행 source/환경·검증 경계를 근거로 유지/부분 무효/전체 무효를 메인이 판단한다.
수정된 기능과 영향 회귀는 다시 검증하되 수정마다 30분/UI 전체를 자동 무효화하지 않는다.
공통 수명·인증·미디어·관측/판정 경계의 변경으로 기존 전수 증거가 성립하지 않으면 그 범위의 재검증이 필요하다.
개발 중 focused 검증을 최종 전체 검증으로 확대하지 않으며, 코드 고정 후 승인된 최종 대상과 남은 조건을 확인한다.

#### 7.6.3 Policy v4 UI 대체 evidence 기준

Policy v4는 UI 영역 안의 `direct-browser`, `qualified-native-automation`, `hybrid` 구분이다.
도구 이름이 아니라 실제 evidence로 판단한다. 개별 자동화 대체는 아래 조건을 모두 만족해야 한다.

1. 실제 제품 브라우저 실행이어야 한다. fixture, one-shot wrapper, static smoke, API/raw JSON-only, screenshot-only, source/script/hidden marker 판정은 불가다.
2. project implementation evidence의 exact test ID/route/control/action과 requested/observed role·scope, viewport, theme가 일치해야 한다.
3. 신뢰된 visible/enabled control을 실제 조작하고 DOM 전이, network response+DOM, persisted state readback, EventRecord, server log 중 하나 이상의 상관된 completion oracle로 반영을 확인한다. 기존 동일 문자열만으로 PASS하지 않는다.
4. exact-selector visible assertion, screenshot, trace, browser console, server log, 지원 시 실제 video, adapter/browser/version provenance, source/policy/manifest/runner fingerprint, 실행 시각·재현 명령을 보존한다.
5. 허용 run root 안 artifact의 hash/type/path containment·redaction을 통과해야 한다. placeholder video, 경로 escape, hash 불일치, credential/session/token/viewer source URL/raw debug material 노출은 FAIL이다.
6. fallback을 공개하고 manualIntervention=false, failed interaction 0, unapproved console error/warning 0, server/port/temp cleanup PASS여야 한다.
7. video viewport, VA overlay, crop, clipping, contrast, focus, accessibility는 명시적 visual/geometry evidence(`compare-ui-visual-baseline` 등)와 reviewRequired 해소 또는 direct evidence를 결합한 hybrid가 필요하다.

전체 PASS는 개별 대체 적격과 별개다. 현재 release exact ID 전수가 direct-pass 또는 automation-equivalent-pass,
fail/notRun/unsupported/unapproved exclusion/manual intervention 0이어야 한다.
반응형 320/390/760/1180, light/dark, role/scope guard, client/viewer redaction, video/overlay,
시각 품질·accessibility 교차 항목이 모두 닫혀야 한다. VA rule/scenario는 EventRecord 발생 이력도 확인한다.
부분 자동화·coverage mapping·replay·Policy contract PASS로 suite PASS를 만들지 않는다.
기계 기준은 `test/fixtures/ui_fulltest_evidence_policy_v4.json`과
`./server.sh verify-ui-fulltest-evidence-policy-v4`다. policyValidationResult와 uiFulltestPass를 분리한다.
fixture/verifier는 이 정책을 완화하지 않으며 historical evidence를 현재 PASS로 소급 승격하지 않는다.

### 7.7 장시간 테스트

대표 명령은 `./server.sh verify-predev --soak-minutes 30`,
`./server.sh verify-predev --soak-minutes 120`,
`./server.sh verify-va-runtime-console-longrun --duration-minutes 120`이다.
현재 버전의 전용 장시간 검증도 명시 승인 범위에서 실행할 수 있으나 서로 다른 검증 결과를 대체하지 않는다.
30분 필수 blocker와 120분 조건은 7.6/7.6.2를 따른다. 미실행이면 명령·미실행 이유를 보고한다.
대기는 도구에 맡기고 동일 로그 재독·상태 재분석을 최소화한다. 상태 불변을 실패로 취급하지 않으며
진행 보고는 간결히 하고 완료·실패·필요한 결정은 즉시 알린다. 대기 중 토큰 소비가 없다고 단정하지 않는다.

### 7.8 테스트 임시 산출물 정리

성공·실패·중단 모두 정리 대상이다. 실행 전 소유 output/temp/registry/event/browser/report 경로와 정리 방법을 확인한다.
삭제 전 최소 실패 재현식(명령·인자), 실제 기대/관측값·exit·개별 결과·측정,
source/build 버전·OS/의존성 등 비민감 환경, 실패 이력·필수 hash가 저장소에 충분히 보존됐는지 대조한다.
credentials·raw source URL·debug 본문을 복사하지 않는다. 원출력 누락은 명시하고 증거를 추정 복원하지 않는다.
소유 경로·종류·크기·생성 근거를 확인하여 최소 승인 evidence만 보존하고 나머지를 삭제한다.
core-clips/core-snapshots/raw media/trace/throwaway registry는 기본 임시다. 대용량 보존은 경로·크기·사유를 제시해 승인받는다.
임시 /tmp·/private/tmp·TMPDIR은 최종 증거 링크가 아니다. 보존물은 redaction 후 저장소 위치와 이유를 기록한다.
삭제 후 부재를 확인한다. 경로/소유 불명확·권한 오류·삭제 실패·보존 판단 미확인은 cleanup blocker이며 완료/clean으로 보고하지 않는다.

`경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거` 표를 남긴다. 산출물이 없으면 없음으로 적는다.

### 7.9 버전 로드맵 완료 후 UI 풀테스트

승인된 실제 브라우저로 현재 버전 exact case와 /setup·/login·/ops·/client 및 관련 source/rule/dashboard를 조작한다.
영상/control/status·가능한 VA overlay를 실제 시각 증거로 확인한다. UI 이상 수정 후 동일 또는 더 강한 evidence mode로
해당 흐름과 영향 범위를 재검증한다(7.6.2). 미실행 화면/action은 PASS가 아니며 전체 suite는 미완료다.
사용자 명시 제외는 `제외 기록`에만 남긴다. static/API/fixture가 실제 UI를 대체하지 않는다.

### 7.10 기능 추가 시 테스트 항목 정리

실행 전에 `docs/project-feature-test-inventory.md`를 action/route/control별 갱신하고
안정화·30분·120분·UI 네 칸을 모두 채운다. UI 존재와 실제 control/state·PASS 기준을 명시한다.
backend/API/CLI는 `비대상: UI 없어야 정상`으로 적고 억지 UI를 만들지 않는다.
외부 조건은 해당 영역의 조건부/제외에 속하며 새 영역이 아니다. 등록 누락은 7.6.1로 처리한다.
VA rule, scenario, tracker, Re-ID처럼 기능 축이 늘어나는 경우 새 기능을 한 줄로 묶지 않는다.
각 event type, scenario type, line direction, tracker policy, Re-ID policy, invalid 조합,
runtime 반영, EventRecord 발생 여부를 각각 독립 기능 ID/결과 행으로 추가한다.
기능별 테스트 결과 행의 판정값은 `PASS`와 `FAIL`만 쓴다. 미실행/미확인은 별도 상태이며 PASS가 아니다.
현재 제품에서 쓰지 않는 레거시 화면/route/helper/verifier는 영향 확인 후 승인된 개발 범위에서 정리한다.

## 8. 중단 조건

실패한 검증 뒤 단계는 진행하지 않는다. build·smoke·auth/media 회귀·diffcheck 실패도 3.3의
격리·원인·수정 권한이 확인되면 같은 단계 안에서 고칠 수 있다. 다음은 중단·보고하고 사용자 판단을 기다린다.

- 운영/외부 데이터 영향, 비밀·viewer source URL/debug/raw JSON 노출 또는 격리·권한 경계의 실제 침해.
- 요청 밖 WebRTC DataChannel/Event POST/SSE/WS schema, auth/scope, media 계약 변경이 필요한 경우.
- 삭제 대상·소유권 불명확, 미해결 cleanup/port 점유, 추가 권한·의존성 설치·외부 호출이 필요한 경우.
- 원인·영향을 확정하지 못했거나 동일 실패·교차 회귀를 새 근거 없이 반복하는 경우.
- 명령 부재/실행 불가로 승인되지 않은 대체 검증이나 합격 기준 변경이 필요한 경우.

실패 명령·원인·변경·기존 결과·미실행·재개 조건을 남긴다. timeout 연장·검사 삭제·판정 완화로 PASS를 만들지 않는다.

## 9. UI 작업 규칙

### 9.1 공통 원칙

기존 흐름/design token과 /ops·/client·/setup·/login의 light/dark 공통 card/button/form/table/badge를 유지한다.
raw JSON은 운영자 debug 접힘 영역만 허용한다. client/viewer에 source URL, Developer URL, raw JSON,
debugCounters, BBox diagnostics, rule/profile editor를 노출하지 않는다.
기존 /ops/rules selector·Rule/Profile 저장 흐름을 깨지 않고 개발/검증 editor를 제품에 embed하지 않는다.
자동화 증거는 수동 확인으로 이름을 바꾸지 않고 실제 evidence mode를 기록한다.

### 9.2 Ops 화면

Primary nav: Home / Dashboard / Channels / Rules / Users / Client Preview.
`/ops/events`는 primary nav가 아닌 진단/직접 route 또는 Dashboard 내부 섹션이다.

### 9.3 Client 화면

Primary nav: Live / Dashboard. viewer에게 Ops/Lab nav를 숨기고 admin에는 `Client Preview as admin`을 표시한다.

### 9.4 Lab / 개발 API 경계

개발/검증은 `/lab/analysis/*`, `/lab/runtime/status`, `/ws/va-metadata`와 전용 verifier로 다룬다.
운영 Rule/Profile은 `/ops/rules`이며 개발 editor를 제품 화면에 되살리지 않는다.

## 10. Auth / 계정 / 권한 규칙

제품 기본은 auto, off는 명시 개발/검증용이다. users file/admin passwordHash가 없으면 /setup이다.
기본 username은 admin이나 기본 비밀번호/passwordless login은 없다.
비밀번호 원문·단순 SHA·복호화 가능한 저장을 금지하고 libsodium crypto_pwhash_str 또는 동급 hash를 쓴다.
passwordHash/passwordHistory/tokenHash/invite tokenHash를 UI/API에 노출하지 않는다.
마지막 admin 비활성화와 client self-signup 자동 승인을 막는다. admin 승인 전 user/session/view scope를 만들지 않는다.

## 11. Media / VA / Event 불변 조건

요청 없이 다음을 바꾸지 않는다: WebRTC DataChannel schema, SSE/WS metadata schema, Event POST payload,
Intrusion/LineCrossing event type, Scenario 판단, RTSP/WebRTC streaming path, SourceRegistry/PublishedView API,
Rule/Profile 저장 payload, `vaRule=<id>` 호출 정책, media pipeline blocking 정책.

## 12. 문서 관리 규칙

문서는 한글을 기본으로 하며 README.en 등 의도된 공개 영문 문서만 예외로 둔다.
용어·URL·auth auto·실제 route·현재 UI와 설명을 대조한다. 구현 완료/MVP/1차 구현/후속/실험/검증 미수행을 구분한다.
실제 구현·검증된 녹화 기능은 정확히 설명할 수 있으나 미구현 VMS/NVR의 범위·완성도를 암시하거나 과장하지 않는다.

### 12.1 문서 가독성 / 정보 구조 규칙

README는 제품 정체성·현재 release·빠른 시작·핵심 링크·대표 이미지에 집중한다.
공개 정책/기능 문서는 docs/README.md에서 독자 목적별로 색인하고 세부 내용은 전용 source-of-truth로 연결한다.
backlog 상단은 baseline·비범위·상태 요약만, 상세 이력은 하위/전용 문서에 둔다.
실행 증적은 공개 색인 대상이 아니며 12.2를 따른다. verifier 때문에 README에 전수 목록을 복제하지 않는다.
문서 검증은 7.1, 현재 이미지 검토는 12.3을 따른다.

### 12.2 문서 분할 / 중복 관리 규칙

AGENTS만 작업 정책 source-of-truth다. stream-verification/manual UI 문서/inventory/evidence는 보조이며
한 줄 요약·참조로 연결하고 더 느슨한 규칙을 독립 생성하지 않는다.
새 파일 전 기존 독자·목적·lifecycle을 확인하고 같으면 하위 절로 흡수한다. 별도 문서는 독자·유지 주기·보존 이유·경계가 분명할 때만 만든다.
새 md/sub-md 첫머리에 독자·lifecycle·source-of-truth 관계를 밝힌다.
정책·roadmap·실행 로그·연구·사용법을 한 문서에 혼합하거나 여러 문서에 같은 목록을 복제하지 않는다.
전면 리뷰는 파일 수·분할 이유·긴 중복·역할 혼합도 확인한다. 원문 보존 historical/fixture/log는 예외이나 현재 정책이 아님을 명시한다.
공개 독자용 안정된 정책/기능은 docs/README.md에 색인한다. release/test 실행 기록·재감사·임시 조사·검증 산출물은
README.md/README.en.md/docs/README.md/docs/en/README.md에 색인하지 않고 중앙 테스트 기록·증적 색인에서 연결한다.

### 12.3 문서 이미지 / 스크린샷 규칙

현재 UI를 직접 대조하고 잘림·흐림·원문/비밀 노출을 확인한다. 주요 화면·전체 video viewport·하단 control·timeline·status·overlay·caption을 자르지 않는다.
가능하면 프로젝트 4신 sample을 쓰고 VA overlay를 켠다. 불가능하면 사유·미확인을 기록한다.
client/viewer 이미지에 source/Developer URL, raw JSON/debug/BBox, model path/checksum/provenance, auth/session을 노출하지 않는다.
mobile/desktop 모두 작은 viewport의 텍스트·영상·toolbar 잘림을 확인한다. 링크 verifier만으로 시각 확인을 대신하지 않는다.

## 13. 이슈 로드맵 및 후속 이슈 추천 규칙

후속 이슈는 해야 할 일·완료 기준을 우선 설명한다. 모델·역할은 아래 기준으로 선택하되 같은 작업 묶음의 설정을 반복 설명하지 않는다.

### 13.0 런타임 패밀리 선택

Codex는 13.1.1, Grok은 13.1.2만 사용한다. 패밀리/가용성을 모르면 추천 불가로 보고하고 이름을 섞지 않는다.
사용자 설정이 우선이며 추천·실제 사용·변경 확인 여부를 구분한다. 점수는 Codex 메인 설정 자동 변경 규칙이 아니다.

### 13.1.1 Codex 메인과 서브에이전트 모델 기준

현재 도구의 모델·추론 지원을 확인한다. 문서 등재만으로 가용성을 주장하지 않는다.
공식 참고: <https://developers.openai.com/api/docs/models/gpt-6-astra>.
Astra(`gpt-6-astra`)/medium은 메인과 복합 위임 기본, Sol(`gpt-5.6-sol`)은 확정 구현·조사 대안,
Terra(`gpt-5.6-terra`)는 제한 구현, Luna(`gpt-5.6-luna`)는 결정적 정형 작업 후보다.
단순 실행에 위임을 억지로 만들지 않는다. 복잡한 저장·권한·미디어는 메인 계약 확정이 먼저다.
비용·품질 우위는 실측 근거 없이 보장하지 않고 가용성/역량 부족은 1.3 회수 절차를 따른다.

### 13.1.2 Grok (Grok 4.x) 공식 모델 기준

`grok models`로 실제 slug를 확인한다. 기본 복합/개발은 grok-4.6, 결정적 반복·정형은 grok-4.5 후보이며 없으면 확인된 동등 모델과 이유를 적는다.
TUI /effort의 low/medium/high/xhigh, headless --effort의 추가 none/minimal/max는 실제 지원 시만 사용한다.
모델 전환은 /model, /m 또는 Ctrl+M이며 Shift+Tab이 아니다. Codex 명칭을 Grok 모델로 만들지 않는다.

### 13.2 VATester 모델 점수 기준

영향도/불확실성/검증 난이도/변경 범위를 판단한다. 점수표는 담당 선택이 애매하거나 재판단할 때의 보조 도구이며 매 수정·보고의 필수 산출물이 아니다.

| 항목 | 0 | 1 | 2 |
| --- | --- | --- | --- |
| 영향 | 읽기·정형 | 단일 기능 | 사용자·gate·API·데이터 광범위 |
| 불확실성 | 정답·패턴 명확 | 일부 확인 필요 | 복수 원인·미확정 계약 |
| 검증 | 단일 결정적 | 여러 단위/상태 대조 | 장시간·UI·외부·복합 evidence |
| 범위 | 무변경/한 파일 작음 | 단일 모듈/소수 파일 | 다중 모듈·구조·저장 경계 |

0~2: Codex Luna/Grok4.5, 3~5: Terra/Grok4.6, 6~8: Astra medium(Sol medium 대안)/Grok4.6.
작업 종류와 점수가 다르면 필요한 판단 역량 쪽을 고르고 이유를 적는다. 정확도·데이터 위험을 반복 작업이라는 이유로 낮추지 않는다.
1.3 역할·사용자 설정·상한이 우선이며 점수는 모델 벤치마크가 아니다.

### 13.3 추론 수준 기준

none=결정적 변환, low=저위험/지연 우선, medium=기본, high/xhigh=추가 판단이다.
Codex 승인·상한은 1.3을 따른다. Grok max는 도구 지원과 8점 또는 중대 위험·추가 탐색 근거가 있을 때 검토한다.
다른 런타임 ultra도 지원·명시 승인·인원 제한이 필요하다. 상향 이유는 점수만이 아니라 미해소 문제·시도로 설명한다.

### 13.4 정확도 및 위험 상향 규칙

auth/scope·외부 쓰기·비가역 손실·공개 schema/event·media·release correctness는 1.3의 메인 책임 경계다.
Codex는 위험만으로 자동 상향하지 않으며 Grok은 grok-4.6/최소 high를 쓴다. 회수·상향도 3·8장의 권한과 중단 기준을 유지한다.

### 13.5 모델 추천 보고 형식

새 위임·설정 변경·회수 시 런타임/담당/모델/추론 수준과 판단 근거를 짧게 기록한다. 실제 설정과 추천은 구분한다.
같은 설정의 여러 이슈는 공통 설정을 한 번 적고 각 이슈에는 작업·이유·예상 검증을 적는다. 사용자가 상세 비교를 요구하면 점수와 선택 근거를 제시한다.
후속 추천은 현재 버전·현재 스텝 안에서 실제 처리 가능한 항목만 허용한다.
각 항목은 제목·우선순위·이유·예상 검증·범위 근거를 갖춘다. 이번 단계 설명 요청을 릴리즈 전수 감사로 확대하지 않는다.
다음 버전/별도 Phase/새 제품 범위/무관 연구를 개수 맞추기로 만들지 않으며 없으면 `후속 이슈: 없음`이다.

## 14. 절대 금지 요약

실패·미실행·미확인·미커밋/미푸시를 완료로 보고하지 않는다.
요청 없는 schema/payload/media/auth·scope 변경, 미승인 장시간/verify-predev/커밋/푸시,
viewer/client의 debug/source/raw 노출, 미구현 제품 범위·VMS/NVR 완성도 과장을 금지한다.
