# AGENTS.md

이 문서는 MediaServer 프로젝트에서 자동화 개발 에이전트가 반드시 따라야 하는 작업 규칙입니다.
대상 프로젝트는 macOS/Linux 기반 C++17 RTSP/WebRTC 미디어 서버이며, GStreamer 기반 스트리밍, YOLO/ONNX 영상 분석, `/lab/analysis/*` 개발 API, `/ops`, `/client`, Auth/Role/Scope, 채널/룰/런타임 대시보드 UI를 포함합니다.

---

## 1. 최우선 원칙

1. 사용자가 지정한 작업 범위를 넘지 않는다.
2. 기능 로직, API schema, event payload, WebRTC/SSE/WS metadata schema, RTSP/WebRTC media path는 요청 없이 변경하지 않는다.
3. 장시간 테스트, `verify-predev`, 푸시는 명시 요청 없이 실행하지 않는다.
4. 실패와 미실행 항목을 숨기지 않는다.
5. 확인된 사실과 추정은 분리해서 보고한다.
6. 실패한 단계 이후의 단계는 모두 중단하고 `건너뜀`으로 보고한다.
7. 사용자가 로드맵/목차/단계 중 특정 카테고리 개발을 지시하면, 그 카테고리
   범위 안에서만 작업한다. 사용자가 명시적으로 추가 지시하지 않은 다른
   로드맵 카테고리로 넘어가는 행위는 금지한다.

---

## 2. 거짓 보고 금지

거짓 보고는 허위 사실을 말하는 것뿐 아니라, **수행한 범위보다 더 넓게 완료를
보고하는 것**, **검증한 범위보다 더 넓게 통과를 보고하는 것**, **사용자가 요구한
핵심 산출물이 빠졌는데 완료처럼 쓰는 것**을 모두 포함한다.

다음 행위는 절대 금지한다. 아래 항목 중 하나라도 발생하면 즉시 정정하고, 영향을
받은 문서/roadmap/status/커밋 여부를 함께 보고한다.

- 실행하지 않은 명령을 실행했다고 보고
- 실패한 테스트를 통과로 보고
- 일부만 통과했는데 전체 통과로 보고
- 일부 구현, gate 준비, catalog 작성, 문서 정리를 해당 단계 전체 완료로 보고
- verifier PASS를 verifier가 검사하지 않은 요구사항의 PASS로 확대 해석
- 정적 verifier, 문서 gate, fixture만 만들고 실제 선택/판정/검토/운영 확인까지 완료했다고 보고
- `pending`, `review-required`, `not-approved`, `미확인`, `후속 확인 필요`가 남아 있는데 roadmap 상태를 `완료`로 변경
- 사용자가 요구한 핵심 산출물(예: 선택 모델, 선택 사유, 제외 사유, license 판정, 운영 기본값)이 없는데 완료 보고
- "기준을 정함"과 "실제 대상을 선택함"을 혼동
- "검토 절차를 만듦"과 "검토를 완료함"을 혼동
- "테스트 준비 가능"과 "테스트 실행 PASS"를 혼동
- "UI 자동 smoke" 또는 raw JSON/API 확인을 "제품 UI 직접 확인"으로 보고
- 브라우저 확인 없이 UI 검수 완료라고 보고
- raw JSON만 확인하고 제품 UI를 확인했다고 보고
- sandbox/포트/권한 문제를 제품 회귀처럼 단정
- 제품 회귀를 환경 문제라고 임의 축소
- 생성하지 않은 파일, summary, report 경로를 임의 작성
- 커밋하지 않았는데 커밋 해시나 커밋 메시지를 보고
- 푸시하지 않았는데 푸시 완료라고 보고
- 문서만 수정하고 코드 수정까지 했다고 보고
- 코드만 수정하고 문서 반영까지 했다고 보고

### 2.1 일부 수행과 완료 표현

일부만 수행했으면 `완료`라고 쓰지 않는다. 아래 표현을 구분한다.

```text
완료:
- 사용자가 요구한 최종 산출물이 실제 파일/코드/UI/검증 결과에 존재
- 해당 산출물 자체를 검증하는 evidence가 있음
- 미확인/pending/review-required 항목이 완료 조건 안에 남아 있지 않음

부분 완료:
- 하위 작업 일부는 끝났지만 단계 완료 조건이 남아 있음

gate 준비 완료:
- verifier, checklist, catalog, 문서 기준은 만들었지만 실제 선택/검토/실행은 남아 있음

미완료:
- 사용자가 요구한 핵심 산출물이 아직 없음
```

`verify-*` 명령 통과는 "그 명령이 검사한 범위 통과"만 뜻한다. verifier가 모델
선택, license 검토, UI 직접 조작, 장시간 안정화, 운영 반영을 검사하지 않았다면
그 항목을 완료 evidence로 사용하지 않는다.

### 2.2 선택/결정/후보군 단계의 특별 완료 조건

로드맵 항목 이름이나 사용자 요청에 `선택`, `선정`, `후보군`, `결정`, `승격`,
`default`, `baseline`, `기준`이 포함된 경우, 단순 catalog/checklist/verifier 추가만으로
완료 처리하지 않는다.

완료 보고에는 최소한 아래가 포함되어야 한다.

- 실제 선택 대상 목록
- 1차 선택값
- fallback 또는 대안
- 제외 대상과 제외 사유
- license/provenance/privacy/운영 제약 검토 결과
- 사용자가 "그래서 무엇을 쓰기로 했는가?"라고 물었을 때의 직접 답
- 아직 선택하지 않기로 한 경우, 그 결정과 이유, 다음 완료 조건

위 항목 중 하나라도 없으면 상태는 `완료`가 아니라 `진행`, `부분 완료`,
`gate 준비 완료`, `미완료 decision 있음` 중 하나로 보고한다.

### 2.3 완료 보고 전 필수 점검

완료라고 보고하기 직전에 아래 질문을 모두 확인한다.

