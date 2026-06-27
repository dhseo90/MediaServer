# AGENTS.md

이 문서는 MediaServer 프로젝트에서 자동화 개발 에이전트가 반드시 따라야 하는 작업 규칙입니다.
대상 프로젝트는 macOS/Linux 기반 C++17 RTSP/WebRTC 미디어 서버이며, GStreamer 기반 스트리밍, YOLO/ONNX 영상 분석, `/lab/analysis/*` 개발 API, `/ops`, `/client`, Auth/Role/Scope, 채널/룰/런타임 대시보드 UI를 포함합니다.

---

## 1. 문서 운용 원칙과 요청 라우터

에이전트는 작업을 시작하기 전에 먼저 최신 사용자 요청을 아래 요청 유형 중 하나로 분류한다.
분류가 애매하면 더 넓은 권한을 가정하지 말고, 사용자가 명시한 범위 안에서 가장 좁은 유형으로 처리한다.

| 요청 유형 | 대표 표현 | 허용 범위 | 금지 범위 | 필수 적용 장 |
| --- | --- | --- | --- | --- |
| 조사/검토/목록화 | 확인해, 찾아, 리뷰, 리스트업, 근거 제시 | 읽기, 직접 확인, 근거 분리 보고 | 구현, 테스트 실행, 커밋, 푸시 | 1, 6 |
| 릴리즈 잔여 이슈 리스트업 | 릴리즈 준비 항목 리스트업, 잔여 이슈, 우선순위/개발 순서 | 2장의 산출물 작성, 직접 확인, 미실행/미확인 보고 | 테스트 실행, release action, 커밋, 푸시 | 2, 6, 7 |
| 단계/로드맵 개발 | N번 진행, 1~5번 개발, 다음 스텝 진행 | 지정 범위 개발, 지정 범위 테스트 준비/실행 | 지정 범위 밖 개발, 자동 다음 단계 착수 | 3, 6, 7 |
| 테스트 실행 | 안정화 테스트, 30분, 120분, UI 풀테스트 | 사용자가 명시한 테스트 묶음 실행 | 승인 밖 테스트 확대, 대체 PASS | 7 |
| 릴리즈 실행 | PR 생성, main merge, tag, GitHub Release, 후속 브랜치 | 사용자가 명시 승인한 외부 상태 변경 | 승인 없는 push/PR/merge/tag/release/branch | 4, 5 |
| 커밋/푸시 | 커밋해, push, PR 올려 | 승인 범위 stage/commit/push | 자의적 stage/commit/push | 5 |
| 문서 변경/정리 | 문서 수정, README 정리, AGENTS 정리 | 지정 문서 수정, 문서 검증 | 실행하지 않은 검증을 완료처럼 기록 | 12, 6 |

### 1.1 최우선 원칙

1. 사용자가 지정한 작업 범위를 넘지 않는다.
2. 기능 로직, API schema, event payload, WebRTC/SSE/WS metadata schema, RTSP/WebRTC media path는 요청 없이 변경하지 않는다.
3. 장시간 테스트, `verify-predev`, 커밋, 푸시는 명시 요청 없이 실행하지 않는다.
4. 실패와 미실행 항목을 숨기지 않는다.
5. 확인된 사실과 추정은 분리해서 보고한다.
6. 실패한 단계 이후의 단계는 모두 중단하고 `건너뜀`으로 보고한다.
7. 사용자가 로드맵/목차/단계 중 특정 카테고리 개발을 지시하면, 그 카테고리 범위 안에서만 작업한다. 사용자가 명시적으로 추가 지시하지 않은 다른 로드맵 카테고리로 넘어가지 않는다.
8. 모든 대화, 진행 업데이트, 최종 보고는 한글로 한다.
9. 개발 작업에는 Superpowers 절차를 활용하고, 작업을 병렬로 안전하게 나눌 수 있으면 필요에 따라 서브 에이전트를 이용한다.

### 1.2 AGENTS.md 우선순위와 충돌 처리

`AGENTS.md`는 자동화 에이전트의 개발, 테스트, 보고, 커밋, 푸시 규칙에 대한 최상위 source-of-truth다. 다른 README, docs, roadmap, release evidence, checklist, result template, verifier 설명이 이 문서보다 느슨하거나 다르게 해석될 수 있으면 이 문서를 우선한다. 에이전트는 자신에게 편한 문서를 골라 적용하지 않는다.

아래 상황은 즉시 중단하고 충돌로 보고한다.

1. 다른 문서가 AGENTS.md보다 넓은 완료/통과/푸시 권한을 주는 것처럼 보이는 경우
2. roadmap이나 release evidence의 `완료` 표기가 실제 직접 evidence와 맞지 않는 경우
3. verifier 설명이 UI 직접 조작, 30분, 120분, field smoke, publish evidence까지 대체할 수 있는 것처럼 보이는 경우
4. 사용자의 최신 지시와 기존 문서/과거 대화가 충돌하는 경우

조사, 검토, 목록화, 근거 제시, 문서 리뷰 요청은 구현 착수, 테스트 실행, 커밋, 푸시 승인이 아니다. 사용자가 "확인해", "찾아", "리스트업", "근거 제시", "리뷰"라고 말한 경우에는 그 범위를 보고 작업으로만 처리한다. 코드/문서 수정, 커밋, 푸시가 필요하면 사용자가 별도로 명시한 경우에만 진행한다.

에이전트에게 자의적 커밋 권한은 없다. 이전 대화, 과거 규칙, release close-out 관행, `/goal`, "릴리즈 준비", "마무리", "끝내" 같은 표현은 커밋 승인으로 해석하지 않는다. 최신 사용자 요청에 `커밋해`, `커밋 진행`, `commit`처럼 커밋 자체가 명시되지 않으면 커밋하지 않는다. 커밋 가능 상태 보고와 실제 커밋은 서로 다르며, 커밋 가능하다고 판단해도 멈추고 사용자 승인을 기다린다.

---

## 2. 릴리즈 잔여 이슈 리스트업 프로토콜

이 장은 사용자가 릴리즈 준비를 위해 남은 항목, 잔여 이슈, 우선순위, 개발 순서를 리스트업하라고 요청했을 때만 적용한다.
이 요청은 일반 목록 요청이 아니며, 아래 산출물 없이 자유 목록으로 답하면 규칙 위반이다.
이 장은 테스트 기준, 커밋/푸시 권한, release action 권한을 재서술하지 않는다. 해당 기준은 5장, 7장, 4장을 source-of-truth로 적용하고, 이 장은 적용 순서와 산출물 형식만 강제한다.

### 2.1 릴리즈 잔여 이슈 리스트업에서 허용되는 작업

1. `AGENTS.md` 읽기
2. roadmap/backlog/release 문서 읽기
3. 프로젝트 구조와 관련 파일 확인
4. 실제 구현 여부 직접 확인
5. verifier, script dispatch, evidence 문서 존재 여부 확인
6. release/test 기록의 실행/미실행/제외 상태 확인
7. 직접 확인한 사실, AGENTS 직접 규칙, 추론/제안을 분리해 보고

### 2.2 릴리즈 잔여 이슈 리스트업에서 금지되는 작업

1. 사용자 명시 승인 없는 코드/문서 수정
2. 사용자 명시 승인 없는 안정화 테스트, 30분 테스트, UI 풀테스트, 120분 테스트 실행
3. 사용자 명시 승인 없는 커밋, 푸시, PR 생성, main merge, tag 생성, GitHub Release 생성/갱신, 후속 브랜치 생성
4. 문서상 `완료` 표기만 믿고 실제 구현 확인을 생략
5. verifier PASS를 verifier가 검사하지 않은 요구사항의 PASS로 확대 해석
6. 추론한 Step 이름, verifier 이름, release gate 이름을 AGENTS 직접 규칙처럼 보고
7. 테스트 필요성 판정표 없이 `30분 필요`, `120분 필요`, `UI 필요`, `안정화 필요`라고 단정
8. 120분 테스트 판정을 PR/main merge/tag/GitHub Release 이후 순서에 배치

### 2.3 필수 확인 순서

릴리즈 잔여 이슈 리스트업은 반드시 아래 순서로 진행한다.

1. 최신 사용자 지시를 전수표로 분해한다.
2. `AGENTS.md`를 현재 작업 기준으로 읽고 적용 장을 식별한다.
3. 현재 branch, `VERSION`, build metadata, roadmap/release 문서에서 기준 버전을 확인한다.
4. roadmap의 해당 버전 항목을 읽고 문서상 완료/미완료를 분리한다.
5. 문서상 완료라고 적힌 항목도 실제 파일, route, 함수, 모듈, UI control, API, verifier, dispatch, evidence 존재 여부로 직접 확인한다.
6. 각 확인 결과를 `AGENTS 직접 규칙`, `프로젝트 직접 확인`, `추론/제안`으로 분류한다.
7. 7.6.2의 테스트 필요성 판정표를 먼저 만든다.
8. 개발/문서/evidence/verifier/test/release action/field smoke 항목을 서로 다른 성격으로 분리한다.
9. 우선순위와 개발 순서를 작성한다.
10. 미실행, 미확인, 제외, 조건부, 사용자 승인 필요 항목을 별도 표로 남긴다.

위 순서 중 하나라도 건너뛰면 릴리즈 잔여 이슈 리스트업은 `FAIL`이다.

### 2.4 필수 산출물

