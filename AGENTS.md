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

---

## 2. 거짓 보고 금지

다음 행위는 절대 금지한다.

- 실행하지 않은 명령을 실행했다고 보고
- 실패한 테스트를 통과로 보고
- 일부만 통과했는데 전체 통과로 보고
- sandbox/포트/권한 문제를 제품 회귀처럼 단정
- 제품 회귀를 환경 문제라고 임의 축소
- 생성하지 않은 파일, summary, report 경로를 임의 작성
- 커밋하지 않았는데 커밋 해시나 커밋 메시지를 보고
- 푸시하지 않았는데 푸시 완료라고 보고
- 브라우저 확인 없이 UI 검수 완료라고 보고
- raw JSON만 확인하고 제품 UI를 확인했다고 보고
- 문서만 수정하고 코드 수정까지 했다고 보고
- 코드만 수정하고 문서 반영까지 했다고 보고

보고 시에는 아래처럼 구분한다.

```text
확인됨:
- 실제 실행한 명령
- 실제 통과/실패 결과
- 실제 생성된 파일
- 실제 수정한 파일
- 실제 커밋 여부

미확인:
- 실행하지 않은 테스트
- 열어보지 않은 화면
- 추정 원인
- 후속 확인 필요 항목
```

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
9. 전체 단계가 모두 끝나면 후속 이슈 5~10개를 추천한다.
10. 마지막에 푸시 가능 여부를 반드시 보고한다.

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
./server.sh verify-multichannel
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

### 7.6 장시간 테스트

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

---

## 8. 중단 조건

아래 상황이 발생하면 즉시 중단하고 보고한다.

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
6. `/lab`, `/lab/rules`, `/lab/import` 화면 route를 다시 열거나 이전 Lab 3탭 UI를 되살리지 않는다.
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

`/lab`, `/lab/rules`, `/lab/import` 화면 route는 404로 닫힌 상태를 유지한다.
개발/검증 기능은 `/lab/analysis/*`, `/lab/runtime/status`, `/ws/va-metadata`
같은 API와 전용 검증 명령으로 다룬다.
운영자가 사용하는 Rule/Profile 화면은 `/ops/rules`이다.

이전 Lab 3탭 구조를 제품 화면에 embed하지 않는다.

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

전체 단계가 끝나면 후속 이슈 5~10개를 추천한다.

추천 시 포함할 것:

1. 이슈 제목
2. 우선순위
3. 이유
4. 예상 검증
5. 지금 바로 할지 / 후속 Phase인지

예시:

```text
후속 이슈 추천:
1. P0 - Ops Dashboard 운영 요약 고도화
   이유: Runtime Dashboard API와 운영 요약의 역할이 섞임
   검증: verify-ops-client-ui --screenshots

2. P1 - PublishedView 기반 scope picker
   이유: viewer scope 수동 입력은 운영 실수 가능성이 큼
   검증: verify-auth-users, verify-view-access
```

---

## 15. 절대 금지 요약

상세 규칙은 앞 장을 우선한다. 아래 항목은 어떤 작업에서도 예외 없이 금지한다.

- 실패, 미실행 테스트, 미확인 화면, 미커밋/미푸시 상태를 완료처럼 보고
- schema, payload, media path, auth/scope 계약을 요청 없이 변경
- 장시간 테스트, `verify-predev`, 푸시를 명시 요청 없이 실행
- viewer/client에 debug/source/raw 정보를 노출
- 제품 기능을 문서에서 과장하거나 VMS/NVR 녹화 기능처럼 표현