1. 사용자가 실제로 원한 최종 산출물이 무엇인가?
2. 그 산출물이 파일/코드/UI/설정/테스트 결과에 실제로 존재하는가?
3. 실행한 verifier가 그 산출물 자체를 검증하는가, 아니면 주변 gate만 검증하는가?
4. `공식 확인 필요`, `미확인`, `pending`, `review-required`, `not-approved`,
   `후속 확인 필요`가 완료 조건 안에 남아 있지 않은가?
5. roadmap/status 문서를 `완료`로 바꾸는 근거가 직접 evidence인가?
6. 보고서에 실제 진행한 것과 진행하지 않은 것을 분리해 적었는가?

하나라도 "아니오"이면 완료로 보고하지 않는다. 문서 상태도 `완료`로 바꾸지 않는다.

### 2.4 필수 보고 형식

작업 완료 또는 중단 보고에는 반드시 아래 항목을 넣는다. 항목이 없으면 `없음`,
실행하지 않았으면 `미실행`, 확인하지 않았으면 `미확인`으로 쓴다.

```text
요청 범위:
- 사용자가 요청한 범위
- 이번 작업에서 제외한 범위

진행한 것:
- 실제 수정/생성한 파일
- 실제 구현/정리한 내용

완료된 것:
- 완료 조건과 직접 evidence

미완료/미확인:
- 남은 결정, pending, review-required, 후속 확인
- 실행하지 않은 테스트
- 열어보지 않은 화면

검증:
- 실제 실행한 명령
- 각 명령의 PASS/FAIL
- verifier가 커버하는 범위
- verifier가 커버하지 않는 범위

영향 범위:
- 변경된 제품/문서/API/UI/테스트 범위
- 변경하지 않은 불변 조건

커밋:
- 수행 여부
- 메시지
- 해시

푸시:
- 푸시 가능 여부
- 푸시 수행 여부
```

간단한 작업이라도 최소한 아래 구분은 지킨다.

```text
확인됨:
- 실제 실행한 명령
- 실제 통과/실패 결과
- 실제 생성된 파일
- 실제 수정한 파일
- 실제 커밋 여부
- 직접 evidence가 있는 완료 항목

미확인:
- 실행하지 않은 테스트
- 열어보지 않은 화면
- 추정 원인
- 후속 확인 필요 항목
- verifier 범위 밖의 요구사항
```

### 2.5 거짓 보고 정정 규칙

이미 잘못 보고했거나 완료 상태를 과장한 사실을 발견하면 즉시 아래 순서로 정정한다.

1. 어떤 보고가 잘못됐는지 명시한다.
2. 실제 확인된 범위와 미확인/미완료 범위를 다시 분리한다.
3. 문서나 roadmap에 `완료`로 잘못 반영했다면 `진행`, `부분 완료`,
   `gate 준비 완료`, `미완료 decision 있음` 등 실제 상태로 수정한다.
4. 정정 변경을 별도 커밋으로 분리한다.
5. 기존 커밋을 이미 푸시했다면 force push나 history rewrite를 임의로 하지 않고,
   정정 커밋으로 바로잡는다.

---

## 3. 다중 단계 작업 규칙

사용자는 한 번에 5~10개 단계를 요청할 수 있다.
이 경우 반드시 아래 규칙을 따른다.

1. 단계는 요청된 순서대로만 진행한다.
2. 각 단계는 개발 → 안정화 테스트 → 결과 보고 → 커밋 순서로 닫는다.
3. 한 단계가 실패하면 그 즉시 중단한다.
4. 실패한 단계 이후의 모든 단계는 실행하지 않는다.
5. 실행하지 않은 단계는 `건너뜀`으로 표시한다.
6. 실패 단계의 원인, 실패 명령, 영향 범위, 변경 파일, 후속 조치를 보고한다.
7. 실패한 단계는 커밋하지 않는다.
8. 실패 전 이미 통과 후 커밋된 단계는 그대로 유지한다.
9. 전체 단계가 모두 끝나면 현재 버전/현재 스텝 범위 안의 후속 이슈만 추천한다.
10. 마지막에 푸시 가능 여부를 반드시 보고한다.

### 3.1 `/goal` 명령의 실패 처리 예외

사용자가 `/goal` 또는 goal option으로 end-to-end 목표 달성을 지시한 경우에는
실패를 최종 중단으로 바로 확정하지 않는다.

1. 실패 지점에서 원인, 실패 명령, 영향 범위, 변경 파일을 먼저 기록한다.
2. 같은 목표와 같은 로드맵 범위 안에서 수정 가능한 실패라면 수정 후 해당 단계의
   안정화 테스트부터 다시 시작한다.
3. 실패 단계가 통과하기 전에는 뒤 단계를 진행하지 않는다.
4. 같은 실패가 해결 불가능하거나 사용자 결정이 필요한 경우에만 중단으로 보고하고,
   그 뒤 단계는 `건너뜀`으로 표시한다.
5. 실패 후 재시작한 경우 최종 보고에는 최초 실패, 수정 내용, 재검증 결과를 모두
   함께 적는다.

### 3.2 특정 로드맵 카테고리 지시 시 카테고리 이탈 금지

사용자가 로드맵, 목차, 단계 목록 중 특정 카테고리 또는 번호를 지정해 개발을
지시하면 그 요청은 지정된 로드맵 카테고리 안에서만 적용한다.
지정 카테고리 내부의 하위 작업, 코드 수정, 문서 수정, 테스트, 안정화, 커밋은
허용된다. 금지 대상은 커밋 자체가 아니라 다른 로드맵 카테고리로 넘어가는 것이다.

다음 행위는 절대 금지한다.

- 지정 카테고리가 끝났다는 이유로 다음 로드맵 카테고리를 자동 착수
- 지정 카테고리의 완료 여부를 확인하지 않고 다음 카테고리 개발로 이동
- "다음 본작업은 N번"이라고 단정한 뒤 사용자 승인 없이 N번 구현 시작
- 다른 로드맵 카테고리의 코드 수정, 문서 수정, 테스트 실행, 커밋 생성
- 다른 로드맵 카테고리를 함께 완료했다고 보고

다른 로드맵 카테고리는 사용자가 다음처럼 명시적으로 말한 경우에만 진행한다.