릴리즈 잔여 이슈 리스트업 답변에는 반드시 아래 표를 포함한다.

```text
| 번호 | 사용자 지시 | 처리 상태 | 결과 | 근거 |
| --- | --- | --- | --- | --- |
```

```text
| 항목 | 기준 값 | 직접 확인 결과 | 근거 |
| --- | --- | --- | --- |
```

```text
| roadmap 항목 | 문서상 상태 | 직접 확인 상태 | 불일치 여부 | 근거 |
| --- | --- | --- | --- | --- |
```

```text
| 확인 대상 | 실제 파일/route/함수/API/UI/verifier | 확인 결과 | 근거 |
| --- | --- | --- | --- |
```

```text
| 항목 | 근거 유형(AGENTS 직접 규칙/프로젝트 직접 확인/추론·제안) | 근거 | 릴리즈 영향 |
| --- | --- | --- | --- |
```

```text
| 테스트 카테고리 | 판정 | 직접 근거 | 근거 파일/행/기능 ID | 실행 승인 상태 |
| --- | --- | --- | --- | --- |
```

```text
| 순서 | 우선순위 | 잔여 이슈 | 해야 할 일 | 성격 | 근거 유형 | release action 전/후 |
| --- | --- | --- | --- | --- | --- | --- |
```

```text
| 항목 | 상태(미실행/미확인/제외/조건부/blocker) | 사유 | 완료 evidence로 사용 가능 여부 | 다음 조건 |
| --- | --- | --- | --- | --- |
```

### 2.5 우선순위와 순서 산정

우선순위는 아래 의미로만 사용한다.

```text
P0:
- release blocker
- 거짓 완료/거짓 PASS를 막기 위한 필수 확인
- release action 전 반드시 끝나야 하는 개발, evidence, test 판정, cleanup

P1:
- release 준비 품질을 위해 정리해야 하지만 P0 처리 뒤 진행 가능한 항목

P2:
- credential, endpoint, 실기기, 외부 조건, 사용자의 별도 제품 판단에 의존하는 조건부 항목
```

순서는 반드시 아래 범주 흐름을 지킨다.

1. 기준 버전/브랜치/문서 source-of-truth 확인
2. roadmap 문서 상태와 실제 구현 상태 불일치 확인
3. 누락된 개발, verifier, evidence, 문서 연결 보강 항목 식별
4. 테스트 필요성 판정
5. release 전 local 안정화와 필수 blocker 식별
6. 테스트 임시 산출물 cleanup과 evidence 보존 판단
7. 사용자 명시 승인 후 가능한 PR/main merge/tag/GitHub Release/published metadata/후속 브랜치 action 분리
8. field smoke, 외부 credential, 실기기 조건부 항목 분리

### 2.6 리스트업 FAIL 조건

아래 중 하나라도 발생하면 리스트업 자체를 실패로 보고하고 즉시 정정한다.

1. 필수 산출물 표 누락
2. AGENTS 직접 규칙, 프로젝트 직접 확인, 추론/제안 미분리
3. roadmap의 `완료` 표기를 직접 확인 없이 완료 evidence로 사용
4. 테스트 필요성 판정표 없이 테스트 필요/불필요를 단정
5. 120분 테스트 판정을 release action 뒤에 배치
6. 30분 테스트와 UI 풀테스트의 미실행 상태를 release blocker가 아닌 선택/조건부처럼 표현
7. release action을 사용자 승인 전 할 일과 섞어서 같은 개발 순서에 배치
8. PR/main merge/tag/GitHub Release/후속 브랜치 생성을 사용자 최신 지시 없이 진행 가능 단계처럼 보고
9. 미실행/미확인/제외/조건부 항목을 완료 evidence처럼 사용
10. 추론한 버전별 Step/verifier를 AGENTS.md에 명시된 규칙처럼 표현

---

## 3. 단계/로드맵 개발 규칙

### 3.1 다중 단계 작업 규칙

사용자는 한 번에 5~10개 단계를 요청할 수 있다.
이 경우 반드시 아래 규칙을 따른다.

1. 단계는 요청된 순서대로만 진행한다.
2. 각 단계는 개발 → 안정화 테스트 → 결과 보고 → 커밋 가능 상태 보고 순서로 닫는다. 실제 커밋은 사용자가 최신 지시에서 커밋을 명시 승인한 경우에만 수행한다.
3. 한 단계가 실패하면 그 즉시 중단한다.
4. 실패한 단계 이후의 모든 단계는 실행하지 않는다.
5. 실행하지 않은 단계는 `건너뜀`으로 표시한다.
6. 실패 단계의 원인, 실패 명령, 영향 범위, 변경 파일, 후속 조치를 보고한다.
7. 실패한 단계는 커밋하지 않는다.
8. 실패 전 이미 사용자 승인으로 커밋된 단계는 그대로 유지한다.
9. 전체 단계가 모두 끝나면 현재 버전/현재 스텝 범위 안의 후속 이슈만 추천한다.
10. 마지막에 푸시 가능 여부를 반드시 보고한다.

### 3.2 단계 완료 후 커밋 가능 상태 보고 전 필수 기록

사용자가 보통 각 스텝별 개발을 지시하는 작업 흐름에서는, 각 스텝 개발이 끝난 뒤 커밋 가능 상태를 보고하기 전에 예외 없이 아래 기록을 먼저 남긴다. 이 기록이 없으면 해당 스텝은 완료가 아니며 커밋 가능 상태로 보고하지 않는다.

1. 로드맵에 해당 스텝을 개발했는지/개발하지 않았는지 명확히 표기한다.
2. 로드맵 또는 해당 스텝 evidence에 `"어디"에 "어떤 로직이 추가되었다"`를 파일, route, 함수, 모듈, UI control, API, verifier 단위로 명확히 표기한다.
3. 테스트 진행 시 추가된 로직과 관련된 모든 개별 테스트 항목을 확인한다.
4. 관련 내용 기록이 없거나, 추가된 기능에 대한 테스트 항목이 하나라도 없으면 해당 브랜치 개발은 `fail`로 판정한다.
5. 브랜치 개발 `fail`은 해당 브랜치 개발 내용의 전면 폐기도 고려한다는 의미다.

각 스텝 커밋은 위 기록과 테스트 결과가 모두 반영되고, 사용자가 최신 지시에서 커밋을 명시 승인한 뒤에만 진행한다. 커밋과 푸시는 모두 자의적으로 수행할 수 없으며, 사용자가 별도로 명시하기 전까지 수행하지 않는다.

### 3.3 `/goal` 명령의 실패 처리 예외

사용자가 `/goal` 또는 goal option으로 end-to-end 목표 달성을 지시한 경우에는 실패를 최종 중단으로 바로 확정하지 않는다.

1. 실패 지점에서 원인, 실패 명령, 영향 범위, 변경 파일을 먼저 기록한다.
2. 같은 목표와 같은 로드맵 범위 안에서 수정 가능한 실패라면 수정 후 해당 단계의 안정화 테스트부터 다시 시작한다.
3. 실패 단계가 통과하기 전에는 뒤 단계를 진행하지 않는다.
4. 같은 실패가 해결 불가능하거나 사용자 결정이 필요한 경우에만 중단으로 보고하고, 그 뒤 단계는 `건너뜀`으로 표시한다.
5. 실패 후 재시작한 경우 최종 보고에는 최초 실패, 수정 내용, 재검증 결과를 모두 함께 적는다.

### 3.4 특정 로드맵 카테고리 지시 시 카테고리 이탈 금지

사용자가 로드맵, 목차, 단계 목록 중 특정 카테고리 또는 번호를 지정해 개발을 지시하면 그 요청은 지정된 로드맵 카테고리 안에서만 적용한다.
지정 카테고리 내부의 하위 작업, 코드 수정, 문서 수정, 테스트, 안정화, 커밋은 허용된다. 금지 대상은 커밋 자체가 아니라 다른 로드맵 카테고리로 넘어가는 것이다.

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

사용자가 특정 스텝의 상태 판단, 검토, 문서 읽기, 코드 확인, 테스트 재검증만 요청한 경우에는 구현 범위를 그 요청에 한정한다. 다른 로드맵 카테고리는 `미진행` 또는 `건너뜀`으로 보고하고, 임의로 개발하지 않는다.

예시:

```text
요청: 1~10번 진행

1번 통과 -> 테스트 통과 -> 커밋 가능 상태 보고
2번 통과 -> 테스트 통과 -> 커밋 가능 상태 보고
3번 개발 후 테스트 실패

결과:
1번 완료, 커밋은 사용자 승인 전 미수행
2번 완료, 커밋은 사용자 승인 전 미수행
3번 실패
4~10번 건너뜀

보고:
- 3번 실패 원인
- 실패 명령
- 실패 로그 요약
- 수정한 파일
- 커밋 여부: 1~3번 모두 사용자 승인 전 커밋하지 않음
- 후속 이슈 추천
- 푸시 가능: 아니오
```

### 3.5 단계별 완료 조건

각 단계는 아래 조건을 모두 만족해야 완료로 본다.

1. 요청한 구현 범위 완료
2. 관련 테스트 실행
3. 테스트 통과
4. `git diff --check` 통과
5. 변경 파일 목록 확인
6. 영향 범위 보고
7. 회귀 가능성 보고
8. 커밋 가능 여부와 커밋 미수행/수행 여부 보고

문서만 수정한 단계도 최소한 `git diff --check`를 실행한다.

---

## 4. 릴리즈 실행 프로토콜

이 장은 릴리즈 close-out 작업, release action, published metadata 확인, 후속 브랜치 생성에 적용한다.
릴리즈 잔여 이슈 리스트업만 요청받은 경우에는 2장을 적용하고 이 장의 외부 상태 변경 작업은 수행하지 않는다.

### 4.1 릴리즈 준비 지시 처리

사용자가 “릴리즈 준비”, “release 준비”, “릴리즈 close-out 준비”처럼 현재 브랜치의 릴리즈 종료를 명시해도, 그 말만으로 push/PR/main merge/tag/GitHub Release/후속 브랜치 생성이 허가된 것이 아니다. `릴리즈 준비`는 아래 close-out 체크리스트를 검토하고, 필요한 문서/검증/커밋 가능 상태를 정리하라는 지시다. 원격 저장소나 GitHub 상태를 바꾸는 작업은 사용자가 같은 최신 요청에서 `푸시`, `PR 생성`, `main merge`, `tag 생성`, `GitHub Release 생성/갱신`, `후속 브랜치 생성`을 각각 명시했거나, 에이전트가 단계별로 물어 사용자가 승인한 경우에만 수행한다.

이는 5장의 일반 푸시 금지 규칙을 약화하지 않는다. release branch 삭제, tag force update, force push, GitHub Release 삭제, rollback성 destructive 조치는 사용자가 별도로 명시하지 않으면 수행하지 않는다. 각 단계는 순서대로 진행하고 실패한 뒤 단계는 모두 중단한다.

릴리즈 준비는 버전 번호만 바꿔 반복 적용하는 공통 close-out으로 취급한다. 아래 항목은 현재 릴리즈 버전의 verifier 이름과 문서 경로로 치환해 적용한다.
테스트 묶음의 실행 여부와 blocker 판정은 7장을 source-of-truth로 사용한다.

release close-out에서도 릴리즈 테스트는 자동으로 넓혀 실행하지 않는다. 안정화 테스트, 30분 테스트, UI 풀테스트, 120분 테스트는 사용자가 직접 어느 묶음을 실행하라고 지시했거나, 에이전트가 실행 여부와 범위를 물어 사용자가 승인한 경우에만 실행한다.

release close-out에서 테스트와 evidence는 서로 대체하지 않는다. 안정화, 30분, UI 풀테스트, 필요 시 120분은 7장의 판정 규칙을 따른다. 30분 테스트와 UI 풀테스트가 7장 기준으로 미실행, FAIL, 미확인 blocker 상태이면, 사용자가 해당 blocker를 알고도 강제로 진행하라고 최신 지시에서 명시 승인한 경우를 제외하고 PR, main merge, tag, GitHub Release, published metadata 재검증, 후속 브랜치 생성으로 넘어갈 수 없다. 30분 테스트와 UI 풀테스트가 "사용자 승인 전 실행 금지"라는 말은 "조건부", "선택", "생략 가능"이라는 뜻이 아니다.

120분은 7.6.2의 진행 조건 또는 현재 release policy/roadmap/evidence의 필수 gate 명시가 있을 때만 필수 release gate로 말한다. 120분 조건을 충족하지 않아 실행하지 않은 경우에는 release evidence와 최종 보고에 `조건부 미실행`으로 남기며, 완료 evidence로 사용하지 않는다.

사용자가 `필수 로컬 안정화 전체`처럼 묶음 실행을 지시한 경우에는 `./server.sh build`, `git diff --check`, 현재 버전 entry/baseline verifier, release metadata/evidence, docs links/assets, feature/script inventory, release close-out dry-run을 포함한다. 명령이 없거나 현재 버전 범위가 아니면 PASS로 대체하지 말고 `미실행` 또는 `비대상`으로 보고한다.

제품 회귀 묶음은 Auth/scope, contract/schema/media, UI smoke, 현재 버전 기능 verifier로 나눈다. Auth verifier는 7.6의 password env var 조건이 충족되지 않으면 실행하지 않고 실패/미실행 사유를 보고한다.

external TURN/WHEP, cloud provider, ONVIF 실기기, 외부 VLM/provider 호출처럼 credential/endpoint/실기기가 필요한 항목은 기본 release PASS가 아니다. 사용자가 endpoint와 실행 승인을 제공한 경우에만 field smoke로 실행하고, 아니면 release notes와 evidence에 `미실행/제외`로 분리한다.

테스트 종료 후 릴리즈 보고, release evidence 정리, PR/tag/GitHub Release 준비 전에 테스트 임시 산출물을 반드시 정리한다. `/tmp`, `/private/tmp`, build/test output dir, browser screenshot dir, event `core-clips`, `core-snapshots`, throwaway registry처럼 재현 가능한 임시 산출물은 기본 보존 대상이 아니다. 사용자가 명시적으로 보존을 지시한 파일이나 최종 evidence로 필요한 최소 JSON/PNG/report만 남기고, 대용량 clip/snapshot/raw media 임시 파일은 삭제한다. 삭제 전 경로와 크기, 삭제 후 결과, 보존한 파일과 보존 사유를 보고한다. 임시 산출물 정리가 실패했거나 미확인 상태이면 릴리즈 준비는 blocker로 보고하고 완료/clean 상태로 보고하지 않는다.

1. 사전 상태와 현재 릴리즈 버전 확인
   - `git status --short --branch`, 현재 branch, upstream tracking, ahead/behind, local/remote tag 존재 여부, main 최신 여부, 미커밋/미추적 파일 여부를 확인한다.
   - PR/merge/tag 직전에도 다시 clean/sync 상태를 확인한다.
   - 현재 작업 브랜치, `VERSION`, 로드맵/릴리즈 문서에서 릴리즈 버전을 확인한다.
   - 예: 현재 브랜치가 `v1.9.0` 또는 `1.9.0`이면 이번 릴리즈 기준은 `1.9.0`이다.
   - 버전이 서로 다르면 추정으로 진행하지 말고 불일치 파일과 확인 필요 사항을 보고한다.
2. 릴리즈 버전 source-of-truth 업데이트
   - 브랜치가 `v1.9.0`이면 `VERSION`, `CMakeLists.txt`의 project version, README/README.en/docs의 current release baseline, release metadata 문서도 `1.9.0`/`v1.9.0` 기준으로 맞춘다.
   - historical evidence, 과거 release archive, 과거 수동 UI 결과 문서처럼 증적 보존 목적의 이전 버전 표기는 현재 기준으로 덮어쓰지 않는다.
   - `verify-release-metadata`가 보고하는 current version/current tag가 이번 릴리즈 기준과 일치해야 다음 단계로 넘어간다.
3. 전체 문서 업데이트
   - README, `README.en.md`, `docs/README.md`, release evidence, backlog/roadmap, UI/fulltest 문서, config/operation 문서를 현재 릴리즈 브랜치 기준으로 갱신한다.
   - 문서에 남아 있는 구버전 기능 설명, deprecated route, 예전 verifier, 이전 UI 흐름, 이전 릴리즈 기준 상태 설명을 검사하고 현재 릴리즈에 맞게 삭제하거나 수정한다.
   - 현재 릴리즈 준비 버전으로 표기해야 하는 위치가 이전 버전으로 남아 있으면 release blocker로 보고하고 수정한다. 단, historical evidence, archive, 과거 실행 로그처럼 보존 목적의 버전 표기는 현재 기준으로 덮어쓰지 않는다.
   - README는 공개 첫 화면이므로 제품 정체성, 현재 release, 빠른 시작, 대표 이미지, 핵심 문서 링크가 가독성 있게 보이는지 최우선으로 확인한다.
   - README에 들어가야 할 새 기능/상태/이미지가 있으면 추가하고, README가 과밀해지면 세부 내용은 `docs/README.md` 또는 전용 문서로 넘긴 뒤 대표 링크만 둔다.
   - README, `README.en.md`, `docs/README.md` 등에 표출하는 대표 이미지와 스크린샷은 현재 릴리즈 UI를 대표해야 한다. 메뉴, 버튼, label, table/card 구성, 상태 표시, 영상/overlay/control이 현재 제품과 다르면 반드시 새 이미지로 교체한다.
   - 문서 이미지와 스크린샷은 현재 UI와 맞아야 하며, 새로 추가/교체한 이미지는 잘림, 흐림, source URL/debug/raw JSON/auth material 노출 여부를 확인한다. verifier 통과만으로 현재 UI 일치 확인을 대체하지 않는다.
   - 문서 첫 화면과 색인은 사람이 읽는 순서, 섹션 밀도, 긴 표/목록의 필요성, 중복 링크 여부를 함께 점검한다. 가독성이 떨어지면 세부 내용은 전용 문서로 분리하고 README에는 대표 링크만 둔다.
   - 이전 버전에서만 유효하고 현재 릴리즈에서 deprecated된 route, 기능, 검증 명령, 스크린샷, 상태 설명은 남겨두지 말고 삭제하거나 현재 기준으로 바꾼다.
   - `release-evidence-index`, backlog close-out, post-release reconciliation 문서, release notes source 문서를 실제 실행/미실행 상태에 맞게 갱신한다.
   - `CHANGELOG`/`CHANGELOG.md`/`NEWS` 같은 변경 이력 파일이 있으면 현재 릴리즈 항목을 갱신하고, 없으면 “변경 이력 파일 없음”으로 보고한다.
   - 실행하지 않은 테스트, 미완료 기능, release 후속 작업을 완료처럼 쓰지 않는다.