```text
다음 스텝 진행
6번 진행
5번 완료 후 6번까지 진행
1~5번 순서대로 진행
```

사용자가 특정 스텝의 상태 판단, 검토, 문서 읽기, 코드 확인, 테스트 재검증만 요청한
경우에는 구현 범위를 그 요청에 한정한다. 다른 로드맵 카테고리는 `미진행` 또는
`건너뜀`으로 보고하고, 임의로 개발하지 않는다.

예시:

```text
요청: 1~10번 진행

1번 통과 -> 테스트 통과 -> 커밋
2번 통과 -> 테스트 통과 -> 커밋
3번 개발 후 테스트 실패

결과:
1번 완료
2번 완료
3번 실패
4~10번 건너뜀

보고:
- 3번 실패 원인
- 실패 명령
- 실패 로그 요약
- 수정한 파일
- 커밋 여부: 3번은 커밋하지 않음
- 후속 이슈 추천
- 푸시 가능: 아니오
```

---

## 4. 단계별 완료 조건

각 단계는 아래 조건을 모두 만족해야 완료로 본다.

1. 요청한 구현 범위 완료
2. 관련 테스트 실행
3. 테스트 통과
4. `git diff --check` 통과
5. 변경 파일 목록 확인
6. 영향 범위 보고
7. 회귀 가능성 보고
8. 해당 단계 단위 커밋 완료

문서만 수정한 단계도 최소한 `git diff --check`를 실행한다.

---

## 5. 커밋 규칙

1. 각 단계가 통과한 뒤 해당 단계만 커밋한다.
2. 여러 단계의 변경을 하나의 커밋에 섞지 않는다.
3. 실패한 단계는 커밋하지 않는다.
4. 커밋 메시지는 변경 성격을 명확히 쓴다.
5. 푸시 여부와 푸시 가능 여부 보고는 6장 규칙을 따른다.

권장 커밋 메시지 형식:

```text
feat: 기능 추가
fix: 버그 수정
refactor: 구조 정리
docs: 문서 갱신
test: 테스트 추가
```

보고 형식:

```text
커밋:
- 단계: 2/8
- 메시지: fix: 운영 대시보드 레이아웃 정렬
- 해시: <커밋 해시>
- 푸시: 수행하지 않음
```

커밋하지 않았다면:

```text
커밋:
- 수행하지 않음
- 이유: 테스트 실패
```

---

## 6. 푸시 규칙

1. 푸시는 사용자가 명시적으로 요청하기 전까지 금지한다.
2. “푸시 가능”과 “푸시 완료”를 혼동하지 않는다.
3. 모든 단계가 통과하고 커밋이 완료되어도 푸시는 하지 않는다.
4. 마지막 보고에 아래 중 하나를 반드시 쓴다.

```text
푸시 가능: 예
이유: 모든 단계 통과, 모든 변경 커밋 완료, 미커밋 변경 없음
푸시 수행 여부: 수행하지 않음
```

또는

```text
푸시 가능: 아니오
이유: 3단계 실패, 미커밋 변경 있음
푸시 수행 여부: 수행하지 않음
```

### 6.1 릴리즈 준비 지시 처리

사용자가 “릴리즈 준비”, “release 준비”, “릴리즈 close-out 준비”처럼 현재 브랜치의
릴리즈 종료를 명시하면, 그 요청은 아래 작업에 대한 명시 지시로 본다. 이는 6장의
일반 푸시 금지 규칙에 대한 범위 제한 예외이며, release close-out에 필요한
push/PR/main merge/tag/GitHub Release/후속 브랜치 생성에만 적용한다. release branch
삭제, tag force update, force push, GitHub Release 삭제, rollback성 destructive
조치는 사용자가 별도로 명시하지 않으면 수행하지 않는다. 각 단계는 순서대로 진행하고
실패한 뒤 단계는 모두 중단한다.

1. 사전 상태와 현재 릴리즈 버전 확인
   - `git status --short --branch`, 현재 branch, upstream tracking, ahead/behind,
     local/remote tag 존재 여부, main 최신 여부, 미커밋/미추적 파일 여부를 확인한다.
   - PR/merge/tag 직전에도 다시 clean/sync 상태를 확인한다.
   - 현재 작업 브랜치, `VERSION`, 로드맵/릴리즈 문서에서 릴리즈 버전을 확인한다.
   - 예: 현재 브랜치가 `v1.9.0` 또는 `1.9.0`이면 이번 릴리즈 기준은 `1.9.0`이다.
   - 버전이 서로 다르면 추정으로 진행하지 말고 불일치 파일과 확인 필요 사항을 보고한다.
2. 릴리즈 버전 source-of-truth 업데이트
   - 브랜치가 `v1.9.0`이면 `VERSION`, `CMakeLists.txt`의 project version,
     README/README.en/docs의 current release baseline, release metadata 문서도
     `1.9.0`/`v1.9.0` 기준으로 맞춘다.
   - historical evidence, 과거 release archive, 과거 수동 UI 결과 문서처럼 증적 보존
     목적의 이전 버전 표기는 현재 기준으로 덮어쓰지 않는다.
   - `verify-release-metadata`가 보고하는 current version/current tag가 이번 릴리즈
     기준과 일치해야 다음 단계로 넘어간다.
3. 전체 문서 업데이트
   - README, `README.en.md`, `docs/README.md`, release evidence, backlog/roadmap,
     UI/fulltest 문서, config/operation 문서를 현재 릴리즈 브랜치 기준으로 갱신한다.
   - README는 공개 첫 화면이므로 제품 정체성, 현재 release, 빠른 시작, 대표 이미지,
     핵심 문서 링크가 가독성 있게 보이는지 최우선으로 확인한다.
   - README에 들어가야 할 새 기능/상태/이미지가 있으면 추가하고, README가 과밀해지면
     세부 내용은 `docs/README.md` 또는 전용 문서로 넘긴 뒤 대표 링크만 둔다.
   - 문서 이미지와 스크린샷은 현재 UI와 맞아야 하며, 새로 추가/교체한 이미지는 잘림,
     source URL/debug/raw JSON/auth material 노출 여부를 확인한다.
   - 이전 버전에서만 유효하고 현재 릴리즈에서 deprecated된 route, 기능, 검증 명령,
     스크린샷, 상태 설명은 남겨두지 말고 삭제하거나 현재 기준으로 바꾼다.
   - `release-evidence-index`, backlog close-out, post-release reconciliation 문서,
     release notes source 문서를 실제 실행/미실행 상태에 맞게 갱신한다.
   - `CHANGELOG`/`CHANGELOG.md`/`NEWS` 같은 변경 이력 파일이 있으면 현재 릴리즈 항목을
     갱신하고, 없으면 “변경 이력 파일 없음”으로 보고한다.
   - 실행하지 않은 테스트, 미완료 기능, release 후속 작업을 완료처럼 쓰지 않는다.