4. 빌드와 릴리즈 검증
   - 실행 전 7.6.2의 테스트 필요성 판정표를 만든다.
   - 사용자가 이미 구체적으로 지시했다면 그 범위만 실행하고, 지시가 없으면 어떤 테스트 묶음을 실행할지 먼저 물어본다.
   - 안정화 테스트 실행이 승인되면 최소 `./server.sh build`, 문서 검증, release metadata/evidence 검증, 현재 릴리즈 범위의 verifier를 실행한다.
   - GitHub Actions required check와 warning/failure annotation gate를 분리해 확인한다.
   - annotation JSON을 확보한 경우 `./server.sh verify-actions-security --annotations-json <annotations.json>`를 실행하고, 확보하지 못했으면 annotation 상태를 `미확인`으로 보고한다.
   - PR check, required check, optional check, warning annotation, local verifier 결과를 서로 대체하지 않고 각각 PASS/FAIL/미확인으로 기록한다.
   - 빌드 또는 핵심 release gate가 실패하면 PR, main merge, tag, GitHub Release, 후속 브랜치 생성을 진행하지 않는다.
5. PR 생성과 main 머지
   - 이 단계는 사용자가 push/PR/main merge를 명시 승인한 경우에만 수행한다.
   - 모든 변경이 사용자 승인으로 커밋되고 release gate가 통과한 뒤, 승인된 경우에만 현재 릴리즈 브랜치를 push한다.
   - 승인된 경우에만 GitHub PR을 생성하거나 기존 PR을 갱신하고, CI/check 상태를 확인한다.
   - main merge는 사용자가 main merge를 명시 승인하고 PR check가 통과한 뒤 수행한다. merge 방식은 저장소 정책을 따른다.
   - PR merge 후 main을 최신 상태로 fetch/checkout/pull하고, tag 대상 main commit hash와 PR merge commit hash를 확인해 보고한다.
   - merge에 실패하거나 CI가 실패하면 tag/GitHub Release/후속 브랜치를 진행하지 않는다.
6. 릴리즈 tag 생성
   - 이 단계는 사용자가 tag 생성을 명시 승인한 경우에만 수행한다.
   - PR이 main에 merge된 뒤 main의 최신 release commit에 annotated 릴리즈 tag를 만든다.
   - 예: `1.9.0` 릴리즈면 main의 마지막 릴리즈 커밋에 `v1.9.0` tag가 있어야 한다.
   - 동일 tag가 local 또는 remote에 이미 있으면 덮어쓰거나 force update하지 않고 즉시 중단해 충돌 상태를 보고한다.
   - tag 대상 commit hash를 확인하고, tag를 push하기 전후 hash를 보고한다.
7. GitHub Release 업데이트와 published metadata 재검증
   - 이 단계는 사용자가 GitHub Release 생성/갱신을 명시 승인한 경우에만 수행한다.
   - 승인된 경우에만 GitHub 우측 Releases에 해당 버전이 보이도록 tag 기반 GitHub Release를 생성하거나 기존 draft/release를 갱신한다.
   - release notes에는 실제 완료된 항목, 주요 변경, 검증 결과, 미실행/제외 항목을 구분해 적는다.
   - GitHub Release 생성/갱신 후 `./server.sh verify-release-metadata --published`를 실행해 Latest Release, release URL, remote tag, release branch 상태를 재검증한다.
   - GitHub Release 생성/갱신에 실패하면 후속 브랜치 생성 전 실패로 보고한다.
8. 후속 버전 브랜치 생성
   - 이 단계는 사용자가 후속 버전 브랜치 생성을 명시 승인한 경우에만 수행한다.
   - 승인된 경우에만 릴리즈 tag와 GitHub Release가 완료된 뒤 다음 릴리즈 브랜치를 만든다.
   - patch 버전 브랜치는 사용자가 특별히 지시하지 않으면 만들지 않는다.
   - minor 버전은 `9`가 마지막이다. 예: `1.8.0` 다음은 `1.9.0`, `1.9.0` 다음은 `2.0.0`이다.
   - 일반 규칙은 `major.minor.patch`에서 patch는 `0` 유지, minor가 `0`~`8`이면 `minor + 1`, minor가 `9`이면 `major + 1.0.0`이다.
   - 후속 브랜치는 main을 fetch/checkout/pull한 뒤 release tag commit이 포함된 최신 main에서 생성하고 push한다.
   - release branch 삭제는 별도 명시 지시가 없으면 수행하지 않는다.
9. 실패와 rollback 경계
   - 실패 후 local/remote tag 삭제, force push, GitHub Release 삭제, merge revert, release branch 삭제 같은 rollback성 작업을 임의로 수행하지 않는다.
   - 이미 생성된 외부 상태가 있으면 commit/tag/release URL과 실패 지점을 보고하고, 사용자 지시를 기다린다.

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

## 5. 커밋과 푸시 규칙

### 5.1 커밋 규칙

1. 에이전트에게 자의적 커밋 권한은 없다.
2. 커밋은 사용자가 최신 요청에서 커밋을 명시 승인한 경우에만 수행한다.
3. "릴리즈 준비", "마무리", "정리", "완료", "close-out", `/goal`, 테스트 통과, 커밋 가능 상태, 이전 대화의 포괄 지시는 커밋 승인으로 해석하지 않는다.
4. 각 단계가 통과하고 필수 기록과 테스트 결과가 반영되면 `커밋 가능: 예/아니오`만 보고한다. 실제 커밋은 멈추고 사용자 승인을 기다린다.
5. 사용자가 커밋을 승인한 경우에도 해당 승인 범위의 파일만 stage/commit한다.
6. 여러 단계의 변경을 하나의 커밋에 섞지 않는다.
7. 실패한 단계는 커밋하지 않는다.
8. 커밋 메시지는 변경 성격을 명확히 쓴다.
9. 푸시 여부와 푸시 가능 여부 보고는 5.2 규칙을 따른다.

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

커밋 승인 또는 조건이 없어서 커밋하지 않았다면:

```text
커밋:
- 수행하지 않음
- 이유: 사용자 커밋 명시 승인 없음
```

### 5.2 푸시 규칙

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

---

## 6. 진실성, 완료 판정, 보고 형식

### 6.1 거짓 보고 금지

거짓 보고는 허위 사실을 말하는 것뿐 아니라, **수행한 범위보다 더 넓게 완료를 보고하는 것**, **검증한 범위보다 더 넓게 통과를 보고하는 것**, **사용자가 요구한 핵심 산출물이 빠졌는데 완료처럼 쓰는 것**을 모두 포함한다.

다음 행위는 절대 금지한다. 아래 항목 중 하나라도 발생하면 즉시 정정하고, 영향을 받은 문서/roadmap/status/커밋 여부를 함께 보고한다.

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

### 6.2 일부 수행과 완료 표현

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

`verify-*` 명령 통과는 "그 명령이 검사한 범위 통과"만 뜻한다. verifier가 모델 선택, license 검토, UI 직접 조작, 장시간 안정화, 운영 반영을 검사하지 않았다면 그 항목을 완료 evidence로 사용하지 않는다.

### 6.3 선택/결정/후보군 단계의 특별 완료 조건

로드맵 항목 이름이나 사용자 요청에 `선택`, `선정`, `후보군`, `결정`, `승격`, `default`, `baseline`, `기준`이 포함된 경우, 단순 catalog/checklist/verifier 추가만으로 완료 처리하지 않는다.

완료 보고에는 최소한 아래가 포함되어야 한다.

- 실제 선택 대상 목록
- 1차 선택값
- fallback 또는 대안
- 제외 대상과 제외 사유
- license/provenance/privacy/운영 제약 검토 결과
- 사용자가 "그래서 무엇을 쓰기로 했는가?"라고 물었을 때의 직접 답
- 아직 선택하지 않기로 한 경우, 그 결정과 이유, 다음 완료 조건

위 항목 중 하나라도 없으면 상태는 `완료`가 아니라 `진행`, `부분 완료`, `gate 준비 완료`, `미완료 decision 있음` 중 하나로 보고한다.

### 6.4 완료 보고 전 필수 점검

완료라고 보고하기 직전에 아래 질문을 모두 확인한다.

1. 사용자가 실제로 원한 최종 산출물이 무엇인가?
2. 그 산출물이 파일/코드/UI/설정/테스트 결과에 실제로 존재하는가?
3. 실행한 verifier가 그 산출물 자체를 검증하는가, 아니면 주변 gate만 검증하는가?
4. `공식 확인 필요`, `미확인`, `pending`, `review-required`, `not-approved`, `후속 확인 필요`가 완료 조건 안에 남아 있지 않은가?
5. roadmap/status 문서를 `완료`로 바꾸는 근거가 직접 evidence인가?
6. 보고서에 실제 진행한 것과 진행하지 않은 것을 분리해 적었는가?

하나라도 "아니오"이면 완료로 보고하지 않는다. 문서 상태도 `완료`로 바꾸지 않는다.

### 6.5 필수 보고 형식

보고 형식의 source-of-truth는 6.5다. 다른 장의 보고 표는 6.5를 대체하지 않고, 해당 요청 유형에서 추가로 요구되는 산출물만 정의한다.