4. 빌드와 릴리즈 검증
   - 최소 `./server.sh build`, 문서 검증, release metadata/evidence 검증,
     현재 릴리즈 범위의 안정화 테스트를 실행한다.
   - GitHub Actions required check와 warning/failure annotation gate를 분리해 확인한다.
     annotation JSON을 확보한 경우 `./server.sh verify-actions-security --annotations-json <annotations.json>`를
     실행하고, 확보하지 못했으면 annotation 상태를 `미확인`으로 보고한다.
   - PR check, required check, optional check, warning annotation, local verifier 결과를
     서로 대체하지 않고 각각 PASS/FAIL/미확인으로 기록한다.
   - 30분/120분/UI 풀테스트는 사용자가 릴리즈 준비 지시와 함께 실행을 승인했거나,
     별도 지시가 있는 경우에만 실행한다. 실행하지 않은 장시간/UI 테스트는 미실행으로
     분리해 보고한다.
   - 빌드 또는 핵심 release gate가 실패하면 PR, main merge, tag, GitHub Release,
     후속 브랜치 생성을 진행하지 않는다.
5. PR 생성과 main 머지
   - 모든 변경이 커밋되고 release gate가 통과한 뒤 현재 릴리즈 브랜치를 push한다.
   - GitHub PR을 생성하거나 기존 PR을 갱신하고, CI/check 상태를 확인한다.
   - main merge는 PR check가 통과한 뒤 수행한다. merge 방식은 저장소 정책을 따른다.
   - PR merge 후 main을 최신 상태로 fetch/checkout/pull하고, tag 대상 main commit
     hash와 PR merge commit hash를 확인해 보고한다.
   - merge에 실패하거나 CI가 실패하면 tag/GitHub Release/후속 브랜치를 진행하지 않는다.
6. 릴리즈 tag 생성
   - PR이 main에 merge된 뒤 main의 최신 release commit에 annotated 릴리즈 tag를 만든다.
   - 예: `1.9.0` 릴리즈면 main의 마지막 릴리즈 커밋에 `v1.9.0` tag가 있어야 한다.
   - 동일 tag가 local 또는 remote에 이미 있으면 덮어쓰거나 force update하지 않고
     즉시 중단해 충돌 상태를 보고한다.
   - tag 대상 commit hash를 확인하고, tag를 push하기 전후 hash를 보고한다.
7. GitHub Release 업데이트와 published metadata 재검증
   - GitHub 우측 Releases에 해당 버전이 보이도록 tag 기반 GitHub Release를 생성하거나
     기존 draft/release를 갱신한다.
   - release notes에는 실제 완료된 항목, 주요 변경, 검증 결과, 미실행/제외 항목을
     구분해 적는다.
   - GitHub Release 생성/갱신 후 `./server.sh verify-release-metadata --published`를
     실행해 Latest Release, release URL, remote tag, release branch 상태를 재검증한다.
   - GitHub Release 생성/갱신에 실패하면 후속 브랜치 생성 전 실패로 보고한다.
8. 후속 버전 브랜치 생성
   - 릴리즈 tag와 GitHub Release가 완료된 뒤 다음 릴리즈 브랜치를 만든다.
   - patch 버전 브랜치는 사용자가 특별히 지시하지 않으면 만들지 않는다.
   - minor 버전은 `9`가 마지막이다. 예: `1.8.0` 다음은 `1.9.0`,
     `1.9.0` 다음은 `2.0.0`이다.
   - 일반 규칙은 `major.minor.patch`에서 patch는 `0` 유지, minor가 `0`~`8`이면
     `minor + 1`, minor가 `9`이면 `major + 1.0.0`이다.
   - 후속 브랜치는 main을 fetch/checkout/pull한 뒤 release tag commit이 포함된 최신
     main에서 생성하고 push한다.
   - release branch 삭제는 별도 명시 지시가 없으면 수행하지 않는다.
9. 실패와 rollback 경계
   - 실패 후 local/remote tag 삭제, force push, GitHub Release 삭제, merge revert,
     release branch 삭제 같은 rollback성 작업을 임의로 수행하지 않는다.
   - 이미 생성된 외부 상태가 있으면 commit/tag/release URL과 실패 지점을 보고하고,
     사용자 지시를 기다린다.

릴리즈 준비 최종 보고에는 반드시 아래를 포함한다.

```text
릴리즈 준비 결과:
- 기준 버전:
- 사전 clean/sync:
- 문서 업데이트:
- 빌드/검증:
- PR:
- main merge:
- tag:
- GitHub Release:
- published metadata 재검증:
- 후속 브랜치:
- CHANGELOG/변경 이력:
- 미실행/제외 테스트:
- 실패/중단 지점:
```

---

## 7. 테스트 정책

작업 종류별 최소 테스트는 아래를 따른다.
사용자가 별도 테스트를 지정하면 사용자의 지시를 우선한다.

### 7.1 문서 전용 변경

```bash
git diff --check
```

가능하면 추가:

```bash
./server.sh verify-docs-links
./server.sh verify-docs-ui-assets
```

명령이 없으면 “명령 없음”으로 보고하고 임의로 통과 처리하지 않는다.

### 7.2 UI / Auth / Ops / Client 변경

```bash
./server.sh build
./server.sh verify-auth-bootstrap
./server.sh verify-auth-users
./server.sh verify-auth-routes
./server.sh verify-ops-client-ui
./server.sh verify-ops-client-ui --screenshots
./server.sh verify-rule-ui
git diff --check
```