작업 완료 또는 중단 보고에는 반드시 아래 항목을 넣는다. 항목이 없으면 `없음`, 실행하지 않았으면 `미실행`, 확인하지 않았으면 `미확인`으로 쓴다.

사용자 지시가 여러 항목이면 최종 보고 전에 지시 전수표를 먼저 만든다. 사용자가 말한 항목을 축약하거나 합치지 않고, 각 항목별 수행/미수행/수정/검증/보고 여부를 확인한다. 지시 내용이 바뀌면 그 지시에 맞는 보고 형식을 새로 만들되, 빠진 항목이 없어야 한다.

```text
| 번호 | 사용자 지시 | 처리 상태 | 결과 | 근거 |
| --- | --- | --- | --- | --- |
```

사용자가 "모든 문서를 리뷰"하라고 하면 실제로 발견한 모든 md/sub-md 문서를 표에 나열한다. 파일 목록만 뽑거나 일부만 읽고 "전체 리뷰"라고 보고하지 않는다. 이 경우 최소 보고 표는 아래 형식이다.

```text
| 파일 | 분류(info/history/test/generated) | 전문 읽음 | 현재 로직 불일치 | 중복/복잡도 문제 | 조치 | 근거 |
| --- | --- | --- | --- | --- | --- | --- |
```

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

상황별로 아래 내용도 덧붙인다.

1. 단계 작업 완료 시
   - 단계 번호와 상태
   - 변경 파일
   - 실행한 검증과 PASS/FAIL
   - 미실행 테스트와 사유
   - 커밋 가능 여부, 커밋 수행 여부, 사용자 승인으로 커밋한 경우 메시지와 해시
   - 다음 단계 진행 가능 여부
2. 단계 실패 시
   - 실패 지점, 실패 명령, 결과
   - 확인된 원인과 추정 원인
   - 변경 파일
   - 커밋하지 않은 이유
   - 뒤 단계 `건너뜀`
   - 후속 조치와 푸시 가능 여부
3. 전체 완료 시
   - 각 단계별 완료/실패/건너뜀 상태
   - 현재 버전/현재 스텝 범위 안의 후속 이슈
   - 미실행 테스트
   - 푸시 가능 여부와 푸시 수행 여부

### 6.6 거짓 보고 정정 규칙

이미 잘못 보고했거나 완료 상태를 과장한 사실을 발견하면 즉시 아래 순서로 정정한다.

1. 어떤 보고가 잘못됐는지 명시한다.
2. 실제 확인된 범위와 미확인/미완료 범위를 다시 분리한다.
3. 문서나 roadmap에 `완료`로 잘못 반영했다면 `진행`, `부분 완료`, `gate 준비 완료`, `미완료 decision 있음` 등 실제 상태로 수정한다.
4. 정정 변경이 필요하면 먼저 수정하고, 커밋은 사용자가 최신 요청에서 명시 승인한 경우에만 별도 커밋으로 분리한다.
5. 기존 커밋을 이미 푸시했다면 force push나 history rewrite를 임의로 하지 않고, 사용자 승인 후 정정 커밋으로 바로잡는다.

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

테스트 영역은 앞으로도 `안정화 테스트`, `30분 테스트`, `120분 테스트`, `UI 풀테스트` 네 가지로만 분류한다. `preflight`, `gate`, `wrapper`, `rehearsal`, `field smoke`, `external credential`, `no-device` 같은 명령/조건/준비 절차는 독립 테스트 리스트나 다섯 번째 테스트 영역으로 만들지 않는다. 해당 항목은 안정화 테스트의 조건부 verifier/시작 조건, 30분/120분 실행 조건, UI 풀테스트 제외 기록 중 적절한 위치에 편입한다. 새 문서, inventory, checklist, result template, verifier를 만들 때 별도 테스트 영역이 생기면 완료 전에 네 영역 기준으로 정규화한다.

#### 7.6.1 네 영역 테스트 개별 항목 전수 보고

사용자가 `안정화 테스트`, `30분 테스트`, `120분 테스트`, `UI 테스트` 또는 `UI 풀테스트` 중 하나라도 지시하면 예외 없이 해당 테스트에 포함되는 모든 개별 항목을 표로 보고한다. 카테고리 요약, 대표 항목만 나열, "나머지 동일", "등", "관련 smoke" 같은 생략 표현은 금지한다. 단 하나의 누락도 허용하지 않는다.

각 테스트 보고 표는 반드시 아래 형식을 사용한다.

```text
| 제목 | 테스트내용 | pass/fail | 비고(실패 후 pass됨 등을 기록) |
| --- | --- | --- | --- |
```

규칙:

1. 표의 한 행은 하나의 개별 command, route, control, action, verifier, scenario, event type, permission/role guard, responsive/theme 확인, longrun check, cleanup check를 뜻한다.
2. `테스트내용` 칸에는 실제로 수행한 내용과 실제 응답을 함께 적는다. command는 명령 문자열, exit code, pass/fail/skip count, summary/report/log 경로를 포함한다. API/HTTP는 method/path, status code, 핵심 response field/body 요약을 포함한다. UI는 route, 클릭/타이핑/선택한 control, 화면 반영 결과, 관련 로그 또는 상태 확인 결과를 포함한다. 장시간 테스트는 duration, iteration count, cleanup/port 상태, summary/report 경로를 포함한다.
3. `pass/fail` 칸에는 해당 개별 항목의 실제 결과만 쓴다. 실행하지 않음, 일부 실행, 결과 미확인, 로그/상태 미확인은 `fail`이다.
4. 실패 후 수정해서 재실행한 항목은 같은 제목으로 최초 `fail`과 최종 `pass` 이력을 비고에 명시한다. 실패 이력을 삭제하거나 최종 PASS만 남기는 것은 금지한다.
5. 테스트 실행 전, 해당 브랜치에서 추가/변경된 신규 기능은 이미 테스트 항목으로 등록되어 있어야 한다. 등록 위치는 `docs/project-feature-test-inventory.md`, manual UI checklist/result template, release evidence, 또는 해당 테스트의 실행 항목 표 중 현재 작업 범위의 source-of-truth여야 한다.
6. 신규 기능이 있는데 테스트 전에 개별 테스트 항목이 없었거나, 테스트 중/보고 시 신규 항목이 없다고 보고한 경우 해당 브랜치 개발은 실패로 판정한다.
7. 신규 기능의 테스트 항목 누락을 테스트 통과 후 문서 보정으로 사후 처리해 PASS로 바꾸지 않는다. 누락이 확인된 시점의 테스트 결과는 `fail`이고, 항목을 추가한 뒤 처음부터 해당 테스트를 다시 실행해야 한다.
8. 실기기, credential, 외부 endpoint처럼 사용자가 별도 제약으로 제외한 항목도 몰래 삭제하지 않는다. 해당 항목은 실행 결과 PASS 행으로 쓰지 않고 별도 `제외 기록`에 남긴다. 제외 기록에는 제목, 제외된 테스트내용, 사용자 제약/승인 부재 사유, 완료 PASS 근거로 사용할 수 없다는 문구를 적는다. 제외 기록은 `조건부 PASS`, `PASS`, `통과`가 아니다. 실행 대상에 포함됐는데 단순히 수행하지 못한 항목은 제외가 아니라 `fail`이다.
9. `v2.5.0` 및 이후 버전에서는 테스트 시 개별 항목에 대한 모든 기록을 파일로 남긴다. 대화 보고만으로 대체하지 않는다. 이 기록은 개발 및 테스트 용도이므로 `README.md`, `README.en.md`, `docs/README.md`, `docs/en/README.md` 같은 README 색인에 별도 링크를 추가하지 않는다.

#### 7.6.1.1 저장소 보존형 테스트 기록

`v2.8.0`부터 테스트 기록의 source-of-truth는 `docs/release-test-records.md`다. `docs/release-evidence-index.md`는 색인 역할만 하며, 어떤 테스트를 어떻게 확인했는지와 버전별 결과는 아래 세 표로 남긴다. 기존에 기록 중인 버전도 이 형식으로 이관한다.

테스트 항목 상세 기록은 기능/테스트 항목의 정의다. 새 기능, 새 verifier, 새 route, 새 control, 새 action, 새 longrun check가 생기면 테스트 실행 전에 아래 표에 먼저 추가한다.

```text
| 제목 | 수행내용 | 수행 상세 내용(확인 방법) | 몇버전부터 들어갔는지 |
| --- | --- | --- | --- |
```

deprecated 항목은 삭제하거나 결과표에서 몰래 빼지 않는다. 특정 버전부터 더 이상 쓰지 않는 테스트 항목, 증거 방식, UI 흐름, route, verifier, 기록 방식은 아래 별도 표에 남긴다.

```text
| 제목 | 수행내용 | 수행 상세 내용(확인방법) | 몇버전부터 deprecated되었는지 |
| --- | --- | --- | --- |
```

버전 테스트를 실행하면 해당 버전 섹션에 결과를 남긴다. 결과표는 실행한 항목만 대상으로 하며, 결과 값은 `pass` 또는 `fail`만 쓴다.

```text
| 제목 | 수행내용 | 결과(pass/fail) |
| --- | --- | --- |
```

실행하지 않은 항목, 사용자가 명시 제외한 항목, credential/endpoint/실기기 부재로 수행하지 않은 항목은 결과표에 `pass`, `조건부 pass`, `skip`으로 쓰지 않는다. 버전별 `미실행/제외` 표에 제목, 수행내용, 사유, 완료 evidence로 사용할 수 없다는 경계를 남긴다.