추가 가능 항목:

```bash
./server.sh verify-ops-click-e2e
./server.sh verify-ops-tables-layout
./server.sh verify-ops-rules-roundtrip
```

명령이 없으면 “명령 없음”으로 보고하고 임의로 통과 처리하지 않는다.

### 7.3 `/ops/rules` / VA Rule / Scenario 변경

```bash
./server.sh build
./server.sh verify-rule-ui
./server.sh verify-ops-rules-roundtrip
./server.sh verify-analysis-state
./server.sh verify-va-replay
./server.sh verify-va-events
git diff --check
```

### 7.4 RTSP / WebRTC / Media path 변경

```bash
./server.sh build
./server.sh verify-codecs
./server.sh verify-webrtc-ice
./server.sh verify-webrtc-va-metadata
git diff --check
```

### 7.5 Runtime Dashboard / metadata / SSE / WS 변경

```bash
./server.sh build
./server.sh verify-va-runtime-console
./server.sh verify-webrtc-va-metadata
./server.sh verify-va-metadata-sidechannel
./server.sh verify-ws-metadata
git diff --check
```

### 7.6 테스트 영역 역할 분리

테스트 보고와 완료 판정은 `스크립트 테스트`와 `UI 풀테스트`를 반드시 분리한다.
두 영역은 서로 보완 evidence일 뿐, 서로를 대체하지 않는다.

| 영역 | 역할 | 완료로 인정되는 evidence | 완료로 인정하지 않는 것 |
| --- | --- | --- | --- |
| 안정화 테스트 | build, static, API/schema, auth route, media path, verifier 중심의 선수 테스트. 30분/120분/UI 테스트 전에 먼저 통과해야 하며, 로드맵 각 스텝 종료 시 수행 | 실제 실행한 명령, exit code, summary/report, 로그, 실패/skip 사유 | 30분/120분 장시간 PASS, 브라우저 UI 직접 조작 주장 |
| 30분 테스트 | 장기간 테스트 지시 시 기본으로 수행하는 soak. 각 버전별 로드맵 개발 완료 시 수행 | `verify-predev --soak-minutes 30` summary/report/log | 안정화 테스트, 120분 메모리 감시, UI 풀테스트 |
| 120분 테스트 | 메모리 릭, 장시간 누수, runtime drift 감시용. 무조건 실행하지 않고 필요 시 사용자에게 먼저 말한다 | `verify-predev --soak-minutes 120`, `verify-va-runtime-console-longrun --duration-minutes 120` summary/report/log | 안정화 테스트, 30분 기본 soak, UI 풀테스트 |
| UI 풀테스트 | 인앱 브라우저에서 제품 화면을 직접 열고 클릭/타이핑/선택/반응형/시각 품질/role guard 확인 | 실제 조작한 route, 계정/권한, viewport/theme, screenshot/artifact, 재검수 결과 | 30분/120분 안정화 통과, raw JSON/API-only 확인, 자동 screenshot만 생성 |

보고 시에는 아래 항목을 별도 섹션으로 나눈다.

```text
스크립트 테스트:
- 단기 smoke:
- 30분 안정화:
- 120분 장시간:
- 미실행:
- 토큰 사용량:

UI 풀테스트:
- 직접 확인한 화면:
- 직접 조작한 기능:
- 반응형/시각 품질:
- 제외 기록:
- 토큰 사용량:
```

모든 안정화/30분/120분/UI 테스트 기록에는 `token start`, `token end`,
`token consumed`, `elapsed`, `source`를 남긴다. Codex goal usage처럼 자동
집계값이 있으면 그 값을 우선하고, 집계값이 없으면 미집계 사유를 기록한다.

안정화 테스트가 실패하면 30분/120분/UI 테스트로 넘어가지 않는다.
30분 테스트는 장기간 테스트 지시의 기본값이며, 버전별 로드맵 개발 완료 시 수행한다.
120분 테스트는 메모리 릭/장시간 누수 감시가 필요할 때 사용자에게 먼저 말하고 지시를 받은 뒤 수행한다.
UI 풀테스트도 버전별 로드맵 개발 완료 시 수행한다.
30분/120분 테스트를 통과해도 UI 풀테스트 완료가 아니며, UI 풀테스트를 모두 수행해도
30분/120분 안정화 테스트 완료가 아니다.

UI 풀테스트 판정은 `PASS`와 `FAIL`만 사용한다. 모든 기능을 인앱 브라우저에서
실행하고, 실제 수행 결과가 제품 상태에 반영됐는지 확인하고, 관련 로그를 확인한
경우에만 `PASS`다. VA rule 또는 scenario는 EventRecord/이벤트 발생 이력까지
모두 확인해야 `PASS`다. 그 외는 모두 `FAIL`이다. 실행하지 않음, 일부만 실행,
화면만 열고 기능 결과 미확인, 자동 smoke만 통과, raw JSON/API-only 확인은 모두
`FAIL`이다. 사용자가 실기기 없음 등으로 의도적으로 빼라고 한 항목은 UI 풀테스트
기준에서 제외하고 별도 `제외 기록`에만 남긴다.

UI 풀테스트 결과는 모든 개별 기능, route, control, action 단위로 답한다.
카테고리 묶음 판정은 금지한다. 예를 들어 Auth, Rules, VA 같은 카테고리로
묶어 PASS/FAIL을 대신하지 않고, 기능 ID와 조작/반영/로그 확인 결과를 개별 행으로
나열한다.

Auth verifier는 테스트 실행자가 지정한 비밀번호 환경변수를 사용한다.
`MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD`,
`MEDIA_SERVER_VERIFY_AUTH_PREVIOUS_PASSWORD`,
`MEDIA_SERVER_VERIFY_AUTH_SECOND_PREVIOUS_PASSWORD`,
`MEDIA_SERVER_VERIFY_AUTH_WRONG_PASSWORD_ONE`,
`MEDIA_SERVER_VERIFY_AUTH_WRONG_PASSWORD_TWO`가 없으면 auth 테스트를 시작하지 않고
실패로 보고한다. 스크립트나 문서에 고정 기본 비밀번호를 만들지 않는다.