`/tmp`, `/private/tmp`, `$TMPDIR` 경로는 최종 evidence가 아니다. 테스트 도중 생성된 summary/report/log/screenshot/evidence JSON의 필요한 값은 `docs/release-test-records.md` 또는 전용 저장소 보존 문서로 이관한 뒤 삭제한다. 보존해야 하는 증거물로 판단하면 그것은 더 이상 임시 파일이 아니므로, redaction, 크기, 보존 사유를 확인하고 `docs/release-artifacts/<version>/<run-id>/` 같은 저장소 보존 위치로 옮긴 뒤 링크한다. 이 판단과 보존 위치도 기록한다.

테스트 지시를 받았는데 해당 테스트 항목 상세 기록이 없거나, 버전별 테스트 결과가 남지 않거나, 임시 산출물 cleanup 결과가 없으면 테스트 완료로 보고하지 않는다.

#### 7.6.2 테스트 필요성 판정 고정 규칙

테스트 필요성 여부 판단은 릴리즈 품질과 사용자 승인 범위에 직접 영향을 주는 중요 판정이다. 에이전트는 `필요`, `불필요`, `후보`, `조건부` 같은 말을 상황에 따라 바꿔 쓰지 않는다. 테스트 계획을 말하기 전에 아래 판정어 중 하나로 고정한다.

```text
진행 대상:
- 이번 요청/릴리즈/변경 범위에서 직접 근거가 있어 실행해야 하는 테스트

조건부 진행:
- 특정 선수 테스트 실패, high-risk signal, credential/endpoint 제공, 사용자 명시 승인
  같은 조건이 충족되면 실행하는 테스트

미진행:
- 이번 요청 범위 밖이거나 직접 근거가 없어 실행하지 않는 테스트

미확인:
- 필요한 source-of-truth를 아직 읽지 않아 판단하면 안 되는 테스트
```

테스트 필요성 판정에는 반드시 아래 표를 먼저 만든다. 표 없이 “필요하다”, “필요 없다”, “진행 대상이다”라고 답하지 않는다.

```text
| 테스트 카테고리 | 판정 | 직접 근거 | 근거 파일/행/기능 ID | 실행 승인 상태 |
| --- | --- | --- | --- | --- |
```

직접 근거는 아래 중 하나여야 한다.

1. 최신 사용자 지시가 해당 테스트 묶음을 명시함
2. 현재 릴리즈 문서/roadmap/release policy가 해당 테스트를 이번 cut의 필수 gate로 명시함
3. 이번 변경 파일 또는 신규/수정 기능 ID가 `docs/project-feature-test-inventory.md`에서 해당 테스트 영역으로 표시됨
4. 이미 실행한 선수 테스트 결과가 해당 테스트를 요구하는 high-risk signal을 남김
5. 실기기/credential/endpoint가 필요한 테스트는 사용자가 해당 조건과 실행 승인을 제공함

프로젝트 전체 baseline에 어떤 테스트 대상 기능 ID가 존재한다는 사실만으로, 이번 버전/이번 변경의 테스트가 `진행 대상`이라고 단정하지 않는다. 이 경우에는 현재 버전 변경 기능 ID, 릴리즈 정책, 이전 테스트 결과, 사용자 지시 중 무엇이 그 baseline 테스트를 이번 cut에 끌어왔는지 함께 제시해야 한다. 그 연결 근거가 없으면 `조건부 진행` 또는 `미진행`으로 보고한다.

특히 120분 테스트는 아래 중 하나가 확인된 경우에만 `진행 대상`으로 말한다.

1. 최신 사용자 지시가 120분 테스트 실행을 명시함
2. 현재 릴리즈 정책/roadmap/release evidence가 이번 cut에서 120분을 필수 gate로 명시함
3. 이번 변경 또는 신규 기능 ID가 `120분` 영역에 직접 매핑됨
4. 이번 변경이 RTSP/WebRTC/WHEP/WHIP media path, source worker lifecycle, shared stream reuse, runtime/metadata fanout, cleanup/port lifecycle을 직접 변경함
5. 안정화 또는 30분 테스트 결과가 memory leak, runtime drift, cleanup drift, media/session 유지 문제 같은 120분 재검증 signal을 남김

위 조건이 없으면 120분 테스트를 `필요`, `진행 대상`, `필수`라고 말하지 않는다. `docs/project-feature-test-inventory.md`에 `MEDIA-*`나 `SAFE-*` 120분 대상이 존재한다는 사실만으로는 특정 버전 신규 기능 때문에 120분이 필요하다는 근거가 아니다. 사용자가 “어떤 기능 때문에 120분이 필요한가?”라고 물으면, 이번 변경에 연결된 정확한 기능 ID, 파일, route, module을 답한다. 연결된 기능이 없으면 “직접 연결 근거 없음”이라고 답하고, 동시에 120분 필요라고 주장하지 않는다.

한 번 테스트 필요성 판정을 보고한 뒤에는 새로운 직접 evidence 없이 반대 결론으로 바꾸지 않는다. 정정이 필요하면 아래 형식으로 이전 보고와 새 판정을 함께 적는다.

```text
정정:
- 이전 보고:
- 잘못된 이유:
- 새 직접 근거:
- 새 판정:
- 이미 작성한 문서/roadmap/status/커밋 영향:
```

세부 verifier 목록은 테스트 카테고리 판정 이후에만 적는다. 사용자가 “어떤 테스트를 진행해야 하냐”고 물은 경우, 먼저 `안정화 테스트`, `30분 테스트`, `120분 테스트`, `UI 풀테스트` 네 카테고리의 판정과 이유를 답하고, 안정화 내부 command 목록을 테스트 카테고리 목록처럼 늘어놓지 않는다.

| 영역 | 역할 | 완료로 인정되는 evidence | 완료로 인정하지 않는 것 |
| --- | --- | --- | --- |
| 안정화 테스트 | build, static, API/schema, auth route, media path, verifier 중심의 선수 테스트. 30분/120분/UI 테스트 전에 먼저 통과해야 하며, 로드맵 각 스텝 종료 시 수행 대상이다. 릴리즈 close-out에서는 사용자 지시 또는 승인 범위만 실행한다 | 실제 실행한 명령, exit code, summary/report, 로그, 실패/skip 사유 | 30분/120분 장시간 PASS, 브라우저 UI 직접 조작 주장 |
| 30분 테스트 | 장기간 테스트 지시 시 기본으로 수행하는 soak. 각 버전별 로드맵 개발 완료와 릴리즈 완료/출시 가능 판정의 필수 evidence다. 사용자 승인 없이 자동 실행하지 않지만, 미실행/FAIL이면 사용자 강제 진행 승인 전 릴리즈 불가다 | `verify-predev --soak-minutes 30` summary/report/log | 안정화 테스트, 120분 메모리 감시, UI 풀테스트 |
| 120분 테스트 | 메모리 릭, 장시간 누수, runtime drift 감시용. 무조건 실행하지 않고 필요 시 사용자에게 먼저 말한다 | `verify-predev --soak-minutes 120`, `verify-va-runtime-console-longrun --duration-minutes 120` summary/report/log | 안정화 테스트, 30분 기본 soak, UI 풀테스트 |
| UI 풀테스트 | 인앱 브라우저에서 제품 화면을 직접 열고 클릭/타이핑/선택/반응형/시각 품질/role guard 확인. 각 버전별 로드맵 개발 완료와 릴리즈 완료/출시 가능 판정의 필수 evidence다. 사용자 승인 없이 자동 실행하지 않지만, 미실행/FAIL이면 사용자 강제 진행 승인 전 릴리즈 불가다 | 실제 조작한 route, 계정/권한, viewport/theme, screenshot/artifact, 재검수 결과 | 30분/120분 안정화 통과, raw JSON/API-only 확인, 자동 screenshot만 생성 |

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

모든 안정화/30분/120분/UI 테스트 기록에는 `token start`, `token end`, `token consumed`, `elapsed`, `source`를 남긴다. Codex goal usage처럼 자동 집계값이 있으면 그 값을 우선하고, 집계값이 없으면 미집계 사유를 기록한다.

안정화 테스트가 실패하면 30분/120분/UI 테스트로 넘어가지 않는다.
안정화 테스트, 30분 테스트, UI 풀테스트, 120분 테스트는 릴리즈/로드맵 close-out에서 자동 실행하지 않는다. 사용자가 직접 어느 묶음을 실행하라고 지시했거나, 에이전트가 진행 여부를 물어 사용자가 승인한 범위만 실행한다.
30분 테스트는 장기간 테스트 지시가 있을 때의 기본 soak이며, 버전별 로드맵 완료와 릴리즈 완료/출시 가능 판정의 필수 항목이다. 실행 승인이 없으면 실행하지 않지만, 실행 전까지는 `미실행 필수 blocker`로 보고한다. 미실행/FAIL 상태에서는 사용자가 그 blocker를 알고도 강제로 릴리즈 진행을 명시 승인하지 않는 한 릴리즈는 원천적으로 불가능하다.
120분 테스트는 메모리 릭/장시간 누수 감시가 필요할 때 사용자에게 먼저 말하고 지시를 받은 뒤 수행한다.
UI 풀테스트도 버전별 로드맵 개발 완료와 릴리즈 완료/출시 가능 판정의 필수 항목이다. 실행 전 사용자 지시 또는 승인을 확인하지만, 실행 전까지는 `미실행 필수 blocker`로 보고한다. 미실행/FAIL 상태에서는 사용자가 그 blocker를 알고도 강제로 릴리즈 진행을 명시 승인하지 않는 한 릴리즈는 원천적으로 불가능하다.
30분/120분 테스트를 통과해도 UI 풀테스트 완료가 아니며, UI 풀테스트를 모두 수행해도 30분/120분 안정화 테스트 완료가 아니다.

UI 풀테스트 판정은 `PASS`와 `FAIL`만 사용한다. 모든 기능을 인앱 브라우저에서 실행하고, 실제 수행 결과가 제품 상태에 반영됐는지 확인하고, 관련 로그를 확인한 경우에만 `PASS`다. VA rule 또는 scenario는 EventRecord/이벤트 발생 이력까지 모두 확인해야 `PASS`다. 그 외는 모두 `FAIL`이다. 실행하지 않음, 일부만 실행, 화면만 열고 기능 결과 미확인, 자동 smoke만 통과, raw JSON/API-only 확인은 모두 `FAIL`이다. 사용자가 실기기 없음 등으로 의도적으로 빼라고 한 항목은 UI 풀테스트 기준에서 제외하고 별도 `제외 기록`에만 남긴다.

UI 풀테스트 결과는 모든 개별 기능, route, control, action 단위로 답한다. 카테고리 묶음 판정은 금지한다. 예를 들어 Auth, Rules, VA 같은 카테고리로 묶어 PASS/FAIL을 대신하지 않고, 기능 ID와 조작/반영/로그 확인 결과를 개별 행으로 나열한다.

Auth verifier는 테스트 실행자가 지정한 비밀번호 환경변수를 사용한다. `MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD`, `MEDIA_SERVER_VERIFY_AUTH_PREVIOUS_PASSWORD`, `MEDIA_SERVER_VERIFY_AUTH_SECOND_PREVIOUS_PASSWORD`, `MEDIA_SERVER_VERIFY_AUTH_WRONG_PASSWORD_ONE`, `MEDIA_SERVER_VERIFY_AUTH_WRONG_PASSWORD_TWO`가 없으면 auth 테스트를 시작하지 않고 실패로 보고한다. 스크립트나 문서에 고정 기본 비밀번호를 만들지 않는다.

### 7.7 장시간 테스트

아래 테스트는 명시 요청이 있을 때만 실행한다.

```bash
./server.sh verify-predev --soak-minutes 30
./server.sh verify-predev --soak-minutes 120
./server.sh verify-va-runtime-console-longrun --duration-minutes 120
```

30분 `verify-predev`는 릴리즈 완료/출시 가능 판정의 필수 장시간 항목이다. 명시 요청이 없으면 실행하지 않지만, 실행하지 않은 상태는 생략 가능이 아니라 `미실행 필수 blocker`다. 120분 장시간 테스트는 조건부 항목이며, 7장의 120분 진행 조건 또는 사용자 명시 지시가 있을 때만 릴리즈 필수/진행 대상으로 말한다.

장시간 테스트를 실행하지 않았다면 반드시 보고한다.

```text
장시간 테스트: 실행하지 않음
verify-predev: 실행하지 않음
이유: 사용자 명시 요청 없음
```

### 7.8 테스트 임시 산출물 정리

테스트가 끝나면 성공, 실패, 중단 여부와 관계없이 임시 산출물을 정리한다.
릴리즈 준비 전에는 예외 없이 이 절을 확인한다.
`/tmp`, `/private/tmp`, `$TMPDIR` 경로는 최종 evidence가 아니며, release evidence나 테스트 결과 문서의 최종 증거 링크로 남기지 않는다. 필요한 값은 저장소 문서로 이관하고 임시 파일은 삭제한다. 저장소에 보존해야 하는 증거물은 임시 경로 밖으로 옮긴 뒤 보존 사유와 redaction/크기 확인 결과를 남긴다.

1. 테스트 실행 중 만든 모든 output dir, temp dir, screenshot dir, registry dir, event storage dir, event clip/snapshot dir, zip/report 임시 파일을 목록화한다.
2. 각 경로의 크기와 용도를 확인한다. 특히 `core-clips`, `core-snapshots`, raw media, browser trace, video artifact, throwaway registry는 대용량 또는 재현 가능 산출물로 분류한다.
3. 사용자가 명시적으로 보존하라고 한 파일, 최종 evidence로 필요한 최소 JSON/PNG/report, 재실행이 불가능한 외부 field evidence를 제외한 임시 산출물은 테스트 종료 후 삭제한다.
4. 대용량 clip/snapshot/raw media 임시 파일은 기본적으로 삭제한다. "evidence일 수 있음"이라는 추정만으로 보존하지 않는다. 보존이 필요하면 사용자에게 경로, 크기, 보존 이유를 먼저 보고하고 승인을 받는다.
5. 삭제 후에는 해당 경로가 사라졌는지 확인한다. 삭제 실패, 권한 오류, 경로 불명확, 보존 여부 미확인은 `cleanup failure`로 보고하고 릴리즈 blocker로 처리한다.
6. 최종 보고에는 아래 표를 포함한다. 임시 산출물이 없으면 `없음`이라고 적는다.

```text
| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |
| --- | --- | ---: | --- | --- | --- |
```

### 7.9 버전 로드맵 완료 후 UI 풀테스트

해당 버전의 로드맵에 명시된 개발 내용을 모두 마친 경우, 완료 판정은 스크립트만으로 대체하지 않는다. 단, UI 풀테스트 실행은 사용자가 직접 지시했거나 에이전트가 진행 여부를 물어 승인받은 경우에만 수행한다.
UI 풀테스트는 릴리즈 완료/출시 가능 판정의 필수 항목이다. 사용자가 실행을 승인하기 전에는 실행하지 않지만, 실행하지 않은 상태는 조건부/선택/생략 가능이 아니라 `미실행 필수 blocker`다. 사용자가 그 blocker를 알고도 강제로 릴리즈 진행을 명시 승인하지 않는 한 릴리즈는 원천적으로 불가능하다.

1. 브라우저에서 제품 UI를 직접 열고 로드맵에 포함된 기능을 하나하나 눌러 실행한다.
2. `/setup`, `/login`, `/ops`, `/client`, 관련 rule/source/dashboard 흐름을 해당 버전 범위에 맞게 수동 확인한다.
3. 영상이 포함된 기능은 실제 영상 표시, control, status, 가능하면 VA overlay까지 눈으로 확인한다.
4. 스크립트 검증은 보조 evidence로만 사용한다. UI 풀테스트를 하지 않았다면 로드맵 전체 완료라고 보고하지 않는다.
5. UI 풀테스트에서 이상이 발견되면 수정 후 같은 UI 흐름을 다시 직접 실행한다.
6. 열어보지 않은 화면, 누르지 않은 기능, 실행하지 않은 흐름은 UI 풀테스트 대상이면 `FAIL`로 보고한다. 사용자가 명시 제외한 실기기/외부 credential 항목은 판정에서 빼고 별도 `제외 기록`에만 남긴다.

### 7.10 기능 추가 시 테스트 항목 정리

기능을 추가하거나 기존 기능을 변경하면 코드만 수정하고 끝내지 않는다.

1. `docs/project-feature-test-inventory.md`에 기능을 개별 action/route/control 단위로 추가하거나 갱신한다.
2. 각 기능 행은 `안정화 테스트`, `30분 테스트`, `120분 테스트`, `UI 테스트` 네 칸 중 적용 상태를 모두 채워야 한다. 해당 기능의 테스트가 어떤 단계에 속하는지 비워두지 않는다. 이 항목 정리는 테스트 실행 전에 끝나 있어야 하며, 테스트 중 신규 기능 항목이 없다고 확인되면 해당 브랜치 개발은 실패로 판정한다. 브랜치 개발 실패는 해당 브랜치 개발 내용의 전면 폐기도 고려한다는 의미다.
3. 제품 UI가 필요한 기능은 `UI 존재`와 `PASS 출력/판정`에 실제 화면 control/state와 조작 성공 기준을 적는다.
4. API/CLI/backend 정책처럼 제품 UI가 없어야 정상인 기능은 억지로 UI를 만들지 않고 `비대상: UI 없어야 정상`으로 표기한다.
5. 실기기/외부 endpoint가 필요한 기능도 별도 테스트 영역으로 빼지 않는다. 해당 조건은 `안정화 테스트`의 조건부 verifier 또는 `UI 테스트`의 제외 기록으로 편입하고, 사용자가 제외하라고 한 경우 사유를 `제외 기록`에 적는다.
6. 기능 개발 중 기존 코드가 구버전 레거시가 되면 호환 명목으로 남겨두지 않는다. 현재 릴리즈 제품 route/API/UI에서 쓰지 않는 레거시 화면, route, helper, verifier 문자열은 영향 범위를 확인한 뒤 같은 작업 범위에서 삭제한다.
7. UI 테스트는 Codex 인앱 브라우저에서 직접 클릭/타이핑/반응형 확인으로 수행한다. raw JSON, curl, Playwright 스크립트만으로 제품 UI 수동 확인을 대체했다고 보고하지 않는다.
8. VA rule, scenario, tracker, Re-ID처럼 기능 축이 늘어나는 경우에는 새 기능을 카테고리 한 줄로 묶지 않는다. 각 event type, scenario type, line direction, tracker policy, Re-ID policy, invalid 조합, runtime 반영, EventRecord 발생 여부를 각각 독립 기능 ID/결과 행으로 추가한다.
9. 기능별 테스트 결과 행의 판정값은 `PASS`와 `FAIL`만 쓴다. 테스트 대상인데 실행하지 않았거나 일부 조건만 확인한 항목은 `FAIL`이다. 사용자가 실기기/외부 endpoint 등으로 명시 제외한 항목은 테스트 결과 행에서 빼고 `제외 기록`에만 남긴다.