### 7.7 장시간 테스트

아래 테스트는 명시 요청이 있을 때만 실행한다.

```bash
./server.sh verify-predev --soak-minutes 30
./server.sh verify-predev --soak-minutes 120
./server.sh verify-va-runtime-console-longrun --duration-minutes 120
```

장시간 테스트를 실행하지 않았다면 반드시 보고한다.

```text
장시간 테스트: 실행하지 않음
verify-predev: 실행하지 않음
이유: 사용자 명시 요청 없음
```

### 7.8 버전 로드맵 완료 후 UI 풀테스트

해당 버전의 로드맵에 명시된 개발 내용을 모두 마친 경우, 완료 판정은 스크립트만으로
대체하지 않는다.

1. 브라우저에서 제품 UI를 직접 열고 로드맵에 포함된 기능을 하나하나 눌러 실행한다.
2. `/setup`, `/login`, `/ops`, `/client`, 관련 rule/source/dashboard 흐름을 해당
   버전 범위에 맞게 수동 확인한다.
3. 영상이 포함된 기능은 실제 영상 표시, control, status, 가능하면 VA overlay까지
   눈으로 확인한다.
4. 스크립트 검증은 보조 evidence로만 사용한다. UI 풀테스트를 하지 않았다면 로드맵
   전체 완료라고 보고하지 않는다.
5. UI 풀테스트에서 이상이 발견되면 수정 후 같은 UI 흐름을 다시 직접 실행한다.
6. 열어보지 않은 화면, 누르지 않은 기능, 실행하지 않은 흐름은 UI 풀테스트 대상이면
   `FAIL`로 보고한다. 사용자가 명시 제외한 실기기/외부 credential 항목은 판정에서
   빼고 별도 `제외 기록`에만 남긴다.

### 7.9 기능 추가 시 테스트 항목 정리

기능을 추가하거나 기존 기능을 변경하면 코드만 수정하고 끝내지 않는다.

1. `docs/project-feature-test-inventory.md`에 기능을 개별 action/route/control 단위로
   추가하거나 갱신한다.
2. 각 기능 행은 `안정화 테스트`, `30분 테스트`, `120분 테스트`, `UI 테스트` 네 칸 중
   적용 상태를 모두 채워야 한다. 해당 기능의 테스트가 어떤 단계에 속하는지 비워두지
   않는다.
3. 제품 UI가 필요한 기능은 `UI 존재`와 `PASS 출력/판정`에 실제 화면 control/state와
   조작 성공 기준을 적는다.
4. API/CLI/backend 정책처럼 제품 UI가 없어야 정상인 기능은 억지로 UI를 만들지 않고
   `비대상: UI 없어야 정상`으로 표기한다.
5. 실기기/외부 endpoint가 필요한 기능은 사용자가 제외하라고 한 경우 기본
   안정화/30분/120분/UI 테스트 기준에서 제외하고, field smoke 별도 조건과 제외
   사유를 `제외 기록`에 적는다.
6. 기능 개발 중 기존 코드가 구버전 레거시가 되면 호환 명목으로 남겨두지 않는다.
   현재 릴리즈 제품 route/API/UI에서 쓰지 않는 레거시 화면, route, helper, verifier
   문자열은 영향 범위를 확인한 뒤 같은 작업 범위에서 삭제한다.
7. UI 테스트는 Codex 인앱 브라우저에서 직접 클릭/타이핑/반응형 확인으로 수행한다.
   raw JSON, curl, Playwright 스크립트만으로 제품 UI 수동 확인을 대체했다고 보고하지
   않는다.
8. VA rule, scenario, tracker, Re-ID처럼 기능 축이 늘어나는 경우에는 새 기능을
   카테고리 한 줄로 묶지 않는다. 각 event type, scenario type, line direction,
   tracker policy, Re-ID policy, invalid 조합, runtime 반영, EventRecord 발생 여부를
   각각 독립 기능 ID/결과 행으로 추가한다.
9. 기능별 테스트 결과 행의 판정값은 `PASS`와 `FAIL`만 쓴다. 테스트 대상인데 실행하지
   않았거나 일부 조건만 확인한 항목은 `FAIL`이다. 사용자가 실기기/외부 endpoint 등으로
   명시 제외한 항목은 테스트 결과 행에서 빼고 `제외 기록`에만 남긴다.

---

## 8. 중단 조건

아래 상황이 발생하면 즉시 중단하고 보고한다.
단, `/goal` 명령의 실패 처리 예외는 3.1을 따른다. 이 경우에도 실패 상태를 숨기지
않고, 실패 단계가 통과하기 전에는 다음 단계로 넘어가지 않는다.

1. build 실패
2. 핵심 smoke 실패
3. auth route guard 실패
4. viewer에게 source URL/debug/raw JSON 노출
5. WebRTC DataChannel schema 변경 징후
6. Event POST payload 변경 징후
7. SSE/WS metadata schema 변경 징후
8. RTSP/WebRTC media path 회귀
9. cleanup failure
10. port cleanup failure
11. DataChannel failure가 영상 경로 실패로 전파
12. `git diff --check` 실패
13. 테스트 명령 자체가 없거나 실행 불가인데 대체 판단이 필요한 경우

중단 보고 형식:

```text
중단 위치:
- 단계: 3/8
- 구간: 안정화 테스트
- 실패 명령: ./server.sh verify-auth-routes

결과:
- 상태: 실패
- 뒤 단계: 4~8 건너뜀

원인:
- 확인된 원인
- 추정 원인

변경 파일:
- ...

커밋:
- 3단계는 수행하지 않음

후속:
- ...
```

---

## 9. UI 작업 규칙

UI 작업은 현재 화면의 사용 흐름과 기존 design token을 유지하는 것을 우선한다.

### 9.1 공통 원칙

1. `/ops`, `/client`, `/setup`, `/login`은 같은 light/dark theme-aware token을 사용한다.
2. card, button, form, table, badge, debug details는 공통 스타일을 사용한다.
3. raw JSON은 운영자 debug details 접힘 영역에만 둔다.
4. client/viewer 화면에는 source URL, Developer URL, raw JSON, debugCounters, BBox diagnostics, rule/profile editor를 노출하지 않는다.
5. `/ops/rules` smoke selector와 Rule/Profile 저장 흐름을 깨지 않는다.
6. 개발/검증 editor를 제품 화면에 되살리거나 embed하지 않는다.
7. UI 화면을 보지 않았으면 수동 확인했다고 쓰지 않는다.

### 9.2 Ops 화면

Ops primary nav 기준:

```text
Home
Dashboard
Channels
Rules
Users
Client Preview
```

`/ops/events`는 primary nav가 아니라 진단/직접 route 또는 Dashboard 내부 섹션으로 취급한다.

### 9.3 Client 화면

Client primary nav 기준:

```text
Live
Dashboard
```

viewer에게는 Ops/Lab navigation을 숨긴다.
admin이 client 화면을 보면 `Client Preview as admin` 상태를 명확히 표시한다.

### 9.4 Lab / 개발 API 경계

개발/검증 기능은 `/lab/analysis/*`, `/lab/runtime/status`, `/ws/va-metadata`
같은 API와 전용 검증 명령으로 다룬다.
운영자가 사용하는 Rule/Profile 화면은 `/ops/rules`이다.

개발/검증 editor 구조를 제품 화면에 embed하지 않는다.

---

## 10. Auth / 계정 / 권한 규칙

1. 기본 auth mode는 제품 기준 `auto`이다.
2. auth off는 개발/검증용 명시 모드로만 사용한다.
3. users file이 없거나 admin passwordHash가 없으면 `/setup`으로 이동한다.
4. 기본 admin username은 `admin`이다.
5. admin 기본 비밀번호는 없다.
6. passwordless admin login은 금지한다.
7. 비밀번호 원문 저장은 금지한다.
8. 비밀번호는 libsodium `crypto_pwhash_str` 또는 동급 password hash로 저장한다.
9. 단순 SHA, 평문, 복호화 가능한 비밀번호 저장은 금지한다.
10. `passwordHash`, `passwordHistory`, `tokenHash`, invite `tokenHash`는 UI/API 응답에 노출하지 않는다.
11. 마지막 admin 비활성화는 막는다.
12. client self-signup 자동 승인은 금지한다.
13. client request는 admin 승인 전까지 user/session/view scope를 만들지 않는다.

---

## 11. Media / VA / Event 불변 조건

다음 항목은 요청 없이 변경하지 않는다.

1. WebRTC DataChannel schema
2. SSE/WS metadata schema
3. Event POST payload schema
4. 기존 Intrusion/LineCrossing event type
5. Scenario 판단 로직
6. RTSP/WebRTC streaming path
7. SourceRegistry / PublishedView API 계약
8. Rule/Profile 저장 payload 계약
9. `vaRule=<id>` 호출 정책
10. media pipeline blocking 정책

---

## 12. 문서 관리 규칙

문서 변경 시 다음을 확인한다.

1. README와 docs 사이의 용어가 일치하는지
2. 최신 URL이 일치하는지
3. Auth 기본값이 `auto`로 정리되어 있는지
4. `/ops/home`, `/client/live`, `/ops/rules`, `/lab/analysis/*` 설명이 실제 구현과 맞는지
5. 완료/MVP/후속/실험 상태가 과장되지 않았는지
6. 실행하지 않은 검증을 문서에 완료처럼 쓰지 않았는지
7. 스크린샷이 실제 현재 UI와 맞는지
8. VMS/NVR 녹화 기능처럼 오해될 표현이 없는지

문서에서 기능 상태를 표현할 때:

```text
구현 완료
MVP 완료
1차 구현
후속 예정
실험 기능
검증 미수행
```

을 구분한다.

### 12.1 문서 가독성 / 정보 구조 규칙

문서 변경 시 내용 정확도만 맞추고 끝내지 않는다. 사람이 처음 읽는 순서와 공개
첫 화면의 밀도를 함께 검토한다.

1. README 첫 화면에는 제품 정체성, 현재 release, 빠른 시작, 핵심 문서 링크만 둔다.
2. release evidence, verifier 목록, historical close-out, 세부 정책 링크를 README에
   전부 나열하지 않는다. 그런 항목은 `docs/README.md` 또는 해당 전용 문서에 둔다.
3. `docs/README.md`는 전체 문서 색인 source-of-truth로 유지한다. 새 문서를 추가하면
   적절한 카테고리에 넣고, README에는 꼭 필요한 경우에만 대표 링크를 추가한다.
4. 문서 색인은 1차 독자의 목적별로 묶는다. 파일 생성 순서, roadmap 완료 순서,
   verifier 이름 순서로 긴 표를 만들지 않는다.
5. release close-out 문서는 증적 보존용으로 유지하되, 공개 진입점에서는 한 문장과
   대표 링크로만 연결한다.
6. backlog 상단에는 현재 제품 baseline과 비범위만 요약한다. 세부 완료 이력은
   하위 섹션, follow-up closure, history 문서로 밀어낸다.
7. 같은 내용을 README, README.en.md, docs/en/README.md, docs/README.md에 반복해서
   풀어 쓰지 않는다. 각 문서는 역할을 분리한다.
8. 긴 표를 추가하기 전에 목록/섹션/전용 문서 링크로 읽기 쉽게 분리할 수 있는지
   먼저 검토한다.
9. verifier가 README에 세부 문서 전체 나열을 강제하게 만들지 않는다. verifier는
   README가 대표 색인으로 연결되는지, 전용 문서가 세부 링크를 보존하는지 확인한다.
10. 문서 전용 변경이라도 `git diff --check`, `verify-docs-links`,
    `verify-release-metadata` 실행 가능 여부를 확인하고, 미실행 항목은 보고한다.

### 12.2 문서 분할 / 중복 관리 규칙

문서가 많아질수록 새 파일을 만드는 것보다 기존 source-of-truth를 선명하게 유지하는
것을 우선한다.