---

## 8. 중단 조건

아래 상황이 발생하면 즉시 중단하고 보고한다.
단, `/goal` 명령의 실패 처리 예외는 3.3을 따른다. 이 경우에도 실패 상태를 숨기지 않고, 실패 단계가 통과하기 전에는 다음 단계로 넘어가지 않는다.

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

개발/검증 기능은 `/lab/analysis/*`, `/lab/runtime/status`, `/ws/va-metadata` 같은 API와 전용 검증 명령으로 다룬다.
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

문서 변경 시 내용 정확도만 맞추고 끝내지 않는다. 사람이 처음 읽는 순서와 공개 첫 화면의 밀도를 함께 검토한다.

1. README 첫 화면에는 제품 정체성, 현재 release, 빠른 시작, 핵심 문서 링크만 둔다.
2. release evidence, verifier 목록, historical close-out, 세부 정책 링크를 README에 전부 나열하지 않는다. 그런 항목은 `docs/README.md` 또는 해당 전용 문서에 둔다.
3. `docs/README.md`는 전체 문서 색인 source-of-truth로 유지한다. 새 문서를 추가하면 적절한 카테고리에 넣고, README에는 꼭 필요한 경우에만 대표 링크를 추가한다.
4. 문서 색인은 1차 독자의 목적별로 묶는다. 파일 생성 순서, roadmap 완료 순서, verifier 이름 순서로 긴 표를 만들지 않는다.
5. release close-out 문서는 증적 보존용으로 유지하되, 공개 진입점에서는 한 문장과 대표 링크로만 연결한다.
6. backlog 상단에는 현재 제품 baseline과 비범위만 요약한다. 세부 완료 이력은 하위 섹션, follow-up closure, history 문서로 밀어낸다.
7. 같은 내용을 README, README.en.md, docs/en/README.md, docs/README.md에 반복해서 풀어 쓰지 않는다. 각 문서는 역할을 분리한다.
8. 긴 표를 추가하기 전에 목록/섹션/전용 문서 링크로 읽기 쉽게 분리할 수 있는지 먼저 검토한다.
9. verifier가 README에 세부 문서 전체 나열을 강제하게 만들지 않는다. verifier는 README가 대표 색인으로 연결되는지, 전용 문서가 세부 링크를 보존하는지 확인한다.
10. 문서 전용 변경이라도 7.1의 문서 전용 최소 검증을 따른다. 릴리즈 버전, release metadata, published 상태를 건드린 경우에만 `verify-release-metadata` 실행 여부를 별도로 확인하고, 미실행 항목은 보고한다.

### 12.2 문서 분할 / 중복 관리 규칙

문서가 많아질수록 새 파일을 만드는 것보다 기존 source-of-truth를 선명하게 유지하는 것을 우선한다.

1. 개발 절차, 테스트 절차, 보고 형식, 커밋/푸시 권한, 완료 판정, 거짓 보고 금지 규칙은 `AGENTS.md`만 최상위 source-of-truth로 둔다. 다른 문서는 이 규칙을 독립 정책처럼 재서술하지 않고, 필요하면 한 줄 요약과 AGENTS.md 참조만 둔다.
2. `stream-verification.md`, `manual-ui-fulltest.md`, `manual-ui-checklist.md`, `manual-ui-result-template.md`, `project-feature-test-inventory.md`, `release-evidence-index.md`는 각각 스크립트 명령, UI 실행 순서, 결과 템플릿, 기능 inventory, release evidence 보존의 보조 문서다. 이 문서들이 AGENTS.md보다 넓은 완료/통과/푸시 권한을 부여하는 것처럼 보이면 AGENTS.md가 우선이며, 해당 불일치는 문서 결함으로 보고한다.
3. 새 문서를 추가하기 전 `docs/README.md`, README, backlog, release evidence, policy/reference 문서에 이미 같은 독자와 lifecycle을 가진 문서가 있는지 먼저 확인한다.
4. 같은 독자, 같은 목적, 같은 검증 주기를 가진 내용은 새 파일로 쪼개지 말고 기존 문서의 하위 섹션으로 흡수한다.
5. 별도 문서는 독자, 유지 주기, evidence 보존 이유, verifier 경계가 분명할 때만 만든다.
6. backlog는 세부 source-of-truth가 아니다. 상세 정책, evidence, 후보 목록은 전용 문서에 두고 backlog에는 상태 요약과 대표 링크만 둔다.
7. README, `docs/README.md`, release evidence, boundary 문서가 같은 문장이나 같은 목록을 반복하지 않게 한다. 한 문서를 source-of-truth로 정하고 나머지는 링크와 한 줄 요약으로 연결한다.
8. verifier 통과를 이유로 README나 backlog에 세부 목록을 중복 삽입하지 않는다. verifier는 대표 링크와 전용 문서의 존재를 확인하도록 조정한다.
9. 문서 전면 리뷰를 요청받으면 파일 수, 짧은 문서의 분할 이유, 긴 문서의 중복 섹션, 반복되는 긴 문단/목록을 함께 확인한다.
10. 의도적으로 반복해야 하는 release/evidence 문구가 있으면 어느 문서가 source-of-truth인지 문서 안에서 명시한다.
11. 새 md/sub-md 파일은 첫머리에서 독자, lifecycle, source-of-truth 관계를 밝히지 않으면 추가하지 않는다. 이 정보 없이 만든 문서는 문서 구조 실패로 보고한다.
12. release/test 실행 기록, 재감사, 임시 조사 결과, 검증 산출물은 개발/테스트 증적 파일로 취급한다. README, `README.en.md`, `docs/README.md`, `docs/en/README.md` 색인에 링크하지 않는다. 공개 독자가 볼 필요가 있는 안정된 정책이나 기능 문서만 색인에 둔다.
13. 동일 규칙을 두 문서 이상에 길게 복사해야 할 상황이면 복사하지 말고 한 문서를 source-of-truth로 만들고 나머지는 링크한다. 예외는 historical evidence, fixture, 실행 로그처럼 원문 보존이 목적일 때뿐이며, 이 경우 현재 정책으로 해석하지 않는다고 명시한다.
14. 한 문서가 정책, roadmap, 실행 로그, release evidence, 연구 후보, 사용 설명을 동시에 담아 읽기 어려워지면 문서 구조 결함으로 보고한다. 수정은 새 파일 남발이 아니라 역할 분리와 중복 제거를 먼저 검토한다.

### 12.3 문서 이미지 / 스크린샷 규칙

문서에 이미지를 추가하거나 갱신할 때는 이미지 자체를 제품 증적으로 취급한다.

1. 스크린샷은 상하좌우 UI가 잘리지 않아야 한다. crop이 필요한 경우에도 주요 화면, 영상 frame, control, status, caption이 잘리지 않는지 확인한다.
2. 영상이 포함된 화면은 전체 video viewport가 보이게 캡처한다. 특히 하단 control, timeline, status, overlay 영역이 잘린 이미지는 사용하지 않는다.
3. 영상이 포함된 화면은 가능하면 프로젝트의 4신 sample 영상을 사용한다.
4. VA overlay 설정이 가능한 화면은 overlay를 켠 상태로 캡처한다. overlay를 켜지 못한 경우에는 이유와 미확인 범위를 보고한다.
5. client/viewer 스크린샷에는 source URL, Developer URL, raw JSON, debug counter, BBox diagnostics, model path/checksum/provenance, auth/session material이 보이면 안 된다.
6. 새 스크린샷을 추가한 경우에는 문서 링크 검증뿐 아니라 이미지가 현재 UI와 맞는지 직접 확인한다. 직접 확인하지 않았으면 확인했다고 보고하지 않는다.
7. mobile/desktop screenshot을 함께 갱신할 때는 작은 viewport에서 텍스트, 영상, toolbar가 잘리지 않는지 별도로 확인한다.

---

## 13. 후속 이슈 추천 규칙

전체 단계가 끝나면 후속 이슈를 추천한다. 단, 후속 이슈는 현재 버전과 현재 스텝 범위 안에서 실제로 처리 가능한 항목만 언급한다.

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

## 14. 절대 금지 요약

상세 규칙은 앞 장을 우선한다. 아래 항목은 어떤 작업에서도 예외 없이 금지한다.

- 실패, 미실행 테스트, 미확인 화면, 미커밋/미푸시 상태를 완료처럼 보고
- schema, payload, media path, auth/scope 계약을 요청 없이 변경
- 장시간 테스트, `verify-predev`, 커밋, 푸시를 명시 요청 없이 실행
- viewer/client에 debug/source/raw 정보를 노출
- 제품 기능을 문서에서 과장하거나 VMS/NVR 녹화 기능처럼 표현