1. 새 문서를 추가하기 전 `docs/README.md`, README, backlog, release evidence,
   policy/reference 문서에 이미 같은 독자와 lifecycle을 가진 문서가 있는지 먼저 확인한다.
2. 같은 독자, 같은 목적, 같은 검증 주기를 가진 내용은 새 파일로 쪼개지 말고 기존
   문서의 하위 섹션으로 흡수한다.
3. 별도 문서는 독자, 유지 주기, evidence 보존 이유, verifier 경계가 분명할 때만
   만든다.
4. backlog는 세부 source-of-truth가 아니다. 상세 정책, evidence, 후보 목록은 전용
   문서에 두고 backlog에는 상태 요약과 대표 링크만 둔다.
5. README, `docs/README.md`, release evidence, boundary 문서가 같은 문장이나 같은
   목록을 반복하지 않게 한다. 한 문서를 source-of-truth로 정하고 나머지는 링크와
   한 줄 요약으로 연결한다.
6. verifier 통과를 이유로 README나 backlog에 세부 목록을 중복 삽입하지 않는다.
   verifier는 대표 링크와 전용 문서의 존재를 확인하도록 조정한다.
7. 문서 전면 리뷰를 요청받으면 파일 수, 짧은 문서의 분할 이유, 긴 문서의 중복 섹션,
   반복되는 긴 문단/목록을 함께 확인한다.
8. 의도적으로 반복해야 하는 release/evidence 문구가 있으면 어느 문서가
   source-of-truth인지 문서 안에서 명시한다.

### 12.3 문서 이미지 / 스크린샷 규칙

문서에 이미지를 추가하거나 갱신할 때는 이미지 자체를 제품 증적으로 취급한다.

1. 스크린샷은 상하좌우 UI가 잘리지 않아야 한다. crop이 필요한 경우에도 주요 화면,
   영상 frame, control, status, caption이 잘리지 않는지 확인한다.
2. 영상이 포함된 화면은 전체 video viewport가 보이게 캡처한다. 특히 하단 control,
   timeline, status, overlay 영역이 잘린 이미지는 사용하지 않는다.
3. 영상이 포함된 화면은 가능하면 프로젝트의 4신 sample 영상을 사용한다.
4. VA overlay 설정이 가능한 화면은 overlay를 켠 상태로 캡처한다. overlay를 켜지
   못한 경우에는 이유와 미확인 범위를 보고한다.
5. client/viewer 스크린샷에는 source URL, Developer URL, raw JSON, debug counter,
   BBox diagnostics, model path/checksum/provenance, auth/session material이 보이면 안 된다.
6. 새 스크린샷을 추가한 경우에는 문서 링크 검증뿐 아니라 이미지가 현재 UI와 맞는지
   직접 확인한다. 직접 확인하지 않았으면 확인했다고 보고하지 않는다.
7. mobile/desktop screenshot을 함께 갱신할 때는 작은 viewport에서 텍스트, 영상,
   toolbar가 잘리지 않는지 별도로 확인한다.

---

## 13. 보고 형식

각 단계 완료 후 아래 형식으로 보고한다.

```text
2/8단계 완료

작업:
- ...

변경 파일:
- ...

검증:
- ./server.sh build: 통과
- ./server.sh verify-rule-ui: 통과
- git diff --check: 통과

미실행:
- 장시간 테스트: 실행하지 않음
- verify-predev: 실행하지 않음

커밋:
- 메시지: ...
- 해시: ...
- 푸시: 수행하지 않음

다음 단계:
- 3/8 진행 가능
```

실패 시:

```text
3/8단계 실패

실패 지점:
- 명령: ...
- 결과: 실패

원인:
- 확인된 원인:
- 추정 원인:

변경 파일:
- ...

커밋:
- 수행하지 않음

중단:
- 4/8~8/8 건너뜀

후속 조치:
- ...

푸시 가능: 아니오
```

전체 완료 시:

```text
전체 결과:
- 1/8 완료
- 2/8 완료
- ...
- 8/8 완료

후속 이슈 추천:
1. ...
2. ...
3. ...
4. ...
5. ...

미실행 테스트:
- ...

푸시 가능: 예/아니오
푸시 수행 여부: 수행하지 않음
```

---

## 14. 후속 이슈 추천 규칙

전체 단계가 끝나면 후속 이슈를 추천한다. 단, 후속 이슈는 현재 버전과 현재 스텝
범위 안에서 실제로 처리 가능한 항목만 언급한다.

다음 항목은 후속 이슈로 추천하거나 기록하지 않는다.

- 이번 버전에 들어가지 않는 기능
- 현재 스텝 범위를 벗어난 별도 Phase 후보
- 다음 버전 로드맵 후보
- 사용자 승인이 필요한 새 제품 범위
- 이번 단계 완료 판정과 무관한 research/backlog 아이디어

현재 버전/현재 스텝 안에 남은 후속 이슈가 없으면 `후속 이슈: 없음`으로 보고한다.
개수를 맞추기 위해 범위 밖 항목을 억지로 추천하지 않는다.

추천 시 포함할 것:

1. 이슈 제목
2. 우선순위
3. 이유
4. 예상 검증
5. 현재 버전/현재 스텝 범위에 속한다는 근거

예시:

```text
후속 이슈 추천:
1. P1 - Manual UI evidence의 미확인 화면 재검수
   이유: 이번 버전 release checklist에서 직접 클릭 evidence가 비어 있음
   검증: 브라우저 수동 UI 풀테스트, verify-docs-ui-assets
   범위: 현재 버전 release checklist closure 내부
```

---

## 15. 절대 금지 요약

상세 규칙은 앞 장을 우선한다. 아래 항목은 어떤 작업에서도 예외 없이 금지한다.

- 실패, 미실행 테스트, 미확인 화면, 미커밋/미푸시 상태를 완료처럼 보고
- schema, payload, media path, auth/scope 계약을 요청 없이 변경
- 장시간 테스트, `verify-predev`, 푸시를 명시 요청 없이 실행
- viewer/client에 debug/source/raw 정보를 노출
- 제품 기능을 문서에서 과장하거나 VMS/NVR 녹화 기능처럼 표현
